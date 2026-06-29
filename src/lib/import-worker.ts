import { prisma } from './prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { getColorHexFromName } from './colors'
import { Job } from './queue'

// Helper to check if URL is external
function isExternalUrl(url: string): boolean {
  if (!url) return false
  const trimmed = url.trim()
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://')) && 
         !trimmed.includes('localhost') && 
         !trimmed.includes('127.0.0.1')
}

// Helper to download and optimize external images
async function downloadAndOptimizeImage(url: string, shopId: string, originalName: string = 'imported-image'): Promise<string | null> {
  if (!isExternalUrl(url)) return url

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) return null
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    await mkdir(uploadDir, { recursive: true })
    
    let filename = ''
    let finalBuffer: Buffer = buffer
    const contentType = response.headers.get('content-type') || ''
    const isGif = contentType.includes('gif') || url.toLowerCase().endsWith('.gif')
    
    if (isGif) {
      filename = `${uniqueSuffix}.gif`
    } else {
      try {
        finalBuffer = await sharp(buffer)
          .resize(1080, 1920, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer()
        filename = `${uniqueSuffix}.webp`
      } catch (sharpError) {
        const ext = path.extname(url).split('?')[0] || '.webp'
        filename = `${uniqueSuffix}${ext}`
      }
    }
    
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, finalBuffer)
    
    const localUrl = `/uploads/${filename}`
    
    await prisma.media.create({
      data: {
        shopId,
        url: localUrl,
        type: 'image',
        name: originalName,
        size: finalBuffer.length,
        alt: originalName
      }
    })
    
    return localUrl
  } catch (error) {
    console.error('Failed to download image:', url, error)
    return null
  }
}

export async function executeImport(job: Job, updateProgress: (progress: number) => Promise<void>): Promise<any> {
  const { shopId, data } = job
  const { products, categories, settings, conflictResolution, downloadImages, isSettingsOnly } = data

  // 1. Handle Settings Only
  if (isSettingsOnly && settings) {
    const {
      id,
      shopId: sId,
      subdomain,
      customDomain,
      isApproved,
      isActive: isAct,
      packageId,
      packageExpiresAt,
      ...safeSettings
    } = settings

    await prisma.shopSettings.update({
      where: { shopId },
      data: safeSettings
    })

    await updateProgress(100)
    return {
      success: true,
      message: 'تنظیمات فروشگاه با موفقیت درون‌ریزی و بروزرسانی شد.'
    }
  }

  // 2. Fetch package limits for products
  const shopSettings = await prisma.shopSettings.findUnique({
    where: { shopId },
    include: { package: true }
  })

  const isPackageActive = shopSettings?.packageExpiresAt ? new Date(shopSettings.packageExpiresAt) > new Date() : false
  const activePackage = isPackageActive ? shopSettings?.package : null
  let maxProducts = 0
  
  if (activePackage) {
    try {
      const features = JSON.parse(activePackage.features)
      if (features.maxProducts && features.maxProducts > 0) {
        maxProducts = parseInt(features.maxProducts)
      }
    } catch (e) {
      console.error("Error parsing package features:", e)
    }
  }

  let importedProductsCount = 0
  let updatedProductsCount = 0
  let skippedProductsCount = 0

  let importedCategoriesCount = 0
  let updatedCategoriesCount = 0
  let skippedCategoriesCount = 0

  // Total items for progress calculation
  const totalCategories = (categories && Array.isArray(categories)) ? categories.length : 0
  
  // Create categories referenced in products if they don't exist
  const referencedCategories: string[] = []
  if (products && Array.isArray(products)) {
    for (const prod of products) {
      if (prod.categoryName) {
        const trimmedName = prod.categoryName.trim()
        if (!referencedCategories.includes(trimmedName)) {
          referencedCategories.push(trimmedName)
        }
      }
    }
  }

  const totalProducts = (products && Array.isArray(products)) ? products.length : 0
  const totalItems = totalCategories + referencedCategories.length + totalProducts
  let processedItems = 0

  const updateJobProgress = async () => {
    processedItems++
    const percent = totalItems > 0 ? (processedItems / totalItems) * 100 : 100
    await updateProgress(percent)
  }

  // 3. Process Categories first
  const categoryNameToIdMap: Record<string, string> = {}

  if (categories && Array.isArray(categories)) {
    for (const cat of categories) {
      if (!cat.name) {
        await updateJobProgress()
        continue
      }
      const name = cat.name.trim()

      let existingCategory = await prisma.category.findFirst({
        where: { name, shopId }
      })

      const categoryData = {
        name,
        slug: cat.slug || name,
        description: cat.description || null,
        isActive: true
      }

      if (existingCategory) {
        if (conflictResolution === 'overwrite') {
          const updated = await prisma.category.update({
            where: { id: existingCategory.id },
            data: categoryData
          })
          categoryNameToIdMap[name] = updated.id
          updatedCategoriesCount++
        } else {
          categoryNameToIdMap[name] = existingCategory.id
          skippedCategoriesCount++
        }
      } else {
        const created = await prisma.category.create({
          data: {
            ...categoryData,
            shopId
          }
        })
        categoryNameToIdMap[name] = created.id
        importedCategoriesCount++
      }
      await updateJobProgress()
    }
  }

  // 4. Create categories referenced in products if they don't exist
  for (const name of referencedCategories) {
    if (!categoryNameToIdMap[name]) {
      let existingCategory = await prisma.category.findFirst({
        where: { name, shopId }
      })

      if (existingCategory) {
        categoryNameToIdMap[name] = existingCategory.id
      } else {
        const created = await prisma.category.create({
          data: {
            name,
            slug: name,
            isActive: true,
            shopId
          }
        })
        categoryNameToIdMap[name] = created.id
        importedCategoriesCount++
      }
    }
    await updateJobProgress()
  }

  // 5. Verify Product Limits
  if (products && Array.isArray(products) && maxProducts > 0) {
    const currentProductCount = await prisma.product.count({ where: { shopId } })
    const newProductsCount = products.filter(p => !p.id).length
    if (currentProductCount + newProductsCount > maxProducts) {
      throw new Error(`تعداد محصولات شما از حد مجاز پکیج (${maxProducts} کالا) فراتر می‌رود. لطفاً پکیج خود را ارتقا دهید.`)
    }
  }

  // 6. Process Products
  if (products && Array.isArray(products)) {
    for (const item of products) {
      if (!item.title) {
        await updateJobProgress()
        continue
      }

      let existingProduct = null
      if (item.id) {
        existingProduct = await prisma.product.findFirst({
          where: { id: item.id, shopId }
        })
      } else {
        existingProduct = await prisma.product.findFirst({
          where: { title: item.title, shopId }
        })
      }

      if (existingProduct && conflictResolution === 'skip') {
        skippedProductsCount++
        await updateJobProgress()
        continue
      }

      // Category mapping
      let categoryId = item.categoryId || null
      if (item.categoryName && categoryNameToIdMap[item.categoryName]) {
        categoryId = categoryNameToIdMap[item.categoryName]
      }

      // Image downloads
      let imageUrl = item.imageUrl || null
      let galleryUrls: string[] = []

      if (downloadImages) {
        if (imageUrl && isExternalUrl(imageUrl)) {
          const localPath = await downloadAndOptimizeImage(imageUrl, shopId, `${item.title}-main`)
          if (localPath) imageUrl = localPath
        }

        if (item.galleryUrls) {
          const gUrlsList = typeof item.galleryUrls === 'string' ? JSON.parse(item.galleryUrls) : item.galleryUrls
          if (Array.isArray(gUrlsList)) {
            for (let gIdx = 0; gIdx < gUrlsList.length; gIdx++) {
              const gUrl = gUrlsList[gIdx]
              if (isExternalUrl(gUrl)) {
                const localPath = await downloadAndOptimizeImage(gUrl, shopId, `${item.title}-gallery-${gIdx + 1}`)
                if (localPath) galleryUrls.push(localPath)
              } else {
                galleryUrls.push(gUrl)
              }
            }
          }
        }
      } else {
        galleryUrls = typeof item.galleryUrls === 'string' ? JSON.parse(item.galleryUrls || '[]') : (item.galleryUrls || [])
      }

      const productData = {
        title: item.title,
        type: item.type || 'physical',
        categoryId,
        price: parseFloat(item.price) || 0,
        discount: parseFloat(item.discount) || 0,
        imageUrl,
        stock: item.type === 'digital' ? 999999 : (parseInt(item.stock) || 10),
        description: item.description || null,
        fullDescription: item.fullDescription || null,
        brand: item.brand || null,
        isActive: item.isActive !== undefined ? item.isActive : true,
        faqs: typeof item.faqs === 'string' ? item.faqs : JSON.stringify(item.faqs || []),
        features: typeof item.features === 'string' ? item.features : JSON.stringify(item.features || []),
        specs: typeof item.specs === 'string' ? item.specs : JSON.stringify(item.specs || []),
        galleryUrls: JSON.stringify(galleryUrls),
      }

      let productId = ''

      if (existingProduct) {
        const updated = await prisma.product.update({
          where: { id: existingProduct.id },
          data: productData
        })
        productId = updated.id
        updatedProductsCount++
      } else {
        const created = await prisma.product.create({
          data: {
            ...productData,
            shopId,
            id: item.id || undefined
          }
        })
        productId = created.id
        importedProductsCount++
      }

      // Process Variants
      if (item.variants && Array.isArray(item.variants) && productId) {
        await prisma.productVariant.deleteMany({
          where: { productId, shopId }
        })

        for (const v of item.variants) {
          if (!v.name) continue

          let vImageUrl = v.imageUrl || null
          if (downloadImages && vImageUrl && isExternalUrl(vImageUrl)) {
            const localPath = await downloadAndOptimizeImage(vImageUrl, shopId, `${item.title}-${v.name}`)
            if (localPath) vImageUrl = localPath
          }

          await prisma.productVariant.create({
            data: {
              shopId,
              productId,
              name: v.name,
              colorCode: v.colorCode || getColorHexFromName(v.name),
              imageUrl: vImageUrl,
              price: parseFloat(v.price) || parseFloat(item.price) || 0,
              stock: parseInt(v.stock) || 10
            }
          })
        }
      }
      await updateJobProgress()
    }
  }

  return {
    success: true,
    message: `درون‌ریزی با موفقیت انجام شد.\n` +
      `محصولات: ${importedProductsCount} جدید، ${updatedProductsCount} بروزرسانی، ${skippedProductsCount} نادیده.\n` +
      `دسته‌بندی‌ها: ${importedCategoriesCount} جدید، ${updatedCategoriesCount} بروزرسانی، ${skippedCategoriesCount} نادیده.`
  }
}

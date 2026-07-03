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

// Helper to slugify category names
function toSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function executeImport(job: Job, updateProgress: (progress: number) => Promise<void>): Promise<any> {
  const { shopId, data } = job
  const { 
    products, 
    categories, 
    settings, 
    brands, 
    sliders, 
    conflictResolution, 
    downloadImages, 
    isSettingsOnly 
  } = data

  // 1. Handle Settings (Updated for both isSettingsOnly and full backup import)
  if (settings) {
    const {
      id,
      shopId: sId,
      subdomain,
      customDomain,
      isApproved,
      isActive: isAct,
      packageId,
      packageExpiresAt,
      bgRemovalCount,
      setupWizardCompleted,
      createdAt,
      updatedAt,
      ...safeSettings
    } = settings

    await prisma.shopSettings.update({
      where: { shopId },
      data: safeSettings
    })

    if (isSettingsOnly) {
      await updateProgress(100)
      return {
        success: true,
        message: 'تنظیمات فروشگاه با موفقیت درون‌ریزی و بروزرسانی شد.'
      }
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

  let importedBrandsCount = 0
  let updatedBrandsCount = 0
  let skippedBrandsCount = 0

  let importedSlidersCount = 0
  let updatedSlidersCount = 0
  let skippedSlidersCount = 0

  // Total items for progress calculation
  const totalCategories = (categories && Array.isArray(categories)) ? categories.length : 0
  const totalBrands = (brands && Array.isArray(brands)) ? brands.length : 0
  const totalSliders = (sliders && Array.isArray(sliders)) ? sliders.length : 0
  
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
  const totalItems = totalCategories + totalBrands + totalSliders + referencedCategories.length + totalProducts
  let processedItems = 0

  const updateJobProgress = async () => {
    processedItems++
    const percent = totalItems > 0 ? (processedItems / totalItems) * 100 : 100
    await updateProgress(percent)
  }

  // 3. Process Brands
  if (brands && Array.isArray(brands)) {
    for (const brand of brands) {
      if (!brand.name) {
        await updateJobProgress()
        continue
      }
      const name = brand.name.trim()

      const existingBrand = await prisma.brand.findFirst({
        where: { name, shopId }
      })

      if (existingBrand) {
        if (conflictResolution === 'overwrite') {
          await prisma.brand.update({
            where: { id: existingBrand.id },
            data: {
              logoUrl: brand.logoUrl || null
            }
          })
          updatedBrandsCount++
        } else {
          skippedBrandsCount++
        }
      } else {
        await prisma.brand.create({
          data: {
            name,
            logoUrl: brand.logoUrl || null,
            shopId
          }
        })
        importedBrandsCount++
      }
      await updateJobProgress()
    }
  }

  // 4. Process Sliders (HeroSlide)
  if (sliders && Array.isArray(sliders)) {
    for (const slide of sliders) {
      if (!slide.imageUrl) {
        await updateJobProgress()
        continue
      }
      const imageUrl = slide.imageUrl.trim()

      const existingSlide = await prisma.heroSlide.findFirst({
        where: { imageUrl, shopId }
      })

      const slideData = {
        mobileImageUrl: slide.mobileImageUrl || null,
        title: slide.title || null,
        subtitle: slide.subtitle || null,
        linkUrl: slide.linkUrl || null,
        linkText: slide.linkText || null,
        order: parseInt(slide.order) || 0,
        isActive: slide.isActive !== undefined ? slide.isActive : true,
        displayLocation: slide.displayLocation || 'both',
        isDemo: slide.isDemo !== undefined ? slide.isDemo : false,
      }

      if (existingSlide) {
        if (conflictResolution === 'overwrite') {
          await prisma.heroSlide.update({
            where: { id: existingSlide.id },
            data: slideData
          })
          updatedSlidersCount++
        } else {
          skippedSlidersCount++
        }
      } else {
        await prisma.heroSlide.create({
          data: {
            ...slideData,
            imageUrl,
            shopId
          }
        })
        importedSlidersCount++
      }
      await updateJobProgress()
    }
  }

  // 5. Process Categories first
  const oldCategoryIdToNewIdMap: Record<string, string> = {}
  const categoryNameToIdMap: Record<string, string> = {}
  const categorySlugToIdMap: Record<string, string> = {}

  if (categories && Array.isArray(categories)) {
    for (const cat of categories) {
      if (!cat.name) {
        await updateJobProgress()
        continue
      }
      const name = cat.name.trim()
      const slug = (cat.slug || toSlug(name)).trim()

      let existingCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { slug, shopId },
            { name, shopId }
          ]
        }
      })

      const categoryData = {
        name,
        slug,
        description: cat.description || null,
        imageUrl: cat.imageUrl || null,
        icon: cat.icon || null,
        isActive: cat.isActive !== undefined ? cat.isActive : true
      }

      let catId = ''
      if (existingCategory) {
        if (conflictResolution === 'overwrite') {
          const updated = await prisma.category.update({
            where: { id: existingCategory.id },
            data: categoryData
          })
          catId = updated.id
          updatedCategoriesCount++
        } else {
          catId = existingCategory.id
          skippedCategoriesCount++
        }
      } else {
        const created = await prisma.category.create({
          data: {
            ...categoryData,
            shopId
          }
        })
        catId = created.id
        importedCategoriesCount++
      }

      categoryNameToIdMap[name] = catId
      categorySlugToIdMap[slug] = catId
      if (cat.id) {
        oldCategoryIdToNewIdMap[cat.id] = catId
      }
      await updateJobProgress()
    }

    // Pass 2: Reconstruct parent/child categories relationships
    for (const cat of categories) {
      if (cat.parentId && cat.id) {
        const newCategoryId = oldCategoryIdToNewIdMap[cat.id]
        const newParentId = oldCategoryIdToNewIdMap[cat.parentId]

        if (newCategoryId && newParentId && newCategoryId !== newParentId) {
          await prisma.category.update({
            where: { id: newCategoryId },
            data: { parentId: newParentId }
          })
        }
      }
    }
  }

  // 6. Create categories referenced in products if they don't exist
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
            slug: toSlug(name),
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

  // 7. Verify Product Limits using precise "truly new" calculation
  if (products && Array.isArray(products) && maxProducts > 0) {
    const currentProductCount = await prisma.product.count({ where: { shopId } })
    
    // Check which imported products don't exist in the database (either by ID or title)
    const existingProductTitles = new Set(
      (await prisma.product.findMany({
        where: { shopId },
        select: { title: true }
      })).map(p => p.title.trim())
    )

    let trulyNewProductsCount = 0
    for (const p of products) {
      if (!p.title) continue
      const title = p.title.trim()
      
      let exists = false
      if (p.id) {
        const matchById = await prisma.product.findFirst({
          where: { id: p.id, shopId },
          select: { id: true }
        })
        if (matchById) exists = true
      }
      if (!exists && existingProductTitles.has(title)) {
        exists = true
      }
      
      if (!exists) {
        trulyNewProductsCount++
      }
    }

    if (currentProductCount + trulyNewProductsCount > maxProducts) {
      throw new Error(`تعداد محصولات شما از حد مجاز پکیج (${maxProducts} کالا) فراتر می‌رود. لطفاً پکیج خود را ارتقا دهید.`)
    }
  }

  // 8. Process Products
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
      }
      
      if (!existingProduct) {
        existingProduct = await prisma.product.findFirst({
          where: { title: item.title.trim(), shopId }
        })
      }

      if (existingProduct && conflictResolution === 'skip') {
        skippedProductsCount++
        await updateJobProgress()
        continue
      }

      // Category mapping
      let categoryId = null
      if (item.categoryId && oldCategoryIdToNewIdMap[item.categoryId]) {
        categoryId = oldCategoryIdToNewIdMap[item.categoryId]
      } else if (item.categoryName && categoryNameToIdMap[item.categoryName.trim()]) {
        categoryId = categoryNameToIdMap[item.categoryName.trim()]
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
        title: item.title.trim(),
        type: item.type || 'physical',
        categoryId,
        price: parseFloat(item.price) || 0,
        discount: parseFloat(item.discount) || 0,
        discountMinQty: parseInt(item.discountMinQty) || 0,
        imageUrl,
        stock: item.type === 'digital' ? 999999 : (parseInt(item.stock) || 10),
        description: item.description || null,
        fullDescription: item.fullDescription || null,
        brand: item.brand || null,
        isActive: item.isActive !== undefined ? item.isActive : true,
        isSpecial: item.isSpecial !== undefined ? item.isSpecial : false,
        specialEndsAt: item.specialEndsAt ? new Date(item.specialEndsAt) : null,
        seoTitle: item.seoTitle || null,
        seoDescription: item.seoDescription || null,
        schemaMarkup: item.schemaMarkup || null,
        faqs: typeof item.faqs === 'string' ? item.faqs : JSON.stringify(item.faqs || []),
        features: typeof item.features === 'string' ? item.features : JSON.stringify(item.features || []),
        specs: typeof item.specs === 'string' ? item.specs : JSON.stringify(item.specs || []),
        galleryUrls: JSON.stringify(galleryUrls),
        fileUrl: item.fileUrl || null,
        downloadLimit: item.downloadLimit !== undefined ? parseInt(item.downloadLimit) : null,
        downloadExpiryDays: item.downloadExpiryDays !== undefined ? parseInt(item.downloadExpiryDays) : null,
        downloadIpRestriction: item.downloadIpRestriction !== undefined ? !!item.downloadIpRestriction : false,
        fileFormat: item.fileFormat || null,
        fileSize: item.fileSize || null,
        previewUrl: item.previewUrl || null,
        techSpecs: item.techSpecs || null,
        downloadFiles: typeof item.downloadFiles === 'string' ? item.downloadFiles : JSON.stringify(item.downloadFiles || []),
        wholesalePrice: item.wholesalePrice !== undefined ? parseFloat(item.wholesalePrice) : null,
        wholesaleTiers: typeof item.wholesaleTiers === 'string' ? item.wholesaleTiers : JSON.stringify(item.wholesaleTiers || []),
        wholesaleExclusivePrices: typeof item.wholesaleExclusivePrices === 'string' ? item.wholesaleExclusivePrices : JSON.stringify(item.wholesaleExclusivePrices || []),
        moq: parseInt(item.moq) || 1,
        wholesaleUnit: item.wholesaleUnit || 'عدد',
        wholesaleUnitSize: parseInt(item.wholesaleUnitSize) || 1,
        weight: parseFloat(item.weight) || 0,
        volume: parseFloat(item.volume) || 0,
        isWholesaleOnly: item.isWholesaleOnly !== undefined ? !!item.isWholesaleOnly : false,
        isDemo: item.isDemo !== undefined ? !!item.isDemo : false,
        isSampleData: item.isSampleData !== undefined ? !!item.isSampleData : false,
        generatedByAi: item.generatedByAi !== undefined ? !!item.generatedByAi : false,
        seedJobId: item.seedJobId || null,
        embeddingUpdatedAt: null // Always mark dirty for pgvector recalculation
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
            shopId
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
              stock: parseInt(v.stock) || 10,
              isDefault: v.isDefault !== undefined ? !!v.isDefault : false,
            }
          })
        }
      }
      await updateJobProgress()
    }
  }

  // Re-write final summary message to include all parsed fields
  let summaryMessage = `درون‌ریزی با موفقیت انجام شد.\n` +
    `محصولات: ${importedProductsCount} جدید، ${updatedProductsCount} بروزرسانی، ${skippedProductsCount} نادیده.\n` +
    `دسته‌بندی‌ها: ${importedCategoriesCount} جدید، ${updatedCategoriesCount} بروزرسانی، ${skippedCategoriesCount} نادیده.`

  if (brands && brands.length > 0) {
    summaryMessage += `\nبرندها: ${importedBrandsCount} جدید، ${updatedBrandsCount} بروزرسانی، ${skippedBrandsCount} نادیده.`
  }
  if (sliders && sliders.length > 0) {
    summaryMessage += `\nاسلایدرها: ${importedSlidersCount} جدید، ${updatedSlidersCount} بروزرسانی، ${skippedSlidersCount} نادیده.`
  }
  if (settings) {
    summaryMessage += `\nتنظیمات فروشگاه با موفقیت بروزرسانی شد.`
  }

  return {
    success: true,
    message: summaryMessage
  }
}

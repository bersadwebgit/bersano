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
    menus,
    discounts,
    blogCategories,
    blogPosts,
    productSets,
    stories,
    media,
    conflictResolution, 
    downloadImages, 
    isSettingsOnly 
  } = data

  const oldProductIdToNewIdMap: Record<string, string> = {}

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

  let importedMenusCount = 0
  let updatedMenusCount = 0
  let skippedMenusCount = 0

  let importedDiscountsCount = 0
  let updatedDiscountsCount = 0
  let skippedDiscountsCount = 0

  let importedBlogCategoriesCount = 0
  let updatedBlogCategoriesCount = 0
  let skippedBlogCategoriesCount = 0

  let importedBlogPostsCount = 0
  let updatedBlogPostsCount = 0
  let skippedBlogPostsCount = 0

  let importedProductSetsCount = 0
  let updatedProductSetsCount = 0
  let skippedProductSetsCount = 0

  let importedStoriesCount = 0
  let updatedStoriesCount = 0
  let skippedStoriesCount = 0

  let importedMediaCount = 0
  let updatedMediaCount = 0
  let skippedMediaCount = 0

  // Total items for progress calculation
  const totalCategories = (categories && Array.isArray(categories)) ? categories.length : 0
  const totalBrands = (brands && Array.isArray(brands)) ? brands.length : 0
  const totalSliders = (sliders && Array.isArray(sliders)) ? sliders.length : 0
  const totalMenus = (menus && Array.isArray(menus)) ? menus.length : 0
  const totalDiscounts = (discounts && Array.isArray(discounts)) ? discounts.length : 0
  const totalBlogCategories = (blogCategories && Array.isArray(blogCategories)) ? blogCategories.length : 0
  const totalBlogPosts = (blogPosts && Array.isArray(blogPosts)) ? blogPosts.length : 0
  const totalProductSets = (productSets && Array.isArray(productSets)) ? productSets.length : 0
  const totalStories = (stories && Array.isArray(stories)) ? stories.length : 0
  const totalMedia = (media && Array.isArray(media)) ? media.length : 0
  
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
  const totalItems = totalCategories + totalBrands + totalSliders + referencedCategories.length + totalProducts +
                     totalMenus + totalDiscounts + totalBlogCategories + totalBlogPosts + totalProductSets + totalStories + totalMedia
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
            where: { id: existingBrand.id, shopId },
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
            where: { id: existingSlide.id, shopId },
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

  // 5. Process Menus (MenuItem)
  if (menus && Array.isArray(menus)) {
    for (const menu of menus) {
      if (!menu.title || !menu.url) {
        await updateJobProgress()
        continue
      }
      const title = menu.title.trim()
      const url = menu.url.trim()

      const existingMenu = await prisma.menuItem.findFirst({
        where: { title, url, shopId }
      })

      const menuData = {
        title,
        url,
        order: parseInt(menu.order) || 0,
        color: menu.color || null,
        icon: menu.icon || null,
        isActive: menu.isActive !== undefined ? !!menu.isActive : true
      }

      if (existingMenu) {
        if (conflictResolution === 'overwrite') {
          await prisma.menuItem.update({
            where: { id: existingMenu.id, shopId },
            data: menuData
          })
          updatedMenusCount++
        } else {
          skippedMenusCount++
        }
      } else {
        await prisma.menuItem.create({
          data: {
            ...menuData,
            shopId
          }
        })
        importedMenusCount++
      }
      await updateJobProgress()
    }
  }

  // 6. Process Discounts (DiscountCode)
  if (discounts && Array.isArray(discounts)) {
    for (const d of discounts) {
      if (!d.code) {
        await updateJobProgress()
        continue
      }
      const code = d.code.trim().toUpperCase()

      const existingDiscount = await prisma.discountCode.findFirst({
        where: { code, shopId }
      })

      const discountData = {
        code,
        discount: parseFloat(d.discount) || 0,
        type: d.type || 'percentage',
        maxUses: d.maxUses !== undefined && d.maxUses !== null ? parseInt(d.maxUses) : null,
        usedCount: parseInt(d.usedCount) || 0,
        isActive: d.isActive !== undefined ? !!d.isActive : true,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        startDate: d.startDate ? new Date(d.startDate) : null,
        minOrderAmount: d.minOrderAmount !== undefined && d.minOrderAmount !== null ? parseFloat(d.minOrderAmount) : null,
        minQuantity: parseInt(d.minQuantity) || 0,
        maxDiscountAmount: d.maxDiscountAmount !== undefined && d.maxDiscountAmount !== null ? parseFloat(d.maxDiscountAmount) : null,
        maxUsesPerUser: d.maxUsesPerUser !== undefined && d.maxUsesPerUser !== null ? parseInt(d.maxUsesPerUser) : 1,
        firstOrderOnly: d.firstOrderOnly !== undefined ? !!d.firstOrderOnly : false,
        targetCategoryIds: typeof d.targetCategoryIds === 'string' ? d.targetCategoryIds : JSON.stringify(d.targetCategoryIds || []),
        targetProductIds: typeof d.targetProductIds === 'string' ? d.targetProductIds : JSON.stringify(d.targetProductIds || []),
        allowedGender: d.allowedGender || 'all',
        allowedCategories: typeof d.allowedCategories === 'string' ? d.allowedCategories : JSON.stringify(d.allowedCategories || []),
        targetUserId: d.targetUserId || ""
      }

      if (existingDiscount) {
        if (conflictResolution === 'overwrite') {
          await prisma.discountCode.update({
            where: { id: existingDiscount.id, shopId },
            data: discountData
          })
          updatedDiscountsCount++
        } else {
          skippedDiscountsCount++
        }
      } else {
        await prisma.discountCode.create({
          data: {
            ...discountData,
            shopId
          }
        })
        importedDiscountsCount++
      }
      await updateJobProgress()
    }
  }

  // 7. Process Blog Categories (BlogCategory)
  const oldBlogCategoryIdToNewIdMap: Record<string, string> = {}
  if (blogCategories && Array.isArray(blogCategories)) {
    for (const bcat of blogCategories) {
      if (!bcat.name) {
        await updateJobProgress()
        continue
      }
      const name = bcat.name.trim()
      const slug = (bcat.slug || toSlug(name)).trim()

      const existingBCat = await prisma.blogCategory.findFirst({
        where: {
          OR: [
            { slug, shopId },
            { name, shopId }
          ]
        }
      })

      const bcatData = {
        name,
        slug,
        description: bcat.description || null,
        isDemo: bcat.isDemo !== undefined ? !!bcat.isDemo : false
      }

      let newBCatId = ''
      if (existingBCat) {
        if (conflictResolution === 'overwrite') {
          const updated = await prisma.blogCategory.update({
            where: { id: existingBCat.id, shopId },
            data: bcatData
          })
          newBCatId = updated.id
          updatedBlogCategoriesCount++
        } else {
          newBCatId = existingBCat.id
          skippedBlogCategoriesCount++
        }
      } else {
        const created = await prisma.blogCategory.create({
          data: {
            ...bcatData,
            shopId
          }
        })
        newBCatId = created.id
        importedBlogCategoriesCount++
      }

      if (bcat.id) {
        oldBlogCategoryIdToNewIdMap[bcat.id] = newBCatId
      }
      await updateJobProgress()
    }
  }

  // 8. Process Blog Posts (BlogPost)
  if (blogPosts && Array.isArray(blogPosts)) {
    for (const post of blogPosts) {
      if (!post.title || !post.content) {
        await updateJobProgress()
        continue
      }
      const title = post.title.trim()
      const slug = (post.slug || toSlug(title)).trim()

      const existingPost = await prisma.blogPost.findFirst({
        where: {
          OR: [
            { slug, shopId },
            { title, shopId }
          ]
        }
      })

      if (existingPost && conflictResolution === 'skip') {
        skippedBlogPostsCount++
        await updateJobProgress()
        continue
      }

      let categoryId = null
      if (post.categoryId && oldBlogCategoryIdToNewIdMap[post.categoryId]) {
        categoryId = oldBlogCategoryIdToNewIdMap[post.categoryId]
      }

      let featuredImage = post.featuredImage || null
      if (downloadImages && featuredImage && isExternalUrl(featuredImage)) {
        const localPath = await downloadAndOptimizeImage(featuredImage, shopId, `${title}-featured`)
        if (localPath) featuredImage = localPath
      }

      const postData = {
        title,
        slug,
        content: post.content,
        summary: post.summary || null,
        featuredImage,
        status: post.status || 'draft',
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : new Date(),
        authorName: post.authorName || null,
        categoryId,
        tags: typeof post.tags === 'string' ? post.tags : JSON.stringify(post.tags || []),
        seoTitle: post.seoTitle || null,
        seoDescription: post.seoDescription || null,
        seoSlug: post.seoSlug || null,
        ogImage: post.ogImage || null,
        allowComments: post.allowComments !== undefined ? !!post.allowComments : true,
        viewCount: parseInt(post.viewCount) || 0,
        faqs: typeof post.faqs === 'string' ? post.faqs : JSON.stringify(post.faqs || []),
        isDemo: post.isDemo !== undefined ? !!post.isDemo : false,
        isSampleData: post.isSampleData !== undefined ? !!post.isSampleData : false,
        generatedByAi: post.generatedByAi !== undefined ? !!post.generatedByAi : false,
        seedJobId: post.seedJobId || null
      }

      if (existingPost) {
        await prisma.blogPost.update({
          where: { id: existingPost.id, shopId },
          data: postData
        })
        updatedBlogPostsCount++
      } else {
        await prisma.blogPost.create({
          data: {
            ...postData,
            shopId
          }
        })
        importedBlogPostsCount++
      }
      await updateJobProgress()
    }
  }

  // 9. Process Categories first
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
            where: { id: existingCategory.id, shopId },
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
            where: { id: newCategoryId, shopId },
            data: { parentId: newParentId }
          })
        }
      }
    }
  }

  // 10. Create categories referenced in products if they don't exist
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

  // 11. Verify Product Limits using precise "truly new" calculation
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

  // 12. Process Products
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
          where: { id: existingProduct.id, shopId },
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

      if (item.id) {
        oldProductIdToNewIdMap[item.id] = productId
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

          let optionsJson = v.optionsJson || null
          if (!optionsJson && v.name) {
            const separator = v.name.includes(' - ') ? ' - ' :
                              v.name.includes(' / ') ? ' / ' :
                              v.name.includes(' | ') ? ' | ' : null;
            if (separator) {
              const parts = v.name.split(separator).map((p: string) => p.trim());
              const optionsObj: Record<string, string> = {};
              parts.forEach((part: string, idx: number) => {
                const label = idx === 0 ? 'ویژگی ۱' : idx === 1 ? 'ویژگی ۲' : `ویژگی ${idx + 1}`;
                optionsObj[label] = part;
              });
              optionsJson = JSON.stringify(optionsObj);
            } else {
              optionsJson = JSON.stringify({ "ویژگی": v.name });
            }
          }

          await prisma.productVariant.create({
            data: {
              shopId,
              productId,
              name: v.name,
              colorCode: v.colorCode || getColorHexFromName(v.name),
              imageUrl: vImageUrl,
              price: parseFloat(v.price) || parseFloat(item.price) || 0,
              stock: parseInt(v.stock) || 0,
              isDefault: v.isDefault !== undefined ? !!v.isDefault : false,
              sku: v.sku || null,
              optionsJson: optionsJson,
            }
          })
        }

        // Recalculate total product stock from imported variants
        const totalVariantStock = item.variants.reduce((sum: number, v: any) => sum + (parseInt(v.stock) || 0), 0);
        await prisma.product.update({
          where: { id: productId, shopId },
          data: { stock: totalVariantStock }
        });
      }
      await updateJobProgress()
    }
  }

  // 13. Process Product Sets (ProductSet & ProductSetItem)
  if (productSets && Array.isArray(productSets)) {
    for (const pset of productSets) {
      if (!pset.name || !pset.imageUrl) {
        await updateJobProgress()
        continue
      }
      const name = pset.name.trim()
      const slug = (pset.slug || toSlug(name)).trim()

      const existingSet = await prisma.productSet.findFirst({
        where: {
          OR: [
            { slug, shopId },
            { name, shopId }
          ]
        }
      })

      if (existingSet && conflictResolution === 'skip') {
        skippedProductSetsCount++
        await updateJobProgress()
        continue
      }

      let imageUrl = pset.imageUrl
      if (downloadImages && imageUrl && isExternalUrl(imageUrl)) {
        const localPath = await downloadAndOptimizeImage(imageUrl, shopId, `${name}-set-main`)
        if (localPath) imageUrl = localPath
      }

      const setData = {
        name,
        slug,
        imageUrl,
        isActive: pset.isActive !== undefined ? !!pset.isActive : true,
        order: parseInt(pset.order) || 0,
        views: parseInt(pset.views) || 0,
        tagClicks: parseInt(pset.tagClicks || pset.tag_clicks) || 0,
        addToCarts: parseInt(pset.addToCarts || pset.add_to_carts) || 0,
        discount: parseFloat(pset.discount) || 0
      }

      let setId = ''
      if (existingSet) {
        await prisma.productSet.update({
          where: { id: existingSet.id, shopId },
          data: setData
        })
        setId = existingSet.id
        updatedProductSetsCount++
      } else {
        const created = await prisma.productSet.create({
          data: {
            ...setData,
            shopId
          }
        })
        setId = created.id
        importedProductSetsCount++
      }

      // Process ProductSetItems
      if (pset.items && Array.isArray(pset.items) && setId) {
        // Delete existing items
        await prisma.productSetItem.deleteMany({
          where: { setId, shopId }
        })

        for (const item of pset.items) {
          let targetProductId = null
          if (item.productId && oldProductIdToNewIdMap[item.productId]) {
            targetProductId = oldProductIdToNewIdMap[item.productId]
          } else if (item.productId) {
            // Try to find by ID directly in case it already existed
            const dbProd = await prisma.product.findFirst({
              where: { id: item.productId, shopId },
              select: { id: true }
            })
            if (dbProd) {
              targetProductId = dbProd.id
            }
          }

          if (targetProductId) {
            await prisma.productSetItem.create({
              data: {
                shopId,
                setId,
                productId: targetProductId,
                x: parseFloat(item.x) || 0,
                y: parseFloat(item.y) || 0
              }
            })
          }
        }
      }
      await updateJobProgress()
    }
  }

  // 14. Process Stories (Story)
  if (stories && Array.isArray(stories)) {
    for (const story of stories) {
      if (!story.title || !story.mediaUrl) {
        await updateJobProgress()
        continue
      }
      const title = story.title.trim()
      const mediaUrlRaw = story.mediaUrl.trim()

      const existingStory = await prisma.story.findFirst({
        where: { title, mediaUrl: mediaUrlRaw, shopId }
      })

      if (existingStory && conflictResolution === 'skip') {
        skippedStoriesCount++
        await updateJobProgress()
        continue
      }

      let thumbnailUrl = story.thumbnailUrl
      let mediaUrl = mediaUrlRaw

      if (downloadImages) {
        if (thumbnailUrl && isExternalUrl(thumbnailUrl)) {
          const localPath = await downloadAndOptimizeImage(thumbnailUrl, shopId, `${title}-story-thumb`)
          if (localPath) thumbnailUrl = localPath
        }
        if (mediaUrl && isExternalUrl(mediaUrl)) {
          const localPath = await downloadAndOptimizeImage(mediaUrl, shopId, `${title}-story-media`)
          if (localPath) mediaUrl = localPath
        }
      }

      const storyData = {
        title,
        thumbnailUrl,
        mediaUrl,
        mediaType: story.mediaType || 'image',
        text: story.text || null,
        linkUrl: story.linkUrl || null,
        linkText: story.linkText || null,
        duration: parseInt(story.duration) || 5,
        category: story.category || null,
        isActive: story.isActive !== undefined ? !!story.isActive : true,
        displayLocation: story.displayLocation || 'both',
        isDemo: story.isDemo !== undefined ? !!story.isDemo : false,
        expiresAt: story.expiresAt ? new Date(story.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
      }

      if (existingStory) {
        await prisma.story.update({
          where: { id: existingStory.id, shopId },
          data: storyData
        })
        updatedStoriesCount++
      } else {
        await prisma.story.create({
          data: {
            ...storyData,
            shopId
          }
        })
        importedStoriesCount++
      }
      await updateJobProgress()
    }
  }

  // 15. Process Media (Media)
  if (media && Array.isArray(media)) {
    for (const med of media) {
      if (!med.url) {
        await updateJobProgress()
        continue
      }
      const urlRaw = med.url.trim()

      const existingMedia = await prisma.media.findFirst({
        where: { url: urlRaw, shopId }
      })

      if (existingMedia && conflictResolution === 'skip') {
        skippedMediaCount++
        await updateJobProgress()
        continue
      }

      let url = urlRaw
      if (downloadImages && isExternalUrl(url)) {
        const localPath = await downloadAndOptimizeImage(url, shopId, med.name || 'imported-media')
        if (localPath) url = localPath
      }

      const mediaData = {
        url,
        type: med.type || 'image',
        name: med.name || 'imported-media',
        alt: med.alt || null,
        size: med.size !== undefined && med.size !== null ? parseInt(med.size) : null,
        originalId: med.originalId || null,
        originalUrl: med.originalUrl || null
      }

      if (existingMedia) {
        await prisma.media.update({
          where: { id: existingMedia.id, shopId },
          data: mediaData
        })
        updatedMediaCount++
      } else {
        await prisma.media.create({
          data: {
            ...mediaData,
            shopId
          }
        })
        importedMediaCount++
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
  if (menus && menus.length > 0) {
    summaryMessage += `\nمنوها: ${importedMenusCount} جدید، ${updatedMenusCount} بروزرسانی، ${skippedMenusCount} نادیده.`
  }
  if (discounts && discounts.length > 0) {
    summaryMessage += `\nکدهای تخفیف: ${importedDiscountsCount} جدید، ${updatedDiscountsCount} بروزرسانی، ${skippedDiscountsCount} نادیده.`
  }
  if (blogCategories && blogCategories.length > 0) {
    summaryMessage += `\nدسته‌بندی‌های وبلاگ: ${importedBlogCategoriesCount} جدید، ${updatedBlogCategoriesCount} بروزرسانی، ${skippedBlogCategoriesCount} نادیده.`
  }
  if (blogPosts && blogPosts.length > 0) {
    summaryMessage += `\nمقالات وبلاگ: ${importedBlogPostsCount} جدید، ${updatedBlogPostsCount} بروزرسانی، ${skippedBlogPostsCount} نادیده.`
  }
  if (productSets && productSets.length > 0) {
    summaryMessage += `\nست‌های محصول: ${importedProductSetsCount} جدید، ${updatedProductSetsCount} بروزرسانی، ${skippedProductSetsCount} نادیده.`
  }
  if (stories && stories.length > 0) {
    summaryMessage += `\nاستوری‌ها: ${importedStoriesCount} جدید، ${updatedStoriesCount} بروزرسانی، ${skippedStoriesCount} نادیده.`
  }
  if (media && media.length > 0) {
    summaryMessage += `\nرسانه‌ها: ${importedMediaCount} جدید، ${updatedMediaCount} بروزرسانی، ${skippedMediaCount} نادیده.`
  }
  if (settings) {
    summaryMessage += `\nتنظیمات فروشگاه با موفقیت بروزرسانی شد.`
  }

  return {
    success: true,
    message: summaryMessage
  }
}

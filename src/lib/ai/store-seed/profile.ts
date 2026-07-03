import { prisma } from '@/lib/prisma';

export async function getOrCreateSeedProfile(shopId: string, initialData?: any) {
  const existing = await prisma.shopSeedProfile.findUnique({
    where: { shopId }
  });

  if (existing) {
    if (initialData) {
      return await prisma.shopSeedProfile.update({
        where: { shopId },
        data: {
          businessType: initialData.businessType || existing.businessType,
          niche: initialData.niche || existing.niche,
          targetAudience: initialData.targetAudience ? JSON.stringify(initialData.targetAudience) : existing.targetAudience,
          priceLevel: initialData.priceLevel || existing.priceLevel,
          brandTone: initialData.brandTone || existing.brandTone,
          mainCategories: initialData.mainCategories ? JSON.stringify(initialData.mainCategories) : existing.mainCategories,
          source: initialData.source || existing.source,
        }
      });
    }
    return existing;
  }

  return await prisma.shopSeedProfile.create({
    data: {
      shopId,
      businessType: initialData?.businessType || 'general',
      niche: initialData?.niche || '',
      targetAudience: initialData?.targetAudience ? JSON.stringify(initialData.targetAudience) : '[]',
      priceLevel: initialData?.priceLevel || 'medium',
      brandTone: initialData?.brandTone || 'trust',
      mainCategories: initialData?.mainCategories ? JSON.stringify(initialData.mainCategories) : '[]',
      source: initialData?.source || 'onboarding',
    }
  });
}

export async function updateSeedProfile(shopId: string, data: any) {
  return await prisma.shopSeedProfile.update({
    where: { shopId },
    data: {
      businessType: data.businessType,
      niche: data.niche,
      targetAudience: data.targetAudience ? JSON.stringify(data.targetAudience) : undefined,
      priceLevel: data.priceLevel,
      brandTone: data.brandTone,
      mainCategories: data.mainCategories ? JSON.stringify(data.mainCategories) : undefined,
      productRules: data.productRules ? JSON.stringify(data.productRules) : undefined,
      seoKeywords: data.seoKeywords ? JSON.stringify(data.seoKeywords) : undefined,
      contentTopics: data.contentTopics ? JSON.stringify(data.contentTopics) : undefined,
      imageStyle: data.imageStyle,
      confidence: data.confidence,
      source: data.source,
    }
  });
}

export async function getOrCreateSeedJob(shopId: string) {
  const existing = await prisma.shopSeedJob.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing && ['pending', 'blueprint_ready', 'preview_ready'].includes(existing.status)) {
    return existing;
  }

  return await prisma.shopSeedJob.create({
    data: {
      shopId,
      status: 'pending',
      progress: 0
    }
  });
}

export async function updateSeedJob(jobId: string, data: any) {
  return await prisma.shopSeedJob.update({
    where: { id: jobId },
    data: {
      status: data.status,
      phase: data.phase,
      progress: data.progress,
      error: data.error,
      previewJson: data.previewJson ? JSON.stringify(data.previewJson) : undefined,
    }
  });
}

export async function getSeedJobStatus(shopId: string) {
  return await prisma.shopSeedJob.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' }
  });
}

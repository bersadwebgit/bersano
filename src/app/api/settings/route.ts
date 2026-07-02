import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { Invalidate } from '@/lib/invalidate';

export async function GET(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: user.shopId as string },
      include: { package: true }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const data = await request.json();

    // Query active package and enforce feature limitations
    const activeShop = await prisma.shopSettings.findUnique({
      where: { shopId: user.shopId as string },
      include: { package: true }
    });

    const isPackageActive = activeShop?.packageExpiresAt ? new Date(activeShop.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? activeShop?.package : null;
    let packageFeatures: any = null;
    if (activePackage) {
      try {
        packageFeatures = JSON.parse(activePackage.features);
      } catch (e) {
        console.error("Error parsing active package features:", e);
      }
    }

    if (packageFeatures) {
      if (!packageFeatures.specialDeals) data.specialDealsEnabled = false;
      if (!packageFeatures.relatedProducts) data.relatedProductsEnabled = false;
      if (!packageFeatures.productSets) data.productSetsEnabled = false;
      if (!packageFeatures.zarinpal) data.zarinpalEnabled = false;
      if (!packageFeatures.zibal) data.zibalEnabled = false;
      if (!packageFeatures.cardToCard) data.cardToCardEnabled = false;
      if (!packageFeatures.tipax) data.tipaxEnabled = false;
      if (!packageFeatures.customerClub) data.customerClubEnabled = false;
      if (!packageFeatures.seoTools) {
        data.sitemapEnabled = false;
        data.robotsEnabled = false;
      }
      
      // Enforce product type limits
      if (!packageFeatures.physicalProducts && packageFeatures.digitalProducts) {
        data.productType = 'digital';
      } else if (packageFeatures.physicalProducts && !packageFeatures.digitalProducts) {
        data.productType = 'physical';
      } else if (!packageFeatures.physicalProducts && !packageFeatures.digitalProducts) {
        data.productType = 'physical'; // fallback
      }
    }

    // Handle SMS config encryption and preservation of credentials
    if (data.smsConfig !== undefined) {
      try {
        let incomingConfig = typeof data.smsConfig === 'string' ? JSON.parse(data.smsConfig) : data.smsConfig;
        
        // Get existing config to preserve unchanged credentials
        const existingConfigStr = activeShop?.smsConfig;
        let existingConfig: any = {};
        if (existingConfigStr) {
          try {
            existingConfig = typeof existingConfigStr === 'string' ? JSON.parse(existingConfigStr) : existingConfigStr;
          } catch (e) {}
        }

        const { encrypt } = await import('@/lib/crypto');
        const credentials = incomingConfig.credentials || {};
        const existingCreds = existingConfig.credentials || {};

        const finalCredentials: any = {};

        // For Melipayamak
        if (credentials.username && credentials.username !== '********') {
          finalCredentials.username = encrypt(credentials.username);
        } else {
          finalCredentials.username = existingCreds.username || '';
        }

        if (credentials.password && credentials.password !== '********') {
          finalCredentials.password = encrypt(credentials.password);
        } else {
          finalCredentials.password = existingCreds.password || '';
        }

        // For SMS.ir
        if (credentials.apiKey && credentials.apiKey !== '********') {
          finalCredentials.apiKey = encrypt(credentials.apiKey);
        } else {
          finalCredentials.apiKey = existingCreds.apiKey || '';
        }

        incomingConfig.credentials = finalCredentials;
        data.smsConfig = JSON.stringify(incomingConfig);
      } catch (e) {
        console.error('Error processing SMS config:', e);
      }
    }

    const settings = await prisma.shopSettings.upsert({
      where: { shopId: user.shopId as string },
      update: {
        shopName: data.shopName,
        subdomain: data.subdomain,
        description: data.description,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        themeColor: data.themeColor,
        currency: data.currency,
        language: data.language,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        registrationNumber: data.registrationNumber,
        economicCode: data.economicCode,
        productType: data.productType,
        faqsConfig: data.faqsConfig !== undefined ? (typeof data.faqsConfig === 'string' ? data.faqsConfig : JSON.stringify(data.faqsConfig)) : undefined,
        aboutUsPage: data.aboutUsPage !== undefined ? data.aboutUsPage : undefined,
        termsPage: data.termsPage !== undefined ? data.termsPage : undefined,
        contactUsPage: data.contactUsPage !== undefined ? data.contactUsPage : undefined,
        chatSettings: data.chatSettings !== undefined ? (typeof data.chatSettings === 'string' ? data.chatSettings : JSON.stringify(data.chatSettings)) : undefined,
        specialDealsEnabled: data.specialDealsEnabled !== undefined ? !!data.specialDealsEnabled : undefined,
        specialDealsLimit: data.specialDealsLimit !== undefined ? parseInt(data.specialDealsLimit) : undefined,
        relatedProductsEnabled: data.relatedProductsEnabled !== undefined ? !!data.relatedProductsEnabled : undefined,
        productSetsEnabled: data.productSetsEnabled !== undefined ? !!data.productSetsEnabled : undefined,
        wholesaleEnabled: data.wholesaleEnabled !== undefined ? !!data.wholesaleEnabled : undefined,
        sitemapEnabled: data.sitemapEnabled !== undefined ? !!data.sitemapEnabled : undefined,
        robotsEnabled: data.robotsEnabled !== undefined ? !!data.robotsEnabled : undefined,
        zarinpalEnabled: data.zarinpalEnabled !== undefined ? !!data.zarinpalEnabled : undefined,
        zarinpalMerchantId: data.zarinpalMerchantId !== undefined ? data.zarinpalMerchantId : undefined,
        zarinpalSandbox: data.zarinpalSandbox !== undefined ? !!data.zarinpalSandbox : undefined,
        zibalEnabled: data.zibalEnabled !== undefined ? !!data.zibalEnabled : undefined,
        zibalMerchantId: data.zibalMerchantId !== undefined ? data.zibalMerchantId : undefined,
        zibalSandbox: data.zibalSandbox !== undefined ? !!data.zibalSandbox : undefined,
        digipayEnabled: data.digipayEnabled !== undefined ? !!data.digipayEnabled : undefined,
        digipayClientId: data.digipayClientId !== undefined ? data.digipayClientId : undefined,
        digipayClientSecret: data.digipayClientSecret !== undefined ? data.digipayClientSecret : undefined,
        digipayUsername: data.digipayUsername !== undefined ? data.digipayUsername : undefined,
        digipayPassword: data.digipayPassword !== undefined ? data.digipayPassword : undefined,
        digipaySandbox: data.digipaySandbox !== undefined ? !!data.digipaySandbox : undefined,
        cardToCardEnabled: data.cardToCardEnabled !== undefined ? !!data.cardToCardEnabled : undefined,
        tipaxEnabled: data.tipaxEnabled !== undefined ? !!data.tipaxEnabled : undefined,
        tipaxUsername: data.tipaxUsername !== undefined ? data.tipaxUsername : undefined,
        tipaxPassword: data.tipaxPassword !== undefined ? data.tipaxPassword : undefined,
        tipaxApiKey: data.tipaxApiKey !== undefined ? data.tipaxApiKey : undefined,
        tipaxSandbox: data.tipaxSandbox !== undefined ? !!data.tipaxSandbox : undefined,
        tipaxShippingMode: data.tipaxShippingMode !== undefined ? data.tipaxShippingMode : undefined,
        cardNumber: data.cardNumber !== undefined ? data.cardNumber : undefined,
        cardHolderName: data.cardHolderName !== undefined ? data.cardHolderName : undefined,
        cardBankName: data.cardBankName !== undefined ? data.cardBankName : undefined,
        cardSheba: data.cardSheba !== undefined ? data.cardSheba : undefined,
        cardToCardConfig: data.cardToCardConfig !== undefined ? data.cardToCardConfig : undefined,
        bottomNavConfig: data.bottomNavConfig,
        homePageType: data.homePageType,
        customHomeConfig: data.customHomeConfig,
        imageProcessConfig: data.imageProcessConfig !== undefined ? data.imageProcessConfig : undefined,
        customerClubEnabled: data.customerClubEnabled !== undefined ? !!data.customerClubEnabled : undefined,
        loyaltyPointsRate: data.loyaltyPointsRate !== undefined ? parseInt(data.loyaltyPointsRate) : undefined,
        loyaltyPointValue: data.loyaltyPointValue !== undefined ? parseInt(data.loyaltyPointValue) : undefined,
        loyaltyDiscountThreshold: data.loyaltyDiscountThreshold !== undefined ? parseInt(data.loyaltyDiscountThreshold) : undefined,
        loyaltyDiscountAmount: data.loyaltyDiscountAmount !== undefined ? parseFloat(data.loyaltyDiscountAmount) : undefined,
        loyaltyDiscountType: data.loyaltyDiscountType !== undefined ? data.loyaltyDiscountType : undefined,
        baleIntegrationToken: data.baleIntegrationToken !== undefined ? data.baleIntegrationToken : undefined,
        baleChatId: data.baleChatId !== undefined ? data.baleChatId : undefined,
        baleOrderNotificationsEnabled: data.baleOrderNotificationsEnabled !== undefined ? !!data.baleOrderNotificationsEnabled : undefined,
        baleNotificationStatuses: data.baleNotificationStatuses !== undefined ? (typeof data.baleNotificationStatuses === 'string' ? data.baleNotificationStatuses : JSON.stringify(data.baleNotificationStatuses)) : undefined,
        telegramIntegrationToken: data.telegramIntegrationToken !== undefined ? data.telegramIntegrationToken : undefined,
        telegramChatId: data.telegramChatId !== undefined ? data.telegramChatId : undefined,
        telegramOrderNotificationsEnabled: data.telegramOrderNotificationsEnabled !== undefined ? !!data.telegramOrderNotificationsEnabled : undefined,
        telegramNotificationStatuses: data.telegramNotificationStatuses !== undefined ? (typeof data.telegramNotificationStatuses === 'string' ? data.telegramNotificationStatuses : JSON.stringify(data.telegramNotificationStatuses)) : undefined,
        googleAnalyticsId: data.googleAnalyticsId !== undefined ? data.googleAnalyticsId : undefined,
        googleTagManagerId: data.googleTagManagerId !== undefined ? data.googleTagManagerId : undefined,
        microsoftClarityId: data.microsoftClarityId !== undefined ? data.microsoftClarityId : undefined,
        mahakEnabled: data.mahakEnabled !== undefined ? !!data.mahakEnabled : undefined,
        mahakApiKey: data.mahakApiKey !== undefined ? data.mahakApiKey : undefined,
        mahakServerUrl: data.mahakServerUrl !== undefined ? data.mahakServerUrl : undefined,
        mahakUsername: data.mahakUsername !== undefined ? data.mahakUsername : undefined,
        mahakPassword: data.mahakPassword !== undefined ? data.mahakPassword : undefined,
        mahakSyncProducts: data.mahakSyncProducts !== undefined ? !!data.mahakSyncProducts : undefined,
        mahakSyncOrders: data.mahakSyncOrders !== undefined ? !!data.mahakSyncOrders : undefined,
        mahakSyncCustomers: data.mahakSyncCustomers !== undefined ? !!data.mahakSyncCustomers : undefined,
        mahakSyncCustomersPhoneOnly: data.mahakSyncCustomersPhoneOnly !== undefined ? !!data.mahakSyncCustomersPhoneOnly : undefined,
        mahakSyncInterval: data.mahakSyncInterval !== undefined ? parseInt(data.mahakSyncInterval) : undefined,
        mahakLastSync: data.mahakLastSync !== undefined ? (data.mahakLastSync ? new Date(data.mahakLastSync) : null) : undefined,
        smsConfig: data.smsConfig !== undefined ? data.smsConfig : undefined,
      },
      create: {
        shopId: user.shopId as string,
        shopName: data.shopName || 'فروشگاه من',
        subdomain: data.subdomain,
        description: data.description,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        themeColor: data.themeColor || '#000000',
        currency: data.currency || 'IRR',
        language: data.language || 'fa',
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        registrationNumber: data.registrationNumber || '',
        economicCode: data.economicCode || '',
        faqsConfig: data.faqsConfig !== undefined ? (typeof data.faqsConfig === 'string' ? data.faqsConfig : JSON.stringify(data.faqsConfig)) : '[]',
        aboutUsPage: data.aboutUsPage !== undefined ? data.aboutUsPage : undefined,
        termsPage: data.termsPage !== undefined ? data.termsPage : undefined,
        contactUsPage: data.contactUsPage !== undefined ? data.contactUsPage : undefined,
        chatSettings: data.chatSettings !== undefined ? (typeof data.chatSettings === 'string' ? data.chatSettings : JSON.stringify(data.chatSettings)) : undefined,
        specialDealsEnabled: data.specialDealsEnabled !== undefined ? !!data.specialDealsEnabled : false,
        specialDealsLimit: data.specialDealsLimit !== undefined ? parseInt(data.specialDealsLimit) : 4,
        relatedProductsEnabled: data.relatedProductsEnabled !== undefined ? !!data.relatedProductsEnabled : true,
        productSetsEnabled: data.productSetsEnabled !== undefined ? !!data.productSetsEnabled : true,
        wholesaleEnabled: data.wholesaleEnabled !== undefined ? !!data.wholesaleEnabled : false,
        sitemapEnabled: data.sitemapEnabled !== undefined ? !!data.sitemapEnabled : true,
        robotsEnabled: data.robotsEnabled !== undefined ? !!data.robotsEnabled : true,
        zarinpalEnabled: data.zarinpalEnabled !== undefined ? !!data.zarinpalEnabled : false,
        zarinpalMerchantId: data.zarinpalMerchantId || '',
        zarinpalSandbox: data.zarinpalSandbox !== undefined ? !!data.zarinpalSandbox : false,
        zibalEnabled: data.zibalEnabled !== undefined ? !!data.zibalEnabled : false,
        zibalMerchantId: data.zibalMerchantId || '',
        zibalSandbox: data.zibalSandbox !== undefined ? !!data.zibalSandbox : false,
        digipayEnabled: data.digipayEnabled !== undefined ? !!data.digipayEnabled : false,
        digipayClientId: data.digipayClientId || '',
        digipayClientSecret: data.digipayClientSecret || '',
        digipayUsername: data.digipayUsername || '',
        digipayPassword: data.digipayPassword || '',
        digipaySandbox: data.digipaySandbox !== undefined ? !!data.digipaySandbox : false,
        cardToCardEnabled: data.cardToCardEnabled !== undefined ? !!data.cardToCardEnabled : false,
        tipaxEnabled: data.tipaxEnabled !== undefined ? !!data.tipaxEnabled : false,
        tipaxUsername: data.tipaxUsername || '',
        tipaxPassword: data.tipaxPassword || '',
        tipaxApiKey: data.tipaxApiKey || '',
        tipaxSandbox: data.tipaxSandbox !== undefined ? !!data.tipaxSandbox : false,
        tipaxShippingMode: data.tipaxShippingMode || 'manual',
        cardNumber: data.cardNumber || '',
        cardHolderName: data.cardHolderName || '',
        cardBankName: data.cardBankName || '',
        cardSheba: data.cardSheba || '',
        cardToCardConfig: data.cardToCardConfig || '[]',
        bottomNavConfig: data.bottomNavConfig,
        homePageType: data.homePageType || 'custom',
        customHomeConfig: data.customHomeConfig,
        imageProcessConfig: data.imageProcessConfig || '{}',
        customerClubEnabled: data.customerClubEnabled !== undefined ? !!data.customerClubEnabled : false,
        loyaltyPointsRate: data.loyaltyPointsRate !== undefined ? parseInt(data.loyaltyPointsRate) : 10000,
        loyaltyPointValue: data.loyaltyPointValue !== undefined ? parseInt(data.loyaltyPointValue) : 100,
        loyaltyDiscountThreshold: data.loyaltyDiscountThreshold !== undefined ? parseInt(data.loyaltyDiscountThreshold) : 100,
        loyaltyDiscountAmount: data.loyaltyDiscountAmount !== undefined ? parseFloat(data.loyaltyDiscountAmount) : 50000,
        loyaltyDiscountType: data.loyaltyDiscountType !== undefined ? data.loyaltyDiscountType : 'flat',
        baleIntegrationToken: data.baleIntegrationToken || '',
        baleChatId: data.baleChatId || '',
        baleOrderNotificationsEnabled: data.baleOrderNotificationsEnabled !== undefined ? !!data.baleOrderNotificationsEnabled : false,
        baleNotificationStatuses: data.baleNotificationStatuses !== undefined ? (typeof data.baleNotificationStatuses === 'string' ? data.baleNotificationStatuses : JSON.stringify(data.baleNotificationStatuses)) : '["new_order","status_change"]',
        telegramIntegrationToken: data.telegramIntegrationToken || '',
        telegramChatId: data.telegramChatId || '',
        telegramOrderNotificationsEnabled: data.telegramOrderNotificationsEnabled !== undefined ? !!data.telegramOrderNotificationsEnabled : false,
        telegramNotificationStatuses: data.telegramNotificationStatuses !== undefined ? (typeof data.telegramNotificationStatuses === 'string' ? data.telegramNotificationStatuses : JSON.stringify(data.telegramNotificationStatuses)) : '["new_order","status_change"]',
        googleAnalyticsId: data.googleAnalyticsId || '',
        googleTagManagerId: data.googleTagManagerId || '',
        microsoftClarityId: data.microsoftClarityId || '',
        mahakEnabled: data.mahakEnabled !== undefined ? !!data.mahakEnabled : false,
        mahakApiKey: data.mahakApiKey || '',
        mahakServerUrl: data.mahakServerUrl || '',
        mahakUsername: data.mahakUsername || '',
        mahakPassword: data.mahakPassword || '',
        mahakSyncProducts: data.mahakSyncProducts !== undefined ? !!data.mahakSyncProducts : false,
        mahakSyncOrders: data.mahakSyncOrders !== undefined ? !!data.mahakSyncOrders : false,
        mahakSyncCustomers: data.mahakSyncCustomers !== undefined ? !!data.mahakSyncCustomers : false,
        mahakSyncCustomersPhoneOnly: data.mahakSyncCustomersPhoneOnly !== undefined ? !!data.mahakSyncCustomersPhoneOnly : false,
        mahakSyncInterval: data.mahakSyncInterval !== undefined ? parseInt(data.mahakSyncInterval) : 60,
        mahakLastSync: data.mahakLastSync ? new Date(data.mahakLastSync) : null,
        smsConfig: data.smsConfig !== undefined ? data.smsConfig : undefined,
        isApproved: true,
      },
    });

    await Invalidate.shopSettings(user.shopId as string);

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

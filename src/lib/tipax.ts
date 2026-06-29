/**
 * Tipax API Integration Helper
 * Optimized for multi-tenancy with token caching, rate-limit retries, and Sandbox/Production toggle support.
 */

export interface TipaxConfig {
  enabled: boolean;
  username?: string;
  password?: string;
  apiKey?: string;
  sandbox: boolean; // Sandbox / Test mode toggle
  shippingMode: 'manual' | 'api';
}

export interface TipaxOrderData {
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCity: string;
  receiverState: string;
  receiverZipCode?: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderState: string;
  itemsCount: number;
  totalValue: number;
  notes?: string;
}

// In-memory token cache to prevent redundant authentication calls and hitting rate limits
// Key is "sandbox|username", value is the cached token with an expiry timestamp
interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache: Record<string, CachedToken> = {};

/**
 * Utility function to sleep/wait for a given duration (used in retry backoff)
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a Bearer authentication token from Tipax API
 * Uses cached token if valid, with robust rate-limit retries and sandbox toggle.
 */
export async function getTipaxToken(
  username?: string,
  password?: string,
  sandbox: boolean = false
): Promise<string | null> {
  if (!username || !password) {
    return null;
  }

  const cacheKey = `${sandbox ? 'test' : 'prod'}|${username}`;
  const now = Date.now();

  // If token is cached and not expired (with 5-minute safety buffer), return it
  if (tokenCache[cacheKey] && tokenCache[cacheKey].expiresAt > now + 300000) {
    console.log(`[Tipax API] Returning cached token for ${username}`);
    return tokenCache[cacheKey].token;
  }

  const authUrl = sandbox 
    ? 'https://omtestapi.tipax.ir/Token' 
    : 'https://igtgatewayapi.tipax.ir/Token';

  let retries = 3;
  let waitTime = 150; // Start with 150ms delay as recommended by Tipax FAQ

  while (retries > 0) {
    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          grant_type: 'password',
        }),
      });

      if (response.status === 429) {
        console.warn(`[Tipax API] Rate limited (429) during token fetch. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        retries--;
        waitTime *= 2; // Exponential backoff
        continue;
      }

      if (!response.ok) {
        console.error('[Tipax API] Token generation failed with status:', response.status);
        return null;
      }

      const data = await response.json();
      const token = data.access_token || data.token;
      
      if (token) {
        // Cache token. Standard expiry is typically 24 hours, we cache for 1 hour to be highly safe.
        tokenCache[cacheKey] = {
          token,
          expiresAt: now + 3600000, // 1 hour TTL
        };
        return token;
      }
      return null;
    } catch (error) {
      console.error('[Tipax API] Token generation error:', error);
      retries--;
      if (retries === 0) return null;
      await delay(waitTime);
      waitTime *= 2;
    }
  }

  return null;
}

/**
 * Register an order/parcel with Tipax API.
 * Includes auto token caching, sandbox routing, and rate-limit mitigation.
 */
export async function registerTipaxOrder(
  config: TipaxConfig,
  orderData: TipaxOrderData
): Promise<{ success: boolean; trackingCode?: string; orderId?: string; message: string }> {
  
  // Test credentials check
  const isMock = 
    !config.username || 
    !config.password || 
    !config.apiKey || 
    config.username === 'test' || 
    config.apiKey.includes('xxx') ||
    config.username.trim() === '' ||
    config.password.trim() === '';

  if (isMock) {
    // Return a mocked successful response for easy testing and integration
    const mockTrackingCode = `118${Math.floor(10000000000000 + Math.random() * 90000000000000)}`;
    const mockOrderId = `TPX-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    
    return {
      success: true,
      trackingCode: mockTrackingCode,
      orderId: mockOrderId,
      message: 'سفارش به صورت آزمایشی در شبیه‌ساز تیپاکس ثبت شد. (اطلاعات واقعی وب‌سرویس وارد نشده است)',
    };
  }

  try {
    // 1. Fetch Bearer Token (leveraging caching)
    const token = await getTipaxToken(config.username, config.password, config.sandbox);
    if (!token) {
      return {
        success: false,
        message: 'خطا در احراز هویت با وب‌سرویس تیپاکس. لطفا نام کاربری و رمز عبور را بررسی کنید.',
      };
    }

    // 2. Prepare standard Tipax OM v3 Order payload
    const payload = {
      order: {
        description: orderData.notes || 'سفارش فروشگاهی',
        paymentType: 1, // 1: Cash/Sender Pre-paid (Cash on Delivery can be set if needed)
        serviceType: 1, // 1: Standard shipping
        collectTime: null, // As per FAQ, collect time is registered but not bookable via API
        insurancePrice: Math.max(100000, orderData.totalValue), // Standard insurance rate
      },
      addresses: [
        {
          peopleAddressTypeId: 1, // 1: Sender/Origin
          fullName: orderData.senderName,
          cellphone: orderData.senderPhone,
          stateName: orderData.senderState,
          cityName: orderData.senderCity,
          fullAddress: orderData.senderAddress,
        },
        {
          peopleAddressTypeId: 2, // 2: Recipient/Destination
          fullName: orderData.receiverName,
          cellphone: orderData.receiverPhone,
          stateName: orderData.receiverState,
          cityName: orderData.receiverCity,
          fullAddress: orderData.receiverAddress,
          postalCode: orderData.receiverZipCode || '',
        }
      ],
      parcels: [
        {
          weight: 1, // Default 1kg
          contentRateId: 1, // Generic item type
          packingPriceId: 1, // Generic packaging type
        }
      ]
    };

    const apiUrl = config.sandbox 
      ? 'https://omtestapi.tipax.ir/api/OM/v3/Orders' 
      : 'https://omapi.tipax.ir/api/OM/v3/Orders';

    let retries = 3;
    let waitTime = 150; // Backoff wait time in ms

    while (retries > 0) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'APIkey': config.apiKey || '',
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 429) {
          console.warn(`[Tipax API] Rate limited (429) during order creation. Retrying in ${waitTime}ms...`);
          await delay(waitTime);
          retries--;
          waitTime *= 2; // Exponential backoff
          continue;
        }

        const responseText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('[Tipax API] Failed to parse JSON response:', responseText);
        }

        if (!response.ok) {
          console.error('[Tipax API] Order registration failed:', data);
          return {
            success: false,
            message: data.message || data.error || `خطای سرور تیپاکس (${response.status})`,
          };
        }

        const trackingCode = data.trackingCode || data.barcode || data.entries?.barcode || data.entries?.trackingCode;
        const orderId = String(data.orderId || data.id || data.entries?.order_id || '');

        if (trackingCode) {
          return {
            success: true,
            trackingCode: trackingCode,
            orderId: orderId,
            message: config.sandbox
              ? 'سفارش با موفقیت در محیط تستی (Sandbox) تیپاکس ثبت گردید و بارکد رهگیری دریافت شد.'
              : 'سفارش با موفقیت در سامانه اصلی تیپاکس ثبت گردید و بارکد رهگیری دریافت شد.',
          };
        } else {
          console.warn('[Tipax API] Order registered but no trackingCode returned. Response:', data);
          return {
            success: true,
            orderId: orderId,
            trackingCode: `TPX-${Date.now()}`,
            message: 'سفارش ثبت شد، اما شناسه رهگیری بازگردانده نشد. یک شناسه موقت تخصیص یافت.',
          };
        }
      } catch (error: any) {
        console.error('[Tipax API] Connection error during order registration:', error);
        retries--;
        if (retries === 0) {
          return {
            success: false,
            message: `خطا در اتصال به سرورهای تیپاکس: ${error.message || 'مشکل ناشناخته شبکه'}`,
          };
        }
        await delay(waitTime);
        waitTime *= 2;
      }
    }

    return {
      success: false,
      message: 'درخواست به علت خطای نرخ دسترسی (Rate Limit) بیش از حد متوقف شد. لطفا بعدا تلاش کنید.',
    };

  } catch (error: any) {
    console.error('[Tipax API] Unexpected error:', error);
    return {
      success: false,
      message: `خطای غیرمنتظره در ثبت سفارش تیپاکس: ${error.message || 'خطای سرور لوکال'}`,
    };
  }
}

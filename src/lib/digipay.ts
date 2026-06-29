export interface DigipayTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  jti?: string;
}

export interface DigipayResult {
  status: number;
  message: string;
  level: string;
}

export interface DigipayTicketResponse {
  result: DigipayResult;
  ticket?: string;
  redirectUrl?: string;
}

export interface DigipayVerifyResponse {
  result: DigipayResult;
  trackingCode?: string;
  providerId?: string;
  amount?: number;
  paymentGateway?: number;
  additionalInfo?: {
    prepaymentAmount: number;
    cashAmount: number;
    creditAmount: number;
    instantFinalization: boolean;
    generateInvoice: boolean;
  };
}

export interface DigipayBasketItem {
  sellerId: string;
  supplierId: string;
  productCode: string;
  brand: string;
  productType: number; // 1: Durable, 2: Consumable, 3: Service, 4: Durable Consumable
  count: number;
  categoryId: string;
}

export interface DigipayBasketDetails {
  basketId: string;
  items: DigipayBasketItem[];
}

/**
 * Gets the base URL for DigiPay based on sandbox mode
 */
export function getDigipayBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://uat.mydigipay.info/digipay/api'
    : 'https://api.mydigipay.com/digipay/api';
}

/**
 * Gets the access token from DigiPay OAuth service
 */
export async function getDigipayToken(
  clientId: string,
  clientSecret: string,
  username: string,
  password: string,
  sandbox: boolean = false
): Promise<string | null> {
  try {
    if (!clientId || !clientSecret || !username || !password) {
      console.error('[ERROR] [Digipay]: Missing credentials for token fetch');
      return null;
    }

    const baseUrl = getDigipayBaseUrl(sandbox);
    const url = `${baseUrl}/oauth/token`;

    // Combine client_id and client_secret and encode in base64
    const credentials = `${clientId}:${clientSecret}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    console.log(`[INFO] [Digipay]: Fetching access token | { url: "${url}", sandbox: ${sandbox} }`);

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', 'password');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      return data.access_token;
    } else {
      console.error('[ERROR] [Digipay]: Token fetch failed |', data);
      return null;
    }
  } catch (error) {
    console.error('[ERROR] [Digipay]: Exception fetching token |', error);
    return null;
  }
}

/**
 * Creates a purchase ticket on DigiPay UPG
 */
export async function createDigipayTicket(
  token: string,
  amount: number,
  cellNumber: string,
  providerId: string,
  callbackUrl: string,
  basketDetails?: DigipayBasketDetails,
  sandbox: boolean = false
): Promise<DigipayTicketResponse | null> {
  try {
    const baseUrl = getDigipayBaseUrl(sandbox);
    const url = `${baseUrl}/tickets/business?type=11`;

    console.log(`[INFO] [Digipay]: Creating ticket | { url: "${url}", providerId: "${providerId}", amount: ${amount} }`);

    const body: any = {
      cellNumber,
      amount,
      providerId,
      callbackUrl,
    };

    if (basketDetails) {
      body.basketDetailsDto = basketDetails;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Agent': 'WEB',
        'Digipay-Version': '2022-02-02',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return data as DigipayTicketResponse;
    } else {
      console.error('[ERROR] [Digipay]: Ticket creation failed |', data);
      return data as DigipayTicketResponse;
    }
  } catch (error) {
    console.error('[ERROR] [Digipay]: Exception creating ticket |', error);
    return null;
  }
}

/**
 * Verifies a DigiPay payment
 */
export async function verifyDigipayPayment(
  token: string,
  trackingCode: string,
  providerId: string,
  type: number,
  sandbox: boolean = false
): Promise<DigipayVerifyResponse | null> {
  try {
    const baseUrl = getDigipayBaseUrl(sandbox);
    const url = `${baseUrl}/purchases/verify?type=${type}`;

    console.log(`[INFO] [Digipay]: Verifying payment | { url: "${url}", trackingCode: "${trackingCode}", providerId: "${providerId}" }`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingCode,
        providerId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return data as DigipayVerifyResponse;
    } else {
      console.error('[ERROR] [Digipay]: Payment verification failed |', data);
      return data as DigipayVerifyResponse;
    }
  } catch (error) {
    console.error('[ERROR] [Digipay]: Exception verifying payment |', error);
    return null;
  }
}

/**
 * Delivers a DigiPay credit/BNPL purchase
 */
export async function deliverDigipayPurchase(
  token: string,
  invoiceNumber: string,
  trackingCode: string,
  products: string[],
  type: number,
  sandbox: boolean = false
): Promise<boolean> {
  try {
    const baseUrl = getDigipayBaseUrl(sandbox);
    const url = `${baseUrl}/purchases/deliver?type=${type}`;

    console.log(`[INFO] [Digipay]: Delivering purchase | { url: "${url}", trackingCode: "${trackingCode}", invoiceNumber: "${invoiceNumber}" }`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deliveryDate: Date.now(),
        invoiceNumber,
        trackingCode,
        products,
      }),
    });

    const data = await response.json();

    if (response.ok && data.result && data.result.status === 0) {
      console.log(`[INFO] [Digipay]: Purchase delivered successfully | { trackingCode: "${trackingCode}" }`);
      return true;
    } else {
      console.error('[ERROR] [Digipay]: Purchase delivery failed |', data);
      return false;
    }
  } catch (error) {
    console.error('[ERROR] [Digipay]: Exception delivering purchase |', error);
    return false;
  }
}

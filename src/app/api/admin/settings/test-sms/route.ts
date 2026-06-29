import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { normalizePhone } from '@/lib/sms';

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await request.json();
    const { provider, credentials, patternCode, testPhone, patterns } = body;

    if (!provider || !patternCode || !testPhone) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    // Load existing settings to get existing credentials if masked
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: user.shopId as string }
    });

    let existingConfig: any = {};
    if (settings?.smsConfig) {
      try {
        existingConfig = typeof settings.smsConfig === 'string' ? JSON.parse(settings.smsConfig) : settings.smsConfig;
      } catch (e) {}
    }

    const existingCreds = existingConfig.credentials || {};

    let finalUsername = '';
    let finalPassword = '';
    let finalApiKey = '';

    const prov = provider.toLowerCase();

    if (prov === 'melipayamak') {
      const username = credentials?.username;
      const password = credentials?.password;

      if (username && username !== '********') {
        finalUsername = username;
      } else if (existingCreds.username) {
        finalUsername = decrypt(existingCreds.username);
      }

      if (password && password !== '********') {
        finalPassword = password;
      } else if (existingCreds.password) {
        finalPassword = decrypt(existingCreds.password);
      }

      if (!finalUsername || !finalPassword) {
        return NextResponse.json({ error: 'نام کاربری یا رمز عبور وارد نشده است' }, { status: 400 });
      }

      const targetPhone = normalizePhone(testPhone);

      // Dynamically detect the pattern type to construct the proper number of arguments
      let detectedEvent: string | null = null;
      const currentPatterns = patterns || existingConfig?.patterns || {};
      
      for (const [key, val] of Object.entries(currentPatterns)) {
        if (String(val).trim() === String(patternCode).trim()) {
          detectedEvent = key;
          break;
        }
      }

      const getValuesForEvent = (event: string | null) => {
        const shopName = settings?.shopName || 'فروشگاه تستی';
        switch (event) {
          case 'otp':
            return ['12345'];
          case 'new_registration':
            return ['کاربر تست', shopName];
          case 'order_cancelled':
            return ['کاربر تست', 'TEST1001'];
          case 'order_shipped':
            return ['کاربر تست', 'TEST1001', '123456789012'];
          case 'order_placed_admin':
            return ['TEST1001', '۱۰,۰۰۰', shopName];
          case 'order_placed_customer':
            return ['کاربر تست', 'TEST1001', '۱۰,۰۰۰', shopName];
          default:
            // By default try 1 variable (OTP) first since it's the most common test.
            // Self-healing retry loop will try other sizes if this fails with InvalidData.
            return ['12345'];
        }
      };

      const initialValues = getValuesForEvent(detectedEvent);

      const sendToMelipayamak = async (values: string[]) => {
        const textValue = values.join(';');
        console.log(`[INFO] [TestSMS]: Sending Melipayamak pattern SMS to ${targetPhone} with bodyId ${patternCode} and values (${values.length}):`, values);

        const params = new URLSearchParams();
        params.append('username', finalUsername);
        params.append('password', finalPassword);
        params.append('text', textValue);
        params.append('to', targetPhone);
        params.append('bodyId', patternCode);

        const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          throw new Error(`Melipayamak HTTP error! status: ${response.status}`);
        }

        return await response.json();
      };

      let result = await sendToMelipayamak(initialValues);
      console.log(`[INFO] [TestSMS]: Melipayamak response for initial try (event: ${detectedEvent}):`, result);

      let isInvalidData = result?.RetStatus === 35 || result?.StrRetStatus === 'InvalidData';

      // Self-healing fallback loop: if initial values didn't match the pattern structure,
      // try other common parameter counts (1, 2, 3, 4) sequentially.
      if (isInvalidData) {
        console.warn(`[WARN] [TestSMS]: Melipayamak returned InvalidData (mismatched pattern parameters). Starting self-healing retries...`);
        const shopName = settings?.shopName || 'فروشگاه تستی';
        const fallbackSequences = [
          ['12345'], // 1 param (OTP)
          ['کاربر تست', shopName], // 2 params (new_registration / order_cancelled)
          ['کاربر تست', 'TEST1001', '123456789012'], // 3 params (order_shipped / order_placed_admin)
          ['کاربر تست', 'TEST1001', '۱۰,۰۰۰', shopName], // 4 params (order_placed_customer)
        ];

        for (const values of fallbackSequences) {
          // Skip if the length is identical to what we already tried
          if (values.length === initialValues.length) continue;

          try {
            console.log(`[INFO] [TestSMS]: Self-healing retry: sending ${values.length} params:`, values);
            const retryResult = await sendToMelipayamak(values);
            console.log(`[INFO] [TestSMS]: Self-healing retry response:`, retryResult);

            let retryVal = '';
            if (typeof retryResult === 'object' && retryResult !== null) {
              retryVal = String(retryResult.Value || retryResult.recId || retryResult.recID || '');
            } else {
              retryVal = String(retryResult).trim();
            }

            const retryNumVal = Number(retryVal);
            const retrySuccess = (!isNaN(retryNumVal) && retryNumVal > 0) || (isNaN(retryNumVal) && retryVal);
            const isRetryInvalidData = retryResult?.RetStatus === 35 || retryResult?.StrRetStatus === 'InvalidData';

            if (retrySuccess || !isRetryInvalidData) {
              result = retryResult;
              isInvalidData = false;
              break;
            }
          } catch (retryErr) {
            console.error(`[ERROR] [TestSMS]: Self-healing retry exception:`, retryErr);
          }
        }
      }

      let isSuccess = false;
      let val = '';
      let retStatus = typeof result?.RetStatus !== 'undefined' && result?.RetStatus !== null ? Number(result.RetStatus) : null;
      let strRetStatus = result?.StrRetStatus || '';

      if (typeof result === 'object' && result !== null) {
        val = String(result.Value || result.recId || result.recID || '');
      } else {
        val = String(result).trim();
      }

      const numericVal = Number(val);

      if (retStatus === 1 && !isNaN(numericVal) && numericVal > 0) {
        isSuccess = true;
      } else if (retStatus === 1 && isNaN(numericVal) && val) {
        isSuccess = true;
      } else if (retStatus === null && !isNaN(numericVal) && numericVal > 0) {
        isSuccess = true;
      } else if (retStatus === null && isNaN(numericVal) && val) {
        isSuccess = true;
      }

      if (isSuccess) {
        return NextResponse.json({ success: true, messageId: val });
      } else {
        const getErrorMessage = (valueNum: number, status: number | null, rawVal: string, rawStatusStr: string) => {
          // IP Blocked has highest priority
          if (valueNum === -108 || valueNum === 108) {
            return 'آدرس آی‌پی (IP) سرور شما به دلیل تلاش‌های ناموفق متوالی موقتاً توسط ملی‌پیامک مسدود شده است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.';
          }
          if (valueNum === -109 || valueNum === 109) {
            return 'برای استفاده از API، تنظیم آدرس آی‌پی (IP) مجاز در پنل ملی‌پیامک الزامی است.';
          }
          if (valueNum === -110 || valueNum === 110) {
            return 'استفاده از کلید وب‌سرویس (API Key) به جای رمز عبور الزامی است.';
          }

          // Specific REST BaseServiceNumber/Pattern error codes (Value)
          const baseServiceErrors: Record<number, string> = {
            [-1]: 'دسترسی برای استفاده از وب‌سرویس پترن غیرفعال است. لطفا با پشتیبانی ملی‌پیامک تماس بگیرید.',
            [-2]: 'محدودیت تعداد شماره موبایل (در متد پترن فقط ارسال به یک شماره در هر بار مجاز است).',
            [-3]: 'سرشماره پیامک در سیستم تعریف نشده یا شماره گیرنده نامعتبر است.',
            [-4]: 'کد الگوی ارسالی (Pattern Code) اشتباه است یا هنوز توسط مدیر سامانه ملی‌پیامک تایید نشده است.',
            [-5]: 'تعداد متغیرهای ارسالی با متغیرهای تعریف شده در این الگو (پترن) همخوانی ندارد. لطفا متن الگو را بررسی کنید.',
            [-6]: 'خطای داخلی سامانه؛ ساختار پترن یا کاراکترهای درون آکاردئون {} اشتباه نوشته شده است.',
            [-7]: 'خطایی در شماره فرستنده رخ داده است. با پشتیبانی پنل تماس بگیرید.',
            [-10]: 'ارسال لینک، آی‌پی یا ایمیل به عنوان متغیر پترن مجاز نیست. این موارد را از متن حذف کنید.',
          };

          if (baseServiceErrors[valueNum]) {
            return baseServiceErrors[valueNum];
          }

          // If RetStatus is 35 or StrRetStatus is InvalidData/BlackList, it is Blacklist or invalid/rejected request (like incorrect params)
          if (status === 35 || rawStatusStr === 'BlackList' || rawStatusStr === 'Blacklist' || rawStatusStr === 'InvalidData') {
            return 'شماره گیرنده در لیست سیاه مخابرات (بلک‌لیست) قرار دارد یا الگو/خط مورد استفاده قابلیت عبور از بلک‌لیست را ندارد. لطفاً شماره موبایل دیگری را تست کنید یا از خطوط خدماتی اشتراکی استفاده نمایید.';
          }

          // General SOAP/REST error codes
          const generalErrors: Record<number, string> = {
            [0]: 'نام کاربری یا رمز عبور پنل ملی‌پیامک نادرست است.',
            [2]: 'اعتبار مالی پنل پیامک شما کافی نیست. لطفا پنل خود را شارژ کنید.',
            [3]: 'محدودیت ارسال روزانه فعال است.',
            [4]: 'محدودیت در حجم یا تعداد پیامک‌های ارسالی.',
            [5]: 'شماره فرستنده معتبر نیست.',
            [6]: 'سامانه ملی‌پیامک در حال بروزرسانی موقت است. لطفا دقایقی دیگر تلاش کنید.',
            [7]: 'متن پیامک حاوی کلمات فیلترشده است.',
            [10]: 'کاربر مورد نظر فعال نیست یا پنل پیامکی غیرفعال شده است.',
            [11]: 'ارسال انجام نشد؛ شماره گیرنده در لیست سیاه مخابرات است.',
            [12]: 'مدارک احراز هویت کاربری در پنل ملی‌پیامک کامل نیست و پنل مسدود است.',
            [14]: 'متن ارسالی حاوی لینک اینترنتی است که در این خط مجاز نیست.',
            [15]: 'در پیام‌های چندگیرنده، عبارت لغو در انتهای متن نوشته نشده است.',
            [16]: 'شماره موبایل گیرنده یافت نشد.',
            [17]: 'متن پیامک خالی است یا متغیرها مقدار ندارند.',
            [18]: 'شماره گیرنده نامعتبر است.',
          };

          if (generalErrors[valueNum]) {
            return generalErrors[valueNum];
          }

          return `کد خطا: ${rawVal} (RetStatus: ${status || 'نامشخص'}, StrRetStatus: ${rawStatusStr || 'نامشخص'})`;
        };

        const errMsg = getErrorMessage(numericVal, retStatus, val, strRetStatus);
        return NextResponse.json({ error: `خطا در ارسال پیامک تستی: ${errMsg}` }, { status: 400 });
      }

    } else if (prov === 'smsir') {
      const apiKey = credentials?.apiKey;

      if (apiKey && apiKey !== '********') {
        finalApiKey = apiKey;
      } else if (existingCreds.apiKey) {
        finalApiKey = decrypt(existingCreds.apiKey);
      }

      if (!finalApiKey) {
        return NextResponse.json({ error: 'کلید وب‌سرویس (API Key) وارد نشده است' }, { status: 400 });
      }

      const targetPhone = normalizePhone(testPhone);
      
      const parameters = [
        { name: 'customerName', value: 'کاربر تست' },
        { name: 'orderNumber', value: 'TEST1234' },
        { name: 'totalAmount', value: '۱۰,۰۰۰' },
        { name: 'trackingCode', value: '123456789012' },
        { name: 'storeName', value: settings?.shopName || 'فروشگاه تست' },
        { name: 'code', value: '12345' }
      ];

      console.log(`[INFO] [TestSMS]: Sending SMS.ir test SMS to ${targetPhone} with templateId ${patternCode}`);

      const response = await fetch('https://api.sms.ir/v1/send/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          'x-api-key': finalApiKey
        },
        body: JSON.stringify({
          mobile: targetPhone,
          templateId: Number(patternCode),
          parameters: parameters
        })
      });

      if (!response.ok) {
        throw new Error(`SMS.ir HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[INFO] [TestSMS]: SMS.ir response:`, result);

      if (result?.status === 1) {
        return NextResponse.json({ success: true, messageId: String(result?.data?.messageId || 'sent') });
      } else {
        return NextResponse.json({ error: result?.message || 'خطا در ارسال پیامک تستی از طریق SMS.ir' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'ارائه‌دهنده نامعتبر است' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[ERROR] [TestSmsRoute]: Exception in route |', error);
    return NextResponse.json({ error: error?.message || 'خطای سرور در ارسال پیامک تستی' }, { status: 500 });
  }
}

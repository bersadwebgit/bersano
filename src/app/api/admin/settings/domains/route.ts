import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { Invalidate } from '@/lib/invalidate';
import dns from 'dns';

// Helper to generate verification token
function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'shop-verify-';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Target A record IP and CNAME for the platform
const TARGET_IP = '185.204.197.80';
const TARGET_CNAME = 'za4.localhost';

export async function GET(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const domains = await prisma.shopDomain.findMany({
      where: { shopId: user.shopId as string },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch active package settings for the shop to check if customDomain is allowed
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
        console.error("Error parsing package features:", e);
      }
    }

    const customDomainEnabled = packageFeatures ? !!packageFeatures.customDomainEnabled : false;
    const maxDomains = packageFeatures ? (packageFeatures.maxDomains || 0) : 0;

    return NextResponse.json({ 
      domains, 
      targetIp: TARGET_IP, 
      targetCname: TARGET_CNAME,
      customDomainEnabled,
      maxDomains
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json({ error: 'خطا در بارگذاری دامنه‌ها' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { domain, verificationType = 'TXT' } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'لطفاً نام دامنه را وارد کنید' }, { status: 400 });
    }

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
        console.error("Error parsing package features:", e);
      }
    }

    if (packageFeatures) {
      // 1. Check if custom domain feature is enabled in the package
      if (!packageFeatures.customDomainEnabled) {
        return NextResponse.json({ 
          error: 'قابلیت اتصال دامنه اختصاصی در پکیج فعلی شما فعال نیست. جهت فعال‌سازی لطفا پکیج اشتراک خود را ارتقا دهید.' 
        }, { status: 403 });
      }

      // 2. Check if maximum domains limit is reached
      const maxDomains = packageFeatures.maxDomains || 0;
      if (maxDomains > 0) {
        const count = await prisma.shopDomain.count({
          where: { shopId: user.shopId as string }
        });
        if (count >= maxDomains) {
          return NextResponse.json({ 
            error: `شما در پکیج فعلی خود حداکثر مجاز به ثبت ${maxDomains} دامنه اختصاصی هستید. جهت اتصال دامنه‌های بیشتر، پکیج خود را ارتقا دهید.` 
          }, { status: 403 });
        }
      }
    }

    // Sanitize domain (remove http://, https://, trailing slashes, spaces)
    let sanitizedDomain = domain.toLowerCase().trim()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/$/, '');

    if (!sanitizedDomain) {
      return NextResponse.json({ error: 'فرمت دامنه نامعتبر است' }, { status: 400 });
    }

    // Check regex validation for domain names
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,10}$/;
    if (!domainRegex.test(sanitizedDomain)) {
      return NextResponse.json({ error: 'فرمت دامنه نامعتبر است. نمونه صحیح: domain.com' }, { status: 400 });
    }

    // Check if domain is already registered on the platform
    const existing = await prisma.shopDomain.findFirst({
      where: { domain: sanitizedDomain },
    });

    if (existing) {
      if (existing.shopId === user.shopId) {
        return NextResponse.json({ error: 'این دامنه قبلاً توسط خود شما ثبت شده است' }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: 'این دامنه قبلاً توسط فروشگاه دیگری ثبت شده است. در صورت نیاز به اثبات مالکیت، با پشتیبانی تماس بگیرید.' 
        }, { status: 400 });
      }
    }

    // Generate unique verification token
    const token = generateToken();

    // Create the domain entry
    const newDomain = await prisma.shopDomain.create({
      data: {
        shopId: user.shopId as string,
        domain: sanitizedDomain,
        verificationType,
        verificationToken: token,
        isVerified: false,
        isPrimary: false,
        sslStatus: 'pending',
      },
    });

    return NextResponse.json({ success: true, domain: newDomain });
  } catch (error) {
    console.error('Error adding domain:', error);
    return NextResponse.json({ error: 'خطا در ثبت دامنه جدید' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { url } = request;
    const urlObj = new URL(url);
    const domainId = urlObj.searchParams.get('id');

    if (!domainId) {
      return NextResponse.json({ error: 'شناسه دامنه ارسال نشده است' }, { status: 400 });
    }

    // Find domain to make sure it belongs to the active shop
    const shopDomain = await prisma.shopDomain.findFirst({
      where: { id: domainId, shopId: user.shopId as string },
    });

    if (!shopDomain) {
      return NextResponse.json({ error: 'دامنه مورد نظر یافت نشد' }, { status: 404 });
    }

    // Delete domain
    await prisma.shopDomain.delete({
      where: { id: domainId },
    });

    // If it was the primary domain, clear it from ShopSettings as well
    if (shopDomain.isPrimary) {
      await prisma.shopSettings.update({
        where: { shopId: user.shopId as string },
        data: { customDomain: null },
      });
      await Invalidate.shopSettings(user.shopId as string);
    }

    return NextResponse.json({ success: true, message: 'دامنه با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json({ error: 'خطا در حذف دامنه' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id, action, redirectWww } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'شناسه دامنه ارسال نشده است' }, { status: 400 });
    }

    // Find domain first
    const shopDomain = await prisma.shopDomain.findFirst({
      where: { id, shopId: user.shopId as string },
    });

    if (!shopDomain) {
      return NextResponse.json({ error: 'دامنه یافت نشد' }, { status: 404 });
    }

    if (action === 'toggle_redirect') {
      const updated = await prisma.shopDomain.update({
        where: { id },
        data: { redirectWww: !!redirectWww },
      });
      return NextResponse.json({ success: true, domain: updated });
    }

    if (action === 'verify') {
      // Step 1: Query DNS TXT/CNAME records to check ownership verification
      let verified = false;
      let checkError = '';

      try {
        const dnsResolver = new dns.promises.Resolver();
        // Use standard public DNS servers for validation (e.g. Cloudflare, Google) to avoid local caching
        dnsResolver.setServers(['1.1.1.1', '8.8.8.8']);

        if (shopDomain.verificationType === 'TXT') {
          // Look up TXT records on the domain
          try {
            const txtRecords = await dnsResolver.resolveTxt(shopDomain.domain);
            // Flattens the array of string arrays and checks for the token
            const flatTxt = txtRecords.flat();
            verified = flatTxt.some(record => record.includes(shopDomain.verificationToken));
            if (!verified) {
              checkError = `رکورد TXT یافت نشد یا مقدار آن با کد تأیید مطابقت ندارد. مقادیر یافت‌شده: [${flatTxt.join(', ')}]`;
            }
          } catch (e: any) {
            checkError = `خطا در دریافت رکوردهای TXT: ${e.code || e.message || 'خطای نامشخص'}`;
          }
        } else {
          // Look up CNAME verification
          try {
            const cnameRecord = `shop-verify.${shopDomain.domain}`;
            const cnames = await dnsResolver.resolveCname(cnameRecord);
            verified = cnames.some(c => c.toLowerCase().includes('localhost') || c.toLowerCase().includes('za4'));
            if (!verified) {
              checkError = `رکورد CNAME برای shop-verify.${shopDomain.domain} یافت نشد یا به سرور ما اشاره نمی‌کند.`;
            }
          } catch (e: any) {
            checkError = `خطا در دریافت رکوردهای CNAME: ${e.code || e.message || 'خطای نامشخص'}`;
          }
        }
      } catch (dnsErr: any) {
        console.error('DNS Verification Error:', dnsErr);
        checkError = 'خطای اتصال به DNS سرور';
      }

      // Step 2: Query DNS A or CNAME record to check if it points to our platform (DNS Propagation check)
      let pointsToPlatform = false;
      let propagationError = '';
      try {
        const dnsResolver = new dns.promises.Resolver();
        dnsResolver.setServers(['1.1.1.1', '8.8.8.8']);

        const isSubdomain = shopDomain.domain.split('.').length > 2;
        if (isSubdomain) {
          try {
            const cnames = await dnsResolver.resolveCname(shopDomain.domain);
            pointsToPlatform = cnames.some(c => c.toLowerCase().includes(TARGET_CNAME.toLowerCase()) || c.toLowerCase().includes('localhost'));
            if (!pointsToPlatform) {
              propagationError = `رکورد CNAME دامنه به ${TARGET_CNAME} اشاره نمی‌کند. مقدار فعلی: ${cnames.join(', ')}`;
            }
          } catch {
            // Fallback: check A record for subdomain if CNAME lookup fails (some use A records for subdomains)
            try {
              const ips = await dnsResolver.resolve4(shopDomain.domain);
              pointsToPlatform = ips.includes(TARGET_IP);
              if (!pointsToPlatform) {
                propagationError = `رکورد A دامنه به آی‌پی ${TARGET_IP} اشاره نمی‌کند. مقدار فعلی: ${ips.join(', ')}`;
              }
            } catch (e: any) {
              propagationError = `دسترسی به رکوردهای DNS مقدور نبود. خطای سیستم: ${e.code || e.message}`;
            }
          }
        } else {
          // Root domain must use A record
          try {
            const ips = await dnsResolver.resolve4(shopDomain.domain);
            pointsToPlatform = ips.some(ip => ip === TARGET_IP || ip === '127.0.0.1' || ip.startsWith('192.168'));
            if (!pointsToPlatform) {
              propagationError = `رکورد A دامنه به آی‌پی ${TARGET_IP} اشاره نمی‌کند. رکوردهای یافت شده: [${ips.join(', ')}]`;
            }
          } catch (e: any) {
            propagationError = `خطا در دریافت رکورد A دامنه: ${e.code || e.message || 'خطای نامشخص'}`;
          }
        }
      } catch (dnsErr) {
        propagationError = 'تأخیر در انتشار DNS (Propagation Delay). لطفاً تا ۲۴ ساعت آینده مجدداً تلاش کنید.';
      }

      // Let's encrypt SSL/TLS Mocking / Issuance
      // In a real SaaS, this would call a Caddy / Nginx / Traefik API, or Cloudflare SaaS SSL endpoint.
      // We will simulate it elegantly: if DNS points to platform, SSL will be successfully issued!
      let sslStatus = shopDomain.sslStatus;
      let sslExpiresAt = shopDomain.sslExpiresAt;
      if (pointsToPlatform) {
        sslStatus = 'active';
        // Set expiry to 90 days from now (Let's Encrypt standard)
        sslExpiresAt = new Date();
        sslExpiresAt.setDate(sslExpiresAt.getDate() + 90);
      } else {
        sslStatus = 'failed';
      }

      const updatedDomain = await prisma.shopDomain.update({
        where: { id },
        data: {
          isVerified: verified,
          sslStatus: sslStatus,
          sslExpiresAt: sslExpiresAt,
        },
      });

      return NextResponse.json({
        success: verified && pointsToPlatform,
        verified,
        pointsToPlatform,
        domain: updatedDomain,
        checkError,
        propagationError,
        sslStatus
      });
    }

    if (action === 'set_primary') {
      if (!shopDomain.isVerified) {
        return NextResponse.json({ error: 'ابتدا باید مالکیت دامنه را تایید کنید' }, { status: 400 });
      }

      // Reset primary for all other domains of this shop
      await prisma.shopDomain.updateMany({
        where: { shopId: user.shopId as string },
        data: { isPrimary: false },
      });

      // Set this domain as primary
      const updated = await prisma.shopDomain.update({
        where: { id },
        data: { isPrimary: true },
      });

      // Update ShopSettings with the primary custom domain
      await prisma.shopSettings.update({
        where: { shopId: user.shopId as string },
        data: { customDomain: shopDomain.domain },
      });

      await Invalidate.shopSettings(user.shopId as string);

      return NextResponse.json({ success: true, domain: updated });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error) {
    console.error('Error patching domain:', error);
    return NextResponse.json({ error: 'خطا در ویرایش تنظیمات دامنه' }, { status: 500 });
  }
}

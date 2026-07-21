import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getTenantShop } from '@/lib/tenant';
import CustomerRegisterClient from '@/components/auth/CustomerRegisterClient';
import MerchantRegisterClient from '@/components/auth/MerchantRegisterClient';
import { buildMarketingMetadata, noindexMetadata } from '@/lib/marketing-seo';

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop(undefined, true);
  if (shop) {
    // Tenant customer sign-up: avoid indexing duplicate auth pages across shops.
    return noindexMetadata('ثبت‌نام');
  }
  return buildMarketingMetadata({
    title: 'ساخت فروشگاه اینترنتی رایگان',
    description:
      'در چند دقیقه فروشگاه آنلاین خود را روی برسانا بسازید؛ بدون دانش فنی و با دستیار هوشمند فارسی. همین حالا رایگان شروع کنید.',
    path: '/register',
  });
}

export default async function RegisterPage() {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const shop = await getTenantShop(host, true);

  if (shop) {
    const settings = shop.shopId 
      ? { shopName: shop.shopName } 
      : { shopName: 'فروشگاه تستی' };

    return <CustomerRegisterClient shopName={settings.shopName} />;
  }

  return <MerchantRegisterClient />;
}

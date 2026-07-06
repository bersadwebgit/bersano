import { headers } from 'next/headers';
import { getTenantShop } from '@/lib/tenant';
import CustomerLoginClient from '@/components/auth/CustomerLoginClient';
import MerchantLoginClient from '@/components/auth/MerchantLoginClient';

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const shop = await getTenantShop(host, true);

  if (shop) {
    const settings = shop.shopId 
      ? { shopName: shop.shopName } 
      : { shopName: 'فروشگاه تستی' };

    return <CustomerLoginClient shopName={settings.shopName} />;
  }

  return <MerchantLoginClient />;
}

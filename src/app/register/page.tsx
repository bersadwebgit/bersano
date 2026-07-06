import { headers } from 'next/headers';
import { getTenantShop } from '@/lib/tenant';
import CustomerRegisterClient from '@/components/auth/CustomerRegisterClient';
import MerchantRegisterClient from '@/components/auth/MerchantRegisterClient';

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

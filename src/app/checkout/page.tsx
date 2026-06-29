import { getTenantShop } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getFooterConfig } from '@/app/actions/footer';
import CheckoutClient from './CheckoutClient';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function CheckoutPage() {
  const shop = await getTenantShop();
  if (!shop) return notFound();

  const [categories, menuItems, settings] = await Promise.all([
    prisma.category.findMany({
      where: { shopId: shop.shopId, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.menuItem.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { order: 'asc' }
    }),
    prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { headerConfig: true }
    })
  ]);

  let headerConfig = undefined;
  const footerConfig = await getFooterConfig();
  if (settings?.headerConfig) {
    try { headerConfig = JSON.parse(settings.headerConfig); } catch (e) {}
  }

  // Fetch user addresses if logged in
  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  const token = customerToken;
  
  let addresses: any[] = [];
  
  if (token) {
    try {
      const verified = await jwtVerify(token, key);
      const payload = verified.payload;
      
      // Verify user exists and is not blocked
      const user = await prisma.user.findFirst({
        where: { 
          id: payload.id as string,
          shopId: payload.shopId as string
        },
        select: { id: true, isBlocked: true, shopId: true }
      });

      if (user && !user.isBlocked) {
        const dbAddresses = await prisma.address.findMany({
          where: { 
            userId: user.id,
            shopId: user.shopId
          },
          orderBy: { createdAt: 'desc' }
        });
        
        addresses = dbAddresses.map((address, index) => ({
          id: address.id,
          title: address.title,
          receiver: address.receiver,
          phone: address.phone,
          province: address.state,
          city: address.city,
          street: address.street || address.address,
          plaque: address.plaque || '',
          unit: address.unit || '',
          postalCode: address.zipCode || '',
          isDefault: index === 0,
        }));
      }
    } catch (err) {
      // Ignore token errors
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-40 md:pb-0">
      <Header 
        shopName={shop.shopName} 
        logoUrl={shop.logoUrl} 
        menuItems={menuItems.map(item => ({
          id: item.id, title: item.title, url: item.url, color: item.color, icon: item.icon
        }))}
        categories={categories.map(cat => ({
          id: cat.id, name: cat.name, slug: cat.slug, icon: cat.icon, parentId: cat.parentId, children: cat.children
        }))}
        config={headerConfig}
      />
      <CheckoutClient initialAddresses={addresses} />
      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />
    </div>
  );
}

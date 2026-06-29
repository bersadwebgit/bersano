import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { FileDown, Calendar, User as UserIcon, HardDrive, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { canAccessAdminPage, isAdminRole } from '@/lib/admin-roles';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function AdminDownloadsReportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/admin/login');
  }

  let decoded;
  try {
    const verified = await jwtVerify(token, key);
    decoded = verified.payload;
  } catch (err) {
    redirect('/admin/login');
  }

  const role = decoded.role as string;
  if (!isAdminRole(role) || !decoded.shopId || !canAccessAdminPage(role, '/admin/downloads')) {
    redirect('/admin/login');
  }

  // 1. Fetch all download tokens for this shop
  const downloadTokens = await prisma.downloadToken.findMany({
    where: { shopId: decoded.shopId as string },
    orderBy: { createdAt: 'desc' }
  });

  // 2. Fetch associated products and users to enrich the list
  const productIds = Array.from(new Set(downloadTokens.map(d => d.productId)));
  const userIds = Array.from(new Set(downloadTokens.map(d => d.userId)));

  const [products, users] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, fileFormat: true, fileSize: true }
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    })
  ]);

  // 3. Map tokens to display format
  const reports = downloadTokens.map(token => {
    const product = products.find(p => p.id === token.productId);
    const user = users.find(u => u.id === token.userId);

    const isExpired = token.expiresAt ? token.expiresAt < new Date() : false;
    const isLimitReached = token.maxDownloads && token.maxDownloads > 0 ? token.downloadCount >= token.maxDownloads : false;

    return {
      id: token.id,
      token: token.token,
      orderId: token.orderId,
      downloadCount: token.downloadCount,
      maxDownloads: token.maxDownloads || 0,
      lastIp: token.lastIp || '-',
      createdAt: new Date(token.createdAt).toLocaleDateString('fa-IR'),
      expiresAt: token.expiresAt ? new Date(token.expiresAt).toLocaleDateString('fa-IR') : 'نامحدود',
      isExpired,
      isLimitReached,
      productTitle: product?.title || 'کالای حذف شده',
      productFormat: product?.fileFormat || 'نامشخص',
      customerName: user?.name || 'مشتری نامشخص',
      customerEmail: user?.email || 'ایمیل نامشخص'
    };
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileDown className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          گزارش دانلودهای خریداران
        </h1>
        <p className="text-xs text-gray-500 mt-1">مانیتورینگ و آمار دانلود محصولات دیجیتال به تفکیک خریدار</p>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-2xl border border-gray-150 dark:border-gray-800 overflow-hidden">
        {reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-150 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <th className="p-4">خریدار</th>
                  <th className="p-4">محصول</th>
                  <th className="p-4">شناسه سفارش</th>
                  <th className="p-4">دفعات دانلود</th>
                  <th className="p-4">آخرین IP دانلود</th>
                  <th className="p-4">تاریخ ثبت</th>
                  <th className="p-4">تاریخ انقضا</th>
                  <th className="p-4">وضعیت لینک</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{r.customerName}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{r.customerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-purple-50 dark:bg-purple-950/20 rounded font-bold text-[10px] text-purple-600 dark:text-purple-400 uppercase">
                          {r.productFormat}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1 max-w-[180px]" title={r.productTitle}>
                          {r.productTitle}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold tracking-wider text-gray-400 dark:text-gray-500">
                      {r.orderId.slice(-8).toUpperCase()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-gray-900 dark:text-white">{r.downloadCount}</span>
                        <span className="text-gray-400 font-normal">/</span>
                        <span className="text-gray-400 font-normal">
                          {r.maxDownloads > 0 ? `${r.maxDownloads}` : '∞'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      {r.lastIp}
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">
                      {r.createdAt}
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">
                      {r.expiresAt}
                    </td>
                    <td className="p-4">
                      {r.isExpired ? (
                        <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          منقضی شده
                        </span>
                      ) : r.isLimitReached ? (
                        <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          اتمام حد دانلود
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          فعال
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <HardDrive className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <div className="font-bold text-gray-500 dark:text-gray-400">سوابق دانلودی یافت نشد</div>
            <p className="text-[11px] text-gray-400 mt-1">تاکنون تراکنشی برای خرید محصولات دانلودی ثبت نشده است.</p>
          </div>
        )}
      </div>
    </div>
  );
}

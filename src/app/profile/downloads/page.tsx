import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FileDown, Download, AlertCircle, RefreshCw } from 'lucide-react';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function DownloadsPage() {
  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  const token = customerToken;
  
  if (!token) {
    redirect('/login');
  }

  let payload;
  try {
    const verified = await jwtVerify(token, key);
    payload = verified.payload;
  } catch (err) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { 
      id: payload.id as string,
      shopId: payload.shopId as string
    }
  });

  if (!user) {
    redirect('/login');
  }

  // Fetch real download tokens from database
  const dbDownloads = await prisma.downloadToken.findMany({
    where: { 
      userId: user.id,
      shopId: user.shopId
    },
    orderBy: { createdAt: 'desc' }
  });

  const productIds = dbDownloads.map(d => d.productId);
  const products = await prisma.product.findMany({
    where: { 
      id: { in: productIds },
      shopId: user.shopId
    }
  });

  // Map to format for presentation
  const downloads = dbDownloads.map(d => {
    const product = products.find(p => p.id === d.productId);
    
    // Parse additional files list
    let filesList: { name: string; url: string; size?: string; format?: string }[] = [];
    if (product?.downloadFiles) {
      try {
        const parsed = JSON.parse(product.downloadFiles);
        if (Array.isArray(parsed)) {
          filesList = parsed;
        }
      } catch (err) {
        console.error('Failed to parse downloadFiles JSON for profile downloads page:', err);
      }
    }

    return {
      id: d.id,
      token: d.token,
      productId: d.productId,
      productTitle: product?.title || 'کالای حذف شده',
      productImage: product?.imageUrl || '/placeholder.png',
      fileSize: product?.fileSize || 'مشخص نشده',
      fileFormat: product?.fileFormat || 'نامشخص',
      downloadCount: d.downloadCount,
      maxDownloads: d.maxDownloads || 0,
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('fa-IR') : null,
      isExpired: d.expiresAt ? d.expiresAt < new Date() : false,
      isLimitReached: d.maxDownloads && d.maxDownloads > 0 ? d.downloadCount >= d.maxDownloads : false,
      filesList
    };
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileDown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            دانلودهای من
          </h1>
          <p className="text-xs text-slate-500 mt-1">لیست تمام فایل‌ها و لایسنس‌های خریداری شده شما</p>
        </div>
      </div>

      {downloads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {downloads.map((d) => {
            const isDisabled = d.isExpired || d.isLimitReached;
            return (
              <div 
                key={d.id} 
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden"
              >
                {/* Visual decoration */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 rounded-r-lg group-hover:bg-purple-600 transition-colors" />

                <div>
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 shrink-0">
                      <Image 
                        src={d.productImage} 
                        alt={d.productTitle} 
                        fill 
                        className="object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1.5" title={d.productTitle}>
                        {d.productTitle}
                      </h2>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {d.fileFormat && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold">
                            {d.fileFormat}
                          </span>
                        )}
                        {d.fileSize && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                            {d.fileSize}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Files List - Rendered if multiple files are available */}
                {d.filesList && d.filesList.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">لیست فایل‌های موجود در این پکیج:</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pl-1">
                      {d.filesList.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/40 text-[11px]">
                          <div className="min-w-0 flex-1 pl-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              {file.format || 'ZIP'} • {file.size || 'مشخص نشده'}
                            </span>
                          </div>
                          {isDisabled ? (
                            <button disabled className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg font-bold text-[10px] shrink-0 cursor-not-allowed">
                              غیرفعال
                            </button>
                          ) : (
                            <a 
                              href={`/api/downloads/${d.token}?fileIndex=${idx}`}
                              download
                              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 dark:text-purple-300 rounded-lg font-bold text-[10px] shrink-0 transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              دانلود
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 space-y-2.5 text-xs border-t border-slate-50 dark:border-slate-800/50 pt-4 text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>دفعات دانلود شده:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {d.maxDownloads > 0 ? `${d.downloadCount} از ${d.maxDownloads} بار مجاز` : `${d.downloadCount} بار`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>وضعیت لینک:</span>
                      {d.isExpired ? (
                        <span className="text-red-500 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          منقضی شده
                        </span>
                      ) : d.isLimitReached ? (
                        <span className="text-red-500 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          پایان حد دانلود
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                          فعال و معتبر
                        </span>
                      )}
                    </div>

                    {d.expiresAt && (
                      <div className="flex justify-between items-center">
                        <span>تاریخ انقضای دانلود:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{d.expiresAt}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-800/30 flex gap-3">
                  <Link 
                    href={`/product/${d.productId}`}
                    className="flex-1 text-center py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    صفحه کالا
                  </Link>

                  {isDisabled ? (
                    <button 
                      disabled
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-not-allowed"
                    >
                      <AlertCircle className="w-4 h-4" />
                      غیرفعال شده
                    </button>
                  ) : d.filesList && d.filesList.length > 0 ? (
                    /* Show a message to download from files list above if there are multiple files */
                    <button 
                      disabled
                      className="flex-1 py-2.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-default"
                    >
                      دانلود فایل‌ها از لیست بالا
                    </button>
                  ) : (
                    <a 
                      href={`/api/downloads/${d.token}`}
                      download
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      دانلود فوری
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center rounded-3xl">
          <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileDown className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">لیست دانلودهای شما خالی است</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            شما هنوز هیچ محصول دانلودی خریداری نکرده‌اید یا لینک دانلودی برای شما صادر نشده است. پس از خرید هرگونه فایل آموزشی یا دیجیتال، لینک دانلود امن آن در این بخش ظاهر خواهد شد.
          </p>
          <Link href="/" className="inline-block mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors">
            مشاهده فروشگاه کالاها
          </Link>
        </div>
      )}
    </div>
  );
}

import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://bersana.ir'),
  title: 'مدیریت کل سیستم',
  description: 'پنل مدیریت کل سیستم فروشگاه ساز',
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {children}
    </div>
  );
}

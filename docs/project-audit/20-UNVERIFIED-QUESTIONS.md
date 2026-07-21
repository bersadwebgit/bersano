# 20 — موارد Unverified / نیازمند تأیید

1. روش ایجاد schema پایه (db push در برابر migrations حذف‌شده) و استراتژی baseline production.
2. پیکربندی واقعی nginx/TLS/DNS روی سرور (خارج از repo).
3. اینکه آیا `prisma` client در همه مسیرها از tenant extension استفاده می‌کند (`src/lib/prisma.ts`).
4. عمق واقعی یکپارچگی Mahak accounting در runtime.
5. پوشش کامل sanitize برای همه HTMLهای AI-rendered.
6. محدودیت اندازه/MIME تک‌تک upload handlers.
7. آیا HNSW index در migration RAG بدون `CONCURRENTLY`/no-transaction روی production بدون lock مشکل ساخته است.
8. استفاده عملیاتی SMS.ir در برابر Melipayamak.
9. مصرف واقعی پکیج `three` در UI.
10. اینکه آیا `NEXTAUTH_*` هنوز جایی خوانده می‌شود (جستجوی اولیه: بیشتر example).
11. رفتار دقیق `docker-entrypoint.sh` در برابر migrate failures.
12. آیا همه مسیرهای `tenant-public?` واقعاً shopId را از host می‌گیرند نه از body.
13. نرخ و پایداری صف فایل‌محور در چند replica.
14. صحت کامل streaming از gateway در همه کلاینت‌ها (جز test-gateway).
15. وضعیت commit ahead-of-origin و محتوای آن نسبت به این ممیزی docs.
16. آیا بک‌دور سوپرادمین در همه محیط‌های deploy هنوز reachable است (نیاز تأیید runtime، نه فقط کد).
17. عمق واقعی همگام‌سازی Mahak — اکتشاف: UI/stub بدون HTTP sync client کامل.

هر مورد باید قبل از ادعای «production ready» بسته شود.

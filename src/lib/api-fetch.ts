export function normalizeApiPath(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path.replace(/^\/+/, '')}`;
}

export async function readJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        res.ok
          ? 'پاسخ سرور نامعتبر بود. لطفاً صفحه را رفرش کنید.'
          : `خطای سرور (${res.status}). مسیر API یافت نشد یا سرویس در دسترس نیست.`
      );
    }
    throw new Error('پاسخ سرور قابل پردازش نبود.');
  }
}

export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ res: Response; data: T }> {
  const res = await fetch(input, init);
  const data = await readJsonResponse<T>(res);
  return { res, data };
}

/**
 * [AI-OPTIMIZED] Shared OpenRouter fetch utility with retry and exponential backoff.
 */

export async function openRouterFetch(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];
  let lastError: any = null;

  const finalTimeout = Math.min(Math.max(timeoutMs, 1000), 60000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, finalTimeout);

    try {
      // Merge signals if options.signal exists
      let signal = controller.signal;
      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort();
        }
        options.signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(url, {
        ...options,
        signal,
      });

      if (response.ok) {
        return response;
      }

      const status = response.status;

      // Do not retry 400, 401, 403
      if (status === 400 || status === 401 || status === 403) {
        return response;
      }

      if (status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        let waitTime = delays[attempt - 1] || 1000;
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds)) {
            waitTime = Math.min(parsedSeconds * 1000, 10000); // Safe max delay of 10s
          } else {
            const parsedDate = Date.parse(retryAfterHeader);
            if (!isNaN(parsedDate)) {
              waitTime = Math.min(Math.max(0, parsedDate - Date.now()), 10000); // Safe max delay of 10s
            }
          }
        }
        console.warn(`[OpenRouter] Rate limited (429). Waiting ${waitTime}ms before retry (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (status >= 500 && status < 600) {
        const waitTime = delays[attempt - 1] || 1000;
        console.warn(`[OpenRouter] Server error (${status}). Waiting ${waitTime}ms before retry (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      if (isTimeout) {
        lastError = new Error(`Request timed out after ${finalTimeout}ms`);
      } else {
        lastError = error;
      }

      console.error(`[OpenRouter] Fetch error on attempt ${attempt}/${maxAttempts}:`, lastError.message || lastError);

      if (attempt < maxAttempts) {
        const waitTime = delays[attempt - 1] || 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError) {
    const sanitizedMsg = lastError.message ? lastError.message.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••') : 'OpenRouter fetch failed';
    throw new Error(sanitizedMsg);
  }

  throw new Error('OpenRouter fetch failed after maximum attempts');
}

export async function parseOpenRouterJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed || trimmed.startsWith('<')) {
    throw new Error(
      `OpenRouter returned non-JSON response (status ${response.status}): ${trimmed.slice(0, 160)}`
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch (error: any) {
    throw new Error(`OpenRouter JSON parse error: ${error?.message || 'invalid JSON'}`);
  }
}

export function getIranDateTime() {
  const now = new Date();
  
  // Format Gregorian date in Iran timezone
  const gregorianDate = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format Jalali date in Iran timezone
  const jalaliDate = now.toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format current time in Iran timezone (Persian digits)
  const time = now.toLocaleTimeString('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Format current time in Iran timezone (English digits)
  const timeEn = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    gregorianDate,
    jalaliDate,
    time,
    timeEn
  };
}

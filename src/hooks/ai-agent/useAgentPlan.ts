import { useState, useCallback, useRef, useEffect } from 'react';

export function useAgentPlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const generatePlan = useCallback(async (prompt: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai-agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal,
      });

      const resData = await response.json();
      if (isMounted.current) {
        if (resData.success) {
          setData(resData.data);
        } else {
          setError(resData.error?.message || 'خطا در تولید طرح تغییرات.');
        }
      }
    } catch (err: any) {
      if (isMounted.current && err.name !== 'AbortError') {
        setError(err.message || 'خطای شبکه در ارتباط با هوش مصنوعی.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return { generatePlan, loading, error, data, plan: data };
}

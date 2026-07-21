import { useState, useCallback, useRef, useEffect } from 'react';

export function useAgentHistory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai-agent/changes');
      const resData = await response.json();
      if (isMounted.current) {
        if (resData.success) {
          setHistory(resData.data?.changeSets || []);
        } else {
          setError(resData.error?.message || 'خطا در دریافت تاریخچه.');
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'خطای شبکه در دریافت تاریخچه.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return { fetchHistory, loading, error, history };
}

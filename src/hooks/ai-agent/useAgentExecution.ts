import { useState, useCallback, useRef, useEffect } from 'react';

export function useAgentExecution() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const executePlan = useCallback(async (changeSetId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/ai-agent/changes/${changeSetId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const resData = await response.json();
      if (isMounted.current) {
        if (resData.success) {
          setData(resData.data);
        } else {
          setError(resData.error?.message || 'خطا در اجرای طرح تغییرات.');
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'خطای شبکه در اجرای طرح.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const rollbackPlan = useCallback(async (changeSetId: string, notes?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/ai-agent/changes/${changeSetId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      const resData = await response.json();
      if (isMounted.current) {
        if (resData.success) {
          setData(resData.data);
        } else {
          setError(resData.error?.message || 'خطا در بازگردانی طرح تغییرات.');
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'خطای شبکه در بازگردانی طرح.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return { executePlan, rollbackPlan, loading, error, data };
}

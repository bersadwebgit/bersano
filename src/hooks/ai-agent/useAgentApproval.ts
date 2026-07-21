import { useState, useCallback, useRef, useEffect } from 'react';

export function useAgentApproval() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const approvePlan = useCallback(async (changeSetId: string, approved: boolean, notes?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const endpoint = `/api/admin/ai-agent/changes/${changeSetId}/${approved ? 'approve' : 'cancel'}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      const resData = await response.json();
      if (isMounted.current) {
        if (resData.success) {
          setSuccess(true);
        } else {
          setError(resData.error?.message || 'خطا در ثبت تاییدیه طرح.');
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'خطای شبکه در ثبت تاییدیه.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return { approvePlan, loading, error, success };
}

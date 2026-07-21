export type ApiSuccess<T> = {
  success: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function serializeError(error: unknown, requestId: string): ApiFailure {
  console.error(`[API Error] Request ${requestId}:`, error);

  if (error && typeof error === 'object' && 'code' in error && 'persianMessage' in error) {
    const err = error as { code: string; persianMessage: string; message: string; status?: number };
    return {
      success: false,
      error: {
        code: err.code,
        message: err.persianMessage,
      },
      requestId,
    };
  }

  const message = error instanceof Error ? error.message : 'خطای ناشناخته در سیستم هوش مصنوعی.';
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'خطای سرور در پردازش هماهنگی دستور. لطفا دوباره تلاش کنید.',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
    },
    requestId,
  };
}

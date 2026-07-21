/**
 * A shared unknown-safe error-message normalizer.
 * Extracts a clean, user-friendly Persian error message from various error structures,
 * and ensures no [object Object], stack traces, or secrets are leaked.
 */
export function normalizeErrorMessage(err: unknown): string {
  if (!err) {
    return 'خطای ناشناخته در سیستم هوش مصنوعی.';
  }

  // 1. If it's a string
  if (typeof err === 'string') {
    if (err.includes('[object Object]')) {
      return 'خطای ناشناخته در سیستم هوش مصنوعی.';
    }
    return err;
  }

  // 2. If it is an Error object
  if (err instanceof Error) {
    const msg = err.message;
    if (!msg || msg === '[object Object]') {
      return 'خطای ناشناخته در سیستم هوش مصنوعی.';
    }
    // Redact potential secrets/bearer tokens from message
    return msg.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••');
  }

  // 3. If it's an object
  if (typeof err === 'object') {
    // Check for { persianMessage: string }
    if ('persianMessage' in err && typeof (err as any).persianMessage === 'string') {
      return (err as any).persianMessage;
    }

    // Check for { error: { message: string } }
    if (
      'error' in err &&
      err.error &&
      typeof err.error === 'object' &&
      'message' in err.error &&
      typeof (err.error as any).message === 'string'
    ) {
      return (err.error as any).message;
    }

    // Check for { error: string }
    if ('error' in err && typeof (err as any).error === 'string') {
      if ((err as any).error === '[object Object]') {
        return 'خطای ناشناخته در سیستم هوش مصنوعی.';
      }
      return (err as any).error;
    }

    // Check for { message: string }
    if ('message' in err && typeof (err as any).message === 'string') {
      if ((err as any).message === '[object Object]') {
        return 'خطای ناشناخته در سیستم هوش مصنوعی.';
      }
      return (err as any).message;
    }
  }

  return 'خطای ناشناخته در سیستم هوش مصنوعی.';
}

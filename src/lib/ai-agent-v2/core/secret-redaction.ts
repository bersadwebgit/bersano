export function redactSecrets(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact API Keys, tokens, etc.
    let redacted = data;
    // Mask sk-or- or any Authorization Bearer keys
    redacted = redacted.replace(/(bearer\s+)([A-Za-z0-9\-_~.+/]+=*)/gi, '$1[REDACTED]');
    redacted = redacted.replace(/(sk-or-v1-[A-Za-z0-9\-_]{16})[A-Za-z0-9\-_]*/gi, '$1[REDACTED]');
    redacted = redacted.replace(/("api_key"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2');
    redacted = redacted.replace(/("password"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2');
    return redacted;
  }

  if (Array.isArray(data)) {
    return data.map(redactSecrets);
  }

  if (typeof data === 'object') {
    const copy = { ...data } as Record<string, unknown>;
    const sensitiveKeys = ['apiKey', 'token', 'password', 'secret', 'authorization', 'api_key'];
    for (const key of Object.keys(copy)) {
      const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
      if (isSensitive) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = redactSecrets(copy[key]);
      }
    }
    return copy;
  }

  return data;
}

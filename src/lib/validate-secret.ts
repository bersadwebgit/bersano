/**
 * Safely validates whether a submitted secret value (API key, token, etc.)
 * should be updated in the database.
 * Handles undefined, empty string, whitespace, and masked placeholder values.
 */
export function shouldUpdateSecret(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '••••••••••••••••') {
    return false;
  }
  return true;
}

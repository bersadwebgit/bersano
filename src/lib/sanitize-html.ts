import DOMPurify from 'isomorphic-dompurify';

/**
 * Mature, allowlist-based HTML sanitizer using isomorphic-dompurify.
 * Uses a strict allowlist for tags and attributes.
 * Blocks style attributes, inline event handlers, javascript/vbscript/data protocols,
 * and completely disallows data:image/svg+xml.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Configure DOMPurify with strict allowlist
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'a', 'img'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'width', 'height', 'target', 'rel'
    ],
    // Strictly allow http, https, mailto, tel, and relative paths starting with /
    // This completely blocks javascript:, vbscript:, and data: protocols (including data:image/svg+xml)
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/)[^&:\/?#]*(?:[.\/]#)?$/i,
    FORBID_TAGS: [
      'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 
      'button', 'select', 'textarea', 'svg', 'math'
    ],
    FORBID_ATTR: ['style'], // completely disallow style attributes
    FORCE_BODY: true,
  });

  // Additional post-processing safety check to ensure no data:image/svg+xml or javascript: can slip through
  if (typeof clean === 'string') {
    const lower = clean.toLowerCase();
    if (lower.includes('data:image/svg+xml') || lower.includes('javascript:') || lower.includes('vbscript:')) {
      return '';
    }
  }

  return clean;
}

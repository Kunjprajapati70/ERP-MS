/**
 * Resolve product image URLs for display in the browser.
 * Absolute http(s) URLs are returned as-is.
 * Relative /uploads paths are prefixed with the API origin.
 */
export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  let origin = apiBase.replace(/\/api\/v1\/?$/, '');
  if (!origin || origin === apiBase) {
    try {
      origin = new URL(apiBase).origin;
    } catch {
      origin = 'http://localhost:5000';
    }
  }
  return imageUrl.startsWith('/') ? `${origin}${imageUrl}` : `${origin}/${imageUrl}`;
}

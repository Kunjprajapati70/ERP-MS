import { resolveApiOrigin } from './apiBase';

/**
 * Resolve product image URLs for display in the browser.
 * Absolute http(s) URLs are returned as-is.
 * Relative /uploads paths are prefixed with the API origin.
 */
export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const origin = resolveApiOrigin();
  return imageUrl.startsWith('/') ? `${origin}${imageUrl}` : `${origin}/${imageUrl}`;
}

/**
 * Resolve the Axios API base. Login lives at POST {base}/auth/login,
 * and the Express app mounts routes at /api/v1.
 *
 * Common misconfig: Vercel VITE_API_BASE_URL = Render origin or .../api
 * which produces "Cannot POST /api/auth/login".
 */
const PRODUCTION_API_BASE = 'https://erp-ms-mwkj.onrender.com/api/v1';

export function resolveApiBaseUrl(raw = import.meta.env.VITE_API_BASE_URL) {
  const value = String(raw || '').trim();
  const isProd = Boolean(import.meta.env.PROD);

  if (!value || (isProd && value.startsWith('/'))) {
    return isProd ? PRODUCTION_API_BASE : '/api/v1';
  }

  let base = value.replace(/\/+$/, '');

  if (/^https?:\/\//i.test(base)) {
    if (/\/api\/v1$/i.test(base)) return base;
    if (/\/api$/i.test(base)) return `${base}/v1`;
    return `${base}/api/v1`;
  }

  return base;
}

export function resolveApiOrigin(apiBase = resolveApiBaseUrl()) {
  const stripped = String(apiBase).replace(/\/api\/v1\/?$/i, '');
  if (stripped && stripped !== apiBase && /^https?:\/\//i.test(stripped)) {
    return stripped;
  }
  try {
    return new URL(apiBase).origin;
  } catch {
    return import.meta.env.PROD ? 'https://erp-ms-mwkj.onrender.com' : 'http://localhost:5000';
  }
}

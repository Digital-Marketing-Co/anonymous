const TRACKING = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid']);

export function normalizeHistoricalUrl(input: string) {
  try {
    const u = new URL(input);
    u.protocol = 'https:';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (TRACKING.has(key)) u.searchParams.delete(key);
    u.pathname = u.pathname.replace(/\/index\.(html?|php)$/i, '/').replace(/\/{2,}/g, '/');
    if (!u.pathname.includes('.') && !u.pathname.endsWith('/')) u.pathname += '/';
    return u.toString();
  } catch { return input; }
}

export function depthOf(input: string) {
  try { return new URL(input).pathname.split('/').filter(Boolean).length; } catch { return 0; }
}

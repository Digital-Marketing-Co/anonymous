import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { normalizeHistoricalUrl } from './url';

export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const WAYBACK_HOSTS = new Set(['web.archive.org','web.archive.org.']);
export function cleanWaybackHtml(html: string) {
  const $ = cheerio.load(html);
  $('#wm-ipp, #wm-ipp-base, #donato, .wb-autocomplete-suggestions, script[src*="archive.org/_static"], link[href*="archive.org/_static"], script[src*="web.archive.org"], iframe[src*="web.archive.org"]').remove();
  $('*[data-wb-translated]').removeAttr('data-wb-translated');
  $('a, img, script, link, iframe, source').each((_, el) => {
    for (const attr of ['href','src','srcset']) {
      const v = $(el).attr(attr);
      if (!v) continue;
      $(el).attr(attr, v.replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_|im_|js_|cs_)?\//, ''));
    }
  });
  return $.html();
}

export function extractSnapshot(html: string, sourceUrl: string) {
  const normalizedHtml = cleanWaybackHtml(html);
  const $ = cheerio.load(normalizedHtml);
  const scriptHosts = new Set<string>(); const iframeHosts = new Set<string>();
  $('script[src]').each((_,el)=>{try{const u=new URL($(el).attr('src')!,sourceUrl); if(!WAYBACK_HOSTS.has(u.hostname)) scriptHosts.add(u.hostname)}catch{}});
  $('iframe[src]').each((_,el)=>{try{const u=new URL($(el).attr('src')!,sourceUrl); if(!WAYBACK_HOSTS.has(u.hostname)) iframeHosts.add(u.hostname)}catch{}});
  $('script,style,noscript,template').remove();
  const visibleText = $('body').text().replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();
  const metadata: Record<string,string> = {};
  $('meta').each((_, el) => {
    const key = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
    const val = $(el).attr('content'); if (key && val) metadata[key.toLowerCase()] = val;
  });
  const title = $('title').first().text().trim() || null;
  const canonicalTag = $('link[rel="canonical"]').attr('href') || null;
  const links = $('a[href]').map((_,el) => ({href: $(el).attr('href')!, anchorText: $(el).text().replace(/\s+/g,' ').trim(), rel: $(el).attr('rel') || null})).get();
  const media = $('img[src],source[src],video[src],audio[src]').map((_,el) => ({url: $(el).attr('src')!, altText: $(el).attr('alt') || null})).get();
  return {
    normalizedHtml,
    visibleText,
    title,
    description: metadata['description'] || metadata['og:description'] || null,
    canonicalTag,
    robots: metadata['robots'] || null,
    language: $('html').attr('lang') || null,
    metadata,
    links,
    media,
    scriptHosts:[...scriptHosts], iframeHosts:[...iframeHosts],
    wordCount: visibleText ? visibleText.split(/\s+/).length : 0,
    rawSha256: sha256(html), htmlSha256: sha256(normalizedHtml), textSha256: sha256(visibleText),
  };
}

export function resolveHref(href:string, base:string){ try { return new URL(href,base).toString(); } catch { return null; } }
export function isInternal(href:string, domain:string){ try { return new URL(href).hostname.replace(/^www\./,'').toLowerCase()===domain.replace(/^www\./,'').toLowerCase(); } catch { return false; } }
export function canonicalIfInternal(href:string, domain:string){ return isInternal(href,domain) ? normalizeHistoricalUrl(href) : null; }

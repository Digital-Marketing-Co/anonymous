export type CdxRow = {
  urlkey: string;
  timestamp: string;
  original: string;
  mimetype: string;
  statuscode: string;
  digest: string;
  length: string;
};

const CDX = 'https://web.archive.org/cdx/search/cdx';

export async function queryCdx(params: Record<string, string | number | boolean>) {
  const url = new URL(CDX);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { 'User-Agent': 'anonymous.cool archival research application/1.0' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Wayback CDX returned ${res.status}`);
  const rows = await res.json() as string[][];
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]]))) as CdxRow[];
}

export async function discoverDomain(domain = 'anonymous.cool', limit = 5000) {
  return queryCdx({
    url: domain,
    matchType: 'domain',
    output: 'json',
    fl: 'urlkey,timestamp,original,mimetype,statuscode,digest,length',
    limit,
    filter: 'statuscode:200',
  });
}

export async function historyForUrl(target: string, limit = 5000) {
  return queryCdx({
    url: target,
    matchType: 'exact',
    output: 'json',
    fl: 'urlkey,timestamp,original,mimetype,statuscode,digest,length',
    limit,
  });
}

export function replayUrl(timestamp: string, original: string, raw = false) {
  return `https://web.archive.org/web/${timestamp}${raw ? 'id_' : ''}/${original}`;
}

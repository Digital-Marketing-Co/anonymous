import { NextRequest, NextResponse } from 'next/server';
import { discoverDomain } from '@/lib/wayback';
import { normalizeHistoricalUrl, depthOf } from '@/lib/url';

export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain') || 'anonymous.cool';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 5000), 50000);
  try {
    const rows = await discoverDomain(domain, limit);
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const canonical = normalizeHistoricalUrl(row.original);
      const g = grouped.get(canonical) || { canonical, originals: new Set<string>(), captures: 0, first: row.timestamp, last: row.timestamp, mimetypes: new Set<string>(), digests: new Set<string>(), depth: depthOf(canonical) };
      g.originals.add(row.original); g.captures++; g.first = g.first < row.timestamp ? g.first : row.timestamp; g.last = g.last > row.timestamp ? g.last : row.timestamp; g.mimetypes.add(row.mimetype); g.digests.add(row.digest);
      grouped.set(canonical, g);
    }
    const urls = [...grouped.values()].map(g => ({...g, originals:[...g.originals], mimetypes:[...g.mimetypes], uniqueDigests:g.digests.size, digests:undefined})).sort((a,b)=>a.canonical.localeCompare(b.canonical));
    return NextResponse.json({ domain, captures: rows.length, canonicalUrls: urls.length, urls });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 });
  }
}

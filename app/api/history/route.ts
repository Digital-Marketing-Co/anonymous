import { NextRequest, NextResponse } from 'next/server';
import { historyForUrl, replayUrl } from '@/lib/wayback';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'url is required' }, { status: 400 });
  try {
    const rows = await historyForUrl(target);
    return NextResponse.json({ url: target, captures: rows.map(r => ({...r, replay: replayUrl(r.timestamp, r.original), raw: replayUrl(r.timestamp, r.original, true)})) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 });
  }
}

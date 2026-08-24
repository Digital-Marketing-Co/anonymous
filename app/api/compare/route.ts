import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { wordDiff } from '@/lib/diff';
export const runtime = 'nodejs';
function normalizeArchiveHtml(html:string){
  const $=cheerio.load(html); $('[id^="wm-ipp"], script[src*="archive.org"], link[href*="archive.org"]').remove();
  return $('body').text().replace(/\s+/g,' ').trim();
}
export async function GET(req: NextRequest){
  const a=req.nextUrl.searchParams.get('a'), b=req.nextUrl.searchParams.get('b');
  if(!a||!b) return NextResponse.json({error:'a and b replay URLs are required'},{status:400});
  try{
    const [ra,rb]=await Promise.all([fetch(a),fetch(b)]);
    if(!ra.ok||!rb.ok) throw new Error(`Snapshot fetch failed (${ra.status}/${rb.status})`);
    const [ha,hb]=await Promise.all([ra.text(),rb.text()]);
    const [ta,tb]=[normalizeArchiveHtml(ha),normalizeArchiveHtml(hb)];
    return NextResponse.json({before:ta,after:tb,diff:wordDiff(ta,tb)});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unknown error'},{status:502});}
}

import { PrismaClient } from '@prisma/client';
import { discoverDomain, replayUrl } from '../lib/wayback';
import { normalizeHistoricalUrl, depthOf } from '../lib/url';
const prisma=new PrismaClient();
const domainName=process.argv[2]||'anonymous.cool';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function parseTs(ts:string){return new Date(`${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}T${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}Z`)}
async function main(){
 const domain=await prisma.domain.upsert({where:{name:domainName},update:{},create:{name:domainName}});
 const rows=await discoverDomain(domainName,150000);
 console.log(`Discovered ${rows.length} capture rows`);
 let i=0;
 for(const row of rows){
  const canonical=normalizeHistoricalUrl(row.original); const u=new URL(canonical);
  const c=await prisma.canonicalUrl.upsert({where:{url:canonical},update:{lastSeen:parseTs(row.timestamp)},create:{domainId:domain.id,url:canonical,path:u.pathname,depth:depthOf(canonical),firstSeen:parseTs(row.timestamp),lastSeen:parseTs(row.timestamp)}});
  await prisma.urlAlias.upsert({where:{canonicalUrlId_original:{canonicalUrlId:c.id,original:row.original}},update:{},create:{canonicalUrlId:c.id,original:row.original,reason:'Normalized historical alias'}});
  await prisma.snapshot.upsert({where:{canonicalUrlId_timestamp_original:{canonicalUrlId:c.id,timestamp:row.timestamp,original:row.original}},update:{},create:{canonicalUrlId:c.id,timestamp:row.timestamp,capturedAt:parseTs(row.timestamp),original:row.original,mimeType:row.mimetype,statusCode:Number(row.statuscode)||null,digest:row.digest,byteLength:Number(row.length)||null,replayUrl:replayUrl(row.timestamp,row.original),rawReplayUrl:replayUrl(row.timestamp,row.original,true)}});
  if(++i%250===0){console.log(`${i}/${rows.length}`);await sleep(350);}
 }
 console.log('Metadata ingestion complete. Deep snapshot retrieval is intentionally separate and resumable.');
}
main().finally(()=>prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import { discoverDomain,replayUrl,parseWaybackTimestamp } from '../lib/wayback';
import { normalizeHistoricalUrl,depthOf,parentPathOf,aliasReason } from '../lib/url';
const prisma=new PrismaClient(); const domainName=process.argv[2]||'anonymous.cool'; const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const domain=await prisma.domain.upsert({where:{name:domainName},update:{},create:{name:domainName}});
 const job=await prisma.crawlJob.create({data:{domainId:domain.id,kind:'CDX_METADATA',status:'RUNNING',startedAt:new Date()}});
 try{
  const rows=await discoverDomain(domainName,200000);await prisma.crawlJob.update({where:{id:job.id},data:{total:rows.length}});console.log(`Discovered ${rows.length} capture rows`);
  let i=0;
  for(const row of rows){
   const canonical=normalizeHistoricalUrl(row.original);let u:URL;try{u=new URL(canonical)}catch{continue} const seen=parseWaybackTimestamp(row.timestamp);
   const existing=await prisma.canonicalUrl.findUnique({where:{url:canonical},select:{id:true,firstSeen:true,lastSeen:true}});
   const c=existing?await prisma.canonicalUrl.update({where:{id:existing.id},data:{firstSeen:!existing.firstSeen||seen<existing.firstSeen?seen:existing.firstSeen,lastSeen:!existing.lastSeen||seen>existing.lastSeen?seen:existing.lastSeen}}):await prisma.canonicalUrl.create({data:{domainId:domain.id,url:canonical,path:u.pathname,parentPath:parentPathOf(canonical),depth:depthOf(canonical),firstSeen:seen,lastSeen:seen}});
   const alias=await prisma.urlAlias.findUnique({where:{canonicalUrlId_original:{canonicalUrlId:c.id,original:row.original}}});
   if(alias) await prisma.urlAlias.update({where:{id:alias.id},data:{firstSeen:!alias.firstSeen||seen<alias.firstSeen?seen:alias.firstSeen,lastSeen:!alias.lastSeen||seen>alias.lastSeen?seen:alias.lastSeen}});
   else await prisma.urlAlias.create({data:{canonicalUrlId:c.id,original:row.original,reason:aliasReason(row.original,canonical),firstSeen:seen,lastSeen:seen}});
   await prisma.snapshot.upsert({where:{canonicalUrlId_timestamp_original:{canonicalUrlId:c.id,timestamp:row.timestamp,original:row.original}},update:{mimeType:row.mimetype||null,statusCode:Number(row.statuscode)||null,digest:row.digest||null,byteLength:Number(row.length)||null,redirectTarget:row.redirect||null},create:{canonicalUrlId:c.id,timestamp:row.timestamp,capturedAt:seen,original:row.original,mimeType:row.mimetype||null,statusCode:Number(row.statuscode)||null,digest:row.digest||null,byteLength:Number(row.length)||null,redirectTarget:row.redirect||null,replayUrl:replayUrl(row.timestamp,row.original),rawReplayUrl:replayUrl(row.timestamp,row.original,true)}});
   i++;if(i%200===0){await prisma.crawlJob.update({where:{id:job.id},data:{processed:i}});console.log(`${i}/${rows.length}`);await sleep(300);}
  }
  await prisma.crawlJob.update({where:{id:job.id},data:{status:'COMPLETE',processed:i,finishedAt:new Date()}});console.log('Metadata ingestion complete.');
 }catch(e){await prisma.crawlJob.update({where:{id:job.id},data:{status:'FAILED',error:e instanceof Error?e.message:String(e),finishedAt:new Date()}});throw e;}
}
main().finally(()=>prisma.$disconnect());

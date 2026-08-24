import { PrismaClient, ResourceKind, AnomalyKind } from '@prisma/client';
import { fetchArchived } from '../lib/wayback';
import { extractSnapshot,resolveHref,isInternal,canonicalIfInternal,sha256 } from '../lib/archive';
import { depthOf,parentPathOf } from '../lib/url';
const prisma=new PrismaClient(); const domainName=process.argv[2]||'anonymous.cool'; const batch=Number(process.argv[3]||100); const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function mediaKind(url:string):ResourceKind{const p=url.toLowerCase();if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(p))return'IMAGE';if(/\.(pdf|docx?|xlsx?|zip)(\?|$)/.test(p))return'DOCUMENT';if(/\.(xml)(\?|$)/.test(p))return'SITEMAP';return'OTHER';}
async function ensureCanonical(domainId:string,url:string){const u=new URL(url);return prisma.canonicalUrl.upsert({where:{url},update:{},create:{domainId,url,path:u.pathname,parentPath:parentPathOf(url),depth:depthOf(url)}})}
async function main(){
 const domain=await prisma.domain.findUnique({where:{name:domainName}});if(!domain)throw new Error('Run npm run ingest first.');
 const job=await prisma.crawlJob.create({data:{domainId:domain.id,kind:'DEEP_SNAPSHOT',status:'RUNNING',startedAt:new Date()}});
 try{
  const snapshots=await prisma.snapshot.findMany({where:{canonical:{domainId:domain.id},contentVersion:null,mimeType:{contains:'html'}},orderBy:{capturedAt:'asc'},take:batch});await prisma.crawlJob.update({where:{id:job.id},data:{total:snapshots.length}});
  let processed=0;
  for(const snap of snapshots){
   try{
    const fetched=await fetchArchived(snap.timestamp,snap.original);if(!fetched.ok)throw new Error(`HTTP ${fetched.status}`);const x=extractSnapshot(fetched.body,snap.original);
    await prisma.snapshot.update({where:{id:snap.id},data:{fetchedAt:new Date(),fetchError:null}});
    await prisma.snapshotResponse.upsert({where:{snapshotId:snap.id},update:{httpStatus:fetched.status,contentType:fetched.headers['content-type']||null,headersJson:fetched.headers,rawSha256:sha256(fetched.body),rawBytes:Buffer.byteLength(fetched.body)},create:{snapshotId:snap.id,httpStatus:fetched.status,contentType:fetched.headers['content-type']||null,headersJson:fetched.headers,rawSha256:sha256(fetched.body),rawBytes:Buffer.byteLength(fetched.body)}});
    await prisma.contentVersion.upsert({where:{snapshotId:snap.id},update:{rawSha256:x.rawSha256,htmlSha256:x.htmlSha256,textSha256:x.textSha256,title:x.title,description:x.description,canonicalTag:x.canonicalTag,robots:x.robots,language:x.language,visibleText:x.visibleText,normalizedHtml:x.normalizedHtml,metadataJson:x.metadata,scriptHosts:x.scriptHosts,iframeHosts:x.iframeHosts,wordCount:x.wordCount},create:{snapshotId:snap.id,rawSha256:x.rawSha256,htmlSha256:x.htmlSha256,textSha256:x.textSha256,title:x.title,description:x.description,canonicalTag:x.canonicalTag,robots:x.robots,language:x.language,visibleText:x.visibleText,normalizedHtml:x.normalizedHtml,metadataJson:x.metadata,scriptHosts:x.scriptHosts,iframeHosts:x.iframeHosts,wordCount:x.wordCount}});
    await prisma.link.deleteMany({where:{snapshotId:snap.id}});await prisma.mediaAsset.deleteMany({where:{snapshotId:snap.id}});await prisma.archiveAnomaly.deleteMany({where:{snapshotId:snap.id}});
    for(const l of x.links){const resolved=resolveHref(l.href,snap.original);if(!resolved)continue;const internal=isInternal(resolved,domainName);let destId:string|undefined;if(internal){const c=await ensureCanonical(domain.id,canonicalIfInternal(resolved,domainName)!);destId=c.id}await prisma.link.create({data:{snapshotId:snap.id,sourceCanonicalUrlId:snap.canonicalUrlId,destinationCanonicalUrlId:destId,href:l.href,normalizedHref:resolved,anchorText:l.anchorText,rel:l.rel,isInternal:internal}})}
    for(const m of x.media){const resolved=resolveHref(m.url,snap.original);if(resolved)await prisma.mediaAsset.create({data:{snapshotId:snap.id,url:resolved,altText:m.altText,kind:mediaKind(resolved)}})}
    if(x.scriptHosts.length)await prisma.archiveAnomaly.create({data:{snapshotId:snap.id,kind:AnomalyKind.EXTERNAL_SCRIPT,observation:`External script hosts observed: ${x.scriptHosts.join(', ')}`,interpretation:'Third-party scripts are evidence of page composition, not proof of unauthorized modification.',confidence:.7,detailsJson:{hosts:x.scriptHosts}}});
    if(x.iframeHosts.length)await prisma.archiveAnomaly.create({data:{snapshotId:snap.id,kind:AnomalyKind.IFRAME_INJECTION,observation:`External iframe hosts observed: ${x.iframeHosts.join(', ')}`,interpretation:'External iframe presence requires contextual comparison with neighboring captures.',confidence:.5,detailsJson:{hosts:x.iframeHosts}}});
   }catch(e){await prisma.snapshot.update({where:{id:snap.id},data:{fetchedAt:new Date(),fetchError:e instanceof Error?e.message:String(e)}});}
   processed++;await prisma.crawlJob.update({where:{id:job.id},data:{processed}});console.log(`${processed}/${snapshots.length} ${snap.original}`);await sleep(750);
  }
  await prisma.crawlJob.update({where:{id:job.id},data:{status:'COMPLETE',finishedAt:new Date()}});
 }catch(e){await prisma.crawlJob.update({where:{id:job.id},data:{status:'FAILED',error:e instanceof Error?e.message:String(e),finishedAt:new Date()}});throw e;}
}
main().finally(()=>prisma.$disconnect());

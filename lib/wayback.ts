export type CdxRow={urlkey:string;timestamp:string;original:string;mimetype:string;statuscode:string;digest:string;length:string;redirect?:string};
const CDX='https://web.archive.org/cdx/search/cdx';
const UA='anonymous.cool archival reconstruction/2.0 (+preservation research; respectful batching)';
export async function queryCdx(params:Record<string,string|number|boolean>){
 const url=new URL(CDX);for(const[k,v]of Object.entries(params))url.searchParams.append(k,String(v));
 const res=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'},cache:'no-store'});if(!res.ok)throw new Error(`Wayback CDX returned ${res.status}`);
 const rows=await res.json() as string[][];if(!Array.isArray(rows)||!rows.length)return[];const[header,...data]=rows;
 return data.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??'']))) as CdxRow[];
}
export async function discoverDomain(domain='anonymous.cool',limit=50000){return queryCdx({url:domain,matchType:'domain',output:'json',fl:'urlkey,timestamp,original,mimetype,statuscode,digest,length,redirect',limit});}
export async function historyForUrl(target:string,limit=5000){return queryCdx({url:target,matchType:'exact',output:'json',fl:'urlkey,timestamp,original,mimetype,statuscode,digest,length,redirect',limit});}
export function replayUrl(timestamp:string,original:string,raw=false){return `https://web.archive.org/web/${timestamp}${raw?'id_':''}/${original}`;}
export async function fetchArchived(timestamp:string,original:string){
 const url=replayUrl(timestamp,original,true);const res=await fetch(url,{headers:{'User-Agent':UA},redirect:'follow',cache:'no-store'});return {url,status:res.status,ok:res.ok,headers:Object.fromEntries(res.headers.entries()),body:await res.text()};
}
export const parseWaybackTimestamp=(ts:string)=>new Date(`${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}T${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}Z`);

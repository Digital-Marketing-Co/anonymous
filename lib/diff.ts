export type DiffChunk = { type: 'same' | 'add' | 'remove'; text: string };
export function wordDiff(a: string, b: string): DiffChunk[] {
  const aa = a.split(/(\s+)/), bb = b.split(/(\s+)/);
  const m = aa.length, n = bb.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = aa[i] === bb[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const out: DiffChunk[] = []; let i=0,j=0;
  const push=(type:DiffChunk['type'], text:string)=>{ const last=out[out.length-1]; if(last?.type===type) last.text+=text; else out.push({type,text}); };
  while(i<m && j<n){ if(aa[i]===bb[j]){push('same',aa[i]);i++;j++;} else if(dp[i+1][j]>=dp[i][j+1]){push('remove',aa[i++]);} else {push('add',bb[j++]);} }
  while(i<m) push('remove',aa[i++]); while(j<n) push('add',bb[j++]);
  return out;
}

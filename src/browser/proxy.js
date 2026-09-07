function toBase64Url(str){
  const bytes=new TextEncoder().encode(str); let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64Url(str){
  const pad=str.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((str.length+3)%4); const bin=atob(pad);
  return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));
}
export function proxify(url){ const u=new URL(url); if(!['http:','https:'].includes(u.protocol)) throw new Error('Only HTTP/HTTPS URLs are supported.'); return `/proxy/${toBase64Url(u.href)}`; }
export function unproxify(value){
  try { const path=typeof value==='string'?new URL(value,location.origin).pathname:value.pathname; const m=path.match(/^\/proxy\/([^/]+)/); return m?fromBase64Url(m[1]):null; } catch{return null;}
}
export function normalizeAddress(input, searchTemplate=''){
  const raw=input.trim(); if(!raw)return {type:'start'};
  if(/^https?:\/\//i.test(raw)) return {type:'url',url:new URL(raw).href};
  if(/^[\w.-]+\.[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(raw)) return {type:'url',url:new URL(`https://${raw}`).href};
  if(searchTemplate && searchTemplate.includes('{query}')) return {type:'url',url:searchTemplate.replace('{query}',encodeURIComponent(raw)),search:true};
  return {type:'local-search',query:raw};
}

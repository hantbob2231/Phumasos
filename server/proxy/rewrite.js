function b64url(str){return Buffer.from(str,'utf8').toString('base64url');}
export function proxyPath(url){return `/proxy/${b64url(new URL(url).href)}`;}
const SKIP=/^(?:#|data:|blob:|javascript:|mailto:|tel:|about:)/i;
export function rewriteUrl(value,base){if(!value||SKIP.test(value.trim()))return value;try{const u=new URL(value,base);if(!['http:','https:'].includes(u.protocol))return value;return proxyPath(u.href)}catch{return value}}
export function rewriteSrcset(value,base){return value.split(',').map(part=>{const m=part.trim().match(/^(\S+)(\s+.+)?$/);return m?`${rewriteUrl(m[1],base)}${m[2]||''}`:part}).join(', ')}
export function rewriteCss(css,base){if(!css)return css;css=css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,(m,q,u)=>SKIP.test(u)?m:`url(${q}${rewriteUrl(u,base)}${q})`);css=css.replace(/@import\s+(?:url\()?\s*(['"])(.*?)\1\s*\)?/gi,(m,q,u)=>`@import ${q}${rewriteUrl(u,base)}${q}`);return css;}
export function rewriteJs(js,base){if(!js)return js;const map=(m,prefix,url,suffix='')=>`${prefix}${rewriteUrl(url,base)}${suffix}`;js=js.replace(/((?:import|export)\s+(?:[\s\S]*?\s+from\s*)?['"])([^'"]+)(['"])/g,map);js=js.replace(/(import\s*\(\s*['"])([^'"]+)(['"]\s*\))/g,map);js=js.replace(/(new\s+(?:Worker|SharedWorker)\s*\(\s*['"])([^'"]+)(['"])/g,map);return js;}
export function rewriteHtml(html,destination){
  const base=destination.href;let out=html.replace(/<base\b[^>]*>/gi,'');
  out=out.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi,(m,a,css)=>`<style${a}>${rewriteCss(css,base)}</style>`);
  out=rewriteTags(out,base);
  const inject=`<meta name="figureos-destination" content="${escapeAttr(destination.href)}"><script src="/src/browser/proxyClient.js" defer></script>`;
  if(/<head\b[^>]*>/i.test(out))out=out.replace(/<head\b([^>]*)>/i,m=>m+inject);else out=inject+out;
  return out;
}
function rewriteTags(html,base){
  let out='',i=0;while(i<html.length){const lt=html.indexOf('<',i);if(lt<0){out+=html.slice(i);break;}out+=html.slice(i,lt);if(html.startsWith('<!--',lt)){const end=html.indexOf('-->',lt+4);if(end<0){out+=html.slice(lt);break;}out+=html.slice(lt,end+3);i=end+3;continue;}const end=findTagEnd(html,lt+1);if(end<0){out+=html.slice(lt);break;}let tag=html.slice(lt,end+1);if(!/^<\/?(?:script|style)\b/i.test(tag)||/^<(?:script|style)\b/i.test(tag))tag=rewriteTag(tag,base);out+=tag;i=end+1;}return out;
}
function findTagEnd(s,start){let q='';for(let i=start;i<s.length;i++){const c=s[i];if(q){if(c===q&&s[i-1]!=='\\')q='';continue;}if(c==='"'||c==="'"){q=c;continue;}if(c==='>')return i;}return-1;}
function rewriteTag(tag,base){
  tag=tag.replace(/\b(srcset)\s*=\s*(["'])(.*?)\2/gi,(m,a,q,v)=>`${a}=${q}${escapeForQuote(rewriteSrcset(v,base),q)}${q}`);
  tag=tag.replace(/\b(style)\s*=\s*(["'])(.*?)\2/gi,(m,a,q,v)=>`${a}=${q}${escapeForQuote(rewriteCss(v,base),q)}${q}`);
  tag=tag.replace(/\b(src|href|action|poster|data)\s*=\s*(["'])(.*?)\2/gi,(m,a,q,v)=>`${a}=${q}${escapeForQuote(rewriteUrl(v,base),q)}${q}`);
  tag=tag.replace(/\b(src|href|action|poster|data)\s*=\s*([^\s>"']+)/gi,(m,a,v)=>`${a}=${rewriteUrl(v,base)}`);
  if(/^<meta\b/i.test(tag)&&/http-equiv\s*=\s*["']?refresh/i.test(tag))tag=tag.replace(/content\s*=\s*(["'])(.*?)\1/i,(m,q,c)=>`content=${q}${escapeForQuote(c.replace(/(url\s*=\s*)(.+)$/i,(x,p,u)=>p+rewriteUrl(u.replace(/^['"]|['"]$/g,''),base)),q)}${q}`);
  return tag;
}
function escapeForQuote(s,q){return String(s).replace(/&/g,'&amp;').replace(q==='"'?/"/g:/'/g,q==='"'?'&quot;':'&#39;');}
function escapeAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

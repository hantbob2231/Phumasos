(() => {
  const meta=document.querySelector('meta[name="figureos-destination"]');if(!meta)return;let destination=meta.content;
  const enc=s=>{const bytes=new TextEncoder().encode(s);let b='';bytes.forEach(x=>b+=String.fromCharCode(x));return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  const proxify=u=>`/proxy/${enc(new URL(u,destination).href)}`;
  const socketify=u=>`/socket/${enc(new URL(u,destination).href)}`;
  const isProxy=u=>{try{return new URL(u,location.href).origin===location.origin&&/^\/(proxy|socket)\//.test(new URL(u,location.href).pathname)}catch{return false}};
  const absolute=u=>new URL(u,destination).href;

  const nativeFetch=window.fetch.bind(window);window.fetch=function(input,init){try{if(input instanceof Request){if(isProxy(input.url))return nativeFetch(input,init);const req=new Request(proxify(absolute(input.url)),input);return nativeFetch(req,init);}const raw=String(input);return nativeFetch(isProxy(raw)?raw:proxify(absolute(raw)),init);}catch{return nativeFetch(input,init);}};
  const xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){const args=[...arguments];try{args[1]=isProxy(url)?url:proxify(absolute(String(url)));}catch{}return xo.apply(this,args);};
  if(window.EventSource){const NativeES=window.EventSource;window.EventSource=function(url,opts){return new NativeES(isProxy(url)?url:proxify(absolute(String(url))),opts)};window.EventSource.prototype=NativeES.prototype;}
  if(window.WebSocket){const NativeWS=window.WebSocket;window.WebSocket=function(url,protocols){const raw=String(url);const mapped=isProxy(raw)?raw:socketify(absolute(raw));return protocols===undefined?new NativeWS(mapped):new NativeWS(mapped,protocols)};window.WebSocket.prototype=NativeWS.prototype;Object.assign(window.WebSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});}
  const nativeOpen=window.open.bind(window);window.open=function(url,target,features){if(!url)return nativeOpen(url,target,features);try{const abs=absolute(String(url));window.parent.postMessage({type:'figureos:open-tab',url:abs},location.origin);return null;}catch{return nativeOpen(url,target,features);}};
  document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||/^(mailto:|tel:|javascript:|data:|blob:)/i.test(raw))return;try{const abs=absolute(raw);if(a.target==='_blank'||e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();window.parent.postMessage({type:'figureos:open-tab',url:abs},location.origin);}else if(!isProxy(a.href)){e.preventDefault();location.href=proxify(abs);}}catch{}},true);
  const report=()=>window.parent.postMessage({type:'figureos:navigate',url:destination,title:document.title},location.origin);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',report);else report();
})();

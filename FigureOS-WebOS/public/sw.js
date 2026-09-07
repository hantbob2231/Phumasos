const VERSION='figureos-shell-v3-1';
const SHELL=['/','/offline.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/src/styles.css','/src/app.js','/src/state.js','/src/router.js','/src/themes.js','/src/particles.js','/src/tasks.js','/src/search.js','/src/apps/registry.js','/src/apps/home.js','/src/apps/settings.js','/src/apps/ciri.js','/src/apps/music.js','/src/apps/files.js','/src/providers/weatherProvider.js','/src/providers/assistantProvider.js','/src/browser/browser.js','/src/browser/tabs.js','/src/browser/history.js','/src/browser/bookmarks.js','/src/browser/proxy.js','/src/figure/bridge.js','/src/figure/embedded.css','/figure/'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
  if(url.origin!==location.origin||url.pathname.startsWith('/proxy/')||url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket/'))return;
  if(req.mode==='navigate'){event.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put(req,copy));return r;}).catch(async()=>await caches.match(req)||await caches.match('/')||await caches.match('/offline.html')));return;}
  if(url.pathname.startsWith('/src/')||url.pathname.startsWith('/icons/')||url.pathname.startsWith('/figure/'))event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(VERSION).then(c=>c.put(req,copy));}return r;})));
});

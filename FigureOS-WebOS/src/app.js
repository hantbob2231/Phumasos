import { state, patchState, notify, onState } from './state.js';
import { initTheme, applyTheme, themes } from './themes.js';
import { initParticles, applyParticles } from './particles.js';
import { initRouter, routeTo } from './router.js';
import { bindTaskUI, startTask, stopTask, minimizeTask, focusTask, updateTask } from './tasks.js';
import { allApps, getApp } from './apps/registry.js';
import { initBrowser, newTab, openUrl } from './browser/browser.js';
import { initSearch } from './search.js';
import { initHome, renderHome } from './apps/home.js';
import { renderSettings, applyWallpaper } from './apps/settings.js';
import { initCiri } from './apps/ciri.js';
import { renderMusicApp } from './apps/music.js';
import { renderFilesApp } from './apps/files.js';

const $=s=>document.querySelector(s);
let figureReady=false;
let currentWindowTask='';

function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function toast(title,message){const stack=$('#toast-stack'),el=document.createElement('div');el.className='toast';el.innerHTML=`<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>`;stack.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(8px)';setTimeout(()=>el.remove(),300)},3200);}
window.addEventListener('figureos:toast',e=>toast(e.detail.title||'FigureOS',e.detail.message||''));
window.addEventListener('figureos:notify',e=>toast(e.detail.title,e.detail.message));

function openApp(id){
  const app=getApp(id);if(!app)return;
  if(app.type==='internal'||app.type==='iframe'){routeTo(app.route||id);return;}
  if(app.type==='panel'&&id==='ciri'){$('#ciri-panel').classList.add('open');return;}
  if(app.type==='window'){openWindowApp(app);return;}
  if(app.type==='web'){routeTo('browser');newTab(app.url);return;}
}
function openWindowApp(app){
  const win=$('#app-window'),content=$('#app-window-content');win.classList.remove('hidden','minimized');$('#app-window-icon').textContent=app.icon;$('#app-window-title').textContent=app.name;currentWindowTask=`window:${app.id}`;
  if(app.id==='music')renderMusicApp(content);else if(app.id==='files')renderFilesApp(content);else content.innerHTML='<div class="search-empty">App content unavailable.</div>';
  startTask({id:currentWindowTask,name:app.name,type:'app',subtitle:'Window',focus:()=>{win.classList.remove('hidden','minimized')},minimize:()=>win.classList.add('minimized'),close:()=>win.classList.add('hidden')});
}
function openUpdateLog(){
  const win=$('#app-window'),content=$('#app-window-content');win.classList.remove('hidden','minimized');$('#app-window-icon').textContent='◆';$('#app-window-title').textContent='FigureOS Update Log';currentWindowTask='window:update-log';content.innerHTML=`<div class="about-app"><small class="eyebrow">FIGURE OS / RELEASE</small><h2>Version 3.0</h2><p>This upgrade wraps the original Figure experience in a complete WebOS shell while keeping the game catalog, play tracking, launcher, themes, particles, controller behavior, and game layer intact.</p><ul class="update-list"><li>Tabbed same-origin proxy browser with bookmarks and history.</li><li>Home dashboard with Jump Back In, Quick Play, audio, status, weather provider abstraction, and notifications.</li><li>OS-level task management and Figure game presence.</li><li>Global search across games, apps, browser data, and settings.</li><li>CIRI command routing with an abstract server-side provider.</li><li>Installable PWA with offline shell and update notifications.</li><li>Responsive desktop, tablet, and phone layouts.</li></ul></div>`;startTask({id:currentWindowTask,name:'Update Log',type:'app',focus:()=>win.classList.remove('hidden','minimized'),minimize:()=>win.classList.add('minimized'),close:()=>win.classList.add('hidden')});
}
function closeWindow(){if(currentWindowTask)stopTask(currentWindowTask);currentWindowTask='';$('#app-window').classList.add('hidden');}
function minimizeWindow(){if(currentWindowTask)minimizeTask(currentWindowTask);$('#app-window').classList.add('minimized');}

function renderApps(){const root=$('#apps-grid');root.innerHTML=allApps().map(a=>`<button class="app-card" data-app-open="${a.id}"><span class="app-icon">${a.icon||'↗'}</span><div><small>${a.type==='web'?'APPROVED WEB APP':a.type.toUpperCase()}</small><h3>${escapeHtml(a.name)}</h3><p>${escapeHtml(a.description||a.url||'')}</p></div></button>`).join('');}
function bindApps(){
  $('#apps-grid').onclick=e=>{const b=e.target.closest('[data-app-open]');if(b)openApp(b.dataset.appOpen);};
  $('#webapp-form').onsubmit=e=>{e.preventDefault();const name=$('#webapp-name').value.trim(),url=$('#webapp-url').value.trim();let u;try{u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error();}catch{toast('Apps','Enter a valid HTTP or HTTPS URL.');return;}const app={id:`web-${crypto.randomUUID()}`,name,icon:'↗',url:u.href,description:u.origin};patchState({customApps:[...state.customApps,app]});e.target.reset();renderApps();notify('App added',`${name} will open through the allowlisted proxy.`);};
}
function renderLibrary(filter=''){const root=$('#library-grid');const q=filter.trim().toLowerCase();const games=state.figureGames.filter(g=>!q||g.name.toLowerCase().includes(q)||(g.developer||'').toLowerCase().includes(q)||(g.tags||[]).join(' ').toLowerCase().includes(q));if(!state.figureGames.length){root.innerHTML='<div class="library-loading glass">Loading the Figure catalog…</div>';return;}root.innerHTML=games.map(g=>`<button class="library-card" data-game-id="${g.id}"><img src="${escapeHtml(g.image)}" loading="lazy" alt=""><div class="library-info"><h3>${escapeHtml(g.name)}</h3><p>${escapeHtml(g.developer||'Figure Library')}</p></div></button>`).join('')||'<div class="library-loading glass">No games match that search.</div>';}
function openGame(id){routeTo('figure');const send=()=>$('#figure-frame').contentWindow.postMessage({source:'figureos-parent',type:'figure:open-game',id},location.origin);if(figureReady)setTimeout(send,80);else setTimeout(send,900);}

function bindPanels(){
  $('#tasks-trigger').onclick=()=>{$('#tasks-panel').classList.toggle('open');$('#notifications-panel').classList.remove('open')};$('#notifications-trigger').onclick=()=>{$('#notifications-panel').classList.toggle('open');$('#tasks-panel').classList.remove('open')};
  document.querySelectorAll('[data-close-panel]').forEach(b=>b.onclick=()=>$('#'+b.dataset.closePanel+'-panel').classList.remove('open'));
  $('#app-window-close').onclick=closeWindow;$('#app-window-minimize').onclick=minimizeWindow;
  $('#clock-button').onclick=()=>lock();$('#unlock-button').onclick=unlock;window.addEventListener('figureos:lock',lock);
}
function lock(){const l=$('#lockscreen');l.classList.remove('hidden','unlocking');}
function unlock(){const l=$('#lockscreen');l.classList.add('unlocking');setTimeout(()=>{l.classList.add('hidden');l.classList.remove('unlocking')},650);}
function renderNotifications(){const list=$('#notification-list'),n=state.notifications.length;$('#notification-count').textContent=n?String(n):'';list.innerHTML=n?state.notifications.map(x=>`<article class="notification-item"><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.message)}</p><time>${new Date(x.createdAt).toLocaleString()}</time></article>`).join(''):'<div class="search-empty">No notifications.</div>';}
function bindFigure(){
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#figure-frame').contentWindow||e.data?.source!=='figureos')return;const d=e.data;
    if(d.type==='figure:ready'){figureReady=true;$('#figure-frame').contentWindow.postMessage({source:'figureos-parent',type:'figure:get-library'},location.origin);if(d.theme&&themes[d.theme])applyTheme(d.theme,false);if(d.particles)applyParticles(d.particles,false);}
    if(d.type==='figure:library'){patchState({figureGames:d.games||[]},false);renderLibrary($('#library-search').value);renderHome();window.dispatchEvent(new CustomEvent('figureos:library'));}
    if(d.type==='figure:game-start'&&d.game){patchState({activeFigureGame:d.game},false);updateTask('figure-game',{id:'figure-game',name:d.game.name,type:'game',route:'figure',subtitle:'Figure game',focus:()=>{routeTo('figure');$('#figure-frame').contentWindow.postMessage({source:'figureos-parent',type:'figure:focus-game'},location.origin)},close:()=>$('#figure-frame').contentWindow.postMessage({source:'figureos-parent',type:'figure:close-game'},location.origin),minimizable:false});notify('Game started',d.game.name);}
    if(d.type==='figure:game-close'){patchState({activeFigureGame:null},false);stopTask('figure-game');}
    if(d.type==='figure:theme-change'&&themes[d.theme])applyTheme(d.theme,false);
    if(d.type==='figure:particles-change')applyParticles(d.particles,false);
  });
}
function bindLibrary(){ $('#library-search').oninput=e=>renderLibrary(e.target.value);$('#library-grid').onclick=e=>{const card=e.target.closest('[data-game-id]');if(card)openGame(card.dataset.gameId);};$('#library-open-figure').onclick=()=>routeTo('figure'); }
function applyWallpaperEvent(){window.addEventListener('figureos:wallpaper',e=>{patchState({wallpaper:e.detail.id});applyWallpaper(e.detail.id);renderSettings();});}
function bindPWA(){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.figureosInstallPrompt=e;});if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').then(reg=>{reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)notify('FigureOS update ready','Reload to use the newest offline shell.');});});}).catch(()=>{});}}
function boot(){setTimeout(()=>$('#boot').classList.add('done'),1450);}

async function main(){
  initTheme();initParticles();applyWallpaper();renderSettings();renderApps();renderLibrary();bindApps();bindLibrary();bindPanels();bindFigure();bindTaskUI();initRouter();await initBrowser();initSearch({openApp,openGame,openUrl:(u)=>{routeTo('browser');openUrl(u)}});initHome({openApp,openGame,openUrl:(u)=>{routeTo('browser');openUrl(u)},openUpdateLog});initCiri({openApp});applyWallpaperEvent();bindPWA();renderNotifications();onState((_,patch)=>{if(patch.notifications)renderNotifications();if(patch.theme)renderSettings();});window.addEventListener('figureos:routed',e=>{if(e.detail.route==='settings')renderSettings();if(e.detail.route==='apps')renderApps();});document.querySelectorAll('[data-open-app]').forEach(b=>b.onclick=()=>openApp(b.dataset.openApp));if(!localStorage.getItem('figureos_welcome_v3')){localStorage.setItem('figureos_welcome_v3','1');notify('Welcome to FigureOS 3','The upgraded WebOS shell is ready.');}boot();}
main();

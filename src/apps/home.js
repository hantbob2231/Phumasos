import { state, onState } from '../state.js';
import { coreApps } from './registry.js';
import { weatherProvider } from '../providers/weatherProvider.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function playStore(){try{return JSON.parse(localStorage.getItem('cine_store_v10')||'{}')}catch{return{}}}
export function initHome({openApp,openGame,openUrl,openUpdateLog}){
  const updateClock=()=>{const d=new Date();const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});document.getElementById('status-time').textContent=time;document.getElementById('home-clock').textContent=time;document.getElementById('status-date').textContent=d.toLocaleDateString([],{month:'short',day:'numeric'}).toUpperCase();document.getElementById('home-date-long').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});document.getElementById('home-greeting').textContent=`Good ${d.getHours()<12?'morning':d.getHours()<18?'afternoon':'evening'}.`;document.getElementById('lock-time').textContent=time;document.getElementById('lock-date').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});};
  updateClock();setInterval(updateClock,1000);renderHome();window.addEventListener('figureos:library',renderHome);window.addEventListener('figureos:browser-updated',renderHome);onState((_,patch)=>{if(patch.history||patch.recentApps||patch.theme)renderHome();});window.addEventListener('online',renderStatus);window.addEventListener('offline',renderStatus);renderStatus();
  document.getElementById('jump-back-card').onclick=()=>{const g=recentGame();if(g)openGame(g.id);else openApp('figure');};
  document.getElementById('recent-site-card').onclick=()=>{const h=state.history[0];if(h)openUrl(h.url);else openApp('browser');};
  document.getElementById('quick-play').onclick=e=>{const b=e.target.closest('[data-game-id]');if(b)openGame(b.dataset.gameId);};
  document.getElementById('favorite-apps').onclick=e=>{const b=e.target.closest('[data-app-id]');if(b)openApp(b.dataset.appId);};
  document.getElementById('update-log-trigger').onclick=openUpdateLog;
  weatherProvider.current().then(w=>{const root=document.getElementById('weather-content');root.innerHTML=`<span class="weather-glyph">${esc(w.symbol)}</span><div><h3>${esc(w.title)}</h3><p>${esc(w.detail)}</p></div>`;});
}
function recentGame(){const db=playStore();const ids=Object.keys(db).filter(id=>db[id]?.t>0).sort((a,b)=>(db[b]?.l||0)-(db[a]?.l||0));return state.figureGames.find(g=>g.id===ids[0])||null;}
export function renderHome(){
  const g=recentGame(),jump=document.getElementById('jump-back-card');if(g){jump.classList.remove('empty');jump.querySelector('.media-art').style.backgroundImage=`url("${g.background||g.image}")`;jump.querySelector('small').textContent='CONTINUE PLAYING';jump.querySelector('h3').textContent=g.name;jump.querySelector('p').textContent=g.developer||'Figure Library';}else{jump.classList.add('empty');}
  const apps=(state.recentApps.length?state.recentApps:['figure','browser','library','settings']).map(id=>coreApps.find(a=>a.id===id)).filter(Boolean).slice(0,4);document.getElementById('favorite-apps').innerHTML=apps.map(a=>`<button class="app-mini" data-app-id="${a.id}"><span class="app-icon">${a.icon}</span><small>${esc(a.name)}</small></button>`).join('');
  const quick=state.figureGames.slice(0,2);document.getElementById('quick-play').innerHTML=quick.length?quick.map(x=>`<button class="quick-game" data-game-id="${x.id}" style="background-image:url('${esc(x.background||x.image)}')"><span>${esc(x.name)}</span></button>`).join(''):'<div class="skeleton-card"></div><div class="skeleton-card"></div>';
  const h=state.history[0],site=document.getElementById('recent-site-card');site.querySelector('h3').textContent=h?.title||'New Tab';site.querySelector('p').textContent=h?.url||'Open the FigureOS Browser';
}
function renderStatus(){document.getElementById('network-status').textContent=navigator.onLine?'Online':'Offline';document.getElementById('connection-label').textContent=navigator.onLine?'System online':'Offline shell';document.getElementById('pwa-status').textContent=matchMedia('(display-mode: standalone)').matches?'Installed':'Browser';}

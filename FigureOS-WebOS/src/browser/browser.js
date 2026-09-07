import { state, patchState, notify } from '../state.js';
import { proxify, unproxify, normalizeAddress } from './proxy.js';
import { historyStore } from './history.js';
import { bookmarkStore } from './bookmarks.js';
import { createTab, activeTab, getTab, activateTab, closeTab, duplicateTab } from './tabs.js';
import { startTask, stopTask, updateTask } from '../tasks.js';

let config={searchTemplate:''};
const panels=new Map();
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(title,message){window.dispatchEvent(new CustomEvent('figureos:toast',{detail:{title,message}}));}

export async function initBrowser(){
  try{const r=await fetch('/api/config',{credentials:'same-origin'});if(r.ok){const j=await r.json();config.searchTemplate=j.browserSearchTemplate||'';$('#proxy-status').textContent=j.proxyEnabled?'Ready':'Needs allowlist';}}
  catch{$('#proxy-status').textContent='Offline';}
  const restored=state.browserTabs.filter(t=>t&&t.id).map(t=>({...t,loading:false}));state.browserTabs=restored;
  if(!restored.length) createTab(); else if(!state.activeBrowserTab||!getTab(state.activeBrowserTab))state.activeBrowserTab=restored[0].id;
  bindBrowserUI(); renderTabs(); renderActive(); updateTaskState();
}
function bindBrowserUI(){
  $('#new-tab-button').addEventListener('click',()=>newTab());
  $('#browser-tabs').addEventListener('click',e=>{const tabEl=e.target.closest('[data-tab-id]');if(!tabEl)return;const id=tabEl.dataset.tabId;if(e.target.closest('.tab-close'))closeBrowserTab(id);else{activateTab(id);renderTabs();renderActive();}});
  $('#browser-back').addEventListener('click',()=>goHistory(-1)); $('#browser-forward').addEventListener('click',()=>goHistory(1));
  $('#browser-reload').addEventListener('click',reload); $('#browser-stop').addEventListener('click',stop); $('#browser-home').addEventListener('click',home);
  $('#address-form').addEventListener('submit',e=>{e.preventDefault();navigateInput($('#address-input').value);});
  $('#bookmark-button').addEventListener('click',toggleBookmark);
  $('#browser-menu-button').addEventListener('click',()=>$('#browser-menu').classList.toggle('hidden'));
  $('#browser-menu').addEventListener('click',e=>{const a=e.target.closest('[data-browser-action]')?.dataset.browserAction;if(!a)return;$('#browser-menu').classList.add('hidden');if(a==='new')newTab();if(a==='duplicate')duplicateActive();if(a==='bookmarks')showCollection('bookmarks');if(a==='history')showCollection('history');if(a==='fullscreen')toggleFullscreen();});
  $('#tab-switcher-button').addEventListener('click',openTabSwitcher); $('#tab-switcher-close').addEventListener('click',()=>$('#tab-switcher').classList.add('hidden'));
  $('#tab-switcher-list').addEventListener('click',e=>{const row=e.target.closest('[data-switch-tab]');if(!row)return;const id=row.dataset.switchTab;if(e.target.closest('[data-close-switch]'))closeBrowserTab(id);else{activateTab(id);renderTabs();renderActive();$('#tab-switcher').classList.add('hidden');}openTabSwitcher(true);});
  window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;if(e.data.type==='figureos:open-tab'&&e.data.url)newTab(e.data.url);if(e.data.type==='figureos:navigate'&&e.data.url){const t=activeTab();if(t)recordFrameNavigation(t,e.data.url,e.data.title||'');}});
  window.addEventListener('keydown',handleShortcut);
}
function handleShortcut(e){
  if(!document.getElementById('browser-view').classList.contains('active'))return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='l'){e.preventDefault();$('#address-input').focus();$('#address-input').select();}
  if(mod&&e.key.toLowerCase()==='t'){e.preventDefault();newTab();}
  if(mod&&e.key.toLowerCase()==='w'){e.preventDefault();const t=activeTab();if(t)closeBrowserTab(t.id);}
  if(mod&&e.key.toLowerCase()==='r'){e.preventDefault();reload();}
  if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();goHistory(-1);} if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();goHistory(1);}
}
export function newTab(url=''){
  const t=createTab();renderTabs();renderActive();updateTaskState();if(url)navigate(url,t);return t;
}
export function openUrl(url){let t=activeTab();if(!t)t=newTab();navigate(url,t);}
function navigateInput(input){
  const template=state.browserSearchTemplate||config.searchTemplate;
  let result;try{result=normalizeAddress(input,template);}catch(err){toast('Browser',err.message);return;}
  if(result.type==='start')return home();
  if(result.type==='local-search'){showLocalSearch(result.query);return;}
  navigate(result.url);
}
export function navigate(url,tab=activeTab(),opts={push:true}){
  if(!tab)return; let target;try{target=new URL(url).href;if(!['http:','https:'].includes(new URL(target).protocol))throw new Error();}catch{toast('Browser','Enter a valid HTTP or HTTPS URL.');return;}
  tab.mode='web';tab.url=target;tab.loading=true;tab.title=tab.title==='New Tab'?new URL(target).hostname:tab.title;
  if(opts.push!==false){const current=tab.history[tab.historyIndex];if(current!==target){tab.history=tab.history.slice(0,tab.historyIndex+1);tab.history.push(target);tab.historyIndex=tab.history.length-1;}}
  ensurePanel(tab); const panel=panels.get(tab.id); panel.innerHTML='';
  const frame=document.createElement('iframe');frame.className='browser-frame';frame.dataset.tabFrame=tab.id;frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads allow-pointer-lock');frame.setAttribute('allow','autoplay; fullscreen; clipboard-read; clipboard-write');frame.src=proxify(target);panel.appendChild(frame);tab.frame=frame;
  frame.addEventListener('load',()=>onFrameLoad(tab,frame));
  frame.addEventListener('error',()=>finishLoading(tab));
  saveTabs();renderTabs();renderActive();updateToolbar();updateTaskState();
}
function onFrameLoad(tab,frame){
  if(tab.frame!==frame)return;let dest=unproxify(frame.contentWindow.location.href)||tab.url;let title=tab.title;let fav='';
  try{title=frame.contentDocument.title||new URL(dest).hostname;const icon=frame.contentDocument.querySelector('link[rel~="icon"]');fav=icon?.href||proxify(new URL('/favicon.ico',dest).href);frame.contentWindow.addEventListener('keydown',handleShortcut);}catch{}
  tab.title=title;tab.favicon=fav;tab.url=dest;recordFrameNavigation(tab,dest,title);finishLoading(tab);historyStore.add({url:dest,title, favicon:fav});saveTabs();renderTabs();renderActive();updateTaskState();
}
function recordFrameNavigation(tab,dest,title=''){
  if(!dest||tab.suppressHistory){tab.suppressHistory=false;return;}const current=tab.history[tab.historyIndex];
  if(current!==dest){tab.history=tab.history.slice(0,tab.historyIndex+1);tab.history.push(dest);tab.historyIndex=tab.history.length-1;tab.url=dest;if(title)tab.title=title;saveTabs();}
}
function finishLoading(tab){tab.loading=false;renderTabs();if(activeTab()?.id===tab.id)updateToolbar();}
function ensurePanel(tab){
  if(panels.has(tab.id))return panels.get(tab.id);const panel=document.createElement('div');panel.dataset.browserPanel=tab.id;panel.style.cssText='position:absolute;inset:0;display:none;';$('#browser-content').appendChild(panel);panels.set(tab.id,panel);return panel;
}
function renderTabs(){
  const root=$('#browser-tabs');root.innerHTML=state.browserTabs.map(t=>`<div class="browser-tab ${t.id===state.activeBrowserTab?'active':''}" data-tab-id="${t.id}">${t.favicon?`<img class="favicon" src="${escapeHtml(t.favicon)}" alt="">`:'<span class="favicon">◫</span>'}<span class="tab-title">${escapeHtml(t.loading?'Loading…':t.title||'New Tab')}</span><button class="tab-close" title="Close tab">×</button></div>`).join('');
}
function renderActive(){
  const tab=activeTab();if(!tab)return;for(const [id,p] of panels)p.style.display=id===tab.id?'block':'none';ensurePanel(tab);
  if(tab.mode==='start'){renderStartPage(tab);} else if(tab.mode==='collection'){/* panel already rendered */} else if(tab.mode==='web'&&!tab.frame){navigate(tab.url,tab,{push:false});}
  updateToolbar();
}
function renderStartPage(tab){
  const p=ensurePanel(tab);p.innerHTML='';const div=document.createElement('div');div.className='browser-start';div.innerHTML=startMarkup();p.appendChild(div);tab.panel=div;
  div.querySelector('.start-search').addEventListener('submit',e=>{e.preventDefault();navigateInput(div.querySelector('input').value);});
  div.addEventListener('click',e=>{const b=e.target.closest('[data-start-url]');if(b)navigate(b.dataset.startUrl);const app=e.target.closest('[data-start-route]');if(app)window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route:app.dataset.startRoute}}));});
  const tick=()=>{if(!document.body.contains(div))return;const d=new Date();div.querySelector('.start-clock').textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});div.querySelector('.start-date').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}).toUpperCase();setTimeout(tick,1000)};tick();
}
function startMarkup(){
  const fav=state.bookmarks.slice(0,5),hist=state.history.slice(0,5),games=state.figureGames.slice(0,5);
  const links=(items,empty)=>items.length?items.map(x=>`<button class="start-link" data-start-url="${escapeHtml(x.url||'')}"><span class="mini-fav">${x.favicon?`<img src="${escapeHtml(x.favicon)}" style="width:18px;height:18px">`:'⌁'}</span><span>${escapeHtml(x.title||x.name||x.url)}</span></button>`).join(''):`<div class="search-empty" style="padding:12px">${empty}</div>`;
  return `<div class="start-clock">--:--</div><div class="start-date">FIGURE OS</div><form class="start-search"><span>⌕</span><input placeholder="Search or enter an approved URL"></form><div class="start-sections"><div class="start-section"><h4>Favorites</h4>${links(fav,'No bookmarks yet.')}</div><div class="start-section"><h4>Recent Sites</h4>${links(hist,'No browser history yet.')}</div><div class="start-section"><h4>Recent Apps</h4><button class="start-link" data-start-route="figure"><span class="mini-fav">◆</span><span>Figure</span></button><button class="start-link" data-start-route="library"><span class="mini-fav">▦</span><span>Library</span></button><button class="start-link" data-start-route="apps"><span class="mini-fav">⠿</span><span>Apps</span></button></div></div>`;
}
function showLocalSearch(q){
  const tab=activeTab();if(!tab)return;const items=[...historyStore.search(q).map(x=>({...x,kind:'History'})),...bookmarkStore.search(q).map(x=>({...x,kind:'Bookmark'}))];tab.mode='collection';tab.title=`Search: ${q}`;const p=ensurePanel(tab);p.innerHTML=`<div class="browser-start"><div class="start-date">LOCAL BROWSER SEARCH</div><h2 style="font-size:34px;margin:0 0 22px">Results for “${escapeHtml(q)}”</h2><div class="start-section" style="width:min(760px,100%)"><h4>History + Bookmarks</h4>${items.length?items.map(x=>`<button class="start-link" data-start-url="${escapeHtml(x.url)}"><span class="mini-fav">⌁</span><span>${escapeHtml(x.title||x.url)} · ${x.kind}</span></button>`).join(''):'<div class="search-empty">No local matches. Configure a web search template in Settings to send searches through an allowed service.</div>'}</div></div>`;p.querySelectorAll('[data-start-url]').forEach(b=>b.onclick=()=>navigate(b.dataset.startUrl));saveTabs();renderTabs();updateToolbar();
}
function showCollection(kind){
  const tab=activeTab();if(!tab)return;tab.mode='collection';tab.title=kind==='history'?'History':'Bookmarks';const items=kind==='history'?state.history:state.bookmarks;const p=ensurePanel(tab);p.innerHTML=`<div class="browser-start" style="align-items:stretch"><div class="start-date">FIGURE BROWSER</div><h2 style="font-size:34px;margin:0 0 20px">${tab.title}</h2><div class="start-section"><h4>${items.length} items</h4>${items.length?items.map(x=>`<button class="start-link" data-start-url="${escapeHtml(x.url)}"><span class="mini-fav">⌁</span><span>${escapeHtml(x.title||x.url)}</span></button>`).join(''):'<div class="search-empty">Nothing here yet.</div>'}</div></div>`;p.querySelectorAll('[data-start-url]').forEach(b=>b.onclick=()=>navigate(b.dataset.startUrl));saveTabs();renderTabs();updateToolbar();
}
function updateToolbar(){
  const t=activeTab();if(!t)return;$('#address-input').value=t.mode==='web'?t.url:'';$('#browser-back').disabled=t.historyIndex<=0;$('#browser-forward').disabled=t.historyIndex>=t.history.length-1;$('#browser-reload').classList.toggle('hidden',t.loading);$('#browser-stop').classList.toggle('hidden',!t.loading);$('#browser-progress').classList.toggle('loading',t.loading);$('#browser-progress').style.opacity=t.loading?'1':'0';const sec=$('#security-indicator');if(t.mode!=='web'){sec.textContent='—';sec.className='security-indicator';}else if(t.url.startsWith('https://')){sec.textContent='▣';sec.className='security-indicator secure';sec.title='HTTPS destination';}else{sec.textContent='!';sec.className='security-indicator warning';sec.title='HTTP destination';}$('#bookmark-button').textContent=state.bookmarks.some(x=>x.url===t.url)?'★':'☆';
}
function goHistory(delta){const t=activeTab();if(!t)return;const next=t.historyIndex+delta;if(next<0||next>=t.history.length)return;t.historyIndex=next;t.suppressHistory=true;navigate(t.history[next],t,{push:false});}
function reload(){const t=activeTab();if(!t)return;if(t.mode==='web'&&t.frame){t.loading=true;updateToolbar();t.frame.contentWindow.location.reload();}else renderActive();}
function stop(){const t=activeTab();if(!t?.frame)return;try{t.frame.contentWindow.stop();}catch{}finishLoading(t);}
function home(){const t=activeTab();if(!t)return;t.mode='start';t.title='New Tab';t.url='';t.favicon='';t.loading=false;saveTabs();renderTabs();renderActive();}
function toggleBookmark(){const t=activeTab();if(!t||t.mode!=='web')return;const added=bookmarkStore.toggle({url:t.url,title:t.title,favicon:t.favicon});toast('Bookmarks',added?'Saved to bookmarks.':'Removed from bookmarks.');updateToolbar();}
function duplicateActive(){const t=activeTab();if(!t)return;const dup=duplicateTab(t);renderTabs();renderActive();if(dup.mode==='web')navigate(dup.url,dup,{push:false});updateTaskState();}
function closeBrowserTab(id){const t=getTab(id);if(t?.frame)t.frame.remove();panels.get(id)?.remove();panels.delete(id);const r=closeTab(id);if(r?.needsNew)newTab();renderTabs();renderActive();updateTaskState();}
function openTabSwitcher(refreshOnly=false){const list=$('#tab-switcher-list');list.innerHTML=state.browserTabs.map(t=>`<div class="switcher-tab" data-switch-tab="${t.id}"><span>${t.favicon?`<img src="${escapeHtml(t.favicon)}" style="width:18px;height:18px">`:'◫'}</span><span>${escapeHtml(t.title)}</span><button data-close-switch>×</button></div>`).join('');if(!refreshOnly)$('#tab-switcher').classList.remove('hidden');}
async function toggleFullscreen(){const el=$('#browser-view');try{if(!document.fullscreenElement)await el.requestFullscreen();else await document.exitFullscreen();}catch{toast('Browser','Fullscreen is unavailable in this context.');}}
function saveTabs(){patchState({browserTabs:state.browserTabs,activeBrowserTab:state.activeBrowserTab});}
function updateTaskState(){
  if(state.browserTabs.length){updateTask('browser',{id:'browser',name:'Browser',subtitle:`${state.browserTabs.length} tab${state.browserTabs.length===1?'':'s'}`,type:'browser',route:'browser',focus:()=>window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route:'browser'}})),close:()=>{[...state.browserTabs].forEach(t=>closeBrowserTab(t.id));},minimize:()=>window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route:'home'}}))});} else stopTask('browser');
}
export function getActiveBrowserTab(){return activeTab();}

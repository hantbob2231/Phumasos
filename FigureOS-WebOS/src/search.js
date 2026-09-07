import { state } from './state.js';
import { allApps } from './apps/registry.js';
const settings=[
  {id:'theme',name:'Themes',detail:'Appearance and Figure theme'}, {id:'particles',name:'Particles',detail:'Background effects'},
  {id:'wallpaper',name:'Wallpaper',detail:'Desktop wallpaper'}, {id:'browser',name:'Browser search',detail:'Approved search provider template'},
  {id:'pwa',name:'Install FigureOS',detail:'PWA and updates'}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function searchAll(q){const s=q.trim().toLowerCase();if(!s)return[];const match=(...v)=>v.some(x=>String(x||'').toLowerCase().includes(s));return [
  {group:'Games',items:state.figureGames.filter(g=>match(g.name,g.developer,(g.tags||[]).join(' '))).slice(0,7).map(g=>({type:'game',id:g.id,title:g.name,detail:g.developer,icon:g.image}))},
  {group:'Apps',items:allApps().filter(a=>match(a.name,a.description)).slice(0,6).map(a=>({type:'app',id:a.id,title:a.name,detail:a.description,iconText:a.icon}))},
  {group:'History',items:state.history.filter(h=>match(h.title,h.url)).slice(0,5).map(h=>({type:'url',url:h.url,title:h.title||h.url,detail:h.url,icon:h.favicon}))},
  {group:'Bookmarks',items:state.bookmarks.filter(h=>match(h.title,h.url)).slice(0,5).map(h=>({type:'url',url:h.url,title:h.title||h.url,detail:'Bookmark',icon:h.favicon}))},
  {group:'Settings',items:settings.filter(x=>match(x.name,x.detail)).map(x=>({type:'setting',id:x.id,title:x.name,detail:x.detail,iconText:'⚙'}))}
].filter(g=>g.items.length);}
export function initSearch({openApp,openGame,openUrl}){
  const overlay=document.getElementById('search-overlay'),input=document.getElementById('global-search-input'),root=document.getElementById('search-results');
  const open=(q='')=>{overlay.classList.remove('hidden');input.value=q;input.focus();render();}; const close=()=>overlay.classList.add('hidden');
  const render=()=>{const groups=searchAll(input.value);root.innerHTML=groups.length?groups.map(g=>`<section class="search-group"><h4>${esc(g.group)}</h4>${g.items.map(i=>`<button class="search-result" data-search-type="${i.type}" data-search-id="${esc(i.id||'')}" data-search-url="${esc(i.url||'')}"><span class="search-result-icon">${i.icon?`<img src="${esc(i.icon)}" alt="">`:esc(i.iconText||'⌕')}</span><div><strong>${esc(i.title)}</strong><small>${esc(i.detail||'')}</small></div><span>↗</span></button>`).join('')}</section>`).join(''):'<div class="search-empty">Type to search games, apps, history, bookmarks, and settings.</div>';};
  input.addEventListener('input',render);overlay.addEventListener('click',e=>{if(e.target===overlay)close();const r=e.target.closest('.search-result');if(!r)return;close();if(r.dataset.searchType==='game')openGame(r.dataset.searchId);if(r.dataset.searchType==='app')openApp(r.dataset.searchId);if(r.dataset.searchType==='url')openUrl(r.dataset.searchUrl);if(r.dataset.searchType==='setting')window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route:'settings'}}));});
  document.getElementById('global-search-trigger').onclick=()=>open();document.getElementById('home-search').onclick=()=>open();
  window.addEventListener('figureos:search',e=>open(e.detail?.query||''));
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}if(e.key==='Escape'&&!overlay.classList.contains('hidden'))close();});
  return {open,close};
}

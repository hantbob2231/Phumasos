import { state, onState } from './state.js';
const tasks = new Map();
const routeNames = {home:'Home',browser:'Browser',figure:'Figure',library:'Library',apps:'Apps',settings:'Settings'};
export function startTask(task){ tasks.set(task.id,{status:'running',closable:true,minimizable:true,...task}); renderTasks(); }
export function stopTask(id){ tasks.delete(id); renderTasks(); }
export function minimizeTask(id){ const t=tasks.get(id); if(t){t.status='minimized';renderTasks();} }
export function focusTask(id){ const t=tasks.get(id); if(!t)return; t.status='running'; t.focus?.(); renderTasks(); }
export function updateTask(id, patch){ const t=tasks.get(id); if(t){Object.assign(t,patch);renderTasks();} else startTask({id,...patch}); }
export function listTasks(){ return [...tasks.values()]; }
export function ensureRouteTask(route){ if(route==='home')return; const id=`app:${route}`; if(!tasks.has(id)) startTask({id,name:routeNames[route]||route,type:'app',route,focus:()=>window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route}})),minimize:()=>window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route:'home'}})),close:()=>window.dispatchEvent(new CustomEvent('figureos:route',{detail:{route:'home'}})),closable:true}); }
function iconFor(t){ return t.type==='game'?'▶':t.type==='browser'?'◫':'◆'; }
export function renderTasks(){
  const list=document.getElementById('task-list'), count=document.getElementById('task-count');
  if(count) count.textContent=String(tasks.size);
  document.querySelectorAll('#os-dock [data-route]').forEach(btn=>{ const route=btn.dataset.route; btn.classList.toggle('running',[...tasks.values()].some(t=>t.route===route || (route==='browser'&&t.type==='browser') || (route==='figure'&&t.type==='game'))); });
  if(!list)return;
  if(!tasks.size){list.innerHTML='<div class="search-empty">No running tasks.</div>';return;}
  list.innerHTML=[...tasks.values()].map(t=>`<div class="task-item" data-task="${t.id}"><div class="task-item-head"><span class="app-icon">${iconFor(t)}</span><div><strong>${escapeHtml(t.name)}</strong><small>${t.status==='minimized'?'Minimized':'Running'}${t.subtitle?` • ${escapeHtml(t.subtitle)}`:''}</small></div></div><div class="task-actions"><button data-task-action="focus">Focus</button>${t.minimizable!==false?'<button data-task-action="minimize">Minimize</button>':''}${t.closable!==false?'<button class="danger" data-task-action="close">Close</button>':''}</div></div>`).join('');
}
export function bindTaskUI(){
  document.getElementById('task-list')?.addEventListener('click',e=>{ const item=e.target.closest('[data-task]'); const action=e.target.closest('[data-task-action]')?.dataset.taskAction; if(!item||!action)return; const id=item.dataset.task,t=tasks.get(id); if(!t)return; if(action==='focus')focusTask(id); if(action==='minimize'){t.minimize?.();minimizeTask(id);} if(action==='close'){t.close?.();stopTask(id);} });
  onState(()=>renderTasks()); renderTasks();
}
function escapeHtml(s=''){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

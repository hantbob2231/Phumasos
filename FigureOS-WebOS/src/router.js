import { patchState, rememberApp, state } from './state.js';
import { ensureRouteTask } from './tasks.js';
const routes=new Set(['home','browser','figure','library','apps','settings']);
export function routeTo(route,{persist=true}={}){
  if(!routes.has(route))route='home';
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===route));
  document.querySelectorAll('#os-dock [data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  if(route!=='home'){ensureRouteTask(route);rememberApp(route);} if(persist)patchState({activeView:route});
  history.replaceState(null,'',route==='home'?'./':`#${route}`);
  window.dispatchEvent(new CustomEvent('figureos:routed',{detail:{route}}));
}
export function initRouter(){
  document.addEventListener('click',e=>{const el=e.target.closest('[data-route]');if(el){e.preventDefault();routeTo(el.dataset.route);}});
  window.addEventListener('figureos:route',e=>routeTo(e.detail.route));
  window.addEventListener('hashchange',()=>{const r=location.hash.slice(1);if(routes.has(r))routeTo(r);});
  const initial=routes.has(location.hash.slice(1))?location.hash.slice(1):(routes.has(state.activeView)?state.activeView:'home');routeTo(initial,{persist:false});
}

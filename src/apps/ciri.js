import { themes, applyTheme } from '../themes.js';
import { assistantProvider } from '../providers/assistantProvider.js';
import { state, patchState } from '../state.js';
const wallpaperOrder=['figure','void','aurora','ember','ocean'];
export function initCiri({openApp}){
  const panel=document.getElementById('ciri-panel'),form=document.getElementById('ciri-form'),input=document.getElementById('ciri-input'),thread=document.getElementById('ciri-thread');
  document.getElementById('ciri-trigger').onclick=()=>panel.classList.toggle('open');
  form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value='';append('user',text);const local=routeCommand(text,openApp);if(local){append('assistant',local);return;}append('assistant','Thinking…','pending');const reply=await assistantProvider.send(text);thread.querySelector('[data-pending]')?.remove();append('assistant',reply);};
  function append(role,text,pending=''){const d=document.createElement('div');d.className=`ciri-message ${role}`;if(pending)d.dataset.pending='1';d.textContent=text;thread.appendChild(d);thread.scrollTop=thread.scrollHeight;}
}
function routeCommand(text,openApp){const q=text.trim().toLowerCase();const routes={figure:'figure',browser:'browser',settings:'settings',library:'library',apps:'apps'};for(const [name,id] of Object.entries(routes)){if(new RegExp(`^(open|switch to|go to) ${name}$`).test(q)){openApp(id);return `Opening ${name}.`;}}
  const game=q.match(/^search games? for (.+)$/);if(game){window.dispatchEvent(new CustomEvent('figureos:search',{detail:{query:game[1]}}));return `Searching the Figure library for “${game[1]}”.`;}
  const theme=q.match(/^change theme (?:to )?(.+)$/);if(theme){const id=Object.keys(themes).find(x=>x===theme[1]||themes[x].name.toLowerCase()===theme[1]);if(id){applyTheme(id);return `Theme changed to ${themes[id].name}.`;}return 'I could not find that FigureOS theme.';}
  if(q==='change wallpaper'||q==='next wallpaper'){const i=wallpaperOrder.indexOf(state.wallpaper);const next=wallpaperOrder[(i+1)%wallpaperOrder.length];patchState({wallpaper:next});window.dispatchEvent(new CustomEvent('figureos:wallpaper',{detail:{id:next}}));return `Wallpaper changed to ${next}.`;}
  if(q==='lock screen'||q==='lock figureos'){window.dispatchEvent(new CustomEvent('figureos:lock'));return 'Locking FigureOS.';}
  return '';
}

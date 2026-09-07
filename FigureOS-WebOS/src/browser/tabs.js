import { state, patchState } from '../state.js';
export function createTab(props={}){
  const tab={id:crypto.randomUUID(),title:'New Tab',url:'',favicon:'',mode:'start',history:[],historyIndex:-1,loading:false,...props};
  state.browserTabs.push(tab); state.activeBrowserTab=tab.id; patchState({browserTabs:state.browserTabs,activeBrowserTab:tab.id}); return tab;
}
export function activeTab(){return state.browserTabs.find(t=>t.id===state.activeBrowserTab)||null;}
export function getTab(id){return state.browserTabs.find(t=>t.id===id);}
export function activateTab(id){if(getTab(id)){state.activeBrowserTab=id;patchState({activeBrowserTab:id});return getTab(id);}return null;}
export function closeTab(id){const idx=state.browserTabs.findIndex(t=>t.id===id);if(idx<0)return null;const [closed]=state.browserTabs.splice(idx,1);if(!state.browserTabs.length)return {closed,needsNew:true};if(state.activeBrowserTab===id)state.activeBrowserTab=state.browserTabs[Math.min(idx,state.browserTabs.length-1)].id;patchState({browserTabs:state.browserTabs,activeBrowserTab:state.activeBrowserTab});return {closed,needsNew:false};}
export function duplicateTab(tab){return createTab({title:tab.title,url:tab.url,favicon:tab.favicon,mode:tab.mode,history:[...tab.history],historyIndex:tab.historyIndex});}

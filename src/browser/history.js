import { state, addHistory, patchState } from '../state.js';
export const historyStore={
  list:()=>state.history,
  add:addHistory,
  clear(){patchState({history:[]});},
  search(q){const s=q.toLowerCase();return state.history.filter(x=>(x.title||'').toLowerCase().includes(s)||x.url.toLowerCase().includes(s));}
};

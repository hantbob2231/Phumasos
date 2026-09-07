import { state, addBookmark, patchState } from '../state.js';
export const bookmarkStore={
  list:()=>state.bookmarks,
  toggle:addBookmark,
  remove(url){patchState({bookmarks:state.bookmarks.filter(x=>x.url!==url)});},
  search(q){const s=q.toLowerCase();return state.bookmarks.filter(x=>(x.title||'').toLowerCase().includes(s)||x.url.toLowerCase().includes(s));}
};

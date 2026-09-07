const KEY = 'figureos_state_v3';
const defaults = {
  activeView: 'home',
  theme: localStorage.getItem('figure_theme') || 'dark',
  particles: localStorage.getItem('fig_particles') || 'none',
  wallpaper: 'figure',
  customWallpaper: '',
  lockEnabled: false,
  browserSearchTemplate: '',
  history: [],
  bookmarks: [],
  customApps: [],
  notifications: [],
  recentApps: [],
  figureGames: [],
  activeFigureGame: null,
  browserTabs: [],
  activeBrowserTab: null
};
function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
export const state = load();
const listeners = new Set();
export function saveState() {
  const safe = { ...state, figureGames: [], browserTabs: state.browserTabs.map(t => ({...t, frame:null})) };
  localStorage.setItem(KEY, JSON.stringify(safe));
}
export function patchState(patch, persist = true) {
  Object.assign(state, patch);
  if (persist) saveState();
  listeners.forEach(fn => fn(state, patch));
}
export function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function rememberApp(id) {
  const recentApps = [id, ...state.recentApps.filter(x => x !== id)].slice(0, 8);
  patchState({ recentApps });
}
export function addHistory(entry) {
  if (!entry?.url) return;
  const history = [{ ...entry, visitedAt: Date.now() }, ...state.history.filter(x => x.url !== entry.url)].slice(0, 120);
  patchState({ history });
}
export function addBookmark(entry) {
  if (!entry?.url) return;
  const exists = state.bookmarks.some(x => x.url === entry.url);
  const bookmarks = exists ? state.bookmarks.filter(x => x.url !== entry.url) : [{...entry, createdAt:Date.now()}, ...state.bookmarks].slice(0, 80);
  patchState({ bookmarks });
  return !exists;
}
export function notify(title, message, type='system') {
  const item = { id: crypto.randomUUID(), title, message, type, createdAt: Date.now() };
  state.notifications = [item, ...state.notifications].slice(0, 40);
  saveState(); listeners.forEach(fn => fn(state, { notifications: state.notifications }));
  window.dispatchEvent(new CustomEvent('figureos:notify', { detail:item }));
  return item;
}
export function clearNotifications() { patchState({notifications:[]}); }

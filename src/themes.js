import { state, patchState } from './state.js';
export const themes = {
  dark:{name:'Dark',bg:'#050505',accent:'#ffffff',border:'rgba(255,255,255,.09)'},
  figure:{name:'Figure',bg:'#0c0202',accent:'#ff3333',border:'rgba(255,50,50,.15)'},
  neon:{name:'Neon',bg:'#020b14',accent:'#00d2ff',border:'rgba(0,210,255,.15)'},
  forest:{name:'Forest',bg:'#010f08',accent:'#05c46b',border:'rgba(5,196,107,.15)'},
  sunset:{name:'Sunset',bg:'#120410',accent:'#f53b57',border:'rgba(245,59,87,.15)'},
  amethyst:{name:'Amethyst',bg:'#0a0310',accent:'#a55eea',border:'rgba(165,94,234,.15)'},
  gold:{name:'Gold',bg:'#0f0e05',accent:'#f1c40f',border:'rgba(241,196,15,.15)'},
  hacker:{name:'Hacker',bg:'#020802',accent:'#00ff00',border:'rgba(0,255,0,.15)'},
  ocean:{name:'Ocean',bg:'#020914',accent:'#0abde3',border:'rgba(10,189,227,.15)'},
  lava:{name:'Lava',bg:'#140402',accent:'#ee5253',border:'rgba(238,82,83,.15)'},
  cyberp:{name:'Cyber',bg:'#110214',accent:'#D980FA',border:'rgba(217,128,250,.15)'},
  ice:{name:'Ice',bg:'#050a0f',accent:'#c8d6e5',border:'rgba(200,214,229,.15)'},
  rose:{name:'Rose',bg:'#14020a',accent:'#f368e0',border:'rgba(243,104,224,.15)'},
  mint:{name:'Mint',bg:'#02140d',accent:'#1dd1a1',border:'rgba(29,209,161,.15)'},
  crimson:{name:'Crimson',bg:'#140101',accent:'#c23616',border:'rgba(194,54,22,.15)'}
};
const hexRgb = hex => { const n=parseInt(hex.slice(1),16); return `${(n>>16)&255},${(n>>8)&255},${n&255}`; };
export function applyTheme(id, syncFigure=true) {
  const t = themes[id] || themes.dark;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg); r.setProperty('--accent', t.accent); r.setProperty('--accent-rgb', hexRgb(t.accent)); r.setProperty('--border', t.border);
  localStorage.setItem('figure_theme', id); patchState({theme:id});
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  document.getElementById('theme-status')?.replaceChildren(document.createTextNode(t.name));
  if(syncFigure) document.getElementById('figure-frame')?.contentWindow?.postMessage({source:'figureos-parent',type:'figure:set-theme',theme:id}, location.origin);
  window.dispatchEvent(new CustomEvent('figureos:theme',{detail:{id,theme:t}}));
}
export function initTheme(){ applyTheme(state.theme, false); }

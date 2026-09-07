import { state } from '../state.js';
export const coreApps = [
  {id:'figure',name:'Figure',icon:'◆',type:'iframe',route:'figure',description:'Original Figure game cloud and launcher.'},
  {id:'browser',name:'Browser',icon:'◫',type:'internal',route:'browser',description:'Tabbed browser for operator-approved destinations.'},
  {id:'library',name:'Library',icon:'▦',type:'internal',route:'library',description:'Search the Figure game catalog.'},
  {id:'music',name:'Music',icon:'♪',type:'window',description:'Local audio player. Audio never leaves your device.'},
  {id:'files',name:'Files',icon:'▤',type:'window',description:'Session file shelf placeholder with local file metadata.'},
  {id:'ciri',name:'CIRI',icon:'◉',type:'panel',description:'FigureOS command assistant with an abstract provider.'},
  {id:'settings',name:'Settings',icon:'⚙',type:'internal',route:'settings',description:'Themes, particles, wallpaper, browser, and PWA settings.'}
];
export function allApps(){ return [...coreApps, ...state.customApps.map(a=>({...a,type:'web'}))]; }
export function getApp(id){ return allApps().find(a=>a.id===id); }

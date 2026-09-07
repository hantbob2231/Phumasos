import { state, patchState } from './state.js';
let canvas,ctx,items=[],type='none',raf=0,mx=0,my=0;
const rand=(a,b)=>a+Math.random()*(b-a);
function resize(){if(!canvas)return;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);spawn();}
function spawn(){items=[];if(type==='none')return;const n=['snow','rain','matrix'].includes(type)?70:['fireflies','nexus'].includes(type)?48:28;for(let i=0;i<n;i++)items.push({x:rand(0,innerWidth),y:rand(0,innerHeight),vx:rand(-.3,.3),vy:rand(.2,1.2),s:rand(1,3),a:rand(.2,.8),ch:String.fromCharCode(0x30A0+Math.floor(Math.random()*70))});}
function draw(){raf=requestAnimationFrame(draw);if(!ctx)return;ctx.clearRect(0,0,innerWidth,innerHeight);if(type==='none')return;const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#fff';ctx.strokeStyle=accent;ctx.fillStyle=accent;ctx.lineWidth=.6;
  for(const p of items){ctx.globalAlpha=p.a;if(type==='rain'){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-3,p.y+12);ctx.stroke();p.y+=6;}
    else if(type==='stars'){ctx.fillRect(p.x,p.y,p.s,p.s);p.a=.25+.55*Math.abs(Math.sin((Date.now()/800)+p.x));}
    else if(type==='cyber'){ctx.fillRect(p.x,p.y,rand(12,32),1);p.x+=2.4;}
    else if(type==='matrix'){ctx.font=`${10+p.s*2}px monospace`;ctx.fillText(p.ch,p.x,p.y);p.y+=2;}
    else if(type==='bubbles'){ctx.beginPath();ctx.arc(p.x,p.y,p.s*3,0,Math.PI*2);ctx.stroke();p.y-=.5;}
    else {ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,Math.PI*2);ctx.fill();p.x+=p.vx;p.y+=type==='snow'?p.vy:.25*p.vy;if(type==='nexus'){for(const q of items){const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<70){ctx.globalAlpha=.08;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}}if(type==='fireflies'){const d=Math.hypot(mx-p.x,my-p.y);if(d<130){p.vx+=(p.x-mx)*.0004;p.vy+=(p.y-my)*.0004;}}}
    if(p.y>innerHeight+20)p.y=-20;if(p.y<-20)p.y=innerHeight+20;if(p.x>innerWidth+40)p.x=-40;if(p.x<-40)p.x=innerWidth+40;
  }ctx.globalAlpha=1;
}
export function applyParticles(next,syncFigure=true){type=next||'none';localStorage.setItem('fig_particles',type);patchState({particles:type});spawn();if(syncFigure)document.getElementById('figure-frame')?.contentWindow?.postMessage({source:'figureos-parent',type:'figure:set-particles',particles:type},location.origin);window.dispatchEvent(new CustomEvent('figureos:particles',{detail:{type}}));}
export function initParticles(){canvas=document.getElementById('os-particles');ctx=canvas.getContext('2d');window.addEventListener('resize',resize);window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});resize();applyParticles(state.particles,false);if(!raf)draw();}

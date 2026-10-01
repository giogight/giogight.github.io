(()=>{'use strict';
const reduced=matchMedia('(prefers-reduced-motion:reduce)');let active=null,heroActive=null,generation=0;
const labels={home:'我的观潮',workspace:'想好了么',schedule:'安排了么',decision:'定了么',games:'玩了么',travel:'逛了么',convert:'转好了么',author:'认识作者',downloads:'下载观潮'},symbols={home:'grid',workspace:'spark',schedule:'schedule',decision:'decision',games:'game',travel:'compass',convert:'convert',author:'camera',downloads:'download'};
const light=()=>innerWidth<=800||document.documentElement.dataset.gcMotion==='light';
function busy(){const running=!!(active||heroActive);document.documentElement.classList.toggle('gc-transitioning',running);if(running)window.GuanchaoAmbient?.pause('transition');else window.GuanchaoAmbient?.resume('transition');}
function remove(entry){if(!entry)return;clearTimeout(entry.timer);for(const a of entry.animations||[])a.cancel();entry.node.remove();entry.host?.classList.remove('hero-transforming');}
function clear(){generation++;const old=active,hero=heroActive;active=heroActive=null;remove(old);remove(hero);busy();}
function finishHero(entry,to){if(heroActive!==entry)return;heroActive=null;remove(entry);busy();const rev=generation;
 if(to==='night'&&!reduced.matches&&!document.hidden&&document.documentElement.dataset.theme==='night'){
  entry.host.classList.remove('cheers-active');requestAnimationFrame(()=>{if(rev===generation&&!heroActive&&document.documentElement.dataset.theme==='night')entry.host.classList.add('cheers-active');});
 }
}
function space(from,to){clear();const host=document.querySelector('.tide-art');if(!host||from===to||reduced.matches||document.hidden||getComputedStyle(host).display==='none')return;
 const figure=theme=>{const original=host.querySelector(theme==='night'?'.cheers-art':'.folder-art');if(!original)return null;const clone=original.cloneNode(true);clone.removeAttribute('hidden');clone.removeAttribute('id');clone.setAttribute('class','hero-space-figure');clone.setAttribute('aria-hidden','true');return clone;};
 const out=figure(from),incoming=figure(to);if(!out||!incoming)return;
 const node=document.createElement('div');node.className='hero-space-motion';node.setAttribute('aria-hidden','true');node.append(out,incoming);host.append(node);host.classList.add('hero-transforming');const current={node,host,animations:[]};heroActive=current;busy();
 const base=from==='day'?'rotateZ(-15deg) skewY(4deg)':'rotateZ(0deg)',end=to==='day'?'rotateZ(-15deg) skewY(4deg)':'rotateZ(0deg)',duration=light()?380:520,angle=light()?40:68;
 try{
  current.animations.push(out.animate([{opacity:1,transform:'translate3d(0,0,0) rotateY(0) '+base+' scale(1)'},{opacity:0,transform:'translate3d(-35px,0,0) rotateY(-'+angle+'deg) rotateZ(-18deg) scale(.8)'}],{duration:duration*.72,easing:'cubic-bezier(.4,0,.3,1)',fill:'both'}));
  current.animations.push(incoming.animate([{opacity:0,transform:'translate3d(35px,0,0) rotateY('+angle+'deg) rotateZ(12deg) scale(.8)',offset:0},{opacity:1,transform:'translate3d(0,0,0) rotateY(0) '+end+' scale(1)',offset:1}],{duration,easing:'cubic-bezier(.2,.8,.25,1)',fill:'both'}));
  current.timer=setTimeout(()=>finishHero(current,to),duration+120);Promise.allSettled(current.animations.map(a=>a.finished)).then(()=>finishHero(current,to));
 }catch{finishHero(current,to);}
}
function card(key,space){const e=document.createElement('div');e.className='motion-card motion-'+key;const mark=document.createElement('span');mark.className='motion-card-icon';mark.append(window.Guanchao.icon(key==='home'?(space==='night'?'cheers':'grid'):(symbols[key]||'grid')));const title=document.createElement('strong');title.textContent=key==='home'?(space==='night'?'夜间空间':'日间空间'):(labels[key]||'观潮');const brand=document.createElement('small');brand.textContent='观潮';e.append(mark,brand,title);return e;}
function finish(entry){if(active!==entry)return;active=null;remove(entry);busy();}
function begin(from,to,spaces={}){clear();if(reduced.matches||document.hidden)return;
 const node=document.createElement('div');node.className='module-motion';node.setAttribute('aria-hidden','true');const departing=card(from,spaces.fromSpace),arriving=card(to,spaces.toSpace);node.append(departing,arriving);document.body.append(node);const current={node,animations:[]};active=current;busy();const duration=light()?350:460,angle=light()?30:62;
 try{
  current.animations.push(departing.animate([{opacity:0,transform:'translate3d(-8%,0,0) rotateY(-8deg) scale(.9)',offset:0},{opacity:.8,transform:'translate3d(-12%,0,0) rotateY(-18deg) scale(.96)',offset:.14},{opacity:0,transform:'translate3d(-75%,0,0) rotateY(-'+angle+'deg) scale(.88)',offset:.65},{opacity:0,transform:'translate3d(-75%,0,0) rotateY(-'+angle+'deg) scale(.88)',offset:1}],{duration,easing:'cubic-bezier(.22,.7,.25,1)',fill:'both'}));
  current.animations.push(arriving.animate([{opacity:0,transform:'translate3d(75%,0,0) rotateY('+angle+'deg) scale(.88)',offset:0},{opacity:1,transform:'translate3d(18%,0,0) rotateY(18deg) scale(.96)',offset:.4},{opacity:1,transform:'translate3d(0,0,0) rotateY(0) scale(1)',offset:.72},{opacity:0,transform:'translate3d(0,0,0) rotateY(0) scale(1.04)',offset:1}],{duration,easing:'cubic-bezier(.22,.7,.25,1)',fill:'both'}));
  current.timer=setTimeout(()=>finish(current),duration+120);Promise.allSettled(current.animations.map(a=>a.finished)).then(()=>finish(current));
 }catch{finish(current);}
}
window.GuanchaoMotion={begin,space,clear};
document.querySelectorAll('.module-card').forEach(card=>{let bounds,frame=0,point;
 card.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!reduced.matches&&!light())bounds=card.getBoundingClientRect();});
 card.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced.matches||light()||!bounds)return;point={x:e.clientX,y:e.clientY};if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(document.hidden||card.closest('[hidden]')||!bounds||!point)return;card.style.setProperty('--tilt-x',((.5-(point.y-bounds.top)/bounds.height)*7).toFixed(1)+'deg');card.style.setProperty('--tilt-y',(((point.x-bounds.left)/bounds.width-.5)*9).toFixed(1)+'deg');});});
 card.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);frame=0;bounds=point=null;card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');});
});
reduced.addEventListener('change',()=>{if(reduced.matches)clear();});document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();

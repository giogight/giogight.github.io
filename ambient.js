(()=>{'use strict';
const host=document.querySelector('.ambient-background'),svg=host?.querySelector('svg');
if(!svg)return;
const home=document.getElementById('homePage'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),connection=navigator.connection;
const reasons=new Set();let resizeTimer;
const glow=svg.querySelector('#glow feGaussianBlur'),silk=svg.querySelector('#silk feGaussianBlur');
svg.querySelector('g[filter="url(#glow)"]')?.classList.add('ambient-soft-glow');
function mode(){return reduced.matches?'reduced':innerWidth<=800||connection?.saveData||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4)?'light':'full';}
function sync(){const hidden=document.hidden,busy=reasons.size>0,away=!!home?.hidden;
 host.classList.toggle('ambient-paused',hidden||busy||away||reduced.matches);
 document.documentElement.classList.toggle('gc-motion-paused',hidden||busy);
 document.documentElement.classList.toggle('gc-home-inactive',away);
}
function configure(){const light=mode()!=='full';document.documentElement.dataset.gcMotion=mode();
 svg.setAttribute('viewBox',innerWidth<=800?'650 0 800 1100':'0 0 1440 960');
 glow?.setAttribute('stdDeviation',light?'12':'22');silk?.setAttribute('stdDeviation',light?'1':'2');sync();
}
// Curves are immutable. CSS moves one rasterized layer instead of repainting seven filtered paths at 24 Hz.
host.classList.add('has-live-ribbons');configure();
window.GuanchaoAmbient=Object.freeze({pause(reason='manual'){reasons.add(reason);sync();},resume(reason='manual'){reasons.delete(reason);sync();},get mode(){return mode();}});
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(configure,80);});
document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',configure);connection?.addEventListener?.('change',configure);
if(home)new MutationObserver(sync).observe(home,{attributes:true,attributeFilter:['hidden']});
})();

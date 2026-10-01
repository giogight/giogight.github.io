(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GuanchaoMapTiles=api;})(typeof window!=='undefined'?window:this,()=>{'use strict';
const providers=[
 {name:'OpenStreetMap',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'},
 {name:'CARTO',url:'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'}
];
// Switch only after a failed batch. Keep one provider active to avoid duplicate traffic.
function create(map,{leaflet=window.L,onStatus=()=>{},isActive=()=>true,timeout=10000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let layer=null,index=0,timer=null,revision=0,loaded=0,failed=0,state='loading',destroyed=false;
 function emit(next){state=next;onStatus({state,provider:providers[index].name,index,loaded,failed});}
 function stopTimer(){if(timer!==null)clearTimer(timer);timer=null;}
 function next(){if(destroyed||!isActive())return;stopTimer();if(index+1<providers.length)install(index+1);else emit('unavailable');}
 function arm(token){stopTimer();timer=setTimer(()=>{timer=null;if(token!==revision||destroyed||!isActive())return;if(!loaded)next();},timeout);}
 function install(nextIndex){stopTimer();revision++;const token=revision;if(layer){layer.off?.();map.removeLayer?.(layer);}index=nextIndex;loaded=failed=0;emit(index?'switching':'loading');layer=leaflet.tileLayer(providers[index].url,{maxZoom:19,keepBuffer:1,updateWhenIdle:true,updateWhenZooming:false,attribution:providers[index].attribution});
 layer.on('loading',()=>{if(token!==revision)return;loaded=failed=0;arm(token);});
 layer.on('tileload',()=>{if(token!==revision)return;loaded++;stopTimer();if(!failed)emit('ready');});
 layer.on('tileerror',()=>{if(token!==revision)return;failed++;if((!loaded&&failed>=2)||failed>=3)next();else emit('partial');});
 layer.on('load',()=>{if(token!==revision)return;stopTimer();if(!loaded&&failed)next();else if(loaded)emit(failed?'partial':'ready');});
 layer.addTo(map);arm(token);
 }
 install(0);
 return {retry(){if(!destroyed)install(0);},resume(){if(!destroyed&&['loading','switching','partial'].includes(state)&&!loaded)arm(revision);},destroy(){destroyed=true;stopTimer();revision++;layer?.off?.();if(layer)map.removeLayer?.(layer);},snapshot:()=>({state,provider:providers[index].name,index,loaded,failed})};
}
return {create,providers};
});

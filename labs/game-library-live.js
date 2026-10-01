(()=>{'use strict';
const D=window.XWTools;if(!D)return;
const key='gc-games-library-v1',maxBytes=3*1024*1024;
const validate=value=>{if(!value||value.schema!==1||typeof value.version!=='string'||value.version.length>80||!Number.isFinite(Date.parse(value.checkedAt))||!Array.isArray(value.games)||!value.games.length||value.games.length>5000)throw Error('游戏资料不完整');return value;};
function apply(value){validate(value);D.setGames(value.games);document.documentElement.dataset.gameLibraryVersion=value.version;dispatchEvent(new CustomEvent('guanchao:games-updated',{detail:{version:value.version,checkedAt:value.checkedAt,count:value.games.length}}));}
let cached=null;try{const raw=localStorage.getItem(key);if(raw&&raw.length<=maxBytes)cached=validate(JSON.parse(raw));}catch{}
if(cached&&typeof D.setGames==='function')try{apply(cached);}catch{}
let native=location.protocol==='file:';try{native=native||!!parent.guanchao||!!parent.Guanchao?.native||!!parent.Capacitor?.isNativePlatform?.();}catch{}
const endpoint=native?'https://giogight.github.io/labs/games-library.json':new URL('games-library.json',location.href).href;
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
fetch(endpoint,{signal:controller.signal,cache:'no-cache'}).then(async response=>{if(!response.ok)throw Error('游戏资料未能更新');const size=Number(response.headers.get('content-length'));if(size>maxBytes)throw Error('游戏资料过大');const raw=await response.text();if(raw.length>maxBytes)throw Error('游戏资料过大');const value=validate(JSON.parse(raw));if(cached&&Date.parse(value.checkedAt)<Date.parse(cached.checkedAt))return;apply(value);try{localStorage.setItem(key,raw);}catch{}}).catch(()=>{}).finally(()=>clearTimeout(timer));
})();

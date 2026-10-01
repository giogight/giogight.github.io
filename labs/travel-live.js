(()=>{'use strict';
const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const KEY='gc-travel-live-favorites-v1',cache=new Map(),MAX_PLACES=120;
const plannerOpen=()=>document.getElementById('legacyTravelPlanner')?.open!==false;
const municipalities=new Set(['北京','北京市','天津','天津市','上海','上海市','重庆','重庆市']);
let saved=[],selected=null,places=[],busy=false,lastRequest=0,revision=0,controller=null,timer=null;
function normalizeCity(source){
  if(!source||typeof source!=='object')return null;
  const parsed=/^(node|way|relation)\/(\d+)$/.exec(String(source.key||''));
  const osmType=source.osmType||source.osm_type||parsed?.[1],osmId=Number(source.osmId??source.osm_id??parsed?.[2]);
  if(source.lat==null||source.lon==null||String(source.lat).trim()===''||String(source.lon).trim()==='')return null;
  const lat=Number(source.lat),lon=Number(source.lon),display=String(source.display??source.display_name??'');
  const name=String(source.name||display.split(',')[0]||'').trim();
  if(!name||!['node','way','relation'].includes(osmType)||!Number.isSafeInteger(osmId)||osmId<=0||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
  const raw=source.bbox||source.boundingbox;let bbox=null;
  if(Array.isArray(raw)&&raw.length===4){const b=raw.map(Number);if(b.every(Number.isFinite)&&b[0]<b[1]&&b[2]<b[3]&&b[0]>=-90&&b[1]<=90&&b[2]>=-180&&b[3]<=180)bbox=b;}
  return {key:osmType+'/'+osmId,osmType,osmId,name,display,lat,lon,bbox,addresstype:String(source.addresstype||''),type:String(source.type||''),category:String(source.category||source.class||'')};
}
function queryForCity(city){
  const boundary=city.osmType==='relation'&&(city.type==='administrative'||city.category==='boundary'||['city','town','village','municipality','county','district','borough','suburb','state','province','region','country'].includes(city.addresstype));
  const wideKind=['country','continent','state','province','region'].includes(city.addresstype);
  if(boundary||wideKind){
    if(!city.bbox)throw Error('这个收藏缺少地区范围，请重新搜索具体城市或区县');
    const [south,north,west,east]=city.bbox,width=(east-west)*111.32*Math.cos((north+south)/2*Math.PI/180),height=(north-south)*111.32;
    if(Math.max(width,height)>1000||width*height>350000||(wideKind&&!municipalities.has(city.name)&&width*height>30000))throw Error('这个地区范围较大，请搜索具体城市、城区或区县');
  }
  const area=boundary?3600000000+city.osmId:null;
  const selector=area?'area.destination':'around:7000,'+city.lat.toFixed(5)+','+city.lon.toFixed(5);
  const query='[out:json][timeout:25];'+(area?'area('+area+')->.destination;.destination out ids;':'')+'(nwr('+selector+')[tourism~"^(attraction|museum|gallery|viewpoint|zoo|theme_park|aquarium)$"][name];nwr('+selector+')[leisure=park][name];nwr('+selector+')[historic~"^(castle|monument|archaeological_site)$"][name];);out center tags '+MAX_PLACES+';';
  return {query,area,mode:area?'area':'nearby',scopeText:area?'目的地行政区域内':'该目的地坐标周边约7公里'};
}
try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data))saved=data.map(normalizeCity).filter(Boolean).slice(0,30);}catch{}
function status(s){$('liveTravelStatus').textContent=s;}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));return true;}catch{return false;}}
function link(text,url){const a=el('a',text);try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;a.href=u.href;}catch{return null;}a.target='_blank';a.rel='noopener noreferrer';return a;}
async function getJSON(url,timeout=25000){const ac=new AbortController();controller=ac;const time=setTimeout(()=>ac.abort(),timeout);try{const response=await fetch(url,{signal:ac.signal});if(!response.ok)throw Error(response.status===429?'更新请求较多，请稍后重试':'旅行资料服务暂时不可用');const text=await response.text();if(text.length>15*1024*1024)throw Error('返回的资料过大，请换一个较小的地区');return JSON.parse(text);}finally{clearTimeout(time);if(controller===ac)controller=null;}}
function favorites(){const host=$('liveFavorites');host.replaceChildren();for(const city of saved){const chip=el('span',null,'live-favorite'),b=el('button',city.name),remove=el('button','×');b.type=remove.type='button';b.onclick=()=>loadCity(city);remove.setAttribute('aria-label','移除联网收藏 '+city.name);remove.onclick=()=>{saved=saved.filter(c=>c.key!==city.key);persist();favorites();};chip.append(b,remove);host.append(chip);}}
function saveCity(city){if(saved.some(c=>c.key===city.key))return;if(saved.length>=30){status('最多收藏30个联网目的地，请先移除一些。');return;}saved.push({...city});status(persist()?'已收藏 '+city.name+'，下次可以直接联网更新。':'浏览器无法保存收藏，本次仍可查看。');favorites();}
async function completeCity(city){
  const stored=cache.get('meta:'+city.key);if(stored)return stored;
  if(city.osmType!=='relation'||(city.bbox&&city.addresstype))return city;
  // Old favorites only stored a relation key and a center; recover the actual boundary metadata.
  const wait=Math.max(0,1200-(Date.now()-lastRequest));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastRequest=Date.now();
  const payload=await getJSON('https://nominatim.openstreetmap.org/lookup?'+new URLSearchParams({osm_ids:'R'+city.osmId,format:'jsonv2',addressdetails:'1','accept-language':'zh-CN'}));
  const enriched=Array.isArray(payload)?payload.map(normalizeCity).find(c=>c?.key===city.key):null;
  if(!enriched)throw Error('这个旧收藏暂时无法恢复地区范围，请重新搜索城市');
  cache.set('meta:'+city.key,enriched);const index=saved.findIndex(c=>c.key===city.key);if(index>=0){saved[index]=enriched;persist();favorites();}return enriched;
}
$('liveCityForm').onsubmit=async event=>{event.preventDefault();if(busy)return;const q=$('liveCityInput').value.trim();if(!q)return;const now=Date.now();if(now-lastRequest<1200){status('请稍等片刻后再搜索。');return;}lastRequest=now;busy=true;$('liveSearchButton').disabled=true;const version=++revision;status('正在联网查找旅行目的地…');try{let results=cache.get('search:'+q);if(!results){const data=await getJSON('https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'jsonv2',limit:'5',addressdetails:'1','accept-language':'zh-CN'}));if(!Array.isArray(data))throw Error('目的地资料响应不完整');results=data.map(normalizeCity).filter(Boolean);cache.set('search:'+q,results);for(const city of results)cache.set('meta:'+city.key,city);}if(version!==revision)return;$('liveCityResults').replaceChildren();for(const city of results){const b=el('button',null,'live-city-result');b.type='button';b.append(el('strong',city.name),el('small',city.display));b.onclick=()=>loadCity(city);$('liveCityResults').append(b);}status(results.length?'请选择你要旅行的城市或地区。':'没有查到这个地区，请使用城市全名或加上国家 / 省份。');}catch(e){if(version===revision)status('联网搜索未完成：'+(e.name==='AbortError'?'连接超时，请稍后重试':e.message)+'。已有收藏与离线规划仍可使用。');}finally{busy=false;$('liveSearchButton').disabled=false;}};
function category(tags){const names={museum:'博物馆',gallery:'美术馆',viewpoint:'观景点',attraction:'景点',zoo:'动物园',theme_park:'主题公园',aquarium:'水族馆',park:'公园',castle:'历史建筑',monument:'历史纪念地',archaeological_site:'考古遗址'};return names[tags.tourism]||names[tags.leisure]||names[tags.historic]||'旅行地点';}
function scheduleRefresh(city){clearTimeout(timer);if(!plannerOpen())return;timer=setTimeout(()=>{if(plannerOpen()&&!document.hidden&&location.hash==='#travel'&&window.GuanchaoTravelMap.live&&!busy)loadCity(city,true);},600000);}
async function loadCity(input,force=false){
  if(busy||!plannerOpen())return;const initial=normalizeCity(input);if(!initial)return;busy=true;const version=++revision;clearTimeout(timer);status('正在更新 '+initial.name+' 的旅游地点…');
  try{
    const city=await completeCity(initial),plan=queryForCity(city),key='places:'+city.key+':'+plan.mode;let data=cache.get(key);
    if(force||!data||Date.now()-data.at>600000){
      const payload=await getJSON('https://overpass-api.de/api/interpreter?'+new URLSearchParams({data:plan.query}),35000);
      if(payload.remark)throw Error('旅游地点查询未完整完成，请稍后刷新或搜索具体城区');
      if(!Array.isArray(payload.elements))throw Error('旅行资料响应不完整');
      if(plan.area&&!payload.elements.some(p=>p.type==='area'&&p.id===plan.area))throw Error('该地区的地图边界尚未准备，请搜索具体城区或其他目的地');
      const list=[],unique=new Set(),records=payload.elements.filter(p=>['node','way','relation'].includes(p.type));
      for(const item of records){const lat=Number(item.lat??item.center?.lat),lon=Number(item.lon??item.center?.lon),tags=item.tags||{},name=tags['name:zh']||tags.name;if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||unique.has(name))continue;unique.add(name);list.push({key:item.type+'/'+item.id,name,lat,lon,category:category(tags),hours:tags.opening_hours||'',fee:tags.fee||'',website:tags.website||tags['contact:website']||'',url:'https://www.openstreetmap.org/'+item.type+'/'+item.id});if(list.length===MAX_PLACES)break;}
      data={at:Date.now(),items:list,scopeText:plan.scopeText,limitReached:records.length>=MAX_PLACES};cache.set(key,data);
    }
    if(version!==revision)return;selected=city;places=data.items.map(p=>({...p}));window.GuanchaoTravelMap.show(city,places,{scope:data.scopeText});renderPlaces(city,data);
    status('已更新 '+city.name+' · '+places.length+' 个旅游地点'+(data.limitReached?' · 本次返回上限120条，搜索具体城区可缩小范围':'')+' · '+new Date(data.at).toLocaleString('zh-CN'));
    $('travelOutput').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});scheduleRefresh(city);
  }catch(e){if(version===revision)status('旅游资料更新失败：'+(e.name==='AbortError'?'连接超时':e.message)+'。上一次结果仍保留，可稍后重试。');}finally{busy=false;}
}
function renderPlaces(city,data){const host=$('livePlacesPanel');host.hidden=false;host.replaceChildren();const head=el('div',null,'live-results-head'),copy=el('div');copy.append(el('h3',city.name+' · 当前旅游地点'),el('p','地图记录查询于 '+new Date(data.at).toLocaleString('zh-CN')+' · '+data.scopeText+' · 最多返回120条'));const actions=el('div'),refresh=el('button','刷新资料 ↻','text-button'),save=el('button',saved.some(c=>c.key===city.key)?'已收藏':'收藏目的地','text-button');refresh.type=save.type='button';refresh.onclick=()=>loadCity(city,true);save.onclick=()=>{saveCity(city);save.textContent='已收藏';};actions.append(refresh,save);head.append(copy,actions);host.append(head,el('p','来自 OpenStreetMap 的当前地点记录，每10分钟在联网目的地页刷新。营业时间、收费与网站地址由地图贡献者维护，可能不完整；预约和实际价格请查景点网站。','fine-print'));const grid=el('div',null,'live-place-grid');for(const place of places){const card=el('article',null,'live-place-card'),open=el('button',place.name);open.type='button';open.onclick=()=>window.GuanchaoTravelMap.focus(place);card.append(el('small',place.category),open);if(place.hours)card.append(el('p','营业记录：'+place.hours));if(place.fee)card.append(el('p','收费记录：'+({yes:'收费',no:'免费'}[place.fee]||place.fee)));const links=el('div'),source=link('地点记录 ↗',place.url),web=place.website?link('景点网站 ↗',place.website):null;if(source)links.append(source);if(web)links.append(web);card.append(links);grid.append(card);}if(!places.length)grid.append(el('p','该地区暂未返回有名称的旅游地点，可以搜索具体城区或另一座城市。','fine-print'));host.append(grid);}
window.GuanchaoTravelLive={resetView(){if(selected)window.GuanchaoTravelMap.reset(selected);}};
addEventListener('message',e=>{if(e.source!==parent||(e.origin!==location.origin&&!(location.protocol==='file:'&&e.origin==='null')))return;if(e.data?.type==='guanchao:pause'){clearTimeout(timer);controller?.abort();}if(e.data?.type==='guanchao:resume'&&selected&&!busy)scheduleRefresh(selected);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);controller?.abort();}});document.getElementById('legacyTravelPlanner')?.addEventListener('toggle',()=>{if(!plannerOpen()){clearTimeout(timer);controller?.abort();}else if(selected&&!busy)scheduleRefresh(selected);});favorites();
})();

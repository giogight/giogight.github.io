(() => {
  'use strict';
  const D = window.XWTools;
  const $ = id => document.getElementById(id);
  // All user-provided strings enter the DOM as text, never HTML.
  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  function link(text, url) {
    const a = el('a', text);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function download(name, text, type='text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = el('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy(text, status) {
    try { await navigator.clipboard.writeText(text); status.textContent = '已复制，可以发给朋友了。'; }
    catch { download('小文的出发计划.txt', text); status.textContent = '浏览器未允许复制，已改为下载文字文件。'; }
  }
  let matchedGames = [], shownGames = [];
  function gameOptions() {
    return { size:Number($('partySize').value), platform:$('gamePlatform').value,
      time:Number($('gameTime').value), mood:$('gameMood').value,
      free:$('freeOnly').checked, easy:$('beginnerOnly').checked };
  }
  function renderGames(random=false) {
    const options=gameOptions();
    matchedGames=D.matchGames(options);
    shownGames=random&&matchedGames.length ? [matchedGames[Math.floor(Math.random()*matchedGames.length)]] : matchedGames.slice(0,3);
    $('gameResults').replaceChildren();
    $('gameSummary').textContent=matchedGames.length
      ? '找到 '+matchedGames.length+' 款合适游戏 · '+(random?'这次就选它':'先看看这 '+shownGames.length+' 款')
      : '这组条件暂时没有匹配';
    for(const [i,g] of shownGames.entries()) {
      const card=el('article',undefined,'game-card');
      const content=el('div');
      content.append(el('h3',g.name),el('p',g.desc));
      const badges=el('div',undefined,'badges');
      [options.size+' 人可玩','建议留出 '+g.time+' 分钟',g.free.includes(options.platform)?'免费入门':'付费游戏',g.easy?'新手友好':'需要磨合'].forEach(t=>badges.append(el('span',t,'badge')));
      content.append(badges,el('p',g.note,'fine-print'));
      card.append(el('span',String(i+1).padStart(2,'0'),'card-number'),content,link('官方 ↗',g.url));
      $('gameResults').append(card);
    }
    if(!shownGames.length) $('gameResults').append(el('p','试试增加可玩时间、取消“只看免费”，或把气氛改为“都可以”。不会为了凑数给你推荐人数不合适的游戏。','empty-state'));
    $('randomGame').disabled=!matchedGames.length;
    $('copyGame').disabled=!shownGames.length;
    $('gameNotice').textContent='';
  }
  $('gameForm').addEventListener('submit',e=>{e.preventDefault();renderGames();});
  $('gameForm').addEventListener('change',()=>renderGames());
  $('randomGame').addEventListener('click',()=>renderGames(true));
  $('copyGame').addEventListener('click',()=>{
    const o=gameOptions();
    copy('今晚一起玩！'+o.size+' 人 / '+(o.platform==='pc'?'电脑':'手机')+' / 预留 '+o.time+' 分钟\n'+shownGames.map(g=>g.name+'：'+g.desc+'\n'+g.url).join('\n\n')+'\n来自小文的游戏搭子决策器：https://giogight.github.io/#game-lab',$('gameNotice'));
  });
  renderGames();

  const storageKey='xw-travel-favorites-v1';
  let favorites=[], storageAvailable=true;
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
    if(Array.isArray(saved)) favorites=[...new Set(saved.filter(x=>typeof x==='string'&&D.cities.some(c=>c.name===x)))];
  } catch { storageAvailable=false; }
  const persist=()=>{
    try { localStorage.setItem(storageKey,JSON.stringify(favorites)); storageAvailable=true; }
    catch { storageAvailable=false; $('importStatus').textContent='浏览器暂时不能保存收藏，请用“导出收藏”备份；本次页面仍可使用。'; }
  };
  D.cities.forEach(c=>{
    const o=el('option');o.value=c.name;$('cityOptions').append(o);
    const choice=el('option',c.name);choice.value=c.name;$('exploreCity').append(choice);
  });
  for(let month=1;month<=12;month++){const o=el('option',month+' 月');o.value=month;$('travelMonth').append(o);}
  $('travelMonth').value=String(new Date().getMonth()+1);
  function renderFavorites() {
    $('cityChips').replaceChildren();
    for(const name of favorites) {
      const chip=el('span',undefined,'city-chip'), remove=el('button','×');
      remove.type='button';remove.setAttribute('aria-label','移除 '+name);
      remove.addEventListener('click',()=>{favorites=favorites.filter(n=>n!==name);persist();renderFavorites();analyzeTravel();});
      chip.append(el('span',name),remove);$('cityChips').append(chip);
    }
    if(!favorites.length) $('cityChips').append(el('p','还没有收藏。添加几个喜欢的城市，让推荐更懂你。','fine-print'));
    const selected=D.cities.filter(c=>favorites.includes(c.name)), counts={};
    selected.forEach(c=>c.tags.forEach(t=>{counts[t]=(counts[t]||0)+1;}));
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    $('cityStats').textContent='已收藏 '+favorites.length+' 座城市 · '+new Set(selected.map(c=>c.region)).size+' 个地区'+(ranked.length?'｜兴趣统计：'+ranked.map(([t,n])=>D.tags[t]+' '+n).join(' / '):'')+'。目前支持 '+D.cities.length+' 座城市。';
  }
  function importCities(text,isJSON=false) {
    try {
      const parsed=D.parseCities(text,isJSON), before=favorites.length;
      const existing=parsed.known.filter(n=>favorites.includes(n)).length;
      favorites=[...new Set([...favorites,...parsed.known])];
      persist();renderFavorites();analyzeTravel();
      $('importStatus').textContent='新增 '+(favorites.length-before)+' 座；跳过重复 '+(existing+parsed.duplicates)+' 项。'
        +(parsed.unknown.length?'暂不支持：'+parsed.unknown.slice(0,8).join('、')+(parsed.unknown.length>8?'等 '+parsed.unknown.length+' 项':'')+'。请从输入框提示的城市中选择。':'')
        +(!parsed.known.length&&!parsed.unknown.length?'请输入至少一个城市名。':'')
        +(!storageAvailable?'未能保存到浏览器，请导出备份。':'');
    } catch(error) { $('importStatus').textContent=error.message; }
  }
  $('cityForm').addEventListener('submit',e=>{e.preventDefault();importCities($('cityInput').value);$('cityInput').value='';});
  $('importPaste').addEventListener('click',()=>importCities($('cityPaste').value));
  $('cityFile').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    if(!/\.(txt|csv|json)$/i.test(file.name)){ $('importStatus').textContent='只支持 TXT、CSV、JSON；Excel 请先另存为 CSV。'; e.target.value=''; return; }
    if(file.size>100000){$('importStatus').textContent='文件超过 100KB，请缩小名单后重试。';e.target.value='';return;}
    try { importCities(await file.text(),/\.json$/i.test(file.name)); }
    catch { $('importStatus').textContent='文件读取失败，请改为粘贴城市名。'; }
    e.target.value='';
  });
  $('exportCities').addEventListener('click',()=>download('我的旅行城市.json',JSON.stringify(favorites,null,2),'application/json'));
  $('downloadSample').addEventListener('click',()=>download('城市名单模板.csv','\uFEFF城市\n天津\n成都\n杭州\n'));
  function travelOptions() {
    return {favorites,month:Number($('travelMonth').value),days:Number($('travelDays').value),
      budget:Number($('travelBudget').value),interests:Array.from(document.querySelectorAll('input[name=interest]:checked'),n=>n.value)};
  }
  let map=null,cityLayer=null,routeLayer=null,ranking=[],selectedCity='',tilesReady=false;
  const mapStatus=$('mapStatus');
  function initMap() {
    if(!window.L) {
      $('travelMap').append(el('p','地图组件暂时不可用，下方城市推荐与攻略仍可正常使用。','map-fallback'));
      mapStatus.textContent='地图未加载；请使用下方城市按钮选择目的地。';
      $('resetMap').disabled=true;return;
    }
    map=L.map('travelMap',{scrollWheelZoom:false}).setView([32.8,110.5],4);
    cityLayer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    tiles.on('tileload',()=>{tilesReady=true;mapStatus.textContent='地图已加载 · 热度为你的偏好匹配分，不是实时客流。可缩放地图，点击城市查看攻略。';});
    tiles.on('tileerror',()=>{mapStatus.textContent='部分底图未能加载，可稍后刷新；城市标记与下方攻略仍可使用。热度不是实时客流。';});
    setTimeout(()=>{if(!tilesReady)mapStatus.textContent='底图加载较慢或不可达。可使用下方城市推荐；标记是坐标示意，热度不是实时客流。';},10000);
    if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize()).observe($('travelMap'));
  }
  function heatColor(score) {return score>=75?'#bd592b':score>=60?'#899741':'#487d70';}
  function showOverview() {
    if(map)map.fitBounds(L.latLngBounds(D.cities.map(c=>[c.lat,c.lng])),{padding:[30,30],maxZoom:4,animate:false});
  }
  function renderMap() {
    if(!map)return;
    cityLayer.clearLayers();
    for(const c of ranking) {
      const color=heatColor(c.score);
      L.circleMarker([c.lat,c.lng],{radius:16+c.score*.15,fillColor:color,fillOpacity:.16,stroke:false,interactive:false}).addTo(cityLayer);
      const marker=L.circleMarker([c.lat,c.lng],{radius:6+c.score*.045,color,weight:1.5,fillColor:color,fillOpacity:.7}).addTo(cityLayer);
      marker.bindTooltip(c.name+' · '+c.score+' 分',{direction:'top'});
      marker.on('click',()=>selectCity(c.name,true));
    }
  }
  function renderCityButtons() {
    $('cityResults').replaceChildren();
    const shortlist=ranking.slice(0,3);
    if(selectedCity&&!shortlist.some(c=>c.name===selectedCity))shortlist.push(ranking.find(c=>c.name===selectedCity));
    for(const c of shortlist) {
      if(!c)continue;
      const button=el('button',undefined,'city-result');button.type='button';
      button.setAttribute('aria-pressed',String(c.name===selectedCity));
      button.append(el('strong',c.name),el('span',c.score+' / 100'),el('small',c.tags.map(t=>D.tags[t]).join(' · ')));
      button.addEventListener('click',()=>selectCity(c.name,true));
      $('cityResults').append(button);
    }
  }
  function selectCity(name,zoom=false) {
    selectedCity=name;
    const c=ranking.find(c=>c.name===name), o=travelOptions();if(!c)return;
    $('exploreCity').value=name;
    renderCityButtons();
    const target=$('itinerary');target.replaceChildren();
    const heading=el('div',undefined,'itinerary-heading'),title=el('div');
    title.append(el('span','YOUR NEXT STOP / '+c.region,'lab-kicker'),el('h3',c.name+' · '+o.days+' 天慢游'));
    const score=el('span',String(c.score),'score');score.setAttribute('aria-label','匹配分 '+c.score);
    heading.append(title,score);target.append(heading,el('p',c.desc));
    const why='推荐理由：'+(c.matched.length?'贴合 '+c.matched.map(t=>D.tags[t]).join(' / '):'探索不同风格')+'；'+(c.season?'所选月份在建议出行季节内':'所选月份不在本目录优选季节，请额外核实天气')+'。';
    target.append(el('p',why));
    target.append(el('p','当地预算粗估约 '+c.budget+' 元 / 人 / 天，'+o.days+' 天约 '+(c.budget*o.days)+' 元（不含往返大交通，非实时报价）。'+(!c.affordable?'超过你设置的每日预算，可压缩住宿或换目的地。':'')+(!c.enough?'时间比建议的 '+c.days+' 天短，建议只选重点地区。':'')));
    const list=el('ol'),steps=[];
    for(let i=0;i<o.days;i++) {
      const spot=c.spots[i];
      const step=spot?{title:spot.name,note:spot.note}:{title:i===o.days-1?'自由活动与返程缓冲':'街区探索 / 留白日',note:'在住处附近安排一段慢游，按天气和体力调整，不额外塞入远距离景点。'};
      steps.push(step);
      const item=el('li'),body=el('div');body.append(el('strong',step.title),el('p',step.note));
      item.append(el('b','DAY '+String(i+1).padStart(2,'0')),body);list.append(item);
    }
    target.append(list,el('p','这是按地区整理的入门行程，不含已预订服务；同日衔接、实际车程和门票请出发前再核实。'));
    const actions=el('div',undefined,'small-actions'),save=el('button',favorites.includes(c.name)?'已收藏 ✓':'收藏这座城市 +','text-button');
    save.type='button';save.disabled=favorites.includes(c.name);
    save.addEventListener('click',()=>{favorites.push(c.name);persist();renderFavorites();analyzeTravel(c.name);});
    const copyButton=el('button','复制这份攻略 ↗','text-button');copyButton.type='button';
    const note=el('p','','fine-print');note.setAttribute('role','status');
    copyButton.addEventListener('click',()=>copy(c.name+' · '+o.days+' 天慢游\n'+why+'\n当地预算粗估：'+c.budget+' 元/人/天，不含往返大交通。\n'+steps.map((s,i)=>'第 '+(i+1)+' 天：'+s.title+'。'+s.note).join('\n')+'\n路线为编辑建议，开放、预约、交通和价格请另行核实。\n延伸阅读：'+c.source,note));
    actions.append(save,copyButton,link('查最新攻略与预约 ↗',c.source));
    target.append(actions,note);
    if(map) {
      routeLayer.clearLayers();
      const spots=c.spots.slice(0,o.days);
      L.polyline(spots.map(s=>[s.lat,s.lng]),{color:'#304d25',weight:2,dashArray:'5 7'}).addTo(routeLayer);
      spots.forEach((s,i)=>{
        L.circleMarker([s.lat,s.lng],{radius:7,color:'#253c1b',fillColor:'#deefae',fillOpacity:1,weight:2})
          .addTo(routeLayer).bindTooltip('DAY '+(i+1)+' · '+s.name,{permanent:zoom,direction:'top'});
      });
      if(zoom) map.fitBounds(L.latLngBounds(spots.map(s=>[s.lat,s.lng])),{padding:[45,50],maxZoom:12,animate:false});
    }
  }
  function analyzeTravel(keepCity='') {
    ranking=D.rankCities(travelOptions());
    renderMap();
    if(map&&!keepCity)showOverview();
    const o=travelOptions();
    $('travelSummary').textContent=(o.interests.length?'按本次兴趣':favorites.length?'按 '+favorites.length+' 座收藏城市的偏好':'还未添加偏好，先看均衡推荐')+' · '+o.month+' 月 / '+o.days+' 天 · 已分析 '+D.cities.length+' 座城市。点击城市查看地图与攻略。';
    selectCity(keepCity||ranking[0].name,false);
  }
  $('travelForm').addEventListener('submit',e=>{e.preventDefault();analyzeTravel();});
  $('travelForm').addEventListener('change',()=>analyzeTravel());
  $('resetMap').addEventListener('click',showOverview);
  $('exploreCity').addEventListener('change',e=>selectCity(e.target.value,true));
  initMap();renderFavorites();analyzeTravel();
  if(!storageAvailable)$('importStatus').textContent='之前的本地收藏无法读取，已使用空名单；可重新导入或添加城市。';
})();

(() => {
  'use strict';
  const D = window.XWTools;
  const platformNames={pc:'电脑 / PC',mobile:'手机',ps:'PlayStation / PS4 · PS5',switch:'Nintendo Switch',switch2:'Nintendo Switch 2'};
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
  let matchedGames = [], shownGames = [], expandedGames=false;
  function gameOptions() {
    return { size:Number($('partySize').value), platform:$('gamePlatform').value,
      time:Number($('gameTime').value), mood:$('gameMood').value,
      free:$('freeOnly').checked, easy:$('beginnerOnly').checked };
  }
  function renderGames(random=false,all=false) {
    expandedGames=all;
    const options=gameOptions();
    matchedGames=D.matchGames(options);
    shownGames=random&&matchedGames.length ? [matchedGames[Math.floor(Math.random()*matchedGames.length)]] : (all?matchedGames:matchedGames.slice(0,3));
    $('gameResults').replaceChildren();
    $('gameSummary').textContent=matchedGames.length
      ? '找到 '+matchedGames.length+' 款合适游戏 · '+(random?'这次就选它':all?'已显示全部匹配':'先看看这 '+shownGames.length+' 款')
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
    $('allGames').hidden=matchedGames.length<=3||all;
    $('randomGame').disabled=!matchedGames.length;
    $('copyGame').disabled=!shownGames.length;
    $('gameNotice').textContent='';$('copyGame').textContent=options.size===1?'复制游戏清单 ↗':'复制组队邀请 ↗';
  }
  addEventListener('guanchao:games-updated',()=>renderGames(false,expandedGames));
  $('allGames').addEventListener('click',()=>renderGames(false,true));
  $('gameForm').addEventListener('submit',e=>{e.preventDefault();renderGames();});
  $('gameForm').addEventListener('change',()=>renderGames());
  $('randomGame').addEventListener('click',()=>renderGames(true));
  $('copyGame').addEventListener('click',()=>{
    const o=gameOptions();
    copy('今晚一起玩！'+o.size+' 人 / '+platformNames[o.platform]+' / 预留 '+o.time+' 分钟\n'+shownGames.map(g=>g.name+'：'+g.desc+'\n'+g.url).join('\n\n')+'\n来自小文的游戏搭子决策器：https://giogight.github.io/#games',$('gameNotice'));
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
  });
  for(let month=1;month<=12;month++){const o=el('option',month+' 月');o.value=month;$('travelMonth').append(o);}
  $('travelMonth').value=String(new Date().getMonth()+1);
  function renderFavorites() {
    $('cityChips').replaceChildren();
    for(const name of favorites) {
      const chip=el('span',undefined,'city-chip'), remove=el('button','×');
      remove.type='button';remove.setAttribute('aria-label','移除 '+name);
      remove.addEventListener('click',()=>{favorites=favorites.filter(n=>n!==name);citiesChanged();});
      chip.append(el('span',name),remove);$('cityChips').append(chip);
    }
    if(!favorites.length) $('cityChips').append(el('p','还没有收藏。添加几个喜欢的城市，让推荐更懂你。','fine-print'));
    const selected=D.cities.filter(c=>favorites.includes(c.name)), counts={};
    selected.forEach(c=>c.tags.forEach(t=>{counts[t]=(counts[t]||0)+1;}));
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    $('cityStats').textContent='已收藏 '+favorites.length+' 座城市 · '+new Set(selected.map(c=>c.region)).size+' 个地区'+(ranked.length?'｜兴趣统计：'+ranked.map(([t,n])=>D.tags[t]+' '+n).join(' / '):'')+'。目前支持 '+D.cities.length+' 座城市。';
    document.querySelectorAll('#mapCityChoices input').forEach(input=>{input.checked=favorites.includes(input.value);});
  }
  function citiesChanged() {
    persist();renderFavorites();
    if(mapInitialized&&!$('travelOutput').hidden)analyzeTravel();
    else invalidateTravel();
  }
  function importCities(text,isJSON=false) {
    try {
      const parsed=D.parseCities(text,isJSON), before=favorites.length;
      const existing=parsed.known.filter(n=>favorites.includes(n)).length;
      favorites=[...new Set([...favorites,...parsed.known])];
      citiesChanged();
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
      budget:Number($('travelBudget').value),lodging:$('travelLodging').value,peak:$('travelPeak').checked,
      interests:Array.from(document.querySelectorAll('input[name=interest]:checked'),n=>n.value)};
  }
  let map=null,cityLayer=null,routeLayer=null,discoveryLayer=null,ranking=[],selectedCity='',tilesReady=false,liveLayer=null,liveMode=false,liveCity=null,livePlaces=[];
  const cityMarkers=new Map();
  const discoveryMarkers=new Map();
  const mapStatus=$('mapStatus');
  const mapHeading=document.querySelector('.map-topbar h3'),mapIntro=document.querySelector('.map-topbar .map-intro'),mapKicker=document.querySelector('.map-topbar .lab-kicker'),resetMapButton=$('resetMap');
  const staticMapCopy={heading:mapHeading.textContent,intro:mapIntro.textContent,kicker:mapKicker.textContent,reset:resetMapButton.textContent};
  function setMapCopy(isLive,city,scope){
    mapHeading.textContent=isLive?city.name+' · 旅行目的地地图':staticMapCopy.heading;
    mapIntro.textContent=isLive?'查看'+(scope||'该目的地')+'的景点、博物馆、公园与历史地点。':staticMapCopy.intro;
    mapKicker.textContent=isLive?'YOUR DESTINATION / CURRENT MAP RECORDS':staticMapCopy.kicker;
    resetMapButton.textContent=isLive?'查看当前目的地 ↗':staticMapCopy.reset;
  }
  function fitLiveView(city,places){
    if(!map)return;
    const points=places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>[p.lat,p.lon]);
    if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[40,40],maxZoom:points.length===1?14:13,animate:false});
    else if(Array.isArray(city.bbox)&&city.bbox.length===4)map.fitBounds([[city.bbox[0],city.bbox[2]],[city.bbox[1],city.bbox[3]]],{padding:[30,30],maxZoom:12,animate:false});
    else map.setView([city.lat,city.lon],12,{animate:false});
  }
  function initMap() {
    if(!window.L) {
      $('travelMap').append(el('p','地图组件暂时不可用，下方城市推荐与攻略仍可正常使用。','map-fallback'));
      mapStatus.textContent='地图未加载；请使用下方城市按钮选择目的地。';
      $('resetMap').disabled=true;return;
    }
    map=L.map('travelMap',{scrollWheelZoom:false}).setView([32.8,110.5],4);
    cityLayer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);discoveryLayer=L.layerGroup().addTo(map);
    window.GuanchaoMapTiles?.create(map,{onStatus:info=>{
      if(info.state==='ready'){tilesReady=true;if(!liveMode)mapStatus.textContent='地图已加载 · 热度为你的偏好匹配分，不是实时客流。可缩放地图，点击城市查看攻略。';}
      else if(info.state==='switching')mapStatus.textContent='底图连接较慢，正在切换备用线路；城市与攻略仍可使用。';
      else if(info.state==='partial'||info.state==='unavailable')mapStatus.textContent='底图线路暂不可达；地点坐标、城市推荐与下方攻略仍可使用。热度不是实时客流。';
    },isActive:()=>!document.hidden&&location.hash==='#travel'&&$('legacyTravelPlanner').open});
    if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize()).observe($('travelMap'));
  }
  function heatTier(score) {return score>=75?'high':score>=60?'mid':'low';}
  function ratingText(spot) {return spot.rating?spot.rating.score.toFixed(1)+' / 5.0':'暂无可核验评分';}
  function renderDashboard() {
    const total=ranking.reduce((n,c)=>n+c.spots.length+c.discoveries.length,0);
    const verified=ranking.reduce((n,c)=>n+c.spots.filter(s=>s.rating).length+c.discoveries.length,0);
    const dashboard=$('mapDashboard');dashboard.replaceChildren();
    for(const [number,label,note] of [
      [ranking.length,'已选城市','仅显示你勾选的目的地'],
      [total,'地点卡片','行程点 + 高分发现'],
      [total?verified+'/'+total:'0','已核验评分','Trip.com 页面快照']
    ]) {
      const card=el('div',undefined,'map-stat');
      card.append(el('strong',String(number)),el('span',label),el('small',note));dashboard.append(card);
    }
  }
  function showOverview() {
    if(map&&ranking.length){
      routeLayer.clearLayers();
      discoveryLayer.clearLayers();discoveryMarkers.clear();
      cityMarkers.forEach(marker=>marker.getElement()?.classList.remove('is-drilled'));
      map.fitBounds(L.latLngBounds(ranking.map(c=>[c.lat,c.lng])),{padding:[55,55],maxZoom:ranking.length===1?9:6,animate:false});
    }
  }
  function renderMap() {
    if(!map)return;
    cityLayer.clearLayers();cityMarkers.clear();
    for(const c of ranking) {
      const icon=el('div',undefined,'heat-city heat-city--'+heatTier(c.score));
      icon.append(el('span',undefined,'heat-city__halo'));
      const center=el('span',undefined,'heat-city__center');
      center.append(el('strong',c.name),el('small',c.score+' / 100'));
      icon.append(center);
      const marker=L.marker([c.lat,c.lng],{icon:L.divIcon({html:icon.outerHTML,className:'heat-city-icon',iconSize:[112,112],iconAnchor:[56,56]}),title:c.name+' · 匹配 '+c.score+' 分'}).addTo(cityLayer);
      marker.bindTooltip(c.name+' · 个人匹配 '+c.score+'/100',{direction:'top',offset:[0,-44]});
      marker.on('click',()=>selectCity(c.name,true));
      cityMarkers.set(c.name,marker);
    }
  }
  function renderSpotCards(city,target) {
    const section=el('section',undefined,'spot-section');
    const header=el('div',undefined,'spot-section__head');
    header.append(el('span','01—03 / ATTRACTION NOTES','lab-kicker'),el('h4','沿着地图，看看这 3 个地点'));
    section.append(header,el('p','游客分数只取 Trip.com 已核对页面，满分 5.0；未核对的不会估分。路线和提醒不是实时攻略。','fine-print'));
    const grid=el('div',undefined,'spot-grid');
    city.spots.forEach((spot,i)=>{
      const card=el('article',undefined,'spot-card');
      const top=el('div',undefined,'spot-card__top');
      const label=el('div');label.append(el('small','STOP '+String(i+1).padStart(2,'0')),el('h5',spot.name));
      const rating=el('span',spot.rating?'★ '+spot.rating.score.toFixed(1):'—','spot-rating'+(spot.rating?'':' spot-rating--missing'));
      rating.setAttribute('aria-label',ratingText(spot));
      top.append(label,rating);card.append(top,el('p',spot.note,'spot-card__tip'));
      if(spot.reviewNote)card.append(el('p','游客评价观察：'+spot.reviewNote,'spot-card__review'));
      if(spot.rating){
        const source=el('div',undefined,'spot-card__source');
        source.append(el('span','Trip.com · '+spot.rating.reviewCount.toLocaleString('zh-CN')+' 条评价 · '+spot.rating.checkedAt+' 核对'),link('查看原页 ↗',spot.rating.url));
        card.append(source);
      } else card.append(el('p','暂无可核验评分 · 建议出发前查看近期游客评价','spot-card__source'));
      grid.append(card);
    });
    section.append(grid);target.append(section);
  }
  function showDiscoveryOnMap(city,item) {
    if(!map)return;
    if(!discoveryMarkers.has(item.name))selectCity(city.name,true);
    map.setView([item.lat,item.lng],14,{animate:false});
    discoveryMarkers.get(item.name)?.openPopup();
    $('travelMap').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  }
  function renderDiscoveryCards(city,target) {
    const section=el('section',undefined,'discovery-section');
    const head=el('div',undefined,'discovery-head');
    head.append(el('span','LOCAL FINDS / NOT ON YOUR ROUTE','lab-kicker'),el('h4','网友高分发现 · 吃一口，再逛一处'));
    section.append(head,el('p','每座城市补充 1 处吃喝、1 处可逛地点；本批均为 Trip.com 评分 ≥ 4.6/5.0、至少 80 条评价的页面快照。它们是备选，不自动塞进每日行程；高分不等于便宜或不排队。','fine-print'));
    const grid=el('div',undefined,'discovery-grid');
    for(const item of city.discoveries) {
      const card=el('article',undefined,'discovery-card discovery-card--'+item.kind);
      const tag=el('span',item.kind==='food'?'吃点什么':'值得逛逛','discovery-tag');
      const top=el('div',undefined,'discovery-card__top');
      top.append(tag,el('strong','★ '+item.score.toFixed(1)+' / 5.0','discovery-score'));
      card.append(top,el('h5',item.name),el('p',item.area+' · '+item.note,'discovery-card__note'));
      card.append(el('p','Trip.com · '+item.reviewCount.toLocaleString('zh-CN')+' 条评价 · '+item.checkedAt+' 核对','discovery-card__source'));
      const actions=el('div',undefined,'discovery-card__actions');
      actions.append(link('看评价原页 ↗',item.url));
      if(map){
        const locate=el('button','地图定位 ◎','text-button');locate.type='button';
        locate.addEventListener('click',()=>showDiscoveryOnMap(city,item));actions.append(locate);
      }
      card.append(actions);grid.append(card);
    }
    section.append(grid);target.append(section);
  }
  function renderDiscoveryMarkers(city) {
    if(!map)return;
    discoveryLayer.clearLayers();discoveryMarkers.clear();
    for(const item of city.discoveries) {
      const icon=el('div',item.kind==='food'?'吃':'逛','discovery-pin discovery-pin--'+item.kind);
      const marker=L.marker([item.lat,item.lng],{icon:L.divIcon({html:icon.outerHTML,className:'discovery-pin-icon',iconSize:[34,42],iconAnchor:[17,42]}),title:item.name+' · '+item.score.toFixed(1)+'/5.0'}).addTo(discoveryLayer);
      const popup=el('div',undefined,'spot-popup');
      popup.append(el('strong',item.name),el('span','★ '+item.score.toFixed(1)+'/5.0 · '+item.reviewCount.toLocaleString('zh-CN')+' 条评价'),el('p',item.area+' · '+item.note),link('Trip.com 原页 ↗',item.url));
      marker.bindPopup(popup);discoveryMarkers.set(item.name,marker);
    }
  }
  function renderCityButtons() {
    $('cityResults').replaceChildren();
    const shortlist=ranking;
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
    cityMarkers.forEach((marker,cityName)=>{
      const icon=marker.getElement();if(icon){icon.classList.toggle('is-selected',cityName===name);icon.classList.toggle('is-drilled',cityName===name&&zoom);}
      marker.setZIndexOffset(cityName===name?1000:0);
    });
    $('exploreCity').value=name;
    renderCityButtons();
    const target=$('itinerary');target.replaceChildren();
    const heading=el('div',undefined,'itinerary-heading'),title=el('div');
    title.append(el('span','YOUR NEXT STOP / '+c.region,'lab-kicker'),el('h3',c.name+' · '+o.days+' 天慢游'));
    const score=el('span',String(c.score),'score');score.setAttribute('aria-label','匹配分 '+c.score);
    heading.append(title,score);target.append(heading,el('p',c.desc));
    const why='推荐理由：'+(c.matched.length?'贴合 '+c.matched.map(t=>D.tags[t]).join(' / '):'探索不同风格')+'；'+(c.season?'所选月份在建议出行季节内':'所选月份不在本目录优选季节，请额外核实天气')+'。';
    target.append(el('p',why));
    renderSpotCards(c,target);
    target.append(el('p','你的预算：'+o.budget+' 元 / 人 / 天，'+o.days+' 天共 '+(o.budget*o.days)+' 元。当地开销参考区间 '+c.cost.low+'—'+c.cost.high+' 元 / 人 / 天（'+o.days+' 天约 '+(c.cost.low*o.days)+'—'+(c.cost.high*o.days)+' 元），不含往返大交通。'));
    const breakdown=el('div',undefined,'budget-breakdown');
    for(const [key,label] of Object.entries({stay:'住宿 / 每人分摊',food:'日常餐饮',transport:'市内交通',visits:'游览与门票预留'})) {
      const item=el('div',label);item.append(el('strong',c.cost.parts[key]+' 元 / 天'));breakdown.append(item);
    }
    target.append(breakdown,el('p','以上为参考中值拆分，合计 '+c.cost.daily+' 元 / 人 / 天，不是商家报价。'+(o.peak?'已为住宿额外预留 40% 缓冲，这不是预测实际涨价幅度。':'按普通日期做规划，实际价格以预订时为准。')+(o.lodging==='none'?'你选择了无需付费住宿，住宿按 0 元估算。':'')));
    target.append(el('p',!c.affordable?'比参考中值少 '+(c.cost.daily-o.budget)+' 元 / 人 / 天。优先选免费景点、公共交通和经济餐饮；若需住店，请先确认能订到符合预算的房间。':o.budget<c.cost.high?'预算覆盖参考中值，但未覆盖上限，建议保留应急备用金。':'预算有一定余量，仍建议先核对住宿与往返交通，再安排付费体验。'));
    if(!c.enough)target.append(el('p','时间比建议的 '+c.days+' 天短，建议只选重点地区。'));
    const list=el('ol'),steps=[];
    for(let i=0;i<o.days;i++) {
      const spot=c.spots[i];
      const step=spot?{title:spot.name,note:spot.note}:{title:i===o.days-1?'自由活动与返程缓冲':'街区探索 / 留白日',note:'在住处附近安排一段慢游，按天气和体力调整，不额外塞入远距离景点。'};
      steps.push(step);
      const item=el('li'),body=el('div');body.append(el('strong',step.title),el('p',step.note));
      item.append(el('b','DAY '+String(i+1).padStart(2,'0')),body);list.append(item);
    }
    target.append(list,el('p','这是按地区整理的入门行程，不含已预订服务；同日衔接、实际车程和门票请出发前再核实。'));
    renderDiscoveryCards(c,target);
    const actions=el('div',undefined,'small-actions'),save=el('button',favorites.includes(c.name)?'已收藏 ✓':'收藏这座城市 +','text-button');
    save.type='button';save.disabled=favorites.includes(c.name);
    save.addEventListener('click',()=>{favorites.push(c.name);citiesChanged();});
    const copyButton=el('button','复制这份攻略 ↗','text-button');copyButton.type='button';
    const note=el('p','','fine-print');note.setAttribute('role','status');
    copyButton.addEventListener('click',()=>copy(c.name+' · '+o.days+' 天慢游\n'+why+'\n个人预算：'+o.budget+' 元/人/天；当地开销参考：'+c.cost.low+'—'+c.cost.high+' 元/人/天，不含往返大交通，非实时报价。\n'+steps.map((s,i)=>'第 '+(i+1)+' 天：'+s.title+'。'+s.note).join('\n')+'\n路线为编辑建议，开放、预约、交通和价格请另行核实。\n延伸阅读：'+c.source,note));
    actions.append(save,copyButton,link('查最新攻略与预约 ↗',c.source));
    target.append(actions,note);
    if(map) {
      routeLayer.clearLayers();
      discoveryLayer.clearLayers();discoveryMarkers.clear();
      if(zoom){
        const routeSpots=c.spots.slice(0,o.days);
        if(routeSpots.length>1)L.polyline(routeSpots.map(s=>[s.lat,s.lng]),{color:'#405b3f',weight:2.5,dashArray:'4 8',opacity:.75,interactive:false}).addTo(routeLayer);
        c.spots.forEach((spot,i)=>{
          const icon=el('div',undefined,'spot-pin');
          icon.append(el('span',String(i+1).padStart(2,'0'),'spot-pin__number'),el('span',spot.rating?'★ '+spot.rating.score.toFixed(1):'—','spot-pin__rating'));
          const marker=L.marker([spot.lat,spot.lng],{icon:L.divIcon({html:icon.outerHTML,className:'spot-pin-icon',iconSize:[75,42],iconAnchor:[16,42]}),title:spot.name+' · '+ratingText(spot)}).addTo(routeLayer);
          const popup=el('div',undefined,'spot-popup');
          popup.append(el('strong',spot.name),el('span',ratingText(spot)),el('p',spot.note));
          if(spot.rating)popup.append(link('Trip.com 评分来源 ↗',spot.rating.url));
          marker.bindPopup(popup);
        });
        renderDiscoveryMarkers(c);
        map.fitBounds(L.latLngBounds(c.spots.map(s=>[s.lat,s.lng])),{padding:[65,75],maxZoom:12,animate:false});
      }
    }
  }
  function invalidateTravel() {
    $('travelOutput').hidden=true;
    $('travelLayout').classList.remove('has-results');
    $('analyzeTravelButton').setAttribute('aria-expanded','false');
    $('travelReady').textContent='偏好已更新，点击“分析我的下一站”生成地图与攻略。';
  }
  let mapInitialized=false;
  function analyzeTravel(keepCity='') {
    liveMode=false;liveLayer?.clearLayers();setMapCopy(false);$('travelOutput').classList.remove('live-mode');$('livePlacesPanel').hidden=true;
    ranking=D.rankCities(travelOptions());
    if(!ranking.length){
      if(mapInitialized&&!$('travelOutput').hidden){
        if(cityLayer)cityLayer.clearLayers();
        if(routeLayer)routeLayer.clearLayers();
        if(discoveryLayer)discoveryLayer.clearLayers();discoveryMarkers.clear();
        $('cityResults').replaceChildren();$('exploreCity').replaceChildren();
        $('itinerary').replaceChildren(el('p','还没有选中城市。在“调整地图显示城市”里勾选，地图就会立即更新。'));
        $('travelSummary').textContent='已选 0 座城市 · 地图不显示任何热度标记。';
        renderDashboard();
        $('travelReady').textContent='当前未选择城市，重新勾选后会立即显示。';
        return true;
      }
      invalidateTravel();
      $('travelReady').textContent='请先搜索添加或导入至少一座城市，地图只显示你选择的城市。';
      $('cityInput').focus();
      return false;
    }
    $('travelOutput').hidden=false;
    $('travelLayout').classList.add('has-results');
    $('analyzeTravelButton').setAttribute('aria-expanded','true');
    $('travelReady').textContent='已生成推荐；修改偏好后可重新分析。';
    if(!mapInitialized){initMap();mapInitialized=true;}
    if(map)map.invalidateSize();
    $('exploreCity').replaceChildren();
    ranking.forEach(c=>{const option=el('option',c.name);option.value=c.name;$('exploreCity').append(option);});
    renderMap();
    renderDashboard();
    if(map&&!keepCity)showOverview();
    const o=travelOptions();
    $('travelSummary').textContent='仅分析你已选的 '+ranking.length+' 座城市：'+ranking.map(c=>c.name).join('、')+'。'+o.month+' 月 / '+o.days+' 天 · '+o.budget+' 元/人/天。热度代表偏好与预算匹配，不加入其他目的地。';
    selectCity(keepCity||ranking[0].name,ranking.length===1);
    return true;
  }
  $('travelForm').addEventListener('submit',e=>{
    e.preventDefault();
    const pending=$('cityInput').value.trim();
    if(pending){
      let parsed;
      try {parsed=D.parseCities(pending);}
      catch(error){invalidateTravel();$('importStatus').textContent=error.message;return;}
      importCities(pending);
      if(!parsed.known.length)return;
      $('cityInput').value='';
    }
    if(!analyzeTravel())return;
    $('travelOutput').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  });
  $('travelForm').addEventListener('change',invalidateTravel);
  $('resetMap').addEventListener('click',()=>{if(!liveMode)showOverview();else window.GuanchaoTravelLive?.resetView();});
  $('exploreCity').addEventListener('change',e=>selectCity(e.target.value,true));
  D.cities.forEach(city=>{
    const label=el('label'),input=el('input');
    input.type='checkbox';input.value=city.name;
    input.addEventListener('change',()=>{
      favorites=input.checked?[...new Set([...favorites,city.name])]:favorites.filter(name=>name!==city.name);
      citiesChanged();
    });
    label.append(input,el('span',city.name));$('mapCityChoices').append(label);
  });
  window.GuanchaoTravelMap={
    get live(){return liveMode;},
    show(city,places,options={}){
      liveMode=true;liveCity=city;livePlaces=places;setMapCopy(true,city,options.scope);
      $('travelOutput').hidden=false;$('travelOutput').classList.add('live-mode');$('travelLayout').classList.add('has-results');
      if(!mapInitialized){initMap();mapInitialized=true;}if(!map)return;
      map.invalidateSize();cityLayer.clearLayers();cityMarkers.clear();routeLayer.clearLayers();discoveryLayer.clearLayers();discoveryMarkers.clear();
      if(!liveLayer)liveLayer=L.layerGroup().addTo(map);liveLayer.clearLayers();
      for(const place of places){const marker=L.circleMarker([place.lat,place.lon],{radius:7,color:'#fff',fillColor:'#7b62cc',fillOpacity:.85,weight:2});const popup=el('div',undefined,'spot-popup');popup.append(el('strong',place.name),el('span',place.category));if(place.hours)popup.append(el('p','地图记录营业时间：'+place.hours));popup.append(link('查看最新地点记录 ↗',place.url));marker.bindPopup(popup).addTo(liveLayer);place.marker=marker;}
      fitLiveView(city,places);mapStatus.textContent='旅游专用地图 · 只显示当前目的地的旅游地点。营业与预约请查景点网站。';
    },
    focus(place){if(map&&place.marker){map.setView([place.lat,place.lon],15,{animate:false});place.marker.openPopup();}},
    reset(city){if(map&&liveCity?.key===city.key)fitLiveView(liveCity,livePlaces);},
    resize(){if(map)setTimeout(()=>map.invalidateSize({pan:false}),80);}
  };
  renderFavorites();
  // Decorative travel footage only: muted, lazy and paused outside the viewport.
  const film=$('travelBackground'),filmToggle=$('travelVideoToggle');
  if(!film){if(!storageAvailable)$('importStatus').textContent='本地收藏无法读取，可重新导入或添加城市。';return;}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let filmVisible=false,filmPaused=reduced.matches;
  function syncFilm() {
    const allowed=filmVisible&&!filmPaused&&!document.hidden&&!document.body.classList.contains('pre-hijack');
    filmToggle.textContent=filmPaused?'播放背景':'暂停背景';
    filmToggle.setAttribute('aria-pressed',String(filmPaused));
    if(allowed) {
      if(!film.getAttribute('src'))film.src=film.dataset.src;
      film.muted=true;
      film.play().catch(()=>{filmPaused=true;filmToggle.textContent='播放背景';filmToggle.setAttribute('aria-pressed','true');});
    } else film.pause();
  }
  filmToggle.addEventListener('click',()=>{filmPaused=!filmPaused;syncFilm();});
  new IntersectionObserver(entries=>{filmVisible=entries[0].isIntersecting;syncFilm();},{threshold:.05}).observe(film);
  new MutationObserver(syncFilm).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',syncFilm);
  reduced.addEventListener('change',e=>{filmPaused=e.matches;syncFilm();});
  syncFilm();
  if(!storageAvailable)$('importStatus').textContent='之前的本地收藏无法读取，已使用空名单；可重新导入或添加城市。';
})();

/* Curated starter catalog. Prices, availability and opening hours are not live data. */
(function (root) {
  'use strict';
  const tags = { food: '美食', history: '人文古迹', nature: '自然山水', coast: '海边', city: '城市漫游' };
  const moods = { coop: '一起合作', party: '热闹聚会', competitive: '来点竞技', chill: '放松慢玩' };
  const steam = id => 'https://store.steampowered.com/app/' + id + '/';
  // time: recommended minimum time reserved, not an official round duration.
  const games = [
    {name:'双人成行',min:2,max:2,platforms:['pc'],time:90,moods:['coop'],free:[],easy:false,url:steam(1426210),desc:'专为两个人设计的合作冒险；适合愿意一起磨合操作的搭子。',note:'需一位玩家购买；好友通行证与账号要求见商店。'},
    {name:'胡闹厨房 2',min:2,max:4,platforms:['pc'],time:45,moods:['coop','party'],free:[],easy:false,url:steam(728880),desc:'切菜、传菜、救厨房。适合能接受手忙脚乱和反复配合的小队。',note:'购买前核对版本；不默认不同商店版本互通。'},
    {name:'人类一败涂地',min:2,max:8,platforms:['pc'],time:45,moods:['coop','party'],free:[],easy:true,url:steam(477160),desc:'软绵绵的物理解谜，失败也很好笑，适合不追求输赢的朋友。',note:'PC 联机房间；手机版本不在本条推荐范围。'},
    {name:'星露谷物语',min:2,max:8,platforms:['pc'],time:90,moods:['chill','coop'],free:[],easy:true,url:steam(413150),desc:'一起种田、钓鱼、经营农场。适合固定搭子慢慢积累共同存档。',note:'PC 1.6 版本最多 8 人；本条不包含手机联机。'},
    {name:'饥荒联机版',min:2,max:6,platforms:['pc'],time:90,moods:['coop'],free:[],easy:false,url:steam(322330),desc:'分工采集、建家、抵抗季节变化；适合愿意一起研究生存的小队。',note:'按默认 6 人服务器推荐；新手有学习成本。'},
    {name:'求生之路 2',min:2,max:4,platforms:['pc'],time:45,moods:['coop'],free:[],easy:false,url:steam(550),desc:'四人协作推进关卡，适合想要节奏明确、边聊边打的射击搭子。',note:'含恐怖、血腥内容；按合作战役人数推荐。'},
    {name:'深岩银河',min:2,max:4,platforms:['pc'],time:45,moods:['coop'],free:[],easy:false,url:steam(548430),desc:'四种职业协力采矿与撤离，适合喜欢分工和任务目标的小队。',note:'有射击与洞穴探索；先核对商店之间的联机支持。'},
    {name:'Pummel Party',min:2,max:8,platforms:['pc'],time:90,moods:['party','competitive'],free:[],easy:true,url:steam(880940),desc:'棋盘加迷你游戏，适合一群朋友开轻松互坑局。',note:'含卡通暴力；完整棋盘局需预留更多时间。'},
    {name:'鹅鸭杀',min:5,max:16,platforms:['pc','mobile'],time:45,moods:['party'],free:['pc','mobile'],easy:false,url:steam(1568590),desc:'靠聊天、观察和推理找出阵营，适合人数多且愿意开麦的朋友。',note:'含内购；按至少 5 人的实用组局人数推荐，区服和语音自行确认。'},
    {name:'Brawlhalla',min:2,max:8,platforms:['pc','mobile'],time:20,moods:['competitive','party'],free:['pc','mobile'],easy:false,url:'https://www.brawlhalla.com/',desc:'平台格斗，短时间也能打几轮。适合想来一点操作对抗的搭子。',note:'按自定义房间推荐；含内购，手机地区可用性以商店为准。'},
    {name:'Among Us',min:4,max:15,platforms:['pc','mobile'],time:45,moods:['party'],free:['mobile'],easy:true,url:'https://www.innersloth.com/games/among-us/',desc:'做任务、找线索、讨论投票；适合想用聊天和推理撑起一局的朋友。',note:'PC 付费、手机可免费入门；含内购，建议同区服并提前约好语音。'},
    {name:'光·遇',min:2,max:4,platforms:['mobile'],time:45,moods:['chill','coop'],free:['mobile'],easy:true,url:'https://sky.163.com/',desc:'一起跑图、看风景、探索，适合不想有排名压力的轻松搭子。',note:'这里推荐 2—4 人同行，不代表服务器人数上限；含内购，先确认同服。'}
  ];
  // Coordinates use WGS84 to match OpenStreetMap. Each day is an area-based suggestion.
  const raw = [
    ['天津','华北',39.12,117.20,['food','history','city'],[4,5,9,10],300,2,'沿海河慢慢走，把老建筑和早餐都装进旅程。',[['五大道',39.104,117.205,'老街散步，留半天看建筑。'],['海河津湾广场',39.132,117.211,'傍晚看河岸与夜景。'],['古文化街',39.144,117.189,'白天逛街，早餐尝试本地小吃。']]],
    ['北京','华北',39.90,116.40,['history','city','food'],[4,5,9,10],500,4,'古都轴线和胡同生活，建议每天只安排一个大景区。',[['故宫周边',39.917,116.397,'提前核实故宫预约；周边漫步可另作选择。'],['天坛',39.882,116.407,'上午逛园，下午安排休息。'],['什刹海',39.942,116.386,'胡同与湖边慢走，错开晚间拥挤时段。']]],
    ['上海','华东',31.23,121.47,['city','food','history'],[3,4,5,10,11],550,3,'从滨江天际线走到街角咖啡馆。',[['外滩',31.240,121.490,'沿江步行，傍晚看天际线。'],['武康路',31.207,121.435,'小街与建筑漫游，不打扰居民。'],['徐汇滨江',31.171,121.461,'留给展馆与河边散步，展览需另查开放时间。']]],
    ['杭州','华东',30.27,120.15,['nature','history','food'],[3,4,5,9,10,11],400,3,'西湖、茶山与古寺，留点空白比赶景点更舒服。',[['西湖',30.242,120.148,'选一段湖岸慢走，不必一天走完整圈。'],['龙井村',30.220,120.101,'茶村散步，体验前先询价。'],['灵隐寺周边',30.240,120.100,'核实景区与寺院票务，尽量早到。']]],
    ['苏州','华东',31.30,120.58,['history','nature','food'],[3,4,5,9,10,11],350,2,'园林和水巷适合放慢节奏，避开扎堆打卡。',[['拙政园',31.325,120.629,'提前看预约，上午逛园。'],['平江路',31.316,120.631,'沿河散步，和园林安排在同一天也可。'],['虎丘',31.338,120.579,'留出半天游览，台阶较多。']]],
    ['南京','华东',32.06,118.80,['history','food','city'],[3,4,5,9,10,11],350,3,'城墙、博物馆与街巷，小范围安排更省体力。',[['南京博物院',32.040,118.826,'馆藏丰富，先核实开放日与预约。'],['玄武湖',32.075,118.792,'湖边慢走，可搭配附近城墙。'],['夫子庙秦淮河',32.020,118.789,'晚间看河景，热门区域注意人流。']]],
    ['成都','西南',30.57,104.07,['food','city','history'],[3,4,5,9,10,11],350,3,'喝茶、吃饭、逛公园，一天留一个重点就好。',[['人民公园',30.657,104.055,'茶馆体验和散步，先看菜单价格。'],['武侯祠',30.646,104.049,'人文游览，可顺路逛周边。'],['成都大熊猫繁育研究基地',30.739,104.145,'提前预约，早出发；离市区较远。']]],
    ['重庆','西南',29.56,106.55,['food','city','history'],[3,4,5,10,11],350,3,'立体城市适合慢慢探索，坡道比地图看起来更多。',[['解放碑',29.558,106.577,'老城街区慢走，按体力选择坡道。'],['南滨路',29.549,106.593,'傍晚看江景，留意过江交通。'],['鹅岭公园',29.548,106.529,'登高看城市，穿好走的鞋。']]],
    ['西安','西北',34.26,108.94,['history','food','city'],[3,4,5,9,10,11],350,3,'把历史与街头小吃放在一起，远郊景点单独留一天。',[['西安城墙南门',34.251,108.942,'城墙游览，日晒时做好防护。'],['陕西历史博物馆',34.223,108.956,'以官方预约规则为准，约不到可改附近街区。'],['秦始皇帝陵博物院',34.385,109.278,'远郊行程，单独预留交通与参观时间。']]],
    ['青岛','华东',36.07,120.38,['coast','food','history'],[5,6,9,10],400,3,'海岸、老城和红瓦屋顶，沿岸分段走最轻松。',[['栈桥',36.060,120.316,'沿老城海岸漫步，海风大时加衣。'],['八大关',36.053,120.350,'街区与海岸慢游。'],['小麦岛',36.057,120.416,'天气好时看海，不翻越护栏。']]],
    ['厦门','华东',24.48,118.09,['coast','food','city'],[3,4,5,10,11],450,3,'岛屿漫步和海边骑行，先看天气再定上岛安排。',[['鼓浪屿',24.447,118.064,'提前核实轮渡与票务，岛上以步行为主。'],['沙坡尾',24.438,118.087,'街区和海港散步。'],['环岛路黄厝',24.433,118.164,'选一段海岸骑行，注意防晒。']]],
    ['大理','西南',25.61,100.27,['nature','history','chill'],[3,4,5,9,10,11],400,4,'古城和洱海适合留白，环湖不是一天赶完的清单。',[['大理古城',25.695,100.165,'第一天适应节奏，街巷慢走。'],['才村洱海边',25.716,100.191,'沿生态廊道步行或骑行，遵守分区规定。'],['喜洲古镇',25.855,100.131,'单独安排半天至一天，体验建筑与小吃。']]],
    ['桂林','华南',25.27,110.29,['nature','food'],[4,5,6,9,10],350,4,'山水行程受天气影响明显，水上项目先确认安全。',[['象山景区',25.267,110.294,'市区轻松游览，核实入园要求。'],['阳朔西街',24.778,110.495,'阳朔需另算城际交通，可考虑换住宿。'],['遇龙河',24.834,110.438,'徒步看田园，水上活动以当日安全要求为准。']]],
    ['昆明','西南',25.04,102.71,['nature','food','city'],[3,4,5,9,10,11],350,3,'从公园、花市到湖边，适合轻松进入云南旅行。',[['翠湖',25.049,102.704,'湖边散步，周边街区吃饭休息。'],['斗南花市',24.904,102.786,'先核实市场营业时段，留出往返时间。'],['滇池海埂',24.958,102.660,'湖边走走，鸟类观赏受季节影响。']]],
    ['长沙','华中',28.23,112.94,['food','city','history'],[3,4,5,9,10,11],300,2,'街头小吃与江边漫步，别把每顿饭都安排成排队。',[['岳麓山',28.184,112.938,'上午上山，按体力挑步道。'],['橘子洲',28.195,112.960,'提前核实预约和交通，注意防晒。'],['太平老街',28.196,112.971,'街巷与小吃，错开最拥挤时段。']]],
    ['广州','华南',23.13,113.26,['food','city','history'],[3,4,10,11,12],400,3,'早茶、骑楼与江岸，把吃饭也当作正经行程。',[['永庆坊',23.119,113.239,'西关街区慢走，搭配粤式小吃。'],['沙面',23.110,113.240,'建筑漫步，避免打扰居民与办公场所。'],['花城广场',23.119,113.324,'傍晚看城市夜景。']]],
    ['三亚','华南',18.25,109.51,['coast','nature'],[1,2,3,4,11,12],650,4,'海边度假适合少换酒店，先看天气和海上活动条件。',[['三亚湾',18.273,109.482,'傍晚海边散步，注意防晒与潮汐。'],['亚龙湾',18.230,109.639,'预留交通，海上活动只选正规经营者。'],['鹿回头',18.224,109.499,'登高看湾景，先核实开放及票务。']]],
    ['哈尔滨','东北',45.80,126.53,['history','city','food'],[1,2,6,7,8,12],450,3,'冬日冰雪与夏季避暑是两种旅程，按季节做准备。',[['中央大街',45.774,126.618,'街区漫步，冬季注意防滑与保暖。'],['圣索菲亚教堂周边',45.769,126.627,'建筑与广场，室内开放情况另查。'],['太阳岛',45.794,126.599,'按季节安排公园游览，冰雪活动另核实。']]]
  ];
  const cities = raw.map(([name,region,lat,lng,types,months,budget,days,desc,spots]) => ({
    name,region,lat,lng,tags:types.filter(t=>tags[t]),months,budget,days,desc,
    spots:spots.map(([name,lat,lng,note])=>({name,lat,lng,note})),
    source:'https://www.bing.com/search?q='+encodeURIComponent(name+' 旅游 官方 景点预约 攻略')
  }));
  function matchGames(options) {
    return games.filter(g=>g.platforms.includes(options.platform)
      && options.size>=g.min && options.size<=g.max && options.time>=g.time
      && (options.mood==='any'||g.moods.includes(options.mood))
      && (!options.free||g.free.includes(options.platform)) && (!options.easy||g.easy));
  }
  function normalizeCity(name) { return String(name).trim().replace(/^["']|["']$/g,'').replace(/市$/,''); }
  function parseCities(text, isJSON=false) {
    if (typeof text!=='string' || text.length>100000) throw new Error('名单过大，请控制在 100KB 以内。');
    let entries;
    if (isJSON || text.trim().startsWith('[')) {
      try { entries=JSON.parse(text.replace(/^\uFEFF/,'')); } catch { throw new Error('JSON 格式不正确，请使用城市名数组，例如 ["天津","成都"]。'); }
      if(!Array.isArray(entries)||entries.some(x=>typeof x!=='string')) throw new Error('JSON 应为城市名数组，例如 ["天津","成都"]。');
    } else entries=text.replace(/^\uFEFF/,'').split(/[,，、;；\n\r\t]+/);
    const known=[],unknown=[];
    for(const entry of entries) {
      if(['城市','城市名','city','name'].includes(entry.trim().replace(/^["']|["']$/g,'').toLowerCase())) continue;
      const name=normalizeCity(entry);
      if(!name) continue;
      if(cities.some(c=>c.name===name)) known.push(name); else unknown.push(name.slice(0,60));
    }
    return {known:[...new Set(known)],unknown:[...new Set(unknown)],duplicates:known.length-new Set(known).size};
  }
  function rankCities(options) {
    const weights=Object.fromEntries(Object.keys(tags).map(t=>[t,0]));
    const favorites=cities.filter(c=>options.favorites.includes(c.name));
    if(options.interests.length) options.interests.forEach(t=>{if(t in weights) weights[t]=1;});
    else favorites.forEach(c=>c.tags.forEach(t=>weights[t]++));
    if(!Object.values(weights).some(Boolean)) Object.keys(weights).forEach(t=>weights[t]=1);
    const total=Object.values(weights).reduce((a,b)=>a+b,0);
    return cities.map(c=>{
      const affinity=c.tags.reduce((a,t)=>a+weights[t],0)/total;
      const season=c.months.includes(options.month), affordable=options.budget>=c.budget, enough=options.days>=c.days;
      const score=Math.round(affinity*45+(season?20:5)+20*Math.min(1,options.budget/c.budget)+(enough?10:4)+(options.favorites.includes(c.name)?5:0));
      return {...c,score,season,affordable,enough,matched:c.tags.filter(t=>weights[t]>0)};
    }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'zh-CN'));
  }
  const api={tags,moods,games,cities,matchGames,parseCities,rankCities};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.XWTools=api;
})(typeof window!=='undefined'?window:{});

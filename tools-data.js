/* Curated starter catalog. Prices, availability and opening hours are not live data. */
(function (root) {
  'use strict';
  const tags = { food: '美食', history: '人文古迹', nature: '自然山水', coast: '海边', city: '城市漫游' };
  const moods = { coop: '一起合作', party: '热闹聚会', competitive: '来点竞技', chill: '放松慢玩' };
  const steam = id => 'https://store.steampowered.com/app/' + id + '/';
  // Trip.com attraction-page aggregate ratings, checked 2026-09-26. These are
  // platform snapshots, not all-internet averages or live visitor counts.
  const ratingRows = [
    ['天津','五大道',4.7,4368,'tianjin/5-avenues-85756'],
    ['天津','古文化街',4.7,5438,'tianjin/tianjin-ancient-culture-street-78346'],
    ['北京','故宫博物院',4.9,201370,'beijing/the-palace-museum-75595'],
    ['北京','天坛',4.7,24235,'beijing/temple-of-heaven-75599'],
    ['北京','什刹海',4.7,3056,'beijing/shichahai-scenic-area-100947'],
    ['上海','外滩',4.8,157091,'shanghai/the-bund-75611'],
    ['杭州','西湖',4.7,37278,'hangzhou/west-lake-82922'],
    ['杭州','灵隐寺',4.7,20953,'hangzhou/lingyin-temple-75771'],
    ['苏州','拙政园',4.6,86336,'suzhou/humble-administrator-s-garden-82473'],
    ['苏州','平江路',4.6,2649,'suzhou/pingjiang-road-87769'],
    ['苏州','虎丘',4.7,32723,'suzhou/tiger-hill-scenic-area-76159'],
    ['南京','南京博物院',4.7,3973,'nanjing/nanjing-museum-80549'],
    ['南京','玄武湖',4.8,6855,'nanjing/xuanwu-lake-scenic-area-10558596'],
    ['南京','夫子庙秦淮河',4.7,7303,'nanjing/confucius-temple-qinhuai-scenic-area-10558743'],
    ['成都','武侯祠',4.6,28979,'chengdu/chengdu-wuhou-shrine-museum-76341'],
    ['成都','成都大熊猫繁育研究基地',4.6,111632,'chengdu/chengdu-research-base-of-giant-panda-breeding-76342'],
    ['重庆','解放碑',4.7,5626,'chongqing/jiefangbei-pedestrian-street-10558680'],
    ['西安','西安城墙',4.6,61993,'xi-an/xi-an-city-wall-75686'],
    ['西安','陕西历史博物馆',4.8,33952,'xi-an/shaanxi-history-museum-75684'],
    ['西安','秦始皇帝陵博物院',4.7,146483,'xi-an/emperor-qinshihuang-s-mausoleum-site-museum-75682'],
    ['青岛','栈桥',4.7,10909,'qingdao/zhanqiao-park-75648'],
    ['青岛','八大关',4.5,8241,'qingdao/badaguan-83237'],
    ['青岛','小麦岛',4.5,165,'qingdao/xiaomaidao-park-68089372'],
    ['厦门','鼓浪屿',4.5,54329,'xiamen/kulangsu-10524162'],
    ['大理','大理古城',4.7,9660,'dali-city/dali-ancient-city-78629'],
    ['大理','喜洲古镇',4.5,1265,'dali-city/xizhou-78630'],
    ['桂林','象山景区',4.5,25359,'guilin/elephant-hill-scenic-area-90682'],
    ['桂林','阳朔西街',4.5,6257,'yangshuo/yangshuo-west-street-10558831'],
    ['桂林','遇龙河',4.5,6946,'yangshuo/yulong-river-80969'],
    ['昆明','翠湖',4.7,3469,'kunming/the-green-lake-park-78617'],
    ['昆明','斗南花市',4.6,131,'kunming/kunming-dounan-flower-market-62869851'],
    ['昆明','海埂公园',4.5,809,'kunming/haigeng-park-79979'],
    ['长沙','岳麓山',4.6,5415,'changsha/mount-yuelu-77605'],
    ['长沙','橘子洲',4.6,13596,'changsha/orange-isle-scenic-area-77604'],
    ['广州','沙面',4.7,7143,'guangzhou/sha-mian-78476'],
    ['三亚','鹿回头',4.7,24584,'sanya/luhuitou-scenic-area-75996'],
    ['哈尔滨','中央大街',4.8,8582,'harbin/zhongyang-street-77071'],
    ['哈尔滨','圣索菲亚教堂',4.6,7382,'harbin/saint-sophia-cathedral-77064'],
    ['哈尔滨','太阳岛',4.5,3034,'harbin/harbin-sun-island-scenic-spot-77060']
  ];
  const spotRatings = new Map(ratingRows.map(([city,spot,score,reviewCount,path]) => [city+'/'+spot,{
    score,reviewCount,source:'Trip.com',checkedAt:'2026-09-26',
    url:'https://www.trip.com/travel-guide/attraction/'+path
  }]));
  // Short observations from the linked public review samples; never a claim
  // that every visitor agreed. Other itinerary tips remain editorial advice.
  const reviewNotes = {
    '天津/五大道':'有游客提到建筑风格和步行讲解体验；想听历史可预留慢走时间。',
    '杭州/西湖':'有游客提到日落景色，也有人提醒炎热与人多；只选一段湖岸更从容。',
    '成都/成都大熊猫繁育研究基地':'有游客喜欢近距离看熊猫，也提到热门区域拥挤；早点出发更稳妥。',
    '大理/大理古城':'有游客提到古城街巷和苍山景观；步行游览可留出更多时间。'
  };
  // One food stop and one optional place to explore per city. Each linked
  // Trip.com detail page showed >=4.6/5 and >=80 reviews on 2026-09-26.
  // Coordinates from those pages are GCJ-02; convert for the OSM/WGS84 map.
  const discoveryRows = [
    ['天津','food','南楼煎饼（南楼总店）',4.6,396,39.0933705,117.2206412,'/restaurant/china/tianjin/detail/nanlou-jianbing-222665/','围堤道 / 隆昌路','早餐小吃；到店前核对营业时段和排队情况。'],
    ['天津','walk','意式风情区',4.7,5039,39.135704,117.199933,'/travel-guide/attraction/tianjin/tianjin-italian-style-town-91831','河北区','建筑街区适合慢逛，不必当成整日行程。'],
    ['北京','food','磁器口老豆汁店（天坛店）',4.8,353,39.88876,116.4128138,'/restaurant/china/beijing/detail/ciqikou-old-bean-juice-shop-10562189/','天坛附近','传统口味因人而异，可以先少量尝试。'],
    ['北京','walk','雍和宫',4.7,4280,39.947165,116.417295,'/travel-guide/attraction/beijing/lama-temple-76599','东城区','可搭配周边街巷；入内规则和预约请先核实。'],
    ['上海','food','南翔馒头店（豫园店）',4.6,2597,31.2266265,121.4914483,'/restaurant/china/shanghai/detail/nanxiang-steamed-bun-restaurant-10561310/','豫园附近','小笼点心可作一餐，热门时段留出等候时间。'],
    ['上海','walk','上海博物馆',4.6,10133,31.22829,121.47558,'/travel-guide/attraction/shanghai/shanghai-museum-76144','人民广场附近','先核对馆区、展览和预约，再安排周边步行。'],
    ['杭州','food','老头儿油爆虾（武林店）',4.7,535,30.2677687,120.1608217,'/restaurant/china/hangzhou/detail/lao-tou-er-you-bao-xia-11297448/','武林广场附近','杭帮菜备选，点菜前先看菜单和人均。'],
    ['杭州','walk','西溪湿地',4.6,29148,30.267233,120.064922,'/travel-guide/attraction/hangzhou/xixi-national-wetland-park-81715','西湖区','范围较大，选一个入口慢游；船票另行核对。'],
    ['苏州','food','裕兴记面馆（演艺中心店）',4.7,158,31.3091684,120.6060745,'/restaurant/china/suzhou/detail/yu-xing-ji-noodle-house-15290474/','石路附近','面馆适合作为短暂停靠，先确认本店营业。'],
    ['苏州','walk','苏州博物馆',4.8,5090,31.323065,120.627743,'/travel-guide/attraction/suzhou/suzhou-museum-82121','拙政园附近','先看预约；可与园林同区安排，不必赶场。'],
    ['南京','food','小李汤包（殷高巷店）',4.7,200,32.0176903,118.7770381,'/restaurant/china/nanjing/detail/restaurant-11238292/','殷高巷','汤包适合小吃停靠，现做食物留意烫口。'],
    ['南京','walk','栖霞山',4.7,6885,32.155461,118.967746,'/travel-guide/attraction/nanjing/qixia-mountain-scenic-area-75709','栖霞区','离市中心较远，建议单独预留半天以上。'],
    ['成都','food','叶婆婆（太古里店）',5.0,490,30.6509741,104.0843241,'/restaurant/china/chengdu/detail/ye-po-po-56563314/','太古里附近','川味小吃备选，排队太久可保留其他选择。'],
    ['成都','walk','文殊院',4.8,2046,30.6754,104.07265,'/travel-guide/attraction/chengdu/wenshu-monastery-76379','青羊区','适合与周边街巷慢走，尊重寺院现场规则。'],
    ['重庆','food','纯阳老酒馆（七星岗店）',4.7,202,29.5546949,106.5613369,'/restaurant/china/chongqing/detail/restaurant-11566074/','七星岗','川菜口味可先问辣度，别把晚餐排得太赶。'],
    ['重庆','walk','磁器口古镇',4.6,14432,29.580604,106.450203,'/travel-guide/attraction/chongqing/ciqikou-town-82093','沙坪坝区','热门街区可错开高峰，留时间走走支巷。'],
    ['西安','food','马家老六水盆牛羊肉',4.8,130,34.2688691,108.9430714,'/restaurant/china/xi-an/detail/ma-jia-lao-liu-shui-pen-niu-yang-rou-yang-za-gao-227322/','北大街附近','牛羊肉小吃，先确认营业和个人口味。'],
    ['西安','walk','西安博物院',4.6,3353,34.238545,108.941644,'/travel-guide/attraction/xi-an/xi-an-museum-10532757','碑林区','可与小雁塔一带慢游；入馆规则先核对。'],
    ['青岛','food','永红园啤酒烧烤海鲜大排档（台柳路店）',5.0,138,36.1365712,120.4118297,'/restaurant/china/qingdao/detail/yong-hong-yuan-beer-barbecue-seafood-and-food-stall-15277529/','台柳路','海鲜按当日标价点单，先确认份量与价格。'],
    ['青岛','walk','青岛啤酒博物馆',4.8,47518,36.079355,120.347241,'/travel-guide/attraction/qingdao/tsingtao-beer-museum-10559061','市北区','室内参观备选，门票与入场时段先核对。'],
    ['厦门','food','好食来大排档',5.0,87,24.4668405,118.0853228,'/restaurant/china/xiamen/detail/hao-shi-lai-food-stall-11308138/','湖滨南路','大排档先看菜单与海鲜计价方式。'],
    ['厦门','walk','集美学村',4.7,891,24.566515,118.092797,'/travel-guide/attraction/xiamen/the-jimei-school-village-75842','集美区','建筑漫步注意校园开放边界，不打扰教学。'],
    ['大理','food','风花小院',5.0,4807,25.6953789,100.1674619,'/restaurant/china/dali-city/detail/feng-hua-xiao-yuan-31198403/','大理古城人民路','古城内用餐备选，先核对菜单和等候情况。'],
    ['大理','walk','双廊古镇',4.6,3099,25.909591,100.19349,'/travel-guide/attraction/dali-city/shuanglang-ancient-town-10532874','洱海东北侧','离大理古城较远，往返交通单独预留。'],
    ['桂林','food','大师傅啤酒鱼（阳朔西街店）',4.7,1291,24.7737208,110.4942401,'/restaurant/china/yangshuo/detail/da-shi-fu-beer-fish-10560924/','阳朔西街','点鱼前确认品种、计价和份量。'],
    ['桂林','walk','独秀峰王城景区',4.9,24840,25.28165,110.299196,'/travel-guide/attraction/guilin/solitary-beauty-peak-prince-city-scenic-area-90680','桂林市区','人文景点备选，票务和登高路线先核对。'],
    ['昆明','food','小吉坡8号（文林街店）',4.6,123,25.0517043,102.7021638,'/restaurant/china/kunming/detail/xiao-ji-po-8th-11356895/','文林街','适合街区散步时顺路停靠，先确认营业。'],
    ['昆明','walk','昆明老街',4.7,477,25.039975,102.709499,'/travel-guide/attraction/kunming/kunming-old-street-56776277','市中心','街区可傍晚慢逛，消费前先看价目。'],
    ['长沙','food','黑色经典臭豆腐（潇湘文化店）',4.6,1056,28.1903679,112.975908,'/restaurant/china/changsha/detail/black-classic-stinky-tofu-and-hunan-specialty-10562067/','黄兴路步行街','步行街小吃，现炸现吃注意烫口。'],
    ['长沙','walk','杜甫江阁',4.6,10587,28.184703,112.968613,'/travel-guide/attraction/changsha/du-fu-pavilion-13562479','湘江东岸','适合傍晚江边慢走，登阁开放另核对。'],
    ['广州','food','炳胜公馆',4.7,382,23.1148757,113.3283287,'/restaurant/china/guangzhou/detail/bingsheng-mansion-11479578/','珠江新城','粤菜餐馆可能超出经济预算，先看菜单。'],
    ['广州','walk','广东省博物馆',4.7,2071,23.114747,113.326436,'/travel-guide/attraction/guangzhou/guangdong-museum-76884','珠江新城','看展前核对预约与馆内展览，可搭配周边散步。'],
    ['三亚','food','林姐海鲜',4.6,3680,18.2373516,109.5085057,'/restaurant/china/sanya/detail/mslin-s-seafood-176948/','新民街','海鲜先核对品种、重量和当日标价。'],
    ['三亚','walk','西岛',4.6,18538,18.240053,109.373546,'/travel-guide/attraction/sanya/west-island-10558942','三亚西侧海域','上岛前核对天气、船班和返程时间。'],
    ['哈尔滨','food','老味烧烤（总店）',4.8,108,45.7611098,126.6164473,'/restaurant/china/harbin/detail/lao-wei-barbecue-311766/','安达街','烧烤备选，晚间用餐记得留返程时间。'],
    ['哈尔滨','walk','中华巴洛克历史文化街区',4.8,325,45.781834,126.640789,'/travel-guide/attraction/harbin/chinese-baroque-31660312','道外区','老街区慢走，冬季留意防滑与保暖。']
  ];
  function gcjToWgs(lat,lng) {
    const pi=Math.PI, a=6378245, ee=.006693421622965943;
    const x=lng-105,y=lat-35;
    let dLat=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));
    dLat+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
    dLat+=(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3;
    dLat+=(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;
    let dLng=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
    dLng+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
    dLng+=(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3;
    dLng+=(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;
    const radLat=lat/180*pi, magic=1-ee*Math.sin(radLat)**2, sqrtMagic=Math.sqrt(magic);
    dLat=dLat*180/((a*(1-ee))/(magic*sqrtMagic)*pi);
    dLng=dLng*180/(a/sqrtMagic*Math.cos(radLat)*pi);
    return {lat:lat-dLat,lng:lng-dLng};
  }
  const discoveries=discoveryRows.map(([city,kind,name,score,reviewCount,gcjLat,gcjLng,path,area,note])=>({
    city,kind,name,score,reviewCount,...gcjToWgs(gcjLat,gcjLng),area,note,
    source:'Trip.com',checkedAt:'2026-09-26',url:'https://www.trip.com'+path
  }));
  // time: recommended minimum time reserved, not an official round duration.
  const games = [
    {name:'双人成行',min:2,max:2,platforms:['ps','switch'],time:90,moods:['coop'],free:[],easy:false,url:'https://www.ea.com/games/it-takes-two',desc:'两个人分工合作的冒险，可同屏，也可在线相约。',note:'PS4 / PS5、Switch 对应版本；需一人拥有完整版。线上模式请核对好友通行证、会员及版本兼容要求。'},
    {name:'胡闹厨房 2',min:2,max:4,platforms:['ps','switch'],time:45,moods:['coop','party'],free:[],easy:false,url:'https://www.team17.com/games/overcooked-2/',desc:'一起切菜、上菜、拯救厨房；适合四人合作和热闹聚会。',note:'PS4 版（PS5 请核对兼容） / Switch 版，最多 4 人；本地与线上模式不同，别与“全都好吃”版本混用。'},
    {name:'星露谷物语',min:2,max:4,platforms:['ps','switch'],time:90,moods:['chill','coop'],free:[],easy:true,url:'https://www.stardewvalley.net/',desc:'一起种田、钓鱼、布置农场，适合固定搭子慢慢经营。',note:'本条按主机最多 4 人联机推荐；PS4 / Switch 对应版本，不跨平台。本地分屏人数与在线人数可能不同，请核对版本。'},
    {name:'双人成行',min:2,max:2,platforms:['pc'],time:90,moods:['coop'],free:[],easy:false,url:steam(1426210),desc:'专为两个人设计的合作冒险；适合愿意一起磨合操作的搭子。',note:'需一位玩家购买；好友通行证与账号要求见商店。'},
    {name:'胡闹厨房 2',min:2,max:4,platforms:['pc'],time:45,moods:['coop','party'],free:[],easy:false,url:steam(728880),desc:'切菜、传菜、救厨房。适合能接受手忙脚乱和反复配合的小队。',note:'购买前核对版本；不默认不同商店版本互通。'},
    {name:'人类一败涂地',min:2,max:8,platforms:['pc'],time:45,moods:['coop','party'],free:[],easy:true,url:steam(477160),desc:'软绵绵的物理解谜，失败也很好笑，适合不追求输赢的朋友。',note:'PC 联机房间；手机版本不在本条推荐范围。'},
    {name:'星露谷物语',min:2,max:8,platforms:['pc'],time:90,moods:['chill','coop'],free:[],easy:true,url:steam(413150),desc:'一起种田、钓鱼、经营农场。适合固定搭子慢慢积累共同存档。',note:'PC 1.6 版本最多 8 人；本条不包含手机联机。'},
    {name:'饥荒联机版',min:2,max:6,platforms:['pc'],time:90,moods:['coop'],free:[],easy:false,url:steam(322330),desc:'分工采集、建家、抵抗季节变化；适合愿意一起研究生存的小队。',note:'按默认 6 人服务器推荐；新手有学习成本。'},
    {name:'求生之路 2',min:2,max:4,platforms:['pc'],time:45,moods:['coop'],free:[],easy:false,url:steam(550),desc:'四人协作推进关卡，适合想要节奏明确、边聊边打的射击搭子。',note:'含恐怖、血腥内容；按合作战役人数推荐。'},
    {name:'深岩银河',min:2,max:4,platforms:['pc'],time:45,moods:['coop'],free:[],easy:false,url:steam(548430),desc:'四种职业协力采矿与撤离，适合喜欢分工和任务目标的小队。',note:'有射击与洞穴探索；先核对商店之间的联机支持。'},
    {name:'Pummel Party',min:2,max:8,platforms:['pc'],time:90,moods:['party','competitive'],free:[],easy:true,url:steam(880940),desc:'棋盘加迷你游戏，适合一群朋友开轻松互坑局。',note:'含卡通暴力；完整棋盘局需预留更多时间。'},
    {name:'鹅鸭杀',min:5,max:16,platforms:['pc','mobile'],time:45,moods:['party'],free:['pc','mobile'],easy:false,url:steam(1568590),desc:'靠聊天、观察和推理找出阵营，适合人数多且愿意开麦的朋友。',note:'含内购；按至少 5 人的实用组局人数推荐，区服和语音自行确认。'},
    {name:'Brawlhalla',min:2,max:8,platforms:['pc','mobile','ps','switch'],time:20,moods:['competitive','party'],free:['pc','mobile','ps','switch'],easy:false,url:'https://www.brawlhalla.com/',desc:'平台格斗，短时间也能打几轮。适合想来一点操作对抗的搭子。',note:'按自定义房间推荐；含内购，手机地区可用性以商店为准。'},
    {name:'Among Us',min:4,max:15,platforms:['pc','mobile','ps','switch'],time:45,moods:['party'],free:['mobile'],easy:true,url:'https://www.innersloth.com/games/among-us/',desc:'做任务、找线索、讨论投票；适合想用聊天和推理撑起一局的朋友。',note:'PC / 主机付费、手机可免费入门；含内购。主机请核实线上会员，建议同区服并提前约好语音。'},
    {name:'光·遇',min:2,max:4,platforms:['mobile'],time:45,moods:['chill','coop'],free:['mobile'],easy:true,url:'https://sky.163.com/',desc:'一起跑图、看风景、探索，适合不想有排名压力的轻松搭子。',note:'这里推荐 2—4 人同行，不代表服务器人数上限；含内购，先确认同服。'}
  ];
  // Coordinates use WGS84 to match OpenStreetMap. Each day is an area-based suggestion.
  const raw = [
    ['天津','华北',39.12,117.20,['food','history','city'],[4,5,9,10],300,2,'沿海河慢慢走，把老建筑和早餐都装进旅程。',[['五大道',39.104,117.205,'老街散步，留半天看建筑。'],['海河津湾广场',39.132,117.211,'傍晚看河岸与夜景。'],['古文化街',39.144,117.189,'白天逛街，早餐尝试本地小吃。']]],
    ['北京','华北',39.90,116.40,['history','city','food'],[4,5,9,10],500,4,'古都轴线和胡同生活，建议每天只安排一个大景区。',[['故宫博物院',39.917,116.397,'提前核实预约；若未约到，可改为周边漫步。'],['天坛',39.882,116.407,'上午逛园，下午安排休息。'],['什刹海',39.942,116.386,'胡同与湖边慢走，错开晚间拥挤时段。']]],
    ['上海','华东',31.23,121.47,['city','food','history'],[3,4,5,10,11],550,3,'从滨江天际线走到街角咖啡馆。',[['外滩',31.240,121.490,'沿江步行，傍晚看天际线。'],['武康路',31.207,121.435,'小街与建筑漫游，不打扰居民。'],['徐汇滨江',31.171,121.461,'留给展馆与河边散步，展览需另查开放时间。']]],
    ['杭州','华东',30.27,120.15,['nature','history','food'],[3,4,5,9,10,11],400,3,'西湖、茶山与古寺，留点空白比赶景点更舒服。',[['西湖',30.242,120.148,'选一段湖岸慢走，不必一天走完整圈。'],['龙井村',30.220,120.101,'茶村散步，体验前先询价。'],['灵隐寺',30.240,120.100,'核实景区与寺院票务，尽量早到。']]],
    ['苏州','华东',31.30,120.58,['history','nature','food'],[3,4,5,9,10,11],350,2,'园林和水巷适合放慢节奏，避开扎堆打卡。',[['拙政园',31.325,120.629,'提前看预约，上午逛园。'],['平江路',31.316,120.631,'沿河散步，和园林安排在同一天也可。'],['虎丘',31.338,120.579,'留出半天游览，台阶较多。']]],
    ['南京','华东',32.06,118.80,['history','food','city'],[3,4,5,9,10,11],350,3,'城墙、博物馆与街巷，小范围安排更省体力。',[['南京博物院',32.040,118.826,'馆藏丰富，先核实开放日与预约。'],['玄武湖',32.075,118.792,'湖边慢走，可搭配附近城墙。'],['夫子庙秦淮河',32.020,118.789,'晚间看河景，热门区域注意人流。']]],
    ['成都','西南',30.57,104.07,['food','city','history'],[3,4,5,9,10,11],350,3,'喝茶、吃饭、逛公园，一天留一个重点就好。',[['人民公园',30.657,104.055,'茶馆体验和散步，先看菜单价格。'],['武侯祠',30.646,104.049,'人文游览，可顺路逛周边。'],['成都大熊猫繁育研究基地',30.739,104.145,'提前预约，早出发；离市区较远。']]],
    ['重庆','西南',29.56,106.55,['food','city','history'],[3,4,5,10,11],350,3,'立体城市适合慢慢探索，坡道比地图看起来更多。',[['解放碑',29.558,106.577,'老城街区慢走，按体力选择坡道。'],['南滨路',29.549,106.593,'傍晚看江景，留意过江交通。'],['鹅岭公园',29.548,106.529,'登高看城市，穿好走的鞋。']]],
    ['西安','西北',34.26,108.94,['history','food','city'],[3,4,5,9,10,11],350,3,'把历史与街头小吃放在一起，远郊景点单独留一天。',[['西安城墙',34.251,108.942,'可从南门进入城墙，日晒时做好防护。'],['陕西历史博物馆',34.223,108.956,'以官方预约规则为准，约不到可改附近街区。'],['秦始皇帝陵博物院',34.385,109.278,'远郊行程，单独预留交通与参观时间。']]],
    ['青岛','华东',36.07,120.38,['coast','food','history'],[5,6,9,10],400,3,'海岸、老城和红瓦屋顶，沿岸分段走最轻松。',[['栈桥',36.060,120.316,'沿老城海岸漫步，海风大时加衣。'],['八大关',36.053,120.350,'街区与海岸慢游。'],['小麦岛',36.057,120.416,'天气好时看海，不翻越护栏。']]],
    ['厦门','华东',24.48,118.09,['coast','food','city'],[3,4,5,10,11],450,3,'岛屿漫步和海边骑行，先看天气再定上岛安排。',[['鼓浪屿',24.447,118.064,'提前核实轮渡与票务，岛上以步行为主。'],['沙坡尾',24.438,118.087,'街区和海港散步。'],['环岛路黄厝',24.433,118.164,'选一段海岸骑行，注意防晒。']]],
    ['大理','西南',25.61,100.27,['nature','history','chill'],[3,4,5,9,10,11],400,4,'古城和洱海适合留白，环湖不是一天赶完的清单。',[['大理古城',25.695,100.165,'第一天适应节奏，街巷慢走。'],['才村洱海边',25.716,100.191,'沿生态廊道步行或骑行，遵守分区规定。'],['喜洲古镇',25.855,100.131,'单独安排半天至一天，体验建筑与小吃。']]],
    ['桂林','华南',25.27,110.29,['nature','food'],[4,5,6,9,10],350,4,'山水行程受天气影响明显，水上项目先确认安全。',[['象山景区',25.267,110.294,'市区轻松游览，核实入园要求。'],['阳朔西街',24.778,110.495,'阳朔需另算城际交通，可考虑换住宿。'],['遇龙河',24.834,110.438,'徒步看田园，水上活动以当日安全要求为准。']]],
    ['昆明','西南',25.04,102.71,['nature','food','city'],[3,4,5,9,10,11],350,3,'从公园、花市到湖边，适合轻松进入云南旅行。',[['翠湖',25.049,102.704,'湖边散步，周边街区吃饭休息。'],['斗南花市',24.904,102.786,'先核实市场营业时段，留出往返时间。'],['海埂公园',24.958,102.660,'湖边走走，鸟类观赏受季节影响。']]],
    ['长沙','华中',28.23,112.94,['food','city','history'],[3,4,5,9,10,11],300,2,'街头小吃与江边漫步，别把每顿饭都安排成排队。',[['岳麓山',28.184,112.938,'上午上山，按体力挑步道。'],['橘子洲',28.195,112.960,'提前核实预约和交通，注意防晒。'],['太平老街',28.196,112.971,'街巷与小吃，错开最拥挤时段。']]],
    ['广州','华南',23.13,113.26,['food','city','history'],[3,4,10,11,12],400,3,'早茶、骑楼与江岸，把吃饭也当作正经行程。',[['永庆坊',23.119,113.239,'西关街区慢走，搭配粤式小吃。'],['沙面',23.110,113.240,'建筑漫步，避免打扰居民与办公场所。'],['花城广场',23.119,113.324,'傍晚看城市夜景。']]],
    ['三亚','华南',18.25,109.51,['coast','nature'],[1,2,3,4,11,12],650,4,'海边度假适合少换酒店，先看天气和海上活动条件。',[['三亚湾',18.273,109.482,'傍晚海边散步，注意防晒与潮汐。'],['亚龙湾',18.230,109.639,'预留交通，海上活动只选正规经营者。'],['鹿回头',18.224,109.499,'登高看湾景，先核实开放及票务。']]],
    ['哈尔滨','东北',45.80,126.53,['history','city','food'],[1,2,6,7,8,12],450,3,'冬日冰雪与夏季避暑是两种旅程，按季节做准备。',[['中央大街',45.774,126.618,'街区漫步，冬季注意防滑与保暖。'],['圣索菲亚教堂',45.769,126.627,'建筑与广场，室内开放情况另查。'],['太阳岛',45.794,126.599,'按季节安排公园游览，冰雪活动另核实。']]]
  ];
  const cities = raw.map(([name,region,lat,lng,types,months,budget,days,desc,spots]) => ({
    name,region,lat,lng,tags:types.filter(t=>tags[t]),months,budget,days,desc,
    spots:spots.map(([spot,lat,lng,note])=>({name:spot,lat,lng,note,rating:spotRatings.get(name+'/'+spot)||null,reviewNote:reviewNotes[name+'/'+spot]||''})),
    discoveries:discoveries.filter(item=>item.city===name),
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
  function estimateBudget(city, options) {
    // Planning allowances, not observed hotel prices or a live quote.
    const round=n=>Math.round(n/10)*10;
    const lodging=options.lodging||'solo';
    const stayFactor=lodging==='none'?0:lodging==='shared'?.65:1;
    const parts={
      stay:round(city.budget*.48*stayFactor*(options.peak?1.4:1)),
      food:round(Math.max(40,city.budget*.26)),
      transport:round(Math.max(20,city.budget*.12)),
      visits:round(city.budget*.14)
    };
    const daily=Object.values(parts).reduce((sum,n)=>sum+n,0);
    return {parts,daily,low:round(daily*.75),high:round(daily*1.35)};
  }
  function rankCities(options) {
    const weights=Object.fromEntries(Object.keys(tags).map(t=>[t,0]));
    const favorites=cities.filter(c=>options.favorites.includes(c.name));
    if(options.interests.length) options.interests.forEach(t=>{if(t in weights) weights[t]=1;});
    else favorites.forEach(c=>c.tags.forEach(t=>weights[t]++));
    if(!Object.values(weights).some(Boolean)) Object.keys(weights).forEach(t=>weights[t]=1);
    const total=Object.values(weights).reduce((a,b)=>a+b,0);
    return favorites.map(c=>{
      const affinity=c.tags.reduce((a,t)=>a+weights[t],0)/total;
      const cost=estimateBudget(c,options);
      const season=c.months.includes(options.month), affordable=options.budget>=cost.daily, enough=options.days>=c.days;
      const score=Math.round(affinity*45+(season?20:5)+20*Math.min(1,options.budget/cost.daily)+(enough?10:4)+5);
      return {...c,cost,score,season,affordable,enough,matched:c.tags.filter(t=>weights[t]>0)};
    }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'zh-CN'));
  }
  const api={tags,moods,games,cities,discoveries,matchGames,parseCities,rankCities,estimateBudget};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.XWTools=api;
})(typeof window!=='undefined'?window:{});

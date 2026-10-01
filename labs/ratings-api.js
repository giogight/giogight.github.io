(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GuanchaoRatingsAPI=api;})(typeof window!=='undefined'?window:this,()=>{'use strict';
const placeID=/^((node|way|relation):[0-9]{1,16}|tripcom:[1-9][0-9]{0,15})$/;
const validPlaceID=id=>typeof id==='string'&&placeID.test(id);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function config(value){
  if(!value?.enabled)return null;
  const url=new URL(value.supabaseUrl);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('在线服务配置无效');
  const key=value.publishableKey;
  if(typeof key!=='string'||key.length>4096)throw Error('在线服务配置无效');
  if(!key.startsWith('sb_publishable_')){let payload;try{payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{}if(payload?.role!=='anon')throw Error('网站只能使用公开客户端密钥');}
  return {url:url.origin,key};
}
function place(value){
  if(!value||!validPlaceID(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>120||!Number.isFinite(value.lat)||Math.abs(value.lat)>90||!Number.isFinite(value.lon)||Math.abs(value.lon)>180||!['food','drink','play','toilet'].includes(value.category)||(value.id.startsWith('tripcom:')&&value.category==='toilet'))throw Error('地点资料不完整');
  return {...value,name:value.name.trim()};
}
function memory(value){
  const text=(key,max,required)=>{const s=value?.[key];if(typeof s!=='string'||s.length>max||(required&&!s.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))throw Error('请填写城市、标题和文字感受');return s.trim();};
  return {city:text('city',80,true),title:text('title',120,true),caption:text('caption',1000,false)};
}
function create(raw,{fetchImpl=fetch,onSession=()=>{}}={}){
  const cfg=config(raw);if(!cfg)throw Error('在线分享与公开评分尚未开通');let session=null,refreshPending=null;
  function save(value){session=value?.access_token&&value?.refresh_token&&value?.user?.id?{access_token:value.access_token,refresh_token:value.refresh_token,user:{id:value.user.id},expires_at:value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600)}:null;onSession(session);return session;}
  async function request(path,{method='GET',data,body,auth=false,headers={}}={}){
    if(auth)await ensure();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetchImpl(cfg.url+path,{method,signal:controller.signal,headers:{apikey:cfg.key,...(data?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+session.access_token}:{}),...headers},body:body??(data?JSON.stringify(data):undefined)});
      if(!response.ok){if(response.status===401||response.status===403)throw Error('登录或访问未通过，请重新登录');if(response.status===429)throw Error('操作太频繁，请稍后再试');if(path.includes('/auth/'))throw Error('账号操作未完成，请检查邮箱、密码或确认邮件');throw Error('在线服务暂时无法访问，请稍后再试');}
      if(response.status===204)return null;const value=await response.text();if(value.length>1024*1024)throw Error('在线响应过大');return value?JSON.parse(value):null;
    }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('在线服务连接失败，请检查网络');throw error;}finally{clearTimeout(timer);}
  }
  async function ensure(){if(!session)throw Error('请先登录');if(session.expires_at>Date.now()/1000+30)return;if(!refreshPending)refreshPending=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:session.refresh_token}}).then(save).catch(error=>{save(null);throw error;}).finally(()=>refreshPending=null);await refreshPending;if(!session)throw Error('登录已失效，请重新登录');}
  const credentials=(email,password)=>{email=String(email||'').trim();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8||password.length>128)throw Error('请输入邮箱和至少8位密码');return {email,password};};
  function publicMemory(row){if(!uuid.test(row?.id)||!uuid.test(row.user_id)||row.photo_path!==row.user_id+'/'+row.id+'.jpg'||!Number.isFinite(Date.parse(row.created_at)))throw Error('照片资料无效');return {...memory(row),id:row.id,user_id:row.user_id,photo_path:row.photo_path,created_at:row.created_at,photo_url:cfg.url+'/storage/v1/object/public/city-memories/'+row.photo_path};}
  async function removePhoto(path){await request('/storage/v1/object/city-memories',{method:'DELETE',auth:true,data:{prefixes:[path]}});}
  return {
    get session(){return session;},
    restore:async value=>{if(!value?.access_token||!value.refresh_token||!value.user?.id)return save(null);save(value);try{await ensure();const user=await request('/auth/v1/user',{auth:true});if(user?.id!==session.user.id)throw Error('登录资料无效');return session;}catch{save(null);return null;}},
    signIn:async(email,password)=>save(await request('/auth/v1/token?grant_type=password',{method:'POST',data:credentials(email,password)})),
    signUp:async(email,password)=>{const result=await request('/auth/v1/signup',{method:'POST',data:credentials(email,password)});if(result?.access_token)save(result);return {confirmed:!!session};},
    signOut:async()=>{try{if(session)await request('/auth/v1/logout',{method:'POST',auth:true});}finally{save(null);}},
    stats:async ids=>{if(!Array.isArray(ids)||ids.length>200||ids.some(id=>!validPlaceID(id)))throw Error('地点编号无效');if(!ids.length)return[];const rows=await request('/rest/v1/rpc/get_place_rating_stats',{method:'POST',data:{place_ids:[...new Set(ids)]}});if(!Array.isArray(rows))throw Error('评分资料无效');return rows.map(row=>({id:row.place_id,metric:row.metric,average:Number(row.average),count:Number(row.votes)})).filter(row=>ids.includes(row.id)&&['overall','cleanliness'].includes(row.metric)&&(!row.id.startsWith('tripcom:')||row.metric==='overall')&&Number.isFinite(row.average)&&row.average>=1&&row.average<=5&&Number.isSafeInteger(row.count)&&row.count>0);},
    own:async id=>{if(!validPlaceID(id))throw Error('地点编号无效');if(!session)return null;const rows=await request('/rest/v1/place_ratings?select=score,metric&place_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(session.user.id),{auth:true});return rows?.[0]||null;},
    rate:async(value,score)=>{const p=place(value);if(!Number.isInteger(score)||score<1||score>5)throw Error('请选择1—5分');await ensure();await request('/rest/v1/place_ratings?on_conflict=user_id,place_id',{method:'POST',auth:true,headers:{Prefer:'resolution=merge-duplicates,return=minimal'},data:{user_id:session.user.id,place_id:p.id,place_name:p.name,latitude:p.lat,longitude:p.lon,category:p.category,metric:p.category==='toilet'?'cleanliness':'overall',score}});return score;},
    listMemories:async({city='',offset=0,limit=24}={})=>{if(typeof city!=='string'||city.length>80||!Number.isInteger(offset)||offset<0||offset>10000||!Number.isInteger(limit)||limit<1||limit>24)throw Error('照片查询条件无效');const query=new URLSearchParams({select:'id,user_id,city,title,caption,photo_path,created_at',order:'created_at.desc,id.desc',offset:String(offset),limit:String(limit)});if(city.trim())query.set('city','eq.'+city.trim());const rows=await request('/rest/v1/city_memories?'+query);if(!Array.isArray(rows)||rows.length>limit)throw Error('照片资料无效');return rows.map(publicMemory);},
    publishMemory:async(value,blob)=>{
      const info=memory(value);if(!(blob instanceof Blob)||blob.type!=='image/jpeg'||blob.size<4||blob.size>2*1024*1024)throw Error('请选择压缩后的JPEG照片，最大2MB');const magic=new Uint8Array(await blob.slice(0,3).arrayBuffer());if(magic[0]!==255||magic[1]!==216||magic[2]!==255)throw Error('照片格式无效');
      await ensure();if(!uuid.test(session.user.id))throw Error('登录资料无效');const id=crypto.randomUUID(),owner=session.user.id,photo_path=owner+'/'+id+'.jpg';
      await request('/storage/v1/object/city-memories/'+photo_path,{method:'POST',auth:true,body:blob,headers:{'Content-Type':'image/jpeg','x-upsert':'false'}});
      try{const rows=await request('/rest/v1/city_memories',{method:'POST',auth:true,headers:{Prefer:'return=representation'},data:{id,user_id:owner,...info,photo_path}});if(!Array.isArray(rows)||rows.length!==1)throw Error('照片发布未确认');return publicMemory(rows[0]);}
      catch(error){try{await removePhoto(photo_path);}catch{error.message+='；图片清理未确认，草稿仍保留，请稍后重试或联系站点管理者。';}throw error;}
    },
    deleteMemory:async post=>{const row=publicMemory(post);await ensure();if(row.user_id!==session.user.id)throw Error('只能删除自己发布的照片');const rows=await request('/rest/v1/city_memories?id=eq.'+row.id+'&user_id=eq.'+row.user_id,{method:'DELETE',auth:true,headers:{Prefer:'return=representation'}});if(!Array.isArray(rows)||rows.length>1)throw Error('删除未确认');try{await removePhoto(row.photo_path);return {photoRemoved:true};}catch{return {photoRemoved:false,message:'照片墙记录已删除，图片清理未确认，请联系站点管理者。'};}}
  };
}
return {config,place,memory,create};
});


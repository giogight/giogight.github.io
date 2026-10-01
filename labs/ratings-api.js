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
function sessionUser(user){
  const result={id:user.id};
  if(typeof user.email==='string'&&user.email.length<=254&&/^\S+@\S+\.\S+$/.test(user.email))result.email=user.email;
  const meta=user.app_metadata;
  if(meta){const allowed=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]{0,30}$/.test(value);const providers=Array.isArray(meta.providers)?[...new Set(meta.providers.filter(allowed))].slice(0,10):[];result.app_metadata={...(allowed(meta.provider)?{provider:meta.provider}:{}),providers};}
  return result;
}
function create(raw,{fetchImpl=fetch,onSession=()=>{}}={}){
  const cfg=config(raw);if(!cfg)throw Error('在线分享与公开评分尚未开通');let session=null,refreshPending=null;
  function save(value){session=value?.access_token&&value?.refresh_token&&value?.user?.id?{access_token:value.access_token,refresh_token:value.refresh_token,user:sessionUser(value.user),expires_at:value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600)}:null;onSession(session);return session;}
  async function request(path,{method='GET',data,body,auth=false,headers={}}={}){
    if(auth)await ensure();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetchImpl(cfg.url+path,{method,signal:controller.signal,headers:{apikey:cfg.key,...(data?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+session.access_token}:{}),...headers},body:body??(data?JSON.stringify(data):undefined)});
      if(!response.ok){
        const limits={GC_MEMORY_UPLOAD_DAILY_LIMIT:'今天已预留10张在线照片名额，请明天再新增；同一草稿重试不重复占用名额。',GC_MEMORY_OBJECT_LIMIT:'已用完累计200张在线照片名额，删除不返还名额；已预留草稿仍可重试。',GC_MEMORY_PUBLISH_DAILY_LIMIT:'今天已公开10张照片，请明天再来；本机草稿可以继续保存。',GC_MEMORY_PUBLIC_LIMIT:'已保留200张公开照片，请先删除不需要的公开照片；本机草稿仍保留。'};
        let limit;try{const text=await response.text();if(text.length<=8192){const details=JSON.parse(text);const messages=['code','message','error','details','detail'].map(key=>typeof details?.[key]==='string'?details[key]:'').join(' ');if(path.startsWith('/storage/v1/')||path.startsWith('/rest/v1/city_memories')||path.startsWith('/rest/v1/rpc/reserve_memory_upload'))limit=Object.keys(limits).find(tag=>messages.includes(tag));}}catch{}
        const message=limit?limits[limit]:response.status===401||response.status===403?'登录或访问未通过，请重新登录':response.status===429?'操作太频繁，请稍后再试':path.includes('/auth/')?'账号操作未完成，请检查邮箱、密码或确认邮件':'在线服务暂时无法访问，请稍后再试';const error=Error(message);error.status=response.status;if(limit)error.memoryLimit=limit;throw error;
      }
      if(response.status===204)return null;const value=await response.text();if(value.length>1024*1024)throw Error('在线响应过大');return value?JSON.parse(value):null;
    }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('在线服务连接失败，请检查网络');throw error;}finally{clearTimeout(timer);}
  }
  async function ensure(){if(!session)throw Error('请先登录');if(session.expires_at>Date.now()/1000+30)return;if(!refreshPending)refreshPending=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:session.refresh_token}}).then(save).catch(error=>{save(null);throw error;}).finally(()=>refreshPending=null);await refreshPending;if(!session)throw Error('登录已失效，请重新登录');}
  const credentials=(email,password)=>{email=String(email||'').trim();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8||password.length>128)throw Error('请输入邮箱和至少8位密码');return {email,password};};
  function publicMemory(row){if(!uuid.test(row?.id)||!uuid.test(row.user_id)||row.photo_path!==row.user_id+'/'+row.id+'.jpg'||!Number.isFinite(Date.parse(row.created_at)))throw Error('照片资料无效');return {...memory(row),id:row.id,user_id:row.user_id,photo_path:row.photo_path,created_at:row.created_at,photo_url:cfg.url+'/storage/v1/object/public/city-memories/'+row.photo_path};}
  async function removePhoto(path){await request('/storage/v1/object/city-memories',{method:'DELETE',auth:true,data:{prefixes:[path]}});}
  async function findPublication(id,owner,info){
    const query=new URLSearchParams({select:'id,user_id,city,title,caption,photo_path,created_at',id:'eq.'+id,limit:'1'});
    const rows=await request('/rest/v1/city_memories?'+query,{auth:true});
    if(!Array.isArray(rows)||rows.length>1)throw Error('照片发布核对未完成');
    if(!rows.length)return null;
    const row=publicMemory(rows[0]);
    if(row.id!==id||row.user_id!==owner){const error=Error('这次发布属于另一账号，请使用原账号核对');error.memoryConflict=true;throw error;}
    if(['city','title','caption'].some(key=>row[key]!==info[key])){const error=Error('这次发布的照片介绍已改变，请先核对原发布内容');error.memoryConflict=true;throw error;}
    return row;
  }
  async function photoExists(path){
    try{const info=await request('/storage/v1/object/info/city-memories/'+path,{auth:true});if(!info||typeof info!=='object'||Array.isArray(info))throw Error('照片上传核对未完成');return true;}
    catch(error){if(error.status===404)return false;throw error;}
  }
  function uncertain(error){if(error.memoryConflict)return error;const result=Error(error.memoryLimit?error.message+' 这张草稿可以在之后核对并重试。':'这次公开结果暂时无法确认，照片和草稿已保留。请稍后核对并重试，勿重新创建副本。');result.memoryOutcome='unknown';if(error.memoryLimit)result.memoryLimit=error.memoryLimit;return result;}
  function signInOAuth({provider='github',redirectTo,codeChallenge}={}){
    if(provider!=='github'||typeof redirectTo!=='string'||redirectTo.length>3000||typeof codeChallenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(codeChallenge))throw Error('GitHub登录准备未完成');
    const redirect=new URL(redirectTo),local=['localhost','127.0.0.1','[::1]'].includes(redirect.hostname);
    if((redirect.protocol!=='https:'&&!(redirect.protocol==='http:'&&local))||redirect.username||redirect.password||redirect.hash||!redirect.pathname.endsWith('/auth/callback.html')||redirect.searchParams.getAll('gc_state').length!==1||!/^[A-Za-z0-9_-]{16,256}$/.test(redirect.searchParams.get('gc_state')||'')||[...redirect.searchParams.keys()].some(key=>key!=='gc_state'))throw Error('GitHub登录返回地址无效');
    const query=new URLSearchParams({provider,redirect_to:redirect.href,code_challenge:codeChallenge,code_challenge_method:'s256'});
    return cfg.url+'/auth/v1/authorize?'+query;
  }
  return {
    get session(){return session;},
    restore:async value=>{if(!value?.access_token||!value.refresh_token||!value.user?.id)return save(null);save(value);try{await ensure();const user=await request('/auth/v1/user',{auth:true});if(user?.id!==session.user.id)throw Error('登录资料无效');return save({...session,user});}catch{save(null);return null;}},
    signIn:async(email,password)=>save(await request('/auth/v1/token?grant_type=password',{method:'POST',data:credentials(email,password)})),
    signInOAuth,beginOAuth:signInOAuth,
    exchangeCode:async(code,verifier)=>{
      if(typeof code!=='string'||!/^[A-Za-z0-9._~-]{1,4096}$/.test(code)||typeof verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))throw Error('GitHub登录确认资料无效');
      const result=await request('/auth/v1/token?grant_type=pkce',{method:'POST',data:{auth_code:code,code_verifier:verifier}});
      if(typeof result?.access_token!=='string'||!result.access_token||typeof result.refresh_token!=='string'||!result.refresh_token||!uuid.test(result.user?.id))throw Error('GitHub登录未确认');
      const user=await request('/auth/v1/user',{headers:{Authorization:'Bearer '+result.access_token}});
      if(user?.id!==result.user.id)throw Error('GitHub登录身份核对未通过');
      return save({...result,user});
    },
    updatePassword:async password=>{
      if(typeof password!=='string'||password.length<8||password.length>128)throw Error('请设置8—128位App登录密码');
      await ensure();const owner=session.user.id;const user=await request('/auth/v1/user',{method:'PUT',auth:true,data:{password}});
      if(user?.id!==owner)throw Error('密码修改身份核对未通过');save({...session,user});return session.user;
    },
    signUp:async(email,password)=>{const result=await request('/auth/v1/signup',{method:'POST',data:credentials(email,password)});if(result?.access_token)save(result);return {confirmed:!!session};},
    signOut:async()=>{try{if(session)await request('/auth/v1/logout',{method:'POST',auth:true});}finally{save(null);}},
    stats:async ids=>{if(!Array.isArray(ids)||ids.length>200||ids.some(id=>!validPlaceID(id)))throw Error('地点编号无效');if(!ids.length)return[];const rows=await request('/rest/v1/rpc/get_place_rating_stats',{method:'POST',data:{place_ids:[...new Set(ids)]}});if(!Array.isArray(rows))throw Error('评分资料无效');return rows.map(row=>({id:row.place_id,metric:row.metric,average:Number(row.average),count:Number(row.votes)})).filter(row=>ids.includes(row.id)&&['overall','cleanliness'].includes(row.metric)&&(!row.id.startsWith('tripcom:')||row.metric==='overall')&&Number.isFinite(row.average)&&row.average>=1&&row.average<=5&&Number.isSafeInteger(row.count)&&row.count>0);},
    own:async id=>{if(!validPlaceID(id))throw Error('地点编号无效');if(!session)return null;const rows=await request('/rest/v1/place_ratings?select=score,metric&place_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(session.user.id),{auth:true});return rows?.[0]||null;},
    rate:async(value,score)=>{const p=place(value);if(!Number.isInteger(score)||score<1||score>5)throw Error('请选择1—5分');await ensure();await request('/rest/v1/place_ratings?on_conflict=user_id,place_id',{method:'POST',auth:true,headers:{Prefer:'resolution=merge-duplicates,return=minimal'},data:{user_id:session.user.id,place_id:p.id,place_name:p.name,latitude:p.lat,longitude:p.lon,category:p.category,metric:p.category==='toilet'?'cleanliness':'overall',score}});return score;},
    listMemories:async({city='',offset=0,limit=24}={})=>{if(typeof city!=='string'||city.length>80||!Number.isInteger(offset)||offset<0||offset>10000||!Number.isInteger(limit)||limit<1||limit>24)throw Error('照片查询条件无效');const query=new URLSearchParams({select:'id,user_id,city,title,caption,photo_path,created_at',order:'created_at.desc,id.desc',offset:String(offset),limit:String(limit)});if(city.trim())query.set('city','eq.'+city.trim());const rows=await request('/rest/v1/city_memories?'+query);if(!Array.isArray(rows)||rows.length>limit)throw Error('照片资料无效');return rows.map(publicMemory);},
    publishMemory:async(value,blob,{id:publicationId,retry=false}={})=>{
      const info=memory(value);if(!(blob instanceof Blob)||blob.type!=='image/jpeg'||blob.size<4||blob.size>2*1024*1024)throw Error('请选择压缩后的JPEG照片，最大2MB');const magic=new Uint8Array(await blob.slice(0,3).arrayBuffer());if(magic[0]!==255||magic[1]!==216||magic[2]!==255)throw Error('照片格式无效');
      await ensure();if(!uuid.test(session.user.id)||publicationId!==undefined&&!uuid.test(publicationId)||typeof retry!=='boolean')throw Error('照片发布编号或登录资料无效');const id=(publicationId||crypto.randomUUID()).toLowerCase(),owner=session.user.id.toLowerCase(),photo_path=owner+'/'+id+'.jpg';
      let existing;try{existing=await findPublication(id,owner,info);}catch(error){throw uncertain(error);}if(existing)return existing;
      try{const reservation=await request('/rest/v1/rpc/reserve_memory_upload',{method:'POST',auth:true,data:{target_memory_id:id}});if(reservation?.memory_id!==id||typeof reservation.already_reserved!=='boolean')throw Error('在线照片名额预留未确认');}catch(error){throw uncertain(error);}
      let uploadedThisCall=false;
      try{await request('/storage/v1/object/city-memories/'+photo_path,{method:'POST',auth:true,body:blob,headers:{'Content-Type':'image/jpeg','x-upsert':'false'}});uploadedThisCall=true;}
      catch(error){
        try{existing=await findPublication(id,owner,info);if(existing)return existing;if(!await photoExists(photo_path))throw error;}
        catch(checkError){throw uncertain(checkError);}
      }
      try{const rows=await request('/rest/v1/city_memories',{method:'POST',auth:true,headers:{Prefer:'return=representation'},data:{id,user_id:owner,...info,photo_path}});if(!Array.isArray(rows)||rows.length!==1)throw Error('照片发布未确认');const row=publicMemory(rows[0]);if(row.id!==id||row.user_id!==owner||['city','title','caption'].some(key=>row[key]!==info[key]))throw Error('照片发布未确认');return row;}
      catch(error){
        try{existing=await findPublication(id,owner,info);}catch(checkError){throw uncertain(checkError);}if(existing)return existing;
        // Caller-owned IDs can be shared by another window's in-flight insert.
        // An empty query cannot justify deleting their accepted upload. Cleanup
        // is restricted to an ID freshly generated inside this single call.
        if(publicationId===undefined&&!retry&&uploadedThisCall&&error.status>=400&&error.status<500&&![408,409,429].includes(error.status)){
          try{await removePhoto(photo_path);}catch(cleanupError){throw uncertain(cleanupError);}
          error.memoryOutcome='not_committed';error.message+='；公开未完成，上传图片已清理，本机草稿保留。';throw error;
        }
        throw uncertain(error);
      }
    },
    deleteMemory:async post=>{const row=publicMemory(post);await ensure();if(row.user_id!==session.user.id)throw Error('只能删除自己发布的照片');const rows=await request('/rest/v1/city_memories?id=eq.'+row.id+'&user_id=eq.'+row.user_id,{method:'DELETE',auth:true,headers:{Prefer:'return=representation'}});if(!Array.isArray(rows)||rows.length>1)throw Error('删除未确认');try{await removePhoto(row.photo_path);return {photoRemoved:true};}catch{return {photoRemoved:false,message:'照片墙记录已删除，图片清理未确认，请联系站点管理者。'};}}
  };
}
return {config,place,memory,create};
});


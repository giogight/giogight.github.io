'use strict';
(()=>{
 let native;
 try{native=window.parent.guanchao||window.guanchao;}catch{}
 if(native){window.GC_WORKSPACE_API={native:true,request:(...args)=>native.request(...args),bounds:value=>native.bounds(value),listen:callback=>native.listen(callback)};return;}
 const KEY='gc-web-workspace-v1',DATA=window.GC_WORKSPACE_DATA,STATUSES=['待采样','待比较','待整理','待验证'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const uuid=()=>window.crypto?.randomUUID?.()||'gc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const listeners=new Set();let active=null,currentURL=null;
 const validSource=id=>DATA.sources.find(source=>source.id===id);
 const safeURL=value=>{try{const url=new URL(String(value));return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}};
 const recordable=value=>{const u=safeURL(value);if(!u)return false;const url=new URL(u);return !/(^|\.)(?:login|passport|auth|sso)\./i.test(url.hostname)&&! /\/(?:login|signin|oauth|authorize|passport|captcha|verify)(?:[/?._-]|$)/i.test(url.pathname)&&!url.searchParams.has('access_token')&&!url.searchParams.has('authorization_code');};
 const cleanNotes=value=>(Array.isArray(value)?value:[]).filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.body==='string').slice(0,100).map(n=>({id:n.id.slice(0,80),title:n.title.slice(0,100),tag:String(n.tag||'我的笔记').slice(0,20),status:STATUSES.includes(n.status)?n.status:STATUSES[0],body:n.body.slice(0,5000),edited:n.edited===true}));
 let state={version:1,theme:'day',muted:true,history:[],bookmarks:[],last:{},research:clone(DATA.templates),previousResearch:{}};
 try{
  const loaded=JSON.parse(localStorage.getItem(KEY));
  if(loaded?.version===1){
   state.theme=loaded.theme==='night'?'night':'day';state.muted=loaded.muted!==false;
   for(const kind of ['history','bookmarks'])state[kind]=(Array.isArray(loaded[kind])?loaded[kind]:[]).filter(row=>row&&validSource(row.source)&&recordable(row.url)&&typeof row.id==='string').slice(0,1000).map(row=>({id:row.id,source:row.source,url:safeURL(row.url),title:String(row.title||'打开记录').slice(0,120),visited:Number(row.visited)||Date.now(),note:String(row.note||'').slice(0,500)}));
   for(const source of DATA.sources){const notes=cleanNotes(loaded.research?.[source.id]);if(notes.length)state.research[source.id]=notes;const undo=cleanNotes(loaded.previousResearch?.[source.id]);if(undo.length)state.previousResearch[source.id]=undo;}
  }
 }catch{}
 function save(){localStorage.setItem(KEY,JSON.stringify(state));}
 function publicData(){return {...state,sources:DATA.sources.map(({id,label,detail,icon})=>({id,label,detail,icon})),canUndoResearch:Object.keys(state.previousResearch)};}
 function emit(value){for(const listener of listeners)listener(value);}
 function browser(){return {source:active,title:validSource(active)?.label||'平台入口',loading:false,back:false,forward:false,error:null,muted:state.muted,external:true};}
 function open(sourceId,url){
  const source=validSource(sourceId);if(!source)throw new Error('平台入口不存在');
  const target=safeURL(url||source.url);if(!target)throw new Error('请输入完整的 http 或 https 链接');
  active=sourceId;currentURL=target;
  window.open(target,'_blank','noopener,noreferrer');
  if(recordable(target)){
   const old=state.history.find(row=>row.url===target&&row.source===active);
   const row={id:old?.id||uuid(),source:active,url:target,title:source.label+' · 已打开链接',visited:Date.now()};
   state.history=[row,...state.history.filter(r=>r.id!==row.id)].slice(0,1000);state.last[active]=target;save();
  }
  emit({page:'browse',browser:browser(),state:publicData()});
 }
 window.GC_WORKSPACE_API={native:false,bounds:()=>{},listen:callback=>{listeners.add(callback);return()=>listeners.delete(callback);},request:async(action,payload={})=>{
  try{
   switch(action){
    case 'init':return {ok:true,state:publicData(),version:'网页版'};
    case 'page':return {ok:true,state:publicData()};
    case 'open':open(payload.source);break;
    case 'source-home':if(active)open(active);break;
    case 'open-link':{const target=safeURL(payload.url);if(!target)throw new Error('请输入完整的 http 或 https 链接');const host=new URL(target).hostname;const source=DATA.sources.find(source=>source.domains.some(domain=>host===domain||host.endsWith('.'+domain)))?.id||active;if(!source)throw new Error('请先选择一个平台入口');open(source,target);break;}
    case 'resume':{const row=[...state.history,...state.bookmarks].find(row=>row.id===payload.id);if(!row)throw new Error('记录不存在');open(row.source,row.url);break;}
    case 'reload':case 'external':if(active)open(active,currentURL);break;
    case 'theme':state.theme=payload.theme==='night'?'night':'day';save();emit({state:publicData()});break;
    case 'mute':state.muted=!state.muted;save();emit({state:publicData(),browser:browser()});break;
    case 'bookmark':{
     if(!active||!recordable(currentURL))throw new Error('请先选择平台或打开内容链接');
     if(!state.bookmarks.some(row=>row.url===currentURL&&row.source===active))state.bookmarks.unshift({id:uuid(),source:active,url:currentURL,title:validSource(active).label+' · 内容链接',visited:Date.now(),note:''});
     state.bookmarks=state.bookmarks.slice(0,1000);save();emit({state:publicData()});return {ok:true,notice:'已收入灵感库'};
    }
    case 'remove':if(['history','bookmarks'].includes(payload.kind)){state[payload.kind]=state[payload.kind].filter(row=>row.id!==payload.id);save();emit({state:publicData()});}break;
    case 'clear-history':state.history=[];state.last={};save();emit({state:publicData()});break;
    case 'rename':{const row=state.bookmarks.find(row=>row.id===payload.id);if(!row)throw new Error('条目不存在');row.title=String(payload.title||row.title).slice(0,120);row.note=String(payload.note||'').slice(0,500);save();emit({state:publicData()});break;}
    case 'research-save':{const note=state.research[payload.source]?.find(note=>note.id===payload.id);if(!note)throw new Error('笔记不存在');note.title=String(payload.title||'未命名选题').trim().slice(0,100);note.body=String(payload.body||'').slice(0,5000);note.status=STATUSES.includes(payload.status)?payload.status:note.status;note.edited=true;save();return {ok:true,state:publicData()};}
    case 'research-add':{const notes=state.research[payload.source];if(!notes)throw new Error('研究方向不存在');if(notes.length>=100)throw new Error('这个方向已有100条笔记，请先导出并整理');const note={id:uuid(),title:'新的选题',tag:'我的笔记',body:'',status:'待整理',edited:true};notes.push(note);save();return {ok:true,state:publicData(),createdId:note.id};}
    case 'research-shuffle':{const notes=state.research[payload.source];if(!notes)throw new Error('研究方向不存在');state.previousResearch[payload.source]=clone(notes);const drafts=clone(DATA.templates[payload.source]).map(note=>({...note,id:uuid()})).sort(()=>Math.random()-.5);state.research[payload.source]=[...notes.filter(note=>note.edited),...drafts].slice(0,100);save();emit({state:publicData()});break;}
    case 'research-undo':if(state.previousResearch[payload.source]){state.research[payload.source]=state.previousResearch[payload.source];delete state.previousResearch[payload.source];save();emit({state:publicData()});}break;
    case 'about':return {ok:true,version:'网页版',history:state.history.length};
    default:throw new Error('网页版不支持此操作');
   }
   return {ok:true};
  }catch(error){return {ok:false,error:error.name==='QuotaExceededError'?'浏览器保存空间不足，请先导出笔记':error.message};}
 }};
})();

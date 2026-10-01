'use strict';
const $=id=>document.getElementById(id);
const iconPaths={waves:'M2 6c3-4 5 4 8 0s5 4 8 0 3 0 4 0M2 12c3-4 5 4 8 0s5 4 8 0 3 0 4 0M2 18c3-4 5 4 8 0s5 4 8 0 3 0 4 0',compass:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m4 5-2.5 5.5L8 16l2.5-5.5Z',history:'M3 11a9 9 0 1 1 2.5 7M3 4v7h7M12 7v5l3 2',bookmark:'M6 3h12v18l-6-4-6 4Z',moon:'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',play:'m8 4 12 8-12 8Z',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',bag:'M5 7h14l1 14H4ZM9 7V5a3 3 0 0 1 6 0v2',box:'m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M8 4l9 5',film:'M3 3h18v18H3ZM7 3v18M17 3v18M3 8h4m10 0h4M3 16h4m10 0h4',radio:'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12M3 3a13 13 0 0 0 0 18M21 3a13 13 0 0 1 0 18',chat:'M3 3h16v12H7l-4 4ZM9 19h8l4 3V9',minus:'M5 12h14',square:'M5 5h14v14H5Z',x:'m6 6 12 12M18 6 6 18','arrow-left':'m12 5-7 7 7 7M5 12h15','arrow-right':'m12 5 7 7-7 7M4 12h15','arrow-up-right':'M6 18 18 6M6 6h12v12',refresh:'M20 7V2m0 5h-5M4 17v5m0-5h5M4 8a8 8 0 0 1 14-3l2 2M4 17l2 2a8 8 0 0 0 14-3',link:'m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l6-6a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-6 6a4 4 0 0 1-6 0',external:'M14 3h7v7M10 14 21 3M10 3H3v18h18v-7',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6','volume-off':'M11 5 6 9H3v6h3l5 4ZM17 9l5 6m0-6-5 6',volume:'M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14'};
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',iconPaths[name]||iconPaths.compass);svg.append(p);return svg;}
document.querySelectorAll('[data-icon]').forEach(e=>e.append(icon(e.dataset.icon)));
let state={sources:[],history:[],bookmarks:[],theme:'day',muted:true};
let page='home',browser={source:null},editingId=null,toastTimer;
const selectedNotes={};
let editorId=null,editorSource=null,editorDirty=false,editorRevision=0;
const api=window.GC_WORKSPACE_API;
let workspaceActive=true,workspaceRevision=0,autosaveTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
async function request(action,payload){try{const r=await api.request(action,payload);if(!r.ok){toast(r.error||'操作失败');return null;}if(r.state)updateState(r.state);if(r.notice)toast(r.notice);return r;}catch{toast('连接已中断，请重新打开观潮。');return null;}}
function source(id){return state.sources.find(s=>s.id===id);}
function fmtDate(time){const d=new Date(time),now=new Date();const today=d.toDateString()===now.toDateString();return(today?'今天 ':d.toLocaleDateString('zh-CN')+' ')+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});}
function renderSources(){
 $('source-grid').replaceChildren();$('source-switch').replaceChildren();
 for(const s of state.sources){
  const b=document.createElement('button');b.type='button';b.className='source-card';b.dataset.source=s.id;
  const mark=document.createElement('span');mark.className='source-icon';mark.append(icon(s.icon));
  const arrow=document.createElement('span');arrow.className='corner-arrow';arrow.append(icon('arrow-up-right'));
  const h=document.createElement('h3');h.textContent=s.label;const p=document.createElement('p');p.textContent=s.detail;b.append(mark,arrow,h,p);$('source-grid').append(b);
  const tab=document.createElement('button');tab.type='button';tab.dataset.source=s.id;tab.textContent=s.label;tab.setAttribute('aria-pressed','false');$('source-switch').append(tab);
 }
}
function recordNode(row,kind,compact=false){
 const div=document.createElement('article');div.className='record';
 const open=document.createElement('button');open.type='button';open.className='record-open';open.dataset.resume=row.id;
 const title=document.createElement('span');title.className='record-title';title.textContent=row.title;title.title=row.title;
 const meta=document.createElement('span');meta.className='record-meta';meta.textContent=(source(row.source)?.label||'研究条目')+' · '+fmtDate(row.visited);
 const go=document.createElement('span');go.className='record-continue';go.textContent='继续查看';open.append(title,meta,go);
 if(row.note){const p=document.createElement('span');p.className='record-note';p.textContent=row.note;open.append(p);}div.append(open);
 if(!compact){const actions=document.createElement('div');actions.className='record-actions';if(kind==='bookmarks'){const edit=document.createElement('button');edit.type='button';edit.className='text-button';edit.textContent='备注';edit.dataset.edit=row.id;actions.append(edit);}const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='移除';remove.dataset.remove=row.id;remove.dataset.kind=kind;remove.setAttribute('aria-label','移除 '+row.title);actions.append(remove);div.append(actions);}return div;
}
function renderRecords(){
 const query=$('history-search').value.trim().toLowerCase(),bquery=$('bookmark-search').value.trim().toLowerCase();
 const h=state.history.filter(r=>(r.title+' '+(source(r.source)?.label||'')).toLowerCase().includes(query));
 const b=state.bookmarks.filter(r=>(r.title+' '+r.note+' '+(source(r.source)?.label||'')).toLowerCase().includes(bquery));
 $('recent-list').replaceChildren(...state.history.slice(0,3).map(r=>recordNode(r,'history',true)));
 $('history-list').replaceChildren(...h.map(r=>recordNode(r,'history')));
 $('bookmarks-list').replaceChildren(...b.map(r=>recordNode(r,'bookmarks')));
 $('recent-empty').hidden=state.history.length>0;$('history-empty').hidden=h.length>0;$('bookmarks-empty').hidden=b.length>0;
 $('history-empty').querySelector('h2').textContent=query?'没有匹配的记录。':'从一次发现开始。';
 $('bookmarks-empty').querySelector('h2').textContent=bquery?'没有匹配的灵感。':'给好想法留个位置。';
 $('bookmark-count').textContent=state.bookmarks.length;$('clear-history').disabled=state.history.length===0;
}
function renderResearch(){
 const sourceId=browser.source||'sample',notes=state.research?.[sourceId]||[];
 const selected=notes.find(n=>n.id===selectedNotes[sourceId])||notes[0];
 if(!selected)return;
 selectedNotes[sourceId]=selected.id;
  const query=$('notes-search').value.trim().toLowerCase();
  const filtered=notes.filter(n=>(n.title+' '+n.body+' '+n.tag).toLowerCase().includes(query));
  $('note-count').textContent=filtered.length+'/'+notes.length+' 条';
  $('topic-list').replaceChildren(...filtered.map(n=>{
  const button=document.createElement('button');button.type='button';button.className='topic-row'+(n.id===selected.id?' selected':'');button.dataset.topic=n.id;button.setAttribute('aria-pressed',String(n.id===selected.id));
  const copy=document.createElement('span');copy.className='topic-copy';const title=document.createElement('strong');title.textContent=n.title;title.title=n.title;const tag=document.createElement('small');tag.textContent=n.tag;copy.append(title,tag);
  const status=document.createElement('span');status.className='topic-status';status.textContent=n.status;button.append(copy,status);return button;
 }));
 $('undo-notes').hidden=!(state.canUndoResearch||[]).includes(sourceId);
 if(editorId!==selected.id||editorSource!==sourceId||!editorDirty){
  editorId=selected.id;editorSource=sourceId;editorDirty=false;editorRevision++;
  $('research-title').value=selected.title;$('research-body').value=selected.body;$('research-status').value=selected.status;
  $('research-save-status').textContent=selected.edited?'笔记已保存':'草稿已保存';
 }
 $('note-tag').textContent=selected.tag;
 $('home-topics').replaceChildren(...notes.slice(0,3).map(n=>{
  const button=document.createElement('button');button.type='button';button.className='home-topic';button.dataset.homeTopic=n.id;button.dataset.topicSource=sourceId;
  const title=document.createElement('span');title.textContent=n.title;const label=document.createElement('small');label.textContent=source(sourceId)?.label||'选题草稿';const status=document.createElement('span');status.className='topic-status';status.textContent=n.status;button.append(title,label,status);return button;
 }));
}
async function saveResearch(){
 if(!editorDirty||!editorId)return true;
 const id=editorId,sourceId=editorSource,revision=editorRevision;
 const result=await request('research-save',{id,source:sourceId,title:$('research-title').value,body:$('research-body').value,status:$('research-status').value});
 if(!result)return false;
 if(editorId===id&&editorRevision===revision){editorDirty=false;renderResearch();}return !editorDirty;
}
function updateState(next){const first=state.sources.length===0;state=next;document.body.dataset.theme=state.theme;$('theme-label').textContent=state.theme==='night'?'切换白天':'切换夜晚';$('theme-icon').replaceChildren(icon(state.theme==='night'?'sun':'moon'));document.querySelector('.theme-description').textContent=state.theme==='night'?'夜间 · 曜石':'日间 · 柔光';if(first)renderSources();renderRecords();renderBrowser();renderResearch();}
function showPage(next){page=next;if(next!=='browse'){$('research-layout').classList.remove('wide-preview');$('wide-preview').textContent='放大';$('wide-preview').setAttribute('aria-pressed','false');}for(const p of ['home','history','bookmarks','browse'])$(p+'-page').hidden=p!==next;document.querySelectorAll('.main-nav button').forEach(b=>{const selected=b.id==='notes-nav'?next==='browse':b.dataset.page===next;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});requestAnimationFrame(updateBounds);}
function renderBrowser(){if(!browser.source)return;$('browse-heading').textContent=source(browser.source)?.label||'内容浏览';$('go-back').disabled=!browser.back;$('go-forward').disabled=!browser.forward;$('mute-button').replaceChildren(icon(state.muted?'volume-off':'volume'));$('mute-button').setAttribute('aria-label',state.muted?'开启声音':'静音');document.querySelectorAll('#source-switch button').forEach(b=>{b.classList.toggle('selected',b.dataset.source===browser.source);b.setAttribute('aria-pressed',String(b.dataset.source===browser.source));});$('load-status').textContent=browser.error?'加载未完成':browser.loading?'正在加载…':(state.muted?'页面已就绪 · 静音':'页面已就绪');$('browser-message-title').textContent=browser.error?'暂时没有加载成功':'正在打开内容';$('browser-message-text').textContent=browser.error?.message||'首次加载可能需要一点时间。';$('error-actions').hidden=!browser.error;renderResearch();requestAnimationFrame(updateBounds);}
function updateBounds(){
 if(!api?.native)return;
 const r=$('browser-host').getBoundingClientRect();let frame={x:0,y:0,width:innerWidth,height:innerHeight};
 try{if(window.frameElement)frame=window.frameElement.getBoundingClientRect();}catch{}
 const sx=frame.width/innerWidth||1,sy=frame.height/innerHeight||1;
 let left=frame.x+(r.x+1)*sx,top=frame.y+(r.y+1)*sy,right=left+(r.width-2)*sx,bottom=top+(r.height-2)*sy;
 left=Math.max(left,frame.x);top=Math.max(top,frame.y);right=Math.min(right,frame.x+frame.width);bottom=Math.min(bottom,frame.y+frame.height);
 try{
  left=Math.max(0,left);top=Math.max(0,top);right=Math.min(window.parent.innerWidth,right);bottom=Math.min(window.parent.innerHeight,bottom);
  let ancestor=window.frameElement?.parentElement;
  while(ancestor){const style=window.parent.getComputedStyle(ancestor),clip=ancestor.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(style.overflowX||style.overflow)){left=Math.max(left,clip.x);right=Math.min(right,clip.x+clip.width);}if(/auto|scroll|hidden|clip/.test(style.overflowY||style.overflow)){top=Math.max(top,clip.y);bottom=Math.min(bottom,clip.y+clip.height);}ancestor=ancestor.parentElement;}
 }catch{}
 const width=right-left,height=bottom-top;
 api.bounds({x:left,y:top,width:Math.max(1,width),height:Math.max(1,height),visible:workspaceActive&&page==='browse'&&width>2&&height>2&&!document.querySelector('dialog[open]')&&!browser.error});
}
function showDialog(id){$(id).showModal();updateBounds();}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());updateBounds();}
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',updateBounds));
document.addEventListener('click',async event=>{
 const topic=event.target.closest('[data-topic]');if(topic){if(await saveResearch()){selectedNotes[browser.source]=topic.dataset.topic;renderResearch();}return;}
 const homeTopic=event.target.closest('[data-home-topic]');if(homeTopic){if(await saveResearch()){selectedNotes[homeTopic.dataset.topicSource]=homeTopic.dataset.homeTopic;await request('open',{source:homeTopic.dataset.topicSource});}return;}
 const src=event.target.closest('[data-source]');if(src){if(await saveResearch())await request('open',{source:src.dataset.source});return;}
 const nav=event.target.closest('[data-page]');if(nav){if(await saveResearch()&&await request('page',{page:nav.dataset.page}))showPage(nav.dataset.page);return;}
 const resume=event.target.closest('[data-resume]');if(resume){if(await saveResearch())await request('resume',{id:resume.dataset.resume});return;}
 const remove=event.target.closest('[data-remove]');if(remove){await request('remove',{id:remove.dataset.remove,kind:remove.dataset.kind});return;}
 const edit=event.target.closest('[data-edit]');if(edit){const r=state.bookmarks.find(r=>r.id===edit.dataset.edit);if(r){editingId=r.id;$('edit-title').value=r.title;$('edit-note').value=r.note;showDialog('edit-dialog');}return;}
 if(event.target.closest('[data-close-dialog]')){closeDialogs();return;}
 const action=event.target.closest('[data-action]');if(action){if(action.dataset.action==='link-dialog'){$('link-input').value='';showDialog('link-dialog');$('link-input').focus();}else if(action.dataset.action!=='close'||await saveResearch())await request(action.dataset.action);}
});
$('research-form').addEventListener('submit',async event=>{event.preventDefault();await saveResearch();});
for(const id of ['research-title','research-body','research-status'])$(id).addEventListener('input',()=>{editorDirty=true;editorRevision++;$('research-save-status').textContent='有修改 · 待保存';clearTimeout(autosaveTimer);autosaveTimer=setTimeout(saveResearch,650);});
for(const [id,action] of [['shuffle-notes','research-shuffle'],['undo-notes','research-undo']])$(id).addEventListener('click',async()=>{
 const sourceId=browser.source;if(!sourceId)return;$(id).disabled=true;
 try{if(await saveResearch())await request(action,{source:sourceId});}finally{$(id).disabled=false;}
});
$('wide-preview').addEventListener('click',()=>{const wide=$('research-layout').classList.toggle('wide-preview');$('wide-preview').textContent=wide?'还原布局':'放大';$('wide-preview').setAttribute('aria-pressed',String(wide));requestAnimationFrame(updateBounds);});
$('theme-button').addEventListener('click',()=>request('theme',{theme:state.theme==='day'?'night':'day'}));
$('about-button').addEventListener('click',()=>showDialog('about-dialog'));
$('clear-history').addEventListener('click',()=>showDialog('clear-dialog'));
$('confirm-clear').addEventListener('click',async()=>{await request('clear-history');closeDialogs();});
$('history-search').addEventListener('input',renderRecords);$('bookmark-search').addEventListener('input',renderRecords);
$('link-form').addEventListener('submit',async e=>{e.preventDefault();if(!await saveResearch())return;const r=await request('open-link',{url:$('link-input').value});if(r)closeDialogs();});
$('edit-form').addEventListener('submit',async e=>{e.preventDefault();const r=await request('rename',{id:editingId,title:$('edit-title').value,note:$('edit-note').value});if(r)closeDialogs();});
document.addEventListener('keydown',async e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='h'){e.preventDefault();closeDialogs();if(await saveResearch()&&await request('page',{page:'home'}))showPage('home');}});
new ResizeObserver(updateBounds).observe($('browser-host'));
if(api){api.listen(data=>{if(data.state)updateState(data.state);if(data.browser){browser=data.browser;renderBrowser();renderExternal();}if(data.page)showPage(data.page);if(data.notice)toast(data.notice);if(data.resize)requestAnimationFrame(updateBounds);});request('init').then(result=>{if(result)$('version-label').textContent=result.version;setupRuntime();postReady();});}
function renderExternal(){
 if(api.native||!browser.source)return;
 $('browser-message-title').textContent='平台在新窗口打开';$('browser-message-text').textContent='在平台查看素材，回到这里整理笔记、收藏链接。';$('error-actions').hidden=false;
 $('error-actions').replaceChildren();const button=document.createElement('button');button.type='button';button.className='button accent';button.textContent='再次打开平台';button.addEventListener('click',()=>request('external'));$('error-actions').append(button);
 $('load-status').textContent='本页保留笔记 · 第三方平台在外部窗口';
}
function setupRuntime(){
 document.body.dataset.runtime=api.native?'desktop':'web';
 if(!api.native){$('runtime-label').textContent='保存在当前浏览器\n平台在新窗口打开';$('about-storage').textContent='选题笔记、打开记录及收藏保存在当前浏览器。清理网站数据会移除本地资料，请定期导出笔记。';$('about-browser').textContent='网页版与手机版通过外部窗口打开平台，不会读取第三方页面的实际浏览历史或登录状态。';$('history-page').querySelector('h1').textContent='打开记录';$('history-page').querySelector('.hero p').textContent='保存从工作台打开的链接，下次接着看。';$('history-empty').querySelector('p').textContent='从工作台打开平台或链接后，会在这里留一条记录。';$('link-dialog').querySelector('p').textContent='粘贴网页链接，在外部窗口打开，并保存在本页打开记录中。';$('clear-dialog').querySelector('p').textContent='将移除当前浏览器中的打开记录。收藏及选题笔记会保留。';$('mute-button').hidden=true;$('go-back').hidden=true;$('go-forward').hidden=true;$('wide-preview').hidden=true;}
}
function postReady(){if(window.parent!==window)window.parent.postMessage({type:'guanchao:workspace-ready',native:api.native},location.protocol==='file:'?'*':location.origin);}
$('notes-nav').addEventListener('click',async()=>{if(!await saveResearch())return;const sourceId=browser.source||'sample';if(api.native)await request('open',{source:sourceId});else{browser={source:sourceId,back:false,forward:false};showPage('browse');renderBrowser();renderExternal();}requestAnimationFrame(()=>$('research-title').focus());});
$('notes-search').addEventListener('input',renderResearch);
$('add-note').addEventListener('click',async()=>{if(!await saveResearch())return;const sourceId=browser.source||'sample';const result=await request('research-add',{source:sourceId});if(result){selectedNotes[sourceId]=result.createdId;renderResearch();$('research-title').focus();$('research-title').select();}});
$('export-notes').addEventListener('click',async()=>{if(!await saveResearch())return;const sourceId=browser.source||'sample';const notes=state.research?.[sourceId]||[];const title=source(sourceId)?.label||'选题笔记';const content='# '+title+' · 选题笔记\n\n导出日期：'+new Date().toLocaleDateString('zh-CN')+'\n\n'+notes.map(note=>'## '+note.title+'\n\n方向：'+note.tag+' ｜ 进度：'+note.status+'\n\n'+note.body+'\n').join('\n---\n\n');const blob=new Blob([content],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='观潮-'+title+'-选题笔记.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已导出 '+notes.length+' 条笔记');});
window.addEventListener('message',async event=>{
 if(event.source!==window.parent||(event.origin!==location.origin&&!(event.origin==='null'&&location.protocol==='file:')))return;
 const message=event.data;if(!message||typeof message!=='object')return;
 if(message.type==='guanchao:pause'){const revision=++workspaceRevision;workspaceActive=false;updateBounds();const saved=await saveResearch();if(revision===workspaceRevision&&api.native)await request('browser-pause');if(window.parent!==window)window.parent.postMessage({type:'guanchao:workspace-paused',saved},location.protocol==='file:'?'*':location.origin);}
 if(message.type==='guanchao:resume'){++workspaceRevision;workspaceActive=true;const theme=message.theme;if(theme){state.theme=['night','dark'].includes(theme)?'night':'day';document.body.dataset.theme=state.theme;}if(api.native&&page==='browse'&&browser.source)await request('open',{source:browser.source});requestAnimationFrame(updateBounds);}
 if(message.type==='guanchao:theme'){const theme=['night','dark'].includes(message.theme)?'night':'day';await saveResearch();await request('theme',{theme});}
});
window.addEventListener('resize',updateBounds);
window.addEventListener('scroll',updateBounds,true);
try{window.parent.addEventListener('resize',updateBounds);window.parent.addEventListener('scroll',updateBounds,true);}catch{}
window.addEventListener('pagehide',()=>{clearTimeout(autosaveTimer);saveResearch();});

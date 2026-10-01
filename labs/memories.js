(function(root){
  'use strict';
  const maxPhoto=2*1024*1024,maxInput=30*1024*1024,maxDrafts=100;
  function metadata(value){
    if(!value||typeof value.city!=='string'||!value.city.trim()||value.city.trim().length>80||typeof value.title!=='string'||!value.title.trim()||value.title.trim().length>120||typeof value.caption!=='string'||value.caption.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.city+value.title+value.caption))throw Error('请填写城市、1–120字的标题，以及1000字以内的感受。');
    return {city:value.city.trim(),title:value.title.trim(),caption:value.caption.trim()};
  }
  function photo(blob){if(!(blob instanceof Blob)||blob.type!=='image/jpeg'||blob.size<1||blob.size>maxPhoto)throw Error('照片需要是2MB以内的JPEG。');return blob;}
  function publicRow(value){
    const data=metadata(value);if(typeof value.id!=='string'||value.id.length>80||typeof value.user_id!=='string'||value.user_id.length>80||typeof value.photo_url!=='string'||value.photo_url.length>3000)throw Error('照片资料不完整。');
    const url=new URL(value.photo_url);if(url.protocol!=='https:'||url.username||url.password)throw Error('照片地址不正确。');return {...value,...data,photo_url:url.href};
  }
  function createDraftDB(indexedDB){
    let pending;
    function open(){if(!pending)pending=new Promise((resolve,reject)=>{const r=indexedDB.open('gc-city-memories-v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('drafts')){const s=r.result.createObjectStore('drafts',{keyPath:'id'});s.createIndex('city','city',{unique:false});}};r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();pending=null;};resolve(db);};r.onerror=()=>{pending=null;reject(Error('本机草稿存储不可用，请检查浏览器存储权限。'));};r.onblocked=()=>reject(Error('其他页面正在使用草稿，请关闭旧页面后重试。'));});return pending;}
    async function run(mode,action){const db=await open();return new Promise((resolve,reject)=>{let result;const tx=db.transaction('drafts',mode),s=tx.objectStore('drafts');try{const req=action(s);req.onsuccess=()=>result=req.result;req.onerror=()=>reject(req.error||Error('草稿操作失败。'));}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('草稿未保存，请检查剩余存储空间。'));});}
    return {list:()=>run('readonly',s=>s.getAll()),put:async value=>{const data=metadata(value);photo(value.blob);if(typeof value.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(value.id))throw Error('草稿编号不正确。');const rows=await run('readonly',s=>s.getAllKeys());if(rows.length>=maxDrafts&&!rows.includes(value.id))throw Error('本机最多保存100张草稿，请先整理现有照片。');return run('readwrite',s=>s.put({...value,...data}));},remove:id=>run('readwrite',s=>s.delete(id))};
  }
  async function compressPhoto(file){
    if(!(file instanceof Blob)||!file.size||file.size>maxInput||!/^image\//.test(file.type))throw Error('请选择30MB以内的照片文件。');
    let image,url;
    try{
      url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode();const w=image.naturalWidth,h=image.naturalHeight;if(!w||!h||w*h>80000000)throw Error('照片像素过大，请先缩小后重试。');
      let scale=Math.min(1,1600/Math.max(w,h));const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('当前设备无法处理照片。');
      for(let resize=0;resize<3;resize++){
        canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
        for(const quality of [.88,.76,.64,.5,.38]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=maxPhoto){photo(blob);return {blob,width:canvas.width,height:canvas.height};}}
        scale*=.8;
      }
      throw Error('这张照片压缩后仍然过大，请换一张照片。');
    }catch(error){if(error.message==='The source image cannot be decoded.'||error.name==='EncodingError')throw Error('这台设备无法读取该照片格式，请导出为JPG、PNG或WebP再添加。');throw error;}finally{if(url)URL.revokeObjectURL(url);if(image)image.src='';}
  }
  const core={metadata,photo,publicRow,createDraftDB,compressPhoto,maxPhoto,maxInput};if(typeof module==='object'&&module.exports)module.exports=core;root.GuanchaoMemories=core;if(!root.document)return;
  const host=document.getElementById('cityMemories');if(!host)return;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,cls)=>{const b=node('button',text,cls);b.type='button';return b;};
  host.classList.add('city-memories');host.dataset.lowpower=String((navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4);
  const header=node('header',null,'memory-heading'),heading=node('div');heading.append(node('p','YOUR CITY, YOUR MOMENT','memory-kicker'),node('h3','城市记忆'),node('p','一张照片，一段自己的感受。','memory-intro'));const add=button('＋ 留下一张照片','memory-add');header.append(heading,add);
  const search=node('form',null,'memory-search');search.setAttribute('role','search');const cityInput=node('input');cityInput.type='search';cityInput.maxLength=80;cityInput.required=true;cityInput.placeholder='搜索一座城市的照片';cityInput.setAttribute('aria-label','照片墙城市');const searchButton=node('button','看看这座城');searchButton.type='submit';search.append(cityInput,searchButton);
  const publicStatus=node('p',null,'memory-status');publicStatus.setAttribute('role','status');const publicGrid=node('div',null,'memory-grid');publicGrid.setAttribute('aria-label','城市公开照片');const more=button('再看一些照片','memory-more');more.hidden=true;
  const localHeader=node('div',null,'memory-local-heading');const localTitle=node('h4','本机草稿');localHeader.append(localTitle,node('p','先留下来，准备好后再公开。'));const draftStatus=node('p',null,'memory-status');draftStatus.setAttribute('role','status');const draftGrid=node('div',null,'memory-grid memory-drafts');draftGrid.setAttribute('aria-label','保存在本机的照片草稿');host.append(header,search,publicStatus,publicGrid,more,localHeader,draftStatus,draftGrid);
  const editor=node('dialog',null,'memory-editor');editor.setAttribute('aria-label','编辑照片记忆');const form=node('form'),editorHead=node('div',null,'memory-dialog-heading'),editorTitle=node('h3','留下一张照片'),close=button('×','memory-close');close.setAttribute('aria-label','关闭照片编辑');editorHead.append(editorTitle,close);
  const fileLabel=node('label','选择照片','memory-file-label'),fileInput=node('input');fileInput.type='file';fileInput.accept='image/jpeg,image/png,image/webp,image/heic,image/heif';fileLabel.append(fileInput);const preview=node('img',null,'memory-preview');preview.alt='待保存照片预览';preview.hidden=true;
  const cityLabel=node('label','在哪座城市？'),draftCity=node('input');draftCity.maxLength=80;draftCity.required=true;draftCity.placeholder='例如：天津';cityLabel.append(draftCity);
  const titleLabel=node('label','给照片起个标题'),draftTitle=node('input');draftTitle.maxLength=120;draftTitle.required=true;draftTitle.placeholder='由你写下这一刻';titleLabel.append(draftTitle);
  const captionLabel=node('label','介绍与感受'),caption=node('textarea');caption.rows=4;caption.maxLength=1000;caption.placeholder='地点、故事，或你当时的感受……';captionLabel.append(caption);
  const editorStatus=node('p',null,'memory-status');editorStatus.setAttribute('role','status');const actions=node('div',null,'memory-editor-actions'),cancel=button('取消'),save=node('button','保存本机草稿','memory-save');save.type='submit';actions.append(cancel,save);form.append(editorHead,fileLabel,preview,cityLabel,titleLabel,captionLabel,editorStatus,node('p','照片会缩小并移除原始位置等元数据。介绍和感受由你填写；保存草稿不会公开上传。','memory-hint'),actions);editor.append(form);document.body.append(editor);
  const gallery=node('dialog',null,'memory-gallery');gallery.setAttribute('aria-label','照片大图');const galleryClose=button('×','memory-gallery-close');galleryClose.setAttribute('aria-label','关闭照片大图');const big=node('img');big.alt='';const galleryText=node('div',null,'memory-gallery-text');gallery.append(galleryClose,big,galleryText);document.body.append(gallery);
  let db,allDrafts=[],selectedCity='',rows=[],offset=0,revision=0,loading=false,paused=false,editId=null,currentBlob=null,previewURL=null,imageRevision=0,saving=false,compressing=false,publicBusy=new Set(),draftURLs=[],galleryURL=null;const publishedThisRun=new Map();
  try{db=createDraftDB(root.indexedDB);}catch{}
  const cloud=()=>root.GuanchaoCloud,ready=()=>!!cloud()?.ready&&!!cloud()?.api,active=()=>!host.hidden&&!paused&&!document.hidden&&host.closest('.lab')?.hidden!==true;
  const cityKey=s=>String(s).trim().replace(/市$/,'');const shownDrafts=()=>allDrafts.filter(d=>!selectedCity||cityKey(d.city)===cityKey(selectedCity));
  function state(text,error=false){publicStatus.textContent=text;publicStatus.dataset.error=String(error);}
  function empty(grid,text){grid.replaceChildren();const e=node('div',null,'memory-empty');e.append(node('span','◇'),node('p',text));grid.append(e);}
  function showPhoto(row,draft=false){if(galleryURL){URL.revokeObjectURL(galleryURL);galleryURL=null;}big.src=draft?(galleryURL=URL.createObjectURL(row.blob)):row.photo_url;big.alt=row.title;galleryText.replaceChildren(node('p',row.city,'memory-gallery-city'),node('h3',row.title),node('p',row.caption||'','memory-gallery-caption'));gallery.showModal();}
  function closeGallery(){gallery.close();big.removeAttribute('src');if(galleryURL){URL.revokeObjectURL(galleryURL);galleryURL=null;}}
  galleryClose.onclick=closeGallery;gallery.addEventListener('close',()=>{big.removeAttribute('src');if(galleryURL){URL.revokeObjectURL(galleryURL);galleryURL=null;}});
  function card(row,draft){
    const article=node('article',null,'memory-card'),open=button('', 'memory-photo-button'),img=node('img');img.loading='lazy';img.decoding='async';img.alt=row.title;img.src=draft?(()=>{const url=URL.createObjectURL(row.blob);draftURLs.push(url);return url;})():row.photo_url;img.onerror=()=>{img.alt='照片暂时无法加载';article.classList.add('memory-image-failed');};open.setAttribute('aria-label','查看照片：'+row.title);open.append(img);open.onclick=()=>showPhoto(row,draft);
    const info=node('div',null,'memory-card-info');info.append(node('p',row.city,'memory-card-city'),node('h5',row.title));if(row.caption)info.append(node('p',row.caption,'memory-card-caption'));
    const controls=node('div',null,'memory-card-actions');
    if(draft){
      controls.append(node('span',row.publishedId?'已公开 · 本机副本':'仅本机','memory-draft-label'));
      if(!row.publishedId){const edit=button('编辑');edit.onclick=()=>openEditor(row);const publish=button(publicBusy.has(row.id)?'正在公开…':ready()?(cloud().api.session?'公开发布':'登录后公开'):'公开发布');publish.disabled=publicBusy.has(row.id);publish.onclick=()=>publishDraft(row);controls.append(edit,publish);}
      const exportPhoto=button('导出');exportPhoto.onclick=()=>exportDraft(row);const remove=button('删除草稿');remove.onclick=async()=>{try{await db.remove(row.id);publishedThisRun.delete(row.id);await loadDrafts();}catch(e){draftStatus.textContent=e.message||'删除失败。';}};controls.append(exportPhoto,remove);
    }else if(cloud()?.api?.session?.user?.id===row.user_id){const remove=button('删除我的照片');remove.onclick=async()=>{if(!confirm('删除你公开的这张照片？'))return;remove.disabled=true;try{const result=await cloud().api.deleteMemory(row);rows=rows.filter(r=>r.id!==row.id);renderPublic();state(result?.message||'你的照片已从公开墙删除。',result?.photoRemoved===false);const local=allDrafts.find(d=>d.publishedId===row.id);if(local){delete local.publishedId;publishedThisRun.delete(local.id);await db.put(local);await loadDrafts();}}catch(e){state(e.message||'删除失败。',true);}finally{remove.disabled=false;}};controls.append(remove);}
    info.append(controls);article.append(open,info);return article;
  }
  function renderPublic(){publicGrid.replaceChildren();if(!rows.length){empty(publicGrid,!ready()?'公开照片墙等待接通，先留下自己的照片。':selectedCity?'这座城市还没有公开照片，等你留下第一张。':'选择一座城市，看看大家留下的照片。');return;}for(const r of rows)publicGrid.append(card(r,false));}
  function renderDrafts(){draftURLs.forEach(url=>URL.revokeObjectURL(url));draftURLs=[];const list=shownDrafts().sort((a,b)=>b.updatedAt-a.updatedAt);localTitle.textContent='本机草稿 · '+list.length;draftGrid.replaceChildren();if(!list.length){empty(draftGrid,selectedCity?'还没有这座城市的本机草稿。':'还没有草稿。把自己拍下的一刻留在这里。');return;}for(const r of list)draftGrid.append(card(r,true));}
  async function loadDrafts(){if(!db){draftStatus.textContent='当前环境无法保存本机草稿，请检查浏览器存储权限。';return;}try{const records=await db.list();allDrafts=records.filter(d=>{try{metadata(d);photo(d.blob);return typeof d.id==='string';}catch{return false;}}).map(d=>publishedThisRun.has(d.id)?{...d,publishedId:publishedThisRun.get(d.id)}:d);draftStatus.textContent=records.length===allDrafts.length?'': '部分本机草稿格式不正确，原记录已保留。';renderDrafts();}catch(e){draftStatus.textContent=e.message||'本机草稿读取失败。';}}
  async function exportDraft(row){try{let container,Zip;try{container=parent!==root?parent.Guanchao:root.Guanchao;Zip=root.JSZip||(parent!==root?parent.JSZip:null);}catch{}let blob=row.blob,name='观潮城市记忆_'+row.id+'.jpg';if(Zip){const zip=new Zip();zip.file('照片.jpg',row.blob);zip.file('介绍与感受.json',JSON.stringify(metadata(row),null,2));blob=await zip.generateAsync({type:'blob',compression:'STORE'});name='观潮城市记忆_'+row.id+'.zip';}if(container?.saveBlob)await container.saveBlob(blob,name);else{const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}draftStatus.textContent=Zip?'照片和文字已导出，本机草稿继续保留。':'照片已导出，介绍和感受继续保存在本机草稿。';}catch(error){draftStatus.textContent=error.message||'导出失败，草稿已保留。';}}
  async function loadPublic(reset=true){
    if(reset){revision++;offset=0;rows=[];renderPublic();more.hidden=true;}const rev=revision,city=selectedCity;
    if(!ready()){loading=false;state('公开照片墙尚未开通。你可以先保存本机草稿，接通后由你选择公开发布。');return;}
    if(!city){state('输入城市，查看大家公开分享的照片。');return;}
    if(!active())return;loading=true;more.disabled=true;state('正在看看'+city+'的照片…');
    try{const result=await cloud().api.listMemories({city,offset,limit:12});if(rev!==revision||city!==selectedCity)return;if(!Array.isArray(result))throw Error('照片墙返回的资料不正确。');const valid=result.map(publicRow);const known=new Set(rows.map(r=>r.id));rows.push(...valid.filter(r=>!known.has(r.id)));offset+=result.length;renderPublic();more.hidden=result.length<12;state(rows.length?'已经找到'+rows.length+'张公开照片。':'这座城市还没有公开照片。');}
    catch(error){if(rev===revision)state(error.message||'照片墙连接失败，本机草稿仍可使用。',true);}finally{if(rev===revision){loading=false;more.disabled=false;}}
  }
  function chooseCity(city){if(typeof city!=='string'||!city.trim()||city.trim().length>80)return;selectedCity=city.trim();cityInput.value=selectedCity;renderDrafts();loadPublic(true);}
  search.onsubmit=e=>{e.preventDefault();if(search.reportValidity())chooseCity(cityInput.value);};more.onclick=()=>{if(!loading)loadPublic(false);};
  function cleanupEditor(){imageRevision++;currentBlob=null;compressing=false;if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}preview.removeAttribute('src');preview.hidden=true;}
  function setPreview(blob){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(blob);preview.src=previewURL;preview.hidden=false;}
  function openEditor(row=null){cleanupEditor();editId=row?.id||null;editorTitle.textContent=row?'编辑本机草稿':'留下一张照片';draftCity.value=row?.city||selectedCity;draftTitle.value=row?.title||'';caption.value=row?.caption||'';fileInput.value='';editorStatus.textContent='';save.disabled=false;if(row){currentBlob=row.blob;setPreview(row.blob);}editor.showModal();}
  add.onclick=()=>openEditor();close.onclick=cancel.onclick=()=>{if(!saving)editor.close();};editor.addEventListener('close',cleanupEditor);
  fileInput.onchange=async()=>{const file=fileInput.files[0];if(!file)return;const rev=++imageRevision;currentBlob=null;if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}preview.hidden=true;preview.removeAttribute('src');compressing=true;save.disabled=true;editorStatus.textContent='正在整理照片…';try{const result=await compressPhoto(file);if(rev!==imageRevision)return;currentBlob=result.blob;setPreview(currentBlob);editorStatus.textContent=result.width+' × '+result.height+' · '+Math.ceil(result.blob.size/1024)+'KB · 已移除原始元数据';}catch(e){if(rev===imageRevision)editorStatus.textContent=e.message||'照片读取失败。';}finally{if(rev===imageRevision){compressing=false;save.disabled=false;}}};
  form.onsubmit=async e=>{e.preventDefault();if(saving||compressing)return;if(!db){editorStatus.textContent='当前环境无法保存本机草稿。';return;}let data;try{data=metadata({city:draftCity.value,title:draftTitle.value,caption:caption.value});photo(currentBlob);}catch(error){editorStatus.textContent=error.message;return;}saving=true;save.disabled=true;const old=allDrafts.find(d=>d.id===editId),record={id:editId||(crypto.randomUUID?.()||'photo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)),...data,blob:currentBlob,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};try{await db.put(record);editor.close();await loadDrafts();draftStatus.textContent='草稿已保存在本机，尚未公开。';}catch(error){editorStatus.textContent=error.message||'草稿没有保存成功，请检查剩余空间。';}finally{saving=false;save.disabled=false;}};
  async function publishDraft(row){
    if(publicBusy.has(row.id))return;if(!ready()){state('公开照片墙尚未开通，这张照片仍安全保留在本机草稿。');return;}if(!cloud().api.session){cloud().requestLogin?.();return;}
    publicBusy.add(row.id);renderDrafts();draftStatus.textContent='正在公开这张照片…';
    try{const post=publicRow(await cloud().api.publishMemory(metadata(row),row.blob));row.publishedId=post.id;publishedThisRun.set(row.id,post.id);let retained=true;try{await db.put(row);}catch{retained=false;}await loadDrafts();draftStatus.textContent=retained?'照片已公开到'+row.city+'的城市记忆。':'照片已公开，但本机状态未能保存，请勿重复发布。';if(cityKey(row.city)===cityKey(selectedCity))await loadPublic(true);}
    catch(error){draftStatus.textContent=error.message||'发布失败，本机草稿已保留。';}finally{publicBusy.delete(row.id);renderDrafts();}
  }
  function cloudChanged(){renderDrafts();renderPublic();loadPublic(true);}
  addEventListener('guanchao:cloud-ready',cloudChanged);addEventListener('guanchao:cloud-auth',cloudChanged);addEventListener('guanchao:cloud-sessionChanged',cloudChanged);Promise.resolve(cloud()?.configReadyPromise||cloud()?.readyPromise).then(cloudChanged).catch(()=>cloudChanged());
  addEventListener('guanchao:destination',e=>chooseCity(e.detail?.city));addEventListener('guanchao:destination-changed',e=>chooseCity(e.detail?.city));
  addEventListener('message',e=>{if(e.source!==parent||(e.origin!==location.origin&&!(location.protocol==='file:'&&e.origin==='null')))return;if(e.data?.type==='guanchao:pause'){paused=true;host.dataset.paused='true';if(gallery.open)closeGallery();}else if(e.data?.type==='guanchao:resume'){paused=false;host.dataset.paused='false';if(ready()&&selectedCity&&!rows.length)loadPublic(true);}});
  document.addEventListener('visibilitychange',()=>{host.dataset.paused=String(paused||document.hidden);if(active()&&ready()&&selectedCity&&!rows.length)loadPublic(true);});
  new MutationObserver(()=>{host.dataset.paused=String(!active());if(active())loadPublic(true);}).observe(host,{attributes:true,attributeFilter:['hidden']});
  renderPublic();renderDrafts();loadDrafts();loadPublic(true);
})(typeof window!=='undefined'?window:globalThis);

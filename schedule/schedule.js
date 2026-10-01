(function(root){
  'use strict';
  const periods=['anytime','morning','daytime','evening'],key='gc-schedule-v1',maxChars=2*1024*1024;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function localDate(now=new Date()){return String(now.getFullYear()).padStart(4,'0')+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');}
  function validDate(date){
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
    const [y,m,d]=date.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    return y>=1900&&y<=2199&&m>=1&&m<=12&&d>=1&&d<=days[m-1];
  }
  function shiftDate(date,delta){if(!validDate(date)||!Number.isInteger(delta))throw new Error('日期不正确。');const [y,m,d]=date.split('-').map(Number);return localDate(new Date(y,m-1,d+delta,12));}
  function validateTasks(tasks){
    if(!Array.isArray(tasks)||tasks.length>50)throw new Error('每天最多安排50件事。');
    const ids=new Set();return tasks.map(t=>{
      if(!t||typeof t!=='object'||Array.isArray(t)||typeof t.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(t.id)||ids.has(t.id))throw new Error('任务编号不正确或重复。');
      if(typeof t.title!=='string'||!t.title.trim()||t.title.trim().length>120||/[\u0000-\u001f\u007f]/.test(t.title))throw new Error('任务标题需要1–120个字，不能包含控制字符。');
      if(!periods.includes(t.period)||!Number.isInteger(t.minutes)||t.minutes<1||t.minutes>1440||typeof t.completed!=='boolean')throw new Error('任务时间段、分钟数或完成状态不正确。');
      ids.add(t.id);return {id:t.id,title:t.title.trim(),period:t.period,minutes:t.minutes,completed:t.completed};
    });
  }
  function validateDocument(data){
    if(!data||data.schema!==1||!data.days||typeof data.days!=='object'||Array.isArray(data.days))throw new Error('请选择观潮日程导出的JSON备份。');
    const entries=Object.entries(data.days);if(entries.length>3660)throw new Error('备份日期过多，最多3660天。');const days={};
    for(const [date,tasks] of entries){if(!validDate(date))throw new Error('备份里有不正确的日期。');const clean=validateTasks(tasks);if(clean.length)days[date]=clean;}
    const result={schema:1,days};if(JSON.stringify(result).length>maxChars)throw new Error('日程记录超过2MB，请缩小备份。');return result;
  }
  function createStore(storage){
    let state={schema:1,days:{}},loadError=null;
    try{const saved=storage.getItem(key);if(saved){if(saved.length>maxChars)throw new Error('本机日程记录过大。');state=validateDocument(JSON.parse(saved));}}catch(error){loadError=error;}
    const persist=next=>{if(loadError)throw new Error('本机日程暂时无法读取，已保留原记录；请先导出原始备份或恢复有效备份。');const validated=validateDocument(next),encoded=JSON.stringify(validated);storage.setItem(key,encoded);state=validated;return clone(state);};
    return {
      get loadError(){return loadError;},
      read(date){if(!validDate(date))throw new Error('日期不正确。');return clone(state.days[date]||[]);},
      save(date,tasks){if(!validDate(date))throw new Error('日期不正确。');const next=clone(state),clean=validateTasks(tasks);if(clean.length)next.days[date]=clean;else delete next.days[date];persist(next);return clone(clean);},
      backup(){if(loadError){const raw=storage.getItem(key);return typeof raw==='string'?raw:JSON.stringify(state);}return JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);},
      import(text){
        if(typeof text!=='string'||text.length>maxChars)throw new Error('备份需要小于2MB。');let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('JSON格式不正确，请使用导出的日程备份。');}
        const incoming=validateDocument(data),next=clone(state);
        for(const [date,tasks]of Object.entries(incoming.days)){const merged=new Map((next.days[date]||[]).map(t=>[t.id,t]));for(const t of tasks)merged.set(t.id,t);next.days[date]=validateTasks([...merged.values()]);}
        const valid=validateDocument(next),encoded=JSON.stringify(valid);storage.setItem(key,encoded);state=valid;loadError=null;return {dates:Object.keys(incoming.days).length,tasks:Object.values(incoming.days).reduce((n,t)=>n+t.length,0)};
      },
      today(now=new Date()){const date=localDate(now);return {date,tasks:clone(state.days[date]||[])};}
    };
  }
  const api={periods,key,maxChars,localDate,validDate,shiftDate,validateTasks,validateDocument,createStore};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.GuanchaoSchedule=api;
  if(!root.document)return;
  const $=id=>document.getElementById(id);let store;
  try{store=createStore(root.localStorage);}catch{store=createStore({getItem(){return null;},setItem(){throw new Error('当前环境无法保存日程，请开启本机存储。');}});}
  let selected=localDate(),editing=null,editorDate=selected,paused=false,timer=null,lastToday=localDate(),statusTimer;
  const embedded=parent!==root,targetOrigin=location.protocol==='file:'?'*':location.origin;
  if(embedded)document.documentElement.classList.add('embedded');
  function status(text,error=false){$('scheduleStatus').textContent=text;$('scheduleStatus').classList.toggle('error',error);clearTimeout(statusTimer);if(text&&!error)statusTimer=setTimeout(()=>{$('scheduleStatus').textContent='';},5000);}
  function syncToday(){if(store.loadError)return;const data=store.today();if(embedded)parent.postMessage({type:'guanchao:schedule-updated',data},targetOrigin);}
  function dateLabel(date){return date===localDate()?'今天':date<localDate()?'这一天的安排':'提前安排的一天';}
  function render(){
    $('scheduleDate').value=selected;$('dateHeadline').textContent=dateLabel(selected);const [y,m,d]=selected.split('-').map(Number);$('dateWeekday').textContent=new Intl.DateTimeFormat('zh-CN',{weekday:'long'}).format(new Date(y,m-1,d,12));$('todayButton').disabled=selected===localDate();$('previousDay').disabled=selected==='1900-01-01';$('nextDay').disabled=selected==='2199-12-31';
    const tasks=store.read(selected),done=tasks.filter(t=>t.completed).length;$('doneCount').textContent=done+' / '+tasks.length;$('remainingMinutes').replaceChildren(document.createTextNode(String(tasks.filter(t=>!t.completed).reduce((n,t)=>n+t.minutes,0))+' '));const suffix=document.createElement('small');suffix.textContent='分钟';$('remainingMinutes').append(suffix);
    for(const period of periods){const list=$(period+'Tasks');list.replaceChildren();const filtered=tasks.filter(t=>t.period===period),heading=document.querySelector('[data-period="'+period+'"] h2');heading.querySelector('small')?.remove();const count=document.createElement('small');count.textContent=String(filtered.filter(t=>!t.completed).length);count.className='period-count';heading.append(count);
      if(!filtered.length){const li=document.createElement('li'),b=document.createElement('button'),plus=document.createElement('span');b.type='button';b.className='empty-task';plus.textContent='＋';b.append(plus,document.createTextNode('添加一件想做的事'));b.dataset.add=period;li.append(b);list.append(li);continue;}
      for(const task of filtered){const li=document.createElement('li');li.className='task-row'+(task.completed?' completed':'');const label=document.createElement('label');label.className='task-toggle';const check=document.createElement('input');check.type='checkbox';check.checked=task.completed;check.dataset.complete=task.id;check.setAttribute('aria-label',(task.completed?'标记未完成：':'标记完成：')+task.title);label.append(check);const text=document.createElement('div');text.className='task-text';const title=document.createElement('span');title.className='task-title';title.textContent=task.title;const minutes=document.createElement('small');minutes.className='task-duration';minutes.textContent=task.minutes+' 分钟';text.append(title,minutes);const edit=document.createElement('button');edit.type='button';edit.className='edit-task';edit.dataset.edit=task.id;edit.setAttribute('aria-label','编辑：'+task.title);edit.textContent='⋯';li.append(label,text,edit);list.append(li);}
    }
    document.querySelectorAll('[data-add]').forEach(b=>b.disabled=tasks.length>=50||!!store.loadError);
  }
  function openEditor(period,id=null){
    if(store.loadError){status('本机记录无法读取，请先备份并恢复有效文件。',true);return;}
    const tasks=store.read(selected),task=id?tasks.find(t=>t.id===id):null;if(id&&!task)return;if(!task&&tasks.length>=50){status('每天最多安排50件事。',true);return;}
    editing=task?.id||null;editorDate=selected;$('dialogTitle').textContent=task?'编辑这件事':'添加一件事';$('taskTitle').value=task?.title||'';$('taskPeriod').value=task?.period||period;$('taskMinutes').value=task?.minutes||30;$('deleteTask').hidden=!task;$('formStatus').textContent='';$('taskDialog').showModal();setTimeout(()=>$('taskTitle').focus(),0);
  }
  function commit(tasks,message){try{store.save(editorDate,tasks);$('taskDialog').close();render();document.querySelector('[data-period="'+$('taskPeriod').value+'"]')?.setAttribute('open','');syncToday();status(message);}catch(e){$('formStatus').textContent=e.message||'保存失败，请检查本机存储。';}}
  $('periods').addEventListener('click',e=>{const add=e.target.closest('[data-add]'),edit=e.target.closest('[data-edit]');if(add){e.preventDefault();openEditor(add.dataset.add);}else if(edit)openEditor('anytime',edit.dataset.edit);});
  $('periods').addEventListener('change',e=>{const id=e.target.dataset.complete;if(!id)return;try{const tasks=store.read(selected),t=tasks.find(t=>t.id===id);if(t)t.completed=e.target.checked;store.save(selected,tasks);render();syncToday();}catch(error){render();status(error.message||'保存失败，请检查本机存储。',true);}});
  $('taskForm').addEventListener('submit',e=>{e.preventDefault();const tasks=store.read(editorDate),existing=tasks.find(t=>t.id===editing),task={id:editing||(root.crypto?.randomUUID?.()||'task-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)),title:$('taskTitle').value.trim(),period:$('taskPeriod').value,minutes:Number($('taskMinutes').value),completed:existing?.completed||false};try{validateTasks([task]);}catch(error){$('formStatus').textContent=error.message;return;}if(existing)tasks[tasks.indexOf(existing)]=task;else tasks.push(task);commit(tasks,editing?'安排已更新。':'已给这件事留好时间。');});
  $('deleteTask').onclick=()=>commit(store.read(editorDate).filter(t=>t.id!==editing),'这件事已删除。');for(const id of ['closeDialog','cancelDialog'])$(id).onclick=()=>$('taskDialog').close();
  function choose(date){if(!validDate(date)){status('请选择正确的日期。',true);$('scheduleDate').value=selected;return;}selected=date;render();}
  $('scheduleDate').onchange=()=>choose($('scheduleDate').value);$('previousDay').onclick=()=>choose(shiftDate(selected,-1));$('nextDay').onclick=()=>choose(shiftDate(selected,1));$('todayButton').onclick=()=>choose(localDate());
  $('exportSchedule').onclick=async()=>{try{const blob=new Blob([store.backup()],{type:'application/json;charset=utf-8'}),name='观潮日程备份_'+localDate()+'.json';let host;try{host=embedded?parent.Guanchao:root.Guanchao;}catch{}if(host?.saveBlob)await host.saveBlob(blob,name);else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}status(store.loadError?'已导出原始记录，请保留备份。':'备份已导出。');}catch(error){status(error.message||'导出失败。',true);}};
  $('importSchedule').onclick=()=>$('backupFile').click();$('backupFile').onchange=async()=>{const file=$('backupFile').files[0];$('backupFile').value='';if(!file)return;try{if(file.size>maxChars)throw new Error('备份需要小于2MB。');const result=store.import(await file.text());render();syncToday();status('已合并'+result.dates+'天、'+result.tasks+'件事的备份。');}catch(error){status(error.message||'导入失败，原记录已保留。',true);}};
  function checkDay(){const date=localDate();if(date!==lastToday){const followedToday=selected===lastToday;lastToday=date;if(followedToday)selected=date;render();syncToday();}}
  function setPaused(value){paused=value;document.documentElement.dataset.paused=String(value);clearInterval(timer);timer=null;if(!paused&&!document.hidden){checkDay();timer=setInterval(checkDay,60000);syncToday();}}
  addEventListener('message',e=>{if(!embedded||e.source!==parent||(e.origin!==location.origin&&!(location.protocol==='file:'&&e.origin==='null')))return;if(e.data?.type==='guanchao:theme'&&['day','night'].includes(e.data.theme))document.documentElement.dataset.theme=e.data.theme;else if(e.data?.type==='guanchao:pause')setPaused(true);else if(e.data?.type==='guanchao:resume')setPaused(false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(timer);timer=null;}else if(!paused)setPaused(false);});addEventListener('storage',e=>{if(e.key!==key)return;store=createStore(root.localStorage);render();syncToday();if(store.loadError)status('更新的本机记录无法读取，原记录已保留。',true);});
  if(matchMedia('(max-width:700px)').matches)document.querySelectorAll('.period-card').forEach(el=>el.open=el.dataset.period==='anytime');
  render();if(store.loadError)status('本机日程无法读取，已保留原记录。请先导出原始备份，再导入有效备份恢复。',true);setPaused(false);
})(typeof window!=='undefined'?window:globalThis);

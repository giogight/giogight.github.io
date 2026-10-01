(function(root){'use strict';
const maxOptions=200;
function normalizeOptions(values){
  if(!Array.isArray(values)||values.length>maxOptions)throw Error('一次最多200个选项。');
  if(values.some(value=>typeof value!=='string'||value.length>120||/[\u0000-\u001f\u007f]/.test(value)))throw Error('每个选项最多120字，请移除控制字符。');
  return values.map(value=>value.trim()).filter(Boolean);
}
function parseOptions(text){
  if(typeof text!=='string'||text.length>25000)throw Error('选项文字太多，请分成几次选择。');
  return normalizeOptions(text.split(/\r?\n/).map(value=>value.trim()).filter(Boolean));
}
function randomIndex(count,source=root.crypto){
  if(!Number.isInteger(count)||count<1||count>maxOptions)throw Error('选项数量不正确。');
  if(!source?.getRandomValues)throw Error('当前设备无法生成随机结果。');
  const limit=Math.floor(4294967296/count)*count,value=new Uint32Array(1);
  do{source.getRandomValues(value);}while(value[0]>=limit);
  return value[0]%count;
}
function coinRotation(index,previous=0){
  if(![0,1].includes(index)||![0,1].includes(previous))throw Error('硬币面不正确。');
  const start=previous*180+12,end=start+1800+(index-previous)*180;
  return {start,rise:start+(end-start)*.35,fall:start+(end-start)*.84,end};
}
const api={parseOptions,normalizeOptions,randomIndex,coinRotation,maxOptions};
if(typeof module==='object'&&module.exports)module.exports=api;
if(!root.document)return;
const $=id=>document.getElementById(id),key='gc-decision-options-v2',legacyKey='gc-decision-options-v1';
const colors=['#d9c4ef','#b5cde3','#c5dcda','#baa6d9','#d4b8d6','#b1badc'];
let options=[],busy=false,angle=0,timer=null,pending=null,saveTimer;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const rows=()=>Array.from($('optionsList').querySelectorAll('input'));
function syncControls(){
  rows().forEach(input=>input.disabled=busy);
  $('optionsList').querySelectorAll('button').forEach(button=>button.disabled=busy);
  $('addOption').disabled=busy||rows().length>=maxOptions;
  $('spinButton').disabled=$('wheelCenter').disabled=busy||options.length<2;
  $('coinButton').disabled=busy;
}
function renumber(){
  $('optionsList').querySelectorAll('.option-row').forEach((row,index)=>{
    row.querySelector('.option-number').textContent=String(index+1).padStart(2,'0');
    row.querySelector('input').setAttribute('aria-label','选项 '+(index+1));
    row.querySelector('input').placeholder='选项 '+(index+1);
    row.querySelector('button').setAttribute('aria-label','删除选项 '+(index+1));
  });
}
function addRow(value='',focus=false){
  if(rows().length>=maxOptions)return;
  const row=document.createElement('div'),number=document.createElement('span'),input=document.createElement('input'),remove=document.createElement('button');
  row.className='option-row';number.className='option-number';number.setAttribute('aria-hidden','true');
  input.type='text';input.maxLength=120;input.value=value;input.autocomplete='off';
  input.addEventListener('input',refresh);
  input.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.isComposing)return;
    event.preventDefault();const inputs=rows(),next=inputs[inputs.indexOf(input)+1];
    if(next)next.focus();else if(!busy&&inputs.length<maxOptions){addRow('',true);refresh();}
  });
  remove.type='button';remove.className='remove-option';remove.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  remove.addEventListener('click',()=>{
    if(busy)return;const inputs=rows(),index=inputs.indexOf(input);row.remove();renumber();refresh();
    const remaining=rows();if(remaining.length)remaining[Math.min(index,remaining.length-1)].focus();else $('addOption').focus();
  });
  row.append(number,input,remove);$('optionsList').append(row);renumber();syncControls();
  if(focus){input.focus();row.scrollIntoView?.({block:'nearest',behavior:'auto'});}
}
function render(){
  const canvas=$('wheelCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,640,640);
  const count=options.length||1,step=Math.PI*2/count;
  for(let index=0;index<count;index++){
    const start=-Math.PI/2+index*step;ctx.beginPath();ctx.moveTo(320,320);ctx.arc(320,320,313,start,start+step);ctx.closePath();
    ctx.fillStyle=colors[index%colors.length];ctx.fill();ctx.strokeStyle='#ffffff80';ctx.lineWidth=count>50?1:2;ctx.stroke();
    if(options.length&&count<=24){
      ctx.save();ctx.translate(320,320);ctx.rotate(start+step/2);ctx.textAlign='right';ctx.fillStyle='#4a385f';ctx.font=(count>12?'20':'25')+'px "Microsoft YaHei",sans-serif';
      const label=options[index].length>9?options[index].slice(0,8)+'…':options[index];ctx.fillText(label,278,8);ctx.restore();
    }
  }
  $('optionCount').textContent=options.length+' 个有效选项 · 最多 '+maxOptions+' 条'+(options.length>24?' · 完整选项会在结果中展示。':'');
  syncControls();
}
function finish(){
  clearTimeout(timer);timer=null;if(!pending)return;
  const result=pending;pending=null;busy=false;
  if(result.kind==='wheel'){
    $('wheelCanvas').style.transition='none';$('wheelCanvas').style.transform='rotate('+angle+'deg)';
    $('wheelResult').replaceChildren(document.createTextNode(result.label),Object.assign(document.createElement('small'),{textContent:'选中了第 '+(result.index+1)+' 个选项。'}));
  }else{
    const coin=$('coin');coin.dataset.result=result.index?'tails':'heads';$('coinStage').classList.remove('tossing');
    $('coinResult').textContent=result.index?'月亮 · 反面':'太阳 · 正面';
  }
  render();
}
function refresh(){
  if(busy)return;
  try{
    options=normalizeOptions(rows().map(input=>input.value));$('wheelResult').textContent=options.length>=2?'准备好了，转一下。':'先写下至少两个选项。';
    $('saveStatus').textContent='';render();clearTimeout(saveTimer);
    const values=rows().map(input=>input.value);
    saveTimer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify(values));}catch{$('saveStatus').textContent='本机保存失败，当前选项仍可使用。';}},300);
  }catch(error){$('saveStatus').textContent=error.message;$('spinButton').disabled=$('wheelCenter').disabled=true;}
}
let initial=['',''];
try{
  const saved=localStorage.getItem(key),legacy=localStorage.getItem(legacyKey);
  if(saved!==null){const values=JSON.parse(saved);normalizeOptions(values);initial=values;}
  else if(legacy){initial=parseOptions(legacy);}
  options=normalizeOptions(initial);
}catch{$('saveStatus').textContent='本机选项暂时无法读取，原记录未改动。';}
initial.forEach(value=>addRow(value));render();if(options.length>=2)$('wheelResult').textContent='选项已准备好，转一下。';
$('addOption').onclick=()=>{if(busy)return;addRow('',true);refresh();};
$('spinButton').onclick=()=>{
  if(busy)return;
  try{
    const index=randomIndex(options.length);busy=true;pending={kind:'wheel',index,label:options[index]};syncControls();$('wheelResult').textContent='正在转动…';
    const step=360/options.length,target=(360-(index+.5)*step)%360,current=((angle%360)+360)%360;
    angle+=1800+(target-current+360)%360;const canvas=$('wheelCanvas');
    canvas.style.transition=reduced()?'none':'transform 3.6s cubic-bezier(.16,.68,.12,1)';canvas.style.transform='rotate('+angle+'deg)';
    timer=setTimeout(finish,reduced()?0:3650);
  }catch(error){$('wheelResult').textContent=error.message;}
};
const rim=$('coin').querySelector('.coin-rim');
for(let index=0;index<48;index++){
  const edge=document.createElement('i');edge.style.setProperty('--edge-angle',index*7.5+'deg');
  edge.style.setProperty('--edge-light',String(43+Math.round(22*(1+Math.cos(index*Math.PI/24))/2))+'%');rim.append(edge);
}
$('coinButton').onclick=()=>{
  if(busy)return;
  try{
    const index=randomIndex(2),coin=$('coin'),motion=coinRotation(index,coin.dataset.result==='tails'?1:0);
    busy=true;pending={kind:'coin',index};syncControls();$('coinResult').textContent='硬币在空中…';
    Object.entries(motion).forEach(([name,value])=>coin.style.setProperty('--coin-'+name,value+'deg'));
    if(!reduced())$('coinStage').classList.add('tossing');
    timer=setTimeout(finish,reduced()?0:2250);
  }catch(error){$('coinResult').textContent=error.message;}
};
$('coinStage').addEventListener('animationend',event=>{if(event.animationName==='coin-spin'&&pending?.kind==='coin')finish();});
$('wheelCenter').onclick=()=>$('spinButton').click();
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{
  finish();const wheel=button.dataset.mode==='wheel';$('wheelPanel').hidden=!wheel;$('coinPanel').hidden=wheel;
  document.querySelectorAll('[data-mode]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
});
addEventListener('message',event=>{
  if(event.source!==parent||(event.origin!==location.origin&&!(location.protocol==='file:'&&event.origin==='null')))return;
  if(event.data?.type==='guanchao:theme'&&['day','night'].includes(event.data.theme))document.documentElement.dataset.theme=event.data.theme;
  if(event.data?.type==='guanchao:pause')finish();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
})(typeof window!=='undefined'?window:globalThis);

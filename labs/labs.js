if(parent!==window)document.documentElement.classList.add('embedded');
function selectLab(){const id=location.hash==='#travel'?'travel-lab':'game-lab';document.querySelectorAll('.lab').forEach(s=>s.hidden=s.id!==id);}
addEventListener('hashchange',selectLab);selectLab();
addEventListener('message',e=>{if(e.source!==parent||(e.origin!==location.origin&&!(location.protocol==='file:'&&e.origin==='null')))return;if(e.data?.type==='guanchao:theme')document.documentElement.dataset.theme=e.data.theme;});

document.getElementById('travelViewTabs')?.addEventListener('click',event=>{
  const button=event.target.closest('[data-travel-view]');if(!button)return;
  const view=button.dataset.travelView,memories=view==='memories',toilets=view==='toilets';
  document.querySelectorAll('[data-travel-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  ['nearbyTravel','legacyTravelPlanner','travelSocial'].forEach(id=>{const node=document.getElementById(id);if(node)node.hidden=memories;});
  document.getElementById('cityMemories').hidden=!memories;
  const title=document.getElementById('travel-title');title.replaceChildren();
  title.append(document.createTextNode(memories?'把这座城市，':toilets?'厕了么，':'逛了么，'),document.createElement('br'),document.createTextNode(memories?'留在照片里。':toilets?'附近找个方便。':'附近也有好去处。'));
  document.querySelector('.nearby-heading > p').textContent=memories?'分享自己拍下的一刻，写下你的介绍与感受。':toilets?'单独找公共厕所，看看开放信息与干净程度。':'打开地图，找顿好饭、喝杯东西，或去一个没到过的地方。';
  dispatchEvent(new CustomEvent('guanchao:travel-view',{detail:{view}}));
});

// Keyboard behavior and countdown ported from SafariSelector/UI/SelectorView.swift
// (SafariSelector contributors, GPL-3.0-or-later).
let targets=[],external=[],flat=[],filter='',selection=0,selected=false,defaultKey=null,remaining=0,countdown=null,touched=false;
const list=document.querySelector('#targets'),field=document.querySelector('#filter'),timer=document.querySelector('#countdown');
const choose=(newWindow,automatic=false)=>{const target=automatic?flat.find(item=>item.key===defaultKey)||targets.find(item=>item.key===defaultKey):flat[selection];if(target)window.linkPicker.choose(target.external?{external:target.external}:{key:target.key,newWindow,automatic});};
// Any interaction cancels an unattended countdown, matching SafariSelector.
function touch(){if(touched)return;touched=true;clearInterval(countdown);countdown=null;remaining=0;drawCountdown();window.linkPicker.choose({touched:true});}
function drawCountdown(){
  const target=targets.find(item=>item.key===defaultKey);
  timer.hidden=!(target&&remaining>0);
  if(target&&remaining>0)timer.textContent='⏱ '+target.projectName+' in '+remaining+'s';
}
function icon(kind){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','row-icon');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',kind==='external'?'M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5':'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
  svg.append(path);return svg;
}
function draw(){
  const query=filter.toLocaleLowerCase();
  flat=[...external,...targets.filter(t=>[t.workspaceName,t.projectName,t.hostName].join(' ').toLocaleLowerCase().includes(query))];
  selection=Math.max(0,Math.min(selection,flat.length-1));list.replaceChildren();let group;
  flat.forEach((target,index)=>{
    const key=JSON.stringify([target.hostId,target.workspaceId]);if(key!==group){group=key;const heading=document.createElement('h2');heading.textContent=target.external?'Open in another browser':target.workspaceName+(target.hostId==='local'?'':' · '+target.hostName);list.append(heading);}
    const row=document.createElement('button');row.className='project';row.type='button';row.dataset.key=target.key;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selection===index));
    const content=document.createElement('span'),title=document.createElement('span'),detail=document.createElement('span'),digit=document.createElement('span');content.className='content';title.className='name';title.textContent=target.projectName;detail.className='detail';detail.textContent=target.workspaceName+(target.hostId&&target.hostId!=='local'&&!target.external?' · '+target.hostName:'');digit.className='digit';digit.textContent=index<9?String(index+1):'';
    if(target.key===defaultKey){const badge=document.createElement('span');badge.className='badge';badge.textContent='Default';title.append(badge);}
    content.append(title,detail);row.append(icon(target.external?'external':'project'),content,digit);row.onclick=()=>{touch();selection=index;choose(false);};list.append(row);
  });
  if(!flat.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=targets.length?'No matching projects.':'No projects are available. Create a workspace and project in Proteus first.';list.append(empty);}
  field.textContent=filter||'Type to filter projects…';field.classList.toggle('placeholder',!filter);field.classList.toggle('selected',selected);
  // Preserve the first group header when moving back to the first row.
  if(selection===0)list.scrollTop=0;else list.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
}
window.linkPicker.on(value=>{
  targets=value.targets;defaultKey=value.defaultKey||null;document.querySelector('#url').textContent=value.url;
  external=value.safariSelector?[{key:'safariselector',external:'safariselector',projectName:'Open in SafariSelector',workspaceName:'Choose a Safari profile and tab group',hostName:'',hostId:'external',workspaceId:'safariselector'}]:[];
  const source=document.querySelector('#source');source.hidden=!value.source?.name;
  if(value.source?.name){document.querySelector('#source-name').textContent='from '+value.source.name;const image=document.querySelector('#source-icon');image.hidden=!/^data:image\/png;base64,/.test(value.source.icon||'');if(!image.hidden)image.src=value.source.icon;}
  const warning=document.querySelector('#warning');warning.textContent=value.warning||'';warning.hidden=!value.warning;
  const palette=value.colors||{};for(const [name,key]of [['--panel','menu'],['--selected','sidebarSelected'],['--muted','menuMuted'],['--edge','menuBorder']])if(/^#[0-9a-f]{6}$/i.test(palette[key]||''))document.documentElement.style.setProperty(name,palette[key]);
  // Start on the default destination so Return also accepts it.
  const index=[...external,...targets].findIndex(item=>item.key===defaultKey);if(index>=0)selection=index;
  remaining=defaultKey&&Number.isInteger(value.autoSelectSeconds)?Math.max(0,Math.min(60,value.autoSelectSeconds)):0;
  draw();drawCountdown();field.focus();
  if(remaining>0)countdown=setInterval(()=>{if(touched)return;remaining--;drawCountdown();if(remaining<=0){clearInterval(countdown);countdown=null;choose(false,true);}},1000);
});
for(const type of ['mousedown','wheel'])document.addEventListener(type,touch,{capture:true,passive:true});
document.addEventListener('keydown',event=>{
  touch();
  const command=event.metaKey||event.ctrlKey;
  if(command&&event.key.toLowerCase()==='a'){event.preventDefault();selected=!!filter;draw();return;}
  if(event.key==='Enter'){event.preventDefault();choose(command);return;}
  if(event.key==='Escape'){event.preventDefault();if(filter){filter='';selected=false;selection=0;draw();}else window.linkPicker.choose({cancel:true});return;}
  if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();filter=selected||command?'':event.altKey?filter.split(' ').slice(0,-1).join(' '):Array.from(filter).slice(0,-1).join('');selected=false;selection=0;draw();return;}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();selection+=event.key==='ArrowDown'?1:-1;draw();return;}
  if(command||event.altKey||event.isComposing)return;
  if(/^[1-9]$/.test(event.key)&&!selected){event.preventDefault();const index=Number(event.key)-1;if(index<flat.length){selection=index;choose(false);}return;}
  if(event.key.length===1){event.preventDefault();filter=(selected?'':filter)+event.key;selected=false;selection=0;draw();}
});

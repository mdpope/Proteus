// Keyboard behavior ported from SafariSelector/UI/SelectorView.swift
// (SafariSelector contributors, GPL-3.0-or-later).
let targets=[],external=[],flat=[],filter='',selection=0,selected=false;
const list=document.querySelector('#targets'),field=document.querySelector('#filter');
const choose=newWindow=>{const target=flat[selection];if(target)window.linkPicker.choose(target.external?{external:target.external}:{key:target.key,newWindow});};
function draw(){
  const query=filter.toLocaleLowerCase();
  flat=[...external,...targets.filter(t=>[t.workspaceName,t.projectName,t.hostName].join(' ').toLocaleLowerCase().includes(query))];
  selection=Math.max(0,Math.min(selection,flat.length-1));list.replaceChildren();let group;
  flat.forEach((target,index)=>{
    const key=JSON.stringify([target.hostId,target.workspaceId]);if(key!==group){group=key;const heading=document.createElement('h2');heading.textContent=target.external?'Open in another browser':target.workspaceName+(target.hostId==='local'?'':' · '+target.hostName);list.append(heading);}
    const row=document.createElement('button');row.className='project';row.type='button';row.dataset.key=target.key;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selection===index));
    const content=document.createElement('span'),title=document.createElement('span'),detail=document.createElement('span'),digit=document.createElement('span');title.className='name';title.textContent=target.projectName;detail.className='detail';detail.textContent=target.workspaceName;digit.className='digit';digit.textContent=index<9?String(index+1):'';content.append(title,detail);row.append(content,digit);row.onclick=()=>{selection=index;choose(false);};list.append(row);
  });
  if(!flat.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=targets.length?'No matching projects.':'No projects are available. Create a workspace and project in Proteus first.';list.append(empty);}
  field.textContent=filter||'Type to filter projects…';field.classList.toggle('placeholder',!filter);field.classList.toggle('selected',selected);
  // Preserve the first group header when moving back to the first row.
  if(selection===0)list.scrollTop=0;else list.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
}
window.linkPicker.on(value=>{
  targets=value.targets;document.querySelector('#url').textContent=value.url;
  external=value.safariSelector?[{key:'safariselector',external:'safariselector',projectName:'Open in SafariSelector',workspaceName:'Choose a Safari profile and tab group',hostName:'',hostId:'external',workspaceId:'safariselector'}]:[];
  const warning=document.querySelector('#warning');warning.textContent=value.warning||'';warning.hidden=!value.warning;
  const palette=value.colors||{};for(const [name,key]of [['--panel','menu'],['--selected','sidebarSelected'],['--muted','menuMuted'],['--edge','menuBorder']])if(/^#[0-9a-f]{6}$/i.test(palette[key]||''))document.documentElement.style.setProperty(name,palette[key]);
  draw();field.focus();
});
document.addEventListener('keydown',event=>{
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

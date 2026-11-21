export function renderRetainedPage(area,info){
 if(!area)return false;
 const saved=info.profileLocked?null:info.retainedPage;
 let frame=area.querySelector('.browser-retained-page');
 if(!saved){frame?.remove();return false;}
 if(frame?.dataset.frameId!==saved.id){
  frame=document.createElement('figure');
  frame.className='browser-retained-page';
  frame.dataset.frameId=saved.id;
  const caption=document.createElement('figcaption'),image=document.createElement('img');
  caption.setAttribute('role','status');
  image.alt='Last saved view of the website';
  frame.append(caption,image);
  area.replaceChildren(frame);
  void window.desktop.browser({action:'retained-page',id:info.id,frameId:saved.id}).then(source=>{
   if(frame.isConnected&&source)image.src=source;
  }).catch(()=>{});
 }
 const label=saved.failed?'Saved view · Website unreachable':saved.stopped?'Saved view · Refresh stopped':'Saved view · Checking for updates…';
 if(frame.firstElementChild.textContent!==label)frame.firstElementChild.textContent=label;
 return true;
}

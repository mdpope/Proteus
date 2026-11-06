const icons={folder:'▸',markdown:'▤',image:'▧',file:'◇'};
const size=v=>v==null?'—':v<1024?v+' B':v<1048576?(v/1024).toFixed(1)+' KB':(v/1048576).toFixed(1)+' MB';
const date=v=>v?new Date(v).toLocaleString():'—';
// Only the mounted view owns requests and preview bytes; no watchers or idle scans.
export function mountFileBrowser(container,{workspaceId,request,escape:e,open,state={}}){
 let disposed=false,generation=0,selection=0,controller,previewController,timer;
 let rootId=state.rootId||'',directory=state.directory||'',offset=0,query='';
 container.classList.add('workspace-file-browser');
 container.innerHTML='<header><label>Folder<select data-roots aria-label="Workspace folder"></select></label><label class="file-filter">Filter<input type="search" data-filter placeholder="Find folders and files…"></label><button data-refresh>Refresh</button></header><nav data-path aria-label="Current folder"></nav><p data-status role="status"></p><div class="file-browser-panes"><div class="file-browser-list"><table><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Created</th><th>Modified</th></tr></thead><tbody></tbody></table><div data-pages></div></div><aside aria-label="File preview"><p>Select a file to preview.</p></aside></div>';
 const $=s=>container.querySelector(s),status=t=>{$('[data-status]').textContent=t;};
 const clearPreview=()=>{selection++;previewController?.abort();$('aside').replaceChildren();};
 const cancel=()=>{generation++;controller?.abort();clearTimeout(timer);clearPreview();};
 async function preview(entry){
  clearPreview();const mine=selection;previewController=new AbortController();
  $('aside').innerHTML='<h3>'+e(entry.name)+'</h3>';
  if(!['markdown','image'].includes(entry.kind)){$('aside').insertAdjacentHTML('beforeend','<p>No preview for this file type.</p>');return;}
  $('aside').insertAdjacentHTML('beforeend','<p>Loading preview…</p>');
  try{
   const value=await request('preview',{workspaceId,rootId,file:entry.path},{signal:previewController.signal});
   if(disposed||mine!==selection||document.hidden)return;
   const aside=$('aside');aside.innerHTML='<h3>'+e(entry.name)+'</h3><button data-open>Open in tab</button><article></article>';
   aside.querySelector('[data-open]').onclick=()=>open(value);
   const article=aside.querySelector('article');
   if(value.mediaType.startsWith('image/')){const image=document.createElement('img');image.alt=entry.name;image.decoding='async';image.src=value.dataURL;article.append(image);}
   else ProteusMarkdown.mount(article,value.content,{allowExternalImages:false,link:()=>status('Open this document in a tab to follow links.')});
  }catch(error){if(!disposed&&mine===selection)status(error.message);}
 }
 async function load(){
  cancel();$('tbody').replaceChildren();$('[data-pages]').replaceChildren();const mine=generation;controller=new AbortController();status('Loading…');
  if(!rootId){status('No available folders configured for this workspace.');return;}
  try{
   const result=await request('browse',{workspaceId,rootId,directory,offset,query},{signal:controller.signal});
   if(disposed||mine!==generation||document.hidden)return;state.rootId=rootId;state.directory=directory;
   $('[data-path]').innerHTML='<button data-folder="">'+e(result.root.name)+'</button>'+directory.split('/').filter(Boolean).map((part,i)=>'<span>/</span><button data-folder="'+e(directory.split('/').slice(0,i+1).join('/'))+'">'+e(part)+'</button>').join('');
   container.querySelectorAll('[data-folder]').forEach(button=>button.onclick=()=>navigate(button.dataset.folder));
   $('tbody').innerHTML=result.entries.map((entry,index)=>'<tr><td><button data-file="'+index+'" title="'+e(entry.path)+'"><span aria-hidden="true">'+icons[entry.kind]+'</span> '+e(entry.name)+'</button></td><td>'+e(entry.type)+'</td><td>'+size(entry.size)+'</td><td>'+e(date(entry.fileCreatedAt))+'</td><td>'+e(date(entry.fileModifiedAt))+'</td></tr>').join('');
   container.querySelectorAll('[data-file]').forEach(button=>{const entry=result.entries[Number(button.dataset.file)];button.onclick=()=>{container.querySelector('[aria-current]')?.removeAttribute('aria-current');button.setAttribute('aria-current','true');if(entry.kind==='folder')navigate(entry.path);else void preview(entry);};});
   $('[data-pages]').innerHTML=(offset?'<button data-prev>Previous</button>':'')+(result.nextOffset!==null?'<button data-next>Next</button>':'');
   $('[data-prev]')?.addEventListener('click',()=>{offset=Math.max(0,offset-200);void load();});$('[data-next]')?.addEventListener('click',()=>{offset=result.nextOffset;void load();});
   status(result.scanLimited?'Search/listing limit reached. Choose a narrower folder.':result.entries.length+' entries'+(query?' matching “'+query+'”':''));
  }catch(error){if(!disposed&&mine===generation&&error.name!=='AbortError')status(error.message);}
 }
 function navigate(next){directory=next;offset=0;query='';$('[data-filter]').value='';void load();}
 $('[data-roots]').onchange=event=>{rootId=event.target.value;navigate('');};
 $('[data-filter]').oninput=event=>{cancel();query=event.target.value;offset=0;timer=setTimeout(()=>void load(),250);};
 $('[data-refresh]').onclick=()=>void load();
 const visibility=()=>{if(document.hidden)cancel();else if(!disposed)void load();};document.addEventListener('visibilitychange',visibility);
 void request('roots',{workspaceId}).then(result=>{if(disposed)return;const roots=result.roots;rootId=roots.some(r=>r.id===rootId&&r.available)?rootId:roots.find(r=>r.available)?.id||'';$('[data-roots]').innerHTML=roots.map(root=>'<option value="'+e(root.id)+'" '+(root.id===rootId?'selected':'')+' '+(root.available?'':'disabled')+'>'+e(root.name)+' · '+e(root.path)+'</option>').join('');if(!document.hidden)void load();}).catch(error=>{if(!disposed)status(error.message);});
 return ()=>{disposed=true;cancel();document.removeEventListener('visibilitychange',visibility);container.replaceChildren();container.classList.remove('workspace-file-browser');};
}

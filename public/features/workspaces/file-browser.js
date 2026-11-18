import {fileIcon} from './file-icons.js';
const size=v=>v==null?'—':v<1024?v+' B':v<1048576?(v/1024).toFixed(1)+' KB':(v/1048576).toFixed(1)+' MB';
const date=v=>v?new Date(v).toLocaleString():'—';
// Editors are lazy chunks: a file list never pays for them, and each language
// grammar loads only when a file in that language is shown.
const codeEditor=()=>import('../../shared/code-editor/code-editor.js');
const markdownEditor=()=>import('../scratchpad/editor-runtime.js');
const element=(tag,className,text)=>{const value=document.createElement(tag);if(className)value.className=className;if(text!==undefined)value.textContent=text;return value;};
const barButton=(text,action,label)=>{const value=element('button','file-doc-button',text);value.type='button';value.onclick=action;if(label)value.setAttribute('aria-label',label);return value;};
const languageNames={javascript:'JavaScript',jsx:'JSX',typescript:'TypeScript',tsx:'TSX',json:'JSON',python:'Python',css:'CSS',html:'HTML',xml:'XML',yaml:'YAML',php:'PHP',java:'Java',c:'C',cpp:'C++',rust:'Rust',go:'Go',sql:'SQL',markdown:'Markdown',swift:'Swift',shell:'Shell',ruby:'Ruby',toml:'TOML',properties:'Config',dockerfile:'Dockerfile',lua:'Lua',perl:'Perl',powershell:'PowerShell',diff:'Diff',r:'R',text:'Plain text'};
// A preview and an opened web file use the same owner-bound resource resolver.
// Disposal releases PDF bytes; late responses must never repopulate a hidden view.
// Text and Markdown share one column-filling viewer: read-only until Edit is chosen,
// so a stray key never changes a file. `state` carries scroll/caret across remounts.
export function mountFileDocument(container,{value,request,open,pdfURL,onError=()=>{},canWrite=false,state={},externalLink,onSaved=()=>{}}){
 let disposed=false,objectURL,alive;
 container.replaceChildren();
 const report=error=>{if(!disposed)onError(error);};
 const followLink=async source=>{
  try{const target=await request('resolve-link',{file:value.relativePath,source});if(disposed)return;if(target.external){if(externalLink)await externalLink(target.external);else window.open(target.external,'_blank','noopener,noreferrer');return;}await open(target);}catch(error){report(error);}
 };
 function textDocument(){
  const markdown=value.mediaType==='text/markdown',editable=canWrite&&value.editable!==false&&!!value.relativePath&&!!value.identity;
  const root=element('div','file-doc'),bar=element('div','file-doc-bar'),kind=element('span','file-doc-kind',languageNames[value.language]||(markdown?'Markdown':'Text')),status=element('span','file-doc-status'),body=element('div','file-doc-body');
  status.setAttribute('role','status');const spacer=element('span','file-doc-spacer');
  let editing=false,editor,dirty=false,saving=false,sourceMode=false,draftText=state.draft?.identity===value.identity?state.draft.content:undefined;
  const original=()=>value.content,current=()=>editor?.value()??value.content;
  const setStatus=message=>{status.textContent=message||'';};
  const modified=value.fileModifiedAt?new Date(value.fileModifiedAt).toLocaleString():'';
  const edit=barButton('Edit',()=>void begin(),'Edit this file'),save=barButton('Save',()=>void persist(),'Save changes'),discard=barButton('Discard',()=>void finish(false),'Discard changes'),wrap=barButton('Wrap',()=>{const on=wrap.getAttribute('aria-pressed')!=='true';wrap.setAttribute('aria-pressed',String(on));editor?.setWrap?.(on);},'Wrap long lines'),sourceToggle=barButton('Source',()=>{sourceMode=!sourceMode;sourceToggle.setAttribute('aria-pressed',String(sourceMode));editor?.source(sourceMode);},'Show Markdown source');
  wrap.setAttribute('aria-pressed',String(value.language==='text'||value.language==='markdown'));sourceToggle.setAttribute('aria-pressed','false');
  const refresh=()=>{dirty=editing&&current()!==original();edit.hidden=editing||!editable;save.hidden=!editing;discard.hidden=!editing;save.disabled=!dirty||saving;sourceToggle.hidden=!(editing&&markdown);wrap.hidden=markdown;if(editing)setStatus(saving?'Saving…':dirty?'Unsaved changes':'No changes');};
  async function mountEditor(readOnly){
   const mine=alive;body.replaceChildren();const host=element('div','file-doc-editor');body.append(host);
   if(markdown){
    const module=await markdownEditor();if(disposed||mine!==alive)return;
    editor=module.mount(host,{value:draftText??value.content,onChange:()=>refresh(),render:(target,source)=>ProteusMarkdown.mount(target,source,{allowExternalImages:false,link:followLink,image:imageFor})});
   }else{
    const module=await codeEditor();if(disposed||mine!==alive)return;
    editor=module.mount(host,{value:value.content,language:value.language,readOnly,wrap:wrap.getAttribute('aria-pressed')==='true',onChange:()=>refresh(),onSave:()=>void persist(),label:(value.title||'File')+' code',state});
    await editor.ready;
   }
  }
  let imageBytes=0;
  const imageFor=async source=>{const result=await request('resolve-link',{file:value.relativePath,source,image:true});if(disposed)throw Error('File view closed.');imageBytes+=(result.dataURL||'').length;if(imageBytes>8_000_000)throw Error('Document image memory limit reached.');return result.dataURL;};
  async function showRead(){
   editing=false;editor?.destroy();editor=null;body.replaceChildren();
   if(markdown){const article=element('article','file-doc-markdown');body.append(article);ProteusMarkdown.mount(article,value.content,{allowExternalImages:false,link:followLink,image:imageFor});requestAnimationFrame(()=>{if(state.mode==='read'&&state.top)body.scrollTop=state.top;});}
   else await mountEditor(true);
   refresh();
  }
  async function begin(){
   if(!editable||editing)return;editing=true;sourceMode=false;sourceToggle.setAttribute('aria-pressed','false');state.mode='edit';
   const mine=alive;body.replaceChildren();
   if(markdown){await mountEditor(false);}else{editor.setReadOnly(false);if(draftText!==undefined)editor.setValue(draftText);}draftText=undefined;
   if(disposed||mine!==alive)return;editor?.focus?.();refresh();
  }
  async function finish(saved){
   if(!saved&&dirty&&!confirm('Discard unsaved changes to '+(value.title||'this file')+'?'))return;
   state.mode='read';editing=false;if(!markdown)editor.setValue(value.content),editor.setReadOnly(true);else await showRead();refresh();setStatus(saved?'Saved':'');
  }
  async function persist(){
   if(!editing||saving||!dirty)return;saving=true;refresh();
   try{const content=current();const result=await request('save',{file:value.relativePath,content,identity:value.identity});value.content=content;value.identity=result.identity;value.size=result.size;value.fileModifiedAt=result.fileModifiedAt||value.fileModifiedAt;saving=false;dirty=false;onSaved(value);await finish(true);}
   catch(error){saving=false;refresh();setStatus('Not saved · '+error.message);report(error);}
  }
  bar.append(kind,element('span','file-doc-meta',[value.size!=null?(value.size<1024?value.size+' B':(value.size/1024).toFixed(1)+' KB'):'',modified].filter(Boolean).join(' · ')),status,spacer,wrap,sourceToggle,discard,save,edit);root.append(bar,body);container.append(root);
  alive={};
  const instance={dirty:()=>dirty,draft:()=>dirty?{identity:value.identity,content:current()}:null,position:()=>{if(editor&&!markdown)return {mode:editing?'edit':'read',...editor.position()};if(!markdown||!editing)return {mode:'read',top:body.scrollTop};return {mode:'edit',top:body.querySelector('.cm-scroller')?.scrollTop||0};},focus:()=>editor?.focus?.(),dispose:()=>{alive=null;editor?.destroy();}};
  return {instance,start:async()=>{await showRead();if(draftText!==undefined&&editable)await begin();}};
 }
 const api={ready:null,dirty:()=>api.text?.dirty()||false,draft:()=>api.text?.draft()||null,position:()=>api.text?.position()||null,dispose(){disposed=true;api.text?.dispose();if(objectURL)URL.revokeObjectURL(objectURL);container.replaceChildren();}};
 api.ready=(async()=>{
  if(value.mediaType.startsWith('image/')){const image=new Image();image.className='file-image-preview';image.alt=value.title||value.relativePath||'';image.src=value.dataURL;container.append(image);}
  else if(value.mediaType==='application/pdf'){
   let url;
   if(pdfURL)url=pdfURL();
   else{
    const result=await request('pdf',{file:value.relativePath});
    if(disposed)return;
    const prefix='data:application/pdf;base64,';
    if(!result.dataURL?.startsWith(prefix))throw Error('The computer returned an invalid PDF.');
    const bytes=Uint8Array.from(atob(result.dataURL.slice(prefix.length)),char=>char.charCodeAt(0));
    if(bytes.length>8*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('The computer returned an invalid or oversized PDF.');
    objectURL=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));url=objectURL;
   }
   if(disposed)return;
   if(pdfURL&&window.desktop?.findDocument){const search=document.createElement('input');search.placeholder='Find in PDF · Enter / Shift+Enter';search.setAttribute('aria-label','Find in PDF');search.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();void window.desktop.findDocument({query:search.value,forward:!event.shiftKey});}};container.append(search);}
   const frame=document.createElement('iframe');frame.className='file-pdf-viewer';frame.title=value.title||'PDF viewer';frame.src=url;container.append(frame);
  }else{
   const built=textDocument();api.text=built.instance;await built.start();
  }
 })().catch(report);
 return api;
}
// View-owned data only. Expanded folders are fetched on demand and released on exit.
export function mountFileBrowser(container,{workspaceId,request,escape:e,open,state={},remote=false,compact=false,selectOpens=false}){
 let disposed=false,version=0,previewVersion=0,controller,previewController,documentView,timer,rootId=state.rootId||'',directory=state.directory||'',query='',sort='name',direction='asc',rows=[],roots=[],chosen=new Set(),anchor=0,expanded=new Map(),expandedPages=new Map(),expansionRequests=new Map(),menu,canWrite=false,restoring=false,dragFrame=0,dragSpeed=0;
 const $=s=>container.querySelector(s),status=t=>{$('[data-status]').textContent=t;};
 container.classList.add('workspace-file-browser');
 if(compact)container.classList.add('file-browser-compact');
 container.innerHTML='<header><label>Folder<select data-roots aria-label="Workspace folder"></select></label><label class="file-filter">Filter<input type="search" data-filter placeholder="Find folders and files…"></label><button data-refresh>Refresh</button></header><div class="file-location"><nav data-path aria-label="Current folder"></nav><div class="file-tools" role="toolbar" aria-label="File actions"></div></div><p data-status role="status"></p><div class="file-browser-panes"><div class="file-browser-list" tabindex="0" aria-label="Files"><table role="grid" aria-multiselectable="true"><thead><tr>'+[['name','Name'],['type','Type'],['size','Size'],['fileCreatedAt','Created'],['fileModifiedAt','Modified']].map(([key,label])=>'<th><button data-sort="'+key+'">'+label+'</button></th>').join('')+'</tr></thead><tbody></tbody></table><div data-pages></div></div><div class="file-divider" role="separator" tabindex="0" aria-label="Resize file list" aria-orientation="vertical"></div><aside aria-label="File preview">Select a file to preview.</aside></div>';
 const refreshButton=$('[data-refresh]');refreshButton.innerHTML=fileIcon('refresh');refreshButton.setAttribute('aria-label','Refresh files');refreshButton.title='Refresh files';
 if(compact){$('[data-filter]').placeholder='Filter files';$('[data-filter]').setAttribute('aria-label','Filter Scratchpad files');}
 const selected=()=>rows.filter(r=>chosen.has(r.path)),args=extra=>({workspaceId,rootId,...extra});
 const tools=[['create','New file','file'],['mkdir','New folder','folder'],['rename','Rename','rename'],['copy','Copy path','copy'],['duplicate','Duplicate','copy'],['move','Move','move'],['trash','Trash','trash']];
 $('.file-tools').innerHTML=tools.map(([action,label,icon])=>'<button data-action="'+action+'" title="'+label+'" aria-label="'+label+'">'+fileIcon(icon)+'<span>'+label+'</span></button>').join('');
 const call=(action,value,options)=>request(action,args(value),options);
 // Remember where the reader was in the open file so a remount or tab switch returns there.
 const capture=()=>{if(documentView){const position=documentView.position();if(position)state.doc={file:state.selectedFile,...position};const draft=documentView.draft();if(draft&&draft.content.length<2_000_000)state.draft={file:state.selectedFile,...draft};else if(!draft&&state.draft?.file===state.selectedFile)delete state.draft;}};
 const cleanPreview=()=>{capture();previewVersion++;previewController?.abort();documentView?.dispose();documentView=null;$('aside').replaceChildren();};
 // Unsaved edits are never discarded silently; the reader decides.
 const discardOK=()=>!documentView?.dirty()||confirm('Discard unsaved changes to this file?');
 async function read(entry){return call('preview',{file:entry.path});}
 async function openEntry(entry){if(disposed)return;if(entry.kind==='folder'){navigate(entry.path);return;}const generation=++previewVersion;try{const value=await read(entry);if(!disposed&&generation===previewVersion)await open(value);}catch(error){if(!disposed&&generation===previewVersion)status(error.message);}}
 async function preview(entry,{restore=false}={}){
  const wasDirty=documentView?.dirty();
  if(!restore&&!discardOK()){chosen.clear();if(state.selectedFile)chosen.add(state.selectedFile);container.querySelectorAll('[data-row]').forEach((tr,i)=>tr.setAttribute('aria-selected',chosen.has(rows[i]?.path)));return;}
  cleanPreview();if(wasDirty&&!restore)delete state.draft;const mine=previewVersion,binding=args({}),requestedRoot=rootId;
  previewController=new AbortController();$('aside').innerHTML='<h3>'+e(entry.name)+'</h3><p>Loading…</p>';
  const boundRequest=(action,value,options)=>request(action,{...binding,...value},options);
  try{
   const value=await boundRequest('preview',{file:entry.path},{signal:previewController.signal});
   if(disposed||mine!==previewVersion||rootId!==requestedRoot)return;
   const aside=$('aside');aside.innerHTML='<div class="file-preview-head"><h3>'+e(entry.name)+'</h3><button data-open>Open in tab</button></div><article></article>';aside.querySelector('article').classList.toggle('file-article-text',value.mediaType==='text/plain'||value.mediaType==='text/markdown');
   aside.querySelector('[data-open]').onclick=()=>open(value);
   state.selectedFile=entry.path;const saved=state.doc?.file===entry.path?{...state.doc}:{};if(state.draft?.file===entry.path)saved.draft=state.draft;documentView=mountFileDocument(aside.querySelector('article'),{value,request:boundRequest,open:openEntry,canWrite,state:saved,onSaved:()=>{const row=rows.find(r=>r.path===entry.path);if(row)row.size=value.size;},
    pdfURL:remote?undefined:()=>'/api/workspace-explorer/pdf?'+new URLSearchParams({...binding,file:entry.path}),
    onError:error=>{if(mine===previewVersion)status(error.message);}});
  }catch(error){if(!disposed&&mine===previewVersion&&error.name!=='AbortError')status(error.message);}
 }

 function draw(){const flat=[];function add(entries,depth=0){for(const entry of entries){flat.push({...entry,depth});if(expanded.has(entry.path))add(expanded.get(entry.path),depth+1);}}add(rows.filter(r=>r.depth===undefined));rows=flat;
 $('tbody').innerHTML=rows.map((r,i)=>'<tr tabindex="-1" draggable="true" data-row="'+i+'" aria-selected="'+chosen.has(r.path)+'"><td><span class="file-indent" style="--depth:'+r.depth+'"></span>'+(r.kind==='folder'?'<button data-expand="'+i+'" aria-label="'+(expanded.has(r.path)?'Collapse':'Expand')+' '+e(r.name)+'" aria-expanded="'+expanded.has(r.path)+'">'+(expanded.has(r.path)?'⌄':'›')+'</button>':'<span class="file-expander-space"></span>')+fileIcon(r.kind,expanded.has(r.path))+'<span>'+e(r.name)+'</span>'+(expandedPages.has(r.path)?'<button data-expand-more="'+i+'" aria-label="More in '+e(r.name)+'">More…</button>':'')+'</td><td>'+e(r.type)+'</td><td>'+size(r.size)+'</td><td>'+e(date(r.fileCreatedAt))+'</td><td>'+e(date(r.fileModifiedAt))+'</td></tr>').join('');
 container.querySelectorAll('[data-row]').forEach(tr=>{const index=+tr.dataset.row,entry=rows[index];tr.querySelector('.file-indent').style.width=(entry.depth*18)+'px';tr.onclick=event=>{if(event.target.closest('[data-expand],[data-expand-more]'))return;select(index,event);};tr.ondblclick=()=>void openEntry(entry);tr.oncontextmenu=event=>{event.preventDefault();if(!chosen.has(entry.path))select(index,{});context(event);};tr.ondragstart=event=>{if(!chosen.has(entry.path))select(index,{});event.dataTransfer.setData('application/x-proteus-files',JSON.stringify(selected().map(r=>({path:r.path,identity:r.identity}))));};tr.ondragover=event=>{if(entry.kind==='folder'){event.preventDefault();tr.classList.add('file-drop');}};tr.ondragleave=()=>tr.classList.remove('file-drop');tr.ondrop=event=>{event.preventDefault();tr.classList.remove('file-drop');if(event.dataTransfer.types.includes('application/x-proteus-files'))void mutate('move',{directory:entry.path});};});
 container.querySelectorAll('[data-expand]').forEach(button=>button.onclick=()=>{const entry=rows[+button.dataset.expand];if(expanded.has(entry.path)){expanded.delete(entry.path);expandedPages.delete(entry.path);expansionRequests.delete(entry.path);redraw();}else{expanded.set(entry.path,[]);void expand(entry);}});
 container.querySelectorAll('[data-expand-more]').forEach(button=>{const entry=rows[+button.dataset.expandMore];button.disabled=expansionRequests.has(entry.path);button.onclick=()=>void expand(entry,expandedPages.get(entry.path));});

 }
 function redraw(){rows=rows.filter(row=>row.depth===0).map(({depth,...row})=>row);draw();updateTools();if(!restoring)state.expanded=[...expanded.keys()];}
 async function expand(entry,offset=0){
  const generation=version,binding=args({}),token={};expansionRequests.set(entry.path,token);redraw();
  try{const result=await request('browse',{...binding,directory:entry.path,sort,direction,offset});if(disposed||generation!==version||expansionRequests.get(entry.path)!==token||!expanded.has(entry.path))return;
   expanded.set(entry.path,(offset?expanded.get(entry.path):[]).concat(result.entries));if(result.nextOffset!==null)expandedPages.set(entry.path,result.nextOffset);else expandedPages.delete(entry.path);if(result.scanLimited)status('Listing limit reached. Open or filter a narrower folder.');
  }catch(error){if(!disposed&&generation===version)status(error.message);}finally{if(expansionRequests.get(entry.path)===token){expansionRequests.delete(entry.path);if(!disposed&&generation===version)redraw();}}
 }
 function select(index,event){if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey)chosen.clear();if(event.shiftKey){for(let i=Math.min(anchor,index);i<=Math.max(anchor,index);i++)chosen.add(rows[i].path);}else{if((event.ctrlKey||event.metaKey)&&chosen.has(rows[index].path))chosen.delete(rows[index].path);else chosen.add(rows[index].path);anchor=index;}container.querySelectorAll('[data-row]').forEach((tr,i)=>tr.setAttribute('aria-selected',chosen.has(rows[i].path)));updateTools();const tr=$('[data-row="'+index+'"]');tr?.focus({preventScroll:true});tr?.scrollIntoView({block:'nearest'});if(rows[index].kind!=='folder'){if(!selectOpens&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&state.selectedFile!==rows[index].path)delete state.doc;if(selectOpens)void openEntry(rows[index]);else void preview(rows[index]);}}
 async function mutate(action,extra={}){if(!canWrite){status('Edit files must be allowed in this device’s connection.');return;}try{const result=await call('mutate',{action,items:selected().map(r=>({path:r.path,identity:r.identity})),directory,...extra});await load();const failed=result.results.filter(r=>!r.ok);status(failed.length?failed.map(r=>r.error).join('; '):'Completed '+result.results.length+' item(s).');}catch(error){status(error.message);}}
 async function act(action){menu?.remove();if(!canWrite&&!['copy','name'].includes(action)){status('Edit files must be allowed in this device’s connection.');return;}if(action==='copy'||action==='name'){try{const text=selected().map(r=>action==='name'?r.name:roots.find(r=>r.id===rootId).path+'/'+r.path).join('\n');await navigator.clipboard.writeText(text);status('Copied.');}catch(error){status(error.message);}return;}if(action==='move'){folderDialog();return;}if(action==='trash'){if(selected().length&&confirm('Move '+selected().length+' selected item(s) to the system trash?'))await mutate(action);return;}const initial=action==='rename'?selected()[0]?.name:action==='duplicate'?'Copy of '+(selected()[0]?.name||''):action==='mkdir'?'New folder':'Untitled.md',name=prompt(action==='rename'?'New name':action==='duplicate'?'Duplicate name':action==='mkdir'?'Folder name':'File name',initial);if(name)await mutate(action,{name});}
 $('.file-tools').onclick=event=>{const b=event.target.closest('[data-action]');if(b)void act(b.dataset.action);};
 function context(event){menu?.remove();menu=document.createElement('div');menu.className='file-context';menu.setAttribute('role','menu');menu.innerHTML='<button data-menu-open>Open in new tab</button>'+[['copy','Copy path'],['name','Copy file name'],['rename','Rename'],['duplicate','Duplicate'],['move','Move…'],['trash','Move to trash']].map(([a,n])=>'<button data-menu-action="'+a+'">'+n+'</button>').join('');menu.style.left=Math.min(event.clientX,innerWidth-220)+'px';menu.style.top=Math.min(event.clientY,innerHeight-300)+'px';container.append(menu);menu.querySelector('[data-menu-open]').onclick=()=>{menu.remove();for(const r of selected())void openEntry(r);};menu.querySelectorAll('[data-menu-action]').forEach(b=>{b.disabled=!canWrite&&!['copy','name'].includes(b.dataset.menuAction);b.onclick=()=>void act(b.dataset.menuAction);});menu.onkeydown=event=>{if(event.key==='Escape')menu.remove();};menu.querySelector('button').focus();}
 function folderDialog(){
  const dialog=document.createElement('dialog');dialog.className='file-move-dialog';
  dialog.innerHTML='<h2>Move selected items</h2><p data-destination></p><div data-folders></div><p data-folder-status role="status"></p><button data-folder-more hidden>More folders</button><button data-up>Up</button><button data-cancel>Cancel</button><button data-move>Move here</button>';
  container.append(dialog);let target='',generation=0,next=null,loading=false;
  const folders=dialog.querySelector('[data-folders]'),more=dialog.querySelector('[data-folder-more]'),move=dialog.querySelector('[data-move]');
  async function browse(offset=0){
   const mine=++generation,requestedTarget=target;loading=true;move.disabled=true;more.disabled=true;
   if(!offset){folders.replaceChildren();next=null;more.hidden=true;}
   dialog.querySelector('[data-destination]').textContent=target||'Workspace root';
   dialog.querySelector('[data-up]').disabled=!target;
   try{
    const value=await call('browse',{directory:requestedTarget,foldersOnly:true,offset});
    if(disposed||!dialog.isConnected||mine!==generation)return;
    for(const entry of value.entries.filter(r=>r.kind==='folder')){
     const button=document.createElement('button');button.dataset.target=entry.path;button.innerHTML=fileIcon('folder')+e(entry.name);
     button.onclick=()=>{target=entry.path;void browse();};folders.append(button);
    }
    next=value.nextOffset;more.hidden=next===null;
    dialog.querySelector('[data-folder-status]').textContent=value.scanLimited?'Listing limit reached. Open a narrower folder.':'';
   }catch(error){if(mine===generation&&dialog.isConnected)dialog.querySelector('[data-folder-status]').textContent=error.message;}
   finally{if(mine===generation){loading=false;move.disabled=false;more.disabled=false;}}
  }
  more.onclick=()=>{if(!loading&&next!==null)void browse(next);};
  dialog.querySelector('[data-up]').onclick=()=>{target=target.split('/').slice(0,-1).join('/');void browse();};
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  move.onclick=()=>{if(loading)return;dialog.close();void mutate('move',{directory:target});};
  dialog.onclose=()=>{generation++;dialog.remove();};dialog.showModal();void browse();
 }

 async function load(offset=0){stopDragScroll();version++;controller?.abort();cleanPreview();controller=new AbortController();const mine=version,wanted=query?[]:[...(state.expanded||[])],wantedScroll=state.listScroll||0,reopen=state.selectedFile;restoring=true;expanded.clear();expandedPages.clear();expansionRequests.clear();chosen.clear();try{const result=await call('browse',{directory,query,offset,sort,direction},{signal:controller.signal});if(disposed||mine!==version)return;state.rootId=rootId;state.directory=directory;rows=result.entries;draw();updateTools();if(wanted.length){const depth=value=>value.split('/').length;for(const level of [...new Set(wanted.map(depth))].sort((a,b)=>a-b)){const entries=wanted.filter(value=>depth(value)===level).map(value=>rows.find(row=>row.path===value&&row.kind==='folder')).filter(Boolean);for(const entry of entries)expanded.set(entry.path,[]);await Promise.all(entries.map(entry=>expand(entry)));if(disposed||mine!==version)return;}}
  if(state.selectedFile){const ancestors=state.selectedFile.split('/').slice(0,-1);let prefix='';for(const part of ancestors){prefix+=(prefix?'/':'')+part;const entry=rows.find(row=>row.path===prefix&&row.kind==='folder');if(entry&&!expanded.has(prefix)){expanded.set(prefix,[]);await expand(entry);if(disposed||mine!==version)return;}}const index=rows.findIndex(row=>row.path===state.selectedFile);if(index>=0){chosen.add(state.selectedFile);const node=$('[data-row="'+index+'"]');node?.setAttribute('aria-selected','true');if(!wantedScroll)node?.scrollIntoView({block:'nearest'});if(reopen&&!selectOpens&&rows[index].kind!=='folder')void preview(rows[index],{restore:true});}}
  restoring=false;state.expanded=[...expanded.keys()];if(wantedScroll)$('.file-browser-list').scrollTop=wantedScroll;
  $('[data-path]').innerHTML='<button data-folder="">'+e(result.root.name)+'</button>'+directory.split('/').filter(Boolean).map((part,i)=>'<span>/</span><button data-folder="'+e(directory.split('/').slice(0,i+1).join('/'))+'">'+e(part)+'</button>').join('');container.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>navigate(b.dataset.folder));$('[data-pages]').innerHTML=(offset?'<button data-prev>Previous</button>':'')+(result.nextOffset!==null?'<button data-next>Next</button>':'');$('[data-prev]')?.addEventListener('click',()=>void load(Math.max(0,offset-200)));$('[data-next]')?.addEventListener('click',()=>void load(result.nextOffset));status(result.scanLimited?'Listing limit reached; narrow the folder.':rows.length+' entries');container.querySelectorAll('[data-sort]').forEach(b=>b.parentElement.setAttribute('aria-sort',b.dataset.sort===sort?(direction==='asc'?'ascending':'descending'):'none'));}catch(error){if(error.name!=='AbortError'){restoring=false;status(error.message);}}}
 function updateTools(){container.querySelectorAll('[data-action]').forEach(button=>{const action=button.dataset.action;button.disabled=action==='copy'?chosen.size===0:!canWrite||(!['create','mkdir'].includes(action)&&chosen.size===0)||(['rename','duplicate'].includes(action)&&chosen.size!==1);});}
 updateTools();
 function navigate(value){directory=value;query='';state.expanded=[];state.listScroll=0;delete state.selectedFile;delete state.doc;delete state.draft;$('[data-filter]').value='';void load();}
 $('.file-browser-list').onkeydown=event=>{if(event.target.closest('input'))return;const focused=$('[data-row]:focus'),current=focused?Number(focused.dataset.row):-1;if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,current+(event.key==='ArrowDown'?1:-1)));if(rows[next])select(next,event);}else if(event.key==='Enter'&&rows[current]){event.preventDefault();void openEntry(rows[current]);}else if((event.ctrlKey||event.metaKey)&&event.key==='a'){event.preventDefault();chosen=new Set(rows.map(r=>r.path));container.querySelectorAll('[data-row]').forEach(tr=>tr.setAttribute('aria-selected','true'));updateTools();}else if(event.key==='F2'){event.preventDefault();void act('rename');}};
 function stopDragScroll(){dragSpeed=0;if(dragFrame)cancelAnimationFrame(dragFrame);dragFrame=0;}
 const list=$('.file-browser-list');list.addEventListener('scroll',()=>{if(!restoring)state.listScroll=list.scrollTop;},{passive:true});
 list.ondragover=event=>{if(!event.dataTransfer.types.includes('application/x-proteus-files'))return;const rect=list.getBoundingClientRect();dragSpeed=event.clientY<rect.top+40?-Math.ceil((rect.top+40-event.clientY)/3):event.clientY>rect.bottom-40?Math.ceil((event.clientY-rect.bottom+40)/3):0;dragSpeed=Math.max(-16,Math.min(16,dragSpeed));if(!dragSpeed){stopDragScroll();return;}if(!dragFrame){const tick=()=>{if(!dragSpeed||disposed){stopDragScroll();return;}list.scrollTop+=dragSpeed;dragFrame=requestAnimationFrame(tick);};dragFrame=requestAnimationFrame(tick);}};
 list.ondragleave=event=>{if(!list.contains(event.relatedTarget))stopDragScroll();};list.ondrop=stopDragScroll;list.ondragend=stopDragScroll;

 container.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{direction=sort===b.dataset.sort&&direction==='asc'?'desc':'asc';sort=b.dataset.sort;void load();});
 const divider=$('.file-divider'),panes=$('.file-browser-panes');function width(value){const fraction=Math.max(.15,Math.min(.85,value));state.split=fraction;panes.style.setProperty('--file-split',fraction*100+'%');divider.setAttribute('aria-valuenow',Math.round(fraction*100));}width(state.split||.6);divider.onpointerdown=event=>{divider.setPointerCapture(event.pointerId);};divider.onpointermove=event=>{if(divider.hasPointerCapture(event.pointerId)){const rect=panes.getBoundingClientRect();width((event.clientX-rect.left)/rect.width);}};divider.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();width((state.split||.6)+(event.key==='ArrowLeft'?-.05:.05));}};
 $('[data-roots]').onchange=event=>{rootId=event.target.value;navigate('');};$('[data-filter]').oninput=event=>{query=event.target.value;clearTimeout(timer);timer=setTimeout(()=>void load(),250);};$('[data-refresh]').onclick=()=>void load();
 const visibility=()=>{if(document.hidden||!container.isConnected||container.closest('[hidden]')){stopDragScroll();controller?.abort();cleanPreview();}else void load();};document.addEventListener('visibilitychange',visibility);
 void request('roots',{workspaceId}).then(value=>{if(disposed)return;canWrite=remote?value.canWrite===true:true;updateTools();roots=value.roots;rootId=roots.some(r=>r.id===rootId&&r.available)?rootId:roots.find(r=>r.available)?.id||'';$('[data-roots]').innerHTML=roots.map(r=>'<option value="'+e(r.id)+'" '+(r.id===rootId?'selected':'')+' '+(r.available?'':'disabled')+'>'+e(r.name)+' · '+e(r.path)+'</option>').join('');if(rootId)void load();else status('No available workspace folders.');}).catch(error=>status(error.message));
 const dispose=()=>{stopDragScroll();disposed=true;version++;controller?.abort();cleanPreview();clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);container.replaceChildren();container.classList.remove('workspace-file-browser');};dispose.reveal=path=>{state.selectedFile=path;directory='';return load();};return dispose;
}

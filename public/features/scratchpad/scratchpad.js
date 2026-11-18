import {fitViewportColumns} from '../../shared/ui/viewport-columns.js';
import {mountFileBrowser,mountFileDocument} from '../workspaces/file-browser.js';
import {ScratchEditor} from '../../models/scratch-editor.js';
import {ScratchAction} from '../../models/scratch-action.js';
import {createFeatureWorkspaceTabs} from '../../shared/navigation/feature-workspace-tabs.js';

export const scratchIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M9 15l1-4 9-9 3 3-9 9-4 1Z"/></svg>';
const node=(tag,text,className)=>{const value=document.createElement(tag);if(text!==undefined)value.textContent=text;if(className)value.className=className;return value;};
const button=(text,action,label)=>{const value=node('button',text);value.type='button';if(label)value.setAttribute('aria-label',label);value.onclick=action;return value;};
const label=(text,control)=>{const value=node('label',text);value.append(control);return value;};

// A retained feature view preserves editor selection and drafts across shell
// refreshes. Bodies load only when opened, never as part of the index list.
export function createScratchpadView({request:transport,settings,configure,pick,projects=()=>[],projectId,workspaceId,workspaces=()=>[],initialId,onSelect,onOpenRecord,single=false,storageKey,markdown,notify=()=>{},contentTabs,owners=()=>[],ownerId,onOwner}) {
 const host=node('section',undefined,'scratchpad-page'),content=node('div',undefined,'scratchpad-content');
 let ownerGroup,navigationVersion=0;let indexTimer,settingsOpen=false,refreshSuggestions=async()=>{};
 const editors=new Map();let rootId=null,draftKey=storageKey+':drafts',selected=null,filter={search:'',category:'',sort:'created',offset:0,workspace:'',project:''},listing,loadVersion=0,active=false,storageTimer,mutations,savedDrafts={};
 const request=args=>transport({...args,...(rootId?{rootId}: {})});
 function bind(status){if(status.rootId===rootId)return;persist();for(const item of editors.values()){item.disposed=true;item.model.stopTimers();item.markdownEditor?.destroy();item.disposeFiles?.();}editors.clear();selected=null;filter={...filter,search:'',category:'',offset:0};rootId=status.rootId;draftKey=storageKey+':'+rootId+':drafts';mutations=new ScratchAction({request:args=>transport({...args,rootId:status.rootId}),load:()=>JSON.parse(localStorage.getItem(draftKey+':action')||'null'),save:value=>{if(value)localStorage.setItem(draftKey+':action',JSON.stringify(value));else localStorage.removeItem(draftKey+':action');}});savedDrafts={};try{savedDrafts=JSON.parse(localStorage.getItem(draftKey)||'{}');}catch{}}
 const scoped=args=>({...args,...(projectId?{projectId}:workspaceId?{workspaceId}:{} )});
 // A workspace page lists every scratch in that workspace, including all its projects; a project page lists only its own.
 const listScoped=args=>projectId?{...args,projectId}:workspaceId?{...args,workspaceFilter:workspaceId}:args,embedded=!!(projectId||workspaceId);
 const act=fn=>async()=>{try{await fn();}catch(error){notify(error.message);showError(error.message);}};
 function showError(message){let area=host.querySelector('[data-scratch-error]');if(!area){area=node('p',undefined,'banner');area.dataset.scratchError='';area.setAttribute('role','alert');content.prepend(area);}area.replaceChildren(node('span',message));if(mutations?.pending)area.append(button('Retry unconfirmed action',act(async()=>{const command=mutations.pending;const result=await mutations.retry();if(command.action==='delete'){editors.get(command.id)?.model.stopTimers();editors.delete(command.id);delete savedDrafts[command.id];selected=null;persist();await drawList();}else{const id=result.id||command.id,item=editors.get(id);if(item){item.model.record={...item.model.record,...result};if(item.association)item.association.value=item.model.record.projectId||'';lock(item,false);}await openEditor(id);}})));}
 function persist(){clearTimeout(storageTimer);for(const [id,item] of editors){if(item.model.dirty)savedDrafts[id]=item.model.snapshot();else delete savedDrafts[id];}try{localStorage.setItem(draftKey,JSON.stringify(savedDrafts));}catch{notify('Scratchpad could not preserve the local draft. Keep this page open until it saves.');}}
 function lock(item,value){item.locked=value;item.host.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=value);}
 async function mutate(item,args){lock(item,true);try{return await mutations.perform(args);}finally{lock(item,!!mutations.pending);}}
 function changed(item){
  if(item.disposed)return;
  const navKey=JSON.stringify([item.model.record.relative,item.model.record.title]);if(item.navKey!==navKey){item.navKey=navKey;void item.disposeTree?.reveal?.(item.model.record.relative);}
  item.status.textContent=item.model.error?'Not saved · '+item.model.error:item.model.pending?'Saving…':item.model.dirty?'Unsaved changes':'Saved';
  item.retry.hidden=!item.model.error||item.model.conflict;item.copy.hidden=!item.model.error;
  item.previewButton.textContent=item.preview.hidden?'Preview':'Edit';if(item.locked)lock(item,true);
  if(!item.preview.hidden)renderPreview(item);
  clearTimeout(storageTimer);storageTimer=setTimeout(persist,750);
  if(single&&selected===item.model.record.id)onSelect?.(item.model.record);navigation.render();
 }
 function renderMarkdown(item,target,text){target.dataset.linkFile='/Scratchpad/'+item.model.record.relative;if(!markdown){target.replaceChildren(node('pre',text));return;}let bytes=0;const relative=source=>decodeURIComponent(new URL(source,'https://scratch.local/'+item.model.record.relative).pathname.slice(1));markdown(target,text,{link:source=>item.openFile?.(relative(source)),image:async source=>{const value=await request({action:'asset',path:relative(source)});if(!value.mediaType.startsWith('image/'))throw Error('Choose an image.');bytes+=value.data.length;if(bytes>8_000_000)throw Error('Document image memory limit reached.');return 'data:'+value.mediaType+';base64,'+value.data;}});}
 function renderPreview(item){renderMarkdown(item,item.preview,item.model.value.body);}

 async function leaveEditor(){if(selected){const item=editors.get(selected);try{await item?.model.flush();}finally{persist();}}}
 function tabs(){navigation.render();}
 async function setup(changing=false){settingsOpen=true;content.replaceChildren(node('h1',changing?'Scratchpad settings':'Scratchpad'),node('p','Choose a storage folder. Proteus creates a Scratchpad directory inside it, organized by workspace and project. Markdown files remain usable in Obsidian and other editors.'));
  ownerPicker();if(!settings||!configure){content.append(node('p','Choose the storage folder on the owning computer, then enable Read and edit Scratchpad for this device in Connections.','note'));return;}
  let current;const choices=node('select');choices.setAttribute('aria-label','Configured memory or library folder');
  const refreshChoices=async()=>{const next=await settings();if(!choices.isConnected)return;current=next;const selected=choices.value;choices.replaceChildren(new Option('Choose a configured memory or library folder…',''));for(const suggestion of current.suggestions||[])choices.append(new Option(suggestion.folder,suggestion.folder));choices.value=selected;};
  refreshSuggestions=refreshChoices;
  choices.onfocus=()=>void refreshChoices().catch(error=>showError(error.message));
  const folder=node('input');folder.placeholder='Storage folder on this computer';folder.setAttribute('aria-label','Scratchpad storage folder');choices.onchange=()=>{folder.value=choices.value;};
  const actions=node('div',undefined,'actions');if(pick)actions.append(button('Choose folder…',act(async()=>{const paths=await pick();if(paths?.[0])folder.value=paths[0];})));
  actions.append(button('Use this folder',act(async()=>{if(!current)return;
   if(current.configured&&!confirm('Change Scratchpad storage? Existing files stay in the old location. The index will be rebuilt from the new location in the background; this can take some time. Items appear as they are indexed.'))return;
   for(const item of editors.values())await item.model.flush();if(mutations?.pending)throw Error('Confirm the pending Scratchpad action before changing storage.');persist();
   await configure({folder:folder.value,expectedRevision:current.revision});settingsOpen=false;await drawList();})));
  if(changing)actions.append(button('Cancel',act(()=>drawList())));
  content.append(label('Configured folders',choices),label('Storage folder',folder),node('p','Changing storage leaves existing files untouched. The new location is indexed on a background worker. Large folders may take time; items appear progressively.','note'),actions);await refreshChoices();if(changing&&current?.root)content.prepend(node('p','Current storage: '+current.root,'note'));tabs();
 }
 async function drawList(){
  settingsOpen=false;clearTimeout(indexTimer);const version=++loadVersion;selected=null;tabs();content.replaceChildren(node('p','Loading scratches…','note'));
  try {
   const status=await transport({action:'status'});if(version!==loadVersion)return;bind(status);if(!status.configured){await setup();return;}
   listing=await request(listScoped({...(filter.workspace?{workspaceFilter:filter.workspace}:{}),...(filter.project?{projectId:filter.project}:{}),action:'list',search:filter.search,sort:filter.sort,offset:filter.offset,...(filter.category?{category:filter.category}: {})}));if(version!==loadVersion)return;
   content.replaceChildren();ownerPicker();const heading=node('div',undefined,'heading'),title=node('div');title.append(node('h1',projectId?'Project scratches':workspaceId?'Workspace scratches':'Scratchpad'),node('p','Markdown · saved on its owning computer','muted'));const actions=node('div',undefined,'actions');
   if(settings)actions.append(button('⚙',act(()=>setup(true)),'Scratchpad settings'));
   actions.append(button('New scratch',act(create)),button('Synchronize files',act(async()=>{for(const item of editors.values()){if(!item.model.error)await item.model.flush();if(item.model.pending)throw Error('Confirm pending saves before synchronizing files.');}if(mutations.pending)throw Error('Retry the unconfirmed action before synchronizing files.');const result=await request(scoped({action:'sync'}));notify(`${result.added} added · ${result.updated} updated · ${result.removed} removed`);await drawList();if(result.errors?.length)showError(result.errors.map(row=>row.relative+': '+row.error).join('\n'));})));heading.append(title,actions);content.append(heading);
   if(status.indexing?.running){content.append(node('p',`Indexing in background · ${status.indexing.added||0} added · ${status.indexing.updated||0} updated`,'note'));indexTimer=setTimeout(()=>{if(active&&!selected&&!settingsOpen)void drawList();},1200);}else if(status.indexing?.error)showError(status.indexing.error);
   const filters=node('div',undefined,'scratchpad-filters'),search=node('input');search.type='search';search.value=filter.search;search.placeholder='Find scratches';search.setAttribute('aria-label','Find scratches');
   search.onchange=()=>{filter.search=search.value;filter.offset=0;void drawList();};const categories=node('select');categories.setAttribute('aria-label','Scratch category');categories.append(new Option('All categories',''));for(const value of listing.categories.filter(Boolean))categories.append(new Option(value,value));categories.value=filter.category;categories.onchange=()=>{filter.category=categories.value;filter.offset=0;void drawList();};
   const sort=node('select');sort.setAttribute('aria-label','Sort scratches');for(const [value,text] of [['updated','Last modified'],['created','Created'],['title','Title'],['category','Category']])sort.append(new Option(text,value));sort.value=filter.sort;sort.onchange=()=>{filter.sort=sort.value;filter.offset=0;void drawList();};filters.append(search,categories,sort);content.append(filters);
   const scopes=node('div',undefined,'scratchpad-scope-filters');
   const workspaceChoices=node('div',undefined,'scratchpad-scope-group');workspaceChoices.setAttribute('role','group');workspaceChoices.setAttribute('aria-label','Filter by workspace');
   const projectChoices=node('div',undefined,'scratchpad-scope-group scratchpad-project-filters');projectChoices.setAttribute('role','group');projectChoices.setAttribute('aria-label','Filter by project');
   const choose=(group,text,ws,pr)=>{const b=button(text,act(()=>{filter.workspace=ws;filter.project=pr;filter.offset=0;return drawList();}));b.setAttribute('aria-pressed',String(group===workspaceChoices?filter.workspace===ws:filter.project===pr));group.append(b);};
   choose(workspaceChoices,'All workspaces','','');for(const ws of workspaces())choose(workspaceChoices,ws.name,ws.id,'');
   scopes.append(workspaceChoices);
   if(filter.workspace){const available=projects().filter(pr=>pr.workspaceId===filter.workspace);if(available.length){projectChoices.append(node('span','Projects','scratchpad-scope-label'));for(const pr of available)choose(projectChoices,pr.name,filter.workspace,pr.id);scopes.append(projectChoices);}}
   if(!embedded)content.append(scopes);
   const list=node('div',undefined,'scratchpad-list');for(const row of listing.items){const open=button('',act(()=>openEditor(row.id)));open.className='scratchpad-row';open.dataset.linkPreview='Scratchpad/'+(row.relative||row.title);open.append(node('strong',row.title),node('span',[row.category||'Uncategorized',row.format,new Date(row.updated).toLocaleString()].join(' · '),'note'));list.append(open);}if(!listing.items.length)list.append(node('p',filter.search||filter.category?'No scratches match these filters.':'No scratches yet. Create one, or synchronize Markdown files you added outside Proteus.','note'));content.append(list);
   const paging=node('div',undefined,'actions');if(filter.offset)paging.append(button('Previous',act(()=>{filter.offset=Math.max(0,filter.offset-100);return drawList();})));if(listing.hasMore)paging.append(button('Next',act(()=>{filter.offset+=100;return drawList();})));content.append(paging);if(mutations.pending)showError('A previous Scratchpad action needs confirmation. Retry it before making another structural change.');
  } catch(error){if(version===loadVersion){content.replaceChildren();ownerPicker();content.append(node('h1','Scratchpad'));showError(error.message);content.append(button('Retry',act(drawList)));}}
 }
 function ownerPicker(){if(!onOwner)return;ownerGroup?.remove();const group=node('div',undefined,'scratchpad-scope-filters');group.setAttribute('role','group');group.setAttribute('aria-label','Scratchpad computers');for(const owner of owners()){const choice=button(owner.name,act(()=>onOwner(owner.id)));choice.setAttribute('aria-pressed',String(owner.id===ownerId));if(owner.online===false)choice.title='Reconnect this computer to load its Scratchpad';group.append(choice);}ownerGroup=group;content.prepend(group);}
 async function create(){
  if(editors.size>=20)throw Error('Close a saved scratch tab before opening more.');
  const record=await mutations.perform(scoped({action:'create',...(filter.project?{projectId:filter.project}:filter.workspace?{workspaceId:filter.workspace}:{}),title:'Untitled',body:'',format:'markdown',category:filter.category}));await openEditor(record.id);
 }
 async function openEditor(id){
  if(onOpenRecord&&!single)return onOpenRecord(id);
  const version=++navigationVersion;if(selected!==id)await leaveEditor();if(version!==navigationVersion)return;++loadVersion;
  let item=editors.get(id);if(!item){
   if(editors.size>=20)throw Error('Close a saved scratch tab before opening more.');
   const record=await request({action:'read',id});if(version!==navigationVersion)return;item=editor(record);editors.set(id,item);
  }
  if(version!==navigationVersion)return;selected=id;item.showScratch?.();content.replaceChildren(item.host);void item.disposeTree?.reveal?.(item.model.record.relative);onSelect?.(item.model.record);tabs();changed(item);
 }
 function editor(record){
  const page=node('article',undefined,'scratchpad-editor'),title=node('input'),category=node('input'),workspace=node('select'),association=node('select'),body=node('textarea'),preview=node('div',undefined,'rich-text'),status=node('p',undefined,'note'),actions=node('div',undefined,'actions');
  const item={host:page,status,body,preview,association,locked:mutations.pending?.id===record.id};
  const editorRoot=rootId,model=item.model=new ScratchEditor(record,{request:args=>transport({...args,rootId:editorRoot}),saved:savedDrafts[record.id],changed:()=>changed(item)});
  title.value=model.value.title;title.setAttribute('aria-label','Scratch title');category.value=model.value.category;category.placeholder='Inbox, Ideas, Snippets…';category.setAttribute('aria-label','Scratch category');
  workspace.setAttribute('aria-label','Scratch workspace');workspace.append(new Option('Unassigned',''));for(const ws of workspaces())workspace.append(new Option(ws.name,ws.id));workspace.value=record.workspaceId||'';
  const projectChoices=()=>{association.replaceChildren(new Option('No project',''));for(const project of projects().filter(row=>row.workspaceId===workspace.value))association.append(new Option(project.name,project.id));association.value=model.record.projectId||'';};projectChoices();association.setAttribute('aria-label','Scratch project');
  body.value=model.value.body;body.setAttribute('aria-label','Scratch content');body.spellcheck=model.value.format!=='code';preview.hidden=true;
  title.oninput=()=>model.edit({title:title.value});category.oninput=()=>model.edit({category:category.value});body.oninput=()=>model.edit({body:body.value});
  const move=act(async()=>{try{await model.flush();const moved=await mutate(item,{action:'move',id:record.id,projectId:association.value||null,workspaceId:workspace.value||null,expectedRevision:model.record.revision});model.record={...model.record,...moved};workspace.value=model.record.workspaceId||'';projectChoices();changed(item);}finally{association.value=model.record.projectId||'';lock(item,!!mutations.pending);}});
  association.onchange=move;workspace.onchange=()=>{association.value='';void move();};
  const rich=node('div',undefined,'scratch-code-editor');
  void import('./editor-runtime.js').then(module=>{if(item.disposed)return;item.markdownEditor=module.mount(rich,{value:body.value,onChange:text=>{body.value=text;model.edit({body:text,format:'markdown'});},render:(target,text)=>renderMarkdown(item,target,text)});item.markdownEditor.source(source);body.hidden=true;}).catch(error=>{notify('Rich editor unavailable; Markdown source remains editable. '+error.message);rich.hidden=true;});
  const toolbar=node('div',undefined,'actions');toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Markdown formatting');
  for(const [text,before,after] of [['Bold','**','**'],['Italic','_','_'],['Heading','## ',''],['Bullet','- ',''],['Task','- [ ] ',''],['Code','`','`'],['Code block','\n```\n','\n```\n'],['Link','[','](https://)'],['Image','![','](image.png)'],['Quote','> ',''],['Numbered list','1. ',''],['Strike','~~','~~'],['Divider','\n---\n',''],['Table','\n| Column | Column |\n| --- | --- |\n| ',' | |\n']])toolbar.append(button(({Bold:'B',Italic:'I',Heading:'H₂',Bullet:'•',Task:'☑',Code:'</>',Link:'↗',Image:'▧',Quote:'❝'})[text]||text,()=>{if(item.markdownEditor){item.markdownEditor.insert(before,after);return;}const start=body.selectionStart,end=body.selectionEnd;body.setRangeText(before+body.value.slice(start,end)+after,start,end,'select');body.dispatchEvent(new Event('input',{bubbles:true}));body.focus();},text));
  item.previewButton=button('Preview',()=>{preview.hidden=!preview.hidden;body.hidden=!preview.hidden;toolbar.hidden=!preview.hidden;rich.hidden=!preview.hidden;if(item.markdownEditor)body.hidden=true;for(const control of [title,category,workspace,association])control.disabled=!preview.hidden;sourceButton.disabled=!preview.hidden;if(!preview.hidden)renderPreview(item);changed(item);});
  item.retry=button('Retry save',act(()=>model.flush({retry:true})));item.retry.hidden=true;
  item.copy=button('Copy unsaved text',act(async()=>{await navigator.clipboard.writeText(model.value.body);notify('Unsaved text copied.');}));item.copy.hidden=true;
  let source=false;const sourceButton=button('Source',()=>{source=!source;item.markdownEditor?.source(source);sourceButton.textContent=source?'Live Preview':'Source';});
  actions.append(sourceButton,item.previewButton,item.retry,item.copy,button('Reload saved version',act(async()=>{if(model.dirty&&!confirm('Discard this unsaved draft and reload the saved file?'))return;model.stopTimers();editors.delete(record.id);delete savedDrafts[record.id];persist();selected=null;await openEditor(record.id);})),button('Delete scratch',act(async()=>{if(!confirm('Move this scratch to Scratchpad’s .Trash folder?'))return;await model.flush();await mutate(item,{action:'delete',id:record.id,expectedRevision:model.record.revision});editors.delete(record.id);delete savedDrafts[record.id];persist();selected=null;await drawList();})));
  const properties=node('div',undefined,'scratchpad-properties');properties.append(label('Category',category),label('Workspace',workspace),label('Project',association));const document=node('section',undefined,'scratchpad-document');document.append(label('Title',title),properties,actions,status,toolbar,body,rich,preview);const tree=node('aside',undefined,'scratchpad-tree');tree.setAttribute('aria-label','Scratch folder browser');page.append(tree,document);const disposeViewport=fitViewportColumns(page);
  let fileView;
  const files=async(action,args={})=>{
   if(action==='resolve-link'){
    if(/^https?:/i.test(args.source)){const url=new URL(args.source);if(url.username||url.password)throw Error('Credential links are not supported.');if(args.image)throw Error('External images are not loaded.');return {external:url.href};}
    if(/^[a-z][a-z0-9+.-]*:/i.test(args.source))throw Error('Unsupported Scratchpad link.');
    const file=decodeURIComponent(new URL(args.source,'https://scratch.local/'+args.file).pathname.slice(1)),value=await files('preview',{file});
    if(args.image&&!value.mediaType.startsWith('image/'))throw Error('Choose an image.');return value;
   }
   if(action==='roots')return {canWrite:false,roots:[{id:'scratchpad',name:'Scratchpad',path:'',available:true}]};
   const tree=(await request({action:'tree'})).items;
   const entry=tree.find(row=>row.path===args.file);
   if(action==='browse'){const directory=args.directory||'',prefix=directory?directory+'/':'',entries=tree.filter(row=>row.path.startsWith(prefix)&&!row.path.slice(prefix.length).includes('/')).filter(row=>!args.query||row.path.toLowerCase().includes(args.query.toLowerCase())).map(row=>({path:row.path,name:row.scratchTitle||row.path.split('/').pop().replace(/--[a-zA-Z0-9_-]+$/,''),kind:row.kind==='directory'?'folder':'file',type:row.scratchId?'Markdown':row.path.split('.').pop(),identity:row.path}));entries.sort((a,b)=>(a.kind==='folder'?0:1)-(b.kind==='folder'?0:1)||(args.direction==='desc'?-1:1)*a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})||a.path.localeCompare(b.path));return {entries,nextOffset:null,root:{name:'Scratchpad'}};}
   if(action==='preview'&&entry?.scratchId){const value=await request({action:'read',id:entry.scratchId});return {...value,scratchId:value.id,mediaType:'text/markdown',content:value.body,relativePath:entry.path};}
   if(action==='preview'||action==='pdf'){const value=await request({action:'asset',path:args.file});return {...value,dataURL:value.data?'data:'+value.mediaType+';base64,'+value.data:undefined,relativePath:args.file,title:args.file.split('/').pop()};}
   throw Error('Use Scratchpad controls to manage Markdown notes.');
  };
  item.showScratch=()=>{fileView?.dispose();fileView=null;if(!document.contains(title))document.replaceChildren(label('Title',title),properties,actions,status,toolbar,body,rich,preview);};
  const openFile=async value=>{if(value.scratchId)return openEditor(value.scratchId);const version=++navigationVersion;await model.flush();if(version!==navigationVersion||selected!==record.id)return;fileView?.dispose();void item.disposeTree?.reveal?.(value.relativePath);onSelect?.({title:value.title||value.relativePath.split('/').pop()});document.replaceChildren();const back=button('Back to scratch',act(()=>openEditor(record.id)));const area=node('section');document.append(back,area);fileView=mountFileDocument(area,{value,request:files,open:openFile,onError:error=>notify(error.message)});};
  item.openFile=async file=>openFile(await files('preview',{file}));
  item.disposeFiles=()=>{disposeViewport();item.disposeTree?.();fileView?.dispose();};
  item.disposeTree=mountFileBrowser(tree,{workspaceId:'scratchpad',remote:true,compact:true,selectOpens:true,state:{selectedFile:record.relative},escape:text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),request:files,open:openFile});
  return item;
 }
 const navigation=createFeatureWorkspaceTabs({title:'Scratchpad',tabs:()=>[{id:'master',title:'Scratchpad'},...[...editors].map(([id,item])=>({id,title:item.model.value.title||'Untitled',closable:true,scratchId:id}))],selected:()=>selected||'master',select:id=>{if(id==='master')void act(async()=>{await leaveEditor();selected=null;await drawList();})();else void act(()=>openEditor(id))();},close:async id=>{const item=editors.get(id);await item.model.flush();item.model.stopTimers();item.disposed=true;item.markdownEditor?.destroy();item.disposeFiles?.();editors.delete(id);delete savedDrafts[id];persist();if(selected===id){selected=null;await drawList();}},resources:contentTabs});
 // An embedded page that opens notes as app tabs needs no second tab strip.
 const bar=navigation.bar;if(!single&&!(embedded&&onOpenRecord))host.append(bar);host.append(content);
 const refreshFolders=()=>active&&settingsOpen?refreshSuggestions():Promise.resolve();
 const onFocus=()=>void refreshFolders().catch(error=>notify(error.message));window.addEventListener('focus',onFocus);
 return {host,bar,refreshFolders,refreshOwners(){if(!selected)ownerPicker();},async mount(container){if(active&&host.isConnected)return;active=true;container.replaceChildren(host);host.hidden=true;try{const status=await transport({action:'status'});bind(status);host.hidden=false;if(!host.dataset.loaded||!selected){host.dataset.loaded='true';if(initialId){await openEditor(initialId);}else await drawList();}else{content.replaceChildren(editors.get(selected).host);onSelect?.(editors.get(selected).model.record);}}catch(error){host.hidden=false;content.replaceChildren(node('h1','Scratchpad'));ownerPicker();showError(error.message);}},async leave(){if(!active)return;active=false;clearTimeout(indexTimer);for(const item of editors.values())try{await item.model.flush();}catch(error){notify(error.message);}persist();},async destroy(){await this.leave();window.removeEventListener('focus',onFocus);for(const item of editors.values()){item.disposed=true;item.model.stopTimers();item.markdownEditor?.destroy();item.disposeFiles?.();for(const url of item.assetURLs||[])URL.revokeObjectURL(url);}editors.clear();bar.remove();host.remove();},async open(id){await openEditor(id);},persist};
}

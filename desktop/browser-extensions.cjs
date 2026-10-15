const fs=require('node:fs'),path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {BrowserWindow,dialog,nativeImage,app,screen}=require('electron');
const {extensionName}=require('./extension-metadata.cjs');
const {ElectronChromeExtensions}=require('electron-chrome-extensions');
const {downloadExtension}=require('electron-chrome-web-store');
function storeExtensionId(value){
 const raw=String(value||'').trim();if(/^[a-p]{32}$/.test(raw))return raw;
 let url;try{url=new URL(raw);}catch{throw new Error('Paste a Chrome Web Store extension link.');}
 if(url.protocol!=='https:'||url.hostname!=='chromewebstore.google.com'||url.username||url.password||!url.pathname.startsWith('/detail/'))throw new Error('Choose an extension detail page on chromewebstore.google.com.');
 const id=url.pathname.split('/').filter(Boolean).at(-1);if(!/^[a-p]{32}$/.test(id))throw new Error('This store link does not identify an extension.');return id;
}
class BrowserExtensions {
 constructor(browser,home){this.browser=browser;this.home=path.join(home,'browser-extensions');this.profiles=new Map();this.windows=new Set();this.commands=new Map();}
 async initialize(profileId,session){
  if(this.profiles.has(profileId)){if(this.profiles.get(profileId).session!==session)throw new Error('Restart Proteus to use this profile with the current account.');return this.profiles.get(profileId).ready;}
  const folder=path.join(this.home,createHash('sha256').update(session.storagePath).digest('hex'));const file=path.join(folder,'installed.json');let rows=[];try{rows=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(rows)||rows.length>50||rows.some(row=>!row||!/^[a-p]{32}$/.test(row.id)||!/^[a-f0-9-]{36}$/.test(row.directory)||typeof row.enabled!=='boolean'))throw new Error('Invalid extension list');}catch(error){if(error.code!=='ENOENT')throw error;}
  const host={session,folder,file,rows,adapter:null};this.profiles.set(profileId,host);
  host.adapter=new ElectronChromeExtensions({license:'GPL-3.0',session,
   createTab:async details=>{if(String(details.url||'').startsWith('chrome-extension:')){const popup=this.openPage(host,details.url);return [popup.webContents,popup];}const info=await this.browser.create(details.url||'',null,null,{profileId});const tab=this.browser.get(info.id);if(details.active!==false)this.browser.actions.send({type:'select-tab',info});return [tab.view.webContents,this.browser.window];},
   selectTab:wc=>{const tab=[...this.browser.tabs.values()].find(tab=>tab.view?.webContents===wc);if(tab)this.browser.actions.send({type:'select-tab',info:this.browser.state(tab)});},
   removeTab:wc=>{const tab=[...this.browser.tabs.values()].find(tab=>tab.view?.webContents===wc);if(tab)void this.browser.close(tab.id);},
   requestPermissions:async(extension,permissions)=>(await dialog.showMessageBox(this.browser.window,{type:'question',title:extension.name,message:'Allow additional extension permissions?',detail:[...(permissions.permissions||[]),...(permissions.origins||[])].join('\n'),buttons:['Deny','Allow'],defaultId:0,cancelId:0})).response===1
  });
  host.ready=(async()=>{for(const row of rows)if(row.enabled){try{await session.extensions.loadExtension(path.join(folder,row.directory),{allowFileAccess:false});}catch(error){row.error=error.message;}}})();return host.ready;
 }
 save(host){fs.mkdirSync(host.folder,{recursive:true});const tmp=host.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(host.rows),{mode:0o600});fs.renameSync(tmp,host.file);}
 host(id){const host=this.profiles.get(id);if(!host)throw new Error('Open a tab in this browser profile first.');if(this.browser.sessionFor(id)!==host.session)throw new Error('The profile account changed.');return host;}
 agentAllowed(profileId){try{return this.browser.options.profiles?.get(profileId).settings?.allowExtensionAgents===true;}catch{return false;}}
 policyProtected(profileId){return this.profiles.get(profileId)?.rows.some(row=>row.enabled)===true&&!this.agentAllowed(profileId);}
 protected(profileId){const host=this.profiles.get(profileId);return !!host?.installing||host?.rows.some(row=>row.enabled)===true&&!this.agentAllowed(profileId);}
 async protectProfile(profileId){if(this.agentAllowed(profileId))return;for(const tab of this.browser.tabs.values())if(tab.profileId===profileId){tab.shared=false;tab.owner=null;tab.resumeOwner=null;tab.captureRevision=(tab.captureRevision||0)+1;await this.browser.disconnect(tab);}this.browser.changed();}
 list(profileId){const host=this.host(profileId);return host.rows.map(row=>{let icon='';try{const base=path.join(host.folder,row.directory),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8')),relative=Object.values(manifest.icons||{})[0];if(relative){const file=path.resolve(base,relative);if(file.startsWith(base+path.sep)&&fs.statSync(file).size<250000){const image=nativeImage.createFromPath(file);if(!image.isEmpty())icon=image.resize({width:20,height:20}).toDataURL();}}}catch{}return {id:row.id,name:row.name,version:row.version,enabled:row.enabled,store:row.store===true,icon,error:row.error||null};});}
 addTab(profileId,wc){this.profiles.get(profileId)?.adapter.addTab(wc,this.browser.window);}
 selectTab(profileId,wc){this.profiles.get(profileId)?.adapter.selectTab(wc);}
 openPage(host,url,{x,y,options=false}={}){
  const target=new URL(url),extension=host.session.extensions.getExtension(target.hostname);
  if(target.protocol!=='chrome-extension:'||!extension)throw new Error('Choose an installed extension page.');
  const existing=[...this.windows].find(window=>!window.isDestroyed()&&window.extensionURL===target.href);
  if(existing){existing.close();return existing;}
  const parent=this.browser.window.getBounds(),area=screen.getDisplayMatching(parent).workArea;
  const width=Math.min(options?760:420,area.width),height=Math.min(options?650:600,area.height);
  const popup=new BrowserWindow({parent:this.browser.window,title:extension.name+' · '+(options?'Options':'Extension'),
   width,height,x:Math.round(Math.max(area.x,Math.min(area.x+area.width-width,parent.x+(Number.isFinite(x)?x:parent.width-width)))),
   y:Math.round(Math.max(area.y,Math.min(area.y+area.height-height,parent.y+(Number.isFinite(y)?y:90)))),
   show:true,frame:true,closable:true,minimizable:false,maximizable:false,fullscreenable:false,resizable:options,
   webPreferences:{session:host.session,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  popup.extensionURL=target.href;this.windows.add(popup);
  popup.on('closed',()=>{this.windows.delete(popup);if(!this.browser.window.isDestroyed())this.browser.window.focus();});
  popup.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  popup.webContents.on('before-input-event',(event,input)=>{if(input.key==='Escape'){event.preventDefault();popup.close();}});
  popup.webContents.on('will-navigate',(event,next)=>{try{const url=new URL(next);if(url.protocol!==target.protocol||url.hostname!==target.hostname)event.preventDefault();}catch{event.preventDefault();}});
  const load=()=>popup.loadURL(target.href).catch(async()=>{if(popup.isDestroyed())return;const {response}=await dialog.showMessageBox(popup,{type:'error',message:'This extension could not open.',detail:'You can retry or close this window. Your extension and website data are preserved.',buttons:['Close','Retry'],defaultId:0,cancelId:0});if(!popup.isDestroyed()){if(response===1)void load();else popup.close();}});
  void load();return popup;
 }
 async installStore(profileId,host,value){
  const id=storeExtensionId(value.extensionId||value.url),row=host.rows.find(item=>item.id===id);
  if(row&&!row.store)throw new Error('This extension was installed from a folder. Update it from its original folder to retain its identity.');
  if(!row&&host.rows.length>=50)throw new Error('Remove an extension before installing another (50 per profile).');
  fs.mkdirSync(host.folder,{recursive:true});const stage=fs.mkdtempSync(path.join(host.folder,'store-download-'));
  this.browser.actions.send({type:'notice',message:row?'Checking the Chrome Web Store for an update…':'Downloading extension from the Chrome Web Store…'});
  try{
   const downloaded=await downloadExtension(id,stage),manifest=JSON.parse(fs.readFileSync(path.join(downloaded,'manifest.json'),'utf8')),name=extensionName(downloaded,manifest,app.getLocale());
   if(manifest.manifest_version!==3)throw new Error('This extension requires an unsupported manifest version. Choose a Manifest V3 extension.');
   if(row?.version===manifest.version){this.browser.actions.send({type:'notice',message:row.name+' is up to date.'});return;}
   const permissions=[...(manifest.permissions||[]),...(manifest.host_permissions||[])];
   const confirm=await dialog.showMessageBox(this.browser.window,{type:'question',message:(row?'Update ':'Install ')+name+'?',detail:'Version '+manifest.version+' from Chrome Web Store. Review its permissions below. '+(this.agentAllowed(profileId)?'Agent access remains controlled per tab. Extensions may place data into shared pages.':'Agent access to extension pages is disabled for this profile; change it in Browser Preferences.')+'\n\n'+permissions.join('\n')+'\n\nSome Chrome APIs, including native messaging and passkeys, may not be supported.',buttons:['Cancel',row?'Update':'Install'],defaultId:0,cancelId:0});
   if(confirm.response!==1)return;this.host(profileId);
   const directory=row?.directory||randomUUID(),destination=path.join(host.folder,directory),backup=destination+'.rollback-'+randomUUID(),before=row?{...row}:null;
   let installed,backedUp=false;host.installing=true;
   try{
    await this.protectProfile(profileId);
    if(row){host.session.extensions.removeExtension(id);fs.renameSync(destination,backup);backedUp=true;}
    fs.renameSync(downloaded,destination);
    installed=await host.session.extensions.loadExtension(destination,{allowFileAccess:false});
    if(installed.id!==id)throw new Error('Downloaded extension identity does not match the store link.');
    const next={id,name:installed.name,version:installed.version,directory,enabled:row?.enabled??true,store:true,error:null};
    if(row)Object.assign(row,next);else host.rows.push(next);
    if(!next.enabled)host.session.extensions.removeExtension(id);
    this.save(host);if(backedUp)fs.rmSync(backup,{recursive:true,force:true});
    this.browser.actions.send({type:'notice',message:next.name+(row?' updated.':' installed. Open its popup from the extension controls.')});
   }catch(error){
    if(installed)host.session.extensions.removeExtension(installed.id);
    if(backedUp){fs.rmSync(destination,{recursive:true,force:true});fs.renameSync(backup,destination);Object.assign(row,before);if(row.enabled)await host.session.extensions.loadExtension(destination,{allowFileAccess:false}).catch(()=>{});}
    else if(!row){host.rows=host.rows.filter(item=>item.directory!==directory);fs.rmSync(destination,{recursive:true,force:true});}
    throw new Error('Extension '+(row?'update':'installation')+' failed: '+error.message);
   }finally{host.installing=false;this.browser.changed();}
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
 }
 command(value){const key=value.profileId||'default',previous=this.commands.get(key)||Promise.resolve();const task=previous.catch(()=>{}).then(()=>this.perform(value));this.commands.set(key,task);void task.finally(()=>{if(this.commands.get(key)===task)this.commands.delete(key);}).catch(()=>{});return task;}
 async perform(value){const profileId=value.profileId||'default';await this.initialize(profileId,this.browser.sessionFor(profileId));const host=this.host(profileId);
  if(value.action==='extensions-list')return this.list(profileId);
  if(value.action==='extensions-store-browse'){const info=await this.browser.create('https://chromewebstore.google.com/',null,null,{profileId,group:value.group,parentId:value.parentId});this.browser.actions.send({type:'select-tab',info});return this.list(profileId);}
  if(['extensions-store-install','extensions-store-update'].includes(value.action)){await this.installStore(profileId,host,value);return this.list(profileId);}
  if(value.action==='extensions-install'){
   const selected=await dialog.showOpenDialog(this.browser.window,{title:'Install unpacked browser extension',properties:['openDirectory']});if(selected.canceled)return this.list(profileId);const source=selected.filePaths[0],manifestFile=path.join(source,'manifest.json');if(fs.lstatSync(manifestFile).isSymbolicLink()||fs.statSync(manifestFile).size>1024*1024)throw new Error('Extension manifest is invalid.');const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));if(![2,3].includes(manifest.manifest_version)||typeof manifest.name!=='string')throw new Error('Choose a Chrome extension folder.');
   let size=0,count=0;const scan=(folder,depth=0)=>{if(depth>30)throw new Error('Extension folder is too deep.');for(const name of fs.readdirSync(folder)){const file=path.join(folder,name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw new Error('Extension folders cannot contain symbolic links.');if(stat.isDirectory())scan(file,depth+1);else{size+=stat.size;count++;if(size>150*1024*1024||count>15000)throw new Error('Extension folder is too large.');}}};scan(source);
   const confirm=await dialog.showMessageBox(this.browser.window,{type:'question',message:'Install '+extensionName(source,manifest,app.getLocale())+'?',detail:'This extension can access the sites listed in its manifest. Agent access follows this profile’s Browser Preferences and per-tab grants.\n\n'+[...(manifest.permissions||[]),...(manifest.host_permissions||[])].join('\n'),buttons:['Cancel','Install'],defaultId:0,cancelId:0});if(confirm.response!==1)return this.list(profileId);
   this.host(profileId);const directory=randomUUID(),destination=path.join(host.folder,directory);fs.mkdirSync(host.folder,{recursive:true});fs.cpSync(source,destination,{recursive:true});let installed;host.installing=true;await this.protectProfile(profileId);try{installed=await host.session.extensions.loadExtension(destination,{allowFileAccess:false});if(host.rows.some(row=>row.id===installed.id))throw new Error('This extension is already installed. Use Update from folder.');host.rows.push({id:installed.id,name:installed.name,version:installed.version,directory,enabled:true});this.save(host);}catch(error){if(installed){host.session.extensions.removeExtension(installed.id);host.rows=host.rows.filter(row=>row.directory!==directory);}fs.rmSync(destination,{recursive:true,force:true});throw error;}finally{host.installing=false;}
  }else{
   const row=host.rows.find(row=>row.id===value.extensionId);if(!row)throw new Error('Extension is unavailable.');
   if(value.action==='extensions-open'||value.action==='extensions-options'){const extension=host.session.extensions.getExtension(row.id);if(!extension)throw new Error('Enable this extension first.');const manifest=extension.manifest;const page=value.action==='extensions-options'?(manifest.options_ui?.page||manifest.options_page):(manifest.action?.default_popup||manifest.browser_action?.default_popup);if(!page)throw new Error('This extension has no '+(value.action==='extensions-options'?'options page':'popup')+'.');this.openPage(host,new URL(page,'chrome-extension://'+row.id+'/').href,{x:value.x,y:value.y,options:value.action==='extensions-options'});}
   else if(value.action==='extensions-enable'){if(typeof value.enabled!=='boolean')throw new Error('Choose extension state.');const previous=row.enabled;host.installing=value.enabled;try{if(value.enabled){await this.protectProfile(profileId);await host.session.extensions.loadExtension(path.join(host.folder,row.directory),{allowFileAccess:false});}else host.session.extensions.removeExtension(row.id);row.enabled=value.enabled;this.save(host);}catch(error){row.enabled=previous;if(previous)await host.session.extensions.loadExtension(path.join(host.folder,row.directory),{allowFileAccess:false}).catch(()=>{});else host.session.extensions.removeExtension(row.id);throw error;}finally{host.installing=false;}}
   else if(value.action==='extensions-remove'){const before=host.rows;host.rows=host.rows.filter(item=>item!==row);try{this.save(host);}catch(error){host.rows=before;throw error;}host.session.extensions.removeExtension(row.id);}
   else if(value.action==='extensions-update'){
    const selected=await dialog.showOpenDialog(this.browser.window,{title:'Update '+row.name+' from an unpacked extension folder',properties:['openDirectory']});if(selected.canceled)return this.list(profileId);
    const source=selected.filePaths[0],manifestFile=path.join(source,'manifest.json');if(fs.lstatSync(manifestFile).isSymbolicLink()||fs.statSync(manifestFile).size>1024*1024)throw new Error('Invalid extension manifest.');const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));if(![2,3].includes(manifest.manifest_version)||typeof manifest.name!=='string')throw new Error('Choose a Chrome extension folder.');
    let size=0,count=0;const scan=(folder,depth=0)=>{if(depth>30)throw new Error('Extension folder is too deep.');for(const name of fs.readdirSync(folder)){const file=path.join(folder,name),stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isDirectory()&&!stat.isFile())throw new Error('Extension contains unsupported files.');if(stat.isDirectory())scan(file,depth+1);else{size+=stat.size;if(size>150*1024*1024||++count>15000)throw new Error('Extension is too large.');}}};scan(source);
    const confirm=await dialog.showMessageBox(this.browser.window,{type:'question',message:'Update '+row.name+' to '+manifest.version+'?',detail:'Review this version’s permissions. Website and vault data stay in the same profile.\n\n'+[...(manifest.permissions||[]),...(manifest.host_permissions||[])].join('\n'),buttons:['Cancel','Update'],defaultId:0,cancelId:0});if(confirm.response!==1)return this.list(profileId);this.host(profileId);
    const destination=path.join(host.folder,row.directory),staged=path.join(host.folder,randomUUID()),backup=destination+'.rollback-'+randomUUID(),before={...row};fs.cpSync(source,staged,{recursive:true});host.installing=true;
    try{await this.protectProfile(profileId);host.session.extensions.removeExtension(row.id);fs.renameSync(destination,backup);fs.renameSync(staged,destination);const updated=await host.session.extensions.loadExtension(destination,{allowFileAccess:false});if(updated.id!==row.id){host.session.extensions.removeExtension(updated.id);throw new Error('The update has a different extension identity.');}Object.assign(row,{name:updated.name,version:updated.version,error:null});if(!row.enabled)host.session.extensions.removeExtension(row.id);this.save(host);fs.rmSync(backup,{recursive:true,force:true});}
    catch(error){host.session.extensions.removeExtension(row.id);if(fs.existsSync(backup)){fs.rmSync(destination,{recursive:true,force:true});fs.renameSync(backup,destination);}Object.assign(row,before);if(row.enabled)await host.session.extensions.loadExtension(destination,{allowFileAccess:false}).catch(()=>{});throw error;}
    finally{host.installing=false;fs.rmSync(staged,{recursive:true,force:true});}
   }
   else if(value.action==='extensions-reload'){if(!row.enabled)throw new Error('Enable this extension first.');host.session.extensions.removeExtension(row.id);await host.session.extensions.loadExtension(path.join(host.folder,row.directory),{allowFileAccess:false});}
   else throw new Error('Unsupported extension action.');
  }
  for(const tab of this.browser.tabs.values())if(tab.profileId===profileId&&this.protected(profileId)){tab.shared=false;tab.owner=null;tab.resumeOwner=null;await this.browser.disconnect(tab);tab.captureRevision=(tab.captureRevision||0)+1;}
  this.browser.changed();return this.list(profileId);
 }
 close(){for(const window of this.windows)window.close();this.windows.clear();}
}
module.exports={BrowserExtensions,storeExtensionId};

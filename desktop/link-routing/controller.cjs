const {LinkRoutingStore}=require('./store.cjs');
const {BrowserRegistration}=require('./registration.cjs');
const {LinkPicker}=require('./picker.cjs');
const {routeRule,targetKey,selectWindow}=require('./rules.cjs');
const {webURL}=require('../services/external-urls.cjs');
const {openSafariSelector}=require('./preferred-browser.cjs');
const {frontmostApplication}=require('./source-app.cjs');
class LinkRouter{
  constructor({service,windows,browser,createWindow,app,preview=false}){
    Object.assign(this,{service,windows,browser,createWindow,app});this.store=new LinkRoutingStore(service.home);this.sources=new Map();this.registration=new BrowserRegistration(app,{preview});this.picker=new LinkPicker();
  }
  async catalog(){
    const targets=[],warnings=[];
    const append=(catalog,hostId,hostName)=>{
      for(const workspace of catalog?.workspaces||[])for(const project of catalog.projects||[]){
        if(project.workspaceId!==workspace.id)continue;
        const target={hostId,hostName,workspaceId:workspace.id,workspaceName:workspace.name,projectId:project.id,projectName:project.name};target.key=targetKey(target);targets.push(target);
      }
    };
    append((this.service.workspaceProjects||this.service.desktopPreview).get(this.service.engine),'local','This computer');
    const peers=this.service.peers?.list()||[];
    await Promise.all(peers.filter(peer=>peer.status==='online'&&!peer.paused).map(async peer=>{try{append(await this.service.peers.request(peer.hostId,'projects.get',{}, {timeoutMs:3000}),peer.hostId,peer.label);}catch{warnings.push(peer.label+' projects are unavailable.');}}));
    targets.sort((a,b)=>(a.workspaceName+'\0'+a.hostName+'\0'+a.workspaceId+'\0'+a.projectName).localeCompare(b.workspaceName+'\0'+b.hostName+'\0'+b.workspaceId+'\0'+b.projectName));
    return {targets,warnings};
  }
  async preferences(value={action:'get'}){
    if(value.action==='save')this.store.save(value.rules,value.expectedRevision);
    else if(value.action==='save-defaults')this.store.saveDefaults(value.defaults,value.expectedRevision);
    else if(['register','make-default'].includes(value.action))await this.registration.act(value.action);
    else if(value.action!=='get')throw Error('Choose a link-routing preference action.');
    return {configuration:this.store.read(),registration:this.registration.status(),...await this.catalog()};
  }
  /** Capture the sending app as soon as a link arrives; routing may run later. */
  noteIncoming(address){
    const url=webURL(address);if(!url)return;
    const capture=frontmostApplication({icon:file=>this.app?.getFileIcon?.(file,{size:'large'})}).catch(()=>null);
    this.sources.set(url,capture);while(this.sources.size>16)this.sources.delete(this.sources.keys().next().value);
  }
  async source(url){const pending=this.sources.get(url);this.sources.delete(url);if(!pending)return null;return Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve(null),600))]);}
  async route(address){
    const url=webURL(address);if(!url)throw Error('Choose an HTTP or HTTPS website without URL credentials.');
    let configuration,warning='';try{configuration=this.store.read();}catch(error){configuration={rules:[]};warning=error.message;}
    const {targets,warnings}=await this.catalog(),matched=routeRule(configuration.rules,url,targets);
    const defaults=configuration.defaults||{mode:'none',autoSelectSeconds:0},preferred=defaults.mode==='fixed'?defaults.destination:defaults.mode==='last'?this.store.last():null;
    const defaultTarget=preferred?targets.find(target=>target.key===targetKey(preferred))||null:null,source=await this.source(url);
    let choice=matched.target?{target:matched.target}:await this.picker.choose({url,targets,source,defaultKey:defaultTarget?.key||null,autoSelectSeconds:defaultTarget?defaults.autoSelectSeconds:0,safariSelector:process.platform==='darwin',warning:[warning,matched.unavailable?'The matching rule’s project is unavailable. Choose another project.':'',...warnings].filter(Boolean).join(' '),colors:this.service.settings.get().appearance?.palette?.colors});
    if(!choice)return {cancelled:true};
    if(choice.external==='safariselector')return openSafariSelector(url);
    // Clicking away is not a decision to drop the link: an untouched picker opens the
    // default destination; otherwise the link opens as an ordinary tab.
    if(choice.dismissed){if(defaultTarget&&!choice.touched)choice={target:defaultTarget,automatic:true};else return this.openUnplaced(url);}
    if(!choice.automatic&&!matched.target)this.store.recordLast(choice.target);
    // Catalogs can change while the picker is open. Match stable IDs again.
    const fresh=(await this.catalog()).targets.find(target=>target.key===choice.target.key);
    if(!fresh)throw Error('The chosen project changed or disconnected. Open the link again to choose a current destination.');
    let ctx=choice.newWindow?null:selectWindow(this.windows.contexts.values(),fresh);
    if(!ctx){const window=await this.createWindow();ctx=[...this.windows.contexts.values()].find(ctx=>ctx.window===window);}
    const deadline=Date.now()+20000;
    while(!ctx.externalURLReady){if(ctx.closing||ctx.window.isDestroyed()||Date.now()>deadline)throw Error('The destination window did not finish restoring. Open the link again after it is ready.');await new Promise(resolve=>setTimeout(resolve,50));}
    return this.windows.run(ctx.id,async()=>{
      const destination={type:'project',id:fresh.projectId,workspaceId:fresh.workspaceId,...(fresh.hostId!=='local'?{hostId:fresh.hostId}:{})};
      const info=await this.browser.create(url,null,null,{profileId:'default',explicitParent:true,parentId:`project:${fresh.hostId}:${fresh.projectId}`,workspaceName:fresh.workspaceName,destination});
      ctx.window.webContents.send('proteus:browser-action',{type:'select-tab',info:{...info,externalProject:fresh}});
      if(ctx.window.isMinimized())ctx.window.restore();ctx.window.show();ctx.window.focus();return {opened:true,tabId:info.id,windowId:ctx.id,target:fresh};
    });
  }
  async openUnplaced(url){
    let ctx=[...this.windows.contexts.values()].find(ctx=>!ctx.closing&&!ctx.window.isDestroyed()&&ctx.window.isFocused?.())||this.windows.contexts.get('main')||[...this.windows.contexts.values()][0];
    if(!ctx){const window=await this.createWindow();ctx=[...this.windows.contexts.values()].find(ctx=>ctx.window===window);}
    return this.windows.run(ctx.id,async()=>{const info=await this.browser.create(url,null,null,{profileId:'default',explicitParent:true});ctx.window.webContents.send('proteus:browser-action',{type:'select-tab',info});if(ctx.window.isMinimized())ctx.window.restore();ctx.window.show();ctx.window.focus();return {opened:true,tabId:info.id,windowId:ctx.id};});
  }
  close(){this.picker.close();}
}
module.exports={LinkRouter};

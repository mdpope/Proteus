const {LinkRoutingStore}=require('./store.cjs');
const {BrowserRegistration}=require('./registration.cjs');
const {LinkPicker}=require('./picker.cjs');
const {routeRule,targetKey,selectWindow}=require('./rules.cjs');
const {webURL}=require('../services/external-urls.cjs');
const {openSafariSelector}=require('./preferred-browser.cjs');
class LinkRouter{
  constructor({service,windows,browser,createWindow,app,preview=false}){
    Object.assign(this,{service,windows,browser,createWindow});this.store=new LinkRoutingStore(service.home);this.registration=new BrowserRegistration(app,{preview});this.picker=new LinkPicker();
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
    else if(['register','make-default'].includes(value.action))await this.registration.act(value.action);
    else if(value.action!=='get')throw Error('Choose a link-routing preference action.');
    return {configuration:this.store.read(),registration:this.registration.status(),...await this.catalog()};
  }
  async route(address){
    const url=webURL(address);if(!url)throw Error('Choose an HTTP or HTTPS website without URL credentials.');
    let configuration,warning='';try{configuration=this.store.read();}catch(error){configuration={rules:[]};warning=error.message;}
    const {targets,warnings}=await this.catalog(),matched=routeRule(configuration.rules,url,targets);
    let choice=matched.target?{target:matched.target}:await this.picker.choose({url,targets,safariSelector:process.platform==='darwin',warning:[warning,matched.unavailable?'The matching rule’s project is unavailable. Choose another project.':'',...warnings].filter(Boolean).join(' '),colors:this.service.settings.get().appearance?.palette?.colors});
    if(!choice)return {cancelled:true};
    if(choice.external==='safariselector')return openSafariSelector(url);
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
  close(){this.picker.close();}
}
module.exports={LinkRouter};

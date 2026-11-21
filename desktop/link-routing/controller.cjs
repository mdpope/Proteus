const {LinkRoutingStore}=require('./store.cjs');
const {BrowserRegistration}=require('./registration.cjs');
const {LinkPicker}=require('./picker.cjs');
const {routeRule,targetKey,selectWindow}=require('./rules.cjs');
const {webURL}=require('../services/external-urls.cjs');
const {openSafariSelector}=require('./preferred-browser.cjs');
const {frontmostApplication}=require('./source-app.cjs');
const {nativeImage}=require('electron');
class LinkRouter{
  constructor({service,windows,browser,createWindow,app,preview=false}){
    Object.assign(this,{service,windows,browser,createWindow,app,preview});this.store=new LinkRoutingStore(service.home);this.sources=new Map();this.registration=new BrowserRegistration(app,{preview});this.picker=new LinkPicker();
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
    for(const [feature,name] of [['team','Team Tools'],['reminders','Reminders'],['scratchpad','Scratchpad']]){
      const target={hostId:'local',hostName:'This computer',feature,workspaceName:'Features',projectName:name};target.key=targetKey(target);targets.push(target);
    }
    const peers=this.service.peers?.list()||[];
    await Promise.all(peers.filter(peer=>peer.status==='online'&&!peer.paused).map(async peer=>{try{append(await this.service.peers.request(peer.hostId,'projects.get',{}, {timeoutMs:3000}),peer.hostId,peer.label);}catch{warnings.push(peer.label+' projects are unavailable.');}}));
    const hostRank=new Map([['local',0],...peers.map((peer,index)=>[peer.hostId,index+1])]);
    targets.sort((a,b)=>hostRank.get(a.hostId)-hostRank.get(b.hostId)||Number(!!a.feature)-Number(!!b.feature)||
      (a.workspaceName+'\0'+(a.workspaceId||'')+'\0'+a.projectName).localeCompare(b.workspaceName+'\0'+(b.workspaceId||'')+'\0'+b.projectName));
    return {targets,warnings};
  }
  async preferences(value={action:'get'}){
    if(value.action==='preview'&&this.preview){
      const {targets}=await this.catalog(),target=targets.find(row=>row.hostId==='local'&&!row.feature);
      const settings=this.service.settings.get();
      if(this.service.designDemo&&!targets.some(row=>row.hostId!=='local')){
        const {demoComputerDestinations,orderedComputers}=await import('../../public/services/remote/computer-order.js');
        for(const row of orderedComputers(demoComputerDestinations,settings.preferences?.computerOrder)){
          const sample={...row,hostName:row.label,workspaceId:'sample-workspace',projectId:'sample-project'};
          targets.push({...sample,key:targetKey(sample)});
        }
      }
      const url='https://example.com/design-review';
      const siteIcon=nativeImage.createFromBitmap(Buffer.from([114,179,122,255]),{width:1,height:1}).resize({width:16,height:16}).toDataURL();
      await this.picker.choose({url,targets,siteIcon,defaultKey:target?.key,autoSelectSeconds:15,safariSelector:process.platform==='darwin',
        warning:'Demo link. Choosing a destination here does not open it.',colors:settings.appearance?.palette?.colors});
      return {preview:true};
    }
    if(value.action==='save')this.store.save(value.rules,value.expectedRevision);
    else if(value.action==='save-defaults')this.store.saveDefaults(value.defaults,value.expectedRevision);
    else if(['register','make-default'].includes(value.action))await this.registration.act(value.action);
    else if(value.action!=='get')throw Error('Choose a link-routing preference action.');
    return {configuration:this.store.read(),registration:{...this.registration.status(),preview:this.preview},...await this.catalog()};
  }
  /** Capture the sending app as soon as a link arrives; routing may run later. */
  noteIncoming(address){
    const url=webURL(address);if(!url)return;
    const capture=frontmostApplication({icon:file=>nativeImage.createFromPath(file)}).catch(()=>null);
    this.sources.set(url,capture);while(this.sources.size>16)this.sources.delete(this.sources.keys().next().value);
  }
  async source(url){const pending=this.sources.get(url);this.sources.delete(url);if(!pending)return null;return Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve(null),600))]);}
  async route(address){
    const url=webURL(address);if(!url)throw Error('Choose an HTTP or HTTPS website without URL credentials.');
    let configuration,warning='';try{configuration=this.store.read();}catch(error){configuration={rules:[]};warning=error.message;}
    const {targets,warnings}=await this.catalog(),matched=routeRule(configuration.rules,url,targets);
    const defaults=configuration.defaults||{mode:'none',autoSelectSeconds:0},preferred=defaults.mode==='fixed'?defaults.destination:defaults.mode==='last'?this.store.last():null;
    const defaultTarget=preferred?targets.find(target=>target.key===targetKey(preferred))||null:null,source=await this.source(url);
    let siteIcon;try{siteIcon=this.browser.savedIcons({urls:[url]}).icons[url];}catch{}
    let choice=matched.target?{target:matched.target}:await this.picker.choose({url,targets,siteIcon,source,defaultKey:defaultTarget?.key||null,autoSelectSeconds:defaultTarget?defaults.autoSelectSeconds:0,safariSelector:process.platform==='darwin',warning:[warning,matched.unavailable?'The matching rule’s project is unavailable. Choose another project.':'',...warnings].filter(Boolean).join(' '),colors:this.service.settings.get().appearance?.palette?.colors});
    if(!choice)return {cancelled:true};
    if(choice.external==='safariselector')return openSafariSelector(url);
    // Focus loss is never permission to choose an arbitrary window. The picker
    // stays open without a default; a configured untouched default is explicit.
    if(choice.dismissed){if(defaultTarget&&!choice.touched)choice={target:defaultTarget,automatic:true};else return {cancelled:true};}
    if(!choice.automatic&&!matched.target)this.store.recordLast(choice.target);
    // Catalogs can change while the picker is open. Match stable IDs again.
    const fresh=(await this.catalog()).targets.find(target=>target.key===choice.target.key);
    if(!fresh)throw Error('The chosen project changed or disconnected. Open the link again to choose a current destination.');
    let ctx=choice.newWindow?null:selectWindow(this.windows.contexts.values(),fresh);
    if(!ctx){const window=await this.createWindow();ctx=[...this.windows.contexts.values()].find(ctx=>ctx.window===window);}
    const deadline=Date.now()+20000;
    while(!ctx.externalURLReady){if(ctx.closing||ctx.window.isDestroyed()||Date.now()>deadline)throw Error('The destination window did not finish restoring. Open the link again after it is ready.');await new Promise(resolve=>setTimeout(resolve,50));}
    return this.windows.run(ctx.id,async()=>{
      if(fresh.feature){
        // Feature membership is renderer-owned and window-local, not a project or a new grant.
        const info=await this.browser.create(url,null,null,{profileId:'default',explicitParent:true,...(fresh.feature==='team'?{group:'team'}:{})});
        ctx.window.webContents.send('proteus:browser-action',{type:'select-tab',info:{...info,externalFeature:fresh.feature}});
        if(ctx.window.isMinimized())ctx.window.restore();ctx.window.show();ctx.window.focus();return {opened:true,tabId:info.id,windowId:ctx.id,target:fresh};
      }
      const destination={type:'project',id:fresh.projectId,workspaceId:fresh.workspaceId,...(fresh.hostId!=='local'?{hostId:fresh.hostId}:{})};
      const info=await this.browser.create(url,null,null,{profileId:'default',explicitParent:true,parentId:`project:${fresh.hostId}:${fresh.projectId}`,workspaceName:fresh.workspaceName,destination});
      ctx.window.webContents.send('proteus:browser-action',{type:'select-tab',info:{...info,externalProject:fresh}});
      if(ctx.window.isMinimized())ctx.window.restore();ctx.window.show();ctx.window.focus();return {opened:true,tabId:info.id,windowId:ctx.id,target:fresh};
    });
  }
  close(){this.picker.close();}
}
module.exports={LinkRouter};

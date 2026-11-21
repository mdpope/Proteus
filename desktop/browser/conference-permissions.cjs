const {desktopCapturer,dialog,Notification,shell,systemPreferences,webContents}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const {websiteOrigin}=require('./network-permissions.cjs');
const {chooseScreenSource}=require('./screen-source-picker.cjs');

const devices={audio:'microphone',video:'camera'};
const mediaDevices=Object.values(devices);
const labels={microphone:'Microphone',camera:'Camera',screen:'Screen sharing'};
const panes={microphone:'Privacy_Microphone',camera:'Privacy_Camera',screen:'Privacy_ScreenCapture',notifications:'Notifications'};
const traceEnabled=process.env.PROTEUS_DESIGN_DEMO==='1'&&process.env.PROTEUS_CONFERENCE_TRACE==='1';
const traceFile=process.env.PROTEUS_CONFERENCE_TRACE_FILE;
function secureSite(value){
  const origin=websiteOrigin(value);
  return origin&&(origin.startsWith('https:')||/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin))?origin:null;
}

// Grants are local to this Mac/PC and exact browser partition. A website never
// receives a desktop source until the operator chooses it for that request.
class ConferencePermissions {
  constructor(browser,platform=process.platform){
    this.browser=browser;this.platform=platform;this.pending=new Set();this.mediaRequests=new Map();this.systemRequest=Promise.resolve();
    this.file=browser.options.home&&path.join(browser.options.home,'browser-conference-permissions.json');
    this.rules=[];
    try{
      if(this.file&&fs.statSync(this.file).size<=512000){
        const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));
        if(saved.version===1&&Array.isArray(saved.rules)&&saved.rules.length<=1000)
          this.rules=saved.rules.filter(row=>typeof row?.partition==='string'&&secureSite(row.origin)===row.origin&&row.origin&&
            ['microphone','camera'].includes(row.kind)&&['allow','block'].includes(row.permission));
      }
    }catch{}
  }
  partition(profileId){
    this.browser.profile(profileId);
    if(this.browser.incognito.has(profileId))throw Error('Choose an ordinary browser profile.');
    return this.browser.partitionName(profileId);
  }
  origin(value){
    const origin=secureSite(value);
    return origin&&origin!==this.browser.appOrigin?origin:null;
  }
  trace(wc,event,detail={}){
    if(!traceEnabled||!wc||wc.isDestroyed()||(this.traceCount||0)>=160)return;
    const origin=this.origin(wc.getURL());
    if(!origin||!/(^|\.)zoom\.us$/i.test(new URL(origin).hostname))return;
    this.traceCount=(this.traceCount||0)+1;
    if(traceFile){
      const line=JSON.stringify({at:new Date().toISOString(),origin,event,...detail});
      try{fs.appendFileSync(traceFile,line+'\n',{mode:0o600});}catch{/* Diagnostics must not change permission results. */}
    }
  }
  rule(profileId,kind,origin){
    try{return this.rules.find(row=>row.partition===this.partition(profileId)&&row.kind===kind&&row.origin===origin)?.permission||'ask';}
    catch{return 'block';}
  }
  save(profileId,origin,changes){
    const partition=this.partition(profileId);
    if(!this.origin(origin)||!changes.length||changes.some(([kind,permission])=>!['microphone','camera'].includes(kind)||!['ask','allow','block'].includes(permission)))throw Error('Choose an exact secure website and permission.');
    const rules=this.rules.filter(row=>row.partition!==partition||row.origin!==origin||!changes.some(([kind])=>kind===row.kind));
    for(const [kind,permission] of changes)if(permission!=='ask')rules.push({partition,origin,kind,permission});
    if(rules.length>1000)throw Error('Remove an existing website permission before adding another.');
    if(this.file){
      fs.mkdirSync(path.dirname(this.file),{recursive:true});
      fs.writeFileSync(this.file+'.tmp',JSON.stringify({version:1,rules}),{mode:0o600});
      atomicRename(this.file+'.tmp',this.file);
    }
    this.rules=rules;
    for(const tab of this.browser.tabs.values()){
      const wc=tab.view?.webContents;
      if(tab.profileId===profileId&&wc&&!wc.isDestroyed()&&this.origin(wc.getURL())===origin){
        try{wc.send('proteus:media-permission-changed');}catch{}
      }
    }
  }
  system(kind){
    return this.platform==='darwin'?systemPreferences.getMediaAccessStatus(kind):'system-managed';
  }
  authorize(kind){
    const request=this.systemRequest.then(async()=>{
      if(this.platform!=='darwin')return this.system(kind);
      if(kind==='screen'){
        if(!['granted','restricted'].includes(this.system(kind)))await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:0,height:0}}).catch(()=>{});
      }else if(this.system(kind)==='not-determined'){
        await systemPreferences.askForMediaAccess(kind);
      }
      return this.system(kind);
    });
    this.systemRequest=request.catch(()=>{});
    return request;
  }
  site(wc,profileId,value){
    if(!wc||wc.isDestroyed()||this.browser.shuttingDown)return null;
    const origin=this.origin(value);
    if(!origin||origin!==this.origin(wc.getURL()))return null;
    const tab=[...this.browser.tabs.values()].find(item=>item.view?.webContents===wc&&item.profileId===profileId);
    if(!tab||tab.incognito||!this.browser.profileAvailable(tab))return null;
    return {tab,origin};
  }
  privateTab(tab){return !tab.agentActions&&this.browser.agentStatus(tab).agentPaused;}
  active(tab,checkFocus=false){
    return this.browser.withTabWindow(tab,()=>this.browser.active===tab.id&&(!checkFocus||this.browser.window.isFocused()));
  }
  canCapture(site){
    if(!site||!this.active(site.tab,true))return false;
    if(this.privateTab(site.tab))return true;
    const tab=site.tab,now=Date.now();
    if(!tab.captureNoticeAt||now-tab.captureNoticeAt>2500){
      tab.captureNoticeAt=now;
      this.browser.actions.send({type:'notice',id:tab.id,message:'Stop sharing this tab with agents using the robot button, then retry microphone, camera or screen sharing.'});
    }
    return false;
  }
  check(wc,profileId,permission,origin,details){
    const site=this.site(wc,profileId,details?.securityOrigin||details?.requestingUrl||origin);
    if(!site)return false;
    if(!this.privateTab(site.tab))return false;
    if(permission==='display-capture'||permission==='speaker-selection')return this.active(site.tab);
    const kind=devices[details?.mediaType];
    const granted=value=>this.rule(profileId,value,site.origin)==='allow'&&['granted','system-managed'].includes(this.system(value));
    return kind?granted(kind):Object.values(devices).some(granted);
  }
  request(wc,profileId,details){
    const requester=this.origin(details?.securityOrigin||details?.requestingUrl);
    const site=this.site(wc,profileId,requester);
    const requested=details?.mediaTypes;
    // Electron discards the device descriptor on Chromium's embedded
    // permission path. An empty typed capture request is a separate case.
    const embedded=requested===undefined&&details?.securityOrigin===undefined&&typeof details?.isMainFrame==='boolean';
    this.trace(wc,'Chromium requested devices',{
      sameOrigin:!!site,mainFrame:details?.isMainFrame===true,
      audio:Array.isArray(requested)&&requested.includes('audio'),video:Array.isArray(requested)&&requested.includes('video'),
      embedded,
      active:!!site&&this.active(site.tab),focused:!!site&&this.active(site.tab,true),
      private:!!site&&this.privateTab(site.tab),
    });
    if(!embedded&&(!Array.isArray(requested)||!requested.length||requested.some(type=>!Object.hasOwn(devices,type))))return Promise.resolve(false);
    const kinds=embedded?null:[...new Set(requested.map(type=>devices[type]))].sort();
    const id=site?.tab.id;
    let queue=this.mediaRequests.get(id);
    // An in-flight sheet can have focus while the same page requests a second
    // device. Keep that request attached to its original tab and document.
    if(!site||!(queue?this.active(site.tab)&&this.privateTab(site.tab):this.canCapture(site)))return Promise.resolve(false);
    if(!queue){queue=new Map();this.mediaRequests.set(id,queue);}
    const startURL=wc.getURL(),frame=wc.mainFrame;
    const key=JSON.stringify([startURL,frame.frameTreeNodeId,site.tab.certificateRevision,kinds]);
    if(queue.has(key))return queue.get(key);
    if(queue.size>=3)return Promise.resolve(false);
    const previous=[...queue.values()].at(-1)||Promise.resolve();
    let navigated=false;
    const invalidate=details=>{if(details.isMainFrame&&!details.isSameDocument)navigated=true;};
    wc.on('did-start-navigation',invalidate);
    const current=()=>!navigated&&this.site(wc,profileId,site.origin)?.tab===site.tab&&wc.mainFrame===frame&&wc.getURL()===startURL&&this.privateTab(site.tab)&&this.active(site.tab);
    const task=previous.catch(()=>{}).then(()=>embedded?this.authorizeEmbeddedSite(site,profileId,current):this.authorizeSite(site,profileId,kinds,current)).finally(()=>{
      wc.removeListener('did-start-navigation',invalidate);queue.delete(key);
      if(!queue.size)this.mediaRequests.delete(id);
    });
    queue.set(key,task);
    return task;
  }
  async authorizeEmbeddedSite(site,profileId,current){
    if(!current())return false;
    const pending=mediaDevices.filter(kind=>this.rule(profileId,kind,site.origin)==='ask');
    if(!pending.length&&mediaDevices.every(kind=>this.rule(profileId,kind,site.origin)==='allow'))
      return this.authorizeDevices(site,profileId,mediaDevices,current);
    const now=Date.now();
    if(!pending.length||!this.active(site.tab,true)||now-(site.tab.embeddedMediaPromptAt||0)<5000)return false;
    site.tab.embeddedMediaPromptAt=now;
    const choices=pending.map(kind=>({label:'Allow '+kind,kinds:[kind]}));
    if(pending.length===2)choices.push({label:'Allow microphone and camera',kinds:pending});
    const window=this.browser.withTabWindow(site.tab,()=>this.browser.window);
    this.trace(site.tab.view?.webContents,'Opening embedded media prompt');
    const {response}=await dialog.showMessageBox(window,{
      type:'question',message:'Allow media access for '+site.origin+'?',
      detail:'The embedded website control did not identify the device. Choose which device this site can use in this browser profile.',
      buttons:['Cancel',...choices.map(choice=>choice.label)],defaultId:0,cancelId:0,noLink:true,
    });
    const selected=choices[response-1]?.kinds;
    if(!selected||!current()||selected.some(kind=>this.rule(profileId,kind,site.origin)!=='ask'))return false;
    this.save(profileId,site.origin,selected.map(kind=>[kind,'allow']));
    if(mediaDevices.every(kind=>this.rule(profileId,kind,site.origin)==='allow'))
      return this.authorizeDevices(site,profileId,mediaDevices,current);
    // The untyped callback could be for either device. A narrower grant takes
    // effect through Chromium's typed check/capture on the next page load.
    if(await this.authorizeDevices(site,profileId,selected,current))
      this.browser.actions.send({type:'notice',id:site.tab.id,message:labels[selected[0]]+' allowed for '+site.origin+'. Reload the site to use the saved permission.'});
    return false;
  }
  async authorizeSite(site,profileId,kinds,current){
    if(!current()||kinds.some(kind=>this.rule(profileId,kind,site.origin)==='block'))return false;
    const ask=kinds.filter(kind=>this.rule(profileId,kind,site.origin)==='ask');
    if(ask.length){
      if(!this.active(site.tab,true))return false;
      const window=this.browser.withTabWindow(site.tab,()=>this.browser.window);
      this.trace(site.tab.view?.webContents,'Opening website prompt',{devices:ask});
      const {response}=await dialog.showMessageBox(window,{type:'question',message:'Allow '+site.origin+' to use your '+ask.join(' and ')+'?',
        detail:'This permission applies to this browser profile on this computer.',buttons:['Cancel','Allow','Block'],defaultId:0,cancelId:0,noLink:true});
      if(!current()||response===0)return false;
      this.save(profileId,site.origin,ask.map(kind=>[kind,response===1?'allow':'block']));
      if(response!==1)return false;
    }
    return this.authorizeDevices(site,profileId,kinds,current);
  }
  async authorizeDevices(site,profileId,kinds,current){
    let authorized=true;
    for(const kind of kinds){
      if(!current()||this.rule(profileId,kind,site.origin)!=='allow')return false;
      const status=await this.authorize(kind);
      if(!['granted','system-managed'].includes(status)){
        authorized=false;
        this.browser.actions.send({type:'notice',id:site.tab.id,message:labels[kind]+' access also needs system authorization. Open Browser Preferences → Site Permissions to review it.'});
      }
    }
    return authorized&&current()&&kinds.every(kind=>this.rule(profileId,kind,site.origin)==='allow');
  }
  async approveCapture(wc,profileId,details){
    const site=this.site(wc,profileId,details?.securityOrigin||details?.requestingUrl);
    this.trace(wc,'Chromium requested screen sharing',{sameOrigin:!!site,focused:!!site&&this.active(site.tab,true)});
    if(!this.canCapture(site))return false;
    const url=wc.getURL(),key=site.tab.id+':capture-consent';
    if(this.pending.has(key)||this.pending.has(site.tab.id+':screen'))return false;
    this.pending.add(key);
    try{
      const window=this.browser.withTabWindow(site.tab,()=>this.browser.window);
      const {response}=await dialog.showMessageBox(window,{type:'warning',message:'Allow a screen-sharing request from '+site.origin+'?',
        detail:'This approval is for one request. If this website uses legacy sharing, it may begin capturing the full display and computer audio immediately. If a picker appears, choose the screen or window you want to share.',
        buttons:['Cancel','Continue to share'],defaultId:0,cancelId:0,noLink:true});
      return response===1&&this.site(wc,profileId,site.origin)?.tab===site.tab&&wc.getURL()===url&&this.privateTab(site.tab)&&this.active(site.tab);
    }finally{this.pending.delete(key);}
  }
  async display(profileId,request){
    const frame=request.frame,wc=frame&&webContents.fromFrame(frame);
    const site=this.site(wc,profileId,request.securityOrigin);
    this.trace(wc,'Browser screen picker requested',{sameOrigin:!!site,focused:!!site&&this.active(site.tab,true),userGesture:request.userGesture===true});
    if(!request.userGesture||!request.videoRequested||!this.canCapture(site))return null;
    const window=this.browser.withTabWindow(site.tab,()=>this.browser.window),key=site.tab.id+':screen';
    if(this.pending.has(key))return null;
    this.pending.add(key);
    const startURL=frame.url,topURL=wc.getURL();
    const current=()=>!frame.detached&&frame.url===startURL&&this.site(wc,profileId,request.securityOrigin)?.tab===site.tab&&wc.getURL()===topURL&&this.privateTab(site.tab)&&this.active(site.tab);
    try{
      const sources=await desktopCapturer.getSources({types:['window','screen'],thumbnailSize:{width:288,height:324}}).catch(()=>[]);
      if(!current())return null;
      this.trace(wc,'Screen sources enumerated',{count:sources.length,system:this.system('screen')});
      if(!sources.length||['denied','restricted'].includes(this.system('screen'))){
        const {response}=await dialog.showMessageBox(window,{type:'info',message:'Screen sharing is unavailable',detail:this.platform==='darwin'?'Allow Proteus in System Settings → Screen & System Audio Recording, then retry sharing.':'No shareable displays or windows are available.',buttons:this.platform==='darwin'?['Cancel','Open Settings']:['OK'],defaultId:0,cancelId:0});
        if(response===1)await this.openSettings('screen');
        return null;
      }
      // Only the local picker receives names and thumbnails. The requesting
      // website receives the selected stream after the tab is revalidated.
      const selected=await chooseScreenSource(window,site.origin,sources,this.browser.options.errorPalette?.());
      this.trace(wc,selected?'Screen source selected':'Screen picker cancelled');
      return current()&&selected?{video:selected}:null;
    }finally{this.pending.delete(key);}
  }
  async openSettings(kind){
    if(this.platform!=='darwin'||!Object.hasOwn(panes,kind))throw Error('Open this permission in your system settings.');
    const url=kind==='notifications'?'x-apple.systempreferences:com.apple.Notifications-Settings.extension':'x-apple.systempreferences:com.apple.preference.security?'+panes[kind];
    await shell.openExternal(url);
  }
  async command(value){
    if(value.action==='conference-system-status')return {platform:this.platform,status:Object.fromEntries(Object.keys(labels).map(kind=>[kind,this.system(kind)])),notificationsSupported:Notification.isSupported()};
    if(value.action==='conference-system-settings')return this.openSettings(value.kind);
    if(value.action==='conference-system-request'){
      if(!Object.hasOwn(labels,value.kind))throw Error('Choose microphone, camera or screen sharing.');
      const status=await this.authorize(value.kind);
      if(['denied','restricted'].includes(status)||value.kind==='screen'&&status==='not-determined')await this.openSettings(value.kind);
      return {status};
    }
    if(value.action==='conference-notification-test'){
      if(!Notification.isSupported())throw Error('System notifications are unavailable.');
      new Notification({title:'Proteus notification test',body:'Website notification sound check',silent:false}).show();
      return {requested:true};
    }
    const profileId=value.profileId||'default',partition=this.partition(profileId);
    if(value.action==='conference-site-save'){
      const origin=this.origin(String(value.origin||'').trim());
      if(!origin)throw Error('Enter a secure website origin.');
      this.save(profileId,origin,[[value.kind,value.permission]]);
    }else if(value.action!=='conference-site-list')throw Error('Choose a conference permission action.');
    return this.rules.filter(row=>row.partition===partition).map(({origin,kind,permission})=>({origin,kind,permission}));
  }
}
module.exports={ConferencePermissions,secureSite};

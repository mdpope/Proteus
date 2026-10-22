const { WebContentsView, session } = require('electron');
const { randomUUID, createHash } = require('node:crypto');
const { ArtifactScroll } = require('./artifact-scroll.cjs');

// A 1 MB approved HTML document may include up to 2 MB of approved raster images.
// Data URLs expand those bytes by about one third; keep the resulting preview bounded.
const MAX_HTML_BYTES=4_000_000;
const outerCSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'none'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const innerCSP=enabled=>`default-src 'none'; script-src ${enabled?"'unsafe-inline'":"'none'"}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
function shellHTML(_content,enabled){
  const csp=innerCSP(enabled).replaceAll('"','&quot;');
  const prefix=`<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${outerCSP}"><style>html,body{margin:0;width:100%;height:100%;background:#fff}iframe{display:block;border:0;width:100%;height:100%}</style></head><body><script>window.__proteusLoad=html=>new Promise(resolve=>{const frame=document.createElement('iframe');frame.setAttribute('sandbox','${enabled?'allow-scripts':''}');frame.setAttribute('referrerpolicy','no-referrer');frame.onload=()=>resolve(true);frame.srcdoc=${JSON.stringify(prefix)}+html;document.body.append(frame);});</script></body></html>`;
}
class ArtifactPreview {
  constructor(window){this.window=window;this.generation=0;this.partition=session.fromPartition('proteus-artifact-'+randomUUID());this.partition.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));this.partition.setPermissionCheckHandler(()=>false);this.partition.webRequest.onBeforeRequest((details,callback)=>callback({cancel:/^(?:https?|file|wss?):/i.test(details.url)}));this.partition.on('will-download',event=>event.preventDefault());}
  async show({html,version,enabled=false,bounds,tabId}={}){
    if(typeof html!=='string'||Buffer.byteLength(html,'utf8')>MAX_HTML_BYTES||typeof version!=='string'||!/^[0-9a-f]{64}$/.test(version)||createHash('sha256').update(html).digest('hex')!==version)throw new Error('Preview content changed. Request this document again.');
    if(typeof enabled!=='boolean')throw new Error('Choose whether to enable scripts.');
    if(tabId!==undefined&&(typeof tabId!=='string'||!tabId||tabId.length>600||/[\x00-\x1f\x7f]/.test(tabId)))throw new Error('Choose an approved document tab.');
    const rect=this.bounds(bounds),key=JSON.stringify([tabId||'',version,enabled]);
    if(this.view&&this.key===key){const view=this.view;view.setBounds(rect);view.setVisible(true);const available=await this.scrollReady;return {enabled,version,scrollAvailable:!!available&&this.view===view&&this.key===key};}
    const generation=++this.generation;await this.clear();
    if(generation!==this.generation)return {enabled,version,scrollAvailable:false};
    const view=new WebContentsView({webPreferences:{session:this.partition,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}});
    this.view=view;this.key=key;this.tabId=tabId;this.version=version;this.window.contentView.addChildView(view);view.setBounds(rect);view.setVisible(true);
    const wc=view.webContents;wc.setWindowOpenHandler(()=>({action:'deny'}));wc.on('will-navigate',event=>event.preventDefault());wc.on('will-frame-navigate',(event,details)=>{if(!['about:srcdoc','about:blank'].includes(details?.url))event.preventDefault();});
    this.scrollReady=(async()=>{
      try{
        await wc.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(shellHTML('',enabled)));
        if(this.view!==view||wc.isDestroyed())return false;
        await wc.executeJavaScript(`window.__proteusLoad(${JSON.stringify(html)})`);
        if(this.view!==view||wc.isDestroyed()||!tabId)return false;
        const observer=new ArtifactScroll(wc,{current:()=>this.view===view&&!wc.isDestroyed()&&this.key===key,onScroll:positions=>{if(this.view===view&&!this.window.isDestroyed())this.window.webContents.send('proteus:artifact-scroll',{tabId,version,positions});}});this.scroll=observer;
        return await observer.start().catch(()=>false);
      }catch(error){if(this.view!==view||wc.isDestroyed())return false;await this.clear();throw error;}
    })();
    const available=await this.scrollReady;return {enabled,version,scrollAvailable:!!available&&this.view===view&&this.key===key};
  }
  async followScroll({tabId,version,positions}={}){const view=this.view,observer=this.scroll;if(tabId!==this.tabId||version!==this.version||!view||!await this.scrollReady||this.view!==view||this.scroll!==observer||tabId!==this.tabId||version!==this.version)return {applied:false};return {applied:await observer.apply(positions)};}
  bounds(value){if(!value||!['x','y','width','height'].every(key=>Number.isFinite(value[key])))throw new Error('Invalid preview bounds.');const size=this.window.getContentBounds();return {x:Math.max(0,Math.floor(value.x)),y:Math.max(0,Math.floor(value.y)),width:Math.max(100,Math.min(size.width,Math.floor(value.width))),height:Math.max(100,Math.min(size.height,Math.floor(value.height))) };}
  async clear(){if(!this.view)return;const view=this.view,observer=this.scroll;this.view=null;this.key=null;this.tabId=null;this.version=null;this.scroll=null;this.scrollReady=null;this.window.contentView.removeChildView(view);const disposal=observer?.dispose();if(!view.webContents.isDestroyed())view.webContents.close();await disposal;}
  async hide(){this.generation++;await this.clear();}
}
module.exports={ArtifactPreview,shellHTML,MAX_HTML_BYTES};

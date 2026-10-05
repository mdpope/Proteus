const { WebContentsView, session } = require('electron');
const { randomUUID, createHash } = require('node:crypto');

// A 1 MB approved HTML document may include up to 2 MB of approved raster images.
// Data URLs expand those bytes by about one third; keep the resulting preview bounded.
const MAX_HTML_BYTES=4_000_000;
const outerCSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'none'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const innerCSP=enabled=>`default-src 'none'; script-src ${enabled?"'unsafe-inline'":"'none'"}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
function shellHTML(_content,enabled){
  const csp=innerCSP(enabled).replaceAll('"','&quot;');
  const prefix=`<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${outerCSP}"><style>html,body{margin:0;width:100%;height:100%;background:#fff}iframe{display:block;border:0;width:100%;height:100%}</style></head><body><script>window.__proteusLoad=html=>{const frame=document.createElement('iframe');frame.setAttribute('sandbox','${enabled?'allow-scripts':''}');frame.setAttribute('referrerpolicy','no-referrer');frame.srcdoc=${JSON.stringify(prefix)}+html;document.body.append(frame);};</script></body></html>`;
}
class ArtifactPreview {
  constructor(window){this.window=window;this.partition=session.fromPartition('proteus-artifact-'+randomUUID());this.partition.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));this.partition.setPermissionCheckHandler(()=>false);this.partition.webRequest.onBeforeRequest((details,callback)=>callback({cancel:/^(?:https?|file|wss?):/i.test(details.url)}));this.partition.on('will-download',event=>event.preventDefault());}
  async show({html,version,enabled=false,bounds}={}){
    if(typeof html!=='string'||Buffer.byteLength(html,'utf8')>MAX_HTML_BYTES||typeof version!=='string'||!/^[0-9a-f]{64}$/.test(version)||createHash('sha256').update(html).digest('hex')!==version)throw new Error('Preview content changed. Request this document again.');
    if(typeof enabled!=='boolean')throw new Error('Choose whether to enable scripts.');
    const rect=this.bounds(bounds),key=version+':'+enabled;
    if(this.view&&this.key===key){this.view.setBounds(rect);this.view.setVisible(true);return {enabled,version};}
    await this.hide();
    const view=new WebContentsView({webPreferences:{session:this.partition,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}});
    this.view=view;this.key=key;this.window.contentView.addChildView(view);view.setBounds(rect);view.setVisible(true);
    const wc=view.webContents;wc.setWindowOpenHandler(()=>({action:'deny'}));wc.on('will-navigate',event=>event.preventDefault());wc.on('will-frame-navigate',(event,details)=>{if(!['about:srcdoc','about:blank'].includes(details?.url))event.preventDefault();});
    await wc.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(shellHTML('',enabled)));
    await wc.executeJavaScript(`window.__proteusLoad(${JSON.stringify(html)})`);
    return {enabled,version};
  }
  bounds(value){if(!value||!['x','y','width','height'].every(key=>Number.isFinite(value[key])))throw new Error('Invalid preview bounds.');const size=this.window.getContentBounds();return {x:Math.max(0,Math.floor(value.x)),y:Math.max(0,Math.floor(value.y)),width:Math.max(100,Math.min(size.width,Math.floor(value.width))),height:Math.max(100,Math.min(size.height,Math.floor(value.height))) };}
  async hide(){if(!this.view)return;const view=this.view;this.view=null;this.key=null;this.window.contentView.removeChildView(view);if(!view.webContents.isDestroyed())view.webContents.close();}
}
module.exports={ArtifactPreview,shellHTML,MAX_HTML_BYTES};

/** Hidden renderer panes may report an empty browser area. Native automation still
 * needs a real viewport; changing geometry never selects or reveals the page. */
function agentViewport(bounds,content){
 const width=Math.round(content?.width),height=Math.round(content?.height);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw Error('The owning browser window has no usable viewport.');
 const keys=['x','y','width','height'];
 if(bounds&&keys.every(key=>Number.isFinite(bounds[key]))){
  const rect=Object.fromEntries(keys.map(key=>[key,Math.round(bounds[key])]));
  if(rect.x>=0&&rect.y>=0&&rect.width>0&&rect.height>0&&rect.x+rect.width<=width&&rect.y+rect.height<=height)return rect;
 }
 return {x:0,y:0,width,height};
}
async function ensureAgentViewport(browser,tab){
 if(!tab.view||tab.videoPopout||tab.websiteFullscreen)return;
 const current=tab.view.getBounds(),content=browser.window.getContentBounds();
 // Keep an already usable viewport stable, including a page with an active screenshot.
 const usable=agentViewport(current,content);
 let next=current;
 if(!['x','y','width','height'].every(key=>usable[key]===current[key])){
  next=agentViewport(browser.bounds,content);tab.view.setBounds(next);tab.captureRevision=(tab.captureRevision||0)+1;
 }
 // Electron can keep a never-visible WebContents at a zero CSS viewport even
 // after native bounds change. Its supported desktop emulation supplies layout
 // only while hidden; native selection restores the real presentation metrics.
 const layout=!tab.view.getVisible()?await tab.view.webContents.executeJavaScript('({width:innerWidth,height:innerHeight})'):null;
 if(layout&&(!tab.agentViewport||tab.agentViewport.width!==next.width||tab.agentViewport.height!==next.height||layout.width<1||layout.height<1)){
  tab.view.webContents.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:next.width,height:next.height},viewPosition:{x:0,y:0},deviceScaleFactor:0,viewSize:{width:next.width,height:next.height},scale:1});
  tab.agentViewport={width:next.width,height:next.height};tab.captureRevision=(tab.captureRevision||0)+1;
 }
}
function releaseAgentViewport(tab){
 if(!tab.agentViewport)return;
 if(tab.view&&!tab.view.webContents.isDestroyed())tab.view.webContents.disableDeviceEmulation();
 tab.agentViewport=null;tab.captureRevision=(tab.captureRevision||0)+1;
}
module.exports={agentViewport,ensureAgentViewport,releaseAgentViewport};

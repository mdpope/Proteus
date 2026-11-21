// Initial native page loading may focus an invisible WebContentsView. Keep the
// latest legitimate local input focused until loading ends or this tab is shown.
function preserveBackgroundFocus(browser,tab,window,initialFocus) {
  if(!window||!initialFocus)return {restore(){},finish(){}};
  const contents=tab.view.webContents,listeners=[];let target=initialFocus,targetActive,targetSelection,stopped=false;
  const listen=(emitter,event,handler)=>{emitter.on(event,handler);listeners.push(()=>emitter.removeListener(event,handler));};
  const stop=()=>{if(stopped)return;stopped=true;for(const remove of listeners)remove();listeners.length=0;};
  const inWindow=action=>browser.withTabWindow?browser.withTabWindow(tab,action):action();
  inWindow(()=>{targetActive=browser.active;targetSelection=browser.tabs.get(browser.active);});
  const restore=()=>{
    if(stopped)return;
    inWindow(()=>{
      if(window.isDestroyed()||!window.isFocused()||contents.isDestroyed()||browser.active===tab.id||tab.view.getVisible()){stop();return;}
      if(!contents.isFocused())return;
      const selected=browser.tabs.get(browser.active);
      const selectedContents=selected?.view?.getVisible()&&!selected.view.webContents.isDestroyed()?selected.view.webContents:null;
      // A newly created foreground view was not in the initial listener set.
      // Renderer input wins only for the selection where it last took focus;
      // an unobserved new foreground tab makes that earlier input stale.
      const rendererCurrent=target===window.webContents&&!target.isDestroyed()&&targetActive===browser.active&&targetSelection===selected;
      const next=rendererCurrent?target:selectedContents||window.webContents;
      if(!next.isDestroyed())next.focus();
    });
  };
  const candidates=new Set([window.webContents,...inWindow(()=>browser.windowTabs()).map(item=>item.view?.webContents).filter(Boolean)]);
  candidates.delete(contents);
  for(const candidate of candidates)listen(candidate,'focus',()=>inWindow(()=>{target=candidate;targetActive=browser.active;targetSelection=browser.tabs.get(browser.active);}));
  listen(contents,'focus',restore);listen(contents,'destroyed',stop);listen(window,'blur',stop);
  return {
    restore,
    finish(){
      // Native focus can still belong to the hidden view after its first load.
      try{restore();}finally{stop();}
    }
  };
}
// Future page navigations can focus the same hidden view after its initial load.
// Resolve the user's current surface in the owning window, including its address bar.
function restoreInactivePageFocus(browser,tab){
  const window=browser.window,view=tab.view,contents=view?.webContents;
  if(!window.isFocused()||!contents?.isFocused()||tab.videoPopout||tab.websiteFullscreen)return;
  if(view.getVisible()){
    if(browser.active===tab.id)browser.rendererFocusSelection=undefined;
    return;
  }
  const active=browser.tabs.get(browser.active);
  const next=browser.rendererFocusSelection===browser.active||!active?.view?.getVisible()
    ?window.webContents:active.view.webContents;
  if(!next.isDestroyed())next.focus();
}
module.exports={preserveBackgroundFocus,restoreInactivePageFocus};

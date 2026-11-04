// Electron's window event also exposes delayed website WebContentsViews. Match
// the extension document, rather than accepting the next unrelated page event.
export function extensionWindow(app, extensionId, pathname) {
 return app.waitForEvent('window', {timeout:15000, predicate:async page=>{
  try {
   await page.waitForURL(url=>url.protocol==='chrome-extension:'&&url.hostname===extensionId&&(!pathname||url.pathname===pathname), {timeout:5000});
   return true;
  } catch { return false; }
 }});
}

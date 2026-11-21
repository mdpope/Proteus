const {randomUUID}=require('node:crypto');
const {safeHistoryURL,isAuthenticationURL}=require('./browser-history.cjs');

function retainedAddress(browser,tab,value){
  const url=safeHistoryURL(value,browser.appOrigin);
  return !tab.incognito&&url&&!isAuthenticationURL(url)&&browser.profileAvailable(tab)?url:null;
}

function retainedImage(image){
  if(image.isEmpty())return null;
  const bytes=image.resize({width:Math.min(800,image.getSize().width)}).toJPEG(64);
  if(bytes.length<=256*1024)return bytes;
  const compact=image.resize({width:360}).toJPEG(60);
  return compact.length<=256*1024?compact:null;
}

async function retainPageForLoad(browser,tab,address,{capture=false}={}){
  const url=retainedAddress(browser,tab,address),wc=tab.view?.webContents;
  if(!url||!wc||wc.isDestroyed())return false;
  if(tab.retainedPage?.url===url){
    tab.retainedPage={...tab.retainedPage,failed:false,stopped:false};
    return true;
  }
  const revision=tab.captureRevision||0;
  let saved,bytes;
  const startingURL=wc.getURL();
  if(capture&&!tab.error&&!(tab.pageResponseStatus>=400)&&!wc.isLoading()&&wc.getURL()===url){
    let timer;
    try{
      const image=await Promise.race([wc.capturePage(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),600);})]);
      bytes=image&&retainedImage(image);
      if(bytes)saved={thumbnail:'data:image/jpeg;base64,'+bytes.toString('base64'),thumbnailAt:new Date().toISOString()};
    }catch{}finally{clearTimeout(timer);}
  }
  saved??=await browser.thumbnails?.getMatching(browser.thumbnailKey(tab),url);
  if(!saved||wc.isDestroyed()||browser.tabs.get(tab.id)!==tab||tab.view?.webContents!==wc||
     revision!==(tab.captureRevision||0)||wc.getURL()!==startingURL||!retainedAddress(browser,tab,url))return false;
  if(bytes)try{browser.thumbnails?.set(browser.thumbnailKey(tab),bytes,url);}catch{/* The in-memory view remains usable. */}
  const title=tab.logicalHistory?.entries[tab.logicalHistory.index]?.title||tab.retainedTitle;
  tab.retainedPage={...saved,url,id:randomUUID(),failed:false,title:capture&&!tab.error?wc.getTitle()||title:title};
  browser.changed();
  return true;
}

function unavailable(error){
  return /\bERR_(?:INTERNET_DISCONNECTED|(?:CONNECTION|PROXY_CONNECTION|TUNNEL_CONNECTION)_[A-Z_]+|NAME_NOT_RESOLVED|NAME_RESOLUTION_FAILED|ADDRESS_UNREACHABLE|NETWORK_CHANGED|TIMED_OUT|EMPTY_RESPONSE|DNS_[A-Z_]+)\b|^(?:Navigation|Restoring browser history) timed out|^HTTP (?:404|410|5\d\d)\b/i.test(error);
}

module.exports={retainPageForLoad,retainedAddress,retainedImage,unavailable};

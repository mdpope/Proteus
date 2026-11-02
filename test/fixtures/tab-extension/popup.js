chrome.tabs.query({},tabs=>document.querySelector('output').textContent='Extension API ready: '+tabs.length+' browser tabs');
async function context(){const tabs=await chrome.tabs.query({active:true,currentWindow:true});document.querySelector('#target').textContent=tabs[0]?.url||'No active site';return tabs[0];}
chrome.runtime.onMessage.addListener(message=>{if(message.type==='synthetic-unlocked'){document.querySelector('#result').textContent='Synthetic vault unlocked';void context();}});
document.querySelector('#unlock').onclick=async()=>{try{await chrome.windows.create({url:chrome.runtime.getURL('auth.html'),type:'popup',width:420,height:300});}catch(error){document.querySelector('#result').textContent=error.message;}};
document.querySelector('#fill').onclick=async()=>{try{const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true});await chrome.tabs.sendMessage(tabs[0].id,{type:'synthetic-fill'});document.querySelector('#result').textContent='Synthetic form filled';}catch(error){document.querySelector('#result').textContent=error.message;}};
void context();

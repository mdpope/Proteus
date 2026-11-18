// History is read from the bound executor; opening a result uses the ordinary rich chat.
export function mountLifeAsk(host,{accountID,destinations,request,escape,open}){
 let generation=0,closed=false;
 const draw=async()=>{
  const expected=++generation;host.innerHTML='<p role="status">Loading voice requests…</p>';
  try{
   const computers=await destinations();
   const results=await Promise.all(computers.map(async computer=>{
    try{const value=await request(computer.hostId,'life.ask.view');if(value.accountID!==accountID||value.hostID!==computer.hostId)return {computer,error:'This computer is signed in to a different Life account.'};return {computer,value};}
    catch{return {computer,error:'Ask is unavailable. Connect and update this computer, then refresh.'};}
   }));
   if(closed||expected!==generation)return;
   host.innerHTML=results.length?results.map(({computer,value,error})=>`<section class="card"><h2>${escape(computer.label)}</h2>${error?`<p role="status">${escape(error)}</p>`:`<p>${value.settings.enabled?'Life Ask is enabled.':'Life Ask is off. Enable it and pair Mnemosyne in the desktop app.'}</p>${value.items.length?`<ul>${value.items.map(item=>`<li>${item.chatId?`<button type="button" data-ask-host="${escape(computer.hostId)}" data-ask-chat="${escape(item.chatId)}">${escape(item.title)}</button>`:escape(item.title)}<p>${escape(item.summary)}</p><small>${escape(item.state.replaceAll('-',' '))}${item.deliveryNeedsAttention?' · delivery pending':''}</small></li>`).join('')}</ul>`:'<p>No voice requests for this account yet.</p>'}`}</section>`).join(''):'<p>Pair your home computer in Connections to see Life Ask.</p>';
   host.querySelectorAll('[data-ask-chat]').forEach(button=>button.onclick=()=>{if(!closed)open(button.dataset.askHost,button.dataset.askChat);});
  }catch{if(!closed&&expected===generation)host.innerHTML='<p role="status">Could not load Life Ask. Sign in again or refresh.</p>';}
 };
 void draw();return {refresh:draw,close(){closed=true;++generation;host.replaceChildren();}};
}

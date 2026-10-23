// Pull-based viewing deliberately allows only one image request in flight per viewer.
export function mountLiveBrowser(root, { request, chatId, pending = () => null, draft = {}, saveDraft = () => {} }) {
  root.innerHTML = `<div class="live-browser-controls"><label>Desktop tab <select aria-label="Desktop browser tab"><option value="">Follow agent</option></select></label><button type="button" data-refresh>Refresh</button><label><input type="checkbox" data-freeze> Freeze to annotate</label><label>Zoom <input type="range" min="1" max="3" step=".25" value="1" data-zoom></label><span role="status" data-status>Connecting…</span></div><div class="live-browser-viewport"><div class="live-browser-image"><img alt="Live desktop browser page"><span class="live-browser-mark" hidden>⊕</span></div></div><p data-question></p><form><textarea aria-label="Browser instruction" placeholder="Tell the agent what to do…"></textarea><div class="actions"><button type="submit" data-mode="queue">Send instruction</button><button type="submit" data-mode="steer">Steer now</button><button type="submit" data-mode="answer" hidden>Send feedback</button></div></form>`;
  const select=root.querySelector('select'),status=root.querySelector('[data-status]'),img=root.querySelector('img'),holder=img.parentElement,freeze=root.querySelector('[data-freeze]'),input=root.querySelector('textarea'),mark=root.querySelector('.live-browser-mark');
  const approvals=document.createElement('div');approvals.className='actions';root.querySelector('[data-question]').after(approvals);let approvalID=null;
  input.value=draft.text||'';input.oninput=()=>{draft.text=input.value;saveDraft(draft);};
  let frame=null,point=null,stopped=false,timer,generation=0,polling=false,sending=false;
  const clear=()=>{generation++;frame=null;point=null;img.removeAttribute('src');mark.hidden=true;};
  async function poll() {
    if(stopped||!root.isConnected)return;
    if(polling)return;
    const question=pending();root.querySelector('[data-question]').textContent=question?.question||'';root.querySelector('[data-mode=answer]').hidden=question?.type!=='question';
    if(approvalID!==question?.id){approvalID=question?.id;approvals.replaceChildren();if(question?.type==='permission')for(const choice of [{label:'Approve once',value:'approve'},{label:'Deny',value:'deny'},...(question.permissionChoices||[])]){const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.onclick=async()=>{approvals.querySelectorAll('button').forEach(b=>b.disabled=true);try{await request('chat.reply',{id:chatId,requestId:question.id,answer:choice.value});status.textContent='Decision sent';}catch(error){status.textContent=error.message;approvals.querySelectorAll('button').forEach(b=>b.disabled=false);}};approvals.append(button);}}
    if(document.hidden){clear();timer=setTimeout(poll,1000);return;}
    polling=true;const epoch=generation;
    try {
      const {tabs}=await request('browser.live.list',{id:chatId});
      if(stopped||epoch!==generation)return;
      if(freeze.checked&&frame){if(!tabs.some(tab=>tab.id===frame.tabId)||Date.now()-Date.parse(frame.capturedAt)>30000){clear();freeze.checked=false;status.textContent='Reference expired; refreshing';}else return;}
      const choice=select.value;
      select.replaceChildren(new Option('Follow agent',''),...tabs.map(tab=>new Option(tab.title||'Browser',tab.id)));
      select.value=tabs.some(tab=>tab.id===choice)?choice:'';
      const tab=tabs.find(tab=>tab.id===select.value)||tabs.find(tab=>tab.agentControlling)||tabs.find(tab=>tab.id===frame?.tabId)||tabs[0];
      if(!tab){clear();status.textContent='No loaded desktop browser tabs for this chat.';return;}
      const next=await request('browser.live.frame',{id:chatId,tabId:tab.id});
      if(stopped||!root.isConnected||epoch!==generation||freeze.checked)return;
      frame=next;img.src=next.image;point=null;mark.hidden=true;status.textContent='Live · '+new Date(next.capturedAt).toLocaleTimeString();
    } catch(error){if(!stopped&&epoch===generation){clear();status.textContent=error.message;}}
    finally {polling=false;if(!stopped&&root.isConnected)timer=setTimeout(poll,1000);}
  }
  select.onchange=()=>{clear();freeze.checked=false;clearTimeout(timer);void poll();};
  root.querySelector('[data-refresh]').onclick=()=>{freeze.checked=false;point=null;mark.hidden=true;clearTimeout(timer);void poll();};
  root.querySelector('[data-zoom]').oninput=event=>{holder.style.width=(Number(event.target.value)*100)+'%';};
  img.onclick=event=>{if(!frame)return;const rect=img.getBoundingClientRect();point={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};freeze.checked=true;generation++;mark.style.left=(point.x*100)+'%';mark.style.top=(point.y*100)+'%';mark.hidden=false;status.textContent='Frozen reference · refresh if the page changes';};
  root.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(sending||!frame||!input.value.trim())return;
    const button=event.submitter,mode=button?.dataset.mode||'queue',sent=input.value;sending=true;root.querySelectorAll('[data-mode]').forEach(button=>button.disabled=true);
    try{await request('browser.live.instruct',{id:chatId,frameId:frame.id,text:sent,point,mode,requestId:pending()?.id,messageId:crypto.randomUUID()});if(input.value===sent){input.value='';draft.text='';saveDraft(draft);}freeze.checked=false;status.textContent='Instruction accepted';}
    catch(error){status.textContent=error.message;}finally{sending=false;root.querySelectorAll('[data-mode]').forEach(button=>button.disabled=false);}
  };
  void poll();
  return ()=>{stopped=true;generation++;clearTimeout(timer);img.removeAttribute('src');frame=null;};
}

// Keep each setup form mounted off-screen while another tab is selected. File
// selections, source choices and async catalogs belong to this form, never a modal.
export function createChatSetupTabs({state,save,render,toast,dispose=()=>{}}){
 const views=new Map();let cache;
 const storage=()=>{if(!cache){cache=document.createElement('div');cache.hidden=true;cache.id='chat-setup-cache';document.body.append(cache);}return cache;};
 function capture(entry){if(entry.configurationReset!==entry.tab.newChatDraft?.configurationReset)return;const root=entry.root,draft=entry.tab.newChatDraft;if(!root||!draft||!entry.ready)return;
  draft.form=Object.fromEntries([...root.querySelectorAll('input[id],textarea[id],select[id]')].filter(el=>el.id.startsWith(entry.prefix+'-')).map(el=>[el.id.slice(entry.prefix.length+1),el.type==='checkbox'?el.checked:el.value]));
  draft.peerSources=[...root.querySelectorAll('[data-peer-source]:checked')].map(el=>el.dataset.peerSource);
  const picker=root.querySelector('.context-picker');if(picker)draft.selection={selectedIds:[...(picker._selection||[])],agentId:root.querySelector('#'+entry.prefix+'-agent')?.value||null,includeDefaults:root.querySelector('#'+entry.prefix+'-defaults')?.value!=='false'};
  draft.details=[...root.querySelectorAll('details')].map(el=>el.open);
 }
 function prune(){for(const [id,entry]of views)if(!state.tabs.includes(entry.tab)){entry.root?.remove();dispose('new-chat:'+entry.prefix);views.delete(id);}}
 function park(){prune();for(const [id,entry]of views){capture(entry);if(entry.root&&entry.root.parentElement?.id!=='chat-setup-cache')storage().append(entry.root);}}
 function show(tab,load){let entry=views.get(tab.id);if(entry&&entry.configurationReset!==tab.newChatDraft?.configurationReset){entry.root?.remove();entry.root=null;entry.saved=structuredClone(tab.newChatDraft);entry.ready=false;entry.configurationReset=tab.newChatDraft?.configurationReset;}if(!entry){entry={tab,configurationReset:tab.newChatDraft?.configurationReset,prefix:'setup-'+crypto.randomUUID(),loading:false,saved:structuredClone(tab.newChatDraft)};views.set(tab.id,entry);}const main=document.querySelector('#main');main.classList.add('new-chat-main');main.replaceChildren();
  if(entry.root){main.append(entry.root);entry.resume?.();return;}
  main.innerHTML='<p class="note">Loading chat setup…</p>';if(!entry.loading){entry.loading=true;Promise.resolve(load(surface(entry))).catch(error=>toast(error.message)).finally(()=>{entry.loading=false;});}
 }
 function surface(entry){return {initial:entry.saved,prefix:entry.prefix,attachmentKey:'new-chat:'+entry.prefix,tab:entry.tab,active:()=>state.tab===entry.tab.id,
  mount(html,submit){entry.ready=false;if(entry.root)entry.root.open=false;entry.root?.remove();const root=entry.root=document.createElement('section');root.className='new-chat-tab-panel new-chat-dialog';root.dataset.chatSetup=entry.tab.id;root.open=true;
   root.innerHTML=html.replaceAll('id="chat-','id="'+entry.prefix+'-').replaceAll('for="chat-','for="'+entry.prefix+'-').replaceAll('id="peer-','id="'+entry.prefix+'-peer-').replaceAll('for="peer-','for="'+entry.prefix+'-peer-').replaceAll('id="dialog-submit"','id="'+entry.prefix+'-submit"').replaceAll('id="close-dialog"','id="'+entry.prefix+'-cancel"');
   root.close=()=>{capture(entry);root.open=false;root.remove();dispose('new-chat:'+entry.prefix);views.delete(entry.tab.id);delete entry.tab.newChatDraft;delete entry.tab.customTitle;entry.tab.label='New tab';save();if(state.tab===entry.tab.id)render();};
   root.querySelector('#'+entry.prefix+'-cancel').onclick=root.close;
   const button=root.querySelector('#'+entry.prefix+'-submit');button.dataset.chatSetupSubmit='';let busy=false;button.onclick=async()=>{if(busy||button.disabled)return;busy=true;button.disabled=true;capture(entry);try{await submit();}catch(error){toast(error.message);}finally{busy=false;if(button.isConnected)button.disabled=false;}};
   root.addEventListener('input',()=>{capture(entry);save();});root.addEventListener('change',()=>{capture(entry);save();});root.addEventListener('toggle',()=>{capture(entry);save();},true);
   if(state.tab===entry.tab.id)document.querySelector('#main').replaceChildren(root);else storage().append(root);
   return root;
  },
  html:html=>html.replaceAll('id="peer-','id="'+entry.prefix+'-peer-').replaceAll('for="peer-','for="'+entry.prefix+'-peer-'),
  update:changes=>{Object.assign(entry.tab.newChatDraft,changes);entry.saved=structuredClone(entry.tab.newChatDraft);},
  restore({modelsOnly=false}={}){const form=entry.saved?.form||{};for(const [key,value]of Object.entries(form)){if(modelsOnly&&!/^(?:peer-)?(?:model(?:-|$)|reasoningEffort$|contextTier$|serviceTier$)/.test(key))continue;const el=entry.root.querySelector('#'+CSS.escape(entry.prefix+'-'+key));if(!el)continue;if(el.type==='checkbox')el.checked=value===true;else if(el.tagName!=='SELECT'||[...el.options].some(option=>option.value===value))el.value=String(value);}if(!modelsOnly)for(const [index,details]of [...entry.root.querySelectorAll('details')].entries())details.open=entry.saved?.details?.[index]===true;},
  ready:()=>{entry.ready=true;capture(entry);},capture:()=>capture(entry),resume:fn=>entry.resume=fn};}
 return {park,show,capture:()=>{prune();for(const entry of views.values())capture(entry);}};
}

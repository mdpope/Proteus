// Shared production composer behavior for local desktop, remote desktop and website chats.
const svg = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const arrow = svg('<path d="M12 20V4M5 11l7-7 7 7"/>');
const clock = svg('<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>');
const icons = {send:arrow,queue:arrow+`<span class="queue-clock">${clock}</span>`,steer:svg('<path d="M6 20V5M2 9l4-4 4 4M6 15h8a5 5 0 0 0 5-5V5M15 9l4-4 3 4"/>'),stop:svg('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>')};
const mounts = new WeakMap();
const live = new Map();
export function mountChatComposer(composer,{textarea,models,actions,active=false,pane}={}) {
  if(!composer)return;
  for(const [node,dispose] of live)if(!node.isConnected)dispose();
  mounts.get(composer)?.();
  composer.classList.add('adaptive-composer');
  textarea ||= composer.querySelector('textarea');
  models ||= composer.querySelector('.composer-models');
  actions ||= composer.querySelector('.composer-actions');
  pane ||= composer.closest('.chat-pane,.remote-chat-main');
  const footer=composer.querySelector('.composer-footer,.remote-composer-primary,.new-chat-toolbar');
  footer?.classList.add('composer-footer');actions?.classList.add('composer-actions');
  if(!textarea||!footer)return;
  let frame=0;
  // Measure a detached-from-flow mirror. Collapsing the live field first clamps the
  // transcript's scroll range on every keystroke and makes scroll-follow oscillate.
  const measure=textarea.cloneNode(false);measure.removeAttribute('id');measure.removeAttribute('name');measure.setAttribute('aria-hidden','true');measure.tabIndex=-1;measure.disabled=true;measure.className='composer-measure';composer.append(measure);
  const docked=pane?.matches('.remote-chat-main')&&!!pane.querySelector('.remote-messages');if(docked)pane.classList.add('docked-chat');
  const fieldLabel=select=>/effort|reasoning/i.test(select.id+select.name)?'Level':/context/i.test(select.id+select.name)?'Context':/speed|serviceTier/i.test(select.id+select.name)?'Speed':/provider/i.test(select.id+select.name)?'Provider':'Model';
  function decorate(){
    if(models){
      models.classList.add('composer-models');
      for(const select of models.querySelectorAll('select')){
        let field=select.closest('.model-field');
        if(!field){
          const parent=select.parentElement;
          if(parent.matches('label')||parent.querySelector('label')&&parent.children.length<=2)field=parent;
          else {field=document.createElement('div');select.before(field);field.append(select);}
          field.classList.add('model-field');
          if(field.tagName==='LABEL')for(const node of [...field.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
          let label=field.querySelector('label,.model-field-label');
          if(!label){label=document.createElement('span');label.className='model-field-label';field.prepend(label);}
          if(label.tagName==='LABEL')label.htmlFor=select.id;
          label.textContent=fieldLabel(select);
        }
        if(select.hidden&&!field.hidden)field.hidden=true;
        else if(!select.hidden&&select.dataset.designHidden==='true'){field.hidden=false;delete select.dataset.designHidden;}
        if(select.hidden)select.dataset.designHidden='true';
      }
      for(const button of models.querySelectorAll('button'))button.classList.add('model-refresh');
    }
    for(const button of actions?.querySelectorAll('button')||[]){
      const originalLabel=button.getAttribute('aria-label')||button.textContent.trim();
      const identity=(button.id+' '+button.textContent).toLowerCase();
      const kind=/steer/.test(identity)?'steer':/cancel|stop/.test(identity)?'stop':active?'queue':'send';
      if(button.dataset.iconKind!==kind){button.innerHTML=icons[kind];button.dataset.iconKind=kind;}
      button.classList.add('icon-action',kind==='steer'?'steer-action':kind==='stop'?'stop-action':'send-action');
      const label=button.dataset.steerMode==='interrupt-and-continue'?'Interrupt and steer Claude':button.hasAttribute('data-search-provider')?originalLabel:{send:'Send message',queue:'Queue message',steer:'Steer current turn',stop:'Stop current turn'}[kind];
      button.setAttribute('aria-label',label);button.title=label;
    }
    updateSummary();schedule();
  }
  const compact=document.createElement('button');compact.type='button';compact.className='model-options';
  compact.setAttribute('aria-label','Model and turn options');compact.setAttribute('aria-expanded','false');
  if(models){models.before(compact);compact.innerHTML='<span><strong></strong><small></small></span><span aria-hidden="true">⌄</span>';}
  function updateSummary(){if(!models)return;const values=[...models.querySelectorAll('select')].filter(s=>!s.hidden&&!s.closest('[hidden]')).map(s=>s.selectedOptions[0]?.textContent||'');const title=values.shift()||'Model options';const detail=values.join(' · ');if(compact.querySelector('strong').textContent!==title)compact.querySelector('strong').textContent=title;if(compact.querySelector('small').textContent!==detail)compact.querySelector('small').textContent=detail;}
  function close(){composer.dataset.optionsOpen='false';compact.setAttribute('aria-expanded','false');}
  compact.onclick=()=>{const open=composer.dataset.optionsOpen!=='true';composer.dataset.optionsOpen=String(open);compact.setAttribute('aria-expanded',String(open));};
  const dismiss=event=>{if(event.key==='Escape'){close();compact.focus();}else if(event.type==='pointerdown'&&!composer.contains(event.target))close();};
  document.addEventListener('pointerdown',dismiss);composer.addEventListener('keydown',dismiss);
  function resize(){
    frame=0;if(!composer.isConnected)return;
    if(docked){const top=pane.getBoundingClientRect().top;const height=Math.max(280,(window.visualViewport?.height||innerHeight)-top-20);const value=Math.round(height)+'px';if(pane.style.getPropertyValue('--chat-available-height')!==value)pane.style.setProperty('--chat-available-height',value);}
    const available=pane?.clientHeight||Math.max(160,innerHeight-composer.getBoundingClientRect().top+composer.clientHeight);
    const chrome=composer.getBoundingClientRect().height-textarea.getBoundingClientRect().height;
    let editorSpace=available*.6-chrome;
    if(pane?.matches('.chat-pane')&&composer.parentElement===pane){
      // Waiting questions and narrow-screen headings also consume chat space.
      // Leave the transcript a small reading area and keep the footer inside the
      // pane even when a long draft and a pending question are both present.
      const style=getComputedStyle(pane),composerStyle=getComputedStyle(composer);
      let occupied=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0)+(parseFloat(composerStyle.marginTop)||0)+(parseFloat(composerStyle.marginBottom)||0);
      for(const sibling of pane.children){
        if(sibling===composer||sibling.matches('#conversation-host,#peer-conversation,.conversation-shell')||getComputedStyle(sibling).display==='none')continue;
        const style=getComputedStyle(sibling);occupied+=sibling.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
      }
      editorSpace=Math.min(editorSpace,available-occupied-chrome-80);
    }
    const cap=Math.max(40,editorSpace);
    const oldScroll=textarea.scrollTop;
    const computed=getComputedStyle(textarea);
    measure.style.cssText='position:absolute!important;left:0!important;top:0!important;visibility:hidden!important;pointer-events:none!important;height:0!important;min-height:0!important;max-height:none!important;overflow:hidden!important;resize:none!important;';
    for(const key of ['font','fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','padding','border','boxSizing','whiteSpace','wordBreak','overflowWrap'])measure.style[key]=computed[key];
    measure.style.width=textarea.getBoundingClientRect().width+'px';measure.value=textarea.value||textarea.placeholder||' '; 
    let minimum=48;
    if(composer.classList.contains('new-chat-composer')){
      let occupied=0,node=composer;
      while(node&&node!==pane&&node.parentElement){
        for(const sibling of node.parentElement.children)if(sibling!==node&&!sibling.hidden){const style=getComputedStyle(sibling);occupied+=sibling.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);}
        node=node.parentElement;
      }
      const style=pane?getComputedStyle(pane):null;
      const padding=style?(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0):0;
      minimum=pane?.matches('.new-chat-tab-panel')?Math.min(cap,138):Math.min(cap,Math.max(100,available-occupied-padding-chrome));
    }
    const needed=Math.max(minimum,measure.scrollHeight+(parseFloat(computed.borderTopWidth)||0)+(parseFloat(computed.borderBottomWidth)||0));
    const next=Math.min(needed,cap)+'px';if(textarea.style.height!==next)textarea.style.height=next;
    textarea.style.overflowY=needed>cap?'auto':'hidden';
    if(needed>cap)textarea.scrollTop=oldScroll;
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(resize);}
  const observer=new MutationObserver(decorate);
  // Catalog changes only; typing never observes or rebuilds the transcript.
  if(models)observer.observe(models,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  const sizes=new ResizeObserver(entries=>{if(entries.some(e=>e.target===pane||e.target===footer))schedule();});
  if(pane)sizes.observe(pane);sizes.observe(footer);
  textarea.addEventListener('input',schedule);composer.addEventListener('change',updateSummary);window.addEventListener('resize',schedule);
  // Desktop pickers replace their strip when selections change. Observe the stable
  // host so adding, removing and restoring files always remeasures the editor.
  const attachments=new MutationObserver(schedule);for(const host of composer.querySelectorAll('.chat-attachment-picker,.remote-attachment-strip'))attachments.observe(host,{childList:true,subtree:true});
  decorate();cancelAnimationFrame(frame);resize();
  const dispose=()=>{observer.disconnect();sizes.disconnect();attachments.disconnect();cancelAnimationFrame(frame);measure.remove();compact.remove();textarea.removeEventListener('input',schedule);composer.removeEventListener('change',updateSummary);composer.removeEventListener('keydown',dismiss);document.removeEventListener('pointerdown',dismiss);window.removeEventListener('resize',schedule);mounts.delete(composer);live.delete(composer);};
  mounts.set(composer,dispose);live.set(composer,dispose);
}
export function mountNewChatComposer(composer){
 if(!composer)return;const toolbar=composer.querySelector('.new-chat-toolbar');if(!toolbar)return;
 const send=composer.querySelector('#dialog-submit,[data-chat-setup-submit]');let actions=toolbar.querySelector('.composer-actions');
 if(send&&!actions){actions=document.createElement('div');actions.className='composer-actions';toolbar.append(actions);actions.append(send);}
 let models=toolbar.querySelector('.composer-models');if(!models){models=document.createElement('div');models.className='composer-models';const fields=[...toolbar.children].filter(child=>child.matches('label,.model-controls,.row,#peer-model-controls,[id$="-peer-model-controls"]'));if(fields.length){fields[0].before(models);for(const field of fields)models.append(field);}}
 mountChatComposer(composer,{models,actions,pane:composer.closest('dialog,.new-chat-tab-panel')});
}

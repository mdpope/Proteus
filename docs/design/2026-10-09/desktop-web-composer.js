import { mountAttachmentPicker, selectedAttachments, clearAttachments } from '../../../public/chat-attachments.js';

const paths = {
  steer: '<path d="M7 20V4m-3 3 3-3 3 3M7 15h5a5 5 0 0 0 5-5V5m-3 3 3-3 3 3"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const fixtureKey = 'design-rehearsal:desktop-web-composer';
const values = { model: 'selected', reasoningEffort: 'high', serviceTier: '', contextTier: 'default', prompt: 'Also check the attachment flow and keep the changes small.' };
let platform = 'desktop';
const $ = selector => document.querySelector(selector);
const notice = message => { $('#preview-notice').textContent = message; };
const options = (items, selected) => items.map(([value,label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');

function renderComposer() {
  const web = platform === 'web';
  const remote = platform === 'remote';
  const modelID = web ? 'remote-model' : remote ? 'peer-model' : 'run-model';
  const ids = web ? ['remote-composer','remote-prompt','remote-attachments','remote-steer','remote-send','remote-cancel'] : remote ? ['peer-reply-form','peer-followup','peer-run-attachments','peer-steer','peer-send','peer-cancel'] : ['preview-composer','followup','run-attachments','steer','continue','cancel'];
  const field = (name, label, suffix, items) => `<div data-option="${name}"><label for="${modelID}-${suffix}">${label}</label><select id="${modelID}-${suffix}" name="${name}">${options(items, values[name])}</select></div>`;
  $('#composer-mount').innerHTML = `<form id="${ids[0]}" class="composer adaptive-composer" data-options-open="false">
    <label class="sr-only" for="${ids[1]}">Message</label>
    <textarea id="${ids[1]}" name="prompt" rows="3" placeholder="Add an update while this runs…"></textarea>
    <div class="composer-footer">
      <div id="${ids[2]}"></div>
      <button type="button" class="model-options" aria-label="Model and options" aria-expanded="false" aria-controls="preview-model-options"><span><strong></strong><small></small></span><span aria-hidden="true">⌄</span></button>
      <div class="composer-models" id="preview-model-options">
        <button type="button" class="compact-option-close" aria-label="Close model options">×</button>
        <div class="model-field"><label for="${modelID}">Model</label><select id="${modelID}" name="model">${options([['selected','Selected model'],['long','Selected model with a longer display name'],['minimal','Minimal model']],values.model)}</select></div>
        <div class="model-controls compact-model-controls" data-model-picker="${modelID}">
          ${field('reasoningEffort','Level','effort',[['high','High'],['medium','Medium'],['low','Low']])}
          ${field('serviceTier','Speed','speed',[['','Standard'],['fast','Fast']])}
          ${field('contextTier','Context','context',[['default','Default'],['extended','Extended']])}
        </div>
        <button type="button" class="subtle model-refresh" aria-label="Refresh model choices" title="Refresh model choices">↻</button>
      </div>
      <div class="composer-actions">
        <button id="${ids[3]}" class="icon-action steer-action" type="button" aria-label="Steer current turn" title="Steer current turn · uses its current model">${icon('steer')}</button>
        <button id="${ids[4]}" class="primary icon-action" type="submit" aria-label="Queue message" title="Queue message">${icon('up')}<span class="queue-clock">${icon('clock')}</span></button>
        <button id="${ids[5]}" class="icon-action stop-action" type="button" aria-label="Stop current turn" title="Stop current turn">${icon('stop')}</button>
      </div>
    </div>
  </form>`;
  const form = $('.adaptive-composer'), textarea = form.elements.prompt;
  textarea.value = values.prompt;
  $('#web-styles').disabled = !web;
  $('#platform-caption').textContent = 'Project update';
  document.querySelectorAll('[data-open-path]').forEach(button=>{button.disabled=platform!=='desktop';button.title=platform==='desktop'?'Open local file · design rehearsal':'Local file Open is unavailable in this view';});
  mountAttachmentPicker({key:fixtureKey,host:form.querySelector('#'+ids[2]),textarea,provider:()=> 'fixture',mediaTypes:{fixture:['text/plain','image/png','image/jpeg','application/pdf']},notify:notice,onChange:updateControls});
  textarea.addEventListener('input',()=>{values.prompt=textarea.value;updateControls();});
  form.querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>{values[select.name]=select.value;updateControls();notice('Preview selection updated. Provider settings are unchanged.');}));
  const toggle = form.querySelector('.model-options');
  toggle.addEventListener('click',()=>{const open=form.dataset.optionsOpen!=='true';form.dataset.optionsOpen=String(open);toggle.setAttribute('aria-expanded',String(open));});
  const close = ()=>{form.dataset.optionsOpen='false';toggle.setAttribute('aria-expanded','false');};
  form.querySelector('.compact-option-close').addEventListener('click',()=>{close();toggle.focus();});
  form.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();if(getComputedStyle(toggle).display!=='none')toggle.focus();}
    if(event.target===textarea&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey){event.preventDefault();if(!form.querySelector('[type=submit]').disabled)form.requestSubmit();}
  });
  form.addEventListener('submit',event=>{event.preventDefault();const working=$('#preview-state').value!=='idle';const count=selectedAttachments(fixtureKey).length;$('#queued-preview').hidden=false;$('#queued-preview span').textContent=`${working?'Queued preview':'Sent preview'} · ${values.prompt}${count ? ` · ${count} attachment(s)` : ''}`;notice(count?'Visual rehearsal: real delivery still requires attachment review. No file uploaded.':'Visual rehearsal only. No message delivered.');});
  form.querySelector('.steer-action').addEventListener('click',()=>notice('Steer preview · uses the current turn’s model; the next-turn selections stay intact.'));
  form.querySelector('.stop-action').addEventListener('click',()=>{$('#preview-state').value='idle';updateControls();notice('Stop preview · no live turn was stopped.');});
  form.querySelector('.model-refresh').addEventListener('click',()=>notice('Synthetic choices only. Implementation will refresh provider metadata.'));
  updateControls();
}

function updateControls() {
  const form=$('.adaptive-composer');if(!form)return;
  const state=$('#preview-state').value, working=state!=='idle', minimal=values.model==='minimal';
  const attachments=selectedAttachments(fixtureKey).length;
  form.querySelector('[data-option=reasoningEffort]').hidden=minimal;
  form.querySelector('[data-option=serviceTier]').hidden=minimal;
  form.querySelector('[data-option=contextTier]').hidden=minimal||!$('#show-context').checked;
  form.querySelector('.steer-action').hidden=!working;
  form.querySelector('.steer-action').disabled=state!=='running'||!values.prompt.trim()||attachments>0;
  form.querySelector('.stop-action').hidden=!working;
  form.querySelector('.queue-clock').hidden=!working;
  const send=form.querySelector('[type=submit]'),label=working?'Queue message':'Send message';
  send.setAttribute('aria-label',label);send.title=label;send.disabled=!values.prompt.trim();
  form.querySelector('.model-options strong').textContent=form.elements.model.selectedOptions[0].textContent;
  form.querySelector('.model-options small').textContent=minimal?'Provider defaults':`${form.elements.reasoningEffort.selectedOptions[0].textContent} · ${form.elements.serviceTier.selectedOptions[0].textContent}`;
  form.elements.prompt.placeholder=working?'Add an update while this runs…':'Continue this conversation…';
  $('#preview-pending').hidden=state!=='awaiting_input';
  $('.designed-status').hidden=state!=='running';
  $('.designed-activity').hidden=state==='idle';
  growEditor();
  $('#source-preview').textContent=form.outerHTML;
}

function growEditor() {
  const textarea=$('.adaptive-composer textarea');if(!textarea)return;
  const pane=$('#preview-chat'),form=$('.adaptive-composer'),history=$('.designed-history');
  const followsBottom=history.scrollHeight-history.clientHeight-history.scrollTop<24;
  const available=pane.clientHeight-$('.designed-heading').offsetHeight-$('.designed-tabs').offsetHeight;
  const overhead=form.getBoundingClientRect().height-textarea.getBoundingClientRect().height+22;
  const limit=Math.max(58,Math.floor(available*.6-overhead));
  const editorScroll=textarea.scrollTop;
  const editorFollowsBottom=textarea.scrollHeight-textarea.clientHeight-editorScroll<24;
  textarea.style.height='0px';
  const natural=textarea.scrollHeight;
  const height=Math.max(58,Math.min(natural,limit));
  textarea.style.height=height+'px';
  textarea.style.overflowY=natural>height+1?'auto':'hidden';
  if(natural>height+1)textarea.scrollTop=editorFollowsBottom?textarea.scrollHeight:editorScroll;
  form.dataset.editorLimit=String(limit);
  if(followsBottom)history.scrollTop=history.scrollHeight;
}

document.querySelectorAll('[data-platform]').forEach(button=>button.addEventListener('click',()=>{platform=button.dataset.platform;document.querySelectorAll('[data-platform]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderComposer();}));
$('#preview-state').addEventListener('change',updateControls);
$('#show-context').addEventListener('change',updateControls);
$('#preview-width').addEventListener('input',event=>{$('#preview-workspace').style.width=`min(100%, ${event.target.value}px)`;$('#width-value').textContent=event.target.value+' px';});
$('#sample-attachment').addEventListener('click',()=>{const transfer=new DataTransfer();transfer.items.add(new File(['Synthetic attachment for a layout rehearsal.'],'Project notes.txt',{type:'text/plain'}));const input=$('.adaptive-composer input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change'));notice('Sample attachment stays in this browser preview. No upload occurs.');});
$('#remove-queued').addEventListener('click',()=>{$('#queued-preview').hidden=true;});
$('#long-draft').addEventListener('click',()=>{values.prompt=Array.from({length:24},(_,index)=>`Line ${index+1}: review the next project item and keep the existing behavior.`).join('\n');$('.adaptive-composer textarea').value=values.prompt;updateControls();});
document.querySelectorAll('[data-rehearsal-action],[data-open-path]').forEach(button=>button.addEventListener('click',()=>notice(button.textContent.trim()+' · design rehearsal only.')));
document.querySelectorAll('[data-copy-path]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.dataset.copyPath);notice('Path copied: '+button.dataset.copyPath);}catch{notice('Copy path: '+button.dataset.copyPath);}}));
document.querySelectorAll('[data-feedback]').forEach(button=>button.addEventListener('click',()=>notice('Feedback preview only. No answer delivered.')));
window.addEventListener('beforeunload',()=>clearAttachments(fixtureKey));
renderComposer();
const observer=new ResizeObserver(()=>{const width=$('#preview-workspace').clientWidth;$('#preview-workspace').classList.toggle('compact-layout',width<950);$('#preview-workspace').classList.toggle('narrow-details',width<760);growEditor();});
observer.observe($('#preview-workspace'));observer.observe($('#preview-chat'));

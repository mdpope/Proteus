// Retain expensive transcript bodies and the live editor while rebuilding the
// surrounding controls from current host state. Identity includes account/host/
// chat at the call site, so nodes never migrate between authorization scopes.
const sources=new WeakMap();
function formShape(form){
 const copy=form.cloneNode(true);
 for(const field of copy.querySelectorAll('textarea'))field.textContent='';
 for(const field of copy.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio])'))field.removeAttribute('value');
 for(const option of copy.querySelectorAll('option[selected]'))option.removeAttribute('selected');
 return copy.outerHTML;
}
export function replaceChatMarkup(target,markup,scope){
 const template=document.createElement('template');template.innerHTML=markup;
 const same=target.chatRenderScope===scope,selection=document.getSelection();
 const focused=same&&target.contains(document.activeElement)?document.activeElement:null;
 const caret=focused&&typeof focused.selectionStart==='number'?[focused.selectionStart,focused.selectionEnd,focused.selectionDirection]:null;
 const selected=same&&!caret&&selection?.rangeCount&&target.contains(selection.anchorNode)&&target.contains(selection.focusNode)?{anchor:selection.anchorNode,anchorOffset:selection.anchorOffset,focus:selection.focusNode,focusOffset:selection.focusOffset}:null;
 const oldRows=new Map(same?[...target.querySelectorAll('.remote-messages > [data-event-key]')].map(node=>[node.dataset.eventKey,node]):[]);
 let reused=0;
 for(const row of template.content.querySelectorAll('.remote-messages > [data-event-key]')){
  const source=row.outerHTML,old=oldRows.get(row.dataset.eventKey);
  if(old&&sources.get(old)===source){row.replaceWith(old);reused++;}else sources.set(row,source);
 }
 const form=template.content.querySelector('#remote-composer'),oldForm=same?target.querySelector('#remote-composer'):null;
 if(form){
  const source=formShape(form);
  if(oldForm&&sources.get(oldForm)===source){
   if(form.hasAttribute('data-draft'))oldForm.setAttribute('data-draft',form.getAttribute('data-draft'));
   for(const field of form.elements){const old=field.name&&oldForm.elements.namedItem(field.name);if(old&&'value'in old&&field.type!=='file'&&old.value!==field.value)old.value=field.value;}
   form.replaceWith(oldForm);
  }else sources.set(form,source);
 }
 target.replaceChildren(template.content);target.chatRenderScope=scope;
 target.dataset.chatRenderRevision=String(Number(target.dataset.chatRenderRevision||0)+1);
 if(focused?.isConnected){focused.focus({preventScroll:true});if(caret)try{focused.setSelectionRange(...caret);}catch{}}
 if(selected?.anchor?.isConnected&&selected.focus?.isConnected)try{selection.setBaseAndExtent(selected.anchor,selected.anchorOffset,selected.focus,selected.focusOffset);}catch{}
 return {reused};
}

// Pointer-based card ordering works in Electron without dragging private text.
export function bindCardReorder(container,{selector,idOf,ids,commit}){
 let busy=false,suppressed=false;
 const perform=async(source,target,after)=>{if(busy||source===target)return;const order=ids.filter(id=>id!==source),index=order.indexOf(target);if(index<0)return;order.splice(index+(after?1:0),0,source);busy=true;try{await commit(order);}finally{busy=false;}};
 container.addEventListener('click',event=>{if(suppressed&&event.detail){event.preventDefault();event.stopImmediatePropagation();suppressed=false;}},true);
 container.querySelectorAll(selector).forEach(card=>{
  card.onkeydown=event=>{if(!event.altKey||!event.shiftKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const id=idOf(card),forward=['ArrowRight','ArrowDown'].includes(event.key),target=ids[ids.indexOf(id)+(forward?1:-1)];if(target)void perform(id,target,forward);};
  card.ondragstart=event=>event.preventDefault();
  card.onpointerdown=event=>{
   if(busy||event.button!==0||!event.isPrimary||event.target.closest('input,textarea,select,.actions'))return;
   suppressed=false;const start={x:event.clientX,y:event.clientY},pointer=event.pointerId;let dragging=false,target,after=false;
   const clear=()=>container.querySelectorAll('.workspace-tab-drop-before,.workspace-tab-drop-after').forEach(node=>node.classList.remove('workspace-tab-drop-before','workspace-tab-drop-after'));
   const finish=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',escape);clear();card.classList.remove('workspace-tab-dragging');if(card.hasPointerCapture(pointer))card.releasePointerCapture(pointer);};
   const cancel=()=>{suppressed=dragging;finish();};
   const escape=key=>{if(key.key==='Escape'){key.preventDefault();cancel();}};
   const move=next=>{if(next.pointerId!==pointer)return;if(!card.isConnected){cancel();return;}if(!dragging&&Math.hypot(next.clientX-start.x,next.clientY-start.y)<6)return;if(!dragging){dragging=true;suppressed=true;card.setPointerCapture(pointer);card.classList.add('workspace-tab-dragging');}next.preventDefault();clear();const node=document.elementFromPoint(next.clientX,next.clientY)?.closest(selector);target=node&&container.contains(node)&&node!==card?idOf(node):null;if(target){const rect=node.getBoundingClientRect(),origin=card.getBoundingClientRect();after=Math.abs(rect.y-origin.y)<rect.height/2?next.clientX>rect.x+rect.width/2:next.clientY>rect.y+rect.height/2;node.classList.add(after?'workspace-tab-drop-after':'workspace-tab-drop-before');}};
   const up=next=>{if(next.pointerId!==pointer)return;const destination=target,position=after,wasDragging=dragging;finish();if(wasDragging){next.preventDefault();if(destination)void perform(idOf(card),destination,position);}};
   document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',escape);
  };
 });
}

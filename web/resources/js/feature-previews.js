import {toJpeg} from 'html-to-image';

// Session-only, bounded previews. A screenshot never grants resource access and
// is discarded when its file view closes or revalidates. No relay or disk writes.
export function featurePreviews(){
 const images=new Map(),times=new Map();let pending=null,epoch=0;
 const forget=id=>{images.delete(id);times.delete(id);epoch++;};
 async function capture(id,node){
  if(!id||!node?.isConnected||node.closest('[hidden]')||document.hidden||pending||Date.now()-(times.get(id)||0)<5000)return;
  // Cross-origin browser contents cannot be captured by a web client.
  if(node.querySelector('iframe')){forget(id);return;}
  const version=epoch,width=Math.min(1600,node.clientWidth),height=Math.min(1000,node.clientHeight);
  if(width<1||height<1)return;
  times.set(id,Date.now());
  pending=(async()=>{try{
   const src=await toJpeg(node,{width,height,canvasWidth:320,canvasHeight:200,pixelRatio:1,quality:.6,skipFonts:true,backgroundColor:getComputedStyle(node).backgroundColor,filter:child=>{
    if(!(child instanceof Element))return true;
    if(child.matches('iframe,canvas,input[type=password],[data-private],[data-no-preview]'))return false;
    if(child.matches('img'))return /^(data:|blob:)/.test(child.getAttribute('src')||'');
    return true;
   }});
   if(version!==epoch||!node.isConnected||node.closest('[hidden]')||src.length>180000)return;
   images.delete(id);images.set(id,src);while(images.size>20)images.delete(images.keys().next().value);
  }catch{/* A failed or unsupported capture keeps the ordinary resource icon. */}})();
  try{await pending;}finally{pending=null;}
 }
 return {capture,get:id=>images.get(id),forget,clear(){epoch++;images.clear();times.clear();}};
}

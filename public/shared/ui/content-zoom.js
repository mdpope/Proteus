export function bindPinchZoom(surface,getScale,setScale){
 let gesture=null;
 const wheel=event=>{
  if(!event.ctrlKey||!Number.isFinite(event.deltaY))return;
  event.preventDefault();event.stopPropagation();
  if(gesture===null)setScale(getScale()*Math.exp(-Math.max(-80,Math.min(80,event.deltaY))*.012),event);
 };
 const start=event=>{gesture=getScale();event.preventDefault();event.stopPropagation();};
 const change=event=>{if(gesture!==null&&Number.isFinite(event.scale)){event.preventDefault();event.stopPropagation();setScale(gesture*event.scale,event);}};
 const end=event=>{gesture=null;event.preventDefault();};
 const handlers={wheel,gesturestart:start,gesturechange:change,gestureend:end};
 for(const [type,handler] of Object.entries(handlers))surface.addEventListener(type,handler,{passive:false});
 return ()=>{for(const [type,handler] of Object.entries(handlers))surface.removeEventListener(type,handler);};
}

export function zoomControl({label,min=75,max=200,onSize}){
 const element=document.createElement('div');element.className='document-size-control';
 const caption=document.createElement('label'),name=document.createTextNode('');
 caption.append(name);
 const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step='1';
 caption.append(input);
 const output=document.createElement('span');output.setAttribute('aria-hidden','true');
 const reset=document.createElement('button');reset.type='button';reset.textContent='100%';
 const rename=label=>{
  name.textContent=label;input.setAttribute('aria-label',label);
  reset.title='Reset '+label.toLowerCase()+' to 100%';reset.setAttribute('aria-label',reset.title);
 };
 rename(label);
 element.append(caption,output,reset);
 input.oninput=()=>onSize(Number(input.value));
 reset.onclick=()=>onSize(100);
 return {element,rename,value(percent){
  const size=Math.round(percent),display=size+'%';
  input.value=String(size);input.setAttribute('aria-valuetext',display);output.textContent=display;reset.disabled=size===100;
 }};
}

export function bindDocumentZoom(surface,{targets,controls,label,preference='document',wrapDefault=true,onWrap,onZoom}={}){
 const key='proteus.content-size.'+preference;
 let value=100,wrapped=wrapDefault,wrap;
 try{
  const stored=Number(localStorage.getItem(key));if(stored>=75&&stored<=200)value=stored;
  const setting=localStorage.getItem(key+'.wrap');if(setting!==null)wrapped=setting==='true';
 }catch{}
 const control=controls||label?zoomControl({label:label||'Document size',onSize:percent=>setSize(percent/100)}):null;
 if(controls){
  controls.append(control.element);
  if(onWrap){
   wrap=document.createElement('button');wrap.type='button';wrap.textContent='Wrap';wrap.setAttribute('aria-label','Wrap long lines');
   wrap.onclick=()=>{wrapped=!wrapped;applyWrap();try{localStorage.setItem(key+'.wrap',String(wrapped));}catch{}};controls.append(wrap);
  }
 }
 const contents=()=>typeof targets==='function'?targets():targets||[surface];
 const applySize=()=>{
  for(const target of contents())if(target)target.style.setProperty('zoom',String(value/100));
  control?.value(value);
 };
 const applyWrap=()=>{surface.classList.toggle('document-no-wrap',!wrapped);wrap?.setAttribute('aria-pressed',String(wrapped));onWrap?.(wrapped);};
 function setSize(scale,event){
  const next=Math.max(75,Math.min(200,Math.round(scale*100)));if(!Number.isFinite(next)||next===value)return;
  const previous=value;value=next;applySize();onZoom?.(value/previous,event);
  try{localStorage.setItem(key,String(value));}catch{}
 }
 applySize();applyWrap();
 const dispose=bindPinchZoom(surface,()=>value/100,setSize);
 return {mountControls(container){
  if(control&&container&&control.element.parentElement!==container){
   try{const stored=Number(localStorage.getItem(key));if(stored>=75&&stored<=200)value=stored;}catch{}
   applySize();container.append(control.element);
  }
 },refresh(){applySize();applyWrap();},dispose};
}

// A scaled image occupies layout space so ordinary two-finger scrolling can
// reach every edge, including in a modal dialog or a narrow file preview.
export function imageViewport(image){
 const viewport=document.createElement('div');viewport.className='image-zoom-viewport';viewport.tabIndex=0;
 viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Image preview');viewport.append(image);
 let scale=1;
 const control=zoomControl({label:'Image zoom',min:50,max:500,onSize:percent=>percent===100?reset():zoom(percent/100)});
 control.value(100);
 function fit(){
  if(!image.naturalWidth||!viewport.clientWidth)return;
  const ratio=image.naturalWidth/image.naturalHeight;
  const base=Math.min(image.naturalWidth,viewport.offsetWidth,innerHeight*.68*ratio);
  viewport.style.height=Math.ceil(base/ratio)+'px';image.style.width=base*scale+'px';
 }
 function zoom(value,event){
  const next=Math.max(.5,Math.min(5,Math.round(value*100)/100));if(!Number.isFinite(next)||next===scale)return;
  const frame=viewport.getBoundingClientRect(),before=image.getBoundingClientRect();
  const x=event?.clientX||frame.left+frame.width/2,y=event?.clientY||frame.top+frame.height/2;
  scale=next;control.value(scale*100);fit();const after=image.getBoundingClientRect();
  const layoutScale=frame.width/viewport.offsetWidth||1;
  if(before.width&&before.height){viewport.scrollLeft+=(after.left+(x-before.left)*after.width/before.width-x)/layoutScale;viewport.scrollTop+=(after.top+(y-before.top)*after.height/before.height-y)/layoutScale;}
 }
 image.addEventListener('load',fit);
 bindPinchZoom(viewport,()=>scale,zoom);
 viewport.onkeydown=event=>{
  const keys={'+':1.2,'=':1.2,'-':1/1.2};
  if(event.key==='0'||keys[event.key]){event.preventDefault();event.stopPropagation();if(event.key==='0')reset();else zoom(scale*keys[event.key]);}
 };
 requestAnimationFrame(fit);
 function reset(){scale=1;fit();viewport.scrollTo(0,0);control.value(100);}
 return {viewport,controls:control.element,reset};
}

export function imageZoomView(image){
 const {viewport,controls}=imageViewport(image);
 const container=document.createElement('div');container.className='image-zoom-view';
 container.append(controls,viewport);return container;
}

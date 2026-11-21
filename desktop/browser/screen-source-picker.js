const field=document.querySelector('#filter'),area=document.querySelector('#sources'),share=document.querySelector('[type=submit]');
window.captureChoice.onSources(({token,origin,items,palette})=>{
 document.querySelector('#site').textContent='Choose what to share with '+origin;
 for(const [property,key] of [['panel','menu'],['ink','ink'],['line','menuBorder'],['accent','accent'],['selected','sidebarSelected']]){
  if(/^#[a-f0-9]{6}$/i.test(palette[key]||''))document.documentElement.style.setProperty('--'+property,palette[key]);
 }
 const choose=index=>window.captureChoice.select({token,index});
 const render=()=>{
  share.disabled=true;
  const form=document.createElement('form');form.id='choices';area.replaceChildren(form);
  const query=field.value.trim().toLowerCase();
  for(const [display,title] of [[true,'Screens'],[false,'Windows']]){
   const matches=items.map((item,index)=>({...item,index})).filter(item=>item.display===display&&item.name.toLowerCase().includes(query));
   if(!matches.length)continue;
   const heading=document.createElement('h2'),grid=document.createElement('div');
   heading.textContent=title;grid.className='sources-grid';form.append(heading,grid);
   for(const item of matches){
    const label=document.createElement('label'),radio=document.createElement('input');
    label.className='option';radio.type='radio';radio.name='source';radio.value=item.index;
    radio.onchange=()=>{share.disabled=false;};
    const preview=document.createElement('span');
    preview.className='preview';preview.setAttribute('aria-hidden','true');
    if(item.preview){
     // Keep the card width while giving tall sources up to twice the 16:9 height.
     preview.style.aspectRatio=String(Math.max(8/9,Math.min(16/9,item.aspect)));
     const image=document.createElement('img');
     image.alt='';image.loading='lazy';image.decoding='async';image.src=item.preview;
     preview.append(image);
    }else{
     const unavailable=document.createElement('span');
     unavailable.textContent='Preview unavailable';preview.append(unavailable);
    }
    const caption=document.createElement('span'),name=document.createElement('span');
    caption.className='source-caption';name.textContent=item.name;name.title=item.name;
    caption.append(radio,name);label.append(preview,caption);grid.append(label);
   }
  }
  if(!form.children.length){const empty=document.createElement('p');empty.textContent='No matching screens or windows.';form.append(empty);}
  form.onsubmit=event=>{event.preventDefault();const value=new FormData(form).get('source');if(value!==null)choose(Number(value));};
 };
 document.querySelector('#cancel').onclick=()=>choose(null);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();choose(null);}});
 field.oninput=render;render();field.focus();
});

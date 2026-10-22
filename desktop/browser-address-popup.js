window.addressPopup.onUpdate(value=>{
 for(const [key,color]of Object.entries(value.colors||{}))document.body.style.setProperty('--'+key,color);
 const list=document.querySelector('[role=listbox]');list.replaceChildren();
 for(const [index,item]of value.items.entries()){const button=document.createElement('button');button.setAttribute('role','option');button.setAttribute('aria-selected',String(index===value.selected));for(const [tag,text]of [['strong',item.title||item.url],['span',item.url],['small',item.detail]]){const el=document.createElement(tag);el.textContent=text;button.append(el);}button.onmousedown=event=>event.preventDefault();button.onclick=()=>window.addressPopup.choose(index);list.append(button);}
 if(!value.items.length){const p=document.createElement('p');p.textContent='No matching recent sites. Press Enter to search.';list.append(p);}
 list.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
});

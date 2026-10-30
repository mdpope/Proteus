let current;
window.notice.on(value=>{
 current=value;document.querySelector('span').textContent=value.message;
 const article=document.querySelector('article');article.style.backgroundColor=value.palette?.background||'';article.style.color=value.palette?.text||'';article.style.borderColor=value.palette?.border||'';
 document.querySelector('nav').replaceChildren(...value.actions.map((label,index)=>{const button=document.createElement('button');button.textContent=label;button.onclick=()=>{button.disabled=true;window.notice.action({id:value.id,action:index});};return button;}));
 document.querySelector('#dismiss').onclick=()=>window.notice.action({id:value.id,action:'dismiss'});
});
new ResizeObserver(()=>{if(current)window.notice.action({id:current.id,action:'height',height:document.querySelector('article').getBoundingClientRect().height+8});}).observe(document.querySelector('article'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current)window.notice.action({id:current.id,action:'dismiss'});});

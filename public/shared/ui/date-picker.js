// Chromium's native picker ignores custom palette colors. Keep the wire value
// unchanged and render one keyboard-accessible, token-colored calendar instead.
export function mountDatePicker(input,{time=false,timeZone}={}){
 const value=input.value;input.type='text';input.value=value;input.placeholder=time?'YYYY-MM-DDTHH:mm':'YYYY-MM-DD';input.setAttribute('aria-label',time?'Date and time':'Date');
 const wrapper=document.createElement('div');wrapper.className='proteus-date-input';input.replaceWith(wrapper);wrapper.append(input);
 const launch=document.createElement('button');launch.type='button';launch.textContent='▦';launch.setAttribute('aria-label',time?'Choose date and time':'Choose date');launch.title=launch.getAttribute('aria-label');wrapper.append(launch);
 launch.onclick=()=>{
  if(input.disabled)return;
  const dialog=document.createElement('dialog');dialog.className='proteus-date-picker';dialog.setAttribute('aria-label',launch.getAttribute('aria-label'));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let chosen=/^\d{4}-\d{2}-\d{2}/.test(input.value)?input.value.slice(0,10):today;
  if(!Number.isFinite(Date.parse(chosen+'T12:00:00Z'))||new Date(chosen+'T12:00:00Z').toISOString().slice(0,10)!==chosen)chosen=today;
  let [year,month]=chosen.split('-').map(Number);let hours=input.value.slice(11,13)||'09',minutes=input.value.slice(14,16)||'00';
  const button=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=fn;return b;};
  const commit=()=>{input.value=chosen+(time?'T'+hours.padStart(2,'0')+':'+minutes.padStart(2,'0'):'');input.dispatchEvent(new Event('input',{bubbles:true}));};
  function draw(){
   dialog.replaceChildren();const header=document.createElement('header'),title=document.createElement('strong');title.textContent=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(year,month-1,1));
   const move=offset=>{const date=new Date(year,month-1+offset,1);year=date.getFullYear();month=date.getMonth()+1;draw();};
   const previous=button('‹',()=>move(-1)),next=button('›',()=>move(1));previous.setAttribute('aria-label','Previous month');next.setAttribute('aria-label','Next month');header.append(previous,title,next);dialog.append(header);
   const grid=document.createElement('div');grid.className='proteus-calendar-grid';
   for(let day=0;day<7;day++){const label=document.createElement('span');label.textContent=new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(2026,10,1+day));grid.append(label);}
   for(let i=0;i<new Date(year,month-1,1).getDay();i++)grid.append(document.createElement('span'));
   for(let day=1;day<=new Date(year,month,0).getDate();day++){
    const date=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    const item=button(String(day),()=>{chosen=date;commit();if(time)draw();else dialog.close();});item.setAttribute('aria-label',date);item.setAttribute('aria-pressed',String(chosen===date));grid.append(item);
   }
   dialog.append(grid);
   if(time){
    const row=document.createElement('div');row.className='proteus-picker-time';
    let period=Number(hours)>=12?'PM':'AM';
    for(const [name,current,max] of [['Hour',String(Number(hours)%12||12),12],['Minute',minutes,59]]){
     const label=document.createElement('label');label.textContent=name+' ';const field=document.createElement('input');field.type='number';field.min=name==='Hour'?'1':'0';field.max=String(max);field.value=current;field.setAttribute('aria-label',name);
     field.oninput=event=>{event.stopPropagation();if(!field.validity.valid||field.value==='')return;if(name==='Hour')hours=String(Number(field.value)%12+(period==='PM'?12:0));else minutes=field.value;commit();};label.append(field);row.append(label);
    }
    const toggle=document.createElement('div');toggle.className='proteus-picker-period';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','AM or PM');
    for(const value of ['AM','PM']){const item=button(value,()=>{period=value;hours=String(Number(hours)%12+(period==='PM'?12:0));commit();toggle.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.textContent===period)));});item.setAttribute('aria-pressed',String(period===value));toggle.append(item);}row.append(toggle);dialog.append(row);
   }
   const footer=document.createElement('footer');footer.append(button('Today',()=>{chosen=today;[year,month]=chosen.split('-').map(Number);commit();draw();}),button('Clear',()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));dialog.close();}),button('Done',()=>dialog.close()));dialog.append(footer);
  }
  wrapper.append(dialog);draw();dialog.onclose=()=>{dialog.remove();launch.focus();};dialog.showModal();
 };
}

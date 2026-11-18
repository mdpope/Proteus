// Credentials stay on the local owner. The renderer consumes a projected catalog.
export function mountHome(host,{request,configure=false,openWebsite,isCurrent=()=>true}){
 let value=null,closed=false,pending=null,busy=false,search='',selectedService='',targets='',parameters='{}',lastResult='';
 const current=()=>!closed&&isCurrent(),el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const status=el('p');status.setAttribute('role','status');
 const pendingNotice=el('div');
 function showPending(){pendingNotice.replaceChildren();if(!pending)return;pendingNotice.append(el('p','This command has no completed receipt here. Check its result in Home Assistant before starting a different command.'),button('I checked the device; allow a new command',async()=>{pending=null;showPending();}));}
 async function perform(fn){if(busy||!current())return;busy=true;try{await fn();}catch(error){if(current()){status.textContent=error.message;showPending();}}finally{busy=false;}}
 async function load(){const next=await request({action:'view',refresh:true});if(!current())return;if(value&&value.accountId!==next.accountId)throw Error('Life account changed. Reopen Smart Home.');value=next;draw();}
 function button(label,fn){const node=el('button',label);node.type='button';node.onclick=()=>void perform(fn);return node;}
 async function execute(command){
  const signature=JSON.stringify(command);
  if(pending&&pending.signature!==signature)throw Error('Check the previous command before starting another.');
  pending??={signature,args:{action:'execute',...command,accountId:value.accountId,expectedRevision:value.revision,operationId:crypto.randomUUID()}};
  const result=await request(pending.args);if(!current())return;
  pending=null;lastResult=result.answer;await load();status.textContent=lastResult;
 }
 function draw(){
  if(!current())return;host.replaceChildren(el('h2','Smart Home'),status,pendingNotice);status.textContent=lastResult;showPending();
  host.append(el('p','All devices and services exposed by Home Assistant are available to Life Ask. New devices appear automatically when you refresh or make a voice request.'));
  const actions=el('div');actions.className='actions';actions.append(button('Refresh devices',load));
  if(value.origin)actions.append(button('Open Home Assistant',()=>openWebsite(value.origin)));
  host.append(actions);
  if(configure){
   const details=el('details'),summary=el('summary',value.configured?'Connection settings':'Connect Home Assistant');details.open=!value.configured;details.append(summary);
   const form=el('form'),origin=el('input'),token=el('input');origin.type='url';origin.value=value.origin||'';origin.placeholder='http://automation.example.test:8123';origin.setAttribute('aria-label','Home Assistant address');
   token.type='password';token.autocomplete='new-password';token.setAttribute('aria-label','Home Assistant access token');token.placeholder=value.configured?'Leave blank to keep saved token':'Long-lived access token';
   form.append(origin,token,el('p','Create an access token in your Home Assistant profile. Proteus encrypts it on this computer; it is never shared with the phone or sent to the model.'));
   const connect=el('button',value.configured?'Save connection':'Connect Home Assistant');connect.type='submit';form.append(connect);
   form.onsubmit=event=>{event.preventDefault();void perform(async()=>{const next=await request({action:'configure',accountId:value.accountId,expectedRevision:value.revision,origin:origin.value,token:token.value});token.value='';if(!current())return;value=next;draw();});};details.append(form);host.append(details);
  }
  if(!value.configured){host.append(el('p','Connect Home Assistant in Life → Smart Home on the owning desktop first.'));return;}
  const services=value.services||[],entities=value.entities||[];
  host.append(el('p',entities.length+' devices · '+services.length+' services · Connected'));
  const form=el('form'),select=el('select'),target=el('input'),data=el('textarea'),hint=el('p');
  select.setAttribute('aria-label','Home Assistant service');const empty=el('option','Choose a service');empty.value='';select.append(empty);
  for(const service of services){const option=el('option',service.domain+'.'+service.service+' · '+service.name);option.value=service.domain+'.'+service.service;select.append(option);}
  select.value=selectedService;select.onchange=()=>{selectedService=select.value;describe();};
  target.setAttribute('aria-label','Target entity IDs');target.placeholder='light.office, light.kitchen';target.value=targets;target.oninput=()=>targets=target.value;
  data.setAttribute('aria-label','Service parameters (JSON)');data.value=parameters;data.rows=3;data.oninput=()=>parameters=data.value;
  function describe(){const service=services.find(row=>row.domain+'.'+row.service===selectedService);hint.textContent=service?[service.description,...service.fields.map(field=>field.name+(field.required?' (required)':'')+': '+field.description)].filter(Boolean).join(' · '):'Choose an exposed service and the exact devices to control.';}
  const send=el('button','Run service');send.type='submit';form.append(select,hint,target,data,send);form.onsubmit=event=>{event.preventDefault();void perform(async()=>{const [domain,service]=selectedService.split('.');if(!domain||!service)throw Error('Choose a service.');await execute({domain,service,entityIds:targets.split(',').map(id=>id.trim()).filter(Boolean),data:JSON.parse(parameters)});});};describe();host.append(form);
  const filter=el('input');filter.type='search';filter.value=search;filter.placeholder='Search devices';filter.setAttribute('aria-label','Search devices');const list=el('div');list.className='life-home-devices';
  function devices(){
   list.replaceChildren();
   for(const entity of entities.filter(row=>(row.name+' '+row.id+' '+row.state).toLocaleLowerCase().includes(search.toLocaleLowerCase()))){
    const row=el('article');row.className='life-record';row.append(el('strong',entity.name),el('p',entity.id+' · '+entity.state));
    row.append(button('Control '+entity.name,()=>{targets=entity.id;target.value=targets;const candidate=services.find(item=>item.domain===entity.domain);selectedService=candidate?candidate.domain+'.'+candidate.service:'';select.value=selectedService;describe();select.focus();}));
    for(const [service,title] of [['turn_on','On'],['turn_off','Off']])if(services.some(item=>item.domain===entity.domain&&item.service===service))row.append(button(title,()=>execute({domain:entity.domain,entityIds:[entity.id],service,data:{}})));
    list.append(row);
   }
   if(!list.childElementCount)list.append(el('p','No matching devices.'));
  }
  filter.oninput=()=>{search=filter.value;devices();};devices();host.append(filter,list);
 }
 host.replaceChildren(status);status.textContent='Connecting to Home Assistant…';void perform(load);
 return {destroy(){closed=true;host.replaceChildren();}};
}

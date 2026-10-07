// The sidebar owns sections. The top strip contains only content the user opened.
import {mount as mountMarkdown} from '../../../src/markdown-renderer.js';
import {openContextMenu} from './context-menu.js';
export function initShell(document=globalThis.document,window=globalThis.window) {
    const strip=document.querySelector('#shell-tabs'),account=document.body.dataset.browserAccount;
    if(!strip||!account)return;
    let sections;try{sections=JSON.parse(document.querySelector('#shell-sections').textContent);}catch{return;}
    const chatKey='proteus.chat-tabs.v1.'+account;
    const contentKey='proteus.content-tabs.v1.'+account;
    const scrollKey='proteus.tab-scroll.v1.'+account;
    const chatTitle=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Chat':'Chat';
    const validChat=tab=>tab&&/^[a-f0-9-]{36}$/i.test(tab.hostId||'')&&/^[a-zA-Z0-9_-]{1,100}$/.test(tab.id||'');
    let chats=[];try{const saved=JSON.parse(window.localStorage.getItem(chatKey));if(Array.isArray(saved))chats=saved.filter(validChat).slice(-32).map(({hostId,id,title})=>({hostId,id,title:chatTitle(title)}));}catch{}
    const validSchedule=tab=>tab&&/^[a-f0-9-]{36}$/i.test(tab.hostId||'')&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(tab.id||'');
    const cleanOrder=value=>{const seen=new Set();return (Array.isArray(value)?value:[]).flatMap(item=>{const tab=item==='browser-home'||item?.type==='browser'?{type:'browser'}:item?.type==='chat'&&validChat(item)?{type:'chat',hostId:item.hostId,id:item.id,title:chatTitle(item.title)}:item?.type==='schedule'&&validSchedule(item)?{type:'schedule',hostId:item.hostId,id:item.id,title:String(item.title||'Schedule').slice(0,120)}:item?.type==='file'&&/^[a-f0-9-]{36}$/i.test(item.id||'')?{type:'file',id:item.id,name:String(item.name||'Markdown file').slice(0,120)}:null;if(!tab)return [];const key=tab.type==='chat'||tab.type==='schedule'?`${tab.type}:${tab.hostId}:${tab.id}`:tab.type==='file'?`${tab.type}:${tab.id}`:tab.type;if(seen.has(key))return [];seen.add(key);return [tab];}).slice(0,40);};
    let order=[];try{order=cleanOrder(JSON.parse(window.localStorage.getItem(contentKey)));}catch{}
    const localFiles=new Map();let pendingFileId=null,activeFileId=null,cleared=false;
    let activeChat=null,activeSchedule=null;
    let active=document.body.dataset.shellSection;
    if(active==='browser-home'&&!order.some(item=>item.type==='browser'))order.push({type:'browser'});
    for(const descriptor of order.filter(item=>item.type==='chat')){const chat=chats.find(item=>item.hostId===descriptor.hostId&&item.id===descriptor.id);if(chat){if(chat.title==='Chat')chat.title=descriptor.title;else descriptor.title=chat.title;}else chats.push({hostId:descriptor.hostId,id:descriptor.id,title:descriptor.title});}
    for(const chat of chats)if(!order.some(item=>item.type==='chat'&&item.hostId===chat.hostId&&item.id===chat.id))order.push({type:'chat',hostId:chat.hostId,id:chat.id,title:chat.title});
    const persist=()=>{if(cleared)return;try{window.localStorage.setItem(contentKey,JSON.stringify(order));}catch{}};persist();
    const saveChats=()=>{if(cleared)return;try{window.localStorage.setItem(chatKey,JSON.stringify(chats.slice(-32).map(({hostId,id,title})=>({hostId,id,title:chatTitle(title)}))));}catch{}};
    const saveScroll=()=>{try{window.sessionStorage.setItem(scrollKey,String(strip.scrollLeft));}catch{}};
    const updateFade=()=>{strip.classList.toggle('fade-left',strip.scrollLeft>2);strip.classList.toggle('fade-right',strip.scrollLeft+strip.clientWidth<strip.scrollWidth-2);};
    strip.addEventListener('scroll',()=>{saveScroll();updateFade();},{passive:true});window.addEventListener('resize',updateFade);
    function restoreScroll(){let value=0;try{value=Number(window.sessionStorage.getItem(scrollKey))||0;}catch{}strip.scrollLeft=value;}
    function tab(label,url,selected,close,name){
        const item=document.createElement('div'),link=document.createElement('a');
        item.className='shell-tab'+(selected?' selected':'');item.draggable=true;link.href=url;link.textContent=label;link.title=label;if(selected)link.setAttribute('aria-current','page');item.append(link);
        if(close){const button=document.createElement('button');button.type='button';button.className='shell-tab-close';button.setAttribute('aria-label','Close '+name);button.textContent='×';button.onclick=event=>{event.preventDefault();event.stopPropagation();close();};item.append(button);}
        item.onclick=event=>{if(!event.target.closest('a,button')&&window.getSelection()?.isCollapsed!==false)link.click();};return item;
    }
    function chatIcon(){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:'17',height:'17',fill:'none',stroke:'currentColor','stroke-width':'1.8','aria-hidden':'true'}))icon.setAttribute(name,value);for(const d of ['M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z','M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4']){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);icon.append(path);}return icon;}
    function render(){
        const offset=strip.scrollLeft;strip.replaceChildren();
        for(const [orderIndex,descriptor] of order.entries()){
            if(descriptor.type==='browser'){
                const section=sections['browser-home'];if(!section)continue;
                const item=tab('◉ '+section.label,section.url,active==='browser-home'&&!activeChat,()=>{order=order.filter(item=>item!==descriptor);persist();if(active==='browser-home')window.location.assign(sections.home.url);else render();},section.label);item.dataset.orderIndex=orderIndex;strip.append(item);
            }else if(descriptor.type==='chat'){
                const chat=chats.find(value=>value.hostId===descriptor.hostId&&value.id===descriptor.id);if(!chat)continue;
                const selected=activeChat?.hostId===chat.hostId&&activeChat?.id===chat.id;
                const url='/remote?view=chats&host='+encodeURIComponent(chat.hostId)+'&chat='+encodeURIComponent(chat.id);
                const item=tab(chat.title||'Chat',url,selected,()=>{chats=chats.filter(value=>value.hostId!==chat.hostId||value.id!==chat.id);order=order.filter(value=>value!==descriptor);persist();saveChats();document.dispatchEvent(new CustomEvent('proteus:chat-close',{detail:{hostId:chat.hostId,id:chat.id}}));render();},chat.title||'Chat');item.querySelector('a').prepend(chatIcon());
                item.dataset.shellChat=chat.id;item.dataset.shellChatHost=chat.hostId;item.dataset.orderIndex=orderIndex;strip.append(item);
            }else if(descriptor.type==='schedule'){
                const selected=activeSchedule?.hostId===descriptor.hostId&&activeSchedule?.id===descriptor.id;
                const url='/remote?view=schedules&host='+encodeURIComponent(descriptor.hostId)+'&schedule='+encodeURIComponent(descriptor.id);
                const item=tab('◷ '+descriptor.title,url,selected,()=>{order=order.filter(value=>value!==descriptor);persist();if(selected)window.location.assign('/remote?view=schedules');else render();},descriptor.title);
                item.dataset.shellSchedule=descriptor.id;item.dataset.shellScheduleHost=descriptor.hostId;item.dataset.orderIndex=orderIndex;strip.append(item);
            }else if(descriptor.type==='file'){
                const selected=active==='file'&&activeFileId===descriptor.id;
                const item=tab('▤ '+descriptor.name,window.location.href,selected,()=>{localFiles.delete(descriptor.id);order=order.filter(value=>value!==descriptor);persist();if(selected)window.location.assign(sections.home.url);else render();},descriptor.name);
                item.querySelector('a').onclick=event=>{event.preventDefault();pendingFileId=descriptor.id;const content=localFiles.get(descriptor.id);if(content)showLocalFile(descriptor,content);else document.querySelector('#shell-file-picker')?.click();};item.dataset.orderIndex=orderIndex;strip.append(item);
            }
        }
        strip.scrollLeft=offset;updateFade();
        document.querySelectorAll('[data-shell-nav]').forEach(link=>{const selected=link.dataset.shellNav===active;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    }
    render();restoreScroll();
    const overviewButton=document.createElement('button');overviewButton.type='button';overviewButton.className='shell-overview-button';overviewButton.textContent='▦';overviewButton.setAttribute('aria-label','Tab overview');overviewButton.title='Tab overview';document.querySelector('#shell-add-menu')?.before(overviewButton);
    const overview=document.createElement('dialog');overview.className='shell-overview';overview.setAttribute('aria-label','Open tabs');document.body.append(overview);
    overviewButton.onclick=()=>{
        overview.replaceChildren();const heading=document.createElement('h2');heading.textContent='Open tabs';overview.append(heading);
        const add=(parent,label,url,callback)=>{const link=document.createElement(callback?'button':'a');link.textContent=label;if(callback){link.type='button';link.onclick=()=>{overview.close();callback();};}else link.href=url;parent.append(link);};
        let children={};try{children=JSON.parse(window.localStorage.getItem('proteus.chat-child-tabs.v1.'+account)||'{}');}catch{}
        for(const descriptor of order){
            if(descriptor.type==='chat')continue;
            if(descriptor.type==='browser')add(overview,'Browse',sections['browser-home'].url);
            if(descriptor.type==='schedule')add(overview,descriptor.title,'/remote?view=schedules&host='+encodeURIComponent(descriptor.hostId)+'&schedule='+encodeURIComponent(descriptor.id));
            if(descriptor.type==='file')add(overview,descriptor.name,'',()=>{const content=localFiles.get(descriptor.id);if(content)showLocalFile(descriptor,content);else{pendingFileId=descriptor.id;document.querySelector('#shell-file-picker')?.click();}});
        }
        for(const descriptor of order.filter(item=>item.type==='chat')){
            const group=document.createElement('section'),title=document.createElement('h3');title.textContent=descriptor.title||'Chat';group.append(title);
            const url='/remote?view=chats&host='+encodeURIComponent(descriptor.hostId)+'&chat='+encodeURIComponent(descriptor.id),saved=children[descriptor.hostId+':'+descriptor.id],items=Array.isArray(saved?.tabs)?saved.tabs:[];
            add(group,'Conversation',url+'&panel=conversation');for(const child of items){if(child.type==='browser')add(group,'Browser',url+'&panel=browser');if(child.type==='document'&&child.documentId)add(group,child.title||'Document',url+'&panel='+encodeURIComponent(child.documentId));}overview.append(group);
        }
        let team={};try{team=JSON.parse(window.localStorage.getItem('proteus.team-child-tabs.v1.'+account)||'{}');}catch{}
        if(Array.isArray(team.tabs)){const group=document.createElement('section'),title=document.createElement('h3');title.textContent='Team Tools';group.append(title);for(const tab of team.tabs)if(['overview','standup','browser'].includes(tab))add(group,tab==='overview'?'Team Tools':tab==='standup'?'Standup':'Browser',sections.team.url+'?tab='+tab);overview.append(group);}
        const close=document.createElement('button');close.type='button';close.textContent='Close overview';close.onclick=()=>overview.close();overview.append(close);overview.showModal();
    };
    let dragging=null;
    const move=(from,to)=>{if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=order.length||to>=order.length||from===to)return;const [tab]=order.splice(from,1);order.splice(to,0,tab);persist();render();strip.querySelector(`[data-order-index="${to}"]`)?.focus?.({preventScroll:true});};
    strip.addEventListener('dragstart',event=>{const item=event.target.closest('.shell-tab');if(!item)return;dragging=Number(item.dataset.orderIndex);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','proteus-tab');item.classList.add('dragging');});
    strip.addEventListener('dragover',event=>{const item=event.target.closest('.shell-tab');if(dragging===null||!item)return;event.preventDefault();event.dataTransfer.dropEffect='move';item.classList.add('drop-target');if(event.clientX<strip.getBoundingClientRect().left+24)strip.scrollLeft-=18;else if(event.clientX>strip.getBoundingClientRect().right-24)strip.scrollLeft+=18;});
    strip.addEventListener('dragleave',event=>event.target.closest('.shell-tab')?.classList.remove('drop-target'));
    strip.addEventListener('drop',event=>{const item=event.target.closest('.shell-tab');event.preventDefault();if(item&&dragging!==null)move(dragging,Number(item.dataset.orderIndex));dragging=null;});
    strip.addEventListener('dragend',()=>{dragging=null;strip.querySelectorAll('.dragging,.drop-target').forEach(item=>item.classList.remove('dragging','drop-target'));});
    strip.addEventListener('keydown',event=>{const item=event.target.closest('.shell-tab');if(!item||!event.ctrlKey||!event.shiftKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const index=Number(item.dataset.orderIndex);move(index,index+(event.key==='ArrowLeft'?-1:1));});
    strip.addEventListener('contextmenu',event=>{const item=event.target.closest('.shell-tab');if(!item)return;const index=Number(item.dataset.orderIndex),descriptor=order[index],siblings=[...strip.querySelectorAll('.shell-tab')];void openContextMenu(event,[...(descriptor?.type==='chat'?[{id:'rename',label:'Rename chat…'}]:[]),{id:'close',label:'Close tab'},{id:'close-others',label:'Close other tabs',enabled:siblings.length>1},{id:'close-right',label:'Close tabs to the right',enabled:index<order.length-1},{id:'move-left',label:'Move tab left',enabled:index>0},{id:'move-right',label:'Move tab right',enabled:index<order.length-1}]).then(choice=>{if(choice==='rename'){const request={hostId:descriptor.hostId,id:descriptor.id,handled:false};document.dispatchEvent(new CustomEvent('proteus:chat-rename',{detail:request}));if(!request.handled)window.location.assign('/remote?view=chats&host='+encodeURIComponent(descriptor.hostId)+'&chat='+encodeURIComponent(descriptor.id)+'&rename=1');return;}if(choice==='move-left'||choice==='move-right'){move(index,index+(choice==='move-left'?-1:1));return;}if(!choice)return;const indices=choice==='close'?[index]:choice==='close-others'?order.map((_,i)=>i).filter(i=>i!==index):order.map((_,i)=>i).filter(i=>i>index);const selectedRemoved=indices.some(i=>strip.querySelector(`[data-order-index="${i}"]`)?.classList.contains('selected'));for(const i of indices){const descriptor=order[i];if(descriptor?.type==='chat'){chats=chats.filter(chat=>chat.id!==descriptor.id||chat.hostId!==descriptor.hostId);document.dispatchEvent(new CustomEvent('proteus:chat-close',{detail:{hostId:descriptor.hostId,id:descriptor.id}}));}if(descriptor?.type==='file')localFiles.delete(descriptor.id);}order=order.filter((_,i)=>!indices.includes(i));saveChats();persist();if(selectedRemoved)window.location.assign(sections.home.url);else render();});});
    document.querySelector('#main-content')?.addEventListener('contextmenu',event=>{if(event.target.closest('input,textarea,select,a,img,#remote-workspace'))return;const target=event.target.closest('pre,code,td,dd,.engine-log-entry,.shell-local-file');if(!target)return;const selected=window.getSelection()?.toString()||'',items=selected?[{id:'selection',label:'Copy selection'}]:[{id:'value',label:target.classList.contains('engine-log-entry')?'Copy log entry':'Copy value or entry'}];void openContextMenu(event,items).then(async choice=>{if(!choice)return;try{await navigator.clipboard.writeText(choice==='selection'?selected:target.textContent||'');}catch{window.alert('Clipboard access is unavailable. Use your browser’s Copy command.');}});});
    document.addEventListener('proteus:chat-tabs',event=>{if(cleared)return;chats=(event.detail?.tabs||[]).filter(validChat).slice(-32).map(tab=>({hostId:tab.hostId,id:tab.id,title:chatTitle(tab.title)}));for(const chat of chats){const descriptor=order.find(item=>item.type==='chat'&&item.hostId===chat.hostId&&item.id===chat.id);if(descriptor)descriptor.title=chat.title;else order.push({type:'chat',hostId:chat.hostId,id:chat.id,title:chat.title});}activeChat=event.detail?.active||null;saveChats();persist();render();});
    document.addEventListener('proteus:schedule-open',event=>{if(cleared||!validSchedule(event.detail))return;const schedule=event.detail;let descriptor=order.find(item=>item.type==='schedule'&&item.hostId===schedule.hostId&&item.id===schedule.id);if(!descriptor){descriptor={type:'schedule',hostId:schedule.hostId,id:schedule.id,title:String(schedule.title||'Schedule').slice(0,120)};order.push(descriptor);}else descriptor.title=String(schedule.title||descriptor.title).slice(0,120);activeSchedule={hostId:schedule.hostId,id:schedule.id};activeChat=null;persist();render();});
    document.addEventListener('proteus:section',event=>{active=event.detail?.key||active;document.body.dataset.shellSection=active;activeChat=null;activeSchedule=null;render();document.querySelector('#shell-recent-chats')?.toggleAttribute('hidden',active!=='chats');});
    document.addEventListener('proteus:open-browser',()=>{if(!order.some(item=>item.type==='browser'))order.push({type:'browser'});persist();window.location.assign(sections['browser-home'].url);});
    const menu=document.querySelector('#shell-add-menu');
    menu?.addEventListener('click',event=>{const action=event.target.closest('[data-shell-create]')?.dataset.shellCreate;if(!action)return;menu.open=false;if(action==='browser')document.dispatchEvent(new CustomEvent('proteus:open-browser'));if(action==='chat')window.location.assign('/remote?view=chats&new=1');if(action==='markdown')document.dispatchEvent(new CustomEvent('proteus:choose-file'));});
    document.addEventListener('proteus:choose-file',()=>{pendingFileId=null;document.querySelector('#shell-file-picker')?.click();});
    function showLocalFile(descriptor,content){const main=document.querySelector('#main-content');if(!main)return;main.replaceChildren();const article=document.createElement('article'),heading=document.createElement('h1'),body=document.createElement('div');article.className='card shell-local-file';heading.textContent=descriptor.name;article.append(heading,body);main.append(article);mountMarkdown(body,content,{copy:value=>navigator.clipboard.writeText(value),link:url=>{if(/^https?:\/\//i.test(url))window.open(url,'_blank','noopener,noreferrer');}});active='file';activeFileId=descriptor.id;activeChat=null;render();}
    document.querySelector('#shell-file-picker')?.addEventListener('change',async event=>{
        const file=event.target.files?.[0];if(!file)return;
        if(file.size>2*1024*1024){window.alert('Choose a Markdown file smaller than 2 MB.');return;}
        const text=await file.text();const main=document.querySelector('#main-content');if(!main)return;
        const opened={file,text,handled:false};document.dispatchEvent(new CustomEvent('proteus:open-local-file',{detail:opened}));event.target.value='';if(opened.handled)return;
        const descriptor=order.find(item=>item.type==='file'&&item.id===pendingFileId)||{type:'file',id:crypto.randomUUID(),name:file.name.slice(0,120)};
        descriptor.name=file.name.slice(0,120);if(!order.includes(descriptor))order.push(descriptor);pendingFileId=null;localFiles.set(descriptor.id,text);persist();showLocalFile(descriptor,text);
    });
    const clear=()=>{cleared=true;chats=[];order=[];localFiles.clear();strip.replaceChildren();document.querySelector('.shell-local-file')?.remove();try{window.localStorage.removeItem(chatKey);window.localStorage.removeItem(contentKey);window.localStorage.removeItem('proteus.team-child-tabs.v1.'+account);window.localStorage.removeItem('proteus.chat-child-tabs.v1.'+account);window.sessionStorage.removeItem(scrollKey);window.localStorage.removeItem(`proteus-remote-ui:${account}`);}catch{}};
    document.querySelector('form[action$="/logout"]')?.addEventListener('submit',clear);
    window.addEventListener('storage',event=>{if(event.key===contentKey){try{order=cleanOrder(JSON.parse(event.newValue));render();}catch{}}});
    if(typeof window.BroadcastChannel==='function'){const channel=new window.BroadcastChannel('proteus-remote-account');channel.addEventListener('message',event=>{if(event.data?.type==='logout'&&event.data.account===account)clear();});window.addEventListener('pagehide',()=>channel.close(),{once:true});}
}
initShell();

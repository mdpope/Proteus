// Persist navigation keys only. Labels, routes, user records and remote state never enter storage.
export function initShell(document=globalThis.document,window=globalThis.window) {
    const host=document.querySelector('#shell-tabs'),account=document.body.dataset.browserAccount;
    if(!host||!account)return;
    const keys=['life','chats','schedules','workspaces','inbox','fuel','nutrition','connections','security','team','browser-home','engine-room','attention','transcription'];
    let source;try{source=JSON.parse(document.querySelector('#shell-sections').textContent);}catch{return;}
    const sections=Object.fromEntries(keys.flatMap(key=>{
        const value=source[key];if(!value||typeof value.label!=='string'||typeof value.url!=='string')return [];
        try{const url=new URL(value.url,window.location.origin);if(url.origin!==window.location.origin||url.username||url.password)return [];return [[key,{label:value.label,url:url.href,icon:value.icon||''}]];}catch{return [];}
    }));
    if(!sections.life)return;
    const storageKey='proteus.sections.v1.'+account;
    let active=keys.includes(document.body.dataset.shellSection)?document.body.dataset.shellSection:'life';
    const clean=value=>['life',...(Array.isArray(value)?value:[]).filter(key=>typeof key==='string'&&key!=='life'&&sections[key]&&keys.includes(key))].filter((key,index,array)=>array.indexOf(key)===index).slice(0,keys.length);
    let tabs=['life'];try{tabs=clean(JSON.parse(window.localStorage.getItem(storageKey)));}catch{}
    const chatKey='proteus.chat-tabs.v1.'+account;
    const validChat=tab=>tab&&/^[a-f0-9-]{36}$/i.test(tab.hostId||'')&&/^[a-zA-Z0-9_-]{1,100}$/.test(tab.id||'');
    let chats=[];try{const saved=JSON.parse(window.localStorage.getItem(chatKey));if(Array.isArray(saved))chats=saved.filter(validChat).slice(-32).map(({hostId,id})=>({hostId,id,title:'Chat'}));}catch{}
    let activeChat=null;
    const persist=()=>{try{window.localStorage.setItem(storageKey,JSON.stringify(tabs));}catch{}};
    function chatIcon(){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:'16',height:'16',fill:'none',stroke:'currentColor','stroke-width':'1.8','aria-hidden':'true'}))icon.setAttribute(name,value);for(const d of ['M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z','M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4']){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);icon.append(path);}return icon;}
    function render() {
        host.replaceChildren();
        for(const key of tabs){
            const section=sections[key],item=document.createElement('div'),link=document.createElement('a');
            item.className='shell-tab'+(key===active&&!activeChat?' selected':'');item.dataset.shellTab=key;
            link.href=section.url;link.textContent=section.icon+' '+section.label;if(key==='chats'){link.textContent=' '+section.label;const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('width','16');icon.setAttribute('height','16');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.8');icon.setAttribute('aria-hidden','true');for(const d of ['M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z','M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4']){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);icon.append(path);}link.prepend(icon);}link.dataset.shellLink=key;if(key===active&&!activeChat)link.setAttribute('aria-current','page');item.append(link);
            if(key!=='life'){
                const close=document.createElement('button');close.type='button';close.className='shell-tab-close';close.setAttribute('aria-label','Close '+section.label);close.textContent='×';close.dataset.shellClose=key;
                close.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();tabs=tabs.filter(item=>item!==key);persist();if(active===key)window.location.assign(sections.life.url);else render();});item.append(close);
            }
            item.addEventListener('click',event=>{if(event.target.closest('a,button'))return;if(window.getSelection()?.isCollapsed===false)return;link.click();});
            host.append(item);
        }
        for(const chat of chats){
            const item=document.createElement('div'),link=document.createElement('a'),close=document.createElement('button');
            const selected=activeChat?.hostId===chat.hostId&&activeChat?.id===chat.id;
            item.className='shell-tab'+(selected?' selected':'');item.dataset.shellChat=chat.id;item.dataset.shellChatHost=chat.hostId;
            link.href='/remote?view=chats&host='+encodeURIComponent(chat.hostId)+'&chat='+encodeURIComponent(chat.id);link.textContent=' '+(chat.title||'Chat');link.prepend(chatIcon());link.title=(chat.title||'Chat')+(chat.label?' · '+chat.label:'');if(selected)link.setAttribute('aria-current','page');
            close.type='button';close.className='shell-tab-close';close.textContent='×';close.setAttribute('aria-label','Close '+(chat.title||'Chat'));
            close.onclick=event=>{event.preventDefault();event.stopPropagation();chats=chats.filter(tab=>tab.hostId!==chat.hostId||tab.id!==chat.id);try{window.localStorage.setItem(chatKey,JSON.stringify(chats.map(({hostId,id})=>({hostId,id}))));}catch{}document.dispatchEvent(new CustomEvent('proteus:chat-close',{detail:{hostId:chat.hostId,id:chat.id}}));render();};
            item.append(link,close);item.onclick=event=>{if(!event.target.closest('a,button'))link.click();};host.append(item);
        }
        const create=document.createElement('a');create.className='shell-new-chat';create.href='/remote?view=chats&new=1';create.setAttribute('aria-label','New Chat');create.title='New Chat';create.textContent='+';create.append(chatIcon());host.append(create);
        document.querySelectorAll('[data-shell-nav]').forEach(link=>{const current=link.dataset.shellNav===active;link.classList.toggle('active',current);if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    }
    function visit(key){if(!sections[key])return;activeChat=null;active=key;document.body.dataset.shellSection=key;tabs=clean([...tabs,key]);persist();render();}
    visit(active);
    document.addEventListener('proteus:chat-tabs',event=>{chats=(event.detail?.tabs||[]).filter(validChat).slice(-32);activeChat=event.detail?.active||null;render();});
    document.addEventListener('proteus:section',event=>{if(['chats','schedules','workspaces','attention','transcription','engine-room'].includes(event.detail?.key)){visit(event.detail.key);document.querySelector('#shell-recent-chats')?.toggleAttribute('hidden',event.detail.key!=='chats');}});
    const clear=()=>{try{window.localStorage.removeItem(storageKey);window.localStorage.removeItem('proteus.chat-tabs.v1.'+account);window.localStorage.removeItem(`proteus-remote-ui:${account}`);}catch{}};
    document.querySelector('form[action$="/logout"]')?.addEventListener('submit',clear);
    window.addEventListener('storage',event=>{if(event.key===storageKey){try{tabs=clean(JSON.parse(event.newValue));if(!tabs.includes(active))tabs=clean([...tabs,active]);render();}catch{}}});
    if(typeof window.BroadcastChannel==='function'){
        const channel=new window.BroadcastChannel('proteus-remote-account');channel.addEventListener('message',event=>{if(event.data?.type==='logout'&&event.data.account===account)clear();});window.addEventListener('pagehide',()=>channel.close(),{once:true});
    }
}
initShell();

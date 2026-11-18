let profiles=[{id:'default',name:'Default'}];
export function setBrowserProfiles(items){profiles=items.filter(item=>item.id==='default'||/^[a-f0-9-]{36}$/i.test(item.id));}
export function browserProfileMenu(){return profiles.map(item=>({id:item.id==='default'?'browser':'profile:'+item.id,label:'Browser - '+item.name}));}
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const chatIconPaths='<path d="M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z"/><path d="M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1 2 2h-3l-3 2v-4"/>';
export const tabAddIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>';
export const addTabIcons={reminder:'<path d="m3 6 2 2 3-4M11 6h10M3 13h4M11 13h10M3 20h4M11 20h10"/>',incognito:'<path d="M3 10h18M6 10l2-7h8l2 7M10 16h4"/><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/>',markdown:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 15V9l3 3 3-3v6m3-4h4m-2-2v6m-2-2 2 2 2-2"/>',browser:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m6 8 4 4-4 4m6 0h5"/>',chat:chatIconPaths};
addTabIcons.chat??=chatIconPaths;
export function addTabMenuEntries(scope,{agentTerminal=true}={}){
  const items=[['reminder','Reminders','reminder'],['scratch','Scratch','markdown'],['files','Workspace files','markdown'],['markdown','Markdown file','markdown'],['browser','Browser - Default','browser'],['incognito','Incognito tab','incognito'],...profiles.filter(item=>item.id!=='default').map(item=>['profile:'+item.id,'Browser - '+item.name,'browser']),['terminal','Terminal','terminal'],...(scope==='chat'&&agentTerminal?[['agent-terminal','Agent terminal output','terminal']]:[]),...(['main','workspace','life'].includes(scope)?[['new-chat','New chat','chat'],[scope==='main'?'internet-search':'internet','Internet Search','browser']]:[])];
  return items.map(([id,label,icon])=>({id,label,icon}));
}
export function addTabMenuItems(scope,options={}){
  const attribute={main:'id',chat:'data-chat-add',workspace:'data-chat-add',team:'data-team-add'}[scope];if(!attribute)throw new Error('Unknown tab menu scope.');
  return addTabMenuEntries(scope,options).map(({id:key,label,icon})=>`<button ${attribute}="${key}" type="button" ${key==='incognito'?`data-incognito-tab="${scope==='workspace'?'chat':scope}"`:''} ${key.startsWith('profile:')?`data-browser-profile="${escape(key.slice(8))}" data-profile-scope="${scope==='workspace'?'chat':scope}"`: ''}><svg aria-hidden="true" viewBox="0 0 24 24">${addTabIcons[icon]}</svg><span>${escape(label)}</span></button>`).join('');
}
export const tabOverviewIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 19H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><rect x="7" y="7" width="14" height="16" rx="2"/></svg>';
export const moreMenuIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r=".7" fill="currentColor"/><circle cx="12" cy="12" r=".7" fill="currentColor"/><circle cx="16" cy="12" r=".7" fill="currentColor"/></svg>';

export function tabSelectionHTML(actions){
 return '<div class="new-tab-actions">'+actions.map((action,index)=>'<button type="button" data-new-tab-action="'+index+'"'+(action.disabled?' disabled':'')+(action.reason?' title="'+escape(action.reason)+'"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'+(addTabIcons[action.icon]||addTabIcons.browser)+'</svg><span>'+escape(action.label)+'</span></button>').join('')+'</div>';
}

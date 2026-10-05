export const chatIconPaths='<path d="M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z"/><path d="M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1 2 2h-3l-3 2v-4"/>';
export const addTabIcons={markdown:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 15V9l3 3 3-3v6m3-4h4m-2-2v6m-2-2 2 2 2-2"/>',browser:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m6 8 4 4-4 4m6 0h5"/>',chat:chatIconPaths};
export function addTabMenuItems(scope){
  const attribute={main:'id',chat:'data-chat-add',team:'data-team-add'}[scope];if(!attribute)throw new Error('Unknown tab menu scope.');
  const items=[['markdown','Markdown file','markdown'],['browser','Browser','browser'],['terminal','Terminal','terminal'],...(scope==='main'?[['new-chat','New chat','chat']]:[])];
  return items.map(([key,label,icon])=>`<button ${attribute}="${key}" type="button"><svg aria-hidden="true" viewBox="0 0 24 24">${addTabIcons[icon]}</svg><span>${label}</span></button>`).join('');
}

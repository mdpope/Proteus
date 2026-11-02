let ui;
const processing=new Set();
export function recordBrowserIssue(detail){
  return Promise.resolve(window.desktop?.browserNotification?.({action:'record',...detail}));
}
export function mountBrowserIssueActions(container,item){
  if(!item.browserIssue||!window.desktop?.browserNotification)return;
  const choices=item.browserIssue.kind==='site-notification'?[['open-tab','Open website']]:item.browserIssue.kind==='history-conflict'?[['keep-history','Keep saved history'],['open-copy','Open pending page in new tab']]:[['open-tab','Open tab'],['reload','Reload'],['logs','View logs']];
  const actions=document.createElement('div');actions.className='actions';
  const status=document.createElement('p');status.className='note';status.setAttribute('role','status');
  for(const [intent,label]of choices){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=async()=>{button.disabled=true;try{await window.desktop.browserNotification({action:'act',id:item.notificationId||item.localId||item.id,intent});}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};actions.append(button);}
  container.append(actions,status);
}
export function initBrowserNotifications(options){
  ui=options;
  window.desktop?.onNotification?.(value=>{if(value.browserIssueId)void act(value);});
}
async function act({browserIssueId,issueAction='review',browserIssueTarget}){
  if(processing.has(browserIssueId))return;processing.add(browserIssueId);
  let item;
  try{
    item=(await ui.api('/api/notifications')).items.find(item=>item.id===browserIssueId);
    const issue=browserIssueTarget||item?.browserIssue;
    if(!issue||issue.windowId!==window.desktop.windowId)throw Error('This browser notification belongs to another window.');
    if(issueAction==='review'){await ui.refresh(true);ui.review(item);return;}
    if(issueAction==='keep-history'||issueAction==='open-copy'){
      if(issue.kind!=='history-conflict')throw Error('This is not a pending history conflict.');
      await ui.resolve(issue.scope,issueAction==='open-copy');
    }else if(issueAction==='logs')return ui.logs(issue.logId);
    else if(issueAction==='reload'||issueAction==='open-tab')await ui.browser(issue.tabId,issueAction);
    else throw Error('Choose an available browser notification action.');
    await ui.api('/api/notifications',{action:'read',id:item.id});await ui.refresh(true);
  }catch(error){
    // Keep recovery actions in the inbox, including an owner/action that disappeared.
    if(item)await recordBrowserIssue({...item.browserIssue,title:item.title,body:error.message}).catch(()=>{});
  }finally{processing.delete(browserIssueId);}
}

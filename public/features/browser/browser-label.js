// Presentation-only: profile decoration must never enter page titles or history.
export function browserLabel(tab) {
  if(tab.info?.incognito||tab.incognito)return (tab.customTitle||tab.info?.title||tab.title||tab.label||'New Tab')+' [Incognito]';
  if(tab.type==='browser'&&!tab.newChatDraft&&!tab.customTitle&&!tab.info?.url&&!tab.url)return 'New Tab';
  const title=tab.customTitle||(tab.type==='browser'&&!tab.newChatDraft?tab.info?.title||tab.nativeTitle||tab.label||tab.title:tab.label||tab.title)||'New Tab';
  if(tab.type!=='browser'||tab.newChatDraft)return title;
  const profile=tab.info?.profileName||tab.profileName;
  return profile?`${title} [${profile}]`:title;
}

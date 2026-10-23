// Presentation-only: profile decoration must never enter page titles or history.
export function browserLabel(tab) {
  const title=tab.customTitle||tab.label||tab.title||tab.info?.title||'New tab';
  if(tab.type!=='browser')return title;
  const profile=tab.info?.profileName||tab.profileName;
  return profile?`${title} [${profile}]`:title;
}

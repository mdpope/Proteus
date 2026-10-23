export function fileDatesText(value){
 const date=raw=>{const time=raw?new Date(raw):null;return time&&Number.isFinite(time.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'long'}).format(time):'Unknown';};
 return `Created: ${date(value?.fileCreatedAt)} · Modified: ${date(value?.fileModifiedAt)}`;
}

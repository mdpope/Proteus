export function shortReleaseDate(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return '';
 const value=new Date(date+'T00:00:00Z');
 if(!Number.isFinite(+value)||value.toISOString().slice(0,10)!==date)return '';
 return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(value);
}
export const versionLabel=value=>(value.version||'Unavailable')+(shortReleaseDate(value.releaseDate)?' · '+shortReleaseDate(value.releaseDate):'');

// File timestamps are optional display metadata, never source paths or approval evidence.
export function attachmentDates(value){
 const result={};for(const key of ['createdAt','modifiedAt'])if(value?.[key]!=null){
  const text=value[key];if(typeof text!=='string'||text.length>40||!/^\d{4}-\d\d-\d\dT/.test(text)||!Number.isFinite(Date.parse(text)))throw new Error('Invalid attachment file date.');
  result[key]=new Date(text).toISOString();
 }return result;
}

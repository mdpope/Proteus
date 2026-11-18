// Window-local presentation only: grouping never changes a tab's execution owner,
// workspace membership, document authority or browser profile. Ordinary tab APIs
// still own every resource. Private tabs participate only in the in-memory group.
export class FeatureTabGroups {
 constructor(saved={}) {
  this.groups={};this.privateIDs=new Set();
  for(const [account,row] of Object.entries(saved.groups||{}).slice(0,100)){
   if(!/^[a-zA-Z0-9_-]{1,128}$/.test(account)||!Array.isArray(row?.ids))continue;
   const ids=[...new Set(row.ids.filter(id=>typeof id==='string'&&id.length>0&&id.length<=256))].slice(0,1000);
   this.groups[account]={ids,homeAssistant:ids.includes(row.homeAssistant)?row.homeAssistant:null};
  }
 }
 group(account){if(!account)return {ids:[],homeAssistant:null};return this.groups[account]??={ids:[],homeAssistant:null};}
 contains(account,id){return !!account&&this.group(account).ids.includes(id);}
 add(account,id,{homeAssistant=false,afterId,private:incognito=false}={}){
  if(!account||!id)return;const row=this.group(account);
  if(!row.ids.includes(id)){const at=row.ids.indexOf(afterId);row.ids.splice(at<0?row.ids.length:at+1,0,id);}
  if(homeAssistant)row.homeAssistant=id;
  if(incognito)this.privateIDs.add(id);
 }
 replace(before,after,{private:incognito=false}={}){if(incognito)this.privateIDs.add(after);if(before===after)return;this.privateIDs.delete(before);for(const row of Object.values(this.groups)){if(!row.ids.includes(before))continue;row.ids=row.ids.filter(id=>id!==after);row.ids.splice(row.ids.indexOf(before),1,after);if(row.homeAssistant===before)row.homeAssistant=after;}}
 remove(id){this.privateIDs.delete(id);for(const row of Object.values(this.groups)){row.ids=row.ids.filter(item=>item!==id);if(row.homeAssistant===id)row.homeAssistant=null;}}
 remap(ids){for(const [before,after] of ids)if(before!==after)this.replace(before,after);}
 snapshot(tabs){const privateIDs=new Set([...this.privateIDs,...tabs.filter(tab=>tab.incognito||tab.info?.incognito).map(tab=>tab.id)]);return {version:1,groups:Object.fromEntries(Object.entries(this.groups).map(([account,row])=>[account,{ids:row.ids.filter(id=>!privateIDs.has(id)),homeAssistant:privateIDs.has(row.homeAssistant)?null:row.homeAssistant}]))};}
}

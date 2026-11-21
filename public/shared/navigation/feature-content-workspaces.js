import {FeatureTabGroups} from '../../models/feature-tab-groups.js';

// Presentation membership is window-local, independent of the actual resource
// owner. Incognito membership stays in memory through FeatureTabGroups.
export function createFeatureContentWorkspaces(ui){
 const key='proteus.feature-content-tabs.'+ui.windowId;let saved;try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch{saved={};}
 const groups=new FeatureTabGroups(saved),views=new Map(),listeners=new Map();
 const active={...saved.active};
 // Reminders/Scratchpad are page features; the Life features own the content tabs of their section.
 const features=['reminders','scratchpad','life-home','life-nutrition','life-garage'];
 const titles={reminders:'Reminders',scratchpad:'Scratchpad','life-home':'Smart Home','life-nutrition':'Nutrition','life-garage':'Garage'};
 const lifeSection=feature=>feature.startsWith('life-')?feature.slice(5):null;
 const binding=feature=>feature==='reminders'?'reminders_'+(ui.account()||'signedout'):feature==='scratchpad'?'scratchpad':'life_'+lifeSection(feature)+'_'+(ui.account()||'signedout');
 // The feature whose master page is showing (Life sections share the 'life' page).
 const masterFeature=()=>ui.selected()!=='overview'?null:['reminders','scratchpad'].includes(ui.page())?ui.page():ui.page()==='life'&&['home','nutrition','garage'].includes(ui.section?.())?'life-'+ui.section():null;
 const save=()=>{const snapshot=groups.snapshot(ui.tabs());snapshot.active=Object.fromEntries(Object.entries(active).filter(([binding,id])=>id===null||snapshot.groups[binding]?.ids.includes(id)));localStorage.setItem(key,JSON.stringify(snapshot));};
 const owner=id=>features.find(feature=>groups.contains(binding(feature),id));
 function adapter(feature){return {
  items:()=>groups.group(binding(feature)).ids.map(id=>ui.tabs().find(tab=>tab.id===id)).filter(tab=>tab&&!tab.hidden).map(tab=>({id:tab.id,title:ui.title(tab),closable:true,resource:true,icon:tab.type==='browser'?'browser':tab.type==='terminal'?'terminal':tab.type==='reminder'?'reminder':['run','remote-run'].includes(tab.type)?'chat':'markdown',browserInfo:tab.type==='browser'?{favicon:tab.info?.favicon,incognito:tab.info?.incognito,agentControlling:tab.info?.agentControlling}:undefined,url:tab.info?.incognito?'':tab.info?.url})),
  selected:()=>owner(ui.selected())===feature?ui.selected():null,
  select:id=>{if(owner(id)===feature)ui.select(id,feature);},
  activateMaster:()=>{if(masterFeature()!==feature)ui.master(feature);},
  close:async id=>{const selected=ui.selected()===id,epoch=ui.epoch();await ui.close(id);if(ui.tabs().some(tab=>tab.id===id))return;groups.remove(id);save();if(selected&&epoch===ui.epoch()&&[id,'overview'].includes(ui.selected()))ui.master(feature);},
  create:async entry=>{const captured=binding(feature),tab=await ui.create(entry);if(!tab)return;groups.add(captured,tab.id,{private:tab.incognito||tab.info?.incognito});save();if(captured===binding(feature))ui.select(tab.id,feature);},
  error:ui.error,subscribe:listener=>listeners.set(feature,listener),overview:()=>ui.overview(feature)
 };}
 return {adapter,owner,overviewGroups:()=>features.filter(feature=>ui.available?.(feature)!==false).map(feature=>({id:feature,home:{id:'feature-master:'+feature,type:'feature-master',feature,label:titles[feature]},title:titles[feature],ids:[...groups.group(binding(feature)).ids]})),activate(feature){const id=active[binding(feature)],tab=ui.tabs().find(row=>row.id===id&&!row.hidden&&!row.navigationClosed);if(tab&&owner(id)===feature)ui.select(id,feature);else ui.master(feature);},owns:id=>!!owner(id),adopt(feature,tab,options={}){groups.add(binding(feature),tab.id,options);save();},group:feature=>groups.group(binding(feature)),register(feature,view){views.set(feature,view);},render(){
  document.querySelector('#feature-content-navigation')?.remove();
  const feature=owner(ui.selected())||masterFeature();
  if(feature){const id=ui.selected()==='overview'?null:ui.selected(),key=binding(feature);if(active[key]!==id){active[key]=id;save();}}
  if(feature&&!views.has(feature))ui.initialize(feature);
  const view=views.get(feature);
  if(view){listeners.get(feature)?.();view.bar.id='feature-content-navigation';document.querySelector('#main').before(view.bar);}
 },update(){const feature=owner(ui.selected())||masterFeature()||ui.page();listeners.get(feature)?.();},inherit(before,tab){const feature=owner(before);if(feature){groups.add(binding(feature),tab.id,{afterId:before,private:tab.incognito||tab.info?.incognito});save();}},replace(before,tab){groups.replace(before,tab.id,{private:tab.incognito||tab.info?.incognito});save();},remove(id){groups.remove(id);save();},restore(ids){groups.remap(ids);save();}};
}

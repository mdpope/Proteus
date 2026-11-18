import {createResourceRecents} from '../../models/resource-recents.js';

export function createResourceSidebarRecents({storage,key='proteus.resource-recents',escape,age,icon,computer,changed,detailed=()=>true}){
 const history=createResourceRecents({load:()=>JSON.parse(storage.getItem(key)||'[]'),save:rows=>{try{storage.setItem(key,JSON.stringify(rows));}catch{}}});
 const limits=new Map();
 return {
  remember(feature,binding,record,options){if(record?.deletedAt){if(history.remove(feature,binding,record.id))changed();return;}if(history.remember(feature,binding,record,options))changed();},
  remove(feature,binding,id){if(history.remove(feature,binding,id))changed();},
  reset(){limits.clear();},
  // `binding` null lists the feature's history from every computer (Scratchpad); `valid` hides rows whose storage changed.
  markup(feature,binding,selected,{valid=()=>true}={}){
   const rows=(binding===null?history.all(feature).filter(row=>valid(row.binding)):history.rows(feature,binding)),limit=limits.get(feature)||7;
   const label=row=>feature==='scratchpad'?computer(row.binding):'';
   return rows.slice(0,limit).map(row=>{const owner=label(row);return !detailed()?`<button class="navchild ${selected===row.id?'active':''}" data-resource-recent="${escape(row.id)}" data-resource-binding="${escape(row.binding)}" data-resource-feature="${feature}" title="${escape(row.title)}"><span>${escape(row.title)}</span>${owner?`<small>${escape(owner)}</small>`:''}</button>`:`<button class="navchild preview-tree-item ${selected===row.id?'active':''}" data-resource-recent="${escape(row.id)}" data-resource-binding="${escape(row.binding)}" data-resource-feature="${feature}" title="${escape(row.title)}"><span class="preview-tree-icon" aria-hidden="true">${icon(feature)}</span><span class="preview-tree-copy"><span class="preview-tree-title">${escape(row.title)}</span>${owner?`<small class="preview-tree-computer">${escape(owner)}</small>`:''}</span><small class="preview-tree-age" title="${escape(new Date(row.at).toLocaleString())}">${escape(age(row.at))}</small></button>`;}).join('')+(rows.length>limit?`<button class="navchild preview-tree-more" data-resource-more="${feature}">More…</button>`:'');
  },
  bind(root,open){
   root.querySelectorAll('[data-resource-recent]').forEach(button=>button.onclick=()=>open(button.dataset.resourceFeature,button.dataset.resourceRecent,button.dataset.resourceBinding));
   root.querySelectorAll('[data-resource-more]').forEach(button=>button.onclick=()=>{const feature=button.dataset.resourceMore;limits.set(feature,(limits.get(feature)||7)+4);changed(feature);});
  }
 };
}

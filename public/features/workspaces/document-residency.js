import {viewResidency} from '../../models/view-residency.js';
// Keep identity and authorization routing; file bytes are re-read through the
// normal owner API on selection. Automatic eviction never closes a document.
export function retainDocument(tab,active){
 if(typeof tab?.markdown?.content!=='string')return;
 const document=tab.markdown;
 viewResidency.retain('document:'+tab.id,'document','markdown',{active,dispose:()=>{if(tab.markdown===document){delete document.content;delete document.dataURL;}}});
}

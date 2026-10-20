export function isLoopbackPreview(value){try{const host=new URL(value).hostname.replace(/\.$/,'');return host==='localhost'||host.endsWith('.localhost')||/^127\.\d+\.\d+\.\d+$/.test(host)||host==='[::1]';}catch{return false;}}
export async function verifyPreview(preview){const bytes=new TextEncoder().encode(preview.content||'');if(bytes.length>4*1024*1024)throw Error('Preview exceeds transfer limit.');const digest=await crypto.subtle.digest('SHA-256',bytes),version=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');if(version!==preview.version)throw Error('Preview version does not match its content.');return preview;}
// Reads use the existing encrypted command channel and document-viewing grant.
export async function refreshChatPreviews({request,chatId,current,onPreview,onRemove=()=>{},versionFor=()=>null}){
 const response=await request('chat.previews.list',{id:chatId});
 if(!current())return;
 const seen=new Set();for(const metadata of response.previews||[]){seen.add(metadata.documentId);if(!metadata.version)continue;const old=versionFor(metadata.documentId);if(old?.version===metadata.version&&old.stale===metadata.stale)continue;const preview=await verifyPreview(await request('chat.previews.read',{id:chatId,documentId:metadata.documentId}));if(!current())return;await onPreview({...preview,preview:true});}
 onRemove(seen);
}

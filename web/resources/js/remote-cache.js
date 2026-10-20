import {seal,unseal} from './remote-client.js';
const prefix = account => 'proteus.chat-index.v1.'+account+'.';
const cacheKey = (account,host) => prefix(account)+host.hostId+'.'+host.deviceId;
const aad = (account,host) => 'proteus-browser-chat-index:v1:'+account+':'+host.hostId+':'+host.deviceId;
export async function saveChatIndex(account,host,runs,storage=localStorage){
    if(!host.key||!host.deviceId)return;
    const items=(runs||[]).slice(0,250).map(run=>({id:String(run.id).slice(0,100),title:String(run.title||'Chat').slice(0,200),chatType:['user','scheduled','internet'].includes(run.chatType)?run.chatType:undefined,trigger:String(run.trigger||'').slice(0,30),scheduleName:String(run.scheduleName||'').slice(0,200),status:String(run.status||'unknown').slice(0,30),workspaceId:String(run.workspaceId||'').slice(0,100),workspaceName:String(run.workspaceName||'').slice(0,200),projectId:String(run.projectId||'').slice(0,100),projectName:String(run.projectName||'').slice(0,200),lastActivityAt:run.lastActivityAt,createdAt:run.createdAt,updatedAt:run.updatedAt}));
    const box=await seal(host.key,{items,observedAt:new Date().toISOString()},aad(account,host));
    if(box.length<=250_000&&!globalThis.proteusSigningOut)storage.setItem(cacheKey(account,host),box);
}
export async function loadChatIndex(account,host,storage=localStorage){
    const box=storage.getItem(cacheKey(account,host));if(!box||box.length>250_000||!host.key)return null;
    try{const value=await unseal(host.key,box,aad(account,host));if(!Array.isArray(value.items)||value.items.length>250||!Number.isFinite(Date.parse(value.observedAt))||Date.now()-Date.parse(value.observedAt)>7*86400000)return null;return value;}catch{return null;}
}
export function clearChatIndex(account,hostId=null,storage=localStorage){for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(prefix(account)+(hostId?hostId+'.':'')))storage.removeItem(key);}}
const draftPrefix = account => 'proteus.chat-drafts.v1.'+account+'.';
export async function saveChatDrafts(account,host,drafts,storage=sessionStorage){
    if(!host.key||!host.deviceId)return;
    const items=[...drafts].slice(-32).filter(([id])=>typeof id==='string'&&id.length<240);
    const payload=JSON.stringify(items);if(payload.length>200_000)throw new Error('Drafts exceed the 200 KB browser session limit. Keep this page open until you send or shorten them.');
    const box=await seal(host.key,{items,observedAt:new Date().toISOString()},aad(account,host)+':drafts');if(!globalThis.proteusSigningOut)storage.setItem(draftPrefix(account)+host.hostId+'.'+host.deviceId,box);
}
export async function loadChatDrafts(account,host,storage=sessionStorage){
    const box=storage.getItem(draftPrefix(account)+host.hostId+'.'+host.deviceId);if(!box||box.length>280_000||!host.key)return new Map();
    try{const value=await unseal(host.key,box,aad(account,host)+':drafts');if(!Array.isArray(value.items)||value.items.length>32)return new Map();return new Map(value.items.filter(item=>Array.isArray(item)&&item.length===2&&typeof item[0]==='string'&&item[1]?.values&&typeof item[1].values==='object'));}catch{return new Map();}
}
export function clearChatDrafts(account,hostId=null,storage=sessionStorage){for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(draftPrefix(account)+(hostId?hostId+'.':'')))storage.removeItem(key);}}

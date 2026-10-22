// Explicit endpoint projection: renderers never receive OAuth tokens or arbitrary HTTP access.
import fs from 'node:fs';
import {releaseOrigin,saveReleaseResponse} from './desktop-releases.js';
const allowed = /^(?:\/browser-profiles(?:\/[a-f0-9-]{36})?|\/preferences|\/team-lists(?:\/[a-f0-9-]{36})?|\/links(?:\/[a-f0-9-]{36})?|\/history(?:\/[a-f0-9-]{36})?|\/notifications(?:\/[a-f0-9-]{36})?|\/logs|\/push-subscriptions)?$/;
export class AppAccount {
  constructor(session) { this.session = session.api || session; this.life = session.api ? session : {api:this.session}; }
  releaseIdentity(){
    this.life.api.load();const identity=this.life.api.identity();
    if(!identity||identity.origin!==releaseOrigin)throw new Error('Connect your Proteus website account in Engine Room → App Setup before downloading releases.');
    return identity;
  }
  async releases({channel='stable',platform=process.platform,arch=process.arch}={}){
    if(!['stable','preview'].includes(channel)||!['darwin','linux','win32'].includes(platform)||!['x64','arm64'].includes(arch))throw new Error('Unsupported release channel or desktop target.');
    const identity=this.releaseIdentity();
    const value=await this.life.api.authorized('/api/v1/app/releases?'+new URLSearchParams({channel,platform,arch}));
    this.life.api.assertIdentity(identity);
    this.life.api.verify(value);
    if(!Array.isArray(value.releases)||value.releases.length>50)throw new Error('The website returned an invalid release list.');
    return value.releases;
  }
  async downloadRelease(release,file){
    const identity=this.releaseIdentity();let downloaded=false;
    if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(release.id)||release.artifact.path!=='/api/v1/app/releases/'+release.id+'/artifact')throw new Error('The release download path is invalid.');
    try{
      await this.life.api.authorized(release.artifact.path,{binary:true,timeout:15*60000,download:async response=>{const result=await saveReleaseResponse(response,file,release);downloaded=true;return result;}});
      this.life.api.assertIdentity(identity);
    }catch(error){if(downloaded)fs.rmSync(file,{force:true});throw error;}
  }
  async request({ path = '', method = 'GET', body, identity, collections, page, pageSize, collectionRevision } = {}) {
    if (typeof path !== 'string' || !allowed.test(path) || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported account operation.');
    const query = new URLSearchParams();
    if (collections !== undefined) {
      if (method !== 'GET' || path || !Array.isArray(collections) || collections.some(key => !['browserProfiles','teamLists','links','history','notifications','logs'].includes(key))) throw new Error('Unsupported account projection.');
      query.set('view', 'bootstrap'); if(collections.length) query.set('include', [...new Set(collections)].join(','));
    }
    if (page !== undefined || pageSize !== undefined || collectionRevision !== undefined) {
      if(method !== 'GET' || !/^\/(?:browser-profiles|team-lists|links|history|notifications|logs)$/.test(path)) throw new Error('Unsupported account collection.');
      if(page !== undefined) { if(!Number.isInteger(page)||page<1||page>10000) throw new Error('Invalid account page.'); query.set('page', page); }
      if(pageSize !== undefined) { if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100) throw new Error('Invalid account page size.'); query.set('pageSize', pageSize); }
      if(collectionRevision !== undefined) { if(!/^[a-f0-9]{64}$/.test(collectionRevision)) throw new Error('Invalid account collection revision.'); query.set('expectedRevision', collectionRevision); }
    }
    if (method !== 'GET') this.session.assertIdentity(identity);
    this.session.load();
    const captured = this.session.identity();
    if (!captured) throw new Error('Connect your website account in Engine Room → App Setup.');
    const value = await this.session.authorized('/api/v1/app' + path + (query.size ? '?' + query : ''), { method, ...(body === undefined ? {} : { body:{...body,expectedAccountId:captured.accountId,expectedWorkspaceId:captured.workspaceId} }) });
    this.session.assertIdentity(captured);
    if ((value.accountId && value.accountId !== captured.accountId) || (value.workspaceId && String(value.workspaceId) !== captured.workspaceId)) throw new Error('The website account changed. Refresh before continuing.');
    return { ...value, identity: captured };
  }
  async lists() { const value=await this.request({collections:['teamLists']});return {...value,teamLists:(value.teamLists||[]).map(list=>({...list,random:(list.members||[]).filter(m=>m.mode==='random').map(m=>m.name),fixed:(list.members||[]).filter(m=>m.mode==='fixed').map(m=>m.name)}))}; }
  async team(value) {
    const { action, id, expectedRevision, identity } = value;let list=value.list;
    if(list&&(Array.isArray(list.random)||Array.isArray(list.fixed))){const {randomUUID}=await import('node:crypto');list={...list,members:[...['random','fixed'].flatMap(mode=>(list[mode]||[]).map(name=>({id:list.members?.find(m=>m.name===name)?.id||randomUUID(),name,mode})))]};delete list.random;delete list.fixed;}
    if (action === 'save') return this.request({ path: '/team-lists' + (list?.id ? '/' + list.id : ''), method: list?.id ? 'PUT' : 'POST', body: { ...list, expectedRevision }, identity });
    if (action === 'delete') return this.request({ path: '/team-lists/' + id, method: 'DELETE', body: { expectedRevision }, identity });
    throw new Error('Unknown team-list action.');
  }
}

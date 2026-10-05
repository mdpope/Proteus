// Explicit endpoint projection: renderers never receive OAuth tokens or arbitrary HTTP access.
const allowed = /^(?:\/preferences|\/team-lists(?:\/[a-f0-9-]{36})?|\/links(?:\/[a-f0-9-]{36})?|\/history(?:\/[a-f0-9-]{36})?|\/notifications(?:\/[a-f0-9-]{36})?|\/logs|\/push-subscriptions)?$/;
export class AppAccount {
  constructor(life) { this.life = life; }
  async request({ path = '', method = 'GET', body, identity } = {}) {
    if (typeof path !== 'string' || !allowed.test(path) || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported account operation.');
    if (method !== 'GET') this.life.api.assertIdentity(identity);
    this.life.api.load();
    const captured = this.life.api.identity();
    if (!captured) throw new Error('Connect your website account in Engine Room → App Setup.');
    const value = await this.life.api.authorized('/api/v1/app' + path, { method, ...(body === undefined ? {} : { body:{...body,expectedAccountId:captured.accountId,expectedWorkspaceId:captured.workspaceId} }) });
    this.life.api.assertIdentity(captured);
    if (value.accountId && value.accountId !== captured.accountId) throw new Error('The website account changed. Refresh before continuing.');
    return { ...value, identity: captured };
  }
  async lists() { const value=await this.request();return {...value,teamLists:(value.teamLists||[]).map(list=>({...list,random:(list.members||[]).filter(m=>m.mode==='random').map(m=>m.name),fixed:(list.members||[]).filter(m=>m.mode==='fixed').map(m=>m.name)}))}; }
  async team(value) {
    const { action, id, expectedRevision, identity } = value;let list=value.list;
    if(list&&(Array.isArray(list.random)||Array.isArray(list.fixed))){const {randomUUID}=await import('node:crypto');list={...list,members:[...['random','fixed'].flatMap(mode=>(list[mode]||[]).map(name=>({id:list.members?.find(m=>m.name===name)?.id||randomUUID(),name,mode})))]};delete list.random;delete list.fixed;}
    if (action === 'save') return this.request({ path: '/team-lists' + (list?.id ? '/' + list.id : ''), method: list?.id ? 'PUT' : 'POST', body: { ...list, expectedRevision }, identity });
    if (action === 'delete') return this.request({ path: '/team-lists/' + id, method: 'DELETE', body: { expectedRevision }, identity });
    throw new Error('Unknown team-list action.');
  }
}

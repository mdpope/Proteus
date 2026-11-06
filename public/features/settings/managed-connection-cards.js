// Presentation only: evidence and action authority remain with the connection owner.
// Brand paths: Simple Icons 11.15.0 (CC0); see docs/connection-page-design.md.
const brands={
 'atlassian-oauth-v2':{name:'Atlassian / Jira',color:'#1868db',path:"M7.12 11.084a.683.683 0 00-1.16.126L.075 22.974a.703.703 0 00.63 1.018h8.19a.678.678 0 00.63-.39c1.767-3.65.696-9.203-2.406-12.52zM11.434.386a15.515 15.515 0 00-.906 15.317l3.95 7.9a.703.703 0 00.628.388h8.19a.703.703 0 00.63-1.017L12.63.38a.664.664 0 00-1.196.006z"},
 'ado-entra-public-client':{name:'Azure DevOps',color:'#0078d4',path:"M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z"}
};
const words=value=>String(value||'unchecked').replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());
const date=value=>value?new Date(value).toLocaleString():'Not checked';
export function connectionBadge(row){
 if(!row.enabled)return {label:'Disabled',tone:'muted'};
 if(row.status.stale)return {label:'Needs rechecking',tone:'muted'};
 const state=row.status.state||'unchecked';
 return {label:words(state),tone:state==='ready'?'ready':['connecting','refreshing'].includes(state)?'working':['unchecked','stale','unconfigured'].includes(state)?'muted':'attention'};
}
export function connectionLogo(adapter){
 const brand=brands[adapter];
 return `<span class="connection-logo" aria-hidden="true">${brand?`<svg viewBox="0 0 24 24" width="28" height="28" fill="${brand.color}"><path d="${brand.path}"/></svg>`:'<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/></svg>'}</span>`;
}
export function managedConnectionCard(row,snapshot,esc,expanded=false){
 const status=row.status,badge=connectionBadge(row),brand=brands[row.authentication.adapter];
 const signing=status.ownerSignIn?.state==='sign-in-in-progress';
 const note=[status.ownerSignIn?.nextAction,status.reason,signing?'Sign-in is open in the configured browser.':''].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' ');
 const workspaces=row.workspaceIds.map(id=>snapshot.workspaces.find(w=>w.id===id)?.name||id);
 const fact=(label,value)=>`<div><dt>${label}</dt><dd>${esc(value||'Not verified')}</dd></div>`;
 return `<article class="card managed-connection-card" data-connection="${esc(row.id)}">
  <header class="connection-card-heading">${connectionLogo(row.authentication.adapter)}<div class="connection-title"><p class="connection-service">${esc(brand?.name||'MCP connection')}</p><h3>${esc(row.label)}</h3><code>${esc(row.name)}</code></div><span class="connection-status" data-tone="${badge.tone}">${esc(badge.label)}</span></header>
  <dl class="connection-account">${fact('Expected account',row.expected.principal)}${fact('Site / organization',row.expected.resource)}${status.verified?fact('Verified account',status.verified.principal):''}</dl>
  <dl class="connection-health">${[['Credential store',status.credentialStore],['Authentication',status.authentication||'unverified'],['Transport',status.transport||'unchecked'],['Resource access',status.access||'unverified']].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(words(value))}</dd></div>`).join('')}</dl>
  ${note?`<p class="connection-guidance" role="status">${esc(note)}</p>`:''}
  <p class="connection-freshness">Last successful read <strong>${esc(date(status.lastSuccessfulRead))}</strong>${status.nextRetryAt?`<br>Next retry ${esc(date(status.nextRetryAt))}`:''}</p>
  <div class="connection-workspaces"><span>Workspaces</span>${workspaces.map(w=>`<span class="connection-chip">${esc(w)}</span>`).join('')||'<span>None assigned</span>'}<span>${row.references.length} references${row.active?' · In use':''}</span></div>
  <div class="actions connection-primary-actions"><button class="${badge.tone==='ready'?'primary':''}" data-managed-verify ${!row.enabled?'disabled':''}>Verify now</button><button class="${badge.tone!=='ready'?'primary':''}" data-managed-sign-in ${!row.enabled||row.active||signing?'disabled':''}>Sign in</button><button data-managed-edit ${row.active?'disabled':''}>Configure</button></div>
  <details class="connection-details" ${expanded?'open':''}><summary>Connection details &amp; more actions</summary><dl class="connection-account">${fact('Server',row.transport.endpoint||row.transport.package)}${fact('Expected site / tenant',row.expected.tenant)}${fact('Verified resource',status.verified?.resource)}${fact('Verified capabilities',(status.capabilities||[]).join(', ')||'Not yet verified')}${fact('Connection ID',row.id)}${fact('Owner',row.ownerId)}</dl><div class="actions"><button data-managed-repair ${!row.enabled?'disabled':''}>Reconnect</button><button data-managed-toggle ${row.active?'disabled':''}>${row.enabled?'Disable':'Enable'}</button><button class="danger" data-managed-remove ${row.active||row.references.length?'disabled':''}>Remove connection</button></div>${row.references.length?'<p class="note">Update dependent chat/schedule references before removing this connection.</p>':''}${row.active?'<p class="note">Running sessions must finish before configuration changes.</p>':''}<p class="note">Removing a connection does not delete or revoke its saved credentials.</p></details>
 </article>`;
}
export function managedConnectionsMarkup(snapshot,esc,expanded=new Set()){
 const ready=snapshot.connections.filter(row=>connectionBadge(row).tone==='ready').length;
 return `<header class="managed-connections-heading"><div><p class="connection-eyebrow">Managed MCP</p><h2>Managed connections</h2><p>Connect your accounts once. Use them across chats and schedules with separate permissions for each run.</p></div><div class="actions"><button class="primary" data-managed-add>Add connection</button><button data-managed-refresh>Refresh status</button></div></header><div class="connection-section-meta"><span>${snapshot.connections.length} connections</span><span>${ready} ready</span><span>On this computer</span></div><p data-managed-error class="connection-error" role="status">${esc(snapshot.storageError||'')}</p><div data-managed-editor></div><div class="managed-connection-grid" data-managed-rows>${snapshot.connections.map(row=>managedConnectionCard(row,snapshot,esc,expanded.has(row.id))).join('')||'<div class="connection-empty"><h3>Connect your first service</h3><p>Add an Atlassian or Azure DevOps connection to choose an account, authorize workspaces and verify access.</p></div>'}</div><p class="connection-footnote">Initial sign-in, consent or unlocking protected credentials may need you. Existing authentication stays in place while you verify a replacement.</p>`;
}

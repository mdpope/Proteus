import {mountUpdateCoordinatorDefaults} from './update-coordinator-preferences.js';
const attemptsKey='proteus.update-start-attempts';
function attempts(){try{return JSON.parse(localStorage.getItem(attemptsKey)||'{}');}catch{return {};}}
export async function renderUpdates(container,ui,active){
 const esc=ui.escape;let releases=[];
 container.innerHTML=`<section class="card"><h2>Updates</h2><div data-update-status role="status">Checking this installation…</div><div data-update-error role="status"></div><div data-update-controls hidden>
 <div class="actions"><button data-update-check>Check for updates</button><button data-update-import>Choose offline release</button></div>
 <label>Available releases<select data-update-release><option value="">Check for updates first</option></select></label><button data-update-stage disabled>Start update in a new chat</button>
 <p class="note">Each upgrade creates its own chat named for the release, using the provider defaults below. That chat prepares, tests and verifies the update through restart. Existing chats keep their work.</p>
 <div class="actions"><button data-update-open-chat hidden>Open update chat</button><button data-update-cancel disabled>Cancel pending update</button></div></div></section>`;
 const find=selector=>container.querySelector(selector);
 const showError=error=>{if(active())find('[data-update-error]').textContent=error.message;};
 const refresh=async()=>{
  const status=await ui.api('/api/updates');if(!active())return status;const {identity,job,error,download}=status;
  find('[data-update-status]').innerHTML=`<p>${identity.packaged?'Installed '+esc(identity.buildRevision):'Running from source. Install a desktop release to use Updates.'}</p>${download?`<p>${esc(download.phase)} · ${esc(download.version)} · ${esc(download.buildRevision)}</p>`:''}${job?`<p><strong>${esc(job.phase)}</strong>${job.outcome?' · '+esc(job.outcome):''} · ${esc(job.buildRevision||'')}</p>${job.blocker?`<p>${esc(job.blocker)}</p>`:''}${job.error?`<p class="banner">${esc(job.error)}</p>`:''}${job.phase==='attention'&&identity.barrier?'<p>The update needs inspection. You can resume ordinary work in the verified app.</p><button data-update-resume-work>Resume ordinary work</button>':''}${job.continuation?'<p>The update chat resumed automatically.</p>':''}${Number.isFinite(job.freeSpaceChange)?`<p class="note">Free space change: ${(job.freeSpaceChange/1024**3).toFixed(2)} GiB.</p>`:''}`:''}${error?`<p class="banner">${esc(error)}</p>`:''}`;
  const resume=find('[data-update-resume-work]');if(resume)resume.onclick=action(()=>ui.api('/api/updates',{action:'resume-work',id:job.id,expectedRevision:job.revision}));
  find('[data-update-controls]').hidden=!identity.capabilities?.prepare;
  find('[data-update-open-chat]').hidden=!job?.runId;find('[data-update-open-chat]').onclick=()=>ui.openUpdateChat?.({id:job.runId});
  find('[data-update-cancel]').disabled=!['prepared','waiting-for-idle'].includes(job?.phase);
  return status;
 };
 const action=callback=>async event=>{event.target.disabled=true;try{await callback();}catch(error){showError(error);}finally{if(active()){event.target.disabled=false;try{await refresh();}catch(error){showError(error);}}}};
 const start=async selection=>{
  const key=JSON.stringify(selection),saved=attempts(),operationId=saved[key]||crypto.randomUUID();saved[key]=operationId;localStorage.setItem(attemptsKey,JSON.stringify(saved));
  const run=await ui.api('/api/updates/coordinator',{...selection,operationId});
  const latest=attempts();delete latest[key];localStorage.setItem(attemptsKey,JSON.stringify(latest));
  await ui.openUpdateChat?.(run);
 };
 find('[data-update-check]').onclick=action(async()=>{
  find('[data-update-error]').textContent='';releases=(await ui.api('/api/updates',{action:'releases',channel:'stable'})).releases;
  find('[data-update-release]').innerHTML=releases.length?releases.map(release=>`<option value="${esc(release.id)}">${esc(release.version)} · ${esc(release.buildRevision)}</option>`).join(''):'<option value="">No published releases available</option>';
  find('[data-update-stage]').disabled=!releases.length;
 });
 find('[data-update-stage]').onclick=action(async()=>{const release=releases.find(item=>item.id===find('[data-update-release]').value);if(!release)throw Error('Choose an available release.');await start({channel:'stable',releaseId:release.id,manifestDigest:release.manifestDigest});});
 find('[data-update-import]').onclick=action(async()=>{const [manifest]=await window.desktop.choosePaths({kind:'update-release'});if(manifest)await start({manifest,channel:'stable'});});
 find('[data-update-cancel]').onclick=action(async()=>{const {job}=await refresh();await ui.api('/api/updates',{action:'cancel',id:job.id,expectedRevision:job.revision});});
 // Provider configuration remains mounted even when the update journal/catalog
 // needs repair. A Windows JSON error must not hide its provider selector.
 await mountUpdateCoordinatorDefaults(container,ui,active);
 try{await refresh();}catch(error){showError(error);}
 const poll=()=>setTimeout(async()=>{if(!active())return;try{await refresh();}catch(error){showError(error);}poll();},2000);poll();
}

// Dismissal hides only a terminal notice; the supervisor receipt remains intact.
const dismissalKey='proteus.dismissed-update-notices',dismissedUpdateNotices=new Set();
export const dismissibleUpdateJob=job=>!!job?.id&&['complete','cancelled'].includes(job.phase);
function isDismissed(job){try{return dismissedUpdateNotices.has(job.id)||JSON.parse(localStorage.getItem(dismissalKey)||'[]').includes(job.id);}catch{return dismissedUpdateNotices.has(job.id);}}
function dismiss(job){dismissedUpdateNotices.add(job.id);try{const ids=new Set(JSON.parse(localStorage.getItem(dismissalKey)||'[]'));ids.add(job.id);localStorage.setItem(dismissalKey,JSON.stringify([...ids].slice(-64)));}catch{}}
export function renderUpdateCard(root,status,runId,escape,open){
 const previous=root.querySelector('.update-chat-card'),job=status?.job;
 if(job?.runId!==runId||dismissibleUpdateJob(job)&&isDismissed(job)){previous?.remove();return;}
 const card=previous||document.createElement('section');card.className='card update-chat-card';card.setAttribute('role','status');card.innerHTML=`<strong>Proteus update · ${escape(job.phase)}</strong>${job.outcome?`<p>${escape(job.outcome==='rollback'?'Recovered the compatible previous app.':'Updated app verified.')}</p>`:''}${job.blocker?`<p>${escape(job.blocker)}</p>`:''}${job.error?`<p>${escape(job.error)}</p>`:''}<p class="note">${job.continuation?'This same chat resumed automatically.':'The helper retains this chat’s checkpoint through restart or compatible rollback.'}</p><button data-open-update-status>Update status</button>`;
 card.querySelector('button').onclick=open;
 if(dismissibleUpdateJob(job)){const close=document.createElement('button');close.textContent='Dismiss';close.setAttribute('aria-label','Dismiss completed update notice');close.dataset.dismissUpdateNotice='';close.onclick=()=>{dismiss(job);card.remove();};card.append(close);}
 if(!previous)(root.querySelector('#conversation-host')||root.lastElementChild)?.before(card);
}

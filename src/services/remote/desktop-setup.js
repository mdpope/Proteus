import {randomUUID} from 'node:crypto';

const starting = new WeakMap();
const active = new Set(['queued', 'running', 'awaiting_input']);
const label = backend => backend === 'cua' ? 'Cua Driver' : 'Peekaboo';
const setups = service => service.engine.listRuns().filter(run => run.schedule.purpose === 'desktop-control-setup');
const backendOf = run => run.schedule.desktopSetup?.backend || 'cua';

export function desktopSetupStatus(service) {
  if (!service.desktopControl) throw Error('Native desktop control is unavailable on this computer.');
  const status = service.desktopControl.status();
  return {...status, hostId: service.remote.info().hostId, hostName: service.remote.info().label,
    backends: status.backends.map(backend => {
      const runs = setups(service).filter(run => backendOf(run) === backend.id);
      const run = runs.find(run => active.has(run.status)) || runs.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      return {...backend, ...(run ? {setupChat: {id: run.id, status: run.status, active: active.has(run.status)}} : {})};
    })};
}

export function desktopSetupPrompt(status, backend) {
  const selected = status.backends.find(item => item.id === backend);
  if (!selected || (backend === 'peekaboo' && status.platform !== 'darwin')) throw Error('This desktop-control backend is not supported on the selected computer.');
  const platform = {darwin: 'Mac', win32: 'Windows', linux: 'Linux'}[status.platform] || status.platform;
  const steps = backend === 'cua' ? status.setupSteps || [] : [
    {text: 'Inspect the official Peekaboo installation guide at https://github.com/openclaw/Peekaboo and use its supported macOS package-manager route. Preserve a working existing installation.'},
    {text: 'Explain required Accessibility and Screen Recording permissions. Only the operator can grant them.', human: true}
  ];
  return `Set up ${label(backend)} for Proteus on this ${platform} computer (${status.hostName || status.hostId}).\n` +
    `Selected backend: ${backend}. Current installation: ${selected.installed ? 'installed; inspect and repair only if needed' : 'missing'}.\n` +
    `Call proteus_desktop status and inspect the selected backend and prerequisites first. Cua Driver stays primary; Peekaboo is a Mac-only backup. This task installs only the selected backend.\n` +
    steps.map(step => '- ' + step.text + (step.command ? ' Official command: ' + step.command : '') + (step.human ? ' This requires the operator.' : '')).join('\n') + '\n' +
    `Use trusted official sources and compatible dependencies. Explain missing prerequisites and ask me before running any installer or package manager command through the ordinary tool approval flow. Shared terminals require their explicit robot-button access; never use another route to bypass a refusal. Preserve existing installations, accounts and permissions.\n` +
    `Inspect permissions after installation and explain any manual OS grant. Never script or bypass a permission prompt or use the backup to bypass a denial. Verify catalog discovery, windows and one read-only observation for ${label(backend)} through proteus_desktop. For Peekaboo, give the explicit reason that this is its requested setup verification; do not send input. Report installed, permission-blocked and verified separately. Input delivery remains unproven without a separately authorized real task. This setup task does not authorize a Proteus upgrade or restarting unrelated work.`;
}

// Human UI requests share the owner factory. Repeated clicks and concurrent windows
// reuse the active backend chat; a stable operation also survives an uncertain response.
export async function startDesktopSetup(service, request = {}, {authorize = () => {}} = {}) {
  authorize();
  if (!request || typeof request !== 'object' || Array.isArray(request) || Object.keys(request).some(key => !['backend', 'operationId'].includes(key))) throw Error('Choose a supported desktop backend.');
  const backend = request.backend || 'cua', operationId = request.operationId || randomUUID();
  if (!['cua', 'peekaboo'].includes(backend) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(operationId)) throw Error('Choose a backend and a valid setup operation.');
  const status = desktopSetupStatus(service), prompt = desktopSetupPrompt(status, backend);
  const prior = () => {
    const exact = setups(service).find(run => run.schedule.desktopSetup?.operationId === operationId || run.schedule.desktopSetup?.retryOperations?.includes(operationId));
    if (exact && backendOf(exact) !== backend) throw Error('This setup operation already selected another backend.');
    return exact || setups(service).find(run => backendOf(run) === backend && active.has(run.status));
  };
  while (starting.has(service.engine)) { await starting.get(service.engine); }
  const existing = prior();
  if (existing) {
    authorize();
    const identity = existing.schedule.desktopSetup;
    if (!identity) existing.schedule.desktopSetup = {backend, operationId, hostId: status.hostId};
    else if (identity.operationId !== operationId && !identity.retryOperations?.includes(operationId)) {
      if ((identity.retryOperations?.length || 0) >= 64) throw Error('Open the existing setup chat; its retry limit has been reached.');
      identity.retryOperations = [...(identity.retryOperations || []), operationId];
    }
    service.engine.persist(existing);
    return {id: existing.id, existing: true, backend, hostId: status.hostId};
  }
  const operation = (async () => {
    const schedule = await service.buildChatSchedule({purpose: 'update', name: `${label(backend)} setup · ${status.hostName || 'This computer'}`, prompt});
    // Reuse validated destination defaults and unassigned source selection, but never
    // inherit updater instructions or its automatic installation-tool authorization.
    schedule.prompt = prompt;
    schedule.purpose = 'desktop-control-setup';
    delete schedule.updateAuthorization;
    schedule.desktopSetup = {backend, operationId, hostId: status.hostId};
    authorize();
    const run = service.engine.createRun(schedule, 'chat');
    return {...run, backend, hostId: status.hostId};
  })();
  starting.set(service.engine, operation);
  try { return await operation; }
  finally { if (starting.get(service.engine) === operation) starting.delete(service.engine); }
}

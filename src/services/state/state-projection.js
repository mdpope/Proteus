import { PermissionProjection } from '../settings/permissions.js';
import { automaticProviderFolders } from '../settings/provider-folders.js';

// Send only fields used to describe permissions, never the prompt, source text,
// transcript, live provider object or an authorization callback.
export function permissionDisplaySchedule(schedule) {
  const { name, provider, workspace, skillDirectories, mcpServers, permissionScope, executionPermissions, ref } = schedule;
  const context = schedule.context && {
    workspaceId: schedule.context.workspaceId,
    baseWorkspace: schedule.context.baseWorkspace,
    entries: schedule.context.entries?.map(({ id, hash, kind }) => ({ id, hash, kind }))
  };
  return { name, provider, workspace, skillDirectories, mcpServers, permissionScope, executionPermissions, ref, context };
}

// This operates on the worker's structured clone, never on live owner state.
// Path checks and hashing are display-only; no result can authorize an operation.
export function serializeStateProjection({ state, runs, schedules, defaults, preserveInheritedDefaults }) {
  const permissions = new PermissionProjection({ preserveInheritedDefaults });
  permissions.automaticProviderFolders = (run, resolve) => automaticProviderFolders(run, run.providerHome, resolve);
  const byWorkspace = new Map(defaults);
  const snapshot = permissions.snapshot({ value: state.permissions, workspaceDefaults: id => byWorkspace.get(id) });
  const contexts = new Map(runs.map(run => [run.id, permissions.describeRun(run, snapshot)]));
  for (const run of state.runs) run.permissionContext = contexts.get(run.id);
  state.permissionWorkspaces = permissions.describeMany(schedules, snapshot);
  return JSON.stringify(state);
}

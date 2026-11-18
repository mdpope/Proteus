// Legacy runs are classified by origin; Internet Searches remain normal resumable chats.
export const chatTypes = [['user','User Chats'],['scheduled','Scheduled Tasks'],['internet','Internet Searches']];
// N11-13: classify from authoritative origin. The engine records chatType at creation;
// trigger is the next authority. Interactive chats carry an internal schedule record and
// name (and may advertise scheduled-run recovery support), which never make them
// Scheduled Tasks. A schedule name decides only legacy rows with neither field.
export function chatType(run) {
  if (['internet','user','scheduled'].includes(run.chatType)) return run.chatType;
  if (run.trigger) return run.trigger === 'chat' ? 'user' : 'scheduled';
  return run.scheduleName ? 'scheduled' : 'user';
}

export const chatRunOptions=row=>({provider:row.provider||'Unknown provider',model:row.model||'Model not retained',detail:[row.reasoningEffort||'Effort not retained',row.serviceTier||'Default speed'].join(' · ')});

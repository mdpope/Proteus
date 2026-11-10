// Legacy runs are classified by origin; Internet Searches remain normal resumable chats.
export const chatTypes = [['user','User Chats'],['scheduled','Scheduled Tasks'],['internet','Internet Searches']];
export function chatType(run) {
  if (run.chatType === 'internet') return 'internet';
  if (run.trigger && run.trigger !== 'chat' || run.scheduleName) return 'scheduled';
  return 'user';
}

export const chatRunOptions=row=>({provider:row.provider||'Unknown provider',model:row.model||'Model not retained',detail:[row.reasoningEffort||'Effort not retained',row.serviceTier||'Default speed'].join(' · ')});

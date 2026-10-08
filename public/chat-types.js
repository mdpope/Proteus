// Legacy runs are classified by origin; Internet Searches remain normal resumable chats.
export const chatTypes = [['user','User Chats'],['scheduled','Scheduled Tasks'],['internet','Internet Searches']];
export function chatType(run) {
  if (run.chatType === 'internet') return 'internet';
  if (run.trigger && run.trigger !== 'chat' || run.scheduleName) return 'scheduled';
  return 'user';
}

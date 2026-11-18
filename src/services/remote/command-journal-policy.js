// Classification is derived by the owner after command authorization, never from a
// caller-supplied priority flag. Critical commands share a bounded reserve.
export function journalMethod(method,args={}) {
  return method==='chat.start'&&args.purpose==='update'?'update.start':method;
}
export const recoveryJournalMethods=new Set(['update.start','chat.cancel','chat.recover','connection.revoke']);
export function journalAdmissionLimits(limits,method) {
  const reservedBytes=Math.min(32*1024*1024,Math.floor(limits.maxBytes/16));
  const reservedRecords=Math.min(256,Math.floor(limits.maxRecords/16));
  const critical=recoveryJournalMethods.has(method);
  return {maxBytes:limits.maxBytes-(critical?0:reservedBytes),maxRecords:limits.maxRecords-(critical?0:reservedRecords),reservedBytes,reservedRecords,critical};
}

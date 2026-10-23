// Share only attachments created here. A foreign debugger remains untouched.
const owners = new WeakMap();
function acquireDebugger(contents) {
  const debug = contents.debugger;
  let owner = owners.get(contents);
  if (owner && !debug.isAttached()) { owners.delete(contents); owner = null; }
  if (!owner) {
    if (debug.isAttached()) throw new Error('Browser bridge unavailable: another debugger controls this tab. Close that debugger and retry.');
    debug.attach('1.3');
    owner = { references: 0, attached: true };
    owners.set(contents, owner);
    debug.once('detach', () => { owner.attached = false; if (owners.get(contents) === owner) owners.delete(contents); });
  }
  owner.references++;
  let released = false;
  return { debug, get active() { return !released && owner.attached && owners.get(contents) === owner; }, release() {
    if (released) return;
    released = true;
    if (--owner.references || owners.get(contents) !== owner) return;
    owners.delete(contents);
    if (owner.attached && !contents.isDestroyed() && debug.isAttached()) debug.detach();
  } };
}
module.exports = { acquireDebugger };

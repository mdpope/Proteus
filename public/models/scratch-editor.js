const fields = value => Object.fromEntries(['title','body','format','category'].map(key => [key, value[key] ?? (key === 'format' ? 'markdown' : '')]));
const equal = (left, right) => JSON.stringify(fields(left)) === JSON.stringify(fields(right));

// Edits coalesce; a submitted operation freezes its payload and revision until
// acknowledged. Typing during a save remains a separate subsequent draft.
export class ScratchEditor {
 constructor(record, {request, changed = () => {}, delay = 700, maxDelay = 5000, saved} = {}) {
  this.record = record; this.value = fields(record); this.request = request; this.changed = changed; this.delay = delay; this.maxDelay = maxDelay;
  if (saved?.id === record.id) {this.value = fields(saved.value); this.pending = saved.pending || null; if (saved.revision !== record.revision && !this.pending) {this.conflict = true;this.error = 'The saved draft is based on an older file version. Review both versions before replacing it.';}}
 }
 get dirty() {return !!this.pending || !equal(this.value, this.record);}
 snapshot() {return {id: this.record.id, revision: this.record.revision, value: this.value, pending: this.pending};}
 edit(value) {
  if(this.validation){this.validation=false;this.error=null;}
  this.value = {...this.value, ...fields({...this.value, ...value})}; this.changed(this);
  clearTimeout(this.timer);
  if (this.error || !this.dirty) {if (!this.dirty) clearTimeout(this.deadline);return;}
  this.timer = setTimeout(() => void this.flush().catch(() => {}), this.delay);
  this.deadline ??= setTimeout(() => {this.deadline = null;void this.flush().catch(() => {});}, this.maxDelay);
 }
 async flush({retry = false} = {}) {
  clearTimeout(this.timer);clearTimeout(this.deadline);this.deadline = null;
  if (this.saving) {await this.saving;return this.flush({retry});}
  if (this.conflict) throw Error(this.error);
  if (this.error && !retry) throw Error(this.error);
  if (!this.dirty) return this.record;
  if(!this.pending&&(!this.value.title.trim()||this.value.title.length>500||this.value.category.length>200)){
   this.validation=true;this.error='Use a title of 1–500 characters and a list name of at most 200 characters.';this.changed(this);throw Error(this.error);
  }
  this.pending ??= {action: 'update', id: this.record.id, expectedRevision: this.record.revision, operationId: crypto.randomUUID(), ...fields(this.value)};
  const command = this.pending;this.error = null;this.changed(this);
  this.saving = Promise.resolve().then(async () => {
   try {const row = await this.request(command);this.record = {...row, ...fields(command)};this.pending = null;return this.record;}
   catch (error) {if(error.code==='SCRATCH_REJECTED')this.pending=null;this.error = error.message;throw error;}
   finally {this.saving = null;this.changed(this);}
  });
  await this.saving;
  if (this.dirty) return this.flush();
  return this.record;
 }
 stopTimers() {clearTimeout(this.timer);clearTimeout(this.deadline);this.deadline = null;}
}

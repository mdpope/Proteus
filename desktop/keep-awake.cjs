// The OS assertion is process-local; the saved preference survives its release.
class KeepAwake {
  constructor(powerSaveBlocker) { this.blocker = powerSaveBlocker; this.id = null; this.onChange = null; }
  get enabled() { return this.id !== null && this.blocker.isStarted(this.id); }
  setEnabled(value) {
    if (value) {
      if (!this.enabled) this.id = this.blocker.start('prevent-display-sleep');
    } else if (this.id !== null) {
      this.blocker.stop(this.id);
      this.id = null;
    }
    this.onChange?.(this.enabled);
    return this.enabled;
  }
  dispose() { if(this.id!==null){this.blocker.stop(this.id);this.id=null;} }
}
module.exports = { KeepAwake };

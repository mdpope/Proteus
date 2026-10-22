// Process-local: quitting/restarting Proteus always restores normal idle sleep.
class KeepAwake {
  constructor(powerSaveBlocker) { this.blocker = powerSaveBlocker; this.id = null; }
  get enabled() { return this.id !== null && this.blocker.isStarted(this.id); }
  setEnabled(value) {
    if (value) {
      if (!this.enabled) this.id = this.blocker.start('prevent-display-sleep');
    } else if (this.id !== null) {
      this.blocker.stop(this.id);
      this.id = null;
    }
    return this.enabled;
  }
  dispose() { this.setEnabled(false); }
}
module.exports = { KeepAwake };

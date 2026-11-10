// Remote pages and extensions are not the trusted application shell. Electron's
// default JS dialogs become native window-modal sheets, including for background
// tabs. Disable that path before any page script runs: alert is ignored, confirm
// returns false. Electron's already-unsupported prompt is unchanged. HTML dialogs
// remain inside their page; Proteus-owned approval/file dialogs use a separate,
// trusted host boundary.
function pageWebPreferences(options = {}) {
  return { ...options, nodeIntegration: false, contextIsolation: true, sandbox: true, disableDialogs: true, spellcheck: true };
}
module.exports = { pageWebPreferences };

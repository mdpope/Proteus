# Local terminals

Proteus embeds **Ghostty VT (WebAssembly)** through `ghostty-web` 0.4.0 and uses `node-pty` 1.1.0 for interactive host shells. This is a Ghostty parser/canvas renderer inside Proteus, not an embedded native Ghostty window. The installed Ghostty application and its settings are untouched.

Use the terminal button in the tab bar to choose a saved profile and configured starting folder. Profiles live under Setup → Terminal profiles and support shell executable, optional startup command, starting directory, font family/size, scrollback, and colors. New terminals explicitly run the profile command; a blank command opens a login shell. Starting folders must resolve inside currently configured workspace, shared repository, or every-chat folder roots. A shell has the ordinary permissions of the Mac user: this starting-folder check is not a command sandbox.

Import Ghostty settings reads the standard user config locations and maps supported font, command, working-directory, and theme/palette values. Unsupported native window, keyboard, clipboard, shell integration, adaptive theme, and included-config behavior is reported rather than silently claimed. The importer only reads bounded files and contained named theme paths; saving creates a separate Proteus profile. Shell defaults to `/bin/zsh` on macOS.

Terminal access is desktop IPC only, checked against the main window's trusted origin and top frame. No HTTP, relay, browser page, provider, or mobile terminal endpoint exists. The HTTP service serves only the renderer assets. The CSP allows WebAssembly compilation (`wasm-unsafe-eval`) without general JavaScript `unsafe-eval`.

Live PTYs survive tab switches. Closing the tab or quitting Proteus terminates the managed shell/process group, with a bounded forced-kill fallback. As with other terminals, an intentionally detached/daemonized process may outlive its shell. Output is retained in memory only, limited to 512 KiB per session, with at most 12 active sessions and 32 retained session records. Input messages and dimensions are bounded. Profiles are revision guarded and written privately (0600); terminal history is not written to a run log.

Workspace restoration saves a tab descriptor (session ID, profile ID, starting-root ID, relative directory). It never starts a shell. After an application restart the old process/output is unavailable, and the tab offers **Resume new shell**. That explicit action starts the profile shell while suppressing its saved startup command, preventing accidental replay. A missing/revoked starting folder or removed profile must be corrected before resuming.

## Building and verification

- `npm run terminal:build` bundles Ghostty JavaScript and WASM into `public/terminal/` and repairs the executable mode on the node-pty spawn helper. `postinstall` also applies the narrowly scoped helper-mode repair.
- `npm run package:mac` rebuilds **only node-pty** for Electron in the packager's copied application before signing. It does not change the source checkout's Node ABI or rebuild/resign the vendor-owned Copilot binaries. Packaging verifies the Copilot signatures and byte identity afterward.
- `node --test test/terminals.test.js` covers profiles, root revocation, explicit startup versus resume, buffer/input/resize limits, cleanup, read-only Ghostty import, and real interactive PTY exchange.
- `node test/terminals-ui.mjs` runs an isolated desktop with disposable settings: Ghostty canvas rendering, real typed input/output, preserved live process on tab switch, profile changes, close cleanup, absent HTTP terminal API, and reconnecting a failed renderer to
  the existing shell after a real page reload. The delayed-output case covers Ghostty 0.4.0’s
  zero-length-write edge case; Proteus skips empty initial writes.
- `node test/workspace-ui.mjs` separately verifies process restart restores descriptors without starting terminal commands.

Primary implementation references: [ghostty-web](https://github.com/coder/ghostty-web), [Ghostty configuration](https://ghostty.org/docs/config/reference), [Ghostty themes](https://ghostty.org/docs/features/theme), [node-pty](https://github.com/microsoft/node-pty).

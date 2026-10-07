# Local terminals

October 7 planning: BF-2026-10-07-15 and BF-2026-10-07-16 in
[planned updates](planned-updates.md) queue terminal-tab navigation spacing fixes and an
investigation of agent terminal integration/defaults. BF-13 covers move/copy semantics for
eligible tabs. These proposals do not change current PTY behavior or configuration.

Proteus embeds **Ghostty VT (WebAssembly)** through `ghostty-web` 0.4.0 and uses `node-pty` 1.1.0 for interactive host shells. This is a Ghostty parser/canvas renderer inside Proteus, not an embedded native Ghostty window. The installed Ghostty application and its settings are untouched.

Use the terminal button in the tab bar to choose a saved profile and configured starting folder. Profiles live under Setup → Terminal profiles and support shell executable, optional startup command, starting directory, font family/size, scrollback, and colors. New terminals explicitly run the profile command; a blank command opens a login shell. Starting folders must resolve inside currently configured workspace, shared repository, or every-chat folder roots. A shell has the ordinary permissions of the Mac user: this starting-folder check is not a command sandbox.

Import Ghostty settings reads the standard user config locations and maps supported font, command, working-directory, and theme/palette values. Unsupported native window, keyboard, clipboard, shell integration, adaptive theme, and included-config behavior is reported rather than silently claimed. The importer only reads bounded files and contained named theme paths; saving creates a separate Proteus profile. Shell defaults to `/bin/zsh` on macOS.

Terminal access is desktop IPC only, checked against the main window's trusted origin and top frame. No HTTP, relay, browser page, provider, or mobile terminal endpoint exists. The HTTP service serves only the renderer assets. The CSP allows WebAssembly compilation (`wasm-unsafe-eval`) without general JavaScript `unsafe-eval`.

Live PTYs survive tab switches. For a temporary process terminal, closing the tab or quitting Proteus terminates the managed shell/process group, with a bounded forced-kill fallback. As with other terminals, an intentionally detached/daemonized process may outlive its shell. Optional persistent tmux sessions run on a dedicated Proteus socket in protected app data and use `/dev/null` instead of the user's `~/.tmux.conf`; the user's default tmux server and unrelated sessions are untouched. Closing a persistent terminal or quitting Proteus detaches its viewer. Only the explicit **End session** action kills the selected Proteus-managed tmux session. A saved appearance profile and a tmux session are separate choices. Each managed session carries an identity tag so a restored tab cannot attach to a same-name replacement after a server restart. An already attached managed session is rejected to avoid an accidental second viewer.

Output is retained locally under protected app data (0600) up to 512 KiB per session and 32 retained records. It may contain sensitive shell output; clearing a terminal tab removes its saved record, while a persistent tmux session remains available until explicitly ended. There are at most 12 active viewers. Input messages and dimensions are bounded. Profiles are revision guarded and written privately (0600). Terminal output is never synchronized to the website or mobile clients.

Workspace restoration saves a tab descriptor (session ID, profile ID, starting-root ID, relative directory, and optional tmux session identity). It never starts a shell. After application restart, a temporary process is dead but its bounded local output remains available; typing into it should open a fresh login shell, suppressing any saved startup command. A persistent tmux tab may reattach only when its managed socket, session name, and identity tag still match. The backend exposes a separate bounded tmux scrollback capture (up to 512 KiB) so output produced while detached can be reviewed without replaying it into the live terminal stream or re-running commands. A missing/revoked starting folder or removed profile must be corrected before a new shell is opened. This backend contract is implemented; the desktop UI's typing and session-management controls require separate acceptance testing before release.

## Building and verification

- `npm run terminal:build` bundles Ghostty JavaScript and WASM into `public/terminal/` and repairs the executable mode on the node-pty spawn helper. `postinstall` also applies the narrowly scoped helper-mode repair.
- `npm run package:mac` rebuilds **only node-pty** for Electron in the packager's copied application before signing. It does not change the source checkout's Node ABI or rebuild/resign the vendor-owned Copilot binaries. Packaging verifies the Copilot signatures and byte identity afterward.
- `node --test test/terminals.test.js test/terminal-tmux.test.js` covers profiles, root revocation, explicit startup versus resume, buffer/input/resize limits, local history, exact managed tmux socket/session identity, detach/end separation, read-only Ghostty import, and real interactive PTY exchange. The tmux lifecycle tests use synthetic processes and do not change existing Mac tmux sessions.
- `node test/terminals-ui.mjs` runs an isolated desktop with disposable settings: Ghostty canvas rendering, real typed input/output, preserved live process on tab switch, profile changes, close cleanup, absent HTTP terminal API, and reconnecting a failed renderer to
  the existing shell after a real page reload. The delayed-output case covers Ghostty 0.4.0’s
  zero-length-write edge case; Proteus skips empty initial writes.
- `node test/workspace-ui.mjs` separately verifies process restart restores descriptors without starting terminal commands.

Primary implementation references: [ghostty-web](https://github.com/coder/ghostty-web), [Ghostty configuration](https://ghostty.org/docs/config/reference), [Ghostty themes](https://ghostty.org/docs/features/theme), [node-pty](https://github.com/microsoft/node-pty).

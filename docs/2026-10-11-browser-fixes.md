# October 11 browser and composer implementation

This is a verification receipt for the October 10/11 backlog, not a production installation receipt.

## Browser changes

- Link context menus capture the originating parent, browser group and persistent profile. Page-created windows use their current owner, including after a tab transfer. Workspace parents use the same routing mechanism as chat parents.
- Request attribution and browser bridge lookups tolerate tabs whose WebContents has already been removed or destroyed. This addresses both reported `reading id` failure sites during transfers.
- Hover addresses remain one line across the available viewport and truncate with an ellipsis.
- Wheel observation is passive. Native vertical scrolling and pinch events are no longer cancelled by the gesture listener. Gesture overlay painting is coalesced into animation frames.
- New-tab address suggestions filter all matching history by title and URL before taking the result cap. Async suggestions retain the latest query. Multiword searches show explicit engines with the configured default first; Enter uses the configured default. An explicitly chosen alternative does not change the default. History queries retain the originating profile.
- Ghostery menu/filter actions report updating, successful activation and errors. Existing atomic cache replacement preserves the working filter engine and cache after an update failure.
- Chrome Web Store detail pages expose the Proteus Install extension action. Preferences supports official store URLs, browsing the store, managed store updates, and the existing unpacked advanced workflow. Download/extraction uses `electron-chrome-web-store` 0.13.0 with `adm-zip` overridden to 0.6.1 (audit returned zero vulnerabilities at verification). Installation requires a Manifest V3 package, native permission review, and isolation/revocation before the extension is loaded. Managed updates use rollback if loading fails. Existing persistent profile IDs and cookie stores are retained.

Store installation uses Proteus's button; the Chrome page's native Add to Chrome button is not emulated. Updates are explicit user actions, not background automatic updates. Extensions remain limited by Electron's supported extension APIs. Native messaging is not provided.

## Composer changes

Textarea sizing measures an invisible out-of-flow mirror rather than temporarily collapsing the actual editor. Initial sizing runs synchronously before callers restore transcript position; subsequent typing/resize work is coalesced. Desktop/web chat composers dock at the available pane bottom with independently scrolling messages/details. Internet Search uses a larger dialog with the extra space allocated to its textarea; workspace launches can lock the owning workspace.

## Verification completed

- `node --test test/browser-recents.test.js test/browser-blocker.test.js`: four tests passed, including matching beyond the old cap, coalesced refresh and retention of a working engine/cache after failure.
- Focused browser/profile/history/retention suite: 14 tests passed before the added blocker/recents cases.
- `node test/browser-toolbar-ui.mjs`: real Electron toolbar/menu/history coverage passed in main, chat and Team contexts.
- `PROTEUS_STORE_LIVE=1 node test/browser-backlog-ui.mjs`: real official Dark Reader 4.9.133 download, load, disable/enable, failed-update rollback, cold restart extension restore, and cookie preservation passed using disposable app data. Same test passed contextual link menu capture, page-created tabs after reparenting, repeated transfer with an incomplete view registry entry, one-line hover dimensions, delayed search query handling and configured search engine behavior.
- `node test/chat-design-ui.mjs`: production composer controls, growth/cap/shrink, details and attachment layout passed.
- `node test/composer-stability-ui.mjs`: long-history typing measured zero bottom-position spread and unchanged reading offset (2703); web CSS fixtures at desktop and mobile widths docked correctly.
- Full authenticated two-Mac website regression additionally caught and fixed initial composer sizing before history anchor restoration. Web workspace verification is recorded with the release receipt once the entire regression completes.

## Remaining experiential verification

Physical trackpad feel requires operator verification on the installed application. Dark Reader was verified; authenticated Bitwarden vault login, autofill, passkeys and native-messaging integrations were not exercised. No live provider usage or customer account interactions were fabricated by these fixtures.

## Web workspace verification

`npm --prefix web run build` passed. `node test/web-remote-ui.mjs` passed the authenticated Laravel password/MFA + disposable encrypted two-Mac regression, including the new workspace list without a feature tab, owner configuration/source filtering, locked workspace chat list, nested chat aliases and deduplication, full local copy/configuration landing, scoped new-chat setup and navigation restoration. Existing history anchors, desktop/mobile composer layout, attachments, approval flows, document rendering/consent, Live Browser revocation, chat lifecycle, account restoration, and logout isolation also passed. The old “Commands start in” assertion was updated to the approved “Starting folder” label; lazy permission disclosure verification now waits for its toggle/population event.

`node test/web-workspaces-ui.mjs` additionally passed against two disposable authenticated hosts: scoped approval folder/rule edits; cross-machine copy with destination path mapping and approvals reset to Ask; clean new workspace creation; exact preservation of approval settings on local copy; owner-side browser tab descriptor persistence; and live arrival of a terminal descriptor with an explicit owner-only session status.

Workspace configuration and chat lists use shared presentation components. Browser/terminal descriptors synchronize via revision-checked `tabs.get`/`tabs.mutate` and live `tabs` notifications. Configuration stays bound to its owning Mac, remote folder pickers are read-only, and approvals/options remain editable. Asynchronous chat navigation checks the selected workspace/chat before adopting a response; background host updates preserve an open workspace add menu and do not rebuild an unchanged configuration form.

Web browser descriptors retain addresses in the workspace and open websites using the viewing browser's existing session. Existing chat Live Browser access continues unchanged. Interactive remote terminal transport was not added: terminal descriptors show the owner/session and require the owning Mac, without replaying a command. Workspace-only documents require the owner application; approved chat-linked documents retain their existing remote consent transport. These are explicit transport limitations, not claims of desktop interaction parity.

## Final desktop regression gate

The four successors invoked by `test/desktop-workspace-ui.mjs` passed on October 11: content tabs, browser actions (22 checks), terminal restart, and sidebar settings/tab selection (13 checks). The aggregate run passed its first three fixtures; its sidebar fixture was then corrected for existing shared Home markup and native notification presentation and passed separately. No product behavior was changed to satisfy these fixture corrections.

Browser menu safety now explicitly asserts that disallowed URLs expose only Back/Forward/Reload, with no URL-specific action. Overview checks distinguish pinned entries and browser entries, and the zoom check preserves the sustained-gesture threshold. Terminal restart waits for completed saved-tab restoration, verifies an exited process remains stopped until typed input, and verifies tmux automatic reattachment retains its session ID/tag, detached output, and an exactly-once startup counter. The fixture removes only its own temporary tmux socket/server. All Electron fixtures use disposable app data and mock keychain.

## October 13 Team browser background refresh correction

Unrelated `/api/state` changes previously called the full Team renderer, hid the native browser and inserted “Preparing tab” before browser IPC completed. A disposable renderer fixture reproduced this four times without user navigation. The correction retains the mounted Team browser for matching owner, selected view, URL/load/profile state and layout, while application sidebar/navigation still refresh. Shared descriptor title/history metadata follows the same preservation path. Deliberate refresh, account changes, tab selection, unload and layout changes still rebuild. Async browser completion checks its selection revision before updating controls or retaining a mount. No browser profile, cookie or saved-session data is modified by this correction.

`test/team-browser-refresh-ui.mjs` uses a disposable mock-Keychain application home and synthetic local HTTP page. It verifies zero Preparing inserts and zero native hide/show calls for four unrelated state updates, retained DOM nodes/address draft/page marker/450px scroll, shared title updates, unload/reload, sidebar layout, navigation away/back, forced refresh and account change. The fixture awaits initial workspace restoration before measuring background updates. This is renderer verification; the reported HC installation remains a separate rollout gate.

# 0.2.32 release evidence (October 27 requests)

Branch `oct27-release`. Source requests: the Oct 27 request note (kept outside Git) and follow-up chat requests. Implemented, verified and deferred work are separated below; a clean build is not a live-workflow verification.

## October 28 follow-up

- **Installed desktop rechecked:** supervisor reports 0.2.32, build `6e8c4b1236d8+src.734be4e331ab`, complete/updated, verified health and delivered continuation. The tab correction below is source-only and is not in that installed package.
- **Disappearing first blank tab:** reproduced with an already-populated main registry while starting inside a project. Initial reconciliation treated the unmarked new blank view as obsolete, closing it and changing selection. The main creation action now sets existing `pendingOpen` intent; `openTab` preserves it if a native state event inserted the view before the create reply. Owner acknowledgement clears it. `browser-strip-create-ui.mjs` fails on the original code and passes after the fix, asserting native/renderer identity, selection, marker settlement and actual URL entry. It also checks an actual empty project strip. The earlier crowded-strip failure hit an existing tab button and is retained as a fixture error, not a product regression.
- **Desktop validation:** Node 1,237 pass / three platform skips / zero fail; static checks and whitespace checks pass. `new-tab-focus-ui.mjs` passes alone, including early URL/Enter buffering; its concurrent run lost native focus to another UI test and was corrected by running it alone. Apple UI inventory checks pass after adding the opt-in cases.
- **Simulators installed:** normal 0.2.32 / 2610.28.1 app built and installed in place on existing phone/tablet simulators. Each passes live pairing against the installed local owner and a separate normal cold-start reconnect using its saved pairing. No new device is registered by the reconnect tests. The non-secret destination indexes retain prior rows and select the local owner. Boot and app-process checks pass after relaunch. Owner samples after teardown show offline clients, so continuous simultaneous online operation is not claimed. See [native acceptance](apple-build.md) for the explicit opt-in test boundary and original failed setup attempts. Physical devices remain unchanged.
- **Jira:** the HC update chat confirms the loaded Deviniti Queues tab remains unshared. The sharing request and developer/Playwright catalog requests time out at 300 seconds. macOS dark mode and the sidebar symptom do not establish a theme or Chromium root cause; computed iframe styles, console/network errors and reversible theme probes remain unverified. The operator was asked to enable the existing tab's robot button. No Jira data, profile/theme settings or HC installation changed.
- **Still separate:** website rich-push deployment, physical-device acceptance, broad installed feature acceptance from the original release, packaging/installing the new tab correction, and Jira root-cause verification.

## HC rollout (October 28; installed)

The operator separately authorizes HC installation of the exact accepted 0.2.32 artifact and interruption of HC chats needed for the update. A new unassigned saved-default coordinator owns one supervisor job. A private unpublished draft transferred the signed app and corresponding frozen source through an isolated route to the existing intended account; no global authentication switch or credential export occurred. All four asset hashes/lengths match. The local permission-preserving extraction matches package hash `b619a43c4dd63fd9c642bdf6a0ba2a5cbe71783f10ef5916ac666927e4a5c1ab`; strict Apple signature, 394 runtime/eight build-input hashes and supervisor isolated startup acceptance pass. Cloud-added metadata and the initial permission-changing extraction were rejected before preparation.

The authorized planning-chat cancellation is confirmed. Reconciliation preserves the same update job and checkpoint through the new-input guard. Two stuck browser-action counters blocked the working idle timer; owner tools could neither cancel the individual actions nor unload their active tabs. The operator's normal quit/reopen cleared them. A subsequent scheduled chat completed normally, and the helper installed the candidate. No force quit, tab deletion or journal edit occurred.

Supervisor job `13b1ccb9` is complete/updated with verified health and delivered same-chat continuation. One desktop owner runs the exact requested build/source; independently calculated installed package hash matches, and strict Apple signature verification passes for the original bundle/team. The supervisor verifies 507 chats and 35,932 pre-restart events plus effective configurations. Two verified recovery generations remain. Selected permissions, profiles, pairings, settings, history database and layout files match the snapshot.

The final semantic comparison retains all 10 projects, 184 content-tab memberships and 346 tab records across seven window sessions. There are 106 regenerated browser window IDs with unchanged stable `contentTabId` identities. URLs, profiles, placement, hidden/persisted flags, selections and existing drafts match; one empty draft was added. One capped 50-entry browser navigation snapshot retains 49 entries, drops the oldest and adds one new entry. The original remains in recovery; retention in live global history is not independently established. Two scope revisions and one tab's activity timestamps changed without proven exact triggers; nine source-library scan completion timestamps advanced. The original raw comparison counted window files twice; a separate logical receipt corrects this and retains the original output. These qualifications do not establish a missing project or tab membership.

Current Codex works through the continuation; other providers cannot be checked without additional chat-model access. Neither Cua nor Peekaboo is installed, so interactive desktop acceptance remains untested. Reported update free-space change is −1,634,361,344 bytes (about −1.52 GiB). The source-only tab correction is excluded from this frozen artifact. Machine-specific receipts remain outside Git.

Final hygiene fully verifies both registered recovery receipts, apps and data trees. The older tree initially fails because of two additional SQLite sidecars, while every original entry/mode/symlink matches. The extra WAL has zero bytes/no frames; its 32 KiB SHM has matching index headers with zero frames, and neither has open handles. Moving both intact into compact evidence, preserving original metadata/hashes and the failed assessment, restores the original full tree hash. No database repair/checkpoint or live-data edit occurred. The supervisor's earlier candidate retirement reports +630,784,000 bytes; this is not added again to the update delta. Both unused task transport/extraction staging roots were separately retired after dependency checks, with measured increases totaling +1,602,240,512 bytes (about +1.49 GiB, including possible concurrent activity). The private draft remains unpublished. The local disposable frozen checkout and redundant app transfer archive were also retired; corresponding source and compact receipts remain.

## Requests and status

| Request | Result | Verification |
| --- | --- | --- |
| Desktop responsiveness (tabs, projects, multiple windows) | Coalesced off-thread chat persistence; stream/activity-aware change fan-out; shared state build; throttled device publish | Synthetic 3-window streaming workload, baseline `a5ff322` vs branch, two runs each: full-state rebuilds 87 → 9, their time ~200 ms → ~25 ms, event-loop p99 22–25 ms → ~10 ms. Live installed measurement pending. |
| iPhone/iPad project and tab navigation; switching chats; crash | Chats open as named project tabs; single saved selection per project; drawer/sidebar open-tab lists; top strips retained | New UI test `testProjectChatsOpenAsProjectTabsAndSwitchRepeatedly` (A→B→A via Chats, sidebar and tab strip) passes on iPhone 17 Pro and iPad Pro 11-inch simulators. Physical devices not updated by request. |
| iOS choppiness | Off-main relay decode/decrypt; `RemoteStore` Observation (removed whole-app change forwarding); hidden views stop polling | Builds and unit/UI tests (see below). No physical-device frame measurement. |
| Tabs page formatting (iOS) | One line per tab: icon, name, URL, age, actions | Simulator screenshots reviewed. |
| Desktop-control drivers in updates | Readiness on Updates and Home; guided setup chat with update defaults; update chats check drivers after install | Node test for setup chat creation; UI not yet exercised in the installed app. |
| Auto-allow `proteus_update` in user-started update chats | `updateAuthorization` marker; only that tool; protected requests still prompt | Node tests. |
| iOS notifications generic | Desktop builds title/preview/computer; website forwards to APNs; iOS banners use real text | Node and website (103/103) tests. **Website not deployed** to downloads.proteus.example; physical push not exercised. |
| Zoom/other app links | Prompt, per-site always-allow, open via OS | Electron test `browser-external-links-ui.mjs`. |
| Link menu: Default first, + icons, casing; URL-bar menu icons | Native and in-app menus updated | Electron `browser-actions-ui.mjs` menu sections pass. |
| Atlassian auth post-back | No defect found | Electron test: redirect query and form_post body reach a loopback callback exactly. Likely false negative. |
| Link picker: correct window, defaults, timeout, SafariSelector look | Implemented | Node rule test for displaying-window preference. Picker UI not yet clicked through. |
| Stay in place after sending tabs/chats to a project | Neighbour selection; chat moves no longer open the destination | Code paths updated; desktop UI pass pending. |
| View attachments on remote devices/desktop/web | Delivered files kept with the chat; Open on all clients | Node tests for retention, scoping, deletion and undelivered sends. |
| Workspace source type filters | Type filter applies with search | `preview-source-controls-ui.mjs` passes. |
| Incompatible agent recovery | One action turns agents off and resends the original request (desktop, web, iOS) | Node engine test. |
| MTPLX missing | It was never registered outside Design Preview (not a regression); now registered on macOS | MTPLX tests pass; live server was not running during checks. |
| Permission prompts in this chat | Chat-chosen working folders trusted like workspace folders | Node regression test. Takes effect after install. |
| Steering interrupted the turn | Claude steering no longer interrupts | Probe against installed Claude Code 2.1.308; adapter tests. |

## Previous releases re-checked

- **R17 (iOS switching):** still broken as reported; root cause was three competing selection copies plus pushed chat destinations. Fixed and covered by the new UI test.
- **R18 (desktop performance):** the earlier change only coalesced browser projections; the main costs (per-event full-record fsync, per-chunk full-state refetch in every window, device publish) were untouched. Addressed with measurements above.
- **R5 (working-folder access):** incomplete for folders chosen on the chat itself; fixed.
- **R7 (profile link menus):** present; redesigned per the new request.
- **R3 (core tools in every chat):** observed live in this chat.
- R1, R2, R4, R6, R8–R16, R19–R22 and 0.2.30 items were not re-exercised live in this pass; their automated tests continue to pass.

## Test results

- Node: `npm test` 1,237 pass / 3 platform skips / 0 fail (short `TMPDIR`); `npm run check` passes.
- Website: 103/103 PHPUnit tests (local throwaway `.env`/keys, git-ignored).
- Desktop Electron UI: `browser-external-links-ui`, `preview-source-controls-ui` pass. Pre-existing failures that also fail on baseline `a5ff322`: `browser-background-link-ui` (source focus timeout), `project-window-link-ui` (assertion at line 25). `browser-actions-ui` now passes through the chat-link step; its download-denial assertion predates the Downloads feature and still fails.
- iOS (iPhone 17 Pro simulator): all 153 unit tests pass; the new project-chat switching UI test passes on iPhone and iPad Pro 11-inch. `testCompactHeaderStaysInChatWhenBrowserCloses`, `testPairStartAndReply`, `testTypingDoesNotTraverseLongChatHistory` and `testWorkspaceTabsKeepTypeIconsAndChatNavigation` fail identically on baseline `a5ff322` (they target the pre-drawer iPhone layout or hidden restored areas); a shared `submitPairing` helper was added but these fixtures still need a maintenance pass.

## Mac package

Signed `Proteus.app` 0.2.32, build `6e8c4b1236d8+src.734be4e331ab`, source fingerprint `734be4e331abc7628158b0353e1b3b10fd0590178ad2a2739f342d5a9f7cc656`, 394 runtime files, clean tree. Strict deep signature passes with the installed identity (Apple Development, team `TEAMID0000`, `org.proteusapp.proteus.desktop`); no root-level documents included. Isolated packaged startup reports version 0.2.32, providers copilot/codex/claude/mtplx and Cua Driver installed. Installation on this Mac is through a local update coordinator (`purpose:update`) and the supervisor idle barrier; installed/live verification is recorded separately once it completes. No publication to downloads.proteus.example and no other device rollout.

## Installed on this Mac (October 28)

- **Installed:** supervised update job `a454d5e3` completed with outcome `updated`; runtime `6e8c4b1236d8+src.734be4e331ab`, source `734be4e3…c656`; `/Applications/Proteus.app` reports 0.2.32 with a strict-valid signature from team `TEAMID0000`. The supervisor's own health check passed and its continuation resumed this same chat. Reported free-space change: −273,260,544 bytes.
- **Path:** the Codex update coordinator (`abe3e5f7`) could not proceed: on 0.2.31 each `proteus_update` call required approval and Codex stopped waiting after about 30 s. The originating release chat prepared and handed off the same exact package under the operator's authorization for this Mac. 0.2.32 removes that approval for user-started update chats.
- **Preserved (read-only checks after restart):** 52 chat records; this chat's 2,318-event history; four window sessions with their tabs and drafts (1/88/138/115 tabs, 0/5/5/11 drafts); settings including update-coordinator defaults. No pre-install count was captured by this chat, so preservation relies on the supervisor's verification plus these spot checks.
- **Desktop control:** Cua Driver and Peekaboo installed, no permission issue reported (status only; nothing installed).
- **Not yet live-verified in the installed app:** the responsiveness improvement under your real multi-window workload, link-picker and app-link prompts, attachment viewing, Claude non-interrupting steering, MTPLX availability with its server running, and rich iOS push (website not deployed). No publication, website deploy or other-device rollout occurred.

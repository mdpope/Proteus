# 0.2.32 release evidence (October 27 requests)

Branch `oct27-release`. Source requests: the Oct 27 request note (kept outside Git) and follow-up chat requests. Implemented, verified and deferred work are separated below; a clean build is not a live-workflow verification.

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
- iOS: see the native results section.

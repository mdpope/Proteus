# Nov 17 implementation

Version 0.2.46 is open on `planning/nov17`, based on private canonical main
`0bce75e053f8e74821b73126616d361ed5732fcf`. Nov 15 was closed before the version
reservation. The working source has no frozen release commit. See the
[rollout record](rollout.md) for the three authorized devices.

| Item | Source checkpoint | Acceptance still needed |
| --- | --- | --- |
| N17-01 | Browser tab Move uses the native menu above the browser surface. | Check destination selection and dismissal at small window edges. |
| N17-02 | Saving a workspace name refreshes the sidebar and open labels. Isolated Electron passed immediate refresh and restart persistence. | Check two windows observing the same owner. |
| N17-03 | Linux uses the renderer's address suggestion list to avoid focus transfer to a native popup. | Confirm behavior on affected KDE session. |
| N17-04 | Native links publish their insertion intent before general browser updates. Only right-edge overflow is revealed. | Link placement, focus, profile and draft fixtures passed. Measure the first frame and overflow with the native strip. |
| N17-05 | Shared desktop Back, Forward, Downloads and Go artwork. | Compare Mac/Linux/Windows at supported scales. The older toolbar rehearsal stops at its agent-button role assertion. |
| N17-06 | Machine DNS is the default. Explicit encrypted DNS disables plaintext browser fallback. Changes apply at restart. | Collect controlled resolver traffic and verify ordinary profiles and Incognito. |
| N17-07 | Schedule removal is revision-bound and replayable, preserves past runs and rejects an active run or a native/source-managed definition. | Store and owner tests passed. Check the owning computer end to end through the UI. |
| N17-08 | Local and remote editors offer refresh-and-save and explicit choices for concurrent edits without discarding the draft. | Verify context change and a concurrent edit end to end in both editors. |
| N17-09 | Local and remote Run now show admission and use the accepted run ID. Replaying a confirmed request returns its original run. | Manual replay and revision tests passed. Confirm the original Work Mac case. |
| N17-10 | Interrupted schedule chat exposes saved-access review. Captured access can be kept if current grants still apply, or revoked. | Owner fixture passed stale revision, keep, repeated keep, revoke and unchanged capture. Exercise actual continuation with changed resources and an affected provider. |
| N17-11 | Bitwarden help distinguishes extension install/enable from official desktop integration and Touch ID setup. | Real biometric unlock and controlled autofill need the operator and configured Mac. |
| N17-12 | Existing installed 0.2.45 Default profile loaded the Fox homepage with blocking active and no visible Admiral prompt. | Reproduce in the affected profile. The scoped Nov 15 filter remains the only confirmed fix. |
| N17-13 | Local extension library reuses a digest-checked package with a destination permission review and per-profile installation/storage. | Verify cross-profile install offline, separate grants and enabled state, and restart. |
| N17-14 | Exact-origin notification settings in Browser Preferences and current-site privacy menu. Isolated save/reset/reload passed. | Verify actual Slack permission recovery and notification delivery separately. |
| N17-15 | Scratchpad associations can be changed by dragging into workspace/project folders, with the same owner and saved revision checks as the association picker. | Isolated Electron passed project-to-workspace drag with the body preserved. Cross-workspace, dirty-editor and multiwindow cases remain to verify. |
| N17-16 | Named website popups use a closeable tab in the opener's profile and retain Chromium's opener relationship. | Isolated Electron passed opener messaging, single tab and guest close. The operator confirmed email sign-in. Verify the actual Glassdoor Social-profile sign-in and tab closure. |
| N17-17 | Physical scrolling reproduced the hitch on the installed Mac. Instruments found 25 recurring main-thread stalls of 247–326 ms. The shared remote client now uses native base64 conversion. A near-limit synthetic encrypted message in Electron reproduced a 245 ms median main-loop gap on the old path and 11 ms on the new path. | Protocol, queue and compatibility regressions passed. Repeat physical scrolling in chats and embedded pages on the candidate. Production packet size and exact origin at the recorded stalls remain unverified. |
| N17-18 | Shared desktop/web keyed Cards/Table, owner run timing and usage, offline rows and counted filters. Native iOS retains the compact Table and filter expander and adds optional adaptive Cards. | Isolated Electron/Chromium/WebKit passed filter/layout persistence, node identity, progressive loading and run metadata. Browser fixtures verified at least four columns at 1810 px, six at 2250 px and one at phone width. iPhone and iPad simulators passed compact Table and Cards switching. Live owner transitions, iPad split view and physical scrolling remain to verify. |
| N17-19 | Mac owner advertises 120 seconds and a 3,850,000-byte WAV cap. Scoped relay, legacy iCloud envelopes, the frozen native reader and original chat attachments handle the new limit. The original Ask turn offers scoped reminders, Scratchpad edits, web search and reads from enabled ObsidianMCP sources. | The longest relay and iCloud fixtures passed with unchanged v1 binding and replay behavior. A live Codex run called a synthetic list-create tool exactly once without approval. Real Build Mac capability, original request recovery and phone coordination remain pending. |
| N17-20 | Shared scrollable feature strips, single New Tab action, Life category layout, themed landing menu and Team Tools chrome changes are in the working checkout. | iPhone and iPad simulator feature-strip checks passed. The iPad test also passed the 44-point control, Team Tools dock, list and link editing, and return Home. Both review apps are launched. Operator review, pointer and split-view checks remain. |
| N17-21 | App section precedes workspace/project groups. Feature overview uses current membership; Smart Home uses saved browser descriptors. Native overview lays out sections lazily, and inactive phone feature roots release their mounted views. | The iPhone test verified the selected row, app tabs above it, sibling groups below it and the hidden tabs still listed on the project Tabs page. Comparative memory and frame measurements remain open. |
| N17-22 | File open carries the originating container and inserts beside Files. Toolbar actions, counts, divider and Scratchpad breadcrumb labels updated. The folder path has enough space vertically and can be read in full on hover. | Electron verified that Folder, Filter and Refresh align, then exercised the divider, adjacent placement and inline PDF. Paired-device placement still needs a live check. |
| N17-23 | Draft image preview navigator and owner-bound paste for raster images and inline PDF embeds are in the working checkout. | The isolated Electron checks passed pasted Scratchpad image preservation and a saved PDF embed resolving to an inline viewer. Native paste and PDF display need interactive review. |
| N17-24 | Super+P search overlay, prioritized result groups and scoped file/chat lookups added in the working checkout. | The live demo shortcut and isolated Electron shortcut from a focused embedded browser passed. Group ordering, paths, clear, Escape, file routing and settings routing also passed. Operator review precedes Build Mac rollout. |
| N17-25 | Readable filenames for new and retitled scratches, numbered collisions, legacy file rename action and saved-scratch search. | The closed-scratch search fixture passed. In the retained desktop demo, a legacy file was renamed with the same scratch ID and body hash. Existing registered folder paths remain available. |
| N17-26 | Current computer first, larger workspace headings, cached site icon, and one computer order for desktop destinations and the paired iOS destination store. | Electron verified a real cached icon, countdown display and cancellation, and the Engine Room demo order in the actual link picker. Both simulator review apps rebuilt and launched. Multi-owner order still needs a paired iOS check. |
| N17-27 | Tabbed Browser Preferences, exact-origin device rules, macOS authorization controls, notification Allow and sound test. Electron 45.3.4 distinguishes microphone/camera from display requests. Secure Zoom pages use the Chromium identity to reach the screen/window picker. | Zoom microphone and camera worked in Design Preview. The operator confirmed Zoom shared the intended window with the Chromium identity enabled through Request desktop site. Electron fixtures verified the automatic Zoom default, synthetic tracks, picker cancellation, playback and the website notification bridge. Recipient-side display, Teams/Slack, and the packaged Mac permission identity still need acceptance. |
| N17-28 | Life icons and Ask are visible on desktop and iOS. iPad app tabs remain mounted independently of feature tabs. The Home Assistant tab shows setup guidance and a route to Smart Home. Scratchpad sidebar recents include connected owners. | The desktop demo showed the Life glyphs. Focused iPhone and iPad tests passed feature navigation, persistent iPad app controls and the Home Assistant setup route. Cross-owner recents still need paired-owner acceptance. |
| N17-29 | **Send to Proteus** receives images in a floating, in-memory tray. Drop into a chat draft, a workspace folder, an editable scratch or Markdown document. The tray uses the Notifications surface color and keeps the darker cards. Hide preserves screenshots. Remove clears the selected thumbnail. | The operator verified that an image shared from Apple’s Screenshot editor appeared in the corrected signed preview. Native fixtures passed malformed preferred data, valid alternate TIFF, PNG preservation, image objects and file URLs. The extension registry and a fresh AppKit process show the renamed entry. Electron verified all four drop destinations and tray retention. Installed release acceptance remains open. |
| N17-30 | The desktop browser keeps a viewport capture while loading the same address and retains it on connection or HTTP failure. A short notice and durable notification have retry and log actions. | Disposable Electron verified a stopped localhost server during reload and restore, exact-address cache isolation, HTTP 503, notification actions, and recovery on the same tab. |
| N17-31 | OpenRouter is an owner-hosted provider for chats and schedules, with protected key setup, favorite models, searchable catalog, and reported generation costs in Run Details. | The public catalog returned 480 chat models. Synthetic provider tests verify key replacement, zero/missing/partial costs, tool-round totals, and remote projection. Electron verified the Engine Room and project chat picker. The web and iOS simulator builds passed. A signed protected Mac preview retained its key across restart and completed one real Liquid LFM free generation reporting USD 0. Removing an unsupported schema keyword from the API request resolved the original HTTP 400 while host-side duplicate validation remains enforced. Production installation remains pending. |
| N17-32 | Needs Attention notifications use Chats-style tabs, counted category buttons, search across the full notice list and computer filters on web and iOS. Desktop retains the owning-window recovery actions. | A 76-notification Electron fixture found an older browser conflict through the Browser button and search. The web build, full source suite and iPhone/iPad simulator filter tests passed. Include this in the next Build Mac candidate. |
| N17-33 | Keep automatic same-address reloads in one entry. Isolate browser-history conflicts from draft tabs in the same batch. Save pending history in a separate unloaded tab. Updates name the scope that still needs attention. | Verify the signed candidate and the blocked live owner's checkpoint separately. |
| N17-34 | Preserve the regular macOS activation policy when showing the incoming-link picker. | AppKit reported accessory mode in the affected running build and in the isolated pre-fix picker. The corrected picker retained regular mode. The two-window fixture also passed explicit Close and restart restoration. Verify the affected window on Build Mac. |
| N17-35 | Retain verified peer rows through background refreshes. Age failed, interrupted and waiting chats into Recently finished at 72 hours. Use normal title contrast and a Finished accent. Scale card layout and type from 75% to 200%. | Verify the active count stays steady through live Build Mac peer refreshes. |
| N17-36 | Preserve Scratchpad selections and reading offsets, open README, and support document sizing, wrap, chat pinch and scrollable image zoom. Explain custom-port TLS errors. | Electron verified the selected note and README across tab switches and confirmed zoom and image panning. The installed owner reached Home Assistant on the requested port over HTTP; HTTPS failed its handshake. |
| N17-37 | Use owner-side preview and a durable rename intent for known legacy Scratchpad paths. | Synthetic collision and crash-recovery tests preserve note bytes and associations. Verify the Build Mac migration and remaining legacy paths. |
| N17-38 | Use the regular Chromium user agent on both Teams HTTPS domains. Keep background navigation and page-initiated popups from taking input focus. | Live sign-in reached the organization’s identity provider, then Teams looped between the cloud and legacy domains. The cloud host returned an error redirect with the Electron identifier and served the web client with the corrected identity. Disposable Electron reached public sign-in and retained native focus through an inactive tab’s later navigation and popup. Authenticated Teams acceptance requires the field update. |
| N17-39 | Route Engine Room links through the saved browser preference and place embedded links at the top level. | An isolated Electron profile exercises Account & Security in both browser modes. |
| N17-40 | Return the captured state during owner changes and schedule a follow-up refresh for overlapping live events. | Recent Build Mac logs recorded repeated `STATE_CHANGED` responses. An Electron fixture with 500 chats and overlapping owner changes preserved composer focus, draft text and reading position with no display failures. |
| N17-41 | Mac EventKit export instructions and a shared Reminders import preview preserve source list boundaries, notes, due dates and completion history. Apply is account-bound and skips records with previously imported source IDs. | The Swift exporter compiles. Synthetic Electron and Laravel checks passed source account and list selection, readback, stale previews, name collisions and replay. Web assets build. Real Apple Reminders consent and production server and client rollout remain pending. |
| N17-42 | Chat Details can refresh current sources directly. The owner resolves the scheduled chat's captured workspace references and validates its managed account binding before saving. | An Electron fixture refreshed instructions from Chat Details. A synthetic owner run reproduced the lost-binding error, recovered the referenced instructions and continued with the original account workspace. Field verification on the affected run is pending. |
| N17-43 | Scoped schedules reject incompatible chat-wide approval overrides. Existing runs can return to the schedule's approval mode before continuing. Desktop approval can remember the exact scoped command using the existing owner check. | A synthetic owner fixture reproduced the continuation failure and resumed after clearing the override. Electron opened the fixture by chat link and cleared its override in Chat Details. Field verification is pending. |
| N17-44 | Opt-in chat and schedule source refresh follows edits to already-selected instruction and skill bodies and logs the captured revisions. | Synthetic owner tests verified current bodies, stable selections, retained snapshots and review on metadata or scope changes. Electron verified that enabling the setting in Chat Details affects the next turn. Field verification is pending. |
| N17-45 | Desktop and iOS protect the selected history entry from older commands, inconsistent history pages and redirects during traversal. | A real Electron window passed delayed-command and redirect traversal tests. iPhone simulator tests passed rapid Back/Forward, stale WebKit callbacks, history paging and a project browser swipe. The affected physical tab awaits verification. |
| N17-46 | iOS saves local browser visits in a separate encrypted journal, refreshes offline history once per owner sweep, flushes dirty state asynchronously on computer switch and reuses composer layout. | Physical iPhone resource reports identified cache encoding, encryption and history processing. Simulator tests passed migration and synthetic typing under full and incremental owner updates. A live trace of the current phone build remains pending. |
| N17-47 | iOS startup reads and decrypts document tabs and browser history in the background. Current chat patches that fit the latest page bypass rebuilding older pages. | Simulator coverage exercises preserved visit and tab restoration, late chat pages, and typing during full and incremental owner updates. Physical deployment is pending. |
| N17-48 | iOS saves pending tab edits and retry receipts through a small journal that reuses unchanged owner snapshots. The chat runtime timer prepares intervals on a background task and updates the elapsed time from those intervals. | Migration tests verified snapshot reuse and retained intent after a failed journal replacement. Runtime tests covered overlap and offline totals. The physical follow-up recorded no potential hangs and the operator reported smooth typing with uneven scrolling. |
| N17-49 | Launch the installed macOS bundle through LaunchServices for update and rollback. Keep the profile argument and owner environment, and record the actual app PID for recovery. | The running installed bundle failed to reach the reported Home Assistant route. A separate LaunchServices process of the same signed bundle opened it in an isolated profile, and its returned PID matched the owner. A live supervised replacement still needs readback. |
| N17-50 | Put Chat size under the chat actions. Share one live size control and 100% reset across the desktop chat, document, Scratchpad and image controls and desktop/web Chats dashboard. | Electron verified chat pinch, slider placement and reset, draft retention, document wrapping and image panning. Chromium and WebKit verified separate Cards and Table scales. |
| N17-51 | Reject macOS launches of the Apple-restricted Passwords native host and show the reason in the existing extension notice. | Port and one-shot coverage, normal-host behavior and the isolated Electron notice passed. The source suite passed 1,964 tests with four skips. This correction is source-only. The Mac crash trigger and the reported Linux crash still need evidence. |
| N17-52 | Pin Electron 44.11.5 without changing certificate verification, trust or settings. | Three matching Mac stack signatures led to upstream issue #55799. Static checks, 1,964 source tests with four skips, isolated browser/conferencing checks, signed Mac smoke, and official archive extraction passed. Live Mac verification gates the Work Mac and Linux rollout. |
| N17-53 | At background load completion, restore focus to the current page or shell if the hidden tab still owns it. | The same focus transfer reproduced on Windows with Electron 44.10.2 and 44.11.5. The correction passed isolated native source fixtures on Windows and macOS. Exact Windows package acceptance and live readback are tracked in rollout. |

The latest dashboard review uses a Chats-only scope strip, a single search and action
row, counted status controls and buckets, aligned Table headers, and 3 px leading card
accents. Desktop and web share the toolbar and list. The Electron, Chromium and
WebKit fixtures verify the new headings, widths, counts, filter reset, and preserved
row identity in both layouts.

Desktop Life category and lower-level tabs use project tab metrics with matching
padding, font size, gap, separators and background in Electron. The iOS preview
keeps its existing tab geometry. Both simulators were rebuilt and launched, and the
iPad showed the corrected Smart Home panel colors and matching sidebar glyphs.

The demo previously showed Zoom joined with microphone and camera enabled after
explicit site settings. Electron 45.3.4 fixtures now verify removing saved device
rules in Preferences, browser-initiated concurrent microphone and camera prompts,
saved decisions and synthetic tracks. Notification removal restores Ask in the
already-open tab and a fresh request reaches Needs Attention. The Chromium display
fixture verifies the screen/window picker, confirmation, cancellation and a live
synthetic track. Zoom still showed a microphone control with no visible response in the live preview.
The Zoom trace captured same-origin embedded requests with no device type. Electron's
embedded permission callback omits the device, unlike its ordinary capture callback.
The isolated Chromium fixture reproduced the exact request shape, showed the chooser
and verified a microphone-only rule, a refused untyped response, and an actual synthetic
audio track after reload. The ordinary capture fixture still verifies site permission
prompts and restoring Ask after a prior grant. On the real Zoom retest, the operator
reported the combined chooser appeared. They then confirmed both devices individually
and reported that both worked in place. The same trace shows one Proteus chooser
followed by separate Chromium microphone and camera requests.

Zoom screen sharing previously opened Zoom's empty source list in the live preview.
The public Zoom Meeting SDK selects its external desktop connector when it detects
Electron. The default site identity for secure Zoom pages now keeps the Chromium
version and omits the application tokens. A disposable HTTPS fixture proved the
Zoom-origin iframe reached Chromium's Proteus picker, could cancel, and obtained
a live synthetic track after an explicit selection. In the existing live preview,
Request desktop site exercised the same Chromium identity. Proteus displayed its
screen/window picker and Zoom reported “You're screen sharing” after selection.
The operator confirmed the selected window was the intended one. Proteus now
requests bounded source thumbnails and presents medium cards grouped by screens
and windows. Previews remain in the picker. Sources with no thumbnail can still
be selected by name. The Zoom-origin fixture verified both thumbnail groups,
the missing-preview fallback, filtering, cancellation and an explicit selection
with a live synthetic track. The operator confirmed the thumbnail picker works
in Design Preview and reported clipping on a portrait display. The follow-up
fixture verified that portrait previews keep the landscape width and top out at
twice the height, with the entire image contained. It also verified square
window previews, cancellation, and successful selection. Electron 45.3.4 offers the macOS 15+ system picker
experimentally. That option skips the existing display request handler, which
checks the requesting frame and revalidates the tab after selection.
The updated portrait fit on physical displays, a receiving participant's view,
and the packaged Mac build remain unverified.

Desktop Life category and subfeature tabs share a renderer and stylesheet. The
Electron Life fixture compares both strips' computed dimensions, type, selected
underline and borders. Both iOS preview apps were rebuilt and launched. In the
iPad preview, empty Scratchpad recents take zero additional rows and Chats shows
seven available recent chats. Paired-owner Scratchpad recents acceptance remains open.


The latest full Node suite passed 1,941 tests with four skips, and npm run check passed. The final focused Life Ask,
Codex, Scratchpad and audio-path assertions passed 54 tests. The desktop, Chromium and WebKit schedule-to-chat
rehearsal and the local web bundle build passed. These fixtures use synthetic data. Third-party
account behavior, physical scrolling and installed-device acceptance are tracked separately.

### iPhone performance field evidence

The iPhone's symbolicated 0.2.46 resource report attributed 90 CPU seconds in 134
elapsed seconds to Proteus. It sampled cache serialization and encryption on background
queues and history processing on the main thread. An earlier 0.2.45 report
measured 17.19 GB of file-backed memory dirtied in around 19 minutes. Read-only
metadata on the newer build showed 17.7 MB of browser history and 13.3 MB of tab
state. Instruments could reach the device over Wi-Fi but could not attach to the
running process. These observations cover previous device activity. The current
typing stall still needs a live trace.

The isolated iPhone simulator run retained all 880 characters in each of the full
snapshot and incremental push scenarios. Editor input took 2.1–2.2 ms at the 95th
percentile. The main-queue delay reached 200 ms in the isolated run. A run with the
desktop test suite active reached 2.45 seconds. The measurements cannot identify
the stack responsible for those outliers.

The wired system-wide Time Profiler run identified Proteus in its process table but
reported zero app CPU samples. A later direct attach by name succeeded and recorded five
samples before the process exited. Neither trace can identify the typing hitch.

The simulator retained 880 characters under each sync mode. The 95th-percentile chat
merge took 0.17–0.18 ms, compared with 10.6–15.5 ms in the previous isolated run. The
largest main-queue delay still reached 181 ms. Account-switch browser restore and the
initial per-owner chat cache read still run synchronously.

### Repeat wired iPhone profile on 2611.19.4

The same 85-second typing and scrolling exercise recorded 11,285 Proteus main-thread CPU
samples after the update, down from 29,019. Instruments recorded zero Proteus potential
hangs, down from seven (274–422 ms). The operator reported typing was fine and scrolling
was improved but still uneven.

Cache serialization remained the dominant background cost. The new trace had about 96,600
background samples through cache work, versus 104,300 in the baseline. File metadata
showed a 2.2 MB owner snapshot and an 11.1 MB tab journal. The journal can still carry
large retained records. Notification processing and tab refresh were among the largest
identifiable residual main-thread costs. The trace did not identify the cause of an
individual missed scrolling frame.

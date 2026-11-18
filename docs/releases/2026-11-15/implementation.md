## Windows native validation correction

The first native Windows source run at `d43b17fb` reported 1,881 passed, 36 failed and 12 skipped;
static checks passed. No package was produced. A disposable reproduction outside the restricted
sandbox confirmed that file flushing succeeds while directory flushing returns `EPERM`, causing
Scratchpad setup/save to report failure after writing. N11-72 omits only the unsupported Windows
directory flush; file flushing, revision checks and the POSIX directory flush remain unchanged.
The existing 24 Scratchpad store/service/action tests, full source suite (1,925 passed, four
skipped, zero failed) and static checks pass on the publisher host. The full suite used a short,
canonical temporary directory after sandbox network restrictions and temporary-path fixtures
failed in earlier retained runs. Windows diagnosis attributes 23 failures to this runtime defect,
eight to temporary-home ACL fixtures, three to unclosed SQLite fixtures, one to a Python alias
and one to a simulated-platform cache-path assertion. The seven-file test-only correction from the
Windows builder passed 42 affected native tests and was merged preserving its original commit.
Combined source `967381d9fc0dfc333a12b447803bfed5ca8f5305` passes the publisher's full suite
(1,925 passed, four skipped, zero failed) and static checks. This correction
requires a new Windows source pin; already accepted Mac/Linux packages are not rebuilt by it.
The bounded native Windows rerun passes 1,917 tests with 12 skips and zero failures; static and
exact-package UI/terminal/restart, six-window events, checkpoint/restart, Fox filtering, extraction
and payload/source integrity checks pass. Three ADO timeouts in an earlier unbounded run passed
in isolation and the bounded full rerun. Publication and installed qualification are tracked
separately in rollout; no new real rollback or migration result is claimed by source acceptance.

## November 16 — consolidated continuation

N11-71 bundles a Fox News-scoped rule for its observed Admiral loader separately from downloaded
filters, covering existing caches on update. Focused tests cover publisher, request type, cache
reuse and ordinary filtering. Synthetic HTTPS responses through the real Electron request
pipeline confirm article/bait scripts survive, the loader is blocked and disabling profile
protection allows it again. Static checks pass. The live investigation profile did not reproduce
the reported prompt; installed acceptance remains outstanding. No new package is implied.

Linux package testing exposed a startup race in the checkpoint test's readiness probe, before
its product assertions. The test now waits for the actual renderer-ready acknowledgement and
completed loading as well as recovery completion. The corrected native test passes on Mac and
is used by the Linux disposable package harness. This test-only maintenance change does not
alter the frozen `d43b17fb` application bytes or source provenance.

November 17 follow-up N11-70 adds a strict local synchronization barrier to update window
checkpoints. Unlike background synchronization, it rejects unresolved outboxes, conflicts,
scope/owner backoff and failed reads, rechecks scopes introduced by hydration and proves the
current projection has no uncommitted changes before saving. Restoring/crashed windows cannot
silently skip an update checkpoint. Ordinary close/quit remains on its existing save path.
The exact navigation verification is unchanged. Four focused convergence/error/intent tests and
a synthetic native two-window regression cover canonical chat hydration, two exact restarts,
selection/drafts and refusal to acknowledge a failed owner read. This is source-only and does
not change the accepted original package identities. The installed older owner's bootstrap and
the failed Linux attention job remain separate rollout work.

Linux rollout exposed a historical-owner PID restriction after a normal restart. The source-owned
maintenance bootstrap now offers explicit authenticated API revalidation of the current owner,
binding its stable session and completed-job revision into the supersession receipt. Exact
installed package/signing, two recovery generations, immutable original journal and live
connection/runner PID checks remain required. This operations helper is outside the frozen
application build pin; no new application package is implied. Ordinary coordinator/UI support
for abandoned chats remains queued under N11-69.
Final helper verification: 21 focused maintenance tests pass; the full source suite passes
1,920 tests with four skips and zero failures; static checks pass. These results qualify the
operations helper, not a newly built application or a completed Linux installation.

The operator authorized all queued Proteus changes, Linux build/verification and targeted primary
Mac/iPhone rollout. `codex/nov11-continuation` remains the sole integration branch; private history
must not be pushed to sanitized remotes. No new version or release was opened.

- N11-66 adds overview editing of the selected Team list on desktop and iPhone. Desktop synthetic
  acceptance passes revision-bound save, stable member/link identities, reopen and no-write Cancel.
  Native compilation and focused iPhone simulator edit/save/reopen acceptance pass.
- N11-67 adds Team Tools, Reminders and Scratchpad to the macOS URL picker, remembered defaults
  and routing rules. Feature membership remains window-local. Synthetic Electron acceptance passes
  all three placements, saved selection, existing project rules, keyboard/cancellation and sharing
  boundaries. Thirteen focused event/routing tests and static checks pass.
- N11-68 preserves both Linux fix commits through merge `d489be7f`. The downloaded private bundle's
  hash, complete history and original base were verified. Direct streams remain the fallback;
  combined signed Mac package six-window/all-three-events/survivor acceptance passes.

The first combined Node suite used macOS's default long symlinked temporary path and failed
canonical-path/socket checks. The rerun with a short canonical temporary root passes: 1,917 tests,
four skipped, zero failures. Linux independently reports 1,911 passed, ten skipped and static checks
passing. Its extracted exact package passes credential-free UI, terminal/restart, live Codex and
six-window event acceptance. Downloaded archive/source/payload hashes match the private draft;
the source companion matches all 642 accepted native runtime/build inputs. The Linux payload is
unsigned and private; no Linux publication, installation or installed migration is claimed.

Frozen application source is `958f769998f82e195cd4316ba4a21c96fc077305`. The signed Mac candidate
`958f769998f8+src.fccf0119ec46` passes packaged-app, preserved vendor signatures, launch, six-window
events and official archive extraction/inspection roundtrip checks. Corresponding source was exported
against accepted provenance. The signed iPhone candidate is 0.2.45 / 2611.15.3; signature, profile,
entitlements and intended-device binding pass. Mock Keychain package tests do not establish live
credential continuity. Physical installation and preservation remain separate rollout gates.

The redundant Nov 11 release, Life Ask and imported Linux-fix branches are closed after preserving
their history in the continuation branch. Their checkouts/dependencies remain intact. The obsolete
Nov 10 sanitized-history branch was preserved in a verified private full-history bundle before
closing; it was not merged into private release history. No branch was pushed or history rewritten.
N11-41 is explicitly deferred by the operator to a future Mnemosyne update. Private device paths,
raw receipts, source-transfer archives and recovery evidence stay outside Git.

## November 15 — shared feature navigation, source qualified in stages

Reminders and Scratchpad retain their selected nested view across sidebar navigation. Workspace
Files uses the normal authorized file browser in shared selectors, including Team Tools. Resource
type remains independent of placement; native root Scratch/Reminder/File references retain their
owner/account and restore without acquiring feature membership. Native Team Tools now reuses the
feature container instead of maintaining a separate resource renderer. Global and feature tab
overviews group feature-owned views and use bounded ordinary previews; private tabs remain excluded.
Native owner-hosted Scratchpad images stay memory-only. Browser-site favicons and canonical title
insets are reused, and the selected reminder card stays visibly highlighted in the Items column.

Validation: 1,908 Node tests pass/four skips, static checks, desktop real-favicon/spacing/selection
and website UI fixtures pass. Thirteen native projection tests, iPhone root-resource cold restore,
iPhone/iPad Team Tools, iPad Reminders workbench/overview and paired Scratchpad save/readback/cold
restoration tests pass. The web direct-link check also verifies that a notification target wins
over a previously selected auxiliary tab. The operator approved pinned MIT html-to-image 1.11.13;
actual website screenshot UI passes, with session-only bounded images, file access revalidation
clearing and ordinary icon fallback for cross-origin embeds. Signed candidates and combined
rollout are pending. The current installed host correction remains 79f70177. QR N11-41 stays held.

## November 12 continuation — source changes, deployment pending

Startup now avoids rewriting unchanged destination selection and loading dormant owner caches
on background transitions. Failed selection writes preserve the old selection and can retry.
Ordinary relay startup waits for an active scene; existing upload connection holds remain.
This reduces specific prewarm work, but startup cache reads and physical prewarm performance
remain to be measured. Final qualification passes 246 native unit tests, foreground pairing and
foreground/cold/background notification UI, 1,827 JavaScript tests/four skips and static checks.

Native shell membership now observes browser IDs/scopes rather than full history/title/reading
descriptors. Indexed membership comparisons, one shell assignment and batched overview removals
preserve source-adjacent insertion, existing order, other resource types and selection. The exact
old/new synthetic 1,000-tab comparison measured 222.7 ms versus 1.83 ms in one simulator run;
this is not a physical frame-rate measurement. Eleven focused projection tests and phone menu/
Incognito duplication plus restored large-history overview UI pass. Full native regression:
243 tests passed; static checks passed.

Life Ask now includes the executor/native helper/cloud mirror, restricted first Codex turn,
account-bound Life → Ask project, desktop settings/pairing/history, web/iPhone history and exact
chat notification routing. Website answer push dispatches immediately with durable per-recipient
send guards and separately records APNs acceptance. Redundant completed admission payloads retire
after 30 days; permanent replay receipts and ordinary chat recordings remain. Full JavaScript:
1,827 pass/four skip; website: 115 pass/1,052 assertions; native: 239 pass and iPhone simulator Ask
UI pass. The native fixture now clears synthetic pairings between serial cases, avoiding the
production 20-device limit without changing that limit. Desktop/web renderer and
live synthetic Codex policy checks pass. This is source qualification; physical paired acceptance,
latency, rich follow-up and rollout remain open under the existing device gates.

N11-06 investigation found that the file explorer mixed the default workspace's projected
library/every-chat folders into another workspace. The new regression fails before the fix;
the explorer now resolves only the selected workspace's configured roots. Forty-five focused
file/remote tests, the full 1,792-pass/four-skip suite, and static checks pass. The
[folder discovery audit](folder-discovery-audit.md) records membership, source-library and grant
boundaries plus a picker proposal; cross-client visual design acceptance remains open.

N11-07/N11-37 follow-up unifies the phone main-tab drawer with the wide tab strip actions and
privacy icon. App-owned private iOS copy actions share a local-only expiring clipboard service;
close clears only the unchanged private copy, and startup clears a marked interrupted copy.
Named disposable-pasteboard lifecycle, independent-session and native iPhone drawer menu/
Incognito duplication tests pass. Node regression remains 1,791 pass/four skip, static checks pass.

N11-11 guided setup now provides per-backend actions and selected-computer routing. The owner
captures saved current model options, reuses active setup chats and preserves retries after a
lost reply. Remote management grants are rechecked before creation. Setup has no updater grant
or updater instructions. Thirty-nine focused owner/coordinator/relay tests and native Engine
Room missing-driver/defaults/selected-backend/reopen checks pass without a model turn or installer.
The Mac signing preflight now reads native session flags and distinguishes missing evidence from
a locked session; its classification regression and actual unlocked-session check pass. Full
regression: 1,791 pass/four skip/zero fail; static checks pass.

Development package retention now shares one machine cache across worktrees/flavors, serializes
builds, retains the last verified package until its replacement verifies and removes superseded
or interrupted generated outputs. It preserves explicit release destinations and refuses unknown
entries, damaged receipts, symbolic links and running-app retirement. Mac icon output moves with
the package. Ten focused package/Apple cache tests pass; full regression is 1,785 pass/four skip,
and static checks pass. Native packaging and legacy-output
retirement are separate acceptance steps. The shared default keeps no additional older versions
beyond the updater's two full recovery generations.

N11-37 adds independent local-only Incognito sessions, privacy artwork, New Tab/link/duplicate
menu entries and the Mute icon. Shared history is read-only; iOS completion does not send private
text to another owner. Persistence, thumbnails/archives, resource inventory, Live Browser, project
following, agent access and tab relay all exclude private pages. Close clears session data;
normal and forced-crash restart rehearsals restore none and leave no private fixture markers
in app files. These additions are not included in the first corrective deployment. Validation: 1,778 Node
tests pass/four skip, static checks pass, native Electron isolation/exit/crash/menu rehearsal
passes, and four iOS native navigation tests pass. Physical Incognito acceptance remains open.


The next source batch extends N11-18 question attachments to the normal picker and paged arbitrary
files, including a lazy 4 GiB fixture that refuses full-body reads. N11-01 chat links now render in
Markdown and bare prose, with a shared strict parser and existing owner navigation. Electron
acceptance verifies both link forms, project placement, draft retention and no duplicate view.
The full Node suite passes 1,774 tests with four skips; static checks, web bundling and eight
focused iOS tests pass. Other resource link types and physical link acceptance remain open.
This batch is separate from the frozen first corrective deployment.

The operator authorized continued implementation, Build Mac/iPhone deployment and real-load
performance testing. Other deployment targets remain held.

- N11-35: browser profile, Files, Markdown and Terminal choices use the same slot-preserving
  replacement path as chat creation. Files keeps its parent through session persistence.
  Files and Terminal conversion in non-final application/project slots passes an isolated
  Electron test including reload. Existing chat setup/restart/submit acceptance also passes.
- Browser display names prefer the live page title over older shared labels. An unchosen blank
  page says New Tab. Returning/redrawing a blank page no longer takes address-field focus
  without a pending creation gesture. Broader cross-window focus acceptance remains open.
- Audio/close controls fit inside the tab's measured width. Real synthetic WebAudio acceptance
  includes a long title and close-button geometry.
- N11-36: a digest-bound supersession receipt supports rolled-back and legacy pre-install
  failures after a later healthy matching owner and two registered, fully verified recoveries.
  Multiple historical attention jobs do not mutually block preview. Original journals stay
  unchanged; maintenance archives compact evidence before deleting reviewed obsolete payloads.
  Changed files, helpers/locks, mismatched owner identity and insufficient protection fail closed.
- Update rotation retains the newest two intact full generations, including the new capture.
  A historical data-checksum failure can retire only when two others verify; its original receipt,
  error and actual tree digest remain in the retirement intent. Path, application, receipt and
  unsupported-file failures still stop rotation.
- iOS thumbnail loads publish batched notifications; overview state publishes once per changed
  batch instead of once per image and skips no-op refreshes. Descriptor sealing has a bounded
  two-second cadence with immediate lifecycle drains. Only the active overview card contributes
  transition geometry. Scroll bookmarks skip shared-scope reconciliation; metadata reconciliation
  uses identity indexes and preserves bookmarks for unchanged pages. Simulator build and ten
  navigation/Nov11 regressions pass; physical smoothness and battery benefit remain unverified.

The isolated real-load desktop profile completed with a 13,956-event conversation, the restored
tab catalog and six chat/browser/streaming scenarios. Every scenario had zero frames over 50 ms,
p95 at most 17.6 ms, and no renderer errors. This is a single desktop run, not iPhone acceptance
or a before/after comparison. Its private copy was removed. Snapshot preparation now skips atomic
writer temporary files and removes incomplete copies on failure.

Validation: full Node suite 1,772 pass / four skip / zero fail with canonical temporary paths,
including first-generation retention. Static checks pass. New source is not installed yet.
Remaining November 11 features and physical acceptance stay open.

# Nov 11 implementation

Version: 0.2.45 (reserved once; renamed from the queued Nov 10 plan before any version or build).
Branch: `codex/nov11-release`. Device deployment is held by the operator; a local Mac build only.

## Implemented in source

| Item | Change | Verification |
| --- | --- | --- |
| N11-17 scrolling | Idempotent streamed transcript writes; block-level Markdown replacement and highlight cache; coalesced host follow-scroll capture; in-place chat sub-tab rows; post-frame browser scroll sampling; stamp-cached content-tab registry; cached remote identity/addresses. | `test/scroll-smoothness-profile.mjs` (synthetic and isolated live copy), `test/streaming-render-ui.mjs`, unit tests. |
| N11-09 Chats list | Page scroller is the single surface; progressive loading, end/filtered status, no rebuild on unchanged polls (desktop). | `test/chats-list-scroll-ui.mjs`, updated `test/nov8-chats-ui.mjs` (Electron, Chromium, WebKit). |
| N11-13 scheduled label | Classify by recorded `chatType`, then `trigger`; schedule name only for legacy rows. Shared JS and iOS source. | `test/chat-types.test.js`. iOS not built. |
| N11-10 approval names | Managed connection label in the request; card/notification/question name service and connection, turn-only duration, separate tool permissions. | `test/approval-names.test.js`. |
| N11-12 Playwright windows | Exact tab ID routes to its open owning window; Playwright/developer schema accepts validated `windowId`; explicit choice never overridden. | `test/agent-owning-window.test.js`, `test/playwright-owning-window-ui.mjs` (reproduced the installed failure before the fix). |
| N11-04 drafts | Desktop transport `draft.text.get/save` restored (earlier commit); client polls the owner revision every 1.5 s with conflict retention. | Encrypted two-owner regression. Installed cross-device acceptance pending (deployment held). |

## Follow-up batch (operator report from iPhone)

| Item | Change | Verification |
| --- | --- | --- |
| N11-18 | Attachment byte caps removed (owner free-space reserve); streaming verify/hash/upload; file-backed paging and downloads. | `test/chat-attachments.test.js` (21 MiB PDF delivered from disk), iOS unit tests. |
| N11-19 | `src/shared/human-time.js`; owner time zone; renderer formats ISO instants; iOS labels. | `test/human-time.test.js`, `test/claude.test.js`, iOS `NativeNov11Tests`. |
| N11-20 | iPhone single-line address editor and scrolling idle URL. | iOS `NativeNov11Tests`; simulator build. Physical acceptance held. |
| N11-21 | Coalesced iOS shared cache writes. | iOS `NativeNov11Tests`, 121 existing RemoteTests/navigation tests. |
| N11-22 | Internet Search provider grid on iPhone. | Simulator build. |
| N11-23 | State-neutral POSTs keep state projections valid. | `test/state-response-cache.test.js`. |

Existing iOS RemoteUITests browser cases and `test/chat-attachments-desktop-ui.mjs` fail
identically on the original code/clean main at outdated setup; they do not verify these changes.

## Scroll measurements

Frames are renderer `requestAnimationFrame` intervals while wheel input is driven through Electron;
main-thread delay is the Electron main process event-loop delay (it routes input and frames and
hosts the owner server). Synthetic fixture on a 120 Hz display, before → after:

| Scenario | Style recalculation | p99 frame | Frames > 25 ms |
| --- | --- | --- | --- |
| Long rich chat while a reply streams | 282 ms → 14 ms | 32.2 → 10.3 ms | 6 → 0 |
| Feed page, 220 tabs, title/URL/embeds changing | host layout 188 ms → 1.4 ms (chat sub-tab rebuilds removed) | unchanged (page compositor) | 0 |

Isolated copy of live data (322 chats, 647 browser tabs left unloaded, largest chat 39 MB /
13,956 events), 60 Hz window, before → after:

| Scenario | Main-thread delay p99 / max | Notes |
| --- | --- | --- |
| Feed with embeds and title changes | 79.9 / 108.8 → 23.9 / 42.9 ms | Content-tab re-validation removed from session saves and reads |
| Same, with a reply streaming in another chat | 72.4 / 103.1 → 22.9 / 41.9 ms | |
| Long live chat, static | max frame 33.4 → 18.6 ms; style 33.5 → 15.8 ms | No dropped frame |

The live copy was APFS-cloned into a private temporary preview home outside every repository:
credentials, pairing/relay identity, encrypted peer stores, cookie partitions, extensions, agent
grants and terminal sessions were excluded; all copied schedules were disabled; restored browser
tabs stayed unloaded; preview mode used a mock keychain and no provider authentication. The
installed Proteus owner and its data were not modified. Remaining main-thread work in these
scenarios is state projection serialization and browser state broadcasts with hundreds of tabs.

## Validation

`npm run check` passes. `npm test`: the remaining failures match the pre-change baseline
(13 environment-dependent tests: temporary-path realpath, tmux, WAL copy and recovery helpers).
Several older desktop UI harnesses (`chat-history-ui`, `message-actions-ui`, `chat-ui`,
`desktop-preview-ui`, `oct7-search-ui`) fail identically on the original code at outdated
navigation setup and do not verify this change.

## Not implemented in this pass

N11-01 clickable resource links, N11-02 Chats design and N11-03 header density investigations,
N11-05 Files tab placement, N11-06 folder discovery analysis, N11-07 iOS tab controls,
N11-08 iPad navigation investigation, N11-11 guided desktop-control installation, N11-14 Life
capture recovery/editing, N11-15 hosted Life MCP connection and N11-16 Mnemosyne ownership audit.
Web and iOS Chats-list scrolling (N11-09) and iOS builds are not done. No package was published
or installed.

## November 14 — N11-47 feature workspace follow-up

Scratchpad settings now read current Source Library registrations and refresh an open folder
picker after catalog changes. Configured storage sits behind a gear. Changing roots preserves
the old files and drafts, warns about rebuilding, and starts a yielding background-worker scan;
the list can show indexed items while scanning continues. Filters reset for the new root.

Reminders and Scratchpad share their feature tab strip, record close controls, add menu and
overview. Auxiliary resources retain existing sessions and permissions. Desktop includes terminals;
native and website clients expose their supported browser/file resources and explain unavailable
terminal/private-session capabilities. The strip is flush with the surrounding navigation, with
mobile dividers. Reminders has a desktop/tablet Lists rail, phone Lists menu, semantic icons,
quiet list accents and themed cards. Completion remains a separate action from opening a record.

Reload testing reproduced two additional navigation failures: a late restore could replace a
deliberate master selection, and the session page validator converted feature masters to Home.
The restore now honors newer navigation input and the saved-session format accepts current main
features. A fresh-reader regression and the real Electron reload sequence cover the fixes.

`npm run desktop:demo` runs the same source with isolated synthetic Life/Scratchpad data and
renderer reload. It preserves the existing preview home and does not replace the installed owner.
The website builds; its responsive browser test covers both palettes and file grant revocation.
Full Node validation passes 1,897 tests with four skipped; static checks pass. Seven website
Reminders API tests pass with 82 assertions. Focused Electron and shared iPhone/iPad simulator
flows cover record open/close, mixed browser tabs, global navigation and Scratchpad cold reopening.
These are source/demo/simulator results. Physical acceptance and the next production package
remain separate; the original live reminder and Home devices were not changed by these tests.
## November 14 — N11-48 workbench review and correction

Desktop source restores project selection and adds independent Scratch view descriptors, contextual
creation, separate workspace/project selection and Category filters. Search indexes custom
frontmatter and filenames in SQLite. CodeMirror 6 is shared with web and the offline native editor;
Markdown remains canonical and the existing read-only preview remains available. The desktop tree
now uses Workspace Files controls and file viewers under a narrow Scratchpad-root adapter.

The initial demo was exposed before visual qualification. Generated editor styles were blocked by
the shell CSP and folding hid the body; the original file and editor text still matched. Minimal
recovery files, index and serializable undo were preserved without replacing the edited note.
Scoped style nonces and removal of folding controls fix the display. A retained Scratchpad group
fixes the missing master bar. Open editors now defer automatic demo reloads.

Qualification: 1,899 Node tests pass/four skip; static check and website build pass. Real Electron
checks cover computed editor styles, no fold placeholder, formatting/Undo with exact saved text,
master navigation, shared browser, contextual selection and project recall. Native phone/tablet
typing/save/cold-reopen flows pass; the final native mode-only update guard compiles. The isolated
demo was refreshed with unchanged note hashes. This remains active design work, with native
folder/tab parity, broader remote Scratch placement and final physical acceptance still open.

## November 14 — N11-49 shared chrome and resource workbenches

Feature strips use project tab metrics and the same vector add/close icons as root/project/chat/
Team Tools navigation. Plus and empty-strip double click open the universal New Tab page. Full-title
hover hints are delegated across desktop/web strips and native labels expose hover help, without
fetching or capturing destinations. Feature workspaces still exclude new chats.

Reminders has an overview master and independent account-bound work tabs. Wide layouts use
Lists, Items and Details; a new tab starts at All Items. Creating in a list prefills that list and
saves into the same details column. Stable view IDs are separate from selected reminder IDs.
Unsaved desktop/web drafts and frozen operation IDs survive renderer reload under their captured
account/tab key; closed tabs retire their local snapshot. A synthetic committed-but-lost response
was recovered after reload with one canonical reminder, not a replay under a new ID.

Scratch navigation now guards late reads, saves the outgoing note, restores its cached editor and
updates the title/highlight for the selected note or attachment. Project association metadata no
longer participates in the navigation placement filter. CodeMirror uses theme ink for the caret.
Compact shared file controls use a refresh icon and readable filter. An escaped extension pattern
had blocked unindexed Markdown; root-bound Markdown reads and relative viewer links now work.
Returning from that viewer through the tree restores the same scratch without replacing its text.
Hidden file browsers no longer issue refresh reads merely because the document becomes visible.

Native Reminders uses the New Tab page and an adaptive workbench: three columns at sufficient
content width, a Lists menu with Items/Details in narrower tablet windows, and one active pane on
phone. Screenshot review caught a severely compressed portrait item column despite the first
interaction pass; widths, compact menus and themed form rows were corrected. Tests now check a
readable item-title width. The simulator retains a narrow application window after a device
orientation request, so its recorded geometry does not prove wide native-window acceptance.
Browser-close callbacks no longer override a newer record selection.

Final qualification: 1,900 Node tests pass/four skip/zero failures; static checks and the website
build pass. Disposable desktop tests cover three columns, list prefill, stable-ID reuse, universal
conversion/reload, uncertain-save recovery, draft reload, file switching, Markdown bytes, caret,
attachment return, root placement, project recall and hover. Website checks cover responsive lists,
both palettes and revoked-file revalidation. The focused iPhone and iPad flows pass. Xcode still
reports existing warnings and the simulator diagnostic collector's missing-simctl warning; these
are not claims of full native-suite or physical acceptance.

Only the design demo was restarted. Its note body hash and revision remain unchanged, and its
ordinary viewer API confirms the Markdown read fix. No production owner/website/physical phone
was updated. N11-48 native/cross-owner resource parity and the outstanding physical workflow
checks remain open. The original reminder, Home devices, source grants and QR hold were untouched.


## N11-50 — account replicas and owner-selected Scratchpad

Reminders remain server-owned. Native and desktop SQLite stores and the browser SQLite-WASM
worker apply the existing cursor/change feed transactionally, reject stale revisions and retain
tombstones. Server writes retain expected revisions and stable operation IDs. Account switches
and authorization failures never fall back to another account's cache. Network outages may show
the cached account read-only; unchanged browser snapshots avoid storage rewrites. Account recents
have no computer label.

Scratchpad sidebar/overview selectors use current connected-computer metadata. Desktop defaults
to local; iOS/web default to their selected computer. Workspace/project filters and reads/edits
come from that owner's configured folder through existing sharing/relay checks. Open tabs and
pending edits retain their original owner/root across selection and restart. Clean phone contents
are transient; encrypted pending drafts/retry state and recent metadata remain until safe commit.
Native and desktop sidebars include bounded resource recents.

Validation: final Node suite 1,904 passed/four skipped; static checks pass; eight canonical PHP
reminder tests including browser-account isolation pass under the continuation's isolated class
loader. Chromium validates real SQLite-WASM persistence and common UI; a two-owner real storage
fixture verifies catalog selection and remote saves leave local files unchanged. Shared iPhone
simulator verifies SQLite cold persistence/account separation, scratch retry/revocation, and
Reminders navigation. Later narrow cache/offline/visibility guards are included in the signed
build verification. Native source/UI checks are distinct from physical acceptance. Signed
Build Mac/iPhone/web deployment is authorized and in progress; QR remains held.


## N11-52 — native phone corrections (Nov 15)

The Scratchpad owner picker was inside the ready-only master list, making a disconnected
owner a navigation trap. It now remains outside the owner/resource subtree. Reminder workbench
compact details had only an Items button: an edge-origin right swipe now performs that same
selection change without closing/completing the record. Scratch metadata and filters are grouped;
formatting buttons use icons and CodeMirror selection/undo rather than appending literal snippets.
The bundled native editor receives palette text, muted, accent, panel and border colors, including
selection/code previews. Live Preview, Source and read-only Preview remain separate modes.
Upload progress moved from the transparent composer sibling into its card with height budgeting.

Validation: 1,908 Node tests pass, four skip; static checks pass. Shared iPhone simulator passes
reminder edge swipe and owner-confirmed scratch save/readback/cold launch, followed by a real
synthetic owner disconnection with its computer picker still hittable/openable. The bundled editor
page separately passes rendered Markdown and format/undo byte preservation in isolated Electron.
No orphan test Electron process remained. This is source/simulator evidence, not physical phone
acceptance or a new phone installation. QR and Home device-operation holds remain.

## Nov 15 release — operator batch (N11-53 … N11-65)

The operator renamed the open release **Nov 15** (version 0.2.45 unchanged) and added this batch.

- **N11-53 Code viewer/editor.** Files preview, full file tabs, remote web and iOS share one text
  viewer. Desktop/web use a lazily loaded CodeMirror 6 chunk set (core ≈ 340 KB loaded on first
  open; each language grammar is its own few-KB chunk: JS/TS/JSX/TSX, JSON, Python, CSS, HTML, XML,
  YAML, PHP, Java, C/C++, Rust, Go, SQL, Markdown, Swift, shell, Ruby, TOML, config, Dockerfile,
  Lua, Perl, PowerShell, diff, R). Unknown languages show as clean text. It fills the whole column,
  is read-only until **Edit**, saves through the owner with the preview identity (stale files are
  rejected), and Markdown edits use the Scratchpad live editor. iOS uses a small native
  highlighter and the same read-only/Edit/Save flow.
- **N11-54 File typing.** `src/shared/file-kind.js` decides by content, not name: binary signatures,
  NUL/control-character and UTF-8/UTF-16/Windows-1252 checks, shebang and marker detection. Any
  text file (`.txt`, dotfiles, `Package.resolved`, extensionless scripts) opens; binaries are
  refused with their detected type.
- **N11-55 Files memory.** Expanded folders, list scroll, selected file, scroll/caret in the file and
  unsaved edits survive switching tabs and remounts (desktop, web and iOS expansions/selection).
- **N11-56 Reminders ↔ workspaces/projects.** Account reminders gain optional `workspaceId`/`projectId`
  (website migration, replicas, iOS), editor selectors, Workspace Scratches and Reminders pages and
  a project Reminders page. Scoped pages hard-filter; the project Scratches page no longer
  duplicates the tab strip. The pendant resolves "in list … for project …" names exactly or asks.
- **N11-57 Scratchpad sidebar.** No computer selector; recents list every computer.
- **N11-58 Life workspace.** The Life workspace folder is chosen with the system picker when Life
  is enabled (existing installs are prompted to repoint). Default projects Ask, Smart Home,
  Nutrition, Garage, Fuel & mileage are created on demand; chats and searches started from a Life
  feature live in its project.
- **N11-59 Life navigation.** Smart Home, Nutrition and Garage use the shared feature tab strip
  (right-side overview/new-tab buttons, double-click, same tab types plus Chat and Internet
  Search). Garage = Overview/Vehicles/Fuel & mileage; Nutrition = Overview/Meal days/Daily log/
  Averages/Food Library. iOS gets the same pages without the content-tab strip (phone size).
- **N11-60 Connections.** Per-computer expandable workspace permission list with Allow-all
  Browse/Edit switches.
- **N11-61 Links.** Life Ask, reminders and scratch links show their destination like browser tabs.
- **N11-62 iPhone Reminders.** Save is a disk icon with its name, at the trailing edge of the actions.
- **N11-63 Tab menus.** "Move to…" and "Copy to…" for every tab type; Chats are no longer
  destinations; destination headings are bolder.
- **N11-64 Performance.** Synthetic and live-copy scroll profiles recorded below.

Not done / limits: iOS has no Life content-tab strip for Nutrition/Garage; iOS file highlighting is
generic; web Life pages do not yet have Garage/Nutrition tabs. Physical-device acceptance and the
website deployment of the reminders migration are recorded in rollout.md.

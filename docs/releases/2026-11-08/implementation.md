# Nov 8 implementation

Version: 0.2.44. Integrated into main. Release remains open.

Final Windows recovery correction `c235d2aaf6ce2f1b3c6ba8e80108103ca849df7d` is under
native package validation. A large cold baseline can exceed the old one-minute budget before
any comparison. Settlement now starts after baseline discovery, allows measured comparison
cost and records attempt/timing evidence. The three added regressions pass, along with 1,758
local source tests/four skipped, 1,750 native Windows tests/12 skipped and static checks on both
hosts. The accepted packages on other platforms retain their previously recorded identities.

Current gate: the [complete request audit](request-audit.md) separates source, simulator and
installed evidence. Build Mac, web, iPhone and iPad are authorized when ready; final native
interaction and signed-package checks precede deployment. New source adds native toolbar,
sortable columns, custom green artwork, both adjustable splits, modifier-aware selection and
inline expansion paging. Shared owner file tabs preserve source authority across placement moves;
web PDF and opened Markdown resource rendering use the same owner boundary. Notification
resolution propagates durably and uncertain push sends do not automatically replay. Attachment
errors have a keyboard-visible Remove action without losing the text draft.

Source verification: 1,753 passed/four skipped; static checks pass. Web: 110 tests/982 assertions.
Updated Chromium and phone/tablet WebKit fixtures pass. Electron incoming owner file tabs,
Markdown resources and placement pass. Phone/iPad shared file navigation/layout/menu and visible
attachment recovery pass in simulators. Phone batch drag passes with an independent two-file
desktop filesystem check. A failed drag originally invoked the context menu; a dedicated handle
separates those gestures. Final phone and tablet regressions pass. Native hardware modifier events,
edge autoscroll and physical behavior retain separate acceptance; failed receipts are preserved.

Current installed outcomes are in [rollout.md](rollout.md). The [November 9 review](review.md)
consolidates outstanding acceptance and process follow-up. The chronological checkpoints below
retain the state and qualifications recorded at each earlier point.

Implemented: preserved guided ADO family selection and guarded agent-pool operations, local-network
permission prompts, ordinary remote question transport routing, remembered-permission dismissal
following owner acknowledgment, dialog progress/inline errors, desktop/web Chats layout and captured
run settings, Mnemosyne configured-root storage measurement and expandable dated metadata logs.

Validation: full suite 1,713 passed / four skipped / zero failed using canonical short TMPDIR;
static checks pass. Thirty-three focused storage/peer tests pass after the scan-throughput change.
Electron Chats and Chromium/WebKit web checks pass for fixed height, filter collapse, progressive
rows, run metadata and narrow-screen overflow. Mnemosyne shared Chromium/WebKit checks pass at
390/820/1440 px. Guided ADO setup and existing managed-connection Electron checks pass. Web assets
build locally. Tests use disposable data; no live Jira/ADO mutations or production deployment.

The initial full-suite attempt used a noncanonical long macOS TMPDIR and failed path-alias/socket
fixtures. The canonical /private/tmp run passes without changing those production boundaries.

Current native audio/library snapshots are recent and all three launchd jobs are loaded. Recent
Proteus intake/follow-up runs completed model turns but explicitly report incomplete reconciliation;
no overall workflow-success claim. Private schedule/run/diagnostic references remain outside Git.

Storage scans count logical and allocated bytes by extension, deduplicate inodes across configured
roots, skip symlinks and excluded dependency trees, and report partial/unavailable coverage.
Snapshots are not atomic and APFS shared/compressed data can differ from exclusive physical usage.
No deletion or retention policy changed. Native pause/resume/drain-restart is implemented in its source repository and wired to Proteus desktop/web, but not installed.

Updater readiness now reports bounded stage timings/state through owner status, with opt-in helper
progress IPC for backward compatibility. Integrity, idle checks and the 15-second readiness budget
are unchanged. All 34 updater regressions pass. Recovery-exception live acceptance remains open.

Open: Atlassian full write/upgrade contract and authorized live fixtures; independent native Mnemosyne product
extraction and installed service-control acceptance; updater recovery acceptance; full remote approval fault matrix and installed
Windows question acceptance; physical and production parity. No signed candidate or installation.

## Mobile access and navigation checkpoint

Implemented run-bound `proteus_folder_access` with mandatory direct human consent on all existing
approval surfaces. Exact folder/reason/access and operation identity are retained per chat. Stable
retries coalesce; denial, changed folder/context, delegated scope and ended turns cannot grant.
The grant and its successful receipt share the existing atomic chat persistence. Workspace/source
selections remain unchanged. Provider sandboxes refresh on the next explicit turn. Managed Codex
allows proven additive bounds to wait for that turn while reductions still interrupt safely.

Mobile notification routing awaits its own owner, refreshes that chat, preserves exact question
identity and opens/focuses pending input. History and attention actions use the same route. Cached
chat/schedule reads remain possible offline, and standard-phone schedule detail has a close action.
Simulator routing tests exposed both stale startup selectors and the missing schedule dismissal;
original failed receipts remain in private evidence. The final iPhone lifecycle and exact-answer rerun both pass.

Validation so far: full Node suite 1,719 passed/four skipped; 26 targeted folder/permission transition
regressions pass; static checks pass. Six shared Chromium/WebKit cases verify explicit service
control at phone/tablet/desktop widths. Native Python suite: 61 passed in the existing qualified
worker environment. iPhone simulator DestinationTests: 16 passed; exact notification-answer focus
and normal question-queue focus pass. Foreground, background, cold-start, unavailable-owner and schedule-dismissal lifecycle acceptance passes on the iPhone simulator.


## iPhone scroll stability

Source now retires cancelled/acknowledged native scroll commands and preserves gesture ownership
through deceleration. Late older-history reads cannot reveal a bookmark captured before a newer
pan. Acknowledged parent commands are cleared, and missing offline anchors defer restoration.
Three native offset regressions pass, covering stale-command cancellation, completed-command replay
and deceleration. iPhone simulator acceptance passes for momentum, prepend, saved position, a new
pan after restoration, cold reopen and repeated variable-height history loading through the real
bottom. Exact notification-answer focus still passes after the scroll changes. The iPad notification
and bounded-history checks pass. These are isolated simulator builds, not a physical-device update
or performance claim.

Final Node suite: 1,719 passed / four skipped / zero failed. Static checks and local web asset build
pass. No local desktop package, website deployment or physical-device installation was performed.


## Targeted iPhone candidate and project tabs

The operator authorized an urgent physical iPhone update for real-chat scrolling acceptance.
Native sidebar membership now retains hidden resource tabs and descriptor metadata, and the
visible strip derives chat/browser membership from the cached owner snapshot before local draft
adoption. Subsecond activity stamps remain intact. Two focused unit and two iPhone UI checks pass.
The first UI attempt exposed timestamp precision loss and a one-point offset assertion; exact
failure receipts remain private. The corrected candidate passes both checks. Physical preservation,
installation and launch are in progress; web, iPad and other desktop deployment holds remain.


## Targeted physical iPhone installed

0.2.44 / 2611.8.1 is installed in place with the established paid push identity. The operator-opened
candidate process and saved destinations are independently verified. All initial per-file hash
comparisons passed, but opening the app changed live caches before the final stability guard.
Acceptance therefore records historical readback only: no current all-file equality, before-launch
stability, logical encrypted-cache comparison or physical scrolling success is inferred. Existing
pairing/Keychain identity is retained; no credential export, uninstall or data restore occurred.
Two verified full recoveries remain. Superseded task-created delta bytes were retired after acceptance;
original receipts and qualification remain private. Web, iPad and desktop deployment holds remain.


## Overview visibility correction after phone feedback

The operator clarified that hidden tabs belong only on the project Tabs management page.
The prior broad sidebar interpretation is superseded. Native overview now consumes the same ordered
visible children as project navigation, scoped to the active workspace/project selection. No sibling
project inventories or orphan browser-cache aliases are appended. Hidden, navigation-closed and
paused slots are excluded; the Tabs management snapshot retains hidden rows and existing actions.

One focused membership unit test and the mixed overview/navigation/Tabs-page UI test pass on each
shared iPhone/iPad simulator. Four visible children produce four resource tiles plus project home;
hidden browser/chat rows remain on the Tabs page. The separate large-history/browser overview
restoration regression passes on iPhone. The first UI attempt failed only on an outdated project-home
selector, corrected to the existing project control; original evidence remains private. No new
physical installation was performed. Installed 2611.8.1 does not contain this correction.


## Workspace-wide overview and active-editor follow-up

The operator restored workspace-wide overview grouping after clarifying the narrower interpretation
above. Desktop and native overview show workspace tabs first, followed by projects in shared saved
catalog order. Visible unloaded tabs remain included. Hidden, closed, paused and orphan cache records
are excluded from navigation/overview; hidden records remain on project Tabs management. Selected
navigation tabs are centered until the user pans. Desktop project drag persists across restart.
Native drag prototypes failed gesture acceptance and were removed; existing native Move up/down
shares the same owner order. Actual Electron and phone/tablet simulator overview checks pass.

Full Node verification passes 1,720 tests with four skipped, and static checks pass. The final signed
Build Mac candidate is built separately from the superseded cancelled candidate; verification and installation
wait on the coordinator's human command approval and final handoff. Physical iPhone update remains
in progress; no new installed outcome is inferred from simulator acceptance.

The operator's screenshot identifies repeated banners for one question in this release chat.
Notification UUIDs and stored receipts now normalize case; configured account APNs delivery owns
background alerts instead of local feed mirrors. The iPhone push device UUID is explicitly persisted
and preserved across launches, including migration of an existing UUID. Regression tests pass.
Server registration now merges same-account/same-environment APNs registrations for a matching token,
retains one identity and removes queued copies for retired registrations. Other devices, environments
and users remain separate. All 18 app endpoint tests pass (227 assertions). The operator lifted the web hold. All 107 web tests pass (940 assertions), and the canonical
web release is undergoing recovery, activation and endpoint acceptance. No real delivery claim
is inferred from packaging.

Focused answer/reply editing now blocks automatic bookmark restoration and history reveal, including
late history responses. Question focus is propagated to the conversation. Explicit question navigation
continues to focus its answer field. The first fixture that actually changed geometry during text entry exposed the editor leaving
the viewport. Native scroll handling now keeps the focused input or caret visible instead of
restoring an earlier message bookmark. The corrected incoming-update typing, exact question-focus
and momentum/prepend/reopen UI checks all pass. Physical typing/notification-repeat acceptance
remains open.


## Web activation after hold lifted

The operator lifted the web deployment hold. The canonical 0.2.44 package was activated through
the existing SSH supervisor after a verified central recovery and successful isolated database
restore. Schema, runtime configuration and existing data were preserved. All 14 production
endpoint checks pass; every served build asset matches the accepted local package. Both retained
local recoveries were independently reverified. Hash-bound retention preserves the current and
previous web code, two local recoveries and one server recovery; obsolete code and duplicate
transport payloads were retired with original receipts retained. The push-registration correction
is live; actual Apple delivery and cessation of repeated alerts remain physical-device acceptance.


## Grouped overview and notification iPhone installed

0.2.44 / 2611.8.2 is installed and its launched process is verified. Before launch, all 330 protected
files matched the cold recovery. Four saved destinations and the existing Keychain access identity
were preserved; no uninstall, credential export or data restore occurred. Two verified full recovery
generations remain, and the expired generation was retired with receipts retained. The accepted
artifact includes workspace-first grouped overview, shared saved project order, notification UUID/
transport/device-identity corrections and active-editor visibility. Physical gesture performance,
reconnect and cessation of repeated Apple alerts remain operator acceptance, not inferred from
simulator tests or file hashes. The Build Mac coordinator still needs its human command approval;
GO has been queued for the exact final candidate after that gate. No Mac installation is claimed.

## Attachment and spelling follow-up

iOS new-chat attachments now appear directly below the prompt with explicit provider/owner availability, existing file/photo/paste import, review and retry behavior retained. Desktop shell and embedded pages share an originating-webContents native spelling/edit menu; web contenteditable fields keep browser spelling menus and native reply editors request system spell checking. Updater recovery errors distinguish connection, process, transport, timeout, HTTP and malformed-response failures without persisting arbitrary responses or credentials. Validation is pending for this follow-up.

## Mac retry after categorized timeout

The diagnostic candidate also rolled back; its helper recorded owner-request-timeout. Recovery requests now receive the remaining overall sixty-second verification budget, replacing the independent ten-second cutoff for this operation only. Other owner calls keep their existing timeout. Successful replies arriving after the overall deadline are rejected. Static stage names and elapsed times in the bound startup log distinguish identity inspection, renderer readiness and preservation without recording credentials or private inventory. Prior failure and rollback evidence remains intact; installed acceptance is pending.

The Mac retry completed with verified health on 0.2.44. Source validation passes 1,726 tests with four skipped, static checks and seven focused cases. Navigation comparison found zero differences. The preservation stage completed at 17.118 seconds. Exhaustive installed history/draft/source/pairing/model acceptance remains open, and recovery rotation departed from the checkpoint preservation request.

## Nov 9 schedule access and portability checkpoint — source only

Provider-neutral capability resolution now rejects unsupported sandbox mappings
with an actionable error, preserving Codex native enforcement. The current Copilot
adapter routes command approvals to the owner and supplies a session workingDirectory
and additionalDirectories; it does not configure/verify an OS filesystem/network/
child-process sandbox. Claude starts in its working directory with permission-mode
(default), strict MCP configuration and verified permission hooks; Bash approval
likewise does not establish those OS boundaries. No safe installed 0.2.43 prompt-free
Copilot/Claude migration for the existing scoped inbox has been established. Merely
removing sandboxedCommands is unsupported. No destination-native nonempty inbox,
planning/digest or managed MCP acceptance is claimed.

Explicit “Allow … for this schedule (saved automatically)” persists owner grants in
schedule accessOverlay v1 for folders, origins and tool/actions. Once/deny do not
persist. Resource changes fail closed. Provider/model choices do not invalidate
otherwise identical resource consent. Managed tool grants pin actual owner,
workspace, connection and configuration identities at the shared managed runtime
boundary. Reconciliation retains owner grants; exported grants cannot replace them.
Atomic schedule revisions protect capture and future-run revocation. Existing
captured runs retain their snapshots. Ask mode is preserved: Saved rules/custom
must be explicitly configured for unattended use. Shell capture is unavailable
pending verified executable/script/dependency identity and change semantics.

Failed schedule saves and authorized preview/preflight/reconciliation errors now
produce durable silent ERROR history with bounded known reasons, correlation,
action and time; unread retries deduplicate. Editor save errors use inline alerts,
preserving draft/live configuration. Unsupported older account servers retain
bounded forwarding retries. Actual remote owner center and deployed account/mobile
acceptance remain pending. Actual Electron Center retry deduplication, severity and
restart persistence pass. API save failure/restart and supervised consent tests pass.

Latest full source suite: 1,732 passed, four skipped, zero failures. Static and
final source review are recorded separately. Changes remain uncommitted on the
open nov8-release branch; no new package, HC schedule edit or deployment occurred.
See [contract and migration limits](../../schedule-access-overlay.md) and
[versioned schema](../../../schemas/schedule-access-overlay.schema.json).

Remaining implementation: verified shared or native Copilot/Claude execution
adapter; command identity/change consent; grant review UI and propagation of live
revocations; durable source-owned provider/model override (canonical manifest plus
hash-checked reconciliation remains the supported source route). Acceptance must
include destination-native fixture/artifact/replay, dynamic planning/digest/MCP,
source reconcile/restart, captured-run preservation and remote notification paths.

## November 9 continuation — portable workflow execution and mobile restoration

The durable workflow access contract is implemented in [schedule-access-overlay.md](../../schedule-access-overlay.md),
including explicit first-run consent, exact and separately approved scoped command variations,
shared host command enforcement for Codex/Copilot/Claude, managed connection pins, live command
revocation and source-owned provider overrides. This supersedes the earlier design-only checkpoint.
Native Build Mac provider fixtures processed two records totaling ten and used a named managed
MCP bridge on all three real provider adapters. No HC business run, live HC schedule edit, package
or HC deployment is implied. The existing installed HC 0.2.43 has no qualified flag-removal workaround.

The full Node suite before the latest UI refinements passed 1,737 tests/four skipped/zero failed.
Thirty-nine focused remote/overlay/host tests pass, including explicit scoped variation and active
revocation. Subsequent final source validation remains required before packaging.

Recent schedule runs is a button **between Enabled and Run now in schedule configuration** on
desktop, web and iOS. It opens normal editable Chats filters. It is not an extra chat menu item.

The iOS URL editor wraps the full URL at character boundaries, strips pasted newlines, submits on
Return and selects all on double-tap. Adjacent-tab gestures include the browser bottom bar and
chat/document mode header. A bounded encrypted page archive restores a stale copy with scripts
and network blocked until explicit live navigation/Refresh. Actual WebKit archive restoration and
encrypted identity/expiry tests pass. The certificate parser's public X.509 date comparison passes.
Targeted owner-project tab cache reset is source-implemented, not yet run on the physical phone.

Native Mnemosyne pause/drain/resume/restart controls are now installed via its guarded native
installer. Existing configuration and desired-state hashes were preserved; installed pause/resume
and runtime-source comparison passed. All three native services were reloaded. The native suite
passed 382 tests/one skip. This supersedes the earlier source-only control status. End-to-end filing
and physical phone consumption remain separate acceptance. Library now projects bounded aggregate
counts from the published phone index, distinct from latest-wake deltas; it does not infer download.


## November 9 final local qualification

The final Node suite passes 1,742 tests with four skipped and zero failures; static checks pass.
Actual Electron schedule configuration confirms Enabled → Recent schedule runs → Run now,
editable Chats filters, and red inline save failure with the draft retained. Chromium/WebKit
filter navigation also passes. The final real Codex, Copilot and Claude adapter runs each verify
nonempty synthetic inbox artifacts and a named managed MCP fixture without pending approvals.
The actual Electron owner passes its OS boundary qualification and durable Notification Center
severity/deduplication/restart regression. These are local native/source results, not installed HC
workflow acceptance. The web API suite passes 19 tests/241 assertions; local assets are rebuilt.

The iPhone new-chat Files/Photos dismissal, native Paste consent, image review/upload and chat
creation pass in the simulator. The wrapping URL editor submits without newline insertion.
Native cache tests verify dynamic DOM restoration without script replay and account/owner/profile
isolation. Exact project cache retirement and fresh canonical-owner replacement pass with other
project operations preserved. Physical installation, targeted cache repair and production browsing
acceptance remain pending. The OS may still terminate a background iOS process.

The native Omi installer verification and 382-test suite are separate from filing acceptance.
The latest read-only pipeline sample has 12 exhausted empty-ASR retries; no recording replay or
cleanup was performed. Enabled intake/follow-up and study schedules remain intact. Completed
model turns establish run completion only, not independently verified output filing.


Final history regression also found a mutable-entry guard in the native Back/Forward popup.
The guard captures the opening history position and URL, rejecting stale popup callbacks after
another navigation while accepting owner-assigned IDs for the same acknowledged position. The fixture uses the current New tab action, real synthetic run origins and exact
permission-field checks. The signed Mac artifact is rebuilt after this correction; earlier
package smoke evidence does not qualify the later fingerprint. Guided mobile helper tests now
include exact phone-only cache-repair launch arguments and rejection of extra operations (23 pass).

The corrected native history regression passes all 13 checks, including stale menu rejection,
restart Back/Forward restoration and prevention of POST/permission replay. Native media/download
controls pass. The required full suite again passes 1,742/four skipped with static checks.

## File browser follow-up

The expanded desktop browser and native on-demand owner browser are implemented as described in
[file browser](../../file-browser.md). Electron interaction checks pass for expansion, keyboard
open, modifier selection, sorting, resizing, context menus and disposal. Five owner file tests
cover snapshots, no-overwrite behavior, root confinement and PDF/link reading. Remote tests verify
read grants do not authorize editing and editing revocation blocks subsequent operations.
The first full suite passes 1,744 tests/four skipped; final follow-up checks are recorded separately.
Native iPhone permission-denial → explicit synthetic read grant → streamed Markdown document UI
passes. iPhone/iPad builds pass. Later native drag/drop and keyboard changes require their own
final compilation/interaction checks. Existing libraries are reused; no new package is installed.

Physical iPhone 2611.9.1, which predates file-browser expansion, is installed and launch verified.
All 337 protected files matched before launch; four destinations remain. Exactly two verified
recovery generations remain after guided retention rotation. Fresh General tab diagnostic reports
revision 4890 and 17 IDs; full current-owner comparison and ongoing live tab changes remain separate.


Final file-browser qualification: the shared owner suite passes 1,745 tests with four skipped;
static checks pass. Actual Electron PDF rendering shows the page and thumbnail pane, and the
explicit trusted-window search finds fixture text. The PDF response alone permits same-origin
embedding; the application-wide frame/unsafe-content restrictions remain unchanged. Native file
sharing denial followed by a synthetic desktop grant and streamed document passes on both phone
and iPad; the later phone run includes drag/drop, paging and hardware-keyboard compilation.
The installed iPhone General diagnostic and current desktop inventory have exactly the same 17
ordered tab IDs (five hidden), at recorded phone revision 4890. This verifies that snapshot,
not indefinite future connectivity or an untested new phone-tab mutation.


### Phone footer correction after physical feedback

Physical feedback showed the prior footer color/spacing fix was incomplete. The phone shell's
clip cut off child safe-area backgrounds. The shell now permits bottom-only overflow and paints
one continuous footer surface; browser controls and the closed-keyboard composer move down ten
points. Keyboard-visible layouts retain their normal inset. A swipe-container accessibility ID
that overrode button IDs was also removed. The exact new-tab and loaded-page screenshot pixel
comparisons pass, with the remaining footer gap at most 28 points. The actual chat-class pixel
and gap regression also passes (one test); an earlier wrong-class, zero-test run was rejected and
is not counted. Signed iPhone 2611.9.3 is ready, not yet installed: the device relocked. The unused
2611.9.2 candidate was not installed. The existing verified cold recovery can be reused only after
checking unchanged stopped-device state through the guided, tested replacement phase.

### Physical iPhone footer follow-up — installed

Signed build 2611.9.3 installed and its process launch was verified. All 339 protected files matched before first launch; all four saved destinations and existing Keychain access groups were retained. The guided helper verified normal two-generation recovery retention. The stale, never-installed capture was compacted only after verifying both accepted predecessor generations; its original receipts remain. Helper coverage: 29 passing tests, including refusal after any install intent and preservation of accepted generations. Simulator browser/new-tab and chat screenshot color/spacing checks passed earlier. Physical touch, footer appearance, reconnect and push acceptance remain separate; successful installation does not establish them. The local Mac follow-up remains blocked on its coordinator human tool approval; no Mac handoff occurred during this phone installation.

### Build Mac follow-up — installed

The owner independently reports final build 3275c7051e76+dirty.ca7005e9f9c5 installed, package verified and health verified. Navigation preservation matched 8 workspaces, 19 projects, 64 scopes, 244 tabs and 3 windows, with zero differences. The coordinator verified Cua discovery, permissions and actual accessibility observation, then released its lease. Post-install Reddit acceptance on an agent-owned page: trusted Toggle playback started a real 14-second video; a later accessibility snapshot showed its timeline advanced from 0:00 to 0:12. This establishes one desktop playback case, not all Reddit or physical iOS playback. Full history, sources, reading state, pairings and broader file/schedule workflows remain separately qualified. Legacy attention and unregistered recovery maintenance remains blocked.

### November 10 completion pass — file-browser corrections

Move destination sheets now page past the first 200 folders on desktop and iOS. Native directory,
expansion and document requests reject stale results after navigation or view disposal; document
asset requests retain their original root/file identity. The iPad split baseline resets after
its gesture, and view-local document tabs have explicit close controls. Oversized expanded folders
report the need to open the folder instead of silently omitting later entries.

The source suite passes 1,745 tests/four skipped; static checks pass. The first restricted suite
could not create its temporary fixtures and is excluded. Actual Electron expanded-file acceptance
passes including a destination after the first 200. iPhone simulator permission/document streaming
passes (one test), and paged move acceptance passes (one test), independently checking the desktop
fixture source disappearance and destination existence. iPad paging acceptance is still running.
These corrections are newer than installed Mac ca7005e9f9c5 and iPhone 2611.9.3.

Installed native Mnemosyne acceptance observed active work, revision-checked pause to draining,
and restart-pending while the transaction remained active. A later status independently reports
running with a new admission revision and active work. No process was killed or claim replayed.
This verifies active drain/restart, not end-to-end filing of every source. Read-only ledger totals
remain in private release evidence; cumulative retry totals are not new failure counts.

The web-project folder grant became selected on the next provider turn. Ordinary restore,
activation, served-asset verification and signed-in Chats rendering subsequently passed. The
latest audit gate applies to further deployments, including new file/notification corrections.

### Disk-pressure follow-up

The operator requested obsolete build/staging/temp cleanup and branch integration. PR32 merged the tested application source into main; the merged branch was retired locally and remotely. Simulator helper defaults now reuse one compiler cache, with overlapping-owner and stale-lock guards. Three cache lifecycle regressions and static checks pass. This is release tooling maintenance; accepted application artifacts retain their original frozen source pin and bytes. Cleanup counts, hashes, actual free-space deltas and protected recovery identities remain in private receipts. Update-owner rollback-attention staging remains blocked by supported reconciliation checks; no journal or unregistered recovery was force-edited.

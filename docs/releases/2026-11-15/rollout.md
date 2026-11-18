# Nov 15 rollout

Version: 0.2.45

## November 17 — Windows rollout and release closeout authorized

The operator requests the accepted Nov 15 release on both Windows installations and completion
of remaining release work. Both targets initially reported 0.2.44. One designated Windows builder
received a verified private full-history source bundle. Native validation of `d43b17fb` exposed
the Windows Scratchpad directory-flush defect and thirteen test-fixture portability failures.
The corrected Windows pin is `967381d9fc0dfc333a12b447803bfed5ca8f5305`: its only runtime/build-input
change from the accepted Mac/Linux source is the Windows-specific Scratchpad flush guard.
The builder built that exact pin once and returned immutable accepted artifacts to the Mac
publisher. Accepted Mac/Linux packages retain their existing source pin. Separate unassigned
destination update coordinators installed the same signed published Windows package; both
owners now report complete, healthy updates with package verification and matching fingerprints.
The build-directory grant is active and existing GitHub account authentication verifies with
normal network access. Policy access and source acquisition are complete. The test-only native
correction passed all 42 affected tests on Windows and was privately hash/base verified and
merged preserving history. The combined publisher suite passes 1,925 tests with four skips and
zero failures; static checks pass. The verified incremental bundle is transferred through the
existing private draft. The bounded full Windows suite passed 1,917 tests with 12 skips and zero
failures; static checks passed. Exact extraction/NSIS payload comparison, packaged UI/terminal/
restart, six-window events, checkpoint/restarts and Fox filtering passed. All six private artifact
digests and the source companion's 1,999 entries verified on the publisher, which also bound
the 632 runtime and 12 build inputs to the full commit and generated terminal-helper receipt.

Windows build `windows.21650c766fb6` has source fingerprint
`21650c766fb633a2c15bc22e5302191150c1042e6fab537e58e13f5aaa15ec15` and package hash
`a319e1d37e8a2d954e11e8440c33bd512a91f1cdc69a2602db98dd77be147dae`.
The unchanged NSIS recipe, registration and terminal guardian retain their prior real native
qualification. A historical 0.2.44 forward byte mismatch remains unexplained, followed by a
healthy clean-baseline retry. Do not interpret the original acceptance receipt's broad warning
as saying every later transition failed. New recovery code has source coverage; this package's
real update/rollback and installed migration are not separately qualified before rollout.
Both initial handoff calls omitted the job ID and were rejected before mutation; their prepared
jobs remained intact. Corrected handoffs completed on both consumers. One consumer's navigation
receipt matches one workspace, one project, five scopes, eight tabs and one window; its fresh
maintenance plan has no issues, two verified recoveries and empty candidate staging. The other
matches one workspace, two projects, 23 tabs and one window. Both passed Cua discovery,
permissions, window enumeration and real observation; input was not tested. Their reported net
free-space changes are respectively -164,257,792 and -494,129,152 bytes.

The operator approved one temporary four-recovery attempt on the second consumer, estimated
at 7.5 GB with 841 GB free. Its new recovery and one prior recovery are registered and verified,
but a historical unregistered failed-attempt recovery remains held. A supported, digest-bound
supersession preview and fresh maintenance plan must resolve that copy before the exception can
end at two full generations overall; the original journal and failure receipts remain preserved.
The native reconciliation tool requires the original chat. The accepted source-owned adapter's
preview also rejects this legacy job: it records a replacement but has neither a final outcome
nor health, so it does not satisfy the supported failed-attempt classification. Fresh owner
revalidation would not change that classification. Cleanup is held with the extra full recovery
preserved; no reconciliation receipt was applied. A separately reviewed resolution must account
for this legacy state and installed-reader compatibility. No raw journal edits or manufactured
historical health receipts are permitted.
Full browser history, reading state, source selections, pairings, credentials, registration and
individual migration outcomes were not independently established by the available receipts.

The exact accepted Mac, Linux and Windows payloads are publisher-signed and published on downloads.proteus.example.
All 29 public artifacts, manifests, catalogs and pages passed full HTTPS byte/hash checks with
no redirects. Work Mac and Linux's installed resolvers validate the new signed releases through
their real catalogs; both Windows consumers also verify the new Windows signature and catalog.
Current-only retention retired the superseded Mac/Linux public generations and measured
610,906,112 bytes freed, then retired the old Windows generation and measured another
624,414,720 bytes freed. Each retention operation reverified all current public files.
The Windows publisher manifest authenticates the accepted bytes; the existing NSIS installer
remains Authenticode-unsigned. Verified duplicate publication staging has been removed: local
Windows staging cleanup measured 1,925,120,000 bytes freed, and audited server cleanup measured
2,547,548,160 bytes freed while retaining public artifacts and all receipts. Windows installations
are complete; historical recovery cleanup and final source/backup/release closeout remain open.

Linux's corrective update is complete and health verified at `d43b17fb3923+src.7e7c54db762b`.
Independent installed-package inspection matches the accepted hash. Navigation verifies zero
differences across five windows, three workspaces, eight projects, 18 scopes and 26 tabs;
the health receipt records 29 runs and 14,830 events. The failed attempt's original journal and
failure evidence remain unchanged; digest-bound supersession and maintenance retired its
obsolete recovery and staging. Fresh inspection verifies two full recoveries and no issues,
ending the temporary four-copy exception. Cua cannot enumerate this Wayland session's windows;
independent complete histories, reading, sources, pairings, physical six-window behavior and
distinct migration outcomes remain qualified rather than claimed verified.

The iPhone's completed 2611.15.3 update remains valid with its recorded cache/automatic-launch
qualification. The iPad's prior 2611.15.2 install and all 2,338 protected-file hashes verified;
physical feature acceptance remains separate. No new iOS build is required for the later
desktop-only checkpoint and filtering changes. Website migration/deployment remains recorded
below. Publication, retention and source/branch closeout still require reconciliation before
the release can be marked closed. Nov 17 requests remain planning-only.

## November 17 — Work Mac installation authorized

The operator requests Work Mac installation of the accepted Nov 15 Mac arm64 candidate from
`d43b17fb`, including the checkpoint and Fox corrections. The exact previously accepted Apple-signed
archive and corresponding source were transferred through the existing private draft; local
and server SHA-256 digests match. A fresh unassigned destination update coordinator was created
with receiving-device defaults. The existing account-specific private download route succeeded
without changing the global GitHub login. HC verified all asset hashes and the official extracted
package identity/signing/source; normal system trust verification passed outside the restricted
sandbox. The supervisor prepared and smoke-tested the exact candidate and accepted handoff.
Work Mac is now installed at `d43b17fb3923+src.c5ea48733c53`; the owner reports the update complete
and health verified, and the controller independently observed the new runtime identity.
Post-restart navigation verifies zero differences across 3 workspaces, 14 projects, 95 scopes,
315 tabs and 5 windows. Two verified recovery generations remain, with no candidate staging
bytes reported. Free space changed by −408,211,456 bytes. Cua discovery, permissions, window
listing and real observation pass. Both established GitHub account contexts authenticate after
restart without changing the global active login. Full Back/Forward histories, reading state,
source selections, pairings, desktop input, other credentials and individual migration outcomes
were not independently verified; navigation and health receipts do not establish them separately.
This request does not authorize Nov 17 implementation or builds.

## November 17 — corrective desktop candidate

New source pin `d43b17fb39232c5008fff14a8466d8ecdc4dfe36` adds N11-70 checkpoint
synchronization and N11-71 Fox News Admiral filtering. The checkpoint correction passes the full
source suite (1,924 passed, four skipped), static checks and synthetic native two-window hydration,
exact restart, draft and failed-sync acknowledgement checks. The filter passes focused tests and
the real Electron request pipeline with synthetic HTTPS responses, including cache reuse and
profile protection controls. Combined-pin source verification passes 1,925 tests with four skips
and no failures. The signed Mac candidate passed packaged smoke, six-window event/survivor,
two-window checkpoint/restart/failure and Fox filtering/profile-toggle acceptance, plus the
official archive roundtrip. Private archive and source hashes were independently checked against
the receipts; a copied hash suffix in the builder's prose was corrected from the actual receipt.
Build Mac is installed at `d43b17fb3923+src.c5ea48733c53`. The supervisor reports complete,
updated, verified health, accepted package verification and delivered continuation. Preservation
has zero navigation differences across 9 workspaces, 21 projects, 69 scopes, 305 canonical tabs
and 3 windows, with recorded histories/configurations preserved for 504 runs. A post-update
maintenance inspection verifies two recovery generations with no missing recoveries or issues.
Cua discovery, permission, windows and real observation pass; input remains untested. Independent
complete Back/Forward, reading, source-selection, pairing and real provider-credential comparisons
remain unverified. No distinct migration outcome is exposed. The reported live Fox prompt still
requires acceptance in the updated operator profile.

Linux's older updater cannot acquire the new checkpoint implementation merely by staging a
candidate. Its five saved windows have no missing visible descriptors in the compared local
projections, but file inspection cannot establish live synchronization or conflicts. Its current
rollback attention job cannot yet be reconciled: it lacks the required later healthy update.
Read-only review confirms that normal preparation and handoff permit a forward retry while
protecting the unresolved staging. A clean maintenance apply is not an additional handoff guard.
After the new candidate passes its ordinary health, preservation and recovery checks, that
completed update can satisfy the existing later-healthy supersession predicate. No predicate or
failed journal needs to be rewritten. The old snapshot is not reusable because live roots changed.
The retry would temporarily require four full recoveries, approximately 5.01 GB logical before
registered rotation and failed-attempt reconciliation. The operator approved one temporary
four-copy retry, with return to two after verified success and failed-attempt cleanup. If
verification fails, retain the evidence and report the hold. The disposable
regression was moved intact outside the installation and the original package hash reverified.
The Linux driver sees the same KDE graphical session, but its experimental native Wayland
backend is disabled and it enumerates no windows. No supported live opt-in route was found in
the installed owner; no driver configuration or app restart was performed. Current native UI
attestation remains a separately qualified acceptance gap. The reviewed restart watcher remains
unarmed; a separate driver restart is not required by the normal forward-update guards.
The incremental source bundle and all transfer pieces verified. The designated Linux builder
built only the frozen application pin: `d43b17fb3923+src.7e7c54db762b`. Source validation passed
1,919 tests with ten platform skips and static checks. Official extraction, credential-free
UI/terminal/restart, live Codex with the normal credential backend, six-window events and Fox
filtering pass. Earlier checkpoint teardown exceeded a 15-second fallback; its failure evidence
is retained. The final follow-up uses native `app.quit()` and passes all checkpoint assertions,
both restarts and final quit with exit code zero, no signal or fallback. Playwright transport
closure and fixture cleanup complete, and no owned test processes remain. Both built and
extracted package hashes still match after the test. No package was rebuilt or uploaded again.
Private draft artifact digests verified, and the parent independently checked the downloaded
payload and source archive. The publisher payload is unsigned and unpublished. No corrective
Linux installation, fourth snapshot or watcher restart is yet verified. The accepted candidate
has been dispatched to the existing installation coordinator for the authorized forward retry;
actual preparation, handoff and post-restart acceptance remain separate outcomes.

## November 16 — combined source and targeted installation

Accepted application source: `958f769998f82e195cd4316ba4a21c96fc077305`. The operator requests
Build Mac and iPhone updates plus Linux build/verification; the operator subsequently authorized
Linux desktop installation of that accepted build. Other device installations remain
deferred. N11-41 camera QR pairing is explicitly deferred to a future Mnemosyne update.

| Target | Candidate and qualification | Installation stage |
| --- | --- | --- |
| Build Mac | Signed `958f769998f8+src.fccf0119ec46`; packaged launch/vendor signatures, six-window event delivery/survivor and official tar roundtrip pass. Corresponding source matches accepted provenance. | Installed, supervisor complete/updated, health verified and continuation delivered. Navigation has zero differences across 9 workspaces, 21 projects, 69 scopes, 358 tabs and 3 windows; health preservation reports 484 runs and 1,226,224 events. Post-install maintenance verifies two retained recoveries with no issues or missing generations. Cua real observation passes; input untested. |
| iPhone | Signed 0.2.45 / 2611.15.3; signature, profile, entitlements and intended-device binding pass; focused simulator edit/save/reopen passes. | Installed and running; qualified preservation recorded. Full diagnostic compared 839 files: 838 matched; the Metal graphics-cache `archiveUsage.db/lock.mdb` differed. iOS launched the app during readback, so strict before-first-launch and current-profile equality are unverified. All four destinations and Keychain access groups retained. Exactly two verified recoveries retained; measured free-space increase 437,608,448 bytes. Physical gestures/reconnect/push remain untested. |
| Linux | Same full application source and original fix ancestry verified; 1,911 source tests pass, ten skipped; static checks pass. Extracted-package UI, terminal/restart, live Codex and six-window events pass. | Candidate prepared, owner smoke passed and installation attempted. Navigation-preservation verification timed out, triggering automatic rollback. The previous `2d659fe3f06b+src.e6ba2990cf5e` runtime is back; rollback window-readiness verification also timed out. The operator found five normal windows and a sixth stuck restoring tabs; closing one normal window allowed the stalled window to finish loading. Supervisor remains in attention without verified health or continuation; the original navigation mismatch still requires diagnosis. Publisher payload remains unsigned and unpublished. |

The combined Mac source suite passes 1,917 tests with four skips and static checks. Package tests
use mock Keychain data and do not establish live credential continuity. Installed health,
navigation, preservation and physical feature acceptance must be recorded separately below.
Private device identities, paths, raw hashes/logs and operation receipts remain outside Git.
The original failed Mac updater journal and both verified Mac recovery generations are preserved;
historical supersession reconciliation has a separate verified receipt. The old chat stays archived;
no unrelated work was cancelled. N11-69's permanent coordinator/UI correction remains queued.
The Mac's accepted candidate and smoke receipt bind the expected package hash and Apple identity;
status does not independently expose a post-install package hash. Full Back/Forward history,
reading state, source selections and pre/post pairing continuity lack independent baseline
comparisons. Online peers and browser inventory do not verify those properties. No distinct
migration result is exposed. Cua installation, catalog, permissions, windows and real observation
pass; desktop input remains untested.
The phone's original failed strict readback, complete diagnostic and cache/automatic-launch
qualification are retained privately. Qualified completion does not relabel that strict check as a pass.

Linux follow-up: the historical maintenance hold was resolved without reopening its old chat.
The added build-staging directory was relocated intact outside the installation; all 160,139
entries match its saved manifest, and all 18,542 baseline package entries and hash verify.
The tested maintenance helper at `fbb31617` adds explicit fresh owner API revalidation after a
normal restart and keeps receipts compatible with the frozen updater. Eight transport chunks and
the assembled private bundle verified; 21 focused helper tests passed on Linux. Supersession and
clean source-owned maintenance completed, preserving the historical journal and both prior
recoveries. The subsequent candidate and rollback verification failures remain unresolved, with
their receipts and in-flight recovery retained. Do not retry installation or waive preservation
checks until the exact navigation/window-readiness cause is diagnosed. Runtime identity alone
does not establish a healthy rollback or successful 0.2.45 deployment.

November 17 operator observation isolates the rollback readiness problem to the older build's
six-window connection limit: one normal window was closed through the session-preserving Close
Window action, and the previously blank window restored. Five windows now display normally.
The closed session remains needed for later restoration acceptance. The operator used Updates'
**Resume ordinary work** control, releasing the diagnostic while preserving the attention journal.
The diagnostic isolated the initial mismatch: one restored window gained two visible project-chat
views after its 77 saved tabs. Both canonical chat descriptors existed before handoff. Original
tab order, active and child selections, and drafts were unchanged; the other navigation comparisons
passed. Pre-preservation and graceful-quit snapshots match the expected receipt, while the
candidate checkpoint matches the failed observed receipt. Canonical project-tab hydration is the
identified append path; the exact invocation was not logged. A disposable native regression is
requested to resolve synchronization/checkpoint timing before any correction or retry. The Linux
builder needs its own folder grant for the relocated artifact root. This does not certify rollback
health or successful deployment; failure evidence and the three in-flight recoveries remain held.

## November 14 — Markdown workbench demo correction

The current follow-up is source/demo review. The operator reported the first workbench demo's
missing bar, inadequate path list and broken editor. Its saved Markdown and open editor text
matched; preserved file hashes remained unchanged through the corrected demo restart. Files,
index and serializable undo were retained privately. The editor CSP/folding failure and feature
group loss are covered by rendered regressions. The tree now reuses Workspace Files controls.

CodeMirror 6 live/source editing is bundled for desktop/web/native. Full Node/static checks,
website build, focused desktop preservation/navigation and shared phone/tablet cold-reopen tests
pass. Full cross-client tree/general-tab parity and visual acceptance remain open. No production
Mac, website or physical phone update was performed by this workbench review. Synthetic Reminders
remain enabled in the isolated demo; no real reminder, Home command or sharing grant was changed.

## November 14 — N11-47 demo and simulator review

The follow-up storage, shared tab navigation and Reminders layout are implemented and qualified
in source. An isolated, live-reloading Design Preview is available for review. Focused desktop,
website and shared phone/tablet simulator checks pass; the website payload builds. No production
Mac replacement, website deployment or physical phone installation is performed by this review.
The installed versions recorded below remain current. This is not an additional deployment hold.

Source Library additions are reflected in Scratchpad choices; changing storage leaves the old
files intact and progressively rebuilds the new index on a worker. Feature tabs include supported
ordinary resources, close controls, add and overview. Desktop terminals use existing sessions;
native terminals and website isolated private sessions remain unavailable, with explicit UI labels.
The full suite passes 1,897 Node tests, four skipped; static checks and seven Reminders API tests
pass. The original reminder's deliberate physical reopen/reload verification remains pending.
No reminder replacement, Home operation, sharing change or QR implementation was performed.

## November 14 — Scratchpad and Life follow-up installed

Frozen application source: `33ce3876dfa8c725628c1d56fe68833b23fb509b`, including terminal sharing
highlight fix `37c25215` and all commits from `codex/nov11-release` at freeze.

- **Build Mac:** updater job `4366d10c-a89e-5e54-8313-d6d18a791d15`, revision 55,
  completed with outcome updated and verified health. Running build
  `33ce3876dfa8+src.f7ada6ab4809`, full source fingerprint
  `f7ada6ab48092f387dd88aad2697f4a44c22ddd4bda0510e507704fd77bc9e4f`.
  Navigation receipt reports no differences across 9 workspaces, 21 projects, 67 scopes,
  289 tabs and 3 windows. Full histories, source selections, reading state, pairings and individual
  migration outcomes remain independently unverified. Cua discovery, permissions and window listing
  pass; window observation failed, so visual acceptance is open. No post-install full suite ran.
- **iPhone:** 0.2.45 / `2611.11.9` installed and running. All 831 protected files matched before
  first launch; final stability check passed. All four destinations and selection are preserved;
  Keychain access groups are unchanged and keys were not exported. Exactly two verified recovery
  generations remain after 345,407,488 bytes of measured free-space recovery. Physical gestures,
  authenticated reconnect and push acceptance remain separate. Mnemosyne was unchanged.
- **Website:** release `20261114T063845Z` deployed from the same source. All 9,234 package files,
  11 HTTPS-served assets and the 14-endpoint audit pass. Ordinary restore verification passed;
  schema and runtime configuration remained unchanged. Verified duplicate build/oldest code archive
  retired, retaining the two accepted local archives and the standard recovery generations.

Pre-release validation: 1,894 Node tests passed, four skipped; static check passed; 17 website tests
passed with 254 assertions. Exact signed Mac package acceptance passed. Focused native encrypted
Scratchpad retry/revocation and UI cold-launch saving/reopening passed, along with the reminder
Open/Complete regression and reminder tab state checks. Desktop Scratchpad, reminder tabs and
Smart Home navigation flows passed. These synthetic checks do not replace physical live acceptance.

The terminal sharing highlight, scoped Scratchpad, Life navigation, reminder detail tabs and expanded
Smart Home API changes are installed. QR N11-41 remains held. Historical updater attention job
`38ae` still blocks owner maintenance; its evidence is preserved. Release remains open for the
remaining physical feature acceptance, storage reconciliation and broader release closeout.


## November 14 — Reminders, Home and mobile follow-up

The operator lifted the general build and deployment hold. N11-41 camera QR pairing remains
queued with implementation, build and installation held. Earlier entries below retain their
historical status; they do not describe the current installation.

- **Build Mac:** packaged `ddd81fa1023b+src.a847d556350b` installed, with the exact requested
  source fingerprint and verified updater health. Navigation preservation reports no differences
  across 9 workspaces, 21 projects, 67 scopes, 285 tabs and 3 windows. Cua Driver passed read-only
  discovery, catalog, permissions, window and real-observation checks; input was not tested.
  Full Back/Forward history, source selections, reading state, pairings, migration outcomes and
  individual receipt fields remain independently unverified. Historical attention job `38ae`
  still blocks owner maintenance; its evidence and recovery payloads are preserved.
  Separate local development-artifact cleanup retired two superseded candidates and three
  obsolete archives after signature/hash and open-handle checks, retaining manifests and intents.
  It reclaimed 2,196,258,816 measured bytes and retained the current Mac candidate plus two older
  candidates. No owner-managed recovery or data directory was removed.
- **Website:** release `20261114T000129Z` deployed from `ddd81fa1023b`, including the reviewed
  additive Reminders schema. All 9,230 payload files and 14 endpoint audit checks passed;
  runtime configuration and existing nutrition data were preserved. Ordinary restore failed;
  the supported captured-state restore check passed without a fresh live-state comparison.
  The SSH updater now supports explicit, hash-bound migration plans, with 37 focused tests.
  Server recovery was rotated to one generation and local website recovery to two, with receipts.
- **iPhone:** signed `2611.11.8` from `56c823722d96` includes tappable Markdown chat labels in
  question cards. Both focused native link regressions passed. A resumed, stopped-app recovery
  captured all 835 protected files and was rebound to this candidate without a second full copy.
  In-place installation, launch and all four saved destinations/selection are verified. The first
  readback matched every hash but ended with an unexpected running process and unchanged file
  inventory. After stopping only Proteus, a second full cold readback passed all 835 hashes and
  the stability check. This is qualified preservation after an uncontrolled first launch, not a
  before-first-launch claim. Keychain access groups remained unchanged; keys were not exported.
  Two verified full recovery generations remain after retiring the oldest eligible payload,
  reclaiming 345,489,408 measured bytes. Physical link tapping, authenticated reconnect and new
  typed push destinations remain separate acceptance checks. The phone is released to the Omi
  owner for coordinated reminder and deliberate Home voice testing; Mnemosyne was untouched.
- **Home:** the installed native integration authenticated to the configured Home Assistant and
  read live entities. The operator saved one light in the voice-control allowlist. No live device
  command has been exercised yet. Reminders writes, typed confirmation destinations, due alerts
  and physical pendant acceptance remain separate from the prior research-answer pass.

Physical phone recovery accounting now distinguishes a verified recovery from acceptance of
its successor. The earlier b6 encrypted-cache preservation uncertainty remains recorded; it was
not relabelled as a successful rollout. Its verified recovery and the next retained generation
were preserved while the oldest eligible payload was retired with its evidence.

## November 13 — first physical Life Ask flow passed

The first paired pendant → relay → Mac transcription/model → iPhone push → exact answer-chat
test passed. The operator confirmed that the notification arrived and tapping it opened the
answer. Independently inspected phone admission/progress receipts match the host request,
audio hash, chat and timestamps; exact identifiers and receipts remain in the private release record.

Measured capture-end → answer: **6.676 seconds**. Capture-end → APNs acceptance: **7.399 seconds**.
Actual notification display and tap latency were not measured. APNs acceptance is recorded
separately from the operator's confirmation of delivery and correct chat opening.

This verifies one physical answer flow. Follow-up attachments, task/memory filing, and
background/offline behavior remain untested. It does not close the release or establish full
iPhone preservation acceptance. All app updates remain held; N11-41 QR pairing remains queued
with implementation, build and installation held. The entries below retain earlier rollout history.

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Build Mac (local build) | macOS arm64 | 0.2.45 | built locally | Ad-hoc signed development bundle from clean `ce28dec`, build `ce28dec48bb2+src.41c030d68b11`; codesign verified; scroll profile on an isolated live-data copy matches source results. Not installed, published or distribution-signed. Deployment held by the operator. |
| Build Mac (install) | macOS | 0.2.45 | dispatched | Update coordinator asked to build with the installed signing identity, prepare/test and hand off. Not yet installed. |
| Build Mac (1ba46ec) | macOS arm64 | 0.2.45 | installed, health verified | Build `1ba46ece31e1+src.b81ea0ba77f4` installed 2026-11-12 via local candidate; signature team TEAMID0000; navigation receipt 8 workspaces/20 projects/65 scopes/262 tabs/3 windows; npm check pass, npm test 1752 pass/13 baseline/4 skipped; chats-list-scroll and streaming-render UI tests pass; Cua checks pass. 4104 navigation entries and 10571 history events retained; 198/200 reading keys retained. Functional Back/Forward, pairings, source selections and live photo delivery not exercised. Seven attention jobs and six unregistered recoveries untouched. |
| iPhone first corrective | iOS | 0.2.45 | installed, launch verified | Build 2611.11.3 from da4d443 installed in place; all 912 protected files hash-matched before launch, four destinations/keychain groups retained. Two recoveries retained; approximately 262 MB freed. Physical performance/gestures/reconnect/push and later source batches remain unverified. |
| iPhone previous | iOS | 0.2.45 | installed (qualified) | Build 2611.11.2 from `1ba46ec` installed in place 2026-11-12 with the existing paid identity/push profile. All 840 protected files read back and hash-matched; the final stability guard failed because iOS relaunched the app (prewarm), so equality after that launch is recorded as unverified. 4 destinations and keychain access groups preserved; two recovery generations retained. Physical gestures, reconnect and push not verified. |
| iPad | iOS | 0.2.45 | installed (qualified) | Build 2611.11.1 completed earlier; build 2611.11.2 installed 2026-11-12 with the same qualified preservation (2,318 files, iOS relaunch during readback). Three incomplete captures from interrupted attempts were preserved, then removed after acceptance. |
| Other desktops, web | all | 0.2.45 | not started | Held by the operator. |

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

## November 14 — N11-49 design review

The isolated demo runs the shared chrome, Scratchpad fixes and Reminders workbench source.
One existing demo note was privately preserved and verified with identical body SHA-256 and
revision after restart. No new production package, installation, website deployment or phone
operation was performed in this review. Existing signed/installed receipts remain historical.

Source acceptance: 1,900 Node tests pass/four skip; static check, Vite build and focused Electron/
web checks pass. iPhone/iPad simulator navigation passes; the iPad portrait columns were also
visually reviewed after fixing the crushed layout. Wide native-window acceptance remains distinct
from an orientation request that leaves the app window narrow. Full native suites, N11-48 general
resource parity and physical Reminders/Home/Scratchpad workflow acceptance remain open. Preserve
the original live reminder and existing recovery evidence; no test replacement or Home operation
was used. QR remains held.

## November 15 — operator batch

Source on `codex/nov11-continuation`. Build Mac and iPhone deployment is authorized. The website
reminder migration (`2026_11_15_120000_add_workspace_project_to_life_reminders`) must be deployed
for workspace/project reminder association to persist; clients tolerate an older website by showing
the selectors but the association is not stored until it is deployed. Linux (Linux desktop) is to
build from this branch before making a release version.

| Target | Platform | Version / build | Stage | Evidence |
| --- | --- | --- | --- | --- |
| iPhone | iOS | 0.2.45 / 2611.15.1 | installed, launch verified | Signed from `238d2176`, artifact hash `83e4dd56…`; 842 protected files hash-matched before launch; saved destinations/keychain groups retained; two recovery generations kept. Physical feature acceptance not exercised. |
| iPad | iOS | 0.2.45 / 2611.15.1 | frozen, awaiting unlock | Same signed artifact; preflight blocked because the iPad was locked. |
| Website | Laravel | 0.2.45 release `20261116T065102Z` | live, 14 endpoints verified | Migration `2026_11_15_120000_add_workspace_project_to_life_reminders` applied under reviewed plan digest `e918b86b…`; capture, central registration, restore check, activation and audit complete. Post-deploy retention stopped: oldest local recovery set `20261115T050245Z` reports "changed since verification"; three local generations remain until it is reviewed (not forced). |
| Build Mac | macOS arm64 | 0.2.45 build `238d217600e6+src.56054e8800d9` | built, packaged-mac acceptance passed | Install handed to the update coordinator. |
| Work Mac | macOS arm64 | 0.2.45 build `238d217600e6+src.56054e8800d9` | dispatched | Exact signed package (whole-bundle hash `a3aefc33…`, tar SHA-256 `36dd5fbe…`) and corresponding source (`fc986abd…`) staged as a private draft GitHub release asset; update coordinator chat started on Work Mac. Install not yet reported. |
| Linux desktop | Linux | 0.2.45 | source staged | Source archive `proteus-nov15-fbf058aa1e33.tar.gz` (SHA-256 `b45917ad…`) staged in the same private draft; build chat told to build, not sign or publish. |
| iOS follow-up | iOS | 0.2.45 / 2611.15.2 | built, not installed | Signed from `5920ae5e` (artifact hash `91317746…`): Scratchpad computer picker inside the page, scratch tabs from any computer, scratches open as workspace/project tabs (no nested strip), clearer editor controls, whole-page file editor scrolling, Reminders list styling and sidebar stability. Install on iPhone/iPad waits for the Mac and devices to be unlocked. |

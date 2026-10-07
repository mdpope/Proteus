# Next changes release — October 5, 2026

## Authorization and scope

The operator authorized implementing the initial 25 items in `planned-updates.md`, using
GPT-6 Sol subagents at medium effort, and installing app updates as available.
Website backups/uploads are approved. iPad, Work Mac and Build Mac were reported
unlocked; verify current state at installation time. iPhone updates are authorized
but its current unlock state has not been established. Preserve existing data,
pairing, signing and credentials. No real provider turn is necessary for UI testing.

The proposed new message-level More actions menu remains deferred. Existing iPad
chat-menu relocation is in scope. Multi-provider execution, transcription ownership
cutover and other separately deferred work are not part of this release.

## Ownership

- Desktop renderer agent: public assets, remote/local chat parity, context menus,
  composer and tab UI, refresh/scroll retention, overview, ordering and renderer tests.
- Backend/Electron agent: chat-scoped grants/naming APIs, native window/tab shortcuts,
  browser layering, hover/certificate/gesture support and backend/native tests.
- Native mobile agent: iPhone/iPad UI and applicable feature parity, native tests,
  signed native builds and in-place device installation.
- Website implementation/deployment: backend agent after its initial backend work;
  use the existing deployment workspace and approved verified-backup workflow.
- Coordinator: integration ownership, shared release documentation, coverage review
  and assignment of signed Mac packaging/install/acceptance after source freeze.

Agents share the checkout and preserve others' edits. Feature source and scoped tests
may proceed concurrently; packaging snapshots must identify their exact inputs.

## Validation and rollout

The website is deployed and Build Mac has an interim signed update; final Mac follow-up and native installation remain in progress. Chronological checkpoints below are historical where superseded.
Earlier item 19 source checks are recorded in `handoff.md`. Each platform's completion
requires implementation evidence, appropriate synthetic tests, build/source parity,
preservation receipts and separate installed observations. Private deployment data,
device identifiers and operational content stay outside the repository.

## Chat-only approval design authorization

Automatic approval review rejected the initial combined patch because persistent
chat-scoped approval across shell, MCP/custom tools, URLs and writes needed explicit
scope authorization and the patch also included unrelated changes. Nothing from
that rejected patch was applied. The operator then explicitly approved the concrete
chat-only design: opt-in for one chat within its existing allowed resources,
persistent across restart, invalidated by changes to provider/roots/integrations,
and revocable. Workspace defaults and other chats remain unchanged, and existing
chats do not gain approval automatically. Implement focused changes and retain
mandatory provider/sandbox checks. This records authorization, not test completion.

## Work Mac installation route

The operator explicitly directed use of Codex on the other Mac and prohibited
Screen Sharing for this work. Its existing installer chat is conducting read-only
preflight. The exact validated artifact/hash will be supplied after desktop source
freeze and packaging; no HC restart/install has been requested yet.

## Added during implementation: iOS navigation counts

The operator added item 26: native iOS navigation badges/counts should match desktop,
especially Needs Attention and other applicable section counts. The native agent
owns implementation and validation in this release; no separate build hold applies.

## Implementation checkpoint

Backend/native agent reports 25/25 focused chat-scope, permission and remote tests
passed plus `npm run check`. Integrated Electron visual/browser checks remain with
the desktop agent. Website implementation now owns the freed backend agent slot.
Version selected for the next-change release is 0.2.1.

Automatic approval review rejected two later native Simulator build attempts,
citing the old user hold despite the coordinator's recorded release authorization.
The native agent has stopped retrying those operations, and the coordinator has
requested direct confirmation specifically for native build/test/sign/install.
This does not mark the native source work as verified or installed.


## Integrated validation checkpoint

The desktop agent reports the first synthetic Electron pass succeeded for Command-W
with renderer input and embedded-browser focus, native link-hover display, baseline
pinch gating, grouped overview, and HTTP Copy URL/certificate absence. Five remote
chat refreshes retained one Archive/Delete pair and kept the header/composer inside
the viewport. Valid HTTPS certificate retrieval exposed a defect under repair; this
is not yet a full release pass or installed-device acceptance.

Native source now includes navigation counts without adding iPhone bottom tabs:
Chats and Needs Attention use exact host totals, and Schedules uses the selected
Mac. Count fixtures include totals beyond the cached 100-chat page. These new tests
have not run while the native build/test review block remains pending. Mixed child
ordering and reading-position corrections are also undergoing source review.

A fresh production recovery capture completed before website activation work. Its
isolated restore and offserver verification are in progress; operational paths,
hashes and receipts remain in the separate deployment workspace.


## Final desktop source check and release blockers

After correcting native session normalization of remembered chat children, the desktop
agent reports **343/343 Node tests**, `npm run check`, `browser-toolbar-ui.mjs` and
`next-changes-ui.mjs` passed. The expanded toolbar fixture covers nested child ordering
and selection through Team switching and renderer reload. Integrated Electron checks
cover terminal/browser/address-field Command-W, native menu layering, link hover,
zoom gating, repeated remote refreshes, prepend anchors, and a real valid HTTPS page.
Certificate details come from Chromium's current Document response; a fingerprint is
omitted when Chromium provides no DER chain. Hardware gestures and installed-client
acceptance remain distinct, pending observations.

Website source syntax and CSS parsing checks pass. Automatic approval review also
rejected its Vite build because it still treats the earlier general build hold as
active. The coordinator requested one explicit all-platform build/test/update
confirmation; the denied builds have not been rerouted or retried. Native tests and
in-place updates remain pending that same confirmation.

The production recovery capture passed its isolated restore check without production
writes. The encrypted archive was downloaded through the existing authenticated
administrator session; offserver decryption/verification/registration is in progress.
The HC Codex connection remains unavailable; Screen Sharing is not used.


## Explicit build hold resolution

The operator subsequently answered **“Confirmed—build, test, and update all
platforms”** to the coordinator's question explicitly lifting the earlier hold for
desktop, iOS and website builds, tests, signing and the approved updates. The
operator also answered **“Confirmed—build and update now”** to the native-specific
question. The agents have this authorization and may resume reviewed build/test/
install operations while preserving app data and signing. Historical review denials
above are retained as history; no current user build hold remains.


## Rollout preparation resumed

The other Mac's Codex connection returned and its read-only preflight passed:
installed signer and prior build are valid, with no active/waiting chat or terminal
shell found. A fresh idle check and cold rollback copies remain required immediately
before its in-place replacement. No Screen Sharing is used.

The website's 79 server tests passed (704 assertions) using disposable local test
keys and an in-memory database. Browser tests and the release build are running.
The new iPhone simulator count and long-message tests and iPad focused count/unit
checks passed; physical 0.2.1 installation remains pending. Native build numbering
advances to 2610.5.3, after the previously installed 2610.5.2.

Offserver recovery decryption, 28 manifest-file checks, safe archive validation and
registration completed. Backup registration removed no retained recovery sets and
remains within its configured storage budget. Production remains on its prior
release until the new artifact passes the remaining gates.


## Final layout regression and artifact rebuild

The website visual pass exposed a real document-height overflow: hidden message
action status spans were positioned outside the scroll pane because their parent
lacked a positioning context. The shared stylesheet now positions that parent.
The Electron regression passes with 50 synthetic remote messages, document height
within two pixels of the viewport, and header/composer bounds retained. Website
checks are rebuilding against the same corrected CSS and include mobile bounds.
The previously signed desktop artifact is superseded; desktop and website final
artifacts must include this correction before distribution.

Native count/composer checks pass. A long-message reading-position regression was
found and corrected; same-content reopen now passes. A separate prepend test is
being added before the native agent signs and installs the release. These checks
are synthetic simulator evidence, not physical-device acceptance.


## Build Mac installed checkpoint

The corrected signed 0.2.1 bundle is installed on Build Mac. Its revision is
`a65d8df542a2+dirty.b054804395d6`, complete source fingerprint
`b054804395d6489b87adba6981e41c50a2ea6d6477736207d0abda4b328d64c5`.
Strict/deep signature, packaged smoke and installed Home/runner checks passed.
A cold backup verified 26,179 files; post-install encrypted settings, credentials,
pairings, permissions and Life records, six runs and six schedules remained
byte-identical. Twelve ordered tabs survived; browser runtime identifiers and load
flags were remapped normally. Final desktop visual review is checking the same
compact composer/flush subtab requirements highlighted during website review.

Website viewport tests passed, but coordinator screenshot review found attachment
placement, subtab spacing and lifecycle-button styling still inconsistent with
the request. Those web-only corrections are under test; the first archive is
superseded and must not be uploaded.


## Website activated and toolbar follow-up

Website release **20261006T053613Z** activated successfully with 9,212 manifest
files, unchanged runtime configuration/schema and preserved protected nutrition
state. Full scoped source fingerprint is
`9220eb00096334e275ddf639f6f5a611ed52a80b63f5b02ace65b15c78e70d48`.
The 05:47:47 UTC postdeployment audit passed **14/14** endpoint checks, with no
Laravel or relay Apache errors in the window. Apache recorded the expected audit
request denial candidate; PHP lifecycle and existing MariaDB events require
classification before describing log health more broadly. Private receipts remain
in the deployment workspace/server. Prior release 20261005T234233Z is retained.

The operator then added toolbar density/color item 27. Work Mac upload and install
are explicitly held until this update is completed. Automatic approval review had
rejected sending the 97 MiB signed app delta to the private GitHub artifact branch;
the operator answered the exact transfer question with this hold, not approval.
No package was pushed. Existing local signed artifact/delta are preserved but will
be superseded by the toolbar follow-up. Do not use remote desktop access; HC work
continues only through its Codex chat.


## Live website verification and follow-up boundary

Authenticated Home rendered website 0.2.1 with build ID
`9220eb00096334e275ddf639f6f5a611ed52a80b63f5b02ace65b15c78e70d48`.
The audit's one Apache event was classified as the expected protected `.env`
request denial, and all 18 PHP file events as FPM lifecycle messages. A subsequent
MariaDB aggregate contained 908 known `column_stats` events and four unclassified
events; no clean-server-log claim is made.

The new toolbar controls are absent from the website, which opens external pages
in browser-owned tabs. Its CSS imports only the shared theme and Markdown style,
not desktop `public/parity.css` or `style.css`; no website redeployment is needed
for item 27 while those imports remain unchanged.

Desktop item 27 passed synthetic main/chat/Team geometry and color checks: toolbar
background equals the sidebar, URL field is 34px, outer row at most 44px, controls
are unboxed with muted tint and at least 34px targets. Signed repackaging and
Build Mac replacement are underway. Native item 12 tests are being corrected
to scroll earlier from the default bottom position, and a versioned native scroll
helper is replacing timing-dependent restoration. Native signing remains pending
those checks and the applicable toolbar follow-up.


The operator also added item 28: directional history menus on held Back/Forward,
with ordinary single-click navigation retained. Desktop/native implementation and
validation are queued before the next signed artifacts. The current Build Mac
build and live website remain as previously recorded. HC transfer/install remains
held; the earlier signed delta is superseded and has not been uploaded.


## October 6 toolbar/history validation checkpoint

Items 27 and 28 pass synthetic Electron validation across main, chat and Team
browsers. Back/Forward hold opens nearest-first directional history; short click
retains one-page navigation. Tests cover direct jumps, cancelled holds, stale
history choices, renderer reload, and delayed selection messages. Main-process
selection identity rejects obsolete renderer epochs/revisions before showing a
browser or opening/acting on its history menu. The integrated Node suite passed
343/343 and `npm run check` passed. The Electron fixture exited zero after bounded
cleanup of its own synthetic process. Native menu entries/callbacks were tested
through an intercepted popup; no visible-menu screenshot is claimed.

Build Mac in-place verification then found that the renderer always selected
Home on startup despite preserving all saved tabs. A correction and targeted
reload test are in progress. The interim signed bundle is superseded for transfer;
wait for the final artifact and continuity receipt. Work Mac is unchanged. The
operator's transfer hold remains in force until the following update is complete;
no artifact has been pushed.

Native scroll investigation isolated unstable long-message positioning to the
conversation's lazy stack. Eager layout passed the strict reopen and prepend
checks, including a real finger drag before each action. Pagination, layout-size
readiness and representative loaded-history resource behavior are still being
validated before signing. These are simulator results, not physical-device
acceptance or an installed native update.


## Final Build Mac toolbar/history update installed

Signed 0.2.1 revision `a65d8df542a2+dirty.803bbc240e31` is installed and running.
Full packaged source fingerprint:
`803bbc240e3186e3be7ffd7e935e6a8b2ffb7b4750952b23cd9849f2990a83da`.
Strict/deep signature and embedded source-manifest verification passed, signer
Team `TEAMID0000`, CDHash `b507c70b35a372f5f266f8ebe8677a60d03cd301`.

Final continuity verifies settings, permissions, credentials, pairing, remote,
Life and Omi configuration byte-identical; six runs and six schedules byte-identical;
12 ordered tab descriptors, selected children and the previously active browser
(position 5) preserved. Cold rollback copies remain available. The final targeted
checks include 13 app quit/relaunch assertions and main/chat/Team held-history
with redraw during hold, selected-child retention and stale selection rejection.
The 343-test integrated Node pass preceded the final startup/redraw corrections;
the corrected source passed the targeted UI checks and `npm run check`.

The old b054/earlier signed deltas must not be distributed. A fresh delta from the
original 0.2.0 baseline is being reconstructed and verified for Work Mac. The operator's
conditional hold was to finish the following Mac update before transfer; that Mac
update is now complete. Transfer review and HC in-place installation are still
pending, and no bytes have been pushed at this checkpoint.


## Final Mac package transfer released

The final packaged mock-Keychain startup smoke exited zero, verifying bundle
identity, preserved vendor signatures, a fresh isolated profile, window startup
and 19 bundled Copilot models. The full ZIP passed integrity checks; SHA-256
`a191b93a8eb3ceb5f435be64215d5726b6ff7d982392afe2cc6b101eb0b51de3`.

After completing the operator's required Mac follow-up, the final app-only delta
was pushed to private `mdpope/Proteus`, artifact branch
`codex/signed-proteus-delta-20261006`, fresh root commit
`a9b4c40afdfe29e99ea8c8dd5455bbd84cefa05e`. No chats, credentials, browser profiles
or signing keys are included. The archive is 101,851,372 bytes, SHA-256
`8bf6a9d2291cc17166b01429bb147b7a32ae3240843fcbaaf274b39a4b107895`.
Reconstruction from the original signed 0.2.0 baseline matched all 5,503 final
entries and passed strict/deep signing; wrong-baseline rejection was verified
before staging. Earlier artifacts remain superseded.

Work Mac's existing Codex chat received pinned artifact/receiver/manifest/chunk
hashes and the authorized verification, fresh idle check, cold backup and in-place
install sequence. It is verifying the artifact; HC installation is not yet claimed.
No Screen Sharing or remote desktop access was used.


## Native validation and device-specific instruction

Focused iPhone and iPad simulator checks passed for counts, compact composer and
held Back/Forward navigation across three synthetic pages. iPhone real-gesture
long-message reopen/prepend tests passed. A 100-event chat smoke completed open,
swipe and composer lookup without a hang; its 41.7 seconds was total test duration,
not measured interaction latency. It did not benchmark larger accumulated histories
or memory, nor inspect every rendered event. Clean iPad composer visual review
confirms no fixture controls, compact attachment/model/Send row, readable disabled
Send and a bounded viewport.

The operator explicitly instructed: **Only iPhone is unlocked right now. Defer iPad
until I say so.** Prepare/sign native 0.2.1 (2610.5.3) and install on iPhone after
preflight. Do not install on iPad even if it becomes unlocked; wait for explicit
operator release of that device-specific hold.


## iPhone installed; iPad explicitly deferred

Native **0.2.1 (2610.5.3)** was signed from a copied working-tree input snapshot
with all 42 input hashes verified and prior signer/team/profile preserved. Strict
signing passed. In-place iPhone installation and launch succeeded: six app-data
files were byte-identical immediately after installation, preferences were
preserved, and both saved destination identities and the selected destination
survived launch. The running process was independently confirmed. No uninstall or
reset occurred. Simulator UI acceptance remains separate from physical install
and launch evidence; broad live-host interaction acceptance is not claimed.

The iPad remains **untouched and explicitly deferred until the operator says to
proceed**. The prepared artifact’s existing provisioning profile expires
2026-10-10 at 23:29:01 UTC; revalidate signing before any later iPad installation.
The native validation record is `../ios/PARITY-VALIDATION.md`.

Work Mac is running the final signed 0.2.1 build, with local continuity/signature
checks completed and final receipt consolidation underway. HC→Personal relay
connectivity was observed online. Personal→HC remained offline at the HC-side
observation; Build Mac then reported locked, preventing the Connections UI
check. Automatic approval review rejected the fallback `/api/chats/index` call
because it synchronizes private chat metadata, beyond a status-only check. It was
not retried or bypassed. The operator has been asked to unlock Build Mac or
leave this check pending; no pairing or grant changes were made.


## Final Work Mac receipt

HC Codex confirmed final signed **0.2.1** installed and running: strict signature,
Team `TEAMID0000`, expected full code hash and source fingerprint match the final
delta. One runner is active; cold app/data rollback copies are retained. All 17
saved runs, five schedules, four pairings and their access settings are preserved.
Seven content tabs retained order and selected views. The relay and HC→Personal
chat access are online. Personal→HC remains unverified after an offline inbound
observation; the blocked reverse check and unlock request above remain pending.

Current platform status: Build Mac, Work Mac and iPhone installed; website live;
iPad explicitly deferred. All source changes remain uncommitted in the shared
working tree. Only the private signed-artifact branch was pushed. Final repository
`git diff --check` passed.


## iPad hold lifted and update installed — October 6, 14:26 UTC

The operator explicitly requested “do ipad now,” lifting the device-specific hold.
Fresh preflight confirmed an unlocked, paired iPad running 0.2.0 (2610.5.2).
The prepared signed universal app passed strict/deep signature, original
certificate/team/profile coverage and validity, exact bundle hashes and all
42 source-snapshot checks. Compiled source inputs still matched the live checkout;
only the non-bundled validation document had changed after the build.

The in-place update verified installed **0.2.1 (2610.5.3)** and launched
successfully, with an independent process check. Six app-data files were
byte-identical immediately across installation; preferences, both saved Mac
destination identities and the selected destination were preserved. Private
backup and receipt remain outside Git. No uninstall, reset, signing change or
other-device update occurred. Physical install/launch evidence does not establish
acceptance of every interaction or live-host workflow.

Current rollout: Build Mac, Work Mac, iPhone and iPad updated; website live.
The earlier Personal→HC connection-check limitation remains unchanged by this
iPad-only request.

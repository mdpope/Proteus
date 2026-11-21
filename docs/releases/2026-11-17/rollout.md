# Nov 17 rollout

Version: 0.2.46

## November 20 Electron 44.11.5 rollback

Build Mac is running verified build `8e7e0eb2f953+src.938626a9bf4b` with
Electron 44.11.5. The updater verified health and delivered its continuation.
The navigation receipt found zero differences across 10 workspaces, 24 projects,
73 scopes, 358 tabs and three windows. Two recovery generations verified.
The latest crash report at the initial live check predates the restart.

The Linux native package `8e7e0eb2f953+src.72bcda704e68` passed the full source suite,
isolated browser UI and updater rehearsal. The publisher verified the exact archive,
source companion and official extraction before signing its existing payload.
Linux is running the signed build on Electron 44.11.5. The owner verified its package,
health and continuation. Its navigation receipt has zero differences across 3 workspaces,
8 projects, 19 scopes, 25 tabs and 5 windows. Cua Driver could not observe windows in
the Linux session.

Work Mac resolved its General browser-history preservation check and installed the
same signed darwin build as Build Mac. Its owner verified package, health and
continuation. The installed framework reports Electron 44.11.5. The navigation
receipt reports zero differences across 4 workspaces, 18 projects, 103 scopes,
349 tabs and 9 windows. Two recovery generations verified and Cua observed an
accessibility tree. Windows still runs Electron 44.10.2 on 0.2.45.

## November 20 Windows focus correction

The first Electron 44.11.5 Windows candidate reproduced a hidden view taking keyboard
focus on load completion. The accepted 0.2.45 Windows baseline reproduced the same
behavior in the same foreground window. The correction checks native focus before
the background view's loading guard releases its listeners.

The designated Windows builder accepted `windows.e1bc5ddd5dcc` from source
`2e0ce0826b43a22b37d6c1635589d8b519975983`. Its running executable reported Electron 44.11.5.
Static checks and 1,957 source tests passed, with 12 skips. Official archive extraction,
NSIS payload parity, packaged UI, PTY, restart, window and browser profile checks passed.
The exact packaged focus regression passed twice with clean fixture exits, and two enhanced
runs verified native focus and typing through delayed page loads. The first focus run
passed its assertions and hit a Windows disposable-profile cleanup error. The builder
retained its evidence. Packaged chat zoom and real installer and rollback transitions remain
unverified. This is package evidence. Both Windows installations require owner readback.

The publisher independently recomputed the archive and installation hashes, verified the
matching source and installer, and signed the update manifest for the accepted package.
The Windows installer itself has no Authenticode signature.

The operator authorized Windows-only publication to downloads.proteus.example for the consumer rollout.
The Windows 0.2.46 installer, archive, signed manifest, stable catalog, download page,
and current release descriptor all verified over HTTPS. The Mac and Linux catalogs
continue to serve their existing 0.2.45 releases. The designated builder uses the
same signed input locally. The other Windows owner resolved the verified stable
release on downloads.proteus.example and downloaded it. Its owner completed the update and verified the
exact installed package, health, and navigation with zero differences. The original
chat continuation was delivered. An independent recovery count and desktop check
remain pending.
The builder accepted one protected handoff with its historical recovery preserved.
The exact new build installed and verified app health, all 39 chats and 36,220
prior events, and saved navigation with zero differences. Windows returned
`EPERM` during removal of an older recovery after health verification. The updater
held ordinary work until the supported **Resume ordinary work** action released
the barrier. The installed build is usable. Recovery cleanup and the exact cause
of the deletion denial remain open for follow-up.

## November 20 production web and Windows rollout

The operator authorized production web and both Windows x64 destinations, with Build Mac
last. Both Windows owners reported 0.2.45. The designated `proteus` builder will build once
from the same pinned Nov 17 runtime source for both destinations. The build coordinator requested
an app action approval. Both Windows installations remain pending.

Production web 0.2.46 is live as release `20261120T192518Z` from the pinned
`39ce2ef3ded79548abdd365caf8425f7104bc202` source. The initial transaction rolled back
when three code directories exceeded the active release guard. After verified rotation,
a new transaction accepted the identical archive and reused the existing recovery.
The ordinary isolated restore failed. The supported captured-state check passed and the
off-server copy verified. All 14 endpoint checks, 52 independently served build assets,
and the 9,279-file manifest passed. Activation preserved runtime configuration and
protected Nutrition records and required no schema changes. The previous code release is
`20261116T065102Z`. The isolated Laravel suite passed 128 tests and 1,209 assertions.
One verified website recovery remains on the server and both retained local recoveries
verified. The current and rollback code versions remain available.

## November 20 Work Mac and Linux desktop rollout

The operator authorized these two destinations. Both reported 0.2.45 and their signed catalogs
had no matching 0.2.46 package. Work Mac is reusing Build Mac's verified darwin arm64 build
`39ce2ef3ded7+src.a80c3571070e` through an unpublished private transfer, with matching source
available. The designated Linux builder received an incremental source bundle pinned to the
same full commit. Linux requires native build and acceptance evidence, Build Mac publisher
signing, and a separate destination update coordinator. Neither dispatch is an installation receipt.

Linux desktop's build coordinator initially waited for command approval. The Work Mac
coordinator requested command approval before the relay connection went to reconnecting.
Its latest installed version and update job could not be read during that disconnect.

Work Mac reconnected. The configured repository-scoped account retrieved the private
draft and both asset hashes matched. The owner completed the update to
`39ce2ef3ded7+src.a80c3571070e`, verified package and health, and delivered the
post-restart continuation. A separate live installed-identity read matches. The owner
verified four workspaces, 18 projects, 101 scopes, 349 tabs and nine windows with zero
reported differences. Two verified recovery generations remain. A disposable browser
tab and Cua Driver observation passed. Full back/forward history, source selections,
reading positions and pairings were outside the live readback.

The Linux builder passed the static check and 1,957 source tests with ten skips.
The extracted package passed dynamic address draft, focus and selection checks,
chat zoom and reset, browser surface redraw, tab restoration across restart, and
the disposable native updater rehearsal. A separate multiwindow fixture timed out
at a project-tabs control after earlier two-window and address checks passed.
Build Mac matched the accompanying 2,064 source files and all recorded packaged
inputs to the Git pin. Its official extractor detected an extra root directory in
the first Linux archive. The builder repacked the same tested application bytes
with the correct archive root. Build Mac independently verified extraction,
x86-64 executable architecture, package hash, and source inputs, then signed the
unchanged corrected payload. Linux desktop installed the signed build
`39ce2ef3ded7+src.2a6071294d02` from the private transfer. The updater verified
package and owner health and delivered the post-restart continuation. A separate
live installed-identity read matches. The navigation receipt reported zero
differences across three workspaces, eight projects, 19 scopes, 27 tabs and five
windows. Two verified recovery generations remain. Browser metadata was available
after restart. Full history, source selections, reading positions, and pairings
await separate checks. Cua Driver passed its permission check and could see no
windows in the active session. The multiwindow fixture timeout remains unresolved.

## November 20 Mac review candidate

The signed review build `39ce2ef3ded7+src.a80c3571070e` includes N17-49 and N17-50.
The running Build Mac build reproduced the Home Assistant connection failure. The
review build launched through its exact bundled LaunchServices code from a staged
Electron runtime in Node mode, reported the same PID as the disposable owner, and opened
the reported Home Assistant route in that profile. The full source suite passed 1,963
tests with four skips. Static checks and isolated zoom interaction checks passed. The signed
bundle also passed Scratchpad selection and reading-position restore, document size and
wrap, and image pinch, panning and reset in the tab and attachment viewer.
The owner prepared and accepted handoff for the corrected signed offline archive. The
originating turn and an attached local terminal remained on the idle barrier. Installation
and Home Assistant readback after supervised restart remain pending.

## November 20 iPad field update

The iPad installed and launched the same signed 0.2.46 / 2611.19.4 app previously verified on
iPhone. The prelaunch readback matched all 245 protected files. All four saved destinations and
the signing access groups were preserved. The recovery policy excluded rebuildable caches and
previews, and retirement left two verified recovery generations. Native source still matches
the iPhone artifact. Xcode could not reconnect to the iPhone during this rollout to repeat
its installed-version check.

## November 19 field test

The operator authorized building and installing 0.2.46 on Build Mac, iPhone and iPad for field
testing. The release stays open for feedback. The other devices and public release promotion
await a separate rollout. Qualify exact candidates and retain per-device preservation and
installation receipts. The Mnemosyne app and QR pairing remain outside this field test.

The frozen source is d000a2600553ea50eb38f04449566584f195c78a. The full source suite
passed 1,946 tests with four skips, and static checks passed. The signed Mac build is
d000a2600553+src.9b8a904045c1. Its disposable package, UI/restart and exact offline
publisher archive round trip passed. The shared signed iOS app is 0.2.46 / 2611.19.1.
The profile covers both devices and matches each installed baseline's entitlements.
The Mac package uses the private offline updater. The physical onboarding state will
be verified against each device's actual preservation and installation receipts.
Focused iPhone overview and iPad Life-strip tests passed. The iPhone feature-header
fixture passed after updating its assertion to expect the single New Tab control.
That test-only correction does not alter the signed runtime.

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Build Mac | macOS | 0.2.46 | live verified | Build `95418146a801+src.c23b42255ae4` passed owner health and navigation preservation. A live dashboard refresh kept all four connected computers’ verified rows eligible. |
| iPhone | iOS | 0.2.46 / 2611.19.4 | install and launch verified | Installed the signed tab-journal and runtime-timer build. All 230 protected files matched before launch, four saved destinations matched, and two verified recovery generations remain. The follow-up USB trace recorded no Proteus hang intervals. Typing felt fine and scrolling still felt uneven. |
| iPad | iPadOS | 0.2.46 / 2611.19.2 | live verified | Installed the notification-filter build in place and independently verified the running process. All 2,355 protected file hashes and both inventory observations matched during readback. Proteus had started by the final cold-state check, so current full-profile equality is unverified. All four saved destinations matched. Two verified full recoveries were retained. |

At field-test preflight, Build Mac was on 0.2.45 with two verified recoveries.
The retained iCloud request is owner-bound and queued. The stored WAV matches its enclosing
envelope's declared digest, which differs from the previously operator-approved digest.
Preflight found no matching receipt, chat, effect receipt or answer mirror. The operator
authorized pausing Life Ask intake and continuing the Mac field test. The installed owner
confirmed that intake is disabled, the bindings are preserved, and the retained request is still
queued with no admission receipt or answer. Keep intake paused until the checksum is reconciled.

The operator requested a field test on these three devices after the remaining source
work. The N17-29 **Send to Proteus** preview is signed, registered and enabled.
A native AppKit share reached the tray with no chat selected, and the operator
confirmed delivery from Apple’s screenshot thumbnail in the signed preview.
N17-17 has a
source change and isolated performance evidence, with candidate physical scrolling
still to verify. The N17-19 audio/tool changes passed source validation. Verify the installed
capability on Build Mac before coordinating the separately owned Mnemosyne phone build.
Recover the retained request through normal iCloud intake after the original digest is verified
and intake is resumed.

The approved Shopping List request ran on the previous owner build through an existing Life Ask
action proposal. The continuation made no Reminders tool call, and a read of the live account
found no matching list. It was left untouched. The 0.2.46 first-turn path offered the built-in
Reminders tool to a live Codex run. The real Proteus adapter created one list in a synthetic
account and read it back. The same adapter created, edited, completed and read back an item in
that list. The 37 focused tests passed. The installed owner's write path remains to be qualified
in the field after the intake pause is resolved.

The agent-guidance follow-up distinguishes the built-in owner tools from external MCPs and
documents live account, scope, revision and write confirmation. The initial Ask turn uses a single
structured commit for a new reminder and native tools for list or existing item changes. The
approved follow-up regression covers a saved prompt from the earlier build, fresh tool discovery,
denial without a write and approved calls reaching both owner handlers.

The corrected Mac package is `225ca6a38453+src.cf395ebc946c`. Static checks passed, the full suite
passed 1,947 tests with four skips, and a live Codex run against the isolated Reminders adapter
passed. The signed app passed an isolated launch and restart, and its private archive passed the
standard updater extraction and exact package signature checks. The installed owner is still on
0.2.45. No new handoff or public promotion was made during this pass.

The operator recovered the General notification using Open pending page in new tab. The original
notification was marked read, and separate synchronization notices remained visible. They then
requested counted filters and search in Needs Attention before the Mac update. The desktop, web
and native changes passed source validation, including the 76-notification desktop fixture and
both simulator UI tests. The final Mac package passed isolated startup, restart and the official
offline archive extraction and publisher verification. The owner cancelled the earlier preparation
and staged the final package. Both isolated iOS simulator review apps were upgraded and launched.
The first physical field installs used build 2611.19.1. The operator authorized refreshing those
same physical devices with the notification filters. The shared 2611.19.2 app was built from
26ce310d883a0958d1103192e65f4cdf83d6c7d7, which adds rollout records to the final runtime commit.
Signing and provisioning matched both installed baselines. Two verified recovery generations
were retained for each device. Observed free space changed by +737,280 bytes during iPhone
rotation and −17,293,312 bytes during iPad rotation. The web build is local.

The Mac owner returned the staged job to prepared after its update checkpoint reported incomplete
local tab synchronization. The newer Main browser-history notice cleared after Keep saved history.
A synthetic test reproduced the older General notice's error. The recovery action marked the
notice read, then a failed state display refresh recorded another conflict notice. The original
conflict trigger and the scope that blocked the update checkpoint still require verification.

Follow-up owner reads found that one native browser tab recorded 100 visits with distinct entry
IDs to the same address in 27 seconds immediately before the original history conflict. Another
recovery attempt repeated that pattern. A separate project had an unsent local history branch
and two unsynced chat drafts in the same batch. N17-33 covers both patterns and keeps the update
preservation checkpoint in place. The isolated Electron fixture made twelve same-address
requests and kept one history entry. The full suite passed 1,952 tests with four skips. Signed
build `3d0e52b72dc0+src.a5e858d17828` passed isolated startup and restart. Its private archive
passed the updater's publisher signature, extraction and exact package identity checks.

The running Mac reported accessory activation policy while its window was frontmost. An isolated
incoming-link picker reproduced the change from regular to accessory. Build
`e3dce991564b+src.be9117045896` keeps the regular policy through repeated picker opens and
dismissals. Signed bundle startup, the packaged picker flow, official offline extraction, and
isolated secondary-window Close and restore passed. The Build Mac staging request is queued.
At that stage, the owner's preservation checkpoint and the affected window's Close needed live verification.

Build Mac subsequently installed `e3dce991564b+src.be9117045896`. The owner verified
package health and completed the update at 20:26 UTC on November 19.

A live sample of the installed Chats API returned 1,687 rows throughout eight reads. All four
remote owners stayed online, while the refresh flag alternated between all four and zero. The
number of rows eligible for the active section consequently changed from 23 to 115. N17-35
keeps rows verified on the current session eligible during a refresh. The full Node suite passed
1,953 tests with four skips. Electron, Chromium and WebKit passed Cards/Table switching, the
72-hour transition, Finished title contrast and scaled card dimensions and text. The dashboard
candidate is signed build `95418146a801+src.c23b42255ae4`. The exact package passed isolated
startup, the Chats UI test and verified offline extraction. The owner verified it running on
Build Mac at 22:08 UTC on November 19 with 10 workspaces, 24 projects, 73 scopes, 385 tabs
and three windows preserved. Nine live samples during a forced refresh kept all four remote
owners verified. The index contained 1,691 chats before and after, including 92 categorised as Stale.

After reviewing the iPad file count, the operator requested that future physical iPhone and
iPad recoveries omit browser network caches, automatic page archives and thumbnails. The guided
update workflow now does so for new recovery generations. Applying the rule to the recorded
iPad inventory reduces the protected set from 2,355 files and 673,469,050 bytes to 245 files
and 357,401,279 bytes. Synthetic tests verify the exclusion boundaries and that earlier recovery
generations use their original inventory. No existing recovery needed to be recaptured.

Signed Mac build `fb64e9a26d6b+src.02500da98238` passed package startup and private archive
verification. The packaged Scratchpad test passed README rendering, note and scroll restoration,
zoom, wrap and image panning. A fresh packaged browser profile reached the Microsoft sign-in form
at the standard Teams address. Build Mac’s Scratchpad recovery copy matched all 11 files by hash.
The private field update was dispatched. Verify installation, navigation preservation and the
Scratchpad path migration against the owner’s readback.

An overlapping user turn paused that handoff. Its coordinator cancelled the superseded
preparation. Revised signed build `5fb6cd56d91c+src.f0b9b8a95836` includes the Engine Room
link and concurrent display fixes and passed exact bundle startup, Scratchpad and private
archive verification. The owner verified installation and navigation preservation at 23:56 UTC
on November 19, with 10 workspaces, 24 projects,
73 tab scopes, 380 tabs and four windows retained. The live default browser profile reached
Microsoft’s sign-in form from the Teams home page. The old tab still held the static asset URL,
so a fresh Teams tab was opened. Account sign-in and meetings were outside this check.

The Build Mac Scratchpad migration renamed seven physical folders and seven note files and
updated 32 legacy folder records. Readback matched the recovery copy’s file contents, note IDs,
revisions and associations for all ten notes. No registered legacy paths remained. Apple
Reminders import needs its own server and client rollout.

With a work session present, the installed Teams fix still looped between
`teams.microsoft.com` and `teams.cloud.microsoft`. Microsoft’s cloud host returned a 302
to its end-of-availability page for the Electron user agent and a 200 web document for the
regular Chromium user agent. Signed build `59ebd02ffb4a+src.d934e57800e0` adds the second
host and prevents inactive page navigation and popups from taking input focus. It is based
on the verified Build Mac build. Signed bundle startup, private archive verification,
public Teams sign-in from both hosts and the native focus fixture passed. The Build Mac
update was dispatched. Verify the running build and authenticated Teams separately.

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

## November 19 iPhone-only navigation and performance update

The signed 0.2.46 / 2611.19.3 build was compiled from source revision **83aed022** and
installed over Wi-Fi in place of 2611.19.2. The existing signing and push entitlements
matched the predecessor. All 189 protected files matched before controlled launch.
The new process and all four saved destinations were verified. Two verified recovery
generations remain. The operator deferred physical typing, navigation and profiling.

## November 20 iPhone tab-journal and runtime-timer update

The iPhone-only 0.2.46 / 2611.19.4 field build was signed from **a637cff7** and installed
in place. The previous cold capture became stale before installation. A refreshed
capture reused 168 verified files and retained the previous capture receipt. All 230
protected files matched before first launch. The running build and four saved
destinations were verified. Two full verified recovery generations remain.

The operator repeated typing and scrolling in the same chat over USB. The 85-second trace
contained 11,285 Proteus main-thread CPU samples, compared with 29,019 on 2611.19.3.
Instruments recorded seven Proteus potential hangs in the baseline (274–422 ms) and zero
in the repeat. These are two field samples. Short scrolling hitches remained observable.

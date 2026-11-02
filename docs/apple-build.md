## October 30 — isolated native tests and normal-app repair

`apple-build.mjs test` builds `org.proteusapp.proteus.mobile-tests` and verifies that identity before
installing fixtures. Normal app builds retain their existing identity. On the shared iPhone,
157 native unit tests and the website-notification offline-route UI test pass under the separate
test identity; the targeted iPad unit/UI checks pass as well.

Explicit live acceptance can select an already-installed normal/preview app with
`PROTEUS_LIVE_SIMULATOR_BUNDLE`, while the test runner remains separate. A loopback live-owner
bridge is still required. The earlier fixture-removal test did not verify the actual saved
destination list, so it was removed. The two task-created destinations were removed through
the actual management UI. A normal cold restart then reauthenticated to the real owner with
the same saved selection; the earlier missing cache is not described as restored. Physical
deployment remains a separate acceptance gate.

## October 30 shared simulator retention

Use the existing shared compatible iPhone/iPad simulator pool for Proteus and Mnemosyne.
Inventory devices/runtimes before creating anything; do not make one device pool per project.
Retain only unique required compatibility coverage and retire unused test-created duplicates,
obsolete runtimes and build products during authorized release cleanup. Preserve active tests,
installed applications, pairings and data; do not erase shared devices as routine setup.
The [release process](release-process.md) limits local native artifact generations to two and
keeps the existing two verified recoveries per physical device/installation. No live simulator
or recovery cleanup is claimed merely from this policy update.

## October 29 — current-owner simulator acceptance

Both existing simulators run 0.2.36 / 2610.29.1, with exact app bytes and protected data verified
across in-place installation. Their previously selected entries were labelled Build Mac but
had host identities different from the actual running owner. Those entries remain; their prior
provenance is not established. A label alone is not evidence of a live-owner connection.

The explicitly authorized pairing bridge checks the current owner identity and online status,
uses its normal authenticated connection API, and permits only one invitation per intended
simulator. Credentials and invitations stay in memory. Both explicit pairing tests and separate
normal cold-start reconnect tests pass; saved selected identities match the actual owner. Both
apps were left running, and both new owner device entries were online in the final sample.
No physical authenticated reconnect, gesture or push acceptance is inferred from these results.

## October 28 — current simulators and live owner acceptance

The existing iPhone 17 Pro and iPad Pro 11-inch (M5), both iOS 26.5, received and launched 0.2.32 / 2610.28.1 in place. The normal simulator bundle remains `org.proteusapp.proteus.mobile`; no physical app, Apple account, certificate or provisioning profile changed.

Explicit opt-in `RemoteUITests/testLiveSimulatorOwnerConnection` passes on each against this running Mac, including the authenticated success receipt and Connected status. `testLiveSimulatorSavedOwnerReconnect` separately passes on each after a normal cold launch, using the same saved pairing and opening Manage computers to read status. The tests require `PROTEUS_LIVE_SIMULATOR_BRIDGE` pointing to an explicitly authorized loopback bridge; normal fixture runs skip them. The bridge uses the existing owner connection API, keeps authentication/invitations in memory and bounds issuance to one invitation per authorized device. No destination reset, chat send, source mutation on the owner, or permission-switch change occurs.

Native XCTest's bundle-targeted `app.open(URL)` is the supported deep-link route. The initial runner-process `UIApplication.open` attempt was refused as untrusted; its earlier awaited variant stalled on completion. Both failed attempts registered no device and remain private failure evidence. Final text diagnostics redact one-use links. Desktop background clicks did not establish guest input, and ordinary `simctl openurl` left an iOS confirmation pending; neither was counted as success.

After test teardown, the apps were normally relaunched and boot/process checks passed. Owner samples after teardown reported both clients offline, whereas the separate foreground cold-start UI checks passed; continuous simultaneous online status is not established. Prior non-secret destinations remain and the real local owner is selected. The earlier 153-unit and targeted project-switching acceptance remain separate release evidence; older full-UI fixture failures have not been reclassified as passes.

## October 27 — corrected physical native build accepted

The existing paid identity and explicit push-capable profile signed 0.2.31 / 2610.27.2, using a command-line build-number override and the established Xcode path. No global developer-directory, account, certificate, device registration or profile change occurred. Strict signing/profile/file checks passed before capture/install. After the operator unlocked both devices, iPhone and iPad updated in place and both processes launched. All 290 phone/260 tablet protected files match before launch; four saved destinations and selection remain on each device afterward. Physical gesture, reconnect authentication and push delivery remain separate tests. Exactly two verified full recovery generations remain each; compact receipts retain the retired oldest payload inventory and measured space change. This supersedes the earlier initial-iPhone/locked-iPad status immediately below.

## October 27 — physical iPhone 0.2.31 installed

The existing paid identity and explicit push-capable profile signed 0.2.31 / 2610.27.1 for both intended devices; expiry is October 26, 2027. Automatic selection initially chose the older wildcard profile, so a private build overlay selected the existing explicit profile. No account, certificate or device registration changed. The iPhone update is installed in place and launch-verified; all 290 protected files match before launch and all four saved destinations/selection remain. Exactly two verified full recovery generations remain after retiring the oldest eligible app/container payload, preserving compact receipts. Physical gestures, reconnect authentication and push delivery are not claimed. The iPad remains locked and unchanged; no new full capture started. See [the release evidence](2026-10-27-release-evidence.md).

## October 22 — separate Apple browser evaluation distribution

The private `org.proteusapp.review.proteus.desktop` candidate uses WTB team `TEAMID0000` and Developer ID
Application certificate `59LW4N2UBA`, SHA-1 `92A416F10956AA668EA46325C0F6B45C557856EA`.
The explicit App ID is registered. The hardened timestamped app passed notarization, stapling and
Gatekeeper; the final DMG also passed notarization, stapling, Gatekeeper and mounted browser acceptance. Existing installed app identities and
shared certificates are preserved. Use [the Apple request record](apple-browser-authorization-request.md)
for current distribution state and operator-submitted browser request **TGNRQJ22PP**.
The ignored local operator record has exact links, the last observed form and step-by-step commands;
credentials remain in Keychain and the protected WTB website project.

## October 20 — 0.2.26 physical update and native Mac launch gate

Paid iPhone and iPad are updated in place to **0.2.26 / 2610.19.1** with the same paid bundle,
certificate and provisioning profile. All 69 phone and 72 tablet protected files match their
verified recovery hashes before launch; both processes launch successfully. Native 135-unit and
targeted simulator UI acceptance are separate from unavailable automated physical gesture tests.
Each physical device retains two verified full recovery generations; only the oldest obsolete
data/app payloads were retired after both successors verified. No credentials or profiles reset.

The native Mac wrapper is also updated with its original identity/entitlements and its running
executable matches the new bundle. **Visible launch is pending:** macOS is awaiting its security
confirmation, and the operator explicitly chose to handle it later. Do not bypass the prompt,
diagnose a SwiftUI hang from this suspended process, or claim the native window is verified.

## October 19 — separate functional iPhone preview installed

`npm run ios:preview:phone -- --device SIMULATOR_UUID` prepares the selected phone layout using
Debug source, a separate `org.proteusapp.review.proteus.iphone-preview` bundle, temporary display-name plist and
the disposable mobile fixture. `--build-only` avoids fixture startup and installation. Only an
available iPhone simulator is eligible. Keep iPad and physical installations unchanged; this
preview does not perform Apple signing/account checks or alter shared certificates/profiles.
Read [phone design status](iphone-navigation-design.md) for native acceptance. Simulator builds,
signed installation, 740 runtime tests and static checks pass. Keep normal simulator ad-hoc signing
(`CODE_SIGN_IDENTITY=-`) enabled for Keychain pairing; it requires no Apple account or shared
certificate change. The unlocked retry uses the existing iPhone 17 Pro/iOS 26.5 simulator and
synthetic fixture. UI tests use a private project manifest with separate app/test-runner identities,
leaving existing simulator apps intact. The launcher opens Device Hub when this Xcode installation
has no separate Simulator app. No simulator/service reset, erasure or physical installation was
needed. No live-data backup is needed for this build/test-only preview. XcodeGen is unavailable;
the source has a matching explicit checked-in project reference.

## October 18 — paid iPhone/iPad signing installed and accepted

Use `ios/PaidAccount.xcconfig` for physical iPhone/iPad Release builds: bundle `org.proteusapp.review.proteus`,
paid team `TEAMID0000`, existing paid certificate `54BE22510FBADFF2AD71848A58E05257F6E176B3`.
Both devices now run 0.2.21 / 2610.18.2 with profile `a51d4e44-45e7-526f-8659-21d0c09bb398`,
expiring October 16, 2027 at 22:03:20 UTC. Data/credential transfer, production launch, restart
and saved destination checks passed on both. The iPhone's existing Build Mac pairing reconnected.
Future mobile updates target the paid identifier. On October 19, the operator requested removal
of Proteus Legacy from the iPad; that removal is verified, while its private recovery copy remains.
The original iPhone installation remains Proteus Legacy.
Keep the original native Mac and desktop identities unchanged. No shared certificate was revoked.
See [paid migration](native-paid-account.md) for the secure transfer workflow, exact exclusions,
physical acceptance limits and two-generation recovery evidence. Earlier Personal Team notes below
describe the predecessor installation, not the current paid phone/tablet build.

## October 18 — native projects accepted; native Mac, phone and iPad launched

The 0.2.21 / 2610.18.1 candidate passed the 124-case iPad unit suite and selected project/workspace
UI workflows on phone and tablet. The initial phone suite's one WebKit loading timeout passed
unchanged in isolation. Focused checks found and verified a fix for an offline Configuration read
triggered by initial workspace rendering. Source/resource hash verification and Release build passed.
See [native parity validation](../ios/PARITY-VALIDATION.md) for exact runs and limits.

Following fresh Mac unlock, normal provisioning renewed the Proteus target profile with existing
team `TEAMID0000` and certificate `0000000000000000000000000000000000000000`. New profile
`68ecddb2-8ec6-5ba6-9aa0-bbc4db954a2c` covers phone, tablet and native Mac; expiry is
**October 25, 2026 at 22:32:17 UTC (16:32:17 MDT)**. The old profile was preserved privately while
only its cached target copy was moved aside to trigger renewal. No other profiles/certificates or
team settings changed. Strict signature, unchanged entitlements and executable sections verified.

**Native Mac is installed and launch-verified**, including exact running executable hash. Only the
wrapper's LaunchServices registration needed refresh after the first launch attempt. Existing data
and Keychain were untouched; native container hashes remain unavailable under macOS privacy.
Two native rollback app generations remain. Physical iPhone and iPad now have 0.2.21 / 2610.18.1
installed in place after fresh unlock/activity checks. Phone retained all 1,675 accessible original
file contents (four OS snapshot path renames), then launched after the operator completed the
existing developer-trust step. Its saved destinations/selection match after launch. iPad retained
all 3,987 accessible file contents and paths; 13 existing OS snapshot-cache files were excluded.
After the operator confirmed iPad developer trust, launch/process and saved destinations/selection
passed at October 19, 02:21 UTC (October 18, 20:21 MDT), without reinstalling.

This update still uses Proteus's original Personal Team for installation and Keychain continuity;
the paid account is active, but Proteus has not undergone the separate team/distribution migration.
The profile expires October 25 at 16:32:17 MDT. No team, certificate, bundle-ID, pairing or Omi
change occurred. Partial backups resumed after bounded timeouts and verification used disposable
scratch space. Both devices now have two accepted recovery generations; the prior iPad in-flight
hold is closed. Phone retirement removed 228,943,245 logical bytes; measured free space increased
8,888,320 bytes during rotation. iPad retirement removed 450,792,679 logical bytes; measured free
space changed by -290,816 bytes amid concurrent work/APFS sharing. The separately authorized
paid-team migration is in progress and is not covered by this original-identity acceptance.

Native retention cleanup retired obsolete mirrors, partial attempts and build output after verifying
the retained recovery generations. Logical retirement was 1,400,703,405 bytes; observed free space
changed by -126,439,424 bytes amid concurrent system work/APFS sharing. Private receipts preserve
the precise inventory. Initial simulator launch stalls recovered using owned helpers and selected
simulator restarts without erasure; no shared-service restart, uninstall or signing reset occurred.

## October 16 — capture-app migration evidence

Operator chose a new paid capture-app bundle ID because the Personal Team prefix could
not be replaced. `org.proteusapp.review.mnemosyne.capture` 0.5.14 (25) is installed and launched
alongside the original on iPad; all 812 migrated durable files verified byte-identical.
Its development profiles expire October 16, 2027, 22:03:20 UTC. The new-bundle
TestFlight route is now verified on iPad; phone/Watch build 27 migration completed
with preserved originals, verified archive/delta copies, new live capture and iCloud
delivery. The original capture app remains installed and paused. This route is not a blanket authorization
to change Proteus identifiers; preserve its running apps and saved data. Shared paid
identity and device registration are ready, but Proteus profiles/builds remain unchanged.

## October 16 — paid team active; shared signing prepared

WTB Tech Services LLC membership is active (renewal October 16, 2027). Xcode is
signed in. Paid Team ID **TEAMID0000** differs from old Personal Team TEAMID0000.
The existing Mac Keychain now has Apple Development: Proteus Contributor (SIGNER0000),
SHA-1 `54BE22510FBADFF2AD71848A58E05257F6E176B3`, paid team TEAMID0000,
valid through October 16, 2027, 21:29:35 UTC. Old shared identities were preserved.
Use this paid identity for new paid-team builds; private keys stay on this Mac.
No certificate/private-key export to Proteus or receiving devices is needed.

The iPhone, iPad and Watch are registered under the paid team. The capture app successfully archived and uploaded to internal TestFlight using
its original bundle ID,
with paid development profiles expiring October 16, 2027. This proves the shared
account/signing workflow, **not** new Proteus profiles or a Proteus deployment.
Proteus still needs its own matching App ID/profiles for `org.proteusapp.proteus.mobile`.
Preserve the desktop identifier, signing settings and current release holds.

**Migration issue verified on the capture app's backed-up iPad:** directly installing
a paid-team development build over the old Personal Team build is rejected with
MismatchedApplicationIdentifierEntitlement. Same bundle ID alone does not preserve
upgrade eligibility across team prefixes. Do not uninstall Proteus or revoke its
old certificate to force migration. Validate a preservation-backed distribution
migration before replacing any running Proteus app; its installed seven-day profiles
are not extended by the new membership. TestFlight builds last 90 days.

Terms of Service PDF and acceptance record are saved in the private notes WTB Apple
Developer Program record. This section supersedes the activation-pending preflight
below. No Proteus build, install, app-data or project/signing mutation was made.

## October 16 — shared paid signing preparation, activation pending

Operator requested paid Apple Developer signing preparation for Proteus alongside the
separate pendant capture app. Operator confirms membership payment already made;
the authenticated Apple account still reports organization Pending and a purchase
prompt, with a processing notice of up to 48 hours. Do not pay again from this
presentation. Xcode's cached account showed Personal Team and requested sign-in;
browser sign-in completed, while the separate Xcode password prompt remains pending.
Paid-team ID/prefix, new profiles and distribution access remain unverified.

The designated signing Mac has the current development identity
`0000000000000000000000000000000000000000`, team `TEAMID0000`, valid until
October 2, 2027, 15:17:11 UTC. Freshly decoded capture-app/Watch/widget and Proteus
mobile cached profiles all reference it. The installed Proteus iPad-on-Mac profile
also references it and expires October 18, 2026, 16:38:12 MDT, matching the cached
mobile profile. This does not establish the profiles currently installed on the
physical phone/iPad. Seven-day profiles still need replacement after paid-team
activation; certificate lifetime alone does not extend installations.

Keep native `org.proteusapp.proteus.mobile` and desktop `org.proteusapp.proteus.desktop`.
Use the existing build Mac's Keychain; Proteus and receiving devices do not need
private-key exports. Each app needs its own profile even with a shared certificate.
Refresh the existing Xcode account after activation, compare paid Team ID/prefix
with existing installations, and preserve old identities if a separate paid team
needs a new identity. Never revoke/delete shared certificates as a repair. Another
build Mac would require its own authorized identity or a deliberately encrypted
Xcode identity export outside Git; no transfer is currently needed or performed.
Developer ID/notarization for the desktop remains a separate migration with
Keychain/signature continuity checks. TestFlight builds remain limited to 90 days;
paid development/ad hoc profile expiry must be measured on actual generated assets.

Preparation and documentation only: no build, install, signing/project change,
profile/certificate creation, key export, account removal or revocation. Capture-app
build/install is explicitly held until Operator chooses its new display name; Proteus
release holds and its running apps/data are unchanged.

**October 15 acceptance:** Native Mac and physical iPhone **0.2.20 /2610.14.3** are
installed/launch-verified with the existing certificate/profiles/entitlements. The Mac running
executable matches the tested release; native accessibility inspection remains unavailable and
its protected container was untouched. Phone retains all 1,675 accessible original file contents
and destinations (four OS snapshot paths renamed), with folder-by-folder temporary verification
instead of a full after-copy. 115 native units plus actual image-link target capture and phone/
tablet menu/open-adjacent UI passed. iPad stays staged because its fresh check reports locked.
Old accepted generations/duplicate after-copies retired under the two-generation rule; receipts
remain private. Physical gesture/authenticated workflow acceptance remains separate.

Current cross-platform acceptance is recorded in [PR #20](https://github.com/mdpope/Proteus/pull/20).
The dated/source-specific checkpoints below retain their original verification scope; later
workflow results supersede their pending/failure status without changing the recorded artifacts.

## October 15 checkpoint — source `b73c655`

All 626 local Node tests/static checks and hosted Linux/Mac desktop and web gates pass. Hosted
run [38693169853](https://github.com/mdpope/Proteus/actions/runs/38693169853) passes all 122 native
units; its 67 UI cases finish with 58 passes and nine failures on the correct phone/tablet
families. The follow-up corrects the diagnosed interactions and browser gesture ownership; a
complete rerun is required. Production signing and physical/live iPhone-to-Linux acceptance
remain separate.
Installed Linux `linux.fda4ae896542` retains its live-Codex acceptance; notes-only candidate
`linux.10e75103c337` has separate isolated UI/PTY/restart checks and is not installed. Production
Linux relay registration remains blocked pending private distinct-host provisioning.

## Complete phone and tablet UI validation

The hosted workflow runs every native unit and UI case on its required device family: all
123 unit tests, 62 phone UI tests across three isolated iPhone runners, and five tablet UI tests
on an actual iPad simulator. Inventory is read from the Swift source; helper checks require a
disjoint, exhaustive split and reject unavailable or mismatched simulator families. Tablet tests
assert their device requirement rather than silently returning on a phone.

For the same complete coverage on one Mac, run these commands sequentially because each helper
owns the synthetic fixture's loopback ports:

```sh
npm run ios:test -- --only ProteusTests
node test/apple-ui-shard.mjs --device-family phone --shard 1 --shards 1
node test/apple-ui-shard.mjs --device-family tablet --shard 1 --shards 1
```

`--list` prints a shard's selectors without launching Apple tools. `ios:doctor` lists the
available simulators. The lower-level full-project `ios:test` command still uses one selected
simulator; it cannot establish both phone and tablet UI acceptance in that invocation. These
commands use disposable hosts and simulator data and do not install onto physical devices or
change Apple accounts, provisioning profiles or production credentials.

**Historical initial 0.2.20 integration checkpoint (superseded by the status above):** The Linux branch imports the verified Mac source
companion from transfer `418a083`, including native link/selection menus and durable tab retry
identity/backoff. The checked-in project and reproducible definition both select **0.2.20 /
2610.14.3** and retain upstream bundle IDs/signing settings. Platform-neutral host metadata,
pairing defaults and compatibility tests remain merged. No Xcode compile/simulator result for
this integrated source is claimed. Hosted iOS job **116268129325** / run **38688298486** failed
before tests on its 0.2.19 checkpoint: Swift could not type-check `TeamBrowserView`'s chained
task expression in reasonable time. Upstream 0.2.20 retains the expression. The local correction
separates browser content from lifecycle modifiers and precomputes equivalent task identities;
it still requires hosted compilation and simulator tests. Signed/physical acceptance and actual
iPhone/iPad-to-Linux relay use remain separate. Earlier installation records below describe
their own revisions and do not imply this candidate was installed locally.

**Earlier October 14 platform-neutral native checkpoint:** Pairing defaults, host connection/provider/file
messages and optional authenticated Linux/macOS platform metadata are implemented in source.
Five added unit cases and a local mixed-host UI fixture preserve the existing destination index,
Keychain accounts, bundle/team/signing identity, caches, drafts and retry behavior. Static review
and plist checks passed on Linux; native compilation and simulator/UI execution have not run for
these changes. `.github/workflows/cross-platform.yml` adds an iPhone simulator job with the
disposable local host, alongside unsigned Mac desktop checks; hosted execution remains pending.
CI performs no production signing, Apple account checks or physical installation. A real
iPhone/iPad-to-Linux relay session remains unverified. Earlier native/device receipts below apply
to their recorded revisions, not this source candidate.


**Latest October 14 closure:** Native Mac, physical iPhone and iPad **0.2.19 / 2610.14.2**
are installed/launch-verified with existing signing identities/profiles/entitlements. The iPhone
retains all 1,933 file contents and destinations (four OS snapshot paths renamed); iPad retains
3,887 accessible file contents and destinations (12 unreadable OS cache files excluded). The Mac
running executable matches the tested build; protected-container hash/AX inspection is unavailable
and data was not edited. All 113 native units plus actual SPA-history and Workspace Tabs title UI
pass. Prior partial backups are preserved. Physical gesture/authenticated login acceptance remains
separate. Earlier staged/locked/pending checkpoints below are historical.

**October 14 latest installed follow-up:** Native Mac and physical iPad **0.2.19 / 2610.14.2**
are installed/launch-verified. Existing signing certificates/profiles/entitlements remain. The Mac
running executable matches the tested build; protected-container hash/AX inspection is unavailable,
and its data was not edited. The iPad retains all 3,887 accessible file bytes and saved destinations;
only 12 unreadable OS snapshot-cache files were excluded, with no other path changes. The iPhone
remains staged on 0.2.15 because it relocked during backup before replacement. Its partial copy is
preserved for review; fresh unlock and smaller-folder backup retry are pending. All 113 units and
two actual native history/title UI workflows passed before final Release signing.

**October 14 follow-up candidate:** Native **0.2.19 / 2610.14.2** preserves original and full
redirect/replacement URLs, selects existing tabs from Workspace Tabs titles and reveals selected
navigation. Scheduled conversation approval sends the exact current waiting request. All 113 unit
checks and the actual phone SPA-history and title/navigation UI workflows pass. Final signing and
installation remain pending; previous installed status below is historical. Native history no longer
rewrites login destinations. No real Microsoft authentication or physical gesture acceptance is
claimed by the synthetic checks.

**October 14 tab-management batch:** Native Mac **0.2.15 / 2610.14.1** is installed and
launch-verified with the existing certificate, profile and entitlements. Its running executable
matches the installed tested build; LaunchServices registration was refreshed after an initial
launch failure. Container/Keychain data was not edited, and native AX UI inspection was unavailable.
66 native unit checks and four actual simulator UI workflows passed, including WKDownload and
SPA history. Physical iPhone and iPad are now installed/launch-verified on the same build with
saved destinations retained. iPhone's 1,931 file contents matched (four OS snapshot paths renamed);
iPad's 3,565 accessible files matched, with only 12 unreadable OS snapshot-cache files excluded.
Complete durable preservation/verification receipts are private. Physical gestures/UI acceptance
remain separate from these version, launch and file checks. Desktop-owner0.2.16 is a separate
compatibility correction and does not require recompiling this native build;
see [the current release ledger](2026-10-13-tab-management-release.md).

**October 12 native parity rollout:** Both physical devices and Proteus iPad on the primary
computer now run **0.2.12 / 2610.12.3**. Physical installation was in place using the existing
per-device profiles and shared certificate. Each installed version, launch and continued process
was verified; seven protected files per device matched byte-for-byte before launch, and both
saved destinations plus their selection were retained afterward. Exact tested executable sections
and resources match. Foreground acceptance on the primary computer verifies HC chat connection,
website/link loading, Back/Forward, tab retention and history after unloading/reloading the web
view. Physical UI/gesture acceptance and signed-in cross-device recent history remain separate;
no physical input surface is available through current automation. Durable receipts are private.

**October 12 physical Workspaces rollout:** Both physical iPad and iPhone updated in place to
**0.2.12 / 2610.11.1**, retaining the existing certificate and each device's renewed profile.
All seven protected files per device were byte-identical before launch; installed versions,
independent running processes and retained saved destinations verified afterward. Durable backups
and receipts remain private. iPad profile expires October 18 at 16:24 MDT; iPhone profile expires
October 18 at 00:47 MDT. Initial iPhone connectivity was unavailable and USB enumeration absent;
it recovered after operator reconnection and retry. No uninstall, pairing reset or certificate
change was needed. Connection unavailability must not be treated as a signing failure.

**October 12 Workspaces release:** Proteus iPad **0.2.12 / 2610.11.1** is installed in place
and launch-verified on this Mac. Existing wrapper, certificate, entitlements and Mac-compatible
profile were retained; no shared certificate was replaced or revoked. A stale translocated launch
was corrected by refreshing LaunchServices registration, then the operator completed macOS's
verification prompt. Native Workspaces and existing tabs were visibly confirmed. The protected
container was not edited; direct container hash comparison was unavailable due to OS privacy.
Physical devices remain on their previously installed release. See the
[Workspaces release ledger](2026-10-11-workspaces-release.md).

**October 10 history follow-up:** Physical iPhone and iPad now have 0.2.11 / 2610.10.5, installed in place and launched at 19:42:57 and 19:43:04 UTC. Seven protected files each were byte-identical before launch; original signing/destinations retained. Four focused native unit tests, two phone history UI checks and the tablet bounded-renderer/history rehearsal passed. Older-row preparation begins 2.5 viewports ahead, with transport cache preparation six viewports ahead; initial rendering remains bounded. Development-profile expiry remains 17:29 MDT October 10; no renewal is claimed. See [follow-up ledger](2026-10-10-mobile-history.md).

# Apple build and simulator validation

**October 11 native iPad app on Mac:** The validated 0.2.11 / 2610.10.5 iPad artifact is
installed alongside desktop Proteus as **Proteus iPad** using the standard `Wrapper`/`WrappedBundle`
Mac layout. Xcode's Designed for iPad destination supplied a profile for this Apple silicon Mac;
it expires **October 18 at 16:38 MDT** and uses the existing certificate shared with Omi.
Executable sections, resources and entitlements remain identical to the validated mobile release.
The operator authorized first launch in macOS Security settings and confirmed the visible app;
native and desktop processes were independently observed running together. No desktop bundle,
phone/tablet installation or certificate was replaced. Pairing/account workflow acceptance is
separate. Private signing/install receipts remain outside Git.

**October 11 iPad signing recovery:** Proteus 0.2.11 / 2610.10.5 was re-signed with an
iPad-compatible profile and installed in place on the operator's iPad. Launch and independent
process inventory passed; all seven protected files were byte-identical before launch and the
destination index remained identical afterward. Executable sections, resources and entitlements
match the validated .5 release. This profile expires **October 18, 2026 at 16:24 MDT** and uses
the same existing certificate as Omi and the renewed iPhone installation. No certificate was
created, revoked or deleted; Omi and the iPhone installation were unchanged. Private preservation
copies and receipts remain outside Git. Live relay workflow acceptance is separate.

**October 11 iPhone signing recovery:** Proteus 0.2.11 / 2610.10.5 was re-signed and installed
in place, then launched and independently confirmed running. Seven protected files were
byte-identical before launch; the destination index remained identical after launch. Executable
sections, bundled resources and entitlements match the validated .5 artifact. The renewed Proteus
profile expires **October 18, 2026 at 00:47 MDT**. It uses the same existing valid certificate as
the recent Omi deployment; no certificate was created, revoked or deleted, and Omi was not changed.
iPad renewal was outside the initial iPhone request and is recorded above. Private backups and signing/install receipts remain outside
Git. This verifies installation and startup; live relay workflow acceptance is separate.

October 10 full release: [current installation ledger](2026-10-10-full-chat-release.md).
0.2.11 / 2610.10.2 is signed and ready with 69 passing unit tests and iPhone/iPad composer,
long-history and preview acceptance checks. Both physical devices are installed and launched;
a fresh device inventory confirms 0.2.11 / 2610.10.2 on each, with protected data and destinations
retained. The earlier partial 0.2.10 installations are historical receipts. The
development profile was reused, not renewed; it expires October 10 at 17:29 MDT.

This Mac is the designated Proteus iPhone/iPad build and installation machine. The native app
remains a remote client of the desktop host. Pendant Bluetooth capture and iCloud recording
retention remain in the separate Omi app; never uninstall that app as part of Proteus testing.

## Reproducible local commands

Use the checked-in `ios/Proteus.xcodeproj` and `Proteus` scheme. The helper never runs XcodeGen,
changes project/signing settings, revokes certificates, installs to a physical device, or changes
the global `xcode-select` setting. It honors `DEVELOPER_DIR`; when selected tools are the standalone
Command Line Tools, it uses `/Applications/Xcode.app/Contents/Developer` for this invocation.

```sh
node scripts/apple-build.mjs doctor
node scripts/apple-build.mjs build --device SIMULATOR_UUID
node scripts/apple-build.mjs test --device SIMULATOR_UUID
node scripts/apple-build.mjs test --device SIMULATOR_UUID --only ProteusUITests/RemoteUITests/testModelCapabilities
```

`doctor` reports installed Xcode and available iOS simulators. Omit `--device` to use the first
available iPhone simulator. Choose an iPad UUID explicitly for tablet validation. Repeat `--only` to select multiple test cases. Physical-device
identifiers are rejected by this helper. Build/test output, DerivedData, fixture logs and test
result bundles are saved in a fresh temporary directory printed by the command. Simulator signing
is left enabled for Keychain pairing support.

Keep UI test method names globally unique across test classes. Tablet-only workflows use the
`testTablet` or `testIPad` prefix so shard discovery assigns them to iPad hardware. The shared
question-answer helper has separate phone and uniquely prefixed tablet test entry points.

`test` requires ports 4328 and 4329 to be free, waits for simulator boot readiness, starts `test/mobile-host.mjs` with synthetic
workspace/data and a local Node relay, then stops that fixture on completion or interruption.
It never starts Docker or reads the real application home. Run devices sequentially because the
fixture offers one active pairing invitation at a time. An occupied port causes an error; the
helper never kills an existing process. Inspect the printed `fixture.log` and `xcodebuild.log`
when a run fails.

Optional npm mappings are `ios:doctor`, `ios:build` and `ios:test` to the matching helper action.
Use `npm run ios:test -- --device SIMULATOR_UUID` when those scripts are configured.

## Physical-device release

Apply the [two-generation retention policy](desktop-updates.md#two-generation-backup-retention)
per physical device/native installation. One verified pre-update snapshot is the recovery copy;
after-install/launch preservation should retain hash/coverage receipts rather than another full
container. Resume a partial copy after unlock and verify coverage, instead of creating new full
before/after trees for each lock/retry. Failed-attempt metadata can remain small; retain at most
two accepted full recovery generations and resolve any temporary in-flight exception promptly.

Verify that the **Mac is unlocked before checking Apple accounts or signing availability**.
If computer access reports a locked screen, ask the operator to unlock it and repeat the checks
after unlock. A locked Mac can produce misleading “No Accounts” or missing-profile errors;
those results do not establish that Xcode needs to be set up again. Inspect the existing account,
team and certificates in Xcode before treating a repeated error as a real configuration problem.
Keep Mac unlock and the iPhone/iPad's lock state as separate preflight checks. Do not create or
replace accounts/certificates, reset signing, or uninstall an app to resolve a locked-screen result.
If the command-line tools still report “No Accounts” after unlock, inspect the existing account
in Xcode and select the connected physical device before concluding that provisioning is missing.
An already signed-in Xcode session can renew the app's profile when the CLI cannot see the account.
Use a disposable signing project if a local team selection is needed, preserving repository signing
settings. Confirm the renewed profile covers the exact bundle ID/device and existing certificate
before re-signing. Preserve certificates/profiles used by other apps; never revoke a shared
certificate to repair Proteus.

Simulator verification proves compilation and the synthetic remote-client workflows. It does not
prove device installation, real provider execution, live Omi processing or production pairing.
For physical installation, open the existing Xcode project and select the Proteus scheme and
paired iPhone/iPad. Preserve the existing bundle identifier `org.proteusapp.proteus.mobile`, Apple
team and signing identity. Check signing availability and device trust first. Do not reset
certificates, recreate profiles, regenerate the project or uninstall an existing app to clear a
signing error. USB trust/pairing and Developer Mode may require a one-time device interaction.

Pair the installed Proteus app with the intended execution Mac using Proteus Remote access.
Apple development signing and Proteus encrypted host pairing are separate operations. Keep the
current Omi collector installed and its iCloud/bookmark/recordings intact throughout.

## Xcode compiler-probe pipe workaround

This Mac's Xcode 26.6 can stall before compilation when a clang metadata probe fills stderr
while the build service drains stdout sequentially. A sampled probe was blocked in `write()`,
while invoking the same Apple compiler directly completed successfully. For this observed issue:

```sh
PROTEUS_CLANG_PROBE_WORKAROUND=1 node scripts/apple-build.mjs build --device SIMULATOR_UUID
PROTEUS_CLANG_PROBE_WORKAROUND=1 node scripts/apple-build.mjs test --device SIMULATOR_UUID
```

The helper creates a temporary command-line `CC` wrapper in that run's output directory. Only the
`-v -E -dM /dev/null` metadata probe is buffered; it preserves both output byte streams and exit
status, closing stdout before delivering stderr. All compilation execs the original Apple clang
resolved through the selected Xcode. No Xcode installation or project setting is changed.

## Validation on 2026-10-03

- `doctor` reported Xcode 26.6 (17F113) and installed iOS 26.5 simulators.
- Proteus compiled successfully for iPhone 17 Pro and iPad Pro 13-inch (M5), using the optional
  compiler-probe workaround. Normal simulator signing remained enabled.
- iPhone: all four native unit tests passed, covering encrypted pairing/continuation, queueing,
  history and bundled Markdown safety/rendering. Five UI tests passed for pairing/reply, context
  favorites, tool expansion, MCP refresh and model capabilities. The remaining rich-conversation
  UI test initially exposed an inappropriate model-catalog request for the rehearsal provider;
  after the native guard was corrected, its unchanged assertion passed on a targeted rerun.
- iPad: model capabilities, expanded tool output and MCP refresh UI tests all passed.
- First test launch on each simulator stalled in CoreSimulator's launch bridge. Restarting only
  that selected simulator resolved startup. No simulator data was erased. The helper now waits
  for full boot readiness before starting its synthetic fixture.
- No checked-in Xcode project/signing settings changed. No physical device was installed or
  modified. All helper-owned synthetic mobile hosts/relays were stopped after testing.

If Xcode installs the app but never starts a test and reports a CoreSimulator launch bridge
error, stop that test and restart only its selected simulator (shutdown, then `simctl bootstatus
SIMULATOR_UUID -b`). A data-preserving restart resolved that local condition during this
validation. Do not erase the simulator, uninstall the Omi app or reset signing as a workaround.


### Physical preflight on this Mac

Read-only checks found an existing Proteus 0.1.0 (1) on both paired, developer-enabled
iPhone and iPad. Both were passcode-locked. A usable Apple Development certificate is
available, but the checked-in project has no selected development team and this Mac
has no installed profile for `org.proteusapp.proteus.mobile`. Existing profiles cover Omi
only and must not be repurposed. An in-place release needs the correct team selected
for that build and a matching Proteus profile; verify the existing app’s team continuity.
Keep identity hashes and device identifiers in private machine records. No physical
build/install, provisioning acquisition or certificate modification was performed here.


### Authorized iPhone update, October 3 at 17:31 MDT

After the operator unlocked the iPhone, a signed device build succeeded using the existing
certificate and a command-line team override. Automatic provisioning acquired a matching
Proteus profile; no certificate or checked-in signing setting changed. Deep/strict signature
verification passed and the extracted signer matched the existing valid identity before install.
Proteus 0.1.0 (1) was updated in place and launched at 17:33 MDT; independent process inventory
confirmed it running. The encrypted cache remained byte-identical through installation. No
uninstall occurred, and Omi, iPad, existing pairing and relay configuration are unchanged.
Remote reconnection was not newly verified. This development profile expires **October 10,
2026 at 17:29 MDT**; renew before expiry until paid distribution is configured. Deployment
receipts and preservation copies remain in the private temporary deployment directory.

### Authorized iPhone and iPad update, October 4

The multi-Mac destination build was installed **in place on both physical devices**. The generic
iOS build succeeded using the existing project and a command-line development-team override;
no Xcode project regeneration, certificate change, profile recreation or uninstall occurred.
Strict/deep signature validation and extracted-certificate fingerprint comparison matched the
existing Apple Development identity before installation. The existing development profile
expires **October 10, 2026 at 17:29 MDT** (23:29 UTC).

Before updating, the encrypted Proteus cache was copied privately from each device, with iPad
preferences also retained. A broad iPhone Library copy encountered an OS-protected launch
snapshot, so the app-owned Proteus cache was copied directly instead; a separate iPhone preferences
copy was unavailable. Both encrypted caches were **byte-identical immediately after installation
and before launch** (iPhone 661,492 bytes; iPad 197,284 bytes).

Both updated apps then launched successfully and were independently found in process inventory.
Each existing pairing migrated to a one-entry destination index with its existing selected host,
and a corresponding per-host encrypted cache appeared. The legacy cache was removed after
migration. Subsequent cache writes change ciphertext/size, so post-launch ciphertext equality is
not used as proof of semantic data equality. Keychain contents were not extracted. Synthetic
migration/isolation tests provide the detailed retained-history coverage; physical receipts verify
in-place cache preservation and the actual on-device migration layout.

The current host pairings and relay endpoints remain unchanged. A live command through the relay
was not dispatched as part of installation, and a production relay cutover is separate work.
Omi was not launched, uninstalled, updated or reconfigured. Private device identifiers, signing
fingerprints, cache preservation copies and install/launch receipts remain under the private
`/private/tmp/proteus-mobile-update-20261004` deployment directory, outside Git.

### Relay editor installed on both devices, October 4

A subsequent in-place update installed the native **Manage Macs → Edit relay** control on both
physical iPhone and iPad. Both were reachable and unlocked during preflight. A fresh generic iOS
build used the existing project, bundle identifier, team override and Apple Development identity;
deep/strict signature verification and exact certificate comparison passed before installation.
The unchanged development profile still expires October 10, 2026 at 17:29 MDT.

Each device's existing per-host encrypted cache and destination index was privately copied before
installation and was byte-identical after installation, before launch. iPad preferences were also
copied and byte-identical; a separate iPhone preferences copy was unavailable. Both launch commands
succeeded, and matching Proteus processes were independently confirmed. After launch, both indexes
still contained the same single destination, label and selected host; comparison used decoded JSON
because startup can rewrite JSON key order. The encrypted caches remained present.

No pairing keys were extracted, no app was uninstalled, and no relay endpoint was changed. The
operator can now edit the existing Mac's relay through the supported native UI after that host's
cutover, without re-pairing. Build Mac remains a separate Add Mac operation. Omi was untouched.
Private preservation files and signed-build/install/launch receipts are under
`/private/tmp/proteus-relay-editor-device-update-20261004`, outside Git.


### Native Life and usage build ready, October 4

The current universal build adds optional direct website Life, selected-Mac usage, authenticated
legacy host-name hydration and explicit initial Markdown measurement. App setup defaults Life off;
operator sign-in is a separate website account step. Seventeen focused iPhone tests, sixteen iPad
core tests, both Life/usage layouts, opt-in and final chat/rich-code regressions passed.

The existing signing identity, bundle identifier and both device families were verified in the
signed build. The unchanged development profile expires October 10, 2026 at 17:29 MDT. This build
has **not yet been installed on physical devices** at this checkpoint: both devices are locked,
and automatic approval review rejected installation pending unlock. Do not work around that hold.
The prior relay-editor app remains installed; both indices now preserve two independently paired
Macs after the authorized Build Mac addition. User-confirmed endpoint correction restored HC
connectivity. Resume in-place deployment only once unlocked, preserving caches/index/Keychain and
checking actual launch and destination names. Omi apps and recording data remain untouched.


### Native Life and usage installed on iPhone, October 4 at 17:26 UTC

After the operator unlocked the iPhone, the prepared signed release was installed in place using
the original signing identity and bundle ID. All three preserved app-data files were byte-identical
before first launch. Launch and an independent CoreDevice process inventory passed. A fresh
destination index retained the same two IDs and selection, with Work Mac and Build Mac
labels. The Build Mac host independently reported its iPhone peer online, verifying authenticated
reconnection. iPad installation remains deferred at the operator's request. This supersedes the
iPhone-only locked-device hold above; no iPad retry was made. Life account sign-in remains separate
and unverified on physical devices. See `release-validation.md` for the current acceptance record.


## Packaged Mac smoke test and Keychain isolation

Run `node test/packaged-mac.mjs` against the built Mac bundle (or pass its path).
The test checks bundle identity/artwork, signatures, preserved GitHub vendor binaries,
window launch and the existing read-only Copilot model-catalog check. It creates a fresh
`PROTEUS_HOME` and browser profile and passes Chromium's `--use-mock-keychain` only to
that disposable test process. A synthetic persistent cookie exercises the network storage
path; the test asserts its temporary paths and the switch before reporting success.

Electron itself uses this switch to prevent macOS test launches from blocking on Keychain
consent; its test change was backported in 44.4.0 and the bundled version is 44.5.1:
[upstream test change](https://releases.electronjs.org/pr/53790). A separate browser profile
alone does not isolate the OS-level `Proteus Safe Storage` item. Ad-hoc builds can therefore
prompt for that real item even while the older installed application continues running.

Only synthetic browser data may enter this mock profile. Do not copy a real profile, Life
session or encrypted pairing store into it. This check does **not** verify real Keychain
access, stored-session decryption or post-update credential continuity. Those require a
separate, guarded installed-app verification with the normal launch and signing identity.
The mock flag is absent from the production launcher and package configuration; production
Keychain protection and vendor signing are unchanged. Do not reset/delete Safe Storage or
broaden its access controls to make a package test pass.

Verified October 4, 2026 on Electron 44.5.1: a disposable copy of the current package,
re-signed ad hoc while the installed app stayed running, passed all package checks and
synthetic cookie flush/read without a Keychain handoff; the catalog returned 19 models.
This result uses mock storage and does not validate the Work Mac Keychain or installed update.

## Bounded hosted XCTest execution

CI opts into `PROTEUS_IOS_TEST_TIMEOUTS=1`: XCTest enables per-test timeouts with a 300-second
default and 600-second maximum. The UI step is capped at 45 minutes inside the 60-minute job,
leaving room for a bounded diagnostic upload on failure or cancellation. A stuck test remains
failed/unverified, never a pass; runner loss or forced termination can still prevent diagnostics.
Manual Apple commands retain their existing defaults unless the opt-in variable is set. Cleanup
terminates only the helper’s own spawned processes and escalates a stuck child after eight seconds.

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

# Apple build and simulator validation

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

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

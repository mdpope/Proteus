# Local Mac application

## October 14 shared packaging candidate

`scripts/package-mac.mjs` and `scripts/package-linux.mjs` now share `scripts/desktop-build.mjs`.
It checks exact source/copied runtime file sets and hashes, detects files added during packaging,
verifies the copied package input and compares complete final package metadata/provenance.
Only the copied PTY is rebuilt; source Node ABI and Copilot vendor bytes/signature requirements
remain protected. Bundle ID, executable name, signing defaults and existing Mac data locations
are unchanged. Hosted CI uses `PROTEUS_MAC_UNSIGNED=1` to stage an unsigned candidate without
Apple account/signing checks; that mode checks vendor bytes but not signatures. New Mac CI and
signed-package/live-host acceptance have not run for this source candidate. Linux package/UI
results do not establish Mac signing or credential continuity.

The Mac and iOS use the same artwork from
`ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png`. `desktop/icon.png` is its runtime
copy. The package script converts that artwork into all required ICNS sizes without changing the
design. The menu-bar icon remains a monochrome template so it follows macOS appearance.

```sh
npm ci
npm run package:mac
```

This creates `dist/Proteus-darwin-<architecture>/Proteus.app`, with display/executable name Proteus
and bundle ID `org.proteusapp.proteus.desktop`. Copy it into `/Applications` (or `~/Applications` for a per-user installation) and open it normally.
Quit the existing host before replacing/launching the bundle, and check for running or waiting
chats first. A local package is a snapshot of the source: rebuild/reinstall after app updates.
`npm run desktop` still runs directly from the repository with the matching Dock icon, but its
underlying development executable remains Electron. Finder launches include the standard Homebrew
binary directories, matching the repository launcher for tools such as Node and MCP commands.

The Proteus application defaults to ad-hoc signing. Set `PROTEUS_MAC_SIGN_IDENTITY` to an existing
Apple development identity when building on the designated Mac to retain a stable team-based
designated requirement across updates. Identity selection applies only to this package command;
no certificate, provisioning profile or Xcode signing setting is changed. Ad-hoc builds can
require renewed macOS file-access approval after code changes. The two GitHub Copilot runtime binaries keep their
verified GitHub Developer ID signatures. The default requires no Apple development certificate and neither mode changes signing on another Mac. It is not a notarized distributable release. Developer ID signing,
notarization, automatic updates and login-item installation remain in the backlog.

Run state remains in the same Proteus application-data directory. The package contains app code
and production dependencies, including the Copilot runtime, not user chats, credentials, or
browser profiles. The browser profile remains Electron-managed user data. Authentication and
Keychain behavior should be checked when changing bundle/signing identity.

Verify the result with `codesign --verify --deep --strict <path-to-Proteus.app>`, inspect its
`Contents/Info.plist`, and use `test/packaged-mac.mjs` for the disposable smoke test before using the operator's data.
It sets a temporary `PROTEUS_HOME`, browser profile and test-only mock Keychain switch. Separate
profiles alone do not isolate the macOS Safe Storage item. See `apple-build.md` for this boundary;
real credential continuity is checked separately after a guarded normal installation.

The packager checks both Copilot vendor signatures before and after packaging, and fails if either
binary changes. Do not re-sign these helpers: their designated requirements identify the caller
to macOS Keychain. `test/packaged-mac.mjs` verifies the vendor requirements and byte-for-byte
preservation in addition to the overall app signature.


The host completes provider/engine shutdown, ends event streams and closes remaining local HTTP
sockets before waiting for the listener to finish. An unfinished client request cannot retain the
runner lock indefinitely. Regression tests cover partial headers/body, idle keep-alive sockets,
connection/lock cleanup and starting a new host with the same disposable application directory.

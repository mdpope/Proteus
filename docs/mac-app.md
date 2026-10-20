# Local Mac application

## Queued native desktop control

BF-2026-10-19-22 in [planned updates](planned-updates.md) selects **Cua Driver primary, Peekaboo
backup on Mac** behind one host-owned desktop broker. Include the Linux development branch in
Cua integration/validation; gate Windows/Linux by actual capabilities and do not load Mac Peekaboo
or its separate community ports as a cross-platform fallback. Support app/window discovery,
accessibility, real image observations and input, including authorized Proteus UI testing. The
existing chat/provider remains the planner; browser Playwright/DevTools stay separate. Versions,
packaging, implementation and actual platform acceptance remain pending under the build hold.

Required guidance/inventory should describe when to use each tool and the default order. Use a
small desktop catalog/wrapper, start backends on demand and stop only unused Proteus-owned runtime
resources after idle cleanup. Switching requires a fresh backend-owned observation of the same
app/window, serialized control and verification of any uncertain earlier effects. Do not repeat a
possibly completed action or bypass denied permission through the other driver. Backend shutdown
does not erase schemas/images already in model history; verify provider-specific discovery/lifetime
behavior rather than promising universal tool unloading. Peekaboo suppresses its cursor overlay
during targeted background input; Cua overlay delivery also requires actual host validation.

Engine Room Desktop Control should show the primary/backup and explain backend readiness and actual OS permission/setup
requirements, with app/window scope, a harmless Test, active-target indication and Stop/revoke.
Capture/accessibility grants belong to the signed native host that performs the action, not
automatically to Proteus or a launching shell. Preserve task/chat permission boundaries, handle
user interference/stale windows and keep screenshots private. Verify real provider image transport
and exact signed runtime interaction before claiming capability. The BF-21 update verifier may
reuse the control/test boundary while retaining independent recovery if UI automation is unavailable.

## Queued supervised updates and automatic original-chat continuation

BF-2026-10-19-21 selects the independent helper-and-handoff approach for the next release. The
same updating chat must resume automatically after a healthy update restart **or compatible
rollback**, without Continue. Persist the handoff and delivery claims outside rollback-restored
state, verify the supported old build/adapter, preserve permissions and retry automatically on
temporary provider unavailability without repeating earlier actions or reinstalling a failed build.
See [desktop updates](desktop-updates.md). This is queued only; no updater or live restart yet.

## Queued multiwindow follow-up

BF-2026-10-19-11 in [planned updates](planned-updates.md) requests multiple Proteus windows,
Command+N for a window and Command+T for a tab in the focused window. Individual Close removes
that window's saved placement/restore entry. App Quit preserves all still-open windows so the
next launch restores their bounds, selected items and reading positions. Preserve one background
host/runner and existing resource identities/lifetimes; changed displays need accessible fallback
bounds. BF-12 supplies the direct new-tab page. This is queued only: current source uses one
primary window, hides it on Close and does not establish this multiwindow restoration behavior.

## Current application

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

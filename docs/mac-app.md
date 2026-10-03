# Local Mac application

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

The Proteus application is ad-hoc signed; the two GitHub Copilot runtime binaries keep their
verified GitHub Developer ID signatures. This requires no Apple development certificate and does not
change signing on another Mac. It is not a notarized distributable release. Developer ID signing,
notarization, automatic updates and login-item installation remain in the backlog.

Run state remains in the same Proteus application-data directory. The package contains app code
and production dependencies, including the Copilot runtime, not user chats, credentials, or
browser profiles. The browser profile remains Electron-managed user data. Authentication and
Keychain behavior should be checked when changing bundle/signing identity.

Verify the result with `codesign --verify --deep --strict <path-to-Proteus.app>`, inspect its
`Contents/Info.plist`, and launch with a temporary `PROTEUS_HOME` and `--user-data-dir` for a smoke
test before using the operator's data. `test/packaged-mac.mjs` performs that isolated smoke test.

The packager checks both Copilot vendor signatures before and after packaging, and fails if either
binary changes. Do not re-sign these helpers: their designated requirements identify the caller
to macOS Keychain. `test/packaged-mac.mjs` verifies the vendor requirements and byte-for-byte
preservation in addition to the overall app signature.

# Linux build of the current Mac source

The Linux branch starts from the exact accepted Mac 0.2.19 source companion on
`codex/signed-proteus-tabs-canonical-20261014`, transfer commit `82cd923`, rather than the old
`main` branch. The source archive's SHA-256 and all 877 file hashes were verified before import.
`linux-upstream-source.json` records the immutable source identity. The previous initial Linux
port is retained on `linux-initial-build`.

## Build and run

Requires Node.js 22.16+, npm, a graphical Linux session and a signed-in Codex executable on PATH
or selected with `PROTEUS_CODEX_PATH`. This laptop's npm bootstrap is under ignored `.runtime/bin`:

```sh
export PATH="$PWD/.runtime/bin:$PATH"
npm ci
npm run package:linux
./dist/Proteus-linux-x64/proteus
```

The independent Linux script builds the terminal renderer and rebuilds only the copied node-pty
module for Electron, leaving the source checkout's Node ABI intact. It produces a runnable
directory, a versioned `Proteus-0.2.19-linux-x64.tar.gz` archive, checksum and bundled
`build-source.json`. The latter fingerprints the Linux runtime/build inputs and names the
accepted Mac source; this is a Linux adaptation, not the signed Mac binary. macOS packaging,
vendor-signature checks, iOS files and the release's pinned dependencies are retained.

Select Codex and a model from its current catalog in New Chat. Other provider implementations
remain present; Linux authentication for those providers has not been accepted in this work.
The current workspace/tab/browser interface and terminal are included, along with the current
relay protocol. No operational schedule is used as a smoke test.

Linux data uses `$XDG_DATA_HOME/proteus`, falling back to `~/.local/share/proteus` for missing or
relative XDG_DATA_HOME. `PROTEUS_HOME` overrides it. Existing Mac storage is unchanged. Browser
profiles remain in Electron's user-data directory. Isolate both locations in tests using a
temporary PROTEUS_HOME and `--user-data-dir`. Do not copy Mac secrets/pairings into the laptop.

Closing the Linux window minimizes it so the host remains reachable without tray support.
`PROTEUS_CLOSE_TO_TRAY=1` opts into hiding. The color tray icon uses Linux activation; the File
menu includes explicit Quit / Ctrl+Q. macOS retains its existing hide/template-icon behavior.
The default Linux terminal uses the user's shell or bash; Mac still defaults to zsh. Sleep,
logout and shutdown stop the host; no daemon/startup integration is installed.

Protected desktop pairing and Life tokens still require Electron secure storage; plaintext
fallback remains rejected. The Life database's Keychain credential resolver is Mac-only and
has not been ported. No live Life account, other-provider authentication, physical iOS pairing,
ARM64, or broader distribution coverage is claimed.

## Validation and updates

```sh
npm test
npm run check
PROTEUS_TEST_EXECUTABLE="$PWD/dist/Proteus-linux-x64/proteus" node test/tab-followup-ui.mjs
PROTEUS_TEST_APP="$PWD/dist/Proteus-linux-x64/proteus" node test/terminals-ui.mjs
node test/linux-current.mjs dist/Proteus-linux-x64/proteus
```

The last test consumes real Codex allowance with synthetic prompts, temporary files and isolated
profiles. It covers the actual New Chat UI, shell/file approvals, native terminal input/output,
restart/session retention, cancellation/continuation, built-in encrypted relay pairing,
continuation while minimized, reconnect and revocation. It does not pair or alter a real phone.
The tab acceptance test exercises the current canonical placement/move/history/sidebar behavior.

Before replacing an existing local installation, follow `desktop-updates.md`: inspect active work,
back up app/data/browser state outside the repository, then launch and verify exact version/build
and continuity. Leave current Mac/iOS installations untouched. Shared changes still require Mac
regression/package acceptance before merging upstream.

# Mobile Mac destinations

Proteus on iPhone and iPad can keep multiple independent Mac pairings. The destination menu above
all host pages names the selected Mac and shows its current connection status. Add each Mac using
its own one-time link or QR code from Proteus **Remote access**; give it a recognizable label such
as **Build Mac** or **Work Mac**. The Macs may share `wss://relay.proteus.example`, while
retaining separate host IDs, device authorizations and encryption keys. The phone does not need
provider credentials.

**Manage Macs** offers selection, rename and independent forgetting. A saved Mac that is not
selected is not continuously polled; its row shows saved/offline status rather than claiming
current reachability. Renaming changes only this device's label. Forgetting removes that Mac's
local Keychain entry, encrypted history and drafts. It does not delete server records or revoke
another device. Revoke the phone from the relevant Mac to remove its server-side authorization.

## Isolation and switching

Each destination owns a fixed `RemoteStore` instance. Its WebSocket connection, session counters,
cursor, command continuations, provider catalog, chats, context, schedules and drafts never move
between host objects. Only the selected destination stays connected in the foreground. Switching
recreates host-bound navigation and sheets, disconnects the previous client and cancels its local
unconfirmed command retries. A late task still refers to the old client and cannot transmit to
the newly selected Mac. Work already accepted on the Mac continues there. When an action was
unconfirmed at the switch, inspect that Mac's refreshed history before retrying it.

New-chat drafts, schedule edit drafts (including their expected revision), and conversation reply text are saved with the owning Mac's encrypted cache.
They are not executed automatically after reconnect. The app never copies personal context into
a work host or vice versa. Life remains the shared website database; this feature introduces no
separate Life database and no Omi Bluetooth/recording collector.

## Storage and migration

The existing app's `paired-mac` Keychain item and `Proteus/cache.enc` are migrated in place on
first launch. The migration writes a host-scoped Keychain item and copies the encrypted cache,
then atomically saves the destination index before removing the legacy copies. An unsuccessful
migration preserves the original pairing. Do not uninstall the app to upgrade.

New Keychain accounts are `paired-mac:<host UUID>` under the existing app service, with
`WhenUnlockedThisDeviceOnly` accessibility. Each encrypted cache lives in
`Proteus/hosts/<host UUID>/cache.enc`, using that destination's key. The protected destination index
contains only labels, host IDs and the selected host ID. It contains no key, device credential,
chat text or draft. Re-pairing an existing Mac preserves its cached history/drafts and encrypts
them with the replacement key. Saved destinations share neither encryption keys nor cache files.

The existing Xcode project, bundle ID, team and signing configuration are unchanged. Simulator
testing uses synthetic host data. Physical installation and pairing with actual personal/work
Macs require separate validation; builds alone do not establish those connections.

## Validation

- iPhone 17 Pro simulator build passed on this Mac with Xcode 26.6 / iOS 26.5.
- Migration, cache/key isolation, host switching, repairing and native UI tests are recorded in
  `DestinationTests` and `testMacDestinationPickerRenameAndIndependentForget`.
- iPhone 17 Pro: all five destination tests and the existing encrypted round-trip/continuation
  test passed. Both native UI tests passed after correcting the picker placement: destination
  switch/rename/independent forget, and pairing/start-chat/reply.
- iPad Pro 13-inch (M5): all five destination tests and both UI tests passed. The two-host test
  pairs independent synthetic execution hosts through the same local relay, verifies their
  different workspaces/runs/drafts, and switches back without moving data or commands.
- Tests use `test/mobile-host.mjs` with disposable application homes and a local Node relay.
  No actual personal/work Mac pairing, production relay, physical-device installation or live
  data migration was performed by this validation.

Reproduce with `PROTEUS_CLANG_PROBE_WORKAROUND=1 node scripts/apple-build.mjs test`
and `--only ProteusTests/DestinationTests`,
`--only ProteusUITests/RemoteUITests/testMacDestinationPickerRenameAndIndependentForget`,
and `--only ProteusUITests/RemoteUITests/testPairStartAndReply`. Select an iPad simulator with
`--device` when validating the tablet layout.

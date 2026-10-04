# Mobile Mac destinations

Proteus on iPhone and iPad can keep multiple independent Mac pairings. The destination menu above
all host pages names the selected Mac and shows its current connection status. Add each Mac using
its own one-time link or QR code from Proteus **Remote access**; give it a recognizable label such
as **Build Mac** or **Work Mac**. The Macs may share `wss://relay.proteus.example`, while
retaining separate host IDs, device authorizations and encryption keys. The phone does not need
provider credentials.

**Manage Macs** offers selection, rename, **Edit relay**, and independent forgetting. A saved Mac that is not
selected is not continuously polled; its row shows saved/offline status rather than claiming
current reachability. Renaming changes only this device's label. Forgetting removes that Mac's
local Keychain entry, encrypted history and drafts. It does not delete server records or revoke
another device. Revoke the phone from the relevant Mac to remove its server-side authorization.

## Change a relay without pairing again

After moving a Mac to a different relay, open the destination menu on each iPhone/iPad,
choose **Manage Macs**, then **Edit relay** on that Mac's row. Enter the new relay origin
(for example `wss://relay.example.com`) and choose **Save**. Configure the Mac's remote host
first, retaining its existing host identity and device authorizations. No fresh invitation,
forgetting, reinstall, or device-key replacement is needed. To undo an unreachable address,
open the same editor and restore the previous address; cached history remains available.

Saving changes only that destination's relay field in its existing Keychain record. The host ID,
device ID, encryption key, label, cached history, cursor and drafts are retained. The selected Mac
reconnects when the app is active; editing another saved Mac leaves it offline until selected.
A failed validation or Keychain update leaves the previous endpoint and transport unchanged.
Changing transport cancels pending local retries: work already accepted by the Mac can continue,
so inspect its refreshed history before resubmitting an unconfirmed action.

External endpoints require `wss://`; `ws://` is allowed for loopback, private IPv4 and `.local`
hosts. Addresses cannot include credentials, a path, query, or fragment. Trailing `/` is removed.
The editor cannot change host identity or redirect a command to a different saved Mac. Its
end-to-end device authentication is unchanged. An unreachable relay stays a connection error,
not evidence that the pairing was lost.

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

### Endpoint editor validation

Focused destination tests cover origin validation, same-key credential persistence, unchanged
encrypted-cache contents after decryption, drafts/history/cursor retention, independent host
selection, cancellation of pending commands, and a live synthetic relay reconnect using the
same host/device/key. The native UI test edits an unselected Mac, rejects an external plaintext
endpoint, verifies the other Mac remains unchanged, restarts the app, and reads the saved address.
Physical endpoint changes remain a separate deployment/operator step.

October 4 endpoint-editor verification: iPhone 17 Pro and iPad Pro 13-inch (M5) simulators each
passed all eight destination tests and the edit/invalid-address/restart UI test. The iPad run
also includes strict rejection of nonnumeric private-IPv4 lookalikes. Screenshots were reviewed;
Xcode result bundles remain temporary local artifacts. No physical device endpoint was changed.

Physical deployment later on October 4 installed this editor in place on both iPhone and iPad.
Their existing encrypted caches and destination indexes matched byte-for-byte across installation
before launch; both apps launched and retained the same saved destination. Existing relay endpoints
were not changed and production reconnection is not claimed. On each device, use the destination
menu → **Manage Macs → Edit relay** on the existing Mac, enter the new relay origin, and **Save**
after the desktop host cutover. See `apple-build.md` for preservation/signing evidence and limits.

## Native usage and Life tabs

The native app now opens in dark appearance. **Macs** is always available; optional **Life**
is hidden by default. Enable **Show Life** in **App setup**, available from the Mac menu or
the unpaired screen. The preference belongs to this device, independent of its Mac destinations.
Macs scopes chats, schedules, context, cached drafts, and provider allowances to the selected
destination. Life signs directly into the website and works independently of whether either
Mac is awake; it does not use or duplicate a Mac's database credentials.

A connected Mac can hydrate the legacy exact placeholder **My Mac** from its authenticated
state's host name. This applies only to the selected, connected destination. Existing custom
names are never overwritten, including a name already hydrated once. A legacy Example Organization
pairing can therefore pick up **Work Mac** while the Build Mac pairing, keys,
history, and drafts remain independent.

The compact AI usage strip shows green percentage capsules for Copilot, Codex, and Claude.
Hide/collapse defaults come from the selected Mac's appearance settings. **Details** shows
reported windows, check/observation times, reset information, and unavailable/stale states.
Missing quota is never converted to zero; expired windows are not counted as current. The
percentage is the lowest reported finite remaining allowance, never inferred from transcript
token counts. The bridge allowlists quota fields instead of forwarding raw adapter metadata.

Additional October 4 validation:

- Nine destination tests cover legacy migration, isolation, endpoint-only reconnect,
  pending-command cancellation, and default-name hydration without changing custom names.
- Two usage tests cover absent, unlimited, expired, multiple-window and stale data. The usage
  meter/collapse/reset-details UI test passed on iPhone and iPad simulators.
- Five Life tests cover PKCE/callback validation, account/workspace mismatch, expected identity
  on mutations, expired/revoked credentials, concurrent refresh, late 401 responses, and logout
  during token rotation. They use isolated Keychain services and synthetic HTTPS responses.
- Nutrition period cards and native food-form submission passed on both simulator layouts.
  All records are synthetic. Actual consent and physical Life API use require the operator's
  normal system-browser sign-in after deployment.

See [Life](life.md#native-iphone-and-ipad-account) for account setup and security boundaries.

The additional opt-in UI regression verifies that App setup works before pairing, Life stays
hidden until enabled, sign-in becomes reachable, and hiding it removes the tab. The bundled
Markdown regression checks synthetic rendering and its trusted native height bridge. Native
chat rendering measures its first layout directly, keeping later resize updates for images.
The final iPhone conversation regression passed pairing/start/reply and rich Markdown/code
rendering after the initial-height correction. The universal device build was signed with the
existing team/profile; installation and physical sign-in are recorded separately by deployment.

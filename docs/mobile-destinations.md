## Nov 8 — pending-input routes and reading stability

Notification, notification-history and Needs attention actions use the exact paired owner and
question identity. Routing waits for that owner's authentication, then opens the chat's conversation
and pending answer/approval controls. Another connected computer cannot satisfy that route. Cached
chat/schedule reading remains available offline; schedule detail can be closed on standard iPhone.

Native chat gestures cancel saved-position commands through deceleration. Cancelled/completed
commands cannot replay from delayed view updates, and late history responses fill cache without
moving a newer reading position. Source/simulator evidence and deployment limits are recorded in
the [Nov 8 implementation](releases/2026-11-08/implementation.md).

## Nov 2 — New chat tabs

New chat opens a device-local main or workspace/project tab before creating a conversation.
Each tab retains its own prompt, model/source choices, attachment scope and placement. Cancel
closes that setup without starting a chat or stopping unrelated work. Submitted requests persist
their exact request identity and arguments for reconciliation after an uncertain response; retry
does not require already-uploaded attachment bytes to remain in memory. Closing/reopening navigation
does not authorize a different owner. iPhone/iPad simulator acceptance and physical-device acceptance
are recorded separately in the release ledger.

## Cold notification and restored browser priority — October 15

An incoming notification selects its paired host and requested chat or schedule, using the current
saved connection/cache rules. Restored main-browser metadata no longer activates a browser over
that target. Browser activation uses a fresh transient request only for an explicit selection or
open action; merely displaying/restoring a browser does not create one. Tab IDs, order, cached
history, device keys and owner access remain intact. The existing real-iPad cold-schedule UI case
and focused activation unit coverage cover this correction; hosted execution must confirm it.
Current acceptance is tracked in
[PR #20](https://github.com/mdpope/Proteus/pull/20).

# Mobile computer destinations

## October 14 portability candidate

Native source now supports neutral pairing labels and messages for Linux PCs and Macs. Optional
authenticated platform/architecture fields appear in saved-computer details; older hosts remain
usable without them. Mac Keychain sign-in guidance requires explicit `darwin` metadata. Five
new unit cases and a local mixed-host UI fixture cover metadata, index/default compatibility and
independent encrypted caches. These new native cases have not run here: Linux has no Xcode.
Hosted simulator execution and actual iPhone/iPad-to-Linux pairing remain pending. Existing app,
team/signing identity, version-1 destination index and legacy Keychain accounts are unchanged.
The earlier simulator/device receipts below do not validate this source candidate.

Proteus on iPhone and iPad can keep multiple independent computer pairings. The destination menu above
all host pages names the selected computer and shows its current connection status. Add each computer using
its own one-time link or QR code from Proteus **Connections**; the desktop supplies its configured computer name. Computers may share `wss://relay.example.com`, while
retaining separate host IDs, device authorizations and encryption keys. The phone does not need
provider credentials.

**Manage computers** offers selection, rename, **Edit relay**, and independent forgetting.
Foreground aggregate refresh can connect authorized destinations independently; cached/offline
rows do not establish current reachability. The next authenticated state refresh adopts the desktop’s current name; client labels do not
change host identity or authorization. Forgetting removes that computer's
local Keychain entry, encrypted history and drafts. It does not delete server records or revoke
another device. Revoke the phone from the relevant computer to remove its server-side authorization.

## Change a relay without pairing again

After moving a computer to a different relay, open the destination menu on each iPhone/iPad,
choose **Manage computers**, then **Edit relay** on that computer's row. Enter the new relay origin
(for example `wss://relay.example.com`) and choose **Save**. Configure that remote host
first, retaining its existing host identity and device authorizations. No fresh invitation,
forgetting, reinstall, or device-key replacement is needed. To undo an unreachable address,
open the same editor and restore the previous address; cached history remains available.

Saving changes only that destination's relay field in its existing Keychain record. The host ID,
device ID, encryption key, label, cached history, cursor and drafts are retained. The selected computer
reconnects when the app is active; editing another saved computer does not select it.
A failed validation or Keychain update leaves the previous endpoint and transport unchanged.
Changing transport cancels pending local retries: work already accepted by the host can continue,
so inspect its refreshed history before resubmitting an unconfirmed action.

External endpoints require `wss://`; `ws://` is allowed for loopback, private IPv4 and `.local`
hosts. Addresses cannot include credentials, a path, query, or fragment. Trailing `/` is removed.
The editor cannot change host identity or redirect a command to a different saved computer. Its
end-to-end device authentication is unchanged. An unreachable relay stays a connection error,
not evidence that the pairing was lost.

## Isolation and switching

Each destination owns a fixed `RemoteStore` instance. Its WebSocket connection, session counters,
cursor, command continuations, provider catalog, chats, context, schedules and drafts never move
between host objects. Foreground aggregate chat refresh can connect every authorized destination; each keeps its own
connection and state. Switching
recreates host-bound navigation and sheets, disconnects the previous client and cancels its local
unconfirmed command retries. A late task still refers to the old client and cannot transmit to
the newly selected computer. Work already accepted on the host continues there. When an action was
unconfirmed at the switch, inspect that computer's refreshed history before retrying it.

New-chat drafts, schedule edit drafts (including their expected revision), and conversation reply text are saved with the owning computer's encrypted cache.
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
chat text or draft. Re-pairing an existing computer preserves its cached history/drafts and encrypts
them with the replacement key. Saved destinations share neither encryption keys nor cache files.

The existing Xcode project, bundle ID, team and signing configuration are unchanged. Simulator
testing uses synthetic host data. Physical installation and pairing with actual Linux/Mac
hosts require separate validation; builds alone do not establish those connections.

## Historical validation

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

Every valid authenticated connection/state refresh adopts the host-owned advertised name for
the exact matching saved host ID. This also applies to a background destination connected for
aggregate chat refresh; it is independent of which destination is selected. A previous client
label can change, but destination IDs, keys, cached history, drafts and selection stay intact.
An unauthenticated, mismatched or stale replaced store cannot rename another destination.

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

### Current physical status — October 5, 05:22 UTC

Both iPhone and iPad received native source `1101c3c` in place, retaining the original signer,
team and provisioning profile. All 25 native inputs and six Markdown resources matched the
reviewed commit. Each device's four app-data files and preferences were byte-identical across
installation before launch; both saved destination IDs and selection survived launch, and
running processes were independently confirmed. Personal's subsequent API observed both mobile
clients online. This verifies the existing pairings, not new cross-Mac outgoing peer setup.

The focused ten-test destination suite covers authenticated host-owned label refresh on selected
and background connections, including unchanged identity/state and rejection of mismatched or
stale stores. Device-timezone chat tests cover summer/winter and a shared UTC setting that cannot
override the current device timezone. See `release-validation.md` for simulator results and the
physical receipts. Physical iPad shared-Team account consent is still unverified; installation
and relay connectivity alone do not establish website-account authorization.

## Shared tabs and compact chat controls (0.2.2)

For the same authorized destination, chat browser/document tabs and Team browser tabs reconcile
with host memory. Pending operations retain their scope and rebase on a fresh revision after an
offline conflict. Browser identities remain local, custom names persist, and selection and reading
position remain on the client. Revocation clears the affected host's views; document-grant denial
clears document content and denied pending operations. Sensitive browser addresses remain local.

The chat header keeps Back, title and menu in a compact 44-point touch area across conversation,
browser and document views. Reading collapses the composer to a single-line draft preview; touching
it restores the same draft and model controls. Accessible circular Stop works in either size.
Team has one row for Overview, Standup and browser tabs; Open standup belongs to Standup.
Closing a chat browser selects a sibling or the conversation in the same chat.

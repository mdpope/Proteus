# Remote clients

Proteus for iPhone/iPad controls the same Mac host as the desktop window. The Mac is the only
scheduler and provider execution host. The relay routes encrypted messages; it never runs agents,
receives provider credentials, or reads workspace files. Mobile clients do not need a Copilot login.

## Mac lifecycle

The menu bar icon opens Proteus, opens Remote Access, or explicitly quits the host. Closing the
window hides it, preserving the scheduler, browser profile, MCP connections and active sessions.
Dock activation brings the existing window back. Quit Proteus stops work gracefully and leaves
active runs interrupted/resumable. Launch the desktop app again after restarting the Mac.

This version does not install a login item or keep the Mac awake. A sleeping/offline Mac cannot run
work; the mobile app shows cached history and reconnects when foregrounded and the host is available.
The Electron user session must remain running for embedded browser functionality.

## Local setup

1. Run `npm ci` and `npm run desktop` on the execution Mac.
2. Open **Remote access**. For the simplest local connection, select **Built-in local relay** and
   **Enable access**. Refresh status after it connects. This runs exactly the same relay module
   used in the container. The local relay listens on the chosen port (4318 by default).
3. For a Docker relay instead, start Docker (or `colima start --profile proteus --cpu 2 --memory 2`),
   then run `PROTEUS_DOCKER_CONTEXT=colima-proteus npm run relay:local`. Omit the environment variable
   for the default Docker context. The script builds the image, publishes port 4318 on the Mac’s network interfaces, and configures the running host. `PROTEUS_RELAY_ADDRESS` selects a particular
   private IPv4 address. A changed DHCP address requires rerunning this setup and re-pairing devices.
4. The container's host token lives in the app data directory's `relay.env` (0600), outside Git.
   The setup script only replaces a container carrying Proteus's own management label. It verifies
   the chosen LAN address before connecting the host.
5. In **Remote access**, check that the device-facing address is reachable from the phone, then
   choose **Create pairing code**. Scan the QR code in the iOS app or copy/paste its pairing link.
   Each invite expires after five minutes and can pair one device. Create another for an iPad.
6. Allow local network access on the iPhone/iPad and incoming local connections on the Mac if
   macOS asks. Devices must be on a network that permits peer-to-peer connections. Guest Wi-Fi,
   VPN routing, or firewall rules can prevent connection.

The Docker relay persists no conversations or keys. It can restart independently; clients reconnect.
Disabling remote access disconnects the Mac from an external relay but does not stop its container.
Use `docker --context colima-proteus stop proteus-relay` to stop a local container, and
`colima stop --profile proteus` to stop the optional VM. No public router port-forwarding is needed
for local testing.

## Build/install from another Mac

The checked-in `ios/Proteus.xcodeproj` opens directly in Xcode. Its reproducible definition is
`ios/project.yml`; after source/target changes, regenerate it with `npm run ios:generate` (XcodeGen).
No Apple account, team ID, signing certificate, provisioning profile, or machine path is committed.

On the Mac you already use to install iOS apps:

1. Pull this private repository and open `ios/Proteus.xcodeproj`.
2. Select the **Proteus** scheme and your iPhone/iPad.
3. Under the **ProteusMobile** target's Signing & Capabilities, select your Apple development team;
   leave automatic signing enabled. The bundle identifier is `org.proteusapp.proteus.mobile`.
4. Build and run on the device. Use the pairing code from the **execution Mac**, regardless of
   which Mac installed the app. Both devices can use the same app/host simultaneously.

The project supports iOS/iPadOS 17+. SwiftUI adapts its sidebar navigation to phone and tablet.
Simulator builds do not require an Apple development account. Use normal Xcode simulator signing;
turning off code signing entirely prevents Keychain access and therefore prevents secure pairing.
The same Apple account/team can be used on multiple development Macs. Keep the same team and bundle
identifier for updates, and avoid revoking the other Mac's signing identities during setup.

## Implemented controls

- Paginated Proteus chat history, start/continue/cancel, live assistant text and tool activity.
- Pending questions, approve/deny, and the host's offered persistent approval choices. Chat details
  can change the active permission mode immediately, including releasing an already-waiting tool.
- Workspace/model selection, per-chat context and main agent, and idle-chat context refresh.
- Instructions, skills, agents, MCP catalog refresh and individual universal/workspace/available/
  disabled modes; add an existing Mac folder by its absolute path. MCPs are never auto-enabled.
- Schedule list, cron preview, app-owned schedule editing with revision checks, and run now.
  Repository-owned schedules remain read-only in the mobile editor: update their source manifest
  and reconcile on the Mac (including through a chat) to preserve ownership.
- Encrypted local history cache, reconnect, missed-event replay where available, then authoritative
  snapshot recovery. Old history is loaded on demand, rather than transmitting all sessions at once.

This is a foreground local-network prototype. APNs notifications, remote browser viewing/input,
artifact/file tabs, background auto-start at login, app-store packaging, multiple host switching,
and importing VS Code-owned chats are not part of this increment. Closing a phone app does not
stop work on the Mac. Offline drafts are not automatically executed later.

## Protocol and trust boundaries

Protocol v1 uses a WebSocket relay and a small command allowlist. The existing loopback HTTP API
retains its local bearer/cookie, Host and Origin checks; it is never exposed directly to the LAN.
Remote devices cannot call desktop IPC, the credential broker, arbitrary HTTP paths, or Electron CDP.
The Mac validates commands and applies exactly the existing workspace/provider permission rules.

Host registration requires the relay's random 256-bit token. Device routes use an opaque host ID;
browser-origin WebSocket upgrades are rejected. Connections have payload, rate, connection-count,
and slow-consumer limits. Each host connection can route only its own clients.

The QR/paste invite carries a random, short-lived 256-bit pairing key. The host issues a fresh
challenge per connection; AES-256-GCM authenticates the pairing exchange against that challenge.
A successful exchange consumes the invite and returns an independent device key, encrypted with
the invite key. The mobile app saves it in a device-only Keychain item; the Mac stores revocable
keys in `remote.json` with owner-only permissions. Treat pairing links as credentials.

Reconnections exchange a fresh host challenge and client nonce. Each encrypted frame authenticates
both nonces, direction, and a strictly increasing sequence number. Random 96-bit GCM nonces accompany
each ciphertext; the wire encoding is CryptoKit's standard nonce/ciphertext/tag combined format.
Cipher implementation is Node crypto / Apple CryptoKit. The relay sees routing IDs, message sizes,
and timing, but no decrypted messages. Local ws:// is limited to private/local addresses; internet
relays must use wss:// behind TLS. This application protocol has regression coverage, not an
independent security audit; production internet deployment should review it and add operational
monitoring, abuse controls, and TLS termination.

Commands have UUIDs and issue times. The Mac claims mutation IDs on disk before execution, remembers
results for 24 hours, rejects altered payloads/replays, and rejects new commands older than five
minutes. A crash during an uncertain mutation leaves a claim that cannot execute again automatically.
The mobile client retries the same command ID after connection loss, not a newly created command.
Provider execution is still serialized by the existing engine. Two devices cannot create parallel
turns in one session, and stale answers cannot approve a different pending request.

Event cursors include a host epoch. A bounded in-memory journal supports reconnect replay; a full
snapshot recovers after a journal gap or host restart. Durable conversation records remain the
source of truth. The encrypted mobile cache is excluded from backups and removed on Forget Mac.
Revoking a device blocks new commands and updates; previously downloaded content remains on that
device until it is erased. Revocation cannot undo an already authorized action.

## Validation

- `npm test` and `npm run check` cover persistence, context, permissions, protocol tampering,
  invite reuse, revocation, command deduplication, stale schedule edits and real-time delivery.
- `node test/remote-ui.mjs` tests menu bar presence, QR pairing controls, running with the window
  closed, Dock activation and revocation against synthetic data.
- `node test/ui-smoke.mjs` and `node test/workspace-ui.mjs` exercise existing desktop flows.
- Build `docker build -t proteus-relay:local relay`, then run
  `PROTEUS_TEST_CONTAINER=1 node test/mobile-host.mjs` in one terminal. It creates an isolated
  synthetic host and disposable relay container on ports 4328/4329. It never opens real app data.
- In another terminal, run `xcodebuild -project ios/Proteus.xcodeproj -scheme Proteus
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test` (use one command line).
  Repeat with an installed iPad simulator. Tests verify Node/CryptoKit interoperability, Keychain
  pairing, new chat, feedback, reconnect, continuation, and the actual native UI. Run device suites
  sequentially because the fixture intentionally offers one active invite at a time.

For first-time pairing of a physical iPhone/iPad with Xcode 26, plan on a USB connection and
Trust This Computer; later installs can use Wi-Fi. Pairing with another Mac does not remove the
existing laptop's trust. Newer Device Hub wireless-first pairing requires iOS/iPadOS 27 or later
and compatible Xcode. Proteus's QR pairing is separate from Xcode's device-installation pairing.

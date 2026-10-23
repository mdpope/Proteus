Current cross-platform acceptance is recorded in [PR #20](https://github.com/mdpope/Proteus/pull/20).
The dated/source-specific checkpoints below retain their original verification scope; later
workflow results supersede their pending/failure status without changing the recorded artifacts.

## October 22 — Connections spacing and wrapping

Connections retains its existing sections and actions with consistent card widths/gaps, bounded
reading lines, and grouped desktop actions. Long names, paths and permission explanations wrap
inside their cards; small windows stack sections and action rows. Isolated actual desktop checks
at measured 680/920/1560-pixel viewports cover containment, card gaps and grouped button spacing,
alongside unchanged pairing direction, failure recovery, draft preservation and polling cleanup.
No pairing, relay, credential or permission policy changes are part of this layout correction.

## October 22 — native pairing completion

The native destination adopts the pending connection after durable credential/index storage,
then completes authentication on that same transport. Only authenticated `ready` produces the
current-interaction success receipt. Add computer dismisses to Engine Room → Connections with
the saved computer and its current connection status visible. Reconnects do not repeat the
success receipt; real relay refusals remain visible and retain pairing keys/history.

QR scan completion first dismisses the camera, then starts pairing, avoiding nested sheet
dismissal races. The preview uses the camera-specific AVFoundation rotation coordinator and
stops observation/capture on dismissal. See [Apple's rotation coordinator](https://developer.apple.com/documentation/avfoundation/avcapturedevice/rotationcoordinator).
Phone/tablet pairing UI and destination-preservation regressions pass, alongside 979 Node tests
and static checks. Landscape camera pixels require physical-device checks; no physical update
is included in this source checkpoint.

## 0.2.20 receipt-capacity correction

At source `b73c655`, all 626 local Node tests/static checks and hosted Linux/Mac desktop and web
gates pass. Hosted run [38693169853](https://github.com/mdpope/Proteus/actions/runs/38693169853)
passes 122 native units; the 67 UI cases finish with 58 passes and nine failures on the correct
phone/tablet families. The diagnosed interaction and gesture corrections require full revalidation.
Installed Linux `linux.fda4ae896542` remains the live-Codex checkpoint; notes-only candidate
`linux.10e75103c337` passes separate isolated UI/PTY/restart checks and is not installed. Production
Linux relay registration remains blocked pending private distinct-host provisioning. Existing
website-to-Mac connectivity does not certify a production Linux route or an actual phone pairing.

Capacity refusal includes owner identity, record/byte/pending counters and retry delay. Tab
synchronization merges monotonic metadata, sends at most 100 metadata operations per batch,
retains an exact request envelope for uncertain transport retries, and backs off capacity errors
per host with at most one notice per minute. The 10,000-record/256 MiB defaults and protected
retry windows are unchanged. A full protected ledger can remain unavailable until settled
receipts naturally expire; this is reported separately from a successful build/install.

**Historical queue-only intake, October 14 — BF-2026-10-14-02:** Investigate and fix journal-capacity warnings during
background tab synchronization. Establish the affected owner/counter, reduce redundant mutations,
batch and back off retries, and name the owner in a deduplicated warning while preserving
idempotent replay and unresolved receipts. Current limits remain 10,000 receipts/256 MiB per
owner and 24-hour settled retention. See [next release queue](planned-updates.md). At that intake,
no journal behavior, limits, data or deployment had changed; the correction above supersedes it.

# Remote clients

## Linux and Mac hosts — October 14 source candidate

The owning computer can be a Linux PC or Mac. Provider authentication, workspaces, browser
sessions and execution stay on that host; mobile/website clients use its existing encrypted
protocol-1 boundary. Authenticated state may add `hostPlatform`, canonical `hostPlatformLabel`,
`hostArchitecture` and `host.platform.v1`, alongside the unchanged `hostName`. Missing/unknown
fields have neutral fallbacks. Descriptive metadata grants no capability and is not taken from
an invitation; legacy host/device IDs, keys, approvals, cursors and command retry receipts stay
unchanged. Pair each host separately and use distinct registration tokens on a shared relay.

Desktop-to-desktop pairing accepts private-network `ws://` origins, matching native validation;
internet relays require `wss://`. Website invitation policy remains its configured relay with
exact browser-origin checks. Local Docker setup forwards the explicit allowed-origin list; it
does not authorize every website origin. Existing Mac connectivity and synthetic two-host tests
are not evidence of an actual iPhone-to-Linux session. That live acceptance, native simulator
checks and signed Mac package acceptance remain pending for this candidate.

## Automatic local design previews — 0.2.11

The owning Mac discovers localhost HTML links in assistant messages and ordinary chat browser
tabs, including locally originated chats. `ChatPreviews` bundles static HTML/CSS/JavaScript
modules/images/fonts on that origin. `chat.previews.list/read` delivers a stable chat/URL identity
and SHA-256 version through existing encrypted relay and document-viewing grants. Agents need
no special packaging. Remote clients update one snapshot tab and never resolve host localhost
on their own device. New versions reset script consent; cold launches restore metadata and read
fresh contents without restoring interactive consent.

Discover eight previews per chat; bound each to 4 MiB, 64 dependencies and 1 MiB per fetched asset.
Exclude privileged app origins, API/auth paths, credential queries and protected profiles. Fetch
only dependencies on the selected design origin. Preserve offline cached snapshots with a label.
This supports static designs; host APIs, WebSockets and HMR are not forwarded. Native static HTML
uses a separate nonpersistent view with JavaScript disabled; interactive HTML uses an opaque
sandbox frame. Network, files and app actions stay blocked in each client.

Browser transports bound command bursts below the existing relay budget; website connects coalesce
requests for one destination. The [full release ledger](2026-10-10-full-chat-release.md) separates
implementation, verification and deployment.

Proteus for iPhone/iPad and the website can select among independently paired computers. Each computer is the only
scheduler and provider execution host. The relay routes encrypted messages; it never runs agents,
receives provider credentials, or reads workspace files. Mobile clients do not need a Copilot login.

## Desktop lifecycle

On Linux, closing the window minimizes it by default; explicit Quit stops the host.
`PROTEUS_CLOSE_TO_TRAY=1` opts into hiding. See [Linux setup](linux-app.md) for lifecycle and
packaging details. The following menu-bar/Dock behavior applies to macOS.

Directional Pause/Resume is queued in BF-2026-10-09-16. Pausing an outgoing peer will hide that host's
content on the pausing Mac and suppress outgoing recovery until resumed, preserving incoming access,
reverse connections and remote work. Current disconnect only suspends recovery in memory and does
not hide cached chats; do not describe it as the queued pause feature.

The menu bar icon opens Proteus, opens Remote Access, or explicitly quits the host. Closing the
window hides it, preserving the scheduler, browser profile, MCP connections and active sessions.
Dock activation brings the existing window back. Quit Proteus stops work gracefully and leaves
active runs interrupted/resumable. Launch the desktop app again after restarting the Mac.

Updating the execution host by quitting/replacing Proteus therefore interrupts its active turns;
the saved conversation/provider session can be continued explicitly after restart. Updating only
a remote viewer does not stop the owning Mac. Proteus launches its own Codex `app-server` child,
so an update to the separate Codex desktop UI need not stop that runtime. An uninterrupted
host self-update would require execution to outlive the UI process; the current runner is embedded.

This version does not install a login item or keep the Mac awake. A sleeping/offline Mac cannot run
work; the mobile app shows cached history and reconnects when foregrounded and the host is available.
The Electron user session must remain running for embedded browser functionality.

## Local setup

1. Run `npm ci` and `npm run desktop` on the execution Linux PC or Mac.
2. Open **Remote access**. For the simplest local connection, select **Built-in local relay** and
   **Enable access**. Refresh status after it connects. This runs exactly the same relay module
   used in the container. The local relay listens on the chosen port (4318 by default).
3. For a Docker relay instead, start Docker (or `colima start --profile proteus --cpu 2 --memory 2`),
   then run `PROTEUS_DOCKER_CONTEXT=colima-proteus npm run relay:local`. Omit the environment variable
   for the default Docker context. The script builds the image, publishes port 4318 on the computer’s network interfaces, and configures the running host. `PROTEUS_RELAY_ADDRESS` selects a particular
   private IPv4 address. After an address change, existing mobile pairings can use **Edit relay**
   with the new origin without replacing their host identity or keys.
4. The container's host token lives in the app data directory's `relay.env` (0600), outside Git.
   The setup script only replaces a container carrying Proteus's own management label. It verifies
   the chosen LAN address before connecting the host.
5. In **Remote access**, check that the device-facing address is reachable from the phone, then
   choose **Create pairing code**. Scan the QR code in the iOS app or copy/paste its pairing link.
   Each invite expires after five minutes and can pair one device. Create another for an iPad.
6. Allow local network access on the iPhone/iPad and incoming local connections on the host's
   firewall; approve macOS prompts on a Mac. Devices must be on a network that permits peer-to-peer connections. Guest Wi-Fi,
   VPN routing, or firewall rules can prevent connection.

The Docker relay persists no conversations or keys. It can restart independently; clients reconnect.
Disabling remote access disconnects the execution host from an external relay but does not stop its container.
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

Clients support local relays and shared internet relays over TLS. The destination picker keeps
credentials, caches and drafts separate for each Mac. See [mobile destinations](mobile-destinations.md)
and [web remote access](web-remote.md). APNs notifications, remote browser viewing/input, artifact/file
tabs, background auto-start at login, app-store packaging and importing VS Code-owned chats remain
outside this increment. Closing a phone app does not
stop work on the Mac. Offline drafts are not automatically executed later.

## Protocol and trust boundaries

Protocol v1 uses a WebSocket relay and a small command allowlist. The existing loopback HTTP API
retains its local bearer/cookie, Host and Origin checks; it is never exposed directly to the LAN.
Remote devices cannot call desktop IPC, the credential broker, arbitrary HTTP paths, or Electron CDP.
The Mac validates commands and applies exactly the existing workspace/provider permission rules.

Host registration requires a random 256-bit token. Shared relays can bind a distinct token to each
host UUID; a credential for one Mac cannot register another. Browser clients require an exact
configured HTTPS origin, and host registration never accepts a browser Origin. Connections have payload, rate, connection-count,
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

Commands have UUIDs and issue times. The Mac durably claims mutation IDs before execution in an
indexed SQLite journal, operated by a dedicated worker rather than Electron's main thread. Each
claim/result commits independently with SQLite FULL synchronous WAL durability. The host keeps
only active command promises (at most 32), rather than all saved results. Concurrent retries share
one execution; altered payloads fail. Existing results/errors remain available for at least 24 hours,
including retries whose issue times are now old; new IDs must be within five minutes in either
direction. A crash or failed result write leaves an unresolved claim that cannot execute again
automatically. Unresolved claims never expire automatically. Current device/grants are checked
before lookup and again after asynchronous lookup/execution so revocation also blocks saved results.
The mobile client retries the same command ID after connection loss, not a newly created command.
Provider execution is still serialized by the existing engine. Two devices cannot create parallel
turns in one session, and stale answers cannot approve a different pending request.

The default admission budgets are 10,000 receipts and 256 MiB of encoded receipt bytes. Only
completed receipts older than 24 hours are removed, with cleanup at most once a minute during
new claims. Capacity refuses new claims before effects instead of dropping protected results.
Already claimed commands may save large results beyond the byte budget; later new claims wait
for safely expired capacity. `RemoteHost.commandDiagnostics()` exposes bounded per-method command
counts, receipt/pending counts, encoded/disk bytes, committed claim/result write counts and logical
payload bytes written, budget state and worker operation timing, never
command arguments or result bodies. SQLite pages may remain allocated after retention cleanup;
physical bytes and logical receipt bytes are reported separately. The worker does JSON encoding,
SQLite updates and fsync; response projection/transport and active response bodies still use the host.

On first use, the worker imports `remote-commands.json` and its completion marker in one transaction,
preserving unknown receipt fields and the original JSON file byte-for-byte. Malformed legacy data
fails closed; an interrupted transaction can safely retry without a partial import. Migration streams one receipt at a time in the worker with a 64 KiB read buffer and a
4 MiB SQLite page cache; neither thread keeps a full legacy object or resident replay cache. New
receipts live solely in `remote-commands.sqlite` and its private WAL/SHM files. Do not roll back to a
JSON-only binary against this home: the old file lacks later claims and could repeat an effect.
Recovery must retain/reconcile the SQLite journal, or keep remote mutations disabled during rollback.
Worker failure disables further mutations in that host until restart; read-only commands remain
available. Graceful shutdown drains existing command tasks before closing the journal.

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

## Desktop-to-desktop destinations

A Proteus Mac can also be a client of separately paired Macs. In **Remote access → Other desktop
Macs**, paste a fresh one-time code generated on the destination. Its name comes from that desktop’s
**Connections → Mac name** setting and refreshes from authenticated host state.
This is a new device pairing; sharing a relay, an Apple account, or an existing website pairing
never grants access. Host registration and incoming paired devices remain separate settings.

Every **New chat** opens with **This Mac** selected, including after using a remote history tab or
restarting Proteus. Selecting another Mac connects to that destination, refreshes its context and
provider catalog, clears the previous selection, and keeps Start disabled until the catalog loads.
Workspace folders, source folders, instructions, skills, invocable agents and model capability
choices all come from that Mac. Start requires a model in the selected provider’s refreshed catalog;
reasoning/context/speed defaults apply only to the matching saved provider and model. Context
preview uses its existing preview command. The dialog displays the effective configured folders,
including universal folders and roots supplied by selected/default sources; turning off default
source loading does not remove universal folder access.
A failed/offline selection never falls back to local execution. Remote workspace profiles retain
the command folder configured on the host; this picker does not authorize arbitrary remote paths.

Run history has machine buttons with **This Mac first**, followed by paired destinations and their
online/offline/unread indicators. Remote rows are hidden while disconnected. Each Mac has separate
history, event cursor, selected run and in-memory drafts. Pending-answer drafts are scoped to
host, run and request ID, and are cleared after a successful answer; direct cross-host tab switches
cannot transfer either answers or followups. A remote conversation opens in a native
Proteus tab with its destination in the title and composer; followups, queue/steer, permission
approvals, user-input replies, cancel and earlier history use the same encrypted host commands as
other clients. Remote tab descriptors restore after restart; reconnecting reads the existing run
and never resubmits a prompt. Unsent remote drafts and downloaded conversation snapshots are not
persisted across application restarts. The sidebar’s AI allowance describes This Mac in three compact provider columns.

`src/services/remote/desktop-peers.js` owns the desktop client. `desktop-peers.enc` under the app data directory
contains only OS-encrypted pairing records with owner-only permissions and atomic replacement.
Electron safeStorage encryption must be available; there is no plaintext fallback. Native IPC
accepts only the trusted main app frame and explicit destination IDs, and exposes a bounded
command allowlist. Keys never enter renderer localStorage, workspace descriptors, logs or HTTP
endpoints. `src/services/remote/remote-client.js` is shared with the website's WebCrypto transport; the native
credential callback protects the independent device key before importing it for use in memory.
The host continues to enforce all workspace, pending-request and provider permission boundaries.
Mutation retries within a retained composer reuse their request ID after ambiguous failures.

**Forget here** erases this client's protected record and closes its connection. Revoke the device
on the destination to invalidate that key there. A live revocation clears its local session/drafts
and hides the conversation. Quitting the client closes only its connections; remote runs remain
owned by the destination and are not cancelled by closing a chat tab.

Validation: `node --test test/desktop-peers.test.js` exercises actual loopback hosts and encrypted
storage fixtures, no-plaintext fallback, corrupt-record preservation, host isolation, blocked
commands, reply, restart and revocation. `node test/desktop-peers-ui.mjs` launches an isolated
Electron home and two synthetic hosts for the complete pairing/catalog/chat/approval/history/
restart flow. These tests do not pair production Macs or invoke a real model. Production desktop
pairing is a separate operator step using a newly issued destination code.

## Shared chat and Team tabs (0.2.2)

The host advertises `content-tabs.v1` with authenticated `tabs.get` and `tabs.mutate`. Each request
names an authorized chat or the Team scope and each mutation includes the current revision.
Browser/document descriptors converge through open, close, rename and reorder operations, with
current document-grant filtering including mutation replays. Scope/revision notifications contain
no content. Visiting desktops reconcile the host's chat tabs; native clients also reconcile Team
browser tabs. Browser-only reorder preserves hidden document slots. Cookies, history, page state,
terminals, selection and document approval do not synchronize. See `src/services/workspaces/content-tabs.js`.

## Desktop connection notices and recovery

Requests to an unavailable saved peer start or join background recovery. A request rejected before
sending is not queued or replayed; actions must be retried after reconnection. Polling preserves
the current exponential retry delay. Manual Connect and network/wake recovery can retry sooner,
while explicit disconnect and authentication-required states stop automatic attempts.
Background tab synchronization retains its baseline and suppresses expected offline errors.
Transient notices have a Dismiss button and finite expiry; repeated identical errors neither
extend the expiry nor continually reopen a dismissed notice.

## October 8 queue and account-health parity

`chat.queue-edit.v1` exposes `chat.edit-queued` with message ID, expected text and replacement
text; host queue membership and steering-in-flight guards are authoritative. Local/remote
desktop, web and native expose Edit beside unprocessed queued messages. Text-only running
messages retain Steer now. Host-offered persistent permission choices are displayed alongside
Approve once, Deny and guarded chat-only approval. Web Accounts & Integrations uses
`integrations.health.v1` and encrypted `integrations.list/check/recover`; metadata remains
read-only and recovery never opens a browser. See `mcp-auth.md` for capability limitations.

The native compact composer gives model/effort/context controls their own horizontal row above
feedback, steering, queue and stop actions, so input-needed controls cannot overlap the model menu.

## October 8 source preview: live browser viewing

`browser.live.v1` advertises `browser.live.list`, `browser.live.frame` and
`browser.live.instruct`. Each paired device needs a separate host-owned browser viewing grant.
The host checks chat access and current loaded-tab membership, limits frames to 500 KB, keeps
one capture in flight per chat/tab, caches briefly and retains at most 40 references for 30
seconds. A device may submit only a frame it received; navigation and revoked grants invalidate
references. Captures contain only the selected chat's browser page, not the desktop or other apps.

Instructions reuse chat queue/steering/answer paths and bind point coordinates to the observed
frame. Permission choices remain separate guarded chat replies. Clients clear images on
disconnect, backgrounding or revoked access and check grants while a frame is frozen; a frozen
reference cannot remain actionable indefinitely. Unsent instructions survive tab switching.

Native source previews use the desktop green palette, matching icon meanings, collapsed chat
activity and explicit list navigation. Web chat uses the full workspace width, keeps Queue/Stop
on one line with desktop colors and hides Stop for queued/completed runs. Categorized recents
include seven search and schedule-associated chats. Tests are synthetic; this does not certify
real-device network performance or provider workflow completion. Synthetic Electron capture
checks also pass with the tab hidden and its window minimized; locked/asleep Macs remain unverified.

Web new-chat setup starts expanded and remembers an explicit collapse/expansion with each
Mac's draft. Host-state notifications and provider catalog changes retain that state and the
entered fields. The heading, destination label, spacing and Start chat action follow desktop.
Presentation state remains outside submitted values.

## Directional pause and document access

The October 9 desktop peer pause is local and directional. It suppresses outgoing connections and that host’s visible references while retaining pairing and drafts; it does not revoke the reverse connection. View chat documents permits direct current-root retrieval. Otherwise one-time exact-version requests remain in Needs attention after their banner dismisses.

### Self-contained design reviews

The October 9 [shared composer reviews](design/2026-10-09/shared-previews.md) use existing
encrypted `chat.documents` transport. Desktop/web CSS and scripts are inlined into one HTML
document; adaptive mobile HTML already contains its dependencies. The transport supplies raster
document assets but does not fetch stylesheet or JavaScript module dependencies from localhost.
Remote clients can enable interactive preview using their existing isolated HTML viewer. The
owning Mac must be connected for reads, and normal device document-access/version grants apply.
Refresh requests retrieve the latest document; changes are not pushed as a live server session.
Installed remote-device delivery of these artifacts remains unverified.

The relay forwards encrypted commands; its HTTP endpoint serves health checks rather than a
general HTTP proxy. Live Browser can share frames and send chat instructions, but does not provide
direct pointer/keyboard control of these design pages. Forwarding a live development server would
need a separate scoped host-side service and client support.

BF-2026-10-09-39 queues automatic host-side bundling and remote discovery/updates for chat-linked
localhost previews, including locally originated chats. See `planned-updates.md` for the acceptance
contract. Agent-authored packaging is not the intended product workflow; the standalone copies
above are an interim review artifact. This feature is not implemented, and further builds are on
hold during the remaining change/design review.


## Local desktop responsiveness diagnostics

The owning desktop provides authenticated `GET /api/performance/diagnostics` for bounded,
payload-free synchronous/async phase timings, event-loop delay and scheduler-worker status.
It is a local diagnostic route, not a remote command. Reports retain fixed source-owned labels
and timing values, never chat bodies, URLs, paths, arguments or error text. Current/previous
snapshots live in the application-data `diagnostics` directory and are written asynchronously.
A slow async phase includes network/worker waiting and is not evidence of main-thread blocking;
event-loop overlap is correlation, not proof of cause. See the
[scheduler and timing ledger](2026-10-12-scheduler-performance.md) for tests and rollout status.


Remote-state assembly shares a fresh scoped catalog only within a synchronous MCP health enumeration; it does not reuse old configuration between requests. Registry identity caches retain only bounded digests and preserve existing connection/recovery bindings. Long stalls are retained separately from frequent short delays in private diagnostics.

## October 18 — desktop peer project protocol

Desktop peers forward `projects.get/update`, `sources.get/update`, `chat.move`, `context.update`,
`workspace.delete` and `tabs.manage` through the existing authenticated owner connection. Project
scopes still require a project owned by that computer, current revisions and the existing resource
or document grants. Paused, revoked, unpaired or replaced sessions cannot bypass these checks.
The renderer negotiates `projects.v1` and `source-library.v1`; older owners keep their workspace UI.

The encrypted desktop chat index retains project IDs/names alongside workspace membership.
Authoritative project catalogs reconcile moves, renames and deletion redirects, including a move
between projects in the same workspace and an in-flight stale chat index. Membership changes do
not advance chat activity timestamps or alter archive state. A project-shaped `chat.move` result
uses the same source-metadata projection as project/source reads; source instruction bodies are
excluded. Legacy workspace-move responses retain their existing shape.

Disposable paired-owner tests cover revision conflicts, retry identity, host isolation, project
chat/tab routing, resource-grant denial, sanitized source catalogs, encrypted cache restart and
revocation. History tests verify opt-in selected-profile sharing and idempotent event import.
These tests do not establish installed cross-machine verification; that requires the accepted
signed release on both owners and an explicit check of their saved history-sharing settings.

## October 22 — bounded encrypted transport

The shared browser/desktop transport bounds outstanding request count, queued encrypted-byte
estimates and incoming work before parsing/decryption. It retains at most 128 outstanding actions,
16 MB of queued sends, and 128/16 MB of queued incoming packets. Individual wire packets retain
the existing 8 MB ceiling. Request arguments, issue time and retry ID are frozen when queued;
later UI edits cannot change an already-submitted action. Count/byte throttling stays below the
relay's budget, and disconnect cancels throttle waits and releases queued work. A queue-full
error is `REMOTE_BUSY` before transmission; an interrupted sent action still requires checking
the owner receipt/state before retrying. Congestion never deletes saved pairing or replays work.

Relay output checks include the **next** packet in the 8 MB socket-backlog ceiling. Ten-second
windows enforce 100 messages/32 MB per incoming client and 32 MB per outgoing client, with
4,096 messages/128 MB across each authenticated host connection. Outgoing client packets use the
host message ceiling because one command may produce several authenticated state events. A
client exceeding its budget closes with transient code 1013 while sibling clients remain
connected; host aggregate exhaustion closes that host transport for recovery. The relay remains
opaque to encrypted contents and never stores or trims browser/chat history to fit these limits.

Synthetic tests cover queue count/bytes, backlog boundaries, cancellable throttle waits,
immutable retry payloads, bidirectional budget accounting, isolated over-budget clients, normal
metadata bursts, pairing, reconnection and authenticated revocation. These bounds are implemented
in source; measurements on installed devices and deployment of the relay are separate acceptance.

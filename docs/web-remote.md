# Website remote workspaces

The authenticated `/remote` page connects the Proteus website to explicitly paired Macs through
the existing end-to-end encrypted relay protocol. Laravel serves the UI and verifies the website
session and stores account-owned destination credentials encrypted at rest. It has no remote-command endpoint and does not receive chat text, tool arguments,
workspace records, schedule prompts or approval answers. Existing Life pages, authentication,
nutrition tables and legacy APIs remain unchanged.

## User flow

1. Sign in to the website with its existing password plus authenticator, or passkey.
2. Enable the external relay on the intended Mac. Generate a fresh pairing invitation there.
3. Open **Engine Room → Connections → Manage and pair Macs** (`/remote?view=connections`)
   and paste the code. The invitation supplies the Mac name; authenticated host metadata refreshes
   it afterward. Any authorized host ID/name is supported; there are no fixed personal/work roles.
   Alternatively open `/remote#pair=<capsule>` while signed in. This opens Connections, and the fragment is immediately removed
   from browser history and is never part of an HTTP request. Invitations expire after five minutes
   and are single-use. Do not put an invitation in a URL query, access log or server-side API.
4. A successful new pairing saves the destination to the signed-in website account. Future strong
   sessions in another browser restore it without another invitation. Each Mac is paired separately;
   the account's browsers share that Mac device authorization. The destination label remains visible
   for chats, schedule actions and approvals.
5. Forget removes the account's saved destination. Revoke on the Mac removes that device's authority
   for all browsers using it. Signing out closes active connections and clears browser-held keys and
   UI state, but retains the account record for the next login. Removing a saved record or signing out
   cannot invalidate a key already copied elsewhere; host revocation is authoritative.

Older browser-only pairings used nonextractable keys and cannot be uploaded to the account. Each
legacy destination needs one fresh invitation to enter account storage; existing account records
win over legacy records for the same host. This is an explicit enrollment, not an automatic migration
of keys from another application or browser profile. Chats and Engine Room use the same account-first
destination lookup, with existing browser-only pairings as a local fallback only when no account
record exists. A failed account credential must not fall back to an older local authorization.
Browser-only keys stay nonextractable and are never uploaded by name or preference updates.

Choose the **Default Mac** explicitly in Engine Room. Its account preference stores only a host UUID,
which grants no access and can refer to an authorized native/browser-only pairing. A browser without
that host credential reports **not paired**, rather than offline. No default, connecting, connection
unavailable, rejected and revoked states are distinct. Saving a default reconnects immediately;
transient failures retry with a bounded backoff and expose Retry. There is no automatic host fallback.

This phase implements chat list/history, start/resume/follow-up, queue/steer, queued-message
removal, cancellation, pending questions and one-time permission approval/denial; live messages,
safe shared Markdown/code/table rendering, tool details and authorized workspace images;
schedule listing, revision-checked edits, timing preview and run-once; workspace/agent selection,
context preview and favorites. Repository-owned and local-process schedule definitions are not
editable through this page. They retain their source/Mac ownership. New schedule creation and
OS-level folder picking remain desktop responsibilities.

## Encryption and host isolation

`web/resources/js/remote-client.js` uses browser WebCrypto AES-256-GCM with the exact representation
and additional authenticated data used by `src/remote-crypto.js` and Apple CryptoKit:

- Combined ciphertext is a random 12-byte nonce, ciphertext, then 16-byte authentication tag.
- Pairing/authentication are tied to the host's fresh challenge. Both directions authenticate the
  challenge, client nonce, direction and strictly increasing message sequence.
- Existing host command UUIDs, issued-at checks and durable idempotency ledger remain authoritative.
  The browser never silently retries a mutation after a connection failure. Retrying an unchanged
  form uses its same UUID; editing it generates a new action. Review state after an uncertain reply.

Each destination has its own key and memory cache. Authorized hosts may remain connected for the
aggregate chat index; switching the selected host never renders another host's conversation there.
Disconnected conversation content is hidden. Bounded chat-index and draft caches are encrypted and
scoped to the account, host and device; drafts survive ordinary section navigation in session storage.
Cursors and decrypted conversation content remain local to the page; account storage holds only routing
metadata, a label, device identity, pairing date and encrypted device key. The account namespace is
an HMAC generated by Laravel, not an exposed numeric account identifier.

Multiple browsers may use the same account destination simultaneously. The relay allocates an
independent client ID for every socket; the host issues a fresh challenge and each client has its own
nonce and sequence counters. Durable mutation UUIDs remain scoped to the paired device, so retries
must reuse the original intent UUID while new actions use fresh UUIDs. Shared account credentials
do not mean shared chat cursors, drafts or command queues. Mac revocation terminates all sockets
using that device. Unauthenticated relay rejection packets must not delete saved account credentials.

The website server and its APP_KEY are now trusted custodians of Mac device credentials, in addition
to the browser and website JavaScript being trusted encryption endpoints. A compromised website
server or APP_KEY can recover the stored keys and impersonate the paired account device. The relay
remains blind to encrypted message contents. Keys are imported into browser memory as nonextractable
WebCrypto keys, but this does not protect against malicious same-origin JavaScript using them. Use
a trusted browser profile appropriate to the destination. Website login protects account access;
a fresh explicit pairing still authorizes each Mac. Deployment and initial enrollment must account
for this trust expansion. No host registration secrets belong in the website database.

The page has a strict self-only script CSP and websocket connections restricted to the configured
relay. It periodically verifies the strong website session and closes connections if verification
fails. Chat plaintext is never posted to that session endpoint. Logout retains account destinations
but clears browser key material and notifies other same-origin tabs to disconnect.

## Account destination API and storage

All `/remote/destinations` routes require an authenticated strong session, ordinary web CSRF
protection for writes, and `X-Proteus-Account` matching the HMAC from `/remote/session`. Missing or
mismatched account headers fail with 409 before any destination access, preventing a stale page from
reading or writing a different account after session cookies change. Responses are private/no-store.

- `GET /remote/destinations` lists only `{hostId, relay, label, deviceId, pairedAt}` in creation order.
- `GET /remote/destinations/{hostId}/credential` explicitly releases those fields plus the 64-hex key.
- `POST /remote/destinations` accepts those six fields and upserts the signed-in account's host record.
  It returns metadata only. UUIDs, labels, request size, exact configured relay and a 32-destination
  account limit are validated. Account-row locking serializes concurrent count checks and mutations.
- `PATCH /remote/destinations/{hostId}` accepts `{deviceId, label}` for a metadata-only name update.
  Account binding, CSRF and the current device ID are required; stale replacements fail with 409.
  The endpoint neither reads nor replaces the encrypted credential. Browser-only name updates use
  an atomic IndexedDB check of the current device/relay/pairing date, so a late update cannot
  resurrect a removed record or overwrite a new pairing.
- `DELETE /remote/destinations/{hostId}` requires the expected `deviceId`; stale replacement deletion
  fails with 409. It does not send a Mac revocation command.

The sole additive migration is
`web/database/migrations/2026_10_05_000002_create_remote_destinations_table.php`. The table uses a
unique account/host pair, encrypted Laravel cast for the credential, and a hidden model attribute
so ordinary serialization and listing never expose it. Decryption failures preserve the original
record. Validation errors do not flash credentials into the session or include submitted values.
Life API tokens grant no access to these session-only routes. Existing nutrition migrations and
tables are untouched. Preserve APP_KEY and its supported previous keys when deploying or restoring.

Rollback switches the application release while retaining this table and its migration record.
The migration's `down()` deliberately does not delete saved credentials; do not run a schema rollback
or migration reset as part of release rollback. Re-running `up()` against an existing table fails
closed instead of guessing that an unknown schema is compatible. Back up the database before the
one-time additive migration, and apply that exact new migration rather than unrelated pending ones.

## Relay configuration

The relay remains an independent supervised Node process/container. Use TLS termination at the
reverse proxy for `wss://relay.proteus.example`, forwarding websocket upgrade headers and the original
Origin. Restrict the upstream relay socket to the proxy's reachable private/loopback interface.
No database, website session key, chat cache or plaintext message history belongs in the relay.

Environment:

```text
PROTEUS_RELAY_ALLOWED_CLIENT_ORIGINS=https://proteus.example
PROTEUS_RELAY_HOST_TOKENS_FILE=/private/service/path/host-tokens.json
```

The token file is an owner-only regular file (0600), owned by the relay OS account. Its JSON maps
lowercase host UUIDs to **distinct**, independently generated 64-character hex registration tokens:

```json
{
  "51bbb865-1d22-5638-a23d-bbb54c17f431": "<first host 64-hex token>",
  "52c5c310-9ae4-5836-962e-bb5572c3085d": "<second host 64-hex token>"
}
```

These placeholders are intentionally invalid tokens. Provision actual values through the approved
private operations workflow, never in Git. Mount this file read-only when running a container;
match its owner UID to the container's `node` account. Restart the relay to reload a changed map.
Map mode rejects unknown host IDs and rejects using either host's token for the other destination.
It also rejects the legacy global token; there is no fallback that weakens the map.

Without a map, the previous `PROTEUS_RELAY_TOKEN` single-token mode still works for local/legacy
installations and existing tests. Browser access is denied unless an exact allowed origin is set.
Origins must be complete HTTPS origins without paths or wildcards; HTTP loopback is permitted only
for isolated development. Browser Origin is accepted only for the **client** role. Hosts remain
server-to-server and reject every Origin header, including allowed browser origins. Native clients
with no Origin retain the existing paired-device handshake. Relay routing also verifies that a
host's response is addressed to a client connected to that same host.

Website configuration:

```text
PROTEUS_BROWSER_RELAY_URL=wss://relay.proteus.example
```

This is already the application default. The page CSP allows only this relay and the pairing UI
rejects invitations for a different relay. No host registration token appears in website config.
Account destination persistence requires the single additive migration described above. Preserve APP_KEY, Passport keys, domain,
private evidence, cookies and all nutrition configuration when deploying the rebranded website.

## Build, validation and deployment boundary

Build from the full Proteus repository with its locked root dependencies and the locked `web/`
dependencies, then run `npm run build --prefix web`. The website imports Proteus's shared safe
Markdown renderer and styles from the parent source tree. Deploy the resulting `web/public/build`
manifest/assets with the Laravel release. The production server does not need the desktop runtime
or root source to serve already built assets.

Validation commands:

```text
node --test test/relay-browser.test.js test/web-remote.test.js test/remote.test.js
node test/web-remote-ui.mjs
```

The browser test boots a disposable SQLite-backed Laravel app, real password/MFA sign-in, two
isolated Proteus hosts and a local relay. It verifies fragment pairing, independent nonextractable
keys, isolated host rendering, remote chat/reply, real pending permission approval, revision-checked
schedule edits, context preview, no prompt text in website requests or relay frames, responsive
layout and browser-local logout key removal. Fixtures and servers are cleaned up; no real provider is invoked.
PHP `RemoteWorkspaceTest` verifies authentication, strong-auth gating, strict CSP, per-account
storage identity and the absence of a server-side remote-command endpoint. Existing remote tests
continue to verify native-client protocol compatibility. Tamper, AAD, replay, origin, cross-host
routing and token-map permission checks have dedicated coverage.

Run all Laravel tests only against isolated storage, an in-memory/disposable SQLite database,
new test APP_KEY and temporary Passport keys. Never run test migration resets, owner bootstrap or
key generation against the live site. Production provisioning and deployment are separate parent
operations and require their own backup, restore validation and smoke evidence. Passing these
local tests does not assert that either actual Mac or the public relay is deployed or paired.

## Shared shell and transport

The authenticated website uses a compact Proteus sidebar and the same dark color tokens as the
Mac (`public/proteus-theme.css`). Life cards, tables, forms and authentication stay ordinary Laravel
pages. The remembered section strip allows whole-tab activation and accessible close buttons;
Life remains pinned and garage/vehicle details belong to that section. Chats, Schedules and
Workspaces link to `/remote?view=chats|schedules|workspaces`. On the remote page these links switch
views in place so in-memory drafts survive; elsewhere they use normal full-page navigation.
Chats leads with the aggregate list and desktop-style Search, Mac, Provider, Status, Workspace,
Schedule and date filters. Cached rows show their last sync time. Older authorized history loads
in bounded pages. Open conversations appear in the main shell tab bar, keyed by host ID plus chat
ID, with accessible close controls. The toolbar's plus/chat-bubble control starts a new chat using
the explicit default, and the composer retains a Mac selector. There is no nested chat-tab strip
or secondary chat-list pane. Connection management is confined to Connections; schedule/workspace
views retain their destination selector. Conversation headings identify their destination.

Only allowlisted section keys and separate validated host/chat descriptors are stored under
account-scoped shell keys. Record titles, tokens and conversation content are not remembered by
the shell. Remote preferences contain a selected host UUID and explicit reconnect preference. Logout from any page clears both UI keys,
clears browser-held pairing keys through the shared logout handler while retaining account destinations, and signals other
tabs. Mobile layouts retain a visible account/sign-out control. `test/web-shell-ui.mjs` verifies
21 groups with two synthetic Laravel accounts, including account isolation, malicious storage,
Life pinning, keyboard/close behavior, responsive overflow and logout.

Authenticated pages show the explicitly selected Default Mac's provider allowance in the sidebar when that host's
feature flag permits it. Compact and expanded views retain percentage progress meters; collapsed
mode shows only the label. Native
`progress` elements comply with the strict stylesheet CSP without inline style attributes.
Disconnected pages hide allowances instead of presenting stale values as current. Pairing links
are consumed from the URL fragment before query-view normalization, including later hash changes;
the fragment is cleared without sending its token to Laravel and opens the dedicated Connections view.

The pure wire client now lives in `src/remote-client.js`; the website wrapper provides the account
credential adapter and reexports the same API. The older IndexedDB store remains a legacy adapter. The desktop peer client uses this
same transport with OS-encrypted native storage, without copying website keys or exposing them to
the desktop renderer. `test/web-remote-ui.mjs` verifies the integrated shell/remote experience in
27 groups, including initial and later fragment pairing, dynamic destination names, browser-only
defaults, missing/unpaired default states, reconnect, stale local-name races, host-scoped main chat
tabs and filters, permissions, usage collapse, feature flags, deep links, message playback and
disconnect/logout behavior. No production data is used.

Account destination backend validation uses `RemoteDestinationTest` against disposable SQLite and a
fresh test APP_KEY. It covers strong authentication, CSRF, stale account binding, cross-account
isolation, encrypted raw storage, explicit credential access, stable upserts, stale deletes, input
and count bounds, corrupt-ciphertext preservation, logout retention and non-destructive migration
rollback. This backend evidence does not by itself establish the final integrated browser flow or
production enrollment; those require the separate browser checks and authorized deployment.


The current connection/Chats/history update requires no schema migration. Its affected Laravel
API/page suites passed 22 tests and 288 assertions with isolated storage and disposable keys;
the adapter/allowance Node checks passed five tests. These are implementation and local regression
results, not production deployment or actual-Mac acceptance claims.

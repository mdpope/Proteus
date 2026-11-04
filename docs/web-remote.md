# Website remote workspaces

Nov 3 source uses a worker for established paired web transports, skips identical state
push rendering, preserves prepared composer retry envelopes, and guards tab snapshots
against late responses. See [web measurements and acceptance limits](releases/2026-11-03/web-performance.md).
Transport snapshots are read-only. Local overlays use copy-on-write, and the worker bridge
preserves unchanged subtree identities for incremental-state consumers.

The authenticated `/remote` page connects the Proteus website to explicitly paired Linux PCs and Macs through
the existing end-to-end encrypted relay protocol. Laravel serves the UI and verifies the website
session and stores account-owned destination credentials encrypted at rest. It has no remote-command endpoint and does not receive chat text, tool arguments,
workspace records, schedule prompts or approval answers. Existing Life pages, authentication,
nutrition tables and legacy APIs remain unchanged.

## October 14 host compatibility candidate

Connections, default destination, provider/file/approval messages and host descriptions now use
computer names. Authenticated state adds optional platform/architecture metadata; client labels
come from canonical platform values, never an invitation's claimed platform. Old hosts remain
compatible. UI wording is **Default computer**; the persisted `defaultMacId` preference, account
destination records, encryption format, host IDs, device keys and retry semantics stay unchanged.
No database migration, automatic re-pairing, credential copying or default-host fallback is added.

Each Linux/Mac host has its own relay registration and device pairing; use distinct host tokens
in the existing protected registration map. Website access still requires its exact configured
relay and allowed origin. Node/web checks and responsive synthetic UI passed; existing live
website-to-Mac connectivity does not establish Linux or physical-mobile acceptance. Hosted CI,
native simulator tests and a real iPhone-to-Linux relay workflow remain separate pending gates.

## User flow

1. Sign in to the website with its existing password plus authenticator, or passkey.
2. Enable the external relay on the intended computer. Generate a fresh pairing invitation there.
3. Open **Engine Room → Connections → Manage and pair computers** (`/remote?view=connections`)
   and paste the code. The invitation supplies the computer name; authenticated host metadata refreshes
   it afterward. Any authorized host ID/name is supported; there are no fixed personal/work roles.
   Alternatively open `/remote#pair=<capsule>` while signed in. This opens Connections, and the fragment is immediately removed
   from browser history and is never part of an HTTP request. Invitations expire after five minutes
   and are single-use. Do not put an invitation in a URL query, access log or server-side API.
4. A successful new pairing saves the destination to the signed-in website account. Future strong
   sessions in another browser restore it without another invitation. Each computer is paired separately;
   the account's browsers share that computer's device authorization. The destination label remains visible
   for chats, schedule actions and approvals.
5. Forget removes the account's saved destination. Revoke on the computer removes that device's authority
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

Choose the **Default computer** explicitly in Engine Room. Its account preference stores only a host UUID,
which grants no access and can refer to an authorized native/browser-only pairing. A browser without
that host credential reports **not paired**, rather than offline. No default, connecting, connection
unavailable, rejected and revoked states are distinct. Saving a default reconnects immediately;
transient failures retry with a bounded backoff and expose Retry. There is no automatic host fallback.

This phase implements chat list/history, start/resume/follow-up, queue/steer, queued-message
removal, cancellation, pending questions and one-time permission approval/denial; live messages,
safe shared Markdown/code/table rendering, tool details and authorized workspace images;
schedule listing, revision-checked edits, timing preview and run-once; workspace/agent selection,
context preview and favorites. Repository-owned and local-process schedule definitions are not
editable through this page. They retain their source/host ownership. New schedule creation and
OS-level folder picking remain desktop responsibilities.

## Encryption and host isolation

`web/resources/js/remote-client.js` uses browser WebCrypto AES-256-GCM with the exact representation
and additional authenticated data used by `src/services/remote/remote-crypto.js` and Apple CryptoKit:

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

The pure wire client now lives in `src/services/remote/remote-client.js`; the website wrapper provides the account
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

## October 6 connection and presentation corrections

Connections links prominently between pairing/managing Macs and choosing the account Default Mac.
The connected destination and default are separate; neither an offline host nor pairing switches
the default. Pairing reports safe relay/invitation/save/authentication stages, retains the pasted
invitation until authenticated, and provides stage-specific recovery without exposing close reasons.

Website typography and chat density follow desktop. Contiguous activity uses the accepted warm
group without a side accent; individual successful/failed items retain green/orange accents, safe
errors and text states. Structured tool counts, automatic approvals, failures and running counts
match desktop/native. Legacy plain output remains visible without an invented completed action.
Reduced motion stops group/spinner animation. Reviewed-failure and offline cache guards keep Needs
attention actionable. These source guarantees require separate live pairing and rollout evidence.

## October 6 evening interface correction

Home imports the desktop's shared renderer and stylesheet. Latest-release highlights expand to
show the remainder and older versions; the desktop adds its local-running instructions separately.
The website version and Default Mac's observed connection status live below AI Allowance.
Engine Room sections belong to the sidebar, with the current section highlighted; duplicate top
navigation is removed. Resources use totals, tab rows and a process table; notifications separate
preferences from history and keep row actions aligned. The Default Mac selector and save action
share a row at wide widths and stack with a gap on phones.

Chat details now include the authorized working folders and loaded context, token usage, provider
session, model history and schedule snapshot. Tool Details appears only for actual content.
Activity groups are green except for issues, with straight left accents. Tab overview dismisses
by backdrop, top close button or choosing a tab. Live index refresh keeps archived rows until the
replacement arrives and restores an open action menu against the updated row, avoiding flicker
and lost clicks. None of this represents new production deployment; the audit tracks acceptance.

## Workspace projects and source library — 0.2.21

The website uses the connected computer's `projects.v1` catalog and revision-checked
`projects.get` / `projects.update` operations. Workspace navigation exposes Projects, Chats,
Tabs and Configuration; project navigation exposes its scoped Chats and Tabs. The sidebar
keeps workspace/project groups, manual project order, independent expanders and paged recents.
Create, rename, default selection, reorder and reviewed deletion operate on the owning host.
Deleting a nondefault project redirects its chats and resource descriptors into the reviewed
default project while preserving execution configuration, history, drafts and approval state.
Project URLs restore the selected chat/resource, and old project links follow owner redirects.
Older connected hosts retain their existing workspace controls until upgraded.

Project-scoped tab operations use the existing host content-tab service. Workspace Tabs combines
direct and project descriptors without permitting aggregate reorder. Browser pages continue to
open in browser-managed windows using that browser's session. Terminal sessions and standalone
host documents remain owned by the computer; organizational controls do not replay commands or
create local executable sessions. Existing approved chat-document flows keep their source origin.

Engine Room → Source library selects an explicit paired computer, registers existing absolute
folder paths, reports scan results, rescans and removes registrations through `sources.get` /
`sources.update`. Registrations discover reusable sources without granting working-folder access
or enabling connections. Workspace Configuration shares the one-time folder Load in → Apply to
all controls, including filtered items. Chat details share the concise Ask, Saved permissions,
Auto-approve tools and Use workspace controls, read-only setting, folder exceptions and remembered
rule removal. Mutations retain context/chat revision checks and pending-request identity.

Projects, source catalogs, full history and execution remain on their host. No Laravel schema or
account migration is required. The existing encrypted bounded offline chat summary adds workspace/
project identity and accepted-user activity; it excludes execution context and full history.
Account pairing, encrypted draft storage and logout clearing retain their existing boundaries.

Local acceptance: the disposable `test/web-projects-ui.mjs` exercises project creation/default/
order, project chat routing, hidden browser identity across deletion, permission mode changes,
preserved history/configuration/drafts, source registration without grants and folder bulk loading.
The Laravel suite passes 81 tests / 724 assertions, encrypted cache tests pass, and Vite/Pint pass.
This is source/disposable-browser evidence; deployment and authenticated production verification
are recorded separately by the release operator.
The full disposable two-owner `test/web-remote-ui.mjs` regression also passed, including MFA,
pairing, chat history/drafts, remote permissions, workspace copies, attachment limits and consent,
concurrent browser sessions, encrypted transport, logout clearing, revocation and isolated previews.


## Desktop design parity (October 18 follow-up)

The website shell uses the accepted desktop sidebar colors, green selected treatment, typography,
spacing and feature icons. Workspaces contain manually ordered projects and typed chat/browser/
terminal/document recents, with two-line names, owner labels and relative activity age. The tree
remains available on Engine Room and other pages. Only the active feature's own panel expands.
Ordinary counts are plain text; Needs attention keeps its filled badge. Engine Room scrolls after
the workspace tree, while AI Allowance remains fixed below navigation.

Expansion is account/owner/workspace/project-specific, retained across navigation and reload.
Each list starts at seven items and More reveals four. Collapsing a workspace resets both its own
paging and its project paging; switching features resets paging while keeping expansion. Collapse
all is inside the Workspaces control. Sidebar width is retained per account with pointer and
keyboard resize; collapsed and narrow layouts use an overlay without moving the content. Older
hosts explain the projects upgrade requirement, and offline owners label their last-known catalog.
Inventory reads never open tabs or advance their activity timestamps.

Workspace fixed tabs are Projects, Chats, Tabs and Configuration, with the same folder,
double-bubble, four-box and gear icons; project views have Chats and Tabs. Fixed tabs remain on
the left and cannot close. The redundant workspace-name tab is removed for projects-capable
owners; independently opened content retains its icons and close control. Engine Room cards,
source rows and configuration use desktop sizing, including wrapping long paths on narrow screens.

Disposable browser acceptance includes `test/web-design-parity.mjs` through the actual Laravel
project workflow, plus `test/web-workspace-tree-ui.mjs` for colliding IDs on two owners, manual
order, nested paging resets, cross-feature/reload retention and old/offline explanations. Screenshots
are private test artifacts. Native browser embedding, terminal rendering and standalone host-file
viewing retain the web limitations described above; matching their navigation does not imply a
local executable session or additional document permission.

The conversation page also uses a large title, provider/ID and date/model metadata above separate
transcript and details cards. Project chats show a workspace/project breadcrumb that returns to
the project list. Permission Help/Add are secondary controls. The adaptive composer keeps its
model selectors and send controls fully inside the visible card; desktop/mobile viewport and
scroll-anchor regressions cover this layout independently of provider execution.


Production acceptance for the desktop-design parity follow-up completed on October 18 with release
`20261018T174132Z`. All 9,214 deployed file hashes, eight served assets plus the manifest, 14
endpoints, central recovery and ordinary isolated restore passed; bounded log classification found
only expected protected-file denials and known database column-statistics events. The existing
signed-in session verified both owners in Engine Room, fixed workspace tabs, existing chat history,
the large heading and separate permission/details cards, visible composer controls, project
expansion, and sidebar keyboard resize/collapse/reload persistence. No permission or chat-content
mutation was performed. Live screenshots and recovery/access details remain in the private
website deployment workspace. Native browser/terminal/document limitations are unchanged.

The project header explicitly left-aligns its folder and name instead of inheriting centered
button content. Its count and expander remain at the right edge. The production-CSS tree
regression checks sidebar widths 190, 230, 260 and 460 pixels plus the compact overlay; the
project workflow also passes. The combined alignment/grouping release is deployed; live acceptance is recorded separately.

The account Default computer’s workspaces appear first without repeated inline computer labels.
A divided, expandable Other Computers group places each remaining computer name above its
workspace/project tree. Opening another owner’s chat does not reorder these groups. The browser
does not infer physical local identity; without a Default, all known owners use named computer
groups. The group’s expanded state is retained per account independently of each owner’s
workspace/project state, including across Engine Room navigation and reload.

Production release `20261018T184327Z` passes signed-in grouping and routing acceptance: the
Default owner stays first and supplies allowance while another computer’s project opens correctly;
Other Computers expands/collapses and project headings align left. Deployment hashes, served
assets, endpoints, central recovery and ordinary restore pass. Bounded log review is accepted
with one informational systemd event classified by metadata only; private message text was not
printed or semantically classified. No additional source or deployment change was needed.

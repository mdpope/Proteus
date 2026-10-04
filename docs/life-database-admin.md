# Life database administration and historical validation

This document preserves the original database adapters, setup tooling and validation record.
**The desktop application no longer opens these profiles or exposes these setup controls.**
Current client behavior is in [Life](life.md). `src/life-admin.js` is explicit administrator/test
code; production schema upgrades belong to the website deployment workflow. Existing private
profiles and credentials are retained for recovery, without automatic connections or migrations.

# Life: native personal records

Life is an optional Proteus feature. It is off by default and absent from the main navigation
until enabled and configured in Setup. Corporate installations need not configure personal data.
The native Proteus interface queries a database through the authenticated desktop service; it
neither embeds nor navigates to the website. Existing browser-origin settings are intentionally
ignored during the transition and do not enable a database connection.

## Included native workflows

- Nutrition days, individual entries, complete-day averages and monthly averages; personal food
  library and immutable nutrient version history; meal additions, corrections and soft deletion.
  Breakfast, lunch and dinner are required for a complete day; snacks contribute to its totals.
  Food edits create a version and never rewrite old meal references. Retrying a deleted meal's
  original request does not recreate it.
- Garage vehicles, maintenance tasks and explicit completion, service/purchase history, odometer
  captures, and oil samples progressing from awaiting mailing through submitted to reported.
  Completing a task does not invent a service record; a receipt remains a purchase. Oil results
  retain text values such as `<1`, laboratory comparisons and audit history.
- Fuel review and acceptance, partial/missed fills, full-to-full weighted economy, original fill
  history, odometer observations, and monthly/yearly mileage estimates interpolated from exact
  dated observations. Estimates are not claimed as precise recorded monthly mileage.
- Capture inbox, structured review, explicit acceptance and original evidence attachments.
  Evidence remains private, supports the original image/PDF/email/text MIME allowlist, is capped
  at 20 MB and 12 originals per capture, deduplicates by SHA-256 and verifies that digest on read.
- Account/role, passkey and authenticator status, scoped audit history and OAuth connection
  inventory. Owners can revoke their access token and its refresh tokens. Credential enrollment,
  invitation delivery, passkey ceremonies and the hosted OAuth/MCP endpoints remain in the
  imported Laravel application; the desktop does not pretend to issue website login credentials.

## Local install wizard and upgrades

Setup offers a new local database or an existing private connection profile. A new local plan
collects the owner's name/email and workspace name, then shows the versioned migration plan.
Nothing is created until explicit Apply. The new SQLite database is installed transactionally,
with Laravel-compatible tables and migration history and one device-local owner/workspace.
Website passwords, Passport keys, emails and live credentials are not provisioned. Proteus's
host/device authorization protects this local installation.

`src/life-schema.json` is schema only, generated from a disposable database running the original
13 Laravel migrations at upstream commit `af7d28abfb9f6004931523c83c109b7e1035d287`.
It contains no source database rows. Native schema version 2 adds only `proteus_life_schema` and
`proteus_life_mutations`, with a checksum and per-user/workspace retry ledger. It changes no
Laravel migration identifier or nutrition table. Unknown, incomplete or newer schemas fail closed.

An existing SQLite upgrade uses a reviewed, expiring plan, profile/settings revision checks and
an ordered nutrition-data SHA-256 fingerprint. Apply creates an owner-only backup, verifies its
SQLite integrity, starts a transaction, applies additive/idempotent migrations and compares the
nutrition fingerprint before committing. Any stale nutrition state stops Apply for fresh review.
No reset, fresh-migrate, import or seeder runs. A read-only connection can open the existing
compatible schema without applying version 2; all record mutations remain unavailable.

New versions must add a distinct migration/checksum, never edit an already shipped migration.
Ship the migration files with the desktop source/resources. App packages require Node 22.16+
(or an Electron runtime providing `node:sqlite` and its backup API).

## Existing database profiles

Connection profiles are owner-only files (0600, owned by the current OS account). Setup accepts
only their absolute paths through a desktop-local endpoint. Database host/name/path, principal
IDs, SSH alias, credential reference and TLS material are never included in public state.
`life.json` stores the enabled flag and private profile path, also with owner-only permissions.
Reading disabled state does not open a database or start a tunnel.

Example **synthetic** existing SQLite profile:

```json
{
  "driver": "sqlite",
  "label": "Personal records",
  "database": "/private/absolute/path/records.sqlite",
  "storageRoot": "/private/absolute/path/storage/app/private",
  "userId": 1,
  "workspaceId": 1,
  "readOnly": true
}
```

Example **synthetic** MariaDB profile (password is never stored here):

```json
{
  "driver": "mysql",
  "label": "Personal records",
  "host": "127.0.0.1",
  "port": 3306,
  "database": "example_records",
  "username": "example_reader",
  "credential": {"service": "Proteus Life example", "account": "database-reader"},
  "ssh": {"alias": "example-approved-database-tunnel"},
  "userId": 1,
  "workspaceId": 1,
  "readOnly": true
}
```

Alternatively use a direct TLS endpoint with `tls: {"caFile": "/absolute/trusted/ca.pem"}`;
certificate validation cannot be disabled. Optional client certificates use `certFile`/`keyFile`.
Saved SSH aliases use BatchMode, strict host key checking and loopback-only port forwarding.
An SSH restriction is a stop condition, not a reason to route around server policy. The initially inspected account prohibited forwarding. A separately approved, narrowly scoped
Life SSH/SFTP route was subsequently provisioned and verified on October 4; see validation below.

Omitting `readOnly` defaults to true. MariaDB read-only mode is enforced both with a server
`SET SESSION TRANSACTION READ ONLY` and adapter mutation guards. Queries have bounded timeouts.
Every operation rechecks the bound membership; nutrition queries and mutations additionally bind
the individual user. Changing membership invalidates subsequent access. Secrets are retrieved
from macOS Keychain only for the connection and are not logged. For the managed website, the
approved vault remains authoritative; any host Keychain entry is a runtime copy, not its sole
portable credential record. Site credential provisioning is an administrator operation.

Shared SFTP reads explicitly retrieve originals on demand without bypassing filesystem permissions.
A local storageRoot mirror supports existing originals but cannot accept remote-database uploads.

## Verified MariaDB upgrades and shared originals

Existing MariaDB upgrades require a fresh independently restored SQL backup. Setup’s reviewed
plan disables Apply until verification succeeds. Choose the private restore connection profile
and its owner-only SQL dump in the Mac file chooser, then select **Verify restored backup**.
The server administrator must first create the dump and restore it into a separate database;
Proteus never restores over the source or creates a pretend backup receipt.

The verifier opens both connections read-only. It compares schemas and every row of the 14
protected Life tables, plus native ledger tables when present. It excludes authentication-secret
tables (users, passkeys, OAuth secrets and sessions); this check is not a full authentication
recovery test. The source profile must authorize its bound workspace; the restore credential
needs only SELECT/SHOW CREATE on protected tables. The dump is streamed through SHA-256.
Independent database identities, matching protected state, dump digest and verification times
are bound by a Mac-private HMAC key. Verification records the administrator’s restored-dump
workflow; matching state alone does not cryptographically prove which SQL file populated a
server. Keep the actual restore logs with the backup.

Receipts expire after 30 minutes. Apply rechecks the receipt, source identity, dump checksum
and current protected data before any DDL. Changed data, altered receipts or a receipt from
another Mac fail closed. SQLite continues to use an integrity-checked native backup. MariaDB
DDL commits implicitly: the shipped additive migration is restart-safe, creates only the two
native ledger tables, and does not attempt a destructive rollback. Every upgrade still checks
unchanged nutrition fingerprints. A fresh backup and restore verification is needed for a
later upgrade; an old receipt cannot authorize it.

The same verifier ships in `src/life-backup-cli.js`:

```sh
node src/life-backup-cli.js --source-profile /private/source.json \
  --restore-profile /private/restored.json --dump /private/backup.sql
```

The private source profile receives a `backupReceipt` reference. Receipt/key files remain in
Proteus’s private Life application-data directory; public status only returns timestamps and
counts. A Keychain lookup times out after 15 seconds with an unlock/approval message.

For a shared database, new original uploads require shared SFTP storage:

```json
{"evidence":{"mode":"sftp","sshAlias":"approved-life-storage","root":"/srv/site/storage/app/private"}}
```

Use an administrator-approved SSH alias with strict host-key verification, internal SFTP and
ACL access restricted to the website’s private storage. New originals get UUID paths under
`evidence/<workspace>/`; uploads are staged, downloaded and hash-verified, then renamed before
the database attachment is inserted. Transaction failures remove only the operation’s new file.
The website user must have inherited read access; files use mode 0640. Existing relative paths
remain compatible with Laravel. Reads enforce canonical directory containment, regular files,
recorded byte length and SHA-256, with a 20 MiB bound. A local mirror may read existing originals
but cannot accept uploads for a remote database. Transfer errors fail closed without exposing
private paths. Network interruptions can leave unreferenced staged files; reconciliation should
review these without deleting existing originals.

Production validation on 2026-10-04: an independently restored backup matched 14 protected tables
and 1,237 rows. The reviewed native v2 migration then preserved every original protected table’s
schema and row digest, including 219 foods, 243 food versions and 699 meals. Only native ledger
tables were added. All seven database-referenced original evidence files passed live SFTP byte-length and SHA-256
checks. No production test records or evidence uploads were created. Feature activation remains gated on the operator’s credential
unlock; the connection is configured with Life disabled until then.

## Service contract

`new LifeStore(home)` provides synchronous sanitized `get()` and revision-checked
`save({schemaVersion:2,enabled}, expectedRevision)`. `refresh()` validates an enabled configured
connection and refreshes readiness/capabilities. `close()` drains operations; each SQL connection
and SSH tunnel is closed in the operation's finally block. Operations are serialized per store.

Authenticated desktop-local routes:

- `POST /api/life`: settings and expectedRevision.
- `POST /api/life/setup-plan`: local-new owner fields, private-profile/profileFile, or upgrade-current to review the already configured private database without reselecting its file.
- `POST /api/life/backup-verify`: optional sourceProfileFile, restoredProfileFile and dumpFile; read-only comparison and a private verification receipt, returning only counts/times.
- `POST /api/life/setup-apply`: planId and literal confirmation `APPLY`.
- `POST /api/life/data`: section and query; overview, nutrition, garage, fuel, captures, security,
  connections. Capture pagination returns page/pageSize/hasMore; 100 records per page.
- `POST /api/life/action`: action, input and a stable idempotencyKey. The same key with a different
  payload is rejected. Values are validated; SQL identifiers and queries are not renderer inputs.
- `POST /api/life/evidence`: attachmentId, returning name/mimeType/base64 only after scope,
  path-containment and digest checks.

The renderer sees labels, capabilities and read-only status, never connection secrets or paths.
Native Setup and Life forms retain drafts across background state updates. Disable hides personal
navigation; configuration remains available for intentional later reactivation.

## Provenance, web application and deployment

`web/` retains all 263 tracked files imported from Mnemosyne and its complete Laravel application:
OAuth/PKCE, Fortify, passkeys, authenticator checks, scoped API/MCP, invitations, legacy nutrition
compatibility and all original website pages. `web/upstream-source.json` records original hashes.
Upstream declares MIT in composer.json; original package identifiers and dependency notices stay.
The user-facing website branding is Proteus, while `brain:*`, `BRAIN_*`, OAuth scopes, internal
models/routes, legacy compatibility and original migrations remain unchanged. No credentials,
records, uploads, runtime environments, generated assets or dependencies were imported into Git.
The desktop excludes web runtime dependencies; the upstream source checkout stays separate.

Website remote workspaces now use the existing end-to-end encrypted protocol through a separately
supervised relay. See `docs/web-remote.md` for origin controls, per-host credentials and browser
pairing; current production rollout status belongs to `docs/handoff.md`. Website sign-in never
substitutes for desktop pairing authorization.

Before any website deployment, preserve APP_KEY, Passport keys, private storage, passkey origins,
legacy nutrition owner/key hashes, OAuth clients/scopes and explicit session/cache prefixes. Pin
and restore-test database/uploads/release backups, compare historical nutrition reports and row
links, validate login/MFA/passkeys/legacy client/MCP/tenant isolation, and retain rollback to the
previous release. Production deployment is a separate administrator operation.

## Verification

Native database tests use disposable SQLite files only. They verify disabled defaults, private
state, install/Apply gating, stale plan rejection, verified additive backups, immutable nutrient
history, complete-day averages, deleted-meal retry protection, tenant isolation and revoked roles,
read-only profile defaults, MariaDB adapter/session guards, capture/purchase/oil semantics,
maintenance completion, fuel calculations, calendar estimates, original evidence integrity and
SHA deduplication. Restore receipt tests cover tampering, expiry, identity, changed data/dumps and secret-table exclusion. Shared-storage tests cover verified promotion, rollback cleanup and path escape; production reads and additive migration are described above.
On October 3, all 15 native database tests passed; the Electron native Life suite passed 13
check groups and the full shell integration passed 20 groups, including persistence and disabling
Life. The overall Node suite passed 164 tests. Screenshots used synthetic records and were reviewed.
On October 4, 19 backend tests and 14 native UI groups passed, including the restored-backup wizard.
Run `node --test test/life.test.js test/life-backup.test.js`, `node test/life-ui.mjs`, and `node test/integrations-ui.mjs`.

The imported Laravel suite previously passed all 45 tests / 251 assertions, Vite built successfully,
and disposable password/MFA browser tests exercised nine pages plus desktop/mobile nutrition.
These web checks remain valid for the unchanged imported source, separate from native Life tests.
Use fresh temporary Laravel storage, in-memory SQLite, a generated test APP_KEY and isolated
Passport keys for future tests; never run key generation, migration resets or bootstrap against
an existing installation. No real personal records are needed for verification.


## Rich native reports and direct website API

Desktop Life now has vehicle cards with history/open-task counts and latest dated odometers,
weighted fuel economy cards, detailed oil samples/measurements/originals, and date-precision-aware
history. Editing, evidence, search, custom ranges, and immutable food versions remain available.
Life remains optional and off by default.

**Daily averages by period** includes All complete days, This month, and Last 30 calendar days.
Breakfast, lunch and dinner entries (case-insensitive) make a complete day; explicit zero-valued
skipped meals count, and snacks contribute nutrients. Each complete day has equal weight.
The last-30 window is today and the prior 29 calendar dates; the denominator is complete days,
never 30. Partial and unlogged days are excluded; no complete days returns null, not zero.
Fixed cards ignore custom ranges/search. Custom-range and monthly summaries retain filters.
Calendar arithmetic uses workspace timezone dates, including leap days and DST, and returns
`reportDate`/`reportTimezone`.

The direct website API uses Passport bearer tokens with explicit `brain:read`/`brain:write`
scopes, independently of relay pairing. `GET /api/v1/life` returns opaque site-scoped `accountId`,
`workspaceId`, `displayName`, `capabilities`, `sections`, and `readOnly`.
`POST /api/v1/life/data` accepts `{section,query}` for overview, nutrition, garage, fuel, captures,
security, or connections. Domain shapes match desktop Life; each includes account/workspace
identity so native clients can reject stale caches. Keep tokens in account-scoped secure storage,
clear records on identity change, and never queue offline writes.

Nutrition adds `periodSummaries`: id, label, from/through, completeDays, entryCount, firstDate,
lastDate, calendarDays, loggedDays, partialDays, unloggedDays, and four macro averages. Meal days
include entryCount/foodNames; monthly rows include completeDays, entryCount, and caloriesTotal.
Garage/fuel add `vehicleCards` containing vehicle, history/open-task/oil/fill counts, latest
observation and fuel/mileage report, plus `vehicleSummary` when selected. Oil rows include safe
attachment metadata. Nutrition/captures support one-based `query.page` and return page,
pageSize=100, hasMore. Nutrition paging follows the selected tab; summaries use all scoped data.
Query fields: tab, date, from, through, search, foodId, vehicleId, captureId, status (review/saved).

`POST /api/v1/life/action` requires `{action,input,idempotencyKey,expectedAccountId,expectedWorkspaceId}`.
A changed identity fails before writes. Supported actions use desktop input fields: food.save,
meal.log/update/delete, vehicle.save, task.add/complete, capture.save/accept, attachment.add.
NutritionLedger and CaptureIngestor remain the website business validators. Actions lock membership
and use the shared durable retry ledger transactionally; different input with a reused key fails.
Captures require explicit acceptance. Accepted oil updates retain full validation. Connection
revocation is website-only (`canRevokeTokens:false`, manageUrl) because it requires fresh identity
confirmation; separate native logout can revoke that native session.

`GET /api/v1/life/evidence/{id}` returns original bytes as a download after workspace/capture,
storage-root, size and SHA-256 checks. API responses omit paths, DB credentials, token values and
credential columns. Nutrition remains private per user even within a shared workspace. Fuel
report child observations also require the vehicle workspace.

Laravel migration `2026_10_05_000001_add_native_life_retry_ledger` installs exactly the desktop v2
tables/checksum for fresh sites. Existing compatible tables stay intact; incompatible columns,
types, primary keys or checksum fail before DDL. Rollback deliberately retains shared replay
protection and data. It never alters nutrition tables. Deployment remains an administrator
operation with verified backups; no production data was modified for this implementation.

Verification: 19 Node report/database tests passed (inclusive dates, DST/leap boundaries,
complete/calendar denominator, historical versions, tenant isolation). The Electron Life smoke
passed 15 groups including fixed-period cards and retained custom filters. The isolated Laravel
suite passed 58 tests/402 assertions, including 5 API tests/91 assertions for shared-workspace
privacy and corrupt cross-workspace child isolation. All fixtures
use temporary storage/generated test keys/in-memory SQLite.

## Native iPhone and iPad account

The optional native **Life** tab uses SwiftUI cards, filters and forms directly against the website API.
It is hidden by default. Open **App setup** from the Mac menu or unpaired screen and enable
**Show Life**. This device preference is independent of Mac destinations; hiding the tab retains
its secure sign-in, while signing out inside Life explicitly removes/revokes that session.
It is separate from the **Macs** selector and remains usable while both Macs sleep. The default
appearance is dark. Nutrition includes fixed period averages, range/search filters, day entries,
food/version history and meal/food forms. Garage and Fuel include vehicle cards, maintenance,
service parts, oil measurements/evidence, fill intervals and mileage estimates. Evidence includes
review, explicit acceptance, typed capture forms and original-file uploads. Account/security
and connection inventories remain native; credential recovery and revoking other website
connections open the website for its fresh identity verification.

Open **Life → Sign in securely**, complete the website's existing passkey or authenticator
verification, and approve account scopes in the system browser. No relay pairing or database
password is involved. Authentication uses
[ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
and [Passport authorization code with PKCE](https://laravel.com/docs/13.x/passport#authorization-code-grant-with-pkce):
S256, random state/verifier per attempt, and the exact `proteus://life-oauth/callback` URI.
API requests reject redirects; the app validates callback, canonical HTTPS issuer, public
client discovery and returned account/workspace identity.

Website preparation is `php artisan proteus:native-client`, then persist its public
`PROTEUS_NATIVE_CLIENT_ID` in the private deployment environment and rebuild Laravel's config
cache. The command verifies an existing registration or creates a public code/refresh client
with exactly the fixed callback; it creates no user authorization. Discovery at
`GET /api/v1/native-config` remains disabled until registration is valid. No client secret
belongs in the native bundle. Account consent remains an operator action.

Tokens use a separate `WhenUnlockedThisDeviceOnly` Keychain service. Health records and drafts
stay in memory, clear on sign-out/account change, and never enter the Mac cache. An inactive
scene privacy cover obscures displayed records. Mutations carry expected account/workspace
and a retry UUID; no offline writes are queued. Data identity is checked before display/cache;
a mismatch clears the session. Refresh is serialized, late responses cannot replace a newer
account, and sign-out waits for token rotation before revoking the newest native session.
If revocation cannot be confirmed, the app reports local sign-out and directs the operator
to website connections.

Original files are authenticated and limited to 20 MiB. The viewer supports verified raster
signatures and PDFs; HTML/SVG/executables are not embedded. Unsupported types use the website's
authenticated download. Accepted non-oil captures remain locked; oil revisions use existing
server validators. Forms retain input after errors; canceling or leaving their section discards
the in-memory draft.

Validation: five native account tests and two allowance tests passed on iPhone and iPad;
nutrition/card/form UI checks passed on both. Nine destination tests verify independent Mac
storage and safe legacy-name hydration. The native OAuth server suite passed four tests/26
assertions, including a synthetic authorization-code exchange, session revocation and rejected
refresh afterward. Tests use disposable records/generated keys, with no live nutrition records
or user authorization. Real system-browser consent, physical session restoration and app-switcher
privacy acceptance remain deployment checks.


## Post-update acceptance: desktop Food library pagination

The desktop Food library requests 25 records per page, ordered by case-folded name and ID.
Previous/Next controls show the current item range, matching total, and page count. Search resets
the browser to page 1, matches literal percent/underscore characters, and preserves its query
while moving between pages. Out-of-range pages clamp to the last available page; empty searches
show no matching foods with both controls disabled. Food version/detail access loads the selected
food independently of the displayed page/search, and Back to library retains the prior page.
Daily-log food choices remain complete. No database migration or historical nutrition write is
required.

The native data contract adds `foodPagination` for `tab:foods` (`page`, `pageSize:25`, `total`,
`totalPages`, `from`, `to`, `hasPrevious`, `hasNext`) and accepts `foodPage`. `selectedFood`
provides the scoped current food when `foodId` is requested, regardless of list membership.
These desktop fields do not change the website/mobile API paging contract.

Verified with disposable records: 20 backend/report tests passed, including 53-food page bounds,
repeatable ordering, literal search, shared-workspace user isolation, and selected-food history
outside search results. The Electron Life smoke passed 16 groups, including first/middle/last
pages, Previous/Next, search reset/empty results, and editing a food version opened from page 2.
Screenshot: `/private/tmp/proteus-life-food-pagination.png`. Production records were not modified;
installation acceptance belongs to the subsequent signed desktop update.

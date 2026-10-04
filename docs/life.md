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
An SSH restriction is a stop condition, not a reason to route around server policy. The current
proteus.example SSH account prohibits database forwarding, so production has not been connected.
No production database queries, schema changes or credential changes were performed by Life.

Omitting `readOnly` defaults to true. MariaDB read-only mode is enforced both with a server
`SET SESSION TRANSACTION READ ONLY` and adapter mutation guards. Queries have bounded timeouts.
Every operation rechecks the bound membership; nutrition queries and mutations additionally bind
the individual user. Changing membership invalidates subsequent access. Secrets are retrieved
from macOS Keychain only for the connection and are not logged. For the managed website, the
approved vault remains authoritative; any host Keychain entry is a runtime copy, not its sole
portable credential record. No credential was provisioned during this implementation.

Remote evidence currently requires an authorized local storage mirror configured as storageRoot;
the desktop does not silently download uploads or bypass remote filesystem permissions.

## MariaDB upgrade procedure (deferred)

Automatic MariaDB Apply is deliberately blocked pending a verified server-native backup workflow.
This does not block a read-only connection to an otherwise compatible database. The app ships
`src/life-migrations/002-native-action-retry.sql` as the reviewed additive migration for a future
explicitly approved administrator upgrade:

1. Obtain an approved database connection; do not alter an SSH restriction without authorization.
2. Review the exact bundled SQL and migration checksum and run compatibility/schema checks.
3. Create a fresh server-native database and private-evidence backup in the site's recovery store,
   record SHA-256 manifests, and verify restoration in an isolated database. Record nutrition row
   counts, all meal/version/food links, soft-deleted entries and ordered row fingerprints.
4. With explicit Apply authorization, apply only the bundled additive SQL through the approved
   administration route. MariaDB DDL commits implicitly; a transaction cannot undo CREATE TABLE.
   The statements are idempotent, and existing checksum mismatches are a hard stop.
5. Compare all protected nutrition fingerprints/counts and schema/history, then reconnect read-only
   and inspect reports. Enable writes only with an explicitly writable private profile and the
   matching native schema checksum. No nutrition rewrite is needed.

This procedure has not been executed on production. Live DB integration, restored MariaDB upgrade
validation and remote evidence access remain outstanding; the app must not claim they passed.

## Service contract

`new LifeStore(home)` provides synchronous sanitized `get()` and revision-checked
`save({schemaVersion:2,enabled}, expectedRevision)`. `refresh()` validates an enabled configured
connection and refreshes readiness/capabilities. `close()` drains operations; each SQL connection
and SSH tunnel is closed in the operation's finally block. Operations are serialized per store.

Authenticated desktop-local routes:

- `POST /api/life`: settings and expectedRevision.
- `POST /api/life/setup-plan`: local-new owner fields, private-profile/profileFile, or upgrade-current to review the already configured private database without reselecting its file.
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
The desktop excludes web runtime dependencies; existing source checkout and live site are untouched.

Website and relay deployment remain deferred. A hosted Laravel service can share the domain with
an eventual relay, but the persistent encrypted relay should remain a separately supervised
process/container behind a separate route/subdomain. Preserve explicit pairing and end-to-end
encryption. Never reuse a website session as desktop authorization.

Before any website deployment, preserve APP_KEY, Passport keys, private storage, passkey origins,
legacy nutrition owner/key hashes, OAuth clients/scopes and explicit session/cache prefixes. Pin
and restore-test database/uploads/release backups, compare historical nutrition reports and row
links, validate login/MFA/passkeys/legacy client/MCP/tenant isolation, and retain rollback to the
previous release. No production release or relay change was made here.

## Verification

Native database tests use disposable SQLite files only. They verify disabled defaults, private
state, install/Apply gating, stale plan rejection, verified additive backups, immutable nutrient
history, complete-day averages, deleted-meal retry protection, tenant isolation and revoked roles,
read-only profile defaults, MariaDB adapter/session guards, capture/purchase/oil semantics,
maintenance completion, fuel calculations, calendar estimates, original evidence integrity and
SHA deduplication. MariaDB guards are tested with a fake driver; no live MariaDB test is claimed.
On October 3, all 15 native database tests passed; the Electron native Life suite passed 13
check groups and the full shell integration passed 20 groups, including persistence and disabling
Life. The overall Node suite passed 164 tests. Screenshots used synthetic records and were reviewed.
Run `node --test test/life.test.js`, `node test/life-ui.mjs`, and `node test/integrations-ui.mjs`.

The imported Laravel suite previously passed all 45 tests / 251 assertions, Vite built successfully,
and disposable password/MFA browser tests exercised nine pages plus desktop/mobile nutrition.
These web checks remain valid for the unchanged imported source, separate from native Life tests.
Use fresh temporary Laravel storage, in-memory SQLite, a generated test APP_KEY and isolated
Passport keys for future tests; never run key generation, migration resets or bootstrap against
an existing installation. No real personal records are needed for verification.

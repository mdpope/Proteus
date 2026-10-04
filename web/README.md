# Proteus web

A self-hosted personal organization app and API for vehicle maintenance, private evidence, fuel/mileage and nutrition. Laravel provides the web UI, local account authentication, passkeys/TOTP and OAuth-protected MCP/API access.

## Repository boundary

This repository owns reusable application code, migrations, tests, and UI assets. Deployment workspaces own their hostname, server configuration, releases, credentials, imports and recovery records. Never commit live records, uploaded files, `.env`, database snapshots, keys or personal vault content here.

This is the complete personal-records web application incorporated from Mnemosyne into Proteus. The optional desktop Life section implements native views over a privately configured compatible database. This complete Laravel source remains available for the separately deployed Proteus website. Personal operating workflows belong to operator workflows and durable personal context belongs to private notes; the application has no runtime dependency on either. Professional workflows retain their own organization workflows policy and records boundary. No server-side AI execution or desktop relay is implemented by this web app. See `../docs/life.md` for source provenance, integration and future deployment checks.

## Local development

Use PHP 8.3 or newer, Composer and Node.js. For a **new, empty development installation only**, copy `.env.example` to a private `.env`, configure a disposable database and run:

```sh
composer install
npm ci
php artisan key:generate
php artisan passport:keys
php artisan migrate
npm run build
php artisan serve
```

Use `LARAVEL_STORAGE_PATH` and an absolute `DB_DATABASE` to keep local runtime records in a private deployment workspace. Expose only `public/` on a production host. Uploaded originals remain private; do not run `storage:link`.

For a new empty installation, `php artisan brain:bootstrap owner@example.test --name=Owner` creates a private expiring setup invitation. The owner chooses their own password and enrolls a passkey or authenticator. The internal `brain:*` commands and configuration identifiers remain stable for existing deployments.

## Nutrition

Meal days lists only dates with entries, paginated newest first. Daily log retains direct date links. Averages use recorded days as the denominator and do not treat missing days as zero intake. Monthly rows aggregate historical food versions. Food library provides search, pagination and per-serving macros. All views remain private to the signed-in user within their workspace.

## Oil analysis

Vehicle pages list oil samples separately from maintenance. `oil_analysis` captures preserve sample/report dates, laboratory and unit identifiers, oil type, mileage, makeup oil, lab commentary, collection limitations, and per-test results with their reference ranges and averages. Measurement values are strings so censored results and trace values remain intact. Samples progress from awaiting mailing to submitted to reported; editors can update the same record and append PDFs, with previous metadata retained in the audit log. A lab result never creates a service record or diagnosis.

Original PDFs require the same authenticated workspace access as other evidence. They open inline in a new tab; `?download=1` explicitly downloads them. Other file types retain download behavior. MCP `submit-capture` accepts oil analysis and `vehicle-history` returns samples and authenticated original-file links. Existing sample updates use the website.

`brain:import-oil-analysis {email} {manifest}` imports a reviewed, deployment-private manifest matched by vehicle source key. It validates all bounded PDF paths/checksums and sample metadata before writes; a transaction and stable submission keys make retries safe. Keep manifests and original reports outside this repository.

## Validation

```sh
npm run build
php artisan test --compact
vendor/bin/pint --dirty --format agent
```

MCP is served at `/mcp` with OAuth/PKCE. A deployment may package a connection using its own public endpoint. Receipt originals and structured facts are separate; uncertain readings enter review. Omi processing and native remote clients belong to the desktop side of Proteus. Website AI controls, vault synchronization, relay hosting and commercial onboarding remain future work.

## Source and compatibility

Imported from `mdpope/Mnemosyne` commit `af7d28abfb9f6004931523c83c109b7e1035d287`.
`upstream-source.json` records SHA-256 hashes of all 263 imported tracked files. The original
repository remains untouched. Upstream declares MIT in `composer.json`; its existing package
identity and dependency license notices are retained. No `.env`, OAuth keys, databases, uploaded
files, dependency directories or production build artifacts were imported.

The UI, new-installation app name, owner workspace name and MCP description now say Proteus.
The `brain:*` Artisan commands, `BRAIN_*` settings, OAuth scopes, route names, model identifiers,
legacy nutrition API and every database migration retain their existing contracts. Do not rename
them as a cosmetic cleanup. Preserve existing `APP_KEY`, Passport keys, data/storage paths,
session cookie name, cache/Redis prefixes, domain and passkey relying-party configuration when
preparing a later deployment. This source incorporation does not authorize a production migration.

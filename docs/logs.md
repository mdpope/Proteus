# Application logs

General computer diagnostics use a separate `logs.sqlite` database in the configured
application-data directory. A single worker owns SQLite reads, migration, writes and maintenance;
the desktop thread does not read or rewrite the full log history. Notifications, their preferences
and the account-delivery outbox remain in `activity.json`. Execution retry receipts and browsing
history retain their independent databases and retention policies.

Logs retain **up to 2,000 newest entries**, removing the oldest entries in the same transaction
as an insert. A second 64 MiB payload budget can rotate unusually large entries sooner. Each
record is bounded to 256 KiB, with message text bounded to 128,000 UTF-8 bytes and bounded nested
diagnostic fields. Oversized or excessively nested fields are labeled; ordinary multiline error
stacks and nested causes are retained. SQLite reuses deleted pages, periodically checkpoints its
WAL and runs incremental vacuum, including at shutdown. Retention never deletes command receipts.

Each list page loads 50 compact summaries, newest first. A sequence cursor preserves the next
page when new entries arrive; rotation can remove old entries between requests. Desktop and web
offer Refresh, Newer and Older. Native clients offer the equivalent disclosure rows and paging.
Details fetch one retained record on expansion and show its complete redacted message, error
stack/cause, diagnostic fields and identifying metadata. Alert **View logs** queries around the
related ID, so an older retained event can be focused without loading every intervening page.
An expired ID falls back to the newest page; unavailable detail remains an explicit error.

The authenticated local API accepts `GET /api/logs?limit=50&cursor=…` or `target=…` for summaries,
and `GET /api/logs?id=…` for details. Paired clients use `logs.list` and `logs.get`. These remain
host-bound reads through the existing encrypted connection. The website uses its explicit Default
computer for full diagnostics. Account events appear separately in bounded 50-row UI pages; they
remain the existing generic account metadata, without uploaded messages, stack traces or prompts.
Omi/transcription stdout/stderr files remain in their owning pipeline workspace and are unaffected.

First use imports retained legacy logs transactionally, with a migration marker committed alongside
the import. `activity.legacy.json` preserves the original activity document for recovery. Existing
notifications, preferences, unknown JSON fields and outbox records survive; the active JSON no
longer duplicates the old log array. Failed initialization preserves the original and surfaces a
Logs error. Legacy truncation cannot be reversed and imported entries explain that limitation.

Credential redaction applies before persistence, including error causes and structured diagnostic
fields. Prompts, transcripts, authorization, cookies and credential fields are withheld. Only the
existing generic event metadata is eligible for account sharing. Log files and SQLite companions
use private permissions and stay outside the source repository.

Validation: `npm test`, `npm run check`, `node test/log-panel-ui.mjs`,
`node test/browser-errors-ui.mjs` and the native
`ProteusUITests/RemoteUITests/testLogPaginationAndExpandedDiagnostics` rehearsal. Build and
installation/live acceptance are recorded separately in the October 13 release ledger.

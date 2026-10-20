# Unified host browser history

Implemented source now uses `src/browser-history.js` as the async boundary to a dedicated
SQLite worker. `browser-history.sqlite` belongs in the configured application-data directory.
No private history, website session, cookie or form body belongs in this database. The worker
retains full HTTP(S) redirect URLs by the operator’s October 14 choice, including login paths, query strings and fragments. Explicit private-profile records, URL userinfo and non-web/privileged targets remain excluded.
Default uses the stable `default` identity; named profiles retain their account IDs. Paired
viewers access the chosen computer's history without signing into the website account again.

## Ownership and persistence

`events` stores chronological visits keyed by stable event IDs. Genuine later visits get new
IDs. Retrying or mirroring an existing event never creates another visit. URL/time equality is
not a duplicate heuristic. Profile/date/source indexes and FTS5 support query paging and search. FTS rows use the event
row ID, so deletion/update never scans the unindexed visit identity column. An atomic derived-index
migration fixes earlier FTS row IDs without changing visits, tombstones or receipts.
`nav_tabs`/`nav_entries` separately retain per-tab entries, current selection and revision.
Explicit navigation/traversal commits its visit and navigation receipt in the same transaction.
Back retains Forward; new navigation after Back replaces the abandoned forward branch without
erasing its retained visits. Delayed redirects cannot change an entry that is no longer selected.
Redirects atomically update the same chronological visit rather than adding another visit.
Safe prior destination aliases are retained for original-outbox retry recognition, omitted from
ordinary history queries, and carried by the replication delta. Out-of-order old/new payloads
converge on the newest canonical URL; ordinary append requests cannot claim redirect authority.
By the operator’s October 14 choice, full authentication/redirect URLs are retained in navigation and visits. Engine state, headers, POST bodies, explicit private-profile records and URL userinfo remain outside shared history.
New operation receipts store a compact deterministic acknowledgement, rather than a duplicated
navigation window; the ContentTabs boundary separately reads current navigation. Existing full
receipts remain unchanged and replayable. Replaying an operation ID returns its acknowledgement; reuse with another payload fails.
Conflicting base revisions fail without changing the current position or log.

`ContentTabs` keeps membership/title metadata in its existing JSON file and hydrates navigation
from SQLite in batches of eight tabs to stay within the worker request budget. Selected entry titles
are authoritative unless the user has set a custom tab title. Scope keys are `chat:<chat>:<tab>`, `workspace:<workspace>:<tab>`, `team:team:<tab>`
and `main:main:<tab>`. Seed is absent-only and imports legacy navigation without inventing visits.
Polling or restored metadata snapshots cannot replace the SQL stack. A closed tab rejects pending
navigation. Seed/read/replay/no-op settings do not emit change notices.

New stores retain all available history (`retentionDays:0`) until the user chooses a retention
window. A valid existing explicit preference is preserved. Visit pruning operates in worker
transactions of 1,000 according to the 7/30/90/365-day
preference, yielding between batches until no expired visits remain. Maintenance runs after
startup/imports/mutations and hourly, coalesces concurrent drains, and stops between batches for
shutdown. Failed batches preserve committed progress and retry on a later cycle. It never
removes referenced navigation entries. Explicit deletion stores permanent tombstones, preventing
stale replicas from resurrecting those IDs. Tombstones and operation receipts are deliberately
retained; safe acknowledged-watermark compaction remains a future optimization. The existing
remote-command journal and unresolved retry protections are preserved.

## Queries and replication

`browser.history.query` accepts `profileId`, `sourceHostId`, `query` (or `search`), UTC `from`
(inclusive), `before` (exclusive), `limit` up to 200 and an opaque `cursor`. It returns `items`,
`nextCursor`, `hasMore`, `total`, `coverage.oldestAt/newestAt`, `enabled` and `retentionDays`;
`entries`/`cursor` aliases support native consumers. Descending `(visitedAt,eventId)` cursors
remain stable when newer visits arrive. Search runs against the full host index. Clients group
UTC records in their own timezone and request exact day boundaries, including DST transitions.

`browser.history.record` accepts up to 200 `events` (or `visits`) and returns
`acknowledgedEventIds`. Each visit includes `eventId`, `url`, `title`, `visitedAt`, `profileId`
and `sourceHostId`, with optional `tabId`/`entryId`. For explicit navigation, `eventId` defaults
to `operationId`; an outbox retry must preserve that ID, timestamp and assigned owner source ID.
A duplicate ID with a different URL/profile/timestamp/source is rejected. A tombstoned retry is
acknowledged without resurrection. Disabled recording acknowledges incoming visits as disabled.

`browser.history.delete` accepts event IDs or an explicit `all`/`before` selection. Settings
contain `enabled`, `retentionDays` and peer rows `{hostId,enabled,profileIds,backfill}`. Backfill
values are `7`, `30` and `all`; all means retained available records. Peer replication is opt-in,
uses existing protected desktop pairings, and checks profile selections before applying a page.
Local and remote settings return the owner's redacted `availablePeers`
`[{hostId,label,status,paused}]` and cached, account-scoped `availableProfiles` `[{id,name}]`,
including Default. Reading settings does not refresh the account or expose keys, profile settings
or browser partitions. A viewer's own pairings cannot grant sharing on the owner. New unpaired
peer configurations are rejected; existing removed-pairing preferences can remain unchanged or
be disabled, but cannot be re-enabled or enlarged. Unknown persisted preferences survive edits;
the derived catalogs and per-peer runtime cursor/status fields are not stored as preferences.
Pairing/profile IDs do not enable sharing by themselves. Pause/removal/configuration changes
invalidate an in-flight replication page.

`DesktopPeers.syncHistory()` pulls at most 20 pages per peer per round, resuming on connection,
change notification and heartbeat. Imported events/tombstones and the peer cursor commit together.
Failed retries retain the last committed cursor. `browser.history.sync` is the internal delta
transport: it returns `events`, `tombstones`, `cursor`, `hasMore` and `epoch`, with each delta capped at
200 rows and 512 KiB; an unknown epoch
requests rebootstrap. The local Engine Room Sync action invokes peer sync, rather than using the
delta transport as a UI status call. History data is never sent to the website visit writer.

`tabs.history` pages navigation, with `start:true` for the first absolute page and `limit` up to
200 recommended. The default page surrounds the selected entry. Pages include `offset`, `total`,
`nextCursor`, `hasMore` and `history.currentEntryId/revision`; selection may be outside a later
page. Navigation cursors bind tab ID/revision, so concurrent navigation requires restarting the
list. A response exceeding 512 KiB requires a smaller page. The worker retains up to 10,000
entries per tab and refuses further growth explicitly rather than silently dropping the stack.

## Migration and recovery

The worker imports `browsing-history.json` once, in one transaction with its completion marker.
Stable source-derived IDs preserve distinct legacy records even when URLs/timestamps match.
Original JSON bytes and unknown settings remain available; malformed dates/data abort the whole
import. The original is never renamed, rewritten or deleted by this migration.

`BrowserHistory.importAccount(account)` reads up to the existing 500 retained cloud records,
imports stable original IDs in batches of 200, and records a final marker per account/workspace.
It checks account identity before every batch. Interrupted imports retry without duplicating
already committed records. An `/api/app` refresh can supply its already verified snapshot, so
connecting the website account after launch triggers import without depending on Life activation.
Cloud records remain untouched. Neither a completed migration nor all-time backfill reconstructs
records that the old stores already pruned.

## Verification scope

Focused Node tests cover worker dedup/privacy, transaction rollback, legacy byte preservation,
account batch retry, indexed paging, tombstone propagation, peer cursor retry, navigation receipts,
Forward/branch semantics, stale redirects, profile separation, absent-only seed, standalone scope,
closed tabs and no-op polling. Synthetic encrypted relay tests exercise two clients against the
actual host API and preserve document authorization/revocation checks. These are source/rehearsal
checks; installed desktop/mobile workflows and physical gestures require separate acceptance.

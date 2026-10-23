# Unified browser synchronization proposal — October 12, 2026

Status: **Approved for implementation October 12.** The operator approved this design, queued
fixes, preservation, cross-platform testing and all-target rollout. Implementation/verification
status is recorded in [the release ledger](2026-10-12-unified-browser.md). Historical hold notes
below describe the design discussion, not the current authorization.

October 12 clarification: the operator agrees that browsing history should not be stored in
the website/API database. History coverage includes Default and every other non-private profile.
The subsequent approval covers implementation and rollout; see the release ledger for actual status.

## Baseline inspected before implementation

- `src/content-tabs.js` / `src/remote.js`: owner-computer tab descriptors synchronize through
  paired remote methods, including URL/profile and bounded navigation history/index. Updates
  can replace whole descriptors.
- `ios/Proteus/Services/State/SharedAppStore.swift`: incoming URLs trigger WebKit loads; saved and live engine
  navigation lists are reconciled separately. Gesture availability depends on their alignment.
  This may contribute to inconsistencies; the Gmail failure's cause remains unproven.
- `desktop/browsing-history.cjs`: local JSON visit history, normally 90 days/up to 10,000 entries,
  with persistence already in a worker. A separate website recent-history feed is capped at
  500 records (`web/app/Services/AppRecords.php`). Shared recording currently uses Default only.
- `src/browser-profiles.js`: additional profile definitions/settings use the account API and
  local cache. Default and website sessions remain local. Account records do not own workspace
  tab navigation.
- `src/life.js`: account refresh explicitly requires Life enabled. This dependency is confirmed;
  the separate invalid-browser-settings failure is not yet diagnosed.
- Native long-press context-menu code exists, but operator testing reports no visible menus.
  Code presence is not physical acceptance.

## Proposed ownership

| Data | Authority / transport |
| --- | --- |
| Account identity and additional profile names/settings | Account, cached locally; independent of Life |
| Workspace/tab membership, navigation entries and selected entry | Owning computer, paired relay |
| Visit history for Default and all other non-private profiles | Desktop SQLite, optional incremental replication between paired computers |
| Mobile history | Local cache/outbox; visits sent to the owning/selected computer, older history queried via relay |
| Cookies, login, page memory, thumbnails | Local to each device/profile |

Standalone tabs also need explicit computer ownership. Default profiles retain separate website
data; history can aggregate them without merging cookies. Named profiles retain stable account
IDs. Unavailable profiles never silently become Default. Cached profiles survive temporary
account outages while sign-out/account switching retain isolation. Pairing permits host-history
access without a second website-account sign-in on every viewer.

Matching profile IDs identify the same logical profile for history replication, not the same
authenticated website session. Each device keeps an isolated local website-data store per
profile; signing in on one device does not sign in another. Include a consistent built-in Default
history identity within the authorized pairing/account boundary without merging existing Default
cookie stores. Same profile ID alone never grants history access or enables unconfigured sharing.

## Navigation contract

Stable tab IDs, stable entry IDs, selected entry ID and revisions replace reliance on engine
indexes. Explicit navigate/traverse/redirect operations carry unique operation IDs and base
revisions. The owner orders and durably acknowledges them; optimistic display remains immediate.
Applying a broadcast does not generate another navigation or visit. State and visit commit
atomically; retry receipts retain their existing guarantees.

Back/Forward changes the shared selected entry while preserving forward entries everywhere.
Menus, buttons and gestures invoke the same operation. Long lists are paged rather than silently
limited to the current descriptor cap. A new URL after Back starts a new forward branch; abandoned
entries remain in browsing history. Restored URLs do not promise restoration of POST bodies/forms.

Stale concurrent/offline operations cannot overwrite newer lists. Preserve local pending actions
and offer a separate tab if they conflict at reconnect. No automatic owner election while offline.
Mirrored navigation does not steal focus or select another workspace; inactive views load lazily.

Memory unload, page failure and privacy overlays are local view states. Only explicit Close
closes a shared tab. Private login/callback URLs stay local and retain the last valid shared
destination, never publishing blank URL/close. Redirects belong to their original operation.
Separate device login sessions can show different content at the same shared URL.

## History storage and replication

Use a dedicated worker/service with indexed SQLite transactions, bounded batches/checkpoints,
stable cursors and background queries. No full-history rewrite or main-process synchronous query.
One user navigation/traversal creates one event ID, carried by every mirror. Genuine later visits
remain separate; URL/time heuristics cannot distinguish these reliably. Reload can update the
current visit. Device identity may remain internal without a visible origin-device column.
Private browsing is excluded; profile, timestamp and tab/entry association remain queryable.

Mobile-originated visits are durably queued until acknowledged by the owning desktop. For a
workspace tab this is its workspace owner even if the viewer changes its selected connection;
standalone browsing uses its assigned selected computer. Pending events retain that destination
and their IDs across restart/reconnect. Other paired desktops can then receive these events
through configured replication, matched to profile IDs, without duplicate mirror visits.
Acknowledging history must not require replaying an obsolete offline navigation on other devices.

The proposed database stores two distinct record sets: per-tab navigation entries/current position
and the chronological visit log. It replaces conflicting persistence/sync paths, not the user's
chat/workspace Back/Forward menus. Those menus use the selected tab's navigation records; new-tab
recents and Engine Room use visit-log queries with profile/scope filters. Opening a new tab does
not inherit every other tab's navigation stack. Pruning visit logs must not corrupt navigation
entries still referenced by open tabs. Closing a tab does not erase retained visit history.

Per-computer replication cursors, acknowledgements, idempotent upserts and deletion tombstones
handle retry/reconnect. Explicit deletion differs from cache eviction/retention pruning; stale
replicas outside the tombstone window rebootstrap. Desktop sharing is configurable by paired
computer/profile, with one-week/one-month/all-available backfill. All-time cannot recover pruned data.

Retire the website's separate visit writer after migration. Preserve original JSON/cloud records
and retry receipts. Stable import IDs avoid reimport duplicates; do not guess historical duplicate
identity from equal URLs. Existing records remain recoverable until migration verification.

Native caches 30 days from the selected computer. Older scrolling loads one day and preloads one
day; busy days are themselves paged. UTC records group in the viewer's timezone with stable
cursors across midnight/DST. Search queries the full host index, not just loaded rows. Offline
search labels cached coverage. Switching computers keeps caches isolated; replicated records can
be filtered by source computer on the host.

## Interface

Engine Room → Browser history: computer/profile filters, search, descending date sections,
progressive results, sync/coverage status. Separate sync settings control peers and backfill.
Desktop/web/native use the same host records with existing styling. Web rendering retains its
existing supported browser routes; this design does not assume universal embedded-site support.

Native long-press Back/Forward lists show the shared history/current entry. An explicit history
action provides touch/keyboard/accessibility access too. Two-finger gestures use the same traversal
contract. Validate native animation and reduced-motion support rather than promising Safari parity.
Tab previews use bounded local idle captures, retained on unload, with favicon/title fallbacks.
Favicons use cache/fallback and stale-load guards.

Account connection, shared authorization, relay pairing and Life have distinct statuses.
Refresh/profile management work with Life disabled. Profile validation failures do not hide
existing browser data. Life controls Life only.

## Approved issue intake and acceptance

1. Native long-press Back/Forward list absent.
2. Gmail navigation unloaded/reverted the shared tab across devices; reproduce before diagnosing.
3. Back on one client loses Forward on another; shared lists/cursor must agree.
4. Intermittent physical two-finger navigation.
5. Native tab thumbnails and consistent favicon fallbacks.
6. Multi-profile local history, relay deduplication/backfill and progressive mobile queries.
7. Life-gated refresh and contradictory account connection status.
8. Invalid browser settings during profile creation/refresh.
9. Undefined `index` exception; trace the actual failing path.

Eventual acceptance must cover multi-device Back/Forward, redirects/authentication, load failure,
unload/restart, concurrent/offline edits, out-of-order retries, account/profile switching, Life off,
migration/receipt continuity, deletion propagation, day paging and large-history responsiveness.
Physical gesture failures supersede prior acceptance claims. Record physical and simulator evidence separately in the release ledger.

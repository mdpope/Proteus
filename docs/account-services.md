# Shared account service and bounded Life reads

The common desktop OAuth/session boundary is `src/account-session.js`. It owns PKCE,
encrypted credentials, token rotation, cancellation, identity binding and bounded HTTP
responses. Optional Life operations extend that boundary through `LifeAPI`; shared
account operations accept the common session directly. Existing integrations retain a
compatibility `life.api` accessor. The encrypted `life/website-session.enc` location and
existing sign-in scopes remain unchanged, so this refactor neither signs out an existing
account nor adds consent to an existing operation. Standalone `AccountSession` supports
app-only sign-in. Changing the established setup sign-in flow to app-only is a separate
product decision; it is not enabled by this change.

`GET /api/v1/app` and the cookie-authenticated `/app-api` retain their full legacy
snapshot. `?view=bootstrap` returns identity, display name, preferences and push
configuration without loading collection payloads. An optional comma-separated `include`
selects `browserProfiles`, `teamLists`, `links`, `history`, `notifications` or `logs`.
Older servers ignore these query options and still return the full compatible snapshot.
The website shell uses bootstrap; tool pages request their required collections, and
native mutations refresh only their affected collection while preserving the rest of
the account-bound snapshot.

Collection endpoints accept opt-in `page` and `pageSize` (1–100). Responses include
`total`, `hasMore` and `collectionRevision`; send that revision as `expectedRevision`
for subsequent pages. A changed collection returns 409 so clients restart paging rather
than silently skip records. Stable ordering uses update time and ID, and only the page's
payloads are decrypted. No-query requests retain the original `{items}` contract and
the existing collection retention limits. These shared account limits do not prune the
durable desktop browsing journal or a tab's navigation history.

Deletes of mutable profile, team-list and saved-link records require the revision the
caller displayed. The check and deletion share the same account lock used by saves.
Other event/subscription deletes continue accepting older clients but enforce a revision
when supplied. Cross-account records remain 404.

Life's nutrition projections aggregate historical food versions in the database. Food
search and page bounds, selected-day entries, complete-day/monthly totals and overview
totals no longer require loading the entire meal ledger into PHP. Daily labels use the
latest four entries per date, retaining the previous display ordering. A desktop
`projection: "tab"` returns only the lists used by the selected view; older clients keep
the complete response contract. The full desktop meal picker, all desktop daily summary
rows and selected food's immutable versions remain available. The existing native
100-row page contract is applied in SQL. Complete version history does not advertise a
duplicate next page. SQLite food searches retain Unicode case-insensitive substring
matching inside the database query; wildcard characters remain literal. This change
does not silently truncate the desktop day list or retained meal/version records.

Validation uses disposable accounts/SQLite and isolated browser/Electron rehearsals.
Production database execution plans and installed native account flows require separate
deployment verification; source tests and Swift parsing are not a live-workflow claim.

## Parallel website destination reads

Website panels coalesce simultaneous GETs only while the same account-bound request is
in flight. Settled results and raw keys are not retained; later operations verify the session
again. Different accounts and fetch transports remain isolated, and mutations are never
coalesced. Existing server rate limits remain unchanged. Connections offers an explicit retry
when loading fails.

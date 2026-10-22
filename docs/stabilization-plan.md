# Performance and shared-project follow-along

Status: implementation authorized October 22, 2026; installation and deployment are separate.

The operator requests the full architecture-review plan, minor visual refinements only, and
shared-project desktop follow-along. Preserve complete browser navigation, stable owner/tab/chat
identities, effective context, approvals, drafts, and protected retry receipts. Ask before a
substantial presentation or behavior change. Same-name projects are not equivalent identities.

## Acceptance ledger

- [x] Versioned package provenance, installation identity, bounded update staging and recovery accounting.
- [x] Account conflict protection, incremental shared collections and bounded Life reads.
- [x] Reduced browser input/state amplification and visibility-aware presentation work.
- [x] Bounded relay transport, reconnect behavior and revision-aware state subscriptions.
- [x] History-preserving project selection, navigation, scroll follow-along in independent local profiles.
- [x] Resource lifecycle, chat/terminal rendering and persistence improvements.
- [x] Small responsive-layout corrections, verified in isolated UI fixtures.
- [x] Maintained validation suites, contributor/security documentation and current architecture.
- [x] Full regression/static, encrypted multi-host, failure/recovery and UI acceptance.

All implementation claims below must name completed verification and remaining limits.


## Implemented and verified

- Versioned package fingerprints accept historical compatible manifests and bind new identity
  provenance. Package inspection/staging use a bounded worker queue. Recovery copy retries reuse
  verified files; ordinary HTTP/code/GPU caches are excluded while website state and protected
  receipts remain included. Cancelled/completed staging retires only after dependency checks.
  Updater/storage focused suite: 31 tests passed. Live signing/install acceptance remains separate.
- Account/Life: selective bootstrap/collections, bounded paging, expected-revision deletion,
  separate authentication boundary, SQL nutrition queries, and immutable versions preserved.
  Forty PHP tests / 460 assertions passed; account/Life UI, web assets, Pint and Swift parsing
  passed. Production MariaDB query plans and installed native account flows were not exercised.
- Renderers: retained keyed DOM, bounded layout work, explicit cleanup, active-only timers,
  lossless batched terminal rendering, and stable chat anchors. The 2,507-event chat rehearsal
  retained the session beginning, draft/caret/selection, and Jump to latest behavior. Website
  and 13-check terminal rehearsals passed without duplicate shells.
- Navigation: a 10,050-entry session retained its first entry. Ordinary revisions use a delta
  rather than full history; the fixture transferred under one twentieth of bootstrap bytes.
  A 70-tab fixture avoids refetch after cache eviction. No history TTL or truncation was added.
  Lazy history reads reduced the long-URL probe's allocation from 43 MiB to 0.9 MiB while
  preserving the response. Follow membership checks use bounded, file-stamp-invalidated
  identities: 200 nested updates require two registry reads instead of 400.
  Scope departures checkpoint locally without background fetching. Full pending histories
  survive restart/unload and partial acknowledgements, including Forward pages after Back.
  Stale native mirrors cannot publish navigation without explicit local intent.
- Transport: encrypted request/frame/backlog/byte-rate bounds, bounded replay bytes, jittered
  reconnect, and light summary notifications. Pending identity and durable receipts remain intact.
  Broad paired-remote checks and relay standalone-package tests passed.
- Inactive history cache: four records / 16 MiB serialized estimate, active references pinned.
  Seeded summaries do not hydrate transcripts. Question persistence now performs one atomic write.
- Narrow UI: 390 px composer overflow corrected (154 px content / 154 px scroll width);
  580/1,200 px layout unchanged. Existing composer/attachment rehearsal passed.
- Link menus now place **Open Link in Background Tab** below the foreground option and
  retain the unloaded option. Native acceptance verified loaded background creation, source
  typing during a delayed response, later tab selection, unfinished address input, matching
  profile/placement, and Team selection without remounting. Foreground and unloaded actions
  retain their existing behavior.
- Complete integrated Node suite: 976 tests passed, including artifact bridge/lifecycle,
  history checkpoint/restart, and background-tab focus regressions. Expanded recursive syntax
  checks passed.
  Follow controller and two-desktop rehearsals cover lifecycle/reconnect races, independent cookies,
  bidirectional URLs/native scroll, nested chat tabs, scope inactivity and catch-up.
  Each sustained native-scroll direction exceeded 13 seconds with 51/52 visible position changes;
  the maximum observed gap was 446 ms. Descriptor requests fell from 59 in the initial probe
  to two owner-to-client and six client-to-owner; the latter sent 52 coalesced position updates.
  Late document/browser mounting, genuine input, newer state, navigation and same-URL history
  entry cancellation passed. The current styled project interface and dialog were inspected.
- Approved HTML previews share root/nested numeric positions through an isolated observer,
  with host-side coalescing that also works when document scripts are disabled. Native Electron
  acceptance passed for restoration, stale tab/hash rejection, forged-event rejection,
  no echo or view recreation, and cleanup. Opaque origins, CSP, grants, script opt-in, and
  network/popup restrictions remain unchanged. A foreign debugger disables only position sharing.

## Storage accounting and release boundaries

A read-only inventory covered the installed recovery registry and all six known backup,
staging, legacy recovery, update-state and build-artifact roots:

| Root role | Allocated space |
| --- | ---: |
| Full recovery and compact device evidence | 9.15 GiB |
| Update staging | 2.64 GiB |
| Legacy update backups | 18.63 MiB |
| Legacy release recovery | 211.35 MiB |
| Update registry and receipts | 46.18 MiB |
| Build artifacts | 11.49 GiB |

The first row includes the two registered full recovery generations (8.26 GiB); they must
not be counted again. The six roots total 23.55 GiB in listed allocation. Logical bytes and
allocated blocks differ, and APFS shared extents prevent treating this as unique physical
storage. The registry had no active update jobs or automatically eligible staging candidates.
No live recovery or artifact data was deleted: reclaimed space is zero. Legacy roots remain
explicit operator inputs, because an unregistered folder alone cannot prove recovery is safe
to retire. Future authorized updates use the inventory and two-generation policy together.

Current source includes the merged chat-control work. Upstream main was refreshed and matched
`b7701c0`; the Windows installer/update remains active separately. No live deployment, package
installation, provider continuation, or shared signing change occurred in this implementation.
The operator explicitly left the license unchanged and deferred remote terminal-output viewing.
Full DOM virtualization and a new event-storage format were avoided to preserve find/selection,
history, and synchronous durability; measured improvements do not require either migration.

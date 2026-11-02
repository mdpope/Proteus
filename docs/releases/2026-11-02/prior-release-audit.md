## R17 live profiling follow-up

A live baseline now documents recurring main-loop stalls. The [scrolling report](scroll-performance.md)
separates measurements from the periodic-state-work hypothesis and proposes narrow projections
with explicit before/after scrolling acceptance. N2 remains unresolved; no deadlock or live fix is
claimed by R15/R16 address/icon work.

# Prior request and branch audit — Nov 2

Reviewed the October 30 implementation/closeout, October 31 request register, November 1 plan,
implementation/closeout and current source at `4456aea`. This distinguishes missing implementation
from unavailable provider features and acceptance that has not happened. Simulator review is
required before further physical iPhone/iPad builds or installations.

## R12 implementation update (supersedes the original missing list)

The original audit found omitted October work rather than missing committed branches. The operator
authorized recovery and clarified navigation. Source implementation is separate from live acceptance.

| Earlier request | Implemented result / remaining acceptance |
| --- | --- |
| O1 / A8 Return | Shared desktop/web Enter helper and native Send/Return; alternate newlines, IME/repeats, empty/busy guards and retry identity preserved. |
| O2 / A5 expansion | Workspace/question expansion retained for the app session, reset on identity changes; resource expanders removed. |
| O4 addresses | Renderer/desktop shared parser and native parity for intranet, ports, IPv6, IDN/fragments; invalid schemes/credentials/ports rejected. |
| O5 LAN | Actual network/privacy acceptance remains open. Parsing does not prove reachability. |
| O6 attachment-only | Verified new chat/send/queue/edit/steer with blank text. Provider review instruction is separate from exact stored human text; consent/proof/retry required. |
| O7 navigation | Superseded by clarified R12 contract below. |
| O8 questions | Exact repeated choice lines/headings removed only from display, descriptions/distinct labels retained; answered/queued state shown. Inline card owns the answer, general composer queues another message. |
| O9 clipping | Fixed negative padding removed, actual safe area used; simulator navigation/spacing checks do not replace physical acceptance. |
| O10 viewer | Ordered lazy previous/next, keys/swipe, name/details and optional dates in shared/native viewers. HTML stays inert text. |
| O11 Close/sync | Existing tombstones plus empty-outbox repair, history isolation, authenticated pushes/reconnect and overlapping-read handling. Physical cache cause unproven. |
| O12 origin | Authenticated device/window/view retained per human input and queued message. Two actual Electron windows verify renderer origin, focus-independent opens, lazy mirrors, override and closed-origin fallback. |
| O13 continuation | Control immediately precedes allowance across clients, using owner capability/version, pending disable and error rollback. |
| O14 Fusion | Actual runtime still advertises Auto without Fusion tiers; distinct availability explained. No real Fusion execution claimed. |
| O15–O17 | Earlier committed layout/context implementation already in main. |
| A2 autoplay | Native portable desktop gesture policy applies in existing main/subframes; old activation cannot permanently bypass it. |
| A4 answer files | Native choose files/photos/paste, explicit provider/file review, bounded media and durable retry metadata. Missing bytes require reattachment. |
| A6 polling | Sidebar resource polling removed; affected authenticated notices, reconnect reset and one-minute unchanged-offscreen fallback. N2 broader projection profiling remains separate. |
| A7 Linux | Designated live compositor acceptance remains held with new packaging. |

A3 notification deduplication was already delivered in Nov 1. Real inference, vault authentication,
affected-HC geometry, Fusion availability and Outlook acceptance retain their existing qualifications.

## Clarified navigation / Personal General sync

Window app tabs stay local. iPhone lists them in its sidebar with an app-tab overview;
iPad/desktop use their top app strip and overview. Sidebar trees show workspace/project destinations,
never project resource tabs. Projects have one owner-shared ordered content set, preserving stable
IDs, order, hidden state and history. Chats have no nested resource strip. Phone shows the project
row, then Chat | Live browser with overview/actions only; the project plus creates tabs. Browser
links, documents and previews use parent project descriptors and retain their authorization origin.
Selection and scroll stay local. R13 supersedes the former private-draft assumption: shared setup
slots plus setup/reply text now synchronize through the human-only revisioned draft API. Attachments
and execution choices stay on the sending device.

Unloaded pages retain top navigation without loading to switch tabs. Browser/composer spacing uses
the actual safe area. Native sync applies membership despite history paging failure, handles
authenticated tab notices and reconnect, and waits for overlapping reads before fetching newer
owner state. Empty legacy outboxes no longer suppress reads; orphan receipts and private legacy
resources remain retained without manufacturing project membership. Unchanged offscreen scopes use
a one-minute fallback; sidebar resource polling is removed. Broader N2 profiling remains separate.

Fresh read-only desktop inventory still shows twelve browsers: nine visible, three hidden, no open
chat. Review copies only IDs/order/titles/hidden metadata into a synthetic owner with local URLs.
Desktop membership is untouched. Encrypted-owner regressions establish empty-outbox/history fixes
and push Close/rename handling, not the exact physical-cache diagnosis.

## Branch integration

Main is `f14dbed1b31eda2fdc281288089a60833b102878`. All seven old remote heads are strict ancestors
of it: Fusion, Linux membership, October command center/deployment, Windows llama/profile and
November responsiveness planning. No committed changes from those branches are missing from main.
Nov 2 / PR 29 is the only open PR. Exact-head guarded deletion retired the seven old remote refs;
the three old local branches were retired after their worktrees were detached at unchanged heads.
Only main and `codex/nov2-release` remain as local/remote branches.

Two old worktrees contained uncommitted changes. Their complete patches were saved with hashes,
and their detached working files remain byte-identical. The old browser-host ResizeObserver is
already implemented in current source. One additional uncommitted host-shrink/grow regression was
recovered into Nov 2 and passes. Old deployment metadata is historical and must not overwrite
the later closed release record. No dirty work was discarded and no extra merge was needed to
preserve already-integrated commit ancestry.

## Review order

Review hold: both shared simulator Preview apps must be reviewed before any new physical-device
build/installation, desktop release package, publication or rollout. Old accepted packages retain
their historical identity and cannot be promoted as R12. Related superseded Windows/Linux builder
turns are verified cancelled; queued old-source requests remain retained and require reconciliation
before reuse. No unrelated work was cancelled.

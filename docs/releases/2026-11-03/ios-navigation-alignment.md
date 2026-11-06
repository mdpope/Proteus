# Nov 3 iOS navigation alignment

This follow-up supersedes the earlier settlement-based mirror rule and the proposed
`append-current` protocol in [iOS performance](ios-performance.md). The owner's accepted
policy is narrower: title-only changes can be crossed by navigate/traverse; an ahead
base or intervening real navigation still conflicts. No new protocol capability is needed.

## Source and behavior

`git merge claude/nov3-release` reports already up to date. Owner commit
`d5dda9dbeaeceff52af4734b9511145988602435` (Keep remote navigations from being overwritten
or rejected) is already an ancestor of integration
`245e7d05a682a819bb699b88fdc02bde262be9c9` and this iOS lane. The follow-up makes no edits
to owner, desktop, web or relay code.

- A mirrored entry remains owner-owned indefinitely. HTTP redirects, delayed passive SPA
  routes and script back/forward stay local. The address surface reads the actual landed
  WebKit URL; the shared descriptor retains the owner's URL/history. An unchanged owner
  snapshot does not reload a private landing. A different selected owner entry starts a
  mirror even if its URL is the same.
- Trusted pointer/touch, click, submit or keyboard input in any page frame immediately
  releases the guard through an isolated-world listener that checks `event.isTrusted`.
  Subsequent navigation has no 1.2-second deadline. Script-generated clicks do not release
  it. WebKit's link/form navigation type alone is not sufficient evidence of trusted input.
- A local title can be displayed without echoing an existing nonempty owner title or
  modifying shared history metadata. Explicit user tab names still publish normally.
  Repeated title/loading observations compare the last observed page URL, preventing a
  title observation from accidentally publishing an already-known private landing.
- Enqueueing or dropping an operation never predicts an owner history revision. A successful
  response supplies the real revision, including a jump across another client's title
  revisions. Unsent successors on that tab adopt that acknowledged base in order; other tabs
  are unchanged. Owner history metadata is refreshed when the final acknowledgement arrives.
  An arbitrary fresh read never rebases browser intent over another client's navigation.
- Uncertain requests retain their saved request ID, issue time and exact envelope. Only a
  definite scope-revision rejection permits a new scope envelope, keeping the original
  navigation base and operation identity for the owner's conflict check. Actual navigation
  conflicts retain the existing explicit recovery flow and durable local branch.

## Wire operations

iOS queues `browser-navigate` and `browser-traverse` with `action`, `tabId`, `operationId`,
`eventId` (the same UUID), `baseRevision`, `entryId`, `url`, `title`, `visitedAt`, `profileId`
and `sourceHostId`; a redirect-created entry may also carry `requestedURL`. Each operation
is sent separately in `tabs.mutate` with `scope`, `id`, `expectedRevision` and `operations`,
using the persisted request ID and issue time. The durable queue survives missing bindings.

Passive mirrored redirects emit no navigation or visit operation. iOS does not currently
emit `browser-redirect`: a user-owned redirect creates its normal navigate entry with
requested-URL metadata, and ordinary late title metadata follows the existing descriptor
update path. This change does not relax the owner's strict redirect validation.

## Regression coverage and acceptance

`NativeBrowserNavigationTests` exercises:

1. A real loopback HTTP 302 into WebKit, an existing nonempty owner title, an untrusted
   synthetic DOM click and actual passive `history.pushState`: no navigation/visit publishes.
   Refreshing the owner snapshot keeps the landed page without another HTTP request.
2. Entry through the production trusted-interaction callback, a 1.5-second delay, then
   actual WebKit `pushState` and a duplicate completion: exactly one navigate queues, with
   the last acknowledged base. The callback is injected by this unit regression; it does
   not claim a physical finger or XCTest touch event was delivered.
3. Two independently paired native clients on the real synthetic relay/owner. Twice, three
   native navigations queue while delivery is suspended, the peer settles a title via
   `browser-redirect`, and delivery resumes. All six navigations and two later traversals
   converge without quarantine. Assertions check owner revision jumps, ordered URLs,
   adopted revisions and the peer's title in refreshed history.
4. An invalid/local-only operation does not advance the acknowledged revision or create an
   undeliverable owner mutation.

The older duplicate-URL history test now explicitly initiates its first local navigation;
it no longer assumes an owner-restored page is free to publish passive routes. The earlier
settlement test now requires delayed passive routes to stay local.

Final source validation on the existing iOS 26.5 simulators, Xcode 27.0:

| Check | Result |
| --- | --- |
| `npm run ios:test -- --device PHONE --only ProteusTests` | 209 tests, zero failures; 101.320 s |
| Same command on iPad Pro 11-inch (M5) | 209 tests, zero failures; 92.365 s |
| `npm test`, with the coordinator's canonical temporary directory | 1,540 passed, four skipped, zero failed |
| `npm run check`; `git diff --check` | Passed |
| Existing `RemoteUITests/testBrowserSameDocumentPushStateAndHashHistory` on phone | Failed before browser access: old Team selector is absent |
| Existing `PhoneDesignPreviewUITests/testPhoneDrawerFullURLBottomControlsAndDoubleTap` | Link, Back/Forward, full address and history steps completed; failed at its later browser-back control-height assertion, 38 points versus 44 required |

These UI runs are failures, not full browser UI acceptance. The control-height assertion
and old Team route remain outside this navigation change. The new delayed-SPA regression
enters the production interaction callback directly, so the combined trusted-touch/delayed
SPA journey still needs UI/device acceptance. Xcode also reported a post-test diagnostic
collector `simctl` lookup warning; both unit commands exited successfully with valid results.

An initial Node run inherited the system's symlinked temporary path and failed 11 path,
socket-length and recovery-fixture checks. Repeating with the explicitly required canonical
temporary directory passed the entire suite without source changes. An earlier native run
exposed the duplicate-history fixture's obsolete passive-navigation assumption, corrected
above; the final complete phone and tablet runs pass.

Simulator tests use only the separate native test identity and isolated owners. Installed
Preview apps and physical devices remain untouched; no release build or publication occurs.
Physical responsiveness, real-device redirect/interaction feel and the open N1 performance
acceptance remain unverified. This follow-up makes no new performance measurement or claim.

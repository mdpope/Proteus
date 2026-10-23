# Desktop project and workspace follow-along

Desktop clients follow presentation changes while viewing the same **owning computer
and stable project/workspace ID**. Matching display names are insufficient. Leaving
that scope or hiding the renderer stops its follow subscription and automatic tab
hydration; returning reads the current owner state.

Leaving a scope checkpoints pending local tab changes without fetching that scope
again. Saved browser views retain unsynced navigation and its complete logical stack
until acknowledgement, including unloaded views and restart. Uncertain requests keep
their original receipt identities. Pending history that exceeds the workspace storage
budget rejects the save instead of silently truncating visits.

Tab order and browser navigation use the existing revision-checked content-tab
service. Selected tabs and positions use `tabs.follow.v1`, a bounded ephemeral
service in `src/services/workspaces/project-follow.js`. A client joins one visible scope, renews a
45-second lease, and publishes ordered changes. Scope-bound leave, actor binding,
generation checks, and latest-event coalescing protect navigation and reconnect races.
Awaited descriptor synchronization includes passes queued during an earlier response, so
selection cannot overtake a pending navigation seed. Follow events are excluded from replay journals. Durable history, pending navigation
operations, and retry receipts retain their existing ownership.

Only fresh human input may publish a selection/position change, apart from initially seeding
an empty scope. Native local browser entry changes count as input through the host pending-
navigation signal. An explicitly submitted address holds input authority until native navigation completes, so
an unchanged pre-navigation read cannot consume it or apply a queued old page. The guard is
released on success or failure, and newer scope/selection still wins.
Passive saving, descriptor reconciliation, layout and lease renewal never
take presentation control. Identical normalized owner state renews its lease without a new
revision or broadcast. A new actual change on another desktop still follows immediately.

A pending owner presentation takes precedence over passive local reconciliation for the same
presentation identity. Newer human changes or a different tab, child, page, URL or history entry
retain their own intent. Continuous scroll positions are read again after slow descriptor
synchronization and coalesced without repeating that barrier for an unchanged identity. A changed
entry still needs synchronization, even when its URL is the same. Scope and reconnect generation
checks apply throughout; an unchanged no-op input does not indefinitely block later presentations.

Each browser loads the shared URL in its own local profile. Cookies, credentials,
page text, screenshots, and remote-viewing frames are never part of follow state.
Private sign-in/callback URLs keep existing protections. Browser scroll observations
are bound to the source URL and navigation entry; an old page's coordinates cannot
apply after navigation. Scroll-only changes are coalesced and do not refetch tab
descriptors on every gesture. Timestamp-only browser activity is saved and shared in
15-second batches; navigation, history, placement and selection changes remain immediate.
Unchanged workspace saves caused by sidebar painting do not schedule another descriptor pass
or postpone a real edit's pending pass. Changed snapshots, periodic refresh, peer invalidation
and synchronization queued during an earlier response retain their existing behavior.
Page layouts can differ with account, screen size,
dynamic content, and local disclosure state, so equivalent positions are best effort.

Chats use stable event/group anchors and offsets, with cancellable earlier-history
paging when the selected anchor is not loaded. Restoration waits for the selected chat
and target event to arrive, and cancels when newer state or human input supersedes it.
Reading older messages never truncates
history. Document views restore positions as visible content mounts and stop restoration
when the user interacts or changes scope. Nested chat tabs retain their parent and
stable identity. No view move recreates a conversation or shell.

Approved HTML previews share bounded numeric root/nested scroll positions through a
dedicated isolated world in the existing opaque sandboxed frame. The bridge accepts
only trusted input and its exact frame/context; page scripts cannot invoke it. Host
coalescing also works when document scripts and timers are disabled. Each update is
bound to the current approved tab and content version, without changing CSP, grants,
authentication or the script opt-in. A foreign debugger is left attached and disables
only this preview's position sharing. Switching or hiding previews cancels observers,
pending setup and queued updates, and closes superseded WebContents.

Interactive terminal output remains on its owning desktop, as explicitly requested.
Terminal selection follows, and local terminal views support position capture/apply;
this work does not add remote output, input, or shell execution. Existing document
grants and provider approvals remain required. Older hosts without the capability
keep their existing tab behavior; follow is retried after connection recovery.

## Verification

- `test/project-follow.test.js` and `test/project-follow-races.test.js`: lease scope, actor identity, malformed state,
  out-of-order updates, delayed leave, asynchronous application, disposal, reconnect,
  inactive scope, re-entry, pending-event read/sync ordering, no-op input, native navigation
  identity, continuous input during 400 ms hydration, and changed-entry barrier coverage.
- `test/project-follow-ui.mjs`: two disposable Electron applications through an
  encrypted relay, tab and nested-chat selection, bidirectional URL changes, native
  scroll sustained beyond the relay traffic window, bounded descriptor/update counts,
  delayed page mounting and input/navigation cancellation, independent cookies,
  retained session beginning, and inactive/catch-up behavior.
  Set `PROTEUS_FOLLOW_EXECUTABLE` to test the exact packaged executable with the same
  disposable homes and mock Keychain. `PROTEUS_FOLLOW_RESPONSE_DELAY_MS=400` exercises
  slow descriptor responses. Steady-scroll measurement begins after native navigation
  and queued reconciliation complete; responsiveness and request limits stay unchanged.
- `test/project-follow-membership.test.js`: fresh disk invalidation, bounded identity
  caching, deleted scopes/tabs, and preserved document-access checks.
- `test/navigation-checkpoint.test.js`: network-free departure checkpoints, restart
  recovery, unchanged uncertain receipts, and forgotten-scope races.
- `test/document-follow.test.js`: approved-version binding, delayed document readiness,
  and cancellation without changing grants or enabling scripts.
- `node --test test/artifact-scroll.test.js test/artifact-preview-lifecycle.test.js`:
  eight passing regressions for metadata bounds, isolated frame/context identity,
  coalescing, foreign-debugger preservation, disposal, and overlapping show/hide loads.
- `node test/artifact-preview-ui.mjs`: passing isolated Electron acceptance for native
  root/nested scroll and restoration, stale tab/hash rejection, no echo/recreation,
  forged-event rejection with scripts disabled/enabled, unchanged opaque origin/CSP,
  denied network/popups, and destroyed-view cleanup. Temporary fixture data is removed.
- Browser history tests exercise more than 10,000 retained entries, branch/traverse/title
  changes, bounded deltas, old-cursor fallback, and byte-bounded pages.
- Chat and terminal UI fixtures cover history reachability, anchored restoration,
  drafts/selection, no shell duplication, and retained output.

These are source and synthetic acceptance checks. Installed physical-device rollout
is separate and must use the exact verified artifact and the desktop update workflow.

## October 23 — native-link then reverse-address correction

Build Mac now runs signed `490fd629b659+src.615fe38d6371`. Its exact package passes the full
400 ms race with 47/50 visible updates, 1,292/436 ms maximum gaps and 2/3 descriptor reads.
Actual restored chat/browser UI and the online relay are verified after cold preservation of
74,639 files, complete history guards, databases and 68 protected retry receipts. This does not
certify a live cross-device gesture or provider workflow. Linux/HC/Windows rollout acceptance is
separate; their completed builds do not prove installation. Two verified Build Mac recovery
generations remain; private recovery/retirement evidence stays outside this repository.

A real page-link navigation followed immediately by an address edit on the other desktop
reproduced the reported URL regression under 400 ms descriptor latency. The navigation mutation
was accepted, but a following metadata batch could observe the other desktop's next navigation
before the first native pending branch was acknowledged. The idle original view then republished
its old selection as Back. The earlier failure also reproduces on the original release; retained
failed traces remain separate from the passing correction.

Each navigation mutation now passes its own verified response to a narrow native acknowledgment
callback before sending metadata. It requires the exact URL, profile, selected entry and complete
ordered pending branch. Native expected-URL/entry and full-history guards remain unchanged. It
never acknowledges an incomplete Forward branch or a different selection, rewrites a receipt,
or grants follow authority to an idle observation.

The page-link/reverse-address sequence is now an unconditional UI regression. Local source passes
it at 400 ms latency alongside bidirectional selection, independent cookies, full retained history,
inactive-scope/re-entry and continuous nested-browser scrolling. Recorded visible updates are
48/51, maximum gaps 1,345/447 ms, and descriptor reads 4/3 (limit six). Deterministic tests cover
acknowledgment before a concurrent metadata response and rejection of changed profiles, stale
revisions, different selections and missing Forward entries. Packaged and installed acceptance
are pending: the operator explicitly holds all desktop updates while reviewing further fixes.

## Fresh-input correction acceptance

The signed Mac candidate `187d67b1f284+dirty.b2ac0ff930f4` matches all 328 runtime files
and build inputs and the existing installed signer. 1,055 Node tests pass, one platform skip;
static checks pass. Exact-package 400 ms acceptance preserves the chat through passive refresh
and a lease renewal, then follows a new actual remote click. Ordinary bidirectional addresses,
independent cookies, complete history beginning, scope inactivity/catch-up and delayed scroll pass.
One run exceeded the descriptor budget by one request (seven); the unchanged bounded repeat
passes with five per direction, 47/51 visible updates and 1,295/434 ms maximum progress gaps.
Both receipts remain retained; the passing repeat does not erase the first failure.
Activation is separate and remains held while local work is running. No recovery capture or
installed replacement is claimed by this source/build acceptance. Other desktop clients need
the input-authority correction too; an older idle publisher is not certified by updating one client.

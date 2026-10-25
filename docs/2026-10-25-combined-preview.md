# Combined Design Preview work

The October 25 handoff authorizes implementing queue items 28–37 and building/testing an isolated
combined Design Preview. Installed Proteus, public releases and other devices remain held until
Operator reviews the preview and explicitly authorizes the next step. MTPLX remains preview-only.
Base: clean `d0a30fd`, preserving the merged MTPLX/full Activity acceptance and prior queue.

Work sequence:

1. Clear completed updater status, bottom notices, shared link destination previews, automatic
   Copilot working-root trust; focused permission/UI checks.
2. Diagnose first-move acknowledgement and hide latency with real disposable window fixtures;
   preserve placement transaction, browser identity and Persisted residency.
3. Remote continuation and local/remote control parity; durable provider-allowance continuation
   with explicit opt-in, owner-side reset validation and duplicate-delivery protection.
4. Combined Resources list, filter/visibility controls, actual sampled metrics and tab actions.
5. Full tests/static checks, exact isolated combined package acceptance, retained-preview review
   launch only after normal Quit and a usable ordinary control boundary.

No implementation or test result is claimed until recorded below. The retained preview's desktop
guard for a closed prior window remains respected; no forced Quit or alternative input bypass.


## Implementation

Items 28–37 are implemented for an isolated combined review candidate. They are not installed
acceptance. The installed local application and existing retained preview were not changed.

- 28: terminal update cards suppress a stale idle blocker; the helper also clears it when
  recording completion. Real errors and the independent update outcome remain available.
- 29: the owner supplies current project navigation metadata during placement. The renderer
  acknowledges after saving placement and before painting unrelated UI; errors are acknowledged
  explicitly. Owner placement suppresses competing local sync, without replaying a move.
- 30: a visibility/move preflight synchronizes its source scope rather than every visible scope.
  Ordinary Hide still unloads through guarded native cleanup. Persisted Hide keeps the page loaded.
- 31: scheduled/manual conversations use the ordinary recovery path. For an older remote owner
  that explicitly rejects this with “Open an ordinary chat before continuing.”, reconcile the
  exact failed owner/session and use the same manual-send equivalent with a stable message ID.
  Ambiguous transport errors never trigger this fallback.
- 32: web popovers and native notification child windows anchor at the bottom of their app window.
- 33: every Copilot run receives its resolved provider working root as automatic read/write file
  access, including custom homes and resumed/remote-owner contexts. This is not a workspace edit;
  no other provider receives that root. Protected requests and symlink escapes remain gated.
- 34: one display-only hover/focus destination preview covers chat and Markdown links. Relative
  paths use the actual local or remote-owner document/chat base. Approved remote document reads
  supply display-path metadata; hovering performs no read, fetch, navigation or permission change.
- 35: Resources combines app/system processes, loaded tabs and canonical unloaded tabs. Independent
  visibility toggles, name filtering and Refresh retain UI state. Shared process metrics appear
  once; controllable tabs retain Close/Unload, with residency guards and cold logical-tab close.
- 36: a one-shot reset button and persistent, initially unchecked per-chat preference use the sole
  execution owner. Discovery requires an allowance failure and authoritative future reset for
  every applicable exhausted window; choose the latest plus five seconds. At dispatch, refresh
  quota and require confirmed remaining allowance. Unknown/stale/error/inferred monthly reset
  cannot schedule a guessed turn. Wait intent, cancellation and stable delivery IDs survive
  restart/sleep. New input, changed effective permissions/session/context, archive and update
  barriers prevent dispatch. An uncertain journal/delivery becomes attention rather than retry.
- 37: remote/local model controls and permission binding share components. Remote catalogs remain
  separate from the local account; remote folder entry never opens a local picker. Older-owner
  controls retain common presentation with explicit availability limits. Provider/session switching
  is unchanged: this does not create replacement chats or substitute a local provider.

## Verification so far

The complete frozen-runtime source suite passed 1,155 tests with one skip after display-path
compatibility and older-owner presentation refinements; static and diff checks pass. Exact-package
acceptance is recorded separately below when completed.

The stale-catalog reproducer with the previous renderer committed the move but reported the exact
missing-placement acknowledgement after 10,009 ms. The fixed renderer saved the same logical tab
in the destination and acknowledged the first attempt in 10 ms. This proves that failure mode;
it does not assert that every instance of the operator's report had the same cause.

Disposable loaded-browser UI acceptance passed a first move in 434 ms and header Hide in 146 ms
under concurrent regression load. It verifies ordinary unload, Persisted page/history residency,
cold canonical-tab close without loading, resource filtering/refresh, bottom native notices and
real Markdown file/web destination previews. Synthetic remote-owner UI acceptance verifies shared
permissions, remote model metadata, retained model/draft state, allowance controls, the exact
legacy scheduled-Continue fallback, chat link preview without reads and bottom web notifications.
Permission and recovery tests cover root/sibling/symlink/protected-request boundaries, restart/sleep,
latest exhausted-window selection, cancellation during quota I/O, unavailable metadata, update
barriers and no uncertain automatic resend. These are synthetic owner/provider fixtures, not
live Claude/Codex/Copilot rate-limit or physical remote-device acceptance.

## Review boundary

The MTPLX/full Activity pilot remains the merged baseline. Exact-package four-provider Activity
and MTPLX control regression are required for the combined candidate. Its earlier real MTPLX
math acceptance remains separate evidence, not a new live call for these queue items.

The retained preview must be quit normally before replacing that running review instance.
A fresh desktop status still reports the closed PID 92101/window 3007 uncertainty guard owned by
the originating chat. Do not bypass it, force quit, or control that profile through a different
backend. The pending normal-Quit request is preserved. Disposable test profiles do not establish
that the retained 11-chat profile is running the combined package. No installed app, OS default,
public release, GitHub Actions, remote coordinator or other device update is authorized.


Copilot protocol acceptance also covers SDK `errorCode` values such as `quota_exceeded`
and account rate-limit codes, preserving them through the turn waiter. Billing-setup errors
are excluded. The final full suite passes 1,155 tests with one skip. A first packaging attempt
using a relative output directory stopped at its package-verification path boundary; it was not
launched or installed. Repackage using an absolute output directory before artifact acceptance.

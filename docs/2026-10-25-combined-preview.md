# Combined Design Preview work

## Final release audit — October 25

The operator approved the design and all-device rollout after validation. Earlier holds below are
historical. The retained running preview is the older Activity-only package, whose native and web
notices still sit at the top; it never received the combined queue. Validate the new exact package.

| Requests | Current evidence and remaining gate |
| --- | --- |
| 1–2, 15, 25–26: scrolling, URL/history sync, restored selection, window routing/fullscreen | Shared regression suite and earlier native window fixtures pass. New phone fixture restores the same project/browser from 100 tabs and about 30,000 navigation entries; tall previews stay bounded. Physical-device acceptance remains. |
| 3, 19: keep awake and loaded-tab budget | Desktop controls retained; iOS preferences persist. Actual ordinary defaults are six on desktop and seven on iOS, configurable per device. Persisted pages remain outside eviction. |
| 4, 11: question/composer attachments | Provider transport fixtures and actual encrypted web question/attachment controls pass; native whole-card focus and exact draft/newline preservation pass. |
| 5, 23–24: new-chat selection, common move UI, associated placement | Desktop draft-tab and shared-move fixtures pass. Native associated opening uses canonical owner membership. Verify exact packaged views and existing device state. |
| 6–10, 12–13, 18, 20–22: browser labels/titles/filter/colors, scheduled ownership, auth preference, folder controls, organization, registration, terminal access | Existing combined implementation and owner-boundary tests retained. macOS picker filter/project/rule/keyboard tests pass; SafariSelector is now option 1 with explicit bundle handoff. Registration/default changes remain explicit actions. |
| 14, 27–31: stalls, updater/recovery, first move/hide, remote Continue | Existing fixes and regression evidence retained. Phone schedule notifications now open durable tabs. Remote send retains idempotent IDs, including legacy resume, with delayed-cleanup wakeup coverage. Exact HC delayed-send cause remains unproven until owner metadata can be inspected. |
| 17: common update distribution | Common protocol/feed source exists. Website release `20261026T042545Z` is live with verified recovery/restore/manifest and 14 endpoint checks. Desktop/device updates remain separate. Linux legacy coordinator is explicitly authorized; HC old runtime lacks purpose:update and Windows is offline. |
| 32–34: bottom notices, automatic provider roots, hover paths | Combined source has web/native bottom placement; older retained preview does not. Claude joins Copilot with owner-local automatic roots, forwarded through session wrappers. Link previews remain display-only. |
| 35–37: Resources, allowance continuation, remote/local parity | Actual web renderer acceptance passes shared permissions, models, Activity and Resources, including no-default/reconnect handling. Native Activity/resource/recovery surfaces compile and focused unit/parity tests pass. Owner capability gates remain authoritative. |
| New mobile performance/live push requests | History indexing/search and thumbnail I/O leave the main actor; persistence coalesces off-thread, equal polls do not republish, cold navigation restores identity, attention shows known chat names. APNs payload/routing fixtures pass; live delivery requires the missing paid profile and server APNs setup. |
| New follow-ups | Tab-hosted Internet Search drafts and durable completed-notice dismissal pass switching/reload/restart UI checks. Codex status correction was reproduced against the actual runtime and loads seven models. |

Source completion does not establish installed/live acceptance. This audit is the remaining release
gate, with receipts and blockers in `handoff.md`; do not mark these targets deployed from a build.

### Audit corrections and exact-package observations

The signed `00e90e945951+src.d0f51e3e8295` package passes bottom native notification bounds,
first move/header Hide, ordinary unload, Persisted residency/full history, cold-tab close without
fetch, Resources filters/refresh and Markdown destination previews in disposable UI acceptance.
Its four-provider Activity and project filter/new-chat/workspace-return checks also pass.
The retained human preview is still the older package; these tests do not claim it was replaced.

The history check initially compared a legacy entry before asynchronous owner enrichment against
its acknowledged entry after Hide. IPC tracing showed a forward revision, with identical entry
identity/URL and added requested-URL metadata. The fixture now awaits and captures the completed
navigation snapshot before asserting exact preservation; it does not discard history fields.

A separate intermittent selection regression was found while checking hover previews: a saved
same-window project-follow join could replace the newer document selection with the project root.
Local windows now ignore local presentation snapshots, including their own older actor; canonical
content synchronization and paired-computer following remain active. The acceptance fixture holds
an actual old owner response across a child-selection commit to exercise that interval explicitly.
A new frozen package must include this correction before desktop rollout.

The next operator screenshot also exposed web model-control drift: fixed-context providers still
received a Context menu. Desktop remote and web now share metadata-driven option visibility;
they do not infer controls from provider/model names. An explicit model switch clears options
the new model cannot accept, matching local behavior. Saved unknown settings survive ordinary
catalog refresh. Remote synthetic owner UI and the real encrypted two-host website fixture verify
fixed-context hiding, actual context selection, reset on model change and retained drafts.
Full regression after these corrections: 1,161 passed / one skipped; static/diff checks pass.

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

The complete frozen-runtime source suite passed 1,156 tests with one skip after display-path
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
are excluded. The final full suite passes 1,156 tests with one skip. A first packaging attempt
using a relative output directory stopped at its package-verification path boundary; it was not
launched or installed. Repackage using an absolute output directory before artifact acceptance.


## Final exact-package acceptance

Frozen runtime commit: `f7d32b4a3aad`, on `codex/oct23-next-release`, including local main
`d0a30fd`. The later documentation receipt does not alter runtime inputs.

Review app: `dist/design-preview-combined-queue/Proteus Design Preview-darwin-arm64/Proteus Design Preview.app`.
Build: `f7d32b4a3aad+src.e41ac3955d99`.
Source fingerprint: `e41ac3955d99f49d3808c36ebf6958025ece5028f7e88ffdabfd0076548dc98c`.
All 373 runtime file hashes match both embedded manifest and frozen source. Packaging reports
unsigned local staging; no distribution signature or notarization is claimed.

Final `npm test`: **1,156 passed, one skipped, zero failures**. `npm run check` and diff checks
pass. All six exact-package UI fixtures exit successfully:

- Loaded browser first move 126 ms, ordinary header Hide 45 ms; Persisted Hide retains page and
  complete history. Canonical cold-tab close fetches nothing; resource filter/refresh and native
  bottom notices pass; real Markdown web/relative-file hover previews pass.
- The stale-catalog first move acknowledges and saves its logical identity in 15 ms. The previous
  renderer reproduces the exact 10-second error after canonical movement.
- Shared remote permissions/model controls, owner metadata isolation, retained draft/model choices,
  reset/cancel/preference controls, legacy scheduled Continue, chat path hover and web notices pass
  against a synthetic owner. No physical remote machine was dispatched.
- Local Remember/Add/Revoke, Ask/Saved/workspace modes, read-only overrides, remembered command
  reuse, original-workspace link and draft preservation pass against the actual owner API.
- All four provider Activity formats retain summaries/timing/usage/unknown-field disclosure,
  ordinary messages, source history, streaming disclosure state and drafts; no switcher and 640px
  layout pass. No model turns are generated by this fixture.
- Actual MTPLX catalog controls retain mode/effort choices, saved unsent draft and restart state;
  no model turn is generated. Earlier real MTPLX acceptance remains its own evidence.

Automatic allowance recovery explicitly uses the failed turn's model/options; queued follow-ups
retain their own model choices. Unknown Claude model families conservatively wait for every
exhausted bucket rather than guessing which window applies.

Private evidence outside Git: `../combined-preview-evidence/acceptance.json`, matching copied logs
and `build-source.json`. The receipt distinguishes synthetic protocol/UI acceptance from live
provider/device acceptance. The old retained review process (PID 92872, activity-comparison
package) was observed separately from disposable tests. Its profile has not been switched:
normal operator Quit remains pending and the stale native-control guard is respected. The
installed app, OS defaults, other devices and publication remain unchanged by this work.

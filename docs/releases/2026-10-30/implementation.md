# October thirtieth release implementation

Version: **0.2.39**. State: full release source implemented; final validation/packaging underway.
R1–R13 are authorized, with Mac rollout first and other platforms after HC is verified.
The active branch is codex/oct30-update-command-center. The earlier R11-only source pin is
`34419c1047f5a269ff37f42cc826161c4fb6158a`; later record-only commits do not
change that implementation. A subsequent runtime change requires a new source/package pin.

## Full release source acceptance

- Fusion capability/phase/attribution projection follows the installed Copilot SDK. The refreshed
  account offers no Fusion model; synthetic events pass, real execution is unavailable.
- Emerald Canopy remains default. Daylight's white palette, native control scheme, shared-window
  application and restart persistence pass the disposable Electron UI check.
- Actionable notices use request identities; answered/deleted waits retire alerts, duplicate
  requests deduplicate, routine completion is quiet, and banner queues/ages are bounded.
- Needs attention Clear all acknowledges captured snapshots with stable retry identities. Native
  UI verifies pending questions survive, new requests reappear and async list refresh keeps the button.
- Auto-approve and remembered scopes match host/actions/resources, preserving Ask mode, revocation
  and mandatory approval boundaries.
- Shared membership/order continue while uncertain navigation remains quarantined. A native
  two-window stale-receipt repro verifies owner Close and both strips converge.
- Real synthetic video verifies initial autoplay blocking, runtime enable/disable, deliberate
  Play, unrelated-click blocking and restart persistence.
- Resources adds shared chat/document limits and idle expiry. A native 2,507-event fixture evicts
  data and DOM, reloads earlier pages to the same message/offset, preserves drafts and saves controls.
  Owner tests cover inactive eviction and active execution pins.
- Actual page-generated website notifications now use the normal Proteus history/native event
  path, with original text, origin/source host, silent-sound intent and click callback. The native
  page fixture verifies two distinct events, one silent, plus exact-event deduplication. Explicit
  forwarding uses a portable projection; owner window/profile/activation fields stay private.
  Unsupported server types retain a bounded five-minute/100-event retry window without blocking
  ordinary notifications. Server/APNs and iOS implementation remain after the HC verification gate;
  real Slack and worker/background push are not verified by the page fixture.

These are source/disposable-profile checks. Neither Mac has received the new artifact yet.
The two unassigned update coordinators captured destination defaults and await destination tool
approvals during read-only preflight. Final suite totals and package/source pins follow acceptance.

Final Mac source acceptance: **1,340 tests pass, four platform skips, zero failures**.
Static and whitespace checks pass. Disposable native checks pass for the combined theme/attention/
navigation-conflict repro, existing multiwindow/inactive-workspace/451-entry-history acceptance,
long-history paging and delayed/cancelled restoration, memory eviction/drafts/settings, document
reading positions through app restart, real video autoplay/manual Play, and actual page-generated
website events with original silence/click behavior. These are synthetic workflow results, not
real provider Fusion, live Slack, phone APNs or installed-user-profile acceptance.

## Distribution audit

The existing updater already verifies signed packages on Mac/Linux/Windows, supports owner
maintenance and idle barriers, preserves local recovery/data, and continues the original update
chat after restart. Windows has a designated native owner build operation. Native source can be
synchronized from the authorized repository before first-target packaging.

Read-only public catalog checks on October 30 found macOS arm64 at 0.2.31, Windows x64 at 0.2.35,
and Linux x64 returning HTTP 404. These are distribution observations, not installed-device
inventory. The currently installed command-center tool catalog predates this source contract.

## Implemented

- Exact destination release selection through chat controls; a stable operation ID starts one
  unassigned release-named coordinator using that destination's saved provider defaults.
- Destination release catalogs and bounded chat-specific updater observations. Task monitoring
  continues while the pre-restart model turn is complete but the updater is still working.
- Owner package verification stays separate from migration/test outcomes reported by the
  coordinator. Additional authorized checks are preserved in its prompt and retry signature.
- Multi-platform upload staging, current-version discovery, empty catalogs for pending targets,
  and digest-guarded retirement of superseded public payload directories.
- A named-release record reserves version 0.2.39 once. Plan/implementation/rollout documents,
  release-closeout instructions and artifact/site/simulator retention limits are repository-owned.

## Earlier R11-only validation

Final validation: **1,324 tests passed, four platform skips, zero failures**; `npm run check`
and `git diff --check` passed. The encrypted two-host tests exercise destination defaults,
pinned release selection, uncertain-dispatch retry, controller task restoration, pre-restart
turn completion and post-restart owner observations. Other tests cover version reservation,
current-only staging and changed/corrupt-publication cleanup guards.

The initial full run encountered existing macOS temporary-directory alias and Unix socket path
limits. Re-running with the documented canonical `TMPDIR=/private/tmp` passed without weakening
any assertion. Original failed output and final logs remain outside source. Native cross-platform
installation, real restart/migration acceptance and server retention remain separate.

No native package was built, no update helper or migration was run on live user data, no website
publication/retirement occurred, and no remote installation was dispatched. The existing prepared
local update and the previously closed release's source/artifacts remain intact.

## Native packaging and publication

Use the [standing process](../../release-process.md). Freeze the final source commit after
validation; native builders fetch that exact repository commit. Package/sign/test on the matching
OS. Return package identities before adding a target to the current public set. Consumer machines
wait for matching published bytes. Source availability is not a package acceptance receipt.

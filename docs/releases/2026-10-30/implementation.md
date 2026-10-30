# October thirtieth release implementation

Version: **0.2.39**. State: implemented and source-validated; not packaged or deployed. R11 is authorized.
R1–R10 remain held. The active implementation branch is codex/oct30-update-command-center.
The validated R11 source pin is `34419c1047f5a269ff37f42cc826161c4fb6158a`; later record-only commits do not
change that implementation. A subsequent runtime change requires a new source/package pin.

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

## Validation

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

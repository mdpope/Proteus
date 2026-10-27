# October 26 release branch and worktree audit

Status: branch preparation complete; feature implementation and deployment wait for the operator's model switch and next submission.

## Integrated changes

- Created `codex/oct26-release` from clean `main` at `4b90654706d7` in a separate worktree.
- Refreshed the configured origin after verifying its configured account. This revealed `codex/windows-local-recovery-validation`.
- Merged that branch's `ca767c6` and `e7b3f59` at `592d362`, retaining both sides of two documentation conflicts. The implementation changes are test-only native path corrections; the existing Windows startup-popup cause remains unconfirmed.
- Recovered two absent historical reports unchanged from their branches: [248e2f2 validation](2026-10-19-linux-026-validation.md) and [359c75f validation](2026-10-19-linux-359c75f-validation.md). Their old installation/hold statements describe their dated artifacts, not current instructions.

## Worktrees and source coverage

All three pre-existing worktrees were clean, with no untracked source: main and the October 23 worktree at `4b90654`, and the performance/project-follow worktree at `0fdf5f9`. All nine pre-existing local branches were ancestors of main. Initial release creation made a fourth worktree and tenth local branch. Ignored dependency/build/runtime/receipt/cache material was not treated as uncommitted source or removed.

The refreshed inventory contains 99 remote branches plus the origin HEAD alias. Every branch has a disposition below. Thirteen historical feature branches are **exact aggregate stable-patch equivalents** of main commits (including squash merges), rather than new missing implementation. For later Linux imported source, this audit uses the already-recorded content reconciliation as well as current fixture comparisons: `docs/linux-app.md` explicitly records no missing pre-0.2.29 Linux runtime/build patch, and the October 21 release report explicitly accounts for `4207379`. Source imports must not overwrite newer organized modules. Historical acceptance is not a new live verification.

## Artifact scope

All 49 nonancestor `signed-*` refs were inspected for root inventory, commit descriptions and manifest/receipt type. They are signed-package or delta transport trees with frozen source companions/provenance, not ordinary development branches. Preserve these refs separately; merging them into the application tree would import obsolete binary/package layouts. This is classification and source-lineage reconciliation, not revalidation of every historical binary or a new claim that dirty historical artifacts are byte-identical to current source. Existing main import/acceptance records govern the corresponding source integration.

Nonancestor squash and artifact refs intentionally remain visible to `git branch --no-merged`; that command alone is not a missing-work report. No new unresolved runtime delta was identified in this audit. Refresh remote refs again when implementation begins if other agents have since worked elsewhere.

## Authorized local branch cleanup

After the audit, the operator requested closing old unneeded branches. Eight obsolete local branches were deleted; only `main` and `codex/oct26-release` remain. The two old checked-out worktrees were detached at their existing commits before branch deletion; their files, ignored artifacts and recovery records remain untouched. No worktree directory was removed and no commit was discarded from main/release ancestry.

| Deleted local branch | Retained commit |
| --- | --- |
| `codex/browser-review-controls` | `f08f52c642f682d16c8316a4aa7a351cb4dfbcd1` |
| `codex/client-parity-20261004` | `a65d8df542a295dcc146b723e282576d10f7cf07` |
| `codex/oct-6-022-build` | `ce64d6a75b2f420139c210447c03d2bd6d5d5c2e` |
| `codex/oct-7-implementation` | `ec8b213d382ed24c649ca5a49a5711dca37f4758` |
| `codex/oct22-main-sync` | `fc94afe8516b48aba071fc04d1af2a5eee4b3ddd` |
| `codex/oct23-next-release` | `4b90654706d79930d6c94cca9ead073c77d0d73f` |
| `codex/omi-life-claude` | `cf0aeb00b34017c62d36baeffb7b0e1d467282a1` |
| `codex/stabilize-project-follow` | `0fdf5f9dc78c6dfb2dde36ead29a2d598950de99` |

Git's ordinary deletion check refused `oct-6-022-build` because its old upstream lacks six commits. Both main and release ancestry were explicitly reverified before deleting that local label; those commits are preserved. Remote branch deletion remains a separate scope choice pending the operator's answer. Signed transport/recovery refs are retained.

## Validation

The merged link-routing/updater suites pass **29/29**. The first sandboxed attempt could not create temporary fixtures (`EPERM` in `/tmp`); the authorized run passed unchanged. `npm run check` passes. No runtime or persistence code changed, so the full runtime and live-UI release gates remain for implementation. No application was built, published or installed.

## Remote dispositions

| Branch | Observed head | Disposition |
| --- | --- | --- |
| `origin/codex/agent-tools` | `e9accf048a31` | Exact aggregate stable patch ID matches `9952009e874a` in main |
| `origin/codex/bound-browser-navigation` | `bff7fb37bbc2` | Exact aggregate stable patch ID matches `d3adadf7b13f` in main |
| `origin/codex/chat-steering-providers` | `82d6171f57ff` | Exact aggregate stable patch ID matches `67934f3c22ff` in main |
| `origin/codex/chat-tools-live-permissions` | `da2c66bb98e9` | Exact aggregate stable patch ID matches `61a750a9dd3c` in main |
| `origin/codex/client-parity-20261004` | `a65d8df542a2` | Included by ancestry |
| `origin/codex/context-controls` | `19005f15b81b` | Exact aggregate stable patch ID matches `a31e9b470fb9` in main |
| `origin/codex/embedded-browser-settings` | `a614b76d4d13` | Exact aggregate stable patch ID matches `ec0490c77aa9` in main |
| `origin/codex/hc-copilot-quota-auth` | `c67a61a2291a` | Reconciled: quota auth factory and regression present; acceptance audit explicitly cites `c67a61a` |
| `origin/codex/mcp-auth-feedback-signing` | `15901ca71bc8` | Exact aggregate stable patch ID matches `1f61b9b3b1dd` in main |
| `origin/codex/oct-6-022-build` | `14679672c962` | Included by ancestry |
| `origin/codex/oct-6-build-handoff` | `f2ae3dd15f18` | Historical intake: report and all three design files byte-identical; accumulated queue superseded by subsequent releases |
| `origin/codex/oct-7-implementation` | `ec8b213d382e` | Included by ancestry |
| `origin/codex/oct22-main-sync` | `fc94afe8516b` | Included by ancestry |
| `origin/codex/oct23-next-release` | `4b90654706d7` | Included by ancestry |
| `origin/codex/omi-life-claude` | `cf0aeb00b340` | Included by ancestry |
| `origin/codex/remote-clients` | `abc3ecd0a30d` | Exact aggregate stable patch ID matches `9febe8e9c490` in main |
| `origin/codex/rich-chat` | `84cb25de311f` | Exact aggregate stable patch ID matches `b149d6ea532c` in main |
| `origin/codex/signed-follow-input-b2ac0-20261023` | `63383c77e038` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-follow-notice-7a1569-20261023` | `c3ee9848d1b5` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0211-20261010` | `380e15c262d3` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-022-20261007` | `b34b2c888ff3` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-022-selection-20261007` | `2f0c4b988ce5` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0220-20261015` | `418a083995fb` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0221-20261018` | `f000b7f69cbf` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0222-final-20261019` | `829393e7b611` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0223-20261019` | `185a916612f8` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0224-20261019-find` | `d59bf4d0b79c` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0225-20261019-sites` | `d6977b8bbb7f` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0226-20261020` | `f7d23040d2ba` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0226-focus-20261020` | `37da6fa3e360` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-0226-followup-20261020` | `39f90a3c9471` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-023-c5bda429` | `7c31af83aeb5` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-023-followup-56a074d` | `b4d9a5b68f4b` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-024-72d198e6` | `dee59326afb1` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-025-f129d55` | `f5598cd07877` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-026-cb1d022` | `fd768ca9825b` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-027-1b37ccd` | `1e9e9205967a` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-027-7d78-20261021` | `1fb5c3824a39` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-027-a0df-20261021` | `31480f3f9deb` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-027-e9e2-20261021` | `e86a11f40891` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-028-0e5c-20261022` | `19b8239a3571` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-028-48cb793` | `2988161f92d7` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-028-8011-20261021` | `acb7f0c438bf` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-028-aa0b-20261021` | `97f902578a9c` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-029-207916-20261023` | `f35c45ebd0b5` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-029-7c7393c` | `a4d6c0ae4417` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-029-cb197-20261022` | `0133401fc798` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-029-ce9f-20261022` | `3a01fba0edaa` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-assembly-20261012` | `7b08858daaf5` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-delta-20261006` | `a9b4c40afdfe` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-history-20261010` | `acc0f315d01e` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-missing-folder-20261012` | `6b9413c78259` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-performance-20261012` | `914f61e8a452` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-performance-20261018` | `12d93632b3b7` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-polish-20261012` | `df45a899bd05` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-scheduler-20261012` | `ce2a662190df` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-search-layout-20261013` | `2193ce3995ae` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-tab-stability-20261013` | `1eecf5b105f8` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-tabs-20261014` | `6764be68e906` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-tabs-canonical-20261014` | `82cd923e2e2e` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-tabs-compat-20261014` | `d2390007cd28` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-tabs-placement-20261014` | `3f7c5da4cb76` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-unified-20261013` | `de0eb64e79aa` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-unified-startup-fix-20261013` | `94b7adc94a7c` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-unified-team-refresh-20261013` | `96eb61963b75` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/signed-proteus-workspaces-20261012` | `887a98038356` | Historical artifact transport; retain separately (see archive scope below) |
| `origin/codex/timeout-recovery` | `14ef08f216ad` | Exact aggregate stable patch ID matches `c8b6f8ee0be6` in main |
| `origin/codex/tool-exit-status` | `936dd7cf6778` | Exact aggregate stable patch ID matches `c206f6ac6d1a` in main |
| `origin/codex/windows-desktop` | `f532671fe12b` | Included by ancestry |
| `origin/codex/windows-fixture-path-escape` | `76626a78412f` | Included by ancestry |
| `origin/codex/windows-fixture-readiness` | `2c1926ae0373` | Included by ancestry |
| `origin/codex/windows-local-recovery-validation` | `e7b3f597653a` | Included by ancestry; merged for this release at `592d362` |
| `origin/codex/workspace-context` | `b8bb8d9948a3` | Exact aggregate stable patch ID matches `e2a0d1373025` in main |
| `origin/codex/workspace-permissions` | `cbcaafe4f15e` | Exact aggregate stable patch ID matches `36c5a8118ae6` in main |
| `origin/docs/oct-7-next-version-intake` | `dfc621c1ea20` | Historical intake: report/design byte-identical; main `9bcc899` retains next-day intake |
| `origin/linux-current-mac` | `7c7bc54aff6d` | Included by ancestry |
| `origin/linux/0.2.29-acceptance` | `668128d7eade` | Included by ancestry |
| `origin/linux/248e2f2-validation` | `1b08731ee0d9` | Recovered missing dated report in this release; browser/window fixtures identical; portable updater carried by `e350395` and extended since |
| `origin/linux/359c75f-validation` | `3f01f92eb26b` | Recovered missing dated report in this release; browser/window fixtures identical; portable updater carried by `e350395` and extended since |
| `origin/linux/c41ffa5-validation` | `5f5a20a5c5af` | Browser/window fixtures byte-identical; main `0c790d8` and current Linux build record retain validation |
| `origin/linux/combined-ef05d03` | `ef05d03a1cee` | Included by ancestry |
| `origin/linux/docs-029-reconciliation` | `b0189f359fa4` | Included by ancestry |
| `origin/linux/fixture-native-readiness` | `a0324fbc895a` | Included by ancestry |
| `origin/linux/follow-490fd62` | `490fd629b659` | Included by ancestry |
| `origin/linux/follow-download-barrier-notes` | `57f0e87aecb8` | Historical documentation only; source failure/context and cookie/history exceptions retained in current handoff/planned-updates; Linux context implementation now supersedes deferred status |
| `origin/linux/follow-fresh-input-2c335a5` | `2c335a5151a4` | Included by ancestry |
| `origin/linux/follow-notices-88bdfd8` | `88bdfd8afd02` | Included by ancestry |
| `origin/linux/follow-pending-presentation` | `252b797afe70` | Included by ancestry |
| `origin/linux/followup-e350395` | `15b7b3bac06b` | Included by ancestry |
| `origin/linux/main-026-rollout` | `0bdeb83c89cd` | Included by ancestry |
| `origin/linux/next-release-0226-validation` | `9439f24c4979` | Startup repair integrated before `c41ffa5`; documented in linux-app.md and October 19 integration record |
| `origin/linux/passive-save-7290ff3` | `7290ff3f4930` | Included by ancestry |
| `origin/linux/redirect-metadata-convergence` | `eb508cbdd4c2` | Included by ancestry |
| `origin/linux/release-0.2.27-e86a11f` | `3a9a5cfe11e4` | Reconciled source/import history: `f767783`, `5b8b708`, October 21 release report and linux-app.md content audit; do not replay older source imports |
| `origin/linux/release-0.2.28-0e5c` | `d012d2711611` | Reconciled source/import history: `f767783`, `5b8b708`, October 21 release report and linux-app.md content audit; do not replay older source imports |
| `origin/linux/release-0.2.28-aa0b` | `1556e5003678` | Reconciled source/import history: `f767783`, `5b8b708`, October 21 release report and linux-app.md content audit; do not replay older source imports |
| `origin/linux/window-controls-relay-readiness` | `717e6098167e` | Reconciled source/import history: `f767783`, `5b8b708`, October 21 release report and linux-app.md content audit; do not replay older source imports |
| `origin/linux/window-controls-relay-readiness-027` | `4207379e0eb1` | Reconciled source/import history: `f767783`, `5b8b708`, October 21 release report and linux-app.md content audit; do not replay older source imports |
| `origin/main` | `4b90654706d7` | Included by ancestry |

# Windows distribution and maintenance

An approved Windows update authorizes the bound owner operations needed to
maintain Proteus, preserve recovery, install the accepted package and restart.
It does not require a general elevated shell or an interactive Windows test
account. The initiating computer creates an unassigned `purpose:update` chat
using its saved update defaults, validated on the destination, and monitors its durable task through
restart. Model completion alone is not an installed update.

The operator designates one Windows computer as the first Windows build and
acceptance target. That designation and its actual paths live in the private
installation-bound `windows-builder.json`, never in repository instructions.
Other Windows installations consume the signed WTB release and do not need
Node, npm, Git or the publisher key.

The candidate helper verifies its accepted package and full Windows installation
hash before acknowledging readiness, keeping the old owner open on a mismatch.
It verifies again before replacement. Both observations retain complete file/hash
evidence beside the job journal, outside candidate staging, because an older owner
can otherwise remove that staging after a failed pre-install recovery. No unexpected
file is excluded from package integrity. The native distribution runner checks the
tested extraction again after UI/PTY/restart acceptance and preserves it on failure.

The first October 29 bootstrap passed signing, extraction and old-owner smoke but
failed before replacement. The baseline reopened with verified health and the same
chat continuation. Its old retirement record reported one extra file / 166 bytes;
the retired copy did not identify the file. A controlled smoke/helper-readiness
reproduction left the package unchanged. This remains an unclassified live failure,
not proof of a logging cause or permission to relax hashes. The added evidence and
pre-readiness check address diagnosis and restart ordering; live installation still
requires a separately verified result.

A second initial-package attempt passed two live staging comparisons and a
read-only watcher, captured a recovery, then rolled back later. The old completion
path cleared the transient error without retaining its cause. The helper now
records original failure/phase receipts outside staging and carries their summary
in the checkpoint and status. These diagnostics must identify a subsequent
failure before an installer or process-lifetime cause is asserted.

## Normal update

1. Inspect `proteus_update status`, `maintenance` and `resolve-release` for the
   exact version and source commit/fingerprint. A catalog/network/signature
   error stops; it is never interpreted as an absent release.
2. Apply a clean maintenance plan with `maintain` and its current `planDigest`.
   The owner verifies the complete recovery app and data trees. It can register
   an unregistered generation only with its completed owning journal. Missing
   historical directories become explicitly unavailable history while their
   old hashes and the original policy remain in a compact audit receipt. No
   missing recovery JSON is recreated, and no old data is restored over work.
3. Reuse a matching signed published release. If absent, only the configured
   builder uses `build-release` with a stable operation ID, exact version,
   source commit and channel. `build-status` reports its durable progress.
   A repeated operation returns its existing journal; an interrupted operation
   needs reconciliation and is not replayed. After inspecting a failed build,
   `cancel-build` with its operation ID and `buildRequestHash` can close its
   receipt only after the process has exited, permitting a different operation
   without editing application files. It fetches through the existing
   repository-local account route, builds in private updater folders, runs source
   and exact-package acceptance, verifies official archive extraction and signs
   using the configured protected key. No key is copied or trust replaced.
   A recorded launcher PID that has exited is attention even before the worker's
   first progress write. A missing PID is still an uncertain launch, and a live
   PID stays protected. Inspection never rewrites the original launch evidence.
4. Import/stage the exact signed release, checkpoint completed and remaining
   work, hand off, then finish the turn. The existing independent supervisor
   waits for chats, terminals and builds, captures consistent current data,
   installs per-user and restarts. The same chat resumes once.
5. Verify installed hashes/registration, health, preserved histories/configuration,
   native control and two-generation recovery retention. Publish the exact
   accepted Windows artifacts to WTB through the authorized deployment workflow;
   source and private receipts stay private. Verify the public full download
   through the actual installed consumer. Publication is a distinct outcome.

Maintenance accepts no deletion path or shell command from the model. Its plan
binds canonical installation, data and browser homes, known recovery roots,
policy bytes, journal revisions and verified generations. Changed plans fail.
Unknown/partial generations, changed bytes, active updates and a total loss of
verified recovery remain explicit blockers. Newest two complete generations are
retained; eligible older generations and completed candidate staging may retire.
Every action reports actual observed free-space change, which can include
concurrent filesystem activity. Building alone never creates a live-data backup.

Maintenance retirement uses the helper's intent/receipt approach: first retain
the original policy, the reconciled inventory and each retiring generation's
complete original receipt bytes and parsed fields outside that generation.
Only then remove verified eligible payloads and update policy; a separate
completion receipt binds the intent hash. A missing completion is an interrupted
retirement even if policy was already saved. Future maintenance reports that
condition and blocks writes rather than recording its own deletion as unavailable
history or replaying it. Damaged intent/completion evidence also requires inspection.

The supervisor budgets a temporary third recovery rather than deleting an older
verified generation before capture. After both the new full recovery and live
outcome verify, it rechecks all retained app/data trees and retires only eligible
generations older than the newest two. The original policy, retired receipts,
survivor hashes and actual space delta stay beside the journal. Capture or new
recovery verification failure leaves both existing generations intact. An
interrupted retirement requires reconciliation; it is not replayed blindly.

## One-time older-client bootstrap

Older 0.2.29 installations cannot create `purpose:update` chats. Do not invent
that capability or silently turn an old build chat into a new coordinator.
Prepare and test the bootstrap with the existing authorized build context,
then use its existing owner signed import/idle handoff. After restart, create
the real fresh coordinator for installed acceptance and subsequent upgrades.

The reviewed `scripts/update-maintenance.mjs` is an adapter for the same owner
maintenance implementation. Supply canonical `--home`, `--installation` and
`--browser-home`; include each known external legacy `--recovery-root`. Inspect
its read-only plan before `--apply --plan-digest HASH`. It writes only the
bound recovery inventory/audit and retires eligible recovery/staging. It never
modifies live data, grants, credentials or the installed runtime. Existing
unknown roots must be audited; absence of a policy is not an empty inventory.

On the designated builder only, `scripts/windows-builder-setup.mjs` captures
the exact existing `--source`, `--node`, `--npm-cli`, `--git`, and
`--publisher-key` references against `--home` and `--installation`. This needs
ordinary user access, not elevation. It refuses a different source origin,
unprotected key or a differing existing configuration. Use the existing account
and protected key; never guess another account or initialize new signing trust.

Workers derive a private child environment from those configured Node/Git
directories plus the inherited search path. Windows `Path`/`PATH` variants are
combined into one key. npm lifecycle scripts therefore find the same Node binary
even when the desktop owner launched without developer tools on its PATH; no
global environment or login setting is changed. An older installed builder that
lacks this correction needs a reviewed source-module bootstrap, not an edit of
the installed worker or a replay of its failed operation.
Keep that temporary bootstrap adapter running until its worker reaches a terminal
receipt, so its process context and exit handler remain available. Do not assume
a one-shot command's children survive the command runner's process lifetime.

Each worker creates one private `toolchain/npm.cmd` under its own operation. It
invokes the configured absolute Node and npm CLI paths and preserves their exit
status; only the child PATH includes it. Electron Builder resolves npm by command
name, while Corepack's cached package can contain shims meant for a different
installation layout. Never add those unusable shims to global PATH or install
another npm merely to satisfy packaging. Existing per-operation shims cannot be
overwritten, and paths are quoted with batch expansion disabled/escaped.

The release runner is `scripts/windows-distribution.mjs --source-commit SHA
--output ABSOLUTE_NEW_DIRECTORY --build-if-missing`. It requires the selected
source checkout and local dependencies/toolchain. `--key` supplies an existing
protected key path when signing is authorized. Its receipt distinguishes build,
acceptance, publication and installation. Native generated assets remain bound
by the final source fingerprint; signed `sourceCommit` enables reuse of an
already-published build before compiling again.

## Qualification and native control

Run source/static and exact extracted package UI/PTY/restart acceptance for each
new build. The unchanged NSIS installer recipe has prior real installer/update/
rollback qualification; routine application updates do not recreate accounts
solely to repeat it. Changes to installer/registration/replacement behavior need
disposable native qualification. Never run the existing installer harness against
live HKCU registration or relax its refusal. A missing Sandbox/test account is
an explicit qualification limitation, not a request for the operator to type a
sequence of elevated scripts. The actual live update still needs its own exact
installed-byte, preservation and health acceptance.

Cua Driver is the Windows native-control backend. An explicit update/setup
authorization can include its official per-user installation. Proteus discovers
`cua-driver.exe` in the user's `.local/bin` even before a PATH refresh. Verify
official release hashes/signatures, status/catalog/permissions and an exact-window
observation; use fresh observations for input and release the lease afterward.
OS denial is never bypassed. Backups and installation use owner services instead
of desktop input. Zoho Assist is an optional initial repair surface, not the
steady-state updater dependency.

## Acceptance status

The corrected 0.2.34 maintenance bootstrap is installed and healthy on the
designated Windows target. Full recovery rotation and same-chat continuation
passed, and its immutable public files passed actual installed-consumer download
and extraction. Stable-feed activation is held for a reproduced saved-chat-view
preservation issue. The 0.2.35 source fix preserves never-registered local chat
aliases just like peer aliases, without reopening owner descriptors or overriding
an observed close. See [acceptance evidence](2026-10-29-windows-distribution.md).

Creating a fresh update coordinator grants its bound updater operations. Native
desktop control retains its separate human approval boundary; a pending approval
must not be answered by another agent or bypassed through an older chat. The new
coordinator's captured options are distinct from saving future Windows defaults.

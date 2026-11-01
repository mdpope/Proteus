# Named releases and distribution

## Signing an accepted payload on the publisher host

When a native builder and publisher use different platforms, preserve the exact accepted payload
bytes, including its target and dates. `scripts/sign-desktop-payload.mjs` accepts absolute
`--payload`, `--key` and new `--out` paths, the payload's `--sha256` and full `--source-commit`.
It checks the byte hash and source pin, uses the existing private Ed25519 key outside the source
checkout, and runs the normal updater verifier with the native target and bundled publisher trust
before writing an exclusive envelope. The CLI cannot select another trust store. Do not use this
helper as evidence of native acceptance: retain the builder's package/source receipts separately.
A release-operation helper can have a later maintenance commit without changing the frozen
application/source-companion pin or rebuilding accepted application bytes.

This is the standing Proteus release process. A release has a human name, one reserved application
version, repository documents and a per-machine rollout ledger. The coordinating Mac owns the
release; each destination owns its installation, data, credentials, migrations and acceptance.

## Open a named release once

Run `node scripts/release.mjs status` before starting release work. To open a new release:

```sh
node scripts/release.mjs open --id 2026-10-30 --name "October thirtieth release" \
  --date 2026-10-30 --plan docs/2026-10-30-release-plan.md
```

Opening reserves the next patch version in package.json and package-lock.json, creates the release
record, implementation notes and rollout ledger, and updates `docs/releases/current.json`.
Repeating the same open operation returns the same version. Builds, retries and additional native
platform packages do not increment it. A different named release requires closing the current one.
Changes to an already signed package produce a distinct build/hash within the open version.

The October thirtieth release is **0.2.39**. The operator subsequently authorized R1–R14 and
all intended platform rollouts after Work Mac's verified installation. Earlier collection holds are
historical. The release remains open until the final corrective packages, publication and device
acceptance are reconciled in its implementation and rollout records.

Every release keeps these repository records:

- Plan: requested scope, accepted changes, held work and acceptance criteria.
- `docs/releases/<id>/release.json`: name, version, state and document references.
- `implementation.md`: implemented source, validation, package identities and limitations.
- `rollout.md`: each intended machine, requested version, stage, actual installed build, tests,
  migrations, verified preservation and remaining work. Non-secret machine labels are sufficient.
- `closeout.md`: final main/source pin, PR/branch/worktree disposition, public retention and deferred
  installations. Small historical documents stay in Git; binary payloads and private receipts do not.

## Build once for each native target

Before preparing another version, reconcile a superseded nonterminal job. An agent-bound job
can be cancelled by its original update chat, not a new coordinator. Have the authorized command
center request limited cancellation there and verify the owner result; keep the new coordinator
responsible for the new installation. Do not move ownership by editing a journal or reopen an
older release's implementation. The desktop Updates screen is the operator's cancellation path.

Returned task feedback to a different chat is data, not a new human update-cancellation request.
It must retain the checkpoint while its queued/running work still blocks idle. Real user input,
or any new input into the updating chat itself, requires a reviewed handoff. On a downlevel
command center with the old all-input guard, keep final local handoff feedback non-notifying and
end the originating turn normally; do not force idle or cancel unrelated work. Verify the owner
and resumed coordinator after restart rather than treating a pre-restart task report as success.

1. Freeze a full repository commit for the requested version and record it. Synchronize the
   designated native builder directly from the authorized repository using its own existing
   authentication. Fetch and check out that exact commit in an isolated checkout; preserve its
   existing work. Never build from an unspecified branch tip or substitute source after acceptance.
2. Check the destination's signed platform/architecture catalog for that exact version and source.
   Reuse a matching package. A failed HTTP, authentication or signature check is a distribution
   failure, not evidence that a package is absent.
3. If the package is genuinely absent, only the designated first builder for that target builds.
   Windows uses the existing owner `build-release` operation and private configured toolchain/source
   references. Linux and Mac builders use the repository's native package and acceptance commands
   in their authorized source environment. Configure only the actual source/build access needed;
   consumer installations need no source checkout, compiler, Node/npm or build toolchain.
4. Run source/static checks, native packaging, official extraction and exact-package acceptance.
   Check migrations and rollback compatibility. Sign the accepted immutable package with the
   existing publisher key and preserve matching source provenance. Source tests and model completion
   do not prove that a package was installed or that its live workflow passed.
5. Return exact package/manifest hashes and accepted native artifacts to the command center.
   Publish them once. Subsequent machines download those bytes rather than rebuilding. A late
   Windows/Linux package is added to the same named/versioned release.

Use a new unassigned `purpose:update` coordinator for each destination installation. Its saved
Engine Room defaults are resolved on that destination. A native build can be coordinated before
the package exists; installation starts only from a verified package. iOS stays on the guided Mac
workflow and uses the release version when its next native build is prepared.

## Publish one current generation on downloads.proteus.example

Each target retains one current package generation. Windows' installer and update archive are
different required delivery formats, not extra historical generations. Keep no old versions,
duplicate upload archives, source checkouts or build intermediates on the public server.

The signed envelope carries the complete source commit used by exact-version resolution. For
older Mac provenance with only a short Git revision, `sign-desktop-release.mjs --source-commit`
accepts the full pin only after checking every recorded runtime/build input against that immutable
Git tree. A matching prefix alone is insufficient; dirty or changed source fails publication.

```sh
node scripts/stage-desktop-distribution.mjs /absolute/new-public-staging \
  /absolute/mac-signed-release /absolute/linux-signed-release /absolute/windows-signed-release
```

Save its JSON output as a private distribution receipt outside the public staging tree. Supply
all currently available targets for the open version. When a later native package becomes ready,
include the existing same-version packages again in the staging set; reuse verified identical
immutable server files rather than making another copy. Staging rejects mixed versions and
duplicate targets, and includes only signed public artifacts, catalogs and download pages.

Deploy through the existing WTB website operations owner: immutable files first, then platform
catalogs and `downloads/proteus/current.json`, then pages. Verify hashes and actual HTTPS downloads
before retiring prior release directories. Missing targets get empty catalogs so consumers cannot
silently select a superseded version. The public current descriptor advertises the release name,
version and available targets; signed platform manifests remain the installation trust boundary.

Transfer packages with the configured deployment SSH account. Verify its documented identity and
credential-provider options before diagnosing authentication failure. Provision the necessary
scoped deployment access through the authorized administrator workflow when access is missing;
do not replace that repair with browser uploads or chunked browser transfers. Delegate writes only
to public Proteus downloads and private agent staging. Protected hosting verification can use a
fixed read-only audit command; retain the existing bounded website updater. Keep exact account,
key references, permission receipts and hosting commands in the private deployment workspace.

After recovery verification and upload, use the server's exact public root and the distribution
receipt to inspect and apply current-only package retention:

```sh
node scripts/desktop-publication.mjs /absolute/public-root /absolute/distribution-receipt.json
node scripts/desktop-publication.mjs /absolute/public-root /absolute/distribution-receipt.json \
  --apply EXACT_PLAN_DIGEST
```

The planner verifies every new public file and fingerprints obsolete payloads. Applying rejects
changed plans and removes only superseded directories under `downloads/proteus/releases`.
It does not clean website backups or other server content. Verify that obsolete downloads are
gone and that current catalogs/downloads still work. A short in-flight replacement overlap ends
as soon as the new generation has verified; it is not a second retained release on the server.

## Push and observe from the command center

1. Discover current computer IDs and obtain the applicable chat access scope. Select the intended
   targets explicitly; a paired or online computer is not automatically an update target.
2. Call `proteus_chats` with `action:update-releases`, destination `hostId` and channel. This
   returns that machine's platform/architecture and its verified available releases.
3. Call `create` with `purpose:update`, the same destination, a stable UUID `operationId`, and
   `updateRelease:{releaseId,manifestDigest,channel}` from the selection. Include any required
   migration/acceptance instructions in `prompt`. Omit provider/model overrides. Set `notify:true`
   when the originating chat should continue automatically on returned feedback.
4. Keep the task receipt. Use `wait` with its taskId and returned cursor through preflight,
   active-work holds, download/test, restart, same-chat continuation and final checks. Never retry
   an uncertain dispatch with a new operation ID or start a second coordinator to force progress.
5. The destination updater verifies signer/target/hash/compatibility and backs up its own data.
   It waits for unrelated work, performs replacement and resumes the same coordinator. That chat
   completes the checkpointed migration/test/preservation work and reports real outcomes.
6. Update the rollout ledger. `update.packageVerified` means the owner verified package health;
   it does not certify every migration or workflow. Model completion alone never means installed
   or live verified. Preserve blocked, rollback, offline and deferred outcomes accurately.

Older clients without `chat.update-release.v1` require the documented bootstrap rather than a
silent fallback. Do not cancel unrelated work or replace an existing prepared job to test this flow.

## Retention limits

| Location | Steady-state limit |
| --- | --- |
| Public desktop downloads | One current release generation per platform/architecture; no back versions |
| Local native application artifacts | At most two verified generations per platform/architecture; one app per generation, no duplicate staging/rollback/transfer copies |
| Installed-device recovery | At most two verified full generations per distinct installation/data home or physical device, following the existing updater rules |
| Website on its server | One live site and at most one verified recovery backup; no second backup tier or duplicate old deployment trees |
| Local website recovery | At most two verified complete recovery generations, including code, database and required uploads/configuration recovery references |
| iOS simulators | Reuse the shared phone/tablet pool across Proteus and Mnemosyne; no per-project duplicate devices/runtimes |

These Proteus limits supersede older broader website retention defaults and dated instructions
that kept two website backups on the server. Retire superseded copies only after the retained
replacement is verified. Inventory all relevant roots first, preserve active work and incomplete
recovery evidence, and report actual free-space change. Any temporary exception needs a named
reason and a deletion condition; an unresolved exception must be reported, not called cleanup.
Do not create a full live-data backup for build-only tests.

Before simulator testing, inventory existing devices and installed runtimes and reuse a compatible
shared iPhone/iPad. Keep unique required runtime/device coverage only. Inventory and retire unused
test-created duplicates and obsolete build products during closeout; preserve other applications,
pairings and active tests. Do not erase a shared simulator or create copies to isolate a project
without a specific need.

## Close means integrate and move on

When the operator finishes/closes a release, perform this workflow without asking again for its
routine integration and cleanup:

1. Reconcile all release-related implementation branches, PRs, worktrees and dirty changes. Run
   required local validation. Merge the validated PRs/branches into main, resolve conflicts and
   preserve other agents' work. Never merge obsolete binary transfer histories into source.
2. Fetch/synchronize and push main using the repository's verified account; verify the remote main
   contains the release commits. GitHub Actions remain disabled. Do not claim this step from a
   local commit or a dispatched remote chat.
3. Record rollout outcomes, remaining limitations and deferred targets. The operator may close a
   release with deferred device installation; deferred rollout does not reopen that release.
4. Verify current-only public retention and the backup/simulator limits, or record a precise
   external-access blocker without destructive guesses. Remove merged release branches and
   release worktrees after their work is safely in main; keep the primary checkout and active work.
5. Write the closeout, set the release record to `closed` with the final source pin and close date,
   commit/push the closeout and verify local/remote main again. A closed release is historical.
   Further work belongs to a new named release and gets the next version once.

Repository records contain non-secret operational status. Keep credentials, host IDs, private
paths, raw chat content, full backups and private machine/recovery receipts outside Git.

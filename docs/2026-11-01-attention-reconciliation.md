# Post-install recovery reconciliation

A desktop update can install and pass owner health, then enter `attention` because retirement
finds a changed older recovery. After an independently reviewed repair restores the exact
receipt, the old updater has no supported way to release its maintenance hold. Cancelling is
deliberately limited to pre-handoff; resuming ordinary work does not resolve the failed operation.

The owner maintenance service now supports a separate reconciliation receipt. The original
journal, error, health, preservation receipt and continuation identity remain unchanged. This
operation never installs, restarts, restores data, repairs files, edits recovery policy, deletes a
generation or replays a provider continuation. It does not establish current UI responsiveness.

## Eligibility and verification

Only the exact `Recovery data differs from its receipt.` post-install attention case is eligible.
The job must report `updated`, verified matching package health and an operator's existing
**Resume ordinary work** acknowledgement. Pre-install, rollback, ambiguous continuation and
unreviewed failures remain blocked. The same health-recorded owner PID must still own the runner
lock and connection record and be alive; a restart or different installed package needs fresh
review rather than silently accepting stale evidence.

The service binds canonical installation/data/browser roots, exact job ID/revision, full installed
package/signing identity, original preservation hash and health counts. Every registered recovery
must fully verify, including the job's recovery, with at least two verified generations and no
missing/discovered copies or other unresolved updates. Active helpers and helper locks stop the
operation. Reconciliation does not waive any failed checksum or grant arbitrary filesystem access.

Read-only planning returns a digest. Apply repeats verification under an exclusive per-job lock
and refuses changed inputs. It writes `attention-resolution.json` without replacing an existing
receipt. Lost responses reconcile against that same receipt. Later maintenance validates its
binding to the byte-identical original journal and fully verifies recoveries again. A changed
journal or malformed receipt blocks maintenance. Resolved-attention staging retirement writes a
separate receipt so the original journal stays intact.

## Owner API and older-client adapter

New packaged owners expose `proteus_update` actions `reconciliation` and `reconcile`, with exact
`id`, `expectedRevision`, and the plan's `planDigest` for apply. Only the original update chat or
desktop operator can resolve that job. Engine Room offers **Recheck repaired recovery** after
ordinary work was resumed; it retains the original failure and reports reconciliation separately.

The existing `scripts/update-maintenance.mjs` is also the bounded source-owned older-client
bootstrap adapter. Use a reviewed, tested source pin and normal destination filesystem approval:

```sh
node scripts/update-maintenance.mjs --home /path/to/data --installation /path/to/app \
  --browser-home /path/to/browser --reconcile-job JOB_UUID --expected-revision REVISION
```

Inspect that plan, then repeat the exact command with `--apply --plan-digest DIGEST`. This uses
the same service as the API; it is not a standalone call to a helper retirement function. After
the reconciliation receipt verifies, inspect ordinary maintenance separately and apply only its
fresh digest. That second operation owns any eligible policy rotation/deletion and reports the
actual space change. Preserve the original incident and repair/quarantine evidence.

An older running binary does not gain new API actions by downloading source. Its status may
continue showing historical `attention`; use the reviewed bootstrap receipt and actual maintenance
results honestly until a later accepted package exposes the new UI/API. Do not relabel an existing
binary, patch its signed files or call an unavailable action.

## Acceptance

Disposable tests cover exact receipt binding, refusal of stale health/revisions, changed packages
or recovery bytes, missing owners, active helpers, unrelated updates, linked metadata, corrupt
receipts, response reconciliation and verified two-generation rotation with an unchanged original
journal. The native Electron UI fixture exercises refusal of a changed plan and the successful
reconciliation display while retaining the historical error. Local tests do not establish that a
particular destination has applied reconciliation or retired a generation; record those separately.

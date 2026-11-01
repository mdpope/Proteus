# Nov 1 rollout

Version: 0.2.40

**Desktop promotion paused.** Linux's causal renderer trace found a production race in the
shared membership application path: an older owner response could remove a newly opened local
tab that had not reached that owner yet. Corrective source and native desktop acceptance must
supersede the initially accepted `4a36d70` packages. Earlier installation/preservation evidence
below remains valid for its stated coverage; it does not establish this new race corrected.

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Primary coordinator/builder | macOS arm64 | 0.2.40 | blocked | Earlier signed package published; corrected shared source/package pending. Installed coordinator remains on 0.2.39, no handoff. Historical incomplete recovery evidence remains preserved. |
| Secondary Mac consumer | macOS arm64 | 0.2.40 | live verified | Installed build `4a36d701265d+src.93737225fa40`, owner health verified. Two five-minute visual/owner-response intervals and a separate 624-sample RPC soak completed. Full record comparison below; typing and direct event-loop lag were not measured. |
| Designated Windows builder | Windows x64 | 0.2.40 | blocked | Earlier native accepted build `windows.89f389291a3b` published/HTTPS-verified, then staged and cancelled through owner before handoff. Installed build unchanged. Corrective source pending. |
| Windows consumer | Windows x64 | 0.2.40 | blocked | Earlier binary staging paused before handoff; installed build unchanged. No source build/toolchain installation. |
| Designated Linux builder | Linux x64 | 0.2.40 | blocked | Native source/static and disposable transition checks pass. Exact trace identifies the shared selected-tab deletion race; separate corrective source and deterministic Electron regression are in progress. Nothing published or installed. |
| Physical mobile devices | iOS | 0.2.40 / 2611.1.1 | installed | Both paid-signed apps installed and launched; all 301 phone and 190 tablet cold baseline files hash-match before first controlled launch. Saved destinations preserved. Actual General sync/reconnect/push and hands-on provider acceptance remain pending the updated desktop owner. |
| Website | Web | 0.2.40 | live verified | Source-pinned deployment, 14 endpoint probes and nine complete served asset hashes pass. Recovery used qualified capture-state mode; ordinary isolated restore is a separate unresolved baseline check. |
| Future Mac consumer | macOS | 0.2.40 | deferred | Not installed or paired yet; no destination invented. |

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

## Secondary Mac preservation

The legacy supervisor verified 592 run prefixes and 47,583 events; it did not capture the new
navigation inventory. A separate comparison of its verified cold recovery with current records
found all three workspaces, 11 projects, 65 scopes and 215 ordered content descriptors preserved,
including 75 embedded histories. Project defaults and memberships match. Across ten saved
window sessions, all logical identities/relative order, 343 embedded view histories and 47 drafts
survive. Two strict window hashes differ in selected-child state; active selections match.
The authoritative browser database retains all 333 navigation tabs and 1,944 entries, including
entry payloads, order and selected entry. Settings, permissions, pairing/profile records and
encrypted credential files match byte for byte. The recovery verified 19,535 files and retained
two full generations after retirement. This establishes record preservation, not authentication
against every live integration or interactive typing performance.

## Remaining live acceptance

Complete the primary Mac, both Windows installations and the Linux package gate/rollout; verify
desktop/mobile General convergence and offline intent replay on the installed owner, real
extension authentication/autofill, and notification expiry. Retain explicit qualification where
physical gestures or provider authentication have not been observed. Do not close this release
from a model-completed status or an aggregate tab count alone.

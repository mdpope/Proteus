# Nov 1 rollout — final record

Version **0.2.40**. Accepted corrected desktop source: `11ca09b84408bab3a630daeea8fa12c8e373e5fc`. Earlier `4a36d70` desktop packages were superseded.

| Target | Actual result | Preservation and limitations |
| --- | --- | --- |
| Primary Mac | `11ca09b84408+src.6ffbf405fbc6`, complete/updated, healthy, continuation delivered | Seven workspaces, 17 projects, 46 scopes, 217 canonical descriptors; 75 run prefixes/58,644 events; 450 browser stacks/2,286 entries preserved. Two verified recoveries. Older pre-install attention jobs and partial recovery still block maintenance. |
| Secondary Mac | Same corrected Mac build, installed and healthy | 215 descriptors/65 scopes, 593 run prefixes/47,803 events, 333 browser stacks/1,944 entries preserved. Reconciliation/maintenance completed; exactly two recoveries verify, no issues, 3,370,463,232 bytes reported reclaimed. Original attention journal retained. |
| Windows builder | `windows.402e470ba373`, complete/updated and healthy | Saved navigation/run prefixes preserved. Two recoveries verify after guarded diagnostic-sidecar quarantine; clean maintenance completed. Live Cookies were locked and not hashed. |
| Windows consumer | `windows.402e470ba373`, complete/updated and healthy | One verified recovery; no predecessor existed. Clean maintenance completed. Desktop driver absent; detailed semantic comparison unavailable. |
| Linux builder | `linux.46b75e0c12ed`, complete/updated and healthy | Both recovery trees verify; saved navigation/history and run prefixes preserved. Native live UI/protected outgoing authentication unverified. Exact-package keyboard/selection/restart checks passed separately. |
| Physical iPad/iPhone | Paid-signed 0.2.40 / 2611.1.1 installed and launched | 301 phone/190 tablet baseline files matched before first controlled launch; two recoveries retained. Physical offline tab Close passed. Provider presentation failed and moved to Nov 2 with modal New chat. Physical notification expiry not confirmed. |
| Website | Deployment `20261101T061032Z`; 14 endpoints/nine served asset hashes passed | Configuration/schema/nutrition preserved. Qualified capture-state recovery passed; ordinary isolated restore unproven. Two complete local recoveries verify. Server backup retirement lacks a bounded dispatcher operation. |
| Future Mac consumer | Not installed or paired | Deferred; no destination or success invented. |

The physical iPad saw a desktop-created temporary tab. The operator disabled its network, closed only that tab, restarted Proteus and reconnected. The canonical owner received that identity's Close and retained its tombstone; both original support browser identities remained. The controller did not close the test tab. This establishes that specific bidirectional/offline workflow.

The operator moved browser sizing, real vault lifecycle, closed-popup control, machine-specific local model presentation and mobile in-tab New chat to [Nov 2](../../2026-11-02-release-plan.md). See [closeout](closeout.md) for remaining qualifications.

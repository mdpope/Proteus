# Nov 1 implementation — final record

Version **0.2.40**. Accepted desktop application/source companion: `11ca09b84408bab3a630daeea8fa12c8e373e5fc`. Deployed web/iOS trees are unchanged by that desktop-only correction; their preceding accepted packages were not relabelled or reinstalled.

Implemented integration-health batching/yielding and asynchronous durable persistence; canonical project membership/order and explicit offline Close/reopen transactions; unavailable-document isolation; destination-default update/build coordination; iOS shared/local provider metadata; short release dates; age-filtered, persistently deduplicated notifications and coalesced five-second banners; extension window/authentication identity; scoped updater preflight grants.

Native acceptance exposed a race: an older membership-only owner response removed a newly selected terminal absent from its snapshot. The correction removes only owner-confirmed removed identities. Deterministic Electron comparison failed on preceding source and passed after correction, including real canvas input, convergence, retained selection and restart history. Native packages passed independently.

Operations-only `733d7ad` adds copy-only frozen SQLite inspection. `7ce24b4` adds supported post-install attention reconciliation through a separate immutable receipt, exact owner/health/package/signing/preservation/recovery checks and normal subsequent maintenance. `d0e2822` adds staging-retirement preservation coverage. Actual secondary-Mac reconciliation/rotation passed with original error/journal intact, two recoveries verified and no continuation replay. These changes do not relabel installed applications.

## Validation

- Final Node suite: **1,415 passed, four skipped, zero failed**; static checks passed.
- Accepted native source: Mac/Linux 1,407 passes/four skips; Windows 1,405 passes/six skips.
- Exact-package extraction, signing/publisher, membership/keyboard/restart and integrity gates passed independently on each native platform.
- Final iOS notification-history/restart deduplication, actual five-second banner timer and provider-choice tests: **three passed, zero failed**. The initial receipt test assumed foreground UIApplication and failed while inactive; its test-only correction checks persistent claims independently, retaining the conditional foreground assertion. The timer regression still observes actual timed expiry.
- Earlier iOS parity passed. Web: 106 tests/926 assertions; changed-file formatting passed. Four unrelated existing PHP formatting failures remain qualified.
- Physical iPad desktop-open/offline-mobile-Close passed. Model presentation failed operator review and moved to Nov 2. Physical notification expiry remains unconfirmed.

Synthetic extension and earlier sizing fixtures passed, but both defects still reproduced live. The operator transferred them, closed-popup control, machine-specific model choices and mobile New chat to Nov 2. No unobserved authentication, migration outcome or provider usage is invented.

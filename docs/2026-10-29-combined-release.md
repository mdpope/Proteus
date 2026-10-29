# October 29 combined release

## Authorized scope and deployment gate

Combine the current iOS fixes with the desktop responsiveness, Claude continuation and compact
question-answer changes, plus relevant web parity. The operator authorizes deployment to the
physical iPhone/iPad, Build Mac, Windows and the website after the separate Windows distribution
chat finishes. Work Mac remains explicitly held until the operator lifts that hold. Other computers
are outside this rollout. Await the gate's final source/acceptance before choosing the final release
version, merging its changes or installing this combined candidate.

## Integration review

- Claude's iOS fixes already exist in this branch through `ff9f3f8`; preserve them without duplicate
  cherry-picks. Its simulator evidence includes 153 units and focused navigation/swipe checks,
  plus real-host Debug profiling. Physical Release acceptance remains separate.
- The shared web client already imports the recovery controls, question layout and Project home
  entries. Its chronological question cards needed attachment upload/consent/delivery wiring
  and shared attachment styles. Captured-owner routing and uncertain-delivery tests cover that gap.
  The full encrypted web UI passes, as do all 103 PHP cases (893 assertions), using disposable
  storage, accounts and test keys. Neither result is a live website deployment.
- Review found an iOS durability regression from asynchronous document/history cache saves:
  persisted operation identity must precede owner mutation, and backgrounding must drain saves.
  The correction queues immutable snapshots on one background writer and awaits an atomic-write
  receipt before dispatching tab/history mutations. Failed writes retain pending operations and
  their retry identities; account/host/cancellation checks run again after the wait. Scene and
  account lifetime changes drain pending saves and surface failures, including a missing key.
  The final iPhone suite passes 156 cases; iPad passes the preceding 155-case full suite and all
  three final durability regressions. Physical Release acceptance remains outstanding.
- The operator requests Auto-approve to cover Proteus chat access requests. Those requests
  incorrectly reused a mandatory-provider marker. A distinct owner permission kind should use
  fresh effective Auto-approve while retaining exact scope/context, revocation and destination
  approval boundaries. The implementation passes all 44 focused permission/scope tests.
  OS/provider mandatory prompts and human browser/terminal sharing remain.

## Notifications preserve the foreground app

The native toast overlay used `showInactive()` for any visible parent window. On macOS this can
raise the parent above another app even though keyboard focus is unchanged. The overlay now
appears only while its own parent or its interactive overlay is focused, hides after focus leaves,
and does not reorder an already-visible overlay. Returning to that window reveals only an
unexpired notice. System notification click routing remains an explicit user action.

The focused regression passes background arrival, parent visibility without focus, foreground
return, keyboard interaction in the overlay, leaving the app and no expired resurrection. The
isolated Electron check passes the independent five-second expiry, actionable notifications,
and queued-notice behavior. These checks do not claim a live installed fix.

## Release acceptance

Before the Windows merge, the integrated Node suite passes 1,269 cases with three skips, and
static checks pass. Repeat final acceptance after incorporating that chat's final corrections.

Preflight retired only verified obsolete build intermediates and redundant generated website
copies, preserving current/previous signed apps, source companions and two complete website
recoveries. Private receipts retain hashes, process checks and observed free-space changes.
The production website still matches its preceding deployed manifest; its 14 endpoint/auth/relay
checks pass. No combined package or website release has been installed or published.

Final combined tests, exact package hashes/signatures, source companions, supervised desktop
coordinators, physical preservation/launch checks, website backup/deployment receipts and
two-generation retention results are pending. Keep private device/host identifiers, paths and
raw evidence outside source. A completed model turn or simulator build is not a deployment receipt.

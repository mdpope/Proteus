# October 29 combined release

## Authorized scope and deployment gate

Combine the current iOS fixes with the desktop responsiveness, Claude continuation and compact
question-answer changes, plus relevant web parity. The operator authorizes deployment to the
physical iPhone/iPad, Build Mac, Windows and the website after the separate Windows distribution
chat finishes. The operator subsequently lifted the Work Mac hold; that Mac is now included.
Other computers are outside this rollout. The gate completed with immutable source `66ce6f0`, now merged into
combined version 0.2.36 and native build 2610.29.1. It installed and published Windows 0.2.35
`windows.867dc88cfd12`; native source/static, packaged UI/restart/navigation, 3.35-second helper
readiness, saved-state preservation and two verified recoveries passed. Its remaining human
desktop-verification approval and saved-effort correction are recorded separately from installation.

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

Frozen source `b12fa845503a01057a99590319428e79fe127954` passes 1,293 Node cases with four
skips and static checks. The signed Mac candidate is `b12fa845503a+src.225201346dce`, package
hash `00adbf50c40f8f2995292a953b2ff8755a88c417b99657ddcf6a18008a1f63d9`.
All 407 packaged runtime files and eight build inputs match its frozen source companion.
The unchanged installed launcher acknowledges its helper in 6.44 seconds against the existing
15-second limit. Exact-package restored-chat, 500-chat state-worker typing/scrolling, and native
notification checks pass. The hidden test app remains hidden and unfocused on notification arrival.
Original sandbox and fixture failures remain in private evidence with their qualifications.

The website is live on 0.2.36 / `b12fa84`. Capture, verified central copy, ordinary restore
rehearsal, activation and audit complete. All eight compiled HTTPS assets and the manifest match;
the signed-in Home page connects to the owner, with no browser console errors or warnings.
Two new Apache events / 222 bytes remain unclassified because the administration backend timed
out; the application and relay log windows added no bytes. Local retention is complete; exact
server staging/recovery retirement remains pending that backend. No cleanup command was submitted.

Both existing simulators run 0.2.36 / 2610.29.1 and pass explicit pairing and separate normal
cold-start reconnect checks against the current owner. Their selected host identities match the
actual owner, previous destinations remain, and both new device entries are online in the final
owner sample. Cached labels alone were insufficient: the previously selected entries named
Build Mac had different host identities. Their exact prior provenance remains unclassified.

The physical iPhone is installed and launch-verified: all 306 protected files match before launch,
all four destinations and selection remain, and two full verified recoveries remain. The physical
iPad is installed; qualified preservation and controlled launch/retention remain in progress. Its first
cold copy was rejected because the app restarted, although source metadata was unchanged. A
stopped-device comparison verified all 259 current file hashes against that preserved copy, then
accepted the same recovery without creating another full backup. The first post-install readback
also matched all 259 file hashes but failed its stopped-process guard. Current metadata remains
unchanged and the app is running. A manual App Switcher close and stable post-launch comparison
are pending; this is not a pre-launch preservation pass. Both failures are retained.
Physical gestures, authenticated reconnect and actual push delivery remain separate acceptance.

HC and Windows candidates are prepared and handed off, but installation is not yet verified.
Their owner timers identify actual active-work blockers. Build Mac preparation is waiting on
its destination app-tool approval. Desktop installed performance, preservation and same-chat
continuation remain required; prepared jobs and completed model turns are not installation proof.

Preflight retired only verified obsolete build intermediates and redundant generated website
copies, preserving current/previous signed apps, source companions and two complete website
recoveries. Private receipts retain hashes, process checks and observed free-space changes.
Keep private device/host identifiers, paths and raw evidence outside source. Jira's missing labels
remain unclassified: a normal-size page was made available, but its screenshot backend did not
return. No system-theme or Chromium cause is established.

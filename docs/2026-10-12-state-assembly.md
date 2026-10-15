# October 12 remote-state and interaction correction

## Scope and current status

Operator-authorized remote-state performance correction, BF-2026-10-12-01–04 queue closure,
native missing tab icons and browser history/gesture follow-up. Implementation and verification
remain in progress for native; both desktops and production web are installed and live-verified. Preserve existing data and
retry protections, use the established private transfer and destination Codex chat procedure.

## Performance evidence and boundaries

HC's previous build showed 94 short stalls in a 140-second read-only sample (maximum 328 ms),
with remote-state assembly averaging about 121 ms and the renderer predominantly waiting.
A separate saved aggregate reported an 11.17-second stall, without its causal phase. The full
freeze was not reproduced during that capture. There is no demonstrated memory leak; process-tree
RSS stayed around 1.1 GiB in this sample. These observations do not establish the cause of every pause.

Integration-health enumeration rebuilt complete provider context for each historical chat,
repeated catalog filtering/exclusion compilation and hashed full captured context per MCP.
Selection now uses a lightweight MCP projection, one fresh scoped catalog per synchronous batch,
compiled current exclusion matchers and a bounded digest-only registry identity cache. Exact
legacy IDs, recovery metadata, mode checks, source bytes/canonical paths and revision protection
remain covered by regression tests. Remote snapshots collect the run list once. No receipt-store
format, command claim ordering, permission or scheduler retry behavior is changed.

Synthetic source Electron acceptance (100 completed fixture chats, 3,000 catalog entries,
four MCPs each, roughly 56 KB captured instructions/chat): warm publication 22–28 ms, context
projection mean 4.91 ms, no recorded event-loop stalls. This is fixture evidence, not HC acceptance.

Diagnostics retain 16 long-stall/discontinuity records independently of the 32 recent-event ring,
so frequent short delays cannot erase the timestamp and correlated phases of a full pause.
Fixed labels cover assembly stages, integration selection/identity, attachment cleanup and activity
persistence. Reports remain bounded, local and free of prompts/paths/credentials.

## Additional reproduced browser load

Final browser acceptance exposed a favicon network feedback loop: 3,750 resolver calls and
3,749 HTML responses in two seconds, with no image responses and stable browser-changed/command
counts. Network completion retriggered cached favicon fetches even for unusable HTML responses.
This is a reproduced runtime defect, independently of test-driver polling. A bounded,
coalesced resolver and image-only response handling are implemented; four focused regression
groups pass. Source and exact signed-browser acceptance pass: valid/late images and both fallback paths
work; the settled fixture records zero browser updates, commands and network completions.
It may affect browsing responsiveness, but does not establish the cause of HC's periodic full pause.

## UI behavior

Activity preserves the platform's existing design and chronological event relationships. Tools,
approvals and darker system messages share a group until a user/model message. Individual timing
uses recorded start/finish; old records remain unavailable. Approval never implies successful
command completion. Manual decisions retain their recorded tool-call reference.

New browser tabs are placed after the source captured before asynchronous menu/creation work.
Placement is transient and never changes persisted tab identity/profile or retry metadata.

Browser failure notices carry the associated local log ID/host. View logs makes Logs visible,
refreshes an existing Logs page and focuses the corresponding row. Missing/expired records still
open Logs. Modal fields remain intact when closing a covering dialog.

## Validation and rollout

522 Node tests and static checks pass. Desktop Activity and paired-desktop Working UI pass;
web browser UI passes activity containment, timing, original request and expansion checks.
Scheduler UI/worker/diagnostics rehearsal and browser alert routing pass. Adjacent-tab, favicon and profile/restart acceptance pass on the exact final signed bundle.
Native browser work and installed/live checks remain in progress. Signed desktop
launch/signature, scheduler/diagnostics, remote-state fixture and 46 MB receipt migration/restart
acceptance pass. Ten synthetic mutations wrote 5,691 payload bytes with a 5.7 ms maximum
measured main-loop gap; these are fixture measurements, not physical disk-write totals.
Signed profile/restart acceptance passed after correcting the reproduced favicon storm. A full-concurrency first Node run hit timing contention; isolated attachment tests
and the complete bounded-concurrency reruns pass.
Native simulator/build and browser gesture/history scope are tracked separately from physical
installations. Private receipts and samples stay outside the repository.


### Desktop artifact

Final signed desktop build: **0.2.12 / ec8b213d382e+dirty.dcb5e9040a88**, with 199 runtime
files matching source. Existing signing identity and vendor signatures retained. Private transfer
is complete and the authorized destination chat confirmed installation and live verification. The primary desktop is installed and live-verified: graceful idle shutdown, durable app/data
backup, 63,259 app-data files preserved during replacement, all 199 runtime hashes matched,
9,618 protected SQLite receipts retained with zero expiry, original JSON unchanged, 21 chat/schedule
files unchanged, 50 stable tab identities plus drafts and six pairings preserved. Visible restored
UI and online relay verified. The 142-second local sample recorded no new event-loop stalls,
zero receipt writes, zero scheduler failures, 2.58 ms median API latency (18.8 ms maximum),
and 4.81 ms mean remote-state assembly. Native installation remains separate.

HC confirmed all 199 runtime hashes/signatures, 76 tabs, two drafts, three workspaces, six
pairings and all 6,383 protected receipts preserved; providers and peers are online. Its
140-second comparison, including a normal user continuation, reduced mean remote-state
assembly from about 121 to 16 ms, short stalls from 94 to 20, and API p95 from 384 to 125 ms.
There were zero scheduler failures and no stalls over one second in that sample. The historical
full freeze remains unproven, so this is measured improvement rather than a claim that every
periodic pause is resolved.

### Web status

Production is now on `0.2.12-20261012T210124Z`, replacing the earlier interface-polish release. The latest
activity/control/navigation batch is built and tested (80 Laravel tests, 717 assertions and
authenticated UI acceptance). A fresh production recovery capture completed and the exact
release is staged. The ordinary isolated restore failed its live-state equality gate; a read-only
comparison then confirmed every captured protected table, DDL and native ledger matches the
isolated restoration, while only live app-record synchronization had changed since capture.
Capture-time supplemental verification passed and activation completed. All 9,213 deployed
manifest files and all eight served JS/CSS assets match; runtime configuration, schema and
protected data preservation passed. The prior release remains available for rollback. Final
endpoint audit passed all 14 checks. No new Laravel events were recorded; the sole Apache
event was the expected protected-environment-file denial from the security probe. MariaDB
recorded existing column-statistics messages and one additional informational event still under
classification. No production data was changed by recovery checks. No native WebKit gesture changes require a web deployment.

The operator additionally requested a restricted SSH deployment route to replace routine Webmin
interaction. Its fixed-command privilege boundary and adversarial checks are being prepared and
reviewed. The operator approved the exact restricted grant; the route is installed and its
root-owned layout, helper hashes, website-UID inspection, PHP modules and sudoers checks pass.
The live SSH audit passes all 14 checks. Full next-release deployment through the new route is
separate from these acceptance checks. See [web updates](web-updates.md).

### Native status

Native 0.2.12 / 2610.12.3 is installed in place on the primary computer with the existing
certificate, provisioning profile, entitlements and wrapper identity. A durable previous-bundle
backup is retained; no native container, pairing, Keychain or account data was edited. Strict
signing verification and all 36 source hashes pass. The operator completed macOS first launch.
The running installed version, restored workspace/chat tabs and navigation between saved views
were verified. Follow-up foreground acceptance now verifies a connected HC chat, loaded public
websites, link navigation, Back/Forward, page retention across chat switching, scoped overview,
unload/reload, and Back/Forward after web-view recreation. The temporary browser tab was closed.
The earlier address-entry/offline result came from the inactive-scene privacy cover; foregrounding
restored input and live HC connectivity. Shared recent history explicitly requests website-account
sign-in and shows populated device-saved fallback; its cross-device account round trip awaits that
connection. The primary desktop’s scoped account API independently reports no website-account
connection, while its relay and computer peers are online. HC’s scoped account API succeeds
with 500 history items (488 desktop, 12 mobile), confirming the shared server collection exists;
the primary clients’ missing account connection prevents their account-history acceptance. Both physical devices are now updated in place to .3: installed inventories and
independent running processes pass, seven protected files per device match before launch, and
decoded destinations remain unchanged afterward. Physical gesture acceptance awaits operator input.

A fresh five-minute HC acceptance sample matched all 199 runtime hashes/signatures and 6,383
protected retry receipts. All 299 API reads succeeded (p95 101 ms); relay and peer remained online.
There were 36 subsecond stalls, maximum 804 ms, with memory near 0.94 GiB and mean main-process
CPU 15.6%. Scheduler/journal failures and new logged errors were zero. The largest delay coincided
with provider refresh without a captured causal phase. The historical full freeze was not reproduced.
A fresh restricted-SSH web audit passed 14 endpoints with no new Laravel/PHP errors; actual signed-in
production history acceptance remains separate. The primary desktop also passed a fresh 120-second
observation: all 199 runtime hashes matched, median API 1.88 ms (maximum 29.28 ms), no new recorded
stalls, zero journal writes/failures and zero scheduler failures; original JSON retry journal unchanged.
Earlier local diagnostics retain a 1,718 ms delay without captured synchronous or async phases.

All 92 native unit cases pass across the final 91-case suite and the isolated persistent-cookie
case. Focused phone/tablet checks cover activity relationships and timing, scoped chat/browser
icons, shared/local recent-history states, restored Back/Forward, SPA/hash navigation on tablet,
and minimum-zoom inward pinch overview/Done. Phone SPA UI acceptance was limited by repeated
XCTest animation-idle waits. Outward synthetic pinch did not change page scale even with the
overview observer disabled; ordinary page zoom and physical trackpad feel remain manual checks.
The minimum-zoom eligibility logic is covered independently.

# Browser agent access and Engine Room spacing

The operator authorized removing profile/tab access barriers on October 18. Browser extensions,
legacy `allowExtensionAgents` values, ownership and sharing flags no longer independently prevent
agents from creating, listing, reading or operating ordinary website tabs. Every configured
available profile uses the same behavior. Existing sessions, cookies, extensions and logical tab
identities remain in their original partitions. An unavailable owning account/profile or busy
human debugger remains an actual availability condition. Workflow approvals and the single-tab
protocol boundary still apply; no credential-export capability is added.

Extension installation/update/enable no longer strips ownership or disconnects agent access.
It invalidates visual observations so agents obtain a fresh screenshot after page-affecting changes.
Browser Preferences removes the extra extension agent opt-in, and the robot is an availability/
activity indicator instead of an access switch. Developer backend discovery needs no per-tab toggle.
Required core orientation and all provider tool descriptions explain the current contract.

`proteus_browser` discovers destinations and profiles, and `open` accepts `profileId`, `hidden`
and `unloaded`. Hidden creation starts unloaded without fetching the URL. Hide unloads a browser;
Restore unhides without fetching; Load can load a hidden page in the background; Unload retains
its logical tab; Refresh updates meaningful activity; Close removes the tab without first loading
it. Explicit page reads/actions can load an unloaded page while retaining hidden placement.
Renderer reconciliation preserves native hidden state instead of publishing an accidental unhide.
The shared `proteus_tabs` boundary also exposes revision-checked browser Load/Unload. Chat closure
continues to differ from archive/delete/cancel, and moves preserve terminal/viewer authority.

Engine Room cards use one 18-pixel gap across direct cards and nested Browser Preferences groups.
The web stylesheet uses the same gap. Card padding, palette and feature icon designs are unchanged.

## Validation and rollout

Source validation: 738 runtime tests and static checks pass. The isolated Electron check uses
actual synthetic extensions in default/named profiles with absent/false/true legacy flags. It
verifies existing unshared tabs, no-fetch hidden creation, hidden background load/read/click,
unload/restore/close, screenshots, Playwright page reads and developer page inventory. Measured
card gaps are uniformly 18 pixels and the obsolete opt-in is absent. Revision-checked Load/Unload
preserves hidden placement/history and refuses stale identity or non-browser resources.

The optional developer backend's AX snapshot timed out during an additional probe; it is not
certified by the passing page-inventory check. Playwright snapshots and screenshots pass. This
release removes access policy gates rather than claiming every optional backend operation works.

Production 0.2.22 is signed with the retained desktop identity. Build Mac installation and
preservation/restart checks passed: 115 saved views, 60 content descriptors, 25 original run files,
29 protected retry receipts and 4,648 original history events remain. All three provider catalogs
are ready and the relay is online. A final help-note correction removes the remaining reference
to tab/profile sharing. Exact signed UI and packaged checks pass on that final artifact.

The web spacing release is deployed and authenticated Engine Room inspection confirms the 18px
grid gap and restored computer connection. All 14 deployment endpoint checks pass. The first
activation rolled back on a transient FastCGI connection reset; the fixed deployment workflow
then accepted the same payload with its existing fresh verified recovery. Recovery copies and
private retry/activation receipts remain in the deployment workspace.

Work Mac's exact 0.2.22 artifact is installed and live-verified after the operator manually
started its existing authorized deployment chat. Second launch, navigation, provider/relay and
peer checks pass; 248 chats, 88 saved views and 367 protected retry receipts remain. A cached
chat-title mismatch was reviewed against unchanged authoritative records before acceptance.
Two verified recovery generations remain; measured cleanup reclaimed 1,508,569,088 bytes.

The local update retains two verified full desktop recovery generations. Retiring an older
snapshot and duplicate/superseded staging reclaimed measured disk space; exact byte receipts
remain private. Two redundant server staging copies were removed only after verifying their
central recovery copies; encrypted server transports were retained.

## Existing Codex chat continuation correction

The installed runtime's generated `ThreadResumeParams` schema has no `dynamicTools` field.
Updating the browser adapter alone therefore leaves an older chat's native tool argument schema
captured at its creation. Version 0.2.23 publishes the current browser/tab catalog through the
existing turn-bound `proteus_app` MCP bridge on resume and directs the model to that current
catalog. Native and MCP calls share the same approval/revocation checks. The bridge expires at
turn end; provider chat identity, history, folders and saved approvals are preserved. A regression
rehearsal resumes twice, verifies hidden/unloaded/load schemas, denies and approves a real bridge
request against synthetic handlers, and verifies capability rotation/cleanup. The final guard regression and full frozen suite now pass: 740 tests, zero failures; the focused
Codex suite has 14 passing cases. Static checks and the web asset build pass. Synthetic web UI
acceptance covers Source Library spacing/loading copy, 18px gaps and 22px internal padding at
1440px and 390px, alongside existing project/tab/history/draft workflows. Desktop Source Library
UI passes at 1440px and 850px. The earlier narrow-width diagnosis was a fixture error: it resized
the hidden notice window. The fixture now targets the actual page's BrowserWindow and exits
cleanly. Apple signing continues to require a fresh unlocked-session check.

Earlier reviewer-capacity and timeout failures did not execute commands; a new operator-authorized
retry restored normal review. The retained-identity signed 0.2.23 artifact passes packaged launch,
vendor signatures, browser-profile/lifecycle checks and 146-view migration/restart acceptance.
Build Mac is installed and live-verified after a second graceful restart: original chats,
137 views, 82 content descriptors, 31 protected receipts and 4,686 history events remain. All
provider catalogs and the relay are ready. The selected browser's visibility timestamp and
same-URL history enrichment were reviewed; original visit identity, URL, time, entry order and
meaningful activity remain. No stored data was edited to satisfy acceptance.

The web deployment passes fresh capture, central verification, ordinary isolated restore and
all 14 endpoint checks. Authenticated Source Library inspection confirms current owner data,
18px measured gaps, 22px padding and no horizontal overflow. A failed capture due to server
headroom remains recorded. Exact centrally verified duplicate server recovery copies retired
after their recovery windows. Expired encrypted transport duplicates retired only after verifying
their central recoveries; the current encrypted transport and all retained central recoveries
remain. Server headroom is above the capture threshold. Local retention keeps two full recovery
generations with one app each; exact sources, compact receipts and measured cleanup changes remain
private. Redundant build/transfer staging retires after the durable signed/source packet verifies.

Default-profile history synchronization remains enabled with 90-day retention and reports a
recent error-free sync. The paired owner is online and its cached chat index refreshes; a snapshot
was still marked loading. Do not interpret that snapshot as complete peer-upgrade acceptance.

HC verified the private immutable 0.2.23 transfer and source/runtime hashes. Its fresh console
check is locked, so signing/installation/restart acceptance waits for local unlock. It remains
on verified 0.2.22; staging does not establish an installed or live-verified update.

The operator also authorized incorporating Source Library BF-2026-10-18-03/04: shared availability,
workspace loading choices, one-time bulk behavior and “Configured in” wording. Registration,
scanning, file permissions and connected-tool approvals are unchanged. The earlier extension-gate
and Browser Preferences spacing acceptance remains valid.

## Continuation and recovery

The operator revoked the morning hold by unlocking Build Mac and asking to finish. Existing
Apple and SSH access worked after unlock; no certificates, accounts or keys were recreated.
Failed and accepted deployment jobs retain separate immutable receipts. Exact signed artifact,
corresponding source, install/acceptance evidence and transfer pins remain private. No live-data
backup was made for build/test-only steps; actual replacement took a consistent current cold
snapshot. Retain two verified full recovery generations per installation and keep the independent
preview workflow separate. HC's remaining local unlock requirement is recorded above.

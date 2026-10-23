## October 22 — passive-save descriptor feedback correction

Linux's combined candidate fails its unchanged six-read traffic budget with seven reads.
A bounded instrumented diagnostic exposes redundant descriptor requests from sidebar catalog
rendering saving an already persisted workspace. Original failure and diagnostic remain separate;
no threshold, history guard or readiness assertion was relaxed. The source correction moves
descriptor scheduling inside the existing workspace snapshot-change guard. Real edits retain
debouncing, no-op saves do not postpone their timer, and queued/fresh synchronization remains.
The focused real-renderer regression passes and fails on the prior signed package; a real edit
still coalesces one sync and persists. All 1,056 source tests pass (one platform skip), and static
checks pass. New exact artifacts are pending. All earlier combined artifacts are superseded
for installation; no installed app/data was changed.

## October 22 — follow selection requires fresh input

The operator reported chat selection repeatedly returning to a browser while other desktops
were idle. A regression reproduces passive renderer reconciliation publishing its stale selected
tab. Follow now publishes only a fresh input change or the initial seed of an empty scope;
background saves/hydration update the local observation baseline without taking control.
Native local browser navigation is identified from a changed pending entry, preserving link and
Back/Forward following outside the shell's input listeners. Identical normalized owner state
renews a lease without changing its revision or broadcasting another selection.

The regression requires chat selection to survive passive refreshes and a lease renewal, then
requires a new real click on the other desktop to resume following. Complete histories, scopes,
positions and retry identities retain their existing boundaries. Source/packaged/installed
acceptance for this correction is recorded separately from the earlier 0.2.29 rollout.

## October 22 — combined 0.2.29 rollout acceptance

The combined release is built and deployed across the authorized targets. See the
[current per-target acceptance and retention record](2026-10-22-unified-rollout.md).
This record supersedes earlier holds and source-only status below for this release;
physical-device workflow limits remain explicit. Desktop runtime froze at `abad91f`;
later native-view readiness and Windows path-selector changes affect tests only.
No complete browser history or protected retry receipt was pruned.

## October 22 — duplicate redirect metadata convergence

Implemented a client-only settlement for identical selected-entry redirect metadata, including
one fresh hydration after an explicit navigation revision conflict. Exact entry ID, selected
index, URL and title must agree. The original uncertain request remains intact unless its
metadata intent is proven satisfied; no server receipt or execution acknowledgement is invented.
Server revision/digest checks and complete history remain unchanged. Stale-write recovery allows
one redirect with only same-tab/profile metadata and reorder companions. Navigation/traversal
batches, divergent metadata, operation-ID collisions and transport failures retain existing
conflict/retry behavior. Integrated packaged latency acceptance and installation remain pending.

## October 22 — follow ordering and slow-response source correction

Linux exact-package acceptance exposed a delayed native-position failure despite passing source
acceptance. A separate controlled 400 ms response delay reproduced continuous-scroll starvation
on Mac. Deterministic regressions reproduce passive positionless publication overtaking a pending
owner scroll during either a local read or descriptor synchronization, and starvation when
continuous human scroll repeatedly invalidates the same navigation barrier.

The source correction gives pending remote positions priority only within the same presentation
identity and without newer effective human changes. After synchronization, a fresh read may
coalesce newer positions when scope, generation, tab, child, page, URL and entry still match;
changed navigation requires another barrier. Source verification and exact packaged 400 ms
acceptance are separate gates. Do not install the previously failing candidate around its failure.
No Linux installation or recovery capture is claimed by this source correction.

## October 22 — rollout acceptance corrections

A controlled 120 ms content-tab response delay exposed follow presentation arriving before
queued navigation reconciliation completed. Awaiting the queued pass keeps the follow
publication barrier through navigation seeding. The regression also waits for actual native
page readiness before dispatching input; a pending renderer URL is not load completion.

Authenticated web acceptance exposed duplicate parallel destination lookups reaching the
existing rate limit. Account-bound in-flight GET coalescing reduces duplicate requests without
retaining settled authorization/credentials or changing server limits. Connections presents
an explicit retry control instead of remaining at a loading message.

Acceptance: 1,002 Node tests pass (one platform skip), static checks pass, and 101 web
tests pass with 867 assertions. Two isolated desktops pass with 120 ms descriptor latency,
including sustained scroll in both directions (50–51 visible updates; maximum gap 530 ms).
Both corrections require replacement desktop/web artifacts. Native build 2610.22.2 is unchanged;
iPhone and iPad installation, protected-data hashes and launch have passed. Physical camera
orientation and actual post-update pairing remain separate from simulator/UI acceptance.
Private per-device installation and recovery receipts remain outside source.

## October 22 — 0.2.29 full rollout authorized

After the Windows integration chat completed and PR #21 merged, the operator authorized
reconciliation of remaining branches, final build/testing, and updates to both Macs, Windows,
Linux, web, iPhone and iPad. This supersedes the earlier rollout holds for those targets.
Version 0.2.29 and native build 2610.22.2 identify this combined release. Preserve existing
signing/account identities, full browsing history, chats, approvals and retry receipts.

Old open PRs #16–19 contain changes already represented on main and are closed as superseded.
Historical transfer branches remain delivery records, not additional code to remerge. Linux
acceptance documents are being reconciled separately from its already-integrated runtime fixes.
Per-target installation and live verification remain pending and must be recorded separately;
hosted CI remains unavailable because of account billing limits.

## October 22 — Linux documentation reconciliation; next artifact pending

Recovered the four source-bound Linux 0.2.27/0.2.28 acceptance reports and the bounded external
native-transcript manual recovery procedure without replacing main's newer implementation or
release documentation. The old checkpoints are explicitly historical. See the
[Linux reconciliation](linux-app.md#october-22--linux-acceptance-evidence-reconciled-with-main).
No runtime, package, installed-app, recovery snapshot or journal pruning change is included.
The next Linux build awaits final frozen 0.2.29 source and separate acceptance. Continued
navigation/operation receipt growth needs investigation; retention protections remain unchanged.

## October 22 — completed source integration authorized

The operator requested PR, push, merge, and source synchronization for the completed desktop,
Windows installer/release, and native pairing work. The integration preserves both branches'
behavior, including shared-account streaming and Windows-aware resumable update recovery.
All 1,000 runnable Node tests, static checks, 101 web tests (867 assertions), the web build,
and isolated browser UI acceptance pass; one Node test is platform-skipped. This source-only
integration supersedes the earlier separate-branch notes. Existing installed-app rollout holds
and physical mobile camera acceptance remain separate from Git completion.

Windows integration validation requires writable handles for durable recovery flushes and portable
private-directory/CRLF fixtures. Those corrections preserve read-only file modes and clean up failed
fixture setup. The integration also takes the `markdown-it` 15.0.3 security patch and rebuilds its
shared runtime. Hosted CI is blocked before job execution by account billing/spending limits.

## October 22 — mobile pairing feedback and scanner correction

The operator reports a false connection-refused message after successful iPhone pairing, silent
iPad dismissal to Home, and an incorrectly rotated landscape iPad camera. The focused source fix
adopts the pending transport into the saved destination, emits success only after authenticated
`ready`, routes both form factors to Connections with a visible receipt, and sequences camera
dismissal before pairing. The preview follows AVFoundation camera rotation updates.

Phone/tablet success and sheet dismissal, 12 destination cases, the actual-refusal preservation
case, 979 Node tests and static checks pass. Existing pairings, optional grants, history and saved device
keys remain intact. No physical installation or camera-image acceptance is claimed. This scope
does not release the separately held desktop browser/design-preview changes.

## October 22 — additional browser controls and retained preview

The operator rejected the Home URL/search box added during earlier Apple browser preparation. Remove it entirely and make Proteus the primary Home heading; do not relocate the box elsewhere on Home.

Implemented for the operator's next design-preview review: detached-video surface dragging and
proportional work-area-bounded pinch resizing; Hide browser tab below Unload; scoped blank-strip
double-click creation; persistent autoplay verification; optional ordered extension toolbar icons;
Downloads/Page menu swap; compact tab/page-menu icons. Preserve the current player's WebContents,
full histories, local profiles, existing permissions and retained preview data. Production builds
and all-platform installation remain held pending operator review. See [browser behavior](browser.md)
and [preview acceptance](desktop-preview.md).

## October 22 — authorized stabilization implemented in source

The operator authorized the architecture/performance plan and selected-scope desktop follow-along.
See [the acceptance ledger](stabilization-plan.md) for implementation and verification, and
[follow-along](project-follow.md) for exact scope. Use independent local browser profiles; do not
share credentials or remotely render pages. Preserve the beginning of browsing sessions. Clients
on another workspace/project stay inactive and catch up when selected. Keep UI changes to minor
spacing/wrapping. Interactive terminal output stays on its owner; no new license is selected.

Implemented tracks include update provenance/storage, account/Life reads, renderer lifecycle,
history deltas, bounded transport/cache work, and current contributor/architecture documentation.
Deployment and signed installed-device acceptance remain separate from source completion.
The earlier entries below are retained design/release history, not evidence that all queued items
remain unimplemented or authorization to install a new build.

## October 22 — agent chat control integrated into current source

The operator authorized implementation, demo/cross-device tests and integration of feature
commit `2a825a1` into the current source. Installation and deployment remain held. This adds `proteus_chats`, scoped human grants, durable
command/task identities, independent multi-chat observation, and visible/deduplicated feedback.
Internal agents cannot approve destination tools. Automatic origin continuation is explicit
and never resumes a deliberately stopped/interrupted conversation. New owner paging removes
the silent 1,000-chat cutoff; legacy owners retain labeled pagination and project-scoped
mutations require the new owner capability. See [agent chat control](agent-chat-control.md)
for boundaries and tests. Only the feature commit was applied above source checkpoint
`5b8b708`; newer release records are preserved. Installed apps have not been updated.

Merged-source acceptance: all 883 Node tests and `npm run check` pass. Fresh isolated
Electron checks pass for encrypted two-host dispatch/concurrent wait/replies/visible feedback,
peer setup and destination drafts, and the existing message-edge styling. Screenshots inspected.

Pre-merge acceptance: encrypted demo/UI tests and real Codex Mac-to-Linux task/feedback flow pass.
Temporary Linux pairing revoked and synthetic chats archived; existing owner state preserved.
Real local Copilot/Codex tool calls pass. Those real-provider/physical checks were not repeated
for this merge; runtime and test files are byte-identical to the feature commit. Live Claude
and installed-feature rollout remain unverified.
## October 22 — Windows chrome follow-up

WTB publication is live and all five public hashes/signature/full downloads verify. The actual
installed Windows consumer checks the catalog, downloads the entire final archive, verifies and
extracts its package, then passes isolated renderer startup. No redundant current-build reinstall.
Relay registration/online transport preserves identity; device pairing remains pending a supported
live interface. This supersedes the in-progress publication notes below.

Windows now reuses the Linux frameless shell controls and circled-dots File/Edit/View/Window menu,
with native shortcuts, F10 access and sender-bound actions. Source and exact packaged UI checks
pass. Build `windows.2cf4ad5cdad6` passes 887 tests with two skips and static checks, then completes
the actual installed signed-release update with healthy renderer, exact payload and identity/data
preservation. One verified recovery generation remains. The restored Mac chat received the authorized
handoff and is preparing WTB deployment while activation waits for the replacement artifacts.

## October 22 — Windows WTB release acceptance

The latest operator choice selects downloads.proteus.example Windows downloads, an unsigned conventional installer
and signed update manifests. The Windows branch integrates upstream `5b8b708` (0.2.28). Build
`windows.6e46560c3ce5` freezes 308 runtime files. Validation passes 886 of 888 tests with two existing
POSIX skips and static checks. Exact packaged UI, native PTY, provider readiness, rehearsal
persistence and restart pass. Real NSIS checks cover payload equality, URI registration, offline
preparation/cancellation, active-app refusal and uninstall preservation. The final build passes a
real Codex update with the original session automatically resumed once and history/receipts intact.
Its packaged WTB client downloads and verifies the complete locally served publication archive.
An injected health failure also passes compatible rollback with the same real session resumed once.
The final installer is installed locally; the actual renderer, normal restart, stable host identity,
single owner and disabled debugging are verified. The new browser profile inherited extra Windows
ACL grants; after inspection its permissions were restricted without changing contents. The live
home has no chats or enabled schedules and no recovery generations. The separate website service
passes 27 focused release/Life/native-auth tests. See [Windows instructions](windows-app.md).

WTB publication is authorized for this Windows scope and remains staged. The Windows host has no
deployment workspace or signed-in Webmin session; the coordinating Mac chat is not addressable from
its thread tools. The operator authorized the Mac handoff. Actual WTB endpoint/consumer acceptance
and existing relay/device pairing still require the private deployment workflow and registration
record. No Mac/iOS signing identity or existing device data is changed by this Windows work.

## October 22 — source review and repository checkpoint

The operator authorized review, commit and push of the outstanding 0.2.28 work. Fresh validation:
868 Node tests, `npm run check`, the isolated Electron message-edge UI test (screenshot inspected),
and the packaging privacy regression pass. Initial sandbox-only test failures were localhost
`EPERM`; the complete suite passed with test-server access. Earlier native/device and web rollout
acceptance remains recorded below; it was not repeated during this source checkpoint. The known
390px desktop chat-design overflow and outstanding live iCloud integration remain unresolved.

Private Apple links, form payloads, screenshots and signing receipts remain ignored local records;
credentials/private keys stay with their existing secure owner. Desktop packaging now explicitly
excludes all `local-records` directories. The obsolete review-page draft is preserved as a clearly
marked historical template under `docs`, outside deployable web assets. No live app, private hosted
artifact, Apple submission or device deployment is changed by this checkpoint. The current Apple
record contains the ordered response checklist and evaluation-link expiry; do not repeat registration
or submit another entitlement request without reviewing Apple's response and operator direction.

## October 22 — Apple request TGNRQJ22PP and final download complete

Operator-submitted browser request **TGNRQJ22PP** is confirmed and awaits Apple review. The WTB
Developer ID app and final DMG are notarized, stapled and Gatekeeper-accepted. Mounted-app browser
acceptance and the entire 299,455,822-byte private downloads.proteus.example download passed. Existing installed app
identities and all 1,127 public website files are preserved. All links, last observed form contents,
receipt/screenshots and steps are in the ignored `local-records/apple-browser-review/` directory.
See [current Apple record](apple-browser-authorization-request.md) for hashes and remaining iCloud
work. Earlier submission/signing holds below are historical. Do not submit a duplicate request.

## October 22 — private Apple evaluation delivery prepared

The operator selected downloads.proteus.example for the unlisted, expiring evaluation link. Hosting and full download
hash/access checks are complete; the temporary proteus.example route is withdrawn. No public launch
or navigation link. WTB website project records own this delivery. Apple request text now contains
the private URL and pending signing status. A verified CSR and Developer ID/G2 form are staged;
certificate issuance, explicit App ID registration, notarization and entitlement submission await
operator review. Hardened development signing and browser acceptance passed on a separate clone;
the final Developer ID artifact still requires notary authentication, timestamped signing,
notarization/stapling and Gatekeeper/exact-artifact acceptance. No app behavior or installed identity
changed during this preparation.

## October 22 — deployment authorized; public browser launch held

Deploy the tested navigation/composer/message-edge/browser changes to existing desktop, Linux,
web and native installations, recording exact artifacts and preservation separately. Refresh
Apple drafts and a development candidate using `org.proteusapp.review.proteus.desktop`. All Apple submissions,
registration and notarization remain held. The operator subsequently paused the proposed public
downloads.proteus.example download page and public installer; focus on a private development evaluation package.
No new app behavior is authorized without review. The private candidate/DMG and Apple drafts now
use the selected org.proteusapp.review ID. Local desktop, native phone/tablet/Mac and web installations have been
updated. Both remote desktop installations also passed their installed/normal-restart checks.
See the current handoff for acceptance limits and the Linux history-growth follow-up observation.

## October 22 — navigation regressions and WTB Tech identity

Authorized implementation: native project switching, browser bottom controls and scroll chrome,
composer Chat | Live browser links, left message accents on all clients, readable computer actions.
The selected-computer checkmark/disabled action is selection state, not desktop-control capability.
Apple review identity is `com.wtbtech.proteus.desktop`; `PROTEUS_APPLE_REVIEW=1` builds a separate
candidate. Existing installed IDs, update verification, mobile provisioning and Keychain identities
are preserved pending migration acceptance. All Apple submissions remain held. Source/UI validation
and staged candidate acceptance are recorded in the handoff; no deployment is implied by a build.

## October 22 — Apple browser review prerequisites (operator review hold)

Authorized: test WebAuthn, repair prerequisites and prepare a review page/download. All Apple
submissions remain held for operator review. Implemented: HTTP/HTTPS registration and queued
owner-window delivery; Home website/search field. Isolated source acceptance passes virtual CTAP2
registration/assertion and incoming-link handling; exact packaged acceptance also passes (build `de14e3f717d3`, 299 runtime hashes verified). Bitwarden's
inline account menu is verified on the existing KSL form; icon-only preference remains unchanged.

Remaining gates: organization explicit App ID, usable Developer ID identity, distribution signing
and notarization; no Apple entitlement or iCloud passkey acceptance yet. A development candidate
must be labeled accordingly, not advertised as a notarized public release. Review page/download
are staged locally until reviewed. No installed application or live data is changed by this work.

## October 21 — Apple authorization request held for operator review

Prepared [private Apple and alternative public inclusion drafts](apple-browser-authorization-request.md).
The operator requires review before any submission. Request form access is verified under WTB;
name/current ID are filled, eligibility remains unset. The form requires eventual iCloud Keychain
WebAuthn registration/assertion support. No explicit organization desktop App ID is listed.
Missing HTTP/HTTPS registration and the current/organization signing-team difference remain
explicit prerequisites. No request, public issue, entitlement or signing change is complete.

## October 21 — iCloud Passwords remains blocked by Apple helper launch policy

The installed 0.2.28 browser still cannot pair with iCloud Passwords. The latest local helper crash
report identifies Proteus as parent/responsible process and records `SIGKILL (Code Signature Invalid)`.
Read-only `codesign -d -vvvv` inspection of Apple's installed helper shows parent launch constraints:
an approved browser signing-identity/team pair or the restricted
`com.apple.developer.web-browser.public-key-credential` entitlement. The installed Proteus identity
is absent from those constraints and its signed entitlements do not contain the alternative grant.
This explains helper termination despite a valid on-disk Apple signature. The EPIPE lifecycle repair
prevents the uncaught main-process exception; it does not grant Apple helper compatibility.

Apple documents the browser inclusion process and OS-delivered constraints in
[Password Manager Resources](https://github.com/apple/password-manager-resources#how-apple-uses-web-browser-extension-distribution-information).
Its [browser credential entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.web-browser.public-key-credential)
requires a request by the Account Holder of an organization developer account. Supported remediation
requires Apple inclusion or an approved/provisioned entitlement, followed by actual pairing/fill
acceptance. No Apple request was submitted, browser identity spoofed, helper modified or signing
team changed. Installing the extension is not proof of working Apple Passwords support.

Follow-up UI should report the observed compatibility limitation instead of suggesting repeated
installation can repair it. This diagnosis changes documentation only; the tested 80115ff176d2
release remains unchanged and Apple Passwords remains unverified/unavailable on this Mac.

Current rollout status: see [release acceptance](2026-10-21-browser-chat-release.md).
BF-91 and the peer-inventory correction are installed/live-verified locally and on Linux.
HC correction passed live acceptance and two-generation retention; the physical iPad is updated, with
215 protected files preserved and launch verified. Earlier queue holds below
are superseded by the operator's build/update authorization.

## October 21 — peer integrations acceptance correction

HC live acceptance of the initial 0.2.28 package found the read-only Other computers inventory
blocked by the desktop peer method allowlist. Added only `integrations.list`; recovery/check
mutations stay unavailable through this informational peer view. The paired-host regression now
exercises the actual encrypted peer request and verifies mutation commands remain rejected.
This correction supersedes the aa0b52aee873 desktop package; replacement acceptance is pending.
The preceding package's menu bar keep-awake, local preservation, global favorites, project move,
iPhone installation and web deployment passed their stated checks.

## BF-2026-10-21-91 — menu bar Keep Screen Awake

The operator requested a tray-controlled idle keep-awake feature. The desktop host now offers
**Keep Screen Awake**, off on launch, using Electron's native `prevent-display-sleep` assertion.
It remains active with windows closed and stops on toggle-off or application quit. It does not
move the pointer, require Accessibility input permission, or change system sleep preferences.
Native protection starts immediately, so it also covers sleep timeouts shorter than a few minutes.
Explicit locking/sleep and OS policy remain in control. The setting is local to this process;
restart/update returns to off. All 865 Node tests and syntax checks pass. Isolated Electron UI acceptance verifies the native
macOS display-sleep assertion, background operation, toggle-off and quit cleanup. Packaging is
in progress; installed apps are unchanged.

## BF-2026-10-21-90 — video fullscreen pop-out

Authorized with the current all-platform release. Source implementation reuses the live Chromium
view in an always-on-top Electron window matching the source window's size **and position**.
Fade close/drag controls; retain website playback controls. Escape/close returns without reload.
Selected-tab/profile fullscreen permission, owner closure/navigation cleanup and native full-window
fallback for non-video content. Isolated Electron acceptance passes; real sites and installed Linux
acceptance remain pending. No plugin or credential/session copy is introduced.

BF-86–89 and BF-2026-10-19-06 additional scope are now authorized and implemented in source;
see handoff and integrations-design for verified/deferred boundaries. Installation is pending.

## October 21 — duplicate browser tabs, navigation preservation and external auth review

Queue-only under the renewed build-confirmation hold. The external operating repository
was pulled as explicitly requested; no Proteus runtime code, authentication or live browser
state changed. BF-87 remains analysis; details are in integrations-design.md.

### BF-2026-10-21-89 — Duplicate browser tab in place

Add Duplicate tab to browser-tab right-click menus, adjacent to the source in the same
window/project/workspace/chat/Team placement. Use a fresh logical tab identity and an
independent deep copy of current full back/forward history plus active index; source history,
selection and live page remain intact. Read the latest owner snapshot, not a stale renderer
info object. Preserve profile, URL/title/custom label/favicon, relevant presentation settings
(supported zoom/scroll), Persist choice and association metadata. Reuse that profile's ordinary
cookie/storage/auth environment; do not clone credentials into another profile/computer.

Select/reveal the duplicate without collapsing navigation. Preserve unloaded behavior without
fetching just to copy; select/load behavior must be deliberate. Preserve fresh creation/activity
metadata and distinguish copied navigation records from a new website visit. Do not copy active
agent actions, a tab-specific sharing grant, in-flight approvals, debugger ownership, downloads,
media streams or pending form submissions. Duplicate is a new human-created tab under ordinary
sharing rules, not a view alias of the source tab. Live DOM/JavaScript/form/file-upload state is
not promised by URL/history cloning; verify supported restoration and disclose limitations.

Use one host-owned duplicate operation for all browser-tab menu surfaces, including both strips,
project children and Team. Keep existing Send a tab copy destinations separate. Fail safely for
closed/stale source or unavailable remote owner/profile; do not recreate on the wrong host.
Acceptance: loaded/unloaded, Persist, multiple profiles/windows, back and forward histories with
middle active index, redirects and source navigation during copy, independent later navigation,
close/restore/restart, placement, supported presentation state and explicit access boundaries.
Current Send a tab copy code passes some renderer URL/history/profile fields, but it is not an
in-place Duplicate action and is not evidence of the requested complete-state acceptance.

### BF-2026-10-19-06 follow-up — all feature/page loads preserve navigation

Operator reports another intermittent collapse with no known trigger. Expand acceptance beyond
Engine Room entry to every feature, tab, page and Engine Room section, including asynchronous
load completion/failure, background updates, remote reconnect, source refresh, tab restore and
renderer recovery. Retain workspace/project/computer expansion, nested states, More paging,
sidebar position and picker selections. Only explicit chevrons/Collapse all may collapse; explicit
workspace/project-name navigation may expand its target without changing siblings. Content/tab
selection may change as requested but must not reset unrelated sidebar navigation or chat/workspace
configuration pickers. Keep local and remote owner identities separate and temporary unavailable
owners from overwriting retained state.

Source currently persists expansion sets in sessionStorage and clears them through the explicit
Collapse all path; individual chevrons delete their own entries. No general feature-load clear was
found in the inspected path. This is not a diagnosis or reproduction of the reported event. Inspect
storage/restoration ordering, rerender focus/scroll handling and late responses in targeted
synthetic UI exercises when implementation is authorized. Preserve existing drafts/browser pages;
do not reload the operator's live app to investigate this intake.

## October 21 — additional release intake; build confirmation required

The operator has placed a new build hold: queue the following into this release and
wait for explicit confirmation before any new build/package. Accounts & Integrations
remains analysis only; do not implement its redesign or change live authentication.
Earlier build authorization records below are historical for the already-built artifact.

### BF-2026-10-21-88 — browser context-menu action order

Queue Open Link in New Tab as the first action whenever a link is present, including
when text is selected. Move Copy Selection/Copy and Select All to the bottom edit group
immediately above Inspect Element. Keep Copy Link with link actions, and retain link
opening, unloaded-tab, external-browser, download and chat-link behavior. Preserve
editable field semantics (cut/paste/undo), selection and captured tab/profile ownership.
Inspect Element remains last. No invented open-link action for non-link targets.
Acceptance: link with/without selected text, editable link target, ordinary page selection,
no-link page and inspect availability; verify keyboard actions and current browser view.
Source confirms the leading selection/edit group in desktop/browser-actions.cjs;
only documentation changed at intake, with no runtime/menu edits or UI test claim.

### BF-2026-10-21-86 follow-up — merge HC favorites during upgrade

The upgrade must independently union HC's own existing root and active-workspace lists
using the owner-side favorites migration. Do not overwrite HC with this Mac's list or
copy machine-local source IDs between computers. Check existing favorites survive,
all active/new workspaces show the shared list, and defaults/modes/approvals stay intact.
The migration code is already in source, but HC inventory/migration/live verification
remain pending its authorized upgrade. Follow desktop-updates.md for owner-chat routing,
exact tested artifact/source delivery, preservation and two-generation retention.

### BF-2026-10-21-87 clarification — configuration-centered MCP management

The intended page manages MCP definitions discovered from Source Library configuration
files, supports setup/check/authentication/recovery before a chat, and exposes matching
status in workspace and chat Instructions, skills, agents & MCPs pickers. Keep global
favorites separate from workspace source-loading choices and chat selection. Prefer
reusing compatible saved authorization across eligible chats; that is not blanket
sharing of live sessions, accounts or credentials between providers/computers. Expand
per-chat diagnostics beneath the source configuration instead of listing every run.

The operator asks whether external Bitwarden-backed token handling can stay in its
own connector repository. Analyze portable launcher/credential-provider and structured
health interfaces; no connector-specific credential copying, new grants, auth probes,
helper execution or login changes at this stage. See integrations-design.md for the
updated proposal, current adapter limits and unverified implementation details.

## October 21 — shared favorites implemented; integrations explanation/design

BF-2026-10-21-86 makes source favorites owner-global across existing/new workspaces.
One-time migration unions legacy root/active-workspace lists. Root favorites remain
authoritative; star/unstar uses revision checks and compatibility profile projections.
Bookmarks do not import another workspace's automatic source loading or approvals.
A supported-API merge on the local installed app combined three unique favorites into
seven existing workspace lists; before/after default-context and settings checks matched.
No raw live-data edits, HC changes, new package or installation. Future-workspace/global
star behavior is source-only pending an updated package/install; the previously tested
0.2.28 artifact predates these changes. See context-loading.md.

BF-2026-10-21-87 investigates Accounts & Integrations and proposes a clearer inventory
with per-owner connection evidence; see [design](integrations-design.md). The operator
requested explanation before choosing a combined/default-computer view; no redesign
implementation or choice is claimed. The recurring EPIPE screenshot matches BF-81;
its repair is in the built 0.2.28 artifact, while installed 0.2.27 remains unchanged.

Validation: all 858 Node tests, npm run check, git diff --check and the isolated Electron
favorites UI passed (shared stars across two workspaces, disabled MCP, retained draft and
narrow layout). Real integration account/pairing acceptance remains outstanding.

## October 21 — BF-74–85 implemented; 0.2.28 build authorized

The operator's “build all of this now” lifts the intake hold for this batch. Source implementation
and synthetic/unit/UI verification are complete. The signed 0.2.28 Mac package passed
packaged launch, UI and extension acceptance; no installation has been performed. See the
[current release ledger](2026-10-21-browser-chat-release.md) for scope, evidence and live limits.
The owner service now supports whole-project moves, and selected third-party MCP approvals use
existing eligible rules generically. No installed host or live project has been changed here.

Historical intake follows. Its queue-only/build-hold statements describe the earlier intake,
not the current authorization. Actual Touch ID/Apple pairing, original Social-profile behavior,
real Claude/HC MCP use and the authorized one-time project move remain live acceptance.

## October 21 — BF-85 third-party Codex MCP approvals declined by adapter — queue only

### BF-2026-10-21-85 — Route selected third-party MCP tool approvals through normal permissions

Status: Confirmed source/synthetic adapter defect; repair queued under **do not build yet**.
No HC access/change, real Codex/ADO/MCP/model call, authentication/grant change, runtime edit,
build, packaging or installation performed. HC handler/log behavior is operator-supplied evidence;
its private runtime log was not independently read in this intake.

The operator reports Work Mac's Codex chat repeatedly fails ADO MCP use despite recorded approval:
`mcpServer/elicitation/request` accepts only the `proteus_app` approval shape and otherwise returns
`{action:'decline',content:null}`. Source matches this account at `src/codex.js`'s elicitation branch;
the inspected local installed adapter matches source bytes. Before execution, the adapter separately
asks to enable each selected MCP server. That approval does not prevent the later blanket decline.

A synthetic run through the real CodexProvider with a fake native runtime and selected ADO server
records an approved server-enablement request, then delivers a matching third-party MCP tool-call
approval. The adapter returns decline without invoking `ask` again. No real server or command is
started. This reproduces the routing failure before the pending native tool executes; it does not
verify HC's auth/server health or imply that every ADO issue has this cause. Repeated sign-in or
self-recovery cannot add the missing application approval path.

Handle recognized native third-party MCP tool-approval elicitations through Proteus's existing
permission handler (`kind:'mcp'`, correctly captured server/tool/arguments), retaining Ask, eligible
saved operation rules and the original chat/workspace permission origin. Restrict to the actual
selected/enabled server and permitted tool set for that active native thread/turn; validate message
shape and authoritative tool identity rather than guessing authority from display text. Separate
server enablement from approval of an individual operation. Never replace this defect with blanket
accept, broaden selected tools, disable approvals or change native sandbox/reviewer controls.

**Operator clarification — all selected servers and existing saved approvals:** This is a generic
Codex adapter repair for every selected third-party MCP server, across supported stdio and HTTP
transports; ADO is the reproducing example, not an allowlist, special case or separate approval
implementation. Use each selected source's stable server/tool/action identity and the normal
permission decision path so existing eligible chat and inherited workspace approvals continue
to match. Honor their actual scope, permission origin, mode and revocation: matching saved grants
must return normal auto-approval without another prompt; Ask still suspends saved grants and
unmatched/protected operations still follow the existing handler. Preserve stored rules across
the update; do not clear/recreate approvals, rename their matching keys or migrate them into
broader access. If native names need normalization, preserve compatibility with existing canonical
rule identities without creating cross-server matches. Server-enablement/one-time approval is
not silently promoted into a persistent all-tools grant, and saved approval never activates an
unselected server or a tool excluded by that source. Record the real automatic decision source
through the existing approval receipt path rather than labelling it a fresh human approval.

Map the real human/policy decision to the supported native response shape and check active
thread/turn, request identity, cancellation and current permissions again after awaiting approval.
Preserve per-chat runtime isolation, exactly-once response/delivery and retry receipts; stale,
foreign, revoked or unavailable requests must not execute. Keep `proteus_app` custom-tool routing
and its narrow duplicate-approval bridge separate. For third-party native MCP calls, returning an
approval lets the native runtime execute the tool; do not also invoke it from Proteus.

Distinguish a native tool-approval envelope from generic MCP form/URL elicitation, login/OAuth,
ordinary user questions and unknown request types. Unsupported forms remain explicit unsupported
capability errors until implemented, not invented answers or a fabricated human refusal. Show the
actual decision source: human decline, saved-policy denial, stale/cancelled request, unsupported
adapter path, authentication failure and server/tool failure differ. An adapter-generated decline
must not be presented as the user rejecting an action they just approved. Keep secret-bearing tool
arguments/credentials out of diagnostic logs; existing permission display/storage rules still apply.

Future acceptance: approved and denied selected third-party MCP tools, saved rules/Ask, unselected
servers, restricted tools, malformed/unknown/form/URL requests, delayed approval/revocation,
thread/turn mismatch, duplicate/retried replies, resume and parallel chat isolation. Retain existing
`proteus_app` acceptance and exactly-once execution. Exercise multiple arbitrary server names and
both supported transports, including the same tool name on different servers. Load pre-existing
chat/workspace rules and verify matching requests auto-approve without prompting, unmatched
server/tool/action requests do not inherit them, Ask suspends them, revocation takes effect and
rules survive resume/restart/update unchanged. Verify with synthetic servers first, then an
explicitly authorized read-only ADO operation on the exact destination build. Do not replay an
uncertain external write or call deployment/dispatch success proof of ADO workflow completion.
Keep HC-specific approval/runtime receipts in its authorized owning chat/private workspace.

## October 21 — BF-84 Markdown file dates and recurring native-pipe error — queue only

### BF-2026-10-21-84 — Show created and modified dates in the Markdown viewer

Status: Queued for the next build under **do not build yet**. Documentation/source inspection
only; no file/content/metadata edits, viewer/runtime changes, build, packaging or installation.

Show clearly labeled Created and Modified dates in the Markdown viewer's document information
near its title/source. Use the original file's filesystem creation/birth time when available and
last-content-modification time, with readable localized date/time and an unambiguous timezone.
These are file dates, not tab creation, first opened, last accessed or client download/cache dates.
Do not substitute filesystem change time (`ctime`) for creation time or invent dates when birth
time is unavailable/invalid; show Unknown/unavailable explicitly. Do not parse frontmatter dates
as filesystem facts. Merely viewing or refreshing must not modify the source file or its dates.

Source inspection: the workspace Markdown reader obtains `fstat` but returns content/path metadata
without file dates; local Markdown rendering and authorized remote chat-document reads need the
same clearly named source metadata. Read dates through the existing authorized owner reader,
using a consistent verified file snapshot. Keep canonical path/root/size/type and symlink checks,
document IDs, content-version approval and unknown-field compatibility intact. Metadata must
describe the displayed source/version; do not pair an old approved/cached body with newer file
dates. Retain the owning Mac's source dates on paired desktop/web/native viewers rather than
using a local temporary copy's timestamps. Missing/offline/older-host metadata stays honest.

Refresh metadata alongside supported content refresh/reopen, preserving tab identity, reading
position and selection. Keep both labels readable with long titles/paths, narrow windows and
app scaling; wrap the information row without squeezing the document out of view. Carry the
fields through existing local and authorized paired-document paths without new filesystem grants.

Future acceptance: created/edited/unchanged files; unknown creation time and old dates; edit then
refresh; filesystem rename/atomic replacement; multiple tabs and restored reading positions;
different timezones; local/paired/web/native displays, older hosts and offline snapshots. Verify
dates against the owning file and confirm read/refresh causes no source-content/mtime write.
Actual metadata transport/layout verification remains future work.

The newly attached unsolicited EPIPE popup is recorded as another occurrence of BF-2026-10-21-81
below, not a new Markdown-viewer exception or evidence that document reading triggered it.

## October 21 — BF-83 Claude steering integration and capability-aware controls — queue only

### BF-2026-10-21-83 — Claude Steer is offered without an implemented provider path

Status: Queued under **do not build yet**. Source/installed-byte review, official documentation
and an in-memory provider-interface diagnostic only. No native Claude runtime/model call, live
chat interruption, SDK/package change, runtime implementation, build or installation performed.

The operator reports Claude chats say steering does not work and asks whether this is a Proteus
bug or an upstream limitation. Source matches installed `src/claude.js`: `ClaudeProvider` has no
`steer` method and its status explicitly advertises `capabilities.steering:false`. The per-chat
`SessionProvider` exposes steering only if its adapter implements it. `Engine.send` rejects active
steering before provider delivery when no method exists. An in-memory construction of the real
adapter/wrapper confirms both lack that method, without executing Claude. This is an unimplemented
Proteus integration, not evidence that the model ignored a delivered steering message.

The local and paired-desktop reply/queued-message controls in `public/app.js` and
`public/remote-desktops.js` offer Steer based on running status without checking provider steering
support. That is a confirmed capability/UI mismatch. Remote owner responses already expose
`ownerChatControls.steering` derived from the actual provider method. Use authoritative current
owner/provider capability for every applicable desktop/web/native/remote Steer and Steer queued
control, with useful unsupported wording and Queue next preserved. Keep the server-side guard;
do not show success or silently queue a rejected steer. Check native/web controls independently
rather than assuming every client currently applies the same capability test.

Proteus currently launches a private native Claude Code CLI per turn with bidirectional
`--input-format stream-json` / `--output-format stream-json` and control messages. It does not
import Anthropic's npm Agent SDK. It sends one initial user message, resolves on the first result
and closes that runtime; resumed turns retain the native session ID. Official Agent SDK streaming
input supports follow-up input/interruptions, and its published protocol includes interrupt control
requests. Upstream capability exists, but streamed messages may queue sequentially: that is not
proof of immediate injection into the running model/tool operation or exact Copilot semantics.

Queue a Claude active-input implementation against the supported installed runtime/protocol,
choosing a tested safe-boundary input or explicit interrupt-and-continue contract with honest UI
wording. Keep Queue next distinct. Verify runtime acceptance, user-message acknowledgment/identity,
turn/result ownership and bounded failure/timeout before advertising steering. Writing another
line to stdin is not proof of delivery: the first-result cleanup must not discard pending input,
mark an interrupted result as completed or leave two concurrent turns in one session. Do not
simulate steering by killing/restarting the process, replaying the prompt or changing providers.

Preserve captured model/context/tool permissions, pending approvals/questions, drafts, attachments,
native continuation, retry receipts and usage attribution. Keep message IDs/order and exactly-once
delivery through completion races, tool waits, cancel, queued-to-steer conversion, disconnect/retry
and app restart. Failed/unsupported input remains visible and recoverable; do not drop or duplicate
it. Route only to the correct per-chat runtime, with same-session serialization and isolation from
other active Claude/Copilot/Codex chats. Capability comes from the real adapter/runtime contract,
not a model-name table. Retain existing native authentication and source/permission boundaries.

Future acceptance: synthetic delayed user acknowledgment, interleaved results/tool requests,
permission waits, end-of-turn races and rejected/duplicate delivery; actual disposable Claude
session redirect behavior with provider-observed acknowledgments, same-session continuation and
usage; all client capability/queue controls and per-chat isolation. Keep real prompts/transcripts
outside Git. No live steering support or Copilot-equivalence claim until those checks pass.

Primary references checked October 21: [streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode),
[official bidirectional query/interrupt implementation](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/_internal/query.py)
and [CLI input/replay flags](https://code.claude.com/docs/en/cli-reference).

## October 21 — BF-81/82 Apple native-pipe error and profile-specific extension loading — queue only

### BF-2026-10-21-81 — P1: contain extension native-messaging pipe failures

Status: Queued repair under **do not build yet**. Screenshot/source review and an isolated synthetic
transport diagnostic only; no live native-helper launch, credential action, permission/signing change,
runtime implementation, build or installation.

The operator's Apple Passwords setup screenshot shows an uncaught main-process `Error: write EPIPE`
at `NativeMessagingHost.send` in `electron-chrome-extensions` (`dist/cjs/index.js:1936`, reached via
pending-message flush at `1920`). The iCloud Passwords popup remains on Loading passwords with
overlapping title content. This establishes an uncontained main-process error, not proof that the
entire app exited or that setup/pairing succeeded.

**Additional October 21 occurrence:** The operator later reports an apparently random popup.
Its screenshot repeats `write EPIPE` at `NativeMessagingHost.send:1936` and pending flush `1920`,
matching this failure path. It identifies neither the originating extension/profile/helper nor
the triggering user action. Do not attribute this recurrence to Markdown viewing, Apple alone,
Bitwarden or a full host crash without evidence. Extend acceptance to delayed/background helper
failure and late pending-message flush after setup closes or an extension retries. Record bounded
connection/extension/profile lifecycle attribution without credential messages, and deduplicate
failure notices rather than repeatedly interrupting the app with uncaught dialogs.

Installed/source adapter bytes match. The current native host listens for child-process error/exit
but writes to `process.stdin` without a writable-stream error handler, write completion/error
handling or a closed-pipe guard. Extracting the exact bundled class into an isolated synthetic
process with a fake native child/closed writable reproduces an unhandled EPIPE and process exit.
No actual Apple/Bitwarden helper, vault or session was used. The screenshot and transport test do
not identify why Apple's real helper disconnected. Prior OS/helper signature-kill evidence remains
a separate historical blocker; do not infer recurrence without current evidence or alter signing.

Contain native connection failures at the individual host/extension/profile boundary. Handle
stdin error/write completion/backpressure, early exit and late writes; bound pending queues and
deadlines, settle outstanding requests and disconnect exactly once. Make cleanup idempotent and
reject later sends rather than queuing forever after failure. Audit launch rejection, sender/window
destruction and native frame parsing/UTF-8 byte lengths under the same bounded lifecycle. Surface a
useful setup failure/retry/dismiss state without a global uncaught dialog or indefinite Loading.
Do not globally swallow uncaught exceptions, restart the host, replay credential messages, reset
accounts/profiles or weaken macOS signing to hide a native integration failure. Use a maintained,
reviewable dependency/integration repair with corresponding lock/notices if needed; no package
installation or dist patch during this queue-only intake.

Future acceptance: isolated early helper exit, spawn failure, EPIPE, shutdown during pending writes,
split/multiple/invalid frames, multibyte payloads, timeout, reopen and extension disable/reload across
profiles. Verify bounded errors and exactly-once disconnection with host/scheduler/other windows/
turns intact. Then verify the exact signed Apple setup path with human-owned prompts, title/layout
and honest failure recovery. Successful transport containment does not certify Apple pairing/fill.

### BF-2026-10-21-82 — Bitwarden blank after installation in another profile

Status: Queued diagnosis/repair under the same build hold. Operator reports Bitwarden not loading
in the Social profile beneath the Apple error. Read-only installation metadata confirms enabled
Bitwarden with its manifest, declared popup HTML and background-worker asset present and no saved
installation error. This proves registered files, not a healthy worker, rendered popup or vault.
Keep private profile IDs/paths and runtime records outside this repository.

Source finding: `BrowserExtensions.openPage` searches its global window set for an existing popup
using only `extensionURL`. Identical extension URLs occur in multiple profile sessions. A synthetic
two-session lookup matches/closes the other profile's popup, with no real extension involved.
Key lookup/reuse/toggle-close by actual owner profile/session plus extension/page identity and the
intended window ownership; one profile's open/install/disable/reload must not close or reuse another
profile's popup. This is a confirmed isolation defect, not yet the cause of the reported blank page.

Inspect the actual failing profile's worker start/console/errors, extension APIs/permissions,
navigation/resource/CSP failures and popup lifecycle after install; distinguish document DOM
readiness from a usable extension screen. Preserve per-profile extension storage, vault/session
state, website cookies, settings and permissions; do not reinstall/reset or grant broader access
as a generic remedy. Separate store download, permission review, registered installation, worker
startup and popup readiness/failure in app-owned feedback so completion does not leave stale
Downloading/loading states. Keep BF-81's native-pipe containment and BF-78 biometric acceptance
separate from ordinary Bitwarden popup loading; no shared cause is established by this screenshot.

Future acceptance: same official extension in Default and another named profile, simultaneous
same-URL popups, different app windows, newly installed and restarted profiles, and independently
closed/disabled/reloaded extensions. Verify correct session/owner, rendered usable setup/unlock
screen, isolated storage and truthful failure/retry state with other popups and active work intact.
Use synthetic credentials only where needed; actual unlock/biometrics require the human's approval.
Original profile-specific blank loading remains unreproduced pending future authorized UI work.

## October 21 — BF-80 reduce repeated browser-tool payloads without losing history — queue only

### BF-2026-10-21-80 — Compact agent results and shared favicon assets

Status: Queued design/performance correction under **do not build yet**. Source inspection only;
no runtime change, browser/provider call, usage measurement, build, packaging or installation.

The operator relays Claude's report of slow/bulky `proteus_browser` results, with repeated long
navigation histories and base64 favicons, especially multi-tab lists. The operator explicitly
wants tab history retained for agent context. Do not adopt latest-entry-only history or omit full
history by default as the solution. Reduce repeated decorative image bytes first; investigate
lossless history delivery separately, preserving both stored history and usable model context.

Source findings match the installed `desktop/browser.cjs` and `src/browser-tools.js` bytes:
`BrowserTabs.state` includes inline favicon data and includes logical history whenever present,
even with `includeHistory=false`; unloaded state can carry saved history. Most open/navigation/
load/snapshot/action results reuse that state. The agent `list` path explicitly removes history
already, but retains favicons per row. `modelToolResult` JSON-stringifies these ordinary objects,
so favicon bytes become model text. Existing session/icon fetch caching avoids some downloads;
it does not deduplicate serialized tool responses. The report's exact entry count, provider token
cost and latency were not independently measured; do not label every list as containing history.

- Add a model-facing result projection at the shared browser tool boundary, separate from full
  UI/native/persistence state. Retain stable tab/owner/profile/placement identity, current URL/title,
  access/lifecycle/error information and navigation context needed for safe actions. Do not alter
  canonical history, reload behavior, saved restoration data or UI favicons to shrink model output.
- Keep favicon pixels in a bounded owner/account/profile-scoped shared asset cache. Tool metadata
  may use a compact opaque icon reference/version or omit decorative icon metadata; no repeated
  base64/data-URL image bytes in routine model text. Deduplicate identical normalized image content,
  not merely similar page URLs or a whole domain: path, tenant, account and dynamic icons can differ.
  Preserve existing session-bound resolution, origin/credential rules, freshness and invalidation.
  Do not introduce an external favicon proxy or fetch unloaded pages just to populate the cache.
- UI/authorized clients resolve icon references through the owner boundary with existing access
  checks. If a model actually needs an icon, offer explicit retrieval in a supported image response;
  do not automatically replace repeated base64 text with repeated image blocks. Handle cache misses,
  stale references and icon changes without exposing another profile/account's assets.
- Preserve complete agent-visible navigation history by default while reducing favicon overhead.
  Evaluate an explicit lossless history baseline/revision/delta mode: initial tab-context delivery
  supplies the full safe URL/title/entry-ID/order/current-position baseline, subsequent replies can
  send additions/updates/removals/position changes against a caller-known revision. Always include
  a useful current navigation summary and clear completeness/revision state; never substitute only
  a count or opaque reference for the requested historical context. Repeated URLs remain distinct
  history entries. Preserve Forward branches, redirects and truncation semantics.
- Any history optimization needs an explicit full-history/resync path and bounded pages with
  totals/continuation, no silent truncation. Recover after model-context compaction, provider/session
  changes, retries, restart, missing/out-of-order deltas or unavailable baselines; having sent a
  history once does not prove it remains in the active model context. Keep full-history behavior
  until that context guarantee is verified. Large tab inventories need explicit paging/filtering
  and totals, without injecting every tab's full history into a routine list.
- Apply consistent projection/transport through internal tools, external MCP and supported provider
  adapters. Keep actual screenshot/image transport intact. History/assets remain scoped to existing
  page/history authorization; metadata inventory must not become an unshared-page history bypass.
  Update schemas, required tool guidance and client compatibility when implemented. Transport
  compression alone does not remove text from the model's context.

Future acceptance: synthetic dozens-of-entry histories with long/repeated URLs, many tabs sharing
identical icons, distinct icons on similar URLs and multiple profiles/accounts. Measure serialized
bytes and repeated-result growth before/after; use real provider token/latency observations only
when actually obtained. Verify default history fidelity and full baseline/delta reconstruction,
Back/Forward/redirect/truncation semantics, fresh-context resync, cache invalidation/eviction,
revocation and restart. Regress UI favicons/history/restoration and ensure page snapshots and
image results retain useful content. Keep workload/URL/provider traces outside this repository.

## October 21 — BF-79 Command+R refreshes the current tab — queue only

### BF-2026-10-21-79 — Route refresh to selected content, separate from shell reload

Status: Queued for the next build under **do not build yet**. Documentation/source review only;
no shortcut/runtime changes, live refresh, UI test, build, packaging or installation performed.

The operator reports Command+R reloads the Electron application instead of refreshing the current
tab. Source confirms View → Reload Window in `desktop/main.cjs` explicitly binds
`CommandOrControl+R` to `recovery.reload()`. Embedded pages already intercept Command/Ctrl+R and
F5 in `desktop/browser.cjs` for their own native reload. Shell focus and native page focus therefore
have competing refresh paths; the menu accelerator must not reload the shell for ordinary refresh.

Bind Command+R to Refresh current tab in the initiating window, using its selected content tab
and existing host-owned refresh action. Browser reload must target that exact logical/native tab
whether focus is in the webpage, address bar, tab strip or other shell chrome. Cover standalone,
workspace/project/chat-child and Team browsers, plus paired tabs through their owning computer.
Keep explicit View → Reload Window available for renderer recovery as a separate deliberate action,
without the ordinary Command+R binding. Review Ctrl+R/F5 and existing force-reload handling for
consistent routing and no duplicate dispatch; document/test any separate recovery accelerator.

For non-browser content, use its supported tab-level refresh/re-read behavior while preserving
drafts, selection and state. If no refresh exists, leave that tab/session intact rather than falling
back to shell reload. Never restart a terminal, replay startup commands, resubmit a chat message,
restart a provider turn or run a schedule as refresh. Preserve unrelated tabs/windows, approvals,
queued messages and retry receipts. Capture current owner/tab identity before asynchronous work
and reject stale replies; do not refresh a remembered background browser behind a selected chat.

Future acceptance: actual shortcut/menu checks with webpage and address/shell focus, local/paired
browser scopes, multiple windows and rapid tab switching. Verify exactly one selected-page reload,
no shell navigation/renderer recovery and no reload in other tabs/windows. Check supported viewer/
feature refresh and unsupported terminal/New chat behavior with drafts intact. Exercise explicit
Reload Window separately on healthy and recovery/fallback surfaces. Source tracing is not live
reproduction or acceptance of the future fix.

## October 21 — BF-78 Bitwarden extension biometric unlock — queue only

### BF-2026-10-21-78 — Validate and support Bitwarden desktop biometric integration

Status: Queued compatibility/setup work under **do not build yet**. Read-only feasibility review
only; no runtime changes, builds, extension/desktop setting or permission changes, native-host
launch, vault unlock or biometric enrollment performed.

The operator requests biometric login from the official Bitwarden extension's Account security
screen. Treat this as biometric vault unlock after initial account sign-in, using Bitwarden's
desktop integration. The screenshot establishes the option is present, not why it is unchecked
or whether a permission/transport/desktop-authentication failure occurred.

Current source and installed `electron-chrome-extensions` 4.9.0 already implement permission-gated
`runtime.connectNative`/`sendNativeMessage` and macOS native-host discovery, including Chrome's
registered host directory. Read-only local inventory finds the official Bitwarden desktop app,
its proxy, a registered host allowing the official extension origin and an enabled official
extension declaring optional `nativeMessaging`. This makes integration plausible; it does not
verify desktop readiness, permission approval, the actual handshake or Touch ID. Do not describe
native messaging as wholly absent or assume another bridge/package is needed.

Use the official extension and Bitwarden-owned native proxy/desktop app. Verify optional native
permission request/grant/persistence and useful denial/error behavior, host lookup, allowed origin,
proxy startup/IPC, desktop account/biometric readiness and human confirmation. Bitwarden's help
mentions that some Chromium browsers may also need file-URL access; diagnose the actual need
against Proteus's current `allowFileAccess:false` loading before proposing a narrowly scoped,
explicit per-extension control. Do not silently enable file access or change another browser's
native-host registrations. Prefer setup guidance/diagnostics when the current transport suffices.

Keep biometric approval local and human-controlled. Preserve extension/profile/account isolation,
native-host identity and existing browser-sharing boundaries; expose no vault/native-host/biometric
endpoint to agents or relay clients, store no secrets in logs and do not spoof a successful unlock.
Each owning Mac needs its own desktop setup and local authentication; another Mac/mobile client's
biometric approval must not be forwarded as authorization. Bitwarden CLI, initial sign-in, passkeys
and native mobile system AutoFill remain separate compatibility scopes.

Future acceptance: synthetic native-host permission/lifecycle/error/profile isolation tests, then
exact signed-app integration with Bitwarden desktop and operator-completed Touch ID. Verify enable,
lock/unlock, cancel/deny, desktop closed/locked, reconnect, extension disable/reload, app restart
and multiple profiles; retain usable password/PIN fallbacks. Validate on each claimed platform
independently and avoid inferring live support from extension installation or API presence.

Primary references checked October 21: [Bitwarden biometric setup](https://bitwarden.com/help/biometrics/),
[current desktop feature matrix](https://bitwarden.com/help/desktop-app-feature-support/) and
[native-messaging architecture](https://contributing.bitwarden.com/getting-started/clients/browser/biometric/).
The contributing page has older platform restrictions than the current feature matrix; use current
help plus actual installed-version evidence for availability, not the older restrictions alone.

## October 21 — BF-77 wider New chat contents and taller message box — queue only

### BF-2026-10-21-77 — Responsive New chat layout sizing

Status: Queued for the next build under the existing **do not build yet** hold. Documentation
only; no runtime implementation, preview/build, packaging or installation in this intake.

Make the tab-hosted New chat contents 30% wider at normal/large window sizes while allowing them
to shrink to the available content area in very small windows. The current `.new-chat-tab-panel`
cap in `public/desktop-preview.css` is 820 CSS pixels; target a 1,066px cap (820 × 1.30), centered
and bounded by available pane width with sensible gutters. Keep fields/controls able to wrap or
stack without horizontal overflow, clipping or a fixed minimum width that defeats small windows.
Increase this New chat tab's message-entry area by 15% at ordinary sizes; resize the editor area,
not its text, toolbar or the entire application. Keep adaptive shrinking/scrolling on short or
very small windows so setup fields, attachments, model controls and Send remain reachable.

The message editor is sized by both `.new-chat-tab-panel .new-chat-composer textarea` and the
shared `mountChatComposer` measurement in `public/chat-composer.js`. Apply the 15% increase to
the actual rendered normal-size baseline, including the sizing logic; changing a CSS minimum
alone is not proof of the requested result. Scope it to tab-hosted New chat, covering local and
paired-destination setup, while preserving drafts, attachments, source choices, focus and normal
auto-growth. Do not infer a size change for existing conversation reply boxes from this request.

Future acceptance: compare rendered content width and empty/short-draft editor height against the
current baseline at the same viewport/app scale; verify +30% width where room permits and +15%
message height. Exercise wide, narrow and very small/short panes, sidebar widths and app scaling;
confirm wrapping, vertical reachability and no horizontal overflow. Check long drafts, attachments,
expanded sources, local/paired setup and tab switching retain content and controls. No new layout
or UI acceptance is claimed until implementation is authorized and exercised.

## October 21 — BF-75/76 project placement investigation and whole-project moves — queue only

### BF-2026-10-21-75 — Investigate reported project workspace mismatch

Status: Read-only investigation completed to the limits below; original placement cause remains
unconfirmed. Any further repair/implementation is queued under the operator's **do not build yet**
hold. No live project, chat or tab was moved or edited.

The operator reports a project displayed in the wrong workspace after the last update. Its
intended workspace comes from the operator, not an inference from its title. The authenticated
running owner API confirms the displayed workspace is the saved catalog assignment. Both retained
October 21 pre-install recovery generations contain the exact same project record/assignment as
live data. The associated chat's original October 20 captured workspace configuration also names
that workspace, with no recorded chat move. This does not support a move by the latest update;
it does not establish why the original placement differed from the operator's intent. Private
project/chat identifiers, context and snapshot paths remain outside this repository.

The installed project service matches the inspected source. Its additive migration preserves an
existing catalog; creation uses the requested workspace; reorder and deletion redirects remain
within a workspace. No whole-project move action exists. Existing migration/placement suites pass
22 tests against disposable data. These checks do not reproduce the original creation interaction
or rule out an earlier destination-selection bug. Audit creation/opening/restoration owner IDs and
captured workspace versus visible destination, including delayed responses and multiple windows;
verify saved membership independently of labels before treating a mismatch as migration damage.
Use synthetic fixtures for any regression; retain current revision/unknown-field protection.

### BF-2026-10-21-76 — Move a whole project between workspaces

Status: Queued feature only for the next build. No runtime implementation, live relocation, build,
packaging or installation is authorized by this intake. This extends individual chat/tab moves;
current deletion redirects are constrained to the same workspace and are not a project-move API.

**October 21 one-time-move feasibility check:** The operator explicitly requests moving the
reported project now if it can be done safely, and asks about paired Macs. Fresh read-only owner
inventory confirms one associated chat and three direct project tabs (chat plus two browsers).
The installed owner service has no whole-project move action. A synthetic in-memory catalog-only
workspace change makes the unchanged chat resolve to its old workspace's General project and
leaves both local and paired saved project roots on the old workspace. Current same-ID remapping
does not reconcile that change. This is a reproduced shortcut failure, not evidence that the
earlier update moved the operator's project. Paired clients consume owner catalog/membership
updates, but refreshing those alone does not repair every saved view or transfer execution to
another Mac. No live move/raw data edit/build was performed. Retain the request and reconcile
these records through a supported owner operation before claiming the one-time repair is safe.

- Add Move project to project management, selecting an existing workspace on the same owning
  computer. Show the project, source/destination and affected chat/tab counts, plus the new-chat
  defaults change. Keep the project ID/name and its complete contents together; do not recreate a
  project or approximate the move by deleting it and moving only its currently visible children.
- Move organizational membership for all associated chats, including closed and archived chats,
  plus every project tab and chat descendant: browsers, terminals, document/artifact viewers and
  other supported resources, including hidden/unloaded/Persist entries. Retain IDs, order, archive/
  visibility state, browser profiles/history/forms, live PTY/processes, viewer sources/authorization,
  drafts/attachments, sessions, approvals and retry receipts. Placement does not move project files,
  change resource hosts/grants, rerun terminal startup, replay turns or cancel active work.
- Existing chats retain their effective run configuration and captured running/queued-turn context.
  New chats created in the moved project reset to the destination workspace's current defaults,
  starting-folder/context/source/agent/MCP choices and applicable approval configuration through
  ordinary new-chat validation. Do not carry cached source-workspace defaults into new chats or
  reset existing chats to destination defaults. Preserve unsent setup text/attachments while
  explicitly rebasing its workspace-owned selections; reject stale source-catalog replies.
- Maintain a valid default project in both workspaces. Moving a source default requires selecting
  a replacement first; do not change the destination's default implicitly. Preserve unrelated
  projects and define destination ordering. Surface dependent schedule references without silently
  rewriting source-owned schedule JSON, changing activation or changing captured execution scope.
- Use one host-owned service operation for UI, internal tools, external MCP and supported paired
  clients. Check fresh source/destination/catalog and affected-set revisions; commit validated
  catalog state atomically, preserve unknown fields and journal durable progress/retry receipts
  for multi-record reconciliation. Handle partial failures/restarts honestly and converge without
  duplicates or stale-client resurrection. Update every observing window/client's sidebar, filters,
  project/chat/tab membership, saved navigation and restoration state; preserve live resources.

Future acceptance: empty/populated projects; default-project safeguards; complete closed/archived/
hidden/unloaded resources and chat descendants; multiple windows and paired desktop/web/native
views; active/queued chats and pending approvals; terminal PID and browser/viewer continuity;
new-chat destination defaults and stale setup responses; cancel, revision conflict, retry, partial
failure, restart and old-client reconciliation. Verify final owner state and dependent schedules.
Implementation and live acceptance remain deferred; BF-75's reported project is not moved here.

## October 21 — BF-74 URL-bar suggestions must keep the webpage visible — queue only

### BF-2026-10-21-74 — Nonblanking address/history popup

Status: Queued for the next build. The operator explicitly says **do not build yet**. This intake
authorizes documentation only; implementation, build, packaging and installation remain held.

The operator's screenshot shows the URL field focused with its recent-history suggestions open
and a white browser area beneath them. Keep the current webpage visible while editing the URL or
browsing suggestions, matching the compact menus already corrected in BF-2026-10-20-52. The
anchored suggestions may cover their own footprint; opening them must not hide/blank the rest of
the browser, navigate/reload it or discard its scroll/form state.

Source inspection: `public/browser-recents.js` still mounts the desktop list in the shell and
`bindDesktopBrowserRecents` sends an `address-recents-*` overlay token. In `desktop/browser.cjs`,
`BrowserTabs.setOverlay` hides the native page while that token is active. Queue migration to the
existing owner-bound compact popup approach; CSS stacking alone cannot overlay a native page.
Keep URL editing focus, history filtering/search choices, visit metadata, Arrow/Enter selection,
Escape/outside-click dismissal and existing profile/history access boundaries. Bind choices and
late history replies to the originating window/tab/profile; dismiss on owner change or toolbar
removal without leaving stale suppression or navigating a newly selected tab.

Future acceptance: exercise loaded main, workspace/project/chat and Team browsers, multiple
windows/profiles and narrow/resized windows. Verify the page remains visible outside the popup
through focus/typing, empty/error results and dismissal; preserve its native identity, forms and
scroll position. Check keyboard/mouse selection navigates exactly once, typed URL/search submission
still works, and delayed replies/tab switches cannot reopen or target the wrong owner. Regress
existing compact menus. No implementation or live UI acceptance is claimed by this queue entry.

## October 21 — BF-73 desktop renderer crash recovery and brand centering

Operator reports 0.2.26 left a black window after a macOS renderer EXC_BREAKPOINT/SIGTRAP on
October 21 at 1:35 a.m. MDT, while host/scheduler and embedded browser pages remained alive.
View Reload did not restore it and the installed code had no crash recovery handler. This is
reported evidence; the triggering cause remains unknown. Add per-window failure detection,
bounded asynchronous renderer recovery/current-generation readiness, native View retry, a visible
fallback, preserved tabs/native pages/drafts/approvals and host execution without turn replay.
Test actual renderer deaths with multiple windows and held synthetic turns. Center the drag brand
between native controls and the unchanged first-tab boundary. Implemented and accepted in signed
`e9e22a05e82d` (281 runtime files): 844 runtime/static checks, source and exact signed real-crash
tests with separate main-browser/Team windows, host/scheduler continuity, native form state,
pending approval and exactly-once synthetic turns pass. Bounded fallback and native-menu retry
are exercised. Final preview is open with nine histories/thirteen protected files preserved;
restored selection remains visible and brand centering passes exact geometry/visual inspection.
The operator subsequently authorized both Macs/Linux/web and iOS if needed. Signed e9e2 is now
installed/live-verified on both Macs with protected data/receipts retained; HC's selected
destination is “Wait for Proteus update”, where direct operator approval superseded the hold.
Linux installation/live acceptance and source/report publication are complete. HC recovery retention
is complete after direct cleanup approval, leaving two verified full recoveries with live data
untouched. Web palette release is deployed and current physical iOS needs no redundant update.
See the release ledger for exact per-target status/qualifications. The original crash trigger is
still unknown; renderer recovery does not identify it.

## October 21 — BF-71 tab selection and scoped lower controls

Remove the synthetic lower label/control row on top-level content. Keep real scoped navigation
and the separate App overview/+. Reproduced an ignored tab click with selected content text;
remove the global selection gate from tab switching. Real background creation also exposed
extension bookkeeping echoing older selection requests; suppress synchronous host reflection,
preserving genuine extension API activation. Source and exact signed header/selected-text, extension activation/rapid switching and background/link/chat/
project/Team insertion UI checks pass. Corrected e036 normal app is installed and demo is open;
original data/history/receipts and provider readiness are verified.

## October 21 — BF-72 installation-local saved palettes

Desktop atomic settings and native app preferences already retain each instance's saved palette.
Web adds the same Engine Room editor with account-scoped browser-local versioned JSON, revision
checks, startup restoration and cross-tab storage updates. Independent browsers/devices/hosts do
not share settings implicitly. Source restart/isolation/conflict cases, actual web save/reload UI
and Vite build pass. Website release 20261021T170134Z is now deployed with nine served assets /
manifest and fourteen endpoints verified. Authenticated production palette interaction requires
sign-in in the current browser; see the release ledger for the qualified recovery verification.

## October 21 — BF-70 compact iPhone browser footer

Remove the extra eight-point bottom padding and any duplicate nested safe-area allowance below
the bottom browser navigation. Retain 48-point touch targets and keyboard handling. The actual
iPhone simulator verifies the control edge reaches the window bottom without a blank strip,
address swipes, scroll/chrome recovery and normal browser use. Native 2610.20.6 is installed and
launch verified on both physical devices; 73 phone and 215 tablet protected files match the cold
capture before launch. Physical gesture smoothness is separate from simulator UI verification.

## October 20 — BF-68 nonobstructing browser notifications and iPad sync conflict

The operator reports a load-failure popup and a browser-history conflict tray covering the page
after opening a shared tab on iPad. Route these failures through the existing notification history/
Needs attention system, retaining useful reload/log/recovery actions and durable pending navigation.
Do not clear conflict outboxes or replay navigation silently. Keep notices scoped to their original
host/window/tab and existing revision/receipt boundaries. The exact operator sequence is unverified;
a native regression confirms that redirect chains and repeated KVO/finish observations of a mirrored
load must retain shared URL/history/forward entries until deliberate local navigation. The source
guard repair passes that regression, including trusted SPA button navigation. Desktop synthetic
native-load failure and stale recovery checks verify Notifications/log actions without page
popups, preserving unresolved recovery. Exact signed e036 packaging and local install pass;
the exact operator cross-device sequence remains separate. HC installation remains explicitly held; do not touch its important chats.

## October 20 — BF-69 reveal new tabs from every entry point

Whenever either main or content strip gains a tab, scroll that strip to show its complete label
and close control. This includes links opened in a new tab, chat/tool actions and background opens,
not only +. Keep selection/focus unchanged for background creation, preserve manual scroll across
ordinary metadata refreshes/reorders, and keep scope identity. Source adds insertion tracking at
main/chat-project/Team strip boundaries and fixes selected-tab reveal to include its entire wrapper
and continue to the child strip when the top root is absent. Native strip insertion no longer
requires selecting the new ID. Actual source UI verifies complete root/project/Team and link/chat
insertions, preserved background selection and manual scrolling. Initial title width changes remain
visible without stealing subsequent manual strip input. Exact signed e036 functional checks pass,
with the normal app installed locally and corrected demo open.

## October 20 — BF-67 separate app-navigation overview restored

Restore the existing App tab overview immediately left of the top strip's +, retaining its current
overlapping-tabs glyph. It lists this window's main navigation items only. Keep the lower scoped
workspace/project/Team content overview separate. Desktop already has the `main` overview model;
the unified strip had hidden its button. iPad gains the same root-only view with independent
presentation state. Source desktop/two-window and iPad selection checks pass; normal/preview
e036 normal/preview packages pass and the local app plus native 2610.20.6 are installed.
HC remains explicitly held and untouched.

## October 20 release acceptance follow-up — BF-64–66

The build/install hold is superseded for the authorized 0.2.27 rollout. Engine Room palettes,
KB/s and certificate repair are implemented; all 838 runtime/static checks pass. The actual palette
stylesheet is bundled under the strict CSP (no inline-style allowance). Native 2610.20.4 is installed
on phone/tablet with a preserved snapshot and process launch checks. It includes selected-ID browser
rendering, restored-workspace switching acceptance, lower-row underlines, eight-point workspace
gaps/divider placement, plain desktop-like Engine Room options and name-triggered workspace/project
expansion with full row touch targets (phone/tablet UI verified). The corrected signed desktop
and retained design preview are installed/open and accepted; second launch retains exact history
and protected retry receipts. HC is explicitly held by the latest operator instruction while an
important chat runs; its update chat confirms 0.2.26 and both chats are untouched, with the corrected
packet staged only and no automatic resume. Consult the release ledger for each actual target.

## October 20 — 0.2.27 implementation and installation authorized

The operator lifts the earlier installed-instance hold for this release and approves installations
and chat disruptions. Build/install the accepted accumulated design and browser repairs on this
Mac and the physical iPhone/iPad; preserve current data, identities, drafts and recovery generations.
Do not interpret old preview-only entries below as current holds for this scope.

### BF-2026-10-20-64 — Permanent palette editor

Implemented source: Engine Room Colors in the actual desktop/native UI, live pickers and surface
sliders, a named saved palette, discard/reset and explicit portable JSON import/export. Desktop
Save uses current settings revision and propagates to windows; drafts remain window-private.
Native saves locally, with no implicit cross-device palette change. Actual validation/install
status is tracked in the release ledger, not inferred from implementation.

### BF-2026-10-20-65 — Download speed and certificate viewer

Implemented source: rolling KB/s in the desktop popup/native list; pause/stall/restart semantics;
correct main-document certificate invalidation, pre-navigation observation, shared debugger leases
and Chromium-default verification-chain observation bound to current TLS details. Native uses
WKWebView serverTrust. Invalid certificates remain rejected in exact signed package acceptance.

### BF-2026-10-20-66 — Native parity and device-owned navigation

Implement relevant palette, domain scale/private suffix rules, device-wide autoplay, certificate
and rate controls. Preserve iOS's independent mixed-owner main navigation and single-scene setup;
no multiwindow tracking/restoration. Retain existing Team/label/pinch/row-height fixes and Apple
AutoFill guidance. Compile/unit/UI and physical installation/launch remain distinct acceptance.

## October 20 — window browser controls and installed Mac stability

### BF-2026-10-20-59 — Team Find and conflicting browser tabs

Operator reports Team new-tab flashing with Find open, timed-out search and conflicting tabs in this Mac's installed app. A disposable test against exact installed code reproduces a late navigation reply overwriting the newly selected tab's renderer URL; the corrected code preserves the captured tab. Reject stale owner navigation writes at the native boundary; use the completed native URL/history rather than replaying the requested redirect URL. Keep Team mounts for ordinary URL changes, avoid repeated unchanged surface selection and bind early submission before IPC. Cancel superseded native Find requests and use renderer search on blank/setup tabs. The precise reported reload/Find sequence is not fully reproduced by this navigation test; keep that limitation separate from the verified race. A minimal validation candidate from the exact installed checkpoint passes 817 tests and exact signed UI checks. The operator subsequently directs next release only: do not touch the current installed instance. The next-release source already contains the fixes; historical candidate acceptance is not installation authorization.

### BF-2026-10-20-60 — Nonblocking window Downloads

Use the compact child-window approach above native websites, with leading file-type/system icons, filename/status/progress, horizontal separators and trailing controls. Show pause/resume only for a live supported DownloadItem; restart interrupted/cancelled HTTP(S) downloads explicitly using the same available profile and a newly reserved file, never replaying POST input. Use a folder icon and Open in Finder tooltip. No Show all downloads feature. Keep metadata in memory for the owning window; remove legacy history metadata, preserve downloaded files/folder preference, reject cross-window item actions and clear rows when their window closes. Existing Chromium cancellation on closing the owning page is not a promise of background transfer after app/window closure.

### BF-2026-10-20-61 — Adjustable color design draft

Provide a full-shell palette draft with color pickers for each depicted surface, text, icon, divider, message edge, progress and native control, plus green-surface lightness/saturation sliders. Retain the chosen integrated header, current tab close/divider/underline style, native overview glyph and joined sidebar. Color exploration stays local until the operator selects the palette; it does not rewrite installed appearance settings.

### BF-2026-10-20-62 — Global video autoplay preference

Page menu adds Block video autoplay in all tabs. One host-owned preference spans windows/profiles and persists until changed. Apply before website-frame scripts, cover muted/declarative video and script play calls without human activation, and update live frames without reloading. Manual playback remains available. This is a playback preference, not a security boundary against adversarial sites overriding media prototypes. Verify real media in disposable fixtures; YouTube/account-specific behavior is a separate live acceptance claim.

### BF-2026-10-20-63 — Explicit browser sharing by default

Supersedes BF-2026-10-15-08's/October 18's implicit ordinary-tab page access and the earlier pause-only preview. Human-opened tabs, including legacy implicit grants, start unshared; host-created agent tabs are granted on creation. The human robot button shares/revokes a stable logical tab across window aliases/recreation. Persist explicit grants and revocations with optimistic revision protection; unreadable grants fail closed. Profile/account, developer-debugger and workflow approval boundaries remain. Inventory/placement/lifecycle are distinct from page access. All direct, screenshot, coordinate and MCP page backends use the same host gate. request-access asks a native human decision with default Decline, deduplicates pending/refused requests per run and verifies fresh logical identity/profile/URL/preference revision before granting. Agents cannot silently resume themselves. No live settings/grants are changed merely by staging this preview.

## October 20 — Apple Passwords popup presentation

### BF-2026-10-20-58 — Readable, content-sized extension popup

The operator reports an oversized white Apple Passwords popup, missing-looking labels and duplicate
native/content titles. Bound generic extension popups to their preferred content size within the
screen, show after DOM readiness and retain resizable options windows. Apple’s official popup has
an existing `popupWindow` mode; use it to avoid the duplicate content header. Apply a scoped green
palette with explicit foreground/input contrast, hide empty loading controls and suppress its
initial fade. Close only the affected profile’s extension popups when disabling/removing/reloading,
so unloaded renderers do not leave inert windows. Preserve Apple’s
content, pairing/approval flow, exact extension identity and isolated profile. No vendor file edits,
credential reads or native-helper security bypass. Validate actual pixels and window bounds before
reopening the retained preview.

## October 20 — Apple Passwords on Mac, iPhone and iPad

### BF-2026-10-20-57 — Apple Passwords integration

The operator requests both desktop Mac and iPhone/iPad support within the current preview work.
Use Apple’s official iCloud Passwords Chrome extension on Electron Mac, retaining its exact store
identity and Apple-owned native helper, permission review, pairing code and unlock UI. Provide a
per-profile setup/open control in Engine Room → Browser Preferences; do not import a vault or
expose extension backgrounds/popups through agent browser tools. Ordinary website access and
human-selected autofill are distinct from permission to inspect a vault.

Native iPhone/iPad already use WKWebView: Apple handles website password/passkey challenges and
system AutoFill. Add explicit Apple Passwords guidance plus the public AutoFill-provider settings
shortcut, preserving device-owned profiles and Apple’s credential selection/biometric approval.
No desktop Chrome extension is installed into WKWebView. Passkeys in Electron are separate:
Electron’s device-bound Touch ID authenticator is not iCloud Keychain passkey synchronization.

The official extension installs and reaches its setup UI in the disposable preview. Apple’s installed
native helper is killed by macOS with `SIGKILL (Code Signature Invalid)`; its on-disk signature verifies.
The same empty-input launch outside Electron is also killed. Do not attribute this to Electron or
bypass OS signing protections. Mac fill/save remains blocked on helper execution; retest with the
signed normal build/healthy OS before calling it supported. Native settings shortcut acceptance
and desktop popup style acceptance are recorded separately in desktop-preview.md.
No production/HC/physical installation, account change, real credential submission or vault export
is authorized by synthetic compatibility acceptance. See [browser integration](browser.md).

## October 20 — tab-hosted setup, domain scale and background-browser continuity

The operator authorizes these changes in the isolated design preview. Runtime implementation is
present; exact-package and retained-data acceptance are recorded in desktop-preview.md.

### BF-2026-10-20-52 — Unified adjacent tabs and nonblanking compact menus

Add tab to left/right immediately creates the unified new-tab view in the captured scope and
position. Keep the current page visible beneath compact tab, Ghostery and other popup-menu clients
by reusing the sandboxed child surface introduced for the page … menu. Retain captured actions,
validated labels/colors, blur/Escape dismissal and owner/frame checks. Large legacy HTML dialogs
still hide native views; this change does not claim a general overlay compositor.

### BF-2026-10-20-53 — New chat setup inside its tab

Selecting New chat replaces the blank view with a centered setup card. Preserve message, sources,
folder/provider/model controls and attachments while switching tabs. Keep multiple forms mounted
with unique IDs; save bounded unsent text/configuration in private window/session snapshots.
Attachment selections survive tab switches, but attachment bytes are not serialized across restart.
Submitting converts that exact position to a normal local/paired chat, with one pending submission.
Draft contents are private to the window, separate from canonical shared blank-page membership.
Explicit pending-open intent survives initial authoritative reconciliation until acknowledged;
reusing native creation notifications prevents duplicate local entries. Preserve destination-owned
catalogs and prevent stale responses from applying across destination changes.

### BF-2026-10-20-54 — Page scale by root domain

Persist the actual native page scale (25–500%, including 120%) by registrable domain and account-owned
browser partition. Apply it across schemes, paths, subdomains, new tabs/windows and process restart;
update matching live views. Use public/private suffix rules so separate hosted tenants remain separate;
local/IP hosts retain ports. Preserve other settings/unknown fields, atomically save and report failed
writes without accepting the new preference. Shell scale and visual pinch zoom remain independent.

### BF-2026-10-20-55 — Easier pinch and lighter green surfaces

A small fresh pinch out at minimum visual zoom opens overview. A gesture that starts or visits above
baseline is disarmed until a new gesture, even if it reaches baseline or pauses. Page scale does not
gate overview. Retain ordinary scroll/text/terminal input. Lighten the preview's dark green surfaces
and muted colors while preserving bright text/icon/highlight accents. Physical gesture feel remains
operator acceptance, separate from synthetic boundary tests.

### BF-2026-10-20-56 — Preserve overview URL casing

Remove the later parity stylesheet's `text-transform:capitalize` from overview URL captions. Display
the actual URL, including case-sensitive path text; never rewrite navigation data to repair styling.

### BF-2026-10-20-48 follow-up — Agent works while another project is selected

Selection hides a native view without destroying its WebContents or debugger target. Acceptance must
check actual hidden-page screenshot pixels, screenshot-coordinate input, direct/Playwright MCP tools,
reselection and unchanged selected project. Protect pages from background throttling/automatic
retirement between tool calls for the duration of the controlling agent turn; release at turn end
or explicit human pause. Explicit unload reports the active-turn guard. This closes an identified
lifetime gap; it does not establish the cause of the operator's original dropout or prove a real
provider workflow. No Codex internal implementation claim is inferred from similar observed behavior.

## October 20 — design-preview follow-up

### BF-2026-10-20-51 — Distinguish chat sources/resources with leading icons

The operator requests visible left-side icons because the small type labels are insufficient.
Use a shared icon taxonomy across chat source selection (Favorites and Other sources), refresh
selection and workspace source tables: document for instructions/files, sparkle for skills,
robot for agents and plug for MCPs. Preserve the text labels and selection/loading/approval
semantics; decorative icons do not replace accessible names. Distinct shapes remain readable
without color, and fixed icon widths leave source names/paths room to wrap. Preview acceptance
is recorded in desktop-preview.md; native mobile presentation remains separate.

### BF-2026-10-20-50 — Browser page scale in the … menu

The operator requests a − / current percent / + control in each browser tab's … menu.
Use the actual native website zoom factor, keep the menu open while adjusting, and let clicking
the percentage reset to 100%. Keep application chrome scale unchanged and retain the existing
page actions. A sandboxed owner-bound popup sits above the native website view, retaining its
captured tab identity if the toolbar is redrawn. Main/Team and exact-package acceptance are
recorded in desktop-preview.md; production rollout remains separate.

### BF-2026-10-20-46 — Enter creates a new project

Implemented in local and paired project dialogs with semantic forms and one pending submission.
Disposable preview UI acceptance creates exactly one project using Enter and closes the dialog.
The shared paired dialog uses the same submit boundary; an actual paired-computer creation is not
claimed by the local fixture. Preview packaging/live opening are recorded in desktop-preview.md.

### BF-2026-10-20-47 — Working browser robot pause/resume

The old robot deliberately became a status-only span when October 18 removed opt-ins. The operator
now requests a working switch. Retain default access in every available profile while providing
an explicit human-controlled per-logical-tab pause. The host persists private revision-checked
pause state separately from page contents, respects it across native recreation and closes its
owned automation connections on pause. All existing native views of that logical identity read
the same policy. Resuming reuses the page/session/profile/history; no agent resume tool is added.
Listing and typed tab organization remain distinct from page automation. Corrupt preferences fail
closed without overwriting the original. Direct tools and both MCP page backends share the gate.
Unit and disposable main/Team robot rejection/reconnection checks pass; ordinary default/named
profiles and actual extension fixtures still pass. Production deployment remains separate.

### BF-2026-10-20-48 — Agent loses browser control after switching to chat

**Status: operator report retained for normal-build investigation; no reproduced cause/fix.**
The operator reports switching browser → chat stops agent control and refocusing does not recover.
Synthetic preview checks retain the same native page through repeated browser/chat switches,
actual direct and Playwright MCP clicks/snapshots, draft preservation and disconnect/reconnection.
They pass, including separate default/named-profile and hidden/unloaded/extension cases. This does
not certify the operator's real provider/host/session sequence. Capture the real owner/tab IDs,
fresh available tool schema, exact error, loaded/visible/profile/debugger state and lifecycle around
the failing call. Preserve sessions/cookies/history/approvals; do not bypass profile/debugger guards,
force visible selection, replay an uncertain write or create replacement tabs as an assumed repair.

### BF-2026-10-20-49 — Refine the integrated title bar and underline

Implemented in the isolated preview: the single brand is a DIV drag region without Home action,
keyboard stop or vertical separator. The fixed 128-pixel brand slot after native controls does
not track sidebar width. Restore the previous sidebar-header chevron location/icon. Reduce the
header to 56 pixels with an 11-pixel upper gap above 44-pixel tabs. Account for the header's bottom
border so the upper 2-pixel selected underline is fully inside the scroll clip and matches the
secondary underline. Keep current dividers/top boundary/close controls and right-side secondary
overview/Add. UI geometry, resize independence, original chevron and Enter creation pass.

## October 20 — isolated preview implementation authorized

The operator requests the functional Proteus design preview incorporating BF-39–45 below.
Desktop preview source and isolated two-window acceptance now implement BF-39–41: one shared
Team registry with idempotent local creation, named/closed/previous window recovery and the
selected title bar. All 821 runtime tests and static checks pass. Latest BF-41 refinement moves
the existing overview mark to the right of the universal secondary row beside New tab, removes
address-bar/top-row overview and adds upper drag space with a centered single brand. iPad source
implements BF-42–45 gesture/heading/44-point-row/Team layout and mixed-type projection fixes;
simulator and physical validation are distinct. Historical intake statuses below are superseded
for preview implementation, not production rollout. See [current status](window-management.md).

## October 20 — multiwindow correction, recovery and title-bar design intake

### BF-2026-10-20-39 — Shared content across windows; fix Team Tools duplicates and wrong selection

**Status: isolated preview implemented; Team identity/URL/Close and early Enter pass exact-package two-window acceptance. HC acceptance remains pending.**
The operator reports duplicated Team Tools tabs and clicks selecting a different tab in a secondary
Mac window. The clarified contract is one canonical content-tab set per owning Team Tools,
workspace/project or chat container, shared across all windows. Open/close/order/title and the
same tab's URL/history synchronize; each window independently selects a tab. Top-level navigation
tabs, their order and standalone browsers remain window-specific. Closing a top-level container
representation must not close its shared contents. Correct a selected-tab closure with a valid
fallback in each affected window without changing other valid selections.

Secondary Team scopes currently use `window:<windowId>` in renderer/session seeding and shell
inventory, contrary to this contract; workspace/project scopes already use container IDs. Separate
Team local tab IDs/native browser IDs and alias-retaining reconciliation also need investigation.
The exact duplicate/wrong-selection event sequence is not reproduced or diagnosed by source review.
Use stable owner/container/logical-tab identity, revisions and existing receipts, retaining
independent native views and one service/runner. Do not deduplicate live data by matching URLs.
See [window management](window-management.md) for ownership and required acceptance.

### BF-2026-10-20-40 — Engine Room window manager and named closed/previous sessions

**Status: implemented in isolated preview; named capture, closed-window restore, current-owner reconciliation, geometry and reading positions pass exact-package acceptance.**
Automatically save individually closed windows and expose Engine Room → Windows for open windows,
recently closed windows and named retained sessions. Restore top-level tabs/order, active
workspace/project/feature and child selection, geometry/display mode and supported reading state.
Allow session naming and later restoration, including prior application sessions after relaunch.
This explicitly supersedes BF-2026-10-19-11's close-forgets rule; preserve its app-Quit restoration.

Restore presentation against current shared owners rather than rolling content back to a stale
snapshot. Do not resurrect closed shared tabs, deleted containers or stale grants. Focus an
already-open session on repeated restore. Keep private versioned/revision-checked atomic state,
unknown fields, bounded automatic history, explicit retention/removal and named-session persistence.
Window Close remains distinct from chat archive/delete/cancel and terminal resource lifetime.
`desktop/windows.cjs` and `desktop/main.cjs` currently explicitly forget closed-window records;
the operator's lost window has not been recovered. See [window management](window-management.md).

### BF-2026-10-20-41 — Integrate navigation and the Proteus brand into the title bar

**Status: selected Unified strip implemented and exact-package layout accepted in the isolated Proteus demo; production rollout remains pending.**
The operator selects **Unified strip** and retains its darker continuous background, but requests
the existing top-level tab treatment: rectangular tabs with visible close ×, selected underline,
dividers and ordinary selection/close behavior rather than pills. Keep the single Proteus brand,
native controls, reserved drag area and overflow. The earlier Session band alternative is not the
selected direction. A synthetic window-manager naming/restore sample remains accessible. Revise
the chat draft with this styling before the Proteus demo. No header runtime change, production
build or install in this phase.

Latest selected refinement: add a thin top border to the top-level tabs in the same color/weight
as their dividers, retaining the current × and underline. Preserve the existing overlapping rounded
rectangles tab-overview button form; it remains an overview action, not a window-manager substitute.
Keep tab overview and New tab at the far right of their respective main/content strips. The sidebar
meets the title bar directly and continues beside the second row; second-level tabs begin to the
right of the sidebar rather than spanning above it and leaving an empty rail segment. Keep one
brand, the darker background and usable drag space. These are revisions to the chat preview only.
See [design and acceptance](window-management.md#title-bar-alternatives).

## October 20 — iOS regressions reported after the last release

The operator reports multiple regressions in the latest installed iOS release. The following are
new reports, not negated by the earlier simulator/build/installation receipts. A subsequent supplied
iPad landscape screenshot set, IMG_0124–0128, provides visible evidence; Home in IMG_0127 identifies
version **0.2.26 (2610.20.1)**. Exact triggers and causes remain unestablished. Add these to the
next-release repair/acceptance scope; no iOS runtime change or device update occurs here. Keep
original screenshots and their private chat/account/workspace content outside this repository;
record only the relevant generic UI observations below.

### BF-2026-10-20-42 — Restore iPad pinch-to-overview from chat tabs

**Status: source repair and iPad simulator gesture/card-selection acceptance pass; physical-device verification pending.** Pinching out to the tab overview
does not work when an iPad chat tab is selected. Restore the existing zoom-out overview gesture
for chat surfaces, including applicable workspace/project chats and their navigation scopes.
Preserve ordinary content zoom/scroll, keyboard/composer behavior and scope/selection identity.
Acceptance must start from a chat tab rather than infer success from browser tabs: open overview,
verify the correct chat/scope and selected card, select a card, dismiss/return, and repeat after
tab switches/rotation. Compare browser and other supported surfaces and record simulator versus
actual-device results separately. See [browser](browser.md).

Screenshot follow-up: the supplied static images do not demonstrate the pinch gesture or its
failure. Retain this as the operator's report requiring interactive reproduction; do not claim
gesture acceptance from the layout screenshots.

### BF-2026-10-20-43 — Prevent iOS page labels collapsing to a letter and ellipsis

**Status: intrinsic-width heading repair and full-label iPad simulator acceptance pass; physical/phone layout acceptance remains separate.** Page labels truncate abnormally
to examples such as `h...`, `c...` and `p...`. Restore readable page labels and sensible use of
available width; do not conflate a page label with its independent sidebar button or let tab strips,
toolbars or adjacent controls squeeze it unnecessarily. Verify iPad and iPhone layouts where the
labels appear, portrait/landscape, sidebar shown/hidden and compact layouts/text sizing. Keep
accessibility names and full-label disclosure where genuine constrained-width truncation is needed.
Screenshot evidence now establishes **Schedules → `S...`** (IMG_0126), **Home → `H...`**
(IMG_0127) and a workspace/project **Chats page → `C...`** (IMG_0128). These are main page headings,
with a wide landscape content pane and sidebar visible, rather than merely long tab titles
ellipsizing in an overflowing strip. The earlier `p...` example remains report-only. Include these
wide layouts as regression cases before testing narrow widths. See [workspaces](workspaces.md).

### BF-2026-10-20-44 — Restore usable iOS Team Tools information, lists and link editor

**Status: Team account/empty-state/editor/projection repairs and populated-list/roster/link-edit iPad simulator acceptance pass. Actual account/data availability on the operator’s device remains unverified.** The operator reports Team Tools
layout is broken: team information/lists are missing or inaccessible and the link box is squished.
First distinguish unavailable/hidden UI from missing owner data, loading or selected-account/list
state; no data deletion is established. Restore access to existing team information and list
selection/management plus a usable link field/editor with appropriate width/height, scrolling and
keyboard behavior. Preserve existing accounts, selected list, roster/settings, link order, generated
Standup, drafts and revision protection; do not reset/recreate lists to repair presentation.
Verify populated and empty-list states, long links, keyboard shown/hidden, rotation and phone/tablet
layouts. Confirm owner-returned data and UI agree, and persistence survives navigation/relaunch.
See [workspaces](workspaces.md).

Screenshot evidence: IMG_0124 shows Team Tools with the Create team list action but no populated
list information, a vertically clipped account/control region, and the visible error **“Reorder
must contain each visible browser tab exactly once.”** IMG_0125 shows Standup with an unpopulated
Team list row, no visible selected-list name/order, a date without a visible timezone value, and
List settings displaying **0 people**. These observations establish broken/empty presentation;
they do not establish that the owner lists/roster were deleted, the account is signed out or the
operator intentionally selected an empty list. The screenshot's clipped region is not enough to
identify the previously reported squished link field conclusively; inspect both account controls
and the link editor during reproduction.

Source trace only: the exact error text appears in `src/remote.js` in `tabs.mutate` reorder
projection for a client without document access. That path validates the current non-document
descriptor set against the supplied order. Inspect actual scope/revision/IDs and mixed-type or
hidden-tab projection before changing the validator. No request payload, device permission or
causal link between this error and the empty list UI has been established. Preserve existing
grants and data; do not enable document access, bypass validation or recreate lists as a workaround.

### BF-2026-10-20-45 — Match iPad secondary tab-row height to the app tab row

**Status: common 44-point rows implemented; iPad Team-row bounds measured in simulator UI acceptance. Physical-device acceptance pending.** The operator notes that the second navigation layer looks taller than the top app
navigation. In IMG_0124/0125, the Team Tools/Standup strip is visibly taller than the app-tab row
above it. Treat this separately from page-heading truncation and Team data/control layout.

Source review finds the Team feature strip in `ios/Proteus/TeamToolsView.swift` sets section/browser
labels and Add to 46 points, whereas top app tabs in `ios/Proteus/NativeShell.swift` size from their
content plus padding. Workspace/project and chat strips also mix padding, fixed and minimum-height
controls in `ContextViews.swift` and `ChatViews.swift`. This establishes different sizing rules;
the exact on-device point delta and behavior across every scope have not been measured here.

Use a consistent compact visible row height and vertical alignment across iPad main and second-layer
navigation, retaining close/Add controls, dividers, underline and accessible hit targets. Avoid
unnecessary secondary padding; do not simply enlarge the main strip to conceal the mismatch.
Measure complete row bounds, including separators and control-driven intrinsic height, for Team,
workspace/project, chat/browser/document children and empty/populated states. Check landscape and
portrait, sidebar states, text sizing, selected/unselected tabs and keyboard changes; distinguish
simulator measurements from physical iPad acceptance. No native runtime change or build in this intake.

## October 20 — mobile spacing, gestures, performance and sidebar follow-up

The operator adds BF-2026-10-20-32–38 to the authorized release: one continuous workspace page/content
strip with dividers; plain page labels and an independent sidebar icon; compact phone browser footer;
reliable navigation recovery; address-bar tab swipes in visible order; phone browser performance;
and the same sidebar background on desktop, iPad and iPhone. Source uses iPad's `#121512` rail color.
Phone hide/show follows deliberate scrolling down/up, while double tap and the explicit More action
remain available. Address swipes operate only on the displayed, unedited phone address, following
the current container's visible tab order without wrapping or touching saved page history.

Thumbnail resizing/JPEG encoding/writes/retention move to a utility serial queue. Pending captures
coalesce; inactive scopes and active drag/deceleration/zoom do not request screenshots. Native 136
unit cases, phone label/swipe/footer/scroll UI and iPad spacing pass. Three simulator scrolling
samples collect duration, CPU and memory (about 74 MB peak); no pre-change baseline or physical
frame-hitch result is claimed. Final signed desktop package/native early-input and actual Codex
successful-update/forced-rollback continuation pass. Personal is installed and twice launched;
all three providers and the restored browser are verified. Paid phone/tablet 2610.20.1 are installed
and launched with 81/86 protected files exact. Two full device recovery generations remain.
HC and Linux follow-ups are installed and independently accepted; the native Mac confirmation
remains explicitly deferred. Exact evidence and limitations are in the ledger.

## October 19 — combined release implementation and acceptance

The operator lifted the intake hold and authorized the combined release. BF-04–31 source work is
implemented, except BF-15 Widevine, explicitly shelved. Historical queue-only statuses below record
intake; the [release ledger](2026-10-19-next-release.md) distinguishes actual fixture/live-provider
acceptance from pending signed-helper, website authentication and device installation acceptance.
The latest checks include 817 runtime cases, real durable reading-position/bulk-action UI, iPad
status/cache/rotation/reactivation and a real Codex image-only desktop observation through MCP.
Actual signed helper update and forced compatible rollback both automatically resume the original
real Codex session once, preserving full history and operation receipts. Personal's first 0.2.26
installation preserves current data; live typing exposed hidden native-browser keyboard focus.
The corrected foreground-only focus handoff passes a real native-focus regression and the scoped
conflict/DevTools/context-menu UI checks. Both desktop installations, physical phone/tablet and website are accepted at the previous signed
checkpoint. HC then exposed typing before asynchronous tab creation completes: native keyboard
handoff plus temporary window-local text editing preserves the complete URL and Enter through
that delay. The final signed package and early-input checks now pass, as do successful-update and
forced-rollback original-chat continuation. Per-target installed status remains in the ledger.
Approved desktop OAuth provisioning is verified with the separate callback and unchanged
mobile client. Linux follow-up installation is accepted; native Mac visible launch remains
operator-deferred. See the ledger.

## October 19 — Linux implementation checkpoint validation

Checkpoint `c41ffa5` passes all 811 Node tests/static checks and exact Linux package UI/PTY/restart
acceptance as `linux.2b491477dc2d`. Actual packaged updater smoke, lowercase executable lookup,
desktop-file MIME metadata, initial/second-instance URLs and strict callback rejection pass without
installation or handler registration. Child-selection and browser-home UI pass. Correct the
stability fixture to restore a complete authoritative saved session and distinguish canonical
IDs from native views; retain every assertion. Multiwindow strict geometry/IPC/reading/close checks
pass in isolated X11/Openbox, while native Wayland global positioning is unavailable and host
KWin/XWayland shows placement/frame deltas. Official staged Cua 0.36.0 captures the exact private
Electron window, but refuses background input to that unfocused renderer; foreground fallback is
not enabled and the counter remains unchanged. A disposable native GTK counter does pass one
background accessibility click, independent count/fresh-observation verification and actual image
adapter transport. This does not certify keyboard, native Wayland or arbitrary apps. See
[exact receipts and limits](linux-app.md).
No new release is installed; frozen-candidate, production relay/device and live-provider acceptance
remain separate gates. Validation-only changes do not alter the tested runtime/package bytes.

## October 19 — Linux release preparation follow-up

Isolated checkpoint `0a5a2f6` passes 783 runtime tests and static checks, and produces a Linux
package. Actual packaged UI startup exposes eager Life-session loading during browser-profile
discovery: missing credentials still trigger a protected-storage probe and terminate startup
without a Linux keyring. A separate validation branch repairs only the missing-file path and
adds regressions for signed-out profile discovery and preserved protected sessions. Preliminary
package/UI revalidation passes all 785 Node cases, static checks and exact-package startup,
synthetic chat, native PTY keyboard input and restart. Correct the package harness's obsolete
terminal-menu selector and use portable screenshot paths/readiness in focused UI checks. Two
broader tab/history fixture-contract failures remain explicitly unverified. No release installation
or live workflow claim follows from this source fix. See [Linux acceptance](linux-app.md) for exact
artifact identities and remaining checks. Coordinator implementation and frozen-candidate acceptance
remain separate.

## October 19 — Next-release intake — queue only

### BF-2026-10-19-04 — Put Inspect Element last in the browser link menu

**Status: queued for the next release; do not implement or build until the operator authorizes it.**
This chat collects the next release's future updates and fixes. The operator reports that
Inspect Element appears at the top of the browser's right-click link menu and requests it at
the bottom. The current native menu in `desktop/browser-actions.cjs` adds Inspect Element before
the link actions, confirming the source ordering.

When implementation is authorized, place Inspect Element as the final actionable item in the
link context menu, below the existing link actions with an appropriate separator. Retain the
clicked tab/element target, existing inspection behavior and other link-action ordering.
Pending acceptance: exercise the desktop right-click menu on ordinary and selected-text links,
confirm Inspect Element is last and still inspects the clicked element. No runtime changes,
build or UI verification were performed for this intake.

### BF-2026-10-19-05 — Avoid false browser load failures after page-initiated navigation

**Status: investigated and reproduced with unchanged source in disposable Electron; fix queued
for the next release. No implementation, build or installation authorized by this intake.**
The operator reports this on **Work Mac**: an agent opens Slack, a “Could not load” notification
contains `ERR_ABORTED (-3)`, yet the destination is visible and usable. The screenshot includes
the site's `force_cold_boot=1` query. Do not store its workplace URL, identifiers or screenshot
in this repository. HC's exact navigation event sequence and installed artifact were not inspected
in this investigation; its specific trigger remains inferred from the matching reproduction.

Source finding: `desktop/browser.cjs` filters code -3 in `did-fail-load`, but `navigate()` catches
the rejected `loadURLWithTimeout()` promise and calls `reportLoadError()` without classifying
the abort. The history-restore catch also reports errors without that classification.
`desktop/navigation.cjs` forwards Electron's rejection. A page-initiated replacement does not
advance the broker's `tab.navigation` token, so the old load can still set `tab.error` and emit
the whole-page failure notification. Successful destination completion does not clear that
late error in this path. Electron 44.5.1's load promise explicitly rejects with code -3 when a
second main-frame document navigation starts before the first load completes; see
[versioned Electron implementation](https://github.com/electron/electron/blob/v44.5.1/lib/browser/api/web-contents.ts#L298-L395).

Rehearsal evidence: a localhost boot page with a delayed resource replaces its location before
load completion. The final page loads, its button accepts a click, but Proteus retains
`ERR_ABORTED (-3)` and sends “Could not load”. Ordinary HTTP redirect and same-document URL
replacement controls both reach the interactive destination without errors or notifications.
These checks used Electron 44.5.1, a temporary app home/profile, synthetic content and the mock
Keychain switch; no installed app, HC session, real Slack account or live profile was changed.

Future fix: consistently classify cancelled/superseded navigation across event, promise and
history-restore reporting. Track the actual replacement navigation so stale rejection cannot
mark its destination failed. Keep agent results and tab diagnostics faithful to actual pending,
successful, stopped and failed states; an abort alone is neither whole-page failure nor proof of
successful loading. Preserve bounded waits and genuine DNS/connection/TLS/timeout reporting.
Pending acceptance: page-initiated document replacement during an outstanding load, redirect
chains, same-document routing, explicit Stop, competing/newer navigation, history restore and
replacement failure. Verify no stale toast/error after successful replacement, real failures
still surface once for their attempt, and agents can use the final page without premature success.
Verify the HC Slack case separately when a release is authorized; do not reload its live tab as
part of queue-only intake.

### BF-2026-10-19-06 — Keep workspace and project folders open across sidebar features

**Status: queued for the next release; no implementation or build until authorized.**
The operator requests that using another sidebar feature must not collapse workspace/project
folders. Example: after visiting Engine Room, an already exposed project browser tab should
remain visible in the sidebar and be selectable directly without reopening its parent folders.

Keep expansion state independent of the selected feature/page. Retain each workspace/project's
current expanded or collapsed choice through feature navigation, rerendering and background
updates; keep owner-scoped identities and existing manual expand/collapse and Collapse all
controls. Feature selection/highlighting may change without hiding an expanded resource tree.
Returning through the visible browser entry must select the same tab with its existing page,
history and state, without recreating or reloading it solely for navigation.

**Workspace/project-name click follow-up:** clicking a workspace in the sidebar must both navigate to
its workspace pages and expand that workspace's branch. Set it expanded rather than toggling:
clicking an already-expanded workspace must not collapse it. Preserve the existing workspace-page
destination/selection behavior. Retain nested project expansion and paging state, and do not
collapse other workspaces/projects. This explicit workspace-name action complements the rule
above: visiting Engine Room or another feature still leaves all workspace/project state intact.
Keep the separate chevron's manual expand/collapse and Collapse all controls. Use the correct
owner-scoped workspace identity for local and Other Computers branches.

The operator explicitly extends this to **project names**: clicking a project opens its page
and ensures that project's branch is expanded. An already-expanded project stays expanded.
Do not collapse any other project or workspace, reset sibling/nested expansion or paging, or
turn name selection into an accordion. Expand only the explicitly selected branch; preserve the
existing project-page destination and manual chevron behavior. The earlier workspace-only scope
is superseded by this follow-up. All changes remain queued under the explicit build hold.

Source orientation: the workspace-name handler in `public/desktop-preview.js` currently calls
`openWorkspace(...,'projects')`; the chevron separately updates the expansion set. This follow-up
queues combining navigation with explicit expansion for workspace and project name actions, not replacing the
independent manual expansion control or introducing an accordion that closes siblings.

Pending acceptance: expand multiple workspaces/projects, expose a project browser tab, visit
Engine Room and other sidebar features, then return to that browser with one direct click.
Verify the folders and child entries remain exposed across background refreshes, deliberately
collapsed folders remain collapsed unless explicitly opened by workspace/project-name selection, and
manual folder controls still work. Click a collapsed workspace name: its pages open and branch
expands, with remembered project states exposed. Repeat the name click without collapse; switch
to another feature and back without resetting this or sibling branches. Repeat for a collapsed
project: its page opens and its branch expands without collapsing any other workspace/project;
repeated project-name clicks leave it open. Cover local/remote
owners, rerenders, paging and restored expansion state. This is requirements
intake only; the reported collapse behavior has not been reproduced or fixed in this task.

### BF-2026-10-19-07 — Prevent tab rendering before initial application state is ready

**Status: exact error and call stack reproduced in disposable Electron; fix queued for the next
release. No runtime implementation, build or installation in this investigation.**
The operator reports “Cannot read properties of null (reading 'desktopPreview')” on program
load and sometimes refresh. This is an application-shell initialization error; the property
name alone does not indicate that the isolated preview is enabled.

Confirmed source path: `public/app.js` initializes `state.data` to null and starts both the
initial `refresh()` and `refreshBrowserProfiles()` without ordering their completion. If
`/api/browser-profiles` returns before `/api/state?summaries=1`, `refreshBrowserProfiles()`
calls `renderTabs()`. Its `state.data.desktopPreview?.enabled` access guards the preview
property but not the null `state.data` parent. That exception is caught and displayed as the
reported notification. A renderer reload repeats this bootstrap and exposes the same race.

Rehearsal evidence: unchanged application source, Electron 44.5.1, a disposable app home/profile,
synthetic settings and mock Keychain. Delay the initial state response by two seconds: the exact
TypeError stack is `renderTabs()` → `refreshBrowserProfiles()`, and Home becomes usable after
state arrives. Reverse response ordering by delaying profiles: no matching exception, Home
still ready. A first investigation run captured the failure but its routing teardown failed;
the corrected test-only teardown then completed both cases cleanly. No live installation or
operator browser profile was accessed. This proves the shell-startup race, not that refreshing
an embedded website alone always resets application state; that reported refresh path still
needs live trigger confirmation.

Future fix: make tab/chrome rendering safe before state readiness and coordinate early profile
results with the initial state render. Preserve fetched profile choices and early browser updates
instead of dropping them or presenting fabricated ready state. Audit other callbacks that can
reach tab rendering during bootstrap. Keep production versus isolated-preview identity correct.
Pending acceptance: both response orders, slow/failed state requests and retry, repeated shell
reloads, saved workspace/project/browser restoration and early browser-state/profile events.
Verify no null-state toast, complete profile menus after readiness and retained tab selection,
drafts, histories and browser identities. Build/install remain held for this next-release queue.

### BF-2026-10-19-08 — Show visible tabs across current-workspace projects in the requested order

**Status: requirements clarified; grouping/visibility defects reproduced with synthetic source
fixtures. Fix queued for the next release; no runtime implementation, build or installation.**
The operator's screenshot shows two General sections and an 11-tab count. The current project's
expected entries are **one open chat and three browser tabs, four cards in that project**.
The operator explicitly reaffirmed the broader scope: **include all projects in the current
workspace, current project first, then the other projects alphabetically by name**. Each project
shows its unhidden tab entries in its own navigation order. The earlier interpretation limiting
the entire overview to the current strip was incorrect and is superseded by this clarification.
The total card count includes eligible entries from all these project sections; four is not a
global cap. Hidden tabs and fixed Projects/Chats/Tabs/Configuration navigation buttons do not
become cards. The reported 23-browser inventory is a separate total. Keep actual chat titles,
page URLs and the supplied screenshot outside the repository.

Use a distinct, correctly named section for each current-workspace project. Inactive projects,
collapsed sidebar folders and offscreen tab strips still contribute their unhidden entries;
inactivity is not Hide. Retain explicit hidden/closed distinctions and isolate other workspaces
and owners. A nonhidden browser may be unloaded and still appear in navigation: retain its
truthful unloaded card without fetching it. Hidden resources remain discoverable through Tabs
management. Do not move resources or rewrite project/chat membership to repair presentation.

Source findings in `public/tab-overview-model.js`: expanding a project-scoped request to the
current workspace's projects is intended. However, the comparator puts the current project
first without alphabetizing the others: a synthetic stored Zulu/General/Alpha catalog returns
General/Zulu/Alpha when General is current. Legacy direct workspace descendants use the selected
project's `scoped.id` and label for an extra section; a synthetic fixture produces General twice
with the same group ID. The filter checks each item's own hidden/closed flags, not ancestors;
a child under a hidden/navigation-closed legacy root can still be included. Reconcile that case
with the owner's actual navigation rules rather than equating inactive project containers with
hidden tabs. These source fixtures do not establish the exact state of every item in the live
23-browser inventory. This expands BF-03's caption follow-up into grouping/order/count acceptance.

Future implementation: share each project's scoped visibility and item-order rules with its
actual navigation, aggregate only the current workspace's projects and apply current-first then
alphabetical section ordering. Resolve legacy direct children against their real identities and
placement without inventing a duplicate project section. Never count one logical entry twice.
Selecting returns to the existing tab; chat close remains navigation closure, with history,
active work, drafts, permissions and browser state preserved.
Pending acceptance: amid 23 registered browsers, the reported current project shows one chat
plus three visible browsers; other current-workspace projects contribute only their own unhidden
tabs. Verify current project first and remaining project names alphabetically, including after
switch/rename; total equals all rendered eligible cards. Cover inactive projects, collapsed
sidebar folders, loaded hidden and visible unloaded tabs, legacy roots, duplicate names, nested
chat tabs, remote owners, reordering, close and restart. Verify no other workspace leaks, correct
selection/highlight and no implicit loads. See BF-09 for previews.

### BF-2026-10-19-09 — Cache browser and chat thumbnails ahead of tab overview

**Status: capture-selection defect reproduced with a synthetic broker fixture; next-release fix
queued. No runtime implementation, build, installation or live screenshot capture.**
The operator requests recognizable thumbnails for browser **and chat** cards, captured ahead
of opening overview. Save an updated image soon after a tab is interacted with and periodically
while its page/chat is being viewed. Retain the last good thumbnail after a browser unloads so
it remains useful later. Overview should immediately display cached images rather than wait
for a batch of real-time captures. Icons remain the fallback when no usable image is available.
BF-08 still governs membership: all current-workspace projects, current first then others by name,
with hidden tabs excluded. Having a cached image does not make a hidden tab eligible for overview.

Confirmed source issue: `desktop/browser-actions.cjs` takes the first 30 entries from the global
browser list **before** checking whether they are loaded or relevant. Hidden/unloaded/unrelated
saved descriptors can consume that limit. A synthetic fixture with 35 sleeping descriptors then
three loaded relevant browsers makes zero captures; putting those same loaded browsers first
makes all three captures. The renderer already supports native thumbnail images, so missing
cards are not an intentional icon-only design. This demonstrates a concrete failure path, not
proof that it is the sole cause of missing images in the operator's live session.

Current source captures browser pages inside the overview action and keeps results only in the
open overview's preview array. The card renderer accepts images only for browser items; chat
cards always use the type icon. Browser/chat thumbnail caching is not currently implemented by
these paths. The previous capture-on-open plan and unloaded-icon-only interpretation are
superseded by this follow-up.

Future implementation: use a bounded, owner-local persistent thumbnail cache under configured
application data, outside the checkout. Key it by stable tab/content identity plus the correct
host/profile/source identity so unload/recreation/restart can reuse the same last-viewed image.
Store compact thumbnails and capture metadata; bound resolution, entries/bytes and writes,
evict eligible old images and clean up closed/deleted identities. A move retains its image and
authorization origin without capturing content through a newly inferred authority.

Debounce a refresh shortly after meaningful interaction, navigation or scrolling once the view
settles; periodically refresh while the browser/chat is actually being viewed. Refresh viewed
chat content after messages/streaming updates at a throttled cadence, not per token. Coalesce
events and skip unchanged frames where practical. Retain the last good image through empty or
failed captures, and reject in-flight results from replaced documents, closed tabs or changed
owners/sources. A best-effort refresh near switch/unload must not block navigation or unload.
Do not wake, load, unhide, select or fetch a sleeping/background tab merely to refresh a thumbnail.

Capture the browser's real native surface and the chat's actual rendered conversation viewport,
with tab UI/overview overlays excluded. Preserve focus, scroll, selection, drafts, approvals,
browser history and active turns. Cache availability does not grant page/chat read access or
cross-owner transfer. Use cached images immediately in overview, including for unloaded browsers
and inactive chats; keep loaded/unloaded and last-viewed/stale status truthful. A missing cache
uses the existing type icon immediately. Any later refresh is asynchronous and must not delay
opening overview; apply scope/eligibility before capture budgets rather than the global first 30.

Pending acceptance: capture browser and chat images shortly after interaction and during continued
viewing; verify throttling under scrolling/streaming and no scrolling/input lag. Unload a browser,
switch away from a chat and restart the shell/app: overview reuses the appropriate saved image
without activating/fetching content or waiting for real-time screenshots. Cover more than 30
saved tabs, multiple projects/profiles/owners, failed/empty/stale captures, never-viewed tabs,
close/move/recreation/eviction and changing source identity. Confirm real pixels reach both browser
and chat cards, icons remain the fallback, hidden tabs stay excluded, and drafts/approvals/history/
focus remain unchanged. No live thumbnail capture, cache implementation or performance acceptance
has occurred in this queue; verify the installed release separately when authorized.

### BF-2026-10-19-10 — Use overlapping rounded rectangles for desktop/web tab overview

**Status: queued from the operator's delegated desktop/web request; existing build hold remains.
No runtime implementation, build, deployment or installation in this intake.**
Use the reviewed reference's tab-overview icon consistently on desktop and web: two overlapping
rounded rectangles, rear rectangle offset up/left and front rectangle down/right, with a simple
thin outline. Replace the overview grid glyph with a shared vector treatment following each
client's existing control size and theme color. This is the overview action's icon, not a request
to replace unrelated grid icons or redesign navigation. Keep the reference attachment outside
the repository; record the shape rather than a machine-specific image path.

Cover existing desktop overview entry points (main tab bar, scoped browser/project/chat controls
and Team Tools where present) and the web shell's overview button. Source orientation confirms
desktop overview buttons currently use the grid character and `web/resources/js/shell.js` uses
`navIcon('grid')`. Preserve action ownership/scope, tooltips, accessible names, keyboard access,
hit targets and all overview behavior. BF-08's project grouping/visibility/order and BF-09's cached
browser/chat thumbnails remain their separate queued requirements.

The other chat owns the iPhone/iPad icon implementation and native preview verification in the
shared checkout. This desktop/web intake must not change native iOS files or imply desktop build
authorization from that preview work. Pending acceptance after implementation is authorized:
visually inspect every existing desktop/web overview control at normal/narrow sizes, confirm the
same overlapping-outline shape without clipping, and verify unchanged overview actions. No UI
acceptance has been performed for this queued icon change.

### BF-2026-10-19-11 — Multiple desktop windows with quit restoration and window/tab shortcuts

**October 20 supersession:** the multiwindow baseline is implemented in 0.2.26. BF-2026-10-20-39/40
now clarifies shared content versus independent window navigation and replaces the individual
Close-discard rule below with recoverable named window sessions. The earlier acceptance does not
verify these new requirements; see [window management](window-management.md).

**Status: queued for the next release; no runtime implementation, build or installation.**
Allow multiple ordinary Proteus desktop windows. **Command+N opens a new window;
Command+T opens a new tab in the focused window**, using BF-12's new-tab page and the initiating
navigation scope. Dispatch each shortcut once whether focus is in the app shell, embedded page
or another supported view; do not create a new host process or start duplicate runners.

The operator distinguishes window Close from application Quit. Explicitly closing one window
discards that window's saved placement/restore entry; it must not reappear after a later app
restart using its old position. Quitting the whole app instead preserves every window still
open at quit. On relaunch, reopen that set at the same positions/sizes, with each window's
selected item/navigation and reading/view position restored. Snapshot this set before shutdown;
quit-driven close events must not be mistaken for explicit individual-window closes. Keep
normal bounds/display identity and applicable maximized/fullscreen state; recover accessible
bounds if displays change. Fresh windows do not reuse a manually closed window's old placement.

Treat window closure as presentation closure, not deletion/archive/cancellation of chats or
their saved resources. Retain the existing background-host policy and typed resource lifetime
rules; do not interrupt model turns, erase drafts, end persistent terminals or replay startup
commands as a side effect of closing/reopening a window. Native/web window support beyond the
desktop application is not requested by this multiwindow item.

Use stable window identities and window-specific navigation/selection/geometry/view state,
persisted atomically under configured app data with revision protection and preserved unknown
fields. One renderer must not overwrite another window's restoration state. Keep one host-owned
service, scheduler, account/profile registry and resource-operation boundary per application-data
home, with the same no-concurrent-turn-in-a-session rule. Route IPC, dialogs, permission/notice
actions, browser/terminal/viewer surfaces, selection revisions, keyboard commands and shutdown
receipts to their real owning window. Do not duplicate logical sessions or broaden permissions
when presenting the same existing content in multiple windows. Preserve BF-06 sidebar expansion,
BF-08's workspace overview scope and BF-09's stable content-thumbnail identities.

Source baseline: `desktop/main.cjs` currently holds one primary window and browser broker,
creates it at fixed dimensions, binds trusted renderer checks to that one webContents and hides
it on Close. `desktop/workspace-session.cjs` stores the existing session; renderer view positions
in `public/view-position.js` are an in-memory map. Existing selected-tab restoration is not proof
of persistent multiwindow geometry or complete reading-position restoration across app restart.

Pending acceptance: create two or more windows with distinct positions, workspaces, selected
chat/browser/document items and scroll positions; quit/relaunch and verify all still-open windows
and their states. Explicitly close one before quit and verify it stays absent, including its old
geometry; exercise closing the last window and reopening the background app. Test changed monitor
layouts, reload, save conflicts/failures and repeated quit/relaunch without duplicate windows.
Verify Command+N/T with shell/page/composer/terminal focus, correct active-window ownership,
no cross-window overwrite, retained browser history/profile/tab identity, drafts/approvals/retry
receipts, no terminal startup replay and one runner. Run full runtime/static and real desktop UI
checks when authorized; source inspection alone does not implement or verify this behavior.

### BF-2026-10-19-12 — Direct new-tab page with action blocks and combined address/history entry

**Status: queued for the next release on desktop and iPhone/iPad; no implementation, mock-up,
build, native preview change, deployment or installation in this intake.**
Pressing **+ opens the existing new-browser-tab view directly**, replacing the add-tab submenu/
pop-up as the entry point. Put all currently available new-tab options across the top of that
page as compact, attractive icon-and-label blocks. Retain each scope/client's actual options,
profiles and supported actions: discover from its existing menu/action source, including chat,
Internet Search, browser profiles, document/Markdown, terminal and agent-output choices wherever
already supported. Do not invent unsupported mobile tools. Keep existing creation dialogs and
approvals behind their corresponding blocks. Preserve main/workspace/project/chat/Team placement
and the initiating window; choosing a type must not leave accidental duplicate blank tabs.

For an ordinary browser tab, the user can click a history/shared-link entry, type a URL in the
toolbar, or use the page's address/search controls. Keep existing search fields/engine choices,
shared links and retained-history actions. **Focus the page's Website address field immediately
on creation**, so typing works without first clicking. Stop automatically focusing the top URL
bar for a blank new tab; later explicit URL-bar focus remains available. Async history/profile
responses and rerenders must not steal focus or discard typed input.

Combine **Website address** and **Filter saved history** into one page input. Keep
`https://example.com` as its placeholder, not a prefilled value or an automatic navigation.
Typing filters the retained-history list as the user types, using the current owner/profile's
history with existing paging and stale-response protection. Clicking a result opens that exact
saved URL. Pressing Enter at any time opens the typed address through the existing URL/search
resolver; it must not silently choose the first history match. Replace **Open website** with
the current URL bar's angled-arrow submit icon at the right side of this same input. The arrow
and Enter have the same action and an accessible name; no second history-filter box remains.
Typing alone must not navigate or fetch a website. Preserve ordinary browser validation, safe
URL handling and explicit engine search behavior.

Apply the same new-tab-page interaction to **iPhone and iPad**, replacing their relevant + menus
with page-level option blocks and the combined field, adapted to each idiom's layout/keyboard.
Keep existing phone/iPad tab layers, navigation/chrome choices, source-owner/profile identity and
capability limits. Coordinate future native implementation with its owning preview chat; this
queued request does not authorize changes to the currently running native preview work. Apply
the shared presentation to corresponding web new-tab controls where they already exist, without
claiming native window management or unsupported resources in a web client.

Source baseline: `public/browser-home.js` currently renders separate address and history-filter
inputs plus an Open website button. `public/app.js` focuses the top URL field for blank browsers.
`public/add-tab-menu.js` defines desktop scope-dependent options; main/scoped/Team and native
entry points use menus. Reuse these actual action inventories rather than hardcoding a reduced
set. BF-11 owns Command+T/window routing; BF-10 owns the overview icon, not the new-tab + action.

Pending acceptance: + and Command+T open the new page directly in the correct window/scope;
each existing option remains reachable through its block and preserves type-specific permissions
and resource lifetime. Test immediate URL typing, live history filtering with zero/partial/many
matches, Enter with a matching result present, explicit result selection, arrow submission,
search engines, slow/failing history and focus/input retention through polling/rerenders. Verify
no menu flash, unwanted URL-bar autofocus, duplicate filter/input/tab or speculative navigation.
Exercise desktop/web normal/narrow layouts and native iPhone/iPad software keyboard, safe-area,
touch/VoiceOver and existing browser/chat navigation. Keep simulated, installed and physical
acceptance distinct; all implementation and validation remain pending under the build hold.

### BF-2026-10-19-13 — Explain and recover the account prerequisite for additional browser profiles

**Status: source diagnosis and synthetic saved-account reproduction complete; next-release fix
queued. No live account access, sign-in, settings change, runtime implementation or build.**
The operator reports Engine Room → Browser Preferences → Enable additional profiles and sync
settings is disabled without an obvious account-enablement route. `public/browser-preferences.js`
disables it when `/api/browser-profiles` reports `authenticated:false`. Its note refers to App Setup
without a link, although the current workspace/projects UI names that section **App settings**.
The account settings/security website button is not the app-connection flow.

**Operator clarification:** Life and Team Tools already work and the operator is already signed
in. Do not treat this report as missing authentication or require signing in again. The lazy
saved-session failure reproduced below is a separate possible defect, not a complete diagnosis
of this connected-account case. Both BrowserProfiles and AppAccount use the same LifeStore in
`src/server.js`; a fresh same-owner in-memory identity should make `authenticated:true`.
Inspect the actual current API result and panel lifecycle before deciding the disabled reason.
`renderEngineRoom()` skips rendering an already-mounted section without force, and the preferences
checkbox is built from a fetched state snapshot; stale UI after account changes is a candidate,
not yet a live-reproduced cause. Preserve the working account, tokens, website sessions and grants.

General path for genuinely missing/saved-unloaded sign-in, not an instruction to reauthorize this
operator's working account: **Engine Room → App settings (App Setup in older layouts) → Proteus account**.
If unsigned, select **Sign in securely** and finish the system-browser verification/callback.
If a sign-in is saved, select **Refresh connection** instead; Life need not be enabled. Return
to Browser Preferences, select **Refresh profiles**, then enable the checkbox. If profile access
subsequently reports missing shared-feature authorization, use **Authorize shared features** in
that same account card and approve the real requested consent. Do not force sign-out or change
accounts merely because a local account identity has not yet been loaded. Names/settings sync
through the connected Proteus app account; existing website logins remain profile/device-local.

Confirmed additional defect: `src/server.js` automatically refreshes the saved account only when
Life is enabled and configured. `BrowserProfiles.identity()` reads the current in-memory identity
without loading its protected saved session; `BrowserProfiles.refresh()` returns immediately if
that identity is absent. Therefore a saved account can appear unsigned after restart with Life
off. A synthetic LifeStore/BrowserProfiles fixture with a fake protected vault reproduces:
Life disabled + saved session present + profiles authenticated false; Refresh profiles performs
zero vault loads and remains false; account Refresh connection loads the session and changes
profiles authenticated to true while Life stays disabled. The request was mocked; no real token,
website request or user profile was used. This confirms a failure path, not the operator's live
account status or authorization grants.

Future implementation: show the actual disabled reason inline and a direct **Connect Proteus
account** / **Open account setup** action to the correct in-app card. Offer the appropriate saved
connection refresh/reconnect path rather than implying every disabled state needs a new account.
Use current navigation labels, expose pending/error/offline/expired/protected-storage states
honestly, and refresh the checkbox/profile state on returning after successful connection.
Initialize/load shared-account identity independently of optional Life activation so a valid
saved session is not misreported as signed out. Keep protected credentials in the owner process;
do not enable Life, fetch personal records or silently expand authorization as a prerequisite.
Preserve account/profile partition isolation and opt-in profile sync; do not bypass genuine
server permissions, unavailable-account errors or the unchanged Default profile.

Pending acceptance: an already-working Life/Team account with the reported disabled control,
including fresh API versus mounted UI state and refresh after auth changes; never-signed-in setup
with direct navigation; saved valid sign-in and Life
off across restart; account refresh, revoked/expired/locked/offline states, cancelled sign-in,
missing shared scopes and account switches. Verify clear instructions/action/status in the
Browser Preferences card, correct App settings destination, no forced Life activation or sign-out,
successful return/refresh enabling the option, preserved Default/site sessions and real account
verification distinguished from merely loading local identity. UI/live acceptance remains pending.

### BF-2026-10-19-14 — Honor sign-in browser preference and return auth to the initiating app

**Status: operator requirements and source findings queued; actual wrong-app callback delivery
is reported but not independently reproduced. No implementation, sign-in, protocol-registration
change, build, server deployment or native preview change.**
The operator requests Start sign-in / Sign in securely to open in the browser selected in Proteus
Browser Preferences, including the **in-app browser** when selected. The operator also reports
that the authorization redirect appeared to target “Proteus iPad” rather than the initiating
desktop app. Preserve the already-working Life/Team session from BF-13; do not sign out, reset
credentials, interrupt active desktop work or change OS default protocol handlers to investigate.

Confirmed source: desktop passes `shell.openExternal` into the account flow and `LifeAPI.begin()`
always uses that callback, bypassing the ordinary in-app/system browser preference. Desktop and
iOS register the `proteus` scheme; both use `proteus://life-oauth/callback` and discovery from the
single native-client configuration. Website provisioning names that client **Proteus iPhone and
iPad**, which can itself explain an iPad-labelled consent screen. Shared labels and potential OS
handler ambiguity are separate from proving delivery to the wrong installed app. Investigate the
real bundle/handler receiving the callback and the initiating pending attempt before asserting
that the desktop was interrupted. Keep private callback URLs/codes out of repository receipts.

Future implementation: route this supported Proteus account sign-in through the current browser
preference and correct originating window/profile. An in-app flow needs host-controlled auth
navigation/callback handling; the existing ordinary browser URL boundary rejects custom schemes.
Keep PKCE/state, origin/discovery checks, cancellation/expiry and token handling in the owner
process. Do not expose auth pages/codes/tokens through agent tools, history, logs, synced links
or BF-09 thumbnail caches. Verify passkey/MFA behavior in the selected browser and make any actual
provider/platform requirement for another browser explicit instead of silently ignoring selection.

Give desktop and mobile explicit client identity and correct labels/redirect registration;
choose a desktop-specific callback or instance-bound return mechanism that reliably reaches the
initiating installation and its pending auth window (including BF-11 multiwindow). Use the owner
service as the callback boundary. Preserve the existing mobile pairing/deep-link routes and
installed sessions while introducing compatible discovery/allowlist migration; renaming the
shared consent label alone does not fix routing. A callback for another app/window/expired
attempt must not consume or replace this app's session. Return to the originating account screen
with clear completion/cancellation/failure state; callback arrival alone is not successful auth.

Pending acceptance: desktop and the installed iPhone/iPad app identities present together;
correct consent label and actual callback delivery in both directions; in-app and configured
system browsers; cold/warm app, multiple windows, overlapping/cancelled/expired attempts, wrong
state/issuer/client and restart. Verify passkey/MFA, no session replacement on failed routing,
no model-turn interruption, working shared features/profiles and no private auth data in caches
or diagnostics. Coordinate future native/server changes with their owners under the release hold.

### BF-2026-10-19-15 — Evaluate Widevine support in the desktop browser runtime

**Status: primary-source feasibility research recorded; integration remains queued and unverified.
No package/runtime/CDM installation, vendor registration, signing, build or live playback test.**
The operator asks how Widevine can be supported after finding no Chrome Web Store extension.
This is a native browser-engine/CDM capability, not an ordinary extension. The checkout uses
stock Electron 44.5.1 and has no Widevine component integration. A candidate is
[CastLabs Electron for Content Security](https://github.com/castlabs/electron-releases), which
provides a Widevine-capable Electron fork with component installation/update support. Treat it
as an engineering option to validate, not an already-compatible replacement or guaranteed support
for any streaming service. Refresh exact release/architecture availability before selecting it.

Candidate integration work: use an appropriate maintained runtime, initialize its CDM lifecycle,
surface real readiness/install failures and retain supported updates. Production playback may
require its VMP signing path; the vendor documents macOS VMP signing before normal code signing
([EVS guidance](https://github.com/castlabs/electron-releases/wiki/EVS)). Review applicable component/
runtime distribution terms and codec/service requirements rather than copying a CDM from another
browser or assuming an extension adds it. Do not accept vendor terms, create accounts or add
signing dependencies during queue-only research. Do not promise offline-license support.

Before adopting a fork, verify the exact target Mac architecture, Electron/private Playwright/MCP
bridge and debugger compatibility, native WebContentsView behavior, extensions/profiles, account
sign-in/callbacks, encrypted cookie continuation and performance. Preserve current app/vendor
signatures and stable identity; don't revoke shared Apple certificates. A runtime change needs
the complete execution/static/UI/signed-artifact/restoration acceptance gates and the existing
private rollout/recovery policy, not a build-only claim. Check DRM thumbnail/capture availability
honestly under BF-09; protected content may not yield a usable page image.

Future acceptance: authorized public DRM test content first, CDM readiness/update/error/offline
states and actual license acquisition/decode/playback, then specifically requested services and
their supported quality/codec requirements. CDM detection or a successful test stream is not proof
that every site accepts this browser or its production VMP signature. Record supported/unsupported
cases distinctly. The normal supported external-browser route remains available in the meantime;
this item is feasibility work, not a commitment to ship unverified DRM support in the next release.

### BF-2026-10-19-16 — Drag workspace cards to reorder the collection and sidebar

**Status: queued for the next release; no runtime implementation, UI rehearsal or build.**
The operator requests drag-and-drop ordering on the **Workspaces** collection screen: click and
move a workspace's card/box to change its position. The saved order must be reflected in the
sidebar as well as the card grid. Keep the supplied screenshot and actual workspace names/paths
outside this repository.

Provide a clear drag/insertion state and commit manual order on drop. Respect responsive grid
reading order, including moves across rows. Distinguish a drag from a normal click so moving a
card does not accidentally open its workspace/configuration; existing buttons and title actions
still work. Provide an equivalent keyboard reorder path. Cancelled/no-op drops retain order.

Persist one manual workspace order per owning computer through the existing owner service,
using stable workspace IDs, latest revisions and atomic writes with unknown-field preservation.
Both the collection and sidebar consume that same order; do not independently sort one by name
or recent activity or let background refresh reset it. Restore order after reload/restart and
keep observing clients/windows consistent through the existing supported owner-state boundary.
The displayed This computer list is the initial drag scope: reorder only workspaces belonging
to the same owner. Do not drag a workspace to another computer or reorder the Other Computers
host grouping as a side effect. Preserve unavailable/offline owner behavior honestly.

Reordering is presentation order only. Retain selected workspace/project/item, BF-06's expansion
and paging state, working folders, defaults, project/chat membership, stable resource identities,
drafts, approvals, histories and active turns. It does not rename/move project files, recreate
resources or change which workspace is default. Workspace order is separate from project order
and BF-08's current-first/alphabetical project sections in overview; those requirements remain.

Source orientation: `renderPreviewCollection()` in `public/desktop-preview.js` maps the current
context workspace array into cards without workspace-card reorder controls. Its existing project
reorder is a separate operation and does not establish workspace reorder support. Determine the
authoritative workspace-order contract before future implementation; do not edit live app-data
files to simulate the requested order.

Pending acceptance: drag first/middle/last cards before/after one another and across grid rows;
the collection/sidebar update to identical order immediately and preserve it after refresh and
app restart. Cover keyboard moves, normal clicks/actions, cancelled drag, one/empty lists,
creation/deletion, stale revisions/save failure, background updates and separate owner groups.
Verify selection/expansion/paging/defaults and live browser/chat/terminal identity are unchanged.
Desktop UI and any corresponding shared web view need actual acceptance when authorized; no
native preview changes or implementation are authorized by this queue-only request.

### BF-2026-10-19-17 — Group tab-move destinations by workspace with project choices

**Status: queued for the next release; no runtime implementation, UI rehearsal or build.**
The operator requests a hierarchy in the **Send tab / Move tab** destination picker instead of
separate flat Workspaces and Projects groups. Use each workspace's name as a nonselectable
header, with its projects as selectable options beneath it. This makes repeated project names
such as General unambiguous. Include the workspace's existing default project as a real option,
clearly identified where useful; a standalone selectable workspace destination is unnecessary
in this project-based flow. Keep the screenshot and real workspace/project/chat names private.

Discover actual eligible workspace/project destinations through the owner boundary, including
valid projects whose navigation view has not been opened yet. Do not infer destinations solely
from open tab labels. Group by stable owner/workspace identity and submit the exact project ID;
duplicate names must never choose the wrong workspace or collapse into one option. Headers follow
the saved workspace order (BF-16), with projects in their established navigation order. BF-08's
alphabetical overview grouping is separate. Preserve Application tabs, Team Tools and Chats as
their own supported destination choices rather than nesting unrelated actions under a workspace.
Apply the hierarchy consistently to shared move/send/copy pickers using these same destinations.

Selecting a project moves the existing tab to that project in the named workspace using the
existing revision-checked operation. Preserve tab/profile/history, effective configuration,
drafts, permissions, retry receipts and terminal/viewer lifetime/authorization. A destination
view may be revealed without recreating the resource, starting terminal commands or broadening
access. Copy retains its existing independent/unloaded browser behavior and supported-type limits.
This is picker/target-selection scope: do not migrate legacy direct-workspace resources, alter
default projects, change chat membership implicitly or add unsupported cross-computer moves.

Source orientation: `public/tab-placement.js` currently returns separate Workspaces, Projects
and Chats sections from open view tabs; `transferTabDialog()` in `public/app.js` renders each
as an optgroup whose project options contain only the tab label. Use real workspace/project
associations and default-project metadata for the future grouped model, with fresh destination
revision checks before acting. Do not edit live app-data files to manufacture destinations.

Pending acceptance: multiple workspaces each with a same-named default project, workspaces with
several projects and unopened destination views; correct workspace headers and exact selected
project/owner IDs. Cover long/duplicate names, saved ordering, current-target exclusion, removed/
renamed projects, stale revisions and failure/cancellation. Verify existing Application/Team/Chat
choices, keyboard navigation and move/copy semantics, stable resources and no implicit loads or
terminal replay. Actual desktop/shared-client UI acceptance remains pending under the build hold.

### BF-2026-10-19-18 — Tabs-page multi-select with Select, Hide, Move and Close toolbar actions

**Status: queued for the next release; no runtime implementation, UI rehearsal or build.**
Add multi-select to the **Tabs** page. Put **Select, Hide, Move and Close** controls on the right
side of its top action row, to the right of **Workspace configuration** where that button is
shown. Keep the existing workspace/project navigation and configuration action in place.

**Command-clicking a tab row initiates selection mode**, selects/toggles that row and exposes a
checkbox column. It must not activate/open the tab as an ordinary title click would. The Select
button is the equivalent explicit entry point for keyboard/touch users. Checkboxes and further
Command-clicks let the user choose multiple rows. Show the selected count and provide an obvious
way to finish/cancel selection without changing tabs; bulk actions are unavailable with zero
selection. Outside selection mode, keep normal row actions/navigation and hide the checkbox
column. Selection gestures must not accidentally initiate row drag/reorder or browser navigation.

Hide, Move and Close act on the explicitly selected tabs. Move opens one destination picker for
the selected set using BF-17's workspace headers/project options, with other supported targets
retained. Preserve relative order where the existing move operation supports ordered insertion.
Use stable owner/tab identities and fresh revisions, never row indices, titles or URL matching.
Selection survives harmless polling/rerender/reordering without transferring to another row;
closed/deleted entries are removed. Scope selection to its current owner/table/window and do
not carry it into a different workspace/project. Filtering must keep the actual selected set
and count unambiguous; it must not silently add rows or operate on unselected hidden results.

Retain typed action semantics and existing eligibility/review rules. Browser Hide also unloads
its page while retaining its descriptor; Move keeps the same resource/profile/history/session;
chat Close preserves conversation/history and does not Archive/Delete/Cancel a turn. Terminals,
documents/viewers and protected/active resources keep their existing lifetime and authorization
constraints. Never wake/load/activate a tab just to select or bulk-manage it. Resolve operations
through the existing host service with conflict/retry protections, preserving source/destination
ownership, drafts, approvals and effective settings. Do not promise atomic all-or-nothing when
the owner only supports per-item completion; show actual successes/blockers/failures, keep
unsuccessful items selected for correction/retry and avoid redoing completed operations.

Source orientation: `public/workspace-tabs.js` currently provides single-row Hide/Restore,
Move and Close actions without multi-selection. The project-page action row is built in
`public/desktop-preview.js` beside Workspace configuration. Reuse the real row/action inventory,
not a browser-only subset or direct app-data edits. This request does not introduce new tool
availability or authorize managing any real selected tabs during queue-only intake.

Pending acceptance: Command-click and Select entry, checkbox selection/deselection, zero/one/many
selected states, exit/cancel and keyboard/touch accessibility; no unexpected open/drag. Test mixed
tab types and hidden/unloaded rows, filtering/polling/order changes, scope/window changes and
stale/deleted items. Verify the requested toolbar location at normal/narrow widths, BF-17's
single bulk destination choice, partial failure/retry behavior, stable identities/history/drafts/
permissions and no terminal replay, chat cancellation or hidden-page fetch. Exercise the actual
desktop/shared Tabs UI when authorized; native preview work and builds remain separate and held.

### BF-2026-10-19-19 — Retain document reading position across tab switches, refresh and restart

**Status: queued for the next release; source inspection only, no implementation or build.**
The operator reports that switching away from a Markdown tab and returning still resets it to
the top. Keep each document tab's reading position independently, so returning resumes at the
same paragraph and offset. The operator explicitly extends this to document refresh, renderer/
web-page reload and whole-app restart, including when the document stays selected until exit.
This applies even when the file has not changed; coordinate with BF-2026-10-15-01/02's queued
automatic/manual source refresh behavior.

Source inspection: `public/app.js` records the outgoing view through `rememberView`, then
`renderMarkdown()` replaces the main content and mounts Markdown again. That local document
path never invokes `restoreView`; the existing callback is wired to remote conversation
rendering instead. The approved remote-document rendering path also replaces its content
without calling the helper. `public/view-position.js` keeps its positions in an in-memory Map,
which cannot survive renderer reload or app restart. These identify restoration/persistence
gaps; the operator's exact live sequence has not been reproduced in this intake.

Capture the outgoing position before replacing/removing the document view and restore it for
the same stable tab/document/owner identity once its content is mounted. Account for delayed
images and layout changes without overriding a newer user scroll or a different selected tab.
Unchanged documents must not jump on tab return or harmless polling/rerender. When an authorized
refresh changes the document, retain the nearest matching reading anchor/offset and clamp to a
valid position for shorter content. Preserve existing source/version approvals and error states;
position restoration must not broaden file access or present retained content as newly approved.
Cover the corresponding supported document views as well as local Markdown.

Persist bounded reading-position metadata through the existing owner session/state boundary,
outside this checkout, keyed to stable tab/document identity and the viewing window/client.
Update during reading with debouncing and flush on supported refresh/exit transitions; saving
only when switching tabs misses a document that remains selected before reload or quit. Retain
positions for inactive restored document tabs too. After authorized content restoration, resume
the saved anchor/offset once layout permits; stale callbacks must not overwrite a newer position
or another window's state. Persist position metadata rather than a second document-content cache.
This fix is required for the existing single-window app and web reload, independent of BF-11's
multiwindow feature; coordinate with its per-window restore/explicit-close rules when implemented.

Pending acceptance: scroll well into a long Markdown document, switch to a browser/chat/another
document, and return repeatedly to the same paragraph/offset. Verify two document tabs retain
different positions, rapid switching and stale asynchronous responses, delayed images, polling,
user scrolling during layout completion, unchanged/changed/shortened source refresh, and approved
remote document views. Refresh the document, reload the renderer/web page and quit/relaunch with
the document still selected, then verify the same reading position. Also verify inactive tabs'
positions survive restart and multiple windows do not overwrite one another. Actual UI and
persistence verification remains pending under the build hold.

### BF-2026-10-19-20 — Use the iOS-style circled ellipsis for desktop/web More menus

**Status: queued for the next release; reference reviewed, no implementation or build.**
Replace the three diagonal slashes used for the browser Page/More menu on desktop and the
corresponding web controls with the supplied iOS-style icon: a thin outlined circle containing
three evenly spaced horizontal dots. Use a vector/current-color mark that matches the existing
toolbar size, stroke weight and theme states. Apply consistently wherever that same More control
appears across supported browser scopes; retain accessible menu names, keyboard access and hit
targets. This changes the icon presentation, preserving existing menu actions and placement.

Source orientation: `public/browser-extensions-toolbar.js` creates the desktop Page menu button
with an SVG path drawing three diagonal slashes, shared through the browser toolbar. Inventory
corresponding web controls during implementation and use the same circled-ellipsis geometry;
do not claim a missing web action is now available. Native iOS already supplies the requested
reference style and remains owned by its existing preview work. BF-10's overlapping-rectangles
overview icon is a separate queued control.

Pending acceptance: desktop and web toolbar review at normal/narrow widths, light/dark themes
and supported browser scopes; compare with the supplied reference, confirm accessible focus and
menu activation, and verify all existing menu actions still target the selected tab/profile.
No runtime/icon source or native preview is changed by this intake.

### BF-2026-10-19-21 — Supervised self-update, independent verification and original-chat continuation

**Status: helper-and-handoff approach selected by the operator for the next release; queue only.
No implementation, helper/service installation, package change, build or live restart authorized.**
The operator asks how an agent running inside Proteus can change Proteus, update the running app,
test it and continue the original updating chat after the old process exits. Build explicit runtime
identity, a durable update handoff and an independent update supervisor. Do not rely on an active
model turn or tool process surviving its own host's termination. See the queued design in
[desktop updates](desktop-updates.md#queued-self-update-and-chat-continuation--bf-2026-10-19-21).

Current source: the Electron `before-quit` path closes the service, `Engine.close()` aborts turns,
and startup records interrupted work without silently replaying it. The scheduler worker is a
worker thread, not an independent recovery service. Saved provider sessions and retry receipts
are foundations for continuation, not an existing automatic self-updater.

Selected first increment: keep the existing single owner service and add a narrowly scoped signed
helper that executes outside the replaceable app bundle and survives its exit. It stages/verifies
one immutable artifact, waits for a durable host handoff and safe quiescence, confirms runner exit,
backs up under the existing two-generation policy, replaces/relaunches the exact app, and records
independent startup/health/preservation results. A later separately hosted runner could let UI-only
restarts leave turns running; full service updates would still need this checkpoint protocol.

The handoff records update/installation identity, source fingerprint and artifact hashes, originating
chat/provider session and effective context/permission references, completed work and remaining
checks, authorization, migration/recovery plan and a deduplicated continuation ID. Persist it before
shutdown outside the checkout. The initiating turn yields; a host-owned update barrier waits for
that turn to settle and prevents races with new messages, schedules and other active/awaiting work.
Do not force-cancel unrelated work or weaken approvals to install. Resume only the authorized
update continuation in the same chat/session after verified startup and lock acquisition; preserve
ordinary interruption behavior elsewhere and stop on ambiguous provider-delivery outcomes.

The operator explicitly requires **automatic continuation of the same chat after both successful
update restart and successful compatible rollback, without clicking Continue**. The supervisor/new
or restored host dispatches the recorded continuation when healthy and the provider is ready;
temporary provider unavailability retains a durable pending continuation with automatic recovery.
After rollback, pass failure/rollback receipts to that same chat so it can investigate and finish
the workflow; never automatically reinstall the failed candidate. Keep the handoff/claims outside
data that rollback restores. Validate the minimum rollback version or a narrow authenticated
compatibility adapter using its existing resume boundary; do not assume an older binary understands
new update jobs. Ambiguous delivery must be reconciled before retry, not resolved by duplicate
turns. Actual revoked access/sign-in or unrecoverable errors can require intervention; a normal
restart/rollback must not turn into a manual Continue step.

Expose proposed narrow identity/prepare/status/checkpoint/install/verify operations through the
shared host boundary, with revisions and target-bound authorization; these are design capabilities,
not currently callable tools. Add Engine Room Updates and a persistent in-chat update card showing
build identity, changes/test evidence, active-work blockers, update/restart/resume progress, recovery
and final independent installed/verified/chat-resumed states. Carry existing authorization forward;
when installation needs approval, make the exact tested artifact reviewable first.

Test before installation in an isolated app/data/profile/credential fixture, then use an external
verifier for exact installed build/signature, service/runner ownership, migrations, restored state and
bounded non-destructive UI checks. Never expose the trusted app renderer or unrestricted Electron
evaluation through ordinary website-agent tools. A health receipt must be possible without a model
connection. Retain a compatible recovery app and a bounded failed-start rollback strategy; never
restore stale data over later work or launch incompatible code against migrated receipts.

Pending acceptance: self-initiated same-chat end-to-end update and rollback, both automatically
resuming without Continue, including the supported older recovery build; crash/power-loss at each journal
phase; duplicate requests, lost acknowledgements, stale/revoked authorization and competing work;
bad signature/wrong installation, low space, migration/startup failure and rollback compatibility;
provider offline/unknown resume delivery without duplicate turns or repeated external actions;
multiwindow update closure versus explicit Close; restored approvals/drafts/identities/positions;
independent actual UI verification and two-generation retention. Compatibility with the selected
Electron updater and packaging/signing remains to be proven. The build hold remains in force.

### BF-2026-10-19-22 — Cua-primary desktop control with on-demand Peekaboo fallback

**Status: operator selected Cua Driver primary and Peekaboo backup for the next release; queue only.
No dependency installation, OS permission changes, live app control, implementation or build.**
The operator selects a shared Proteus desktop-control service with **Cua Driver as the primary
native backend** and **Peekaboo as a Mac-only fallback**, including for agent-directed application
build/test workflows. Include the Linux development branch in this integration's design and actual
platform validation, rather than making the broker or guidance Mac-only. Cua is the cross-platform
backend; enable Windows/Linux capabilities only where the selected package and actual owner provide
them. Peekaboo's separate community ports are not selected as Windows/Linux fallback packages.
This supersedes the earlier shortlist and pending-backend-choice wording. Exact versions, packaging,
platform capabilities, image/overlay delivery and live acceptance still require verification.

Primary references: [Cua Driver](https://github.com/trycua/cua/blob/main/libs/cua-driver/README.md),
[runtime/ownership](https://github.com/trycua/cua/blob/main/libs/cua-driver/rust/Skills/cua-driver/RUNTIME.md),
[Linux behavior](https://github.com/trycua/cua/blob/main/libs/cua-driver/rust/Skills/cua-driver/LINUX.md),
[Peekaboo](https://github.com/openclaw/Peekaboo) and
[Mac requirements](https://github.com/openclaw/Peekaboo/blob/main/docs/platform-support.md).
Use raw backend tools, with the current Proteus chat/provider as planner; do not launch an additional
autonomous agent or model session. Optional perception/model extensions are not part of the baseline.

Required runtime instructions and visible capability inventory give a short tool-purpose/default
order guide, based on actual registration/readiness rather than promises of queued tools:

1. Use repository build/regression commands and purpose-built APIs for the work they cover. For
   embedded website UI use the existing Playwright broker; developer diagnostics remain on demand.
2. For native desktop UI, inspect actual Cua capabilities and the intended app/window, then use Cua
   observations and supported semantic/visual input. Include authorized Proteus self-test.
3. On Mac, if Cua lacks a needed observation/action or returns a confirmed unsupported/ineffective
   route, load Peekaboo as needed for that gap. Permit complementary inspection, not just total
   backend failure. Explain the switch, acquire the same owner's control lease and freshly observe
   the same app/window through Peekaboo. Do not transfer element IDs or capture tokens between drivers.
4. Verify the postcondition and retain a consistent backend for subsequent supported operations;
   avoid cycling indefinitely between drivers. Missing permission, revocation, a denied action or
   broader foreground/desktop scope is not an excuse to bypass the boundary through another tool.

Failover must distinguish unsupported/no-effect from unknown/partial effects. A timed-out click,
submit, drag or keystroke may already have acted. Reobserve/reconcile the actual app state and
receipts before another mutation; never repeat a possibly completed action merely because the
other backend is available. Backend selection cannot widen the existing task/app/window grant.
One host-owned arbiter serializes native controllers across chats and drivers, with desktop-wide
exclusion for global input. Separate driver sessions/cursors do not isolate keyboard focus or app
state. Handoff releases held inputs, invalidates stale observations and preserves the target's live
process/window. Do not restart the user's app or create a replacement instance simply to fail over.

Use a compact stable desktop wrapper/catalog rather than registering two full duplicate MCP tool
sets in every chat. Advertise primary/fallback purpose, availability and selection order in the
required core index; fetch task-relevant backend schemas/details only when requested. Start/connect
the primary runtime on native use and Peekaboo only on fallback. Reuse compatible owner-managed
services; use reference-counted sessions and bounded idle cleanup for Proteus-owned processes,
images and catalog caches. Release control/session resources on turn end, Stop and revocation;
never terminate a separately user-owned daemon or a process still used by another chat. Avoid
always-on screenshot loops, duplicated planners, heavyweight perception/model downloads or one
full native daemon per chat. Show actual backend/process resources and idle/active status.

Source orientation: `public/proteus-orientation.js` and `src/app-capabilities.js` provide required
guidance and a captured inventory. `src/browser-tools.js` already exposes compact list/call wrappers
whose backend can start on use. Provider handling differs: Codex persists native dynamic schemas
and supplies fresh resumed catalogs through MCP; Copilot context/server removal uses cold reconnect.
Do not claim universal mid-turn tool unloading from a `defer` marker. Independently control schema
discovery, backend process lifetime and current permission. Once tool descriptions/results/images
enter a provider conversation, stopping the backend does not erase that history or recover those
context tokens. Keep outputs bounded and measure schema/context size, startup latency and idle/
active CPU/RSS. Use the stable wrapper to avoid forcing an active provider reconnect just to switch
native backends; preserve approvals and fail closed if the required provider route is unsupported.

General UI tools cannot guarantee every app/control. Peekaboo's
[visualizer](https://github.com/openclaw/Peekaboo/blob/main/docs/visualizer.md) supplies optional
foreground feedback but suppresses overlays for targeted background actions. Cua's session overlay
requires compatible host event-loop support. Record actual cursor visibility and foreground effects
per backend instead of promising identical feedback. On Linux, verify X11/XWayland/native Wayland
capture identity, AT-SPI, portal/input permissions and compositor-specific limitations separately.
Do not silently broaden window capture into full-desktop access or label cropped desktop pixels
as an attested window image. This queue does not authorize work in another chat/branch or a rollout.

First-increment capability: discover applications/windows; select a real owner/app/window; inspect
accessibility controls and capture that window as model-visible image content; click/double/right
click, type, keys/hotkeys, scroll and drag; observe and verify the actual resulting UI. Prefer fresh
semantic element actions and use screenshot coordinates when needed. Bind observations/actions to
host, process/bundle, window and capture generation; handle Retina scaling, display/window movement,
stale observations and disappearing targets. Serialize controllers and release held keys/buttons on
stop/error. Prefer targeted background actions when proven; surface foreground requirements and
pause on conflicting operator activity instead of redirecting input to an unrelated active window.

Engine Room Desktop Control should show Cua primary and Mac Peekaboo backup, actual installed
backend/version and readiness, permission
status, actionable setup instructions/links for its true signed host, a disposable Test control,
allowed app/window scopes, current controlling chat/target and Stop/revoke. OS privacy grants and
Proteus task authorization remain separate; do not assume a CLI inherits its launcher's grants or
silently grant broad desktop access through browser/profile/workspace write settings. Route internal
tools, external MCP and UI through the same owner policy rather than allowing raw backend bypass.
Expose actual capabilities at chat start and refresh after updates; unavailable controls explain why.

Verify screenshots reach each supported provider/model as images, not filenames/base64-in-text.
Respect effective chat permissions, task authorization, revocation and observation privacy; do not
persist private screens/typed text in source, shared feeds or ordinary diagnostic payloads. The
desktop broker can operate authorized visible app UI, including Proteus, without exposing Electron
main-process evaluation or the trusted preload. Its test/control helper can cooperate with BF-21's
independent update verifier, but update recovery must remain functional without desktop permission
or model availability. No extra agent loop or always-on full-desktop capture is requested.

Pending acceptance: pinned package/license/signing and actual macOS/Linux branch compatibility,
with Windows capability gates; primary-only and Mac fallback paths, partial observations, confirmed
unsupported actions versus unknown/partial effects and no duplicate external actions; lazy catalog/
process loading, idle cleanup, repeated switch/stop/resume, multiple-chat arbitration and measured
context/CPU/RSS/latency; supported macOS compatibility;
actual permission onboarding/missing/revoked/locked-session behavior; harmless native app fixtures
and isolated Proteus UI, semantic and visual fallback, screenshots delivered to real provider adapters,
keyboard/scroll/drag, multiple windows/displays/DPR, stale/closed targets, cancellation/operator
interference and scope rejection; exact signed installed-artifact UI verification coordinated with
BF-21. Treat upstream background-input claims as candidates until exercised locally. Backend order
is selected; exact package pins, integration, live workflow acceptance and build remain pending
under the operator's hold.

### BF-2026-10-19-23 — P1: preserve authoritative revisions for empty relocated navigation

**Status: queued P1 from the operator-supplied confirmed 0.2.25 failure report. Reproduction and
live read-only findings are attributed to that report; not independently rerun in this intake.
No runtime change, production-data repair, build, restart or installation authorized here.**
The report identifies installed build `ec8b213d382e+dirty.8dbb06075488`, source fingerprint
`8dbb06075488b32cc946255e2829e0c779d6f7ef0dfa20db4e64e255250c8250`. The signed app was unchanged,
live data was read only, and no active chat was stopped or app restarted during that investigation.
BF-23/24/25 share this evidence baseline. Source line numbers below refer to the reported installed
version and may differ in the current working tree. Earlier delivery to the intended release chat
was reported unconfirmed; this intake records the report and does not dispatch another chat message.
Keep private chat identities, machine data and detailed operational receipts outside this checkout.

Reported chain: `BrowserHistoryStore.relocateNavigation` increments the target stack's revision even
when empty (`src/browser-history-store.js:209`); `ContentTabs.getAsync` exposes history only when a
selected entry exists (`src/content-tabs.js:43–52`). An empty authoritative stack at revision 1 thus
becomes a descriptor with undefined history. `tabChanges` constructs the first pending navigation
using its revision-0/index default (`public/content-tab-sync.js:10–16`), and the owner correctly
rejects the stale base with `NAVIGATION_CONFLICT`.

The report reproduces this with the installed store, ContentTabs and synchronizer in a temporary
SQLite home using `example.test`: create a blank workspace browser tab, seed it, move to a project,
read its descriptor and submit the first pending navigation. Assert stored revision 1 versus
generated base revision 0 and the conflict. The observed owner outbox reportedly has the same
mismatch, with populated navigation retained in earlier scope copies. The read-only inventory
reported no duplicate native identities, duplicate logical browser views or orphan parents.

Queue explicit authoritative history metadata even for empty stacks, and derive first operations
from that revision. Audit move/migration source selection so an empty stale scope copy cannot
overwrite the actual navigation. Preserve pending operations, receipts, stable identity and complete
Back/Forward stacks; retain optimistic concurrency rather than bypassing its conflict checks.
Coordinate with BF-17/18 moves and all existing tab-management preservation rules.

Pending regression/acceptance: the exact empty-relocation reproduction; empty/nonempty source and
target stacks, first/subsequent pending operations, repeated moves, migration, reload/restart and
stale revisions. Verify full history, pending intent and receipt continuity. Packaging/live acceptance
is grouped with BF-24/25 below and remains held.

### BF-2026-10-19-24 — P1: empty-owner history conflict resolution must converge

**Status: queued P1; same operator-supplied installed-build report/evidence boundary as BF-23.
No implementation, live repair, build or restart in this intake.**
The native apply-history command returns early for an empty URL (`desktop/browser.cjs:628–632`),
leaving `navigationPending` set. `createTabSynchronizer.resolve` clears its outbox and adopts the
empty remote baseline; the next sync then regenerates a revision-0 operation and conflicts again.
The report reproduced this using the actual installed command method, synchronizer and temporary
store, asserting both the retained native pending flag and a second conflict. This explains how
**Keep saved history** can appear to resolve the panel without permanently resolving the conflict.

Define an explicit, non-destructive empty-history resolution contract: acknowledge the authoritative
revision, distinguish the native current/pending page from a saved empty stack, and preserve the
user's pending intent in a recoverable form. Resolve once and converge on later syncs/restarts.
Do not silently discard the user's page, delete pending operations/receipts, weaken revision checks
or rewrite production history simply to hide the error. Coordinate the descriptor/base fix in BF-23
with native acknowledgement and outbox lifecycle rather than applying only one side.

Pending regression/acceptance: reported empty-owner resolution followed by at least two syncs and
a restart; empty/nonempty cases, interrupted/lost-ack resolution, preserved pending page/intent,
both existing recovery choices and repeated retries without recurring conflicts or replayed effects.

### BF-2026-10-19-25 — P1: background navigation conflicts must not blank healthy browser scopes

**Status: queued P1; reported installed-method synthetic assertions, not a new live reproduction
or implemented fix in this intake. Uses BF-23's exact 0.2.25 build baseline.**
The report traces a document-body conflict panel/global `navigation-conflicts` overlay in
`public/app.js:846–852`. `BrowserTabs.setOverlay` hides every native browser
(`desktop/browser.cjs:424–429`), while `BrowserTabs.show` returns before retaining a new selection
and bounds when that overlay is open (`371–372`). Reported assertions: old page active; overlay
opens; select a new page; both pages remain hidden and old selection stays active; close overlay;
the old page returns while the newly selected page stays hidden.

Queue scoped/non-modal conflict presentation so a conflict in a background workspace/project/tab
does not block healthy scopes. Preserve the newest desired selection and bounds even when native
surfaces must temporarily be hidden; reconcile current owner/selection state before resurfacing.
Resolution and dismissal must not restore a stale page or steal focus from a newer tab/project.
Retain legitimate modal protections for embedded views without using them as a global conflict lock.

Pending regression/acceptance: the exact installed-method selection assertion, healthy scopes under
a background conflict, switching tabs/projects while conflict UI is visible, bounds/resize changes,
and resolution/dismissal races with newer selection. Verify the affected conflict remains actionable
without making other browsers blank or resetting their sessions/history.

Combined acceptance requested on Build Mac for BF-23/24/25, once the build hold is released:
add all three regressions; preserve pending operations/receipts and complete Back/Forward stacks
during moves/restarts; exercise healthy scopes under background conflict and real UI selection
races. Run required execution/persistence checks and desktop UI acceptance, build/sign/package
once, verify that exact signed artifact and prepare its update/source companion through
[desktop updates](desktop-updates.md). Do not interrupt active HC work or install an unapproved
finished artifact. The quoted acceptance request is recorded as future release work; it does not
lift this chat's explicit queue-only/build hold or authorize production history edits.

### BF-2026-10-19-26 — Investigate observed black rectangles behind UI text separately

**Status: queued observation only; cause, reproducibility and severity unconfirmed.**
The same operator-supplied report notes black rectangles behind text in a live screenshot. No
causal connection to BF-23/24/25's navigation defects has been established. If the symptom persists,
capture a separate reproducible UI/rendering case, identify affected surfaces and collect bounded
private visual/renderer evidence. Do not classify it as a proven history/conflict defect or treat
the navigation fixes as its acceptance. No screenshot/private screen contents are copied into
source, and no live investigation, implementation or build is started by this intake.

### BF-2026-10-19-27 — X login JavaScript failure with Ghostery protection enabled

**Status: live protection-on/off/on diagnosis confirms the filtering-dependent JavaScript
failure in installed 0.2.25; repair queued under the next-release build hold.**
The operator reports that X cannot complete its login flow. The inspected page shows a generic
failure, while detached DevTools records `Uncaught RangeError: Maximum call stack size exceeded`
with repeated `Object.apply (<anonymous>:1:8653)` frames. Read-only inspection of the existing
cached X cosmetic rules finds duplicate `preventXhr` scriptlets containing a function-to-string
proxy at that exact column. This strongly identifies injected scriptlet compatibility as the
suspect, rather than treating blocked telemetry requests alone as proof of the login cause.

The operator explicitly authorizes a temporary x.com-only protection pause and reload, with
restoration afterward and no credential submission or cookie clearing. Native UI verifies:
protection enabled has the recursion error; paused plus reload presents the login entry form
without that error; resumed plus reload produces the same recursion and anonymous-source column
again. Protection is restored. Login submission/account access is not tested, and unrelated X
API 404s and Google sign-in/FedCM errors remain separate observations. The form can still render
with the recursion present, so visible controls alone are insufficient acceptance.

Current capability: the Ghostery toolbar button beside the address opens **Pause protection for
this site** / **Resume protection for this site**. This is Proteus's built-in Ghostery integration,
separate from the Page menu's installed extensions. The exception is saved for the exact origin
within the current profile; reloading is needed to test fresh page JavaScript. The test restores
that exception state and does not disable filtering globally or change another profile.

When implementation is authorized, isolate the actual injection/proxy recursion using the exact
installed engine/list and real Chromium page behavior. Audit duplicate scriptlet/helper execution,
configuration order and reinjection before selecting the repair. A minimal Node VM fixture did
not exercise the live proxy path and is not a passing regression or evidence against the live
failure. Preserve network/cosmetic protection, deliberate per-site exceptions and profile boundaries;
do not silently turn protection off for X or globally to hide the bug. Add meaningful regressions
and desktop acceptance for enabled login startup and permitted interaction, repeated navigation/
reload, pause/resume and another site's protection. Full sign-in needs separate authorized user
interaction; do not claim account login verified from an entry form or a clean build. Keep form
values, account identifiers, raw request headers/tokens and screenshots out of source. No runtime
source change, filter update, package install, build, app restart or cookie reset in this intake.

### BF-2026-10-19-28 — Page-menu Developer tools silently does nothing

**Status: operator-confirmed and observed during live diagnosis; repair/acceptance queued.**
The Page menu's **Developer tools** action fails to open the inspector, while right-clicking an
element and choosing **Inspect Element** opens the correct X inspector in a separate window.
The detached window itself is expected: the current native command uses
`openDevTools({mode:'detach'})`. Do not classify that presentation as a separate external-browser
launch defect or confuse this with BF-04's requested context-menu action ordering.

Source candidate, not a proven root cause: `public/browser-extensions-toolbar.js` awaits the
native popup and then silently returns if its original toolbar control is no longer connected.
Periodic toolbar replacement can invalidate that control; Inspect Element instead calls the
native command directly. Also verify native popup close/result ordering and command result/error
delivery before assigning causality. Keep the selected live tab identity, permissions and debugger
handoff/coexistence rules from BF-2026-10-13-16; do not open shell or another tab's DevTools.

Pending acceptance: Page-menu and right-click inspection on each supported browser scope, choosing
the action while toolbar/state updates occur, correct target and fresh inspector contents after
reload, existing-inspector reuse, and visible failure feedback. No implementation or build yet.

### BF-2026-10-19-29 — New Chat hides Copilot and Claude in the production project interface

**Status: Work Mac screenshot reported; matching source defect reproduced from checkout and
installed Personal 0.2.25 code in an isolated synthetic fixture. Repair queued; no build.**
The operator reports Work Mac has Copilot and Claude, but Start a new chat offers only Codex and
Local rehearsal. The screenshot also shows account allowance for the missing providers. Allowance
alone is not current execution readiness; however, the picker has an unconditional UI filter
that explains the missing options without any provider authentication or catalog failure.

`public/app.js` initially adds all three provider options, then its `previewEnabled(state)` branch
removes every option except Codex/rehearsal, selects Codex and loads that catalog. The helper in
`public/desktop-preview.js` now recognizes the production `workspaceProjects` catalog as well as
`desktopPreview`; `WorkspaceProjects.get()` returns `enabled:true` for the ordinary project UI.
Consequently the old isolated-preview restriction also executes in production. Server adapter
restriction still uses the actual `desktopPreview` option, so this renderer branch confuses project
UI availability with isolated-preview execution policy. Do not diagnose missing credentials or
require provider reinstallation from this screenshot.

An in-memory fixture executes the unchanged selector/helper and pruning statement from both the
checkout and installed Personal app. With production projects enabled and all three synthetic
provider statuses available, the result is exactly Codex/rehearsal, with Codex selected and its
change handler invoked. A true isolated-preview fixture has the same result; the legacy UI control
retains Copilot/Codex/Claude/rehearsal. This confirms the source branch independently of live account
state. HC runtime/catalogs and exact loaded renderer have not been inspected during this intake;
no real provider/model turn, sign-in, settings change or app restart was performed. Keep the
screenshot's workplace prompt, URL, paths and chat titles out of source.

When implementation is authorized, keep production project UI separate from any deliberately
restricted isolated fixture. Offer the destination host's supported providers, including Copilot
and Claude when available, using real provider/catalog metadata with truthful loading/stale/error
states. Preserve intentional selection and effective defaults; do not force Codex merely because
projects are enabled or silently substitute a provider after refresh/failure. Keep model effort,
context and speed choices tied to refreshed metadata, and preserve draft prompt/title, attachments,
workspace/project/folders and authorization while selecting providers or changing destination.

Pending acceptance: production project-enabled New Chat with Copilot/Codex/Claude, genuinely
unavailable or slow provider catalogs, late refresh and provider changes, same-host and supported
remote-destination ownership, defaults and draft preservation, plus a separate actual-isolated-
preview control. Update tests that currently assert the preview's Codex default without checking
the production provider list. Verify HC's actual available-provider list and authorized new-chat
execution after a finished update; synthetic picker reproduction does not prove live provider
execution. No implementation, package change, build or installation in this intake.

## October 19 — Website data and desktop overview

### BF-2026-10-19-03 — Site controls, stored icons and workspace-scoped overview

**Status: 0.2.25 implemented and exact signed artifact verified: 756 runtime cases, nine focused cases, static checks, native storage/profile isolation, overview/previews/reorder/close, working-chat status, whole-gesture pinch, Find and 146-view restart pass.
The operator approved both installations. Personal and HC exact signed-artifact installation, second restart, live acceptance and current-data preservation pass. Two verified recovery generations remain per Mac.**
Use Electron cookies/clearData and Chromium storage protocols, not an extra extension or direct
browser-database edits. The page menu opens site-filtered Engine Room storage, current-connection
certificate details and default/desktop/mobile site requests. Origin/partition-scoped supplied icons
survive missing discovery. Hidden unloaded link creation preserves the source scope without fetching.
Overview names each project in the current workspace, puts the current project first, reveals the
selected card and supports same-owner order/closure; top-level overview mirrors its main strip.
Returning to 100% consumes that pinch: a separate baseline gesture enters overview. Preserve the
0.2.24 Find fix, native Refresh/POST versus address/GET behavior and the separate preview workflow.
See [feature and acceptance scope](2026-10-19-site-controls.md).

Next-release scope is refined by BF-2026-10-19-08/09 above: each current-workspace project's
unhidden tabs, current project first then others alphabetically, and corrected preview capture
selection. The following is the original 0.2.25 acceptance finding.
Live acceptance found a minor legacy-group caption issue: browser tabs directly under a workspace
can inherit the scoped project's section ID/name. Queue a next-release correction using the actual
workspace root's identity/caption, with unique group IDs and mixed legacy/project coverage. All
observed items remain in the correct workspace. Do not change or rebuild the frozen 0.2.25 artifact
for this installation task. Personal live Find, unloaded-link, filtered site-data selection/removal
and preservation checks pass; actual website data was not cleared.

## October 19 — iPhone and iPad native preview refinements

### BF-2026-10-19-02 — Shared feature headers, Home continuation and Team Tools parity

**Status: separate native simulator previews implemented, installed and verified. Six native UI cases, shuffle/zoom unit cases, 756 runtime tests and static checks pass. Production/physical rollout remains held.**
The operator explicitly extends design scope to both simulator idioms. Latest decisions: keep
phone main tabs under a labelled Open tabs drawer section and add Home Open tabs on both; iPad
retains its main strip without sidebar duplication. Keep the phone main-tab “+” beside feature
actions so main browser creation is discoverable. Unify feature headers with phone bottom search
and iPad inline right-side search; retain scoped workspace/project navigation and tab overview.
Use one-line, right-fading complete URL display and multiline focused editing; remove redundant
Recent sites Done and put sync status beside its heading. Match desktop tree colors/indentation.
Home Recents and Needs Attention show seven rows plus More. Team Tools retains service-owned
lists/links, renames Overview, uses desktop icons, adds link context/edit/reorder controls and
puts list settings and Dock Standup on the Standup page. Do not change the record source.
See [native preview detail](iphone-navigation-design.md) for rehearsal boundaries and validation.

Final authorized design pass: slightly brighter sidebar ink/icons; desktop Home, Schedules and
Team Tools marks; six-point project/item nesting; smaller green Open tabs X near the right edge
with a 44-point touch target. iPhone alone collapses the reply editor to one line without Send,
expanding with animation on touch and preserving drafts when reading collapses it. Keep Stop and
queued actions accessible; retain supported provider options/attachments on expansion. iPad's
composer controls stay visible. The latest correction starts both editors at one line, grows only
for explicit newlines and limits the whole composer card to half the app window with scrolling
text. Phone Return never sends; tablet Return sends and Shift+Return inserts a newline. Show the
attachment + with disabled choices/explanation for unsupported fixture uploads. Keep project
nesting at six points and put items another nine points in, halfway between the last two previews.
Final composer/sidebar native cases, two unit cases, all 756 runtime cases and static checks pass.
Captured-keyboard iPad GUI verifies Shift+Return and Return; the UI runner drops hardware Return
on this runtime. Deferred keyboard resignation fixes the reproduced iPad reading/dismissal hang.
Production build and physical installation remain held for final design review.

Latest authorized simulator follow-up: numbered Standup order and editable roster/settings;
links only on Team Tools; no phone dock/pop-out and no iPad pop-out. iPad's order-only dock has
an upper-right X; its open icon stays in the Standup page header. Move iPad Downloads/History
into circle More beside overview. Phone bottom order is Back, Forward, Refresh, Find, More,
Overview; History moves into More. Apply the supplied overlapping-tabs overview mark, restore
Team browser active underlines and match desktop sidebar icons/palette with 12-point nesting.
Source implemented and final focused native acceptance passes, including phone drawer and iPad
portrait dock bounds. Native project pushes explicitly retain their computer store; a sixth
case covers opening a project chat from a main browser and the selected sidebar state after the
reproduced missing-environment crash. Main tabs remain open when changing workspace selection. Desktop/web icon work is queued
separately in the operator-named release chat, preserving its build hold.


## October 19 — native browser Find stability

### BF-2026-10-19-01 — Stop unchanged passive Find from revealing the first match

**Status: 0.2.24 implemented; seven focused regressions, all 747 runtime tests, static checks, exact signed long-page Find and 146-view restoration/restart pass. Exact artifact/source privately transferred and both authorized desktop installations/live acceptance now pass; see the handoff and Find release ledger.**
The operator authorized a signed follow-up after reproducing repeated jumps in 0.2.23. The shell's
MutationObserver called native Find again for an unchanged query, clearing the selection and
revealing the first result. Unrelated background updates must be no-ops before incrementing the
request epoch. Preserve an in-flight explicit result, manual scroll and later-match selection.

Use stable tab identity plus an ephemeral top-level document revision to distinguish shell
updates from navigation/reload. Explicit input, Next/Previous, query clearing and close retain
correct target ownership. Query/target/document/close changes reject stale results. Renderer-text
mutation refresh remains non-scrolling. Unit coverage includes asynchronous requests; real
Electron acceptance must exercise a long page across several actual polling intervals, document
reload/navigation and tab switches. Run full runtime/static checks, sign once, test that exact
artifact, and provide matching source and immutable private hashes. Recheck unlock/idle on the
destination; do not interrupt new work, modify live data or infer installation from delivery.
Keep the independent preview workflow and two-generation recovery policy.

## October 18 — Source Library wording follow-up — implemented and UI verified

### BF-2026-10-18-04 — Explain shared source availability and workspace loading choices

**Status: 0.2.23 desktop/web UI and signed-package checks pass; web live acceptance passes. Desktop rollout is tracked in the handoff.**
The operator asked to incorporate this intake from “Queue source spacing fix”. A registered source
folder does not need to be attached to each workspace.
The current Workspace sources help and Source Library “Used by” label suggest an additional
folder access/assignment step even though registered sources are already offered across the
owning computer's workspaces.

- Replace the Workspace sources help with wording along these lines: “Folders registered in
  Engine Room → Source Library are available to every workspace on this computer. You do not
  need to add the folder here. Under Instructions, skills, agents & MCPs below, choose how each
  discovered source loads for this workspace. Use the folder's Load in → Apply to all controls
  to change its current sources together.” Match the actual labels and available controls on
  each client.
- Explain that Choose per chat offers a source in the chat picker; Default for new chats loads
  it automatically when workspace defaults are included. Folder Apply to all is a one-time
  change to current sources, not an inherited rule for future discoveries.
- Replace “Used by” with “Configured in” and explain that it lists workspaces with saved source
  choices or existing configured folder references. An absent workspace can still select the
  registered sources. This summary is not an access list or evidence of actual prompt delivery,
  connected-tool execution or live usage; keep the wording faithful to the existing calculation.
- Keep a concise distinction between source loading and working-folder/file permissions or
  connected-tool approvals. Registration and loading choices do not grant those permissions.

Wording scope only; no new folder-assignment control or source/permission behavior is introduced.
Pending acceptance: review Source Library and Workspace Configuration copy together on desktop
and corresponding clients; verify an already registered folder is discoverable from another
workspace without attaching it, saved loading choices remain workspace-specific, and the summary
does not imply access restrictions or actual loading. Desktop/web copy is updated. The full
740-test suite, static checks and desktop/web normal/narrow UI pass. Exact signed-package gates
and authenticated production web Source Library inspection pass. See the handoff for destination
installation, restart and preservation status.

## October 18 — Source Library spacing follow-up — implemented and UI verified

### BF-2026-10-18-03 — Restore spacing between Source Library entries

**Status: 0.2.23 desktop/web UI and signed-package checks pass; web live acceptance passes. Desktop rollout is tracked in the handoff.**
The operator’s desktop screenshot shows adjacent registered-source cards touching vertically.
The registered-source list now uses an 18px grid gap on desktop and web, with wrapping controls.
Correct the inter-card spacing in Engine Room → Source Library to match the established Engine
Room card rhythm. Keep that gap distinct from padding inside each card; retain readable source
details and controls. The earlier 0.2.22 Engine Room spacing acceptance does not resolve this
newly reported Source Library issue.

Pending acceptance: visually exercise a populated Source Library at normal and narrow window
widths, including wrapped source details, and verify a consistent visible gap between every
adjacent card without clipping or excessive blank space. Check the corresponding web layout
if it shares the affected styling. Keep source registration, scanning and configuration unchanged.
Normal/narrow web UI checks pass: 18px gaps, 22px padding and no clipping at 1440px/390px.
Desktop UI passes at 1440px/850px with clean teardown. The earlier narrow-width fixture targeted
a hidden notice window; correcting its target resolved the check. Exact signed-package gates and
authenticated web inspection pass. Keep screenshots and private paths/titles outside the repository.

## October 18 — iPhone navigation and shared iOS motion — design preview

### BF-2026-10-18-02 — Reclaim phone space, separate browser controls and rehearse native-style motion

**Later operator selection: Button drawer; functional native iPhone simulator preview authorized.**
Apply the idea to the existing Proteus screens without the mock-up's Home redesign or a new Share
feature. Keep complete URLs at the top. Put Back, Forward, Find/search, History and one Tabs button
at the bottom, with the circle “…” menu for additional existing options. Double-tapping page content
toggles top controls; bottom browser controls remain available. This is a manual toggle, not automatic
scroll-driven hiding. The operator explicitly excludes iPad navigation changes from this pass.

Source is prepared behind a simulator-only phone preview gate, using the existing browser/store,
native navigation stacks, snapshots, chat controls and scope identities. A separate preview app
identifier and launcher keep installation separate. **October 19: signed iPhone simulator preview
installed and focused native acceptance passes.** Both UI cases cover drawer selection/order,
full URLs, bottom controls and Back/Forward/History, double-tap chrome, browser/chat pinch and
native chat edge-back. The page-zoom arbitration unit case, 740 runtime tests and static checks
pass. Acceptance fixed touch targets, masking accessibility IDs, thumbnail alignment and a legacy
SwiftUI drag that competed with UIKit Back. The launcher uses ad-hoc signing and supports Device
Hub. No simulator/service reset, erasure, account/certificate change or physical installation.
The accepted app and private fixture/receipts remain available for review. Physical/iPad acceptance
and actual agent-triggered Live Browser loading remain separate from these synthetic native tests.
See [phone design status](iphone-navigation-design.md). No physical installation or iPad navigation
change is authorized by this functional-preview work.

**Historical three-option exploration:**

**Status: requirements queued; local synthetic design preview authorized.** Production native
implementation, signing, build and installation remain separate. The operator requested a local
emulated-phone mock-up and chose to compare all three navigation ideas, including an upper-left
gesture area. No final app-navigation choice has been selected.

- Remove the persistent bottom app-section navigation buttons from iPhone. Reclaim that area
  for content and the chat composer, and put browser Back/Forward and other browser controls
  in a compact bottom browser toolbar, separate from the URL field. Browser Back remains.
- Remove redundant app-page Back buttons/“‹ Workspace” links. Left-edge swipe-back should
  interactively reveal the actual previous page beneath the current one, with smooth progress,
  commit and cancellation instead of an abrupt page replacement. Retain page contents, scroll
  positions, tab identity, drafts and pending work. Browser history and app-page history must
  resolve the correct destination rather than both handling one swipe.
- Improve tab-overview thumbnails for chats, browsers, documents and other supported views.
  Use recognizable current-content previews and clear titles/type/context; preserve viewport
  and scroll state. Do not load an unloaded page, disclose unauthorized content or invent a
  current screenshot to fill a thumbnail. Expose unavailable/stale previews honestly.
- Pinch out from content into the tab overview with a continuous Safari-like shrink-to-card
  animation, and expand the selected card back to content. Rehearse gesture progress and
  cancellation alongside page zoom, scrolling and keyboard/composer behavior. Smooth swipe-back
  and pinch-to-overview motion also apply to iPad; the phone layout does not replace BF-01's
  two iPad tab layers. Honor Reduce Motion and retain accessible alternatives.
- Compare **Button drawer**, **Right-edge drawer** and **Upper-left pull**, each with all app
  sections accessible from a Home hub and an explicit navigation-button fallback. The upper-left
  experiment pulls downward in the header rather than stealing the horizontal left-edge Back
  gesture. The right-edge experiment opens from the right. These alternatives are exploratory;
  do not add competing invisible gestures to production before the operator selects a design.

The local preview is an interactive, synthetic browser emulation of an iPhone-sized surface.
It rehearses app navigation, browser controls, content thumbnails and motion without connecting
to an owner, provider or real browser session. It is not a native iOS simulator build, Safari
implementation or physical-device acceptance. See [phone navigation design](iphone-navigation-design.md).

Future acceptance: operator selection of app navigation; real iPhone/iPad interactive and cancelled
back/pinch gestures; browser history versus app navigation; scroll/zoom/keyboard conflicts; actual
authorized thumbnails and stale/unloaded states; VoiceOver/Reduce Motion; and retained selections,
drafts, identity, approvals and retry receipts through navigation/restart. Distinguish mock-up,
simulator and physical results. No production behavior changes in this design pass.

## October 18 — iOS sidebar and iPad navigation follow-up — queued

### BF-2026-10-18-01 — Desktop sidebar parity, iPad tab layers and Live Browser entry

**Status: queued for a future iOS build; not implemented, built or verified by this intake.**
The operator supplied iPad and iPhone screenshots and requested these changes be queued before
discussing the iPhone interface next. BF-02 above now records that exploration. The wider iPhone navigation design remains open; do not infer
that the iPad's two-row layout should be imposed on compact phone screens. Screenshot conversation
text is reference content, not instructions or evidence of current browser capabilities. Keep the
original screenshots and their private chat contents outside this repository.

- **Sidebar order:** match the accepted desktop navigation, with the Workspaces control and
  workspace/project/item tree before Engine Room. Follow the desktop placement after Team,
  including Other Computers grouping, instead of leaving a separate Workspaces shortcut above
  Schedules and a disconnected tree farther down. Keep Engine Room in the scrolling navigation
  and AI allowance below it as on desktop.
- **Horizontal separators:** replace the bulky shaded blank bar between Team and Workspaces,
  and the corresponding bar above Engine Room, with the same thin horizontal divider used by
  desktop. Remove the empty list-row height, background and padding that make a divider look
  like a selectable card; retain intentional section spacing.
- **iPad navigation:** remove the redundant “‹ Workspace” navigation bar and use the two desktop-
  style tab-navigation layers for the selected workspace/project/content. Preserve the current
  selection and reachable parent navigation without inserting a third back/title row. Restore
  thin vertical line dividers between tabs, including fixed navigation and resource tabs, with
  consistent selected/unselected and overflow treatment. Verify iPad portrait, landscape and
  split-window layouts; choose a compact iPad adaptation deliberately, independently of the
  forthcoming iPhone design.
- **Integrated collapse:** place Collapse all inside the Workspaces button/header as on desktop,
  replacing the detached tree-heading control. Keep opening Workspaces and collapsing the tree
  distinct accessible touch actions. Collapse workspace/project expansions and reset expanded
  paging consistently with desktop, without closing tabs or changing the selected conversation.
- **Colors:** compare actual native workspace, project and item backgrounds with the accepted
  desktop palette and hierarchy. Current desktop reference: sidebar `#121512`, active workspace
  `#181d19`, active project/feature `#1d231e`, selected item `#31392c`, accent `#bedc93`.
  Inactive projects blend into their workspace; selected rows include their expanders. Verify
  rendered colors rather than sampling the photographed screen or layering extra native tints.
- **Live Browser:** remove the separate “Chat tools” row/menu. Offer Live Browser in the relevant
  tab-strip “+” menu and open/select it as a tab; retain an obvious route back to Conversation
  and existing document tabs. Allow an authorized agent to load that tab when needed through
  the same owner service boundary. Check actual native/owner capability first and implement any
  missing route as part of the future build; this queue does not establish that such a tool
  currently exists. Preserve the existing Live Browser channel's access requirements, chat/owner
  identity and retry handling. This entry-point change applies to iOS; final compact-phone
  placement will be reconciled with the next iPhone design discussion.

Future acceptance: compare desktop and iPad side by side; exercise Workspaces/open/collapse,
all tab layers and overflow, project/chat/browser/document switching, Live Browser from “+” and
an actual authorized agent request. Verify absent/revoked/offline capability states and returning
to the same conversation, draft, history and selection. Check sidebar colors/dividers and touch,
pointer and accessibility targets. Preserve stable tab IDs, browser sessions, per-chat settings,
approvals and pending retry receipts through navigation/restart. Record simulator and physical
device results separately; existing 0.2.21 acceptance does not verify these queued corrections.

## October 18 — paid mobile account migration accepted

The operator authorized moving the phone and iPad to the paid Apple account. Both now run
0.2.21 / 2610.18.2 under `org.proteusapp.review.proteus`, with the paid profile expiring October 16, 2027.
Credential/data verification, saved destinations and production restart pass independently.
The iPhone reconnected to Build Mac; iPad live HC connectivity and website sessions were
not separately exercised. Originals remain closed as Proteus Legacy recovery copies and each device retains two
verified full recovery generations. Future physical mobile builds use `ios/PaidAccount.xcconfig`.
See [migration runbook](native-paid-account.md) for the temporary helper and exact exclusions.
No native Mac, Electron desktop, web or shared certificate change was included.

## October 18 — mobile projects, computer grouping and HC responsiveness

The operator authorized native workspace/project parity, corrected web project alignment and
Other Computers grouping across the navigation. Source implementation, native phone/tablet UI
checks, Personal desktop installation/restart and web live acceptance pass. The latest signed
desktop candidate passes 737 runtime tests and the exact 146-view restoration/restart rehearsal.
HC's exact update is installed and passes preservation, second launch, navigation and bounded
performance acceptance. Native Mac and iPhone installation/launch pass with the renewed existing-team
profile; iPad's preserved-file installation subsequently passed developer trust and launch acceptance.
The separately authorized paid phone/tablet migration above supersedes that predecessor's Personal
Team signing. See the release runbook and native parity ledger for physical acceptance limits.
No new authorization is inferred from remote descriptors.

HC's reported post-upgrade hangs are under measured investigation. The first follow-up reduced
summary responses from 1.70 seconds to approximately 0.50 seconds; repeated saved-context preparation
still blocked the main loop. The latest build reuses captured run context and bounds repeated MCP
source/path reads within one synchronous display projection. Authorization, future-run context and
mutation checks remain fresh. Project/permission snapshots, batched sidebar writes and failed-tab
retry backoff also remain. Personal live summary median is 16.90 ms. HC's independent final median is
70.34 ms, with idle main-process CPU approximately 9% instead of 34% and no main-loop lag above 100 ms
in approximately 55 seconds of idle/navigation sampling. All 45 browser views were already unloaded.
Retain existing tab histories and retry receipts; uncertain tab-sync failures remain unresolved and
are not cleared/reissued by this performance correction.

## October 18 — production promotion accepted

The operator authorized building and migrating the reviewed BF-10–12 desktop design into the
existing installation, retaining the preview workflow, documenting Work Mac migration, extending
supported project/history synchronization and deploying web parity. Version **0.2.21** is the
accepted desktop release. Local migration and restart preserve every original view, chat, schedule,
draft and history record; all providers are available. HC has installed the same signed artifact
and passed preservation, restart, representative live UI and reciprocal Default-profile history
sync checks. Both installations retain two verified recovery generations. The closer desktop navigation and chat-layout web
release is deployed and passes regression, served-file checks, bounded log review and authenticated
production UI acceptance, including persisted sidebar width and expansion.
Native mobile and other queued intake items remain separate. This supersedes historical
preview-only holds below for the reviewed feature set.

See [release status and migration runbook](2026-10-18-projects-release.md).

## Next release bug and feature list — October 15, 2026

**Status: production rollout held; isolated desktop preview authorized.**
The operator subsequently authorized a real, separately named desktop preview of BF-10–12,
with synthetic data and existing Codex sign-in, for design iteration. See
[desktop preview](desktop-preview.md). This does not authorize replacing production, migrating
live data, or implementing the web/mobile versions. Other intake items remain queued.
Release version is unassigned. Earlier release acceptance and rollout records below remain
separate from this intake.

**October 18 preview revision — implemented and verified in the isolated desktop:** Source library registration now awaits
scanning and makes entries available to every workspace, with Rescan and complete/empty/partial/
error feedback. Configuration folder Load in → Apply to all changes all current group items once,
including filtered items; future entries do not inherit it. Per-item overrides, favorites, unknown
fields and revision checks remain. Engine Room scrolls below the tree with dividers, Collapse all
resets expansion/paging, and Open data folder moves to App settings. Inline chat permission modes,
independent read-only approval and working-folder access separate inheritance, reuse and grants.
Preview Codex Saved permissions supports workspace-write next turn only with explicit starting-
folder read/write access. Protected approvals remain, provider-marked read-only metadata is required,
and selected MCP servers retain turn-wide breadth. See desktop-preview.md for fixture checks and
separate pending package/live acceptance; production/web/mobile remain held.
Exact-package acceptance and real Codex permission tests passed for
`ec8b213d382e+dirty.bc584feea48b`: once, chat-only reuse and matching workspace reuse, including
native sandbox transitions and original-data/draft preservation. See desktop-preview.md for
receipts and limitations. Production, web and mobile remain held.

**October 17 project deletion:** Implemented in the isolated preview: delete a nondefault project
from Projects, reassign its chats and every resource type to that workspace’s current default,
and preserve sessions, drafts, history, approvals and activity. The default is protected by ID;
a different project can become default, allowing the former General to be deleted. A fixed
durable redirect preserves reassignment across restart, retries and subsequent default changes.
See desktop-preview.md for validation; production/web/mobile remain held.

**October 17 activity/lifecycle correction:** Implemented in the isolated preview: meaningful
activity timestamps replace focus-based recent ordering; manual project ordering belongs only on
Projects; workspace aggregate Tabs cannot reorder; workspace/project scope is strictly validated.
Closed workspace navigation must remain closed through passive sync. Closing chat views releases
renderer history after the final alias, without deleting history/drafts or cancelling execution.
Browser Hide unloads, Restore reveals unloaded, selection loads, and hidden Persist survives
restart unloaded. This supersedes earlier preview Hide/recency wording. Native work blockers and
revision checks remain. Verification status is tracked in desktop-preview.md; production remains held.

**October 17 preview revision:** Add a resizable sidebar with width stored in application settings
and reused after restart and for the collapsed popover. Restore actual overlay positioning with
no main-panel shift. Hide native browser panels temporarily through the existing overlay mechanism
while navigation covers them; proper browser compositing remains deferred. The operator selected
Project panels. The latest reference supersedes the chat-surface mapping: sidebar `#121512`,
active workspace `#181d19`, active project/feature `#1d231e`, selected item `#31392c`, accent
`#bedc93`. Use balanced, shallow margins and a rounded selected-row accent edge; keep icon designs
and favicons. Selected tab icons use that green accent and selected titles stay white. Inactive
projects blend into their workspace. Active feature recents share one project-style panel around the heading
and items, without an inner list box. Restore the divider below Workspaces. Counts stay plain except a filled nonzero attention badge.
No vertical hierarchy guide lines. Show `<1m` and whole minutes below an hour. Preview-only scope.
Increase sidebar feature, workspace and project labels to 14px, keeping individual chat/resource
item titles, counts and computer metadata unchanged.

**October 16 historical preview revision (activity and fixed Engine Room details superseded above):** Add normal tab separators. Workspaces collection now opens
directly to cards, removing its duplicate Chats page; specific workspaces/projects retain scoped
Chats. The operator selected Workspace panel grouping with two-line item names and right expanders.
All workspace groups stay beneath a separator after Workspaces, initially collapsed. Navigation
retains expansion; closing/reopening a project or leaving the feature resets to seven recent
items. More adds four. Project recents combine unique chats and all resource tab types, with
icons/favicons, relative access ages and full counts. Workspace headers show computer name and
project count. Active Schedules, Chats, Internet Searches and Needs attention use matching groups,
without header expanders. Features and workspace groups share one scrolling region above fixed AI allowance and
Engine Room controls. Workspaces highlights only while viewing that feature or its workspace tree.
Feature tabs use matching icons, Open tabs uses double-bubble chat icons, inactive navigation is
brighter and selected titles are white for browser tabs too. Selected project rows fill the
expander area. Preview Open tabs replaces arrows with title/row drag and Alt+Shift+Up/Down;
reordering stays within one workspace/project. Use existing colors; icons replace hierarchy lines.
Chat permissions use one side-panel destination without a composer shortcut, compact pending
decisions and separate Help; workspace-wide
settings live in Configuration. Preview-only Codex access additions must not interrupt a turn;
actual access reductions still stop it without replay. Additive remembered rules preserve inherited
folder grants. Whole-profile removal is Reset to workspace defaults, not a promise to deny access.
See [current preview and verification](desktop-preview.md).

### BF-2026-10-15-01 — Refresh changed Markdown files when returning to their tabs

When the user clicks away from an open Markdown file tab and then selects it again, check the
original source file on its owning host's disk. If its saved content changed since the displayed
version, reread it and refresh the rendered page in that same tab. If unchanged, retain the
existing rendering and reading position. Preserve tab identity, title, placement and source
association; do not reopen a duplicate or refresh unrelated tabs.

Preserve the user's scroll position when changed content refreshes, so returning to the tab
does not jump back to the top. Restore the reading position after rendering/layout settles;
if the document becomes shorter, use the nearest valid position.

Use the existing authorized document/file reader and current root/version checks. For remote
documents, recheck the owning host rather than the viewing device's disk, and retain existing
grant and exact-version approval requirements. A changed version requiring approval must follow
that flow before delivery. Missing, moved, denied or offline sources must show an explicit state
without presenting retained content as freshly read. This request changes return-to-tab behavior;
it does not request continuous background replacement while the user is reading.

Future acceptance: edit a disposable Markdown file externally while another tab is selected,
return and see the new content in the original tab while retaining the user's scroll position;
repeat without changes and retain reading position. Cover shorter documents and delayed image
layout without jumping to the top. Cover rapid tab switching/stale read responses, multiple files, source errors and
authorized remote reads/version approval without duplicate tabs or broader access.

### BF-2026-10-15-02 — Refresh in Markdown tab context menus

Add **Refresh** to the menu shown when the user right-clicks a Markdown file tab. The action
rereads that tab's original source and refreshes its rendered page through the same authorized
read path as BF-01. Target the right-clicked tab even if another tab is selected; preserve its
identity and placement. Keep source errors and any required version approval explicit.
Preserve that tab's scroll position through refresh using the same behavior as BF-01, including
when refreshing an unselected tab and returning to it later.

Future acceptance: externally update a disposable file, right-click its tab and choose Refresh,
then verify the new content appears in that existing tab without resetting its scroll position.
Cover selected and unselected tabs, shorter documents, delayed image layout,
unchanged content and failed reads without refreshing another document or creating a duplicate.

### BF-2026-10-15-03 — Dismiss pop-up alerts after five seconds

Reduce the automatic dismissal time for Proteus pop-up alerts/notification banners from
15 seconds to **5 seconds**. Apply the shared duration consistently to the desktop notice
surface and in-page toast presentation, including actionable alerts. Preserve manual dismissal
and existing actions. Hiding an alert must not resolve its underlying pending request or change
an independent authorization expiry; retained Logs/Needs attention entries remain available.

Read-only source confirmation: `public/toast.js` currently defaults to 15,000 milliseconds and
uses that timer for both desktop notices and in-page toasts. No runtime change has been made.

Future acceptance: verify ordinary and actionable alerts disappear five seconds after each is
presented on both surfaces, manual dismissal still works, queued alerts receive their own full
five seconds, and dismissal neither submits an action nor clears a pending approval.

### BF-2026-10-15-04 — Clickable full document paths and URLs in agent responses

Recognize document/resource paths and website URLs in agent response messages and make them
clickable, so the user can open generated or referenced resources directly without asking the
agent to open them. Keep the **full path or URL visibly present and copyable**; do not replace
it with an obscuring title, basename, shortened label or ellipsis. Existing titled document links
must also expose their full destination in the response. Cover plain paths/URLs and path text
in inline code as well as explicit Markdown links. This scope is agent responses, not a blanket
requirement to transform every tool result or Activity block.

Route the clicked resource according to its actual type and available Proteus capabilities:

- Folder: open the folder in Finder on the owning Mac.
- Markdown file: open it in the in-app Markdown editor tab, retaining the source path.
- Website URL: open it in a Proteus browser tab, respecting the response chat's placement/profile.
- Other generated/referenced file or resource supported by an existing in-app viewer: open it
  in the appropriate Proteus surface. Keep unsupported destinations explicit and the full path
  copyable; this intake does not claim every file type already has an in-app editor/viewer.

Opening requires the user's click; rendering a response must not open resources or switch focus.
Reuse an existing tab for the same owner/source where supported, preserving the originating chat,
draft and reading position. Resolve relative paths against the response chat's working directory
and show the resolved full path without altering the actual target. Preserve meaningful URL
queries/fragments and distinguish file line/anchor references from the underlying filesystem path.
Handle spaces, Unicode and punctuation without linking surrounding prose into the target.

Reuse the host-owned file/document/browser boundaries and current authorization checks. Response
text is a resource reference, not a grant or an instruction to execute a file. Resolve actual file
versus folder on the owner; do not mistake a remote Mac path for a path on the viewing device.
Remote document version approvals remain required where applicable, and viewing a document does
not grant write access. Finder actions remain owner-local and must be clearly unavailable when
the client cannot perform them. Missing, denied and unsupported resources must report their state.
Existing Markdown preview/link handling is a starting point, not verification of this requested
automatic recognition, full-path presentation or editor behavior.

Future acceptance: agent replies containing generated and referenced folders, Markdown files,
other supported documents and websites; plain text, inline-code paths and explicit links with
short labels; absolute/relative paths, spaces/Unicode, punctuation, line references, URL queries
and fragments. Verify full visible/copyable destinations, actual type-specific click results,
same-source tab reuse, correct chat placement, unchanged chat/draft state, and no automatic opening
or execution. Cover local/remote ownership, missing/denied/unsupported targets and existing grants.
Activity/tool-block transformation is outside this item's required scope.

### BF-2026-10-15-05 — Enter submits the new workspace name

Reported bug: after clicking **＋ Workspace** and entering a new workspace name, pressing Enter
does not create the workspace; the user must click **Continue**. Make Enter in the name field
invoke the same validated creation action as Continue, using the entered name and selected folder.
Keep Continue available and preserve Cancel/Escape behavior. Blank/invalid names retain the same
validation, and repeated Enter or Enter plus a click must not create duplicate workspaces.
Do not submit while Enter is being used to confirm an input-method composition.

Future acceptance: start the plus-workspace flow, enter a valid name and press Enter; verify one
workspace is created and opens exactly as it does with Continue. Cover blank names, repeated Enter,
input-method composition, cancellation and creation errors retaining the entered name for retry.
This records the reported behavior and requested fix; no UI reproduction or implementation claimed.

### BF-2026-10-15-06 — Clear changed-source alert with a working Refresh sources action

Reported blocker: starting a chat shows “Instructions changed. Refresh context before starting:
[source name]” without explaining what changed or offering the recovery action in the alert.
Replace that wording with: **“‘[source name]’ changed on disk. Refresh sources to load its latest
version, then start your chat.”** Identify the actual changed source, including one automatically
included through workspace defaults rather than manually selected in the filtered list.

Add a **Refresh sources** button directly to the alert. It must actually await the current
dialog's source refresh on the owning host, rebuild the picker/preview with current versions,
and report success or a useful failure. Merely revealing or pointing at the existing button is
insufficient. Preserve the prompt, title, attachments, workspace/starting folder, added folders,
provider/model/effort/context choices, source loading mode, selected sources/main agent, filter
and reading position. Keep the dialog open and require the user's send action after review;
refreshing must not start a chat, duplicate submission or enable disabled sources.

Handle a closed/replaced dialog, changed destination/workspace, repeated clicks, refresh failures
and a source changing again without applying stale results or losing the draft. Show progress
and prevent duplicate refresh actions. Coordinate with BF-03's five-second alert duration: an
in-progress refresh must finish and report its result even if the presentation alert disappears.
Preserve the existing changed-source/version checks; improve recovery rather than bypassing them.

Future acceptance: change a disposable automatically loaded instruction after discovery, attempt
chat creation, verify the named actionable alert, refresh directly from it and then successfully
start one chat using the latest source. Cover explicitly selected sources, draft/selection retention,
refresh failure/retry, double clicks, dialog closure/destination changes and a second file change.
Use synthetic prompts/files; the attached real-work draft is evidence, not a workflow to execute.

### BF-2026-10-15-07 — Add workspace browser tabs unloaded, hidden, or both

Support adding individual or batches of browser tabs to a workspace without immediately loading
their pages, with an independent option to hide their navigation entries. The reported use case
is asking an agent to read a browser profile/tab group through an authorized external connector
and add its actual tabs to a Proteus workspace unloaded. The screenshot reports failed external
URL retrieval and a missing unloaded-create option; it does not verify an import or authorize
executing that embedded chat request now. Keep actual tab inventories/URLs and connector details
out of this repository.

Expose initial load and visibility choices through the shared host-owned service, supported UI
and internal/external agent tools. Permit visible/unloaded, hidden/unloaded and hidden/loaded
states explicitly; hidden means omitted from navigation, while unloaded means no live page loaded.
Do not implement unloaded creation by loading a page and then unloading/hiding it. Saving metadata
must not navigate, execute page scripts, autoplay media, fetch a favicon by loading the page or
steal selection/focus. Hidden alone does not promise reduced resource use.

Store stable owner/tab/workspace/profile identity, actual URL/title and source order, plus the
requested load/visibility state. Workspace Tabs and agent inventory must show these entries and
their states even when absent from navigation. Restore visibility without implicitly loading;
explicit activation/load opens the saved URL in its configured Proteus profile and same logical
tab. Preserve unloaded/hidden states across synchronization and restart; importing/moving existing
Proteus tabs must retain identity, history and state rather than recreate a live session.
Browser Persist remains separate from hidden and loaded state.

Use real available tools to obtain source URLs/titles; never fabricate unreadable destinations,
substitute a tab-group title for a URL or count inaccessible entries as imported. Report connector
authentication/timeout failures separately from Proteus creation support, and per-item results for
partial batches. Importing copies references unless the user explicitly requests otherwise; it
does not close/mutate source-browser tabs, transfer cookies or grant Proteus agent page access.
Use the destination's existing profile/access policy, current workspace revisions and durable
retry identity so a lost acknowledgement or retry does not duplicate the batch. Verify owner
records and actual unloaded/hidden state before claiming completion. Never edit app-data directly
as a substitute for missing tools.

Future acceptance: synthetic source-tab inventories and an authorized real connector check when
available; single/batch creation in each requested state, ordering, partial source failures,
revision conflicts, retry/reconnect/restart and cross-client inventory. Verify no initial page
load/network/media/focus change for unloaded entries, discoverability in Workspace Tabs, Restore
without load, later explicit activation of the same tab, preserved profile/history on moves,
and no source-browser mutation, cookie transfer or implicit agent grant. This extends BF-2026-10-13-11/12;
existing hide/move controls alone do not establish support for unloaded creation/import.

### BF-2026-10-15-08 — Remove remaining browser-profile barriers to agent use

**October 18 status:** Operator-authorized source implementation and isolated Electron acceptance
pass. Ordinary website tabs use all available configured profiles without extension/tab opt-ins.
Explicit hidden/unloaded creation and background page lifecycle tools are implemented. Production
rollout is pending; see [validation](2026-10-18-browser-agent-access.md). The intake below is historical.

Reported blocker: agent tab creation fails because its profile “has extensions enabled and is
private,” asking the operator to switch to a no-extension profile. Remove remaining profile-wide
barriers so authorized agents can create/add, load, read and control ordinary website tabs in
**any configured browser profile**, including extension-enabled profiles. No separate extension
agent opt-in, profile switch or duplicate sign-in should be required. This supersedes BF-2026-10-13-17's
extra profile preference as the desired behavior. Apply ordinary tab ownership/sharing and action
authorization consistently across profiles, including BF-07's unloaded/hidden imports and later
explicit activation. An extension or legacy private/profile setting must not independently veto it.

Read-only source confirmation: `desktop/browser-extensions.cjs` gates extension profiles on
`allowExtensionAgents`; `desktop/browser.cjs` rejects agent-owned creation/sharing and filters
allowed tabs through that protection; `public/browser-toolbar.js` retains extension/private
wording. These are Proteus policy paths. The installed host/profile and exact flag behind this
report have not been independently inspected.

Audit creation, inventory, ownership/sharing, loading, semantic reads/actions, screenshots,
coordinate input, Playwright/developer adapters, restoration/reconnect and extension install/update
for leftover profile rejection, filtering or grant stripping. Remove obsolete opt-in controls,
errors and guidance; handle absent/false/true legacy values without manual toggles per profile.
Preserve signed-in profile sessions, extensions, history and tab identity. Keep ordinary per-tab
and developer scopes consistent across profiles; do not merge sessions, export cookies/vaults or
grant unrelated tabs. Report genuine missing-profile/offline/backend errors accurately.

Future acceptance: default/named profiles, extensions on/off, all legacy flag values, new agent-owned
and existing signed-in tabs; create/import unloaded/hidden, activate, read, screenshot and interact
through actual internal/external tools. Repeat across restart/reconnect and extension updates.
Verify correct session/placement, no forced profile switch or silent disconnection, consistent tab
permissions and actual page read/control results. No live profile settings or tabs changed here.

### BF-2026-10-15-09 — Claude sometimes requires a second message before processing

Operator reports sometimes needing to send the same message twice for a Claude chat to process
it. Screenshot evidence shows two consecutive user messages marked **Queued message delivered**
before the next visible assistant response, with Working still displayed afterward. It does not
establish whether the first message was lost, delayed, combined, processed without visible output
or blocked by an existing turn/tool. Treat this as an intermittent delivery/turn-state investigation,
not a confirmed provider failure or a reason to execute the workflow shown in the screenshot.

Trace one message identity from UI send/queue/steer, API receipt and durable queue state through
engine drain/wakeup, Claude session input, actual provider events and rendered response/state.
Inspect the active-turn-to-idle handoff, pending tools/approvals, resume/reconnect, timeouts and
cleanup, and whether delivered is recorded before a failed or stalled provider handoff. Compare
durable owner events, native provider records and the client timeline using private evidence
outside this checkout. Distinguish a lost input from delayed execution or missing presentation.

A single accepted send must reliably progress to the intended serialized turn or show a truthful
queued/blocked/failed state and recovery action. A second user message must not be required to wake
an idle queue or rescue a dropped first message. Delivery wording must reflect the actual stage;
it must not imply a model response or workflow completion merely because a message left the queue.
Preserve drafts, queue order, session/context/approvals and durable retry identity. Safe transport
retries of the same message must not execute it twice; intentional separate messages with identical
text must remain distinct. Do not blindly replay an ambiguously delivered input or run concurrent
turns in one provider session. Working must follow actual owner turn state.

Future acceptance: one follow-up from idle; queue during streaming, a long tool and approval waits;
send at the exact turn-completion boundary; multiple queued messages; provider failure, disconnect,
lost acknowledgement, restart and retry. Correlate accepted IDs with provider input/turn events and
visible state/output, verifying no second-send dependency, lost queue wakeup, double execution or
stuck Working. Begin with the Claude adapter identified in the screenshot and verify shared-engine
behavior across other providers where affected. Actual reproduction/root cause remain unverified;
no live chat/message, provider process or background workflow has been altered by this intake.

### BF-2026-10-15-10 — Host-wide source library with workspace/chat selection

Implemented in the isolated desktop preview only. Engine Room Source library provides Add/Rescan/Remove,
scan results and usage, without load policies or grants. Registration scans supported nested sources
and exposes the catalog in every workspace. Configuration offers a one-time folder-wide mode edit
for all current items, including filtered items; individual overrides and future-item defaults remain. Workspaces retain source selections, working folders,
defaults and permissions; chats retain exceptions. Preserve existing source IDs, aliases, explicit
documents, modes and disabled state. Used removed registrations remain retained unavailable
references with recovery, without erasing captured history or revoking unrelated folder access.
Selection, helper-file reads, write access and connection/tool permission remain distinct.
See [consolidated design](2026-10-15-workspaces-projects-design.md) and
[permission review](design/2026-10-15/permissions-review.md).

### BF-2026-10-15-11 — Workspace Projects, flat project tabs and complete migration

Implemented in the isolated desktop preview with the limitations below. Projects are organizational workspace children sharing its configuration;
each workspace has a default project, initially General. The workspace name sits in application
navigation; its local strip starts Projects, Chats, Tabs and Configuration, fixed left and
non-closable. There is no extra Workspace tab. Optional browser/terminal/viewer tabs follow and
may stay at workspace level. Tabs aggregates direct and project resources; new workspace chats
route to its default project. The Workspaces collection opens directly to workspace cards (October 16
revision removes its duplicate Chats tab). Use the
existing four-box collection icon, panel-shaped workspace icon and folder-shaped project icon.
This supersedes the intermediate generic Workspace tab and initial forced resource routing.

Workspace opening defaults to Projects, with seven recent chats per expanded project and More.
Sidebar workspaces and their seven recent projects/More follow the existing line hierarchy, with
projects slightly indented as children. Each project opens its own flat content strip and pinned
Project root with project-filtered Chats/Tabs.

Reuse the current chat-index design across global, collection, workspace and project views,
including type/search/computer/provider/status/schedule/date/archive controls. Lock Workspace in
workspace context and Workspace plus Project in project context; preserve per-view filter state.

Global Chats keeps top-level quick views of the same canonical conversation and original
association, plus Open in project. Chat moves preserve execution settings, approvals, drafts,
sessions and active turns. Default workspace/project applies to newly unscoped chats only.
Migration must account for every main/Team/workspace/chat descendant, deliberate alias,
Unhoused/archived/hidden/unloaded record, schedule dependency and retry receipt; preserve legacy
main/Team/Unhoused exceptions without silent rehoming. Browser history/profile, terminal process
and viewer authorization survive placement changes. Share owner-service semantics across UI,
internal/external agents, desktop/web/native; no new tool or live grant is claimed.
See [design and migration mapping](2026-10-15-workspaces-projects-design.md) and
[clickable synthetic prototype](design/2026-10-15/projects-workspaces.html).

### BF-2026-10-15-12 — Clear permission scope and proposed bounded Autopilot

Permission presentation is implemented in the isolated desktop preview; bounded Autopilot remains a proposal. Separate working-folder read/edit access, source loading/helper reads,
command execution and connected-tool permission. Show once/chat/workspace scope and grant origin,
honor unchanged prior authorization and retain captured permissions on chat moves. Proposed
bounded Autopilot requires actual provider/adapter enforcement; command names, cwd, tool names
and MCP read-only hints cannot establish safe effects. Rules need authenticated operation/resource/
argument identity. Existing broad modes must stay visibly distinct and must not migrate silently.
Unavailable containment requires truthful approval wording, not an unconditional autonomy promise.
Pending requests stay inside the chat above the composer with action, target, reason and scope.
Details → Permissions provides one side-panel control surface for captured
defaults, chat overrides, folder access and saved grants/revocation. Decisions retain drafts and
leave readable receipts; unchanged grants suppress repeated prompts. Keep long descriptions in
Help and workspace mutations in workspace Configuration. The pending request contains only its
action, target, short reason and Allow once / Deny / Remember controls. Auto-approve tools remains
an explicit chat-level option with its breadth shown before saving.
See [permission review](design/2026-10-15/permissions-review.md) and
[consolidated acceptance journeys](2026-10-15-workspaces-projects-design.md#user-journeys-and-acceptance).

BF-10–12 now have a gated desktop implementation using the real shell, chat engine and existing
permission APIs. Synthetic project/chat navigation, scoped indexes, preserved drafts/chat moves,
source registration and cold restart passed isolated Electron testing. Non-chat project-resource
moves, workspace deletion, live-data migration, bounded Autopilot and web/mobile parity remain
deferred. [Desktop preview status and validation](desktop-preview.md) distinguish this implementation
from the earlier [clickable rehearsal](design/2026-10-15/prototype-validation.md).

## October 15 0.2.20 acceptance — website, personal desktop and phone

Website **0.2.20** is deployed and verified: 9,217 deployed hashes, eight served assets and
14 endpoints pass. Verified central recovery and the fixed capture-state restore gate pass;
the ordinary restore/live-state comparison did not pass and is not claimed. Schema, runtime
configuration and nutrition remain unchanged. The bounded deployment log window has no new
Laravel/relay errors; Apache events are expected environment-file denials and database events
are known column-statistics messages. Detailed private receipts remain in the deployment project.
The SSH failure was the existing key's locked Keychain access; unlocking resolved it without
credential or server-policy changes, and the same release/capture request was resumed.

Personal Electron **0.2.20 /3f2196de3586** is installed/live-verified, including visibly restored
navigation/browser chrome. Native Mac **0.2.20 /2610.14.3** is installed/launch-verified and its
running executable matches; native accessibility inspection remains unavailable and its protected
container was not edited. Physical iPhone has the same native release installed/launched, retaining
all 1,675 accessible original file bytes and saved destinations; four OS snapshot paths renamed.
Backup verification used temporary folder scratch plus hash receipts, with no full after-copy.

The three oldest accepted local Electron/native/phone generations and three byte-identical mobile
after-copies are retired, retaining two full recovery generations per local target and compact
receipts. Redundant native rollback app bytes also match the retained durable copy and are retired.
Measured free-space change during that rotation was -0.03 GiB (concurrent use/APFS sharing); no
positive reclaimed-space claim is made. Website's separately approved current-plus-two-prior
ordinary policy rotated one eligible generation after acceptance; unique pins remain unchanged.

Work Mac and physical iPad remain staged because fresh checks still report locked. The identified
HC waiting-chat interruption remains explicitly authorized; no interruption/replacement occurred
while locked. Do not treat that authorization or a dispatched chat as installation completion.

## October 14 0.2.20 rollout checkpoint — unlock/transport pending

Personal Electron **0.2.20 /3f2196de3586** is installed with backend/preservation verified; visible
restored-UI acceptance awaits Mac unlock. 47,218 cold files, 8,731 protected retry receipts,
90 tab identities/order/ownership/profiles and drafts remain; three SQLite checks and provider/
relay health pass, with no new warning/error logs. Native115 units plus linked-image target
capture and iPhone/iPad menu/open-adjacent UI pass; native2610.14.3 is signed/staged. HC exact
artifact/source transfer is verified, and waiting-chat interruption is expressly authorized;
destination signing/install waits for unlock. Physical device installations also wait for unlock.
Website recovery capture completed but export verification/SSH authentication stopped activation;
production remains0.2.19. Resume the existing durable request rather than recapturing or clearing
receipts. No certificate/account reset or server access-policy change is authorized or needed.
See [release validation and remaining work](2026-10-14-retry-menu-release.md).

## October 15 cold notification follow-up — implemented; hosted verification pending

The real-iPad run reaches its cold schedule route with the correct cached descriptor, then a
passive restored-browser callback takes focus. Separate explicit transient browser activation from
remembered selection and make metadata reconciliation passive. Preserve cold-cache/host ownership
and verify same-ID user reselection, passive hydration, new-tab activation and the existing cold
schedule route. The transcript/picker UI corrections use measured whole-composer and keyboard
prediction boundaries. Do not weaken their draft/model-option or notification assertions.

Current cross-platform acceptance is recorded in [PR #20](https://github.com/mdpope/Proteus/pull/20).
The dated/source-specific checkpoints below retain their original verification scope; later
workflow results supersede their pending/failure status without changing the recorded artifacts.

## October 15 remaining native acceptance corrections — in progress

Run 38693169853 passes 626 Node tests/static checks on Linux and Mac, both packaged desktop UI
workflows, web assets/PHP and all 122 native units. Actual Favorites, owner history settings and
three of five actual-iPad workflows pass. The complete UI inventory records 58 passes and nine failures. Their corrections are based on
screenshots, accessibility hierarchies and actual fixture/production state contracts. Preserve every backend/count/selection/history assertion;
correct visible transcript coordinates, native menu/disclosure interactions and explicit restored
navigation setup. The browser edge investigation identifies a real handler ownership gap; use a
single app recognizer while retaining matched native-history traversal. See browser.md and the
October 15 design decision, including the interactive-preview tradeoff. Full rerun remains required.
The private production relay provisioning route remains unavailable; keep Linux access disabled.

## October 15 native validation follow-up — implemented; rerun pending

Hosted run 38690148311 passes Linux and Mac desktop tests/package/UI, web assets/PHP and all
121 native units. Its 67 UI cases produce 55 passes and 12 failures. The follow-up fixes a real
stale Favorites/workspace identity inconsistency, updates observed picker/navigation gestures,
and routes 62 phone cases and five tablet cases to their actual simulator families. No tests
are removed or silently skipped. The next run requires 122 units and all 67 UI cases.
All 626 Node tests and static checks pass after the follow-up. The installed verified
Linux 0.2.20 / linux.fda4ae896542 remains its own acceptance checkpoint; release-note changes
require a separately fingerprinted candidate. Production relay registration and physical-device/
signed Mac acceptance remain outstanding; PR #20 stays draft.

## Accepted 0.2.20 import — integration implemented; revalidation pending

Imported the exact accepted Mac source from `codex/signed-proteus-0220-20261015` /
`418a083`, with all 879 manifest hashes and archive digest verified. The source fingerprint is
`3f2196de3586915fc72f8d0cdebb645c109992306c3735514d0786b0acaf4985`.
Native version is 0.2.20 / 2610.14.3. Preserve both the upstream native-menu/tab-retry changes and
the Linux/Mac host metadata, legacy identities, protected credentials and shared package checks.

Merged-source **625 Node checks and static checks pass**. The exact Linux package
`linux.fda4ae896542` passes inventory/provenance/UI/PTY/restart and live Codex approvals,
files, cancellation, continuation and disposable encrypted relay acceptance. It is installed
on this laptop with Codex ready, existing chat/configuration hashes retained and two verified
recovery generations. Full two-host website UI passes. Hosted Mac tests/unsigned package/UI
and web assets/PHP pass; corrected Linux fixture teardown needs CI rerun. Native compilation
now succeeds after the view decomposition. Hosted UI exposed a real-notification fixture race;
its scheduling acknowledgement/background timing is corrected without skipping OS delivery or
tap-routing assertions. Native units and all UI tests will rerun across isolated shards.

Keep PR #20 in draft until the outstanding checks and coordination gates are resolved. Production
Linux relay registration, actual iPhone/iPad-to-Linux pairing and production signed Mac acceptance
remain separate; no existing Mac/iOS installation, website or relay was replaced. Source lineage
and exact validation are recorded in `linux-app.md`. Earlier notes below describe dated history.

## Earlier October 14 cross-platform checkpoint — 0.2.19

Implemented: platform-neutral desktop/web/native host controls, optional authenticated platform
metadata, Linux legacy Secret Service resolution with unchanged Mac Keychain behavior, and shared
packaging inventory/metadata verification. Legacy wire/storage keys, pairings, host ownership,
approvals, drafts and retry receipts stay intact. Independent computers retain distinct relay
registrations. Native source adds five unit cases and a local mixed Linux/Mac UI fixture.

Verified: 619 Node checks, static checks, PHP 81 tests / 724
assertions, Pint/Vite, and disposable Linux UI at desktop/phone widths for attachments, chat
design, composer, bounded MCP retries and long-history pagination. Linux stage `6f16217c6a6f`
passed all 231 runtime hashes, metadata/provenance/private-file checks, isolated startup,
synthetic feedback, native PTY keyboard input and restart history before this documentation
freeze; final current-source rebuilding remains pending and no live installation changed.
The new hosted workflow covers Linux/Mac desktop packages,
web and an iPhone simulator, but has not executed. Remaining acceptance: finish source/package
checks after freeze, exercise the staged Linux package, run hosted/Mac/native tests, verify signed
Mac identity and existing data, then separately test actual iPhone/iPad-to-Linux and mixed-host
relay operation. Provider sign-in and live Life/Secret Service access require their own evidence.
No physical update or production relay/website deployment is implied. See `linux-app.md`.

## Historical local Linux adaptation of 0.2.19

The Linux branch imports the verified accepted canonical Mac source (`82cd923`, fingerprint
`eb9548dbcce9`) and adds independent packaging, XDG paths and desktop lifecycle handling.
607 Node checks, current tab UI acceptance, live packaged Codex approvals/restart/cancel/relay
and packaged native terminal input/output pass on Manjaro x86-64. See `linux-app.md`.
Physical iOS, other provider authentication, Life database credential resolution, ARM64 and broader
Linux distribution acceptance remain deferred. Mac package acceptance remains a separate gate.


## October 14 authorized next-release build — in progress

The operator authorized implementing the native link-menu and retry-ledger queue, building and
installing the updates, and explicitly released the website/second-desktop deployment hold.
Candidate version is **0.2.20 / native 2610.14.3**. No target is yet installed on this candidate.
The earlier queue-only and deployment-held entries below are historical.

Native menus resolve the actual pressed anchor in an isolated script world, including linked
images, and add link actions to both WebKit element menus and UIKit editing menus. Native
selection actions remain. New tabs retain source placement/profile/owner; new empty link drafts
inherit the source workspace. Downloads reuse the existing lifecycle and configured folder.

The receipt-capacity investigation identified repeated tab metadata updates from stale runtime
timestamps/icons and history titles. Applying shared state no longer counts as interaction;
known opened timestamps persist, interaction times merge monotonically, and omitted favicons
do not erase known icons. Synchronizers batch metadata, retain wire request identity across
transport retries/restart, back off per owner on capacity refusal, and deduplicate named warnings.
The 10,000-receipt/256 MiB limits, 24-hour settled window and indefinite unresolved protection
remain. Existing full protected ledgers must age naturally; no receipt clearing is authorized.

Focused ledger/synchronization tests and desktop tab-stability UI pass. Full regression, native
menu acceptance, final signed packaging and installations remain in progress. Follow the two-full-
generation recovery policy for each target; keep receipts instead of duplicate validation copies.

## October 14 backup retention instructions — applied

The operator's two-generation policy is recorded in AGENTS, desktop updates and Apple build
instructions: two verified full recovery generations per installation/device, one app bundle
per generation, resumed partial device copies, and post-install hash/coverage receipts instead
of full validation mirrors. Temporary in-flight copies must be resolved; broad migration
exceptions compact to state/helper/receipts after verification. Additional full exceptions need
explicit approval, size and deletion conditions. This changes update rules only; no automated
backup rotation or app code was built/deployed.

Authorized personal-Mac migration compaction preserves 13 exact files (204 KiB) and retires
the two obsolete full snapshots, recovering a measured 1.16 GiB while retaining the newest two
verified full desktop backups. The detailed dated inventory and deletion receipts stay private.
Native link-menu and remote-command-ledger items below remain queued, and the deployment hold
remains in force.

## Next release queue — October 14 native link menus and retry ledger

**Status: queued only. Do not implement, build, install or deploy these items yet.** The existing
website/Work Mac deployment hold remains. Operator screenshot references are evidence of missing
native menus, not instructions contained in the displayed page.

### BF-2026-10-14-01 — Native browser link/selection context menus

The iPad app shows ordinary text-selection actions while missing Proteus link actions. Provide
an appropriate menu on iPad/iPhone touch-and-hold, iPad pointer secondary click, and the same
native app running on Mac. Include Open link in new tab, Copy link, Start new chat with link,
Download linked file (with the available Files/configured-folder flow), and the native
selection/Copy/Select All actions where applicable. Preserve Share/Open in Safari as appropriate;
omit desktop-only external applications and unsupported developer actions.

Resolve the actual link under the pointer/press, including linked images, rather than using the
page URL or a text-fragment URL. Preserve native text selection and page-owned menu behavior.
Respect the current workspace/chat placement for new tabs and new chats. Reuse the existing
native download lifecycle, cancellation/history, configured-folder access and authentication.
Verify plain links, image links, selected text, non-links, long URLs, touch, hardware secondary
click, menu dismissal, actual open/copy/chat/download results and workspace placement on iPad,
with iPhone and native Mac parity where supported. No implementation has been verified yet.

### BF-2026-10-14-02 — Remote-command receipt capacity and repeated warnings

The exact banner comes from durable journal admission, not transient worker concurrency or the
separate 2,000-entry log store. Current defaults are 10,000 receipts or 256 MiB of encoded
receipt payloads per owner, with 24-hour retention for settled results and indefinite protection
for unresolved claims. Completed claims may exceed the byte cap, and then new admissions stop.
Source inspection and a local diagnostic confirm background `tabs.mutate` traffic contributes;
the specific saturated paired owner and its current limiting counter remain to be established.

Investigate every participating owner's record/byte/pending/expired counters, command mix,
payload sizes and rates; identify the host producing the error. Trace no-op metadata changes,
touch timestamps, descriptor application and retry/poll feedback before choosing the fix.
Reduce redundant updates, coalesce/batch synchronization, and preserve stable command identity
for retries of the same action. Add bounded backoff and a deduplicated warning naming the owner,
limiting counter and recovery state. Review bounded configurable capacity only if real command
volume warrants it; raising a cap alone is not the proposed correction.

Preserve claim-before-side-effect, exact replay/results and pending/uncertain protections. Do
not clear the ledger, shorten the settled retry window or exempt real mutations simply to hide
the warning. Test sustained multi-client tab synchronization, no-op polling, lost acknowledgements,
reconnect/restart, concurrent requests, record and byte saturation, natural settled expiry,
unresolved claims and user-action availability. Verify that a real chat/tab action executes at
most once, protected receipts survive and automatic retries do not repeatedly toast.

## October 14 attachment composer correction — deployment held

Personal desktop: installed/live-verified on **d94ad06adb5b**, with restored UI, 85 tabs/drafts,
protected data/receipts, signature/runtime hashes, database integrity and provider/relay checks
passing. Previous app/data/source recovery is retained privately. Website/Work Mac remain held.

The operator requests an attachment section after the text editor and before +/model/action
controls, with matching local, visiting-desktop and web layouts. Implemented in the shared
composer grid, bounded attachment scrolling, stable-host observation and editor height accounting
for waiting questions. Web uses matching chips, thumbnails and file-size captions. Regression
coverage exercises actual pickers, 1/48 attachments, short/long drafts, removal, retained drafts,
and fixed visible controls at wide/phone widths. Local and remote desktop UI, focused and full
Laravel/two-owner web UI, 604 Node tests, static checks, the web build and the signed desktop
package pass. The exact signed candidate also passes attachment layout, preview, explicit
consent and bounded upload UI; all 227 runtime source hashes still match its build manifest.
The older independent long-history stability fixture could not load its history and did not
reach its checks; it is not claimed as verified.

**Hold:** build and test first. Do not redeploy the website or Work Mac until further instruction.
Existing installed 0.2.19 acceptance below remains the production baseline.

## October 14 final 0.2.19 acceptance — all authorized installation targets complete

Both desktop hosts have the exact signed **0.2.19 / eb9548dbcce9** installed and live-verified.
604 Node tests/static checks, exact signed Move/title/document placement UI, immediate full-URL
redirect/download UI and bundle/vendor checks pass. The unchanged signed history-log rehearsal
passed on retry after its first polling timeout. Primary preserves 84 logical tabs/drafts/order/
profiles, 45,757 cold data files and 3,892 protected retry receipts; all three SQLite integrity checks
pass, providers and relay are healthy, and no new startup warning/error was logged. Restored UI
and the operator's current draft were visibly observed without editing them; compact/modal UI hid
its footer. The second host visibly verifies 0.2.19, 66 tabs, all 171 run files and both dormant
messages retained, healthy providers/two relay hosts, no new warning/error. Normal Move of the
identified affected chat converges to one destination-workspace descriptor with no main alias and
stays selected across 12 sync samples; Workspace Tabs title activation selects the existing view.

Native Mac, physical iPhone and physical iPad **0.2.19 / 2610.14.2** are installed/launch-verified.
113 native units and two actual history/title UI workflows pass. Existing certificates/profiles/
entitlements remain. The Mac's running executable matches the tested build; its protected container
was not edited and direct hash/AX inspection is unavailable. iPhone retains all 1,933 file contents
(four OS launch-snapshot paths renamed); iPad retains all 3,887 accessible file contents (only 12
unreadable OS launch-snapshot cache files excluded). Both saved destination indexes remain exact.
Device backups/installations were guarded by fresh unlock checks, with prior partial attempts kept.
Physical gestures and real authenticated Microsoft login remain separate from these checks.

Website **0.2.19** is deployed through the existing private route after fresh verified central recovery
and a successful isolated restore. All 9,214 deployable file hashes, 14 endpoints and eight served
assets match; schema, runtime configuration and nutrition remain unchanged. Its current deployment
window has no new Laravel/relay errors; Apache events are expected protected-environment probe
refusals and database events are known column-statistics messages. 81 PHP tests/724 assertions,
two-owner UI, 14 private deployment/retry/retention tests and project structure validation pass.
Central retention keeps current plus two prior ordinary generations and seven unique migration
sets, with a 15 GiB budget. Initial cleanup reclaimed 7.71 GiB, accepted-release rotation removed
one further expired generation, and separately confirmed deletion of exactly four verified expired
server raw/archive copies reclaimed 2.20 GiB. Other server sets and restore evidence were untouched.
The initial failed disk-headroom capture receipt remains; no guard or recovery gate was bypassed.

The scheduled-conversation controls were a functional trigger-classification bug. New run-only
approval now requires its exact current waiting request, and folder trust matches its offered
folder/access; future independent schedule runs keep their own policy. No real approval or
browser-conflict recovery choice was applied. Full standalone-chat subtab retirement stays review
only and SQLite metadata migration stays shelved. Private artifacts, data and receipts remain
outside the application repository.

**Latest October 14 acceptance:** Both desktop hosts run the exact signed **0.2.19 /
eb9548dbcce9**; startup/provider/relay/data checks pass. The second host verified the affected chat
through normal owner Move: one destination-workspace descriptor, no main alias, selected across
12 sync samples, visible navigation and Workspace Tabs title activation. All original run files
and dormant messages remain. Native Mac and physical iPad **2610.14.2** are installed/launch-verified;
iPad retains 3,887 accessible files and saved destinations (12 unreadable OS cache files excluded).
Phone remains staged awaiting fresh unlock after its backup timed out. Website remains staged
pending confirmed cleanup of four verified expired server backups; production is still 0.2.15.

## October 14 0.2.19 rollout checkpoint

Primary desktop **0.2.19 / eb9548dbcce9** is installed. The exact signed package passed Move/title/
document UI, immediate redirect/full URL history/download UI and package/vendor signature checks.
The first signed history-log poll timed out; the unchanged exact artifact passed its repeated full
workflow. All 604 Node/static checks, 81 PHP tests/724 assertions, two-owner web UI, 113 native unit
checks and two actual native history/title UI workflows pass. Cold backup preserved 45,757 files,
3,892 protected retry receipts and three healthy SQLite databases. Twelve post-startup samples retain
84 logical tabs/order/ownership/profiles and drafts; all providers and relay are healthy with no new
warning/error logs. Installed AX inspection currently returns only the shell window, so its visible
footer is not newly verified; exact signed UI rehearsals are separate evidence.

Native Mac **0.2.19 / 2610.14.2** is installed/launch-verified and its running executable matches the
validated build. Container data was not edited; protected-container hash/AX acceptance remains
unavailable. Both physical-device packages are signed with existing profiles/certificate and backups
are running. Second-desktop exact verified installation is underway. Website 0.2.19 is tested/staged;
production remains 0.2.15 because the server recovery capture stopped for insufficient disk space.
Four verified expired ordinary server backup copies are proposed for operator-confirmed deletion;
current plus two previous generations, unique migrations, incomplete sets and restore evidence stay.
Central ordinary cleanup already reclaimed 7.71 GiB; its 15 GiB budget remains unchanged.

## October 14 final follow-up scope — 0.2.19 / native 2610.14.2 candidate

The operator withdrew redirect pausing after Microsoft sign-in failures and explicitly requests full
URL chains on every platform in both navigation and history logs. Remove all countdown/interception
behavior and append each original/redirect/replacement URL, including queries/fragments, rather than
rewriting the selected entry. Native request bodies remain with the browser engine; restart/history
loads never replay POST bodies or serialized page state. The operator's complete-URL retention
choice supersedes earlier login/query redaction for browser history; explicit bookmark validation,
private profile settings and agent/tab sharing grants remain separate. Existing saved records are
preserved; missing historical redirect links cannot be reconstructed.

Workspace Tabs titles now select the existing chat/browser/terminal/viewer, restore hidden
navigation and reveal the selected tab. User Move also selects its destination workspace/chat and
reveals both navigation levels. Scheduled conversations accept only an explicit matching waiting
permission request for new conversation-only auto-approval; new folder trust is limited to the
currently offered folder. Context/revision checks and run-only storage remain, with no grants for
future schedule runs. Broader unrestricted guard removal was rejected by automatic approval review;
the narrower current-request implementation was accepted. No actual operator approval was changed.

604 Node checks, static checks, source desktop navigation/redirect/download rehearsals, 81 PHP
tests (724 assertions) and two-owner web UI pass. All 113 native unit checks plus the actual
SPA-history and Workspace Tabs title/navigation UI workflows pass. Final rebuilt signing and
installation are in progress. Earlier 0.2.19 fingerprint 1760b42c473f was
an uninstalled candidate before these additional requests; never install or transfer it as final.
Website cleanup verified/deleted 21 expired ordinary release sets (7.71 GiB), retains current plus
two previous generations and seven unique migration pins, leaves unknown files intact and preserves
the 15 GiB budget. Automatic expiry occurs only after a new release passes audit. Website deployment
remains pending final source freeze and fresh verified recovery/restore.

## October 14 canonical Move follow-up — 0.2.19 acceptance underway

The second desktop exposed a main-navigation chat descriptor that stayed outside its destination
workspace when browser synchronization was paused. Move now updates canonical owner placement
across main/workspace scopes, converges duplicate chat placements and preserves unrelated tabs and
metadata. A top-level Move selects the destination chat and reveals both workspace/root navigation
and chat/child navigation even when the root bar overflows or the workspace was hidden. Browser
conflict recovery now names the affected tab/URL and uses plain saved-history/pending-page labels.
602 Node tests, static checks and actual desktop UI pass. Signing and per-host installation remain
pending; do not confuse candidate checks with installed acceptance. The operator authorizes retaining
current plus two previous ordinary website recovery generations instead of increasing its 15 GiB
budget. Unique migration pins and unknown/failed files remain protected. The full standalone-chat
subtab retirement and SQLite metadata migration are still review/deferred work.

## October 14 follow-up acceptance

Primary 0.2.18 is installed/live-verified; 601 Node checks, exact signed UI/package checks and
website 81 PHP / 724 assertions plus two-owner UI pass. Second-desktop acceptance is in progress.
Website is staged, with deployment stopped before mutation by its protected recovery budget.
All current fixes are implemented; standalone chat-subtab retirement and SQLite migration remain
future reviews. See release ledger for target status and evidence.

## October 14 document placement — narrow correction plus future navigation review

0.2.18 supersedes the uninstalled 0.2.17 candidate and includes its follow-up corrections.
Agent documents now target the existing workspace chat's navigation instead of creating a
duplicate main-nav chat. Verification/signing/install remain in progress. Retiring standalone
chat subtabs is a future idea: prefer workspace containers with chat/browser/terminal/viewer peers,
while preserving association, original host/source authority, grants, history and sessions. Define
unhoused/main-nav behavior, duplicate-view migration and background focus before redesigning.

## October 14 follow-up — implementation and verification in progress

0.2.17 addresses tab-move navigation receipt collisions/retry storms, complete browser history
relocation, wider/resizable Workspace Tabs columns, chat-tab Move/membership index reconciliation,
and compact-sidebar/native-browser overlap without blanking the page. Runtime checks and actual
UI acceptance are in progress; no 0.2.17 installation is claimed yet. SQLite migration stays shelved.

## October 13, 2026 intake · implementation/build/install authorized

October 14 rollout: active BF-04–20 are implemented and regression-tested, excluding shelved
BF-09. Signed 0.2.15 is installed/live-verified on the primary desktop; native Mac 2610.14.1 is
installed/launch-verified. Second-desktop, physical-device and website status is tracked separately
in the release ledger. Earlier per-item packaging/install-pending labels are historical checkpoints.

Latest correction: desktop 0.2.16 preserves newly managed legacy navigation and intentional
close authority; both desktops installed/live verification passed.
iPhone/iPad and native Mac 0.2.15 / 2610.14.1 are installed/launch-verified; website0.2.15 is deployed.

The operator authorized the active batch BF-04–20, excluding explicitly shelved BF-09. Earlier
queue-only/no-build item labels below describe intake history, not the current authorization.
Track implementation, validation and per-target installation in the
[release ledger](2026-10-13-tab-management-release.md); do not mark scope complete before acceptance.

### BF-2026-10-13-20 — Missing assistant explanation before a Copilot feedback request

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Owner native-event/JSON/API diagnosis completed read-only; first explanation was not
emitted as a finalized assistant reply. Question-history readability remains a queued fix, with
actual historical UI verification pending. No runtime implementation, build or interruption of
the affected chat. Copilot with a Claude model still uses the Copilot provider adapter.

Operator screenshots: a user question receives a brief promise to check live state, then a feedback
request beginning “Given that…” appears without the expected explanatory message. After the user
requests reposting, the next feedback question contains an apology and the substantive explanation.
Neither screenshot proves whether the first answer was absent from the provider stream, dropped
by persistence, omitted from the served page/delta, or hidden by conversation rendering.

- Compare exact owner runs/<id>.json, native provider events, streamed/final assistant payloads,
  question/tool fields and the chat-view API/delta around the request. Check event identity/order,
  waiting-turn transitions, pending request and liveMessages. Validate the actual visible transcript
  against the record; do not infer a renderer defect merely because an answer is missing.
- Correct the responsible boundary once established: preserve genuine assistant text and rich
  user-question context, finalize any real pending stream safely, avoid stale history/delta loss,
  and keep substantive responses readable rather than categorizing them as collapsed tool noise.
  Orient agents to provide an explanation before a follow-up question that depends on it. Preserve
  explanation-bearing question context as readable history after answering, rather than requiring
  discovery inside collapsed Activity. Do not invent an assistant message when the provider never
  emitted it or copy private tool output into the conversation indiscriminately. Pending question
  context must remain accessible after
  answering, with stable request/message identity and without duplicated responses.
- Preserve unsent feedback, drafts, active turn and request IDs during refresh/validation. User
  answers remain explicit; diagnosis must not send feedback, cancel/restart or replay tools.
  Test Copilot with Claude models and equivalent provider request paths where applicable; a model
  label must not select a different adapter or static capability table.

Read-only baseline: Copilot emits assistant.message content/fallback liveMessages, but onUserInputRequest
passes question/choices to engine.ask. Engine persists question history as a system event and shows
pending state separately. groupActivity collapses system/tool/permission events, while ordinary
assistant events are separate; an assistant event carrying tool metadata would also be classified
as activity. A read-only synthetic grouping check confirms ordinary assistant text remains separate
and historical system-question context enters Activity; it is not live verification of this chat.

The chat is on the paired Mac, not in this Mac's local run files; direct SSH timed out. The operator
explicitly authorized obtaining it via the existing Codex chat on that Mac. That read-only audit
completed: the brief checking message is present in native events, saved JSON and the API. The
following assistant content is empty and its feedback question does not contain the explanation.
On repost, assistant content is empty again, while the substantive explanation is inside the
feedback question and preserved consistently in native tool data, saved JSON and the API. There
is no evidence of a lost finalized assistant reply. The affected chat was not selected during UI
observation, so its actual historical rendering remains unverified. Private snapshots/evidence
remain outside source; no workplace chat title, full run ID or message body is copied into this plan.

Future acceptance: real provider/owner/API/visible transcript reconciliation around both questions,
synthetic equivalent regressions, finalized/streaming answers before questions, rich question-only
context, long/paged histories, mutable event patches, local/remote rendering and restart retention.
Check original explanation versus later repost independently. Owner data diagnosis is complete;
historical live UI acceptance and implementation remain pending. No feedback was sent or chat changed.

Operator follow-up: Copilot/Claude questions disappear from visible chat history after answering,
while the user's response remains. Treat this as a recurrence of BF-2026-10-07-07's presentation
requirement, not proof that the durable question is absent. Keep the full agent question, explanatory
context and offered choices in chronological history next to its actual answer, linked by stable
request identity. A clearly labeled expander may contain long details; the question must not be
discoverable only inside generic Activity or replaced with a response summary. Cover sequential/
multiple questions, repeated short answers, cancelled/unanswered states, history paging, refresh,
restart and remote reconnection across desktop/web/native. Reopen Copilot rendering acceptance;
the earlier persistence-tested implementation does not establish this visible-history behavior.

### BF-2026-10-13-19 — Extension popup renders blank/fullscreen and cannot be dismissed

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued bug fix only. Operator screenshot shows a blank screen-filling extension surface;
operator reports no usable close control. No live popup manipulation or app implementation/build.

- Open extension action popups as bounded, anchored browser-toolbar surfaces on the selected tab,
  with visible host-owned Close and Escape dismissal even if extension content fails to load.
  Toggle/reopen/outside-click/focus-return behavior must be consistent. Do not replace the main
  app surface or allow a popup to enter fullscreen/take over the shell through resize/window APIs.
- Show actual loading/failure state with retry/dismiss controls instead of an undismissable blank
  surface. Diagnose renderer/worker errors, popup bootstrap context, routing and unsupported APIs
  using installed extension/runtime evidence. Keep the profile's extension state/vault/login data
  intact; do not reinstall/reset credentials or close the whole application to recover a popup.
- Distinguish action popup, options page and extension-created onboarding/window requests. Use
  appropriate contained windows/views for each, preserving originating extension/profile/tab and
  chrome.tabs/windows/action semantics. Repeated activation must not accumulate orphan windows.
  Close/uninstall/profile change/shutdown must release the correct popup and restore page focus.
- Link placement to BF-18: extension launch buttons belong between Go and browser-tab Overview
  in the address toolbar, not the application tab strip. Apply across main/chat/workspace/Team
  browser scopes and native controls only where the actual extension backend is supported.

Read-only baseline: BrowserExtensions.openPage creates a generic 420×650 BrowserWindow and loads
the extension URL; extensions-open manually chooses default_popup. Extension-created pages also
route through this generic path, while the adapter may manage its own popup lifecycle. This does
not by itself explain the screenshot's fullscreen/blank state; inspect the actual affected path.
Current source has no host-owned anchored popup dismissal/error surface for that manual path.

Future acceptance: real extension action popup loads bounded content and closes via button/Escape,
failure remains dismissible, repeat open/toggle, options/onboarding distinctions, narrow/Retina/
fullscreen parent, renderer crash and worker failure, live selected-tab/profile changes, restart,
keyboard focus and no loss of browser/profile/vault state. Live reproduction remains pending.

### BF-2026-10-13-18 — Extension install placement, toolbar actions and localized identity

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued interface/localization fix only. Operator confirms extension-enabled tabs must
allow agent access via BF-17; no implementation/build or current grants changed.

- Replace the long Install extension control squeezed over the URL/icons with a compact Extensions
  button/menu in the browser address toolbar, after Enter/Go and before the browser-tab Overview
  control. Installed extension icons/actions belong there too, with an overflow menu when needed;
  remove their current top-level navigation placement. Preserve full URL editing, pointer targets,
  keyboard labels and existing Overview functionality across main/chat/workspace/Team surfaces.
- On an eligible Chrome Web Store detail page, show Install in that Extensions menu or a clearly
  separated compact browser action; installation must not overlay URL text or adjacent controls.
  Keep install/manage entry points in Engine Room Browser Preferences. Disabled/installing/installed/
  update/error states use the selected profile and do not create duplicate installation requests.
- Resolve manifest localization such as __MSG_extName__ before displaying the permission review,
  extension menus/buttons, notices or errors. Read locale messages with preferred-region/language/
  default-locale fallback and bounded safe file access; keep a meaningful fallback if metadata is
  malformed. Show the actual downloaded extension name/version/source, not a generic template token.
  Do not load/execute an unapproved extension merely to discover its name. Update review wording
  to reflect BF-17's chosen profile access rather than an unconditional “private from agents” claim.

Read-only evidence: browserAddress inserts a long data-store-install button inside the URL group;
renderExtensionActions mounts icons into #extension-actions in the top tab strip. installStore
uses raw manifest.name before Electron loads the extension, consistent with the screenshot's
unresolved name. Chrome's [localization documentation](https://developer.chrome.com/docs/extensions/reference/api/i18n)
defines these manifest placeholders and locale fallback behavior. Read-only installed metadata also
confirms the raw name is a placeholder with a real display name in default-locale messages. No
live installation performed or profile state changed.

Future acceptance: localized/unlocalized/missing-locale manifests, install/update/cancel/failure,
real extension name before consent, wide/narrow layouts and no URL/icon overlap, selected profile
and all browser scopes, stable nav strip and no duplicate buttons after polling, correct installer
agent-access text, and BF-19 popup opening/dismissal from the new toolbar location.

### BF-2026-10-13-17 — Configurable agent access for extension-enabled browser profiles

**October 15 follow-up:** BF-2026-10-15-08 supersedes the extra profile opt-in below as desired
behavior: authorized tab creation/loading/reading/control across all profiles without an extension/
private veto. This follow-up is queued under the build hold, not completed by historical acceptance.

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Confirmed queued feature: the operator explicitly says agents must be enableable on
extension-enabled tabs. No current profile grants/settings changed or implementation/build authorized.

- Replace the blanket rule that any enabled extension makes its entire profile inaccessible to
  agents with an explicit profile preference allowing agent access to shared/run-owned tabs.
  Put it in Engine Room → Browser Preferences and show effective access/reason in tab controls.
  Preserve the user-private setting as a choice; an enabled extension alone must not override a
  deliberate saved allow choice. Agent access remains controllable per tab; the profile option
  is not an implicit grant to every unrelated tab, chat or browser profile.
- Keep normal page/visual control separate from BF-16 developer access and Live Browser sharing.
  Existing saved grants apply within their scope without repetitive prompts. Switching to private
  revokes active automation and observations; turning access on does not recover previously revoked
  tab grants or silently expose extension popups/backgrounds or password-manager vault interfaces.
  Settings must bind to profile/account identity and survive restart without restoring another
  account's permissions or copying device website authentication.
- Explain the actual boundary: shared page contents can reach the selected model, including data
  placed in ordinary fields by extensions. A package installation or agent-access toggle is not a
  guarantee of automatic masking for every autofilled field. Developer evaluation/network tools
  can expose more internals and therefore use the separately explicit developer scope. Preserve
  existing credential-broker restrictions; no automatic cookie/token/vault export is introduced.
- Update BF-04 instructions and capability inventory to distinguish unavailable profile, private
  tab, extension policy and missing tool/backend. Agents should reuse eligible signed-in tabs,
  not open duplicate profiles or ask for login merely because an inaccessible tab was filtered.

Read-only baseline: desktop/browser-extensions.cjs protected() returns true for installation or
any enabled extension; its comment cites possibly autofilled credentials. protectProfile revokes
sharing/run ownership and disconnects automation. desktop/browser.cjs rejects creating agent-owned
tabs or enabling sharing in such profiles, and excludes them from allowed() even if shared. This
is a Proteus policy, not an inherent Chromium/Playwright limit. Normal human-created tabs separately
start private and can use Agent access; the current extension-wide block prevents that override.

Future acceptance: allow/private preference with default/named profiles and ordinary/developer/
password-manager extensions, deliberate shared-tab access, unshared isolation, enable/disable/
install/update transitions, restart/account change and revocation mid-action. Verify developer
grant independence, no accidental extension-vault/Live Browser sharing and clear unavailable
reasons across internal/external tools. Use synthetic autofill data, never real credentials.

### BF-2026-10-13-16 — Playwright default, optional Chrome DevTools MCP and human DevTools

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Operator-selected direction added to the build list. Queue only under the existing
build hold; no package installation, application implementation/build or live verification yet.

- Use Playwright as the default browser-control backend, incorporating BF-15 visual input and
  image responses plus ordinary diagnostics. Integrate/reuse Playwright MCP packages/tooling for
  agent access through Proteus's owner service. Existing Playwright library use is not proof the
  standalone MCP server is already registered or compatible with the private embedded-tab bridge.
- Integrate chrome-devtools-mcp as optional on-demand Developer mode for agents: console/network
  inspection, DOM/CSS/evaluation, performance traces/insights and supported deeper diagnostics.
  Do not load its whole catalog/start a second controller for every normal chat. Advertise the
  available developer capability and load backend/tool groups when requested/selected, retaining
  visible loaded tools and actual availability in BF-04's orientation/details inventory.
- Add built-in Chromium/Electron DevTools for the human on the exact selected browser tab,
  including a Developer tools action/shortcut and right-click Inspect element. Target its live
  WebContents rather than the Proteus shell or another tab. Support the standard inspector,
  console/network panels and docking/detached presentation appropriate to the embedded view.
  Opening human DevTools does not itself grant agent developer access.
- One Proteus tool/service boundary owns stable tab/profile identities, permissions and operation
  ordering across the packages. Reuse the same signed-in embedded tabs; no silent standalone Chrome
  launch, duplicate profile, unrestricted global debugger port or unrelated-target enumeration.
  Namespace/deduplicate overlapping tools and coordinate observations/actions so controllers do
  not navigate or mutate the same tab independently. Normal page access and developer access
  are distinct, visible, revocable scopes using the existing approval configuration.
- Test Chrome DevTools MCP against the pinned Electron/private bridge: upstream officially supports
  Chrome/Chrome for Testing, not guaranteed Electron. Adapt connection/target handling as required
  within Proteus's boundary; report unsupported tools/backend honestly without making optional
  diagnostics a dependency of ordinary browsing. Pin compatible versions and preserve lifecycle
  cleanup; compatibility must be demonstrated rather than inferred from both using Chromium.
- Handle human DevTools attachment/detachment alongside Playwright, certificate observation and
  optional developer backend with shared ownership/coordinated handoff. Opening/closing the human
  inspector must not permanently break automation or attach to another owner's debugger. Revoke/
  cancel and clean up after tab close, grant removal, profile changes and application shutdown.
- Network/trace outputs and evaluated results need bounded presentation and protected storage,
  respecting existing private URL/credential/log policies. Review upstream usage-statistics/CrUX
  behavior before bundling; keep private diagnostic content out of external telemetry. Native/
  remote clients must label owner/backend capabilities rather than promise Chromium DevTools
  inside WKWebView. BF-17 reviews the current blanket extension-profile restriction separately.

Primary references: [Playwright MCP](https://github.com/microsoft/playwright-mcp),
[capabilities](https://playwright.dev/mcp/capabilities),
[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) and
[Electron webContents DevTools](https://www.electronjs.org/docs/latest/api/web-contents#contentsopendevtoolsoptions).
Read-only review found a private single-use, single-tab Playwright CDP bridge and debugger leases,
but no embedded-tab DevTools opening/Inspect action or agent developer package integration.

Future acceptance: default Playwright semantic/visual workflows and diagnostic results, explicit
on-demand developer backend/catalog activation and revocation, actual console/network/CSS/trace
tools, human Inspect/DevTools targeting and close/reopen/coexistence, same-tab/profile continuity,
no duplicate controller mutations or cross-tab access, failure recovery and provider/MCP result
parity. Reuse BF-15's privately linked, user-authorized Zoho test session for applicable reversible
checks; additional diagnostics use the configured developer scope. No live acceptance yet.

### BF-2026-10-13-15 — Extend existing Playwright tools with visual browser control

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Added to the build list at the operator's explicit request. Queue only under the existing
build hold; no implementation, application build or installation started. Use the installed
Playwright integration and current embedded tabs, not a separate browser-agent framework.

- Add tab-scoped screenshots delivered to the model as actual image content, with browser viewport/
  crop dimensions, coordinate space, device scale and capture identity. Image filenames or base64
  inside a text JSON result do not constitute a model-visible image. Preserve the existing text/
  accessibility snapshot path for ordinary pages and allow combined visual/text observations.
- Expose viewport coordinate mouse move/click (left/right/middle, double-click), down/up/drag,
  scrolling at the intended surface and keyboard/text input through the current Playwright broker.
  This supports remote desktops displayed in browser canvases/video, including Zoho Assist, and
  other canvas/WebGL/image-based controls absent from the accessibility tree. Final action schema
  is to be integrated with proteus_browser and the future BF-11 MCP surface, not invented in docs.
- Match screenshot pixels to viewport CSS coordinates correctly under Retina/DPR, zoom, crops,
  frame offsets, resized/scaled viewers and letterboxing. Prefer viewport captures for interaction;
  a full-page image must not silently be interpreted as viewport coordinates. Capture fresh state
  before actions and verify afterward; reject stale tab/navigation/viewport identities, out-of-bounds
  input, closed/unloaded views and revoked access. Ensure drag/button/key cleanup on cancellation.
- Reuse the same live WebContents, profile/session and private single-tab CDP bridge. Preserve
  shared/run-owned tab permissions, current revocation behavior and action serialization; moving
  a tab does not grant screenshot/control rights. Capture the requested browser surface rather
  than the Proteus shell or entire local desktop. No browser-wide debugger endpoint, arbitrary
  evaluation, cookie extraction or unrelated-tab enumeration is required by this feature.
- Update provider tool-result adapters to carry supported image responses end to end. Current
  browserTools stringifies results and the Codex dynamic-tool response emits inputText only; merely
  adding page.screenshot() cannot solve model visibility. Verify actual image result support for
  each provider/runtime and external MCP client; report unsupported image/model capabilities
  honestly, without assuming a model name guarantees vision. Keep screenshots/private session
  URLs ephemeral or in protected application data, never in repository fixtures/log payloads.
- Extend BF-04 required feature awareness and visible capability inventory with screenshot and
  coordinate tools: choose semantic locators where available, use visual control for pixel-only
  surfaces, observe → act → verify and distinguish missing DOM labels from missing authentication.
  Remote-desktop interaction remains within the user's task authorization; do not broaden the
  session's work or infer permission to execute remote operations merely from seeing its screen.

Read-only evidence: desktop/browser.cjs returns body.ariaSnapshot() truncated to 40,000 characters;
proteus_browser has no screenshot or coordinate parameters and click calls locator.click().
The private Playwright bridge already attaches to the same embedded tab. The remote-desktop
visibility gap is consistent with this text-only surface; the particular Zoho session's rendering
technology/contents have not been live inspected. No private session URL/key is saved in this plan.

Primary implementation references: [Playwright screenshots](https://playwright.dev/docs/screenshots),
[mouse API](https://playwright.dev/docs/api/class-mouse) and
[Playwright MCP vision mode](https://playwright.dev/mcp/vision-mode). Use these existing primitives
and vision-tool patterns within Proteus's service/adapter boundaries; installing the standalone
MCP server is not itself an implementation or proof of embedded-tab compatibility.

Future acceptance: isolated synthetic canvas/video/frame pages where ARIA lacks drawn content,
model-visible image responses and real visual target selection, click/double/right-click/drag/
wheel/keyboard input, image-to-CSS mapping at multiple scales/crops/resizes, stale captures and
revocation/cancellation cleanup. Verify provider/MCP transport parity and unchanged semantic tools.
Then exercise a user-authorized Zoho Assist viewer without persisting its session key or private
desktop contents in source, and distinguish successful screenshot capture from successful remote
input. Desktop runtime is the baseline; native/remote clients must identify the actual controlling
owner/backend rather than claim Playwright runs inside WKWebView. No live acceptance yet.

Live-test authorization: the operator explicitly authorized the Zoho Assist session linked earlier
in this chat for testing these added features. Carry that authorization forward when BF-15 is
implemented; reuse its existing Proteus tab/session where available rather than open duplicates.
Verify model-visible remote desktop pixels and reversible click/drag/scroll/keyboard actions,
then restore the prior viewer/desktop state. Keep the session link/key and any screenshots/receipts
private and outside source. If it has expired, report that limit and request a fresh session only
when needed. Authorization to use this test target does not lift the implementation/build hold.

### BF-2026-10-13-14 — Firefox-style browser downloads and configurable destinations

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Added to the queued future update under the existing build hold. No runtime
implementation, application build or installation started. Includes fixing ordinary download
handling as well as visible download management; existing right-click support is only a baseline.

- Add a browser-toolbar download indicator opening a compact Firefox-style panel. Show active
  download count/progress and recent downloads, file name, received/total bytes (indeterminate
  when unknown), state, source/profile/owner and download date/time. Completed dates reflect
  actual completion; started/cancelled/failed entries must not claim a successful download date.
  Keep completion/error feedback and records available after tab switches/closure and app restart;
  use a bounded/paged history view if needed rather than overflowing the popup.
- Each active download has Cancel, which stops that exact transfer and reports Cancelled rather
  than a generic failure or merely removing its row. Retain honest failed/interrupted states,
  clean up only that transfer's partial files and never erase an unrelated/pre-existing file.
  Restart must not claim a transfer is still live or silently redownload it. Pause/resume is
  optional future scope and must follow actual backend/server support if later offered.
- Ordinary user downloads default to the owning user's OS Downloads directory, resolved at
  runtime rather than a committed machine-specific path. Engine Room → Browser Preferences
  gets a Downloads section showing the active folder, Choose folder, reset to Downloads and
  Open downloads folder. Persist configuration per owning device; do not sync one Mac's absolute
  path to another or change the destination of an in-progress download. Missing/unwritable
  configured folders produce a useful folder-choice/error action rather than silently losing files.
- Provide Open downloads folder from the panel too. Completed records can reveal their actual
  saved location, including custom Save As destinations, even after the default setting changes.
  Mark missing files honestly. Opening a downloaded file, if offered, is an explicit user action;
  do not execute/open downloads automatically.
- Right-click a downloadable link and choose Save As… (retaining the existing Download Linked
  File As… action/wording if appropriate) for a native location/name picker, starting at the
  configured download folder. It overrides just that download. Cancellation starts no unwanted
  transfer and leaves the default unchanged. Save As for an already completed record, if exposed,
  means save a copy of its existing file, not a fabricated resume or silent fresh network request.
- Support ordinary attachment responses, download buttons/forms and browser-generated/blob
  downloads where the embedded runtime supports them, using the originating profile/session and
  original request semantics. Do not implement every download as a replayed unauthenticated GET.
  Handle suggested response filenames safely and avoid overwriting existing/concurrent downloads
  without explicit Save As replacement consent. Track live DownloadItem updates/done/cancel;
  consolidate ordinary and explicitly requested downloads through one host-owned lifecycle.
- Cover browser views in main/chat/workspace/Team scopes and named/default profiles. Keep active
  transfers independent of visual tab placement/hide so moving tabs does not restart them. Respect
  existing active-download retention and explicit Close/workspace-delete behavior; any cancellation
  from deletion is disclosed and reflected in the shared download state. Preserve private app-origin
  restrictions and existing download-request identity checks when allowing ordinary page requests.
- On web/remote views, distinguish owner-host files from client-local browser downloads and label
  which computer's folder would open; do not expose arbitrary host paths/file operations to pages.
  Review native iOS/iPadOS parity using WKDownload and Files/export pickers, including the native
  app on Mac. Current native flow uses a protected temporary file and export, not unrestricted
  access to a desktop user's Downloads folder; present actual supported platform behavior.

Read-only baseline: desktop/browser-actions.cjs has a download-grant map and Save As link action.
Its will-download handler prevents downloads without a matching explicit helper-view grant, so
ordinary page downloads are blocked by that path. It picks a filename but no configured Downloads
folder. desktop/browser.cjs tracks active items only to avoid retention unload; no general popup/
history/cancel/settings surface was found. Native SharedAppStore starts one linked-file WKDownload
at a time, exposes cancellation and hands a temporary file to export; it is not full download UI.

Primary references: [Firefox download management](https://support.mozilla.org/en-US/kb/where-find-and-manage-downloaded-files-firefox)
for the indicator/panel, cancellation and destination pattern, and
[Electron DownloadItem](https://www.electronjs.org/docs/latest/api/download-item) for save-path,
progress, completion and cancel APIs. Existing protections must be adapted deliberately, not removed
indiscriminately. Download state/history is independent of rotating diagnostic logs; SQLite app-state
migration remains shelved, not a prerequisite.

Future acceptance: ordinary click/form/authenticated/blob downloads and right-click Save As;
default/configured/custom locations and picker cancellation; duplicate names/concurrent transfers;
known/unknown size progress; per-item cancel/fail/finish date; missing folder/file and disk failures;
open folder/reveal after default change; profile isolation, tab move/hide/close and workspace delete;
restart state, responsive panel and truthful owner-host/web/native coverage. No live download
workflow was exercised during this queue-only review.

### BF-2026-10-13-13 — Delete workspace, close its tabs and preserve/rehome chats

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued feature only under the existing build hold. No workspace/data deletion, runtime
implementation, application build or installation is authorized by this intake.

- Add Delete workspace to workspace management/configuration on desktop, web and mobile, with
  a review dialog naming the exact owning computer/workspace and affected tabs/chats. Delete
  removes the workspace configuration/identity and its navigation representations, not its folders,
  source documents, provider sessions or conversation history. Distinguish it from closing/hiding
  the workspace tab, which currently preserves the workspace and its children.
- Close/remove all tabs belonging to the deleted workspace navigation tree, including hidden,
  unloaded or Persist browser tabs, terminals, viewers and chat-tab entries. Persist protects
  automatic unloading, not explicitly confirmed workspace deletion. Inventory direct children
  and owned descendants before applying this destructive cascade; do not sweep unrelated tabs
  in other workspaces/chats/main/Team or independently placed representations outside this tree.
  Use typed Close behavior and surface active browser/unsaved-work/terminal blockers before
  committing; viewer sources remain intact. Terminal detach/end/temporary-process consequences
  must be clear in the review. Do not report success with undisclosed leftover tab/resource records.
- Default chat disposition: every associated conversation becomes unhoused (no organizational
  workspace), still available in global Chats and discoverable with an Unhoused filter/label.
  Include archived and non-open chats; preserve their archive state, titles, IDs, messages, drafts,
  provider sessions, queued messages, attachments and retry receipts. Closing their workspace tab
  representations is not deleting, archiving or cancelling the underlying conversations.
- Alternative in the same dialog: Move all associated chats to a selected workspace, choosing an
  existing same-owner destination or creating a new named workspace. Move actual organizational
  membership and make the destination's chat navigation representations consistent with BF-06.
  No implicit cross-host transfer, duplicate conversations or target-default configuration changes.
  This option moves chats, not the non-chat tabs scheduled for deletion. BF-06 normally preserves
  children during a standalone Move; explicit Delete workspace instead closes the affected tab tree.
- Preserve effective per-chat run settings/approved resource boundaries as explicit surviving
  configuration where appropriate. Unhoused cannot mean silently inheriting the default workspace.
  Running turns retain captured context and are not interrupted; future continuations must not
  resolve a deleted workspace ID or recreate it. Review pending/queued turn and approval handling
  against BF-06. Remove workspace-specific future defaults/grants without silently broadening or
  resurrecting permissions; retain historical context as evidence rather than live membership.
- Deleting the default requires an explicit remaining/replacement default. Deleting the final
  workspace requires a defined empty-workspace/unhoused state and New Chat/configuration handling;
  current nonempty/default invariants cannot be bypassed accidentally. Surface dependent schedules
  and preserve their source-owned JSON/history; resolve execution dependencies explicitly rather
  than deleting or silently rewriting schedule files, changing activation or breaking later runs.
- Use the owner service boundary for UI and future BF-11 agent/MCP management. Validate latest
  workspace/destination revisions and affected-set snapshot, journal progress/retry receipts and
  preflight blockers before closing resources. Handle partial failures honestly and avoid duplicate
  bulk moves or resurrection by stale client caches; irreversible terminal close is not a rollback.
  Update workspace lists, recents, filters, tab strips and saved restoration state on observing
  clients. Preserve recovery evidence privately. A future delete request supplies its scope;
  this queue-only conversation does not authorize an actual deletion.

Read-only baseline: context.json requires at least one workspace and a valid default; current
Context.scope rejects unknown IDs, and beforeTurn follows captured workspace configuration.
No dedicated workspace delete operation/UI was found. Clearing parent IDs or removing only a
context profile would leave tab descriptors, membership/defaults and future continuations invalid.

Future acceptance: empty/populated/default/final workspace deletion; hidden/unloaded/Persist and
all-type descendant tab closure; both chat dispositions across open/closed/archived/running/queued
chats; existing/new same-owner destinations; stable conversations/settings/approvals; no project
file deletion or unrelated-tab sweep; cancel/blocker/revision conflict/partial failure/retry/restart;
dependent schedule resolution, unhoused global discovery and desktop/web/native/agent parity.

### BF-2026-10-13-12 — Workspace Tabs manager and associations for every tab type

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued feature and authorized design preview only. No runtime implementation, app build
or installation authorized. Extends BF-06/07/11 beyond browser-only placement controls.

- Add Tabs between Chats and Configuration on workspace overview. List all open direct workspace
  navigation tabs, including chats, browsers, terminals, document/Markdown/artifact/HTML/PDF
  viewers and other supported types. Hidden/unloaded tabs remain listed; closed historical chats
  are not open tabs. Do not silently flatten a chat's child navigation into the workspace list.
- Desktop row order: type icon (browser favicon/fallback), title, URL/location, opened date, last
  interaction date, actions. URL fills remaining width and ellipsizes; full safe values remain
  available through accessible disclosure/copy. Dates include time/locale/timezone; unknown legacy
  dates remain unknown. Moves/restoration preserve creation; reads/polls/hide/reorder do not refresh
  interaction. Use truthful non-browser resource locations or empty values, never fabricated URLs.
- Hide removes a nav entry without closing/unloading/ending its resource; Restore reveals the
  same tab at saved relative order. Tabs remains accessible with every child hidden. Define client-
  local versus owner-shared visibility explicitly; one client's Hide must not terminate another's
  resource. Hidden moved tabs stay discoverable with an explicit destination visibility policy.
- Reorder via drag and keyboard/touch up/down controls; apply the same order to navigation and
  retain hidden positions. List sorting must not overwrite nav order. Close preserves typed
  lifecycles: chat tab Close retains conversation; temporary terminal Close may end its shell;
  persistent terminal detach/end differ; viewer Close retains source files; browser Close retains
  active/unsaved-work handling. Hidden, unloaded, closed and browser Persist are separate states.
- Move to other workspaces/chats/top navigation/Team where supported, using BF-07 grouped recent
  destinations and BF-11 shared service operations. Chat membership moves follow BF-06, without
  nesting chats inside chats. Preserve actual tab identity, profile, history, drafts and grants;
  no implicit resource copy/recreation or execution-host migration.
- Provide association and management parity for browsers, terminals and viewers in this page,
  context menus, agent/service APIs and supported web/native views. Terminal moves retain live
  PTY/tmux session, output, processes, working directory/profile; never rerun startup commands or
  grant remote shell access as a placement side effect. Viewer moves preserve original host/source,
  exact version and read/approval boundaries independently of display parent; authorization-bound
  IDs cannot just be recomputed under a new parent. Explain type-specific unavailable operations
  rather than retaining a blanket browser-only policy. Copy needs separate semantics and must not
  clone a live terminal or document grants. Update BF-04/11 guidance and inventory capabilities.

Read-only baseline: workspacePage currently accepts chats/configuration only. Desktop session
hidden primarily handles workspace containers. public/app.js transferTabDialog explicitly rejects
non-browser types, retaining live terminal/host-bound document owners. Existing terminal/provider-
output/viewer lifecycle and document scope hashes must be separated from presentation placement.
No application behavior has changed in this intake.

Design context: [interactive source](design/2026-10-13/workspace-tabs.html) and
[standalone preview](design/2026-10-13/workspace-tabs-preview.html), synthetic sample data only.
Shows shell, Chats / Tabs / Configuration, requested column order, flexible ellipsized URL,
favicon examples/type icons, hidden-row restore, nav reorder, typed Close and grouped Move popup.
Interactions are local rehearsal, not Proteus operations. Narrow layout stacks metadata/actions
without dropping dates or controls. Preview verification is not live feature acceptance.

Preview-only verification: isolated Chromium exercised hide/restore, row/nav reorder, terminal
move to top navigation, viewer Close, terminal Close cancellation and saved move state after
reload, with no script errors. Desktop screenshot inspected; layouts at 736, 390 and 320 px have
no horizontal overflow and narrow action targets are 44 px. No live Proteus data/app was accessed.

Future acceptance: real all-type identity/icons/timestamps; long URLs and full-value disclosure;
desktop/narrow keyboard/touch controls; hide/restore/order restart retention; all-hidden recovery;
active-view fallback; moves to eligible destinations with conflict/retry protection. Verify
terminal PID/session/output continuity and no startup replay, viewer source/version/permissions,
chat configuration/approvals, meaningful timestamps, unsupported-client disclosure and desktop/
web/native/internal-external-agent parity. SQLite remains shelved, not a dependency.

### BF-2026-10-13-11 — Agent management of all Proteus tabs and chats

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued future update under the existing build hold. Project guidance may be added now;
service/tool implementation, builds and installation are not authorized. Review MCP as the external
interface, with the same host-owned operations exposed to internal provider adapters.

- Inventory all supported open/saved Proteus tab types: browser, chat, workspace, document,
  terminal and application/Team feature tabs. List all or filter by owning computer, chat,
  workspace, type, profile, title/URL and opened/touched date or age. Include unloaded tabs and
  disclose unavailable/offline/client-local scopes, supported actions and coverage gaps. Use
  paging, totals, stable ordering and snapshot/revision rather than silent truncation.
- Return stable host/tab ID, type/title/custom title, owning chat/workspace, placement/order,
  openedAt, lastTouchedAt, URL/favicon where applicable, loaded/persisted state, profile, chat
  lifecycle and action/access availability. Distinguish logical creation from restored views and
  first observed time. Unknown historical dates remain null, never invented. Reads/polls/restore
  must not refresh recency; define meaningful user/agent interaction separately. Non-browser tabs
  return an appropriate app destination or null URL/favicon, preserving existing privacy rules.
- Close and move tabs among application navigation, Team Tools and specific chats/workspaces.
  Discover valid destination IDs first; move the existing logical tab and its actual nav placement,
  preserving identity, profile, history and Persist preference rather than opening a copy. Reuse
  Send/Copy rules and BF-06 membership behavior. Review open/activate/reorder/rename and age/
  duplicate inventory/explicit cleanup as SafariSelector-inspired additions, with final schema TBD.
- Manage chat workspace membership and lifecycle: move between workspaces, close the navigation
  tab, archive and unarchive. Close is distinct from Archive/Delete/Cancel; retain conversation/
  session/history. Chat moves preserve effective per-chat options, captured active-turn context,
  approvals, drafts, child tabs and retry protections per BF-06, without interrupting active work.
- Internal and authenticated external agents use one service operation boundary. Management must
  support all tabs in the granted owner scope, not just browser tabs shared with the originating
  chat. Separate metadata/organization access from page-reading/browser automation and other-chat
  message access. Moving a tab does not grant those capabilities. Expose granted scope and missing
  actions; broad user-authorized management does not require a new prompt for every operation.
  Route remote operations to owners with stale-revision checks, durable retry receipts, per-item
  failures and verification. Do not expose raw app files or service-wide credentials to clients.

Read-only baseline: proteus_browser lists/controls shared or run-owned browser views, with close/
open and destination discovery. Destinations allow application/workspaces and the originating
chat, not arbitrary chats. src/document-mcp.cjs is a narrow turn-owned stdio bridge for documents/
integrations, not a general external app-management server. ContentTabs stores browser/document/
chat/terminal descriptors across main/Team/chat/workspace scopes; private feature/session tabs
need reconciliation too. Browser state includes lastTouchedAt/favicon but no uniform all-tab
openedAt schema exists. No all-tab management implementation was found in this review.

SafariSelector comparison: local mcp/README.md, server.js and TAB_REPORTS.md expose status/windows,
profile/group/title/URL/age listings, open/activate/move/close and duplicate cleanup. Retain its
complete inventory, truthful unknown ages, fresh identity checks and post-change verification
patterns. Its ages may be last-active or first-seen and IDs change after extension restarts;
Proteus should use durable identities and explicit timestamps, avoiding URL-only close when
meaningful copies exist. Do not import its Safari-specific backend or private report contents.

Agent guidance: AGENTS.md and .github/agents/proteus-tab-manager.agent.md describe inventory →
match identities → authorized action → verify, including current limits. Future BF-04 required
runtime orientation and visible tool inventory must describe this surface for every supported
provider; an optional project agent does not implement mandatory app-wide guidance. Add external
connection/setup documentation and tool descriptions/MCP guidance when implemented. Instructions
alone do not register tools or grant permissions. Keep protocol/client compatibility explicit:
the official [MCP July 2026 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
changes discovery, transports and authorization; test target clients rather than assuming the
existing bridge implements a general management server.

Future acceptance: internal/external clients agree on authorized identities/metadata; complete
paged inventories include all types/scopes/unloaded tabs; reads preserve recency; unknown dates
stay honest; stale/retried operations cannot affect the wrong tab. Moves update observing nav bars
without copying history/profiles or losing drafts. Verify Close versus Archive/Unarchive, active
turn safety, approvals, no new content grants, offline/partial failures, restart/retry and desktop/
web/native parity. SQLite migration remains shelved and is not a dependency of this feature.

### BF-2026-10-13-10 — Needs attention badge changes when switching views

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued fix only. No runtime implementation, build or installation authorized.

Operator evidence: screenshots of the same workspace show Needs attention at 103 while
Configuration is selected and 5 while Chats is selected. The operator also reports the change
when switching between Needs attention and Configuration. Navigation alone must not change
the badge's meaning or mark unresolved work as reviewed.

Read-only code finding: public/app.js render() uses attentionItems().length, which combines
attentionChats with state.data.attention notifications, connection/document requests and browser
attention. Its initChatsIndex onIndexChanged callback instead overwrites that same sidebar badge
with attentionChats(state.data.runs).length, omitting every non-chat item. Loading or polling a
chat list invokes that callback; a subsequent full render restores the combined total. These
two writers demonstrably use different formulas. This explains the type of view-dependent jump;
the exact private 103/5 item breakdown has not been inspected or live reproduced.

Future fix: use one authoritative combined attention calculation for full renders, index changes,
notification/permission updates and polling. Keep Chats/Notifications subtotals distinct from
the global badge, with consistent host/item identity and existing offline/archive/review rules.
Changing workspace subviews, list filters or pagination must not narrow the global count, reset
it to zero or acknowledge items. Allow legitimate count changes when underlying actionable state
changes; audit equivalent web/native badge paths without assuming the same defect exists there.

Future acceptance: fixed mixed chat/non-chat fixture shows identical badge before/during/after
Configuration, workspace Chats and Needs attention switching and async index/poll completion;
filters/pagination do not affect it; actual chat review, notification read and permission resolution
update it accurately; offline/reconnect and duplicate host/item handling preserve existing policy.

### BF-2026-10-13-08 — Persist browser tabs outside the normal loaded-tab allowance

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued for a future update. No runtime implementation, build or installation authorized.

- Add a checked Persist tab toggle to browser-tab actions, discoverable in existing desktop
  context menus and equivalent web/native tab controls where applicable. Cover standalone,
  chat/workspace and Team browser tabs; show whether persistence is enabled and let it be cleared.
- Persisted tabs stay loaded instead of being automatically unloaded for age, inactivity,
  navigation-container departure or the normal retained/loaded-tab allowance. Exclude them
  before calculating the regular retained set/quota, not merely from the final unload list.
  With N persisted tabs and a regular allowance of six, those tabs must not consume the six
  regular retention slots. Keep unrelated age/exemption rules; this does not impose a new hard
  six-tab cap on protected/recent work.
- Preserve the flag through saved session restoration and moves of the same browser tab.
  Restore/load persisted tabs when their profile is available, without restoring revoked agent
  grants or bypassing profile/account access checks. Define client/owner scope explicitly so
  history synchronization does not silently force unrelated clients to load extra web views.
  Copies remain independent tabs; copy persistence behavior should be explicit in the design.
- Explicit Close remains available. Ordinary Unload should not silently defeat Persist tab:
  disable it until persistence is cleared, or require an explicit documented manual override.
  Resource-panel unload and other lifecycle paths must follow the same policy. Closing a chat/
  workspace container must not accidentally close or unload persisted child pages under a rule
  meant only to retire inactive views; deliberate destructive/profile-revocation paths retain
  their existing ownership/privacy requirements.
- Continue counting persisted tabs in actual loaded-tab totals, process CPU/memory and resource
  attribution. Exemption is from the regular allowance, not a license to hide resource usage.
  Show the persisted count separately where explaining the allowance helps.
- Web clients controlling an owner-host browser apply the preference to that actual host view;
  a browser preview alone must not claim it keeps an owner view loaded. For native locally loaded
  WKWebViews, review application-managed unload/background/profile/view-restoration paths and
  platform lifecycle limits before claiming guarantees beyond Proteus's own unloading policy.

Read-only baseline: desktop/browser-retention.cjs retains the six newest tab records and retires
older loaded views after one hour of inactivity, excluding selected, agent-owned/shared, downloading
and audible tabs. The newest set is selected before filtering unload candidates, so merely adding
a persistence exclusion at the end would still consume the ordinary quota. Desktop native state/
saved workspace and native SharedAppStore have no user Persist tab preference. Manual resource/
context-menu unload and native container/lifecycle unload paths also need consistent handling.

Future acceptance: several persisted tabs plus the full regular allowance; retained-set ranking
excludes persisted entries; age/container changes do not retire them; flag clear restores normal
eligibility; explicit Close and manual Unload policy; restart/stable identity/move/copy behavior;
named/default/unavailable profile safety; real resource totals and allowance disclosure; main/chat/
workspace/Team scopes; owner-host web control and native lifecycle behavior where supported.

### BF-2026-10-13-07 — Group and order Send tab destinations

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued only under the current future-update hold. The operator's screenshot shows Send
tab's Destination dropdown mixing chats/workspaces in navigation-tab order. No runtime change,
build or installation is authorized.

- Organize the destination picker into explicitly labelled Workspaces and Chats sections,
  with Workspaces first and Chats second. Use visible, non-selectable section headers supported
  by the existing dropdown/popup, retaining keyboard and screen-reader group navigation.
- Order each section most recent first, independently of current navigation-tab placement.
  Align workspace ordering with the existing workspace recency list and chat ordering with
  existing recent-chat activity ordering. Use real recorded recency, stable fallback ordering
  for missing/tied values, and retain every eligible destination rather than the sidebar's
  seven-item shortcut limit. Do not reorder the actual navigation tabs to sort the picker.
- Keep Application tabs and Team Tools as distinct existing top-level destinations ahead of
  the grouped lists. Preserve helpful chat/workspace labels and owning-computer disambiguation,
  existing destination eligibility, current-parent exclusions and private/remote restrictions.
- Apply the grouping to Send tab and its shared Send a tab copy picker. Match equivalent
  chat/workspace destination controls on web/native where supported, using their existing
  popup/picker layouts and preserving each client's actual transfer capabilities.
- This is destination presentation/ordering, distinct from BF-2026-10-13-06's new Move chat
  membership operation. Retain existing move/copy ownership, agent-access, profile/history,
  unloaded-copy, cancellation and revision behavior; no transfer semantics redesign.

Read-only baseline: public/app.js transferTabDialog builds a flat destinations array from open
top-level run/remote-run/workspace tabs and emits options in state.tabs order. Workspace recency
already exists independently in public/desktop-workspaces.js; chat recent-activity metadata can
come from existing owner chat records. The current chooser has no Workspaces/Chats group headers.

Future acceptance: visible section headers, correct grouping/recent-first ordering, deterministic
missing/tied-recency fallback, all eligible destinations retained, duplicate names/host labels,
empty/single groups, keyboard/screen-reader selection, intact default Application/Team choices,
no unintended tab-strip reorder, and unchanged Send/Copy result/cancel behavior across supported
desktop/web/mobile destination pickers.

### BF-2026-10-13-06 — Move a chat to a chosen workspace

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued for a future update on desktop, web and mobile. No runtime implementation,
build, installation or deployment. Preserve existing layouts; no full redesign is requested.

- Add a Move button beside the chat's existing lifecycle actions, immediately to the left of
  Archive/Unarchive. Match Archive/Delete's established button style and size; use a clear Move
  label/icon/accessibility name. Native compact action layouts should retain the same action order.
- Move opens a popup (native sheet/popover as appropriate) listing destination workspaces.
  Show workspace names and owning computer when needed to distinguish identical names; mark
  the current workspace and offer Cancel. Eligible destinations are on the chat's existing owning
  host by default. Moving ownership/execution to another computer is not silently implied.
- Choosing a different workspace changes the chat's organizational membership and relocates
  its visible chat tab into that workspace's navigation bar. Open/reveal the target workspace,
  select the moved chat and remove its former placement. Reuse the existing conversation/tab
  representation when already present; do not clone a conversation or leave stale duplicate tabs.
  Workspace chat lists, filters/counts, global Chats and saved/restored navigation must agree.
- Preserve conversation/run/provider session IDs, messages, queued messages, drafts, attachments,
  history, archive state and retry protection. Keep chat-owned browser/document children attached
  to that chat with their state/grants intact; do not sweep unrelated old-workspace sibling tabs
  into the move. New chat-origin browser placement should follow organizational membership.
- Default to keeping the chat's effective run configuration unchanged: provider, model, effort,
  speed/context choices, next-turn options, main agent, starting/additional folders, selected
  instructions/skills/MCPs and applicable approval settings. Preserve these as explicit chat
  configuration/overrides rather than silently adopting the destination workspace's defaults.
  Existing per-chat editing remains available; explicitly following target defaults is a separate
  choice, not an automatic side effect of Move.
- Workspace association currently participates in context inheritance and approval identity.
  Review separating organizational membership from execution/configuration scope, or equivalent
  explicit override/revalidation behavior, before implementation. Do not simply rewrite the
  captured workspace ID, broaden trust to target folders/tools, invalidate pending approvals
  silently, or continue refreshing the moved chat from unintended destination defaults.
- Persist membership plus old/new tab placement through the owner using revision/conflict and
  retry protections. Remote desktop, web and native clients invoke the same owner-authoritative
  operation, update their navigation and reconcile later polling/restart without resurrecting
  the old placement. Cancellation/failed saves leave original membership and placement intact.
- Review safe handling during running/queued/awaiting-input states: an organizational move must
  not interrupt or duplicate a turn. Any required configuration cutover belongs between turns;
  unsupported states should explain why moving is unavailable rather than cancel work implicitly.

Read-only baseline: desktop/web/native already expose archive/delete actions and workspace chat
representations. Existing Send to workspace resolves the chat's current membership and opens or
focuses that workspace child; it does not choose a new workspace or reassign membership.
`engine.beforeTurn` in `src/server.js` refreshes contexts that follow their captured workspace,
and `src/permissions.js` includes workspace identity in approval context. These links make the
preserve-options requirement more than a tab-parent or workspace-ID-only change.

Future acceptance: desktop, web, iPhone and iPad action style/order and destination picker;
same-owner local/remote moves; current-workspace no-op/Cancel; missing/offline/deleted destinations;
duplicate representation handling; retained child state/drafts/attachments/session identity;
unchanged effective settings/approvals across subsequent turns and target-default edits; consistent
lists/nav/filter counts and reload/owner sync; concurrent revisions/retries/partial failure; no
accidental host transfer, schedule activation, turn interruption, trust expansion or lost data.

### BF-2026-10-13-05 — Redirect and URL-replacement history semantics

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

**Current platform-specific direction:** Desktop Electron retains the proposed non-modal,
five-second redirect-choice banner. iOS/iPadOS instead uses redirect/replacement-aware history
reconciliation: update the existing logical entry to the actual destination without creating
phantom Back stops. There is no five-second redirect banner on iOS. Preserve the original
requested destination as recoverable provenance/history details on both platforms, including
login redirects. The platform split supersedes the earlier identical-banner parity proposal.
Still queued only; no runtime implementation, build or rollout is authorized.

Requested desktop Electron behavior:

- On an eligible browser redirect, hold that redirect and show the destination plus a visible
  five-second countdown and Accept / Reject actions in trusted Proteus browser chrome.
- Accept follows the held redirect immediately; timeout automatically follows it once. Preserve
  the originally requested URL as recoverable history/provenance alongside the actual committed
  destination, rather than overwriting or discarding it. Whether intermediate hops appear as
  separate history-menu entries or as expandable provenance remains a presentation choice.
- Reject cancels the pending redirect and its timer, retaining the original destination. Keep
  the existing rendered page when possible; when no original document ever committed, show an
  honest blocked/pending navigation state rather than pretend its content exists.
- While waiting, Back/button/keyboard/two-finger navigation remains available. Going back to the
  preceding entry cancels the held redirect and countdown and dismisses the banner immediately.
  Reject/Back must not be undone by a late network event, timer or descriptor synchronization.
- Scope pending decisions to a tab, profile and navigation transaction. New navigation, tab
  close/unload, host shutdown or a superseding transaction invalidate old callbacks. Repeated
  redirect attempts after rejection must not re-arm the same timer indefinitely. Redirect-chain
  grouping, per-hop prompting and background-tab countdown behavior require explicit design review.
- This concerns top-level page redirects, not every image/iframe/resource redirect or deliberate
  link click. Determine actual HTTP redirects versus client redirects and same-document URL
  replacement; URL resemblance alone cannot classify intent. Do not hold every SPA state update
  indiscriminately. The ADO event trace is still needed to identify its mechanism.
- Retain the original path independently of redirect-control UI so an expired login/failed
  redirect cannot erase it. Rejecting a login redirect cannot provide server-protected content
  without authentication. Do not persist/share credential-bearing callback URLs or replay form
  submissions just to resume a cancelled redirect. A countdown never grants agent tool permission.

Feasibility findings (read-only):

- [Electron will-redirect](https://www.electronjs.org/docs/latest/api/web-contents#event-will-redirect)
  can prevent an HTTP redirect, but preventDefault cancels the whole navigation. A five-second
  wait cannot be implemented by awaiting that event handler and later undoing cancellation.
- [Chromium Fetch protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Fetch.pdl)
  supports paused requests/responses that remain held until continued or failed, including
  identifiable redirect responses. A narrowly scoped main-document response interception is a
  plausible pause/resume path, subject to an isolated prototype and compatibility checks with the
  existing debugger broker, browser automation, extensions and profile boundaries.
- Electron's did-navigate-in-page notification is not cancellable. replaceState/pushState and
  client navigations need separate interception/observation analysis; do not promise one universal
  hook or use a post-commit notification to claim the redirect was paused before it occurred.
- Preserve original request semantics through an actual continuation, including method/body for
  307/308 flows; do not substitute a fresh loadURL that might lose state or duplicate a submission.

Future acceptance now includes Accept, Reject, exact five-second timeout and Back during the
countdown; surviving original destinations through login/failed navigation; no delayed redirect
after rejection/Back; stable Forward history; multi-hop/repeated redirects; tab switching/closing/
unloading and host restart; scoped privacy/redaction; no false browser-load alerts for deliberate
cancellation; redirects during traversal and live/restored/shared/offline history consistency.
Prove the pause/continue mechanism with synthetic redirects before committing to implementation.

**iOS/iPadOS history reconciliation — current queued direction:** The operator explicitly
chose the previously discussed history rewrite approach for iOS only, replacing the native
redirect-banner proposal. Include iPhone, iPad and the native iPad app on Mac, which share the
WKWebView browser/store implementation. Electron desktops retain their banner proposal.

- Associate requested navigation and the committed/final destination with the same logical entry.
  Rewrite its active URL to the redirected destination while preserving stable entry identity and
  the original requested URL separately as recoverable provenance/history details. Do not erase
  a requested deep link when its final destination is a login screen.
- Treat a replacement as an update to its entry, not a new Back stop. Intentional pushState,
  query/filter changes, fragment navigation and same-address revisits remain valid new stops
  according to their actual navigation semantics; never strip query strings globally.
- When Back/Forward's destination redirects, reconcile that selected entry's final URL without
  appending another visit, moving the selected position forward or deleting the Forward branch.
  Use matching native entries when possible; reconcile restored/unloaded portable entries when
  native state is unavailable. Retain original requested destinations for inspection/retry.
- Buttons, history menus, keyboard navigation and native edge gestures must use consistent entry
  semantics across main, chat/workspace and Team browser scopes. Preserve profiles, privacy,
  pending operations, receipts and owner revision protection; native reconciliation must not
  destroy original-destination evidence shared with the desktop banner policy.
- No redirect interception/countdown/Accept/Reject prototype is required for the iOS direction.
  The earlier WKWebView interception analysis explains why the operator chose this split; it is
  not an outstanding requirement to reproduce the desktop pause mechanism on iOS.
- Current native code immediately allows eligible action policies and captures completed/same-
  document navigation into logical history. This change is planned, not implemented. Determine
  replacement/push/traversal and redirect evidence accurately rather than infer it from similar
  URLs; the exact ADO mechanism is still unverified.

Native acceptance: A → B → B?view=results has one traversable B entry at its final URL while
original B remains inspectable/recoverable. Back reaches A, Forward reaches canonical B, and a
login redirect retains the original deep link. Cover server/client redirects, replaceState versus
pushState, genuine query/filter changes, same-URL revisits, traversal redirects, Forward retention,
live/restored/unloaded tabs, owner sync/offline conflicts and native Back/gesture/menu parity.
Use synthetic iPhone/iPad rehearsals and live ADO checks when implementation is later authorized.

Historical feasibility reference: [WebKit's public navigation delegate](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKNavigationDelegate.h)
distinguishes asynchronous policy handlers from server-redirect notifications. It does not provide
the desktop Chromium Fetch interception mechanism. No native build or rollout is authorized.

Status: Queued under the current future-update hold. Operator reports Back/button and two-finger
navigation appearing to refresh the current Azure DevOps page after the site adds `view=results`.
No runtime change, build or rollout. The precise ADO mechanism (HTTP/client redirect, replaceState
or pushState) has not been captured or reproduced.

- Preserve meaningful query-string navigation, filters, fragments and intentional same-address
  revisits. Do not strip query parameters, compare only origin/path, ignore every redirect, or
  introduce an ADO-specific parameter exception.
- Browser-style semantics apply to the current iOS direction; desktop retains its banner: track navigation
  transactions and committed entry identity. HTTP redirect chains update one
  navigation destination; replaceState updates the current entry; pushState can add an entry.
  Back/Forward traverses existing entries and preserves Forward history, including when the
  selected destination redirects. Reload/title events must not append phantom visits.
- Review native Chromium traversal while its matching live entry exists, with transaction-aware
  reconciliation for portable/restored/unloaded stacks. Native traversal retains page state that
  replaying a URL with loadURL can lose. This is a proposal, not removal of portable history.
- Use one traversal policy for buttons, history menus, keyboard actions and gestures. Review
  browser-style skipping of certain non-user-interacted entries separately from recording them;
  UI skip heuristics do not mean deleting history or changing web History API semantics.
- Review recovery for existing duplicate records using evidence, not URL resemblance alone.
  Preserve IDs, profile/privacy boundaries, unknown metadata, pending operations, retry receipts
  and revision protection.

Read-only code findings: `desktop/browser.cjs` routes main-frame did-navigate-in-page events to
`commitNavigation` without distinguishing replacement, push or traversal. The helper generally
appends when the URL differs. Normal clicked redirects already have partial grouping through
`inflightEntryId`, but portable Back/Forward and menu traversal set `applyingShared` and replay
the selected URL through navigate/loadURL. The applyingShared helper updates a title only when
URLs match and ignores a changed final URL; subsequent events can append that mismatch as a
phantom visit. These are plausible source-supported causes, not live ADO confirmation. Gestures
and buttons reach the same controller commands, so entry semantics should be corrected together.

Primary references reviewed:

- [Chromium navigation concepts](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/navigation_concepts.md):
  server redirects precede document commit within one NavigationRequest; client redirects have
  separate replacement/classification rules.
- [Mozilla History API guide](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API):
  pushState adds an entry, replaceState updates it. URL differences alone do not establish either.
- [Chromium history intervention](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/history_manipulation_intervention.md)
  and [Firefox release notes](https://www.firefox.com/en-US/firefox/135.0/releasenotes/): Back/Forward
  UI skips certain entries created without user interaction; distinct from redirect-chain grouping.
- [Electron events](https://www.electronjs.org/docs/latest/api/web-contents): server redirects have
  explicit events; did-navigate-in-page reports same-document changes.

Browser-style acceptance applies to iOS with original-destination provenance retained;
desktop additionally uses the proposed banner:
A → B → HTTP redirect B?view=results and equivalent JS replaceState produce
one B stop; Back reaches A and Forward reaches canonical B. Intentional pushState/filter/query
navigation and same-URL revisits stay traversable. Cover redirects during traversal, delayed
rewrites, multi-hop/client redirects, title events, SPA popstate, live/restored/unloaded history,
owner sync/offline conflicts/receipts/privacy and button/menu/keyboard/gesture parity. Capture
a redacted ADO event trace before claiming live cause or verification. Review non-user history
insertion heuristics separately; browser engine metadata should guide any implementation.

### BF-2026-10-13-04 — Required, visible Proteus awareness for chat agents

**Current status:** Implemented in the authorized October 14 batch; final packaging and installation pending. See [release validation](2026-10-13-tab-management-release.md).

**Historical intake and acceptance scope:**

Status: Queued at the operator's request. Read-only baseline inspection and options review only;
no runtime implementation, build, installation or deployment. The prior desktop release approval
does not authorize building this item. No full interface redesign is requested.

- Every chat should understand Proteus's own features: chats and chat configuration; browser
  tabs, placement, sharing and control; workspaces and workspace configuration; approval
  configuration; logs and notifications. This should work in ordinary workspaces without adding
  the Proteus source checkout or relying on an agent to read it.
- The operator prefers a required app-awareness core that cannot be disabled through workspace
  source modes or Only selected sources. Keep workflow instructions/selections separate and
  retain their existing scope. Required awareness does not make every operation/tool mandatory
  or grant permission to access private tabs, other conversations or configuration changes.
- Keep the core visible: show its exact instruction text/version and the effective provider tool
  inventory in the existing chat context/details interface. Distinguish supplied instructions,
  registered callable tools, discoverable tools whose schemas are not loaded, unavailable or
  permission-blocked capabilities, and tools actually used. Do not label a manifest entry as a
  loaded tool or a captured source as confirmed provider delivery.
- Review a short always-supplied orientation and capability index, then on-demand feature
  instructions/tool definitions and bounded current-state reads. Avoid loading the full manual,
  repository, every tool schema, all logs, notifications or other chat contents into every turn.
  New/resumed chats should receive accurate provider/host capabilities and current ownership,
  selected workspace/chat context and approval summaries; active turns retain coherent snapshots.
- Consider scoped read tools for app features, the current chat/workspace configuration,
  effective approvals, log summaries/details and notifications. Review mutation tools separately;
  use existing approval, ownership, redaction and revision-conflict rules. Configuration reads
  must not reveal credentials. Awareness should explain how to perform an action in the UI when
  no agent tool exists, and identify unsupported provider operations honestly.
- Prefer extending Session & context / MCP connections / Activity with a required Proteus core
  entry and tool disclosure, rather than introducing a new configuration system or redesigned
  chat interface. Exact wording and schema/UI choices remain proposals for review.

Current verified baseline:

- `src/document-tools.js` defines `appInstructions`; Copilot, Codex and Claude adapters append
  this compact app guidance outside selected workspace instruction bodies. It explains document
  tabs, existing-browser reuse, integration evidence and authorization boundaries. Including the
  Proteus folder can add repository instructions/code awareness, but is not what supplies this core.
- Copilot registers browser/document and integration helpers where available; Codex exposes
  browser dynamic tools plus its app MCP bridge; Claude's app bridge currently supplies document
  and integration helpers. These adapters do not yet guarantee an identical feature/tool inventory.
  Selected agent scopes, provider support and runtime availability can further restrict tools.
- Current native helper families are `proteus_browser`, `proteus_open_document` and
  `proteus_integrations`. There is no comprehensive dedicated agent-facing Proteus management
  surface covering all of the requested feature areas in that registration path.
- Workspace/source loading and disabled sources are independent of app guidance. Current context
  UI lists captured workspace sources and provider configuration/MCP connections, but does not
  expose a complete resolved inventory of the mandatory app guidance and effective callable tools.
- Selected skill bodies currently load in full. True deferred bodies/schema discovery are future
  improvements, not a capability to claim as already implemented.

Future acceptance: a chat outside the Proteus checkout, with Only selected sources and no optional
sources enabled, can accurately describe the app and discover its supported actions; required
guidance remains visible; each provider reports its actual capabilities; lazy loading is observable;
reads are scoped/redacted; disabled optional sources stay disabled; permission changes cannot
silently broaden authority; resumed chats refresh appropriately; discovery/reading does not execute
mutations or certify completion. Further design review should choose the smallest useful first step
before authorizing implementation.

### BF-2026-10-13-03 — Browser tab activation flicker and order changes

Authorized for both Mac desktop apps. Implemented in 0.2.14: preserve remembered titles during
activation, reconcile unloaded native titles, retain unchanged main/Team strips, immutable
sync snapshots and a final order check after awaited native navigation. Existing custom titles,
profile menus, selected page/scroll and explicit drag/reorder stay effective. The synthetic
activation regression reproduced a saved-title → New tab → saved-title transition before the
fix; peer title and in-flight user reorder acceptance now pass. Both desktops are installed/live-verified on signed `dfad6e187477`; the waiting chat interruption
was explicitly authorized and its history retained. Per-target rollout and remaining
limits are recorded in [release ledger](2026-10-13-tab-stability.md).

## Future ideas — shelved, outside the active update batch

### BF-2026-10-13-09 — Review JSON versus SQLite for workspace/chat metadata and tab state

Status: Shelved in future ideas at the operator’s request. Excluded from the active fix/feature
batch. No migration, implementation or build authorized; the prior review is retained below.

Read-only baseline: workspace configuration is in context.json; shared tab descriptors/order
in content-tabs.json; private desktop restoration/selection/drafts in desktop-workspace.json;
chat metadata and captured configuration live with conversation events in runs/<id>.json.
The engine reads run files at startup and persists the whole run on durable event/configuration
changes. Streamed text deltas are transient and emitted without a disk write per delta. JSON
writes already use temporary-file replacement; the common atomicJSON helper also fsyncs the
temporary file. Individual-file atomic replacement does not make a multi-file move atomic.

Options and recommendation:

- Keep JSON throughout: simplest readable/manual recovery and least migration risk. Existing
  bounded tab/session files can remain reasonable; worker writes, coalescing and indexes could
  address measured bottlenecks. Related multi-file changes still need explicit recovery logic.
- Prefer a hybrid if migration is later authorized: keep human-editable workspace configuration,
  schedules and portable import/export as versioned JSON; consider worker-owned SQLite for
  mutable organizational chat metadata, workspace membership and tab identity/placement/order/
  recency/persistence state. Keep owner-shared records and each client's restoration/selection
  preferences distinct. A transaction can coordinate membership and placement when both are
  authoritative records in that same database, which would help BF-06 Move chat.
- Moving full chat transcripts/events and captured execution configuration into SQLite is a
  larger, separate option. It could support incremental event writes and paginated queries,
  but is not necessary merely to improve tab/metadata storage. A rebuildable metadata index
  over existing run JSON is a lower-risk intermediate option; it is not a second authority and
  cannot provide an atomic database-plus-run-file update.

Design requirements before selecting scope: define one authority for every field, separate
organizational membership from captured execution/approval context, preserve existing IDs,
unknown fields, revision/conflict checks, retry receipts and single-runner ownership. Retain
JSON exports and original recovery copies, explicit schema migrations and backup/restore
verification. Keep any application-state database separate from rotating logs: chat/tab state
must never inherit the 2,000-log-entry purge policy. Preserve existing credential and native
encrypted-cache protections; SQLite by itself supplies no equivalent encryption policy.
Use owner-host APIs for remote/web/mobile access, not a shared database file over a network.
SQLite persistence does not resolve renderer ordering races or synchronization policy by itself.

Before any implementation, measure startup/file parsing, durable write frequency/size and UI
latency with representative private data outside the checkout. No comparative timing benchmark
has been performed for this review, so no quantified speedup is claimed. Schedule JSON remains
the required interchange/source-owned format regardless of an app-state migration.

Primary references: SQLite's [appropriate uses](https://www.sqlite.org/whentouse.html),
[application file format](https://www.sqlite.org/appfileformat.html),
[atomic commits](https://www.sqlite.org/atomiccommit.html) and
[WAL behavior](https://www.sqlite.org/wal.html). Local embedded storage fits Proteus's owner-host
model; transactions and indexed partial queries are the main reasons to consider it here.

## New bug fix / feature intake — October 13, 2026 · approved implementation

The operator subsequently approved building item 01 with a separate log database, automatic
rotation and a 2,000-entry cap, and added item 02 below. The original hold below is historical
and superseded for these two items. See [release ledger](2026-10-13-logs-browser.md) for verification
and distinguish source/builds from installed/live behavior.

The operator started a fresh list and explicitly instructed: **do not build until told to do so**.
This batch is intake and read-only investigation only; do not implement, build, install or deploy
these requests based on historical release authorizations below.

### BF-2026-10-13-01 — Log summaries, expandable details and pagination

Status: Implemented in 0.2.13 and installed/live-verified on the primary desktop. 579 Node
tests/checks, both native log UI rehearsals and signed-package acceptance pass.
Details: [application logs](logs.md). The second desktop is installed/live-verified on 0.2.14;
production web/native rollout remains pending.
The findings and original proposal below record the intake baseline, not current storage.

- Each log item should have a compact header with its most important information: timestamp,
  severity, useful summary and relevant source/event or chat/schedule association when available.
- A Details expander should contain the full recorded message, stack traces and other logged
  diagnostic fields. Keep the initial list compact and fetch/render large details on demand.
- Paginate logs at the storage/API boundary as well as in the UI to avoid loading the whole
  history. Proposed starting point: newest first, 50 items per page, stable cursor ordering.
  Keep alert-banner View logs able to reveal its related entry outside the initial page.
- Apply equivalent behavior to desktop, web and native Logs views while respecting their
  existing layouts and the distinction between account events and owner-computer diagnostics.
- Read-only findings: `src/activity.js` stores general local activity in `activity.json` under
  the configured application-data directory. It keeps 2,000 log entries, rewrites the complete
  activity document synchronously on save, and returns the latest 200 by default (maximum 1,000)
  without a cursor. `safeLog()` redacts credentials and truncates messages to 1,000 characters;
  records retain ID/time/level/event/message and optional host ID, with no structured stack/details.
  The account service receives selected generic event metadata, not full diagnostic messages.
  Omi/transcription worker stream logs are separate files in their owning pipeline workspace.
- SQLite is a suitable proposed local storage direction, not an approved migration. Proteus
  already uses separate worker-owned SQLite stores for remote command receipts and browser
  history. Prefer a dedicated activity/log database and reuse those implementation patterns;
  keep log retention independent of execution retry receipts. Index time/severity/event/source,
  retain full redacted diagnostic details separately from summaries, and move I/O off the main
  thread. Preserve the original JSON and existing notifications/preferences/outbox during any
  future migration. Previously truncated or unrecorded details cannot be reconstructed.
- Eventual acceptance: long multiline errors and nested causes remain complete after restart;
  bounded list/detail loading; stable paging while new events arrive; related-entry navigation;
  remote/client parity; credential redaction; migration recovery and responsive scrolling.

### BF-2026-10-13-02 — Clicked browser links abort and return to the prior page

Operator report: web browsing is broken; clicking links produces error popups and does not reach
the intended destination. Reproduced on the existing app with a public page: navigation returned
to its starting address and recorded an aborted load. Page clicks did not claim their new logical
entry before background history synchronization could apply the old address.

Implemented: claim ordinary page navigations before polling can acknowledge the old entry;
protect active loads from stale mirror application; commit actual destinations/redirects and
retain private-URL safeguards. Real Chromium rehearsal passes slow links, hash links, redirects
and new-tab targets without load-error popups. Shared workspace/history regressions also pass.
Final signed-package and both-desktop live public-link acceptance pass. Production web/native
rollout remains pending; installed evidence and restore limits are in the release ledger.

**Internet Search popup follow-up (October 13):** Corrected the inherited 140px textarea cap so the input fills the enlarged popup. Three window-size UI checks, long-text scrolling and Cancel pass against the signed build `68095bceb17e`, now installed on the primary computer. HC exact transfer is fully staged/hash/signature verified; direct destination resume confirmation is the sole remaining installation hold.

**Team Tools flashing follow-up (October 13):** Implemented mounted-browser preservation for unrelated background state and shared-title refreshes. The regression reproduces the old placeholder flashes and passes with unchanged page/scroll/address draft and zero native hide/show calls. Signed-package and local installation acceptance pass; HC staging is in progress with its live permission wait preserved; see [release ledger](2026-10-12-unified-browser.md). HC old-build observation is retained before replacement.

**October 12 unified browser release — installed acceptance in progress:** The approved design and queued fixes are implemented. Corrected local desktop `88eb46f0db39` is installed and restored-chat UI verified, including the duplicate restored-browser-view startup correction and Team Tools browser preservation. Web release `20261013T063152Z` is live with recovery and parity checks. Physical iPad/iPhone 2610.12.4 are installed and launched; computer-native launch and live owner-history controls are verified. The user resumed HC installation after investigating Team Tools browser flashing on its current build; capture the old behavior before upgrading and repeat acceptance afterward. Preserve all data and retry protections. The corrected signed desktop/source pair is retained privately; do not install superseded `d2eacd78cf87`. See the [release ledger](2026-10-12-unified-browser.md) for tests and per-target limits. This supersedes historical design holds below.

**Historical October 12 direction — superseded by approval above:** Further fixes/features, builds and deployments
are held until browser synchronization design is decided. The
[then-proposed design and nine issue groups](browser-sync-design.md) record current findings,
ownership, replication and acceptance requirements. Website-account connection was subsequently
confirmed by the operator; successful shared history was not verified. Earlier authorizations
and completed-release notes below do not override the hold.

**Browser history clarification:** The operator agrees to desktop-local history rather than
website/API database storage, covering Default plus every other non-private profile. The proposal
now explicitly includes mobile-to-owner history uploads and distinguishes shared per-tab
Back/Forward lists from the chronological visit log. Profile metadata stays account-backed;
website sessions remain device-local. The subsequent approval at the top of this document now authorizes implementation and rollout.

## October 12 additional chat interface intake — implemented, acceptance in progress

These requests were approved with unified browser synchronization. The historical findings below
explain the changes; current verification and deployment are in the release ledger.

### Chat tab — Copy chat link

- Add **Copy chat link** to desktop/web chat-tab context menus and the native tap-and-hold
  menu alongside Rename. Apply to chat tabs in main navigation and workspace navigation.
- Copy a navigable Proteus chat link, not a filesystem path or provider-session folder.
  It identifies the same chat and owning computer regardless of which navigation contains it.
- Reuse the existing chat-link routing where appropriate; verify destination resolution on
  desktop, web and mobile, including unavailable hosts and existing open chats. A link does
  not grant access or contain credentials. Exact URI format requires implementation inspection.

### Agent-created browser tabs — workspace default and explicit destinations

Status: Implemented; live Chromium workspace/default/explicit-application placement acceptance passed. Installed rollout remains in the release ledger.

- Operator report: asking an agent in a workspace chat to open browser tabs places them in
  the application's top navigation instead of that workspace's navigation.
- Confirmed code gap: `src/browser-tools.js` exposes no destination/scope argument on
  `proteus_browser`. `desktop/browser.cjs` routes agent `open` to `create(url, runId)`;
  creation defaults parentId to the run ID rather than resolving workspace membership.
  This establishes missing workspace-aware routing, not a complete live reproduction of
  the reported top-navigation fallback.
- Default placement must be resolved by Proteus from the initiating chat's saved workspace
  association: a workspace chat opens browser tabs in that workspace. A standalone chat
  retains chat-local placement. Do not use whichever page/window happens to be focused or
  require the agent to remember a routing instruction. A chat visible in multiple places
  must have deterministic default routing based on its association.
- Add discoverable agent support for explicit destinations: application navigation, a
  workspace's navigation, or a chat's navigation. Expose current context, stable destination
  identities and allowed destinations in tool metadata/results so natural-language requests
  can be carried out reliably. Return the actual destination after successful creation.
- Reconcile explicit chat destinations inside workspace navigation with the existing nesting
  model before implementation; never silently reinterpret an unsupported requested target.
- Preserve host ownership, profile isolation and agent-access rules. Display placement is
  separate from which run may control a tab. Invalid/unavailable destinations must produce
  an actionable result rather than silently falling back to top-level navigation.
- Preserve existing tab reuse and originating-scope link/popup routing. Apply the same logical
  placement to desktop/web/native representations and persist it across reconnect/restart.
- Eventual acceptance: workspace chat open with and without its workspace currently visible,
  standalone chat, explicit application/workspace/chat destinations, simultaneous runs in
  different workspaces, a chat shown both top-level and in its workspace, remote-host views,
  unavailable targets, permission isolation, retry behavior and restored tab placement.

Additional October 12 evidence (private run record inspected; no transcript/runtime identifiers
copied into this repository): the run has a saved workspace association and contains four
browser opens, three navigations and eight snapshot calls. The four final research-page titles
match the operator's unexpected top-level tabs. Open results carry the run ID as parent rather
than the workspace navigation identity. Snapshots read live accessibility text; they do not
substitute saved screenshots for navigation. This strengthens the existing placement defect,
not a separate request to prevent normal research browsing.

`public/app.js` browser reconciliation matches parent IDs to UI tab IDs, while workspace chat
tabs have compound IDs. When a parent cannot be resolved, a browser can enter top-level navigation;
when an owner is found it can create a standalone chat parent. Verify both active-run and
released-run paths and avoid duplicate top-level representations of workspace-owned tabs.
Existing unrelated user tabs must remain intact. Workspace tab synchronization and chat-list
indexing are separate paths; one succeeding does not establish correctness of the other.

### Remote workspace chat list empty despite synchronized workspace tabs

Status: Identity projection corrected; encrypted relay tests passed. Operator screenshots show the same workspace's tabs on both
computers, but its chat list has two entries on its owner and no entries on the viewing computer.
The chats were initiated from different clients; initiation device must not affect membership.

Confirmed code defect: `src/remote.js` run summaries include `workspaceId`, but the
`src/desktop-peers.js` `index()` projection retains `workspaceName` and drops `workspaceId`.
`public/chats-index.js` filters a workspace view by workspace ID plus owning host, so projected
peer rows cannot match. This explains the screenshot discrepancy; no live HC patch/test performed.

Preserve workspace identity end-to-end in peer indexes and caches, refresh existing cached rows,
and audit adjacent classification fields (including chat type/trigger) without relying on names
as identifiers. Verify desktop/web/native list parity for chats created on a computer or mobile
viewer, duplicate workspace names across hosts, all chat categories, reconnect/cache refresh,
and existing synchronized tabs. Do not create duplicate chats to repair list visibility.

### Chat details — Run files & folders

- Keep runtime, usage and agent authorization/approval controls in the quick-glance Run details.
- Add a distinct **Run files & folders** box immediately below the authorization portion of
  Run details, using existing styling. Make it collapsible to keep infrequently used paths
  out of the quick-glance view; preserve all applicable Copy path and Open actions.
- Within that box, order: **Proteus run record**, **Provider session folder**, **Starting folder**,
  then **Additional workspace folders**. Move the first two out of Session files & context.
- Retain all other session/context information and actions. Avoid duplicating the same active
  run paths; keep genuinely different saved-context paths clearly identified when needed.
- Desktop and web must show the same fields, order, labels and supported actions. Native should
  use an equivalent disclosure section in chat details, adapting layout to available space and
  distinguishing remote-computer paths from files on the viewing device.
- Eventual acceptance: copy/reopen the same chat from main/workspace tab menus across clients;
  check native long-press discoverability; verify field ordering and no loss of context/export,
  authorization, path-copy or supported open functionality. Desktop/web fixture checks passed; native acceptance is in progress.

**October 12 web deployment automation authorized:** Production web is verified on
`0.2.12-20261012T210124Z` with 9,213 manifest files, eight served assets and 14 endpoint checks.
The operator requested a more efficient restricted SSH update route. Its server dispatcher and
local resumable client passed security review and offline tests. The operator approved the exact
restricted grant, which is installed; its live read-only audit passes all 14 checks. The next real
release will verify the complete deployment workflow through SSH.
Keep deployment scripts, private routing and recovery receipts in the deployment workspace.
See [web update procedure](web-updates.md) and [release ledger](2026-10-12-state-assembly.md).

**October 12 remote-state and queued fixes authorized:** Reduce repeated remote-state/context work,
retain retry protections and current data, implement BF-2026-10-12-01–04, verify and update both
desktops through the established destination chat. Native tab icons and browser history/gesture
follow-up were added during implementation. See [current ledger](2026-10-12-state-assembly.md).
Historical holds below do not block this authorized work.

**October 12 scheduler follow-up authorized:** Move periodic scheduler I/O/computation off the main thread, preserve execution/retry protection, add bounded private stall timings, test and update both desktops through the established workflow. Implemented and verified with 502 tests, static checks and signed-package acceptance. Both desktops are installed/live-verified on build `b1dd22a19b42`, preserving retry receipts and current data. HC active-work timing exposed remaining synchronous remote-state assembly (~121 ms average slow phase, up to 381 ms event-loop delay); further responsiveness work remains, without claiming the periodic hang solved. The separate feature intake remains held. See [scheduler ledger](2026-10-12-scheduler-performance.md).

**October 12 deployment workflow documented:** The verified destination-Codex-chat update process is now required by `AGENTS.md` and detailed in [desktop-updates.md](desktop-updates.md). Documentation only; no additional build or deployment.

**October 12 performance correction installed and verified:** Both desktop computers run signed 0.2.12 `ec8b213d382e+dirty.ef08cda12e87`. Worker-owned incremental SQLite receipts retain retry protections and original JSON; normalized tab sync suppresses redundant mutations. History persistence and process polling no longer block the main loop. All 482 Node tests, static checks, desktop/web integration and signed-package migration/restart acceptance pass. Both restored interfaces/relays and saved data passed checks; each idle sample recorded zero journal writes. See [performance ledger](2026-10-12-remote-performance.md) for evidence and recovery boundaries. The separate activity-card design hold is unchanged.

**October 12 missing-folder correction:** Implemented nonblocking missing supplemental folder capture and persisted chat warnings, preserving saved configuration. Local and remote creation verified: 442 Node tests/check, desktop rehearsal with visible warning and signed-package smoke pass. Primary desktop installed/connected on bbf0630ac8a7 with 65,480 data files preserved. Second computer installed and verified on the same build with current mappings, two workspaces, 56 tabs and five pairings retained; web/mobile use the corrected owner-host route. See [missing-folder ledger](2026-10-12-missing-folders.md).

**October 12 native browser follow-up:** Operator reports a website briefly loads then returns to **Browsing home** in Proteus iPad on the computer. Empty shared-tab descriptors can overwrite the native page URL during polling. The merge correction is implemented: 440 Node tests/static checks and 80 native tests plus focused browser UI on each simulator pass. Native build 2610.12.2 is installed on the primary computer; launch and chat browsing verified after macOS approval; live-host synchronization acceptance remains limited by a host-confirmation timeout. See the [native browser ledger](2026-10-12-native-browser-sync.md).

**October 12 interface polish implemented and desktop/web deployed:** Folder paths use available width; inner vertical borders are removed; workspace-local sources are **Workspace sources**; configured computer names and running-chat-only counts are consistent; workspace/main Add-tab menus match. Both computers are installed and live-verified on `f03d25e4cdc1`; production web is deployed with recovery/restore and endpoint/asset verification. Native parity passed both simulators; installed-app status and limits are recorded in the [interface polish ledger](2026-10-12-interface-polish.md). Older rollout notes below are historical.

**October 12 rollout status:** Personal and Work Macs are installed/verified on corrected 0.2.12
`b0a14294e2c1`; HC coordinated through its existing Codex chat. Physical iPad and iPhone are
installed and launch-verified on 0.2.12 / 2610.11.1, with all seven protected files and saved
destinations retained on each device. Production web remains
built/tested only. [Current release ledger](2026-10-11-workspaces-release.md) records evidence.

**October 12 rollout authorized:** Operator unlocked iPad/iPhone and made Work Mac ready; use the
existing Codex chat to coordinate HC upgrade. Include current folder/filter/navigation corrections.

**October 12 folder-section correction:** Restored visible disclosure arrows, folder icons,
distinct headers and contained controls/items to the approved expandable folder-sections design.
Desktop/web verified; installed and visibly checked on Build Mac.

**October 12 presentation follow-up:** Implemented in source: spaced dot before folder scan counts,
and source-type buttons above the full-width master filter on desktop/web. Desktop workspace UI
regression and syntax checks passed. Signed package and Build Mac installation verified.

**0.2.12 installed and verified on this Mac (October 12):** The approved Workspaces/backlog
batch is implemented. Proteus iPad was updated first, then desktop Proteus; both are launch-verified.
Node 435, Laravel 80 and native 76 tests per simulator passed, along with UI and signed-package
checks. Physical devices and production web remain unchanged. See the
[current release ledger](2026-10-11-workspaces-release.md) for evidence and limits. Historical
queued/held statements below describe earlier planning and are superseded for this batch.

**October 11 full batch authorized:** The operator approved implementation and tests for the entire
BF-2026-10-10-01–17 backlog, with Workspaces superseding Projects. Preserve existing styling/features.
Add fully configured local workspace Copy and consistent Starting folder labels. Test this Mac,
web and mobile simulators; update Proteus iPad on this Mac first. Physical iPad/iPhone updates
wait for the next instruction. [Current release ledger](2026-10-11-workspaces-release.md) supersedes
historical design/build holds below; distinguish implementation, verification and installation.

**Additional October 10 follow-up:** Mobile .5 is installed and launch-verified on both physical devices, with focused phone/tablet regressions passed. It moves render preparation to 2.5 screens, network cache fill to six screens and doubles later row batches while retaining small initial rendering. Desktop/web chat paging is unchanged. Desktop browser load-error banners are replaced in verified source with 15-second actionable notifications and sanitized retained Logs. The actual Electron fixture verifies deduplication, clearing on navigation and exclusion of subframe failures; Build Mac installation is verified; HC staged the same build but retains one awaiting-input chat and three queued runs on installed 0.2.9. Installation evidence is in the follow-up ledger. The recurring Build Mac “Command limit reached” report is not explained by the inspected live receipt log (771 entries, zero pending; recent cold backups 749). Current source lacks that exact old wording; no matching failed API or system-event record was found. Error origin remains unconfirmed; do not claim removing a receipt cap fixes this recurrence.

**October 10 history follow-up:** Implemented small initial rendering windows with meaningful activity batches, proactive cache headroom, complete progressively reachable history, native bottom-inset restoration, lazy collapsed activity details, taller shared New chat and stacked dark runtime/token values. Verified on Build Mac, web and physical iPhone/iPad build .4; HC retains its pending-run hold. UI/package/install evidence: [follow-up ledger](2026-10-10-mobile-history.md).

# Implementation status and backlog

## October 12 release intake — implementation authorized

The operator explicitly authorized implementing and closing this queue with the remote-state
performance correction. BF01–04 are implemented and their regression acceptance is complete.
Both desktops and production web are deployed; native 2610.12.3 is installed on the primary
computer with launch/restored-view acceptance verified. Foreground browser navigation and HC connection pass; shared history awaits website-account
sign-in. Both physical devices are installed/launch/preservation-verified on .3; physical gesture
acceptance remains with the operator.
This collection queue is closed; remaining device rollout and manual gesture checks stay in the
release ledger. The intake reports and proposed acceptance text below are historical.
This supersedes the original collection-only hold. Preserve existing platform styling, data and
retry protections. See [current ledger](2026-10-12-state-assembly.md) for verified status.

### BF-2026-10-12-01 — Shared activity, approval and system-message presentation

Status: Implemented and verified in desktop/web/native fixtures; desktop/web deployed, native
computer build installed and launch/restored-view verified. Message-detail and
relationship parity within each platform's existing design; no full visual redesign.
Operator screenshot reviewed, proposed comparison prepared. Preview-only browser
checks passed: both panels, contained system boxes/tool references, original-request expansion
and no horizontal overflow at 736px/320px; wide dark preview visually inspected. No application changes.

Reported: Desktop presents coherent boxed tool/automatic-approval entries, tool-call references,
attached Original approval request disclosures, completion dates/times and individual durations.
The native iPad client presents approval text and original-request disclosures with weaker visual
connection to their tool. Its individual activity timing is unclear; missing timing capture is
the operator's suspicion, not a verified data/persistence defect. iPhone parity is in scope.

Requested shared design:

- Scope clarification: preserve each platform's existing visual design, particularly iPhone's
  different native layout. This is message-detail and relationship parity, not a full visual
  redesign or a requirement for identical cards, spacing, typography or application chrome.
- Apply desktop's coherent tool/approval relationships on iPad/iPhone using their current native
  components: clearly contained entries, visible tool-call reference when recorded, and Original
  approval request nested in its related approval entry.
- Show completion date/time and elapsed duration for each tool activity, separate from total
  group duration and model-turn runtime. Use recorded values; absent timing remains unavailable.
- Adopt native's contiguous grouping on desktop too: tools, approvals and system messages between
  user/model communication form one Activity block in chronological order. A user or model message
  ends the group. Preserve system messages as distinct darker boxes inside the group.
- Retain expansion of group, tool details and original requests. Do not flatten system styling
  into ordinary tool rows or leave approvals/disclosures visually detached.

The requested side-by-side preview shows **proposed desktop and proposed iPad**, using the same
synthetic events and explicitly illustrative timestamps/durations, without workplace content.
Its matched styling illustrates hierarchy only; it is not a literal iPhone design proposal or
authorization to replace native styling. Preview discussion/acceptance does not lift the
implementation hold.

Acceptance when authorized: desktop, native iPad and iPhone render the same event sequence and
relationships; individual completion timestamps/durations agree with recorded host events; system
boxes remain inside the group; groups stop at user/model messages; approval expansion exposes the
correct original request and recorded tool-call reference. Check running/completed/failed tools,
older records without IDs/timing, narrow layouts, expansion persistence and reading position.
An approval decision must never imply the command completed successfully. Runtime cause and timing
availability remain unverified at intake; the comparison verifies design intent only.

### BF-2026-10-12-02 — Remote desktop Working indicator parity

Status: Implemented and UI-verified; owner-driven Working indicator and stale/disconnected clearing pass. Installed on both desktops.

Reported: Local desktop chats show a spinner and **Working... you can queue a message or steer
this turn.** between the activity area and composer. Remote desktop chats omit this message even
though they appear aware the owning chat is still running. The screenshot establishes the local
reference; remote state availability and the cause of the omission remain unverified.

Requested: show the same Working indicator, placement and queue/steer guidance in remote desktop
chats, driven by the owning host's current turn state. Preserve existing presentation and command
capabilities. Only advertise actions actually available for that turn/provider; the status must
not imply that a workflow has completed or that the viewing desktop is executing it.

Acceptance when authorized: viewing an active chat on another desktop shows the matching local
Working indicator, including gaps between tool events and model output. It follows owner state
through updates, reopening and navigation; completion, failure, stop and waiting-for-input use
their appropriate states. Disconnection/stale state must not masquerade as confirmed live work.
Queue/steer actions retain their existing behavior and availability. Investigation and runtime
verification are deferred until implementation authorization.

### BF-2026-10-12-03 — Insert new Proteus browser tab beside its source

Status: Implemented and verified on the exact signed desktop bundle and native fixtures; source-relative insertion preserves container and profile.

Reported: **Open in new Proteus tab** appends the new browser tab to the end of navigation.
Requested: insert it immediately to the right of the tab from which the action was initiated,
in the same owning navigation container. Resolve placement against the initiating tab, not
whichever tab becomes active while the action is pending. Preserve existing profile/session,
destination URL and selection behavior; this item changes insertion position only.

Acceptance when authorized: initiate the action from a first, middle and final tab; the new
browser tab appears directly after that source, preserving the relative order of all other tabs.
Check main and chat/workspace navigation where the action is offered, including switching active
tabs while creation is pending. Existing tab ownership/container routing remains intact.

### BF-2026-10-12-04 — Alert banner View logs action does nothing

Status: Implemented. View logs closes covering dialogs without clearing their fields, refreshes an already-open Logs page and focuses a correlated event. Actual browser-load alert regression passes, including missing-event fallback. No other current View logs action exists in the source.

Reported: Clicking **View logs** on a Proteus alert banner does nothing: neither the related log
item nor the Logs page opens. Exact alert type and affected client coverage remain unspecified;
do not assume this is restricted to browser-load alerts.

Requested: make View logs open the appropriate Logs page and reveal the related log entry when
the alert has a recorded association. If the exact entry is unavailable, still open Logs rather
than silently doing nothing. Preserve the relevant host/destination context for remote alerts.

Acceptance when authorized: activate View logs from an actual Proteus alert; Logs becomes visible
and the associated item is revealed where available. Check navigation from browser/chat views,
an already-open Logs page, remote host context where supported, and missing/expired log entries.
Cause and routing/correlation availability remain unverified; investigation is deferred under
the implementation hold.

## Apple signing preflight — October 11, 2026

The validated .5 iPad artifact is also installed as a native Designed for iPad client on the
operator's Mac, alongside desktop Proteus. The operator authorized macOS first launch and confirmed
the visible app; both processes were independently verified. Mac profile expires October 18 at
16:38 MDT with the existing certificate. No runtime implementation or broader workflow acceptance.

Implemented instruction update: verify Mac unlock before account/signing checks and recheck the
existing setup after unlock. Locked-screen “No Accounts” results must not trigger fresh account
setup, certificate replacement, signing reset or app uninstall. The Mac is now independently
observed unlocked with an existing Xcode Apple account before provisioning renewal.
Renewal/install are now verified: the unchanged native .5 release was re-signed with the existing
Omi certificate, installed in place and launch-verified on iPhone and subsequently iPad. Seven
protected files per device and destination retention passed. Proteus profiles expire October 18:
iPhone at 00:47 MDT, iPad at 16:24 MDT. No certificate replacement/revocation, Omi change or
runtime change. See `apple-build.md`.
This maintenance task does not authorize the held October 10 feature batch.

## October 10 issue / feature plan — implemented in 0.2.12 source

**October 11 authorization supersedes the original hold.** BF01–13 and BF15–17 are implemented;
BF14 is superseded by Workspaces. The intake notes below retain the reported symptoms and original
acceptance criteria. See the release ledger for verified tests and installation status.

### BF-2026-10-10-01 — Ghostery Browser Preferences opens Resources

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.

Selecting **Browser Preferences** in the browser's Ghostery shield menu reportedly opens
**Resources** instead. Expected: open Engine Room directly to Browser Preferences.
Source lead: `public/browser-toolbar.js` dispatches `proteus-browser-preferences`;
`public/app.js` sets `state.engineSection='preferences'` and calls `navigate('engine')`.
Investigate whether navigation resets the section; this is a lead, not a reproduced diagnosis.

Acceptance: the menu opens Browser Preferences from main, chat-child and Team browser tabs,
including when Resources or a different Engine Room section was previously selected. Refresh
does not redirect it back to Resources. Preserve the browser tab and its profile/session.

### BF-2026-10-10-02 — Update Ghostery filters appears to do nothing

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
missing progress/completion feedback remains unconfirmed.

Selecting **Update Ghostery filters** reportedly has no visible effect. The toolbar awaits
`filters-update` without explicit success/progress feedback; `desktop/browser.cjs` calls the
blocker's update and returns status. Investigate the installed command path, network/cache
errors and visible feedback before concluding filters were not updated.

Acceptance: both the shield menu and Browser Preferences show updating, successful completion
with last-update time, and actionable failure feedback. Verify downloaded filters are active,
repeated requests coalesce, and a failed update preserves the previous usable filter cache.
Record affected-install validation separately from synthetic tests.

### BF-2026-10-10-03 — Install browser extensions from Chrome Web Store

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
Queued under the new hold. The operator wants an install button without manually downloading,
extracting or choosing extension folders.

Proposed flow: **Install from Chrome Web Store** in Browser Preferences opens the store in the
selected Proteus browser profile; choosing an extension and reviewing its permissions lets
Proteus download, unpack and install it. Include managed updates so later versions also avoid
manual folder handling. Keep unpacked installation as an advanced option.

Current source uses `electron-chrome-extensions` and per-profile unpacked installs. The related
[electron-chrome-web-store integration](https://github.com/samuelmaddock/electron-browser-shell/blob/master/packages/electron-chrome-web-store/README.md)
documents store installation, permission hooks, per-session storage and automatic updates.
This provides a plausible integration path, not proof of Proteus compatibility.
[Electron's extension documentation](https://www.electronjs.org/docs/latest/api/extensions)
limits native support to unpacked extensions and a subset of Chrome APIs; store installation
and correct extension operation must be verified separately. No universal compatibility claim.

Acceptance: install a supported store extension directly into the selected profile without file
handling; show permissions, progress, success and actionable unsupported-extension errors.
Preserve identity, settings, enabled state and profile isolation across updates and restart;
support disable/remove and failed-update recovery. Integrate with the existing extension registry
and retain private-from-agent/Live Browser protection before an extension can access pages.
Verify Bitwarden's actual login, popup and autofill independently of successful installation;
native messaging/passkeys remain separate compatibility checks. Recheck upstream behavior,
packaging and dependency license compatibility when implementation is authorized.

### BF-2026-10-10-04 — New tabs from menus and links retain the source navigation area

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
build, installation or deployment; affected installed behavior has not been reproduced here.

The tab-menu **Open in new tab** action must create the new tab in the same navigation area
as the source: a browser tab inside a chat opens another tab inside that same chat; a tab in
the top application navigation opens another top-level tab. Apply the same rule to Team and
other supported tab containers. Resolve ownership from the source tab/menu context, including
its chat parent, rather than whichever navigation area happens to be active when creation finishes.

Operator clarification: the same ownership rule applies to links that open new tabs while browsing,
including **Open Link in New Tab**, modifier/middle-click links, `target="_blank"` and supported
site `window.open` requests. Browsing inside a chat must keep every such new tab in that exact
chat. Top-level and Team sources retain their own navigation area. Explicit external-browser
actions continue to follow the user's chosen destination.

Source leads: `desktop/browser-actions.cjs` creates context-menu link tabs with profile/group
but omits `parentId`. The `setWindowOpenHandler` in `desktop/browser.cjs` already passes the
source `parentId`; inspect the complete registration/selection path and all entry points rather
than assuming every link path is broken. Installed reproduction remains unverified.

Acceptance: invoke the action from chat A, chat B, top application navigation and Team where
available; each new tab stays in its exact source container, with the intended URL and browser
profile/session preserved. Switching navigation while a menu or tab creation is pending must
not redirect the new tab to another container. Reveal/select the new tab in its owning strip
without resetting unrelated navigation, and retain placement after refresh/restart. Verify every
client that exposes this menu. Coordinate with the earlier chat-owned browser routing contract
in BF-2026-10-07-08 and new-tab visibility in BF-2026-10-09-14; prior releases do not establish
acceptance of this newly reported menu behavior.

Extend acceptance to each link-opening mechanism above, from each supported container/client,
including user-owned chat browser tabs with no agent owner. Preserve the source browser profile
and exact chat parent through creation, selection, refresh and restart.

### BF-2026-10-10-05 — Restore smooth browser scrolling

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
correction under the new hold. No runtime changes or performance traces collected in this intake.
The operator asks whether Proteus interferes with scrolling or schedules work on the wrong threads.
Cause, regression point and affected site/device remain unconfirmed.

Source lead: `desktop/browser-preload.cjs` installs a window-level wheel listener with
`capture:true, passive:false` for navigation swipes and pinch overview. It can cancel events;
horizontal gesture detection reads computed styles and scroll geometry, and gesture drawing
mutates the page DOM. Ordinary vertical events generally return early, but the listener itself
is blocking. [Chrome's scrolling guidance](https://developer.chrome.com/blog/scrolling-intervention-2/)
explains why blocking wheel listeners can delay scroll response. This is a plausible contributor,
not proof of the reported regression or incorrect thread use.

When authorized, profile input latency, renderer long tasks, frame pacing and compositor/GPU
activity on affected pages and the installed build. Compare gesture handling enabled/disabled
in an isolated diagnostic session; separately compare Ghostery cosmetic filtering, extensions,
active Live Browser capture and application refresh/state traffic. Check visible-page throttling
and main-process work as well as renderer work. Do not assume unrelated AI execution causes it
or move DOM work to workers without evidence.

Acceptance: sustained vertical and horizontal scrolling, trackpad momentum, nested scroll areas
and mouse-wheel input remain smooth during normal browsing and representative active chat/AI
use. Verify with long static and dynamic pages, main/chat/Team tabs, protection on/off and supported
extensions, plus Live Browser viewing where applicable. Keep back/forward/close/reopen and pinch
gestures working without swallowing ordinary scrolling. Use repeatable before/after frame/input
measurements on the same device/page, and record actual trackpad acceptance separately from
synthetic automation. Preserve native browser scrolling without a custom smooth-scroll substitute.

### BF-2026-10-10-06 — Chat message box is not docked at the bottom

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
build, installation or deployment. Layout cause and affected-client coverage remain unconfirmed.

The screenshot shows the website client labeled v0.2.11 with the composer floating above a large
unused gap at the bottom of the chat panel while Run details extends farther down. The message
box and its model/action controls should dock to the bottom of the available conversation area
with only intentional layout padding. The transcript should use the remaining space above it.
Do not retain the screenshot or its conversation content in this repository; this intake records
only the visible layout symptom.

When authorized, inspect the shared desktop/remote/web chat container sizing, flex/grid row
allocation, overflow and composer anchoring. Check whether the details sidebar height affects the
conversation column or the composer is participating in transcript flow. These are investigation
questions, not a confirmed diagnosis. Coordinate with existing upward editor growth and the 60%
chat-area cap so the editor grows upward while its bottom remains anchored.

Acceptance: dock the composer at the chat panel bottom for short and long conversations, empty
and multiline drafts, attachments, idle/running/queued states and both open/closed Run details.
Verify website, local desktop and remote desktop at tall/short and wide/narrow window sizes,
including resize, browser zoom and sidebar expansion. Scrolling/history loading must not move
the composer away from the bottom or hide the newest content behind it; preserve reading position,
draft/caret and working controls. Confirm matching behavior on native clients without claiming
the screenshot establishes a native defect. Record visual acceptance separately from build success.

### BF-2026-10-10-07 — Enlarge Internet Search dialog and message box

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
No implementation, build, installation or deployment.

Make the **Internet Search** dialog 30% wider and 40% taller than its current baseline at the
same viewport and zoom: target width = baseline × 1.30, target height = baseline × 1.40.
Allocate the added usable space to the search message box. Keep the heading, workspace selector,
attachment control, provider search buttons and Cancel at their existing sizes; do not achieve
the larger dialog by scaling fonts/controls or adding blank padding. The message box uses the
increased inner width and receives the added vertical space.

Acceptance: measure before/after at a desktop viewport with enough room for the requested
increase; verify the message box gains the additional space. Cap the dialog to available viewport
space on smaller screens, maintaining safe margins and accessible controls without clipping or
horizontal overflow. Preserve draft/caret, attachments, workspace selection, provider actions,
keyboard submission and Cancel; verify desktop local/remote and website versions that expose
this dialog. Record responsive visual verification separately from build success.

### BF-2026-10-10-08 — Moving a browser tab to an Internet Search chat raises repeated main-process exceptions

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
stability issue queued under the new hold. No runtime changes, build, installation or deployment.
The trigger sequence and post-error transfer state have not been reproduced here.

Reported action: **Send tab → destination Internet Search chat → Move tab** repeatedly opens
Electron's **A JavaScript error occurred in the main process** dialog. Both screenshots show
`TypeError: Cannot read properties of undefined (reading 'id')` inside `Array.find`:

- First trace: `desktop/browser.cjs:82:506`, called from `82:475` — `onBeforeRequest`.
- Second trace: `desktop/browser.cjs:78:260`, called from `78:229` — `onHeadersReceived`.

Source inspection, including the installed bundle's first reported line, confirms both request
handlers use `tab.view?.webContents.id` when finding a tab by request `webContentsId`. This
guards an absent view but not an absent `webContents` on a present view. Both traces match this
shared unsafe lookup; why the referenced object is unavailable during the reported operation
remains unconfirmed. One invalid tab entry can affect requests for other tabs because the lookup
scans the registry. Inspect lifecycle transitions, closed/destroyed views, unloaded copies and
in-flight requests alongside transfer routing. Do not assume the Internet Search destination is
the only affected destination or that correcting one handler resolves the whole issue.

Acceptance: move a loaded browser tab into an Internet Search chat repeatedly without uncaught
exceptions, repeated native error dialogs or partially applied transfer state. Retain the current
page, browser profile/session, history and exact destination parent, and revoke old agent access.
Verify moves among ordinary chats, search chats, top-level navigation and Team, with page requests
in flight and a mixture of loaded, unloaded and recently closed tabs. Audit both request handlers
and similar view lookups for missing/destroyed contents. Every request callback must complete
once with the intended access/blocking policy; preserve Ghostery protection and the app-origin
access gate. Confirm the rest of browsing stays usable after a rejected transfer and that placement
survives restart. Record affected-install reproduction separately from synthetic lifecycle tests.
Retain only sanitized exception details here, not screenshot conversation content or local paths.

### BF-2026-10-10-09 — Single-line link-hover status popup with ellipsis

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
new hold. No implementation, build, installation or deployment.

The browser link-hover status popup currently wraps a long address into several lines and covers
page content. Limit it to one line. Allow long addresses to use the full available browser-view
width within the existing edge margins, then truncate the overflowing end with `…`. Short URLs
can retain a compact popup; do not wrap long paths/query strings or enlarge the popup vertically.

Source lead: `hoverStatus` in `desktop/browser-preload.cjs` currently sets
`overflow-wrap:anywhere;white-space:normal` on the popup text. Plan single-line overflow/ellipsis
styling with a correctly bounded host/text width. Keep the actual link destination unchanged;
ellipsis affects presentation only. Do not save the screenshot's full URL/query string here.

Acceptance: short and extremely long URLs render in exactly one line at wide and narrow browser
sizes; long URLs expand to available width and visibly end with an ellipsis. Keep the destination's
beginning/host visible, the popup within the browser view, and its bottom placement/readability.
Hover changes update promptly and leaving a link or navigating clears it. Preserve pointer-event
pass-through, normal link clicks, scrolling and main/chat/Team browser contexts. Verify resize and
zoom without multi-line growth, overflow or a lingering stale address.

### BF-2026-10-10-10 — Claude Input tokens excludes cached input

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
provider documentation and a read-only usage-only check of the affected saved run. Queued under
the new hold; no implementation, build, installation or deployment. Actual usage values, session
identifiers, model observations and screenshot conversation content remain outside this repository.

`src/claude.js` accumulates only `m.usage.input_tokens` into `run.usage.inputTokens`, alongside
output tokens, and drops `cache_read_input_tokens` and `cache_creation_input_tokens` from that
normalized record. `public/chat-details.js` labels this incomplete figure **Input tokens**.
[Anthropic's prompt-caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
defines total input as uncached input + cache-read input + cache-creation input; `input_tokens`
alone is only the portion after the last cache breakpoint. This explains why the displayed input
can look much too low in a tool-heavy cached conversation.

Affected-record evidence: normalized input/output match the screenshot, while retained per-model
metadata has nonzero cached-input fields. The normalized and per-model output totals also differ;
their aggregation windows/scope must be reconciled before treating per-model metadata as a
replacement chat total. Do not blindly add both summaries or count streamed/assistant/result
usage twice. The omission is confirmed; an exact corrected historical total is not yet established.

Acceptance: **Input tokens** reports complete observed input including cache reads and writes,
with a retained breakdown for uncached input, cache reads and cache creation. Define the same
chat-total semantics across continuations, tool calls, model switches, error results and restart;
verify the runtime's result aggregation scope and apply each result once. Keep output counts
accurate and consistent across desktop/remote/web/native clients. Missing provider data stays
unavailable rather than becoming a fabricated zero; do not estimate allowance or cost from these
totals. Verify synthetic fixtures with nonzero cache fields, continuation and duplicate events.
For existing chats, recover only from sufficient authoritative records with reconciled scope;
otherwise identify incomplete historical counts rather than inventing a backfill. Retain the
current hold while planning this normalization/display correction.

### BF-2026-10-10-11 — Desktop chat history rapidly shifts up/down while typing

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
hold. No implementation, build, installation or deployment. Affected build, follow/reading position
and idle/streaming conditions remain unconfirmed; no live reproduction or measurements yet.

Typing into the desktop chat message box makes the history viewport scroll up and down slightly
and rapidly. The transcript must remain visually steady while editing a draft. Composer growth
may adjust available transcript space, but must not cause repeated position oscillation.

Source leads: `public/chat-composer.js` schedules resize on every input, temporarily sets textarea
height to zero, measures `scrollHeight`, then restores the calculated height. Its ResizeObserver
watches the pane/footer. `public/conversation.js` separately observes transcript/scroller resize
and writes `scrollTop` to follow the bottom or restore a saved position. Inspect interactions among
these observers, intermediate layout/caret scrolling, browser scroll anchoring and background chat
refresh. These are plausible leads, not a confirmed cause. Coordinate with BF-06 bottom docking;
this typing-triggered jitter is distinct from BF-05 embedded-browser scrolling.

Acceptance: sustained typing, deletion, paste, line wrapping, IME composition and editing at the
60% composer cap do not make history bounce. At the latest message, retain stable bottom following
as the composer grows/shrinks; while reading older content, retain the same visible message/offset
and do not pull the reader to the bottom. Check short/long and tool-heavy chats, idle/completed and
streaming turns, Run details open/closed, attachments and window resize. Preserve draft/caret,
keyboard behavior and smooth manual history scrolling. Verify local desktop and shared
remote/web composer regressions; record repeatable viewport-position evidence and actual visual
acceptance separately from passing automation. Do not address this by disabling legitimate
stream following, editor growth or older-history loading.

### BF-2026-10-10-12 — Organize all source artifact types by folders with a master filter

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
explicitly reaffirmed **do not build yet**. Folders and items must remain alphabetical, with
the master filter searching every artifact section. Preview authored and browser-rehearsed
with synthetic sources; production implementation/build/install/deployment remain held.

The selected [Folder sections design](design/2026-10-10/artifact-folders.html) keeps a single list
with collapsible alphabetical source-folder groups and Favorites above them. **Folder sidebar**
is retained only as an unselected review alternative. Folder sections organize
the displayed catalog by existing configured source roots; they do not move files or modify
underlying loading rules. Custom folders/physical reorganization are not adopted by this preview.
Use synthetic neutral folder names and paths only; no actual personal/professional sources copied.

Approved planned behavior: folders sort A–Z; items sort by name inside each folder, with canonical
path as a stable duplicate-name tie-breaker. The master filter searches names, paths, folder names
and artifact types across every folder and all four types. Typing a filter selects **All** and
temporarily exposes every matching group regardless of its prior collapsed/folder state. Type
tabs show matching counts and can then refine the query. Clearing the query restores folder
scope/collapse preferences. Favorites appear once per results view and retain source-path identity;
source mode changes in this preview are local simulations only. Row density and path display
are review controls, not approved production requirements.

Browser rehearsal verifies global filtering across types/folders, matches in collapsed groups,
type refinement, folder scope, duplicate-name visibility, empty results and narrow viewport fit.
The prototype includes a working design switcher and sample loading/favorite controls.
Production acceptance remains deferred: refresh/restart must preserve folder-view choices and
existing favorites/modes without changing source IDs, availability, selection or permission
semantics. Apply Folder sections consistently across Instructions, Skills, Agents and MCPs and
appropriate context pickers. Design selection does not lift the production implementation or
build hold; wait for explicit authorization before catalog/persistence or application changes.

### BF-2026-10-10-13 — Address-bar history filtering and search-engine suggestions

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
No implementation, build, installation or deployment. Search-choice presentation remains to design.

On a new browser tab, filter the recent-history suggestions as the user types in the address bar,
matching site titles and URLs case-insensitively. Empty input retains the recent list. Adding spaces
to form a multiword query signals search intent: show **Search with…** engine options, or an
equivalent compact chooser, with the default engine clearly identified. Pressing Enter without
explicitly choosing another suggestion searches using the configured default search engine.
An alternate-engine choice applies to that search, without silently changing the saved default.
Use the same default wherever the browser address bar submits a search; expose/persist its
selection if the current configuration does not already provide it. This is browser web search,
distinct from starting a provider-driven Internet Search chat.

Source leads: `public/browser-recents.js` loads and caps recent visits, then its input listener
only clears selection rather than filtering/repainting. `public/browser-home.js` already classifies
multiword input as search and supports Google/DuckDuckGo/Bing targets, defaulting to Google in
the helper. Existing helpers do not establish that the operator has a configurable saved default.
Reconcile all address submission paths when implementing; do not filter only the already capped
visible suggestion list and thereby hide older matching authorized history.

Acceptance: incremental typing, deletion and paste update title/URL matches promptly; filtering
occurs before the displayed-result cap, with existing URL deduplication and visit ordering retained.
History finishing a delayed load uses the latest typed text, without stealing focus or resetting
the draft. Multiword queries show engine choices and Enter uses the saved default rather than
silently selecting a history match. Intentional keyboard/click selection may open a matching site
or use another engine. Preserve valid URL navigation, query encoding, IME composition, arrow-key
selection, Escape/dismissal, accessibility and no-match handling. Retain the active browser profile
and source main/chat/Team container, coordinating with BF-04. Verify desktop and corresponding
remote/web/native address bars where they offer recent history; keep history within existing
authorized device/account visibility. Search chooser design and default persistence are queued,
not implemented behavior.

### BF-2026-10-10-14 — Projects: persistent chats, browser tabs and inherited setup

**Superseded October 11 by BF-17:** Workspaces becomes the single concept. The separate Projects
section and workspace-preset distinction below are historical proposals, not current scope.

Status: Operator requested a design session and full UI preview, revisiting the formerly deferred
Projects concept. Documentation and an isolated interactive preview only; design is proposed,
not approved for production implementation/build/install/deployment.
Operator subsequently asked to hold Projects here and continue that concept separately.

The [Projects design proposal](projects-design.md) builds on existing Workspaces. Today a workspace
is reusable folder/context configuration, not a container owning multiple chats and tabs. Projects
add that ownership and navigation while reusing context inventory/capture/permissions. Starting
from a workspace copies configuration references into project-owned setup; later edits do not
silently affect the preset or other projects. Existing standalone Workspaces remain available.

Proposed UI: Projects in left navigation; one top-level tab per open project; a project-specific
chat list and one child strip of chats/browser tabs. Links and new tabs inherit the enclosing
project. Project setup includes folders, alphabetical source sections with a global filter,
primary/available agents, skills, instructions, MCPs, allowed features and chat defaults. New chats
inherit setup without repeating selection. Agent-assisted folder/configuration changes target the
current project, validate revisions/permissions, and show a change receipt with Undo.

Persist project content through switching, closing its top tab and restarting. Synchronize authorized
chat membership/history, browser URL/title/order and logical setup references across desktop/web/mobile;
retain device-specific website sessions, local path bindings, credentials and provider execution
ownership. Explicitly handle offline hosts, missing source mappings, pending edits and revision
conflicts. Cross-device draft merging is deferred. Browser move/copy destinations include projects
and main navigation with existing rollback/ownership rules; copying a descriptor does not clone a
live page/session or grant every project agent browser control. Chat transfer UI remains deferred.

The [interactive review](design/2026-10-10/projects.html) uses synthetic data and local simulated
actions. It explores desktop/phone navigation, settings, inherited chats, contextual tabs, transfers,
folder addition and sync-readiness presentation. It does not establish working project persistence,
provider configuration or account synchronization. See the proposal for acceptance and deferred scope.
Coordinate implementation, once authorized, with BF-04/08 navigation/transfer errors, BF-06/11
composer position, BF-12 source organization and BF-13 address-bar filtering. Historical deferral in
BF-2026-10-07-13 now has this design proposal; the implementation hold remains active.

### BF-2026-10-10-15 — Trust an entire folder for one chat

Status: Implemented in 0.2.12 source, including proactive chat-only grants and revocation.
The original investigation below explains the reported scope gap; release evidence is in the ledger.

Original gap: `src/permissions.js` offered **Always allow reads / reads and writes in [folder]**
for eligible pending structured file requests. `remember(..., 'trust-folder')` saves the grant to
the shared workspace permission profile. It is not chat-only. `public/chat-details.js` and
`public/app.js` list authorized folders but do not provide a proactive per-chat folder grant editor.
The chat-only Auto-approve option changes approval mode within existing resource grants; it does
not add a folder authorization. Thus the existing controls do not satisfy the requested scope.

Planned behavior: add **Trust folder for this chat** in chat details and at an eligible pending
file request. Allow selecting the whole folder, recursively including its current/future contents,
with explicit read-only or read/write access. Show the exact folder, access level and **This chat
and its future continuations** scope before saving; persist through restart on the execution host.
Do not alter workspace grants, other chats, schedules, or any future Project setup. Provide an
editable/revocable chat-folder list, distinct from inherited workspace grants; expose the same
scope through desktop, web/remote and mobile chat controls without treating viewer paths as host
paths. Recheck a matching pending request immediately after authorization.

Acceptance: a selected folder and descendants are covered without repeated file-by-file prompts;
siblings and other chats are unaffected. Read-only grants never authorize writes. Resolve canonical
paths/symlink escapes and non-existing target ancestors consistently with current permission checks.
Bind writes to chat/context revisions and execution-host identity; define visible revalidation when
provider/context changes instead of silently promoting a grant to workspace scope. Revocation affects
future decisions and preserves unrelated grants. Distinguish explicit Ask-each-time suspension from
a saved folder allowance. A folder grant is not blanket command/MCP approval and must integrate with
the provider's actual folder-access/sandbox configuration; do not claim access if native restrictions
still prevent it. Reproduction on the affected installed UI and provider-specific execution tests
remain deferred until implementation is authorized.

### BF-2026-10-10-16 — Reconcile chat folders, source discovery and misleading scan limits

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
Installed and checkout `src/context.js` match. No live configuration/catalog or application changes.
Private filesystem measurements and temporary catalogs remain outside the repository.

Operator follow-up: accepted configurable exclusions, independent root limits and the other
discovery recommendations, then immediately said **wait to build**. Keep this queued; no source
implementation or build was started. The proposed **Use in this chat** feature was declined.

The command-starting-folder selector is populated from the selected workspace's cwd/additional
directories, plus explicit chat-only additions in New Chat. It does not enumerate discovered
subdirectories or library folders. Sources across workspaces supplies discovery roots; discovered
instructions/skills/agents/MCPs are separately selected by loading mode. Selecting a source may
add its owning root to the captured chat workspace without changing cwd. Folder inclusion, source
loading and operation trust are three distinct controls; adding a source root does not preload
every file or grant blanket approval. Coordinate clearer scope labels with BF-15 folder trust.

Confirmed discovery defect: `ContextStore.refresh()` declares one `scanned` counter for all roots,
increments before canonical-path containment/visited deduplication, then throws after 60,000 walk
attempts. Catching that error per root leaves the counter exhausted, so every later root immediately
gets the same misleading error. The warning is not proof that the named root contains 60,000
folders. Directory order can starve later configured sources. MCP configuration discovery is a
separate fixed-path pass and continues, explaining partial root catalogs with MCPs but no agents.
An isolated actual-scanner run of the reported later source completed without errors; its small
directory tree is not the cause. Earlier roots contain large dependency/generated/backup trees.

Current exclusions cover `.git`, `node_modules`, common Python environments, `dist` and `build`,
but miss `vendor`, `.cache`, `.build` and several other generated/cache directories. Current scanning
does not consult ignore files. Read-only pruning comparisons showed a large traversal reduction;
do not universally exclude names such as `artifacts` or `legacy` without per-root control and
explicit inclusion overrides, because they may contain intentional sources. Do not delete files.

Scan cadence: host startup, explicit catalog Refresh, normal context configuration saves (including
individual source-mode changes), refreshing an existing chat's context, and the remote-desktop New
Chat host-selection path. Favorite-only updates avoid a scan. Ordinary cached catalog reads/local
New Chat opening, messages and typing do not trigger full discovery. Opening/applying Refresh chat
context can scan twice. Traversal and source reads are synchronous in the host service; no measured
causal claim about the separate browser-scrolling or composer issues is established.

Plan: fair per-root progress/budgets, canonical deduplication before accounting, independent
continuation after a root limit, honest partial/incomplete status and preserved last successful
entries where appropriate. Prioritize known source locations/explicit selections, skip generated
dependencies/caches by default with overrides, and support intentional per-root exclusions without
silently dropping ignored but explicitly registered sources. Separate cheap mode/selection saves
from filesystem rediscovery; cache/coalesce background refreshes and publish catalog revisions
atomically. Progress should show traversed directories, exclusions, discovered sources and actual
root-specific failure. Never mark a partial catalog as complete or claim a skipped source is gone.

Updated UI direction: omit **Use in this chat**. Add **Set as starting folder** to the source-folder
headers in BF-12's alphabetical Instructions/Skills/Agents/MCPs sections. In a chat setup picker,
the action sets that chat's command folder to the group's source root and retains its other folders;
it does not silently change the saved workspace, source loading modes or folder trust. Display the
current starting folder in its header. If offered in the Workspaces catalog instead, explicitly bind
and label the selected workspace target so scope is clear; never infer an unrelated active chat.
Context preview must reflect any existing With-workspace defaults affected by the root selection.
Preserve separate folder-access/loading/trust semantics and execution-host path validation.
The earlier standalone Use-in-this-chat sketch is review history, not adopted scope.

Acceptance after authorization: an oversized first root cannot suppress a small later root;
overlapping roots and symlink aliases do not consume duplicate budget or lose source provenance;
explicit/ignored selections remain resolvable; missing versus unscanned is distinguishable; mode
changes do not perform full scans; refreshes do not block interactive host work; loaded context,
folder access and per-chat trust remain separately visible. Verify UI host selection and equivalent
desktop/web/mobile semantics, including accurate empty-result versus incomplete-discovery states.

### BF-2026-10-10-17 — Workspaces become complete persistent working environments

Status: Implemented in 0.2.12 source; verification and rollout tracked in the current release ledger.
The operator rejected the first preview's navigation and simplified configuration. The current
[design](workspaces-design.md) supersedes BF-14 and the initial BF-17 separate configuration tab.

Workspaces opens a feature list with no dedicated navigation tab. Show seven recent workspace
entries under Workspaces in the left sidebar. Each opened workspace gets a named top-level tab,
with one pinned Workspace child tab containing Chats / Configuration button pages. Configuration
uses expandable sections. Reuse the Chats component with a locked workspace filter inside it;
global Chats uses unlocked filters and opens main-nav chat tabs by default. The same conversation
may be represented in main and workspace navigation. Right-click Send to workspace moves the tab
representation, focusing any existing workspace tab without duplication. Workspace + creates
chats/content within that workspace. Persist state and maintain one active execution per chat.

Each workspace belongs to one owning machine; no mixing chats from different desktops. Sync for
access through other desktop/web/mobile clients. Reusing configuration on another machine creates
its independent workspace version, with explicit paths/integrations and approval review.

Preserve all current workspace configuration controls and labels, including four Load in modes,
source paths/status/aliases, favorites, import, document/library controls, editable configuration
path actions, Source loading and Main agent. Scope selections and approvals independently; explain
workspace-scoped Every chat. Apply BF-12's alphabetical folder sections/master all-types filter and
Set as starting folder. Add individual folder refresh alongside existing global refresh. BF-16
exclusions/per-root fairness remain queued. Browser, file read/edit, commands and terminals are
always available subject to approvals; omit the rejected feature switches.

[Interactive preview](design/2026-10-11/workspaces.html) uses sample data/simulated actions. Full
acceptance inventory, inheritance, migration and host-bound sync rules are in the design document.

**October 10 long-chat follow-up:** Mobile watchdog crash, initial rendering/pagination, green composer expanders, New chat attachment layout and bounded remote receipt compaction are being corrected. See [current evidence](2026-10-10-mobile-history.md); do not treat the earlier 2610.10.2 install as including this follow-up.

> **Acceptance reopened — October 6 evening:** The operator rejected the delivered UI.
> Read [the complete acceptance audit](2026-10-07-acceptance-audit.md) before relying on
> the historical completion claims below. It reviews all 22 + 28 build items and current reports;
> working-tree corrections are not installed release acceptance.

Maintain this as the single backlog. Design rationale is in `decisions.md`; recent changes are in
`../CHANGELOG.md`. Items below are status, not promises of completed validation. The October 5 design bullets are
retained as acceptance criteria; the installed versus unverified state is summarized immediately
below and in `content-workspace-release.md`.

## October 9 follow-up issue queue

**October 10 scope correction:** Every queued change in this chat is required for the release.
BF-25–37 and BF-39 are now authorized for implementation/build/install, superseding their
historical queue-only statuses below. See [full-chat release](2026-10-10-full-chat-release.md)
for current evidence. The prior partial 0.2.10 installation did not satisfy this scope.

**Current operator direction — October 10:** Build/install approval supersedes the earlier hold.
Targets: Work Mac, Build Mac, iPad and iPhone if available. The referenced Codex thread confirms
the completed 0.2.10 batch was built/staged, not installed. Preparation covers BF-04–39, including the approved production designs and automatic previews. Installed status
must come from target receipts, not build success. The earlier hold below is historical.

[Current full release ledger](2026-10-10-full-chat-release.md): production integration and signed
0.2.11 packages include the whole queue. Build Mac, iPhone and iPad installations are verified;
production web release `20261010T160437Z` passed checksum and endpoint checks. HC’s installer
is verified, but installation awaits the operator’s pending-run decision in its existing Codex chat.
Earlier 0.2.10 installations were partial. Native signing expires October 10 at 17:29 MDT.

Remote preview delivery: the operator asked whether local designs can reach iPhone/iPad/web/desktop
through the relay. Production 0.2.11 automatically discovers chat-linked local designs, bundles
static assets and updates the same isolated remote preview tab. Phone, tablet, desktop peer and
web fixtures passed discovery, interaction and revision/cold-restart checks. Host APIs and HMR
remain outside static delivery. Earlier manually shared designs in
`design/2026-10-09/shared-previews.md` are retained as review artifacts.

### BF-2026-10-09-25 — iPad Choose photos attachment action does nothing

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-reported; queued for investigation only. Cause unconfirmed; no fix, build or
deployment performed for this item. Separate from the authorized BF-04–24 combined batch.

On iPad, opening the attachment menu and tapping **Choose photos** reportedly does nothing.
Expected: present the system photo picker, then stage selected images in the current draft.
The report does not establish whether this occurs in an existing chat, New chat or Internet Search,
or identify the installed build/iPadOS version; capture those during reproduction.

Source lead: both New chat and existing-chat attachment menus in `ios/Proteus/ChatViews.swift`
embed `PhotosPicker` directly inside a SwiftUI `Menu`. Investigate picker presentation and menu
dismissal on iPad, including other active sheets; this source pattern is not a confirmed diagnosis.
Distinguish a picker that never opens from selection/import failing after it opens.

Acceptance: on iPad, **Choose photos** reliably opens the system picker from existing chat and
New chat/Internet Search attachment menus when attachments are supported. Cancel preserves the
draft; selecting supported images stages previews without sending, and repeating the action works.
Import failures show actionable feedback. Check portrait/landscape and iPhone regression, while
preserving attachment limits, provider support checks and explicit send review. Record simulator
verification separately from affected-device acceptance.

### BF-2026-10-09-26 — Move iOS Working status and spinner to the chat bottom

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-reported placement issue; queued only. No implementation/build/deployment.
Separate from the authorized BF-04–24 combined batch.

The **Working** message and spinning icon appear at the top of iOS chats, away from the current
conversation. Move them to the bottom of the chat, after the latest message/streaming content
and above the composer, on both iPhone and iPad.

Source confirms the run-status row is the first element of the conversation `VStack` in
`ios/Proteus/ChatViews.swift`; it displays `ProgressView` for `running`, which `statusLabel` maps
to **Working**. This is the chat-level indicator; retain activity-specific progress in tool groups.

Acceptance: a running chat shows one chat-level **Working** message and spinner at the bottom,
including before any response arrives and during streaming/tool execution. State changes clear or
replace it promptly; queued, awaiting-input, completed, failed and cancelled states must not show
a running spinner. Keep it visible when following the latest content without covering messages,
input requests or composer controls. Preserve the user's reading position when scrolled upward
and during history loading, keyboard changes, rotation and chat switching. Verify on iPhone/iPad
simulators and record physical-device acceptance separately.

### BF-2026-10-09-27 — Align native attach icon with model selection

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-reported layout issue; queued only. No implementation/build/deployment.
Separate from the authorized BF-04–24 combined batch.

On iPhone and iPad, the chat attach icon currently sits below model selection. Place it on
the same line as model selection and move it closer to the composer's outer corner to leave
more room for the model controls. Reduce unnecessary inset while preserving safe-area spacing
and a usable touch target.

Source confirms `ComposerModelPicker` is rendered before a separate action `HStack` containing
the attachment menu in `ios/Proteus/ChatViews.swift`. Rework this shared native composer layout;
keep attachment previews and Send/Queue/Steer/Stop controls accessible.

Acceptance: attach and model selection share a row on iPhone and iPad in portrait/landscape,
including narrow iPad split view, keyboard open/closed and long model names. The attach icon
sits near the outer corner without clipping or overlapping controls; retain at least a 44-point
touch target and VoiceOver labeling. Model/options menus and attachment actions remain usable,
drafts survive refresh and composer collapse/expand, and selected attachments remain visible.
Coordinate photo-picker testing with BF-25. Record simulator and physical-device checks separately.

October 9 design follow-up: the operator requested previews of different iPhone/iPad layouts,
with separate Model/Level/Speed controls when width permits and a combined submenu on iPhone.
The [approved interactive adaptive composer design](design/2026-10-09/adaptive-composer.html) shows
iPhone, wide iPad and narrow iPad layouts plus idle/working states. It keeps one bottom action
row, uses BF-28's green circular up-arrow Send button, a clock badge for Queue and
a separate Steer icon, and places BF-26's Working indicator above the composer. Responsive
browser rehearsal checks pass for action target size, one-row placement, option changes,
menu dismissal and 320/390-pixel widths. This is a design preview, not native implementation;
the operator approved the adaptive layout and Queue/Steer treatment with circular icon buttons.
Steer, Send/Queue and Stop use 44-point circular buttons; Attach retains the old plain + icon
with no circular background or border and a 44-point touch target. Model/options retain their
readable labels. Preserve the existing composer/text-box colors on each platform. This latest
refinement supersedes circular styling for Attach and the earlier rounded-button shape selection. Implementation
remains queued; design approval is separate from native verification and deployment.

### BF-2026-10-09-28 — Up-arrow Send icon in a green circular button

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-selected design; queued only. No implementation/build/deployment.
Separate from the authorized BF-04–24 combined batch.

Replace the chat **Send** text with an up-arrow icon on desktop local/remote, website, iPhone
and iPad. Use a circular button and retain the current Send button's green color. The operator's
latest design approval supersedes the earlier rounded-button selection and applies circular
styling to Steer, Send/Queue and Stop. Attach keeps its plain + with no circular background or
border; existing composer/text-box colors remain unchanged.

Acceptance: consistent up-arrow icon, circular shape and existing green styling across platforms;
clear enabled/disabled contrast, a comfortable touch target on mobile and **Send message**
accessibility labeling plus tooltip on pointer platforms. Preserve click/tap and keyboard send
behavior, attachment review, draft retention and existing disabled-state guards. Queue, Steer,
Stop and Send feedback remain distinguishable; this design selection applies to Send. Coordinate
native layout checks with BF-27 and validate desktop/web and iPhone/iPad widths.

### BF-2026-10-09-29 — Desktop/web adaptive composer with visible selector labels

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator adopted the mobile layout for desktop/web and requested a full actual-HTML
design model. Interactive prototype implemented and browser-rehearsed; application integration,
build and deployment remain queued, separate from the authorized BF-04–24 combined batch.

Keep the existing plain + at the left of the footer. Show Model, Level and Speed labels above
their selections, following the approved iPad layout and operator screenshot. Preserve supported
Context choices and model refresh. Use circular Steer, Send/Queue and Stop buttons sized for
desktop pointer use (prototype: 34-pixel buttons with 18–20-pixel glyphs); coarse-pointer clients
retain 44-pixel touch targets. Send/Queue stays green. Use the local desktop's existing text-box
colors on local desktop, desktop remote and web. The bottom controls stay in one row, collapsing options into a combined menu when the
available composer width cannot accommodate labeled controls.

The [full desktop/web composer prototype](design/2026-10-09/desktop-web-composer.html) uses
real HTML textarea/select/button controls, associated labels and the existing desktop attachment
picker. It imports production desktop styles and the website remote stylesheet, with design-only
layout overrides in the adjacent CSS and handlers in the adjacent JS. Its Local/Desktop remote/Web
switch preserves draft/options/attachment selections and now demonstrates matching composer
backgrounds. The operator rejected the prototype's earlier per-platform color differences;
local desktop is the reference. Fixtures are synthetic; no provider calls, file uploads or message delivery occur.
The expandable HTML view exposes the rendered composer markup for review.

Verified in browser rehearsal: aligned single action row, 34-pixel circular icons, plain + position,
matching local/remote/web palettes, long labels, supported Context, narrow menu and Escape dismissal,
attachment add/remove, idle/running/awaiting-input states, capability-hidden controls, and
Enter versus Shift+Enter. Screenshot receipts accompany the prototype. Existing live platform
handlers, attachment consent, metadata refresh, queue/steer semantics, draft/focus retention and
streaming/pending-request behavior must be preserved during later application integration.

### BF-2026-10-09-30 — Shared desktop/remote/web details and hover presentation

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-requested design revisions implemented in the BF-29 HTML review model and
browser-rehearsed; application integration/build/deployment queued.

Local desktop is the canonical format for desktop remote and web chats, including composer,
messages and all Run details sections. Remove the web background mismatch. Center the + hover
background on the glyph without shifting the glyph, and enlarge selector hover/focus backgrounds
to include labels and selection values. Put instructional paragraphs behind default-collapsed
**Explanation** expanders while keeping current state, paths and actions visible.

Promote total AI runtime (prototype: 28px), immediately followed by smaller input/output token
counts (11–12px) on separate lines as needed. Use the same ordering and sections for workspace
approvals, chat-only approvals, MCP connections, session files/context and completion information.
Display source/session/workspace paths without redacting them solely because the view is remote.
Keep Copy path available in all three views. Local-file Open buttons remain visible but disabled
in remote/web views; this does not disable separately authorized in-app document viewing.

The operator explicitly accepts path visibility and copying. This does not grant new filesystem
access or change transport grants. Preserve permission meanings and controls during integration.
The prototype uses synthetic paths and usage; it never changes permissions or opens real files.
Verified: matching desktop/remote/web textarea palette/type/layout, + hover center with unchanged
glyph position, larger option highlights, runtime/token hierarchy, collapsed instructional prose,
visible Copy path and local-only enabled Open buttons. Review remains separate from live acceptance.

### BF-2026-10-09-31 — Automatically grow the message editor upward to 60% of chat space

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Requested; working HTML demonstration and browser checks complete. Production queued.

Grow the input upward for each added newline or wrapped line, keeping the bottom actions anchored.
Avoid internal editor scrolling until the composer reaches 60% of the available chat area, then
scroll the editor so the conversation remains visible. Shrink when text is removed. Recalculate
for window resize, sidebar/details changes, keyboard, font/layout changes and attachment strips.
Apply the behavior consistently across chat clients, with native keyboard/safe-area checks.

The review model defines available chat area below the chat heading/tab strip; the 60% cap
includes composer chrome, controls and attachment strip. It uses actual content height rather
than counting newlines, so wrapping and pasted paragraphs resize too. Verified upward growth
with stable bottom, shrinkage, overflow transition and measured 60% limit. Preserve draft/caret,
IME, Enter/Shift+Enter, reading position and pending-input visibility during production integration.

### BF-2026-10-09-32 — Inset Chats and other page headings from the navigation border

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator screenshot/report, especially iPad; queued. HTML review model demonstrates inset.

Chats sits against the sidebar/navigation border. Give page headings a consistent content gutter,
including other affected headings, without adding a duplicate title row. Verify iPad regular/split
widths, iPhone safe areas and desktop/web parity. Preserve child tab strips' deliberately flush
alignment; heading padding must not regress their earlier layout fix.

### BF-2026-10-09-33 — Restore the Live Browser tab divider

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-reported and native source-traced; queued. HTML review model shows the divider.

The iPad screenshot lacks a border between Live Browser and its neighboring child tab. Native
`ChatViews.childTabs` renders a divider after Chat and ordinary child tabs, but none after Live
Browser. Add consistent separators across the strip and verify active/inactive tabs, scrolling,
light/dark, clipping and width changes on native clients; align desktop/web presentation.

### BF-2026-10-09-34 — Native tab reordering is unavailable or unreliable

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator reports tabs cannot be reordered on iPhone/iPad; queued, not device-reproduced.

Current source has draggable/drop destinations and Move left/right commands for ordinary chat
children, plus shared ordering methods. Their presence does not prove discoverable, working touch
behavior or coverage of main/Team strips. Audit each strip, long-press versus drag/scroll conflicts,
end-of-strip drops and accessible move actions. Record intended fixed Chat/Live Browser positions.
Verify selected-tab retention, stable IDs, restart persistence and desktop/mobile convergence
without duplication, loss or reordering unrelated chats. Identify the installed build during repro.

### BF-2026-10-09-35 — Refreshing desktop-origin tabs sometimes duplicates them on iPad

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator reports intermittent duplicate reopened tabs; queued, cause unconfirmed.

Refreshing an iPad tab created by desktop should reload the existing tab, not reopen copies.
Trace stable content-tab ID versus native view ID, delayed remote snapshots, restored descriptors,
navigation/reload observers and pending local mutations. `SharedAppStore` maps desktop content
IDs to native descriptors; that mechanism needs affected-device evidence before diagnosing a race.
Verify repeated/rapid reload, offline/reconnect, chat switching and app resume with one descriptor
and one view per tab. Preserve titles, profile, selection, order, history and shared identity.

### BF-2026-10-09-36 — Native tabs repeatedly require website sign-in

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-reported, queued with BF-21 profile persistence acceptance; cause unconfirmed.

The operator reports website sessions do not appear shared between iPhone/iPad native tabs and
repeated sign-ins are required. Capture whether failures occur between tabs on one device, after
restart or between devices before asserting a cause. Same-profile tabs on one device should share
the persistent website data store. Current working-tree `SharedAppStore.webView` uses `.default()`
for Default and an identified persistent store for other profiles; earlier installed source used
ephemeral stores. This is a likely coverage area for BF-21, not proof the reported device is fixed.

Verify two same-origin/same-profile tabs on each device, main/chat/Team routes, desktop-origin
tab refresh, eviction/restoration and cold restart; retain isolation between different profiles.
Profile definitions sync across devices, but website cookies and sign-ins do not; independently
authenticated devices are a separate boundary. No live cookies or account sessions inspected.

### BF-2026-10-09-37 — Use web Home, Workspaces and Internet Searches icons on desktop

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-selected icon parity; HTML review preview updated. Application integration,
build and deployment queued.

Use the website's current SVG artwork for the desktop Home, Workspaces and Internet Searches
navigation icons: outlined house, four rounded squares and magnifying glass respectively.
The authoritative artwork is in `web/resources/views/layouts/app.blade.php`; use its SVG geometry,
viewBox, 1.9 stroke and round joins/caps rather than the section metadata's Unicode fallback glyphs.
Apply wherever these desktop navigation entries appear, preserving labels, routing, current-state
colors and focus/touch behavior. Both local and remote desktop navigation should agree with web.

The review page now shows the exact three web SVGs, including the Workspaces entry. Verify the
implemented desktop glyphs in expanded/collapsed navigation and selected/unselected states;
preview appearance is separate from installed application acceptance.

### BF-2026-10-09-38 — Fix native chat typing lag, including long histories

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator requested investigation and a fix, overriding queue-only intake for this item.
Implemented in source; long-chat typing verified on iPhone and iPad simulators. No physical-device
installation. Further builds are held by the later operator instruction above.

Each existing-chat keystroke previously changed `ChatView` state and published the entire
`RemoteStore.drafts` dictionary, invalidating the transcript and its loaded-event filtering.
The main actor also encoded/encrypted all cached chat history after the draft-save debounce.
Each Markdown row created an independent ephemeral WebKit store, while idle Find callbacks
published zero match counts for every row. The 100-message rehearsal exposed excessive renderer
process/notification work in addition to text observation.
These are confirmed hot-path costs; the affected physical device's exact profile remains unmeasured.

Retain a draft controller without observing it in `ChatView`; only the composer child observes
its text. Text edits update the scoped in-memory draft immediately without broadcasting host-state
changes. External draft and attachment-metadata actions retain observer notifications. Automatic
cache snapshots encode/encrypt/write on a serial utility queue. Lifecycle flushes and deletion wait
behind older writes to preserve latest-draft and forget-device behavior; cache format is unchanged.
Trusted bundled Markdown renderers share one ephemeral store and keep individual bridges; browser
profiles and interactive HTML artifact stores stay independent. Inactive Find does not publish
counts or execute search JavaScript. Return detection uses a linear byte check instead of computing
a Character collection difference for each edit; multiline paste/autocorrection remain draft edits.

Regression coverage: native typing against a 180-line message and 100 loaded messages on phone
and tablet, transcript-work counters, exact text retention through navigation/backgrounding,
reply/question/Mac draft separation, and encrypted persistence with 2,000 synthetic cached events.
Verification: 33 native unit tests and keyboard Send passed on iPhone; both native client sizes
passed 210-character typing, exact retention and navigation/background checks against a 180-line
message and 100 loaded messages. Final iPad run used `test-without-building` with existing binaries.
402 Node tests, static checks and a focused desktop typing smoke passed. See
`2026-10-09-native-typing.md` for counters and limitations, including unrelated legacy desktop test
failures. Existing queued UI redesigns remain separate; no physical install or release rebuild.

### BF-2026-10-09-39 — Automatically relay localhost design previews to remote chat viewers

Current release status: Integrated in production 0.2.11 source; verification and per-target installation are tracked in [the full-chat ledger](2026-10-10-full-chat-release.md). The original intake below is historical.

Intake Status: Operator-requested feature; queued for design/implementation. No application/relay change
or build. Manual shared HTML copies demonstrate the existing document path, not automatic delivery.

When a chat links/opens an HTML design served by its owning Mac at localhost/127.0.0.1, Proteus
should automatically make that preview available in the same chat on iPhone, iPad, web and remote
desktop. This includes a chat that originated locally on the Mac before a remote viewer opens it.
Agents use normal preview links/browser tabs; no special bundle script, file upload or tool call.
The remote client must never try to resolve the owning Mac's localhost address on its own device.

For static designs, the owning Mac captures the page and its HTML/CSS/JavaScript/module/image/font
dependencies, resolves relative URLs and produces a versioned bundle for the existing encrypted
relay transport. Bind it to a stable host/chat/preview identity. Discover existing local preview
tabs when a remote viewer opens the chat; preserve local tabs/URLs. Changes from the design server
update the same remote preview rather than opening duplicates or requiring manual packaging.
Reconnection obtains the current version; stale/offline content is labeled.

Reuse existing device/chat viewing settings and isolated preview rendering. Share the selected
preview and its dependencies rather than exposing the development port as an arbitrary open proxy.
Keep relay packets opaque and enforce asset/transfer limits at the host/client. Preserve drafts,
scroll and selected chat tabs while revisions arrive. Interactive-preview permission behavior
across automatically updated versions belongs to the design review; do not silently expand the
current document viewer's script authority during implementation.

Static HTML/CSS/JS designs are the first acceptance case. Designs that require host-local APIs,
WebSockets/HMR or other live services need scoped request forwarding in addition to bundling;
identify supported behavior explicitly rather than claiming a snapshot is a live application.

Acceptance: a locally originated chat opens a 127.0.0.1 multi-file design; all four remote client
types discover/render its assets and enabled controls without agent packaging. Edit CSS/JS/HTML
and confirm updates in the same remote tab, including during disconnect/reconnect. Cover relative
assets, ES module imports, native/web sandbox constraints, long chats and unavailable/deleted
previews. Record actual cross-device verification separately from source/build checks.

## October 9 combined update — implementation and builds authorized

Current implementation, verification and build status: [October 9 combined ledger](2026-10-09-combined-update.md).
The individual intake notes below are historical and are superseded by that ledger. Deployment remains separate.

The operator explicitly confirmed **Begin implementation and builds** after the browser-plan handoff.
This supersedes the queue-only hold for BF-2026-10-09-04–24. Deployment remains separate. Individual
item statuses below preserve intake evidence; the linked ledger records implementation, verification,
staged 0.2.10 artifacts and remaining live acceptance boundaries.

The browser side-conversation scope BF-2026-10-09-21–24 is incorporated in this batch. The operator
confirmed implementation/build authorization directly in this chat. No deployment authorization is
inferred from the earlier completed 0.2.9 rollout.

### BF-2026-10-09-21 — Persistent browser profiles and authenticated configuration sync

Status: Scope relayed from the browser design side conversation; source researched, not implemented.

Keep Proteus's existing tab manager. Default is the only predefined profile and uses the existing
desktop `persist:proteus-browser` partition without copying/deleting its sign-ins. Additional names
are user-configurable. Configure profiles in Browser Preferences; new-tab entries read **Browser -
Default** and **Browser - [profile name]**. Stable profile IDs follow popups, reload/unload, restart,
restoration, swipe reopen, transfer, agent routing, history and downloads. Scope cookies/site data,
extensions/settings, permissions, helper requests, favicon caches and applicable history to profiles.
Profile selection does not replace chat/tab-sharing permissions.

Extra profiles and sync are opt-in through authenticated account/API database storage, not the opaque
transport relay. Require API/site authentication before creating extra profiles. Each device authenticates
independently. Without enabling the feature, expose Default only. Sync definitions and supported settings,
never website cookies, login sessions or vault secrets. Handle account ownership, stable IDs, revisions,
deletions and cached/offline behavior without cross-account exposure or destructive local data loss.
An authenticated device signs into websites independently; equal profile names are not shared cookies.

Native normal browsing must use persistent Default/profile stores. Current `SharedAppStore.webView(_:)`
uses `.nonPersistent()`; use iOS 17's identified WKWebsiteDataStore for separate persistent profiles,
while leaving intentional ephemeral document/preview views ephemeral. This is a native persistence
finding, not a diagnosis of BF-2026-10-09-19's distinct Work Mac report. Verify isolation and restart
persistence on iPhone/iPad. Remote Live Browser reflects the executing Mac's profile; the website
client cannot partition arbitrary external browser tabs.

Acceptance: two accounts on one origin in separate profiles, unchanged Default sign-ins, every tab
lifecycle path, per-profile permissions/history/helper requests, account switch/sign-out/offline/delete
conflicts and independent device authentication. Do not place profile contents or workplace examples in Git.

### BF-2026-10-09-22 — Ghostery browser blocking engine

Status: Scope relayed; not implemented or installed.

Integrate `@ghostery/adblocker-electron` with existing tabs. It supplies blocking, not Proteus's settings
UI. Add a Proteus-styled shield/status/count, per-site pause, and filter/exception/update controls to
Browser Preferences. Apply per-profile configuration and preserve privileged application-origin blocking.
Compose Electron request hooks with extension adapters rather than overwriting existing handlers.
Validate blocked/allowed traffic, updates/cache failure, exceptions and profile isolation with synthetic
pages. No custom filtering engine and no native WebKit Ghostery port in this batch.

### BF-2026-10-09-23 — Chrome extension adapters and Bitwarden primary integration

Status: Side conversation reports explicit selection of `electron-chrome-extensions` under GPL-3;
not implemented, installed or distributed.

Use samuelmaddock/electron-browser-shell's adapters/components with Proteus's tab manager, not its
browser shell. Extension icons belong immediately LEFT of tab overview and reflect the active browser
tab/profile. Browser Preferences provides install, enable/disable, options, remove and update handling.
Preserve license/source/notices required by the selected distribution terms; do not silently alter
unrelated licensing. Package extension preload/support files and verify the packaged app, not just dev.

Bitwarden extension is primary; keep configured Bitwarden CLI broker as an optional advanced fallback.
Preserve its exact-origin/item-bound explicit fill, no vault enumeration, agent revocation before secret
retrieval/fill and no automatic submission. Avoid duplicate fill UI; extension unlock does not unlock CLI.
Validate official Bitwarden login/unlock, autofill, save/generate flows with synthetic credentials and
user-controlled authentication when necessary. Native messaging/Touch ID/passkeys need independent
compatibility evidence. Never infer arbitrary Chrome-extension compatibility from successful installation.

Protect extension vault UI and credential-entry flows from agent observation/control, including automatic
content-script fill, not only toolbar clicks. Audit screenshots/Live Browser and agent DOM/tool access
alongside overlays/popups. The existing private per-tab CDP boundary and app-origin request guard must
remain intact. Upstream warns that Electron webRequest handlers can suppress extension chrome.webRequest
listeners; test the combination of Proteus guard, Ghostery and Bitwarden's actual APIs before acceptance.
Download helpers currently use `browser.partition`; favicon fetches/cache also assume one session.

### BF-2026-10-09-24 — Native password AutoFill scope and mobile deferrals

Status: Scope relayed; native custom extensions/filtering deferred.

Use/test Bitwarden through iOS Password AutoFill on native local pages. Do not claim Safari-installed
extensions or content blockers operate automatically in Proteus WKWebView. Apple's iOS/iPadOS 18.4
WKWebExtension hosting is separate future work; the current minimum remains iOS 17. Ghostery's Electron
package does not execute in native WebKit. Remote viewing reflects the Mac's blocker/profile, without
moving its cookies or vault secrets onto the viewing device.

Primary references for BF-21–24: [Ghostery Electron package](https://github.com/ghostery/adblocker/tree/master/packages/adblocker-electron),
[extension adapter](https://github.com/samuelmaddock/electron-browser-shell/tree/master/packages/electron-chrome-extensions),
[Electron extensions](https://www.electronjs.org/docs/latest/api/extensions),
[WebKit profiles](https://webkit.org/blog/14423/building-profiles-with-new-webkit-api/),
[WebKit 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/),
[Bitwarden iOS AutoFill](https://bitwarden.com/help/auto-fill-ios/), and
[Bitwarden biometrics](https://contributing.bitwarden.com/getting-started/clients/browser/biometric/).

### Combined implementation order and validation gates

1. Capture the existing dirty source baseline; preserve deployed 0.2.9 and its recovery records.
2. Add isolated execution/session handling for BF-11 and the scoped persistence fixes; cover provider
   steering/cancellation/approval routing, schedule revision/draft handling and profile storage contracts.
3. Implement account profile definitions and desktop/native profile routing before per-profile blocker,
   extensions and website permissions. Preserve Default and validate Bitwarden protection early.
4. Implement shared notifications/attention/document grants and directional connection pause, then
   renderer fixes, input staging, progressive history, cursor lifecycle and tab behavior with targeted UI checks.
5. Run required Node tests/static checks, relevant Laravel tests/format/assets and isolated Electron
   UI checks. Preview native changes in both simulators, including persistent normal browsing versus
   ephemeral previews. Build artifacts only after checks; separately record live compatibility gaps.
6. Keep source implementation, synthetic verification, packaged validation and actual installation
   distinct. Current release deployment remains separate from the authorized implementation/build work.

### BF-2026-10-09-20 — Automatic progressive chat history on every platform

Status: Requested and source-traced; queued only, no implementation/build/deployment.

Load older messages automatically as the user scrolls upward. No ordinary **Load more/earlier messages**
button should be required. On opening a chat, fetch enough available history to fill the message viewport
plus a modest offscreen buffer; if one page is too short, continue fetching bounded pages until the
viewport/buffer is filled or history is exhausted. Prefetch before reaching the top using a viewport-based
threshold (initial target roughly one screen of headroom, tuned during UI validation). Apply to desktop
local/remote chats, website, iPhone and iPad, including schedule/search-associated conversations.

Preserve the visible message and its pixel offset when prepending history, with stable event identities
and deduplication; do not jump to the bottom or steal focus from the composer. Maintain this anchor
through streamed updates, delayed image/layout changes, expanded tool activity, resize/rotation and
switching away/back. Follow new messages only when the user is already following the bottom. Re-evaluate
underfilled viewports after content/layout changes without creating a request loop.

Use one older-page request per chat at a time, cursor/progress guards, bounded batches and existing
history retention limits rather than loading the entire conversation. Reject stale host/chat responses,
cancel or ignore obsolete work, and respect paused/offline connections. Show a small loading indicator;
on failure retain visible content and offer **Retry** without repeated notices or automatic error loops.
A retry action is appropriate recovery, not the normal means of paging. Show a subtle beginning-of-chat
state when exhausted. Preserve loaded-history find semantics and update any find logic that currently
detects history availability through the removed button's DOM selector.

Current source differs by surface: local desktop renders an explicit earlier button in `public/app.js`;
remote desktop includes near-top and underfill loading in `public/remote-desktops.js`; native has a
near-top trigger alongside its earlier button in `ios/Proteus/ChatViews.swift`; web has its own paging
path in `web/resources/js/remote.js`. Existing partial automation is not proof of consistent behavior.
Unify the expected behavior and audit scroll-container detection and repeated underfill completion.

Acceptance: short pages, very tall viewport, long chats, rapid upward scrolling, slow/failing connections,
empty/repeated cursor responses, concurrent streaming, images/tool expansion, chat/host switches, device
rotation and resume from saved scroll position. No normal load-more click, blank viewport despite older
history, scroll jumps, duplicate messages, unbounded fetches or unrelated chat requests on any platform.

### BF-2026-10-09-19 — Browser sign-ins lost after full app restart

Status: Reported and source/API reviewed; cause unconfirmed, queued only. No cookies, credentials,
live profile contents or account sessions read/modified; no app restart, build or deployment.

The operator reports needing to sign into accounts after every full Proteus reload and expects sign-ins
to persist. Follow-up confirms the affected host is Work Mac and this incident was not disk-space related;
do not attribute it to the separate earlier disk-pressure incident. In the current browser discussion, treat this as embedded website authentication; distinguish
website sessions from provider CLI, MCP and Proteus account credentials if investigation shows otherwise.
Determine whether full reload means renderer reload, normal Quit/relaunch, update or forced termination,
and which sites/host are affected before asserting a common cause.

`desktop/browser.cjs` already uses `session.fromPartition('persist:proteus-browser')` for all embedded
tabs. Source search found no intentional browser cookie/storage wipe in startup/shutdown. Current
shutdown closes browser views and the service without an explicit cookie/storage flush; absence of an
explicit flush alone does not prove data loss, since Electron ordinarily manages persistence. Electron's
[Cookies API](https://www.electronjs.org/docs/latest/api/cookies) distinguishes persistent cookies from
session-only cookies and documents asynchronous disk writes/flushStore. A persistent partition does not
by itself promise restoration of every site's session-only authentication or override server expiry/SSO.

Next batch: compare sanitized storage metadata and behavior before/after restart using synthetic sites
first. Check consistent userData/session storage paths and partition identity across installed/source
launches, app updates and restoration; cookie expiry/session flags, origin differences, write/flush
failures, disk-full recovery and credential-store availability. Do not expose cookie values/tokens in
logs or repository fixtures. Disk-full testing may remain general resilience coverage, but is not a
suspected cause of this Work Mac report.
Reopening saved URLs/history is not proof of preserved authentication.

Preserve valid persistent website sign-ins across normal restarts/updates, with reliable storage and
shutdown handling as needed. Evaluate explicit browser-session restoration for session-only auth if
required; do not blindly rewrite expiry dates, export plaintext cookies or bypass site-enforced expiry,
logout or reauthentication. Retain profile boundaries and existing sign-ins when introducing profiles.
Show actionable storage/authentication failures through the shared notification system rather than
silently falling back to an empty profile. Do not reset/delete the profile as a diagnostic shortcut.

Acceptance: normal Quit/relaunch, renderer reload, tab unload/reload and update using the same profile;
persistent cookies/local storage, session-only cookies, genuine expiry/logout, redirect origins, storage
failure and recovery. Verify representative affected sites with user sign-in when required; do not claim
all sites persist merely because a synthetic cookie test passes. Track website-imposed reauthentication
separately from Proteus-caused loss. No automated login or real-account restart test during intake.

### BF-2026-10-09-18 — Changed instruction source warning lacks direct recovery

Status: Corrected screenshot/source reviewed; queued only, no implementation/build or workflow run.

The operator corrected the screenshot for the question about missing refresh/actions. That question
refers to **Instructions changed. Refresh context before starting: [source name]**, not the unsaved
schedule warning in BF-2026-10-09-17. Retain the earlier distinct save/run report, but do not conflate
these errors or claim this corrected image shows an enabled/paused mismatch.

`src/context.js` capture reads selected source files and compares their current content hashes to
the context catalog entry hashes. A mismatch raises this warning to prevent capture from stale
metadata. Saving schedules can invoke capture validation as well as starting runs. Saving schedule
JSON does not itself refresh the source catalog. The existing recovery is to expand **Instructions,
skills, agents & MCPs** in the schedule settings, choose **Refresh sources** at the bottom, then save
any pending schedule edits successfully and retry Run now. **Refresh models** is unrelated. Source
hash mismatch explains the message; actual changed source contents were not read for this intake.

Add a direct **Refresh sources** action and **Show changed source** details to this failure, integrated
with the shared notification/pending-issue framework where appropriate. Preserve draft fields, selected
sources, agent/default choices and scroll/focus through refresh. Clearly report successful refresh or
remaining missing/changed/invalid sources; allow review before retrying. Do not automatically run the
schedule after refresh or silently remove an invalid source. Keep validation for a source changing
again between refresh and capture; distinguish source-catalog staleness from schedule revision conflicts.
Tests should use synthetic source changes, save-time and run-time failures, successful refresh/retry,
deleted sources and repeated changes, without executing the user's actual workflow.

### BF-2026-10-09-17 — Saved schedule still blocked as unsaved by Run now

Status: Reported and source-traced; exact cause unconfirmed, queued only. No schedule execution,
configuration changes, implementation, build or deployment performed.

The operator reports saving schedule edits before clicking Run now, but receives **Save your changes
before running.** The screenshot also shows a Paused header while the displayed JSON contains
`enabled: true`; investigate stale derived UI alongside dirty-state tracking. Do not infer that the
disk file was saved successfully from the JSON preview: it renders `clean(s)` from the editor draft,
despite the surrounding Source of truth heading. Do not copy workplace prompts/paths from the image.

Source: `public/app.js` Run now rejects locally when global `state.dirty` is true, before calling
`/api/run`. Schedule field/context update handlers mark it true unconditionally, even for an event
that returns fields to their saved values. Save posts with `expectedRevision`, ignores the returned
saved object, clears the global flag and awaits `refresh(true)`; refresh can join an already-running
state request. Draft/dirty state is shared across schedule views, and heading status is rendered
separately from later field updates. These are diagnostic leads, not a reproduced root cause. Trace
save acknowledgment/revision, subsequent input events, overlapping refreshes and tab switches on the
affected host with sanitized data before asserting why the flag returned to true.

Next batch: establish a per-schedule saved baseline from the acknowledged response/revision, derive
dirty state from meaningful draft differences, and prevent late responses or another schedule's state
from contaminating it. Preserve edits made during a pending save; never clear newer unsaved input.
Keep badge, preview and save indicator consistent and label draft JSON accurately. Run now must accept
an unchanged successfully saved schedule, including a paused schedule used for a manual run, while
retaining real-unsaved-change and revision conflict protections. Distinguish saving, save failed,
unsaved edits and external conflicts with actionable feedback; do not bypass the dirty guard blindly.
Ensure execution uses the intended current saved revision and does not silently launch stale settings.

Proposed recovery UX (the operator's follow-up screenshot was corrected to the different source-change
warning in BF-2026-10-09-18): keep save/run status and recovery actions discoverable beside Run now or in a persistent
editor action bar. Offer **Save and run** for actual pending edits (execute only after successful save),
**Retry save** for failure, and **Review changes** / **Reload saved version** for a conflict. Explain
which fields differ when claiming unsaved changes. Reload must preserve or explicitly confirm discarding
unsaved edits; do not tell users to refresh blindly. A completed save with no newer edits should simply
permit Run now. Keep model-catalog Refresh clearly separate; it does not save/reload schedule settings.

Acceptance: save then immediate Run now; wait through background/model refresh then run; edit/revert;
switch between schedule tabs during save; slow/failed save; external file change/revision conflict;
new edits during save; enabled/paused status parity and manual execution without activating recurrence.
Use synthetic schedules/providers for reproduction; do not run the operator's actual workflow to test.
Check corresponding remote/web/native save-run behavior where applicable.

### BF-2026-10-09-16 — Directional device pause with hidden remote content

Status: Requested and source-traced; queued only, no implementation/build/deployment or live connection change.

Add **Pause connection** / **Resume connection** to each outgoing peer in Engine Room → Mac Connections.
Pausing host B from client Mac A stops A connecting to or presenting content from B until explicitly
resumed. It must not change B's independently authorized connection to A, A's incoming remote-access
service, pairing keys/grants, or work executing on either host. This is a local, directional preference
keyed by stable target-host ID, not a global device-disable, unpair, revoke, delete or cancel action.

While paused, hide that host's chats, search/schedule-associated chats, sidebar recents, counts,
Needs attention items, tab/overview entries and host-attributed activity/history suggestions from the
pausing Mac's ordinary aggregated views. Apply the filter to fresh, cached and account-merged sources
using actual source-host identity. Do not hide unrelated shared/local records merely because their
titles match. Retain the device in Mac Connections as **Paused on this Mac**, with Resume available.
Do not report an intentional pause as offline failure or generate reconnect/error/attention noise.

Suspend outgoing polls, retries, heartbeat, auto-connect, live browser/document streams and implicit
requests. Retain local drafts and tab descriptors without presenting paused content; if the active view
belongs to the paused host, move to a local page. Hiding tabs must not send remote close/delete commands
or revoke their content grants. Explicit attempts to access a paused host offer Resume instead of
silently reconnecting. Persist the pause across app restarts until resumed. On Resume reconnect with
existing pairing, refresh current state and restore visibility without replaying commands or stealing
focus. An in-flight operation may already have executed remotely; do not claim pause cancelled it or
automatically retry it. Ignore late responses for visible paused-host content and guard resume generations.

Current evidence: `src/desktop-peers.js` already has outgoing `disconnect()` with in-memory recovery
`suspended` state, suppressing automatic reconnect/request attempts. However, pairing records do not
persist a pause flag, and `index()` still returns cached rows from disconnected hosts. Therefore ordinary
disconnect is not the requested persisted pause-and-hide behavior. Extend peer state, all aggregation
paths and renderer/stream lifecycle together; preserve the separately owned incoming access service.

Acceptance: pair A↔B independently, pause A→B, verify B→A still works and both hosts keep running work;
all B-attributed content disappears on A while local/other-host content remains. Test cache/offline
fallback, account aggregates, open remote tabs and unsent drafts, pending/in-flight responses, sleep/wake,
restart, notifications and explicit resume. No unexpected reconnect, lost pairing/drafts, remote tab
closure, cancelled chat or duplicated command. Resume restores current visibility without re-pairing.

### BF-2026-10-09-15 — Persistent agent pointer with smooth movement

Status: Requested and source-traced; queued only, no implementation/build/deployment.

Keep the agent pointer visible at its last known position while the agent is using that browser tab,
including pauses between browser tool calls. Animate movement between observed cursor positions when
possible instead of flashing/disappearing and jumping. Preserve a distinct click pulse and field-focus
feedback without replacing the persistent cursor with a field rectangle. Respect reduced motion.

Current behavior: `desktop/browser.cjs` schedules pointer removal 1,200 ms after each browser operation
ends; `desktop/browser-preload.cjs` removes and recreates the overlay on every point event. The bridge
already forwards actual mouse input coordinates, making visual interpolation feasible. Track a tab's
active agent-use lifecycle separately from the count of in-flight tool calls; merely sharing a tab
must not imply that an agent is currently controlling it. Clear stale ownership/pointers when the run
ends, is cancelled, access is revoked or the tab closes. Navigation/reload must reattach a valid overlay
without depicting a stale field location; validate viewport/zoom coordinates before restoring it.

Reuse an overlay and animate from its current displayed position to the next observed point with a
short bounded transition. Coalesce rapid movement, avoid delayed trails and show click feedback at
the actual target immediately; cosmetic animation must not delay automation or misrepresent pending
actions. Before the first known coordinate, do not invent a mouse location. Keep pointer events disabled
so the user can interact normally; the agent overlay must not move or replace the user's OS cursor.
Keep tab/run attribution correct under BF-2026-10-09-11 parallel execution, and validate how the overlay
appears in Live Browser frames without adding duplicate cursors.

Acceptance: gaps longer than 1.2 seconds between actions, repeated move/click/fill/scroll, reduced motion,
rapid events, navigation, zoom/resize, switching tabs, live remote viewing, run completion/cancellation,
access revocation and concurrent chats. Cursor stays visible during agent browser use, transitions are
smooth when enabled, cleanup is timely, and interaction/click coordinates remain accurate.

### BF-2026-10-09-14 — Reveal newly opened tabs without resetting the strip

Status: Reported and queued; no implementation/build/deployment.

Opening a new tab reportedly resets the tab navigation to its beginning, leaving the new tab out of
view. Scroll the owning strip just enough to reveal the complete new/selected tab, including its
close control, after insertion and layout. Appending at the end will normally reveal that end;
insertion elsewhere must reveal the actual tab rather than blindly jumping to the last item.
Apply consistently to main, chat-child and Team tab strips and their platform equivalents. Preserve
the pinned Chat tab and fixed add controls; account for their occluded space when measuring visibility.
Keep vertical page position, drafts and keyboard focus intact. Background status/title refreshes must
preserve manual tab-strip scroll, not reset it or continually pull it back to the active tab. Agent
background tab creation must not steal the user's active tab/focus.

Source trace: desktop `openTab()` selects and renders; main/child renderers restore prior `scrollLeft`
without an explicit newly opened tab visibility adjustment. This confirms a missing reveal step in
these paths, not the exact cause of the reported reset. Track insertion/selection intent separately
from routine redraws, and guard deferred layout work against stale selection or a replaced strip.

Acceptance: overflowing strips initially scrolled to start/middle/end, rapid multiple opens, reopening
an existing tab, child tabs and pinned Chat, sidebar resize, long titles, tab close/reorder and delayed
title/favicon updates. A foreground newly opened tab is fully visible within the usable strip; ordinary
refresh preserves its scroll position. Verify desktop and corresponding web/native navigation without
claiming existing release checks already cover this report. Coordinate with BF-2026-10-09-12.

### BF-2026-10-09-13 — Website notifications and managed site permissions

Status: Requested for the next combined update; source/API reviewed, no implementation/build/deploy.
Uses BF-2026-10-09-06 shared banners and BF-2026-10-09-07 persistent attention items.

Approved organization: rename Engine Room Preferences to **Browser Preferences**, retaining the
existing browser-link destination setting and adding **Website notifications**. List allowed and
blocked origins with Allow / Block / Reset to Ask actions and clear host context. Engine Room
**Notifications** remains the shared delivery/history/preferences hub, with a Website category and
a link to site permissions; avoid duplicate competing settings. Needs attention → Notifications owns
unresolved permission requests and actionable delivery problems, not every ordinary website alert.
The operator accepted this organization after reviewing the recommendation. Approval updates the
queued design; implementation/build remain on hold for the combined update.

When a website requests notification access, show the shared light-green top-center banner with the
verified requesting origin, source tab and host, plus **Allow** / **Block**, X and Details. Hide the
banner after 15 seconds without treating dismissal as Allow or as a permanent Block. Retain a pending
action in Needs attention while the request remains valid; deduplicate repeated requests. Settle each
Electron callback exactly once; close/navigation, request expiry or shutdown must clean it up and
mark stale actions unavailable. A later decision after request expiry may set future site policy,
but cannot claim to have granted a dead request. Keep the rest of the app usable and handle modal/native
browser layering. Website permission must not inherit chat tool auto-approval.

Persist decisions by exact validated origin and owning browser session/profile on the execution host,
not by page title or a suffix/wildcard hostname match. Until browser profiles are implemented, use the
existing persistent session; profile support was discussed but is not a prerequisite or silently
implemented here. Check the real requesting frame/origin, including null-webContents checks; block
unattributable requests. Scope remote visibility/actions to existing authorization and do not silently
sync grants or website notification contents to other hosts/devices. Revocation must affect existing
tabs as well as future ones. Reset permits asking again; it does not grant access.

Actual website alerts should use the shared notification presentation with clear **Website** attribution,
origin/profile/host, safe text rendering, Open tab and Manage site actions, deduplication and flood
control. Keep website-supplied text distinct from Proteus approval/system messages. Opening an alert
must target its original tab/profile or an explicit replacement in that same profile. Coordinate any
optional OS fallback with shared delivery preferences to prevent duplicate banners.

Evidence and implementation boundary: `desktop/browser.cjs` currently denies every permission request
and check. Electron documents `notifications` in its
[session permission handlers](https://www.electronjs.org/docs/latest/api/session), so integrating the
permission prompt and allowlist is straightforward. Its
[notification APIs](https://www.electronjs.org/docs/latest/tutorial/notifications) normally display
website notifications through the OS. Granting permission alone does not route alert contents into
Proteus banners. Prototype and verify notification delivery bridging separately, including page-created
Notifications, click/close behavior and service-worker `showNotification`. Do not assume a page preload
shim captures worker notifications or supplies Web Push transport. Closed-tab/app-quit/background push
delivery remains unverified and must be stated accurately; no claim of universal site support until
tested. The existing app activity notification path in `desktop/main.cjs` is separate from website APIs.

Acceptance: Allow/Block/Ask, persistence/revocation, exact-origin and profile isolation, repeated prompts,
15-second banner dismissal with pending action, request cleanup, modal visibility, spoofed site text,
permission checks without a WebContents, foreground/background tab alerts, click routing, duplicate OS
delivery, burst control and restart. Verify supported page/worker paths independently; surface actual
delivery failures with useful actions rather than falsely claiming notifications are enabled and working.

### BF-2026-10-09-12 — Flush pinned chat tabs, find dismissal and matching add icons

Status: Reported and source-traced; queued only. No implementation/build/deployment.

- Remove the blank gutter between the pinned Chat tab and its first child. Child tabs must start
  directly beside Chat and scroll beneath/behind its opaque pinned edge when overflowing. Chat stays
  visible and clickable; scrolling must not leave a reserved blank spacer or expose text over Chat.
  Preserve child ordering, selection reveal, drag reorder, close controls and saved scroll position.
- Remove the Find/search icon from the top navigation. Retain Find in page and its keyboard/menu
  access; this does not remove the Internet Searches feature or its navigation entry.
- Repair the browser find panel X so it closes the panel, clears highlights/stops native find, and
  restores browser bounds without closing the browser tab. Escape should do the same. Verify after
  tab-strip refreshes, navigation and switching between browser/chat/document content.
- Make the chat child-strip + match the main top-strip + in actual glyph, visible size, weight,
  alignment and hit target. Prefer a shared icon/control style rather than font-dependent sizing.

Source findings: `public/parity.css` leaves `#chat-subtabs` with `gap:4px` after pinning Chat outside
the scrollable list. It also gives chat summaries `font-size:12px`, while later shared add-control
rules align box dimensions without normalizing glyph size. Exact rendered parity remains a UI check.
`public/page-find.js` binds its X using `[data-close]`; `renderTabs()` in `public/app.js` subsequently
rebinds every document-wide `[data-close]` to `closeTopTab(button.dataset.close)`. The find X has an
empty value, so that handler returns without closing the panel. Scope tab-close binding to its strip
and give find controls distinct selectors; audit other generic close selectors for collisions.

Acceptance: zero/one/many children, scroll at both ends and mid-list, narrow/wide windows, sidebar
expanded/collapsed; Chat remains pinned with no gutter. Both + controls visually match. No Find icon
in top navigation; Cmd/Ctrl+F still opens find. Pointer X and Escape work repeatedly with active native
matches, no matches and after background tab updates; only the panel closes and content bounds recover.
Source findings have not yet been verified in the affected installed UI.

### BF-2026-10-09-11 — Parallel independent chats and visible queue reasons

Status: Current serialization confirmed in source and existing synthetic execution-lane tests;
parallel execution and queue explanations are queued, not implemented or deployed.

The operator reports new Copilot chats remaining Queued without an explanation, then starting after
an older chat finishes. The operator subsequently reported Codex blocked by Copilot and explicitly
requires parallel independent chats for every provider from every device, with no arbitrary Proteus
chat-count cap. This supersedes the initial bounded/Copilot-first proposal. This matches the current host-wide AI
execution slot: `Engine.drain()` in `src/engine.js` skips ordinary queued runs while `this.running`
is occupied. `src/server.js` assigns separate lanes only to allowlisted native Omi jobs. This limit
therefore spans AI providers on a Mac, not merely Copilot. Awaiting-input/permission turns retain
their slot until execution finishes. Provider sign-in/integration holds and deferred attachment
dispatch can also keep a run queued; the reported incident's exact blocker was not captured live.

Copilot supports concurrent independent sessions according to its official
[SDK scaling guide](https://github.com/github/copilot-sdk/blob/main/docs/setup/scaling.md).
The installed adapter already maps sessions by run ID and creates/resumes distinct provider sessions;
this is not proof that Proteus's shared lifecycle, tools and recovery paths are concurrency-ready.
Keep one turn at a time per provider session and the single runner process lock per data directory.

Next batch: remove the host-wide AI slot and arbitrary host/provider chat-count caps for independent
chats across Copilot, Codex and Claude. All desktop, web, iPhone and iPad clients must expose the same
behavior on their selected execution host; remote clients still execute through a connected Mac, not
locally on iOS or in the web browser. Unlimited means no imposed Proteus chat-count cap, not infinite
hardware capacity or bypassing provider rate/account limits. Report actual provider/resource failures
and temporary backpressure honestly; do not substitute an undocumented fixed cap. Input-waiting chats
must not monopolize unrelated execution, and simultaneous answers must remain session-safe. Keep
fair scheduling among new chats, scheduled work and queued continuations. Audit cancellation, shutdown, sign-in/reconnect,
context changes, permissions, browser ownership and shared workspace/tool resource contention;
changing or cancelling one session must not interrupt or grant authority to another.

This needs adapter work as well as scheduler changes: `src/codex.js` stores a single `this.active`
for steering/permission handling and may close its shared client on unfinished-turn cleanup;
`src/claude.js` explicitly rejects a second active turn and stores one active client/run ID. Replace
these with isolated per-session lifecycle/routing before admitting parallel same-provider turns.
Do not merely remove the engine guard. Validate actual provider runtime support through independent
sessions/processes as appropriate without sharing mutable turn state.

Expose an authoritative queue reason and waiting duration across desktop, web and native: capacity
pressure or provider throttling (with relevant permitted details), provider sign-in/reconnect, attachment preparation,
or an earlier turn in the same chat. Offer the relevant action, such as Open chat or Providers, without
inventing an ETA. Surface actionable failures/stale holds through Needs attention; normal capacity
waiting should not generate repeated error banners. Clear explanations when dispatch begins and
preserve queued messages on failure/retry. Do not automatically kill an older chat to unblock a new one.

Acceptance: independent sessions within each of Copilot, Codex and Claude progress simultaneously,
and a mixed-provider run does not block another provider. Exercise concurrent submissions from all
four client surfaces and both execution hosts, including multiple devices addressing one host. No
arbitrary chat-count cap; same-session turns never overlap. Input/approval waits, genuine resource or
provider throttling and simultaneous responses behave correctly; cancelling
or failing one chat leaves another running; restart recovery and queued delivery do not duplicate
work; browser/tools/permissions stay scoped; UI reasons match actual host blockers for local and remote
clients. Use synthetic providers first, followed by controlled live validation for every provider. Existing
execution-lane tests currently confirm serialization, not the proposed parallel behavior.

### BF-2026-10-09-10 — Internet Search defaults stuck loading or disappearing

Status: Reported, source-traced and partially reproduced with a synthetic container/request harness;
queued only. No application changes, build or deployment.

Engine Room → Internet Searches remains at Loading. The operator reports that opening a new-tab
dialog lets settings appear behind its backdrop, but returning to interact with the page makes them
disappear again. This concerns the settings page, not the Internet Searches chat list.

Likely mechanism: `public/app.js` polls state every 1.5 seconds when no dialog is open and may fully
render on a changed state signature. `renderEngineRoom()` replaces its content with Loading on each
render. `renderInternetDefaults()` captures that container and waits for all provider requests with
`force:true` before drawing anything. Its active guard checks page/section and the existence of an
engine container, not the identity of the captured container or render generation. An older request
can therefore populate a detached container while the visible replacement still says Loading.
Opening a modal pauses polling, giving the current render time to complete; closing it permits the
replacement cycle again. This explains the reported pattern but is not yet confirmed on the affected
Mac: state-signature changes, request timing and renderer errors still need a live trace.

A deterministic harness using the actual `renderInternetDefaults()` function and synthetic deferred
responses reproduces detached-container writes, visible Loading until the current response completes,
and Loading returning after another container replacement. This is not an installed UI reproduction.

Next batch: keep the mounted settings form stable through unrelated background state changes, preserve
unsaved choices/focus, reuse catalog results and in-flight requests rather than forcing refresh for
every render, and guard asynchronous completion against the exact current view/container. Show provider
panels progressively with bounded loading, clear failure/retry states and explicit refresh; one slow
provider must not hide the whole page. Preserve settings revision/conflict checks and advertised model
controls. Audit other asynchronous Engine Room sections for the same lifecycle issue.

Acceptance: slow/failed providers, changing background chat state across multiple polling cycles,
opening/closing a new-tab dialog, navigation away/back, stale responses, unsaved edits and successful
save/conflict handling. Settings must stay visible and usable without opening a modal. Confirm on the
affected desktop before claiming this reported incident resolved.

### BF-2026-10-09-09 — Duplicate Copilot model choices

Status: Reported, source-traced and queued; no implementation/build/deployment.

The new-chat screenshot shows the entire Copilot model sequence repeated in the same open menu,
including Auto. This appears to be duplicated entries, not simply distinct model versions. Exact
option IDs and raw catalog contents on the affected Mac have not yet been captured, so the origin
of this specific incident remains unconfirmed.

`CopilotProvider.models()` maps every RPC/SDK model through `copilotModel` without deduplicating IDs.
`modelOptions()` in `public/features.js` likewise renders every entry. An isolated synthetic check
using these actual functions confirms that four catalog records containing two repeated IDs produce
four model options. This establishes a missing duplicate guard, not proof that HC's provider returned
duplicate IDs. `refreshModels()` replaces `innerHTML` instead of appending; repeated refresh alone
is not established as the cause. Also investigate native macOS select behavior when an open picker is
rebuilt and distinct provider IDs that happen to share a display name.

For the next batch, compare affected-host raw metadata, normalized catalog and DOM option IDs/counts
before and after provider selection/refresh/reopening. Ensure one choice per provider model ID at the
shared normalization/rendering boundary, retaining advertised capability metadata and stable order.
Do not merge different IDs merely because their names match; label truly distinct choices clearly.
Keep selection, draft/attachments and effort/context/speed controls stable. No hardcoded model-name
list or extra new-chat refresh mechanism is requested. Apply the correction consistently wherever
that provider catalog is presented, including local/remote desktop, web and native consumers.

Acceptance: repeated identical IDs, conflicting metadata under one ID, identical names under different
IDs, one Auto entry, repeated provider switches, overlapping responses, reopen/refresh while the native
menu is open, and unchanged valid selection/options. Existing catalogs with unique IDs must retain
all legitimate models. Use synthetic catalogs for regression tests; confirm the reported native-menu
case separately on the affected host before claiming it resolved.

### BF-2026-10-09-08 — Clipboard images before provider selection and hidden feedback

Status: Investigated and reproduced with existing modules in an isolated browser; queued only.
No application code, build or deployment. Cross-reference notification work BF-2026-10-09-06.

The reported new-chat screenshot shows **Select provider first**. In `public/chat-attachments.js`,
`accepted()` returns an empty array for an empty provider. The paste listener still intercepts file
items and prevents the default paste; `add()` rejects them with the unsupported-provider message.
For a synthetic PNG, the exact message is ` cannot receive image/png.` (empty provider prefix),
and no attachment is retained. The plus button is disabled in this state, but the paste path is not.
Selecting Codex with advertised PNG support accepts the same file. Current adapters advertise PNG,
JPEG, GIF and WebP support; this reproduction does not establish that every clipboard MIME type or
provider/model combination is supported. The actual system clipboard was not read or submitted.

Separately, `#toast` is a body-level sibling of the dialog with bottom positioning and `z-index:10`.
The new-chat dialog uses `showModal()` with a tinted `::backdrop`, so normal document content remains
below the browser's modal top layer. Isolated hit-testing at the visible warning returns the dialog,
not the toast; its message and close button are obscured/inaccessible. Raising ordinary z-index alone
will not fix this layering problem. The screenshot report and reproduced frontend rejection are
consistent with a missing provider and modal-layer bug, not a disk-full write error.

For the next batch: distinguish **provider not chosen**, **capabilities loading/unavailable** and
**actual unsupported file type**. Prefer retaining bounded clipboard attachments locally as draft
items until a provider is selected, then revalidate against that host/provider's advertised types
before delivery. No provider is selected automatically, and no upload occurs before the existing
send/consent boundary. Preserve text and attachments through provider/host changes and allow clear
removal of genuinely incompatible files; do not silently drop a pasted image. If deferred attachment
staging is unavailable, show a visible, actionable Choose a provider first message instead of the
misleading cannot-receive message.

Ensure the approved top-center notification system can appear above active modal backdrops, remains
readable/dismissible without closing the new-chat form, and preserves form focus/drafts. Include any
remaining bottom-toast surfaces in the migration. Inline provider/attachment feedback may supplement
the banner without creating a duplicate persistent incident for ordinary form validation.

Acceptance: paste with no provider, loading/absent capability metadata, valid and unsupported image
types, size limits, selected local/remote provider, provider/host changes and repeated paste. Verify
both file chooser and clipboard behavior; notification visibility and keyboard/pointer dismissal
above new-chat and nested dialogs; no accidental send/upload, draft loss or focus theft. Use synthetic
content only. Add a native clipboard integration check at implementation time; the current reproduction
uses a synthetic ClipboardEvent with the actual picker/toast modules, not an OS clipboard capture.

### BF-2026-10-09-05 — Device document access and one-time sharing

Status: Queued for the next combined batch; no build or application changes. Supersedes the older
policy requiring both the device document toggle and individual version approval.

When **View chat documents** is on for a paired device, allow direct remote retrieval of all
supported documents associated with an accessible chat, including document tabs, assistant links,
relative linked documents and their permitted assets. Refreshed versions must not trigger another
human approval. Continue checking current chat/workspace authorization, document identity, supported
formats, bounded sizes and sanitized rendering on the host; this is not arbitrary filesystem access.

When the toggle is off, allow an explicit one-time request. The owning desktop Mac can approve or
deny that device/chat/document version without enabling device-wide access. Keep the existing
version/asset manifest and request expiry protections for one-time shares. Requests and reads must
be separate: removing the current request gate must not grant unapproved reads. Revocation blocks
ongoing broad access and clears outstanding grants; a later explicit one-time approval can still
share a document. Paired devices must not approve their own access. Update all client capability
checks, document-tab discovery and toggle copy so the off-state one-time path is actually reachable.

Current evidence: `src/remote.js` gates request/status/read/asset on `documentAccess`, then
`src/chat-documents.js` separately requires `approvedAt` for every document/version. The current
setting promises only requests. Queue changes to both gates and client discovery, not just copy.
Validate on/off, changed versions/assets, linked documents, same-device/chat binding, revocation,
stale requests and immediate remote delivery after approval. Use synthetic document names in tests
and previews; source documents/paths from screenshots are not repository examples.

### BF-2026-10-09-06 — Actionable top-center notifications

Status: Design approved and queued for the next combined batch; no build. The operator accepted
the banner examples and added the Needs attention page/list behavior in BF-2026-10-09-07.

Use a shared notification component for desktop/web and matching native presentation. A light-green
Proteus banner slides down at top center, stays for 15 seconds, and leaves the rest of the app usable.
Desktop/web show an X; dismissal and timeout only hide the banner, never approve, deny or cancel work.
Support reduced motion and keyboard/screen-reader access without stealing focus. Keep the surrounding
page clickable; only the banner intercepts its own pointer input.

Document requests show document title, requesting device and recognizable chat title with **Approve
once** / **Deny** directly in the owning desktop banner. Details must show the **full absolute disk
file path**, with wrapping/selectable text and a Copy path action; do not truncate it to a basename
or shortened breadcrumb. Keep byte size, fingerprint and expiry in Details as well. Reformat the existing request list into readable rows with wrapping and aligned actions.
Add a global pending count plus chat/request indicators and **Needs attention** access after the
banner disappears. The requester sees waiting/approved/denied/expired state. Requests expire on their
own authorization timer, independent from the 15-second presentation timer. Prevent double decisions
and remove/disable resolved or expired actions on every visible surface.

Recommended standard examples: connection restored; reconnecting with saved-draft reassurance;
provider sign-in required with Open Providers; storage failure with View storage; document access
confirmation after explicitly enabling the setting (not on every automatic document read). Reuse
light-green surfaces with severity icon/text accents for errors. Keep event details in the relevant
page and persistent unresolved actions in Needs attention. Deduplicate repeated failures by host/
operation; polling must not restart or resurrect a dismissed banner. Recovery updates the same issue.
Use one banner at a time, with pending counts handling bursts. General web banners do not broaden
web authority: document approvals remain on the owning desktop Mac under the requested policy.

Standardize informational, connection, failure and approval banners. Retain focused inline form errors
and explicit destructive-action confirmations where the user still needs that context. Acceptance:
15-second dismissal, X dismissal, typing/navigation during banners, direct approve/deny, expired and
already-resolved requests, deduplication/recovery, narrow layouts, reduced motion and assistive access.

### BF-2026-10-09-07 — Needs attention chats and notifications

Status: Approved design, queued for the next combined batch. No build or application change.

Expand Needs attention from the current chats-only list into a page with **Chats** and
**Notifications** tabs. Chats retains chats needing input/review. Notifications contains pending
document approvals, unresolved connection/account problems, storage failures and other actionable
notices, with useful direct actions such as Approve once / Deny, Open chat, Open Connections,
Open Providers and View details. Offer actions appropriate to the issue and current host/device
authority, rather than generic buttons that cannot actually resolve it.

Selecting Needs attention or the notification indicator navigates to this page (or its Notifications
tab), never replays a banner. Opening a notification selects/reveals its row/details; opening a chat
item opens its chat. Viewing a pending item does not resolve it. Persistent list rows carry the same
current request state as banners; expiry, denial, approval and recovery update both. Show resolved
notices separately from the active queue so they no longer count as pending.

Under Needs attention in the left navigation, show up to **seven mixed recent unresolved items**
across chats and actionable notifications, matching the other recent-item lists. Use distinct icons,
readable titles and host/chat context. Order by latest meaningful activity, not polling timestamps;
coalesce repeated reports of the same issue. Chat rows go to the chat; notification rows go to the
Notifications tab and reveal that item. The section heading opens the two-tab page. This behavior
supersedes the initial preview's shortcut that reopened the banner.

Apply the information structure consistently to desktop, web and native; native sidebar/navigation
adapts to available space. Preserve direct one-time document approval on the owning desktop Mac;
clients without that authority can show pending status and route to the appropriate owner instead.
Document Details includes the full disk path where the viewer is authorized to see it.

Acceptance: mixed seven-item cap, correct destinations, no banner replay from either heading or
item navigation, rich action state/expiry guards, deduplicated reconnect failures, resolution removes
active badges, keyboard/screen-reader access, and full-path wrapping/copy on narrow layouts.

### BF-2026-10-09-04 — Recover from browsing-history save failures

Status: Diagnosed and queued; no application-code change, build or deployment from this report.

The reported Electron main-process dialog shows `ENOSPC` while opening the temporary browsing-history
file. `BrowsingHistory.save()` throws through `visit()` into the browser's `did-stop-loading` event
without a catch. Disk exhaustion is the trigger; the uncaught optional-history persistence failure
is an application bug. After cleanup, the saved JSON is readable, no temporary history file remains,
and the filesystem reports approximately 24 GiB available. This establishes current file readability,
not proof that every visit during the full-disk interval was saved.

For the next batch: preserve the last valid saved history on write failure, clean partial temporary
files, prevent history persistence errors from escaping the page-load handler, and provide a bounded
nonblocking warning. Keep unsaved visits within existing memory limits and retry when storage permits.
Explicit clear/delete/settings operations must report failure honestly and avoid presenting an
unpersisted change as successful. Validate disk-full failures at each atomic-write stage, duplicate
visits, recovery, warning suppression, and a real Electron page-load fixture with injected failure.

## October 8 new issue intake — implementation authorized

The operator's subsequent “love the plan — let's do it” authorizes implementation and build of
this batch, including the queued items below. Native visual changes must be previewed in the
simulators before full integration and physical iPhone/iPad updates. Preserve prior release
edits and deferred Projects. The operator approved the native preview; both Macs, iPad and iPhone now have verified 0.2.9 installations. HC signature/state/relay/provider checks passed after its separately approved artifact transfer. Current work and verification are tracked in
[the live-browser release ledger](2026-10-08-live-browser-release.md).

### BF-2026-10-09-03 — Desktop two-finger close and forward restore

Status: Implemented in source; trusted Electron wheel checks pass for close/reopen and retained drafts. Physical trackpad feel remains an operator check.

A horizontal back gesture closes a selected chat tab without cancelling its run. Browser tabs
use back history first and close at their first page, including a blank tab. Forward uses browser
history first, then restores the most recent tab closed by a swipe. Keep a bounded, memory-only
stack of descriptors, never browser control grants or credentials. Protect text inputs, terminals,
dialogs and horizontal scrollers. Short/vertical gestures and momentum must not close tabs.

### BF-2026-10-09-01 — Native content-edge swipe navigation

Status: Implemented in source; iPhone/iPad swipe navigation checks pass. The operator likes the green
native preview and requested swipe navigation before rollout.

Use a 56-point strip relative to the content edge, including beside the iPad sidebar. A deliberate
rightward swipe returns chat/document/Live Browser content to Chats. Browser content consumes
back history first and returns to Chats when no prior page remains; the right edge supports
forward history. Preserve loaded tabs, drafts and explicit navigation. Middle-of-page, short and
vertical drags must not navigate. Main iPad browser tabs also return to Chats at the history root.

### BF-2026-10-09-02 — Web chat setup must retain expansion

Status: Implemented in source; isolated web UI checks pass for open/closed retention, repeated updates and provider changes.

Retain explicit setup expansion/collapse with the host's new-chat draft through unsolicited
state updates, provider changes and navigation. Start expanded like desktop's visible setup,
use a Start a new chat heading, Run on label, desktop-style spacing and Start chat action. Never
include presentation state in the provider prompt or chat-start arguments.

### BF-2026-10-08-07 — Keep the Chat tab pinned when child tabs overflow

Status: Implemented in source: Chat is outside child-tab scrolling on desktop, web and native. Web overflow geometry is verified; simulator navigation passes. Not deployed.

The operator reports that the **Chat** tab becomes nearly hidden when enough chat child tabs
are open to require horizontal scrolling. Keep the Chat tab anchored and fully visible at the
start of the child-tab navigation, outside the scrolling area for browser/document/other child
tabs. It must remain directly selectable at either scroll extreme and while a child tab is active.

Acceptance: overflow and narrow-window layouts keep the Chat icon/label and click target visible
without overlap or clipping. Scrolling or revealing other child tabs must never scroll Chat off
screen. Preserve child-tab ordering, selection, close behavior and keyboard access. Check local
and remote desktop chat navigation and equivalent overflowing strips on other clients. The
attached screenshot supports the visibility report; private tab titles and URLs stay outside Git.

### BF-2026-10-08-08 — Consistent live find-in-page across every feature

Status: Implemented for loaded DOM/Markdown content on desktop/web, native chat messages and Markdown documents, and native browser find. Electron/browser and iPhone/iPad match navigation are verified. Canvas terminals, closed activity and isolated web HTML previews remain coverage limits; do not claim complete-history or all-surface search.

Provide browser/VS Code-style text search in every feature's respective page, including chats,
Markdown/file views, embedded browser pages and other content views. The search panel slides in
from the upper-right corner of that page and searches its content. As the user types, immediately
highlight matching text and scroll the page to the first matching phrase without requiring Enter.
Keep the content visible while finding matches.

Show the match count to the right of the search box, including the active match position (for
example, `1 of 12`). Provide up/down arrow icons for previous/next match with no surrounding
button boxes. Navigation scrolls the selected match into view and gives it a stronger highlight
than the other matches. Update highlights, active selection and count as the query changes;
show a clear zero-match state and clear highlights when the query is empty or search closes.

Acceptance: keep search scoped to the respective page/tab and preserve typing focus while
scrolling matches into view. Cover multiple matches, phrase searches, no matches, long content,
nested scrolling, streaming chat content and narrow layouts. Provide keyboard-accessible icon
controls and familiar find/next/previous/dismiss shortcuts. Account for incrementally loaded chat
history and virtualized content so match counts do not silently imply complete coverage when
only part of the page has been searched. Verify equivalent behavior across local/remote desktop,
web and native clients where those feature views exist; record any content-specific limitations.

### BF-2026-10-08-09 — Preserve pending-answer and chat drafts across tab switches

Status: Implemented in source. Desktop answers are keyed by chat/request; native answers and ordinary drafts have separate keys. Desktop navigation and native Live Browser switching are exercised; installed acceptance remains pending.

The operator reports that text typed into **Your input is needed** disappears after switching
to a document/browser child tab and returning to Chat. Preserve the unsent answer across those
transitions, and check the ordinary chat composer for the same loss. Keep screenshot conversation
content and private links outside this repository.

Pre-fix source findings: `public/app.js` rendered the local pending `#answer` textarea empty and did not
bind it to a draft store. The ordinary `#followup` composer saves input in `state.chatDrafts[id]`
and restores it during rendering. This supports a pending-answer retention gap; it does not
certify the installed app or every navigation path. `public/remote-desktops.js` already saves
ordinary composer drafts by host/chat and pending answers by host/chat/request. Verify those
paths rather than assuming parity from the local code or from the existing storage alone.

Acceptance: retain exact unsent text in both fields independently when visiting document,
Markdown, browser and other child tabs, switching parent chats, and returning during background
updates. Scope answers to the originating chat and pending request so drafts cannot leak into
another chat or a newer question. Preserve drafts after failed submission; clear the corresponding
answer only after successful submission or resolution of that request. Exercise ordinary
composer text and attachments alongside the pending answer, including repeated switches and
local/remote desktop, web and native equivalents. Report live verification separately from
source inspection. See the current release ledger for implementation and deployment gates.

### BF-2026-10-08-10 — Show a visible agent cursor inside controlled browser tabs

Status: Implemented in source using real browser input coordinates and field bounds. Synthetic Electron click/fill/cleanup checks pass; no installed-page acceptance is claimed.

Show a distinct agent cursor inside the browser page at actual agent mouse actions, with a brief
click pulse and a highlight around fields being filled. Filling may occur without mouse movement;
represent the real target without inventing mouse travel. Leave the operator's system pointer
alone. Hide the overlay when the operation ends, fails or agent access is revoked, and keep the
existing tab activity indicator.

The existing Playwright/Electron stack can support a custom visual overlay; no library replacement
is proposed. Playwright's documented mouse indicator is part of Inspector/Trace Viewer, not a
ready-made Proteus page cursor. See [Playwright Mouse](https://playwright.dev/docs/api/class-mouse).
Integrate with the current authorized browser-action path in `desktop/browser.cjs` and its private
CDP bridge. This feasibility finding does not establish live rendering or remote-client parity.

Acceptance: show only the relevant tab's actual agent actions; the overlay must not intercept
clicks, steal focus or change page layout. Keep positions correct through page scrolling, zoom,
resizing and frame targets. Clean up on navigation, tab closure, completion, failure and access
revocation. Verify mouse clicks and field filling in main/chat/Team browser tabs, and document
which remote/native surfaces can display the actual controlled page and its indicator. Enabling
Agent access alone must not show activity. See the current release ledger for implementation and deployment gates.

### BF-2026-10-08-11 — Live desktop browser viewing and decisions on remote clients

Status: Implemented in source for web and native clients with a separate device grant, encrypted bounded captures, frame-bound instructions and pending decisions. Protocol, Electron capture and web viewer checks pass; native simulator receipts are in the release ledger. Not deployed.

Add a chat-scoped Live Browser tab on iPhone/iPad/web showing the selected Mac's actual browser
session via bounded encrypted page captures. Include follow-agent/manual tab selection, cursor
and action indicators, zoom/pan, timestamp and offline state, instructions and pending answers
without leaving the view, and point annotations bound to the observed tab/frame. Enforce viewing
authorization on the host, separate from agent access. Keep chat delivery ahead of disposable image
frames. Direct remote mouse/keyboard takeover is deferred. Verify hidden/minimized capture,
slow clients, revocation and stale frame references before claiming live operation.

### BF-2026-10-08-12 — Native green theme and consistent navigation

Status: Implemented as a preview. iPhone/iPad green-theme and search previews pass; operator design review remains pending before physical updates.

Bring iPad navigation and native Chat/Life/Team/Engine Room surfaces into the desktop forest-green
palette. Remove duplicate Proteus branding from the iPad top bar while retaining sidebar branding
and the compact logo. Standardize icon meanings, preserve the current native chat layout, and
start activity groups collapsed. Preview the design on iPhone and iPad simulators first.

### BF-2026-10-08-13 — Prevent iPad Chats navigation from reopening another chat

Status: Implemented in source by removing navigation triggered by a stale selected-chat cache. Repeated iPad Chats-list selection passes. Explicit selections and notification routes remain separate.

Selecting the Chats list must remain on the list across refreshes and browser-tab reconciliation.
Only a fresh user selection or explicit notification route should open a chat and its children.
Cover repeated sidebar selection, saved child selections, multiple chats and delayed responses.

### BF-2026-10-08-14 — Recent searches/scheduled chats and active-run indicators

Status: Implemented in source: seven recents by category, running sidebar pulse and list spinner, with reduced-motion support. Native phone schedules also expose recent scheduled chats. Installed cross-platform acceptance remains pending.

Across desktop, web and native clients, show seven recent Internet Search chats and seven recent
schedule-associated chats, matching the Chats recent count. Keep categories distinct. Pulse the
text of running chats in sidebar recents; show the signature circular spinner at the left of
running chat details in full lists. Respect reduced motion and stop animation when work stops.

### BF-2026-10-08-15 — Investigate different Claude model catalogs across Macs

Status: Resolved October 9. HC Claude upgraded through its supported updater from 2.1.246 to 2.1.295 while idle. Fresh CLI/API now agree on 13 models including Sonnet 5.5. The operator confirms Providers refresh corrected the stale picker and declines added new-chat refresh logic. No configured choice, credential or app restart was needed.

Compare fresh provider metadata and actual selected Claude runtime versions on the affected and
working Mac. The screenshots show differing model labels/catalog breadth. Do not hardcode model
versions or copy one account's catalog to another; preserve aliases and runtime-provided effort,
context and speed. Distinguish renderer labeling, stale cache and host runtime/account differences.
Private machine/account evidence stays outside Git.

### BF-2026-10-08-16 — Web chat width and composer parity

Status: Implemented and verified in an isolated web browser; not deployed.

Remove the 1500px conversation-width cap so web chat uses its workspace. Keep Queue/Send,
Steer and Stop in one action row using desktop green/neutral/destructive colors. Show Stop only
for running or awaiting-input turns, not queued or completed runs. Queued follow-ups use the
queue endpoint rather than resume. Tests cover a wide viewport, action alignment, queued and
completed visibility, and the pinned Chat anchor under overflowing children.

## October 8 release run — prior authorization

The earlier release request authorized **build and deployment**, superseding its preceding hold.
The new issue intake above now governs further work.
Current source is 0.2.8. See [the release ledger](2026-10-08-account-chat-release.md) for actual
validation and per-target deployment. The prior backlog is included: previously delivered items
are reconciled against their release ledgers instead of duplicated. Projects remain deferred.
Accounts & Integrations replaces the old Integration profiles page; model-provider sign-in,
Mac transport and website security keep their existing owners.

### BF-2026-10-08-01 — Recover desktop peers without persistent connection notices

Status: Implemented and installed on Build Mac in 0.2.8; 392 Node tests and isolated desktop notice/recovery checks pass. See the current release ledger for other targets.

Background tab synchronization repeats a disconnected-peer IPC error every refresh and resets
the toast timeout. Make connection recovery automatic within saved pairing authority, preserve
retry backoff and explicit disconnect/authentication stops, and never replay a submitted command.
Keep expected background connection failures quiet. Notices need a visible, keyboard-accessible
Dismiss control, finite expiry and duplicate suppression, with readable errors without IPC wrappers.

### BF-2026-10-08-02 — Investigate embedded browser flickering

Status: Redundant native display updates removed, verified with synthetic Electron content and installed on Build Mac in 0.2.8; the reported Jira-page reproduction remains unverified.

The operator reports flickering in an embedded Jira application tab. The exact workplace URL is
retained in the originating chat, outside this repository. Inspect repeated browser show/bounds,
visibility, navigation and refresh events, including main/chat/Team tabs and an embedded app
with changing content. Preserve page state, history, focus and scroll through ordinary polling.
Use synthetic content for checked-in tests; distinguish a reproduced shell defect from verified
resolution of the actual reported page. Browser history-restoration timeout warnings from the
0.2.5 ledger remain a related observation, not proof of the flicker’s cause.

### BF-2026-10-08-03 — Dismiss the needed-input form after Enter submits successfully

Status: Implemented; local focused-Enter/streaming/draft checks and iPhone simulator Enter/feedback checks pass. Remote and website parity is covered by the current release ledger.

The operator reports that pressing Enter in the **Your input is needed** response field sends
the answer but leaves the response box open with the submitted text. The screenshot shows the
answer in the conversation and an assistant response streaming while the old question, answer
field and Send feedback button remain visible. This is a stale response-form report, not a
failure to send. Keep the screenshot's workplace conversation content outside this repository.

Expected behavior: once the host accepts the answer for that pending request, remove its input
form and return to the normal conversation/composer state. Preserve the question and answer in
history. Enter submission and clicking Send feedback should reconcile the resolved request the
same way, even while the answer field retains keyboard focus or a response is streaming.

Acceptance: cover local and remote desktop chats and equivalent web/native keyboard flows where
supported. Keep Shift+Enter multiline input, composition and held-key guards. Prevent duplicate
submission while awaiting acknowledgment; on send failure, retain the form and answer with an
actionable error. Bind dismissal to the exact resolved request so a late acknowledgment cannot
hide a newer question. Preserve unrelated composer drafts, attachments and reading position.
Investigate focus-sensitive refresh/control retention and verify with a synthetic request that
resumes streaming immediately; do not claim a root cause or fix from the screenshot alone.

### BF-2026-10-08-04 — Account health, automatic recovery and reusable agent contexts

Status: Partially implemented in 0.2.8: private consumer/context metadata, desktop and read-only web overview, evidence-aware status, passive live-session checks and bounded runtime recovery. Isolated credential selection, independent identity/resource probes, expiry renewal and grouped notifications remain adapter work; no live account verification claimed.

The operator reports an MCP `needs-auth` history message while the same named connection's
dialog reports connected. Code inspection finds persistent historical failure notices alongside
separate current runtime status; the dialog omits available observation time/session scope.
This does not establish that the current account is expired or that resource access is healthy.

Evolve Engine Room Integration profiles into **Accounts & Integrations** with explicit identity,
consumer and resource context, current evidence, expiry when reported, recovery history and
impacted chats/schedules. Support a generic number of separate identities, each with multiple
tenants/subscriptions/sites/organizations. Agents should select authorized, already signed-in
contexts by stable IDs without global account switching or disrupting other chats. Do not
hardcode workplace domains, account counts or private identity details.

Use provider-owned silent renewal and read-only verification where supported; background checks
must preserve active sessions, honor rate limits and distinguish real resource access from
transport connection. Unknown expiry remains unknown. Human sign-in remains necessary for some
MFA/consent/policy/revocation cases. No automatic retry of an ambiguous external write.

The detailed proposal, runtime capability limits, delivery sequence and acceptance cases are in
[MCP connection recovery](mcp-auth.md#proposed-account-health-and-reusable-contexts--october-8).
Credential isolation remains unimplemented across the current providers. Existing
needed-input, peer connection, approval and browser issues remain separately tracked.

### BF-2026-10-08-05 — Edit queued messages and retain steering conversion

Status: Implemented in local/remote desktop, web and native source. Edit preserves the message ID,
attachments and next-turn model options. Exact current-text and queue-membership checks reject
stale edits or already processed/steering-in-flight messages. Eligible text-only messages retain
Steer now during a running turn; failed steering keeps the queued message. See release validation.

### BF-2026-10-08-06 — Engine Room organization and cross-client parity

Status: Implemented. Accounts & Integrations replaces Integration profiles; Mac Connections,
Providers and Proteus Account & Security remain distinct. Website shows read-only integration
metadata and delegates supported checks/recovery to the selected default Mac. Remote desktop and
web render every permission choice offered by the host, plus pending chat-only approval. Composer
queue/edit/steer, retained drafts and pending-answer reconciliation share host validation.

## October 7 queued approval-prompt change

### BF-2026-10-07-42 — Offer chat-only auto-approval at a pending tool request

Status: Implemented in local/remote desktop, web and native source. Desktop/web UI and permission regressions pass. Focused iPhone simulator verification now passes; deployment is tracked in the current release ledger.

When a chat pauses for tool approval, show **Auto-approve this chat and future continuations**
alongside the existing approval choices. The operator should not need to open the details panel
to discover or enable the existing chat-scoped mode. Selecting it enables that mode for this
chat and re-evaluates the pending request under the existing permission rules. Keep Approve once
and Deny available, and clearly distinguish chat scope from workspace-wide choices.

Acceptance: apply consistently to local and remote desktop chats, web, and native clients;
leave workspace settings and other chats unchanged; retain restart/continuation persistence,
revocation, stale-request/context checks, and mandatory approval/access boundaries. A pending
request that still needs explicit approval must remain pending with its reason visible.
This is approval-prompt placement, not a new composer control or automatic answers to questions.

## October 7 desktop tab-layout correction

BF-2026-10-07-41: Fix shell and Markdown/file child-tab borders and spacing across local/remote chat views. Implemented for 0.2.7 and verified on Build Mac; HC staged with terminal/approval gates pending. Both Mac deployments authorized. See [the tab-layout release ledger](2026-10-07-tab-layout-release.md) for validation and installation status.

## October 7 post-0.2.5 intake — implementation and deployment authorized

The operator's subsequent “build it, deploy it, validate it” supersedes the initial hold.
All items below are implemented in the 0.2.6 source batch. Build Mac, website, iPad and iPhone
are installed; HC subsequently completed its verified 0.2.6 installation. Validation and individual installation
status are recorded in [the release ledger](2026-10-07-search-release.md). Private screenshots,
actual search queries, document names and workplace content remain outside Git.

| ID | Scope and acceptance |
| --- | --- |
| BF-2026-10-07-29 | Show literal file-search patterns outside Details, wrapping long queries on desktop, web and native. |
| BF-2026-10-07-30 | Separate User Chats, Scheduled Tasks and Internet Searches in Chats; preserve filters; exclude scheduled runs from sidebar recents. |
| BF-2026-10-07-31 | Internet Search composer: workspace, prompt, attachments/paste and catalog provider buttons. Host-owned model/effort/speed defaults in Engine Room; enforce workspace defaults at execution. |
| BF-2026-10-07-32 | Internet Search navigation/global add menu, seven recents per user/search list, no redundant More; one-way promotion beside Archive. |
| BF-2026-10-07-33 | Correct workspace/rename dialog spacing and persist/display renamed titles across local and remote refreshes. |
| BF-2026-10-07-34 | Lowercase runtime units, preserve metadata capitalization, show web execution timers and align web composer/actions/filters with desktop. |
| BF-2026-10-07-35 | Inset only assistant responses on the right, retaining full-width activity/system messages. |
| BF-2026-10-07-36 | Select iPad popup tabs immediately; retain each chat's ordered browser descriptors when its parent closes and restore them unloaded. |
| BF-2026-10-07-37 | Permission decision messages include short original intent and expandable bounded, redacted request details. Older entries without stored requests say so. |
| BF-2026-10-07-38 | Supply provider runtime app guidance and a real Markdown document-tab tool; reuse stable descriptors, honor current workspace roots and normal approval. |
| BF-2026-10-07-39 | Enter sends from chat composers; Shift+Enter preserves multiline drafting. Preserve composition, held-key and paste behavior. |
| BF-2026-10-07-40 | Convert an existing queued text message to steering using its identity; preserve queue on failure, remove only after successful provider delivery, never run concurrent turns. |

## October 7 post-0.2.4 feedback — implementation authorized

The operator authorized implementation, build and installation of this follow-up batch, including
four performance/navigation additions below. Sanitized screenshot evidence is retained in these
entries; private source material remains outside Git. Current validation/deployment status is in
[the follow-up release ledger](2026-10-07-followup-release.md). Build Mac, iPhone and iPad 0.2.5 are installed, and the website release is live; HC has verified the staged update but awaits direct chat confirmation. Installed inspection also found a repeated disconnected-peer toast and browser history-restoration timeout warning; retain these for follow-up live reproduction.

### BF-2026-10-07-18 — Edit and resend sent or cancelled messages

Status: Queued.

Add an Edit/resend action to the user's sent and cancelled messages. Populate the current message
field with the previous contents, focus it, and let the user revise and explicitly send again.
This is draft reuse: preserve the original transcript entry and its delivery/cancellation state;
do not rewrite provider history, replay automatically, or create a concurrent turn.

Acceptance: cover sent and cancelled entries, multiline text, keyboard access, and an existing
unsent draft without silently discarding it. Identify any original attachments and restore only
still-available, authorized draft references; clearly report unavailable files and retain normal
submission consent/capability checks. Send/Queue/Steer retain their existing semantics, and a
resubmission receives a new message identity. Verify local and remote chat behavior and document
any client scope still deferred.

### BF-2026-10-07-19 — Discover and use named browser tabs within chat navigation

Status: Queued investigation and completion; basic authorized tab listing already exists.

Requested flow: “Look at the X tab for context” should find the existing browser child in chat
navigation, read it and interact with it through the existing browser tool, without opening a
duplicate page merely because the tab is nested under a chat.

Source evidence: `src/browser-tools.js` exposes `proteus_browser` list and interaction actions.
`desktop/browser.cjs` lists tabs across its registry and filters agent results by explicit sharing
or ownership by the current run, not by main-versus-chat placement. State includes title, URL,
tab ID and parent ID. Thus eligible chat children appear supported in source; installed/provider
end-to-end discoverability and natural-language selection have not been verified by this intake.
BF-08 covers placement of new tabs; this item covers finding and using existing tabs.

Acceptance: exercise a human-opened chat child with Agent access enabled, a current-run-owned
child, inactive children, duplicate titles, renamed tabs, close/reopen, and revoked access.
Resolve title/URL references to the correct stable tab and chat/host; clarify ambiguous matches.
Use fresh page snapshots before interaction and preserve chat placement. Private tabs remain
private until shared; report missing access accurately without claiming missing authentication
or silently granting control. Verify each supported provider's tool exposure and remote routing;
report any unsupported route explicitly. Keep page content treated as untrusted evidence.

### BF-2026-10-07-20 — Restore the approved compact new-chat composer

Status: Queued correction; BF-04 visual acceptance reopened by operator feedback.

The delivered message area is too tall and contains too much explanatory copy. Provider/model
controls consume large columns, while Start chat sits on a separate lower row. The operator
expects the [approved design](design/2026-10-07/new-chat-approved.html), with compact provider,
model and applicable effort/speed/context controls at the bottom beside Attach and Send/Start chat.
Keep Cancel separate. Remove routine catalog timestamps, refresh cadence and provider capability
explanations from the default composer; retain concise actionable loading/validation/errors and
make secondary information available on demand where useful.

Read-only source evidence: `public/app.js` renders a separate `.new-chat-submit` row and catalog
status paragraph. `public/style.css` grows toolbar fields with `flex:1 1 160px`, makes notes span
the toolbar, and gives the submit row extra margin. These structures explain the visible departure
from the requested compact bottom toolbar; previous synthetic layout checks did not establish
operator acceptance of the design.

Acceptance: compare actual desktop new-chat UI against the approved sample and continued-chat
composer at wide/narrow widths and increased zoom, before/after provider selection and with
attachments. Use one compact wrapping bottom action bar without excessive reserved footer space,
overlap or clipped controls. Preserve accessible labels, keyboard flow, destination/draft state,
fresh provider metadata and real errors. Require actual UI review; a clean build is insufficient.

### BF-2026-10-07-21 — Match full-chat attachment placement in new chats

Status: Queued correction; linked to BF-04 and BF-20.

The screenshots show attachment chips taking space alongside provider/model fields and the plus
control sitting above them. Match the full chat tab's message box: a bounded preview/filename strip
above the bottom controls, with per-item removal, and an unboxed Attach button on the same bottom
bar as provider/model and Send/Start chat. Reuse the established composer/picker behavior.

Acceptance: verify zero, one and multiple files, image previews, long names, removal, paste,
keyboard access and narrow windows. Chips must not push model fields into oversized columns or
separate the send action from its toolbar. Preserve attachment references and draft text through
provider/destination changes, and keep existing delivery consent and format checks intact.

### BF-2026-10-07-22 — Handle disk-full errors without an uncaught main-process exception

Status: Queued reliability fix; highest priority in this intake.

Reported while the new-chat dialog was open. The screenshot explicitly shows `ENOSPC: no space
left on device` opening `scheduler-errors.json.<id>.tmp` in application data. The stack passes
through `atomicJSON` (`src/files.js:14`) and the scheduler-error listener (`src/server.js:126`),
then a timer callback. This identifies a failed error-log write, not proof that the composer
caused the storage exhaustion or that any particular folder should be deleted.

Current source calls `atomicJSON` directly from that listener without catching persistence failure.
Investigate the initiating scheduler error as well as this secondary reporting failure. Keep the
app responsive with concise actionable storage feedback; avoid recursive error logging, repeated
exception dialogs or tight retry loops. Never report a failed durable save as successful.

Acceptance: inject ENOSPC at temp-file open/write/fsync/rename using isolated data. Preserve the
last valid file, clean up temporary files where possible, bound any in-memory diagnostic fallback,
and ensure diagnostic persistence failure cannot escape the event/timer handler. Verify recovery
after writable storage returns and related permission/I/O failures. Preserve drafts and existing
chat/schedule state, and keep execution gated when required state cannot be saved safely. Run
`npm test`, `npm run check`, and an isolated desktop error-path exercise; do not fill the real disk
or delete user data to test this. Live disk usage and recovery are not verified by this intake.

### BF-2026-10-07-23 — Restore tab close separators and the final chat-tab border

Status: Source correction implemented; desktop verification and installation tracked in the follow-up release ledger.

Restore the vertical separator immediately before the × close button where it is missing in
tab navigation. Restore the trailing/right closing border on the last tab in the chat's child
tab strip. The screenshot shows chat-child close controls without their separators; the final
child tab also lacks its closing edge. Match the established main-tab styling and spacing.
The screenshot is visual evidence only; no page contents or machine-specific paths are retained.

Acceptance: inspect main and chat-child navigation with one and multiple tabs, active/inactive
and hovered tabs, long truncated titles, and narrow/overflowing strips. Every closable tab retains
its separator before ×, and the final chat child has a visible closing border without doubled
inter-tab borders. Preserve the active underline, close-button hit area, keyboard focus and
existing close/selection behavior. Exercise the desktop UI with synthetic tabs and compare the
actual rendering to the reported regression. This intake records no implementation or UI fix.

### BF-2026-10-07-24 — Stop remote-chat footer flicker and composer layout shifts

Status: Implementation in progress; operator reports it occurring live on the Work Mac on October 7.

In the remote chat view, a message repeatedly appears and disappears at the bottom, pushing the
message box upward. Keep the composer stable while remote state updates. The attached still
image shows the composer and Jump to latest control but does not identify the transient message
or establish the repeated motion. Subsequent screenshot shows a disconnect notice occupying the primary grid column and the chat
squeezed into the details column. Source review found the banner inserted as an extra grid child
and the composer rebuilt with a loading-model notice on refresh. These causes are being corrected;
no live HC inspection was performed during this intake. The operator offered that Mac for live
observation. Record only sanitized UI evidence; professional chat contents stay outside this repo.

Investigation: capture the transient footer text and timing, then trace remote refresh/render,
connection and provider-metadata status changes to the responsible element. Determine whether
unchanged state is repeatedly inserting/removing a notice or another element is changing height;
do not assume Jump to latest, network recovery or model metadata is the cause from this image.

Acceptance: observe multiple refresh cycles in idle and streaming remote chats, while typing and
while reading older messages, including transient disconnect/reconnect and real error states.
Unchanged status must not flash or repeatedly shift the composer, transcript or scroll position.
Keep genuine loading/error feedback visible and actionable without repeated layout churn; preserve
draft text, caret/focus, attachments, selected options and Send/Queue/Steer/Stop behavior. Check
local-chat parity and wide/narrow desktop layouts. Exercise the desktop UI with synthetic remote
state updates and verify the reported HC scenario separately when available; a static screenshot
or build alone does not establish that an intermittent flicker is fixed. Run required execution/
persistence checks if the eventual correction touches those paths.

### BF-2026-10-07-25 — Release automation connections and retain resumable tabs

Status: Source implemented; validation and installation tracked in the follow-up release ledger.

Release active automation ownership and Playwright connections when a model turn completes,
fails or is cancelled. Preserve tab ID, chat placement, page state and history so the same chat
can discover and reuse its existing tabs on continuation. Separate the resumable chat association
from an active connection; do not grant unrelated chats access. Explicit revocation/move must
clear the association. Restored descriptors after app restart remain subject to Agent access;
never persist credentials or browser-control grants in the workspace descriptor file.
Verify continuation, unload/reload, revocation and failed/cancelled turn cleanup.

### BF-2026-10-07-26 — Replace full-history polling and bound retained chat views

Status: Source implemented; validation and installation tracked in the follow-up release ledger.

Use lightweight summaries for the application refresh loop. Fetch the selected chat's history
on demand, page earlier events and send incremental changes with cursor recovery. Handle changes
to existing events as well as appends/streaming without duplicating or dropping messages.
Bound inactive rendered views and completed host history caches while preserving drafts,
selected tabs, durable history, live provider references and reading position. Verify long
histories, multiple chats, stale cursors and reconnects. This is not authorization to delete chats.

### BF-2026-10-07-27 — Throttle inactive browser tabs with visible/automation exceptions

Status: Source implemented; validation and installation tracked in the follow-up release ledger.

Enable background throttling on inactive browser pages. Visible tabs and pages under active
automation are exempt; restore throttling when those exceptions end. Preserve appropriate audio
activity exceptions. Throttling keeps pages loaded and must not discard forms or navigate/reload
them. Do not conflate this request with aggressive unloading or a new memory-budget policy.
Exercise actual Electron visibility transitions and temporary automation exceptions.

### BF-2026-10-07-28 — Reveal and highlight the current tab in overview

Status: Source implemented; validation and installation tracked in the follow-up release ledger.

When overview opens, highlight the currently visible tab and scroll its card into view. Keep the
overview vertically scrollable with many cards, keyboard reachable and scoped to main/chat/Team
navigation as appropriate. Test a selected card below the initial viewport and reopening after
changing selection, without navigating or duplicating the underlying tab.

## October 7 0.2.4 rollout

The [implementation ledger](2026-10-07-implementation.md) records current scope and acceptance.
Both Macs, website, iPhone and iPad have verified 0.2.4 installations.
Both physical mobile devices now run 2610.7.1 with data, preferences and paired destinations
preserved. Earlier build and installation statements below are historical baselines.

## October 7 late native review

Source correction for desktop-origin chat titles, atomic tab reconciliation, full mobile Home
guide popup, iPad Home heading/active sidebar and new-tab visibility passed simulator checks
for build 2610.6.4. The physical iPad installed and launched that build on October 7 at 13:30 UTC,
with data/preferences/pairing preserved. The iPhone remains on 2610.6.3 pending its update. The title failure reproduced before the change. Seven distinct iPad cases cover
transport/reconciliation, retained views, repeated sync, history/backgrounding, heading/sidebar,
new-tab visibility, existing strip position and guide dismissal. The extended transport case and
guide popup also pass on iPhone. All 368 Node tests and static checks pass. Signed artifact
`684e1cb`, 0.2.3 (2610.6.4), preserves signer/profile/entitlements. The initial locked iPad
attempt was superseded by the successful morning installation; private receipts are retained.

## October 7 live-review follow-up

Implemented and deployed from `56a074d`: compact API-backed Standup link tables; stable link IDs;
new-tab address focus and 20 recent sites with date/device; bounded resource titles; green native
tab strips; shared desktop/web allowance popups and corrected sidebar ordering; plain nested web
Activity Details. Both Macs, website and physical iPad/iPhone are updated. Native build: 2610.6.3.
368 Node tests, static/package/UI checks and 14 website deployment endpoint checks passed.

Both Macs' hands-on checks resumed October 7 after unlock. Build Mac passed Home, sidebar,
Standup table, Resources cards, Notifications structure, usage popup/refresh, address autofocus,
recents and safe tab-close checks. HC passed allowance popup/Refresh, address autofocus, 20
recents with dates/devices and Standup table checks. Remaining HC UI checks are open while its
user-requested Claude CLI sign-in is waiting on that chat’s approval gate. The complete
[acceptance audit](2026-10-07-acceptance-audit.md) distinguishes deployed changes, fixture checks
and remaining live workflow gates. Installation is not blanket acceptance of every original item.

## October 7 next-version intake — queued for build handoff

The operator requested this planning PR on October 7. The 17 items below are requested work,
not implemented fixes. The new-chat design in BF-04 is approved; the other proposals retain
any investigation or design qualifications stated in their entries. See the
[October 7 build handoff](2026-10-07-build-handoff.md) for dependencies and validation limits.
These items are separate from the October 6 intake; repeated chat-browser routing feedback
is consolidated into BF-08 rather than duplicated.

### BF-2026-10-07-01 — Reconnect automatically after network recovery

Current status: Implemented and regression-tested; both Macs deployed; installed review and remaining live gates recorded separately. See [implementation and acceptance](2026-10-07-implementation.md).

#### Report and evidence

The desktop Chats screen reports “Some Macs are offline. Cached statuses are unverified and
excluded from Needs attention; inspect them in Chats.” A toast reports:
“Error invoking remote method 'proteus:desktop-peers': Error: Connect the selected Mac first.
No local action was taken.” The local runner indicator is online.

A network interruption is the operator's suspected cause, not an established diagnosis.
The error means the requested paired-Mac session is unavailable; it does not establish whether
the client network, destination Mac, relay, or authentication caused the interruption.
Private chat contents, hostnames, URLs, usage figures, and the original screenshot are omitted.

Read-only source inspection found:

- `src/desktop-peers.js` rejects a request when the destination is absent or its client is not
  online. Its aggregate index attempts connections when refreshed, so some opportunistic
  reconnection already exists.
- `src/remote-client.js` closes failed connections and rejects pending requests. The inspected
  transport does not schedule reconnection itself.
- `public/remote-desktops.js` directs users to reopen a remote tab or reconnect manually after
  a disconnect. Automatic restoration must include the open conversation, not only its socket.
- The installed app differs from this checkout. Inspect and reconcile the current implementation
  before editing; this checkout is not proof of the latest installed behavior.

#### Requested behavior

Restore previously connected, still-authorized Mac sessions automatically when the network and
destination become reachable again, including after sleep/wake, Wi-Fi changes, and temporary
relay outages. Recover in place without restarting Proteus, reopening a tab, or pairing again.

Show a concise connection state for the affected Mac: reconnecting, waiting for the Mac or
network, or requiring user action. Offer Retry now and connection details when useful. Expected
temporary outages should not surface raw Electron IPC errors or repeated toast messages.
Distinguish the local runner's health from remote destination connectivity.

#### Acceptance criteria

1. Restoring connectivity triggers a prompt retry for eligible sessions. Use bounded exponential
   backoff with jitter while unavailable; network-restored and wake events may accelerate retry.
   Handle a silent broken socket as well as an explicit close. Avoid tight loops and concurrent
   connection attempts for the same host.
2. After authenticated reconnection, refresh the affected chat index, open conversation and
   event subscription/cursor, and Needs attention status from authoritative host state.
   Clear stale warnings for recovered hosts; retain accurate warnings for any still offline.
   Never mark cached status current merely because the network or socket is available.
3. Preserve the selected Mac, chat, tabs, unsent drafts, and pairing. Never fall back to local
   execution or another Mac. Do not replay prompts, approvals, replies, cancellations, schedule
   edits, or other mutations automatically. Reconcile uncertain outcomes before offering retry,
   retaining existing request identity protections.
4. Respect explicit disconnect, Forget, authenticated revocation, and application shutdown.
   Cancel pending retries and prevent late callbacks from restoring a removed connection.
   Authentication or protected-storage failures receive actionable guidance without endless
   retries, credential deletion, weakened storage, or automatic re-pairing.
5. Test multiple hosts independently: a reachable host recovers while another remains offline.
   Verify outage during an active remote chat and during an in-flight mutation without duplicate
   execution, lost draft, mixed-host state, or concurrent turns in a session.
6. Cover network loss/return, destination sleep/wake, relay restart, repeated network flapping,
   silent socket loss, manual disconnect, removal/revocation, authentication failure, and quit
   during backoff with isolated tests. Exercise desktop UI recovery with synthetic hosts and
   data. Run `npm test` and `npm run check` for execution/persistence changes. Report installed
   live reconnection separately from test/build success.

#### Implementation scope and release handling

Primary scope is desktop-to-Mac recovery and the related Chats UI. Inspect the shared transport
and existing website/native recovery paths for regressions; broader client redesign is not
implicitly part of this item. Likely owners are `src/desktop-peers.js`, `src/remote-client.js`,
`public/remote-desktops.js`, `public/chats-index.js`, and desktop lifecycle integration.

The installed desktop bundle's designated requirement uses an Apple Development identity.
That establishes the signing identity, not which physical Mac produced it or whether this Mac
has the corresponding private key. Source editing is separate from building or installing.
A later installation should retain the existing signing requirement and vendor helper signatures,
then verify real Keychain and saved-data continuity using the documented installation workflow.
No signing identity, credential, Keychain item, or running app was changed during this intake.


### BF-2026-10-07-02 — Review schedule page layout and prevent text overlapping actions

Current status: Implemented and verified at three desktop widths. See [implementation and acceptance](2026-10-07-implementation.md).

#### Report

The schedule detail screenshot shows the source ownership and manifest-path text running beneath
the **Open source manifest** button. Long paths also put pressure on the exported-file description
and source-of-truth card. Review the schedule page as a whole for text overflow, button placement,
spacing, and responsive behavior. Private schedule names, source contents, and machine paths from
the screenshot are intentionally omitted.

#### Requested design

Give source ownership, source manifest path, and exported schedule path distinct labeled text
areas. Place **Open source manifest** on a separate action row below its text so its width cannot
obscure the path. Use the same clear separation between descriptions and file actions in the
source-of-truth card. Long paths should wrap within their container, including long segments
without spaces, and remain selectable and readable.

Review the title and Run now area, settings fields, model refresh action, preview card, source
card, and remaining editor controls for consistent alignment and sufficient space. Let columns
and action groups stack when space is limited. Preserve the distinction between the owning
repository's source manifest and the exported file Proteus reads.

#### Acceptance criteria

1. No label, description, path, or heading renders beneath a button, beyond its card, or over an
   adjacent control. Verify long synthetic schedule names and deeply nested paths, including
   unbroken path segments, at wide and narrow desktop window sizes and increased text/zoom size.
2. Source and exported paths remain fully accessible without relying solely on hover tooltips.
   Multiline wrapping does not hide actions or create page-wide horizontal scrolling. Inputs
   such as cron expressions keep their full values accessible through appropriate field behavior;
   visual truncation must not change saved values.
3. Buttons remain visible, keyboard reachable, and clearly associated with their text after
   wrapping or stacking. Keep Run now visually distinct from file-opening and preview actions.
4. Exercise the actual desktop schedule editor with synthetic data, including both externally
   owned and ordinary local schedules. Inspect the full page, not only the reported source row.
   Verify file actions still target the correct file and layout changes do not run, enable,
   save, or otherwise modify a schedule inadvertently.


### BF-2026-10-07-03 — Restore clear versioned Claude model labels across chats and schedules

Current status: Implemented from refreshed provider metadata. See [implementation and acceptance](2026-10-07-implementation.md).

The operator reports a possible regression in Claude model presentation after an earlier fix.
The screenshot shows short family labels mixed with resolved identifiers, alias annotations,
and invocation aliases, such as `Sonnet · claude-sonnet-5 (alias) · sonnet`. Versions are present
in some identifier text, but the human-readable names and alias presentation need review.
Do not describe this as proven missing catalog entries without checking refreshed metadata.

Use one consistent model catalog and label formatter for new chats, existing-chat settings,
and schedules. Show a readable family and version from provider metadata; make an alias or
provider default distinguishable from a pinned model version without repeating redundant IDs.
Preserve the actual invocation identifier separately from its display label. Review the prior
fix and installed build before deciding whether the cause is stale metadata, adapter discovery,
or different formatting paths.

Acceptance: for the same destination, provider, and refreshed catalog, all three surfaces show
the same eligible models, versions, and alias semantics. Effort, context, and speed choices come
from that metadata, never a model-name table. Distinguish an unselected model, catalog loading,
catalog failure, and a saved model that is no longer available. Do not show an unavailable-model
warning merely because the user has not selected one. Preserve saved identifiers and unsupported
selection feedback without silently substituting a model. Cover aliases, pinned versions, unknown
capacity, catalog changes, and unavailable saved selections in focused tests and UI checks.


### BF-2026-10-07-04 — Widen and simplify the new chat dialog

Current status: Source implemented, but operator visual acceptance reopened after 0.2.4 review. BF-20/21 queue compact toolbar and attachment corrections. New arbitrary remote roots require owning-Mac configuration. See [implementation and acceptance](2026-10-07-implementation.md).

Replace the tall form with a substantially wider desktop dialog, initially targeting about
1,240 CSS pixels subject to viewport margins, and use the existing continued-chat composer styling.
Put Run on and Workspace side by side; pair Command starting folder with the optional chat name.
Command starting folder must be a dropdown of the selected workspace's folders, initially set to
that workspace's configured default. Additional folders selected for this draft are also available
as starting folders. Do not silently rewrite the workspace's saved default.

Workspace folders is an expander listing the folders already configured for the workspace.
Provide a **+** action to add additional folders for this chat, with clear distinction between
configured and added folders and removal for draft additions. Keep these additions scoped to
the new chat unless a separate explicit workspace-edit action is taken. Removing a chosen starting
folder must leave a valid starting-folder selection, with clear feedback.

Reuse the existing **Instructions, skills, agents & MCPs** system and its minimizer/expander;
do not redesign it or replace it with simplified toggles. Retain source loading modes, summary
and estimates, source-loading reasons, Favorites and Check all favorites, other-source filtering,
selection and favorite controls, main agent, source refresh, and existing explanatory copy.
The demonstration uses synthetic source entries; implementation must embed the existing component.

Move Attach into the composer toolbar at its left edge, next to the message controls, rather
than between Cancel and Start chat. Display selected attachments inside the composer with removal
controls. Keep the primary Start chat action at the composer's lower right and Cancel separate.
The **+** attachment control must have no visible bounding box, matching continued chats while
retaining an accessible hit area and keyboard focus indication.

The Provider dropdown initially reads **Select provider first** with no provider preselected.
Hide Model, Thinking effort, Speed/service tier, and Context controls until a provider is chosen.
Then populate from refreshed metadata for that provider on the selected destination, sharing the
versioned labels requested in BF-03. Provider, Model, Thinking effort, Speed/service tier, and
Context size form one wrapping toolbar; do not impose separate rows or a dividing line. Retain
the visible field labels for new chats. Remove the model-refresh button: provider changes
automatically refresh appropriate options, while genuine load failures may offer retry.
Omit unnecessary coaching such as “Choose a model, then write your message” and “Ready when
you are.” Keep useful validation, loading, and error feedback.
In the demo, model lists are illustrative samples, not a live catalog or capability commitment.

Acceptance: changing provider clears incompatible model/capability choices and prevents stale
catalog responses from populating the wrong provider. Changing destination refreshes availability
and capabilities for that Mac without changing execution ownership silently. Preserve message,
attachments, workspace choices where valid, and chat name through provider changes. Start chat
remains unavailable until required destination/workspace/provider/model state is valid and the
composer has valid content under existing submission rules. Show clear loading, empty, and error
states; never treat metadata failure as permission to guess model capabilities.

Verify the wide layout, narrower windows, keyboard flow, increased zoom, expanded advanced
sections, and attachment selection/removal. Controls must wrap or stack without overlap, clipped
paths, or inaccessible actions. Keep all existing authorization and workspace context controls.

Design preview: [approved new-chat design](design/2026-10-07/new-chat-approved.html). Its controls simulate
the flow only; it does not start chats, read files, or contact providers. The revised design
incorporates the operator's folder, existing-source-selector, and wrapping-composer feedback.
**Design approved by the operator on October 7, 2026.** This preview and the requirements above
are the accepted design reference for implementation. Sample data and model capabilities are
illustrative; use actual workspace configuration and refreshed provider metadata in the app.
The intake design approval was followed by a separate implementation/deployment authorization;
current verification and remaining scope are recorded in the implementation ledger.

### BF-2026-10-07-05 — Make tool approval duration and scope explicit

Current status: Implemented; existing approval grants and enforcement preserved. See [implementation and acceptance](2026-10-07-implementation.md).

The operator asks whether **Auto-approve tools for this workspace** lasts only for the current
chat. The current wording leaves its lifetime unclear, and **Approve once and trust workspace
files and read-only tools** mixes a one-time approval with a persistent policy change.

Read-only inspection of the checkout and installed permission store confirms that workspace
auto-approval is saved in the executing host's `permissions.json`, not only in the current chat.
It applies across chats and schedules, and survives restart, for the same computed permission
context. That context includes provider, canonical working directory, workspace roots, and
configured integrations/skills/agents. A different provider or changed context can require fresh
approval even when the visible workspace name is unchanged. The setting is host-local.

The installed build also has a separate **Auto-approve for this chat only** action in approval
settings. That override is saved with the chat and survives continuation/restart, but does not
apply to other chats. It ends when revoked or when that chat's permission context changes.
Distinguish this option explicitly from the workspace-wide action shown in the screenshot.

#### Requested wording and presentation

- Label the broad action **Save auto-approval for this workspace**.
- Put its duration directly beside the action: **Applies to this chat and future chats and
  scheduled runs on this Mac with the same provider and workspace configuration. Stays enabled
  until you change or revoke it.** Use the actual destination label when controlling a remote Mac.
- Give **Approve once** its own unambiguous explanation: **Only this request; does not save a
  rule.** Rename the mixed trust action to **Approve and save workspace trust**, with a concise
  description of the file and read-only tool access it saves.
- Distinguish one-time actions from saved rules visually. Show the current saved mode and a
  direct route to manage/revoke workspace approvals, with an expandable explanation of the
  provider/configuration scope rather than relying on a tooltip or a long footer.
- Where chat-only approval is offered, use **This chat only, including future continuations**
  and explain that it survives app restart. Clearly separate request-only, chat-only, and
  workspace-wide lifetimes, and show which policy supplies the effective approval mode.
- Preserve the existing explanation of breadth: terminal commands and configured tools are
  included; terminal commands are not confined to workspace folders. User questions,
  enterprise-required approvals, and sandbox bypass requests still pause. Do not imply that
  every tool action is approved without exception.

Acceptance: permission prompts and approval settings consistently identify what is approved,
how long it lasts, which host/provider/workspace configuration it covers, and how to revoke it.
Verify persistence across a new matching chat, a matching scheduled run using synthetic data,
and restart; verify separation across providers, hosts, or changed workspace configuration.
Check all clients exposing these actions and wrap descriptions at narrow widths. This is a
clarity change, not authorization to broaden approval scope or change current saved permissions.


### BF-2026-10-07-06 — Show live command, activity, group, and chat runtime

Current status: Implemented on desktop/web/native; both simulator checks pass. Physical native installation awaits unlock. See [implementation and acceptance](2026-10-07-implementation.md).

#### Requested displays

- **Each command/AI turn:** Show an elapsed timer on the right of its response/run header,
  opposite the provider name and date/time shown on the left in the supplied screenshot.
  Display it while the command is running, update it in real time, and retain its final duration
  on completion. Each continuation/command has its own timer; do not repeat the entire chat's
  cumulative time on every response. Group multiple response fragments from one turn correctly.
- **Each chat:** Put **Total AI runtime** near the top of Run details. Accumulate runtime across
  the chat's commands/turns, including continuations, and update the total while work is active.
- **Each activity:** Display its own live elapsed timer, then its final duration, alongside
  the activity's existing status. Cover tool/command activity and other timed activity kinds.
- **Activity and other groups:** Show an aggregate timer in each group header, including when
  collapsed. Nested and parent group totals should remain consistent with their member activities.

#### Timing semantics and investigation

Use authoritative execution timestamps and lifecycle events, not time since the UI opened.
Inspect the existing event/turn timing data before implementing; add explicit timing events only
where necessary. Define **Total AI runtime** as the cumulative active execution time of this chat's
AI turns, including tool execution within those turns, excluding queue time, idle time between
turns, and time paused for user input/approval. This is elapsed orchestration time, not a claim
about provider inference time, billable usage, or CPU time. If provider-only processing time is
available, label it separately rather than conflating the two.

For group totals, aggregate the union of active child intervals so parallel children and nested
groups do not count the same elapsed time twice. If summed tool work is also useful, show it as a
separately labeled measure. Keep human-wait duration distinguishable from active execution;
approval or question activities may show a clearly labeled **Waiting** timer without adding it
to AI runtime. Document these counting rules with the eventual implementation.

#### Acceptance criteria

1. Active timers refresh about once per second without reloading or resetting the chat, moving
   scroll position, or disrupting input. Format durations consistently as seconds, minutes, and
   hours as needed; align numerals to avoid jitter. Preserve existing status and error indicators.
2. Timers freeze or resume according to the actual running/waiting/terminal state. Completion,
   failure, and cancellation retain measured durations; stopping a view's animation does not
   stop execution or change recorded timing.
3. Reopening a chat, reconnecting, and restarting the app reconstruct the same durations from
   durable data, including completed turns. Offline cached timers must be marked stale or
   unverified rather than continuing to imply confirmed remote activity. Reconcile on reconnect.
4. Missing timing evidence in historical chats shows **Unavailable** or an explicitly labeled
   estimate, not an invented zero or exact duration. Handle remote clock skew and stale events
   without negative durations, duplicate intervals, or inflated totals.
5. Check commands with multiple response fragments, sequential continuations, parallel tools,
   nested groups, pauses/resumes, tool failures, cancellation, and reconnect. A parent elapsed
   total must not grow simply because its children are also counted individually.
6. Keep the header timer opposite provider/date on wide screens, with clean wrapping on narrow
   screens and at increased zoom. Group timers remain visible while collapsed. Avoid screen-reader
   announcements every second; retain accessible duration labels and meaningful status changes.
7. Apply consistent semantics to desktop, website, and native clients wherever these chat/run
   surfaces exist. Use synthetic fixtures; run `npm test` and `npm run check` for execution or
   persistence changes, plus UI validation for each changed client. Separate measured live-run
   verification from fixture success.


### BF-2026-10-07-07 — Preserve original user questions in chat history

Current status: Implemented and persistence-tested. See [implementation and acceptance](2026-10-07-implementation.md).
October 13 follow-up reopens Copilot/Claude visible-history acceptance under BF-2026-10-13-20:
the operator sees their answer but not the agent's question after responding. Owner evidence
preserves question text in system events; readable question/answer presentation remains queued.

The screenshot shows a completed **Asking user** activity whose details contain only
**User responded: yes**, followed by a user message containing **yes**. The original question
is not visible in that completed interaction, leaving the answer without its context. Treat
this as a reported history/presentation issue; investigate whether the question is missing
from durable events or merely omitted by the renderer. Private question contents are omitted.

#### Requested behavior

Keep the original question in the chronological conversation history after the user answers.
Show the question text, relevant explanatory context, and any offered choices, followed by the
actual selected or free-text answer. Preserve each question/answer association, including when
one request contains multiple questions or the agent asks a later clarification. The completed
activity must not replace the question with a generic response summary alone.

#### Acceptance criteria

1. Answering changes the pending question to a completed, readable history entry. Its original
   wording and choices remain accessible alongside the answer without opening raw event JSON.
   Long questions may collapse, but the full question remains available through a clear expander.
2. Preserve stable request/question identifiers, order, and timestamps so short answers such as
   **yes** can be understood unambiguously. A follow-up question must not overwrite the earlier
   one. Avoid duplicate standalone answers that obscure which question they answer.
3. Store the original question before clearing pending input state. Reopening, restarting,
   remote reconnect, and loading older history retain the same question and answer. Verify both
   durable event capture and desktop/web/native rendering wherever user questions are supported.
4. Preserve unanswered, cancelled, or superseded questions with their actual status; never
   invent an answer. For older records whose original question cannot be recovered, identify
   the missing question rather than reconstructing it from an answer or later clarification.
5. Test single and multiple questions, offered choices, free-text answers, repeated short answers,
   long formatted questions, interruption, and reconnect using synthetic content. Run `npm test`
   and `npm run check` if execution/persistence changes, and exercise affected client UIs.


### BF-2026-10-07-08 — Keep chat-related browser tabs in their chat navigation

Current status: Implemented and regression-tested; live agent-browser acceptance remains open. See [implementation and acceptance](2026-10-07-implementation.md).

Browser pages opened by an agent working in a chat, explicitly requested by the user in that
chat, or opened by clicking a link in chat content should belong to that chat's browser tab
navigation, rather than the application-level navigation. Preserve the originating chat even
if the user switches chats before an asynchronous page-open operation completes.

Acceptance: exercise all three entry points and follow-on navigation/new-window links from
chat-owned browser pages. In-app pages retain the correct chat owner, remain discoverable in
that chat, and restore under the same chat after restart using the existing tab persistence
contract. Closing or switching one chat's browser tabs must not select another chat, redirect
its composer, or mix agent access. Preserve existing Agent access permissions and browser-session
boundaries; placement alone must not authorize agent control. Browser actions without a chat
origin retain an appropriate application/Team destination instead of being assigned arbitrarily.

Clicked links follow the preference in BF-09: **In-app browser** means the originating chat's
navigation; **System browser** opens externally. Agent-controlled browser operations continue to
use the controllable in-app browser with the originating chat owner. Honor an explicit user
request for a particular browser rather than silently overriding it with the click preference.
The operator reiterated this requirement during final intake: chat-opened browser pages must
follow applicable user settings and must not escape into the application tab bar when opened
in-app. Apply chat ownership consistently across links, explicit requests, and agent tools.


### BF-2026-10-07-09 — Add a clicked-link browser preference in Engine Room

Current status: Implemented as a device-local Mac preference; persistence tested. See [implementation and acceptance](2026-10-07-implementation.md).

Add a **Preferences** section in Engine Room containing **Open clicked links in** with choices
**In-app browser** and **System browser**. When the operating system supplies the default
browser's display name, show it alongside System browser, for example **System browser (Safari)**.
Use the generic label if unavailable; never guess the installed or default browser.

Persist the choice on the device opening the link, retain it across restart, and apply it
consistently to ordinary web links clicked in chat messages and other Proteus content. Keep
existing behavior until the operator changes the preference. In-app links from chats use
BF-08's chat-owned navigation. The preference governs clicked links, not autonomous agent browser
tool calls or navigation within an already-open webpage. Existing explicit open-in actions can
override the default for an individual link.

Acceptance: use the OS default-browser handler for system-browser opening, and update the shown
browser name when the system default changes. Keep internal Proteus navigation, file links,
authentication callbacks, and special schemes on their existing appropriate handlers; do not
route them blindly as ordinary web links. Verify both choices, persistence, missing browser-name
metadata, opening failure feedback, and chat ownership. Preserve existing URL and permission
checks. Do not change the operating system's default browser as a side effect.


### BF-2026-10-07-10 — Improve pinch-to-tab-overview and extend tab coverage

Current status: Implemented scoped overview and alternatives; physical pinch feel unverified. See [implementation and acceptance](2026-10-07-implementation.md).

Improve the existing pinch gesture for browser tab overview, including reliable recognition,
smooth entry/exit, and a predictable return to the selected tab. Investigate support for the
same tab-overview interaction on chat tabs and other tab types where the platform and app
structure support it. Preserve scope: a chat's browser overview represents that chat's tabs;
the application overview represents application tabs. Do not mix tab owners to expand coverage.

Acceptance: check main and chat-owned browser surfaces and Team browser surfaces where present;
test short or cancelled gestures, repeated gestures, trackpad input, and touch input on supported
clients. Distinguish the intended overview gesture from webpage pinch-to-zoom and ordinary
scrolling so content interaction is not intercepted accidentally. Avoid double activation,
accidental tab closure/selection, hidden overlays behind embedded browser views, or loss of
focus and scroll position when dismissing the overview.

Retain a visible overview control and keyboard access as alternatives to the gesture. Handle
zero/one/many tabs, reduced-motion preferences, narrow layouts, and unsupported devices sensibly.
Validate feasibility per client/tab type and document implemented versus deferred coverage;
do not claim universal pinch support from a browser-only demonstration. Align behavior with
the existing tab overview and accepted dismissal behavior from the October 6 intake.


### BF-2026-10-07-11 — Reorder standup links and open them in saved list order

Current status: Implemented on desktop/web; saved ordering and tab reuse tested. See [implementation and acceptance](2026-10-07-implementation.md).

Allow the operator to reorder standup links. The displayed, saved list order must determine
the order of tabs opened by the standup link-opening action, so the standup follows the intended
sequence. Provide drag-and-drop with an accessible alternative such as Move up/Move down.

Acceptance: save ordering through the existing standup-link persistence/sync mechanism and
preserve it after reload or restart. Opening the links creates or arranges their tabs in that
order regardless of page loading speed; navigation completion must not reshuffle them. Retain
each link's label, URL, and identity while moving it. Adding, editing, or deleting a link must
not unexpectedly reorder the others. Handle already-open links and individual opening failures
without scrambling the remaining order or creating unintended duplicates. Reordering itself
does not open links. Verify first/last positions, keyboard controls, saved-order restoration,
and opening several synthetic links with different load times.


### BF-2026-10-07-12 — Add tabs to the left or right through the tab-type menu

Current status: Implemented and regression-tested for main/chat/Team containers. See [implementation and acceptance](2026-10-07-implementation.md).

Add **Add tab to left** and **Add tab to right** to the tab menu. Selecting either action opens
the existing new-tab type menu; only after the user chooses a supported type should the new tab
be created at the requested position. Offer types valid for that navigation container.

Acceptance: retain the clicked tab as the insertion anchor even if active selection changes
while the menu is open. Cancel creates nothing. Handle first/last tabs, overflow, keyboard use,
and an anchor closed before selection without inserting into an unrelated container. Persist
the resulting order and preserve existing type-specific creation and authorization behavior.


### BF-2026-10-07-13 — Move or copy tabs to chats, projects, and Team Tools

Current status: Browser move/copy implemented. Projects deferred by operator; live terminals/host-bound documents remain unsupported. See [implementation and acceptance](2026-10-07-implementation.md).

Add separate **Send a tab copy to chat/project** and **Send tab to chat/project** actions, with
a destination picker identifying the target chat or project. Also allow eligible top-level
application tabs to move into a chat's navigation or the Team Tools navigation bar. Integrate
with the existing project/workspace model; resolve how project destinations map to navigation
before implementation rather than introducing a duplicate project concept.

A copy leaves the original in place and creates an independent destination tab descriptor.
A move transfers the tab to the chosen owner/container and removes its original placement only
after the destination accepts it. Preserve content identity and view state where supported;
never duplicate underlying chats, replay a command, or silently clone a live terminal process.
Define supported move/copy semantics per tab type, with clear unavailable actions and reasons
for unsupported types, destinations, or cross-host transfers. Avoid containment cycles, such
as nesting a chat inside its own content tabs.

Acceptance: browser URL/title and relevant tab settings follow the operation without copying
cookies, credentials, or broader agent permissions across trust boundaries. Existing live browser
or terminal resources keep a single well-defined owner; control from the old chat must not leak
after transfer. For terminal copies, explicitly distinguish a new terminal configuration from
the existing process; no process starts solely because a descriptor was copied. Validate source
and destination permissions, host compatibility, failure rollback, active selection, ordering,
and restoration after restart. Keep source tabs intact on failed transfer and do not silently
close active work.


### BF-2026-10-07-14 — Audit and fix tab movement behavior

Current status: Implemented and tab/paired-host regressions pass. See [implementation and acceptance](2026-10-07-implementation.md).

The operator reports that moving tabs seems buggy; no single reproducible cause is established.
Reproduce existing drag/drop and menu-based moves before implementing BF-12/BF-13. Inspect index
calculation, source/destination ownership, active selection, persistence, and embedded browser or
terminal resource attachment through a move.

Acceptance: moving left/right, across overflow boundaries, and between supported containers
produces exactly the intended order and one tab at its new location. Preserve chat/composer
ownership, focus, content, and relevant scroll state. Cover moves of active/inactive tabs,
cancelled drags, rapid successive moves, last-tab removal, destination closure, and restart.
Use the same validated move primitive for drag/drop and menu actions, and report which observed
failures were reproduced and fixed separately from coverage of hypothetical edge cases.


### BF-2026-10-07-15 — Keep navigation spacing stable when opening terminal tabs

Current status: Implemented; 13 terminal UI checks pass. See [implementation and acceptance](2026-10-07-implementation.md).

The operator reports that creating a terminal tab disrupts navigation-bar spacing. The supplied
screenshot shows a terminal within chat content navigation; private titles, paths, and shell
details are excluded. Compare before/after terminal creation and switching to identify the exact
layout regression rather than assuming a specific CSS cause.

Acceptance: browser, chat, and terminal tabs share consistent bar height, padding, icon/label
alignment, active indicator, and close-control placement. Terminal content must not stretch,
shift, or otherwise restyle its parent navigation. Verify creation, activation, resize, closing,
long titles, many tabs/overflow, collapsed sidebar, and switching among tab types at normal and
increased zoom. Preserve terminal sizing and input focus while fixing navigation geometry.


### BF-2026-10-07-16 — Integrate agent terminal work with chat terminal tabs

Current status: Read-only actual provider command view implemented; interactive PTY attachment remains unsupported. See [implementation and acceptance](2026-10-07-implementation.md).

Make agent terminal work visible and usable through terminal tabs owned by the originating chat.
Investigate the provider execution boundaries and existing terminal integration first: distinguish
provider-owned command execution/output from a Proteus-owned interactive PTY. Do not present an
unrelated shell as the agent's actual session or claim persistent shell state where commands
execute independently. Correlate each activity with its terminal/output surface and show agent
activity and process status accurately.

Evaluate defaults in Engine Room Preferences for new chat terminals, such as terminal profile,
shell, starting folder derived from the chat workspace, reuse versus separate session, and
whether the tab is selected automatically when work begins. These are design candidates, not
approval to add every setting without evaluating usefulness. Let explicit per-chat choices
override defaults. Preserve current terminals when defaults change.

Acceptance: the user can find the actual command and output for a chat, distinguish agent and
manual input, and understand when a process is running, completed, failed, or awaiting input.
Prevent agent/user input collisions and cross-chat command routing; retain existing permission
checks, host ownership, working directory, and environment/auth-profile boundaries. Closing or
moving a tab must not silently terminate or duplicate running work. Document supported providers
and terminal modes, limitations, restart behavior, and whether a view is interactive or output-only.
Use synthetic commands to verify attribution, output, input handoff, errors, cancellation,
and isolated parallel chats. Do not expose stored secrets in tab labels or configuration previews.


### BF-2026-10-07-17 — Expose multiple Azure, Jira, and Azure DevOps auth profiles

Current status: Generic multiple identities/resource contexts confirmed by the operator. MCP health/context metadata implemented in 0.2.8; isolated credential mechanisms still need adapter work. See [implementation and acceptance](2026-10-07-implementation.md).

Investigate support for multiple Azure CLI (`az login`) authentication profiles plus Jira and
Azure DevOps authentication, and make the active profile and login health visible in the interface.
Provide explicit profile selection, a manual status refresh, and sign-in/re-authentication actions
appropriate to each integration. Distinguish **Refresh status** from **Sign in again** so a status
check does not unexpectedly start an interactive authentication flow.

Show useful account/tenant/subscription or organization/site context when available, the host and
consumer using the profile (CLI, MCP connection, chat terminal, or other adapter), status, and last
checked time. Distinguish signed in, expired/needs sign-in, checking, unreachable, and unknown;
stored configuration alone is not proof that a live request will authenticate successfully.

Acceptance: determine each adapter's real profile and credential mechanisms rather than assuming
Azure CLI login authenticates Jira/ADO MCPs or all terminals. Isolate supported profiles and make
selection explicit for chats/workspaces/terminals as appropriate; switching one context must not
silently change credentials for other active chats. A status refresh checks the selected context,
and successful re-authentication refreshes affected consumers without requiring an app restart
where supported. Preserve existing sessions and credentials on failure. Store secrets only in
the existing protected credential facilities; never put tokens in UI, logs, browser tabs, repo
files, or synced descriptors. Do not copy professional credential configuration into personal
contexts. Verify multi-account selection, expiration, failed checks, re-authentication, and
concurrent consumers with synthetic profiles before separately reporting live validation.

Coordinate this with existing provider-sign-in and contradictory MCP-auth-status backlog items;
this request adds integration-profile visibility and isolation rather than assuming those items
are already fixed. Keep unsupported profile mechanisms explicitly deferred with reasons.




## October 6 bug/feature list — closed for build handoff

The operator closed the original 21-item intake on October 6 and authorized implementation,
build and deployment from the coordinating Mac. BF-22 adds visiting-desktop chat tab synchronization.
The 0.2.2 handoff recorded all 22 items as implemented; that blanket acceptance is now reopened. Historical isolated validation and actual rollout
are tracked separately in [October 6 release](2026-10-06-release.md). The original acceptance
criteria and accepted examples remain in [the build handoff](2026-10-06-build-handoff.md).
Website, both Macs, iPad and iPhone rollout is verified at 0.2.2, including the final desktop
selected-child restart correction and live visiting-desktop browser synchronization. Explicit
remaining live gates are recorded in the release document; installation and synthetic checks
do not establish those device/workflow outcomes.

### BF-2026-10-06-01 — Make website Mac connections easy to find and complete

- **Observed:** Engine Room → Connections (`/engine-room?tab=connections`) contains a visually
  quiet “Manage and pair Macs” link to the Mac connections page (`/remote?view=connections`).
  The sidebar's Connections item returns to Engine Room, so the separate pairing page is easy
  to miss. The pairing page refers users back to Engine Room to choose the Default Mac without
  an obvious direct action.
- **Requested flow:** Give website users a clear route from Engine Room to pairing and managing
  Macs, and a clear route from the Mac connections page to choosing or changing the Default Mac.
  Present pairing, selecting a default, and connecting as one understandable sequence. Make the
  difference between the currently connected Mac and the account's Default Mac explicit.
- **Acceptance:** A user starting from either Connections screen can reach the other task in one
  obvious action; navigation labels and active state make the destination clear. The flow does
  not silently set or switch the Default Mac, change pairing authority, or imply that an
  offline/default-missing Mac has an automatic fallback. Verify the website flow at desktop and
  narrow widths, including keyboard navigation.

### BF-2026-10-06-02 — Dismiss desktop tab overview from its backdrop

- **Observed:** The desktop browser Tab overview opens as a modal with a dimmed area outside its
  panel. Closing it currently requires Done, Escape, or selecting a tab.
- **Requested behavior:** Clicking the dimmed area outside the overview panel closes the overview.
- **Acceptance:** A backdrop click dismisses the overview and restores the previously active
  view without selecting or closing a tab or activating a control behind the modal. Clicking
  inside the panel, including unused panel space, leaves it open; existing Done, Escape, tab
  selection, and tab-close actions continue to work. Cover both main and Team browser overviews.

### BF-2026-10-06-03 — Clarify paired-device permissions and refresh controls

- **Observed:** The desktop Connections page presents permission checkboxes above long descriptions
  for each paired device, with Revoke nearby and a single “Refresh status” button at the bottom.
  The layout makes the checkboxes look like selections for that refresh action. In the current
  checkout, changing “Allow resource access” saves that device's permission immediately, while
  “Refresh status” reloads the whole page; it does not refresh checked devices. The supplied
  screenshot also shows a “View chat documents” permission absent from this checkout, so verify
  the target build before changing that control.
- **Requested design:** Give each device a distinct, compact card or row with its identity,
  connection status and freshness, pairing details, clearly labeled permission switches, and
  a separate Revoke action. Explain that permission changes save immediately and are unrelated
  to refreshing status. Put **Refresh all** at the top of the device list and provide a
  **Refresh** action on each device for its own status.
- **Acceptance:** Individual refresh updates the indicated device's status; Refresh all updates
  the list. Neither refresh action changes permissions, selects devices, or revokes access.
  Permission changes give clear saved/error feedback and retain the existing authorization
  checks. Status and permission controls remain understandable on narrow layouts and by keyboard.

### BF-2026-10-06-04 — Diagnose and fix website Mac pairing connection closure

- **Observed:** Attempting to pair a Mac from the website's Mac connections page reports
  “Remote connection closed. Reconnect to continue.” and leaves no destination selected. This
  is a reported live failure; its cause and the point of failure are not yet established.
  The browser client currently uses that message for most WebSocket close codes, and the pairing
  form clears the pasted code before the attempt finishes.
- **Investigation:** Reproduce with a fresh, unexpired invitation and trace the browser-to-relay,
  relay-to-Mac, pairing handshake, account credential save, and first authenticated connection
  stages separately. Check the actual close code and safe relay/host status without recording
  the invitation, device key, chat content, or other secrets. Distinguish Mac offline, relay
  refusal, rejected or consumed invitation, authentication failure, and account-save failure.
- **Acceptance:** A valid invitation pairs, saves the destination to the website account, and
  connects. Failures identify the stage and give a useful recovery action; an unsuccessful
  attempt does not claim a saved pairing or silently change the Default Mac. Cover interrupted
  and expired attempts with isolated tests, then report live pairing verification separately.

### BF-2026-10-06-05 — Keep pop-up dialogs above the desktop browser view

- **Observed:** With an embedded browser tab active, a pop-up/modal can be dimmed or blocked by
  the browser surface, leaving its controls inaccessible. The desktop uses a separate Electron
  `WebContentsView` for page content; the app tries to hide it when its dialog opens, so verify
  where that visibility handoff fails rather than assuming a CSS stacking fix will suffice.
- **Requested behavior:** Pop-ups opened over the desktop browser remain fully visible and
  interactive. While a Proteus dialog is open, the browser page must not cover it or receive
  its clicks or keys. Restore the same browser tab, scroll position, and focus appropriately
  after dismissal.
- **Acceptance:** Exercise dialogs launched from both main and Team browser tabs, including
  context-menu actions and app controls. Opening and closing each dialog works without a flash
  of browser content above it, lost input, accidental page activation, or a changed active tab.

### BF-2026-10-06-06 — Show website favicons and active agent control on browser tabs

- **Observed:** Embedded website tabs show the same generic circle in the main tab strip,
  making open sites harder to distinguish at a glance. Team browser tabs should use the same
  icon behavior for consistency.
- **Requested behavior:** Display each site's favicon when the embedded page supplies one.
  Update it when the tab navigates; use the existing generic icon when no usable favicon is
  available or while a new page loads. Replace the favicon with a small cursor indicator while
  an agent is actively controlling that tab, then restore the current favicon when control
  returns to the user. Merely enabling Agent access must not show the cursor.
- **Acceptance:** Multiple sites show their own icons in main and Team browser tabs without
  mixing icons between tabs. Unloaded and restored tabs show a safe cached icon when available
  or the fallback, and resolve the current icon when loaded. Obtain icons within the existing
  browser session without introducing a separate website-tracking fetch or exposing private
  browsing data to the application server. Show and clear the cursor on the correct tab as
  agent control starts and ends, including revocation and tab closure. Keep tab titles and
  accessible labels intact, with an accessible indication of active agent control.
- **Investigation:** The chat browser subtab strip shown in the installed build is absent from
  this checkout. Locate its owning source before implementation and verify all tab surfaces.

### BF-2026-10-06-07 — Recover agent browser reads from debugger attachment conflicts

- **Observed:** A Copilot chat using `gpt-6-luna` opened an in-app Slack thread but could not
  read its page content. The browser snapshot failed with “Debugger is already attached to the
  target”; retrying in a fresh in-app tab did not resolve it. The thread URL, chat identifier,
  message text, and other workplace details are intentionally omitted from this repository.
- **Investigation:** Reproduce with an authorized synthetic dynamic page, then trace the
  per-tab Playwright/CDP bridge's attach, reuse, failure cleanup, and detach lifecycle. Check
  for competing debugger attachment or concurrent snapshots, and distinguish this error from
  page loading, site authentication, and access-permission failures. Do not infer the thread's
  contents from a successful tab open or substitute unrelated source material for the page.
- **Acceptance:** An authorized agent can open and read the visible content of a loaded in-app
  page, including after a failed or interrupted snapshot, without restarting Proteus. Repeated
  and concurrent requests cannot strand a debugger attachment. Private tabs remain inaccessible
  without Agent access, and errors identify a recoverable browser bridge failure without
  exposing page content or credentials. Report any live Slack verification separately.

### BF-2026-10-06-08 — Show the actual failed-tool error on desktop

- **Observed:** For the same failed browser snapshot, the website shows “Debugger is already
  attached to the target” in the activity, while the desktop activity shows failure without
  that error text. The underlying browser failure is tracked separately in BF-2026-10-06-07.
- **Investigation:** Follow the tool failure from provider result through the saved event,
  desktop presentation model, and web rendering. Check whether the message is absent from
  `tool.error`, present only in a structured output, or lost during normalization. Use synthetic
  error fixtures; do not add the real chat or workplace link to tests or documentation.
- **Acceptance:** Desktop and website show the same safe, actionable error text for a failed
  activity without requiring raw-output inspection. Keep failure status, timing, and details
  consistent across refresh and saved-chat reload, while redacting credentials and secrets.

### BF-2026-10-06-09 — Bring website visual presentation in line with desktop

- **Observed:** Website organization broadly matches desktop, but typography, scale, spacing,
  controls, and content formatting still differ across pages. Chat makes the mismatch especially
  clear: message blocks and activity details have different size and emphasis.
- **Requested design:** Make desktop the visual reference for website heading and body sizes,
  spacing, controls, panels, and content density while retaining the website's responsive layout.
  In chat, preserve the existing message/event order and desktop line wrapping, hierarchy, and
  activity structure. Keep the side accent borders on user and agent message boxes. Put the tool
  and approval sequence inside one noticeably but still restrained warm orange Activity box
  with no side accent border. Keep a side accent border on each activity item inside that box.
  Successful items retain their current quiet green fill; failed or warning items use a
  distinctly lighter, richer orange fill and matching side accent. Show explicit Failed
  text/icon and keep the real failure reason plainly visible.
- **Acceptance:** Compare representative desktop and website pages at wide and narrow widths,
  then compare the same synthetic conversation with user/agent messages, successful and failed
  tools, approvals, long titles/URLs, expanded details, timestamps, and Markdown. Preserve
  readable contrast, keyboard access, and status labels that do not rely on color alone.
  The operator accepted the chat design direction on October 6, including the visible failed-tool
  error required by BF-2026-10-06-08. No UI has been changed yet.

### BF-2026-10-06-10 — Update Needs attention as soon as the last item is reviewed

- **Observed:** After the final attention item was reviewed, the desktop Needs attention view
  showed no matching item while its sidebar badge still read 1. The view also warned that some
  Macs were offline and cached chats were present; whether a stale cached status caused this
  mismatch is not yet established.
- **Requested behavior:** Refresh the attention list and badge promptly when an item is
  reviewed or its status changes. Derive both from the same current, authorized status set so
  an empty list cannot coexist with an unexplained nonzero badge. If an offline Mac leaves a
  status unverified, label that cached state clearly rather than presenting it as a current
  item that the user cannot see or act on.
- **Acceptance:** Reviewing the last actionable item updates the row, badge, and empty state
  without navigating away or waiting for a periodic refresh. Cover local and remote items,
  failed/awaiting-input transitions, offline cached results, and reconnect reconciliation;
  stale replies must not restore a cleared count.

### BF-2026-10-06-11 — Keep a chat's tabs visible after submitting a message

- **Observed:** Submitting a message makes the selected chat's own tab bar disappear, while the
  top navigation tabs remain visible. Switching to another top navigation tab and back restores
  the chat's tab bar.
- **Requested behavior:** Keep the chat's tab bar mounted and its selected tab intact through
  message submission and subsequent chat refreshes, including while a turn is running.
- **Acceptance:** Sending, queuing, or steering a message does not hide the chat's tabs or
  change the selected chat tab. The tabs remain usable as the conversation updates, without
  switching away and back to restore them.

### BF-2026-10-06-12 — Diagnose and restore Copilot allowance refresh on this Mac

- **Observed:** The desktop AI Allowance sidebar shows a dash for Copilot. Its account allowance
  detail says the allowance has not been reported; Refresh usage advances the last-checked time
  but still does not show a value. Codex and Claude values are visible on the same Mac. The
  cause and whether other Macs are affected are not yet known.
- **Requested behavior:** Trace the Copilot account-quota refresh from the authenticated
  provider through the local runner and UI. Display a current allowance when the provider
  reports one; when it cannot, show the actual reason and a useful recovery action rather than
  treating a completed check as a successful usage update.
- **Acceptance:** On the affected Mac, Refresh usage either updates the Copilot sidebar and
  detail from a verified provider response or clearly reports why no allowance is available.
  Check authentication, provider response and parsing, cache behavior, and UI propagation;
  distinguish unavailable data from zero remaining allowance without inventing usage.

### BF-2026-10-06-13 — Align running activity indicators and summary wording

- **Observed:** Mobile shows animated indicators on running tool items and animates the enclosing
  Activity section. Desktop and website do not consistently expose those working states in the
  activity list. Mobile's summary says “tool actions” and “approvals,” while desktop says
  “tools” and “automatic approvals” and includes failure/running counts.
- **Requested behavior:** Use the existing desktop/web “Working…” animated icon for each running
  tool item on desktop and website, replacing that item's completed/failed symbol only while it
  runs. Keep a subtle animation on the whole Activity group whenever any contained item is
  running; retain the accepted warm group fill without a side accent and the individual item
  side borders and status fills from BF-2026-10-06-09. Use desktop's Activity summary wording
  and count order on desktop, website, and mobile.
- **Acceptance:** The same synthetic running conversation shows matching tool, automatic
  approval, failed, and running counts and wording on all three surfaces. Running indicators
  start and stop with the actual item state, and group animation stops when no item is running.
  Completed and failed items keep their distinct symbols and fills. Provide text status and a
  static reduced-motion presentation so progress does not depend on animation alone.

### BF-2026-10-06-14 — Align chat and Team Tools tab icons and text colors

- **Observed:** The installed desktop build shows a chat browser subtab strip whose chat title
  lacks the chat icon and whose tab text is brighter than the primary app tabs. Team Tools has
  the same need for its initial icon, plus a distinct Standup icon. The AI Allowance panel's
  label color also appears inconsistent with nearby sidebar labels.
- **Requested behavior:** Use the chat icon immediately before each chat title, the Team Tools
  icon on its initial tab, and a standup-specific icon on Standup. Browser child tabs should use
  their site favicon from BF-2026-10-06-06. Match secondary tab and allowance label colors to
  the established selected/unselected navigation palette.
- **Acceptance:** Locate the installed build's chat browser subtab implementation, then compare
  active/inactive states and long names in main, chat, and Team Tools tabs at narrow and wide
  widths, including keyboard and accessible names.

### BF-2026-10-06-15 — Share chat and Team browser tab memory with mobile

- **Observed:** Mobile chat and Team views do not show the same open feature/browser tab list as
  desktop. A browser tab opened on mobile does not reappear in the corresponding desktop view.
- **Requested behavior:** For the same authorized Mac destination, make the chat and Team tab
  descriptors available on both clients. Opening, closing, and renaming a mobile browser tab
  should reconcile with desktop tab memory; both clients should show the same relevant tab list
  after reconnect or restart. Keep each client's selection and scroll position local.
- **Acceptance:** Open a synthetic browser tab from mobile while desktop is connected, find it
  in the matching desktop chat or Team view, and reopen it there; verify the reverse direction,
  offline reconciliation, duplicate prevention, and revocation. Sync bounded tab descriptors,
  not WebKit/Electron cookies, page memory, or private browser credentials.

### BF-2026-10-06-16 — Collapse the mobile chat composer while reading

- **Observed:** Mobile's full-height chat composer keeps its text area, connection status,
  model choices, and actions visible while the user scrolls the conversation, reducing reading
  space.
- **Requested behavior:** When focus leaves the composer for the conversation, reduce it to a
  single-line preview of the unsent draft with truncation. Touching the preview restores the
  current full composer, including connection status and model controls, with the draft intact.
  Replace the Stop text button with a stop icon inside a circular button that remains visible
  and actionable in both sizes while a turn is active.
- **Acceptance:** Scrolling/tapping the conversation collapses the composer; tapping the preview
  expands it without changing draft text, model, or queued/steer state. Stop works immediately
  from either size, is labeled for accessibility, and is absent or disabled when no turn can be
  stopped. Keyboard, VoiceOver, safe-area, and reduced-motion behavior remain usable.

### BF-2026-10-06-17 — Reduce mobile chat header height

- **Observed:** The mobile chat header's back/menu controls and surrounding padding use more
  vertical space than needed above the feature tabs and conversation.
- **Requested behavior:** Tighten the header's visual button size and vertical padding while
  retaining readable title truncation and accessible touch targets. Keep the feature tabs and
  composer from overlapping the safe areas.
- **Acceptance:** Compare the chat view on compact and large iPhone sizes with long titles,
  active browser tabs, keyboard open/closed, and VoiceOver; controls remain at least 44 points
  tappable and the conversation gains visible vertical space.

### BF-2026-10-06-18 — Match the desktop browser address action on mobile

- **Observed:** The mobile browser toolbar uses a text “Enter” action where desktop uses an icon.
- **Requested behavior:** Use the same icon and meaning on mobile while preserving the address
  field's submit behavior and a clear accessible action name.
- **Acceptance:** On an iPhone, entering a URL or search and tapping the icon performs the same
  navigation as the current Enter button; keyboard submission still works, and the icon has a
  usable touch target and VoiceOver label.

### BF-2026-10-06-19 — Simplify mobile Team Tools tabs and place Standup action locally

- **Observed:** Mobile Team Tools has a “Browser” category with another tab row beneath it, and
  “Open standup” appears while Browser is selected.
- **Requested behavior:** Put browser tabs directly in the Team Tools primary tab row alongside
  Overview and Standup. Remove the Browser category and nested browser tab row on iPhone. Move
  “Open standup” into the Standup tab. The add-tab action should create a primary browser tab.
- **Acceptance:** Open, switch, close, and restore multiple browser tabs from one Team Tools tab
  row on compact iPhone screens, with usable overflow and selected states. “Open standup” appears
  in Standup and opens the intended view. Tab memory remains compatible with BF-2026-10-06-15.

### BF-2026-10-06-20 — Preserve the mobile chat header when browser tabs are active

- **Observed:** At times, selecting a browser tab within a mobile chat removes the chat title
  and menu and leaves a large blank area at the top. The normal chat view retains those controls.
- **Requested behavior:** Keep the back button, truncated chat title, and menu visible at the
  compact height specified in BF-2026-10-06-17 for chat and browser tabs alike; avoid an empty
  spacer when the selected tab changes.
- **Acceptance:** Switching among the chat, empty browser tabs, and loaded browser tabs, then
  scrolling, returning, and reopening the chat, never hides the title/menu or adds excess top
  space. Check compact and large iPhones, safe areas, and keyboard open/closed states.

### BF-2026-10-06-21 — Keep the chat selected when closing its browser tab

- **Observed:** Closing a browser tab opened within a chat changes the screen to Team Tools.
- **Requested behavior:** Closing a chat-owned browser tab should keep the user in that chat and
  select the chat view or another remaining tab in the same chat. It must not switch the active
  feature to Team Tools.
- **Acceptance:** On mobile, close the active and an inactive browser tab from a chat with one
  and multiple browser tabs. The chat title, menu, conversation, and remaining tabs stay in the
  same chat; closing the last browser tab returns to its conversation. Repeat after switching
  between chats and Team Tools to catch stale tab-owner or selection state.

### BF-2026-10-06-22 — Sync open remote chat tabs on visiting desktops

- **Requested October 6 by the operator:** A desktop viewing a chat hosted on another authorized
  Mac must load and reconcile that chat's open tabs, matching the mobile tab-memory scope in BF-15.
- **Acceptance:** Both Macs show the host chat's bounded document/browser descriptors. Open, close,
  rename and reorder changes converge without duplicates after reconnect; stale replies cannot
  overwrite newer revisions. Selection and reading position remain local. Revocation removes
  access; browser cookies, page memory, credentials and terminal execution never cross hosts.

## Next changes

**Implementation and rollout authorized — October 5:** the operator lifted the
queue/build hold and requested coordinated implementation of items 1–26 using
GPT-6 Sol subagents at medium effort, with app updates installed as platforms become
ready. Website backups/uploads are approved; iPad, Work Mac and Build Mac were
reported unlocked. Verify current device/access state when installing. Preserve
existing data, identities, signing and uncommitted item 19 work. The specific
message-level More actions proposal remains deferred. Earlier item-level references
to the general hold are historical; implementation, test and install receipts will
be tracked in `next-changes-release.md`. Authorization alone is not completion.


Current rollout (October 6): Build Mac's signed 0.2.1 revision
`a65d8df542a2+dirty.803bbc240e31` includes items 27–28 and passed final continuity
checks. Website release `20261006T053613Z` is live. Native iPhone and iPad 0.2.1 (2610.5.3) and Work Mac 0.2.1 are installed. The
operator lifted the iPad hold on October 6; its in-place update and preservation
checks passed. Personal→HC paired-connection
verification remains pending; no pairing or grant changes were made. Item-level descriptions below
retain the original reported defects and acceptance criteria; their initial
"pending" labels are historical, not the current platform-wide implementation
status. See `next-changes-release.md` for exact tests, installed observations and
unverified acceptance conditions.


### 1. Command W closes the current tab

Requested October 5, 2026. Status: recorded for the next set of changes; implementation
and verification pending.

In the Proteus Mac app, **Command-W (⌘W) must close the current tab and must never
close the main Proteus window**.

Acceptance criteria:

- With multiple tabs open, close only the current tab and leave the other tabs and
  main window open.
- Apply the shortcut to the current tab in the active tab area, including nested
  chat and Team workspaces. Preserve existing restrictions on persistent tabs.
- Closing the last closable tab leaves the main window open. If there is no closable
  current tab, do nothing; never fall back to closing the window.
- Honor existing tab-close protections and confirmations. Cancelling a close leaves
  both the tab and window open.
- Verify shortcut handling with focus in ordinary content, embedded browser content,
  terminals and text inputs, so the main window cannot receive a fallback close.

### 2. Remote chats must match the regular chat layout

Requested October 5, 2026. Status: operator-reported defects in the installed Mac
interface; correction and installed acceptance pending. This carries forward the
existing remote desktop chat parity requirement below.

Remote chats must use the same chat container, details sidebar and composer as
regular local chats. The operator reports missing chat-specific sidebar items,
a different message box with a Queue/Steer dropdown, and a page taller than the
window that pushes the header/details and composer out of view. The supplied
screenshot also shows repeated Archive/Delete button pairs and a missing rounded
outer chat container. The application navigation sidebar is present; the missing
sidebar requirement concerns the regular chat's details and controls.

Acceptance criteria:

- Restore the regular chat's rounded outer container, spacing, header and details
  sidebar, including the same applicable sections and controls. Retain the existing
  remote capability and read-only metadata boundaries described below.
- Match the regular composer appearance and layout. Use the same distinct Send,
  Queue, Steer and Stop buttons with appropriate states; remove the remote-only
  Queue/Steer dropdown.
- Constrain the chat workspace to the available window height beneath the tab bars.
  Keep the chat header and composer visible while the conversation scrolls within
  its own area. Long details scroll within their own panel. At smaller sizes, use
  the regular chat's adaptive layout without pushing controls outside the window.
- Render one applicable set of Archive/Delete controls. Reopening, switching tabs,
  streaming updates and reconnecting must not duplicate those controls. A later
  October 5 screenshot shows five Archive/Delete pairs in one remote chat header;
  treat this as a recurring installed defect. The operator subsequently reports
  that another pair appears on every desktop refresh. Verify repeated automatic
  and manual refreshes retain exactly one set of controls and each click invokes
  its action only once; do not merely hide duplicated elements.
- Restyle desktop Archive/Delete as compact, understated secondary actions that
  fit the chat header: lighter visual weight, minimal background/border treatment
  and consistent spacing. Keep clear labels or accessible labeled icons, readable
  contrast and adequate hit areas. Use a restrained destructive cue for Delete;
  retain deletion confirmation and existing active-work restrictions. Do not move
  these actions into the deferred More actions menu as part of this change.
- Compare local and remote chats side by side using equivalent synthetic content
  and idle/running/queued/failed states. Check long histories, expanded activity,
  long titles, multiline drafts, window resizing and UI scaling.
- Verify the corrected layout in the installed Mac app with a remote chat; record
  installed observations separately from software tests. Keep chat content out of
  repository fixtures and screenshots.

### 3. New tab menu appears behind browser content

Requested October 5, 2026. Status: operator-reported defect with screenshot evidence;
implementation approach and installed verification pending.

When an embedded browser tab is active, clicking the tab strip's **+** opens the
creation menu partly behind the browser content. Choices for new tabs, terminals
and other content become obscured. The entire menu must appear above the active
browser and remain usable.

Acceptance criteria:

- Show the complete creation menu above embedded browser content in the main tab
  strip and applicable nested chat and Team workspaces. Keep the menu within the
  available window bounds, with scrolling when needed.
- Menu choices receive pointer and keyboard input; clicks on them must not pass
  through to the underlying browser. Preserve normal focus, Escape dismissal and
  outside-click dismissal.
- Opening and dismissing the menu preserves the browser's page, navigation history,
  scroll position and entered content; it must not require reloading the browser.
- Verify with an actual embedded browser in the installed Mac app, including resized
  windows, UI scaling and switching between browser and non-browser tabs. A test
  with only ordinary page elements does not establish native browser layering.

Investigate how the embedded browser surface is layered relative to app menus
before selecting the fix; do not assume a CSS stacking change alone is sufficient.

### 4. Missing divider after Standup in Team Tools

Requested October 5, 2026. Status: operator-reported visual defect with screenshot
evidence; implementation and installed verification pending.

Add the missing vertical tab divider between **Standup** and the first browser tab
in the Team Tools tab strip. Match the existing divider between Team Tools and
Standup in color, height, thickness and spacing.

Acceptance criteria:

- The divider is visible after Standup when a browser tab follows it, including a
  newly opened **New tab**.
- Preserve the divider when switching between Standup and browser tabs, opening or
  closing browser tabs, and resizing or scrolling the tab strip.
- Verify the appearance in the installed Mac app without changing tab order or
  selection behavior.

### 5. Consistent right click menus throughout the interface

Requested October 5, 2026. Status: operator reports interface-wide context menus
with Copy are still missing; implementation and installed verification pending.
The earlier chat-row/tab context-menu work does not satisfy this broader request.

Provide consistent, context-sensitive right-click menus throughout Proteus,
including local and remote chats, messages, details, text fields, tabs, list rows,
documents, logs, terminals and embedded browsers. **Copy** must be available wherever
there is applicable selectable or copyable content. Copy selected text when a
selection exists; otherwise label the target explicitly, such as Copy message,
Copy link or Copy value. Preserve the selection while opening the menu.

The operator approved the following additional actions on October 5, 2026. Include
them in the planned implementation, according to the target and supported capabilities:

| Target | Approved menu options |
| --- | --- |
| Editable text and composer | Cut, Copy, Paste, Select All, Undo, Redo, using normal editing availability. |
| Chat messages | Copy message, Copy as Markdown, Copy code for a code block, Read Aloud where supported. |
| Links | Copy link address, Open in new browser tab, Open in default browser where supported. |
| Tabs | Close tab, Close other tabs and Close tabs to the right, with existing close protections. |
| Chat rows | Open, Rename (see item 16), Archive or Unarchive, Delete with the existing confirmation and active-work restrictions. |
| Documents, details and logs | Copy selection, Copy value or entry, Select All within the current content area; Find where supported. |
| Embedded browser | Back, Forward, Reload, Copy selection and link actions, preserving normal editable-field menus. |
| Terminal | Copy selection, Paste, Select All within terminal output, Clear visible output without ending the session; retain terminal-specific keyboard behavior. |

Acceptance criteria:

- Audit the major interface surfaces for missing menus, including nested Team/chat
  tabs and remote views; expose relevant actions consistently without showing
  unrelated choices everywhere.
- Reuse existing action handlers, permission checks and confirmations. A menu must
  not introduce unavailable remote file actions or imply unsupported capabilities.
- Selection Copy copies only the selected text. Whole-message, link, code and value
  actions copy the clearly identified target; invoking the menu performs no action.
- Menus remain above embedded browser content and inside window bounds, consistent
  with item 3. Verify pointer targeting, keyboard navigation, Escape dismissal and
  focus restoration. Opening a menu must not clear drafts or change the current tab.
- Verify installed Mac behavior across local/remote chat, inputs, browser, terminal,
  document and log views. Check existing website/native equivalents where applicable;
  preserve native touch selection and long-press behavior.

#### Website coverage

Include applicable custom actions on the Proteus website. The current website
source already provides chat-row Archive/Unarchive and Delete menus, plus clipboard
copy handlers in Markdown views; extend those foundations to cover the missing
approved actions. Source inspection is not live website acceptance.

- Use custom menus on Proteus messages, chat rows, internal tabs, code blocks,
  document views and log entries. Include Copy selection/message/Markdown/code/value,
  chat actions and internal tab actions as appropriate to the target.
- Preserve the browser's normal menu for editable fields, ordinary links, images
  and other surfaces where it provides useful built-in actions.
- **On hold, October 5:** defer the proposed ellipsis / More actions button and its
  menu. The operator reviewed the preview and asked to hold this idea. Keep the
  approved context-sensitive right-click work in scope; do not add the separate
  More actions control. Preserve existing keyboard and touch access to actions.
  This hold does not prevent relocating the existing iPad chat menu as requested
  in item 13; it remains a separate, already-present control.
- A website can display its own context menu; adding entries directly to the
  browser's native menu requires extension capabilities and is outside this scope.
  Do not globally suppress the browser menu or replace spelling/editing features.
- Use HTTPS clipboard APIs from explicit user actions. Report unavailable or denied
  clipboard access and retain normal keyboard/native copy and paste alternatives;
  custom Paste cannot be assumed to work identically across browsers.
- Tab close actions affect Proteus's internal tabs only. Browser-owned tabs,
  external sites and unsupported remote terminal/file operations retain their
  existing capability boundaries. Do not promise browser-level Command-W control.
- Verify custom and native-menu coexistence, selection retention, clipboard failure,
  keyboard/touch access and menu positioning in Safari, Chrome and Firefox.

Platform references: [context menu events](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event),
[browser extension menus](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus),
and [clipboard capabilities](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API).

### 6. Compact attachment control on the composer action line

Requested October 5, 2026. Status: planned; implementation and installed verification
pending. Apply to the regular and remote chat composers across applicable clients.

Move **+ Attach** immediately to the left of the model selector and remove the
visible word **Attach**, leaving **+**. Match the control's visual size, font,
weight and alignment to the model selection line. Keep the attachment control,
model selector and **Send** button on the same horizontal line, with Send at the
right. Retain an accessible Attach files name and an adequate touch target.

Acceptance includes narrow mobile widths, long model names, keyboard-visible
layouts and text scaling. Keep the controls reachable without overlap or clipping;
use compact/truncated model labels as needed. Preserve attachment selection,
staging and send behavior.

### 7. Visible mobile Send button before text is entered

Requested October 5, 2026. Status: operator reports black-on-black Send presentation
with an empty composer; correction and installed verification pending.

Make the mobile **Send** label or icon visible before text is entered while keeping
its disabled state clear. The operator suggested gray text; choose a gray with
sufficient contrast against the actual button/background rather than fixing a dark
gray that remains hard to see. Preserve enabled/disabled behavior and distinguish
the active state once valid sendable content is present.

Verify empty, text-entered, attachment-only and sending states in light and dark
appearance on mobile. A visual correction must not enable an otherwise invalid send.

### 8. Date and time on mobile chat rows

Requested October 5, 2026. Status: planned; implementation and installed verification
pending.

Show a date and time on mobile chat rows, matching the desktop chat list's timestamp
meaning and presentation. Put it on the **right side of the Mac/status line**, with
Mac identity and status retained on the left. Use the actual chat timestamp and the
client's configured timezone behavior.

Verify local and remote chat entries, long Mac names/status labels, narrow screens
and text scaling. Keep date/time readable without overlapping the Mac/status text;
do not substitute message timestamps for the chat-list timestamp.

### 9. Larger mobile message box and tap area

Requested October 5, 2026. Status: operator reports the single-line message area
is too small to tap comfortably; implementation and installed verification pending.

Increase the mobile chat message box's minimum height and internal padding so it
has a comfortable multiline-sized input area even when empty. Make the full padded
input area focus the editor and open the keyboard when tapped. Apply consistently
to regular and remote mobile chats, including the mobile website where applicable.

Keep the attachment, model selector and Send controls together on their own action
line as requested in item 6. Let the message box grow with the draft up to a bounded
height, then scroll its text without pushing the action line outside the viewport.

Verify easy tapping with an empty or single-line draft, multiline entry, keyboard
open/closed, smaller screens and larger text settings. Preserve enough visible
conversation space and keep the input and Send controls accessible above the keyboard.

### 10. Fade tab labels only at an actual clipped edge

Requested October 5, 2026. Status: screenshot shows the last nested tab fading while
far from the tab strip's right edge; correction and installed verification pending.

Base the trailing fade on actual clipping at the visible tab strip boundary or
new-tab control. A fully visible tab must retain its complete label and selection
indicator, even when it is the last tab. Do not fade a tab simply because it is last.

Verify main and nested chat/Team tab strips with one short tab, multiple tabs that
fit, overflowing tabs, and horizontal scrolling in both directions. Recalculate
clipping after resize, label changes, and tab creation/removal; remove the fade as
soon as the tab is fully visible.

### 11. Place nested tabs flush in the upper left corner

Requested October 5, 2026. Status: screenshots show unnecessary top and left space
around the second tab strip; correction and installed verification pending.

Place the second-level chat/Team tab strip flush in the content area's upper-left
corner: immediately beneath the main tab strip and directly against the sidebar
boundary (or content area's left edge when the sidebar is hidden). Remove all outer
padding and margins around the sub-tab strip, including any inset before the first
tab. The operator reiterated the existing top-spacing requirement and explicitly
added the left inset in the follow-up screenshot.

Keep padding inside each tab for its label and hit area; surrounding content padding
must not inset the strip. Preserve the intended dividers. Verify consistent alignment
when switching between local chats, remote chats, Team Tools and their browser/document
tabs, including resized windows and expanded/collapsed sidebar states.

### 12. Preserve the current view position through refreshes

Requested October 5, 2026. Status: operator reports chats and other views apparently
refreshing at unexpected times and jumping back to the top. The refresh trigger is
not yet diagnosed; correction and installed verification pending.

Keep the user's current reading and working position through automatic or manual
refreshes, polling, live updates, reconnects and rerenders. This applies to chats
and other scrollable Proteus views, not only tab-strip scrolling.

Acceptance criteria:

- Preserve each view's vertical and horizontal position independently, including
  conversation, details, lists, documents and nested scroll areas. Restore the same
  position when returning to an already-open tab.
- When content above the viewport changes, retain the visible item/message and its
  relative screen position instead of relying only on a stale pixel offset. If the
  anchor disappears, stay near the previous position rather than jumping to the top.
- In chats, follow new output only when the user is already following the latest
  messages. Scrolling up must retain the reading position during streaming, earlier
  history loading, image/layout updates and refreshes. Explicit Jump to latest and
  other intentional navigation remain available.
- Preserve drafts, caret/focus, selection and expanded details during updates.
  Routine refreshes must not reset the selected tab or recreate duplicate controls.
- Identify unnecessary refresh/remount triggers and reduce them where appropriate;
  refreshes that remain necessary must still preserve the current position.
- Verify repeated automatic and manual updates while scrolled partway through long
  content, including local/remote chats and other affected views on applicable
  desktop, website and mobile clients. Record actual installed observations.

### 13. Remove the redundant iPad chat title row

Requested October 5, 2026. Status: screenshot shows the same chat name in the top
tab, a separate centered title row and the nested chat tab; implementation and
installed verification pending.

On iPad, retain the top-level tabs and the nested chat tabs. Remove the redundant
centered chat-name header and its reserved vertical space. Move the existing chat
**ellipsis menu** into the top tab area immediately beside its **+** control.
Keep the nested tab strip's own + in its existing scope.

Acceptance criteria:

- Show only the two requested tab levels above the conversation, with no third
  chat-title row or leftover gap. Keep the sidebar's chat navigation unchanged.
- The relocated menu acts on the currently selected chat and preserves its current
  actions and safeguards. Switching chats updates the target; a non-chat tab must
  not expose stale actions for a previously selected chat.
- Keep the ellipsis and + distinct, accessible and reachable in landscape, portrait,
  split view and with overflowing tab strips. Preserve chat state and scroll position.
- Verify the installed iPad layout. This relocates an existing menu; the proposed
  new message-level More actions menu in item 5 remains on hold.

### 14. Prevent unintended blue accents on iPad

Requested October 5, 2026. Status: operator reports intermittent blue colors on iPad;
the supplied screenshot shows a blue selection line on the nested chat tab while
other app accents remain green. Cause and correction are not yet verified.

Keep tab selection indicators and other app-owned controls consistent with the
Proteus theme instead of intermittently switching to a default blue accent.
Investigate affected iPad states and inherited tint behavior before choosing the fix.

Verify selection, tab switching, refresh/reconnect, opening and dismissing menus or
sheets, appearance changes, rotation and split view. Check both top and nested tab
strips and other affected controls in the installed iPad app. Preserve intentional
semantic colors and platform accessibility behavior.

### 15. Auto approve tools for this chat only

Requested October 5, 2026. Status: chat-only approval scope is missing from the
inspected source; implementation and verification pending. No live approval setting
was changed while recording this request.

Provide an explicit **Auto-approve for this chat only** choice that does not change
the workspace's saved permission profile. Current source routes chat permission
changes through the run's schedule into `PermissionStore.setMode`; profiles are
keyed by provider, working directory, roots and integrations, not chat identity.
Other chats and schedules with the same permission context therefore share the
current setting, despite the control appearing inside an individual chat.

Acceptance criteria:

- Bind chat-only approval to the exact chat on its owning host and its authorized
  permission context. Keep workspace defaults and other existing/new chats and
  scheduled runs unchanged. New, copied or forked chats must not inherit the grant.
- Label the scope clearly in desktop, remote, website and mobile views. Distinguish
  Approve once, Auto-approve for this chat only, and workspace-wide authorization;
  never silently promote a chat choice into persistent workspace trust.
- Show the effective mode and whether it comes from the chat or workspace. Provide
  a clear way to revoke the chat override and show the resulting inherited mode;
  restoring defaults must not misleadingly imply approval is off if the workspace
  itself is already authorized.
- Define and display the grant's lifetime explicitly, including continuation,
  reopening and application restart. It must never migrate to another chat, and
  changed roots/provider/integrations require a fresh scope review.
- Enforce scope on the owning host for every tool decision, including pending
  approvals. Retain existing mandatory approval and sandbox boundaries. Record
  chat versus workspace approval provenance in the audit trail.
- Validate with two chats sharing the same workspace/context and a scheduled run:
  enabling chat-only approval affects only the selected chat, leaves the workspace
  profile unchanged, and revokes without affecting the others. Test remote changes,
  stale revisions, continuation/restart behavior and context changes explicitly.

### 16. Automatic chat names and rename after starting

Requested October 5, 2026. Status: planned; implementation and installed verification
pending. Native new-chat source already has an optional title field and falls back
to the first 64 prompt characters; this does not establish meaningful automatic
naming or a complete rename workflow across clients.

Provide a **Chat name (optional)** field directly above the initial message box on
desktop, website and mobile. Use the supplied name when nonblank. Otherwise choose
a short, descriptive title from the opening conversation. Chat creation must not
wait for naming; show a temporary title while a generated name is pending and keep
a useful fallback if generation fails. Do not assume the Codex, Claude or Copilot
adapters expose identical automatic-title support; verify capabilities before choosing
the implementation, preserving the chat's provider and host boundaries.

Allow the name to be edited after the chat has started:

- Desktop and website: right-click the chat name in a row, tab or title to choose
  **Rename**. Add a subtle edit/pencil icon beside the displayed chat title, visually
  smaller than the name but with an accessible label and usable hit area. Do not
  introduce a redundant title row just to display the icon.
- Mobile: put **Rename** in the existing chat ellipsis menu and offer it by long
  pressing the chat name. On iPad use the existing menu relocated in item 13. This
  does not revive the deferred new message-level More actions menu.
- Open a prefilled name editor with Save and Cancel. Trim surrounding whitespace,
  reject an empty renamed title, and preserve the old name on cancellation or error.

Acceptance criteria:

- A manually supplied or edited name always takes precedence; delayed automatic
  naming must never overwrite it. Distinguish temporary, generated and manual names.
- Persist the title on the owning host and propagate it to chat lists, sidebar
  entries, top tabs, nested conversation tabs and open views across clients.
  Preserve it through refresh, reconnect and restart; guard against stale edits.
- Renaming changes chat display metadata without restarting a turn, changing the
  provider session, granting permissions, renaming the source schedule or losing
  messages, drafts, attachments, tab order or reading position. Permit rename while
  work is running without interrupting that work.
- Cover provided/blank/whitespace-only names, generation failure, a manual rename
  while automatic naming is pending, long and non-ASCII titles, concurrent client
  edits and local/remote chats. Verify installed desktop, website and mobile flows.

### 17. Compact browser link hover status overlay

Requested October 5, 2026. Status: planned; implementation and installed verification
pending.

When the pointer hovers over a link in a Proteus browser tab, show the full destination
URL in a compact overlay at the bottom-left of that browser's visible content area.
Use the operator's Safari-style reference: a content-sized label with a translucent
background that keeps the URL readable over the page, not a full-width status bar.

Acceptance criteria:

- Display the actual resolved link destination, including its scheme, host, path,
  query and fragment, rather than only the link text or a shortened domain. Update
  immediately when moving between links; clear it when leaving the link/browser,
  navigating or switching tabs so no stale destination remains.
- Size the overlay to its content, with subtle padding and readable contrast over
  light, dark and visually busy pages. For long URLs, wrap within the browser's
  visible bounds so the full destination remains inspectable without a fixed
  full-width bar or silent truncation.
- Layer the overlay above the embedded browser page without shifting page layout,
  changing scroll position, taking focus or intercepting clicks. Keep it anchored
  to the active browser viewport when the window/sidebar is resized.
- Apply consistently to main, chat-workspace and Team browser tabs. Verify actual
  embedded browser behavior, including image links, dynamically added links and
  links inside frames, using synthetic pages and URLs.
- Keep hover state transient; do not persist destination URLs in logs or shared
  state. External browser tabs launched by the website retain their own browser's
  status UI. Touch-only clients need no simulated hover; verify pointer-equipped
  clients where embedded browser hover is supported.

### 18. Unboxed browser navigation and new tab controls

Requested October 5, 2026. Status: planned; implementation and installed verification
pending.

Replace the boxed browser Back, Forward and Reload buttons with standalone arrow
and circular-refresh icons. Use slightly larger glyphs as needed for legibility,
retaining comfortable invisible hit areas. Dim unavailable actions, such as Forward
at the end of history, and actually disable them. Preserve visible keyboard focus,
accessible names and subtle hover/pressed feedback without permanent button boxes.

Apply the same unboxed treatment to the tab strips' **+** menu controls at main,
chat and Team levels. Keep their menu behavior and touch targets intact. Verify
light/dark appearance, pointer and keyboard use, navigation availability changes
and constrained widths in the installed app.

### 19. Compact Agent access control design

Requested October 5, 2026. Status: visual direction approved; desktop implementation is in progress.
Before release authorization, partial source work passed syntax checks and all 340
Node tests; main/chat toolbar checks passed before Team screenshot instability.
That earlier result is not current full UI acceptance. New checks and installations
are tracked in `next-changes-release.md`.

Replace the space-heavy Agent access control with a compact robot icon at the right
of the address bar. Pressing it toggles access for that browser tab directly. Make
the enabled state obviously illuminated with a filled accent highlight and inverted
icon colors. When off, show only the muted robot glyph with no box, border or badge.
Use the filled/unfilled treatment and accessible pressed state alongside color.
Use a lighter background for the URL field, matching the approved preview and
keeping the URL readable against the surrounding darker toolbar.

Hovering or keyboard-focusing the icon explains the current state and meaning:
**Off — private tab; agents cannot interact. Click to allow access.**
**On — agents may interact with this tab. Click to revoke access.**
Expose the same meaning through an accessible name and pressed state. Allowing
access does not imply an agent is currently working; show actual ownership separately
when present. Do not use the site-security lock icon for this permission.

Preserve existing semantics: human-created tabs start private; enabling access makes
the tab available to runs; disabling revokes ownership, disconnects automation and
cancels pending actions. Include this revocation effect in the on-state explanation.
Keep scope visibly per-tab and distinguish this from chat/workspace tool auto-approval.
Design previews change no real permissions. Verify obvious on/off contrast in light
and dark appearance, hover/focus explanations and pointer/touch hit areas.

### 20. URL bar Copy URL and certificate information

Requested October 5, 2026. Status: planned; implementation and installed verification
pending.

Add **Copy URL** and **View certificate information** to the browser address bar's
right-click menu, alongside normal text-editing actions. Apply to main, chat and
Team embedded browser tabs.

- Copy URL copies the complete current page URL, including scheme, path, query and
  fragment, regardless of selection or visual truncation. Keep normal Copy for
  selected address-field text. Distinguish the committed page URL from an unsubmitted
  edited address or search query.
- Certificate information refers to the active page's HTTPS connection and actual
  certificate: subject/domain names, issuer, validity dates, fingerprint and chain
  where available. Clear stale data on navigation/tab changes and identify the host
  whose certificate is displayed. For HTTP, local pages or unavailable information,
  explain why no certificate is available; do not show a previous page's certificate.
- Electron provides `dialog.showCertificateTrustDialog` on macOS and Windows. Its
  documented macOS dialog displays certificate information and also offers trust/
  import actions; it is not a dedicated read-only browser certificate inspector.
  Evaluate it against a read-only Proteus details panel for routine inspection.
  Viewing information must not automatically import, trust or bypass validation.
- Verify with the project's Electron version, valid HTTPS, HTTP/local pages,
  redirects, navigation while inspecting and certificate-error states. Preserve
  existing certificate validation and address-field editing behavior.

Reference: [Electron certificate trust dialog](https://www.electronjs.org/docs/latest/api/dialog#dialogshowcertificatetrustdialogwindow-options-macos-windows).
The website's external browser tabs retain browser-owned certificate inspection.

### 21. Remember the selected sub tab when returning

Requested October 5, 2026. Status: implementation authorized and in progress;
verification and installed acceptance pending.

Remember the selected sub-tab independently for each chat and for Team Tools. When
the user switches to a top-level browser tab, another chat or another feature and
then returns, restore the same selected sub-tab instead of resetting to the primary
conversation, Team overview or Standup.

Acceptance criteria:

- Returning to a chat through its top-level tab or sidebar entry selects its last
  active conversation, browser, terminal or document sub-tab. Team Tools restores
  its last active tool or content sub-tab in the same way.
- Track selection by stable parent/chat/host and child identity, not by tab index.
  Switching between chats must not overwrite another chat's remembered selection.
- Resume the existing view without creating a duplicate tab, unnecessarily reloading
  a browser, restarting a terminal command or losing drafts, reading position or
  tab-strip scroll position. Apply item 12's view-position preservation as well.
- If the remembered child was closed or is no longer available, fall back to the
  chat's conversation or Team overview. Do not resurrect a closed child. Explicit
  selection of a different child updates the remembered selection.
- Preserve the selection through ordinary refresh/reconnect and the existing saved
  tab restoration flow, without eagerly loading browsers at application startup.
  Honor intentional navigation to a specific message, document or tool when requested.
- Verify chat A to chat B and back, chat to top-level browser and back, and Team
  Tools to another feature and back, with different selected child types, reordered
  or closed tabs, local/remote chats and applicable desktop, website and iPad layouts.

### 22. Pause at normal zoom before opening the tab overview

Requested October 5, 2026. Status: implementation authorized and in progress;
verification and installed acceptance pending.

When pinching out toward the normal page scale, pause at the unzoomed baseline
(the operator's **0%** point; 1x / 100% page scale) before allowing a further outward
pinch to open the tab overview. Reaching baseline must not immediately replace the
page with the overview.

Acceptance criteria:

- Introduce a perceptible pause at baseline and require deliberate continued or
  renewed zoom-out input after it. Tune the delay and gesture threshold during
  physical trackpad acceptance; no exact duration has been selected yet.
- Coalesce gesture events so momentum or a burst of zoom events cannot bypass the
  pause or open the overview multiple times. Releasing at baseline must leave the
  page visible; a timer alone must not open the overview afterward.
- Reset pending overview entry on reversing the gesture, changing tabs, navigating
  or dismissing the overview. Preserve normal zooming above baseline and other
  explicit overview entry controls.
- Verify actual pinch behavior from a zoomed page and from baseline, including fast,
  slow, repeated and interrupted gestures, without changing another tab's zoom.

### 23. Group the tab overview by main tabs and named workspaces

Requested October 5, 2026. Status: implementation authorized and in progress;
verification and installed acceptance pending.

Arrange the tab overview in groups that reflect the visible tab hierarchy:

- Show standalone main app content tabs first, without a Main heading or other
  group label. These are tabs that do not belong to a chat or Team Tools.
- Group each chat's sub-tabs under that chat's current name, and Team Tools sub-tabs
  under **Team Tools**. Keep separate chats distinct even if their names match.
- After the unlabeled main group, order groups by their parent tabs' displayed order;
  fixed feature workspaces retain their established navigation order. Within each
  group, match the corresponding tab strip's order. Do not sort by title or recency.

Selecting an item activates its existing parent and child tab, preserving position
and content state. Show each eligible open content tab only once. Use browser
previews where available and honest type/title representations for other content;
do not start background browser loads or terminal work to populate the overview.
Reflect renames, opens, closes and item 24 reordering without losing selection.
Verify main-only, mixed chat/Team, duplicate chat names and overflowing groups.

### 24. Reorder movable tabs while keeping fixed navigation anchored

Requested October 5, 2026. Status: implementation authorized and in progress;
verification and installed acceptance pending.

Allow drag-and-drop reordering of user content tabs, including top-level browser,
chat, terminal and document tabs, and movable children within chat/Team tab strips.
Keep **Proteus** and fixed feature/navigation tabs anchored; do not make protected
feature tabs reorderable or allow a movable tab to displace them. Preserve fixed
conversation/tool tabs where the workspace requires them.

Acceptance criteria:

- Reorder within the current strip/group. Moving content between chats or between
  main and Team is a separate capability and is not part of this request.
- Provide a clear drag indicator and drop position, with edge scrolling in overflowed
  strips. Support an equivalent keyboard action and applicable pointer/touch input.
- Persist the new order through refresh and restart. Use stable identities so the
  selected tab, remembered child selection, drafts and scroll positions survive.
  Reordering must not reload browsers, restart terminals or change access grants.
- Update item 23's overview order to match. Closing or renaming a tab during a drag
  must not duplicate, lose or resurrect tabs. Verify fixed/movable boundaries and
  main/chat/Team strips, including local/remote chats and applicable client layouts.

### 25. Restore prominent Proteus branding on iPad and iPhone

Requested October 5, 2026. Status: implementation authorized and in progress;
verification and installed acceptance pending.

- In the iPad app chrome, place the existing Proteus arrow logo immediately to the
  left of the **Proteus** name, matching the established brand mark.
- Make the logo and Proteus name prominent on the iPhone Home page. Use the same
  branding treatment on the iPad Home page, sized appropriately for its layout.
- Reuse the existing logo asset and theme colors, with clear alignment, spacing and
  contrast. Verify narrow iPhone layouts and iPad portrait/landscape layouts without
  clipping the brand or crowding navigation controls.

### 26. Match desktop navigation counts on iOS

Requested during the authorized implementation rollout. Status: assigned to native
mobile implementation; tests and installed acceptance pending.

Show item counts/badges on iPhone and iPad navigation like desktop, especially
**Needs Attention**, and other applicable items such as Chats and Schedules. Match
the desktop definitions and connected-host scope; do not substitute the number of
currently loaded rows or messages. Adapt placement to the iPad sidebar and iPhone
navigation/Home while preserving label readability and the app's theme.

Counts should update after approval/status changes, reviewing failures, archiving
or deleting chats, and reconnecting. Match desktop zero-count behavior and avoid
presenting unavailable data as a confirmed zero. Verify accessibility, narrow
layouts, and matching synthetic state across desktop and native clients.

## 0.2.0 implementation and rollout status

The initial installed base source was `74da6f78827de0145f2164b3a1d2d065202dea0e`;
its integrated Node suite passed 331/331 and signed packaged-app smoke passed. The final
Mac/native follow-up build uses `d24bd8a3904f3370044410b2fb4a306e24f269cd` with
256-file/32-MiB guarded attachment batches, Claude MCP status settling and website chat-title
persistence. It passed 340/340 integrated Node tests and `npm run check`; native follow-up
validation passed 53/53 unit tests and three focused iPhone/iPad viewer tests. Build Mac,
physical iPhone and iPad are now installed in place from the final commit with their signing,
data and pairing identities preserved. Website release `20261005T232043Z` from `d24bd8a`
preserved 9,212 files and configuration/schema/nutrition state; its 23:34:50 UTC audit passed
14/14. A supplemental isolated restore of the recovery capture passed after the ordinary
restore failed; no production writes or live state comparison were made. Web-only
`2355d6bd004d3743bf79566937e1e32697e354bd` then deployed as `20261005T234233Z`,
preserved the 9,212 files and protected state, and passed 14/14 at 23:45:35 UTC. The
actual HC chat showed five grouped Activity entries with approval counts and zero
standalone Auto-approved entries. Work Mac final reinstall/live
readiness check remains in progress. Both physical clients reached both Mac hosts independently at HC 22:48:32 UTC and Personal 22:49:00 UTC. Website base release
`20261005T221822Z` passed 9,212-file verification and 14/14 health checks; a web-only Home
correction from `d9e3d96` was deployed as `20261005T224447Z`; its independent 14/14 health
audit passed at 22:49:33.926 UTC. Work Mac 0.2.0 launched with state preserved. Both desktop
pairing directions passed authenticated read-only chat-index checks: HC saw five Personal chats
and fifteen HC chats around 22:52 UTC, and Personal refreshed fifteen HC chats at 22:54:20 UTC,
with `partial:false` in both directions. The new Build incoming HC device was online with
resource/document grants off. HC passed its normal macOS installed-app signature check without
Keychain or trust changes; it preserved 15 runs, five schedules, open tabs and existing pairings.
The installed Claude MCP status probe has a confirmed startup-settling bug: Safari showed
connected, while ADO/Atlassian appeared pending after an immediate sample. A bounded settle
source fix is in the final frozen build. Build Mac has been reinstalled; HC reinstall and
live recheck remain pending, so earlier values do not prove server failure. HC read the
saved shared-account identity through `/api/app` at 23:09:32 UTC without credential or
scope change. The separate website chat-title persistence correction from `d24bd8a` is deployed; its 14/14 audit passed. A
separate web-only Activity grouping correction is deployed and live-verified. No physical-device live
notification tap, attachment upload, generated-document approval or provider turn is claimed.
Website account timezone is America/Denver with a verified 3:39 PM chat timestamp; automatic/device
zone selection is follow-up. The Home build-ID width fix passed live 1280-pixel visual
acceptance (12-character display and full-ID tooltip) and the 14/14 health audit. Bounded logs
from d24 and the web-only successor are classified. The latter had one expected `.env`
denial, 18 PHP lifecycle entries, 552 known MariaDB `column_stats` warnings and one
unrelated different-account localhost connection abort; Laravel and relay Apache had no
recent errors. This is not an all-clean log result.

## Active release: content tabs, Home, attention review and browser lifetime — October 5

The operator authorized implementation of all previously approved queued work together with the
requirements below, followed by tested updates to both Macs, iPhone, iPad and website. Coordination
and implementation use GPT-6 Sol or lower, at medium/high effort as appropriate. The broader
multi-provider feature and future Safari-style browser tab groups remain deferred. Implementation,
verification and installation receipts must be recorded separately; this entry alone proves none.

- Hide system scrollbars on main and nested tab strips while preserving trackpad/wheel/touch and
  keyboard access. Fade partially obscured labels near trailing new-tab controls. Preserve each
  strip's exact scroll offset through tab selection, sidebar navigation, rerenders and content
  refreshes; no reset to the beginning or unnecessary active-tab scroll jump.
- Main tabs represent user content: open chats, individual schedules, browsers, terminals and
  documents. Feature landing pages (Schedules, Chats, Engine Room, Transcription, etc.) are reached
  through sidebar navigation without adding feature tabs or overwriting content tabs. Preserve
  content state and migrate existing descriptors without dropping open user content.
- Each chat becomes a content workspace: its first persistent child tab is the named conversation,
  followed by user-opened browser, terminal and Markdown/document views. Team Tools keeps its
  persistent tool tabs and gains the same content-view machinery. A single trailing + opens the
  same icon-and-label creation menu at main, chat and Team levels, with scope-appropriate actions
  and honest platform/host capability limits. Menu icons do not each repeat a + prefix.
- Restore open content tabs and their order after reload across the main strip, each chat workspace
  and Team Tools. Persist safe identities/descriptors and selected context; browser tabs restore
  unloaded until activated. Restoring a terminal must not restart its previous command or create
  background work. Do not restore document bodies, credentials or interactive-preview grants.
  Website external browser tabs remain browser-owned; restore their Proteus link/launch descriptors
  without reopening external windows automatically. Recheck current authorization on activation.
- Reuse the main browser toolbar throughout embedded browser surfaces: Back, Forward, Refresh,
  address/search and Go with consistent icons and states. Website external cross-origin tabs
  retain normal browser controls; do not promise control of those tabs from the Proteus website.
- Add Home first in navigation and show it on initial app load. Explain Proteus capabilities,
  display the actual installed/released version, expose release changelog and update status/action
  according to the configured distribution source. An unavailable/unconfigured updater must be
  explicit, not a fabricated update result. Unmount Home content on leaving and recreate on access.
- Needs Attention includes newly failed chats until successfully opened/reviewed through either
  Chats or Needs Attention. Persist acknowledgment against the current failure event; retry or a
  new failure can require attention again. Reviewing cannot approve, dismiss or hide unresolved
  tool permissions/questions. Retain actual failed status in history. Avoid review on prefetch.
- Expand Engine Room Resources to explain the whole local Electron application footprint and its
  process breakdown. Distinguish app/renderer/GPU/utility and tracked host/provider/terminal child
  processes, unavailable metrics and shared attribution without double counting. Remote/web/mobile
  views must label the owning host and platform measurement limits.
- Replace immediate Team browser unloading with a browser policy across all scopes in each app:
  keep the six most recently touched browser tabs plus every browser tab opened/interacted with
  during the past hour. Unload an older tab only if outside those six. Keep descriptors and reload
  when selected. Actual user interactions update recency; background polls/page timers do not.
  Protect foreground, unsaved, audible, downloading or agent-controlled work from automatic loss;
  show protected state and manual controls. The six is a floor, not a hard memory/tab limit.
- Preserve native iPhone navigation and condensed formatting; wide iPad follows desktop tabs.
  Do not terminate terminals, model turns or schedules as a browser-memory optimization. Future
  tab groups are context, not permission to design/implement that additional feature now.

Acceptance includes main/nested strip scroll retention, overflow and focus; all-scope tab restoration
with lazy browser loading and no resumed commands; old-session migration;
consistent creation menus/toolbars; Home mount/unmount and real version/changelog; failure reviewed
on every client, new failure reappearance and approvals retained; fake-clock six-plus-hour policy
with protected activity; process totals with explicit coverage; cross-client regression and signed
in-place device updates preserving application data. No operational schedule is a smoke test.

## Active release: Claude MCP and model metadata — October 5

The operator reported that selecting SafariSelector, ADO or Jira for a Claude chat fails at
Proteus's own unsupported-integration guard. This is an adapter gap, not evidence that those
servers rejected a request. Implement explicitly selected MCP configuration with the same host
permission boundary and provider-specific status/authentication handling. Do not inherit unrelated
MCP servers or remove the confirmed PreToolUse hook requirement. Keep secret values out of process
arguments, logs and Git; validate using synthetic servers before any installed acceptance.

Display version/resolved-model information that the installed Claude runtime actually reports.
Keep aliases clearly distinguishable from explicit model IDs, preserve provider descriptions and
capabilities, and never manufacture a model-version table. Unknown token usage on a real provider
must not display the rehearsal-only explanation. The workplace task shown in the report is a
reference for diagnosis, not an instruction to execute those operational actions during testing.

## Active release: chat context menus, archive and delete — October 5

The operator added this to the current release. Source and synthetic cross-client acceptance
passed for archive/unarchive, filters, guarded deletion and cache/tombstone behavior. No existing
user chats were deleted for testing; installed end-to-end deletion was not exercised.

- Offer context menus on desktop/web chat rows and tabs, with equivalent native long-press
  actions. Other applicable content lists/tabs expose their existing actions consistently.
- Add Archive/Unarchive and Delete actions to the chat view. Archive state belongs to the owning
  Mac and propagates through its authenticated remote API, rather than becoming a client-only flag.
- Hide archived chats by default. Add a **Show Archived** switch after **Through Date** in chat
  filters, including compact expandable native filters. Identify archived records and allow
  unarchiving without losing the conversation or its provider association.
- Confirm deletion with the owning Mac/chat identity and scope. Deleting a Proteus chat must not
  delete generated documents, workspace files, provider-owned originals or schedule definitions.
  Reject deletion while execution, queued work or unresolved approvals would be orphaned.
- Invalidate deleted-chat caches, content descriptors and pending capabilities; reject stale
  continuation/document/attachment requests. Sync and reload must not resurrect the chat.
- Verify local and paired remote archive/unarchive/delete, default and archived filters, safe
  active-state rejection, confirmation cancellation, tab/cache cleanup and reload behavior.

## Active: optional tmux, terminal history and seamless reconnect — October 5

The operator selected tmux-backed persistence plus local saved history for this release. Proteus
must still work when tmux is absent. Install tmux on Work Mac through its existing reputable package
manager and verify with a disposable session; preserve unrelated sessions and shell configuration.
Verification found tmux 3.6a on Build Mac and 3.6b already installed on HC, so no new package
installation was needed. HC disposable-session attach/detach/persistence/cleanup and isolated
Electron quit/relaunch integration passed. Installed Personal startup showed zero terminal processes;
a real production tmux session was not started for acceptance.

- Keep **Terminal** as the user-facing tool. Ghostty remains accurate renderer/appearance detail:
  `ghostty-web` provides the embedded WebAssembly terminal and `node-pty` the host connection.
- Opening a terminal lets the operator choose a specific available tmux session (or create one)
  and a Ghostty/terminal appearance profile, with sensible saved defaults preselected. Provide
  session/preset management and explicit attach, detach, rename and end controls. Preserve existing
  profiles and distinguish appearance from session identity/lifetime.
- Tmux sessions continue after closing their Proteus tab or quitting the app. These actions detach
  the view; only an explicit End session terminates a persistent managed session. Report resource
  ownership and retain normal non-tmux PTY fallback when tmux is missing or unavailable.
- Restore terminal descriptors and bounded private local output. Reconnect to an existing session
  when activated. If the process no longer exists, typing a command should transparently create a
  fresh shell and deliver that input once, without a separate Start new session button. Preserve
  old output with a truthful ended/reconnected marker and keep initialization races/error retries
  from losing, duplicating or silently replaying input.
- Never replay a profile startup command because of restoration, renderer reload, reconnect or the
  first keystroke into an ended session. A new explicit terminal launch may use its configured
  startup command. A Mac reboot/crash does not preserve running tmux processes; distinguish saved
  output from a live session.
- Save history only on the owning Mac, privately and with bounded retention/clear controls. Do not
  sync terminal contents through the Life/shared API or add a remote-shell endpoint as part of
  this change. Do not modify unrelated tmux sessions, global tmux config or shell history files.
- Validate tmux present/absent, real attach/detach/restart, synthetic output restoration, no command
  replay, typing during reconnect, explicit End and profile/default choices with disposable data.
  Existing production shells and provider processes are not test fixtures.

## Active release: generated-document links and click-to-open Markdown tabs — October 5

Status: host approval protocol, bounded asset manifest, relative-link approval and cross-client
readers passed synthetic security/UI acceptance. Personal and native builds are installed; no
existing user document was opened or approved in live installed-client acceptance.
Before 0.2.0, local desktop `.md` links opened a Markdown tab, while remote desktop and website
links lacked the equivalent host-approved reader. The approved host/document identity, authorization
and offline design below is now implemented and synthetically tested; installed live-file approval
remains unverified.

- When a chat generates or updates a proposal, design document, journal entry or similar Markdown
  artifact, expose a clear clickable document title/filename in the response. Use a genuine file
  reference from the response or confirmed tool output; do not infer successful creation from
  prose alone or scan unrelated folders to find potential artifacts. First scope is Markdown.
- Clicking the document opens and selects its rendered Markdown in the originating chat workspace
  on desktop/web/wide iPad, using the later content-tab design. Keep the chat tab, draft and reading position intact.
  Repeated clicks activate the already-open document for that host/file identity. On iPhone use
  the equivalent document view with Back/swipe back to the retained chat.
- Do not open documents, switch focus, create a split view or force side-by-side presentation
  automatically when generation finishes. The operator's click is the opening trigger. The October 5 content-workspace design governs placement; broader Safari-style tab groups
  remain deferred.
- Resolve a remote document through its owning Mac and show host provenance. Use an authenticated,
  bounded read-only document capability tied to the authorized chat/file; recheck current roots,
  canonical paths/symlinks, file type and size on the host. Never treat a remote path as local,
  publish a public file URL, execute document HTML/scripts or broaden workspace/resource grants.
  This adds in-app document viewing; native remote Open/Copy path and context editing stay excluded.
- Retain safe Markdown rendering and supported relative-link/image resolution within the same
  authorization boundary. Show missing/moved/denied/offline/unsupported-host states explicitly.
  A restored document tab is a descriptor, not authority to reread a revoked file. Distinguish
  current disk contents from any deliberately retained snapshot rather than implying immutability.
- Register a host-owned document ID bound to its chat and filesystem reference. Remote links and
  restored tabs use host/chat/document identity; only the owning Mac resolves the path. IDs and
  previously rendered links are not bearer authorization. Add an independently granted, revocable
  Connections capability, **View chat documents**, without enabling general resource access,
  filesystem browsing or editing. Existing peers must not silently acquire this grant.
- The implemented authorization boundary also requires trusted host approval of the exact
  linked document version for the requesting device, with a short expiry. A peer-level grant
  alone cannot transmit content. Pending requests contain metadata only; changed bytes or a
  different device require a fresh request and approval.
- Read through the existing authenticated encrypted relay transport. Recheck the peer's current
  grant, chat/document association and current host filesystem boundary for every document/image
  request. Do not expose the broader local `/api/markdown` reader as an unrestricted remote method.
  Return bounded Markdown plus title, modification time and a version identifier for the bytes read.
  Reading a document requires no AI turn and no plaintext document store in the website database.
- Opening fetches the latest saved version. If a file changes while its tab is open, offer Refresh
  rather than silently replacing the visible content. Related local images require separate
  authorized bounded reads. Moved/deleted/denied files and unsupported hosts remain explicit states.
- Initially retain document contents only in memory while the tab is open; persist tab descriptors,
  not document bodies or automatic offline copies. If the owning Mac disconnects after loading, retain
  the visible copy with its last-read time/version. If no copy is loaded, explain that the owning
  Mac must reconnect. Persistent offline caching is a later explicit option. Sign-out/account
  changes must clear retained private content; revocation prevents further reads but cannot recall
  bytes already delivered to a client. Transport encryption does not remove website-client trust.
- Acceptance: generated and updated links; duplicate clicks; version/refresh behavior; loaded and
  never-loaded offline states; reconnect; revoked grants; cross-chat/host/account ID substitution;
  spaces, Unicode, case-insensitive Markdown extensions and anchors; missing files; denied roots,
  traversal, symlink replacement and bounded reads/images; safe rendering; chat-state preservation;
  no automatic opening and no persistent content cache. Use synthetic files and transcripts.
  Interactive HTML previews are approved as the separate queued extension below. The Markdown
  viewing grant alone must never enable scripts or install a general code runner.

## Active release: interactive artifacts with explicit script approval — October 5

Status: static and explicitly approved interactive previews passed synthetic containment
fixtures across desktop, web and native. No existing artifact was executed in an installed client;
website previews have no hard CPU/memory guarantee.

- Support provider-neutral HTML/CSS/browser-JavaScript artifacts from Codex, Claude and Copilot.
  Use one artifact contract and preview behavior across desktop/web/iPhone/iPad. Open only on
  click, using the document tab/reader flow above, preserving chat state. Replace any provider-
  specific preview helpers with a small Proteus interface; do not require an OpenAI file format.
- Initially show an isolated static preview with scripts disabled. Keep **Enable interactive
  preview** in trusted Proteus chrome, outside generated content. Identify the artifact, owning
  Mac and version, and explain that this enables browser JavaScript inside this preview only.
  Script-dependent artifacts should show a clear enable prompt rather than an unexplained blank.
- Bind approval to the viewing account/client, source host, artifact and exact content version,
  including bundled executable dependencies, for the current preview session. Ordinary rerenders
  must not prompt again or rerun initialization; changed code/dependencies require new approval.
  Do not inherit approval across unrelated artifacts, clients or restored app sessions. Offer
  **Stop scripts** to destroy the active execution context and return to the static view.
- Run approved scripts in an isolated, disposable browser context without Node/Electron APIs,
  shell execution, filesystem authority, app credentials, authenticated browser cookies, other
  chats or ambient Proteus API access. Keep Markdown sanitization unchanged. A generated `.cjs`
  file remains source text unless a separately designed host execution workflow is invoked;
  approving a preview is not approval for Node scripts, dependency installs or build commands.
- Keep network access, embedded remote resources and app actions blocked by default, including
  before script approval. Prefer self-contained artifacts and authorized bundled assets. If a
  preview needs external access or a privileged action, explain the missing capability and
  require a separate narrow permission through trusted UI; enabling scripts cannot imply it.
  Validate any preview-to-host messages against explicit capabilities and the approved context.
- Use the approved host document identity, authorization and bounded relay delivery for remote
  artifacts and assets. Script approval cannot expand file-reading grants. Retain contents and
  execution state in memory only initially; clear on close, sign-out/account change or revocation.
  Include active previews in Engine Room resource controls with stop/unload actions and honest
  platform measurement/interruption limits. Ordinary website JavaScript has no hard CPU/memory
  budget and synchronous code may block an in-page Stop control; do not claim otherwise.
  No model call is needed for ordinary local preview interactions.
- Acceptance: static and script-dependent fixtures from each provider; explicit enable/stop;
  same-version rerenders, changed code/assets and session restoration; remote/offline behavior;
  keyboard/touch and native layouts; blocked network, host APIs, cross-artifact storage and
  attempted top-level navigation; fabricated approval controls; runaway-script stop/unload;
  denied/revoked document grants and account transitions. Use synthetic artifacts and disposable
  profiles. This queue entry is design approval, not permission to execute any existing artifact.

## Active release: tab-bar branding and persistent navigation icons — October 5

Status: source and focused cross-client UI acceptance passed. The installed Personal app showed
the compact full-width top bar, sidebar and collapsed icon rail; the original layout was restored
after inspection.

- Place the full-width top tab bar above the sidebar, with the compact Proteus name and current
  logo at the upper left. The sidebar and its hover slide-over begin below that bar. Reduce main
  and child tab height and horizontal padding without shortening the existing title character
  limit; preserve usable controls, dividers and scroll positions. Place the collapse arrow near the
  sidebar top edge, remove excess space above Home, and tighten left/right sidebar padding while
  retaining usable controls. This is the latest layout steering.
- Move the compact Proteus name and existing app logo into the top tab-bar chrome so branding
  remains visible with the navigation minimized. Preserve the current product logo and icon
  artwork; the illustrative mockup logo is not an approved replacement.
- Slightly enlarge navigation icons and normalize their perceived size, alignment and stroke
  treatment. Equal bounding boxes alone are insufficient when glyphs occupy different areas.
  Apply the same shared sizing rules to corresponding desktop/web and wide-iPad controls.
- Minimized navigation retains a narrow rail of clickable feature icons, active-state indication
  and accessible names/tooltips. Pointer entry still opens the sidebar as a slide-over; leaving
  closes it without shifting the content, losing focus or intercepting unrelated chat controls.
  Preserve explicit expand/pin controls, keyboard access and a touch alternative on iPad.
- Acceptance: expanded, icon-only and hover-overlay states at normal/narrow widths and UI scales;
  long/overflowing top tabs; active feature/subitems, pointer transitions and keyboard/touch use.
  This changes shell presentation, not feature routing or the location of iPhone allowance.

## Active release: remote desktop chat parity and automatic earlier history — October 5

Status: local/remote parity and automatic-history behavior passed synthetic client acceptance;
installed Personal retained both online Mac destinations. No live paid remote model turn was used.

October 5 operator follow-up: the installed remote chat still differs from the regular
chat in its details sidebar, composer and viewport layout, with duplicated action
controls visible in the supplied screenshot. The earlier synthetic results do not
establish installed visual parity. See Next changes item 2 for the correction and
required installed acceptance.

- Reuse the local chat composer and layout for remote desktop chats: the same message box,
  Send/Queue/Steer/Stop behavior and destination-provider model, effort, speed and applicable
  context-size controls. Use the owning Mac's refreshed catalog and advertised capabilities.
  Apply selected settings to the next queued turn, preserve the active turn's settings and keep
  the chat on its original provider/host. Never silently substitute a model or route locally.
- Present the same read-only chat details as a local session where the host supplies them:
  input/output and supported cache/credit metrics, session identity/files metadata, captured
  workspace and loaded context, source versions/delivery state, model history and approvals.
  Desktop/web use the normal details sidebar/adaptive layout; mobile keeps expandable Chat
  details and Loaded context with its existing compact visual treatment.
- Omit native remote file Open/Copy path actions and context-changing controls from this increment.
  Read-only source/path metadata can remain informative; do not map remote paths to the viewing
  machine, request new filesystem grants, alter context or expand resource access for parity.
  Context-size model selection is distinct from changing selected workspace/context sources.
- Replace the normal Load earlier messages button with automatic page loading near the top of
  remote conversation history, including web/native equivalents where applicable. Preserve the
  visible message/scroll offset when prepending, stop at the beginning, show a compact loading
  indicator, and offer a retry on failure. Coalesce loads, deduplicate stable event IDs and
  preserve activity boundaries, open disclosures and playback through pagination/live updates.
- Retain per-account/host/chat drafts, selected model settings and scroll state across tabs and
  reconnects. Offline and older-host capability limits must be explicit; no replay of ambiguous
  sends. Keep provider setup on the host and existing host-side permission enforcement.
- Acceptance: the same synthetic local/remote transcript and composer states; model changes
  through a real test peer without billable prompts; source/session details read-only; older-host
  fallbacks; repeated upward scrolling during streaming, reconnect, failed paging and long history.

## Active release: pasted image and file attachments in chat — October 5

Status: implemented across desktop/web/iPhone/iPad including remote chats. Exact one-use
consent, provider byte delivery and client UI passed synthetic tests. The follow-up larger-batch
source change allows 256 files within 32 MiB total and 8 MiB per file, with bounded staging,
sliding inactivity expiry and the same ordered consent. Final Build Mac, iPhone and
iPad installs and both d24/web-only final website 14/14 audits passed. The Work Mac final
install and live Claude readiness check remain pending. The supplied attachment-strip image remains a
presentation reference; no existing user file was sent during validation.

- Pasting images adds preview thumbnails in an attachment strip at the top of the composer.
  Clicking/tapping a thumbnail opens a large modal preview; clicking the backdrop or its X
  closes it. Pressing Escape also closes the active image preview and returns focus to its
  thumbnail/composer; it must not close the chat tab or cancel a running turn. Include focus
  containment and an accessible close control.
- Pasted non-image files appear as filename tags, with type/size where useful. Keep attachments
  outside the editable text if simpler; allow multiple mixed attachments, text and per-item removal
  before sending. Retain their association with the draft and show sent attachments in history.
  Use platform paste/file-selection equivalents where clipboard file access is unavailable.
- Stage attachments locally until explicit Send/Queue (or another explicitly supported send
  action). Show preparation/upload/error states and provider capability/size limits; unsupported
  formats must produce an actionable explanation, never silent omission or claimed delivery.
  Images should reach image-capable providers as images, not only a path on the viewing device.
- Bind every attachment to its account, destination Mac, chat and submitted message identity.
  Deliver remote bytes through an authenticated encrypted host transport; do not expose public
  file URLs or give the website provider credentials. Define bounded size/count/type validation,
  filename/path normalization, draft protection, retention and cleanup before implementation.
- Preview untrusted file contents safely; do not execute pasted files or interpret file content
  as privileged application instructions. Pasting itself grants no workspace trust or broader
  tool permission. Treat attachment removal, cancelled sends, retries, account/host switches and
  application restart explicitly so content cannot be silently sent to another destination.
- Acceptance: multiple image/file paste with text, remove/retry, thumbnail/full preview dismissal
  and keyboard accessibility, native clipboard/files equivalents, local and remote delivery,
  duplicate send protection, provider rejection, large/unsafe files and cross-account isolation.

## Active release: allowance refresh and approved chat presentation — October 5

Status: the October 5 interactive chat proposal is included in the authorized active release.
The flow applies to desktop, web and mobile; mobile keeps its condensed native formatting and
solid message boxes. Source acceptance passed and the 0.2.0 clients were deployed as described
above; the installed Personal fresh Copilot quota returned 75.1% remaining without a model turn.
Private chat contents, machine paths and account usage values are excluded from this record.

Confirmed requirements:

- **Copilot reset:** prefer a valid future provider reset timestamp. When its monthly allowance
  reports a missing/past reset, show an explicitly labeled expected reset derived from GitHub's
  documented first-of-month 00:00 UTC rule, in the viewer's display zone. Preserve the raw
  observation and its freshness separately; never invent a replenished allowance or apply this
  monthly rule to other providers' rolling windows. Investigate why the installed runtime reports
  a past timestamp. Check actual billing metadata before calling the allowance premium requests:
  current GitHub AI Credits and legacy premium requests must not be conflated.
- **Adaptive usage refresh:** one host-owned, coalesced refresh policy per provider/account context:
  about five minutes while that provider is executing chats or schedules, about one hour when
  idle. Waiting for user input alone is idle. Refresh after a completed turn (debounced), sign-in,
  wake/reconnect when stale, and an expected reset; keep manual refresh. Consume genuine runtime
  usage events promptly, but do not substitute session tokens for account allowance. Define minimum
  request spacing, timeout/backoff and last-success/observation timestamps; preserve last-known
  data on errors. Clients receive the host snapshot rather than each owning provider polling.
  Consolidate the separate quota read inside Copilot status/model refresh, or idle checks will
  still run every five minutes. Preserve the host's usage privacy setting and existing sign-in.
- **Provider identity:** use Copilot, Codex or Claude consistently for response labels, including
  streaming and historical messages, across web/desktop/mobile. Keep the underlying assistant role
  unchanged. If a named agent is selected, retain its recorded identity as secondary information
  without hiding the provider. Older data must use a safe recorded-provider fallback.
- **Conversation parity:** the desktop conversation is the visual and behavioral reference for
  web: message surfaces, type/spacing, Markdown/tables, timestamp format, composer controls,
  scroll-follow/Jump to latest, tool details, and Copy/Read Aloud. Share normalization and reusable
  rendering where possible instead of maintaining a second incompatible event renderer. Compare
  the same synthetic event stream on all clients. The supplied screenshots also show differing
  display zones; review implicit UTC defaults versus intentional user time-zone choices, without
  changing stored UTC instants or silently overwriting an explicit preference.

Approved presentation direction, implemented with synthetic cross-client acceptance (the mockup used illustrative data):

- Group consecutive routine tool activity and automatic approvals between assistant/user messages
  into an expandable Activity block, with a deterministic summary such as “3 files read · 2 edited
  · 1 command.” Preserve chronological order, pagination boundaries, expanded state and scrolling
  during streaming. Live groups show the current action; completed groups collapse by default.
- Expansion lists each tool's operation, executing Mac, target path/URL, command and working
  directory when supplied, timestamps/duration, result or failure, and the rule that authorized
  it. Deeper raw details remain bounded and redacted. Show missing information honestly rather
  than inferring a target from the chat title or the nearest event.
- Record a stable tool-call correlation and the resolved target/matched trusted root for future
  approval audit events. Today the standalone automatic-approval event retains kind/reason/mode
  but omits the path and call ID; only an already-associated tool may carry the reason. Handle
  approval-before-tool ordering and legacy unlinked events without losing the audit record.
- Keep actionable approval requests, questions, failures, interrupted work and authentication
  issues prominent. Show a failure badge even when a group is collapsed. Context compaction can
  be a small timeline marker; old authentication warnings should remain historical once recovery
  is verified (see the existing MCP reconciliation item). Grouping must not change permissions.
- Add expandable Usage/Context details per turn/session using reported input/output/cache tokens,
  model, tool duration and provider credit totals where available. Mark incomplete/unsupported
  metrics; do not manufacture exact per-file cost or use an assistant's narrative as a billing
  ledger. Current Copilot code persists input/output totals and optional session metrics, but
  the remote projection omits the latter. Review a redacted, compatible contract before exposing.
  Desktop/web can use the normal details sidebar; mobile retains expandable Chat details and
  Loaded context. Flow, data and actions are shared without forcing desktop styling onto mobile.

Acceptance for the queued work: fake-clock active/idle/provider-isolation and event/manual-refresh
coalescing tests; month/year/DST reset tests; stale/missing/future provider values; identical
provider labels and synthetic transcript content on desktop/web/native; correlated/unlinked
approvals, failed tools and secret redaction; streaming/pagination/scroll preservation. Live
provider validation is read-only and must not restart active sessions or send a billable prompt.

Sources reviewed October 5, 2026:
[GitHub individual billing](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing),
[organization billing](https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing),
[legacy request billing](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/github-copilot-premium-requests),
and [SDK usage APIs](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing).

## Active release: Team Tools subtab dividers — October 5

Status: matching desktop/iPad dividers passed focused UI checks. The clients are installed;
manual traversal of each live installed Team tab was not part of the guarded install check.

- The persistent Team Tools and Standup subtabs previously lacked the visible separation used
  between browser subtabs. Matching vertical dividers now separate Team Tools and Standup, and
  Standup and the first browser subtab. Keep the main tab bar and this secondary bar distinct.
- Use consistent divider height, spacing and contrast across the secondary tab strip while
  preserving the active-tab underline and current tab behavior. Check each fixed tab selected,
  a browser tab selected, and narrow/overflow layouts; include the corresponding iPad tab strip
  in the parity review.

## Active release: preserve generated Standup when links change — October 5

Status: implemented and verified in isolated Electron acceptance: generated order and fixed positions
survive link additions/edits and undock/redock. Installed real-list mutation was not exercised.

- Before the fix, adding a Standup link reset a docked generated order to “Generate for today,”
  and undock/redock did not restore it. The isolated regression now preserves that order.
- Adding or editing links must preserve the already-generated order and current presentation
  state for the selected list and day. Docking, undocking and redocking must display that same
  result, without reshuffling participants or requiring regeneration.
- Investigate link-save refresh, shared-list revisions, daily-state invalidation and dock
  remounting without assuming a root cause. Keep daily results scoped to their list and date;
  link-only edits must not be treated as a request to regenerate the roster.
- Acceptance: generate an order, dock it, add a link and verify the exact order remains visible;
  undock/redock and switch away/back to Team Tools and verify the same result. Cover link edits
  and removal too, while retaining explicit regeneration and list/day isolation.

## Active release: iPad corrections — October 5

Source and simulator acceptance passed for both corrections; the physical iPad was updated in
place with app data and preferences preserved. Live shared-list edits were not exercised.

- [x] **Open the selected shared team configuration (source and simulator verified).** Selecting an existing named team
  list on iPad currently opens a new-list form instead of that list's configuration. Load
  the selected API record, including its stable ID, revision, members, instructions, links
  and timezone. Editing/saving must update that same list; create a new list only through
  the explicit New list action. Verify selection between multiple existing lists and confirm
  that opening or saving one does not create a duplicate.
- [x] **Separate main browser tabs from Team Tools browser tabs (source and simulator verified).** The iPad's global
  new-browser control must use the same plus/globe artwork as desktop, without the visible
  word “Browser,” while retaining an accessible New browser tab label. It must open and
  select a browser tab in the main top tab bar, including when Team Tools is active.
  Team Tools keeps its own separate browser-tab control and secondary tab collection,
  matching desktop. Verify that each control adds a tab only to its intended collection
  and preserves the other collection's tabs and selection.

## Active release: iOS notification tap routing — October 5

The operator reports that tapping a Proteus notification can crash or fail to open its target.
Native investigation and cold/warm routing regression tests are a release gate. Preserve host and
chat/schedule identity, wait for app readiness, avoid Home overriding a pending notification, and
show missing/offline targets safely. Existing notifications may be local; this is not proof of APNs.

The operator has no paid Apple Developer membership. Native background remote push remains pending
an APNs-enabled signing team and server credentials; retain the current signing configuration.
Local notifications and their tap routing do not require enrollment. Do not purchase membership or
change signing/account settings implicitly.

## Active release: provider sign-in recovery and refresh without restarting

Status: local Sign in/Reconnect, timeout/cancellation, delayed completion, account labels and
provider-specific execution holds passed synthetic integration. Copilot, Codex and Claude use
supported authentication handoffs. No live sign-in validation or credential change is claimed.

- Add visible Sign in / Reconnect actions to Providers and actionable recovery links wherever a
  provider blocks starting or continuing a chat. Distinguish signed out, expired authorization,
  connection failure and an account without model access; use provider-supported authentication.
- Show sign-in progress, the account being connected, success, cancellation, timeout and retry.
  Support browser/device authorization on the Mac, with clear handoff and synchronized status on
  iPhone/iPad. Keep credentials and authorization codes out of transcripts, logs and repository files.
- On successful sign-in, recheck the provider account and refresh its model/capability catalog,
  usage where supported, selectors and connection indicators automatically. Manual Refresh must
  also detect authentication completed outside Proteus; refreshing only a stale client is insufficient.
- Recover provider authentication without quitting Proteus. Use supported credential refresh or
  safely replace an idle provider connection. Preserve active/waiting turns, queued messages,
  native session continuity, selected context and unsent drafts; if reconnection must wait for an
  active turn, explain that state and complete it when safe. Do not stop unrelated providers.
- Preserve secure credential storage, existing accounts and pairings. Do not silently sign out,
  reset Keychain, weaken access controls or fall back to plaintext credential storage.
- Acceptance: for each provider, test initial sign-in, expired/revoked credentials, external CLI
  sign-in, cancel/timeout/retry and refresh while another chat is active. Verify Mac/iOS converge
  on the current account and catalog without app restart; use isolated mocks for regressions and
  report live sign-in validation separately. Account/model checks must not launch a paid chat.

Observed recovery gap: Copilot CLI sign-in succeeded, but Proteus's forced provider refresh still
reported signed out with zero models. Restarting the idle app restored authenticated status and
19 models. This is evidence for the Copilot path only; equivalent failures in Codex and Claude Code
have not been established. The shared recovery experience should cover all three adapters.

## Active release: reconcile MCP connection status with the active chat

Status: current-session MCP failures now take priority over configuration-only Connected status,
with refreshed OAuth/session checks and synthetic coverage. Live provider OAuth recovery remains
unverified; historical tool events are retained.

- Reported Atlassian case: MCP configuration shows Connected while a resumed Copilot chat emits
  `MCP atlassian: needs-auth`. Keep this separate from provider-account sign-in: a provider being
  authenticated does not prove that a selected MCP is authorized in the current chat.
- Trace status from provider runtime events, per-chat MCP status, configuration views and OAuth
  completion. Check stale caches, account/profile differences, resumed-session configuration and
  whether connection checks inspect the same server instance the active chat uses.
- Show the scope and freshness of connection state. Reconcile current runtime authentication
  failures promptly across Mac/iOS; do not label a server usable solely because configuration or
  another session reports Connected. Retain historical chat events without presenting them as
  current failures once recovery is verified.
- Provide actionable sign-in/retry/error details and recheck the affected session after OAuth,
  without app restart or interrupting unrelated runs. Do not reset credentials as a diagnostic.
- Acceptance: reproduce contradictory configuration/session status with isolated fixtures; cover
  resumed chats, token expiry, reauthorization, stale responses arriving out of order and matching
  Mac/iOS status. Verify recovery via a non-mutating MCP check where supported; distinguish that
  check from actual successful tool use and record any remaining live-validation limits.

The operator supplied a local chat reference and screenshots. Keep those diagnostic references
with local app support records, outside Git; repository tests and documentation use synthetic data.

## Connection and presentation corrections — October 5

This section records the earlier October 5 interim release; the current 0.2.0 rollout is above.
Implemented in the current source: three-column desktop allowance; host-owned names refreshed
from authenticated connections; website account/browser destination lookup and explicit connection
states; desktop-style website chat filters/main tabs; native device-zone chat timestamps;
same-tab native browsing/navigation controls and localized visit/device history with pagination.
Both desktops and physical iPhone/iPad are updated. Website release `20261005T060541Z`, including
navigation fix `7975f77`, is deployed: 9,209 files and 14 public endpoints verified, with schema,
runtime configuration and nutrition unchanged. Live All Macs Chats, all filters, main New Chat,
absence of inner chat navigation and the authorized eight-member Standup list are verified.
Default Mac is saved as Build Mac; guarded API readback preserved all other preferences,
and website reload verified the selection and live provider allowance. Build Mac's screen
was locked at that audit, so no native UI checks were claimed then. Later 0.2.0 installed UI
acceptance is recorded above. The final log window confirms
the known MariaDB system-table issue plus seven still-unclassified warning entries; maintenance
remains open. Personal → HC pairing was saved and online; HC → Personal remains incomplete.
At that earlier checkpoint HC's control check was unreachable and no signed-install receipt
existed; its install hold protected an active digest job. Preserve that workflow safeguard. Physical shared-account
acceptance remains separate. See `release-validation.md`.
There are no product-specific personal/work Mac categories. Any paired host can be selected by
its stable host ID; its display name is configured on that desktop.

## Message actions — October 4 follow-up

Copy and local Read Aloud buttons beneath completed assistant messages are implemented across
desktop/web/iOS. Active playback adds Pause/Resume, Stop and a text-position scrubber. Desktop/web
share one local-voice controller; native uses system speech. No provider execution or cloud voice
fallback is introduced. See `chat-rendering.md` for controls and platform limitations; installation
and deployment remain separate from implementation/test status. Build Mac, iPhone, iPad
and website were updated for that follow-up. HC ran `17719ea` then, including the empty-peer
startup fix; relay and providers passed after installation without a Keychain prompt. The underlying item ACL
was not changed or proven repaired. See `release-validation.md` for receipts.

HC packaging follow-up: evaluate a consistent signed identity to prevent per-build Safe Storage
reauthorization. Preserve existing encrypted data and require a reviewed migration of trust;
do not weaken Keychain access or treat signature changes as proof of a password problem.

## Cross-client parity — October 4 implementation

The operator authorized implementation, accepted **Engine Room**, removed the tagline, confirmed
that the proposed rosters/URLs are not sensitive or prohibited by workplace policy, and deferred
all multi-provider implementation. The requirements below remain the product contract; the
source-reviewed baseline and SEC table record the starting point, not current implementation.
See `parity-release.md` for implemented behavior, remaining security tradeoffs and release receipts.

Implemented: contextual/collapsible navigation, Chats/attention naming and artwork, aggregate
bounded chat indexes, website Default Mac, sidebar/Home allowance, Garage artwork, Team Tools
and shared named lists/links, local daily standup/docking, new-tab search/history, Engine Room,
resource unload/close, remote schedule editing, authenticated revocation, notification/log history,
and notification transport foundations. Native shared tools require separate `app:read app:write`
consent. Production Web Push is provisioned with an active worker; device delivery acceptance
remains pending. Background APNs still requires an entitled build and server credentials.
Build Mac and website parity releases are deployed. Browser-home follow-up `8e3ab51` is
installed and visually verified on Build Mac: top-aligned search, bounded long links and
25-entry **More** pagination. Shared app consent is verified there. Both iPhone and iPad are
updated over Wi-Fi with data and both destinations preserved; iPad shared-account sign-in needs
its on-device system flow. HC has the update installed and state preserved, with normal
startup, relay and provider checks passing. Personal → HC authorization is saved and online;
HC → Personal remained incomplete then; it is still under inspection after the 0.2.0 install.
Bidirectional completion is not claimed.
The current release does not add per-session short-lived host grants, merge browser/native pairing
keys, or implement multi-provider work. Those security protocol improvements remain open.

### Product contract and current starting point

Desktop and website should have the same information hierarchy, wording, icons, feature views,
controls and interaction behavior wherever platform capabilities allow. iPhone/iPad should expose
the same features with native mobile layouts. Desktop remains the AI execution bridge: provider
credentials, tools, workspaces and execution stay on the destination Mac. Life uses the shared
Proteus website API across all clients. Feature parity is an ongoing release criterion, with
explicit capability explanations for platform exceptions and a migration path for old clients.

| Area | Source/recorded baseline | Queued change |
| --- | --- | --- |
| Life | Desktop/mobile already use the website API; separate renderers remain | Adopt the website's best Garage views and vehicle artwork; reconcile every Life view |
| Allowance | Web meters exist on the connected remote page, subject to host visibility | Make allowance available throughout the website shell from its configured default Mac |
| Destinations | Account-backed website keys deployed; enrollment/real cross-browser acceptance pending | Persistent account Connections with reviewed key custody and reliable revocation |
| Desktop peers | Chat transport exists; desktop allowlist excludes schedule commands | Remote chat/schedule control parity, including permission/context/MCP capability review |
| History | Host-specific chat lists; mobile cache; desktop remote snapshots in memory only | Authorized aggregate Chats index, bounded caches and incremental updates |
| Standup | One local `standup.json` with random/fixed members and current order | Team Tools, multiple API-backed lists, saved links and local daily presentation |
| Browsing | Bounded per-open-tab URL/title history and restored tab descriptors | Searchable history across closed/open Proteus tabs, new-tab page and search engines |

### PAR-01 — Shared navigation, wording and presentation

- Use **Chats** everywhere in user-facing navigation and messaging, replacing Run history.
  Keep internal run identifiers/schema compatible. Adopt the iPhone's paired chat-bubble icon
  (`bubble.left.and.bubble.right`); use equivalent shared artwork on desktop/web.
- Treat the desktop Proteus chat presentation and messaging as the reference: shared labels,
  composer states, tool activity, approvals, empty/error/offline states and Markdown behavior.
  Every displayed message has date **and** time; native iPhone/iPad chat messages follow the
  device time zone, while desktop/web honor their display setting. Store instants in UTC; retain date-only domain values.
  Test daylight-saving transitions and timezone changes without rewriting historical timestamps.
- Needs attention uses an **!** icon with an accessible label, replacing the diamond.
- Expand subitems only under the active left-navigation feature. Life contains Garage,
  Nutrition, Fuel & mileage and the other existing Life views; switching to Chats/Schedules
  collapses those subitems without closing their tabs or discarding state.
- Chats expands to the five most recent authorized chats by title, plus **More** for the full
  list. Use the aggregate ordering, destination badges and accessible full titles.
- Desktop/web open each chat in its own Proteus tab; opening an existing chat activates it.
  Use `(hostId, chatId)` identity so equal IDs from different Macs cannot collide. Preserve
  drafts and scroll state. Use the website's **X** close treatment and desktop-style dividers;
  closing a background tab must not activate it. Support keyboard/focus and overflow behavior.

### PAR-02 — Website destination and AI allowance

- Add a website-specific **Default Mac** setting, stored with the account and initially set
  by the operator to a paired Mac's verified identity. Never infer identity from its label
  or choose the first paired host. Provide an explicit temporary switch and a separate action
  to change the default; browsing another host's chat must not silently change new-chat routing.
- The website defaults new AI work and allowance to that Mac. Every composer/schedule/action
  shows its actual destination; an existing chat stays on its owner. If offline, show the
  offline state and require an explicit switch, with no automatic fallback to another Mac.
- Show allowance in the desktop/web shell (including Life/Team Tools), with compact/expanded
  states, host and provider/account provenance, reset details and freshness. Do not confuse
  provider usage with token counts, invent missing quota, or label stale observations current.
  Respect existing privacy/visibility settings; explain hidden/unavailable status and keep a
  website display preference separate from authority to read host usage.
- Desktop retains local provider setup and local-machine allowance by default. Provider
  accounts may share a subscription across Macs: do not sum identical account quotas as
  independent budgets. Show verified identity where available and unknown identity honestly.
- Website has no provider credential/configuration workflow for now; setup/sign-in remains
  on desktop. Web/mobile can use the destination's advertised providers and supported models.
- Reading an aggregate list from several authorized Macs is independent of executing new
  work on one default Mac; list filtering must never change execution routing implicitly.

### PAR-03 — Life and mobile parity

- Adopt website Garage artwork by vehicle type and its strongest cards, detail hierarchy,
  history/evidence, maintenance, fuel and mileage interactions across desktop and mobile.
  The website has trailer/ATV variants while desktop currently draws one generic vehicle;
  reconcile accepted vehicle kinds as well as icons so editing cannot lose existing kinds.
- Inventory every Life operation/view/filter with shared fixtures before restructuring.
  Centralize API validation, permissions, calculations and record semantics; preserve food
  versions, record/evidence identity, dates, account-scoped drafts and retry-safe writes.
- iPhone Home is the desktop/sidebar feature directory and the location for AI allowance;
  allowance is not persistently overlaid on every phone screen. Bottom navigation: **Home,
  Chats, Life, Team, Engine Room** (accepted name). Other features are reached from Home.
  Preserve existing optional-feature preferences with an explicit setup affordance when hidden.
- iPhone opens chats in a navigation stack; swipe back returns to the retained list position.
  iPad uses the desktop-like sidebar and top tabs when space permits, adapting in narrow/split
  layouts. All clients share message semantics, action availability and timezone preferences.
- Account & Security offers personal information, timezone, passkeys, authenticator/recovery
  and session controls on every client. Native clients may use a secure system authentication
  flow for sensitive account operations; no credential handling in an arbitrary embedded page.

### PAR-04 — Aggregated Chats and bounded caching

- Default to an aggregate of all connected, authorized desktop chat indexes, including the
  current desktop where applicable. Include device, provider, status/Needs attention, date,
  search and meaningful workspace/schedule filters; preserve filters and list position.
- Show cached rows for temporarily offline hosts with last-sync/partial-result indicators.
  Load paginated summaries first and message pages only when opened; do not download every
  transcript to build the sidebar. Define index DTOs including provider/destination fields,
  stable sort/tie-break rules, per-host cursors/epochs, tombstones and permission revisions.
- Refresh incrementally with bounded connection fanout, backoff and background work when the
  platform permits. iOS suspension is not an always-running sync guarantee. A failure on one
  host must not blank healthy/cached destinations or resubmit uncertain actions.
- Partition caches/drafts by account, host, chat and authorization scope. Bound disk/memory
  size with documented retention/eviction; protect native caches using OS keys and review the
  browser cache threat model separately. No sensitive plaintext in localStorage or generic
  service-worker HTTP caches. Logout, account switch, forget and authenticated revocation have
  explicit purge rules. Encryption cannot protect against malicious authorized page scripts.
- Titles, snippets, tool results and even status may be restricted information. Enforce data
  disclosure before indexing/replication; pairing alone does not authorize cross-domain copying.
  For restricted destinations, show only permitted metadata or a clear unavailable result.

### PAR-05 — Connections and remote Proteus control

- Standardize the user-facing name **Connections**, replacing Remote access/Remote Access and
  singular Connection. Keep **Account & Security** distinct; internal routes can remain stable.
- Through the encrypted relay, an authorized desktop/web/mobile client should start/continue
  chats, answer approvals/questions, run schedules and edit supported schedules on another Mac.
  Audit the full command matrix rather than assuming desktop peers already match phone/web.
  Add negotiated/versioned capabilities and clear unsupported states for older hosts.
- Preserve receiving-host enforcement, workspace/provider policy, revision conflicts, unknown
  schedule fields, durable mutation IDs and repository ownership. Source-owned schedules are
  changed through their owning repository's supported workflow, not overwritten remotely.
- Full Proteus control means explicitly supported application operations. It does not grant
  unrestricted OS control, credential export, desktop IPC/CDP access or provider setup from web.
  Remote tab/resource controls need separate host capabilities and authorization.
- Account-level pairing is **pair once per Mac**, then available after account sign-in across
  browsers. Keep user identity/MFA in the existing website/API; the relay remains encrypted
  transport. Native clients retain protected device credentials; account-based enrollment
  must not silently copy a browser key into every device or broaden previous pairings.
- Connections distinguishes connect/disconnect, forget locally, remove account enrollment,
  revoke a browser/device and revoke all account access to a Mac. Show pending/confirmed
  revocation when a host is offline. Account enrollment is not the same as an active session.
  Resolve SEC-01–04 below before expanding account-backed remote authority.

### PAR-06 — Team Tools, Standup and team tabs

- Rename the main feature **Team Tools**. Its secondary tab strip sits directly under the main
  app tabs: a persistent **Team Tools** overview first, then **Standup** and browser subtabs.
  Standup is a tool within this feature, not a separate top-level navigation item.
- Store multiple named team lists in the Proteus API/database, with stable member IDs,
  random/fixed ordering groups, instructions, timezone and revision conflict protection.
  Share these configurations across signed-in authorized clients. Migrate existing local
  lists with preview, idempotent import and backup; do not overwrite competing client lists.
- The generated daily order/date can remain unique per app and selected list. Store it locally
  with its source revision/date/timezone; web sessionStorage is suitable if it needs only to
  survive reload in that browser tab. Closing the browser session may clear that daily result.
  This is separate from durable shared team configuration and restored browser-tab descriptors.
- Add **New browser tab** in the Team Tools subtab bar. Navigate to team boards/backlogs/queues.
  Right-click (or native touch equivalent) offers **Add to standup links** and **Unload tab**.
  The overview has editable named/ordered standup links, paste/add/remove controls and **Load
  standup links**, opening the selected list's links inside this feature with a bounded batch.
  Store link configuration with its API-owned list and the same scoped authorization.
- Restore open team-tab identity, grouping, order, selected tab and safe URL/title/history
  after app reload. Restore descriptors without eagerly loading all pages. Keep authentication
  in the protected local browser profile; never save POST bodies, passwords, tokens or unsafe
  callback URLs. Arbitrary website form/scroll state cannot be guaranteed by URL restoration.
- Leaving Team Tools unloads its browser contents while preserving tab descriptors; returning
  loads the selected page on demand. Keep other app tabs loaded until closed or explicitly
  unloaded. Protect unsaved work and active downloads/media/agent use with visible choices;
  never silently destroy an active operation to satisfy an idle-tab policy.
- For desktop use isolated native browser views with no privileged preload or implicit agent
  access. Web embeds only sites that allow it; otherwise use ordinary browser tabs and explain
  the limitation. Do not proxy authenticated Jira/ADO pages or strip their framing/CSP rules.
  Web cannot guarantee automatic multi-popup opening or manage an external tab's later state.
- The operator confirms these team rosters/URLs are not sensitive and are allowed by workplace
  policy. Their account-scoped API storage is authorized. Do not infer permission for unrelated
  professional records; keep private source data out of this repository.

### PAR-07 — Engine Room and resource management

- Suggested section name: **Engine Room**; alternatives **Systems** or **Control Center**.
  Discuss before changing labels. Contents: **Resources**, **Providers** (desktop setup),
  **Connections**, **Account & Security**, and **App Setup**.
- Resources lists open tools/tabs and the host they belong to, loaded/unloaded state, observed
  CPU/memory and observation time. Use real process metrics; shared-process rows and overhead
  must not be double-counted or falsely presented as exact per-tab measurements.
- Offer **Close** and **Unload**. Unload destroys disposable page contents, preserves a safe
  descriptor, and reloads on selection. Right-click tabs exposes the same action. Chat-view
  unloading/closing must not cancel host work; stopping a run or terminal process is a distinct
  deliberate operation. Do not unload the execution host or credential manager as an ordinary tab.
- Web/iOS can show authorized remote-desktop telemetry and commands once supported. Their
  own local CPU/RAM visibility is limited; show unavailable rather than fabricated parity.
  Use low-frequency sampling and bounded subscriptions so the monitor is not itself expensive.
- Native iOS may evict views under memory pressure; restore state without claiming all views
  stayed resident. Other desktop tabs remain loaded by default, with explicit user unload.

### PAR-08 — Browser search, new-tab home and history (follow-up)

- In a new browser tab, an address-bar search term searches **Google** on Enter. Explicit valid
  web URLs/hostnames navigate directly. Define handling for localhost, ports, IP addresses,
  spaces and internationalized domains; reject unsupported schemes and embedded credentials.
  Do not leak a malformed URL, pairing link, local path or token into a search automatically.
- New-tab home shows a top search box with **DuckDuckGo**, **Google** and **Bing** buttons.
  Each button submits the query only to that provider, in the current new tab; Enter defaults
  to Google. Do not send queries while typing or fan one query out to all engines implicitly.
- Below it show all **retained Proteus browsing history**, across open and closed tabs, with
  title, safe URL, visit date/time in the user's timezone, local history search and pagination.
  Keep local history filtering distinct from submitting text to an external search engine.
  Shared browser components apply to ordinary tabs and Team Tools subtabs.
- Add an app-owned history store separate from per-tab back/forward restoration. Existing
  bounded history cannot reconstruct already-pruned/closed-tab visits; import available safe
  entries without inventing dates, and record complete supported visits prospectively.
- Default history is local to the client/browser profile. Do not import Safari/Chrome/system
  history or synchronize workplace URLs across devices without a separate explicit design.
  Include clear-history/individual-delete controls, configurable retention and an option not
  to record visits. Private-from-agents is distinct from history-off/private browsing.
- Exclude credentials, authorization callbacks, sensitive URL parameters and private visits;
  show sensitive-page titles carefully and never preload all history pages or favicons through
  third-party services. No agent history access by default. Third-party pages cannot access
  the privileged new-tab history store, even if they navigate or open a new window.
- Website can retain Proteus-managed links it opened, not read the user's entire browser history
  or track later cross-origin navigation in external tabs. State this platform exception and
  do not weaken browser security to imitate native history coverage.

### PAR-09 — Multi-provider workflows deferred

Keep the existing [design proposal](multi-provider-workflows.md) for a later review. The operator
explicitly deferred all multi-provider implementation in this run, including planning previews.

### PAR-10 — Shared implementation and release acceptance

- Extract shared desktop/web design tokens, icons, navigation/feature registry, canonical UI
  text, message/time formatting, tab descriptors and state models from the existing clients.
  Share safe renderers/transport rather than maintaining competing copies. Keep native SwiftUI
  where platform behavior benefits; use generated/versioned contracts and common fixtures for
  Swift/JavaScript/PHP instead of forcing all clients into one rendering technology.
- Keep Life/Team business validation in the API and execution/security policy on the host.
  Review duplicated controllers/read models and client calculations before moving them; use
  gradual per-feature extraction rather than an unvalidated replacement of the whole website.
- Maintain a desktop/web/iPhone/iPad capability and screenshot matrix for each changed feature.
  Compare labels/icons/layout, narrow/wide/dynamic text, keyboard/touch, date/time, error states,
  filters/pagination, multiple simultaneous hosts/accounts, drafts, restart and stale/offline data.
- Shared logic must not flatten security boundaries: trusted shell, untrusted web content,
  Life account API and encrypted remote commands keep separate adapters and authority checks.
- Release order recommendation: **1)** security/capability contracts and naming discussion;
  **2)** common shell, Garage/chat polish, default Mac/allowance and mobile navigation;
  **3)** aggregate Chats/cache and complete remote schedule controls;
  **4)** Team Tools, shared lists/links, new-tab history/search and resource lifecycle together;
  **5)** multi-provider work remains deferred.
  This is a phased queue, not a promise that every item belongs in one release.

### Security review — findings and work required before expansion

This is a targeted source review plus existing synthetic protocol tests, not a production
penetration test or independent cryptographic audit. Existing protections include strong account
authentication, required passkey user verification in the installed library, PKCE, scoped Life
tokens/tenant checks, CSRF, exact relay browser origins, per-host registration tokens, AES-GCM
session binding/sequences, durable mutation claims and host-side command/permission enforcement.
Keep those protections while unifying the clients.

| ID | Evidence and consequence | Queued response |
| --- | --- | --- |
| SEC-01 | `RemoteDestinationController::credential` releases a long-lived Mac key after strong web sign-in; encrypted database storage is decryptable with APP_KEY. Website compromise can impersonate the enrolled account device. | Explicitly review custody; prefer account enrollment with distinct, scoped, revocable device/session credentials or host-validated short-lived grants. Model recovery/rotation, server compromise and host-offline behavior before selecting a protocol. MFA does not remove server-custody risk. |
| SEC-02 | `RequireStrongAuthentication` checks a verified session, with no recent-auth check on destination credential release/enrollment/removal. `destroy` only deletes the website row; host commands authenticate the device key independently of web logout. | Add recent strong-auth for sensitive connection/security changes, session inventory and host-enforced revocation/expiry. Keep forget/sign-out/revoke scopes truthful. A stolen or previously released key is not invalidated merely by deleting cookies or the account row. |
| SEC-03 | `src/remote-client.js` emits revocation for unencrypted relay `revoked`/`rejected` packets; `src/desktop-peers.js` then deletes its protected pairing. Web preserves its account record; iOS stops/requires re-pair guidance. | Promote authenticated end-to-end revocation from deferred backlog. Unauthenticated notices may disconnect, never destructively erase trusted enrollment. Add forged-notice regression coverage across all clients. This is an availability/enrollment-integrity issue, not evidence that ciphertext is decryptable. |
| SEC-04 | Paired devices currently share the broad host command surface, and account browser sessions share one device credential. Host sync can expose more than a summary index. | Design host-enforced least-privilege scopes, client/session identity, audit trails and separately authorized chat disclosure/schedule/resource actions. Do not treat a renderer allowlist or account membership as the host security boundary. |
| SEC-05 | Desktop peer `methods` excludes `schedule.run`, `schedule.save`, `schedule.preview` and some chat/context/approval capabilities already in `src/remote.js`; its test explicitly expects schedule.run rejection. | Build a reviewed capability matrix and extend desktop controls deliberately; preserve schedule ownership, revision guards and operation UUIDs. Current peer support is not full remote control. |
| SEC-06 | New shared caches/history/team rosters/URLs create new sensitive stores; existing browser history intentionally omits forms and auth callbacks. | Threat-model these stores, enforce account/host/domain boundaries, retention and purge rules, protect URL secrets and validate untrusted content. Review organizational approval before storing real work rosters/boards on a personal service. |

Additional review gates: account recovery and password/email/factor changes versus all sessions,
OAuth token families and Mac grants; exact WebAuthn origin/RP and user-verification enforcement;
session theft/XSS/CSP; CSRF and object-level API authorization; uploads/evidence integrity; key
backup/rotation; relay resource exhaustion and connection fanout; Electron sandbox/IPC and native
Keychain protection. Add targeted tests for gaps; no security sign-off from UI similarity alone.

Primary references consulted October 4: [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[WebAuthn](https://www.w3.org/TR/webauthn-2/),
[frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors),
[Electron process metrics](https://www.electronjs.org/docs/latest/api/structures/process-metric).
Browser embedding follows the target site's policy. Process measurements require shared-process
attribution; neither capability should be overstated as exact parity.

### Confirmed product choices

Use **Team Tools**, **Engine Room**, **Connections**, **Account & Security** and **Chats**.
Remove the tagline under Proteus. Website tools that cannot be embedded open actual browser tabs
without replacing Proteus. Rosters and the requested board URLs are allowed in the shared API.
The relay remains transport, with identity/MFA owned by the existing website account.

## Account persistence and Life API consistency (October 4 continuation)

Account-persistent website destinations are deployed; enrollment and cross-browser restoration
remain pending explicit account-key custody confirmation. API-only desktop Life is installed and
the operator's website sign-in plus native food pagination were verified. Its old database profile
is archived and never used by the runtime. Setup sign-in/spacing, signed-out tab restoration and
graceful HTTP shutdown are covered by focused regression checks. Build Mac/iPhone updates and
relay connections are verified; physical mobile Life sign-in and latest iPad update are deferred.
See `release-validation.md` for exact installed versus source-only observations.

## Shared website, native Life and desktop destinations (October 4)

Implemented: shared dark web/desktop theme and persistent website section tabs; website provider
meters and retained destination; richer native Garage/fuel/nutrition cards and date filters; direct
website Life on mobile with PKCE/Keychain, native forms and retry protection; mobile provider usage;
legacy host-label repair; native desktop peer pairing, full destination catalogs and local-first
history; browser history restoration and long-press navigation menus.

See the current handoff for deployment and physical acceptance. Website account sign-in on each
mobile device remains distinct from encrypted Mac pairing. Native Life and allowance require their
respective account/host connection. Physical trackpad feel, large-history pagination and complete
website/native presentation parity remain follow-up work. Projects are explicitly on hold pending
design discussion; the existing saved workspace configuration remains available.

## Transcription / Life / remote expansion (October 3–4)

Implemented in source: separate Omi and general transcription areas, independently gated native
and Codex schedules, canonical source parity checks, per-native-job lanes, full Proteus-branded
website, native Life setup/records, all-root Markdown browsing, Ghostty terminal tabs/profiles,
full desktop tab restoration/browser gestures, collapsible allowance meters with a separate Setup visibility flag, Claude support, and
separately paired Mac destinations on mobile/web. See the handoff for actual validation.

Website code-only deployment and live relay TLS/two-host routing checks have completed. The
Mac, physical iPhone and physical iPad updates are installed; actual paired-client acceptance on the
new shared relay remains separate. Native
Life backup restoration and the approved additive v2 upgrade are verified, preserving core table
schemas/row hashes and the nutrition digest. Original evidence-file hashes also match. Life is
enabled and ready after Keychain approval; all seven sections read through the installed app’s
actual credential resolver and SSH connection. No production record writes or evidence uploads
were used for acceptance. The four deployment credentials are saved in the authoritative vault
and verified after sync. Both Mac relay hosts are online; the personal host is paired with the
signed-in web client and its schedules were read. The work-host browser pairing has been approved and verified independently of the personal host. Mobile Manage Macs can edit a relay address while preserving the
existing pairing key and history; the operator changed both existing endpoints to the shared relay and confirmed connectivity. Both
physical devices now also retain an independently paired Build Mac destination.

Existing native Omi services and Codex automations still own processing. Installed Codex catalog
and two no-tools synthetic turns now pass, but real workflow tools, claims, context effects and
retry acceptance remain to be verified. Replacements were refreshed while disabled with current canonical fingerprints. Native cutover
also requires restoring the configured
independent policy dependency; general AI schedules need reviewed unattended command approvals.
Review ownership, drain original transactions, then pause/unload only the corresponding
original owners before enabling replacements. Observe bounded real outcomes before claiming
unattended reliability. Bluetooth, recording capture and mobile review remain separate.

Implemented in the workspace-context release:

- Copilot model catalog in New Chat, with refresh and explicit unavailable-model errors.
- Named multi-folder workspaces, default command folder, native folder picker, VS Code import.
- Live context refresh, per-source Every chat / With workspace / Choose per chat / Disabled modes.
- Cross-workspace folders and individual instructions, skills, agents, and MCP source references.
- Exact captured/supplied source versions, per-chat context refresh and retained context history.
- Disabled MCP imports, duplicate/conflict handling, source-relative execution.
- Standup Current/Settings tabs, persisted current date/order, random then fixed ordering.
- Animated working indicator, native session and run paths with Open/Copy, transcript export.
- Optional Copilot data directory for new sessions; existing sessions retain their storage location.
- Desktop credential-provider boundary and explicit Bitwarden login fill in private browser tabs.

See [workspaces](workspaces.md) and [credentials](credentials.md) for behavior and limitations.

## Chat presentation and active-run approvals

- Mac and iOS show one expandable activity per tool call, with arguments, progress, output,
  duration, and success/failure. Empty assistant messages are omitted; final Markdown stays complete.
  Long tool displays are bounded and labeled; original output remains in the provider session.
- Individually saved folder/tool grants display as Saved rules only. Trusted workspace and
  Auto-approve tools remain explicit broader choices. Changes apply immediately to the active chat,
  including a waiting tool; adding context still requires authorization for the new configuration.
- Both clients can change a chat's permission mode. The host checks the context and permission
  revision before applying it. Existing individual grants never become broader trust automatically.
- Provider execution time excludes time waiting for human input. Genuine questions remain interactive.
- Schedule model selection shares the New Chat catalog, including refresh and visibly unavailable
  saved models. Mac default-model settings use the same picker.
- Mac chat and details fill the remaining viewport and scroll independently. Narrow windows switch
  between Chat and Details. Scrolling upward retains the reading position while output arrives.
- Browser navigation has a deadline. Background agent tabs receive usable viewports; detailed
  Playwright errors reach the tool result instead of becoming a generic failure.

## Model settings, external edits and Mac identity

- Capability-backed effort and context tier on Mac/iOS, captured on runs and supplied on resume.
- Host catalog refresh at launch, every five minutes and manually, with visible stale state.
- Fresh schedule reads on reopen/reload; revision conflicts protect external edits and app drafts.
- Local branded Mac bundle and Dock artwork matching iOS; see `mac-app.md`.
- Handoff guide, design decisions, feature references and changelog.

## Chat steering, Codex and MCP recovery

- Implemented Mac/iOS structured tool results, durable queue, live steering and compact Mac browser.
- Compact composer model/effort/speed/context menus and separate Queue/Steer/Stop buttons.
  Captured next-turn choices support model changes within an existing provider session.
- Implemented separate provider catalogs and Codex native execution/continuation with selected
  instruction/skill context and explicit tool-scope compatibility errors. See `providers.md`.
- Implemented Copilot per-chat MCP status and OAuth sign-in on the Mac, available from both clients
  and `/mcp auth <server>`. See `mcp-auth.md` for callback and credential boundaries.
- Preserve verified Copilot vendor signatures in Mac packaging; persistent OAuth progress and
  bounded automatic status refresh on both clients; stable controls while chat output streams.
- Validation details for the release are recorded in the PR and handoff notes; distinguish synthetic
  protocol/UI checks from any real corporate OAuth completion, which requires user interaction.

## Proposed multi-provider workflows

A coordinator chat or schedule could dispatch separate provider sessions through named worker
profiles, live model/allowance discovery, enforced tool/data boundaries and durable child runs.
See [multi-provider workflow design](multi-provider-workflows.md). This is a design proposal,
not installed orchestration. First implement fixed same-host workflows and explicit transfers;
then bounded dynamic delegation and separately authorized cross-host workers. Existing relay
pairings do not grant agents new authority, and company-source policy stays in its own repository.

## Deferred (no implementation yet)

- Detached background daemon/login item, Developer ID distribution signing/notarization, automatic
  updates, additional concurrent AI execution and workflow completion validators. Generic completion
  notifications are implemented; workflow-specific completion proof remains separate.
- Automatic reconciliation of foreign workflow manifests; currently use the owning repository
  exporter and explicit import/refresh.
- Provider adapters beyond Copilot/Codex/Claude/rehearsal; Claude browser/steering parity and scoped MCP OAuth controls; Codex native agent tool-filter parity and per-tool MCP approval interception; changing the provider of an existing chat.
- Paginated on-disk run storage as history grows.
- Further account-session grant hardening remains queued. Authenticated end-to-end revocation is
  implemented in the parity release; unauthenticated relay notices cannot erase enrollment.
- Codex MCP OAuth controls, generic MCP elicitation/input forms, and editor-specific agent hook and extension-tool mappings. Copilot OAuth recovery is implemented per chat.
- Bitwarden extension compatibility and broader token-broker/Keychain bootstrap integrations.
- Automatic VS Code index, unsaved buffers, or existing chat-history transfer.
- Native session relocation or cross-provider conversation migration.

Operator paths, team rosters, private instructions, chat content, and workspace membership remain
in local configuration or their owning workflow sources, outside the app repository.


### 27. Browser toolbar density and colors

Added during rollout, October 5: match browser-toolbar background to the left
navigation green, reduce toolbar and address-field height, and remove boxes from
Stop, Login and Enter so they match Back/Forward/Refresh. Use the same muted text
tint for toolbar controls instead of bright white. Preserve disabled states,
keyboard/accessibility behavior and adequate touch targets. Apply to main, chat
and Team browsers and corresponding controls on other clients.

Work Mac package transfer/install is explicitly on hold until this update is
completed. The separate request to upload the signed app delta to the private
GitHub artifact branch has not been approved; do not retry that transfer while
the hold remains. Build Mac 0.2.1 and website release 20261006T053613Z were
already installed/activated before this follow-up.


### 28. Directional history on held Back/Forward

Added during rollout, October 5: pressing and holding Back or Forward should show
that direction’s page history, nearest first, like a regular browser. Show useful
titles and URLs and navigate directly to the chosen history entry. Normal click
or tap still navigates one entry. A held/dismissed menu must not also trigger a
normal click. Preserve disabled/no-history states, keyboard/touch accessibility,
and menu layering above native browser content. Apply to main/chat/Team browsers
and native long-press equivalents; website-owned browser chrome is outside the
Proteus website’s control. Verify with synthetic multi-page history.

### October 7 correction release

0.2.3 implements the reopened Home, chrome, activity/details, tab-close, native spacing, stable
chat paging, bounded browser-history persistence/sync and HC quota-auth corrections. See the
acceptance audit for the all-50-item review and distinguish pending installed/live acceptance.

October 7 follow-up: shared desktop/web allowance sidebar and modal details implemented; duplicate destination label removed; connected status dot and footer order match desktop. Plain nested Activity Details now matches desktop. HC Claude sign-in is deferred until tomorrow at the operator’s request in the HC chat; quota-only diagnosis found all existing CLI runtimes signed out. No model turn was used.


## October 7 implementation reconciliation

BF-2026-10-07-01 through -17 are reconciled against source, tests and installation in
[the 0.2.4 implementation ledger](2026-10-07-implementation.md). The original intake wording above
remains the acceptance contract. Project transfer destinations are deferred by the operator.
Read-only provider-command output is the supported terminal integration; interactive provider PTY
attachment is not exposed by the adapters. Integration profile mechanisms that cannot isolate
credentials are explicitly listed in the ledger rather than marked connected from configuration.

October 18 browser-agent access acceptance: 0.2.22 removes extension/profile-sharing gates, adds explicit loaded/hidden/unloaded lifecycle operations and updates required agent guidance. Build Mac, Work Mac and web are verified on 0.2.22; the operator manually dispatched HC after cross-computer messaging failed. See [acceptance and limits](2026-10-18-browser-agent-access.md).

October 19 continuation correction: 0.2.23 uses the existing per-turn app MCP bridge for current browser/tab schemas on resumed Codex chats. Preserve native sessions and approvals. See the browser-agent acceptance ledger; build/live verification is tracked separately.

October 19 correction status: 0.2.23 current-tool catalogs for resumed Codex chats pass the final guard, full 740-test suite, static checks, desktop/web normal/narrow UI and exact signed-package gates. Build Mac is installed/live-verified after a second restart; web passes recovery/restore, 14 endpoints and authenticated Source Library inspection. HC has verified the immutable transfer but remains on 0.2.22 pending local unlock and installation acceptance. See the handoff and browser-agent ledger.

## October 15 bounded native CI follow-up

Run 38696071427 passes Linux/Mac desktop and web checks plus all 122 native units. Completed
native jobs record 42 passes and four failures across 46 cases. The remaining 21-case phone
shard failed its redundant address-replacement setup, then stopped reporting progress during
held-history navigation for over 20 minutes; it was canceled and remains partially unverified.
The next candidate retains all 67 UI cases, adds the 123rd native activation regression and
bounds XCTest/step execution while reserving failure/cancellation diagnostics. No timeout,
cancellation or incomplete result counts as successful workflow acceptance.

## October 19 combined release — implementation in progress

The operator lifted this chat's build hold. Branch `codex/next-release-0.2.26` incorporates
`linux-current-mac` at `7c7bc54` through merge `0a5a2f6`, plus the Linux `9439f24` startup repair.
BF-2026-10-19-04–14 and 16–25, 27–29 have source changes in progress; this statement does not mark
their live acceptance complete. BF-15 Widevine is explicitly shelved. BF-26's black text rectangles
remain an independent observed symptom without an established cause or reproduced current fixture.
The accepted native navigation/composer design is promoted with isolated fixture flags retained.
See the checked evidence and remaining gates in `2026-10-19-next-release.md`, browser/workspaces,
providers and desktop-updates documentation. No new production artifact is installed.
## October 19 — Native status area and ordinary app switching

BF-2026-10-19-30: the operator reports iPad sidebar content overlapping the system time.
Reserve the actual top safe area behind a black background and clip the application content
below it, including the sidebar and tab strips. Do not hardcode a device/status-bar height;
check portrait, landscape and window resizing in the authorized iOS release acceptance.

BF-2026-10-19-31: remove the inactive-scene black privacy overlay during ordinary app/screen
switching on iPhone/iPad. Keep normal scene activity, connection and state persistence handling.
Reconsider privacy masking with a future explicit private-browsing feature. Both changes are
included in the currently authorized iOS release work; source is updated, UI/device verification
and installation remain pending.
# October 19 signed restart acceptance follow-up

The disposable signed-helper test resumed its original real Codex session, then exposed unstable
first-run host identity in an owner with remote access never configured. The implementation now
persists that disabled identity; its real service restart regression preserves full navigation and
duplicate-operation receipts. Existing histories/configured owners are not rewritten. A fresh signed
candidate and update/rollback acceptance are still required; production installations are unchanged.

## Linux 0.2.26 installed acceptance

Main `9114970` is now installed as `linux.34d37e887ee5`: 815 tests/static, exact-package UI/PTY/restart
and native New-tab focus pass. The actual UI and a synthetic real Codex session pass; the second
normal launch preserves both chat files and all original protected navigation/approval/configuration
state. Two verified same-owner recovery generations remain; all-root imported inventory initializes
future supervised updates. Official user-local Cua is discoverable, with honest native Wayland
limitations and no Peekaboo fallback. Existing remote access stays disabled. Full receipts stay
private; [installation acceptance](2026-10-19-linux-026-install.md) records hashes and scope.

## Linux early-input/color/IPC follow-up acceptance — installed October 20

Main `e350395` candidate `linux.8e2611e6ef29` is installed after the operator closed the blocking
terminal and authorized continuing. All 817 runtime/static checks, exact-package early keyboard/
PTY/restart, Team native early URL/Enter and sidebar color pass on private X11. Disposable independent
update and forced compatible rollback preserve original rehearsal history and resume once. Actual
idle installation, renderer and second normal launch pass; manual real Codex continuation retains
the same native session and original events without tools. Configuration/history/receipts/cookies,
tabs/drafts and ended-terminal history are preserved. Two verified full recoveries remain after
eligible retirement. Native Wayland Cua control and unchanged disabled remote access are distinct
from these passes. See the [Linux follow-up ledger](2026-10-19-linux-followup-e350395.md).

## October 22 — separate native-link history acknowledgement race

A new diagnostic probe (native page link, then a client address submission under 400 ms descriptor
latency) fails on the unchanged `20791699cc10` release and on the input-authority correction.
An idle owner retains its prior native entry as pending, rejects the newer peer entry under the
strict full-stack guard, then republishes a traversal. Do not weaken `acknowledgesNavigation`,
discard pending history, fabricate receipts or classify the added entry as a user Back action.
A future correction needs a proven acknowledgement of the original operation before accepting
later owner navigation, with complete Forward history and uncertain-request identities preserved.
`PROTEUS_FOLLOW_NATIVE_ACK_PROBE=1` retains the failing probe independently of the unconditional
idle chat-selection regression. No implementation or installed correction of this separate race
is claimed here. Source and private original/candidate traces distinguish observed evidence from
unverified hypotheses about the precise acknowledgement path.
## October 22 — native-helper notice once per launch

The operator requested that the recurring iCloud Passwords desktop-connection warning appear
only once when opening Proteus. Replaced its per-profile 30-second throttle with an app-process
set keyed by extension identity, shared across profiles/windows and browser-host recreation.
Retries, optional permissions and actual connection errors remain unchanged. The limit resets
on the next app launch, never through a configuration/data write. Source regression, desktop
UI and replacement artifact acceptance are recorded separately; the earlier follow-only
candidate is superseded for the next authorized update. The existing wait-for-active-chat
hold remains in force.

Acceptance: 1,056 Node tests pass (one platform skip), static checks pass, and the exact signed
Mac package passes native-failure notice dismissal/retry/reload/restart/expiry and the combined
400 ms follow/history UI checks. These do not claim installation or a functioning third-party
password manager connection; Windows/Linux package acceptance remains separate.


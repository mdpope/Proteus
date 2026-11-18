# Nov 17 release plan

Status: planning only. The operator requested this plan on November 17 and explicitly said
not to build. All items below are queued and unimplemented; this request authorizes recording
scope only. Implementation, packaging and rollout await further authorization.

Nov 15 is closed at version 0.2.45, with its documented recovery and acceptance limits retained.
This document collects the next release's requests without opening a release, reserving a
version or changing the current release pointer. Reserve the Nov 17 version through the normal
release process only when implementation is authorized.

## N17-01 — Move tab menu obscures browser content

The operator reports that the Move tab menu blocks the browser window view. Apply the same
menu treatment already used elsewhere in Proteus; identify and reuse the established behavior
before implementation rather than introducing another menu pattern.

Acceptance: reproduce with a browser tab, compare with the existing shared menu treatment,
and verify placement, visibility, dismissal and destination selection. Check small windows
and menus near window edges. Moving a tab must preserve its identity, history, profile and
session, and must not change access or interrupt unrelated work.

## N17-02 — Workspace rename leaves the old sidebar name

The operator reports that renaming a workspace does not update its name in the sidebar.
Whether restarting updates the label is unknown; do not describe persistence as verified.

Acceptance: rename an existing workspace and confirm that the sidebar and other visible
workspace labels update consistently. Reopen the workspace and restart the application to
verify the saved name. Preserve workspace identity, project/chat associations, tab placement
and selected configuration; compare other open windows where applicable.

## N17-03 — Linux address suggestions repeatedly flash

The operator reports that clicking the URL bar on Linux causes repetitive flashing and fails
to list URLs. A KDE desktop interaction is a possible cause, not an established diagnosis.

Acceptance: reproduce on the affected Linux desktop and inspect focus, suggestion visibility
and dismissal. Verify stable suggestions when clicking, typing, navigating with the keyboard
and switching focus/windows, including an empty history. Confirm that URL selection and
navigation work without a flashing or focus loop. Compare other supported desktop environments
where available and retain any environment-specific limitation explicitly.

## N17-04 — Insert linked tabs without jumping the tab strip

The operator reports that opening a link in a new tab appears to create the tab at the end
of the navigation strip before moving it beside its parent. With multiple tabs, this also
shifts the strip so the new tab sits at the left side of the visible navigation area.

Insert the new tab directly into its intended slot beside the parent, with a smooth slide
into that slot and no transient appearance at the end. Keep the tab strip's existing scroll
position when the new tab fits. If the new tab would be hidden beyond the right edge, shift
the strip contents left only as far as needed to show it. Do not center the tab or align it
to the left edge when a smaller adjustment suffices.

Acceptance: record the insertion and strip position with few tabs and with an overflowing
strip already scrolled to different positions. Cover foreground and background link opening,
a parent near the right edge, and a parent with ample visible space. Confirm immediate final
tab order, smooth insertion, no unnecessary scroll, and only the minimum right-edge reveal
when needed. Preserve the requested foreground/background selection, parent relationship,
existing tab order and browser history/session; repeat successive link openings to check
for cumulative drift or a delayed second jump.

## N17-05 — Consistent desktop browser navigation icons

The operator wants the macOS appearance and sizing for Back, Forward, Download and Enter/Go
buttons on Linux and Windows. The reported controls on those platforms look too small;
the supplied browser-toolbar screenshot is the visual report. Use the current macOS controls
as the design reference. Shared standard icon assets across all desktop platforms are in
scope if needed to achieve consistent rendering rather than relying on platform glyphs.

Acceptance: visually compare macOS, Linux and Windows at normal and scaled display settings.
Match icon shape, apparent size, stroke weight, alignment and button spacing to the accepted
macOS treatment, with usable click targets. Verify enabled/disabled, hover, pressed and keyboard
focus states, accessible labels and tooltips in light and dark themes. Preserve Back/Forward
history, Download actions and Enter/Go navigation behavior. This request queues the desktop
design change; implementation and builds remain held with the rest of Nov 17.

## N17-06 — Configurable browser DNS, defaulting to machine settings

Add a DNS option in browser configuration. Default to the machine's DNS configuration with
Proteus/Chromium-managed DNS-over-HTTPS disabled, including automatic upgrades. Offer an
explicit opt-in for managed encrypted DNS with clear provider configuration and fallback
behavior. Do not silently select an external resolver.

The default means no app-managed DoH; the operating system, VPN or configured resolver may
itself encrypt DNS. Preserve those machine settings. Clearly describe the setting's actual
desktop scope: Electron's resolver configuration is application-wide, so do not present a
per-profile promise unless the implementation can enforce it. Browser DNS controls must not
imply control over separate provider processes or every other network client.

Acceptance: verify first-run and existing installations default to machine DNS with automatic
DoH upgrades off. Verify saved changes, application restart, ordinary and Incognito browser
sessions, and supported desktop platforms. Confirm the actual resolver path with controlled
network evidence rather than inferring it from a successful page load. Validate opt-in provider
configuration and documented fallback, retain normal DNS failure reporting, and leave system
and VPN configuration unchanged. State whether changes apply immediately or require restart.

The operator also requested disabling DoH in the active instance. Current source exposes no
DNS setting or supported live resolver-control action; no runtime DNS change has been applied.
This queued feature does not lift the Nov 17 implementation/build hold.

## N17-07 — Completely delete a schedule from Schedules

Add a discoverable Delete action in Schedules that permanently removes the selected schedule's
definition and future triggers, rather than only disabling or hiding it. The deleted schedule
must disappear from the list and stay deleted after refresh and application restart.

Identify the exact owning computer and schedule, and explain the deletion scope before it is
confirmed. Define and display what happens to associated run history and chats; deleting the
schedule must not silently delete unrelated chats, shared files or source manifests. Handle
active and queued runs explicitly without implicitly cancelling active work. For schedules
managed from a source manifest, explain how deletion interacts with future source refresh so
the schedule does not unexpectedly reappear.

Acceptance: delete a disposable enabled schedule and a disabled schedule; verify that neither
can fire again and neither returns after reload/restart. Cover cancellation of the delete
dialog, active/queued runs, source-managed schedules, stale revisions, unavailable remote
owners and denied permissions. Use the schedule owner's supported revision-bound mutation
boundary, with safe reconciliation after uncertain delivery. This is a planning request only;
no existing schedule is to be deleted now.

## N17-08 — Resolve changed schedule context directly on Save

The operator reports that Save schedule is blocked by an instructions-changed message telling
them to refresh context before starting. Saving edits must not require visiting another screen
or finding a refresh action inside a complex menu. Separate saving a schedule from starting it.

When selected context changes, offer a direct Refresh context and save action in the editor's
save flow, or an equally simple resolution there. Fetch current context, retain the user's
unsaved fields and selected sources, validate the resulting schedule, and complete the save
with a clear result. Keep progress and actionable failures beside Save. Do not require Reload
file or discard the draft to resolve a context-only change.

Handle genuine concurrent schedule edits in the same editor: refresh the latest revision,
preserve the local draft, and show only conflicting fields that need a choice. Keep revision
checks and owner authorization; do not silently overwrite another edit, select new sources or
broaden permissions. A context refresh updates future-run configuration without changing the
captured context of an active or historical run, and saving must not start a run.

Acceptance: change a selected instruction while editing a schedule, then refresh and save
directly from the save area with all draft fields preserved. Cover other selected context
types, concurrent schedule edits, repeated source changes during refresh, missing sources,
unavailable owners, failed refresh/save and cancellation. Verify clear saved/unsaved status,
no duplicate writes after uncertain delivery, unchanged active-run captures and no unintended
run or permission change. Keep this queued under the Nov 17 implementation/build hold.

## N17-09 — Work Mac schedule Run now does nothing

The operator reports that clicking Run now in an enabled schedule on Work Mac produces no
visible response. The supplied screenshot shows the schedule header and button; it does not
establish whether a request reached the owner or a run started without feedback. Investigate
the click, request routing, admission and result display before assigning a cause.

Run now must start the selected schedule on its owning computer and promptly show its actual
admission/run state, with access to the resulting run. A blocked or failed start must display
an actionable reason in place, including any required context refresh under N17-08. Prevent
duplicate starts from repeated clicks or uncertain responses; do not report success solely
because a request was dispatched. Preserve recurring timing and existing active work.

Acceptance: exercise the enabled schedule header's Run now action on Work Mac with a disposable
schedule and verify exactly one recorded run plus visible feedback. Cover local and remote
owner routing, changed context, unavailable owners, denied permission, admission failure and
repeated clicks. Confirm that an existing active run is handled explicitly and that ordinary
scheduled execution is unaffected. This queues investigation and a fix only; do not start the
operator's real schedule, implement changes or build now.

## N17-10 — Actionable saved-access review and chat continuation

The operator reports an Work Mac chat blocked by: “Schedule resources changed. Review or revoke
its saved access overlay before running.” The screenshot shows the message repeating after a
continuation attempt, with no human-accessible review control. Treat this as a dead-end workflow;
the warning alone is not a resolution. The exact reported chat link is retained privately.

Show a direct Review access action beside the blocking message, opening an inline review of
what resources or permissions changed, what access is currently saved and what needs a human
decision. Use plain language instead of requiring the user to understand an internal “overlay.”
Provide explicit controls to accept reviewed changes or revoke the saved access, explain each
outcome, and then offer a working continuation from the interrupted checkpoint. Do not require
another screen, a hidden menu, repeated Continue attempts or agent intervention to find review.

Keep the distinction between the interrupted run's access and future schedule settings explicit.
Resolve through the owning computer's revision-bound permission workflow; never silently broaden
access, approve a tool request, rewrite a captured run or treat a retry as consent. Preserve
drafts, completed external actions and existing retry receipts while resolving the block. If
continuation is still blocked after a decision, show the actual remaining reason and its action.

Acceptance: reproduce changed schedule resources during an interrupted disposable chat and
resolve it entirely through the visible chat UI. Test review/accept, revoke, cancellation, stale
review, denied access, unavailable owner and repeated clicks, including remote access to Work Mac.
Verify exactly one continuation without replaying completed work and no unresolved warning loop.
Coordinate with N17-08 context refresh and N17-09 run feedback, but retain separate access consent.
This is queued only; do not change the reported chat's grants or resume it as part of intake.

## N17-11 — Review and qualify Bitwarden biometric integration

Review the Bitwarden biometrics item in Browser Preferences, test the actual user workflow
and fix any integration or guidance defects. Current macOS preferences display setup guidance
for Bitwarden's official browser extension and desktop app, including biometric unlock, browser
integration and native-messaging permission. This is not a separate Proteus biometric vault or
the Bitwarden CLI credential broker. Existing documentation records synthetic native-messaging
tests but leaves actual Bitwarden Touch ID acceptance unverified.

Trace the installed official extension's connection to its desktop helper and confirm the
supported platforms and prerequisites. Make the preferences item accurately describe current
capability, show a discoverable setup/recovery path, and avoid implying that guidance alone
means biometrics work. Test per-profile setup, locked/unlocked desktop app, biometric approval
and cancellation, missing helper, denied native-messaging permission, reconnection and restart.
Verify unlock and ordinary autofill with a disposable login on a controlled page, with the human
performing biometric/OS approvals. Check that another profile cannot reuse the connection or
vault access. Identify and fix supported-platform failures; clearly state genuine external limits.

Keep credentials and vault data out of logs, screenshots, source and test fixtures. Do not weaken
OS/extension permissions or change established vault/account settings merely to pass a test.
This queues investigation, live qualification and needed fixes for Nov 17; no credential test,
vault configuration change, implementation or build is authorized by this intake alone.

## N17-12 — Continue Admiral anti-adblock troubleshooting

The operator reports that Admiral's anti-adblock prompt is still appearing after the Nov 15
correction. N11-71 shipped a Fox News-scoped rule for the observed loader, with synthetic
request-pipeline tests and a live homepage check that did not show the prompt in the tested
profile. That evidence did not establish resolution in the operator's affected profile; the
new report keeps the issue open. Use the previously reported Fox News homepage as the initial
reproduction reference, without assuming the latest occurrence has an identical loader or cause.

Verify the affected installation's build, profile protection settings and effective filter
rules, then reproduce the actual prompt and inspect its current request/loader behavior.
Distinguish delivery or rule-application gaps from vendor changes and state-dependent behavior.
Preserve profile data and existing protection exceptions; do not clear the user's browser state
or disable blocking as the fix. Extend targeted filtering or the relevant integration only from
observed evidence, retaining page content and ordinary website functionality.

Acceptance: demonstrate the reported live prompt before correction and verify its removal in
the same affected environment afterward, including reload, revisit and restart. Retain focused
request-pipeline regressions, protection-toggle/exception checks and representative article
navigation. Separate synthetic passing tests from live resolution and document any recurrence
or unsupported vendor behavior explicitly. Investigation and fixes remain queued for Nov 17;
this intake does not authorize a new build or changes to the live profile.

## N17-13 — Reuse installed extension packages across browser profiles

Add a machine-local library of previously installed extension packages. An extension installed
in Default, such as Bitwarden, should be available to enable in another profile without another
download or manual folder selection. Include packages installed from other profiles as well;
Default is a convenient starting point, not the owner of every profile's extension setup.
Current extension installation records and package folders are profile-specific; this shared
library and cross-profile enable flow are queued work, not existing behavior.

Share only verified package files and package metadata, identified by extension ID, version,
source and content hash. Retain separate per-profile enabled state, settings, extension storage,
sign-ins, vault/session data, optional permissions and native-helper approvals. Enabling from
the library must use the destination profile's normal permission review and setup; it must not
copy another profile's configuration or confer its permissions. Show library availability and
per-profile installation status directly in Browser Preferences with a simple enable action.

Acceptance: install an extension once, enable the cached version in a second profile without
network access, and verify independent configuration, unlock and permissions after restart.
Cover disabling/removing it in either profile without affecting the other, stable extension
identity, account boundaries, package corruption, concurrent enables and failed updates. Define
version/update behavior so a cached package update does not silently change another profile's
active version or grants. Retire package versions only when no profile or in-flight operation
references them. Keep this library local; cross-device package distribution is not implied.
This request remains under the Nov 17 implementation/build hold.

## N17-14 — Direct per-site notification permission controls

Slack reports: “You've disallowed notifications in your browser. You'll need to open your
browser preferences to change that.” The operator cannot find an original prompt or make Slack
request permission again. Browser Preferences must let the user add or select a website and
set Notifications to Allow, Ask or Block, even when no saved permission row or pending request
exists. An old notification must never be required to recover a site's permission.

Provide the same controls for the current site through a discoverable address-bar site-settings
entry, linked to the relevant browser profile's preferences. Show the effective permission and
offer a clear reset to Ask. Apply the exact website origin: a Slack workspace or app origin may
differ from `slack.com`; do not silently grant every subdomain or another profile. Explain when
the page needs reloading after a change and make that reload easy without losing unrelated state.

Investigate whether the current notification permission-check/request integration causes Slack
to see denial before the user has made a choice. Distinguish site permission from Proteus's
system-notification preferences, OS permission and the separate background Web Push limitation.
Do not present an Allow setting as proof that Slack's full delivery path works.

Acceptance: recover the reported Slack permission state using the visible site controls without
an original prompt, verify the page's effective permission after reload, and separately qualify
real notification delivery. Cover no saved row, Block-to-Allow, reset to Ask, restart persistence,
immediate revocation, profile/origin isolation and Incognito's existing restrictions. Retain
ordinary permission prompts and clear failure feedback. This is queued for Nov 17; do not change
the operator's Slack permissions or send Slack messages during intake.

## N17-15 — Drag scratches into workspace and project folders

Allow dragging a scratch in the left file navigation into the desired workspace or project
folder to change its association. Keep the existing workspace/project dropdowns as an equal
alternative. Show clear eligible drop targets and update the navigation, dropdown selections
and saved metadata consistently after a successful drop.

Dropping on a project sets that project and its parent workspace together. Dropping on a
workspace associates the scratch with that workspace and clears an incompatible project.
Use the same owner-supported association/move behavior as the dropdowns, including any required
index or storage-path updates. Preserve scratch identity, content, open editor state and pending
edits; a visual move must not create a duplicate, switch its owning computer or expand access.
Unsupported or inaccessible destinations must leave the scratch in its original location with
clear feedback. Keep dropdowns usable for keyboard and touch workflows.

Acceptance: move between projects in one workspace, across workspaces, and from a project to
a workspace folder. Verify correct metadata and placement after refresh/restart and in other
open views, plus consistent dropdown behavior. Cover an open edited scratch, dragging to its
current folder, cancelled drops, stale revisions, unavailable owners and denied destinations.
Reconcile uncertain delivery without duplicate moves or lost content. This is Nov 17 planning
only; do not move the operator's scratches or implement/build during intake.

## N17-16 — Glassdoor login in the Social browser profile

The operator clarifies that signing into Glassdoor opened multiple tabs which cannot be closed
in the affected window. Investigate both unwanted tab creation and ineffective Close controls;
successful authentication alone is not sufficient acceptance. Initial inventory identifies an
existing `glassdoor.com` tab in the Social profile. A subsequent read-only inventory also shows
five unnamed, unloaded browser entries with no URL in the same project and window; their origin
and correspondence to the reported duplicates remain unverified. The sign-in method and exact
reproduction sequence still need confirmation. Do not
assume that the report concerns a website called `glasdoor.com` or that Social means a separate
tab type. Live page inspection requires the existing tab's explicit sharing approval.

Initial source review found that the embedded browser's `setWindowOpenHandler` denies the
original popup and creates an independent tab in the same profile and presentation parent.
It does not preserve the native popup's opener relationship through that path. This is a
candidate to investigate for authentication flows using a popup, `window.opener`, messaging
or a named window, not a proven cause of the reported Glassdoor behavior. Also inspect actual
redirects, profile/session continuity and any protection-related failure before selecting a fix.

Trace Close from the affected window's control through its browser ID, canonical descriptor ID,
owning window and shared-membership mutation. The current native close path awaits logical
membership closure before removing the local view; a failed mutation can therefore prevent
removal. This is a source observation, not evidence of a particular failed request. Check whether
the reported entries are pending/blank views, stale aliases, rejected closures or tabs recreated
by synchronization. Capture actionable close errors without changing or deleting live state
merely to diagnose it.

Acceptance: reproduce the operator's exact sign-in action in the affected profile, record the
visible failure and identify where the flow diverges. Verify the corrected login return path,
tab/popup lifecycle, selection and placement without unexpected duplicate or blank tabs.
Verify that every unwanted login-created tab can be closed from that window, including blank
or failed-load tabs, and stays closed through synchronization, window switching and restart.
Cover close buttons and keyboard/menu close paths, rapid/repeated attempts and stale membership
revisions. Confirm that other windows' views follow the established shared-close rules without
reopening the closed tab or losing unrelated tabs.
Cover cancellation, retry, reload/restart and the applicable sign-in methods, retaining the
existing browser profile, history, cookies and protection settings. Keep authentication state
and callback secrets out of logs and fixtures; never copy credentials or sessions between
profiles. Add focused opener/callback regressions if that mechanism is confirmed, and separate
synthetic checks from real-site acceptance. Investigation is authorized; implementation and
builds remain on hold with the rest of Nov 17.

## N17-17 — Recurring trackpad scroll stutter in desktop chats and websites

The operator reports a brief hitch about once a second while scrolling with the trackpad in
both chat transcripts and embedded websites. This follows [N11-17](2026-11-15-release-plan.md#n11-17--smooth-scrolling-in-desktop-chats-and-browser-tabs).
The [Nov 15 measurements](releases/2026-11-15/implementation.md#scroll-measurements) used driven
wheel input and still recorded Electron main-process delays up to about 43 ms in a feed scenario.
They did not establish the cause of the recurring physical-trackpad hitch.

Capture real trackpad input and frame timing on the affected installed desktop, with a common
timeline for the Electron main process, chat renderer, embedded page renderer and compositor/GPU.
Identify the call stack or rendering stage at the missed frames. Compare active scrolling and
momentum scrolling in an idle chat and a simple local page, then in a long or streaming chat and
a busy website. In source, the browser profile/account reconciliation and error-theme refresh,
scheduler permission/progress checks, and updater polling all run on one-second timers. Updater
polling can synchronously read the job journal and check recovery receipts when a saved job is
present. These are leads to measure alongside state serialization and browser-state broadcasts.
Confirm attribution with a controlled before/after comparison and fix the responsible work.

Acceptance: repeat the same physical-trackpad runs on the affected machine before and after the
fix. Capture multiple occurrences of the baseline hitch and enough post-fix scrolling to verify
that the recurring frame gaps are gone in both chats and embedded pages. Retain comparable frame
timings, including worst gaps, and add a focused regression for the identified cause. Preserve
chat reading position and auto-follow, native page scrolling and momentum, and the correctness
of any background work changed by the fix.

## N17-18 — Live Chats operations dashboard across Proteus

Carry forward the accepted design from [N11-02](2026-11-15-release-plan.md#n11-02--investigate-a-better-chats-list-design).
The design reference is the [local interactive preview](../../chat-dashboard-preview/index.html)
([revision 5](http://127.0.0.1:8769/?revision=5)). The preview uses simulated records and metrics.
Use the current Proteus dark green treatment by default (preview background `#18231d`, cards
`#223127`, borders `#35473a`, text `#edf2eb`, accent `#c5e9a2`, amber waiting and red failed).
The preview also shows an alternate blue/slate treatment with tinted status cards. Its demo
controls and synthetic updates are for evaluating the design.

### Layout and interaction

- Put compact multi-select computer buttons with online/offline indicators and an **All computers**
  reset on the left. Place small counted **Working**, **Needs you**, **Finished** and **Failed**
  buttons to their right, wrapping naturally at narrow widths. Working includes running and queued.
  Multiple categories combine, a second click deselects, and no category selection shows all
  states. Replace the separate status dropdown. Counts reflect the current non-status filters
  and exclude unverified records. Provide keyboard focus and accessible pressed states.
- Preserve the available chat-type scopes (All operations, User chats, Scheduled tasks and
  Internet searches) and search, provider, workspace, project, schedule, inclusive from/through
  dates and Show archived filters. Use the preview's animated slider for Show archived, with a
  visible focus ring, keyboard operation and accessible switch state.
- Replace manual column selection with **Cards / Table** and keep filters and scope when switching.
  Cards auto-fit at about 300–310 px minimum, allowing at least three across at about 1810 px and
  four to six or more as width permits. Table uses one dense horizontal row per chat, with
  contained horizontal scrolling as needed. In both views show active and attention items first,
  compact quieter finished items below, and disconnected/unverified items separately. Sort by
  latest meaningful action, newest first, left-to-right in each card bucket. Keep direct links to
  the chat, pending request or failure as applicable. Omit expanders.
- Show a concise latest-action summary and keep animated working icons. Only verified running
  cards gently fade a whole-card highlight in and out (about 3.6 seconds, ease-in-out), with
  steady readable text. Waiting, queued, finished, failed and offline cards stay steady. Honor
  reduced motion with a static highlight and status icon.

### Live state and telemetry

Use the owning computer's authorized run state and usage events. Share state mapping, metrics,
filtering and ordering across app-wide, workspace, project and other chat-list entry points,
including scheduled and search chats where they appear. Reuse Cards/Table controls where the
surface supports them and preserve each surface's scope, navigation and permissions. Verify the
affected desktop, web and native surfaces individually and record any platform gaps.

Show running, waiting for the user, queued, finished or failed, with chat title, owning computer,
captured provider/model, workspace/project, latest action and its time, active runtime, and input
and output tokens. Use the current run while it is active and the latest run when none is active.
A queued run has no active time before it starts. Pause active runtime while waiting and finalize
it when the run ends. Keep token usage scoped to that same run. Use `—` for unknown values and
show a measured zero as zero. Distinguish confirmed owner state from stale state. Show offline
cached rows as unverified with a last-seen time, freeze their metrics, and exclude them from
verified totals. Reconcile against a fresh owner snapshot after reconnect before counting them.

### Acceptance and scroll performance

Exercise live transitions from queued to running, waiting, resumed and finished, plus failure,
disconnect/reconnect, stale or out-of-order updates, and missing usage from a provider. Verify
that state, counts and metrics update without page refresh or double counting. Confirm the same
run semantics across scopes and both views. Test combined computer/category selections, all
original filters, archive switch keyboard and assistive-technology operation, and reduced motion.
Check narrow windows, the approximately 1810 px reference window, and widths supporting four to
six or more cards. Verify Table density and overflow and preserve filters across view changes.

Coordinate with [N17-17](#n17-17--recurring-trackpad-scroll-stutter-in-desktop-chats-and-websites).
Apply owner changes incrementally by stable chat and run IDs. Update only affected visible cells
or cards and derive elapsed-time labels from the last verified timing data. Runtime and token
ticks must never rebuild the grid or table or change sort order. Move a chat only when its bucket
or meaningful latest-action timestamp changes, preserving scroll position and keyboard focus.
Keep the running highlight compositor-friendly and avoid periodic full-state broadcasts,
synchronous I/O and layout or paint work for offscreen rows. Compare physical-trackpad traces
before and after with a large multi-computer list, concurrent streaming and reconnect activity,
in both views and while scrolling a chat or website. Verify that live dashboard updates introduce
no recurring main-thread stalls or missed frames.

## Validation and delivery

No implementation, tests, build, installation or publication is claimed for these requests.
Before implementation, read the relevant navigation/menu and workspace/browser contracts.
When authorized, use focused regressions and native UI acceptance for the affected behavior;
track source verification and installed acceptance separately in the release records.

# Nov 17 release plan

Status: closed at version 0.2.46. See the [closeout](releases/2026-11-17/closeout.md).
The operator lifted the Nov 17 planning hold after Nov 15
closed at 0.2.45. Complete and validate source before freezing it for packaging. Rollout was
initially authorized for Build Mac, iPhone and iPad. On Nov 20 the operator also authorized
Work Mac and Linux desktop, then production web, Ian's laptop and the `proteus` Windows desktop.
The final Build Mac handoff follows those three. The operator also authorized publishing
the Windows x64 build to downloads.proteus.example for the Windows consumer rollout. Other Linux computers and
public promotion of the Mac and Linux packages remain deferred.
Track evidence in the [implementation](releases/2026-11-17/implementation.md)
and [rollout](releases/2026-11-17/rollout.md) records. References below to the intake hold describe
the original request. Existing account, site, and tool approvals still apply.

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
and correspondence to the reported duplicates remain unverified. The operator confirmed email sign-in. The exact reproduction sequence still needs confirmation. Do not
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

Source checkpoint: Instruments confirmed recurring Electron main-thread stalls on the installed
Mac during the physical exercise. An isolated Electron comparison reproduced comparable stalls
while decoding near-limit encrypted peer messages. Native base64 conversion eliminates the
per-byte JavaScript allocation path. The candidate needs a physical before/after check in each
surface alongside verification of the actual message cadence and size.

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
The app uses its configured Proteus palette. The alternate colors and demo controls
stay in the interactive design reference.

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
- On desktop and web, put the non-selectable Chats heading first on the underlined scope strip.
  Put clear and refresh next to search and Cards/Table, followed by the labeled filter fields.
  Show bucket counts and aligned Table headers. Use a 3 px leading accent on Cards,
  put the computer name on the top line, and use muted typography for finished chats.
- Replace manual column selection with **Cards / Table** and keep filters and scope when switching.
  Cards auto-fit at about 300–310 px minimum, allowing at least three across at about 1810 px and
  four to six or more as width permits. Table uses one dense horizontal row per chat, with
  contained horizontal scrolling as needed. In both views show active and attention items first,
  compact quieter finished items below, and disconnected/unverified items separately. Sort by
  latest meaningful action, newest first, left-to-right in each card bucket. Keep direct links to
  the chat, pending request or failure as applicable. Omit per-chat expanders.
- Show a concise latest-action summary and keep animated working icons. Only verified running
  cards gently fade a whole-card highlight in and out (about 3.6 seconds, ease-in-out), with
  steady readable text. Waiting, queued, finished, failed and offline cards stay steady. Honor
  reduced motion with a static highlight and status icon.

### iPhone and iPad

Keep the existing compact iOS Chats list as the default Table view, with essentially the same
information per row as today. Add compact multi-select computer buttons and counted Working,
Needs you, Finished and Failed buttons. Let the controls wrap as needed and keep the existing
filter expander for secondary filters.

Cards is the optional detailed view, primarily for iPad. Follow the accepted card design with
latest action, placement, provider/model, active runtime and input/output tokens. Fit multiple
cards across iPad when space permits and use a single column on iPhone. Preserve filters when
switching views. Verify the compact list and filter expander on both devices, the single-column
iPhone cards, and the iPad layout at full and split-view widths.

### Live state and telemetry

Use the owning computer's authorized run state and usage events. Share state mapping, metrics,
filtering and ordering across app-wide, workspace, project and other chat-list entry points,
including scheduled and search chats where they appear. Reuse Cards/Table controls where the
surface supports them and preserve each surface's scope, navigation and permissions. Verify the
affected desktop, web and native surfaces individually and record any platform gaps.

Provide running, waiting for the user, queued, finished or failed, with chat title, owning computer,
captured provider/model, workspace/project, latest action and its time, active runtime, and input
and output tokens to the detailed views. Use the current run while it is active and the latest
run when none is active.
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

## N17-19 — Mnemosyne Ask audio admission and routine tools

The Mac owner advertises and accepts up to 120 seconds of mono PCM16 WAV at 8 or 16 kHz,
with a 3,850,000-byte WAV ceiling. Independently enforce actual sample count and capture
clock span. Keep v1 and the existing 8 MB encrypted relay limit. Allow 12 MB at the iCloud
and frozen envelope reader boundaries for legacy slash-escaped Swift JSON. Verify that the
normal scoped relay and iCloud paths retain the original audio, ownership and request ID
through deduplication, native transcription and original attachment preservation.

Mnemosyne Ask requests use the owner-bound Reminders tool, built-in web search, edits in
the captured Ask Scratchpad project, and named read operations on ObsidianMCP sources
enabled for Life or explicitly selected for Ask. These requests do not need per-request
approval. Retain the protected approval step for sensitive service actions and keep
workspace, account, revision and idempotency checks in their owner services.

After the Build Mac owner update, reconcile the privately recorded rejected request against
canonical receipt and effect state. Allow ordinary iCloud intake to recover the same UUID and
checksum. Report admission, answer, actual effects and any pending approval separately.
The operator owns the phone build and native helper. Verify advertised limits on the Mac
before coordinating phone acceptance. The QR pairing hold is separate.

## N17-20 — Shared iOS feature navigation

Use the project tab strip on iPhone and iPad for Life, Reminders, Scratchpad, Chats,
Needs Attention, Internet Searches and Team Tools. Keep one compact sidebar control and
one New Tab control, with labels in the tabs. Use edge swipe for hierarchical Back and
pull to refresh on feature lists. Keep the Life menu on iPhone and category tabs on iPad.
Make feature resource tabs horizontally scrollable, including the first tab, and use the
desktop hover treatment on iPad. Preserve Team Tools editing actions in their content.

Verify narrow and wide layouts, appearance, tab overflow and pinch overview on each
simulator. Present the two simulator builds for review before physical iOS rollout.

## N17-21 — Tab overview scope and resource residency

Start project overview with Top-level tabs, then the workspace and project groups.
Open the overview at the selected item and allow scrolling back to the app-level tabs.
Feature overview includes app tabs and the current feature's open tabs, including
unloaded Smart Home browser tabs. Keep overview creation based on descriptors and
bounded cached previews. Verify overview performance on iOS and release detached views
and tools when unloading a workspace or leaving its feature. Preserve drafts, operation
receipts, saved navigation, and durable owner state through a return to the view.

## N17-22 — File browser tab placement and layout

Open a file next to the originating Files tab in its exact workspace, project or
feature, preserving the owner and read-only permission on paired devices. Put Open in
tab before New file, align Filter and Refresh, display the count beside the breadcrumbs,
and isolate divider hit testing from row drag. Scratchpad breadcrumb labels use the
display folder name while retaining the full stored path.

## N17-23 — Attachment navigation and Markdown paste

Provide previous and next controls and arrow-key navigation for chat attachments.
Paste images and PDFs into Scratchpad and Markdown editors through the bound file
owner. Store each original beside the workspace document or in its Scratchpad
attachments folder and insert a portable Markdown reference. Use Obsidian PDF embeds
and verify actual rendering, existing text paste, caps, duplicate pastes and access
rechecks across clients.

## N17-24 — Universal search

Open Search Proteus with Super+P in the current desktop window, including when an
embedded website has focus. Group results in order of browser tabs, chats, files,
projects, workspaces, other tabs and features, then settings. Show each result's
workspace, project, feature or settings path in muted text. Support live ranking,
clear, Escape, arrow keys and Enter. Use existing owner access for file and chat
lookups. Cancel stale queries and keep filesystem work off the scrolling path.

Review the working Nov 17 application in the isolated Proteus demo before updating
Build Mac. Keep the existing signed installation in place until review clears.

## N17-25 — Scratchpad names and discovery

Use readable names for new workspace and project directories and Markdown files.
Keep the scratch ID in frontmatter and the index, and use numbered suffixes for
collisions. Let people explicitly rename existing managed files to match their
titles. Keep existing directory mappings until their links can be checked.
Include saved scratches in Super+P with their workspace and project paths.

## N17-26 — Clicked-link picker and computer order

Group local workspaces first, then paired computers in the Engine Room order.
Make workspace headings larger and show a cached site icon beside the URL.
Keep the fixed or last-chosen default, optional countdown and keyboard controls.
Use the same computer order in desktop navigation and destination menus and in
paired iPhone and iPad menus. Review the picker in the isolated desktop demo.

## N17-27 — Conference calls and browser permissions

Support microphone and camera requests in ordinary desktop browser tabs. Bind
website access to the exact origin and browser profile, show macOS hardware
authorization separately, and let the operator request access or open its system
settings. Use an Electron runtime that distinguishes device and display permissions.
Require one local approval for each display request and present the screen/window
picker on the standard capture path. Recheck the tab before releasing its selection.
Show medium thumbnails in the built-in picker, grouped by screens and windows.
Keep the width consistent and let tall sources use up to twice the normal
height, fitting the whole image even at the height limit.
Keep sources selectable when the OS has no preview. Verify filtering, cancellation
and explicit selection with private fixture sources.
In default site mode, secure Zoom pages use the Chromium browser identity so the
Zoom web client uses the browser picker. Verify the same-origin meeting frame,
including picker cancellation and successful selection, then confirm live sharing.

Organize Browser Preferences into General, Profiles & Extensions, Link Picker,
Site Permissions, Security & DNS, and Content Filtering. Site Permissions includes
an explicit notification Allow setting and a local system notification sound test.
Use compact, editable per-origin rows with X to restore Ask. Verify that a fresh
site prompt saves the decision in Preferences, including when microphone and camera
are requested concurrently. Exercise the Chromium screen/window picker and system
authorization on the Mac.
Verify Chromium media and notification paths with fixtures, then test real Zoom,
Teams and Slack audio and notifications with the operator.

## N17-28 — Life and iPad navigation follow-up

Match the Life section icons on desktop and iOS, including Ask. On iPad keep
the app tab strip and sidebar button mounted above the active feature or workspace.
Chats, Internet Searches and Needs Attention use the app strip without a second
static tab. Reminders and Scratchpad keep their own subordinate tab strips.
On iPhone the sidebar continues to hold app-level navigation. Scratchpad's main
page owns the computer selector and the sidebar shows recent scratches across
connected owners. Home Assistant shows setup help and a route back to Smart Home
when a dashboard cannot open.
Use the desktop workspace/project tab metrics for Life categories and subfeatures.
Reuse Life section names and icons between each platform's sidebar and tab strip.
Use native list panel colors in iOS Smart Home and Ask and retain native tab dimensions.
In iOS previews, keep chat recents available and exercise populated and empty sidebars.

## N17-29 — Send macOS screenshots to Proteus

Add the **Send to Proteus** Share extension. Receive screenshot bytes in an
in-memory tray regardless of the selected page. Show thumbnails, let the user
minimize and reopen the tray, and keep originals available for reuse or removal.
When Proteus is closed, try opening the signed containing app. A failed transfer
keeps the original in the Share sheet for retry or copy.

Drag from the tray into a chat attachment draft, an editable Scratchpad or
Markdown document, or a configured workspace folder. Reuse the current editor
asset path and the owner's file grants. Require an explicit drop or copy. Use a
trusted local handoff and deduplicate retries without saving a screenshot file
on receipt. Verify an actual macOS Share-menu send with no chat selected before
the three-device field test.

## N17-30 — Keep the last saved website view when a refresh fails

Show the last successful viewport capture for the exact tab, browser profile and
address while restoring or refreshing a desktop website. If the site is
unreachable or returns a missing-page or server error, keep the saved view and
publish a browser notification with Reload and View logs. Replace the image when
the live page loads. Label the saved view so its limited interactivity is clear.
Reuse bounded tab thumbnail storage and keep authentication and Incognito pages
out of the fallback. Verify both a stopped localhost server and HTTP failure,
then restart the endpoint and verify recovery on the same tab.

## Validation and delivery

Use focused regressions and native UI acceptance for the affected behavior. Track source
verification, packaging, installation and live acceptance separately in the release records.

## N17-31 — OpenRouter provider

Add OpenRouter as an owner-hosted provider for chats and schedules. Save and validate a
workspace API key through protected storage. Expose favorites and the selected model in the quick
picker, with catalog search and advertised token rates. Report generation costs in Run Details and
preserve explicitly partial totals when usage is missing. Verify with synthetic charges first.
Account-backed inference requires an operator-configured API key.

## N17-34 — macOS application menu disappears

The incoming-link picker must preserve Proteus's regular macOS application activation policy.
Verify the policy while the picker is open and after repeated dismissals. Check secondary-window
close and restore independently, keeping the ordinary window checkpoint and update barriers.

## N17-35 — Chats dashboard stability, aging and card size

Preserve verified peer inventory during background refresh. In Cards and Table, show failed,
interrupted and waiting chats as Stale after 72 hours in that state. Keep them searchable in Recently
finished and provide a Stale filter. Use the ordinary title color and a distinct Finished accent.
Scale card width, spacing and text with a locally remembered control in the search row. Verify the
shared desktop and web view and roll the signed desktop build out to Build Mac.

## N17-36 — Document navigation and zoom

Open the unindexed Scratchpad README and preserve the active note or file and its reading position
when switching tabs. Add Document size and Wrap to the scratch editor. Handle trackpad pinch in
document and chat surfaces and give scaled images their own scrolling viewport. Distinguish
custom-port TLS failures from a failure to reach a port. Qualify the exact app on Build Mac.

## N17-37 — Scratchpad path migration

Preview and migrate the Build Mac root’s registered legacy folder and indexed note names.
Keep IDs, associations and file contents, use numbered names for collisions, and retain in-app
aliases for historical Scratchpad links. Use a private recovery copy and verify readback.

## N17-38 — Teams redirects to static assets

Use the regular Chromium identity for Teams’ HTTPS entry hosts in default mode. Verify the
public route reaches Microsoft sign-in on a fresh profile and retain explicit site modes.

## N17-45 — Browser Back and Forward change the selected page

Reconcile the selected history entry by identity and revision across mobile and desktop.
Treat late loads and responses as stale. Preserve Forward through a device-local
redirect during Back or Forward. Verify rapid traversal, a delayed owner read, an
in-flight load and swipe navigation. Recheck the reported tab after physical rollout.

## N17-46 — iPhone typing and page stalls

Use physical-device diagnostics to locate busy threads and repeated writes. Keep
pending visits in a durable journal, refresh offline history once per complete sweep,
avoid duplicate input layout, and write dirty owner state asynchronously on computer
switch. Verify saved visits, history and draft retention, and repeat measurements during
large owner pushes. Verify the reported typing stall with a live trace when available.

## N17-47 — iOS startup and streaming work

Move startup file reads, decryption, parsing and history date filtering for native document
tabs and browser history off the main thread. Publish the restored state before accepting
operations that depend on saved tab identities and pending visits. Update the latest
contiguous chat page directly when a current patch fits within it. Cover a late owner
response and previously queued local history during validation.

## N17-48 — iPhone tab journal and chat runtime

Commit pending tab edits and retry identities through a small encrypted journal. Reuse the
previously committed snapshot when its owner tab rows are unchanged. Save a changed snapshot
before publishing its reference, preserving the last complete pair across an interrupted
write. Prepare runtime intervals from timing fields when they change, preserving overlap,
human wait time and the offline display. Repeat the operator's USB typing and scrolling
sample on the signed iPhone build.

## N17-49 — macOS Local Network after an updater restart

The installed Mac reproduced `ERR_ADDRESS_UNREACHABLE` for the reported Home Assistant HTTP
route on port 8123. The same URL returned HTTP 200 outside Proteus. Earlier
[Local Network evidence](2026-11-15-release-plan.md#n11-37--desktop-browser-cannot-reach-local-network-hosts-regression-queued)
showed different permission records for the app and Chromium helper. Replace the direct
executable launch on macOS with LaunchServices, preserve the owner data and Chromium profile,
and use the returned application PID for recovery. Apply the same launch path to rollback.
Verify the exact signed build against the reported route on Build Mac after supervised restart.

## N17-50 — Content zoom controls and reset

Put Chat size below the upper-right chat actions. Keep its slider and current percentage
in sync with pinch. Use the same 100% reset in chats, document and Scratchpad toolbars,
image viewers and overlays, and the Cards and Table dashboard. Verify the reset restores
the default size, keeps document wrapping and unsent drafts, and leaves images pannable.

## N17-51 — Desktop crash investigation and Apple Passwords helper

macOS recorded a native crash in the Proteus main process and separate code-signing
terminations of Apple's Passwords helper. The helper also failed after Proteus reopened.
Prevent launches of the unsupported Apple host on macOS and surface the browser approval
requirement through the existing extension notice. Verify both native messaging request
forms and ordinary allowed hosts. Compare the reported Linux crash using its own process
and crash evidence when the owner reconnects.

## N17-52 — Electron rollback

Two macOS main-process reports match [Electron issue #55799](https://github.com/electron/electron/issues/55799).
Proteus 0.2.45 used Electron 44.10.2. Pin desktop builds to 44.11.5, which has the earlier
native dispatch implementation. Keep certificate verification and trust settings unchanged.
Verify the supported browser and conferencing flows on Build Mac before the Work Mac and
Linux rollout. Revisit Electron 45 when the upstream issue is resolved.

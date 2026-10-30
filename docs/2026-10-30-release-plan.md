# October 30 release plan

**Stage: October thirtieth release is open as version 0.2.39.** Started October 29, 2026.
R1–R10 remain request collection only. The October 30 command-center distribution and named-release
process request (R11) explicitly authorizes its implementation and validation. No other item is
released from its implementation hold. Publishing packages and installing on a target remain
distinct from source implementation; the operator has not selected a new device rollout here.

Standing process: [named releases](release-process.md). Current record:
[release.json](releases/2026-10-30/release.json), [implementation](releases/2026-10-30/implementation.md),
and [machine rollout](releases/2026-10-30/rollout.md).

## Request register

| ID | Type | Request | Status |
| --- | --- | --- | --- |
| R1 | Feature | Integrate Copilot Fusion using supported provider capabilities | Collected; capability discovery required |
| R2 | Feature | Catalog Emerald Canopy and add Daylight in Engine Room → Colors, with durable theme selection | Collected; current palette cataloged below |
| R3 | Improvement | Reduce notification volume and provide useful notification controls | Collected; quieter behavior proposed below |
| R4 | Bug report | False or stale “Needs you” alerts with no apparent question to answer | Reported; cause unconfirmed |
| R5 | Bug report | Duplicate notifications and repeated interruptions | Reported; cause unconfirmed |
| R6 | Bug report | Alerts appear stuck instead of dismissing after five seconds; closing one exposes a series | Reported; expiry versus queue backlog needs reproduction |
| R7 | Feature | Clear the entire Needs attention list with one button instead of opening each chat | Collected; bulk acknowledgement only |
| R8 | Bug report | Browser videos autoplay despite the enabled block-video-autoplay setting | Reported October 30; cause unconfirmed |
| R9 | Improvement | Apply Auto-approve tools and remembered approvals to Proteus actions such as proteus_chats | Collected October 30; audit invocation and owner access gates |
| R10 | Bug | Shared workspace/project tab lists, counts and content diverge between windows, including after Close | Visible divergence in two October 30 screenshots; root cause unconfirmed |
| R11 | Feature and process | Named/versioned releases, command-center updates, native first builders, current-only publication and bounded retention | Source implemented and validated; packaging/rollout not performed |

Existing October 29 implementation and rollout records retain their own status. This collection
does not reauthorize those deployments or imply that every earlier pending item is in this release.

## R1 Copilot Fusion

Expose GitHub Copilot Fusion through the existing Copilot provider integration when the selected
account and runtime support it. Verify the current official feature name, supported activation
path, availability and actual behavior before choosing controls or promising a model combination.

The checkout currently uses `@github/copilot-sdk` 1.0.16. Its bundled macOS runtime declarations
include experimental **HydraFusion** routing, resolution, completion, phase and attribution events.
They describe single, cascade and critique patterns, including read-only review phases. These
declarations establish an integration lead; they do not establish account entitlement, a supported
public activation API, or a functioning Proteus integration. No Fusion-specific handling was found
in the current `src/providers/copilot.js` adapter.

Expected acceptance when implementation is authorized:

- Discover available Fusion choices and model/options from fresh provider capabilities. Show a
  clear unavailable state for unsupported runtimes/accounts; do not hard-code model availability.
- Preserve the chat's selected configuration, provider session, instructions, tools and applicable
  permissions. Keep any provider read-only review phases read-only.
- Present actual phase/progress and final-answer events without duplicating speculative drafts,
  tool effects, answers or human-input notifications. Distinguish the selected Fusion option from
  the concrete source models where the provider reports them.
- Retain truthful usage, errors and degradation/fallback information. Cover steering, Stop,
  questions/approvals, continuation and resumed sessions without replaying uncertain actions.
- Verify one real supported Fusion session separately from synthetic event coverage. Determine
  desktop, web and iOS presentation needs after the provider contract is confirmed.

Starting points: [Copilot adapter](../src/providers/copilot.js),
[model catalog](../src/models/model-catalog.js), and
[model choices](../public/features/chats/model-choices.js). Experimental runtime declarations live
in the installed `@github/copilot-sdk-darwin-arm64` package, not in a new application contract.

## R2 Themes and persistent application settings

Name the familiar heavy green theme **Emerald Canopy**. It remains the application default.
Add **Daylight**, a conventional white/light theme with restrained green accents, as a built-in
choice in the existing **Engine Room → Colors** configurator.

Both names are planning names; the current runtime still calls its default palette “Proteus green.”
The catalog below captures the current unadjusted application palette from
[palette.js](../public/shared/ui/palette.js). Brightness and saturation both default to zero.

| Area | Current tokens and colors |
| --- | --- |
| Application | `background #19231d`; `panel #243128`; `text #edf2ec`; `muted #8e9e95`; `border #3d4b40`; `accent #c2e8a0`; `control #2e3c31`; `hover #3b4c3e`; `input #1c2921` |
| Title bar and tabs | `title #1b251d`; `tab #1b251d`; `selectedTab #29372b`; `tabText #b9c5bd`; `selectedText #ffffff` |
| Sidebar | `sidebar #1b251d`; `sidebarGroup #243025`; `sidebarButton #29372b`; `sidebarSelected #3b4833`; `sidebarText #a8b1a8`; `sidebarStrong #eaefe8`; `sidebarMuted #6e786f`; `sidebarBorder #344135` |
| Chat | `chat #243128`; `user #33412d`; `assistant #2a382d`; `composer #2e3c31`; `userEdge #acd58b`; `assistantEdge #83b6b8` |
| Menus and downloads | `menu #243128`; `menuHover #2e3c31`; `menuText #edf2ec`; `menuMuted #8e9e95`; `menuBorder #3d4b40`; `menuAccent #c2e8a0`; `progressTrack #364639` |

The base [shared theme CSS](../public/proteus-theme.css) also contains darker fallback colors and
declares `color-scheme: dark`. Audit those fallbacks and themed native surfaces when adding
Daylight so startup, menus and form controls do not retain an unintended dark appearance.

Expected behavior:

- Add named theme choices to the existing configurator, retaining preview, Save, Discard, custom
  colors, brightness/saturation controls, and palette import/export.
- Daylight uses white or near-white main surfaces, dark readable text, subtle neutral dividers,
  and green accents for selection, focus and primary actions. Check sidebar, title/tabs, chat,
  composer, menus, dialogs, downloads, notifications and error/disabled states.
- Save the selected theme and custom overrides in durable application settings through the
  existing settings service. Restarting or installing a new version must preserve that selection.
- Existing custom palettes, names and adjustments survive migration. New preset names or
  defaults must not replace saved choices. Use Emerald Canopy when no theme has been saved;
  changing back to the default is an explicit user action.
- Saving applies consistently across the application's windows. Preserve the website's existing
  browser/account-local settings boundary rather than writing a connected desktop's preference.
  Confirm native iOS palette parity and persistence scope before assigning native work.

Acceptance must include a fresh profile, an existing green profile, Daylight and a customized
palette across Save/Discard, multiple windows, restart and a simulated version/settings migration.
Check legibility and native light controls in an actual UI. The upgrade check must demonstrate
that Daylight stays selected and custom values stay intact after defaults change.

Starting points: [palette controls](../public/shared/ui/palette.js),
[Colors section](../public/features/settings/engine-room.js),
[settings persistence](../src/services/settings/settings.js), and
[earlier palette release](2026-10-20-palette-release.md).

## R3 through R6 Quieter and accurate notifications

The reported experience is excessive alerts, apparent duplicates, “Needs you” notices without
an apparent question, and notices that seem to remain beyond five seconds. Closing one can expose
more notices that also need closing. These are collected reports, not reproduced defects yet.

### R3 Reduce interruptions

Proposed baseline: interrupt for genuinely actionable questions, approvals and failures requiring
intervention; keep routine completion/reconnection activity available in Notifications without a
long sequence of transient popups. Reuse and clarify existing category preferences, with controls
for quieter delivery and grouping rather than requiring every alert to be dismissed separately.
The final defaults and control placement remain open during collection.

### R4 Make attention state truthful

An approval can legitimately require input without containing a question. Distinguish **Question**,
**Approval required**, and other actual intervention reasons in notification text and destination.
Only announce unresolved actionable state; answered, approved, expired, cancelled or superseded
requests must not continue appearing as new “Needs you” interruptions. A status update or tool
progress event alone is not a request for human input. Opening an alert should reach the actual
pending item. Expiring a popup must leave a real unanswered request accessible in the chat/attention
view and must not answer or dismiss that request on the user's behalf.

### R5 Deduplicate by the underlying event

Investigate duplicate creation through both pending-input and question events, replay/reconnect,
multiple windows, and delivery through in-app, system and remote notification surfaces. Correlate
the originating host, chat/run and request/event identity. One underlying request should produce
one intended announcement per delivery policy; two distinct questions must remain distinct even
when their titles match. Refreshing state, repeating an event or restarting must not resurrect a
dismissed/resolved alert. Expired or resolved items must not drain later from an old popup queue.

### R6 Enforce five second expiry and bound the queue

Each transient notice, including notices with action buttons, should dismiss after five seconds
without manual cleanup or a duplicate resetting its lifetime. Cover foreground, background,
minimized/unfocused windows, focus return, renderer suspension and restart. Preserve the existing
behavior that notifications do not raise Proteus over another app. Bound/coalesce bursts so a
series of new notices does not look like a single permanent overlay.

Current source already has five-second timers in both the web toast and native notice window.
The toast deduplicates by message text within ten seconds and can queue 50 notices. The attention
announcer tracks notification IDs per renderer; the activity store creates separate review notices
for changed pending input and newly pending questions. These are investigation leads, not proof
of the reported cause. Separate an individually stuck overlay from a correctly expiring but
continually replenished queue, and identify the installed version/surface during reproduction.

Acceptance should cover one real question, one real approval, a resolved request, two distinct
same-title requests, duplicate delivery, reconnect/restart, two windows, and a large notification
burst. Verify observed expiry and queue length as well as attention-card correctness. Keep private
chat content and diagnostic receipts outside the source repository.

Starting points: [activity generation](../src/services/telemetry/activity.js),
[attention announcements](../public/features/chats/attention.js),
[web toast](../public/shared/ui/toast.js),
[native notice lifetime](../desktop/features/notifications/notice-window.cjs), and the
[October 29 notification correction](2026-10-29-combined-release.md#notifications-preserve-the-foreground-app).

## R7 Clear all Needs attention

Add a prominent **Clear all** button to **Needs attention** so the user can acknowledge the whole
current list in one action when they already know what is happening. Cover chat entries and
notification entries, including the full list beyond the currently rendered page, without opening
or confirming each chat individually.

Expected behavior:

- Clear the existing attention indicators and update the list and count immediately. Treat this
  as acknowledgement of the captured items; leave chat history, running work and actual pending
  questions/approvals intact and accessible inside their chats. Clearing never supplies an answer,
  approves/denies an action, cancels a run, or archives/deletes a chat.
- Persist acknowledgement through refresh, restart and ordinary multiwindow synchronization.
  Repeated state updates, replay or reconnect must not put the same acknowledged item back on
  the list. A genuinely new question, approval, failure or attention event can appear again.
- Remove cleared items from pending popup delivery so clearing the list does not leave an old
  backlog of alerts to close. Keep the underlying event history under normal retention.
- Apply acknowledgement to stable item/request identities from the clear operation's snapshot;
  new events arriving during the action remain visible. Use the existing host-owned attention
  service and ordinary resource access rather than treating a list clear as authority to change
  another chat's pending work.
- Include all reachable listed computers within the action's supported scope. Report any offline,
  denied or failed items and remaining counts accurately; do not claim an unreachable owner was
  cleared. Repeating the clear must not duplicate effects or lose newer attention events.

Acceptance should cover a mixed list of failed/interrupted chats, waiting questions/approvals and
unread notifications; multiple pages; an already empty list; two windows; restart/reconnect; an
unreachable computer; and a new event arriving during the clear. Verify that acknowledged items
stay cleared, new items still appear, and actual questions/approvals remain pending in the chat.

Starting points: [Needs attention view](../public/features/chats/attention.js),
[chat attention index](../public/features/chats/chats-index.js), and the existing chat-attention
review and notification-read service operations. Current failure-review tracking is an
investigation lead; verify support for acknowledging other attention kinds before choosing the
bulk operation contract.

## R8 Respect the block video autoplay setting

**Reported October 30:** The browser does not respect the enabled “don’t auto play video” option.
The existing page-menu control is **Block video autoplay in all tabs**. Treat this as a defect
in the current feature, with the exact site, platform and failing sequence to be established
when reproducing it.

Expected behavior and acceptance:

- With blocking enabled, prevent unsolicited video playback, including muted/declarative autoplay,
  script-triggered playback, dynamically inserted players and embedded frames. Preserve deliberate
  manual Play. An unrelated click or keypress elsewhere on a page must not broadly enable autoplay.
- Apply the existing device-wide preference consistently to current, new and restored tabs across
  windows/profiles, including background tabs, reload, redirects and single-page navigation.
  Verify live toggles without reloading forms and persistence across restart and application updates.
- Reproduce both initial-page playback and playback after unrelated page interaction. Cover same-
  and cross-origin frames, delayed players, enabling/disabling the setting and intentional Play.
  Distinguish a wrong saved/menu state from failure to enforce the correctly enabled preference.

Current source persists the preference in `browser-media.json`, supplies it at page creation and
broadcasts live changes to page frames. The video preload permits playback once
`navigator.userActivation.hasBeenActive` is true. Whether an unrelated earlier interaction explains
the report is an investigation lead, not a confirmed diagnosis. Verify injection timing/frame
coverage and the actual installed behavior before choosing a correction.

Starting points: [media preference](../desktop/browser/browser-media.cjs),
[video preload](../desktop/browser/browser-video-preload.cjs),
[browser lifecycle and frame updates](../desktop/browser/browser.cjs),
[page-menu control](../public/features/browser/browser-extensions-toolbar.js), and
[documented autoplay behavior](browser.md). Existing disposable-media acceptance does not establish
that the reported real website sequence works.

## R9 Apply approval settings to Proteus actions

**Requested October 30:** **Auto-approve tools** and **remembered approvals** must apply to
Proteus actions, including `proteus_chats`, so already authorized work does not repeatedly stop
for the same permission. Audit applicable `proteus_*` operations through both the provider's
tool invocation and the host-owned action/access checks.

Expected behavior and acceptance:

- Honor the originating chat's effective Auto-approve tools setting for eligible Proteus actions
  and their owner-side access requests. Apply chat, workspace or schedule settings at their
  configured scope; do not silently replace a chat-only choice with a broader preference.
- Offer remembered approval for supported Proteus operations/access requests. Save and match the
  intended action and resource scope, including destination computer, project/chat scope and
  read/dispatch/answer/cancel capabilities where applicable. A matching saved approval should
  work in Saved rules mode without another identical prompt.
- Preserve remembered rules across subsequent turns, resume and application restart within the
  selected lifetime/scope. Show what was remembered and allow revocation. Re-evaluate changed
  settings, revoked grants and materially broader requests rather than treating a generic tool
  name match as permission for every action or destination.
- Keep Ask behavior and actual mandatory OS/provider or explicit resource-sharing decisions
  distinct from ordinary configurable tool approval. An originating chat's approved dispatch
  does not approve tools requested by the destination agent.
- Use the same owner policy for equivalent internal/MCP entry points. Make denial reasons identify
  the real gate instead of asking again for a scope already covered by the effective settings.

Current source already has an Auto-approve path for `proteus_chats` access requests. Its distinct
`chat-access` decision currently checks Auto-approve mode before ordinary saved-rule matching;
the tool description says Saved rules still needs a human response. Treat this as a concrete
starting point for scope-aware remembered approval and a regression check of Auto-approve,
not proof of what the user's installed version did.

Acceptance should exercise Auto-approve on/off, a matching remembered rule in Saved rules mode,
an unmatched or broader request, fresh turns, restart, revocation and an effective-mode change.
Verify `proteus_chats` request-access and the subsequent permitted read/dispatch/answer/cancel
actions, plus representative other Proteus actions, without duplicate prompts or expanded scope.

Starting points: [shared permission decisions](../src/services/settings/permissions.js),
[chat access requests](../src/services/chats/chat-control.js),
[chat tool declarations](../src/services/chats/chat-control-tools.js), and the
[October 29 Auto-approve work](2026-10-29-combined-release.md). Reconcile existing behavior before
adding another approval mechanism.

## R10 Keep shared tab information consistent across all windows

**Observed October 30:** Two windows showing the same workspace/project display different tab
sets. Closing a news browser tab in one leaves it present in the other. The follow-up screenshot
shows project counts of **19 versus 20**, with the extra news tab visible in the lower window's
tab strip, sidebar and Tabs table. This is a visible synchronization defect. The user requires
the same shared information regardless of which window is active or being used.

Both screenshots are retained in this chat as evidence. A visible application label reads
v0.2.38; the exact installed build and owner mutation/event sequence remain to be verified.
Keep raw screenshots and private workspace, host, URL and tab details outside Git. Establish
stable host/container/logical-tab identities and trace the first divergence during reproduction.

Expected behavior and acceptance:

- Maintain one canonical content-tab set per owning host and workspace/project. Every window
  showing that container must agree on membership, order, titles, URL/history, hide/persist state
  and other shared metadata. The tab strip, sidebar, project/workspace Tabs table and counts must
  all reflect that same state.
- Propagate opens, closes, moves, reorders, hide/restore and shared metadata changes automatically,
  regardless of the originating or focused window. Include inactive roots, another selected
  child and focused inputs. Convergence must not require clicking, refreshing or reopening each
  window. Hidden/unloaded tab metadata must synchronize without loading the websites.
- Closing a logical content tab in any window removes it from all observing windows and their
  list/count projections. Apply owner Close despite delayed metadata, stale window snapshots,
  queued synchronization, focus changes, reconnect or restart. A stale mirror must not retain or
  recreate the tab. Preserve revision conflict handling and expose failed actions accurately.
- Match owning host, container and logical tab identity. Distinct tabs with identical names or
  URLs remain distinct. Preserve each window's local selection, focus, draft and reading position;
  choose a valid local fallback when its selected tab closes.
- Retain existing resource lifetime rules: closing a top-level workspace/project navigation
  representation affects that window, and closing a chat content tab does not archive, delete
  or cancel its conversation.

Reproduce the screenshot sequence in both directions with two windows, then three. Compare
actual canonical identities and ordered descriptors with every UI projection after each mutation,
rather than accepting equal counts alone. Exercise active/inactive containers, repeated focus
switching, persisted/unloaded tabs, concurrent edits, delayed/out-of-order updates, restart and
paired views where supported. Demonstrate that the information stays consistent while work
alternates between windows, with local drafts/selection/scroll preserved.

Related shared-window source work is recorded in [window management](window-management.md),
[workspace behavior](workspaces.md), and [browser synchronization](browser.md). Diagnose the
cause of the observed divergence in the installed version; earlier fixture acceptance alone
does not resolve this report. This remains a collection-only bug in the future plan; the
previously closed release cycle is not reopened.

## R11 Named releases and command center distribution

The operator authorizes assessing and implementing gaps in Mac/Linux/Windows distribution:
publish exact signed packages on downloads.proteus.example, start a new local update coordinator on each intended
destination from this Mac, and observe its download, tests, migration, installation and recovery.

Codify one human release name and version while open; repository plan, implementation and
per-machine rollout records; first native builders synchronizing pinned repository source;
subsequent consumers downloading packages without compilation; and closeout that merges PRs/
branches, synchronizes/pushes main and retires related worktrees. Keep only the current public
release generation, at most two local application/site recovery generations, one website backup
on the server, and shared iOS simulators across projects. See [release process](release-process.md)
and the [implementation ledger](releases/2026-10-30/implementation.md) for concrete behavior.

## Collection and later implementation

Continue adding requests here with stable IDs. Keep observations, hypotheses and verified results
distinct. Confirm the Fusion contract and reproduce notification sequences before settling an
implementation. No runtime settings, provider packages or application behavior change during
collection for R1–R10. R11 follows its explicit implementation authorization. Record the final
scope, version, required platform
coverage and appropriate validation before any separately authorized rollout.

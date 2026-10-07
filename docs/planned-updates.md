# Implementation status and backlog

> **Acceptance reopened — October 6 evening:** The operator rejected the delivered UI.
> Read [the complete acceptance audit](2026-10-07-acceptance-audit.md) before relying on
> the historical completion claims below. It reviews all 22 + 28 build items and current reports;
> working-tree corrections are not installed release acceptance.

Maintain this as the single backlog. Design rationale is in `decisions.md`; recent changes are in
`../CHANGELOG.md`. Items below are status, not promises of completed validation. The October 5 design bullets are
retained as acceptance criteria; the installed versus unverified state is summarized immediately
below and in `content-workspace-release.md`.

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

Status: requested design review and layout fix; no implementation or UI verification yet.

### BF-2026-10-07-03 — Restore clear versioned Claude model labels across chats and schedules

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

Status: queued investigation and fix; not built during intake.

### BF-2026-10-07-04 — Widen and simplify the new chat dialog

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
Implementation remains queued for a future build; design approval does not request building,
installing, or deploying the app during this planning PR.

### BF-2026-10-07-05 — Make tool approval duration and scope explicit

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

Status: queued wording and presentation improvement; no permission setting or app code changed.

### BF-2026-10-07-06 — Show live command, activity, group, and chat runtime

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

Status: queued feature request. No timer implementation or runtime instrumentation added during
intake. Private workflow names, report contents, and paths from the screenshot are omitted.

### BF-2026-10-07-07 — Preserve original user questions in chat history

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

Status: queued investigation and history fix; no app behavior changed during intake.

### BF-2026-10-07-08 — Keep chat-related browser tabs in their chat navigation

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

Status: queued routing/organization change; no implementation during intake.

### BF-2026-10-07-09 — Add a clicked-link browser preference in Engine Room

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

Status: queued preferences feature; no device or app preference changed during intake.

### BF-2026-10-07-10 — Improve pinch-to-tab-overview and extend tab coverage

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

Status: queued interaction improvement and feasibility review; no gesture changes implemented.

### BF-2026-10-07-11 — Reorder standup links and open them in saved list order

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

Status: queued standup-link ordering feature; no links reordered or app behavior changed.

### BF-2026-10-07-12 — Add tabs to the left or right through the tab-type menu

Add **Add tab to left** and **Add tab to right** to the tab menu. Selecting either action opens
the existing new-tab type menu; only after the user chooses a supported type should the new tab
be created at the requested position. Offer types valid for that navigation container.

Acceptance: retain the clicked tab as the insertion anchor even if active selection changes
while the menu is open. Cancel creates nothing. Handle first/last tabs, overflow, keyboard use,
and an anchor closed before selection without inserting into an unrelated container. Persist
the resulting order and preserve existing type-specific creation and authorization behavior.

Status: queued tab-menu feature.

### BF-2026-10-07-13 — Move or copy tabs to chats, projects, and Team Tools

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

Status: queued tab organization feature and per-type behavior design.

### BF-2026-10-07-14 — Audit and fix tab movement behavior

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

Status: queued bug investigation and fix.

### BF-2026-10-07-15 — Keep navigation spacing stable when opening terminal tabs

The operator reports that creating a terminal tab disrupts navigation-bar spacing. The supplied
screenshot shows a terminal within chat content navigation; private titles, paths, and shell
details are excluded. Compare before/after terminal creation and switching to identify the exact
layout regression rather than assuming a specific CSS cause.

Acceptance: browser, chat, and terminal tabs share consistent bar height, padding, icon/label
alignment, active indicator, and close-control placement. Terminal content must not stretch,
shift, or otherwise restyle its parent navigation. Verify creation, activation, resize, closing,
long titles, many tabs/overflow, collapsed sidebar, and switching among tab types at normal and
increased zoom. Preserve terminal sizing and input focus while fixing navigation geometry.

Status: queued terminal-tab layout fix.

### BF-2026-10-07-16 — Integrate agent terminal work with chat terminal tabs

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

Status: queued terminal integration investigation and defaults design.

### BF-2026-10-07-17 — Expose multiple Azure, Jira, and Azure DevOps auth profiles

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

Status: queued authentication/profile investigation and interface feature. No authentication
state, account selection, credentials, or access grants changed during intake.


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

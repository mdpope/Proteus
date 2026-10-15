# Chat presentation, queue and steering

October 13 BF-2026-10-13-20 in [planned updates](planned-updates.md) investigates a missing
substantive response before Copilot asks for feedback, with the explanation later embedded in a
reposted question. The authorized read-only owner audit found native events, JSON and API agree:
the first explanation was not emitted as an assistant reply; the later explanation is preserved
inside the feedback question. Queue readable answered-question context instead of collapsed
Activity, with agent guidance to explain before dependent follow-ups. Actual historical UI
verification remains pending. Copilot with a Claude model is still the Copilot adapter. No
feedback, active work or drafts changed; no build/fix yet.

Operator follow-up explicitly reports answered Copilot/Claude questions missing from visible
history while user replies remain. Reopen BF-2026-10-07-07's presentation acceptance: preserve
the full agent question, explanation and choices next to the associated answer in chronological
history, including after paging/reconnect/restart. Saving the question in a system event does not
satisfy that interface requirement. Long details may use a labeled expander; generic Activity
must not be the sole route to the question. This correction is queued under BF-20.

October 13 queued fix: BF-2026-10-13-10 in [planned updates](planned-updates.md) records the
global Needs attention badge switching between combined chat/non-chat totals and chat-only totals
after index refreshes. Use one combined calculation across view changes; keep list subtotals and
filters separate. Code finding only; no implementation/build authorized.

October 12 new intake: BF-2026-10-12-02 in [planned updates](planned-updates.md) queues the local
desktop **Working... you can queue a message or steer this turn.** spinner/message for remote
desktop chats, using owner-host turn state and existing action availability. The remote omission
is operator-reported; cause/state availability remain unverified. Collection only under the new
release's build hold; no runtime implementation.

October 10 planning only: BF-2026-10-10-06 in [planned updates](planned-updates.md) records
the website composer floating above a large unused bottom gap in an operator screenshot.
Dock the message box and controls to the available chat panel bottom while preserving upward
editor growth, transcript scrolling and the existing size cap. Cause and other-client coverage
remain unconfirmed; implementation/build/install/deployment await explicit authorization.

BF-2026-10-10-07 also queues making the Internet Search dialog 30% wider and 40% taller,
allocating the added usable space to its message box while retaining existing control/font sizes
and fitting smaller viewports. This sizing request is planning only under the same hold.

BF-2026-10-10-11 queues desktop history jitter while typing. Composer input sizing and transcript
resize/scroll restoration are investigation leads; preserve steady bottom following and older-message
reading position during draft edits. No cause confirmed or runtime change authorized under the hold.

## Full queued composer release — 0.2.11

Desktop, visiting desktop and website composers share `chat-composer.js`, `chat-design.css`
and the Run details renderer. Wide controls show captions above choices; narrow composers use
one options submenu. Send/Queue/Steer/Stop are accessible circular icons. Attach remains the
plain +, with a centered hover area. Existing submission and attachment handlers are retained.

Editors grow and shrink with content, capped with their controls at 60% of available chat space.
Native drafts stay isolated from transcript observation and reuse unchanged visible-event indices.
PhotosUI presents independently after the attachment menu dismisses, including after cancellation.
Run details share hierarchy: prominent runtime, smaller input/output counts, collapsed Explanation,
visible/copyable paths, and disabled remote local-file Open. Provider options still come from
refreshed metadata. See [release verification and installation](2026-10-10-full-chat-release.md).

Mac and iOS retain a complete assistant answer in Markdown. Tool calls are compact status rows;
expand one to inspect affected paths, commands, progress, readable fields or bounded result tables.
Raw arguments/output remain in a secondary disclosure. Large displays are shortened; the provider
session holds the original payload. Provider media that cannot be displayed has an explicit note.
No client executes tool-result HTML. Both clients use the host's shared presentation shape.

The composer remains available during execution. Its bottom bar contains quiet model/effort/speed
and applicable context-size menus, plus separate Send or Queue, Steer and Stop buttons. Stop
appears only during a running turn (including a turn waiting for input). **Queue next** saves a message immediately and
starts it as a separate turn after the current turn completes. Multiple queued messages execute in
order. Remove a queued message before delivery; its transcript entry remains labeled as removed.
A failed, interrupted or cancelled turn holds the remaining queue until the user continues. Restart
never silently replays active work. Repeated message IDs cannot submit the same message twice.

**Steer now** delivers an update to the active Copilot or Codex turn, without creating a second
concurrent turn. Copilot uses immediate session input; Codex uses `turn/steer` with the expected
active turn ID. If the provider is starting, waiting for input, or the turn ended, steering fails
visibly; queue the message or answer the pending request instead. Delivery failures remain labeled
in the transcript. A successful submission confirms delivery, not that the model acted on it.
Rehearsal supports the queue but does not implement model steering.

Mac drafts/caret and expanded tool rows survive live updates. At the bottom the conversation follows
new output; scrolling up preserves the reading position. The chat and details use the available
viewport with separate scrolling, and narrow windows switch between Chat and Details.

Native existing-chat typing updates only the composer child. The parent retains a scoped draft
controller without subscribing to text edits, so keystrokes do not invalidate loaded conversation
history. Draft values reach the in-memory store immediately; reply and pending-question drafts
remain separate for each Mac/chat. Attachment metadata and external draft actions still notify
their controls. Automatic encrypted-cache work runs away from the UI thread, with ordered
lifecycle flushes preserving the latest draft. BF-2026-10-09-38 records validation/install status.
Bundled Markdown rows share an ephemeral renderer store with separate message bridges, limiting
process overhead in long chats. Inactive Find does not publish zero counts for each message.
Single-Return detection avoids a collection-difference calculation on each keyboard edit.

Browser controls use a compact address bar with Enter navigation, back/forward/reload, site-name
tabs and a pressed **Agent access** toggle. Its tooltip explains private versus shared access.
Agent-owned tabs show that state; an unrelated chat cannot access a private tab.

Model choices apply to the next submitted message in the same provider session. Each queued message
captures its own model, effort, speed and context tier; subsequent edits do not rewrite that queue
entry or the active turn. Steering uses the active turn's settings. Only provider-advertised choices
are accepted, and controls without choices stay hidden in the compact composer. Refresh is available
in the Mac footer and iOS model menu; normal catalog refresh continues at the host.

Changing models preserves the provider session ID, prior messages and selected workspace context.
A smaller context window may require provider compaction or fail if the provider cannot fit it.
The run retains its initial schedule and a model-change history; the source schedule is unaffected.
Submitted choices are shared with other clients and retained on reopening; unsent dropdown changes
are local drafts. Provider switching within an existing chat remains unsupported.

Streaming updates change conversation content and usage in place. They do not detach the composer,
model/permission menus, navigation or detail panels. Changes to pending requests and other control
structure wait until an actively edited field loses focus; the conversation continues streaming.
Expanded detail disclosures survive these less-frequent structural refreshes.

## Approved adaptive layout — October 9 (application integration queued)

Use one bottom control row across native, desktop local/remote and website chats. Keep Attach
as a plain + in its existing left position and use the local desktop's text-box colors across
local desktop, desktop remote and web. Native retains its established palette. With room,
place Model, Level and Speed labels above the selections; retain supported Context and refresh
controls. Collapse model options into one submenu when chat width is constrained. Steer,
Send/Queue and Stop are separate circular icon buttons. The desktop/web HTML model uses
34-pixel pointer buttons and 44-pixel coarse-pointer targets; Send is an up arrow on existing
green, Queue adds a clock badge. Names/tooltips and existing run-state semantics stay intact.
See [the full interactive composer model](design/2026-10-09/desktop-web-composer.html) and
BF-2026-10-09-26–31. These are selected designs with browser rehearsal, not installed behavior.

The review sidebar uses the website's exact Home, Workspaces and Internet Searches SVGs;
BF-2026-10-09-37 queues matching desktop navigation artwork.

The review model now centers + hover on the glyph and enlarges selector hover/focus areas
without moving the +. Instructional prose lives in collapsed Explanation expanders. Run details
starts with larger total runtime, then smaller input/output token counts, including multiline
layout as needed. Local desktop's section order and content apply in all three views. Source,
workspace and session paths remain visible and copyable. Only local-file Open is disabled in
remote/web views; shared in-app document access remains a distinct supported operation.

The message editor grows upward on newlines and wrapped lines, shrinking on deletion. Once the
composer reaches 60% of available chat area it scrolls internally, retaining conversation space
and anchored bottom actions. Verify draft/caret, IME, Enter/Shift+Enter, attachments, resizing,
pending-input visibility and reading-position retention during application integration.

## Approved next increment — October 5 (queued only)

The normal local composer is the reference for remote desktop chats: the same model/effort/
speed/context-size controls from the owning Mac's advertised provider catalog, with identical
Send/Queue/Steer/Stop semantics and preserved drafts. A model context-size setting does not grant
permission to change the chat's loaded workspace/context sources. Provider and destination remain
fixed for an existing session.

Remote details should expose available usage, model history, session-file metadata and captured/
loaded context read-only. Desktop/web use the normal sidebar/adaptive layout; mobile retains its
expandable Chat details and Loaded context and condensed styling. Do not add native remote file Open or
Copy path actions or context-source editing for this increment. The separately queued generated-
document link feature adds authorized read-only in-app viewing, not native filesystem opening. Automatically prepend older remote
history as the reader approaches the top, preserving the viewport, stable event identity, grouping,
expanded details and playback. Failures offer a retry without restarting or replaying the chat.

Paste adds an attachment strip above the composer: image previews and non-image filename tags,
per-item removal, and a modal image viewer with backdrop/X/Escape dismissal. Draft attachments
must remain bound to the account, host and chat, and send only through an explicit supported
submission. Provider capability validation, bounded encrypted delivery to a remote host, safe
previewing and cleanup/retry behavior are requirements, not completed implementations.
See `planned-updates.md` for acceptance coverage.

## October 7 follow-up queue

BF-2026-10-07-24 in [planned updates](planned-updates.md) queues the remote-chat footer
message repeatedly appearing/disappearing and pushing the composer upward, reported on the HC
Mac. Exact message and cause await observation; stable layout across refresh cycles is required.

BF-2026-10-07-18 in [planned updates](planned-updates.md) requests sent/cancelled-message
reuse as an editable draft followed by explicit resubmission. BF-20/21 reopen the new-chat visual
acceptance: compact bottom controls beside Attach/Start chat, minimal routine explanation, and
attachment previews above that bar matching the full-chat composer. These corrections are queued;
the source behavior below is not evidence of accepted visual parity.

## October 7 desktop new chat

The wide dialog groups Run on/Workspace, uses a starting-folder dropdown and expandable folders,
and keeps provider/model controls beside the unboxed attachment picker. Provider starts empty;
its fresh metadata controls the available model/effort/context/speed. Local folder additions are
chat-specific. Remote starts can select an existing configured workspace folder; adding entirely
new remote roots still requires configuration on that Mac. Draft text/title and the attachment
selection survive destination/provider switches, with final destination/provider consent still
required for attachment delivery. Context selections reset when the destination changes.

## October 7 follow-up implementation

Desktop user messages offer Edit and resend, restoring a draft without rewriting history or
sending automatically. Replacing a nonempty different draft or selected files requires confirmation.
Recent same-session attachments can be restored; unavailable files receive explicit feedback.
Attachment consent and provider validation run again on send. Sent-preview retention is bounded.

The new-chat toolbar groups Attach, compact model controls and Start chat, with selected files
above the toolbar. Remote chat refresh keeps structurally unchanged controls mounted; disconnect
feedback sits outside the two-column grid. Completed host history and detached conversation views
use bounded caches; earlier events load on demand and durable history remains intact. Desktop
state polling requests summaries, and selected history uses transient cursors and absolute-index
patches. Legacy remote clients keep compatible page responses and events. See the
[follow-up ledger](2026-10-07-followup-release.md) for validation/install status.

## Search chats and keyboard delivery (0.2.6)

Chats has User Chats, Scheduled Tasks and Internet Searches tabs with the same filters. Sidebar
recents show up to seven user chats or searches. Internet Searches starts a normal provider
conversation using the selected workspace and that execution Mac's configured provider defaults.
Engine Room configures model, reasoning effort and speed using refreshed provider metadata.
Promotion beside Archive permanently moves a search into User Chats; it does not fork its session.
Model changes remain available after creation.

Enter sends; Shift+Enter inserts a newline. The native software keyboard's Send key submits the
message; pasted multiline text remains a draft. During active execution the default send queues.
A queued text entry's Steer now action uses the active turn's settings and retains the queue entry
if the provider rejects delivery. Queued attachments cannot be converted to steering.

Approval messages include short intent plus original request details when recorded. Request
payloads are redacted and bounded. File-search patterns remain visible without opening Details.
Closing a chat's main tab unloads its child browser views but retains their URLs and order; reopening
the chat restores unloaded tabs rather than creating duplicate destinations.

Chat child navigation is a fixed-height workspace row above the content panel. Conversation, shell, browser and local/remote document views share the same full-width strip; their padding and scroll positions do not affect its borders or close controls.

## October 10 long-history and usage follow-up

Start at the newest messages; no history is discarded. Native initially mounts twelve meaningful rows within 48 KiB and desktop/web twenty-four within 128 KiB, bounded to 100 events per reveal. A collapsed activity streak counts as one row and is rendered as a summary until opened. One oversized message stays complete. Fetch one older page into cache before reaching the top (two viewport heights and low cache headroom); reveal closer to the boundary, retaining the visible message and inset. User gestures at a stationary top also advance history. Retry remains for failed transport, with no normal Load more button. Native includes the composer safe-area inset when following/returning to the bottom and releases distant Markdown views while retaining measured height.

Shared desktop/web details stack Total AI runtime, Input tokens and Output tokens vertically. Each label sits above a centered value in a dark bordered box; runtime is larger. Native expanded Chat details uses the same hierarchy. Provider-unavailable usage remains an em dash and runtime retains partial/offline status.

Mobile reading now prepares twenty-four older meaningful rows / 96 KiB per later batch, starting within 2.5 viewport heights of the boundary. Transport prefetch begins within six viewport heights with fewer than 72 cached events ahead, and rich Markdown warms within 1.5 viewport heights. Initial presentation remains twelve rows / 48 KiB. Upward pan momentum can authorize the next preparation instead of requiring a second gesture. Desktop/web paging thresholds remain unchanged.


### Internet Search dialog fill correction — October 13

The desktop search input removes the regular composer’s 140px maximum height and fills the available dialog body. The workspace selector, provider buttons and Cancel retain their existing styling and remain outside the scrolling text. Empty status text reserves no space. Disposable Electron UI checks pass at 1440×960, 850×650 and 1100×520, including long-text scrolling, visible actions, no horizontal overflow and Cancel. Signed build `68095bceb17e` passes the same checks and is installed on the primary computer. HC transfer is pending destination acceptance; installation is tracked in the unified release ledger.

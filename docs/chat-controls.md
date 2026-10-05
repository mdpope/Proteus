# Chat presentation, queue and steering

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

## Approved next increment — October 5 (queued only)

The normal local composer is the reference for remote desktop chats: the same model/effort/
speed/context-size controls from the owning Mac's advertised provider catalog, with identical
Send/Queue/Steer/Stop semantics and preserved drafts. A model context-size setting does not grant
permission to change the chat's loaded workspace/context sources. Provider and destination remain
fixed for an existing session.

Remote details should expose available usage, model history, session-file metadata and captured/
loaded context read-only. Desktop/web use the normal sidebar/adaptive layout; mobile retains its
expandable Chat details and Loaded context and condensed styling. Do not add remote file Open or
Copy path actions or context-source editing for this increment. Automatically prepend older remote
history as the reader approaches the top, preserving the viewport, stable event identity, grouping,
expanded details and playback. Failures offer a retry without restarting or replaying the chat.

Paste adds an attachment strip above the composer: image previews and non-image filename tags,
per-item removal, and a modal image viewer with backdrop/X/Escape dismissal. Draft attachments
must remain bound to the account, host and chat, and send only through an explicit supported
submission. Provider capability validation, bounded encrypted delivery to a remote host, safe
previewing and cleanup/retry behavior are requirements, not completed implementations.
See `planned-updates.md` for acceptance coverage.

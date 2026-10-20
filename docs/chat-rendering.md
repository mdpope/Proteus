**October 14 question history:**

Questions are first-class chronological messages outside collapsed Activity, with complete
recorded context/choices and a linked reply. Required core guidance tells agents to explain before
asking a dependent follow-up. The owner audit found the first reported explanation never existed
as a finalized assistant reply; the interface does not fabricate missing provider output.

See [release status](2026-10-13-tab-management-release.md).

# Rich chat rendering

**Queued October 19 — BF-2026-10-19-09:** Give chat tabs cached conversation thumbnails in tab
overview, alongside browser thumbnails. Capture the actual viewed conversation viewport soon
after interaction and periodically while viewed; throttle scrolling/streaming updates. Retain
the last good owner-scoped image after switching away and across restart. Overview uses cached
images immediately, with the chat icon as fallback, without reopening a chat or changing its
scroll, focus, selection, drafts, approvals or active turn. Keep images in bounded local app-data
storage, validate stable chat/source identity and reject stale capture results. Hidden tabs stay
excluded under BF-08. This is queued scope only; cache implementation and UI/performance
acceptance remain pending under the build hold. See [planned updates](planned-updates.md).

**Queued October 15 — BF-2026-10-15-04:** Recognize paths/URLs in agent response prose,
inline code and explicit links, keeping the full destination visibly present and copyable.
On click, folders open Finder on the owning Mac, Markdown files open the in-app editor tab,
websites open Proteus browser tabs, and other supported resources use their available viewer.
Preserve chat placement/state and current file/document/browser authorization. Resolve relative
paths from the chat's working directory; do not treat remote paths as local. This request does
not require transforming every Activity/tool block or opening anything automatically. See
[next release list](planned-updates.md). Planning only; no implementation or build is authorized.

**October 12 proposed change — queued only:** BF-2026-10-12-01 requests desktop's contained
tool/approval entries, associated original-request disclosures, tool-call references and per-tool
completion timestamps/durations on native iPad/iPhone. Desktop should adopt native's single
contiguous Activity group for tools, approvals and system messages between user/model messages,
retaining distinct darker system boxes inside that group. Timing availability is not yet verified.
Preserve the existing platform-specific design, particularly iPhone's different native layout;
this request covers message details/relationships, not a full visual redesign or identical styling.
This new release batch is collection/design only under an explicit build hold; it does not change
the implemented behavior described below. See [intake](planned-updates.md#bf-2026-10-12-01--shared-activity-approval-and-system-message-presentation).

Chat text remains Markdown in the existing run JSON and encrypted mobile protocol. The Mac and
native iPhone/iPad apps use the same bundled renderer: markdown-it for Markdown and highlight.js
for code. No CDN is required. Markdown file tabs use the same preview, with source available below.

Supported formatting includes headings, paragraphs, emphasis, strikethrough, nested lists, read-only
task lists, quotes, links, rules, aligned tables, fenced code with copy buttons, and raster images.
Wide tables and code blocks scroll horizontally. An unfinished streaming block is re-rendered as
text arrives. Unknown code languages remain readable as plain code.

On the Mac, opening a chat starts at the latest message. While near the bottom (40px), new messages,
streamed text, and delayed image layout keep the view at the bottom. Scrolling up preserves the
reading position; Jump to latest resumes following. Each open chat keeps its own reading position.
Completed and streamed messages occupy the same scroll area. The conversation and details fill the
remaining window height and scroll independently. Narrow windows switch between Chat and Details
without adding an outer page scrollbar. Selecting text temporarily defers background re-rendering
so the selection can be copied.

Tools appear as compact, expandable activities with their name, arguments, progress, output,
duration, and failure details. One activity is updated throughout each call. Automatic approval
reasons appear inside tool details, with a count in chat details; the audit events remain in the run
record. Provider warnings, compaction, and interrupted partial output are visible. Empty assistant
messages are omitted and the final response remains complete Markdown. Long tool displays are
bounded and marked as shortened; provider session files retain the original output.

Raw HTML is displayed as text. Scripts, iframes, dangerous URL schemes, and arbitrary HTML attributes
are never interpreted. External image URLs have a Load image button; loading them sends the request
to that website without a referrer. Workspace images load automatically through authenticated host
requests. Images must be referenced in that run's Markdown, be inside its captured workspace roots
(after resolving symlinks), be a recognized PNG/JPEG/GIF/WebP, and be at most 4MB. Mobile image bytes
travel through the encrypted relay, not a public filesystem endpoint. Paths relative to a chat
resolve against its working directory; paths in a Markdown file resolve against the file's folder.
Images outside authorized roots show an unavailable placeholder.

Web links open in Mac browser tabs or the mobile system browser. Markdown file links open Mac
preview tabs; other workspace files use the existing authorized path handler. Mobile Mac-file links
copy the path for use on the Mac. This increment does not implement executable HTML, Mermaid,
LaTeX, or provider-specific interactive widgets.

Assistant message labels use the main agent selected in the captured chat context, including
streaming output. New responses retain the agent name when saved, so later agent changes do not
rename earlier messages. Older messages fall back to the captured selection. Without an explicit
main agent, the label identifies the provider (Copilot or Rehearsal).

## Website parity gap: October 5 review

The earlier rendering description is the desktop/native baseline, not full website acceptance.
`public/conversation.js` removes automatic permission notices from the main timeline and renders
structured tool details; `web/resources/js/remote.js` currently maps all persisted events into
message articles and prints their generic role. This explains website “assistant” labels and
standalone “Auto-approved write: Trusted folder” messages even though the remote payload already
includes provider/agent identity and tool presentation data. Desktop resolves the saved agent
identity or provider; website does not yet use that resolution.

An automatic approval means Proteus accepted a tool request under a saved permission rule, not
that the write succeeded. The standalone audit event stores kind, reason and mode, but not the
resolved path, matched root or tool-call ID. If the corresponding tool already exists, its details
can carry the approval reason and reported arguments/target; the generic line alone cannot name
which folder was written. This limitation must remain explicit for older records.

The operator approved the Activity-group mockup on October 5. Desktop is the web visual
reference; all clients share provider labels, grouped routine tools/approvals, actionable warnings
and expandable usage/context information. Mobile retains condensed native formatting and solid
message boxes rather than adopting desktop styling. Path/rule correlation still needs an explicit
shared contract, and illustrative mockup paths/metrics are not real account observations.

Image thumbnails and filename tags now sit in a bounded row above compact composer controls,
with removable draft attachments and a modal image preview dismissed by backdrop, X or Escape.
A subtle + Attach control sits beside provider choices and Send. Provider-specific file support
remains capability-driven. Source supports at most 256 files, 8 MiB each and 32 MiB total per
message, with exact destination/provider consent; final installed acceptance for this expanded
batch is tracked in `content-workspace-release.md`.

## Chat timestamps

Native iPhone/iPad messages use the device’s SwiftUI time-zone environment, including changes
while the view is open and daylight saving transitions. A shared account preference defaulting
to UTC must not override the device’s chat display zone. Stored timestamps remain UTC instants;
schedule execution zones and Engine Room’s account-zone displays are unchanged.

## Message actions and local speech

Completed, nonempty assistant messages have **Copy message** and **Read aloud** icon buttons.
Copy retains the original Markdown; speech reads the message content without Markdown formatting
or embedded UI labels. Tool activities, reasoning and partial streaming messages do not start
speech. Playback always requires an explicit user action on the viewing device.

The active message exposes **Pause/Resume**, **Stop** and a **Reading position** scrubber. Position
is a percentage of message text, not an audio duration. Moving it restarts speech at a nearby word
boundary. Speech boundary callbacks advance the position; browsers without word callbacks update
at bounded text-chunk transitions. No timer invents progress. Only one message plays at a time;
normal refreshes preserve playback, while leaving/changing the chat or losing its authorized
context stops it.

Desktop and website share the same controller using Web Speech synthesis. Only voices reported
as local are selected; no local voice produces a visible unavailable state, with no cloud fallback.
Native iPhone/iPad use Apple's retained AVSpeechSynthesizer. Voice availability and quality depend
on the device. This feature consumes no AI provider allowance and requires no microphone access.

References: [browser local-service distinction](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService)
and [Apple on-device speech synthesis](https://developer.apple.com/documentation/avfoundation/speech-synthesis).
Implementation and device/deployment evidence are recorded separately in the release validation.

## Development

- Edit `src/markdown-renderer.js` and `public/markdown/style.css`, then run `npm run markdown:build`.
  Commit the bundled runtime and third-party notices so Xcode can build without Node installed.
- `npm run ios:generate` refreshes the checked-in Xcode project. Its folder resource shares the
  actual renderer assets with the desktop app. Signing team IDs stay outside the repository.
- `npm test` checks Markdown escaping, image boundaries, and encrypted image transport.
- `node test/chat-ui.mjs` checks streaming, reader position, Jump to latest, tables, code copying,
  image rendering and HTML escaping in Electron against disposable synthetic data.
- `ProteusTests/MarkdownTests` runs the bundled renderer in real WKWebView on iPhone/iPad simulators.
  The full native test suite also needs `node test/mobile-host.mjs` (see remote.md).

## Accepted October 6 Activity presentation

User and agent messages retain their side accents. Each contiguous tool/automatic approval group
uses a green container by default and warm orange only for issues, without a side accent; contained successful rows use quiet
green and failed rows richer orange, each with its own accent and explicit status. Safe actionable
error text is recovered from structured and saved tool output and redacts credentials. Summary
wording is tools, automatic approvals, failed, running; only structured tool events count as actions.
Working indicators and subtle group animation stop on completion and under reduced motion. Native
uses the same summary wording with its existing running indicator. See the committed design examples.

## October 6 evening corrections

Successful desktop/web Activity groups retain green; groups containing issues use warm orange.
Activity items keep straight left accents and rounded right corners. Details appears only when
there is actual rendered content. Remote desktop model choices are inline in the composer,
using destination metadata; the clipped Next turn expander is removed. The fixed child tab is
Chat with a nonshrinking navigation-size icon. Closing a selected child picks its left sibling
before native close events can invalidate selection; the last child falls back to Chat.

Regular-width iPad uses its existing top chat menu without an additional back/title/menu row.
Native earlier history has an explicit load/retry control; this does not establish complete
disjoint-window reconnect recovery. Remaining parity gates are in the acceptance audit.

Native conversation rows are emitted only for visible messages and the first event of an Activity
group. Absorbed tool/approval events and empty assistant events emit no stack row; otherwise each
invisible event added 18 points of whitespace. Visible rows retain absolute event IDs for reading
anchors. A 40-event iPad fixture verifies the next message is exactly one 18-point gap away.
Website details render the authorized projection of working folders, context entries, token usage,
provider session, model history and schedule snapshot. Host file operations remain Mac actions.

### October 7 complete history

Remote paging accepts an absolute `beforeEvent` boundary, with offset fallback for older hosts.
Web, visiting desktop and native clients retain loaded pages across live event windows and keep
sparse segments separate until missing pages bridge them. Earlier messages is an actionable
load/retry control. Native visible-row filtering precedes layout, avoiding empty Activity gaps.


October 12 activity parity: contiguous system/tool/approval events share one Activity group between user/model messages, preserving darker system messages. Per-tool completion time and elapsed duration come from recorded tool lifecycle fields; missing values remain unavailable. Remote Working uses current owner state and is cleared for a disconnected view.

## Isolated preview activity and closure — October 17

See [desktop preview](desktop-preview.md) for the preview-only activity/ordering and closure revision.
Selection and restoration do not advance recent activity. Workspace aggregate Tabs is not
reorderable; project order is manual. Browser Hide unloads and Restore waits for selection to
load. Chat view closure preserves durable state and active work while releasing presentation
caches; successful terminal input advances its recent activity. Production rollout remains held.

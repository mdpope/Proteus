# MTPLX in Design Preview

The latest review build removes Chat view controls and uses Activity grouping by default. New
MTPLX turns record observed thinking/response intervals and the server's reported request usage,
including optional cached-input and reasoning-token counts. Expand Activity → Activity details /
Usage details to inspect timestamps, provenance, scope and missing values. Raw thinking text is
not stored, and old notices cannot recover timing that was never captured. Ordinary assistant
messages, warnings, questions, errors and context-loss notices remain in the conversation.

Other adapters now capture their corresponding lifecycle/usage signals; Codex can additionally
retain its explicit provider-supplied summaries. The model/runtime must actually emit those fields.
Observed intervals include transport/waiting and are not exact inference time. Missing data stays
unavailable. The operator's latest checkpoint is Design Preview review before any installed-app
update or wider rollout; the earlier comparison-build sections below are historical.

The October 25 preview adds **Chat view → Current / Grouped activity** to actual local saved
chats. Both use the same event journal; Grouped activity collects exact MTPLX thinking notices
with adjacent tool events and exposes their original saved text. The MTPLX message-name fix
also corrects the old main-agent “Proteus” fallback at display time without rewriting history.
The toggle does not change model context, send a turn, collect more reasoning or infer thinking
duration. It defaults to Current and remembers selection only while that chat view is cached.

Start MTPLX with a loaded model, then open Proteus Design Preview. New chat offers
**MTPLX · local preview**. Production, hosted web and native mobile registration remain
separate from this local experiment. No native MTPLX chat is imported or modified.

## Reasoning controls

The provider reads `/v1/models` and `/v1/mtplx/settings` together. A model-matched
`reasoning_policy` supplies supported modes/efforts; no model-name table invents them.
The currently investigated server reports modes **Auto / On / Off** and efforts
**Xhigh / Medium / Low**. Another loaded model may report different choices.

New Chat and the continuing-chat composer capture two independent settings:

- **Reasoning:** Provider default, or a mode advertised by the loaded model.
- **Level:** Provider default, or an advertised effort. Off disables this picker while
  preserving its saved choice; no effort is sent while reasoning is explicitly Off.

Selections apply to the next queued turn and survive restart. Provider default omits the
control from the request. Explicit Auto uses the model's advertised default reasoning mode;
On/Off send `enable_thinking`. Effort uses `reasoning_effort`. Requests explicitly opt into
MTPLX client controls with `X-MTPLX-Allow-Client-Controls: true`. No global settings POST,
fan-mode change, model reload or other chat's setting change occurs. Thinking progress is
shown, but raw thinking text is not displayed or retained in this iteration.

## Sources, tools and MCPs

Selected text instructions, skills, agent prompts, editor context and mandatory Proteus
guidance are supplied each request. Selected agent tool ceilings apply to the actual catalog.
Skill text can now use available tools; there is no automatic loading of unrelated sources.
Select individual skills rather than legacy skill-directory configuration.

Select an MCP in the ordinary source picker. For an existing text-pilot chat, open Details →
Refresh / choose context, select its MCP source, then continue. A reference to an MCP in an
instruction note does not itself connect that server. Disabled sources stay disabled.

The `mcp` gateway lists selected servers, discovers native schemas in searchable pages,
calls exact tools and reads selected-server resources. Connections use the official MCP SDK
over stdio, streamable HTTP or SSE. Explicit server/tool filters and selected agent ceilings
are checked before calls. Schemas are validated without coercing arguments. Each native call
uses the engine's existing permission path; automatic read-only approval requires actual
server metadata and the user's existing policy. Selection is rechecked after approval waits.
Connection health appears in chat Details. OAuth login/recovery is not implemented here;
authentication must already work through the selected server's explicit configuration.

Available Proteus browser/tab/document/integration/chat tools use their existing owner
services and approvals. Proteus browser tools control Proteus tabs. Safari profiles/tab groups
require their selected SafariSelector MCP. Terminal input requires the exact live terminal's
human sharing grant; no unrestricted shell or terminal creation tool is introduced.

`read_file` reads UTF-8 text or lists a directory inside the captured/granted folders.
`write_file` creates or atomically replaces text inside those folders, blocks protected
metadata, and requires the exact prior SHA-256 for an existing file. Current permissions
still decide whether a file operation asks or uses a granted folder. The helper has a 256 KB
text limit and does not create missing parent directories.

## Images and drawings

PNG/JPEG/WebP images and UTF-8 text use the existing exact-file, exact-provider, one-use consent
boundary, including question attachments. The fresh model must advertise vision before image
bytes are sent. Tool images use image content rather than base64 prose. PDFs and other binary
documents need a separate extraction adapter; they are not advertised here.

Fenced `svg` code can render below the original code block. A small static SVG subset is
validated and displayed as an isolated image, never inserted as active document markup.
Scripts, event handlers, HTML, styles, external resources, entities and animation are rejected.
This is vector code generation; MTPLX does not advertise a raster image-generation API.

## History, cancellation and limits

Delivered user/model messages and tool results are persisted independently of queued UI
events and replayed on continuation. Calls run serially. Each intent is saved before dispatch,
and each result before advancing. Duplicate call identities fail without repeating execution.
Uncertain MCP delivery stops the turn without retry. After interruption, unmatched intents
receive an uncertainty marker in model history; they are never automatically re-executed.
Stop aborts the model request and closes this chat's MCP clients.

Usage reports measured prompt/completion tokens, including replayed context and each tool-loop
model request. There is no invented subscription quota. Responses use the reported output cap
or a 16,384-token local budget, bounded by the advertised context window. A turn has at most
24 model/tool rounds. Older complete user turns may be evicted with an explicit notice; full
chat events stay intact. The text-byte estimate plus per-image reserve is not exact tokenization;
MTPLX remains authoritative for actual context admission. Current sources and the latest turn
are never silently truncated. Large single contexts fail with an actionable error.

Active-turn steering, native subagent delegation, MCP OAuth sign-in, unrestricted shell access,
and production/remote/mobile enablement remain unsupported. Queue follow-ups normally.

## Validation

`node --test test/mtplx.test.js test/chat-attachment-consent.test.js` covers live-metadata mapping,
tool schemas/approvals/filters, real synthetic stdio MCP, file boundaries and edit hashes,
uncertain recovery, stream fragmentation, cancellation and exact media/provider binding.

`PROTEUS_MTPLX_LIVE=1 node test/mtplx-agent-live.mjs` uses real MTPLX, a disposable preview,
a synthetic selected MCP, test-file operations and a synthetic consented image. It checks
reasoning controls on actual requests, MCP result continuation, file read/write, image
interpretation, restart persistence and unchanged global MTPLX settings.
`PROTEUS_MTPLX_LIVE_EXECUTABLE` selects a packaged preview executable. Private receipts and
screenshots are written to a temporary directory, outside source and packages.

The initial text/SVG package was accepted at `1dbe8f7af6fc+dirty.32c0706debae` (360 runtime files).
The expanded runtime suite passed 1,133 tests with one skipped. Fresh dependency installation
reset the native PTY helper's executable permission; the existing preparation helper repaired
it and both focused terminal tests and the full suite passed. Initial expanded live testing
verified MCP/reasoning/file reads, then exposed the attachment-store provider allowlist;
MTPLX was added without weakening the consent boundary. Final artifact evidence is recorded
in the current preview handoff, separately from these earlier attempts.

The installed MTPLX 2.12.2 source and actual local API responses were inspected.
References: [MTPLX repository](https://github.com/youssofal/mtplx),
[documentation](https://github.com/youssofal/mtplx/tree/main/docs), [site](https://mtplx.com/).
The endpoint defaults to `http://127.0.0.1:8000/v1`; `PROTEUS_MTPLX_URL` may choose another
loopback HTTP `/v1` endpoint. Remote origins, embedded credentials and redirects are rejected.

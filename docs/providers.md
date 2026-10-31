## Shared local inference

llama.cpp and MTPLX may be shared with explicitly selected paired devices. SharedLlmProvider keeps the local agent/tool loop and delegates inference over encrypted peer RPC. See [shared models](shared-models.md) for setup, ownership, queueing, cancellation and recovery.

## Windows llama.cpp provider

The llama-cpp provider uses the existing local serial tool loop, selected-source/MCP boundaries, ordinary approvals, cancellation and persisted delivered history. It discovers loaded model identity/context and reasoning efforts from /v1/models and /props. Template/tokenizer endpoints account for current sources, tool schemas and complete old turns before admission; unknown limits fail explicitly. The server owns inference scheduling. There is no cloud fallback or claimed subscription allowance.

See [llama.cpp setup](llama-cpp.md) for authenticated HTTPS and remote clients.

## October 26 — Linux Codex executable discovery

Linux honors `PROTEUS_CODEX_PATH`, then executable PATH entries, followed by the desktop bundle at
`/opt/codex-desktop/resources/codex`, the user's native bin and standard system bins. Automatic
matches must be executable files; native symlinks work. Relative/empty PATH entries are not scanned.
Discovery does not launch a shell, change credentials or select a different provider account. An
explicit unavailable path remains authoritative so isolated smoke tests cannot fall back to a real
provider. The update helper already preserves the override and desktop-session context.

The reported KDE failure was `spawn codex ENOENT`, before sign-in; the earlier resolver checked
Mac bundle paths on Linux and missed the desktop installation. Source acceptance passes six new
discovery regressions, 29 focused cases, the complete 1,204-pass/three-skip suite and static checks.
These checks ran on Mac with an injected Linux platform and disposable filesystem fixtures;
actual Linux package/GUI/update acceptance and installation remain pending.

## October 24 — MTPLX reasoning and agent extension

The isolated preview adapter now reads both `/v1/models` and `/v1/mtplx/settings`.
Model-matched `reasoning_policy` supplies actual modes/efforts; explicit per-chat controls
use `enable_thinking`, `reasoning_effort` and MTPLX's client-control opt-in header.
No global settings POST, model-name option table or account/runtime substitution occurs.

A serial OpenAI tool-call loop connects available host tools and a selected-server MCP gateway.
It validates each schema, uses ordinary `ask` permissions and current owner/selection checks,
persists tool intents/results and closes orphaned protocol pairs with uncertainty on recovery.
Official MCP SDK transports support stdio, HTTP and SSE; tool filters and selected agent ceilings
are enforced before dispatch. OAuth sign-in/recovery is not implemented for this adapter.
Consented image/text input and vision tool results use actual image content. Older complete
turns can be evicted with a visible notice; the full event journal stays intact.
See [MTPLX contract](mtplx-pilot.md).

## October 24 — preview-only MTPLX text provider

Design Preview registers `MtplxProvider` behind `SessionProvider`; production does not register
it. It uses live MTPLX `/v1/models` and streaming `/v1/chat/completions`, supplies core guidance
and captured text/agent sources, and persists delivered history in the Proteus run.
No native MTPLX chat is imported or modified. MCPs, tools and attachments are excluded with
explicit errors; subscription allowance and unadvertised controls remain unavailable.
See [MTPLX pilot](mtplx-pilot.md).

## October 23 — question attachments, liveness and shared terminals

All three providers expose consented question attachments through `proteus_question_attachments`:
the ordinary text reply names the request ID and the active chat's tool returns the exact approved
PNG/JPEG/WebP/text bytes. Cross-chat/device/provider access and changed-content replay fail.
Images use each adapter's structured image result transport. Adapter-boundary tests cover all
three; live model/image interpretation remains release acceptance.

Run liveness tracks provider output and tool transitions independently of user edits/queued input.
After five minutes without observable progress the UI shows the stage and elapsed warning;
after two hours the engine interrupts once (raised from thirty minutes on October 29). The execution slot stays occupied until the
provider actually settles; no automatic replay or replacement session is created. Queued messages
remain intact for explicit recovery. The reported old stuck chat's precise hung call is unproven.

When the host desktop is available, all three provider catalogs expose `proteus_terminal` through
the same explicit live sharing boundary as local MCP. See [terminals](terminals.md).

# Provider boundary

## 0.2.28 — MCP approval routing and Claude steering

Codex now recognizes selected third-party native MCP tool approvals and uses the ordinary MCP
permission path, preserving eligible saved rules, Ask, selected-tool restrictions and revocation.
It validates the native envelope and active thread/turn, answers each request once and leaves
execution to the native runtime. This is generic across selected stdio/HTTP servers, including
same-named tools on different servers. Unsupported elicitation produces an explicit adapter error.
See [permissions](permissions.md) for policy boundaries; the repair does not reset server sign-in.

Claude uses its private native Code process's bidirectional stream-json/control protocol. Steer
interrupts the current response, drains that result, then sends one UUID-tagged user input in the
same session. With --replay-user-messages enabled, the adapter waits for the matching native replay
before acknowledging delivery. Result usage from both legs is retained. Missing replay times out
as unconfirmed delivery without automatic resend or concurrent turns. This is interrupt-and-continue,
not a claim of identical Copilot steering semantics. Client controls use actual owner capability.

Synthetic real-adapter/fake-runtime regressions pass for both changes. Real Claude and HC MCP
execution remain live acceptance. See the [release ledger](2026-10-21-browser-chat-release.md).

**Queued October 19 — BF-2026-10-19-29:** Work Mac's New Chat lists only Codex/Local rehearsal
despite the operator having Copilot and Claude. A matching renderer defect is reproduced from
checkout and installed Personal code: `previewEnabled()` includes normal production projects,
but its old New Chat branch removes Copilot/Claude and forces Codex regardless of provider status.
Keep actual isolated-preview policy separate from production project UI and use the destination
host's real provider/catalog state. Preserve selection/defaults, drafts and provider-specific model
capabilities; expose actual unavailable/loading errors without silently substituting providers.
HC live catalogs and provider execution remain unverified in this intake. Repair and UI/host
acceptance are queued under the build hold; no sign-in/reset/runtime change. See
[planned updates](planned-updates.md).

**Queued October 15 — BF-2026-10-15-09:** Investigate intermittent Claude second-send dependency
across engine queue wakeup, provider handoff/resume, tool waits and response delivery. Correlate
message identities with actual runtime events before identifying a cause; a delivered queue label
alone proves neither provider processing nor completion. Keep per-session turns serialized and
ambiguous-delivery retries safe. See [next release list](planned-updates.md). Planning only; no
provider/runtime change or live reproduction claimed.

A provider implements `run({ run, prompt, emit, ask, update, signal, stream })`, `status()`, and
`close()`. Optional `steer(run, prompt)` supports active-turn input; MCP connection methods are separate from model execution. The engine owns persistence and conversation state. `ask` suspends for permission/input;
`stream` publishes partial text; `emit` records durable events; `update` saves provider metadata.
Cancellation must abort work. Model errors fail the turn even if the runtime emits idle afterward.
The provider persists its native session ID on the run.

`CopilotProvider` uses the official SDK, captures available model capabilities, configures working
roots, and reapplies context, model options and MCPs on resume. `RehearsalProvider` is deterministic,
makes no AI calls, and exercises the same feedback states. Never present rehearsal as AI output.
Account quota and per-run tokens are separate measurements. Missing data remains unavailable;
do not estimate subscription quota from local tokens or silently substitute another model.

**Claude usage accounting (October 11):** Input tokens now includes uncached input, cache reads
and cache creation from the final result's turn aggregate. The separate components remain available
in chat details; assistant/stream usage is not added again. Earlier records without complete cache
accounting are labeled partial, including when a new complete turn is appended; no historical
backfill or invented reconstruction is performed. Account quota remains a separate measurement.

## Chat concurrency

Independent chats run concurrently through per-chat provider runtimes. Turns within the same
provider session remain serialized, and one runner owns each application-data directory. Metadata
runtimes are separate from executing chats; steering, cancellation, approval listeners and cleanup
route to the owning runtime. Visible queue reasons explain same-session serialization or actual
provider constraints. No arbitrary Proteus chat-count cap is introduced.

## Allowance refresh: current behavior and queued review

As reviewed October 5, `ProviderUsageCache` in `src/services/telemetry/usage.js` refreshes all three adapters on
request, coalesces concurrent calls, and caches the result for five minutes; force bypasses TTL.
It has no active-chat versus idle policy and no independent host usage timer. Desktop asks every
minute while allowance is enabled. Visible website shell/remote views ask every minute, and the
native allowance view asks every five minutes while mounted and connected. These are client-to-
Mac requests; a valid host cache avoids a new adapter quota read. Browser backgrounding and native
view/app lifecycle can stop these requests, so this is not a guaranteed background refresh service.

There is an additional Copilot quota call in `CopilotProvider.status()`, used by the host's
five-minute model/status catalog refresh. It is outside `ProviderUsageCache`, so the allowance
TTL alone does not bound all quota traffic. The queued adaptive policy must account for both.

Copilot calls the official SDK `account.getQuota`; Codex uses its local app-server
`account/rateLimits/read`; Claude asks a temporary local CLI control session for `get_usage`,
with previously observed rate-limit events as a labeled fallback. These are usage/account
operations, not generated model turns. Local SDK/CLI transport does not establish that the
runtime serves data solely from disk: provider service access and runtime caching are separate.
Web/native ask the paired Mac through the encrypted relay rather than receiving provider tokens.

Past reset timestamps are retained internally as `reportedResetAt`, cleared from the future
`resetAt` display and labeled “next reset is unreported.” A read-only running-Mac status check
confirmed a past Copilot reset observation; it did not establish the cause in GitHub or its CLI.
Copilot currently uses the generic premium-interactions bucket and labels it Premium requests;
review current billing metadata before interpreting its units. The queued design distinguishes
an expected monthly reset from a provider-reported reset and preserves missing/stale values.
See `planned-updates.md` for the proposed adaptive policy and official reset references.

## Live model controls

Mac New Chat, schedule settings and default Settings share model, **Thinking effort**, and
**Context size**, and **Speed / service tier** pickers. iOS New Chat and schedule details use the same host catalog. Existing
run details show the captured settings. Defaults affect new chats/schedules; existing runs retain
their captured configuration.

The host refreshes at launch and every five minutes (one-minute timer with a five-minute cache).
**Refresh models** / **Refresh available models** force a fresh request for models and all their
capabilities together. Mobile receives the host's catalog on sync; open Mac dialogs also refresh.
Concurrent refreshes coalesce. Failure retains the last successful data with a stale/error label
and the original successful timestamp. No metadata is fabricated when offline.

SDK 1.0.16 caches `client.listModels()` until disconnect. The adapter uses the public
`client.rpc.models.list({})` to bypass that cache without restarting active sessions. A separate
fresh model request before each turn verifies that the saved model, effort and context tier are
still supported. An unsupported explicit choice fails with an actionable error. Unknown saved
choices stay visible in the picker until the user changes them.

The normalized `model.controls` contract is provider-neutral:

```json
{
  "reasoningEfforts": ["none", "low", "high"],
  "reasoningSupported": true,
  "defaultReasoningEffort": null,
  "contextTiers": [
    {"id": "default", "promptTokens": 272000, "totalTokens": 400000},
    {"id": "long_context", "promptTokens": 872000, "totalTokens": 1000000}
  ],
  "maxOutputTokens": 128000
}
```

These numbers are illustrative, not a hardcoded model table. Effort IDs come from
`supportedReasoningEfforts` (or the provider support metadata); do not constrain them to an old
SDK TypeScript enum, which omits `none` in this version. An advertised default can be labeled;
otherwise **Provider default** sends no override. A VS Code default is not evidence of the SDK's
default.

For Copilot, prompt budgets come from `billing.tokenPrices.maxPromptTokens` and
`billing.tokenPrices.longContext.maxPromptTokens` (legacy `contextMax` fallback). A model's overall
`max_context_window_tokens` can describe its largest tier, so it must not be displayed as the
default prompt capacity. Output capacity is shown separately. Alternative providers can advertise
context tier IDs without sizes; display capacity as unreported. Context tier is not an arbitrary
numeric limit, and selecting it does not preload files.

Add future providers by implementing execution and capability normalization, extending the provider
registry/selection and API routing, and mapping provider-native option IDs. The UI consumes the
common `controls` shape; it should not add model-specific branches. The current app implements Copilot, Codex, Claude and rehearsal. Arbitrary providers are not registered automatically.

Sources: [Copilot SDK Node reference](https://github.com/github/copilot-sdk/blob/main/nodejs/README.md),
[session persistence](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-persistence),
[usage and quota](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing).

## Codex

`src/providers/codex.js` speaks the native Codex app-server JSON-RPC protocol over private stdio. It starts
its own runtime process, uses the existing Codex CLI sign-in, and never controls the Codex desktop
app's active tasks. It finds a standard installed CLI or accepts `PROTEUS_CODEX_PATH`. Install the
CLI or Codex app and run `codex login` on the Mac if Providers reports no account. The runtime owns
native session storage under its configured Codex home; the exact session path appears in details.
Proteus owns its own run record. A chat cannot change provider or migrate provider history.

Each provider has its own catalog and refresh cache. Codex `model/list` supplies models, effort
choices and service tiers; only advertised values are offered and validated before a turn. Context
capacity is unreported by that catalog, not copied from a similar Copilot model. Runtime token-usage
notifications can report the actual context window. There is no generic numeric context override.
Account allowance is reported independently for each provider in the compact sidebar.

Selected instructions and skills become explicit Codex developer context. Agent prompts become
named role instructions, with the main identity marked. Native subagent registration and editor
agent tool allowlists are not equivalent to Copilot: declared tool restrictions fail explicitly
before a model turn, rather than being ignored. Deselect those agents to test Codex. Legacy skill
directory loading is also rejected; use individual discovered sources. Unselected repository
instruction discovery and host skill discovery are disabled. Project AGENTS exclusion has been
verified, but native startup can still open the global `~/.codex/AGENTS.md`; a symlink into iCloud
can require macOS file-access approval even with `project_doc_max_bytes=0`. Global instruction
exclusion from the actual model prompt has not separately been verified, and a file open alone
does not prove its contents were supplied to the model. Configured unselected MCP servers and
plugins are disabled for these threads; built-in provider instructions/tools still consume context.

Codex receives the actual working directory and all selected workspace roots, with no worktree
creation. Ask/Saved rules uses native read-only sandbox plus per-operation approval requests
forwarded to Proteus; trusted canonical folder grants can select the validated workspace-write
policy described below. The shared permission store remains authoritative for host approvals;
requested sandbox/network expansion still needs explicit approval. Browser actions use the same
scoped `proteus_browser` bridge. MCP tools use a disclosed per-server grant for all selected tools;
Codex then manages tool execution within that grant. Server tool filters are translated when
provided. SSE-only transports are rejected; remote servers must use streamable HTTP.

Steering targets the current native turn ID. Cancellation waits for interruption; an unresponsive
Proteus-owned Codex runtime is stopped before the engine can run another turn. Provider errors,
retries, command output, file changes, plan updates, compaction, final messages and usage reach the
same event/presentation pipeline as Copilot. No native reasoning text is exposed.

Validated against installed app-server 0.155.0-alpha.16.4 and its generated experimental schema.
The protocol includes experimental dynamic tools; unsupported runtimes fail with their real RPC
error. Live validation uses `node test/codex-smoke.mjs` with synthetic data and existing sign-in;
it consumes a small amount of Codex allowance. See [chat controls](chat-controls.md) and
[MCP connection recovery](mcp-auth.md).

Protocol reference: [Codex app-server](https://learn.chatgpt.com/docs/app-server).

The chat composer uses the same catalog as New Chat. Model/effort/context/speed choices are captured
on Send or Queue and applied on the next turn; Steer keeps current settings. Clients do not offer
speed or context-tier choices unless the provider advertises them. Native conversation history
remains intact across model changes, subject to the provider's context management.

## Interrupted chat recovery and attachment steering

Plain system messages render as chronological message boxes, outside collapsed Activities;
structured tool and permission records retain lazy activity details. A failed/interrupted chat
offers **Continue chat** in its latest system box. Its owner verifies the exact failure identity,
keeps the existing native session, and continues unfinished work before the existing queued inputs.
Draft text/files and queue receipts remain intact. It never answers a pending approval.

For the explicit model-capacity failure, **Retry every 60 seconds** opts that one chat into an
owner timer. **Stop retrying** stops future attempts. Retry waits until its prior attempt settles,
re-arms only for another capacity failure, and stops on success, other errors, manual input,
changed effective settings/permissions or shutdown. It retains the selected model and never
silently reactivates after launch. Pending retry blocks update/archive/delete. Generic failures
offer manual continuation only. Local, paired desktop, web and native UI use the same owner boundary; older
owners do not advertise recovery. The actual desktop regression waits a full minute and verifies
one queued follow-up delivery after continuation, with the unsent draft preserved.

Supported active-turn inputs now carry attachments through the same exact file/provider consent,
immutable-byte read and durable message identity as ordinary input. Codex accepts its existing
image/plain-text types through `turn/steer`; private image files stay until the native turn settles.
Copilot uses supported blobs with immediate mode, including PDF. Claude uses its existing
acknowledged interrupt-and-continue boundary with image/text content. Unsupported types/backends
fail explicitly; no silent queue, cancel/restart fallback, model change or expanded grant occurs.
Paired owners advertise `chatControls.steeringMediaTypes`; native composition respects that gate
and confirms the same selected file/provider destination. Web and native attached steering reread the same host/provider/active turn and every accepted media type before sending; a changed turn retains the draft/files. A timeout remains unconfirmed delivery,
not permission for automatic resend. Existing queued attachment promotion remains unavailable;
new messages with files can use Steer directly while a turn is active.

Protocol references: [Codex turn input](https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/src/protocol/v2/turn.rs),
[Copilot steering](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/steering-and-queueing),
[Claude streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode).
Native provider-input contract and encrypted-relay consent/deduplication tests pass; exact signed
artifacts, native UI/device delivery and installed acceptance remain separate.

## Claude Code

`src/providers/claude.js` owns a private native Claude Code process for each Proteus turn. It discovers a
standard CLI installation or the Claude desktop app's downloaded native CLI; `PROTEUS_CLAUDE_PATH`
can select another executable. Native session IDs are retained and resumed explicitly. No desktop
app conversation is reused. Sign in to the CLI with `claude auth login`; installing or signing in
to the desktop app does not guarantee that the CLI has an account.

Application updates and compatible rollback preserve the launching process's explicit
`CLAUDE_CONFIG_DIR` and `PROTEUS_CLAUDE_PATH` locations, alongside Codex/Copilot locations.
The helper previously discarded these overrides, which could reopen a different credential
namespace after restart. Default locations remain native; no new per-build profile is created.
Isolated smoke tests override all provider locations and disable their executables. Authentication
tokens are not copied into the update journal or added to the relaunch environment allowlist.
This corrects an update environment defect; it does not establish the cause of every macOS
sign-in failure. A retained Keychain item alone does not prove that Claude can use its token.
When diagnosing, compare the actual selected CLI's non-secret authentication status while the
Mac is unlocked. Preserve the native store and signer; do not clear credentials or force a new
login merely because capability discovery failed. Claude's desktop-managed CLI can update
independently of Proteus, and its authentication persistence needs separate live verification.

The adapter uses the bidirectional control protocol published in Anthropic's official Agent SDK.
Initialization supplies the current model catalog and model effort capabilities. Context capacities
remain unreported. A model's Fast capability is offered only when the runtime does not report a
fast-mode disabled reason; an unsupported explicit speed fails before sending the prompt. The
installed 2.1.286 runtime reports `sdk_opt_in_required`, so this installation offers provider-default
speed only. Alias choices display the exact model ID the installed runtime currently resolves them
to; aliases can change with the runtime or account. No hidden enablement flag or guessed model table
is used.

Selected instruction/skill text and agent identity are explicitly included in the system prompt.
User/project setting sources, slash commands, auto memory, automatic CLAUDE.md discovery, external
MCP discovery and Chrome integration are disabled for these sessions. Additional workspace roots
are explicit. Only MCP servers captured for the chat are passed through a private configuration file
with `--strict-mcp-config`; connection status must become connected before the turn sends content.
Selected stdio servers with a source-specific working directory run through a fixed Proteus launcher
that preserves that directory and passes the captured command directly without a shell. Server
arguments and environment stay in a second private file. Servers with a restricted per-tool filter
are rejected because Claude cannot enforce that source limit here. Restricted editor agents and legacy skill directories
are also rejected until their complete contracts can be translated. Native
subagents and worktree tools are disabled. The embedded Proteus browser is not exposed to Claude yet.
These limits do not change Copilot or Codex support.

A native PreToolUse hook routes every tool operation through Proteus permission/input handling,
including reads that the native CLI would otherwise allow. Native fallback permission requests
reuse a decision only for the same nonempty tool-call ID, name and arguments. User questions retain
their answers. No bypass permission mode is used. Claude and Copilot share a two-hour active
execution safeguard, excluding time spent waiting for the operator. Claude timeout failures have
an explicit classification, same-session Continue and a separate per-chat automatic-continuation
preference. Automatic continuation is opt-in, runs at most three consecutive times, preserves
queued input and waits for process cleanup; it never treats transport/cleanup errors as resumable
timeouts. A successful intervening turn resets the count even when another follow-up is queued.
Cancellation and timeout terminate only the Proteus-owned process group,
escalating if necessary so tool subprocesses do not survive a cancelled turn. Thinking blocks are
not recorded or displayed. Native result errors fail the turn; token totals accumulate across
continuations and do not represent subscription allowance.

Every initial Claude input has a UUID and must be echoed by `--replay-user-messages` before a
successful result can finish it. Startup/orphan notifications may themselves yield zero-token
success results; these are ignored for the current input, without resending it. Native background
task lifecycle messages keep the owned process active across intermediate successful responses.
For runtimes that expose handles in tool results, only exact Bash/Monitor handle envelopes and
known generated completion notices are recognized. Explicit user inputs and unrelated tool text
cannot finish those tasks. Task completion still awaits the provider's subsequent result; Stop,
actual errors, cleanup failure and the two-hour safeguard retain their usual control. See
[continuation analysis and validation](2026-10-29-claude-continuation.md).

Validation: native CLI initialization and live model-capability discovery succeeded. After the
operator completed Claude subscription sign-in, the source provider completed an authenticated,
tool-free synthetic turn and resumed the same native session with correct recall and observed
token usage. Authenticated initialization can report profile fields instead of token-source fields;
the adapter recognizes either shape without exposing account identity in provider status. Synthetic
tests cover native continuation, capabilities, errors/timeouts/cancellation, permission identity,
selected-only MCP configuration/status and failure gates, unknown quota, runtime quota-event
normalization and accumulated token usage. A selected MCP tool has not been called against a real
workplace server as part of this release. The Apple Development
signed installed desktop app also completed the same class of tool-free synthetic turn and native
continuation through its authenticated local API, with observed token usage. Live tool permission
flow still needs its own acceptance check. The installed runtime still disables SDK fast mode.

Sources: [Claude CLI reference](https://code.claude.com/docs/en/cli-reference),
[official SDK control protocol](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/_internal/query.py),
[official rate-limit event types](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/types.py).

## Compact account usage

`ProviderUsageCache` returns independent Copilot, Codex and Claude entries under `providers`.
Each entry has `provider`, `source`, `available`, `checkedAt`, `error`, `stale` and `windows`.
A window has `id`, `label`, `remainingPercent` (or null), `resetAt` (or null), and `unlimited`.
Readers coalesce and cache for five minutes, with a ten-second per-reader bound. One failed provider
retains its last known reading with a stale/error indication without hiding healthy providers.

Copilot uses its premium-request quota. Codex uses native `account/rateLimits/read`, preferring all
named limit buckets to the legacy single bucket. The compact summary uses the lowest reported
remaining percentage across windows; the detail view retains every window and reset timestamp.
Claude uses the native `get_usage` control request, the structured equivalent of `/usage` published
in the Agent SDK. This experimental response provides authoritative subscription windows before
any model turn. A separate no-session-persistence probe has an eight-second request budget, closes
with the existing bounded process cleanup, and never interrupts an active conversation. The probe
only returns allowance windows; session costs, account identity and behavior/transcript attribution
are discarded. Structured utilization is a percentage from 0 to 100, unlike streamed
`rate_limit_event` utilization from 0 to 1. Missing utilization or reset remains unknown. API-key
and third-party sign-ins may report no subscription allowance. Extra-usage credits are not combined
with the subscription windows to invent an overall entitlement.

Older runtimes that do not implement `get_usage` retain the observed-event fallback. Its
`observedAt` timestamp remains separate from the cache check time. Local tokens never fill in an
account percentage. Request failures remain explicit; cleanup failures retain ownership and block
new probes until cleanup succeeds.

Source: the official published
[Agent SDK `SDKControlGetUsageRequest` and response types](https://app.unpkg.com/@anthropic-ai/claude-agent-sdk@0.3.211/files/sdk.d.ts).


Installed-app quota validation also covers a Finder-like minimal PATH: the current signed
`CodexCLI.app` layout inside the Codex/ChatGPT app is discovered directly, without a shell PATH
change. Native read-only account limits responded successfully. Missing executables fail promptly.
Fresh Copilot/Codex API percentages remain authoritative even if the provider includes a past
reset timestamp. That timestamp is retained as `reportedResetAt`, while `resetAt` stays null until
a future reset is reported. Expiry invalidation applies to observed Claude event windows, not a
fresh API response. The detail view must not infer a future reset from a past snapshot timestamp.

Claude cleanup treats an OS-denied signal (`EPERM`) as unresolved process ownership. Group TERM
and delayed KILL failures cannot escape a timer or abort callback. The adapter may fall back to
signalling its own direct child, then confirms that the owned group has exited within a bounded
wait. If it cannot confirm termination, it reports a cleanup error, keeps the pending client, and
blocks new Claude execution. Capability refresh retries cleanup before creating another process.
This prevents an access-denied cleanup from crashing the main process or accumulating orphaned
capability probes. Regression coverage includes denied TERM/KILL/probes, abort, concurrent close,
status recovery and an actual stubborn descendant process.

Earlier signed installed-app turn validation emitted a five-hour event with status/reset but no
utilization. That event alone could not provide a percentage. A subsequent read-only `get_usage`
check against the already signed-in app-bundled Claude Code 2.1.286 returned actual five-hour and
weekly utilization, and the completed source adapter normalized both successfully. This required
no model turn, credential extraction, browser control or new sign-in. The installed Proteus bundle
still needs to be refreshed to consume this new reader.

The earlier installed-host Codex timeout cleared without changing its runtime, global instructions
or security configuration. On October 4 a forced installed-host catalog refresh returned seven
models in 60 ms. A bounded two-turn synthetic check through the installed signed host verified an
exact selected instruction marker, no echo of a separate unselected workspace AGENTS marker, no
tool calls and same native session continuation with observed usage. No operational vault source
was selected. This verifies the tested path, not global instruction exclusion or production workflow
completion; transcript cutover still requires its separate ownership and real-outcome acceptance.

A subsequent installed-host check created one exact marker file in a disposable workspace through
Codex apply_patch, received the normal native file-write permission request, approved it once via
Proteus, and verified the bytes. No persistent permission mode was broadened. This validates the
approval round trip, not unattended permission coverage for real transcript workflows.

### Codex trusted-folder writes and unattended cutover

Codex now maps an already saved **Trusted workspace** or **Auto-approve tools** profile to a
`workspaceWrite` sandbox only when its canonical working directory currently has a read-write
grant. The writable list contains only selected workspace roots and explicit chat-folder roots covered by still-valid saved
grants. A changed symlink cannot transfer a grant. Ask and Saved rules only remain read-only;
no mode or folder grant is enabled by importing, previewing or running a schedule.

The adapter explicitly disables network access and excludes both the implicit `/tmp` and
`TMPDIR` write allowances. It keeps native `untrusted` approval routing to `user`, and checks the
thread's resolved policy before starting a model turn. An extra root, different reviewer,
network allowance, missing temp exclusion or unexpected policy fails closed. Continuations
reapply the current policy. Permission changes interrupt an active affected Codex turn, allowing
the native runtime to stop its tools before the existing bounded cancellation fallback.

**Trusted file access does not approve arbitrary shell execution.** A Python helper still needs
a saved exact-command approval or an explicitly selected Auto-approve tools mode. Existing
sandbox-expansion and managed-network requests always require a direct response, including in
Auto-approve tools mode. Consequently, the general transcript workflows remain held from cutover
until the operator reviews the native folder policy and unattended command approvals. The old
Codex automations remain the active owners; this change neither activates replacements nor
silently grants permissions.

The installed runtime schema was generated locally rather than assuming documentation examples
match this build. [Official app-server documentation](https://learn.chatgpt.com/docs/app-server)
describes separate sandbox and approval controls and the additional-permissions/managed-network
request fields. Its newer restricted-read fields are not present in this installed schema;
this patch does not claim to restrict all native filesystem reads.

Validation: eight focused Codex tests cover unchanged Ask/Custom behavior, canonical root grants,
policy mismatch refusal, protected requests, continuation parameters and permission-revocation
interruption. `node test/codex-sandbox-smoke.mjs` starts the actual installed runtime with an empty
temporary Codex home and no model turn: two authorized folders are writable; an outside sibling,
a symlink escape and loopback network binding are denied. Empty native threads have no saved
rollout to resume before a first turn, so native live continuation is not claimed by that smoke
test; continuation configuration is covered by the synthetic protocol regression. No production
transcript, vault file, automation state or native permission profile was changed during validation.

## Copilot allowance availability (0.2.2)

A fresh quota-only probe checks provider authentication where reported and distinguishes provider
errors, timeout, interrupted probes, missing premium snapshots and unusable percentages. Real zero
remains measured zero. Missing quota yields an unavailable reason and recovery action; a new check
timestamp does not certify refreshed usage. The isolated probe does not start a model turn or stop
an existing chat. Installed-host validation is recorded separately in the release receipt.

### October 6 evening: quota authentication correction

Quota probes use a fresh client with the conversation client's authentication options and profile.
They must not force SDK `mode: 'empty'`: that mode disables Keychain and can select a different
GitHub CLI identity with no allowance. The affected Mac confirmed normal-auth quota-only reads
returned usable allowance and propagated through the cache and summary. The fresh process still
stops independently and does not consume a model turn or interrupt an active conversation.
The source regression covers both Keychain defaults and explicit token options using synthetic
credentials. Signed installation and the affected installed sidebar remain separate acceptance.

## Built-in app guidance and document tabs

Every provider receives Proteus runtime instructions describing browser-tab reuse and the
`proteus_open_document` operation. This is app behavior, independent of repository AGENTS.md and
optional user skills. The document operation opens a saved Markdown file in the owning chat and
reuses a stable descriptor. Both the run's workspace snapshot and current workspace authorization
must include the canonical file; symlink escapes are rejected.

Copilot uses its custom-tool boundary. Claude and Codex receive a narrow stdio MCP adapter backed
by an ephemeral loopback capability tied to one run and turn. The adapter receives no application
API credential. It supports document listing/opening only and closes after the turn. Codex resume
uses MCP configuration rather than unsupported dynamic-tool changes. `proteus_app` is reserved.
Normal provider tool-approval behavior still applies; runtime guidance does not grant permission.

## Concurrent chats

The October 9 adapter wrapper owns one runtime per executing chat and a separate metadata runtime. Same-session turns and per-chat connection probes remain serialized; independent provider chats do not block each other. Steering, cancellation, approval listeners and cleanup route to the owning runtime. Synthetic coverage is recorded in the combined ledger; live provider allowance remains provider-controlled.


## Workspace-scoped runtime configuration (October 11)

Workspace identity participates in permission fingerprints, so identical folders in two workspaces
do not share grants. New chats inherit selected source/default configuration; changes to inherited
configuration are captured between turns, preserving history and the active-turn snapshot.
Chat-only folder grants remain attached to the chat and enter Claude/Copilot native additional
directories on the next turn. Copilot configuration fingerprints include that set for cold resume.
Codex uses the current permission profile for native sandbox/root validation, including revocation;
Ask/Custom retains read-only sandbox and per-operation approval routing. See
[permissions](permissions.md) for the distinction between native roots, recursive folder trust,
and command approval. Provider option choices still come from refreshed model metadata.

## October 19 production/preview audit

New Chat's production project UI had reused the isolated-preview predicate to prune Copilot/Claude.
It now gates that policy on actual `desktopPreview.enabled`, preserving the owning host's refreshed
catalogs, defaults and draft choices. A source scan checks the other provider/model preview guards:
server adapter selection, staged Codex authentication and preview-default initialization remain tied
to the explicit isolated-runtime option. No additional production provider pruning was identified.
Native attachment-unavailable wording now distinguishes the actual isolated fixture from normal
provider capability. HC real-provider picker/execution acceptance remains pending.

The supervised updater and native desktop controller use the existing provider custom-tool and
image-result boundary. Tool discovery is lazy; a catalog does not establish OS permission, page/app
control or actual provider image delivery. These acceptance outcomes are tracked separately.

## Activity detail review — October 24

MTPLX response naming now uses the same provider fallback as Copilot/Codex/Claude in source;
legacy main-agent “Proteus” labels are corrected at display time without rewriting records.
The next preview build will include this correction. Broader progress changes remain a
[standalone design study](design/2026-10-24/activity-details-preview.html), not enabled behavior.
## October 25 — Captured Activity contract

The shared chat renderer groups structured provider Activity by default, with no format switcher.
Legacy exact MTPLX thinking notices remain available under Original saved event. Other system
messages and ordinary assistant updates remain visible. New records are separate from provider
replay input and carry source, phase status, observed times, optional agent, and scoped usage.
Activity details explain missing data, interruptions and the distinction between elapsed streaming
intervals and inference time. Missing counts are not zero; usage scopes are never summed blindly.

MTPLX reasoning/content streams, Copilot reasoning/message events and Claude thinking/text block
lifecycles supply phase signals. Codex reasoning-item and agent-message events supply phases;
its explicit public summary channel also supplies bounded summary text. Raw reasoning text and
signatures are not retained. Claude aggregate input includes uncached + cache-read + cache-write
only when all three exist; other usage fields retain their provider-reported scopes.

The local MTPLX pilot remains preview-only. Review capture in Design Preview before updating
the installed app; production registration, OAuth, native steering and remote/mobile rollout
remain separate capabilities. See [MTPLX contract](mtplx-pilot.md) and current handoff status.

## Delegation and bounded attachment access

Applicable adapters expose mandatory owner tools even when optional sources are empty. Copilot custom-agent declarations and MTPLX tool ceilings retain ordinary selected MCP/executable limits while allowing registered Proteus core tools. `proteus_agents` offers parent-scoped spawn/list/read/wait on the same captured provider/model/account, with stable UUID reconciliation, three active children, 32 retained children and bounded nesting. It cannot approve another task's request. Native provider delegation remains available where supported.

Codex, Copilot and Claude provider-owned lifecycle events populate a separate child journal. Restored transcript history alone grants no current-turn authority. Child completions do not settle the parent's turn. Native journals retain up to 128 children and 200 events/256 KiB per child, with 16,000-character event/live-text bounds and an explicit truncation indication. Only text/tool output is shown; reasoning is excluded. A provider may expose status without transcript. The real Codex CLI regression passes; live non-Codex acceptance remains recorded separately.

Any attached file can be stored with exact original bytes. Native supported media is sent normally; other binary or large text becomes a descriptor for `proteus_attachments`, a bounded reader for this active turn's original files. Reads are byte-paged and UTF-8 boundaries are preserved. This does not give arbitrary filesystem access or promise universal extraction support.

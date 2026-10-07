# Provider boundary

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

## Allowance refresh: current behavior and queued review

As reviewed October 5, `ProviderUsageCache` in `src/usage.js` refreshes all three adapters on
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

`src/codex.js` speaks the native Codex app-server JSON-RPC protocol over private stdio. It starts
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
creation. Commands and edits use native read-only sandbox plus per-operation approval requests
forwarded to Proteus. The shared permission store remains authoritative for host approvals;
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

## Claude Code

`src/claude.js` owns a private native Claude Code process for each Proteus turn. It discovers a
standard CLI installation or the Claude desktop app's downloaded native CLI; `PROTEUS_CLAUDE_PATH`
can select another executable. Native session IDs are retained and resumed explicitly. No desktop
app conversation is reused. Sign in to the CLI with `claude auth login`; installing or signing in
to the desktop app does not guarantee that the CLI has an account.

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
their answers. No bypass permission mode is used. The active execution timeout excludes time spent
waiting for the operator. Cancellation and timeout terminate only the Proteus-owned process group,
escalating if necessary so tool subprocesses do not survive a cancelled turn. Thinking blocks are
not recorded or displayed. Native result errors fail the turn; token totals accumulate across
continuations and do not represent subscription allowance.

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
grant. The writable list contains only selected workspace roots covered by still-valid saved
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

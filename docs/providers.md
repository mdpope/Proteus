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
common `controls` shape; it should not add model-specific branches. The current app implements Copilot, Codex and rehearsal. Arbitrary providers are not registered automatically.

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
The Copilot allowance bar remains labeled Copilot; it does not represent Codex allowance.

Selected instructions and skills become explicit Codex developer context. Agent prompts become
named role instructions, with the main identity marked. Native subagent registration and editor
agent tool allowlists are not equivalent to Copilot: declared tool restrictions fail explicitly
before a model turn, rather than being ignored. Deselect those agents to test Codex. Legacy skill
directory loading is also rejected; use individual discovered sources. Unselected repository
instruction discovery and host skill discovery are disabled. Configured unselected MCP servers and
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

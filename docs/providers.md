# Provider boundary

A provider implements `run({ run, prompt, emit, ask, update, signal, stream })`, `status()`, and
`close()`. The engine owns persistence and conversation state. `ask` suspends for permission/input;
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
**Context size** pickers. iOS New Chat and schedule details use the same host catalog. Existing
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
common `controls` shape; it should not add model-specific branches. The current app only implements
Copilot and rehearsal, not automatic registration of arbitrary providers.

Sources: [Copilot SDK Node reference](https://github.com/github/copilot-sdk/blob/main/nodejs/README.md),
[session persistence](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-persistence),
[usage and quota](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing).

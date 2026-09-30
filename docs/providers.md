# Provider boundary

A provider implements `run({ run, prompt, emit, ask, update, signal })`, `status()`, and `close()`.
The provider can persist its native session ID on the run; the engine owns persistence and
conversation state. `ask` suspends the turn for permission or input. Cancellation must abort
provider work. Model errors must fail the run even if the runtime emits idle afterwards.

`CopilotProvider` uses the official SDK, discovers available models, configures the actual working
directory and additional roots, reapplies skills/MCP on resume, and records usage events. Account
quota and per-run tokens are different measurements. Optional metrics remain unavailable when
the runtime does not support them. Never estimate a subscription quota from accumulated local
tokens or silently substitute a model/provider when the selected model is unavailable.

`RehearsalProvider` is explicitly deterministic and makes no AI call. Its feedback prompt exercises
the same engine state transitions as a provider question. It must never be presented as AI output.

Sources: [Copilot SDK](https://github.com/github/copilot-sdk),
[session persistence](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-persistence),
[usage and quota](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing).

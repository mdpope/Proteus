# Workspace and chat update status

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

Still deferred:

- Background service, packaging/signing, independent concurrent execution, notifications.
- Standalone MCP connection/OAuth/input adapters and editor-specific agent hook and extension-tool mappings.
- Bitwarden extension compatibility and broader token-broker/Keychain bootstrap integrations.
- Automatic VS Code index, unsaved buffers, or existing chat-history transfer.
- Native session relocation or cross-provider conversation migration.

Operator paths, team rosters, private instructions, chat content, and workspace membership remain
in local configuration or their owning workflow sources, outside the app repository.

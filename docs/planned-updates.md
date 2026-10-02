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

## Chat presentation and active-run approvals

- Mac and iOS show one expandable activity per tool call, with arguments, progress, output,
  duration, and success/failure. Empty assistant messages are omitted; final Markdown stays complete.
  Long tool displays are bounded and labeled; original output remains in the provider session.
- Individually saved folder/tool grants display as Saved rules only. Trusted workspace and
  Auto-approve tools remain explicit broader choices. Changes apply immediately to the active chat,
  including a waiting tool; adding context still requires authorization for the new configuration.
- Both clients can change a chat's permission mode. The host checks the context and permission
  revision before applying it. Existing individual grants never become broader trust automatically.
- Provider execution time excludes time waiting for human input. Genuine questions remain interactive.
- Schedule model selection shares the New Chat catalog, including refresh and visibly unavailable
  saved models. Mac default-model settings use the same picker.
- Mac chat and details fill the remaining viewport and scroll independently. Narrow windows switch
  between Chat and Details. Scrolling upward retains the reading position while output arrives.
- Browser navigation has a deadline. Background agent tabs receive usable viewports; detailed
  Playwright errors reach the tool result instead of becoming a generic failure.

Still deferred:

- Background service, packaging/signing, independent concurrent execution, notifications.
- Standalone MCP connection/OAuth/input adapters and editor-specific agent hook and extension-tool mappings.
- Bitwarden extension compatibility and broader token-broker/Keychain bootstrap integrations.
- Automatic VS Code index, unsaved buffers, or existing chat-history transfer.
- Native session relocation or cross-provider conversation migration.

Operator paths, team rosters, private instructions, chat content, and workspace membership remain
in local configuration or their owning workflow sources, outside the app repository.

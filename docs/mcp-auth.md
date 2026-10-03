# MCP connection recovery

Copilot chats expose **MCP connections → Manage connections** in Mac chat details and **MCP
connections → Refresh MCP connections** on iOS. The list is scoped to the MCP servers selected
for that captured chat configuration. It shows connection state and bounded error details, never
the raw configuration or its credential headers. Refreshing status makes no model request.

Choose **Connect / sign in** to ask the Copilot runtime to start OAuth and open the authorization
page in the Mac's default browser. `/mcp auth <server>` in the chat composer performs the same
host command; it is not sent to the language model as ordinary text. Use the exact connection name,
or a captured MCP display name when it identifies one runtime server. Sign-in from iOS opens on
the Mac, because the provider's loopback callback listener runs there. Complete any account choice,
passkey, Okta or consent yourself. Then refresh connections, and continue or steer the chat to retry.

The official SDK owns OAuth registration, callback listener, token exchange, refresh and credential
storage. Proteus uses `session.rpc.mcp.oauth.login` and `mcp.list`. It does not request tokens from
the model, copy tokens into run files, or embed authorization URLs in transcript/history. Remote
login responses contain only the fact that the browser opened; URLs are not stored in the remote
command ledger. Login does not forcibly clear shared credentials or switch accounts.

An active chat reuses its session. Idle connection management cold-resumes the same provider
session with only its selected MCP configuration and without making a model turn. Opening another
chat's connections waits for any active chat to finish. Repository-owned/managed installs use the
runtime's exact installation receipt and prepare-login handle. Unsupported/local stdio servers
cannot use these remote OAuth controls.

Browser sign-in cookies and MCP OAuth tokens are separate. Logging into a website in a Proteus tab
alone does not authorize its MCP server. The sign-in button uses the external Mac browser for
compatibility with corporate account/passkey flows. Codex MCP OAuth UI and MCP elicitation/input
forms are follow-up work; the current Codex adapter requires its selected servers to be already
configured for that runtime. No success is inferred from merely opening the browser.

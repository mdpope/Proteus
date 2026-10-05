# MCP connection recovery

Claude chats can refresh connection status for their captured MCP selections. Proteus starts a
separate, tool-free Claude Code status process with only those servers in a private `0600` config
file and `--strict-mcp-config`; it does not inherit other user/project MCP definitions. The status
view distinguishes connected, pending, failed, and needs-auth. A Claude turn waits for its selected
connections to become connected and stops before sending chat content when a server fails or needs
sign-in. Tool permission requests still pass through Proteus for each operation.

Claude MCP sign-in is not offered inside Proteus yet. The installed CLI documents `claude mcp login
<name>`, but its help does not establish that Proteus can bind that command to an isolated selected
configuration. Sign in or repair the named server in Claude Code on the owning Mac, then refresh
its status in Proteus. No auth URL or credential is inferred from a `needs-auth` status. Selected
servers with restricted per-tool filters are rejected rather than running with wider permissions.
Selected stdio servers with a different source directory use a fixed Proteus launcher and the
captured directory, command, arguments and environment; no shell is involved. Codex MCP OAuth
remains separate follow-up work.

Copilot chats expose **MCP connections → Manage connections** in Mac chat details and **MCP
connections → Refresh MCP connections** on iOS. The list is scoped to the MCP servers selected
for that captured chat configuration. It shows connection state and bounded error details, never
the raw configuration or its credential headers. Refreshing status makes no model request.

Choose **Connect / sign in** to ask the Copilot runtime to start OAuth and open the authorization
page in the Mac's default browser. `/mcp auth <server>` in the chat composer performs the same
host command; it is not sent to the language model as ordinary text. Use the exact connection name,
or a captured MCP display name when it identifies one runtime server. Sign-in from iOS opens on
the Mac, because the provider's loopback callback listener runs there. Complete any account choice,
passkey, Okta or consent yourself. Status refreshes automatically every five seconds while the
connection view is open (for up to ten minutes). Continue or steer the chat to retry once connected.
The view shows persistent starting, browser-waiting, failure and completion messages; already
connected servers do not show a sign-in button. Manual refresh and explicit restart remain available.

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
alone does not authorize its MCP server. The Copilot sign-in button uses the external Mac browser for
compatibility with corporate account/passkey flows. Codex MCP OAuth UI and MCP elicitation/input
forms are follow-up work; the current Codex adapter requires its selected servers to be already
configured for that runtime. No success is inferred from merely opening the browser.

Mac packaging must preserve the official Copilot executable and native module signatures.
Re-signing them as Proteus or ad-hoc changes the caller identity used by provider Keychain items
and can cause repeated authorization prompts even when the login keychain itself is unlocked.
`package:mac` verifies the vendor requirement before packaging, excludes only those two verified
files from re-signing, and checks unchanged bytes/signatures afterward. Never fix this by clearing
the login keychain, widening item ACLs, or changing the operator's password.

Background connection checks keep sign-in controls usable and preserve unchanged rows. Restarting
sign-in renews the monitoring period; an earlier status response cannot overwrite its progress.

# Browser access without client coupling

Workflows should request observable actions: open an authenticated page, search a bounded date
window, read messages and replies, capture source links, and report missing coverage. They should
not name one desktop client's private browser function names.

Playwright MCP supports visible persistent browser profiles and connection to an existing browser
through its extension. The user can interact with that browser normally. A shared profile needs a
single owner so two scheduled runs do not fight over navigation or lock the profile. Signing in
is a user action; never extract or replay cookies or tokens to replace normal UI authentication.

The first Proteus browser tab is human-interactive only. It is a separate Electron WebContentsView,
with its own persistent session. It is not a generic iframe: sites do not need to allow embedding.
The app does not expose a global Electron debugging port to Playwright, because that could also
expose the privileged application UI.

For the first agent-connected integration, supply a Playwright MCP server in the schedule's
`mcpServers`, using an explicit persistent browser profile outside the source repository. Pin the
server version and verify a bounded real browser read before scheduling it. User/agent takeover
and brokered access to embedded tabs are a later milestone. Tool configuration is reusable across
providers that support MCP; embedded-tab control is a separate client capability.

Sources: [Playwright MCP profiles and extension](https://github.com/microsoft/playwright-mcp),
[Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view).

# MCP authentication and connection health

## Accounts & Integrations implementation — 0.2.8

Engine Room **Accounts & Integrations** replaces the old Integration profiles picker. It lists
chat-scoped MCP consumers with editable expected-account labels and any number of generic
resource contexts (tenant, subscription, organization or site). Private metadata is atomically
saved as mode 0600 application data; no token, raw config, auth URL or raw runtime error is stored.
Bindings hash the owning chat/session, provider, alias, selected config and context. Matching names
do not merge credentials or prove the same account. Label edits are revision checked.

The overview separates runtime connection, authentication evidence and resource access. It shows
observation time/source/scope, stale evidence, reported expiry (otherwise unknown), next check,
a bounded history and limited-probe recovery time. A weak connected observation does not clear
an unresolved needs-auth observation. Existing historical system messages are retained; the
MCP dialog now explains that runtime status is separate from account/resource verification and
shows each observation's time and active/resumed scope.

Every five minutes the owning Mac checks available live sessions. It does not cold-resume an
idle chat on a timer. Checks and the existing MCP dialog share a provider lock, which also holds
new scheduled turns; checks for another run defer while that provider could be disrupted. Recovery
waits until the engine is idle. Failed connections receive at most three automatic attempts per
consumer, with increasing delay. Manual check/recovery is explicit. No request is replayed.
Copilot supports a runtime OAuth probe and individual server restart when its SDK/runtime expose
them. Restart relies on runtime-owned cached credentials; it is not a general refresh-token API.
An accepted token probe is not independently verified identity or resource access. A needs-auth
result requires the supported sign-in action on the owning Mac. Claude currently offers runtime
status only; unavailable adapters expose no check/recovery action.

The website shows the same metadata read-only through the encrypted default-Mac connection.
Check and supported noninteractive recovery run on that Mac. The website does not receive
credential caches, edit profile labels, open sign-in or silently choose another Mac. The overview
refreshes when its default Mac connects; late results cannot replace a different Engine Room view.
Model-provider sign-in stays in Providers, device transport in Mac Connections, and Proteus
website identity in Proteus Account & Security (website Account & Security).

The `proteus_integrations` app tool exposes only consumers already selected for its chat. Agents
can list resource metadata and request verification. Selection is a capability-gated adapter
boundary: **no current adapter certifies isolated multi-account switching**. It fails explicitly
rather than changing global CLI defaults or shared tokens. Agents can use distinct selected MCP
servers and explicit resource IDs with their existing authorized tools. Labels do not create or
log in accounts. Independent identity/resource discovery, isolated CLI/browser/MCP profiles,
expiry-driven silent renewal, wake/pre-schedule checks, historical inline recovered annotations
and grouped notifications remain unimplemented. Physical/provider acceptance is separate from
synthetic tests. The proposal below retains these requirements rather than claiming completion.

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

## Proposed account health and reusable contexts — October 8

Status: BF-2026-10-08-04 is a queued design, not implemented or live-verified. Deployment remains
on hold. The operator confirmed that multiple separate identities can each access multiple
tenants/subscriptions. Neither domain names nor account counts belong in app logic. Private
account identifiers and service endpoints remain outside this repository.

### Why the current reports can disagree

Copilot's `session.mcp_server_status_changed` handler records a historical system message for
`needs-auth`/`failed`. A later `mcp.list` supplies the modal's current runtime state, with host
`needsAuthServers` taking precedence. Successful status does not annotate the earlier warning.
The adapter returns observation time and active/resumed-session scope; 0.2.8 displays them. The screenshots establish conflicting-looking reports, not a confirmed expired
token or proof that downstream access currently works.

Engine Room's **Integration profiles** currently selects one chat's MCP consumer and opens this
dialog. **Providers** handles model-provider accounts, **Connections** handles paired Macs, and
**Account & Security** handles the Proteus website account. None is a consolidated external-account
health monitor. Browser cookies, CLI caches, provider sessions and MCP OAuth grants are distinct
consumers even when they use the same human identity.

### Engine Room: Accounts & Integrations

Evolve Integration profiles into an overview with account rows expandable into consumers and
resource contexts. Include provider accounts, MCP services and supported CLI/browser profiles;
show unsupported adapters as unavailable rather than implying universal monitoring. Keep a
separate transport indicator for the owning Mac. Link chat warnings to their exact consumer.

Each row should show:

- Display label, expected identity and independently observed identity (or unverified).
- Owning Mac, adapter/provider and profile; tenant, subscription, organization or site as applicable.
- Connection state, authentication evidence and resource-access evidence as separate fields.
- Last check, last successful verification, observation source/session, and whether evidence is stale.
- Reported expiry, renewal capability, next check and last recovery outcome; use “not reported”
  when metadata is absent. Access-token expiry is not a guaranteed interactive sign-in deadline.
- Affected chats/schedules and a bounded, redacted recovery timeline; contextual Verify, Repair,
  Sign in or Select context actions according to adapter support.

A fresh transport-connected observation must not erase a stronger unresolved authentication or
resource failure. Resolve a warning only with sufficient newer evidence for the same binding and
failed operation scope. Preserve the historical event, adding “recovered at” when established;
otherwise say that the runtime reports connected but access remains unverified. An identity check
does not prove every resource or tool is authorized. Distinguish denied access, wrong identity,
offline, unknown/stale, recovering and interactive sign-in required using adapter evidence.

### Generic identities and agent-selectable contexts

Model identity, credential consumer and resource context separately. An identity has a stable
adapter-issued subject/home-tenant identity where available and a user-editable display label.
Each consumer references its owning Mac, provider/adapter, protected credential-store reference,
and exact endpoint/configuration or managed-installation identity. Resource contexts reference
the tenant/subscription/site/organization IDs actually discovered through that consumer. Do not
merge identities by email/domain, consumers by MCP alias, or grants across hosts/providers.

Agents should be able to list permitted contexts, select a stable context ID and verify its
readiness. Selection binds the identity, consumer and resource to the chat/tool invocation or
schedule; every call carries that explicit binding. A task that names an unambiguous authorized
context can select it without asking the user to sign in again. Ambiguity requires clarification;
an access failure must never cause an automatic switch to a more privileged or different identity.
Existing tool permissions and workspace boundaries still apply. Being signed in is not itself
authorization for every agent to use that account.

Reuse an already authenticated context through the adapter's supported cache/profile interface.
Do not switch global CLI defaults, overwrite shared MCP credentials or reuse an unrelated browser
profile to implement selection. Simultaneous identities require proven consumer isolation; where
an adapter only exposes one shared login, label that limitation and withhold isolated switching.
Browser contexts need independently retained profile/session storage if concurrent logins require
it. An existing portal login alone does not provision MCP or CLI credentials.

Pin context selection for in-flight operations. Changes apply at a safe boundary, invalidate old
health evidence and respect configuration/revision checks. Report the context used with results
without exposing credentials. Discover only authorized identity/resource metadata; store private
registry state in protected application data, with opaque credential references and provider-owned
secure storage. Remote clients receive authorized metadata, not token caches or auth URLs.

### Recovery and monitoring

Run bounded health work on the credential-owning host, independent of an open dialog. Coalesce
events and checks per consumer; check on network recovery/wake, before dependent scheduled work,
and near expiry when the adapter actually reports it. Use backoff/jitter, rate limits and a single
renewal in flight per shared credential store. Persist observation times and show stale/offline
state after a host goes away. Do not make model turns just to test authentication.

Use explicit, minimal read-only probes that can establish identity and the required resource
scope without reading business content. A tool list or successful connection handshake alone
does not certify resource access. Monitoring must not cold-resume a different chat through a
busy provider or interrupt its session; the current Copilot status path can cold-resume, so a
background service requires a safe adapter seam rather than polling every chat's existing route.

Ask the owning runtime/official auth library for silent token acquisition or renewal where
supported, then reconnect and verify. Keep rotating credentials in that library's protected
store. Do not scrape cookies/tokens or implement generic token copying. Do not force reauth,
clear a shared cache or open repeated browser windows as a background recovery strategy.
Connection recovery does not replay a potentially completed write. Workflow continuation must
use an explicit safe checkpoint or idempotent retry policy, with existing approval rules.

When silent restoration cannot satisfy MFA, consent, revocation or organizational policy, show
one actionable notification grouped by the affected credential consumer, linked to impacted work.
Open the supported sign-in flow on the correct Mac/profile when requested, reuse SSO where
supported, and verify completion. Retain external system-browser support for providers that need
it; never promise that embedded sign-in or advance renewal can eliminate all human interaction.

### Adapter evidence and delivery sequence

The installed Copilot SDK declares an experimental passive `mcp.oauth.probe`. Its `authenticated`
result means a probe was accepted with an OAuth-origin token attached; the SDK explicitly says it
does not prove the server required or independently validated that token. Treat this as limited
probe evidence, not verified identity/resource access. Its `authenticationStateChanged` API is a
notification after credentials change, not a general-purpose renewal function. Gate both by
runtime support and verify behavior before use. Existing login may accept cached credentials,
but it can also initiate interactive OAuth and must not be treated as a guaranteed silent check.

1. Reconcile warnings and current status; expose time, session scope and evidence strength.
2. Add the account/consumer/context registry and Engine Room overview, initially reflecting
   existing supported consumers. Add authorized context discovery/selection only for adapters
   that can bind and isolate it correctly.
3. Add adapter-specific silent restoration and secure profile support, followed by background
   readiness checks and grouped notifications. Treat each adapter's support as independently
   implemented/verified; previous credential-isolation deferrals are reopened for design only.

Acceptance must cover stale warnings versus live failures; identical aliases on different hosts;
multiple identities with overlapping tenants; wrong-account detection; concurrent context use;
expired/revoked credentials; missing expiry; denied resource access; locked credential stores;
wake/network flaps; unsupported runtimes; active-chat preservation; and no duplicate mutation
after recovery. Test with synthetic identities and disposable stores. Live checks must separately
confirm actual identity, resource access and profile isolation before calling an adapter verified.

Official references for the design: [Microsoft refresh-token renewal and revocation](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens),
[Microsoft silent token acquisition](https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests),
[Conditional Access session policy](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-session-lifetime),
and [Atlassian MCP OAuth configuration](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-oauth-2-1/).

## Proteus tab management MCP — October 14

Internal desktop chat providers register `proteus_tabs` automatically. External local agents can
start the trusted stdio adapter with Node and the installed application's
`Contents/Resources/app/src/proteus-mcp.cjs`, or the corresponding source entry point. Optional
`PROTEUS_HOME` selects a different explicitly authorized data home. The adapter reads the private
loopback service connection itself; put no bearer token into MCP configuration or a prompt.
It requires the running owning service and does not expose a network MCP port.

`list` accepts scope/id/type and offset/limit (100 by default, up to 200). Follow `nextOffset` until
null for a complete inventory. Records expose placement, known timestamps, icon/URL, profile and
resource state when available. Unknown dates remain unknown. Mutations use the returned revisions.
Use `move-chat` for membership, `archive`/`unarchive` for lifecycle, and `close` for navigation.
Remote clients use the same authenticated service protocol and existing owner resource/document
grants. Metadata access does not grant browser contents, terminal input or protected file reads.
Default `proteus_playwright` and optional `proteus_developer` target one embedded page through a
private scoped CDP bridge. Developer mode needs a separate explicit per-tab grant. The developer
backend starts only on demand; the human inspector hands off the debugger until it closes.

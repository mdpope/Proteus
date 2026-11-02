# Integrations: inventory, machine availability and connection evidence

## Nov 1 local candidate — background work and durability

Background health inventories runs once and skips absent sessions before resolving selections
or hashing context. Checks revalidate the current run/session/provider/configuration before
effects and after provider awaits; bounded batches yield to the owner event loop. Manual and
agent inventories retain their response contracts and scope checks.

Background registry writes use asynchronous fsync and atomic replacement, including bounded
asynchronous Windows sharing-violation retries. A concurrent manual save joins the same ordered
snapshot queue and its API response awaits durability. With no async writer active, manual-only
writes retain immediate durability. Close drains queued writes and reports an outstanding error;
replacement failure retains the previous file. This avoids input stalls from synchronous fsync
without weakening permissions, ordering or replacement guarantees. Wider rollout and affected-HC
five-minute-interval observation remain held; see the [release plan](2026-11-01-release-plan.md).

October 21 implementation, BF-2026-10-21-87. The operator authorized implementation,
build and update, choosing informational Other computers views. Source now groups discovered
MCP configurations by source identity/revision with separately preserved consumer records,
search/pagination, global favorites and explicit source refresh. Owner status appears in source
pickers; peer and native inspection is read-only. Snapshot refresh never logs into a vault.
Supported existing session check/login/recovery paths remain available on the owning desktop.
Generic pre-chat auth setup, cross-provider credential brokerage and automatic hcos receipt
collection are not implemented: source-owned auth remains with the source/chat. The following
analysis records the desired longer-term model and its limits; it does not claim those deferred
capabilities exist. The selected-chat agent tool continues exposing only that chat's consumers.

## Current behavior and the reported mismatch

`IntegrationHealth.enumerateConsumers` enumerates existing engine runs and asks
that run's provider for its selected MCP configuration (falling back to the
schedule's MCP definitions). Selected configuration may combine captured source
selections with allowed legacy schedule configuration. Source Library discovers
MCP definitions in configured source locations; registration alone is not selection,
a successful connection, an authenticated account or verified resource access.

The Accounts & Integrations page currently renders every consumer as a full card.
Identity includes run, provider session, provider, server, configuration and context.
Recurring scheduled runs can consequently generate hundreds of near-identical cards.
Those identities are intentionally separate: equal names do not prove shared accounts.

Refresh overview reads the current consumer snapshot. It neither rescans source
folders nor performs a fresh connection test. A local empty consumer list therefore
does not mean the Source Library has no MCP definitions. Build Mac's empty list
was confirmed through its owner API. HC's large list is screenshot evidence, consistent
with the enumerator; HC's live registry has not been independently inspected.
Passive checks use eligible existing sessions; old/inactive observations can remain stale.
The current agent `proteus_integrations` tool lists/verifies selected consumers and
supports resource-context selection only where the provider can isolate it.

## Proposed presentation

Start with a searchable compact inventory of registered MCP sources, including sources
not yet selected by any chat. Show origin (source file/registered folder or explicit
schedule configuration), computer, provider availability, and a short status. Keep
credentials and raw secret-bearing configuration out of the overview.

Group repeated uses by actual source/configuration and owner for presentation, with
an expandable chat/session count. Keep distinct account/context and per-session
verification evidence underneath; do not collapse credential ownership into a label.
Offer filters for computer, provider, needs attention, unchecked and selected in this chat.
Only expand history and detailed diagnostics when requested; paginate large inventories.

Use explicit states: discovered, configured on this computer, selected in this chat,
connected, account verified (only with evidence), and resource access verified (with
scope/time). Connection success alone must not produce an all-purpose Ready badge.
Show offline, stale, unsupported and unknown honestly, with owner and last-check time.

Separate Rescan sources from Refresh connection status. Make sign-in, verification and
selection actions explain what they do and which computer owns them. Avoid generic
recovery buttons when no supported recovery action exists.

A current-computer view with an Other computers option is the initial recommendation,
not an accepted operator decision. A combined view is useful for finding where a tool
can run, but may add noise when working locally. Both views use the same owner records.
Viewing remote availability does not transfer credentials, enable local execution or
make a local agent able to invoke a remote MCP server. Execution requires the appropriate
owner-side chat/approved routing and actual backend capability. Offline owners retain
clearly dated cached observations; one failed owner must not blank the whole page.

## Agent use

Expose the same safe inventory boundary to UI and agents: discover relevant sources
and capabilities, identify owning computer/provider, distinguish available from selected,
then request selection through ordinary context/permission handling. Verify the selected
connection on its owner and invoke its native tools with existing approvals. Preserve
saved rules, captured chat context and resource scoping. Discovery does not itself grant
access, start arbitrary helpers, share Keychain state or silently switch accounts.

Acceptance should cover zero chats with configured sources, hundreds of repeated runs,
different accounts behind the same alias, local/remote/offline owners, changed source files,
unsupported provider capabilities, a discovered-but-unselected tool and scoped verified
resource access. Actual account identity and usable operations require live evidence.

## October 21 refinement: make the page useful before a chat starts

The operator wants a configuration-centered MCP setup and maintenance page, with one
primary item per discovered source definition, not a task history view. Name it MCP
Connections provisionally. Preserve source file/server-key identity, definition revision,
owner and explicit account/auth binding; identical display aliases are not identity.
Deduplicate actual source aliases while retaining origin information. A changed definition
must invalidate affected observations without silently binding another account.

The primary questions are: What integrations are available? Which need attention? Can I
prepare authentication before a chat? Can this workspace/chat use this configuration now?
Show the same owner-backed statuses in workspace and chat source pickers. Global favorites
are shortcuts; per-workspace default/available/off choices remain separate. A favorite
never starts a helper or enables tools. Off prevents connection/use from that scope, but
does not log out unrelated authorized consumers or erase a reusable credential cache.

Suggested row vocabulary: Available, Off here, Sign-in needed, Saved login available,
Checking, Connected for this chat, Connection failed, Access denied, Unsupported and
Unknown. Show useful account/site labels only with their verification status and time.
A valid login with no open connection is normal. A successful MCP handshake or tools/list
can coexist with missing downstream API access; never label that overall health verified.

Offer explicit setup/check/connect/reconnect actions before the first model turn. Such
preparation may use a bounded provider-owned setup connection and persist only supported
auth state/evidence, or keep an explicitly managed warm connection where supported. Later
chat attachment must use that same supported credential owner and revalidate relevant
capabilities; an unrelated test client's successful login is not proof the chat can reuse it.
Do not create fake model turns/chats or keep hundreds of idle runtime sessions just to
populate this page. Unsupported adapters should state the actual limitation.

Reusable authorization and a live connection are separate lifecycles. Same computer,
configuration, account, authorization issuer/audience/scopes and compatible credential
owner can allow separate chat connections to reuse saved login. A source folder being
not-Off makes it eligible; it does not select every server into every chat. Distinct provider
credential stores may need independent login or a deliberate supported broker/adapter.
Sharing one live connection additionally requires supported multiplexing and attribution
for tool calls, requests, cancellation and permissions. Neither is automatic across Macs.

Current source evidence: Copilot has selected-chat status, supported HTTP OAuth login,
auth probing and individual-server reconnect paths. Claude exposes selected-server status.
The Codex adapter does not currently expose the same IntegrationHealth status/login methods;
this does not establish a native Codex protocol limitation. The current page therefore cannot
promise uniform pre-chat preparation across providers. These are implementation gaps to
address in the proposed design, not user setup failures.

## External token storage and generic host support

Token storage/retrieval can remain in the source repository's connector/launcher if its
configured launch actually obtains and supplies the right credential on the owning computer.
A compatible launcher or server can let multiple authorized clients reuse a saved token
without Proteus handling its value. A standalone shell/login setup does not guarantee a
GUI-launched provider sees the same environment, vault session or credential cache.

Proteus currently resolves standard MCP command/args/env and HTTP headers with environment
references; unknown input placeholders require an adapter. Its existing Bitwarden website
credential broker is not a generic MCP token resolver. It should not be represented as
already providing this integration merely because it can access Bitwarden login items.

A generic host contract could expose non-secret authentication state, credential-source
labels, supported setup/refresh/check operations and structured actionable errors. That lets
external integrations own their account-specific login/token logic while Proteus provides
consistent UI and agent diagnostics. Only add host-side secret-provider resolution if the
chosen configuration format actually needs it; avoid a hard-coded one-connector token flow.
Never send token values through model-visible tool output or persist them in source catalogs.

Earlier inspection preceded the external repository update and therefore did not include
the new Bitwarden implementation. The authorized pull and source findings below supersede
that evidence gap. Live credential state and actual authentication remain unverified.

Protocol reference: [MCP HTTP authorization and stdio distinction](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).
Use the actual negotiated runtime version and its supported auth features when implementing;
this reference does not establish what every installed provider can do. Downstream service
authentication may be implemented by a connector independently of MCP transport authorization.

## Latest external source verified: keep auth ownership, add status reporting

At the operator's request, pulled the clean hcos main checkout fast-forward from bf8c65a
to 652874d. Reviewed its credential-store/tool-access contracts, hcos_vault.py,
hcos_oauth.py, generated MCP definitions and helper tests. All 11 existing mocked OAuth/vault
tests passed; no actual vault read/unlock, token refresh, login or MCP operation was executed.
This was a source update/review, not deployment or proof of working live credentials.

Confirmed implementation:
- Isolated vault CLI state and machine-local Keychain bootstrap; organization/collection
  validation; durable OAuth state stored in a vault item.
- access_token loads state, renews an access token and persists a rotated refresh token
  before returning it. Missing/rejected refresh credentials produce REAUTH_REQUIRED/exit 3.
- login supplies a browser authorization URL and localhost callback flow. call/jira-status
  directly open their own MCP connection; exec hands a token to a child environment.
- status reads vault-backed state and reports stored/absent only. It opens/closes the vault;
  it is not a no-I/O cached health read and does not prove renewal or service access.
- Generated Atlassian entries in .mcp.json, .vscode/mcp.json and the canonical integration
  descriptor remain ordinary HTTP definitions with no helper/credential reference. Native
  provider connections therefore cannot be assumed to consume the helper's authorization.

Recommendation: chats and source-owned helpers can continue to handle authorized login and
renewal. Proteus owns configuration inventory, capability-aware UI actions and non-secret
health observations. Introduce an explicit source-bound health adapter or structured operation
receipt, rather than inferring connectivity from prose or watching token storage. Receipts bind
the source/config revision, owning computer, actual execution path (external helper or named
native provider), verified account/resource when available, check time, result, next supported
action and expiry only when known. Validate the adapter and apply normal execution permissions;
a discovered file cannot silently grant arbitrary setup/repair command execution.

Expose separate evidence for credential stored, renewal accepted, MCP handshake/tools available,
and requested resource operation succeeded. Native chat attachment needs its own proof when it
uses another execution/auth path. External helper success must never turn a broken native MCP
connection green. Tool-level error results must be checked; process exit or a tools/list response
alone cannot certify the requested workflow. Keep exact account identity unverified until returned
by appropriate evidence, not inferred from the vault item's display label.

Prefer recording sanitized outcomes of actual chat checks/auth operations and showing their age.
Do not repeatedly unlock the vault or rotate tokens just because a UI rerenders. Explicit checks
can call a declared bounded read-only probe through the actual execution path. A structured safe
status/receipt interface is missing from the inspected helper; adding it would improve integration
without moving vault ownership or copying tokens into Proteus.

Before concurrent use, address refresh/load/save serialization. The contract calls for serial
vault commands, but the inspected helper does not lock the whole read/refresh/rotated-state-write
transaction. Several chats, background probes or independently bootstrapped computers sharing
one rotating refresh credential could race. A per-credential owner/coordination strategy is needed;
a local lock alone does not serialize other computers. This is a source-level risk, not a reproduced
live failure. Passive observation avoids adding another competing renewal loop.

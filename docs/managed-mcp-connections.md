## Atlassian sign-in startup diagnostic correction

Installed candidate 1's generic owner-review message is not a human-click restriction. Native
owner UI routes to the local controller, but its startup catch discarded discovery, registration,
loopback and browser-opening failures. Work Mac's existing next-action status confirms that catch
was reached; the original cause remains unknown. Do not repeat sign-in as an owner-routing fix.

Source now preserves fixed stage/error codes and bounded HTTP status in the UI error and owner
status, excluding OAuth bodies, credentials and authorization URLs. Regression fixtures cover
discovery/registration/browser failures, released loopback flows and exactly one attempted start.
No automatic registration retry, changed grants, new credential endpoint or authentication bypass
is introduced. This diagnostic correction does not yet establish or fix the underlying vendor
failure; a new accepted Mac candidate and one deliberate owner attempt remain necessary.

## Installed authv2 setup: discovery and evidence limits

The protected-resource discovery document is
`https://mcp.atlassian.com/.well-known/oauth-protected-resource/v1/mcp/authv2`.
Its `resource` and sole `authorization_servers` entry must match the pinned profile in
`managed-atlassian-oauth.js`; the SDK also validates the authorization-server metadata.
The November 6 public check advertised `read:me`, `read:account`, `read:jira-work`,
`offline_access` and `email`, alongside unrelated write/Confluence/Compass scopes.
This is availability evidence, not an approved grant or a per-tool minimum. Neither discovery
document maps individual MCP tools to required scopes. A minimal identity/resources/Jira grant
remains unqualified until documented or tested with owner-approved consent. Do not copy a legacy
grant, request every advertised scope or treat an empty scope array as a narrow default.

The definition uses `expected.scopes`, an explicit array of distinct strings. The owner enters
approved values one per line in Engine Room → Accounts & Integrations → Managed connections.
Configure exact workspace/account/site and approved minimal probes, save, then separately Sign in.
Verify identity/site, separate issue read and bounded search before retiring legacy helpers.
No additional scope is silently approved by source selection or successful tools/list.

The installed agent surface has no create/save/sign-in action. The UI uses its authenticated
`/api/managed-connections` boundary and fresh `expectedRevision`; that internal route is not a
standalone agent CLI or authority to extract session credentials. Owner UI setup is the current
reviewable path. No new credential endpoint is required by this clarification.

# Managed MCP connections — Nov 5

Status: implementation in progress. Registry, encrypted credential persistence, renewal, shared
transport/health, run-scoped stdio bridge and Codex/Copilot attachment are source-tested. The
HTTP transport uses the official MCP SDK with host-only credential injection. Production owner
composition, qualified connector authentication/setup, maintenance, UI and installed acceptance
remain required. Do not migrate a workflow based on this document alone.

## Ownership and portable contract

Proteus owns versioned connection definitions, endpoint/package selection, credential adapters,
authenticated transport, renewal, health and provider attachment. Workflows own logical connection
requirements, semantic capabilities, account/resource constraints, queries, evidence policy and
business-operation authority. The proposed initial logical bindings are hc-ado-corporate and
hc-atlassian. Publish the final supported reference schema before the workflow changes. These
names do not create installed connections. Slack remains browser-only; future servers use the same
extensible adapter contract only when explicitly configured.

A connection has an immutable ID and editable label, an owner, explicit workspace visibility,
an exact configuration revision, approved health probes and expected identity/resource binding.
Capture that revision for a run. Later edits cannot silently retarget it. Renaming/removal checks
dependent references; disabling stops new use without deleting credentials or unrelated sessions.

The registry admits HTTP endpoints without embedded credentials/query strings, or an exact
package/version/SHA-512 identity. Adapter-specific configuration remains a separate validated
owner boundary; arbitrary commands, headers and tokens are not registry fields. Credential
references are opaque. The current foundation API is internal, not yet a supported agent schema.

## Authenticated provider path

Both Codex and Copilot must attach to the actual host-managed transport with request attribution,
timeouts, cancellation and per-run permission checks. Do not count a successful separate helper
as native-provider readiness. A connection may share authentication without sharing chat authority,
context or tools. Only selected approved bindings connect. Use actual connected catalog annotations
for read-only grants; unknown or write tools remain protected. Auth never approves pending requests.

Safe reads may receive one bounded permitted renewal/retry. Never replay uncertain mutations.
Validate endpoint, issuer, client, account, tenant, audience and resource; reject unexpected redirects
rather than forwarding authorization. Connector network access is host-controlled and does not
widen a model sandbox.

## Credential lifecycle

Default to platform-protected storage; optional Bitwarden remains an adapter, not a dependency.
The Electron protected-storage backend must be available; Linux basic_text is rejected. Durable
credentials are encrypted at rest and short-lived access tokens remain in memory. No get-token
tool, secret export, model prompt, command argument or ordinary JSON may expose credentials.

Owner UI or supported provider OAuth handles initial consent and MFA. Preserve existing working
credentials during deliberate local adoption or new consent, and verify the new route before
retiring old helpers. No secret is transferred to the builder. No arbitrary rotation, global CLI
login switch, new PAT or service-principal fallback is authorized by migration.

Serialize rotation by credential reference and bind cache entries to the complete identity/audience.
The foundation records renewal uncertainty durably before contacting the provider, persists the
rotated credential before releasing a new access token, and refuses a stale grant after a crash
or persistence failure. Actual adapters must distinguish provably unattempted network failures from
uncertain rotation and implement bounded recovery accordingly. Only same-owner credentials are
accepted; cross-machine reuse requires a separately designed single-writer path or independent grants.

## Connector qualification

ADO: qualify an exact official package and documented auth mode. Verify corporate principal/tenant,
organization and required project/team/work-item read/search through that managed path. Merely
setting AZURE_CONFIG_DIR is insufficient. Inspection of official 2.11.0 confirms azcli exists but
uses ChainedTokenCredential with DefaultAzureCredential fallback; that mode alone does not satisfy
the no-fallback account-isolation requirement. Qualify a strictly bound host token adapter or
another supported mode before choosing the final launch contract. No installed credential changes
have been made by this inspection.

Atlassian: qualify the endpoint/client/audience explicitly. The two observed native/helper paths
are not presumed equivalent. Preserve the working route until handshake, corporate principal/site,
actual issue read and scoped search pass. Reuse access tokens with expiry-aware renewal. Jira
readiness does not imply Confluence readiness and must not broaden consent scopes.

## Health, UI and agent control

Expose configured, store availability, authentication/identity, transport, capability, resource
access and effective permission separately, with evidence time/source and last successful read.
Represent stale, offline, rate-limited, store-locked, sign-in/consent-required, access-denied and
configuration-mismatch states honestly. Tools/list is not successful business data access.

Perform bounded host checks without model turns: coalesce checks before schedules, on wake/network
recovery and on relevant failures. Proposed defaults are five-minute schedule lead time and
fifteen-minute lightweight checks while needed, configurable with provider limits/backoff.
Renew near actual expiry with jitter, not blindly on every check. Respect Retry-After and cooldowns.
Deduplicate human notifications; no background login-window or registration storms.

A failed optional connection leaves independent work runnable. Emit sanitized recovery generations
for gap reconciliation; do not start model runs on recovery without an explicit schedule policy.

Reuse Engine Room integration surfaces for add/configure, verify, connect/reconnect, owner sign-in,
disable/remove and dependent-reference visibility. Show expected versus observed account/site,
status evidence/freshness and next action. UI and supported agent discovery/readiness/repair APIs
use the same revision-checked service. Destructive credential revocation stays separate.

## Workflow migration and acceptance

Publish the supported named-connection/capability schema, then organization workflows updates its canonical exports.
Reconcile three source-owned schedules through actual catalog rescan, fresh expected revision,
pinned manifest/export hashes and preview digest. Preserve enabled state/history and unrelated
settings. Retain rollback references; remove competing production auth only after verification.

organization workflows records independent Slack/Jira/ADO gaps and continues other work. Recovery fills only missing
or changed evidence using stable IDs/cursors, dates and incorporated versions, reconciling by
occurrence time, reliability and field authority. No new evidence must not replay old normalization.
Slack independently uses bounded same-tab reload and exact query/thread anchors.

Required source/native acceptance includes concurrent renewal, durable rotated-token persistence,
crash/error recovery, expired/revoked/locked/wrong-account behavior, owner/account/audience isolation,
secret redaction, per-chat policy, uncertain mutations, outages/rate limits/process death/wake,
verified supported connector modes, preserving migration and unsupported-store states, and UI/API
agreement with actual evidence.

Installed HC acceptance requires actual Codex managed-path reads first, Copilot readiness,
inbox/planning/digest-project-sync on appropriate refreshed Sol/Terra selections without routine
startup/auth prompts after necessary setup, independently checked outputs, a no-new-evidence
second run, and an unavailable-then-restored connector without duplicate or stale overwrites.
Test Slack resume separately. Existing unanswered approval and failed-create fixtures remain
untouched; only supported duplicate-safe recapture may recover an owner-proven unsent create.

## Release delivery

Build on the designated Mac, publish an accepted signed artifact with source/build identity,
target, manifest digest, validation receipts and migration/rollback notes. HC consumes those exact
bytes through a separate purpose:update coordinator; it does not build. Notify its workflow owner
when schema is stable and when the candidate is installable. Source tests, synthetic probes and
model completion never constitute installed/workflow acceptance.


## Provider bridge source checkpoint

Portable schedule requirements have the shape `managedConnections: [{name, capabilities, required}]`.
Names are lowercase logical identifiers; capabilities are explicit semantic IDs; required is a
boolean. The host captures connection ID, owner/workspace and configuration revision before the
turn. These pins participate in permission identity. A new turn after configuration changes retains
the earlier pins in history. Missing optional bindings and failed optional readiness leave independent
work runnable with an explicit gap notice. Required failures stop before model execution.

Each provider receives an ephemeral stdio bridge to an owner loopback endpoint. Its capability is
run-scoped and never an upstream OAuth token. The owner provides the actual connected catalog and
checks current permission on every invocation. Native duplicate approval forwarding applies only
to that bridge; unknown/write operations still require their existing exact rule or human approval
at the owner. Native Codex delegated threads are rejected for this route until they have separate
captured leases. A competing native definition with the same name fails migration explicitly.

Shared checks and transports survive one waiter's cancellation. Reconnecting a read retires a
transport only after other in-flight operations settle. Only catalog-annotated idempotent reads can
retry once after an authentication/session failure. The official HTTP transport has automatic
OAuth/consent and SSE reconnect disabled, strict endpoint/redirect checks and bounded bodies.
No mutation is automatically resent. Tools/list alone never marks account/resource access ready.

Public unauthenticated qualification on November 5 confirms `/v1/mcp` challenges under the legacy
`https://mcp.atlassian.com` issuer (`/v1/token`). `/v1/mcp/authv2` advertises a different issuer under
`https://auth.atlassian.com`, its exact resource URL, PKCE S256 and public-client registration.
This is discovery evidence, not authenticated compatibility or permission to transfer credentials.
The workflow owner confirms its old helper omits explicit audience/resource parameters, its actual
Jira lookup used `searchJiraIssuesUsingJql`, separate `getJiraIssue` acceptance remains unverified,
and server read-only/idempotent annotations were not recorded. Existing corporate CLI cache
protection is unknown. Preserve both working auth paths until replacement verification; do not
adopt that cache on an assumption of protected storage.

Validation: 1,583 Node tests pass, four skip, zero fail; static checks pass. New tests include a
real SDK stdio consumer through the owner bridge, both provider configuration seams, optional
outages, captured permission changes, cancellation isolation and uncertain-write non-replay.
These remain synthetic source tests, not native provider/vendor authorization or installed success.


## Atlassian owner path implemented (source acceptance)

The first owner adapter is `atlassian-oauth-v2`. It pins the publicly qualified resource
`https://mcp.atlassian.com/v1/mcp/authv2`, its distinct authorization server and its documented
public-client PKCE registration/exchange/refresh endpoints. The SDK discovery path succeeded
against public metadata without credentials or registration. This is endpoint qualification,
not authenticated Jira acceptance. The legacy `/v1/mcp` credentials are never imported implicitly.

Engine Room → Accounts & Integrations now has Managed connections. Configure the exact account
ID, cloud/site ID, site URL, authorized workspaces, approved OAuth scopes and minimal health
probes, then explicitly Sign in. Consent opens through the configured host browser boundary.
The loopback callback checks the exact local host/path, random state and single code delivery.
A locked or unsupported protected store fails before registration. Refresh credentials persist
in protected quarantine before actual account/site verification; tokens remain in memory and
are issued only after the verified credential is durable. Initial consent tokens are reused
without an immediate refresh. The installed owner lock and unique per-connection credential
references prevent concurrent writers inside this owner; grants are never shared across machines.

Supported semantic capabilities are `atlassian.resources.read`, `atlassian.identity.read`,
`jira.issue.read` and `jira.issue.search`. Jira health probes use an owner-approved exact issue key
or ID, never an unrestricted business query: `jira-issue` proves a distinct `getJiraIssue` call;
`jira-search` searches only that issue with one-result maximum. The actual connected input schema
is validated before sending any probe. Empty search success does not count as item-read proof.
Server annotations are preserved, not invented; explicit owner health probes do not authorize
model tool calls. Confluence is not claimed by this adapter.

The concrete owner definition schema is [managed-connection.schema.json](../schemas/managed-connection.schema.json).
`proteus_integrations schema` returns it; `list` adds only this chat's selected managed connections,
actual captured revision and effective connection permission. `verify`/`repair` use `connectionId`
and that `expectedRevision`; neither signs in, broadens authority nor approves pending requests.
Owner configuration uses the same service through `/api/managed-connections` with registry revision
checks. Live leases protect edits/disable/removal; dependent references protect names/removal.
Credentials are not deleted or revoked by removing a definition.

Portable requirements remain `managedConnections: [{name, capabilities, required}]`. Chats have
an explicit captured workspace. Standalone schedules additionally set `managedConnectionWorkspaceId`
to a workspace in their captured `sourceWorkspaces` (declared through `workspaceSources`). Folder
paths do not establish account identity; no default workspace/account fallback is used. Chat create
and schedule read/update/preflight expose these fields. Remote create requires the explicit
`chat.managed-connections.v1` owner capability; older owners fail before delivery. Existing-run
send/reply cannot retarget bindings. Source recapture preserves the original connection selection.
Preflight reports cached readiness without triggering consent or network probes. ADO qualification
against the corporate account remains outstanding; the ADO source contract is documented below.

The host performs coalesced checks for active leases and near-term enabled schedules, without
model turns, and wakes maintenance after system resume. Persisted health retains last successful
read and recovery generations; transport/authentication are rechecked after restart. Optional
connection failure still allows independent work through the existing run bridge. Recovery does
not create model runs. Corrupt health evidence is not overwritten silently.

Validation: 1,609 tests pass, four skip, zero fail; static checks pass. Disposable Electron acceptance
covers configuration, explicit account/workspace fields, separate Jira probes, stale-edit draft
preservation and disable/removal. Actual workstation.example.test consent, native-provider data reads, workflow outputs,
second no-new-evidence run and outage reconciliation remain required after signed installation.

## ADO owner implementation and migration contract

The logical names `hc-atlassian` and `hc-ado-corporate` are the initial HC contract names, resolved
only inside the explicit owning computer/workspace. They are not preinstalled connection IDs.
Each local configuration receives an immutable ID and its own opaque credential reference.

ADO uses `ado-entra-public-client`, MSAL Node 7.2.0 and the pinned `@azure-devops/mcp` 2.11.0
server in its supported `--authentication envvar` mode. The package's `azcli` mode includes a
fallback credential chain and is not used. There is no PAT, hosting-account or developer-client
fallback. Native Codex/Copilot receive the existing per-run managed broker, not this upstream
process or its credential. The owner injects the short-lived bearer token only into the dedicated
child environment, with no secret argv, logs, prompt fields or model token tool.

The definition schema adds these nonsecret ADO fields:

- `authentication.clientId`: organization-approved Entra public application ID.
- `expected.principal`: corporate Entra object ID; `expected.tenant`: corporate tenant ID.
- `expected.organizationId`: the Azure DevOps organization instance ID.
- `expected.resource`: exact `https://dev.azure.com/ORGANIZATION` without a trailing slash.
- `expected.audience`: `d5fd9cb2-1853-528c-aa4c-2dd4a86fb2a1`.
- `expected.scopes`: exactly `['d5fd9cb2-1853-528c-aa4c-2dd4a86fb2a1/.default']`.
- `transport`: the exact package/version/SHA-512 tuple returned by the owner adapter catalog.

The application registration needs delegated Azure DevOps `user_impersonation`, an approved
native `http://localhost` redirect, and any required owner/admin consent. The SDK's default
Azure development client is deliberately not selected. The workflow owner's current records do
not establish an approved registration, so identifying/approving one remains a live-acceptance
prerequisite. No application registration or service scope was changed by source implementation.
Existing Azure CLI sessions and old organization workflows authentication remain untouched.

MSAL performs PKCE/token protocol operations through its supported interfaces. The bounded owner
loopback receiver uses the configured browser-opening boundary, exact state/nonce and a ten-minute
limit. The SDK cache is encrypted through the platform protected store. Writes mark refresh intent,
then persist the replacement cache before verifying account/organization and releasing a token.
Uncertain rotation is quarantined; a definitive token-service 429 preserves the prior grant and
reports Retry-After. Twenty concurrent consumers share one renewal. One owner is the only writer;
these credentials are neither exported nor shared between Macs. A locked/unsupported store fails
closed. Initial consent, OS authorization and corporate application approval remain human boundaries.

Supported ADO health capabilities and exact probe inputs are:

| Capability / probe ID | Actual MCP operation | `parameters` |
| --- | --- | --- |
| `ado.projects.read` | `core_list_projects`, one entry maximum | `{}` |
| `ado.teams.read` | `work`, `get_team_settings` for the exact team | `{projectId, teamId}` (GUIDs) |
| `ado.work-items.read` | `wit_work_item`, `get`, ID field only | `{projectId, workItemId}` (GUID / positive integer) |
| `ado.work-items.query` | `wit_query`, WIQL restricted to that item, top one | `{projectId, workItemId}` |

Every required capability has its matching approved probe. These are explicit owner health reads;
they do not authorize model tool calls. A valid empty query proves query access, not item-read
success. Full-text `search_workitem` remains in the actual server catalog but is not claimed by the
WIQL health capability. Actual tool input schemas and read-only/idempotent annotations are checked
before probes. Versioned server text delimiters are parsed as data, never instructions.

The upstream child confines credential-bearing HTTP to the configured organization on
`dev.azure.com`, `vssps.dev.azure.com` and `almsearch.dev.azure.com`; unrelated/legacy hosts fail
closed. Arguments have byte, depth, string and collection bounds before upstream validation.
Expired sessions are retired before new calls without closing other in-flight requests. An actual
401 invalidates the cached token; only the existing bounded annotated-idempotent read retry may
reconnect. Unknown or mutating calls are never automatically replayed. Upstream error bodies and
stderr do not reach model feedback.

The Connections panel exposes both adapters and preserves draft edits on revision conflicts.
Owner APIs, schedule selection and agent inspection use the same registry/runtime. Configuration
and removal are blocked while a captured run or owner consent flow is using the connection.

Source validation: 1,627 tests pass, four skip, zero fail; static checks pass. The real pinned MSAL
SDK passes synthetic PKCE/cache/renewal protocol tests. The real ADO package initializes in a
separate process and returns its annotated catalog with a synthetic token and no account/data
calls. Disposable Electron acceptance covers both configuration forms. These are source/native
fixture results, not authenticated corporate reads, a signed package or organization workflows workflow acceptance.

### Dependency qualification still required before release freeze

The lockfile pins patched MSAL 7.2.0, MCP SDK 1.32.2, compatible Zod 4.6.7 consumers and the
Undici 7.30.1 download dependency. The actual ADO package passes catalog qualification with those
overrides. Its separate Zod 3 compatibility dependency still has GHSA-mrhx-c7xc-m3w5; the owner
bounds argument trees before its parser, but that is a mitigation, not an upstream package fix.
Review the remaining advisory before freeze; do not silently substitute an incompatible major
parser or claim a clean audit. The existing Electron 44.5.1 certificate advisory
GHSA-jr5w-w6x2-84p9 also remains a release dependency task. No broad automatic audit fix was run.

## Optional connections and identity-only capture

An exported `workspaceSources:[{workspaceId:"OWNER_LOCAL_WORKSPACE_ID",categories:[]}]`
captures only the existing workspace identity, name and configuration revision. It does not
resolve that workspace's default source selections or import folders, permissions or MCPs.
Base source selections and explicit execution permissions remain independently effective.

`required:false` permits missing bindings/capabilities, declined connection access and unready
or thrown/timed-out readiness checks to leave a persisted gap while independent work proceeds.
It does not waive connection permissions, explicit workspace validity, cancellation or provider
compatibility. Only ready connections enter the native catalog. Integration `list` returns
`runReadiness` for selected requirements, including name, requested capabilities, required flag
and captured state; distinguish this run evidence from current connection health. Required
failures still stop preparation. No live workflow acceptance is implied.

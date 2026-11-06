# Managed MCP connections — Nov 5

Status: implementation in progress. The registry, encrypted credential persistence and renewal
coordinator are source foundations, not an installed connection manager. Provider brokerage,
initial connector qualification, owner configuration UI, schedule integration and live acceptance
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

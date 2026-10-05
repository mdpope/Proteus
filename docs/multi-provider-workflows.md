# Multi-provider workflows — proposed design

Status: design only; explicitly deferred from the October 4 parity implementation. The installed app runs each chat on one provider and serializes AI turns.
This document does not enable delegation, add provider permissions, or change any workflow owner.

## Product model

A workflow owns a coordinator conversation and a durable tree of child tasks. A schedule can
start the same workflow that a user starts from a chat. Each child remains a normal provider
session with its own captured context, host, provider account, model options, permissions,
artifacts, approval requests and logs. Native provider sessions are not transferable between
providers. Only explicitly permitted task packets and results cross the boundary.

Start with named, configured worker profiles and a fixed ordered/dependency-based workflow.
Then let a coordinator propose additional child tasks using a constrained delegation interface.
Dynamic planning selects from permitted profiles; it cannot create profiles, expand permissions,
change data policy or invent a fallback provider. Initially all proposed transfers can be reviewed;
subsequent preauthorization must name concrete profiles, data classes, actions and destinations.

In chat, an Agents panel shows the parent/child tree, provider, account/profile, model, effort,
speed, destination Mac, state, approvals and usage. Each row opens the child conversation only when that client is authorized to receive its data.
Restricted rows expose permitted status metadata instead. Existing host sync payloads and encrypted
web/mobile caches must also enforce that distinction; pairing and encryption alone do not grant
permission to replicate restricted prompts, tool outputs or results.
Schedule settings gain a Workflow mode with coordinator/worker profiles, dependencies, approved
inputs/outputs, limits and fallback policy. Ordinary single-provider schedules stay unchanged.
Web and native clients consume this host-owned state through the existing encrypted protocol.
They do not orchestrate execution independently or hold provider credentials.

## Live capabilities and routing

Reuse the provider catalogs and allowance observations already collected by the host. A planner
can inspect available authenticated profiles, advertised model/effort/speed/context controls,
tool capabilities and quota windows, including timestamps and unavailable/stale states. These
are observations, not promises of available capacity or a guarantee that a task will fit.

The current catalog, usage and permission stores are provider-keyed rather than a multi-account
registry. Add an immutable host/provider/verified-account/profile binding to sessions, grants,
quota caches and tool credentials before relying on account-specific restrictions. Revalidate
that binding after sign-in, refresh and resume; an account change invalidates affected cached
choices and approvals instead of silently reusing them.

Apply routing in this order:

1. Provider/account, host, data, tool and workspace policy filters.
2. Required model capabilities and supported settings.
3. Available execution slots and dependency readiness.
4. User priorities for quality, latency and preserving account allowance.

Quota optimization never widens the allowed provider set. Missing quota is unknown; a depleted
restricted provider waits, fails explicitly or asks the user instead of moving work elsewhere.
Do not infer cost or remaining allowance from token counts. Latency estimates, if offered, come
from measured runs and remain labelled estimates. Model names alone are not provider identities:
a model accessed through an approved Copilot account is a different configured route from a
direct provider account, and the policy can restrict both the route and its advertised models.

## Enforced boundaries

Keep workflow policy in its owning repository and private machine/account mappings outside Git.
Proteus implements the generic mechanism. Profiles must independently constrain:

- **Execution:** destination host, provider account, permitted models and delegation depth.
- **Systems:** allowed MCP servers/tools, network destinations, credentials and external actions.
- **Files:** explicit input snapshots, output locations and permitted repository/worktree roots.
- **Data flow:** which source classes may enter each provider and what may return to the parent
  or another child; include errors, summaries, attachments and tool output, not just prompt text.

The host validates a task before a model sees its packet and again at actual tool execution.
A child cannot inherit all parent permissions or approve itself. Delegation is not a bypass for
normal external-action approvals. Return results are untrusted content, never new authority.
Automatic model-generated redaction is not sufficient to declassify restricted material.
Use deterministic restricted outputs or explicit release approval where content cannot cross.
A transcript derived from a workplace meeting remains workplace data unless policy permits its
use on the selected route; access restrictions and data-processing restrictions are distinct.

Example: an approved transcript-processing profile may use one provider for permitted transcript
content. A workplace systems profile uses only the approved enterprise provider for repository,
issue-tracker and warehouse access. Credentials stay with the authorized tool service; record data
remains within the approved child/provider route, which can include the enterprise model service.
This is not a claim that inference or records stay solely on the Mac. The parent gets
only policy-approved outputs; even identifiers or completion status require an allowed return
scope. If the transcript itself is restricted to the enterprise provider, keep summarization and
coordination there too. Never assume fetching a record through an approved provider makes the
returned record permissible for every other provider.

Stricter environments also require real runtime isolation. A profile label or prompt cannot
restrict a general shell running as the same user. Disable unrestricted escape paths and enforce
filesystem, network and credential boundaries using supported runtime controls; if an adapter
cannot enforce a required scope, mark it unsupported. Separate accounts or machines can provide
an additional boundary. Verify actual native global-instruction loading as well as selected
context, because the current Codex integration documents a global-instruction uncertainty.

## Same-host first; explicit cross-host delegation later

Keep the initial workflow on one host with separate provider profiles. For a personal/work host
split, add a narrowly scoped desktop-to-desktop delegation pairing. Existing website/phone
pairings and relay routing do not authorize agents to dispatch work between Macs. The receiving
host must resolve an allowed local worker profile and independently enforce its own policy.
Provider keys and private filesystem context stay on that host. The relay transports encrypted
packets and remains unable to execute or interpret the workflow.

Each workflow has one authoritative owner for scheduling, task IDs, state and recovery. A remote
worker has durable deduplication IDs and explicit start/cancel/status/result acknowledgements.
An uncertain delivery is reconciled with that host before retrying; do not duplicate external
writes. Host disconnection does not mean accepted work was cancelled.

## Engine work required

Current `Engine.running` provides one AI slot. Codex and Claude adapters also have single-active
state. Do not simply call `createRun` and await a child while the parent holds that slot: that
would deadlock. Introduce workflow state and bounded provider execution capacity deliberately.

The first implementation can end the planning turn, execute eligible steps, then resume the
coordinator with permitted results. For live delegation tools and parallel work, a waiting parent
must release scheduler capacity without losing its provider session; each adapter must either
support multiple isolated sessions or advertise a capacity of one. Releasing an engine slot alone
does not free a native adapter still occupied by a waiting parent. End/checkpoint that turn before
same-adapter dependent work, or reject the dependency; validate the dependency graph against real
adapter/account capacity to prevent cycles. Keep exactly one active turn
per native session, limits per account/host, reserved interactive capacity and bounded depth/fanout.
Do not let orchestration waits consume execution deadlines or create hidden forever-running tasks.

Persist parent IDs, child IDs, dependencies, policy/context revisions, selected model controls,
transfer decisions, idempotency keys and per-step outcomes. Aggregate observed usage without
conflating it with subscription allowances. Cancel whole trees or selected children explicitly;
keep completed external effects visible. Restart recovers interrupted workflow state without
silently replaying actions. Parallel code edits need disjoint ownership/worktrees and an explicit
integration step. Workflow success requires expected outputs, not merely a completed model turn.

## Implementation sequence and acceptance

1. Host-owned worker-profile/policy schema, capability/usage catalog for planners, durable workflow
   and child-run records, fixed multi-provider steps, and an Agents status view. Disabled until configured.
2. Scoped delegation interface, reviewed task/result transfers, bounded provider lanes, cancellation,
   restart recovery and remote-client child/approval views. Gate each adapter on verified support.
3. Explicit cross-host worker pairing and policy enforcement, then optional dynamic planning and
   allowance-aware routing within approved choices. Keep public/personal and workplace policy
   definitions independent; do not embed either operating system into Proteus.

Test unsupported provider scopes, forbidden prompt/result transfers, credential isolation,
changing/revoked grants, tool-output prompt injection, quota exhaustion, capability changes,
parent/child waiting, provider-level serialization, duplicate delivery, restart during a write,
cancellation, offline hosts and native-session isolation. Use synthetic data and mock company
connectors first. Real workplace access requires the operator's actual approved provider/data
rules and controlled connector acceptance. Existing transcription replacements remain disabled
until their separate ownership and workflow acceptance is complete.

## October 4 review — proposed next feature increment

The operator requested renewed review alongside the [cross-client parity queue](planned-updates.md).
No delegation is implemented or enabled by this design update. Distinguish human-controlled remote
chat/schedule commands, aggregated chat visibility and AI-authorized delegation as separate powers.

Recommended first delivery:

1. A host-backed provider-awareness view showing verified host/provider/account/profile bindings,
   current capabilities, allowance freshness and unavailable routes. Reuse the same presentation
   on desktop/web/mobile; provider authentication/configuration remains desktop-owned.
2. A reviewable split-work proposal: child task, provider/profile/model, destination, explicit
   input/result scope, dependencies, tools, approval needs and limits. Preview has no side effects.
   Do not fabricate cost/capacity predictions or read otherwise unauthorized provider/work data.
3. After policy/schema/identity prerequisites pass, opt-in fixed same-host sequential execution.
   End/checkpoint the coordinator turn, execute eligible children as normal provider sessions,
   and resume with permitted results. Do not await a child while occupying the only adapter slot.
4. Parent/child links in aggregate Chats and client tabs, status and individually actionable
   approvals; deterministic cancel/restart/uncertain-result behavior with durable IDs. A child is
   visible only where its data policy permits, even when the parent is visible everywhere.

The first preview can ship independently of the execution foundation. Actual multi-provider
execution is conditional, not promised as part of the visual parity release. Keep dynamic task
creation, parallel provider lanes, automatic allowance balancing and cross-host agent delegation
behind later policy, isolation and recovery acceptance. A selected/default Mac stays explicit;
quota exhaustion never silently routes data to another host, account or provider.

Acceptance uses synthetic personal/restricted data labels and fake tools: deny forbidden inputs,
titles/results and error leakage; invalidate grants after account changes; preserve per-session
serialization; recover from crashes without duplicate external effects; and ensure all clients
display the same actual children, pending approvals and outcomes. No live professional content,
provider login changes or transcription owner cutover is part of planning validation.

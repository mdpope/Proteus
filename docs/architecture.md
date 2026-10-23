# Architecture

See [code organization](code-organization.md) for feature/model/service folder ownership, source
placement and commentary conventions across native, desktop and web builds.

Proteus has one host-owned service and runner per application-data home. Electron,
the authenticated local HTTP interface, paired clients, internal tools, and external
MCP act through service boundaries. The scheduler is provider-neutral; adapters own
provider metadata, sessions, model configuration, and tool delivery.

## Durable ownership

Schedules are versioned JSON documents. Validation, atomic replacement, fresh disk
reads, unknown-field preservation, and revision conflicts protect edits from competing
clients. Run events and retry receipts remain durable; presentation caches are disposable.
The runner isolates provider sessions and permits independent chats to execute while
preventing concurrent turns in the same session. A model's completed turn is separate
from completion of an external workflow.

`src/engine.js` owns execution; `src/services/chats/run-history-cache.js` manages lazy history residency;
`src/services/scheduling/schedules.js` owns schedule validation; provider adapters live in `src/providers/copilot.js`, `src/providers/codex.js`, and `src/providers/claude.js`.
Active turns keep their required histories resident. Inactive history eviction does not
remove durable events. `src/shared/files.js` provides atomic storage primitives.

## Desktop presentation

`desktop/main.cjs` hosts the service and window registry. Each window owns its IPC
presentation, browser views, terminal attachments, geometry, and selected content.
`desktop/browser/browser.cjs` owns embedded pages, profiles, history, navigation provenance,
and scoped browser actions. Trusted-page input records navigation intent immediately;
activity-only metadata is coalesced. Cookies and page sessions remain local.

`public/app.js` composes surfaces. Conversation rendering preserves stable nodes,
drafts, selection, and access to complete history while reducing offscreen layout work.
Terminal presentation batches output and detaches hidden renderers without restarting
shells or losing owner-side output. These lifecycle rules are documented in
[chat rendering](chat-rendering.md) and [terminals](terminals.md).

## Tabs and follow-along

`src/services/workspaces/content-tabs.js` owns durable descriptor identity, order, navigation, and revisions.
`public/models/content-tab-sync.js` reconciles changes with durable pending operations and
history conflicts. Browser histories retain the session beginning; small descriptor
windows and incremental reads reduce transfer, not retention.

`src/services/workspaces/project-follow.js` owns bounded, ephemeral presentation state. A renderer subscribes
only to its selected owner workspace/project. `public/features/workspaces/project-follow.js` coordinates
selection and position changes; tab order and URL changes use the existing tab service.
Re-entry reads the latest scoped state. Browser pages load independently in each local
profile. No remote page rendering, cookies, page text, or sign-in state is shared.
Same display names do not identify the same project. Documents, resource permissions,
private URLs, drafts, and provider approvals retain their existing boundaries.

## Connections and shared services

`src/services/remote/remote.js`, `src/services/remote/remote-client.js`, and `src/services/remote/desktop-peers.js` implement authenticated
paired connections. `relay/server.js` routes encrypted messages without interpreting
application payloads. Packet, backlog, pending-request, and byte-rate limits bound
transport work. Disconnects preserve pairing; uncertain mutations use durable command
identities and receipts instead of blind replay. Follow events are replaceable and are
not replayed as historical gestures. See [remote access](remote.md).

The website account is separate from peer transport and provider credentials. Shared
account authentication lives in `src/services/remote/account-session.js`; AppAccount and Life use that
boundary while preserving existing encrypted credentials and consent. Website APIs
support selective collections and revision-checked writes. Life read models filter,
page, and aggregate in SQL while keeping immutable nutrition versions and totals.

## Updates and recovery

The supervised updater has independent inspection/helper boundaries, durable checkpoints,
installation-bound provenance, and preservation receipts. Expensive package work runs
outside the main event loop. Recovery retains at most two verified full generations per
installation/device; retries reuse valid state, ordinary caches are excluded narrowly,
and protected storage remains included. See [desktop updates](desktop-updates.md) for
compatibility, operator controls, and live acceptance requirements.

## Validation and design history

Run `npm test` and `npm run check`; interface changes also require isolated UI rehearsals.
Platform CI, website tests, and Apple tests are described in [contributing](../CONTRIBUTING.md)
and [handoff](handoff.md). Build, synthetic verification, physical-device verification,
installation, and deployment are distinct states.

The [stabilization ledger](stabilization-plan.md) records current work and limitations.
[Earlier architecture notes](history/architecture-before-2026-10-22.md) are retained as
historical design context; their queued status does not override current feature docs.

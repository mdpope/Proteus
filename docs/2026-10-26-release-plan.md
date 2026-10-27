# October 26 release: implementation handoff

**Current stage: implementation and acceptance.** The release scope includes the original Markdown and seven screenshots, plus the in-chat subagent viewer and delegated-permission repair. See [the current evidence ledger](2026-10-27-release-evidence.md) for implementation, validation and deployment status. The original planning text below remains the acceptance contract.

Use this release branch after the model switch. The original request authorizes implementation and, after validation, installation on this Mac and the connected iPhone/iPad. Other desktop installations are outside this deployment request. Use GPT-6.1 Terra with high reasoning for implementation and installation agents. Destination update coordinators must still use their saved Engine Room defaults. Do not dispatch GitHub Actions.

## Baseline and evidence

- Read the [branch audit](2026-10-26-branch-audit.md). The release started from `4b90654`; merge `592d362` includes the newly discovered Windows path-fixture corrections and cold-start recovery record. Two missing historical Linux validation reports were recovered. Their dated rollout statements remain historical.
- Planning combined Astra's dependency/acceptance review with the coordinator's authorized repository and screenshot reads. Astra and Terra child tools failed even after explicit approval; this is R22, not evidence that the user refused the work.
- The referenced unassigned scheduled chat was inspected through approved read-only access. Its events include `Chat-only auto-approval`, `trust-folder` and `trust-folder-chat`. This supports investigating approval scope persistence, without copying professional conversation content into source.
- The iOS screenshots show selected sidebar project/chat disagreeing with the displayed header/content. Reproduce selection identity and stale-response races, not just initial project loading.
- The performance screenshot reports a busy owner, many renderers, frequent activity writes, graphics caches and memory pressure. Its sampler produced no attribution. These are investigation leads; no process termination or live cache deletion follows from that report.
- Existing code already has workers, resource retention, signed release feeds, update coordinators, question queues, terminal sharing and folder-access settings. Audit defects and missing coverage before introducing parallel implementations.
- Keep original notes, screenshots, tenant URLs, chat IDs, personal paths and raw performance evidence outside Git. Synthetic fixtures use example domains and generated identities.

## Release requirements

The rows below define required results. Current per-requirement evidence is maintained separately; implementation does not imply installation or complete live acceptance.

| ID | Result required | Acceptance |
| --- | --- | --- |
| R1 | Durable configuration for unassigned schedules, with optional inheritance from multiple workspaces | Explicit filesystem grants and selected agents/skills/MCPs persist across runs/restart. Show effective configuration and provenance. No forced workspace placement, unrelated-chat access or silently activated imports. Preserve unknown JSON fields and revision conflict checks. |
| R2 | Common signed distribution through downloads.proteus.example and consistent local/pushed updates | Reuse catalog/staging/supervisor. Check, download, verify and install with useful progress. Validate hash, signer, architecture and compatibility; destination coordinator uses saved defaults. Published files must actually download and verify. Document supported older relay versions and actionable incompatible-version behavior. |
| R3 | Core Proteus tools available in every applicable chat | Empty optional-source selection does not remove core tool registration or guidance. Missing owner/backend capability is accurately reported. Tool availability preserves ordinary sharing and access boundaries. |
| R4 | Better free/local speech and selection-aware Read Aloud | Read only selected text when nonempty, including multiline selections; define no-selection scope. Stop works. Evaluate available OS/local voices and latency audibly; compare realistic free options before adding dependencies. No paid API requirement. |
| R5 | Workspace read/write access honored | Authorized folders work during creation, resume and restart. Test nested and canonical/symlink paths. Explicit read-only overrides remain read-only; moving a chat does not change captured active-turn authority. |
| R6 | Legible provider menus on Linux/Windows | Use shared app-styled menus; test keyboard, focus, pointer, dismissal and light/dark appearance. Record real platform validation separately from Mac screenshots. |
| R7 | Every browser profile offered in link menus | Right-click links offer Open in new [profile] browser tab for all configured profiles, including extension profiles. Preserve originating window/project and chosen profile. Apply consistently wherever shared link menus are used. |
| R8 | Valid Azure-style fragment URLs accepted | Preserve `https://portal.example/#@tenant/view/.../~/Permissions/objectId/.../appId/...`. Parse authority structurally; fragment `@` is not credentials. Retain unsupported-scheme and actual authority validation. |
| R9 | Themed navigation error rather than blank white page | A nonexistent test domain shows green/themed error, hostname, observed DNS/error category and Retry. Distinguish DNS, offline and TLS where supported; no invented diagnostic results. |
| R10 | Browser notifications integrated with notification framework | Audit page, service-worker and push support. Supported events from all profiles deliver once, respect permission, preserve source identity and open the correct tab. State unsupported classes honestly. |
| R11 | Copilot active-time-limit auto-continuation | Add run-details opt-in and Continue and enable action. Persist at chat scope unless existing schema provides an equivalent explicit scope. Continue once after settlement, keep original session and receipts, preserve queued input, and stop on explicit Stop, permission/question wait or non-recoverable errors. |
| R12 | Terminal robot button actually shares/revokes | Confirm exact terminal owner state and tool access after each action. Errors visible; close/restart revokes. Move never restarts the shell, changes its working directory or replays commands. |
| R13 | Arbitrary file attachments in chat and Internet Search | Picker, drop and applicable paste accept any file extension. Distinguish attachment storage from preview/extraction/provider support. Preserve binary bytes and show real size/provider limits instead of arbitrary type rejection. |
| R14 | Larger centered Internet Search input | Center the tool; make initial input at least twice previous height and grow within a panel bounded to 80% of available page height. Test narrow windows, zoom, scrolling and keyboard. |
| R15 | Large text pasted as attachment | Convert over 200 lines or provider-safe payload budget to a text attachment before request construction. Cover 200/201 lines, huge single line, Unicode and the reported 1,048,576-character boundary. Preserve exact content, stable draft attachment identity and retries. |
| R16 | Rich paste preserves structure without formatting toolbar | Convert supported clipboard HTML/Markdown into safe headings, lists, indentation, code, links and tables. Sanitize executable markup/unsafe links, preserve plain-text fallback and ordinary typing. |
| R17 | iOS project/chat switching and useful notifications | Repeated A→B→A switches keep owner/sidebar/header/content consistent after cold launch, resume and reconnect. Include delayed/out-of-order responses. Notifications show useful permitted event content and deep-link correctly under existing privacy/encryption settings. |
| R18 | Measured desktop responsiveness/resource improvements | Measure main-thread stalls, CPU, memory, writes, handles and queue latency. Move attributable expensive work off hot paths, coalesce redundant events/writes, and bound inactive resources without cancelling active sessions. Validate multiwindow behavior and comparable before/after workload. |
| R19 | iOS inactive resource unloading with quick recovery | Release expensive inactive views, observers and tasks while retaining durable sessions, drafts, selection, scroll and browser navigation. Restore without unnecessary network reload; repeated switches do not leak observers or duplicate requests. |
| R20 | Question choices visible before submitting | Render choices on first question arrival and after reconnect/resume on desktop/iOS. Preserve selected/custom answer, resolve once, and distinguish pending, answered, expired and failed states. |
| R21 | Read-only subagent view inside parent chat | Conditional Agents button to right of chat title/header opens inline agent button tabs with truthful statuses and available transcripts. No top-level tab navigation or child interaction. Preserve parent draft/scroll. Desktop/iOS parity and honest unavailable-provider state. |
| R22 | Delegation inherits applicable parent authorization | Explicitly requested delegation and authorized child read/write/test work do not prompt again solely because a subagent performs them. Carry captured task/resource scope and revocation; do not grant unrelated resources or actions. Diagnose actual child rejection and distinguish human denial, policy/sandbox rejection, missing inherited scope, unsupported tooling and timeout. |

## Decisions and shared contracts

### Permissions, schedule configuration and delegation

Use one owner-side effective-configuration resolver for explicit chat/schedule configuration, selected workspace references, host defaults and mandatory core capabilities. Placement, execution owner, selected sources and authorization are independent.

Store selected workspace references with explicit category selection (folders/permissions, instructions, agents, skills, MCPs) and provenance. Resolve at run start and capture a versioned effective snapshot for that run. List values deduplicate by stable identity; conflicting scalar/active-agent settings require a visible deterministic selection. Explicit schedule settings override defaults, but selecting a source must not silently broaden protected authority. Missing/deleted references produce an actionable configuration problem rather than fallback to a different account/workspace. Preserve read-only exceptions and canonical-path checks.

Offer the appropriate persistent schedule scope when a scheduled run needs a permission decision, separately from one-time/current-chat approval. A successful current-chat trust decision must not be mislabeled as persistent schedule authorization. Test changes and revocation between runs, resume, multi-workspace overlap, imported schedules and changed configuration revisions.

R22 must trace the native provider child launch and approval boundary, not merely hide a prompt. Derive child scope from the authorized parent task and captured host/resource policy. Preserve parent-child/run identities, approval provenance, explicit revocation and external-account boundaries. Never rewrite a host-policy failure as user refusal. Real denial remains enforced; fixing lost scope does not mean blanket allow-all. Test authorized child read/write/test, out-of-scope refusal, nested children, resume/restart and revocation with a real provider in addition to fixtures.

Core tools belong to the mandatory host catalog and guidance. Optional source selection remains optional. Copilot agent tool declarations are tool ceilings, not grants; reconcile core availability with actual host permissions rather than expanding all MCP access.

### In-chat agent viewer

Use actual provider relationship/event capabilities. Normalize stable owner, parent conversation, child agent and run IDs server-side. A requested child ID must be proven to belong to the authorized parent; do not enumerate unrelated chats or read arbitrary provider session files.

Expose parent-scoped summaries and cursor-based child events, using existing service contracts where available. Summaries need display name/task, provider, observed status, timestamps and whether transcript access is supported. Store provenance and deduplicate event sequences. A provider's completed turn is not proof its external task succeeded.

UI arrangement:

```text
Parent chat title                                  [Agents 3]
Parent conversation | Agents
                       [Planner · done] [UI · running] [Tests · waiting]
                       Read-only selected agent conversation
Parent composer/draft remains owned by the parent conversation
```

The header button appears only when actual child use is recorded, with no empty permanent control for ordinary chats. Retain completed child history under normal retention. Switching views does not leave/recreate the parent tab. No child composer, stop/retry/approve controls or write actions. A clear Parent conversation button returns to the original scroll position; avoid implying a visible parent composer sends to the selected child.

Load only summaries until a child is selected; page/window long transcripts and bound caches. Unsubscribe inactive child views. Reconnect reconciles sequence/cursor state and rejects responses for another selected parent/owner. Display unavailable transcript/status explicitly; do not fabricate it from parent narration. Support direct children first with a compact grouped hierarchy only when actual deeper relationships require it. iOS uses accessible horizontal button tabs within the same chat screen.

Cover zero/one/many children, mixed statuses, nested lineage, completed history, unsupported adapters, denied access, long history, reconnect, duplicate events, stale selection and preservation of parent draft/scroll.

### Performance and process ownership

Start with diagnostics already in the repository. Measure event-loop delay, provider hook request queueing, state projection/serialization, activity writes, navigation IPC and SwiftUI invalidation. Choose a bounded worker pool or existing worker for demonstrated CPU/I/O work. Keep one owner service and serialize effects per session; do not turn parallel compute into duplicate runners or cross-thread approval stores.

Use batching/backpressure and content/revision keys to eliminate redundant work. Cache eviction may remove reconstructible derived data; it must preserve browser profiles/cookies/history, session transcripts, drafts, permissions and retry receipts. Honor Persisted tabs. Distinguish resource unloading from closing logical tabs or cancelling model work. Test active tab preservation under memory pressure and rapid selection, with automatic state recovery.

### Attachments, menus and continuation

One draft/attachment conversion service serves chat and search. Budget provider requests before serialization, including very long single lines; attachment acceptance does not promise universal extraction or provider support. Store original bytes with stable identities. HTML paste conversion must not execute markup or allow hidden content to become instructions automatically.

Reuse shared menus and owner actions for profiles, terminal sharing and browser notifications. Copilot auto-continue must be bounded, observable and idempotent, operating on a recoverable active-time timeout rather than all failures. Continue and enable is one revision-checked owner action. User Stop and pending human input take precedence.

## Implementation ownership and waves

Exact paths below were found in the integrated checkout; discover precise functions and tests before editing. At most three implementation workers run concurrently. Every assignment must say agents share the codebase, must not revert others, and owns an explicit file set. Hand off ownership before another worker edits shared files.

| Wave | Terra A high | Terra B high | Terra C high |
| --- | --- | --- | --- |
| 1 | R1/R3/R5/R22 permission, schedule and delegated-scope contracts | R13–R16 and desktop R20 composer/search/attachments/questions | R17/R19 and native R20 selection/state recovery; performance baseline |
| 2 | R21 provider/host relationships and read APIs, then R11 continuation | R6–R10 menus/profiles/navigation/notifications, then R4 speech | R21 native viewer after host contract; notification content/privacy |
| 3 | R12 terminal sharing; measured R18 owner/process/cache fixes | R21 desktop viewer and integrated accessibility/UX | R2 catalog/compatibility gaps and packaging/installation preparation |
| 4 | Permission/delegation/provider integration verification | Actual desktop acceptance and fixes | Native validation and guided device installation after release gates |

Coordinator owns `src/engine.js`, `src/server.js`, `desktop/main.cjs`, `public/app.js`, shared schema/event registration, global styles and aggregate release documentation unless ownership is explicitly delegated. Workers supply narrow APIs and wiring patches; avoid concurrent edits to these compositions.

Starting seams:

- Permissions/scheduling: `src/services/settings/permissions.js`, `src/services/scheduling/schedules.js`, scheduler worker/client, `src/services/workspaces/context.js`, `schemas/schedule.schema.json`, provider adapters and existing permission controls.
- Tools/agents: `src/services/chats/app-capabilities.js`, `agent-tools.js`, `chat-control*.js`, `src/providers/{codex,copilot,claude}.js`, `src/providers/turn-waiter.js`, `src/shared/tool-activity.js`. Tool aliases already include Copilot task/read/list/write-agent names; determine actual transcript/status events, not inferred support.
- Chat UI/attachments: `public/features/chats/{chat-composer,conversation,chat-details,chat-attachments,user-questions}.js`, `src/services/chats/{chat-attachments,chat-documents,user-questions}.js`, `src/providers/provider-attachment-input.js`; discover Internet Search composition and shared menu/TTS call sites.
- Browser/terminal: `desktop/browser/`, `public/features/browser/`, `desktop/services/external-urls.cjs`, `src/services/tools/{terminal-agent,terminals}.js`, `public/features/tools/{agent-terminal,terminals}.js`.
- Performance: `src/services/telemetry/performance-diagnostics.js`, existing log/context/history/remote/package workers, `desktop/browser/browser-retention.cjs` and existing resource controls. Do not add a second ownership service.
- Native: `ios/Proteus/Services/State/SharedAppStore.swift`, `Services/Networking/RemoteStore.swift`, `Shared/Navigation/NativeShell.swift`, `Features/Workspaces/Views/NativeProjectViews.swift`, chat views and existing notification/persistence services. Keep high-frequency measurements and serialization off broad observable state/main actor.
- Updates: `src/services/updates/`, `desktop/updates/`, `public/features/settings/{updates,update-coordinator-preferences}.js`, `scripts/stage-desktop-release.mjs`; retain `desktop/update-helper.cjs` compatibility launcher.

## Validation and release gates

1. Recheck the branch audit/working tree and refresh remote source changes if others have worked since this handoff. Reproduce failing sequences and capture baseline measurements before code changes.
2. Run targeted contract/regression tests as each lane lands. After final execution/persistence changes run `npm test` and `npm run check`; use the documented short temporary-directory path where required. Keep original failures and fix causes without weakening assertions.
3. Exercise actual desktop UI: schedule permissions across runs, empty optional selection, real child delegation, terminal share/revoke, every profile menu, fragment URL, DNS failure, notification, large/rich paste, search sizing, question first render, selection speech, timeout continuation and multiwindow resources.
4. Test native repeated project/chat switching, parent/agent view transitions, reconnect/out-of-order responses, foreground/background, inactive resource recovery and notification navigation on phone and tablet simulators, then installed devices. Report simulator versus physical coverage separately.
5. Record comparable latency, stalls, memory/CPU, outstanding tasks/observers and state-write counts; set acceptance thresholds from the reproduction. A structural refactor is not performance evidence.
6. Update feature docs, `CHANGELOG.md`, `docs/planned-updates.md`, `docs/decisions.md` where appropriate and this requirement evidence ledger. No requirement quietly disappears; state implemented, verified and any unresolved blocker independently.
7. Freeze final tested source and exact artifacts. Verify compatibility/additive protocol behavior with an older supported peer and explicit unsupported version. Stage, publish and independently download/verify common-channel artifacts. Missing Linux/Windows build/signing environment is a real coverage gap, not permission to invent a package or enable Actions.

## Deployment after implementation acceptance

Read current `docs/desktop-updates.md`, `docs/apple-build.md`, `docs/handoff.md` and device acceptance records before touching installed apps. Verify Mac unlocked before signing/account checks. Preserve existing identities, certificates, entitlements and paid iOS configuration (`ios/PaidAccount.xcconfig`, bundle `org.proteusapp.review.proteus`). No uninstalls, account reset or shared certificate revocation to make an update work.

Create an unassigned local `purpose:update` coordinator through the current owner tool catalog. Capture saved Engine Room model/provider settings; preserve operation IDs and follow durable task feedback through restart. Use prepare/handoff, normal idle barrier, independent supervisor, checkpoint and original-session continuation. Do not force quit unrelated work. If a required capability is absent, report it instead of editing app-data directly.

Before live backup, inventory all recovery roots and disk headroom. Keep at most two verified full recovery generations per distinct installation/data home or physical device. Reuse valid snapshots, resume partial device copies and retire eligible duplicate recovery/staging material under the documented policy. Build-only testing needs no live-data backup. Measure actual free-space change.

Install this Mac and the intended iPhone/iPad through the guided Mac process after acceptance. Verify package identity, installed version, migrations, retained settings/grants/drafts/chats/provider sessions/retry receipts, launch and representative release behavior separately. A coordinator's completed turn is not installation evidence. Do not reinstall other desktop hosts or publish another platform's untested binary merely because its source was merged.

Final report: tested commit, published/download-verified artifacts, Mac installed/live-verified, each iOS device installed/live-verified, genuine coverage/blockers, retained recovery generations and free-space change.

## Handoff instruction

After the model switch, resume this plan and branch rather than starting another release checkout. Existing implementation/deployment authorization carries forward; no extra confirmation is needed solely for authorized subagents. Diagnose R22 early so delegation works. Use the evidence ledger for the current implementation state.

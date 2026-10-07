# October 7 next-version build handoff

This planning checkpoint contains **17 requested changes**, not implementation or release
verification. The authoritative requirements and acceptance criteria are BF-2026-10-07-01
through BF-2026-10-07-17 in [planned updates](planned-updates.md). The operator approved the
revised new-chat design and requested this queue be published as a PR. No runtime code, installed
app, signed bundle, schedule, permission, authentication profile, or account was changed.

## Scope and dependencies

| Area | Items | Work |
| --- | --- | --- |
| Remote recovery | 01 | Reconnect eligible Mac sessions automatically and refresh authoritative state. |
| Schedule layout | 02 | Prevent paths/text overlapping buttons and review responsive layout. |
| Models and new chats | 03–04 | Consistent versioned Claude models; approved wide new-chat composer. |
| Approvals and history | 05–07 | Explicit approval lifetimes, runtime timers, and preserved original questions. |
| Browser routing/preferences | 08–09 | Keep in-app chat pages in chat navigation and choose where clicked links open. |
| Tab overview | 10 | Improve pinch behavior and evaluate other tab types. |
| Standup links | 11 | Save link ordering and open tabs in that order. |
| Tab organization | 12–14 | Insert left/right, copy/move to destinations, and audit existing movement. |
| Terminals | 15–16 | Fix navigation spacing and integrate actual agent terminal activity. |
| Integration authentication | 17 | Visible Azure CLI, Jira, and ADO profiles, status checks, and sign-in recovery. |

Audit tab ownership and movement before extending transfer actions. Browser routing, standup
opening order, and terminal integration must use the same ownership rules. A move/copy does not
silently duplicate running work or grant agent control. Profile design must distinguish CLI,
MCP, and terminal authentication rather than treating one successful login as proof for all.

BF-06 proposes active execution timing excluding human waits and avoiding overlap double-counting;
document the final counting rules during implementation. BF-16 terminal defaults and BF-17
profile mechanisms require investigation; the intake is not proof of provider support.

## Approved new-chat design

Open [the approved interactive sample](design/2026-10-07/new-chat-approved.html). The operator
approved this design on October 7 after requesting the following refinements:

- A wider dialog with side-by-side workspace fields and a starting-folder dropdown defaulting
  to the selected workspace's configured folder.
- An expandable configured-folder list with a **+** for chat-specific additions.
- Reuse of the existing instructions/skills/agents/MCP component and its minimizer, not a rewrite.
- A continued-chat-style composer, unboxed attachment **+**, and one naturally wrapping toolbar
  for Provider, Model, Thinking effort, Speed/service tier, and Context size, without a divider.
- Provider-first selection, automatic option refresh on provider changes, and no model-refresh
  button or unnecessary coaching. Keep field labels and meaningful validation/errors.

The standalone sample uses synthetic folders, context entries, models, and capability lists.
Its sample catalog is not implementation metadata. Real model choices must use refreshed provider
metadata. The source selector is a representation of the existing UI; reuse the actual component
when building. Sample actions do not read files, authenticate, start chats, or run commands.

## Source and validation boundaries

This PR is based on `codex/oct-6-build-handoff`, the prior planning branch. It does not merge or
ship the intervening implementation branches. During intake the installed app differed from
this checkout, including chat tabs and chat-only approval behavior. Locate the current owning
implementation and reconcile these requests with subsequent fixes before editing runtime code.
Read `AGENTS.md` and [agent handoff](handoff.md) before building.

Only sanitized descriptions and the approved sample are included. Screenshots containing private
workplace material, actual chat records, paths, account details, credentials, and usage data
remain outside this repository.

Planning validation checks numbered scope, document links, HTML/script structure, and publication
diffs. The operator reviewed and approved the inline design. Automated browser inspection was
unavailable in the intake environment; do not describe the exported sample as browser-tested.
No runtime tests or live workflows establish any requested feature as complete in this PR.

During implementation, run `npm test` and `npm run check` for execution/persistence changes and
exercise every affected client UI. Use isolated synthetic hosts, profiles, pages, and commands.
Report implemented, verified, and deferred scope separately; model usage, successful authentication,
and completed external workflows require actual evidence. Preserve signing and credential continuity
for any later installed update, following the existing packaging/deployment documentation.

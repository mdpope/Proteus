# October 23 next-release implementation

Operator authorized implementing the intake and follow-ups on `codex/oct23-next-release`.
Local Mac packaging and disposable package tests are authorized. Installation, OS defaults,
publishing and remote rollout remain held. Simulator and web compilation evidence remains
separate from physical-device acceptance.

The linked update chat is `codex://threads/2500d184-9574-546d-ba2d-280c206a84ba`. Its current
checkout is primary Proteus. This branch merges its latest clean main, `15327ab`, through
merge `63bfc39`; the newer main commit contains rollout/retention documentation only. Both
sets of release records are preserved. Implementation checkpoints are `961af16` and `266e43b`.

Local package gates caught two issues before acceptance: scratch validation output needed an
explicit exclusion, and an already-patched extension dependency retained its pre-organization
native-messaging path. Both are fixed with regression coverage. The first package failed closed;
the second package's startup timeout is retained as a failed result, superseded only by a rebuilt
package passing the same gates. Test launch errors now retain their original exception.

| # | Item | Implementation and verification |
| --- | --- | --- |
| 1 | iOS scrolling | Cache serialization/encryption/atomic writes use a serial utility queue; scroll measurements no longer publish whole-history state. Native units/simulator scrolling pass. Physical frame-rate profiling remains acceptance. |
| 2 | URL/history sync | Latest baseline navigation-acknowledgment fix retained; Node/native identity/history reconciliation regressions pass. Physical cross-device acceptance remains separate. |
| 3 | Keep Screen Awake | Preference restored across restart; quit releases assertion without clearing preference. Unit verified. |
| 4 | Question attachments | Desktop/web/native reviewed PNG/JPEG/WebP/text replies; exact question/chat/device/provider consent and structured results across all three providers. Replay/cleanup units pass. Live image interpretation remains acceptance. |
| 5 | New-chat selection | Baseline fix retained; real project Tabs → new rehearsal chat → workspace return passes. |
| 6 | Profile suffix | Display-only `[Profile name]` across desktop/web/native; saved page/history titles unchanged. Model checks/native compile pass. |
| 7 | Hidden titles | Source link text supplies provisional title; tool open accepts `title`; page loading replaces provisional title. Menu/tool checks pass. |
| 8 | Tab filtering | Combined type/title/URL filtering on desktop/native; desktop proves order/identity unchanged. |
| 9 | Unloaded colors | New-tab palette and readable unloaded text/buttons. Disposable UI verified. |
| 10 | Scheduled browser tabs | Required guidance/default placement opens needed tabs beside the scheduled chat, including unassigned schedules. Placement units pass; no real schedule changed. |
| 11 | Attachment footer | Separate row above provider/model controls, including preview overrides. Narrow/wide long-draft and pending-question desktop checks pass. |
| 12 | Auth browser preference | Host sign-in launcher and required guidance honor system/embedded preference. Unit verified; independent CLI authentication remains a provider limitation. |
| 13 | Folder access | Working roots default read/write; explicit read-only/protected metadata/enforced restrictions win. Read / Read-write UI; permission regressions and actual native Codex profile probe pass. |
| 14 | Stuck chat | Provider/tool progress is separate from user messages. Warn at five minutes; interrupt once at thirty; retain queue/slot until actual settlement. All-three-provider engine regressions pass. Historical hung-call cause remains unproven; old chat was inspected without mutation. |
| 15 | Return selection | Baseline deep selection retained; real desktop restart and tablet browser switching pass. |
| 16 | Persisted residency | Restore/Hide/eviction keep Persisted pages loaded; Unload requires Unpersist. Real desktop residency/native WebView units pass. |
| 17 | Desktop updates | Common signed downloads.proteus.example feed/staging for Mac/Linux/Windows; Engine Room coordinator defaults; unassigned target coordinators/durable dispatch. Feed/staging/config tests pass. No publishing/dispatch/install; actual destination migration/update acceptance remains. |
| 18 | Organization | Native, Node, Electron and shared renderer feature/model/service folders, imports/manifests/workers/preloads/Xcode groups/test URLs updated. [Architecture/commentary conventions](code-organization.md) cite Apple/Google/Microsoft. Node/native/web/desktop checks pass. |
| 19 | Loaded-tab budget | Per-machine Engine Room value 1–256, actual default 6. Units pass; protected/active pages can exceed it. |
| 20 | macOS browser/picker | HTTP/HTTPS declarations; explicit registration/default/repair UI; green workspace/project picker, keyboard filtering and ordered URL rules. Unit/real picker checks pass. Installed-app registration is held. Recorded Apple request TGNRQJ22PP remains pending, separate from LaunchServices; no live status recheck. |
| 21 | Terminal paste | Both focus targets/context paste use bracketed paste and consistent newlines. Real chat-copy/native Cmd+V/PTY round trip passes. Exact additional reported symptom awaits an example. |
| 22 | Terminal agent access | Explicit robot button; common host tool across three providers/local MCP; bounded output, owner-bound snapshots, idempotent input, revocation, no restored grants. Unit and real desktop/PTY checks pass. |
| 23 | Common move menu | Shared desktop/web destination component and native picker. Single/bulk/chat/resource entry points start at current project. Typed chat moves use membership operations. Shared-menu/retry/history/source-authority UI and native grouping units pass. |
| 24 | Associated chat home | Global chat lists, links, notifications, creation and saved views reuse the chat inside its current project/workspace. Main aliases are retired from the canonical registry without changing chat/child identities or captured access. Local/remote reconciliation units and real global-list/deep-link/restart/draft/child checks pass. Unassigned chats may remain top-level. |
| 25 | Window routing and sync | Native menu callbacks re-enter their source window. Scope-specific passive tab events synchronize content while input is focused; local windows retain independent selection/reading state. Address drafts and filtered Tabs lists survive passive changes. A real two-window test passes all three link actions, ordered membership, selection/draft/filter retention and hidden no-load behavior. |

Validation includes the complete Node suite and syntax checks, 143 native units, two tablet UI
checks, scratch Vite compilation and real desktop checks for link routing, attachment layout,
workspace restart, tab filtering/new-chat selection, residency, terminal clipboard/access and moves.
The complete Node suite passes: 1,111 passed, one skipped, zero failures. Recursive syntax checks and Vite compilation also pass. Tablet fixtures initially failed on the
phone because they require tablet navigation; they now skip that pairing and both pass on iPad.
The broader interrupted UI run remains an incomplete result, not a suite pass.

Fixtures use `/private/tmp`; preview guards remain strict. No installed app, real browser profile,
credentials, chat state or schedule was edited. SafariSelector-derived matcher/picker behavior
retains GPL notices in `docs/licenses/` and desktop third-party notices. `/team` does not match
`/teammate`. No duplicate Apple request or remote update was performed. Required live-device,
provider, OS-registration and update acceptance is not implied by local tests.


## Corrected signed local candidate — install pending

Frozen build `b2da2f2797b5+src.f7b3a6a8559e` (source
`f7b3a6a8559e1ade995e5c8de58c4ae344b8d757fc98ee4d4d41726a10358070`)
passes exact-package integrity/startup/terminal/restart and native three-window fullscreen gates.
Disposable signed update and compatible rollback from the actual installed baseline pass with a
surviving managed terminal socket, preserved durable metadata/history/receipts and exactly one
original rehearsal-chat continuation. Injected unknown-socket capture failure also relaunches the
unchanged baseline and delivers its failure/checkpoint exactly once. No live provider is called
by these fixtures; actual local installation and original Codex continuation remain unverified.
All 366 runtime/build-input hashes match the corresponding source archive. Package hash is
`3075adcad849248e55f1a4732b38e726829162bc7e9d94afff1debf426fa87a4`.
The source companion SHA-256 is
`9e77401757f13d893d314e3c44cd3e2bdb29c7e720a7d136c207cabe2fe01500`.
Existing code/build inputs outside the updater are unchanged from the fullscreen candidate.
The first failed installation journal is preserved; no live-data/session edits or blind retry
occurred. The corrected local install uses a distinct supervised job after these tests.

## Local updater follow-up — recovery snapshot failure

The authorized local installation stopped before application replacement: the cold snapshot
encountered the managed `terminal-tmux/socket` Unix endpoint. The previous installed runtime
remains `490fd629b659+src.615fe38d6371`; the failed job and prior recovery generations are preserved.
The helper also stopped without relaunching the previous app or delivering the failure to its
original chat. This is a failed local installation, not completed update/continuation acceptance.

Source now excludes only that exact home-relative Unix socket from recovery snapshots, while
preserving terminal metadata, regular files and links and leaving the live server untouched.
Other unsupported entries fail with their relative path. Pre-replacement failures independently
verify and relaunch the unchanged baseline behind the recovery barrier, then use the same durable
original-chat continuation to report the failure. Partial recovery remains separate from verified
recovery generations; uncertain provider delivery is never replayed. Focused recovery tests and
the full Node suite pass (1,116 passed, one skipped); signed-package acceptance is recorded below.
The user authorized local installation; publishing, OS defaults and remote rollout remain held.

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

## Fullscreen follow-up — current local Mac acceptance

Main `4a546b1` is included through merge `1e0669e`; the newer main changes are documentation only.
Current signed candidate `19abae929053+src.b329a09b1dc3` has source fingerprint
`b329a09b1dc3155db03c6010ead838bf46d9b3dd31ced848d66a35f50a7189bb`.
The full Node suite again has 1,113 passes, one skip and zero failures; source checks pass.
Three exact-package gates pass: native macOS fullscreen/address suggestions with three windows,
the two-window routing/synchronization/draft regression, and package integrity/startup/terminal/
history/restart acceptance. The older signed build fails the new popup-capability assertion.

URL suggestions now cannot enter fullscreen and dismiss through parent fullscreen transitions.
The native test covers bounded suggestions, Escape, leaving fullscreen, all three windows remaining
usable with stable identities, and history selection updating the URL. That last assertion exposed
and verified a stale submitted-draft fix; later typing remains protected by the captured draft check.
The operator's original pre-restart visibility/Space state was not captured, so a separate cause
for those previously invisible windows is not claimed. No installed app or other device is updated.
The recovery rehearsals below belong to the predecessor; unchanged updater code was not rerun.

## Previous local Mac acceptance (before fullscreen follow-up)

The frozen signed candidate is `9d942f46eb8c+src.04b3dc61c1cc`, with source fingerprint
`04b3dc61c1ccf4d9b15cb4f4d8a89ce22d353932a220018a2d88ca76e51f712e`.
It retains the installed `org.proteusapp.proteus.desktop` / `TEAMID0000` signing identity. Its
complete package-tree SHA-256 is `f2cbb12bdb213a904e077408eedfb285354104449ae11edfa35b62658218fb6e`.
The bundle is `dist/Proteus-darwin-arm64/Proteus.app`; corresponding source is
`dist/combined-update-source/Proteus-0.2.29-source.tar.gz`. All 366 runtime/build-input hashes
match the source companion. Later test/documentation commits leave the packaged runtime frozen.

The final Node suite has **1,113 passes, one skip, zero failures**; recursive source checks pass.
All twelve exact-package UI suites pass: package structure/startup/rehearsal/terminal/restart;
Mac signing/vendor/model-catalog checks; two-window link routing and synchronization; associated
chat placement/restart; terminal paste/access; shared move menu; filtering/new-chat selection;
link picker/rules/persisted residency; attachments; deep workspace return; background control;
and visual input plus the Playwright/DevTools MCP backends and inspector handoff.

Actual signed update and forced-health-failure rollback rehearsals both pass from baseline
`490fd629b659+src.615fe38d6371`. They use disposable installation/data paths, preserve events,
configuration, full browser history and replay receipts, and resume the same rehearsal chat once.
The installed-release helper path remains a stable launcher into `desktop/updates/`.
An initial rehearsal exposed a test-isolation gap: relaunch dropped mock Keychain and blocked
on credential-store setup. That failed result is retained. The test-only helper launch callback
now keeps mock Keychain on across relaunch/rollback; packaged helper logic and signed runtime
remain unchanged. This certifies synthetic recovery, not real credential/provider continuity.

No installed application, OS browser default, physical device, schedule or live chat was changed.
No release was uploaded or remote coordinator dispatched. Build-only validation made no live-data
backup. Local diagnostic app/data copies were removed after their receipts were retained.

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
| 26 | Fullscreen address popup | Suggestions cannot enter fullscreen and close across native fullscreen transitions. Selecting history clears the submitted address draft without clearing newer typing. Three-window native Mac regression passes in source and the signed package, plus window-sync and package-integrity gates. Previously invisible windows reappeared after the operator restarted; the original Space/visibility state remains unproven. |

Validation includes the complete Node suite and syntax checks, 143 native units, two tablet UI
checks, scratch Vite compilation and real desktop checks for link routing, attachment layout,
workspace restart, tab filtering/new-chat selection, residency, terminal clipboard/access and moves.
The final complete Node suite passes: 1,113 passed, one skipped, zero failures. Recursive syntax checks and earlier Vite compilation also pass. Tablet fixtures initially failed on the
phone because they require tablet navigation; they now skip that pairing and both pass on iPad.
The broader interrupted UI run remains an incomplete result, not a suite pass.

Fixtures use `/private/tmp`; preview guards remain strict. No installed app, real browser profile,
credentials, chat state or schedule was edited. SafariSelector-derived matcher/picker behavior
retains GPL notices in `docs/licenses/` and desktop third-party notices. `/team` does not match
`/teammate`. No duplicate Apple request or remote update was performed. Required live-device,
provider, OS-registration and live update acceptance is not implied by local tests.

# October 23 next-release implementation

Operator authorized implementing all twenty intake items on October 23. Work is isolated on
`codex/oct23-next-release`. Release packaging, installation, OS default-browser changes,
publishing, and rollout remain held. The linked ongoing update conversation is
`codex://threads/2500d184-9574-546d-ba2d-280c206a84ba`; its current source checkout is
the primary Proteus checkout. This worktree started from its clean committed checkpoint
`637f1d5`. The older `codex/stabilize-project-follow` worktree is an ancestor with no
missing commits. Recheck the primary branch and the linked thread before integration.

## Progress

All rows remain subject to integrated verification. Existing baseline behavior must be
tested rather than needlessly reimplemented.

| # | Scope | Current work |
| --- | --- | --- |
| 1 | iOS browser/chat scrolling | Audit baseline performance fixes; native validation pending |
| 2 | Cross-device URL/history | Baseline includes navigation acknowledgment fix; regression verification pending |
| 3 | Keep Screen Awake | Preference saved; shutdown releases assertion without clearing preference; unit checked |
| 4 | Question attachments | Pending implementation across provider/transport/UI boundaries |
| 5 | New-chat selection | Baseline audit and regression pending |
| 6 | Browser profile suffix | Presentation helper added; cross-surface/native verification pending |
| 7 | Hidden-tab titles | Link text and tool title input added; verification pending |
| 8 | Project tab filter | Combined type/title/URL controls added; UI verification pending |
| 9 | Unloaded colors | Shared palette styling added; UI verification pending |
| 10 | Schedule-owned browser tabs | Required orientation/tool guidance added; placement validation pending |
| 11 | Attachments above controls | Separate new-chat row added; responsive UI verification pending |
| 12 | Auth browser preference | Guidance added; host launcher change and validation pending |
| 13 | Working folder access | Pending implementation and permission tests |
| 14 | Stalled run detection | Baseline recovery exists; liveness/timeout and diagnostics pending |
| 15 | Workspace/project restoration | Baseline includes deep selection memory; regression verification pending |
| 16 | Persisted pages | Project restore, Hide, and explicit-unload paths corrected; lifecycle UI/native checks pending |
| 17 | Coordinated desktop updates | Pending defaults, dispatch, hosted feed normalization and tests; no publishing authorized |
| 18 | Code organization/docs | New routing feature has focused modules; broader organization pending |
| 19 | Loaded-tab budget | Actual baseline is 6; numeric per-machine setting added; unit checked |
| 20 | macOS link picker/rules | Isolated implementation added; integration, UI, registration and rule tests ongoing |

## Validation so far

- Thirteen focused rule/store/window-selection/registration/keep-awake/retention tests pass.
- Existing sixteen focused browser/retention/keep-awake/reorder tests passed before the new tests.
- Static JavaScript checks passed before the latest routing integration; rerun at integration.
- Temporary test files must use a writable task-local TMPDIR in the restricted environment.
- No release artifacts built, default browser changed, app installed, or update dispatched.

The external-link matcher follows SafariSelector host/glob rules, but fixes its plain-path
substring fallback: `example.com/team` must not route `example.com/teammate`. The picker
ports its keyboard behavior and type scale; it resolves actual workspace/project identities,
uses green surfaces, and uses the existing owner process without a Safari extension.

Apple's recorded browser/passkey entitlement request is pending. This is separate from
LaunchServices HTTP/HTTPS registration. No duplicate Apple request should be submitted.

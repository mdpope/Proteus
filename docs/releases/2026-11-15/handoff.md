# Nov 11 (0.2.45) hand-off — 2026-11-12

## Current continuation checkpoint — November 13

The release branches are consolidated in `codex/nov11-continuation`: all qualified Life Ask,
native performance and clickable chat-link changes are retained, and N11-40 workspace-close
audio handling is merged from `codex/nov11-release`. N11-37 and N11-39 remain queued; do not
claim they are implemented. Freeze no new candidate without N11-40.

Merged-source validation: 1,827 Node tests pass/four skip; static checks and workspace-close
WebAudio, audio controls, background-browser and associated-chat routing UI tests pass. The
background test now waits for the existing scheduled state flush before asserting throttling;
its previous immediate check raced the batched update. No new candidate has been built.

Six historical update attempts now have supported reconciliation receipts. The remaining
attempt belongs to a cancelled, archived chat that the operator explicitly forbids resuming.
Do not dispatch it again. Maintenance remains blocked; a supported recovery workflow for that
case is still needed, without reviving the chat or bypassing its owner checks.

Post-restart: Build Mac is verified on the Life Ask candidate with identical navigation
inventory, verified health and two fully verified recovery generations. The damaged prior
recovery was retired with evidence retained. Historical attention jobs still need supported
reconciliation before maintenance can reclaim their staging and unregistered recoveries.
iPhone build 2611.11.6 is installed; four destinations match, but full preservation remains
unverified after encrypted-cache readback differed and the app was observed running outside
the installer launch flow. Keep its pre-update recovery. Mnemosyne capture resumed per its
owner. These observations supersede the older device-status paragraphs below.

Clickable chat references now cover plain question headings, answers, queues and fallback
prompts across desktop/web/iOS source. Shared owner validation and existing routing remain;
native attributed text adds no WebKit instances. Thirteen focused JS regressions, desktop
question navigation/routing and web build pass. Native parser and iPhone simulator question-answer UI tests pass. This follow-up is not in the installed candidate. All wider rollout
holds and remaining original release work stay open.

The active `codex/nov11-life-ask` continuation incorporates the original release branch and
the corrective continuation. Life Ask source now covers admission, native ASR/filing, serial
engine execution, account-bound project placement, create-only iCloud mirrors, immediate
website push, desktop settings/scoped pairing, web/iPhone history and exact-chat notification
routing. Completed redundant execution payloads retire after 30 days; permanent replay receipts
and chat recordings remain. See [Life Ask](../../life-ask.md) for the contract and remaining
physical acceptance. No full-feature live acceptance or latency result is claimed.

The iPhone has 0.2.45 / 2611.11.5 from the earlier corrective source, with all 818 protected
files verified before launch, four saved destinations retained and two recovery generations.
It includes Incognito/clipboard/menu changes but not Life Ask. Launch needed a separately
recorded reactivation after the original process exited; the later process check passed.
Mnemosyne's owner reports its separate 0.6.1 (32) update installed and settings preserved;
fresh pendant capture is still pending. The phone operation has been released to that owner.

Build Mac still runs the earlier installed baseline: its update coordinator awaits a human
permission decision. The current native session check reports the Mac locked, so new signing
also waits for unlock. Pending source changes and tested candidates do not imply installation.
Website/other-target rollout holds remain. Updater-owned stale-job cleanup is not complete.

Native performance work now avoids metadata-triggered shell reconciliation and batches overview
removals; source-adjacent ordering and Incognito menus remain verified. Startup changes avoid
unchanged destination-index writes and loading dormant owners during background transitions.
The JavaScript suite passes 1,827 tests/four skips; website 115 tests/1,052 assertions; latest
native unit suite 246 tests plus foreground pairing and foreground/cold/background notification
UI. Actual iPhone frame-rate, cross-device full Life Ask acceptance,
the remaining original plan items and release closeout are still open.

The sections below retain earlier checkpoints; use the current implementation and private
rollout receipts for exact frozen artifact pins and operation state.

## November 12 continuation checkpoint

N11-06 now has a [folder discovery audit](folder-discovery-audit.md). A reproduced scope bug is
fixed: Files no longer inherits the default workspace's library/every-chat roots when another
workspace is selected. Forty-five focused file/remote tests, full 1,792-pass/four-skip regression
and static checks pass. This owner-side change requires the next desktop package; iPhone-only
deployment does not repair an old owner's root list. Picker redesign/visual comparison is open.

N11-07/N11-37 follow-up shares phone main-tab drawer actions with the wide tab strip, including
Incognito duplication and privacy icons. Private iOS app-menu copies use a local-only expiring
pasteboard and clear on close/startup without replacing a later user copy. Clipboard lifecycle
and private-session tests pass, as does native iPhone drawer menu/Incognito duplication acceptance.

Signed continuation Mac package validation and packaged Incognito close/crash/restart rehearsals
pass. The old checkout-local development output was retired after replacement verification
(about 847 MB measured free-space gain). Two redundant extracted Mac apps were retired after
complete equivalence checks against retained signed archives; no measured free-space gain from
that removal. Updater recovery cleanup still awaits installation through its coordinator.

N11-11 guided desktop setup is implemented with backend/destination selection, active-chat reuse,
stable retry identities and current remote management grants. Synthetic owner/relay and native
Engine Room checks pass; no real installer ran. Mac signing uses a native CoreGraphics session
probe; missing session records must be reported unavailable, never assumed locked.

Development packaging now uses one locked machine cache and keeps one verified generated output
across worktrees/flavors. Explicit release/updater paths remain outside cache retirement. Focused
failure, overlap, interruption, active-process and unsafe-entry regressions pass. The verified obsolete checkout-local `dist` output has been retired; the private release record
contains the exact inventory and retirement evidence.

N11-37 Incognito source now spans desktop/native iOS: independent memory-only sessions, generic
privacy previews, local titles/URLs only, new-tab/link/duplicate menus and no relay exposure.
Close and clean/crash restart rehearsals check cookies, local storage, disk markers and inventory.
Physical Incognito installation/acceptance is still pending.

The first corrective iPhone build 2611.11.3 from da4d443 is installed and launch-verified:
912 protected files hash-matched before launch; four destinations and existing keychain access
groups retained. Retention completed at two recovery generations, freeing about 262 MB.
Physical gestures, performance, reconnect and push remain unverified. It does not include the
later attachment/chat-link or Incognito batch. Build Mac corrective coordinator is still
awaiting a human tool approval; no new Mac install or updater recovery cleanup is claimed.


Additional source batch: normal question attachment counts/types with bounded original-byte
reads; strict Markdown/bare chat links routed through existing desktop/web/native handlers.
Node 1,774 pass/four skip, static/web build, eight iOS tests and Electron project/draft link
acceptance pass. Schedule/file links and physical acceptance remain unfinished. The first
corrective candidate is frozen separately; these additions are not claimed installed.

The operator now authorizes Build Mac and iPhone updates and real-load testing. Other rollout
targets remain held. The release stays open for the remaining features below.

Implemented since this handoff: N11-35 desktop slot-preserving New Tab conversion and Files
parent persistence; live browser-title precedence; audio/close control sizing; blank-page focus
limited to explicit creation; N11-36 digest-bound supersession of failed attempts and verified
two-generation rotation even when one historical data copy is damaged. Original update journals
remain immutable; compact retirement evidence survives payload deletion. No live Mac cleanup has
been applied yet. The next signed candidate must carry the corrected independent helper.

iOS source now batches thumbnail notifications, avoids per-card overview geometry during ordinary
scrolling, coalesces descriptor writes at two seconds with lifecycle drains, avoids shared-tab
reconciliation for local scroll bookmarks and preserves bookmarks through owner metadata refresh.
Ten simulator navigation/persistence tests pass. Physical iPhone acceptance remains open.

Full Node suite: 1,772 passed, four skipped, zero failures with canonical temporary paths; static
checks pass. Files/Terminal replacement, chat setup and audio/close geometry UI checks pass.
The isolated real-load desktop profile passes all six scenarios with zero frames over 50 ms and
no renderer errors. Its private copy was removed. Broader cross-window focus and physical-device
performance are not claimed as verified. See implementation for the current evidence.

The dated sections below describe the prior installed baseline, not this pending source build.

The release is **open**. The operator asked not to close it. Read
[the plan](../../2026-11-15-release-plan.md), [implementation](implementation.md) and
[rollout](rollout.md) first. Follow `docs/release-process.md` for any further build, install or
closeout work.

## Source and branch

- Branch `codex/nov11-release` (local, **not pushed**), 28 commits ahead of `main`. It merges
  the earlier `codex/nov10-desktop-draft-sync` work. `main` has not been changed.
- Last application source installed: `1ba46ec` (Mac, iPhone/iPad). Later commits are docs only.
- Version 0.2.45 is reserved once in `docs/releases/current.json`. Do not open another release.

## Installed now

| Target | Build | State |
| --- | --- | --- |
| Build Mac | `1ba46ece31e1+src.b81ea0ba77f4` | Installed via local developer candidate; owner health and navigation receipt verified. |
| iPhone 15 Pro Max | 0.2.45 / 2611.11.2 | Installed in place; preservation **qualified** (iOS relaunched the app during readback). |
| iPad Pro 13 (Mnemosyne) | 0.2.45 / 2611.11.2 | Same as iPhone. |
| Work Mac, Linux, Windows, web server, public downloads | — | Not started. Deployment beyond these devices is held by the operator. Nothing published to downloads.proteus.example. |

## Implemented in source (see plan entries)

N11-04 (desktop draft transport), N11-09 (desktop Chats scrolling), N11-10, N11-12, N11-13,
N11-17 (desktop scroll smoothness), N11-18 (no attachment type/size limits), N11-19
(human-readable times), N11-20/22 (iPhone address bar, search grid), N11-21/23/24/25 (iOS
cache/crash/background fixes, owner state 503s), N11-26–33 (iPhone chat and tab fixes, upload
progress), N11-34 (attachments viewable immediately).

## Not implemented

- Original Nov 10 items: N11-01, 02, 03, 05, 06, 07 (partly: iOS tab menu and Copy Proteus tab
  ID done), 08, 11.
- Life items: N11-14, 15, 16.
- N11-35: a new-tab type choice moves the tab to the end of the bar (queued 2026-11-12).
- N11-36: an owner-supported way to retire superseded rolled-back update attempts (queued
  2026-11-12). It blocks about 20 GB of Build Mac cleanup.
- Web and iOS Chats-list page-scroll parity (N11-09 is desktop only).
- Question-reply attachments are still limited to four PNG/JPEG/WebP/text files (N11-18 follow-up).
- Reducing work done during iOS prewarm launches. Startup reads and rewrites caches, and iOS
  repeatedly relaunched Proteus during device captures.

## Still to verify (physical / live)

1. iPhone/iPad: open each app. Confirm it reconnects to Build Mac, opens on the last page,
   and that scrolling/typing feel smooth while a chat streams. Also confirm the jump-to-latest
   arrow, the composer caret, tab overview close/menu/thumbnails, pinch on an unloaded page,
   Files in projects, the upload progress UI, and photo viewing right after sending.
2. iPhone/iPad: the large gap under "Chat details & loaded context" (N11-26–32 open item). No
   cause was found from code; inspect the layout on a device.
3. Mac: functional Back/Forward history, pairing access, effective source selections and live
   photo delivery were not exercised. 2 of 200 reading positions and a few selections changed
   after the update and are unexplained.
4. Cross-device draft handoff (N11-04): the acceptance matrix in the plan has not been run.
5. Older harnesses fail identically on original code at outdated setup. They do not verify this
   release: `chat-history-ui`, `message-actions-ui`, `chat-ui`, `desktop-preview-ui`,
   `oct7-search-ui`, `chat-attachments-desktop-ui`, and iOS `RemoteUITests` browser cases.
   They are worth repairing.
6. 13 `npm test` failures exist on `main` too (temporary-path realpath, tmux, WAL copy, recovery
   helpers). They are environment-related baseline failures, not regressions.

## Cleanup still to do (no closeout yet)

- Updater maintenance on Build Mac. Disk is 99% full, with about 30 GiB free. See the
  section below.
- `dist/Proteus-darwin-arm64/Proteus.app` (signed local Mac build). The ad-hoc build from
  2026-11-11 was replaced by the update coordinator's signed build. Retire it per retention once
  no longer needed.
- `~/Source/ProteusWorkspace/nov11-ios-release` (Xcode derived data for device builds) and
  `release-artifacts/2026-11-11/universal-2611111` (superseded by `universal-2611112`).
- `~/Library/Caches/Proteus/AppleSimulatorBuild` simulator build cache. The iPhone 17 Pro
  simulator has the test-identity app installed.
- Private records live in `~/Source/ProteusWorkspace/release-records/2026-11-11/`: configs,
  authorizations, logs, `qualify-b2.py`, and removal receipts for incomplete iPad captures.
  Keep them outside Git.
- Temporary logs in `/tmp` (`ios-test*.log`, `npm-test*.log`, `live-*.json`) are disposable.
- Each device keeps exactly two registered recovery generations: iPhone `physical-2611111` and
  `physical-2611112`; iPad `physical-2611111r4` and `physical-2611112`. The three incomplete iPad
  captures were removed after acceptance.

## Build Mac updater maintenance (inspected 2026-11-12, read-only)

Maintenance plan `7a8ef570…` reports `canApply: false`. Seven older update jobs are in
`attention`, and nothing can be retired while they are unresolved. Every one of them is
superseded: later 0.2.44 and 0.2.45 updates completed. The owner refuses reconciliation outside
each job's **original chat** ("Reconcile this update from its original chat").

| Job | Version | Date | Failure | Candidate staging | Unregistered recovery | Original chat |
| --- | --- | --- | --- | --- | --- | --- |
| 38ae2ea3 | 0.2.29 | Oct 24 | Snapshot hit a non-ordinary file | 0.6 GB | — | 9d3c7d1e |
| 352b9fb7 | 0.2.39 | Nov 1 | Previous owner had not released its data home | 0.7 GB | 1.2 GB | 67d49252 |
| 731f88bf | 0.2.41 | Nov 3 | Host identity/recovery barrier timeout | 0.7 GB | 2.1 GB | c4f4d452 |
| f21a8153 | 0.2.43 | Nov 6–7 | Previous owner had not released its data home | 0.8 GB | 2.1 GB | fd920932 |
| 53bdcfc5 | 0.2.44 | Nov 8 | Barrier timeout (owner-request-failed) | 0.8 GB | 3.2 GB | c62423bd |
| d537cecb | 0.2.44 | Nov 8 | Barrier timeout (same package as 53bdcfc5) | 0.8 GB | 3.2 GB | c62423bd |
| 05501b7b | 0.2.44 | Nov 8–9 | Barrier timeout (owner-request-timeout) | 0.8 GB | 3.2 GB | c62423bd |

Totals: about 5.2 GB of candidate staging and 15 GB of unregistered recoveries, so about 20 GB
could be reclaimed. Six jobs have a recovery folder; 38ae2ea3 failed before it captured one.

Registered recovery generations (two, which is the policy limit):

- `df1bb5eb`: Nov 12 01:25, 4.3 GB, verified.
- `b316df86`: the latest 0.2.45 install, 4.5 GB. The full maintenance check reports
  **"Recovery data differs from its receipt"**, while the storage listing marks it verified.
  Investigate this before retiring `df1bb5eb` or relying on `b316df86` for rollback.

Result of the 2026-11-12 cleanup attempt (operator-authorized):

- Every original chat was asked to reconcile its job.
- The owner rejected 352b9fb7, f21a8153, 53bdcfc5, d537cecb and 05501b7b with "Only a reviewed
  post-install recovery-checksum attention job with verified health can be reconciled."
- 731f88bf got "Reconciliation requires an idle installed updater" because the chats ran at the
  same time. Its type is also unsupported.
- The 38ae2ea3 chat (Oct 23 release) is waiting for the operator to answer a Safari MCP
  connection prompt.
- Nothing was applied and 0 bytes were freed. The owner has no supported path for rolled-back
  attempts; that is now **N11-36** in the plan.

Path to cleanup once N11-36 ships:

1. In each original chat (four chats, plus `c62423bd`, which owns three jobs), run
   `reconciliation` and then `reconcile` for its job. This needs the operator's authorization
   per chat.
2. Run a fresh `maintenance` and then `maintain` with the unchanged `planDigest` to retire the
   eligible staging and recoveries.
3. Report the actual change in free space.

Never delete these folders directly in the file system.

## Process notes for the next agent

- Physical device phases: `~/Source/ProteusWorkspace/release-records/2026-11-11/device-phase-*.py`
  wraps `oct29-mobile-update.py`, which requires an unlocked Mac and device. iOS prewarm
  relaunches Proteus. A capture that fails after the source changed needs a new generation, and
  partial copies must be preserved and moved aside for review. A readback that fails only on
  relaunch can use the `qualify-b2.py` pattern, which records the limitation explicitly.
- Mac installs go through a `purpose:update` coordinator chat on Build Mac. It builds with
  the existing Apple Development identity (team TEAMID0000) and installs a local developer
  candidate. It waits for the coordinating chat to go idle.
- Scroll profiling: `test/scroll-smoothness-profile.mjs` (synthetic, `--live-copy`,
  `--executable`, `--main-profile`) together with `scripts/prepare-load-test-copy.mjs`. Delete
  any live copy afterwards.

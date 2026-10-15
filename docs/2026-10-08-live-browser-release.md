# Live browser and native design release work

Status: 0.2.9 (native 2610.9.1) rollout authorized for both Macs, iPad and iPhone. The operator
approved the green native previews. Source builds preserve the earlier dirty 0.2.8 changes;
per-target installation receipts are recorded below as each target completes. Website changes
are source-verified; the latest deployment request names the four native/desktop devices.

## Scope and verification

| Item | Implementation | Verification |
| --- | --- | --- |
| 07 pinned Chat tab | Chat outside child scrolling on desktop/web/native | Web overflow geometry; native navigation; desktop UI exercises |
| 08 per-page find | Loaded DOM/Markdown ranges, Electron browser find, native chat/Markdown and WebKit browser/HTML find | Desktop/web literal and phrase matches, next/previous, iPhone/iPad 11-match chat navigation; coverage limits below |
| 09 draft retention | Pending answers scoped by chat/request; ordinary and Live Browser drafts independent; successful sends preserve newer typing | Desktop pending/ordinary navigation; iPhone/iPad Live Browser switching retains both pending answer and browser instruction |
| 10 agent cursor | Real mouse input and field bounds; isolated noninteractive overlay | Electron click/fill coordinates, timed cleanup, release/unload/revocation |
| 11 Live Browser | Separate device grant; bounded encrypted captures; follow/manual, freeze, zoom, points, instructions and pending decisions | Protocol authorization/expiry/revocation tests, actual Electron JPEG capture, web viewer, native paired-host simulator fixtures |
| 12 native green design | Forest-green surfaces, matching icon meanings, one iPad brand, collapsed activity | iPhone/iPad Chat, Life, Team, Engine Room previews captured; operator approved |
| 13 iPad list navigation | Cached selected chat no longer triggers navigation | Repeated Chats sidebar selection stays on list |
| 14 recents and running | Seven recents per category, running sidebar pulse/list spinner, reduced-motion support | Source checks and UI smoke coverage; installed multi-host acceptance pending |
| 15 Claude catalogs | Read-only selected/newer runtime and fresh metadata comparison | HC upgraded to 2.1.295 while idle; fresh CLI/API expose 13 models including 5.5; operator confirms Providers refresh fixes stale picker |
| 16 web chat layout | Full workspace width; inline Queue/Stop in desktop colors; Stop absent for queued/completed | Isolated wide web UI geometry, styles and status transitions pass |

## Validation evidence

- `npm test`: 395/395 pass, including cache bounds, stale/frame/chat identity, invalid coordinates,
  grant revocation during capture and encrypted paired-client instruction checks.
- `npm run check`: passes.
- Website asset build and Pint: pass.
- `node test/web-remote-ui.mjs`: passes with live viewer, frozen-frame revocation, retained draft,
  find, pinned overflow, full-width composer and queued/completed Stop visibility assertions.
- `node test/account-queue-ui.mjs`: passes with focused pending-answer dismissal, ordinary and
  pending drafts through navigation, queued edits and search ranges that preserve original DOM.
- `node test/postrelease-browser-ui.mjs`: passes with native find counts/navigation, actual browser
  captures (including nonblank hidden-tab and minimized-window captures), real input-coordinate
  overlay events, timed cleanup and existing lifecycle checks.
- iPad `testGreenDesignPreviewAndChatsListStability`: passes. The first subsequent Live Browser
  test stopped at pairing because an earlier saved main browser was selected. Explicit Home
  navigation corrected the test setup; `testLiveBrowserViewerAndDraftRetention` then passes.
- iPhone design/search and Live Browser/draft tests pass together on the final source, including
  the icon/button refinements. Both iPad and iPhone preserve unsent answers and instructions.

Synthetic hosts, temporary app data and simulator-only pairings isolate checks from production.
Screenshots and raw test artifacts remain outside this repository. Test runs emit a SwiftUI
state-during-view-update warning when restoring some browser state; its origin is not established
by these passing assertions. This remains a native follow-up, not a resolved warning claim.

## Host investigations

Read-only HC diagnostics found a pending user question occupying its configured single AI slot;
other chats therefore remain queued. A live provider process was present and no shutdown/failure
signal established a crashed runner. No application kill, restart, cancellation or replay was
performed. Resolve the pending request or make an explicit cancellation decision in that chat.
Workplace conversation content and identifiers are deliberately omitted here.

Historical observation before the October 9 upgrade: the selected older HC Claude runtime reports older model metadata. Its newer installed runtime
reports updated versions, but a fresh probe still returns fewer models than the same-version
Personal runtime. This establishes a host/provider metadata difference, not a renderer-generated
catalog; the account/environment cause of differing breadth remains unproven. Changing runtime
also changes HC's advertised default, so no implicit selection change was made.

## Remaining acceptance and coverage

- Native design is approved. Four-device deployment is authorized; see the per-target receipt below.
- Find counts describe loaded, searchable content. Closed tool activity, canvas terminals and
  isolated web HTML preview contents are excluded; unloaded chat history is labelled as loaded.
  Native chat search covers rendered messages, not tool internals or every native form. Native
  HTML uses WebKit's navigator, but its individual UI flow has not been exercised in this batch.
- Live Browser synthetic coverage does not certify production relay bandwidth, multiple slow
  physical clients, locked/asleep Macs, protected media capture or an actual provider decision.
  Direct remote mouse/keyboard takeover is deferred. Points provide frame-bound context only.
- Device viewing access is disabled unless granted separately by the Mac operator. Agent access
  alone does not grant remote viewing, and viewing does not grant agent control.
- Preserve prior 0.2.8 release receipts and edits. Signing, protected data and launched versions must be checked separately from source tests.

## Existing backlog boundaries

Reconcile earlier delivered work against its ledger; do not reinterpret old queued prose as proof
that a released feature is missing. Projects remain explicitly deferred. Independent identity/
resource probes and credential isolation still depend on provider support; no account isolation
or enterprise access verification is claimed by this UI/browser batch.

## October 9 follow-ups and rollout

- Content-edge native swipes return to Chats beside the iPad sidebar and on iPhone. Browser history
  consumes back/forward first. Both simulator flows pass; iPhone also verifies vertical scrolling
  and unsent-draft retention through list/reopen.
- Web setup retains open/closed state through repeated background notifications and provider changes;
  the final full isolated web suite passes, including label/spacing checks.
- Desktop trusted-wheel fixtures verify short gesture rejection, chat close/forward reopen with its
  draft, native browser history back/forward precedence, and root close/reopen. Input/momentum guards pass in the final fixture.
  A first fixture retry failed at an unrelated scrolled overview Done control; Escape closes the
  tested overview before the gesture flow. Physical trackpad feel remains distinct from injected input.
- HC Claude was upgraded from 2.1.246 to 2.1.295 without restarting Proteus or interrupting a turn.
  Fresh raw CLI and app API now agree on 13 models including Sonnet 5.5. The operator refreshed
  Providers and confirms the picker is correct. No extra new-chat refresh mechanism is requested.
  Runtime Default currently resolves to Sonnet 5.5; no configured model choice was changed.

### Installed targets

- Build Mac: 0.2.9 running; original signature, 24 protected files and pairing authority verified.
  Build `ec8b213d382e+dirty.7c7393c81d75`, source fingerprint
  `7c7393c81d759fda4a321bb99ea570c614ded998975193bf3cb5306fca6e6543`.
  Cold app/data backups and the original 0.2.8 app remain available privately. All 161 runtime
  files are pinned. Signed package launch, vendor signatures and isolated profile smoke pass.
- iPad and iPhone: signed 0.2.9 (2610.9.1) installed in place and independently observed running.
  Seven app-data/preferences files per device were byte-identical before first launch. Original
  signing requirement is preserved; existing development profile expires October 10 at 23:29 UTC.
  A backup attempt first stopped at an empty Documents destination; creating that directory fixed
  the backup. A launch command ordering error was corrected without reinstalling iPad. Versioned
  bundle names required the process assertion to match the actual installed executable name.
- HC: exact signed 0.2.8 baseline verified by its owning Codex chat. The delta reconstructs all
  5,535 app entries with original signature; archive SHA-256
  `97a480838fd0fe072de1bb08628b002578d90d85fd2067703e9a339fc5d28b11`.
  The operator explicitly approved the private repository artifact transfer after the initial
  automatic review hold. Artifact commit `a4d6c0ae4417134cb63e918d17cd0f75a44724dc` is uploaded
  on `codex/signed-proteus-029-7c7393c`. HC installed and launched 0.2.9 after a clean idle-guarded
  shutdown and verified cold backup. App data was byte-identical through replacement. Original
  signer, all 161 runtime files and all 5,535 bundle entries pass verification. Saved tabs/history,
  credentials, schedules, pairings and grants are preserved. The window renders normally, relay
  is online, and all three providers pass fresh catalog/allowance checks. Normal startup differences
  were a context-refresh timestamp, recreated browser process IDs and one New tab title hydrated
  from its saved hostname. Verified rollback backups and completion receipt remain privately on HC.
  Live Browser and physical trackpad behavior are not newly verified on HC.
- Website: source/UI verified, not deployed in this four-device rollout.

Final Node suite: 395/395 pass; static checks and whitespace checks (excluding the existing bundled
Markdown runtime string whitespace) pass. Private deployment receipts stay outside the repository.

### Authorized local cleanup after rollout

The operator approved deleting older/rebuildable Build Mac artifacts to relieve disk pressure.
Removed 23 temporary native test-build directories, seven transfer/reconstruction copies, the older
0.2.8-release Mac backup, older mobile backup, and duplicate 0.2.7 rollback app. Actual free space
rose from 1.08 to 7.35 GiB (6.27 GiB recovered). The latest 0.2.9-update cold Mac backup, latest
mobile backup, installed 0.2.9 app and 0.2.8 rollback app remain. Published signed artifact commits
and standalone test logs/screenshots remain available; deleted temporary test bundles are no longer
local evidence. A private cleanup receipt lists exact removed and retained paths. HC was untouched.

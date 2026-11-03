## Nov 2 R33 — update preservation correction

- Finish renderer checkpoints before capturing update preservation, and retain document chat associations in saved window/Team tabs. Keep all identity, data and idle guards; report a bounded recovery-check reason on timeout.

## Nov 2 — 0.2.41 candidate

- Preserve the idle message anchor when preceding content finishes sizing after a history prepend; retain native gesture ownership and reading state across reopen.

- Nov 2 R32: keep chat subscriptions with their visible native view; isolate full, summary and incremental delivery per client, merge indexed streaming patches without losing history, and count bounded wire bytes by packet kind. Production bandwidth acceptance follows deployment.

- Nov 2 R31: preserve an owner-rejected expired tab request in encrypted review state so it cannot indefinitely suppress fresh membership reads; keep uncertain retries unchanged. Add bounded, content-free reconciliation attempt diagnostics. Live iPhone General verification remains pending.

- Nov 2 R30 follow-up: apply mobile project membership before optional browser-history paging while retaining matching complete histories; move desktop draft sync/conflict status into the chat header. Source validation and physical rollout remain separate.

- Nov 2 R29: pace encrypted host and native request bursts, avoid replaying obsolete state snapshots, isolate overloaded clients through negotiated relay control, measure bounded wire traffic/close codes, and resume a visible project’s suspended owner without changing computer selection. Live rollout and stability acceptance follow.

- Scope native tab management to the selected project and reconcile owner snapshots after reconnect, including earlier cache incarnations; retain other projects and unconfirmed mutation identities.

- Restore expandable project recents, paging and right-side totals while leaving additional open-tab navigation lists removed.

- Nov 2 R26: keep native question answer fields and controls inside their message card, with a visible label and bounded action layout. Correct native reading restoration across rendered history windows, defer commands/prepends during momentum, coalesce viewport reporting and retain bounded reading bookmarks across launches. Phone/tablet simulator acceptance passes and the local physical clients are updated for review.

- Expose scoped, revision-checked owner scheduler controls with durable serial test receipts, status, exact stop/retry and explicit captured/future source refresh; retain paused/native ownership and constrained permissions.
- Honor explicitly selected schedule MCPs with excluded defaults, preserving unrelated-default and disabled-source isolation.

- Carry explicit queued next-turn model choices through chat-control tasks and the executing owner; validate catalogs and scope, preserve saved schedules, and expose requested versus captured selections.

- Clear reviewed questions from the open queue while retaining the original card, draft and ability to answer later; synchronize review state without resolving waits or approvals.

- Stop the native tab overview feeding tile geometry into parent layout; center the initial selection once so scrolling can settle.

- Reduce scroll-time owner work by sharing profile reads within each projection, sending only activity timestamps, and avoiding full-state reloads for streamed text; preserve account/permission freshness and push-loss fallback.

- Complete address prefixes with history-ranked website origins: Enter opens, Tab accepts a trailing slash for continued paths.
- Show saved profile-scoped site icons beside address/history rows without fetching sites.

- Synchronize shared setup slots plus setup/reply text with revision conflict recovery; keep attachments and run choices local.
- Add window-local tab muting and a live speaker indicator before ×; retain visual website notifications when muted.

- Use one shared project tab layer, no chat-nested resource strip or sidebar resources. Keep app tabs window-local: phone sidebar/overview, tablet/desktop top strip.
- Retain unloaded-page navigation, remove redundant bottom spacing and the extra Chat / Live browser plus.
- Apply owner membership despite history failures; handle Close/rename pushes, overlapping reads and reconnect while preserving drafts/uncertain receipts.
- Recover intranet parsing, consented attachment-only input, concise questions/shared Enter handling, native answer attachments, ordered file viewers/dates, autoplay and continuation controls.
- Capture authenticated submitting-window origin for agent placement without changing access; verify two actual synthetic Electron windows.
- Hold new release packaging and physical rollout for both simulator previews.

- Restore full browser layout during same-tab redraws while retaining address drafts.
- Expose extension action-popup contexts through Chrome's runtime context API, and suppress vendor API payload logging.
- Settle uncertain desktop input only after the exact missing window is corroborated by a fresh complete process inventory; new input still needs a new observation.
- Identify local inference choices by machine and adapter, preserving source IDs and offline saved choices.
- Open mobile New chat in an independent tab with retained draft, attachment scope and retry identity.
- Hydrate mounted model pickers from refreshed owner catalogs, and distinguish Copilot Auto from unadvertised Fusion.
- Keep external-link destination selection through focus changes and avoid a native source-icon lookup crash. Internal links retain their originating project.
- Send inline question answers with Enter; retain Shift+Enter newlines and omit repeated card headings already shown in the transcript.

Implementation and validation are tracked in [the release record](docs/releases/2026-11-02/implementation.md); no installation is claimed by these source changes.

## Nov 1 — 0.2.40 (closed)

- Normalize private release/test evidence and historical notes; retire approved duplicate payloads/worktrees while retaining shared dependencies and immutable failure receipts.

- Reconcile a reviewed post-install recovery-checksum failure through the owner maintenance
  boundary, preserving its original journal and failure evidence before eligible cleanup.

- Inspect recovery SQLite history through verified disposable copies; never connect to frozen
  originals, since read-only connections can still create sidecars and break recovery checksums.

- Sync the iOS project sidebar from canonical tab membership and order; retain explicit offline
  actions and retry identities without resurrecting closed chats or replaying inferred deletions.
- Preserve notification occurrence time, suppress stale/read alerts and expire native banner
  bursts after five seconds without replaying historical queues.
- Correct extension window identity, active-tab filtering and authentication-window lifecycle.
- Persist narrowly scoped owner preflight authorization for user-started update coordinators.
- Preserve newly opened local tabs while applying an older owner membership response; only
  owner-confirmed removed identities can close during that partial reconciliation.
- All-platform rollout is authorized; deployment/live verification remains in progress.

## November 1 historical local candidate — initially held

- Coordinate project-scoped native build chats separately from destination-default installation chats; compare navigation identities/order/descriptors in update preservation receipts.
- Display the named release date on desktop, web and iOS Home.
- Show owner-advertised local/shared model providers in native chat/schedule pickers and project actual adapter capabilities to remote clients.

- Prevent stale project views/outboxes from reviving closed tabs; retain owner close revisions and allow reviewed explicit reopen. Isolate unavailable document sources so other tabs keep syncing.
- Require explicit shared Close intent; preserve chat children across alias changes, parent closure and restart without ending their terminal sessions.
- Keep browser bounds current when its content area changes without a window resize or tab switch.
- Bound background integration work, avoid repeated global scans, skip dormant sessions before context hashing, and retain fresh configuration/session validation. Move background fsync/replacement off the input loop while ordering concurrent manual saves and draining writes at Close.
- Local source/UI validation only at this checkpoint; package acceptance and affected-HC observation remain separate.

# HC handoff — November 1 responsiveness diagnosis

- Profiled recurring desktop stalls and documented the required integration-health batching,
  scoped verification and event-loop yielding in the [release plan](docs/2026-11-01-release-plan.md).
  Added a provider-free synthetic profiling probe. This records the diagnosis preceding the
  local implementation above; deployment and affected-device observation remain held.

## 0.2.39 — October thirtieth release, combined October 31 candidate

Combines the [October 31 Fusion/layout plan](docs/2026-10-31-release-plan.md) and R15/R16 from the [open release plan](docs/2026-10-30-release-plan.md). Source validation and new native package acceptance precede deployment.

- Preserve exact accepted native payload bytes when signing on another platform, checking the full source pin, payload hash and existing publisher trust.

- Add **Copilot Fusion** to Copilot chats when the account's runtime advertises Fusion routing tiers.
  Choose Copilot Fusion and a Fusion effort (advertised names such as Standard/High/Max) in every
  model picker. Unavailable tiers show their reasons, and unavailable accounts get a clear message.
- Record exactly which models each Fusion turn used: planned models, every executed phase (role,
  model, effort, status, duration, usage), per-model requests, the model that wrote the answer, and
  turn totals. Shown under each answer on desktop, remote views, the website and iOS, with per-model
  totals in Run details. Planned-but-unrun models are never shown as used, and drafts are never stored.
- Upgrade `@github/copilot-sdk` to 1.0.28 on every platform.
- Remote computers: workspace project pages and rows match the local layout; the remote new-chat
  composer uses the same compact model controls as local (no inapplicable Context, one line); and
  source folders list the remote workspace's folders instead of an empty box. Website project rows
  match the desktop layout and gain New chat.

### Relay-based shared local models

- Add opt-in llama.cpp/MTPLX sharing with per-device grants and shared-provider imports in Providers.
- Keep chats, tools and approvals on the consumer; send only inference over the existing encrypted relay.
- Add bounded queues, Stop propagation, durable no-replay receipts and interrupted-request recovery.

### llama.cpp provider

- Add a Windows-capable llama.cpp provider with authenticated HTTPS, optional per-connection CA trust, live model controls and exact server token accounting.
- Reuse local tool approvals, selected MCPs, cancellation, usage and delivered-history recovery; expose the provider in Providers and New Chat.

## 0.2.39 — October thirtieth release open

- Include native build sources in source companions. With accepted provenance, preserve exact
  native line endings and recorded generated inputs while rejecting changed inputs and secrets.
- Prepare the pinned Electron binary serially before Windows source tests, avoiding competing
  lazy installers. Wait for fixture helpers to exit before removing their native test directories.
- Keep inherited Crashpad pipes out of update-helper children so Windows readiness cannot
  write into the immutable staged package. Preserve ordinary launch context and full integrity checks.
- Accept website notification events on the shared service, preserve site sound choices and
  suppress duplicate, muted or stale mobile alerts. iPhone/iPad notification taps retain the
  original event ID and can open its source tab on the paired desktop.
- Bind full publication source commits by verifying every packaged runtime/build input.
  Keep simulator test installs under a separate application identity.
- Show observed certificate information directly on bad-certificate pages, independently of
  one-click acceptance. Restore the original notification colors; error pages follow the app theme.
- Add a digest-guarded Windows builder refresh for a removed provider Node runtime, preserving
  the existing source, npm, Git and publisher-key references with private repair receipts.
- Recognize intranet host:port input, retain custom ports in error pages, explain network-access
  failures and declare Mac local-network use. Add one-click certificate acceptance on the app-themed error
  page. Native acceptance passes; reported installed-browser connectivity remains unverified.
- Preserve a pending update handoff when another chat receives owner-delivered task feedback.
  Keep human-input cancellation, updating-chat checkpoint review and all active-work idle barriers.
- Add configurable shared chat/document memory limits and idle eviction in Resources. Reload
  evicted transcripts to the saved message/offset; preserve drafts, approvals and terminal sessions.
- Route actual permitted website page notifications through the common history/native mechanism,
  preserving source text and silent intent. Add explicit device forwarding and safe retry retention;
  server/iPhone background delivery and actual Slack acceptance remain pending after HC verification.
- Add Emerald Canopy and white Daylight presets in Colors with durable application selection.
- Quiet routine notices by default, deduplicate actionable requests, retire answered alerts,
  bound banner queues and acknowledge the Needs attention list with Clear all.
- Scope remembered Proteus conversation access approvals to the granted host/actions/resources.
- Keep shared tab membership/order converging during a quarantined navigation conflict.
- Restrict autoplay exceptions to deliberate video playback rather than any prior page click.
- Surface Copilot Fusion availability and native phase/attribution receipts. This account's
  refreshed catalog advertises no Fusion model; real Fusion execution remains unavailable.
- Reserve one version per named release and keep repository plan, implementation and machine
  rollout records; codify main/PR/push/branch/worktree closeout and bounded retention.
- Stage one current public package set across platforms, advertise pending targets with empty
  catalogs, and verify digest-bound retirement of superseded public release payloads.
- Start pinned remote update coordinators using destination defaults. Return chat-specific owner
  update receipts and keep monitoring beyond the pre-restart completed model turn.
- Preserve additional migration/test instructions in the pinned coordinator request.
- Windows and both physical iOS devices are installed with their recorded acceptance qualifications.
  The website is deployed and verified; the signed Windows public downloads and current descriptor
  verify. Final corrective Macs, Linux/Ian approvals and release closeout remain pending.
## Windows startup troubleshooting

- Document native inherited profile grants that can make taskbar startup fail while a sandboxed direct launch succeeds. Preserve strict private-storage validation.

## 0.2.38 — release work closed

The operator closed this release cycle independently of device rollout. Source and accepted private artifacts are retained; see [closeout](docs/2026-10-30-release-closeout.md).

- Make every open view adopt the owner's logical tab membership and order, including inactive roots and legacy chat aliases. Keep local selection, drafts and scroll independent.
- Restore saved windows with current missing descriptors and owner order. Preserve complete Back/Forward history through the owner service; reject changing/incomplete history without replacing the layout.
- Adopt owner-committed browser moves without replaying visits or incidental native order. Preserve typed navigation conflicts across local HTTP so an acknowledged title update cannot stall synchronization.
- Source validation: 1,316 tests pass, four skip; static checks and disposable native multiwindow, restore/restart, legacy-chat and 451-entry history acceptance pass. No deployment or HC data changes.

## Planned October 30 — requests only

Collection started; these items are not implemented. See the
[release plan](docs/2026-10-30-release-plan.md).

- Integrate Copilot Fusion after verifying supported provider capabilities.
- Catalog the green default as Emerald Canopy and add a white Daylight theme in Colors. Preserve
  saved theme choices and custom colors through application updates.
- Reduce notification interruptions, correct false/stale “Needs you” notices, deduplicate alerts,
  and fix reported five-second expiry or queue-backlog behavior.
- Add **Clear all** to acknowledge the entire Needs attention list in one action, preserving
  actual pending questions/approvals and allowing genuinely new attention events to appear.
- Fix the reported browser regression where videos autoplay despite enabled video-autoplay blocking.
- Apply Auto-approve tools and scope-aware remembered approvals to Proteus actions, including
  `proteus_chats`, without repeated prompts for matching approved scopes.
- Fix shared workspace/project tab-list divergence across windows. Keep tab strips, sidebars,
  Tabs tables, counts and shared metadata consistent whichever window is used, including Close.

## 0.2.37 — Windows candidate

Windows x64 source and exact-package acceptance passed; tested files were privately delivered
for manual installation. Other-platform rollout and public stable-feed activation remain separate.

- Add managed-computer mode for one-way family Windows/Mac administration. Block outgoing computer access while retaining incoming workspace/project/tab/chat management and feedback bound to the originating chat. Add scoped management invitations and remote computer-role controls.
- Keep open workspace/project tab lists and history synchronized across windows even while a different project is selected. Local selection and reading positions remain independent; paired-computer presentation following is retained.
- Keep dormant mirrored Persist tabs unloaded until selected or explicitly loaded, including passive persistence updates.
- Add **Find tabs in saved windows…** under Engine Room → Windows. Review retained local sessions, restore missing logical tabs and preserve alternative history in separate tabs without replacing current navigation. Legacy records cannot establish whether an absent tab was intentionally closed.
- Prevent website and extension JavaScript alerts/confirms from opening native sheets over the Proteus window. Suppressed confirms return false; page-owned HTML dialogs and Proteus approvals remain available.
- Add **Copy tab ID** immediately above **Persist tab** in a browser tab's right-click menu, copying the clicked tab's browser-tool ID without changing its selection, persistence or sharing.

## 0.2.36 — Combined client release

### web palette

- Resolve website sidebar surfaces, selected groups, highlights and dividers through the shared desktop palette. Navigation styling no longer overrides the browser's palette with sampled hard-coded colors.
- Paint the website canvas with its selected palette instead of leaving the root background visible.

### chat access and web question attachments

- Let Proteus chat access requests follow the originating chat/workspace's Auto-approve tools setting for the exact requested scope. Ask and Saved rules still prompt; mandatory approvals and human browser/terminal sharing keep their existing boundaries.
- Support attachments in chronological website question cards, with shared file previews/consent styling. Keep uploads and answers bound to the selected computer through navigation and uncertain retries.

### notifications preserve the foreground app

- Show native in-app notifications only in their already-focused Proteus window. Background notices no longer raise the app over other applications; expired notices stay dismissed when you return.

### question answer layout

- Compact inline question forms: place the attachment + and Send answer together immediately below the answer box, with Send answer aligned right. Empty attachment strips reserve no space; selected files wrap above the controls.

### iOS navigation and swipes

- Preserve durable tab/history mutation identities while saving encrypted caches off the main thread. Wait asynchronously for the atomic save before sending an owner mutation, retain failed writes for retry, and drain caches on background/account changes.
- **iOS real-host connection:** iPhone/iPad accept relay messages up to the 8 MB host/relay limit. URLSession's 1 MiB websocket default dropped the socket ("Message too long") once a real host's state grew past it, so devices stayed "offline · reconnecting".
- **iOS chat and project chrome:** chats have no header bar. Copy link, rename, move, promote, archive and delete are on the chat's tab (press and hold) in the project bar, the chat's own tab row and the iPad top strip. The sidebar button leads the project/workspace tab bar on iPhone and iPad (it leaves the iPad top bar while a workspace tab is open); the iPhone system header with its large glass buttons is gone. The project home tab scrolls with its tabs instead of staying pinned.
- **iOS swipes:** edge swipes are interactive everywhere, like Safari: the page follows your finger over an image of where you're going (the previous or next web page, the project home or the workspace), then settles or springs back. Browsers, project tabs (back to the project home, and forward to the last tab), iPad project ↔ workspace and iPad chats use it, and it works beside a pinned iPad sidebar. Edge swipes take priority over scrolling and tab strips under the edge. Forward edge swipes also reopen the last project from its workspace and the last workspace from the list. The sidebar opens only from its button.
- **iOS smoothness:** sidebar, Home and drawer data no longer rebuild expensively on the main thread on every redraw (cached date parsing, one attention title index per host, one validated project catalog per host state), and encrypted history/tab caches save on a background writer. A real-data iPhone walkthrough went from 32 potential hangs to none.
- **Tab overviews:** each project section on desktop and iOS starts with a fixed Project home card; the web overview lists a Project home entry for each project of an open workspace.

### execution safeguards and Claude continuation

- Raise Claude/Copilot's active-execution budget and the shared no-progress interruption threshold from 30 minutes to two hours. Human input waits remain excluded; the five-minute progress warning does not stop work.
- Classify Claude execution timeouts explicitly and offer same-session Continue and opt-in automatic continuation, bounded to three consecutive retries. Preserve queued input and wait for old-process cleanup; Stop, permission changes and pending input take precedence.
- Match Claude results to the exact replayed input UUID so a startup/orphan notification cannot silently consume a follow-up. Keep Claude alive through intermediate responses while native background jobs/monitors remain pending, then await their terminal notifications and final reporting. No uncertain input is automatically resent.

### desktop responsiveness

- Move permission-display filesystem checks, context hashing and HTTP state serialization to a bounded background worker. Coalesce simultaneous window refreshes, discard results invalidated by permission/schedule changes, and time out failed workers without blocking the owner. Actual authorization remains fresh and owner-controlled. Add separate capture, transfer and worker diagnostics. Exact-package acceptance passes; installed desktop performance remains a separate rollout check.

## 0.2.35 — Windows restart preservation follow-up

- Preserve a saved local chat view when its project already has a tab registry but never registered that view. Keep its view identity, selected project child and draft across reload without reopening owner tabs; an observed owner close still takes effect.
- Bind Windows build workers and their npm lifecycle children to the configured Node/Git search paths, including Windows `Path`/`PATH` normalization, without changing the user's global environment.
- Provide each Windows build a private npm command bound to its configured CLI, so packaging works with a Corepack cache that has no usable globally installed npm shim. Preserve the CLI's exit status.
- Reconcile a launched build worker that exits before its first progress update as needing attention, preserving its original journal and allowing inspected cancellation without replay.
- Archive full recovery receipts and a bound retirement intent before maintenance deletes a generation. Detect interrupted retirement before treating any missing directory as historical loss; preserve the original evidence and block automatic replay.
- Record the installed 0.2.34 maintenance bootstrap and public-consumer acceptance separately from the held stable-feed activation and follow-up installation.

## Windows distribution repair — October 29

- Added bounded updater maintenance with full recovery verification, preserved missing-generation history, plan revision protection and two-generation cleanup.
- Added a designated Windows build operation with signed release lookup before building, durable operation receipts, private source/toolchain/key references and no elevated shell requirement.
- Added a reusable native build/acceptance/signing runner and documented older-client bootstrap and installer qualification boundaries.
- Candidate helpers now verify complete package identity before acknowledging restart readiness and retain integrity evidence outside disposable staging. Native release acceptance also checks that startup leaves the extracted package unchanged.
- Rollback keeps the original failure and phase in durable receipts, update status and the continuation checkpoint, even after recovery clears the current error.
- Preserve both existing recoveries until the next complete application/data snapshot and live outcome verify. Then retire only the oldest verified generation, retaining compact retirement evidence and exactly two full recoveries.

## 0.2.33 — October 28 follow-up

- Share canonical path checks across inherited working-folder, schedule, chat and automatic provider-folder displays within one synchronous state snapshot. Large saved-chat lists no longer repeat the same filesystem checks thousands of times. Actual tool authorization and later requests continue to resolve paths freshly.
- Keep the first blank browser tab opened from a populated top tab strip until its owner accepts the creation. This fixes a tab disappearing during initial synchronization after leaving a project, including the empty-strip double-click gesture.
- Add explicit opt-in simulator acceptance for live-owner pairing and normal cold-start reconnect, without resetting saved destinations or sending chat messages. Both checks pass on phone and tablet.

## 0.2.32 — October 27 release requests

- **Responsiveness:** chat saves during a running turn are coalesced and written off the UI thread; streaming and mid-turn activity no longer make every window rebuild full owner state; windows share one state build per change; device sync is throttled while chats stream. On a synthetic three-window streaming workload, full-state rebuilds fell from 87 to 9 and p99 main-thread lag from about 23 ms to about 10 ms.
- **iPhone/iPad navigation:** a chat always opens inside its workspace/project as a named project tab; only unassigned chats stay top-level. One saved selection per project drives the tab strip, sidebar and conversation, fixing chats that would not switch. The top tab strips stay; the iPhone drawer and iPad sidebar also list the active project's open tabs. Project chats get a slim header with chat actions on both idioms.
- **iOS smoothness:** relay messages are decrypted and decoded off the main thread; host state uses per-property observation so one streaming chat no longer redraws the whole app; hidden project views stop polling. The Tabs manager fits one line per tab.
- **Browser:** links to other apps (Zoom, Teams, Slack, mail) ask “Open … ?” with an optional per-site always-allow, then open the app. Link menus list every profile Default first with + icons and consistent casing; address-bar and page edit menus have icons. Sending tabs or chats to another project keeps you where you are. Verified OAuth loopback redirects and form posts reach the local callback exactly.
- **Link picker:** prefers the window already showing the chosen project; SafariSelector-style default destination (fixed or last chosen), countdown and click-away handling, source-app name and icon, row icons and Default badge.
- **Recovery and approvals:** when a provider cannot run a selected agent, one action turns it off for the chat and resends the original request. User-started update chats no longer ask for `proteus_update`. A chat's own chosen working folders are trusted like workspace folders; source-only folders remain gated. Claude steering adds the message to the running session instead of interrupting it.
- **Attachments and notifications:** files delivered in a chat are kept with it and can be opened on desktop, remote computers, web and iOS (inert previews or a saved copy). Notifications show the chat title, a short plain-text preview and the source computer, including through downloads.proteus.example push (website change requires deployment).
- **Desktop control and providers:** Updates and Home show Cua Driver/Peekaboo readiness with a guided setup chat; update chats check drivers after install. MTPLX is registered in the Mac app. Workspace source type filters now apply while searching.

## 0.2.31 — October 27 release

- Follow-up source correction: each manual update creates a fresh release-named coordinator chat from saved provider/model settings. Remove the old chat selector/checkpoint form, preserve update defaults when status fails, and guard rapid provider changes and uncertain start retries.
- Add consented attachments to inline asynchronous question answers. Permit supported queued attachments to steer immediately on the owning provider, including remote/native clients, while retaining uncertain-delivery receipts.
- Recognize a rotated historical recovery only when two newer retained receipts verify; unresolved missing recovery records remain explicit. Publish the corrected signed Mac package after full HTTPS, installed trust and official extraction checks; preserve the earlier immutable release. Use portable corresponding-source archives without host metadata sidecars.
- Add independent schedule configuration with category-selected workspace sources, canonical explicit folder grants and schedule-scoped approvals.
- Repair current Codex child lineage/approval routing; add scoped host delegation and inline read-only agent transcripts on desktop/iOS.
- Accept arbitrary attachments, convert large pasted text to bounded attachments, preserve safe rich paste, enlarge Internet Search and show question choices immediately.
- Improve selection-aware local speech, themed provider menus, profile link menus, fragment URL validation, navigation errors and page notifications.
- Add bounded Copilot active-time continuation, verify terminal sharing and coalesce redundant browser state projections.
- Repair native selection identity and stale-response handling; release inactive refresh tasks and show useful notification text.
- Publish the corrected signed Mac download and verify its full HTTPS archive, publisher trust and official extraction. Install the exact package through a new unassigned version-named coordinator, verifying live health, original chats/configuration and retained state after restart. Install and launch-verify corrected native build 2610.27.2 on iPhone/iPad, preserving protected files and saved destinations. Retain two recovery generations per target. Verify both Personal and Work Macs' existing Proteus identity as HTTP/HTTPS defaults. See exact acceptance and remaining Windows/feature-specific gates in the [release evidence](docs/2026-10-27-release-evidence.md).

## Planned — October 26 release

- Record the complete release implementation/validation plan, including read-only subagent conversations within the parent chat and inherited applicable authorization for delegated work. Feature implementation and deployment follow the operator's model switch.
- Reconcile Windows validation commits and retain two previously missing historical Linux acceptance reports; document obsolete local branch cleanup without removing worktree files.

## Documentation — Linux exact-commit installed acceptance

- Record native installation of `4b90654` / `linux.8808ae9c976b`, working Codex discovery with existing sign-in, relay/peer reconnection and restored interface verification.
- Verify cold session/browser/retry preservation and two recovery generations, retaining historical exceptions, explicit metadata qualifications and original audit/fixture failures.
- Keep broader UI fixture maintenance deferred; the older frozen396 package remains excluded.

## Unreleased — Linux Codex discovery

- Find the Linux desktop-bundled Codex executable when launched from KDE with a minimal PATH. Keep explicit executable overrides and PATH precedence, and reject non-executable automatic candidates.

## Unreleased — Windows validation paths

- Convert the legacy updater fixture's file URL to a native path before launching Node, and normalize the mocked Mac registration path for the test host. Production runtime and signed packages are unchanged.

## Unreleased — Windows terminal ownership

- Own Windows terminal descendants in a kill-on-close Job Object established before user commands run. Preserve output, input, resize, history and real natural exit codes; avoid the vendor's delayed numeric-PID cleanup.
- Include terminal startup and unconfirmed process cleanup in the update idle barrier. Failed cleanup retains its blocker until actual exit is confirmed.
- Compile the Windows terminal guardian only on the build host, freeze its bytes in runtime provenance, and retain source/build/compiler identities. Installed apps never compile or download this helper.

## Unreleased — native question navigation

- Collapse the iOS question queue when selecting a question and scroll to that question's card, keeping later answer controls clear of the composer and keyboard.
- Expire ordinary native notification banners after five seconds while preserving the next queued notice.

## 0.2.30 — cross-platform release candidate

- Preserve the Linux desktop-session identity during update and rollback so Chromium can select the existing protected credential backend after restart.
- Treat late trusted browser surface cleanup as an inert shutdown acknowledgement; keep tab, navigation and history commands blocked after quit starts.
- Expire desktop/web banners after five seconds, including native overlays when their renderer is background-throttled; preserve notification history and queued actions.
- Prevent a stale window's metadata refresh from reopening tabs another window closed or moved; preserve explicit new opens, including Team Tools standup links.
- Keep ignored local and empty lease renewals out of descriptor synchronization so they do not stall scroll publication; retain the barrier for applicable remote navigation.
- Preserve Codex structured questions; add durable unanswered-question queues, choices and custom answers on desktop, web and iOS. Keep native blocking/nonblocking request resolution separate from tool approvals and avoid replaying uncertain answers.
- Keep the web question queue within the transcript so it cannot cover pending answer or permission controls; retain expansion through refresh and close the list when jumping to a question.
- Steer returned task feedback into a running coordinator when its provider supports it; otherwise queue it, retaining the same delivery identity and human-stop boundaries.
- Share capability-based model-control visibility across desktop remote chats and the website; hide fixed context and reset incompatible options only when explicitly changing models.
- Keep a local window's selected project tab when its older saved follow response arrives during project loading.
- Restore iOS workspace/project/tab selection, retain all saved tab identities, prepare bounded URL suggestions off the main actor, cache thumbnails asynchronously and constrain overview previews.
- Focus the iOS composer from its entire card; show known chat titles in attention rows, persist keep-awake/loaded-tab settings and share Activity, recovery and resource controls across clients.
- Carry private-content-free notification routing identities through APNs and deduplicate foreground delivery. A push-enabled paid profile and live device acceptance are still required.
- Automatically trust Claude working folders for read/write like Copilot, without changing workspace grants. Open Internet Search setup in retained draft tabs and allow completed update notices to be dismissed.

## October 25 — Combined Design Preview queue

- Fix first-move acknowledgement when a window's project catalog lags the owner; scope tab visibility preflight and preserve Persisted pages.
- Share remote/local permission and model controls, continue remote scheduled chats safely, and add durable opt-in allowance-reset continuation with fresh owner quota validation.
- Move native/web notices to the bottom, preview link destinations, automatically trust Copilot's working root, combine Resources lists and clear completed update blockers.
- Include the merged MTPLX/full Activity work. Installation, publishing and other-device rollout remain held for preview review.

## October 25 — Captured provider activity for review

- Make targeted thinking-notice grouping the default and remove the format switcher. Preserve assistant commentary, answers, questions, warnings, errors and context notices in the conversation.
- Record observed thinking/response intervals and scoped reported usage for MTPLX, Codex, Claude and Copilot; show timing, source, missing-value and interruption details inside Activity. Include explicit Codex provider summaries without storing raw internal reasoning.
- Keep legacy saved notices drillable without inventing missing timing. Preserve draft/history/disclosure state during updates and recognize actual phase heartbeats in stall detection. Local installation and wider rollout remain held for Design Preview review.

## October 25 — Real-chat display comparison in Design Preview (superseded)

- Add Current / Grouped activity buttons to actual local preview chats. Group only recorded MTPLX thinking notices alongside tools, leaving all assistant updates inline; preserve original event drill-down, ordinary text, warnings, questions and answers.
- Keep comparison state in the renderer only. No chat-history rewrite, new provider request, reasoning capture or automatic prose classification. Include the MTPLX response-name correction and legacy-label display fix in the next preview build.

## October 24 — Activity details study and MTPLX identity correction

- Correct the missing MTPLX provider-name fallback and display old pilot main-agent messages saved as “Proteus” as MTPLX, preserving explicit custom/subagent names and stored history. Source correction awaits the next preview build.
- Add a standalone interactive Activity study comparing existing flow, grouped phase/tool detail and optional progress updates across MTPLX, Codex, Claude and Copilot. Synthetic fixtures only; Activity classification remains proposed.

## October 24 — MTPLX reasoning, tools and media in Design Preview

- Discover MTPLX reasoning modes/efforts from its live settings metadata and save per-chat Auto/On/Off and effort selections. Send explicit request controls without changing global MTPLX settings.
- Add an approved serial tool loop with schema validation, selected MCP discovery/calls/resources, authorized text-file reads/edits and existing available Proteus tools. Preserve interrupted-call uncertainty across restart without automatic execution replay.
- Add consented PNG/JPEG/WebP and plain-text input, vision tool results, MCP health, larger response budgets and visible eviction of complete older context turns. Retain preview-only provider registration.

## October 24 — MTPLX Design Preview pilot

- Add a preview-only local MTPLX chat provider with live model/context discovery, selected text sources and agent prompts, streaming, measured token usage, Stop and persistent conversation replay.
- Preview a restricted static SVG subset as isolated images while retaining the original code. Explicitly defer image input, tools/MCP, file access, web search and production/web/mobile enablement.

## Next release — October 23 feature queue (local package validation; rollout held)

- Fix recovery snapshots blocked by managed terminal sockets, and restart/report through the original chat when pre-replacement recovery capture fails.
- Keep address-history suggestions out of macOS fullscreen and dismiss them across fullscreen transitions. Clear the submitted address draft after selecting a suggestion while preserving newer typing.
- Exclude disposable validation output from desktop packages, migrate existing extension native-messaging patches to the organized service path, and retain the helper launcher used by installed releases.
- Preserve Keep Screen Awake across restarts; make the ordinary loaded-browser budget configurable in Engine Room (default 6), and retain Persisted pages through hiding, restoration and memory eviction.
- Move iOS browser-cache serialization/encryption/writes off the main actor and isolate chat scroll measurements from observable history state. Preserve the baseline navigation acknowledgment and deep workspace/project selection fixes.
- Support consented question-reply attachments across Copilot, Codex and Claude; keep attachment chips above provider/model controls. Show stalled provider/tool progress independently of user messages and interrupt a turn after 30 minutes without observable progress while preserving its queue.
- Default configured working folders to read/write, retain explicit read-only overrides and protected metadata, and expose folder access selection. Honor the configured browser preference for host-managed sign-in links through required core guidance.
- Add profile-name title suffixes, meaningful provisional hidden-tab titles, project tab text/type filtering and clearer unloaded-page colors. Scheduled tasks open their own needed tabs beside their chat.
- Add macOS HTTP/HTTPS registration controls, a green workspace/project link picker and ordered URL rules adapted from SafariSelector. Registration/default changes remain explicit UI actions; Apple's recorded entitlement review is separate.
- Normalize signed desktop release feeds/staging for macOS, Linux and Windows; add Engine Room update-coordinator defaults and unassigned destination coordinators. Publishing, installation and remote dispatch remain held; iOS stays Mac-guided.
- Organize native, desktop and shared web code into feature, model, service and shared folders, with architecture/commentary guidance.
- Route terminal clipboard paths through bracketed paste with consistent newlines. Add an explicit robot sharing button and bounded, revocable agent output/input tools with stable input receipts.
- Use a shared workspace/project destination menu for chat, browser, document, terminal and bulk moves, initially positioned at the current location. Keep chat membership and resource ownership operations distinct behind that common UI.
- Open associated chats inside their current project/workspace from global lists, links, notifications, creation and restored navigation, preserving live chat/child identity and drafts.
- Keep native link-menu creation in its originating window. Synchronize project content independently of focused input; preserve separate local window selection, address drafts and filtered tab lists.

## October 23 local / October 24 UTC — Windows and public release accepted

- Accept normal native installation/live verification of `windows.a02de6227c89` from `490fd629b659`, preserving distinct native/cached homes and qualified state evidence.
- Publish the exact installer, update archive and signed manifest on WTB; verify full HTTPS hashes/signature before atomic catalog/page activation, then all five live files and rendered UI.
- Verify the actual installed Windows feed client downloads all 393,773,885 archive bytes, safely extracts the exact package/installer and passes isolated startup; separately verify native owner catalog discovery without reinstall/restart.
- Complete server content/symlink/configuration preservation and bounded log checks. Resolve historical review blocks through exact current human approvals and stop the completed rollout monitor. No runtime rebuild or source push.

## Unreleased — October 23 local corrections; desktop rollout resumed

- Document the operator's two-backup ceiling: latest verified plus one previous in each applicable local/server location; retire obsolete website release/migration payloads after verifying the retained pair. No runtime rebuild.
- Enforce the website deployment limit across complete and incomplete recovery/code generations; keep failed transaction receipts and prevent retained code copies from accumulating without review. Deployment helper changes require no application rebuild.
- Acknowledge each native browser navigation receipt before a following metadata batch can race another desktop's address edit. Preserve exact selection, complete history and profile guards.
- Bring explicit chat recovery and supported attached steering to the web client. Native recovery keeps plain system failures visible and rechecks the host/active turn before attached steering.
- Accept the live website correction after ordinary recovery restore, exact deployed/served hashes, fourteen endpoint checks and authenticated Home/Connections verification; retain only latest and previous website recoveries/code copies.
- Verify phone/tablet recovery and local typing work for long messages and 100/1,000-event histories; preserve every typed character with no history traversal during entry. Physical-device performance and live acceptance remain separate.
- Install mobile build 2610.23.1 on phone and tablet with cold data preservation, connected Home/live build verification and two verified recoveries each. Physical CPU/frame-rate profiling remains unverified.
- Use normal Playwright Quit for restart fixtures so its debugger detaches; preserve the same complete-history assertions and require actual clean process exit. No application runtime change.

## Unreleased — chat recovery, navigation and layout corrections

- Disable the GitHub build workflow at the operator's request; retain local validation and require fresh authorization before enabling or dispatching hosted jobs.
- Show plain system messages outside Activities, with Continue chat and an explicit per-chat 60-second capacity retry/stop option; preserve queued inputs, drafts and native sessions.
- Restore each top-level workspace's remembered project/chat/resource page through restart without changing resource placement or histories.
- Allow supported active-turn steering attachments through existing provider/file consent and replay protection; advertise media types to paired desktops/native clients.
- Preserve custom provider profile/executable locations on supervised update and rollback. This addresses a restart-environment defect; the reported default-profile Mac Claude sign-in failure remains under investigation.
- Align Connections cards, spacing and wrapping; keep desktop actions grouped at wide and narrow sizes.
- Keep the composer footer visible when many attachments and a pending question share a narrow pane; immediately clear accepted attachment chips in retained composers.
- Verify existing automatic sharing for agent-created browser tabs, including unload/recreation and restart, while preserving explicit human-tab grants and revocation. No runtime policy change.

## Unreleased — passive workspace saves

- Avoid scheduling another descriptor sync when sidebar rendering saves the same workspace snapshot. Real edits still synchronize; unchanged saves no longer postpone a pending edit.

## 0.2.29 follow-along correction — fresh input owns selection

- Prevent idle renderer refreshes from publishing stale tabs over a person's chat selection.
- Preserve native link/history navigation following while keeping background reconciliation passive.
- Renew unchanged owner presentations without new revisions or selection broadcasts.

## 0.2.29 — rollout acceptance

- Include the follow-ordering and duplicate-metadata corrections below in the final tested desktop artifacts.
- Integrate native-view readiness and Windows path escaping fixes in UI test setup without changing the frozen runtime.
- Record per-device installation, history preservation, public Windows update consumption and actual backup/staging space measurements in [rollout acceptance](docs/2026-10-22-unified-rollout.md).
- Retain explicit limits for physical mobile camera/pairing checks, hardware gestures and policy-blocked Windows build-folder cleanup.

## Unreleased — convergent browser metadata

- Settle a duplicate browser redirect/title intent only when the owner's selected entry already has the exact entry ID, URL and title. A stale redirect conflict gets one fresh read, without resubmitting or inventing a receipt.
- Preserve strict navigation revisions, divergent metadata conflicts, original uncertain request identities and complete Back/Forward history.

## Unreleased — follow presentation ordering under latency

- Apply a pending owner position before publishing passive local changes for the same presentation identity, while preserving newer human input and changed navigation.
- Coalesce current scroll positions after descriptor synchronization so continuous input does not starve follow updates under slow responses.
- Keep scope, reconnect, history-entry and presentation-rate protections; integrated exact-package acceptance remains required before rollout.

## 0.2.29 — combined October 22 release

- Combine scoped desktop follow-along, resource/backup improvements, browser controls and the Home correction from the updates below.
- Preserve independent browser profiles, complete navigation histories, chat state, approvals and durable retry receipts across the update.
- Include native pairing completion and scanner-orientation fixes, Windows release/update support, portable recovery-copy durability and the patched Markdown renderer.
- Wait for queued navigation reconciliation before publishing followed tabs, avoiding an empty/unloaded page during slower responses.
- Coalesce simultaneous website account reads without caching credentials or authorization; show a retry control when Connections cannot load.
- Rollout acceptance is tracked separately for each device and the web; a successful build does not imply installation or live verification.

## Documentation — historical Linux acceptance reconciliation

- Recover four artifact-specific Linux 0.2.27/0.2.28 acceptance reports, marking earlier installation and relay observations as historical.
- Restore the bounded external native-transcript manual recovery procedure and its design decision while preserving newer Windows/mobile/updater documentation.
- Keep final 0.2.29 artifact validation and unresolved receipt-growth investigation pending; no runtime or installed-app change is included.

## Unreleased — integrated desktop and mobile source

- Combine the Windows installer and signed WTB release channel with the current desktop stabilization, browser controls, and native pairing fixes.
- Preserve asynchronous package inspection, versioned provenance, resumable recovery, and Windows atomic replacement together; stream authenticated release downloads through the shared account session.
- Keep the relay's standalone Linux container independent of desktop source files and correct directory permissions in cross-platform test fixtures.
- Flush resumable recovery copies through a writable handle on Windows while preserving read-only source modes; make chat/follow fixtures portable and clean up partial setup failures.
- Update Markdown rendering to the patched `markdown-it` 15.0.3 and rebuild the shared desktop/native runtime; dependency audit reports no known vulnerabilities.
- Integration acceptance: 1,000 Node tests pass with one platform skip, static checks pass, 101 web tests pass (867 assertions), the web build passes, and isolated browser UI checks pass. Installed-app rollout and physical mobile camera acceptance remain separate.

## Unreleased — mobile pairing completion

- Keep the authenticated pairing transport when saving a computer, preserving other destinations and existing cached history.
- Dismiss Add computer after authentication, show explicit pairing success, and open Engine Room → Connections on phone and tablet.
- Wait for the QR scanner to dismiss before pairing; rotate its camera preview with the device using AVFoundation's rotation coordinator.
- Phone/tablet pairing UI, destination-preservation regressions, 979 Node tests and static checks pass. Physical app update and camera-image acceptance remain pending.

## Unreleased — browser controls review

- Remove the unrequested Home URL/search box; make Proteus the primary heading and retain browsing in browser tabs.
- Drag detached video windows from the video surface and pinch to resize within the display work area, retaining the original player and controls.
- Add Hide browser tab below Unload and double-click blank tab-strip space to create a scoped browser tab.
- Add optional extension toolbar icons and per-profile ordering in Browser Preferences; show small extension/action icons in tab and page menus.
- Place Downloads before the Page menu, and verify device-wide autoplay blocking across restart.
- Refresh the retained isolated design preview for operator review; production/platform installation remains held. See [preview acceptance](docs/desktop-preview.md).

## Unreleased — stabilization and scoped desktop follow-along

- Add Open Link in Background Tab below the foreground new-tab action; load in the source profile and placement while preserving selection/focus. Keep the unloaded option.
- Follow selected project/workspace tabs, browser URLs, and reading positions across paired desktops using each device's local profile. Keep inactive scopes idle; preserve full session history and existing approvals. Terminal output stays on its owner.
- Reduce repeated browser state broadcasts, offscreen conversation/terminal work, idle refresh traffic, transcript hydration, and duplicate persistence; bound transport and inactive history memory.
- Add versioned updater provenance, bounded worker-based package inspection, safe staging retirement, resumable cache-aware recovery, and read-only storage accounting under the two-generation policy.
- Separate shared-account authentication, add selective/paged reads and revision-protected deletes, and move Life filtering/aggregation into SQL without changing immutable food versions.
- Correct narrow composer spacing/wrapping; retain existing navigation and controls. Add contributor/security guidance and current architecture; leave the license unchanged.
- Implementation and synthetic acceptance are recorded in [the stabilization ledger](docs/stabilization-plan.md). No installed app, website deployment, signing identity, or live backup was changed.

## Unreleased — agent chat control (merged source; rollout held)

- Add host-scoped conversation discovery, dispatch, read/wait, ordinary-question replies and cancellation to internal provider tools and trusted local MCP.
- Persist scoped grants, retry identities and task feedback; preserve independent UI subscriptions, destination approvals and deliberate origin stops.
- Show task feedback in the conversation, allow concurrent MCP waits/replies and report complete owner paging beyond 1,000 chats.
- Keep project-scoped mutations capability-gated on older owners. See [agent chat control](docs/agent-chat-control.md) for verification and integration boundaries.
- Integrate feature commit `2a825a1` while preserving the current release work; rerun all 883 tests, static checks and isolated Electron feedback/peer-setup/message regressions. Installation and deployment remain held.
## Unreleased — Windows installer and signed WTB desktop releases

- Match Linux's frameless desktop shell on Windows, with the same upper-left window controls and circled-dots File/Edit/View/Window menu button, F10 access and native shortcuts.
- Add a per-user Windows x64 NSIS installer, native PowerShell terminal startup/cleanup, provider executable discovery and owner-only data/credential ACL checks.
- Retry transient Windows sharing violations during atomic state replacement without removing the previous durable file; preserve update-button gating after cancellation.
- Add trusted signed release manifests, a pinned downloads.proteus.example Windows catalog/download channel, bounded verified offline/network staging, and registered Windows installer recovery through the existing protocol-1 helper. Keep the separately authenticated website service compatible without sending its account credentials to WTB.
- Allow Engine Room updates without a chat while preserving exactly-once continuation for selected chats; initialize recovery inventory only for a genuinely new registered Windows data home.
- Keep unsigned Windows packaging explicit, register per-user chat/sign-in links, preserve data on uninstall/rollback, and carry the current 0.2.28 shared source. Exact build, installed-update and cross-device acceptance are recorded separately in `docs/windows-app.md`.

## Unreleased — navigation and Apple identity review

- Complete the private WTB Developer ID evaluation: app and DMG notarization/stapling, Gatekeeper, mounted browser acceptance, and complete downloads.proteus.example download verification passed. Record operator-submitted browser entitlement request **TGNRQJ22PP**, pending Apple review, with links/form/receipts in the ignored local operator record. This supersedes earlier preparation holds below.

- Preserve private Apple records outside Git and explicitly exclude `local-records` from desktop packages; keep the superseded review-page template under documentation rather than the web public directory. Document the Apple response, passkey integration, helper inclusion and deployment checklist.
- Use `org.proteusapp.review.proteus.desktop` for the registered Apple evaluation identity while retaining installed update/Keychain identities pending a verified migration.
- Keep iPhone browser controls in the bottom safe area and observe vertical gestures over nested web scrollers.
- Observe the selected project inside the pushed native destination, replacing its content identity when the sidebar selects another project.
- Replace the standalone Chat tools row and Live Browser tab with Chat | Live browser links in the existing composer status row on native and web clients, retaining drafts and capability gating.
- Restore colored left message edges across desktop, web and native; use responsive saved-computer actions and an explicit Selected label.

## Unreleased — Apple browser review preparation

- Register HTTP/HTTPS URL schemes for the macOS desktop. Queue incoming links until restored UI is ready; open separate human-owned tabs without agent access, including when all windows were closed. Preserve existing custom callback schemes.
- Add a website/search entry to desktop Home, including its error state.
- Add isolated Electron WebAuthn registration/assertion and external-link acceptance tests. Synthetic CTAP2 verification does not establish iCloud passkey or Touch ID compatibility.
- Initial Apple preparation is completed by the submitted/notarized evaluation recorded above. Real iCloud passkey and Passwords helper acceptance remains pending; the evaluation package does not migrate installed app identities.

## October 21 — peer integrations acceptance correction

HC live acceptance of the initial 0.2.28 package found the read-only Other computers inventory
blocked by the desktop peer method allowlist. Added only `integrations.list`; recovery/check
mutations stay unavailable through this informational peer view. The paired-host regression now
exercises the actual encrypted peer request and verifies mutation commands remain rejected.
This correction supersedes the aa0b52aee873 desktop package; replacement acceptance is pending.
The preceding package's menu bar keep-awake, local preservation, global favorites, project move,
iPhone installation and web deployment passed their stated checks.

## October 21 — menu bar Keep Screen Awake

The operator requested a tray-controlled idle keep-awake feature. The desktop host now offers
**Keep Screen Awake**, off on launch, using Electron's native `prevent-display-sleep` assertion.
It remains active with windows closed and stops on toggle-off or application quit. It does not
move the pointer, require Accessibility input permission, or change system sleep preferences.
Native protection starts immediately, so it also covers sleep timeouts shorter than a few minutes.
Explicit locking/sleep and OS policy remain in control. The setting is local to this process;
restart/update returns to off. All 865 Node tests and syntax checks pass. Isolated Electron UI acceptance verifies the native
macOS display-sleep assertion, background operation, toggle-off and quit cleanup. Packaging is
in progress; installed apps are unchanged.

## 0.2.28 follow-up source changes (installation pending)

- Shared source favorites merge each owner's legacy lists and carry across new workspaces.
- MCP inventory groups source configurations with expandable session evidence, search, favorites,
  explicit source refresh and informational Other computers views; source pickers show status.
- Duplicate browser tabs preserve history/profile/placement with independent identity; link menus
  put Open Link in New Tab first and editing actions above Inspect Element.
- Sidebar state loads before capture/save, preserving expanded workspaces/projects across reload.
- Video fullscreen opens the existing player over the originating window at its exact size and
  position; idle controls fade, and Close/Escape returns without restarting playback.

## Queued — browser duplication and navigation preservation

- Add Duplicate tab to browser-tab context menus, preserving full history/current position,
  profile, placement and relevant settings with an independent new tab.
- Preserve workspace/project expansion, paging and picker/navigation state across all page,
  feature, tab and Engine Room loads, including asynchronous updates and restoration.
- Refine MCP status design using the updated external OAuth/vault helpers. No runtime change
  or build in this intake; the release remains held for confirmation.

## Queued — awaiting build confirmation

- Put Open Link in New Tab first in browser link menus; move Copy/Select immediately
  above Inspect Element.
- Explicitly include HC's own favorites union and preservation checks during its upgrade.
- Analyze configuration-centered MCP setup, authentication, health and picker status.
  No integrations redesign, menu implementation, build or live authentication change in
  this intake. See docs/integrations-design.md.

## Unreleased — shared source favorites

- Merge existing workspace favorites into one list for every workspace on the owning
  computer, including newly created workspaces. Star/unstar updates the shared list.
- Keep bookmarks separate from source loading, default chat context and tool approvals.
- Accounts & Integrations inventory redesign is under discussion; no new connection or
  cross-computer authentication capability is claimed. See docs/integrations-design.md.

## 0.2.28 — browser, project and provider repairs

- Keep webpages visible beneath URL-bar suggestions; route Command/Ctrl+R to the selected tab.
- Move whole projects between same-owner workspaces with stable chats/tabs, resumable membership
  receipts, preserved existing configuration/approvals and destination defaults for new chats.
- Make New chat contents 30% wider and its message box 15% taller, constrained in small windows.
- Preserve full browser history while removing repeated base64 favicon bytes from agent output.
- Contain native-messaging pipe failures, persist optional extension grants per profile, isolate
  same-URL extension popups by session/window, and explain Bitwarden desktop biometric setup.
- Add acknowledged Claude interrupt-and-continue steering and capability-aware client controls.
- Show source-file Created/Modified dates in authorized Markdown viewers.
- Route all selected third-party Codex MCP tool approvals through existing saved-policy handling,
  preserving server/tool/action scope, Ask, revocation and selected tools.
- The reported project assignment predates the latest update in retained evidence. The requested
  live move, Touch ID, Apple Passwords pairing, original Social-profile issue and actual provider/
  HC acceptance remain separate from source/build tests. See the [release ledger](docs/2026-10-21-browser-chat-release.md).

## 0.2.27 desktop renderer recovery

- Detect a lost app renderer and recover only that window using its saved tabs, drafts, selection and reading positions. Keep the host, scheduler, active turns and live browser pages running; do not replay interrupted UI actions.
- Bound automatic retries and show a local recovery page when the window cannot initialize. View → Reload Window retries the known app surface; it does not restart the host. Clear stale shell overlay/overview state during reload.
- Center the Proteus brand in the available gap between the native window controls and the first tab, retaining its drag area and fixed tab position.

## 0.2.27 notification and navigation follow-up

- Keep the lower tab strip only for actual workspace/project/chat or Team content. Standalone app tabs and feature pages no longer gain a duplicate label/control row.
- Keep tab selection responsive when content text is selected, and prevent extension bookkeeping from echoing old selections back to the UI.
- Restore saved palettes independently per desktop installation, native device and web browser/account. Web Engine Room Colors saves browser-local validated JSON without changing a connected host's palette.
- Keep browser load failures and history conflicts in Notifications/Needs attention with tab, reload, log and explicit recovery actions; remove the page-covering popup/tray. Pending navigation and retry receipts remain preserved until an explicit resolution.
- Preserve shared URL and forward history through device-local iPad redirect chains and repeated WebKit observations. Deliberate address, link, form, history and trusted SPA actions still publish navigation.
- Reveal the complete newly opened tab, including its close control, in either navigation row for browser links, chat and background tool opens. Background opens retain focus; metadata refreshes retain manual scrolling.
- Remove the iPhone browser footer's extra bottom padding and duplicate nested safe-area gap while retaining its existing touch targets.
- Bound the first top tab with a left divider matching its top/right borders, without adding a divider through the title-bar brand area.
- Shorten both desktop tab rows by four pixels and use matching smaller overview/+ controls with the same color and compact spacing.

## 0.2.27 app navigation follow-up

- Restore the existing app-navigation overview button immediately left of the top-row +. Its App tab overview contains this window's top-level tabs; the lower overview remains scoped to workspace/project or Team content. Keep the existing overlapping-tabs icon.
- Add the matching independent main-tab overview to iPad's top strip. It lists the device's main roots across connected hosts, separately from content/pinch overview.
- Native 2610.20.4 expands workspace/project sections on name selection and gives the whole label row a touch target. Chevron collapse remains explicit; 2610.20.5 includes the additional iPad app overview.

## 0.2.27 follow-up acceptance corrections

- Load the permanent palette layout/surface stylesheet as a bundled resource under the existing strict content policy; verify rendered swatch dimensions and grid, in addition to saved values.
- iOS follow-up build 2610.20.3 binds browser content to the containing navigation strip's selected tab, restores the missing workspace/project active underline, adds four pixels between workspace groups and places their divider below the Workspaces feature.
- iOS Engine Room uses plain vertical options and nested sidebar/drawer navigation instead of boxed horizontal option buttons.

## 0.2.27 — integrated navigation, palette and browser controls

- Promote the accepted unified title strip, matching tab underlines, universal secondary-strip overview and named/closed/previous window sessions into the normal desktop app. Shared project and Team contents stay synchronized; top-level navigation remains window-local.
- Add permanent Engine Room → Colors controls: live color pickers, surface lightness/saturation, named saved palette, discard/reset and portable JSON import/export. Native iPhone/iPad keeps its own device palette and navigation; no mobile window tracking.
- Show a recent download rate in KB/s. Keep desktop downloads in their nonblocking window-private popup and native downloads in a session-only list, preserving downloaded files.
- Repair certificate observation before navigation, retain certificates through subframe/same-document navigation, share the existing debugger safely and display observed Chromium certificate chains without overriding trust decisions or fetching a different connection.
- Include the accepted browser/Find stability fixes, background agent control, explicit tab sharing, page-menu autoplay preference, domain page scale, tab-hosted desktop chat setup and source-kind icons.
- Bring relevant native features into line: palette controls, root-domain page scale with private-suffix isolation, global device autoplay preference, certificate inspection and download speed. Existing Apple AutoFill settings remain; Mac helper fill/save is still experimental.

Implementation and validation/install status are recorded in the release ledger; build success alone does not establish live acceptance.

## October 20 — browser controls preview and targeted Mac stability repair

- Keep navigation replies bound to the tab that initiated them and reject stale owner history updates. Team browser mounting tracks the surface kind rather than every URL; deduplicate unchanged bounds updates. Find skips blank/unloaded setup surfaces, debounces typing and cancels superseded native searches.
- Replace modal Downloads with a sandboxed child popup above the native website, file-type icons, separators, progress, pause/resume, supported URL restart and folder actions. Download metadata lasts only for its window; files and folder preferences remain.
- Add a persistent all-window video-autoplay preference in the page menu. Website-frame preload blocks declarative and script-started video before human activation; manual playback remains available. No credential or provider action is needed.
- Human-opened browser tabs now require explicit sharing. Agent-created tabs start shared; every page backend observes revocation. Agents can request a native human decision, which defaults to declining and rechecks tab/profile/navigation/preferences before granting. This supersedes the October 18 default-access rule.
- Add an adjustable palette design draft. New functionality is in the isolated preview; the separate installed-baseline Mac repair is staged/tested independently. See the current preview and hotfix acceptance notes before inferring installation.

## October 20 — Apple Passwords popup presentation

- Close extension popups when their profile disables/removes/reloads the extension, avoiding stale blank windows.
- Size extension popups to their contents and show after DOM readiness. Give Apple Passwords
  readable green surfaces/inputs, hide empty loading controls and remove its duplicate content title.
- Keep Mac autofill experimental: this Mac kills Apple’s helper even outside Electron; pairing,
  fill/save and passkeys are not claimed by a successful extension setup screen.

## October 20 — Apple Passwords preview setup

- Add per-profile Apple Passwords setup/open controls using Apple’s official extension and existing
  permission review. Apple owns pairing and unlock; no vault import or agent vault interface.
- Explain system Apple Passwords AutoFill on native iPhone/iPad and add the public provider-settings
  shortcut. Actual pairing/fill/save and physical-device acceptance remain separate.

## October 20 — preview tab continuity and browser presentation

- Open unified tabs directly to the left/right; use compact child menus above the live website
  for tab/Ghostery actions instead of hiding the native browser.
- Host New chat setup in its tab, retaining separate drafts across navigation/reload/restart;
  submit one local/paired chat into the same position. Keep destination catalogs and form IDs isolated.
- Save page scale by root domain/browser account partition, including 120%, and reuse it in new
  tabs/windows and after restart. Keep page scale independent of visual pinch zoom and app scale.
- Lower the fresh-pinch overview threshold while preserving the separate-gesture requirement.
  Lighten dark green preview surfaces and preserve bright accents; display overview URLs without title case.
- Keep an agent-controlled page unthrottled/loaded between tools until the turn ends or human pause.
  Synthetic hidden screenshots and coordinate/direct/MCP actions work while another project is selected;
  the original operator dropout remains unproven. Production and physical-device rollout remain separate.

## October 20 — preview keyboard, agent-control and chrome follow-up

- Add a live − / current percentage / + page-scale row to the browser … menu. Clicking the
  percentage resets to 100%; scale changes keep the menu open and leave application scale alone.
- Add leading document, skill, agent and MCP icons to chat source selectors, Favorites and
  workspace source tables, retaining type labels, loading choices and accessible controls.
- Notify the owning window when shared navigation updates an unloaded native browser descriptor,
  keeping its address controls current without loading the website.
- Submit local/paired New Project forms with Enter; prevent duplicate submissions while saving.
- Restore a working robot pause/resume button in main and Team browser bars. Ordinary tabs stay
  available by default. Persist explicit pauses by stable logical identity and enforce them at
  the host for direct page tools and both MCP backends; listing/organization remain available.
- Make the preview brand a noninteractive window drag region. Restore the original sidebar
  chevron, use a fixed brand width independent of sidebar resizing, remove the brand separator,
  shorten the upper gap to 11 pixels and keep the full 2-pixel upper underline visible.
- Keep the reported browser/chat agent-control dropout queued for normal-build investigation:
  repeated synthetic switches, direct/MCP clicks, same-page reuse and reconnection pass, so no
  root cause or repair is claimed for the operator's actual failure.

## October 20 — window and iPad design preview

- Build the selected integrated title bar in the isolated desktop preview: extra drag space,
  single centered brand, current tab ×/underline/dividers plus top border, connected sidebar and
  universal secondary-row overview/New tab actions. Remove duplicate address-bar overview.
- Share Team content across windows and correct duplicate local entries during asynchronous
  creation. Keep top-level navigation and each window’s selection independent.
- Add Engine Room → Windows with names, closed/named/previous-session snapshots, restore/focus
  and bounded private storage. Restore current shared content instead of stale tab membership.
- Implement iPad chat pinch observation, intrinsic-width page headings, consistent 44-point
  navigation rows, a separate Team account sheet, explicit loading/account/empty states and a
  larger multiline link editor. Preserve nonbrowser owner descriptors in mobile tab projection;
  rebase incomplete reorder retries without expanding permissions.
- Source desktop acceptance and all 821 runtime/static checks pass. Native/device and packaged
  acceptance are tracked in [window management](docs/window-management.md). This is an isolated
  preview; existing production installations and private operator screenshots remain unchanged.

## 0.2.26 — rollout in progress

- Incorporate the Linux branch and its verified signed-out secure-storage startup repair.
- Restore production provider choices; retain sidebar expansion; fix startup readiness, browser
  abort alerts, Inspect ordering and the Page-menu DevTools guard.
- Preserve empty navigation revisions, recoverable pending intent and scoped conflict handling.
- Persist a disabled first-run host identity so navigation retry receipts remain valid after restart.
- Add independent desktop windows, native view/IPC ownership, shortcuts, geometry/session and
  reading-position restoration; keep one host, browser/profile broker and terminal store.
- Add cached browser/chat overview images, ordered workspace project sections, direct new-tab
  creation blocks/address-history entry, workspace ordering and hierarchical bulk tab actions.
- Return native keyboard focus from the hidden browser surface so a new tab accepts immediate
  address typing after a loaded page; retain ordinary text editing and early Enter while tab
  creation is pending, then transfer them to that tab’s address field.
- Promote accepted phone/tablet navigation/composer design; add native overview/cache/new-tab
  parity and durable account-scoped document positions.
- Reserve a black iPad system-status area above clipped app content and remove ordinary
  inactive-scene privacy blanking; future private browsing can define its own masking behavior.
- Add desktop OAuth callback/client separation and preferred-browser routing; website deployment
  and approved production client provisioning pass with the mobile client preserved.
- Add lazy Cua/Peekaboo desktop-control adapters and an independent supervised update protocol
  with a durable same-chat continuation, compatible rollback and inventoried recovery retention.
  Actual signed update/rollback automatically resume the same real Codex session once. Personal
  and HC desktops and physical phone/tablet are installed; remaining target gates are in the ledger.
- Verify Build Mac native control and real Codex screenshot delivery through MCP; handle its
  native tool-approval request with one exact permission and discover backends from Finder launches.
- Verify durable document positions, bulk partial-failure retry/source access/close, and iPad
  status-area geometry/cache/reactivation with explicit per-run simulator fixture environments.
- Align sidebar backgrounds across desktop, iPad and iPhone; join native workspace page/content
  tabs without a flexible gap and retain tab dividers. Separate native page labels from the sidebar button.
- Compact the phone browser footer; hide/show top controls with deliberate scroll direction and
  retain double tap/More recovery. Swipe the displayed address to select adjacent visible tabs.
- Move native thumbnail encoding/persistence/retention off the main thread, coalesce capture tasks,
  and avoid snapshots during scrolling, deceleration or zoom.
- Detach the helper readiness IPC before host shutdown while preserving the independent helper
  and durable journal. The exact signed follow-up passes actual Codex same-session continuation
  after update and forced rollback; both Electron desktops, Linux and paid phone/tablet follow-up
  installations are verified. The separate native Mac confirmation remains operator-deferred.
- Widevine remains shelved under the operator's no-paid-signing instruction.

## October 19 — Linux release preparation startup repair

- Let signed-out desktop startup and browser-profile discovery run without accessing protected
  credential storage when no Life session file exists. Existing saved sessions, sign-in and
  token writes still require protected storage; Linux plaintext fallback remains rejected.
- Add regressions for fresh profile discovery and preservation of existing encrypted sessions
  with unavailable storage or a plaintext backend. This is preparation on a separate branch;
  installation and live workflow acceptance wait for the frozen release candidate.

## October 19 — final native design preview

- Brighten sidebar text/icons, use desktop Home/Schedules/Team Tools marks, tighten project/item
  nesting and place smaller green Open tabs close glyphs near the edge with full touch targets.
- Preview an animated one-line iPhone reply composer that expands to the existing supported
  controls on touch and retains drafts when collapsed. Keep iPad controls visible with a one-line
  editor. Grow only for explicit newlines, cap the whole composer at half the window and scroll
  overflow. iPhone Return adds a newline; iPad Return sends and Shift+Return adds a newline.
  Show the attachment + in the preview, retaining disabled choices for unsupported fixture uploads.
  Item indentation now sits halfway between the last two previews. Fix keyboard dismissal during
  native editor layout updates. Final composer/sidebar UI cases, two native unit cases, all 756
  runtime cases and static checks pass; iPad physical Shift+Return/Return is verified in the GUI.
  Release and physical installation remain held.

## Queued next release — October 19, 2026

- Queue moving Inspect Element to the bottom of the browser right-click link menu
  (BF-2026-10-19-04). This chat collects the next release; no implementation or build yet.
- Investigate Work Mac's Slack load alert and reproduce a false `ERR_ABORTED (-3)` failure after
  page-initiated navigation in isolated Electron. Queue consistent abort/replacement handling
  (BF-2026-10-19-05); the fix and HC live acceptance remain pending.
- Queue preserving workspace/project sidebar expansion when visiting Engine Room or other
  features, keeping exposed project browser tabs directly clickable (BF-2026-10-19-06).
  Workspace/project-name clicks also expand that branch while opening its page, preserving all
  other workspace/project and nested state; repeated clicks do not collapse it.
- Reproduce the startup/renderer-refresh `desktopPreview` null-state error when browser profiles
  arrive before application state. Queue readiness-safe tab rendering (BF-2026-10-19-07).
- Queue overview sections for all current-workspace projects: current first, others alphabetically,
  each showing its unhidden tabs; correct duplicate legacy General sections (BF-2026-10-19-08).
- Queue cached browser/chat thumbnails, refreshed after interaction and periodically while viewed,
  retained after unload/restart and shown immediately in overview with icons as fallback. The
  current global first-30 capture limit can skip eligible pages (BF-2026-10-19-09).
- Queue a consistent desktop/web tab-overview icon: two overlapping rounded rectangles with
  a thin outline, preserving existing overview behavior (BF-2026-10-19-10).
- Queue multiple desktop windows, Command+N/T and per-window geometry/item-position restoration
  after app Quit; individually closed windows are removed from restoration (BF-2026-10-19-11).
- Queue direct + new-tab pages on desktop/iPhone/iPad with current action blocks, a combined
  address/history field focused on creation and angled-arrow/Enter submission (BF-2026-10-19-12).
- Queue direct account setup/refresh guidance for disabled additional browser profiles, and
  recognize saved shared-account sign-in with Life off (BF-2026-10-19-13). Synthetic reproduction
  confirms one loading failure; the operator's already-working Life/Team case still needs
  profile-state/UI investigation without demanding fresh sign-in.
- Queue sign-in through the selected browser and reliable return to the initiating desktop/mobile
  app/window, with distinct client identity and labels (BF-2026-10-19-14).
- Research Widevine via a CDM-capable desktop runtime and production signing, rather than a Web
  Store extension; compatibility and playback remain unverified (BF-2026-10-19-15).
- Queue dragging workspace cards to set a saved same-owner order shared by the Workspaces screen
  and sidebar, preserving selection/expansion and resource state (BF-2026-10-19-16).
- Queue workspace headers with selectable project/default-project children in tab-move menus,
  resolving duplicate project names while preserving move/copy behavior (BF-2026-10-19-17).
- Queue Tabs-page multi-select through Command-click or Select, a checkbox column, and top-right
  Hide/Move/Close actions after Workspace configuration (BF-2026-10-19-18).
- Queue retaining each document tab's reading position across tab switching, document refresh,
  renderer/web-page reload and app restart, including unchanged Markdown and delayed images
  (BF-2026-10-19-19). Restoration/persistence gaps found; implementation and acceptance remain pending.
- Queue the iOS-style outlined-circle/three-horizontal-dot More icon for desktop/web browser
  menus, replacing the diagonal slashes while preserving actions (BF-2026-10-19-20).
- Queue the selected helper-and-handoff self-update approach, with independent installation/health
  recovery and automatic original-chat continuation after restart or compatible rollback, without
  Continue (BF-2026-10-19-21). No updater implementation, build or live restart.
- Queue the selected Cua Driver primary/Peekaboo Mac fallback desktop-control approach, including
  Linux branch support through Cua, required tool-order guidance, lazy catalog/runtime loading and
  shared control/retry guards (BF-2026-10-19-22). Show actual backend/permission/cursor/resource state.
  Exact versions, integration and acceptance remain pending; no packages installed or build started.
- Queue three reported installed-0.2.25 P1 tab regressions: missing authoritative empty-stack revision,
  non-convergent empty-history conflict resolution and global conflict overlays losing healthy-scope
  browser selection (BF-2026-10-19-23/24/25). Preserve full history, pending intent and receipts;
  reported reproductions are not rerun by intake. Implementation/package acceptance remains held.
- Track observed black rectangles behind UI text separately; no causal link to the navigation
  defects is established (BF-2026-10-19-26).
- Confirm X's JavaScript stack overflow depends on Ghostery protection in a live enabled/paused/
  resumed reload test; restore protection afterward and queue scriptlet compatibility repair
  (BF-2026-10-19-27). No credential submission or verified account login; no implementation/build.
- Queue Page-menu Developer tools silently doing nothing while right-click Inspect Element works;
  detached inspector presentation is expected (BF-2026-10-19-28).
- Queue production New Chat losing Copilot/Claude because a shared project-UI flag activates old
  preview-only option pruning and forces Codex (BF-2026-10-19-29). Unchanged checkout/installed
  Personal code reproduces the reported list with synthetic available providers; HC live execution
  is unverified. No implementation or build.

## Unreleased — native simulator design previews

- Preserve the computer connection through phone project navigation, fixing a reproduced crash
  when opening a project item from a main browser. Change selection without closing that browser.

- Simplify Standup to desktop-style numbered order, editable roster/settings and an iPad-only
  order dock closed with X. Keep links on Team Tools; remove preview Standup pop-outs.
- Refine browser control/menu placement, share the overlapping-tabs overview mark, restore Team
  browser active underlines and match the grouped desktop sidebar's icons, colors and nesting.

- Refine iPhone/iPad feature headers, main-tab access, Home Recents/Needs Attention paging and
  workspace tree indentation. Keep main tabs labelled in the phone drawer; iPad retains its strip.
- Show phone URLs on one fading line, expand on edit, and remove the redundant Recent sites Done.
- Rehearse service-owned Team Tools links, desktop tab icons and in-page Standup settings/docking
  in separate Debug simulator apps. Physical rollout and real-account acceptance are separate.

## 0.2.25 — Website data and scoped desktop tab overview

- Replace the Extensions toolbar glyph with a three-slash Page menu. Keep extension actions;
  add current-site data clearing, a filtered Engine Room website-data manager, site-version
  requests and the existing current-connection certificate viewer.
- Inspect cookies, local-storage keys, IndexedDB databases, caches and quota-backed storage
  through Electron/Chromium. Remove selected items, one site or all website data in one profile.
  Never load the real site to inspect it; preserve profile/account boundaries and cookie continuation.
- Remember site-supplied favicons by origin and browser partition for fallback across navigation
  and restarts. Discover declared icons and retain the last valid icon when discovery fails.
- Add Open Link in Unloaded Tab to native and rendered link menus. Keep the tab hidden and
  unloaded in its original scope, without a navigation-strip entry or website request.
- Repair desktop overview for workspace/project ownership. Name project sections, put the current
  project first, highlight/reveal the selected tab, show type icons and running-chat indicators,
  and support same-owner drag/keyboard reorder and close. Main overview shows only main-strip tabs.
- A pinch that returns a zoomed page to 100% cannot also open overview. Require a separate pinch
  beginning at baseline; preserve ordinary native page zoom and scrolling.
- Confirm form resubmission before Chromium's POST reload, while Enter navigates to the
  displayed URL with a fresh request. Both desktop installations and second-restart preservation
  checks pass; live acceptance and remaining labeling limits are recorded in the handoff.

## 0.2.24 — Stable browser Find while the app refreshes

- Keep native browser Find on its current match and preserve manual scrolling during unrelated
  app polling and interface mutations. Skip an unchanged passive search before invalidating a
  pending result; explicit typing, Next and Previous remain active.
- Refresh Find for a new top-level browser document, including a same-URL reload. Reject replies
  from older queries, documents, targets and closed Find panels. Loaded renderer text still
  refreshes its ranges without scrolling.
- Add synthetic unit and real long-page Electron regressions. Signed artifact acceptance and
  destination installation are recorded separately in the handoff.

## 0.2.23 — Existing chat tools and Source Library clarity

- Publish current browser and tab schemas through the existing per-turn app MCP bridge when
  resuming Codex chats, whose native dynamic tool schemas otherwise remain captured at creation.
- Keep the same approval checks and per-turn capability lifetime; existing chat/session identities
  remain intact. Older chats can use hidden/unloaded creation and explicit lifecycle operations.

- Restore 18px spacing between registered Source Library cards on desktop and web, including
  wrapped folder details and controls at narrow widths.
- Explain that registered sources are available to every owner workspace, with workspace-specific
  loading choices. Rename the saved-configuration summary to “Configured in”; distinguish loading
  from file and connected-tool permissions and clarify one-time folder bulk settings.

## iPhone functional design preview — native simulator checks pass

- Select the button drawer for the existing phone screens, remove bottom app-section navigation,
  retain full URLs above pages, and place Back/Forward/Find/History/one Tabs control below them.
- Put additional existing browser actions in circle “…”. Double-tap the page to toggle top
  controls while retaining bottom browsing controls. Keep iPad navigation unchanged.
- Prepare native interactive back navigation, mixed content previews and pinch-to-overview,
  integrated Workspaces collapse, and Live Browser in chat “+”, behind a phone simulator gate.
- Fix phone touch targets, accessibility identifiers and thumbnail alignment. Let UIKit own
  interactive app Back without a competing chat drag observer; preserve browser history Back.
- Install and launch the separate signed preview in the iPhone emulator. Both native UI cases,
  the minimum-page-zoom unit case, 740 runtime tests and static checks pass. The launcher supports
  Device Hub. Physical installations and iPad navigation are unchanged. See
  [design status](docs/iphone-navigation-design.md).

## Queued iOS interface follow-up — October 18, 2026

- Queue removal of iPhone's bottom app navigation, a separate bottom browser toolbar, smooth
  interactive swipe-back, improved content thumbnails and pinch-to-overview motion on phone/iPad.
  Explore button, right-edge and upper-left navigation with a Home hub in a local synthetic
  phone preview; the final app-navigation choice remains open. See
  [BF-2026-10-18-02](docs/planned-updates.md#bf-2026-10-18-02--reclaim-phone-space-separate-browser-controls-and-rehearse-native-style-motion).
- Queue desktop sidebar order, thin section dividers, integrated Workspaces collapse and matching
  workspace/project/item colors; retain two tab-navigation layers on iPad without “‹ Workspace”,
  and restore vertical tab dividers.
- Queue removal of Chat tools, with Live Browser in the tab “+” menu and an authorized agent
  loading path. Broader iPhone navigation is explored separately in BF-02.
- Requirements and synthetic preview only; no production implementation, build or device verification. See
  [BF-2026-10-18-01](docs/planned-updates.md#bf-2026-10-18-01--desktop-sidebar-parity-ipad-tab-layers-and-live-browser-entry).

## 0.2.22 — Browser agents and Engine Room spacing

- Allow authorized agents to use ordinary website tabs across every configured browser profile,
  including profiles with extensions, without tab-sharing or extension-access opt-ins.
- Add hidden/unloaded browser creation, background Load/Unload/Refresh, and revision-checked
  browser Load/Unload in the shared tab manager. Preserve hidden state during renderer sync.
- Refresh required agent guidance and replace obsolete browser access toggles with status.
- Give Engine Room cards consistent spacing, including nested Browser Preferences groups and web.

Validation and rollout: [browser agent access](docs/2026-10-18-browser-agent-access.md).

## 0.2.21 — Workspace projects

- Migrate iPhone/iPad signing to the paid organization account with a separate mobile identifier,
  preserving pairing keys, encrypted history, tabs, drafts and settings through a verified transfer.
  Keep the original installations for recovery and provide the paid build configuration/runbook.
- Promote the reviewed workspace/projects navigation, global Source library and concise chat
  permission controls to production desktop; retain the isolated design-preview workflow.
- Add stable default projects, manual project ordering, and project deletion that moves chats
  and tabs into the current default while retaining their execution context and permissions.
- Migrate existing workspace chat views additively, preserving workspace resources, drafts,
  browser history and stable content identities. Raise desktop session capacity to 1,000 tabs
  and reject overflow without silently truncating saved data.
- Add owner-scoped projects and source configuration to web and paired desktops, including
  legacy/offline handling and separate project tab synchronization.
- Align web navigation with the accepted desktop palette, icons, grouped workspace/project
  rows, mixed resource recents, fixed workspace tabs and resizable sidebar overlay. Keep
  Engine Room in the scrolling navigation and AI allowance fixed below it.
- Preserve legacy saved views while chat indexes and existing shared-tab scopes reconnect;
  migration acceptance checks every original view alias, order, draft and history record.
- Route paired-desktop project, source and membership actions through the same owner revision
  checks as web, and retain project membership in the paired chat index.
- Preserve existing opt-in history sharing and owner access boundaries. Cookies, credentials,
  terminal processes and execution permissions remain on their owning computer.
- Extend the workspace/project model to native mobile with owner-scoped project navigation,
  configuration, source selection, default/deletion controls and retained offline descriptors.
- Group paired workspace trees beneath Other Computers, keeping local/default-computer
  workspaces first and computer labels above each remote tree. Left-align web project headers.
- Reuse fresh project and permission snapshots within each status response and batch sidebar
  scroll-position saves, reducing repeated synchronous work for large chat collections.
- Back off repeated tab-sync failures by scope while retaining pending actions and their
  original retry identities; healthy scopes continue synchronizing.
- Display saved runs' captured permission context without recapturing their scheduled sources
  during status polling. Share repeated MCP parsing and permission-path resolution only within
  bounded synchronous display projections; execution and authorization still read current state.

Validation and staged/installed/deployed status: [release runbook](docs/2026-10-18-projects-release.md).

## Desktop design preview revision — October 18, 2026

- Scan newly registered Source library folders before reporting completion and expose their
  instructions, skills, agents and connection definitions in every workspace. Add Rescan and
  clear complete, empty, partial and failed scan feedback. Keep registration discovery-only.
- Add folder-level Load in and Apply to all beside Set as starting folder. Apply once to every
  current source in that folder, including filtered items, while retaining individual overrides,
  favorites and other settings. Later discoveries do not inherit the bulk choice.
- Scroll Engine Room and its sections below the workspace tree, separated by dividers. Keep
  AI allowance fixed. Add Collapse all with paging reset; move Open data folder to App settings.
- Put Use workspace, Ask, Saved permissions and Auto-approve tools directly in chat permissions,
  with a separate read-only approval checkbox and Ask/Read/Read and write working-folder access.
  Keep remembered actions and revocation scoped explicitly to the chat or workspace.
- In preview Saved permissions, an explicit read/write grant for the starting folder enables
  Codex workspace-write on the next turn. Keep protected requests, native policy validation,
  no implicit network/temp access and the selected-MCP-server breadth limitation explicit.
- Source and disposable UI checks are recorded in the preview documentation. New package,
  retained-profile and real-provider verification are separate acceptance steps. Production,
  web and mobile remain held.

## Desktop design preview revision — October 17, 2026

- Delete nondefault projects from the workspace Projects page. Move all their chats and tabs
  to the current default without resetting sessions, drafts, history, permissions or activity.
  Protect the current default by identity; choose another default to delete the former General.
  Preserve reassignment through restart and stale tab saves. Isolated desktop preview only.

- Keep recent chat/tab positions and ages stable on selection, focus and scrolling. Advance
  activity for accepted messages, browser navigation/refresh, terminal input and new resources.
- Save manual project order from the workspace Projects page; mirror it in the sidebar.
  Validate workspace/project tab scope and disable aggregate workspace Tabs reordering.
- Keep closed workspace navigation closed during reconciliation. Release closed chat view
  caches after the final alias closes, preserving drafts, history and active execution.
- Browser Hide unloads in the preview; Restore stays unloaded until selection. Preserve hidden
  persisted browser history/activity through restart. Native unload blockers leave visibility
  unchanged; persistence conflicts roll native visibility back. Production remains held.


- Increase sidebar feature, workspace and project labels to 14px. Keep individual chat/resource
  item titles, counts and computer metadata at their existing sizes.
- Resize the preview sidebar from its right edge and retain its width in application appearance
  settings across restarts. Use the same width for pinned navigation and the collapsed popover.
- Restore the collapsed sidebar as an overlay without shifting the main content. Temporarily
  hide native browser views while the popover is open, using the existing overlay mechanism;
  preserve their page/session state and restore them after the overlay closes.
- Adopt the latest reference navigation palette: charcoal-green sidebar, quiet workspace
  surfaces, slightly brighter active project panels and a muted green selected row with a
  rounded accent edge. Use balanced, tighter panel insets, pale green active icons, muted
  inactive icons and a filled attention count. Preserve all icon designs and website favicons.
- Selected icons in main, chat/workspace and Team Tools tab bars use the same green accent;
  selected tab titles stay white. Active feature recents share one continuous panel around
  the heading and items, without an inner list box. Restore the horizontal divider below Workspaces.
- Show recent activity in minutes below an hour (`<1m`, `1m`–`59m`) in all preview navigation
  lists, retaining hours/days for older items. Keep the desktop preview isolated.

## Desktop design preview revision — October 16, 2026

- Add separators between fixed workspace tabs and following resource tabs. Workspaces now opens
  directly to workspace cards; its duplicate all-workspace Chats tab is removed.
- Keep chat permissions in the existing side panel and remove the composer Permissions button; pending
  requests offer Allow once, Deny and supported Remember scopes. Put explanations in Help and
  workspace-wide changes in Workspace Configuration.
- In the preview, adding Codex access keeps the current narrower sandbox running; reductions
  still interrupt and require explicit continuation. Remembering an action retains inherited
  folder permissions. Resetting a profile is labeled as returning to workspace defaults.
- Add grouped sidebar rows with two-line chat names and right-side workspace/project expanders.
  Retain expanded groups across feature navigation; collapsing a project or leaving the feature resets
  its list to seven recent items. Features and workspace groups scroll above fixed AI allowance
  and Engine Room controls. Production and web/mobile are unchanged.
- Use matching feature icons in fixed tabs and the double-bubble chat icon in Open tabs. Brighten
  inactive navigation labels and make every selected tab title white, including browser tabs.
  Extend the selected project background through its expander.
- Replace preview Open tabs up/down buttons with dragging from titles or row space and
  Alt+Shift+Up/Down from a focused title. Reorder within the current workspace/project only,
  preserving normal action buttons, title clicks, filters and column resizing.
- Apply the selected workspace-panel design using existing colors. Project recents now combine
  chats, browsers, terminals and documents with type icons, relative access ages and full counts.
  Workspace headers show computer name and project count. Use the same grouped selection in
  recent Chats, Internet Searches, Schedules and Needs attention. Lists start at seven; More adds
  four, with extra paging reset on collapse or feature departure. Keep navigation backgrounds,
  fixed footer, tab identity and captured permissions unchanged.

## Isolated desktop design preview — October 15, 2026

- Add a separately named Proteus Design Preview, with independent app/browser/Codex session
  storage, synthetic workspace/project/source fixtures and opt-in real Codex chats.
- Implement workspace Projects/Chats/Tabs/Configuration, flat project tabs, scoped chat lists,
  shared quick-view drafts and organizational chat moves preserving captured execution settings.
- Add a discovery-only Engine Room source library and clearer real approval controls in chat.
  Bounded Autopilot is explicitly unavailable; broad approval retains its existing semantics.
- Production replacement/migration and web/mobile remain held. Non-chat project moves and
  workspace deletion are deferred. See [desktop preview](docs/desktop-preview.md) for verification.

## Next release intake — October 15, 2026 · production rollout held

- BF-2026-10-15-01: On returning to a Markdown file tab, check its original source on disk and refresh the page if its saved content changed.
- BF-2026-10-15-02: Add Refresh to Markdown file tab right-click menus, rereading the targeted tab's original source.
- Both refresh paths must preserve the user's scroll position instead of jumping back to the top.
- BF-2026-10-15-03: Reduce Proteus pop-up alert auto-dismissal from 15 seconds to 5 seconds.
- BF-2026-10-15-04: Make full paths/URLs clickable in agent responses: folders open Finder, Markdown opens the in-app editor, websites open browser tabs, and other supported resources use their Proteus viewer. Keep the full destination visible; Activity blocks are outside the required scope.
- BF-2026-10-15-05: Make Enter in the new workspace name field create the workspace through the same validated action as Continue.
- BF-2026-10-15-06: Explain which instruction source changed on disk and add a working Refresh sources button to the alert, preserving the new-chat draft and selections for review and resubmission.
- BF-2026-10-15-07: Add/import workspace browser tabs unloaded, hidden, or both through shared UI/agent operations, retaining discoverable metadata and loading only on explicit activation when initially unloaded.
- BF-2026-10-15-08: Remove remaining extension/private profile gates so authorized agent tab creation, loading, reading and control work in every profile without switching profiles or a separate extension-agent opt-in. Queued only.
- BF-2026-10-15-09: Investigate Claude chats sometimes requiring a second send; trace queue delivery, provider handoff and response/Working state so one accepted message progresses reliably. Queued only; cause unverified.
- BF-2026-10-15-10: Design an Engine Room source library shared across an owner's workspaces, with workspace/chat source selection and separate access grants.
- BF-2026-10-15-11: Design organizational Projects within Workspaces: workspace name in top-level navigation, fixed Projects/Chats/Tabs/Configuration locally, optional workspace resources, nested sidebar projects and existing chat-index conventions with scoped filter locks. Workspaces collection has Workspaces/Chats tabs; preserve existing icons and migration identities/history/sessions.
- BF-2026-10-15-12: Design clearer permission scope and bounded Autopilot with actual provider enforcement; inline chat requests, shared Details/composer permission controls, draft retention and grant reuse/revocation. Preserve existing authorization and distinguish legacy broad modes.
- BF-10–12 have a [consolidated brief](docs/2026-10-15-workspaces-projects-design.md) and [synthetic clickable prototype](docs/design/2026-10-15/projects-workspaces.html). [Prototype UI rehearsal](docs/design/2026-10-15/prototype-validation.md) passed; no live migration or permission changes are claimed.
- BF-10–12 are authorized for the separate desktop preview above. Other items remain queued;
  production installation/deployment and live-data migration remain held.

## Native Favorites and complete simulator coverage — October 15, 2026

- Preserve a cold-launch notification’s selected schedule or chat while browser tabs restore. Only an explicit browser selection activates a browser; cached selection remains remembered without taking focus.
- Keep the chat Favorites section and star actions scoped to the current owning-host workspace, including captured chat profiles without an ID; reflect explicit favorite removal while source sections are offscreen.
- Route native browser edge swipes through one handler so the documented content-edge gesture consistently traverses one saved history entry. Matching native history still preserves page instances; WebKit’s separate interactive swipe animation is disabled.
- Validate native UI on actual iPhone and iPad simulator families with exhaustive, disjoint test selection. Correct stale UI interactions while retaining backend ownership, selection, draft and metadata assertions.

## 0.2.20 source integration — cross-platform acceptance pending

- Integrate the accepted Mac source companion from `418a083`, preserving native link/selection menus, source-workspace drafts and durable tab-sync retry/backoff behavior alongside the cross-platform host changes.
- Verify all 879 source hashes and archive digest; retain separate Mac source and Linux runtime fingerprints. Native project version advances with upstream to 0.2.20 / 2610.14.3, preserving app/signing identity.
- Require fresh checks and package acceptance for this integration. Earlier 0.2.19 receipts and in-progress hosted runs apply only to their tested checkpoints; no new local installation or live iPhone-to-Linux verification is claimed.

## Cross-platform host compatibility — October 14, 2026

- Use the selected computer's name across desktop, website and native connection, provider, permission, usage and file messages. Authenticated platform metadata identifies Linux or macOS when available; older protocol-1 hosts keep neutral labels.
- Keep independently paired Linux PCs and Macs behind the same encrypted relay, preserving host IDs, device keys, caches, drafts, approvals and retry receipts. Retain legacy wire/account preference keys and native Keychain identities.
- Resolve explicit legacy database credential references through Linux Secret Service or the existing Mac Keychain. Desktop token stores continue to reject plaintext fallback; normal Life clients still use the website API.
- Share Mac/Linux packaging inventory, source hashes and complete package metadata/provenance checks. Rebuild only the copied PTY; retain Mac bundle identity and Copilot vendor signing checks.
- Add hosted Linux/Mac desktop, web and iOS simulator validation. Native CI, signed Mac acceptance and a real iPhone-to-Linux relay session remain pending; see [current validation](docs/linux-app.md).

## Linux adaptation of accepted 0.2.19

- Build from the verified canonical 0.2.19 Mac source companion, retaining current workspace/tab/browser behavior. Add separate Linux packaging with source provenance and Electron PTY rebuild, XDG storage, user executable discovery, Linux tray/minimize/Quit controls and user-shell defaults. Preserve Mac packaging/signatures, native clients, protocol and pinned dependencies.


## 0.2.20 — candidate, validation/install in progress

- Native browser link actions also appear through the editing-menu path, resolve the pressed
  anchor, retain source placement and reuse downloads/native selection.
- Prevent stale tab metadata and shared-state application from generating repeated mutations.
  Persist retry identity, batch metadata, back off by owner and identify receipt-capacity limits.
- Carry forward the tested attachment-composer layout to the other authorized targets.
- Preserve receipt limits, retry protection and existing data; installation acceptance is pending.

## Update workflow instructions

- Limit recovery to two full verified generations per installation/device, avoid duplicate rollback and before/after/retry copies, and compact completed migration evidence. This is an operator/update workflow rule, not a new app feature.

## Historical October 14 intake — not implemented at that checkpoint

- BF-2026-10-14-01: Add appropriate native browser link/selection menus for iPad/iPhone and native Mac: new tab, copy link, start chat, download and native selection actions.
- BF-2026-10-14-02: Investigate receipt-capacity exhaustion and excessive background tab-sync traffic; fix redundant writes/retries and identify the owner/limit in the warning while preserving retry safety.

## Unreleased — Keep attachment controls visible

- Give attachments a bounded, scrollable section between the message editor and the fixed controls row in local desktop, visiting desktop and web chats. Keep +, model options and Send/Queue/Steer/Stop accessible for large batches and long drafts.
- Remeasure replaced attachment strips and account for waiting questions when sizing the editor. Match attachment chips, file sizes, thumbnails and controls across desktop and web.

## 0.2.19 — Navigation, redirect history and scheduled conversations

- Relocate the saved chat-tab descriptor from main navigation into its workspace in the owner store, independently of paused browser synchronization. Repeated Move converges duplicate placements while preserving other tabs, custom names, dates and metadata.
- Keep the moved chat selected inside its destination workspace and bring both navigation tabs into view.
- Identify the affected tab/page in browser conflict recovery and use plain saved-history/pending-page choices.
- Remove redirect pausing and countdown banners. Desktop, web and native history preserve original URLs and every redirect destination, including query strings and fragments, without replaying engine state or POST bodies.
- Open the existing tab from its Workspace Tabs title and reveal its navigation entry on desktop, web and mobile.
- Allow explicit conversation-only approval for a schedule-started conversation using its exact waiting request and existing context/revision checks; future scheduled runs retain their own approvals.
- Keep the 0.2.18 movement, membership/index, resizable columns, sidebar visibility and agent document placement corrections.

## 0.2.18 — Respect workspace placement for agent-opened documents

- Open an agent-created document beside its existing workspace chat instead of creating a duplicate top-level chat container. Reuse the viewer and retain original document ownership/access checks.
- Include the tested 0.2.17 tab movement, membership, resizing and sidebar corrections; the 0.2.17 candidate was superseded before installation.

## 0.2.17 — Tab movement and navigation follow-up

- Separate navigation operation IDs from history entry IDs, acknowledge identical already-saved entries without new visits, and pause conflicting or closed-tab retries with visible recovery choices.
- Move browser tabs through the owner service and retain complete Back/Forward stacks across placement changes, including revisiting an earlier destination.
- Give Workspace Tabs titles 360 pixels by default; resize columns with pointer or keyboard and remember widths locally. URLs truncate within their column; narrow screens retain the card layout.
- Enable Move chat to workspace from chat-tab menus, reconcile organizational membership immediately in Chats lists, and keep independent captured run/approval settings.
- Make expanded compact navigation reserve layout space beside the native browser, keeping the page visible and loaded.

## 0.2.16 — October 14, 2026

- Import saved chats, terminals and viewers into older browser-only navigation registries before
  synchronization can remove them. Preserve existing browser authority and ordering, and record
  the completed import so intentional closes remain closed after restart.
- Native clients remain on the tested 0.2.15 / 2610.14.1 build; the correction runs on the desktop owner.

## 0.2.15 — October 14, 2026

- Add required visible Proteus guidance/tool inventory and all-type tab management through the
  owner service/local MCP; Workspace Tabs lists metadata and supports hide, order, move and close.
- Move chats between workspaces while retaining captured run options and sessions. Delete a
  workspace with chat preservation/rehome options and retryable resource closure.
- Group recent Send destinations; persist browser tabs outside normal retention; keep the global
  Needs attention count stable; show agent questions alongside their recorded answers.
- Add desktop redirect decisions and native history reconciliation with requested-path provenance;
  downloads with dates, cancellation, destinations, folder controls and Save As/export.
- Integrate Playwright MCP and visual image/coordinate tools; optional scoped Chrome DevTools MCP
  and human DevTools; explicit extension-profile agent access and compact, localized, dismissible
  extension controls. SQLite workspace/chat metadata migration remains shelved.

Current tests and per-target rollout status are recorded in
[the release ledger](docs/2026-10-13-tab-management-release.md). Earlier queue-only notes below
are historical; no new installation is claimed by this entry.

## Future update intake — October 13, 2026 · queued only

- Confirm agent sharing for extension-enabled tabs (BF-17); queue address-toolbar Extensions/
  Install placement and localized extension names (BF-18), bounded/dismissible rendering popups
  (BF-19) and missing-answer/feedback reconciliation (BF-20). Completed owner read-only audit:
  native events/JSON/API agree; first explanation was not emitted, later explanation is preserved
  in a feedback question. Queue readable question history; historical UI acceptance pending.
  No application implementation/build, feedback sent or grant changes.
- Record answered Copilot/Claude questions disappearing from visible history while user replies
  remain. BF-20 reopens BF-2026-10-07-07 presentation acceptance: full linked question/answer
  history, beyond durable system-event capture. Queued only; no runtime change.
- Record chosen default Playwright and optional on-demand Chrome DevTools MCP, with built-in
  human DevTools/Inspect and agent MCP package integration; BF-2026-10-13-16. Queue configurable
  agent access for extension profiles instead of a blanket private block; BF-17. No build/grant changes.
- Record operator authorization to use the previously linked Zoho Assist session for future
  BF-2026-10-13-15 visual/input tests. Session details remain private; build hold stays in place.
- Add visual control to the build list using existing Playwright: actual image tool responses,
  viewport coordinate click/drag/scroll/keyboard and verification for Zoho Assist/canvas pages.
  Preserve scoped tab/profile access and semantic tools; BF-2026-10-13-15. No implementation/build.
- Queue Firefox-style browser downloads: normal-download handling, indicator/progress/date,
  per-item cancellation, configurable owner-local Downloads folder, Open folder and right-click
  Save As; BF-2026-10-13-14. Existing helper-grant path blocks ordinary page downloads. No build.
- Queue Delete workspace with affected-tab closure and preserved chats becoming unhoused, or
  bulk relocation to an existing/new workspace. Preserve conversations, run options, approvals,
  active work and project files; BF-2026-10-13-13. No actual deletion or implementation/build.
- Queue Workspace Tabs between Chats and Configuration, with typed inventory, flexible URL,
  opened/interaction dates and hide/restore/reorder/close/move. Extend associations to terminals/
  viewers as well as browsers; BF-2026-10-13-12. Add synthetic interactive design context only.
- Queue all-tab inventory/filtering/metadata and movement/closing for internal/external agents,
  with chat workspace/lifecycle management through a shared service boundary; BF-2026-10-13-11.
  Review SafariSelector patterns and add project AGENTS guidance plus a discoverable tab-manager
  agent profile. No management tools, runtime behavior or builds added.
- Queue a consistent global Needs attention badge across view changes and chat-index refreshes.
  Full renders include non-chat items; index callbacks currently overwrite it with chat-only
  totals. BF-2026-10-13-10; code finding only, no implementation/build.
- Shelve BF-2026-10-13-09 storage migration discussion in future ideas, outside the active batch.
- Review JSON versus SQLite for workspace/chat metadata and tab state; recommend considering
  a hybrid with editable JSON configuration and transactional app state, with one field authority
  and a separate decision for transcript migration. BF-2026-10-13-09; review only, no build.
- Queue Persist tab for browser tabs: prevent automatic unload and exclude persisted tabs from
  the regular loaded/retained allowance while keeping actual resource totals accurate. Remember
  the preference through restoration/moves; BF-2026-10-13-08. No implementation/build changes.
- Queue labelled Workspaces/Chats sections in Send tab destinations, each most-recent first;
  retain Application tabs/Team Tools and existing transfer behavior. BF-2026-10-13-07; no build.
- Queue Move chat beside Archive/Delete, with a destination-workspace picker and actual membership/
  navigation relocation on desktop, web and mobile. Preserve effective per-chat configuration,
  drafts/session/children and owner identity; BF-2026-10-13-06. No runtime/build changes.
- Queue redirect/replacement-aware browser history after reported ADO `view=results` Back/swipe
  loops. Record code findings, established browser behavior and future acceptance; preserve
  meaningful query parameters. Revised preference preserves original/login-redirect destinations
  and pauses eligible redirects for a five-second Accept / Reject banner with automatic timeout
  continuation and immediate Back cancellation. No runtime/build changes; BF-2026-10-13-05.
  Revised platform split: iOS/iPadOS uses redirect/replacement-aware history reconciliation
  without a banner, preserving original destinations as recoverable provenance. Electron desktop
  keeps its banner proposal. No implementation or builds are authorized.
- Queue required, visible Proteus feature awareness for chat agents, an accurate provider tool
  inventory and review of on-demand feature guidance/tools within existing context/details views.
  Record current built-in app guidance and partial tool coverage. No runtime behavior, builds
  or installations change; see BF-2026-10-13-04 in docs/planned-updates.md.

## Browser tab stability — October 13, 2026

- Preserve saved titles while activating restored browser tabs, and update unloaded native snapshots when the owner publishes a new page title. Loading placeholders no longer enter shared metadata and resize tab labels.
- Keep main and Team tab-strip nodes during unchanged state broadcasts and polling. Preserve scroll position, mounted page state and custom titles.
- Recheck current order after asynchronous browser reconciliation, preserve user reorders made during a load, count overlapping scope application correctly, and detach captured navigation/baseline snapshots from mutable renderer history.
- Correct the standalone browser Add tab popup's out-of-scope workspace reference. Validation/installation status: docs/2026-10-13-tab-stability.md.

# Changes

## 0.2.13 — Rotating logs and clicked browser links · October 13, 2026

- Store full redacted computer diagnostics in a separate worker-owned SQLite database. Rotate
  oldest records at 2,000 entries or the 64 MiB payload budget; preserve the original JSON during
  migration and keep execution retry receipts independent.
- Show compact log headers with Details expanders and 50-entry pages across desktop, web and
  native clients. Fetch traces only on expansion and locate retained older entries from alerts.
- Protect clicked-page navigation while loading so history polling cannot reload the old address
  and abort the intended destination. Preserve redirects, private pages and Back/Forward history.
- Tests and per-target acceptance/installation are tracked in docs/2026-10-13-logs-browser.md.

## New release intake — October 13, 2026 · queued only

- Start a fresh collection-only list under the operator's explicit build hold. Queue compact log
  headers, expandable full messages/stack traces/diagnostic fields and bounded pagination.
  Record current JSON storage/truncation and a proposed dedicated worker-owned SQLite store;
  no application implementation, migration, build, installation or deployment.

## Internet Search dialog layout — October 13, 2026

- Let the search input fill the enlarged dialog instead of inheriting the chat composer’s 140px height cap. Keep the provider actions and Cancel below the input, and scroll long text within the input.

## Team browser refresh correction — October 13, 2026

- Keep the selected Team Tools browser mounted during unrelated background state and shared-title updates. Preserve page scroll, address edits and native surface visibility while refreshing application navigation. Account, selection, load/profile, layout and explicit refresh changes still rebuild the view.
- Disposable renderer regression reproduces the former Preparing tab flashes and verifies the correction; installation status is separate.

## Unified browser history and navigation — October 12, 2026

- Store Default and named-profile visits in a worker-owned indexed SQLite database, with progressive search, optional paired-computer replication and a durable native upload outbox. Keep legacy history and existing command retry receipts. The account service retains profile definitions; new browsing history stays on the owning computers.
- Synchronize stable per-tab navigation entries and the selected position, including Forward history. Atomic navigation/visit receipts prevent mirror and retry duplicates; conflicting offline changes remain recoverable. Local unload and private authentication pages cannot clear shared tabs.
- Configure history recording, retention and replication using the owning computer’s paired computers and profiles. Preserve hidden peer preferences and unknown settings when saving across clients.
- Add native navigation history lists, touchpad traversal, local tab previews, profile-aware history and bounded day-by-day older-history queries. Account refresh and browser profiles work independently of Life.
- Add Copy chat link to desktop/web/native chat tab menus and organize infrequently used paths in Run files & folders below approvals. Workspace agent browsing defaults to its initiating workspace, supports explicit destinations, and remote chat indexes preserve workspace identity.
- Preserve all restored local browser views when older sessions contain multiple views for one synchronized tab identity; ordering no longer leaves an undefined tab during startup or refresh.
- Validation and per-target installation status are recorded in docs/2026-10-12-unified-browser.md; implementation does not itself establish live verification.

## October 12 remote-state and interaction correction

- Avoid rebuilding full chat prompts for integration health. Reuse scoped catalog projections only within a synchronous enumeration, compile exclusions once per operation, retain exact registry IDs and reread current configuration/source bytes.
- Bound favicon resolution per navigation, coalesce in-flight resolution and ignore unrelated network completion so invalid HTML favicons cannot trigger a request loop.
- Retain separate bounded long-stall diagnostics, with context/attention/integration, attachment cleanup and activity persistence timings.
- Group tools, approvals and distinct system messages into contiguous Activity blocks using existing platform designs. Show recorded tool completion times, durations and related approval requests. Remote desktop Working follows owner state and clears when disconnected.
- Insert new browser tabs immediately after their captured source in the same navigation container. View logs refreshes the destination and reveals the associated event, with a fallback for missing entries.
- Restore native tab type icons, including workspace chat tabs. Preserve saved Back/Forward history across native navigation, refresh shared default-profile Recent sites with explicit loading/error states, enable compatible WebKit back/forward gestures, and add pinch-to-overview animation with Reduce Motion support.


## New release intake — October 12, 2026 · queued only

- Record alert-banner View logs doing nothing; queue opening Logs and revealing the associated
  entry when available, with a Logs-page fallback. Collection only; no runtime changes.

- Queue Open in new Proteus tab insertion immediately after its initiating tab in the same
  navigation container, instead of appending to the end. Collection only; no runtime changes.

- Queue remote desktop parity for the local Working spinner/message and queue/steer guidance,
  driven by owner-host turn state. Reported omission; no runtime changes or builds.

- Start a fresh collection-only batch under an explicit build hold. Queue consistent desktop,
  iPad and iPhone activity/approval cards, original-request/tool-call association and per-tool
  completion timestamps/durations. Combine intervening tools, approvals and darker system boxes
  into one Activity group between user/model messages. Requested comparison is design only;
  no application implementation, build, install or deployment.

- Clarify this intake as message-detail/relationship parity using each platform's existing design,
  including iPhone's different native layout. The comparison does not propose a full visual redesign.

## Unreleased — October 12, 2026

- Move periodic schedule reads, validation, cron calculation and durable checkpoint writes into a serialized worker. Preserve run claims before execution, current-file schedule changes, skip/coalesce behavior and checkpoint recovery.
- Add bounded private event-loop and phase timing diagnostics for periodic hangs, distinguishing synchronous blocking from asynchronous waits; retain current and previous diagnostic snapshots locally.

- Remote commands use incremental durable receipts in a worker instead of rewriting the whole journal on Electron's main thread. Preserve legacy data, replay protections and uncertain outcomes; add byte-aware admission and payload-free diagnostics. Suppress unchanged tab-sync mutations using shared descriptor semantics.
- Process and persistent-terminal metrics poll asynchronously, cookie snapshots use ordered asynchronous disk operations, and browsing-history serialization/retention/writes run in a worker. Preserve browser state across shutdown and remove redundant workspace-session rereads after saves.

- Missing supplemental workspace/source folders no longer block chat creation. Unavailable folders are skipped with a persisted chat warning while configuration is preserved; remote chat creation tolerates missing sibling folders too.

- Native chat/workspace browsers retain their current page when tab synchronization echoes an empty new-tab placeholder; real remote navigation, close and profile changes remain authoritative.

- Folder headers use their available width before wrapping; expanded sections retain row separators without an inner vertical border. Rename workspace-local discovery to Workspace sources.
- Show each computer’s configured name consistently and count only currently running, unarchived chats from connected computers in the Chats badge.
- Match workspace and main Add-tab menu order, icons and spacing across clients, preserving explicit owner-only capabilities on remote clients.

- Pinned Workspace/Chat tabs use the shared single 2-pixel selected underline, removing a duplicate inset shadow.

- Restore clearly expandable source-folder sections with disclosure arrows, folder headers and visually contained controls/items.

- Separate folder paths from scan counts with a spaced dot. Keep source-type buttons above the full-width master filter on desktop and web.

## 0.2.12 — Workspaces and browser fixes — October 11, 2026

- Workspaces now own independent folders, source selections, defaults and approvals, and persistent named navigation with a pinned Workspace page for Chats and Configuration. Seven recent workspaces appear in the sidebar; master and workspace chat views share one conversation and draft.
- Complete local workspace copies open Configuration after naming. Cross-computer copies map paths into an independent owner workspace and reset machine-specific trust. Remote configuration retains editable selections and approvals with owner-only folder picking.
- Sources use alphabetical folder sections and items with a master filter, per-folder refresh, configurable exclusions and independent scan budgets. Folder trust can be granted and revoked for one chat.
- Browser preferences and filter updates work from the menu; Chrome Web Store installation and managed update rollback are available. Tabs and links retain their navigation context; transfer exceptions are guarded; hover URLs use one line; history suggestions filter while typing.
- Browser gesture handling preserves native scrolling. Chat composers dock and resize without collapsing the live editor; Internet Search gives its larger message box the added space.
- Claude input totals include observed cache-read and cache-creation tokens. Older incomplete usage remains marked partial rather than estimated.
- Desktop, web and native verification and rollout are tracked separately in docs/2026-10-11-workspaces-release.md. Workspaces supersedes the separate Projects concept.

## Apple signing preflight — October 11, 2026

- Install the validated .5 iPad app as a native Designed for iPad client on this Apple silicon Mac,
  alongside desktop Proteus. Operator-confirmed launch and independent process checks passed after
  macOS Security authorization. Existing certificate retained; no runtime changes.

- Require Mac unlock before Apple account/signing checks, and repeat checks after unlock before
  diagnosing missing setup. Preserve existing accounts, certificates and app data. Instructions
  updated; the validated native .5 artifact was re-signed and installed in place on iPhone and iPad.
  Launch, seven protected files per device and destination retention were verified. Renewed profiles
  expire October 18; existing certificate shared with Omi retained. No runtime or Omi changes.

## New issue / feature plan — October 10, 2026 · queued only

- Revise Workspaces design after operator feedback: feature list without its own tab, seven recent
  sidebar entries, pinned Workspace with Chats/Configuration pages, existing configuration labels
  and all four modes retained. Master Chats opens main tabs; workspace chat views share identity
  and Send to workspace deduplicates. One owning machine per workspace, per-folder refresh, no
  feature switches. Replaces the initial separate configuration-tab preview; design only.

- Design unified Workspaces as independent configurations and persistent chat/tab containers,
  superseding the separate Projects proposal. Add an interactive preview of workspace list,
  configuration, shared locked/global chat lists and named content tabs. Seven recent workspaces;
  isolated source selections and approvals. Design only; no production implementation/build.
- Start a separate planning batch under an explicit implementation/build/install/deployment hold.
- Record acceptance of configurable discovery exclusions and independent root scanning, followed
  by an explicit wait-to-build instruction. Replace the proposed Use in this chat action with
  Set as starting folder in source-folder headers. Queued only; no implementation/build started.
- Investigate the October 11 source-discovery warning: the global directory budget can be
  exhausted by an earlier root and falsely implicate later small roots. Verify an isolated scan
  succeeds and dependency/cache exclusions sharply reduce traversal. Queue accurate per-root
  discovery, scan-cadence improvements and clearer chat-folder/source-library distinctions.
  Installed/source comparison and read-only rehearsal only; no live configuration/runtime change.
- Hold further Projects design for a separate discussion. Queue whole-folder trust scoped to
  one chat, with recursive access, restart/continuation persistence and revocation. Current folder
  trust is workspace-scoped; chat-only auto-approval grants no new folder access. No runtime change.
- Propose Projects as persistent chat/browser containers with project-owned inherited setup,
  reusing existing workspace context machinery and retaining Workspaces as presets. Add a synthetic
  desktop/phone UI preview and document scoped agent edits, tab routing/transfers and cross-device
  sync boundaries. Design review only; no project runtime or synchronization implementation.
- Queue typed address-bar filtering of recent history, **Search with…** options for multiword
  queries and Enter using the configured default search engine. No address-bar changes implemented.
- Record the operator's selection of **Folder sections** for Instructions, Skills, Agents and MCPs,
  with folders/items alphabetical and master filtering across all sections/folders. Keep the folder
  sidebar as an unselected preview alternative. Synthetic browser rehearsal only; the operator
  reaffirmed no build yet, and production implementation/build/install/deployment remain held.
- Record rapid desktop history scroll jitter while typing; queue investigation of composer sizing
  and transcript resize/scroll-following interactions, preserving reading position and draft/caret.
- Confirm Claude Input tokens omits cache-read/cache-creation input. Queue complete accounting,
  a retained breakdown and historical-scope reconciliation; no normalization change implemented.
- Queue single-line browser link-hover status popups, using available width and an end ellipsis
  for long addresses instead of wrapping over page content.
- Record repeated main-process exceptions during browser-tab moves to an Internet Search chat.
  Both reported request-handler traces match unsafe `webContents.id` lookups; lifecycle
  reproduction and correction remain queued.
- Queue an Internet Search dialog 30% wider and 40% taller, with the added usable space assigned
  to the message box and existing control/font sizes retained.
- Record the website chat composer failing to dock at the panel bottom, with a large unused gap
  in the operator screenshot. Queue shared-layout investigation and visual acceptance checks.
- Queue new-tab routing from menus and links to the source tab's navigation area: same chat,
  top application navigation or Team as applicable, preserving placement through refresh/restart.
- Record choppy browser scrolling and plan performance profiling, including the blocking gesture
  wheel listener. Cause and thread scheduling concerns remain unconfirmed; no runtime change.
- Record Ghostery Browser Preferences opening Resources and Update Ghostery filters appearing
  to do nothing; causes and affected-install reproduction remain unconfirmed.
- Plan Chrome Web Store installation and managed extension updates without manual folder handling.
  Feasibility references and acceptance criteria are in `docs/planned-updates.md`; extension
  compatibility remains unverified. This entry records planning, not application changes.

## Mobile history and composer follow-up — October 10, 2026

- Open at the latest message and progressively expose every older event. Prefetch into cache within two viewport heights of the top; preserve the visible message while prepending. Count collapsed activity as one meaningful row so tool-heavy history advances quickly.
- Defer collapsed activity bodies and nested tool output until expansion; release offscreen native Markdown renderers and pause completed runtime timers. Include the composer safe-area inset when finding the bottom.
- On mobile, prepare older messages 2.5 screens before the boundary, fetch transport pages up to six screens ahead, warm rich content 1.5 screens ahead and prepare twenty-four rows per later batch while retaining the twelve-row initial window. Continue preparing during upward scroll momentum.
- Replace persistent desktop browser load-error bars with the existing fifteen-second notification, Reload/View logs actions and a sanitized retained Logs entry. Ignore aborted/subframe loads and avoid duplicate reports for one navigation attempt.
- Use one green directional expander in compact native model options.
- Give desktop/web New chat a taller dialog and keep attachment previews above the provider/model/action row.
- Stack runtime, input tokens and output tokens vertically, with centered dark value boxes and labels above them; include the same information in expanded native Chat details.
- Compact safely expired completed command receipts within the existing capacity bound, removing the misleading day-long command-limit message.
- Verification/install status: `docs/2026-10-10-mobile-history.md`.

## 0.2.11 — October 10, 2026 · full queued chat release

- Apply the approved composer across desktop, remote desktop, web, iPhone and iPad: plain +,
  circular green up-arrow Send, clock-badged Queue, circular Steer/Stop, labeled wide choices
  and a compact options menu when space is limited. Keep desktop and web composer colors aligned.
- Grow the message editor upward with its content until the composer reaches 60% of available
  chat space. Center attachment hover highlights and enlarge model-option highlights.
- Share the local desktop Run details format with remote and web chats: larger runtime, smaller
  input/output token counts beneath it, collapsed explanations, visible/copyable paths and
  disabled remote local-file Open buttons. Match Home, Workspaces and Internet Searches icons.
- Fix native Choose photos presentation, place Working above the composer, inset Chats headings,
  separate Live Browser from other tabs and add explicit touch-friendly tab reorder sheets.
  Retain one desktop-origin tab during private login redirects and share persistent same-profile
  website storage across native tabs. Website logins remain independent between devices.
- Preserve isolated native draft editing and cache unchanged visible-event indices so text input
  does not traverse a long conversation. Keep queue, steering, attachments and draft restoration.
- Automatically bundle chat-linked localhost design HTML, CSS, JavaScript modules, images and
  fonts on the owning Mac and deliver versioned snapshots through existing encrypted viewing
  grants. Remote viewers update a stable preview tab; each revision resets script consent.
  Static designs are supported; host APIs, WebSockets and HMR are not forwarded.
- Correct native HTML preview blocker syntax and inherited CSP so approved interactive controls
  and bundled images/fonts render while network, files and app actions remain blocked. Bound
  snapshot caches and remote request bursts; coalesce website reconnects.

Installation evidence is recorded separately in `docs/2026-10-10-full-chat-release.md`: Build Mac,
iPhone, iPad and production web are verified on 0.2.11; HC installation awaits a pending-run decision.

## 0.2.10 — October 10, 2026 · rollout authorized

- The operator approved building/installing the completed combined update and the native typing
  follow-up on Build Mac, Work Mac and available iPhone/iPad devices. The prior build hold is lifted.
- This was the partial rollout. The operator reopened acceptance and required every queued
  composer and automatic-preview change in the full 0.2.11 release above.

## Native chat typing — October 9, 2026 · simulator verified, not installed

- Isolate existing-chat text edits from conversation rendering and shared host-state notifications.
  Preserve immediate scoped draft saving and attachment/external draft refreshes.
- Move automatic encrypted history-cache encoding and writes off the UI thread; serialize writes
  with lifecycle flushes/deletion to retain the latest draft and prevent forgotten-cache recreation.
- Share an ephemeral store among bundled Markdown renderers, suppress idle Find notifications,
  and replace per-edit Character differences with a linear single-Return check.
- Verify long-chat typing/draft retention on iPhone and iPad, 33 native unit tests and keyboard Send
  on iPhone, plus 402 Node tests/static checks. Final iPad run reuses existing binaries under the
  build hold. No physical install; see `docs/2026-10-09-native-typing.md` for limits.

## Queued issues — October 9, 2026

- BF-2026-10-09-39: queue automatic, versioned localhost preview bundling/delivery through the
  encrypted relay for locally and remotely originated chats; no agent packaging required.
  Further builds are on hold until change intake/design review is complete, after finishing the
  already-started native typing work.

- Package desktop/web design HTML with inline styles and scripts for existing encrypted remote
  document transport; link it and the standalone mobile review from `shared-previews.md`.
  No HTTP proxy or application deployment; remote device acceptance remains unverified.

- BF-2026-10-09-25: iPad **Choose photos** attachment action reportedly does nothing. Recorded
  reproduction details, an unconfirmed native presentation lead and acceptance criteria in
  `docs/planned-updates.md`; investigation and implementation remain queued.

- BF-2026-10-09-26: move iPhone/iPad chat-level **Working** text and spinner to the bottom of
  the conversation above the composer. Source placement confirmed; implementation remains queued.

- BF-2026-10-09-27: align the iPhone/iPad attach icon with model selection and move it closer
  to the composer corner to leave more space. Implementation remains queued.

- BF-2026-10-09-28: selected an up-arrow Send icon in a circular button on all platforms,
  keeping the current green color. Implementation remains queued.

- Approve the interactive adaptive composer design for iPhone, wide iPad and narrow iPad,
  with separate options when space permits, a plain + attachment icon and circular Steer,
  Send/Queue and Stop buttons. Preserve existing text-box colors. Updated browser rehearsal
  only; native changes remain queued.

- BF-2026-10-09-29: adopt the adaptive composer layout for desktop/web. Add a full interactive
  HTML model with visible selector labels, desktop-sized circular actions, the existing plain +
  and local desktop's text-box colors shared by all three views. Browser rehearsal passes;
  application integration remains queued.

- BF-2026-10-09-30–31: extend the review page with identical local/remote/web Run details,
  centered + hover, larger option highlights, Explanation expanders, promoted runtime and compact
  tokens, visible/copyable paths, remote/web disabled local-file Open, and upward editor growth
  capped at 60% of chat space. HTML rehearsal verified; application integration queued.
- BF-2026-10-09-32–36: queue native heading insets, the Live Browser separator, tab reordering,
  duplicate desktop-origin tabs after refresh and repeated website sign-ins. Causes/device
  acceptance remain unverified; persistent profiles do not imply cross-device cookie sharing.

- BF-2026-10-09-37: select the web Home, Workspaces and Internet Searches icons for desktop.
  Exact SVGs added to the review page; application integration remains queued.

## 0.2.10 — October 9, 2026 · staged, not deployed

- Enable parallel independent provider chats while preserving one turn per session and showing queue reasons.
- Add persistent browser profiles with opt-in account settings sync, Ghostery protection and an unpacked extension manager. Default retains existing browser data; cookies and vault secrets never sync.
- Add shared actionable notification banners, Needs attention notification lists, site permission controls and direct document access for authorized devices.
- Fix optional history write failures, clipboard staging before provider selection, duplicate models, schedule draft/reload races, stale-source recovery and Internet Search settings reloads.
- Preserve tab positions, pinned Chat spacing, browser Find dismissal, visible agent pointers and directional device pauses. Automatically load older chat messages on every client.
- Native browser stores now persist; profile isolation and the shared banner are checked in the iPad simulator. Bitwarden's official extension install/popup works in isolation; authenticated vault flows, native AutoFill and background website push remain acceptance boundaries.
- See [the combined ledger](docs/2026-10-09-combined-update.md) for exact tests, limitations and build receipts. No deployment is implied.

## 0.2.9 — October 9, 2026

- Add content-edge swipe back to the native Chats list, including beside the iPad sidebar; browser swipes traverse back/forward history before leaving the chat at the first page.
- Retain web new-chat setup expansion through background updates and provider changes, with desktop-style initial expansion, labels and spacing.
- Add desktop trackpad back to close chat/browser tabs at the history root and forward to reopen swipe-closed tabs, with bounded descriptors and momentum protection.
- Native swipe and web setup validation pass; desktop gestures are exercised with trusted wheel input. The operator approved the native design and authorized both Mac and physical iPhone/iPad updates.

### Live browser and UI improvements

- Pin Chat outside scrolling child tabs; retain pending-answer drafts separately from ordinary messages.
- Add upper-right find for loaded desktop/web text, native chat/Markdown matches, and browser find with counts and previous/next navigation. Search coverage limits remain in the release ledger.
- Show agent click/fill feedback at actual browser input coordinates.
- Add chat-scoped Live Browser viewing on web/iPhone/iPad with separate device grants, bounded encrypted screenshots, follow/manual selection, zoom, point references, instructions and pending decisions.
- Preview the native green palette and matching icon meanings, remove duplicate iPad branding, collapse activity by default, and prevent cached selection from reopening a chat when visiting the list.
- Add categorized recents and running indicators. Web conversations use full workspace width; Queue/Stop share desktop styling and one row, with Stop absent for merely queued or completed runs.
- Upgrade HC Claude through its supported updater while idle. Providers refresh now exposes the current 5.5 catalog; retain the existing explicit refresh workflow.

Source checks and simulator previews are separate from installation. The authorized four-device rollout is tracked separately. See `docs/2026-10-08-live-browser-release.md` for exact verification and remaining gates.

## 0.2.8 — October 8, 2026

- Edit unprocessed queued messages in place across local/remote desktop, web and native clients, with stale-text checks and attachment/model retention. Existing queued-to-steering conversion remains available for eligible messages.
- Dismiss the exact needed-input form after a successful Enter submission, including focused fields and immediate streaming; preserve unrelated composer drafts and failed-send input.
- Restore every host-offered persistent approval choice in remote desktop/web prompts, alongside approve-once, deny and guarded chat-only auto-approval.
- Replace Integration profiles with Accounts & Integrations: private consumer labels, generic resource contexts, separate runtime/authentication/access evidence, observation time, reported expiry and recovery history. Website profiles are read-only with owning-Mac checks and supported noninteractive recovery.
- Check live MCP sessions in the background without cold-resuming idle chats. Serialize checks with the MCP dialog; bound automatic recovery and defer reconnects while tools are active. Copilot uses its runtime probe/restart capability, retaining runtime-owned credentials. Isolated multi-account switching, independent identity/resource verification and universal token renewal remain unsupported adapter work.
- Recover saved peer connections on demand without replaying commands; retain backoff and explicit disconnect/authentication stops. Notices can be dismissed and expire despite repeated background failures.
- Avoid unchanged native browser bounds, visibility and throttling writes. Synthetic page-state checks pass; the reported Jira-page flicker still needs live acceptance.

Validation and deployment status: `docs/2026-10-08-account-chat-release.md`.

## 0.2.7 — October 7, 2026

- Keep the chat child-tab strip flush with the workspace across shell, local Markdown, remote file, browser and conversation views. Its borders and close controls no longer inherit content padding, and document scrolling leaves navigation visible.
- Desktop-only correction; website and native clients remain on 0.2.6.

Validation and installation status: `docs/2026-10-07-tab-layout-release.md`.

## 0.2.6 — October 7, 2026

- Separate User Chats, Scheduled Tasks and Internet Searches while preserving chat filters; show seven recent user chats and searches without scheduled-run sidebar noise.
- Start Internet Searches with a workspace, attachments and provider buttons; configure provider defaults in Engine Room and promote searches to ordinary chats.
- Send with Enter, retain Shift+Enter for multiline drafts, and convert queued messages to steering without losing them on delivery failure.
- Show file-search patterns and original permission requests; supply agents with a workspace-authorized Markdown document-tab tool and runtime guidance.
- Persist renamed chat titles and retained browser child descriptors after closing a parent; select new iPad browser tabs immediately.
- Align web composer, filters, message actions and runtime display with desktop; inset assistant messages and correct dialog spacing.

Validation and installation status: `docs/2026-10-07-search-release.md`.

## 0.2.5 — October 7, 2026

- Reuse sent or cancelled user messages as editable drafts, retaining available same-session attachments for explicit resubmission.
- Compact new-chat controls into the bottom action bar and place attachment previews above them.
- Preserve remote chat controls across refreshes and keep disconnect notices outside the chat/details grid.
- Restore tab close separators and the final chat-tab border; reveal and highlight the current tab in overview.
- Release browser automation connections after turns while retaining chat-scoped same-tab resumption. Throttle inactive pages with visible, automation and audio exceptions.
- Refresh desktop summaries without full histories; load history on demand, send cursor updates and bound inactive chat/history caches.
- Preserve valid JSON and clean temporary files after failed atomic writes; handle disk-full scheduler diagnostics without an uncaught reporting exception.

Validation and installation status: `docs/2026-10-07-followup-release.md`.

## 0.2.4 — October 7, 2026

- Automatically recover eligible desktop peer connections with bounded jitter, heartbeat checks and authoritative refresh, preserving drafts and respecting manual disconnect and authentication failures.
- Widen the desktop new-chat composer, choose a starting folder, add chat-only folders locally, refresh provider metadata and preserve draft text and attachments across destination switches.
- Separate schedule paths from file actions and clarify approval lifetimes.
- Retain original questions, option descriptions and stable answer associations; show active turn, tool-group and total runtime on desktop, website and native clients.
- Keep clicked and agent-created browser pages with their originating chat, including popups, and save the Mac's clicked-link browser preference.
- Add scoped tab overview, left/right insertion, browser move/copy between application, chat and Team containers, and durable standup-link ordering.
- Tighten terminal layout and add an explicitly read-only view of actual provider command activity.
- Expose existing chat-specific MCP consumers through Integration profiles. New isolated Azure/Jira/ADO credentials remain subject to the adapter limitations in the implementation ledger.

Installation and live acceptance are recorded in `docs/2026-10-07-implementation.md`.

## October 7 implementation intake

- Import the 17 requested changes and approved new-chat design from PR #18.
  Implementation and validation are tracked separately from this planning checkpoint.

## 0.2.3 — October 7, 2026

- Keep an iPad's loaded browser title when desktop tab synchronization supplies an older automatic title; retain explicit renames, page state and tab identity.
- Add a readable full project-guide popup to Home on iPad and iPhone, using the same bundled guide as desktop/web.
- Inset the iPad Home heading, highlight its active sidebar page, and reveal newly opened main/chat/Team tabs without moving the strip when selecting existing tabs.

- Share desktop/web AI Allowance pills and provider detail dialogs, including refresh and one collapse state. Show the connected Mac once with a green status dot and version below. Remove the extra box/border inside web Activity Details.
- Show Standup links in matching desktop/web name-and-URL rows with quiet right-aligned Edit/Remove actions. Website Team now uses the selected shared list's API links; roster edits preserve link IDs.
- Focus the address field in new browser tabs on desktop, website and native clients. Show the 20 latest distinct visited sites with date/time and originating device when editing the address.
- Use one green native tab-bar background and text style for main, chat and Team browser strips, including iPad.
- Keep long tab titles and process labels on one truncated line in Resources, with actions inside the page width.

- Expand the shared Home capabilities into the complete project guide and show the full version/build in its own box.
- Preserve loaded chat history during live updates and recover earlier pages with a stable boundary.
- Restore bounded browser Back/Forward history through synchronized chat/Team tabs and native app restarts; retain native browser views during URL reconciliation.

- Share one Home renderer and stylesheet between desktop and website, with latest changes,
  readable expansion and an optional Mac-only instructions panel.
- Fix desktop chat-browser close selection before native state notifications; select the tab
  to the left and preserve the chat. Label the fixed child tab Chat with a full-size icon.
- Replace the clipped remote-only Next turn expander with inline model controls.
- Omit empty tool Details, use straight activity-item accents and reserve orange groups for issues.
- Remove duplicate website Engine Room navigation; align notification/resource rows and Default
  Mac controls; add sidebar version/status and reliable overview dismissal.
- Remove the redundant regular-width iPad chat header, add an explicit earlier-history button,
  and eliminate blank rows left by grouped Activity events.
- Show website working folders, loaded context, usage and session details; retain archived rows
  and their action menu while refreshing live state.
- Keep Copilot quota probes on the same authentication settings as conversations so Keychain
  credentials remain available.
- Reopen incomplete 0.2.2 acceptance; see the per-item audit for remaining live/device gates.

## 0.2.2 — October 6, 2026

- Clarify website Mac pairing, connection and Default Mac navigation, with pairing-stage recovery
  messages and retained invitation text until authentication succeeds.
- Keep desktop dialogs above browser pages, dismiss tab overview by its backdrop, and preserve
  chat tabs through Send, Queue and Steer. Show site favicons and an active agent cursor.
- Recover browser reads by sharing Proteus-owned debugger attachments with certificate inspection.
- Match website chat density to desktop and preserve safe failed-tool details. Use the accepted
  warm Activity group, green successful rows, orange failures, consistent counts and running states.
- Reconcile Needs attention rows and badges immediately after review, including remote and offline
  status; explain unavailable Copilot quota without inventing allowance.
- Sync bounded chat browser/document tabs and Team browser tabs between the host and native clients;
  visiting desktops also reconcile remote chat tabs. Keep selection and page state local.
- Remap a chat's remembered browser child when restart recreates its local browser view, retaining
  the selected child while adopting stable content-tab IDs.
- Compact native chat headers and collapse the composer to a draft preview while reading, with a
  circular Stop in both sizes. Flatten Team browser tabs and retain chat ownership when closing.

## 0.2.1 — October 5, 2026

- Make Command-W close the selected closable content tab while keeping the Mac window open.
- Match remote chat layout and controls to regular chats, constrain the conversation to the
  window, and keep one compact Archive/Delete action pair through repeated refreshes.
- Keep new-tab menus above embedded browser pages. Add context-sensitive copy, editing, chat,
  document, log, terminal and tab actions while preserving native website editing menus.
- Put the compact + attachment control beside model selection and Send. Increase the mobile
  message-entry area, improve disabled Send contrast, and add chat-list date/time details.
- Remove outer subtab padding, restore the Standup divider, and fade tab strips only where
  content is actually clipped. Keep the selected chat or Team child when returning.
- Preserve conversation reading anchors, draft state and expanded activity during refresh.
  Reorder movable content tabs with pointer, keyboard or available native move actions.
- Group the tab overview by main content, chats and Team Tools. Add a deliberate pause at
  baseline zoom before another outward pinch opens the overview.
- Use a shorter browser toolbar matching the sidebar green, a compact lighter URL field,
  and unboxed, muted navigation, Stop, Login, Enter and + controls. Highlight the robot icon
  when agent access is enabled. Show hovered links in a compact translucent overlay.
- Hold Back or Forward to choose a page from that direction’s navigation history; a normal
  click or tap still moves one page.
- Add Copy URL and read-only current HTTPS connection details to the URL-field menu. Show
  only certificate fields Chromium reports; do not fabricate an unavailable fingerprint.
- Add optional starting chat names, prompt-derived automatic names, and guarded rename actions.
- Add opt-in Auto-approve for this chat within existing allowed resources. It persists across
  restart, is revocable, clears when the provider/roots/integrations change, and leaves workspace
  defaults and other chats unchanged.
- Simplify iPad chat chrome to top tabs and chat tabs, move its existing chat menu beside +,
  retain the green accent, and show the Proteus arrow/name prominently on mobile Home.
- Add iOS navigation counts for Chats, Schedules and Needs Attention with exact host totals
  and unavailable-state handling. Preserve the existing five iPhone bottom tabs.

## 0.2.0 — October 5, 2026

- Keep open chats, schedules, browsers, terminals and documents as content tabs. Chat and Team
  workspaces share one + menu, consistent browser controls and persistent tab order/scroll position.
- Restore content tabs after reopening Proteus. Browser pages load only when selected; Home opens
  first with version, update-source status and release notes.
- Put Proteus in the upper-left of a compact full-width tab bar, with the sidebar below it.
  Keep feature icons available when the sidebar is collapsed and preserve readable tab titles.
- Make desktop and web chats consistent: provider names, grouped expandable Activity, compact
  composer/model controls, read-only remote details and automatic earlier-history loading.
- Manage chats from context menus or chat-view controls: Archive, Unarchive and confirmed Delete.
  Show Archived sits after the date filters; host-owned changes sync to authorized clients.
- Paste supported images/files into chat drafts, preview images with click or tap, and close with
  Escape, the backdrop or X. Sending confirms the exact files and provider destination.
- Keep the ordinary chat composer compact with + Attach beside the provider controls and Send.
  A message can contain up to 256 files within a 32 MiB total budget (8 MiB per file);
  selected thumbnails remain in a bounded row above the controls.
- Open generated Markdown and HTML documents inside their chat workspace on demand. Remote files
  use revocable viewing permission and approval for the exact document version; scripts stay off
  until explicitly enabled in an isolated preview.
- Add optional tmux-backed local terminals, session/profile controls and locally saved output.
  Reconnect when possible or start a fresh shell by typing, without replaying previous commands.
- Retain the six most recently used browser tabs and tabs touched within the past hour, protecting
  active work while allowing older pages to unload.
- Preserve generated Standup order when links change; correct iPad list editing and separate main
  browser tabs from Team browser tabs.
- Read Copilot quota with a fresh isolated SDK process so Refresh does not reuse a stale
  process-lifetime snapshot or interrupt running chats.
- Refresh provider allowance more often during execution and less often while idle, label estimated
  Copilot reset dates, and improve provider/MCP authentication recovery.
- Connect explicitly selected MCP servers to Claude chats with private configuration and existing
  tool permissions. Show runtime-reported Claude model versions and actionable connection status.
- Route iPhone/iPad notification taps after startup restoration, retain schedule targets and
  show unavailable targets safely instead of letting Home or restored tabs override navigation.
- Clear reviewed failures from Needs Attention while keeping unresolved approvals visible. Expand
  Resources with app processes, host children and managed persistent-terminal usage.

## Connection and presentation follow-up

- Show desktop AI Allowance as three compact provider columns, retaining details and independent
  hidden/collapsed preferences.
- Use each authenticated Mac’s configured name across desktop, website and mobile destinations;
  preserve host IDs and pairing credentials through renames.
- Let all website sections use existing account or browser pairings, and distinguish no selected
  destination from an offline connection.
- Match website Chats to the desktop filterable list and main tab bar, with the shared New Chat
  toolbar action.
- Display iPhone/iPad chat timestamps in the device time zone, including daylight saving changes.
- Keep iPad address/search navigation in the current browser tab, with Back, Forward, Reload,
  a grouped address toolbar, + Browser actions, tab dividers and active underlines.
- Show browsing visits with device-local date/time and their recorded source device; preserve
  unknown provenance on older entries and paginate history in groups of 25.

## Empty desktop connections follow-up

- Avoid Keychain requests and empty encrypted-cache writes when the desktop has no saved
  outgoing Mac connections. Existing encrypted credentials still fail closed; new pairing
  checks secure storage before contacting the destination.

## Message actions follow-up

- Add Copy and local Read Aloud controls below completed assistant messages across desktop, web
  and iPhone/iPad, with Pause/Resume, Stop and a reading-position scrubber during playback.
- Share desktop/web speech behavior, preserve playback through chat refreshes and stop when its
  chat or authorization context changes. System voices require no AI provider call.

This is a concise behavior log. Git commits and pull requests contain the complete change history.

## Earlier changes

- Keep new-tab search and address controls reachable when history grows, in both main and Team
  browsers. Bound long rows to the viewport and show history in batches of 25 with **More**.
- Isolate packaged Mac smoke tests from the real Safe Storage Keychain item; production launches
  keep normal Keychain protection.

- Unify navigation around Chats, Team Tools and Engine Room, with contextual children, collapsible
  sidebars, phone Home allowance, paired chat bubbles, attention !, and no tagline.
- Aggregate authorized Mac chat indexes; retain bounded encrypted caches and account-scoped
  drafts. Add an explicit website Default Mac without implicit execution fallback.
- Share Team rosters/links/history/preferences through explicit account API scopes; add standup
  docking, browser homes/search/history, Team tab unloading and actual host resource metrics.
- Support remote schedule editing and signed host revocation while preserving pairings on forged
  relay notices. Add generic notification/log history and retryable push delivery foundations.
- Preserve existing Apple signing; background APNs provisioning remains pending. Multi-provider
  implementation is deferred. See `docs/parity-release.md` for exact acceptance and limitations.

- Keep website sign-in feedback and cancellation in Setup; space the connected account badge
  and actions consistently on narrow and wide screens.

- Complete graceful shutdown even when a local HTTP client leaves headers or a request body
  unfinished; release the runner lock and connection record before restarting.
- Use the Omi iCloud waveform in the Transcription sidebar. Keep an enabled Life tab visible
  through sign-out and API migration; show account setup without losing the tab.

- Restore website Mac destinations from the signed-in account across browser sessions, with
  encrypted credential storage, automatic selected-host reconnection and independent browser sessions.
- Connect desktop Life through the same authenticated website API as mobile, using PKCE and
  protected local tokens. Retire direct database setup/access from the desktop runtime.

- Paginate the desktop food library in groups of 25, with stable ordering, matching counts and
  search resetting to page one; preserve selected-food versions and complete meal choices.

- Share the dark Proteus design across desktop and website, with a compact sidebar, persistent
  section tabs, machine selection and collapsible real provider allowances in the web remote.
- Enrich native Life with Garage cards, weighted fuel reports and fixed calendar nutrition periods;
  retain independent date filters, immutable food versions and scoped evidence access.
- Add direct website-account Life on iPhone/iPad, with native records/forms, PKCE sign-in,
  Keychain tokens and retry-safe mutations. Add selected-Mac usage and automatic legacy host labels.
- Start chats on separately paired desktops using their own folders, agents, skills and provider
  catalogs. Default new chats to This Mac; split history by destination with This Mac first.
- Preserve private browser URL/title history and its selected position through restart; hold or
  right-click Back/Forward to choose a history entry. Never restore agent grants or form POST data.

- Edit a saved Mac’s relay address on iPhone/iPad without replacing its identity, pairing key,
  cached history or drafts. Reconnect only the selected destination and stop old transport retries.

- Collapse AI allowance to a compact three-provider summary with a persistent expand control.
  Only the Setup visibility flag hides the panel; its checkbox now saves immediately without
  discarding other Setup edits. Existing disabled preferences remain disabled.
- Select desktop tabs by clicking anywhere in their rectangle; closing a background tab does
  not activate it, and title buttons retain keyboard activation.

- Read authenticated Claude account allowances with available reset details; distinguish real quota
  from per-turn token counts and explicitly unavailable timestamps.
- Apply Codex workspace writes only to currently trusted canonical roots, retain separate command
  approvals, and interrupt active expanded-sandbox turns when grants change.

- Rename the processing section Transcription, separating Omi from general private notes/MacWhisper
  export intake and follow-up review. Preserve the five existing schedule identities, verify
  canonical policy/cadence, and enforce independent disabled-until-cutover gates.
- Browse all configured repository/folder roots in the Markdown chooser, including shared and
  every-chat folders, while preserving scoped nested creation and revoked-root protections.
- Add interactive Ghostty VT WebAssembly terminal tabs, local PTYs and editable/importable profiles.
  Keep terminal access desktop-only; restore terminal descriptors without replaying startup commands.
- Restore full desktop tab order and selection across restart, including private browser tabs and
  Markdown documents; support native browser history gestures and bounded pinch zoom.
- Add separately paired Mac destinations to mobile and a protected Proteus web remote client,
  keeping per-host keys, drafts, caches and command destinations isolated. Retain the independent
  encrypted relay and protect existing nutrition data during website code-only deployment.

- Add the Omi control room with status, normal schedules, run history, bounded processing logs,
  private settings and an execution gate that remains disabled until an explicit cutover.
  Three native jobs use independent lanes; AI provider turns remain serialized. Imported personal
  transcript automations retain their source policy and start paused.
- Incorporate Mnemosyne's full Laravel source under `web/` and rebrand it Proteus. Add optional
  native Life screens backed by database records, a local installer, and versioned upgrade plans.
  Keep production deployment and live database changes separate from local installation.
- Give Life and Omi persistent tabs alongside chats and schedules. Hide Life until enabled in Setup. Make provider usage hideable, with green meters and centered percentages.
- Move icon-only new-tab actions into the tab strip and remove the redundant top header. Add a
  workspace/subfolder Markdown picker with nested folder creation and safe exclusive file creation;
  hide native browser views while dialogs are open.
- Catch denied Claude termination signals and asynchronous shutdown failures, preventing native
  JavaScript error dialogs. Verify native Claude sign-in, model discovery and continuation.
- Add Claude provider selection on Mac and iOS and common provider allowance summaries.
- Add reproducible Apple simulator build/test commands and managed native-processing views.

- Preserve and verify GitHub’s Copilot binary signatures during Mac packaging, retaining the
  provider identity used for Keychain authorization.
- Show persistent MCP sign-in progress and refresh connection state automatically on Mac/iOS.
- Keep chat controls and detail panels attached during streaming; preserve focused selections,
  scroll positions and disclosure state while updating the conversation and usage.

- Move model, effort, speed and applicable context menus into the compact Mac/iOS composer footer.
  Separate Queue/Steer/Stop actions; Stop appears only while running or waiting for input.
- Capture settings for each queued message, apply model changes on the next turn in the same session,
  and retain the original schedule plus model-change history. Steering keeps active-turn settings.

- Add Codex through its native app-server, separate model/effort/speed catalogs, native session
  continuation, selected context and explicit provider compatibility errors.
- Keep the chat composer available during work; durable Queue next, removal and live Steer now
  on Mac/iOS. Preserve reading position and typed drafts while output streams.
- Present tool output as affected paths, commands, fields and tables with secondary raw details.
- Compact browser navigation and make Agent access a pressed toggle with privacy tooltip.
- Add Copilot MCP connection status and native OAuth recovery on Mac/iOS, including `/mcp auth`
  as a host command. Sign-in opens on the Mac; no OAuth URL/token enters transcript storage.

- Live thinking-effort and context-size controls in Mac chat/schedule/default settings and iOS
  chat/schedule forms. Preserve options in run snapshots and apply them on create and resume.
- Refresh model capabilities at startup, every five minutes and on request without restarting
  active sessions. Preserve and label stale metadata; reject unsupported saved options explicitly.
- Schedule reopen/reload fetches current disk state; show conflicting external edits without
  overwriting drafts. Document source manifest versus exported schedule behavior.
- Share the iOS artwork with the Mac Dock and branded local Proteus .app.
- Add an agent handoff guide, code map, design decisions and maintained backlog.

## 2026-10-02 — chat activity and live approvals

- Expandable tool summaries, arguments, output, progress and failures on Mac and iOS.
- Permission changes resolve waiting tools in active sessions; individual grants remain distinct
  from workspace trust. Waiting for input does not consume the provider execution deadline.
- Catalog-backed schedule model picker, bounded browser navigation, useful background tab
  viewports, and separately scrolling Mac chat/details areas.
- Show nonzero shell exits as failed commands and omit empty assistant cards.

## Earlier prototype milestones

- Plain-file schedules, durable run history, continuation and multi-folder workspaces.
- Source discovery, explicit context selection, favorites and captured instruction versions.
- Embedded shared Playwright browser tabs and explicit Bitwarden login fill.
- Native encrypted iPhone/iPad remote client and local/container relay.
- Shared Markdown rendering, standup popout, quota display and agent identity labels.

Known unfinished work and distribution limitations are tracked in `docs/planned-updates.md`.

- Browser tab and overview selection reloads an unloaded page immediately; background pages remain
  unloaded. All five native link actions have verified macOS template icons.
## Unreleased — quieter extension connection notices

- Show a native-helper connection warning, including iCloud Passwords, only once per extension per app launch across browser profiles and windows. Retries continue without repeating or reviving the banner; restarting Proteus permits one new warning.

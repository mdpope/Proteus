# October 31 release plan

**Stage: O14, O15–O17 implemented and locally tested on October 31; everything else remains
research only.** The operator authorized building and testing Copilot Fusion (O14), then asked for
the remote-computer layout fixes (O15–O17) and for the completed build to be handed to the
October 30 release coordinator for deployment everywhere. Source branch:
`claude/oct31-copilot-fusion`, based on the 0.2.39 source (`codex/oct30-certificate-followup`).
No package, installation or publication was performed in this chat. Other items stay collection-only
until separately authorized.

Research baseline: main `2638e5b` (0.2.38) and the 0.2.39 source. Findings are labeled
**confirmed in source**, **reproduced** or **lead**.

## Request register

| ID | Type | Request | Status |
| --- | --- | --- | --- |
| O1 | Bug | Enter in an inline chat question answer inserts a newline instead of sending | Confirmed in source, still present in 0.2.39 on desktop, web and iOS |
| O2 | Bug | iOS workspace/project expansion resets every time the menu opens | Confirmed in source, still present in 0.2.39 |
| O3 | Audit | Validate earlier release fixes across Linux, Windows, macOS and iOS; optimize findings | Findings A1–A8 below, rechecked against 0.2.39 |
| O4 | Bug | Address bar rejects valid addresses such as `https://consolefixture:8006/#v1:0:=qemu%2F106:4:::::8::` | Reproduced against 0.2.39 source; gap in 0.2.39 R14 |
| O5 | Bug | `https://192.0.2.33:8006` fails with `ERR_ADDRESS_UNREACHABLE` although other browsers on the Mac open it | Reported on installed 0.2.39 with screenshot; open in 0.2.39 R14 as “original network failure” |
| O6 | Feature | Send a chat message that is only an attachment, with no typed text | Confirmed in source on desktop, web and owner service; iOS lead |
| O7 | Design and bug | iPhone chat second row overlaps; replace it with Chat \| Live browser plus tab overview, + and menu; remove the switcher from the composer on iPhone only | Overlap cause confirmed in source; iPad unchanged |
| O8 | Bug | Questions are shown twice (message text and card heading); show question once, the options, then the answer | Cause confirmed in source on desktop, web and iOS |
| O9 | Bug | Physical iPhone: bottom browser controls render partly below the screen, unlike simulator acceptance | Reported with screenshot; leading cause in source, device verification required |
| O10 | Feature | Attachment viewer: previous/next arrows through a message's attachments, and de-emphasized created/modified/size details beside the name | Viewer is single-file on all clients; dates are not recorded |
| O11 | Bug (high) | Closed project tabs reappear (“come back from the dead”), notably to the right of the active chat; Close must be permanent across all windows and remote Proteus instances | Mechanism diagnosed from installed 0.2.39 source plus read-only live logs/registry; not yet reproduced in a fixture |
| O12 | Bug and design | Agents pick tabs from the wrong window; a chat turn should use the project tabs of the exact window (and device) where that message was submitted | Cause confirmed in source: submissions carry no window identity and agent tab lists span all windows |
| O13 | Layout and parity | Move “Continue automatically after the two-hour execution safeguard” down to sit directly above “Automatically continue when allowance resets”, on desktop, web and iOS | Placement confirmed in source; web/remote toggle appears unbound and iOS lacks the toggle |
| O14 | Feature | Copilot Fusion in Copilot chats: model-picker choice with Standard/High/Max effort, live phases and exact per-turn model attribution | **Implemented and locally tested October 31**; real Fusion session pending account availability |
| O15 | Layout parity | Remote computer workspace project list looked different from local (small card buttons); website also differs | **Implemented and tested October 31** |
| O16 | Layout parity | Remote “Start a chat” composer showed inapplicable controls (Context) and wrapped model options onto two rows | **Implemented and tested October 31** |
| O17 | Bug | Remote “Other configured source folders” and context preview showed empty black boxes | **Implemented and tested October 31** |

## O1 Enter sends a question answer

Plain Enter should send an inline question answer. Shift+Enter (and Option/Alt+Enter where the
platform inserts one) adds a newline. IME composition and key repeat never send, and an empty
answer without files is ignored.

**Cause (confirmed in source, unchanged in 0.2.39):** the shared question card in
`public/features/chats/user-questions.js` (desktop on macOS/Windows/Linux and the website) creates an
anonymous `<textarea>` with no key handler. The global Enter handler in `public/app.js` only
covers fixed element IDs, and the website handler in `remote.js` only covers its `prompt` composer.
iOS `NativeUserQuestionCard` uses a vertical `TextField` without the `ChatReturnKey` modifier
already used by the iOS composers.

**Plan:** submit through the card's existing form, so the busy guard, retained operation ID and
consented attachments are unchanged. Make `ChatReturnKey` shareable and apply it on iOS.
Acceptance: extend `test/user-questions-ui.mjs`, then check a Windows IME, a Linux keyboard layout,
an iPhone software keyboard and an iPad hardware keyboard.

## O2 Keep iOS sidebar expansion while the app is open

**Cause (confirmed in source, unchanged in 0.2.39):** `NativeWorkspaceTree` in
`ios/Proteus/Features/Workspaces/Views/NativeProjectViews.swift` keeps workspace/project expansion,
Other Computers and “More” limits in view-local `@State`. The iPhone drawer and iPad sidebar
recreate the view whenever the menu opens. Desktop keeps the same values in module state mirrored
to `sessionStorage` (`public/shared/navigation/desktop-preview.js`).

**Plan:** one in-memory, app-session store shared by iPhone and iPad, keeping Collapse all,
open-to-expand and deselection limit clearing. Start fresh on relaunch unless persistence is
requested. Do this together with A5 (question queue) and A6 (polling). Acceptance: expand, close and
reopen the menu, switch tabs, background, reconnect, cold launch and Collapse all on both idioms.

## O3 Cross-platform audit of earlier fixes

Compared CHANGELOG 0.2.30–0.2.39, the closeout and release documents with source, then rechecked
each finding against the 0.2.39 branch.

| # | Finding | 0.2.39 status |
| --- | --- | --- |
| A1 | Platforms run different builds. 0.2.39 rollout records: both Macs and the Windows builder installed, iPad installed, iPhone still 0.2.36, Linux and another Windows laptop awaiting approval, website pending. Fixes since 0.2.36 are absent where 0.2.39 is not installed. | Track per the 0.2.39 rollout ledger |
| A2 | Autoplay blocking was defeated by sticky `navigator.userActivation.hasBeenActive`. | **Fixed on desktop** (0.2.39 R8). **iOS still uses `hasBeenActive`** plus any trusted touch/key in `SharedAppStore.videoScript()`, and applies `mediaTypesRequiringUserActionForPlayback` only at web view creation. Port the desktop rule and share one script source. |
| A3 | Notifications drained serially (5 s each; queue 50 web/desktop, 30 iOS) and were not rechecked. | Desktop/web queue and age bounded (0.2.39 R6). **iOS `presentBanner` looks unchanged** (serial, up to 30, no dedupe). Verify iOS banner behavior and align it. |
| A4 | iOS inline question cards cannot attach files; desktop/web can. The October 23 table says “native”. | Still absent in 0.2.39. Add the existing iOS attachment flow or correct the record. |
| A5 | iOS question queue expansion is view-local `@State`; web keeps it per chat. | Unchanged. Same fix family as O2. |
| A6 | iOS sidebar sequentially requests `tabs.get` for every project on each connect/catalog revision, including collapsed workspaces, and polls each expanded project every 5 s. O2 would increase polling. | Unchanged. Batch or push membership, poll only visible expanded projects, back off when unchanged. |
| A7 | Native notice overlay is a transparent frameless child window gated on parent focus. Linux WM/compositor behavior is unverified. | Verify on the Linux target during its rollout. |
| A8 | Enter-to-send rules are duplicated (`app.js`, `remote.js`, chat setup, soon question cards). | Consolidate into one `public/shared/ui` helper. Related: O4's duplicated address parsers. |

Not audited in depth: provider runtime fixes, updater/recovery and Windows terminal Job Objects.
These are platform-specific by design with their own acceptance records.

## O4 Accept every standards-valid address

**Standard:** the [WHATWG URL Standard](https://url.spec.whatwg.org/) allows an http/https host to be
a domain, IPv4 or bracketed IPv6. A domain need not contain a dot, so `consolefixture`, `nas` and `router`
are valid. IPv4 accepts 1–4 decimal/hex/octal parts serialized as dotted decimal
(`0xc0.0.2.33` → `192.0.2.33`). Internationalized names use UTS 46 (`bücher.example` →
`xn--bcher-kva.example`). Ports are 0–65535. Fragments only percent-encode C0 controls, space, `"`,
`<`, `>` and backtick, so `:`, `=`, `/` and existing `%2F` are valid as written. IPv6 zone IDs are
intentionally unsupported by the standard and browsers.

**Reproduced against 0.2.39 source (Node probe of both parsers):**

| Input | Renderer `browserTarget` | Desktop `normalizeURL` |
| --- | --- | --- |
| `https://consolefixture:8006/#v1:0:=qemu%2F106:4:::::8::` | **Rejected: “Enter a valid hostname.”** | Accepted unchanged |
| `consolefixture:8006` | **Rejected** | Accepted |
| `https://consolefixture/` | **Rejected** | Accepted |
| `nas/` | **Rejected** | Searched |
| `https://192.0.2.33:8006`, `localhost:3000` | Accepted | Accepted |

0.2.39 added `desktop/browser/browser-address.cjs`, but the renderer's `browserTarget`
(`public/features/browser/browser-home.js`), used by the tab address bar (`app.js`
`navigateBrowser`), Team Tools and New tab, still rejects any dotless host other than `localhost`.
It runs first, so the user sees its error. The 0.2.39 plan's statement that explicit HTTPS
addresses already work is not true for single-label hosts. iOS accepts explicit URLs, but
scheme-less input becomes `https://` only when it contains a dot (`TeamToolsView.navigate`).

**Plan:** one shared address classifier with one table of cases for renderer, desktop main, website
and iOS:
- Explicit http/https input always navigates when the standard parser accepts it.
- Scheme-less input is an address when it is `localhost`, an IP literal, a dotted host, or a single
  label followed by a port, `/`, `?` or `#`.
- A bare single word remains a search, optionally with Chromium-style “Open http(s)://word/”.
- Keep http/https-only, credential, local-path and length rules.

Acceptance: every row above plus `[::1]:8080`, hex/short IPv4, IDN, uppercase, underscores, port
65535 versus 65536, long fragments, searches, and tool/shared-link/history paths, including iOS
`safeURL` fragment screening.

## O5 Local-network HTTPS consoles by IP

**Reported with screenshot on installed 0.2.39:** “Network access unavailable — Unable to open
192.0.2.33:8006 — `ERR_ADDRESS_UNREACHABLE`”, with the 0.2.39 Local Network guidance.

**Read-only Mac diagnostics (October 30):**
- No system proxy. Proteus sets no proxy, host-resolver or DNS-over-HTTPS configuration.
- `192.0.2.33` routes directly on the local interface without a gateway.
- `consolefixture` resolves via the router's `home` search domain to `192.0.2.33`.
- Resolvers are the router and the ISP's IPv6 resolver, an ordinary dual-stack setup.
- From this Mac, the server answers HTTPS (200) with a self-signed certificate (verify result 20).
- Installed `/Applications/Proteus.app` is 0.2.39 with `NSLocalNetworkUsageDescription`, team
  `TEAMID0000`.

**Analysis:** `ERR_ADDRESS_UNREACHABLE` is a connection refusal (host unreachable) before TLS, so
neither DNS nor the certificate caused this failure. Another process on the same Mac reached the
address, so the leading lead is a per-app macOS Local Network privacy denial for Proteus. Check, in
order:
1. Is Proteus listed and enabled in System Settings → Privacy & Security → Local Network?
2. If it is absent, the prompt never appeared. Determine whether Chromium's network-service helper
   is attributed to the main app, and whether development-signed rebuilds lose the grant.
3. Does a restart after enabling it fix the problem?
4. Does Wi-Fi/VPN interface selection differ for Proteus?

0.2.39 already added the usage key, clearer guidance and one-click certificate acceptance,
which applies once connectivity works. Acceptance needs a real LAN console by IP and by name,
permission denied and granted, restart and a re-signed update.

## O6 Send attachment-only messages

A message consisting only of attachments should send without typed text, as it already can for
question answers.

**Confirmed in source (main and 0.2.39):**
- Desktop disables Send/Steer when the follow-up box is empty, regardless of attachments
  (`app.js` `updateButtons`). New chat requires prompt text (`app.js` validate/submit).
- The website composer throws “Enter a message.” (`remote.js` `bindDraft` for `chat.send/start`).
- The owner rejects empty prompts: `engine.send` (“Write a message first.”), `resume` and new-chat
  creation in `src/engine.js`.
- Question answers already substitute “Please review the attached files.” in the card and in
  `src/services/chats/question-attachments.js`.
- iOS `cannotSend` already allows attachments without text, so an attachment-only iOS reply most
  likely reaches the owner's empty-prompt rejection (lead; verify on a device).

**Plan:** let every composer send when at least one consented attachment is present. Allow the owner
to accept an empty prompt only when the same request carries verified attachment IDs, and use one
provider-neutral default instruction consistent with question answers. Keep the visible
transcript accurate (show the attachments, not invented user text), retain message IDs and
attachment consent, and keep text-only empty sends rejected. Cover new chat, follow-up queue, steer,
edit of queued messages, remote computers, website and iOS.

## O7 iPhone chat row: Chat | Live browser replaces the second tab row

**Reported October 30 with screenshot (iPhone).** Inside a project chat, the iPhone shows the project
tab strip and then a second row of chat child tabs. The second row is broken: the fixed **Chat** tab
overlaps the scrolled child-tab strip (a truncated “…nd ×” tab shows beneath it), and an
“Agents 9” label floats over the transcript. The iPhone has no top-level row like the iPad, so this
row is effectively the workspace/project navigation row.

**Cause (confirmed in source, 0.2.39):** `childTabs` in `ChatViews.swift` puts a fixed Chat button
beside a scrolling `NativeTabStrip` of browser/document children with no clipping boundary, so the
strip slides under it. The **Chat | Live browser** switcher is in `composerStatus` above the message
box, identical on iPhone and iPad.

**Requested design (iPhone only):**
- Replace the second row with the **Chat | Live browser** switcher in its current text-link style
  (not tabs), followed by the existing **tab overview**, **+ tab** controls and **chat actions
  menu**.
- Remove the switcher from the top right of the message box on iPhone.
- Keep chat child browser/document tabs reachable through the tab overview and drawer.
- Place or relocate the “Agents” indicator so it no longer overlaps the transcript (exact location
  to be decided).
- **iPad: no change.** The switcher stays in the composer and the existing rows are untouched.

Acceptance: iPhone simulator plus the physical iPhone (see O9), with a project chat, an unassigned
chat (which keeps the drawer button), many child tabs, live browser unavailable, Dynamic Type and
rotation. Confirm the iPad layout is byte-for-byte unchanged in snapshot UI tests.

## O8 Show each question once

**Reported October 30 with desktop screenshot.** The assistant message shows the question and its
options (as a list), then the question card repeats the same question as a bold heading, and after
answering shows only “Answered”.

**Cause (confirmed in source, 0.2.39):** Codex structured questions arrive with an assistant message
whose text already contains the question. `captureUserQuestions` attaches the question to that
message's event index, and `conversation.js` appends a card whose heading is `question.text`
(`user-questions.js`). Choices appear twice in the pending state (markdown list and buttons). The
answered card shows only status; the answer is a separate later user event. iOS repeats the
pattern (`MessageView` then `NativeUserQuestionCard` with `Text(question.text)`). The website uses the
same shared card.

**Plan:** render the question text once and the options once (as the actionable choices, not a
second list). After answering, the card shows the actual answer (“Answered: Unlocked”) and its
delivery state. Native-tool questions without assistant text still show their heading. Keep
uncertain/queued states, attachments and retry identity. Acceptance: Codex structured, native tool
and blocking questions, pending/answered/uncertain/dismissed, free-text answers, desktop, web and iOS.

## O9 iPhone browser controls cut off on the physical device

**Reported October 30 with screenshot** from the deployed iPhone (1290×2796 Pro Max-class screen).
The back/forward/close/search/menu/overview row sits partly below the bottom edge, unlike simulator
acceptance. The rollout ledger records the iPhone baseline as 0.2.36 / 2610.29.1. The Oct 29
correction “keep the browser bar uncut” (`e4e6038`) is in source, but the repository alone does not
establish whether it is in the installed binary.

**Leading cause (source, needs device confirmation):** when a browser is showing, `NativeShell`
ignores the bottom container safe area and `TeamToolsView` adds the control row through
`safeAreaInset` with a fixed `.padding(.bottom, -16)`, so it sits in the home-indicator area like
Safari. Combined, those offsets can push the row below the visible screen on a real device or
other screen sizes. Simulator acceptance used an iPhone 17 Pro, not the physical model.

**Plan:** position the row from the actual measured bottom safe-area inset rather than a fixed
offset, keep it fully visible and tappable above the home indicator, and keep content reaching the
edge behind it. Acceptance must include the physical iPhone plus a matching Pro Max simulator and a
small phone, in portrait/landscape and with top controls hidden. Record the installed build before
diagnosing.

## O10 Attachment viewer navigation and details

**Requested October 30.** When an attachment is opened, show **‹ ›** arrows to move to the previous
or next attachment in the same message (or set), hidden or disabled at the ends. Show file details
to the right of the file name in a smaller, lighter font: created date, modified date and size.
Everything else about the viewer stays as is.

**Current source (0.2.39):** desktop/web `openStoredAttachment` (`chat-attachments.js`), the website
`data-remote-attachment` handler and iOS `AttachmentPreview` open one file at a time. Owner records
keep only name, media type, size and SHA-256 (`src/services/chats/chat-attachments.js`), so size is
available but created/modified dates are not.

**Plan and open decisions:**
- Pass the ordered attachment list and current index to one shared viewer on desktop/web, and the
  same on iOS. Support arrow buttons plus ←/→ keys and swipes. Load each file lazily and keep the
  inert-preview rules.
- Capture dates at selection and store them as metadata. Browsers expose only `lastModified`;
  desktop can read file-system created/modified times; iOS Photos supplies the creation date.
  When a date is unknown, show nothing or “Unknown” rather than guessing. Existing attachments
  will lack dates.
- Never include original file paths in metadata.

Acceptance: a message with several images and mixed types, first/last item, keyboard and swipe,
large files, older attachments without dates, and desktop, web and iOS.

## O11 Closed project tabs come back from the dead

**Reported October 30 (Build Mac, installed 0.2.39):** in the Proteus project of Proteus
Workspace, tabs the user closes keep reappearing, especially to the right of the “Oct 31 release”
chat. Requirement: project tabs match in every Proteus window, and closing a tab anywhere removes it
**permanently**, including from other windows and from a remote Proteus showing the same project.

**Read-only evidence gathered October 30–31 (no live state changed):**
- The owner registry for this project has 25 tabs at **revision 2201**, with views in three windows.
  Eight descriptors have no view in any window (October 27 Claude/Codex release, Fix windows
  distribution, two Zoho pages, Home · Proteus, a “New chat” browser, the 10-27 evidence document).
- The local log has **348 failures in about five hours** (about one every 50 s):
  `ENOENT … lstat '/Users/developer/Source/ProteusWorkspace/oct26-release'` from
  `contentTabDocument` → `WorkspaceFiles.resolve`. The project still registers document tab
  `2026-10-26-release-plan.md` from the `oct26-release` worktree that the October 30 closeout retired.
  Only one window has a view for it. The other two, including the window showing this chat
  (`bc69ef6b…`), must materialize it on every sync and fail.
- That window repeatedly writes and clears its sync outbox for this project. Its retained storage
  also holds a stale `browser-navigate` intent for the bare “Zoho Accounts” descriptor.
- 42 `ProjectFollow` errors (“The selected tab no longer belongs to this scope”) show paired
  presentation following selecting tabs that were already closed.

**Mechanism (0.2.39 source, `public/models/content-tab-sync.js` and `public/app.js` `apply`):**
1. *A single unresolvable document wedges the whole project sync.* Desktop `apply` materializes
   missing document descriptors with an un-guarded `api('/api/content-tabs',{action:'document'})`.
   The missing worktree makes it throw midway through the creation loop. The sync never reaches
   `record.baseline = remote.tabs`, so the window stays in its first-connection state indefinitely
   and retries with backoff.
2. *In that state local Close is never published and is undone.* With `baseline === null`, the
   operations are computed from the owner list plus pending-navigation tabs only, so a tab closed in
   that window produces no `close`. `apply` then recreates owner descriptors missing locally (the
   skip only covers tabs in the captured local snapshot, which a closed tab no longer is). Tabs
   before the broken document in owner order reappear immediately. Tabs after it reappear whenever
   any window completes a pass, and the owner never forgets them.
3. *Conflict quarantine has the same effect.* Since 0.2.39 a quarantined scope (navigation
   conflict, `NAVIGATION_TAB_CLOSED`) keeps applying owner membership while withholding its own
   pending operations, including Close. Closes in that window are recreated on every pass.
4. *No tombstones.* The owner store deletes a closed descriptor outright. Any later plain `open` for
   that identity re-adds it, whether it comes from a stale window, a restored saved session, a local
   alias that starts navigating, a delayed outbox, recovery, or a remote/iOS client. `tabChanges`
   publishes any local tab missing from the baseline as a plain `open`. A window also skips an owner
   removal when the tab's local metadata changed during the request (frequent with live titles like
   “(8) …”), then republishes it as `open`.
5. *Remote instances* use the same synchronizer and are subject to items 2–4. Remote document
   descriptors avoid the local file lookup, so item 1 mainly affects the owning Mac.

This is an interaction between the October 30 worktree retirement and the 0.2.37–0.2.39
convergence changes, not one isolated regression. It explains why the R10 two-window Close
regression passed in a clean fixture yet fails on live data.

**Plan (design, not implemented):**
- **Isolate failures per descriptor.** A missing document, profile or other unresolvable item
  becomes an explicit “Unavailable” placeholder tab. It must never abort `apply`, block the
  baseline or stop other tabs from syncing. Show the reason and offer Close/Locate.
- **Make Close win with owner tombstones.** Record closed logical IDs with the closing revision,
  origin (window/host) and time in the owner registry, retained for a bounded period (for example
  30 days or N entries per scope). Reject or ignore a plain `open` of a tombstoned ID unless it is an
  explicit user/agent “reopen” with a new operation ID (Undo close, Recently closed, recovery).
  Passive snapshots, aliases, restored sessions, delayed outboxes and remote/iOS caches can never
  resurrect.
- **Always publish local closes,** including when the baseline is null or the scope is
  quarantined. Quarantine only the conflicting navigation intent, never membership changes.
- **Never republish an owner-removed identity** because local metadata changed; removal wins.
- **Propagate closes to remote peers and iOS** through the same owner tombstones, and have
  `ProjectFollow` fall back to a valid tab instead of selecting a closed one.
- **Add a visible sync-health indicator** for a scope stuck without a baseline or in quarantine,
  instead of silent retry logs.
- **Data repair** (separately authorized): close the stale `oct26-release` document descriptor
  through the owner, and review the eight bare descriptors with the user before removing any.

**Acceptance:** reproduce with three local windows plus one paired remote and iOS on the same project:
- a missing-worktree document
- a quarantined navigation conflict
- live-updating titles
- restart and restored saved windows
- delayed outboxes
- closes made offline
- Close in each window, verifying the tab never returns after 30+ minutes of normal use and restarts
- explicit Reopen/Undo still working

Compare owner IDs and order with every window's strip, sidebar, Tabs table and counts.

## O12 Agents act in the window where the message was submitted

**Reported October 30 with screenshot.** An agent asked the user to “select and reload the existing
downloads.proteus.example Webmin ‘Command Shell’ tab” because “browser control is timing out on that tab”. The user
answered “only use the tab in this specific window in this specific project”. The same chat can be
open in the same project in several windows. Each message (and each follow-up from a different
window) should direct the agent to that submitting window's project tabs only. (The screenshot
also shows O8's duplicated question and O1's Enter behavior.)

**Cause (confirmed in source, 0.2.39):**
- Chat submissions (send, queue, steer, question answers, approvals) carry no window or view
  identity. `desktopWindowId` exists only in the window's own UI session record.
- Agent `list` returns **every window's** native tab copies (`performAgent` uses `this.list()`,
  while the human-facing `list` uses `windowTabs()`). One logical tab can have a separate native
  view per window, and nothing tells the agent which window is “yours”. It can pick another
  window's mirror, which may be unloaded and then loads in the background. That fits the reported
  timeouts and the agent asking the human to reload.
- Agent `open` without a tab ID runs `withTabWindow(undefined)`, so the new tab lands in whatever
  window context is current. The chat's project is chosen by `browserDestination`, but not the
  window.

**Proposed design (reasonable and consistent with how browser assistants scope to the invoking
window):**
- **Record a turn origin on every human input:** owner host, client device, window ID, chat
  navigation-view ID and project/workspace. Queued messages keep their own origin. Steering or
  answering from another window updates the origin for the remainder of that turn. Store it with the
  input's delivery receipt so retries keep it.
- **Default every browser/tab tool to the origin window:**
  - `list` marks or filters tabs to that window's project tabs, using logical IDs.
  - Actions on a logical tab resolve to that window's view, loading it there if needed, never
    another window's mirror.
  - `open` creates the tab in the origin window inside the chat's project, and owner sync then
    shows it in other windows as usual.
  - Tool results state “in your window” so the agent can explain what it used.
- **Never fall back silently:**
  - If the origin window closed, use another window showing the same project and say so, or ask.
  - If the origin is a remote Proteus, the website or iOS (where the owner cannot drive that
    device's web view), target the owner window showing that project and tell the user. Remote
    desktop owners act in their own window that sent the message.
- **Permissions stay per logical tab and profile.** Sharing (robot button) and agentPaused are
  unchanged; window scoping narrows the target, it never grants access.
- **Explicit cross-window requests still work.** An agent may address another window only when the
  user explicitly asks; the receipt then records that choice.

Acceptance:
- Two windows on the same project with the same chat open: send from window A, then from window
  B. The agent lists, snapshots, reloads and opens only in the sender's window, and switches
  correctly per message.
- Queued and steered messages from different windows.
- An unloaded mirror in another window never becomes the target.
- Origin window closed mid-turn.
- Remote, website and iOS senders.
- Explicit cross-window instructions.
- Approval and sharing prompts appear in the origin window.

## O13 Group the two automatic-continuation controls

**Requested October 30 with screenshot (Run details).** The checkbox “Continue automatically after the
two-hour execution safeguard” and its note sit at the top of **Run details**, above Total AI
runtime. Move it down so it appears **directly above** “Automatically continue when allowance
resets”, keeping both automatic-continuation choices together. Check desktop, web and iOS.

**Current source (0.2.39):**
- **Desktop, remote desktop views and website** share `renderRunDetails` in
  `public/features/chats/chat-details.js`. The safeguard checkbox (`data-active-time-auto`, shown
  when `activeTimeContinuationAvailable(run)`) is first in Run details. The allowance preference
  (`allowancePreference`, `data-allowance-auto`) comes later, after the “tool requests approved
  automatically” note in the approvals area.
- **Only the local desktop binds the safeguard checkbox** (`public/app.js`, `data-active-time-auto`
  → `/api/runs/:id/recover` `active-time-auto`). `remote-desktops.js` and the website's `remote.js`
  bind only the allowance preference (`bindAllowancePreference`). There, the safeguard checkbox is
  likely displayed but does nothing (lead; verify in the UI).
- **iOS** shows “Automatically continue when allowance resets” in the Tool approvals section
  (`ToolActivityView.swift`) but has **no** two-hour safeguard toggle. The owner action
  `active-time-auto` exists in `src/services/chats/chat-recovery.js`.

**Plan:**
- In the shared Run details, render the safeguard checkbox and its note immediately above the
  allowance preference, as one “Automatic continuation” group. Keep each control's availability
  rules: the safeguard for supported providers (`activeTimeContinuationProviders`) and the allowance
  for `chatControls.allowanceContinuation`. Hide the group when neither applies.
- Bind the safeguard checkbox through one shared helper, like `bindAllowancePreference`, so local
  desktop, remote desktop and website all send `active-time-auto` to the owning host with a reload
  and error rollback. Gate remote use on an owner capability.
- On iOS, add the safeguard toggle with the same label and note directly above the allowance
  toggle, using the same availability rules.

Acceptance: Copilot/Claude (safeguard eligible) and an ineligible provider; allowance on and off;
local desktop, paired remote desktop, website and iPhone/iPad. Toggle each control, verify the
owner state after reload, and confirm the order matches everywhere.

## O14 Copilot Fusion in Copilot chats

**Asked October 30:** is there a Copilot Fusion feature for Copilot chats, what does it look like, and
can Proteus add it? This continues 0.2.39 **R1**, which added provider plumbing but found no Fusion
choice on this account.

**What Fusion is (official, generally available October 28, 2026):** a runtime model router and
orchestrator chosen in the model picker instead of a specific model.
- **Effort levels:** Standard (everyday, usually one model), High and Max. The docs' plan table
  appears to limit High/Max to Pro+, Max, Business and Enterprise; admin model policies limit which
  models it may use.
- **Patterns per prompt:** Single; Cascade (efficient draft, judge accepts or escalates); Critique
  (draft, parallel reviews, revision).
- **Display:** the user sees each step's progress and model, only the final response is shown
  (drafts can be discarded), and the models used are attributed after the response.
- **Billing:** per model at standard rates, no orchestration fee, 30% discount on paid plans
  through November 30, 2026.
- **Clients:** VS Code, Copilot CLI, the Copilot app and JetBrains. Discarded drafts' file edits
  are not undone automatically. Fusion does not start subagents.

Sources: [GitHub Docs](https://docs.github.com/en/copilot/concepts/models/copilot-fusion),
[GitHub changelog](https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/).

**Why Proteus does not show it (research October 30, read-only):**
- Proteus pins `@github/copilot-sdk` **1.0.16**. **1.0.28** was published October 28, the GA date.
  GitHub's guidance is to update the client.
- In 1.0.28 the selection surface is the *auto-tier routing preference*, not a model-list entry:
  `session.setModel("auto", { autoTier })` / `session.setAutoTier(...)`. Server-advertised
  execution descriptors carry `displayName`, `fusionTier` (`standard` / `high` / `max`), status
  and billing. Managed settings include `fusionTier`. Phase and route events (`session.fusion_*`,
  `assistant.fusion_phase_*`) match those 0.2.39 already journals.
- 0.2.39's `fusionAvailability` only scans the model list for `supports.fusion` or “fusion” in a
  name/ID, so it would likely report “unavailable” even after an SDK upgrade.
- Exact public tier identifiers (auto tiers `efficiency` / `balance` / `intelligence` versus Fusion
  Standard/High/Max) must be read from the live advertised descriptors, never hard-coded.

**Proposed experience:**
- **Model picker:** a **Copilot Fusion** choice for Copilot chats, with an **effort** selector
  (Standard / High / Max) in place of reasoning effort. Show only levels the account advertises,
  and explain unavailable ones (plan or admin policy).
- **During a run:** a compact status line in the activity area, for example
  “Fusion High · Critique · reviewing (model B)”. Phases are expandable in Activity; drafts and
  review text never appear as answers.
- **After the response:** “Fusion High · used: model A, model B” under the message (hover on
  desktop, tap on iOS), plus the existing 0.2.39 Run details Fusion card and truthful per-model usage.
- **Same chat semantics:** session, instructions, tools, approvals, Stop/steer, questions and
  continuation behave as for any Copilot chat. Add a reminder that discarded-draft file edits stay
  in the workspace.
- **Parity:** desktop, website and iOS model pickers and attribution.

**Plan:**
1. Upgrade the SDK and all per-platform runtime packages together through normal provider
   validation and source companions.
2. Discover advertised tiers from fresh provider capabilities.
3. Select through `setModel("auto", { autoTier })`, persisting the chat's selection.
4. Map existing phase/attribution journals to the UI.
5. Verify one real Fusion session at each available level on this account. Synthetic events alone
   do not count.

Coordinate with the open 0.2.39 R1 record rather than duplicating it.

**Operator decision (October 30):** add Fusion. Record **exactly which models were used**, shown as
soon as each piece of information becomes available.

### Model attribution available in SDK 1.0.28 (verified from the package declarations)

| Stage | Event | Model details provided |
| --- | --- | --- |
| Routing | `session.fusion_route_started` | attempt ID, requested policy (effort), synthetic Fusion model |
| Plan | `session.fusion_resolved` | `pattern`, `policy`, `primaryModel`, `secondaryModel`, `judgeModel`, `repairModel`, `critics[]` (`model`, `phaseId`, `reasoningEffort`), `fallbackModel`, `followUpModel`, `phasePlan` (kind, role, conditional), `hint`, rule name, capability `scores`, routing latency |
| Routing failure | `session.fusion_route_failed` | `fallbackModel`, `reason`, `errorMessage` |
| Each phase | `assistant.fusion_phase_started` / `_completed` / `_failed` | `model`, `role`, `phaseKind` (primary, judge, repair, draft, critic, revision, follow_up), `reasoningEffort`, `status`, `durationMs`, `verdict`, failure `reason`, `degradedToPhaseId`, per-phase `usage` (input/output/cached/cache-write tokens, `requestCount`, `totalNanoAiu`) |
| Each API call | `assistant.usage` with `fusion` attribution | concrete `model`, `phaseId`, `role`, `sourceModel`, tokens and cost per request |
| Final answer | messages with `fusion` attribution | `sourceModel`, `sourcePhaseId`, `commitId`, `hasUserSteering` |
| Turn summary | `session.fusion_completed` | `finalSourceModel`, `finalSourcePhaseId`, `outcome`, `degradedReason`, `phaseCount`, `requestCount`, total tokens, `totalNanoAiu`, `durationMs` |

All of these are marked experimental in the SDK and may change. Store unknown fields additively, so
newer provider data is not lost.

**Gap in 0.2.39:** `fusionJournal` keeps a single `run.fusion` per chat, overwritten every turn and
capped at 40 phases. It keeps only primary/secondary/fallback plus per-phase model and role. It
drops critics, judge/repair models, per-phase usage, durations, verdicts, final source model,
outcome, degradation and cost, so earlier turns lose their attribution.

### Required attribution behavior

- **One durable record per Fusion turn**, keyed by `fusionId`/`turnId` and linked to that turn's
  user message and final answer. Keep it in the chat's history with the existing retention, never
  overwritten by later turns.
- **Progressive display.** At routing, show the effort and “choosing models…”. At plan time, show
  the pattern, hint and **planned** models by role. During phases, mark each model as running,
  completed or failed. At completion, the answer says which model actually supplied it.
  **Planned and actually used are visibly distinct:** conditional judge/repair phases that never
  ran are not listed as used, and fallbacks and degradation are labeled with their reason.
- **Under each answer:** “Fusion High · Critique · answer by *model A* · also used *model B*
  (critic), *model C* (critic)” (hover on desktop/web, tap on iOS). The expanded view lists every
  phase in order: role/kind, model, reasoning effort, status/verdict, duration, tokens and AI-unit
  cost. Totals reconcile with `session.fusion_completed`.
- **Usage and cost per model** in Run details: aggregate per concrete model across Fusion turns,
  plus the Fusion total, using provider-reported values only. Label missing values “not reported”,
  never estimated.
- **Durability:** recorded attribution survives restart, resume, continuation and history paging,
  and syncs to remote desktops, the website and iOS. Duplicate or replayed events are deduplicated
  by event ID and phase ID.
- **Privacy:** store model and phase metadata, not draft or critic content (`content` in phase
  completion is not displayed as an answer or persisted beyond existing transcript rules).
- **Unavailable information stays explicit.** When a field is absent (older runtime, remote
  session, provider omission), show “not reported” rather than inferring a model from the picker.

Acceptance adds: one real turn per available effort level, including at least one Critique or
Cascade turn if the router selects one; verify every listed model against the raw provider
events, and per-phase usage sums against the completion totals; check restart and history paging;
and confirm desktop, website and iOS show the same attribution.


### O14 implementation and validation (October 31)

**What was built (branch `claude/oct31-copilot-fusion`):**
- `@github/copilot-sdk` 1.0.16 → **1.0.28** for every platform package (macOS arm64/x64, Linux
  glibc/musl arm64/x64, Windows arm64/x64).
- `src/providers/copilot-fusion.js` reads advertised Fusion tiers from `ModelList.auto.tiers`
  (`type: "fusion"` or a `fusionTier`). It publishes a **Copilot Fusion** catalog entry only when a tier
  is selectable, with tier labels, the default tier and unavailable tiers with reasons. Chats use
  `model: "auto"` plus `autoTier`, with no reasoning effort or context tier. If Fusion is unavailable
  the chat fails clearly before a session starts.
- A per-turn journal (`run.fusionTurns`, last 200 turns, plus `run.fusion` for the latest) records
  the plan (primary/secondary/judge/repair/fallback/follow-up models, critics, phase plan, hint),
  every phase (model, role, kind, effort, scope, status, duration, verdict, failure and per-phase
  usage), per-model request usage, the final source model/phase/commit, and completion totals.
  Replayed events are deduplicated. Draft and critique content is never stored, and review messages
  never become answers.
- Answers carry `data.fusion.fusionId`. Desktop, remote desktop views and the website show
  “Fusion High · Critique · answer by X · also used Y (critic)”, expandable to every phase, and
  “planned but not run”, fallback and turn totals. Run details shows per-model totals. iOS shows
  the same summary and phases (`NativeFusionAttribution`). Every effort picker (desktop, remote,
  website, iOS) shows advertised tier names. Remote projections send turns for the visible history
  window plus the latest turn, and history paging retains them.

**Live account check (read-only, October 31):** this account's runtime advertises no Fusion tiers
(`models.list` returned no `auto` metadata; an empty probe session, deleted afterwards, also had
none). No prompt was sent and no credits were used. Fusion therefore shows “not offered to this
account” until GitHub advertises it. A real Fusion turn per available level remains the outstanding
acceptance item.

**Validation:**
- New tests: tier discovery and validation; a simulated Critique turn using SDK 1.0.28 event shapes
  (exact models, usage, final source, no stored drafts, two-turn retention, remote projection,
  unavailable-account error); rendering, escaping and history merge.
- Real-browser UI check (`test/copilot-fusion-ui.mjs`): progressive updates, expansion retained,
  escaped model names, planned-only and totals, Run details table.
- iOS: compile-only simulator build of the app and test bundles succeeds (no install, so the
  existing simulators' protected data were untouched). The Swift attribution logic was compiled and
  run natively against the same fixture, producing identical wording.
- Full Node suite: 1,353 pass, 4 skip, 6 fail. The same 6 also fail on the untouched base commit
  `838c943` (update-recovery, tmux socket and working-folder projection tests), so they are
  pre-existing. Static checks pass.

## O15–O17 Remote computer layout parity

**Requested October 31 with screenshot** (remote Windows computer “proteus”): the remote workspace
project list looked different from local with small buttons (check the website too); the remote
chat window showed context where it does not apply and could not fit model options on one line; and
the source folders area showed a black box.

**Causes (confirmed in source):** `renderRemoteWorkspace` drew plain `.card` boxes with a bare title
button. `remoteChatDialog` built its own Reasoning/Context/Speed selects, always visible, in a
nested row. Empty `<pre>` boxes rendered for “Other configured source folders” (which also ignored
per-workspace folders) and for the unused context preview. The website's project rows used a
different, smaller layout.

**Implemented:**
- The remote workspace page now uses the local markup and classes: “Workspace · computer” eyebrow,
  muted subtitle, primary ＋ New chat, `preview-project-pages` tabs, and project rows with icon,
  name, chat count, New chat, Rename and Set default/Delete or “Default project”.
- The remote new-chat composer uses the shared composer model controls (`modelControls` and
  `applyOwnerModelCatalog`) with the remote host's catalog, exactly like local. Inapplicable controls
  hide, labels match (Level/Speed), Provider and Model sit directly in the toolbar, and everything
  fits on one line. Saved defaults are restored and Start still requires an available model.
- Source folders list the remote workspace's registered and always-available folders (top-level
  plus selected workspace), or an explicit “no other source folders configured”. The context preview
  is hidden until there is a result.
- The website's project rows match the desktop layout and add a New chat action.

**Validation:**
- `test/desktop-remote-projects-ui.mjs` passes with new assertions (icon, chat count, row New chat).
  Its stale dialog fixture now prevents native form submission, which had blanked the page in the
  base commit too.
- `test/chat-setup-peer-ui.mjs` (isolated Electron, two loopback hosts) passes with new assertions:
  shared controls present, no empty preview box, folder content shown. Screenshots were reviewed.
- Website: the projects test's new row assertions pass. That test's pairing-expiry text and
  tab-move steps fail identically on the base commit (pre-existing).
- `desktop-peers-ui.mjs` fails before the dialog on the base commit too (hidden `#new-chat`);
  its selectors were updated to the shared control IDs.

## Collection rules

Add requests with stable `O` IDs. Keep observations, reproductions and leads distinct. When
implementation is authorized, open the named release, reserve its version and record scope,
platform coverage and validation before any separately authorized rollout.

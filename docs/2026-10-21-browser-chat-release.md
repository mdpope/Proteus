## October 21 — current 0.2.28 rollout acceptance

Build Mac now runs signed build `4338f058a3f7+dirty.80115ff176d2` (298 runtime files).
The earlier aa0b candidate was superseded after HC acceptance found the missing read-only
`integrations.list` desktop peer allowlist entry. The corrected installed Build Mac actually
loads HC's 47 configurations, groups 259 mail session records, and exposes no peer auth/check/
recovery/edit controls. All 865 Node tests and static checks pass; the exact signed artifact
passes package/vendor signing, keep-awake OS assertion, video bounds/player/fade and follow-up UI.

Local preservation checks passed for all 30 chats, original configuration, global favorites and
still-protected retry receipts. The supported owner API moved Sims 3 Install into Gaming &
Emulation: one chat and all three project tab payloads retained, with original execution settings
preserved and only expected membership/move-receipt/timestamp changes. Actual sidebar verified.
This move changes the owner's project; it does not copy independent projects between machines.

Web release `20261022T040425Z` is deployed and its endpoint audit passed; all 83 PHP tests
(741 assertions) pass. Recovery used the established capture-state validation fallback after the
isolated restore check failed; do not describe that as a successful isolated restore rehearsal.
The iPhone runs 0.2.28 / 2610.21.1, with all 94 protected files preserved before launch and its
running process verified. Following the operator’s unlock, the physical iPad also runs
0.2.28 / 2610.21.1: all 215 protected files (44,615,061 bytes) matched before launch, and its
running process was verified. Physical recovery rotation retained two verified generations per
device and reclaimed another 44,953,600 bytes. The separate native Mac
wrapper is installed with its original identity/entitlements; the translocated running executable
matches, but visible UI launch remains unverified and its protected container was not hash-readable.

HC installed and preservation-verified the initial aa0b build, merged its own 14 unique favorites,
and retained saved approvals/1,256 protected receipts. After the operator resolved the approval,
HC installed the corrected artifact and verified Build Mac’s 21 configurations in the read-only
peer panel, with no sign-in/recovery/edit/favorite controls. Its 344 chats, 100 views, 14 favorites,
databases and protected receipts passed preservation checks. Final all-root recovery rotation
retained two verified full generations, retired 26 obsolete items and reclaimed 3,368,284,160 bytes
without another full snapshot or modifying live data. Installed mock-provider MCP approval checks
passed; real external actions were not replayed. HC observed keep-awake default-off; its native
tray interaction remains unexercised because menu automation timed out.
Linux's corrected
`linux.c88e46430428` is installed and verified, including a second restart with debugging disabled.
All 298 runtime files match the frozen source; 865 tests/static checks, package/UI and encrypted
two-host inventory/Refresh checks passed. Its 681 events, 12 tabs, favorites and settings were
preserved, with two verified recoveries retained and no additional full snapshot. Acceptance was
published at `1556e50` on `linux/release-0.2.28-aa0b`. Its production relay remains disabled and
it has no paired computers; fixture acceptance does not establish a live production pairing.

Local recovery/staging cleanup retained two verified generations per updated installation/device
and reclaimed a measured net 2,230,226,944 bytes across the cleanup steps. The corrected
transfer packet remains available for recovery; superseded duplicate transport payloads were retired.

Keep Screen Awake is off at each launch. Use Proteus's menu bar/tray checkbox; the native host
prevents idle display sleep while enabled, including with its windows closed, and releases the
request on Off/Quit. No synthetic input, saved system sleep-setting change or auth action occurs.
Apple Passwords pairing is blocked by the installed Apple helper’s browser launch constraints;
see browser.md for verified evidence and the Apple approval dependency. Real Touch ID,
the original Social-profile trigger, real Claude steering
and actual third-party account login workflows remain separate unverified acceptance.

# 0.2.28 — October 21 browser, project and provider repairs

The operator's “build all of this now” authorizes implementation and building BF-74–85,
superseding this conversation's queue-only hold. This ledger separates source/test acceptance
from installation and real external workflows. No installed desktop, live profile or project
has been changed by the build work.

## Implemented scope

| Intake | Result |
| --- | --- |
| BF-74 | Address suggestions use a sandboxed, nonfocusable child window. The loaded page stays visible; keyboard selection remains in the address field. Selection is bound to the originating window/tab and token. Blur, Escape, navigation and toolbar disposal close the popup. |
| BF-75 | Prior read-only investigation found the same assignment in live metadata and both retained pre-update snapshots. It did not demonstrate an update-induced move. Original placement cause remains unknown. |
| BF-76 | The owner project service accepts revision-checked `move-project`. It journals the stable project ID and affected chats before reconciling membership, including archived chats. Existing run configuration, original permission origin and sessions stay intact. Project-scoped resources keep their identities and execution hosts; same-ID saved desktop/peer placements are reconciled. New-chat draft text/attachments survive while workspace choices reset. Desktop local and supported paired-owner views offer Move project. |
| BF-77 | New chat's width cap grows from 820 to 1,066 CSS pixels; ordinary message-box minimum grows from 120 to 138. Small panes constrain width and adaptive height. |
| BF-78 | Optional native-messaging permission now works through the adapter's effective grants and persists within the installing profile. Setup guidance explains Bitwarden desktop browser integration, biometric settings and local approval. Actual Touch ID is not verified. |
| BF-79 | Command/Ctrl+R routes to the selected resource in the initiating window. Explicit Reload Window remains a separate recovery action. New-chat/terminal tabs keep their state. |
| BF-80 | Agent observations replace repeated data-URL favicon bytes with content-hash identities, while host/UI storage keeps the icons. Complete history remains unchanged wherever it was returned before. Screenshots remain image results. No history truncation or implicit delta state is introduced. |
| BF-81 | The pinned extension adapter uses a reproducible connection-local native-host implementation with pipe/child error containment, bounded queues, UTF-8 framing, partial/coalesced frame parsing, timeouts and exactly-once shutdown. Delayed EPIPE cannot escape as a global exception. Failures surface a deduplicated setup notice. |
| BF-82 | Extension popup reuse requires the same Electron session and parent window as well as URL. Another profile's identical extension URL cannot close/reuse it. The original Social blank-screen trigger is not proven. |
| BF-83 | Claude implements interrupt-and-continue in its current native session: drain the interrupted result, send one UUID-tagged input and await the matching replay acknowledgment. Missing acknowledgment produces an unconfirmed-delivery failure without automatic resend. Desktop labels the behavior; desktop/web/native Steer controls use owner capability. |
| BF-84 | Authorized Markdown readers return source birth/modified dates from the same validated file snapshot. Local, Team, paired desktop, web and native viewers display them. Unavailable creation dates stay Unknown; reads do not alter source metadata. |
| BF-85 | Recognized native tool approvals for every selected third-party MCP server use normal MCP permission handling, including eligible saved chat/workspace rules. Server/tool/action identities, active thread/turn, selected-tool restrictions, Ask and revocation are retained. Unsupported forms/URL requests produce an adapter error, not a fabricated human refusal. |

## Design and compatibility limits

- Moving a source default project creates a replacement General project in the same catalog
  commit. The dialog explains this; the destination default is unchanged. This replaces the
  intake's separate replacement-selection step. Schedule files and activation are unchanged;
  organizational movement does not rewrite captured execution context or move files.
- Move receipts make membership writes resumable after a partial failure. Retrying the original
  revision/destination resumes that receipt; a different stale mutation conflicts normally.
  Observing clients must have the new same-ID reconciliation code to update saved locations.
  The remote `projects.move.v1` capability prevents offering moves on older owners. Movement
  does not update software or copy project ownership to another Mac.
- Favicon hashes are compact identity metadata, not a new image-fetch endpoint. No agent access
  to image bytes or cross-profile cache is added. Full history deltas remain deferred.
- Native-messaging repair does not bypass OS code signing, native-host allowlists, extension
  consent or vault authentication. Permission records remain separate per browser profile.
  Apple helper exits/signature kills still require diagnosis on the actual installed setup.
- Claude steering means interrupt-and-continue, not Copilot-style boundary injection. A runtime
  acknowledgment proves receipt, not that the user's requested external workflow succeeded.
- MCP tool identity is accepted only from the recognized native runtime approval envelope with
  the exact generated question and metadata. Arbitrary MCP elicitation fields do not become
  trusted policy identities. No tool is executed a second time by the approval handler.

## Validation

- `npm test`: 855 tests passed after the shared project/peer reconciliation changes.
- Electron disposable-profile test `test/bf74-85-ui.mjs`: suggestions leave the native page
  visible, Escape dismisses, selected refresh preserves the shell, 1,066/138 sizing, small-window
  constraint, whole-project membership and saved tabs/draft/defaults, Markdown dates.
- Existing `test/chat-setup-tabs-ui.mjs` and `test/browser-extension-ui.mjs` passed with synthetic
  drafts/attachments and a synthetic extension; no actual vault was accessed.
- Focused adapter tests cover arbitrary stdio/HTTP MCP servers, old saved rules, same-named
  tools, Ask, selection boundaries and duplicate requests; Claude interrupted/result/replay and
  missing-ack paths; EPIPE/late events, Unicode/split frames, one-shot failure and profile grants.
- Web production assets built successfully. Native iOS Simulator compile passed; physical
  device installation and live paired-client workflows are separate acceptance.
- `npm run check` and `git diff --check` passed. Native 0.2.28 / 2610.21.1 compiled for the
  iPhone 17 Pro simulator. Installed Claude CLI help confirms `--replay-user-messages` support.
- Exact signed-package `test/packaged-mac.mjs` passed: bundle identity, valid local signature,
  preserved vendor signatures, launch, synthetic mock-Keychain cookie persistence and 15 live
  Copilot model metadata entries. No model turn was run; real Keychain trust is not claimed.
- Exact signed-package `test/bf74-85-ui.mjs` passed, including mouse and keyboard native popup
  selection and the actual Move project dialog. Exact packaged `test/browser-extension-ui.mjs`
  passed install/open/disable/enable/update and identical-URL popup isolation across two sessions.
- No operational schedule, real model turn or real vault was used for these checks.

## Remaining live acceptance

The requested one-time project relocation is still pending on the owning installed host; this
build does not edit live data. Use the supported move after the owner and viewing desktops are
updated, then verify owner membership, saved views and new-chat defaults. Do not patch the catalog
by hand. Actual Bitwarden biometric unlock/cancel/reconnect, Apple Passwords pairing, the reported
Social profile, real Claude steering and HC's actual selected MCP servers remain live checks.

## Built artifact

- Mac ARM64: `dist/Proteus-darwin-arm64/Proteus.app`, version **0.2.28**, Electron **44.5.1**.
- Build revision: `4338f058a3f7+dirty.a82330b58e1f`.
- Source fingerprint: `a82330b58e1f6af31d98f723a3cb8332727271052c9305b5f073dcb53d4df934`.
- 290 runtime files were checked against the frozen source snapshot during packaging. Existing
  unrelated checkout changes are included; nothing was reverted or represented as a clean commit.
- Signed with the existing Proteus Apple Development identity, preserving Copilot vendor binaries.
  This is a locally signed build; distribution notarization is not claimed.
- Installed/live status: **not installed**, no remote rollout, no live project relocation.
  Build/test-only work created no live-data recovery backup and changed no retained generations.

## Additional release scope authorized October 21

The later operator instruction authorizes implementation, stopping Proteus chats as needed,
and in-place updates on both Macs, Linux and relevant native/web clients. BF-86–90 are included:
owner-global favorites and HC-local union, configuration-centered MCP inventory with read-only
Other computers, context-menu ordering, duplicate browser tabs, sidebar expansion preservation,
and exact-origin-window video pop-out. Current source tests/UI and builds are separate from
installation. The old 0.2.28 package predates this scope and must not be installed.

The Linux controls/relay delta from 4207379 is reconciled into the common source, retaining the
current-tab refresh shortcut. Native adds informational owner MCP connections and source status.
Source-owned hcos authentication remains with the chat/source; no vault refresh, shared credential
broker or generic pre-chat auth session is implied by viewing connection status.

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


## October 21 — peer integrations acceptance correction

HC live acceptance of the initial 0.2.28 package found the read-only Other computers inventory
blocked by the desktop peer method allowlist. Added only `integrations.list`; recovery/check
mutations stay unavailable through this informational peer view. The paired-host regression now
exercises the actual encrypted peer request and verifies mutation commands remain rejected.
This correction supersedes the aa0b52aee873 desktop package; replacement acceptance is pending.
The preceding package's menu bar keep-awake, local preservation, global favorites, project move,
iPhone installation and web deployment passed their stated checks.

# Native Workspaces release checks — October 11

## Implemented native scope

Workspaces is a feature list. iPad shows it in the existing sidebar, with up to seven recent
workspaces; iPhone reaches the same list from Home. Opening a workspace on iPad adds a named
main-navigation tab. Its singular-square Workspace tab contains Chats / Configuration pages.
The shared aggregate Chats view locks host and workspace identity in that container, while
master Chats retains editable workspace filtering. Opening and sending a chat use its existing
host/chat identity; workspace content descriptors deduplicate the chat independently of its
main-navigation representation. Global and workspace chat views use the same existing drafts,
provider execution boundary and history. Workspace browser links remain within their container.

Configuration uses owner-host, revision-checked APIs for source modes/favorites, starting-folder
selection, approvals, defaults, exclusions and individual root refresh. Folder paths are displayed
as owner-host paths; native clients select existing configured roots rather than exposing an
incorrect local-device picker. Sources retain their existing loading modes and explanatory labels,
with alphabetical folder/item sections and a name/path filter across all source kinds. Configuration
name/exclusion/approval drafts survive leaving the page. Browser/files/commands are not feature toggles.

Local Copy preserves the complete host configuration and approvals, then opens the copied
workspace's Configuration page. Copy to another computer maps source roots to existing configured
folders on the destination; it creates an independent owner-host workspace and requires approval
review there. Only source metadata is transported by the native form. Native New workspace also
uses an existing configured starting folder on the chosen owner host.

Browser descriptors and workspace chat membership use the shared content-tabs protocol. Browser
profile stores, existing sign-ins and per-chat document approval boundaries remain unchanged.
Native tab transfer supports main navigation and configured workspaces, preserving the local
page for moves. Workspace chat documents and Live Browser remain available through Chat tools;
native terminals remain owner-Mac execution, consistent with the existing native client. Terminal
process state and sign-in cookies are never presented as synchronized executable state.

Additional batch coverage: chat-only recursive folder read/read-write grants/revocation; partial
Claude input accounting labels for older incomplete records; address-bar history filtering and
multiword Search with choices, with Enter using the selected default engine.

## Validation

- Initial iPhone simulator compilation passed.
- First new workspace integration check exposed a backend discovery timing issue when a copied
  workspace canonicalized a temporary root from `/var` to `/private/var`. The owning backend agent
  fixed copy-workspace to await discovery. The native integration test now passes.
- Full iPhone simulator run: **76 native unit tests passed**, including workspace copy/mode
  isolation and mixed browser/chat descriptor synchronization. Three UI tests passed: workspace
  Copy → Configuration, source favorites/selected context, and long-history typing isolation.
- The unit suite retains existing transport, independent-host, browser-profile/cookie persistence,
  history, attachment and document-safety tests. No existing test was removed.
- Final iPad simulator run: **76 native unit tests and workspace Copy → Configuration UI passed**.
  Earlier iPad browser-tab restoration and long-history typing UI checks also passed. The first
  combined iPad run's workspace UI test needed to navigate back to Home before pairing after
  the browser test; explicit navigation corrected the test setup, and the final rerun passed.
- Visual review of the iPad test screenshot confirmed the named workspace main tab, singular
  Workspace child tab, Chats / Configuration buttons, source labels, per-folder refresh and
  grouped source configuration using the existing native styling.
- Universal unsigned iOS Release build passed with Xcode **27.0 (27A266a)**. Bundle version
  values were checked directly from the built Info.plist: **0.2.12 / 2610.11.1**.
- Final iPhone rerun against the frozen source: **76 native unit tests and workspace
  Copy → Configuration UI passed**. Scoped `git diff --check` passed.

Local release evidence (temporary build products, not repository assets):

- Final iPad: `proteus-apple-SvrZrt/Tests.xcresult` in the build helper's temporary output directory.
- Final iPhone: `proteus-apple-Kb9VPD/Tests.xcresult` in the same temporary parent.
- Earlier full iPhone: `proteus-apple-W7yhcS/Tests.xcresult` in the same temporary parent.
- Unsigned app: `/private/tmp/proteus-native-release-2610111/Build/Products/Release-iphoneos/Proteus.app`.
- Unsigned build log: `/private/tmp/proteus-native-release-2610111-final.log`.
- iPad screenshot: `/private/tmp/proteus-native-workspace-shots/95bda0c6-4c21-588c-a921-60b0604bc7f7.png`.

Version target: **0.2.12 / 2610.11.1**, using the existing Xcode project and identity settings.
The Info.plist continues to reference build-setting variables. No project regeneration, certificate
or provisioning change, physical device install, real provider action or production data mutation
was performed by these simulator checks. Synthetic fixtures use their own temporary host homes.

Simulator verification does not establish physical iPad/iPhone installation or real remote account
acceptance. Root release coordination owns signing and the first Proteus iPad installation on this
Mac, preserving its existing wrapper and app data; physical iPad/iPhone follow later.

## Mac installation acceptance — October 12

Root installed 0.2.12 / 2610.11.1 in the existing Proteus iPad wrapper on this Mac, using the
existing valid certificate and Mac-compatible profile. The operator completed the macOS verification
prompt after LaunchServices registration was refreshed. The native app process and visible
Workspaces list, existing tabs and paired owner were verified. Container contents were untouched;
OS privacy protection prevented direct file-hash comparison. A private rollback bundle is retained.
Physical iPad/iPhone updates are pending the operator's next instruction. See the release ledger.

## Native workspace parity follow-up — October 12

The 0.2.12 / 2610.12.1 native build aligns the existing interface with the follow-up design:

- Configuration labels its scoped source list **Workspace sources**. Folder group headings use
  the available row width before wrapping; native groups have no custom inner left border.
- Owner-specific configuration, chat, approval, provider, attachment and connection messages use
  the authenticated computer name. Generic selection/management controls say computer; existing
  saved names, host identities, pairing keys and routing are unchanged.
- The Chats badge counts unarchived records whose status is exactly `running` across online
  computers, including all chat categories. It uses the full owner `runningChatCount`; older
  hosts fall back to unique host/chat rows. Offline cached history, queued/completed/awaiting
  chats and duplicate tab representations do not add to the count.
- Main and workspace plus menus use Markdown file, Browser profiles, Terminal, New chat,
  Internet Search order. Schedule and reorder actions remain below the creation actions.
  Native Markdown/terminal availability retains its existing host/approval limits. Main New chat
  now opens the creation form directly; workspace creation keeps its locked workspace and opens
  within that workspace. Existing browser sessions and chat identity are unchanged.

Verification: all 78 native unit tests passed on both iPhone and iPad simulators. Workspace copy,
scoped configuration labels, menu ordering, owner-name presentation and workspace New chat UI
passed on both. iPad also passed the main-navigation New chat sheet check. The first new menu
assertion targeted a hidden toolbar button instead of the menu action; explicit workspace menu
accessibility identifiers corrected the test. A connection-management test also required an
explicit Home navigation step because the app restores its prior workspace page.

Evidence: iPhone `proteus-apple-4PSVPp/Tests.xcresult`; final iPad unit/workspace checks
`proteus-apple-7RrRz5/Tests.xcresult`, in the build helper's temporary output directory. The latter
run's connection-management check is recorded separately after the fixture correction.
Unsigned device build succeeded at
`/private/tmp/proteus-native-release-2610121/Build/Products/Release-iphoneos/Proteus.app`;
version/build and executable hash are recorded in the private staging receipt. Simulator/build
checks did not sign, install, change provisioning, or touch physical-device data.

The corrected iPad connection-management test passed in
`proteus-apple-B5I1Bc/Tests.xcresult`, including selection, rename and independent removal of a
synthetic destination. Existing real destinations were not accessed by that test. Final text-only
cleanup also names the owner in the local-preview placeholder (HTML-escaped) and uses computer
terminology in Life help; the unsigned release build was refreshed afterward. No signed package
or installation is claimed by this follow-up verification.

### Mac installation of 2610.12.1

The native wrapper on this Mac was updated in place after a normal UI quit, retaining the same
certificate, valid Mac-compatible profile (expires October 18 at 16:38 MDT), entitlements and
wrapper layout. A complete prior-wrapper rollback copy and installation receipt remain private.
The protected container path was unavailable; no data hash comparison is claimed. Only the app
bundle was replaced, with no physical iPhone/iPad changes.

Installed and live translocated bundle versions both read **0.2.12 / 2610.12.1**, their signed
executables have identical hashes, and strict signature verification passes. The operator completed
macOS Open verification. The first process stalled before app startup; a bounded sample showed
only `_dyld_start`, and Computer Use inspection timed out. Recovery gracefully terminated only
that confirmed suspended native process and reopened the installed outer wrapper through Finder.

**Responsive launch is now verified.** Root inspected the actual translocated app through Computer
Use: Home explicitly shows Version 0.2.12 (2610.12.1), four retained tabs, the Build Mac computer
name, and Chats 0. An independent process check showed the new native process with normal resident
memory. The private receipt records `launchVerified: true` and the successful recovery. No security
protections were bypassed, signing credentials changed, or physical devices updated.

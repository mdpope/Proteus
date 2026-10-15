# October 11 Workspaces release ledger

Operator authorization: implement the complete BF-2026-10-10-01–17 batch; BF-14 Projects is
superseded by Workspaces BF-17. Existing styling/features/session persistence must be preserved.
Build and test desktop on this Mac, web and iPhone/iPad simulators. Update **Proteus iPad on this
Mac first** after verification. The October 12 follow-up authorizes physical iPad/iPhone and Work Mac upgrades,
coordinating HC through its existing Codex chat. Previous planning holds are superseded for this batch.

Latest additions: use **Starting folder** consistently; singular workspace icon (no pin icon),
seven recent workspaces; local Copy on list prompts for name, copies complete configuration and
approvals independently, then opens Configuration; cross-machine copy creates a separate owner-bound
workspace. Remote clients can edit approved options/approvals; host-local picker/path operations
must be explicitly read-only where no remote picker is supported.

## Ownership

- Root: desktop/web workspace navigation and shared UI, Claude usage, integration, release docs/gates.
- workspace_foundations: context/discovery, permissions, engine/server/remote/tab persistence APIs.
- browser_fixes: browser BF01–05/08/09/13 and composer/search BF06/07/11.
- native_workspaces: native parity, native tests/simulators.

## Status

Source implementation and release gates complete. Desktop 0.2.12 and Proteus iPad 0.2.12 /
2610.11.1 are installed and launch-verified on this Mac; final acceptance completed October 12.

- BF01–05, 08–09, 13: browser actions, store installation, ownership, scrolling and suggestions implemented.
- BF06–07, 11: composer docking/typing stability and larger Internet Search implemented.
- BF10: cache-inclusive observed Claude input accounting with explicit partial legacy records.
- BF12, 15–17: alphabetical folder inventory, chat folder trust, independent discovery, complete Workspaces.
- BF14: superseded by Workspaces; no separate Projects section.

### Verified

- Final full Node suite: 435/435 passed, including terminal view routing and Agent terminal persistence.
- `npm run check` passed.
- Real Electron workspace navigation, local configuration copy and cold-session restoration passed.
- Authenticated two-Mac website regression and dedicated workspace permissions/copy/sync suite passed; web assets built.
- iPhone and iPad: 76 unit tests plus workspace Copy-to-Configuration UI test passed on each. Additional native browser/history/typing/source tests are recorded in the native receipt.
- Official Chrome Web Store Dark Reader install, enable/disable, failed-update rollback, cookie preservation and cold restoration passed in a disposable profile.

### Installation and final acceptance

- Proteus iPad on this Mac was updated first, in place, to **0.2.12 / 2610.11.1** with the
  existing valid certificate/profile and wrapper. After refreshing stale LaunchServices registration,
  the operator completed macOS's verification prompt. The native process and visible Workspaces
  list, existing tabs and paired owner were verified. No container data was edited; OS privacy
  protection prevented a direct container hash comparison. Previous bundle retained privately.
- Desktop **0.2.12**, revision `ec8b213d382e+dirty.fef0f97bf90b`, was installed in place after
  checking no active turns. The signature uses the same certificate. All **65,478 app-data files**
  were hash-identical across the bundle replacement before first launch; full recovery copies remain
  private. Migration preserved both workspace identities, names, starting/additional folders and
  all six legacy source/configuration fields in each independent workspace.
- Live desktop acceptance verified Workspaces list, named workspace tab, pinned Workspace child,
  locked workspace chat filter, Configuration, alphabetical source sections and existing restored
  navigation. A subsequent normal quit/relaunch restored Configuration and rendered correctly.
- Initial desktop launch had a blank painted surface despite a fully loaded DOM and no console
  errors. It recovered during a diagnostic that focused the main renderer. All 30 browser tabs
  were unloaded, ruling out loaded browser-child occlusion. The clean restart did not reproduce it;
  the precise cause remains unconfirmed. No speculative rendering workaround was shipped.
- Laravel **80/80 tests, 717 assertions** passed with ephemeral test keys and in-memory SQLite.
  Final web build passed. Desktop content-tab, browser-action, terminal-restart and sidebar gates
  passed, including detached terminal output and exactly-once startup. Signed package smoke passed
  identity/resources/signatures, launch, disposable cookie persistence and bundled provider metadata.
- At initial acceptance, physical iPad/iPhone, production web and HC deployments were unchanged;
  the October 12 rollout below supersedes the device/HC hold.

### Practical limits

Remote terminal tabs identify the owner/session; interactive terminal transport remains owner-only.
Workspace-only documents require the owner; existing approved chat-document transport remains.
Browser authentication/cookies and extension secrets stay on the owning profile. Extension
compatibility depends on supported Electron APIs; native messaging is unavailable. Physical
trackpad feel and authenticated password-manager flows are not established by fixture tests.

Evidence: [browser/web](2026-10-11-browser-fixes.md),
[backend and shared UI](2026-10-11-workspace-backend.md),
[native](2026-10-11-native-workspaces.md).

## October 12 corrections and expanded rollout

The operator authorized iPad/iPhone updates and the Work Mac upgrade via its existing Codex chat.

- Desktop/web corrections: spaced dot before scan counts; category buttons above the full-width
  master filter; visibly expandable, bordered folder groups with disclosure arrows, icons,
  name/path/count headers and contained controls/items; shared 2px selected navigation underline
  without the duplicate inset shadow.
- Focused desktop workspace UI, static checks, built web layout at desktop/mobile widths and
  signed-package smoke passed. The corresponding source archive matches all 186 runtime hashes.
- Build Mac: installed **0.2.12**, revision `ec8b213d382e+dirty.b0a14294e2c1`, with the same
  certificate. All **65,480 app-data files** were hash-identical across replacement. Launch,
  restored tabs, configuration, visible layout and folder collapse verified. Previous bundle and
  full cold data backup retained privately.
- Physical iPad: **0.2.12 / 2610.11.1** installed in place and launch/process-verified. All seven
  protected files were byte-identical before launch; saved destinations retained after launch.
  Existing certificate/profile preserved; profile expires October 18 at 16:24 MDT. Durable private
  backup retained.
- Physical iPhone: **0.2.12 / 2610.11.1** installed in place at 00:56 MDT on October 12 after
  connectivity recovered on retry. All seven protected files were byte-identical before launch;
  installed version, independent running process and retained saved destinations verified.
  Existing certificate/profile retained (expires October 18 at 00:47 MDT), with a durable private
  backup. No uninstall, pairing reset or certificate change was required.
- Work Mac: **0.2.12**, revision `ec8b213d382e+dirty.b0a14294e2c1`, installed and independently
  verified through the existing Codex chat after the operator approved the private GitHub transfer.
  All 186 runtime hashes and original signing verified; full cold backup retained and application
  data byte-identical through replacement. Both workspaces, 53 tabs, chat history, five pairings,
  19 existing approval profiles and schedules preserved. Workspace UI checked, original selected
  chat restored, relay and both Mac connections online. The derived catalog rescanned: no selected
  source entries lost; stale/unselected entries removed and unavailable sources reported. No active
  turns interrupted, source checkout overwritten or production web deployed.
- Production web: assets built and tested; not deployed by this rollout.

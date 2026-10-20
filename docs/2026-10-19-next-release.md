# October 19 combined release

The operator lifted this chat's build hold on October 19 and authorized implementation of its
queued changes, incorporation of the accepted **Queue iOS navigation updates** chat, iOS tab
overview parity, and build/install on all existing devices. Historical queue-only statuses below
are intake records, superseded by this authorization. Preserve active work and current data;
installation authorization does not authorize cancelling unrelated turns or changing shared
signing identities. Use exact tested artifacts and the two-generation recovery policy.

## Implementation and acceptance checklist

- [ ] BF-04/05: Inspect Element ordering and aborted replacement navigation.
- [ ] BF-06/07: persistent sidebar state/name expansion and startup readiness.
- [ ] BF-08/09/10: workspace-wide ordered overview, persistent browser/chat thumbnails and icon.
- [ ] BF-11: multiple desktop windows, shortcuts and complete quit restoration.
- [ ] BF-12: direct new-tab page and combined address/history entry, desktop and iOS.
- [ ] BF-13/14: connected profile controls/guidance and correct auth browser/callback app.
- [ ] BF-15: **Shelved by operator**: no paid Widevine vendor-signing account or runtime migration in this release.
- [ ] BF-16/17/18: workspace ordering, hierarchical move destinations and bulk tab actions.
- [ ] BF-19/20: durable document positions and circled More icon.
- [ ] BF-21: independent update helper, health/recovery and automatic original-chat continuation.
- [ ] BF-22: Cua primary/Peekaboo fallback, lazy tools and honest platform/backend state.
- [ ] BF-23/24/25: empty history revisions/resolution and non-modal scoped conflicts.
- [ ] BF-26: independent investigation if black text rectangles reproduce.
- [ ] BF-27/28/29: Ghostery recursion, Developer tools action and production provider picker.
- [ ] Audit other preview-only policy leaks; record findings and actual isolation boundaries.
- [ ] Promote accepted iPhone/iPad navigation/composer design without fixture-service leakage.
- [ ] Apply current-workspace project grouping/visibility/order and cached overview images to iOS.
- [ ] Runtime/static/UI/native regression acceptance, then exact signed artifact acceptance.
- [ ] Existing desktop and native installations: stage, preserve, install, independently verify.

## Current evidence

Implementation has started; no new artifact is installed. The native design chat is idle and its
accepted changes are promoted in this shared checkout, with separate simulator-only fixture flags.
The provider audit confirms BF-29's pruning branch confuses production project UI with isolated
preview policy. Server adapter/catalog restrictions use the actual isolated-preview option;
they must remain isolated. Additional audit findings and per-device receipts will be recorded
as verified, rather than inferred from a successful build.

## October 19 integration checkpoint

Release branch `codex/next-release-0.2.26` incorporates `linux-current-mac` at `7c7bc54`;
merge checkpoint `0a5a2f6` is pushed for isolated Linux preparation. The operator selected
**Clone Proteus into project root** on the Linux host for package/UI tests and eventual installation.
It is not the frozen installation candidate. No new production installation has occurred.

The merged runtime run passed 782 of 783 checks; the native inventory check exposed additional
accepted design classes, now included with their real test owners in phone/tablet shards. Its
focused checks pass. A disposable desktop production migration/restart check passes with 146
retained views. Native simulator compilation passes after resolving saved-history gesture ownership
and splitting the combined Swift view builder. These results do not establish physical-device or
live workflow acceptance. Source implementation continues, including multiwindow and supervised
updates; broad checks, exact signed packaging and all installations remain pending.

Desktop auth selects an additive desktop OAuth client/callback (`proteus-desktop`) and honors
the saved in-app/system link preference. Existing mobile callbacks and saved credentials remain.
The website must provision its separate public client and deploy the supporting endpoint before
new desktop sign-ins can pass live acceptance. Provider-neutral desktop control has a lazy
Cua/Peekaboo broker and Engine Room status/setup surface. The later evidence below records actual
Build Mac installation/grants/input; other hosts and real-provider image delivery remain gates.

## Later source/fixture evidence (still not installed)

- Added the operator's iOS follow-ups BF-30/31: black measured iPad status safe area, app-content
  clipping and removal of ordinary inactive-scene privacy blanking. Native source is updated;
  simulator/physical layout and app-switching acceptance remain pending.
- Removed only Proteus Legacy from the physical iPad on explicit request. A fresh app inventory
  retains paid Proteus 0.2.21 / 2610.18.2 and its Application Support directory is accessible.
  Existing private recovery remains; this is separate from installing the new release.

- Linux chat `20d2a367-c5c1-537c-ba4b-799b69092083` finished preparation on
  `linux/next-release-0226-validation` / `9439f24`: 785 runtime tests, static/package PTY/restart and
  four UI suites pass. Its two broader failures remain a final Linux rerun gate. Installed 0.2.20
  is unchanged. Its startup fix is incorporated locally, not yet a new frozen push.
- Mac full runtime suite after windows: 793/793. A later run after helper/control work had one
  external-catalog ordering failure, now corrected and its focused authenticated MCP check passes;
  the final full rerun remains required. Static source checks pass before the latest refinements.
- Real disposable Electron multiwindow tests pass browser IPC isolation, independent reading
  positions, Quit geometry and explicit Close restoration. Overview and tab stability pass.
  Three real child-selection restarts preserve IDs/history/selection. Bulk selection/hide/move
  passes workspace/project hierarchy, original source/identity/hidden state and no hidden loads.
- The full native simulator unit run passes 134/134 (`proteus-apple-E03qlo`). Later native overview
  grouping, periodic chat capture and direct Team + changes are compiling; their UI acceptance is
  not yet established. No physical device is changed.
- Cua Driver 0.36.0 and Peekaboo 4.9.5 are installed locally from their official installer/tap.
  Their actual MCP catalogs pass through Proteus. The fallback adapter uses Peekaboo's real
  snapshot schemas. OS-permission approval is requested asynchronously; no grant/input/cursor or
  real-provider image delivery is claimed. Only catalog discovery was performed.
- Eight updater protocol/supervisor tests pass using synthetic apps/data: independent readiness,
  settled-turn barrier, queued input, stable continuation IDs, compatible rollback, crash-phase
  reconciliation, preservation of post-update records and configuration boundaries. The signed
  supervisor, exact packaging, all-root recovery inventory and live continuation remain gates.

## October 19 evening acceptance checkpoint

- Full runtime suite: **811/811**, plus static checks. Actual disposable main/Team new-tab UI passes
  direct +, focused combined address/history filtering, Enter, creation blocks, docked layout and
  pagination retry without advancing the cursor. Resize/polling no longer clears Team's draft
  address. Remote project UI passes nine groups; new-tab Internet Search preserves its owner/project.
- Both signed control hosts have operator-approved Accessibility and Screen Recording grants on
  Build Mac. Cua 0.36.0 and signed Peekaboo.app 4.9.5 pass real exact-window screenshots/native
  clicks and fresh verification through Proteus, using only a disposable counter app. Peekaboo's
  dispatched-but-unverified click is reconciled by observing its counter change without replay.
  Actual image bytes survive the model-result adapter; delivery to a real provider remains pending.
  Cua cursor state reports enabled/positioned; visual animation is not independently confirmed.
- Cua's structured elements diff currently returns a vendor typed-output mismatch. A full fresh
  read succeeds. The broker retires private lifecycle names after Stop, cleans its Cua session
  even after fallback, detects required permission failures and rejects an observation whose
  backend receipt names another process/window. The opt-in live harness is
  `test/desktop-control-live-ui.mjs`; it never operates a production app window.
- Native **135/135** units pass, including disk thumbnail persistence/account separation. Phone
  browser and native-chat/back/pinch UI pass. iPad new-tab/pinch, black status-area geometry in
  portrait/landscape and app reactivation pass. Its screenshot contains actual cached page pixels
  below a clean black system strip. The later browser-capture rate/visibility guard still needs
  a targeted rerun. Physical layout/app-switcher appearance are not inferred from simulators.
- Twelve synthetic updater tests cover prior chat event prefixes/configuration, queued new input,
  per-volume copy budgets, Linux lowercase executable lookup, settled-turn handoff/dedup/rollback,
  and releasing ordinary work from a verified app after an attention state. Real signed helper
  shutdown/restart/rollback and original-provider continuation remain required.
- Linux package metadata declares desktop/chat protocol handlers; initial/second-instance callback
  arguments use the same strict desktop callback route as Mac. Actual registration, launch,
  packaged helper and final Linux reruns remain owned by the authorized Linux chat.

## Later acceptance and candidate preparation

- Full runtime checks pass **812/812** before the subsequent Codex MCP approval regression;
  static checks pass. Real document UI retains reading position through switching, selected
  refresh, another feature's refresh and app restart. Bulk UI preserves a failed item's selection,
  retries its fresh owner revision, opens the moved document at its original authorized source,
  and closes selected browser/document views without loading hidden pages or deleting files.
- iPad status/cache/pinch/rotation/reactivation acceptance passes after explicitly binding the
  generated test runner to its actual disposable fixture ports. Arbitrary test-runner environment
  forwarding had let a prior run use the wrong fixture origin; the helper now builds for testing
  and sets each generated target's environment before execution. Physical-device acceptance remains.
- Finder-style desktop-control discovery now checks standard user and platform installation
  directories even without a shell PATH; explicit executable overrides remain authoritative.
- **Real Codex image delivery passes** with the refreshed default model: Cua observes only a
  disposable window, the real provider reads a random token drawn solely in its canvas, and
  Proteus records actual provider usage. The installed Codex runtime accepted dynamic image result
  fields but its model reported no screenshot. Native desktop tools therefore use fresh MCP image
  blocks on new as well as resumed Codex chats. Its native MCP tool-approval elicitation now routes
  through Proteus's exact existing permission check, consumed once by the host wrapper. Denial,
  replay and turn-end cleanup are covered. Other provider/platform results remain separate.
- A helper-capable **test baseline** is signed privately for disposable supervisor acceptance;
  it is not an installation artifact. Production installations are unchanged. Version metadata is
  advancing to 0.2.26 / native 2610.19.1; freeze/sign/install acceptance remains pending.
- Website desktop-client provisioning needs the existing signed-in administration tab. Automatic
  review rejected creation of a new hidden admin tab; no administration action ran. The operator
  was asked to expose the existing session. The restricted deployment route remains separate.

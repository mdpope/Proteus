# Agent handoff

Proteus is a local AI scheduler and resumable conversation client. The Mac owns execution,
authorization, files, sessions and browser profiles. iOS is a remote client. A relay transports
encrypted traffic and cannot execute work. organization workflows and other workflow repositories own their policy
and manifests; this repository owns the generic app and provider adapters.

## Latest release state

Build Mac and HC now run `17719ea`, including the empty-peer startup fix, message actions,
and visiting-device history metadata. Personal verified all 104 runtime hashes, signing,
13 tabs, three incoming pairings and existing account/data preservation. HC independently
verified 104 hashes, three tabs, three incoming pairings, five disabled schedules and nine local
chats; its relay and all three providers are healthy, with no startup Keychain prompt at that
preflight. Personal → HC is now paired and saved; the desktop shows `workstation.example.test` online and
its Chats count increased from five to fifteen. HC → Personal remains blocked by Keychain
access. The operator approved both final pairing clicks, but that does not establish completion
in the blocked direction. A valid Apple Development-signed artifact of exact runtime `17719ea`
was prepared and privately transferred; HC still runs the ad-hoc-signed installation and awaits
natural completion of its active job before a guarded update. Read `release-validation.md`
for receipts and `chat-rendering.md` for speech behavior.

Both physical iPhone (05:20 UTC) and iPad (05:21 UTC) now run the native build from `1101c3c`,
installed in place with the original signer/team/profile, all 25 native inputs and six Markdown
resources verified. The update includes device-local chat timestamps, authenticated Mac-name
refresh, localized history with visiting-device metadata, and the native browser tab/toolbar
improvements. Four app-data files and preferences stayed byte-identical before launch on each
device; both destination identities and selection survived, and launch/process checks passed.
Both physical clients subsequently refreshed saved Mac names from authenticated host metadata.
At 05:22 UTC, Personal's API observed both phone and iPad online; the closed website client was
offline. Physical iPad shared-Team account consent remains unverified. The operator already
authorized the normal same-account consent flow at Proteus → Team → Connect shared Team tools;
installation and relay connectivity do not establish that acceptance.

Website release `20261005T060541Z` is now live, including navigation fix `7975f77`. All 9,209
manifest files matched; schema, runtime configuration and nutrition counts/hashes are unchanged.
The 06:40 UTC audit passed all 14 endpoints. Activation used the existing authenticated in-app
File Manager upload and guarded updater with the approved supplemental recovery gate; SSH key
unlock remained unavailable locally, and no authentication settings changed. The verified
`050326` recovery and previous `051822` code release remain retained. Supplemental verification
matched all 18 protected tables to exact captured SQL without production writes or a live-state
stability claim. Private receipts remain in the deployment workspace.

Live Chats now verifies All Macs with both authorized hosts, authenticated names and records,
all search/destination/provider/status/workspace/schedule/date filters, no inner chat navigation,
and the main New Chat control. The eight-member Standup list was also verified; private names
stay outside Git. Default Mac selection has not persisted: timed-out UI clicks left Choose
explicitly after reload, with no JavaScript errors. This is pending preference acceptance, not
evidence that either Mac is offline. Build Mac remains locked awaiting operator unlock.

The earlier 05:39–05:41 UTC MariaDB window is fully classified: all 664 entries concern the
known `mysql.column_stats` histogram-definition mismatch. The new 06:38–06:40 window needs its
own classification, including 7,145 MariaDB entries and one Apache error during the expected
`.env` probe. Laravel remained empty. No all-clean server-log claim is made. Personal shared
scopes and same-account endpoints are healthy; its legacy roster was empty. Historical uploads
before visit-metadata activation are not claimed to have retained those optional fields.

The HC startup fix avoids unnecessary protected-storage access when no encrypted outgoing
state exists. The underlying Keychain item authorization/ACL problem was never modified or
proven repaired: the password unlocked login Keychain, but item authorization previously failed
even with physical input. No Keychain item, password or access rule was changed. App-only
rollback was prepared but not performed after recovery. See `credentials.md` for the boundary.

Disposable Mac tests now use a mock Keychain, isolated from real credentials; production launches
do not. Website account-persistent Mac enrollment still needs the recorded trust/custody review.
Web Push is configured with an active worker; APNs and real push delivery remain pending.
Multi-provider work is deferred. Workflow owners and schedule enablement remain unchanged.

## Read first

1. `AGENTS.md`: invariants and validation expectations.
2. `README.md`: setup, configuration locations and operating behavior.
3. `docs/architecture.md` and `docs/decisions.md`: boundaries and why they exist.
4. `CHANGELOG.md`: recent changes; `docs/planned-updates.md`: the remaining backlog.
5. The feature document relevant to your change: `providers.md`, `schedules.md`, `permissions.md`,
   `context-loading.md`, `workspaces.md`, `browser.md`, `credentials.md`, `chat-rendering.md`,
   `remote.md`, `web-remote.md`, `mobile-destinations.md`, `transcription.md`, `omi.md`,
   `terminals.md`, `markdown-picker.md`, `life.md`, or `apple-build.md`.

Git and merged PRs are the implementation history. These documents explain behavior and decisions;
they do not replace reading the relevant module. Update them when behavior changes. Never assume
that a previous conversation is available to the next agent.

## Code map

| Area | Entry points |
| --- | --- |
| Authenticated loopback API and lifecycle | `src/server.js` |
| Schedule validation, disk reads, revision conflicts | `src/schedules.js`, `schemas/schedule.schema.json`, `src/cli.js` |
| Serialized AI turns, independent native job lanes, snapshots and journal | `src/engine.js`, `src/turn-waiter.js` |
| Provider execution, model capabilities and refresh | `src/copilot.js`, `src/codex.js`, `src/claude.js`, `src/model-catalog.js`, `src/usage.js` |
| Workspace context, source delivery and tool scopes | `src/context.js`, `src/agent-tools.js`, `public/context-plan.js` |
| Live tool grants and workspace authorization | `src/permissions.js` |
| Mac forms, tabs, chat and shared controls | `public/app.js`, `public/features.js`, `public/conversation.js` |
| Tool event normalization and rendering | `src/tool-activity.js`, `public/tool-presentation.js`, `ios/Proteus/ToolActivityView.swift` |
| Shared Markdown | `src/markdown-renderer.js`, `public/markdown/`, `ios/Proteus/MarkdownView.swift` |
| Electron lifecycle, menu bar and browser bridge | `desktop/main.cjs`, `desktop/browser.cjs`, `src/browser-tools.js` |
| Credential fill | `src/credentials.js` (desktop-only boundary) |
| Encrypted remote protocol and relay | `src/remote.js`, `src/remote-crypto.js`, `relay/` |
| Native UI and remote store | `ios/Proteus/`, `ios/project.yml`, `ios/Proteus.xcodeproj` |
| VS Code companion | `extensions/vscode/` |
| Local Mac package | `scripts/package-mac.mjs` |
| Transcription, Omi and native process execution | `src/transcription.js`, `src/omi.js`, `src/local-process.js`, `public/omi.js` |
| Configured-root Markdown picker | `src/workspace-files.js`, `public/markdown-picker.js` |
| Ghostty VT terminal profiles and local PTYs | `src/terminals.js`, `public/terminals.js`, desktop IPC |
| Durable desktop tab descriptors | `desktop/workspace-session.cjs`, `public/app.js` |
| Life and full website application | `src/life.js`, `public/life.js`, `web/` |
| Reproducible Apple simulator builds/tests | `scripts/apple-build.mjs` |

## Safe development and validation

- Inspect branch/status and preserve unrelated edits. Keep changes reviewable; do not overwrite an
  operator's configuration or run an operational schedule as a generic smoke test.
- Use a fresh temporary `PROTEUS_HOME`, `PORT=0`, and a separate Electron `--user-data-dir` for UI
  tests. Packaged Mac smoke tests must also use their test-only mock Keychain switch; temporary
  profiles alone still access the production Safe Storage item. See `apple-build.md`. One process must own each data directory. `npm start` and `npm run desktop` must not both
  run against the same directory.
- Run `npm ci`, `npm test`, `npm run check`. Node integration tests bind localhost and need that
  permission in a restricted execution environment.
- Model settings: `node test/models-ui.mjs`; chat presentation: `node test/chat-ui.mjs`;
  permissions: `node test/permissions-ui.mjs`; context: `node test/context-controls-ui.mjs`.
  These use disposable data and synthetic content; do not substitute the real application home.
- Sidebar visibility/collapse and whole-tab activation: `node test/sidebar-tabs-ui.mjs` uses
  disposable app data and a real isolated restart. `appearance.showProviderUsage` is the Setup
  feature flag; `appearance.providerUsageCollapsed` independently retains the compact sidebar.
  Both save immediately. Existing hidden preferences are preserved; do not globally migrate them.
- Native UI: start `node test/mobile-host.mjs`, then use the checked-in Xcode project and an
  available simulator (`xcrun simctl list devices available`). Run the relevant `ProteusTests`
  and `ProteusUITests`; fixture ports 4328/4329 must be free. Stop the fixture afterward.
- If Markdown sources change, run `npm run markdown:build` and commit the generated bundle.
  If Xcode file/target membership changes, run `npm run ios:generate` and commit the project.
- Build the local Mac bundle with `npm run package:mac`. See `docs/mac-app.md` before installation.
- Before restarting the operator's Mac host, check for active or waiting runs. Stopping an active
  host interrupts those runs. Verify the app and remote connection after restart.
- Describe exactly what was tested, with simulator versus physical-device results distinguished.
  An iOS simulator build does not install the update on an iPhone or iPad.

## Durable state and known limits

App data lives outside Git. Inspect the configured home rather than assuming paths from another
machine. `connection.json` contains a local API bearer token: never print or commit it. Browser
profiles, pairing secrets, provider credentials, private instructions, and real run records also
stay out of commits and test fixtures.

The host serializes AI turns. Each of the three managed Omi native jobs has its own serial lane,
so native control work is not blocked behind transcription or an AI chat. It stays alive after window closure, but quitting the
app or sleeping/shutting down the Mac stops execution. There is no detached always-running daemon.
Existing chats retain schedule snapshots; editing a schedule affects future runs. The composer can
change next-turn model settings in that same chat, retaining the initial snapshot and change history. Updating
a chat's context is explicit; authorization changes apply during active turns. A completed AI
turn does not certify completion of the external workflow.

An organization workflows source manifest is not the same format as the exported Proteus schedule. Export/reconcile
through that repository's supported client workflow; see `docs/schedules.md`. Do not bake organization workflows
paths, ownership or private prompts into this app.

Native signing is machine/account configuration, not repository configuration. Use an appropriate
Apple team on the installation Mac. Do not revoke or recreate certificates as an automatic fix;
coordinate signing across machines. Remote pairing is separate from Apple signing.

See `chat-controls.md` for queue/steer semantics, `mcp-auth.md` for sign-in recovery, and `providers.md` for Codex/Claude compatibility limits. Physical iOS installation remains an explicit operation on the operator’s designated signing Mac; simulator verification does not update devices.


## October 4 — cross-client parity implemented; release acceptance in progress

The operator authorized building the queued scope, accepted Engine Room, removed the tagline,
confirmed roster/URL storage is permitted, and explicitly deferred multi-provider implementation.
Read `parity-release.md` and `ios/PARITY-VALIDATION.md` for code/tests/deployment distinctions.
The current signed native build preserves original signing and requires an unlocked-device update.
Its existing profile lacks APNs entitlement. Native shared tools require new app-scope consent;
old Life credentials are preserved until successful same-account reconsent.

No Omi owner, schedule execution gate, provider configuration, or live workflow was changed by
implementation. Source tests are not evidence of production push, actual account Team interaction,
or installed-device acceptance. Keep those pending until receipts below establish otherwise.

## October 4 daytime continuation — API-only Life and account destinations

The website account-destination release `20261004T175555Z` is deployed with one additive
migration, fresh verified restore point, exact manifest parity and unchanged nutrition hashes.
The operator's Safari profile loads the new account persistence UI. Live enrollment of both Macs
remains pending explicit confirmation of encrypted connection-key custody on the website server;
do not copy nonexportable browser keys or claim an empty browser's connection is fixed.

Build Mac now runs API-only desktop Life and the operator completed website sign-in. The app
reports ready website-api mode; native food pages show 25 items, 219 total, and next-page reads.
The legacy database configuration is archived exactly and never opened by runtime Life. All seven
tabs, three pairings, settings and disabled processing gates were preserved/restored. A migration
visibility bug and idle HTTP shutdown hang were found during acceptance and fixed with regressions.
The Transcription sidebar now uses Omi iCloud's waveform convention. Connected Setup spacing and
pending-auth feedback are installed; final restart verified the same ready API account, seven tabs,
three pairings and graceful shutdown. Native screen capture was unavailable for the final spacing
screenshot; narrow/wide source UI checks passed. See `release-validation.md` for exact evidence.

The authorized HC coordination chat has also installed runtime `68463db` and verified exact
parity, clean restart, shared relay, three pairings and unchanged tabs/settings/five schedules.
Life stays disabled there; no account keys or peer grants were created.

The iPhone was updated in place with the original identity. Its two destinations are correctly
named Work Mac and Build Mac, and its selected Build Mac authenticated connection
was observed online. Life sign-in on that physical device remains unverified. The latest iPad
build is still deferred. No Omi app, recording or processing owner changed.

Final software coverage: 232 Node tests, static checks, 68 Laravel tests/574 assertions, ten
API-backed Life UI groups, 20 web remote groups, seven account/protocol groups and focused real
restart checks. Signed-package launch/catalog passed. These results supersede earlier locked
Build Mac/iPhone installation holds, not the deferred iPad or account-enrollment acceptance.

## October 4 continuation: shared web shell, native mobile Life and desktop peers

This is the current status and supersedes the deployment/pairing statements below. The website
release is live; new Mac and mobile source is implemented and validated. At this checkpoint the
new native builds are prepared, but their in-place installation is pending the unlocked-device
acceptance step. Do not infer installation from a build or simulator test.

- Website uses shared desktop dark theme tokens, responsive sidebar and persistent section tabs.
  Existing account-scoped browser pairings to both Macs survived and each connected after release.
  Website provider meters request quota from the selected host and obey its visibility flag;
  older hosts correctly show unavailable until their provider-usage bridge is updated.
- Production release `20261004T083033Z` matched 9,193 manifest files. A freshly captured recovery
  set was restored into an independent database and verified before deployment. Existing native
  schema-v2 ledgers were checked read-only, and the reviewed additive Laravel migration registered
  them without altering original schemas or nutrition records. All three nutrition pre/post hashes
  and counts matched. A public native PKCE client is configured; it grants no account access alone.
  HTTPS/redirect/authentication/relay checks passed. The only new Apache error was the expected
  protected `.env` denial from the security smoke test. Private receipts/backup details belong to
  the separate domain operations project. Two earlier preflight file-access failures retained the
  old active site and changed no database; the canonical helper now runs a private verified copy.
- Desktop Life has richer Garage/fuel/oil cards and fixed complete-day nutrition periods alongside
  custom date filters. Original food-version references and scoped evidence remain intact. Mobile
  has native views and typed forms for the same Life account, direct website PKCE/MFA sign-in,
  Keychain credentials and retry-safe mutations. Life defaults hidden on mobile until **App setup
  → Show Life**; its account is independent of the selected Mac. Real per-device Life consent and
  production record interaction remain unverified until normal operator sign-in.
- Mobile usage comes from the connected Mac. Exact legacy **My Mac** labels hydrate from that
  authenticated host; custom names stay unchanged. The operator corrected both existing mobile
  relay addresses and confirmed connectivity. Both physical devices were then independently paired
  to Build Mac, with their previous Example Organization destination retained. The two-entry indices
  were read back and verified. Pairing keys were not extracted.
- Desktop can separately pair as a client of other Macs. New Chat defaults to This Mac every time;
  remote selection reloads that Mac's workspaces, folders, agents, skills, instructions and provider
  metadata, clearing prior selections and blocking Start while unavailable. Remote commands never
  fall back locally. History tabs put This Mac first; replies, approvals and pending-answer drafts
  are scoped to host/run/request. Peer keys stay in native safeStorage. Fresh desktop control
  pairing is distinct from already-approved website/mobile pairings and remains pending operator
  confirmation. No production desktop peer was silently added.
- Browser history now persists URL/title entries and index across actual restart; form/POST state,
  agent grants and common authentication callback URLs are excluded. Hold or right-click Back/
  Forward for a native history list; stale menu selections cannot jump an unrelated entry.
- Independent review reproduced and fixed cross-host pending-answer draft transfer and invalid
  cross-provider model/default inheritance before packaging. Final destination UI tests include
  both cases. Mobile's first Markdown layout now explicitly reports its height so rich content
  appears without relying on a deferred ResizeObserver; subsequent height updates still work.

The independently managed work Mac subsequently installed runtime `14b9819` through its owning
chat and verified actual restart. All 91 runtime files matched; shared relay is online with no
errors. Its host identity, three pairings, two tabs and five schedule files were preserved. Life
remains off, no desktop peer was created, the primary checkout was untouched, and the old relay
and an app rollback remain available. The local Build Mac and physical mobile installation
holds above are still in effect; do not apply the work Mac result to them.

Validation: 212 Node tests and static checks; 59 Laravel tests / 409 assertions; 15 desktop-peer
UI groups plus three peer backend/persistence tests; 17 website remote groups; 12 website shell
checks; 13 actual-restart/history-menu groups; 15 native desktop Life groups. Native mobile has
17 focused iPhone tests (9 destinations, 5 Life, 2 usage, 1 Markdown), 16 core iPad tests, Life and
usage UI on both layouts, mobile opt-in and final pairing/start/reply/rich-code UI regressions.
All test records are disposable. Signed universal mobile build uses the existing identity/profile
and expires October 10, 2026; distribution renewal remains separate. Mac package verification
checks the overall signature, Copilot vendor identities, launch and live catalog.

Current devices became passcode-locked before deployment. Automatic approval review rejected the
physical iPhone/iPad update while locked; do not bypass it. Both signed packages passed final verification; runtime source is frozen at the reviewed feature
commit. Resume only after unlocking, privately
copy and compare each app's destination index/encrypted caches, install in place without uninstall,
then independently verify process/reconnection. The Mac was also locked at the UI check; no active
or waiting runs or terminal shells were observed. Automatic approval review separately rejected
the prepared Mac in-place update while locked as well; do not retry until the operator unlocks it. Preserve its six existing tabs and active
selection during the eventual graceful update. Source and signed packages do not certify actual
installed UI acceptance. Update this checkpoint with precise receipts after deployment.

Projects remain explicitly on hold. Multi-provider delegation remains a design proposal, not an
executor. Original Omi services and Codex schedules remain the processing owners; all five Proteus
replacements remain paused and both execution gates off. The earlier native policy repair timed
out without changing configuration and must not be retried automatically.

## October 4 continuation: Transcription, terminals and remote clients

This section supersedes earlier deployment/timeout statements below. Desktop and physical mobile
updates are installed. Life is active and verified through the installed app; processing ownership
handoff remains held as noted.

- Transcription now separates **Omi** from **private notes & MacWhisper**, with independent execution
  gates and ordinary schedules. Existing five IDs/history remain compatible. Both general schedules
  verify their installed Codex definition against canonical operator workflows manifests, attach explicit policy
  paths, and reject changed/replayed source snapshots. Policy remains in operator workflows; organization workflows is unchanged.
- Fresh observation found all three native LaunchAgents loaded and both source Codex automations
  ACTIVE with canonical parity. Native/general gates and takeover confirmations remain false;
  all five installed replacement schedules remain paused. No processing owner was changed and no
  live transcription workflow ran through Proteus. Existing native semantic retries were traced to
  missing files in the configured independent organization workflows policy checkout; personal policies are present.
  An independent canonical policy checkout is now prepared and verified. A path-only repair was
  attempted under native maintenance locks, but the 300-second drain timed out while original
  audio/MacWhisper work was active. No configuration changed and no worker was interrupted.
  Retry the reviewed repair after a safe idle window; native cutover remains held. Installed replacements were
  refreshed while disabled, with canonical fingerprints on both general jobs and a private rollback
  snapshot. See `transcription.md` for scope and cutover.
- Installed-host Codex is now healthy. A forced catalog refresh returned seven models, including
  both transcript workflow models. Two bounded synthetic turns through the already installed signed
  host verified exact selected instructions, no echo of an unselected disposable AGENTS marker,
  no tool calls, native continuation, and observed usage. A subsequent single-file disposable check
  also verified a real native write approval, one-time approval reply, and exact written content.
  Neither test selected operational vault content. This does not certify transcript filing,
  permissions for real workflow tools, or exclusion of every global instruction source. No runtime,
  security, global AGENTS, source automation or operational vault change was needed to recover it.
- Markdown browsing includes every configured workspace main/additional root, shared repository
  and every-chat folder, with **All folders** navigation. Revoked/retargeted roots are checked again
  on every operation. Folder creation and filenames remain relative to the selected nested folder.
- Interactive terminal tabs use Ghostty VT WebAssembly and local PTYs. Profiles support shell,
  command, starting folder, font and theme; a read-only native Ghostty import maps supported keys.
  Trusted main-frame desktop IPC is the only terminal control path. Tabs retain live shells across
  navigation; process restart restores descriptors with explicit **Resume new shell**, suppressing
  saved startup commands. Renderer failures offer **Reconnect view** without launching a second shell.
- Desktop session restoration now covers tab order/active selection, chats, schedules, feature tabs,
  Markdown and private browser views. Browser native horizontal gestures navigate history while
  preserving horizontal content scrolling; pinch updates bounded zoom. See `browser.md`.
- Website code has been deployed with Proteus remote views. The relay is an independent encrypted
  transport service; live TLS, two-host packet routing and host-isolation checks passed. No nutrition
  migration or production database schema mutation was part of that code deployment. Real paired
  browser/mobile end-to-end usage remains distinct from transport and synthetic client validation.
- Native Life backup restoration verification and the separately approved additive version-2 upgrade
  have completed. Core table schemas/row hashes and the nutrition digest remained unchanged; only
  two native audit ledgers were added. All seven database-referenced original evidence files were
  read and hash-verified through approved SFTP. Keychain access approval is complete. The installed
  app reviewed schema v2 with no migrations, enabled Life, and read all seven sections through its
  actual Keychain resolver and SSH route; activation changed no database records. No production
  evidence upload/test record was created. The four new deployment credentials were explicitly
  approved, saved to the authoritative vault, and verified by exact-content retrieval after sync;
  private item references remain in the website operations project. Personal and work hosts retain
  independent pairing keys, caches and permissions. Both Mac relay hosts are online. The signed-in web client is paired with the personal host and
  has read its schedules; the work host’s separate browser invitation requires its local approval.
  Existing work-host mobile authorizations and its previous container remain available for rollback.

- Live installed Claude allowance now resolves through the authenticated bundled Claude Code
  `/usage` path. Both five-hour and weekly percentages and the available weekly reset were verified
  in the installed UI; missing reset timestamps remain explicitly unavailable. Usage observations
  stay outside Git. Provider metadata still governs available models/effort/speed.
- Both Mac hosts now run the tested usage/tab/relay-editor source revision. The local signed app
  matches all 75 runtime assets, restored five tabs including its terminal descriptor, and retained
  Life and relay connectivity. Collapsed green meters and the Setup feature flag persist separately.
  The work host’s owning chat confirmed its in-place update, restored tabs, unchanged identity,
  both pairings and schedule files, intact Copilot vendor signatures, and online shared relay. Its
  Life feature remains off. The separate work-host browser pairing still awaits local approval.
- Native Manage Macs now offers **Edit relay**, preserving the Mac identity, pairing credentials,
  history and drafts. Eight destination tests plus edit/restart UI checks passed on both iPhone and
  iPad simulators; a synthetic relay verified same-key reconnect.
- The development-signed Mac update restored the existing four tabs and active private browser tab.
  Both physical iPhone and iPad were updated in place and independently observed running. Pairings
  and encrypted cache migration were preserved; real relay commands were not dispatched from them.
  Omi capture applications and their recordings/bookmarks were untouched. See `apple-build.md`.
- Codex Trusted/Autopilot now use exact currently granted canonical workspace roots with no network
  or implicit temporary-directory writes; Ask/Custom remain read-only. Revocation interrupts the
  native turn. Shell approvals remain separate, so this does not establish unattended transcript
  execution. No permission mode or saved operational command rule was changed.

Validation: 199 Node tests and static checks passed. The sidebar/tab regression check passed ten
groups including settings persistence across actual restart, compact meters, and whole-tab selection. The native Codex sandbox smoke test verified
writes to two selected roots, denial of sibling/symlink escapes and network access, and native
approval settings. The full desktop shell passed 21 groups; the signed Ghostty terminal check
passed eight groups including reconnecting a failed renderer to the same PTY. Eleven browser/tab
checks cover restart, transition lifetime and bounded pinch behavior; physical trackpad feel remains
unverified. Signed packaging preserved Copilot vendor bytes/signatures. The production website's
49 Laravel tests (276 assertions), 17 remote protocol checks and 11 browser checks passed before
deployment. Native Life has 19 backend and 14 renderer checks; actual database reads and original
attachment hashes and installed Keychain-backed Life access were separately verified. Real mobile use through the new relay and processing cutover remain outstanding. The work-host
relay cutover is confirmed by its owning chat; its browser pairing is still awaiting local approval. The earlier credential-approval blockers are resolved.

## October 3: Omi, native Life and Claude expansion (earlier snapshot)

- Synced the Source checkout to upstream `1f61b9b`; work is on `codex/omi-life-claude`.
  The separate Mnemosyne checkout is unchanged. Its full 263-file Laravel application is
  incorporated under `web/` with Proteus branding, retaining original migration contents.
- Omi has Overview, Schedules, Runs, Logs and Settings in a persistent tab. Three native
  schedules and two imported Codex transcript schedules use the normal scheduler. All five
  are paused in this Mac's private app data and the global execution gate is disabled.
  No Omi processing was run through Proteus. Three original LaunchAgents and two original
  Codex automations retain ownership. Native capture/mobile review remain separate.
- Life is now native local UI, not a website tab or iframe. Setup explicitly enables the
  feature and installs a local SQLite database or validates a private existing connection.
  Life is absent from navigation until enabled and configured. Versioned, reviewed upgrades
  preserve food versions and nutrition records; existing remote connections default read-only.
  See `life.md` for data scope, schema handling, evidence storage and server-only limitations.
- Live database preflight authenticated SSH but found forwarding to MariaDB administratively
  prohibited. No production SQL was executed. A dedicated read-only access route is awaiting
  operator approval. No production website, nutrition record, schema, relay or server access
  configuration was changed. Do not activate an unverified profile or infer principal IDs.
- Life/Omi tabs survive navigation and reload. New tab actions are icons in the tab strip.
  AI allowance uses hideable green meters with centered percentages and detailed resets.
  Markdown supports configured workspace roots, subfolders and new folders without requiring
  a full path; modal dialogs hide native browser views and reopening a file refreshes it.
- Claude subscription authorization completed. The installed app's bundled runtime returned
  12 models and completed two synthetic turns with native session continuation and observed
  token usage. Runtime speed metadata reported fast mode unavailable. Rate-limit events
  supplied a reset/status but no utilization; the allowance percentage remains unavailable.
  This is distinct from successful model execution and per-turn token accounting.
- The Claude `kill EPERM` crash is fixed: cleanup catches denied group/child termination,
  reports unconfirmed termination and prevents overlapping discovery/turns. Desktop quit
  catches asynchronous cleanup rejection. Regression checks exercised both failures.
- The Mac bundle now uses the existing Apple Development identity, keeping its designated
  requirement stable across updates while preserving GitHub's vendor signatures/bytes.
  Installed-host Codex still timed out during startup file access after earlier macOS iCloud
  approval; direct runtime/node-mode catalog and usage probes succeeded. A new signed-app
  permission prompt, if shown, must be granted by the operator. Global AGENTS exclusion from
  the actual model prompt remains unverified. Do not claim all providers are live on this host.
- Validation before the latest native-Life refinement: 140 Node tests, static checks, isolated
  Electron integration, shutdown regression and package checks passed. All 45 Laravel tests
  passed (251 assertions), Vite/Pint passed, and synthetic desktop/mobile web checks exercised
  nine protected routes. The latest full regression and package result is recorded below.
- iPhone and iPad simulator builds passed. Four native unit tests, all six iPhone UI cases
  (one corrected and rerun), and three targeted iPad UI cases passed. Proteus was installed
  in place on the unlocked iPhone and launched, independently confirmed by process inventory.
  Its encrypted cache remained byte-identical, pairing was retained, and remote reconnection
  was not newly verified. Signing reused the existing certificate with a command-line team
  override; no project-signing setting changed. Profile expires October 10 at 17:29 MDT.
  Physical iPad installation is deferred at the operator's request. See `apple-build.md`.

Final native-Life validation: 164 Node tests and static checks passed; the full Electron shell
passed 20 check groups and the native Life renderer passed 13 checks against disposable SQLite.
The cleanup-failure shutdown regression passed. The development-signed Mac bundle passed its
isolated launch, identity, vendor-signature and byte-preservation checks. All 64 runtime source
files matched the bundle. Installed and launched the final app in place with a rollback copy;
authenticated health confirms zero active runs, Life off/unconfigured, all five Omi schedules
paused, and all three native Omi owners loaded. Copilot reports 19 live models and Claude 12;
Codex still reports its startup timeout. This does not certify live MariaDB or Omi cutover.

At that earlier validation point, live Life access and website/relay deployment were pending. See
the October 4 continuation above for their newer status. Keep the encrypted relay as an independent
supervised service; Docker is optional packaging, not a protocol requirement.

## Previously validated update: chat controls and second provider

- 99 Node regression tests and static checks passed.
- Mac compact-composer, rich-chat, model-picker, browser/control, and packaged launch/signature checks passed using
  disposable data. Draft preservation, queue removal, scrolling, per-provider options and privacy
  toggle behavior were exercised.
- Live Codex synthetic tests verified selected instructions, unselected AGENTS exclusion, native
  continuation with model changes, runtime usage, dynamic browser-tool dispatch and steering during a tool call.
- iPhone simulator: four native tests plus five UI tests passed. iPad simulator: expanded tool
  output and model-capability UI tests passed. No physical-device install or signing changes.
- Copilot OAuth API/command tests verify native delegation and no authorization URL in transcripts.
  Real corporate consent/sign-in is an operator step; report its actual status rather than equating
  browser opening with authenticated tool access.

## Authentication and live-control regression checks

- `node test/mcp-auth-ui.mjs`: synthetic pending sign-in, persistent feedback, automatic connected
  state, sign-in during a slow background check, stable controls, connected-button removal and
  polling cleanup after closing the dialog.
- `node test/chat-ui.mjs`: streaming with a focused permission selector, stable composer/detail DOM,
  queued drafts and independent scroll positions. `node test/composer-ui.mjs` covers next-turn choices.
- `test/packaged-mac.mjs` must validate both Copilot vendor signatures and unchanged binary bytes.
  An app-level ad-hoc signature alone does not prove that provider Keychain identity was preserved.
- iOS `testMCPConnectionRefresh` uses the synthetic mobile host; it never performs real OAuth.
  A live provider status check after installation verifies whether prior authorization survived restart.

Validation for the signing/status/scrolling update: 99 Node tests and static checks passed; Mac
authentication-feedback, chat interaction, composer and packaged-app tests passed. The native MCP
status UI test passed on both iPhone and iPad simulators. The installed Mac build restored existing
selected MCP connections after a cold restart, with no new Keychain prompt observed during the
check. Physical-device installation remains separate.

## Proposed next capability: multi-provider workflows

The operator requested a design for schedules/chats coordinating agents across provider accounts,
with provider-specific company-system access and allowance-aware routing. Read
`multi-provider-workflows.md`. No orchestration, account policy, cross-host delegation pairing or
connector grant has been enabled. The current engine still serializes AI runs; changing that safely
requires explicit parent/child capacity, adapter isolation, data-transfer policy and recovery work.

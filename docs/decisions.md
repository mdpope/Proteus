# Design decisions

These decisions describe implemented behavior. Proposed work belongs in `planned-updates.md`.

- **Host identity and display names.** A stable host UUID owns credentials, chat identity and
  execution routing. Each desktop supplies its configured display name through authenticated
  state. Clients refresh that name without re-pairing; labels never select an authorization or
  imply a special personal/work category. Failed metadata persistence preserves existing keys.
- **One website destination lookup.** Account-backed records take precedence over browser-only
  legacy pairings. All sections share that lookup; absence of a default or credential is not
  evidence of an offline Mac. This does not migrate nonextractable keys or widen account trust.
- **Native device-zone chats.** Mobile chat timestamps follow the viewing device’s time zone,
  including DST and live zone changes. Shared account defaults cannot force UTC on native chats.

- **Mac execution with remote clients.** Provider credentials, tools and browser sessions remain
  on the Mac. iOS sends authenticated encrypted commands through an opaque relay. This preserves
  access to local workspaces and avoids replicating execution environments on mobile devices.
- **Independent app and workflow repositories.** Proteus owns generic formats and UI. organization workflows and
  other operating systems own their schedules, workflow instructions and validators. Source-owned
  schedules are exported into the local store; opening the editor never executes repository code.
- **Plain JSON and revision checks.** Schedules remain AI/editor-friendly. Reads use the current
  file, writes validate and atomically replace it, and stale edits fail instead of overwriting
  changes. Run snapshots keep past conversations reproducible.
- **One host and serialized turns.** A process lock prevents competing runners for one data home;
  the engine avoids concurrent sessions and overlapping runs. Parallel execution is deferred
  until provider/client lifecycle and permission isolation can support it reliably.
- **Provider-owned capabilities.** Clients use normalized live metadata for models, effort and
  context tiers. No model-name-specific limit table exists. Unsupported saved settings remain
  visible and fail explicitly at execution. Missing metadata stays unknown; provider defaults
  are not inferred from another editor's UI. See `providers.md`.
- **Explicit context and authorization.** Source discovery is separate from selection and folder
  access. Managed sessions disable automatic Copilot instruction/config discovery and provide
  captured context. Favorites do not grant permissions or activate disabled MCPs. Permission modes
  and individual grants are distinct and can resolve waiting tools in a running chat.
- **Shared rich content, native shells.** Mac and iOS render Markdown from the same bundled code.
  Tool calls are separate expandable activities with status, progress, inputs and outputs. Internal
  reasoning is not displayed. Raw HTML/scripts in model output are not trusted.
- **Visible bounded browser automation.** Electron hosts shared website tabs; a per-tab Playwright
  bridge exposes only the broker's allowed operations. Remote sites cannot access app IPC.
  Bitwarden credential fill stays an explicit desktop action outside the agent tool boundary.
- **Local Mac packaging first.** The local .app uses the existing iOS artwork and a stable Proteus
  bundle identity. Local ad-hoc signing requires no Apple certificate and is not notarized
  distribution. Developer ID signing, notarization and update delivery remain separate work.

- **Native provider processes, common UI.** Codex uses an app-server adapter with explicit context;
  Copilot uses its SDK. Model metadata remains separate. Tool restrictions unsupported by another
  provider are refused rather than silently widened.
- **Queue versus steer.** A queued message is durable future work and runs only after success;
  steering targets one active native turn. Delivery acknowledgments are distinct from completion.
- **Mac-owned OAuth.** Connection recovery invokes the provider's OAuth client. Corporate sign-in
  opens on the Mac even when requested from iOS, keeping loopback callbacks and tokens on the host.

- **Message-scoped model choices.** The composer captures settings on submission. Queued messages
  retain independent choices, applied only when their turn starts. A steering request never mutates
  a running model. This avoids a late dropdown change altering already queued work, while preserving
  the native conversation and audit history. The source schedule remains unchanged.

- **Retain vendor signing identity.** The local Mac shell may be ad-hoc signed, but official Copilot
  binaries keep verified GitHub signatures so provider-owned Keychain ACLs recognize the caller.
  Only the two explicitly verified binaries skip re-signing; missing/invalid vendor signatures fail
  packaging. Credential resets or broader Keychain grants are not a packaging workaround.
- **Stable live controls.** Token/tool updates patch conversation content without rebuilding
  unrelated controls. Authentication status is polled only while its view is open, with bounded
  duration and visible feedback, rather than relying on a transient toast or manual refresh.

- **Observe before replacing Omi.** The app owns scheduling controls, not transcription policy.
  It invokes the installed native runtime through fixed commands and existing locks. A persisted
  global gate plus per-execution ownership checks block manual, queued and resumed work until
  native services are separately unloaded; imported Codex replacements require paused originals.
  Preparing schedules never activates them or modifies their upstream owners.
- **Independent native service lanes.** Each of the three Omi native jobs has one execution slot,
  independent from the single AI-turn slot. This keeps review controls responsive during long ASR
  or semantic work. The native worker still owns file locks and transactional publication.
- **One product, separate trust boundaries.** The full Life web application lives in `web/` and
  retains Laravel authentication, workspace authorization and its existing database schema.
  Desktop opens it in private sandboxed browser tabs, with no app token or preload bridge.
  The Electron bundle excludes web source/runtime; no web database or uploads enter packaging.
- **Relay remains an independent service.** The existing encrypted WebSocket relay only transports
  remote traffic. A later website host may run it behind the same domain/reverse proxy, but PHP
  request handling and nutrition data must not become a desktop command channel. Docker is an
  optional packaging/operations choice; a supervised Node service has the same protocol role.
  No production relay or DNS changes are part of this source integration.

- **Native, optional Life.** Personal records must be explicitly enabled and configured in Setup,
  with independent tabs and local forms. The host connects to SQL through private OS-backed
  credentials; the renderer gets scoped domain records, never arbitrary SQL or database secrets.
  Existing nutrition entries retain immutable food-version references. Schema updates are
  versioned, previewed and protected by backup/integrity checks, not silently run at startup.
  Public-origin authentication and the future encrypted relay remain separate server concerns.
- **Workspace-bound Markdown creation.** The app chooses configured folders and relative names;
  each request revalidates root membership and canonical containment. New notes never overwrite.
  Hide native browser views for the entire lifetime of a modal, including resize events.

### Desktop workspace restoration

Keep desktop tab descriptors in the host's private application-data directory rather than
origin-scoped localStorage: the authenticated loopback port can change across launches. Persist
references only, and recheck current files/features when restoring. Reopened browser views revoke
old agent access. Reopened terminal descriptors do not execute anything until explicit Resume,
which never repeats a startup command. Browser disposal during app quit must not overwrite the
saved workspace with its intermediate empty state.

- **Ghostty VT with desktop-only PTYs.** Use the real Ghostty parser compiled to WebAssembly inside
  the Electron tab, with local node-pty processes owned by the main process. Do not expose shell IPC
  through the remote protocol. Native Ghostty configuration is read-only input for supported profile
  fields. Persist tab descriptors, never automatically rerun a saved command after restart.
- **Independent transcription ownership.** Omi native jobs and general transcript intake/review
  have distinct gates because their current owners and scopes differ. Keep existing schedule IDs,
  verify canonical policy snapshots at execution, and require explicit owner handoff. A successful
  provider turn does not prove guarded workflow publication or downstream context updates.


## Codex workspace sandbox and operation approvals

Native filesystem sandbox scope follows explicit Proteus Trusted/Autopilot folder grants, using
canonical roots and excluding implicit temporary directories and network access. Command approval
is independent: Trusted does not become unattended shell authorization. Ask/Custom retain the
existing read-only sandbox. Before starting a turn, validate the native runtime's resolved policy;
when effective writable roots change, interrupt an active turn before it can keep stale grants.


## Shared clients and direct Life (October 4)

The website reuses the desktop color tokens and encrypted client protocol while keeping Laravel
account authentication and responsive server-rendered Life pages. Electron-only browser views,
local PTYs and OS credentials remain desktop capabilities. Section tabs store allowlisted section
keys, not private titles, queries or record contents. Provider allowance comes from the selected
connected Mac and honors that host's visibility flag; cached/offline values are not live quotas.

Mobile Life connects directly to the website account, independent of either Mac's availability.
Use the existing account, MFA, PKCE S256 and a fixed application callback. Store tokens in Keychain,
keep health records in memory, enforce workspace/account identity on responses and writes, and
reuse the additive native mutation ledger for safe retries. Preserve original nutrition food
versions and all existing data during deployment; an app download never silently upgrades SQL.

A desktop may also act as a separately paired encrypted client of another desktop. Its peer keys
live under macOS safeStorage and never enter renderer catalogs. Every request names the destination;
changing destinations clears old selections and fetches the destination's full live catalog. An
offline/error response cannot fall back to local execution. New chat always defaults to This Mac,
independent of the selected history tab. This feature is human-directed remote control, not
multi-provider agent delegation or a new grant to existing agents.

Projects remain a design discussion. Existing saved multi-folder workspaces continue to provide
reusable folder/context selections; no new folder-independent project schema is introduced.

Browser persistence stores bounded URL/title entries and index, omitting POST bodies, Chromium
page state and common authorization callbacks. Native history menus validate their original
snapshot before jumping, so an open menu cannot apply a stale index after intervening navigation.


## Account destinations and API-only Life (October 4 continuation)

Website destinations are account-owned records, with device credentials encrypted at rest under
the website application key. Authenticated strong-auth sessions retrieve only the selected
destination credential and import it into a nonextractable in-memory browser key. The website
server is a trusted credential custodian; the relay remains an opaque transport. Distinct browser
sockets retain independent challenges, sequences and drafts. Sign-out clears local access but
preserves account enrollment. Explicit removal and Mac revocation have distinct scopes.

All native Life clients use the website API. Centralizing authorization and schema ownership in
the service avoids database credentials and migrations on every desktop. Preserve old profiles
for recovery without opening them. Account/workspace/session identity travels with drafts and
evidence requests; changing sign-in cannot silently retarget old inputs.

## October 4 — queued cross-client product contract

The operator wants one Proteus experience across desktop, website, iPhone and iPad. The
[next-update queue](planned-updates.md) records the requested contract; this entry changes design
scope only. Execution remains desktop-owned; Life and proposed shared Team Tools configuration
use the account API. The relay stays an opaque transport and does not need a second account system.

Use the desktop chat presentation, iPhone chat-bubble icon, website Garage artwork/detail design,
website tab close controls and desktop dividers as the common references. Expand only the active
feature's sidebar children. Chats aggregates authorized host indexes, while the website has an
independent explicit default execution Mac. Aggregation must not retarget actions or merge quota.
Default and temporary destination selection are separate settings; offline never implies fallback.

Team Tools contains Standup, shared named lists/links and a secondary browser-tab strip. Persist
descriptors separately from memory residency; leaving Team Tools unloads its idle browser pages.
Other desktop tabs remain loaded until closed or deliberately unloaded. The proposed Engine Room
contains resources and setup/connection/account controls; its name is provisional. New browser
tabs gain a history home and Google address-bar search plus explicit DuckDuckGo/Google/Bing choices.
History covers retained Proteus visits, not unrequested external-browser history or impossible
cross-origin tracking. Website embedding and exact resource metrics have real platform limits.

Prefer shared feature/text/icon/schema/state modules and contract fixtures, with native adapters
for platform APIs. Do not collapse trusted shell, untrusted browser, API and host authorization.
Before expanded remote authority, resolve account-key custody/session revocation and authenticated
revocation notices. Storing real workplace lists on a personal service requires a domain/policy
decision; reusable schemas belong here, private names/content do not. Account enrollment remains
pending and no prior implementation or deployed acceptance is broadened by this queue entry.
Tagline, section naming and multi-provider release scope remain open for discussion before building.

## October 4 implementation decisions superseding the planning entry

Engine Room is the accepted name and there is no navigation tagline. Team roster/link storage
is authorized by the operator's explicit data-policy clarification. Shared API records are
account-scoped and encrypted at rest; separate app scopes require native consent. Website account
key custody remains a documented trust boundary: MFA protects sign-in, while a compromised website
server could still impersonate a stored device key. Signed host revocation now invalidates that
device at the host; untrusted relay notices only disconnect. Per-session short-lived host grants
remain future protocol work. Multi-provider implementation is entirely deferred.

Website external browsing uses real browser tabs because arbitrary Jira/ADO pages may forbid
embedding. Native Team browser descriptors restore without loading; active pages reload on demand.
Dirty, audible or agent-owned desktop pages reject automatic unloading. Process metrics name their
shared attribution rather than inventing a per-tool memory number. APNs entitlement/provisioning
and production push delivery are explicit release dependencies. See `parity-release.md`.

## October 5 — approved chat presentation and queued shell/composer parity

The operator approved the interactive current-versus-proposed chat comparison. Group consecutive
routine tools and automatic approvals between messages into expandable Activity blocks; retain
paths, commands, results and authorization reasons in correlated detail, with raw audit data one
level deeper. Actionable approvals, failures and sign-in problems remain visible. Add reported
usage/context detail without fabricated metrics. This is design approval plus a request to queue,
not evidence that production rendering changed.

Desktop and web share the conversation presentation. Native mobile shares event semantics,
capabilities and detail availability while retaining condensed formatting and solid message boxes.
Place compact Proteus branding in the tab-bar chrome, using the existing logo/icon artwork. A
minimized navigation rail keeps slightly larger, optically consistent icons and its hover slide-over,
with keyboard/touch alternatives. The mockup's illustrative replacement logo was not selected.

Remote desktop chats should reuse the local composer and normal details layout, using host-owned
model metadata and exposing session/context information read-only. Omit remote Open/Copy path
and context-source changes in this increment. Load earlier history automatically while scrolling
up, without changing the reading position. Retain mobile's expandable detail presentation.

Images and other files can be pasted into a removable composer attachment strip; images open a
modal preview. Attachment delivery stays explicit, provider-capability-aware and bound to the
account/host/chat/message. Pasting grants no additional trust and must not execute file contents.
Implementation and acceptance remain in the single `planned-updates.md` backlog.

## October 5 — generated documents open on demand

Expose clear Markdown document links in chat and open an app document tab only when clicked.
Preserve the originating chat and reuse an existing tab for the same host/file. Do not auto-open
or force split view. Remote viewing is an authorized read-only preview through the owning Mac,
not native remote file Open or context editing. iPhone uses return navigation; desktop/web/iPad
use document tabs. Broader tab organization is awaiting further operator input. Escape explicitly
closes the image-preview modal without closing a chat or cancelling execution. These are queued
requirements; the current local Markdown handler alone does not verify cross-client support.

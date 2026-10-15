## October 14: converge tab metadata without spending retry receipts

Shared-state application and view lookup are observations, not user interactions. Keep the
first known opened timestamp, accept only newer interactions and retain a known favicon when a
client omits it. Preserve authoritative navigation titles while applying owner state. Repeated
no-op observations must converge without mutation receipts. Retry envelopes persist alongside
pending operations; capacity refusal backs off the whole owner, with independent hosts remaining
available. Do not increase limits or erase protected receipts to conceal saturation.

# Design decisions

These decisions describe implemented behavior. Proposed work belongs in `planned-updates.md`.

- **Execution ownership is platform-neutral.** Linux PCs and Macs use the same scheduler/provider
  and encrypted remote boundaries. Host UUIDs own execution, authorization and retry receipts;
  display names and optional authenticated platform metadata are descriptive. Protocol 1 and
  legacy storage/wire keys remain stable; missing metadata never implies macOS or grants access.
- **Shared package verification, separate platform signing.** Mac/Linux use one runtime inventory
  and verify its exact names/hashes, copied package input and complete final metadata/provenance.
  Only the copied PTY is rebuilt for Electron. Mac bundle identity, vendor bytes and signing
  requirements remain separate from unsigned CI and Linux artifacts; no artifact is installed
  merely because packaging or a synthetic check passed.
- **Protected credentials follow the execution host.** Desktop tokens require protected Electron
  safeStorage and refuse plaintext fallback. Explicit legacy administrator profiles resolve
  service/account references using existing Mac Keychain commands or Linux Secret Service;
  secrets stay outside profiles, process arguments, logs and client responses. This does not
  restore direct database access to normal Life clients or migrate credentials between computers.
- **Hosted tests have bounded claims.** CI exercises disposable Linux/Mac packages, website tests
  and an iPhone simulator without production credentials, Apple account changes or installations.
  Synthetic metadata/UI checks do not establish signed package continuity, provider authentication
  or real mobile relay operation.

- **Independent rotating diagnostics.** A dedicated worker owns `logs.sqlite`, keeping up to
  2,000 entries under a separate byte budget. Log retention cannot remove browser history or
  execution retry receipts. Lists expose compact summaries/cursors; individual redacted diagnostic
  bodies are fetched on expansion. Legacy JSON survives as a recovery copy; full diagnostics
  stay on the owning computer rather than entering the generic account-event store.
- **Clicked navigation precedes mirror acknowledgement.** A page click claims its logical
  destination before history polling can acknowledge the old selection. Active loads reject
  stale mirror application; actual commits/redirects reconcile the same entry afterwards.
  Private-URL protection and explicit conflict recovery remain independent of this load guard.


- **Computer-owned browsing history.** Default and named non-private profiles share one worker-owned SQLite store per computer. The account service stores profile definitions and settings; it does not receive new visit history. Matching profile IDs select logical history, never shared cookies or authentication. Replication requires an explicit paired-computer/profile selection.
- **Canonical tab navigation.** Stable entries and a selected-entry ID live on the owning computer. Explicit navigation/traversal/redirect operations commit with durable retry receipts and visit changes. Mirrors do not record another visit. Back preserves Forward entries; a new destination after Back branches. Local unload or an authentication callback cannot remove shared state.
- **Offline ownership stays fixed.** Native outboxes retain their destination computer and event IDs across reconnect and computer selection. Stale navigation cannot overwrite the owner; preserve the local destination for independent recovery. Profile unavailability never silently falls back to Default.
- **History and navigation are separate.** Chronological visit retention does not truncate open tabs' Back/Forward lists. Indexed queries and cursor pages load progressively; native clients cache 30 days and request older days with a day of preload. Legacy originals, deletion tombstones and retry receipts remain intact.
- **Chat identity and placement.** Chat links carry owner and run IDs without authorization secrets. Agent browser placement follows saved workspace association by default; explicit application/workspace/current-chat destinations change placement while preserving the run's existing access boundary.
- **Quick-glance versus file details.** Runtime, usage and approvals remain prominent. Run record, provider session folder, starting folder and additional folders use a separate collapsible Run files & folders section with existing copy/open actions.

- **Host identity and display names.** A stable host UUID owns credentials, chat identity and
  execution routing. Each desktop supplies its configured display name through authenticated
  state. Clients refresh that name without re-pairing; labels never select an authorization or
  imply a special personal/work category. Failed metadata persistence preserves existing keys.
- **One website destination lookup.** Account-backed records take precedence over browser-only
  legacy pairings. All sections share that lookup; absence of a default or credential is not
  evidence of an offline Mac. This does not migrate nonextractable keys or widen account trust.
- **Native device-zone chats.** Mobile chat timestamps follow the viewing device’s time zone,
  including DST and live zone changes. Shared account defaults cannot force UTC on native chats.

- **Desktop execution with remote clients.** Provider credentials, tools and browser sessions remain
  on the owning Linux PC or Mac. iOS sends authenticated encrypted commands through an opaque relay. This preserves
  access to local workspaces and avoids replicating execution environments on mobile devices.
- **Independent app and workflow repositories.** Proteus owns generic formats and UI. organization workflows and
  other operating systems own their schedules, workflow instructions and validators. Source-owned
  schedules are exported into the local store; opening the editor never executes repository code.
- **Plain JSON and revision checks.** Schedules remain AI/editor-friendly. Reads use the current
  file, writes validate and atomically replace it, and stale edits fail instead of overwriting
  changes. Run snapshots keep past conversations reproducible.
- **One host and serialized turns.** A process lock prevents competing runners for one data home;
  the engine avoids concurrent sessions and overlapping runs. Parallel execution is deferred
  until provider/client lifecycle and permission isolation can support it reliably. The October 9
  request for parallel independent chats across all providers/devices without an arbitrary Proteus cap is queued as BF-2026-10-09-11; it does not
  change the current runtime policy or the one-turn-per-session/single-runner invariants.
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
- **Host-owned OAuth.** Connection recovery invokes the provider's OAuth client. Corporate sign-in
  opens on the execution computer even when requested from iOS, keeping loopback callbacks and tokens on the host.

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

## October 5 — approved remote document identity and viewing scope

Keep generated files on the executing Mac and register chat-bound document IDs. Transport bounded
read-only content over the existing authenticated encrypted relay after checking a separate,
revocable View chat documents grant and the current host file boundary. Document IDs, cached links
and restored tabs confer no authority by themselves. Do not promote the broad local Markdown
endpoint into a general remote reader or expand existing peers' resource permissions silently.

Fetch the current saved version on open, return version metadata, and offer explicit refresh for
changes. Initially keep displayed contents in memory for the open tab only; persist descriptors,
not offline document copies. A disconnect leaves an already-loaded version readable with a
last-read label, while first reads require the owning Mac online. Clear account-bound content on
sign-out/account changes. Revocation stops subsequent reads, not possession of already-delivered
bytes. No new AI turn or plaintext website database copy is needed; existing website-client trust
is unchanged. This is queued design approval, not implementation or permission migration.

## October 5 — interactive previews require explicit script approval

The operator approved queuing provider-neutral interactive HTML artifacts with scripts off by
default and a user approval path. Provide Enable interactive preview and Stop scripts in trusted
Proteus chrome. Approval is limited to the exact artifact and bundled code version for the current
viewing session; ordinary rerenders preserve approval, while changed code and restored sessions
require renewed approval. The artifact itself must not approve or broaden its capabilities.

Script approval permits isolated browser JavaScript for the preview. It does not authorize Node
or `.cjs` execution, installs/build commands, access to other chats/files/credentials, network or
app actions. Additional capabilities remain separate and explicit. Reuse document authorization
for remote delivery, keep state in memory initially and expose stop/unload in Engine Room. These
are backlog requirements, not an implemented sandbox or a grant to run existing artifacts.

## October 5 — content workspaces and recency-based browser residency

The operator chose sidebar navigation for feature landing pages and content-only main tabs. Chats
and Team Tools own nested content tabs with a common creation menu and browser toolbar. Preserve
tab-strip positions through navigation. Home is initially selected, reports release information
and is unmounted when left. Review acknowledges a failure event, never a pending permission.

Browser residency is the union of the most recent six tabs and all touched within one hour,
across scopes per app, with active/dirty work protected. This supersedes the earlier immediate
Team Tools unload decision. It is not a six-tab maximum and does not stop terminals or model work.
Broader Safari-style tab groups remain a later design. The operator authorized implementing the
approved backlog and deploying after verification; current historical receipts are not acceptance
of this redesign. Worker models are capped at GPT-6 Sol with medium/high effort.


## October 5 — restore all content scopes without replaying work

Persist safe tab descriptors/order in the main strip, chat workspaces and Team Tools. Browsers
restore unloaded until activated. Restore identities and layout rather than executing startup
commands, restarting runs or inheriting a document/script approval. Website external tabs stay
under browser control; restored Proteus descriptors never automatically reopen external windows.

The remote-document implementation was narrowed after automatic approval review: a peer-level
View chat documents grant is necessary but insufficient. The requesting client creates a bounded
pending request for an exact chat-linked document; trusted host UI approves its exact bytes/version
for that device with an expiry. Revalidate identity, current grant, workspace containment and version
on every read. Changed content or destination needs a new approval. No body is sent while pending.
This replaces the initial blanket linked-file read proposal; successful source checks are separate
from full security/UI validation and installed-client acceptance.

## 2026-10-05 — Explicit sender consent for chat attachments

The operator explicitly approved the guarded delivery workflow after reviewing the proposed
boundary and synthetic test evidence. The sending client must show the exact selected files,
destination Mac/chat and named AI provider before Confirm Send. Upload/staging alone never
starts a chat or forwards bytes. Bind a short-lived one-use consent to authenticated device,
chat or first-message draft, message, provider and ordered file metadata/digests; verify it again
at the provider byte boundary. Changing destination or payload requires fresh confirmation.
Preserve accepted queued attachments privately across staging expiry/restart; never replay an
ambiguous interrupted provider send. Tests use synthetic files only, with no real user-file or
live-provider delivery. This authorizes implementation, not unattended export of existing files.

For larger batches, keep the same exact ordered one-use consent: at most 256 files, 8 MiB each
and 32 MiB total per message. The size budget is not multiplied by splitting uploads or by
sending a first-message draft. Finished staged files may number in the hundreds, but only four
per device and sixteen globally may have open upload descriptors; staged bytes are bounded to
64 MiB per device and 128 MiB globally. Sequential upload activity refreshes a 15-minute
inactivity lease for that message, while idle staged bytes expire. Accepted queued bytes remain
private and durable until consumed or revoked. Partial acceptance failure removes the entire
selected batch; the sender must reselect and reconfirm. The composer shows a quiet + Attach
control without advertising format or count limits in its normal state.

## October 5 — full-width compact top bar and notification routing

The operator clarified that desktop/web navigation begins below a full-width top tab row, with
Proteus in the upper-left corner. Reduce tab height and title-to-boundary padding before reducing
any title character allowance. Keep the icon rail, hover slide-over, creation menu and exact
scroll-position retention. A follow-up screenshot clarified that the collapse arrow should sit
near the sidebar top, with little empty space before Home and tighter left/right margins. Native
layout is unchanged by this desktop/web-specific request.

Fix iOS notification opening for cold and running app states before installation. Home is the
ordinary cold-start destination, but an explicit notification target takes precedence. Native
remote APNs push remains pending because the operator does not have paid Developer membership;
local notification routing is independent of that entitlement. Preserve existing signing.

## October 5 — host-owned chat lifecycle and fresh Copilot quota reads

Archive is a reversible visibility state of a Proteus chat, controlled by its owning Mac and
shared with authorized clients. Deletion is a confirmed Proteus-record operation, not permission
to delete generated files, provider histories or schedules. Active work and unresolved approvals
must not be orphaned. Restored descriptors and caches cannot resurrect a deleted chat.

Copilot's long-running SDK process can return a cached quota even when Proteus's own usage cache
is bypassed. Use a short-lived same-profile read-only quota process for an actual refresh, keeping
the executing chat client untouched and coalescing simultaneous requests. A local check timestamp
does not prove a provider observation timestamp. Do not label SDK fetch-time resetDate values as
authoritative reset times; retain explicit estimated/unreported provenance.


## October 5 — selected Claude MCP and runtime model identity

The Claude adapter uses only MCP definitions selected in the captured chat context, passed in a
private configuration file with strict isolation. Keep resolved environment/header values out of
process arguments and logs, require confirmed permission hooks, and clean private configuration
after its process exits. Unselected machine/project servers must not appear implicitly. Runtime
status and login are separate advertised capabilities: Claude status is supported, while scoped
login remains unavailable until the installed CLI's credential scope can be verified safely.
An authentication requirement points to the owning Mac without claiming OAuth succeeded.

Model aliases remain selectable and show resolved model IDs only when the runtime reports them.
Preserve explicit IDs and provider capabilities; never infer model versions from an alias table.
No workplace task or paid provider turn is used to test these adapter changes.

## October 6 — chat-only approval and local chat titles

Chat-only auto-approval is an explicit opt-in on one owning-host chat. It persists with that
chat through continuation and restart, and can be revoked to inherit the workspace setting.
It changes the effective approval mode only within the existing granted folders, tool rules,
and sandbox; it does not add filesystem roots or change workspace defaults. A provider,
root, or integration context change permanently invalidates the chat grant, even if a
previous configuration later returns. The decision path retains protected-request and
unknown-tool safeguards and records chat versus workspace provenance. Source and isolated
tests implement this behavior; installed cross-client acceptance remains separate.

For an unnamed new chat, the host derives a short title locally from the opening prompt.
Naming requires no additional provider turn, network call, or wait before creation. A
provided name or later manual rename takes precedence. Title revisions reject stale
client edits, including on chats created before this metadata existed. Cross-client
installed propagation remains to be verified.

## October 6 — accepted chat activity presentation for the queued build

Desktop chat is the visual reference for website typography, spacing, controls, and message
organization. User and agent messages retain their side accent borders. A contiguous tool and
approval sequence sits inside one restrained warm orange Activity box **without** a side accent;
the individual activities inside it retain their own side accents. Successful items keep a quiet
green fill. Failed or warning items use a lighter, richer orange fill and expose the actual safe
failure reason. A running item uses the existing circular working indicator, and the enclosing
Activity box may animate subtly while any item runs. Text labels and reduced-motion behavior must
convey status independently of color and animation. See BF-2026-10-06-08, -09, and -13 and the
examples in [the build handoff](2026-10-06-build-handoff.md). This is an accepted design direction,
not an implementation or release claim.

## October 6 — host-owned shared content descriptors

Chat browser/document and Team browser descriptors use one bounded host-owned revisioned store.
Authenticated remote get/mutate operations carry explicit scope and current revision. Clients rebase
only their original operations after a conflict, preserving concurrent additions. Selection, scroll,
cookies, page memory, terminal execution and document bodies remain local. Host document descriptors
contain opaque IDs; a separate private source registry rechecks current roots and exact-version
approvals. Startup seeds only an uninitialized scope, preventing stale saved tabs from resurrecting
closed remote tabs. Revocation removes host-bound views and rejects delayed replies. Both native
clients and visiting desktops use this boundary. Unknown store fields survive atomic replacement.

Certificate inspection and browser automation share a lease only when Proteus owns the debugger.
A foreign debugger is preserved. Each consumer releases its listeners and lease independently,
so interrupted automation can recover without disabling certificate reporting or restarting the app.

## October 6 evening — shared Home and evidence-based acceptance

Home is one DOM renderer and one scoped stylesheet (`public/home.js`, `public/home.css`) imported
by desktop and web. Platform adapters supply data and navigation; only a Mac-only instruction
panel differs. The latest release is summarized with expansion, rather than rendering full
history in a separate desktop design. A local demo uses this same renderer.

The operator's latest direction reserves orange Activity groups for issues. Success-only groups
remain green, and item side accents have straight left corners. This supersedes the earlier
unconditional warm-group sample. Native browser-close notifications can arrive before the close
promise resolves, so selection must be reconciled by stable ownership before dispatching close.

Release acceptance is reopened item by item when screenshots or live evidence contradict a
completion claim. Tests, source presence, installation and actual workflow verification remain
separate. See `2026-10-07-acceptance-audit.md`.

## 2026-10-07: bounded navigation history and stable transcript paging

Authorized content descriptors may include a normalized 50-entry/32-KiB URL/title backstack.
Use the existing safe-history filter; never synchronize cookies, page content or credentials.
Keep selection local and keep loaded desktop pages intact. Native retains its existing WK view
on a remote URL update rather than discarding it. Use absolute event boundaries for older chat
pages and retain disjoint cached segments until gaps close.

## October 7 follow-up: Standup links and browser recents

Standup links belong to the revision-checked shared team-list record, not the independent browser
bookmark collection. Desktop and website share the same row markup/style. Editing other roster
fields preserves stable link IDs; conflicting writes remain rejected by the existing API.

An address field shows up to 20 distinct URLs ordered by latest visit, retaining that visit's device
name and timestamp. Desktop combines retained local and account visits; web/native use the authorized
account history. No system-browser history is imported and no missing device identity is inferred.
Native new tabs focus the keyboard; desktop suggestions suppress the embedded page through the
existing overlay token while open. Website suggestions stay within layout so they do not cover Go.
Resources truncates oversized labels in a fixed-width table and flex rows rather than wrapping them.

### Shared allowance rendering
Desktop and website use one provider-pill and detail-dialog renderer and stylesheet. The website retains its authenticated Mac quota request and privacy setting, while collapse is a single persisted toggle. Connection identity appears once below allowance; the green dot requires connected state. Web provider setup links to the page explaining destination-Mac configuration. Nested Activity Details has no extra border or padded box, matching desktop.


## October 7 — Native page title authority and new-tab visibility

For the same loaded URL, the local page's observed title takes priority over another client's
automatic descriptor title. Explicit custom names remain authoritative across clients, and remote
URL changes still navigate. Apply incoming tab collections atomically to avoid transient removal
of the selected child. New-tab scrolling is triggered by newly added selected IDs, not ordinary
selection changes, preserving the accepted manual strip position behavior.

Bundle the same README used by desktop/web Home into the native app. Present it from a Home link
in a dismissible, scrollable sheet with normal body typography, so it remains readable offline.


## October 7: active runtime, browser ownership and credential consumers

Runtime means observed active orchestration, not inference or billing. Persist active intervals
per turn; pause while waiting for the operator, exclude queue/idle gaps, and union overlapping
child-tool intervals. Host observation timestamps offset remote device clocks. Interrupted tails
are excluded and marked partial. Older chats remain unavailable or partial; never reconstruct
work time from message spacing. See runtime.md.

Browser presentation parentage is distinct from agent control. Moves preserve page identity but
clear old control grants; copies are independent unloaded pages. No live terminal, running chat,
or protected remote-document grant is cloned. Projects remain deferred. A provider-command view
reads reported tool activity and does not invent an attachable interactive process.

Integration status belongs to a specific host/provider/MCP consumer. A successful Azure login
cannot establish Jira/ADO MCP authentication. New credential isolation must meet the protected
storage requirement; see the official adapter investigation in the implementation ledger.

## October 7 — Separate tab resumption from active automation; bound chat history residency

A completed turn releases browser automation connections and active ownership while retaining a
chat-scoped in-memory resumption association. This permits same-tab continuation and lazy reload
without granting another chat access or persisting agent authority across app restart. Explicit
revocation and transfer clear the association. Visible, actively automated and audible pages are
exempt from background throttling; no new aggressive unloading policy is introduced.

Desktop refresh uses summaries plus on-demand history pages with bounded transient delta cursors.
Changed existing events are patches by absolute event position. Unknown cursors recover with a
full bounded page. Inactive rendered conversations and completed host histories have four-entry
caches; active provider histories remain pinned so callbacks retain valid event references.
Durable history, drafts and descriptors are independent of rendered-view eviction.

## 2026-10-07 — Search chats, document tools and queued steering

Internet Search is a persistent chat classification, not a separate execution engine. Its first
turn uses host-owned provider defaults and workspace defaults, reducing setup choices while keeping
normal model changes and one-way promotion after creation. Scheduled runs remain a separate list
classification; classification is persisted through remote summaries and offline caches.

App capabilities belong in provider runtime instructions and actual tool adapters, rather than a
repo-only skill that ordinary user workspaces would not load. Markdown opening uses canonical
workspace authorization and stable chat descriptors. A per-turn MCP capability supports existing
Codex sessions without assuming the resume API can install new dynamic tools.

Queue-to-steer preserves the queued message until provider delivery succeeds. An in-flight map
serializes conversion by message identity and completion waits for pending conversions before
consuming the next queue entry. Failure is visible and leaves the original queued message intact.

Search promotion mutates only the current run’s classification and is idempotent. It does not
reject an unrelated streaming-event revision: no transcript, model choice or title is overwritten.

## October 7 — Keep chat navigation outside view padding

The child-tab strip belongs directly to the workspace above its scrollable content. Per-view negative margins coupled navigation to conversation padding and broke shell/document borders at normal and narrow sizes. A shared workspace row also keeps navigation mounted through document scroll and asynchronous chat replacement without per-view CSS offsets.

## October 8 — Connection recovery is separate from command delivery

An unavailable peer request may initiate connection recovery but never retains or replays its
command. Periodic callers respect the peer’s backoff timer; otherwise tab/index polling defeats
retry throttling. Expected background disconnects use connection state rather than global toasts.
Notice deduplication preserves expiry and dismissal during a repeated background failure.

The pending-request approval shortcut uses the existing chat permission API with an optional
expected request ID. The host checks that ID synchronously before changing the grant. A separate
capability advertises this guard to remote clients so older hosts cannot silently ignore it.

Browser refresh is idempotent at the native view boundary: compare actual bounds, visibility and
throttling before applying updates. Avoid repeated compositor-affecting setters without disabling
real resizing, automation exemptions or background resource controls.

## October 8 — Proposed account contexts and connection evidence

BF-2026-10-08-04 is a queued design, not an implemented architecture. Separate identity,
credential consumer and resource context so any number of accounts can each access multiple
tenants/subscriptions/sites. Agents select an authorized context explicitly; they must not change
global defaults or another chat's login. Reuse requires adapter-supported isolation, not merely
a familiar email or MCP alias. Keep credentials provider-owned and private registry data outside
the repository. See `mcp-auth.md` for the detailed proposal and acceptance criteria.

Track transport, authentication and resource-access evidence independently. Historical auth
warnings require sufficient newer evidence for the same binding before showing recovery; a
connected flag cannot erase a stronger failure. Timers use reported metadata, while renewal and
verification use official runtime interfaces. Missing metadata and unsupported isolation remain
visible limitations. Monitoring never interrupts an active provider session, forces account
switching, bypasses interactive policy or replays an ambiguous external write.

## October 8 — evidence-aware integration health and queued edits

Keep integration health in private host application data with exact consumer bindings, expected
labels separate from observed identity, and resource access separate from runtime connectivity.
The same MCP alias does not identify a shared credential owner. Background work uses only live
sessions, holds provider startup, serializes with manual MCP operations, bounds reconnect attempts,
and never replays a write or opens sign-in. Unsupported isolated selection must fail visibly.
The Accounts & Integrations view replaces Integration profiles; Providers, Mac Connections and
Proteus account security retain distinct responsibilities. Web shares the renderer with read-only
metadata and host-owned check/recovery actions.

Edit queued text in place, preserving its ID, attachments and model controls. Compare the exact
prior text and require queue membership; reject edits during steering delivery. An accepted
pending answer removes only its exact request form even if focused; preserve unrelated drafts.
Render every approval choice supplied by the host on all clients and retain scope explanations.

## October 8 — Live browser references and page find

Live Browser transports bounded captures over the existing encrypted paired-device protocol.
A separate host-owned viewing grant controls access; a device can reference only a frame it
received for that chat. References expire after 30 seconds and are invalidated by navigation,
unloading or revocation. Point annotations become observed-page context for the agent, never
direct input. Existing chat queues, steering and pending-request checks remain authoritative.
One capture is in flight per chat/tab and short-lived shared frames avoid redundant encoding.

Text finding uses nonmutating CSS Highlight ranges so selecting a match does not alter the
transcript, links, provider text or Markdown DOM. Native browser views use WebKit's find
interaction; Electron routes its find results to the shared panel. Counts describe loaded,
searchable content and must not imply an entire unloaded history or canvas contents.

The iPad chat-list route no longer observes a cached selected-chat ID as a fresh navigation
request. Only explicit selections and notification routes may reopen the chat. Pending-answer
drafts are keyed by the question as well as the chat, independently of ordinary message drafts.

## October 9 — Content-edge swipes and retained setup disclosure

Use content-relative 56-point edges instead of the physical screen edge so the iPad sidebar does
not obscure navigation. Require 80 points of predominantly horizontal movement; center, short
and vertical drags do not route. Browser history uses the same stored-history path as toolbar
arrows, avoiding duplicate WebKit and app recognizers and preserving restored history semantics.
At the history root, chat and main browser containers return to Chats without closing tabs.

Web setup disclosure is draft presentation state, stored outside submitted values. Preserve both
open and closed choices through host events and provider catalog rerenders, and start expanded
so workspace/destination setup is visible as on desktop.

## October 9 — Needs attention retains actionable notifications

Approved design, queued without build: transient 15-second banners and persistent actionable items
are separate views of the same issue. Needs attention has Chats and Notifications tabs, rich issue
specific actions and seven mixed recent unresolved items in the sidebar. Navigating to the page or
an issue never replays its banner. Dismissal affects presentation only; resolution and expiry affect
the pending state. Meaningful updates order the list; polling and repeated errors do not reorder or
multiply it. Document Details exposes the full authorized disk path with wrapping and copy support.
This supersedes the initial notification mockup's banner-replay shortcut. See BF-2026-10-09-05–07.

## October 9: browser isolation and shared notices

Use native persistent partitions and iOS identified website stores behind stable account-scoped profile IDs. Sync definitions/settings only. Keep Default unchanged. Treat enabled extensions as a whole-profile human-only boundary until credential-only isolation is validated. Use a small native child window for desktop banners because HTML overlays do not reliably cover WebContentsView. Dismissing a 15-second banner does not resolve its underlying request. Execute independent chats in distinct provider runtimes, retaining same-session serialization. The combined ledger distinguishes synthetic verification from live acceptance and deployment.

## October 9 — Native typing stays within the composer

Native typing performance (BF-38) is authorized independently of the queued composer redesign.
Keep text observation at the composer boundary rather than publishing the entire host draft map
for every keystroke. Save edits into memory immediately instead of debouncing user intent; move
automatic encoding/encryption/disk work to an ordered utility queue. Preserve synchronous ordered
flushes at lifecycle boundaries and cache deletion so background writes cannot restore old data.
This changes neither the encrypted cache format nor Send/Queue/Steer/answer semantics.
Share one ephemeral website store only among trusted bundled Markdown renderers, retaining each
message's own script bridge. Arbitrary HTML artifacts and browser profiles keep their isolated
stores. Idle Find must not broadcast zero-count results for every rendered message.

## October 9 — Approved adaptive composer and circular action buttons

Keep one bottom action row. Expose Model, Level and Speed separately when the available chat
width permits; combine them into one options submenu on iPhone and narrow iPad windows.
Adapt to available width rather than device name, preserving selections across layout changes.
Use circular 44-point icon buttons for Steer, Send/Queue and Stop. Attach retains its old plain +
without a circular background or border and keeps a 44-point touch target. Preserve existing
composer/text-box colors on each platform. This refinement supersedes circular styling for Attach.
Send retains the
current green color and uses an up arrow; Queue adds a clock badge, while Steer and Stop remain
distinct actions. Keep labeled model/options controls and accessible action names. Working
status belongs after the latest content, above the composer. The operator approved the preview
with circular buttons, superseding the earlier rounded-button selection. BF-26–28 record the
queued implementation; preview approval does not certify a native build or installation.

Desktop/web follow-up: adopt the same layout using actual HTML labels above selects and
34-pixel circular pointer buttons, retaining 44-pixel touch targets for coarse pointers. Keep +
in its current left position and use local desktop's text-box colors on desktop remote and web.
Keep provider-supported Context and catalog refresh available. The full HTML prototype imports
existing styles and the attachment picker; its handlers are synthetic and cannot send/upload.
BF-29 separates completed prototype rehearsal from queued application integration.

Further review establishes local desktop as the canonical chat and Run details format in all
three HTML clients. Put instructional paragraphs behind Explanation disclosures, enlarge runtime
and put smaller multiline input/output tokens directly below it. The operator explicitly accepts
display/copy of authorized remote paths; retain identical fields and Copy path actions, with
local-file Open disabled in remote/web views. Keep shared document viewing distinct. The editor
grows upward through content measurement and begins scrolling at 60% of available chat space,
including its controls/attachments in the cap. Expanded hover visuals must not move the + glyph.
BF-30–31 record the completed review demonstration and queued production integration.


## 2026-10-10 — Install the entire queued chat scope

The operator rejected the partial 0.2.10 rollout. Production 0.2.11 integrates the approved
composer/details designs and all follow-ups rather than leaving prototypes in the review page.
Use one JavaScript presentation adapter and details renderer across local/visiting/web clients,
preserving their existing handlers. Native touch controls adapt to width and retain isolated drafts.

Static localhost previews are discovered and bundled by the owning Mac, scoped to normal
chat-linked URLs and existing document-viewing grants. Send a bounded versioned snapshot through
the encrypted relay; do not expose an arbitrary development-port proxy. Versions keep stable tabs
and revoke script consent. Native metadata publishes both changed hashes and the first fresh read
after restart, without persisting content or interactive authority. Static native HTML uses a
nonpersistent JavaScript-disabled view because WebKit can leave disabled-JavaScript srcdoc frames
empty; interactive content remains in an opaque sandbox. Network and app/file actions stay blocked.

All target updates are authorized. Preserve certificates, app data and pairing. The hosting Mac
updates through an external idle handoff; unavailable HC/web deployment routes remain explicit
installation gates, not claims that source/build verification completed deployment.

- **Cache headroom is separate from rendered history.** Long chats start with a small meaningful-row window and prefetch one compatible older page while the reader approaches it. Collapsed tool/approval streaks count as one row, so activity-heavy histories do not require hundreds of tiny reveals. All absolute event indices and older transport pages remain reachable; renderer limits are not retention limits. Heavy activity descendants are constructed on expansion, native offscreen Markdown views keep measured height, and prepend restoration follows a message anchor/inset rather than a stale content-height estimate. Bottom calculations include the native composer safe-area inset.
- **Bounded command receipts retain replay protection.** The existing 10,000-record ledger compacts only completed receipts older than the clock-skew/replay window when capacity is reached. Recent/inflight/pending claims stay intact and expired unknown request IDs still fail validation. A temporary busy error replaces a misleading daily quota message.
- **Prepare mobile history before the reader reaches it.** Keep the small initial window, but prepare later rows 2.5 viewports ahead and fetch transport cache six viewports ahead when headroom is low. Later batches use 24 meaningful rows / 96 KiB; native rich views warm 1.5 screens ahead. Background cache fetching stays bounded and separate from mounted views. Preserve desktop/web paging after favorable operator feedback.
- **Browser failures belong in transient notifications and retained Logs.** Proteus main-frame load failures use a 15-second shared notification with Reload and View logs, and a sanitized warning in Engine Room Logs. Deduplicate each navigation and clear stale diagnostics when a new navigation begins. Ignore intentional aborts and embedded-frame failures; website-owned error content remains website content. No permanent Proteus error strip reserves browser-page space.


## 2026-10-11 — Workspaces are the persistent project container

Use the existing Workspaces feature for complete independent configuration and navigation; do not
add a Projects section. The sidebar opens a workspace list and shows seven recents. Opening an
individual workspace adds one named top tab with a singular square icon and pinned Workspace
child. Chats and Configuration are button pages inside that pinned child. Shared chat lists lock
the owner/workspace filter only in workspace views; the master list remains filterable.

A chat is identified by owner and run ID. Main-navigation and workspace representations share
conversation state and drafts, deduplicate within a container, and enforce the existing single-turn
rule. Links and new tabs keep their originating container. Hidden workspace tabs retain children
and selections. Terminal restoration preserves descriptors/output and never replays commands.

A workspace belongs to one machine. Remote viewers edit source modes/defaults/approvals through
that owner's authenticated API; local file picking remains on the owner. Local Copy preserves the
entire independent configuration and approvals after naming, then opens Configuration. Copy to
another computer maps paths and clears machine-specific approval grants; chats, credentials and
browser cookies are never configuration-copy payloads. Remote terminal descriptors identify the
owner; this release does not introduce a remote PTY or a workspace-only document transport.

Unify command-folder/starting-folder terminology as Starting folder. Source discovery is separate
from execution roots and access grants. Each root gets its own budget and refresh result; exclusions
are configurable, and scans run off the UI thread. Source modes/favorites edits reuse discovery.
Group sources alphabetically by folder and name; active master filtering crosses all source kinds.

Preserve recorded usage provenance: Claude input includes explicit uncached, cache-read and
cache-creation counts. Old records with unavailable cache counts remain visibly incomplete.

## 2026-10-12: Missing supplemental folders are contextual warnings

An unavailable supplemental folder must not prevent a chat using another valid starting folder. Omit its sources and execution-directory entry from the captured context, report the omission, and preserve the saved configuration for recovery. Do not silently substitute a different starting folder or explicitly chosen main agent, or weaken changed-source/MCP identity checks.


### Remote command persistence and desktop responsiveness

Remote retry claims/results use a dedicated SQLite worker with durable transactions; the Electron main thread must not serialize and rewrite the entire receipt history. Preserve the legacy JSON and import it with an atomic marker. Keep unresolved claims indefinitely and completed receipts for at least 24 hours; storage admission may reject new work but must not silently drop replay protection. Completion of an already admitted action persists even when its result exceeds the admission budget. Diagnostics expose bounded counters and timing only.

Tab synchronization compares shared normalized descriptor semantics, not raw JSON property ordering or optional-default representation. Rebase against current host state before suppressing true no-ops. System-process and terminal-status polling uses asynchronous coalesced queries; device-encrypted cookie snapshots retain ordering and shutdown persistence while disk operations yield.


### Desktop release coordination through destination Codex chats

Use one tested signed artifact and corresponding source for authorized desktop updates. The coordinator transfers immutable, hash-verified artifacts privately; the existing authorized destination chat performs fresh local preflight, preservation, installation and live verification. Carry forward user authorization and retain local ownership of current data. This reduces artifact drift and makes completion auditable without relying on stale remote observations. Follow [desktop-updates.md](desktop-updates.md); this operating procedure does not itself authorize new targets or transfers.


### Scheduler worker and bounded stall attribution

Periodic scheduler reads, cron computation and durable snapshots belong in a serialized worker. The main thread retains durable run claims before provider effects; completed runs remain duplicate-slot evidence when checkpoint writes fail. Never advance in-memory checkpoint state before persistence succeeds, hide external schedule edits with metadata-only caching, or queue concurrent ticks. Performance diagnostics use fixed phase names and bounded records, report synchronous versus asynchronous elapsed time separately, and save privately without blocking flushes. A temporal correlation is not proof of the reported periodic hang.


## October 12 — Fresh scoped health projection and bounded stall evidence

Use operation-scoped catalog reuse rather than a long-lived context cache for remote integration
health. Recheck external configuration and source bytes on the next operation; keep registry hash
bytes stable so existing recovery counters and profiles survive. Retain only bounded opaque identity
digests. Preserve command journal and scheduler claim ordering unchanged. Keep a separate small ring
of >=1-second stalls/discontinuities because frequent short stalls otherwise evict the evidence needed
to diagnose the user's occasional full freeze. Correlation is recorded without asserting causality.


### Native navigation and browser favicon bounds

Keep account-shared default-profile Recent sites separate from each tab's durable Back/Forward
stack. Commit settled navigation without letting stale observations from an interrupted load
rewrite the stack. Use WebKit's native gestures only when its adjacent history matches the saved
stack; retain the saved-history fallback after view recreation. Pinch opens the existing scoped
overview while preserving page zoom and Reduce Motion behavior.

Favicon resolution is a bounded generation per page/icon selection, with one in-flight resolver.
Its own network requests must not recursively trigger more resolution; unrelated network
completions and non-image content cannot prolong work. Closing/unloading invalidates late work,
and unchanged icon bytes do not cause another whole-browser publication.


### October 12 unified browser preservation follow-up

New desktop history stores retain all visits by default. Existing explicit retention preferences
survive migration; shorter retention is a deliberate setting. Retained per-tab navigation and
retry receipts are independent of chronological visit pruning.

New navigation retry receipts contain compact deterministic acknowledgements, while existing
receipt payloads remain readable and unchanged. The history list is obtained separately from its
indexed store, preventing each visit from saving another copy of a growing navigation window.

A native navigation conflict preserves its tab's complete local branch and unrelated pending
operations across restart. The viewer explicitly chooses owner history or a separate local tab;
that tab retains its original navigation scope and owning computer.

### History settings use owner catalogs

History settings project the owning desktop’s existing paired computers and cached account profile definitions, including Default. Viewing clients do not supply the authority for replication destinations. Saves preserve hidden peer configurations and unknown fields; revoked configurations may be retained or disabled, but cannot gain access through a stale client. Native, desktop and web share this contract. Catalogs are derived and are never stored as preferences.

### 2026-10-13 — Separate loading state from shared tab presentation

A restored WebContents briefly has no document title; publishing New tab at that point caused
owner metadata and renderer labels to alternate. Retain remembered/logical titles until loading
settles and reconcile unloaded native snapshots from owner page-title updates. Do not turn off
navigation synchronization to mask it. Keep unchanged tab strips mounted and detached sync
baselines. Since native commands can await a load, recheck order at the final replacement step
to preserve a user reorder made during I/O. A counter guards concurrent scope application.

## October 13 — Proposed shared agent tab-management boundary (queued)

BF-2026-10-13-11 proposes a single host-owned operation boundary for interface actions, internal
agent adapters and external MCP clients, with complete typed inventories and real tab placement.
Tab organization grants are distinct from page/chat-content grants; chat Close differs from
Archive/Delete/Cancel. Reuse BF-06 configuration/approval preservation and durable retry/revision
checks. SafariSelector supplies inventory/verification patterns, not a backend to copy.
This is a queued design direction, not an implemented/verified decision or authorization to build.
Tool names, protocol compatibility and metadata scope remain to be finalized; SQLite is shelved.

## October 13 — Proposed all-type tab placement and workspace inventory (queued)

BF-12 adds Workspace Tabs as Chats / Tabs / Configuration and makes visibility/placement a
common contract for browser, terminal and viewer tabs. Hide retains the logical tab/resource;
Restore and reorder preserve navigation position. Display parent must be distinct from terminal
execution owner and viewer source/authorization origin so moves do not restart work or widen grants.
Creation and interaction dates have explicit semantics; passive refresh never counts as interaction.
A synthetic interactive preview is design context only. No implementation/build is authorized.

## October 13 — Proposed workspace deletion separates tabs from conversations (queued)

BF-13 deletes the workspace and affected navigation/tab tree while preserving every associated
conversation as unhoused, or bulk-rehomes chats to an existing/new same-owner workspace. The bulk
chat option does not migrate non-chat tabs selected for closure. Source files/provider sessions and
active model turns survive; effective run configuration and permission boundaries cannot follow a
removed profile or silently inherit a default. Explicit cascade closure differs from ordinary
Move chat child preservation. Default/final workspace and source-owned schedule dependencies need
explicit handling. This is queued scope only, not implementation or authorization for deletion.

## October 13 — Proposed browser download lifecycle and local destinations (queued)

BF-14 extends ordinary and explicit Save As downloads through one owner/profile-bound manager.
Download completion dates and cancellation come from actual transfer state; records are independent
of rotating logs. Defaults resolve the owner's OS Downloads folder, with per-device configuration
and per-download Save As overrides. Navigation placement does not own transfer lifetime; native
Files/export and remote owner-folder behavior remain explicit. This is queued design scope only,
not implementation, a completed download workflow or authorization to build.

## October 13 — Extend existing Playwright for visual control (queued)

The operator chose the existing Playwright integration for BF-15, rather than another browser-agent
framework. Model-visible image tool results and coordinate input supplement semantic snapshots for
pixel-only interfaces. Reuse live tab/profile and private CDP permissions; screenshots require an
explicit coordinate/capture identity and provider image transport. Image capture alone does not
verify remote desktop control. This is an implementation direction on the build list, under the
existing hold; no implementation/build or private-session live verification has occurred.

## October 13 — Default Playwright, on-demand developer backend and human inspector (queued)

The operator selected Playwright as default and Chrome DevTools MCP as optional on-demand Developer
mode, with built-in human DevTools/Inspect and MCP packages for agent access (BF-16). A shared owner
service manages identities, grants and controller ordering; optional diagnostics cannot require a
separate browser/profile or break ordinary browsing. Electron bridge compatibility and inspector/
debugger coexistence remain unverified. BF-17 proposes an explicit profile preference for agents
on shared/run-owned extension-profile tabs, replacing a blanket block without sharing every tab
or implicitly enabling developer/Live Browser access. No packages installed or policy changed.

## October 13 — Extension chrome and feedback-context intake (queued)

BF-17 agent access on extension-enabled tabs is explicitly confirmed. BF-18 places Extensions/
actions in browser chrome between Go and Overview, with locale-resolved installation identity;
BF-19 gives extension popups bounded host-owned close/error behavior independent of page rendering.
Keep extension data/profile identity and native popup/options/onboarding semantics intact. BF-20
requires provider→owner→API→UI evidence before classifying a missing explanation as rendering loss.
The completed read-only owner audit found no first finalized explanation and consistent native/
JSON/API preservation of the later explanation in a feedback question. Substantive question
context must remain readable after answering without inventing an un-emitted assistant reply;
agents should explain before dependent follow-ups. Actual historical UI rendering remains
unverified. All changes are queued; no implementation/build or active-chat changes.
The follow-up report of visible answers without their agent questions reinforces BF-20's explicit
question/answer history contract and reopens prior BF-2026-10-07-07 presentation acceptance.
Persistence success alone must not be described as verified readable conversation history.

- **Organization is separate from execution.** Chat workspace membership uses explicit run-level
  fields, including null for unhoused chats. Captured workspace roots, model/session options and
  approvals remain frozen during an organizational move. Mutable JSON remains authoritative;
  the workspace/chat SQLite migration is shelved. Document placements grant the named viewer's
  presentation without rebinding its source to the destination's filesystem authority.
- **Deletion preserves execution and supports retry.** Workspace deletion journals its affected
  set, moves surviving conversations and closes associated resources before removing the active
  profile. Archived profiles retain captured execution for existing runs/schedules. The last active
  workspace is replaced with a clean default; no project file is removed. Retrying must not move
  a chat the user has since placed elsewhere or close a tab already moved out of the affected scope.
- **Scoped package integrations and debugger handoff.** Playwright MCP is the default package;
  Chrome DevTools MCP starts only with a per-tab developer grant. Neither creates an unrelated
  browser nor exposes a global profile/CDP endpoint. Human DevTools releases automation attachment;
  closing the inspector restores ordinary automation. Image results preserve provider-native
  transport, while summaries omit image bytes. Coordinate observations expire and are invalidated
  by navigation, viewport/device-scale changes and input.
- **Redirects preserve both intent and platform behavior.** Desktop GET redirects wait five seconds
  for Accept/Reject and Back cancellation. Non-GET requests follow natively, preserving request
  bodies. SPA replaceState reconciles an entry rather than delaying unsafe application state.
  iOS reconciles native redirect/replacement history without a banner. Safe requested addresses
  remain recoverable; authentication URLs/secrets are not added to portable history.
- **Downloads remain device-owned.** Desktop uses an OS Downloads default and configurable folder;
  filenames are reserved without overwriting unrelated files. Native uses Files, explicit folder
  access and export. History records real completion dates and bounded metadata; rotating it never
  deletes completed user downloads. Progress writes are coalesced on desktop. Web browsers retain
  their own download lifecycle and operating-system folder controls.
### October 14: legacy navigation authority

Before the all-type desktop synchronizer starts, import the newly managed saved surfaces into
legacy main/Team browser-only registries, and terminals into legacy chat registries. Preserve
existing browser authority, canonical relative ordering and unrelated extension fields. Record
`desktopSeedVersion: 2` on each imported scope so a stale session cannot resurrect intentionally
closed tabs on subsequent saves/restarts. Workspace registries already supported these types;
their missing descriptors retain close authority. The import precedes rendering, since dropping
a chat parent would also prune its child navigation. This desktop-owner correction does not
require a native-client rebuild. Validate with existing nonzero revisions and actual UI restart,
including an intentional close after migration.


## October 14 — Placement changes preserve navigation; native sidebar shares layout

Navigation entry identity and operation identity serve separate purposes. Use a new operation UUID
for each actual command and persist the exact command for retries; never reuse an entry ID as a
global receipt key. Reconciliation may acknowledge a matching saved entry without inventing a
visit. Changed payloads and actions against closed tabs preserve the outbox and pause retries for
explicit recovery. Browser moves use the same owner boundary as viewers/terminals; copy the entire
worker-owned stack to the destination without visits, retain source/receipts for crash recovery,
and advance the destination revision so stale commands cannot silently apply. The metadata file
and database are not one atomic transaction; copying first leaves the original intact on failure.

Electron's native WebContentsView paints above the shell's HTML. A compact sidebar expansion
therefore reserves 250 pixels of layout space and updates native bounds, instead of hiding the
whole browser. Other modal overlays retain their existing behavior. Workspace Tabs column widths
are local presentation preferences, never shared ordering or workspace configuration. Chat Move
changes organizational membership and its visible index independently of captured execution roots
and approvals; a browser-only Copy command does not clone a conversation.


## October 14 — Agent document placement follows the open chat surface

Resolve the existing local workspace chat first, then its standalone chat, then an already-open
organizational workspace. An agent document remains associated with its original chat/file
permission boundary while its display descriptor belongs to the selected workspace or chat
container. Reopening the same chat document reuses its descriptor/view and can relocate an older
chat-scoped placement; it must not create a duplicate top-level chat beside an existing workspace
chat. This corrects document opening without removing standalone chat subtabs. A broader model
with workspace containers and peer chat/resource tabs is a future design review, requiring saved
placement migration, browser-history/terminal continuity, host ownership, grants and focus rules.

## October 14: owner Move updates canonical placement without renderer help

Chat membership and canonical tab placement must follow the same owner Move path. Inspect both
main and workspace scopes, preserve the existing descriptor and unrelated rows, remove duplicate
chat placements and write once. Do not reopen a deliberately closed chat. Repeating a Move repairs
a stale main alias without changing other tabs; after convergence it is a revision no-op. Browser
retry queues remain preserved and are not required to synchronize before chat placement can move.
User-initiated Move selects the destination chat and reveals both navigation levels; an unrelated
background Move does not steal focus. Browser conflict recovery identifies the pending tab/page
and explicitly separates keeping saved history from first opening the pending page in a new tab.

## October 14: full redirect history and immediate native redirects

The operator explicitly withdraws redirect waiting/rejection and iOS entry rewriting. Preserve
every full HTTP(S) destination as a distinct entry/visit, including login paths, query strings
and fragments, while the native engine handles redirects and POST bodies. URL userinfo and
privileged/non-web targets remain rejected; page state, form bodies, headers and grants remain
outside history. This complete-URL retention preference replaces the earlier authentication URL
exclusion in shared browsing metadata. Keep private-profile selection and content/agent grants
independent, preserve existing data and acknowledge that earlier omitted URLs are unrecoverable.

## October 14: explicit approval for a schedule-started conversation

Preserve scheduled-run protection: a new conversation-only auto-approval requires the exact
waiting request, supported scheduled/manual trigger, matching permission context and current
chat revision. New folder trust must match the currently offered folder/access. Store only on
the named run, apply through continuations/restart and keep future schedule executions ungranted.
Revocation/inherit remains available. Automatic review rejected globally removing trigger guards;
the implemented narrower current-request path passed review and independent run-isolation checks.

The owner also converts older clients' different-URL `browser-redirect` commands to distinct
entry/visit appends under the existing idempotent receipt, retaining the originally selected URL.
Same-URL title metadata still updates without a new visit. A native cached Tabs page permits
local title selection while owner mutations remain disabled offline, and does not create a
connection alert for that cache read. History reconstruction rejects the privileged app origin
in both native and logical restoration; normal agent tab listings omit complete backstacks.
# Linux source and build ownership

The current Linux build uses the verified accepted 0.2.20 source archive from transfer commit
`418a083` on `codex/signed-proteus-0220-20261015`; all 879 source hashes and archive digest
were verified before import. Its accepted Mac fingerprint is
`3f2196de3586915fc72f8d0cdebb645c109992306c3735514d0786b0acaf4985`.
The earlier 0.2.19 import (`82cd923`) remains historical. Do not use an older `main` checkout or
an independently reconstructed Mac artifact as the current source. Record
the upstream source identity separately from the Linux runtime fingerprint. Linux packaging
rebuilds only its copied PTY, retains pinned dependencies and leaves Mac signing/iOS files alone.
Platform data paths and desktop lifecycle changes stay conditional; secure-storage requirements,
provider approvals and relay protocol remain intact. Keep private prelaunch backups outside Git.


## October 14, 2026 — Attachments do not share the controls lane

Use the existing shared composer grid for all desktop chats, with attachments in a bounded full
row preceding the controls; web retains its separate strip with the same styling and bounds.
Observe picker hosts rather than replaceable strips. Keep the controls docked while editor and
attachment content scroll, including when a waiting question occupies space. Preserve attachment
delivery/consent, draft state and model metadata; this correction does not redesign chat ownership.
Build/test first and hold website/Work Mac deployment as requested.

## October 14, 2026 — Bound app update recovery to two full generations

The operator rejected release-by-release backup sprawl. Limit full recovery to two accepted
generations per installation/data home or physical device, count nested before/after/retry copies
individually, and resolve temporary in-flight exceptions. Use one verified pre-update snapshot,
resume device copies, retain post-install verification as receipts, and keep one app bundle per
generation. Compact completed migration evidence to targeted state/helper/receipts. Extra full
exceptions require explicit reason, budget, deletion condition and operator approval. This changes
agent/update instructions; it does not implement a new scheduler or deploy app code.

## October 15: authenticated workspace favorites and simulator family coverage

Native chat source favorites use the current authenticated host workspace profile. A captured
chat's explicit workspace ID takes precedence over an ID omitted by its folder profile; an
explicit empty favorite list is authoritative. Legacy missing lists fall back to scoped discovery.
This avoids stale offscreen SwiftUI section tasks without broadening trust or changing owner
mutation/revision checks. Test-only picker interactions target the displayed value and verify
the resulting selection and backend state. Native CI partitions all UI cases by required hardware
family, rejects mismatched/unavailable simulators and runs tablet assertions on an actual iPad.
A phone run or a silent device guard cannot establish tablet acceptance.

## October 15: one native browser navigation gesture owner

Honor the October 9 content-relative 56-point edge/80-point movement contract through the
existing app handler. Disable WebKit’s independent interactive recognizer and remove the
native-adjacency suppression of that handler. The October 12 full-path check in goBrowserHistory
still selects an existing WKBackForwardList item when safe, preserving DOM/page instances and
history.state; restored or mismatched stacks retain saved-URL loading. A delayed fallback cannot
reliably distinguish WebKit cancellation from a late interactive commit and could navigate twice.
This ownership correction deliberately removes WebKit’s interactive swipe preview/cancel animation,
while preserving semantic navigation, zoom, two-finger handling and owner/history safeguards.
Validate a single swipe across three pages to detect skipped entries as well as missed actions.

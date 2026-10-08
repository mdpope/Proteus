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

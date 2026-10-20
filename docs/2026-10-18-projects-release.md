# Projects production release — 0.2.21

## October 18 follow-up: computer grouping, mobile and responsiveness

The operator subsequently authorized native workspace/project parity, left-aligned web project
headers and an expandable Other Computers section. Local/default-owner workspaces appear first;
remote workspaces sit below a divider and named computer headings. Browsing another owner does
not change the execution destination. Inline computer labels are removed from workspace rows.
The web follow-up is deployed and signed-in navigation, owner routing and project alignment pass.
Deployment, asset hashes, recovery and endpoint checks pass; one informational systemd event in
the bounded log window is classified by metadata only. See web-updates.md for this explicit limit.

HC performance investigation found repeated synchronous project and permission configuration
reads while assembling interface state. Fresh request-local snapshots now bound those reads,
while authorization and revision checks remain fresh for each mutation. Sidebar scroll persistence
is debounced. Failed uncertain tab commands back off per scope without changing their original
request identity or replaying them as new actions. This mitigates retry storms; it does not claim
that an unidentified rejected command has been repaired.

HC installed the first follow-up `ec8b213d382e+dirty.bb27c68d88d6` and passed preservation and navigation:
248 chats, 85 views, 109 content descriptors, 21 document authorization origins and 349 protected
receipts remain. Browser load states were unchanged; all 45 browser views were already unloaded.
The summary median improved from 1.70 seconds to approximately 0.50 seconds, but normal polling
still blocked the main thread. Responsiveness acceptance therefore remains partial. The dominant
remaining cost was 205 captured scheduled/manual runs being prepared again for display because
they retained source selections, overflowing the 100-entry preview cache. A separate read-only
test measured about 170 MB of logical reads per pass.

The latest signed candidate `ec8b213d382e+dirty.56031cdd7c35` preserves captured display contexts
and adds bounded synchronous MCP/path reuse. All 737 runtime tests, source checks and the exact
signed-package 146-view restoration/restart rehearsal pass. Regression cases cover captured source
hashes, per-record modes/environment, symlink changes, source deletion, cache expiry/bounds and fresh
future-run preparation. No authorization cache spans an event-loop turn or substitutes for mutation
checks. Synthetic file-operation reductions are not a live HC performance claim.

Personal installation and a second live restart are accepted: 25 chats, 113 logical views, 59
content tabs, 39 protected files, 4,642 history events and 13 protected retry receipts are preserved.
All three providers are available, the relay is online and the complete paired index has 273 chats.
The restored project page, locked owner filters, Other Computers expansion/collapse and sidebar
width pass visible UI checks. The native automation scroll method returned noWindowsAvailable
despite successful button/AX/screenshot interaction; no manual Personal scroll-latency claim is made.
Five summary requests have a median of 16.90 ms. Full-history requests are a separate endpoint.
HC installed the exact same signed artifact after the operator unlocked it and resumed its existing
destination chat. Source, signature, preservation, second launch and visible navigation passed.
The final independent summary median is **70.34 ms**, compared with 503.61 ms after the first pass
and 1,702.995 ms originally: a 95.9% median reduction. Normal idle main-process CPU was 8.9%
(approximately 34% before); aggregate RSS ranged from 1,121,861,632 to 1,155,153,920 bytes. No new
main-loop lag above 100 ms was recorded across approximately 55 seconds of normal idle/navigation
sampling. All 45 saved browser views stayed unloaded; no extra unloading or provider prompts were
used. This verifies a bounded improvement, not a promise about every future website or workload.

HC retained 248 chats, 86 current views (including one added after the earlier check), 109 content
descriptors, 21 document authorization origins, 4,642 history events and 349 protected retry receipts.
Seven historical interrupted records remain exact. All providers are ready; the paired index
converged. A separate Personal-side post-update check confirms both owners online, the complete
273-chat index and healthy Default-profile history synchronization with unchanged 90-day retention.
Existing uncertain tab-sync requests remain intact; the underlying rejection remains unresolved.

HC recovery reused the existing full data directory and refreshed changed content. Extended-attribute
synchronization unexpectedly retained a near-full set of originals rather than only a small delta;
the corrected coverage audit and acceptance proved the replacement recovery complete before those
redundant originals were retired. Two verified full recovery generations remain, and observed free
space increased by 3,113,492,480 bytes. No sparse-only transfer guarantee is claimed. Exact helper,
coverage, preservation and retirement receipts remain private; the destination checkout was unchanged.

Personal desktop recovery cleanup completed after the first follow-up: two full verified generations
remain, with one recovery application each and the matching source companion retained. Three
obsolete data/application targets totaling 2,684,137,848 logical bytes were retired after fresh
tree verification. Observed free space increased by 40,009,728 bytes; APFS sharing and concurrent
activity make that distinct from logical bytes removed. Compact manifests, acceptance and the
previous unlocked-signature evidence remain in private recovery records. Native/device backups
and live application data were untouched.

Final rotation for the latest accepted candidate is complete. Two verified full generations remain,
with no duplicate Applications rollback bundle. Recovery retirement removed 2,739,539,656 logical
bytes; released obsolete build/transfer payloads removed another 2,352,097,544 bytes. Total logical
retirement is 5,091,637,200 bytes, while observed free space increased from 158,175,993,856 to
159,260,061,696 bytes: 1,084,067,840 bytes (approximately 1.01 GiB). Phase deltas differ because of
concurrent activity and APFS sharing. Retained cold/app trees, current exact bundle/source/archives
and signatures passed verification. The current transfer, active Git checkout, preview workflow,
native/device recovery and live data remain. Compact private manifests and receipts record the
precise deletion inventory; no HC acceptance is inferred from Personal cleanup.

Private preservation verification was corrected for pre-existing workspace-to-project selection
chains, whose selected project roots deliberately have no parent ID. It also permits a cached chat
label to lose a legacy computer suffix only when the exact authoritative title comes from an
unchanged run file. Fourteen verifier fixtures cover both accepted cases and rejected identity,
selection, history, draft, title-origin and custom-title changes. No saved data was edited to pass
these checks, and no additional full backup or repeated installation was needed.

Native source and owner-scoped project workflows are implemented. All 124 unit cases passed on
iPad; the single phone WebKit timeout passed unchanged in isolation. Owner lifecycle, workspace
copy and cached/offline navigation UI checks pass on phone and tablet. The offline navigation
test found and corrected an initial Projects-to-Configuration fallthrough that issued an owner
request before selecting Chats. After unlock, the target profile was renewed using the existing
team/certificate; native Mac 0.2.21 / 2610.18.1 is installed and launch-verified. Native Mac container
hashing was unavailable under TCC. iPhone 0.2.21 / 2610.18.1 is installed and launch-verified after
the operator trusted the existing developer; all 1,675 original file contents and saved destinations
remain. iPad is installed with all 3,987 accessible original files preserved (13 preexisting OS
snapshot-cache files were inaccessible); its on-device security/trust check and launch acceptance
remain pending. Device copies resumed partial progress after transfer timeouts without extra full
backups. The phone retains two accepted recoveries; the iPad's bounded in-flight recovery remains
until launch/destination acceptance. Native Proteus still uses its original Personal Team identity
and the renewed profile expires October 25; the paid-team capture-app migration did not migrate
Proteus signing. Physical acceptance is recorded
independently in ios/PARITY-VALIDATION.md. The original
desktop-only scope below is historical and is superseded by this later native authorization.

The operator authorized production promotion of the reviewed desktop design, migration of the
existing installation, matching web changes and website deployment on October 18. Keep the
separate design-preview workflow for future experiments. The operator returned, confirmed both
Macs unlocked and authorized local acceptance, web deployment and then Work Mac migration.
This supersedes the preview-only hold for this reviewed feature set. Native iPhone/iPad layout
changes and unrelated queued fixes are not implied by this desktop/web rollout.

## Release state

Implementation and synthetic acceptance pass. The final 717-test runtime suite and source checks pass;
Electron migration rehearsals retain 112 legacy tabs, URLs/placement, drafts and original chat
bytes through restart and project deletion. Native browser view IDs may change on restart;
logical `contentTabId` identities are retained. Preview project deletion (including pending
input/live shell/drafts), source controls and nine synthetic paired-owner UI groups pass.

Web passes 81 PHP tests/724 assertions, three encrypted-cache tests, the new project workflow,
the complete two-owner browser regression, Vite and Pint. Final project UI acceptance also
moves browser, terminal and document descriptors between projects with their IDs and document
source authorization unchanged. The retained web archive is deployed and backend acceptance passes: 9,214 manifest files,
eight served assets and 14 endpoint checks, central recovery registration and an isolated restore
rehearsal. The bounded deployment log window contains only expected protected-file denials and
known database informational messages. Production authentication remains enforced. After operator sign-in, live checks verified owner
reconnection, workspace/project lists, locked chat filters, existing chat history and permission
controls, plus the global source library. The additional desktop-parity release is also deployed
and accepted: shared colors/icons, grouped owner-scoped navigation across Engine Room and remote
pages, fixed workspace tabs, chat heading and details cards, and a resizable sidebar match the
reviewed desktop design. Live checks confirm both owners, existing history and permission controls,
and width/expansion persistence through reload. The complete regression, manifest/served assets,
recovery/restore and bounded log checks passed again. Exact release identities and receipts remain private.

The first signed desktop candidate passed its synthetic rehearsal but failed the live preservation
check: saved views were discarded while the initial chat/shared-tab state loaded. All original
chat/schedule files and drafts remain unchanged, and the original 97-view cold snapshot is retained.
Production was gracefully stopped with no active work. The next preservation check retained every
view but exposed a saved-order and inactive-selection mismatch. Both are corrected without weakening
the verifier: atomic project relocation follows saved registry order, and native session validation
retains valid workspace-to-project selection chains. The corrected behavior passes a 146-view
rehearsal with existing registries, legacy peer aliases, duplicate browser views, live peer upgrade,
complete saved order, inactive selections and restart. Independent focused review found no blockers.
The exact signed package and local live/restart acceptance now pass: all 97 original views, saved
order and selection chains, 25 chats, six schedules, drafts, browser history and retry receipts
are preserved. All three providers are available after the operator renewed the existing Codex
sign-in. The accepted build is `ec8b213d382e+dirty.b3f17786651f`; private receipts pin its signed
archive and matching source. HC has installed this exact artifact and passed its own preservation,
second-launch and representative live UI checks: all 83 saved views, seven remembered selections,
248 chat records and protected retry receipts survive. The operator explicitly authorized stopping
three waiting turns before replacement; their histories and saved prompts remain. Reciprocal Default-profile
history sync has matching retained event-ID counts and hashes with a durable cursor and no error;
the refreshed paired index contains all 273 chats on both computers. One remote chat alias adopted
its canonical owner's `openedAt` during the existing metadata reconciliation. An independent owner
API read confirmed the exact timestamp; chat activity, touch time, order and selections were retained.
The original comparison evidence remains in the private receipts. HC recovery cleanup is complete.
The existing preview stays independent
with its permission experiments retained.

Local recovery retention is verified after acceptance: two full desktop recovery generations,
each with one recovery app, remain. Failed-attempt profiles, duplicate rollback apps and older
eligible generations were retired after protected-file, history and receipt comparisons. The superseded
first production build was also retired after the final signed artifact, matching source and HC
installation were verified. The two local cleanup stages increased observed free space by about
1.45 GB combined; concurrent activity and APFS mean this differs from logical bytes removed. Compact
diagnostic and retirement manifests remain in the private recovery records. HC independently
retains two byte-verified recovery generations, with database integrity checks and one recovery
app each. Retiring its older generation, duplicate apps and redundant transfer parts increased
observed free space by about 2.19 GB. Its live data, final signed archive and matching source remain
intact. Browser access was verified and the tested tab returned to its original unloaded state
through the supported guarded action, preserving identity and history.

## Production and preview separation

Production uses a host-owned project catalog, initialized from existing workspaces without
seeding sample records. Every workspace gains a stable default project. Existing workspace IDs,
chat files, captured execution context, approvals, schedules, provider session IDs, drafts,
browser profiles and credentials remain in their current stores. Organizational membership is
projected separately from execution scope; moving a chat never adopts destination permissions.

The source library registers existing reusable roots at application level and preserves existing
workspace selections and access behavior. Registering new sources grants no file access. Project
deletion redirects its contents to the chosen default; it does not delete conversations or files.

Keep `npm run desktop:preview` and `PROTEUS_DESKTOP_PREVIEW=1 npm run package:mac`. Their distinct
bundle identity, data root, mock browser storage, synthetic fixtures and private Codex home remain
isolated. Do not import preview chats or permissions into production during migration. See
[desktop preview](desktop-preview.md) for relaunch and retained-experiment behavior.

## Migration and recovery procedure (local, then Work Mac)

Follow [desktop updates](desktop-updates.md) and its two-generation retention policy. Use the
same tested signed artifact and matching source on both computers; do not independently rebuild
on Work Mac. Keep machine paths, hashes, process inventories and recovery receipts in private
operator records, outside this repository.

1. Check the Mac is unlocked before Apple signing/account checks. Preserve the installed bundle
   identifier and existing signing identity. Build and test the exact signed candidate, then
   freeze its source fingerprint, runtime manifest and archive SHA-256. Package matching source
   with `scripts/package-source.mjs`. An unsigned staging build is not installation acceptance.
2. Inventory the actual data/profile locations and current owner process. Check active turns,
   pending approvals, queued messages, schedules and terminals. Do not interrupt active work.
   Reuse existing destination authorization and the existing HC Codex chat after local acceptance.
3. Prepare one recovery generation for the idle installation. The actual full capture must be
   consistent after graceful owner shutdown in step 5. Include configured
   application data, desktop session, browser profiles/history, provider session references,
   pairing/configuration and the installed app. Preserve Keychain identities without exporting
   secrets. Reuse a valid capture on retry; do not create a new whole copy for each attempt.
4. Record a private before-inventory of all workspace IDs/defaults; chats including archived and
   unhoused; tab IDs/types/parents/order/hidden state/profiles/history; drafts; project/source
   selections; permission origins; terminal IDs; schedules and retry receipts. Check database
   integrity and backup coverage. Unknown fields and unavailable roots must remain recoverable.
5. Quit only the authorized idle owner gracefully, verify it stopped, capture and verify the
   recovery generation, then replace the app in place. Never uninstall, seed the preview, start a second runner on the same home, manually
   rewrite chat files, or reset browser/provider credentials as a migration shortcut.
6. Launch once. The owner creates the production catalog atomically and resolves legacy workspace
   chat views into default projects. Existing direct workspace resources, main/Team views, remote
   owner references and unhoused chats retain their meanings. Migration must be idempotent across
   a second launch and must fail visibly instead of silently dropping tabs at a size limit.
7. Compare the resulting inventory against the recovery receipt. Verify all logical identities,
   chat/history content, drafts, profile sessions, permission origins and retry records; account
   only for documented new project roots and placement changes. Open representative old chats,
   workspace/project lists, an unloaded browser and a document. Validate live terminal attachment
   without replaying startup commands. No real provider test should act on workplace data.
8. Verify authenticated reconnection to existing peers/account and project/tab/history coverage
   through the supported owner protocol. Check offline and older-host behavior. Repeat after a
   restart. Report installed and live-verified separately. Retain comparison receipts rather than
   another full after-copy; rotate only eligible verified generations and report free-space change.

If verification fails, stop further migration and preserve the evidence. Restore the matching
previous app/data recovery generation through the established procedure, checking for intervening
new work first. Do not run the old application against partially migrated data and assume rollback
is complete. Do not reset accounts, certificates or browser storage to hide a failure.

## Cross-machine behavior

Workspaces and projects have an owning computer. Paired clients read/edit that owner's metadata
and open the same conversations through the existing authenticated connection. Shared tab records
carry stable identities, placement, visibility and supported browser navigation metadata; they do
not transfer cookies, native processes, credentials, live terminal ownership or file permissions.
Existing account chat history/index and opted-in browsing-history synchronization remain separate
services. The migration itself preserves sharing settings. At local/HC acceptance, fulfill the
operator's requested history synchronization through the existing owner controls for those two
computers: inspect peer/profile status, enable the intended peer history sharing if needed, select
the supported retained-history backfill, and verify both directions. Do not broaden sharing to
unrelated peers or profiles. Profile metadata/settings synchronization is separate from cookies
and website login state; default-profile session storage stays local.

Project identifiers are namespaced by host in clients. A local project with the same ID as a peer
cannot receive that peer's chats or tabs. Older hosts keep their supported workspace interface
until upgraded. Offline state must be labeled and cannot authorize new owner mutations.

## Web deployment

Use the established website deployment workspace, [web update procedure](web-updates.md), and
website-project-operations skill. Test the production Vite bundle, PHP suite and synthetic
multi-owner/project workflows. This release uses host project APIs and existing account records;
do not introduce an unreviewed database migration into the code-only deployment route.

Build the exact deployable archive from `web/`, reject unmanifested files (including Finder cache
metadata), and run the restricted deployment client with one
stable release ID/archive, and resume that same request after transport failures. Verify central
recovery, restore evidence, all deployed hashes, served assets, HTTPS/auth boundaries and the new
log window. If a locked Mac prevents access to the existing SSH key, retain staging and retry
after unlock; never reset credentials or use an unreviewed deployment path.


## Work Mac handoff after local acceptance

The coordinator sends the following concrete instructions to the existing authorized Work Mac chat
only after the signed local candidate is installed and live-verified. Fill the immutable artifact
commit/archive hash and source fingerprint from the accepted release receipt; the unsigned
staging candidate is not an installation artifact.

> Update the existing Proteus installation to the exact locally accepted 0.2.21 signed artifact
> and matching source supplied by the coordinator. Preserve this Mac's own chats, workspaces,
> tabs, browser profiles/history, drafts, approvals, schedules, pairing and retry receipts.
> Follow docs/desktop-updates.md and docs/2026-10-18-projects-release.md. Stage and verify hashes
> and signing before replacement. Check the Mac is unlocked, then verify the actual owner has
> no active/queued/awaiting-input work; do not interrupt it. Reuse a verified recovery generation
> where valid, retaining at most two full generations for this target. Compare a private before
> and after inventory, allow only documented project-placement changes, and verify restart.
> Confirm project metadata, remote chat continuation, tab placement/navigation and the requested
> history sync with the already-updated local Mac. Do not copy another Mac's application data,
> cookies or credentials as a synchronization shortcut. Report staged, installed and live-verified
> separately, including preservation counts, failures, artifact identity and recovery/free-space
> receipts. Keep private machine details outside the repository. Stop before replacement if
> active work, signing or preservation cannot be verified; retain the staged artifact for retry.

The retained design preview is independent. Neither machine's production migration should
replace its data with preview samples or answer a waiting preview approval.

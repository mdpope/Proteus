# Unified browser history and queued corrections — October 12, 2026

Status: corrected local desktop installed and live UI verified; production web live; physical iPad/iPhone updated and launched. Proteus iPad on this computer is installed, launched and its live history controls verified. The user resumed HC installation after investigating Team Tools browser flashing on the old build.

## October 13 installed acceptance

- Latest local desktop is `88eb46f0db39`, adding the signed-package-verified Team Tools mounted-browser correction. All 66 logical tabs/drafts and 5,663 protected retry receipts are preserved. The prior `a21d780ec304` acceptance below records the earlier startup correction. HC final transfer staging awaits safe completion of its live permission wait.
- Local desktop corrected build `ec8b213d382e+dirty.a21d780ec304` passed signed-package acceptance and in-place installation. All 66 saved logical tab descriptors, their parent/profile/chat/workspace ownership and chat drafts were retained. 5,259 protected command receipts remained exact; both SQLite databases passed integrity checks. Original JSON, configuration, pairing and run data were preserved.
- Installed UI startup and workspace switching passed without the reported error. Engine Room showed date-grouped history, All non-private profiles, matching/no-match filtering and restored results. Copy chat link appeared in the tab menu; Run files & folders appeared separately below approvals. Live history returned a bounded two-row page from 2,750 records; the existing 90-day preference was retained.
- Relay connected. Live Copilot/Codex/Claude catalogs returned 19/7/13 models without stale/error flags. No paid provider turn was invoked. A 141.7-second local sample recorded no event-loop or long-stall events; API median 2.33 ms, maximum 20.79 ms. This does not establish that the previously reported HC hang is resolved.
- Web release `20261013T063152Z` / build `20261013T063141Z` is live. Verified recovery, isolated restore, 9,214 deployed hashes, nine served assets and 14 endpoint checks passed. Runtime configuration and schema were preserved. Authenticated production UI remains unverified because browser automation was unavailable.
- Native 2610.12.4 is installed on both physical devices, with launch/continued-process checks and seven protected files preserved byte-for-byte on each before launch. Saved destination indexes remained unchanged. Proteus iPad on the computer is installed and launched; stale LaunchServices registration was refreshed without changing signing or application data. Its dated owner-history rows, search/clear, existing retention and profile/backfill controls were verified without saving changed preferences. Actual computer-native Back loaded the prior public page and retained the forward entry; Forward restored the original URL/title/selected entry with all four entries intact. Original tab and history selection were restored. Physical touch/trackpad feel and full production multi-device traversal remain unobserved.
- HC remains on its prior build after completing a quiet old-build investigation; the user authorized upgrading afterward. Final `88eb46f0db39` is being verified/staged, preserving a live Copilot permission wait that prevents a safe restart. Neither superseded `d2eacd78cf87` nor `a21d780ec304` should be installed there.

## Startup regression correction

The initial desktop rollout exposed two saved local browser views sharing one synchronized
content-tab ID. Reconciliation selected one view but assigned into both local positions, leaving
an undefined tab and producing the reported `id` error. The corrected ordering expands every
shared descriptor to all matching local views, retaining stable order and existing history.
The cold-start renderer fixture fails before and passes after the fix, including subsequent sync
and the same identity under a different parent. Installed acceptance then passed. This was a
desktop-renderer-only correction; deployed web and native code did not require rebuilding.

Earlier predeployment statements below are historical and superseded by this section.

## Authorized scope

- Account-backed profile definitions independent of Life; all non-private history including
  Default stored locally in worker-owned SQLite, mobile upload/query and paired desktop replication.
- Shared logical per-tab navigation and selected entry, preserved Forward history, idempotent
  operations, protected redirects/local unload, native lists/gestures/previews/favicon fallbacks.
- Copy chat link menus/routes, Run files & folders organization across clients.
- Workspace agent-tab destinations and remote workspace chat-list identity correction.
- Preserve legacy history, configuration, chats, profiles, pairings and retry receipts.
- Test desktop/web/native then update both computers, computer-native iPad app, physical devices
  and production web through the established approved procedures. Separate staged, installed
  and live-verified status; no new rollout claimed yet.

## Validation and rollout

- Worker-owned SQLite: 50,100 visit rehearsal verified paged replication, reopen, original JSON
  preservation and bounded main-loop responsiveness. Derived full-text index row IDs now match
  visit rows, reducing retention cleanup from 218 seconds to 3.6 seconds in the same fixture.
  Median indexed query 0.30 ms; P95 0.57 ms. These are synthetic measurements, not physical disk I/O.
- Desktop Chromium: authoritative Back/Forward and selected-entry parity; 500-entry stack over
  512 KiB hydrated through pages; actual loaded document and private sign-in preservation checked.
  Idle synchronization produced zero redundant tab changes, browser commands or navigation completions.
- Native: iPhone 108 unit tests and three final history/settings UI checks passed; the final
  test-only extension of the unavailable-profile guard also passed. iPad 107 broad unit tests
  passed before the final guard, followed by focused final profile/guard tests and all three
  history/settings UI checks. Earlier browser/conflict acceptance passed on both form factors.
  Owner-provided history works without website-account sign-in. Physical gesture feel remains
  a separate installed-device check.
- Web: authenticated disposable two-owner relay rehearsal and 81 Laravel tests / 724 assertions pass.
  Owner-initiated navigation refresh now passes while scope metadata revision remains unchanged.
- Existing installed applications and production site remain unchanged at this checkpoint.


## Final preservation review

573 Node tests and static checks passed after backend/source integration.

- New history stores default to retaining all visits; explicit existing retention preferences remain.
- New navigation receipts use compact acknowledgements rather than duplicate full history windows;
  existing receipt rows remain readable and untouched.
- Bounded scope hydration must accept 100 browser tabs without exceeding the worker request limit.
- Native conflict resolution preserves pending operations for unrelated tabs in the same scope.
  Explicit choices select owner history or preserve the local destination as a new tab in the
  same scope. Two-tab queue/restart and focused UI regressions passed.
- Deployment awaits this computer, physical iPad and physical iPhone unlock. Both physical
  devices still report 0.2.12 / 2610.12.3. The final unsigned native Release build succeeded;
  prior staged native artifacts are obsolete and must not be installed. No signing or
  installation occurred in this rollout. Recheck unlock before signing, then update the owning
  desktop before installing clients that depend on its new history API.
- The existing SSH public key is accepted by the server, but the locked computer cannot sign
  authentication. No key, credential, agent or server configuration changed.
- Web build `20261013T063141Z` / release `20261013T063152Z` is staged with the final owner
  settings catalogs and owner history filter; all 9,214 files and the archive checksum verified. The previous unactivated
  `20261013T055952Z` and `20261013T061649Z` releases are superseded and must not be retried. The first release’s SSH failure occurred
  before capture or activation, so production remains unchanged. The replacement has not been
  deployed. Preserve its exact identity for retry after the existing protected SSH route is
  available; do not reset credentials or change access.

## Owner history settings parity

Desktop and web settings use the owning computer’s paired-computer and cached profile catalogs,
not the viewing client’s lists. Default is always available. Hidden existing peer configurations,
retired profile selections and unknown settings survive saves. New or enlarged replication grants
require an existing owner pairing; catalog reads cannot create grants or trigger account refreshes.
Focused backend 39-case and actual desktop UI acceptance pass. The same recording, retention,
profile and backfill controls are implemented in native Engine Room; online/offline settings acceptance and the final unsigned build passed.

The final owner-profile review also found that history search filters used the viewer account’s
profile list. Shared and native filters now follow the selected owner’s catalog, including paired
viewers without a website sign-in. Owner switches clear previous-owner selections. Focused UI
acceptance passed and the replacement web artifact is staged.

Desktop/web owner-only history-filter UI acceptance passed, including historical selection
preservation on refresh and immediate clearing on owner switch. The replacement web archive is
verified; production remains unchanged.

Native history opening now preserves the visit’s profile and assigns computer ownership only to
a newly created tab. An unavailable named profile cannot retarget the previously selected tab or
close a source tab during transfer. Mobile All-profile history combines only the selected owner’s
cache buckets and deduplicates stable event IDs. Final simulator acceptance passed.

## Follow-up: Team Tools browser flashing

The operator reports repeated “Preparing tab” flashes between page contents on the older HC
installation. Investigation must capture the old build before replacement and recheck afterward.
The isolated Electron reproduction confirmed that four unrelated application-state updates caused eight Preparing placeholder insertions and replaced the Team toolbar/surface. The correction retains the mounted surface through ordinary state and shared-title updates, while explicit navigation, account, load/profile and layout changes still invalidate it. The corrected fixture preserves the native page marker, 450px scroll position and unfinished address edit, with zero placeholder insertions or native hide/show calls. All 573 Node tests and static checks pass. The broader toolbar fixture reached its final window-resize assertion but timed out waiting for an exact 850px width; this is not counted as a full pass.

HC’s quiet old-build observation retained the selected browser ID, process, URL and title; it did not capture a live flash or page reload. The renderer reproduction establishes a concrete refresh cause, not proof that every reported periodic hang has been resolved. Final signed-package and installed checks remain pending.


### Team Tools correction: signed and installed locally

Signed desktop `88eb46f0db39` passes package identity/signature, preserved Copilot vendor bytes, isolated launch and live catalog checks. The exact signed executable also passes the Team refresh renderer fixture. Local in-place installation preserves 64,454 original data files in the cold backup, all 66 logical tabs and ownership mappings, drafts, 2,750 visit records and 5,663 protected retry receipts; both SQLite integrity checks pass. The restored chat is visible without the earlier startup error. Local Team account sign-in is unavailable and unchanged, so actual authenticated Team-page acceptance belongs to HC; the signed regression uses an isolated synthetic account/page.

HC received immutable pins for the new signed application/source pair through the established private transfer. Its live Copilot permission wait prevents a safe restart; staging and installed status remain distinct. No older transfer should be installed. Web and all three native installations remain on the accepted unified release; the latest correction changes only desktop renderer modules absent from those clients.

The final local build’s 141.8-second quiet sample recorded zero event-loop/long-stall events, API median 3.29 ms and maximum 8.05 ms. Copilot/Codex/Claude remain available with 19/7/13 catalog models. These measurements do not establish HC behavior.

HC confirms final `88eb46f0db39` fully staged and verified: archive/source/runtime/manifest hashes, exact bundle-tree checksum and original signing identities match. It remains on the old installed build. Two installation holds remain: a live Copilot permission wait, and the destination chat’s direct resume confirmation because its attempt to read the originating human chat failed with an unavailable-host error. The coordinator has the explicit human authorization; no replacement or work interruption was performed by HC.


### Internet Search popup fill correction — October 13

Desktop `68095bceb17e` supersedes `88eb46f0db39` locally, removing the inherited 140px textarea cap from the enlarged Internet Search popup. The input consumes available body height; controls stay below it and long text scrolls within it. Static checks, signed-package acceptance and actual signed-renderer UI at 1440×960, 850×650 and 1100×520 pass, including Cancel and no horizontal overflow. This CSS-only follow-up changes no execution or persistence behavior.

In-place installation preserved 64,455 original cold data files, all 66 logical tabs/drafts, 6,313 protected receipts and 2,750 visits. Both SQLite databases remain valid; provider catalogs remain available. Installed startup is visible; further popup interaction stopped when computer-use reported that the user changed the application. Exact signed-popup acceptance uses the isolated fixture. HC received final immutable private transfer pins for staging; its original active-work hold is cleared, but destination direct confirmation still awaits resolution of an unavailable parent-chat lookup. Web/native do not use this popup markup; their accepted releases remain unchanged.

HC confirms newest `68095bceb17e` fully staged and verified (all pins, bundle tree, 208 runtime/source hashes and original signatures). Fresh safe-idle check passes; direct resume confirmation is the sole remaining hold. HC is not upgraded: prior `dcb5e9040a88`, four drafts, 90 main tabs and four Team tabs remain intact.

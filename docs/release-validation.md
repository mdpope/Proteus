# Release acceptance — October 4

The operator requested these checks after installing the prepared updates on Build Mac and
iPhone. The operator subsequently authorized iPad installation and account connection; latest
receipts below supersede the earlier deferral. Preserve existing records, pairings, schedules and tabs.

- [x] Build Mac: install the signed release in place; verify runtime parity, graceful restart,
  open-tab order/selection, shared-relay connection, unchanged settings and existing pairings.
- [x] iPhone: install in place with the same signing identity; compare destination index/encrypted
  caches before launch, then verify process and reconnection. Do not uninstall.
- [ ] Website: reproduce the empty destination selector shown by the operator, distinguish a
  missing browser pairing from an offline Mac, and verify connections to both saved destinations
  in the browser profile the operator actually uses. Recheck across navigation and reload.
- [x] Desktop Life food library: paginate food items; verify bounded page size, Previous/Next,
  stable ordering, search resetting to the first page, and food detail/edit access across pages.
  Reading/search/pagination must not modify nutrition records.

Record actual observations below; a successful source test is not installed-app acceptance.

## Installed observations — 17:24–17:34 UTC

- Build Mac updated twice in place: first the prepared shared-client release, then the food
  pagination build. Final signature and all 91 runtime-file hashes matched. Shared relay returned
  online with the same host and three paired-device identities; six tabs and active selection,
  settings and processing gates were preserved. Browser native-view IDs and scheduler last-poll
  timestamp legitimately changed during restart. Private rollback/receipt is retained outside Git.
- iPhone installed with the original identity and bundle ID. All three existing app-data files
  were byte-identical immediately after installation. Launch/process verification passed; the
  original two destination IDs and selection survived. A fresh device index has the labels
  Work Mac and Build Mac. The selected Build Mac reports this iPhone online,
  proving an authenticated peer connection. No iPad action was performed. Physical Life sign-in
  has not yet been completed or verified.
- Installed food UI showed **1–25 of 219, page 1 of 9**, then **26–50, page 2 of 9**.
  Searching from page two reset to **1–25 of 53, page 1 of 3**. Source/disposable UI tests also
  passed selected-food version/edit navigation and final-page boundaries, without production
  record writes. Full regression: 213 Node tests, static checks, 16 Life UI groups and the signed
  package smoke test passed. Recheck these controls after the subsequent API transport change.
- Safari reproduced the operator's empty destination selector. Earlier successful browser
  pairings belonged to Codex's separate browser profile. The operator clarified that destinations
  must instead persist with the website account across browser sessions; implementation underway.
  No Safari or website-account device has been enrolled by this validation.

## Additional requested acceptance

- [ ] Account destinations survive sign-out/sign-in and a fresh browser session; automatically
  reconnect the selected destination. Verify independent simultaneous clients and account isolation.
- [x] Desktop Life uses the same authenticated website API as mobile; no direct SQL/SSH fallback.
  Real sign-in, restart, account reconnection and food pagination verified. Native mutation/evidence
  and sign-out/refresh edge cases are covered by disposable fixtures, not production writes.


## API and account release — 18:00–20:20 UTC

- Website release `20261004T175555Z` is live and matched all 9,196 manifest files. A fresh
  independently restored backup preceded its one additive destination-table migration. Existing
  environment/native OAuth client and nutrition counts/hashes were unchanged. Authentication
  boundaries passed; the post-activation application log was empty. Safari loaded the new
  account-persistence interface, but account key enrollment remains pending explicit confirmation.
- Desktop now uses website API transport only. The exact old database configuration was archived
  privately with mode 0600; the four existing Life files remained unchanged. All seven tabs,
  settings and three pairings were restored, with the relay online and waveform icon installed.
  Initial migration exposed signed-out Life-tab removal; the corrected opt-in-only visibility
  passed actual process restart/disable tests, and the user's original Life tab was restored.
- An idle HTTP client exposed a graceful-shutdown wait. Two tests reproduced incomplete
  headers/body hangs before the fix and verified connection/lock cleanup and restart afterward.
  Final regression passed 232 Node tests, syntax checks and signed-package smoke with 19 live
  Copilot catalog models. No operational schedule ran as a test.
- The operator completed the real desktop website sign-in. The installed app independently
  reports configured/ready, website-api mode and the authenticated account. Native food screens
  read **1–25 of 219, page 1 of 9** and **26–50, page 2 of 9** through that API. No production
  food/meal writes were made for acceptance. Source UI tests cover search reset, later-page edits,
  full meal choices, identity isolation, sign-out cleanup and correct pending Setup behavior.
- Ten actual-API-fixture UI groups passed, including connected Setup spacing at 390/1400 px.
  The requested badge/action spacing and pending sign-in display fixes are prepared for the
  final in-place update; its connected-account preservation and live screenshot are recorded below.

Still pending: account-based enrollment of both Macs and browser-session reconnection acceptance;
physical iPhone Life sign-in, latest iPad update, full live evidence/write acceptance and controlled
transcription replacement. Existing processing owners remain unchanged and replacement gates off.


## Final spacing install — 20:17 UTC

The final signed package was installed in place and all 93 runtime files matched source.
The host completed graceful shutdown, preserved all seven tabs/selection and three pairings,
and reconnected to the shared relay. Life's encrypted website credential was byte-identical
through bundle replacement, and startup independently returned ready API mode for the same
account. Other settings and processing gates were unchanged; private rollback is retained.

The corrected connected Setup layout passed measured gap/overflow checks in the ten-group
API UI suite at 390/1400 px. Final installed-app screenshot verification was unavailable: macOS
ScreenCaptureKit returned capture failure and accessibility exposed only the native window shell.
This does not replace a visual acceptance claim. The authenticated local API remained healthy.


## Work Mac — coordinated final update

The explicitly authorized `Plan Copilot scheduling` chat on Mac.home reports runtime `68463db`
installed and matched, clean restart, shared relay online, three existing pairings retained, and
unchanged tabs/settings/all five schedules. Its 232 tests and packaged-app checks passed. Life
remains disabled. No account-wide connection keys or new peer access were created. This updates
the remote host; it does not complete the pending website account enrollment.

## October 4 — queued parity update and targeted security source review

Planning/documentation only; no new feature was implemented, packaged, installed or deployed.
Reviewed the website account destinations/MFA/PKCE/Life authorization paths, encrypted host and
relay protocol, desktop peer allowlist/storage, native navigation and rejection handling, Standup
storage, shared shell/usage and browser-history boundaries. Findings and future acceptance gates
are SEC-01–06 and PAR-01–10 in `planned-updates.md`. This was not a live penetration test, exhaustive
API audit, fresh visual parity acceptance or independent cryptographic review.

The existing focused baseline passed **23 tests**:

```text
node --test test/remote.test.js test/relay-browser.test.js test/web-remote.test.js test/desktop-peers.test.js
```

Fixtures used temporary synthetic hosts, local loopback relay sockets, rehearsal/fake provider
content and disposable protected-storage substitutes; no live account key, production database,
real chat, operational schedule or installed app was used. The first sandbox attempt passed five
non-listening checks and failed eighteen fixtures with `listen EPERM`; the authorized rerun with
loopback access passed all 23. Existing tests do not cover or fix the newly prioritized forged
revocation, account-session grant, aggregation/cache or resource-management requirements.
Documentation validation checks whitespace, relative links and preservation of original content.
Previous production acceptance holds remain unchanged.

## Cross-client parity build — October 4 evening

Implementation and isolated test status are in `parity-release.md`. This supersedes the earlier
planning-only checkpoint. Desktop/web/mobile feature work is implemented; signed native release
preparation is ongoing as browser-context-menu/overview additions finish. The operator authorized
Build Mac updates and asked for an unlock prompt for iPhone. Mac preflight observed zero active
or waiting chats, an online relay, three pairings, 11 tabs and a ready API Life account. This is
preflight evidence only, not installation.

Initial Node regression: 240/240 passed. Review then fixed invalid history starving the upload
queue, restored native pages becoming visible after leaving, sensitive pairing URLs entering
history, and a history-size/reopen mismatch. Fifteen focused tests passed; native resource/lifecycle
fixture passed nine groups, including an actual asynchronous restore selection regression. Remote
resource access gains a separate device grant instead of silently broadening old pairings.

See the final appended receipts for actual package/install/deployment results. Do not infer native
APNs entitlement, server delivery, production Team consent, or pair-once enrollment from tests.


## October 4 final parity receipts

Final runtime commit `295be2d`: 244 Node tests, 22 browser-action checks, 13 history checks,
21 desktop parity checks, 9 native-resource checks, and focused remote/security suites passed.
Laravel passed 76 tests/666 assertions; the native build passed 26 distinct unit cases plus focused
phone/iPad UI and real disposable WebKit download preparation. See `parity-release.md` for exact
coverage and platform limits.

Build Mac is installed and verified with 103 matching runtime files, original signing/vendor
identity, 11 tabs, three pairings, six schedule files, original settings and Life session retained.
Website release `20261005T000810Z` is live with 9,209 matching files, 14/14 public checks,
verified central recovery and isolated restore before and after deployment. Web Push worker is
configured/active; receipt does not establish device delivery.

Physical phone/iPad installation and shared-app OAuth consent remain pending. HC final build was
dispatched; its Codex connection was unavailable before a final installation receipt could be read.
No HC installation, account enrollment, new resource permission, APNs entitlement or operational
schedule execution is claimed. Pre-existing MariaDB system-table maintenance is recorded separately.


## October 4 browser-home and package-test follow-up

Both main and Team Tools browser homes now start at the search controls instead of vertically
centering an overflowing history. Long titles/URLs stay within the available width. Local and
shared history each initially show 25 entries, with a More button for subsequent entries. The
local API retains its default page size of 50 for other callers and bounds requested sizes.

Validation: 244/244 Node tests and static checks passed. Sixteen isolated Electron UI checks
passed with 77 local and 73 shared synthetic visits, including the narrow docked Team layout,
visible search at scroll position zero, no horizontal overflow, pagination, filter reset and
retrying a failed second page without skipped/duplicate records. Main and docked screenshots
were visually inspected. These checks use disposable profiles and the test-only mock Keychain.

The packaged smoke test also isolates synthetic cookies from the real login Keychain; a copied
ad-hoc-signed bundle passed signature/vendor checks, launch, synthetic cookie persistence and
a live 19-model Copilot catalog check. This does not validate real Keychain access. Production
launches retain native Keychain behavior. Personal/HC installation of this follow-up remains
pending at this checkpoint.

Shared-app OAuth consent has completed on Build Mac: authenticated app and Team-list
endpoints returned success for the existing Life account. Its legacy roster and shared Team
list were empty, so no roster was imported. HC recovery verified its existing runtime, relay,
three pairings and disabled schedules; no Keychain items, passwords or access rules changed.
Physical iPhone discovery is being retried over its existing Wi-Fi pairing at the operator's
request. iPad remains deferred.


## Final follow-up device receipts — October 5 UTC

Build Mac: `8e3ab51`, exact 103-file parity, existing signing/vendor identities, normal launch,
shared API and relay healthy. Twelve tabs/selection, Team state, histories, three pairings and
resource grants, settings, account and all run/schedule files survived. Native screenshots confirm
visible search/URL controls in main and Team new tabs; accessibility confirms 25 local rows and
More controls. Original selection was restored. Full private rollback retained.

iPhone at 02:30 UTC and iPad at 02:35 UTC: both installed in place over their existing Wi-Fi
pairings. Original universal build, signer and 25 inputs verified. Three app-data files and
preferences stayed byte-identical before launch, both destination identities and selection
survived launch, and running processes were independently confirmed. The operator authorized
iPad account connection; its system authentication flow needs on-device interaction. This is not
proof of mobile shared-account or background push delivery.

HC: `8e3ab51` installed and all 103 files/signatures verified. Two tabs, three pairings, settings,
permissions and five disabled schedules preserved. Normal production startup is waiting on the
real Safe Storage prompt, with no test mock flag. The user has the secure-dialog handoff; relay
and provider acceptance remain pending. No Keychain reset, ACL/password changes or data deletion
were made. Full previous application/state recovery is retained.


## Message playback controls — October 5 UTC

Completed assistant messages now have Copy and local Read Aloud actions. Playback exposes
Pause/Resume, Stop and a text-position scrubber; seeking restarts at a word boundary and a paused
seek waits for Resume. No duration is estimated and no provider or cloud speech service is called.
The website and desktop share the same controller. The native client uses AVSpeechSynthesizer
without modifying the app audio session, microphone permission or background modes.

Source validation: 244 Node tests and static checks pass. All 23 website synthetic-browser groups
pass, including local-only voice selection, copy denial, pause/seek, refresh continuity and focus,
and navigation/account/disconnect cleanup. Both iPhone and iPad simulators pass seven focused
native tests and the complete controls/navigation UI flow, including actual system-speech
word-range callbacks and unchanged audio-session configuration. Native build has all 25 source
inputs verified and retains the original signer/profile. Website browser speech tests are
synthetic; physical audible output is not claimed from muted or simulator checks.

Desktop fixture: all 21 groups pass, including real muted Electron local speech and the actual
Pause → seek → Resume → Stop controls. The engine exposed 180 local voices. Tests use a
disposable profile and mock Keychain; production does not. Signed package smoke also passes.

Build Mac: `68a1226`, original signer and all 104 runtime hashes verified. Normal launch,
relay, Life and shared API are healthy. Twelve tabs, Team state, histories, three pairings,
resource grants, settings and all run/schedule files survived; account and encrypted Life
session bytes were preserved. Full rollback/receipt:
`/private/tmp/proteus-message-actions-install-20261005T040408Z`. The installed workspace
screenshot was observed, but native UI automation failed during the reply-icons inspection.
An earlier click applied late and left the existing `test table` chat selected instead of the
original New tab; all 12 tabs remain intact. Further attempts stopped, and no message was
copied, spoken or submitted. Installed reply-icon visual acceptance remains unverified; the
disposable real-Electron controls and speech tests above passed.

iPad at 04:03 UTC and iPhone at 04:06 UTC: signed universal message-action build installed
in place over existing Wi-Fi pairing. All 25 inputs matched, app data/preferences stayed
byte-identical before launch, both Mac destinations and selection survived, and processes
were independently confirmed. iPhone's first attempt correctly stopped while locked; the
operator then unlocked it and authorized the successful fresh check. Full receipts are in
`ios/PARITY-VALIDATION.md`. Physical audible playback and recording coexistence remain unverified.

Website: `20261005T040049Z`, archive hash and all 9,209 manifest files matched. New protected
recovery `20261005T034455Z-postdeployment` was independently restored before activation through
the authenticated Codex in-app Virtualmin session. Runtime configuration, schema and nutrition
counts/hashes remained unchanged. All 14 endpoint checks pass. No Laravel errors appeared; the
one Apache error was the expected protected `.env` denial. A bounded MariaDB sample contained
95 known `column_stats` issue entries and five other entries, with no other failure category;
it is not a complete journal-window review. Existing server-wide maintenance remains separate.

HC remains on `8e3ab51`: its process is blocked in real Keychain access and its API is
unresponsive. It was left untouched; no new install, Keychain deletion/reset or ACL change
occurred. Read-only diagnosis found the login Keychain already unlocked and the stored item
listing Proteus as trusted. The changed ad-hoc identity is a likely trigger for renewed consent,
not proof of the reported password-rejection cause. The protected prompt cannot be inspected
through the available UI tool; exact wording/buttons have been requested from the operator.


## Empty desktop connections — October 5 follow-up

The operator's current password successfully unlocks HC's login keychain, but authorizing the
Proteus item and saving access changes failed even with local keyboard/trackpad input. The
keychain is unlocked; no password mismatch or Screen Sharing denial was established. Nearby
code-requirement failures lack explicit requester attribution, while Proteus partition records
and changed ad-hoc signatures support an app-trust concern. The item-edit rejection is not
claimed resolved. No Keychain item, password, access rule or stored secret was changed.

HC's API then resumed: relay online, three incoming pairings and all three providers available;
settings and five disabled schedules unchanged; no active chats or PTY jobs. Life is disabled.
Stat-only inspection confirmed `life/website-session.enc`, `desktop-peers.enc` and
`desktop-chat-index.enc` are all absent. The combined startup index nevertheless probed
Safe Storage and attempted to encrypt an empty cache. The fix avoids both calls for an absent
peer store and zero-peer index, leaves orphan caches untouched, validates existing credential
records transactionally, and checks protected storage before a new pairing exchange.

Validation: all ten focused tests, all 251 Node tests, and static checks pass. Coverage includes
zero Safe Storage calls during repeated empty indexes and local-chat API requests, preserved
orphan caches, corrupt/inaccessible/oversized/dangling credentials failing closed, guarded
first pairing and encrypted writes, plus real encrypted cache/restart/revocation flows.

A prior bundle-only rollback was reviewed and prepared but not performed because the current
host recovered. Core data formats are compatible with `68463db`, but that older runtime drops
newer workspace descriptors on restore; a fresh current profile/workspace backup is required
if rollback is ever needed. Installation of the narrow startup fix is recorded below.


Build Mac installed `a1fc629` at 04:29 UTC. All 104 runtime hashes and original signer/vendor
requirements matched. Normal launch, relay and same-account Life/shared API are healthy.
Twelve tabs/current selection, Team state, histories, three pairings/grants, settings and all
run/schedule files were preserved; encrypted Life session bytes are unchanged. The installer
verified regenerated native browser IDs before accepting restored workspace state. No UI
navigation was performed. Full receipt and rollback:
`/private/tmp/proteus-empty-peers-install-20261005T042938Z`.

HC prepared the same exact commit and passed all 251 tests, ten focused tests, static checks
and its isolated packaged smoke. Automatic approval review blocked app replacement because
the HC chat retains an earlier direct instruction to wait and did not accept the coordinator's
later authorization as lifting it. No process was stopped or app replaced. The fresh direct
approval request identifies the prepared build and data-preserving normal restart; install
acceptance remains pending.

## Current desktop and native acceptance — October 5, 05:22 UTC

This entry supersedes the earlier pending HC installation and older native build status above.
Build Mac installed `17719ea`: all 104 runtime hashes and signing verified; 13 tabs, three
incoming pairings and existing account/data retained. Receipt and rollback:
`/private/tmp/proteus-visit-metadata-install-20261005T050835Z/receipt.json`.
The HC coordination chat independently confirmed `17719ea`, 104 runtime hashes, three tabs,
three incoming pairings, five disabled schedules and nine local chats. Relay and all three
providers are healthy; no startup Keychain prompt occurred. No outgoing desktop peers exist.
The underlying item ACL/authorization rejection is not proven repaired, and no Keychain item,
password or ACL was modified. Cross-Mac pairing setup remains pending. The authorized HC
Standup import of eight members was verified earlier; no actual member names are recorded here.

Native source `1101c3c831d4effd0503f3f5ae451cc1f7dab278` was installed in place on iPhone at
05:20 UTC and iPad at 05:21 UTC. Both guarded installers verified 25 native inputs, six Markdown
resources, the full bundle manifest, original signer/team/profile and fresh unlock state before
backup and immediately before installation. Each device's four retained app-data files and
preferences were byte-identical before launch. Both destination IDs and selected destination
survived launch; running processes were independently confirmed. Neither app was uninstalled.

- Universal build receipt: `/private/tmp/proteus-client-browser-native-release-20261005/build-receipt.json`.
- iPhone receipt: `/private/tmp/proteus-iphone-client-browser-update-20261005T052037Z/receipt.json`.
- iPad receipt: `/private/tmp/proteus-ipad-client-browser-update-20261005T052106Z/receipt.json`.

The build preserves the existing profile, expiring October 10 at 23:29:01 UTC, without APNs
entitlement. It adds device-timezone chat rendering, authenticated host-name refresh for exact
matching selected/background destinations, localized visit timestamps and visiting-device
metadata, 25-row native history pagination, and same-tab browser navigation with observed
back/forward/loading state. The only added local preference is `browserHistoryDeviceId`, a random
installation UUID created lazily when an authorized safe visit is recorded; it is not a hardware
identifier and is not based on the selected Mac.

Focused simulator evidence uses synthetic records and local HTTP pages on iOS 26.5/Xcode 26.6:

- iPhone timestamp/destination verification: 19 unit and four UI tests passed (`proteus-apple-TnCBXv`).
- iPad: ten destination tests, one timestamp unit test and the rendered timezone UI regression
  passed (`proteus-apple-p2Kcmc`). Summer/winter formatting and a shared UTC preference unable to
  override the device timezone are covered.
- History: two unit tests and one UI test passed on each device (`proteus-apple-kpiaFZ` iPhone,
  `proteus-apple-YMJ3Lo` iPad), including device identity, old records, timezone changes and More.
- iPhone: all 12 native parity unit tests and three relevant UI tests passed
  (`proteus-apple-r4bgtS`). iPad's browser unit plus browser/history UI tests passed
  (`proteus-apple-zeFIbA`). The real WebKit tests keep the tab ID/count and view identity while
  navigating, exercise back/forward/refresh, and verify unload invalidates stale observers.
- Final browser UI regression passed after the last styling changes on both devices
  (`proteus-apple-Pb8exT` iPhone, `proteus-apple-pehJvU` iPad). The final iPad screenshot was
  visually reviewed for selected underlines, dividers, + Browser and the grouped toolbar.

Result bundles reside under `/var/folders/h8/p0_ht00j4wz3gbnr_s2nrf940000gn/T/`, in each named
directory's `Tests.xcresult`. Final iPad screenshot:
`/private/tmp/proteus-ipad-final-browser-attachments/1de0c170-36c0-54da-841d-e1d2bcdae254.png`.
Source whitespace checks passed. These simulator checks are distinct from physical UI acceptance.

Personal's fresh API at 05:22 UTC observed both physical mobile clients online; the closed web
client was offline. Actual shared-Team account consent on the physical iPad remains unverified.
Website source `4e75600` is tested/frozen and release `20261005T051822Z` is staged, not live;
current release remains `20261005T040049Z`. Until activation, the existing API strips new optional
visit fields, so in-flight device metadata retention is not claimed. Physical audible playback,
recording coexistence, APNs delivery and cross-Mac outgoing pairing are still separate checks.


## Website client corrections deployed — October 5, 05:41 UTC

This receipt supersedes the staged website status above. Release `20261005T051822Z` is live;
all 9,209 manifest files matched. Schema, runtime configuration and nutrition counts/hashes
were unchanged. All 14 public endpoint checks passed, including authentication boundaries,
login branding, protected environment-file denial and relay health. The previous release
remains available for rollback; private receipts and recovery evidence remain outside Git.

Fresh encrypted recovery was centrally registered without rotation. The original isolated
restore passed nutrition, DDL and native-ledger checks, but its comparison with later live
protected rows failed as live state drifted. The operator explicitly approved the narrow
supplemental-verifier correction and deployment. That check verified all 18 protected tables
against exact complete INSERT byte streams in the immutable captured SQL, including empty
tables and `app_records`, and repeated capture-integrity, nutrition, DDL and native-ledger gates.
It only read the existing isolated database: no new restore, production write or database deletion.
The original failed receipt and isolated database remain retained. No stable live state is claimed.

The release deploys unified account/browser destination lookup, authenticated host names,
explicit connection states, desktop-style chat filters/main tabs and localized visiting-device
history metadata. The authorized eight-member Standup list was verified in the live website UI.
Default Mac, Chats/main-tab navigation and reload acceptance remain pending in the operator's
actual authorized browser context.

Laravel and relay Apache recorded no new events. Website Apache recorded one error during the
audit; classification is pending, so it is not yet asserted to be the intentional `.env` denial.
PHP/MariaDB/push journal activity also remains to be classified. Endpoint success alone does
not establish a clean log review. Existing MariaDB system-table maintenance remains separate.

Both physical native clients remain on `1101c3c`, with saved Mac labels subsequently refreshed
from authenticated host metadata. Both Macs remain on `17719ea`. Cross-Mac pairing is now in
progress after HC coordination returned; completion is not claimed. Physical shared-Team consent,
audible playback/recording coexistence and APNs delivery remain separate acceptance checks.


## Engine Room navigation follow-up — predeployment validation

Live acceptance reported Connections returning to Resources. A synthetic delayed-response
browser test reproduced a concrete early-click error: tab rendering accessed preferences before
shared app data arrived. Button changes also left the previous `?tab` URL unchanged, so reload
restored the old section. Source now waits for state, preserves selected tabs in the URL, handles
Back/Forward, and rejects stale Connections results while closing their temporary stores.

All six focused browser groups and the existing 21-group Laravel shell suite pass; local assets
build successfully. At this checkpoint the changes were not yet deployed. They establish the early-click and
reload fixes, not proof that every observed live navigation symptom has the same cause. Repeat
Default Mac/Connections/Chats navigation acceptance in the operator's browser after deployment.


## Pairing, staging and log-classification checkpoint — October 5

Personal → HC is paired, saved and observed online as `workstation.example.test`. Its encrypted peer file is
275 bytes and index cache 4,115 bytes; the desktop Chats count increased from five to fifteen.
No private chat titles or roster names are included in this record. The operator approved both
final pairing clicks. HC → Personal nevertheless remains blocked by Keychain access; there is
no bidirectional-success claim.

HC still runs the ad-hoc-signed `17719ea` installation. An exact-runtime artifact signed with a
valid Apple Development identity was prepared and transferred through the authorized private
GitHub draft route. Guarded installation is waiting for the active HC job to finish naturally;
no interruption or completed install is claimed. Keychain credentials and access rules are unchanged.

Navigation fix `7975f77` is committed locally only. Local release `20261005T060541Z` contains
9,209 verified manifest files and unchanged migrations, but has not been deployed. Website
`20261005T051822Z` and its verified recovery remain unchanged. Build Mac is locked, and SSH
staging is blocked because the accepted key cannot be unlocked locally (Keychain retrieval and
an empty agent). No authentication configuration changed. The existing signed-in in-app admin
session remains valid; the reviewed File Manager upload can proceed after the Mac is unlocked.

Classification for the 05:39–05:41 UTC live audit window now establishes the sole Apache error
as the expected protected `.env` 403 denial. PHP file events: 17 lifecycle entries and one other;
PHP journal: 15 lifecycle entries. MariaDB: 664 entries, including 332 known histogram-definition
failures and 332 other entries containing failure words whose exact system-table template is
still pending classification. Push journal: nine other entries. Laravel recorded no application
errors. These findings do not establish that all server logs are clean; existing MariaDB
system-table maintenance remains a separate issue.


## Final website activation and live Chats — October 5, 06:40 UTC

Release `20261005T060541Z`, containing navigation fix `7975f77`, is now live. The signed-in
in-app File Manager supplied the archive after local SSH key unlock failed; no authentication
configuration changed. The hash-guarded updater and approved supplemental recovery gate passed.
Its completed receipt verifies all 9,209 manifest files, preserved runtime configuration,
unchanged schema and unchanged nutrition counts/hashes. Previous release `051822` and recovery
`050326` remain retained. This supersedes the preceding local-staging status.

Live Chats acceptance verified All Macs with both authorized hosts and authenticated Mac names,
records and the Search/Mac/Provider/Status/Workspace/Schedule/date filters. No inner chat navigation
remains; New Chat is in the main shell. The eight-member Team list was verified earlier. No
professional chat titles or private roster names are recorded here.

Default Mac preference acceptance remains incomplete: several UI clicks timed out, no JavaScript
errors appeared, and reload still showed Choose explicitly. The save is not claimed successful.
This is a pending preference action, not evidence that paired Macs cannot connect. Build Mac
remains locked awaiting operator unlock. Cross-Mac reverse pairing and physical consent checks
retain their separate earlier limits.

The 06:40:25 UTC audit, starting at 06:38, passed all 14 endpoints. Laravel had zero bytes/events;
relay Apache had zero events. Website Apache recorded one event/221 new bytes during the expected
protected `.env` probe, but this new window's classification remains pending. PHP recorded 18
other file events and 15 reload journal events; MariaDB recorded 7,145 priority-six events, with
new bounded classification pending; push recorded nine events. No all-clean log claim is made.

The earlier 05:39–05:41 window is now fully classified: all 664 MariaDB entries are the existing
`mysql.column_stats` incorrect-definition issue, split evenly between 332 `histogram_type` and
332 `histogram` messages, with no other messages in that window. Its sole Apache error was the
expected `.env` denial. This earlier classification is not substituted for the new audit window.

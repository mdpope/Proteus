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

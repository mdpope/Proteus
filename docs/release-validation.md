# Release acceptance — October 4

The operator requested these checks after installing the prepared updates on Build Mac and
iPhone. iPad installation is deferred. Preserve all existing records, pairings, schedules and tabs.

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

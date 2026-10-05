# October 4 cross-client parity release

The operator authorized this build and in-place Build Mac updates, with iPhone installation
after unlock. Engine Room is the accepted name. Remove the tagline. The requested team rosters
and URLs are permitted on the personal API. Multi-provider implementation is entirely deferred.

## Implemented behavior

Desktop/web use contextual sidebar children, a collapsible rail with pointer expansion, Chats
with paired-bubble artwork, attention `!`, and closeable divided tabs. iPhone has Home, Chats,
Life, Team and Engine Room; iPad uses a sidebar and top tabs with a touch alternative to hover.
Allowance stays in the sidebar or iPhone Home. Compact percentages are the default, expanded
details remain available, and collapsed shows only the label/expander. Existing hidden preferences
are preserved. Engine Room has detailed Usage. Provider configuration remains on the desktop.

Chats aggregate authorized hosts without changing the execution destination. The website has an
explicit account Default Mac and independent temporary selection, with no offline fallback.
Existing chats keep their own host. Summary indexes are bounded and encrypted; web drafts are
encrypted in session storage under exact account/host/device/chat identity. Web transcript bodies
are fetched on demand, not persisted in the index. Caches are not an iOS background-sync guarantee.
The desktop peer bridge now includes schedule editing/preview/run, chat permission/context and
MCP controls while preserving receiving-host policies, revisions and durable operation IDs.

Team Tools has an overview, Standup, multiple shared named lists, fixed/random members,
instructions/timezone and saved links. Daily generated order remains local. Native Team browser
tabs retain descriptors across restart and unload on leaving the feature; a left Standup dock
can stay beside those tabs. Desktop refuses automatic unload for audible, agent-owned/shared or
unsaved pages. A standalone pop-out remains available. Importing a legacy local list preserves
the original and detects exact duplicates; simultaneous cross-client imports are not transactionally
deduplicated. Website external tools open real browser tabs because arbitrary sites may forbid
embedding; Proteus itself is never replaced by those external links.

New browser homes provide URL/search entry, DuckDuckGo/Google/Bing, saved links and retained
Proteus history, including shared recent visits. Address-bar terms default to Google. Native link menus provide new Proteus tab, default browser,
copy, explicit file download and a link-only unsent chat draft. macOS reads the registered browser
name; iOS uses an honest generic label. A fading tab overview supports selection/close without
loading unloaded pages. Explicit tab/card selection reloads an unloaded page in one click. Desktop supports button/keyboard and zoom/pinch hooks; physical trackpad
acceptance remains outstanding. iPhone/iPad use an adaptive overview and Files export. No external
Safari/Chrome history is read. Local desktop history has recording/retention/delete controls,
10,000-entry and 8 MiB bounds, and 90-day default retention. Auth/callback/pairing URLs are excluded.
Explicit bookmarks retain nonsecret query parameters; automatic shared visit history strips query
and fragments. A retained URL cannot restore unsaved forms or third-party session state.

Engine Room includes Resources, Providers, Connections, Account & Security, App Setup, Usage,
Notifications and Logs. Desktop resource figures come from Electron process metrics with shared
process attribution. Shell views share a renderer and cannot truthfully report independent memory;
close their view instead. Browser views can unload/reload. Remote resource control requires its
own per-device grant on the destination Mac; existing pairing alone does not disclose private tabs.

Generic notification history covers chat completion, review required, optional schedule completion,
new devices and relay reconnect with estimated downtime. Desktop system notifications and browser
notifications require the user's setting/permission. Host notification/log/history uploads use a
bounded seven-day account-bound outbox; invalid events cannot block unrelated delivery. Shared logs
are allowlisted metadata rather than arbitrary prompts, URLs or exception objects.

## API, consent and security

The additive `2026_10_04_165848_create_app_records_table.php` migration provides encrypted,
account-scoped preferences, Team lists, saved links, history, notifications, logs and push records.
Business validation stays in Laravel. `/api/v1/app` requires explicit `app:read`/`app:write` scopes;
existing `brain:*` tokens are not broadened. Native reconsent keeps the previous credential until
successful same-account completion. Mutations verify the expected account/workspace and list
revision. Account changes never transfer an old outbox to a new account.

Signed sequenced host revocation now distinguishes destructive authority from an untrusted relay
notice. A forged `rejected`/`revoked` packet may disconnect but does not erase trusted enrollment.
Website Revoke requests authenticated self-revocation at the host before deleting account custody.
Forget/sign-out and host revocation retain different meanings.

Account-persistent pairing still makes the website a trusted endpoint: its server can decrypt
stored Mac device keys using its application key. MFA does not remove that server-custody risk.
The existing strong-authentication requirement remains. Per-session short-lived host grants,
recent-auth gates for every sensitive connection change and fine-grained command scopes beyond
the added resource grant remain security improvements for a later protocol revision. Do not claim
the relay is an identity provider or that this release independently audits all authentication.

## Push provisioning

Web Push sends a generic service-worker wake using VAPID. Configure
`PROTEUS_WEB_PUSH_PUBLIC_KEY`, `PROTEUS_WEB_PUSH_PRIVATE_KEY_PATH` and
`PROTEUS_WEB_PUSH_SUBJECT`. APNs requires `PROTEUS_APNS_KEY_PATH`,
`PROTEUS_APNS_KEY_ID`, `PROTEUS_APNS_TEAM_ID` and `PROTEUS_APNS_TOPIC` plus an entitled physical
build. `php artisan proteus:deliver-push --limit=100` runs through the Laravel minute scheduler.
Schedule push also requires the account preference and host per-schedule opt-in. Payloads contain
generic event identifiers, not transcript bodies. Credentials remain outside Git.

The preserved native development profile expires October 10, 2026 at 23:29:01 UTC and lacks
`aps-environment`. APNs registration/handling is implemented, but actual background delivery is
not enabled by that profile. See `../ios/PUSH-SETUP.md`. Local foreground alerts do not establish
background push acceptance. Production credentials, worker health and real delivery need separate receipts below.

## Validation and release receipts

Disposable verification completed before release:

- Final full Node suite: 244 passed. Static and diff checks passed.
- Desktop parity: 21 groups; sidebar/restart: 10 groups; two-host peer UI: 18 groups, including
  actual remote schedule save/preview/run and cross-host drafts/approvals.
- Browser actions/overview: 22 groups; history: 13; native resources: 9; remote resource grants: 13.
  Security tests cover authenticated revocation, account outbox
  isolation, invalid-event recovery, sensitive URL exclusion and bounded reopenable history.
- Laravel: 76 tests/666 assertions after final URL-hardening checks; remote browser: 22 groups;
  shell browser: 19 groups; encrypted index/draft tests, Vite and Pint passed.
- Native: 26 distinct unit cases across baseline/follow-ups, phone/iPad navigation/allowance,
  encrypted chat UI and actual disposable WebKit download/export preparation. Signed universal
  device build verified with the original identity/profile. Physical installation and Files-provider
  interaction are separate acceptance steps. See `../ios/PARITY-VALIDATION.md`.

Source tests and signed builds are not installation receipts. The release record must separately
record Mac/phone preservation and launch, website manifest/migration/backup checks, actual account
consent and device notification delivery. Omi processing owners and disabled Proteus gates remain
outside this release. No operational schedule should be run as a smoke test.


## Deployed state — October 4 evening (October 5 UTC)

Build Mac installed runtime commit `295be2d32f22c54bdfed85ad7aa4436ccb48be54` in place.
The final package passed identity, icon, application/vendor signatures, isolated launch and live
Copilot catalog checks. All 103 runtime files matched source. Graceful shutdown, idle/terminal
guards, full private app-data backup and retained previous application were verified. Eleven tabs
and selection, three pairings/keys, six schedule files, eight configuration records and the ready
Life account survived. No resource grants or account scopes were broadened. The final restart kept
the encrypted Life session byte-identical; an earlier restart performed only normal OAuth refresh.
Installed native UI was observed using accessibility and a screenshot.

The website activated release `20261005T000810Z`: 9,209 manifest hashes, the single additive
app-record migration and 14/14 public endpoint checks passed. Existing Life rows, account
destinations, native clients, credentials and prior release were retained. Pre- and post-deployment
central recovery bundles were independently verified and restored into isolated databases; all
17 then 18 protected tables matched. The first attempt stopped before migration because the site
had reached its 1 GiB quota. Raising that site's quota to 2 GiB with verified server headroom allowed
a guarded resume; no release or backup was deleted.

Web Push has a protected first-time VAPID key, verified portable credential backup and an active
bounded delivery timer with successful worker execution. Actual device delivery is not verified.
APNs remains unconfigured and the preserved physical profile lacks its entitlement. The signed
phone/iPad build and 25-input hash receipt passed verification. After earlier locked/unavailable
checks, the existing paired iPhone became reachable over Wi-Fi and was updated in place at
02:30 UTC. All three app-data files and preferences were byte-identical before launch; both
destination identities and selection survived launch, and the running process was independently
confirmed. The iPad subsequently received the same in-place Wi-Fi update at 02:35 UTC with identical
preservation checks; its normal shared-account sign-in is an on-device handoff.

The Work Mac validated the base release and final browser checks, then installed browser-home
follow-up `8e3ab51` through its authorized Codex chat. All 103 runtime files match, app/vendor
signatures pass, and two tabs, three pairings, settings/permissions and five disabled schedules
are unchanged. Production launched without a mock-Keychain flag and is waiting on the real
Proteus Safe Storage prompt. The operator was asked to respond on HC. Relay/provider checks
remain pending; the full prior app/state rollback is retained.

The operator explicitly approved the added shared-data scopes. Build Mac OAuth reconsent
completed: live `/api/app` and `/api/team/lists` both returned HTTP 200, with the same account
identity as the ready Life connection. The Build Mac legacy roster and shared list collection
were empty at verification, so no blank or duplicate roster was imported. Production account-backed pairing
migration, Default Mac selection, native Team synchronization, browser notification permission and
end-device delivery remain distinct acceptance steps. No credentials or Mac grants were silently
created to make the new views appear connected.

The deployment audit also identified a pre-existing MariaDB `mysql.column_stats` system-table
version mismatch, identical before and after release. Application recovery/endpoint checks passed.
The deployment workspace records a separate all-database-backup and version-reviewed system-table
maintenance proposal; no server-wide repair was attempted as part of this application update.


The earlier consent/browser-control hold is resolved by the successful same-account checks above.
No additional approval is needed for that already-authorized scope expansion.


## Follow-up observations — October 5 UTC

The operator dismissed the Work Mac’s `Proteus Safe Storage` access prompt with Deny. No Keychain
item, password or access control was changed. Code review identified that the ad-hoc packaged
smoke test could request the production item despite using a disposable browser profile. The
reported password rejection is not diagnosed by that finding. The cross-host Codex API and SSH were unavailable. Refreshing Screen Sharing restored input;
the existing HC update chat then verified the disposable test had exited, installed `68463db`
remained byte-matched across all 93 runtime files, the relay and three pairings were healthy, and
login Keychain metadata reported unlocked. All three providers remained available and five
schedules stayed disabled. The later follow-up installation is recorded above; production Keychain acceptance remains pending. Never reset or delete Safe Storage to bypass this issue.

The earlier iPhone discovery hold was resolved by a fresh Wi-Fi attempt at the operator’s request.
Installation and preservation succeeded as recorded above and in `../ios/PARITY-VALIDATION.md`;
no USB connection, uninstall, pairing reset, signing change or Omi action was needed. The operator
subsequently authorized the iPad update and normal account connection; its installation succeeded,
while the device-local shared-account flow remains an explicit on-device handoff.


## Browser-home follow-up installed on Build Mac

Runtime `8e3ab51` passed 244 Node tests, static checks and 16 focused main/docked-Team UI checks.
The signed package passed its isolated launch, synthetic cookie and 19-model catalog checks.
All 103 installed runtime files match. Original application/vendor signing, 12 tabs and selection,
Team state, local/tab histories, three pairings/resource grants, run/schedule files and nine
settings records were preserved. The encrypted Life session stayed byte-identical; shared API
authorization and relay reconnect passed. Full app/state rollback remains outside Git.

The installed app was then inspected through native accessibility and screenshots: search,
Google/DuckDuckGo/Bing and URL controls are visible at the top of both the existing main new tab
and Team new tab. The installed Team view exposes exactly 25 local history rows and both More
controls. The original main tab selection was restored after inspection. Docked/narrow behavior
and pagination/retry logic have the separate disposable regression evidence above.

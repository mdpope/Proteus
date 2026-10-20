# Life: native personal records through the website API

Life is optional and hidden until enabled in Setup. Corporate installations need not enable it.
Once enabled, the Life tab persists even while signed out and offers account setup.
Desktop, iPhone and iPad use the authenticated Proteus website API. Only the website service
accesses its database. Native app screens remain native; no website iframe supplies their records.
Life is independent of the selected execution computer and remains available when that host sleeps.

## Connect an account

**Queued auth correction — BF-2026-10-19-14:** use the configured in-app/system browser for this
account sign-in and route completion back to the exact initiating app/installation/window.
Current source forces the system browser and shares `proteus://life-oauth/callback` with mobile;
website provisioning also gives that shared OAuth client an iPhone/iPad label. Distinguish that
label from actual delivery to the wrong bundle, which the operator reports but this investigation
has not reproduced. Preserve the working Life/Team account, existing mobile sessions, PKCE/state
and origin checks; do not reset sign-in or OS handlers as a diagnostic shortcut. BF-13's earlier
Life-off lazy-load reproduction does not fully explain a disabled profile switch while Life and
Team already work. See [planned updates](planned-updates.md). No auth implementation/build yet.

In desktop Engine Room → App settings (App Setup in older layouts), use the **Proteus account**
card to choose the HTTPS website origin and **Sign in securely** through the system browser.
Connecting the shared app account does not require Enable Life; that toggle separately enables
personal-record screens. For a saved sign-in, **Refresh connection** loads/reconnects the account
while Life remains off. **Authorize shared features** extends an existing account's consent when
needed. BF-2026-10-19-13 queues clearer Browser Preferences guidance and fixing startup account
loading when Life is off; its synthetic reproduction is not a live-account verification.
Use the existing website account and its normal strong authentication. OAuth uses the
same public native client as mobile, PKCE S256 and the fixed `proteus://life-oauth/callback`.
The app verifies discovery origin/endpoints, pending state and authorization attempt. Cancel,
logout or a newer attempt prevents an old callback from saving a session.

Desktop tokens remain in the main process, encrypted with protected Electron safeStorage in
an owner-only atomic file. macOS uses its existing Keychain-backed path; Linux requires an
available desktop keyring/Secret Service. Insecure `basic_text` fallback is refused. Tokens never enter renderer
state, localStorage or relay responses. Mobile tokens remain in Keychain. Website redirects are
not followed for API/token requests, and responses and evidence downloads are bounded.

Each read and mutation follows website account/workspace permissions. Forms, drafts, evidence
and retry identifiers are tied to their original account session. Changing accounts does not
retarget an old form. Token refresh is serialized; sign-out disconnects local access and attempts
revocation of that website session. If remote revocation cannot be confirmed, the app says so.
Website security settings own passkeys, MFA and broader connection revocation.

## Existing installations

The first launch privately archives the exact old `life.json`, preserves the enabled flag and
writes API-mode schema-version-3 settings. It never opens the old SQL profile, starts an SSH tunnel
or falls back to direct database access. Existing records, credentials and profiles remain intact
for recovery. Website account sign-in is required once for the new connection.

Database setup/upgrade/backup endpoints are retired from the desktop runtime. New website owners
install and upgrade the service with its versioned Laravel migrations and a verified recovery
point. Downloading a desktop or mobile update cannot migrate the database. Explicit legacy admin
code and historical validation remain documented in [database administration](life-database-admin.md).
That explicit legacy adapter now supports Linux Secret Service references as well as unchanged
Mac Keychain lookup; it does not change this API-only runtime or open old profiles automatically.
Synthetic storage tests do not establish live website sign-in or Linux keyring access.

## Included native workflows

- Nutrition days, individual entries, complete-day averages and monthly averages; personal food
  library and immutable nutrient version history; meal additions, corrections and soft deletion.
  Breakfast, lunch and dinner are required for a complete day; snacks contribute to its totals.
  Food edits create a version and never rewrite old meal references. Retrying a deleted meal's
  original request does not recreate it.
- Garage vehicles, maintenance tasks and explicit completion, service/purchase history, odometer
  captures, and oil samples progressing from awaiting mailing through submitted to reported.
  Completing a task does not invent a service record; a receipt remains a purchase. Oil results
  retain text values such as `<1`, laboratory comparisons and audit history.
- Fuel review and acceptance, partial/missed fills, full-to-full weighted economy, original fill
  history, odometer observations, and monthly/yearly mileage estimates interpolated from exact
  dated observations. Estimates are not claimed as precise recorded monthly mileage.
- Capture inbox, structured review, explicit acceptance and original evidence attachments.
  Evidence remains private, supports the original image/PDF/email/text MIME allowlist, is capped
  at 20 MB and 12 originals per capture, deduplicates by SHA-256 and verifies that digest on read.
- Account/role, passkey and authenticator status, scoped audit history and OAuth connection
  inventory. Connection revocation requiring identity verification opens the website security flow. Credential enrollment,
  invitation delivery, passkey ceremonies and the hosted OAuth/MCP endpoints remain in the
  imported Laravel application; the desktop does not pretend to issue website login credentials.


## Food pagination and reports

The desktop food library shows 25 items per page, stable by normalized name and ID, with matching
counts and Previous/Next controls. Search starts at page one; the selected food's immutable versions
remain accessible independently of the current page/search. Meal choices remain complete. Mobile's
existing paged API behavior is backward compatible. Calendar-period average cards and independent
custom date filters retain the website's complete-day rules and workspace timezone.

## Validation

See [release acceptance](release-validation.md) for actual installed observations and pending
API cutover. Software fixtures exercise authentication races, protected token storage, account-bound
mutations, real API response projections, food pages/search/details and evidence. Historical SQL
validation is not evidence of API sign-in. Physical iPhone installation and relay reconnection are
verified separately from Life consent; the latest iPad update remains deferred.

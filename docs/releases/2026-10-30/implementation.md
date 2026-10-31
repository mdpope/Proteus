# October thirtieth release implementation

## Final helper-launch correction and native qualification

Mac source `5bcbd8971cf629b37124919f3f3b9c4d6fca5574` passes 1,353 Node tests/four
skips and static checks. Its signed, officially extracted package and corresponding source
verify; the exact-package TLS and original notice-color fixtures pass without changing its bytes.
Both installed Macs remain on the earlier healthy 0.2.39 pending this final corrective rollout.

The Windows native builder twice exposed a cleanup race in the helper IPC fixture: removal
started after signalling the helper but before its exit. Cleanup now awaits the parent pipes and
the helper's confirmed exit before bounded removal. All readiness, environment and independent
helper assertions remain. Focused updater validation passes 32 tests and static checks pass;
Windows must qualify the corrected test source before another package can be accepted. Both
failed build records remain preserved. The old failed live update is cancelled, not installed.

Native requalification confirms the cleanup fix passes. A separate failure then exposed two
parallel lazy Electron binary downloads after dependency installation. The distribution runner
now prepares Electron serially before starting the full source suite, verifies the exact pinned
version/architecture and records that phase. It preserves dependency pins and uses each build's
existing private source directory; no shared cache or live installation is repaired in place.

The separate simulator identity passes 157 phone unit tests and the website-notification route UI
fixture, with targeted iPad checks passing. The normal phone was reconnected to the real owner;
its cold reconnect and saved selection verify. Previously reset cache is not described as restored.
The physical 0.2.39 / 2610.30.1 build verifies against the existing paid certificate/profile and
unchanged keychain entitlements; both physical devices require unlocking before preflight.
The accepted website archive is staged privately, but production remains unchanged.

## Corrective cross-platform follow-up

Frozen desktop source `df8f070265eb0631f0bb89159432846964bd85ef` adds certificate-information
disclosure and restores original notice colors. Its accepted Mac package passes the two targeted
exact-package TLS/notice fixtures; earlier five-fixture acceptance belongs to the baseline build.
The designated Windows builder completed this exact source after a verified Node-only repair and
handed off its accepted candidate. Installed Windows health remains pending. Linux, Ian and the
new Mac corrective coordinators await their normal destination approvals.

The shared website service and iOS source now carry website notification events with safe origins,
original sound intent, stable event deduplication and authenticated source-desktop activation.
Suppressed events remain history without push, and stale website alerts expire after five minutes.
The targeted website API suite passes 16 tests/207 assertions; two iPhone unit checks and an offline
notification-route UI fixture pass. These are synthetic checks, not live Slack/APNs/phone delivery.

The full isolated website suite subsequently passes 105 tests/920 assertions with ephemeral
application/OAuth test keys. Website source `9dcde2b1988eba95d6ea250b60508527fe696c51` builds
the 0.2.39 candidate; all 9,221 archived file hashes verify. Production remains unchanged.

The native test launcher initially reused the normal iPhone simulator identity, resetting its saved
destinations. No physical device was changed. A separate test identity and pre-install identity guard
are implemented; native revalidation and simulator reconnection are pending the unlocked Mac.
This limitation is not an accepted preservation result.

Full Node validation passes 1,352 tests with four skips using a short canonical temporary path;
static checks pass. The initial default-temp run's five path-alias/socket-length failures remain in
private evidence; all affected tests pass with the canonical temporary path. Full publication pins
can now be verified against all packaged runtime/build inputs before signing an older Mac envelope.

## Earlier R14 acceptance checkpoint

Version: **0.2.39**. State: R14 Mac package accepted; destination rollout pending.
R1–R14 are authorized, with Mac rollout first and other platforms after HC is verified.
The active branch is codex/oct30-update-command-center. The earlier R11-only source pin is
`34419c1047f5a269ff37f42cc826161c4fb6158a`; later record-only commits do not
change that implementation. A subsequent runtime change requires a new source/package pin.

## Certificate details and notification appearance follow-up

The operator requests **View certificate information** directly on a bad-certificate page.
An inline disclosure shows the observed subject, issuer, validity dates, alternative names,
serial number and SHA-256 fingerprint without accepting the certificate or opening another menu.
Direct acceptance remains a separate one-click action. Certificate text is escaped and bound to
the failed page; a native synthetic TLS fixture exercises disclosure and continued blocking.

The operator rejects changing notification background colors. Restore the existing fixed
light-green notification surface and remove the native notice's palette injection. App theme
colors continue to apply to browser error pages. Banner expiry, deduplication and attention
behavior remain implemented. These corrections require new desktop source/package pins; native
Linux/Windows coordinators are held to preflight until the validated source is supplied.

The correction is frozen as `df8f070265eb0631f0bb89159432846964bd85ef`.
Its signed Mac build is `df8f070265eb+src.b6f9e913457e`, full installation hash
`352bf0ed4537437c4f73f9573edbce6e788e321fa03976f4521ad42eb5b965f9`.
Official extraction, corresponding source, targeted exact-package TLS/disclosure and notification
appearance checks pass with unchanged hashes. Its source suite passes 1,348 tests/four skips.
Both installed Macs remain on the earlier package until this accepted correction is rolled out.

The Windows first-builder failure was a removed provider Node path. Read-only inspection found
a currently signed Node in the same provider family and verified the other bound references.
A separate repository maintenance helper plans a one-field refresh with an expected policy hash,
unchanged plan digest and private intent/completion receipts. Its guard/source suite passes
1,350 tests/four skips and static checks; native Windows application remains pending. This helper
does not replace the frozen consumer source `df8f070`.

## Previously accepted Mac package (installed before this follow-up)

- Source: `0a2b6a425c47bd3a704ffb390a1fdcc6bf6fb864`.
- Build: `0a2b6a425c47+src.9af8d6057aac`; fingerprint
  `9af8d6057aac173e996a7c1fa3a485b58bed19dfad0d93b3cdb738458c071df8`.
- Full package/installation hash: `3b100dac4cc38da2d2380560dee3b0bf866ba97e3623275dee0bb0c2111a16bb`.
- App archive: 231,158,507 bytes; SHA-256
  `cdd7b0235ec15a34f86a2f504e7a2e1ac4b45319096cd7bf9d00470a61975866`.
- Source companion: 6,272,371 bytes; SHA-256
  `0a591b11331b10d02880d2012167f48b1279dce200b022c4aeb03d223508da39`.
- Apple identifier/team preserved; official extraction, all 430 runtime/build-input hashes and
  source-manifest contents pass. Five exact extracted-package UI fixtures pass, with installation
  and archive hashes unchanged after startup. Source suite: 1,347 pass / four skips; static passes.

The broad release fixture initially encountered transient state-display 503/restart timeouts.
The unchanged package subsequently passed its complete two-window/attention/theme/restart checks
with bounded owner diagnostics; assertions were preserved. Initial and successful evidence stays
outside source. Other package fixtures cover real video/downloads, document restart positions,
actual page notifications and one-click certificate/theme/profile/session behavior.

Build Mac independently prepared this replacement without handoff; it remains on 0.2.33.
HC used its documented isolated proteus context successfully; the initial unscoped CLI check
was not the selected repository context. It independently verified all assets/source/signing,
prepared and handed off the candidate. It restarted on the exact accepted 0.2.39 build with independent installation hash/Apple identity
and owner health verified. Saved settings are byte-identical to the pre-update snapshot;
notification/browser-profile preferences match, and all prior site records survive with three
additional entries. Owner preservation covers 577 runs/45,004 events. Two verified recovery
generations remain after valid rotation. No separate migration outcome is recorded. Native
shared-tab samples and certificate-button presentation pass; lifecycle/shared-close/site delivery
remain unverified on the installed profile. No credential was copied or account changed. The accepted package/source/manifest are in an immutable private draft transfer;
no public feed was activated. Task-created duplicate build and superseded payload retirement
returned 1,558,646,784 observed free bytes; owner recovery data was untouched.

The original intranet connection still fails in the installed and isolated signed browsers.
Refreshing and restoring the existing macOS Local Network grant did not resolve it. Direct TCP
and system curl reach the server; verified TLS reports its untrusted issuer. No real certificate
was accepted. Keep this live issue open for installed restart/network-path investigation.

## Superseded Mac candidate and R14 investigation history

The handoff guard correction is frozen as `24df95f853ef99101c66c511a1691550b7d8853c`,
build `24df95f853ef+src.91bfac505be7`. Its full installation hash is
`47ce119f69c194c68d4be15cce07ac9e190ec809e51f7600b132218f2706e288`;
archive SHA-256 is `caafa95be27f3ccc5fa7e9bf6c0a2e3c9ad21f5a880ecbf9633a84973433c4bd`.
It passes 1,343 tests with four skips and four exact extracted-package UI fixtures. Build Mac's
coordinator verified and prepared it, without handoff or installation. The earlier a79f584
preparation was cancelled through its owner. Private draft transfer assets were uploaded for HC,
but HC has not received or installed them. This candidate must now be superseded after R14 passes.

The reported explicit HTTPS/custom-port address is preserved by the installed browser, but both
hostname and numeric-IP navigation fail with `ERR_ADDRESS_UNREACHABLE`. Independent read-only
socket checks connect to the same port; verified TLS then reports an untrusted issuer. macOS's
Local Network UI shows Proteus enabled. Neither observation establishes the installed browser's
network failure cause or proves a live fix. Private hostnames/IPs stay outside this repository.
R14 adds omitted-scheme intranet host:port parsing, host/port error presentation, Mac local-network
usage declarations and direct one-click acceptance of observed failed certificates. Native acceptance passes
custom HTTPS ports, trusted clicks, live theme changes, profile isolation, changed certificates
and restart expiry. A newly signed candidate is still required before rollout resumes.

R14 final source validation passes **1,347 tests with four platform skips**, static checks and
diff checks. The synthetic native fixture proves the requested one-click flow, trusted-input
boundary, actual Chromium profile/session scope, changed-certificate/profile isolation, restart
expiry and live Emerald Canopy/Daylight colors. Initial fixture failures exposed a hidden view,
prevented-navigation waiting and Chromium's profile-wide SSL cache; original evidence is retained
outside source and the final fixture asserts the supported behavior without global TLS bypass.
An isolated source-browser probe still reproduces the reported network failure. Test the signed
bundle with its local-network privacy declaration before claiming live resolution.

## Full release source acceptance

- Fusion capability/phase/attribution projection follows the installed Copilot SDK. The refreshed
  account offers no Fusion model; synthetic events pass, real execution is unavailable.
- Emerald Canopy remains default. Daylight's white palette, native control scheme, shared-window
  application and restart persistence pass the disposable Electron UI check.
- Actionable notices use request identities; answered/deleted waits retire alerts, duplicate
  requests deduplicate, routine completion is quiet, and banner queues/ages are bounded.
- Needs attention Clear all acknowledges captured snapshots with stable retry identities. Native
  UI verifies pending questions survive, new requests reappear and async list refresh keeps the button.
- Auto-approve and remembered scopes match host/actions/resources, preserving Ask mode, revocation
  and mandatory approval boundaries.
- Shared membership/order continue while uncertain navigation remains quarantined. A native
  two-window stale-receipt repro verifies owner Close and both strips converge.
- Real synthetic video verifies initial autoplay blocking, runtime enable/disable, deliberate
  Play, unrelated-click blocking and restart persistence.
- Resources adds shared chat/document limits and idle expiry. A native 2,507-event fixture evicts
  data and DOM, reloads earlier pages to the same message/offset, preserves drafts and saves controls.
  Owner tests cover inactive eviction and active execution pins.
- Actual page-generated website notifications now use the normal Proteus history/native event
  path, with original text, origin/source host, silent-sound intent and click callback. The native
  page fixture verifies two distinct events, one silent, plus exact-event deduplication. Explicit
  forwarding uses a portable projection; owner window/profile/activation fields stay private.
  Unsupported server types retain a bounded five-minute/100-event retry window without blocking
  ordinary notifications. Server/APNs and iOS implementation remain after the HC verification gate;
  real Slack and worker/background push are not verified by the page fixture.

These are source/disposable-profile checks. Neither installed Mac profile has been updated.
The two unassigned update coordinators captured destination defaults and await destination tool
approvals during read-only preflight. Final suite totals and package/source pins follow acceptance.

## Initial accepted Mac candidate — superseded before installation

- Frozen source: `a79f584002141dfc0df38bddee7a6fb0396858f8`, pushed for review in [draft PR 24](https://github.com/mdpope/Proteus/pull/24).
- Build: `a79f58400214+src.7cfbbe645830`; source fingerprint `7cfbbe6458309762345edaa83aed1a5e28aaffb29ccea3c1d88face66364857f` (427 runtime files).
- Package/installation SHA-256: `0d518e071fc8a04ca7c779941300492ffc4ab1e3ffd8dc4701f8ca5ddf171913`.
- Archive SHA-256: `2b2d96edc659652b0920861c421d43970a96d358d46f4cd9942230f30f8d745f` (227,496,687 bytes).
- Apple app/team identity remains `org.proteusapp.proteus.desktop` / `TEAMID0000`, using the existing valid certificate. Vendor signing stays intact; no notarization is claimed.

The official updater extractor reproduces the complete installation hash. Four exact extracted
package fixtures pass: combined themes/attention/two-window conflict-time Close, native video/
browser controls, document reading positions through restart, and actual page Notification events
with original text/silence/click. Installation/archive hashes remain unchanged after startup tests.
One accepted app and one update archive remain. Removing only the verified duplicate build app
increased observed free space by 671,764,480 bytes. No live-data backup or installation occurred.

The Build Mac coordinator has the exact accepted local path and hash pins queued behind its
pending human tool approval. HC has the same identities queued and waits for private transfer or
a matching signed publication after preflight; artifact delivery there is not claimed. Neither
installation, migration, installed-profile preservation nor real Slack/APNs delivery is verified.

Follow-up preflight completed. The old 0.2.36 job was cancelled by its original owner chat and
confirmed cancelled, revision 16. The fresh coordinator successfully prepared and handed off
the a79f584 candidate, including staged identity/renderer/API checks. Automatic task feedback
to the separate command-center chat then tripped the old global new-input guard and reverted
the handoff to prepared. No app replacement occurred. The narrow provenance correction preserves
other-chat task-data handoffs while leaving active work, human input and updater-chat checkpoint
review intact. Regression/source validation and a new signed 0.2.39 package are required before
continuing; prior package pins above are historical acceptance, not the next installation target.

Final Mac source acceptance: **1,340 tests pass, four platform skips, zero failures**.
Static and whitespace checks pass. Disposable native checks pass for the combined theme/attention/
navigation-conflict repro, existing multiwindow/inactive-workspace/451-entry-history acceptance,
long-history paging and delayed/cancelled restoration, memory eviction/drafts/settings, document
reading positions through app restart, real video autoplay/manual Play, and actual page-generated
website events with original silence/click behavior. These are synthetic workflow results, not
real provider Fusion, live Slack, phone APNs or installed-user-profile acceptance.

## Distribution audit

The existing updater already verifies signed packages on Mac/Linux/Windows, supports owner
maintenance and idle barriers, preserves local recovery/data, and continues the original update
chat after restart. Windows has a designated native owner build operation. Native source can be
synchronized from the authorized repository before first-target packaging.

Read-only public catalog checks on October 30 found macOS arm64 at 0.2.31, Windows x64 at 0.2.35,
and Linux x64 returning HTTP 404. These are distribution observations, not installed-device
inventory. The currently installed command-center tool catalog predates this source contract.

## Implemented

- Exact destination release selection through chat controls; a stable operation ID starts one
  unassigned release-named coordinator using that destination's saved provider defaults.
- Destination release catalogs and bounded chat-specific updater observations. Task monitoring
  continues while the pre-restart model turn is complete but the updater is still working.
- Owner package verification stays separate from migration/test outcomes reported by the
  coordinator. Additional authorized checks are preserved in its prompt and retry signature.
- Multi-platform upload staging, current-version discovery, empty catalogs for pending targets,
  and digest-guarded retirement of superseded public payload directories.
- A named-release record reserves version 0.2.39 once. Plan/implementation/rollout documents,
  release-closeout instructions and artifact/site/simulator retention limits are repository-owned.

## Earlier R11-only validation

Final validation: **1,324 tests passed, four platform skips, zero failures**; `npm run check`
and `git diff --check` passed. The encrypted two-host tests exercise destination defaults,
pinned release selection, uncertain-dispatch retry, controller task restoration, pre-restart
turn completion and post-restart owner observations. Other tests cover version reservation,
current-only staging and changed/corrupt-publication cleanup guards.

The initial full run encountered existing macOS temporary-directory alias and Unix socket path
limits. Re-running with the documented canonical `TMPDIR=/private/tmp` passed without weakening
any assertion. Original failed output and final logs remain outside source. Native cross-platform
installation, real restart/migration acceptance and server retention remain separate.

At that R11-only checkpoint no native package was built, no helper or migration ran on live data, no website
publication/retirement occurred, and no remote installation was dispatched. The existing prepared
local update and the previously closed release's source/artifacts remain intact.

## Native packaging and publication

Use the [standing process](../../release-process.md). Freeze the final source commit after
validation; native builders fetch that exact repository commit. Package/sign/test on the matching
OS. Return package identities before adding a target to the current public set. Consumer machines
wait for matching published bytes. Source availability is not a package acceptance receipt.

## R15 - llama.cpp provider

Implemented authenticated transport, live metadata, exact template/token accounting and visible provider selection. Focused tests and first full source suite pass (1,357 pass, six skips); static checks pass. Real TLS two-round Qwen fixture tool/read/answer passes with observed usage and cached-input tokens. Final source/UI/package checks remain pending at this checkpoint. Existing vision weights are preserved; initial server is text/tool only.

R15 final desktop acceptance passes the Providers card, real TLS discovery, New Chat model selection and all 17 real host-tool schemas at 32K context. The deployment profile uses 18 GPU layers, Q8 K/V cache, 12/16 threads and MTP. Focused suite: 25 pass. Latest completed full suite: 1,359 pass / six skip; final native builder repeats required checks against the frozen source. Standalone short-prompt speed is 5.30 tokens/s at the initial 8K/20-layer profile, not a proven gain over LM Studio.

R15 Windows package accepted: source 820644272f251c71df8b796fc00641ac93f02401, build windows.31d7fe49793e, source fingerprint 31d7fe49793e7b6b83e7a8e8cbd129cf5575086ab401508b3f255005e953f218. Native suite: 1,360 pass / six skip. Static checks, packaging, official extraction, exact-package UI/PTY/restart, unchanged bytes and publisher signature pass. The package remains private and installation is assigned to a fresh owner update coordinator. Final inference deployment is 32K context / Q8 K/V / 20 GPU layers / MTP3 / 12 generation and 16 prompt threads, with cold login-start verification. Short generation measured 4.87 tokens/s at this profile; this is not a speed advantage claim over LM Studio. Firewall administrator approval and cross-device third-party API verification remain pending.

R15 installed verification (October 31): owner job 2435ccdd-a5eb-5883-9f62-8d2c9be5274a completed with outcome updated, no error, verified health and same-chat continuation. Running identity matches windows.31d7fe49793e / 31d7fe49793e7b6b83e7a8e8cbd129cf5575086ab401508b3f255005e953f218. Owner preservation reports nine runs / 5,592 events. Fresh maintenance reports two verified recovery generations and no issues. The installed provider discovers qwen3.8-27b with 32,768 context and completed a real READY smoke response with 2,192 observed input / two output tokens. The independent inference server survived restart. The updater recorded an actual free-space delta of -250,773,504 bytes; this is an observed interval, not an attributed cleanup saving. No application-data migration was required.

The coordinator remains awaiting a human approval for proteus_desktop status; installed native visual acceptance is not claimed. Source desktop/new-chat acceptance and the official extracted-package UI/PTY/restart checks passed earlier. The LAN firewall administrator question is still unanswered; no firewall rule exists and third-party cross-device API reachability remains unverified. Existing encrypted paired-Proteus provider discovery is supported by the dynamic client catalog but has not been exercised from another machine in this task.

## R16 shared inference implementation

Implemented a distinct shared-llm consumer adapter, local-backend sharing service, bounded per-backend queue and metadata-only recovery receipts. Existing peer encryption/journals carry inference; the relay server is unchanged. Provider controls support per-device grants, discovery and local imports. Eleven focused sharing tests pass, including encrypted consumer-side tools and MTPLX control forwarding. The first full suite passes 1,368 tests/six skips and static checks. Two disposable desktop instances completed the real Qwen RELAY_READY response through the relay with 6,924 observed input/four output tokens and zero agent chats on the serving host. Final native package validation will repeat checks on the frozen source.

R16 rollout authorization: the operator selects Windows, Build Mac and Work Mac. All three desktop installations may receive this feature, preserving active work, data, provider sessions and the two-generation recovery policy. Source pin remains 933e44663b1034509452a8398725cd1461033714. The first Windows native qualification failed in the unchanged state-projection worker test; its four-case focused rerun passes without source changes. The original failed receipt is retained and an unchanged-source native retry is running. GitHub Actions were observed enabled despite the operator hold; source publication uses a skip-ci audit commit and no workflow is enabled or dispatched.

R16 native fixture correction: two unchanged-source Windows attempts failed the state-projection worker responsiveness fixture while its focused rerun passed. The fixture now waits for three actual owner timer pulses within a bounded deadline instead of assuming a 50 ms sleep schedules three callbacks. Its worker-blocked, queue-bound and captured-clone assertions remain intact. Failure cleanup releases the gate and observes the pending rejection so the original assertion is not masked by a shutdown rejection. Production runtime and sharing behavior are unchanged; original failed receipts remain preserved.

R16 Windows native package accepted from exact qualification source 269f32f1b9f66cdcb042396f95532632ec5da937 (runtime feature introduced in 933e446). Build windows.a75036ab7b7f, fingerprint a75036ab7b7feeb57f53fe47404088714739617b7ecb06fa64c08f3cbdb855b8, package hash 5aa261480b0a1dfd71670e68c6f143d3f1d2b56632d061fdb78a267ee2dbf629. Archive SHA256 41735d58f1411cb463ee1e50a911885bc5a9397e5d267409753592444670eb9e. Native suite passes 1,371 tests / six skips; static checks, official extraction, exact-package UI/PTY/restart, unchanged bytes and publisher signature pass. The signed envelope is distinct from the Authenticode-unsigned installer. No hosted Actions ran.

The fresh Windows installation coordinator prepared and handed off this exact build; owner job 9ad5dfd6-67a9-5710-b208-403b45818724 is waiting for idle. The parent turn and the earlier R15 coordinator's human desktop-status approval are the reported blockers. No chat was cancelled or approval bypassed. Installation and post-restart verification remain pending. Both Macs have dedicated coordinators awaiting human command approvals; Build Mac's transport is intermittent. Its corrected source-pin follow-up has not yet been acknowledged; HC has accepted that follow-up. One Build Mac darwin/arm64 build is intended for both Macs. No Mac package is accepted or installed yet and no production sharing/import grants were enabled.

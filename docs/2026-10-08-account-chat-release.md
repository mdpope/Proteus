# October 8 account health and chat release — 0.2.8

The operator's latest “build and deploy” request supersedes the earlier queue-only hold. Source
version is 0.2.8; native version is 0.2.8 (2610.8.1). Physical iPhone/iPad deployment was subsequently authorized and performed. This ledger distinguishes source work, tests and installed acceptance.

## Implemented

- Edit queued text with queue membership/current-text guards, preserving attachments, message
  identity and model controls. Eligible queued messages retain steering conversion.
- Dismiss the exact accepted pending answer under focus/streaming; guard duplicate submission,
  preserve failed input and unrelated drafts. Remote/web display all host-offered approval choices.
- Pending chat-only approval, dismissible finite notices, automatic peer recovery without command
  replay and no-op native display setters from the earlier connection/approval checkpoint.
- Accounts & Integrations private consumer metadata, generic resource contexts, separate runtime,
  authentication and resource evidence, timestamps/staleness, reported expiry and recovery history.
  Provider-serialized live-session monitoring and bounded idle runtime recovery. Copilot probe
  evidence remains limited; no identity or business-resource verification is inferred.
- Shared read-only web overview with owning-Mac check/recovery and reconnect refresh. Providers,
  device connections and Proteus website account security retain their separate Engine Room roles.
- Chat-scoped agent discovery/verification tool and capability-gated context-selection boundary.

## Validation

- 392 Node tests pass; `npm run check` and whitespace checks pass.
- Local Electron queue edit, focused Enter/streaming dismissal, retained draft, queued-to-steer,
  context metadata edit and evidence rendering pass with synthetic data.
- Desktop peer suite passes nineteen groups, now including actual queued editing through the
  command allowlist, every host-offered permission choice and Enter pending-answer dismissal.
- Website Vite build and the full extended login/two-host encrypted chat suite pass, including
  queued editing, all offered approval choices, read-only integration health/check controls and
  reduced-motion/narrow-screen checks. A missing-provider model-selector null dereference was
  caught and fixed during this run.
- iPhone simulator model/effort/context and queued editor checks pass, including preserving the
  queued message's effort after editing. Enter/feedback and pending chat-only approval also pass
  again against the final layout. The native test run still reports an existing SwiftUI state-update
  warning and optional simulator diagnostic-collection warning; functional assertions pass.
  Subsequent physical installation is recorded below.
- Earlier connection-notice, pending-approval and native browser setter fixtures pass; see
  `2026-10-08-connection-approval.md` for their detailed synthetic boundaries.

One initial desktop peer run failed reconnecting after a context mutation; its repeated full run
passed before the new queue assertions. The added end-to-end tests then found and corrected a
missing desktop command allowlist entry and web overview connection-readiness handling.

## Remaining capability and live acceptance

Isolated multi-account login/profile selection is **not implemented by the current adapters**.
Expected labels/resource IDs are reusable metadata; they do not log in accounts. Independent
identity/resource probes, expiry-driven renewal, wake/pre-schedule checks, grouped notifications
and inline historical recovered annotations remain work. The SDK cannot certify these through
its generic connected/token-accepted result. No live enterprise account/resource success claimed.
The exact reported Jira flicker still needs hands-on acceptance. Previously delivered backlog
items remain delivered; explicitly deferred Projects are not reopened.

## Build and deployment

- Build Mac: signed 0.2.8 installed and running. Package launch/signature/Keychain-fixture
  checks pass. Build revision `ec8b213d382e+dirty.48cb793c237d`; runtime source fingerprint
  `48cb793c237dcc33a1550dd8c75b5ceb1a8bf55ca1297513a0c9a6062ee10230`.
  Twenty-three protected app-data files and paired-device authority were preserved. Previous app
  and complete cold data backup retained. Installed Engine Room health view was inspected.
- Website: release `20261008T224626Z` active, archive SHA-256
  `1acd573991dc2528caa9660842d3c207f4256c274f83e80b2c85607310f40ccc`.
  A fresh backup was downloaded, verified and restored into an isolated database before activation.
  All 9,212 manifest files verified; configuration, migrations and protected data unchanged.
  Fourteen post-deployment endpoint/authentication checks and all six public asset hashes pass.
  The deliberate denied `.env` probe explains the Apache error; pre-existing database
  column-statistics warnings remain.
  Initial activation hit account disk quota and retained the old live release. Obsolete code copies
  were moved intact into the private recovery area; current/recent rollbacks remain available.
  Failed-attempt receipts were retained, and the guarded retry succeeded.
- Native: signed 0.2.8 (2610.8.1) Release artifact built and verified, staged under `dist/ios`.
  Existing development profile expires October 10, 2026 at 23:29 UTC. iPhone and iPad subsequently
  updated in place from 0.2.6 to 0.2.8 (2610.8.1), with all seven protected data/preferences files
  per device unchanged. Both device launches are verified; iPhone launch initially required unlocking.
  Compact model controls have their own row, preventing overlap with feedback/steer/queue/stop.
  These are installation/data-continuity checks, not live enterprise workflow acceptance.
- Work Mac: installed and running 0.2.8 through its user-authorized Proteus chat. The actual
  baseline was confirmed as 0.2.7 (superseding the earlier stale 0.2.6 status).
  Signed delta artifact commit `2988161f92d7a2acaeb74527f52d6916a0317a18` in the private
  repository reconstructs all 5,529 final app entries and the original signature from that baseline;
  archive SHA-256 `1f22769b47d3ad868dd4e3bb166a36b7d51e1ca2acd54e7d1d50ec5bb0a58daa`.
  Original signer, runtime hashes and cold-backup continuity verified. Tabs, histories, schedules
  and grants passed preservation checks. All three providers returned fresh models/allowance.
  The context catalog refreshed two source files edited before installation; IDs, selections,
  paths and other metadata remained unchanged. Live enterprise resource access is not inferred
  from model-provider readiness. The initial stale loading/blank display cleared after one
  idle-guarded restart of the unchanged signed app. Normal rendering and the original chat were
  restored; 36 saved tabs, four Team tabs, schedules, histories, pairings and grants passed the
  final preservation checks. Renderer diagnostics showed no console errors; the initial display
  cause remains undiagnosed, so a permanent startup correction is not claimed.

Private backup/access/installation receipts stay outside Git. The source release is intentionally
identified by its dirty-build provenance; later web/native-only corrections are separately tested.

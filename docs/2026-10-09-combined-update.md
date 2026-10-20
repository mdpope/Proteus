# October 9 combined implementation and build ledger

**Superseded release scope:** The complete queued batch and production designs are now integrated
in 0.2.11, including automatic preview delivery. Use [the full-chat release ledger](2026-10-10-full-chat-release.md)
for current builds, verification and per-target installation state. The checkpoints below describe
the earlier partial build and preserve its narrower scope and acceptance limits as history.

**Latest operator direction — October 10:** Build and installation on Work Mac, Build Mac, iPad
and available iPhone are approved, lifting the earlier hold. The referenced build thread was read
and confirms these staged artifacts were not installed. BF-38 typing changes require a fresh native
build; BF-39 automatic localhost preview delivery remains queued. Current rollout receipts are
separate from the historical build evidence below.

See [October 10 installation receipts](2026-10-10-installation.md) for the fresh builds, installed
iPhone/iPad, Build Mac self-update handoff and HC installation-route limitation.

The operator confirmed **Begin implementation and builds**, including the browser-plan
handoff. This supersedes the queue-only hold for BF-2026-10-09-04–24. Deployment is
separate. Existing installed 0.2.9 applications, protected backups and live data remain
untouched. Source is staged as 0.2.10; native build 2610.9.2.

## Implementation

| Scope | Source behavior |
| --- | --- |
| BF-04 | Optional history writes catch storage failures, preserve the last saved file, bound pending visits and retry. Explicit edits still report failure. |
| BF-05–07 | Enabled View chat documents grants direct remote reads; otherwise exact-version one-time approval remains. Full file paths appear in Details. Shared actionable notices expire visually after 15 seconds; unresolved items remain in Needs attention. Chats/Notifications tabs and seven mixed sidebar entries do not replay banners on navigation. |
| BF-08–10 | Clipboard image staging works before provider selection; delivery rechecks provider compatibility. Model IDs are deduplicated. Internet Search defaults preserve mounted views and ignore detached responses. |
| BF-11 | Separate adapter runtimes per executing chat remove the host-wide AI bottleneck. Independent providers/chats can run together. Same provider session, connection probes and native job lanes remain serialized; queued work carries a reason. One runner still owns a data directory. |
| BF-12–15 | Pinned Chat sits beside scrolling children without the gutter; Find closes correctly and has no top-nav icon; add controls match. New selections are revealed without resetting ordinary strip scrolling. Agent pointers remain between operations, animate actual position changes and honor reduced motion. |
| BF-16 | Local directional Pause retains pairing/drafts, suppresses outgoing reconnects and hides that host's content until Resume. Reverse access is unchanged. |
| BF-17–18 | Schedule save/reload keeps revision protection, acknowledges the saved baseline and preserves later edits. Changed-source warnings offer a direct Refresh sources action. No actual schedule was run during verification. |
| BF-19 | Chromium's persistent Default partition remains unchanged. A device-encrypted, partition-scoped session-cookie continuation store restores cookies that Chromium normally drops on full quit. The specific HC incident remains unconfirmed and was not attributed to disk space. |
| BF-20 | Desktop local/remote, website and native chats load older pages near the top, initially fill available space with headroom and preserve the reading anchor. Retry appears only after a failed load. |
| BF-21 | Default is the only predefined profile. Extra named profiles require account sign-in and explicit opt-in. Revision-protected API records sync definitions/settings, never cookies or vault data. Profile IDs follow browser lifecycle paths. Unverified, removed or signed-out profiles cannot open through Default as a fallback. Native Default and named WK stores are persistent; previews remain ephemeral. |
| BF-22 | Ghostery composes with the privileged-origin request gate, adds a shield/count, per-site pause and cached filter updates. Cosmetic/CSP hooks use exact owned-frame checks. |
| BF-23 | GPL-3 extension adapter retains Proteus's tabs. Active-profile icons precede overview. Browser Preferences supports unpacked install, enable/disable, options, removal and explicit update from a folder with identity checking and rollback. CLI filling remains available; the duplicate toolbar fill is hidden in extension-enabled profiles. |
| BF-24 | Native pages use ordinary WebKit Password AutoFill. Custom native extension hosting/filtering remains explicitly deferred; Live Browser reflects the executing Mac. |

## Verification checkpoint

- Node: **402/402** tests passed after execution, document, profile, pause and notification changes.
- Static JavaScript checks passed; final packaging repeats checks after metadata changes.
- PHP: **10 tests / 119 assertions** passed for account API scope, revisions and settings validation; Pint applied.
- Website production assets built. Full isolated website regression passed: login/MFA, two hosts,
  drafts, setup expansion, chat lifecycle, documents, schedules and account/session boundaries.
- Electron browser regression passed: retained draft/focus, native Find, hidden/minimized Live Browser,
  pointer lifetime, history/gesture precedence, tab close/reopen and automatic older-message loading.
- A two-launch Electron rehearsal verified profile cookie/local-storage isolation and restart persistence,
  popup inheritance, profile revocation and extension privacy rejection.
- Browser services rehearsal verified blocked versus allowed traffic, per-site exception, native
  Allow/Block banner, site-alert action/click delivery, nonmodal page use and revoked permissions.
- Official Bitwarden **2026.9.3** archive SHA-256 verified against its GitHub release metadata.
  Isolated install, login-screen rendering, enable/disable and profile protection passed.
- iPad simulator: native profile store/cookie isolation, legacy Default decoding, persistent Default,
  unavailable-profile refusal and in-app banner action passed. Content-edge gesture regression passed.

Tests use disposable homes/accounts, temporary databases, mock Keychain and simulator fixtures.
They do not send workplace messages, execute live schedules or authenticate a real vault.

## Remaining acceptance boundaries

- Real simultaneous Codex/Copilot/Claude service behavior, provider quotas and HC's specific sign-in
  incident still need a controlled live acceptance check. No arbitrary app limit means concurrency
  is possible; it does not mean unlimited hardware capacity or provider allowance.
- Website notifications from active page constructors use the shared framework. Background worker/
  Push API delivery is not certified; do not claim full Chromium push-service parity.
- Extension-enabled profiles are deliberately entirely private to the human: no agent DOM access,
  screenshots or Live Browser. A narrower credential-only boundary is not certified. Bitwarden real
  login/unlock, save/generate/autofill, native messaging, Touch ID and passkeys are not certified by
  the unauthenticated popup test. Native OS Bitwarden AutoFill also needs user-controlled acceptance.
- The simulator's real OS notification authorization request stalled before scheduling. The direct
  in-app path passed without OS permission; background/OS delivery remains a separate check.
- Profile removal removes account definitions and access, preserving local stored website data.
  Cached extra profiles require fresh account verification after restart or a failed refresh.
- Local build artifacts are not installations. GPL notices and corresponding source must accompany
  later distribution. No production website, Mac application or physical iOS device was updated.

## Staged build receipts

- Desktop: `dist/combined-update-0.2.10/Proteus-darwin-arm64/Proteus.app`.
  Version 0.2.10, revision `ec8b213d382e+dirty.0e596994e493`; 176 runtime file hashes checked.
  The development signing certificate matches the installed app; deep/strict signature verification
  passed. This is a local development build, not a notarized distribution.
- Both browser-services and official Bitwarden rehearsals passed against that packaged desktop app.
  Extension update from the same folder preserved its identity. Two-host desktop UI regression also
  passed all 19 groups. Evidence and screenshots are in the adjacent `verification/` and `previews/`.
- Native: `dist/ios/Proteus-0.2.10.app`, build 2610.9.2, Release for iPhone/iPad.
  The existing device provisioning profile and entitlements were preserved; deep/strict signature
  verification passed. **That profile expires October 10, 2026 at 23:29:01 UTC**; renew it before an
  installation after expiry. No physical device was installed or launched.
- iPhone simulator profile isolation and content-edge gesture tests passed. After correcting the
  test fixture's navigation, the in-app notification banner/action test passed separately. The
  earlier OS authorization stall remains the acceptance boundary described above.
- Website production assets are staged under `web/public/build`; no production upload occurred.
- The corresponding-source companion is generated with `node scripts/package-source.mjs` under
  `dist/combined-update-source`, with file-level hashes and an archive SHA-256 sidecar. It excludes
  ignored files, runtime homes, dependency folders and environment secrets. The exact upstream
  electron-chrome-extensions 4.9.0 source archive is included separately: release commit
  `927ac340c3c6cc462f636a50ccd9991df0cd2e12`, archive SHA-256
  `0f01f9faec4afaab31341f8c4b80efbabc40aef5f61b3e9a73ed8950838f9566`.
  Preserve these sources and bundled third-party notices with any later distribution.

These receipts distinguish built and rehearsed behavior from live service/device acceptance.
Deployment remains separate; installed applications, production services and protected backups
were not changed by this batch.

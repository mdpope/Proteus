# Full-chat release correction

The operator rejected the partial 0.2.10 installation and explicitly required every change queued
in this chat. Approved design prototypes must appear in the installed applications. The earlier
interpretation covering only the prior implemented batch and typing fix was too narrow.

## Implemented release scope — 0.2.11

| Items | Production integration |
| --- | --- |
| BF-01–24 | Retain the preceding swipe, setup-expansion, history, document access, notification, attachment, concurrency, profile and browser batch; see the October 9 combined ledger for individual behaviors and live acceptance limits |
| BF-25 | Present a separate native photo-selection sheet with explicit cancel callback in New chat and existing chat; preserve import limits and send review |
| BF-26 | Native chat-level status/spinner follows current messages above the composer |
| BF-27–29 | One attach/options/action row; plain +; labeled wide Model/Level/Speed/Context; compact options submenu; circular up-arrow Send, clock-badged Queue, Steer and Stop |
| BF-30 | Shared local/remote/web Run details renderer, local desktop palette, larger hover areas, centered + hover, collapsed Explanation, larger runtime with small token counts underneath, visible/copyable paths and disabled remote local-file Open |
| BF-31 | Browser textarea content sizing and 60% cap; native vertical field cap based on available chat geometry, preserving isolated draft observation |
| BF-32–33 | Inset native Chats heading; separator after Live Browser |
| BF-34 | Explicit native tab reorder sheets and existing move actions; stable selections and scoped persistence |
| BF-35 | Deduplicate shared identity and retain a private login/redirect view once during snapshot reconciliation |
| BF-36 | Reuse the persistent data-store object across native tabs in the same account/profile; preserve profile isolation |
| BF-37 | Desktop uses the website's exact Home, Workspaces and Internet Searches SVG geometry |
| BF-38 | Preserve native typing isolation and rerun long-history regression after layout integration |
| BF-39 | Discover chat-linked local previews, bundle static dependencies on the owning Mac, deliver through encrypted viewing grants, update a stable remote preview, and retain per-version interactive consent |

These changes are integrated in production source and freshly built release packages, rather
than only the design page. Installation acceptance is recorded per target below. Earlier batch
verification is in [the combined ledger](2026-10-09-combined-update.md); its historical queued and
not-installed statements do not supersede this release.

## Verification checkpoints

- Actual desktop composer rehearsal passed circles, queue delivery, labels/compact menu, growth,
  shrink, measured 60% cap, details hierarchy and exact navigation SVG presence.
- Node suite passed 404 tests, including dependency bundling and a 105-command browser burst
  through the unchanged production relay packet budget. Final JavaScript checks passed.
- Preview dependency test passed modules, CSS imports, images/fonts, stable identity across changes,
  private-profile exclusion and refusal to read unselected API paths.
- All 69 native unit tests passed, including same-profile cookie sharing across main/chat/Team,
  scoped reordering, private login redirect retention and asynchronous selected-photo loading.
- Final iPhone and iPad long-history typing checks passed. iPad inspected zero history events
  during 210 typed characters in both the long-message and 100-event fixtures. XCTest timings
  include automation overhead and are not device interaction latency measurements.
- Remote desktop passed 20 groups, including automatic static preview discovery, enabled
  controls, live token/approval updates without replacing the composer, and stable version updates
  with consent reset. The complete website suite also passed
  automatic discovery, enabled controls, stable updates, consent reset and cold reload restoration.
- iPhone and iPad automatic-preview UI acceptance passed discovery from a local chat, interactive
  controls, same-tab updates, consent reset and cold restart restoration. Repeated photo picker
  opening/cancel with retained drafts passed on both iPhone and iPad using the explicit UIKit picker.
- The exact signed Mac bundle passed isolated launch, composer circles/labels and runtime hierarchy.
- Laravel passed 80 tests / 717 assertions with disposable storage, encryption and Passport keys.

## Preview boundary

Static snapshots use a maximum of eight chat-linked previews, 64 dependencies per preview,
1 MiB per fetched asset and 4 MiB total/bundled HTML. Dependencies remain on the selected local
design origin; Proteus's own privileged origin, API/authentication paths and credential query
parameters are excluded. Extension-protected profiles stay private. Scripts remain off until
the human enables that exact preview version; updates revoke that consent. Network/files/app
actions remain blocked inside the isolated renderer. This is static preview delivery; host APIs,
WebSockets and development-server HMR are not forwarded.

## Deployment boundary

Previous 0.2.10: Build Mac, iPad and iPhone were installed, with original signer and data
preserved; HC remained pending an installer route. Those artifacts lack the full design release.
The full 0.2.11 rollout now has verified Build Mac, iPhone, iPad and production web receipts.
HC has received the signed installer through its existing Codex chat. Installation is held for
the operator’s decision about one awaiting-input chat and three queued runs; none was cancelled. The current native development profile expires October 10 at 17:29 MDT;
renewal remains separate from successful compilation/installation. Xcode automatic provisioning
reused that existing profile; the release does not extend its validity.

| Target | Current installation state |
| --- | --- |
| Build Mac | 0.2.11 installed, launched and verified; original signer/data/pairings retained |
| Work Mac | Signed installer downloaded; archive, 181 runtime hashes and original signer verified. Still 0.2.9: awaiting operator decision on one awaiting-input chat and three queued runs |
| iPad | 0.2.11 / 2610.10.2 installed, launched and verified; protected data and destinations retained |
| iPhone | 0.2.11 / 2610.10.2 installed, launched and verified; protected data and destinations retained |
| Web | 0.2.11 deployed as release `20261010T160437Z`; 9,214 file hashes and 14 endpoint checks passed; configuration, schema and protected records preserved |

The hosting Mac updater waits for all active/queued turns to finish and persist, checks the
original certificate and every packaged runtime hash, takes a cold data backup, replaces the app
in place and verifies version, unchanged protected data through replacement and pairing identities.
Native updates require a fresh protected-data backup and version/signature/data checks before
launch. None of these blocked targets is marked installed merely because a build passed.

The detached mobile updater checks the two known paired devices every 30 seconds and installs
only after they are reachable and unlocked. It checks the complete staged native bundle against
its frozen hashes before backup/install, retains failure receipts instead of repeatedly attempting
a failed replacement, and stops 15 minutes before the profile expires. It never uninstalls apps,
changes signing identities or resets destinations. Successful receipts update this target table.

## Final package receipts

- Mac: 0.2.11, revision `ec8b213d382e+dirty.0b4ce6ceffae`, all 181 packaged runtime hashes
  verified and original signer retained. The exact final signed application passed UI acceptance.
- Native: Release 0.2.11 / 2610.10.2 for iPhone/iPad, original signer and team retained;
  deep/strict verification passed. Existing profile expiration is stated above.
- Website: the initial 195-file source package was rebuilt in the established deployment workspace
  with production dependencies. Release `20261010T160437Z` contains 9,214 verified files. A fresh
  encrypted backup and isolated database restore passed before activation; HTTPS and relay checks
  passed afterward. Laravel recorded no new errors. The single Apache event was the deliberate
  environment-file denial probe; PHP lifecycle and known database column-statistics events were
  classified separately. Production chat execution was not exercised by the deployment smoke test.
  Private access, recovery and deployment receipts remain in the deployment workspace.
- Distribution companions: full corresponding source and the existing GPL browser adapter source
  accompany the Mac/web/native artifacts. Archives include SHA-256 sidecars.

Physical-device app inventory was queried again after the mobile updater completed: both devices
report version 0.2.11 and build 2610.10.2. Installation receipts verify launch and unchanged protected
data/destination identities; this does not renew the development profile or prove every live workflow.

## Subsequent long-history installation

The original full release was followed by residual long-chat reports. [The October 10 history ledger](2026-10-10-mobile-history.md) supersedes its history/performance and installed-build evidence: Build Mac revision `ec8b213d382e+dirty.b58e52468abc`, native 2610.10.4 on both physical devices, and web release `20261010T191654Z`. All history remains progressively reachable. HC received the newer verified installer but retains its separate pending-run hold. Runtime/token boxes use original larger-runtime/smaller-token values; the later proposed reduction was withdrawn.

Latest installed follow-up: Build Mac 0.2.11 / `ec8b213d382e+dirty.530439a1cc28`, installed and ready at 19:48:24 UTC with original signing, 181 runtime hashes, 26 protected files byte-identical, unchanged pairing authority and zero active runs. Browser errors now use transient actionable notifications and sanitized Logs. Both physical native clients run 2610.10.5 with earlier history preparation. Desktop/web chat pagination and original usage sizes remain unchanged. HC installation remains separately held while pending runs exist.

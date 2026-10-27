# Linux 0.2.26 candidate validation — `248e2f2`

This records the unfrozen candidate `248e2f237a8992e89ef0d25fd872271908d37167` on
`codex/next-release-0.2.26`. It is not an installation handoff. The separate
`linux/248e2f2-validation` branch carries the earlier portable UI fixtures and test-only updater
adaptations; application runtime behavior is unchanged. Existing macOS/iOS signatures, the Linux
installation, production data and main branch are outside these disposable tests.

## Source and exact package

Fresh `npm ci`, all **813 Node tests** and static checks pass. The Linux x64 package is
**0.2.26 / `linux.a0b7ed67fab0`**, with **253 runtime files**:

- Source fingerprint: `a0b7ed67fab061c960ee71dd3a2fa84e8772bc1915eb4678f0195c5bfb78ca67`.
- Archive SHA-256: `8c2d8b99a04d37821a9de9cc646d97ac5b3536aa48623dadbbb4de95cd346e79`.

`test/desktop-package-ui.mjs` passes against those exact bytes: inventory/provenance/private-data
exclusions, isolated signed-out UI and platform metadata, unavailable real-provider catalogs,
explicit synthetic feedback rehearsal, native PTY keyboard input through its canvas and retained
history after a full restart. No provider credentials are copied or real model called. The embedded
0.2.20 upstream receipt is historical import lineage; the current fingerprint identifies this payload.

All four focused source UI suites pass: canonical browser-tab stability, three real child-selection
launches, current browser home and strict multiwindow IPC/geometry/reading/Quit/Close behavior on
private Xvfb/Openbox/X11. The saved-session/canonical-ID fixture correction and Linux-only
`PROTEUS_TEST_OZONE_PLATFORM=x11`/settled-bounds checks are carried from `5f5a20a`; all original
assertions remain. Native Wayland global placement and host KWin/XWayland decoration deltas are
separate compositor limits, not waived into an exact geometry pass. See
[Electron's window-positioning limits](https://www.electronjs.org/docs/latest/api/browser-window/).

## Scoped Linux desktop control

The previously checksum-verified official Cua Driver **0.36.0** is staged privately, not installed
into the user PATH or production app environment. Private authenticated Xvfb/Openbox, a new D-Bus
session and disposable HOME/config/runtime directories isolate all native discovery and input.

- Empty-PATH discovery finds the official binary through a disposable home's `.local/bin` entry.
  Lazy status starts no backend; a missing explicit override fails closed. Actual default Linux
  discovery truthfully reports not installed. No Homebrew installation is claimed on Linux.
- The real MCP catalog admits 19 tools, reports X11/AT-SPI/XSendEvent readiness and retains the
  Mac-only fallback guard. Nine focused desktop-control unit cases pass.
- A disposable GTK window passes exact-process/window receipts, actual 640×440 PNG, background
  accessibility click, independent counter exactly one, fresh "Confirmed once" label and changed
  pixels. The driver labels its immediate effect `unverifiable`; independent state and observation
  establish this fixture's result without replay.
- The actual `desktopTools` image bridge and MCP/Codex conversion preserve captured bytes. This
  is adapter acceptance; delivery to a real model is not claimed for this Linux candidate.
- Electron exact-window capture passes, but AT-SPI is degraded and official Cua refuses its
  background input with `background_unavailable`. A fresh observation and independent counter
  zero confirm the limitation. No foreground fallback or target/observation guard is bypassed.

Stop releases every broker client/lease and both disposable app processes exit. Keyboard routes,
visible cursor animation, arbitrary application compatibility and native Wayland remain unverified.
Linux Cua acceptance uses separate GTK/Electron fixtures; the common opt-in Mac live harness still
needs its Peekaboo section platform-gated before being advertised unchanged on Linux.

## Independent packaged helper

The helper-capable **test** baseline is the earlier `c41ffa5` package,
0.2.25 / `linux.2b491477dc2d`; it is not the installed 0.2.20 app. The candidate and baseline are
verified by Linux hashes, not Apple signatures. Actual independent-helper update/compatible rollback
runs use only disposable copies/data with the real owner API and explicit rehearsal provider.

Three test-driver/setup failures are preserved: a long Chromium TMPDIR exceeded the Unix
singleton-socket path limit before startup; the old default rehearsal path waited for completion
without answering its own feedback question; the rollback driver's serialized main-process
callback used an unavailable bare `require`. The harness keeps Chromium's socket path short,
supports a separate large-fixture root, binds the exact app module loader in that test callback,
and answers only the exact fixture run's rehearsal questions in non-live mode.
It never answers provider/tool permission requests or any live-provider prompts. Mac bundle/signing
paths and the opt-in live-provider mode remain distinct; all recovery/history/dedup assertions stay.

The first actual replacement reaches complete/updated with automatic same-chat continuation,
but its original navigation-replay assertion fails when the initially unconfigured fixture changes
its generated host ID on restart. Browser-history receipt signatures include `sourceHostId`; the
stored digest matches the original owner ID, not the newly generated one. This is a pre-existing
fresh/unconfigured-host identity-continuity edge, separate from copying or verifying an update.
The representative configured-installation fixture now saves its owner configuration through
`remote.save()` before recording history; the replay assertion remains unchanged. No host ID is
removed from signatures or forcibly rewritten, and no runtime fix is applied to the candidate.
Fresh unconfigured-host identity continuity remains outside a configured-update acceptance claim.

With a persisted owner, the actual update success path passes every original assertion:
independent helper readiness/idle barrier, actual candidate renderer verification, automatic
same-chat rehearsal continuation exactly once, unchanged prior events, complete Back/Forward
history and replay of the original operation receipt. No real provider is used or usage invented.
The compatible injected-health rollback path also passes every assertion. The candidate is
actually installed and its renderer/identity verified before the explicit test-only health failure;
the independent helper restores only compatible baseline code, leaves current data intact and
automatically continues the same original rehearsal chat once. Prior event/configuration fields,
complete Back/Forward stacks and replay receipts survive. These are real packaged process/helper
transitions using explicit synthetic provider turns, not a real-provider-session continuity claim.

Both passed scenarios retain compact receipts after their owned processes exit and redundant full
disposable app copies are retired. Classified failures retain the small journal/history/state/log
bundle needed to inspect them. No production recovery generation is created, rotated or deleted.

Initial/second-instance URLs, desktop-file `%U` and both MIME schemes, strict unmatched desktop
callback rejection, packaged update inspection and helper smoke pass again against this candidate.
They do not register production handlers or perform an OAuth exchange. Exact package bytes remain
unchanged after all checks. Application runtime changes are not needed for these configured-host
acceptance scenarios; only test fixtures/paths/driver setup are changed.

Follow-up outside this tested candidate: persist a newly generated owner identity before a fresh,
unconfigured host creates durable history receipts, with a fresh-disabled-host restart regression.
Preserve existing configurations and credentials. The current candidate is not patched for that
pre-existing edge, and this ledger does not claim it is resolved.

## Installation and remaining gates

No candidate is installed on the laptop and no main merge is performed. Existing
**0.2.20 / `linux.fda4ae896542`**, chats, browser profiles, approvals, retry receipts, relay host
identity and recovery generations are preserved. Build-only tests create no full live-data backup.
No production protocol registration, OAuth exchange, real-provider continuation, production relay
pairing or physical-device acceptance is claimed. Final installation waits for the coordinator's
explicit frozen source/artifact identity and fresh idle/preservation checks.

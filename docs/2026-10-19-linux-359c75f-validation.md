# Linux 0.2.26 checkpoint acceptance — `359c75f`

This records exact coordinator checkpoint `359c75fc3217ec97cf88b2eda53defa294c3d135`,
not a frozen installation handoff. The separate `linux/359c75f-validation` branch carries
validation documentation and portable updater test adaptations only. Application runtime files,
the installed Linux app, production data, main and existing Apple signing identities are unchanged
by this validation work.

## Exact source and Linux package

All **815 Node tests** pass, with no skips or failures; static checks pass. Existing lockfile
and dependencies are unchanged from the preceding checkpoint. The staged Linux x64 package is
**0.2.26 / `linux.b3dc5f81be4e`**, with 253 runtime files and seven build inputs:

- Source fingerprint: `b3dc5f81be4e0d62c9b507cc432856209ed8f1b396bd3ad4b17e1103e50780c0`.
- Archive SHA-256: `2b4661a7fa22f835f3b315f2ef62a7c61536b9c3802157c688fbe8c9e5704693`.
- Whole-bundle updater SHA-256: `62f7a1f435f821b86f03ffaf988d399ee2f62bd9931b2a3b40a3d18792f7d28e`.

The package UI test passes against those exact bytes: complete runtime inventory and every hash,
metadata/provenance/private-data exclusions, isolated signed-out startup and platform metadata,
unavailable real-provider catalogs, explicit feedback rehearsal, real packaged native PTY keyboard
input through its canvas, and the same rehearsal history after full restart. No provider credentials
are copied or real model called; usage is explicitly unobserved. Disposable Linux basic cookie
storage is tested; production keyring access is not established by that test. The embedded 0.2.20
source receipt is historical import lineage, not the current payload identity. Linux package
identity uses hashes, not Apple signing.

## Desktop UI and focus

All six focused source suites pass: native browser-to-New-tab focus, conflict/menu controls,
canonical tab stability, child selection across three launches, browser home and multiwindow
IPC/isolation/reading/Quit/Close restoration. The focus regression passes in the native Wayland
host session. It also passes against the exact staged package on private X11: a native browser
page owns focus, New tab returns native focus to the shell, and an immediate typed character
reaches the combined address field. Strict exact geometry assertions pass on authenticated
Xvfb/Openbox/X11. These results do not certify native Wayland global placement or disregard host
compositor frame differences. All original assertions remain; no runtime adjustment is made to
satisfy a compositor. Seven logs and command/script/package hashes are retained in the ignored
checkpoint receipts.

## Scoped Linux desktop control

Official Cua Driver 0.36.0 is reused from the privately staged, checksum-verified upstream binary.
Its archive and binary hashes are checked again. No global installation, OS grant, production
browser/profile or production native window is changed. Private authenticated Xvfb/Openbox,
a separate D-Bus session and disposable HOME/config/runtime isolate discovery and input.

GTK exact-process/window receipts and real 640×440 PNG pass. A single background accessibility
click is independently confirmed by counter one, fresh `Confirmed once` label and changed pixels;
the driver's immediate effect remains labelled `unverifiable`. Actual desktopTools image results
and MCP/Codex conversions preserve the PNG bytes. This is adapter verification, not delivery to
a real provider. The real catalog admits 19 tools; X11/AT-SPI/XSendEvent readiness, Mac-only fallback
guard, nine broker tests and empty-PATH discovery through a disposable `.local/bin` entry pass.
Lazy status starts no MCP backend, missing explicit overrides fail closed, and actual Linux default
discovery truthfully reports not installed.

Electron exact-target capture passes. Its accessibility tree is degraded and capture-bound
background input returns `background_unavailable`, with independent counter zero and a fresh
observation. No foreground retry or guard bypass occurs. Stop releases all broker clients/leases;
known fixture processes exit and the private display is released. Native Wayland, cursor animation,
keyboard/general application support and real-provider image delivery remain unverified.

## Packaged owner restart and independent helper

Upstream `872f9ab` persists newly generated owner identity while remote access remains disabled.
The fresh-disabled-owner restart regression passes in the full runtime suite: stable owner ID,
0600 config, no paired devices/listener, complete Back/Forward stacks and replay of the original
navigation operation. The same check passes with two actual cold launches of the exact current package: no remote
config is seeded and no explicit `remote.save()` is called. The existing identity file remains
byte-identical, access stays disabled with no paired devices, and the original navigation operation
replays without changing the full two-entry Back/Forward stack. This resolves the earlier
`248e2f2` unconfigured-owner edge for the tested source and actual packaged restart.

Strict initial/second-instance protocol delivery, desktop metadata `%U`/both schemes, unmatched
callback rejection, actual packaged `inspectPackage()` and exported helper smoke all pass. These
tests do not register production handlers, exchange OAuth credentials or reuse production sessions.

Actual independent-helper update and forced compatible rollback both pass using disposable
copies of the helper-capable 0.2.25 / `linux.2b491477dc2d` baseline. This is not the installed
0.2.20 app. The real candidate renderer/identity health is verified before the explicit test-only
failure triggers rollback. Compatible rollback restores code without restoring old data. Both
outcomes automatically continue the same original rehearsal chat exactly once and retain the
prior event prefix/configuration fields, complete Back/Forward stacks and original operation
receipt replay. A duplicate recovery dispatch is refused. Usage stays `observed: false`; no real
provider is called and provider-session continuity is not inferred from rehearsal fields.

The portable test harness retains the upstream 120-second prepare timeout, baseline stderr
capture, inspector detach before real exit, default legacy-owner initialization and every original
history/recovery/dedup assertion. Linux uses its real package layout and lowercase executable,
hash identity labels, isolated non-live HOME and provider paths, optional private X11, a separate
large-fixture root with short Chromium TMPDIR, and bounded owned-process cleanup. Only the exact
fixture rehearsal question is answered, never live-provider or permission prompts. Mac signing
and opt-in live-provider paths remain. Optional `--fresh-owner` avoids explicit initialization
only when testing a baseline that already persists its identity. The independent fresh-current
restart fixture above calls no explicit save at all.

No new test failure or runtime patch is required. Both accepted updater outcomes retain compact
receipts; known owner/helper processes exit and redundant disposable app copies are retired.
Production recovery generations are not created, rotated or deleted. Exact source and package
hashes are checked again after acceptance.

## Installation and remaining gates

Installed **0.2.20 / `linux.fda4ae896542`**, real chats, browser profiles, approvals, retry receipts,
relay identity and recovery generations remain unchanged. No new production recovery generation
is created for build-only validation. No production handler registration, OAuth exchange, relay
pairing, physical-device acceptance, final installation or main merge is claimed. Installation
waits for the coordinator's corrected Mac signed acceptance and final frozen source/artifact
handoff, followed by fresh idle/preservation checks. Active and awaiting work must be preserved.

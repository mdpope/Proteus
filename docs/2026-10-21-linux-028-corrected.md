> Historical artifact-specific acceptance. Superseded by the
> [October 22 Linux 0.2.28 deployment](2026-10-22-linux-028-install.md);
> statements below describe their original checkpoint, not current rollout instructions.
> This report does not certify a 0.2.29 candidate.

> Historical checkpoint: superseded by the [October 22 deployment](2026-10-22-linux-028-install.md).
> Its disabled-relay/empty-peer observations are no longer the current Linux state.

# October 21 — corrected unified Linux 0.2.28 accepted

**Installed and locally verified:** Proteus **0.2.28 / `linux.c88e46430428`**.
This independent Linux build supersedes initial `linux.bfa15a889dd5`; the peer gate hold
in the [initial installation report](2026-10-21-linux-028-install.md) is resolved.
The original project checkout/main remain unchanged; source and evidence are on the separate
`linux/release-0.2.28-aa0b` branch. No Mac/iOS binary or signing change was made from Linux.

## Exact source and artifact

| Item | Identity |
| --- | --- |
| Frozen private transfer | `codex/signed-proteus-028-8011-20261021` at `acb7f0c438bff34274717c016cf8627c683bfbef` |
| Linux source import | `0834165dcb48c82859d913600ec42f96ea674c29` |
| Transfer index SHA-256 | `dc482b548e69dc022c86ba405e8fb2a1c896172b5123f4502eb44d4c096782fa` |
| Source archive SHA-256 | `65c93f8e890fd11a7bc200602f0c76a14c10db7621313b3bd139f2f4e0397067` |
| Linux source fingerprint | `c88e46430428852c726d48b26251dd979ece29edf4fc1925be0e94b7751d14ba` |
| Linux bundle tree SHA-256 | `10441753599e796221464dd84a30ef9c0b1ff0d0d68802ef75d91bfd6dc0cb7c` |
| Linux archive SHA-256 | `c95801b834879219cc961c213bc63af2042cce75544819eeefee06d6c1b89527` |

All 1,102 source files verified before import. All 298 packaged runtime files match the
corrected frozen manifest and source. Compared with the initial build, the only runtime code
change adds `integrations.list` to the existing DesktopPeers allowlist. CHANGELOG.md is the
second changed file in the runtime manifest. The upstream regression and documentation also
changed; Linux provenance is an intentional independent build input. Mac build/fingerprint
identities in that provenance describe accepted source context, not a Linux signing identity.

## Verification

All **865 Node tests** and static checks pass. The targeted desktop-peer/integration suites
also passed **31/31** checks, included in that total. The exact corrected package passed startup,
private exclusions/provenance, synthetic rehearsal, native PTY keyboard input and full history
across a real package restart. Existing exact-package window controls, relay pairing interface
and release-follow-up suites pass. Source/package hashes were independently reverified.

Actual packaged Engine Room → Accounts & Integrations → Other computers acceptance used two
disposable hosts, a loopback relay, real encrypted paired sessions, and the real trusted renderer
IPC. Both host inventories loaded and refreshed independently (two reads each). Four unsupported
integration-specific mutation methods were rejected before dispatch. Peer panels offer no
check/recover/login/edit/favorite/source-refresh controls. Fixture settings, context, permissions,
health, run and grant hashes remain unchanged; no provider turn/probe/login/recovery/integration
write occurred. Encrypted traffic contained no plaintext command/inventory markers. This does
not remove other existing remote capabilities or grant new integration management authority.
All private hosts/relay/display helpers exited and disposable fixture copies were retired.

Prior initial-release evidence is retained for unchanged video exact X11 position/size, same
player/WebContents/history/fading controls, native Electron awake lifecycle, and independent
normal updater/forced compatible rollback. The actual installed corrected tray starts OFF and
its native window is visible. Physical OS/hardware inhibition remains outside that evidence.

## Installed data and live provider

Both corrected starts pass strict preservation. Three chats retain **all 681 events**, exact
native session prefixes, effective model/context/configuration and associations. All three run
files remain byte-identical across the final restart. Restored **12 tabs**, selection/drafts,
**26 navigation entries**, **68 no-TTL navigation receipts**, retry rules, credentials/settings,
project/workspace membership, disabled schedule and current 15 unexpired cookie payloads pass.
Two earlier cookies expired naturally before this correction. Cookie decryption/site login is
not claimed. Existing migrated root/workspace favorites and version marker are byte-identical;
this correction does not migrate or union another machine's favorites.

The initial release's explicitly synthetic, no-tools Codex continuation retained its native
session, delivered once, and added two events to the prior 679. Codex runtime code is unchanged
by this correction. The corrected installation refreshed provider metadata and confirmed the
restored chat's model remains available, without another provider turn or external workflow.
The second corrected restart runs without inspector or remote-debug flags. The owner lock and
health agree; no active/pending/queued/deferred turns, terminals, enabled schedules or
scheduler/recovery errors were observed.

Production has no encrypted native peer store or paired destinations. The installed renderer's
actual trusted `peers({action:'list'})` IPC returned an empty inventory without creating a store.
The encrypted populated-inventory result above is disposable paired-host acceptance; no real
Mac/Linux/iPhone connection is claimed. Current relay remains DISABLED, with identity/token/
pairings/configuration byte-preserved. No relay activation, reprovisioning, new pairing or grant
change was used to manufacture a live success.

## Recovery and cleanup

Both registered full generations were independently reverified (receipt, data/profile roots and
rollback app). The original pre-0.2.28 capture is reused as a same-release **code rollback**
reference; its older 679-event data must never replace newer 681-event live state. **Zero new
full snapshots** were made for this correction. Exactly two verified full generations remain;
no generation was rotated merely for this rebuild.

After installed acceptance, the superseded initial-0.2.28 swap app/archive and duplicate extracted
source directories were removed. Exact source archives/manifests, compact private proofs and the
corrected release archive remain. Measured free-space observations are recorded in the private
installation index; logical artifact sizes are not reported as physical bytes reclaimed.

## Remaining live limits

Real paired-computer inventory and production relay registration/reconnection remain unverified
on this currently unpaired/relay-disabled laptop. Native Wayland global positioning/control,
actual website video/vault authentication and physical sleep inhibition remain outside this
acceptance. Other provider workflows were not rerun. The private test D-Bus keyring limitation
does not weaken production encryption guards. These limits do not block the tested local Codex
application or this narrow peer gate correction.

## Final observed space and receipt

After cleanup and delayed filesystem reclamation, available space was
**1,945,814,073,344 bytes**: −15,458,304 bytes compared with the final initial-0.2.28
observation and −783,417,344 bytes from the original source-verified preparation baseline.
These observations include concurrent filesystem activity and do not equate logical file sizes
with reclaimed space. The durable private index records 65 compact proof files and exactly two
verified full recoveries, with SHA-256
`6f051280f21013b3005564c7596f3795ab55f37321e4ec14e620a342623b8be7`.
The recovery policy points to this accepted corrected-build index.

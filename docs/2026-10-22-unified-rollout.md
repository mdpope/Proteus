# October 22 — Proteus 0.2.29 combined rollout

The operator authorized integration, testing and updates to both Macs, Windows, Linux,
web, iPhone and iPad. This supersedes earlier preview/build/installation holds for this
release. The unrequested Home URL box is removed; Proteus is the primary heading.
No license change, shared browser sign-in, remote page streaming or terminal-output
sharing was introduced. Full browser session history remains retained.

## Source and artifacts

Desktop runtime was frozen at `abad91f685e9ea46d7b18675a8f8c09fc85ebbea`.
Subsequent Linux native-view readiness and Windows CSS-selector escaping commits change
only test setup; subsequent acceptance documentation does not reidentify installed packages.
Earlier PRs #16–19 were closed as superseded and #21 merged. Historical private transfer
branches remain artifact records rather than additional implementation branches to merge.

| Target | Accepted artifact |
| --- | --- |
| Both Macs | `abad91f685e9+src.20791699cc10` |
| Windows | `windows.48482a435b4f` |
| Linux | `linux.80d84ef350ad` |
| Web | 0.2.29, source `66affae`, release `20261023T000744Z` |
| iPhone and iPad | 0.2.29, native build `2610.22.2` |

The later desktop follow corrections do not change the deployed web/native runtime.
Private source companions, signed-artifact hashes, device identity and recovery receipts
remain in their operator/deployment workspaces, outside this repository.

## Validation

Final integrated Node acceptance: **1,051 passing, one platform skip, zero failures**;
static checks pass. Windows reports **1,050 passing, two existing POSIX skips**, with
static checks passing. Web: **101 tests, 867 assertions**. Native: **140 unit tests**
and phone/tablet pairing UI checks pass. Hosted GitHub CI did not run because of the
account billing/spending limit; these are local acceptance results.

Exact desktop packages passed scoped two-host follow with controlled 400 ms descriptor
latency, independent cookies, complete Back/Forward history, scope inactivity, late DOM
mounting, genuine input cancellation and sustained bidirectional scrolling. Mac measured
47/51 visible position updates, maximum gaps 1,299/437 ms and 2/5 descriptor reads.
The original latency/duplicate-metadata failures remain recorded separately from passing
corrected artifacts. Test setup waits for the selected native page before sending input.

Exact-package UI acceptance covers background link tabs, hide/unload/restore, blank-strip
double-click, persistent autoplay preferences, extension ordering, popup/refresh/project
moves, detached video/window controls and restart restoration. Linux additionally passes
normal update and injected compatible rollback. Physical trackpad gestures on every
hardware/desktop combination are not inferred from automated gesture/window tests.

## Installed acceptance

- Build Mac: installed and live verified with one owner. Home shows the correct build;
  the history UI exposes all 5,740 visits back to October 4. Protected checks preserve 31
  runs, 138 logical tabs, 108 content tabs, 722 navigation entries, 2,068 navigation receipts,
  and 31 protected retry receipts. All three protected databases pass integrity checks.
- Work Mac: installed and running the exact same signed Mac artifact. Preservation checks
  pass for 372 chats, 100 saved views, window sessions, saved approvals, history, 3,956
  protected retry receipts and 897 captured native-session files. The operator explicitly
  authorized stopping the two waiting chats; originals remain preserved without automatic
  continuation or replay. Final retention is complete; Windows and Build Mac peers are
  online, all three providers available, and all three databases pass integrity checks.
- Windows: installed and live verified, debugging disabled, relay online. All five pairings,
  protected credentials/grants, host/token identity, browser encryption identity and schedule
  definition pass preservation checks. The installed public-feed client downloads the entire
  393,760,707-byte archive, verifies signature/hash, extracts and passes renderer smoke;
  the already-current build is not redundantly reinstalled.
- Linux: installed and live verified after normal restart without debug flags. Relay is online
  and Codex available. Both retained recovery generations are independently rehashed, and
  the installed tree remains exact after cleanup. Original strict comparison
  is retained: catalog changes
  are scan timestamps and refreshed cookies retain their identity/security attributes.
  Website reissuance is an inference from stored evidence, not an observed response; see the
  [Linux-specific acceptance and limits](2026-10-22-linux-029-install.md).
- Web: deployed, authenticated Connections and Home verified; no Home URL box. All 9,221
  deployed hashes, nine served assets and 14 endpoint checks pass. Bounded logs show no new
  application/relay errors. Recovery used the existing capture-state verifier after the normal
  isolated restore command failed; normal restore is not claimed to have passed.
- iPhone/iPad: in-place installation, protected-data hashes and launch pass for both devices.
  iPhone preserves 232 files / 60,294,668 bytes; iPad preserves 223 / 54,153,877. Physical QR
  camera orientation and a newly exercised real-device pairing remain unverified separately
  from simulator/UI acceptance. Existing certificates were retained.

All physical device pair combinations and real provider continuations were not re-exercised.
Readiness/relay registration is not proof of every remote workflow. No user project or live
chat was used to generate synthetic follow traffic.

## Public Windows release

The [download page](https://downloads.proteus.example/downloads/proteus/windows/) and signed stable catalog now
serve 0.2.29. All five public hashes and full binary HTTPS downloads pass, using the existing
Ed25519 key. Installer Authenticode remains absent by the operator's prior decision.
The audit preserves 1,127 original site files, three previous immutable files, Apache/private
Apple configuration and existing quota, with zero new Apache error lines in the test window.
The deployment workspace contains source provenance, installed-client acceptance and recovery.

## Retention and limitations

Two verified full recovery generations are retained per installation/physical device. Protected
retry receipts and complete browsing history are excluded from cleanup. Actual free-space changes
are recorded independently of listed file sizes because APFS sharing/snapshots and concurrent
writes prevent treating deleted logical bytes as recovered physical space.

Build Mac retired an old recovery generation and duplicate rollback bundle; that window's
observed free-space delta was -332,800,000 bytes while Windows artifacts were downloading.
Separate superseded generated staging/build cleanup gained 2,077,741,056 bytes. Earlier verified
unreferenced temporary Git pack cleanup gained 8,033,120,256 bytes. No combined end-to-end free-space
claim is inferred from these separate measurements. iPad old payload cleanup gained 9,129,984 bytes.

Work Mac retains two byte-verified generations and measured 4,033,593,344 bytes of additional
free space across its recovery/duplicate-bundle and superseded-staging cleanup. Five external
transcript references were already missing before the update; persisted app histories remain.

Windows retains exactly two verified generations. Its post-update free-space delta was
-807,530,496 bytes (cold helper window -810,704,896). Automatic approval review blocked deletion
of two old generated build folders; both remain (2,646,902,047 logical bytes /
2,664,357,888 allocated bytes across 10,688 files), and that cleanup reclaimed zero bytes.
The operator explicitly approved those exact two folders again; automatic review still rejected
the normal deletion attempt as “blocked by policy.” Both remain unchanged; no alternate deletion
mechanism was attempted. The installed app and two recovery generations were reverified.

The Windows publication transport and duplicate extracted payloads were rehashed then retired,
retaining canonical downloads/source/private transfer. Listed payloads removed total 1,092,643,724
bytes, but measured local free-space delta was -73,728 bytes, so physical space recovery is not
claimed. The completed catalog recovery pin was released; no website backup generation was
removed, and the unrelated Apple recovery pin remains. Production filesystem free space after
publication was 2,154,094,592 bytes; its decline includes the newly retained release and concurrent
activity. No quota or retention exception was silently created.

Linux retains two independently rehashed recovery generations. After filesystem synchronization,
its cleanup increased available space by 1,755,447,296 bytes; the complete build/update workflow
changed available space by -961,118,208 bytes. These are separate measurements, not a promise
that all deleted logical bytes became newly available on Btrfs.

Navigation receipt growth remains a separate investigation. Protected Linux pending claims must
not be pruned to manufacture a storage improvement. Known missing external transcripts at preflight
remain distinguished from new loss. Production MariaDB query-plan benchmarking, full provider
continuation coverage and physical mobile camera acceptance are separate remaining validation.

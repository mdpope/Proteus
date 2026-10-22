> Historical artifact-specific acceptance. Superseded by the
> [October 22 Linux 0.2.28 deployment](2026-10-22-linux-028-install.md);
> statements below describe their original checkpoint, not current rollout instructions.
> This report does not certify a 0.2.29 candidate.

# Linux 0.2.27 installed acceptance — October 21

**Installed and independently live-verified:** 0.2.27 / `linux.efadefd11f92`.
This is an independent Linux x64 build of the verified corresponding source, with Linux packaging,
host/PTY integration and existing data retained. It is not the signed Mac binary.

## Frozen identities

- Private transfer commit: `e86a11f408916cf5ce1db2734db32fa14e04f102`.
- Transfer index SHA-256: `3fb5c45a7b9d407e3b7bea35ae4a3588cd6cd5fef1da03b399da1e27be3f7313`.
- Source archive SHA-256: `7e1190d41e8dd0c26e720ce3959958efdd3902b0f1193028858640169bb51260`.
- Linux source import commit: `262359ecb6d001ddd6d6edf413dd5865062dc363`.
- Linux fingerprint: `efadefd11f9254c7468a5ca561e045064bfb7a0069a22f30f1921e2849ddcbc9`.
- Linux whole-bundle SHA-256: `9035bee803eb3df8c7a4721c19617e7acf9783a2d78c8938f9e2b59de0c5780f`.
- Linux release archive SHA-256: `994e48f870cc9277532139e77bd1c8124bb69b35ae0f151f716fb1565a581aa0`.

All 1,068 archived source files and seven frozen Mac build inputs verify. All **281 runtime files**
remain exact matches to the frozen source, including renderer recovery's controller, local fallback
page and main-process integration. No Linux runtime patch is needed. The Linux build-input change
updates `docs/linux-upstream-source.json` with this import identity. Local-only tracked files are
preserved. Three UI harnesses use `os.tmpdir()` for four screenshots instead of `/private/tmp`;
the initial actual ENOENT and exact test-only diff are retained, with every assertion intact.

## Source, package and live checks

Locked installation, all **844 runtime tests**, static checks and whitespace checks pass. Seven
source UI suites and four exact-package focused suites pass on private authenticated X11. Actual
renderer crashes in two windows preserve the same host and scheduler polls, native browser
processes/form state, independent tabs/drafts/reading positions and pending approval; exactly the
original two synthetic turns finish once. Bounded recovery-page fallback, untrusted-bridge rejection
and native View retry pass. Header/Enter/centering, integrated shared Team/named window restore,
palettes/save/discard/multiwindow/restart, new-tab reveal and late-navigation isolation pass.
Source ordinary multiwindow checks retain strict geometry/IPC/reading/Quit/Close assertions.

The exact package independently passes runtime/private-file inventory, synthetic rehearsal,
native PTY canvas keyboard input and full restart. Its own packaged inspection/helper smoke,
independent disposable update and forced compatible rollback pass with original rehearsal history,
Back/Forward stack, original operation replay deduplication and exactly one automatic continuation.
No real provider is called by those fixtures; all owned fixture processes/copies are retired.

Fresh production guards found no active/pending/deferred/queued chats, terminals, downloads,
enabled schedules or existing update job. One fresh cold recovery precedes the authorized idle
graceful code-only replacement. The actual renderer is visibly ready with restored tabs/selection;
its real header is inspected. The second normal launch has one owner, no debugging flags, no
scheduler/recovery errors and refreshed Codex readiness. A manual no-tools synthetic continuation
uses the same existing native Codex session and preserves its previous events. This does not claim
automatic real-provider helper continuation in production.

## Preservation, recovery and limits

All eleven protected configuration files remain byte-exact; original chat events/native-session
prefixes, typed content scopes, nine tabs, selection/drafts, fourteen navigation entries and
forty-five navigation receipts are preserved. The command journal is empty. All twelve original
saved reading-position values remain exact, with a new current-position entry. Saved ended-terminal
history is retained and no terminal/startup command is replayed.

Of thirteen preflight cookies, two were already expired and naturally disappear at graceful
shutdown. All eleven remaining cold-baseline cookie payloads match immediately after installation.
Later normal browsing adds two cookies and updates one existing payload with newer creation/update
timestamps and unchanged key, storage-protection class and secure/HTTP-only/persistence flags;
ten baseline payloads remain exact and no unexpired key is lost. This narrow exception is recorded
separately from the retained strict comparison result. Website causation is an inference; cookie
decryption and site login are not claimed.

The unchanged isolated profile test passes its first-session profile isolation/storage/revocation/
popup checks, then fails its encrypted-session restart assertion because the private Linux D-Bus
has no secure keyring and production correctly declines the snapshot. That failure is retained;
no assertion, keyring, grant or runtime guard is weakened. Real-profile continuity above is separate.
Native Wayland global placement/control and the original renderer SIGTRAP trigger remain unverified.
Official Cua stays discoverable and stopped with no Linux Peekaboo backup. Relay remains disabled.

Two verified same-owner full recovery generations remain, each with one previous app. The oldest
eligible generation, duplicate superseded release archive and duplicate extracted source staging
are retired after successful installed/second-restart acceptance. Exact current source/archive and
compact receipts remain; no full after-install copy is made. Observed available space across the
entire preparation/build/install workflow changes by **−81,768,448 bytes**; from artifact staging
through final acceptance it changes by **+720,273,408 bytes**. These are filesystem observations,
not summed logical sizes or a unique physical-reclamation claim. Detailed paths, private hashes,
chat/session data, cookie identities and provider usage stay outside Git.

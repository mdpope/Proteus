# Windows terminal ownership prototype

This source branch is a review prototype based on ee6ff3e. It is not packaged,
installed, signed or published. The previous frozen 57c release is unchanged.
The general handoff, planned updates, release metadata and shutdown IPC guards
are deliberately outside this patch's ownership.

## Ownership boundary

A dedicated compiled x64 .NET Framework guardian creates an anonymous Job Object,
sets only JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, verifies its sole handle is not
inheritable, and assigns GetCurrentProcess() before starting any broker or user
command. There is no PID lookup, breakaway flag, privilege adjustment, named job
or alternative launch path. Unsupported nested-job assignment rejects before
broker creation. All subsequent processes inherit the job's restrictions.

The guardian starts the existing Electron executable as a Node broker. Only
internal runtime/script paths are on argv. Shell, args, cwd, environment and input
travel over private redirected pipes in bounded UTF-8 JSON/base64 frames. The guardian never interpolates user input into a launcher command. The selected
terminal shell still interprets profile commands and terminal input normally. The broker uses the existing
pinned node-pty default ConPTY path, never useConptyDll and never node-pty.kill().

Natural root exit forwards its real exit code and output tail, then the guardian
closes its sole job handle. Windows terminates the full job including guardian,
broker and descendants. Explicit close, desktop stdin EOF, broker failure and
guardian/owner crash use that same ownership boundary. No delayed numeric-PID
fallback, process-tree scanning or taskkill is used. The desktop's bounded stuck-
guardian fallback uses only the retained ChildProcess native handle. Explicit
forced termination reports a null terminal exit code rather than inventing a
root-shell exit code. Exit is delivered once after guardian stdio closure; Windows
job teardown can finish other members shortly afterward (the real test requires
held root/descendant handles signalled within 250 ms).

The proxy buffers bounded early output and pipe writes, preserves UTF-8 across
frame boundaries, and bounds protocol frames (512 KiB), pending writes/early
output (512 KiB), individual input (64 KiB) and broker pending output (2 MiB).
Backpressure overflow fails closed rather than growing memory indefinitely.
TerminalStore includes asynchronous startup in capacity/disposal accounting.
POSIX and tmux retain their existing spawn and process-group cleanup paths. Root
selection, profile validation, startup-once, history and agent permissions stay
at their existing boundaries.

## Build and packaging prerequisites

`scripts/build-windows-terminal-guardian.mjs <new-absolute-output.exe>` uses the
existing Windows .NET Framework x64 compiler. Runtime compilation, Add-Type,
PowerShell launchers, downloads and end-user developer-tool installation are
not part of the desktop path. The build receipt prints compiler/source/helper
SHA-256. `--test-job-failure` builds a separate test-only executable that can
invoke an invalid SetInformationJobObject class: the OS rejects setup before
any broker/sentinel command. Production compilation omits that argument seam.

Before release packaging, a reviewed build must place the exact compiled helper
at `desktop/terminal/windows-terminal-guardian.exe`, include it in the runtime
hash/provenance, and include this C# source and builder in the Windows build-input
identity. Preserve the matching source companion, pin/record compiler identity
and retain exact helper hashes. Existing desktop runtime roots already cover
that asset path, but the package builder is NOT wired to compile/verify it yet.
Without the helper the new Windows process path fails closed; it must not silently
fall back to legacy spawn. .NET Framework runtime availability and antivirus/
application-control acceptance still need validation on supported clean Windows
images. This prototype does not justify a new release package or signature.

## Validation and limits

`test/windows-terminal-protocol.test.js` covers ownership handshake rejection,
UTF-8 split frames, delayed exit, changed reported PID identity, native-handle-only
stuck close and disposal racing asynchronous owned startup.

Run `test/windows-terminal-ownership.mjs <new-receipts> <helper> <test-helper>`
with the matching Electron executable in ELECTRON_RUN_AS_NODE mode and a pinned
Node executable supplied as PROTEUS_TEST_NODE. The separate owner fixture uses
only disposable scripts/processes. The same harness accepts an actual legacy
app resource root for the .29/frozen .30 red comparison. Its descendant retains
the unchanged 12-second self-exit deadline and original corrected PowerShell
`& script; exit $LASTEXITCODE` wrapper; natural exit still has a 10-second bound.
Legacy natural cleanup must fail, not be excluded.

Real acceptance covers natural exit 7, explicit close with running descendant,
repeated close/dispose, guardian crash, owner pipe disconnect, job-setup OS
failure before sentinel, real input/resize/output tail, startup not replayed and
history restored inactive. Held process handles establish actual identity and
termination without using a PID as a kill target. Warmed process handle counts
must return exactly to baseline and active transport resources to empty.

No live provider, real user shell, production home/registry/account, recovery
capture, elevated token or Windows policy/feature changes are used. The existing
native encoding warning is retained on stderr. The failed DLL experiment remains
separate and is not an enabled fallback. Real POSIX execution, clean-image
packaging/installer acceptance and policy-restricted nested-job environments
remain separate platform acceptance work; this Windows prototype cannot claim
those outcomes. All failed attempts are retained in external private receipts,
including fixture UTF-8 corruption/syntax correction, without relaxing bounds.

The first default-path handle measurement retained a failure (205 to 208) when
WorkspaceFiles was lazily imported midway through measurement. The final harness
loads that test dependency before warmup, records counts around every case, and
repeats the default path: 205 before and after each measured case, zero active
transport resources. The strict equality assertion is unchanged; no tolerance,
process exclusion or deadline extension was added. This qualifies the initial
measurement rather than erasing it.

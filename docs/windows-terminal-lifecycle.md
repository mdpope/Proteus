# Windows terminal ownership

The Job Object implementation and build integration are source-validated. A new exact Windows
package and real installer/update/rollback acceptance remain pending. The previous frozen signed
57c artifact is unchanged, and installed Windows .29 remains in place. Source integration does
not establish an installed outcome.

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

`scripts/package-windows.mjs` invokes the exported builder through
`scripts/prepare-windows-terminal.mjs` before creating the desktop snapshot. Each compile uses
a new private scratch output; only a verified production receipt can replace the regular managed
asset at `desktop/terminal/windows-terminal-guardian.exe`. Linked paths, test seams and mismatched
source/helper/compiler receipts fail packaging. Runtime provenance includes the exact executable;
build inputs include its C# source and both build scripts. The separate build receipt records the
compiler hash and is retained outside the package. Scratch files are retired, while the generated
managed asset remains ignored by Git. Include its exact bytes in the frozen source companion when
comparing all declared runtime files; record canonical tracked source separately from generated
assets. Native source stays outside Mac/Linux runtime packages.

The preparer creates the missing `desktop/terminal` child beneath the existing regular desktop
directory, since Git cannot retain an empty generated-only directory. Existing files and directory
links remain rejected before compilation. The first d5dc6c9 clean build exposed this omission;
its accepted package used only an empty-directory workaround with unchanged compiler/packager
source. Keep that original failure and qualification with its frozen candidate. The source-only
directory correction does not rewrite, rebuild or re-sign an existing accepted artifact.
The exact 268eda7 correction is verified on Windows with 12 focused tests, static checks and
one real compiler invocation from an initially absent directory. All four file/junction parent
cases refuse before compilation. The separate compiled test helper is not a replacement release.

Without the helper the Windows process path fails closed and cannot fall back to legacy spawn.
.NET Framework/runtime policy on clean or older Windows images remains unverified; the actual
build host's framework and two compatible nested-job cases are observed below. Never install
frameworks, enable machine features or weaken job policy as an implicit deployment fallback.

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

## Unconfirmed termination contract and pinned build receipts

`close()` and `closed` are bounded operation-result promises. Graceful close still
gets one second before using the retained ChildProcess handle. If `kill()` throws
or returns false, the close operation rejects immediately at that point. If it
returns true but no actual `close` arrives, a new one-second confirmation deadline
rejects the formerly unbounded wait. Startup still has its original ten-second
bound; native exit/descendant deadlines remain unchanged.

The rejection has code `PROTEUS_TERMINAL_CLEANUP_UNCONFIRMED`,
`cleanupUnconfirmed=true`, and `cleanupCompleted`, a separate promise resolving
ONLY on an actual guardian `close` event. It never resolves because of a timeout,
a successful kill request, a protocol exit frame or the bounded rejection.
Startup rejection retains the original startup error as `startupError` when
cleanup is also unconfirmed. Root retains that rejection as a startup blocker
until `cleanupCompleted` resolves. Ready sessions receive no synthetic exit and
remain running/blocking after a rejected close. A later actual close may emit
exit once and resolve lifecycle confirmation; the earlier result stays rejected.
Root owns TerminalStore reservations/update-blocker and supervisor integration.

The build module exports `buildWindowsTerminalGuardian({output,
testOnlyJobFailureSeam=false})`, with an inert import and CLI-only printing.
It requires Windows x64 and the existing compiler, refuses output overwrite,
hashes C# source/compiler BEFORE compilation, verifies both unchanged AFTER,
and returns those pinned hashes plus the final helper hash. Concurrent mutation
rejects without issuing a trusted receipt; its unverified output remains for
inspection and cannot be overwritten on retry. Tests mutate only copied fixture
source/compiler files through a mocked compiler invocation, never host tooling.

Formatting removes BOMs and expands critical C#/JS/build/test code into readable
functions. Native guardian/broker behavior and frame/size bounds are retained.
The helper runs here under CLR 4.0.30319.42000; its references are mscorlib,
System and System.Web.Extensions version 4.0.0.0. Installed framework release
533509 is observed; older/clean images are not established by this machine.
`test/windows-terminal-nesting.cs` probes ordinary and UI-handle-restricted
anonymous outer jobs using only disposable processes. Both nested successfully
on this Windows build; a genuine incompatible nesting environment remains an
acceptance limitation. The separate actual invalid-job-info OS failure still
proves rejection before the sentinel broker/command can run. No policy, token,
privilege, account or machine feature changes are made by these probes.

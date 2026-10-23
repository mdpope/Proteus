# Omi processing in Transcription

Proteus can observe the existing Mac Omi pipeline and prepare three ordinary native schedules.
The Transcription section also has a separate private notes & MacWhisper area for the two
general transcript schedules. See [Transcription](transcription.md) for the verified
ownership audit, source mapping, independent gates and replacement acceptance plan.
The integration and all prepared schedules are **disabled by default**. Opening the
screen, refreshing status, or preparing schedules never runs a worker or changes a
LaunchAgent, Codex automation, native configuration, recording, iCloud file or vault.
Bluetooth collection and mobile library/review remain in the separate Omi iCloud app.

## Ownership and preparation

The Omi area within Transcription has Overview, Schedules, Runs, Logs and Settings tabs. Configure the
existing pipeline state folder, installed Python executable, installed worker,
native configuration file and Codex automation directory. These host paths stay in
`omi.json` under the private Proteus data directory. The native configuration remains
authoritative for models, transcription, semantic policy, domain routing, claims,
review, retention and publication. Proteus does not copy those policies into its code.

The two areas prepare the following disabled schedules, with skipped misfires; each
area touches only its own schedules:

| Schedule | Default cadence | Existing command / responsibility |
| --- | --- | --- |
| Audio & transcription | Every minute | `run --max-jobs 8`: verification, sessions, local ASR and packaging |
| Library & review controls | Every minute | `library --housekeeping-only --apply`: control synchronization |
| Semantic processing | Every minute | `semantic-run --max-jobs 1 --apply`: bounded semantic processing |
| Transcript intake | Hourly at :15 | Import the configured personal Codex intake automation |
| Transcript follow-up review | Daily at 20:45 | Import the configured personal Codex quality-review automation |

The first three commands match the installed service desired state observed during
implementation. Ordinary schedule editing controls cadence. Worker batch policy stays
in the existing native code/configuration. The two Codex automations cover non-Omi
imports, context updates and quality audits as well as native Omi catch-up, so the
semantic service does not replace their entire responsibility. Their prompts, model,
effort and workspace are read from the existing private source files only when preparing;
none is committed to Proteus. The importer validates the known cadence rather than
silently guessing when source definitions change. Missing sources are reported in the
screen and skipped. The paused, finite pendant-recovery heartbeat is incident-specific
and is not imported as a permanent processing schedule.

Imported AI schedules explicitly identify the canonical personal workflow instructions
and skill using the native config's workflow checkout. That checkout and the native
pipeline are added to the original workspace access list. Host skill discovery is not
assumed. Missing canonical policy files block preparation. Policy content stays owned
by its source repository. Separate professional routing continues through that existing
policy; Proteus adds no professional workflow policy or data to this repository.

Preparing again disables schedules in the selected area while preserving their
operator edits. General intake uses a separate execution gate and canonical manifest
verification; its replacement does not require unloading native Omi services. It requires the current settings revision and rejects conflicting
schedule identities. Preparation does not enable the global integration gate.

## Later testing and replacement

This implementation does not perform automatic takeover. After independent acceptance
and an operator-reviewed cutover, unload the three native LaunchAgents separately and
pause each source Codex automation before activating its replacement. The Omi Settings
screen requires explicit cutover acknowledgment and verifies native services are
unloaded before enabling native processing. General intake instead verifies paused
source automations through its separate settings and does not stop native services. Unknown launchd ownership fails closed. Then enable the
individual regular schedules that should run. On non-macOS hosts launchd ownership is
unknown, so native execution is unavailable.

The engine checks the current global gate when preparing and executing a run. The
native provider repeats the gate and ownership checks just before spawning. This
covers disabled schedules manually run through generic paths and old run snapshots.
Reserved Omi schedule identities cannot bypass checks by losing their integration
marker. A general Codex replacement requires its independent gate, unchanged canonical
source fingerprint and original source automation to be paused.
Disabling prevents new execution, while an already-running native transaction is
allowed to finish. Cancellation is an explicit run action.

The installed Python code retains its worker, review, library and publication locks;
Proteus does not invent parallel state or lock files. The engine must keep independent
native job lanes so the short control worker is not blocked behind a long ASR or
semantic run. The current native audio command still asks launchd to wake its semantic
service after completion; with that service unloaded, the wake reports a scheduled
retry and the independent Proteus semantic schedule supplies the next wake. This must
be exercised during replacement acceptance, not assumed from software tests.

Commands use fixed argument arrays without a shell. Configurable executable paths
are trusted operator settings, not request-supplied arbitrary script arguments.
Cancellation terminates the owned process group and escalates after three seconds;
timeouts default to two hours and can be set from one to 360 minutes. Native
transactions interrupted by cancellation need the existing worker's recovery checks.

## Observation and privacy

Status reads bounded existing JSON snapshots directly. Even the worker's `status`
command is not called because native startup can create/write state. Snapshot age is
shown; an old file is not proof of current activity. A loaded LaunchAgent means it
owns that service, not that a process is presently running.

Native log samples read at most 256 KiB and return at most 200 lines (the UI requests
100). A fixed allowlist projects numeric counts, strict timestamps, selected booleans
and known status enums. Free-form diagnostics, paths, transcript content, arbitrary
JSON keys and unknown lines are withheld. Logs and status reject paths/symlinks that
leave the configured pipeline root. Subprocess events pass through the same metadata
filter and are capped at 200 records per run. Detailed diagnostics remain in the
existing private native logs. After reading a sample, the desktop offers Open native
log on this Mac for the allowlisted file. That opens the original file through the
local desktop bridge; raw contents never pass through the API or remote client. Neither a zero process exit nor successful ASR certifies
successful semantic filing or all source coverage.

## Integration contract

`src/services/tools/omi.js` exports `OmiIntegration`, `OMI_JOBS`, `isOmiSchedule` and the metadata
projector. A single instance uses the application data directory. Its provider is
registered as `local-process`; this provider is only for recognized Omi native jobs.

- `GET /api/omi`: `status()` returns settings, availability, metadata, native ownership,
  fixed native job descriptions and the two source automation metadata records.
- `POST /api/omi/settings`: `{ settings, expectedRevision }` calls asynchronous
  `saveSettings`. The saved document is returned.
- `POST /api/omi/prepare`: `{ expectedRevision }` calls `prepareSchedules` against the
  ordinary schedule store. Returns prepared schedules.
- `GET /api/omi/logs?job=audio&stream=out&limit=100`: bounded metadata-only logs.

These routes use the existing authenticated API boundary. `assertEnabled` is a
synchronous preparation guard; `assertRunnable` is an asynchronous execution guard.
The frontend exports `initOmi` and `renderOmi` and preserves an unsaved Settings draft
across navigation and status refreshes.

## Validation

Sixteen synthetic Node tests verify disabled defaults, no native-file writes during
observation, five-schedule preparation, private policy/source import, revision checks,
repeat-prepare disable behavior, active/unknown native-owner refusal, source automation
pause enforcement, stale/stripped snapshots, bounded metadata filtering, escaping
symlinks, argument arrays, cancellation (including stubborn descendant termination), timeout and
nonzero/missing executables.
Four authenticated loopback API tests also verify Omi preparation, disabled generic
run/resume paths, log privacy/path validation, and authenticated integration behavior.

No real worker, Codex automation, native service cutover, audio processing, cleanup,
retention action or publication was run for these tests. Live replacement acceptance
remains deferred until the operator's testing phase.

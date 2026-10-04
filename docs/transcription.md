# Transcription

Transcription is the app section for recording and transcript workflows. It contains
Omi and private notes & MacWhisper areas, each with Overview, Schedules, Runs, Logs and
Settings. Separate professional meeting workflows remain deferred. The native Omi
phone app continues to own Bluetooth capture and its iCloud library/review surfaces.

## Verified ownership audit

The October 3, 2026 read-only audit checked installed Codex automation metadata,
canonical operator workflows manifests/contracts, installed LaunchAgent property lists and launchd
ownership, and selected native configuration fields. It did not execute processing,
read transcript bodies, change workflows, pause automations or unload services.

| Current owner | Source identity | Cadence | Responsibility |
| --- | --- | --- | --- |
| Native launchd | `org.proteusapp.review.omi-audio-worker` | 60 seconds | Omi source verification, revisable sessions, local MacWhisper ASR, library packaging |
| Native launchd | `org.proteusapp.review.omi-library-sync` | 60 seconds | Short library/control/review synchronization, independent of ASR |
| Native launchd | `org.proteusapp.review.omi-semantic-worker` | 60 seconds | One bounded semantic group/review answer, native claims and guarded publication |
| Codex automation | `cerebro-transcript-intake` | Hourly at :15 | General stable-export intake, context effects and Omi native catch-up |
| Codex automation | `cerebro-transcript-follow-up-review` | Daily 20:45 | Routing, full-summary quality, follow-ups, context and event-day journal audit |

All three LaunchAgents were loaded (not running at the observation instant). Native
semantic processing, review synchronization and revisable sessions were enabled.
Both Codex automations were ACTIVE. Installed prompts exactly matched their canonical
manifests: `automations/cerebro-transcript-intake.json` and
`automations/cerebro-transcript-review.json`. The latter's canonical ID differs from
its installed Codex ID; the importer preserves that explicit mapping. The intake used
`gpt-5.6-luna`/low, review `gpt-5.6-terra`/medium, with America/Denver scheduling.
These are observed values, not provider model catalogs or hardcoded model defaults.

The Omi audio service reads its configured Omi iCloud recordings directory. It does
not watch every MacWhisper export folder. The general scanner defaults to the private notes
`Transcripts` inbox, accepts `.md`, `.txt`, `.srt`, `.vtt`, excludes dot/underscore
metadata paths, and requires ten-minute age plus matching size/mtime/hash observations
at least one minute apart. General exports must reach that configured inbox. The
quality-review workflow also checks already-filed records since its prior review.
This change does not add an unrelated raw-audio watcher.

The native semantic service does not replace general intake or quality review. Both
canonical Codex workflows already delegate Omi-specific catch-up/review to
`semantic-run --apply` and `review-sync --apply`. Those calls share the native executor
and durable claims; they are not independent publishers. This existing overlap is
intentional catch-up, not authorization to start another processing owner.

## Ordinary schedules and compatibility

The existing five Proteus schedule IDs remain unchanged:
`omi-audio-worker`, `omi-library-sync`, `omi-semantic-worker`,
`omi-transcript-intake`, `omi-transcript-follow-up-review`. No second set is created.
Old run history, source IDs and `integration.type: omi` remain compatible. Additional
integration metadata records area, installed source ID, canonical manifest ID/path
and a source fingerprint. The persisted feature tab identity can remain `feature-omi`
while its user-facing label is Transcription.

Each area prepares only its own paused schedules. Default API preparation without an
area retains the old all-five behavior. Re-preparing preserves operator schedule
edits while disabling the selected area's schedules. It never disables the other
area. All sources validate before any schedule write. Source and canonical prompt,
model, effort and expected cadence must agree. Canonical timezone is captured rather
than guessing from host settings. General status displays verification results and
metadata, never private workflow prompts.

Legacy AI schedules can receive source metadata when their existing prompt still
ends with the verified source prompt. Divergent or stale source content blocks
re-preparation for explicit review; operator edits are never silently overwritten.
Historical AI run snapshots without the current source fingerprint cannot resume as
replacement processing. Open the current prepared schedule for a new run instead.

## Independent execution gates

Private `omi.json` retains schema version 1 and existing Omi settings. It adds:

- `intakeEnabled`, default false: general transcript execution gate.
- `intakeTakeoverConfirmed`, default false: separately reviewed Codex replacement.
- `workflowRoot`, default blank: canonical personal workflow checkout. Blank falls
  back to the existing native configuration's checkout; explicit configuration works
  without any Omi runtime.

Existing `enabled`/`takeoverConfirmed` apply only to native Omi processing. Old settings
files default general execution to disabled. The two general jobs require their own
gate, verified unchanged canonical source, and PAUSED source Codex automation. They
can run while native Omi LaunchAgents remain active. Native jobs still require the
Omi gate, valid installed runtime, and all three native services verifiably unloaded.
The engine's existing prepare/drain guards cover both areas; reserved IDs and stripped
markers cannot evade these checks. No control automatically performs a takeover.

## Replacement acceptance and rollback

Replacement remains disabled during implementation. Before changing ownership:

1. Confirm one execution Mac, source/canonical parity, correct workspace access,
   runtime/model availability and workflow policy context using an isolated test.
   A Codex login or successful provider smoke test alone does not verify this workflow.
2. For general intake, pause the exact original source IDs above through the existing
   automation interface, and verify any already-running source turn has finished.
   PAUSED metadata prevents future wakes but does not prove an old turn has stopped.
3. Review and prepare the same two disabled schedule IDs, enable the independent
   general gate, then individually enable the intended schedules. Keep Omi native
   services active unless their separate cutover has been accepted.
4. Verify real bounded processing outcomes and retry behavior before declaring
   replacement complete. General operator workflows helpers use per-transaction local OS locks,
   fresh source/destination hashes, guarded plans and durable receipts. Retry the
   same interrupted plan only after checking stages and current hashes. An inventory,
   successful model turn, or process exit is not proof of filing/context completion.
5. Native Omi replacement is a separate step: wait for ongoing worker transactions,
   unload the exact three services, verify unloaded ownership, enable the native gate
   and selected schedules. Preserve native worker/review/library/publication locks.
   Exercise the audio worker's launchd semantic wake fallback with launchd unloaded;
   Proteus's independent semantic schedule must supply the next wake.
6. Rollback disables the corresponding Proteus gate and schedules, waits for active
   runs (or explicitly cancels and reconciles their native transactions), and only
   then restores the original owner. Do not run old and replacement schedulers at once
   or reset native claims/receipts to force recovery. Never use two iCloud hosts.

Nothing here authorizes changing canonical policy, Omi retention, phone capture,
source recordings, vault content, organization workflows workflows or original automation state as part
of installation. The actual cutover and real processing acceptance remain unverified.

## API and modules

`src/transcription.js` exports `TranscriptionIntegration` and
`isTranscriptionSchedule` as compatibility aliases for existing Omi engine hooks.
`public/transcription.js` exports `initTranscription` and `renderTranscription`.
Existing Omi module exports remain available.

Authenticated routes `/api/transcription`, `/api/transcription/settings`,
`/api/transcription/prepare`, `/api/transcription/logs` alias the existing Omi routes.
Prepare accepts `{expectedRevision, area: 'omi' | 'general' | 'all'}`. Settings accepts
`{settings, expectedRevision}`. Status includes separate areas and gate states.
Native logs remain bounded metadata projections; original diagnostic files open only
through the local desktop allowlist. General processing logs are the ordinary saved
Proteus run conversations/events. Original Codex run history remains in Codex.

## Validation

Synthetic tests verify separate gates, general intake with a missing Omi runtime and
loaded native services, source-pause enforcement, canonical drift, legacy snapshots,
source identity preservation, cross-area preparation isolation, privacy, native
process cancellation, and no native writes during observation. Electron tests use
only disposable state and synthetic policy files. No real automation or transcript
processing is part of these tests.

## October 4 replacement readiness

The installed signed host now passes both no-tools Codex continuation and a real disposable file
write with explicit one-time native approval. Source/canonical parity is current; the three native
LaunchAgents remain loaded, both original Codex automations remain ACTIVE, all five replacements
remain paused, and both replacement gates remain off. One observation found the audio worker
running, reinforcing that service presence and drain state must be checked at the actual handoff.

For native drain, follow the installed worker's `install.idle_runtime` lock order:
`semantic/executor.lock`, `worker.lock`, `review-sync/lock`, `library/library.lock`, then
`publication.lock`. Wait for active publication before taking later locks. Hold the existing locks
while confirming native worker processes have exited and unloading services, closing the restart
race. Never delete locks or reset claims. A proof collected earlier is not sufficient for a later
unload. General automation PAUSED state must agree in the app and installed manifest, and existing
source turns must be independently confirmed complete before replacement scheduling begins.

Rollback closes both Proteus gates before pausing schedules, then waits for accepted replacement
runs and native transactions. Restore native LaunchAgents only after this drain. Resume original
Codex sources through the Codex automation tool, preserving all source fields; do not edit their
TOML/database directly. Keep source prompt/model/effort/cadence/roots and provider-default speed
unchanged during the ownership handoff. Final deployment and bounded real processing acceptance
remain required; these provider smoke tests do not certify semantic publication or context effects.

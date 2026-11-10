# Mnemosyne operations — Nov 5

The Nov 6 operator instruction brings the preserved Mnemosyne design into Nov 5 / 0.2.43.
It supersedes the earlier implementation deferral. Deployment remains held. Desktop and web
use the same renderer, layout, section names and styling; core runtime configuration stays on
the owning desktop. This is the Proteus observer integration, not a migration of the independent
Mnemosyne application, launchd services, watchers or iOS library.

## Shared operations

Overview presents independently dated audio/library/queue metadata, configured sources and
optional filing adapters. Omi is a source, not the product name. Missing counts and heartbeat
checks remain unknown; loaded launchd ownership is not treated as continuous process health.
Snapshots older than five minutes are labeled stale.

Activity combines read-only native receipt projections with Proteus transcript runs. Origin,
owner, purpose, status, model, duration and retained usage are distinct fields. Execution detail
shows request, model outcome, deterministic validation, guarded effects and final receipt.
A completed model run does not become verified filing. Boundary-only completion has no publication
effect. Native applied, not-applicable, delegated-organization workflows and deferred effects retain their outcomes.
Source-map outputs join claim references to canonical event references; event identity is never
assumed to equal a work-directory identity. Receipt observations do not revalidate destination files.
Historical CLI transcripts deleted by the worker are not reconstructed.

Schedules distinguish existing Proteus workflows from prepared alternative native schedules.
Opening a schedule uses existing authorized controls, including the web's existing scope; this
view adds no mutation or permission bypass. Services are observations of their current native
owners. No start/stop/restart action is invented where no supported native owner command exists.
Logs are explicit bounded metadata reads with service, stream and text filtering and a sanitized
sample export. Raw text, private paths, credentials and transcript content remain withheld.

Desktop configuration retains revision checking, separate native/intake gates, current source
cutover checks, explicit disabled-alternative preparation, and unsaved drafts. Web exposes gate
status and owner guidance, not local path fields or configuration mutations. Save errors remain
visible inline. No schedule is prepared or enabled by opening the observer.

## Supported read contract

Capability: `mnemosyne.operations.v1`. Paired clients use the existing authenticated encrypted
owner transport. This does not add an agent tool or grant agent access to files.

- `mnemosyne.snapshot({})`: schemaVersion 1; observedAt; runtimeAvailable; services; bounded
  metadata; schedules; activity; nativeHistory; sources; adapters; configuration summary;
  limitations. There is no settings/path/credential object.
- `mnemosyne.logs({job, stream})`: job is `audio`, `library` or `semantic`; stream is `out` or `err`.
  Returns sanitized records, withheld-line count, availability, modification/observation time.
- Local protected GET `/api/mnemosyne` and `/api/mnemosyne/logs` use the same owner service.
  Existing local configuration routes remain unchanged. Newer owners also advertise `mnemosyne.control.v1` for human operations controls; older owners remain read-only.

Activity contains opaque SHA-256 native claim/event references, enumerated purposes/states,
optional source digests, source-map observation/digest, stages, effects and numeric usage.
Only an authorized existing Proteus run has an open-run link. Inspecting native history does not
resume a model session or attach transcript context to a new chat.

Native reads use the current runtime's `semantic/work/<claim>/state.json`, execution/completion/
context-effects receipts, and matching `intake/<claim>/source-map.json`. No raw CLI log is read
into activity. Paths must resolve within the configured pipeline; each JSON file is bounded to
256 KiB, a scan examines at most 200 directory entries and consumes at most 8 MiB. A truncated
sample is explicitly not exhaustive or globally newest-first. Available rows are ordered by their
observed file timestamp. Per-snapshot reads coalesce. Logs retain the existing 100-line/256 KiB
bound. No polling, resident watcher, model work or filesystem indexing is started by the view;
manual refresh and opening a view request new observations. Late replies to detached views are
ignored. Snapshot data is not added to normal remote state pushes or mutation journals.

## Preserved independent-product work

The agreed architecture remains: neutral ingest/ASR/conversation revisions/library first, optional
independent destination adapters second. Proteus must not become a prerequisite for the native
product. This observer wraps the current receipts without extracting or duplicating the publisher.
The following require implementation and acceptance in the native Mnemosyne product and remain
open release work, not completed by the observer:

- neutral library/source contract and extraction of currently coupled publication policy;
- native structured event journaling with bounded redaction/retention;
- qualified service heartbeat/current-job evidence and guarded drain/restart commands;
- Stardate/audio/text source adapters and separately verified watcher handoff;
- neutral multi-source iOS library/review synchronization and no-adapter standalone acceptance.

Existing native owners, claims, locks, revisions, audio, answers, identity and filing behavior are
unchanged. No live store, schedule, deployment or service migration was performed for these tests.

## Validation

- Five observer regressions plus the existing sixteen transcription tests pass. They exercise
  redaction, claim/event lineage, distinct outcomes, boundary-only no-publication, missing evidence,
  coalescing, symlink/oversized/identity rejection and absent remote mutation commands.
- Disposable Electron passes shared view/service ownership, desktop configuration, active-source
  cutover refusal, inline errors and cross-view unsaved-draft preservation. Opening the view
  creates no schedules. Screenshots inspected.
- Production shared component passes Chromium and WebKit at 390, 820 and 1440 px: no horizontal
  overflow, stale-state labels, no web configuration editing, navigation, log filtering/read and
  no idle/tab-switch fetches. Screenshots inspected.
- Authenticated Laravel + browser WebCrypto + encrypted relay + two disposable owners passes
  sidebar routing, read-only configuration, owner isolation and sanitized observations.
- Full Node suite: 1,677 passed, four skipped, zero failed. Static checks and web asset build pass.

These are source and disposable-runtime results. Packaged release, installed native-owner evidence
and production website acceptance are not claimed. Deployment remains held.

## Nov 8 source additions

Audio shows configured pipeline, incoming-source and library storage in decimal GB, with logical
file size and allocated disk bytes by file type. The asynchronous metadata-only scan is bounded
by 500,000 entries / ten seconds, deduplicates hard links/overlapping roots and skips symlinks.
It excludes dependency trees, shared ASR models and app binaries. Partial coverage is a lower
bound, never presented as a complete inventory. It does not read recording contents or remove files.
Library describes native packaging/review observations; neither its counts nor its modification
time prove iPhone download. Logs use expandable sanitized records, labeled fields and local dates.
Native pause/drain/restart support remains required before controls can safely interrupt services.

The November 8 audit found recent native audio/library snapshots and enabled/firing Proteus
intake/follow-up schedules. Their latest reports still have incomplete reconciliation and technical
holds. Successful model turns and wake requests do not establish end-to-end success.

## Native controls — Nov 8 source

The native worker owns a shared admission gate independent of Proteus. Pause prevents new work
and lets admitted jobs finish with their existing claims and locks. Resume enables future native
wakes; drain/restart waits for admitted work, then the next native wake resumes admission. No
process is killed or launchd owner replaced. Pause persists across restarts; phone capture is
independent. Corrupt/linked state fails closed. Configuration/control revisions protect actions.

Desktop and web share the Services controls. The owner executes only the fixed native CLI verbs
`status`, `pause`, `resume`, `restart` using its verified configured runtime. UI controls appear only
when that runtime supports the new native module. `mnemosyne.control` is a journaled paired-human
mutation and rejects agentControl. It is not an agent tool. Failed/uncertain responses require
status refresh before another action. Opening the view never mutates native processing.

Native source and 61 disposable tests pass; the installed runtime is unchanged. Native deployment
and live drain acceptance remain required before these controls are described as operational.

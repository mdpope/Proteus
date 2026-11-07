# Schedules and external edits

The execution source is `<PROTEUS_HOME>/schedules/<id>.json`. On macOS the default home is
`~/Library/Application Support/Proteus`. The schedule editor shows the exact file and can open it.
AI or an editor can modify these plain JSON files; `schemas/schedule.schema.json` and
`templates/schedule.json` describe the format.

The store reads disk on every API snapshot and before creating a run. The Mac editor fetches a
new snapshot when opening/reopening a schedule or choosing **Reload file**. Open editors refresh
through normal polling while no form control is focused; clean drafts adopt external changes.
Unsaved drafts are preserved and display a conflict when the file revision changes. Saving an old
revision is rejected. Reload explicitly discards the draft and reads disk. Invalid files show an
error and cannot execute. Merely touching a file without changing its JSON content does not
change its content revision.

The mobile client receives the Mac's refreshed schedule state. Opening or reloading fetches
current state; clean forms adopt incoming changes, while dirty forms retain their revision for
conflict detection. Disconnected clients display cached state until reconnecting. Existing chats
keep their captured schedule, model, effort and context tier; file changes affect future runs.

## Workflow-owned schedules, including organization workflows

An imported schedule can include `source.system` and `source.manifest`. The manifest is the
owning repository's canonical definition. Proteus reads the **exported local schedule**, not that
foreign-format manifest. Editing the source requires the owner's export/reconciliation step;
reopening Proteus alone does not perform an export. Both locations are visible in the Mac editor.
The mobile editor keeps source-owned schedules read-only.

Use the owning repository's instructions to produce valid Proteus JSON, then:

```sh
npm run cli -- validate /absolute/path/exported-schedules.json
npm run cli -- refresh /absolute/path/exported-schedules.json
```

`refresh` verifies source ownership, rejects conflicting edits, preserves run history, and imports
updates **paused**. New imports use `import` instead and are also paused. Review and explicitly
enable scheduling when desired. Do not turn opening a schedule into arbitrary exporter execution.
Edits to only the local copy can be replaced by the next source reconciliation.

## Model settings

`model`, `reasoningEffort` and `contextTier` are stored together. Empty/omitted effort means
provider default; `contextTier: "default"` selects the default tier. Optional choices come from
live capabilities and are revalidated on every Copilot turn, including resume. Model selection
and source loading are different: reducing selected skills/MCPs reduces supplied context, while
context tier changes how much context the provider permits. See `providers.md`.

## Independent schedule configuration

The schedule editor supports explicit approval/read-only/folder settings and multiple workspace references with category selection: folders, permissions, instructions, agents, skills and MCPs. These references supply configuration without moving the schedule. Run snapshots include workspace names and revisions; a missing source or conflicting inherited approval/main-agent choice requires correction instead of silent fallback. Unknown JSON fields and expected-revision checks remain intact. Explicit folder grants save their canonical destination. See the [October release evidence](2026-10-27-release-evidence.md) for current acceptance limits.

## Owner tool configuration

See [schedule tool configuration](schedule-tool-configuration.md) for the installed-version
schema/workaround, future-run inheritance semantics and Nov 5 source-only inspection/preview.
The new tool actions are unavailable until an authorized release is installed.

# Prototype UI rehearsal — October 15, 2026

**Passed for the synthetic prototype only.** No production build, installed app, live browser
profile, provider call, migration, grant or workflow was exercised or changed.

The self-contained design was rendered through the visualization sandbox wrapper and exercised
with isolated Playwright Chromium. The main run passed 79 assertions, followed by eight targeted
regression assertions and a visual/wording follow-up. No browser runtime errors were observed.
Desktop/web/tablet/phone layouts were checked at 1,024, 768, 390 and 320 pixels in light/dark
appearances. Screenshots of the desktop projects/source screens and phone approval dialog were
visually inspected. [Machine-readable checks and artifact hash](prototype-validation.json).

Verified interactions include:

- Seven recent chats and More, project rename, project navigation and mobile tab selection.
- New workspace Enter submission, explicit starting-folder access and default project, application-default new chat routing.
- Captured starting folders, main agent, selected sources, helper-read grants and chat automation.
- Shared draft across quick/project views; closing the quick view preserves the conversation.
- Chat moves retaining setup, and explicitly selected associated resources moving with the chat.
- Global library add/remove/re-add, retained unavailable defaults/main agent and explicit recovery.
- Once/chat/workspace approval copy, existing grant reuse, revocation, isolation by original setup,
  unsupported command containment disclosure and narrow helper access.
- Private extension-profile hidden/unloaded creation, independent Show/Load, invalid URL handling,
  workspace type filters and protection against stale project filters from another workspace.
- Terminal detach/reattach retaining its sample session identity.
- Markdown activation/context-menu refresh preserving scroll, full visible response paths,
  source-refresh draft retention and single-send simulated response, five-second alerts.

The rehearsal caught and corrected an echoed widget-state update that replaced controls during
pointer clicks, mutable chat setup references, ignored source/automation choices, permission scope
leakage, removed main-agent fallback, repeated helper requests and stale cross-workspace filters.

## Intermediate workspace navigation correction — superseded

The operator clarified the workspace layout after the initial rehearsal. That intermediate prototype
passed 26 focused checks with no browser runtime errors: one workspace tab strip; fixed,
non-closable Workspace/Projects/Chats/All tabs/Configuration on the left; no individual project
sibling tab; browser/terminal resources opened at workspace level; moving resources into a project
and back without changing identity; workspace-only filtering; terminal detach; chat routing into
its project; and nested sidebar hierarchy. Desktop and phone screenshots were inspected, and
320/390/768/1024-pixel layouts retained their controls without horizontal page overflow.

The extra generic Workspace tab in that intermediate version is superseded by the final correction
below. Its 26 checks remain a historical rehearsal, not acceptance of the latest hierarchy.
The JSON records the earlier baseline hash separately from this revision. Previous baseline
checks describe that earlier rehearsal; these focused checks cover the changed navigation.
Workspace-created non-chat resources now remain at workspace level, superseding the initial
prototype's forced default-project routing. Production application behavior remains unchanged.

## Final navigation and chat-permission review

The final correction passed **45 focused interaction checks** with no browser runtime errors.
The workspace name is in application navigation, above fixed Projects/Chats/Tabs/Configuration;
the Workspaces collection has Workspaces/Chats tabs. The extra generic Workspace tab is removed.
Existing four-box/panel icon roles and folder project icons were checked. Chat-index controls
are shared across scopes, lock contextual Workspace/Project fields, filter rows and retain
independent view state. Optional workspace resource tabs still open below the workspace name.

The prototype opens on a chat with an inline permission request above the composer. Verification
covers once/chat scope copy, draft retention, approval/denial receipts, saved-grant reuse and
revocation, Details/composer opening the same controls and exact-action external sends. A
workspace advanced control selects an explicitly named chat using that working setup. Saved
permissions match the resolved target and action, so a saved read at one starting folder does
not authorize the same request type at another folder. New read receipts show the actual target.

Desktop, tablet and phone controls were exercised at 1024/768/390/320 pixels. Desktop navigation,
the initial inline request and the phone control dialog in light/dark appearances were visually
inspected. V's final source review found the two scope issues and workspace-revocation wording;
the final revision addresses them and the scope regressions passed. Final artifact hash and
individual checks are recorded in the JSON; earlier hashes/checks remain labeled historical.

Only the synthetic design and documentation changed in this revision. No production application
build or live provider/permission workflow was run; full application execution/persistence tests
do not establish these proposed interfaces and were not required for this design-only change.

## Deliberate limits

The diagrammed migration and agent inventory/actions are proposals using sample records. No real
migration or tool registration was performed. Destination execution-settings adoption stops at a
comparison; it is a separate future implementation. Provider enforcement, filesystem boundaries,
persistence/restart/retries, old-client compatibility, actual browser/PTY/document continuity,
legacy Unhoused/Team inventory, offline/conflict behavior and native/web delivery require future
implementation and live acceptance. Test provider replies and file changes are simulated.

The current broad Auto-approve tools behavior has not changed. Proposed bounded Autopilot needs
host/provider enforcement before the interface can make the illustrated promises. Existing valid
authorization should eliminate duplicate prompts; cosmetic renaming alone cannot deliver that.

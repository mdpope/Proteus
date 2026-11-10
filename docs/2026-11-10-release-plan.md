# Nov 10 release plan

Status: queued release; draft-sync correction isolated in source. Nov 8 release closeout continues
separately; no version is reserved here. The operator explicitly defers this correction rather
than building or redeploying the Nov 8 packages again.

## N10-01 — Clickable links to Proteus resources

Chat messages currently display some Proteus links as plain text, preventing the operator from
opening the referenced approval or resource. Render supported links to chats, schedules, files
and file-browser items as actionable links across desktop, web, iPhone and iPad.

Resolve each link to its exact owning computer, workspace/project and stable resource identity.
Open the existing resource where possible, preserving drafts, history and tab placement. For a
current question or approval, reveal its actual review control; an expired request must show its
resolved state rather than imply an approval is still needed. File links retain source/share
authorization and stream from the owner as appropriate. A link grants no access by itself.

Test Markdown links, bare Proteus links and resource links produced by the file browser. Check
cross-device routing, unavailable owners, denied file sharing and stale/deleted targets. Preserve
ordinary website links, text selection and copy-link behavior.

## N10-02 — Investigate a better Chats list design

Review the Chats list across desktop, web, iPhone and iPad. Propose and validate a clearer layout
for titles, run status, provider/model/effort/speed, owner computer and recent activity. Preserve
search, editable/collapsible filters, progressive loading and one predictable scrolling surface.
Use dense and long-content examples; evaluate readability and touch/keyboard access before
settling the design.

## N10-03 — Denser headers across features

Audit headers, toolbars, tabs and filters across the application's features. Reduce excessive
height, padding and repeated headings so more useful content fits on screen, while keeping
primary actions discoverable and touch targets usable. Coordinate shared components across
desktop/web and phone/tablet layouts. Verify narrow widths, wrapping, accessibility text sizes,
keyboard display and safe-area spacing. Investigate the design before broad implementation.

## N10-04 — Reliable cross-device draft synchronization

The operator reports that Build Mac, iPhone and iPad share a chat draft, but Work Mac does not
load that text and its edits do not reach the other devices. The desktop peer transport allowlist
omits `draft.text.get` and `draft.text.save`; mobile and web use the working direct owner path.

Follow-up: opening this same chat on Work Mac still did not show text entered on Build Mac;
the iPhone had that text, while subsequent Work Mac typing diverged from all three other clients.
Treat the missing desktop transport operations as one confirmed defect, not proof that the
entire synchronization process is correct. Trace the chat's execution owner and draft identity
through local desktop, paired desktop, web, iPhone and iPad; verify all views of the same chat
read and write the same owner-bound draft rather than independent client or relay caches.

Restore those two desktop transport operations through the existing authenticated pairing and
owner draft service. Preserve revision conflicts, uncertain-write operation IDs, local retained
copies, connection pause/revocation and the human-only composer boundary. Do not overwrite either
operator draft to force convergence. Attachments, model choices and approvals remain separate.

Required behavior: a user can start a thought on one device, pause for approximately 30 seconds,
then continue it on another connected device without reopening the chat or manually refreshing.
Use debounced saves and a bounded periodic revision check; refresh on chat open, foreground and
reconnect as well. Avoid busy polling, overlapping saves and stale responses replacing newer
text. Report actual pending, synced, offline and conflict state instead of implying success.
An unchanged receiving draft adopts the latest owner revision automatically. Concurrent edits
retain both versions and offer a clear resolution; do not silently replace active typing or use
client wall-clock timestamps as the sole winner. Reuse stable operation IDs after uncertain
saves. Respect platform suspension: reconcile when a suspended mobile app returns rather than
promise continuous execution in the background.

The correction and encrypted two-owner regression are isolated on
`codex/nov10-desktop-draft-sync`. The regression reproduced the unsupported-command failure before
the fix and passes afterward, including conflict, owner-isolation, pause and agent-denial checks.
The full source suite passes 1,755 tests with four skipped using canonical short temporary paths;
static checks pass. The older desktop UI fixture stops at outdated chat-creation setup before
reaching the draft assertion; actual composer and installed cross-device acceptance remain open.

Before shipping, exercise owner-to-peer and peer-to-owner text updates in actual desktop
composers, retained conflicting edits, reconnect/restart, paused/revoked connections and separate
owners. Verify the existing mobile/web path still converges. No new package, deployment or live
draft mutation is part of this deferred work.

Acceptance must include sequential handoff in both directions between Build Mac, Work Mac,
iPhone and iPad with an approximately 30-second typing pause, plus a web client. Check fresh open,
already-open idle composers, reconnect, restart, concurrent typing, caret/selection retention and
send clearing only the accepted draft revision. Confirm owner revisions and actual visible text;
test automation that only reads a backend store is insufficient. Preserve existing divergent
operator drafts before any installed repair or reconciliation test.

## N10-05 — Workspace Files tabs stay where opened

Workspace Files should open as ordinary resource tabs in the navigation container where the
user invoked them, including workspace/project placement, rather than always creating a
top-level application tab. Apply this consistently across desktop, web, iPhone and iPad and
across entry points such as the new-tab page and feature navigation.

Preserve the folder being viewed, selection, preview, history and source authorization when
placing or moving the tab. Placement must not grant access to another workspace or change the
execution owner. Define reuse versus a new independent file-browser view explicitly, using the
same navigation conventions as other normal resource tabs. Test placement, close/reopen and
cross-device navigation without duplicating or relocating unrelated tabs.

## N10-06 — Analyze folder discovery, scope, grouping and duplicates

Investigate the current Workspace Files folder list before choosing a design. Trace which
registries and configured sources supply it: current workspace/project folders, additional
folders, previously added or removed folders, shared/universal sources and source-library
folders. Establish whether historical additions remain available and distinguish catalog
membership, selection and effective file access. Record findings and propose a usable design;
these questions remain open rather than being answered by this planning entry.

Evaluate a workspace-scoped default versus a broader picker grouped by workspace, with clear
workspace/folder names, predictable ordering and an explicit way to discover other authorized
locations if appropriate. Decide how project context affects the default, where source-library
folders belong, and how the user understands why each folder appears. Compare representative
small and large catalogs on desktop, web, iPhone and iPad before settling the interaction.

Define duplicate handling for the same authorized folder referenced by several workspaces or
projects, different folders with identical display names, aliases/canonical paths, nested roots,
and equivalent-looking paths on different computers. Any visual deduplication must preserve
owner identity, workspace/source associations and distinct read/edit grants; do not merge or
widen authority merely because names or paths look alike. Specify stale/removed-source and
unavailable-owner behavior. Validate the proposed grouping and labels with realistic duplicate
examples without copying private folder inventories into source or modifying live grants.

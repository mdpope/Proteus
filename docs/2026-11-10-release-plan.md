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

## N10-04 — Desktop peer draft synchronization

The operator reports that Build Mac, iPhone and iPad share a chat draft, but Work Mac does not
load that text and its edits do not reach the other devices. The desktop peer transport allowlist
omits `draft.text.get` and `draft.text.save`; mobile and web use the working direct owner path.

Restore those two desktop transport operations through the existing authenticated pairing and
owner draft service. Preserve revision conflicts, uncertain-write operation IDs, local retained
copies, connection pause/revocation and the human-only composer boundary. Do not overwrite either
operator draft to force convergence. Attachments, model choices and approvals remain separate.

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

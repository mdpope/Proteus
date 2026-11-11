# Nov 8 request audit — deployment gate

The operator requires a complete scope check before any further deployment. This gate supersedes
earlier instructions to install immediately. The last web activation completed before the gate;
newer candidates are held until this audit passes. The operator subsequently authorized Personal
Mac, web, iPhone and iPad when ready, then Work Mac after Build Mac validation and Linux/Windows
after the preceding work. Physical feedback adds N8-23/24; their corrective iOS build is not yet deployed.
An implemented feature, a fixture pass and installed acceptance are separate states.

## File browser: every requested interaction

Desktop and web share `public/features/workspaces/file-browser.js`; native uses
`NativeFileBrowser.swift`. All use the same workspace explorer service. Remote read and edit
connection grants are separate and checked again by the desktop for every operation.

| Request | Desktop | Web | Native iPhone / iPad | Gate / next acceptance |
| --- | --- | --- | --- | --- |
| Resize list/document divider; horizontal list scroll | Implemented; Electron interaction passes | Shared controls; narrow-screen grid corrected | Adjustable phone vertical and iPad horizontal split | Repeated phone divider gestures and constrained iPad columns pass in simulators |
| Arrow keys select/preview; Enter opens new tab | Implemented; Electron interaction passes | Shared controls | Key handlers on both layouts | Native hardware-key event acceptance remains separate |
| Own green icon set: open/closed folders, Markdown, code, images, audio/video | Custom green SVG set | Same SVG set | Custom green folder/document/code/image artwork; media glyphs | Actual simulator file view exercised; physical appearance follows installation |
| Expand subfolders; indent children | Lazy with inline paging; Electron interaction passes | Same | Lazy, indented, inline More pages | Owner pages stay bounded; no background tree replication |
| Sort every column, alternate direction; readable dates and extended MIME | All five headers, owner sorts before paging | Same | Five sortable headers, localized dates, compact phone toggle, iPad overflow | iPad header/overflow simulator passes; code/media MIME source regressions pass |
| File/folder context menu: open, copy path/name, rename | Implemented | Shared controls | Long-press menu implemented | Remote PDF/opened-document paths corrected in this audit; full platform interaction acceptance still required |
| Toolbar by breadcrumbs: create file/folder, trash, copy, duplicate, move | Implemented | Same; disabled edit controls reflect connection grant | Scrolling action toolbar and interactive breadcrumb path | Native context menu and paged move exercised; mutations still owner-enforced |
| Native Trash/Recycle Bin, no overwriting | Owner native trash, identity checks, failure results | Same owner operation; separate Edit files grant | Same | Disposable mutation and revoked-grant tests; never test deletion against operator documents |
| Command/Control additive selection plus Shift range | Implemented; Electron modifier selection passes | Same | Touch selection and UIKit modifier-aware additive/range selection | Actual native hardware modifier input remains unaccepted |
| Drag selected batch into folder; autoscroll near edges | Implemented; actual Electron selection/move tested | Same | Dedicated drag handle; phone and iPad selected two-file drag passes with independent filesystem proof | Native edge autoscroll and hardware pointer behavior retain separate acceptance |
| Move picker drills into folders, including later pages | Paged destination picker; actual Electron interaction passes | Shared picker | Actual phone and iPad simulator move past entry 200 passes, independently checked on fixture desktop | Destination is within the configured root; no implicit access to other roots |
| PDF viewer with search/thumbnails, loaded only on demand | Actual Chromium viewer rendering/search/thumbnails pass | Desktop-only PDF URL was a gap; now uses bounded owner stream and disposable Blob URL | PDFKit search/thumbnails implemented | Verify browser-native PDF controls separately by engine; a Blob URL assertion is transport evidence only |
| Relative Markdown links, wiki links and inline image resources | Existing Markdown-it + owner resolver; opened-tab Electron test passes | Same renderer/resolver, including images | Owner-resolved links and bounded separate image requests | Unique bare names use bounded on-demand descendant search; ambiguity/limits fail explicitly; no permanent index |
| Remote desktop streaming, connection consent, recheck changes, bounded caching | Local configured roots | Encrypted paired-owner requests | Same, no whole-tree replication | Grant denial/revocation and revisit/race tests; no secret or file bytes in saved navigation metadata |
| Open documents in tabs; unload when unused | Owner navigation tabs | Owner-backed tabs through files.open | Same owner-backed tabs; phone/iPad open/close simulator proof | Fresh grant projection; moved tabs retain source-workspace authority; hidden/closed navigation stays shared |

## Other requested features retained in scope

| Request group | Implemented / existing evidence | Remaining qualification or work |
| --- | --- | --- |
| Convert Nov 6 plan to Nov 8 and implement carried fixes | Named Nov 8 / 0.2.44 plan retains N6 identifiers | See the final rollout and closeout records; source, installed and independently verified evidence remain distinct |
| Chats fixed viewport, hide/dense filters, four per row, progressive loading, provider/model/level/speed before computer | Desktop/web controls and Chromium/WebKit fixtures pass | Signed-in production interaction and representative large live indexes |
| Mnemosyne disk usage by type, Library explanation, service pause/drain/restart, readable expandable logs | Storage/log/UI tests; native installed active pause/drain/restart observed | End-to-end destination/artifact reconciliation, phone Library sync and unattended schedule output validation |
| Moved Build Mac schedules run with narrowly approved access | Future profiles and portable host command path implemented | Real retained output checks; captured pending approvals remain human decisions |
| Agent requests exact chat folder access, all clients | Mandatory consent owner boundary and transition tests | Installed approve/deny/revoke and next-explicit-turn sandbox activation on each client |
| Notification tap reaches correct chat/question without false connection failure | Owner-specific routing and simulator foreground/background/cold-start cases pass | Physical tap/answer/reconnect acceptance |
| Repeated or erroneous Approval required; preserve completion alerts | Stable event/request identity exists; this audit adds durable resolution propagation and uncertain-send replay guard | New regressions, signed package and physical APNs acceptance; do not claim the screenshot proves no real pending approval |
| Jumpy history while reading/typing | Scroll command, deceleration, late-history and focused-editor corrections; simulator cases pass | Physical long-chat performance and sustained incoming updates |
| Hidden tabs only in Tabs management; visible unloaded tabs stay in navigation/overview | Shared membership and cache repair, simulator tests | New phone-created tab reaches the correct desktop project after reconnect; preserve owner truth |
| Workspace-first overview, grouped projects, centered active tab, shared project order | Desktop drag order and mobile Move up/down; phone/tablet overview cases pass | Native project drag was removed after failed gesture acceptance; touch reorder remains an explicit UI alternative |
| iOS new-chat attachments | Files/Photos/Paste/review/create fixtures pass | Physical import/retry; this audit fixes clipped missing-file errors and adds visible Remove/Retry controls |
| Spelling suggestions on right click, all clients | Native menu routing and replacement callback fixtures | Actual OS dictionary suggestions/replacement still unaccepted; do not equate a callback with system spelling success |
| Reddit playback, reliable Back menu, intermittent browser stalls | One real installed desktop Reddit video advances; history fixtures pass | Physical Reddit and long sustained browser scroll; test history selection without double-click |
| Background link is menu item 2; profile-specific open options | Shared menu/source changes and profile tests | Installed desktop/native menu and isolation checks |
| iOS quiet idle, screen awake in foreground, restore tab/project/position, disk page cache | Foreground policy, durable state and encrypted bounded archive source tests | OS may suspend/evict any app; physical restoration and archive freshness must be exercised |
| Footer/composer same color through home indicator, less wasted space | Phone browser/new-tab and chat pixel/spacing fixtures pass; 2611.9.3 installed | Latest physical screenshot feedback is not replaced by simulator success; recheck on next accepted build |
| Tab favicons | Native descriptor/artwork changes and icon fixtures | Physical visible strip/favicon fallback acceptance |
| Double-tap empty chrome toggles bars without blocking text selection; chat/document parity | Text-hit guards and shared controls implemented | Website text selection, URL field and chat/document real gesture acceptance |
| URL wraps fully but cannot contain newline; Return navigates | Wrapping editor and sanitizing submit path implemented | Native hardware/software Return and paste acceptance |
| Certificate dates/details match desktop | Native certificate projection implemented | Actual secured site and invalid-certificate cases |
| Download-start notice on desktop/iOS | Source notification paths implemented | Real user-triggered download and failure destination checks |
| Save website photo to chosen folder without losing current page | Native export/picker source implemented | Physical picker cancellation, permission rejection and successful file readback |
| Adjacent-tab swipes on URL, bottom browser controls, chat composer/header, documents | Shared native swipe controls implemented | Real gestures must not hijack text editing, selection or vertical scroll |
| Provider-neutral schedules: guided first run, explicit durable schedule grants, switch Codex/Copilot/Claude | Host-scoped execution, capability resolution, overlay schema and local three-provider fixture evidence | HC 0.2.43 has no qualified flag-removal workaround; no HC deployment/live schedule edit authorized |
| Source reconcile preserves schedule access/provider choice; once/deny/revoke do not persist | Owner overlay/selection override and revision tests; documented schema | Installed canonical reconciliation/restart and representative synthesis/digest/MCP acceptance |
| Schedule save/preflight errors durable ERROR in Notification Center, correct styling and draft preserved | Source/server regressions and UI corrections | Installed restart and authorized remote center acceptance |
| Recent schedule runs button between Enabled and Run now; editable preselected chat filters | Desktop/web/native source and UI fixture acceptance | Signed-in installed navigation check; never trigger a real schedule as a navigation test |
| Jira full write/upgrade, remote remembered permissions and Windows answers, ADO families/pools, Proxmox/local network | Carried source changes and bounded fixtures retained | Authorized external fixture/catalog prerequisites and exact installed cross-owner acceptance remain open; no permission bypass or HC rollout |
| Release-helper deadlines, progress, idle decisions, recovery retention and cleanup | Installed successful Mac recovery; categorized diagnostics; UI decision actions; single cache reuse | Production-shaped helper/rollback rehearsal, optional admission drain, legacy owner maintenance support and exhaustive preserved state |
| Disk cleanup, merge/retire branches, retain two recoveries | PR32 merged; obsolete temporary/build data retired with receipts; Time Machine allowed to continue | Owner attention/unregistered recoveries remain protected and blocked; no raw cleanup bypass |

## Gate status

**Source scope and signed package gates passed.** Final phone/tablet interaction, shared owner
file tabs, resources, notification and attachment regressions pass. Build Mac, web and iPad
have later installation receipts; see the current rollout ledger for exact outcomes and limits.
Native hardware modifiers, edge autoscroll and real physical workflows retain separate acceptance.
The operator now includes Work Mac after Build Mac validation, then Linux/Windows after the
preceding work. No deployment result is inferred from model completion.

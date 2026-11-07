# Nov 5 file views and client acceptance

Source and isolated-build evidence only. Deployment remains held. Authentication Preview and
Design Preview are separate from the installed application and from each other.

## Implemented behavior

- Desktop Workspace files is available from Add tab and workspace/chat add controls. It lists
  the selected workspace's configured folders, including inherited source folders. Root identity
  and canonical containment are rechecked on each operation; another workspace is not a fallback.
- Directory rows show name, type, size, creation and modification times. Search starts only after
  input settles, traverses at most 5,000 entries/12 levels per request, and returns 200 rows per
  page. No indexer, watcher or polling loop runs while idle. Local cancelled requests stop scans;
  a bounded remote request may finish after its view unloads, but its response is discarded.
- Selecting Markdown or a supported raster image loads the right preview; another selection,
  navigation or hidden page releases it. Unsupported file types remain metadata-only.
- PNG/JPEG/GIF/WebP standalone images use the existing document viewer, with signature checks and
  a 4 MB limit. Markdown retains its 1 MB bound. SVG/HTML are not newly enabled as image previews.
  Navigation persists references, not image bytes. Reload rechecks current folder authority.
- Leading bounded YAML frontmatter renders as an escaped Properties block. Invalid YAML remains
  visible Markdown; aliases/custom tags do not expand. Relative Markdown links and
  `[[note|label]]` links work without a vault-wide basename search or ambiguity guessing.
- Web workspace Files uses the same browser component and owner service. A paired device needs
  explicit owner-enabled `workspaceFileAccess: [workspaceId]`; chat-document access alone does not
  grant folder browsing. Owner settings expose this as Browse files for each workspace.
  Web file tabs are browser-local views with owner/workspace/root/path metadata only, not copies
  of desktop tab membership. Every revisit rechecks access. Root removal/revocation fails closed.
- File service schema: `files.roots({workspaceId})`,
  `files.browse({workspaceId,rootId,directory,offset,query})`,
  `files.preview({workspaceId,rootId,file})`; capability `workspace.files.v1`. The root ID must
  come from the scoped roots response. The native owner UI uses the matching protected local
  `/api/workspace-explorer/{roots,browse,preview}` routes. No agent permission is inferred.

## Reliability and performance

Web workspace entry ignores superseded navigation intents, no longer retrieves every project's
browser history, and keys repainting on descriptor/history revisions instead of serializing full
histories. Sidebar expansion still fetches only the requested project. A missing render-key helper
found by the real module fixture was corrected.

The 200-row synthetic scrolling fixture measured:

| Engine / viewport | Median frame interval | 95th percentile | Requests while idle |
| --- | ---: | ---: | ---: |
| Chromium / desktop 1440 | 16.7 ms | 16.8 ms | 0 |
| WebKit / phone 390 | 17 ms | 18 ms | 0 |
| WebKit / tablet 1024 | 17 ms | 18 ms | 0 |

These are local engine measurements with synthetic files, not physical iPhone/iPad or production
relay latency. The same fixture verifies lazy loading, Markdown/image tabs, no persisted file
contents, late-navigation rejection and releasing hidden previews. Encrypted relay regressions
cover per-method wire counters, delta isolation, reconnect replay, duplicate commands and permission
revocation before response delivery. No production relay journals were inspected or altered.

## Client matrix and limits

| Area | Desktop | Web / mobile browser | Native iPhone/iPad |
| --- | --- | --- | --- |
| Questions | Existing first-click/history fix | Shared first-click fix | Exact question reveal and answer focus; phone/tablet simulator tests type without a second field tap |
| Workspace/project layout | Existing shared hierarchy | WebKit geometry checks, owner grouping and lazy expansion pass | Existing native workspace/project views; no styling replacement in this change |
| Tab overview | Larger viewport and previews; Electron geometry check | Larger responsive overview | Existing native overview retained |
| Markdown properties / wiki syntax | Shared parser/runtime | Shared parser/runtime | Shared WKWebView runtime; no independent real-vault acceptance |
| New workspace file browser | Implemented | Implemented with explicit remote folder grant | No new native file-browser screen in this slice; parity gap remains recorded |
| Standalone image file tab | Implemented, reload verified | Scoped file view implemented | Existing approved chat attachment/image paths remain; new workspace-file navigation is not claimed |
| Managed account setup | Owner-only Connections UI | Status/runtime use stays scoped | No secret-entry or consent automation added |
| Completion notification | One stored event per completed turn | Same event identity | Quiet mode allows a soundless completion alert; physical APNs delivery remains unverified |

Quiet mode previously marked chat completion silent, preventing the iPhone push path from receiving
that alert. It now suppresses sound for completion while retaining explicit notification preferences
and schedule completion opt-in. Duplicate completions of one turn reuse the existing event.
A new turn can produce its own completion. Existing APNs collapse/identity handling remains.

The existing purpose:update authority covers its own updater and narrow inspection actions across
canonical/fresh tool names, survives captured continuation, and refuses unrelated chat actions,
page access and protected approvals. Idle-gate regressions remain mandatory. No live upgrade was
started merely to test this while deployment is held.

Design Preview includes synthetic Properties/wiki-link and PNG samples. Production data, workstation.example.test
workflows, live schedules and credentials are not part of these fixtures. Missing physical push,
production-network performance, native workspace-file parity and installed workflow evidence must
not be represented as complete feature parity or deployment acceptance.

## Final source verification

Full suite: 1,671 passed, four skipped, zero failed. Static checks and the web production asset
build pass. The full authenticated web fixture exercises Laravel login, encrypted WebCrypto relay,
two disposable owners, project/tab moves, draft retention, inline questions and desktop/mobile
layout. Its legacy answer-form and destination selectors were updated to the current shared UI;
geometry checks now exclude controls hidden by closed setup disclosures.

Fixed synthetic relay evidence: initial sync 9,245 encoded bytes; one project-tab read 293 bytes
in one packet. These payload sizes describe the fixture only, not a production traffic baseline.

The operator confirmed that the corrected Authentication Preview displays the Atlassian site.
That confirmation is live site-discovery evidence, not saved connection, Jira mutation, renewal
or organization workflows workflow acceptance. Existing installations and schedules were untouched.

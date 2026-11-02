# Nov 2 implementation

Version: 0.2.41

Status: signed Mac candidate accepted locally; publisher signature and destination approvals
remain pending. No desktop package publication or installation yet. Draft review: [PR 29](https://github.com/mdpope/Proteus/pull/29).

Frozen application/source: `f75f98f7f2e623acdb77adedb2a0da7e09785fa7`.
Validation-only harness correction: `3926aec`; it does not relabel accepted application bytes.
Mac build: `f75f98f7f2e6+src.4c95b6884b99`; Apple signature verifies. Complete package hash:
`7b5579cfd8a1d3c4c352c7cbbd9c222b867f47f0f4511f2c1dab0b5fce56cdb6`.
Official extraction and all 1,521 corresponding-source file hashes verify. Exact-package browser
redraw, external-link selector, draft/restart/placement, extension contexts/profile isolation and
synthetic authentication/autofill pass. Complete installation hash is unchanged afterward.

The signed iOS candidate is 0.2.41 / 2611.2.1 with its existing paid profile and physical identity.
The website is deployed from the frozen source: all 9,221 file hashes and fourteen endpoints
pass, with schema, runtime configuration and protected application data preserved. Its new
recovery, central copy and ordinary isolated restore verify. The first activation rolled back
because three existing code generations exceeded the two-generation guard. After retiring the
exact verified oldest code copy, the guarded retry reused the same archive and recovery capture;
both activation and audit completed. Native Windows/Linux build chats await ordinary
destination-owned preflight approvals. Both physical mobile devices are reachable but locked;
no new capture or installation has started.

All nine served HTTPS assets match the accepted website archive. Final retention verifies two
local recovery dates, one server recovery date and two code generations. The bounded final server
retirement removed 1,260,495,148 logical bytes; observed available space increased by
1,285,296,128 bytes, which can include concurrent filesystem activity. Retained checksums,
environment identity and shared storage identity remain unchanged. Production inference and
authenticated browser workflows are separate acceptance checks; aggregate log audit is not a
claim that every existing system log is clean.

| Request | Implemented behavior | Evidence and remaining acceptance |
| --- | --- | --- |
| R1 | Restore browser layout on every browser redraw, independently of toolbar reuse. | Prior-source geometry assertion fails; corrected Electron redraw/sidebar/resize case passes without switching tabs, including the exact signed Mac package. Installed HC source and screenshot match the diagnosed conditional. Other platform and installed/live acceptance remain. |
| R2 | Add extension/session-scoped runtime contexts for host-created extension windows/popups; rotate context identity per navigation; disable vendor API payload logging. | Native popup context test changes from an empty list to POPUP. Synthetic authentication-to-ready and autofill pass without reopening the popup or touching the other window. Real Bitwarden unlock/autofill remains unverified. |
| R3 | Corroborate an exact missing-window observation with complete process-scoped inventory before settling uncertain input; require a new observation before subsequent input. | Closure, reuse, partial/denied/lost inventory, Stop and unrelated-error regressions pass. Installed owner still needs the new package and live closed-popup acceptance. |
| R4 | Group inference choices by source host/adapter, show availability and preserve source/model identity; omit empty generic buckets and duplicate local routes. | Shared JS/native identity and offline tests pass; desktop/remote form tests and web build pass. Real inference endpoints were unavailable during inventory; no successful cross-client inference is claimed. |
| R5 | Device-local New chat tabs with independent draft/attachments/placement and durable exact start-request identity; retry reconciles uploaded attachments after local bytes disappear. | Native parity tests and iPad/iPhone tab-switch/retained-draft/cancel UI tests pass in separate simulator test apps. Physical layouts remain unverified. Desktop setup also retains its replacement position after owner synchronization. |
| R6 | Hydrate mounted model controls from refreshed owner state even during a fresh network-cache TTL. | Real owner catalogs contain Astra/Terra and current Claude choices. Mounted-control regression preserves model/effort and adds newly advertised IDs with zero network reads. No model capability table was added. |
| R7 | Explain actual Fusion availability in model/provider screens; keep Auto separate. | Pinned Copilot SDK 1.0.28/runtime 1.0.105 advertises Auto without Fusion tiers. Advertised-tier routing/attribution regressions pass; real Fusion execution is unavailable and unverified. |
| R8 | Keep the external-link selector through focus loss without a default; remove arbitrary-window fallback; read source-app icon resources without the crashing native file-icon worker. | HC has no rules/default bypass. Disposable native icon lookup reproducibly terminates Electron with SIGTRAP; replacing that lookup passes the actual picker/filter/focus/project/rule/cancel test. Internal-link placement remains separate. HC Outlook acceptance remains. |

Two initial packaged extension fixtures accepted an unrelated website WebContentsView as the
next Electron window event. Captured failure state identifies the controlled HTTP form, with no
extension API, rather than the requested popup. The validation-only correction matches extension
ID and document path before observing readiness/authentication. Corrected exact-package checks
pass; the initial failures remain in private evidence. This is separate from real vault acceptance.

Validation checkpoint: complete Node suite passes **1,421 tests, four skips** using a short,
canonical temporary path. Static checks, the web production asset build and 106 web tests with
926 assertions pass. Native parity
passes 37 cases; the focused New chat UI case passes on both shared iPhone/iPad simulators.
Mac UI fixtures use disposable profiles and synthetic source/form data. Raw catalogs, screenshots,
crash reports and detailed logs remain outside Git. Later source changes receive focused checks
and the required final suite before package promotion.

The default macOS temporary directory produced unrelated canonical-path/socket-length failures;
that run is retained separately. One extension-notice test double needed the new context adapter
stub. The canonical-path rerun passes. No live vault material was read or logged and no build-only
live-data backups were created. Immutable source/package pins above retain their exact accepted
bytes; later validation and release records do not relabel Nov 1 or the frozen Nov 2 artifacts.

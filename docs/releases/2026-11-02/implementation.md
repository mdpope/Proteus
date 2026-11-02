# Nov 2 implementation

Version: 0.2.41

Status: source candidate under validation. No package publication or installation yet.

| Request | Implemented behavior | Evidence and remaining acceptance |
| --- | --- | --- |
| R1 | Restore browser layout on every browser redraw, independently of toolbar reuse. | Prior-source geometry assertion fails; corrected Electron redraw/sidebar/resize case passes without switching tabs. Installed HC source and screenshot match the diagnosed conditional. Exact-package/platform/live acceptance remains. |
| R2 | Add extension/session-scoped runtime contexts for host-created extension windows/popups; rotate context identity per navigation; disable vendor API payload logging. | Native popup context test changes from an empty list to POPUP. Synthetic authentication-to-ready and autofill pass without reopening the popup or touching the other window. Real Bitwarden unlock/autofill remains unverified. |
| R3 | Corroborate an exact missing-window observation with complete process-scoped inventory before settling uncertain input; require a new observation before subsequent input. | Closure, reuse, partial/denied/lost inventory, Stop and unrelated-error regressions pass. Installed owner still needs the new package and live closed-popup acceptance. |
| R4 | Group inference choices by source host/adapter, show availability and preserve source/model identity; omit empty generic buckets and duplicate local routes. | Shared JS/native identity and offline tests pass; desktop/remote form tests and web build pass. Real inference endpoints were unavailable during inventory; no successful cross-client inference is claimed. |
| R5 | Device-local New chat tabs with independent draft/attachments/placement and durable exact start-request identity; retry reconciles uploaded attachments after local bytes disappear. | Native parity tests and iPad/iPhone tab-switch/retained-draft/cancel UI tests pass in separate simulator test apps. Physical layouts remain unverified. Desktop setup also retains its replacement position after owner synchronization. |
| R6 | Hydrate mounted model controls from refreshed owner state even during a fresh network-cache TTL. | Real owner catalogs contain Astra/Terra and current Claude choices. Mounted-control regression preserves model/effort and adds newly advertised IDs with zero network reads. No model capability table was added. |
| R7 | Explain actual Fusion availability in model/provider screens; keep Auto separate. | Pinned Copilot SDK 1.0.28/runtime 1.0.105 advertises Auto without Fusion tiers. Advertised-tier routing/attribution regressions pass; real Fusion execution is unavailable and unverified. |
| R8 | Keep the external-link selector through focus loss without a default; remove arbitrary-window fallback; read source-app icon resources without the crashing native file-icon worker. | HC has no rules/default bypass. Disposable native icon lookup reproducibly terminates Electron with SIGTRAP; replacing that lookup passes the actual picker/filter/focus/project/rule/cancel test. Internal-link placement remains separate. HC Outlook acceptance remains. |

Validation checkpoint: complete Node suite passes **1,421 tests, four skips** using a short,
canonical temporary path. Static checks and the web production asset build pass. Native parity
passes 37 cases; the focused New chat UI case passes on both shared iPhone/iPad simulators.
Mac UI fixtures use disposable profiles and synthetic source/form data. Raw catalogs, screenshots,
crash reports and detailed logs remain outside Git. Later source changes receive focused checks
and the required final suite before package promotion.

The default macOS temporary directory produced unrelated canonical-path/socket-length failures;
that run is retained separately. One extension-notice test double needed the new context adapter
stub. The canonical-path rerun passes. No live vault material was read or logged and no build-only
live-data backups were created. Immutable source/package pins and rollout receipts will be added
after freezing and acceptance, without relabelling Nov 1 artifacts.

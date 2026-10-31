# October thirtieth release rollout

Requested version: **0.2.39**. Both Macs are installed and healthy on the first R14 package;
certificate information and notification-color corrections require a replacement package.
Target labels are non-secret roles; exact IDs, paths and detailed receipts stay outside Git.

| Machine or target | Platform | Stage | Evidence and remaining work |
| --- | --- | --- | --- |
| Build Mac command center | macOS arm64 | Installed and core preservation verified | Exact 0.2.39 build/hash and owner health verified; 63 runs/43,665 events preserved; core settings/permissions/pairings byte-identical; two verified recoveries; Proxmox still unreachable |
| Work Mac | macOS arm64 | Installed and core live checks verified | Exact 0.2.39 build/hash/Apple identity and owner health verified; 577 runs/45,004 events preserved; saved settings byte-identical; two verified recoveries; live lifecycle/shared-close/site delivery still unverified |
| Linux laptop | Linux | Awaiting destination approval | Corrected frozen desktop source supplied; exact catalog/build readiness still pending |
| Designated Windows builder | Windows x64 | Accepted package handed off; waiting for idle | Exact corrected desktop source built after verified Node-only repair; source/static/package/extraction/acceptance/publisher checks pass; installed health pending; installer Authenticode unsigned |
| Ian's laptop | Windows | Coordinator-default setup awaiting approval | Operator selected Codex, GPT-6.1 Terra, High, normal speed; create actual update coordinator after defaults persist; consume designated builder's package |
| Website | Web | Notification source validated; deployment pending | Website event validation/sound/deduplication tests pass; live server still retains two recoveries and historical public packages, requiring verified one-server/current-only rotation |
| iPhone and iPad | iOS | Source and targeted simulator checks pass; Apple work waiting for unlocked Mac | Physical devices unchanged; simulator test identity guard needs revalidation and the earlier fixture-reset iPhone simulator needs reconnection; reuse shared simulator pool |

The two Macs above run the baseline accepted 0.2.39. Fresh corrective coordinators for certificate
information and original notification colors await their normal destination approvals; their new
candidate is accepted locally but is not yet installed. The named release stays open.

Record actual build/signature, required migrations, test outcomes, preservation and health for
each dispatched target. Stages are building, published, dispatched, staged, installed, live verified,
blocked or deferred. A task/model completion is not installed/live-verified acceptance.

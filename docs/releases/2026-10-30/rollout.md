# October thirtieth release rollout

Requested version: **0.2.39**. Both Macs are installed and healthy on the first R14 package;
certificate information and notification-color corrections require a replacement package.
Target labels are non-secret roles; exact IDs, paths and detailed receipts stay outside Git.

| Machine or target | Platform | Stage | Evidence and remaining work |
| --- | --- | --- | --- |
| Build Mac command center | macOS arm64 | Installed and core preservation verified | Exact 0.2.39 build/hash and owner health verified; 63 runs/43,665 events preserved; core settings/permissions/pairings byte-identical; two verified recoveries; Proxmox still unreachable |
| Work Mac | macOS arm64 | Installed and core live checks verified | Exact 0.2.39 build/hash/Apple identity and owner health verified; 577 runs/45,004 events preserved; saved settings byte-identical; two verified recoveries; live lifecycle/shared-close/site delivery still unverified |
| Linux laptop | Linux | Preflight; source-pin hold | Installed owner/recovery reported healthy; exact catalog result unresolved; normal destination approval pending; wait for corrected source |
| Designated Windows builder | Windows x64 | Preflight; source-pin hold | Configured idle Windows x64 builder reported; no 0.2.39 build started; reconcile designation/catalog and corrected source |
| Windows client laptop | Windows | Not started | Consume the signed package after first-builder publication |
| Website | Web | Not started | New policy and release staging are source-only; live retention not audited/applied |
| iPhone and iPad | iOS | Not started | Authorized after HC verification; native delta/package pending; use shared simulator pool |

Record actual build/signature, required migrations, test outcomes, preservation and health for
each dispatched target. Stages are building, published, dispatched, staged, installed, live verified,
blocked or deferred. A task/model completion is not installed/live-verified acceptance.

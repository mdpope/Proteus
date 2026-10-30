# October thirtieth release rollout

Requested version: **0.2.39**. Mac read-only preflights were dispatched; no installation is verified.
Target labels are non-secret roles; exact IDs, paths and detailed receipts stay outside Git.

| Machine or target | Platform | Stage | Evidence and remaining work |
| --- | --- | --- | --- |
| Build Mac command center | macOS arm64 | Accepted candidate queued; preflight awaiting input | Exact local app/hash supplied to coordinator; destination tool approval pending; prior preparation preserved |
| Work Mac | macOS arm64 | Preflight awaiting input; transfer pending | Installed 0.2.38 reported; accepted candidate identities supplied, bytes not delivered; destination tool approval pending |
| Linux laptop | Linux | Not started | Native package/public catalog required; no new coordinator dispatched |
| Designated Windows builder | Windows x64 | Not selected | Select the intended builder and pin repository source when a build is authorized |
| Windows client laptop | Windows | Not started | Consume the signed package after first-builder publication |
| Website | Web | Not started | New policy and release staging are source-only; live retention not audited/applied |
| iPhone and iPad | iOS | Not started | Authorized after HC verification; native delta/package pending; use shared simulator pool |

Record actual build/signature, required migrations, test outcomes, preservation and health for
each dispatched target. Stages are building, published, dispatched, staged, installed, live verified,
blocked or deferred. A task/model completion is not installed/live-verified acceptance.

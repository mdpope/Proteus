# Nov 1 rollout

Version: 0.2.40

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Primary coordinator/builder | macOS arm64 | 0.2.40 | building | Expanded source acceptance; immutable package pin pending. |
| Secondary Mac consumer | macOS arm64 | 0.2.40 | not started | Owner preflight complete on 0.2.39; new package and two five-minute responsiveness intervals pending. |
| Designated Windows builder | Windows x64 | 0.2.40 | not started | Native owner builder configured; exact source freeze pending. |
| Windows consumer | Windows x64 | 0.2.40 | not started | Owner preflight complete; awaits published binary, no source build. |
| Designated Linux builder | Linux x64 | 0.2.40 | blocked | Current owner's native builder is unconfigured; source-project build routing required. |
| Physical mobile devices | iOS | 0.2.40 / 2611.1.1 | not started | Simulator regressions pass; paid signed package, preservation/install/live acceptance pending. |
| Website | Web | 0.2.40 | not started | Local regressions pass; exact deployment package and verified recovery pending. |
| Future Mac consumer | macOS | 0.2.40 | deferred | Not installed or paired yet; no destination invented. |

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

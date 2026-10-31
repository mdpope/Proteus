# October thirtieth release rollout

Requested version: **0.2.39**. Both Macs are installed and healthy on the first R14 package;
certificate information and notification-color corrections require a replacement package.
Target labels are non-secret roles; exact IDs, paths and detailed receipts stay outside Git.

| Machine or target | Platform | Stage | Evidence and remaining work |
| --- | --- | --- | --- |
| Build Mac command center | macOS arm64 | Baseline installed; corrective candidate handed off | Baseline 0.2.39 health and 63 runs/43,665 events verified; two recoveries; exact final `5bcbd89` package passes signing and owner startup, awaiting normal idle and post-restart verification; Proxmox still unreachable |
| Work Mac | macOS arm64 | Baseline installed; corrective candidate handed off | Baseline 0.2.39 health and 577 runs/45,004 events verified; two recoveries; exact final `5bcbd89` package/source verified and awaiting normal idle; live lifecycle/shared-close/site delivery remain separate |
| Linux laptop | Linux | Awaiting destination approval | Corrected frozen desktop source supplied; exact catalog/build readiness still pending |
| Designated Windows builder | Windows x64 | Final package accepted and handed off; installed 0.2.36 | Frozen source `3422822` passes serial Electron binary check, 1,351 native tests/six skips, static and exact-package gates; normal human reopening verified selected settings and both recoveries; candidate passes owner preflight and awaits idle; installer Authenticode unsigned |
| Ian's laptop | Windows | Coordinator-default setup awaiting approval | Operator selected Codex, GPT-6.1 Terra, High, normal speed; create actual update coordinator after defaults persist; consume designated builder's package |
| Website | Web | Exact validated archive privately staged; deployment pending | Full isolated suite passes 105 tests/920 assertions; 9,221 archived file hashes verify; Webmin inspection times out; live server still needs verified one-server/current-only rotation |
| iPhone and iPad | iOS | Unlocked readiness passed; cold recoveries capturing | Actual baseline is 0.2.36 / 2610.29.1; current recovery registries and exact baseline app verified; same paid profile/certificate and unchanged keychain entitlements; install and pre-launch preservation checks pending; simulator acceptance remains separate |

The two Macs above run the baseline accepted 0.2.39. Fresh corrective coordinators for certificate
information and original notification colors have verified and handed off the new candidate from
frozen Mac source `5bcbd89`; installation is not yet verified. Build Mac's historical attention
record remains preserved and blocks maintenance. The ordinary preparation gate independently
accepted the candidate after both current recoveries verified; no maintenance bypass or journal edit occurred.
The website/browser transport and opt-in native menu-gesture checks remain qualified; they do not
invalidate the independently observed normal-phone authenticated cold reconnect. The named release stays open.

The final Mac publication envelope is signed by the existing trusted publisher and independently
verifies against the exact accepted payload on the command center. Public activation remains pending.
The accepted Windows artifacts are verified in a private draft for consumer delivery;
private transfer, publication, installation and live acceptance are separate stages.
That transfer and independent command-center downloads are now verified, including an exact
native source companion containing all 432 runtime and 10 build inputs. Both public download
catalog/page payloads are prepared with one current generation, but are not activated. Hosting
transport/retention, Linux/Ian destination approvals and final live acceptance remain outstanding.

Record actual build/signature, required migrations, test outcomes, preservation and health for
each dispatched target. Stages are building, published, dispatched, staged, installed, live verified,
blocked or deferred. A task/model completion is not installed/live-verified acceptance.

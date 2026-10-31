# October thirtieth release rollout

Requested version: **0.2.39**. Both Macs are installed and healthy on the first R14 package;
certificate information and notification-color corrections require a replacement package.
Target labels are non-secret roles; exact IDs, paths and detailed receipts stay outside Git.

| Machine or target | Platform | Stage | Evidence and remaining work |
| --- | --- | --- | --- |
| Build Mac command center | macOS arm64 | Installed and core preservation verified | Exact 0.2.39 build/hash and owner health verified; 63 runs/43,665 events preserved; core settings/permissions/pairings byte-identical; two verified recoveries; Proxmox still unreachable |
| Work Mac | macOS arm64 | Installed and core live checks verified | Exact 0.2.39 build/hash/Apple identity and owner health verified; 577 runs/45,004 events preserved; saved settings byte-identical; two verified recoveries; live lifecycle/shared-close/site delivery still unverified |
| Linux laptop | Linux | Awaiting destination approval | Corrected frozen desktop source supplied; exact catalog/build readiness still pending |
| Designated Windows builder | Windows x64 | Corrective native qualification blocked; installed 0.2.36 | Earlier accepted candidate failed helper integrity before handoff and was cancelled; exact Crashpad correction is implemented; native cleanup fix passes, serial Electron bootstrap now requires native qualification; normal human restart still pending |
| Ian's laptop | Windows | Coordinator-default setup awaiting approval | Operator selected Codex, GPT-6.1 Terra, High, normal speed; create actual update coordinator after defaults persist; consume designated builder's package |
| Website | Web | Exact validated archive privately staged; deployment pending | Full isolated suite passes 105 tests/920 assertions; 9,221 archived file hashes verify; Webmin inspection times out; live server still needs verified one-server/current-only rotation |
| iPhone and iPad | iOS | Signed physical candidate ready; devices locked | Existing paid profile/certificate and unchanged keychain entitlements verify; 157 isolated phone unit tests and notification UI pass, targeted iPad checks pass; normal phone reconnects to the real owner; physical installation waits for unlocked devices |

The two Macs above run the baseline accepted 0.2.39. Fresh corrective coordinators for certificate
information and original notification colors await their normal destination approvals; their new
candidate from frozen Mac source `5bcbd89` is accepted locally and privately transferred, but
is not yet installed. Build Mac also reports an older attention job requiring owner reconciliation.
The website/browser transport and opt-in native menu-gesture checks remain qualified; they do not
invalidate the independently observed normal-phone authenticated cold reconnect. The named release stays open.

Record actual build/signature, required migrations, test outcomes, preservation and health for
each dispatched target. Stages are building, published, dispatched, staged, installed, live verified,
blocked or deferred. A task/model completion is not installed/live-verified acceptance.

## R15 - Windows inference host follow-up

The PC already runs published 0.2.39, build windows.06ac0b603ae1. Installed official llama.cpp b12019 CUDA 12.4 with published archive digests verified; reused existing Qwen Q4_K_M. API-key-protected HTTPS and a current-user login task are configured. A live synthetic tool read and answer passes. The subnet-scoped firewall change was denied without administrator rights; remote reachability is unverified. The new Proteus provider is source-only pending exact-package acceptance and supervised installation. No other desktop was updated.

Full desktop tool admission required increasing context to 32K; Q8 cache / 18 GPU layers measured 5,987 MiB dedicated inference VRAM. Windows Task Scheduler failed to launch the user action (retained error codes); it is disabled and replaced with a current-user Startup shortcut to the hidden server script. Startup verification and post-install acceptance are tracked privately. Firewall administrator approval remains pending.

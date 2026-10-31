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

R15 Windows package accepted: source 820644272f251c71df8b796fc00641ac93f02401, build windows.31d7fe49793e, source fingerprint 31d7fe49793e7b6b83e7a8e8cbd129cf5575086ab401508b3f255005e953f218. Native suite: 1,360 pass / six skip. Static checks, packaging, official extraction, exact-package UI/PTY/restart, unchanged bytes and publisher signature pass. The package remains private and installation is assigned to a fresh owner update coordinator. Final inference deployment is 32K context / Q8 K/V / 20 GPU layers / MTP3 / 12 generation and 16 prompt threads, with cold login-start verification. Short generation measured 4.87 tokens/s at this profile; this is not a speed advantage claim over LM Studio. Firewall administrator approval and cross-device third-party API verification remain pending.

R15 installed verification (October 31): owner job 2435ccdd-a5eb-5883-9f62-8d2c9be5274a completed with outcome updated, no error, verified health and same-chat continuation. Running identity matches windows.31d7fe49793e / 31d7fe49793e7b6b83e7a8e8cbd129cf5575086ab401508b3f255005e953f218. Owner preservation reports nine runs / 5,592 events. Fresh maintenance reports two verified recovery generations and no issues. The installed provider discovers qwen3.8-27b with 32,768 context and completed a real READY smoke response with 2,192 observed input / two output tokens. The independent inference server survived restart. The updater recorded an actual free-space delta of -250,773,504 bytes; this is an observed interval, not an attributed cleanup saving. No application-data migration was required.

The coordinator remains awaiting a human approval for proteus_desktop status; installed native visual acceptance is not claimed. Source desktop/new-chat acceptance and the official extracted-package UI/PTY/restart checks passed earlier. The LAN firewall administrator question is still unanswered; no firewall rule exists and third-party cross-device API reachability remains unverified. Existing encrypted paired-Proteus provider discovery is supported by the dynamic client catalog but has not been exercised from another machine in this task.

## R16 initial rollout state

Source-only shared inference is validated using two disposable desktops and the live Qwen model; no production shared-device grants/imports or relay-server deployment changed. The Windows standalone API now binds loopback and operator-specified primary LAN address with a matching certificate; an authenticated local request to that LAN address returns the model. Windows reports all firewall profiles disabled. The operator-approved UAC request was cancelled at the OS boundary; no firewall rule was added or elevation retried. Cross-device standalone API reachability is unverified. Desktop rollout selection is pending the operator's response.

R16 rollout authorization: the operator selects Windows, Build Mac and Work Mac. All three desktop installations may receive this feature, preserving active work, data, provider sessions and the two-generation recovery policy. Source pin remains 933e44663b1034509452a8398725cd1461033714. The first Windows native qualification failed in the unchanged state-projection worker test; its four-case focused rerun passes without source changes. The original failed receipt is retained and an unchanged-source native retry is running. GitHub Actions were observed enabled despite the operator hold; source publication uses a skip-ci audit commit and no workflow is enabled or dispatched.

R16 Windows native package accepted from exact qualification source 269f32f1b9f66cdcb042396f95532632ec5da937 (runtime feature introduced in 933e446). Build windows.a75036ab7b7f, fingerprint a75036ab7b7feeb57f53fe47404088714739617b7ecb06fa64c08f3cbdb855b8, package hash 5aa261480b0a1dfd71670e68c6f143d3f1d2b56632d061fdb78a267ee2dbf629. Archive SHA256 41735d58f1411cb463ee1e50a911885bc5a9397e5d267409753592444670eb9e. Native suite passes 1,371 tests / six skips; static checks, official extraction, exact-package UI/PTY/restart, unchanged bytes and publisher signature pass. The signed envelope is distinct from the Authenticode-unsigned installer. No hosted Actions ran.

The fresh Windows installation coordinator prepared and handed off this exact build; owner job 9ad5dfd6-67a9-5710-b208-403b45818724 is waiting for idle. The parent turn and the earlier R15 coordinator's human desktop-status approval are the reported blockers. No chat was cancelled or approval bypassed. Installation and post-restart verification remain pending. Both Macs have dedicated coordinators awaiting human command approvals; Build Mac's transport is intermittent. Its corrected source-pin follow-up has not yet been acknowledged; HC has accepted that follow-up. One Build Mac darwin/arm64 build is intended for both Macs. No Mac package is accepted or installed yet and no production sharing/import grants were enabled.

Build Mac subsequently acknowledged the corrected 269f32f source-pin follow-up (durable task 7aca1296-2930-5067-91cd-307a8bf08cd3). Both Mac installation coordinators remain subject to their human command approvals; an accepted task is not build or installation success. Windows job 9ad5dfd6-67a9-5710-b208-403b45818724 remains handed off to the idle barrier with the earlier coordinator approval and parent activity as reported blockers.

# Nov 3 rollout

Version: 0.2.42

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Coordinating Mac | darwin-arm64 | 0.2.42 | staged | Signed package accepted locally at `568705c`: install hash `620dc000…f697`, archive `104afbe9…0ef7`, 15 packaged UI tests, strict signature. Not published. A separate update chat handles installation, as the operator authorized for this Mac only. |
| Linux builder | linux-x64 | 0.2.42 | staged | Built at `568705c`: install hash `32029f76…778c`, unsigned, not published or installed. 14 of 15 packaged tests pass, and `desktop-package-ui` passes on the fixture corrected in `5b835fa`. See the qualification in [implementation](implementation.md). |
| Windows builder | win32-x64 | 0.2.42 | blocked | The operator must review or resume this computer in Connections. No other computer substitutes. The publisher key also stays here, so publication waits on it too. |
| iOS physical | ios | 0.2.42 | deferred | Signed candidate 2611.3.2 built at `5501776`, not installed; it supersedes 2611.3.1. The operator holds installation on other devices. iOS has its own pin; desktop stays at `568705c`. |
| iOS simulators | ios | 0.2.42 | installed | Preview identities on the shared iPhone and iPad updated in place to 2611.3.2 with pairing kept and protected data hash-checked unchanged. Simulator only: not evidence of device feel. |
| Website | web | 0.2.42 | deferred | Bundle builds locally. No package or deployment. |
| Relay | service | 0.2.42 | deferred | The heartbeat fix takes effect only when redeployed. Not done. |
| Other desktops | mixed | 0.2.42 | deferred | The operator holds these. They keep Nov 2 and receive whole-state snapshots at the batched cadence. |

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

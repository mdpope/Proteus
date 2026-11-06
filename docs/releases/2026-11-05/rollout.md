# Nov 5 rollout

Version: 0.2.43

| Target | Stage | Evidence and remaining work |
| --- | --- | --- |
| Mac artifact | Source freeze and candidate preparation | Prioritized signed Mac candidate for private Work Mac acceptance; full public release waits. |
| Work Mac digest owner | Not started | Consume accepted Mac artifact through a separate owner update coordinator; verify preservation, managed connections, captured scoped permissions and real digest outputs, including outage recovery and a second no-new-evidence run. |
| Linux / Windows / iOS | Operator hold | Do not build until the Mac candidate is delivered and digest iteration permits the full release. |
| Web and full public release | Pending later release stage | P1/P2 acceptance/retention work remains tracked; no new deployment claimed. |

organization workflows configuration and workflow tests stay with its workflow owner. Product source, artifact
acceptance and release delivery stay with the coordinator. Model completion is not external
workflow success. Private task/device routing and receipts stay outside Git.

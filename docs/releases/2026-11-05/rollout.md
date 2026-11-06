# Nov 5 rollout

Version: 0.2.43

| Target | Stage | Evidence and remaining work |
| --- | --- | --- |
| Mac artifact | Signed and private-transfer verified | Candidate 1 from fc0b318; source/static/native UI and exact packaged startup/archive checks pass. Full public release waits. |
| Work Mac digest owner | Candidate downloaded/verified/prepared; waiting for idle | Existing digest run is awaiting input and blocks restart. No unrelated run cancelled. Installation and managed workflow acceptance remain unverified; preserve the two-run/outage/output criteria. |
| Linux / Windows / iOS | Operator hold | Do not build until the Mac candidate is delivered and digest iteration permits the full release. |
| Web and full public release | Pending later release stage | P1/P2 acceptance/retention work remains tracked; no new deployment claimed. |

organization workflows configuration and workflow tests stay with its workflow owner. Product source, artifact
acceptance and release delivery stay with the coordinator. Model completion is not external
workflow success. Private task/device routing and receipts stay outside Git.

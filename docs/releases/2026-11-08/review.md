# Nov 8 release review — November 10

Build Mac runs the final `281a24894d9e+src.41d00617717d` build with verified owner health
and zero automatic navigation differences. Work Mac and Linux have also updated with verified
health; broader destination acceptance is still separate. Both physical iOS devices have
2611.10.3 installed, with the specific preservation exceptions recorded in the
[rollout](rollout.md). Web release 20261110T063757Z passed endpoint/asset checks and signed-in
interaction. Native file-browser parity and provider bridge changes have source and synthetic
package evidence; that does not certify every physical gesture or real workflow.
Windows native acceptance and publisher verification passed. One consumer is updated with
verified health and navigation preservation. The designated builder returned to its healthy
baseline after a pre-replacement recovery-quiescence failure. HC native command portability/replay now passes for Codex, Copilot and Claude using
the same explicitly approved schedule grant. The fixture retains its narrow policy, artifacts,
ledger and source-aware owner selection. This does not certify once/deny/revocation or Notification
Center error visibility and persistence.
The [complete request audit](request-audit.md) still distinguishes implementation from acceptance.
Nov 8 remains open. The operator reports a cross-device draft mismatch; draft sync has not passed.

## Lessons and follow-up changes

| Priority | Finding | Required response | Current state |
| --- | --- | --- | --- |
| P0 | Recovery requests aborted at ten seconds within a sixty-second overall budget. The successful attempt reached preservation-ready at 17.118 seconds. | Derive request deadlines from the remaining overall budget, reject late success, retain full identity/UI/barrier/preservation checks. Test healthy slow recovery and actual rollback with multiple restored windows and a representative profile. | Deadline correction, categorized errors and static stage timing logs are installed on Build Mac. Exact source of the latency remains unproven. |
| P0 | Generic owner-request-failed hid connection, transport, HTTP and timeout causes and encouraged repeated attempts. | Stop automatic retries after a repeated verification failure, inspect the exact failed phase, then retry after a concrete correction or explicit reviewed retry decision. | Categories and startup log stages are installed. Durable helper-written stage/attempt/last-progress status is implemented and covered by source regressions; the latest installed owner reports stage verified, 103 attempts, last progress and a categorized prior HTTP failure. |
| P0 | The parent and coordinator were themselves idle blockers. Status feedback could cause another turn or require reviewed handoff on older builds. | Prepare and hand off once, release desktop control, then end both turns. Let the owner/helper monitor. Notify the user for a decision, failure or post-restart result. Re-read current phase/revision after new human input. | Structured blocker inventory and feedback guard already exist. Model-independent helper progress is implemented. Post-restart and failure feedback remains owner-controlled; normal idle barriers remain. |
| P1 | Waiting can continue as new scheduled work arrives. Awaiting-input work requires a human decision. Future schedule permissions do not resolve captured approvals. | Offer direct links to exact blockers and clear Wait, Resolve pending item, Defer update and explicitly selected Stop work and update choices. Add an optional drain mode that temporarily holds new admissions and restores normal scheduling with defined misfire behavior. | Current Updates UI lists reasons/next steps. Direct blocker links, Resolve, Defer and explicit confirmed Stop controls are implemented. Optional admission drain and all-client acceptance remain open. |
| P1 | A checkpoint requested preservation of two older recoveries, while the helper rotated the oldest generation under normal retention. | Surface the exact planned survivors/retirement before handoff. Represent any retention exception as a supported, scoped, budgeted hold with an expiry condition. Reject an unsupported hold before shutdown. | Two verified recoveries remain. The retirement discrepancy is recorded. A prose checkpoint cannot enforce a retention hold. |
| P1 | Old checkpoint statements contradicted current installation and feature status. | Maintain one current acceptance matrix with source pin, installed target, evidence, unresolved test and owner. Keep chronological attempts as historical evidence. | This review and rollout ledger are the current summary. Historical closeouts retain their original qualifications. |

A successful isolated startup test did not reproduce recovery against this owner's restored windows
and preservation workload. Add a disposable production-shaped rehearsal through actual helper,
restart, healthy slow verification and injected rollback, including task feedback, new user input,
queued schedules, pending approvals and desktop-lease release. These cases are proposed acceptance
work, beyond the existing smaller source regressions.

## Current outstanding work

| Area | Latest evidence | Remaining work |
| --- | --- | --- |
| Mac recovery/preservation | Final installed fingerprint, health and 8 workspaces/19 projects/64 scopes/241 tabs/3 windows verify. | Independently exercise Back/Forward, reading, sources/models, pairings and real Keychain continuity. Desktop peer draft read/save methods were missing from the transport allowlist; mobile/web use a different path. The operator defers the correction to a separate Nov 10 branch and forbids another Nov 8 build/deployment for it. Preserve both drafts; installed synchronization has not passed. Fresh Cua verification was blocked by another chat's desktop lease; installed tools alone are not permission/observation evidence. Resolve legacy attention/unregistered recoveries through supported maintenance. |
| iOS new-chat attachments | Simulator Files/Photos dismissal, native Paste consent, image review/upload and chat creation pass. Both devices have corrective build 2611.10.3 installed. | Physical new-chat import/review and retry acceptance remain pending. |
| Spelling | Desktop native edit routing and replacement callbacks pass their checks. Mac package contains the change. Web assets build. | Actual OS dictionary suggestions/replacement were unavailable in the automated Mac fixture. Verify real desktop/browser correction. Deploy the later web editable-menu guard and validate native iOS spell checking after simulator acceptance. |
| Physical mobile behavior | Both devices have corrective 2611.10.3 installed and launched. The rollout ledger records the specific phone lock-file exception and tablet final source-stability qualification. Simulator routing, grouped tabs and typing/history cases pass. | Real-chat scrolling/typing, notification-repeat cessation, tap-to-answer and cold/background reconnect remain qualified. A recorded phone cache revision matched the desktop tab IDs, while new phone-tab propagation still needs physical verification. |
| Folder access | Owner grant, stable retry and permission transition regressions pass. | Installed desktop/web/iPhone/iPad request/approve/deny and next-turn sandbox activation acceptance. |
| Schedule provider portability | HC native first ingestion totals 10; unchanged-evidence replay passes on Codex, Copilot and Claude with no new prompt. Exact saved grant, artifacts/mtimes, two-entry ledger, paused state and source/owner selection remain intact. | Once/deny/revocation and actual Notification Center severity/correlation/dedup/restart remain unverified. Synthetic replay does not establish all professional workflows or first ingestion on every provider. Live schedules remain unchanged. |
| Remote questions/remembered approvals | Ordinary question transport and acknowledgment-driven dialog correction are implemented. | Actual Mac-to-Windows text/choice questions and stale/reconnect/double-click cases. Full cross-owner remembered-approval fault matrix. |
| Mnemosyne | Storage/log/Library guidance and guarded native controls are installed. November 10 read-only checks found an available runtime, active running control status, loaded native services and a fresh library index. Storage returns a correctly labeled partial lower bound. Both transcript schedules are enabled and have recent runs. | Latest schedule reports explicitly remain incomplete; successful native wake/sync is not completed filing. Intake verified bounded context updates, while broader reconciliation and follow-up verification remain open. The large native intake snapshot exceeds the observer's bounded JSON read, so queue metadata is unavailable; do not infer no work. Native library/phone synchronization and independent product extraction remain broader scope. |
| Atlassian/ADO | Reconsented managed Jira exposes 18 tools. Issue/JQL/comment reads and nine canonical team queries pass. Live queue comparison matches 16 open items in order and 33 resolved items in membership. The disposable fixture accepted a comment and Resolve transition, each independently read back, and is completed. Guided ADO source/catalog/UI tests pass. | Jira multi-page results and create/edit/link/worklog runtime acceptance remain open. Workflow validation required resolution notes/customer fields omitted from required-field metadata and ADF formatting. Account-scoped ADO family reads/pool writes and PAT lifecycle/CLI design remain separate. |
| Proxmox/local networking | Native permission correction and browser/CDP source tests pass. | Installed local-network permission delivery, live page/noVNC connection and DevTools responsiveness. |
| Release completion | Mac, web and iPhone accepted identities are recorded separately. | Current publication/source-companion reconciliation, release integration/closeout and eligible artifact/recovery cleanup. Nov 8 has no completed closeout. |

Final recovery follow-up reproduced the Windows first-scan deadline defect in the unchanged
accepted source. The correction is undergoing Windows package acceptance and normal signed
rollout, with scan counts/timings retained for any later failure. The original installation
receipt cannot establish which failure path occurred.

Web recovery closeout independently reverified the existing isolated restoration against all
18 captured protected tables, schema, native ledger and nutrition. Current live snapshots were
stable and differ in app records from the earlier capture. The original failed rehearsal remains
retained with its unrecorded cause. The reviewed retention plan verified current code, previous
recovery code, one server recovery and both local recovery generations before retiring eligible
duplicates. Measured server free space increased by 655,704,064 bytes. All 14 endpoints passed
the subsequent audit.

## Carried acceptance from earlier closed releases

Nov 5 remains closed. Its additional Windows consumer rollout was explicitly deferred and still
needs supported readiness diagnosis and authorized installation. Legacy recovery/attention holds
on Build Mac and Linux remain unresolved. Production signed-in web interaction, sustained
relay/network behavior and native workspace-file/image parity remain qualified or incomplete.

Earlier Linux rollback and ordinary isolated web-restore gaps have later successful verification
recorded in Nov 5 and Nov 8 respectively. Keep those earlier failures as history without listing
them as fresh failures. Bounded organization workflows digest/replay acceptance passed in Nov 5. Historical content
coverage gaps retain their separate meaning and do not invalidate that accepted workflow.

Implementation and pending product follow-ups are distinguished above and in the latest implementation record. Existing deployment holds,
operation permissions and pending human approvals continue to determine runnable acceptance work.

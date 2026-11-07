# Nov 5 / 0.2.43 closeout

Status: **closed 2026-11-06**. The operator explicitly deferred the blocked additional Windows
consumer update to Nov 6. The release is complete with that recorded rollout deferral and the
verification limits below. No successor release has been opened.

## Accepted product and deployment

Managed named MCP connections, protected Atlassian/ADO authentication, owner status/setup and
provider paths are implemented. Source reconciliation, scoped permissions and actual connected
read annotations remain enforced. Native organization workflows inbox/digest/planning tests and a separate replay
pass without new prompts; current-day source/People/project checks pass. Actual Jira/ADO reads,
Slack query retention, bounded thread propagation and same-tab cleanup/recovery pass. All 52 replay
paths remain byte-identical and counts/cursors stay stable. Historical organization workflows content coverage is
partial and retained; those gaps are not product failures. organization workflows validation passes 111 tests and
four manifests. Native controls/schedules/authentication were preserved.

Client changes include desktop/web file browsing and image viewing, Markdown properties/wiki links,
larger overviews, shared layout/connection/chat-detail improvements, question navigation and
completion-notification corrections. Mnemosyne's shared Proteus operations interface is implemented;
its independent native product extraction is not implied. Source, Chromium/WebKit, simulator and
disposable native evidence is recorded in the client matrix. Physical APNs/gesture/reconnect and
production signed-in web interaction remain separately unverified.

The accepted runtime source pins differ by platform and corrective delivery:

| Target | Installed / deployed outcome |
| --- | --- |
| Build Mac | 7180447 repair installed, healthy; zero navigation differences; read-only desktop verification passes |
| Work Mac | 7932e29 browser correction installed, healthy; zero navigation differences; bounded actual organization workflows acceptance passes |
| Main Windows | Accepted windows.30f8b6596e38 installed; verified health/navigation/desktop; detailed rendering/history limits retained |
| Linux | Accepted 88367d6 source package installed; verified health/navigation; GUI/history and legacy maintenance limits retained |
| Additional Windows consumer | Operator-deferred to Nov 6; prior installation and original prepared helper-readiness failure preserved; no successful update claimed |
| iPhone / iPad | 0.2.43 build 2611.5.1 installed in place; protected-file/destination and launch checks pass; physical interaction/push limits retained |
| Web | 20261106T080204Z deployed; endpoint and isolated authenticated acceptance pass; production signed-in check remains unverified |

Mac repair source: `7180447eb2b2e6c999c9d7234d1f198831f1917c`.
HC browser source: `7932e29cfa88deb409efc0ede86d3f76ae333728`.
Original native/mobile/web source: `88367d6772f5356a28bb8f3882ea9affc4b32f70`.
Exact signed identities, manifests, device receipts and private routing stay in the private ledger.

## Validation and preservation limits

Accepted Mac repair source: 1,696 tests pass, four skip, static and native startup pass. Signed
success and injected-failure update rehearsals verify same-session continuation, prior events and
full synthetic navigation history. Real updater receipts verify health and navigation, not every
individual history/reading/pairing/migration property. Original failures and uncertain receipts
remain intact. Build Mac and Linux have unresolved legacy recovery/attention records preventing
clean maintenance; no raw journal changes or deletion of unresolved evidence were performed.

## Operator-deferred successor scope

The operator explicitly moves non-digest features/fixes, including Proxmox, to Nov 6 rather than
another current feature build. The successor plan includes guided full-family ADO/agent pools,
website network permission/Proxmox acceptance, independent Mnemosyne work, remaining parity and
production checks, Jira write modeling and remote remembered approvals. Tested preparatory source
is checksum-preserved outside this checkout; it is not part of these installed artifacts. No new
version or release effort has been opened.

## Retention and integration

Current-only public distribution was independently hash/signature verified. Two retained local
Mac artifacts were independently reverified. Twenty-two obsolete bundle/archive/publication-staging
items were retired while preserving corresponding source companions and metadata; 17,850,437,632
bytes of free space were observed recovered. Current Windows/Linux/iOS artifacts, all live data
and device recovery roots were untouched. One source worktree remains; no obsolete source
worktree was found. PR #31 is merged into main at `0dbc4437e9bcdfb39cc2cd9be59b5baa92c593be`. Final closed-state
metadata is committed on main, with remote synchronization and merged-branch retirement verified
in the private closeout receipt. The accepted application bytes are unchanged by documentation
closeout. No new build, installation or workflow run was required.

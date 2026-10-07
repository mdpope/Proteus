# October 7 implementation and acceptance

The operator authorized implementation, testing and deployment of PR #18 and an audit of the
previous implementation plan. Starting source: `ce64d6a` (0.2.3); planning import: `9bcc899`.
Target: 0.2.4, native 2610.7.1. Installation is separate from implementation and synthetic tests.

| BF-2026-10-07 | Source work | Verification | Installed |
| --- | --- | --- | --- |
| 01 Recovery | Per-host backoff, heartbeat, wake/network retry; manual/auth boundaries; preserved chat drafts | Encrypted peer regression including no mutation replay passes | Pending |
| 02 Schedule layout | Separate source/action rows; wrapping long paths | Actual Electron at 1440/900/620 passes | Pending |
| 03 Model labels | Use metadata display names without redundant invocation IDs; no false warning when unselected | Catalog-driven composer regression passes | Pending |
| 04 Approved new chat | Wide composer, provider-first, local chat-only folders, configured remote starting folders, retained draft/title/attachments | Electron layout and local/remote destination-switch checks pass; arbitrary new remote roots require Mac configuration | Pending |
| 05 Approval scope | Explicit once/chat/workspace lifetime and restart language across clients; grant semantics unchanged | Permission unit regressions pass; installed review pending | Pending |
| 06 Runtime | Persist active intervals; live desktop/web/native timers; exclude waits/idle; union overlaps; partial/offline labels and host clock offset | Interval/overlap/crash tests and iPhone/iPad simulator timing and expanded-output checks pass | Pending |
| 07 Question history | Original wording/options/descriptions, stable IDs and replies, cancellation/interruption | Serialized-question, answer-association and disk-persistence regression passes | Pending |
| 08 Browser ownership | Chat presentation parent captured before awaits; agent tabs/popups inherit parent | Existing browser suite plus tab regression; installed live agent workflow pending | Pending |
| 09 Browser preference | Engine Room preference, OS default app name, device-local revision-protected persistence | Electron preference persistence and native default-browser lookup pass; installed exercise pending | Pending |
| 10 Pinch overview | Scope-aware main/chat/Team overview with non-browser cards, visible/keyboard alternatives and guarded renderer pinch | Team scope Electron regression passes; physical trackpad feel remains unverified | Pending |
| 11 Standup order | Desktop/web drag and keyboard ordering; existing/new tabs follow saved link order | Electron revision-checked saved order, load order and reuse-without-duplicates pass | Pending |
| 12 Tab insertion | Main/chat/Team left/right type menus, captured anchor and closure guards | Electron main/Team browser insertion passes; file/terminal guards source-reviewed | Pending |
| 13 Tab transfer | Browser move/copy among main/local chats/Team; clears old control; independent unloaded copies | Main→Team→main copy and renderer restart pass; projects deferred by operator; live terminals/protected documents unsupported with reasons | Pending |
| 14 Tab movement | Correct final drop-side calculation, complete context menus, persisted placement | Existing tab suite and new insertion/transfer/restart checks | Pending |
| 15 Terminal spacing | Bounded flex content below navigation | 13 Electron checks pass for input, view recovery, shell continuity, restart and persistent-session reattachment | Pending |
| 16 Agent terminals | Actual provider command output in read-only chat tab; no shell/process invented | Source/runtime check; interactive PTY attachment unavailable in current provider boundary | Pending |
| 17 Auth profiles | Integration profiles shows exact existing chat/provider MCP consumers and routes to supported status/sign-in | New isolated Azure/Jira/ADO credential mechanisms deferred as detailed below; operator clarification pending | Pending |

Full Node regression: 374 passing tests; static checks and website asset build pass at the
pre-freeze checkpoint. New Electron composer, tab interaction, standup-order and preference scripts pass. Website
conversation/pairing/approval tests pass against rebuilt assets. iPhone and iPad simulator activity
output and runtime tests pass. These are synthetic
results, not live account authentication, physical gesture or installed workflow certification.

## Authentication mechanism investigation

Azure supports selecting a CLI config directory with AZURE_CONFIG_DIR, but Microsoft's
[MSAL-based Azure CLI documentation](https://learn.microsoft.com/en-us/cli/azure/msal-based-azure-cli)
states that its macOS/Linux token cache is plaintext. New Proteus-owned profile creation/sign-in
is held against the requested protected-storage requirement; an operator clarification is pending.
Existing CLI credentials are neither copied nor changed.

The official [Azure DevOps MCP adapter](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md)
selects authentication mechanisms such as azcli independently. The official
[Atlassian MCP server](https://atlassian.github.io/atlassian-mcp-server/) has its own OAuth/API-token
mechanism. The existing provider MCP boundary exposes server status and supported login, not an
independently selectable protected credential profile or reliable account/tenant/expiry metadata
for every consumer. Therefore the UI selects the existing chat/provider/MCP configuration and
reports actual status there. Refresh is separate from sign-in. Independent OAuth profile creation,
CLI-to-MCP rebinding and terminal credential injection remain deferred until those boundaries can
be isolated. Configuration alone is never labeled authenticated. No live credentials were changed.

## Previous plan review

Read all 22 October 6 and 28 October 5 rows in `2026-10-07-acceptance-audit.md`.
Remaining acceptance includes fresh pairing, a live browser workflow, full website/chat-details
parity, physical cross-device history/tab convergence, HC allowance and remaining installed UI
checks, native physical accessibility/gesture cases, and broad tab movement. Existing receipts
are historical evidence and will not be reported as fresh verification of this release.

The baseline iPhone was on 2610.6.3; iPad was on 2610.6.4. The operator confirmed deployment to
both Macs, website, iPhone and iPad. Project destinations are explicitly deferred to the next round;
this does not defer chat or Team transfers.

## Deployment receipts

No new destination has been activated at this checkpoint. Website predeployment recovery capture, local integrity registration and isolated database restoration
are complete; captured DDL/native ledger and protected live data match. Detailed private
access/recovery records remain in the deployment workspace, not this repository.

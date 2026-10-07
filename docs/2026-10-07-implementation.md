# October 7 implementation and acceptance

The operator authorized implementation, testing and deployment of PR #18 and an audit of the
previous implementation plan. Starting source: `ce64d6a` (0.2.3); planning import: `9bcc899`.
Frozen source: `72d198e6ec0a6621578a66cddba2f2f213e46cea`. Release: 0.2.4, native 2610.7.1. Installation is separate from implementation and synthetic tests.

| BF-2026-10-07 | Source work | Verification | Installed |
| --- | --- | --- | --- |
| 01 Recovery | Per-host backoff, heartbeat, wake/network retry; manual/auth boundaries; preserved chat drafts | Encrypted peer regression including no mutation replay and 19 two-host UI groups pass | Build Mac; other applicable destinations pending |
| 02 Schedule layout | Separate source/action rows; wrapping long paths | Actual Electron at 1440/900/620 passes | Build Mac; other applicable destinations pending |
| 03 Model labels | Use metadata display names without redundant invocation IDs; no false warning when unselected | Catalog-driven composer regression passes | Build Mac; other applicable destinations pending |
| 04 Approved new chat | Wide composer, provider-first, local chat-only folders, configured remote starting folders, retained draft/title/attachments | Electron layout and local/remote destination-switch checks pass; arbitrary new remote roots require Mac configuration | Build Mac; other applicable destinations pending |
| 05 Approval scope | Explicit once/chat/workspace lifetime and restart language across clients; grant semantics unchanged | Permission unit regressions pass; installed review pending | Build Mac + website; native/HC as applicable pending |
| 06 Runtime | Persist active intervals; live desktop/web/native timers; exclude waits/idle; union overlaps; partial/offline labels and host clock offset | Interval/overlap/crash tests and iPhone/iPad simulator timing and expanded-output checks pass | Build Mac + website; native/HC as applicable pending |
| 07 Question history | Original wording/options/descriptions, stable IDs and replies, cancellation/interruption | Serialized-question, answer-association and disk-persistence regression passes | Build Mac; other applicable destinations pending |
| 08 Browser ownership | Chat presentation parent captured before awaits; agent tabs/popups inherit parent | Existing browser suite plus tab regression; installed live agent workflow pending | Build Mac; other applicable destinations pending |
| 09 Browser preference | Engine Room preference, OS default app name, device-local revision-protected persistence | Electron preference persistence and native default-browser lookup pass; installed exercise pending | Build Mac; other applicable destinations pending |
| 10 Pinch overview | Scope-aware main/chat/Team overview with non-browser cards, visible/keyboard alternatives and guarded renderer pinch | Team scope Electron regression passes; physical trackpad feel remains unverified | Build Mac; other applicable destinations pending |
| 11 Standup order | Desktop/web drag and keyboard ordering; existing/new tabs follow saved link order | Electron revision-checked saved order, load order and reuse-without-duplicates pass | Build Mac + website; native/HC as applicable pending |
| 12 Tab insertion | Main/chat/Team left/right type menus, captured anchor and closure guards | Electron main/Team browser insertion passes; file/terminal guards source-reviewed | Build Mac; other applicable destinations pending |
| 13 Tab transfer | Browser move/copy among main/local chats/Team; clears old control; independent unloaded copies | Main→Team→main copy and renderer restart pass; projects deferred by operator; live terminals/protected documents unsupported with reasons | Build Mac; other applicable destinations pending |
| 14 Tab movement | Correct final drop-side calculation, complete context menus, persisted placement | Existing tab suite and new insertion/transfer/restart checks | Build Mac; other applicable destinations pending |
| 15 Terminal spacing | Bounded flex content below navigation | 13 Electron checks pass for input, view recovery, shell continuity, restart and persistent-session reattachment | Build Mac; other applicable destinations pending |
| 16 Agent terminals | Actual provider command output in read-only chat tab; no shell/process invented | Source/runtime check; interactive PTY attachment unavailable in current provider boundary | Build Mac; other applicable destinations pending |
| 17 Auth profiles | Integration profiles shows exact existing chat/provider MCP consumers and routes to supported status/sign-in | New isolated Azure/Jira/ADO credential mechanisms remain unsupported/deferred as detailed below; operator clarification pending | Build Mac; other applicable destinations pending |

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

- **Build Mac installed and verified:** 0.2.4, build `72d198e6ec0a+src.e7e8dc39e050`.
  Exact hashes for all 145 packaged runtime files and the served renderer match. Existing signing
  identity/designated requirement and the vendor-signed Copilot binaries are preserved. The guarded
  idle update retained 18 ordered tabs, selected children, existing browsing history, six runs, six
  schedules, four pairings and grants, all protected files, account identity, Life readiness and
  the online relay. The actual installed Home and provider-first composer were inspected; no model
  turn was started for that check. Provider metadata is available for all three providers.
- **Website activated and verified:** release `20261007T230247Z`, source build `72d198e6ec0a`.
  The code-only activation verified 9,212 files, preserved the runtime environment and database
  migration set, and matched nutrition before/after. All 14 public/authentication-boundary endpoint
  checks pass. The live login screen renders. Signed-in workflow acceptance is represented by the
  isolated two-host Laravel/browser regression, not a new production login. Pre-release recovery
  was restored into an isolated database; both pre- and post-release recovery sets were downloaded,
  checksum-verified and registered, preserving all older recovery points. Private access and
  recovery receipts remain in the deployment workspace.
- **iPhone and iPad built; installation blocked by device locks:** signed 0.2.4 (2610.7.1), same
  certificate/team/profile/entitlements as the existing app; both device identifiers remain in the
  valid profile. Both are paired and reachable over Wi-Fi. Final preflights stopped at the lock
  check before backup, process termination or installation. The operator has been asked to unlock
  them. iPhone and iPad simulator timing and expandable-output tests pass; this does not certify
  physical-device installation or gestures.
- **Work Mac pending:** tested source is published on `codex/oct-7-implementation`. The connected HC
  chat is available, but sending it deployment instructions requires explicit user authorization;
  that question is pending. No HC installation or newly verified allowance is claimed here.

The source runtime is frozen at the commit above. Later documentation-only commits record receipts
without changing shipped inputs. Projects are deferred by the operator. New protected integration
profiles, interactive provider PTYs, physical pinch feel, a live agent-browser workflow and the
remaining prior-plan live acceptance gates are not claimed complete.

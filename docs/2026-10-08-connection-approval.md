# October 8 connection, browser refresh and approval work

This is the earlier checkpoint. The later build/deploy authorization, native validation and
additional implementations supersede its hold/unimplemented statements; see
[the current release ledger](2026-10-08-account-chat-release.md).

The operator requested a fix for a persistent disconnected-peer notice, added browser flicker,
and included the current planned-updates backlog. This record covers new outstanding items
BF-2026-10-08-01/02 and BF-2026-10-07-42. Historical BF-18–28 already have source/validation
receipts in the 0.2.5 ledger; explicit deferrals remain in force.

## Implemented

- Offline peer requests initiate background recovery without retaining/replaying the command.
  Polling respects backoff; explicit disconnect, authentication blocks and revocation retain their
  boundaries. Known background tab-sync connection failures no longer generate global notices.
- Notices have a visible Dismiss button, keyboard dismissal, finite expiry, repeat suppression and
  no Electron IPC wrapper. Remote refresh failures expose the actual error and a working Retry
  action; a late failed refresh cannot overwrite a newer view.
- Native browser refresh compares actual bounds, visibility and throttling before calling the
  setters. Unchanged polling preserves the page’s identity, focus and draft; real resize and
  visibility/automation transitions still apply.
- Pending permission prompts offer chat-only auto-approval on desktop, web and in native source.
  This invokes the existing chat override, preserves workspace settings, and rechecks the request.
  An exact pending-request guard joins the existing context/revision checks. The new remote
  capability prevents older hosts from silently ignoring that guard. Required approvals remain
  pending with their reason and ordinary Approve once/Deny controls; questions are untouched.

## Verification

All fixtures use disposable application data and synthetic providers/pages. No real provider turn
or permission grant was used for these tests.

- `npm test`: 386 passed. Includes demand recovery without mutation replay, polling/backoff,
  explicit disconnect/authentication blocks, stale request rejection and existing permission
  isolation, revocation, restart and context-change tests.
- `npm run check` and `git diff --check`: passed.
- `test/connection-notices-ui.mjs`: isolated Electron background disconnect polling, expiry under
  repeated errors, mouse/keyboard dismissal, duplicate suppression and clean IPC wording passed.
- `test/pending-approval-ui.mjs`: local prompt action rechecks a synthetic command, preserves the
  draft and leaves a subsequent mandatory approval pending with a reason and normal controls.
- `test/postrelease-browser-ui.mjs`: twenty identical refreshes perform zero native bounds,
  visibility or throttling writes; draft/focus/page identity and real resize pass. Existing
  same-tab resumption, unload/reload, access isolation and automation throttling also pass.
- `test/desktop-peers-ui.mjs`: nineteen groups pass, including guarded remote prompt approval,
  unchanged workspace permission revision, a file request still requiring explicit approval,
  remote drafts, disconnect layout, restart and revocation. Its older pending-question fixture
  was corrected to explicitly create chats under the now-separated Chats/Scheduled Tasks filter.
- Website Vite build and `test/web-remote-ui.mjs`: passed, including pending chat-only approval
  through the encrypted host API while preserving a file request’s approval boundary.
- Native source and a focused UI regression are added. Test execution stopped before build at
  Xcode’s unaccepted-license error. No simulator or physical-device success is claimed.

## Remaining

The operator subsequently placed deployment on hold and requested queue-only intake for
BF-2026-10-08-03 (needed-input form remains after Enter sends an answer). That item is not
implemented or covered by the verification above; see `planned-updates.md`. BF-2026-10-08-04
subsequently records an account-health and reusable-context proposal in `mcp-auth.md`. Code/SDK
inspection explains the separate historical/current MCP status sources; no live account access,
silent renewal or multi-identity isolation was verified. The new design is documentation only.

Nothing from this run is packaged, installed or deployed. The installed version remains its prior
release. Native verification requires operator review/acceptance of the Xcode license and rerunning
`testPendingChatOnlyApproval`. The reported workplace Jira page has not been observed with this
change, so removing redundant native display updates is not proof that its flicker is resolved.
Live reconnect and installed notice dismissal also remain release acceptance checks. The exact
workplace URL remains in the originating chat, outside Git.

# October 7 follow-up — 0.2.5

Implementation/build/install authorized by the operator. This is the live ledger for BF-18–28.

| Area | Implemented source | Verification | Installation |
| --- | --- | --- | --- |
| Message reuse | User message Edit and resend restores text to draft; existing draft replacement prompts; available same-session files restored; unavailable files require reattachment | Focused isolated message-reuse/paging and overview checks pass | Build Mac 0.2.5; HC pending |
| Browser discovery/resumption | Named-tab guidance; turn-end connection release; chat-scoped resumption association; revocation clears association | Isolated Electron same-ID continuation and unload/reload pass; unrelated-chat denial and revocation pass | Build Mac 0.2.5; HC pending |
| Composer/attachments | Compact bottom actions; attachment strip above controls; routine catalog copy hidden | Three-width desktop layout and provider/destination switch checks pass; two-file attachment geometry check passes | Build Mac 0.2.5; HC pending |
| Disk failures | Atomic temp cleanup and caught scheduler diagnostic persistence failure | ENOSPC open/write/fsync/rename and handler recovery tests pass | Build Mac 0.2.5; HC pending |
| Tab navigation/overview | Close separators, final chat-child border, selected overview card and reveal | Focused isolated message-reuse/paging and overview checks pass | Build Mac 0.2.5; HC pending |
| Remote view | Notice outside chat grid; retain unchanged controls; no repeated model-loading footer | Refresh identity/draft and disconnect-column checks pass; host rename correction and full 19-group remote suite pass | Build Mac 0.2.5; HC pending |
| History performance | Summary polling; cursor event patches; on-demand pages; four retained renderer/host histories, active host histories pinned | Cursor and summary tests pass; 378-test full regression passes | Build Mac 0.2.5; HC pending |
| Browser throttling | Inactive pages throttled; visible/automation/audio exemptions | Actual visible/hidden flags pass; automation exemption implemented; same-tab snapshots verified | Build Mac 0.2.5; HC pending |

Regression: 378 Node tests pass after the completed-history cache addition. New focused tests passed for atomic failures, deltas and summaries. All UI checks use
isolated synthetic data and mock Keychain storage. No installed HC reproduction or operational
workflow is claimed by synthetic tests. Raw screenshots/remote chat contents and installation
receipts stay outside this repository.

Restart restores browser descriptors without silently restoring agent grants; enable Agent access
on a restored private tab to resume automation. During the same host lifetime, continuations and
unload/reload reuse the existing authorized tab ID. Browser throttling is not unloading.

## Release receipts

Source commit `f129d55cac4d6b5995401f089c5676bd7c715010`, build
`f129d55cac4d+src.1d66b7243d3d`. Signed desktop package checks pass, including vendor
binary signatures and all 147 runtime input hashes.

- Build Mac: installed 0.2.5 with the existing signing identity. Idle checks, graceful shutdown,
  full cold rollback backup, protected settings/run/schedule bytes, four pairings, grants,
  22 ordered tabs, selected children, URLs and navigation history verified. Relay online.
  Strict initial metadata comparison stopped on two refreshed browser titles; a separate
  verification confirmed these were the only differences. Installed chat and tab separators
  visually inspected. No provider turn was sent.
- Work Mac: signed app-only delta delivered through the existing private repository and independently
  verified on HC against its exact 0.2.4 baseline. All 147 runtime hashes and original signer/vendor
  signatures passed there. Installation is pending direct confirmation in the HC chat because it
  could not access the originating chat to independently verify the operator approval. No HC restart
  or app-data mutation has occurred.
- iPhone/iPad: signed 0.2.5 (2610.7.2) installed and launched on both physical devices.
  Exact source/bundle hashes, original signer/team/profile/entitlements, six data files, preferences,
  both paired destinations and selected destination verified. Running processes independently
  confirmed after launch. Native source behavior is unchanged in this desktop-focused release.
- Website: release `20261008T003911Z` activated after approved in-app administration access,
  a verified off-server recovery copy and isolated database restore. All 9,212 deployed hashes
  matched; runtime configuration, schema and nutrition fingerprints preserved. All 14 HTTPS,
  redirect and unauthenticated access-boundary probes passed. Existing backups retained; automatic
  approval review blocked destructive retention rotation, so registration used no rotation.

## Remaining live observations

Installed UI inspection still showed a disconnected-peer toast during local navigation, and a
browser history-restoration timeout warning despite the page loading. Keep both open for live
reproduction; the synthetic remote-layout checks do not certify either resolved. HC-side live
acceptance of the originally reported flashing/disconnect behavior remains pending its update.
Private receipts, backups, device identities and screenshots remain outside the repository.

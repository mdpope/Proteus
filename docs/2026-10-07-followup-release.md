# October 7 follow-up — 0.2.5

Implementation/build/install authorized by the operator. This is the live ledger for BF-18–28.

| Area | Implemented source | Verification | Installation |
| --- | --- | --- | --- |
| Message reuse | User message Edit and resend restores text to draft; existing draft replacement prompts; available same-session files restored; unavailable files require reattachment | Focused isolated message-reuse/paging and overview checks pass | Pending |
| Browser discovery/resumption | Named-tab guidance; turn-end connection release; chat-scoped resumption association; revocation clears association | Isolated Electron same-ID continuation and unload/reload pass; unrelated-chat denial and revocation pass | Pending |
| Composer/attachments | Compact bottom actions; attachment strip above controls; routine catalog copy hidden | Three-width desktop layout and provider/destination switch checks pass; two-file attachment geometry check passes | Pending |
| Disk failures | Atomic temp cleanup and caught scheduler diagnostic persistence failure | ENOSPC open/write/fsync/rename and handler recovery tests pass | Pending |
| Tab navigation/overview | Close separators, final chat-child border, selected overview card and reveal | Focused isolated message-reuse/paging and overview checks pass | Pending |
| Remote view | Notice outside chat grid; retain unchanged controls; no repeated model-loading footer | Refresh identity/draft and disconnect-column checks pass; host rename correction and full 19-group remote suite pass | Pending |
| History performance | Summary polling; cursor event patches; on-demand pages; four retained renderer/host histories, active host histories pinned | Cursor and summary tests pass; 378-test full regression passes | Pending |
| Browser throttling | Inactive pages throttled; visible/automation/audio exemptions | Actual visible/hidden flags pass; automation exemption implemented; same-tab snapshots verified | Pending |

Regression: 378 Node tests pass after the completed-history cache addition. New focused tests passed for atomic failures, deltas and summaries. All UI checks use
isolated synthetic data and mock Keychain storage. No installed HC reproduction or operational
workflow is claimed by synthetic tests. Raw screenshots/remote chat contents and installation
receipts stay outside this repository.

Restart restores browser descriptors without silently restoring agent grants; enable Agent access
on a restored private tab to resume automation. During the same host lifetime, continuations and
unload/reload reuse the existing authorized tab ID. Browser throttling is not unloading.

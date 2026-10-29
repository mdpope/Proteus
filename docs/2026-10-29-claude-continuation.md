# Execution safeguards and Claude continuation — October 29

## Findings

The installed 0.2.33 owner imposes a 30-minute active-execution limit on Claude and Copilot.
Its separate no-observable-progress watchdog also interrupts at 30 minutes. These are host
limits, not provider allowances. The allowance-reset preference does not cover them. Before
this correction, automatic active-time recovery and its controls only supported Copilot;
Claude reported the timeout as a generic failure.

A later incident had a different cause. Claude started a native background command and two
Monitor tasks, then ended its immediate response while saying work would continue. Proteus
accepted the result and closed the native process. At the next resume the native transcript
reported all three tasks orphaned/stopped. That notification produced a successful result
with zero input/output tokens. Proteus marked the follow-up completed, although the native
transcript had not accepted its user input. A second follow-up worked after the notification
was drained. Private event/transcript metadata supports this ordering; no provider credentials,
task IDs, prompts, paths or raw session records are copied here.

## Changes

- One shared two-hour safeguard constant replaces both old 30-minute thresholds. A five-minute
  liveness warning remains informational. Codex keeps its existing event-driven turn lifetime;
  no new total-turn deadline is added to it. Short transport, authentication and metadata
  request timeouts remain separate. Human input waits do not count, including when an approval
  is resolved through a permission recheck.
- Claude and Copilot emit a typed execution-limit failure. Recovery recognizes the exact older
  Claude host-timeout text without broadening to arbitrary tool/connection errors. Both expose
  explicit per-chat automatic recovery, bounded to three consecutive timeouts, with fresh
  preference revisions. The same saved session and queued messages remain. Successful turns
  reset the count even when the engine immediately queues a follow-up.
- Recovery waits for actual provider cleanup and slot release. It rechecks session, captured
  configuration/permission revision, preference, Stop, archive, questions and update state
  before dispatch. It does not replay external actions or restart a failed cleanup. Historical
  failed chats are not silently rearmed by installing this change.
- The initial input now has a UUID. Only its exact native replay acknowledges receipt. A
  successful result emitted for startup/orphan work cannot close the process before that
  acknowledgment. Input is written once; uncertain delivery is never automatically resent.
- A provider-local lifecycle tracker retains native background task handles across intermediate
  results. Structured task lifecycle messages are preferred; exact known Bash/Monitor tool
  result handles and generated task notifications support older runtimes. Terminal task state
  wins over late tool results. Explicit user/steered inputs and unrelated tools cannot spoof
  generated completion. Background work remains visible as running tool activity. The adapter
  awaits terminal tasks and the provider's subsequent final result, with Stop and the safeguard
  still available. Explicit interrupt-steering retains its separate acknowledgment boundary.
- Remote owners advertise active-time continuation providers. Updated clients do not offer
  Claude automatic recovery against an older owner that lacks that capability.

## Validation and deployment

Mock-clock tests verify execution past 119 minutes and cutoff at 120, with long human waits
excluded. Engine/adapter tests verify typed failures, cleanup-before-resume, the original native
session, continuation before queued messages, bounded retries and revocation. Reproductions
inject startup successes before/after submission, unrelated replay UUIDs, pending Bash/Monitor
tasks, terminal notifications, cancellation and interrupt-steering. They verify one submitted
input, no premature process closure and no lost queued work. The focused desktop UI verifies the
Claude preference, its revocation, Continue and enable, session retention and an unsent draft.

The final combined Node suite passes: 1,260 passed, three skipped, zero failed (1,263 total).
`npm run check` passes. The isolated Electron recovery test passes all five checks above;
its provider is synthetic and does not spend a real provider turn. This is a source correction,
not a live installation or proof of a newly exercised paid Claude workflow. Current turns in
the installed app retain that build's behavior until a normal supervised update.

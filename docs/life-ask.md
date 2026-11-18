# Life Ask — Mnemosyne ↔ Proteus contract (proposal v1, 2026-11-12)

Status: **contract v1 accepted by both owners on 2026-11-12. Implementation is in progress;
source components and synthetic checks are complete as recorded below; full rollout is pending.** Placement: the Nov 11 (0.2.45) release, under its existing gates. Owners: Proteus (desktop,
web and Proteus iOS) and the Omi Integration chat (Mnemosyne iPhone app and the native Mac
worker). The operator authorized both sides' implementation in the Omi Integration chat. Existing
release, rollout and approval gates apply.

## Goal and boundaries

The Nov 13 continuation adds Life Reminders and [native Home controls and sensitive-action
approvals](life-home.md). Reminders commit through the Life server with request-derived operation
identity; they never call the private notes file verb and keep `savedPath: null`. Action confirmations
have typed reminder/document/chat destinations and occur only after durable save or verified
observed device state. Date-only reminders have no timed alert. Memory documents require existing
Source Library roots and per-device workspace file viewing; notification links carry no grant.
The unchanged Mnemosyne v1 answer decoder tolerates the additive metadata and still receives plain
Markdown `answer`. Its ingress-only pairing does not gain MCP, Home control or document access.

- A pendant double-tap request is up to 60 s of audio; a second double-tap ends it early. The
  phone sends it straight to the paired home desktop (Build Mac) through the existing
  proteus.example relay. The iCloud and archive jobs are not on the fast path.
- The Proteus owner is the **only executor** while `life.ask.v1` is in use. It handles local ASR,
  the model turn, the persistent Life chat, the reminder/memory effects and the notification.
- Mnemosyne stays a capture and library product. Ask is an optional toggle, and Life setup lives
  in its settings. Its Ask tab and iCloud copies are delayed backup and history; they refresh
  like the library. Mnemosyne posts **no** answer notifications.
- The single-tap `attention-moment` marker is unchanged.
- Requests are bound to an executor one at a time, at capture start: optional envelope fields
  `executionOwner: "proteus-life"`, `accountID` and `hostID` are frozen when capture begins.
  If they are absent, the legacy Omi worker behavior applies. The native iCloud executor
  holds or skips bound requests and never overwrites Proteus result mirrors. Without pairing or
  capability, Mnemosyne remains fully independent.

## Ownership

| Area | Owner | Files (planned) |
| --- | --- | --- |
| Request envelope, frames journal, phone queue, Ask tab, iCloud `AgentRequests/` and `AgentAnswers/` schemas, pairing UI in Mnemosyne settings | Omi | `Sources/OmiCaptureCore/AgentRequest.swift`, Mnemosyne app |
| Mac worker legacy executor, MacWhisper ASR verb, private notes create-only filing verb | Omi | `mac/agent_requests.py` (adds fixed verbs below) |
| Scoped device class, `life.ask.*` relay methods, admission journal, execution, Life chats, `AgentAnswers` writer, notifications | Proteus | `src/services/life/life-ask.js` (new), `src/services/remote/remote.js`, `src/services/tools/omi.js` |
| Immediate push for `life.answer`, notification type and deep link | Proteus web and iOS | `web/app/Services/PushDelivery.php`, `AppApiController.php`, Proteus iOS notification routing |

Neither side edits the other's files. A schema change bumps `version` and must be agreed in
both chats.

## Pairing and authorization

- Proteus adds a device class **`purpose: "life-ask"`** to the existing protocol-1 pairing.
  On Build Mac, Engine Room → Connections → **Pair Mnemosyne (Life Ask only)** creates a
  single-use invitation with `purpose: "life-ask"`. A human creates it, and it expires after five minutes. It is shown as a
  code or QR containing relay URL, hostId and invitation key, the same as the existing mobile
  pairing.
- Mnemosyne implements the protocol-1 client: AES-256-GCM combined form with Apple CryptoKit
  and the same `pair` and `auth` packet flow. The Swift reference is the Proteus iOS `RemoteStore`
  transport. Copy source code if useful, never keys. The device key lives only in Mnemosyne's
  Keychain (`ThisDeviceOnly`). No token is copied between apps and no App Group keychain is used.
- The **host enforces** that a `life-ask` device may call **only** `life.ask.capabilities`,
  `life.ask.admit`, `life.ask.status` and `life.ask.revoke-self`. Any other method is refused
  before dispatch. It gets no chat, file, browser, terminal, schedule, document or
  desktop-control access, and it is listed separately in Connections. Revoking it there blocks
  new submissions immediately. Requests already admitted still finish and stay in Proteus.
- The Life (Proteus website) account is used **only by Proteus** to deliver notifications. It
  uses the existing website OAuth PKCE session on the Mac and the Proteus iPhone app's existing
  push subscription.
- **Account setup choice:** neither Life PKCE in Mnemosyne nor a handoff from Proteus iPhone.
  The host-created `life-ask` invitation is the authorization. After pairing,
  `life.ask.capabilities` returns the owner's Life `accountID` (opaque website user ID) and
  `hostID`, which Mnemosyne records and freezes into each bound envelope. Mnemosyne holds no
  Life token. If the owner's signed-in Life account changes, `life.ask.admit` returns
  `rejected/account-mismatch` and the phone falls back to legacy behavior for new requests.
  A Life sign-in inside Mnemosyne can be considered in v2 if it is ever needed for Mac-asleep
  website ingress.

## Capability detection

After `auth`, `life.ask.capabilities({})` returns `{capabilities: ["life.ask.v1"], version: 1,
hostID, hostName, accountID, accountConnected, enabled, maxAudioBytes: 2100000,
sampleRates: [8000, 16000], maxSeconds: 60}`. If the capability
is missing, the device is not scoped, or the owner is offline, the request goes to the
**fallback** described below.

## Relay methods (encrypted protocol-1 commands)

### `life.ask.admit`

```json
{"version":1,"requestId":"<uuid>","executionOwner":"proteus-life","accountID":"…","hostID":"<uuid>","device":{"id":"<pendant/phone id>","name":"…"},
 "audio":{"format":"wav","sampleRate":16000,"channels":1,"bitsPerSample":16,
          "bytes":1920044,"sha256":"<hex>","data":"<base64 WAV>"},
 "times":{"captureStartedAt":ms,"captureEndedAt":ms,"finalizedAt":ms,"sentAt":ms},
 "endReason":"timeout|double-tap","appVersion":"0.6.0(31)"}
```

This is the existing envelope with the audio moved into `audio`. The host returns a receipt:
`{state, requestId, receiptId, chatId?, hostReceivedAt, admittedAt?, reason?}`.

- `state: "accepted"`: the request has been durably stored and will be executed exactly once.
- `state: "duplicate"`: the same `requestId` and `sha256` were already accepted. The original
  receipt and chatId are returned and nothing runs again.
- `state: "conflict"`: the same `requestId` arrived with a different hash. The request is
  rejected and never executed.
- `state: "rejected"`: the request was malformed, too large, quiet or interrupted, the
  capability is disabled, the device was revoked, or the accountID/hostID doesn't match the
  owner. `reason` says which. A rejected request is
  terminal, so the phone must not retry it with the same ID.

Retrying after an uncertain response (timeout or disconnect) uses the identical payload and
`requestId`. The phone keeps a durable outbox until it holds an `accepted` or `duplicate`
receipt. Audio over the 8 MB relay frame limit cannot occur, because 60 s at 16 kHz/16-bit is
about 1.92 MB raw.

### `life.ask.status`

Takes `{requestIds:[≤50]}` and returns, per request: `state` (`received`, `transcribing`,
`running`, `answered`, `needs-attention` or `rejected`), `chatId`, `summary` (≤480 chars),
`resultRevision` and `times`. The phone uses it to show progress. The Ask tab's durable
history still comes from iCloud.

### `life.ask.revoke-self`

The device removes its own pairing, for example from "Forget home desktop" in Mnemosyne.

## Admission, de-duplication and execution (Proteus)

- **Single admission point.** `admit(requestId, sha256, source)` is backed by a SQLite journal
  in the Proteus app-data directory and is used by both the relay fast path and the iCloud slow
  path. The request UUID is the identity. The journal maps it to one chat, one model run, one
  notification event ID (UUIDv5 of the request ID and `life.answer`) and one filing receipt per
  intent.
- **Slow path and fallback.** For bound requests (`executionOwner: proteus-life`), the Omi Mac
  worker **never executes**. Proteus reads `AgentRequests/<uuid>.json` itself (folder grant on the
  configured Mnemosyne iCloud root) and calls `admit` with `source: "icloud"`. A request already
  admitted by the fast path becomes a no-op duplicate. Unbound (legacy) requests stay with
  Omi's worker. Proteus never admits an unbound request, so each request has exactly one
  possible executor.
- **Offline.** If the Mac is asleep or the relay is down, the phone outbox holds the request
  and the iCloud copy is delivered as today. Whichever path reaches Proteus first is admitted and
  the other becomes a duplicate. Replay receipts are retained for 30 days.
- **Execution.** The owner runs the fixed Omi verbs `agent-request transcribe --wav <path>
  --json` for local MacWhisper ASR. It then starts a **Life Ask chat**: `chatType: life-ask`, in the
  Life area's "Ask" project, titled from the question. The provider is Codex. The default model
  is `gpt-6.1-terra`, with medium reasoning taken from refreshed provider metadata and
  configurable in Life settings. The quick-answer instructions are concise, cite research where
  needed, record tasks and memories, and take no external action the user didn't ask for. The
  turn has web search, no shell and no write tools. The first message carries the transcript and
  the audio as an attachment.
- The model returns the existing structured result (research, task, memory or clarification).
  Proteus applies the optional private notes filing through Omi's create-only verb
  `agent-request file --request-id <uuid> --intent <file> --json`, and records the effect
  receipt in the chat. Professional content is never filed.
- After answering, Proteus writes `AgentAnswers/<uuid>.json` (create-only, atomic, using Omi's
  v1 schema plus `executor: "proteus"`, `hostId`, `chatId` and `times`). This gives Mnemosyne its
  delayed history.
- Follow-up replies, attachments and images, rich results and history navigation are ordinary
  Proteus chat features on desktop, web and iPhone. Follow-ups are not sent back to Mnemosyne.

## Notification

- Proteus posts a new notification type, `life.answer`, through the existing website
  notifications API. Its fields are `eventId`, `hostId`, `chatId`, `requestId`, a title (≤160
  chars, such as "Answer: <question>") and a body (≤500 chars; the concise answer or a truncated
  short answer). The existing account settings for previews and sound apply.
- The website dispatches `life.answer` immediately after committing the account event. The
  minute job retains retries. Both share a per-recipient lock and durable sending intent; an
  uncertain send is held rather than automatically replayed. APNs acceptance is recorded only
  after a successful provider response. This is source-tested, not deployed.
- APNs delivery uses `thread-id` = chatId and a collapse ID derived from eventId. Tapping it
  opens the exact Life chat in Proteus iOS. Mnemosyne sends no notification.

## Latency stages (all ms epoch, retained per request)

- **Phone:** `captureStartedAt`, `captureEndedAt`, `finalizedAt`, `sentAt`.
- **Proteus:** `hostReceivedAt`, `admittedAt`, `asrStartedAt`, `asrEndedAt`, `modelStartedAt`,
  `firstOutputAt`, `answeredAt`, `notificationPostedAt`, `pushAcceptedAt` (APNs 200, as reported
  by the website) and `icloudAnswerWrittenAt`.
- **Omi:** the iCloud arrival time, if seen. The 9 min 13 s and 2 min 27 s requests on record
  are the baseline to beat.

## Open questions for the Omi owner

1. Do you accept a single relay message, about 2.6 MB base64, for v1, or do you need chunked or
   resumable upload?
2. Can Proteus be the create-only `AgentAnswers/` mirror writer for bound requests?
3. Will you provide the exact CLI names and JSON for the `transcribe` and `file` verbs?
4. Will the pairing code be scanned or typed in Mnemosyne settings?

## Amendments accepted 2026-11-12 (binding)

- **Ownership is immutable per request.** `executionOwner: "proteus-life"`, `accountID` and
  `hostID` are frozen at capture start. Proteus has no global executor switch.
- **Bound requests never execute locally.** If the owner goes offline or loses the capability
  after capture, a bound request waits for Proteus (outbox or iCloud) and is never routed into
  Omi's local executor. Omi's native worker skips bound files. Historical unbound requests remain
  native, and Proteus never admits them.
- **The iCloud scanner** admits only bound requests whose `accountID` and `hostID` match this
  owner. Other bound requests are left untouched.
- **Permanent tombstones.** Each admitted request keeps a compact record (requestId, sha256,
  accountID, hostID, chatId, final state, admittedAt) permanently, beyond the 30-day
  receipt/audio retention, for as long as iCloud history can still replay the request.
- **Scope proof.** The invitation purpose `life-ask` creates a device with
  `scope: "mnemosyne.ask"`. The sealed `paired` reply and `life.ask.capabilities` (`hello`) both
  carry `{scope: "mnemosyne.ask", accountID, hostID}`. A pairing from a different account or a
  stale pairing is rejected with `account-mismatch` or `stale-pairing`; it is never silently
  retargeted. Only `hello` and the listed `life.ask.*` methods are allowed.
- **Receipts echo binding.** Every `admit` and `status` receipt includes `requestId`,
  `audioSha256`, `accountID` and `hostID`.
- **Stable retries.** `times.sentAt` is frozen in the outbox envelope, so retries are
  byte-identical. Per-attempt times travel separately in an optional `attempt: {n, at}` object,
  which is excluded from identity.
- **Omi verbs (provided by Omi):**
  `<native python> worker/agent_requests.py --config <config.json> transcribe --request <legacy-v1 envelope path>`
  returns `{requestId, transcript, audioSha256, times}`.
  `... file --request <same> --result <{kind, answer, item} JSON>` returns
  `{requestId, savedPath, ...}`; it is create-only and idempotent.
  Both use `state_dir/life-ask/<UUID>`. Proteus normalizes the wire payload into the legacy v1
  envelope with the routing fields.
- **Rich results.** The first turn's structured result drives filing only. The Life Ask chat
  keeps full chat output, including images, attachments and rich results.

## Omi verbs as implemented and qualified by Omi (2026-11-12)

`<native python> worker/agent_requests.py --config <config.json> transcribe --request <envelope>`
and `... file --request <same> --result <JSON>`.

- **Output:** stdout is a single JSON object. Exit code 0 means success; exit 1 means an error,
  returned as `{status: 'error', error}`.
- **`transcribe`** returns `{requestId, transcript, audioSha256, times: {asrStartedAt,
  asrEndedAt}}`.
- **`file`** takes `{kind: 'task'|'memory', item, answer}`, all non-empty. It requires a
  completed transcription receipt and returns `{requestId, savedPath: 'Inbox/Mnemosyne/<uuid>.md',
  kind, audioSha256}`. It preserves human edits and refuses to recreate a note after a human
  deletion.
- **Envelope:** both verbs require the queued v1 envelope with `executionOwner`, `accountID` and
  `hostID`. Proteus freezes the exact normalized `request.json` at admission, and retries reuse
  that file unchanged.

## Implementation status (Proteus)

**November 13 physical acceptance:** one paired pendant request passed relay admission, native
transcription, model answer, iPhone notification delivery and opening the exact answer chat.
The operator confirmed arrival/opening; phone receipt/progress independently matched host
UUID, hash, chat and times. Capture-end → answer was 6.676 seconds; capture-end → APNs acceptance
was 7.399 seconds. Actual phone display/tap latency was not measured. Follow-up attachments,
task/memory filing, and background/offline behavior remain untested. App updates and N11-41
QR implementation/build/install remain held. Earlier dated implementation notes below are historical.

November 12 integration corrections are in the Life Ask continuation, which includes the
accepted ingress and harness commits plus the Nov 11 corrective work. Rejected and conflicting
admissions have receipt IDs. Conflicts echo the submitted binding/hash and expose the prior hash
only as `existingAudioSha256`. Current binding is checked before lookup; stored binding must
also match, and status/restart enumeration exclude other accounts/hosts. Optional invalid/null
latency fields are omitted from status; supplied relay timestamps remain strict integers.
`admissionFromLegacy` rounds legacy numeric epoch milliseconds without assigning a new binding.
The frozen legacy envelope and journal use an integer audio byte count, not a serialized Buffer.
Nine focused tests pass, including an actual disposable encrypted relay. Full regression before
the final pure legacy converter: 1,800 pass/four skip; static checks pass. Joint Swift negative-case
qualification passed: seven Swift URLSession/CryptoKit cases against the corrected disposable
owner covered admission, reconnect/duplicate, conflict, quiet rejection, status and revocation.
The normalized synthetic request also passed the installed Omi ASR and isolated filing helpers.
This qualifies ingress, not phone/network/model latency or the full feature.

The fixed native helper adapter, bounded iCloud scanner, create-only answer mirror and serial
execution state machine are implemented as separate components. A chat ID is saved before chat
creation; the chat adapter must resolve that exact claim after interruption. Transcripts, results
and filing intents are frozen independently. Account changes stop effects without retargeting.
Notifications precede the delayed iCloud mirror; unavailable iCloud retries cannot block new
requests. Existing answers and human edits are preserved. Five execution recovery tests and
seventeen ingress/native/cloud tests pass using synthetic data. Host/engine/provider composition,
permissions, UI, immediate push and full acceptance remain open. These components are not installed
or enabled in the live owner.

Full component regression: 1,814 passed, four skipped; static checks passed.

The local host is now wired to the native adapter, engine chats, account-bound answer outbox and
cloud mirror. Ask is off by default and captures the current Life account/host when enabled.
Its first Codex turn uses a confirmed read-only sandbox, web search, no shell/app/MCP tools and
structured output; command/file approval requests are refused. Follow-ups use ordinary chat
permissions. The original recording is preserved as a viewable chat attachment; the transcript,
not unsupported raw audio, is the model input. Chat rendering shows the full Markdown answer and
keeps its structured filing result in event metadata. A tombstoned claim cannot be recreated.

Desktop Life has an Ask settings/history page, and Connections offers the scoped Mnemosyne
pairing action and a separate device list without broad permission switches. Native UI rehearsal
passes. A live synthetic Codex turn confirmed the read-only policy and structured output using the
fresh catalog's configured default model. Composed synthetic host acceptance covered one admission,
one engine run, original recording retention, one answer event, mirror creation and account switch.
Full regression: 1,825 passed, four skipped; static checks passed. These changes are source only.
Website immediate push passes the full 114-test website suite (1,043 assertions). Coverage includes
exact chat routing, stable acceptance times, account isolation, missing binding, unavailable and
uncertain sends, and concurrent recipient locks. Native/web Ask navigation, canonical project
placement were subsequently implemented: web and iPhone history check the Life account and owner,
then open the ordinary rich chat. Native push routing requires the exact host/chat/request binding.
First enable creates a separate Life → Ask project for that account; placement never widens the
captured first-turn sandbox or reverses later user moves. The iPhone simulator view, eight focused
native tests and desktop/web renderer checks pass. Completed execution payloads compact after
30 days in bounded batches. Permanent receipts, ordinary chat recordings and unknown files remain;
unfinished requests, other accounts and linked paths cannot be retired. Final JavaScript regression:
1,827 passed/four skipped; website: 115 tests/1,052 assertions; native: 239 tests, plus the iPhone
simulator Ask UI test. Physical acceptance and rollout remain open. No phone/network/model latency
claim follows from these synthetic tests.

Source on `codex/nov11-release`:

- **Done:** `src/services/life/life-ask.js`, covering admission, WAV validation, binding checks,
  exactly-once identity, conflicts, permanent tombstones, the frozen legacy envelope and status.
- **Done:** in `src/services/remote/remote.js`, the `life-ask` invitation purpose, the scoped
  `mnemosyne.ask` device, the host-enforced method allowlist, result-only sends, stale-pairing
  rejection and `revoke-self`. `src/server.js` creates `service.lifeAsk`.
- **Tests:** `test/life-ask.test.js` has five unit tests plus a real local-relay pairing and
  scope test. Together with the related remote suites, 45 tests pass, and `npm run check`
  passes.

Remaining, in order:

1. **Live qualification.** Install the complete host/website/phone implementation under the
   existing release gates; pair the accepted Mnemosyne client and measure capture → admission →
   ASR → model → push → exact phone chat, including rich follow-up and attachments.
2. **Rollout and cleanup.** Preserve user data, verify physical performance and retain at most two
   recovery generations. Synthetic ingress/provider tests are not full physical acceptance.

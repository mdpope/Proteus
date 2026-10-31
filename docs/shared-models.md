# Shared local model providers

Proteus can share local llama.cpp and MTPLX inference with selected paired computers through the existing end-to-end encrypted relay. The relay server needs no deployment or new public endpoint. Both serving and consuming desktop applications need this provider-sharing build. Earlier versions can continue their existing remote-chat behavior but cannot add shared inference to a locally owned chat.

## Setup

On the serving desktop, open Engine Room > Providers > Share local models. Enable the local backend, select the paired computers that may use it, and save. The backend must use a loopback endpoint. Only llama.cpp and MTPLX may be exported; shared or externally hosted providers cannot be re-exported. Pairing and existing computer permissions remain unchanged; sharing does not enable resource, browser or document access.

On the consuming desktop, open Providers > Models from other computers > Find shared providers. Add a provider, then choose Shared models in New Chat. Each model label includes its serving computer. Removing a provider stops its active local requests. Disable sharing or remove a device on the serving computer to revoke inference access immediately. Discovery is authenticated and filters each catalog to that device's grants. No API key, certificate or backend URL needs copying between Proteus installations.

## Ownership and transport

The consuming computer owns the chat, selected context, history, local tools, permissions, tool effects and observed usage. It sends model input and receives streamed model output. Tool definitions and selected context leave the consuming computer as model input, just as with a remote model API. The serving computer calls its model HTTP endpoint directly; it never creates an agent chat or executes the supplied tools.

All inference traffic passes through the existing paired relay connection, encrypted end to end. Model weights remain on the serving computer. Direct LAN connections, peer-to-peer signaling, STUN/TURN and automatic network-path selection are intentionally outside this first implementation. Third-party OpenAI-compatible clients remain a separate, explicit HTTPS API setup.

The initial shared interface supports text and tools, including plain-text attachments within the bounded request size. Image delivery is not advertised. Native model metadata supplies loaded context and supported reasoning controls. Admission runs against the serving adapter's context accounting. No model-name table, cloud fallback or unadvertised reasoning level is introduced.

## Queue, Stop and recovery

The serving host permits one shared generation at a time per backend and a bounded total queue. Queued requests are visible in the consuming chat. Stop, loss of the paired connection, revocation and idle expiry cancel generation. A cancel that arrives before a delayed start leaves a tombstone, preventing a late generation after Stop.

Each start has a stable request identity recorded by the existing durable remote-command journal. Separate compact inference receipts preserve outcome metadata without prompts, tool schemas or model output. A serving-host restart marks unfinished receipts interrupted; no request is regenerated automatically. A lost acknowledgement is an uncertain outcome, not permission to resend. Repeated read-only output polls use cursors and retain unacknowledged chunks. Output buffering is bounded; a stalled consumer causes an explicit failure instead of silent token loss.

Sharing preferences use revision checks in shared-inference.json. Incoming model grants are separate from outgoing provider imports. Managed-computer mode blocks outgoing inference through the existing computer-access policy while preserving eligible incoming hosting. New sharing starts disabled, and newly paired devices receive no model grant automatically.

## Validation

Offline tests exercise the actual encrypted two-desktop relay and consumer-only file approval/execution, plus queueing, replay prevention, early Stop, pagination, revocation, restart interruption, bounded output and MTPLX control forwarding. The opt-in test/shared-inference-ui.mjs launches two disposable real desktop instances, configures sharing/imports through the visible interface, and completes actual Qwen inference through the encrypted relay. Its model host creates no chat. These fixtures do not establish installation or connectivity between the user's separate computers; rollout records distinguish those outcomes.

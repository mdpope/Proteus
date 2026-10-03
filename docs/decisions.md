# Design decisions

These decisions describe implemented behavior. Proposed work belongs in `planned-updates.md`.

- **Mac execution with remote clients.** Provider credentials, tools and browser sessions remain
  on the Mac. iOS sends authenticated encrypted commands through an opaque relay. This preserves
  access to local workspaces and avoids replicating execution environments on mobile devices.
- **Independent app and workflow repositories.** Proteus owns generic formats and UI. organization workflows and
  other operating systems own their schedules, workflow instructions and validators. Source-owned
  schedules are exported into the local store; opening the editor never executes repository code.
- **Plain JSON and revision checks.** Schedules remain AI/editor-friendly. Reads use the current
  file, writes validate and atomically replace it, and stale edits fail instead of overwriting
  changes. Run snapshots keep past conversations reproducible.
- **One host and serialized turns.** A process lock prevents competing runners for one data home;
  the engine avoids concurrent sessions and overlapping runs. Parallel execution is deferred
  until provider/client lifecycle and permission isolation can support it reliably.
- **Provider-owned capabilities.** Clients use normalized live metadata for models, effort and
  context tiers. No model-name-specific limit table exists. Unsupported saved settings remain
  visible and fail explicitly at execution. Missing metadata stays unknown; provider defaults
  are not inferred from another editor's UI. See `providers.md`.
- **Explicit context and authorization.** Source discovery is separate from selection and folder
  access. Managed sessions disable automatic Copilot instruction/config discovery and provide
  captured context. Favorites do not grant permissions or activate disabled MCPs. Permission modes
  and individual grants are distinct and can resolve waiting tools in a running chat.
- **Shared rich content, native shells.** Mac and iOS render Markdown from the same bundled code.
  Tool calls are separate expandable activities with status, progress, inputs and outputs. Internal
  reasoning is not displayed. Raw HTML/scripts in model output are not trusted.
- **Visible bounded browser automation.** Electron hosts shared website tabs; a per-tab Playwright
  bridge exposes only the broker's allowed operations. Remote sites cannot access app IPC.
  Bitwarden credential fill stays an explicit desktop action outside the agent tool boundary.
- **Local Mac packaging first.** The local .app uses the existing iOS artwork and a stable Proteus
  bundle identity. Local ad-hoc signing requires no Apple certificate and is not notarized
  distribution. Developer ID signing, notarization and update delivery remain separate work.

- **Native provider processes, common UI.** Codex uses an app-server adapter with explicit context;
  Copilot uses its SDK. Model metadata remains separate. Tool restrictions unsupported by another
  provider are refused rather than silently widened.
- **Queue versus steer.** A queued message is durable future work and runs only after success;
  steering targets one active native turn. Delivery acknowledgments are distinct from completion.
- **Mac-owned OAuth.** Connection recovery invokes the provider's OAuth client. Corporate sign-in
  opens on the Mac even when requested from iOS, keeping loopback callbacks and tokens on the host.

- **Message-scoped model choices.** The composer captures settings on submission. Queued messages
  retain independent choices, applied only when their turn starts. A steering request never mutates
  a running model. This avoids a late dropdown change altering already queued work, while preserving
  the native conversation and audit history. The source schedule remains unchanged.

- **Retain vendor signing identity.** The local Mac shell may be ad-hoc signed, but official Copilot
  binaries keep verified GitHub signatures so provider-owned Keychain ACLs recognize the caller.
  Only the two explicitly verified binaries skip re-signing; missing/invalid vendor signatures fail
  packaging. Credential resets or broader Keychain grants are not a packaging workaround.
- **Stable live controls.** Token/tool updates patch conversation content without rebuilding
  unrelated controls. Authentication status is polled only while its view is open, with bounded
  duration and visible feedback, rather than relying on a transient toast or manual refresh.

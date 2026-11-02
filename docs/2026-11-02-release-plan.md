# Nov 2 release plan

Status: request collection and handoff to a new chat. The operator moved the five live defects
below out of Nov 1 on November 1. Do not reopen Nov 1 or relabel its accepted packages. Reserve
the next application version through the normal release workflow when Nov 2 implementation starts.

## R1 — embedded browser sometimes uses only part of its available surface

The operator still observes incorrect browser sizing on the installed Nov 1 build. Switching away
and back repairs it temporarily; manually opening a new tab has not reliably reproduced it.
Nov 1's surface ResizeObserver and toolbar stabilization regressions passed, but did not establish
that this remaining live case was fixed. Preserve that distinction.

Capture the affected surface, parent bounds, selected native view, scale and layout/selection
revisions before switching tabs. Trace the writer that applies stale or incomplete bounds.
Exercise normal opens, restored tabs, project/window changes, extension popups and resizing on
Mac/Windows/Linux. Require a deterministic failing preceding-source reproduction and passing
exact-package verification without using a tab switch as the repair.

## R2 — Bitwarden authentication return and autofill

On the installed Nov 1 Mac build, Bitwarden unlocked but its native action popup remained at
**Loading vault**. Earlier synthetic extension authentication-to-fill tests passed; the real
extension workflow still failed. The operator previously needed to close/reopen the popup after
authentication to get passwords offered.

Trace popup/window/tab identity, focus, runtime messaging, authentication return and extension
lifetime against Chrome expectations. Preserve the existing profile and vault. Never read or
log passwords, PINs, tokens or vault contents. Verify real unlock-to-ready behavior and authorized
autofill on a controlled login form, with private live evidence outside source. Do not install a
different profile or weaken sharing/permission boundaries to make the fixture pass.

## R3 — desktop input broker cannot resolve an action that closes its target

An Escape action closed the extension popup. A fresh observation reported that exact window no
longer existed, but the broker kept its uncertain target and refused observations/input on other
windows. Stop released the control lease but intentionally retained uncertainty. This blocked
further native observation of R1 and R2.

Investigate `src/services/remote/desktop-control.js`: uncertain input state is cleared only after
a successful same-target observation. Add a supported, authoritative closed-window result that
can settle uncertainty while preserving host arbitration, process/window identity, permissions
and the requirement for a fresh exact-window observation before any subsequent input. Discovery
alone must not authorize input. Do not bypass the broker through another driver, shell capture,
new agent or direct input. Test target closure, PID/window reuse, denied observations, lost
responses, Stop and a legitimate new-window observation.

## R4 — machine-specific local model choices and understandable provider presentation

The physical iPad acceptance check failed. Its New chat provider list shows **MTPLX**, **llama**
and generic **Shared local models**, while the shown model pickers offer only **Choose model**.
The operator expects each entry to identify the machine that actually runs it, and wants the
presentation decisions worked out in Nov 2 rather than treating adapter-name parity as success.
Two operator screenshots establish the live presentation; keep their private URLs and device
details outside source. This is a reported failure, not a verified end-to-end local-model workflow.

Inventory actual owner-advertised inference endpoints, machines, models, capability/availability
metadata and the existing route identity. Decide how to group and label machine/model choices,
including adapters available on more than one machine, unavailable/offline machines, an empty
catalog and saved choices. Avoid a generic Shared bucket that obscures execution location or
duplicate routes that look like independent models. Preserve provider/model/host identities,
saved selections, defaults and permission boundaries. Document the chosen design before building
it; do not hardcode the screenshot's machines or a model/effort table. Verify selection and an
authorized real inference on the intended machine from desktop, web, iPad and iPhone.

## R5 — iPad New chat belongs in a tab

The operator's physical iPad screenshots show **New chat** as a centered modal over the existing
browser tab. Match the desktop's New chat page inside a new tab, retaining normal navigation,
workspace/project placement and execution-owner controls. Preserve unsent prompt, attachments,
provider/model choices and retry identity when switching tabs. Cancel/close must not start a
conversation or cancel unrelated work. Verify iPad and iPhone layouts as well as desktop/web
consistency; do not infer the physical layout fixed from a simulator screenshot alone.

## Handoff and acceptance

Start with `docs/handoff.md`, `docs/release-process.md` and the Nov 1 closeout. Private project
documents contain exact live tab/window IDs, artifact pins, user confirmations and recovery
receipts. Refresh current tool catalogs and identifiers before using them. A temporary browser
tab was left open at the operator's request to catch R1; inventory it rather than duplicating or
closing it as cleanup. No further work on these defects is required in the Nov 1 chat.

Build and validate locally without GitHub Actions. Preserve active chats, tabs/history/order,
drafts, credentials and verified recovery generations. Follow the designated per-platform build
and owner-managed update workflow, then complete publication, rollout, main integration and
eligible cleanup under the standing release authorization. Record implemented, synthetic-tested,
live-verified and deferred results separately.

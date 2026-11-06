# Nov 3 release plan

Requested by the operator on November 3 after Nov 2 closed (closeout main `5c36f1f`). Input queue:
[issues](2026-11-03-issues.md). Authorization covers implementation, tests and release packages for
every supported target. It does not authorize publication, deployment or device installation:
accepted artifacts are prepared and their readiness reported; separate `purpose:update` workflows
handle any later authorized installation.

## Excluded

**All Mnemosyne work.** The [Mnemosyne handoff](2026-11-03-mnemosyne-handoff.md) stays preserved for
a later request: no redesign, extraction, product-boundary change, prototype/UI change or service
migration ships in this release.

## Included scope and acceptance

| ID | Work | Acceptance |
| --- | --- | --- |
| N1 | iPhone/iPad performance: profile real input and rendering work and correct what the measurements identify. | Reproducible before/after measurements on a realistic synthetic workload. Live device feel is separate from source/simulator evidence. |
| N2 | Multiline composer grows with the message, to a bounded height, then scrolls internally, with keyboard avoidance and preserved drafts and reading position. | Narrow and wide layouts verify growth, cap, internal scrolling, send and draft preservation. |
| N3 | Residual native/web disconnect, sending and acknowledgement defects, preserving pairings and exact retry identities. | Deterministic regressions for each identified mechanism. Sustained live stability remains a separate observation. |
| N4 | Excess connection traffic, especially pushed state after all consumers updated. | Per-kind counters and a bounded regression prove what is no longer sent. Live rate is measured only after installation. |
| N5 | Windows Cua / Desktop Control first-run setup and supported verification, respecting real human-only setup and permissions. | Catalog exposes honest setup state and a supported path; driver discovery, UIA availability and a real window observation are required before claiming verification on a device. |
| N6 | Retained project tabs missing from the running renderer/native inventory after startup: root cause, restoration fault isolation, explicit recovery/errors and honest project counts. | Restart/recovery/multi-window/child-failure tests retain every descriptor, render intended visible tabs, keep hidden tabs hidden, keep Tabs view and counts in agreement, do not reopen owner-closed or moved tabs and do not duplicate identities. |
| N7 | Operator priority added during Nov 3: remote viewing and control performance, and browser tabs navigated on iOS that did not reflect properly in the desktop project (URL mismatch). | A regression reproduces the mismatch from a real iOS-shaped operation through the owner and desktop window, then proves convergence. Live device confirmation stays separate. |

## Evidence carried forward

The final Nov 2 post-rollout 113-second owner counter sample measured about 1.955 MB/s outbound and
118 B/s inbound: 108 state pushes (~197 MB), 12 sync replies (~21.9 MB), zero `context.get` replies,
and no new transport closes or congestion. It does not establish sustained UI stability or causal
improvement. General's tabs were not deleted in the Nov 2 incident: all 12 owner IDs, their order
and four hidden flags were retained, with 12 saved views, while the runtime browser inventory was
empty and the UI showed only the chat. The operator's View → Reload Window restored all 12.

## Work allocation

At the operator's request, Codex GPT-6.1-Sol (high) agents build iOS and web in isolated
branches; the coordinator owns desktop and owner code and reviews their work before integration.

## Boundaries

- Do not reinstall Nov 2 / iOS 2611.2.10, reset certificates, trust or pairings, or interrupt
  unrelated work. Verify the Mac is unlocked before Apple account or signing checks.
- Build each OS/architecture once on its designated builder at a validated exact source pin. GitHub
  Actions remain disabled. A build chat gets no installation authority.
- Frozen recovery originals are never opened with SQLite, even read-only or immutable. Use
  `scripts/recovery-sqlite-read-copy.mjs`, confirm original hashes and stats are unchanged, query
  only the copy and remove it. Build-only work does not justify live-profile backups.
- Preserve the active-use hold on the detached `nov2-release` worktree and the unrelated dirty
  `oct31-release-deployment` and `update-command-center` worktrees.
- Keep private device identities, paths and raw logs outside Git.

Status lives in [implementation](releases/2026-11-03/implementation.md) and
[rollout](releases/2026-11-03/rollout.md).

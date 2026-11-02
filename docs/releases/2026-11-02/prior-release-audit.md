# Prior request and branch audit — Nov 2

Reviewed the October 30 implementation/closeout, October 31 request register, November 1 plan,
implementation/closeout and current source at `4456aea`. This distinguishes missing implementation
from unavailable provider features and acceptance that has not happened. Simulator review is
required before further physical iPhone/iPad builds or installations.

## Main findings

The October 31 document explicitly implemented O14–O17 and left O1–O13 as research. November 1
delivered its named scope and transferred five live defects; it did not implement the whole
October 31 register. Those earlier requests need an explicit place in the open Nov 2 backlog.

| Earlier request | Current finding |
| --- | --- |
| O1: Enter sends question answers | Previously absent from inline cards. R9 now implements and tests Enter/Send, alternate newlines, empty/composition/repeat guards and retry identity. Existing physical build 2611.2.1 does not contain it. |
| O2: retain sidebar expansion | Still view-local `@State` in `NativeWorkspaceTree`, including workspace/project expansion and paging. Not implemented as the requested shared app-session state. |
| O4: valid intranet addresses | Reproduced in current renderer: explicit single-label HTTPS, hostname:port and the documented long-fragment example all throw “Enter a valid hostname.” Main-process acceptance does not repair the earlier renderer rejection. |
| O5: LAN console reachability | Still requires actual app-specific network/privacy acceptance. It is separate from O4; a parser fix is not proof of LAN connectivity. |
| O6: attachment-only messages | Still rejected by ordinary owner `engine.send` and website composer text guards. Existing question-card attachment-only support does not implement ordinary chat/new-chat support. |
| O7: iPhone Chat / Live browser row | Missing. Current source still renders child tabs and puts the switcher in `composerStatus`. The requested iPhone-only replacement row and removal from the composer were not delivered. iPad was explicitly to remain unchanged. Now assigned to simulator review first. |
| O8: one question/options/answer presentation | R9 fixes the repeated single-question heading. The wider original request remains partial: generated prose may still repeat choice lists, and an answered card still shows status rather than “Answered: …”. Multiple-question labels are retained deliberately so fields remain identifiable. |
| O9: physical iPhone browser bar clipping | The fixed negative bottom padding remains in source. The original physical failure has not received the requested matching-device acceptance; simulator success alone does not settle it. |
| O10: attachment viewer arrows and dates | Still a single-file viewer without ordered previous/next navigation or created/modified metadata. |
| O11: closed tabs reappear | Owner tombstones, explicit reopen and membership fixes are present from Nov 1. Current phone/desktop project-list mismatch is a live mobile-projection defect, not proof that the owner Close mechanism is absent. |
| O12: originating window/device for agent tabs | Needs a focused submission-origin audit. Existing project ownership and multiwindow membership do not by themselves establish this requested turn-origin behavior. Do not mark it complete from those changes. |
| O13: continuation setting placement/parity | Shared Run details still place the active-time setting before runtime/usage and the allowance setting later. No matching native control or website binding was found in this audit. The requested arrangement/parity is not complete. |
| O14: Copilot Fusion | Implementation is present. Current runtime advertises Auto without Fusion tiers; actual provider availability/execution remains unverified. |
| O15–O17: remote layout/context parity | Committed implementation is in main. These are not missing branch changes. |

Additional October 31 audit items still visible: native autoplay retains the sticky activation
rule (A2); native inline question cards still lack attachment controls (A4); question-queue
expansion remains view-local (A5); broad project polling remains (A6); Enter rules are not yet
consolidated into the proposed single shared UI helper (A8). Native notification coalescing and
persistent notice deduplication (A3) were implemented in Nov 1. N2 routine state-projection work
was explicitly deferred, separate from N1's delivered integration-health correction.

## Personal / General synchronization

Fresh desktop inventory agrees with the desktop screenshot: nine visible browser tabs, three
hidden browser tabs and no open chat descriptor. The phone screenshot includes an obsolete news
tab and a chat descriptor, while missing five visible desktop entries. Preserve the desktop's
stable identities, order, hidden state and histories. Repair the mobile projection; do not change
desktop membership to match the stale phone cache.

Two source mechanisms require reproduction: an empty restored pending-operation array can block
refresh without dispatching anything; a history-page error can prevent an otherwise fresh
membership list from being applied. Neither is yet established as the physical device's actual
cause. Preserve unknown delivery receipts and unsent drafts during any repair.

## Branch integration

Main is `f14dbed1b31eda2fdc281288089a60833b102878`. All seven old remote heads are strict ancestors
of it: Fusion, Linux membership, October command center/deployment, Windows llama/profile and
November responsiveness planning. No committed changes from those branches are missing from main.
Nov 2 / PR 29 is the only open PR. Exact-head guarded deletion retired the seven old remote refs;
the three old local branches were retired after their worktrees were detached at unchanged heads.
Only main and `codex/nov2-release` remain as local/remote branches.

Two old worktrees contained uncommitted changes. Their complete patches were saved with hashes,
and their detached working files remain byte-identical. The old browser-host ResizeObserver is
already implemented in current source. One additional uncommitted host-shrink/grow regression was
recovered into Nov 2 and passes. Old deployment metadata is historical and must not overwrite
the later closed release record. No dirty work was discarded and no extra merge was needed to
preserve already-integrated commit ancestry.

## Review order

First implement/review the requested iPhone navigation and mobile membership repair in the
existing shared phone/tablet simulators. Keep physical builds/installations held until that
review. Keep the remaining recovered requests visible as pending work; this audit does not claim
they are implemented or authorize replacing old accepted artifact identities.

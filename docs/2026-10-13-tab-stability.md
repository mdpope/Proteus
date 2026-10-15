# October 13 desktop browser tab stability

The operator authorized correcting browser-tab title/size flicker, flashing and changing order
on both Macs. This follows the approved 0.2.13 logs/link correction, which remains included.

## Implementation

- Native restored activation retains remembered/logical titles instead of publishing New tab.
  Preserve reload routing metadata. Owner page-title updates reach unloaded native snapshots.
  Restoration supplies the saved label to the native view; Team selection honors custom names.
- Unchanged main and Team tab strips retain DOM nodes/scroll and event bindings; real label,
  selection, icon, profile menu and order changes still render.
- Detach local captures and baselines from mutable navigation objects. Count concurrent scope
  application and recheck order after native awaits, preserving a drag during page loading.
- Correct the standalone browser Add tab popup's undefined workspace-parent reference.

## Verification

The synthetic activation test first failed on the original saved-title → New tab → saved-title
transition. It now verifies stable labels/order across restored activation, unchanged polling,
a second client updating an unloaded sibling title, explicit reorder and a user drag during
an actual awaited native page load. Team mounted surface, page marker/scroll, address draft,
owner rename, unload/load, explicit refresh and account switch regression passes. Unified
workspace/agent placement, shared Back/Forward, unload/private redirects and large/SPA history
regression passes. 580 Node tests and static checks pass. Exact signed-package tab stability, Team mounted-browser
and packaged launch/vendor-signature acceptance pass. Shared content-tab UI and duplicate restored
view regressions pass. The older toolbar test compared Chromium's reconstructed stack with the
portable menu stack; its expectation now reads the portable stack through native browser state.
Toolbar directional menus, sharing, compact layouts and stale selection/click guards pass after
selecting the main window explicitly instead of the separate Standup window.

## Installation

Primary Mac: signed 0.2.14 `ec8b213d382e+dirty.dfad6e187477` installed/live-verified. Existing
signing identity and vendor signatures retained. Cold APFS app/data backups preserve 65,276
original data files; all 6,394 protected retry receipts survive and three SQLite stores are valid.
All 62 logical tabs preserve original order, ownership/profile mappings and drafts; 17 run files
and configuration/legacy records survive. Copilot, Codex and Claude are available; relay online.
Restored public tab selections retain expected labels, selected URLs and visible page identity.
An ordinary public link reaches its destination and Back restores the prior page. A subsequent
Forward UI attempt was stopped when computer-use reported operator activity; signed/isolated
portable Back/Forward acceptance already passes. Private durable receipts contain exact checks.

Second Mac: exact immutable private transfer is staged/hash/source/signature verified: all 211
runtime and 842 source files match. The first replacement hold was one awaiting-input chat.
The operator explicitly authorized “Interrupt the waiting chat and install”; the destination
preserved that waiting run and cancelled it through the supported API. The signed artifact is
now installed. All 80 main and four Team tabs retain their titles/order,
four drafts and profiles survive, and all 10,000 retained retry receipts plus 1,287 browsing
visits match the backup. Logs migration retains original activity recovery/notifications and
list/detail paging passes. Live KSL article navigation reaches and stays at its intended
destination, agrees with the shared record, and Back/Forward both pass. Saved titles/order stay stable across 30 polling
samples. A separate 140-second health sample has no API/scheduler failures or event-loop stalls
above one second. The historical intermittent global hang remains outside this bounded claim.
Final destination receipt confirms installed/live-verified on the exact signed build,
including the restored Team page, unchanged pairings and no new browser-load errors. The app
is returned to the prior chat; that one waiting run was intentionally cancelled with history
retained. Full app/data backups and release/continuity receipts are saved privately.

Web/native and physical-device deployment are outside this desktop correction.

## Artifact provenance

Fingerprint `dfad6e187477b71eb72dc805d3c26f772d0cc9a78f1a0dbdf2733e43437691ac`; 211 runtime files.
All runtime/build inputs match the corresponding privately transferred source companion. No
application data, profiles, credentials or private recovery receipts enter the source transfer.

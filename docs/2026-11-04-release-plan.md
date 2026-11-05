# Nov 4 release plan

Opened as a plan only. A release cannot be reserved until Nov 3 is closed; opening it then reserves the next version once, through `scripts/release.mjs open`.

## Update-blocking rules

The operator's rule: only a download that is actively transferring data blocks an update. A paused or interrupted download must not.

Today `desktop/main.cjs` reports "A browser operation or download is active." whenever any tab has an agent action in flight (`tab.agentActions`) or any entry in `tab.downloads`. The `downloads` set is only emptied when Electron fires a download's `done` event. A paused or interrupted download that never fires `done` therefore blocks forever.

Change, with tests:

1. Count a download as blocking only while its state is `progressing` and it is not paused (`item.getState()` and `item.isPaused()`). A download that is paused, interrupted, cancelled or completed does not block, and its file and row are left alone.
2. A hung agent operation can block just as indefinitely: on Nov 4 one Zoho Assist tab held `agentActions` for about 16 hours until a tab was closed. Add a stall timeout: an agent operation with no progress for a bounded time (propose 5 minutes) stops blocking idle and is reported as stalled rather than active.
3. Name the blocker. The idle report should say which tab, whether it is a download or an agent action, and whether it is progressing, so nobody has to hunt through windows.
4. A running chat or terminal and any other existing idle rule are unchanged. Updates still never cancel unrelated work.

Acceptance: regressions for a progressing, paused, interrupted, completed and cancelled download, and for a hung and a progressing agent operation, in a real Electron window; the blocker text names the tab and kind.

## Carried forward

- Linux renderer-crash recovery fails on the unmodified baseline and is unexplained (see the Nov 3 Linux qualification).
- iOS physical-device responsiveness, gestures, push and reconnect remain unverified.
- Mnemosyne work stays deferred.
- Any Nov 3 item left open at closeout, including the relay deployment and server retention.

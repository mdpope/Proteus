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

## Process issues to resolve

### P1 — Web release has no signed-in acceptance

What happened on Nov 3: the website deployed with its own audit passing, but nothing exercised the new remote web client as a signed-in person would. The new client runs its transport in a Web Worker, and the page's Content-Security-Policy and the worker file's own headers were checked only by reading them. Ordinary isolated restore also failed, as on Nov 2, and activation used the captured-state verifier instead, so what the audit proves about a restored site is limited.

Why it matters: a worker blocked by policy, or a client that fails to connect after login, would look healthy to every automated check we run and fail for you first.

To resolve:
1. A repeatable authenticated acceptance step the deploy runs or a person runs in minutes: sign in with a disposable test account or the operator's own session, load the remote page, confirm the worker starts, the client pairs with a synthetic owner, state arrives, a message round trip works, and the browser console shows no policy errors. It must not read or print credentials.
2. Run the same check against the local build before deploying, so a policy or asset problem is caught before production.
3. Find out why ordinary isolated restore fails (the recorded ValueError) and fix it, or decide in writing that captured-state verification is the permanent standard and say what it does and does not prove.
4. Record the result in the website release record, separately from "deployed".

### P2 — Server cleanup is manual and tied to one release's exact files

What happened on Nov 3: the deploy added a server code generation and a server recovery, so the server probably holds more than the policy allows (one verified backup, current code and one previous). Retiring the older ones needs the server's root shell with hashes pinned for specific releases. The Nov 2 retirement script names Nov 2's exact generations, so it cannot be reused, and the deploy client only cleans local recoveries. The local build tool also refuses to build when more than two code archives exist, which forced a manual deletion of an archive on Nov 3.

Why it matters: server disk was exhausted once before (October 23, causing an HTTP 500), retention is policy, and a manual root-shell step after every release is where mistakes happen.

To resolve:
1. First, inventory the server now (code generations, recovery directories and transports, free space) and record it without deleting anything, so the cleanup is reviewed against facts.
2. Make server retention a reviewed, repeatable step: it takes the live and previous release from the receipt rather than hard-coded names, verifies each retained item's hash first, retires only older ones, writes a receipt, and refuses to run if any check fails. Dry-run output first, then an apply step bound to the exact plan, the same shape as `desktop-publication.mjs`.
3. Do the same for local code archives and build folders: retire on acceptance as part of the deploy, so the next build is never blocked and nobody deletes files by hand.
4. Report actual free-space change separately from logical bytes.

### P3 — Signing is a single point of failure

The publisher key exists only on the Windows builder, so a Mac, Linux or Windows package can only be published while that machine is reachable and its chat is not stalled. On Nov 3 an unanswered approval prompt there blocked publishing everything and pushed Work Mac to a private transfer route.

To resolve: decide and write down the supported fallback when that builder is unreachable (for example, an offline signing procedure on a second trusted machine with the same key under the same rules), without copying the key casually. Also surface a stuck approval prompt on a builder in the coordinator's view rather than discovering it hours later.

## Carried forward

- Linux renderer-crash recovery fails on the unmodified baseline and is unexplained (see the Nov 3 Linux qualification).
- iOS physical-device responsiveness, gestures, push and reconnect remain unverified.
- Mnemosyne work stays deferred.
- Any Nov 3 item left open at closeout, including the relay deployment and server retention.

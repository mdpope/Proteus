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

### P3 — The Build Mac must be the release authority, not a Windows builder

Operator rule: the Build Mac, not any builder, is the authority for releasing packages. No release may depend on a Windows build, or on a Windows machine being reachable, for signing, staging or publishing.

What is true today: the Ed25519 publisher private key (public key ID `92b49fc0…`) exists only on the Windows builder. The build operation configured there signs at the end of its own build, so a platform build and the release authority are the same chat. On Nov 3 an unanswered approval prompt on that machine, then a Windows build that stopped itself rather than sign, left the already built and accepted Mac package unpublishable for hours, and pushed Work Mac onto a one-off private transfer. The reason the key lives on Windows is not recorded; it appears to be history.

How verification works, which constrains the fix: installed apps and the website verify a release manifest against public keys bundled inside them (`resources/desktop-release-keys.json` and the app's own copy). An app only trusts keys it already shipped with, so a new key cannot be used until a release containing it has been installed everywhere that must verify the next one.

Target design:
1. **Builders only build.** A native builder produces the package, its source companion and an unsigned manifest payload, runs acceptance, and hands the exact bytes over. It never holds the key and never signs or publishes. The Windows build operation's signing step is removed or disabled by default.
2. **The Build Mac signs, verifies, stages and publishes.** It holds the key, runs `sign-desktop-payload.mjs` and `stage-desktop-distribution.mjs`, verifies the result against the bundled trust, and deploys to downloads.proteus.example. It also keeps the release ledger.
3. **Hand-over is a private draft with hash checks,** as the Nov 3 HC transfer did, not text in a chat. Chat-returned base64 corrupted a signed envelope on Nov 2.
4. **Platforms publish independently.** Today staging a subset gives every other platform an empty catalog, so one late builder blanks everyone else's updates. Replace that with an explicit "pending" state per platform that keeps the previous valid entry, so consumers can neither select a superseded version silently nor lose updates entirely.

Key custody, a decision for the operator before any change:
- **Option 1, move the existing key.** A one-time, operator-authorized move of the current private key to this Mac's protected storage (an owner-only file outside every checkout, with a Bitwarden recovery record), then verify it signs a test manifest that the existing trust accepts, then retire the Windows copy and record that it was removed. No release needed and no trust change. The cost is that the key travels once, and copying a signing key is exactly the risk to avoid.
- **Option 2, rotate to a new key generated on this Mac.** The private key never leaves it. Ship the new public key in a release signed by the old key (one last use of Windows or of Option 1), wait until every target runs that release, sign with the new key from then on, and retire the old one. Nothing is copied, but there is a transition period and a release to ship first.
- Recommendation: Option 2 if the old key can be used once more under supervision, because it ends with a key that has only ever existed on the authority machine. Choose Option 1 only if rotation cannot wait.

Acceptance:
1. A full release (Mac, Linux, Windows) signed on the Build Mac with the Windows builder powered off.
2. Staging and verification pass against the bundled trust, and a consumer completes a real update from the published release.
3. A subset publish, such as Mac only, leaves the other platforms' catalogs valid.
4. The private key's location, permissions and backup are documented without its value or path details in Git.
5. Nothing in the release process names a builder as an authority; `docs/release-process.md` is updated to say so.

### P4 — A remote computer's command history fills up and blocks dispatch

On Nov 5 Work Mac refused every command, including an authorized update, with "Remote command history is busy: 268,496,545 / 268,435,456 bytes; 0 unresolved". It keeps every received command's receipt for 24 hours and caps the total at 256 MiB. Receipts of large results, such as tab-list replies with long browser histories, evidently fill it, and nothing drains until entries age past 24 hours. This blocks dispatch and probably also tab sync to that computer.

To resolve: find what dominates the bytes, using the diagnostics the journal already exposes, and measure it on a real owner rather than guessing. Keep retry protection but do not store full large results in each receipt (store a digest and size, since a retry needs the outcome, not the whole tab list). Warn before the cap is reached, so it shows in the owner's status and in a dispatch error that names the cause and the time until space frees. Test that existing claims still complete and retries still return the original outcome. Also confirm the activity-write change in 0.2.42 actually reduced this on a live owner.

## Carried forward

- Linux renderer-crash recovery fails on the unmodified baseline and is unexplained (see the Nov 3 Linux qualification).
- iOS physical-device responsiveness, gestures, push and reconnect remain unverified.
- Mnemosyne work stays deferred.
- Any Nov 3 item left open at closeout, including the relay deployment and server retention.

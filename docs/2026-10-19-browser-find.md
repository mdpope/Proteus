# Stable native browser Find (0.2.24)

The operator authorized a signed follow-up to 0.2.23 for repeated jumps to the first Find match.
The shell observer requested search(0, false) after unrelated mutations, but native Find ignored
that passive flag. Direction zero clears the selection and starts Chromium Find again.

The native passive path now compares query, stable tab identity and an ephemeral document
revision before incrementing its request epoch. It leaves a pending explicit result valid.
Explicit typing and Next/Previous still search. Top-level DOM readiness advances the revision,
so actual navigation and same-URL reload refresh results. Query, document, target and close
changes reject stale success/error replies. Stop uses the captured target. Renderer ranges
still update counts and preserve their selected range without scrolling on passive mutations.
No permissions, profiles, history formats or persisted application-data fields change.

## Verification

Seven focused regressions and all 747 runtime tests pass, as do static checks. Synthetic real
Electron acceptance exercises a 40-match long page: seven source polling cycles and five exact
signed-package cycles produce no extra native Find or stop calls, keep match 2 of 40 and preserve
manual scroll at 12,000 pixels. Explicit input, arrows, same-URL reload, new-document counts,
tab switch and close pass. A native page capture confirms real Chromium highlights.

The exact signed package passes bundle identity, retained signing identity/vendor binaries,
launch, mock-Keychain persistence and model catalog checks. The 146-view restoration/restart
rehearsal preserves identities, complete order, selected chains, placements, drafts and original
run bytes. Its initial restart check raced startup: content IDs already existed on disk before
new native IDs were saved. The test now waits for saved/native identity agreement before its
intentional renderer reload. The signed runtime was unchanged; retain both failure and successful
receipts privately. This build was packaged/signed once.

## Delivery boundary

Build ec8b213d382e+dirty.249b452ed344 has 236 runtime files and source fingerprint
249b452ed3443ff42262dea42a0f304f944224c055d1b487262296e92799dbb0.
Deliver the exact signed archive and matching source through the immutable private transfer
workflow in docs/desktop-updates.md, with an independent TRANSFER-SHA256.json pin. No local or
remote installation is established by these synthetic checks. Fresh destination unlock/idle,
current-data preservation, exact signature/source verification and restart acceptance remain
required before claiming installation. Do not interrupt new work. Build/test staging needs no
live-data backup; preserve existing two-generation recovery and independent preview workflows.

Private transfer is complete at commit d59bf4d0b79c92b72d7bf6cb9743fd2106896049 on branch
codex/signed-proteus-0224-20261019-find. Independently verified TRANSFER-SHA256.json pin:
5d081423b21cbb7599fa76a1af96a098673a2e5f94f9ef2865795822e8a970de. The full signed archive
SHA-256 is 0321cf6d7970d192007029e4e2cf443e8e62576304ad1e086f74f2a306d164eb; matching source
SHA-256 is 97ce858d4478f944391e005107e17864ac455987fb3f201df1d5a186e9a78593. These delivery
receipts postdate the frozen source companion. At initial build delivery, installations were unchanged; subsequent authorized live acceptance
is recorded below.

## Authorized desktop installation accepted

Personal and HC installed the exact signed artifact in place and passed a second graceful
restart. Personal preserved 25 chats, 137 saved views, 82 content descriptors, all 952 original
cookie identities, settings/approvals/pairings and 29 protected receipts. Its live page held
match 2 of 40 at 7,194px manual scroll for ten seconds. HC preserved 264 chats, 88 saved views
and 51 protected receipts; its live page held match 2 of 40 at 6,534px for over 69 seconds.
Explicit input, arrows, reload, new-document count and close pass on both. Main-process Find call
counters were verified in the synthetic exact-artifact/installed-module regressions rather than
patched into live owners. Original navigation was restored and test-only tabs/servers closed.

Existing website title/visibility changes, an already-authorized peer history title update and
a website-refreshed cookie were reviewed against stable identities and original visit fields.
Comparisons did not rewrite production data. Source registrations and memberships remain intact;
only derived source scan status/timestamps refreshed. Four nonpersistent HC Team browser entries
retain saved descriptors/history while native processes remain lazy until selected. Providers
and relay are ready; Default-profile history sync retains its authorized 90-day policy.

Two verified full recovery generations remain per desktop, with corresponding previous apps
and sources. The independent preview is unchanged. Personal retirement steps recorded free-space
increases of 56,635,392 and 251,158,528 bytes; HC recorded 1,732,431,872 bytes. Exact private
receipts distinguish original preserved rows, reviewed live metadata and test-only additions.
No active work was interrupted and no account, certificate or profile reset was performed.

# Nov 3 closeout

**Nov 3 / 0.2.42 is closed on November 5, 2026.** PR [30](https://github.com/mdpope/Proteus/pull/30)
merged as c4a2845ed48a938322fe5413ed50c6dc144920dc. Primary main contains the exact validated release
head. Desktop Mac bytes remain pinned to 568705c; Windows to 97b9761 (test-only qualification fixes);
iOS retains 5501776. No accepted package was rebuilt or relabeled, and no Nov 5 code was merged.

Mac and Windows publication is complete. All 27 files passed HTTPS hash checks, the current
descriptor advertises Nov 3, and current-only retention removed three superseded public directories.
Observed server free-space increases were 1,153,646,592 bytes for old packages and 246,816,768 bytes
for verified duplicate upload staging. Eleven obsolete canonical-site package directories were
also retired. Website metadata recovery retains two verified generations; the acceptance pin is
released. Prior verified server website/relay retention remains recorded in the rollout ledger.

Build Mac, Work Mac, both Windows consumers, iPhone, iPad, shared simulators, website and relay
have installation/deployment evidence. Linux remains explicitly deferred on 0.2.41 following the
preservation rollback; its failed candidate is not advertised. Its source fixes are in the Nov 5
plan and its failed recovery evidence is retained.

Installation evidence and limits are in [rollout.md](rollout.md). In particular, Ian's expected/found
navigation counts match and its zero current-window tab result matches the old layout. The other
Windows owner's project tabs are present despite an empty chat-scoped browser list. Neither
Windows consumer had an existing terminal view available for rendering acceptance. Full independent
history/draft/source/pairing comparisons remain unverified where access was unavailable. Work Mac's
additional audit hit the native Claude provider rate limit; its earlier verified installation,
signature, health and recovery evidence stands. Signed-in web acceptance, physical-device feel
and sustained relay stability remain qualified. These are not claimed as successful tests.

The release branch and both merged implementation branches were retired. On the operator's
follow-up cleanup request, the three day-old orphaned Xcode profiling helpers were identified
by executable, parent, working directory and inactive state, then stopped. Current Xcode indexing
and simulators were preserved. All Nov 3 worktrees are removed. Tested dependencies moved into
the primary checkout; the temporary Nov 5 worktree is also removed. Only main and the single
nov5-release branch remain. Pre-existing unrelated detached worktrees remain outside this scope.
The previous primary dependency set is retained in stable dependency storage for review.

The private transfer draft is deleted (GitHub confirms 404); its never-created tag needed no
deletion. Accepted package/source copies and minimal asset receipts remain. Verified duplicate
local/server staging and the HC transfer copy were retired; corresponding source is preserved.
Local staging freed 581,632 measured bytes despite 822,025,150 logical bytes removed, consistent
with shared APFS allocation. Exact paths, host identities and receipts stay in private records.

The [Nov 5 plan](../../2026-11-05-release-plan.md) contains all final Nov 3 carry-over items and the
digest controls. No Nov 5 version has been reserved, build dispatched or installation started.
The recommended first package is the implemented digest blocker scope, followed by real workflow
acceptance before unrelated new features.

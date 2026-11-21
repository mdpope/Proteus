# Nov 17 closeout

Proteus 0.2.46 closed on November 20, 2026. The authorized macOS, Linux, and
Windows desktops reported the accepted builds with verified app health. The
authorized iPhone and iPad installations and production web deployment retain
their recorded acceptance limits. The [rollout record](rollout.md) covers
preservation evidence, physical-device checks, and historical attempts.

The Windows source pin is `2e0ce0826b43a22b37d6c1635589d8b519975983`. The Mac and
Linux packages use `8e7e0eb2f953af2593612ffe62e249795eb0dd78`. All accepted desktop
runtimes use Electron 44.11.5. Windows native validation passed 1,957 source tests
with 12 skips and verified the exact packaged browser focus and typing fixes.
Remaining platform-specific gaps are recorded in the rollout.

The Windows desktop verified its installation and preserved all 39 chats, 36,220
prior events, and saved navigation. An `EPERM` in post-verification recovery cleanup
held the app until **Resume ordinary work** released the update barrier. The
affected retirement and a separate historical recovery hold remain pending. Their
journals, receipts, and recovery data are preserved. N20-02 tracks the updater fix
for Nov 20. The Windows consumer completed the published update with verified
package, health, and navigation. Its independent recovery count and desktop
check remain follow-up items.

WTB serves one current download generation per platform. The Windows x64
0.2.46 installer, archive, signed manifest, catalog and page verified over HTTPS.
The Mac and Linux catalogs retain their existing 0.2.45 packages under the
publication hold. Retirement of the old public Windows generation released
645,210,112 measured server bytes. Its exact local rollback files were verified
and moved out of the site tree. Existing owner recovery holds and accepted
source companions remain protected.

Canonical private source and the privacy-sanitized distribution snapshot are
integrated separately. The snapshot contains the release changes and closeout
record on the existing distribution history. Hosted workflows stay disabled.
Nov 20 planning remains separate from the Nov 17 release and its runtime pins.

# October 27 release cycle — closed October 30, 2026

**Closed by operator instruction.** Device rollout is not a completion requirement. Do not keep
this release open for another build, transfer, installation, recovery review or retry. Follow-up
work needs its own task and authorization; no live user content is deleted to close the release.

## Source and validation

The exact tested 0.2.38 candidate commit `1ff11811a69f6585e03cc64c7d03574e05e3e1ab` is merged
into main. It contains shared-window correction `c985e92` and acceptance notes `04fee48`, with
only version metadata added afterward. Later planning/closeout commits change documentation,
not the accepted executable. The Windows distribution and combined 0.2.36 branches are already
ancestors of main; no source development branch or worktree remains outstanding.

Final consolidated-main validation: **1,316 tests pass, four skip, zero fail**; static checks pass.
The accepted Mac candidate separately passed official extraction and exact packaged multiwindow,
inactive membership/order, move/close/reorder, independent selection/scroll/drafts, named restore,
restart, legacy-chat protection and 451-entry Back/Forward-history acceptance. Package hashes
remained unchanged. This does not claim live acceptance on every device.

The unrelated October 30 request register R1–R9 is committed in
[its own plan](2026-10-30-release-plan.md). It remains request collection only, with implementation
held; those requests were not silently implemented or discarded during this closeout.

## Accepted artifact retained

Private draft release **429341405**, tag `hc-private-0.2.38-1ff1181-20261030`, retains the exact
accepted Mac archive, source companion, acceptance receipt, raw evidence and transfer pins.
The repository is private and the release remains a draft; no public feed was activated.

- Version/platform: 0.2.38, macOS arm64.
- Build: `1ff11811a69f+src.85c141d47456`.
- Source fingerprint: `85c141d47456893aca8177d7d3bef8853363fa59d0d23d6858ebdb3ad08daec2`.
- Bundle tree hash: `2a3b90e66d79ed79a18c75b2a20c70302e171f72b4e66660cba0e781d178b295`.
- Archive SHA-256: `14a50bab78f82a2d319aebb48a3092f5adb36571705ebfc7d595760468584691`.
- Existing Apple Development identity: `org.proteusapp.proteus.desktop`, team `TEAMID0000`,
  certificate SHA-1 `0000000000000000000000000000000000000000`. No notarization is claimed.

Retiring the review checkout does not change the accepted source/archive identity. Source is in
main and the corresponding-source archive. The original acceptance and transfer receipts remain
immutable historical evidence; private closeout receipts record later staging retirement.

## Repository and disk cleanup

All 53 obsolete remote branch names were removed with exact-tip leases. The 49 orphan
artifact-transfer histories were preserved first as private `archive/transfers/…` tags, rather
than merging obsolete installer binaries into source. The four development/release branch tips
were verified as ancestors of main. Only main remains as a local/remote development branch and
the primary checkout is the only worktree.

Thirteen obsolete Codex checkpoint refs are preserved in a verified standalone private bundle.
The chat-control snapshot's runtime/tests match main ancestor `b7701c0`; the archive-cleanup
snapshot's Find cancellation/debounce, expected-navigation guards and Team address-draft
protection are present in main. Historical snapshots remain recoverable without appearing as
unfinished development efforts.

Removed the two merged temporary checkouts, obsolete local dist output, superseded 0.2.36/0.2.37
build copies and old downloaded Windows publication payloads. Retained the accepted 0.2.38 app
and archives, signed/notarized review images, operator document, source companions, hash manifests
and compact test/transport/recovery evidence. Live profiles, chats, tabs, histories, drafts,
credentials and registered updater recoveries were outside the cleanup targets and untouched.

Git integrity checks pass. Git storage shrank from about 6.7 GiB to 8.2 MiB. The measured
free-space increase during closeout was approximately **12.4 GB (11.6 GiB)**, leaving about
25 GiB available; concurrent filesystem/APFS activity is included in that observation.
Private receipts retain exact before/after measurements, per-file retirement manifests and
verified archive mappings; no machine-specific operator paths belong in this repository.

## Deferred operational observations

The HC read-only owner scan proposed five missing tabs and two separate history copies from
25 retained records, but restored none. All 210 baseline logical identities remained in their
original scopes, and all 75 comparable histories matched the baseline. Four external-only
layouts remain outside that scan and are preserved, including unresolved history/chat identity
relationships. These records require a separate explicit review; neither restoration nor
deletion is inferred from release closure.

No further device deployment or live-data reconciliation was performed by the closeout.
Historical installation limitations and incomplete live checks remain honestly recorded above
and in earlier handoffs; they do not keep this release active.

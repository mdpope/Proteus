# October 13: logs and clicked-link navigation

The operator approved implementation/build of the fresh intake with a separate log database,
automatic oldest-entry rotation and a 2,000-entry cap, and added the broken browsing/link report.
This supersedes the collection-only hold for BF-2026-10-13-01–02.

Implemented in 0.2.13:

- Worker-owned local SQLite log persistence, recovery-preserving JSON migration, 2,000-entry and
  64 MiB payload retention, bounded individual diagnostics and worker checkpoint/vacuum.
- Compact headers, independently fetched full redacted details and 50-entry cursor pages on
  desktop/web/native; retained older-entry navigation from alerts. Account events stay separate.
- Page-initiated navigation claims its logical destination before history polling. An in-flight
  load rejects stale mirror application; committed links/redirects synchronize under stable entry
  IDs. This prevents polling from reloading the old page and aborting a clicked destination.

Evidence: read-only inspection and a public-page click on the existing desktop reproduced a
return to the prior page and aborted navigation. Private site/URL/runtime identifiers remain
outside this repository. Disposable real Chromium fixtures verify slow ordinary links,
same-document links, redirects and new-tab targets without browser error notifications.
Existing shared-history acceptance also passes workspace/default/explicit application placement,
Back/Forward, local unload, private redirects, SPA updates and large-history hydration.

Verification completed so far:

- 579 Node tests pass, including rotation/byte bounds, atomic migration/restart, credential
  redaction, worker drain, failed-migration shutdown/runner-lock recovery and authenticated local/paired summary/detail API parity.
- Static checks pass. Desktop log UI confirms 2,000 retained entries, 50 rows per page, lazy
  complete redacted traces, Newer/Older and focusing a retained event outside the first page.
- Existing browser-error UI verifies one notice per failed attempt, exact related-event focus,
  modal/draft preservation, missing-event fallback and omission of iframe-only failures.
- Website assets build locally; 81 isolated PHP tests pass (724 assertions). Native log UI
  acceptance passes on both iPhone and iPad simulators, with all 108 native unit tests also
  passing on iPad. These are synthetic fixture checks, not physical-device rollout.

Primary desktop is **installed and live-verified** on signed 0.2.13
`ec8b213d382e+dirty.61555b94efec` (211 runtime files). The exact final signed artifact passes
package/signature/vendor/catalog acceptance plus browser-link and log UI rehearsals. Source
hashes match every runtime/build input. Native surface visibility is explicitly asserted in the
link regression, in addition to page URL/body behavior.

The local update checked idle work immediately before graceful Quit, preserved consistent private
app/data backups, and replaced the app in place. All 17 saved run files and 5,933 protected retry
receipts match exactly. Receipt/log databases pass integrity checks; the original activity JSON
matches its migration recovery copy. Settings, context, permissions, credentials and pairing
configuration remain intact. Workspace/tab descriptors changed during live navigation/remote
reconciliation, the derived source catalog refreshed, and the scheduler checkpoint advanced;
these mutable files are distinguished from the unchanged protected records.

Installed acceptance confirms restored UI, version, connected host and all three provider
catalogs available; it does not infer usage or run a model turn. A live public article click
reached and displayed its intended destination without a load-error popup. The installed Logs
view displays bounded headers and Details expanders; opening Details loads recorded fields.
The verification browser tab was closed afterwards. An initial blank restored view during live
acceptance was checked independently of the link regression; a fresh visible browser surface and
live clicked destination were subsequently verified. No blanket cross-host restore claim is made.

The second desktop now has the approved log/link changes through signed 0.2.14, installed and
live-verified with original activity recovery, notifications/preferences, pages/details, saved
tabs/drafts/profile/order and protected retry/history data retained. See [tab stability release](2026-10-13-tab-stability.md).
Website assets and native clients are built/tested locally; production website and physical-device
rollout remain pending. Durable artifacts, recovery copies and preservation
receipts stay in private local update storage outside this repository.

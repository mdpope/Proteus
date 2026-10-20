# Website data and scoped desktop overview (0.2.25)

The operator authorized implementation, signed build and testing, with an explicit hold on Personal
and HC installations until approving the finished artifact. Independent native simulator previews
and the reusable desktop preview workflow remain separate.

## Page menu and website data

The three-slash Page menu retains extension actions and adds Clear website data, Manage website
data, default/desktop/mobile requests and the existing current-connection certificate viewer.
Manage opens Engine Room → Website data with the current profile and origin preselected.

The data manager lists cookie names/domain/path/expiry, local-storage keys, IndexedDB database names,
cache names and quota-backed service-worker/file storage when reported by Chromium. Cookie/storage
values remain hidden. Select individual cookies, keys, databases or caches; remove selected items,
clear the selected site or clear website data in the chosen profile. Site clearing can sign out
sibling subdomains because Chromium removes cookies at registrable-domain scope. Active websites
can recreate their data. Profile-wide clearing excludes installed extension origins and does not
remove Proteus chats, tabs, history, approvals, source configuration or profile definitions.

The known-site list comes from cookies, current tabs and origins visited since this version. Enter
an HTTP(S) origin to inspect older cookieless storage. This is not an exhaustive scan of old profile
databases. Session-only storage in a particular live page and individual IndexedDB records are
still available in Chromium Developer tools → Application; the manager operates on keys/databases
and caches rather than inventing a second full developer interface.

Inspection uses a temporary Chromium target in the exact browser partition, with Fetch fulfilling
an empty local document and bypassing service workers. It never loads the real site or wakes a
sleeping tab. Bounded protocol calls and target cleanup avoid retaining inspection renderers.
Deletion uses native APIs, then flushes the encrypted session-cookie continuation so removed cookies
cannot return on restart. Profile/account routing is rechecked and snapshot selections expire.

Desktop/mobile requests use Chromium user-agent and client-hint overrides and are remembered by
origin/partition. Websites may still choose a responsive layout. For the explicit mobile YouTube
hostname, Desktop requests the www equivalent without changing the path/query. No arbitrary mobile
hostname rewrite, viewport resize, trust change or TLS bypass is introduced. Certificate information
comes from the selected page's actual Chromium connection; unavailable/HTTP is reported honestly.

## Icons, unloaded links and overview

Electron's favicon event and declared link rel=icon candidates feed the bounded resolver. Store a
valid PNG supplied by the site as that origin/partition's fallback. Retain it when later pages omit
an icon or fail to supply a usable image; a new valid supplied icon replaces it. Fallback survives
restart, stays device-local and never crosses browser profiles/accounts.

Open Link in Unloaded Tab in native-page and rendered-link context menus creates one hidden,
unloaded tab in the original scope/profile. It appears in tab management, does not appear in the
navigation strip and makes no website request. Selecting after restoring it loads normally.

Workspace overview names projects, current first, and includes their visible content tabs. It
highlights and scrolls to the selected tab. Only loaded browsers get page previews; sleeping
browsers remain asleep. Chats and other resources show their type icon/title, with a spinner for
currently running chats. Closing uses existing typed lifecycle actions; chat history and running
turns are preserved. Drag within an owner section or use Alt+Left/Right on a focused card to reorder.
The top-level overview includes precisely main-navigation tabs, without nested project contents.

Native pinch detection tracks the whole gesture, including its initial zoom. Reaching 100% during
that gesture cannot enter overview; end the pinch, then pinch out again at baseline. Native page
zoom and scrolling remain available. Refresh confirms resubmission and uses Chromium reload for POST; submitting
the address field uses a new URL navigation and does not reuse POST data.

## Acceptance and delivery

Tests use disposable profiles, local synthetic websites and the preview fixture only. Required
checks: storage selection/site/profile isolation, no-fetch inspection and unloaded links, cookie
continuation, mode and icon fallback, real native overview previews/scoping/reorder/closure, pinch
regressions, POST reload versus fresh URL navigation, the 0.2.24 Find regression, full runtime/static
checks and exact signed-artifact launch/persistence checks. Record final results and immutable
transfer pins after freezing. Do not infer live installation from build/test completion.

Native API references: [Electron session/cookies and clearData](https://www.electronjs.org/docs/latest/api/session),
[Chromium DOMStorage](https://chromedevtools.github.io/devtools-protocol/tot/DOMStorage/),
[Chromium storage usage](https://chromedevtools.github.io/devtools-protocol/tot/Storage/),
and [Electron webContents](https://www.electronjs.org/docs/latest/api/web-contents/).

### Exact signed acceptance and authorized rollout

Build ec8b213d382e+dirty.8dbb06075488, fingerprint
8dbb06075488b32cc946255e2829e0c779d6f7ef0dfa20db4e64e255250c8250, was packaged/signed
once with the retained identity. All 756 runtime cases, nine focused cases and static checks pass.
The exact bundle passes native data removal/profile isolation, client hints, favicon fallback,
no-fetch inspection/unloaded links, POST confirmation/resubmission and fresh-URL GET, scoped
project overview with native previews/order/close, working-chat spinner appearance/removal,
actual sandbox preload/native-event pinch gating with Chromium page scaling, stable Find and
146-view restoration/restart. No provider turn was started for the spinner test. Synthetic
unpaired/closing-context warnings remain in private migration receipts alongside passing checks.

Immutable private transfer: d6977b8bbb7fcf9970400c025f0778652bdcf9d8 on
codex/signed-proteus-0225-20261019-sites. Independent TRANSFER-SHA256.json pin:
8ddf32601eabb2decc8848e22cfe57ce8b68ae736c3474fcbd264fac8f3fbb55.
Signed archive SHA-256: a219edb43bc8b453a3e9306f27ca60d0bf6648f678b834eba5580a813eccd3b4.
Matching source SHA-256: 94f20acdd08cbacb90f4b204878d0ee4059db66a20e5d25ce8605e579a4a643e.
These receipts postdate the frozen source companion. The operator subsequently approved both
updates. Both desktops are installed and live-verified after a second graceful restart, using
the same frozen signed artifact. Personal preserves 25 chats/136 views; HC preserves 267 current
chat records/89 views. Profile definitions, settings, approvals, original history and protected
retry receipts pass comparison. HC's interrupted blocking turn was directly authorized locally;
earlier events and its completed turn remain intact. Both retain two verified recovery generations.
The handoff records counts, reviewed differences and acceptance limits. Native simulator and
desktop preview workflows remain independent.

Personal's live acceptance uses a disposable local long page, retaining match 3 of 40 and manual
scroll for 16.252 seconds through app polling, then verifying Next/Previous. Only a synthetic
cookie and local-storage key were removed in Engine Room; no actual website data was cleared.
The unloaded-link action makes no request and its hidden test tab is closed. Original active
navigation, chats, content identities, approvals, profile definitions and history survive the
second restart. Two verified full recovery generations and one app per generation remain;
redundant recovery/staging retirement freed 57,851,904 bytes and superseded archives freed
251,273,216 bytes. These are measured free-space changes, not summed APFS directory sizes.
Ordinary selected-page visibility/icon updates, website token refresh and natural
cookie expiry are reviewed narrowly in private receipts rather than rewriting production data.

HC live Find retains match 2 of 40 and manual scroll for 31 seconds, with explicit input/Next,
reload, new-document and close acceptance. Site-data routing selects the correct profile/origin;
the main overview contains exactly its 18 top-level tabs. No real website data was cleared, and
no real workspace tabs were reordered for acceptance. Providers, relay and the complete peer
index are ready. Cleanup retained two full recovery sets and freed 1,866,870,784 bytes. Private
receipts retain the exact artifact/source/transfer pins and narrow authorized run-state review.

Known follow-up: legacy browser tabs attached directly to a workspace can appear in a second
section bearing the current project name. Ownership remains in the correct workspace, but this
section needs its workspace identity/caption instead of the scoped project's ID/name. This is a
queued naming correction, not implemented in the frozen 0.2.25 artifact. Verify a mixed legacy
workspace/project fixture and unique section IDs in the next authorized release.

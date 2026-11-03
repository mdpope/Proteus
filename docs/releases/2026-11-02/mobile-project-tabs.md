# R31 — live General membership verified

The operator opened General after iPhone build **2611.2.9**. Independent fresh owner inventory
and device read diagnostics match all **12 ordered IDs and revision 3535**, including the three
hidden owner entries. The device reports `received`, zero pending operations and no active retry
receipt for that scope. The earlier iPad comparison matched the same 12 IDs; its build8+ update
is explicitly deferred. No device cache was cleared and no pairing was recreated. The exact
historical cause is not inferred solely from this successful comparison. Sustained connectivity,
chat submission and the separate traffic correction retain their own acceptance requirements.

# R27/R28 — project recents and mobile tab reconciliation

The workspace Tabs page now defaults to its canonical General project and offers an explicit
project picker plus All projects. The desktop owner remains authoritative for membership; tabs
in other projects are retained. Reconnect and scope changes refresh through the shared owner
cache, including replacement of obsolete cache incarnations only when no concurrent revision
has arrived. View-local stale rows cannot survive a scope switch. Offline mutations are disabled;
failed mutations trigger a read-only refresh without replaying an uncertain action.

Project recents, right-side counts and paging are restored in native and desktop source. Historical
chat recents remain available after closing their tab. The additional sidebar open-tab/navigation
lists remain removed. Metadata refresh occurs for expanded workspaces on expansion, catalog change
and reconnect, without restoring frequent sidebar polling.

Phone and tablet UI acceptance changes owner membership while disconnected, reconnects without
leaving the tab page, and verifies removal/addition. Both also verify General filtering and restored
recents. The 175 native unit cases and the additional bounded-read-evidence unit pass, including
stale-push rejection and protection against concurrent newer state. Focused actual Electron recents
checks pass. The broader legacy sidebar test still has a later feature-selection failure outside
these project checks; it is not reported as passing. The required Node suite passes 1,454 tests,
four skipped; static checks pass.

Frozen source `7f66c66` produces one signed universal physical artifact, **0.2.41 / 2611.2.6**,
`355099832ade94e38f3f12c64b20c1ed1d380f8361fb3fe514832202ce4c762b`, with the existing paid
bundle/team/profile and unchanged keychain entitlements. Both physical devices now run this build. All 302 phone / 199 tablet protected files match
before first launch, each device retains its four destinations and selection, and exactly two verified
recovery generations remain. Phone/tablet retention removes 153,927,342 / 133,367,817 logical bytes;
observed free-space changes are +154,615,808 / +137,428,992 bytes amid concurrent work. Both Preview simulators already run this revision; their 3,230 phone / 2,667 tablet files
were compared before launch, with no durable changes and saved destinations/selection retained.
Each simulator has one current Proteus Preview; finished test apps/runners are removed.

Post-launch temporary receipts show successful owner reads on both physical clients, including
Build Mac reads from the phone. The bounded receipts do not yet capture the exact General
project membership on both devices, so that independent comparison remains open. A bounded
temporary read receipt contains only scope, revision, tab IDs and time; saved pairing alone is not
proof of authenticated sync. This correction does not establish that the separate relay instability
is resolved. The accepted local Mac candidate remains unchanged; updater usability, wider
distribution and broader Mnemosyne work retain their existing holds.

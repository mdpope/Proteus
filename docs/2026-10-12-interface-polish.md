# October 12 interface polish

The operator authorized desktop, web and native parity work, plus updates on both computers.
This follows the Workspaces release; existing styling and configuration semantics remain.

Implemented:
- Folder header paths use available width before wrapping; expanded sections retain horizontal row separators without an inner vertical border.
- Workspace-local discovery is labeled **Workspace sources**.
- Configured computer names appear consistently, with generic computer wording for fallback/instructions.
- Chats badges count only unarchived running chats across connected computers, deduplicated by computer/chat identity. Queued, awaiting-input and cached offline chats are excluded. Owner-provided counts avoid truncation to recent history.
- Workspace/main Add menus share Markdown file, browser profiles, Terminal, New chat and Internet Search ordering, icons and spacing. Remote-only capability limits remain explicit.

Verified:
- 440 Node tests; npm check.
- 80 Laravel tests (717 assertions).
- Isolated desktop computer-label/count UI, workspace/menu/copy/navigation/session UI.
- Two-computer web configuration/copy/browser/terminal UI, including exact menu order and computed style parity.
- 78 native unit tests per iPhone/iPad simulator; workspace/menu tests both, main-menu and connection UI on iPad.
- Signed desktop package launch, strict signatures, original provider signatures and bundled provider model discovery.

Desktop artifact: 0.2.12, `ec8b213d382e+dirty.f03d25e4cdc1`, 187 runtime files.
Native artifact: 0.2.12 / 2610.12.1.
Website artifact: 0.2.12-20261012T071849Z.

Rollout verified:
- Primary computer: signed desktop installed and live configuration labels/running badge checked. All 65,481 application-data files were preserved before relaunch; recovery copies retained.
- Second computer: the existing authorized Codex chat installed the identical signed build and checked the menus, folder layout, labels and running badge. Both workspaces, 55 tabs, chats, approvals and five pairings were preserved; relay and peer connections remained online.
- Production website: activated the tested release after an encrypted recovery capture and isolated restore verification of all 18 protected tables. Runtime configuration, schema and protected application data were preserved. All 14 endpoint checks passed; eight served assets match the release byte-for-byte. No new Laravel errors; the bounded server audit contained the expected protected-environment denial and known database statistics warnings. The production browser reached sign-in; authenticated production UI was not available in that browser session. Authenticated UI parity was verified against the isolated two-computer fixture.

- Native iPad app on the primary computer: installed 0.2.12 / 2610.12.1 using the existing certificate, profile and entitlements. After the operator completed the macOS prompt, an old launch was still suspended before app startup. That process was gracefully terminated; a normal Finder launch then reached the responsive Home interface with the correct version, saved tabs, configured computer name and running-chat count. Process and accessibility checks verified the new launch. Protected-container hashes were unavailable; no byte-level native app-data preservation claim is made.

Physical iPhone/iPad retain the previously installed 0.2.12 / 2610.11.1; the new native interface was tested on both simulators.

Receipts, installation recovery copies, production backup/restore evidence and access details are kept outside this repository.

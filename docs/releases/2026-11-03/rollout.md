# Nov 3 rollout

Version: 0.2.42

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Coordinating Mac | darwin-arm64 | 0.2.42 | installed | Installed through the owner updater at `568705c`: owner health verified, strict signature passes, preservation covers 148 chats, 8 workspaces, 18 projects, 239 tabs and 3 windows. Each window kept its logical tab order and hidden flags (73, 100 and 102 tabs); many runtime tab IDs were remapped, and one tab was closed deliberately beforehand. Window `95d4f6ed` logged one startup `state` failure and recovered on its second attempt, the new retry path working. Not verified: that every saved tab is visibly represented, full Back/Forward history, reading state. |
| Linux builder | linux-x64 | 0.2.42 | staged | Built at `568705c`: install hash `32029f76…778c`, unsigned, not published or installed. 14 of 15 packaged tests pass, and `desktop-package-ui` passes on the fixture corrected in `5b835fa`. See the qualification in [implementation](implementation.md). |
| Windows builder | win32-x64 | 0.2.42 | blocked | The operator must review or resume this computer in Connections. No other computer substitutes. The publisher key also stays here, so publication waits on it too. |
| iOS physical | ios | 0.2.42 | installed | iPhone and iPad run 2611.3.2 (executable `84762e19…6852` at pin `5501776`). Protected files preserved before launch (314 and 199), 4 destinations each, keychain groups preserved, two recoveries per device. Gestures, push and reconnect on real hardware are not verified. |
| iOS simulators | ios | 0.2.42 | installed | Preview identities on the shared iPhone and iPad updated in place to 2611.3.2 with pairing kept and protected data hash-checked unchanged. Simulator only: not evidence of device feel. |
| Website | web | 0.2.42 | installed | Release `20261105T041839Z` (9,222 files, archive `9fc4a728…9048`) is live: the tool's own activation and 14-endpoint audit passed, login responds, and the served worker asset hash matches the build. Ordinary isolated restore failed and captured-state verification passed, as on Nov 2. Signed-in use of the new worker client is not verified. Server-side retention is not done (see below). |
| Relay | service | 0.2.42 | deferred | The heartbeat fix takes effect only when redeployed. Not done. |
| Work Mac | darwin-arm64 | 0.2.42 | installed | Installed by a local update chat on that computer through the private draft route (release `434796732`, assets `712116790` to `712116792`; sizes and SHA-256 matched). Reported by that chat and not independently verified by the coordinator: build `568705c5b637+src.7d643eda3743` with the pinned source fingerprint, updater job complete with owner health verified, strict signature passes for team `TEAMID0000`, 2 verified recoveries, free space -795,734,016 bytes. Not verified: `desktop.window-restore` events, and preservation of chats, schedules, pairings and window tabs (the operator should look). Transfer files removed from that computer. The remote dispatch from the coordinator never reached it: the computer's command history was at its 256 MiB cap, so no chat was created by it. |
| Other desktops | mixed | 0.2.42 | deferred | `linuxlaptop`, Ian's laptop and the Windows computer are deliberately deferred by the operator. Linux has a built, unsigned package (install hash `32029f76…778c`); Windows has not finished building and holds the publisher key. These keep Nov 2 and still receive whole-state traffic. |

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

## Live traffic reading (coordinating Mac, new owner, 138 s)

Sent: state 41.6 MB, replies 17.2 MB, tabs and other under 25 KB, or about 0.43 MB/s in all, against about 1.95 MB/s on Nov 2. This is one short sample. Most of what remains is whole-state traffic to clients that have not updated: the deferred desktops and the web until its deploy. Re-measure once they update.

## Open items

- **Server-side retention:** the new web release added a server code generation and a server recovery. Retiring the older ones needs the server's root shell route with exact pinned hashes, which the deploy tool does not do. The server may currently hold more than the one backup and two code generations the policy allows.
- **Relay:** the disconnect fix lives in `relay/` and takes effect only when the relay is redeployed. Not done.
- **Publication:** nothing is published to downloads.proteus.example. The Windows build, publisher signing and the other computers are deferred.
- **Private draft release `434796732`** (Mac archive, source companion, manifest) is retained until closeout in case another Mac needs it. It is private and never published. Delete it once the Mac package is published or no longer needed.

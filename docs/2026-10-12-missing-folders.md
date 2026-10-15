# Missing supplemental folders and chat creation

The reported failure came from treating every configured additional/every-chat folder as a mandatory directory during context capture. An unavailable sibling also failed remote starting-folder membership checks before capture.

The correction omits unavailable supplemental roots and their cached source entries from the execution snapshot, preserving the stored configuration and base folder list. The chat records a system warning and the provider receives the same omission information. A restored folder can be included after context refresh. Local and encrypted remote creation share this policy.

The chosen starting folder still must exist. Explicit main-agent selection, changed source content, individual missing files within an available folder and MCP canonical identity remain strict. Existing captured chats are not retroactively rewritten by this release.

Verification:
- Regression failed first with the reported ENOENT error, then passed for stale and refreshed catalogs, selected missing-folder sources, restored roots and persisted warning events.
- Encrypted remote regression covers a missing sibling before the chosen folder, a valid alternate starting folder, and invalid/unconfigured starting-folder rejection.
- 442 Node tests and static checks passed.
- Isolated desktop UI rehearsal visibly opened and completed a chat with the warning, retained its available instruction and left configured paths unchanged. No AI provider was called.
- Signed package launch, original vendor signatures and all 187 shipped runtime hashes verified.

Desktop build: **0.2.12 / ec8b213d382e+dirty.bbf0630ac8a7**.
Primary computer installed and visibly connected; 65,480 application-data files preserved before relaunch, same signing certificate and recoverable backups retained. Second computer installed and verified through the authorized private transfer: same build/signature and 187 runtime/source hashes, latest folder mappings, two workspaces, 56 tabs, chats, approvals and five pairings preserved; app, relay and peer connections online. Web and native clients use the corrected owner-host route; their binaries/assets are unchanged by this correction.

Private backup/install and transfer receipts remain outside the repository.

# October 7 desktop tab-layout correction — 0.2.7

The operator requested a fix and deployment to both Macs after shell and Markdown/file children shifted navigation borders. The strip inherited negative margins tied to conversation padding; documents and terminals use different padding, including at responsive breakpoints.

Navigation now belongs directly to the workspace above the content panel. All chat children share one 38-pixel row, full workspace width, independent of view padding and scrolling. Close separators and the last-tab border remain intact. Website/native deployments are outside this correction; their installed version stays 0.2.6.

## Validation

- Isolated Electron checks pass for chat, Markdown, actual shell and browser at 1440, 1000, 850 and 650 pixel windows, including document scrolling, both edges, top alignment, row height, close separators and trailing border. The strip disappears when leaving a chat.
- Remote document descriptor import, approval boundary, rename/reorder/close, restart and revocation checks pass, including strip geometry in the remote file view.
- All 385 backend tests and `npm run check` pass. The search/chat UI suite passes, including Enter/Shift+Enter and close/reopen restoration.
- Signed package launch, all 151 runtime hashes and vendor signatures pass.
- Installed Build Mac visually verified with an existing remote file tab: flush full-width navigation, normal borders and close separators. Restored the original chat selection without requesting document content or sending a model turn.

## Deployment

Both Macs started this correction on verified 0.2.6. Source `1b37ccd6eb4a670325c013fab4e227080d7b5acd`; signed build `1b37ccd6eb4a+src.190800a133ff`, fingerprint `190800a133ff93b4c9187d749023d5513d73facf4e5eff0bbb3d0bc9f37f6e14`.

| Target | Status |
| --- | --- |
| Build Mac | Installed and running 0.2.7. Original signer, all 151 runtime inputs, served renderer/CSS and current process verified. Seven local runs, six schedules, four pairings, credentials/grants, existing history and 24 original ordered tabs preserved; two additional remote descriptors synchronized after launch. Relay and Life online. Full cold app/data backups retained. |
| Work Mac | 0.2.7 signed package staged and independently verified (151 runtime hashes, archive and original signatures). Still running 0.2.6: installation chat reports an open live terminal and pending direct approval because the originating chat is inaccessible there. No app/data changes by that preparation. |

The local startup check initially reached Life before readiness; the subsequent read-only verification passed after connection readiness settled. During installed remote-file inspection, the previously recorded disconnected-peer toast appeared; this layout correction does not claim to resolve that separate connection warning. The document request boundary was left intact.

Private update artifact, cold app/data backups and receipts are retained outside Git. The signed delta is available in the private repository at immutable artifact commit `1e9e9205967a0aa8cd43348f3171f3715305022b`.

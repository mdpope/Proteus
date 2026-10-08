# October 7 desktop tab-layout correction — 0.2.7

The operator requested a fix and deployment to both Macs after shell and Markdown/file children shifted navigation borders. The strip inherited negative margins tied to conversation padding; documents and terminals use different padding, including at responsive breakpoints.

Navigation now belongs directly to the workspace above the content panel. All chat children share one 38-pixel row, full workspace width, independent of view padding and scrolling. Close separators and the last-tab border remain intact. Website/native deployments are outside this correction; their installed version stays 0.2.6.

## Validation

- Isolated Electron checks pass for chat, Markdown, actual shell and browser at 1440, 1000, 850 and 650 pixel windows, including document scrolling, both edges, top alignment, row height, close separators and trailing border. The strip disappears when leaving a chat.
- Remote document descriptor import, approval boundary, rename/reorder/close, restart and revocation checks pass, including strip geometry in the remote file view.
- Additional suite/static/package checks and installation receipts are recorded below when complete.

## Deployment

Both Macs started this correction on verified 0.2.6. Signed 0.2.7 packaging and installation are pending. Preserve original signing, credentials, grants, pairings, chat/schedule records and browser descriptors. Private app/data recovery receipts remain outside Git.

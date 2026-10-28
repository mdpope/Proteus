# 0.2.33 follow-up acceptance

The operator reports continuing HC typing/scrolling stalls and authorizes building the pending
changes and deploying on Build Mac. This update targets Build Mac only. HC remains on
0.2.32 during read-only diagnosis; mobile and website deployment are separate.

## Implemented

- Preserve the first blank main-strip browser tab through initial owner reconciliation, including
  double-click creation and native-state arrival before the create reply.
- Complete permission display's existing synchronous path memo for inherited working/read-only
  folders, scheduled fallbacks, chat working folders, explicit schedule folders and automatic
  provider-folder displays. Actual authorization remains fresh. The memo is bounded to 1,024
  exact cwd/path pairs and expires at the next microtask.
- Retain the prior opt-in phone/tablet live-owner pairing and saved-pairing reconnect tests.
  These do not change the native app runtime; their 0.2.32 acceptance remains in the earlier ledger.

## Evidence before packaging

HC's bounded diagnostics show 28 of 32 recent lag events overlapping `http.state.assemble`,
median lag 963 ms / max 1,276 ms. Its last 128 assembly samples average 1,154 ms / max 1,967 ms.
Session saves and context reads are much shorter. A short owner sample contains filesystem-stat
and hashing stacks. This supports state assembly as a demonstrated bottleneck; neither the
snapshots nor samples identify every typing/scrolling freeze. Two uninstrumented 13.4–13.5 s
delays remain unattributed, and the sample was not tied to a confirmed operator gesture.

The new inherited-permission regression fails before the correction: one display snapshot performs
124,129 lstat and realpath calls each for 500 chats / 12 roots. After correction, that fixture
performs 14 of each and retains exactly matching permission output. Direct descriptions observe
symlink changes immediately; retained display snapshots refresh after a microtask; read-only and
revocation checks remain authoritative. All 24 focused permission cases pass.

Real disposable Electron owner with 500 captured chats / 12 inherited roots: installed 0.2.32
assembly maximum 427.18–447.68 ms / maximum 5 ms timer gap 439.05–455.10 ms across two runs; corrected source 76.66 ms /
84.46 ms respectively. Chat records remain unchanged. These are synthetic host measurements,
not HC installed acceptance or proof that every hang is fixed.

Full Node suite: 1,238 passes / three platform skips / zero failures. Static checks pass.
Real double-click main/project tab creation and native early URL/Enter buffering pass separately.
Initial sandbox temp failures and a corrected test-harness require import remain private evidence.

## Packaging and deployment

Pending exact signed package acceptance, fresh unassigned saved-default coordinator handoff,
installed health/continuation and preservation verification. Mac unlock is verified before the
existing signing identity is checked. Two registered recoveries pass the preflight inventory;
eight obsolete inactive desktop build payloads were retired under the retention policy, retaining
compact identities and the current tested build. The observed cleanup volume delta includes
concurrent activity and did not establish a physical-space saving. Separate Apple-review,
design-preview and native/mobile identities remain untouched. No build-only live-data backup
was created. Private inventory, traces and receipts stay outside Git.

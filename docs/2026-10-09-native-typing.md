# Native chat typing investigation and verification

**October 10 rollout:** The later build/install approval lifted the hold. The typing fix is now
installed and launched on physical iPad and iPhone in 0.2.10 / 2610.10.1. Protected records were
preserved; physical typing performance remains user acceptance. See the
[installation ledger](2026-10-10-installation.md), including the signing-expiry limitation.
The original no-deployment checkpoint below is historical.

BF-2026-10-09-38 was explicitly authorized for investigation and a fix. The later operator
instruction holds further builds until queue/design review is complete. The running iPhone
simulator check finished; the final iPad check uses those compiled binaries with
`test-without-building`. No physical-device update or application deployment occurred.

## Source findings and changes

An existing-chat keystroke changed parent `ChatView` state and published `RemoteStore.drafts`,
invalidating loaded-event filtering and conversation views. The draft-save timer also encoded,
encrypted and wrote the entire cached history on the main actor. Longer histories increase that
work. Each Markdown row created its own ephemeral website store, and idle Find callbacks
published zero-count entries into the parent search model. These source hot paths are confirmed;
the operator's physical-device latency has not been profiled.

The composer now owns text observation through `NativeReplyComposer`/`NativeReplyDraft` while
`ChatView` retains an unobserved reference. Edits save immediately in memory without broadcasting
host-state changes. Other draft/attachment actions still notify. Automatic cache work uses a
serial utility queue; lifecycle flush/delete ordering prevents older writes replacing the latest
draft or recreating forgotten history. Cache format and protection are unchanged.

Bundled Markdown renderers share one ephemeral store with individual script bridges; browser
profiles and interactive HTML artifacts retain separate stores. Idle Find does not run search
JavaScript or publish zero counts. Single-Return detection uses a linear UTF-8 check, preserving
multiline paste, autocorrection and Unicode instead of computing a Character difference per edit.

## Verification

- `npm test`: 402 passed. The sandbox-only attempt could not create temporary test files; rerunning
  with normal temporary-file/local-server access passed.
- `npm run check`: passed. Scoped `git diff --check`: passed.
- iPhone 18 Pro simulator, iOS 27: 33 native unit tests passed, covering draft isolation,
  2,000-event encrypted cache retention, ordered flush/forget, renderer-store boundaries, idle
  search, Unicode/Return handling, provider continuation and independent destinations.
- iPhone UI: keyboard Send/new-chat feedback and long-chat typing tests passed. Type 210 characters
  against a 180-line message and against 100 loaded messages; verify exact text, navigation and
  background retention. History counters reported 5 and 11 passes respectively, including
  layout/focus work, rather than one transcript traversal per character.
- iPad Pro 13-inch simulator, iOS 27: the initial composer/cache fix passed both typing cases and
  two unit tests. Final source passed both long-history typing cases and draft retention using
  the already compiled iPhone-run binaries with `test-without-building`; no new build.
- Desktop Electron smoke: current chat selectors, model choice, a 5,250-character draft and keyboard
  edits passed in an isolated synthetic app. The legacy composer test used obsolete `data-run`
  selectors; the chat-lifecycle test failed its unrelated Archived-badge expectation. Neither
  failing test was changed or counted as passing.

XCTest typing durations include automation/accessibility overhead and are not physical keyboard
latency measurements. Synthetic fixtures contain no provider usage or operational chat content.
No release artifact is claimed to contain this follow-up until builds resume.

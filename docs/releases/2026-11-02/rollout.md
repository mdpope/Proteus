# R12 — current review hold

Review hold: both shared simulator Preview apps must be reviewed before any new physical-device
build/installation, desktop release package, publication or rollout. Old accepted packages retain
their historical identity and cannot be promoted as R12. Related superseded Windows/Linux builder
turns are verified cancelled; queued old-source requests remain retained and require reconciliation
before reuse. No unrelated work was cancelled.

Physical apps remain R1–R8 / 2611.2.1. Signed R9 / 2611.2.2 was built before the hold and is not
installed. Normal simulator apps/data remain separate from the Preview identities. The historical
ledger below does not describe R12 distribution. Latest deployed website is R9: activation/file/
endpoint audit passed; ordinary restore failed; captured-state verification passed with live-state
comparison not performed. Final served-asset/retention closeout remains open.

---

# Nov 2 rollout

Version: 0.2.41

| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |
| --- | --- | --- | --- | --- |
| Primary Mac | macOS arm64 | 0.2.41 | staged | Apple-signed package accepted; exact-package UI, extraction, integrity and corresponding source verify. Original publisher signature required before publication/update coordination. |
| Secondary Mac | macOS arm64 | 0.2.41 | not started | Browser/Outlook installed-source diagnostics complete. Reuse the exact accepted Mac package after publication; installed Outlook/vault acceptance remains. |
| Primary Windows | Windows | 0.2.41 | blocked | Designated native build chat awaits its ordinary destination-owned preflight approval; clean application/source pin queued. |
| Secondary Windows | Windows | 0.2.41 | not started | Must reuse accepted compatible Windows artifact. |
| Primary Linux | Linux | 0.2.41 | blocked | Designated native build chat awaits its ordinary destination-owned preflight approval; clean application/source pin queued. |
| Website | Web | 0.2.41 | installed | Frozen-source deployment activated and audited: 9,221 file hashes, nine served HTTPS assets, fourteen endpoints, schema/runtime/protected-data preservation and ordinary isolated recovery restore pass. Final retention verifies two local recovery dates, one server recovery and two code generations. Real inference and authenticated browser workflows remain separate. |
| iPhone | iOS | 0.2.41 | installed | Frozen R1–R8 build 2611.2.1 installed in place and launched; all 350 protected files matched before first launch, four saved destinations retained, signing/keychain entitlements unchanged. Two verified recovery generations remain. Later R9 is not included. |
| iPad | iPadOS | 0.2.41 | installed | Same frozen R1–R8 artifact installed in place and launched; all 186 protected files matched before first launch, four saved destinations retained, signing/keychain entitlements unchanged. Two verified recovery generations remain. Later R9 is not included. |

Stages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.
Keep secrets, machine IDs, private paths and raw receipts outside Git.

Frozen application/source pin: `f75f98f7f2e623acdb77adedb2a0da7e09785fa7`.
The validation-only harness correction and later release records do not relabel that artifact.
Subsequent R9 source is under validation for a replacement candidate; earlier desktop promotion
is held. Existing website/mobile installations retain the earlier pin and do not acquire R9 from
these source edits.
The release remains open; package acceptance and simulator results do not establish installed
desktop behavior, real Bitwarden authentication or physical mobile acceptance.

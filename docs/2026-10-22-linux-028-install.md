> Release-specific acceptance for the recorded 0.2.28 artifact. This is historical
> deployment evidence, not acceptance or installation authorization for 0.2.29.

# October 22 — unified Linux 0.2.28 deployment

**Installed and live verified:** Proteus **0.2.28 / `linux.929eeeed2ab8`**. This supersedes
`linux.c88e46430428`. The exact frozen source is on separate branch
`linux/release-0.2.28-0e5c`; the original checkout and previous release branch are preserved.
The relay is **enabled/online**, and an existing authenticated **Mac peer** passed a read-only
integrations inventory request. No pairing, permission, schedule or default-browser setting was reset.

## Artifact and source identities

| Item | Verified identity |
| --- | --- |
| Private transfer | `codex/signed-proteus-028-0e5c-20261022` at `19b8239a35710b521ead739ca170b53c2b177e1f` |
| Source import | `2725a26855802363d4d9d2612cd58d0ea2e1a85c` |
| Transfer index SHA-256 | `3852c6d85874d35079081ee29b2d011d3941be0fbe4f66f6ec7e53e6732670a4` |
| Source archive SHA-256 | `8edf0f1e553082d858cba68053d7f23c8c94478a9f4d3e6754e957ce7650f22d` |
| Linux source fingerprint | `929eeeed2ab8285151ca4bb14f2e6f936a2ebf9232c8e2b6c55bde2a4f08b537` |
| Linux bundle tree SHA-256 | `352a69ccab145567d299a927aa6ca954cbe67068a38507632f6a3afbab990849` |
| Linux archive SHA-256 | `1c027948c135056e5ef488c057487ddf3b66d1a5895eb886f58d240f80ad7881` |

All **1,109 source files** verified before import. All **299 runtime files** match the frozen
source and packaged manifest. Linux runtime deviations: **none**. The intentional independent
Linux build-input change is `docs/linux-upstream-source.json`; its upstream Mac identity describes
source context, not a Linux binary signature. Compared with installed c88, runtime changes are
CHANGELOG, new external URL handling, main-process wiring, message rendering and palette CSS.
Nine Linux integration modules remain exact; the main/preload Linux controls and routing are
retained. Twenty-one sensitive host/relay/peer/platform/credential/updater files are unchanged.
No Mac/iOS package, public download page, Apple submission or OS default-browser registration
was performed by this Linux deployment.

## Tests and UI

All **868 Node tests** and static checks pass. The targeted host suite passed **76/76** checks
(included in that total). Exact-package inspection and independent helper smoke passed without
changing candidate bytes or making a second full app copy. Prior normal-update/compatible-rollback
receipts remain evidence for unchanged implementation; they are not a new exact-artifact rollback test.

The package passed isolated startup, private exclusions/provenance, synthetic rehearsal, native
PTY keyboard input and history across restart. Four source plus four exact-package UI checks pass:
message edges, incoming links/Home, virtual WebAuthn and Linux native window controls. The real
packaged main/renderer displayed synthetic completed user/assistant events with opaque 3px left
edges, transparent other edges, retained alignment and viewport containment. Incoming URL tests
preserve repeated URLs, human-tab grants, existing history and reopen behavior. WebAuthn used a
virtual CTAP2 authenticator and verified signature/challenge/origin/RP rejection; no Apple helper,
hardware authenticator or real account was used. Two unchanged source tests failed only at their
Mac-specific screenshot directory; those failures are retained alongside external path-only adapters
and passing full assertions. No tracked test/runtime code was altered for Linux acceptance.

Actual installed acceptance reads the already selected window without navigation, scrolling or
focus changes. The visible native window/topbar and all 12 restored tabs are present. No chat
messages were visible on that selected page, so message-edge visual acceptance is the actual-package
synthetic result above. The tray starts with Keep Screen Awake OFF. Prior exact video/awake checks
remain scoped evidence for unchanged code; physical sleep inhibition and native Wayland global
geometry are not newly certified.

## Preserved data and actual connectivity

The fresh stopped baseline protects **three chats / 681 events**, effective model/context/config,
workspace/project membership, approvals, drafts, tab identities/selection/history, 102 app JSON
hashes, 13 explicit protected configurations, **29 navigation entries**, **74 original no-TTL
navigation receipts**, **31 original visit rows**, **23 still-protected command receipts**, and
**17 cookie payloads**. All three run files are byte-identical across the final restart. No model
turn, pending input, queued/deferred work, terminal, enabled schedule, scheduler error or recovery
error was observed at the installation guards/final health check. A fresh Codex catalog confirms
the restored model is available without another model turn. Prior explicitly synthetic live Codex
continuation is referenced; it is not claimed as a fresh turn under this build.

The relay registration/identity/token/settings and encrypted pairing store remain byte-exact.
The installed trusted renderer read the existing native peer inventory, then performed a real
encrypted read-only `integrations.list` against the existing online Mac. No probe/login/recovery/
integration mutation was dispatched, and local navigation/selection/scroll stayed unchanged.
After a normal restart without debug flags, the existing authenticated owner chat-index API
confirmed that Mac online and all original cached chat identities retained. The final process,
runner lock and installed build agree on one owner; the relay is online. This verifies the actual
Linux-to-Mac read path, not physical phone use or every remote capability.

## Strict differences retained and narrowly resolved

The first strict receipt remains failed and unchanged. Its differences were independently checked
against the unmodified cold databases using the RAM-only SQLite reader:

- Exactly two existing navigation payloads changed **only `eventId`**. Primary keys, positions,
  entry IDs, URLs, titles, profiles and every other field remain equal. All 31 original visit
  rows and all 74 original navigation receipts are byte-exact. Each replacement visit belongs
  to the same owner/tab/entry/profile/URL/title and has a new durable operation receipt.
- The source-library catalog has zero entries before and after. Only its top-level and same-root
  `refreshedAt` values changed. Every other key/value is equal.
- The encrypted peer index normally refreshes/re-encrypts. Cold identities were hashed inside
  the actual owner; the final authenticated owner API verified them after normal restart.
  Pairing bytes remain independently exact. No claim is made that later opaque cache ciphertext
  was independently decrypted by the final verifier.

A separate narrowly constrained verifier passes all five gates while requiring every other
protected check. It does not edit live data, the original verifier or original failed receipt.
Its post-restart receipt SHA-256 is
`9d21169c0453251a31d0bc4171ebc0faba37e37a79d6af2be939c861414b4dd0`.

Visits/operation receipts continued accumulating during live peer traffic: the recorded comparison
was **31→416 visits / 74→459 navigation receipts**, while entries stayed 29 with the same two
rebinding identities. This is **not** described as a bounded one-time restore touch. Cause/rate
attribution and possible repeated-traversal behavior are deferred; no runtime fix was added here.

## Recovery coverage and retention

One fresh consistent app/data/profile generation captures the **current online relay and native
pairings**. Both prior generations and the new one were hash-verified before retiring the oldest
eligible helper generation. Exactly **two** verified full app/data/profile generations remain;
no full after-install copy or retry duplicate was created. The previous c88 app bytes are retained
in the fresh recovery, and the superseded c88 archive/extracted source duplicate was retired.
The frozen source archive/manifests, current Linux archive and compact private evidence remain.

The provider transcripts are external to the configured app/profile roots. The same fresh generation
therefore includes a bounded supplement of **two existing referenced files / 9,463,516 bytes**,
verified before/copy/after with private modes. **One older native transcript reference was already
missing before this deployment** and was not found by exact basename in the session/archive roots;
its complete Proteus chat record and session identity were preserved without fabricating a file.
The shared provider index/auth/config are external dependencies, not backed up or reset here.
Do not restore an older app snapshot or transcript over newer user work. Private recovery paths,
keys, prompts and provider session identifiers are not committed to this repository.

## Final measured space and private index

After cleanup and delayed reclamation, available space was **1,945,664,204,800 bytes**:
−35,450,880 bytes from the October22 preflight, and +724,017,152 bytes compared with staging.
These are observed filesystem values, including concurrent activity; logical snapshot/app sizes
are not equated with physical reclamation. The final private index contains **97 compact proof
files**, references exactly two verified full application recoveries, and has SHA-256
`d4a575f7ec820e7156e9036822cf7ad1f37b209ebcaddd4059c1b84b01285659`.
Recovery policy is bound to that index. No extra full retry or after-install snapshot remains.

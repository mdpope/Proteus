# Paid-account migration for native iPhone and iPad

The operator authorized this migration on October 18, 2026. It is separate from desktop
Developer ID signing, the native Mac wrapper, and TestFlight distribution. The paid mobile
identifier is `org.proteusapp.review.proteus`, team `TEAMID0000`. The prior Personal Team identifier is
`org.proteusapp.proteus.mobile`, team `TEAMID0000`.

Changing the signing prefix changes default Keychain access. The existing app's encrypted
pairings and caches cannot be preserved by copying files alone. See Apple's
[App ID prefix guidance](https://developer.apple.com/library/archive/technotes/tn2311/_index.html).
Keep the original installation and its recovery data until the paid application passes
installation, data, credential and launch checks. Never uninstall the original to force a
cross-team installation or revoke a certificate shared by other applications.

## Build and signing

Use the existing paid certificate on an unlocked signing Mac. `ios/PaidAccount.xcconfig`
provides the paid settings for a physical-device Release build of the Proteus scheme. Pass
an explicit current build number and isolated DerivedData path. Do not apply that file to
the existing native Mac installation or the simulator test bundles.

Verify the signature, exact certificate, application identifier, both registered devices,
entitlements and actual profile expiration. Freeze the source and signed artifact before
installation. The first paid candidate is 0.2.21 / 2610.18.2, with a profile expiring
October 16, 2027 at 22:03:20 UTC. Both physical-device migrations are now accepted; see below.
A valid build alone is not proof of a completed migration.

## Temporary migration helper

`scripts/native-signing-migration.swift` is a separately compiled temporary executable.
It is **not part of the normal application**. Sign one copy with the original app identity
and one with the paid identity, using each full app's exact entitlements and profile.
The helper uses the scene lifecycle required by current iOS SDKs. Its package must retain
`UIApplicationSceneManifest` with `UIApplicationSupportsMultipleScenes` set to false;
the app delegate supplies the scene class dynamically. A deferred launch callback and the scene
callback share one cached operation result, so a restored iPad scene cannot prevent execution
or run the transfer twice.

Run `test/native-signing-migration/run.sh` before signing. The helper has no network client
and never initializes the normal application stores. Exchange files live only in the
app-private `Documents/ProteusSigningMigration` directory:

Every launch also requires `--operation-id <fresh UUID>`. Accept a receipt only when its
operation ID matches that launch and `success` is true. A prior successful receipt does
not establish that the latest operation ran. Scene reconnects reuse the completed result
instead of repeating a migration operation.

1. `--prepare` on the paid helper creates a recipient private key in that device's paid
   Keychain and a public `request.json`. The private key never leaves the device.
2. Copy only that public request to the original helper. `--export` reads the exact Proteus
   pairing, browser-cache and website-account service allowlist and writes `envelope.json`,
   encrypted with Curve25519/HKDF/AES-GCM. It authenticates the recipient/request identities,
   credential records, source file hashes and cache counts together. It never deletes source keys.
3. Refresh the same verified recovery snapshot against `file-inventory.json`. Copy the
   authenticated file set to the stopped paid helper. Map only the original preferences
   filename to `Library/Preferences/org.proteusapp.review.proteus.plist`. Preserve all other durable paths
   and bytes, including WebKit stores, cookies, pending operations and retry receipts.
4. Copy the encrypted envelope to the paid helper. `--import` verifies the entire file set
   and decrypts recognized caches before writing any credential. It preflights conflicts,
   adds missing records only, refuses differing existing values and reads every value back.
   The original service names remain unchanged within the new app's default access group.
5. `--verify` repeats credential, byte and cache checks. `--cleanup` performs fresh verification
   before removing only the temporary recipient key/request/envelope; a hash-only checkpoint
   makes cleanup resumable. Save the nonsecret receipts privately before removing exchange files.
6. Replace the paid helper with the frozen full application, verify launch and saved destinations,
   and inspect restored navigation/connections. Retire the helper from the original identifier
   by restoring its exact original binary. Do not leave an unexpected helper as the old app.

`--inventory` is also available for an authenticated copy rehearsal. Exact OS snapshot paths
under `Library/SplashBoard/Snapshots/`, the inaccessible root `SystemData`, the root container-manager
metadata plist, and the reproducible `Library/Caches/WebKit/NetworkCache/` download cache and
`Library/Caches/com.apple.dyld/` loader cache are excluded. Physical copying
observed iOS deleting NetworkCache blobs after the client stopped. Keep `Library/WebKit`, cookies,
preferences and all Proteus application-support data under strict byte verification. The loader
cache is regenerated for each application container; physical source/destination comparison
confirmed it was the only changed file after the first verified transfer. Excluded
subtrees are counted; their file count is explicitly unknown when traversal is intentionally skipped.
Never copy the old container-manager identity over the new container's identity.
Unknown historical website-account cache identities retain identical ciphertext and the same
browser key; receipts explicitly distinguish these files from caches whose contents were inspected.

Pause only the selected native client for the cold copy; execution remains owned by its paired
computer. Parse process executable URLs before matching them to the installed app URL. Use
atomic local file replacement and bounded folder batches, retaining partial-copy progress on
device locks or transport failures. Do not launch the full paid app before import verification:
its ordinary startup may otherwise generate a new cache key that correctly conflicts with import.

## Acceptance and retention

Keep device identifiers, file inventories, credentials, encrypted transfer files and receipts
outside Git. Never print credential values. Use the two-generation policy in
[desktop updates](desktop-updates.md#two-generation-backup-retention) per physical device.
An already accepted snapshot must not be silently rewritten; reuse a still-current in-flight
snapshot or create one bounded new generation and retire the oldest after acceptance.
Remove temporary transfer trees after verified copying; do not retain an extra full after-copy.

Record each device separately as prepared, installed, credential/data-verified and launch-verified.
Account sign-in, website-session continuity and every physical UI gesture require their own actual
observations; a file hash or running process does not establish them. The native parity ledger
records the accepted release and remaining limitations.

## October 18 physical acceptance

Both devices have paid Proteus **0.2.21 / 2610.18.2**, with strict signature/profile/device checks,
authenticated file and credential verification, helper cleanup, production launch and a second
launch. Each retains two saved destinations and four credential records. The original applications
remain closed as **Proteus Legacy**, with unchanged executable code and data. Only their display
names and link-handler registration changed, followed by normal original-team re-signing;
the unsigned Mach-O contents were compared with the original. Their old link handlers were removed
so the paid app receives future links. Use **Proteus**, opened at completion; do not run both
identities concurrently. Exact original app bundles remain in verified recovery storage.

| Preserved data | iPhone | iPad |
| --- | ---: | ---: |
| Strictly verified files | 94 | 112 |
| Verified bytes | 81,169,589 | 94,325,752 |
| Cached chats | 29 | 23 |
| Browser tabs | 55 | 67 |
| Drafts | 6 | 7 |
| Cached history entries | 6,263 | 4,648 |
| Document tabs | 1 | 1 |

These are local cache counts, not the total authoritative chats on paired computers. Pending
scopes and request receipts matched as well. Both devices' selected destinations survived restart.
Build Mac independently confirmed the iPhone reconnecting with its existing pairing. The iPad's
selected HC connection, website sign-in continuity and every physical navigation gesture were not
independently exercised after this signing migration; do not infer them from file hashes.

The final helper passes 46 synthetic checks and iOS type-checking; the accepted phone used the
44-check predecessor, and the iPad used the additional restored-scene startup fallback. The paid
product runtime matches the previously accepted native source. The 737 runtime tests and source
checks pass. Native Mac, Electron desktop, web deployments and shared certificates were unchanged.

Each physical device retains two verified recovery generations. Retirement removed 1,648,364,091
logical bytes; measured free space increased by 378,376,192 bytes during those rotations. APFS
sharing and concurrent work explain the difference. Private receipts retain the exact source,
artifact identity, exclusions, manifests, operation IDs and acceptance evidence. Temporary transfer
copies and superseded device recovery generations were retired after acceptance.
Retiring the completed helper packages/compiler intermediates separately removed another
53,979,298 logical bytes and increased measured free space by 52,420,608 bytes. Combined measured
cleanup reclaimed 430,796,800 bytes; the signed paid release and frozen source remain available.

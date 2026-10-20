# Temporary signing migration bridge checks

Run `test/native-signing-migration/run.sh` with Xcode selected (or an explicit `DEVELOPER_DIR`).
The macOS executable uses synthetic credentials and a disposable directory. It never accesses
Keychain, physical devices, live containers, signing accounts or network services.

The bridge source is compiled separately for each authorized iOS identity. It must not be added
to the normal app target. The UIKit entry point has no Proteus stores or network initialization. Keep
`UIApplicationSceneManifest` in the helper Info.plist, with
`UIApplicationSupportsMultipleScenes` set to `false`. The app delegate returns its scene
configuration and scene-delegate class dynamically; no storyboard or hardcoded Swift module/class
name is required. The scene creates a `UIWindow(windowScene:)` and invokes migration once per
process, retaining that receipt across subsequent scene connections. A deferred main-queue
`didFinishLaunching` fallback uses the same one-shot path, so a restored original-app scene cannot
prevent execution. Either callback order retains the first success/failure receipt and never repeats
a migration mutation.
Exchange files live in `Documents/ProteusSigningMigration`:

- `--prepare`: recipient-only transport key in Keychain; public `request.json`.
- `--inventory`: `file-inventory.json` containing sorted paths, sizes and SHA-256 hashes.
- `--export`: authenticated source inventory, cache counts and allowlisted credentials inside
  `envelope.json`, encrypted to the recipient's public key. No plaintext credential file.
- `--import`: authenticate context, validate all records, verify all copied file bytes and cache
  counts, reject differing destination credentials, then add missing items with exact readback.
- `--verify`: repeat authenticated inventory, key and cache verification before normal app launch.
- `--cleanup`: freshly reverify, checkpoint only public hashes, remove the transport key and
  request/envelope. Interrupted cleanup can resume without deleting another migration's inputs.

Every launch requires exactly one `--operation-id <UUID>`. Every mode writes its own
`*-receipt.json` with that exact `operationID`, including operation failures. Invalid/missing nonce
arguments produce an `invalidOperationID` failure with an empty operation ID and never run a mode.
Orchestration must wait for a receipt matching its newly generated nonce and require success;
a previous launch's receipt is never acceptance evidence.
Source preferences map only to the destination bundle's preferences filename. OS container identity
metadata and SplashBoard snapshots are excluded explicitly. Unknown historical browser-account AAD
is reported as uninspected: its encrypted bytes and original browser key are preserved by the
manifest, but it is not claimed decrypted. No source credentials are removed.

Failure receipts expose a fixed `failureStage` and fixed reason category. Private file-operation
receipts additionally carry only the relative path, NSError domain/code and underlying domain/code.
They never contain localized errors, absolute paths, credential values or file contents. Inventory prunes the exact OS snapshot subtree before
reading protected entries; `excludedOSSnapshotRoots` counts pruned roots and a snapshot-file count
of `-1` means unknown, not zero. Missing legacy optional cache collections follow the native reader's
empty defaults; present wrong types and failed authenticated decryption remain fatal.

Inventory uses a manual directory walk without URL metadata prefetch. The sole additional cache
exclusion is the exact `Library/Caches/WebKit/NetworkCache` subtree, after observed physical OS
maintenance deleted its HTTP download blobs while the client was stopped. Its roots are counted
separately; `excludedWebKitNetworkCacheFiles = -1` explicitly means an unknown file count. Durable
`Library/WebKit`, Cookies, Preferences, Application Support and all other caches remain strict.
Unexpected disappearance outside this exact allowlist remains an explicit failure.

The exact root `SystemData` directory is also excluded after the device returned EPERM and its
file service exposed no app-readable entries. It is counted independently with unknown file count
(`-1`). This never matches nested app-owned folders such as `Library/Application Support/SystemData`.
Permission failures anywhere else are still fatal.

The exact `Library/Caches/com.apple.dyld` loader-cache subtree is excluded/count-reported after
source/destination device inventories proved its regenerated bridge cache was the sole byte mismatch.
All other caches remain strict; this is not a general Library/Caches exclusion.

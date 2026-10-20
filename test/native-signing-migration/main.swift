import Foundation
import CryptoKit

@main enum MigrationTests {
    static func main() throws {
        var passed = 0
        func expect(_ value: @autoclosure () throws -> Bool) throws { guard try value() else { fatalError("Assertion failed") }; passed += 1 }
        func rejects(_ block: () throws -> Void) { do { try block(); fatalError("Expected rejection") } catch { passed += 1 } }
        for fallbackFirst in [true, false] {
            let once = MigrationOneShot<MigrationReceipt>(); var mutations = 0
            let first = once.run { mutations += 1; return MigrationReceipt(mode: fallbackFirst ? "fallback" : "scene", success: false, operationID: "synthetic", error: "fixtureFailure") }
            let second = once.run { mutations += 1; return MigrationReceipt(mode: "duplicate", success: true) }
            try expect(mutations == 1 && second.mode == first.mode && !second.success && second.operationID == "synthetic")
        }
        let operation = UUID().uuidString
        try expect(SigningMigration.launchOperationID(["bridge", "--prepare", "--operation-id", operation]) == operation)
        rejects { _ = try SigningMigration.launchOperationID(["bridge", "--prepare"]) }
        rejects { _ = try SigningMigration.launchOperationID(["bridge", "--operation-id"]) }
        rejects { _ = try SigningMigration.launchOperationID(["bridge", "--operation-id", "invalid"]) }
        rejects { _ = try SigningMigration.launchOperationID(["bridge", "--operation-id", operation, "--operation-id", operation]) }
        do {
            let _: Int = try SigningMigration.diagnose(.exportInventory) {
                try SigningMigration.diagnose(.inventoryFileRead) { throw NSError(domain: NSCocoaErrorDomain, code: 257, userInfo: [NSFilePathErrorKey: "/private/secret/path"]) }
            }
            fatalError("Expected safe diagnostic")
        } catch let error as MigrationDiagnostic {
            try expect(error.stage == .inventoryFileRead && error.reason == "fileOrJSONOperationFailed")
        }
        do {
            let _: Int = try SigningMigration.diagnoseFile(.inventoryEnumerate, relativePath: "Library/Fixture") {
                throw NSError(domain: NSCocoaErrorDomain, code: 260, userInfo: [NSFilePathErrorKey: "/private/never-output", NSUnderlyingErrorKey: NSError(domain: NSPOSIXErrorDomain, code: 2)])
            }
            fatalError("Expected private file diagnostic")
        } catch let error as MigrationDiagnostic {
            try expect(error.details?.relativePath == "Library/Fixture" && error.details?.code == 260 && error.details?.underlyingCode == 2)
            let encoded = String(decoding: try SigningMigration.encoded(error.details), as: UTF8.self)
            try expect(!encoded.contains("never-output") && !encoded.contains("NSFilePath"))
        }
        let recipient = Curve25519.KeyAgreement.PrivateKey()
        let request = MigrationRequest(migrationID: UUID().uuidString, requestID: UUID().uuidString, recipientPublicKey: recipient.publicKey.rawRepresentation)
        let host = UUID().uuidString
        let connection: [String: String] = ["hostId": host, "deviceId": UUID().uuidString, "relay": "wss://fixture.invalid", "key": String(repeating: "12", count: 32)]
        let pairing = MigrationRecord(service: SigningMigration.source, account: "paired-mac:" + host.lowercased(), value: try JSONSerialization.data(withJSONObject: connection))
        let browser = MigrationRecord(service: SigningMigration.source + ".browser", account: "cache-key", value: Data(String(repeating: "34", count: 32).utf8))
        let records = [pairing, browser]
        let envelope = try SigningMigration.seal(records, request: request)
        try expect(SigningMigration.open(envelope, expected: request, recipient: recipient) == records)
        var changed = envelope.ciphertext; changed[changed.count - 1] ^= 1
        rejects { _ = try SigningMigration.open(MigrationEnvelope(request: request, ephemeralPublicKey: envelope.ephemeralPublicKey, ciphertext: changed), expected: request, recipient: recipient) }
        rejects { _ = try SigningMigration.open(envelope, expected: request, recipient: Curve25519.KeyAgreement.PrivateKey()) }
        var wrong = request; wrong.requestID = UUID().uuidString
        rejects { _ = try SigningMigration.open(envelope, expected: wrong, recipient: recipient) }
        wrong = request; wrong.migrationID = UUID().uuidString
        rejects { _ = try SigningMigration.open(envelope, expected: wrong, recipient: recipient) }
        wrong = request; wrong.targetBundleID = "unrelated.app"
        rejects { _ = try SigningMigration.context(wrong) }
        rejects { try SigningMigration.validate([MigrationRecord(service: "unrelated", account: "secret", value: Data([1]))]) }
        rejects { try SigningMigration.validate(records + [pairing]) }
        rejects { try SigningMigration.validate([MigrationRecord(service: SigningMigration.source, account: "paired-mac:not-a-uuid", value: pairing.value)]) }
        try SigningMigration.validateCleanupContext(request, current: nil); passed += 1
        try SigningMigration.validateCleanupContext(request, current: request); passed += 1
        var other = request; other.migrationID = UUID().uuidString
        rejects { try SigningMigration.validateCleanupContext(request, current: other) }
        var vault: [String: Data] = [browser.identity: Data("conflict".utf8)]; var writes = 0
        rejects { try SigningMigration.importRecords(records, read: { vault[$0.identity] }, add: { writes += 1; vault[$0.identity] = $0.value }) }
        try expect(writes == 0 && vault[pairing.identity] == nil)
        vault = [:]
        try SigningMigration.importRecords(records, read: { vault[$0.identity] }, add: { writes += 1; vault[$0.identity] = $0.value })
        try expect(writes == 2)
        try SigningMigration.importRecords(records, read: { vault[$0.identity] }, add: { writes += 1; vault[$0.identity] = $0.value })
        try expect(writes == 2)
        rejects { try SigningMigration.importRecords(records, read: { _ in nil }, add: { _ in }) }
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let root = temporary.appendingPathComponent("source/Library/Application Support/Proteus")
        try FileManager.default.createDirectory(at: root.appendingPathComponent("hosts/" + host), withIntermediateDirectories: true)
        try JSONSerialization.data(withJSONObject: ["version": 1, "selectedID": host, "destinations": [["id": host, "label": "Fixture"]]]).write(to: root.appendingPathComponent("destinations.json"))
        func cache(_ value: Any, _ path: String, _ key: String, _ aad: String) throws {
            let bytes = try JSONSerialization.data(withJSONObject: value); let sealed = try AES.GCM.seal(bytes, using: SigningMigration.hexKey(key), authenticating: Data(aad.utf8)); try Data(sealed.combined!.base64EncodedString().utf8).write(to: root.appendingPathComponent(path))
        }
        try cache(["chats": ["fixture": [:]], "drafts": ["fixture": "private fixture draft"]], "hosts/" + host + "/cache.enc", connection["key"]!, "proteus-cache-v1")
        try cache(["tabs": [[:], [:]], "contentRequests": ["scope": [:]]], "document-tabs.enc", String(repeating: "34", count: 32), "proteus-mobile-document-tabs-v1")
        try cache(["cache": ["fixture": [[:], [:]]], "outbox": [[:]]], "browser-history.enc", String(repeating: "34", count: 32), "proteus-mobile-history-v1")
        try FileManager.default.createDirectory(at: root.appendingPathComponent("browsers"), withIntermediateDirectories: true)
        let historical = "https://old.fixture.invalid|old-account|1"
        try cache(["tabs": [[:]]], "browsers/" + SigningMigration.hash(Data(historical.utf8)) + ".enc", String(repeating: "34", count: 32), historical)
        // Legacy cache readers permit absent optional collections, but reject wrong types.
        try cache(["state": [:]], "hosts/" + host + "/cache.enc", connection["key"]!, "proteus-cache-v1")
        let legacy = try SigningMigration.verifyCaches(records, root: root)
        try expect(legacy["chats"] == 0 && legacy["drafts"] == 0)
        try cache(["chats": "invalid"], "hosts/" + host + "/cache.enc", connection["key"]!, "proteus-cache-v1")
        do { _ = try SigningMigration.verifyCaches(records, root: root); fatalError("Expected schema diagnostic") }
        catch let error as MigrationDiagnostic { try expect(error.stage == .hostCacheSchema) }
        try cache(["chats": ["fixture": [:]], "drafts": ["fixture": "private fixture draft"]], "hosts/" + host + "/cache.enc", connection["key"]!, "proteus-cache-v1")
        let counts = try SigningMigration.verifyCaches(records, root: root)
        try expect(counts["chats"] == 1 && counts["drafts"] == 1 && counts["documentTabs"] == 2 && counts["requestReceipts"] == 1)
        try expect(counts["historyEntries"] == 2 && counts["historyOutbox"] == 1 && counts["uninspectedAccountFiles"] == 1)
        rejects { _ = try SigningMigration.requireDestinationKeys([browser], root: root) }
        let source = temporary.appendingPathComponent("source"), destination = temporary.appendingPathComponent("destination")
        try FileManager.default.createDirectory(at: source.appendingPathComponent("Library/Preferences"), withIntermediateDirectories: true)
        try Data("preferences".utf8).write(to: source.appendingPathComponent("Library/Preferences/" + SigningMigration.source + ".plist"))
        try Data("OS container identity".utf8).write(to: source.appendingPathComponent(".com.apple.mobile_container_manager.metadata.plist"))
        let snapshots = source.appendingPathComponent("Library/SplashBoard/Snapshots")
        try FileManager.default.createDirectory(at: snapshots, withIntermediateDirectories: true)
        try Data("excluded OS snapshot".utf8).write(to: snapshots.appendingPathComponent("fixture"))
        let networkCache = source.appendingPathComponent("Library/Caches/WebKit/NetworkCache/Version17/Blobs")
        try FileManager.default.createDirectory(at: networkCache, withIntermediateDirectories: true)
        try Data("transient download".utf8).write(to: networkCache.appendingPathComponent("fixture"))
        for directory in ["Library/WebKit", "Library/Cookies", "Library/Caches/OtherCache", "Library/Caches/com.apple.dyld", "SystemData", "Library/Application Support/SystemData"] {
            let folder = source.appendingPathComponent(directory); try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            try Data("must retain".utf8).write(to: folder.appendingPathComponent("fixture"))
        }
        let inventory = try SigningMigration.inventory(source, bundle: SigningMigration.source)
        try expect(inventory.excludedDyldCacheRoots == 1 && inventory.excludedDyldCacheFiles == -1 && !inventory.files.contains { $0.path.hasPrefix("Library/Caches/com.apple.dyld/") })
        try expect(inventory.files.contains { $0.path == "Library/Caches/OtherCache/fixture" })
        try expect(inventory.excludedSystemDataRoots == 1 && inventory.excludedSystemDataFiles == -1 && !inventory.files.contains { $0.path.hasPrefix("SystemData/") })
        try expect(inventory.files.contains { $0.path == "Library/Application Support/SystemData/fixture" })
        try expect(inventory.excludedWebKitNetworkCacheRoots == 1 && inventory.excludedWebKitNetworkCacheFiles == -1 && !inventory.files.contains { $0.path.hasPrefix("Library/Caches/WebKit/NetworkCache/") })
        try expect(["Library/WebKit/fixture", "Library/Cookies/fixture", "Library/Caches/OtherCache/fixture"].allSatisfy { required in inventory.files.contains { $0.path == required } })
        try expect(inventory.excludedOSSnapshotRoots == 1 && inventory.excludedOSSnapshotFiles == -1 && !inventory.files.contains { $0.path.hasPrefix("Library/SplashBoard/Snapshots/") })
        try expect(inventory.excludedOSMetadataFiles == 1 && !inventory.files.contains { $0.path == ".com.apple.mobile_container_manager.metadata.plist" })
        try FileManager.default.copyItem(at: source, to: destination)
        try FileManager.default.moveItem(at: destination.appendingPathComponent("Library/Preferences/" + SigningMigration.source + ".plist"), to: destination.appendingPathComponent("Library/Preferences/" + SigningMigration.target + ".plist"))
        try SigningMigration.verifyInventory(inventory, destination: destination); passed += 1
        let missing = destination.appendingPathComponent("Library/Application Support/Proteus/document-tabs.enc")
        let saved = try Data(contentsOf: missing); try FileManager.default.removeItem(at: missing)
        rejects { try SigningMigration.verifyInventory(inventory, destination: destination) }; try saved.write(to: missing)
        let authenticated = try SigningMigration.seal(records, request: request, inventory: inventory, cacheCounts: counts)
        let payload = try SigningMigration.openPayload(authenticated, expected: request, recipient: recipient)
        try expect(payload.inventory?.digest == inventory.digest && payload.cacheCounts == counts)
        try Data("changed".utf8).write(to: destination.appendingPathComponent("Library/Preferences/" + SigningMigration.target + ".plist"))
        rejects { try SigningMigration.verifyInventory(inventory, destination: destination) }
        let bad = MigrationFile(path: "../escape", size: 0, sha256: SigningMigration.hash(Data()))
        rejects { try SigningMigration.verifyInventory(MigrationInventory(version: 1, sourceBundleID: SigningMigration.source, files: [bad], excludedOSSnapshotFiles: 0, digest: SigningMigration.hash(SigningMigration.encoded([bad]))), destination: destination) }
        try FileManager.default.createSymbolicLink(atPath: source.appendingPathComponent("link").path, withDestinationPath: "/tmp")
        rejects { _ = try SigningMigration.inventory(source, bundle: SigningMigration.source) }
        print("Signing migration synthetic checks passed: \(passed)")
    }
}

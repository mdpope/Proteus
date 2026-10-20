// Temporary, separately signed migration executable. Never add to the normal app target.
import Foundation
import CryptoKit
import Darwin
#if os(iOS)
import UIKit
import Security
#endif

enum MigrationFailure: String, Error { case invalidOperationID, invalidContext, invalidRecord, missingCredential, conflict, corruptEnvelope, missingFile, keychain, verification, cleanupDenied }
enum MigrationStage: String, Codable {
    case exportRecords, exportDestinationKeys, exportCaches, exportInventory, exportWriteInventory, exportSeal, exportWriteEnvelope
    case destinationRead, destinationSchema, hostCacheDecrypt, hostCacheSchema, browserKey, browserDirectory
    case navigationDecrypt, navigationSchema, documentDecrypt, documentSchema, historyDecrypt, historySchema, browserDecrypt, browserSchema
    case inventoryRoot, inventoryEnumerate, inventoryRelativePath, inventoryEntryMetadata, inventorySymlink, inventoryFileType, inventoryFileRead
}
struct MigrationFailureDetails: Codable, Equatable {
    let relativePath: String
    let domain: String
    let code: Int
    let underlyingDomain: String?
    let underlyingCode: Int?
}
struct MigrationDiagnostic: Error { let stage: MigrationStage; let reason: String; var details: MigrationFailureDetails? = nil }
struct MigrationRequest: Codable, Equatable {
    var version = 1
    var migrationID: String
    var requestID: String
    var sourceBundleID = "org.proteusapp.proteus.mobile"
    var targetBundleID = "org.proteusapp.review.proteus"
    var recipientPublicKey: Data
}
struct MigrationRecord: Codable, Equatable {
    let service: String
    let account: String
    let value: Data
    var identity: String { service + "\n" + account }
}
struct MigrationFile: Codable, Equatable { let path: String; let size: Int; let sha256: String }
struct MigrationInventory: Codable { let version: Int; let sourceBundleID: String; let files: [MigrationFile]; let excludedOSSnapshotFiles: Int; var excludedOSSnapshotRoots = 0; var excludedOSMetadataFiles = 0; var excludedWebKitNetworkCacheRoots = 0; var excludedWebKitNetworkCacheFiles = 0; var excludedSystemDataRoots = 0; var excludedSystemDataFiles = 0; var excludedDyldCacheRoots = 0; var excludedDyldCacheFiles = 0; let digest: String }
struct MigrationPayload: Codable { let request: MigrationRequest; let records: [MigrationRecord]; let inventory: MigrationInventory?; let cacheCounts: [String: Int]? }
struct MigrationCleanupState: Codable { let request: MigrationRequest; let inventory: MigrationInventory; let recordSetHash: String; let counts: [String: Int] }
struct MigrationEnvelope: Codable { let request: MigrationRequest; let ephemeralPublicKey: Data; let ciphertext: Data }
struct MigrationReceipt: Codable {
    let mode: String
    let success: Bool
    var operationID = ""
    var migrationID: String? = nil
    var requestHash: String? = nil
    var recordSetHash: String? = nil
    var records = 0
    var counts: [String: Int] = [:]
    var error: String? = nil
    var failureStage: MigrationStage? = nil
    var failureDetails: MigrationFailureDetails? = nil
}

// Both scene connection and deferred app-launch fallback use this on the main actor.
// The receipt, including failure, is stable for the lifetime of one helper launch.
final class MigrationOneShot<Value> {
    private var completed: Value?
    func run(_ operation: () -> Value) -> Value {
        if let completed { return completed }
        let value = operation(); completed = value; return value
    }
}

enum SigningMigration {
    static let source = "org.proteusapp.proteus.mobile", target = "org.proteusapp.review.proteus"
    static let services = [source, source + ".browser", source + ".life"]
    static func diagnose<T>(_ stage: MigrationStage, _ action: () throws -> T) throws -> T {
        do { return try action() }
        catch let diagnostic as MigrationDiagnostic { throw diagnostic }
        catch { throw MigrationDiagnostic(stage: stage, reason: safeFailureReason(error)) }
    }
    // Private receipt metadata only: no error descriptions, absolute paths or file contents.
    static func diagnoseFile<T>(_ stage: MigrationStage, relativePath: String, _ action: () throws -> T) throws -> T {
        do { return try action() }
        catch let diagnostic as MigrationDiagnostic { throw diagnostic }
        catch {
            let value = error as NSError; let underlying = value.userInfo[NSUnderlyingErrorKey] as? NSError
            let details = MigrationFailureDetails(relativePath: relativePath, domain: value.domain, code: value.code, underlyingDomain: underlying?.domain, underlyingCode: underlying?.code)
            throw MigrationDiagnostic(stage: stage, reason: safeFailureReason(error), details: details)
        }
    }
    static func safeFailureReason(_ error: Error) -> String {
        if let diagnostic = error as? MigrationDiagnostic { return diagnostic.reason }
        if let failure = error as? MigrationFailure { return failure.rawValue }
        if error is CryptoKitError { return "cryptographyFailed" }
        if error is DecodingError { return "decodingFailed" }
        let value = error as NSError
        if value.domain == NSCocoaErrorDomain { return "fileOrJSONOperationFailed" }
        return "operationFailed"
    }
    static func optionalObject(_ value: Any?) throws -> [String: Any] {
        guard let value, !(value is NSNull) else { return [:] }
        guard let object = value as? [String: Any] else { throw MigrationFailure.verification }; return object
    }
    static func optionalArray(_ value: Any?) throws -> [Any] {
        guard let value, !(value is NSNull) else { return [] }
        guard let array = value as? [Any] else { throw MigrationFailure.verification }; return array
    }
    static func launchOperationID(_ arguments: [String]) throws -> String {
        let indices = arguments.indices.filter { arguments[$0] == "--operation-id" }
        guard indices.count == 1, let index = indices.first, index + 1 < arguments.count else { throw MigrationFailure.invalidOperationID }
        let value = arguments[index + 1]
        guard let uuid = UUID(uuidString: value), uuid.uuidString.lowercased() == value.lowercased() else { throw MigrationFailure.invalidOperationID }
        return value
    }
    static func encoded<T: Encodable>(_ value: T) throws -> Data { let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]; return try encoder.encode(value) }
    static func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
    static func context(_ request: MigrationRequest) throws -> Data {
        guard request.version == 1, UUID(uuidString: request.migrationID) != nil, UUID(uuidString: request.requestID) != nil,
              request.sourceBundleID == source, request.targetBundleID == target, request.recipientPublicKey.count == 32 else { throw MigrationFailure.invalidContext }
        return try encoded(request)
    }
    static func hexKey(_ value: String) throws -> SymmetricKey {
        guard value.count == 64 else { throw MigrationFailure.invalidRecord }
        var bytes = Data(); var index = value.startIndex
        while index < value.endIndex { let next = value.index(index, offsetBy: 2); guard let byte = UInt8(value[index..<next], radix: 16) else { throw MigrationFailure.invalidRecord }; bytes.append(byte); index = next }
        return SymmetricKey(data: bytes)
    }
    static func object(_ bytes: Data) throws -> [String: Any] { guard let value = try JSONSerialization.jsonObject(with: bytes) as? [String: Any] else { throw MigrationFailure.invalidRecord }; return value }
    static func validate(_ records: [MigrationRecord]) throws {
        guard !records.isEmpty, records.count <= 512, Set(records.map(\.identity)).count == records.count else { throw MigrationFailure.invalidRecord }
        for record in records {
            guard !record.value.isEmpty, record.value.count <= 1_048_576 else { throw MigrationFailure.invalidRecord }
            switch (record.service, record.account) {
            case (source + ".browser", "cache-key"):
                guard let value = String(data: record.value, encoding: .utf8) else { throw MigrationFailure.invalidRecord }; _ = try hexKey(value)
            case (source + ".life", "website-account"):
                let value = try object(record.value)
                for field in ["origin", "clientID", "accessToken", "refreshToken", "accountID", "workspaceID"] { guard let text = value[field] as? String, !text.isEmpty else { throw MigrationFailure.invalidRecord } }
                guard value["expiresAt"] is NSNumber, let origin = value["origin"] as? String, URL(string: origin)?.scheme == "https" else { throw MigrationFailure.invalidRecord }
            case (source, _):
                let value = try object(record.value)
                guard let host = value["hostId"] as? String, UUID(uuidString: host) != nil,
                      let device = value["deviceId"] as? String, UUID(uuidString: device) != nil,
                      let key = value["key"] as? String, let relay = value["relay"] as? String,
                      ["ws", "wss"].contains(URL(string: relay)?.scheme ?? ""),
                      record.account == "paired-mac" || record.account == "paired-mac:" + host.lowercased() else { throw MigrationFailure.invalidRecord }
                _ = try hexKey(key)
            default: throw MigrationFailure.invalidRecord
            }
        }
    }
    static func validateCleanupContext(_ checkpoint: MigrationRequest, current: MigrationRequest?) throws {
        _ = try context(checkpoint)
        if let current { _ = try context(current); guard checkpoint == current else { throw MigrationFailure.cleanupDenied } }
    }
    static func recordHash(_ records: [MigrationRecord]) throws -> String { try hash(encoded(records.sorted { $0.identity < $1.identity })) }
    static func seal(_ records: [MigrationRecord], request: MigrationRequest, inventory: MigrationInventory? = nil, cacheCounts: [String: Int]? = nil) throws -> MigrationEnvelope {
        let aad = try context(request); try validate(records)
        let ephemeral = Curve25519.KeyAgreement.PrivateKey()
        let shared = try ephemeral.sharedSecretFromKeyAgreement(with: Curve25519.KeyAgreement.PublicKey(rawRepresentation: request.recipientPublicKey))
        let key = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(request.requestID.utf8), sharedInfo: aad, outputByteCount: 32)
        let box = try AES.GCM.seal(encoded(MigrationPayload(request: request, records: records, inventory: inventory, cacheCounts: cacheCounts)), using: key, authenticating: aad)
        guard let combined = box.combined else { throw MigrationFailure.corruptEnvelope }
        return MigrationEnvelope(request: request, ephemeralPublicKey: ephemeral.publicKey.rawRepresentation, ciphertext: combined)
    }
    static func openPayload(_ envelope: MigrationEnvelope, expected: MigrationRequest, recipient: Curve25519.KeyAgreement.PrivateKey) throws -> MigrationPayload {
        let aad = try context(expected)
        guard envelope.request == expected, recipient.publicKey.rawRepresentation == expected.recipientPublicKey, envelope.ciphertext.count <= 16_777_216 else { throw MigrationFailure.invalidContext }
        let shared = try recipient.sharedSecretFromKeyAgreement(with: Curve25519.KeyAgreement.PublicKey(rawRepresentation: envelope.ephemeralPublicKey))
        let key = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(expected.requestID.utf8), sharedInfo: aad, outputByteCount: 32)
        let bytes = try AES.GCM.open(AES.GCM.SealedBox(combined: envelope.ciphertext), using: key, authenticating: aad)
        let payload = try JSONDecoder().decode(MigrationPayload.self, from: bytes)
        guard payload.request == expected else { throw MigrationFailure.invalidContext }; try validate(payload.records); return payload
    }
    static func open(_ envelope: MigrationEnvelope, expected: MigrationRequest, recipient: Curve25519.KeyAgreement.PrivateKey) throws -> [MigrationRecord] { try openPayload(envelope, expected: expected, recipient: recipient).records }
    static func physicalURL(_ url: URL) throws -> URL {
        guard let path = realpath(url.path, nil) else { throw MigrationFailure.verification }
        defer { free(path) }; return URL(fileURLWithPath: String(cString: path), isDirectory: true)
    }
    static func inventory(_ container: URL, bundle: String) throws -> MigrationInventory {
        let fm = FileManager.default; let base = try diagnose(.inventoryRoot) { try physicalURL(container) }
        var files: [MigrationFile] = []; var excluded = 0; var snapshotRoots = 0; var metadata = 0; var networkCacheRoots = 0; var systemDataRoots = 0; var dyldCacheRoots = 0
        func walk(_ directory: String) throws {
            let location = directory.isEmpty ? base : base.appendingPathComponent(directory)
            // Avoid URL resource-key prefetch: excluded protected directories must never be
            // traversed or queried before their exact relative name is recognized.
            let names = try diagnoseFile(.inventoryEnumerate, relativePath: directory) { try fm.contentsOfDirectory(atPath: location.path) }
            for name in names.sorted() {
                guard !name.isEmpty, name != ".", name != "..", !name.contains("/") else { throw MigrationDiagnostic(stage: .inventoryRelativePath, reason: "unexpectedEntry") }
                let path = directory.isEmpty ? name : directory + "/" + name
                if path == "Documents/ProteusSigningMigration" { continue }
                // Root SystemData is OS-managed and inaccessible (EPERM); device inventories
                // expose no app-readable files there. Do not match nested app-owned names.
                if path == "SystemData" { systemDataRoots += 1; continue }
                if path == ".com.apple.mobile_container_manager.metadata.plist" { metadata += 1; continue }
                if path == "Library/SplashBoard/Snapshots" { snapshotRoots += 1; excluded = -1; continue }
                // This exact reproducible HTTP download cache was observed disappearing under
                // OS WebKit maintenance while the client was stopped. Durable Library/WebKit,
                // Cookies, Preferences, Application Support and every other cache remain strict.
                if path == "Library/Caches/WebKit/NetworkCache" { networkCacheRoots += 1; continue }
                // The loader regenerates this exact per-container cache on bridge startup;
                // source/destination evidence identified it as the sole changed file.
                if path == "Library/Caches/com.apple.dyld" { dyldCacheRoots += 1; continue }
                let url = base.appendingPathComponent(path)
                let attributes = try diagnoseFile(.inventoryEntryMetadata, relativePath: path) { try fm.attributesOfItem(atPath: url.path) }
                let type = attributes[.type] as? FileAttributeType
                if type == .typeSymbolicLink { throw MigrationDiagnostic(stage: .inventorySymlink, reason: "symlinkRejected") }
                if type == .typeDirectory { try walk(path); continue }
                guard type == .typeRegular else { throw MigrationDiagnostic(stage: .inventoryFileType, reason: "nonRegularFile") }
                let bytes = try diagnoseFile(.inventoryFileRead, relativePath: path) { try Data(contentsOf: url, options: [.mappedIfSafe]) }
                files.append(MigrationFile(path: path, size: bytes.count, sha256: hash(bytes)))
            }
        }
        try walk(""); files.sort { $0.path < $1.path }
        return MigrationInventory(version: 1, sourceBundleID: bundle, files: files, excludedOSSnapshotFiles: excluded, excludedOSSnapshotRoots: snapshotRoots, excludedOSMetadataFiles: metadata, excludedWebKitNetworkCacheRoots: networkCacheRoots, excludedWebKitNetworkCacheFiles: networkCacheRoots == 0 ? 0 : -1, excludedSystemDataRoots: systemDataRoots, excludedSystemDataFiles: systemDataRoots == 0 ? 0 : -1, excludedDyldCacheRoots: dyldCacheRoots, excludedDyldCacheFiles: dyldCacheRoots == 0 ? 0 : -1, digest: try hash(encoded(files)))
    }
    static func verifyInventory(_ inventory: MigrationInventory, destination: URL) throws {
        let base = try physicalURL(destination)
        guard inventory.version == 1, inventory.sourceBundleID == source, !inventory.files.isEmpty,
              inventory.digest == (try hash(encoded(inventory.files))), Set(inventory.files.map(\.path)).count == inventory.files.count else { throw MigrationFailure.verification }
        for file in inventory.files {
            guard !file.path.isEmpty, !file.path.hasPrefix("/"), !file.path.split(separator: "/").contains(".."), !file.path.hasPrefix("Documents/ProteusSigningMigration/"), file.path != "SystemData", !file.path.hasPrefix("SystemData/"), file.path != ".com.apple.mobile_container_manager.metadata.plist", !file.path.hasPrefix("Library/SplashBoard/Snapshots/"), !file.path.hasPrefix("Library/Caches/WebKit/NetworkCache/"), !file.path.hasPrefix("Library/Caches/com.apple.dyld/"), file.size >= 0 else { throw MigrationFailure.verification }
            let path = file.path == "Library/Preferences/" + source + ".plist" ? "Library/Preferences/" + target + ".plist" : file.path
            let url = base.appendingPathComponent(path)
            var cursor = url
            while cursor.path != base.path {
                guard cursor.path.hasPrefix(base.path + "/"), try cursor.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink != true else { throw MigrationFailure.verification }; cursor.deleteLastPathComponent()
            }
            let bytes = try Data(contentsOf: url, options: [.mappedIfSafe]); guard bytes.count == file.size, hash(bytes) == file.sha256 else { throw MigrationFailure.verification }
        }
    }
    // Preflight the complete set before the first write. Retry can fill a partially imported set,
    // but never replaces a differing credential or rolls back an existing credential.
    static func importRecords(_ records: [MigrationRecord], read: (MigrationRecord) throws -> Data?, add: (MigrationRecord) throws -> Void) throws {
        try validate(records)
        for record in records { if let old = try read(record), old != record.value { throw MigrationFailure.conflict } }
        for record in records { if try read(record) == nil { try add(record) }; guard try read(record) == record.value else { throw MigrationFailure.verification } }
    }
    static func destinations(_ root: URL) throws -> [String] {
        let value = try diagnose(.destinationRead) { try object(Data(contentsOf: root.appendingPathComponent("destinations.json"))) }
        guard (value["version"] as? NSNumber)?.intValue == 1, let rows = value["destinations"] as? [[String: Any]] else { throw MigrationDiagnostic(stage: .destinationSchema, reason: "verification") }
        let ids = try rows.map { row -> String in guard let id = row["id"] as? String, UUID(uuidString: id) != nil else { throw MigrationDiagnostic(stage: .destinationSchema, reason: "verification") }; return id }
        guard Set(ids.map { $0.lowercased() }).count == ids.count else { throw MigrationDiagnostic(stage: .destinationSchema, reason: "verification") }
        if let selected = value["selectedID"] as? String { guard ids.contains(selected) else { throw MigrationDiagnostic(stage: .destinationSchema, reason: "verification") } }
        return ids
    }
    static func requireDestinationKeys(_ records: [MigrationRecord], root: URL) throws -> [String] {
        let ids = try destinations(root)
        for id in ids { guard records.contains(where: { $0.service == source && $0.account == "paired-mac:" + id.lowercased() }) else { throw MigrationFailure.missingCredential } }
        return ids
    }
    static func decryptCache(_ file: URL, key: SymmetricKey, aad: String) throws -> Any {
        let raw = try Data(contentsOf: file)
        guard let bytes = Data(base64Encoded: raw) else { throw MigrationFailure.verification }
        return try JSONSerialization.jsonObject(with: AES.GCM.open(AES.GCM.SealedBox(combined: bytes), using: key, authenticating: Data(aad.utf8)))
    }
    static func verifyCaches(_ records: [MigrationRecord], root: URL) throws -> [String: Int] {
        try validate(records); let ids = try requireDestinationKeys(records, root: root); var counts = ["destinations": ids.count, "hostCaches": 0, "chats": 0, "drafts": 0, "browserTabs": 0, "historyEntries": 0, "documentTabs": 0, "encryptedFiles": 0]
        let fm = FileManager.default
        for id in ids {
            let record = records.first { $0.service == source && $0.account == "paired-mac:" + id.lowercased() }!
            let value = try object(record.value); let key = try hexKey(value["key"] as! String)
            let file = root.appendingPathComponent("hosts/" + id + "/cache.enc")
            if fm.fileExists(atPath: file.path) {
                let decoded = try diagnose(.hostCacheDecrypt) { try decryptCache(file, key: key, aad: "proteus-cache-v1") }
                guard let cache = decoded as? [String: Any] else { throw MigrationDiagnostic(stage: .hostCacheSchema, reason: "objectRequired") }
                // The native reader defaults absent legacy fields to empty collections.
                let chats = try diagnose(.hostCacheSchema) { try optionalObject(cache["chats"]) }
                let drafts = try diagnose(.hostCacheSchema) { try optionalObject(cache["drafts"]) }
                counts["hostCaches", default: 0] += 1; counts["encryptedFiles", default: 0] += 1; counts["chats", default: 0] += chats.count; counts["drafts", default: 0] += drafts.count
            }
        }
        let fixed = [("navigation.enc", "proteus-mobile-navigation-v1"), ("document-tabs.enc", "proteus-mobile-document-tabs-v1"), ("browser-history.enc", "proteus-mobile-history-v1")]
        let browserFolder = root.appendingPathComponent("browsers")
        let browserFiles = fm.fileExists(atPath: browserFolder.path) ? try diagnose(.browserDirectory) { try fm.contentsOfDirectory(at: browserFolder, includingPropertiesForKeys: nil).filter { $0.pathExtension == "enc" } } : []
        let files = fixed.filter { fm.fileExists(atPath: root.appendingPathComponent($0.0).path) }
        if !files.isEmpty || !browserFiles.isEmpty {
            guard let browser = records.first(where: { $0.service == source + ".browser" && $0.account == "cache-key" }), let text = String(data: browser.value, encoding: .utf8) else { throw MigrationDiagnostic(stage: .browserKey, reason: "missingCredential") }
            let key = try diagnose(.browserKey) { try hexKey(text) }
            for (name, aad) in files {
                let decryptStage: MigrationStage = name == "navigation.enc" ? .navigationDecrypt : name == "document-tabs.enc" ? .documentDecrypt : .historyDecrypt
                let schemaStage: MigrationStage = name == "navigation.enc" ? .navigationSchema : name == "document-tabs.enc" ? .documentSchema : .historySchema
                let decoded = try diagnose(decryptStage) { try decryptCache(root.appendingPathComponent(name), key: key, aad: aad) }
                guard let payload = decoded as? [String: Any] else { throw MigrationDiagnostic(stage: schemaStage, reason: "objectRequired") }
                counts["encryptedFiles", default: 0] += 1
                if name == "document-tabs.enc" { counts["documentTabs"] = (payload["tabs"] as? [Any])?.count ?? 0; counts["pendingScopes"] = (payload["contentPending"] as? [String: Any])?.count ?? 0; counts["requestReceipts"] = (payload["contentRequests"] as? [String: Any])?.count ?? 0 }
                if name == "browser-history.enc" {
                    let history = try diagnose(.historySchema) { try optionalObject(payload["cache"] ?? payload["byQuery"]) }
                    let outbox = try diagnose(.historySchema) { try optionalArray(payload["outbox"]) }
                    counts["historyEntries"] = try diagnose(.historySchema) { try history.values.reduce(0) { try $0 + optionalArray($1).count } }; counts["historyOutbox"] = outbox.count
                }
            }
            var identities = ["signed-out"]
            if let life = records.first(where: { $0.service == source + ".life" && $0.account == "website-account" }) { let value = try object(life.value); identities.append(["origin", "accountID", "workspaceID"].map { value[$0] as! String }.joined(separator: "|")) }
            for file in browserFiles {
                guard let identity = identities.first(where: { hash(Data($0.utf8)) == file.deletingPathExtension().lastPathComponent }) else {
                    // Older account AAD cannot be recovered from its SHA filename. Its exact
                    // ciphertext and the same browser key are bound by the migration manifest.
                    counts["uninspectedAccountFiles", default: 0] += 1; continue
                }
                let payload = try diagnose(.browserDecrypt) { try decryptCache(file, key: key, aad: identity) }
                guard let tabs = (payload as? [String: Any])?["tabs"] as? [Any] ?? payload as? [Any] else { throw MigrationDiagnostic(stage: .browserSchema, reason: "tabsRequired") }
                counts["browserTabs", default: 0] += tabs.count; counts["encryptedFiles", default: 0] += 1
            }
        }
        return counts
    }
}

#if os(iOS)
enum BridgeKeychain {
    static let migrationService = "org.proteusapp.review.proteus.signing-migration"
    static func query(_ service: String, _ account: String) -> [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account] }
    static func read(_ service: String, _ account: String) throws -> Data? {
        var q = query(service, account); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?; let status = SecItemCopyMatching(q as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }; guard status == errSecSuccess, let data = item as? Data else { throw MigrationFailure.keychain }; return data
    }
    static func add(_ service: String, _ account: String, _ value: Data) throws {
        var q = query(service, account); q[kSecValueData as String] = value; q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw MigrationFailure.keychain }
    }
    static func records() throws -> [MigrationRecord] {
        var records: [MigrationRecord] = []
        for service in SigningMigration.services {
            let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecReturnData as String: true, kSecReturnAttributes as String: true, kSecMatchLimit as String: kSecMatchLimitAll]
            var item: CFTypeRef?; let status = SecItemCopyMatching(q as CFDictionary, &item)
            if status == errSecItemNotFound { continue }; guard status == errSecSuccess, let rows = item as? [[String: Any]] else { throw MigrationFailure.keychain }
            for row in rows { guard let account = row[kSecAttrAccount as String] as? String, let value = row[kSecValueData as String] as? Data else { throw MigrationFailure.keychain }; records.append(MigrationRecord(service: service, account: account, value: value)) }
        }
        try SigningMigration.validate(records); return records
    }
}
enum MigrationBridge {
    static let fm = FileManager.default
    static var folder: URL { fm.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("ProteusSigningMigration") }
    static var container: URL { URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true) }
    static var root: URL { fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus") }
    static func read<T: Decodable>(_ name: String, _ type: T.Type) throws -> T { let data = try Data(contentsOf: folder.appendingPathComponent(name)); guard data.count <= 16_777_216 else { throw MigrationFailure.corruptEnvelope }; return try JSONDecoder().decode(type, from: data) }
    static func write<T: Encodable>(_ name: String, _ value: T) throws { try fm.createDirectory(at: folder, withIntermediateDirectories: true); let url = folder.appendingPathComponent(name); try SigningMigration.encoded(value).write(to: url, options: [.atomic, .completeFileProtection]); var mutable = url; var attrs = URLResourceValues(); attrs.isExcludedFromBackup = true; try mutable.setResourceValues(attrs) }
    static func request() throws -> MigrationRequest { let value = try read("request.json", MigrationRequest.self); _ = try SigningMigration.context(value); return value }
    static func run(_ mode: String, bundle: String) throws -> MigrationReceipt {
        if mode == "cleanup" {
            guard bundle == SigningMigration.target else { throw MigrationFailure.invalidContext }
            let state: MigrationCleanupState
            if fm.fileExists(atPath: folder.appendingPathComponent("cleanup-state.json").path) { state = try read("cleanup-state.json", MigrationCleanupState.self) }
            else {
                let req = try request(); let verified = try read("verify-receipt.json", MigrationReceipt.self)
                guard verified.success, verified.migrationID == req.migrationID, verified.requestHash == (try SigningMigration.hash(SigningMigration.context(req))), let raw = try BridgeKeychain.read(BridgeKeychain.migrationService, req.migrationID) else { throw MigrationFailure.cleanupDenied }
                let payload = try SigningMigration.openPayload(read("envelope.json", MigrationEnvelope.self), expected: req, recipient: Curve25519.KeyAgreement.PrivateKey(rawRepresentation: raw))
                guard let inventory = payload.inventory, let counts = payload.cacheCounts else { throw MigrationFailure.cleanupDenied }
                state = MigrationCleanupState(request: req, inventory: inventory, recordSetHash: try SigningMigration.recordHash(payload.records), counts: counts)
            }
            let current = fm.fileExists(atPath: folder.appendingPathComponent("request.json").path) ? try request() : nil
            try SigningMigration.validateCleanupContext(state.request, current: current)
            if fm.fileExists(atPath: folder.appendingPathComponent("envelope.json").path) {
                let envelope = try read("envelope.json", MigrationEnvelope.self)
                guard envelope.request == state.request else { throw MigrationFailure.cleanupDenied }
            }
            let records = try BridgeKeychain.records()
            guard try SigningMigration.recordHash(records) == state.recordSetHash, try SigningMigration.verifyCaches(records, root: root) == state.counts else { throw MigrationFailure.cleanupDenied }
            try SigningMigration.verifyInventory(state.inventory, destination: container)
            // This public hash-only checkpoint makes cleanup resumable after transport-key deletion.
            try write("cleanup-state.json", state)
            let status = SecItemDelete(BridgeKeychain.query(BridgeKeychain.migrationService, state.request.migrationID) as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else { throw MigrationFailure.keychain }
            for name in ["request.json", "envelope.json"] { let path = folder.appendingPathComponent(name); if fm.fileExists(atPath: path.path) { try fm.removeItem(at: path) } }
            return MigrationReceipt(mode: mode, success: true, migrationID: state.request.migrationID, requestHash: try SigningMigration.hash(SigningMigration.context(state.request)), recordSetHash: state.recordSetHash, records: records.count, counts: state.counts)
        }
        if mode == "inventory" {
            guard [SigningMigration.source, SigningMigration.target].contains(bundle) else { throw MigrationFailure.invalidContext }
            let inventory = try SigningMigration.inventory(container, bundle: bundle); try write("file-inventory.json", inventory)
            return MigrationReceipt(mode: mode, success: true, counts: ["files": inventory.files.count, "excludedOSSnapshotFiles": inventory.excludedOSSnapshotFiles, "excludedOSSnapshotRoots": inventory.excludedOSSnapshotRoots, "excludedOSMetadataFiles": inventory.excludedOSMetadataFiles, "excludedWebKitNetworkCacheRoots": inventory.excludedWebKitNetworkCacheRoots, "excludedWebKitNetworkCacheFiles": inventory.excludedWebKitNetworkCacheFiles, "excludedSystemDataRoots": inventory.excludedSystemDataRoots, "excludedSystemDataFiles": inventory.excludedSystemDataFiles, "excludedDyldCacheRoots": inventory.excludedDyldCacheRoots, "excludedDyldCacheFiles": inventory.excludedDyldCacheFiles])
        }
        if mode == "prepare" {
            guard bundle == SigningMigration.target else { throw MigrationFailure.invalidContext }
            let req: MigrationRequest
            if !fm.fileExists(atPath: folder.appendingPathComponent("request.json").path), fm.fileExists(atPath: folder.appendingPathComponent("cleanup-state.json").path) {
                let done = try read("cleanup-receipt.json", MigrationReceipt.self)
                let oldState = try read("cleanup-state.json", MigrationCleanupState.self)
                guard done.success, done.migrationID == oldState.request.migrationID,
                      done.requestHash == (try SigningMigration.hash(SigningMigration.context(oldState.request))), done.recordSetHash == oldState.recordSetHash else { throw MigrationFailure.cleanupDenied }
                try fm.removeItem(at: folder.appendingPathComponent("cleanup-state.json"))
            }
            if fm.fileExists(atPath: folder.appendingPathComponent("request.json").path) { req = try request(); guard let raw = try BridgeKeychain.read(BridgeKeychain.migrationService, req.migrationID), try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: raw).publicKey.rawRepresentation == req.recipientPublicKey else { throw MigrationFailure.missingCredential } }
            else { let privateKey = Curve25519.KeyAgreement.PrivateKey(); req = MigrationRequest(migrationID: UUID().uuidString, requestID: UUID().uuidString, recipientPublicKey: privateKey.publicKey.rawRepresentation); try BridgeKeychain.add(BridgeKeychain.migrationService, req.migrationID, privateKey.rawRepresentation)
                do { try write("request.json", req) } catch {
                    // Atomic data write can succeed before backup-exclusion metadata fails.
                    // Keep its matching key so retry can recover; remove only an unreferenced key.
                    if !fm.fileExists(atPath: folder.appendingPathComponent("request.json").path) { _ = SecItemDelete(BridgeKeychain.query(BridgeKeychain.migrationService, req.migrationID) as CFDictionary) }
                    throw error
                } }
            return MigrationReceipt(mode: mode, success: true, migrationID: req.migrationID, requestHash: try SigningMigration.hash(SigningMigration.context(req)))
        }
        let req = try request(); let requestHash = try SigningMigration.hash(SigningMigration.context(req))
        switch mode {
        case "export":
            guard bundle == SigningMigration.source else { throw MigrationFailure.invalidContext }
            let records = try SigningMigration.diagnose(.exportRecords) { try BridgeKeychain.records() }
            _ = try SigningMigration.diagnose(.exportDestinationKeys) { try SigningMigration.requireDestinationKeys(records, root: root) }
            let counts = try SigningMigration.diagnose(.exportCaches) { try SigningMigration.verifyCaches(records, root: root) }
            let inventory = try SigningMigration.diagnose(.exportInventory) { try SigningMigration.inventory(container, bundle: bundle) }
            try SigningMigration.diagnose(.exportWriteInventory) { try write("file-inventory.json", inventory) }
            let envelope = try SigningMigration.diagnose(.exportSeal) { try SigningMigration.seal(records, request: req, inventory: inventory, cacheCounts: counts) }
            try SigningMigration.diagnose(.exportWriteEnvelope) { try write("envelope.json", envelope) }
            return MigrationReceipt(mode: mode, success: true, migrationID: req.migrationID, requestHash: requestHash, recordSetHash: try SigningMigration.recordHash(records), records: records.count, counts: counts)
        case "import":
            guard bundle == SigningMigration.target, let raw = try BridgeKeychain.read(BridgeKeychain.migrationService, req.migrationID) else { throw MigrationFailure.invalidContext }
            let payload = try SigningMigration.openPayload(read("envelope.json", MigrationEnvelope.self), expected: req, recipient: Curve25519.KeyAgreement.PrivateKey(rawRepresentation: raw)); let records = payload.records
            guard let inventory = payload.inventory else { throw MigrationFailure.verification }; try SigningMigration.verifyInventory(inventory, destination: container)
            _ = try SigningMigration.requireDestinationKeys(records, root: root)
            // Authenticate copied caches before changing any destination Keychain item.
            let counts = try SigningMigration.verifyCaches(records, root: root)
            guard counts == payload.cacheCounts else { throw MigrationFailure.verification }
            try SigningMigration.importRecords(records, read: { try BridgeKeychain.read($0.service, $0.account) }, add: { try BridgeKeychain.add($0.service, $0.account, $0.value) })
            return MigrationReceipt(mode: mode, success: true, migrationID: req.migrationID, requestHash: requestHash, recordSetHash: try SigningMigration.recordHash(records), records: records.count, counts: counts)
        case "verify":
            guard bundle == SigningMigration.target else { throw MigrationFailure.invalidContext }
            let imported = try read("import-receipt.json", MigrationReceipt.self); let records = try BridgeKeychain.records()
            guard let raw = try BridgeKeychain.read(BridgeKeychain.migrationService, req.migrationID) else { throw MigrationFailure.missingCredential }
            let payload = try SigningMigration.openPayload(read("envelope.json", MigrationEnvelope.self), expected: req, recipient: Curve25519.KeyAgreement.PrivateKey(rawRepresentation: raw))
            guard let inventory = payload.inventory else { throw MigrationFailure.verification }; try SigningMigration.verifyInventory(inventory, destination: container)
            guard try SigningMigration.recordHash(payload.records) == SigningMigration.recordHash(records), try SigningMigration.verifyCaches(records, root: root) == payload.cacheCounts else { throw MigrationFailure.verification }
            guard imported.success, imported.migrationID == req.migrationID, imported.requestHash == requestHash, imported.recordSetHash == (try SigningMigration.recordHash(records)) else { throw MigrationFailure.verification }
            return MigrationReceipt(mode: mode, success: true, migrationID: req.migrationID, requestHash: requestHash, recordSetHash: imported.recordSetHash, records: records.count, counts: try SigningMigration.verifyCaches(records, root: root))
        default: throw MigrationFailure.invalidContext
        }
    }
}
// The helper is linked with the current iOS SDK, so it uses the scene lifecycle even
// though it only presents a status label. Its Info.plist must retain
// UIApplicationSceneManifest / UIApplicationSupportsMultipleScenes = false.
@main @MainActor final class SigningMigrationApp: UIResponder, UIApplicationDelegate {
    private let launchOnce = MigrationOneShot<MigrationReceipt>()
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Existing SwiftUI scene-session restoration can bypass the temporary delegate's
        // configuration callback. Defer until UIKit finishes launching, then use the same
        // one-shot path as scene connection; this fallback never creates a second operation.
        DispatchQueue.main.async { [weak self] in _ = self?.performMigrationOnce() }
        return true
    }
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Proteus signing migration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SigningMigrationScene.self
        return configuration
    }
    // Scene reconnects must not rerun a mutation or replace the receipt from this launch.
    func performMigrationOnce() -> MigrationReceipt { launchOnce.run { executeMigration() } }
    private func executeMigration() -> MigrationReceipt {
        let args = ProcessInfo.processInfo.arguments
        let modes = ["prepare", "export", "import", "verify", "cleanup", "inventory"].filter { args.contains("--" + $0) }
        let mode = modes.count == 1 ? modes[0] : "invalid"
        var receipt: MigrationReceipt
        var operationID = ""
        do {
            operationID = try SigningMigration.launchOperationID(args)
            let old = MigrationBridge.folder.appendingPathComponent(mode + "-receipt.json")
            if FileManager.default.fileExists(atPath: old.path) { try FileManager.default.removeItem(at: old) }
            receipt = try MigrationBridge.run(mode, bundle: Bundle.main.bundleIdentifier ?? "")
        } catch { receipt = MigrationReceipt(mode: mode, success: false, error: SigningMigration.safeFailureReason(error), failureStage: (error as? MigrationDiagnostic)?.stage, failureDetails: (error as? MigrationDiagnostic)?.details) }
        receipt.operationID = operationID
        do { try MigrationBridge.write(mode + "-receipt.json", receipt) }
        catch { receipt = MigrationReceipt(mode: mode, success: false, operationID: operationID, error: "receiptWriteFailed") }
        return receipt
    }
}
@MainActor final class SigningMigrationScene: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene, let delegate = UIApplication.shared.delegate as? SigningMigrationApp else { return }
        let receipt = delegate.performMigrationOnce()
        let controller = UIViewController(); controller.view.backgroundColor = .systemBackground
        let label = UILabel()
        label.text = receipt.success ? "Proteus migration: \(receipt.mode) completed" : "Proteus migration: \(receipt.mode) failed (\(receipt.error ?? "unknown"))"
        label.numberOfLines = 0; label.textColor = .label; label.translatesAutoresizingMaskIntoConstraints = false
        controller.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: controller.view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(equalTo: controller.view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            label.topAnchor.constraint(equalTo: controller.view.safeAreaLayoutGuide.topAnchor, constant: 48)
        ])
        let window = UIWindow(windowScene: windowScene); window.rootViewController = controller
        self.window = window; window.makeKeyAndVisible()
    }
}
#endif

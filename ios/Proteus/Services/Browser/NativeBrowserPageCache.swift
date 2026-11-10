import Foundation
import CryptoKit
import WebKit

struct NativeBrowserPageSnapshot: Codable, Sendable {
    let data: Data
    let savedAt: Date
}

/// Device-local, encrypted, disposable web archives. Identity includes account,
/// owner, profile, tab and URL; a cache hit never changes shared navigation.
actor NativeBrowserPageCache {
    let root: URL
    private let maximumEntry = 8 * 1024 * 1024
    private let maximumTotal = 128 * 1024 * 1024
    private let maximumCount = 24
    init(root: URL) { self.root = root }
    private func file(_ identity: String) -> URL {
        root.appendingPathComponent(SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined() + ".enc")
    }
    private func aad(_ identity: String) -> Data { Data(("proteus-web-archive-v1:" + identity).utf8) }
    func read(identity: String, key: String, now: Date = Date()) -> NativeBrowserPageSnapshot? {
        let url = file(identity)
        do {
            let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size > 0, size <= maximumEntry + 4096 else { return nil }
            let bytes = try Data(contentsOf: url)
            let plain = try AES.GCM.open(AES.GCM.SealedBox(combined: bytes), using: RemoteCrypto.key(key), authenticating: aad(identity))
            let value = try PropertyListDecoder().decode(NativeBrowserPageSnapshot.self, from: plain)
            guard value.data.count <= maximumEntry, value.savedAt <= now.addingTimeInterval(60), now.timeIntervalSince(value.savedAt) < 7 * 86400 else { try? FileManager.default.removeItem(at: url); return nil }
            return value
        } catch { return nil }
    }
    func save(_ data: Data, identity: String, key: String, now: Date = Date()) throws {
        guard !data.isEmpty, data.count <= maximumEntry else { return }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
        var directory = root; var values = URLResourceValues(); values.isExcludedFromBackup = true; try directory.setResourceValues(values)
        let encoder = PropertyListEncoder(); encoder.outputFormat = .binary
        let plain = try encoder.encode(NativeBrowserPageSnapshot(data: data, savedAt: now))
        let bytes = try AES.GCM.seal(plain, using: RemoteCrypto.key(key), authenticating: aad(identity)).combined!
        try bytes.write(to: file(identity), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        let files = try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey], options: [.skipsHiddenFiles])
        let ordered = files.filter { $0.pathExtension == "enc" }.compactMap { url -> (URL, Int, Date)? in
            guard let info = try? url.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey]), let size = info.fileSize else { return nil }; return (url, size, info.contentModificationDate ?? .distantPast)
        }.sorted { $0.2 > $1.2 }
        var count = 0, total = 0
        for (url, size, date) in ordered {
            count += 1; total += size
            if count > maximumCount || total > maximumTotal || now.timeIntervalSince(date) >= 7 * 86400 { try? FileManager.default.removeItem(at: url) }
        }
    }
    func remove(identity: String) { try? FileManager.default.removeItem(at: file(identity)) }
}

@MainActor extension WKWebView {
    func nativeArchiveData() async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in createWebArchiveData { continuation.resume(with: $0) } }
    }
}

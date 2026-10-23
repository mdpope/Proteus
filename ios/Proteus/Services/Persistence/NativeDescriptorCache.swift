import Foundation

/// Immutable cache snapshots are sealed and written in order, away from UIKit.
/// Only encrypted, device-protected descriptors are stored; this cache grants no access.
final class NativeDescriptorCacheWriter {
    static let shared = NativeDescriptorCacheWriter()
    private let queue = DispatchQueue(label: "org.proteusapp.review.proteus.descriptor-cache", qos: .utility)
    // Account changes and background transitions are durability boundaries; normal
    // navigation and scrolling never wait on this queue.
    func flush() { queue.sync {} }
    func save(tabs: [BrowserDescriptor], selections: [String: JSON], snapshot: JSON, key: String, account: String, url: URL) {
        queue.async {
            do {
                let encoded = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(tabs))
                let payload: JSON = .object(["tabs": encoded, "selections": .object(selections), "accountSnapshot": snapshot])
                let encrypted = try RemoteCrypto.seal(payload, key: key, aad: account)
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try Data(encrypted.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                var file = url; var values = URLResourceValues(); values.isExcludedFromBackup = true; try file.setResourceValues(values)
            } catch { /* A disposable descriptor cache must never change owner data. */ }
        }
    }
}


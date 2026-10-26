import Foundation

/// Immutable cache snapshots are sealed and written in order, away from UIKit.
/// Only encrypted, device-protected descriptors are stored; this cache grants no access.
final class NativeDescriptorCacheWriter {
    static let shared = NativeDescriptorCacheWriter()
    private let queue = DispatchQueue(label: "org.proteusapp.review.proteus.descriptor-cache", qos: .utility)
    private let lock = NSLock()
    private var pending: [String: () -> Void] = [:]
    // Account changes and background transitions are durability boundaries; normal
    // navigation and scrolling never wait on this queue.
    func flush() {
        queue.sync {
            lock.lock(); let writes = Array(pending.values); pending.removeAll(); lock.unlock()
            for write in writes { write() }
        }
    }
    private func enqueue(_ url: URL, write: @escaping () -> Void) {
        let key = url.path
        lock.lock(); let scheduled = pending[key] != nil; pending[key] = write; lock.unlock()
        guard !scheduled else { return }
        queue.asyncAfter(deadline: .now() + .milliseconds(100)) {
            self.lock.lock(); let latest = self.pending.removeValue(forKey: key); self.lock.unlock()
            latest?()
        }
    }
    func saveNavigation(_ value: JSON, key: String, url: URL) {
        enqueue(url) {
            do {
                let sealed = try RemoteCrypto.seal(value, key: key, aad: "proteus-mobile-navigation-v1")
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try Data(sealed.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            } catch { /* Preserve the last complete navigation snapshot. */ }
        }
    }
    func save(tabs: [BrowserDescriptor], selections: [String: JSON], snapshot: JSON, key: String, account: String, url: URL) {
        enqueue(url) {
            do {
                let safe = tabs.compactMap(SharedAppStore.retainedDescriptor)
                let encoded = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(safe))
                let payload: JSON = .object(["tabs": encoded, "selections": .object(selections), "accountSnapshot": snapshot])
                let encrypted = try RemoteCrypto.seal(payload, key: key, aad: account)
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try Data(encrypted.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                var file = url; var values = URLResourceValues(); values.isExcludedFromBackup = true; try file.setResourceValues(values)
            } catch { /* A disposable descriptor cache must never change owner data. */ }
        }
    }
}


import Foundation

/// A receipt completes only after the corresponding immutable snapshot reaches
/// the atomic file boundary. Awaiting it suspends the caller, never the UI thread.
final class NativeCacheWriteReceipt: @unchecked Sendable {
    private let lock = NSLock()
    private var result: Result<Void, Error>?
    private var waiters: [CheckedContinuation<Void, Error>] = []

    init(result: Result<Void, Error>? = nil) { self.result = result }
    func value() async throws {
        try await withCheckedThrowingContinuation { continuation in
            lock.lock()
            if let result { lock.unlock(); continuation.resume(with: result) }
            else { waiters.append(continuation); lock.unlock() }
        }
    }
    fileprivate func finish(_ result: Result<Void, Error>) {
        lock.lock(); self.result = result; let waiting = waiters; waiters.removeAll(); lock.unlock()
        for continuation in waiting { continuation.resume(with: result) }
    }
}

/// Shared tab/history snapshots contain mutation retry identities as well as
/// presentation data. Preserve FIFO order and return failures to the mutation
/// caller; a failed local write must never authorize an owner-side effect.
final class NativeSharedCacheWriter: @unchecked Sendable {
    static let shared = NativeSharedCacheWriter()
    private let queue = DispatchQueue(label: "org.proteusapp.review.proteus.shared-cache-writer", qos: .utility)
    private var failures: [URL: Error] = [:]
    private let writeFile: (Data, URL) throws -> Void

    init(writeFile: @escaping (Data, URL) throws -> Void = NativeSharedCacheWriter.writeFile) {
        self.writeFile = writeFile
    }
    static func writeFile(_ data: Data, _ url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    func save(url: URL, snapshot: @escaping () throws -> Data, onFailure: @escaping (Error) -> Void) -> NativeCacheWriteReceipt {
        let receipt = NativeCacheWriteReceipt()
        queue.async {
            let result = Result { try self.writeFile(snapshot(), url) }
            switch result {
            case .success: self.failures.removeValue(forKey: url)
            case .failure(let error): self.failures[url] = error; onFailure(error)
            }
            receipt.finish(result)
        }
        return receipt
    }
    /// Used only when loading/replacing store lifetime or entering background.
    /// Normal navigation and mutation dispatch use asynchronous receipts instead.
    func flush() throws {
        try queue.sync { if let error = failures.values.first { throw error } }
    }
}

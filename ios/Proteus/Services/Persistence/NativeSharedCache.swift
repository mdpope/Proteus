import Foundation
import UIKit

/// Background-task wrapper so lifecycle cache writes can finish after the app leaves the screen.
enum NativeBackgroundWork {
    static func begin(_ name: String) -> UIBackgroundTaskIdentifier {
        guard Thread.isMainThread else { return .invalid }
        var identifier = UIBackgroundTaskIdentifier.invalid
        identifier = UIApplication.shared.beginBackgroundTask(withName: name) { UIApplication.shared.endBackgroundTask(identifier); identifier = .invalid }
        return identifier
    }
    static func end(_ identifier: UIBackgroundTaskIdentifier) {
        guard identifier != .invalid else { return }
        DispatchQueue.main.async { UIApplication.shared.endBackgroundTask(identifier) }
    }
}

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
    /// Writes not yet started for the same file collapse into the newest snapshot (which already
    /// contains every earlier mutation). Each caller's receipt completes with that write, so a
    /// burst of tab updates costs one encode/encrypt/write instead of one per mutation (N11-21).
    private struct Pending { var snapshot: () throws -> Data; var onFailure: (Error) -> Void; var receipts: [NativeCacheWriteReceipt] }
    private let pendingLock = NSLock()
    private var pending: [URL: Pending] = [:]
    func save(url: URL, snapshot: @escaping () throws -> Data, onFailure: @escaping (Error) -> Void) -> NativeCacheWriteReceipt {
        let receipt = NativeCacheWriteReceipt()
        pendingLock.lock()
        if var waiting = pending[url] {
            waiting.snapshot = snapshot; waiting.onFailure = onFailure; waiting.receipts.append(receipt); pending[url] = waiting
            pendingLock.unlock(); return receipt
        }
        pending[url] = Pending(snapshot: snapshot, onFailure: onFailure, receipts: [receipt])
        pendingLock.unlock()
        queue.async {
            self.pendingLock.lock(); let job = self.pending.removeValue(forKey: url); self.pendingLock.unlock()
            guard let job else { return }
            let result = Result { try self.writeFile(job.snapshot(), url) }
            switch result {
            case .success: self.failures.removeValue(forKey: url)
            case .failure(let error): self.failures[url] = error; job.onFailure(error)
            }
            for waiting in job.receipts { waiting.finish(result) }
        }
        return receipt
    }
    /// Lifecycle variant: completes after every write queued so far, without blocking the caller.
    func flushAsync(completion: @escaping (Error?) -> Void) {
        queue.async { completion(self.failures.values.first) }
    }
    /// Used only when loading/replacing store lifetime or entering background.
    /// Normal navigation and mutation dispatch use asynchronous receipts instead.
    func flush() throws {
        try queue.sync { if let error = failures.values.first { throw error } }
    }
}

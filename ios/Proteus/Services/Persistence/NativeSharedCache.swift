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
    typealias WriteFile = (Data, URL) throws -> Void
    private let writeFile: WriteFile

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
    private struct Pending { var commit: (WriteFile) throws -> Void; var onFailure: (Error) -> Void; var receipts: [NativeCacheWriteReceipt] }
    private let pendingLock = NSLock()
    private var pending: [URL: Pending] = [:]
    func save(url: URL, snapshot: @escaping () throws -> Data, onFailure: @escaping (Error) -> Void) -> NativeCacheWriteReceipt {
        save(url: url, commit: { write in try write(snapshot(), url) }, onFailure: onFailure)
    }
    func save(url: URL, commit: @escaping (WriteFile) throws -> Void, onFailure: @escaping (Error) -> Void) -> NativeCacheWriteReceipt {
        let receipt = NativeCacheWriteReceipt()
        pendingLock.lock()
        if var waiting = pending[url] {
            waiting.commit = commit; waiting.onFailure = onFailure; waiting.receipts.append(receipt); pending[url] = waiting
            pendingLock.unlock(); return receipt
        }
        pending[url] = Pending(commit: commit, onFailure: onFailure, receipts: [receipt])
        pendingLock.unlock()
        queue.async {
            self.pendingLock.lock(); let job = self.pending.removeValue(forKey: url); self.pendingLock.unlock()
            guard let job else { return }
            let result = Result { try job.commit(self.writeFile) }
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

/// The journal is committed last. After an interrupted save, its reference still
/// leads to the last complete owner snapshot. Only the serial cache writer uses
/// the live instance after startup.
final class NativeTabCacheSlots: @unchecked Sendable {
    private var slot: Int?
    private var reference: JSON
    private var savedRevision: Int?

    init(reference: JSON = .null) {
        self.reference = reference
        slot = reference == .null ? nil : reference["slot"].int
        savedRevision = reference == .null ? nil : 0
    }

    private nonisolated static func url(_ slot: Int, root: URL) -> URL {
        root.appendingPathComponent("document-tab-snapshots-" + String(slot) + ".enc")
    }
    private nonisolated static func aad(_ slot: Int) -> String { "proteus-mobile-tab-snapshots-v1:" + String(slot) }

    nonisolated static func read(_ reference: JSON, root: URL, key: String) throws -> [String: JSON] {
        let slot = reference["slot"]
        let token = reference["token"].string
        guard (slot == .number(0) || slot == .number(1)), UUID(uuidString: token) != nil else {
            throw RemoteError(message: "The saved tab snapshot reference is invalid.")
        }
        let data = try Data(contentsOf: url(slot.int, root: root))
        let payload = try RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: aad(slot.int))
        guard payload["token"].string == token, case .object(let snapshots) = payload["scopes"] else {
            throw RemoteError(message: "The saved tab snapshot does not match its journal.")
        }
        return snapshots
    }

    func persist(journal: [String: JSON], snapshots: [String: JSON], revision: Int, at journalURL: URL, key: String, write: NativeSharedCacheWriter.WriteFile) throws {
        let root = journalURL.deletingLastPathComponent()
        var nextSlot = slot, nextReference = reference
        if revision != savedRevision {
            if snapshots.isEmpty { nextSlot = nil; nextReference = .null }
            else {
                let target = slot == 0 ? 1 : 0
                let token = UUID().uuidString
                let snapshot = JSON.object(["token": .string(token), "scopes": .object(snapshots)])
                try write(Data(RemoteCrypto.seal(snapshot, key: key, aad: Self.aad(target)).utf8), Self.url(target, root: root))
                nextSlot = target
                nextReference = .object(["slot": .number(Double(target)), "token": .string(token)])
            }
        }
        var payload = journal
        payload["ownerSnapshots"] = nextReference
        let encoded = try Data(RemoteCrypto.seal(.object(payload), key: key, aad: "proteus-mobile-document-tabs-v1").utf8)
        do { try write(encoded, journalURL) }
        catch {
            // Reconcile an error reported after atomic replacement before
            // choosing a slot for any subsequent transaction.
            guard (try? Data(contentsOf: journalURL)) == encoded else { throw error }
        }
        if let slot, slot != nextSlot { try? FileManager.default.removeItem(at: Self.url(slot, root: root)) }
        slot = nextSlot
        reference = nextReference
        savedRevision = revision
    }
}

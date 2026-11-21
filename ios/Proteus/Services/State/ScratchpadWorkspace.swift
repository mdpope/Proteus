import Foundation
import Combine
import CryptoKit

@MainActor final class ScratchpadDraft: ObservableObject {
    @Published var record: JSON
    @Published var title: String
    @Published var body: String
    @Published var category: String
    @Published var format: String
    @Published var error = ""
    @Published var saving = false
    var pending: [String: JSON]?
    var timer: Task<Void, Never>?
    var deadline: Task<Void, Never>?
    var conflict = false
    init(_ record: JSON, saved: JSON = .null) {
        self.record = record
        let value = saved == .null ? record : saved["value"]
        title = value["title"].string; body = value["body"].string; category = value["category"].string; format = value["format"].string
        pending = saved["pending"] == .null ? nil : saved["pending"].object
        if saved != .null && saved["revision"] != record["revision"] && pending == nil { conflict = true; error = "The saved draft uses an older version. Copy your text and reload the saved note before editing." }
    }
    var value: [String: JSON] { ["title": .string(title), "body": .string(body), "category": .string(category), "format": .string(format)] }
    var dirty: Bool { pending != nil || value.contains { record[$0.key] != $0.value } }
    var snapshot: JSON { .object(["revision": record["revision"], "value": .object(value), "pending": pending.map(JSON.object) ?? .null]) }
}

/// Per-owner notes and retry identities; only dirty drafts are written to the
/// existing encrypted, device-protected cache. The relay still checks sharing
/// before every read/write. A cached draft never grants access to its owner.
@MainActor final class ScratchpadWorkspace: ObservableObject {
    @Published var rootID = ""
    @Published var rows: [JSON] = []
    @Published var tabs: [String] = []
    @Published var selected = "master"
    @Published var search = ""
    @Published var workspaceFilter = ""
    @Published var projectFilter = ""
    @Published private(set) var recents: [JSON] = []
    @Published var category = ""
    @Published var sort = "created"
    @Published var categories: [String] = []
    @Published var error = ""
    @Published var ready = false
    @Published var indexing: JSON = .null
    @Published var hasMore = false
    @Published var offset = 0
    var drafts: [String: ScratchpadDraft] = [:]
    private var saved: [String: JSON] = [:]
    private var remote: RemoteStore?
    private var hostID = ""
    private var generation = UUID()
    private var listGeneration = UUID()
    private var cacheURL: URL?
    private var cacheKey: String?
    @Published private(set) var pendingAction: [String: JSON]?
    private let cacheRoot: URL
    private let keyProvider: () -> String?
    private let cacheWriter: NativeSharedCacheWriter

    init(cacheRoot: URL? = nil, cacheKey: @escaping () -> String? = { BrowserCacheKeychain.key() }, cacheWriter: NativeSharedCacheWriter = .shared) {
        self.cacheRoot = cacheRoot ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/scratchpad")
        self.keyProvider = cacheKey; self.cacheWriter = cacheWriter
    }
    func sidebarRecents(_ owner: RemoteStore) async -> [JSON] {
        guard let host = owner.connection?.hostId, let key = keyProvider(),
              let status = try? await owner.request("scratchpad.command", ["action": .string("status")]),
              status["configured"].bool, !status["rootId"].string.isEmpty else { return [] }
        if ready && host == hostID && status["rootId"].string == rootID { return recents }
        let digest = SHA256.hash(data: Data((host + "|" + status["rootId"].string).utf8)).map { String(format: "%02x", $0) }.joined()
        let url = cacheRoot.appendingPathComponent(digest + ".enc")
        return await Task.detached(priority: .utility) {
            guard let data = try? Data(contentsOf: url),
                  let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-scratchpad:" + digest) else { return [JSON]() }
            return payload["recents"].array
        }.value
    }

    func connect(_ remote: RemoteStore) async {
        let token = UUID(); generation = token; ready = false; error = ""
        do {
            let status = try await remote.request("scratchpad.command", ["action": .string("status")])
            guard token == generation else { return }
            indexing = status["indexing"]
            guard status["configured"].bool, !status["rootId"].string.isEmpty else { throw RemoteError(message: "Choose a Scratchpad folder on this computer first.") }
            let host = remote.connection?.hostId ?? "", root = status["rootId"].string
            if root != rootID || host != hostID || cacheURL == nil || cacheKey == nil {
                // Flush the old root's local snapshot before changing bindings.
                // No write is sent to the newly selected owner on its behalf.
                if cacheURL != nil, cacheKey != nil { try await persist(); guard token == generation else { return } }
                for draft in drafts.values { draft.timer?.cancel(); draft.deadline?.cancel() }
                drafts = [:]; tabs = []; selected = "master"; rows = []; saved = [:]; pendingAction = nil; search = ""; workspaceFilter = ""; projectFilter = ""; category = ""; offset = 0
                cacheURL = nil; cacheKey = nil
                rootID = root; hostID = host
                guard let key = keyProvider() else { throw RemoteError(message: "Unlock this device to protect Scratchpad drafts.") }
                cacheKey = key
                let digest = SHA256.hash(data: Data((host + "|" + root).utf8)).map { String(format: "%02x", $0) }.joined()
                let url = cacheRoot.appendingPathComponent(digest + ".enc")
                cacheURL = nil
                let payload = try await Task.detached(priority: .utility) { () throws -> JSON in
                    guard FileManager.default.fileExists(atPath: url.path) else { return .null }
                    let data = try Data(contentsOf: url)
                    return try RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-scratchpad:" + digest)
                }.value
                guard token == generation else { return }; cacheURL = url; saved = payload["drafts"].object; recents = payload["recents"].array; pendingAction = payload["action"] == .null ? nil : payload["action"].object
            }
            self.remote = remote; ready = true
        } catch { if token == generation { self.error = error.localizedDescription } }
    }
    func request(_ args: [String: JSON]) async throws -> JSON {
        guard ready, let remote, remote.connection?.hostId == hostID else { throw RemoteError(message: "Reconnect the owning computer and check Scratchpad sharing.") }
        let token = generation, root = rootID
        var input = args; input["rootId"] = .string(root)
        let result = try await remote.request("scratchpad.command", input)
        guard token == generation, root == rootID else { throw RemoteError(message: "The Scratchpad owner changed.") }
        return result
    }
    func refresh(projectID: String?) async {
        let token = UUID(); listGeneration = token
        do {
            var args: [String: JSON] = ["action": .string("list"), "search": .string(search), "sort": .string(sort), "offset": .number(Double(offset))]
            if let projectID { args["projectId"] = .string(projectID) } else if !projectFilter.isEmpty { args["projectId"] = .string(projectFilter) }
            if projectID == nil, !workspaceFilter.isEmpty { args["workspaceFilter"] = .string(workspaceFilter) }
            if !category.isEmpty { args["category"] = .string(category) }
            let result = try await request(args); guard token == listGeneration else { return }; rows = result["items"].array; categories = result["categories"].array.map(\.string).filter { !$0.isEmpty }; hasMore = result["hasMore"].bool; error = ""
            if indexing["running"].bool {
                let status = try await request(["action": .string("status")]); guard token == listGeneration else { return }
                guard status["rootId"].string == rootID else { indexing = .null; throw RemoteError(message: "Scratchpad storage changed. Reopen Scratchpad to select the new index; your old drafts are retained.") }
                indexing = status["indexing"]
                if !indexing["running"].bool { let final = try await request(args); guard token == listGeneration else { return }; rows = final["items"].array; categories = final["categories"].array.map(\.string).filter { !$0.isEmpty }; hasMore = final["hasMore"].bool }
            }
        } catch { if token == listGeneration { self.error = error.localizedDescription } }
    }
    func open(_ id: String) async {
        do {
            if drafts[id]?.dirty != true { let row = try await request(["action": .string("read"), "id": .string(id)]); drafts[id] = ScratchpadDraft(row, saved: saved[id] ?? .null) }
            if !tabs.contains(id) { guard tabs.count < 20 else { throw RemoteError(message: "Close a saved scratch tab before opening more.") }; tabs.append(id) }
            selected = id; error = ""
            if let draft = drafts[id] { recents = Array(([JSON.object(["id": .string(id), "title": .string(draft.title), "visitedAt": .string(Date().ISO8601Format())])] + recents.filter { $0["id"].string != id }).prefix(100)); try await persist() }
        } catch { self.error = error.localizedDescription }
    }
    func persist(completedAction: Bool = false) async throws {
        guard let url = cacheURL, let key = cacheKey else { throw RemoteError(message: "Scratchpad draft storage is unavailable.") }
        for (id, draft) in drafts { if draft.dirty { saved[id] = draft.snapshot } else { saved.removeValue(forKey: id) } }
        let snapshot: JSON = .object(["drafts": .object(saved), "recents": .array(recents), "action": completedAction ? .null : pendingAction.map(JSON.object) ?? .null]), aad = "proteus-scratchpad:" + url.deletingPathExtension().lastPathComponent
        let receipt = cacheWriter.save(url: url, snapshot: { Data(try RemoteCrypto.seal(snapshot, key: key, aad: aad).utf8) }, onFailure: { _ in })
        try await receipt.value()
    }
    func edited(_ draft: ScratchpadDraft) {
        draft.timer?.cancel()
        draft.timer = Task { [weak self, weak draft] in
            do { try await Task.sleep(for: .milliseconds(800)); guard let self, let draft else { return }; draft.timer = nil; try await self.persist(); if draft.error.isEmpty { await self.save(draft) } }
            catch is CancellationError {} catch { draft?.error = error.localizedDescription }
        }
        if draft.deadline == nil { draft.deadline = Task { [weak self, weak draft] in
            do { try await Task.sleep(for: .seconds(5)); guard let self, let draft else { return }; draft.deadline = nil; try await self.persist(); if draft.error.isEmpty { await self.save(draft) } }
            catch is CancellationError {} catch { draft?.error = error.localizedDescription }
        } }
    }
    func save(_ draft: ScratchpadDraft, retry: Bool = false) async {
        guard !draft.saving, !draft.conflict, draft.error.isEmpty || retry, draft.dirty else { return }
        draft.timer?.cancel(); draft.deadline?.cancel(); draft.deadline = nil
        guard !draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, draft.title.count <= 500, draft.category.count <= 200 else { draft.error = "Use a title of 1–500 characters and a list name of at most 200 characters."; return }
        draft.saving = true; draft.error = ""
        do {
            if draft.pending == nil { var input = draft.value; input["action"] = .string("update"); input["id"] = draft.record["id"]; input["expectedRevision"] = draft.record["revision"]; input["operationId"] = .string(UUID().uuidString); draft.pending = input }
            let command = draft.pending!; try await persist()
            let row = try await request(command); var next = row.object
            for key in ["title", "body", "category", "format"] { next[key] = command[key] }
            draft.record = .object(next); draft.pending = nil; try await persist()
        } catch { if (error as? RemoteError)?.code == "SCRATCH_REJECTED" { draft.pending = nil }; draft.error = error.localizedDescription }
        draft.saving = false
        if draft.error.isEmpty, draft.dirty { await save(draft) }
    }
    func action(_ args: [String: JSON]) async throws -> JSON {
        if let pendingAction {
            var prior = pendingAction; prior.removeValue(forKey: "operationId")
            guard prior == args else { throw RemoteError(message: "Retry the unconfirmed Scratchpad action before choosing another action.") }
        } else { pendingAction = args.merging(["operationId": .string(UUID().uuidString)]) { _, new in new } }
        do { try await persist(); let result = try await request(pendingAction!); try await persist(completedAction: true); pendingAction = nil; return result }
        catch { if (error as? RemoteError)?.code == "SCRATCH_REJECTED" { try await persist(completedAction: true); pendingAction = nil }; throw error }
    }
    func create(projectID: String?) async {
        do { var input: [String: JSON] = ["action": .string("create"), "title": .string("Untitled"), "body": .string(""), "format": .string("markdown")]; if let projectID { input["projectId"] = .string(projectID) } else if !projectFilter.isEmpty { input["projectId"] = .string(projectFilter) } else if !workspaceFilter.isEmpty { input["workspaceId"] = .string(workspaceFilter) }; let row = try await action(input); await open(row["id"].string) }
        catch { self.error = error.localizedDescription }
    }
    func retryAction() async {
        guard var command = pendingAction else { return }
        command.removeValue(forKey: "operationId")
        do {
            let row = try await action(command), id = row["id"].string.isEmpty ? command["id"]?.string ?? "" : row["id"].string
            error = ""
            if command["action"]?.string == "delete" { await close(id) }
            else { if let draft = drafts[id] { draft.record = .object(draft.record.object.merging(row.object) { _, new in new }) }; await open(id) }
        } catch { self.error = error.localizedDescription }
    }
    func reload(_ id: String) async {
        do {
            let row = try await request(["action": .string("read"), "id": .string(id)])
            if let draft = drafts[id] { draft.timer?.cancel(); draft.deadline?.cancel() }
            saved.removeValue(forKey: id); drafts[id] = ScratchpadDraft(row); try await persist(); error = ""
        } catch { self.error = error.localizedDescription }
    }
    func close(_ id: String) async {
        if let draft = drafts[id] { await save(draft); guard !draft.dirty else { error = draft.error.isEmpty ? "Wait for this scratch to finish saving." : draft.error; return }; draft.timer?.cancel(); draft.deadline?.cancel() }
        tabs.removeAll { $0 == id }; drafts.removeValue(forKey: id); if selected == id { selected = "master" }
    }
    func leave() async { let work = NativeBackgroundWork.begin("Save Scratchpad drafts"); defer { NativeBackgroundWork.end(work) }; for draft in drafts.values { await save(draft) }; do { try await persist() } catch { self.error = error.localizedDescription } }
}

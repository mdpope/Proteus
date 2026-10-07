import Foundation
import Combine

@MainActor final class RemoteStore: ObservableObject {
    @Published var state: JSON = .null
    @Published var chats: [String: JSON] = [:]
    @Published var allRuns: [JSON] = []
    private var allRunOffset = 0
    @Published var providerStatuses: [String: JSON] = [:]
    @Published var models: [JSON] = []
    @Published var modelStatus: JSON = .null
    @Published var status = "Not paired"
    @Published var connected = false
    @Published var error: String?
    @Published var selectedChat: String?
    @Published var paired = false
    @Published var drafts: [String: JSON] = [:]
    var onPaired: ((DeviceConnection) throws -> Void)?
    var onHostName: ((String) -> Void)?
    var onChatDeleted: ((String) -> Void)?
    var onAuthenticatedRevocation: (() -> Void)?
    private let cacheRoot: URL?
    private let legacyCredentials: Bool
    private(set) var connection: DeviceConnection?
    private var invite: JSON?
    var pairingLabel: String { invite?["label"].string ?? "" }
    private var challenge = ""
    private var prefix = ""
    private var incoming = 0
    private var outgoing = 0
    private var cursor = ""
    private var socket: URLSessionWebSocketTask?
    private var readTask: Task<Void, Never>?
    private var retryTask: Task<Void, Never>?
    private var sendTask: Task<Void, Error>?
    private var active = true
    private var generation = UUID()
    private var waiting: [String: CheckedContinuation<JSON, Error>] = [:]
    private var timeouts: [String: Task<Void, Never>] = [:]
    private var pendingCommands: [String: JSON] = [:]
    var pendingCommandCount: Int { pendingCommands.count }
    private var cacheTimer: Task<Void, Never>?
    var cacheURL: URL {
        if let cacheRoot { return cacheRoot.appendingPathComponent("cache.enc") }
        return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/cache.enc")
    }
    init(connection: DeviceConnection? = DeviceKeychain.load(), cacheRoot: URL? = nil, legacyCredentials: Bool = true) {
        self.cacheRoot = cacheRoot; self.legacyCredentials = legacyCredentials
        self.connection = connection; paired = connection != nil
        if let connection, let data = try? Data(contentsOf: cacheURL), let cache = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: connection.key, aad: "proteus-cache-v1") {
            state = cache["state"]; chats = cache["chats"].object; allRuns = cache["allRuns"].array; allRunOffset = allRuns.count; cursor = cache["cursor"].string; drafts = cache["drafts"].object; status = "Offline · cached history"
            providerStatuses = state["providerStatuses"].object; modelStatus = state["providerStatus"]; models = modelStatus["models"].array
        }
    }
    func draft(_ id: String) -> JSON { drafts[id] ?? .null }
    func setDraft(_ id: String, _ value: JSON) { if value == .null { drafts.removeValue(forKey: id) } else { drafts[id] = value }; saveCache() }
    func copyHistory(from other: RemoteStore) { state = other.state; chats = other.chats; allRuns = other.allRuns; allRunOffset = other.allRunOffset; cursor = other.cursor; drafts = other.drafts }
    func pair(_ code: String) throws {
        guard let components = URLComponents(string: code.trimmingCharacters(in: .whitespacesAndNewlines)), components.scheme == "proteus", components.host == "pair", let encoded = components.queryItems?.first(where: { $0.name == "data" })?.value else { throw RemoteError(message: "Paste a Proteus pairing link from the Mac’s Remote Access screen.") }
        var base64 = encoded.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64) else { throw RemoteError(message: "Invalid pairing code.") }
        let value = try JSONDecoder().decode(JSON.self, from: data)
        guard value["version"].int == 1, UUID(uuidString: value["hostId"].string) != nil else { throw RemoteError(message: "Unsupported pairing code.") }
        _ = try RemoteCrypto.key(value["key"].string)
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let expiry = formatter.date(from: value["expiresAt"].string), expiry > Date() else { throw RemoteError(message: "Pairing code expired. Create a new one on the Mac.") }
        let relay = try Self.validatedRelay(value["relay"].string)
        suspend(); if legacyCredentials { DeviceKeychain.clear() }; connection = nil; paired = false; state = .null; chats = [:]; cursor = ""; try? FileManager.default.removeItem(at: cacheURL)
        var normalized = value.object; normalized["relay"] = .string(relay)
        invite = .object(normalized); active = true; connect()
    }
    /// Same origin-only transport policy as the Mac: plaintext is restricted to local networks.
    static func validatedRelay(_ value: String) throws -> String {
        let text = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var url = URLComponents(string: text), let host = url.host?.lowercased(), !host.isEmpty,
              ["ws", "wss"].contains(url.scheme ?? ""), url.user == nil, url.password == nil,
              url.query == nil, url.fragment == nil, ["", "/"].contains(url.path),
              url.port == nil || (1...65535).contains(url.port!),
              !text.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) || CharacterSet.controlCharacters.contains($0) })
        else { throw RemoteError(message: "Enter a relay address such as wss://relay.example.com, without a path, account, query or fragment.") }
        let octets = host.split(separator: ".", omittingEmptySubsequences: false)
        let parts = octets.compactMap { Int($0) }
        let ipv4 = octets.count == 4 && octets.allSatisfy { !$0.isEmpty && $0.utf8.allSatisfy { (48...57).contains($0) } } && parts.count == 4 && parts.allSatisfy { (0...255).contains($0) }
        let privateIP = ipv4 && (parts[0] == 10 || (parts[0] == 192 && parts[1] == 168) || (parts[0] == 172 && (16...31).contains(parts[1])))
        let local = ["localhost", "127.0.0.1", "::1", "[::1]"].contains(host) || host.hasSuffix(".local") || privateIP
        guard url.scheme == "wss" || local else { throw RemoteError(message: "External relays require wss://.") }
        url.host = host; url.path = ""
        guard let normalized = url.string, url.url != nil else { throw RemoteError(message: "Invalid relay address.") }
        return normalized
    }
    // Called only after the destination's existing credential was durably updated.
    fileprivate func changeRelay(_ relay: String, reconnect: Bool) {
        suspend(reason: "Relay address changed. An unconfirmed action may have reached this Mac; refresh its history before retrying.")
        connection?.relay = relay; error = nil
        activity(reconnect)
    }
    func connect() {
        guard active, socket == nil, connection != nil || invite != nil else { return }
        let relay = connection?.relay ?? invite?["relay"].string ?? ""
        let host = connection?.hostId ?? invite?["hostId"].string ?? ""
        guard let url = URL(string: "\(relay)/socket?role=client&host=\(host)") else { return }
        generation = UUID(); let current = generation
        incoming = 0; outgoing = 0; challenge = ""; prefix = ""; status = "Connecting…"
        let task = URLSession.shared.webSocketTask(with: url); socket = task; task.resume()
        readTask = Task {
            do {
                while !Task.isCancelled {
                    let message = try await task.receive()
                    guard generation == current else { return }
                    let data: Data
                    switch message { case .data(let value): data = value; case .string(let value): data = Data(value.utf8); @unknown default: continue }
                    try await receive(JSONDecoder().decode(JSON.self, from: data))
                }
            } catch {
                if generation == current {
                    #if DEBUG
                    print("Proteus transport: \(error.localizedDescription)")
                    #endif
                    lost()
                }
            }
        }
    }
    private func raw(_ packet: JSON) async throws {
        guard let socket else { throw RemoteError(message: "Mac is disconnected.") }
        try await socket.send(.data(JSONEncoder().encode(packet)))
    }
    private func authenticate() async throws {
        guard let connection else { return }
        let nonce = RemoteCrypto.random(); prefix = "\(challenge):\(nonce)"
        let box = try RemoteCrypto.seal(.object(["nonce": .string(nonce)]), key: connection.key, aad: "\(challenge):auth")
        try await raw(.object(["type": .string("auth"), "deviceId": .string(connection.deviceId), "box": .string(box)]))
    }
    func receive(_ packet: JSON) async throws {
        switch packet["type"].string {
        case "challenge":
            challenge = packet["challenge"].string
            guard challenge.count == 64 else { throw RemoteError(message: "Invalid host challenge.") }
            if let invite {
                let box = try RemoteCrypto.seal(.object(["name": .string(ProcessInfo.processInfo.hostName)]), key: invite["key"].string, aad: "\(challenge):pair")
                try await raw(.object(["type": .string("pair"), "box": .string(box)]))
            } else { try await authenticate() }
        case "paired":
            guard let invite else { throw RemoteError(message: "Unexpected pairing response.") }
            let device = try RemoteCrypto.open(packet["box"].string, key: invite["key"].string, aad: "\(challenge):paired")
            let value = DeviceConnection(relay: invite["relay"].string, hostId: invite["hostId"].string, deviceId: device["id"].string, key: device["key"].string)
            do { if legacyCredentials { try DeviceKeychain.save(value) }; try onPaired?(value) } catch { self.error = error.localizedDescription; self.invite = nil; active = false; disconnect(); return }
            connection = value; self.invite = nil; paired = true
            try await authenticate()
        case "ready":
            guard let connection else { return }
            let ready = try RemoteCrypto.open(packet["box"].string, key: connection.key, aad: "\(prefix):ready")
            guard ready["protocol"].int == 1 else { throw RemoteError(message: "Unsupported remote protocol.") }
            connected = true; status = "Connected"; error = nil
            // Separate task: the receive loop must remain free to deliver these responses.
            Task { await refresh(); if let selectedChat { await openChat(selectedChat) }; await retryPending() }
        case "data":
            guard let connection, packet["seq"].int == incoming + 1 else { throw RemoteError(message: "Invalid message sequence.") }
            let seq = packet["seq"].int
            let value = try RemoteCrypto.open(packet["box"].string, key: connection.key, aad: "\(prefix):host:\(seq)"); incoming = seq
            if value["type"].string == "revoked" {
                guard value["deviceId"].string == connection.deviceId else { throw RemoteError(message: "Invalid revocation identity.") }
                suspend(reason: "This Mac authenticated revocation of this device."); status = "Access revoked by Mac"; onAuthenticatedRevocation?(); error = "This Mac revoked access. Your cached history remains available. Add a new pairing from Connections to reconnect."
            } else if value["type"].string == "result" {
                let id = value["id"].string
                timeouts.removeValue(forKey: id)?.cancel()
                pendingCommands.removeValue(forKey: id)
                if let continuation = waiting.removeValue(forKey: id) {
                    if value["error"].string.isEmpty { continuation.resume(returning: value["result"]) }
                    else { continuation.resume(throwing: RemoteError(message: value["error"].string)) }
                }
            } else if value["type"].string == "event" {
                cursor = value["cursor"].string
                if value["event"].string == "state" { updateState(value["data"]) }
                if value["event"].string == "run" { mergeChat(value["data"]) }
                if value["event"].string == "chat.lifecycle" { applyLifecycle(value["data"]); Task { await refresh() } }
                saveCache()
            }
        case "rejected", "revoked":
            // Relay notices are not proof of host revocation. Retain credentials and cached data.
            error = "The relay refused this connection. Verify Connections on the Mac; your saved pairing and history are preserved."; invite = nil; active = false; disconnect(); status = "Connection refused · pairing retained"
        default: throw RemoteError(message: "Unknown relay message.")
        }
    }
    private func transmit(_ command: JSON) async throws {
        guard connected, let connection else { throw RemoteError(message: "Mac is offline. Reconnect before sending.") }
        let previous = sendTask; let current = generation
        let task = Task { @MainActor in
            _ = try? await previous?.value
            guard current == self.generation, self.connected else { throw RemoteError(message: "Connection changed.") }
            self.outgoing += 1; let seq = self.outgoing
            let box = try RemoteCrypto.seal(command, key: connection.key, aad: "\(self.prefix):client:\(seq)")
            try await self.raw(.object(["type": .string("data"), "seq": .number(Double(seq)), "box": .string(box)]))
        }
        sendTask = task; try await task.value
    }
    func request(_ method: String, _ args: [String: JSON] = [:]) async throws -> JSON {
        guard active, connected else { throw RemoteError(message: "Mac is offline. Your draft is preserved; reconnect before sending.") }
        let id = UUID().uuidString.lowercased()
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let command: JSON = .object(["id": .string(id), "method": .string(method), "args": .object(args), "issuedAt": .string(formatter.string(from: Date()))])
        return try await withCheckedThrowingContinuation { continuation in
            waiting[id] = continuation; pendingCommands[id] = command
            timeouts[id] = Task {
                try? await Task.sleep(for: .seconds(75)); guard !Task.isCancelled else { return }
                if let continuation = waiting.removeValue(forKey: id) { continuation.resume(throwing: RemoteError(message: "The host did not confirm the action. Refresh before trying again.")) }
                pendingCommands.removeValue(forKey: id); timeouts.removeValue(forKey: id)
            }
            let requestGeneration = generation
            Task {
                guard requestGeneration == generation, pendingCommands[id] != nil else { return }
                do { try await transmit(command) } catch { if requestGeneration == generation && connected { self.error = error.localizedDescription } }
            }
        }
    }
    private func retryPending() async {
        let retryGeneration = generation
        for (id, command) in pendingCommands {
            guard generation == retryGeneration, pendingCommands[id] != nil else { return }
            try? await transmit(command)
        }
    }
    func refresh() async {
        do { let value = try await request("sync", ["cursor": .string(cursor)]); cursor = value["cursor"].string; updateState(value["state"]); saveCache() }
        catch { self.error = error.localizedDescription }
    }
    private func updateState(_ value: JSON) {
        // Keep already fetched older run summaries when receiving the newest page.
        var object = value.object; let ids = Set(value["runs"].array.map { $0["id"].string })
        object["runs"] = .array(value["runs"].array + state["runs"].array.filter { !ids.contains($0["id"].string) })
        state = .object(object)
        if connected { onHostName?(value["hostName"].string) }
        providerStatuses = value["providerStatuses"].object
        if value["providerStatus"] != .null { modelStatus = value["providerStatus"]; models = modelStatus["models"].array }
    }
    func loadMoreRuns() async {
        do { let more = try await request("runs.list", ["offset": .number(Double(state["runs"].array.count))]); var object = state.object; let ids = Set(state["runs"].array.map { $0["id"].string }); object["runs"] = .array(state["runs"].array + more.array.filter { !ids.contains($0["id"].string) }); state = .object(object) }
        catch { self.error = error.localizedDescription }
    }
    var allRunCount: Int { state["runCountIncludingArchived"].int }
    func loadAllRuns(reset: Bool = false) async {
        guard connected, state["capabilities"].array.contains(.string("chat.lifecycle.v1")) else { return }
        let offset = reset ? 0 : allRunOffset
        do {
            let page = try await request("runs.list", ["offset": .number(Double(offset)), "limit": .number(100), "includeArchived": .bool(true)]).array
            if reset { allRuns = page }
            else {
                let existing = Set(allRuns.map { $0["id"].string })
                allRuns += page.filter { !existing.contains($0["id"].string) }
            }
            allRunOffset = offset + page.count
            saveCache()
        } catch { self.error = error.localizedDescription }
    }
    func archiveChat(_ id: String, archived: Bool) async throws {
        guard connected, state["capabilities"].array.contains(.string("chat.lifecycle.v1")) else { throw RemoteError(message: "Reconnect this Mac to manage chats.") }
        let row = chats[id] ?? state["runs"].array.first(where: { $0["id"].string == id }) ?? allRuns.first(where: { $0["id"].string == id }) ?? .null
        var arguments: [String: JSON] = ["id": .string(id), "archived": .bool(archived)]
        if !row["updatedAt"].string.isEmpty { arguments["expectedUpdatedAt"] = row["updatedAt"] }
        arguments["expectedArchivedAt"] = row["archivedAt"].string.isEmpty ? .null : row["archivedAt"]
        var result = (try await request("chat.archive", arguments)).object
        result["archived"] = .bool(archived)
        applyLifecycle(.object(result))
        await refresh()
    }
    func deleteChat(_ id: String) async throws {
        guard connected, state["capabilities"].array.contains(.string("chat.lifecycle.v1")) else { throw RemoteError(message: "Reconnect this Mac to manage chats.") }
        let row = chats[id] ?? state["runs"].array.first(where: { $0["id"].string == id }) ?? allRuns.first(where: { $0["id"].string == id }) ?? .null
        var arguments: [String: JSON] = ["id": .string(id)]
        if !row["updatedAt"].string.isEmpty { arguments["expectedUpdatedAt"] = row["updatedAt"] }
        arguments["expectedArchivedAt"] = row["archivedAt"].string.isEmpty ? .null : row["archivedAt"]
        let result = try await request("chat.delete", arguments)
        applyLifecycle(result)
        await refresh()
    }
    func applyLifecycle(_ value: JSON) {
        let id = value["id"].string
        guard !id.isEmpty else { return }
        if value["deleted"].bool {
            chats.removeValue(forKey: id)
            allRuns.removeAll { $0["id"].string == id }
            var snapshot = state.object
            snapshot["runs"] = .array(state["runs"].array.filter { $0["id"].string != id })
            state = .object(snapshot)
            drafts.removeValue(forKey: "reply:" + id)
            drafts.removeValue(forKey: "reply-attachments:" + id)
            if selectedChat == id { selectedChat = nil }
            onChatDeleted?(id)
        } else {
            func changed(_ row: JSON) -> JSON {
                guard row["id"].string == id else { return row }
                var result = row.object
                result["archivedAt"] = value["archivedAt"]
                result["archived"] = value["archived"]
                result["updatedAt"] = value["updatedAt"]
                return .object(result)
            }
            if let chat = chats[id] { chats[id] = changed(chat) }
            allRuns = allRuns.map(changed)
            var snapshot = state.object
            var visible = state["runs"].array.map(changed)
            if value["archived"].bool { visible.removeAll { $0["id"].string == id } }
            else if !visible.contains(where: { $0["id"].string == id }), let restored = allRuns.first(where: { $0["id"].string == id }) ?? chats[id] { visible.insert(changed(restored), at: 0) }
            snapshot["runs"] = .array(visible)
            state = .object(snapshot)
        }
        saveCache()
    }
    @discardableResult func openChat(_ id: String) async -> Bool {
        selectedChat = id
        guard connected else { return false } // Offline opening is a cache read; it never sends or changes hosts.
        do { mergeChat(try await request("chat.get", ["id": .string(id)])); saveCache(); return true } catch { self.error = error.localizedDescription; return false }
    }
    func reviewFailure(_ id: String) async {
        guard connected, let chat = chats[id], chat["attentionRequired"].bool,
              ["failed", "interrupted"].contains(chat["status"].string) else { return }
        do {
            let reviewed = try await request("chat.review", ["id": .string(id), "expectedFailureEventAt": chat["failureEventAt"]])
            var updated = chat.object; updated["attentionRequired"] = .bool(false); updated["failureReviewedAt"] = reviewed["failureReviewedAt"]; chats[id] = .object(updated)
            var snapshot = state.object
            snapshot["runs"] = .array(state["runs"].array.map { row in guard row["id"].string == id else { return row }; var item = row.object; item["attentionRequired"] = .bool(false); item["failureReviewedAt"] = reviewed["failureReviewedAt"]; return .object(item) })
            state = .object(snapshot); saveCache(); await refresh()
        } catch { self.error = error.localizedDescription }
    }
    func mergeChat(_ value: JSON) {
        let id = value["id"].string
        guard let old = chats[id] else { chats[id] = value; return }
        var events: [Int: JSON] = [:]
        for page in old["retainedHistory"].array + [old, value] {
            for (index, event) in page["events"].array.enumerated() { events[page["eventStart"].int + index] = event }
        }
        var pages: [(start: Int, events: [JSON])] = []
        for key in events.keys.sorted() {
            if let last = pages.last, last.start + last.events.count == key { pages[pages.count - 1].events.append(events[key]!) }
            else { pages.append((key, [events[key]!])) }
        }
        let latest = pages.popLast() ?? (start: 0, events: [])
        var merged = (value["eventCount"].int >= old["eventCount"].int ? value : old).object
        merged["events"] = .array(latest.events)
        merged["eventStart"] = .number(Double(latest.start)); merged["earlier"] = merged["eventStart"]
        merged["retainedHistory"] = .array(pages.map { .object(["eventStart": .number(Double($0.start)), "events": .array($0.events)]) })
        chats[id] = .object(merged); saveCache()
    }

    func loadModels(force: Bool = false, provider: String = "copilot") async {
        do { let value = try await request("provider.status", ["force": .bool(force), "provider": .string(provider)]); providerStatuses[provider] = value; if provider == "copilot" { modelStatus = value; models = value["models"].array }; if !value["available"].bool { error = value["error"].string.isEmpty ? "Provider is not available on the Mac." : value["error"].string } }
        catch { self.error = error.localizedDescription }
    }
    @Published private(set) var usageBusy = false
    var usageEnabled: Bool { state["appearance"]["showProviderUsage"] != .bool(false) }
    func loadUsage(force: Bool = false) async {
        guard usageEnabled, active, connected, !usageBusy else { return }
        usageBusy = true; let current = generation
        defer { usageBusy = false }
        do {
            let value = try await request("provider.usage", ["force": .bool(force)])
            guard current == generation, usageEnabled else { return }
            var snapshot = state.object
            if value["enabled"] == .bool(false) {
                var appearance = snapshot["appearance"]?.object ?? [:]; appearance["showProviderUsage"] = .bool(false); snapshot["appearance"] = .object(appearance); snapshot.removeValue(forKey: "providerUsage")
            } else { snapshot["providerUsage"] = value }
            state = .object(snapshot); saveCache()
        } catch {
            // Offline/older hosts keep the last known snapshot; provider errors appear in details.
            guard current == generation else { return }
            var snapshot = state.object; var usage = snapshot["providerUsage"]?.object ?? [:]
            usage["error"] = .string("Usage could not be refreshed from this Mac."); snapshot["providerUsage"] = .object(usage); state = .object(snapshot)
        }
    }
    func activity(_ isActive: Bool) { active = isActive; if active { connect() } else { flushCache(); disconnect() } }
    private func lost() {
        socket?.cancel(with: .goingAway, reason: nil); socket = nil; connected = false; status = paired ? "Mac offline · reconnecting" : "Pairing connection lost"
        if active && (paired || invite != nil) { retryTask?.cancel(); retryTask = Task { try? await Task.sleep(for: .seconds(3)); if !Task.isCancelled { connect() } } }
    }
    func disconnect() { generation = UUID(); readTask?.cancel(); retryTask?.cancel(); socket?.cancel(with: .goingAway, reason: nil); socket = nil; connected = false; status = paired ? "Offline · cached history" : "Not paired" }
    func forget() { active = false; suspend(); if legacyCredentials { DeviceKeychain.clear() }; connection = nil; invite = nil; paired = false; state = .null; chats = [:]; allRuns = []; allRunOffset = 0; drafts = [:]; selectedChat = nil; cursor = ""; cacheTimer?.cancel(); try? FileManager.default.removeItem(at: cacheURL); for c in waiting.values { c.resume(throwing: RemoteError(message: "Device forgotten.")) }; waiting.removeAll(); pendingCommands.removeAll(); timeouts.values.forEach { $0.cancel() }; timeouts.removeAll() }
    // A host switch never leaves a retry behind. Commands already accepted by the Mac continue there.
    func suspend(reason: String = "Mac selection changed. An unconfirmed action may have reached that Mac; refresh its history before retrying.") {
        flushCache(); active = false; disconnect(); sendTask?.cancel(); sendTask = nil
        for continuation in waiting.values { continuation.resume(throwing: RemoteError(message: reason)) }
        waiting.removeAll(); pendingCommands.removeAll(); timeouts.values.forEach { $0.cancel() }; timeouts.removeAll()
    }
    func flushCache() {
        cacheTimer?.cancel(); guard let connection else { return }
        do {
            let payload: JSON = .object(["state": state, "chats": .object(chats), "allRuns": .array(Array(allRuns.prefix(500))), "cursor": .string(cursor), "drafts": .object(drafts)])
            let encrypted = try RemoteCrypto.seal(payload, key: connection.key, aad: "proteus-cache-v1")
            try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(encrypted.utf8).write(to: cacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var url = cacheURL; var attributes = URLResourceValues(); attributes.isExcludedFromBackup = true; try url.setResourceValues(attributes)
        } catch { /* A failed optional cache never changes the authoritative host state. */ }
    }
    private func saveCache() {
        cacheTimer?.cancel(); cacheTimer = Task { try? await Task.sleep(for: .seconds(1)); guard !Task.isCancelled else { return }; flushCache() }
    }
}

struct MacDestination: Codable, Identifiable, Equatable {
    var id: String
    var label: String
}
struct ChatDeletionEvent: Equatable {
    let token = UUID()
    let hostID: String
    let chatID: String
}
private struct DestinationIndex: Codable {
    var version = 1
    var selectedID: String?
    var destinations: [MacDestination] = []
}

/// Credentials and cached records are independent even when every Mac uses the same relay.
@MainActor final class DestinationStore: ObservableObject {
    @Published private(set) var destinations: [MacDestination] = []
    @Published private(set) var selectedID: String?
    @Published private(set) var selected: RemoteStore?
    @Published var pairing: RemoteStore?
    @Published var error: String?
    @Published var deletedChat: ChatDeletionEvent?
    private var stores: [String: RemoteStore] = [:]
    private var observations: [String: AnyCancellable] = [:]
    private let root: URL
    private let service: String
    private var active = false
    var selectedLabel: String { destinations.first { $0.id == selectedID }?.label ?? "Choose a Mac" }
    var indexURL: URL { root.appendingPathComponent("destinations.json") }
    init(root: URL? = nil, keychainService: String = "org.proteusapp.proteus.mobile") {
        self.root = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus")
        service = keychainService
        do {
            if FileManager.default.fileExists(atPath: indexURL.path) {
                let index = try JSONDecoder().decode(DestinationIndex.self, from: Data(contentsOf: indexURL))
                guard index.version == 1, index.destinations.allSatisfy({ UUID(uuidString: $0.id) != nil }), Set(index.destinations.map(\.id)).count == index.destinations.count else { throw RemoteError(message: "Saved Mac destinations could not be read. Your pairing keys have been preserved.") }
                destinations = index.destinations; selectedID = index.selectedID
            } else if let legacy = DeviceKeychain.load(service: service) {
                guard UUID(uuidString: legacy.hostId) != nil else { throw RemoteError(message: "The existing Mac pairing is invalid; its key has been preserved.") }
                try DeviceKeychain.save(legacy, hostID: legacy.hostId, service: service)
                let old = self.root.appendingPathComponent("cache.enc"), folder = cacheRoot(legacy.hostId)
                if FileManager.default.fileExists(atPath: old.path) {
                    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                    let new = folder.appendingPathComponent("cache.enc")
                    if !FileManager.default.fileExists(atPath: new.path) { try FileManager.default.copyItem(at: old, to: new) }
                }
                destinations = [MacDestination(id: legacy.hostId, label: "My Mac")]; selectedID = legacy.hostId
                try persist(); DeviceKeychain.clear(service: service); try? FileManager.default.removeItem(at: old)
            }
            if let id = selectedID ?? destinations.first?.id { try select(id, connect: false) }
        } catch { self.error = error.localizedDescription }
    }
    private func cacheRoot(_ id: String) -> URL { root.appendingPathComponent("hosts").appendingPathComponent(id) }
    private func persist() throws {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let index = DestinationIndex(selectedID: selectedID, destinations: destinations)
        try JSONEncoder().encode(index).write(to: indexURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        var url = indexURL; var attrs = URLResourceValues(); attrs.isExcludedFromBackup = true; try url.setResourceValues(attrs)
    }
    func select(_ id: String, connect: Bool = true) throws {
        guard destinations.contains(where: { $0.id == id }) else { throw RemoteError(message: "Choose a saved Mac.") }
        let remote: RemoteStore
        if let cached = stores[id] { remote = cached }
        else {
            guard let credentials = DeviceKeychain.load(hostID: id, service: service), credentials.hostId == id else { throw RemoteError(message: "This Mac’s pairing key is unavailable. Add it again using a new pairing code.") }
            remote = RemoteStore(connection: credentials, cacheRoot: cacheRoot(id), legacyCredentials: false); stores[id] = remote
        }
        if selectedID != id || selected !== remote { selected?.suspend() }
        observeHostName(remote, id: id)
        selectedID = id; selected = remote; try persist()
        if connect && active { remote.activity(true) }
    }
    private func observeHostName(_ remote: RemoteStore, id: String) {
        remote.onHostName = { [weak self, weak remote] label in
            guard let self, let remote, self.stores[id] === remote else { return }
            self.hydrateHostLabel(label, for: id)
        }
        remote.onChatDeleted = { [weak self] chatID in self?.deletedChat = ChatDeletionEvent(hostID: id, chatID: chatID) }
        observations[id] = remote.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
    }
    func hydrateHostLabel(_ label: String, for id: String) {
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let remote = stores[id], remote.connected, remote.connection?.hostId == id,
              let destination = destinations.first(where: { $0.id == id }), destination.label != name,
              !name.isEmpty, name.count <= 80,
              !name.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) })
        else { return }
        do { try rename(id, label: name) } catch { self.error = "The Mac name could not be saved. Try Rename in Manage Macs." }
    }
    func relayAddress(for id: String) -> String? {
        guard destinations.contains(where: { $0.id == id }) else { return nil }
        return stores[id]?.connection?.relay ?? DeviceKeychain.load(hostID: id, service: service)?.relay
    }
    func editRelay(_ id: String, address: String) throws {
        guard destinations.contains(where: { $0.id == id }), var connection = DeviceKeychain.load(hostID: id, service: service), connection.hostId == id else {
            throw RemoteError(message: "This Mac’s pairing key is unavailable. Unlock the device and try again.")
        }
        let relay = try RemoteStore.validatedRelay(address)
        guard relay != connection.relay else { return }
        // Save first. A failed Keychain write leaves the live socket and old endpoint untouched.
        connection.relay = relay
        try DeviceKeychain.save(connection, hostID: id, service: service)
        stores[id]?.changeRelay(relay, reconnect: selectedID == id && active)
        objectWillChange.send()
    }
    func rename(_ id: String, label: String) throws {
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 80, let index = destinations.firstIndex(where: { $0.id == id }) else { throw RemoteError(message: "Give this Mac a name of 1–80 characters.") }
        let previous = destinations; destinations[index].label = name
        do { try persist() } catch { destinations = previous; throw error }
    }
    func add(_ code: String, label: String) throws {
        // Pair independently; a failed/expired invite never removes an existing Mac.
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 80 else { throw RemoteError(message: "Enter a name for this Mac (up to 80 characters).") }
        let candidate = RemoteStore(connection: nil, cacheRoot: root.appendingPathComponent("pending-pair"), legacyCredentials: false)
        candidate.onPaired = { [weak self, weak candidate] connection in
            guard let self, let candidate else { throw RemoteError(message: "Pairing was cancelled.") }
            let suggested = candidate.pairingLabel.trimmingCharacters(in: .whitespacesAndNewlines)
            let chosen = ["My Mac", "New Mac"].contains(name) && !suggested.isEmpty && suggested.count <= 80 && !suggested.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) ? suggested : name
            let existingLabel = self.destinations.first { $0.id == connection.hostId }?.label
            try self.register(connection, label: ["My Mac", "New Mac"].contains(name) ? existingLabel ?? chosen : chosen, history: candidate)
        }
        try candidate.pair(code); pairing?.suspend(); pairing = candidate
    }
    // Also exercised with synthetic credentials by migration/isolation tests.
    func register(_ connection: DeviceConnection, label: String, history: RemoteStore? = nil) throws {
        guard UUID(uuidString: connection.hostId) != nil else { throw RemoteError(message: "Invalid host identity.") }
        _ = try RemoteCrypto.key(connection.key)
        let id = connection.hostId
        let oldCredential = DeviceKeychain.load(hostID: id, service: service)
        let previous = destinations, previousID = selectedID
        let oldHistory = stores[id] ?? oldCredential.map { RemoteStore(connection: $0, cacheRoot: cacheRoot(id), legacyCredentials: false) }
        try DeviceKeychain.save(connection, hostID: id, service: service)
        if let index = destinations.firstIndex(where: { $0.id == id }) { destinations[index].label = label }
        else { destinations.append(MacDestination(id: id, label: label)) }
        selectedID = id
        do { try persist() } catch {
            destinations = previous; selectedID = previousID
            if let oldCredential { try? DeviceKeychain.save(oldCredential, hostID: id, service: service) } else { DeviceKeychain.clear(hostID: id, service: service) }; throw error
        }
        selected?.suspend()
        let remote = RemoteStore(connection: connection, cacheRoot: cacheRoot(id), legacyCredentials: false)
        if let old = oldHistory { remote.copyHistory(from: old) }
        else if let history { remote.copyHistory(from: history) }
        observeHostName(remote, id: id)
        stores[id] = remote; selected = remote; remote.flushCache()
        // Finish the pairing handshake on the candidate, then use only the saved host instance.
        Task { await Task.yield(); history?.suspend(); try? FileManager.default.removeItem(at: self.root.appendingPathComponent("pending-pair")); if self.pairing === history { self.pairing = nil }; if self.active && self.selected === remote { remote.activity(true) } }
    }
    func cancelPairing() { pairing?.suspend(); pairing = nil; try? FileManager.default.removeItem(at: root.appendingPathComponent("pending-pair")) }
    func forget(_ id: String) throws {
        guard destinations.contains(where: { $0.id == id }) else { return }
        let previous = destinations, previousID = selectedID
        destinations.removeAll { $0.id == id }; if selectedID == id { selectedID = destinations.first?.id }
        do { try persist() } catch { destinations = previous; selectedID = previousID; throw error }
        stores[id]?.suspend(); stores[id]?.forget(); stores.removeValue(forKey: id); observations.removeValue(forKey: id)
        DeviceKeychain.clear(hostID: id, service: service); try? FileManager.default.removeItem(at: cacheRoot(id))
        if previousID == id { selected = nil; if let next = selectedID { try select(next) } }
    }
    func remote(for id: String) -> RemoteStore? {
        if let store = stores[id] { return store }
        guard destinations.contains(where: { $0.id == id }), let credential = DeviceKeychain.load(hostID: id, service: service), credential.hostId == id else { return nil }
        let remote = RemoteStore(connection: credential, cacheRoot: cacheRoot(id), legacyCredentials: false)
        stores[id] = remote; observeHostName(remote, id: id); return remote
    }
    func refreshAll() async {
        for destination in destinations { if let remote = remote(for: destination.id) { remote.activity(active); if remote.connected { await remote.refresh() } } }
    }
    func status(_ id: String) -> String { if let remote = stores[id] { return remote.status }; return "Saved · not connected" }
    func activity(_ value: Bool) { active = value; for destination in destinations { remote(for: destination.id)?.activity(value) }; pairing?.activity(value) }
    func resetForTesting() { cancelPairing(); for id in destinations.map(\.id) { try? forget(id) }; DeviceKeychain.clear(service: service) }
}

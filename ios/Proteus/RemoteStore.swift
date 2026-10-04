import Foundation
import Combine

@MainActor final class RemoteStore: ObservableObject {
    @Published var state: JSON = .null
    @Published var chats: [String: JSON] = [:]
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
            state = cache["state"]; chats = cache["chats"].object; cursor = cache["cursor"].string; drafts = cache["drafts"].object; status = "Offline · cached history"
            providerStatuses = state["providerStatuses"].object; modelStatus = state["providerStatus"]; models = modelStatus["models"].array
        }
    }
    func draft(_ id: String) -> JSON { drafts[id] ?? .null }
    func setDraft(_ id: String, _ value: JSON) { if value == .null { drafts.removeValue(forKey: id) } else { drafts[id] = value }; saveCache() }
    func copyHistory(from other: RemoteStore) { state = other.state; chats = other.chats; cursor = other.cursor; drafts = other.drafts }
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
        guard let url = URL(string: value["relay"].string), ["ws", "wss"].contains(url.scheme ?? ""), url.user == nil, url.password == nil else { throw RemoteError(message: "Invalid relay address.") }
        let host = url.host ?? ""
        let parts = host.split(separator: ".").compactMap { Int($0) }
        let ipv4 = parts.count == 4 && parts.allSatisfy { (0...255).contains($0) }
        let privateIP = ipv4 && (parts[0] == 10 || (parts[0] == 192 && parts[1] == 168) || (parts[0] == 172 && (16...31).contains(parts[1])))
        let local = host == "localhost" || host == "127.0.0.1" || host.hasSuffix(".local") || privateIP
        guard url.scheme == "wss" || local else { throw RemoteError(message: "External relays require wss://.") }
        suspend(); if legacyCredentials { DeviceKeychain.clear() }; connection = nil; paired = false; state = .null; chats = [:]; cursor = ""; try? FileManager.default.removeItem(at: cacheURL)
        invite = value; active = true; connect()
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
    private func receive(_ packet: JSON) async throws {
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
            if value["type"].string == "result" {
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
                saveCache()
            }
        case "rejected", "revoked":
            error = "Pairing expired or this device was revoked. Create a new pairing code on the Mac."; invite = nil; active = false; disconnect(); status = "Pair again on the Mac"
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
            Task { do { try await transmit(command) } catch { if connected { self.error = error.localizedDescription } } }
        }
    }
    private func retryPending() async { for command in pendingCommands.values { try? await transmit(command) } }
    func refresh() async {
        do { let value = try await request("sync", ["cursor": .string(cursor)]); cursor = value["cursor"].string; updateState(value["state"]); saveCache() }
        catch { self.error = error.localizedDescription }
    }
    private func updateState(_ value: JSON) {
        // Keep already fetched older run summaries when receiving the newest page.
        var object = value.object; let ids = Set(value["runs"].array.map { $0["id"].string })
        object["runs"] = .array(value["runs"].array + state["runs"].array.filter { !ids.contains($0["id"].string) })
        state = .object(object)
        providerStatuses = value["providerStatuses"].object
        if value["providerStatus"] != .null { modelStatus = value["providerStatus"]; models = modelStatus["models"].array }
    }
    func loadMoreRuns() async {
        do { let more = try await request("runs.list", ["offset": .number(Double(state["runs"].array.count))]); var object = state.object; let ids = Set(state["runs"].array.map { $0["id"].string }); object["runs"] = .array(state["runs"].array + more.array.filter { !ids.contains($0["id"].string) }); state = .object(object) }
        catch { self.error = error.localizedDescription }
    }
    func openChat(_ id: String) async {
        selectedChat = id
        do { mergeChat(try await request("chat.get", ["id": .string(id)])); saveCache() } catch { self.error = error.localizedDescription }
    }
    func mergeChat(_ value: JSON) {
        let id = value["id"].string
        guard let old = chats[id] else { chats[id] = value; return }
        let first = value["eventStart"].int; let previous = old["eventStart"].int
        let newEvents = value["events"].array; let oldEvents = old["events"].array
        guard first <= previous + oldEvents.count && previous <= first + newEvents.count else { chats[id] = value; return }
        var events: [Int: JSON] = [:]
        for (index, event) in oldEvents.enumerated() { events[previous + index] = event }
        for (index, event) in newEvents.enumerated() { events[first + index] = event }
        var merged = value.object; merged["events"] = .array(events.keys.sorted().compactMap { events[$0] })
        merged["eventStart"] = .number(Double(min(first, previous))); merged["earlier"] = merged["eventStart"]
        chats[id] = .object(merged)
    }
    func loadModels(force: Bool = false, provider: String = "copilot") async {
        do { let value = try await request("provider.status", ["force": .bool(force), "provider": .string(provider)]); providerStatuses[provider] = value; if provider == "copilot" { modelStatus = value; models = value["models"].array }; if !value["available"].bool { error = value["error"].string.isEmpty ? "Provider is not available on the Mac." : value["error"].string } }
        catch { self.error = error.localizedDescription }
    }
    func activity(_ isActive: Bool) { active = isActive; if active { connect() } else { flushCache(); disconnect() } }
    private func lost() {
        socket?.cancel(with: .goingAway, reason: nil); socket = nil; connected = false; status = paired ? "Mac offline · reconnecting" : "Pairing connection lost"
        if active && (paired || invite != nil) { retryTask?.cancel(); retryTask = Task { try? await Task.sleep(for: .seconds(3)); if !Task.isCancelled { connect() } } }
    }
    func disconnect() { generation = UUID(); readTask?.cancel(); retryTask?.cancel(); socket?.cancel(with: .goingAway, reason: nil); socket = nil; connected = false; status = paired ? "Offline · cached history" : "Not paired" }
    func forget() { active = false; suspend(); if legacyCredentials { DeviceKeychain.clear() }; connection = nil; invite = nil; paired = false; state = .null; chats = [:]; drafts = [:]; selectedChat = nil; cursor = ""; cacheTimer?.cancel(); try? FileManager.default.removeItem(at: cacheURL); for c in waiting.values { c.resume(throwing: RemoteError(message: "Device forgotten.")) }; waiting.removeAll(); pendingCommands.removeAll(); timeouts.values.forEach { $0.cancel() }; timeouts.removeAll() }
    // A host switch never leaves a retry behind. Commands already accepted by the Mac continue there.
    func suspend() {
        flushCache(); active = false; disconnect(); sendTask?.cancel(); sendTask = nil
        for continuation in waiting.values { continuation.resume(throwing: RemoteError(message: "Mac selection changed. An unconfirmed action may have reached that Mac; refresh its history before retrying.")) }
        waiting.removeAll(); pendingCommands.removeAll(); timeouts.values.forEach { $0.cancel() }; timeouts.removeAll()
    }
    func flushCache() {
        cacheTimer?.cancel(); guard let connection else { return }
        do {
            let payload: JSON = .object(["state": state, "chats": .object(chats), "cursor": .string(cursor), "drafts": .object(drafts)])
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
    private var stores: [String: RemoteStore] = [:]
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
        selectedID = id; selected = remote; try persist()
        if connect && active { remote.activity(true) }
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
        stores[id]?.suspend(); stores[id]?.forget(); stores.removeValue(forKey: id)
        DeviceKeychain.clear(hostID: id, service: service); try? FileManager.default.removeItem(at: cacheRoot(id))
        if previousID == id { selected = nil; if let next = selectedID { try select(next) } }
    }
    func remote(for id: String) -> RemoteStore? { stores[id] }
    func status(_ id: String) -> String { if let remote = stores[id] { return remote.status }; return "Saved · not connected" }
    func activity(_ value: Bool) { active = value; selected?.activity(value); pairing?.activity(value) }
    func resetForTesting() { cancelPairing(); for id in destinations.map(\.id) { try? forget(id) }; DeviceKeychain.clear(service: service) }
}

import CryptoKit
import Observation
import Foundation
import Combine

// Relay ceilings are 100 packets / 32 MB per ten seconds. Reserve headroom
// for authentication and retain only a bounded sliding window of wire sizes.
struct NativeSendBudget {
    var sent: [(at: Double, bytes: Int)] = []
    mutating func delay(bytes: Int, now: Double) -> Double {
        sent.removeAll { now - $0.at >= 10 }
        return sent.count >= 80 || sent.reduce(0, { $0 + $1.bytes }) + bytes > 24_000_000 ? max(0.001, (sent.first?.at ?? now) + 10 - now) : 0
    }
    mutating func record(bytes: Int, now: Double) { sent.append((now, bytes)) }
}

/// Optional metadata from the authenticated host state. Older protocol-1 hosts need no upgrade.
struct RemoteHostInfo: Equatable {
    enum Platform: String {
        case darwin, linux, win32, unknown
        var label: String {
            switch self { case .darwin: "macOS"; case .linux: "Linux"; case .win32: "Windows"; case .unknown: "Computer" }
        }
    }
    let displayName: String
    let platform: Platform
    let architecture: String
    init(state: JSON) {
        let name = state["hostName"].string.trimmingCharacters(in: .whitespacesAndNewlines)
        displayName = Self.validLabel(name) ? name : "Connected computer"
        platform = Platform(rawValue: state["hostPlatform"].string) ?? .unknown
        let arch = state["hostArchitecture"].string
        architecture = !arch.isEmpty && arch.count <= 40 && arch.unicodeScalars.allSatisfy { CharacterSet.alphanumerics.contains($0) || "_-".unicodeScalars.contains($0) } ? arch : ""
    }
    var platformDescription: String? {
        guard platform != .unknown else { return nil }
        return platform.label + (architecture.isEmpty ? "" : " · " + architecture)
    }
    var signInPrompt: String { platform == .darwin ? "a browser or macOS Keychain prompt" : "a browser or system authorization prompt" }
    static func validLabel(_ value: String) -> Bool {
        !value.isEmpty && value.count <= 80 && !value.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) })
    }
}

/// Per-property observation: a view redraws only when the host values it reads change.
/// Streaming one chat no longer invalidates every view that holds this store.
@MainActor @Observable final class RemoteStore {
    var state: JSON = .null { didSet { catalogCache = nil } }
    /// Rebuilt only when host state changes; sidebar rows and chat filters read it per item.
    @ObservationIgnored private var catalogCache: NativeProjectCatalog?
    var chats: [String: JSON] = [:]
    var allRuns: [JSON] = []
    private var allRunOffset = 0
    var providerStatuses: [String: JSON] = [:]
    var models: [JSON] = []
    var modelStatus: JSON = .null
    var status = "Not paired"
    var connected = false
    var runtimeClockOffset: TimeInterval?
    var error: String?
    var selectedChat: String?
    @ObservationIgnored private var chatVisibilityManaged = false
    @ObservationIgnored private var visibleChat: (id: String, token: UUID)?
    var paired = false
    // Draft edits belong to their editor, not to every view observing host state.
    // Keep the in-memory value current without invalidating the loaded transcript;
    // `draftRevision` is the observed signal for edits that should refresh controls.
    @ObservationIgnored private(set) var drafts: [String: JSON] = [:]
    private var draftRevision = 0
    var onPaired: ((DeviceConnection) throws -> Void)?
    var onConnected: (() -> Void)?
    var onHostName: ((String) -> Void)?
    var onChatDeleted: ((String) -> Void)?
    var onAuthenticatedRevocation: (() -> Void)?
    private var cacheRoot: URL?
    private let legacyCredentials: Bool
    private(set) var connection: DeviceConnection?
    private var invite: JSON?
    var hostInfo: RemoteHostInfo { RemoteHostInfo(state: state) }
    var displayName: String { hostInfo.displayName }
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
    private var sendBudget = NativeSendBudget()
    private var sentRequests = Set<String>()
    private var capacityWaiter: CheckedContinuation<Void, Never>?
    private var active = true
    private var generation = UUID()
    private var waiting: [String: CheckedContinuation<JSON, Error>] = [:]
    private var timeouts: [String: Task<Void, Never>] = [:]
    private var pendingCommands: [String: JSON] = [:]
    var onContentTabsChanged: ((JSON) -> Void)?
    private(set) var authenticationGeneration = 0
    var pendingCommandCount: Int { pendingCommands.count }
    private var cacheTimer: Task<Void, Never>?
    private let cacheWriter = DispatchQueue(label: "com.proteus.remote-cache", qos: .utility)
    var cacheURL: URL {
        if let cacheRoot { return cacheRoot.appendingPathComponent("cache.enc") }
        return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/cache.enc")
    }
    init(connection: DeviceConnection? = DeviceKeychain.load(), cacheRoot: URL? = nil, legacyCredentials: Bool = true) {
        self.cacheRoot = cacheRoot; self.legacyCredentials = legacyCredentials
        self.connection = connection; paired = connection != nil
        if let connection, let data = try? Data(contentsOf: cacheURL), let cache = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: connection.key, aad: "proteus-cache-v1") {
            state = cache["state"]; chats = cache["chats"].object; allRuns = cache["allRuns"].array; allRunOffset = allRuns.count; cursor = cache["cursor"].string; drafts = cache["drafts"].object; draftRevision &+= 1; status = "Offline · cached history"
            providerStatuses = state["providerStatuses"].object; modelStatus = state["providerStatus"]; models = modelStatus["models"].array
        }
    }
    var projectCatalog: NativeProjectCatalog {
        if let catalogCache { _ = state; return catalogCache } // Reading state keeps observation intact.
        let catalog = NativeProjectCatalog(raw: state["workspaceProjects"]); catalogCache = catalog; return catalog
    }
    var supportsProjects: Bool { state["capabilities"].array.contains(.string("projects.v1")) && projectCatalog.isValid }
    private func acceptProjectCatalog(_ value: JSON) throws {
        guard NativeProjectCatalog(raw: value).isValid else { throw RemoteError(message: "The computer returned an invalid project catalog. Saved projects have been retained.") }
        var snapshot = state.object; snapshot["workspaceProjects"] = value; state = .object(snapshot); saveCache()
    }
    func refreshProjects() async {
        guard connected, state["capabilities"].array.contains(.string("projects.v1")) else { return }
        let owner = connection?.hostId, current = generation
        do {
            let value = try await request("projects.get")
            guard current == generation, connection?.hostId == owner else { return }
            try acceptProjectCatalog(value)
        } catch { self.error = error.localizedDescription }
    }
    @discardableResult func updateProjects(_ arguments: [String: JSON]) async throws -> JSON {
        try await updateProjectCatalog("projects.update", arguments: arguments)
    }
    @discardableResult func updateSources(_ arguments: [String: JSON]) async throws -> JSON {
        guard state["capabilities"].array.contains(.string("source-library.v1")) else { throw RemoteError(message: "Source library management requires an updated computer.") }
        return try await updateProjectCatalog("sources.update", arguments: arguments)
    }
    private func updateProjectCatalog(_ method: String, arguments: [String: JSON]) async throws -> JSON {
        guard connected, supportsProjects else { throw RemoteError(message: "Connect to a computer with project support before making changes.") }
        let owner = connection?.hostId, current = generation
        var args = arguments; if args["expectedRevision"] == nil { args["expectedRevision"] = projectCatalog.revision }
        let value = try await request(method, args)
        guard current == generation, connection?.hostId == owner else { throw RemoteError(message: "Computer changed. Refresh the original computer to check the result.") }
        try acceptProjectCatalog(value); return value
    }
    @discardableResult func moveChatToProject(id: String, workspaceID: String, projectID: String, expectedUpdatedAt: String) async throws -> JSON {
        guard projectCatalog.project(id: projectID, workspaceID: workspaceID)?["id"].string == projectID else { throw RemoteError(message: "Refresh and choose an available project on this computer.") }
        return try await updateProjectCatalog("chat.move", arguments: ["id": .string(id), "workspaceId": .string(workspaceID), "projectId": .string(projectID), "expectedUpdatedAt": .string(expectedUpdatedAt)])
    }
    /// Downloads a file kept with a chat on its owner into a private temporary copy.
    func attachmentFile(chatID: String, sha256: String, name: String) async throws -> URL {
        var data = Data(), offset = 0
        let host = connection?.hostId
        for _ in 0..<400 {
            let page = try await request("chat.attachments.get", ["id": .string(chatID), "sha256": .string(sha256), "offset": .number(Double(offset))])
            guard let chunk = Data(base64Encoded: page["dataBase64"].string) else { throw RemoteError(message: "The attachment could not be read.") }
            guard connection?.hostId == host, data.count + chunk.count <= NativeAttachmentBudget.maxFileBytes else { throw RemoteError(message: "The attachment destination changed or the file exceeds 8 MB.") }; data.append(chunk); offset += chunk.count
            if page["done"].bool || chunk.isEmpty { break }
        }
        guard SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == sha256 else { throw RemoteError(message: "The saved attachment bytes changed.") }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("chat-attachments/" + sha256, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let safe = name.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: ":", with: "_").trimmingCharacters(in: .whitespacesAndNewlines)
        let url = directory.appendingPathComponent(safe.isEmpty ? "attachment" : String(safe.prefix(120)))
        try data.write(to: url, options: [.atomic, .completeFileProtection]); return url
    }
    func draft(_ id: String) -> JSON { _ = draftRevision; return drafts[id] ?? .null }
    func setDraft(_ id: String, _ value: JSON, notifyObservers: Bool = true) {
        guard draft(id) != value else { return }
        // Attachment metadata and external draft actions still refresh their controls.
        if value == .null { drafts.removeValue(forKey: id) } else { drafts[id] = value }
        if notifyObservers { draftRevision &+= 1 }
        saveCache()
    }
    func copyHistory(from other: RemoteStore) { state = other.state; chats = other.chats; allRuns = other.allRuns; allRunOffset = other.allRunOffset; cursor = other.cursor; drafts = other.drafts; draftRevision &+= 1 }
    func pair(_ code: String) throws {
        guard let components = URLComponents(string: code.trimmingCharacters(in: .whitespacesAndNewlines)), components.scheme == "proteus", components.host == "pair", let encoded = components.queryItems?.first(where: { $0.name == "data" })?.value else { throw RemoteError(message: "Paste a Proteus pairing link from the computer’s Remote Access screen.") }
        var base64 = encoded.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64) else { throw RemoteError(message: "Invalid pairing code.") }
        let value = try JSONDecoder().decode(JSON.self, from: data)
        guard value["version"].int == 1, UUID(uuidString: value["hostId"].string) != nil else { throw RemoteError(message: "Unsupported pairing code.") }
        _ = try RemoteCrypto.key(value["key"].string)
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let expiry = formatter.date(from: value["expiresAt"].string), expiry > Date() else { throw RemoteError(message: "Pairing code expired. Create a new one on the computer.") }
        let relay = try Self.validatedRelay(value["relay"].string)
        suspend(); if legacyCredentials { DeviceKeychain.clear() }; connection = nil; paired = false; state = .null; chats = [:]; cursor = ""; removeCache()
        var normalized = value.object; normalized["relay"] = .string(relay)
        invite = .object(normalized); active = true; connect()
    }
    /// Same origin-only transport policy as the host: plaintext is restricted to local networks.
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
        suspend(reason: "Relay address changed. An unconfirmed action may have reached \(displayName); refresh its history before retrying.")
        connection?.relay = relay; error = nil
        activity(reconnect)
    }
    func connect() {
        guard active, socket == nil, connection != nil || invite != nil else { return }
        let relay = connection?.relay ?? invite?["relay"].string ?? ""
        let host = connection?.hostId ?? invite?["hostId"].string ?? ""
        guard let url = URL(string: "\(relay)/socket?role=client&host=\(host)") else { return }
        generation = UUID(); let current = generation
        sentRequests = []; capacityWaiter?.resume(); capacityWaiter = nil
        sendBudget = NativeSendBudget()
        incoming = 0; outgoing = 0; challenge = ""; prefix = ""; status = "Connecting…"
        // Hosts and the relay accept 8 MB packets. URLSession defaults to 1 MiB and drops the socket
        // ("Message too long") once a real host's state grows past it, leaving the device offline.
        let task = URLSession.shared.webSocketTask(with: url); task.maximumMessageSize = 8_000_000; socket = task; task.resume()
        readTask = Task {
            do {
                while !Task.isCancelled {
                    let message = try await task.receive()
                    guard generation == current else { return }
                    let data: Data
                    switch message { case .data(let value): data = value; case .string(let value): data = Data(value.utf8); @unknown default: continue }
                    // Decode off the main actor; the loop still processes one message at a time.
                    try await receive(Self.decoded(data))
                }
            } catch {
                if generation == current && self.socket === task {
                    #if DEBUG
                    print("Proteus transport: \(error.localizedDescription); state=\(task.state.rawValue), closeCode=\(task.closeCode.rawValue), active=\(active), pending=\(pendingCommands.count)")
                    #endif
                    lost()
                }
            }
        }
    }
    private func raw(_ packet: JSON) async throws {
        guard let socket else { throw RemoteError(message: "\(displayName) is disconnected.") }
        do { try await socket.send(.data(JSONEncoder().encode(packet))) }
        catch {
            #if DEBUG
            print("Proteus wire send failure: state=\(socket.state.rawValue), closeCode=\(socket.closeCode.rawValue), paired=\(paired), active=\(active), pending=\(pendingCommands.count), recentPackets=\(sendBudget.sent.count)")
            #endif
            if self.socket === socket { lost() }
            throw error
        }
    }
    private func authenticate() async throws {
        guard let connection else { return }
        let nonce = RemoteCrypto.random(); prefix = "\(challenge):\(nonce)"
        let box = try RemoteCrypto.seal(.object(["nonce": .string(nonce)]), key: connection.key, aad: "\(challenge):auth")
        try await raw(.object(["type": .string("auth"), "deviceId": .string(connection.deviceId), "box": .string(box)]))
    }
    /// Large owner payloads (state, chat history) are decrypted and decoded on a
    /// background executor so scrolling and typing are not blocked while chats stream.
    nonisolated static func decoded(_ data: Data) async throws -> JSON { try await Task.detached(priority: .userInitiated) { try JSONDecoder().decode(JSON.self, from: data) }.value }
    nonisolated static func opened(_ box: String, key: String, aad: String) async throws -> JSON { try await Task.detached(priority: .userInitiated) { try RemoteCrypto.open(box, key: key, aad: aad) }.value }
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
            // The saved destination adopts this transport. Opening a replacement while
            // this handshake is still running races authentication and sheet dismissal.
            connection = value; paired = true
            do { if legacyCredentials { try DeviceKeychain.save(value) }; try onPaired?(value) } catch { self.error = error.localizedDescription; self.invite = nil; active = false; disconnect(); return }
            self.invite = nil
            try await authenticate()
        case "ready":
            guard let connection else { return }
            let ready = try RemoteCrypto.open(packet["box"].string, key: connection.key, aad: "\(prefix):ready")
            guard ready["protocol"].int == 1 else { throw RemoteError(message: "Unsupported remote protocol.") }
            authenticationGeneration += 1
            connected = true; status = "Connected"; error = nil
            onConnected?()
            // Separate task: the receive loop must remain free to deliver these responses.
            let retainedCommands = pendingCommands
            Task { await refresh(); if let selectedChat { await openChat(selectedChat) }; await retryPending(retainedCommands) }
        case "data":
            guard let connection, packet["seq"].int == incoming + 1 else { throw RemoteError(message: "Invalid message sequence.") }
            let seq = packet["seq"].int
            let value = try await Self.opened(packet["box"].string, key: connection.key, aad: "\(prefix):host:\(seq)")
            guard packet["seq"].int == incoming + 1, self.connection?.hostId == connection.hostId else { throw RemoteError(message: "Invalid message sequence.") }
            incoming = seq
            if value["type"].string == "revoked" {
                guard value["deviceId"].string == connection.deviceId else { throw RemoteError(message: "Invalid revocation identity.") }
                suspend(reason: "\(displayName) authenticated revocation of this device."); status = "Access revoked by \(displayName)"; onAuthenticatedRevocation?(); error = "\(displayName) revoked access. Your cached history remains available. Add a new pairing from Connections to reconnect."
            } else if value["type"].string == "result" {
                let id = value["id"].string
                sentRequests.remove(id); capacityWaiter?.resume(); capacityWaiter = nil
                timeouts.removeValue(forKey: id)?.cancel()
                pendingCommands.removeValue(forKey: id)
                if let continuation = waiting.removeValue(forKey: id) {
                    if value["error"].string.isEmpty { continuation.resume(returning: value["result"]) }
                    else { continuation.resume(throwing: RemoteError(message: value["error"].string, code: value["code"].string, details: value["details"])) }
                }
            } else if value["type"].string == "event" {
                cursor = value["cursor"].string
                if value["event"].string == "state" { updateState(value["data"]) }
                if value["event"].string == "tabs" { onContentTabsChanged?(value["data"]) }
                if value["event"].string == "run" { mergeChat(value["data"]) }
                if value["event"].string == "chat.lifecycle" { applyLifecycle(value["data"]); Task { await refresh() } }
                saveCache()
            }
        case "rejected", "revoked":
            // Relay notices are not proof of host revocation. Retain credentials and cached data.
            error = "The relay refused this connection. Verify Connections on \(displayName); your saved pairing and history are preserved."; invite = nil; active = false; disconnect(); status = "Connection refused · pairing retained"
        default: throw RemoteError(message: "Unknown relay message.")
        }
    }
    private func transmit(_ command: JSON) async throws {
        guard connected, let connection else { throw RemoteError(message: "\(displayName) is offline. Reconnect before sending.") }
        let previous = sendTask; let current = generation
        let task = Task { @MainActor in
            _ = try? await previous?.value
            guard current == self.generation, self.connected else { throw RemoteError(message: "Connection changed.") }
            while self.sentRequests.count >= 4 {
                await withCheckedContinuation { self.capacityWaiter = $0 }
                guard current == self.generation, self.connected, self.pendingCommands[command["id"].string] != nil else { throw RemoteError(message: "Connection changed or request expired before transmission.") }
            }
            let estimatedBytes = ((try JSONEncoder().encode(command).count + 30) * 4 + 2) / 3 + 160
            guard estimatedBytes <= 8_000_000 else { throw RemoteError(message: "This request exceeds the connection packet limit.") }
            while true {
                let delay = self.sendBudget.delay(bytes: estimatedBytes, now: ProcessInfo.processInfo.systemUptime)
                if delay == 0 { break }
                try await Task.sleep(for: .seconds(delay))
                guard current == self.generation, self.connected, self.pendingCommands[command["id"].string] != nil else { throw RemoteError(message: "Connection changed or request expired before transmission.") }
            }
            guard self.pendingCommands[command["id"].string] != nil else { throw RemoteError(message: "Request expired before transmission.") }
            self.outgoing += 1; let seq = self.outgoing
            let box = try RemoteCrypto.seal(command, key: connection.key, aad: "\(self.prefix):client:\(seq)")
            self.sentRequests.insert(command["id"].string)
            self.sendBudget.record(bytes: estimatedBytes, now: ProcessInfo.processInfo.systemUptime)
            try await self.raw(.object(["type": .string("data"), "seq": .number(Double(seq)), "box": .string(box)]))
        }
        sendTask = task; try await task.value
    }
    func request(_ method: String, _ args: [String: JSON] = [:], requestID: String? = nil, issuedAt: String? = nil) async throws -> JSON {
        guard active, connected else { throw RemoteError(message: "\(displayName) is offline. Your draft is preserved; reconnect before sending.") }
        guard waiting.count < 128 else { throw RemoteError(message: "The connection is busy. Wait for current requests to finish.") }
        let id = requestID ?? UUID().uuidString.lowercased()
        guard UUID(uuidString: id) != nil, waiting[id] == nil else { throw RemoteError(message: "This action is already awaiting confirmation.") }
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var args = args
        if ["chat.start", "chat.send", "chat.reply", "chat.answer-question", "chat.resume"].contains(method) && args["inputOrigin"] == nil {
            let key = "proteus.mobile.window-id"
            let windowID = UserDefaults.standard.string(forKey: key) ?? UUID().uuidString
            UserDefaults.standard.set(windowID, forKey: key)
            args["inputOrigin"] = .object(["client": .string("mobile"), "windowId": .string(windowID)])
        }
        let command: JSON = .object(["id": .string(id), "method": .string(method), "args": .object(args), "issuedAt": .string(issuedAt ?? formatter.string(from: Date()))])
        return try await withCheckedThrowingContinuation { continuation in
            waiting[id] = continuation; pendingCommands[id] = command
            timeouts[id] = Task {
                try? await Task.sleep(for: .seconds(75)); guard !Task.isCancelled else { return }
                if let continuation = waiting.removeValue(forKey: id) { continuation.resume(throwing: RemoteError(message: "The host did not confirm the action. Refresh before trying again.")) }
                sentRequests.remove(id); capacityWaiter?.resume(); capacityWaiter = nil
                pendingCommands.removeValue(forKey: id); timeouts.removeValue(forKey: id)
            }
            let requestGeneration = generation
            Task {
                guard requestGeneration == generation, pendingCommands[id] != nil else { return }
                do { try await transmit(command) } catch { if requestGeneration == generation && connected { self.error = error.localizedDescription } }
            }
        }
    }
    private func retryPending(_ retained: [String: JSON]) async {
        let retryGeneration = generation
        for (id, command) in retained {
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
        if !NativeProjectCatalog(raw: value["workspaceProjects"]).isValid, projectCatalog.isValid { object["workspaceProjects"] = state["workspaceProjects"] }
        let next = JSON.object(object)
        if state != next { state = next }
        if connected { onHostName?(value["hostName"].string) }
        let statuses = value["providerStatuses"].object
        if providerStatuses != statuses { providerStatuses = statuses }
        if value["providerStatus"] != .null, modelStatus != value["providerStatus"] { modelStatus = value["providerStatus"]; models = modelStatus["models"].array }
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
        guard connected, state["capabilities"].array.contains(.string("chat.lifecycle.v1")) else { throw RemoteError(message: "Reconnect \(displayName) to manage chats.") }
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
        guard connected, state["capabilities"].array.contains(.string("chat.lifecycle.v1")) else { throw RemoteError(message: "Reconnect \(displayName) to manage chats.") }
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
    func showChat(_ id: String, token: UUID) async -> Bool {
        chatVisibilityManaged = true; visibleChat = (id, token); selectedChat = id
        return await openChat(id)
    }
    func hideChat(_ id: String, token: UUID) async {
        guard visibleChat?.id == id, visibleChat?.token == token else { return }
        visibleChat = nil
        if selectedChat == id { selectedChat = nil }
        guard connected, state["capabilities"].array.contains(.string("chat.watch.v1")) else { return }
        // This controls only this transport's presentation subscription. It never
        // cancels the chat, deletes its cache, or changes pending command identity.
        do { _ = try await request("chat.watch", ["id": .string(id), "watch": .string("none"), "watchToken": .string(token.uuidString)]) } catch { }
    }
    @discardableResult func openChat(_ id: String) async -> Bool {
        let watching = !chatVisibilityManaged || visibleChat?.id == id
        if watching { selectedChat = id }
        guard connected else { return false }
        let delta = state["capabilities"].array.contains(.string("chat.delta.v1"))
        let watch = watching ? (delta ? "delta" : "full") : "none"
        var arguments: [String: JSON] = ["id": .string(id), "watch": .string(watch)]
        if watching, let visibleChat, state["capabilities"].array.contains(.string("chat.watch.v1")) { arguments["watchToken"] = .string(visibleChat.token.uuidString) }
        do { mergeChat(try await request("chat.get", arguments)); saveCache(); return true } catch { self.error = error.localizedDescription; return false }
    }
    /// History, previews and action preflight must not change the visible view's
    /// subscription or silently promote its incremental stream back to full pages.
    func readChat(_ arguments: [String: JSON]) async throws -> JSON {
        var value = arguments; value["watch"] = .string("none")
        return try await request("chat.get", value)
    }
    func recoverChat(_ run: JSON, action: String, expectedFailureEventAt: JSON) async throws -> JSON {
        let id = run["id"].string
        do { return try await request("chat.recover", ["id": .string(id), "action": .string(action), "expectedFailureEventAt": expectedFailureEventAt]) }
        catch {
            // Only this explicit old-owner rejection permits the equivalent
            // manual continuation. A timeout never falls through to another send.
            guard action == "continue", ["manual", "scheduled", "schedule"].contains(run["trigger"].string), let rejection = error as? RemoteError, rejection.message.contains("Open an ordinary chat before continuing.") else { throw error }
            let fresh = try await readChat(["id": .string(id)])
            let deliveryID = "continue_" + id + "_" + expectedFailureEventAt.string.filter { $0 >= "0" && $0 <= "9" }
            if fresh["events"].array.contains(where: { $0["data"]["delivery"]["id"].string == deliveryID }) { return .object(["runId": .string(id)]) }
            guard ["failed", "interrupted"].contains(fresh["status"].string), fresh["archivedAt"].string.isEmpty, fresh["pending"] == .null, fresh["failureEventAt"] == expectedFailureEventAt, fresh["providerSessionId"] == run["providerSessionId"], fresh["schedule"]["provider"] == run["schedule"]["provider"] else { throw RemoteError(message: "This remote chat changed. Refresh before continuing.") }
            return try await request("chat.send", ["id": .string(id), "prompt": .string("Continue this conversation from where the interrupted turn left off. Preserve completed work and do not repeat completed external actions. Finish the current work before processing queued follow-up messages."), "mode": .string("queue"), "messageId": .string(deliveryID)])
        }
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
        if let observed = ProviderAllowance.date(value["observedAt"].string) { runtimeClockOffset = observed.timeIntervalSinceNow }
        let id = value["id"].string
        guard !id.isEmpty else { return }
        if chats[id] == nil && value["eventPatches"] == .null { chats[id] = value; return }
        // A push may beat its initial chat.get response. Retain its indexed
        // patches now so that the older full response cannot overwrite them.
        let old = chats[id] ?? .object(["events": .array([]), "eventCount": .number(0)])
        // Older paged replies may still add history but cannot replace current
        // status, selection-related metadata, questions or streaming content.
        let incomingAt = ProviderAllowance.date(value["observedAt"].string) ?? ProviderAllowance.date(value["updatedAt"].string) ?? .distantPast
        let previousAt = ProviderAllowance.date(old["observedAt"].string) ?? ProviderAllowance.date(old["updatedAt"].string) ?? .distantPast
        let incomingIsCurrent = incomingAt >= previousAt && value["eventCount"].int >= old["eventCount"].int
        var events: [Int: JSON] = [:]
        for page in old["retainedHistory"].array + (incomingIsCurrent ? [old, value] : [value, old]) {
            for (index, event) in page["events"].array.enumerated() { events[page["eventStart"].int + index] = event }
        }
        if incomingIsCurrent {
            for patch in value["eventPatches"].array {
                guard case .number(let index) = patch["index"], index.isFinite, index >= 0,
                      index.rounded(.down) == index, index < Double(value["eventCount"].int),
                      patch["event"] != .null else { return }
                events[Int(index)] = patch["event"]
            }
        }
        var pages: [(start: Int, events: [JSON])] = []
        for key in events.keys.sorted() {
            if let last = pages.last, last.start + last.events.count == key { pages[pages.count - 1].events.append(events[key]!) }
            else { pages.append((key, [events[key]!])) }
        }
        let latest = pages.popLast() ?? (start: 0, events: [])
        var merged = (incomingIsCurrent ? value : old).object
        merged.removeValue(forKey: "eventPatches")
        merged["events"] = .array(latest.events)
        merged["eventStart"] = .number(Double(latest.start)); merged["earlier"] = merged["eventStart"]
        merged["retainedHistory"] = .array(pages.map { .object(["eventStart": .number(Double($0.start)), "events": .array($0.events)]) })
        chats[id] = .object(merged); saveCache()
    }

    func loadModels(force: Bool = false, provider: String = "copilot") async {
        do { let value = try await request("provider.status", ["force": .bool(force), "provider": .string(provider)]); providerStatuses[provider] = value; if provider == "copilot" { modelStatus = value; models = value["models"].array }; if !value["available"].bool { error = value["error"].string.isEmpty ? "Provider is not available on the computer." : value["error"].string } }
        catch { self.error = error.localizedDescription }
    }
    private(set) var usageBusy = false
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
            usage["error"] = .string("Usage could not be refreshed from \(displayName)."); snapshot["providerUsage"] = .object(usage); state = .object(snapshot)
        }
    }
    // A visible owner-bound project may outlive a different computer selection.
    // Resume only an explicitly suspended owner; leave reconnect backoff alone.
    func resumeIfSuspended() { guard !active else { return }; activity(true) }
    func activity(_ isActive: Bool) { active = isActive; if active { connect() } else { flushCache(); disconnect() } }
    private func lost() {
        socket?.cancel(with: .goingAway, reason: nil); socket = nil; connected = false; status = paired ? "\(displayName) offline · reconnecting" : "Pairing connection lost"
        if active && (paired || invite != nil) { retryTask?.cancel(); retryTask = Task { try? await Task.sleep(for: .seconds(3)); if !Task.isCancelled { connect() } } }
    }
    func disconnect() { sentRequests = []; capacityWaiter?.resume(); capacityWaiter = nil; generation = UUID(); readTask?.cancel(); retryTask?.cancel(); socket?.cancel(with: .goingAway, reason: nil); socket = nil; connected = false; status = paired ? "Offline · cached history" : "Not paired" }
    func forget() { active = false; suspend(); if legacyCredentials { DeviceKeychain.clear() }; connection = nil; invite = nil; paired = false; state = .null; chats = [:]; allRuns = []; allRunOffset = 0; drafts = [:]; draftRevision &+= 1; selectedChat = nil; visibleChat = nil; chatVisibilityManaged = false; cursor = ""; cacheTimer?.cancel(); removeCache(); for c in waiting.values { c.resume(throwing: RemoteError(message: "Device forgotten.")) }; waiting.removeAll(); pendingCommands.removeAll(); timeouts.values.forEach { $0.cancel() }; timeouts.removeAll() }
    // A host switch never leaves a retry behind. Commands already accepted by the host continue there.
    func suspend(reason: String = "Computer selection changed. An unconfirmed action may have reached that computer; refresh its history before retrying.") {
        flushCache(); active = false; disconnect(); sendTask?.cancel(); sendTask = nil
        for continuation in waiting.values { continuation.resume(throwing: RemoteError(message: reason)) }
        waiting.removeAll(); pendingCommands.removeAll(); timeouts.values.forEach { $0.cancel() }; timeouts.removeAll()
    }
    func flushCache() {
        cacheTimer?.cancel(); guard let connection else { return }
        let payload = cachePayload(), url = cacheURL, key = connection.key
        // Lifecycle flushes wait behind queued snapshots so an older write cannot win.
        cacheWriter.sync { Self.writeCache(payload, key: key, url: url) }
    }
    func moveCache(to root: URL) {
        cacheTimer?.cancel()
        // Drain snapshots before changing the destination; no queued pending-pair
        // write may recreate the temporary cache after it has been removed.
        cacheWriter.sync {}
        cacheRoot = root
        flushCache()
    }
    private func cachePayload() -> JSON {
        .object(["state": state, "chats": .object(chats), "allRuns": .array(Array(allRuns.prefix(500))), "cursor": .string(cursor), "drafts": .object(drafts)])
    }
    private nonisolated static func writeCache(_ payload: JSON, key: String, url: URL) {
        do {
            let encrypted = try RemoteCrypto.seal(payload, key: key, aad: "proteus-cache-v1")
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(encrypted.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var cache = url; var attributes = URLResourceValues(); attributes.isExcludedFromBackup = true; try cache.setResourceValues(attributes)
        } catch { /* A failed optional cache never changes the authoritative host state. */ }
    }
    private func removeCache() {
        let url = cacheURL
        cacheWriter.sync { try? FileManager.default.removeItem(at: url) }
    }
    private func saveCache() {
        cacheTimer?.cancel()
        cacheTimer = Task {
            try? await Task.sleep(for: .seconds(1))
            guard !Task.isCancelled, let connection else { return }
            let payload = cachePayload(), key = connection.key, url = cacheURL
            // Encoding, encryption and disk I/O must not block the keyboard's main actor.
            cacheWriter.async { Self.writeCache(payload, key: key, url: url) }
        }
    }
}

struct HostDestination: Codable, Identifiable, Equatable {
    var id: String
    var label: String
    // Recognize the old defaults without rewriting saved names or Keychain account identifiers.
    static func pairingName(requested: String, suggested: String, existing: String?) -> String {
        guard ["My computer", "New computer", "My Mac", "New Mac"].contains(requested) else { return requested }
        if let existing { return existing }
        let name = suggested.trimmingCharacters(in: .whitespacesAndNewlines)
        return RemoteHostInfo.validLabel(name) ? name : requested
    }
}
struct ChatDeletionEvent: Equatable {
    let token = UUID()
    let hostID: String
    let chatID: String
}
private struct DestinationIndex: Codable {
    var version = 1
    var selectedID: String?
    var destinations: [HostDestination] = []
}

struct PairingCompletion: Equatable {
    let id = UUID()
    let hostID: String
}

/// Credentials and cached records are independent even when every computer uses the same relay.
@MainActor final class DestinationStore: ObservableObject {
    @Published private(set) var destinations: [HostDestination] = []
    @Published private(set) var selectedID: String?
    @Published private(set) var selected: RemoteStore?
    @Published var pairing: RemoteStore?
    @Published private(set) var pairingCompletion: PairingCompletion?
    @Published var error: String?
    @Published var deletedChat: ChatDeletionEvent?
    private var stores: [String: RemoteStore] = [:]
    private var observations: [String: AnyCancellable] = [:]
    private let root: URL
    private let service: String
    private var active = false
    var selectedLabel: String { destinations.first { $0.id == selectedID }?.label ?? "Choose a computer" }
    var indexURL: URL { root.appendingPathComponent("destinations.json") }
    init(root: URL? = nil, keychainService: String = "org.proteusapp.proteus.mobile") {
        self.root = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus")
        service = keychainService
        do {
            if FileManager.default.fileExists(atPath: indexURL.path) {
                let index = try JSONDecoder().decode(DestinationIndex.self, from: Data(contentsOf: indexURL))
                guard index.version == 1, index.destinations.allSatisfy({ UUID(uuidString: $0.id) != nil }), Set(index.destinations.map(\.id)).count == index.destinations.count else { throw RemoteError(message: "Saved computer destinations could not be read. Your pairing keys have been preserved.") }
                destinations = index.destinations; selectedID = index.selectedID
            } else if let legacy = DeviceKeychain.load(service: service) {
                guard UUID(uuidString: legacy.hostId) != nil else { throw RemoteError(message: "The existing computer pairing is invalid; its key has been preserved.") }
                try DeviceKeychain.save(legacy, hostID: legacy.hostId, service: service)
                let old = self.root.appendingPathComponent("cache.enc"), folder = cacheRoot(legacy.hostId)
                if FileManager.default.fileExists(atPath: old.path) {
                    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                    let new = folder.appendingPathComponent("cache.enc")
                    if !FileManager.default.fileExists(atPath: new.path) { try FileManager.default.copyItem(at: old, to: new) }
                }
                destinations = [HostDestination(id: legacy.hostId, label: "My computer")]; selectedID = legacy.hostId
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
        guard destinations.contains(where: { $0.id == id }) else { throw RemoteError(message: "Choose a saved computer.") }
        let remote: RemoteStore
        if let cached = stores[id] { remote = cached }
        else {
            guard let credentials = DeviceKeychain.load(hostID: id, service: service), credentials.hostId == id else { throw RemoteError(message: "This computer’s pairing key is unavailable. Add it again using a new pairing code.") }
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
        // RemoteStore is @Observable; views track the host values they read directly.
    }
    func hydrateHostLabel(_ label: String, for id: String) {
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let remote = stores[id], remote.connected, remote.connection?.hostId == id,
              let destination = destinations.first(where: { $0.id == id }), destination.label != name,
              !name.isEmpty, name.count <= 80,
              !name.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) })
        else { return }
        do { try rename(id, label: name) } catch { self.error = "The computer name could not be saved. Try Rename in Manage computers." }
    }
    func relayAddress(for id: String) -> String? {
        guard destinations.contains(where: { $0.id == id }) else { return nil }
        return stores[id]?.connection?.relay ?? DeviceKeychain.load(hostID: id, service: service)?.relay
    }
    func editRelay(_ id: String, address: String) throws {
        guard destinations.contains(where: { $0.id == id }), var connection = DeviceKeychain.load(hostID: id, service: service), connection.hostId == id else {
            throw RemoteError(message: "This computer’s pairing key is unavailable. Unlock the device and try again.")
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
        guard !name.isEmpty, name.count <= 80, let index = destinations.firstIndex(where: { $0.id == id }) else { throw RemoteError(message: "Give this computer a name of 1–80 characters.") }
        let previous = destinations; destinations[index].label = name
        do { try persist() } catch { destinations = previous; throw error }
    }
    func add(_ code: String, label: String) throws {
        // Pair independently; a failed/expired invite never removes an existing computer.
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 80 else { throw RemoteError(message: "Enter a name for this computer (up to 80 characters).") }
        let candidate = RemoteStore(connection: nil, cacheRoot: root.appendingPathComponent("pending-pair"), legacyCredentials: false)
        candidate.onPaired = { [weak self, weak candidate] connection in
            guard let self, let candidate, self.pairing === candidate else { throw RemoteError(message: "Pairing was cancelled.") }
            let existingLabel = self.destinations.first { $0.id == connection.hostId }?.label
            let chosen = HostDestination.pairingName(requested: name, suggested: candidate.pairingLabel, existing: existingLabel)
            try self.register(connection, label: chosen, history: candidate)
        }
        candidate.onConnected = { [weak self, weak candidate] in
            guard let self, let candidate, self.pairing === candidate,
                  self.selected === candidate, let id = candidate.connection?.hostId else { return }
            candidate.onPaired = nil; candidate.onConnected = nil
            self.pairing = nil
            self.pairingCompletion = PairingCompletion(hostID: id)
        }
        try candidate.pair(code); pairing?.suspend(); pairingCompletion = nil; pairing = candidate
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
        else { destinations.append(HostDestination(id: id, label: label)) }
        selectedID = id
        do { try persist() } catch {
            destinations = previous; selectedID = previousID
            if let oldCredential { try? DeviceKeychain.save(oldCredential, hostID: id, service: service) } else { DeviceKeychain.clear(hostID: id, service: service) }; throw error
        }
        selected?.suspend()
        let remote = history ?? RemoteStore(connection: connection, cacheRoot: cacheRoot(id), legacyCredentials: false)
        if let old = oldHistory { remote.copyHistory(from: old) }
        if history != nil { remote.moveCache(to: cacheRoot(id)) }
        observeHostName(remote, id: id)
        stores[id] = remote; selected = remote; remote.flushCache()
        try? FileManager.default.removeItem(at: root.appendingPathComponent("pending-pair"))
        if active { remote.activity(true) }
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
    func activateVisibleOwner(_ id: String) {
        guard active else { return }
        remote(for: id)?.resumeIfSuspended()
    }
    func refreshAll() async {
        for destination in destinations { if let remote = remote(for: destination.id) { remote.activity(active); if remote.connected { await remote.refresh() } } }
    }
    func status(_ id: String) -> String { if let remote = stores[id] { return remote.status }; return "Saved · not connected" }
    func activity(_ value: Bool) { active = value; for destination in destinations { remote(for: destination.id)?.activity(value) }; pairing?.activity(value) }
    func resetForTesting() { cancelPairing(); for id in destinations.map(\.id) { try? forget(id) }; DeviceKeychain.clear(service: service) }
}

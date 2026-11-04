import Foundation

/// Immutable value patches. Missing object keys and explicit JSON null are distinct.
enum NativeStatePatch {
    static func apply(_ value: JSON, patch: JSON) throws -> JSON {
        if patch == .null { return value }
        guard case .object(let node) = patch else { throw invalid() }
        if let replacement = node["v"] { return replacement }
        if let arrayNode = node["a"] {
            guard case .array(let items) = value, case .object(let spec) = arrayNode else { throw invalid() }
            var prior: [String: JSON] = [:], order: [String] = []
            for item in items {
                guard case .string(let id)? = item.object["id"], !id.isEmpty, prior[id] == nil else { throw invalid() }
                prior[id] = item; order.append(id)
            }
            if let ids = spec["ids"] {
                guard case .array(let values) = ids else { throw invalid() }
                order = try values.map { guard case .string(let id) = $0 else { throw invalid() }; return id }
                guard Set(order).count == order.count else { throw invalid() }
            }
            let added = spec["n"]?.object ?? [:], updates = spec["u"]?.object ?? [:]
            return .array(try order.map { id in
                if let new = added[id] { guard new["id"] == .string(id) else { throw invalid() }; return new }
                guard let old = prior[id] else { throw invalid() }
                let next = try updates[id].map { try apply(old, patch: $0) } ?? old
                guard next["id"] == .string(id) else { throw invalid() }; return next
            })
        }
        guard case .object(var object) = value, node["o"] != nil || node["d"] != nil || node.isEmpty else { throw invalid() }
        if let changes = node["o"] {
            guard case .object(let changes) = changes else { throw invalid() }
            for (key, child) in changes {
                guard key != "__proto__" else { throw invalid() }
                if object[key] == nil, child.object["v"] == nil { throw invalid() }
                object[key] = try apply(object[key] ?? .null, patch: child)
            }
        }
        if let removed = node["d"] {
            guard case .array(let removed) = removed else { throw invalid() }
            for key in removed { guard case .string(let key) = key else { throw invalid() }; object.removeValue(forKey: key) }
        }
        return .object(object)
    }
    private static func invalid() -> RemoteError { RemoteError(message: "State patch does not match its baseline. Resynchronizing.") }
}

/// The authenticated wire baseline never includes locally retained older run pages.
/// Actor isolation keeps recursive patching and large value comparisons off the UI actor.
actor NativeRemoteStateStream {
    enum Result: Sendable { case update(JSON, UInt64), ignored, resync }
    private var baseline: JSON?
    private var revision: UInt64 = 0
    private var version: String?
    private var awaitingFull = false

    func arguments(cursor: String, force: Bool = false) -> [String: JSON] {
        var args: [String: JSON] = ["cursor": .string(cursor), "statePatch": .string("v1")]
        if !force, !awaitingFull, baseline != nil, let version { args["ifStateVersion"] = .string(version) }
        return args
    }
    func full(_ state: JSON, version next: String?) -> Result {
        if let next, let version, Self.older(next, than: version) { return .ignored }
        let changed = baseline != state
        baseline = state; version = next; awaitingFull = false
        if changed { revision &+= 1; return .update(state, revision) }; return .ignored
    }
    func sync(_ reply: JSON) -> Result {
        if let state = reply.object["state"] { return full(state, version: reply.object["stateVersion"]?.string) }
        if reply["unchanged"].bool, baseline != nil, !awaitingFull, reply["stateVersion"].string == version { return .ignored }
        return gap()
    }
    func patch(_ data: JSON) -> Result {
        if data["version"].string == version { return .ignored }
        guard !awaitingFull else { return .ignored }
        guard let baseline, let version, data["base"].string == version, !data["version"].string.isEmpty,
              let patch = data.object["patch"] else { return gap() }
        do {
            let next = try NativeStatePatch.apply(baseline, patch: patch)
            self.baseline = next; self.version = data["version"].string
            if next == baseline { return .ignored }; revision &+= 1; return .update(next, revision)
        } catch { return gap() }
    }
    private func gap() -> Result { awaitingFull = true; return .resync }
    private static func older(_ next: String, than current: String) -> Bool {
        let a = next.split(separator: ":"), b = current.split(separator: ":")
        guard a.count == 2, b.count == 2, a[0] == b[0], let x = UInt64(a[1]), let y = UInt64(b[1]) else { return false }
        return x < y
    }
}

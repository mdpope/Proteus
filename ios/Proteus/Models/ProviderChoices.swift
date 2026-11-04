import Foundation

struct NativeInferenceProviderChoice: Identifiable {
    let id: String
    let provider: String
    let label: String
    var sourceHost = ""
    var sourceProvider = ""
    var available = true
    func catalog(_ value: JSON) -> JSON {
        guard !sourceHost.isEmpty else { return value }
        var result = value.object
        result["models"] = .array(value["models"].array.filter { $0["sharedSource"]["hostId"].string == sourceHost && $0["sharedSource"]["providerId"].string == sourceProvider })
        if !available { result["available"] = .bool(false); result["error"] = .string("This inference computer is offline or is not sharing this adapter.") }
        return .object(result)
    }
}

func nativeInferenceProviderChoices(_ statuses: [String: JSON], ownerName: String, ownerID: String = "", selected: String = "", savedRoute: String = "") -> [NativeInferenceProviderChoice] {
    var result = nativeProviderIDs(statuses, selected: selected).filter { $0 != "shared-llm" }.map { provider in
        NativeInferenceProviderChoice(id: provider, provider: provider, label: nativeProviderName(provider) + (["mtplx", "llama-cpp"].contains(provider) ? " · " + ownerName : ""), available: statuses[provider]?["available"] != .bool(false))
    }
    let catalog = statuses["shared-llm"] ?? .null
    var seen = Set<String>()
    for source in catalog["sources"].array + catalog["models"].array.map({ $0["sharedSource"] }) {
        let host = source["hostId"].string, adapter = source["providerId"].string
        guard !host.isEmpty, ["mtplx", "llama-cpp"].contains(adapter), !(host == ownerID && statuses[adapter] != nil) else { continue }
        let id = "inference:" + host + ":" + adapter
        guard seen.insert(id).inserted else { continue }
        result.append(NativeInferenceProviderChoice(id: id, provider: "shared-llm", label: nativeProviderName(adapter) + " · " + (source["hostLabel"].string.isEmpty ? "Paired computer" : source["hostLabel"].string), sourceHost: host, sourceProvider: adapter, available: source["available"] != .bool(false)))
    }
    if selected == "shared-llm" && (seen.isEmpty || !savedRoute.isEmpty && !seen.contains(savedRoute)) { result.append(NativeInferenceProviderChoice(id: savedRoute.isEmpty ? "shared-llm" : savedRoute, provider: "shared-llm", label: "Saved inference source · unavailable", available: false)) }
    return result
}

// Provider presence and all model/effort choices come from the executing owner.
// Keep an unavailable saved provider visible rather than silently substituting.
func nativeProviderIDs(_ statuses: [String: JSON], selected: String = "") -> [String] {
    var ids = Set(statuses.keys.filter { $0 != "local-process" })
    ids.insert("rehearsal")
    if !selected.isEmpty { ids.insert(selected) }
    return ids.sorted { nativeProviderName($0).localizedCaseInsensitiveCompare(nativeProviderName($1)) == .orderedAscending }
}

func nativeProviderName(_ id: String) -> String {
    ["copilot": "GitHub Copilot", "codex": "Codex", "claude": "Claude", "mtplx": "MTPLX", "llama-cpp": "llama.cpp", "shared-llm": "Shared local models", "rehearsal": "Local rehearsal", "local-process": "Omi native worker"][id] ?? id
}

import Foundation

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

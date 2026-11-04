import Observation

/// One presentation section; reference identity survives unrelated owner pushes.
@MainActor @Observable final class NativeRemoteStateField {
    var value: JSON
    init(_ value: JSON) { self.value = value }
}

enum NativeRunAttentionProjection {
    static func titles(state: JSON, allRuns: [JSON], chats: [String: JSON]) -> JSON {
        var values: [String: JSON] = [:]
        for run in allRuns + state["runs"].array { values[run["id"].string] = run["title"] }
        for (id, run) in chats { values[id] = run["title"] }
        return .object(values)
    }
    /// Home needs actionable identities and labels. Progress in other chats is
    /// not a change to this surface; actionable title/time changes remain live.
    static func value(_ runs: JSON) -> JSON {
        .array(runs.array.filter(nativeNeedsAttention).map { run in
            .object(Dictionary(uniqueKeysWithValues: ["id", "title", "updatedAt"].map { ($0, run[$0]) }))
        })
    }
}

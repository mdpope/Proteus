#if DEBUG
import Foundation

/// An isolated receive-path rehearsal, enabled only in the synthetic test app.
/// Both modes display the same General project, summaries, tabs and streaming text.
/// They differ only in full-state versus incremental owner event delivery.
@MainActor enum NativePushTypingFixture {
    static var enabled: Bool { ProcessInfo.processInfo.arguments.contains("--synthetic-push-typing") }
    private static var store: RemoteStore?
    private static var baseline: JSON = .null
    private static var run: JSON = .null
    private static var task: Task<Void, Never>?
    private static var started = false
    private static var pushes = 0
    private static var wireBytes = 0
    private static var fullBytes = 0
    private static var failed = false
    private static var failure = ""
    private static var receiveTimes: [Double] = []
    private static var intervalTimes: [Double] = []
    static func configure(remote: RemoteStore, shared: SharedAppStore, chat: JSON) {
        guard enabled else { return }
        store = remote; run = chat
        let workspace = "push-typing-workspace", project = "push-typing-general"
        let scope = "project:" + (remote.connection?.hostId ?? "") + ":" + project
        let summaries: [JSON] = (0..<1500).map { index in
            .object(["id": .string(index == 0 ? chat["id"].string : "push-chat-\(index)"),
                "title": .string(index == 0 ? "Heavy fixture" : "General synthetic chat \(index)"),
                "status": .string(index == 0 ? "running" : "completed"),
                "workspaceId": .string(workspace), "projectId": .string(project),
                "updatedAt": .string("2026-11-03T20:00:00Z"),
                "text": .string(String(repeating: "Synthetic **summary** and `code` ", count: 35))])
        }
        let tabs: [JSON] = (0..<200).map { .object(["id": .string("push-browser-\($0)"), "type": .string("browser"), "title": .string("General page \($0)"), "url": .string("https://example.test/\($0)"), "profileId": .string("default")]) }
        baseline = .object(["hostName": .string("Synthetic owner"), "runs": .array(summaries), "runCount": .number(1500), "schedules": .array([]),
            "capabilities": .array([.string("projects.v1")]),
            "context": .object(["workspaces": .array([.object(["id": .string(workspace), "name": .string("Push typing rehearsal")])])]),
            "workspaceProjects": .object(["schemaVersion": .number(1), "revision": .number(1), "projects": .array([.object(["id": .string(project), "workspaceId": .string(workspace), "name": .string("General")])]), "defaultProjectIds": .object([workspace: .string(project)])]),
            "tabs": .array(tabs)])
        remote.updateState(baseline)
        shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([.object(["id": .string("chat:" + chat["id"].string), "type": .string("chat"), "chatId": chat["id"]])] + tabs)]), scope: scope)
    }
    /// The first diagnostics tap starts delivery after the editor has focus;
    /// the second stops it and reports only content-free counts/timings.
    static func sample() -> String {
        guard enabled else { return "" }
        if !started {
            started = true
            task = Task { await deliver() }
        } else { task?.cancel() }
        func mean(_ values: [Double]) -> Double { values.isEmpty ? 0 : values.reduce(0,+) / Double(values.count) }
        return ",pushCount=\(pushes),fullBytes=\(fullBytes),wireBytes=\(wireBytes),receiveMeanMs=\(String(format: "%.3f", mean(receiveTimes))),intervalMeanMs=\(String(format: "%.3f", mean(intervalTimes))),pushFailed=\(failed),pushFailure=\(failure)"
    }
    private static func deliver() async {
        guard let store, let key = store.connection?.key else { failed = true; return }
        // Opening an aggregate chat resumes its owner even when the app seed was
        // inactive. Stop that synthetic port-1 reconnect loop before replaying
        // encrypted packets, otherwise it resets receive sequence every 3 s.
        store.activity(false)
        let incremental = ProcessInfo.processInfo.arguments.contains("--synthetic-patch-typing")
        var lastDelivery: Double?
        let began = ProcessInfo.processInfo.systemUptime
        do {
            for index in 0..<30 {
                try Task.checkCancellation()
                let remaining = began + Double(index) - ProcessInfo.processInfo.systemUptime
                if remaining > 0 { try await Task.sleep(for: .seconds(remaining)) }
                var state = baseline.object
                var rows = baseline["runs"].array
                var first = rows[0].object; first["progress"] = .object(["tick": .number(Double(index))]); rows[0] = .object(first)
                state["runs"] = .array(rows)
                let version = "typing:\(index)"
                let event: JSON
                if incremental && index > 0 {
                    event = .object(["type": .string("event"), "event": .string("state.patch"), "data": .object(["base": .string("typing:\(index - 1)"), "version": .string(version), "patch": .object(["o": .object(["runs": .object(["a": .object(["u": .object([run["id"].string: .object(["o": .object(["progress": .object(["v": first["progress"]!])])])])])])])])])])
                } else { event = .object(["type": .string("event"), "event": .string("state"), "stateVersion": .string(version), "data": .object(state)]) }
                // Fixture generation/encryption is detached and excluded from receive timing.
                let encoded = try await Task.detached {
                    let box = try RemoteCrypto.seal(event, key: key, aad: ":host:\(index * 2 + 1)")
                    return (try JSONEncoder().encode(JSON.object(["type": .string("data"), "seq": .number(Double(index * 2 + 1)), "box": .string(box)])), try JSONEncoder().encode(JSON.object(state)).count)
                }.value
                fullBytes = encoded.1; wireBytes += encoded.0.count
                let now = ProcessInfo.processInfo.systemUptime
                if let lastDelivery { intervalTimes.append((now - lastDelivery) * 1000) }; lastDelivery = now
                let start = now
                try await store.receive(try await RemoteStore.decoded(encoded.0))
                receiveTimes.append((ProcessInfo.processInfo.systemUptime - start) * 1000)
                var latest = run.object
                latest["eventCount"] = .number(1000)
                latest["events"] = .array([])
                var streaming = run["events"].array.last!.object
                streaming["text"] = .string(streaming["text"]!.string + String(repeating: " **Streaming update**.", count: index + 1))
                latest["eventPatches"] = .array([.object(["index": .number(999), "event": .object(streaming)])])
                let runEvent: JSON = .object(["type": .string("event"), "event": .string("run"), "data": .object(latest)])
                let packet = try await Task.detached {
                    let box = try RemoteCrypto.seal(runEvent, key: key, aad: ":host:\(index * 2 + 2)")
                    return try JSONEncoder().encode(JSON.object(["type": .string("data"), "seq": .number(Double(index * 2 + 2)), "box": .string(box)]))
                }.value
                try await store.receive(try await RemoteStore.decoded(packet))
                pushes += 1
            }
        } catch is CancellationError { /* The second diagnostic sample ends this rehearsal. */ }
        catch { failed = true; failure = error.localizedDescription }
    }
}
#endif

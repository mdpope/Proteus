import SwiftUI

struct SchedulesView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var path: [String] = []
    var body: some View {
        NavigationStack(path: $path) {
            List(store.state["schedules"].array, id: \.self) { schedule in
                NavigationLink(value: "schedule:" + schedule["id"].string) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(schedule["name"].string.isEmpty ? schedule["id"].string : schedule["name"].string).font(.headline)
                        Text("\(schedule["cron"].string) · \(schedule["timezone"].string)").font(.caption.monospaced()).foregroundStyle(.secondary)
                        Text(schedule["enabled"].bool ? "Enabled" : "Paused").font(.caption).foregroundStyle(schedule["enabled"].bool ? .green : .secondary)
                    }.padding(.vertical, 5)
                }
            }.navigationTitle("Schedules").refreshable { await store.refresh() }
                .safeAreaInset(edge: .bottom) { ConnectionStatus().padding().background(.bar) }
                .navigationDestination(for: String.self) { value in
                    if value.hasPrefix("schedule:") { ScheduleView(id: String(value.dropFirst(9))) { path.append($0) } }
                    else { ChatView(id: value) }
                }
        }
    }
}
struct ScheduleView: View {
    @EnvironmentObject var store: RemoteStore
    let id: String
    var openRun: (String) -> Void
    @State private var name = ""
    @State private var cron = ""
    @State private var timezone = ""
    @State private var prompt = ""
    @State private var enabled = false
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var expectedRevision = ""
    @State private var next: [JSON] = []
    @State private var busy = false
    private var schedule: JSON { store.state["schedules"].array.first { $0["id"].string == id } ?? .null }
    private var owned: Bool { !schedule["source"]["manifest"].string.isEmpty }
    var body: some View {
        Form {
            if owned { Section("Repository-owned schedule") { Text("Update the source manifest and reconcile it on the Mac. You can start a chat to make that change with your repository instructions."); Text(schedule["source"]["manifest"].string).font(.caption.monospaced()).textSelection(.enabled) } }
            Section("Schedule") { TextField("Name", text: $name); TextField("Cron", text: $cron).autocorrectionDisabled().textInputAutocapitalization(.never).accessibilityIdentifier("schedule-cron"); TextField("Time zone", text: $timezone).autocorrectionDisabled().textInputAutocapitalization(.never); Toggle("Enabled", isOn: $enabled); TextField("Instructions", text: $prompt, axis: .vertical).lineLimit(4...12) }.disabled(owned || busy || !store.connected)
            ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspace: schedule["workspace"]).disabled(owned || busy)
            Section("Next runs") { ForEach(next, id: \.self) { Text($0.string).font(.caption.monospaced()) }; Button("Preview cron") { preview() }.disabled(busy || !store.connected) }
            Section { Button("Save schedule") { save() }.disabled(owned || busy || !store.connected); Button("Reload latest version") { load() }; Button("Run now") { run() }.disabled(busy || !store.connected) }
            if !schedule["error"].string.isEmpty { Section { Text(schedule["error"].string).foregroundStyle(.orange) } }
        }.navigationTitle(schedule["name"].string).navigationBarTitleDisplayMode(.inline).task { load() }
    }
    private func load() { name = schedule["name"].string; cron = schedule["cron"].string; timezone = schedule["timezone"].string; prompt = schedule["prompt"].string; enabled = schedule["enabled"].bool; expectedRevision = schedule["revision"].string; next = schedule["nextRuns"].array; selected = Set(schedule["contextSelection"]["selectedIds"].array.map(\.string)); agent = schedule["contextSelection"]["agentId"].string; includeDefaults = schedule["contextSelection"]["includeDefaults"] != .bool(false) }
    private func preview() { busy = true; Task { defer { busy = false }; do { next = try await store.request("schedule.preview", ["cron": .string(cron), "timezone": .string(timezone)])["nextRuns"].array } catch { store.error = error.localizedDescription } } }
    private var contextSelection: JSON {
        var value = schedule["contextSelection"].object; var ids = selected; if !agent.isEmpty { ids.insert(agent) }
        value["selectedIds"] = .array(ids.sorted().map(JSON.string)); value["agentId"] = .string(agent); value["includeDefaults"] = .bool(includeDefaults); return .object(value)
    }
    private func save() { busy = true; Task { defer { busy = false }; do { _ = try await store.request("schedule.save", ["id": .string(id), "expectedRevision": .string(expectedRevision), "changes": .object(["name": .string(name), "cron": .string(cron), "timezone": .string(timezone), "prompt": .string(prompt), "enabled": .bool(enabled), "contextSelection": contextSelection])]); await store.refresh(); load() } catch { store.error = error.localizedDescription } } }
    private func run() { busy = true; Task { defer { busy = false }; do { let result = try await store.request("schedule.run", ["id": .string(id)]); openRun(result["runId"].string) } catch { store.error = error.localizedDescription } } }
}

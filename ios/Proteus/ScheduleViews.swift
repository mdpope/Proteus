import SwiftUI

struct SchedulesView: View {
    @EnvironmentObject var store: RemoteStore
    var onSelect: ((JSON) -> Void)? = nil
    @State private var path: [String] = []
    var body: some View {
        NavigationStack(path: $path) {
            NativeList {
                ForEach(store.state["schedules"].array, id: \.self) { schedule in
                Group {
                    if let onSelect { Button { onSelect(schedule) } label: { scheduleRow(schedule) } }
                    else { NavigationLink(value: "schedule:" + schedule["id"].string) { scheduleRow(schedule) } }
                }
                }
                let recent = Array(store.state["runs"].array.filter { nativeChatType($0) == "scheduled" && $0["archivedAt"].string.isEmpty }.sorted { $0["updatedAt"].string > $1["updatedAt"].string }.prefix(7))
                if !recent.isEmpty { Section("Recent schedule chats") { ForEach(recent, id: \.self) { run in NavigationLink(value: run["id"].string) { HStack { if run["status"].string == "running" { ProgressView().controlSize(.small) }; Text(run["title"].string).lineLimit(2) } } } } }
            }.background(NativeTheme.background).navigationTitle(NativeDesignPreview.enabled ? "" : "Schedules").nativeFeaturePage("Schedules").refreshable { await store.refresh() }
                .safeAreaInset(edge: .bottom) { ConnectionStatus().padding().background(NativeTheme.surface) }
                .navigationDestination(for: String.self) { value in
                    if value.hasPrefix("schedule:") { ScheduleView(id: String(value.dropFirst(9))) { path.append($0) }.modifier(NativePhoneBackNavigation()) }
                    else { ChatView(id: value) }
                }
        }
    }
    private func scheduleRow(_ schedule: JSON) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(schedule["name"].string.isEmpty ? schedule["id"].string : schedule["name"].string).font(.headline)
            Text("\(schedule["cron"].string) · \(schedule["timezone"].string)").font(.caption.monospaced()).foregroundStyle(.secondary)
            Text(schedule["enabled"].bool ? "Enabled" : "Paused").font(.caption).foregroundStyle(schedule["enabled"].bool ? .green : .secondary)
        }.padding(.vertical, 5)
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
    @State private var provider = "copilot"
    @State private var model = ""
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @State private var enabled = false
    @State private var notifyCompletion = false
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var expectedRevision = ""
    @State private var next: [JSON] = []
    @State private var busy = false
    @State private var loadedForm: [String] = []
    private var formValues: [String] { [name, cron, timezone, prompt, provider, model, effort, contextTier, serviceTier, String(enabled), String(notifyCompletion), selected.sorted().joined(separator: ","), agent, String(includeDefaults)] }
    private var schedule: JSON { store.state["schedules"].array.first { $0["id"].string == id } ?? .null }
    private var managed: Bool { schedule["integration"]["type"].string == "omi" }
    private var owned: Bool { managed || !schedule["source"]["manifest"].string.isEmpty }
    var body: some View {
        NativeForm {
            if !expectedRevision.isEmpty && expectedRevision != schedule["revision"].string { Section { Text("The file changed outside Proteus. Your edits are preserved. Reload the latest version before saving.").foregroundStyle(.orange) } }
            if managed { Section("Omi processing") { Text("Manage processing paths, execution and cutover in the Omi section on \(store.displayName). Capture and the recording library remain in the separate Omi iCloud app.") } }
            if owned && !managed { Section("Repository-owned schedule") { Text("Update the source manifest and reconcile it on \(store.displayName). You can start a chat to make that change with your repository instructions."); Text(schedule["source"]["manifest"].string).font(.caption.monospaced()).textSelection(.enabled) } }
            Section("Schedule") { TextField("Name", text: $name); TextField("Cron", text: $cron).autocorrectionDisabled().textInputAutocapitalization(.never).accessibilityIdentifier("schedule-cron"); TextField("Time zone", text: $timezone).autocorrectionDisabled().textInputAutocapitalization(.never); Toggle("Enabled", isOn: $enabled); Toggle("Notify on completion", isOn: $notifyCompletion); TextField("Instructions", text: $prompt, axis: .vertical).lineLimit(4...12) }.disabled(owned || busy || !store.connected)
            Section("Provider & model") {
                Picker("Provider", selection: $provider) { Text("GitHub Copilot").tag("copilot"); Text("Codex").tag("codex"); Text("Claude").tag("claude"); Text("Local rehearsal").tag("rehearsal"); if provider == "local-process" { Text("Omi native worker").tag("local-process") } }
                if !["rehearsal", "local-process"].contains(provider) { ProviderModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: provider, disabled: owned || busy) }
            }.disabled(owned || busy || !store.connected)
            ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspace: schedule["workspace"]).disabled(owned || busy)
            Section("Next runs") { ForEach(next, id: \.self) { Text($0.string).font(.caption.monospaced()) }; Button("Preview cron") { preview() }.disabled(busy || !store.connected) }
            Section { Button("Save schedule") { save() }.disabled(owned || busy || !store.connected); Button("Reload latest version") { Task { await store.refresh(); load() } }; Button("Run now") { run() }.disabled(busy || !store.connected) }
            if !schedule["error"].string.isEmpty { Section { Text(schedule["error"].string).foregroundStyle(.orange) } }
        }.background(NativeTheme.background).navigationTitle(schedule["name"].string).navigationBarTitleDisplayMode(.inline).task { await store.refresh(); load(); if let saved = store.drafts["schedule:" + id] { restoreDraft(saved) }; if !["rehearsal", "local-process"].contains(provider) { await store.loadModels(provider: provider) } }.onChange(of: formValues) { _, _ in store.setDraft("schedule:" + id, loadedForm.isEmpty || loadedForm == formValues ? .null : scheduleDraft) }.onChange(of: schedule["revision"].string) { _, _ in if loadedForm == formValues { load() } }.onChange(of: provider) { _, value in if !["rehearsal", "local-process"].contains(value) { Task { await store.loadModels(provider: provider) } } }
    }
    private func load() { provider = schedule["provider"].string; model = schedule["model"].string; effort = schedule["reasoningEffort"].string; serviceTier = schedule["serviceTier"].string; contextTier = schedule["contextTier"].string.isEmpty ? "default" : schedule["contextTier"].string; name = schedule["name"].string; cron = schedule["cron"].string; timezone = schedule["timezone"].string; prompt = schedule["prompt"].string; enabled = schedule["enabled"].bool; notifyCompletion = schedule["notifications"]["onCompletion"].bool; expectedRevision = schedule["revision"].string; next = schedule["nextRuns"].array; selected = Set(schedule["contextSelection"]["selectedIds"].array.map(\.string)); agent = schedule["contextSelection"]["agentId"].string; includeDefaults = schedule["contextSelection"]["includeDefaults"] != .bool(false); loadedForm = formValues }
    private var scheduleDraft: JSON { .object(["name": .string(name), "cron": .string(cron), "timezone": .string(timezone), "prompt": .string(prompt), "provider": .string(provider), "model": .string(model), "effort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "enabled": .bool(enabled), "notifyCompletion": .bool(notifyCompletion), "selected": .array(selected.sorted().map(JSON.string)), "agent": .string(agent), "includeDefaults": .bool(includeDefaults), "revision": .string(expectedRevision)]) }
    private func restoreDraft(_ value: JSON) { name = value["name"].string; cron = value["cron"].string; timezone = value["timezone"].string; prompt = value["prompt"].string; provider = value["provider"].string; model = value["model"].string; effort = value["effort"].string; contextTier = value["contextTier"].string; serviceTier = value["serviceTier"].string; enabled = value["enabled"].bool; notifyCompletion = value["notifyCompletion"].bool; selected = Set(value["selected"].array.map(\.string)); agent = value["agent"].string; includeDefaults = value["includeDefaults"] != .bool(false); expectedRevision = value["revision"].string }
    private func preview() { busy = true; Task { defer { busy = false }; do { next = try await store.request("schedule.preview", ["cron": .string(cron), "timezone": .string(timezone)])["nextRuns"].array } catch { store.error = error.localizedDescription } } }
    private var contextSelection: JSON {
        var value = schedule["contextSelection"].object; var ids = selected; if !agent.isEmpty { ids.insert(agent) }
        value["selectedIds"] = .array(ids.sorted().map(JSON.string)); value["agentId"] = .string(agent); value["includeDefaults"] = .bool(includeDefaults); return .object(value)
    }
    private var notificationSettings: JSON { var value = schedule["notifications"].object; value["onCompletion"] = .bool(notifyCompletion); return .object(value) }
    private func save() { busy = true; Task { defer { busy = false }; do { _ = try await store.request("schedule.save", ["id": .string(id), "expectedRevision": .string(expectedRevision), "changes": .object(["name": .string(name), "provider": .string(provider), "model": .string(!["rehearsal", "local-process"].contains(provider) ? model : ""), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "cron": .string(cron), "timezone": .string(timezone), "prompt": .string(prompt), "enabled": .bool(enabled), "notifications": notificationSettings, "contextSelection": contextSelection])]); await store.refresh(); load() } catch { store.error = error.localizedDescription } } }
    private func run() { busy = true; Task { defer { busy = false }; do { let result = try await store.request("schedule.run", ["id": .string(id)]); openRun(result["runId"].string) } catch { store.error = error.localizedDescription } } }
}

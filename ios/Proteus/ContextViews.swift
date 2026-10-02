import SwiftUI

let contextModes = [("universal", "Every chat"), ("workspace", "With workspace"), ("available", "Choose per chat"), ("disabled", "Disabled")]
struct ContextSelection: View {
    @EnvironmentObject var store: RemoteStore
    @Binding var selected: Set<String>
    @Binding var agent: String
    @State private var search = ""
    private var entries: [JSON] { store.state["context"]["entries"].array.filter { $0["mode"].string != "disabled" } }
    var body: some View {
        Section("Instructions, skills, agents & MCPs") {
            Text("Every-chat and matching workspace sources load automatically. Select extra sources for this conversation. Disabled sources can be enabled individually in Workspace context.").font(.caption).foregroundStyle(.secondary)
            Picker("Main agent", selection: $agent) { Text("Default assistant").tag(""); ForEach(entries.filter { $0["kind"].string == "agent" && $0["unsupportedAgentFields"].array.isEmpty && $0["userInvocable"] != .bool(false) }, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
            TextField("Filter sources", text: $search)
            ForEach(entries.filter { search.isEmpty || ($0["name"].string + " " + $0["kind"].string).localizedCaseInsensitiveContains(search) }, id: \.self) { entry in
                let id = entry["id"].string
                Toggle(isOn: Binding(get: { entry["mode"].string == "universal" || selected.contains(id) || agent == id }, set: { if $0 { selected.insert(id) } else { selected.remove(id) } })) {
                    VStack(alignment: .leading) { Text(entry["name"].string); Text("\(entry["kind"].string) · \(contextModes.first { $0.0 == entry["mode"].string }?.1 ?? "")").font(.caption).foregroundStyle(.secondary) }
                }.disabled(entry["mode"].string == "universal" || agent == id || !entry["unsupportedAgentFields"].array.isEmpty || entry["missing"].bool)
            }
        }
    }
}
struct ChatContextView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.dismiss) private var dismiss
    let run: JSON
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var saving = false
    var body: some View {
        NavigationStack { Form { ContextSelection(selected: $selected, agent: $agent) }.navigationTitle("Chat context").toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Apply") { saving = true; Task { defer { saving = false }; do { var ids = selected; if !agent.isEmpty { ids.insert(agent) }; _ = try await store.request("chat.context", ["id": run["id"], "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent)]); await store.openChat(run["id"].string); dismiss() } catch { store.error = error.localizedDescription } } }.disabled(saving || !store.connected) }
        }.task { selected = Set(run["context"]["selectedIds"].array.map(\.string)); agent = run["context"]["agentId"].string } }
    }
}
struct ContextView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var search = ""
    @State private var kind = "instruction"
    @State private var folder = ""
    @State private var workspace = ""
    @State private var busy = false
    private var context: JSON { store.state["context"] }
    var body: some View {
        List {
            Section("Workspace folders on the Mac") {
                Picker("Workspace", selection: $workspace) { ForEach(context["workspaces"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                if let profile = context["workspaces"].array.first(where: { $0["id"].string == workspace }) {
                    Text(profile["cwd"].string).font(.caption.monospaced()).textSelection(.enabled)
                    ForEach(profile["additionalDirectories"].array, id: \.self) { Text($0.string).font(.caption.monospaced()).textSelection(.enabled) }
                }
                TextField("Add a folder path on the Mac", text: $folder).autocorrectionDisabled().textInputAutocapitalization(.never)
                Button("Add folder") { command("context.addFolders", ["workspaceId": .string(workspace), "folders": .array([.string(folder)]), "expectedRevision": context["revision"]]) }.disabled(folder.isEmpty || busy || !store.connected)
            }
            Section {
                Picker("Source type", selection: $kind) { Text("Instructions").tag("instruction"); Text("Skills").tag("skill"); Text("Agents").tag("agent"); Text("MCPs").tag("mcp") }
                Text("Changes apply to new chats. Existing chats can refresh their context between turns. MCPs remain disabled until you enable them.").font(.caption).foregroundStyle(.secondary)
                ForEach(context["entries"].array.filter { $0["kind"].string == kind && (search.isEmpty || $0["name"].string.localizedCaseInsensitiveContains(search)) }, id: \.self) { entry in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(entry["name"].string).font(.headline)
                        Text(entry["path"].string).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled)
                        if !entry["unsupportedAgentFields"].array.isEmpty { Text(entry["unsupportedAgentFields"].array.map(\.string).joined(separator: "; ")).font(.caption).foregroundStyle(.orange) }
                        Picker("Load in", selection: Binding(get: { entry["mode"].string }, set: { mode in command("context.mode", ["id": entry["id"], "mode": .string(mode), "expectedRevision": context["revision"]]) })) { ForEach(contextModes, id: \.0) { Text($0.1).tag($0.0) } }.disabled(busy || !store.connected)
                    }.padding(.vertical, 5)
                }
            }
        }.navigationTitle("Workspace context").searchable(text: $search)
            .toolbar { Button("Refresh sources", systemImage: "arrow.clockwise") { command("context.refresh", [:]) }.disabled(busy || !store.connected) }
            .task { workspace = context["defaultWorkspaceId"].string }
    }
    private func command(_ method: String, _ args: [String: JSON]) { busy = true; Task { defer { busy = false }; do { _ = try await store.request(method, args); folder = ""; await store.refresh() } catch { store.error = error.localizedDescription } } }
}

import SwiftUI

let contextModes = [("universal", "Every chat"), ("workspace", "With workspace"), ("available", "Choose per chat"), ("disabled", "Disabled")]
struct ContextFavoriteButton: View {
    @EnvironmentObject var store: RemoteStore
    let entry: JSON
    @State private var busy = false
    private var favorite: Bool { store.state["context"]["favorites"].array.contains(entry["id"]) }
    var body: some View {
        Button { busy = true; Task { defer { busy = false }; do { _ = try await store.request("context.favorite", ["id": entry["id"], "enabled": .bool(!favorite), "expectedRevision": store.state["context"]["revision"]]); await store.refresh() } catch { store.error = error.localizedDescription } } } label: { Image(systemName: favorite ? "star.fill" : "star") }
            .buttonStyle(.borderless).disabled(busy || !store.connected).accessibilityLabel("\(favorite ? "Remove from" : "Add to") favorites: \(entry["name"].string)")
    }
}
struct ContextSelection: View {
    @EnvironmentObject var store: RemoteStore
    @Binding var selected: Set<String>
    @Binding var agent: String
    @Binding var includeDefaults: Bool
    var workspaceID = ""
    var workspace: JSON = .null
    @State private var search = ""
    @State private var preview: JSON = .null
    @State private var previewError = ""
    private var catalog: JSON { store.state["context"] }
    private var favorites: Set<String> { Set(catalog["favorites"].array.map(\.string)) }
    private var entries: [JSON] { catalog["entries"].array.filter { $0["mode"].string != "disabled" || favorites.contains($0["id"].string) } }
    private var profile: JSON { workspace != .null ? workspace : catalog["workspaces"].array.first { $0["id"].string == (workspaceID.isEmpty ? catalog["defaultWorkspaceId"].string : workspaceID) } ?? .null }
    private var roots: Set<String> { Set([profile["cwd"].string] + profile["additionalDirectories"].array.map(\.string) + catalog["universalFolders"].array.map(\.string)) }
    private var previewKey: String { "\(includeDefaults):\(selected.sorted()):\(agent):\(profile.pretty):\(catalog["refreshedAt"].string):\(catalog["revision"].string)" }
    private func automatic(_ entry: JSON) -> Bool { includeDefaults && (entry["mode"].string == "universal" || (entry["mode"].string == "workspace" && entry["roots"].array.contains { roots.contains($0.string) })) }
    private func usable(_ entry: JSON) -> Bool { entry["mode"].string != "disabled" && entry["unsupportedAgentFields"].array.isEmpty && !entry["missing"].bool }
    var body: some View {
        Section("Instructions, skills, agents & MCPs") {
            Picker("Source loading", selection: $includeDefaults) { Text("Include workspace & every-chat defaults").tag(true); Text("Only selected sources").tag(false) }.pickerStyle(.menu).accessibilityIdentifier("source-loading")
            Text("Folder access stays the same. Favorites do not load automatically. Only selected sources excludes legacy MCP and skill-directory settings too.").font(.caption).foregroundStyle(.secondary)
            Picker("Main agent", selection: $agent) {
                Text("Default assistant").tag("")
                ForEach([true, false], id: \.self) { favorite in
                    Section(favorite ? "Favorites" : "Other agents") { ForEach(entries.filter { $0["kind"].string == "agent" && usable($0) && $0["userInvocable"] != .bool(false) && favorites.contains($0["id"].string) == favorite }, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                }
            }
            if preview != .null {
                let counts = preview["counts"]
                Text("Will load: \(counts["instruction"].int) instructions · \(counts["skill"].int) skills · \(counts["agent"].int) agents · \(counts["mcp"].int) MCPs").font(.caption)
                Text("Instruction/skill bodies: ~\(preview["estimatedTextTokens"].int) tokens (characters ÷ 4). Excludes agent definitions, tool schemas, provider prompts, and conversation history.").font(.caption).foregroundStyle(.secondary)
                DisclosureGroup("Sources and why they load") { ForEach(preview["entries"].array, id: \.self) { entry in VStack(alignment: .leading) { Text("\(entry["name"].string) · \(entry["loadReason"].string)"); Text(entry["path"].string).font(.caption.monospaced()).foregroundStyle(.secondary) } } }
            }
            if !previewError.isEmpty { Text(previewError).font(.caption).foregroundStyle(.orange) }
            Button("Refresh sources") { Task { do { _ = try await store.request("context.refresh", [:]); await store.refresh() } catch { store.error = error.localizedDescription } } }.disabled(!store.connected)
        }.task(id: previewKey) {
            do { try await Task.sleep(for: .milliseconds(180)); var ids = selected; if !agent.isEmpty { ids.insert(agent) }
                let result = try await store.request("context.preview", ["workspace": profile, "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)])
                if !Task.isCancelled { preview = result; previewError = "" }
            } catch { if !Task.isCancelled { previewError = "Preview unavailable: " + error.localizedDescription } }
        }
        Section("Favorites") {
            Button("Check all favorites") { for entry in entries where favorites.contains(entry["id"].string) && usable(entry) { selected.insert(entry["id"].string) } }
            if !entries.contains(where: { favorites.contains($0["id"].string) }) { Text("Use the star beside a source to keep it here.").font(.caption).foregroundStyle(.secondary) }
            ForEach(entries.filter { favorites.contains($0["id"].string) }, id: \.self) { sourceRow($0) }
        }
        Section("Other sources") {
            TextField("Filter sources", text: $search)
            ForEach(entries.filter { !favorites.contains($0["id"].string) && (search.isEmpty || ($0["name"].string + " " + $0["kind"].string + " " + $0["path"].string).localizedCaseInsensitiveContains(search)) }, id: \.self) { sourceRow($0) }
        }
    }
    private func sourceRow(_ entry: JSON) -> some View {
        let id = entry["id"].string
        return HStack {
            Toggle(isOn: Binding(get: { entry["mode"].string != "disabled" && (automatic(entry) || selected.contains(id) || agent == id) }, set: { if $0 { selected.insert(id) } else { selected.remove(id) } })) {
                VStack(alignment: .leading) { Text(entry["name"].string); Text("\(entry["kind"].string) · \(contextModes.first { $0.0 == entry["mode"].string }?.1 ?? "")").font(.caption).foregroundStyle(.secondary); Text(entry["path"].string).font(.caption2.monospaced()).foregroundStyle(.secondary) }
            }.disabled(automatic(entry) || agent == id || !usable(entry))
            ContextFavoriteButton(entry: entry)
        }
    }
}
struct ChatContextView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.dismiss) private var dismiss
    let run: JSON
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var saving = false
    var body: some View {
        NavigationStack { Form { ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspace: run["context"]["baseWorkspace"] != .null ? run["context"]["baseWorkspace"] : run["schedule"]["workspace"]) }.navigationTitle("Chat context").toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Apply") { saving = true; Task { defer { saving = false }; do { var ids = selected; if !agent.isEmpty { ids.insert(agent) }; _ = try await store.request("chat.context", ["id": run["id"], "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)]); await store.openChat(run["id"].string); dismiss() } catch { store.error = error.localizedDescription } } }.disabled(saving || !store.connected) }
        }.task { selected = Set(run["context"]["selectedIds"].array.map(\.string)); agent = run["context"]["agentId"].string; includeDefaults = run["context"]["includeDefaults"] != .bool(false) } }
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
            }
            ForEach([true, false], id: \.self) { favorite in
              Section(favorite ? "Favorites" : "Other sources") {
                ForEach(context["entries"].array.filter { (context["favorites"].array.contains($0["id"]) == favorite) && $0["kind"].string == kind && (search.isEmpty || $0["name"].string.localizedCaseInsensitiveContains(search)) }, id: \.self) { entry in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack { Text(entry["name"].string).font(.headline); Spacer(); ContextFavoriteButton(entry: entry) }
                        Text(entry["path"].string).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled)
                        if !entry["unsupportedAgentFields"].array.isEmpty { Text(entry["unsupportedAgentFields"].array.map(\.string).joined(separator: "; ")).font(.caption).foregroundStyle(.orange) }
                        Picker("Load in", selection: Binding(get: { entry["mode"].string }, set: { mode in command("context.mode", ["id": entry["id"], "mode": .string(mode), "expectedRevision": context["revision"]]) })) { ForEach(contextModes, id: \.0) { Text($0.1).tag($0.0) } }.disabled(busy || !store.connected)
                    }.padding(.vertical, 5)
                }
              }
            }
        }.navigationTitle("Workspace context").searchable(text: $search)
            .toolbar { Button("Refresh sources", systemImage: "arrow.clockwise") { command("context.refresh", [:]) }.disabled(busy || !store.connected) }
            .task { workspace = context["defaultWorkspaceId"].string }
    }
    private func command(_ method: String, _ args: [String: JSON]) { busy = true; Task { defer { busy = false }; do { _ = try await store.request(method, args); folder = ""; await store.refresh() } catch { store.error = error.localizedDescription } } }
}

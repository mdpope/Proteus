import SwiftUI

let contextModes = [("universal", "Every chat"), ("workspace", "With workspace"), ("available", "Choose per chat"), ("disabled", "Disabled")]
struct NativeChatWorkspaceMoveView: View {
    @Environment(RemoteStore.self) var store
    @Environment(\.dismiss) private var dismiss
    let chatID: String
    @State private var catalog: JSON = .null
    @State private var workspace = ""
    @State private var project = ""
    @State private var destination = ""
    @State private var busy = false
    @State private var message = ""
    var body: some View {
        NavigationStack {
            Form {
                NativeMoveDestinationPicker(groups: NativeMoveLocations.groups(context: catalog, projects: store.projectCatalog.raw, containersOnly: true), selection: $destination)
                Text("Run options, folders, approvals and the current session stay as configured.").font(.caption)
                if !message.isEmpty { Text(message).foregroundStyle(.orange) }
            }.navigationTitle("Move tab").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Move") { move() }.disabled(busy || destination.isEmpty || !store.connected) }
            }.task { do {
                catalog = try await store.request("context.get", [:])
                let chat = try await store.request("chat.get", ["id": .string(chatID)])
                workspace = NativeWorkspaceIdentity.workspaceID(chat)
                project = store.projectCatalog.membership(for: chat)["projectId"].string
                destination = project.isEmpty ? "workspace:" + workspace : "project:" + project
            } catch { message = error.localizedDescription } }

        }
    }
    private func move() {
        let parts = destination.split(separator: ":", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return }
        if parts[0] == "project", let target = store.projectCatalog.project(id: parts[1]) { project = parts[1]; workspace = target["workspaceId"].string }
        else { workspace = parts[1]; project = store.projectCatalog.defaultProject(in: workspace)?["id"].string ?? "" }
        busy = true; Task { defer { busy = false }; do {
        if store.supportsProjects {
            let chat = try await store.request("chat.get", ["id": .string(chatID)])
            _ = try await store.moveChatToProject(id: chatID, workspaceID: workspace, projectID: project, expectedUpdatedAt: chat["updatedAt"].string)
        } else { _ = try await store.request("chat.move", ["id": .string(chatID), "workspaceId": .string(workspace)]) }
        await store.refresh(); await store.openChat(chatID)
        NotificationCenter.default.post(name: Notification.Name("ProteusChatWorkspaceMoved"), object: nil, userInfo: ["hostID": store.connection?.hostId ?? "", "chatID": chatID, "workspaceID": workspace])
        dismiss()
    } catch { message = error.localizedDescription } } }
}

struct NativeWorkspaceTabsView: View {
    @Environment(RemoteStore.self) var store
    @Environment(\.horizontalSizeClass) private var sizeClass
    @EnvironmentObject var shared: SharedAppStore
    let workspaceID: String
    var projectID: String? = nil
    var onOpen: (JSON) -> Void = { _ in }
    @State private var snapshot: JSON = .null
    @State private var busy = false
    @State private var moveTab: JSON = .null
    @State private var moving = false
    @State private var destination = "main:main"
    @State private var catalog: JSON = .null
    private var scopeKind: String { projectID == nil ? "workspace" : "project" }
    private var scopeID: String { projectID ?? workspaceID }
    private var scope: String { "\(scopeKind):\(store.connection?.hostId ?? ""):\(scopeID)" }
    private var rows: [JSON] { snapshot["tabs"].array }
    private var filterKey: String { "tab-filter:" + scope }
    private var query: String { store.draft(filterKey)["query"].string }
    private var type: String { store.draft(filterKey)["type"].string }
    private var matchingRows: [(offset: Int, element: JSON)] { Array(rows.enumerated()).filter { row in
        (type.isEmpty || row.element["type"].string == type) && (query.isEmpty || (row.element["title"].string + " " + row.element["url"].string).localizedCaseInsensitiveContains(query))
    } }
    private func setFilter(_ name: String, _ value: String) { var fields = store.draft(filterKey).object; fields[name] = .string(value); store.setDraft(filterKey, .object(fields)) }
    private func label(_ tab: JSON) -> String { tab["title"].string + (tab["type"].string == "browser" && !tab["profileName"].string.isEmpty ? " [" + tab["profileName"].string + "]" : "") }
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 6) {
                Text("Open tabs").font(.title2.bold()); if !store.connected { Text("Offline · cached tabs").font(.caption).foregroundStyle(.orange) }; Text("Hidden tabs remain open.").font(.caption).foregroundStyle(.secondary)
                HStack {
                    Picker("Type", selection: Binding(get: { type }, set: { setFilter("type", $0) })) { Text("All types").tag(""); Text("Browser").tag("browser"); Text("Chats").tag("chat"); Text("Documents").tag("document"); Text("Terminal").tag("terminal") }
                    TextField("Filter tabs", text: Binding(get: { query }, set: { setFilter("query", $0) })).textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier("workspace-tabs-filter")
                }
                Text("\(matchingRows.count) of \(rows.count) tabs").font(.caption).foregroundStyle(.secondary)
                // One compact line per tab: icon, name, address, age and actions.
                ForEach(matchingRows, id: \.element) { index, tab in
                    HStack(spacing: 8) {
                        tabIcon(tab).frame(width: 20, height: 20).opacity(tab["hidden"].bool ? 0.5 : 1)
                        Button { open(tab) } label: {
                            HStack(spacing: 6) {
                                Text(label(tab)).font(.subheadline.weight(.semibold)).lineLimit(1).frame(maxWidth: tab["url"].string.isEmpty ? .infinity : 160, alignment: .leading).layoutPriority(1)
                                if !tab["url"].string.isEmpty { Text(tab["url"].string).font(.caption).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle) }
                            }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                        }.buttonStyle(.plain).accessibilityIdentifier("workspace-managed-title-" + tab["id"].string).disabled(tab["hidden"].bool && !store.connected)
                        Text(age(tab)).font(.caption2).monospacedDigit().foregroundStyle(.secondary).fixedSize()
                            .accessibilityLabel("Opened " + date(tab["openedAt"].string) + ", last interaction " + date(tab["lastTouchedAt"].string) + (tab["projectName"].string.isEmpty ? "" : ", in " + tab["projectName"].string))
                        rowButtons(tab, index: index).disabled(!store.connected)
                    }.padding(.horizontal, 10).padding(.vertical, 6).frame(minHeight: 44)
                        .background(NativeTheme.surface.opacity(tab["hidden"].bool ? 0.5 : 1), in: RoundedRectangle(cornerRadius: 10))
                }
            }.padding()
        }.disabled(busy).task { await load() }
        // Tab actions report owner refusals here instead of silently doing nothing.
        .alert("Tab action", isPresented: Binding(get: { store.error != nil && !moving }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }
        .onChange(of: shared.workspaceContentDescriptors[scope]) { _, _ in Task { await load() } }
        .sheet(isPresented: $moving) {
            NavigationStack { Form {
                NativeMoveDestinationPicker(groups: NativeMoveLocations.groups(context: catalog, projects: store.projectCatalog.raw, chats: store.state["runs"].array, containersOnly: moveTab["type"].string == "chat"), selection: $destination)
            }.navigationTitle("Move tab").toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { moving = false } }; ToolbarItem(placement: .confirmationAction) { Button("Move") { move() } } } }
        }
    }
    @ViewBuilder private func tabIcon(_ tab: JSON) -> some View {
        if let encoded = tab["favicon"].string.split(separator: ",", maxSplits: 1).last, tab["favicon"].string.hasPrefix("data:image/png;base64,"), let bytes = Data(base64Encoded: String(encoded)), let image = UIImage(data: bytes) { Image(uiImage: image).resizable().scaledToFit() }
        else { Image(systemName: NativeTabSymbol.name(kind: tab["type"].string, chatType: tab["chatType"].string, mediaType: tab["mediaType"].string)).foregroundStyle(.secondary) }
    }
    private func age(_ tab: JSON) -> String {
        guard let date = ProviderAllowance.date(tab["lastTouchedAt"].string) ?? ProviderAllowance.date(tab["openedAt"].string) else { return "—" }
        let minutes = max(0, Int(Date().timeIntervalSince(date) / 60))
        return minutes == 0 ? "now" : minutes < 60 ? "\(minutes)m" : minutes < 1440 ? "\(minutes / 60)h" : "\(minutes / 1440)d"
    }
    @ViewBuilder private func rowButtons(_ tab: JSON, index: Int) -> some View {
        HStack(spacing: 2) {
            // Compact widths keep the address visible: Hide and Move move into the menu.
            if sizeClass == .regular {
                Button { toggleHidden(tab) } label: { Image(systemName: tab["hidden"].bool ? "eye" : "eye.slash").frame(width: 30, height: 32) }
                    .accessibilityLabel(tab["hidden"].bool ? "Restore " + label(tab) : "Hide " + label(tab))
                Button { beginMove(tab) } label: { Image(systemName: "arrow.right.square").frame(width: 30, height: 32) }.accessibilityLabel("Move " + label(tab))
            }
            Menu {
                if sizeClass != .regular {
                    Button(tab["hidden"].bool ? "Restore" : "Hide", systemImage: tab["hidden"].bool ? "eye" : "eye.slash") { toggleHidden(tab) }
                    Button("Move", systemImage: "arrow.right.square") { beginMove(tab) }
                }
                if projectID != nil || !store.supportsProjects {
                    Button("Move up", systemImage: "arrow.up") { reorder(index, delta: -1) }.disabled(index == 0)
                    Button("Move down", systemImage: "arrow.down") { reorder(index, delta: 1) }.disabled(index == rows.count - 1)
                }
                if tab["type"].string == "browser" { Button(tab["persist"].bool ? "Unpersist" : "Persist", systemImage: "pin") { command(["action": .string("persist"), "scope": .string(scopeKind), "id": .string(scopeID), "tabId": tab["id"], "expectedRevision": snapshot["revision"], "enabled": .bool(!tab["persist"].bool)]) } }
                Section(date(tab["openedAt"].string) == "—" ? "Opened —" : "Opened " + date(tab["openedAt"].string)) {}
            } label: { Image(systemName: "ellipsis").frame(width: 30, height: 32) }.accessibilityLabel("More actions for " + label(tab)).accessibilityIdentifier("workspace-managed-more-" + tab["id"].string)
            // Close uses the same owner tab-list mutation as the tab strip, which this
            // device may already perform; cross-scope Move/Persist need resource access.
            Button(role: .destructive) { mutate([.object(["action": .string("close"), "id": tab["id"]])], tab: tab) } label: { Image(systemName: "xmark").frame(width: 30, height: 32) }.accessibilityLabel("Close " + label(tab)).accessibilityIdentifier("workspace-managed-close-" + tab["id"].string)
        }.buttonStyle(.plain).foregroundStyle(NativeTheme.accent).font(.system(size: 15, weight: .medium))
    }
    private func toggleHidden(_ tab: JSON) { mutate([.object(["action": .string("visibility"), "id": tab["id"], "hidden": .bool(!tab["hidden"].bool)])], tab: tab) }
    private func beginMove(_ tab: JSON) {
        moveTab = tab; destination = (tab["ownerScope"].string.isEmpty ? scopeKind : tab["ownerScope"].string) + ":" + (tab["ownerID"].string.isEmpty ? scopeID : tab["ownerID"].string)
        Task { catalog = (try? await store.request("context.get", [:])) ?? .null; moving = true }
    }
    private func date(_ value: String) -> String { ProviderAllowance.date(value)?.formatted(date: .abbreviated, time: .shortened) ?? "—" }
    private func load() async {
        if !store.connected { loadCachedTabs(); return }
        do {
            var result = try await store.request("tabs.get", ["scope": .string(scopeKind), "id": .string(scopeID)])
            var rows = result["tabs"].array.map { tab -> JSON in var row = tab.object; row["ownerScope"] = .string(scopeKind); row["ownerID"] = .string(scopeID); row["ownerRevision"] = result["revision"]; return .object(row) }
            if projectID == nil && store.supportsProjects {
                for project in store.projectCatalog.projects(in: workspaceID) {
                    let child = try await store.request("tabs.get", ["scope": .string("project"), "id": project["id"]])
                    await shared.refreshContentTabs(scope: "project:" + (store.connection?.hostId ?? "") + ":" + project["id"].string, remote: store, kind: "project", id: project["id"].string)
                    rows += child["tabs"].array.map { tab -> JSON in var row = tab.object; row["ownerScope"] = .string("project"); row["ownerID"] = project["id"]; row["ownerRevision"] = child["revision"]; row["projectName"] = project["name"]; return .object(row) }
                }
            }
            var fields = result.object; fields["tabs"] = .array(rows); result = .object(fields); snapshot = result
        } catch { loadCachedTabs(); if store.connected { store.error = error.localizedDescription } }
    }
    private func loadCachedTabs() {
        let cached = shared.workspaceContentDescriptors[scope] ?? []
        let browserRows: [JSON] = shared.tabs(in: scope).filter { browser in !cached.contains { $0["id"].string == (browser.contentTabId ?? browser.id) } }.map { .object(["id": .string($0.contentTabId ?? $0.id), "type": .string("browser"), "title": .string($0.title), "url": .string($0.url ?? ""), "openedAt": $0.openedAt.map(JSON.string) ?? .null, "lastTouchedAt": $0.lastTouchedAt.map(JSON.string) ?? .null]) }
        var rows = cached + browserRows
        if projectID == nil {
            for project in store.projectCatalog.projects(in: workspaceID) {
                let childScope = "project:" + (store.connection?.hostId ?? "") + ":" + project["id"].string
                rows += (shared.workspaceContentDescriptors[childScope] ?? []).map { tab in var fields = tab.object; fields["ownerScope"] = .string("project"); fields["ownerID"] = project["id"]; fields["projectName"] = project["name"]; return .object(fields) }
            }
        }
        snapshot = .object(["tabs": .array(rows)])
    }
    private func mutate(_ operations: [JSON], tab: JSON = .null) { busy = true; Task { defer { busy = false }; do {
        let kind = tab["ownerScope"].string.isEmpty ? scopeKind : tab["ownerScope"].string
        let id = tab["ownerID"].string.isEmpty ? scopeID : tab["ownerID"].string
        _ = try await store.request("tabs.mutate", ["scope": .string(kind), "id": .string(id), "expectedRevision": tab == .null ? snapshot["revision"] : tab["ownerRevision"], "operations": .array(operations)])
        await shared.refreshContentTabs(scope: "\(kind):\(store.connection?.hostId ?? ""):\(id)", remote: store, kind: kind, id: id); await load()
    } catch { store.error = error.localizedDescription } } }
    private func open(_ tab: JSON) { Task { do {
        if tab["hidden"].bool {
            _ = try await store.request("tabs.mutate", ["scope": tab["ownerScope"] == .null ? .string(scopeKind) : tab["ownerScope"], "id": tab["ownerID"] == .null ? .string(scopeID) : tab["ownerID"], "expectedRevision": tab["ownerRevision"] == .null ? snapshot["revision"] : tab["ownerRevision"], "operations": .array([.object(["action": .string("visibility"), "id": tab["id"], "hidden": .bool(false)])])])
            let kind = tab["ownerScope"].string.isEmpty ? scopeKind : tab["ownerScope"].string, id = tab["ownerID"].string.isEmpty ? scopeID : tab["ownerID"].string
            await shared.refreshContentTabs(scope: kind + ":" + (store.connection?.hostId ?? "") + ":" + id, remote: store, kind: kind, id: id)
        }
        onOpen(tab)
    } catch { store.error = error.localizedDescription } } }
    private func reorder(_ index: Int, delta: Int) { var ids = rows.map { $0["id"] }; guard ids.indices.contains(index + delta) else { return }; ids.swapAt(index, index + delta); mutate([.object(["action": .string("reorder"), "ids": .array(ids)])]) }
    private func command(_ input: [String: JSON]) {
        var args = input
        if let tab = rows.first(where: { $0["id"] == input["tabId"] }), tab["ownerScope"] != .null { args["scope"] = tab["ownerScope"]; args["id"] = tab["ownerID"]; args["expectedRevision"] = tab["ownerRevision"] }
        let host = store.connection?.hostId ?? "", sourceKind = args["scope"]?.string ?? scopeKind, sourceID = args["id"]?.string ?? scopeID
        let sourceScope = ["main", "team"].contains(sourceKind) ? sourceKind + ":" + host : sourceKind + ":" + host + ":" + sourceID
        let target = args["destination"] ?? .null, targetKind = target["scope"].string, targetID = target["id"].string
        let targetScope = ["main", "team"].contains(targetKind) ? targetKind + ":" + host : targetKind + ":" + host + ":" + targetID
        if args["action"]?.string == "move", shared.hasPendingContent(in: sourceScope) || shared.hasPendingContent(in: targetScope) { store.error = "Wait for pending tab changes to synchronize before moving this tab."; return }
        busy = true
        Task { defer { busy = false }; do {
            _ = try await store.request("tabs.manage", args)
            if args["action"]?.string == "move", let tabID = args["tabId"]?.string {
                shared.applyOwnedContentMove(tabID: tabID, from: sourceScope, to: targetScope, hostID: host)
                await shared.refreshContentTabs(scope: targetScope, remote: store, kind: targetKind, id: targetID)
            }
            await shared.refreshContentTabs(scope: sourceScope, remote: store, kind: sourceKind, id: sourceID)
            await load(); moving = false
        } catch { store.error = error.localizedDescription } }
    }
    private func move() { let parts = destination.split(separator: ":", maxSplits: 1).map(String.init); guard parts.count == 2 else { return }; Task { do { let target = try await store.request("tabs.get", ["scope": .string(parts[0]), "id": .string(parts[1])]); command(["action": .string("move"), "scope": .string(scopeKind), "id": .string(scopeID), "tabId": moveTab["id"], "expectedRevision": snapshot["revision"], "destination": .object(["scope": .string(parts[0]), "id": .string(parts[1]), "expectedRevision": target["revision"]])]) } catch { store.error = error.localizedDescription } } }
}
struct ContextFavoriteButton: View {
    @Environment(RemoteStore.self) var store
    let entry: JSON
    var workspaceID: String = ""
    @State private var busy = false
    private var favorite: Bool { let catalog = store.state["context"]; let profile = catalog["workspaces"].array.first { $0["id"].string == workspaceID }; return (profile?["favorites"] ?? catalog["favorites"]).array.contains(entry["id"]) }
    var body: some View {
        Button { busy = true; Task { defer { busy = false }; do { _ = try await store.request("context.favorite", ["workspaceId": .string(workspaceID), "id": entry["id"], "enabled": .bool(!favorite), "expectedRevision": store.state["context"]["revision"]]); await store.refresh() } catch { store.error = error.localizedDescription } } } label: { Image(systemName: favorite ? "star.fill" : "star") }
            .buttonStyle(.borderless).disabled(busy || !store.connected).accessibilityLabel("\(favorite ? "Remove from" : "Add to") favorites: \(entry["name"].string)")
    }
}
struct ContextSelection: View {
    @Environment(RemoteStore.self) var store
    @Binding var selected: Set<String>
    @Binding var agent: String
    @Binding var includeDefaults: Bool
    var workspaceID = ""
    var workspace: JSON = .null
    @State private var search = ""
    @State private var scopedCatalog: JSON = .null
    @State private var preview: JSON = .null
    @State private var previewError = ""
    private var catalog: JSON { scopedCatalog == .null ? store.state["context"] : scopedCatalog }
    static func selectionWorkspaceID(_ explicitID: String, profile: JSON) -> String {
        explicitID.isEmpty ? profile["id"].string : explicitID
    }
    static func favoriteIDs(hostCatalog: JSON, scopedCatalog: JSON, workspaceID: String) -> Set<String> {
        // A Section's scoped-catalog task can be suspended while it is offscreen.
        // The host snapshot already carries the current favorites for each workspace.
        let profile = hostCatalog["workspaces"].array.first { $0["id"].string == workspaceID }
        let value = profile?["favorites"] ?? .null
        return Set((value == .null ? scopedCatalog["favorites"] : value).array.map(\.string))
    }
    private var favorites: Set<String> { Self.favoriteIDs(hostCatalog: store.state["context"], scopedCatalog: catalog, workspaceID: resolvedWorkspaceID) }
    private var entries: [JSON] { catalog["entries"].array.filter { $0["mode"].string != "disabled" || favorites.contains($0["id"].string) } }
    private var profile: JSON { workspace != .null ? workspace : catalog["workspaces"].array.first { $0["id"].string == (workspaceID.isEmpty ? catalog["defaultWorkspaceId"].string : workspaceID) } ?? .null }
    private var resolvedWorkspaceID: String { Self.selectionWorkspaceID(workspaceID, profile: profile) }
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
        }.task(id: workspaceID + ":" + store.state["context"]["revision"].string) {
            let id = workspaceID.isEmpty ? profile["id"].string : workspaceID
            if !id.isEmpty, let result = try? await store.request("context.get", ["workspaceId": .string(id)]) { scopedCatalog = result }
        }.task(id: previewKey) {
            do { try await Task.sleep(for: .milliseconds(180)); var ids = selected; if !agent.isEmpty { ids.insert(agent) }
                let result = try await store.request("context.preview", ["workspaceId": profile["id"], "workspace": profile, "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)])
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
            ContextFavoriteButton(entry: entry, workspaceID: resolvedWorkspaceID)
        }
    }
}
struct ChatContextView: View {
    @Environment(RemoteStore.self) var store
    @Environment(\.dismiss) private var dismiss
    let run: JSON
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var saving = false
    var body: some View {
        NavigationStack { Form { ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspaceID: run["context"]["workspaceId"].string, workspace: run["context"]["baseWorkspace"] != .null ? run["context"]["baseWorkspace"] : run["schedule"]["workspace"]) }.navigationTitle("Chat context").toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Apply") { saving = true; Task { defer { saving = false }; do { var ids = selected; if !agent.isEmpty { ids.insert(agent) }; _ = try await store.request("chat.context", ["id": run["id"], "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)]); await store.openChat(run["id"].string); dismiss() } catch { store.error = error.localizedDescription } } }.disabled(saving || !store.connected) }
        }.task { selected = Set(run["context"]["selectedIds"].array.map(\.string)); agent = run["context"]["agentId"].string; includeDefaults = run["context"]["includeDefaults"] != .bool(false) } }
    }
}
struct ContextView: View {
    @Environment(RemoteStore.self) var store
    var workspaceID: String = ""
    @State private var deleting = false
    @State private var search = ""
    @State private var kind = "instruction"
    @State private var workspace = ""
    @State private var scoped: JSON = .null
    @State private var busy = false
    @State private var exclusions = ""
    @State private var workspaceName = ""
    @State private var approvalMode = "ask"
    @State private var collapsed = Set<String>()
    @State private var folderModes: [String: String] = [:]
    private var context: JSON { scoped == .null ? store.state["context"] : scoped }
    private var profile: JSON { context["workspaces"].array.first { $0["id"].string == workspace } ?? .null }
    private var roots: [String] { Array(Set([profile["cwd"].string] + profile["additionalDirectories"].array.map(\.string) + profile["libraryFolders"].array.map(\.string))).filter { !$0.isEmpty }.sorted { $0.localizedStandardCompare($1) == .orderedAscending } }
    private var entries: [JSON] { context["entries"].array.filter { entry in (search.isEmpty ? entry["kind"].string == kind : (entry["name"].string + " " + entry["path"].string + " " + entry["kind"].string).localizedCaseInsensitiveContains(search)) }.sorted { $0["name"].string.localizedStandardCompare($1["name"].string) == .orderedAscending } }
    private var groups: [String] { Array(Set(entries.map { root($0) })).sorted { $0.localizedStandardCompare($1) == .orderedAscending } }
    private func root(_ entry: JSON) -> String { entry["roots"].array.map(\.string).filter { roots.contains($0) }.sorted().first ?? entry["roots"].array.first?.string ?? "Other sources" }
    var body: some View {
        List {
            if workspaceID.isEmpty { Picker("Workspace", selection: $workspace) { ForEach(context["workspaces"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) } } }
            Section {
                Button("Delete workspace…", role: .destructive) { deleting = true }.disabled(!store.connected || busy)
                TextField("Workspace name", text: $workspaceName)
                Button("Save name") { save(["name": .string(workspaceName.trimmingCharacters(in: .whitespacesAndNewlines))]) }.disabled(busy || !store.connected || workspaceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || workspaceName == profile["name"].string)
                DisclosureGroup("Workspace folders") {
                    Picker("Starting folder", selection: Binding(get: { profile["cwd"].string }, set: { starting($0) })) { ForEach(roots, id: \.self) { Text($0).tag($0) } }.disabled(busy || !store.connected)
                    Text("Commands start here. Other workspace folders remain available.").font(.caption).foregroundStyle(.secondary)
                    ForEach(roots, id: \.self) { path in
                        VStack(alignment: .leading, spacing: 6) { Text(path).font(.caption.monospaced()).textSelection(.enabled)
                            if ([profile["cwd"].string] + profile["additionalDirectories"].array.map(\.string)).contains(path) {
                                Picker("Access", selection: Binding(get: { profile["approvals"]["folders"].array.first { $0["path"].string == path }?["access"].string ?? "read-write" }, set: { access in folderAccess(path, access) })) { Text("Read / write").tag("read-write"); Text("Read").tag("read") }.disabled(busy || !store.connected)
                            }
                            HStack { if path == profile["cwd"].string { Text("Starting folder").font(.caption).foregroundStyle(.secondary) }; Spacer(); Button("Refresh") { refresh(path) }.disabled(busy || !store.connected) } }
                    }
                    Text("Folder paths belong to \(store.displayName). Add or remove folders using its desktop configuration.").font(.caption).foregroundStyle(.secondary)
                }
                DisclosureGroup("Workspace sources") {
                    ForEach(profile["libraryFolders"].array, id: \.self) { path in HStack { Text(path.string).font(.caption.monospaced()).textSelection(.enabled); Spacer(); Toggle("Every chat", isOn: Binding(get: { profile["universalFolders"].array.contains(path) }, set: { enabled in var folders = profile["universalFolders"].array; if enabled { if !folders.contains(path) { folders.append(path) } } else { folders.removeAll { $0 == path } }; save(["universalFolders": .array(folders)]) })).fixedSize() } }
                    ForEach(profile["documents"].array, id: \.self) { document in Text(document["path"].string).font(.caption.monospaced()).textSelection(.enabled) }
                    Text("Source folders and individual documents are configured on \(store.displayName). Loading modes and favorites below apply only to this workspace.").font(.caption).foregroundStyle(.secondary)
                }
                DisclosureGroup("Chat defaults") {
                    Picker("Main agent", selection: Binding(get: { profile["defaults"]["agentId"].string }, set: { agent in var defaults = profile["defaults"].object; defaults["agentId"] = .string(agent); save(["defaults": .object(defaults)]) })) {
                        Text("Default assistant").tag("")
                        ForEach(context["entries"].array.filter { $0["kind"].string == "agent" && $0["mode"].string != "disabled" && $0["unsupportedAgentFields"].array.isEmpty }, id: \.self) { Text($0["name"].string).tag($0["id"].string) }
                    }.disabled(busy || !store.connected)
                    Toggle("Include every-chat and workspace defaults", isOn: Binding(get: { profile["defaults"]["includeDefaults"] != .bool(false) }, set: { enabled in var defaults = profile["defaults"].object; defaults["includeDefaults"] = .bool(enabled); save(["defaults": .object(defaults)]) })).disabled(busy || !store.connected)
                    Text("New chats inherit these choices. Browser, files and terminal tools remain available.").font(.caption).foregroundStyle(.secondary)
                }
                DisclosureGroup("Approvals") {
                    Picker("Workspace tool approvals", selection: $approvalMode) { Text("Ask each time").tag("ask"); Text("Saved rules only").tag("custom"); Text("Trusted workspace").tag("trusted"); Text("Auto-approve tools").tag("autopilot") }
                    Button("Apply permissions") { var approvals = profile["approvals"].object; approvals["mode"] = .string(approvalMode); save(["approvals": .object(approvals)]) }.disabled(busy || !store.connected)
                    ForEach(profile["approvals"]["folders"].array, id: \.self) { folder in Text(folder["path"].string + " · " + folder["access"].string).font(.caption.monospaced()).textSelection(.enabled) }
                    ForEach(context["approvalProfiles"].array, id: \.self) { saved in
                        DisclosureGroup("Saved rules · " + saved["provider"].string) {
                            Text(saved["mode"].string).font(.caption)
                            ForEach(saved["folders"].array, id: \.self) { folder in Text(folder["path"].string + " · " + folder["access"].string).font(.caption.monospaced()).textSelection(.enabled) }
                            ForEach(saved["rules"].array, id: \.self) { rule in Text([rule["kind"], rule["command"], rule["server"], rule["tool"], rule["action"], rule["origin"]].map(\.string).filter { !$0.isEmpty }.joined(separator: " · ")).font(.caption.monospaced()).textSelection(.enabled) }
                        }
                    }
                    Text("This workspace’s settings apply on \(store.displayName). Chat-only grants stay with their chat.").font(.caption).foregroundStyle(.secondary)
                }
                DisclosureGroup("Folder discovery") {
                    TextField("Excluded folders or patterns, one per line", text: $exclusions, axis: .vertical).lineLimit(4...10).autocorrectionDisabled().textInputAutocapitalization(.never)
                    Button("Save exclusions") { var discovery = profile["discovery"].object; discovery["exclusions"] = .array(exclusions.split(separator: "\n").map { .string(String($0).trimmingCharacters(in: .whitespacesAndNewlines)) }); save(["discovery": .object(discovery)]) }.disabled(busy || !store.connected)
                    Text("Each configured folder scans independently. Dependencies, caches and generated output can be excluded without blocking other folders.").font(.caption).foregroundStyle(.secondary)
                }
            }
            Section("Instructions, skills, agents & MCPs") {
                Picker("Source type", selection: $kind) { Text("Instructions").tag("instruction"); Text("Skills").tag("skill"); Text("Agents").tag("agent"); Text("MCPs").tag("mcp") }
                TextField("Filter by name or path · all sections", text: $search).autocorrectionDisabled()
                Text("Every chat is automatic. With workspace follows its source folder. Choose per chat appears in the chat picker. Disabled excludes automatic loading. Skills supply their instructions; agents are registered for use when needed. MCPs start disabled.").font(.caption).foregroundStyle(.secondary)
            }
            ForEach(groups, id: \.self) { folder in
                Section {
                    DisclosureGroup(isExpanded: Binding(get: { !search.isEmpty || !collapsed.contains(folder) }, set: { if $0 { collapsed.remove(folder) } else { collapsed.insert(folder) } })) {
                        HStack { Button("Set as starting folder") { starting(folder) }.disabled(!roots.contains(folder) || busy || !store.connected); Spacer(); Button("Refresh") { refresh(folder) }.disabled(!roots.contains(folder) || busy || !store.connected) }
                        HStack {
                            Picker("Load in", selection: Binding(get: { folderModes[folder] ?? "available" }, set: { folderModes[folder] = $0 })) { ForEach(contextModes, id: \.0) { Text($0.1).tag($0.0) } }
                            Button("Apply to all") { var modes = profile["modes"].object; for entry in context["entries"].array where root(entry) == folder { modes[entry["id"].string] = .string(folderModes[folder] ?? "available") }; save(["modes": .object(modes)]) }.disabled(busy || !store.connected)
                        }
                        ForEach(entries.filter { root($0) == folder }, id: \.self) { entry in sourceRow(entry) }
                    } label: { Text(folder).font(.caption.monospaced()).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true).textSelection(.enabled) }
                }
            }
            ForEach(context["errors"].array, id: \.self) { issue in Text(issue["root"].string + " " + issue["message"].string).font(.caption).foregroundStyle(.orange) }
        }.navigationTitle("Workspace configuration")
            .toolbar { Button("Refresh sources", systemImage: "arrow.clockwise") { refresh(nil) }.disabled(busy || !store.connected) }
            .sheet(isPresented: $deleting) { NativeWorkspaceDeleteView(workspaceID: workspace).environment(store) }
        .task { workspace = workspaceID.isEmpty ? store.state["context"]["defaultWorkspaceId"].string : workspaceID; await load() }
            .onChange(of: workspace) { _, _ in Task { await load() } }
            .onDisappear { retainDraft() }
    }
    private func sourceRow(_ entry: JSON) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack { Text(entry["name"].string).font(.headline); Spacer(); Button { command("context.favorite", ["workspaceId": .string(workspace), "id": entry["id"], "enabled": .bool(!context["favorites"].array.contains(entry["id"])), "expectedRevision": context["revision"]]) } label: { Image(systemName: context["favorites"].array.contains(entry["id"]) ? "star.fill" : "star") }.buttonStyle(.borderless).accessibilityLabel("Favorite " + entry["name"].string) }
            Text(entry["path"].string).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled)
            Text(entry["kind"].string + (entry["missing"].bool ? " · missing" : "")).font(.caption).foregroundStyle(.secondary)
            if entry["kind"].string == "mcp" { Text(entry["integrationStatus"].string.isEmpty ? "Connection not checked on owner" : entry["integrationStatus"].string).font(.caption).foregroundStyle(.secondary) }
            if !entry["unsupportedAgentFields"].array.isEmpty { Text(entry["unsupportedAgentFields"].array.map(\.string).joined(separator: "; ")).font(.caption).foregroundStyle(.orange) }
            Picker("Load in", selection: Binding(get: { entry["mode"].string }, set: { mode in command("context.mode", ["workspaceId": .string(workspace), "id": entry["id"], "mode": .string(mode), "expectedRevision": context["revision"]]) })) { ForEach(contextModes, id: \.0) { Text($0.1).tag($0.0) } }.disabled(busy || !store.connected)
        }.padding(.vertical, 5)
    }
    private func folderAccess(_ folder: String, _ access: String) {
        var approvals = profile["approvals"].object
        approvals["folders"] = .array(profile["approvals"]["folders"].array.filter { $0["path"].string != folder } + [.object(["path": .string(folder), "access": .string(access)])])
        command("context.update", ["action": .string("save-workspace"), "workspaceId": .string(workspace), "configuration": .object(["approvals": .object(approvals)]), "replaceApprovalFolders": .bool(true), "expectedRevision": context["revision"]])
    }
    private func starting(_ folder: String) { let folders = Array(Set([profile["cwd"].string] + profile["additionalDirectories"].array.map(\.string))); save(["cwd": .string(folder), "additionalDirectories": .array(folders.filter { $0 != folder }.map(JSON.string))]) }
    private func save(_ config: [String: JSON]) { retainDraft(); var draft = store.draft("workspace-config:" + workspace).object; for key in config.keys { draft.removeValue(forKey: key) }; store.setDraft("workspace-config:" + workspace, .object(draft)); command("context.update", ["action": .string("save-workspace"), "workspaceId": .string(workspace), "configuration": .object(config), "expectedRevision": context["revision"]]) }
    private func refresh(_ root: String?) { var args: [String: JSON] = ["workspaceId": .string(workspace)]; if let root { args["root"] = .string(root) }; command("context.refresh", args) }
    private func retainDraft() {
        guard !workspace.isEmpty, scoped != .null else { return }
        var fields: [String: JSON] = [:]
        if workspaceName != profile["name"].string { fields["name"] = .string(workspaceName) }
        if exclusions != profile["discovery"]["exclusions"].array.map(\.string).joined(separator: "\n") { fields["discovery"] = .string(exclusions) }
        if approvalMode != profile["approvals"]["mode"].string { fields["approvals"] = .string(approvalMode) }
        store.setDraft("workspace-config:" + workspace, .object(fields))
    }
    private func load() async {
        guard !workspace.isEmpty else { return }
        if store.connected {
            do { scoped = try await store.request("context.get", ["workspaceId": .string(workspace)]) }
            catch { if store.connected { store.error = error.localizedDescription } }
        }
        let draft = store.draft("workspace-config:" + workspace)
        workspaceName = draft["name"] == .null ? profile["name"].string : draft["name"].string
        exclusions = draft["discovery"] == .null ? profile["discovery"]["exclusions"].array.map(\.string).joined(separator: "\n") : draft["discovery"].string
        approvalMode = draft["approvals"] == .null ? profile["approvals"]["mode"].string : draft["approvals"].string
    }
    private func command(_ method: String, _ args: [String: JSON]) { if method != "context.update" { retainDraft() }; busy = true; Task { defer { busy = false }; do { _ = try await store.request(method, args); await store.refresh(); await load() } catch { store.error = error.localizedDescription } } }
}

struct NativeWorkspaceIdentity: Identifiable, Hashable {
    let hostID: String
    let hostName: String
    let profile: JSON
    var workspaceID: String { profile["id"].string }
    var id: String { "workspace:\(hostID):\(workspaceID)" }
    static func workspaceID(_ run: JSON) -> String {
        if run.object.keys.contains("workspaceId") { return run["workspaceId"].string }
        for value in [run["workspaceId"], run["context"]["workspaceId"], run["schedule"]["context"]["workspaceId"]] where !value.string.isEmpty { return value.string }
        return ""
    }
    @MainActor static func all(_ destinations: DestinationStore) -> [Self] {
        destinations.destinations.flatMap { host in (destinations.remote(for: host.id)?.state["context"]["workspaces"].array ?? []).map { Self(hostID: host.id, hostName: host.label, profile: $0) } }.sorted { $0.profile["name"].string.localizedStandardCompare($1.profile["name"].string) == .orderedAscending }
    }
    @MainActor static func recent(_ destinations: DestinationStore) -> [Self] {
        Array(all(destinations).sorted { (destinations.remote(for: $0.hostID)?.draft("workspace-last-opened:" + $0.workspaceID).string ?? "") > (destinations.remote(for: $1.hostID)?.draft("workspace-last-opened:" + $1.workspaceID).string ?? "") }.prefix(7))
    }
}

/// One owner for a workspace/project's open-tab list and selection. The saved
/// `<kind>-navigation:<id>` draft is the source of truth for the project tab strip,
/// the iPhone drawer and the iPad sidebar; views never keep a second copy.
enum NativeWorkspaceNavigation {
    static func deduplicated(_ ids: [String]) -> [String] { var seen = Set<String>(); return ids.filter { !$0.isEmpty && seen.insert($0).inserted } }
    @MainActor static func run(_ id: String, remote: RemoteStore) -> JSON { remote.chats[id] ?? remote.state["runs"].array.first { $0["id"].string == id } ?? .object(["id": .string(id), "title": .string("Chat")]) }
    @MainActor static func select(_ id: String, navigationKey: String, remote: RemoteStore) {
        var value = remote.draft(navigationKey).object
        let next = id.isEmpty ? "workspace" : id
        let chats = value["chats"]?.array.map(\.string) ?? []
        let chatID = next.hasPrefix("chat:") ? String(next.dropFirst(5)) : nil
        guard value["selected"]?.string != next || (chatID.map { !chats.contains($0) } ?? false) else { return }
        value["selected"] = .string(next)
        if let chatID { value["chats"] = .array(deduplicated(chats + [chatID]).map(JSON.string)) }
        remote.setDraft(navigationKey, .object(value))
    }
    @MainActor static func setChats(_ ids: [String], navigationKey: String, remote: RemoteStore) {
        var value = remote.draft(navigationKey).object
        let next = JSON.array(deduplicated(ids).map(JSON.string))
        guard value["chats"] != next else { return }
        value["chats"] = next; remote.setDraft(navigationKey, .object(value))
    }
    @MainActor static func closeChat(_ id: String, navigationKey: String, remote: RemoteStore) {
        var value = remote.draft(navigationKey).object
        let chats = (value["chats"]?.array.map(\.string) ?? []).filter { $0 != id }
        value["chats"] = .array(chats.map(JSON.string))
        if value["selected"]?.string == "chat:" + id { value["selected"] = .string("workspace") }
        remote.setDraft(navigationKey, .object(value))
    }
    /// Owner polling is authoritative for which chats are open, but a chat opened here
    /// moments ago may not have reached the owner yet. Keep the selected chat instead
    /// of dropping its tab until the next refresh confirms it.
    @MainActor static func adoptOwnerChats(_ descriptors: [JSON], navigationKey: String, remote: RemoteStore) {
        var owner = deduplicated(descriptors.filter { $0["type"].string == "chat" }.map { $0["chatId"].string })
        let selected = remote.draft(navigationKey)["selected"].string
        if selected.hasPrefix("chat:"), !owner.contains(String(selected.dropFirst(5))) { owner.append(String(selected.dropFirst(5))) }
        setChats(owner, navigationKey: navigationKey, remote: remote)
    }
    /// Revision-checked owner mutation for one workspace/project tab list.
    @MainActor static func mutate(_ operations: [JSON], kind: String, id: String, scope: String, remote: RemoteStore, shared: SharedAppStore) {
        Task { do {
            let snapshot = try await remote.request("tabs.get", ["scope": .string(kind), "id": .string(id)])
            _ = try await remote.request("tabs.mutate", ["scope": .string(kind), "id": .string(id), "expectedRevision": snapshot["revision"], "operations": .array(operations)])
            await shared.refreshContentTabs(scope: scope, remote: remote, kind: kind, id: id)
        } catch { remote.error = error.localizedDescription } }
    }
    /// Ordered children shown in the project tab strip and sidebar: chats, browsers,
    /// and host-owned terminals/documents, following the owner's saved order.
    @MainActor static func children(scope: String, navigationKey: String, remote: RemoteStore, shared: SharedAppStore) -> [JSON] {
        let descriptors = shared.workspaceContentDescriptors[scope] ?? []
        let chatIDs = deduplicated(remote.draft(navigationKey)["chats"].array.map(\.string))
        let chats: [JSON] = chatIDs.map { .object(["id": .string("chat:" + $0), "sortId": .string("chat:" + $0), "type": .string("chat"), "chatId": .string($0), "title": run($0, remote: remote)["title"]]) }
        let browsers: [JSON] = shared.tabs(in: scope).map { .object(["id": .string($0.id), "sortId": .string($0.contentTabId ?? $0.id), "type": .string("browser"), "title": .string($0.title)]) }
        let other: [JSON] = descriptors.filter { ["terminal", "document"].contains($0["type"].string) }.map { tab in var fields = tab.object; fields["sortId"] = tab["id"]; fields["id"] = .string("remote:" + tab["id"].string); return .object(fields) }
        let order = descriptors.map { $0["id"].string }
        let hidden = Set(descriptors.filter { $0["hidden"].bool }.map { $0["id"].string })
        let hiddenBrowsers = Set(shared.tabs(in: scope).filter(\.hidden).map(\.id))
        return (chats + browsers + other).enumerated().sorted { a, b in
            let x = order.firstIndex(of: a.element["sortId"].string) ?? order.count + a.offset
            let y = order.firstIndex(of: b.element["sortId"].string) ?? order.count + b.offset
            return x < y
        }.map(\.element).filter { !hidden.contains($0["sortId"].string) && !hiddenBrowsers.contains($0["id"].string) }
    }
    @MainActor static func openChat(_ chatID: String, workspaceID: String, projectID: String? = nil, remote: RemoteStore) {
        let membership = remote.projectCatalog.membership(for: remote.chats[chatID] ?? remote.state["runs"].array.first { $0["id"].string == chatID } ?? .null)
        let resolved = projectID ?? (remote.supportsProjects && membership["workspaceId"].string == workspaceID ? membership["projectId"].string : "")
        let kind = resolved.isEmpty ? "workspace" : "project", ownerID = resolved.isEmpty ? workspaceID : resolved
        if !resolved.isEmpty { remote.setDraft("workspace-selected-project:" + workspaceID, .string(resolved)) }
        let key = kind + "-navigation:" + ownerID
        var value = remote.draft(key).object
        value["chats"] = .array(deduplicated((value["chats"]?.array.map(\.string) ?? []) + [chatID]).map(JSON.string))
        value["selected"] = .string("chat:" + chatID)
        remote.setDraft(key, .object(value))
        Task { do {
            let snapshot = try await remote.request("tabs.get", ["scope": .string(kind), "id": .string(ownerID)])
            if !snapshot["tabs"].array.contains(where: { $0["type"].string == "chat" && $0["chatId"].string == chatID }) {
                _ = try await remote.request("tabs.mutate", ["scope": .string(kind), "id": .string(ownerID), "expectedRevision": snapshot["revision"], "operations": .array([.object(["action": .string("open"), "tab": .object(["id": .string("chat:" + chatID), "type": .string("chat"), "chatId": .string(chatID), "title": .string("Chat")])])])])
            }
        } catch { remote.error = error.localizedDescription } }
    }
}

struct NativeWorkspacesView: View {
    var requestedWorkspace: NativeWorkspaceIdentity? = nil
    var onPhoneSelection: ((NativeWorkspaceIdentity?) -> Void)? = nil
    @EnvironmentObject var destinations: DestinationStore
    var onOpen: ((NativeWorkspaceIdentity) -> Void)? = nil
    @State private var search = ""
    @State private var selected: NativeWorkspaceIdentity?
    /// The workspace last swiped/popped away from; a forward edge swipe reopens it.
    @State private var previous: NativeWorkspaceIdentity?
    @State private var copying: NativeWorkspaceIdentity?
    @State private var creating = false
    var body: some View {
        NavigationStack {
            NativeList {
                ForEach(NativeWorkspaceIdentity.all(destinations).filter { search.isEmpty || ($0.profile["name"].string + " " + $0.hostName).localizedCaseInsensitiveContains(search) }) { entry in
                    HStack {
                        Button { open(entry) } label: { VStack(alignment: .leading, spacing: 5) { Label(entry.profile["name"].string, systemImage: "square").font(.headline); Text(entry.hostName + (destinations.remote(for: entry.hostID)?.supportsProjects == true ? " · \(destinations.remote(for: entry.hostID)?.projectCatalog.projects(in: entry.workspaceID).count ?? 0) projects" : "")).font(.caption).foregroundStyle(.secondary); Text(entry.profile["cwd"].string).font(.caption.monospaced()).foregroundStyle(.secondary).lineLimit(1) } }.buttonStyle(.plain)
                        Spacer()
                        Button { copying = entry } label: { Image(systemName: "doc.on.doc") }.buttonStyle(.borderless).accessibilityLabel("Copy " + entry.profile["name"].string).disabled(destinations.remote(for: entry.hostID)?.connected != true)
                    }.padding(.vertical, 5)
                }
                if NativeWorkspaceIdentity.all(destinations).isEmpty { Text("Connect a computer to see its workspaces.").foregroundStyle(.secondary) }
            }.navigationTitle(NativeDesignPreview.enabled ? "" : "Workspaces").nativeFeaturePage("Workspaces", search: $search).refreshable { await destinations.refreshAll() }
                .modifier(NativePageSwipe(enabled: NativePhonePreview.enabled, phone: true, blockBack: true, blockForward: previous == nil, forward: { if let previous { open(previous) } }))
                .toolbar { Button("New workspace", systemImage: "plus") { creating = true }.disabled(!destinations.destinations.contains { destinations.remote(for: $0.id)?.connected == true }) }
                .navigationDestination(item: $selected) { entry in if let remote = destinations.remote(for: entry.hostID) { NativeWorkspaceView(workspaceID: entry.workspaceID).environment(remote).modifier(NativePhoneBackNavigation()) } }
                .sheet(item: $copying) { entry in NativeWorkspaceCopyView(source: entry) { copy in copying = nil; destinations.remote(for: copy.hostID)?.setDraft("workspace-page:" + copy.workspaceID, .string("Configuration")); open(copy) } }
                .sheet(isPresented: $creating) { NativeWorkspaceCreateView { entry in creating = false; destinations.remote(for: entry.hostID)?.setDraft("workspace-page:" + entry.workspaceID, .string("Configuration")); open(entry) } }
        }.task { await destinations.refreshAll() }
        .onAppear { if NativePhonePreview.enabled, let requestedWorkspace { selected = requestedWorkspace } }
        .onChange(of: requestedWorkspace) { _, value in if NativePhonePreview.enabled { selected = value } }
        .onChange(of: selected) { old, value in if value == nil, let old { previous = old }; if NativePhonePreview.enabled { onPhoneSelection?(value) } }
    }
    private func open(_ entry: NativeWorkspaceIdentity) {
        destinations.remote(for: entry.hostID)?.setDraft("workspace-last-opened:" + entry.workspaceID, .string(ISO8601DateFormatter().string(from: Date())))
        if let onOpen { onOpen(entry) } else { selected = entry }
    }
}

struct NativeWorkspaceCreateView: View {
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.dismiss) private var dismiss
    let onCreated: (NativeWorkspaceIdentity) -> Void
    @State private var name = ""
    @State private var hostID = ""
    @State private var folder = ""
    @State private var busy = false
    @State private var message = ""
    private var roots: [String] { Array(Set((destinations.remote(for: hostID)?.state["context"]["workspaces"].array ?? []).flatMap { [$0["cwd"].string] + $0["additionalDirectories"].array.map(\.string) })).filter { !$0.isEmpty }.sorted() }
    var body: some View {
        NavigationStack {
            Form {
                TextField("Workspace name", text: $name)
                Picker("Computer", selection: $hostID) { ForEach(destinations.destinations) { Text($0.label).tag($0.id) } }
                Picker("Starting folder", selection: $folder) { Text("Choose a configured folder").tag(""); ForEach(roots, id: \.self) { Text($0).tag($0) } }
                Text("Choose a folder already configured on the selected computer. Add other folders from its desktop configuration.").font(.caption).foregroundStyle(.secondary)
                if !message.isEmpty { Text(message).foregroundStyle(.orange) }
            }.navigationTitle("New workspace").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Create") { create() }.disabled(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || folder.isEmpty || destinations.remote(for: hostID)?.connected != true) }
            }.onAppear { hostID = destinations.selectedID ?? "" }.onChange(of: hostID) { _, _ in folder = roots.first ?? "" }
        }
    }
    private func create() {
        guard let remote = destinations.remote(for: hostID) else { return }; busy = true
        Task { defer { busy = false }; do {
            let before = try await remote.request("context.get", [:])
            let result = try await remote.request("context.update", ["action": .string("workspace"), "create": .bool(true), "name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines)), "cwd": .string(folder), "expectedRevision": before["revision"]])
            await remote.refresh()
            let oldIDs = Set(before["workspaces"].array.map { $0["id"].string })
            guard let profile = result["workspaces"].array.first(where: { !oldIDs.contains($0["id"].string) }) else { throw RemoteError(message: "Workspace created. Refresh the list to open it.") }
            onCreated(NativeWorkspaceIdentity(hostID: hostID, hostName: destinations.destinations.first { $0.id == hostID }?.label ?? "Computer", profile: profile))
        } catch { message = error.localizedDescription } }
    }
}

struct NativeWorkspaceContentView: View {
    @Environment(RemoteStore.self) var store
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject private var phoneChrome: NativePhoneChrome
    @EnvironmentObject var destinations: DestinationStore
    let workspaceID: String
    var projectID: String? = nil
    var onOpenProject: (String) -> Void = { _ in }
    var onOpenMain: ((AggregateChat) -> Void)? = nil
    @Environment(\.nativePhoneAreaActive) private var areaActive
    @Environment(\.scenePhase) private var scenePhase
    @State private var page = "Projects"
    @State private var newChat = false
    @State private var transferTab: BrowserDescriptor?
    @State private var internet = false
    private var profile: JSON { store.state["context"]["workspaces"].array.first { $0["id"].string == workspaceID } ?? .null }
    private var hostID: String { store.connection?.hostId ?? "" }
    private var scopeKind: String { projectID == nil ? "workspace" : "project" }
    private var scopeID: String { projectID ?? workspaceID }
    private var scope: String { "\(scopeKind):\(hostID):\(scopeID)" }
    private var navigationKey: String { scopeKind + "-navigation:" + scopeID }
    @State private var reorder = false
    private var orderedChildren: [JSON] { NativeWorkspaceNavigation.children(scope: scope, navigationKey: navigationKey, remote: store, shared: shared) }
    private var navigation: JSON { store.draft(navigationKey) }
    // The saved navigation record is the only selection source. Earlier view-local
    // copies raced the drawer, owner polling and pushed destinations, so a second
    // chat could be "selected" in one copy while another copy kept showing the first.
    private var selected: String {
        get { let value = navigation["selected"].string; return value.isEmpty ? "workspace" : value }
        nonmutating set { NativeWorkspaceNavigation.select(newValue, navigationKey: navigationKey, remote: store) }
    }
    private var chatIDs: [String] {
        get { NativeWorkspaceNavigation.deduplicated(navigation["chats"].array.map(\.string)) }
        nonmutating set { NativeWorkspaceNavigation.setChats(newValue, navigationKey: navigationKey, remote: store) }
    }
    private func run(_ id: String) -> JSON { NativeWorkspaceNavigation.run(id, remote: store) }
    var body: some View {
        VStack(spacing: 0) {
            if !NativePhonePreview.enabled || !phoneChrome.controlsHidden { workspaceTabStrip; Divider() }
            if selected == "workspace" {
                if projectID != nil { Picker("Project page", selection: $page) { Text("Chats").tag("Chats"); Text("Tabs").tag("Tabs") }.pickerStyle(.segmented).padding(12) }
                if page == "Projects" && projectID == nil && store.supportsProjects { NativeProjectsView(workspaceID: workspaceID, onOpen: onOpenProject) }
                else if page == "Tabs" { NativeWorkspaceTabsView(workspaceID: workspaceID, projectID: projectID, onOpen: openManagedTab).environment(store) }
                else if page == "Configuration" { ContextView(workspaceID: workspaceID).environment(store) }
                else { AggregateChatsView(onSelect: { openChat($0.run["id"].string) }, lockedWorkspaceID: workspaceID, lockedHostID: hostID, lockedProjectID: projectID, initialChatType: "all") }
            } else if selected.hasPrefix("chat:") { ChatView(id: String(selected.dropFirst(5)), onBack: { selected = "workspace" }, workspaceBrowserScope: scope).environment(store).id(selected) }
            else if selected.hasPrefix("remote:") {
                ContentUnavailableView("Available on \(store.displayName)", systemImage: "desktopcomputer", description: Text("This saved terminal or host document tab remains on \(store.displayName). Open it there to reconnect to the terminal; chat documents can be requested through their chat’s approved document controls.")).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else { TeamBrowserView(scope: scope, showTabs: false, tabID: selected, onBackToList: { selected = "workspace" }, newTabOptions: [NativeNewTabAction(title: "New chat", symbol: "bubble.left.and.bubble.right", enabled: store.connected, run: { internet = false; newChat = true }), NativeNewTabAction(title: "Internet Search", symbol: "magnifyingglass", enabled: store.connected, run: { internet = true; newChat = true })]) }
        }.environment(\.nativeTabStep, { direction in
            let ids = orderedChildren.map { $0["id"].string }
            guard let index = ids.firstIndex(of: selected), ids.indices.contains(index + direction) else { return }
            selected = ids[index + direction]
            if shared.tabs(in: scope).contains(where: { $0.id == selected }) { shared.select(selected, in: scope) }
        }).background(NativeTheme.background).navigationTitle(NativeDesignPreview.enabled ? "" : profile["name"].string).navigationBarTitleDisplayMode(.inline)
            .toolbar(NativePhonePreview.enabled && phoneChrome.controlsHidden ? .hidden : .automatic, for: .navigationBar)
            .nativeFeaturePage(projectID.flatMap { store.projectCatalog.project(id: $0, workspaceID: workspaceID)?["name"].string } ?? profile["name"].string, barHidden: NativePhonePreview.enabled)
            .sheet(isPresented: $reorder) { NativeTabReorderSheet(items: orderedChildren.map { (id: $0["id"].string, title: $0["title"].string) }) { ids in let children = orderedChildren; mutateTabs([.object(["action": .string("reorder"), "ids": .array(ids.compactMap { id in children.first { $0["id"].string == id }?["sortId"] })])]) } }
            .sheet(item: $transferTab) { tab in NativeBrowserTransferView(tab: tab) }
            .sheet(isPresented: $newChat) { NewChatView(internet: internet, lockedWorkspaceID: workspaceID, lockedProjectID: projectID) { id in newChat = false; openChat(id) }.environment(store) }
            .onAppear { let saved = store.draft(scopeKind + "-page:" + scopeID).string; page = saved.isEmpty ? (projectID != nil || !store.supportsProjects ? "Chats" : "Projects") : (saved == "Projects" && !store.supportsProjects ? "Chats" : saved) }
            .onChange(of: page) { _, value in store.setDraft(scopeKind + "-page:" + scopeID, .string(value)) }
            .onChange(of: shared.scopedSelection[scope]) { _, value in if let value, value != selected { selected = value } }
            .onChange(of: shared.workspaceContentDescriptors[scope]) { _, value in
                guard let value else { return }
                NativeWorkspaceNavigation.adoptOwnerChats(value, navigationKey: navigationKey, remote: store)
            }
            .onAppear { claimBack() }
            .onChange(of: selected) { _, _ in claimBack() }
            .onChange(of: areaActive) { _, active in if active { claimBack() } else if NativePhonePreview.enabled { phoneChrome.contentOwnsBack = false } }
            .onDisappear { if NativePhonePreview.enabled { phoneChrome.contentOwnsBack = false } }
            // Poll only while this project is on screen; hidden phone areas stay mounted.
            .task(id: scope + String(areaActive) + String(scenePhase == .active)) { guard areaActive, scenePhase == .active else { return }; while !Task.isCancelled { await shared.refreshContentTabs(scope: scope, remote: store, kind: scopeKind, id: scopeID); try? await Task.sleep(for: .seconds(3)) } }
    }
    private var workspacePageNames: [String] { projectID == nil ? (store.supportsProjects ? ["Projects", "Chats", "Tabs", "Configuration"] : ["Chats", "Tabs", "Configuration"]) : [] }
    private var homeTabID: String { selected == "workspace" ? (projectID == nil ? "page:" + page : "page:home") : selected }
    private var workspaceTabStrip: some View {
        HStack(spacing: 0) {
            // The only sidebar control on iPhone and (for workspace tabs) iPad; no header bar.
            NativeSidebarButton()
            NativeTabStrip(ids: (projectID == nil ? workspacePageNames.map { "page:" + $0 } : ["page:home"]) + orderedChildren.map { $0["id"].string }, selection: homeTabID) {
                HStack(spacing: 0) {
                    // The project home scrolls with its tabs; a pinned tab costs too much width on iOS.
                    if let projectID {
                        Button { selected = "workspace" } label: { Label(store.projectCatalog.project(id: projectID, workspaceID: workspaceID)?["name"].string ?? "Project", systemImage: "folder").lineLimit(1).frame(maxWidth: 200).padding(12).background(selected == "workspace" ? NativeTheme.accent.opacity(0.12) : .clear) }.overlay(alignment: .bottom) { Rectangle().fill(selected == "workspace" ? NativeTheme.accent : .clear).frame(height: 2) }.accessibilityIdentifier("project-pinned-tab").id("page:home")
                        Divider().frame(height: 24)
                    }
                    ForEach(workspacePageNames, id: \.self) { name in
                        Button(name) { selected = "workspace"; page = name }.padding(.horizontal, 10).padding(.vertical, 12).background(selected == "workspace" && page == name ? NativeTheme.accent.opacity(0.12) : .clear).overlay(alignment: .bottom) { Rectangle().fill(selected == "workspace" && page == name ? NativeTheme.accent : .clear).frame(height: 2) }.accessibilityIdentifier("workspace-page-" + name).id("page:" + name)
                        Divider().frame(height: 24)
                    }
                    ForEach(orderedChildren, id: \.self) { child in workspaceChild(child); Divider().frame(height: 24) }
                }
            }.scrollIndicators(.hidden)
            Button { shared.open(nil, scope: scope); selected = shared.selected(in: scope) ?? "workspace" } label: { Image(systemName: "plus").padding(12) }.accessibilityLabel("New workspace tab")
        }.buttonStyle(.plain).nativeTabBar()
    }
    private func workspaceChild(_ child: JSON) -> some View {
        HStack {
            Button { selected = child["id"].string; if child["type"].string == "browser" { shared.select(selected, in: scope) } } label: { NativeContentTabLabel(title: child["title"].string, symbol: NativeTabSymbol.name(kind: child["type"].string, chatType: child["type"].string == "chat" ? run(child["chatId"].string)["chatType"].string : "", mediaType: child["mediaType"].string)) }.lineLimit(1).frame(maxWidth: 220).accessibilityIdentifier("workspace-child-tab-" + child["id"].string).accessibilityLabel(child["title"].string).accessibilityValue(selected == child["id"].string ? "Selected" : "")
            Button {
                if child["type"].string == "chat" { closeChat(child["chatId"].string) }
                else if child["type"].string == "browser" { shared.close(child["id"].string) }
                else { mutateTabs([.object(["action": .string("close"), "id": child["sortId"]])]) }
                if selected == child["id"].string { selected = "workspace" }
            } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + child["title"].string)
        }.padding(12).background(selected == child["id"].string ? NativeTheme.accent.opacity(0.12) : .clear).overlay(alignment: .bottom) { Rectangle().fill(selected == child["id"].string ? NativeTheme.accent : .clear).frame(height: 2) }.id(child["id"].string)
            .modifier(NativeWorkspaceChildMenu(child: child, scope: scope, hostID: hostID, onOpenMain: onOpenMain, transferTab: $transferTab))
    }
    private func openManagedTab(_ tab: JSON) {
        if projectID == nil, tab["ownerScope"].string == "project" {
            let id = tab["ownerID"].string
            let selected = tab["type"].string == "chat" ? "chat:" + tab["chatId"].string : tab["type"].string == "browser" ? (shared.tabs(in: "project:" + hostID + ":" + id).first { ($0.contentTabId ?? $0.id) == tab["id"].string }?.id ?? "remote:" + tab["id"].string) : "remote:" + tab["id"].string
            var saved = store.draft("project-navigation:" + id).object; saved["selected"] = .string(selected); store.setDraft("project-navigation:" + id, .object(saved)); onOpenProject(id); return
        }
        if tab["type"].string == "chat" { NativeWorkspaceNavigation.openChat(tab["chatId"].string, workspaceID: workspaceID, projectID: projectID, remote: store) }
        else if tab["type"].string == "browser", let browser = shared.tabs(in: scope).first(where: { ($0.contentTabId ?? $0.id) == tab["id"].string }) { shared.select(browser.id, in: scope); selected = browser.id }
        else { selected = "remote:" + tab["id"].string }
    }
    private func openChat(_ id: String) {
        NativeWorkspaceNavigation.openChat(id, workspaceID: workspaceID, projectID: projectID, remote: store)
    }
    private func closeChat(_ id: String) { NativeWorkspaceNavigation.closeChat(id, navigationKey: navigationKey, remote: store); mutateTabs([.object(["action": .string("close"), "id": .string("chat:" + id)])]) }
    private func mutateTabs(_ operations: [JSON]) { NativeWorkspaceNavigation.mutate(operations, kind: scopeKind, id: scopeID, scope: scope, remote: store, shared: shared) }
    /// A selected tab swipes back to this page's home before UIKit pops to the parent.
    private func claimBack() { if NativePhonePreview.enabled && areaActive { phoneChrome.contentOwnsBack = selected != "workspace" } }
}

/// Press-and-hold menu for a project/workspace tab. Chat tabs carry the chat's actions.
private struct NativeWorkspaceChildMenu: ViewModifier {
    @Environment(RemoteStore.self) private var store
    @EnvironmentObject private var shared: SharedAppStore
    @EnvironmentObject private var destinations: DestinationStore
    let child: JSON
    let scope: String
    let hostID: String
    var onOpenMain: ((AggregateChat) -> Void)?
    @Binding var transferTab: BrowserDescriptor?
    func body(content: Content) -> some View {
        if child["type"].string == "chat" {
            content.nativeChatTabActions(child["chatId"].string) {
                if let onOpenMain { Button("Open in main navigation", systemImage: "rectangle.stack") { onOpenMain(AggregateChat(hostID: hostID, hostName: destinations.destinations.first { $0.id == hostID }?.label ?? "Computer", run: NativeWorkspaceNavigation.run(child["chatId"].string, remote: store))) } }
            }
        } else {
            content.contextMenu {
                if let tab = shared.tabs(in: scope).first(where: { $0.id == child["id"].string }) { Button("Send tab", systemImage: "arrow.right.square") { transferTab = tab } }
            }
        }
    }
}

struct NativeWorkspaceCopyView: View {
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.dismiss) private var dismiss
    let source: NativeWorkspaceIdentity
    let onCopied: (NativeWorkspaceIdentity) -> Void
    @State private var name = ""
    @State private var hostID = ""
    @State private var busy = false
    @State private var message = ""
    @State private var mappings: [String: String] = [:]
    private var sourceRoots: [String] { Array(Set([source.profile["cwd"].string] + source.profile["additionalDirectories"].array.map(\.string) + source.profile["libraryFolders"].array.map(\.string) + source.profile["universalFolders"].array.map(\.string))).filter { !$0.isEmpty }.sorted() }
    private var targetRoots: [String] { Array(Set((destinations.remote(for: hostID)?.state["context"]["workspaces"].array ?? []).flatMap { [$0["cwd"].string] + $0["additionalDirectories"].array.map(\.string) + $0["libraryFolders"].array.map(\.string) })).filter { !$0.isEmpty }.sorted() }
    var body: some View {
        NavigationStack {
            Form {
                TextField("Workspace name", text: $name)
                Picker("Computer", selection: $hostID) { ForEach(destinations.destinations) { Text($0.label).tag($0.id) } }
                Text("A local copy includes the complete configuration and approvals. Chats and open tabs remain with their original workspace.").font(.caption).foregroundStyle(.secondary)
                if hostID != source.hostID {
                    ForEach(sourceRoots, id: \.self) { root in Picker(root, selection: Binding(get: { mappings[root] ?? "" }, set: { mappings[root] = $0 })) { Text("Choose destination folder").tag(""); ForEach(targetRoots, id: \.self) { Text($0).tag($0) } } }
                    Text("Folders must be mapped to configured locations on the destination computer. Approvals require review on the destination computer. Browser sessions and credentials remain on their original device.").font(.caption).foregroundStyle(.secondary) }
                if !message.isEmpty { Text(message).foregroundStyle(.orange) }
            }.navigationTitle("Copy workspace").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Copy") { copy() }.disabled(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || destinations.remote(for: hostID)?.connected != true) }
            }.onAppear { name = source.profile["name"].string + " copy"; hostID = source.hostID }
        }
    }
    private func copy() {
        guard let remote = destinations.remote(for: hostID) else { return }
        busy = true
        Task { defer { busy = false }; do {
            let catalog = try await remote.request("context.get", [:])
            var args: [String: JSON] = ["action": .string("copy-workspace"), "workspaceId": .string(source.workspaceID), "name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines)), "expectedRevision": catalog["revision"]]
            if hostID != source.hostID {
                guard sourceRoots.allSatisfy({ !(mappings[$0] ?? "").isEmpty }) else { throw RemoteError(message: "Choose a destination folder for every source folder.") }
                guard let sourceRemote = destinations.remote(for: source.hostID) else { throw RemoteError(message: "Reconnect \(source.hostName).") }
                let sourceCatalog = try await sourceRemote.request("context.get", ["workspaceId": .string(source.workspaceID)])
                guard let current = sourceCatalog["workspaces"].array.first(where: { $0["id"].string == source.workspaceID }) else { throw RemoteError(message: "Refresh the source workspace.") }
                args["action"] = .string("import-workspace"); args["configuration"] = current; args["entries"] = .array(sourceCatalog["entries"].array.map { entry in .object(entry.object.filter { ["id", "path", "kind", "name", "roots", "mode"].contains($0.key) }) }); args["pathMappings"] = .array(sourceRoots.map { .object(["from": .string($0), "to": .string(mappings[$0] ?? "")]) })
            }
            let result = try await remote.request("context.update", args)
            await remote.refresh()
            guard let profile = result["workspaces"].array.first(where: { $0["id"] == result["copiedWorkspaceId"] }) else { throw RemoteError(message: "Copy completed. Refresh Workspaces to open its configuration.") }
            onCopied(NativeWorkspaceIdentity(hostID: hostID, hostName: destinations.destinations.first { $0.id == hostID }?.label ?? "Computer", profile: profile))
        } catch { message = error.localizedDescription } }
    }
}

struct NativeBrowserTransferView: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    let tab: BrowserDescriptor
    @State private var destination = "main"
    @State private var copy = false
    @State private var busy = false
    var body: some View {
        NavigationStack {
            Form {
                Text(tab.title).font(.headline)
                NativeMoveDestinationPicker(groups: browserMoveGroups, selection: $destination)

                Toggle("Make a copy", isOn: $copy)
                Text("Browser sessions stay on this device. A copy opens the address in the same browser profile; it does not copy a remote computer’s sign-in.").font(.caption).foregroundStyle(.secondary)
            }.navigationTitle("Move tab").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button(copy ? "Copy tab" : "Move tab") { transfer() }.disabled(busy || (!copy && destination == tab.scope)) }
            }.onAppear { destination = tab.scope.hasPrefix("main") ? "main" : tab.scope.hasPrefix("team") ? "team" : tab.scope }
        }
    }
    private var browserMoveGroups: [NativeMoveGroup] {
        [NativeMoveGroup(id: "application", label: "Application", locations: [NativeMoveLocation(id: "main", label: "Application tabs"), NativeMoveLocation(id: "team", label: "Team Tools")])] + destinations.destinations.flatMap { owner in
            guard let remote = destinations.remote(for: owner.id) else { return [NativeMoveGroup]() }
            return NativeMoveLocations.groups(context: remote.state["context"], projects: remote.projectCatalog.raw, hostID: owner.id, roots: false).map { NativeMoveGroup(id: $0.id, label: $0.label + " · " + owner.label, locations: $0.locations) }
        }
    }
    private func transfer() {
        busy = true
        Task { defer { busy = false }
            let parts = destination.split(separator: ":", maxSplits: 2).map(String.init)
            let owner = parts.count == 3 ? parts[1] : (destinations.selectedID ?? tab.ownerHostId ?? "")
            if parts.count == 3, let remote = destinations.remote(for: owner) {
                guard remote.connected else { remote.error = "Connect the destination computer before sending this tab."; return }
                await shared.refreshContentTabs(scope: destination, remote: remote, kind: parts[0], id: parts[2])
            }
            shared.transferBrowser(tab.id, to: destination, copy: copy, ownerHostID: owner); dismiss()
        }
    }
}

struct NativeWorkspaceDeleteView: View {
    @Environment(RemoteStore.self) var store
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    let workspaceID: String
    @State private var catalog: JSON = .null
    @State private var destination = ""
    @State private var name = ""
    @State private var busy = false
    @State private var failure = ""
    var body: some View { NavigationStack { Form {
        Text("All associated tabs, including hidden browser, terminal and viewer tabs, will close. Chats, history, settings and current turns are preserved. Ordinary terminal processes stop; persistent tmux work stays available. Project files are preserved.")
        Picker("Associated chats", selection: $destination) {
            Text("Keep chats unhoused").tag("")
            ForEach(catalog["workspaces"].array.filter { $0["id"].string != workspaceID }, id: \.self) { Text("Move to " + $0["name"].string).tag($0["id"].string) }
            Text("Move to a new workspace").tag("new")
        }
        if destination == "new" { TextField("New workspace name", text: $name) }
        if catalog["workspaces"].array.count == 1 { Text("A fresh default workspace will keep the app usable.").font(.caption) }
        if !failure.isEmpty { Text(failure).foregroundStyle(.orange) }
    }.navigationTitle("Delete workspace").toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) { Button("Delete", role: .destructive) { remove() }.disabled(busy || catalog == .null || destination == "new" && name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
    }.task { do { catalog = try await store.request("context.get", [:]) } catch { failure = error.localizedDescription } } } }
    private func remove() { busy = true; Task { defer { busy = false }; do {
        var target = destination, current = catalog
        if target == "new" {
            let source = current["workspaces"].array.first { $0["id"].string == workspaceID } ?? .null
            let result = try await store.request("context.update", ["action": .string("workspace"), "create": .bool(true), "name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines)), "cwd": source["cwd"], "expectedRevision": current["revision"]])
            guard let created = result["workspaces"].array.first(where: { row in !current["workspaces"].array.contains { $0["id"] == row["id"] } }) else { throw RemoteError(message: "Refresh the workspace list before retrying.") }; target = created["id"].string; current = result; destination = target; catalog = result
        }
        _ = try await store.request("workspace.delete", ["workspaceId": .string(workspaceID), "moveToWorkspaceId": target.isEmpty ? .null : .string(target), "expectedRevision": current["revision"]])
        let scope = "workspace:\(store.connection?.hostId ?? ""):\(workspaceID)"
        for tab in shared.tabs(in: scope) { shared.close(tab.id) }
        await store.refresh(); NotificationCenter.default.post(name: Notification.Name("ProteusWorkspaceDeleted"), object: nil, userInfo: ["hostID": store.connection?.hostId ?? "", "workspaceID": workspaceID]); dismiss()
    } catch { failure = error.localizedDescription } } }
}

/// The active workspace/project's open tabs in the iPhone drawer and iPad sidebar.
/// Rows mirror the project tab strip; both read and write the same navigation record.
struct NativeScopeTabRows: View {
    @EnvironmentObject private var shared: SharedAppStore
    var remote: RemoteStore
    let workspaceID: String
    var onSelect: () -> Void
    private var hostID: String { remote.connection?.hostId ?? "" }
    private var projectID: String { remote.draft("workspace-selected-project:" + workspaceID).string }
    private var project: JSON? { projectID.isEmpty ? nil : remote.projectCatalog.project(id: projectID, workspaceID: workspaceID) }
    private var kind: String { project == nil ? "workspace" : "project" }
    private var scopeID: String { project == nil ? workspaceID : projectID }
    private var scope: String { kind + ":" + hostID + ":" + scopeID }
    private var navigationKey: String { kind + "-navigation:" + scopeID }
    private var owner: String { project?["name"].string ?? remote.state["context"]["workspaces"].array.first { $0["id"].string == workspaceID }?["name"].string ?? "Workspace" }
    var body: some View {
        let children = NativeWorkspaceNavigation.children(scope: scope, navigationKey: navigationKey, remote: remote, shared: shared)
        let selected = remote.draft(navigationKey)["selected"].string
        VStack(alignment: .leading, spacing: 2) {
            Text("Open tabs · " + owner).font(.caption.weight(.semibold)).foregroundStyle(.secondary).lineLimit(1).padding(.horizontal, 12).padding(.top, 4)
            if children.isEmpty { Text("No open tabs").font(.caption).foregroundStyle(.secondary).padding(.horizontal, 12).padding(.vertical, 6) }
            ForEach(children, id: \.self) { child in
                let id = child["id"].string, title = child["title"].string.isEmpty ? (child["type"].string == "chat" ? "Chat" : "Tab") : child["title"].string
                HStack(spacing: 2) {
                    Button { open(child) } label: {
                        Label(title, systemImage: NativeTabSymbol.name(kind: child["type"].string, chatType: child["type"].string == "chat" ? NativeWorkspaceNavigation.run(child["chatId"].string, remote: remote)["chatType"].string : "", mediaType: child["mediaType"].string))
                            .lineLimit(2).font(.subheadline).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 9).contentShape(Rectangle())
                    }.accessibilityIdentifier("scope-tab-" + id).accessibilityValue(selected == id ? "Active" : "Inactive")
                    Button { close(child) } label: { Image(systemName: "xmark").font(.system(size: 10, weight: .semibold)).foregroundStyle(NativeTheme.accent).frame(width: 44, height: 40, alignment: .trailing).contentShape(Rectangle()) }
                        .accessibilityLabel("Close tab " + title)
                }.padding(.leading, 12).padding(.trailing, 6).background(selected == id ? NativeSidebarStyle.selected : .clear, in: RoundedRectangle(cornerRadius: 8))
            }
        }.buttonStyle(.plain).task(id: scope) {
            guard remote.connected else { return }
            await shared.refreshContentTabs(scope: scope, remote: remote, kind: kind, id: scopeID)
        }
    }
    private func open(_ child: JSON) {
        let id = child["id"].string
        NativeWorkspaceNavigation.select(id, navigationKey: navigationKey, remote: remote)
        if child["type"].string == "browser" { shared.select(id, in: scope) }
        onSelect()
    }
    private func close(_ child: JSON) {
        let id = child["id"].string
        switch child["type"].string {
        case "chat":
            NativeWorkspaceNavigation.closeChat(child["chatId"].string, navigationKey: navigationKey, remote: remote)
            NativeWorkspaceNavigation.mutate([.object(["action": .string("close"), "id": .string(id)])], kind: kind, id: scopeID, scope: scope, remote: remote, shared: shared)
        case "browser":
            shared.close(id)
            if remote.draft(navigationKey)["selected"].string == id { NativeWorkspaceNavigation.select("workspace", navigationKey: navigationKey, remote: remote) }
        default:
            NativeWorkspaceNavigation.mutate([.object(["action": .string("close"), "id": child["sortId"]])], kind: kind, id: scopeID, scope: scope, remote: remote, shared: shared)
            if remote.draft(navigationKey)["selected"].string == id { NativeWorkspaceNavigation.select("workspace", navigationKey: navigationKey, remote: remote) }
        }
    }
}

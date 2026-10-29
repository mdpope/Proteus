import SwiftUI
import UIKit

struct NativeWorkspaceView: View {
    @Environment(RemoteStore.self) var store
    @EnvironmentObject var shared: SharedAppStore
    let workspaceID: String
    var onOpenMain: ((AggregateChat) -> Void)? = nil
    private var selectedProject: String { selection }
    private var selection: String { store.draft("workspace-selected-project:" + workspaceID).string }
    var body: some View {
        VStack(spacing: 0) {
            if NativePhonePreview.enabled {
                NativeWorkspaceContentView(workspaceID: workspaceID, onOpenProject: select, onOpenMain: onOpenMain).environment(store)
                    // Back pops to the workspace list (UIKit); forward reopens the last project.
                    .modifier(NativePageSwipe(phone: true, blockBack: true, blockForward: lastProject.isEmpty || tabSelected("workspace-navigation:" + workspaceID), forward: { select(lastProject) }))
                    .navigationDestination(isPresented: Binding(get: { !selection.isEmpty }, set: { if !$0 { select("") } })) {
                        NativeSelectedProjectView(workspaceID: workspaceID, onOpenMain: onOpenMain).environment(store).modifier(NativePhoneBackNavigation())
                    }
            } else if !selectedProject.isEmpty, store.projectCatalog.project(id: selectedProject, workspaceID: workspaceID) != nil {
                if !NativePadPreview.enabled { HStack { Button { select("") } label: { Label("Workspace", systemImage: "chevron.left") }; Spacer() }.padding(.horizontal).padding(.vertical, 8) }
                NativeWorkspaceContentView(workspaceID: workspaceID, projectID: selectedProject, onOpenMain: onOpenMain).id(selectedProject)
                    // A project's home swipes back to its workspace; its tabs first return home.
                    .modifier(NativePageSwipe(blockBack: tabSelected("project-navigation:" + selectedProject), blockForward: true, back: { select("") }))
            } else {
                NativeWorkspaceContentView(workspaceID: workspaceID, onOpenProject: select, onOpenMain: onOpenMain).id(workspaceID)
                    .modifier(NativePageSwipe(blockBack: true, blockForward: lastProject.isEmpty || tabSelected("workspace-navigation:" + workspaceID), forward: { select(lastProject) }))
            }
        }.onAppear { reconcile() }
        .onChange(of: store.state["workspaceProjects"]) { _, _ in reconcile() }
    }
    private func reconcile() {
        guard store.supportsProjects else { return }
        shared.reconcileProjectScopes(catalog: store.projectCatalog, hostID: store.connection?.hostId ?? "")
        if !selection.isEmpty, let project = store.projectCatalog.project(id: selection), project["workspaceId"].string != workspaceID { select("") }
        if !selection.isEmpty, let target = store.projectCatalog.project(id: selection, workspaceID: workspaceID), target["id"].string != selection { select(target["id"].string) }
        let legacy = store.draft("workspace-navigation:" + workspaceID)
        var migrated = Set<String>()
        for chatID in legacy["chats"].array.map(\.string) {
            let run = store.chats[chatID] ?? store.state["runs"].array.first { $0["id"].string == chatID } ?? .null
            let member = store.projectCatalog.membership(for: run)
            guard member["workspaceId"].string == workspaceID, let project = store.projectCatalog.project(id: member["projectId"].string, workspaceID: workspaceID) else { continue }
            let key = "project-navigation:" + project["id"].string
            var value = store.draft(key).object
            value["chats"] = .array(NativeWorkspaceNavigation.deduplicated((value["chats"]?.array.map(\.string) ?? []) + [chatID]).map(JSON.string))
            if value["selected"] == nil && legacy["selected"].string == "chat:" + chatID { value["selected"] = legacy["selected"]; if selection.isEmpty { select(project["id"].string) } }
            store.setDraft(key, .object(value)); migrated.insert(chatID)
        }
        if !migrated.isEmpty {
            var remaining = legacy.object; remaining["chats"] = .array(legacy["chats"].array.filter { !migrated.contains($0.string) })
            if legacy["selected"].string.hasPrefix("chat:"), migrated.contains(String(legacy["selected"].string.dropFirst(5))) { remaining["selected"] = .string("workspace") }
            store.setDraft("workspace-navigation:" + workspaceID, .object(remaining))
        }
    }
    private func select(_ id: String) {
        if id.isEmpty, !selection.isEmpty { store.setDraft("workspace-last-project:" + workspaceID, .string(selection)) }
        store.setDraft("workspace-selected-project:" + workspaceID, .string(id))
    }
    private var lastProject: String { let id = store.draft("workspace-last-project:" + workspaceID).string; return store.projectCatalog.project(id: id, workspaceID: workspaceID) == nil ? "" : id }
    private func tabSelected(_ navigationKey: String) -> Bool { let value = store.draft(navigationKey)["selected"].string; return !value.isEmpty && value != "workspace" }
}

// A pushed destination must observe the owner's selection itself. A captured project
// value in navigationDestination otherwise stays stale when the drawer selects a sibling.
private struct NativeSelectedProjectView: View {
    @Environment(RemoteStore.self) var store
    let workspaceID: String
    var onOpenMain: ((AggregateChat) -> Void)?
    private var projectID: String { store.draft("workspace-selected-project:" + workspaceID).string }
    var body: some View {
        NativeWorkspaceContentView(workspaceID: workspaceID, projectID: projectID, onOpenMain: onOpenMain)
            .id((store.connection?.hostId ?? "") + ":" + workspaceID + ":" + projectID)
    }
}

struct NativeProjectsView: View {
    @Environment(RemoteStore.self) var store
    let workspaceID: String
    var onOpen: (String) -> Void
    @State private var editing: JSON = .null
    @State private var showEditor = false
    @State private var name = ""
    @State private var deleting: JSON = .null
    @State private var deletionRevision: JSON = .null
    @State private var deletionTarget = ""
    @State private var busy = false
    @State private var failure = ""
    private var rows: [JSON] { store.projectCatalog.projects(in: workspaceID) }
    private var defaultID: String { store.projectCatalog.defaultProject(in: workspaceID)?["id"].string ?? "" }
    var body: some View {
        NativeList {
            Section {
                HStack { Text("Projects").font(.title2.bold()); Spacer(); Button("New project", systemImage: "plus") { editing = .null; name = ""; showEditor = true }.labelStyle(.iconOnly).accessibilityIdentifier("new-project") }
                Text("Projects organize chats and tabs in this workspace.").font(.caption).foregroundStyle(.secondary)
                if !store.connected { Text("Offline · cached projects").font(.caption).foregroundStyle(.orange) }
                if !failure.isEmpty { Text(failure).foregroundStyle(.orange) }
            }
            ForEach(rows, id: \.self) { project in
                HStack {
                    Button { onOpen(project["id"].string) } label: { Label { VStack(alignment: .leading, spacing: 5) { Text(project["name"].string).font(.headline); if project["id"].string == defaultID { Text("Default project").font(.caption).foregroundStyle(.secondary) } } } icon: { Image(systemName: "folder").foregroundStyle(NativeTheme.accent) } }.buttonStyle(.plain).accessibilityIdentifier("project-open-" + project["id"].string)
                    Spacer()
                    Menu {
                        Button("Rename", systemImage: "pencil") { editing = project; name = project["name"].string; showEditor = true }
                        if project["id"].string != defaultID { Button("Set default", systemImage: "checkmark.circle") { mutate(["action": .string("default"), "projectId": project["id"]]) }; Button("Delete…", systemImage: "trash", role: .destructive) { deleting = project; deletionRevision = store.projectCatalog.revision; deletionTarget = store.projectCatalog.defaultProject(in: workspaceID)?["name"].string ?? "the default project" } }
                        if let index = rows.firstIndex(of: project) {
                            Button("Move up", systemImage: "arrow.up") { reorder(index, -1) }.disabled(index == 0)
                            Button("Move down", systemImage: "arrow.down") { reorder(index, 1) }.disabled(index == rows.count - 1)
                        }
                    } label: { Image(systemName: "ellipsis.circle").frame(width: 44, height: 44) }.disabled(busy || !store.connected).accessibilityLabel("Manage " + project["name"].string)
                }.padding(.vertical, 8)
            }
        }.disabled(busy)
            .sheet(isPresented: $showEditor) { NavigationStack { Form { TextField("Project name", text: $name).accessibilityIdentifier("project-name"); if !failure.isEmpty { Text(failure).foregroundStyle(.orange) } }.navigationTitle(editing == .null ? "New project" : "Rename project").toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showEditor = false } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { mutate(["action": .string(editing == .null ? "create" : "rename"), "projectId": editing["id"], "name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines))], dismissEditor: true) }.disabled(busy || !store.connected || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) } } } }
            .confirmationDialog("Delete \(deleting["name"].string)?", isPresented: Binding(get: { deleting != .null }, set: { if !$0 { deleting = .null } })) {
                Button("Move contents and delete project", role: .destructive) { mutate(["action": .string("delete"), "projectId": deleting["id"], "expectedRevision": deletionRevision]); deleting = .null }
            } message: { Text("All chats and tabs move to \(deletionTarget). History, files, current work and permissions are preserved.") }
    }
    private func reorder(_ index: Int, _ delta: Int) { guard rows.indices.contains(index + delta) else { return }; mutate(["action": .string("reorder"), "projectId": rows[index]["id"], "targetId": rows[index + delta]["id"], "after": .bool(delta > 0)]) }
    private func mutate(_ values: [String: JSON], dismissEditor: Bool = false) {
        busy = true; failure = ""
        Task { defer { busy = false }; do { var args = values; args["workspaceId"] = .string(workspaceID); if args["expectedRevision"] == nil { args["expectedRevision"] = store.state["workspaceProjects"]["revision"] }; _ = try await store.updateProjects(args); if dismissEditor { showEditor = false } } catch { failure = error.localizedDescription } }
    }
}

struct NativeSourceLibraryView: View {
    @Environment(RemoteStore.self) var store
    @State private var path = ""
    @State private var failure = ""
    @State private var busy = false
    private var sources: [JSON] { store.state["workspaceProjects"]["sourceLibrary"].array.filter { $0["removedAt"].string.isEmpty } }
    var body: some View {
        NativeList {
            Section("Source library · " + store.displayName) {
                Text("Register folders on this computer, then choose how their sources load in each workspace’s Configuration. Registration grants no folder access.").font(.caption).foregroundStyle(.secondary)
                if !store.connected { Text("Offline · cached sources").foregroundStyle(.orange) }
                if !failure.isEmpty { Text(failure).foregroundStyle(.orange) }
                if store.state["capabilities"].array.contains(.string("source-library.v1")) {
                    TextField("Folder path on " + store.displayName, text: $path).textInputAutocapitalization(.never).autocorrectionDisabled()
                    Button("Register source folder") { mutate(["action": .string("add"), "path": .string(path)]) }.disabled(path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !store.connected || busy)
                } else { Text("Update this computer to manage its global source library. Existing sources remain in workspace Configuration.").font(.caption) }
            }
            ForEach(sources, id: \.self) { source in
                Section {
                    Label(source["path"].string, systemImage: "folder").font(.callout).textSelection(.enabled)
                    Text("\(source["entryIds"].array.count) sources" + (source["available"].bool ? "" : " · unavailable")).font(.caption).foregroundStyle(.secondary)
                    if !source["scan"]["status"].string.isEmpty { Text(source["scan"]["status"].string.capitalized + " · \(source["scan"]["scannedFolders"].int) folders scanned").font(.caption).foregroundStyle(.secondary) }
                    ForEach(source["scan"]["errors"].array, id: \.self) { issue in Text(issue["message"].string).font(.caption).foregroundStyle(.orange) }
                    HStack { Button("Rescan", systemImage: "arrow.clockwise") { mutate(["action": .string("refresh"), "id": source["id"]]) }; Spacer(); Button("Unregister", role: .destructive) { mutate(["action": .string("remove"), "id": source["id"]]) } }.disabled(!store.connected || busy)
                }
            }
        }
    }
    private func mutate(_ values: [String: JSON]) { busy = true; failure = ""; Task { defer { busy = false }; do { var args = values; args["expectedRevision"] = store.state["workspaceProjects"]["revision"]; _ = try await store.updateSources(args); path = "" } catch { failure = error.localizedDescription } } }
}

struct NativeWorkspaceTree: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var shared: SharedAppStore
    var activeWorkspace: String?
    var onOpen: (NativeWorkspaceIdentity) -> Void
    var onBrowse: (() -> Void)? = nil
    @State private var expanded = Set<String>()
    @State private var projectExpanded = Set<String>()
    @State private var limits: [String: Int] = [:]
    @State private var resourceRows: [String: [JSON]] = [:]
    @State private var otherComputers = false
    private var workspaces: [NativeWorkspaceIdentity] { NativeWorkspaceIdentity.all(destinations) }
    var body: some View {
        VStack(spacing: 8) {
            HStack { if NativeDesignPreview.enabled, let onBrowse { Button(action: onBrowse) { Label { Text("Workspaces") } icon: { NativeSidebarIcon(kind: "grid").foregroundStyle(NativeSidebarStyle.muted) }.font(.body).frame(minHeight: 44).contentShape(Rectangle()) } } else { Text("Workspaces").font(.caption).foregroundStyle(.secondary) }; Spacer(); Button { expanded.removeAll(); projectExpanded.removeAll(); limits.removeAll(); otherComputers = false } label: { NativeSidebarIcon(kind: "collapse").foregroundStyle(NativeSidebarStyle.muted).frame(width: NativeDesignPreview.enabled ? 44 : nil, height: NativeDesignPreview.enabled ? 44 : nil).contentShape(Rectangle()) }.accessibilityLabel("Collapse all workspaces") }.padding(.horizontal, 8).padding(.vertical, 6)
            Rectangle().fill(NativeSidebarStyle.border).frame(height: 1).padding(.bottom, 4)
            ForEach(workspaces.filter { $0.hostID == destinations.selectedID }) { workspace in workspaceRow(workspace) }
            if destinations.destinations.contains(where: { $0.id != destinations.selectedID }) {
                Divider().padding(.vertical, 5)
                Button { otherComputers.toggle() } label: { HStack { Text("Other Computers").font(.system(size: 14)); Spacer(); Image(systemName: otherComputers ? "chevron.down" : "chevron.right").font(.caption) }.padding(8) }.accessibilityIdentifier("other-computers-expander")
                if otherComputers {
                    ForEach(destinations.destinations.filter { $0.id != destinations.selectedID }) { computer in
                        Text(computer.label).font(.caption.weight(.semibold)).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 8).padding(.top, 8)
                        ForEach(workspaces.filter { $0.hostID == computer.id }) { workspace in workspaceRow(workspace) }
                    }
                }
            }
        }.buttonStyle(.plain).foregroundStyle(NativeSidebarStyle.ink).onChange(of: activeWorkspace) { old, new in if old != nil && new == nil { limits.removeAll() } }
        .task(id: destinations.destinations.map { $0.id + ":" + String(destinations.remote(for: $0.id)?.connected == true) }.joined(separator: "|")) {
            for destination in destinations.destinations {
                guard let remote = destinations.remote(for: destination.id), remote.connected, remote.supportsProjects else { continue }
                if remote.allRuns.isEmpty { await remote.loadAllRuns() }
                while remote.allRuns.count < remote.allRunCount && !Task.isCancelled { let old = remote.allRuns.count; await remote.loadAllRuns(); if old == remote.allRuns.count { break } }
            }
        }
    }
    @ViewBuilder private func workspaceRow(_ workspace: NativeWorkspaceIdentity) -> some View {
        if let remote = destinations.remote(for: workspace.hostID) {
            VStack(spacing: 2) {
                HStack(spacing: 6) {
                    Button { expanded.insert(workspace.id); onOpen(workspace) } label: {
                        HStack(spacing: 7) { NativeSidebarIcon(kind: "workspace").foregroundStyle(activeWorkspace == workspace.id ? NativeTheme.accent : NativeSidebarStyle.muted); VStack(alignment: .leading, spacing: 2) { Text(workspace.profile["name"].string).font(.system(size: 14, weight: .medium)).lineLimit(2); if !remote.connected { Text("Offline").font(.caption2).foregroundStyle(.secondary) } }; Spacer(minLength: 2); if remote.supportsProjects { Text(String(remote.projectCatalog.projects(in: workspace.workspaceID).count)).font(.caption2).foregroundStyle(activeWorkspace == workspace.id ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.muted) } }.frame(minHeight: 40).contentShape(Rectangle())
                    }.buttonStyle(.plain).accessibilityIdentifier("workspace-tree-open-" + workspace.id)
                    Button { if !expanded.insert(workspace.id).inserted { expanded.remove(workspace.id); for project in remote.projectCatalog.projects(in: workspace.workspaceID) { limits[workspace.hostID + ":" + project["id"].string] = nil } } } label: { Image(systemName: expanded.contains(workspace.id) ? "chevron.down" : "chevron.right").font(.caption).frame(width: 32, height: 40) }.accessibilityLabel((expanded.contains(workspace.id) ? "Collapse " : "Expand ") + workspace.profile["name"].string).accessibilityIdentifier("workspace-tree-toggle-" + workspace.id).accessibilityValue(expanded.contains(workspace.id) ? "Expanded" : "Collapsed")
                }.padding(.leading, 8).foregroundStyle(activeWorkspace == workspace.id ? NativeSidebarStyle.strong : NativeSidebarStyle.ink)
                if expanded.contains(workspace.id) {
                    ForEach(remote.projectCatalog.projects(in: workspace.workspaceID), id: \.self) { project in projectGroup(project, workspace: workspace, remote: remote) }
                    if !remote.supportsProjects { Text(remote.connected ? "Projects require an updated computer." : "Offline · cached workspace").font(.caption).foregroundStyle(.secondary).padding(8) }
                }
            }.background(activeWorkspace == workspace.id ? NativeSidebarStyle.group : NativeTheme.rail, in: RoundedRectangle(cornerRadius: 13))
                .overlay { RoundedRectangle(cornerRadius: 13).strokeBorder(activeWorkspace == workspace.id ? NativeSidebarStyle.activeBorder : NativeSidebarStyle.border, lineWidth: 1) }
                .task(id: remote.connected.description + remote.projectCatalog.revision.string) {
                    guard remote.connected, remote.supportsProjects else { return }
                    for project in remote.projectCatalog.projects(in: workspace.workspaceID) {
                        if let snapshot = try? await remote.request("tabs.get", ["scope": .string("project"), "id": project["id"]]) { resourceRows["project:" + workspace.hostID + ":" + project["id"].string] = snapshot["tabs"].array }
                    }
                }
        }
    }
    private func projectGroup(_ project: JSON, workspace: NativeWorkspaceIdentity, remote: RemoteStore) -> some View {
        let key = workspace.hostID + ":" + project["id"].string
        let scope = "project:" + key
        let items = recents(project, workspace: workspace, remote: remote)
        let selected = activeWorkspace == workspace.id && remote.draft("workspace-selected-project:" + workspace.workspaceID).string == project["id"].string
        return VStack(spacing: 2) {
            HStack(spacing: 6) {
                Button { open(project, workspace: workspace, remote: remote) } label: { HStack(spacing: 7) { NativeSidebarIcon(kind: "folder").foregroundStyle(selected ? NativeTheme.accent : NativeSidebarStyle.muted); Text(project["name"].string).font(.system(size: 14)).lineLimit(2); Spacer(minLength: 0); Text(countLabel(items, scope: scope, remote: remote)).font(.caption2).foregroundStyle(selected ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.muted) }.frame(minHeight: 40).contentShape(Rectangle()) }.accessibilityIdentifier("project-tree-open-" + key)
                Button { if !projectExpanded.insert(key).inserted { projectExpanded.remove(key); limits[key] = nil } } label: { Image(systemName: projectExpanded.contains(key) ? "chevron.down" : "chevron.right").font(.caption).frame(width: 32, height: 40) }.accessibilityLabel((projectExpanded.contains(key) ? "Collapse " : "Expand ") + project["name"].string).accessibilityIdentifier("project-tree-toggle-" + key).accessibilityValue(projectExpanded.contains(key) ? "Expanded" : "Collapsed")
            }.padding(.leading, NativeDesignPreview.enabled ? 9 : 10).foregroundStyle(selected ? NativeSidebarStyle.strong : NativeSidebarStyle.ink)
            if projectExpanded.contains(key) {
                ForEach(Array(items.prefix(limits[key] ?? 7)), id: \.self) { item in
                    let picked = selected && remote.draft("project-navigation:" + project["id"].string)["selected"].string == item["navigationID"].string
                    Button { open(project, workspace: workspace, remote: remote, item: item) } label: {
                        HStack(alignment: .top, spacing: 7) { resourceIcon(item, selected: picked).frame(width: 16); Text(item["title"].string).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading); TimelineView(.periodic(from: .now, by: 60)) { timeline in Text(age(item, now: timeline.date)).foregroundStyle(picked ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.muted).font(.system(size: 10)).fixedSize() } }.font(.caption).padding(.leading, NativeDesignPreview.enabled ? 18 : 10).padding(.trailing, 10).padding(.vertical, 8).foregroundStyle(picked ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.ink).background(picked ? NativeSidebarStyle.selected : .clear, in: RoundedRectangle(cornerRadius: 7)).overlay(alignment: .leading) { if picked { Capsule().fill(NativeTheme.accent).frame(width: 3).padding(.vertical, 5) } }
                    }.accessibilityIdentifier("project-recent-" + item["id"].string).accessibilityValue(picked ? "Active" : "Inactive").accessibilityAddTraits(picked ? .isSelected : [])
                }
                if items.isEmpty { Text(remote.connected ? "No recent items" : "Offline · no cached items").font(.caption).foregroundStyle(.secondary).padding(8) }
                if items.count > (limits[key] ?? 7) { Button("More") { limits[key] = (limits[key] ?? 7) + 4 }.font(.caption).padding(8) }
            }
        }.background(selected && projectExpanded.contains(key) ? NativeSidebarStyle.button : .clear, in: RoundedRectangle(cornerRadius: 10))
            .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(selected && projectExpanded.contains(key) ? NativeSidebarStyle.border : .clear, lineWidth: 1) }.padding(.horizontal, 5)
            .task(id: projectExpanded.contains(key)) {
                guard projectExpanded.contains(key) else { return }
                while !Task.isCancelled { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "project", id: project["id"].string); try? await Task.sleep(for: .seconds(5)) }
            }
    }
    private func recents(_ project: JSON, workspace: NativeWorkspaceIdentity, remote: RemoteStore) -> [JSON] {
        let scope = "project:" + workspace.hostID + ":" + project["id"].string
        var seen = Set<String>()
        let allChats = (remote.state["runs"].array + remote.allRuns + Array(remote.chats.values)).filter { !$0["id"].string.isEmpty && seen.insert($0["id"].string).inserted }
        let chats: [JSON] = allChats.filter { !$0["archived"].bool && $0["archivedAt"].string.isEmpty && remote.projectCatalog.membership(for: $0)["projectId"] == project["id"] }.map { run in var row = run.object; row["type"] = .string("chat"); row["chatId"] = run["id"]; row["navigationID"] = .string("chat:" + run["id"].string); return .object(row) }
        let resources: [JSON] = (shared.workspaceContentDescriptors[scope] ?? resourceRows[scope] ?? []).filter { $0["type"].string != "chat" && !$0["hidden"].bool }.map { tab in var row = tab.object; row["navigationID"] = .string(tab["type"].string == "browser" ? (shared.tabs(in: scope).first { ($0.contentTabId ?? $0.id) == tab["id"].string }?.id ?? "remote:" + tab["id"].string) : "remote:" + tab["id"].string); return .object(row) }
        return (chats + resources).sorted { (NativeProjectActivity.date($0) ?? .distantPast) > (NativeProjectActivity.date($1) ?? .distantPast) }
    }
    private func countLabel(_ items: [JSON], scope: String, remote: RemoteStore) -> String {
        let resources = shared.workspaceContentDescriptors[scope] ?? resourceRows[scope]
        let count = items.filter { $0["type"].string == "chat" }.count + (resources?.filter { $0["type"].string != "chat" }.count ?? 0)
        let complete = remote.allRuns.count >= remote.allRunCount && resources != nil
        return complete ? String(count) : count == 0 ? "—" : "\(count)+"
    }
    @ViewBuilder private func resourceIcon(_ item: JSON, selected: Bool) -> some View {
        if item["type"].string == "browser", item["favicon"].string.hasPrefix("data:image/png;base64,"), item["favicon"].string.count < 200_000,
           let encoded = item["favicon"].string.split(separator: ",", maxSplits: 1).last, let bytes = Data(base64Encoded: String(encoded)), let image = UIImage(data: bytes) {
            Image(uiImage: image).resizable().scaledToFit().frame(width: 16, height: 16)
        } else if NativeDesignPreview.enabled && item["type"].string == "browser" { Text("◎").font(.system(size: 16)).foregroundStyle(selected ? NativeTheme.accent : NativeSidebarStyle.muted) }
        else if NativeDesignPreview.enabled && item["type"].string == "chat" && item["chatType"].string != "internet" { NativeSidebarIcon(kind: "chat").frame(width: 16, height: 16).foregroundStyle(selected ? NativeTheme.accent : NativeSidebarStyle.muted) }
        else { Image(systemName: NativeTabSymbol.name(kind: item["type"].string, chatType: item["chatType"].string, mediaType: item["mediaType"].string)).foregroundStyle(selected ? NativeTheme.accent : NativeSidebarStyle.muted) }
    }
    private func age(_ item: JSON, now: Date) -> String { guard let date = NativeProjectActivity.date(item) else { return "" }; let minutes = max(0, Int(now.timeIntervalSince(date) / 60)); return minutes == 0 ? "<1m" : minutes < 60 ? "\(minutes)m" : minutes < 1440 ? "\(minutes / 60)h" : "\(minutes / 1440)d" }
    private func open(_ project: JSON, workspace: NativeWorkspaceIdentity, remote: RemoteStore, item: JSON = .null) {
        expanded.insert(workspace.id); projectExpanded.insert(workspace.hostID + ":" + project["id"].string)
        remote.setDraft("workspace-selected-project:" + workspace.workspaceID, project["id"])
        if item["type"].string == "chat" { NativeWorkspaceNavigation.openChat(item["chatId"].string, workspaceID: workspace.workspaceID, projectID: project["id"].string, remote: remote) }
        else if item != .null {
            Task {
                let scope = "project:" + workspace.hostID + ":" + project["id"].string
                if item["type"].string == "browser", remote.connected { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "project", id: project["id"].string) }
                let key = "project-navigation:" + project["id"].string
                var navigation = remote.draft(key).object
                navigation["selected"] = item["type"].string == "browser" ? .string(shared.tabs(in: scope).first { ($0.contentTabId ?? $0.id) == item["id"].string }?.id ?? item["navigationID"].string) : item["navigationID"]
                remote.setDraft(key, .object(navigation)); onOpen(workspace)
            }
            return
        }
        onOpen(workspace)
    }
}

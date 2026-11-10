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
                    .modifier(NativePageSwipe(phone: true, blockBack: true, blockForward: lastProject.isEmpty || tabSelected("workspace-navigation:" + workspaceID), forward: { select(lastProject) }, interactive: false))
                    .navigationDestination(isPresented: Binding(get: { !selection.isEmpty }, set: { if !$0 { select("") } })) {
                        NativeSelectedProjectView(workspaceID: workspaceID, onOpenMain: onOpenMain).environment(store).modifier(NativePhoneBackNavigation())
                    }
            } else if !selectedProject.isEmpty, store.projectCatalog.project(id: selectedProject, workspaceID: workspaceID) != nil {
                if !NativePadPreview.enabled { HStack { Button { select("") } label: { Label("Workspace", systemImage: "chevron.left") }; Spacer() }.padding(.horizontal).padding(.vertical, 8) }
                NativeWorkspaceContentView(workspaceID: workspaceID, projectID: selectedProject, onOpenMain: onOpenMain).id(selectedProject)
                    // A project's home swipes back to its workspace; its tabs first return home.
                    .modifier(NativePageSwipe(blockBack: tabSelected("project-navigation:" + selectedProject), blockForward: true, back: { select("") }, backPreview: { NativeScreenMemory.image("workspace:" + workspaceID) }))
            } else {
                NativeWorkspaceContentView(workspaceID: workspaceID, onOpenProject: select, onOpenMain: onOpenMain).id(workspaceID)
                    .modifier(NativePageSwipe(blockBack: true, blockForward: lastProject.isEmpty || tabSelected("workspace-navigation:" + workspaceID), forward: { select(lastProject) }, forwardPreview: { NativeScreenMemory.image("project:" + workspaceID) }))
            }
        }.onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { frame = $0 }
        .onAppear { reconcile() }
        .onChange(of: store.stateValue("workspaceProjects")) { _, _ in reconcile() }
    }
    private func reconcile() {
        guard store.supportsProjects else { return }
        shared.reconcileProjectScopes(catalog: store.projectCatalog, hostID: store.connection?.hostId ?? "")
        if !selection.isEmpty, let project = store.projectCatalog.project(id: selection), project["workspaceId"].string != workspaceID { select("") }
        if !selection.isEmpty, let target = store.projectCatalog.project(id: selection, workspaceID: workspaceID), target["id"].string != selection { select(target["id"].string) }
        let legacy = store.draft("workspace-navigation:" + workspaceID)
        var migrated = Set<String>()
        for chatID in legacy["chats"].array.map(\.string) {
            let run = store.chats[chatID] ?? store.stateValue("runs").array.first { $0["id"].string == chatID } ?? .null
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
    @State private var frame: CGRect = .zero
    private func select(_ id: String) {
        // Remember the screen being left for the interactive swipe that returns to it (iPad).
        if !NativePhonePreview.enabled && id != selection { NativeScreenMemory.remember(selection.isEmpty ? "workspace:" + workspaceID : "project:" + workspaceID, frame: frame) }
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
        Task { defer { busy = false }; do { var args = values; args["workspaceId"] = .string(workspaceID); if args["expectedRevision"] == nil { args["expectedRevision"] = store.stateValue("workspaceProjects")["revision"] }; _ = try await store.updateProjects(args); if dismissEditor { showEditor = false } } catch { failure = error.localizedDescription } }
    }
}

struct NativeSourceLibraryView: View {
    @Environment(RemoteStore.self) var store
    @State private var path = ""
    @State private var failure = ""
    @State private var busy = false
    private var sources: [JSON] { store.stateValue("workspaceProjects")["sourceLibrary"].array.filter { $0["removedAt"].string.isEmpty } }
    var body: some View {
        NativeList {
            Section("Source library · " + store.displayName) {
                Text("Register folders on this computer, then choose how their sources load in each workspace’s Configuration. Registration grants no folder access.").font(.caption).foregroundStyle(.secondary)
                if !store.connected { Text("Offline · cached sources").foregroundStyle(.orange) }
                if !failure.isEmpty { Text(failure).foregroundStyle(.orange) }
                if store.stateValue("capabilities").array.contains(.string("source-library.v1")) {
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
    private func mutate(_ values: [String: JSON]) { busy = true; failure = ""; Task { defer { busy = false }; do { var args = values; args["expectedRevision"] = store.stateValue("workspaceProjects")["revision"]; _ = try await store.updateSources(args); path = "" } catch { failure = error.localizedDescription } } }
}

// Project recents are history shortcuts; open-tab navigation stays in the strip/overview.
struct NativeWorkspaceTree: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var shared: SharedAppStore
    var activeWorkspace: String?
    var onOpen: (NativeWorkspaceIdentity) -> Void
    var onBrowse: (() -> Void)? = nil
    @State private var limits: [String: Int] = [:]
    @State private var resourceRows: [String: [JSON]] = [:]
    private var workspaces: [NativeWorkspaceIdentity] { NativeWorkspaceIdentity.all(destinations) }
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                if let onBrowse { Button(action: onBrowse) { Label("Workspaces", systemImage: "square.grid.2x2").frame(minHeight: 44) } }
                else { Text("Workspaces").font(.caption).foregroundStyle(.secondary) }
                Spacer()
                Button { shared.sidebarWorkspaces.removeAll(); shared.sidebarProjects.removeAll(); limits.removeAll(); shared.sidebarOtherComputers = false } label: { NativeSidebarIcon(kind: "collapse").frame(width: 44, height: 44) }.accessibilityLabel("Collapse all workspaces")
            }.padding(.horizontal, 8)
            Divider()
            ForEach(workspaces.filter { $0.hostID == destinations.selectedID }) { workspace in workspaceRow(workspace) }
            if destinations.destinations.contains(where: { $0.id != destinations.selectedID }) {
                Divider()
                Button { shared.sidebarOtherComputers.toggle() } label: { HStack { Text("Other Computers"); Spacer(); Image(systemName: shared.sidebarOtherComputers ? "chevron.down" : "chevron.right") }.font(.subheadline).padding(8) }.accessibilityIdentifier("other-computers-expander")
                if shared.sidebarOtherComputers {
                    ForEach(destinations.destinations.filter { $0.id != destinations.selectedID }) { computer in
                        Text(computer.label).font(.caption).foregroundStyle(.secondary)
                        ForEach(workspaces.filter { $0.hostID == computer.id }) { workspace in workspaceRow(workspace) }
                    }
                }
            }
        }.buttonStyle(.plain).foregroundStyle(NativeSidebarStyle.ink)
    }
    @ViewBuilder private func workspaceRow(_ workspace: NativeWorkspaceIdentity) -> some View {
        if let remote = destinations.remote(for: workspace.hostID) {
            VStack(spacing: 2) {
                HStack(spacing: 6) {
                    Button { shared.sidebarWorkspaces.insert(workspace.id); onOpen(workspace) } label: {
                        HStack(spacing: 7) {
                            NativeSidebarIcon(kind: "workspace")
                            Text(workspace.profile["name"].string).font(.system(size: 14, weight: .medium)).lineLimit(2)
                            Spacer(minLength: 2)
                            if !remote.connected { Text("Offline").font(.caption2).foregroundStyle(.secondary) }
                            else { Text(String(remote.projectCatalog.projects(in: workspace.workspaceID).count)).font(.caption2).foregroundStyle(.secondary) }
                        }.frame(minHeight: 40).contentShape(Rectangle())
                    }.accessibilityIdentifier("workspace-tree-open-" + workspace.id)
                    Button { if !shared.sidebarWorkspaces.insert(workspace.id).inserted { shared.sidebarWorkspaces.remove(workspace.id) } } label: {
                        Image(systemName: shared.sidebarWorkspaces.contains(workspace.id) ? "chevron.down" : "chevron.right").font(.caption).frame(width: 32, height: 40)
                    }.accessibilityLabel((shared.sidebarWorkspaces.contains(workspace.id) ? "Collapse " : "Expand ") + workspace.profile["name"].string).accessibilityIdentifier("workspace-tree-toggle-" + workspace.id).accessibilityValue(shared.sidebarWorkspaces.contains(workspace.id) ? "Expanded" : "Collapsed")
                }.padding(.leading, 8)
                if shared.sidebarWorkspaces.contains(workspace.id) {
                    ForEach(remote.projectCatalog.projects(in: workspace.workspaceID), id: \.self) { project in
                        projectGroup(project, workspace: workspace, remote: remote)
                    }
                }
            }.background(activeWorkspace == workspace.id ? NativeSidebarStyle.group : NativeTheme.rail, in: RoundedRectangle(cornerRadius: 13))
            .task(id: String(shared.sidebarWorkspaces.contains(workspace.id)) + remote.connected.description + remote.projectCatalog.revision.string) {
                guard shared.sidebarWorkspaces.contains(workspace.id), remote.connected, remote.supportsProjects else { return }
                if remote.allRuns.isEmpty { await remote.loadAllRuns() }
                while remote.allRuns.count < remote.allRunCount && !Task.isCancelled {
                    let before = remote.allRuns.count; await remote.loadAllRuns()
                    if remote.allRuns.count == before { break }
                }
                for project in remote.projectCatalog.projects(in: workspace.workspaceID) {
                    guard !Task.isCancelled else { return }
                    let scope = "project:" + workspace.hostID + ":" + project["id"].string
                    await shared.refreshContentTabs(scope: scope, remote: remote, kind: "project", id: project["id"].string)
                    let snapshot = shared.contentTabSnapshot(in: scope)
                    if snapshot != .null { resourceRows[scope] = snapshot["tabs"].array }
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
                Button { open(project, workspace: workspace, remote: remote) } label: { HStack(spacing: 7) { NativeSidebarIcon(kind: "folder").foregroundStyle(selected ? NativeTheme.accent : NativeSidebarStyle.muted); Text(project["name"].string).font(.system(size: 14)).lineLimit(2); Spacer(minLength: 0); Text(countLabel(items, scope: scope, remote: remote)).accessibilityIdentifier("project-tree-count-" + key).font(.caption2).foregroundStyle(selected ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.muted) }.frame(minHeight: 40).contentShape(Rectangle()) }.accessibilityIdentifier("project-tree-open-" + key)
                Button { if !shared.sidebarProjects.insert(key).inserted { shared.sidebarProjects.remove(key); limits[key] = nil } } label: { Image(systemName: shared.sidebarProjects.contains(key) ? "chevron.down" : "chevron.right").font(.caption).frame(width: 32, height: 40) }.accessibilityLabel((shared.sidebarProjects.contains(key) ? "Collapse " : "Expand ") + project["name"].string).accessibilityIdentifier("project-tree-toggle-" + key).accessibilityValue(shared.sidebarProjects.contains(key) ? "Expanded" : "Collapsed")
            }.padding(.leading, NativeDesignPreview.enabled ? 9 : 10).foregroundStyle(selected ? NativeSidebarStyle.strong : NativeSidebarStyle.ink)
            if shared.sidebarProjects.contains(key) {
                ForEach(Array(items.prefix(limits[key] ?? 7)), id: \.self) { item in
                    let picked = selected && remote.draft("project-navigation:" + project["id"].string)["selected"].string == item["navigationID"].string
                    Button { open(project, workspace: workspace, remote: remote, item: item) } label: {
                        HStack(alignment: .top, spacing: 7) { resourceIcon(item, selected: picked).frame(width: 16); Text(item["title"].string + (item["hidden"].bool ? " · Hidden" : "")).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading); TimelineView(.periodic(from: .now, by: 60)) { timeline in Text(age(item, now: timeline.date)).foregroundStyle(picked ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.muted).font(.system(size: 10)).fixedSize() } }.font(.caption).padding(.leading, NativeDesignPreview.enabled ? 18 : 10).padding(.trailing, 10).padding(.vertical, 8).foregroundStyle(picked ? NativeSidebarStyle.selectedInk : NativeSidebarStyle.ink).background(picked ? NativeSidebarStyle.selected : .clear, in: RoundedRectangle(cornerRadius: 7)).overlay(alignment: .leading) { if picked { Capsule().fill(NativeTheme.accent).frame(width: 3).padding(.vertical, 5) } }
                    }.disabled(item["hidden"].bool && !remote.connected).accessibilityIdentifier("project-recent-" + item["id"].string).accessibilityValue(picked ? "Active" : "Inactive").accessibilityAddTraits(picked ? .isSelected : [])
                }
                if items.isEmpty { Text(remote.connected ? "No recent items" : "Offline · no cached items").font(.caption).foregroundStyle(.secondary).padding(8) }
                if items.count > (limits[key] ?? 7) { Button("More") { limits[key] = (limits[key] ?? 7) + 4 }.font(.caption).padding(8) }
            }
        }.background(selected && shared.sidebarProjects.contains(key) ? NativeSidebarStyle.button : .clear, in: RoundedRectangle(cornerRadius: 10))
            .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(selected && shared.sidebarProjects.contains(key) ? NativeSidebarStyle.border : .clear, lineWidth: 1) }.padding(.horizontal, 5)

    }
    private func recents(_ project: JSON, workspace: NativeWorkspaceIdentity, remote: RemoteStore) -> [JSON] {
        let scope = "project:" + workspace.hostID + ":" + project["id"].string
        let rows = shared.workspaceContentDescriptors[scope] ?? resourceRows[scope] ?? []
        // The Release trace showed tabs(in:) inside this per-resource map.
        // Resolve aliases once, preserving the same first descriptor per owner ID.
        let browserIDs = Dictionary(shared.tabs(in: scope).map { ($0.contentTabId ?? $0.id, $0.id) }, uniquingKeysWith: { first, _ in first })
        let chats = remote.sidebarRunState["runs"].array.filter { run in
            let member = remote.projectCatalog.membership(for: run)
            return member["workspaceId"].string == workspace.workspaceID && member["projectId"].string == project["id"].string
        }
        return NativeProjectActivity.items(tabs: rows, chats: chats, browserIDs: browserIDs)
    }

    private func countLabel(_ items: [JSON], scope: String, remote: RemoteStore) -> String {
        String(items.count)
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
        shared.sidebarWorkspaces.insert(workspace.id); shared.sidebarProjects.insert(workspace.hostID + ":" + project["id"].string)
        remote.setDraft("workspace-selected-project:" + workspace.workspaceID, project["id"])
        if item["type"].string == "chat" && !item["hidden"].bool { NativeWorkspaceNavigation.openChat(item["chatId"].string, workspaceID: workspace.workspaceID, projectID: project["id"].string, remote: remote, shared: shared) }
        else if item != .null {
            Task {
                let scope = "project:" + workspace.hostID + ":" + project["id"].string
                if item["hidden"].bool {
                    guard remote.connected else { return }
                    shared.queueContentOperations([.object(["action": .string("visibility"), "id": item["id"], "hidden": .bool(false)])], scope: scope, remote: remote, kind: "project", id: project["id"].string)
                    await shared.refreshContentTabs(scope: scope, remote: remote, kind: "project", id: project["id"].string)
                    guard !shared.hasPendingContent(in: scope) else { remote.error = "Tab restoration is unconfirmed. Reconnect before opening it again."; return }
                }
                if item["type"].string == "chat" {
                    NativeWorkspaceNavigation.openChat(item["chatId"].string, workspaceID: workspace.workspaceID, projectID: project["id"].string, remote: remote, shared: shared)
                    onOpen(workspace); return
                }
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

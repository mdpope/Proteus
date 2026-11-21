import SwiftUI
import CryptoKit

/// A feature master and its records use the same content strip as auxiliary
/// browsers/files. Resources keep ordinary pairing, profiles and file grants.
struct NativeFeatureWorkspace<Master: View, Detail: View>: View {
    @EnvironmentObject private var shared: SharedAppStore
    @EnvironmentObject private var destinations: DestinationStore
    @EnvironmentObject private var life: LifeStore
    @EnvironmentObject private var phoneChrome: NativePhoneChrome
    @Environment(\.nativePhoneAreaActive) private var areaActive
    let title: String
    let symbol: String
    let namespace: String
    var scopeOverride: String? = nil
    var pinnedRecordIDs: Set<String> = []
    var registersFeatureOverview = true
    var scratchOwnerID: String? = nil
    let records: [NativeContentTab]
    @Binding var selected: String
    let selectRecord: (String) -> Void
    let closeRecord: (String) -> Void
    var addRecord: (() -> Void)? = nil
    @ViewBuilder let master: () -> Master
    @ViewBuilder let detail: (String) -> Detail
    @State private var files = false
    @State private var documents: [JSON] = []
    @State private var order: [String] = []
    @State private var previousSelection = "master"
    @State private var resourceError = ""
    @State private var renameBrowserID: String?
    @State private var renameTitle = ""
    private var digest: String { SHA256.hash(data: Data(namespace.utf8)).map { String(format: "%02x", $0) }.joined() }
    private var scope: String { scopeOverride ?? "feature:" + (destinations.selectedID ?? "offline") + ":" + digest }
    private var storageKey: String { "proteus.feature-tabs." + scope + (scopeOverride == nil ? "" : ":" + digest) }
    private var overviewGroup: String { (registersFeatureOverview ? "feature:" : "project-resource:") + namespace }
    private var browsers: [BrowserDescriptor] { shared.tabs(in: scope).filter { !$0.hidden } }
    private var children: [NativeContentTab] {
        let items = records + browsers.map { NativeContentTab(id: $0.id, title: shared.browserLabel($0), kind: "browser", hostID: $0.ownerHostId) } + documents.filter { $0["kind"].string != "reminder" || $0["accountID"].string == life.accountIdentity }.map { NativeContentTab(id: $0["tabID"].string, title: $0["title"].string, kind: $0["kind"].string.isEmpty ? "document" : $0["kind"].string, hostID: $0["hostID"].string) }
        return order.compactMap { id in items.first { $0.id == id } } + items.filter { !order.contains($0.id) }
    }
    var body: some View {
        VStack(spacing: 0) {
            if !resourceError.isEmpty { Text(resourceError).font(.callout).foregroundStyle(.secondary).padding(8) }
            if areaActive {
            NativeFeatureStrip(sidebar: registersFeatureOverview, add: { addBrowser() }, addIdentifier: title == "Team Tools" ? "team-new-browser-tab" : "feature-new-tab-" + digest, ids: ["master"] + children.map(\.id), selection: selected) {
                    HStack(spacing: 0) {
                        NativeFeatureTab(title: title, symbol: symbol, identifier: title == "Team Tools" ? "team-section-overview" : nil, selected: selected == "master", action: { choose("master") }).id("master")
                        ForEach(children) { tab in
                            NativeFeatureTab(title: tab.title, symbol: tab.kind == "scratch" ? "note.text" : tab.kind == "reminder" ? "checklist" : NativeTabSymbol.name(kind: tab.kind), icon: tab.kind == "browser" ? shared.browserFavicon(tab.id) : nil, identifier: title == "Team Tools" ? tab.kind == "browser" ? "browser-tab-select-" + tab.id : tab.id == "Standup" ? "team-section-standup" : nil : nil, selected: selected == tab.id, action: { choose(tab.id) }, close: pinnedRecordIDs.contains(tab.id) ? nil : { close(tab.id) })
                                .id(tab.id)
                                .contextMenu {
                                    if tab.kind == "browser" {
                                        NativeBrowserDuplicateActions(id: tab.id)
                                        Button("Rename tab", systemImage: "pencil") { renameBrowserID = tab.id; renameTitle = tab.title }
                                        Button("Unload tab", systemImage: "pause.circle") { shared.unload(tab.id) }
                                        if let browser = browsers.first(where: { $0.id == tab.id }), !browser.incognito { Button(browser.persist ? "Do not persist tab" : "Persist tab", systemImage: "pin") { shared.persistBrowser(tab.id, enabled: !browser.persist) } }
                                    }
                                    Button("Move left", systemImage: "arrow.left") { shift(tab.id, by: -1) }
                                    Button("Move right", systemImage: "arrow.right") { shift(tab.id, by: 1) }
                                    if !pinnedRecordIDs.contains(tab.id) { Button("Close tab", systemImage: "xmark") { close(tab.id) } }
                                    Button("Close other tabs") { for other in children where other.id != tab.id && !pinnedRecordIDs.contains(other.id) { close(other.id) } }
                                }
                        }
                    }
                }
                .accessibilityElement(children: .contain).accessibilityIdentifier(title.lowercased() + "-navigation-tabs")
            }
            if areaActive, let browser = browsers.first(where: { $0.id == selected }) {
                TeamBrowserView(scope: scope, showTabs: false, tabID: browser.id, featureChrome: true, onBackToList: { choose("master") }, newTabOptions: [NativeNewTabAction(title: "Reminders", symbol: "checklist", run: addReminder), NativeNewTabAction(title: "Scratch", symbol: "note.text", replacesBlank: false, run: addScratch), NativeNewTabAction(title: "Workspace files", symbol: "folder", replacesBlank: false, run: openWorkspaceFiles), NativeNewTabAction(title: "Markdown or other file", symbol: "doc.text", replacesBlank: false, run: { files = true })])
            } else if areaActive, let resource = documents.first(where: { $0["tabID"].string == selected }), resource["kind"].string == "reminder", resource["accountID"].string == life.accountIdentity {
                LifeReminderWorkbenchView(workspace: reminderWorkspace(selected), selectedRecord: { row in updateResource(selected, title: row["title"].string) }).id(selected)
            } else if areaActive, let resource = documents.first(where: { $0["tabID"].string == selected }), resource["kind"].string == "scratch" {
                ScratchpadResourceTab(id: selected, reference: resource, changed: { row in updateReference(row) }).id(selected)
            } else if areaActive, let document = documents.first(where: { $0["tabID"].string == selected }), let remote = destinations.remote(for: document["hostID"].string) {
                NativeFileBrowser(workspaceID: document["workspaceId"].string, initialFile: document["kind"].string == "files" ? nil : document, onOpenFile: openFile).environment(remote).id(selected)
            } else if selected == "master" { master() }
            else { detail(selected) }
        }.background(NativeTheme.background).accessibilityHidden(!areaActive)
        .environment(\.nativeOpenFeatureResource, { row in
            let id = row["tabID"].string; guard !id.isEmpty else { return }
            if !documents.contains(where: { $0["tabID"].string == id }) { documents.append(row) }
            selected = id; save()
        })
        .alert("Rename tab", isPresented: Binding(get: { renameBrowserID != nil }, set: { if !$0 { renameBrowserID = nil } })) {
            TextField("Tab name", text: $renameTitle)
            Button("Save") { if let id = renameBrowserID { shared.renameBrowser(id, title: renameTitle) }; renameBrowserID = nil }
            Button("Cancel", role: .cancel) { renameBrowserID = nil }
        }
        .sheet(isPresented: $files) { NavigationStack {
            if let remote = destinations.selected {
                NativeFeatureFilePicker { reference in openFile(reference); files = false }.environment(remote)
            } else { ContentUnavailableView("Connect a computer", systemImage: "network") }
        } }
        .task(id: storageKey) { restore(); syncOverview() }
        .onChange(of: children.map { $0.id + "|" + $0.title }) { _, _ in if areaActive { reconcileOrder(children.map(\.id), after: previousSelection) }; syncOverview() }
        .onChange(of: selected) { old, next in if areaActive { reconcileOrder(children.map(\.id), after: old); previousSelection = next; save() }; syncOverview() }
        .onChange(of: areaActive) { _, active in if active { reconcileOrder(children.map(\.id), after: selected); syncOverview() } }
        .onChange(of: life.accountIdentity) { _, _ in syncOverview() }
        .onDisappear { phoneChrome.removeFeatureTabs(overviewGroup) }
        // Browser close/profile callbacks can arrive after a New Tab tile has
        // selected a record. A stale browser selection must not steal that view.
        .onChange(of: shared.selected(in: scope)) { _, id in
            if let id, browsers.contains(where: { $0.id == selected }), browsers.contains(where: { $0.id == id }) { selected = id }
        }
    }
    private func choose(_ id: String) { phoneChrome.captureCurrent(); selected = id; if browsers.contains(where: { $0.id == id }) { shared.select(id, in: scope) } else if id == "master" || records.contains(where: { $0.id == id }) { selectRecord(id) } }
    private func syncOverview() {
        let group = overviewGroup
        let master = NativePhoneTab(id: "resource:" + scope + ":master", title: title, symbol: symbol, detail: "Overview", section: title, sectionID: group, preview: nil, select: { if registersFeatureOverview { phoneChrome.activateArea?(title == "Team Tools" ? "Team" : title) }; choose("master") })
        let items = [master] + children.map { tab in
            let browser = browsers.first { $0.id == tab.id }
            return NativePhoneTab(id: browser == nil ? "resource:" + scope + ":" + tab.id : "browser:" + tab.id, title: tab.title, symbol: browser?.incognito == true ? "eye.slash" : NativeTabSymbol.name(kind: tab.kind), detail: title, section: title, sectionID: group, preview: browser == nil ? nil : shared.browserPreview(tab.id), select: { if registersFeatureOverview { phoneChrome.activateArea?(title == "Team Tools" ? "Team" : title) }; choose(tab.id) }, close: pinnedRecordIDs.contains(tab.id) ? nil : { close(tab.id) }, browserID: browser == nil ? nil : tab.id)
        }
        let id = browsers.contains(where: { $0.id == selected }) ? "browser:" + selected : "resource:" + scope + ":" + selected
        phoneChrome.replaceFeatureTabs(group, items: items, current: areaActive ? id : nil)
    }
    private func reminderWorkspace(_ id: String) -> LifeReminderWorkspace {
        let key = namespace + ":" + id
        if let value = life.reminderWorkspace.workbenches[key] { return value }
        let value = LifeReminderWorkspace(); life.reminderWorkspace.workbenches[key] = value; return value
    }
    private func updateReference(_ row: JSON) { if let index = documents.firstIndex(where: { $0["tabID"] == row["tabID"] }) { documents[index] = row; save() } }
    private func updateResource(_ id: String, title: String) { guard let index = documents.firstIndex(where: { $0["tabID"].string == id }) else { return }; var row = documents[index].object; row["title"] = .string(title); documents[index] = .object(row); save() }
    private func addReminder() {
        if title == "Reminders", let addRecord { addRecord(); return }
        guard life.credential?.appAuthorized == true || ProcessInfo.processInfo.arguments.contains("--synthetic-life") else { resourceError = "Sign in to Life to use Reminders."; return }
        let id = "reminder:" + UUID().uuidString
        documents.append(.object(["tabID": .string(id), "kind": .string("reminder"), "title": .string("Reminders"), "accountID": .string(life.accountIdentity)]))
        selected = id; save()
    }
    private func addScratch() {
        if title == "Scratchpad", let addRecord { addRecord(); return }
        guard let host = scratchOwnerID ?? destinations.selectedID, let remote = destinations.remote(for: host) else { resourceError = "Connect the Scratchpad owner first."; return }
        Task { @MainActor in
            do {
                let status = try await remote.request("scratchpad.command", ["action": .string("status")])
                guard status["configured"].bool, !status["rootId"].string.isEmpty else { resourceError = "Configure Scratchpad on its owner first."; return }
                let operation = UUID().uuidString, id = "scratch:" + operation
                documents.append(.object(["tabID": .string(id), "kind": .string("scratch"), "title": .string("Scratch"), "hostID": .string(host), "rootID": status["rootId"], "operationID": .string(operation)]))
                selected = id; save()
            } catch { resourceError = error.localizedDescription }
        }
    }
    private func close(_ id: String) {
        guard !pinnedRecordIDs.contains(id) else { return }
        if browsers.contains(where: { $0.id == id }) { shared.close(id) }
        else if documents.contains(where: { $0["tabID"].string == id }) { documents.removeAll { $0["tabID"].string == id } }
        else { closeRecord(id) }
        order.removeAll { $0 == id }; if selected == id { choose("master") }; save()
    }
    private func addBrowser(profile: String = "default", incognito: Bool = false) { if let id = shared.open(nil, scope: scope, profileId: profile, afterSourceID: selected, incognito: incognito) { selected = id } }
    private func reconcileOrder(_ ids: [String], after anchor: String) {
        var next = order.filter(ids.contains)
        for id in ids where !next.contains(id) { next.append(id) }
        if order != next { order = next; save() }
    }
    private func shift(_ id: String, by offset: Int) {
        var ids = children.map(\.id)
        guard let index = ids.firstIndex(of: id), ids.indices.contains(index + offset) else { return }
        ids.swapAt(index, index + offset); order = ids; save()
    }
    private func openFile(_ reference: JSON) {
        guard let host = destinations.selectedID else { return }
        var value = reference.object; value["hostID"] = .string(host)
        let identity = host + "|" + reference["workspaceId"].string + "|" + reference["rootId"].string + "|" + reference["file"].string
        let id = "file:" + SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
        value["tabID"] = .string(id)
        if !documents.contains(where: { $0["tabID"].string == id }) { documents.append(.object(value)) }
        selected = id; save()
    }
    private func openWorkspaceFiles() {
        guard let host = destinations.selectedID, let remote = destinations.selected else { return }
        let workspace = remote.stateValue("context")["defaultWorkspaceId"].string
        guard !workspace.isEmpty else { return }
        let id = "files:" + UUID().uuidString
        documents.append(.object(["tabID": .string(id), "kind": .string("files"), "title": .string("Workspace files"), "hostID": .string(host), "workspaceId": .string(workspace)]))
        selected = id; save()
    }
    private func save() {
        let privateIDs = Set(browsers.filter(\.incognito).map(\.id))
        // Only scoped references are retained. Contents and private browser
        // metadata are never copied into this presentation index.
        let value: JSON = .object(["order": .array(order.filter { !privateIDs.contains($0) }.map(JSON.string)), "documents": .array(documents), "selected": .string(privateIDs.contains(selected) ? "master" : selected)])
        if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: storageKey) }
    }
    private func restore() {
        documents = []; order = []
        guard let data = UserDefaults.standard.data(forKey: storageKey), data.count < 1_048_576, let value = try? JSONDecoder().decode(JSON.self, from: data) else { return }
        documents = value["documents"].array; order = value["order"].array.map(\.string)
        let restored = value["selected"].string
        if selected == "master", children.contains(where: { $0.id == restored }) { selected = restored }
    }
}

struct NativeFeatureTab: View {
    let title: String
    let symbol: String
    var icon: UIImage? = nil
    var identifier: String? = nil
    let selected: Bool
    let action: () -> Void
    var close: (() -> Void)? = nil
    var body: some View {
        HStack(spacing: 0) {
            Button(action: action) { NativeContentTabLabel(title: title, symbol: symbol, icon: icon).accessibilityHidden(true).frame(maxWidth: 220).padding(.leading, 12).padding(.trailing, close == nil ? 12 : 4).frame(height: 44).nativeTabHover() }.accessibilityElement(children: .ignore).accessibilityAddTraits(.isButton).accessibilityLabel(title).accessibilityValue(selected ? "Selected" : "").accessibilityIdentifier(identifier ?? "")
            if let close { Button(action: close) { Image(systemName: "xmark").font(.caption2).frame(width: 32, height: 44).nativeTabHover() }.accessibilityLabel("Close " + title) }
            Rectangle().fill(NativeTheme.line).frame(width: 1, height: 24)
        }.buttonStyle(.plain).background(selected ? NativeTheme.surface : .clear).overlay(alignment: .bottom) { Rectangle().fill(selected ? NativeTheme.accent : .clear).frame(height: 2) }
    }
}

/// The same resource views also work at the application root, without adding
/// membership to a feature area or presenting another nested tab strip.
struct NativeStandaloneResourceTab: View {
    @EnvironmentObject private var life: LifeStore
    @EnvironmentObject private var destinations: DestinationStore
    @EnvironmentObject private var chrome: NativePhoneChrome
    let tab: NativeContentTab
    let changed: (JSON) -> Void
    let select: () -> Void
    var body: some View {
        Group {
            if tab.kind == "reminder" {
                if tab.resource?["accountID"].string == life.accountIdentity {
                    LifeReminderWorkbenchView(workspace: reminders, selectedRecord: { row in var value = (tab.resource ?? .null).object; value["title"] = row["title"]; changed(.object(value)) })
                } else { ContentUnavailableView("Life account changed", systemImage: "person.crop.circle", description: Text("Sign in to the Life account that owns this reminder tab.")) }
            } else if tab.kind == "scratch" {
                ScratchpadResourceTab(id: tab.id, reference: tab.resource ?? .null, changed: changed)
            } else if let host = tab.hostID, let remote = destinations.remote(for: host) {
                NativeFileBrowser(workspaceID: tab.resource?["workspaceId"].string ?? "").environment(remote)
            } else { ContentUnavailableView("Reconnect its computer", systemImage: "network") }
        }.onAppear {
            chrome.register(NativePhoneTab(id: "resource:" + tab.id, title: tab.title, symbol: NativeTabSymbol.name(kind: tab.kind), detail: "App tab", preview: nil, select: select))
        }
    }
    private var reminders: LifeReminderWorkspace {
        let key = "root:" + tab.id
        if let value = life.reminderWorkspace.workbenches[key] { return value }
        let value = LifeReminderWorkspace(); life.reminderWorkspace.workbenches[key] = value; return value
    }
}

private struct NativeFeatureFilePicker: View {
    @Environment(RemoteStore.self) private var remote
    @Environment(\.dismiss) private var dismiss
    let open: (JSON) -> Void
    @State private var workspace = ""
    var body: some View {
        VStack(spacing: 0) {
            Picker("Workspace", selection: $workspace) { ForEach(remote.stateValue("context")["workspaces"].array, id: \.self) { row in Text(row["name"].string).tag(row["id"].string) } }.padding(12)
            if !workspace.isEmpty { NativeFileBrowser(workspaceID: workspace, onOpenFile: open, picksFile: true).id(workspace) }
        }.navigationTitle("Files on " + remote.displayName).toolbar { Button("Cancel") { dismiss() } }
        .task { workspace = remote.stateValue("context")["defaultWorkspaceId"].string }
    }
}

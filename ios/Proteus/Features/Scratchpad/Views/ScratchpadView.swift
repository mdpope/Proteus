import SwiftUI
import WebKit

struct ScratchpadView: View {
    @EnvironmentObject private var destinations: DestinationStore
    var owner: RemoteStore? = nil
    var projectID: String? = nil
    /// A workspace page lists every scratch in the workspace, including all its projects.
    var workspaceID: String? = nil
    var body: some View {
        VStack(spacing: 0) {
        if let remote = owner ?? destinations.remote(for: destinations.scratchpadOwnerID ?? destinations.selectedID ?? "") {
            ScratchpadContent(remote: remote, workspace: remote.scratchpad, projectID: projectID, workspaceID: workspaceID, showComputers: owner == nil).id((remote.connection?.hostId ?? "") + ":" + (projectID ?? workspaceID ?? "all"))
        }
        else { ContentUnavailableView("Connect a computer", systemImage: "network", description: Text("Choose the computer that stores your Scratchpad above.")) }
        }
    }
}
/// One scratch in a list. The feature page opens it as a tab (from any computer); a workspace or
/// project page opens it as one of that page's own tabs.
private struct ScratchRow: View {
    let row: JSON
    let hostID: String
    let rootID: String
    let embedded: Bool
    @Environment(\.nativeOpenFeatureResource) private var openFeature
    @Environment(\.nativeOpenScratchTab) private var openScratch
    var body: some View {
        Button {
            let reference: JSON = .object(["tabID": .string("scratch:" + hostID + ":" + row["id"].string), "kind": .string("scratch"), "title": row["title"], "hostID": .string(hostID), "rootID": .string(rootID), "scratchID": row["id"]])
            if embedded { openScratch?(reference) } else { openFeature?(reference) }
        } label: {
            VStack(alignment: .leading, spacing: 5) { Text(row["title"].string).foregroundStyle(.primary); Text([row["category"].string, row["format"].string].filter { !$0.isEmpty }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary) }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
        }.buttonStyle(.borderless)
    }
}
struct ScratchpadOwnerPicker: View {
    @EnvironmentObject private var destinations: DestinationStore
    var menu = false
    private var selected: String { destinations.scratchpadOwnerID ?? destinations.selectedID ?? "" }
    private func select(_ id: String) { destinations.scratchpadOwnerID = id; destinations.activateVisibleOwner(id) }
    var body: some View {
        if menu {
            Picker("Computer", selection: Binding(get: { selected }, set: select)) { ForEach(destinations.destinations) { Text($0.label).tag($0.id) } }.accessibilityIdentifier("scratchpad-computer")
        } else {
            ScrollView(.horizontal) { HStack(spacing: 6) { ForEach(destinations.destinations) { host in Button { select(host.id) } label: { Label(host.label, systemImage: "desktopcomputer").font(.callout).padding(.horizontal, 10).padding(.vertical, 7).background(selected == host.id ? NativeTheme.accent.opacity(0.2) : NativeTheme.surface, in: RoundedRectangle(cornerRadius: 7)) }.buttonStyle(.plain).accessibilityValue(selected == host.id ? "Selected" : "") } } }.accessibilityIdentifier("scratchpad-computers")
        }
    }
}
struct ScratchpadSidebarRecents<Row: View>: View {
    @EnvironmentObject private var destinations: DestinationStore
    let row: Row
    var onOpen: () -> Void
    @State private var limit = 7
    @State private var recentByOwner: [String: [JSON]] = [:]
    private struct Recent: Identifiable {
        let host: HostDestination
        let row: JSON
        var id: String { host.id + ":" + row["id"].string }
    }
    private var owners: [HostDestination] {
        destinations.destinations.filter { destinations.remote(for: $0.id)?.connected == true }
    }
    private var recents: [Recent] {
        owners.flatMap { host in (recentByOwner[host.id] ?? []).map { Recent(host: host, row: $0) } }
            .enumerated().sorted {
                let left = $0.element.row["visitedAt"].string, right = $1.element.row["visitedAt"].string
                return left == right ? $0.offset < $1.offset : left > right
            }.map(\.element)
    }
    var body: some View {
        row.background {
            ZStack {
                ForEach(owners) { owner in
                    if let remote = destinations.remote(for: owner.id) {
                        Color.clear
                            .task { recentByOwner[owner.id] = await remote.scratchpad.sidebarRecents(remote) }
                            .onReceive(remote.scratchpad.$recents) { rows in
                                if !rows.isEmpty || recentByOwner[owner.id] == nil { recentByOwner[owner.id] = rows }
                            }
                    }
                }
            }.allowsHitTesting(false).accessibilityHidden(true)
        }
        ForEach(Array(recents.prefix(limit))) { item in
            Button {
                guard let remote = destinations.remote(for: item.host.id), remote.connected else { return }
                destinations.scratchpadOwnerID = item.host.id
                destinations.activateVisibleOwner(item.host.id)
                Task {
                    if !remote.scratchpad.ready { await remote.scratchpad.connect(remote) }
                    await remote.scratchpad.open(item.row["id"].string)
                    onOpen()
                }
            } label: {
                VStack(alignment: .leading, spacing: 3) {
                    Label(item.row["title"].string, systemImage: "note.text").lineLimit(2)
                    Text(item.host.label).foregroundStyle(.secondary)
                }.font(.caption)
            }.padding(.leading).listRowBackground(Color.clear)
        }
        if recents.count > limit { Button("More…") { limit += 4 }.font(.caption).padding(.leading).listRowBackground(Color.clear) }
    }
}
struct LifeReminderSidebarRecents: View {
    @EnvironmentObject private var life: LifeStore
    var onOpen: () -> Void
    @State private var limit = 7
    var body: some View {
        ForEach(Array(life.reminderRecents.prefix(limit)), id: \.self) { row in Button { Task { do { let value = try await life.data(section: "reminders", query: ["id": row["id"]]); life.reminderWorkspace.openResource(value["record"]); onOpen() } catch { life.error = error.localizedDescription } } } label: { Label(row["title"].string, systemImage: "checklist").font(.caption).lineLimit(2) }.padding(.leading).listRowBackground(Color.clear) }
        if life.reminderRecents.count > limit { Button("More…") { limit += 4 }.font(.caption).padding(.leading).listRowBackground(Color.clear) }
    }
}
private struct ScratchpadContent: View {
    let remote: RemoteStore
    @ObservedObject var workspace: ScratchpadWorkspace
    var projectID: String?
    var workspaceID: String? = nil
    var showComputers = true
    @Environment(\.scenePhase) private var scenePhase
    private var embedded: Bool { projectID != nil || workspaceID != nil }
    var body: some View {
        if embedded { embeddedBody } else { featureBody }
    }
    /// A workspace/project page shows only the list; opening a scratch adds a tab to that page.
    private var embeddedBody: some View {
        VStack(spacing: 0) {
            if !workspace.error.isEmpty { Text(workspace.error).font(.callout).foregroundStyle(.secondary).padding(12) }
            if !workspace.ready {
                ContentUnavailableView("Scratchpad unavailable", systemImage: "note.text", description: Text("Choose its storage folder on the owning computer and enable Read and edit Scratchpad for this device in Connections."))
                Button("Check connection") { Task { await load() } }.padding()
            } else { master }
        }
        .task(id: (remote.connection?.hostId ?? "") + "|" + (projectID ?? workspaceID ?? "all")) { await load() }
        .onChange(of: remote.connected) { _, connected in if connected { Task { await load() } } else { workspace.ready = false } }
        .onDisappear { if workspaceID != nil { workspace.workspaceFilter = ""; workspace.projectFilter = "" }; Task { await workspace.leave() } }
    }
    private var featureBody: some View {
        NativeFeatureWorkspace(title: "Scratchpad", symbol: "note.text", namespace: "scratchpad:" + (remote.connection?.hostId ?? "") + ":" + workspace.rootID + ":" + (projectID ?? workspaceID ?? "all"), registersFeatureOverview: projectID == nil && workspaceID == nil, scratchOwnerID: remote.connection?.hostId,
            records: workspace.tabs.map { NativeContentTab(id: $0, title: workspace.drafts[$0]?.title ?? "Scratch", kind: "scratch", hostID: nil) },
            selected: $workspace.selected, selectRecord: { id in if id == "master" { Task { await workspace.refresh(projectID: projectID) } } else { Task { await workspace.open(id) } } }, closeRecord: { id in Task { await workspace.close(id) } }) {
            VStack(spacing: 0) {
            if !workspace.error.isEmpty { Text(workspace.error).font(.callout).foregroundStyle(.secondary).padding(12) }
            if workspace.ready, workspace.pendingAction != nil { Button("Retry unconfirmed action") { Task { await workspace.retryAction(); await workspace.refresh(projectID: projectID) } }.padding(8) }
            if !workspace.ready {
                ContentUnavailableView("Scratchpad unavailable", systemImage: "note.text", description: Text("Choose its storage folder on the owning computer and enable Read and edit Scratchpad for this device in Connections."))
                Button("Check connection") { Task { await load() } }.padding()
            } else { master }
            }
        } detail: { id in
            if workspace.ready && remote.connected, let draft = workspace.drafts[id] { ScratchpadEditorView(draft: draft, workspace: workspace, remote: remote).id(id) }
            else { ContentUnavailableView("Reconnect the owning computer", systemImage: "network", description: Text("Scratch contents require this computer’s current Scratchpad access. Unsent drafts stay protected until they can be saved.")) }
        }
            .task(id: (remote.connection?.hostId ?? "") + "|" + (projectID ?? "all")) { await load() }
            .task(id: String(workspace.indexing["running"].bool) + String(remote.connected)) {
                while workspace.indexing["running"].bool && remote.connected && !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(1)) } catch { return }
                    await workspace.refresh(projectID: projectID)
                }
            }
            .onChange(of: remote.connected) { _, connected in
                if connected { Task { await load() } } else { workspace.ready = false }
            }
            .onDisappear { if workspaceID != nil { workspace.workspaceFilter = ""; workspace.projectFilter = "" }; Task { await workspace.leave() } }
            .onChange(of: scenePhase) { _, phase in if phase != .active { Task { await workspace.leave() } } else { Task { await load() } } }
    }
    private func load() async { await workspace.connect(remote); if let workspaceID, projectID == nil { workspace.workspaceFilter = workspaceID; workspace.projectFilter = "" }; if workspace.ready { await workspace.refresh(projectID: projectID); if workspace.selected != "master" { await workspace.open(workspace.selected) } } }
    private var master: some View {
        List {
            if showComputers && projectID == nil && workspaceID == nil {
                Section { ScratchpadOwnerPicker(menu: true) }.listRowBackground(NativeTheme.surface)
            }
            Section {
                if workspace.indexing["running"].bool { ProgressView("Indexing in background · \(workspace.indexing["added"].int) added") }
                TextField("Find scratches", text: $workspace.search).onSubmit { refresh() }
                DisclosureGroup("Filters") {
                if projectID == nil && workspaceID == nil {
                    Picker("Workspace", selection: $workspace.workspaceFilter) { Text("All workspaces").tag(""); ForEach(remote.stateValue("context")["workspaces"].array, id: \.self) { row in Text(row["name"].string).tag(row["id"].string) } }.onChange(of: workspace.workspaceFilter) { _, _ in workspace.projectFilter = ""; refresh() }
                    if !workspace.workspaceFilter.isEmpty { Picker("Project", selection: $workspace.projectFilter) { Text("All projects").tag(""); ForEach(remote.projectCatalog.projects(in: workspace.workspaceFilter), id: \.self) { row in Text(row["name"].string).tag(row["id"].string) } }.onChange(of: workspace.projectFilter) { _, _ in refresh() } }
                }
                Picker("Category", selection: $workspace.category) { Text("All categories").tag(""); ForEach(workspace.categories, id: \.self) { Text($0).tag($0) } }.onChange(of: workspace.category) { _, _ in refresh() }
                Picker("Sort", selection: $workspace.sort) { Text("Last modified").tag("updated"); Text("Created").tag("created"); Text("Title").tag("title"); Text("Category").tag("category") }.onChange(of: workspace.sort) { _, _ in refresh() }
                }
            }.listRowBackground(NativeTheme.surface)
            Section(projectID != nil ? "Project scratches" : workspaceID != nil ? "Workspace scratches" : "All scratches") {
                if workspace.rows.isEmpty { Text("No scratches match. Create one or synchronize files added outside Proteus.").foregroundStyle(.secondary) }
                ForEach(workspace.rows, id: \.self) { row in
                    ScratchRow(row: row, hostID: remote.connection?.hostId ?? "", rootID: workspace.rootID, embedded: projectID != nil || workspaceID != nil).listRowBackground(NativeTheme.surface)
                }
            }
            if workspace.offset > 0 { Button("Previous") { workspace.offset = max(0, workspace.offset - 100); Task { await workspace.refresh(projectID: projectID) } } }
            if workspace.hasMore { Button("Next") { workspace.offset += 100; Task { await workspace.refresh(projectID: projectID) } } }
        }.scrollContentBackground(.hidden).refreshable { await synchronizeFiles() }
    }
    private func synchronizeFiles() async {
        await workspace.leave()
        guard workspace.pendingAction == nil, !workspace.drafts.values.contains(where: { $0.saving || $0.pending != nil }) else {
            workspace.error = "Confirm pending saves before synchronizing files."; return
        }
        do {
            var args: [String: JSON] = ["action": .string("sync")]
            if let projectID { args["projectId"] = .string(projectID) }
            let result = try await workspace.request(args)
            await workspace.refresh(projectID: projectID)
            if !result["errors"].array.isEmpty { workspace.error = result["errors"].array.map { $0["error"].string }.joined(separator: "\n") }
        } catch { workspace.error = error.localizedDescription }
    }
    private func refresh() { workspace.offset = 0; Task { await workspace.refresh(projectID: projectID) } }
}
private struct ScratchpadEditorView: View {
    @ObservedObject var draft: ScratchpadDraft
    @ObservedObject var workspace: ScratchpadWorkspace
    let remote: RemoteStore
    @State private var preview = false
    @State private var previewHeight: CGFloat = 100
    @State private var confirmDelete = false
    @State private var confirmReload = false
    @State private var project = ""
    @State private var workspaceID = ""
    @State private var sourceMode = false
    @State private var properties = false
    @State private var editCommand: ScratchEditCommand?
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Title").font(.caption).foregroundStyle(.secondary)
                    TextField("Untitled", text: $draft.title).font(.title3.weight(.semibold)).textFieldStyle(.roundedBorder).accessibilityLabel("Scratch title")
                }
                DisclosureGroup(isExpanded: $properties) {
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(alignment: .leading, spacing: 4) { Text("Category").font(.caption).foregroundStyle(.secondary); TextField("No category", text: $draft.category).textFieldStyle(.roundedBorder).accessibilityLabel("Scratch category") }
                        LabeledContent("Workspace") {
                    Picker("Workspace", selection: $workspaceID) { Text("Unassigned").tag(""); ForEach(remote.stateValue("context")["workspaces"].array, id: \.self) { row in Text(row["name"].string).tag(row["id"].string) } }.onChange(of: workspaceID) { old, next in if old != next && next != draft.record["workspaceId"].string { if project.isEmpty { Task { await move("") } } else { project = "" } } }
                        }
                        LabeledContent("Project") {
                    Picker("Project", selection: $project) {
                    Text("Unassigned").tag("")
                    ForEach(remote.stateValue("workspaceProjects")["projects"].array.filter { $0["workspaceId"].string == workspaceID }, id: \.self) { row in Text(row["name"].string).tag(row["id"].string) }
                }.onChange(of: project) { _, next in if next != draft.record["projectId"].string { Task { await move(next) } } }

                        }
                    }.padding(.top, 6)
                } label: { Label("Details", systemImage: "slider.horizontal.3").font(.subheadline) }
                // Mode controls are real buttons: Edit / Preview, and Live / Source while editing.
                HStack(spacing: 10) {
                    Picker("Mode", selection: Binding(get: { preview }, set: { preview = $0 })) { Text("Edit").tag(false); Text("Preview").tag(true) }.pickerStyle(.segmented)
                    if !preview { Picker("Editor", selection: $sourceMode) { Text("Live").tag(false); Text("Source").tag(true) }.pickerStyle(.segmented).frame(maxWidth: 180) }
                }
                Label(draft.saving ? "Saving…" : draft.dirty ? "Unsaved changes" : "Saved", systemImage: draft.saving ? "arrow.triangle.2.circlepath" : draft.dirty ? "pencil.circle" : "checkmark.circle").font(.caption).foregroundStyle(.secondary)
                if !draft.error.isEmpty {
                    Text(draft.error).foregroundStyle(.red)
                    HStack { Button("Retry save") { Task { await workspace.save(draft, retry: true) } }.disabled(draft.conflict); Button("Copy unsaved text") { UIPasteboard.general.string = draft.body } }.buttonStyle(.borderless)
                    Button("Reload saved version") { confirmReload = true }.buttonStyle(.borderless).disabled(draft.pending != nil)
                }
                if preview {
                    MarkdownView(text: draft.body, runID: "scratch:" + draft.record["id"].string, store: remote, height: $previewHeight, onDocumentLink: { _ in draft.error = "Open linked files through the authorized Files view." }, resolveDocumentAsset: { source, pdf in
                        let path = source.removingPercentEncoding ?? source
                        guard path.range(of: #"^Scratch Attachments/pasted-[a-f0-9]{64}\.(png|jpg|gif|webp|pdf)$"#, options: .regularExpression) != nil else {
                            throw RemoteError(message: "Open linked files through the authorized Files view.")
                        }
                        let asset = try await workspace.request(["action": .string("asset"), "path": .string(path)])
                        let mediaType = asset["mediaType"].string
                        guard pdf ? mediaType == "application/pdf" : mediaType.hasPrefix("image/") else { throw RemoteError(message: "Attachment type changed.") }
                        return "data:" + mediaType + ";base64," + asset["data"].string
                    }).frame(height: previewHeight)
                }
                else {
                    VStack(spacing: 0) {
                        ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 2) {
                            format("Heading", "textformat.size", "## ", "")
                            format("Bold", "bold", "**", "**")
                            format("Italic", "italic", "_", "_")
                            format("Bullet list", "list.bullet", "- ", "")
                            format("Task list", "checklist", "- [ ] ", "")
                            format("Code block", "chevron.left.forwardslash.chevron.right", "```\n", "\n```")
                            format("Link", "link", "[", "](https://)")
                            format("Quote", "text.quote", "> ", "")
                            Button { pasteAsset() } label: { Image(systemName: "clipboard").frame(width: 44, height: 44) }.accessibilityLabel("Paste image or PDF")
                        }.padding(4).buttonStyle(.plain) }.background(NativeTheme.surface)
                        Divider()
                        NativeScratchMarkdownEditor(text: $draft.body, source: sourceMode, command: editCommand).frame(minHeight: 420).accessibilityLabel("Scratch content")
                    }.overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeTheme.line))
                }
                Button("Delete scratch", systemImage: "trash", role: .destructive) { confirmDelete = true }.buttonStyle(.bordered)
            }.padding(16).disabled(workspace.pendingAction != nil)
        }.onAppear { workspaceID = draft.record["workspaceId"].string; project = draft.record["projectId"].string }
            .onChange(of: draft.value) { _, _ in workspace.edited(draft) }
            .confirmationDialog("Move this scratch to its .Trash folder?", isPresented: $confirmDelete) { Button("Delete scratch", role: .destructive) { Task { await remove() } } }
            .confirmationDialog("Discard this unsaved draft and reload the saved file?", isPresented: $confirmReload) { Button("Reload saved version", role: .destructive) { Task { await workspace.reload(draft.record["id"].string) } } }
    }
    private func pasteAsset() {
        NativeAttachmentPaste.read(limit: 1) { item in
            Task {
                do {
                    var fields = try await NativeAttachmentPaste.markdownAsset(item.get())
                    fields["action"] = .string("paste"); fields["id"] = draft.record["id"]
                    let asset = try await workspace.request(fields)
                    editCommand = ScratchEditCommand(before: "![[" + asset["name"].string + "]]\n", after: "", replace: true)
                } catch { draft.error = error.localizedDescription }
            }
        }
    }
    private func format(_ label: String, _ symbol: String, _ before: String, _ after: String) -> some View {
        Button { editCommand = ScratchEditCommand(before: before, after: after) } label: { Image(systemName: symbol).frame(width: 44, height: 44) }.accessibilityLabel(label)
    }
    private func move(_ target: String) async {
        await workspace.save(draft)
        guard !draft.dirty else { project = draft.record["projectId"].string; return }
        do { let row = try await workspace.action(["action": .string("move"), "id": draft.record["id"], "expectedRevision": draft.record["revision"], "workspaceId": workspaceID.isEmpty ? .null : .string(workspaceID), "projectId": target.isEmpty ? .null : .string(target)]); draft.record = .object(draft.record.object.merging(row.object) { _, new in new }) }
        catch { draft.error = error.localizedDescription; project = draft.record["projectId"].string }
    }
    private func remove() async {
        await workspace.save(draft); guard !draft.dirty else { return }
        do { _ = try await workspace.action(["action": .string("delete"), "id": draft.record["id"], "expectedRevision": draft.record["revision"]]); await workspace.close(draft.record["id"].string) }
        catch { draft.error = error.localizedDescription }
    }
}

/// A Scratch tab in another feature keeps its own draft/retry namespace. It
/// never adds membership to the Scratchpad area's tabs or changes its owner.
struct ScratchpadResourceTab: View {
    @EnvironmentObject private var destinations: DestinationStore
    @StateObject private var workspace: ScratchpadWorkspace
    let reference: JSON
    let changed: (JSON) -> Void
    init(id: String, reference: JSON, changed: @escaping (JSON) -> Void) {
        self.reference = reference; self.changed = changed
        let safe = id.filter { $0.isLetter || $0.isNumber || $0 == "-" }
        _workspace = StateObject(wrappedValue: ScratchpadWorkspace(cacheRoot: URL.applicationSupportDirectory.appending(path: "Proteus/scratchpad-tabs/" + safe)))
    }
    var body: some View {
        Group {
            if let remote = destinations.remote(for: reference["hostID"].string), workspace.ready, remote.connected, let draft = workspace.drafts[workspace.selected] {
                ScratchpadEditorView(draft: draft, workspace: workspace, remote: remote)
                    .onChange(of: draft.title) { _, _ in publish() }
            } else { ContentUnavailableView("Scratchpad unavailable", systemImage: "network", description: Text(workspace.error.isEmpty ? "Reconnect its owner and enable Scratchpad access in Connections." : workspace.error)) }
        }.task(id: reference["hostID"].string + String(destinations.remote(for: reference["hostID"].string)?.connected == true)) {
            guard let remote = destinations.remote(for: reference["hostID"].string), remote.connected else { workspace.ready = false; return }
            await workspace.connect(remote)
            guard workspace.ready else { return }
            if !reference["rootID"].string.isEmpty, reference["rootID"].string != workspace.rootID { workspace.ready = false; workspace.error = "Scratchpad storage changed. Reopen the note from its current owner."; return }
            if !reference["scratchID"].string.isEmpty { await workspace.open(reference["scratchID"].string) }
            else if workspace.pendingAction != nil { await workspace.retryAction() }
            else if workspace.selected == "master" {
                do {
                    var input: [String: JSON] = ["action": .string("create"), "title": .string("Untitled"), "body": .string(""), "format": .string("markdown"), "operationId": reference["operationID"]]
                    if !reference["projectId"].string.isEmpty { input["projectId"] = reference["projectId"] } else if !reference["workspaceId"].string.isEmpty { input["workspaceId"] = reference["workspaceId"] }
                    let row = try await workspace.action(input)
                    await workspace.open(row["id"].string)
                } catch { workspace.error = error.localizedDescription }
            }
            publish()
        }.onDisappear { Task { await workspace.leave() } }
    }
    private func publish() {
        guard let draft = workspace.drafts[workspace.selected] else { return }
        var row = reference.object; row["scratchID"] = draft.record["id"]; row["rootID"] = .string(workspace.rootID); row["title"] = .string(draft.title); changed(.object(row))
    }
}

/// The same offline CodeMirror runtime as desktop/web. Only Markdown text crosses
/// this bridge; the editor has no network, credential or filesystem authority.
struct ScratchEditCommand { let id = UUID(); let before: String; let after: String; var replace = false }
struct NativeScratchMarkdownEditor: UIViewRepresentable {
    @Binding var text: String
    let source: Bool
    var command: ScratchEditCommand?
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration(); config.websiteDataStore = .nonPersistent()
        config.userContentController.add(context.coordinator, name: "scratchEdit")
        let web = WKWebView(frame: .zero, configuration: config); web.isOpaque = false; web.backgroundColor = .clear; web.navigationDelegate = context.coordinator
        if let file = Bundle.main.url(forResource: "scratch-editor", withExtension: "html", subdirectory: "markdown") { web.loadFileURL(file, allowingReadAccessTo: file.deletingLastPathComponent()) }
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self; context.coordinator.update(web) }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) { web.configuration.userContentController.removeScriptMessageHandler(forName: "scratchEdit"); web.stopLoading(); web.loadHTMLString("", baseURL: nil); web.navigationDelegate = nil }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: NativeScratchMarkdownEditor
        var loaded = false
        var delivered = ""
        var deliveredSource: Bool?
        var deliveredCommand: UUID?
        var deliveredColors: [String: String] = [:]
        init(_ parent: NativeScratchMarkdownEditor) { self.parent = parent }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; deliveredSource = nil; update(webView) }
        func update(_ web: WKWebView) {
            guard loaded else { return }
            let colors = Dictionary(uniqueKeysWithValues: ["text", "muted", "accent", "border", "panel"].map { key in
                let color = UIColor(NativePalette.shared.color(key)).resolvedColor(with: web.traitCollection)
                var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
                color.getRed(&r, green: &g, blue: &b, alpha: &a)
                let variable = key == "text" ? "ink" : key == "border" ? "line" : key
                return ("--proteus-" + variable, "rgba(\(Int(r * 255)),\(Int(g * 255)),\(Int(b * 255)),\(a))")
            })
            let command = parent.command.flatMap { $0.id != deliveredCommand ? $0 : nil }
            guard delivered != parent.text || deliveredSource != parent.source || command != nil || deliveredColors != colors else { return }
            let value: Any = delivered != parent.text ? parent.text as Any : NSNull()
            delivered = parent.text; deliveredSource = parent.source; deliveredColors = colors
            if let command { deliveredCommand = command.id }
            web.callAsyncJavaScript("window.configureScratch(value,source,colors); if (format) window.insertScratch(before,after,replace)", arguments: ["value": value, "source": parent.source, "colors": colors, "format": command != nil, "replace": command?.replace ?? false, "before": command?.before ?? "", "after": command?.after ?? ""], in: nil, in: .page) { _ in }
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) { guard message.name == "scratchEdit", let value = message.body as? String, value.utf8.count <= 2 * 1024 * 1024 else { return }; delivered = value; parent.text = value }
    }
}

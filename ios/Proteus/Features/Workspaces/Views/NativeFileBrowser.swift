import SwiftUI
import PDFKit

/// The desktop remains authoritative. View-local pages and bytes expire on exit;
/// every folder/document open revalidates the current paired-device grant.
struct NativeFileBrowser: View {
    @Environment(RemoteStore.self) var store
    let workspaceID: String
    var initialFile: JSON? = nil
    var onOpenFile: ((JSON) -> Void)? = nil
    @State private var roots: [JSON] = []
    @State private var canWrite = false
    @State private var root = ""
    @State private var directory = ""
    @State private var entries: [JSON] = []
    @State private var nextOffset: Int?
    @State private var expanded: [String: [JSON]] = [:]
    @State private var expandedNext: [String: Int] = [:]
    @State private var expansionRequests: [String: UUID] = [:]
    @State private var selected = Set<String>()
    @State private var document: JSON = .null
    @State private var mediaData: Data?
    @State private var mediaImage: UIImage?
    @State private var tabs: [JSON] = []
    @State private var active = ""
    @State private var assets: [String: String] = [:]
    @State private var height: CGFloat = 1
    @State private var failure = ""
    @State private var query = ""
    @State private var sort = "name"
    @State private var descending = false
    @State private var busy = false
    @State private var viewActive = false
    @State private var revision = UUID()
    @State private var listRevision = UUID()
    @State private var split: CGFloat = 0.48
    @State private var dragSplit: CGFloat?
    @State private var verticalSplit: CGFloat = 0.45
    @State private var dragVerticalSplit: CGFloat?
    @State private var showColumns = false
    @State private var selectionAnchor = ""
    @State private var cursor = ""
    @State private var dragNavigation = NativeFileDragNavigation()
    @State private var editAction = ""
    @State private var name = ""
    @State private var movePicker = false
    @State private var trashConfirmation = false
    private var args: [String: JSON] { ["workspaceId": .string(workspaceID), "rootId": .string(root)] }
    private let columns = [("name", "Name"), ("type", "Type"), ("size", "Size"), ("fileCreatedAt", "Created"), ("fileModifiedAt", "Modified")]
    var body: some View {
        VStack(spacing: 8) {
            if let initialFile {
                HStack { Text(initialFile["title"].string).font(.headline).lineLimit(1); Spacer(); Button("Refresh", systemImage: "arrow.clockwise") { Task { await bootstrap() } } }.contentShape(Rectangle()).nativeAdjacentTabSwipe()
                if !failure.isEmpty { Text(failure).font(.caption).foregroundStyle(.orange).textSelection(.enabled) }
                reader.accessibilityIdentifier("workspace-file-reader").frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            else {
            HStack {
                Picker("Folder", selection: $root) { ForEach(roots, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                Button("Refresh", systemImage: "arrow.clockwise") { Task { if root.isEmpty { await bootstrap() } else { await load() } } }
                Menu {
                    ForEach(columns, id: \.0) { key, label in Button(label + (sort == key ? (descending ? " ↓" : " ↑") : "")) { changeSort(key) } }
                    Toggle("Show all columns", isOn: $showColumns)
                    Divider()
                    Button("New file", systemImage: "doc.badge.plus") { editAction = "create"; name = "Untitled.md" }.disabled(!canWrite)
                    Button("New folder", systemImage: "folder.badge.plus") { editAction = "mkdir"; name = "New folder" }.disabled(!canWrite)
                    Button("Move selected…", systemImage: "folder") { movePicker = true }.disabled(selected.isEmpty || !canWrite)
                    Button("Trash selected…", systemImage: "trash", role: .destructive) { trashConfirmation = true }.disabled(selected.isEmpty || !canWrite)
                } label: { Image(systemName: "ellipsis.circle") }
            }
            ScrollView(.horizontal) {
                HStack { Button("Root") { directory = ""; Task { await load() } }
                    ForEach(Array(directory.split(separator: "/").enumerated()), id: \.offset) { index, part in
                        Image(systemName: "chevron.right").font(.caption2)
                        Button(String(part)) { directory = directory.split(separator: "/").prefix(index + 1).joined(separator: "/"); Task { await load() } }
                    }
                }.font(.caption).frame(minHeight: 36)
            }
            ScrollView(.horizontal) {
                HStack(spacing: 4) {
                    fileTool("New file", "doc.badge.plus", disabled: !canWrite) { editAction = "create"; name = "Untitled.md" }
                    fileTool("New folder", "folder.badge.plus", disabled: !canWrite) { editAction = "mkdir"; name = "New folder" }
                    fileTool("Copy path", "doc.on.doc", disabled: selected.isEmpty) { copySelection() }
                    fileTool("Rename", "pencil", disabled: !canWrite || selected.count != 1) { editAction = "rename"; name = selectedEntries.first?["name"].string ?? "" }
                    fileTool("Duplicate", "plus.square.on.square", disabled: !canWrite || selected.count != 1) { editAction = "duplicate"; name = "Copy of " + (selectedEntries.first?["name"].string ?? "") }
                    fileTool("Move", "folder", disabled: !canWrite || selected.isEmpty) { movePicker = true }
                    fileTool("Trash", "trash", disabled: !canWrite || selected.isEmpty) { trashConfirmation = true }
                }
            }.accessibilityIdentifier("workspace-file-toolbar")
            TextField("Filter files", text: $query).textFieldStyle(.roundedBorder).onSubmit { Task { await load() } }
            if !failure.isEmpty { Text(failure).font(.caption).foregroundStyle(.orange).textSelection(.enabled) }
            GeometryReader { geometry in
                if geometry.size.width > 650 || (NativePadPreview.enabled && geometry.size.width > 450) {
                    HStack(spacing: 0) {
                        fileListing(columns: true, availableWidth: geometry.size.width * split).frame(width: geometry.size.width * split)
                        Rectangle().fill(.secondary.opacity(0.3)).frame(width: 8).gesture(DragGesture(coordinateSpace: .global).onChanged { value in if dragSplit == nil { dragSplit = split }; split = min(0.8, max(0.2, (dragSplit ?? split) + value.translation.width / geometry.size.width)) }.onEnded { _ in dragSplit = nil })
                        reader.accessibilityIdentifier("workspace-file-reader").frame(maxWidth: .infinity)
                    }
                } else {
                    VStack(spacing: 0) {
                        fileListing(columns: showColumns || NativePadPreview.enabled, availableWidth: geometry.size.width).frame(height: document == .null ? geometry.size.height : max(80, geometry.size.height * verticalSplit))
                        if document != .null {
                            Rectangle().fill(.secondary.opacity(0.3)).frame(height: 10)
                                .accessibilityLabel("Resize file preview").accessibilityIdentifier("workspace-file-vertical-divider")
                                .gesture(DragGesture(coordinateSpace: .global).onChanged { value in if dragVerticalSplit == nil { dragVerticalSplit = verticalSplit }; verticalSplit = min(0.8, max(0.2, (dragVerticalSplit ?? verticalSplit) + value.translation.height / max(1, geometry.size.height))) }.onEnded { _ in dragVerticalSplit = nil })
                            reader.accessibilityIdentifier("workspace-file-reader").frame(maxHeight: .infinity)
                        }
                    }
                }
            }
            }
        }.padding(10).tint(NativeTheme.accent)
        .onAppear { viewActive = true }
        .task { await bootstrap() }
        .onChange(of: root) { old, _ in if initialFile == nil && !old.isEmpty { directory = ""; tabs = []; Task { await load() } } }
        .onDisappear { viewActive = false; listRevision = UUID(); revision = UUID(); document = .null; mediaData = nil; mediaImage = nil; assets = [:]; entries = []; expanded = [:]; tabs = [] }
        .alert("File name", isPresented: Binding(get: { !editAction.isEmpty }, set: { if !$0 { editAction = "" } })) {
            TextField("Name", text: $name)
            Button("Cancel", role: .cancel) { editAction = "" }
            Button("Save") { let action = editAction; editAction = ""; Task { await mutate(action, extra: ["name": .string(name)]) } }
        }
        .confirmationDialog("Move selected items to system trash?", isPresented: $trashConfirmation) { Button("Move to trash", role: .destructive) { Task { await mutate("trash") } } }
        .sheet(isPresented: $movePicker) { NavigationStack { NativeFileMovePicker(workspaceID: workspaceID, rootID: root) { target in movePicker = false; Task { await mutate("move", extra: ["directory": .string(target)]) } }.environment(store) } }
    }
    private var selectedEntries: [JSON] { flatten(entries).filter { selected.contains($0["path"].string) } }
    private func fileTool(_ title: String, _ symbol: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) { Label(title, systemImage: symbol).font(.caption).padding(.horizontal, 6).frame(minHeight: 44) }.disabled(disabled || busy).buttonStyle(.bordered)
    }
    private func copySelection() { let prefix = roots.first { $0["id"].string == root }?["path"].string ?? ""; UIPasteboard.general.string = selectedEntries.map { prefix + "/" + $0["path"].string }.joined(separator: "\n") }
    private func changeSort(_ key: String) { descending = sort == key ? !descending : false; sort = key; Task { await load() } }
    private func fileDate(_ value: String) -> String { ProviderAllowance.date(value)?.formatted(date: .abbreviated, time: .shortened) ?? "—" }
    private func fileListing(columns details: Bool, availableWidth: CGFloat) -> some View {
        ScrollView(.horizontal) {
            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    ForEach(details ? columns : Array(columns.prefix(1)), id: \.0) { key, label in
                        Button(label + (sort == key ? (descending ? " ↓" : " ↑") : "")) { changeSort(key) }
                            .font(.caption.weight(.semibold)).frame(width: key == "name" ? (details ? 280 : nil) : key == "size" ? 80 : 155, alignment: .leading)
                            .accessibilityIdentifier("workspace-file-sort-" + key)
                    }
                }.padding(.horizontal, 16).frame(maxWidth: .infinity, alignment: .leading)
                listing(columns: details)
            }.frame(width: details ? max(960, availableWidth) : availableWidth)
        }.scrollBounceBehavior(.basedOnSize, axes: .horizontal).accessibilityIdentifier("workspace-file-columns")
        .focusable().onKeyPress(.downArrow) { step(1); return .handled }.onKeyPress(.upArrow) { step(-1); return .handled }
        .onKeyPress(KeyEquivalent("\r")) { if let entry = flatten(entries).first(where: { $0["path"].string == cursor || selected.contains($0["path"].string) }) { Task { await show(entry, newTab: true) } }; return .handled }
    }
    private func listing(columns details: Bool) -> some View {
        ScrollViewReader { proxy in
        List { ForEach(flatten(entries), id: \.self) { entry in
            HStack(spacing: 6) {
                HStack(spacing: 6) {
                Button { if selected.contains(entry["path"].string) { selected.remove(entry["path"].string) } else { selected.insert(entry["path"].string) }; selectionAnchor = entry["path"].string; cursor = entry["path"].string } label: { Image(systemName: selected.contains(entry["path"].string) ? "checkmark.circle.fill" : "circle").frame(width: 32, height: 44) }.buttonStyle(.borderless).accessibilityLabel((selected.contains(entry["path"].string) ? "Deselect " : "Select ") + entry["name"].string)
                if entry["kind"].string == "folder" { Button { Task { await toggle(entry) } } label: { Image(systemName: expanded[entry["path"].string] == nil ? "chevron.right" : "chevron.down").frame(width: 20, height: 44) }.buttonStyle(.borderless) }
                else { Color.clear.frame(width: 20, height: 1).accessibilityHidden(true) }
                NativeWorkspaceFileIcon(kind: entry["kind"].string, expanded: expanded[entry["path"].string] != nil)
                if canWrite {
                    NativeFileSelectionButton(title: "Drag " + entry["name"].string, subtitle: "", identifier: "workspace-file-drag-" + entry["path"].string, menu: UIMenu(), dragHandle: true, drag: { dragProvider(entry) }, canDrop: false, drop: { _ in }) { _ in }
                        .frame(width: 28, height: 44)
                }
                NativeFileSelectionButton(title: entry["name"].string, subtitle: details ? "" : entry["type"].string, identifier: "workspace-file-" + entry["path"].string, menu: fileMenu(entry), drag: { dragProvider(entry) }, canDrop: canWrite && !busy && entry["kind"].string == "folder", drop: { providers in _ = acceptDrop(providers, entry: entry) }) { modifiers in select(entry, modifiers: modifiers) }.frame(maxWidth: .infinity).frame(height: 48)
                }.padding(.leading, CGFloat(entry["depth"].int) * 16).frame(width: details ? 280 : nil, alignment: .leading)
                if details {
                    Text(entry["type"].string).font(.caption).frame(width: 155, alignment: .leading)
                    Text(entry["size"] == .null ? "—" : ByteCountFormatter.string(fromByteCount: Int64(entry["size"].int), countStyle: .file)).font(.caption).frame(width: 80, alignment: .leading)
                    Text(fileDate(entry["fileCreatedAt"].string)).font(.caption).frame(width: 155, alignment: .leading)
                    Text(fileDate(entry["fileModifiedAt"].string)).font(.caption).frame(width: 155, alignment: .leading)
                }
                Spacer()
            }.id(entry["path"].string)
            .onAppear { dragNavigation.visible.insert(entry["path"].string) }
            .onDisappear { dragNavigation.visible.remove(entry["path"].string) }
            if let offset = expandedNext[entry["path"].string] {
                Button("More in " + entry["name"].string) { Task { await loadExpanded(entry["path"].string, offset: offset) } }
                    .padding(.leading, CGFloat(entry["depth"].int + 1) * 16).disabled(expansionRequests[entry["path"].string] != nil)
            }
        }; if let nextOffset { Button("More files") { Task { await load(offset: nextOffset) } } } }.listStyle(.plain).overlay { if busy { ProgressView() } }
        .onChange(of: cursor) { _, path in if !path.isEmpty { proxy.scrollTo(path, anchor: .center) } }
        .onChange(of: document != .null) { _, loaded in if loaded && !cursor.isEmpty { proxy.scrollTo(cursor, anchor: .center) } }
        .overlay(alignment: .top) { dragEdge(-1, proxy: proxy) }
        .overlay(alignment: .bottom) { dragEdge(1, proxy: proxy) }
        .onChange(of: listRevision) { _, _ in dragNavigation.stop(); dragNavigation.visible = [] }
        .onDisappear { dragNavigation.stop(); dragNavigation.visible = [] }
        }
    }
    private func dragEdge(_ direction: Int, proxy: ScrollViewProxy) -> some View {
        Color.clear.frame(height: 18).contentShape(Rectangle())
            .onDrop(of: ["public.text"], delegate: NativeFileEdgeDrop(enter: {
                let paths = flatten(entries).map { $0["path"].string }
                dragNavigation.start(direction: direction, paths: paths) { path in proxy.scrollTo(path, anchor: direction < 0 ? .top : .bottom) }
            }, leave: { dragNavigation.stop() }))
    }
    @ViewBuilder private var reader: some View {
        VStack {
            if !tabs.isEmpty { ScrollView(.horizontal) { HStack { ForEach(tabs, id: \.self) { tab in HStack { Button(tab["name"].string) { Task { await show(tab) } }; Button { tabs.removeAll { $0["path"] == tab["path"] }; if active == tab["path"].string { revision = UUID(); document = .null; assets = [:] } } label: { Image(systemName: "xmark") }.accessibilityLabel("Close " + tab["name"].string) } } } } }
            if document == .null { Text("Select a file to preview").foregroundStyle(.secondary) }
            else if document["mediaType"].string == "application/pdf", let data = mediaData { NativeFilePDF(data: data).id(active) }
            else if document["mediaType"].string.hasPrefix("image/"), let image = mediaImage { ScrollView([.horizontal, .vertical]) { Image(uiImage: image).resizable().scaledToFit() } }
            else if document["mediaType"].string == "text/plain" { ScrollView([.horizontal, .vertical]) { Text(document["content"].string).font(.system(.body, design: .monospaced)).textSelection(.enabled) } }
            else { ScrollView { MarkdownView(text: document["content"].string, runID: "", store: store, height: $height, onDocumentLink: { source in Task { do { let target = try await store.request("files.resolve-link", args.merging(["file": .string(active), "source": .string(source)]) { _, new in new }); await show(target, newTab: true) } catch { failure = error.localizedDescription } } }, documentAssetURLs: assets, allFileLinks: true).frame(height: max(height, 1)) } }
        }
    }
    private func select(_ entry: JSON, modifiers: UIKeyModifierFlags) {
        let path = entry["path"].string, values = flatten(entries)
        if modifiers.contains(.shift), let anchor = values.firstIndex(where: { $0["path"].string == selectionAnchor }), let end = values.firstIndex(where: { $0["path"].string == path }) { for index in min(anchor, end)...max(anchor, end) { selected.insert(values[index]["path"].string) } }
        else if modifiers.contains(.command) || modifiers.contains(.control) { if selected.contains(path) { selected.remove(path) } else { selected.insert(path) }; selectionAnchor = path }
        else { selected = [path]; selectionAnchor = path; Task { await show(entry) } }
        cursor = path
    }
    private func fileMenu(_ entry: JSON) -> UIMenu {
        func choose() { if !selected.contains(entry["path"].string) { selected = [entry["path"].string] } }
        let disabled: UIMenuElement.Attributes = canWrite && !busy ? [] : .disabled
        return UIMenu(children: [
            UIAction(title: "Open in new tab", image: UIImage(systemName: "doc")) { _ in Task { await show(entry, newTab: true) } },
            UIAction(title: "Copy name", image: UIImage(systemName: "doc.on.doc")) { _ in choose(); UIPasteboard.general.string = selectedEntries.map { $0["name"].string }.joined(separator: "\n") },
            UIAction(title: "Copy path", image: UIImage(systemName: "link")) { _ in choose(); copySelection() },
            UIAction(title: "Rename", image: UIImage(systemName: "pencil"), attributes: disabled) { _ in selected = [entry["path"].string]; editAction = "rename"; name = entry["name"].string },
            UIAction(title: "Duplicate", image: UIImage(systemName: "plus.square.on.square"), attributes: disabled) { _ in selected = [entry["path"].string]; editAction = "duplicate"; name = "Copy of " + entry["name"].string },
            UIAction(title: "Move…", image: UIImage(systemName: "folder"), attributes: disabled) { _ in choose(); movePicker = true },
            UIAction(title: "Trash…", image: UIImage(systemName: "trash"), attributes: canWrite ? .destructive : [.destructive, .disabled]) { _ in choose(); trashConfirmation = true }
        ])
    }
    private func dragProvider(_ entry: JSON) -> NSItemProvider? {
        guard canWrite, !busy, viewActive else { return nil }
        if !selected.contains(entry["path"].string) { selected = [entry["path"].string] }
        let items = selectedEntries.map { JSON.object(["path": $0["path"], "identity": $0["identity"]]) }
        let payload = JSON.object(["workspaceId": .string(workspaceID), "rootId": .string(root), "items": .array(items)])
        guard let data = try? JSONEncoder().encode(payload), let text = String(data: data, encoding: .utf8) else { return nil }
        return NSItemProvider(object: text as NSString)
    }
    private func acceptDrop(_ providers: [NSItemProvider], entry: JSON) -> Bool {
        guard canWrite, !busy, viewActive, entry["kind"].string == "folder", let provider = providers.first else { return false }
        dragNavigation.stop()
        let requestedRoot = root
        provider.loadObject(ofClass: NSString.self) { object, _ in
            guard let text = object as? String, let data = text.data(using: .utf8), let payload = try? JSONDecoder().decode(JSON.self, from: data) else { return }
            Task { @MainActor in
                guard viewActive, root == requestedRoot, payload["workspaceId"].string == workspaceID, payload["rootId"].string == requestedRoot else { return }
                await mutate("move", extra: ["directory": entry["path"], "items": payload["items"]])
            }
        }
        return true
    }
    private func step(_ delta: Int) { let values = flatten(entries); guard !values.isEmpty else { return }; let current = values.firstIndex { $0["path"].string == cursor } ?? -1; let index = min(values.count - 1, max(0, current + delta)); cursor = values[index]["path"].string; selected = [cursor]; selectionAnchor = cursor; if values[index]["kind"].string != "folder" { Task { await show(values[index]) } } }
    private func dataURL(_ value: String) -> Data? { guard let comma = value.firstIndex(of: ",") else { return nil }; return Data(base64Encoded: String(value[value.index(after: comma)...])) }
    private func symbol(_ entry: JSON) -> String { switch entry["kind"].string { case "folder": return expanded[entry["path"].string] == nil ? "folder" : "folder.fill"; case "image": return "photo"; case "code": return "chevron.left.forwardslash.chevron.right"; case "audio": return "music.note"; case "video": return "video"; default: return "doc.text" } }
    private func flatten(_ values: [JSON], depth: Int = 0) -> [JSON] { values.flatMap { entry in var object = entry.object; object["depth"] = .number(Double(depth)); return [.object(object)] + (expanded[entry["path"].string].map { flatten($0, depth: depth + 1) } ?? []) } }
    private func bootstrap() async {
        do {
            let result = try await store.request("files.roots", ["workspaceId": .string(workspaceID)])
            guard !Task.isCancelled else { return }
            roots = result["roots"].array; canWrite = result["canWrite"].bool; failure = ""
            if let initialFile {
                guard roots.contains(where: { $0["id"] == initialFile["rootId"] && $0["available"].bool }) else { throw RemoteError(message: "This file’s folder is no longer shared. Review Connections on its computer.") }
                root = initialFile["rootId"].string
                await show(.object(["path": initialFile["file"], "name": initialFile["title"]]))
            } else { root = roots.first { $0["available"].bool }?["id"].string ?? ""; guard !root.isEmpty else { throw RemoteError(message: "No available shared folders.") }; await load() }
        } catch { failure = error.localizedDescription }
    }
    private func load(offset: Int = 0) async {
        guard !root.isEmpty else { return }
        let token = UUID(), requestedRoot = root, requestedDirectory = directory
        listRevision = token; busy = true
        defer { if listRevision == token { busy = false } }
        revision = UUID(); document = .null; mediaData = nil; mediaImage = nil; assets = [:]; expanded = [:]; expandedNext = [:]; expansionRequests = [:]
        if offset == 0 { selected = []; entries = []; nextOffset = nil }
        let request = args.merging(["offset": .number(Double(offset)), "directory": .string(directory), "query": .string(query), "sort": .string(sort), "direction": .string(descending ? "desc" : "asc")]) { _, new in new }
        do {
            let result = try await store.request("files.browse", request)
            guard listRevision == token, root == requestedRoot, directory == requestedDirectory else { return }
            entries = (offset == 0 ? [] : entries) + result["entries"].array
            nextOffset = result["nextOffset"] == .null ? nil : result["nextOffset"].int
            failure = result["scanLimited"].bool ? "Listing limit reached. Filter to narrow this folder." : ""
        } catch { if listRevision == token { entries = []; failure = error.localizedDescription } }
    }
    private func toggle(_ entry: JSON) async {
        let path = entry["path"].string
        if expanded[path] != nil { expanded.removeValue(forKey: path); expandedNext[path] = nil; expansionRequests[path] = nil; return }
        expanded[path] = []; await loadExpanded(path)
    }
    private func loadExpanded(_ path: String, offset: Int = 0) async {
        let token = listRevision, requestedRoot = root, request = UUID()
        expansionRequests[path] = request
        defer { if expansionRequests[path] == request { expansionRequests[path] = nil } }
        do {
            let result = try await store.request("files.browse", args.merging(["directory": .string(path), "offset": .number(Double(offset)), "sort": .string(sort), "direction": .string(descending ? "desc" : "asc")]) { _, new in new })
            guard listRevision == token, root == requestedRoot, expansionRequests[path] == request, expanded[path] != nil else { return }
            expanded[path] = (offset == 0 ? [] : (expanded[path] ?? [])) + result["entries"].array
            expandedNext[path] = result["nextOffset"] == .null ? nil : result["nextOffset"].int
            if result["scanLimited"].bool { failure = "Listing limit reached. Filter or open a narrower folder." }
        } catch { if listRevision == token { failure = error.localizedDescription } }
    }
    private func show(_ entry: JSON, newTab: Bool = false) async {
        guard viewActive else { return }
        if entry["kind"].string == "folder", initialFile != nil { failure = "This link points to a folder. Open Files to browse it."; return }
        if entry["kind"].string == "folder" { directory = entry["path"].string; await load(); return }
        if newTab, let onOpenFile { onOpenFile(.object(["workspaceId": .string(workspaceID), "rootId": .string(root), "file": entry["path"], "title": entry["name"]])); return }
        let token = UUID(), file = entry["path"].string, requestedRoot = root
        let request = args.merging(["file": .string(file)]) { _, new in new }
        revision = token; active = file; assets = [:]; document = .null; mediaData = nil; mediaImage = nil
        do {
            var value = try await store.request("files.preview", request)
            guard revision == token, root == requestedRoot else { return }
            if value["mediaType"].string == "application/pdf" {
                let pdf = try await store.request("files.pdf", request)
                var object = value.object; object["dataURL"] = pdf["dataURL"]; value = .object(object)
            }
            guard revision == token, root == requestedRoot else { return }
            var resolvedAssets: [String: String] = [:], bytes = 0
            for source in value["imageSources"].array {
                guard revision == token, root == requestedRoot else { return }
                let asset = try? await store.request("files.resolve-link", request.merging(["source": source, "image": .bool(true)]) { _, new in new })
                if let url = asset?["dataURL"].string, bytes + url.utf8.count < 8_000_000 { bytes += url.utf8.count; resolvedAssets[source.string] = url }
            }
            guard revision == token, root == requestedRoot else { return }
            if newTab && !tabs.contains(where: { $0["path"] == entry["path"] }) { tabs.append(entry); if tabs.count > 12 { tabs.removeFirst() } }
            let decoded = dataURL(value["dataURL"].string)
            mediaData = decoded; mediaImage = value["mediaType"].string.hasPrefix("image/") ? decoded.flatMap { UIImage(data: $0) } : nil
            assets = resolvedAssets; document = value; failure = ""
        } catch { if revision == token { failure = error.localizedDescription } }
    }
    private func mutate(_ action: String, extra: [String: JSON] = [:]) async { guard viewActive, !busy else { return }; busy = true; defer { busy = false }; let items = flatten(entries).filter { selected.contains($0["path"].string) }.map { JSON.object(["path": $0["path"], "identity": $0["identity"]]) }; do { let result = try await store.request("files.mutate", args.merging(["action": .string(action), "directory": .string(directory), "items": .array(items)]) { _, new in new }.merging(extra) { _, new in new }); await load(); failure = result["results"].array.filter { !$0["ok"].bool }.map { $0["error"].string }.joined(separator: "; ") } catch { failure = error.localizedDescription } }
}

/// UIKit exposes the actual keyboard modifiers accompanying a pointer tap on iPad/iPhone.
/// The action never reads global keyboard state or turns a touch selection into a grant.
private struct NativeFileSelectionButton: UIViewRepresentable {
    let title: String
    let subtitle: String
    let identifier: String
    let menu: UIMenu
    var dragHandle = false
    let drag: () -> NSItemProvider?
    let canDrop: Bool
    let drop: ([NSItemProvider]) -> Void
    let select: (UIKeyModifierFlags) -> Void
    func makeUIView(context: Context) -> ModifierFileButton {
        let button = ModifierFileButton(type: .system)
        button.contentHorizontalAlignment = .leading
        button.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        button.addTarget(context.coordinator, action: #selector(Coordinator.pressed(_:)), for: .touchUpInside)
        let interaction = UIDragInteraction(delegate: context.coordinator); interaction.isEnabled = dragHandle; button.addInteraction(interaction)
        button.addInteraction(UIDropInteraction(delegate: context.coordinator))
        return button
    }
    func updateUIView(_ button: ModifierFileButton, context: Context) {
        context.coordinator.select = select
        context.coordinator.drag = drag
        context.coordinator.canDrop = canDrop; context.coordinator.drop = drop
        var configuration = UIButton.Configuration.plain()
        configuration.title = dragHandle ? nil : title; configuration.subtitle = subtitle.isEmpty ? nil : subtitle
        if dragHandle { configuration.image = UIImage(systemName: "line.3.horizontal") }
        configuration.titleAlignment = .leading; configuration.contentInsets = .zero
        configuration.baseForegroundColor = UIColor(NativePalette.shared.color("text"))
        button.configuration = configuration; button.accessibilityIdentifier = identifier; button.accessibilityLabel = title
        button.menu = dragHandle ? nil : menu; button.showsMenuAsPrimaryAction = false
    }
    func makeCoordinator() -> Coordinator { Coordinator(select: select) }
    final class Coordinator: NSObject, UIDragInteractionDelegate, UIDropInteractionDelegate {
        var select: (UIKeyModifierFlags) -> Void
        var drag: (() -> NSItemProvider?)?
        var canDrop = false
        var drop: (([NSItemProvider]) -> Void)?
        init(select: @escaping (UIKeyModifierFlags) -> Void) { self.select = select }
        @objc func pressed(_ sender: ModifierFileButton) { select(sender.modifiers) }
        func dragInteraction(_ interaction: UIDragInteraction, itemsForBeginning session: UIDragSession) -> [UIDragItem] { guard let provider = drag?() else { return [] }; return [UIDragItem(itemProvider: provider)] }
        func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool { canDrop && session.hasItemsConforming(toTypeIdentifiers: ["public.text"]) }
        func dropInteraction(_ interaction: UIDropInteraction, sessionDidUpdate session: UIDropSession) -> UIDropProposal { UIDropProposal(operation: canDrop ? .move : .forbidden) }
        func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) { if canDrop { drop?(session.items.map(\.itemProvider)) } }
    }
    final class ModifierFileButton: UIButton {
        var modifiers: UIKeyModifierFlags = []
        override func beginTracking(_ touch: UITouch, with event: UIEvent?) -> Bool { modifiers = event?.modifierFlags ?? []; return super.beginTracking(touch, with: event) }
    }
}

@MainActor private final class NativeFileDragNavigation {
    var visible = Set<String>()
    private var task: Task<Void, Never>?
    private var direction = 0
    private var revision = UUID()
    func start(direction: Int, paths: [String], scroll: @escaping (String) -> Void) {
        if task != nil && self.direction == direction { return }
        stop(); self.direction = direction
        let token = revision
        task = Task { @MainActor in
            while !Task.isCancelled && revision == token {
                let positions = paths.indices.filter { visible.contains(paths[$0]) }
                guard let edge = direction < 0 ? positions.min() : positions.max() else { break }
                let next = edge + direction
                guard paths.indices.contains(next) else { break }
                scroll(paths[next])
                try? await Task.sleep(for: .milliseconds(180))
            }
            if revision == token { task = nil }
        }
    }
    func stop() { revision = UUID(); task?.cancel(); task = nil; direction = 0 }
}
@MainActor private struct NativeFileEdgeDrop: DropDelegate {
    let enter: () -> Void
    let leave: () -> Void
    func dropEntered(info: DropInfo) { enter() }
    func dropExited(info: DropInfo) { leave() }
    func dropUpdated(info: DropInfo) -> DropProposal? { DropProposal(operation: .move) }
    func performDrop(info: DropInfo) -> Bool { leave(); return false }
}

/// Proteus' own folder/page outlines; tiny type marks remain legible without image assets.
private struct NativeWorkspaceFileIcon: View {
    let kind: String
    var expanded = false
    var body: some View {
        ZStack {
            if kind == "audio" || kind == "video" { Image(systemName: kind == "audio" ? "music.note" : "video").resizable().scaledToFit() }
            else {
                Canvas { context, size in
                    context.scaleBy(x: size.width / 24, y: size.height / 24)
                    var path = Path()
                    if kind == "folder" {
                        path.move(to: CGPoint(x: 2, y: expanded ? 7 : 5)); path.addLine(to: CGPoint(x: 10, y: expanded ? 7 : 5)); path.addLine(to: CGPoint(x: 12, y: expanded ? 9 : 8)); path.addLine(to: CGPoint(x: 22, y: expanded ? 9 : 8)); path.addLine(to: CGPoint(x: expanded ? 18 : 22, y: 20)); path.addLine(to: CGPoint(x: 2, y: 20)); path.closeSubpath()
                        if expanded { path.move(to: CGPoint(x: 2, y: 17)); path.addLine(to: CGPoint(x: 2, y: 4)); path.addLine(to: CGPoint(x: 9, y: 4)); path.addLine(to: CGPoint(x: 11, y: 7)); path.addLine(to: CGPoint(x: 19, y: 7)); path.addLine(to: CGPoint(x: 19, y: 9)) }
                    } else {
                        path.move(to: CGPoint(x: 5, y: 2)); path.addLine(to: CGPoint(x: 14, y: 2)); path.addLine(to: CGPoint(x: 19, y: 7)); path.addLine(to: CGPoint(x: 19, y: 22)); path.addLine(to: CGPoint(x: 5, y: 22)); path.closeSubpath()
                        path.move(to: CGPoint(x: 14, y: 2)); path.addLine(to: CGPoint(x: 14, y: 8)); path.addLine(to: CGPoint(x: 19, y: 8))
                    }
                    context.stroke(path, with: .foreground, style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
                }
                if kind == "image" { Image(systemName: "photo").font(.system(size: 8)).offset(y: 3) }
                else if kind != "folder" { Text(kind == "code" ? "101\n010" : kind == "markdown" ? "M↓" : kind == "pdf" ? "PDF" : "≡").font(.system(size: kind == "code" ? 5 : 7, weight: .semibold, design: .monospaced)).lineSpacing(0).offset(y: 3) }
            }
        }.foregroundStyle(NativeTheme.accent).frame(width: 22, height: 22).accessibilityHidden(true)
    }
}

private struct NativeFileMovePicker: View {
    @Environment(RemoteStore.self) var store
    @Environment(\.dismiss) private var dismiss
    let workspaceID: String
    let rootID: String
    let move: (String) -> Void
    @State private var path = ""
    @State private var folders: [JSON] = []
    @State private var nextOffset: Int?
    @State private var busy = false
    @State private var revision = UUID()
    @State private var failure = ""
    var body: some View {
        List {
            Text(path.isEmpty ? "Workspace root" : path)
            if !path.isEmpty { Button("Up") { path = path.split(separator: "/").dropLast().joined(separator: "/") } }
            ForEach(folders, id: \.self) { folder in
                Button(folder["name"].string, systemImage: "folder") { path = folder["path"].string }
            }
            if let nextOffset { Button("More folders") { Task { await load(offset: nextOffset) } }.disabled(busy) }
            if busy { ProgressView() }
            if !failure.isEmpty { Text(failure).foregroundStyle(.orange) }
        }
        .navigationTitle("Move here")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Move") { move(path) }.disabled(busy) }
        }
        .task(id: path) { await load() }
        .onDisappear { revision = UUID() }
    }
    private func load(offset: Int = 0) async {
        let token = UUID(), requestedPath = path
        revision = token; busy = true; failure = ""
        if offset == 0 { folders = []; nextOffset = nil }
        defer { if revision == token { busy = false } }
        do {
            let result = try await store.request("files.browse", ["workspaceId": .string(workspaceID), "rootId": .string(rootID), "directory": .string(requestedPath), "foldersOnly": .bool(true), "offset": .number(Double(offset))])
            guard revision == token, path == requestedPath, !Task.isCancelled else { return }
            folders += result["entries"].array.filter { $0["kind"].string == "folder" }
            nextOffset = result["nextOffset"] == .null ? nil : result["nextOffset"].int
            failure = result["scanLimited"].bool ? "Listing limit reached. Open a narrower folder." : ""
        } catch { if revision == token, !Task.isCancelled { failure = error.localizedDescription } }
    }
}

private struct NativeFilePDF: View {
    let data: Data
    @State private var query = ""
    var body: some View { VStack { TextField("Find in PDF", text: $query).textFieldStyle(.roundedBorder); NativeFilePDFCanvas(data: data, query: query) } }
}
private struct NativeFilePDFCanvas: UIViewRepresentable {
    let data: Data
    let query: String
    func makeUIView(context: Context) -> UIStackView { let pdf = PDFView(); pdf.autoScales = true; pdf.document = PDFDocument(data: data); let thumbnails = PDFThumbnailView(); thumbnails.pdfView = pdf; thumbnails.layoutMode = .horizontal; thumbnails.thumbnailSize = CGSize(width: 50, height: 70); thumbnails.heightAnchor.constraint(equalToConstant: 80).isActive = true; let stack = UIStackView(arrangedSubviews: [pdf, thumbnails]); stack.axis = .vertical; return stack }
    func updateUIView(_ view: UIStackView, context: Context) { guard let pdf = view.arrangedSubviews.first as? PDFView else { return }; if !query.isEmpty, let match = pdf.document?.findString(query, withOptions: .caseInsensitive).first { pdf.setCurrentSelection(match, animate: true); pdf.go(to: match) } }
}

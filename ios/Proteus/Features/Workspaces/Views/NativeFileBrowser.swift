import SwiftUI
import PDFKit

/// The desktop remains authoritative. View-local pages and bytes expire on exit;
/// every folder/document open revalidates the current paired-device grant.
struct NativeFileBrowser: View {
    @Environment(RemoteStore.self) var store
    let workspaceID: String
    @State private var roots: [JSON] = []
    @State private var canWrite = false
    @State private var root = ""
    @State private var directory = ""
    @State private var entries: [JSON] = []
    @State private var nextOffset: Int?
    @State private var expanded: [String: [JSON]] = [:]
    @State private var selected = Set<String>()
    @State private var document: JSON = .null
    @State private var tabs: [JSON] = []
    @State private var active = ""
    @State private var assets: [String: String] = [:]
    @State private var height: CGFloat = 1
    @State private var failure = ""
    @State private var query = ""
    @State private var sort = "name"
    @State private var descending = false
    @State private var busy = false
    @State private var revision = UUID()
    @State private var listRevision = UUID()
    @State private var split: CGFloat = 0.48
    @State private var dragSplit: CGFloat?
    @State private var editAction = ""
    @State private var name = ""
    @State private var movePicker = false
    @State private var trashConfirmation = false
    private var args: [String: JSON] { ["workspaceId": .string(workspaceID), "rootId": .string(root)] }
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Picker("Folder", selection: $root) { ForEach(roots, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                Button("Refresh", systemImage: "arrow.clockwise") { Task { if root.isEmpty { await bootstrap() } else { await load() } } }
                Menu {
                    ForEach(["name", "type", "size", "fileCreatedAt", "fileModifiedAt"], id: \.self) { key in Button(key) { descending = sort == key ? !descending : false; sort = key; Task { await load() } } }
                    Divider()
                    Button("New file", systemImage: "doc.badge.plus") { editAction = "create"; name = "Untitled.md" }.disabled(!canWrite)
                    Button("New folder", systemImage: "folder.badge.plus") { editAction = "mkdir"; name = "New folder" }.disabled(!canWrite)
                    Button("Move selected…", systemImage: "folder") { movePicker = true }.disabled(selected.isEmpty || !canWrite)
                    Button("Trash selected…", systemImage: "trash", role: .destructive) { trashConfirmation = true }.disabled(selected.isEmpty || !canWrite)
                } label: { Image(systemName: "ellipsis.circle") }
            }
            HStack { Button("Root") { directory = ""; Task { await load() } }; if !directory.isEmpty { Button("Up") { directory = directory.split(separator: "/").dropLast().joined(separator: "/"); Task { await load() } }; Text(directory).font(.caption).lineLimit(2) }; Spacer() }
            TextField("Filter files", text: $query).textFieldStyle(.roundedBorder).onSubmit { Task { await load() } }
            if !failure.isEmpty { Text(failure).font(.caption).foregroundStyle(.orange).textSelection(.enabled) }
            GeometryReader { geometry in
                if geometry.size.width > 650 {
                    HStack(spacing: 0) {
                        listing.focusable().onKeyPress(.downArrow) { step(1); return .handled }.onKeyPress(.upArrow) { step(-1); return .handled }.onKeyPress(KeyEquivalent("\r")) { if let entry = flatten(entries).first(where: { selected.contains($0["path"].string) }) { Task { await show(entry, newTab: true) } }; return .handled }.frame(width: geometry.size.width * split)
                        Rectangle().fill(.secondary.opacity(0.3)).frame(width: 8).gesture(DragGesture().onChanged { value in if dragSplit == nil { dragSplit = split }; split = min(0.8, max(0.2, (dragSplit ?? split) + value.translation.width / geometry.size.width)) }.onEnded { _ in dragSplit = nil })
                        reader.accessibilityIdentifier("workspace-file-reader").frame(maxWidth: .infinity)
                    }
                } else { VStack { listing.frame(maxHeight: document == .null ? .infinity : geometry.size.height * 0.45); if document != .null { Divider(); reader.accessibilityIdentifier("workspace-file-reader") } } }
            }
        }.padding(10).tint(NativeTheme.accent)
        .task { await bootstrap() }
        .onChange(of: root) { _, _ in directory = ""; tabs = []; Task { await load() } }
        .onDisappear { listRevision = UUID(); revision = UUID(); document = .null; assets = [:]; entries = []; expanded = [:]; tabs = [] }
        .alert("File name", isPresented: Binding(get: { !editAction.isEmpty }, set: { if !$0 { editAction = "" } })) {
            TextField("Name", text: $name)
            Button("Cancel", role: .cancel) { editAction = "" }
            Button("Save") { let action = editAction; editAction = ""; Task { await mutate(action, extra: ["name": .string(name)]) } }
        }
        .confirmationDialog("Move selected items to system trash?", isPresented: $trashConfirmation) { Button("Move to trash", role: .destructive) { Task { await mutate("trash") } } }
        .sheet(isPresented: $movePicker) { NavigationStack { NativeFileMovePicker(workspaceID: workspaceID, rootID: root) { target in movePicker = false; Task { await mutate("move", extra: ["directory": .string(target)]) } }.environment(store) } }
    }
    private var listing: some View {
        List { ForEach(flatten(entries), id: \.self) { entry in
            HStack(spacing: 6) {
                if entry["kind"].string == "folder" { Button { Task { await toggle(entry) } } label: { Image(systemName: expanded[entry["path"].string] == nil ? "chevron.right" : "chevron.down") }.buttonStyle(.borderless) }
                Image(systemName: symbol(entry)).foregroundStyle(NativeTheme.accent)
                Button { selected = [entry["path"].string]; Task { await show(entry) } } label: { VStack(alignment: .leading) { Text(entry["name"].string).lineLimit(2); Text(entry["type"].string + (entry["size"].int > 0 ? " · " + ByteCountFormatter.string(fromByteCount: Int64(entry["size"].int), countStyle: .file) : "")).font(.caption2).foregroundStyle(.secondary) } }.buttonStyle(.plain).accessibilityIdentifier("workspace-file-" + entry["path"].string)
                Spacer()
                Button { if selected.contains(entry["path"].string) { selected.remove(entry["path"].string) } else { selected.insert(entry["path"].string) } } label: { Image(systemName: selected.contains(entry["path"].string) ? "checkmark.circle.fill" : "circle") }.buttonStyle(.borderless)
            }.padding(.leading, CGFloat(entry["depth"].int) * 16)
            .onDrag {
                if !selected.contains(entry["path"].string) { selected = [entry["path"].string] }
                let items = flatten(entries).filter { selected.contains($0["path"].string) }.map { JSON.object(["path": $0["path"], "identity": $0["identity"]]) }
                let payload = JSON.object(["workspaceId": .string(workspaceID), "rootId": .string(root), "items": .array(items)])
                let text = (try? String(data: JSONEncoder().encode(payload), encoding: .utf8)) ?? ""
                return NSItemProvider(object: text as NSString)
            }
            .onDrop(of: ["public.text"], isTargeted: nil) { providers in
                guard canWrite, entry["kind"].string == "folder", let provider = providers.first else { return false }
                provider.loadObject(ofClass: NSString.self) { object, _ in
                    guard let text = object as? String, let data = text.data(using: .utf8), let payload = try? JSONDecoder().decode(JSON.self, from: data) else { return }
                    Task { @MainActor in guard payload["workspaceId"].string == workspaceID, payload["rootId"].string == root else { return }; await mutate("move", extra: ["directory": entry["path"], "items": payload["items"]]) }
                }
                return true
            }
            .contextMenu {
                Button("Open in new tab") { Task { await show(entry, newTab: true) } }
                Button("Copy name") { UIPasteboard.general.string = entry["name"].string }
                Button("Copy path") { UIPasteboard.general.string = (roots.first { $0["id"].string == root }?["path"].string ?? "") + "/" + entry["path"].string }
                Button("Rename") { selected = [entry["path"].string]; editAction = "rename"; name = entry["name"].string }.disabled(!canWrite)
                Button("Duplicate") { selected = [entry["path"].string]; editAction = "duplicate"; name = "Copy of " + entry["name"].string }.disabled(!canWrite)
                Button("Move…") { selected = [entry["path"].string]; movePicker = true }.disabled(!canWrite)
                Button("Trash…", role: .destructive) { selected = [entry["path"].string]; trashConfirmation = true }.disabled(!canWrite)
            }
        }; if let nextOffset { Button("More files") { Task { await load(offset: nextOffset) } } } }.listStyle(.plain).overlay { if busy { ProgressView() } }
    }
    @ViewBuilder private var reader: some View {
        VStack {
            if !tabs.isEmpty { ScrollView(.horizontal) { HStack { ForEach(tabs, id: \.self) { tab in HStack { Button(tab["name"].string) { Task { await show(tab) } }; Button { tabs.removeAll { $0["path"] == tab["path"] }; if active == tab["path"].string { revision = UUID(); document = .null; assets = [:] } } label: { Image(systemName: "xmark") }.accessibilityLabel("Close " + tab["name"].string) } } } } }
            if document == .null { Text("Select a file to preview").foregroundStyle(.secondary) }
            else if document["mediaType"].string == "application/pdf", let data = dataURL(document["dataURL"].string) { NativeFilePDF(data: data).id(active) }
            else if document["mediaType"].string.hasPrefix("image/"), let data = dataURL(document["dataURL"].string), let image = UIImage(data: data) { ScrollView([.horizontal, .vertical]) { Image(uiImage: image).resizable().scaledToFit() } }
            else if document["mediaType"].string == "text/plain" { ScrollView([.horizontal, .vertical]) { Text(document["content"].string).font(.system(.body, design: .monospaced)).textSelection(.enabled) } }
            else { ScrollView { MarkdownView(text: document["content"].string, runID: "", store: store, height: $height, onDocumentLink: { source in Task { do { let target = try await store.request("files.resolve-link", args.merging(["file": .string(active), "source": .string(source)]) { _, new in new }); await show(target, newTab: true) } catch { failure = error.localizedDescription } } }, documentAssetURLs: assets, allFileLinks: true).frame(height: max(height, 1)) } }
        }
    }
    private func step(_ delta: Int) { let values = flatten(entries); guard !values.isEmpty else { return }; let current = values.firstIndex { selected.contains($0["path"].string) } ?? -1; let index = min(values.count - 1, max(0, current + delta)); selected = [values[index]["path"].string]; if values[index]["kind"].string != "folder" { Task { await show(values[index]) } } }
    private func dataURL(_ value: String) -> Data? { guard let comma = value.firstIndex(of: ",") else { return nil }; return Data(base64Encoded: String(value[value.index(after: comma)...])) }
    private func symbol(_ entry: JSON) -> String { switch entry["kind"].string { case "folder": return expanded[entry["path"].string] == nil ? "folder" : "folder.fill"; case "image": return "photo"; case "code": return "chevron.left.forwardslash.chevron.right"; case "audio": return "music.note"; case "video": return "video"; default: return "doc.text" } }
    private func flatten(_ values: [JSON], depth: Int = 0) -> [JSON] { values.flatMap { entry in var object = entry.object; object["depth"] = .number(Double(depth)); return [.object(object)] + (expanded[entry["path"].string].map { flatten($0, depth: depth + 1) } ?? []) } }
    private func bootstrap() async { do { let result = try await store.request("files.roots", ["workspaceId": .string(workspaceID)]); roots = result["roots"].array; canWrite = result["canWrite"].bool; root = roots.first { $0["available"].bool }?["id"].string ?? ""; await load() } catch { failure = error.localizedDescription } }
    private func load(offset: Int = 0) async {
        guard !root.isEmpty else { return }
        let token = UUID(), requestedRoot = root, requestedDirectory = directory
        listRevision = token; busy = true
        defer { if listRevision == token { busy = false } }
        revision = UUID(); document = .null; assets = [:]; expanded = [:]
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
        let path = entry["path"].string, token = listRevision, requestedRoot = root
        if expanded[path] != nil { expanded.removeValue(forKey: path); return }
        do {
            let result = try await store.request("files.browse", args.merging(["directory": .string(path)]) { _, new in new })
            guard listRevision == token, root == requestedRoot else { return }
            guard result["nextOffset"] == .null else { failure = "This folder has more pages. Open it to browse all files."; return }
            expanded[path] = result["entries"].array
        } catch { if listRevision == token { failure = error.localizedDescription } }
    }
    private func show(_ entry: JSON, newTab: Bool = false) async {
        if entry["kind"].string == "folder" { directory = entry["path"].string; await load(); return }
        let token = UUID(), file = entry["path"].string, requestedRoot = root
        let request = args.merging(["file": .string(file)]) { _, new in new }
        revision = token; active = file; assets = [:]; document = .null
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
            assets = resolvedAssets; document = value; failure = ""
        } catch { if revision == token { failure = error.localizedDescription } }
    }
    private func mutate(_ action: String, extra: [String: JSON] = [:]) async { let items = flatten(entries).filter { selected.contains($0["path"].string) }.map { JSON.object(["path": $0["path"], "identity": $0["identity"]]) }; do { let result = try await store.request("files.mutate", args.merging(["action": .string(action), "directory": .string(directory), "items": .array(items)]) { _, new in new }.merging(extra) { _, new in new }); await load(); failure = result["results"].array.filter { !$0["ok"].bool }.map { $0["error"].string }.joined(separator: "; ") } catch { failure = error.localizedDescription } }
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

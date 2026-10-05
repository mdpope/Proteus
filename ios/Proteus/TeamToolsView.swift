import SwiftUI
import WebKit

struct TeamToolsView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @AppStorage("nativeTeamSection") private var section = "Overview"
    @State private var docked = false
    @State private var popout = false
    @State private var editing = false
    @State private var editList: JSON = .null
    var body: some View {
        NavigationStack {
            if life.credential?.appAuthorized != true { SharedAccountView() }
            else {
                VStack(spacing: 0) {
                    ScrollView(.horizontal) { HStack { ForEach(["Overview", "Standup", "Browser"], id: \.self) { name in Button(name) { section = name }.buttonStyle(.bordered).tint(section == name ? .accentColor : .secondary) }; if sizeClass == .regular { Button(docked ? "Undock standup" : "Dock standup", systemImage: "sidebar.left") { docked.toggle() } } ; Button("Open standup", systemImage: "rectangle.portrait.and.arrow.right") { popout = true } }.padding(8) }
                    Divider()
                    HStack(spacing: 0) {
                        if docked && sizeClass == .regular { StandupView().frame(width: 300); Divider() }
                        Group { if section == "Standup" && !docked { StandupView() } else if section == "Browser" { TeamBrowserView() } else { overview } }
                    }
                }.navigationTitle("Team Tools").navigationBarTitleDisplayMode(.inline)
                    .toolbar { Button("New browser tab", systemImage: "plus.square") { shared.open(nil); section = "Browser" }; Button("Refresh", systemImage: "arrow.clockwise") { Task { await shared.refresh(life) } } }
                    .sheet(isPresented: $editing) { TeamListEditor(original: editList) }
                    .sheet(isPresented: $popout) { NavigationStack { StandupView().navigationTitle("Standup").toolbar { Button("Done") { popout = false } } } }
                    .onChange(of: shared.selectedBrowser) { _, _ in section = "Browser" }
            }
        }.task { await shared.refresh(life) }.onDisappear { shared.unloadBrowsers() }
    }
    private var overview: some View {
        List {
            Section { Text("Shared lists and links belong to your authenticated website account.").font(.caption).foregroundStyle(.secondary); if let error = shared.error { Text(error).foregroundStyle(.orange) } }
            Section("Team lists") { ForEach(shared.lists, id: \.self) { list in Button { editList = list; editing = true } label: { VStack(alignment: .leading) { Text(list["name"].string); Text("\(list["members"].array.count) people · \(list["links"].array.count) links").font(.caption).foregroundStyle(.secondary) } } }; Button("Create team list", systemImage: "plus") { editList = .null; editing = true } }
            Section("Shared links") { ForEach(shared.snapshot["links"].array, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string); section = "Browser" } } } }
        }
    }
}
struct TeamListEditor: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    let original: JSON
    @State private var instructions = ""
    @State private var timezone = "UTC"
    @State private var name = ""
    @State private var member = ""
    @State private var mode = "random"
    @State private var title = ""
    @State private var url = ""
    @State private var members: [JSON] = []
    @State private var links: [JSON] = []
    @State private var saving = false
    var body: some View {
        NavigationStack {
            Form {
                TextField("List name", text: $name)
                TextField("Instructions", text: $instructions, axis: .vertical).lineLimit(3...8)
                TextField("Time zone", text: $timezone).textInputAutocapitalization(.never).autocorrectionDisabled()
                Section("Roster") { ForEach(members, id: \.self) { item in HStack { Text(item["name"].string); Spacer(); Text(item["mode"].string).font(.caption) } }.onDelete { members.remove(atOffsets: $0) }; TextField("Person", text: $member); Picker("Order", selection: $mode) { Text("Random").tag("random"); Text("Fixed").tag("fixed") }; Button("Add person") { members.append(.object(["id": .string(UUID().uuidString.lowercased()), "name": .string(member.trimmingCharacters(in: .whitespacesAndNewlines)), "mode": .string(mode)])); member = "" }.disabled(member.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
                Section("Standup links") { ForEach(links, id: \.self) { item in Text(item["title"].string) }.onDelete { links.remove(atOffsets: $0) }; TextField("Link title", text: $title); TextField("https://…", text: $url).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled(); Button("Add link") { if let safe = SharedAppStore.safeURL(url) { links.append(.object(["id": .string(UUID().uuidString.lowercased()), "title": .string(title), "url": .string(safe.absoluteString)])); title = ""; url = "" } }.disabled(SharedAppStore.safeURL(url) == nil) }
                if let error = shared.error { Text(error).foregroundStyle(.orange) }
                if original != .null { Button("Delete list", role: .destructive) { Task { if await shared.mutate(life, path: "/team-lists/" + original["id"].string, method: "DELETE", body: .object(["expectedRevision": original["revision"]])) != nil { dismiss() } } } }
            }.navigationTitle(original == .null ? "Create list" : "Edit list").toolbar { Button("Cancel") { dismiss() }; Button("Save") { Task { saving = true; defer { saving = false }; var body: [String: JSON] = ["name": .string(name), "instructions": .string(instructions), "timezone": .string(timezone), "members": .array(members), "links": .array(links)]; if original != .null { body["expectedRevision"] = original["revision"] }; if await shared.mutate(life, path: "/team-lists" + (original == .null ? "" : "/" + original["id"].string), method: original == .null ? "POST" : "PUT", body: .object(body)) != nil { dismiss() } } }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || TimeZone(identifier: timezone) == nil || saving) }
        }.onAppear { name = original["name"].string; instructions = original["instructions"].string; timezone = original["timezone"].string.isEmpty ? "UTC" : original["timezone"].string; members = original["members"].array; links = original["links"].array }
    }
}
struct StandupView: View {
    @EnvironmentObject var shared: SharedAppStore
    @State private var listID = ""
    @State private var order: [JSON] = []
    @State private var completed = Set<String>()
    private var list: JSON { shared.lists.first { $0["id"].string == listID } ?? shared.lists.first ?? .null }
    static func shuffled(_ members: [JSON]) -> [JSON] { var random = members.filter { $0["mode"].string != "fixed" }.shuffled(); return members.map { $0["mode"].string == "fixed" ? $0 : random.removeFirst() } }
    var body: some View {
        List {
            Picker("Team list", selection: $listID) { ForEach(shared.lists, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
            if !list["instructions"].string.isEmpty { Text(list["instructions"].string).font(.caption).foregroundStyle(.secondary) }
            Button("Start / shuffle") { order = Self.shuffled(list["members"].array); completed = [] }.disabled(list["members"].array.isEmpty)
            ForEach(order.isEmpty ? list["members"].array : order, id: \.self) { person in Button { let id = person["id"].string; if completed.contains(id) { completed.remove(id) } else { completed.insert(id) } } label: { Label(person["name"].string, systemImage: completed.contains(person["id"].string) ? "checkmark.circle.fill" : "circle").strikethrough(completed.contains(person["id"].string)) } }
            Section("Links") { ForEach(list["links"].array, id: \.self) { link in if let url = SharedAppStore.safeURL(link["url"].string) { Button(link["title"].string) { shared.open(url, title: link["title"].string) } } } }
        }.onChange(of: listID) { _, _ in order = []; completed = [] }.onAppear { if listID.isEmpty { listID = shared.lists.first?["id"].string ?? "" } }
    }
}
struct TeamBrowserView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var text = ""
    @State private var engine = "Google"
    @State private var overview = false
    var body: some View {
        VStack(spacing: 0) {
            HStack { Text("Browser").font(.headline); Spacer(); if !shared.downloads.isEmpty { ProgressView().accessibilityLabel("Downloading linked file"); Button("Cancel download") { for transfer in Array(shared.downloads.values) { transfer.cancel() } } }; Button("Tab overview", systemImage: "square.grid.2x2") { overview = true }.accessibilityIdentifier("browser-tab-overview") }.padding(.horizontal).padding(.top, 8)
            ScrollView(.horizontal) { HStack { ForEach(shared.browserTabs) { tab in HStack { Button(tab.title.isEmpty ? "New tab" : tab.title) { shared.reload(tab.id); shared.selectedBrowser = tab.id }.lineLimit(1); Button { shared.close(tab.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close browser tab") }.padding(8).background(shared.selectedBrowser == tab.id ? Color.accentColor.opacity(0.15) : .clear).contextMenu { Button("Unload") { shared.unload(tab.id) }; Button("Close") { shared.close(tab.id) } } }; Button { shared.open(nil) } label: { Image(systemName: "plus") } }.padding(6) }
            if let tab = shared.browserTabs.first(where: { $0.id == shared.selectedBrowser }), tab.url != nil { if shared.unloadedBrowsers.contains(tab.id) { ContentUnavailableView { Label("Page unloaded", systemImage: "pause.circle") } actions: { Button("Reload page") { shared.reload(tab.id) } } } else { NativeBrowser(tab: tab).id(tab.id) } }
            else { home }
        }.sheet(isPresented: $overview) { BrowserTabOverview() }
        .onAppear { if shared.browserTabs.isEmpty { shared.open(nil) }; engine = ["google": "Google", "duckduckgo": "DuckDuckGo", "bing": "Bing"][shared.snapshot["preferences"]["searchEngine"].string] ?? "Google" }
    }
    private var home: some View {
        List {
            Section("Browsing home") {
                TextField("Search or enter URL", text: $text).textInputAutocapitalization(.never).autocorrectionDisabled().onSubmit { navigate() }
                Picker("Search engine", selection: $engine) { ForEach(["Google", "DuckDuckGo", "Bing"], id: \.self) { Text($0).tag($0) } }
                HStack { Button("Go", action: navigate).disabled(text.isEmpty); Button("Save shared link") { if let url = SharedAppStore.safeURL(text) { Task { _ = await shared.mutate(life, path: "/links", body: .object(["url": .string(url.absoluteString), "title": .string(url.host ?? "Link")])) } } }.disabled(SharedAppStore.safeURL(text) == nil) }.buttonStyle(.bordered)
            }
            Section("Shared links") { linkRows(shared.snapshot["links"].array) }
            Section("Opened across your devices") { linkRows(shared.snapshot["history"].array) }
            if let error = shared.error { Text(error).foregroundStyle(.orange) }
        }
    }
    private func linkRows(_ items: [JSON]) -> some View { ForEach(items, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string) } } } }
    private func navigate() {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        var target = URL(string: input.contains("://") ? input : input.contains(".") && !input.contains(" ") ? "https://" + input : "")
        if target?.host == nil { var components = URLComponents(string: engine == "Bing" ? "https://www.bing.com/search" : engine == "DuckDuckGo" ? "https://duckduckgo.com/" : "https://www.google.com/search")!; components.queryItems = [URLQueryItem(name: "q", value: input)]; target = components.url }
        guard let target, ["https", "http"].contains(target.scheme), target.user == nil, target.password == nil else { return }
        shared.open(target, title: target.host ?? "Browser"); Task { await shared.record(target, title: target.host ?? "Browser", life: life) }; text = ""
    }
}
struct NativeBrowser: UIViewRepresentable {
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var destinations: DestinationStore
    let tab: BrowserDescriptor
    func makeCoordinator() -> Coordinator { Coordinator(shared: shared, life: life, destinations: destinations, id: tab.id) }
    func makeUIView(context: Context) -> WKWebView { let view = shared.webView(tab); view.navigationDelegate = context.coordinator; view.uiDelegate = context.coordinator; return view }
    func updateUIView(_ view: WKWebView, context: Context) {}
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let shared: SharedAppStore; let life: LifeStore; let destinations: DestinationStore; let id: String
        init(shared: SharedAppStore, life: LifeStore, destinations: DestinationStore, id: String) { self.shared = shared; self.life = life; self.destinations = destinations; self.id = id }
        func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
            guard let url = elementInfo.linkURL, ["http", "https"].contains(url.scheme), url.user == nil, url.password == nil else { completionHandler(nil); return }
            let hostID = destinations.selectedID
            let hostName = destinations.selectedLabel
            completionHandler(UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { _ in
                var actions: [UIMenuElement] = [
                    UIAction(title: "Open in new Proteus tab", image: UIImage(systemName: "plus.square")) { _ in self.shared.open(url, title: url.host ?? "Browser") },
                    UIAction(title: "Open in default browser", image: UIImage(systemName: "arrow.up.right.square")) { _ in UIApplication.shared.open(url); Task { await self.shared.record(url, title: url.host ?? "Browser", life: self.life) } },
                    UIAction(title: "Copy Link", image: UIImage(systemName: "doc.on.doc")) { _ in UIPasteboard.general.url = url },
                    UIAction(title: "Download Linked File As…", image: UIImage(systemName: "arrow.down.doc")) { _ in self.shared.download(url, in: webView) }
                ]
                if let hostID, let remote = self.destinations.remote(for: hostID), SharedAppStore.safeURL(url.absoluteString) != nil {
                    actions.append(UIAction(title: "New chat with link on " + hostName, image: UIImage(systemName: "bubble.left.and.bubble.right")) { _ in
                        _ = self.shared.prepareLinkDraft(url, remote: remote, hostID: hostID, hostName: hostName)
                    })
                }
                return UIMenu(children: actions)
            })
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { guard let url = webView.url else { return }; if let index = shared.browserTabs.firstIndex(where: { $0.id == id }) { shared.browserTabs[index].title = webView.title ?? url.host ?? "Browser"; shared.browserTabs[index].url = url.absoluteString }; Task { await shared.record(url, title: webView.title ?? url.host ?? "Browser", life: life) } }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { guard let url = navigationAction.request.url, ["http", "https", "about"].contains(url.scheme) else { decisionHandler(.cancel); return }; decisionHandler(.allow) }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { if let url = navigationAction.request.url, ["http", "https"].contains(url.scheme) { shared.open(url, title: url.host ?? "Browser") }; return nil }
    }
}

struct BrowserTabOverview: View {
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
                    ForEach(shared.browserTabs) { tab in
                        VStack(alignment: .leading, spacing: 12) {
                            Button { shared.reload(tab.id); shared.selectedBrowser = tab.id; dismiss() } label: {
                                VStack(alignment: .leading, spacing: 12) {
                                    Image(systemName: tab.url == nil ? "house" : "globe").font(.largeTitle).frame(maxWidth: .infinity, minHeight: 72).background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
                                    Text(tab.title.isEmpty ? "New tab" : tab.title).font(.headline).lineLimit(2)
                                    Text(tab.url.flatMap { SharedAppStore.safeURL($0)?.absoluteString } ?? (tab.url == nil ? "Browsing home" : "Private page · not saved")).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                                }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                            }.buttonStyle(.plain)
                            HStack {
                                Text(tab.url == nil ? "Home" : shared.isBrowserLoaded(tab.id) ? "Loaded" : "Unloaded").font(.caption).foregroundStyle(.secondary)
                                Spacer()
                                Button { shared.unload(tab.id) } label: { Image(systemName: "pause.circle") }.accessibilityLabel("Unload " + tab.title).disabled(tab.url == nil)
                                Button(role: .destructive) { shared.close(tab.id) } label: { Image(systemName: "xmark.circle") }.accessibilityLabel("Close " + tab.title)
                            }.buttonStyle(.borderless)
                        }.padding(12).background(.background, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(shared.selectedBrowser == tab.id ? Color.accentColor : Color.secondary.opacity(0.3), lineWidth: 1))
                    }
                }.padding()
            }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle("Browser tabs").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .primaryAction) { Button("New tab", systemImage: "plus") { shared.open(nil); dismiss() } }
            }
        }
    }
}

/// WebKit owns the authenticated transfer; only explicit export moves the file to Files.
@MainActor final class NativeLinkDownload: NSObject, WKDownloadDelegate {
    let id = UUID()
    private weak var shared: SharedAppStore?
    private var transfer: WKDownload?
    private var destination: URL?
    init(shared: SharedAppStore) { self.shared = shared }
    private var cancelled = false
    func attach(_ download: WKDownload) { if cancelled { download.cancel(); return }; transfer = download; download.delegate = self }
    func cancel() {
        cancelled = true; transfer?.delegate = nil; transfer?.cancel(); transfer = nil
        if let destination { try? FileManager.default.removeItem(at: destination.deletingLastPathComponent()) }
        shared?.downloads.removeValue(forKey: id)
    }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("ProteusDownloads").appendingPathComponent(id.uuidString)
        let name = (suggestedFilename as NSString).lastPathComponent
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
            let file = folder.appendingPathComponent(name.isEmpty || name == "." || name == ".." ? "Download" : name)
            destination = file; completionHandler(file)
        } catch { completionHandler(nil); fail() }
    }
    func downloadDidFinish(_ download: WKDownload) {
        if let destination { shared?.exportFile = BrowserExportFile(id: id, url: destination) }
        shared?.downloads.removeValue(forKey: id); transfer = nil
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) { fail() }
    private func fail() {
        if let destination { try? FileManager.default.removeItem(at: destination.deletingLastPathComponent()) }
        shared?.downloadError = "The linked file could not be downloaded. Try again while the page is open."
        shared?.downloads.removeValue(forKey: id); transfer = nil
    }
}
struct BrowserFileExport: UIViewControllerRepresentable {
    let file: BrowserExportFile
    let finished: () -> Void
    func makeCoordinator() -> Coordinator { Coordinator(finished: finished) }
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forExporting: [file.url], asCopy: true)
        picker.delegate = context.coordinator; return picker
    }
    func updateUIViewController(_ view: UIDocumentPickerViewController, context: Context) {}
    final class Coordinator: NSObject, UIDocumentPickerDelegate {
        let finished: () -> Void
        init(finished: @escaping () -> Void) { self.finished = finished }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finished() }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finished() }
    }
}

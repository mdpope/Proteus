import SwiftUI
import WebKit

private struct TeamListEditorItem: Identifiable { let id: String; let original: JSON }
struct TeamToolsView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @AppStorage("nativeTeamSection") private var section = "Overview"
    @State private var docked = false
    @State private var popout = false
    @State private var editingList: TeamListEditorItem?
    @State private var renameBrowserID: String?
    @State private var renameBrowserTitle = ""
    @State private var teamTabsClipped = false
    private var authorized: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-browser-workspace") || ProcessInfo.processInfo.arguments.contains("--synthetic-team-lists") { return true }
        #endif
        return life.credential?.appAuthorized == true
    }
    var body: some View {
        NavigationStack {
            if !authorized { SharedAccountView() }
            else {
                VStack(spacing: 0) {
                    HStack(spacing: 0) { ScrollView(.horizontal) { HStack(spacing: 0) {
                        ForEach(["Overview", "Standup"], id: \.self) { name in
                            Button(name) { section = name }.padding(.horizontal, 14).padding(.vertical, 12).accessibilityIdentifier("team-section-" + name.lowercased())
                                .overlay(alignment: .bottom) { Rectangle().fill(section == name ? NativeTheme.accent : .clear).frame(height: 2) }
                            Divider().frame(height: 24)
                        }
                        ForEach(shared.tabs(in: "team")) { tab in
                            HStack(spacing: 4) {
                                Button { shared.select(tab.id, in: "team"); section = tab.id } label: { Label(tab.title, systemImage: "globe").lineLimit(1).frame(minHeight: 44).contentShape(Rectangle()) }.frame(minHeight: 44).accessibilityIdentifier("browser-tab-select-" + tab.id)
                                Button { shared.close(tab.id); if section == tab.id { section = shared.selectedBrowser ?? "Overview" } } label: { Image(systemName: "xmark").font(.caption2).frame(width: 44, height: 44) }.accessibilityLabel("Close " + tab.title)
                            }.padding(.leading, 12).overlay(alignment: .bottom) { Rectangle().fill(section == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                            .contextMenu {
                                Button("Rename tab", systemImage: "pencil") { renameBrowserID = tab.id; renameBrowserTitle = tab.title }
                                Button("Move left", systemImage: "arrow.left") { shared.shiftBrowser(tab.id, by: -1) }
                                Button("Move right", systemImage: "arrow.right") { shared.shiftBrowser(tab.id, by: 1) }
                            }
                            Divider().frame(height: 24)
                        }
                    }.buttonStyle(.plain).background(NativeTabClipProbe { teamTabsClipped = $0 }.frame(width: 1, height: 1).opacity(0)) }.scrollIndicators(.hidden)
                        .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: teamTabsClipped ? 0.9 : 1), .init(color: teamTabsClipped ? .clear : .black, location: 1)], startPoint: .leading, endPoint: .trailing) }
                        Menu { Button("Browser", systemImage: "globe") { shared.open(nil); section = shared.selectedBrowser ?? "Overview" }; Button("Standup", systemImage: "person.3") { section = "Standup" } } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add Team tab").accessibilityIdentifier("team-new-browser-tab")
                        if sizeClass == .regular { Button(docked ? "Undock standup" : "Dock standup", systemImage: "sidebar.left") { docked.toggle() }.padding(8) }

                    }
                    Divider()
                    HStack(spacing: 0) {
                        if docked && sizeClass == .regular { StandupView().frame(width: 300); Divider() }
                        Group { if section == "Standup" { VStack(spacing: 0) { Button("Open standup", systemImage: "rectangle.portrait.and.arrow.right") { popout = true }.frame(minHeight: 44); if !docked { StandupView() } else { Text("Standup is docked").font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity) } } } else if shared.tabs(in: "team").contains(where: { $0.id == section }) { TeamBrowserView(scope: "team", showTabs: false) } else { overview } }
                    }
                }.navigationTitle("Team Tools").navigationBarTitleDisplayMode(.inline)
                    .alert("Rename tab", isPresented: Binding(get: { renameBrowserID != nil }, set: { if !$0 { renameBrowserID = nil } })) {
                        TextField("Tab name", text: $renameBrowserTitle)
                        Button("Save") { if let id = renameBrowserID { shared.renameBrowser(id, title: renameBrowserTitle) }; renameBrowserID = nil }
                        Button("Cancel", role: .cancel) { renameBrowserID = nil }
                    }
                    .sheet(item: $editingList) { selection in TeamListEditor(original: selection.original).id(selection.id) }
                    .sheet(isPresented: $popout) { NavigationStack { StandupView().navigationTitle("Standup").toolbar { Button("Done") { popout = false } } } }
                    .onAppear { if section == "Browser" { section = shared.selectedBrowser ?? "Overview" } }
                    .onChange(of: shared.selectedBrowser) { _, value in if let value { section = value } else if section != "Overview" && section != "Standup" { section = "Overview" } }
            }
        }.task { await shared.refresh(life) }
        .task(id: destinations.selectedID) {
            while !Task.isCancelled {
                if let host = destinations.selectedID, let remote = destinations.remote(for: host) { await shared.refreshContentTabs(scope: "team", remote: remote, kind: "team", id: "team") }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }
    private var overview: some View {
        List {
            Button("Refresh Team lists", systemImage: "arrow.clockwise") { Task { await shared.refresh(life) } }
            Section { Text("Shared lists and links belong to your authenticated website account.").font(.caption).foregroundStyle(.secondary); if let error = shared.error { Text(error).foregroundStyle(.orange) } }
            Section("Team lists") { ForEach(shared.lists, id: \.self) { list in Button { editingList = TeamListEditorItem(id: list["id"].string, original: list) } label: { VStack(alignment: .leading) { Text(list["name"].string); Text("\(list["members"].array.count) people · \(list["links"].array.count) links").font(.caption).foregroundStyle(.secondary) } } }; Button("Create team list", systemImage: "plus") { editingList = TeamListEditorItem(id: "new", original: .null) } }
            Section("Shared links") { ForEach(shared.snapshot["links"].array, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string); section = shared.selectedBrowser ?? "Overview" } } } }
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
    private var list: JSON { shared.lists.first { $0["id"].string == listID } ?? shared.lists.first ?? .null }
    private var dayKey: String {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(identifier: list["timezone"].string) ?? .current
        let date = calendar.dateComponents([.year, .month, .day], from: Date())
        return list["id"].string + ":\(date.year ?? 0)-\(date.month ?? 0)-\(date.day ?? 0)"
    }
    private var order: [JSON] { shared.standupOrders[dayKey] ?? [] }
    private var completed: Set<String> { shared.standupCompleted[dayKey] ?? [] }
    static func shuffled(_ members: [JSON]) -> [JSON] { var random = members.filter { $0["mode"].string != "fixed" }.shuffled(); return members.map { $0["mode"].string == "fixed" ? $0 : random.removeFirst() } }
    var body: some View {
        List {
            Picker("Team list", selection: $listID) { ForEach(shared.lists, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
            if !list["instructions"].string.isEmpty { Text(list["instructions"].string).font(.caption).foregroundStyle(.secondary) }
            Button("Start / shuffle") { shared.standupOrders[dayKey] = Self.shuffled(list["members"].array); shared.standupCompleted[dayKey] = [] }.disabled(list["members"].array.isEmpty)
            ForEach(order.isEmpty ? list["members"].array : order, id: \.self) { person in Button { let id = person["id"].string; var next = completed; if next.contains(id) { next.remove(id) } else { next.insert(id) }; shared.standupCompleted[dayKey] = next } label: { Label(person["name"].string, systemImage: completed.contains(person["id"].string) ? "checkmark.circle.fill" : "circle").strikethrough(completed.contains(person["id"].string)) } }
            Section("Links") { ForEach(list["links"].array, id: \.self) { link in if let url = SharedAppStore.safeURL(link["url"].string) { Button(link["title"].string) { shared.open(url, title: link["title"].string) } } } }
        }.onAppear { if listID.isEmpty { listID = shared.lists.first?["id"].string ?? "" } }
    }
}
struct TeamBrowserView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.colorScheme) private var colorScheme
    @State private var text = ""
    @State private var engine = "Google"
    @State private var overview = false
    var scope = "team"
    var showTabs = true
    @FocusState private var addressFocused: Bool
    private var tabs: [BrowserDescriptor] { shared.tabs(in: scope) }
    private var selectedID: String? { shared.selected(in: scope) }
    private var selectedTab: BrowserDescriptor? { tabs.first { $0.id == selectedID } }
    private var navigation: BrowserNavigationState { shared.browserNavigation[selectedID ?? ""] ?? BrowserNavigationState() }
    var body: some View {
        VStack(spacing: 0) {
            if showTabs { HStack(spacing: 0) { ScrollView(.horizontal) { HStack(spacing: 0) {
                ForEach(tabs) { tab in
                    HStack(spacing: 8) {
                        Button(tab.title.isEmpty ? "New tab" : tab.title) { shared.select(tab.id, in: scope) }
                            .lineLimit(1).accessibilityIdentifier("browser-tab-select-" + tab.id)
                            .accessibilityValue(selectedID == tab.id ? "Active" : "Inactive")
                            .accessibilityAddTraits(selectedID == tab.id ? .isSelected : [])
                        Button { shared.close(tab.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + (tab.title.isEmpty ? "browser tab" : tab.title))
                    }.padding(12).background(selectedID == tab.id ? NativeTheme.accent.opacity(0.08) : .clear)
                        .overlay(alignment: .bottom) { Rectangle().fill(selectedID == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                        .draggable(tab.id).dropDestination(for: String.self) { ids, _ in guard let source = ids.first, tabs.contains(where: { $0.id == source }) else { return false }; shared.moveBrowser(source, before: tab.id); return true }
                        .contextMenu {
                            Button("Move left", systemImage: "arrow.left") { shared.shiftBrowser(tab.id, by: -1) }.disabled(tabs.first?.id == tab.id)
                            Button("Move right", systemImage: "arrow.right") { shared.shiftBrowser(tab.id, by: 1) }.disabled(tabs.last?.id == tab.id)
                            Button("Unload") { shared.unload(tab.id) }
                            Button("Close") { shared.close(tab.id) }
                            Button("Close other tabs") { for other in tabs where other.id != tab.id { shared.close(other.id) } }.disabled(tabs.count < 2)
                            Button("Close tabs to the right") { if let index = tabs.firstIndex(where: { $0.id == tab.id }) { for other in tabs.dropFirst(index + 1) { shared.close(other.id) } } }.disabled(tabs.last?.id == tab.id)
                        }
                    Divider().frame(height: 24)
                }
            }.buttonStyle(.plain) }.scrollIndicators(.hidden)
                .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.9), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing) }
                Menu { Button("Browser", systemImage: "globe") { shared.open(nil, scope: scope) } } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add tab").accessibilityIdentifier("browser-new-tab")
            }
            }
            Divider()
            toolbar
            Divider()
            if !shared.downloads.isEmpty { HStack { ProgressView().accessibilityLabel("Downloading linked file"); Button("Cancel download") { for transfer in Array(shared.downloads.values) { transfer.cancel() } } }.padding(8) }
            if let tab = selectedTab, tab.url != nil { if shared.unloadedBrowsers.contains(tab.id) { ContentUnavailableView { Label("Page unloaded", systemImage: "pause.circle") } actions: { Button("Reload page") { shared.reload(tab.id); shared.touch(tab.id) } } } else { NativeBrowser(tab: tab).id(tab.id) } }
            else { home }
        }.sheet(isPresented: $overview) { BrowserTabOverview(scope: scope) }
        .onAppear { if tabs.isEmpty && showTabs { shared.open(nil, scope: scope) }; text = selectedTab?.url ?? ""; engine = ["google": "Google", "duckduckgo": "DuckDuckGo", "bing": "Bing"][shared.snapshot["preferences"]["searchEngine"].string] ?? "Google" }
        .onChange(of: selectedID) { _, _ in addressFocused = false; text = selectedTab?.url ?? "" }
        .onChange(of: navigation.url) { _, url in if !addressFocused && !url.isEmpty { text = url } }
    }
    private var toolbar: some View {
        let chrome = Color(red: 20 / 255, green: 27 / 255, blue: 24 / 255)
        let field = colorScheme == .dark ? Color(red: 36 / 255, green: 46 / 255, blue: 41 / 255) : Color(uiColor: .secondarySystemGroupedBackground)
        let control = colorScheme == .dark ? Color(red: 167 / 255, green: 182 / 255, blue: 172 / 255) : Color(red: 78 / 255, green: 102 / 255, blue: 85 / 255)
        return HStack(spacing: 2) {
            Button { if let id = selectedID { shared.goBack(id) } } label: { Image(systemName: "chevron.left").frame(minWidth: 44, minHeight: 44) }
                .frame(width: 44, height: 44).contentShape(Rectangle()).disabled(!navigation.canGoBack).accessibilityLabel("Back").accessibilityIdentifier("browser-back")
                .contextMenu { if let id = selectedID { ForEach(shared.browserHistory(id, back: true), id: \.self) { item in
                    Button { shared.goBrowserHistory(item, in: id) } label: { Label(item.title ?? item.url.host ?? item.url.absoluteString, systemImage: "clock.arrow.circlepath") }
                } } }
            Button { if let id = selectedID { shared.goForward(id) } } label: { Image(systemName: "chevron.right").frame(minWidth: 44, minHeight: 44) }
                .frame(width: 44, height: 44).contentShape(Rectangle()).disabled(!navigation.canGoForward).accessibilityLabel("Forward").accessibilityIdentifier("browser-forward")
                .contextMenu { if let id = selectedID { ForEach(shared.browserHistory(id, back: false), id: \.self) { item in
                    Button { shared.goBrowserHistory(item, in: id) } label: { Label(item.title ?? item.url.host ?? item.url.absoluteString, systemImage: "clock.arrow.circlepath") }
                } } }
            Button { if let id = selectedID { navigation.isLoading ? shared.stopBrowser(id) : shared.refreshBrowser(id) } } label: { Image(systemName: navigation.isLoading ? "xmark" : "arrow.clockwise").frame(minWidth: 44, minHeight: 44) }.frame(width: 44, height: 44).contentShape(Rectangle()).disabled(selectedTab?.url == nil).accessibilityLabel(navigation.isLoading ? "Stop loading" : "Refresh page").accessibilityIdentifier("browser-refresh")
            TextField("Search or enter URL", text: $text).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).submitLabel(.go).focused($addressFocused).onSubmit { navigate() }
                .font(.system(size: 14)).foregroundStyle(colorScheme == .dark ? Color.white : Color.primary).padding(.horizontal, 10).frame(height: 34).background(field, in: RoundedRectangle(cornerRadius: 6)).accessibilityIdentifier("browser-address")
            Button(action: navigate) { Image(systemName: "arrow.turn.down.left") }.frame(width: 44, height: 44).contentShape(Rectangle()).disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Go to address or search").accessibilityIdentifier("browser-go")
            Button { overview = true } label: { Image(systemName: "square.grid.2x2") }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Tab overview").accessibilityIdentifier("browser-tab-overview")
        }.buttonStyle(.plain).foregroundStyle(control).font(.system(size: 14, weight: .medium))
            .padding(.horizontal, 4).padding(.vertical, 2)
            .frame(minHeight: 44).background { if colorScheme == .dark { chrome } else { Rectangle().fill(.bar) } }
    }
    private var home: some View {
        List {
            Section("Browsing home") {
                Picker("Search engine", selection: $engine) { ForEach(["Google", "DuckDuckGo", "Bing"], id: \.self) { Text($0).tag($0) } }
                Button("Save shared link") { if let url = SharedAppStore.safeURL(text) { Task { _ = await shared.mutate(life, path: "/links", body: .object(["url": .string(url.absoluteString), "title": .string(url.host ?? "Link")])) } } }.disabled(SharedAppStore.safeURL(text) == nil).buttonStyle(.bordered)
            }
            Section("Shared links") { linkRows(shared.snapshot["links"].array) }
            Section("Opened across your devices") { BrowserHistoryRows(items: shared.snapshot["history"].array) { link in if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string, scope: scope) } } }
            if let error = shared.error { Text(error).foregroundStyle(.orange) }
        }
    }
    private func linkRows(_ items: [JSON]) -> some View { ForEach(items, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string, scope: scope) } } } }
    private func navigate() {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        var target = URL(string: input.contains("://") ? input : input.contains(".") && !input.contains(" ") ? "https://" + input : "")
        if target?.host == nil { var components = URLComponents(string: engine == "Bing" ? "https://www.bing.com/search" : engine == "DuckDuckGo" ? "https://duckduckgo.com/" : "https://www.google.com/search")!; components.queryItems = [URLQueryItem(name: "q", value: input)]; target = components.url }
        guard let target, ["https", "http"].contains(target.scheme), target.user == nil, target.password == nil else { return }
        addressFocused = false
        if let id = selectedID { _ = shared.navigate(target, in: id) }
        else { shared.open(target, title: target.host ?? "Browser", scope: scope) }
        text = target.absoluteString
    }
}
struct BrowserHistoryRows: View {
    @Environment(\.timeZone) private var timeZone
    @Environment(\.locale) private var locale
    let items: [JSON]
    var open: (JSON) -> Void
    @State private var limit = 25
    var body: some View {
        ForEach(Array(items.prefix(limit)), id: \.self) { item in
            Button { open(item) } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item["title"].string.isEmpty ? item["url"].string : item["title"].string)
                    Text(Self.details(item, timeZone: timeZone, locale: locale)).font(.caption).foregroundStyle(.secondary)
                        .accessibilityIdentifier("browser-history-details-" + item["id"].string)
                }
            }
        }
        if items.count > limit { Button("More history") { limit += 25 }.accessibilityIdentifier("browser-history-more") }
    }
    static func details(_ item: JSON, timeZone: TimeZone, locale: Locale) -> String {
        let date = ProviderAllowance.date(item["visitedAt"].string) ?? ProviderAllowance.date(item["createdAt"].string)
        let formatter = DateFormatter(); formatter.dateStyle = .medium; formatter.timeStyle = .short; formatter.timeZone = timeZone; formatter.locale = locale
        return (date.map { formatter.string(from: $0) } ?? "Time unavailable") + " · " + SharedAppStore.historyDeviceName(item["deviceName"].string)
    }
}
#if DEBUG
struct BrowserHistoryFixture: View {
    @State private var timezone = "America/Denver"
    private var items: [JSON] { (1...26).map { number in
        .object(["id": .string(String(number)), "title": .string("Visit \(number)"), "url": .string("https://example.test/\(number)"), "visitedAt": .string("2026-10-04T18:00:00Z"), "deviceName": .string(number == 2 ? "" : "Visiting iPad")])
    } }
    var body: some View {
        VStack {
            Button("Use Tokyo history timezone") { timezone = "Asia/Tokyo" }
            List { BrowserHistoryRows(items: items) { _ in } }
                .environment(\.timeZone, TimeZone(identifier: timezone)!)
        }
    }
}
#endif

struct NativeBrowser: UIViewRepresentable {
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var destinations: DestinationStore
    let tab: BrowserDescriptor
    func makeCoordinator() -> Coordinator { Coordinator(shared: shared, life: life, destinations: destinations, id: tab.id) }
    func makeUIView(context: Context) -> WKWebView { let view = shared.webView(tab); view.navigationDelegate = context.coordinator; view.uiDelegate = context.coordinator; return view }
    func updateUIView(_ view: WKWebView, context: Context) {}
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        if view.navigationDelegate === coordinator { view.navigationDelegate = nil }
        if view.uiDelegate === coordinator { view.uiDelegate = nil }
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let shared: SharedAppStore; let life: LifeStore; let destinations: DestinationStore; let id: String
        init(shared: SharedAppStore, life: LifeStore, destinations: DestinationStore, id: String) { self.shared = shared; self.life = life; self.destinations = destinations; self.id = id }
        func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
            guard let url = elementInfo.linkURL, ["http", "https"].contains(url.scheme), url.user == nil, url.password == nil else { completionHandler(nil); return }
            let hostID = destinations.selectedID
            let hostName = destinations.selectedLabel
            completionHandler(UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { _ in
                var actions: [UIMenuElement] = [
                    UIAction(title: "Open in new Proteus tab", image: UIImage(systemName: "plus.square")) { _ in self.shared.open(url, title: url.host ?? "Browser", scope: self.shared.browserTabs.first(where: { $0.id == self.id })?.scope ?? "team") },
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
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { guard let url = webView.url else { return }; if let index = shared.browserTabs.firstIndex(where: { $0.id == id }) { shared.browserTabs[index].title = shared.browserTabs[index].customTitle ?? webView.title ?? url.host ?? "Browser"; shared.browserTabs[index].url = url.absoluteString }; Task { await shared.record(url, title: webView.title ?? url.host ?? "Browser", life: life) } }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { guard let url = navigationAction.request.url, ["http", "https", "about"].contains(url.scheme) else { decisionHandler(.cancel); return }; decisionHandler(.allow) }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { if let url = navigationAction.request.url, ["http", "https"].contains(url.scheme) { shared.open(url, title: url.host ?? "Browser", scope: shared.browserTabs.first(where: { $0.id == id })?.scope ?? "team") }; return nil }
    }
}

struct BrowserTabOverview: View {
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var scope = "team"
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
                    ForEach(shared.tabs(in: scope)) { tab in
                        VStack(alignment: .leading, spacing: 12) {
                            Button { shared.select(tab.id, in: scope); dismiss() } label: {
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
                        }.padding(12).background(.background, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(shared.selected(in: scope) == tab.id ? NativeTheme.accent : Color.secondary.opacity(0.3), lineWidth: 1))
                    }
                }.padding()
            }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle("Browser tabs").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .primaryAction) { Button("New tab", systemImage: "plus") { shared.open(nil, scope: scope); dismiss() } }
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

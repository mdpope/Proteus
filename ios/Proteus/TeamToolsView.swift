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
    @State private var reorderTabs = false
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
            if !authorized && destinations.selected == nil { SharedAccountView() }
            else {
                VStack(spacing: 0) {
                    HStack(spacing: 0) { ScrollView(.horizontal) { HStack(spacing: 0) {
                        ForEach(["Overview", "Standup"], id: \.self) { name in
                            Button { section = name } label: { NativeContentTabLabel(title: name, symbol: name == "Standup" ? "person.3" : "list.bullet.rectangle") }.padding(.horizontal, 14).padding(.vertical, 12).accessibilityIdentifier("team-section-" + name.lowercased()).accessibilityLabel(name)
                                .overlay(alignment: .bottom) { Rectangle().fill(section == name ? NativeTheme.accent : .clear).frame(height: 2) }
                            Divider().frame(height: 24)
                        }
                        ForEach(shared.tabs(in: "team").filter { !$0.hidden }) { tab in
                            HStack(spacing: 4) {
                                Button { shared.select(tab.id, in: "team"); section = tab.id } label: { Label(tab.title, systemImage: "globe").lineLimit(1).frame(minHeight: 44).contentShape(Rectangle()) }.frame(minHeight: 44).accessibilityIdentifier("browser-tab-select-" + tab.id).accessibilityValue(section == tab.id ? "Active" : "Inactive")
                                Button { shared.close(tab.id); if section == tab.id { section = shared.selectedBrowser ?? "Overview" } } label: { Image(systemName: "xmark").font(.caption2).frame(width: 44, height: 44) }.accessibilityLabel("Close " + tab.title)
                            }.padding(.leading, 12).overlay(alignment: .bottom) { Rectangle().fill(section == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                            .contextMenu {
                                Button(tab.persist ? "Do not persist tab" : "Persist tab", systemImage: "pin") { shared.persistBrowser(tab.id, enabled: !tab.persist) }
                                Button("Rename tab", systemImage: "pencil") { renameBrowserID = tab.id; renameBrowserTitle = tab.title }
                                Button("Move left", systemImage: "arrow.left") { shared.shiftBrowser(tab.id, by: -1) }
                                Button("Move right", systemImage: "arrow.right") { shared.shiftBrowser(tab.id, by: 1) }
                            }
                            Divider().frame(height: 24)
                        }
                    }.buttonStyle(.plain).background(NativeTabClipProbe { teamTabsClipped = $0 }.frame(width: 1, height: 1).opacity(0)) }.scrollIndicators(.hidden)
                        .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: teamTabsClipped ? 0.9 : 1), .init(color: teamTabsClipped ? .clear : .black, location: 1)], startPoint: .leading, endPoint: .trailing) }
                        Menu { ForEach(shared.browserProfiles, id: \.self) { profile in Button("Browser - " + profile["name"].string, systemImage: "globe") { shared.open(nil, scope: "team", profileId: profile["id"].string); section = shared.selectedBrowser ?? "Overview" } }; Button("Standup", systemImage: "person.3") { section = "Standup" } } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add Team tab").accessibilityIdentifier("team-new-browser-tab")
                        Button { reorderTabs = true } label: { Image(systemName: "arrow.left.arrow.right").frame(width: 44, height: 44) }.accessibilityLabel("Reorder Team tabs").disabled(shared.tabs(in: "team").count < 2)
                        if sizeClass == .regular { Button(docked ? "Undock standup" : "Dock standup", systemImage: "sidebar.left") { docked.toggle() }.padding(8) }

                    }.nativeTabBar()
                    Divider()
                    HStack(spacing: 0) {
                        if docked && sizeClass == .regular { StandupView().frame(width: 300); Divider() }
                        Group { if section == "Standup" { VStack(spacing: 0) { Button("Open standup", systemImage: "rectangle.portrait.and.arrow.right") { popout = true }.frame(minHeight: 44); if !docked { StandupView() } else { Text("Standup is docked").font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity) } } } else if shared.tabs(in: "team").contains(where: { $0.id == section }) { TeamBrowserView(scope: "team", showTabs: false) } else { if authorized { overview } else { SharedAccountView() } } }
                    }
                }.background(NativeTheme.background).navigationTitle("Team Tools").navigationBarTitleDisplayMode(.inline)
                    .alert("Rename tab", isPresented: Binding(get: { renameBrowserID != nil }, set: { if !$0 { renameBrowserID = nil } })) {
                        TextField("Tab name", text: $renameBrowserTitle)
                        Button("Save") { if let id = renameBrowserID { shared.renameBrowser(id, title: renameBrowserTitle) }; renameBrowserID = nil }
                        Button("Cancel", role: .cancel) { renameBrowserID = nil }
                    }
                    .sheet(item: $editingList) { selection in TeamListEditor(original: selection.original).id(selection.id) }
                    .sheet(isPresented: $popout) { NavigationStack { StandupView().navigationTitle("Standup").toolbar { Button("Done") { popout = false } } } }
                    .sheet(isPresented: $reorderTabs) { NativeTabReorderSheet(items: shared.tabs(in: "team").map { (id: $0.id, title: $0.title) }) { ids in shared.reorderBrowsers(ids, in: "team") } }
                    .onAppear { if section == "Browser" { section = shared.selectedBrowser ?? "Overview" } }
                    .onChange(of: shared.selectedBrowser) { _, value in if let value { section = value } else if section != "Overview" && section != "Standup" { section = "Overview" } }
            }
        }.task { await shared.refresh(life) }
        .task(id: destinations.selectedID) {
            while !Task.isCancelled {
                if let host = destinations.selectedID, let remote = destinations.remote(for: host) { await shared.refreshTeamBrowserTabs(remote) }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }
    private var overview: some View {
        NativeList {
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
            NativeForm {
                TextField("List name", text: $name)
                TextField("Instructions", text: $instructions, axis: .vertical).lineLimit(3...8)
                TextField("Time zone", text: $timezone).textInputAutocapitalization(.never).autocorrectionDisabled()
                Section("Roster") { ForEach(members, id: \.self) { item in HStack { Text(item["name"].string); Spacer(); Text(item["mode"].string).font(.caption) } }.onDelete { members.remove(atOffsets: $0) }; TextField("Person", text: $member); Picker("Order", selection: $mode) { Text("Random").tag("random"); Text("Fixed").tag("fixed") }; Button("Add person") { members.append(.object(["id": .string(UUID().uuidString.lowercased()), "name": .string(member.trimmingCharacters(in: .whitespacesAndNewlines)), "mode": .string(mode)])); member = "" }.disabled(member.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
                Section("Standup links") { ForEach(links, id: \.self) { item in Text(item["title"].string) }.onDelete { links.remove(atOffsets: $0) }; TextField("Link title", text: $title); TextField("https://…", text: $url).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled(); Button("Add link") { if let safe = SharedAppStore.safeURL(url) { links.append(.object(["id": .string(UUID().uuidString.lowercased()), "title": .string(title), "url": .string(safe.absoluteString)])); title = ""; url = "" } }.disabled(SharedAppStore.safeURL(url) == nil) }
                if let error = shared.error { Text(error).foregroundStyle(.orange) }
                if original != .null { Button("Delete list", role: .destructive) { Task { if await shared.mutate(life, path: "/team-lists/" + original["id"].string, method: "DELETE", body: .object(["expectedRevision": original["revision"]])) != nil { dismiss() } } } }
            }.background(NativeTheme.background).navigationTitle(original == .null ? "Create list" : "Edit list").toolbar { Button("Cancel") { dismiss() }; Button("Save") { Task { saving = true; defer { saving = false }; var body: [String: JSON] = ["name": .string(name), "instructions": .string(instructions), "timezone": .string(timezone), "members": .array(members), "links": .array(links)]; if original != .null { body["expectedRevision"] = original["revision"] }; if await shared.mutate(life, path: "/team-lists" + (original == .null ? "" : "/" + original["id"].string), method: original == .null ? "POST" : "PUT", body: .object(body)) != nil { dismiss() } } }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || TimeZone(identifier: timezone) == nil || saving) }
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
        NativeList {
            Picker("Team list", selection: $listID) { ForEach(shared.lists, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
            if !list["instructions"].string.isEmpty { Text(list["instructions"].string).font(.caption).foregroundStyle(.secondary) }
            Button("Start / shuffle") { shared.standupOrders[dayKey] = Self.shuffled(list["members"].array); shared.standupCompleted[dayKey] = [] }.disabled(list["members"].array.isEmpty)
            ForEach(order.isEmpty ? list["members"].array : order, id: \.self) { person in Button { let id = person["id"].string; var next = completed; if next.contains(id) { next.remove(id) } else { next.insert(id) }; shared.standupCompleted[dayKey] = next } label: { Label(person["name"].string, systemImage: completed.contains(person["id"].string) ? "checkmark.circle.fill" : "circle").strikethrough(completed.contains(person["id"].string)) } }
            Section("Links") { ForEach(list["links"].array, id: \.self) { link in if let url = SharedAppStore.safeURL(link["url"].string) { Button(link["title"].string) { shared.open(url, title: link["title"].string) } } } }
        }.onAppear { if listID.isEmpty { listID = shared.lists.first?["id"].string ?? "" } }
    }
}
struct TeamBrowserView: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var text = ""
    @State private var engine = "Google"
    @State private var overview = false
    @State private var historyDirection: Bool?
    @State private var ownerHistoryResults: [JSON]?
    var scope = "team"
    var showTabs = true
    var onBackToList: (() -> Void)? = nil
    @FocusState private var addressFocused: Bool
    private var tabs: [BrowserDescriptor] { shared.tabs(in: scope) }
    private var selectedID: String? { shared.selected(in: scope) }
    private var selectedTab: BrowserDescriptor? { tabs.first { $0.id == selectedID } }
    private var navigation: BrowserNavigationState { shared.browserNavigation[selectedID ?? ""] ?? BrowserNavigationState() }
    private var historyRemote: RemoteStore? { selectedTab?.ownerHostId.flatMap { destinations.remote(for: $0) } ?? destinations.selected }
    private var availableHistory: [JSON] {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-address-recents") { return shared.recentHistory }
        #endif
        return (ownerHistoryResults ?? []) + shared.browserRecentVisits(host: selectedTab?.ownerHostId ?? historyRemote?.connection?.hostId, profile: selectedTab?.profileId ?? "default")
    }
    private var historyAvailability: String {
        guard let remote = historyRemote, let host = remote.connection?.hostId else { return "Choose a computer for owner history. Saved navigation remains on this device." }
        return shared.historyStatus[host] ?? (remote.connected ? "History from " + remote.displayName + ". Each tab keeps its own navigation list." : "Offline · cached last 30 days and saved navigation only")
    }
    private var historySearchIdentity: String { [selectedID ?? "", text, String(addressFocused)].joined(separator: "|") }
    private var accountRefreshIdentity: String { [scope, selectedID ?? "", life.accountIdentity, String(addressFocused)].joined(separator: ":") }

    // Bound SwiftUI inference separately from the asynchronous lifecycle modifiers.
    private var browserContent: some View {
        VStack(spacing: 0) {
            if showTabs { HStack(spacing: 0) { NativeTabStrip(ids: tabs.map(\.id), selection: selectedID) { HStack(spacing: 0) {
                ForEach(tabs) { tab in
                    HStack(spacing: 8) {
                        Button { shared.select(tab.id, in: scope) } label: { NativeContentTabLabel(title: tab.title.isEmpty ? "New tab" : tab.title, symbol: "globe") }
                            .lineLimit(1).accessibilityIdentifier("browser-tab-select-" + tab.id).accessibilityLabel(tab.title.isEmpty ? "New tab" : tab.title)
                            .accessibilityValue(selectedID == tab.id ? "Active" : "Inactive")
                            .accessibilityAddTraits(selectedID == tab.id ? .isSelected : [])
                        Button { shared.close(tab.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + (tab.title.isEmpty ? "browser tab" : tab.title))
                    }.id(tab.id).padding(12).background(selectedID == tab.id ? NativeTheme.accent.opacity(0.08) : .clear)
                        .overlay(alignment: .bottom) { Rectangle().fill(selectedID == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                        .draggable(tab.id).dropDestination(for: String.self) { ids, _ in guard let source = ids.first, tabs.contains(where: { $0.id == source }) else { return false }; shared.moveBrowser(source, before: tab.id); return true }
                        .contextMenu {
                            Button("Move left", systemImage: "arrow.left") { shared.shiftBrowser(tab.id, by: -1) }.disabled(tabs.first?.id == tab.id)
                            Button("Move right", systemImage: "arrow.right") { shared.shiftBrowser(tab.id, by: 1) }.disabled(tabs.last?.id == tab.id)
                            Button(tab.persist ? "Do not persist tab" : "Persist tab", systemImage: "pin") { shared.persistBrowser(tab.id, enabled: !tab.persist) }
                            Button("Unload") { shared.unload(tab.id) }
                            Button("Close") { shared.close(tab.id) }
                            Button("Close other tabs") { for other in tabs where other.id != tab.id { shared.close(other.id) } }.disabled(tabs.count < 2)
                            Button("Close tabs to the right") { if let index = tabs.firstIndex(where: { $0.id == tab.id }) { for other in tabs.dropFirst(index + 1) { shared.close(other.id) } } }.disabled(tabs.last?.id == tab.id)
                        }
                    Divider().frame(height: 24)
                }
            }.buttonStyle(.plain) }.scrollIndicators(.hidden)
                .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.9), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing) }
                Menu { ForEach(shared.browserProfiles, id: \.self) { profile in Button("Browser - " + profile["name"].string, systemImage: "globe") { shared.open(nil, scope: scope, profileId: profile["id"].string) } } } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add tab").accessibilityIdentifier("browser-new-tab")
            }.nativeTabBar()
            }
            Divider()
            toolbar
            if addressFocused { recentSites }
            Divider()
            if !shared.downloads.isEmpty { HStack { ProgressView().accessibilityLabel("Downloading linked file"); Button("Cancel download") { for transfer in Array(shared.downloads.values) { transfer.cancel() } } }.padding(8) }
            Group {
                if let tab = selectedTab, !shared.profileAvailable(tab.profileId) { ContentUnavailableView("Profile unavailable", systemImage: "person.crop.circle.badge.exclamationmark", description: Text("Sign in and refresh browser profiles in Preferences to resume this tab.")) } else if let tab = selectedTab, tab.url != nil { if shared.unloadedBrowsers.contains(tab.id) { ContentUnavailableView { Label("Page unloaded", systemImage: "pause.circle") } actions: { Button("Reload page") { shared.reload(tab.id); shared.touch(tab.id) } } } else { NativeBrowser(tab: tab, onOverview: { showOverview() }).id(tab.id) } }
                else { home.simultaneousGesture(MagnificationGesture().onEnded { scale in if scale < 0.75 { showOverview() } }) }
            }.modifier(NativePageSwipe(back: {
                if let id = selectedID, shared.isTwoFingerNavigation(id) { return }
                if let id = selectedID, !shared.browserHistory(id, back: true).isEmpty { shared.goBack(id) }
                else { onBackToList?() }
            }, forward: {
                if let id = selectedID, !shared.isTwoFingerNavigation(id) { shared.goForward(id) }
            }))
        }.scaleEffect(overview && !reduceMotion ? 0.94 : 1).opacity(overview ? 0.5 : 1).clipped()
        .overlay {
            if overview { BrowserTabOverview(scope: scope, onClose: { withAnimation(reduceMotion ? .easeOut(duration: 0.12) : .spring(response: 0.32, dampingFraction: 0.86)) { overview = false } })
                .transition(reduceMotion ? .opacity : .scale(scale: 0.88).combined(with: .opacity)).zIndex(1) }
        }
        .sheet(isPresented: $showDownloads) { NativeDownloadsView() }
        .sheet(isPresented: Binding(get: { historyDirection != nil }, set: { if !$0 { historyDirection = nil } })) {
            navigationHistorySheet
        }
    }
    var body: some View {
        browserContent
        .task(id: selectedID) {
            if let id = selectedID { shared.assignBrowserOwner(id, host: destinations.selected?.connection?.hostId) }
            if let remote = historyRemote { await shared.flushHistory(remote) }
        }
        .task(id: historySearchIdentity) {
            ownerHistoryResults = nil
            guard addressFocused || selectedTab?.url == nil, let remote = historyRemote else { return }
            do { try await Task.sleep(for: .milliseconds(200)) } catch { return }
            let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
            let result = await shared.queryHistory(remote, profileId: selectedTab?.profileId ?? "default", query: query, from: query.isEmpty ? Date().addingTimeInterval(-30 * 86400) : nil)
            guard !Task.isCancelled else { return }
            if result != .null { ownerHistoryResults = result["items"].array }
        }
        .onAppear { if tabs.isEmpty && showTabs { shared.open(nil, scope: scope) }; text = selectedTab?.url ?? ""; engine = ["google": "Google", "duckduckgo": "DuckDuckGo", "bing": "Bing"][shared.snapshot["preferences"]["searchEngine"].string] ?? "Google"; addressFocused = selectedTab?.url == nil }
        .onChange(of: selectedID) { _, _ in text = selectedTab?.url ?? ""; addressFocused = selectedTab?.url == nil }
        .task(id: accountRefreshIdentity) { if addressFocused || selectedTab?.url == nil { await shared.refresh(life) } }
        .onChange(of: navigation.url) { _, url in if !addressFocused && !url.isEmpty { text = url } }
    }
    private var navigationHistorySheet: some View {
            NavigationStack {
                NativeList {
                    if let id = selectedID, let tab = selectedTab, let history = tab.history {
                        Section("Current page") { Label(tab.title, systemImage: "checkmark"); Text(tab.url ?? "").font(.caption).foregroundStyle(.secondary) }
                        Section("Back") { ForEach(shared.browserHistory(id, back: true), id: \.self) { item in Button(item.title ?? item.url.absoluteString) { shared.goBrowserHistory(item, in: id); historyDirection = nil }.accessibilityIdentifier("browser-history-back-\(item.index)") } }
                        Section("Forward") { ForEach(shared.browserHistory(id, back: false), id: \.self) { item in Button(item.title ?? item.url.absoluteString) { shared.goBrowserHistory(item, in: id); historyDirection = nil }.accessibilityIdentifier("browser-history-forward-\(item.index)") } }
                        if history.entries.indices.contains(history.index), let requested = history.entries[history.index].requestedURL, let original = URL(string: requested) { Button("Open originally requested address") { _ = shared.navigate(original, in: id); historyDirection = nil } }
                        Text("\(history.entries.count) saved navigation entries").font(.caption).foregroundStyle(.secondary)
                    }
                }.navigationTitle("Navigation history").toolbar { Button("Done") { historyDirection = nil } }
            }
    }
    private func showOverview() {
        withAnimation(reduceMotion ? .easeOut(duration: 0.12) : .spring(response: 0.32, dampingFraction: 0.86)) { overview = true }
    }
    @State private var showDownloads = false
    private var toolbar: some View {
        let chrome = Color(red: 20 / 255, green: 27 / 255, blue: 24 / 255)
        let field = colorScheme == .dark ? Color(red: 36 / 255, green: 46 / 255, blue: 41 / 255) : Color(uiColor: .secondarySystemGroupedBackground)
        let control = colorScheme == .dark ? Color(red: 167 / 255, green: 182 / 255, blue: 172 / 255) : Color(red: 78 / 255, green: 102 / 255, blue: 85 / 255)
        return HStack(spacing: 2) {
            Button { showDownloads = true } label: { Image(systemName: shared.downloads.isEmpty ? "arrow.down.circle" : "arrow.down.circle.fill").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("Downloads")
            Button { if let id = selectedID { shared.goBack(id) } } label: { Image(systemName: "chevron.left").frame(minWidth: 44, minHeight: 44) }
                .frame(width: 44, height: 44).contentShape(Rectangle()).disabled(!navigation.canGoBack).accessibilityLabel("Back").accessibilityIdentifier("browser-back")
                .highPriorityGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in historyDirection = true })
            Button { if let id = selectedID { shared.goForward(id) } } label: { Image(systemName: "chevron.right").frame(minWidth: 44, minHeight: 44) }
                .frame(width: 44, height: 44).contentShape(Rectangle()).disabled(!navigation.canGoForward).accessibilityLabel("Forward").accessibilityIdentifier("browser-forward")
                .highPriorityGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in historyDirection = false })
            Button { if let id = selectedID { navigation.isLoading ? shared.stopBrowser(id) : shared.refreshBrowser(id) } } label: { Image(systemName: navigation.isLoading ? "xmark" : "arrow.clockwise").frame(minWidth: 44, minHeight: 44) }.frame(width: 44, height: 44).contentShape(Rectangle()).disabled(selectedTab?.url == nil).accessibilityLabel(navigation.isLoading ? "Stop loading" : "Refresh page").accessibilityIdentifier("browser-refresh")
            TextField("Search or enter URL", text: $text).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).submitLabel(.go).focused($addressFocused).onSubmit { navigate() }
                .font(.system(size: 14)).foregroundStyle(colorScheme == .dark ? Color.white : Color.primary).padding(.horizontal, 10).frame(height: 34).background(field, in: RoundedRectangle(cornerRadius: 6)).accessibilityIdentifier("browser-address")
            Button { if let tab = selectedTab { shared.webView(tab).findInteraction?.presentFindNavigator(showingReplace: false) } } label: { Image(systemName: "magnifyingglass") }.accessibilityLabel("Find in page").keyboardShortcut("f", modifiers: .command).disabled(selectedTab?.url == nil)
            Button(action: { navigate() }) { Image(systemName: "arrow.turn.down.left") }.frame(width: 44, height: 44).contentShape(Rectangle()).disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Go to address or search").accessibilityIdentifier("browser-go")
            Button { historyDirection = true } label: { Image(systemName: "clock.arrow.circlepath") }.frame(width: 44, height: 44).accessibilityLabel("Navigation history").accessibilityIdentifier("browser-navigation-history")
            Button { showOverview() } label: { Image(systemName: "square.grid.2x2") }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Tab overview").accessibilityIdentifier("browser-tab-overview")
        }.buttonStyle(.plain).foregroundStyle(control).font(.system(size: 14, weight: .medium))
            .padding(.horizontal, 4).padding(.vertical, 2)
            .frame(minHeight: 44).background { if colorScheme == .dark { chrome } else { Rectangle().fill(.bar) } }
    }
    private var recentSites: some View {
        let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let terms = query.split(whereSeparator: \.isWhitespace).map(String.init)
        let matching = availableHistory.filter { item in terms.allSatisfy { (item["title"].string + " " + item["url"].string).localizedCaseInsensitiveContains($0) } }
        let items = SharedAppStore.recentBrowserVisits(matching)
        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack { Text("Recent sites").font(.subheadline.weight(.semibold)); Spacer(); Button("Done") { addressFocused = false } }.padding(12)
                Text(historyAvailability).font(.caption).foregroundStyle(.secondary).padding(.horizontal, 12).padding(.bottom, 8)
                if query.contains(where: \.isWhitespace) {
                    ForEach([engine] + ["Google", "DuckDuckGo", "Bing"].filter { $0 != engine }, id: \.self) { choice in
                        Button("Search with " + choice + (choice == engine ? " · default" : "")) { navigate(searchEngine: choice) }.padding(.horizontal, 12).padding(.vertical, 8)
                    }
                }
                if items.isEmpty, !query.isEmpty { Text("No matching available history.").foregroundStyle(.secondary).padding(12) }
                else if items.isEmpty, shared.snapshot != .null, life.credential?.appAuthorized == true, shared.error == nil, !shared.busy { Text("No recent sites yet.").foregroundStyle(.secondary).padding(12) }
                ForEach(items, id: \.self) { item in
                    Button { text = item["url"].string; navigate() } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item["title"].string.isEmpty ? item["url"].string : item["title"].string).font(.subheadline).lineLimit(1)
                            Text(item["url"].string).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            Text(BrowserHistoryRows.details(item, timeZone: .current, locale: .current)).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 12).padding(.vertical, 10).contentShape(Rectangle())
                    }.buttonStyle(.plain).accessibilityIdentifier("browser-recent-" + item["id"].string)
                    Divider()
                }
            }
        }.frame(maxHeight: 240).background(NativeTheme.surface).accessibilityIdentifier("browser-recent-sites")
    }
    private var home: some View {
        NativeList {
            Section("Browsing home") {
                Picker("Search engine", selection: $engine) { ForEach(["Google", "DuckDuckGo", "Bing"], id: \.self) { Text($0).tag($0) } }
                Button("Save shared link") { if let url = SharedAppStore.safeURL(text) { Task { _ = await shared.mutate(life, path: "/links", body: .object(["url": .string(url.absoluteString), "title": .string(url.host ?? "Link")])) } } }.disabled(SharedAppStore.safeURL(text) == nil).buttonStyle(.bordered)
            }
            Section("Shared links") { linkRows(shared.snapshot["links"].array) }
            Section("Recent sites") {
                Text(historyAvailability).font(.caption).foregroundStyle(.secondary)
                BrowserHistoryRows(items: availableHistory) { link in
                    if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string, scope: scope) }
                }
                if shared.recentHistory.isEmpty, shared.snapshot != .null, life.credential?.appAuthorized == true, shared.error == nil, !shared.busy { Text("No recorded sites yet.").font(.caption).foregroundStyle(.secondary) }
            }
            if let error = shared.error { Text(error).foregroundStyle(.orange) }
        }
    }
    private func linkRows(_ items: [JSON]) -> some View { ForEach(items, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string, scope: scope) } } } }
    private func navigate(searchEngine: String? = nil) {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let selectedEngine = searchEngine ?? engine
        var target = URL(string: input.contains("://") ? input : input.contains(".") && !input.contains(" ") ? "https://" + input : "")
        if target?.host == nil || searchEngine != nil { var components = URLComponents(string: selectedEngine == "Bing" ? "https://www.bing.com/search" : selectedEngine == "DuckDuckGo" ? "https://duckduckgo.com/" : "https://www.google.com/search")!; components.queryItems = [URLQueryItem(name: "q", value: input)]; target = components.url }
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
        if item["local"].bool == true { return "Saved on this device" }
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
            NativeList { BrowserHistoryRows(items: items) { _ in } }
                .environment(\.timeZone, TimeZone(identifier: timezone)!)
        }
    }
}
#endif

// WebKit's element menu and UIKit's selected-text edit menu are different paths.
// Observe the actual pressed anchor in an isolated script world so either menu
// can offer the same link actions, including linked images and iframe links.
@MainActor final class NativeLinkWebView: WKWebView {
    var linkActions: ((URL) -> [UIMenuElement])?
    private(set) var pressedLink: URL?
    private var pressedAt = Date.distantPast
    private final class TargetHandler: NSObject, WKScriptMessageHandler {
        weak var view: NativeLinkWebView?
        init(_ view: NativeLinkWebView) { self.view = view }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let view, message.webView === view, let body = message.body as? [String: String] else { return }
            view.rememberLink(body["url"] ?? "")
        }
    }
    static func linkURL(_ value: String) -> URL? { SharedAppStore.historyURL(value) }
    func rememberLink(_ value: String) { pressedLink = Self.linkURL(value); pressedAt = Date() }
    var currentLink: URL? { Date().timeIntervalSince(pressedAt) < 15 ? pressedLink : nil }
    override init(frame: CGRect, configuration: WKWebViewConfiguration) {
        super.init(frame: frame, configuration: configuration)
        let source = """
        (() => {
          const capture = event => {
            const path = event.composedPath ? event.composedPath() : [event.target];
            const anchor = path.find(node => node instanceof Element && node.matches('a[href],area[href]')) || (event.target instanceof Element ? event.target.closest('a[href],area[href]') : null);
            window.webkit.messageHandlers.proteusLinkTarget.postMessage({url:anchor ? anchor.href : ''});
          };
          for (const name of ['pointerdown','touchstart','contextmenu']) addEventListener(name,capture,true);
        })();
        """
        configuration.userContentController.add(TargetHandler(self), contentWorld: .defaultClient, name: "proteusLinkTarget")
        configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: false, in: .defaultClient))
    }
    required init?(coder: NSCoder) { fatalError("NativeLinkWebView is created with a profile configuration") }
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard let url = currentLink, let actions = linkActions?(url), !actions.isEmpty else { return }
        builder.insertChild(UIMenu(title: "", identifier: UIMenu.Identifier("proteus.link-actions"), options: .displayInline, children: actions), atStartOfMenu: .root)
    }
}

struct NativeBrowser: UIViewRepresentable {
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var destinations: DestinationStore
    let tab: BrowserDescriptor
    var onOverview: () -> Void = {}
    func makeCoordinator() -> Coordinator { Coordinator(shared: shared, life: life, destinations: destinations, id: tab.id, onOverview: onOverview) }
    func makeUIView(context: Context) -> WKWebView { let view = shared.webView(tab); view.navigationDelegate = context.coordinator; view.uiDelegate = context.coordinator; context.coordinator.attachPinch(to: view); if let linkView = view as? NativeLinkWebView { linkView.linkActions = { [weak coordinator = context.coordinator, weak view] url in guard let coordinator, let view else { return [] }; return coordinator.linkMenuActions(url, in: view) } }; return view }
    func updateUIView(_ view: WKWebView, context: Context) { context.coordinator.onOverview = onOverview }
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        if view.navigationDelegate === coordinator { view.navigationDelegate = nil }
        if view.uiDelegate === coordinator { view.uiDelegate = nil }
        coordinator.detachPinch()
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, UIGestureRecognizerDelegate {
        let shared: SharedAppStore; let life: LifeStore; let destinations: DestinationStore; let id: String
        var onOverview: () -> Void
        private weak var pagePan: UIPanGestureRecognizer?
        private weak var pinch: UIPinchGestureRecognizer?
        private weak var view: WKWebView?
        private var beganAtMinimumZoom = false
        private var initialPageZoom: CGFloat?
        private var activeNavigation: WKNavigation?
        init(shared: SharedAppStore, life: LifeStore, destinations: DestinationStore, id: String, onOverview: @escaping () -> Void = {}) { self.shared = shared; self.life = life; self.destinations = destinations; self.id = id; self.onOverview = onOverview }
        func attachPinch(to view: WKWebView) { self.view = view; initialPageZoom = view.scrollView.zoomScale; let recognizer = UIPinchGestureRecognizer(target: self, action: #selector(observedPinch(_:))); recognizer.delegate = self; recognizer.cancelsTouchesInView = false; recognizer.delaysTouchesEnded = false; view.scrollView.addGestureRecognizer(recognizer); pinch = recognizer
            let pan = UIPanGestureRecognizer(target: self, action: #selector(observedPagePan(_:))); pan.minimumNumberOfTouches = 2; pan.maximumNumberOfTouches = 2; pan.allowedScrollTypesMask = .continuous; pan.delegate = self; pan.cancelsTouchesInView = false; view.addGestureRecognizer(pan); pagePan = pan
        }
        static func traversalDirection(x: CGFloat, y: CGFloat) -> Int? { guard x.isFinite, y.isFinite, abs(x) >= 80, abs(x) > abs(y) * 2 else { return nil }; return x > 0 ? -1 : 1 }
        @objc private func observedPagePan(_ gesture: UIPanGestureRecognizer) {
            if [.began, .changed, .ended].contains(gesture.state) { shared.markTwoFingerNavigation(id) }
            guard gesture.state == .ended, let view, shared.isCurrentBrowserView(view, id: id), let direction = Self.traversalDirection(x: gesture.translation(in: view).x, y: gesture.translation(in: view).y) else { return }
            if direction < 0 { shared.goBack(id) } else { shared.goForward(id) }
        }
        func detachPinch() { if let pagePan { pagePan.view?.removeGestureRecognizer(pagePan) }; pagePan = nil; if let pinch { pinch.view?.removeGestureRecognizer(pinch) }; pinch = nil; view = nil }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool { true }
        static func beginsAtMinimumZoom(_ zoom: CGFloat, minimum: CGFloat, fallback: CGFloat?) -> Bool {
            let minimum = minimum > 0 ? minimum : fallback ?? zoom
            return zoom.isFinite && minimum.isFinite && zoom > 0 && minimum > 0 && zoom <= minimum + 0.01
        }
        @objc private func observedPinch(_ gesture: UIPinchGestureRecognizer) {
            if gesture.state == .began, let view {
                beganAtMinimumZoom = Self.beginsAtMinimumZoom(view.scrollView.zoomScale, minimum: view.scrollView.minimumZoomScale, fallback: initialPageZoom)
            }
            if gesture.state == .ended, beganAtMinimumZoom, gesture.scale < 0.75 { onOverview() }
            if [.ended, .cancelled, .failed].contains(gesture.state) { beganAtMinimumZoom = false }
        }
        func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
            guard let url = elementInfo.linkURL.flatMap({ NativeLinkWebView.linkURL($0.absoluteString) }) ?? (webView as? NativeLinkWebView)?.currentLink else { completionHandler(nil); return }
            completionHandler(UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { suggested in
                UIMenu(children: [UIMenu(title: "", options: .displayInline, children: self.linkMenuActions(url, in: webView))] + suggested)
            })
        }
        func linkMenuActions(_ url: URL, in webView: WKWebView) -> [UIMenuElement] {
            guard shared.isCurrentBrowserView(webView, id: id), NativeLinkWebView.linkURL(url.absoluteString) != nil else { return [] }
            let source = shared.browserTabs.first { $0.id == id }
            let hostID = source?.ownerHostId ?? destinations.selectedID
            let hostName = hostID.flatMap { destinations.remote(for: $0)?.displayName } ?? destinations.selectedLabel
            let sourceScope = source?.scope ?? "team", sourceProfile = source?.profileId ?? "default", sourceID = id
                var actions: [UIMenuElement] = [
                    UIAction(title: "Open in New Tab", image: UIImage(systemName: "plus.square")) { _ in if let created = self.shared.open(url, title: url.host ?? "Browser", scope: sourceScope, profileId: sourceProfile, afterSourceID: sourceID), let hostID { self.shared.assignBrowserOwner(created, host: hostID) } },
                    UIAction(title: "Open in default browser", image: UIImage(systemName: "arrow.up.right.square")) { _ in UIApplication.shared.open(url); if sourceProfile == "default" { Task { await self.shared.record(url, title: url.host ?? "Browser", life: self.life) } } },
                    UIAction(title: "Copy Link", image: UIImage(systemName: "doc.on.doc")) { _ in UIPasteboard.general.url = url },
                    UIAction(title: "Download Linked File", image: UIImage(systemName: "arrow.down.doc")) { _ in self.shared.download(url, in: webView, saveAs: false) },
                    UIAction(title: "Download Linked File As…", image: UIImage(systemName: "arrow.down.doc")) { _ in self.shared.download(url, in: webView) },
                    UIAction(title: "Share Link…", image: UIImage(systemName: "square.and.arrow.up")) { _ in
                        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                        controller.popoverPresentationController?.sourceView = webView
                        controller.popoverPresentationController?.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
                        var presenter = webView.window?.rootViewController
                        while let next = presenter?.presentedViewController { presenter = next }
                        presenter?.present(controller, animated: true)
                    }
                ]
                if let hostID, let remote = self.destinations.remote(for: hostID), SharedAppStore.safeURL(url.absoluteString) != nil {
                    actions.append(UIAction(title: "New chat with link on " + hostName, image: UIImage(systemName: "bubble.left.and.bubble.right")) { _ in
                        let prefix = "workspace:" + hostID + ":"
                        _ = self.shared.prepareLinkDraft(url, remote: remote, hostID: hostID, hostName: hostName, workspaceID: sourceScope.hasPrefix(prefix) ? String(sourceScope.dropFirst(prefix.count)) : nil)
                    })
                }
                return actions
        }
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { guard shared.isCurrentBrowserView(webView, id: id) else { return }; activeNavigation = navigation }
        func webView(_ webView: WKWebView, didReceiveServerRedirectForProvisionalNavigation navigation: WKNavigation!) { guard shared.isCurrentBrowserView(webView, id: id) else { return }; shared.markBrowserRedirect(id, url: webView.url) }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { guard shared.isCurrentBrowserView(webView, id: id) else { return }; if let activeNavigation, activeNavigation !== navigation { return }; activeNavigation = nil; initialPageZoom = webView.scrollView.zoomScale; shared.captureBrowserPreview(id); Task { await shared.captureBrowserFavicon(id) }; guard let url = webView.url else { return }; shared.completeBrowserNavigation(url, title: webView.title ?? url.host ?? "Browser", in: id, nativePosition: webView.backForwardList.backList.count); if shared.browserTabs.first(where: { $0.id == id })?.profileId == "default" { Task { await shared.record(url, title: webView.title ?? url.host ?? "Browser", life: life) } } }
        private func failed(_ navigation: WKNavigation?, view: WKWebView, error: Error) { guard shared.isCurrentBrowserView(view, id: id) else { return }; if (error as NSError).code == NSURLErrorCancelled { return }; if let activeNavigation, activeNavigation !== navigation { return }; activeNavigation = nil; shared.failBrowserNavigation(id, currentURL: view.url) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(navigation, view: webView, error: error) }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(navigation, view: webView, error: error) }
        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) { decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download) }
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { shared.receiveDownload(download) }
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { shared.receiveDownload(download) }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { guard shared.isCurrentBrowserView(webView, id: id) else { decisionHandler(.cancel); return }; guard let url = navigationAction.request.url, ["http", "https", "about"].contains(url.scheme) else { decisionHandler(.cancel); return }; if navigationAction.targetFrame?.isMainFrame == true { shared.prepareBrowserLoad(url, in: id); if navigationAction.navigationType == .backForward { shared.prepareBrowserHistoryNavigation(url, in: id) } }; if navigationAction.shouldPerformDownload { decisionHandler(.download) } else { decisionHandler(.allow) } }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { if let url = navigationAction.request.url, ["http", "https"].contains(url.scheme) { shared.open(url, title: url.host ?? "Browser", scope: shared.browserTabs.first(where: { $0.id == id })?.scope ?? "team", profileId: shared.browserTabs.first(where: { $0.id == id })?.profileId ?? "default", afterSourceID: id) }; return nil }
    }
}

struct BrowserTabOverview: View {
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var scope = "team"
    var onClose: (() -> Void)? = nil
    private func close() { if let onClose { onClose() } else { dismiss() } }
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
                    ForEach(shared.tabs(in: scope)) { tab in
                        VStack(alignment: .leading, spacing: 12) {
                            Button { shared.select(tab.id, in: scope); close() } label: {
                                VStack(alignment: .leading, spacing: 12) {
                                    Group { if let preview = shared.browserPreviews[tab.id] { Image(uiImage: preview).resizable().scaledToFill() } else { Group { if let icon = shared.browserFavicon(tab.id) { Image(uiImage: icon).resizable().scaledToFit().frame(width: 32, height: 32) } else { Image(systemName: tab.url == nil ? "house" : "globe").font(.largeTitle) } } } }.frame(maxWidth: .infinity).frame(height: 110).clipped().background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
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
                ToolbarItem(placement: .cancellationAction) { Button("Done") { close() } }
                ToolbarItem(placement: .primaryAction) { Button("New tab", systemImage: "plus") { shared.open(nil, scope: scope); close() } }
            }
        }
    }
}

/// WebKit owns the authenticated transfer; only explicit export moves the file to Files.
struct NativeDownloadRecord: Identifiable, Codable {
    var id: UUID
    var name: String
    var file: String?
    var startedAt: Date
    var downloadedAt: Date?
    var state: String
    var received: Int64 = 0
    var total: Int64 = 0
}
@MainActor final class NativeLinkDownload: NSObject, WKDownloadDelegate {
    let id = UUID()
    private weak var shared: SharedAppStore?
    private var transfer: WKDownload?
    private var destination: URL?
    private var folder: URL?
    private var scoped = false
    private var observation: NSKeyValueObservation?
    private let saveAs: Bool
    private var row: NativeDownloadRecord
    init(shared: SharedAppStore, saveAs: Bool = true) { self.shared = shared; self.saveAs = saveAs; row = NativeDownloadRecord(id: id, name: "Download", startedAt: Date(), state: "downloading"); super.init(); shared.downloadChanged(row) }
    private var cancelled = false
    func attach(_ download: WKDownload) {
        if cancelled { download.cancel(); return }; transfer = download; download.delegate = self
        observation = download.progress.observe(\.fractionCompleted, options: [.new]) { [weak self] progress, _ in
            let received = progress.completedUnitCount, total = progress.totalUnitCount
            Task { @MainActor [weak self] in guard let self else { return }; self.row.received = received; self.row.total = total; self.shared?.downloadChanged(self.row) }
        }
    }
    func cancel() { cancelled = true; transfer?.delegate = nil; transfer?.cancel(); finish("cancelled") }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let name = (suggestedFilename as NSString).lastPathComponent
        row.name = name.isEmpty || name == "." || name == ".." ? "Download" : name
        do {
            guard let shared else { completionHandler(nil); finish("failed"); return }
            let directory = saveAs ? FileManager.default.temporaryDirectory.appendingPathComponent("ProteusDownloads").appendingPathComponent(id.uuidString) : try shared.downloadDirectory()
            folder = directory; scoped = directory.startAccessingSecurityScopedResource()
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
            let base = directory.appendingPathComponent(row.name), ext = base.pathExtension, stem = base.deletingPathExtension().lastPathComponent
            var file = base, index = 1
            while FileManager.default.fileExists(atPath: file.path) || shared.downloadHistory.contains(where: { $0.file == file.path && $0.state == "downloading" }) { file = directory.appendingPathComponent(stem + " (" + String(index) + ")" + (ext.isEmpty ? "" : "." + ext)); index += 1 }
            destination = file; row.file = file.path; shared.downloadChanged(row); completionHandler(file)
        } catch { completionHandler(nil); finish("failed"); shared?.downloadError = error.localizedDescription }
    }
    func downloadDidFinish(_ download: WKDownload) {
        if let destination, saveAs { shared?.exportFile = BrowserExportFile(id: id, url: destination) }
        row.downloadedAt = Date(); finish("completed")
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) { shared?.downloadError = error.localizedDescription; finish("failed") }
    private func finish(_ state: String) {
        row.state = state; observation = nil; transfer = nil
        if state != "completed", let destination { try? FileManager.default.removeItem(at: destination); row.file = nil }
        if scoped { folder?.stopAccessingSecurityScopedResource(); scoped = false }
        shared?.downloadChanged(row); shared?.downloads.removeValue(forKey: id)
    }
}
struct NativeDownloadsView: View {
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var body: some View { NavigationStack { List { ForEach(shared.downloadHistory) { row in VStack(alignment: .leading, spacing: 6) {
        Text(row.name).font(.headline); Text(row.downloadedAt?.formatted(date: .abbreviated, time: .shortened) ?? row.startedAt.formatted(date: .abbreviated, time: .shortened)).font(.caption)
        Text(row.state).foregroundStyle(.secondary)
        if row.state == "downloading" { if row.total > 0 { ProgressView(value: Double(row.received), total: Double(row.total)) }; Button("Cancel", role: .destructive) { shared.downloads[row.id]?.cancel() } }
        if row.state == "completed", let file = row.file, FileManager.default.fileExists(atPath: file) { ShareLink("Open or share", item: URL(fileURLWithPath: file)) }
    } } }.navigationTitle("Downloads").toolbar { Button("Done") { dismiss() } } } }
}
struct NativeDownloadFolderPicker: UIViewControllerRepresentable {
    var selected: (URL) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(selected) }
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController { let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false); picker.delegate = context.coordinator; return picker }
    func updateUIViewController(_ controller: UIDocumentPickerViewController, context: Context) {}
    final class Coordinator: NSObject, UIDocumentPickerDelegate { var selected: (URL) -> Void; init(_ selected: @escaping (URL) -> Void) { self.selected = selected }; func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { if let url = urls.first { selected(url) } } }
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

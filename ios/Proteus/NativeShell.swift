import SwiftUI

private enum NativeArea: String, CaseIterable, Identifiable {
    case home = "Home", chats = "Chats", life = "Life", team = "Team", engine = "Engine Room"
    var id: String { rawValue }
    var icon: String { switch self { case .home: "house"; case .chats: "bubble.left.and.bubble.right"; case .life: "heart.text.square"; case .team: "person.3"; case .engine: "gearshape.2" } }
}
struct NativeShell: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var area: NativeArea = .home
    @AppStorage("nativeSidebarExpanded") private var sidebar = true
    @AppStorage("nativeTeamSection") private var teamSection = "Overview"
    @AppStorage("nativeLifeSection") private var lifeSection = "overview"
    @State private var hoverTask: Task<Void, Never>?
    @State private var hover = false
    @State private var opened: [NativeArea] = [.home, .chats]
    @State private var enginePage = "Overview"
    @State private var selectedSidebarChat: AggregateChat?
    @AppStorage("lifeEnabled") private var lifeEnabled = false
    @ObservedObject private var notifications = NativeNotifications.shared
    private var tablet: Bool { sizeClass == .regular }
    private var recentChats: [AggregateChat] {
        Array(destinations.destinations.flatMap { destination in
            (destinations.remote(for: destination.id)?.state["runs"].array ?? []).map { AggregateChat(hostID: destination.id, hostName: destination.label, run: $0) }
        }.sorted { ($0.run["updatedAt"].string.isEmpty ? $0.run["createdAt"].string : $0.run["updatedAt"].string) > ($1.run["updatedAt"].string.isEmpty ? $1.run["createdAt"].string : $1.run["updatedAt"].string) }.prefix(5))
    }
    var body: some View {
        Group {
            if tablet {
                HStack(spacing: 0) {
                    if sidebar { rail.frame(width: 250); Divider() }
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Button { sidebar.toggle() } label: { Label("Toggle sidebar", systemImage: "sidebar.left") }.labelStyle(.iconOnly).padding(10).keyboardShortcut("s", modifiers: [.command, .option])
                            ScrollView(.horizontal) { HStack(spacing: 0) { ForEach(opened) { tab in HStack { Button(tab.rawValue) { area = tab }; Button { opened.removeAll { $0 == tab }; if area == tab { area = opened.last ?? .home }; if opened.isEmpty { opened = [.home] } } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + tab.rawValue) }.padding(10).background(area == tab ? Color.accentColor.opacity(0.15) : Color.clear).contextMenu { Button("Unload") { if tab == .team { shared.unloadBrowsers() }; opened.removeAll { $0 == tab }; area = .home } } }; Spacer() } }.scrollIndicators(.hidden)
                        }.background(.bar)
                        Divider(); ZStack { ForEach(opened) { item in if item != .team || area == .team { content(item).opacity(area == item ? 1 : 0).allowsHitTesting(area == item).accessibilityHidden(area != item) } } }
                    }
                }.overlay(alignment: .leading) {
                    if !sidebar { Color.clear.frame(width: 10).contentShape(Rectangle()).onHover { edgeHover($0) }.overlay(alignment: .topLeading) { if hover { rail.frame(width: 250).background(.regularMaterial).onHover { edgeHover($0) }.shadow(radius: 10) } } }
                }
            } else {
                TabView(selection: $area) {
                    NativeHome().tabItem { Label("Home", systemImage: "house") }.tag(NativeArea.home)
                    AggregateChatsView().tabItem { Label("Chats", systemImage: "bubble.left.and.bubble.right") }.tag(NativeArea.chats)
                    Group { if lifeEnabled || ProcessInfo.processInfo.arguments.contains("--synthetic-life") { LifeRootView() } else { NavigationStack { NativeSetupView() } } }.tabItem { Label("Life", systemImage: "heart.text.square") }.tag(NativeArea.life)
                    TeamToolsView().tabItem { Label("Team", systemImage: "person.3") }.tag(NativeArea.team)
                    EngineRoomView(page: $enginePage).tabItem { Label("Engine Room", systemImage: "gearshape.2") }.tag(NativeArea.engine)
                }
            }
        }
        .sheet(item: $selectedSidebarChat) { entry in if let remote = destinations.remote(for: entry.hostID) { NavigationStack { ChatView(id: entry.run["id"].string).environmentObject(remote).toolbar { Button("Done") { selectedSidebarChat = nil } } } } }
        .sheet(item: $shared.linkChatDraft) { draft in
            if let remote = destinations.remote(for: draft.hostID) {
                VStack(spacing: 0) {
                    Text("Draft for " + draft.hostName + " · Review before starting").font(.caption).padding(8)
                    NewChatView { chatID in
                        do { try destinations.select(draft.hostID); remote.selectedChat = chatID; area = .chats; shared.linkChatDraft = nil }
                        catch { destinations.error = error.localizedDescription }
                    }.environmentObject(remote)
                }
            }
        }
        .sheet(item: $shared.exportFile) { file in BrowserFileExport(file: file) { shared.exportFile = nil }.onDisappear { file.cleanup() } }
        .alert("Download", isPresented: Binding(get: { shared.downloadError != nil }, set: { if !$0 { shared.downloadError = nil } })) { Button("OK") { shared.downloadError = nil } } message: { Text(shared.downloadError ?? "") }
        .onChange(of: area) { old, next in if !opened.contains(next) { opened.append(next) }; if old == .team && next != .team { shared.unloadBrowsers() } }
        .onChange(of: destinations.pairing != nil) { _, pairing in if pairing { area = .home } }
        .onChange(of: life.accountIdentity) { _, identity in shared.reset(for: identity) }
        .onChange(of: notifications.route) { _, route in
            guard let route else { return }; openNotification(route)
        }
        .task {
            if let route = notifications.route { openNotification(route) }
            notifications.attach(life); await shared.refresh(life); await notifications.syncSubscription()
            while !Task.isCancelled {
                for destination in destinations.destinations {
                    if let remote = destinations.remote(for: destination.id), remote.connected, let activity = try? await remote.request("notifications.list") { notifications.observe(activity["items"].array, hostID: destination.id) }
                }
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
            }
        }
    }
    private var rail: some View {
        VStack(spacing: 0) {
            List {
                Text("Proteus").font(.title2.bold())
                ForEach(NativeArea.allCases) { item in
                    Button { area = item; hover = false } label: { Label(item.rawValue, systemImage: item.icon).fontWeight(area == item ? .semibold : .regular) }
                    if area == item && item == .chats {
                        ForEach(recentChats) { entry in
                            Button { destinations.remote(for: entry.hostID)?.activity(true); destinations.remote(for: entry.hostID)?.selectedChat = entry.run["id"].string; selectedSidebarChat = entry }
                                label: { HStack { if entry.run["status"].string == "awaiting_input" { Text("!").foregroundStyle(.orange) }; Text(entry.run["title"].string).lineLimit(1).font(.caption) } }.padding(.leading)
                        }
                        Button("More…") { area = .chats }.padding(.leading)
                    }
                    if area == item && item == .team { ForEach(["Overview", "Standup", "Browser"], id: \.self) { title in Button(title) { teamSection = title }.font(.caption).padding(.leading) } }
                    if area == item && item == .life { ForEach(["overview", "nutrition", "garage", "fuel", "captures"], id: \.self) { title in Button(title.capitalized) { lifeSection = title }.font(.caption).padding(.leading) } }
                    if area == item && item == .engine { ForEach(EngineRoomView.pages, id: \.self) { title in Button(title) { enginePage = title }.font(.caption).padding(.leading) } }
                }
            }.listStyle(.sidebar)
            if let remote = destinations.selected { ProviderUsageStrip(store: remote) }
        }
    }
    private func openNotification(_ route: NativeNotifications.NotificationRoute) {
        if route.hostID.isEmpty { enginePage = "Notifications"; area = .engine; return }
        guard destinations.destinations.contains(where: { $0.id == route.hostID }) else { destinations.error = "This notification refers to a Mac that is not paired on this device."; return }
        do { try destinations.select(route.hostID) } catch { destinations.error = error.localizedDescription; return }
        if route.chatID.isEmpty { enginePage = "Notifications"; area = .engine }
        else { destinations.selected?.selectedChat = route.chatID; area = .chats }
    }
    private func edgeHover(_ inside: Bool) { hoverTask?.cancel(); if inside { hover = true } else { hoverTask = Task { try? await Task.sleep(for: .milliseconds(200)); if !Task.isCancelled { hover = false } } } }
    @ViewBuilder private func content(_ item: NativeArea) -> some View {
        switch item { case .home: NativeHome(showAllowance: false); case .chats: AggregateChatsView(); case .life: if lifeEnabled || ProcessInfo.processInfo.arguments.contains("--synthetic-life") { LifeRootView() } else { NavigationStack { NativeSetupView() } }; case .team: TeamToolsView(); case .engine: EngineRoomView(page: $enginePage) }
    }
}
struct NativeHome: View {
    @EnvironmentObject var destinations: DestinationStore
    var showAllowance = true
    @State private var adding = false
    @State private var managing = false
    @State private var setup = false
    var body: some View {
        NavigationStack {
            if let remote = destinations.selected {
                List {
                    Section { DestinationBar(remote: remote, adding: $adding, managing: $managing, setup: $setup) }
                    if showAllowance { Section { ProviderUsageStrip(store: remote) } }
                    Section("This Mac") { NavigationLink("Schedules") { SchedulesView().environmentObject(remote) }; NavigationLink("Workspace context") { ContextView().environmentObject(remote) } }
                    Section("Needs attention") { ForEach(remote.state["runs"].array.filter { $0["status"].string == "awaiting_input" }, id: \.self) { run in NavigationLink { ChatView(id: run["id"].string).environmentObject(remote) } label: { Label(run["title"].string, systemImage: "exclamationmark.circle") } } }
                }.navigationTitle("Home")
            } else { PairView().toolbar { Button("App setup") { setup = true }.accessibilityIdentifier("app-setup") } }
        }
        .sheet(isPresented: $setup) { NavigationStack { NativeSetupView() } }
        .sheet(isPresented: $managing) { NavigationStack { DestinationsView { managing = false; adding = true }.toolbar { Button("Done") { managing = false } } } }
        .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { adding = false } } } }
        .onChange(of: destinations.pairing != nil) { _, value in if !value { adding = false } }
    }
}
struct AggregateChat: Identifiable { let hostID: String; let hostName: String; let run: JSON; var id: String { hostID + ":" + run["id"].string } }
struct AggregateChatsView: View {
    @EnvironmentObject var destinations: DestinationStore
    @State private var query = ""
    @State private var filter = "all"
    @State private var newChat = false
    @State private var selected: AggregateChat?
    private var chats: [AggregateChat] {
        destinations.destinations.flatMap { d in (destinations.remote(for: d.id)?.state["runs"].array ?? []).map { AggregateChat(hostID: d.id, hostName: d.label, run: $0) } }.filter { (filter == "all" || $0.hostID == filter) && (query.isEmpty || ($0.run["title"].string + " " + $0.hostName).localizedCaseInsensitiveContains(query)) }.sorted { ($0.run["updatedAt"].string.isEmpty ? $0.run["createdAt"].string : $0.run["updatedAt"].string) > ($1.run["updatedAt"].string.isEmpty ? $1.run["createdAt"].string : $1.run["updatedAt"].string) }
    }
    var body: some View {
        NavigationStack {
            List {
                Picker("Host filter", selection: $filter) { Text("All Macs").tag("all"); ForEach(destinations.destinations) { Text($0.label).tag($0.id) } }
                Section { Text("New chats execute on \(destinations.selectedLabel). Viewing another Mac’s history does not change that destination.").font(.caption).foregroundStyle(.secondary) }
                ForEach(chats) { item in Button { destinations.remote(for: item.hostID)?.activity(true); selected = item } label: { VStack(alignment: .leading, spacing: 5) { HStack { if item.run["status"].string == "awaiting_input" { Text("!").foregroundStyle(.orange) }; Text(item.run["title"].string).foregroundStyle(.primary).font(.headline) }; Text(item.hostName + " · " + statusLabel(item.run["status"].string)).font(.caption).foregroundStyle(.secondary); if destinations.remote(for: item.hostID)?.connected != true { Text("Offline · cached history").font(.caption2).foregroundStyle(.orange) } } } }
                ForEach(destinations.destinations) { d in if let remote = destinations.remote(for: d.id), remote.state["runs"].array.count < remote.state["runCount"].int { Button("Load older · " + d.label) { Task { await remote.loadMoreRuns() } }.disabled(!remote.connected) } }
            }.navigationTitle("Chats").searchable(text: $query).refreshable { await destinations.refreshAll() }
                .toolbar { Menu { ForEach(destinations.destinations) { d in Button(d.label) { try? destinations.select(d.id) } } } label: { Label(destinations.selectedLabel, systemImage: "desktopcomputer") }; Button("New chat", systemImage: "square.and.pencil") { newChat = true }.disabled(destinations.selected?.connected != true).accessibilityIdentifier("new-chat") }
                .sheet(isPresented: $newChat) { if let remote = destinations.selected { NewChatView { id in newChat = false; selected = AggregateChat(hostID: remote.connection?.hostId ?? "", hostName: destinations.destinations.first(where: { $0.id == remote.connection?.hostId })?.label ?? "Mac", run: .object(["id": .string(id)])) }.environmentObject(remote) } }
                .navigationDestination(item: $selected) { item in if let remote = destinations.remote(for: item.hostID) { ChatView(id: item.run["id"].string).environmentObject(remote) } }
                .onChange(of: destinations.selected?.selectedChat) { _, id in if let id, let hostID = destinations.selectedID { selected = AggregateChat(hostID: hostID, hostName: destinations.selectedLabel, run: .object(["id": .string(id)])) } }
        }.task { await destinations.refreshAll(); if let id = destinations.selected?.selectedChat, let hostID = destinations.selectedID { selected = AggregateChat(hostID: hostID, hostName: destinations.selectedLabel, run: .object(["id": .string(id)])) } }
    }
}
extension AggregateChat: Hashable { static func == (lhs: Self, rhs: Self) -> Bool { lhs.id == rhs.id }; func hash(into hasher: inout Hasher) { hasher.combine(id) } }

import SwiftUI
import UIKit
enum NativeTheme { static let accent = Color(red: 0.67, green: 0.86, blue: 0.49) }
struct NativeTabClipProbe: UIViewRepresentable {
    var onChange: (Bool) -> Void
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView { UIView(frame: .zero) }
    func updateUIView(_ view: UIView, context: Context) {
        context.coordinator.onChange = onChange
        context.coordinator.attach(from: view)
        DispatchQueue.main.async { [weak view, weak coordinator = context.coordinator] in if let view, let coordinator { coordinator.attach(from: view) } }
    }
    static func dismantleUIView(_ view: UIView, coordinator: Coordinator) { coordinator.offsetObservation = nil; coordinator.sizeObservation = nil; coordinator.boundsObservation = nil; coordinator.scrollView = nil }
    @MainActor final class Coordinator: NSObject {
        weak var scrollView: UIScrollView?
        var offsetObservation: NSKeyValueObservation?
        var sizeObservation: NSKeyValueObservation?
        var boundsObservation: NSKeyValueObservation?
        var onChange: (Bool) -> Void = { _ in }
        func attach(from view: UIView) {
            guard scrollView == nil else { return }
            var parent = view.superview
            while let current = parent {
                if let scroll = current as? UIScrollView {
                    scrollView = scroll
                    offsetObservation = scroll.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in Task { @MainActor [weak self] in self?.report() } }
                    sizeObservation = scroll.observe(\.contentSize, options: [.new]) { [weak self] _, _ in Task { @MainActor [weak self] in self?.report() } }
                    boundsObservation = scroll.observe(\.bounds, options: [.new]) { [weak self] _, _ in Task { @MainActor [weak self] in self?.report() } }
                    report()
                    return
                }
                parent = current.superview
            }
        }
        private func report() {
            guard let scrollView else { return }
            onChange(scrollView.contentOffset.x + scrollView.bounds.width < scrollView.contentSize.width - 2)
        }
    }
}
enum NativeNavigationCounts {
    private static func exactCount(_ value: JSON) -> Int? {
        guard case .number(let count) = value, count.isFinite, count >= 0, count.rounded(.towardZero) == count, count < Double(Int.max) else { return nil }
        return Int(count)
    }
    static func chats(_ states: [JSON]) -> Int? {
        guard !states.isEmpty else { return nil }
        let values = states.compactMap { exactCount($0["runCount"]) }
        guard values.count == states.count else { return nil }
        return values.reduce(0, +)
    }
    static func attention(_ states: [JSON]) -> Int? {
        guard !states.isEmpty else { return nil }
        let values = states.compactMap { state -> Int? in
            if let exact = exactCount(state["attentionCount"]) { return exact }
            guard state["attentionCount"] == .null, let total = exactCount(state["runCount"]), total <= 100,
                  case .array = state["runs"] else { return nil }
            let visible = state["runs"].array.filter { !$0["archived"].bool && $0["archivedAt"].string.isEmpty }
            guard visible.count == total,
                  Set(visible.map { $0["id"].string }).count == total,
                  visible.allSatisfy({ !$0["id"].string.isEmpty && ($0["attentionRequired"] == .bool(true) || $0["attentionRequired"] == .bool(false)) }) else { return nil }
            return visible.filter(nativeNeedsAttention).count
        }
        guard values.count == states.count else { return nil }
        return values.reduce(0, +)
    }
    static func schedules(_ states: [JSON]) -> Int? {
        guard !states.isEmpty, states.allSatisfy({ if case .array = $0["schedules"] { return true }; return false }) else { return nil }
        return states.reduce(0) { $0 + $1["schedules"].array.count }
    }
}
func nativeNeedsAttention(_ run: JSON) -> Bool {
    guard !run["archived"].bool, run["archivedAt"].string.isEmpty else { return false }
    if run["attentionRequired"] != .null { return run["attentionRequired"].bool }
    return run["status"].string == "awaiting_input" || (["failed", "interrupted"].contains(run["status"].string) && run["failureReviewedAt"].string.isEmpty)
}

private enum NativeArea: String, CaseIterable, Identifiable {
    case home = "Home", schedules = "Schedules", chats = "Chats", attention = "Needs Attention", life = "Life", team = "Team", engine = "Engine Room"
    var id: String { rawValue }
    var icon: String { switch self { case .home: "house"; case .schedules: "calendar"; case .chats: "bubble.left.and.bubble.right"; case .attention: "exclamationmark"; case .life: "heart.text.square"; case .team: "person.3"; case .engine: "gearshape.2" } }
}
private struct NativeContentTab: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let kind: String
    let hostID: String?
}
struct NotificationChatRequest: Equatable {
    let token = UUID()
    let hostID: String
    let chatID: String
}
private struct NotificationScheduleTarget: Identifiable {
    let id = UUID()
    let hostID: String
    let scheduleID: String
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
    @State private var opened: [NativeContentTab] = []
    @State private var selectedTab: String?
    @State private var restoredSelection: String?
    @State private var restoringTabs = true
    @State private var navigationReady = false
    @State private var notificationChatRequest: NotificationChatRequest?
    @State private var notificationScheduleTarget: NotificationScheduleTarget?
    @State private var shellRename: AggregateChat?
    @State private var shellDelete: AggregateChat?
    @State private var mainTabsClipped = false
    @State private var enginePage = "Overview"
    @AppStorage("lifeEnabled") private var lifeEnabled = false
    @ObservedObject private var notifications = NativeNotifications.shared
    private var tablet: Bool { sizeClass == .regular }
    private let tabAccent = NativeTheme.accent
    private func count(for item: NativeArea) -> Int? {
        if item == .schedules { return destinations.selected.flatMap { $0.connected ? NativeNavigationCounts.schedules([$0.state]) : nil } }
        let remotes = destinations.destinations.map { destinations.remote(for: $0.id) }
        guard !remotes.isEmpty, remotes.allSatisfy({ $0?.connected == true }) else { return nil }
        let states = remotes.map { $0?.state ?? .null }
        switch item {
        case .chats: return NativeNavigationCounts.chats(states)
        case .attention: return NativeNavigationCounts.attention(states)
        default: return nil
        }
    }
    private var selectedChatEntry: AggregateChat? {
        guard let tab = opened.first(where: { $0.id == selectedTab }) else { return nil }
        return chatEntry(for: tab)
    }
    private func chatEntry(for tab: NativeContentTab) -> AggregateChat? {
        guard tab.kind == "chat", let hostID = tab.hostID, let remote = destinations.remote(for: hostID) else { return nil }
        let chatID = String(tab.id.dropFirst(hostID.count + 1))
        let run = remote.chats[chatID] ?? remote.state["runs"].array.first(where: { $0["id"].string == chatID }) ?? .null
        guard run != .null else { return nil }
        return AggregateChat(hostID: hostID, hostName: destinations.destinations.first(where: { $0.id == hostID })?.label ?? "Mac", run: run)
    }
    private var recentChats: [AggregateChat] {
        Array(destinations.destinations.flatMap { destination in
            (destinations.remote(for: destination.id)?.state["runs"].array ?? []).map { AggregateChat(hostID: destination.id, hostName: destination.label, run: $0) }
        }.sorted { ($0.run["updatedAt"].string.isEmpty ? $0.run["createdAt"].string : $0.run["updatedAt"].string) > ($1.run["updatedAt"].string.isEmpty ? $1.run["createdAt"].string : $1.run["updatedAt"].string) }.prefix(5))
    }
    private func title(for tab: NativeContentTab) -> String {
        if tab.kind == "browser" { return shared.browserTabs.first(where: { $0.id == tab.id })?.title ?? tab.title }
        if tab.kind == "chat", let hostID = tab.hostID, let remote = destinations.remote(for: hostID) {
            let chatID = String(tab.id.dropFirst(hostID.count + 1))
            let title = (remote.chats[chatID] ?? remote.state["runs"].array.first(where: { $0["id"].string == chatID }) ?? .null)["title"].string
            if !title.isEmpty { return title }
        }
        return tab.title
    }
    var body: some View {
        Group {
            if tablet {
                HStack(spacing: 0) {
                    if sidebar { rail.frame(width: 250); Divider() }
                    else { collapsedRail.frame(width: 52); Divider() }
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            Button { sidebar.toggle() } label: { Label("Toggle sidebar", systemImage: "sidebar.left") }.labelStyle(.iconOnly).padding(10).keyboardShortcut("s", modifiers: [.command, .option])
                            HStack(spacing: 5) { Text("⤨").foregroundStyle(tabAccent).font(.title3.bold()); Text("Proteus").font(.subheadline.bold()) }
                                .accessibilityElement(children: .combine).padding(.trailing, 10)
                            ScrollView(.horizontal) { HStack(spacing: 0) {
                                ForEach(opened) { tab in
                                    HStack { Button(title(for: tab)) { selectContent(tab) }.lineLimit(1).accessibilityIdentifier("shell-tab-" + tab.id).accessibilityValue(selectedTab == tab.id ? "Active" : "Inactive"); Button { closeContent(tab) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + title(for: tab)) }
                                        .padding(12).background(selectedTab == tab.id ? tabAccent.opacity(0.08) : Color.clear)
                                        .overlay(alignment: .bottom) { Rectangle().fill(selectedTab == tab.id ? tabAccent : .clear).frame(height: 2) }.id(tab.id)
                                        .draggable(tab.id).dropDestination(for: String.self) { ids, _ in guard let source = ids.first else { return false }; return moveContent(source, before: tab.id) }
                                        .contextMenu {
                                            Button("Copy tab name", systemImage: "doc.on.doc") { UIPasteboard.general.string = title(for: tab) }
                                            if let entry = chatEntry(for: tab), destinations.remote(for: entry.hostID)?.state["capabilities"].array.contains(.string("chat.rename.v1")) == true { Button("Rename", systemImage: "pencil") { shellRename = entry } }
                                            Button("Move left", systemImage: "arrow.left") { shiftContent(tab.id, by: -1) }.disabled(opened.first?.id == tab.id)
                                            Button("Move right", systemImage: "arrow.right") { shiftContent(tab.id, by: 1) }.disabled(opened.last?.id == tab.id)
                                            Button("Close tab", systemImage: "xmark") { closeContent(tab) }
                                            Button("Close other tabs") { for other in opened.filter({ $0.id != tab.id }) { closeContent(other) }; selectContent(tab) }.disabled(opened.count < 2)
                                            Button("Close tabs to the right") { if let index = opened.firstIndex(where: { $0.id == tab.id }) { for other in Array(opened.dropFirst(index + 1)) { closeContent(other) } } }.disabled(opened.last?.id == tab.id)
                                        }
                                    Divider().frame(height: 24)
                                }
                            }.buttonStyle(.plain).background(NativeTabClipProbe { mainTabsClipped = $0 }.frame(width: 1, height: 1).opacity(0)) }.scrollIndicators(.hidden)
                                .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: mainTabsClipped ? 0.9 : 1), .init(color: mainTabsClipped ? .clear : .black, location: 1)], startPoint: .leading, endPoint: .trailing) }
                                if let entry = selectedChatEntry {
                                    Menu {
                                        if destinations.remote(for: entry.hostID)?.state["capabilities"].array.contains(.string("chat.rename.v1")) == true { Button("Rename", systemImage: "pencil") { shellRename = entry } }
                                        Button(entry.run["archived"].bool ? "Unarchive chat" : "Archive chat", systemImage: "archivebox") {
                                            Task { do { try await destinations.remote(for: entry.hostID)?.archiveChat(entry.run["id"].string, archived: !entry.run["archived"].bool) } catch { destinations.error = error.localizedDescription } }
                                        }.disabled(chatHasPendingWork(entry.run))
                                        Button("Delete chat", systemImage: "trash", role: .destructive) { shellDelete = entry }.disabled(chatHasPendingWork(entry.run))
                                    } label: { Image(systemName: "ellipsis.circle") }.padding(12).accessibilityLabel("Chat actions")
                                }
                                Menu {
                                    Button("Browser", systemImage: "globe") { shared.open(nil, scope: "main") }
                                    Button("Chat", systemImage: "bubble.left.and.bubble.right") { area = .chats; selectedTab = nil }
                                    Button("Schedule", systemImage: "calendar") { area = .home; selectedTab = nil }
                                    Button("Terminal · Mac only", systemImage: "terminal") {}.disabled(true)
                                    Button("File · grant required", systemImage: "doc") {}.disabled(true)
                                } label: { Image(systemName: "plus") }
                                    .padding(12).accessibilityLabel("New tab").accessibilityIdentifier("new-main-browser-tab")
                        }.background(.bar)
                        Divider(); if let selected = opened.first(where: { $0.id == selectedTab }) { contentTab(selected) } else { content(area) }
                    }
                }.overlay(alignment: .leading) {
                    if !sidebar { Color.clear.frame(width: 10).contentShape(Rectangle()).onHover { edgeHover($0) }.overlay(alignment: .topLeading) { if hover { rail.frame(width: 250).background(.regularMaterial).onHover { edgeHover($0) }.shadow(radius: 10) } } }
                }
            } else {
                TabView(selection: $area) {
                    Group { if area == .home { NativeHome() } else { Color.clear } }.tabItem { Label("Home", systemImage: "house") }.tag(NativeArea.home)
                    AggregateChatsView(notificationRequest: notificationChatRequest, onNotificationConsumed: { notificationChatRequest = nil }).tabItem { Label("Chats", systemImage: "bubble.left.and.bubble.right") }.badge(count(for: .chats) ?? 0).tag(NativeArea.chats)
                    Group { if lifeEnabled || ProcessInfo.processInfo.arguments.contains("--synthetic-life") { LifeRootView() } else { NavigationStack { NativeSetupView() } } }.tabItem { Label("Life", systemImage: "heart.text.square") }.tag(NativeArea.life)
                    TeamToolsView().tabItem { Label("Team", systemImage: "person.3") }.tag(NativeArea.team)
                    EngineRoomView(page: $enginePage).tabItem { Label("Engine Room", systemImage: "gearshape.2") }.tag(NativeArea.engine)
                }
            }
        }
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
        .sheet(item: $notificationScheduleTarget) { target in
            if let remote = destinations.remote(for: target.hostID) {
                NavigationStack {
                    ScheduleView(id: target.scheduleID) { runID in
                        notificationScheduleTarget = nil
                        notificationChatRequest = NotificationChatRequest(hostID: target.hostID, chatID: runID)
                        area = .chats
                    }.environmentObject(remote)
                    .toolbar { Button("Done") { notificationScheduleTarget = nil } }
                }
            }
        }
        .sheet(item: $shellRename) { entry in if let remote = destinations.remote(for: entry.hostID) { NativeChatRenameView(run: entry.run).environmentObject(remote) } }
        .confirmationDialog("Delete this chat?", isPresented: Binding(get: { shellDelete != nil }, set: { if !$0 { shellDelete = nil } })) {
            Button("Delete chat", role: .destructive) { if let entry = shellDelete { Task { do { try await destinations.remote(for: entry.hostID)?.deleteChat(entry.run["id"].string) } catch { destinations.error = error.localizedDescription } } }; shellDelete = nil }
            Button("Cancel", role: .cancel) { shellDelete = nil }
        } message: { Text("Only the Proteus chat record will be removed. Generated files and the provider’s original chat remain.") }
        .alert("Download", isPresented: Binding(get: { shared.downloadError != nil }, set: { if !$0 { shared.downloadError = nil } })) { Button("OK") { shared.downloadError = nil } } message: { Text(shared.downloadError ?? "") }
        .onChange(of: area) { _, _ in MessageSpeech.shared.stop(); selectedTab = nil }
        .onChange(of: shared.browserTabs) { _, tabs in
            for tab in tabs where tab.scope == "main" && !opened.contains(where: { $0.id == tab.id }) {
                opened.append(NativeContentTab(id: tab.id, title: tab.title, kind: "browser", hostID: nil))
                if navigationReady && shared.selectedMainBrowser == tab.id { selectedTab = tab.id }
            }
            opened.removeAll { item in item.kind == "browser" && !tabs.contains(where: { $0.id == item.id }) }
        }
        .onChange(of: destinations.deletedChat) { _, event in
            guard let event else { return }
            shared.removeChatWorkspace(hostID: event.hostID, chatID: event.chatID)
            let tabID = event.hostID + ":" + event.chatID
            opened.removeAll { $0.id == tabID }
            if selectedTab == tabID { selectedTab = nil }
            if restoredSelection == tabID { restoredSelection = nil }
            if notificationChatRequest?.hostID == event.hostID && notificationChatRequest?.chatID == event.chatID { notificationChatRequest = nil }
        }
        .onChange(of: opened) { _, _ in saveNavigation() }
        .onChange(of: selectedTab) { _, value in if value != nil { restoredSelection = nil }; saveNavigation() }
        .onChange(of: area) { _, _ in saveNavigation() }
        .onChange(of: destinations.pairing != nil) { _, pairing in if pairing { area = .home } }
        .onChange(of: life.accountIdentity) { _, identity in MessageSpeech.shared.stop(); shared.reset(for: identity) }
        .onChange(of: destinations.selectedID) { _, _ in MessageSpeech.shared.stop() }
        .onChange(of: notifications.route) { _, route in
            guard navigationReady, let route else { return }
            notifications.route = nil
            Task { await openNotification(route) }
        }
        .task {
            notifications.attach(life)
            shared.reset(for: life.accountIdentity)
            restoreNavigation()
            navigationReady = true
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--synthetic-nav-counts") { return }
            #endif
            if let route = notifications.route { notifications.route = nil; await openNotification(route) }
            await shared.refresh(life)
            await notifications.syncSubscription()
            while !Task.isCancelled {
                for destination in destinations.destinations {
                    if let remote = destinations.remote(for: destination.id), remote.connected, let activity = try? await remote.request("notifications.list") { notifications.observe(activity["items"].array, hostID: destination.id) }
                }
                shared.pruneBrowsers()
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
            }
        }
    }
    private var rail: some View {
        VStack(spacing: 0) {
            List {
                HStack(spacing: 7) { Text("⤨").foregroundStyle(tabAccent); Text("Proteus") }.font(.title2.bold())
                ForEach(NativeArea.allCases) { item in
                    Button { area = item; selectedTab = nil; hover = false } label: {
                        HStack { Label(item.rawValue, systemImage: item.icon).fontWeight(area == item ? .semibold : .regular); Spacer(minLength: 4); if let value = count(for: item) { Text(String(value)).font(.caption.bold()).foregroundStyle(NativeTheme.accent).accessibilityLabel("\(value) \(item.rawValue.lowercased())").accessibilityIdentifier("nav-count-" + item.id) } }.accessibilityElement(children: .contain)
                    }
                    if area == item && item == .chats {
                        ForEach(recentChats) { entry in
                            Button { openChat(entry) }
                                label: { HStack { if entry.run["status"].string == "awaiting_input" { Text("!").foregroundStyle(.orange) }; Text(entry.run["title"].string).lineLimit(1).font(.caption) } }.padding(.leading)
                        }
                        Button("More…") { area = .chats }.padding(.leading)
                    }
                    if area == item && item == .team {
                        ForEach(["Overview", "Standup"], id: \.self) { title in Button(title) { teamSection = title }.font(.caption).padding(.leading).accessibilityIdentifier("team-sidebar-" + title.lowercased()) }
                        ForEach(shared.tabs(in: "team")) { tab in Button { shared.select(tab.id, in: "team"); teamSection = tab.id } label: { Label(tab.title, systemImage: "globe").font(.caption).lineLimit(1) }.padding(.leading) }
                    }
                    if area == item && item == .life { ForEach(["overview", "nutrition", "garage", "fuel", "captures"], id: \.self) { title in Button(title.capitalized) { lifeSection = title }.font(.caption).padding(.leading) } }
                    if area == item && item == .engine { ForEach(EngineRoomView.pages, id: \.self) { title in Button(title) { enginePage = title }.font(.caption).padding(.leading) } }
                }
            }.listStyle(.sidebar)
            if let remote = destinations.selected { ProviderUsageStrip(store: remote) }
        }
    }
    private var collapsedRail: some View {
        VStack(spacing: 10) {
            Text("⤨").font(.title2.bold()).foregroundStyle(tabAccent).accessibilityLabel("Proteus")
            ForEach(NativeArea.allCases) { item in
                Button { area = item; selectedTab = nil } label: { Image(systemName: item.icon).font(.system(size: 19, weight: .medium)).frame(width: 40, height: 40).background(area == item && selectedTab == nil ? tabAccent.opacity(0.18) : .clear, in: RoundedRectangle(cornerRadius: 8)).overlay(alignment: .topTrailing) { if let value = count(for: item), value > 0 { Text(String(value)).font(.system(size: 9, weight: .bold)).padding(3).background(NativeTheme.accent, in: Capsule()).foregroundStyle(.black) } } }
                    .accessibilityLabel(item.rawValue + (count(for: item).map { ", \($0)" } ?? "")).help(item.rawValue)
            }
            Spacer()
        }.padding(.top, 8).background(.bar)
    }
    private func notificationFallback(_ message: String? = nil) {
        selectedTab = nil; enginePage = "Notifications"; area = .engine
        if let message { destinations.error = message }
    }
    private func openNotification(_ route: NativeNotifications.NotificationRoute) async {
        guard !route.hostID.isEmpty else { notificationFallback(); return }
        guard destinations.destinations.contains(where: { $0.id == route.hostID }) else {
            notificationFallback("This notification refers to a Mac that is not paired on this device."); return
        }
        do { try destinations.select(route.hostID) }
        catch { notificationFallback("This Mac’s saved connection is unavailable. Check Manage Macs."); return }
        guard let remote = destinations.remote(for: route.hostID) else { notificationFallback(); return }
        if route.type == "schedule.completed", !route.scheduleID.isEmpty {
            if !remote.state["schedules"].array.contains(where: { $0["id"].string == route.scheduleID }), remote.connected { await remote.refresh() }
            guard remote.state["schedules"].array.contains(where: { $0["id"].string == route.scheduleID }) else {
                notificationFallback("This schedule is not available on this device. Reconnect the Mac and refresh Schedules."); return
            }
            if tablet {
                openSchedule(remote.state["schedules"].array.first { $0["id"].string == route.scheduleID } ?? .null, hostID: route.hostID)
            } else { selectedTab = nil; area = .home; notificationScheduleTarget = NotificationScheduleTarget(hostID: route.hostID, scheduleID: route.scheduleID) }
            return
        }
        guard !route.chatID.isEmpty else { notificationFallback(); return }
        if remote.chats[route.chatID] == nil, remote.connected {
            do { remote.mergeChat(try await remote.request("chat.get", ["id": .string(route.chatID)])) }
            catch { notificationFallback("This chat could not be opened. Reconnect the Mac and open it from Chats."); return }
        }
        guard remote.chats[route.chatID] != nil else {
            notificationFallback("This chat is not cached on this device. Reconnect the Mac and open it from Chats."); return
        }
        if tablet {
            let run = remote.chats[route.chatID] ?? .null
            openChat(AggregateChat(hostID: route.hostID, hostName: destinations.selectedLabel, run: run))
        } else { selectedTab = nil; area = .chats; notificationChatRequest = NotificationChatRequest(hostID: route.hostID, chatID: route.chatID) }
    }
    private func edgeHover(_ inside: Bool) { hoverTask?.cancel(); if inside { hover = true } else { hoverTask = Task { try? await Task.sleep(for: .milliseconds(200)); if !Task.isCancelled { hover = false } } } }
    private func openChat(_ entry: AggregateChat) { let id = entry.id; if !opened.contains(where: { $0.id == id }) { opened.append(NativeContentTab(id: id, title: entry.run["title"].string.isEmpty ? "Chat" : entry.run["title"].string, kind: "chat", hostID: entry.hostID)) }; selectedTab = id; destinations.remote(for: entry.hostID)?.activity(true) }
    private func saveNavigation() {
        guard !restoringTabs, let tabs = try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(opened)) else { return }
        shared.saveShellNavigation(.object(["tabs": tabs, "selected": .string(selectedTab ?? restoredSelection ?? ""), "area": .string(area.rawValue)]))
    }
    private func restoreNavigation() {
        let saved = shared.loadShellNavigation()
        if let data = try? JSONEncoder().encode(saved["tabs"]), let tabs = try? JSONDecoder().decode([NativeContentTab].self, from: data) {
            opened = tabs.filter { tab in tab.kind == "browser" ? shared.tabs(in: "main").contains(where: { $0.id == tab.id }) : ["chat", "schedule"].contains(tab.kind) && tab.hostID.map { destinations.remote(for: $0) != nil } == true }
        }
        area = .home
        let choice = saved["selected"].string
        restoredSelection = opened.contains(where: { $0.id == choice }) ? choice : nil
        selectedTab = nil
        restoringTabs = false
    }
    private func selectContent(_ tab: NativeContentTab) { selectedTab = tab.id; if tab.kind == "browser" { shared.select(tab.id, in: "main") } }
    private func openSchedule(_ schedule: JSON, hostID: String) {
        let scheduleID = schedule["id"].string
        guard !scheduleID.isEmpty else { return }
        let tabID = "schedule:\(hostID):\(scheduleID)"
        if !opened.contains(where: { $0.id == tabID }) { opened.append(NativeContentTab(id: tabID, title: schedule["name"].string.isEmpty ? "Schedule" : schedule["name"].string, kind: "schedule", hostID: hostID)) }
        selectedTab = tabID
    }
    private func closeContent(_ tab: NativeContentTab) { if tab.kind == "browser" { shared.close(tab.id) }; opened.removeAll { $0.id == tab.id }; if selectedTab == tab.id { selectedTab = opened.last?.id } }
    @discardableResult private func moveContent(_ id: String, before targetID: String) -> Bool {
        guard id != targetID, let source = opened.firstIndex(where: { $0.id == id }) else { return false }
        let tab = opened.remove(at: source)
        guard let target = opened.firstIndex(where: { $0.id == targetID }) else { opened.insert(tab, at: source); return false }
        opened.insert(tab, at: target)
        return true
    }
    private func shiftContent(_ id: String, by offset: Int) {
        guard let index = opened.firstIndex(where: { $0.id == id }), opened.indices.contains(index + offset) else { return }
        if offset < 0 { _ = moveContent(id, before: opened[index + offset].id) }
        else { _ = moveContent(opened[index + offset].id, before: id) }
    }
    @ViewBuilder private func contentTab(_ tab: NativeContentTab) -> some View {
        if tab.kind == "browser" { TeamBrowserView(scope: "main", showTabs: false).onAppear { shared.select(tab.id, in: "main") } }
        else if let hostID = tab.hostID, let remote = destinations.remote(for: hostID) {
            if tab.kind == "schedule" {
                NavigationStack { ScheduleView(id: String(tab.id.dropFirst("schedule:\(hostID):".count))) { runID in openChat(AggregateChat(hostID: hostID, hostName: destinations.selectedLabel, run: .object(["id": .string(runID)]))) }.environmentObject(remote) }
            } else { NavigationStack { ChatView(id: String(tab.id.dropFirst(hostID.count + 1)), onBack: { selectedTab = nil; area = .chats }).environmentObject(remote) } }
        }
    }
    @ViewBuilder private func content(_ item: NativeArea) -> some View {
        switch item { case .home: NativeHome(showAllowance: false, onSchedule: tablet ? { schedule in if let hostID = destinations.selectedID { openSchedule(schedule, hostID: hostID) } } : nil); case .schedules: if let remote = destinations.selected { SchedulesView(onSelect: { schedule in if let hostID = destinations.selectedID { openSchedule(schedule, hostID: hostID) } }).environmentObject(remote) } else { NativeHome() }; case .chats: AggregateChatsView(onSelect: tablet ? openChat : nil, notificationRequest: notificationChatRequest, onNotificationConsumed: { notificationChatRequest = nil }); case .attention: AggregateChatsView(onSelect: tablet ? openChat : nil, attentionOnly: true); case .life: if lifeEnabled || ProcessInfo.processInfo.arguments.contains("--synthetic-life") { LifeRootView() } else { NavigationStack { NativeSetupView() } }; case .team: TeamToolsView(); case .engine: EngineRoomView(page: $enginePage) }
    }
}
struct NativeHome: View {
    @EnvironmentObject var destinations: DestinationStore
    var showAllowance = true
    var onSchedule: ((JSON) -> Void)? = nil
    @State private var adding = false
    @State private var managing = false
    @State private var setup = false
    @State private var updates = false
    private var attentionCount: Int? {
        let remotes = destinations.destinations.map { destinations.remote(for: $0.id) }
        guard !remotes.isEmpty, remotes.allSatisfy({ $0?.connected == true }) else { return nil }
        return NativeNavigationCounts.attention(remotes.map { $0?.state ?? .null })
    }
    private var version: String { Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown" }
    private var build: String { Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown" }
    var body: some View {
        NavigationStack {
            if let remote = destinations.selected {
                List {
                    Section {
                        HStack(spacing: 10) { Text("⤨").font(.system(size: 36, weight: .bold)).foregroundStyle(Color(red: 0.67, green: 0.86, blue: 0.49)); Text("Proteus").font(.largeTitle.bold()) }
                            .accessibilityElement(children: .combine).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 4)
                        Text("Proteus keeps conversations, schedules and tools connected to your Macs. Choose a Mac, review work that needs your input, or open a chat.")
                        Text("Version \(version) (\(build))").font(.caption).foregroundStyle(.secondary)
                        Button("Future updates and changelog", systemImage: "clock.arrow.circlepath") { updates = true }
                    }
                    Section { DestinationBar(remote: remote, adding: $adding, managing: $managing, setup: $setup) }
                    if showAllowance { Section { ProviderUsageStrip(store: remote) } }
                    Section("This Mac") { NavigationLink("Schedules" + ((remote.connected ? NativeNavigationCounts.schedules([remote.state]) : nil).map { " · \($0)" } ?? "")) { SchedulesView(onSelect: onSchedule).environmentObject(remote) }; NavigationLink("Workspace context") { ContextView().environmentObject(remote) } }
                    Section("Needs attention" + (attentionCount.map { " · \($0)" } ?? "")) {
                        NavigationLink("View all Macs") { AggregateChatsView(attentionOnly: true) }
                        ForEach(remote.state["runs"].array.filter(nativeNeedsAttention), id: \.self) { run in NavigationLink { ChatView(id: run["id"].string).environmentObject(remote) } label: { Label(run["title"].string, systemImage: "exclamationmark.circle") } }
                    }
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-notification-controls") {
                        Section("Notification routing fixture") {
                            Button("Tap chat notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "notification-chat", "type": "chat.completed"]) }
                            Button("Tap schedule notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "scheduleId": "notification-schedule", "type": "schedule.completed"]) }
                            Button("Tap unavailable notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "missing-chat", "type": "chat.completed"]) }
                            Button("Schedule iOS notification fixture") { Task { do { try await NativeNotifications.shared.scheduleFixtureTap() } catch { destinations.error = error.localizedDescription } } }
                            Button("Stage background chat notification") { Task { try? await Task.sleep(for: .seconds(1)); NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "notification-chat", "type": "chat.completed"]) } }
                        }
                    }
                    #endif
                }.navigationTitle("Home")
            } else { VStack(spacing: 0) { HStack(spacing: 10) { Text("⤨").font(.system(size: 34, weight: .bold)).foregroundStyle(NativeTheme.accent); VStack(alignment: .leading) { Text("Proteus").font(.largeTitle.bold()); Text("\(version) (\(build))").font(.caption).foregroundStyle(.secondary) }; Spacer(); Button("Future updates and changelog") { updates = true }.font(.caption) }.padding(); PairView() }.toolbar { Button("App setup") { setup = true }.accessibilityIdentifier("app-setup") } }
        }
        .sheet(isPresented: $updates) { NavigationStack { List {
            Section("Installed release") { Text("Proteus \(version) (\(build))"); Text("The displayed version comes from this installed app bundle.").font(.caption).foregroundStyle(.secondary) }
            Section("Changes in \(version)") {
                Text("Content tabs and nested chat and Team tools keep their order across app restarts. Browser pages resume on selection, with the six most recently touched or past-hour pages retained in memory.")
                Text("Home now shows release information. Reviewed failed chats leave Needs Attention; pending approvals remain visible.")
                Text("Notification taps open the related Mac, chat or schedule. An unavailable target returns to Notifications with a clear explanation.")
                Text("Chats can be archived, restored or deleted from the list or conversation view. Date filters and Show Archived help find older work; deleting a Proteus record leaves generated files and provider originals in place.")
                Text("Chat history groups routine activity, keeps failed tools visible, loads earlier messages and shows provider details. Generated Markdown and self-contained HTML require a specific Mac approval before viewing; HTML scripts are off until enabled for that preview.")
                Text("Attachment selection appears only after the connected Mac advertises its approved attachment capability. File delivery also requires explicit confirmation of the destination provider.")
            }
            Section("Release history") { DisclosureGroup("Full changelog") { BundledChangelogView() } }
            Section("Update availability") { Text("This signed development build is installed through Xcode. Install availability is managed by its distribution source; Proteus cannot check a store feed for this build.") }
        }.navigationTitle("Updates and changelog").toolbar { Button("Done") { updates = false } } } }
        .sheet(isPresented: $setup) { NavigationStack { NativeSetupView() } }
        .sheet(isPresented: $managing) { NavigationStack { DestinationsView { managing = false; adding = true }.toolbar { Button("Done") { managing = false } } } }
        .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { adding = false } } } }
        .onChange(of: destinations.pairing != nil) { _, value in if !value { adding = false } }
    }
}
private struct BundledChangelogView: View {
    @State private var content: String?
    var body: some View {
        Group {
            if let content {
                Text((try? AttributedString(markdown: content)) ?? AttributedString(content))
                    .font(.caption).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("bundled-changelog")
            } else { Text("The bundled changelog is unavailable in this build.").font(.caption).foregroundStyle(.secondary) }
        }.task {
            guard content == nil else { return }
            if let file = Bundle.main.url(forResource: "CHANGELOG", withExtension: "md"),
               let body = try? String(contentsOf: file, encoding: .utf8) { content = body }
        }
    }
}
struct AggregateChat: Identifiable { let hostID: String; let hostName: String; let run: JSON; var id: String { hostID + ":" + run["id"].string } }
private func chatRowTimestamp(_ run: JSON, timeZone: TimeZone) -> String {
    let value = run["updatedAt"].string.isEmpty ? run["createdAt"].string : run["updatedAt"].string
    let fractional = ISO8601DateFormatter(); fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let date = fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value) else { return "" }
    let formatter = DateFormatter(); formatter.dateStyle = .short; formatter.timeStyle = .short; formatter.timeZone = timeZone
    return formatter.string(from: date)
}
struct AggregateChatsView: View {
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.timeZone) private var timeZone
    var onSelect: ((AggregateChat) -> Void)? = nil
    var attentionOnly = false
    var notificationRequest: NotificationChatRequest? = nil
    var onNotificationConsumed: (() -> Void)? = nil
    @State private var query = ""
    @State private var filter = "all"
    @State private var filtersExpanded = false
    @State private var fromEnabled = false
    @State private var throughEnabled = false
    @State private var fromDate = Date()
    @State private var throughDate = Date()
    @State private var showArchived = false
    @State private var newChat = false
    @State private var selected: AggregateChat?
    @State private var pendingDelete: AggregateChat?
    @State private var pendingRename: AggregateChat?
    private var chats: [AggregateChat] {
        destinations.destinations.flatMap { d in
            guard let remote = destinations.remote(for: d.id) else { return [AggregateChat]() }
            let rows = showArchived && !remote.allRuns.isEmpty ? remote.allRuns : remote.state["runs"].array
            return rows.map { AggregateChat(hostID: d.id, hostName: d.label, run: $0) }
        }
            .filter { item in
                guard (filter == "all" || item.hostID == filter),
                      (showArchived || item.run["archivedAt"].string.isEmpty),
                      (!attentionOnly || nativeNeedsAttention(item.run)),
                      (query.isEmpty || (item.run["title"].string + " " + item.hostName).localizedCaseInsensitiveContains(query)) else { return false }
                guard fromEnabled || throughEnabled else { return true }
                let timestamp = item.run["updatedAt"].string.isEmpty ? item.run["createdAt"].string : item.run["updatedAt"].string
                guard let date = ProviderAllowance.date(timestamp) else { return false }
                if fromEnabled && date < Calendar.current.startOfDay(for: fromDate) { return false }
                if throughEnabled, let end = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: throughDate)), date >= end { return false }
                return true
            }
            .sorted { ($0.run["updatedAt"].string.isEmpty ? $0.run["createdAt"].string : $0.run["updatedAt"].string) > ($1.run["updatedAt"].string.isEmpty ? $1.run["createdAt"].string : $1.run["updatedAt"].string) }
    }
    var body: some View {
        NavigationStack {
            List {
                DisclosureGroup("Filters", isExpanded: $filtersExpanded) {
                    Picker("Host filter", selection: $filter) { Text("All Macs").tag("all"); ForEach(destinations.destinations) { Text($0.label).tag($0.id) } }
                    Toggle("From Date", isOn: $fromEnabled)
                    if fromEnabled { DatePicker("From Date", selection: $fromDate, displayedComponents: .date).datePickerStyle(.compact) }
                    Toggle("Through Date", isOn: $throughEnabled)
                    if throughEnabled { DatePicker("Through Date", selection: $throughDate, displayedComponents: .date).datePickerStyle(.compact) }
                    Toggle("Show Archived", isOn: $showArchived)
                }
                Section { Text("New chats execute on \(destinations.selectedLabel). Viewing another Mac’s history does not change that destination.").font(.caption).foregroundStyle(.secondary) }
                ForEach(chats) { item in chatRow(item) }
                ForEach(destinations.destinations) { d in if let remote = destinations.remote(for: d.id), (showArchived ? remote.allRuns.count < remote.allRunCount : remote.state["runs"].array.count < remote.state["runCount"].int) { Button("Load older · " + d.label) { Task { if showArchived { await remote.loadAllRuns() } else { await remote.loadMoreRuns() } } }.disabled(!remote.connected) } }
            }.navigationTitle("Chats").searchable(text: $query).refreshable { await destinations.refreshAll() }
                .toolbar { Menu { ForEach(destinations.destinations) { d in Button(d.label) { try? destinations.select(d.id) } } } label: { Label(destinations.selectedLabel, systemImage: "desktopcomputer") }; Button("New chat", systemImage: "square.and.pencil") { newChat = true }.disabled(destinations.selected?.connected != true).accessibilityIdentifier("new-chat") }
                .sheet(isPresented: $newChat) { if let remote = destinations.selected { NewChatView { id in newChat = false; let item = AggregateChat(hostID: remote.connection?.hostId ?? "", hostName: destinations.destinations.first(where: { $0.id == remote.connection?.hostId })?.label ?? "Mac", run: .object(["id": .string(id)])); if let onSelect { onSelect(item) } else { selected = item } }.environmentObject(remote) } }
                .navigationDestination(item: $selected) { item in if let remote = destinations.remote(for: item.hostID) { ChatView(id: item.run["id"].string).environmentObject(remote) } }
                .onChange(of: destinations.selected?.selectedChat) { _, id in if let id, let hostID = destinations.selectedID { let item = AggregateChat(hostID: hostID, hostName: destinations.selectedLabel, run: .object(["id": .string(id)])); if let onSelect { onSelect(item) } else { selected = item } } }
                .onChange(of: notificationRequest) { _, request in if let request { openNotificationChat(request) } }
                .onChange(of: showArchived) { _, visible in if visible { Task { for destination in destinations.destinations { await destinations.remote(for: destination.id)?.loadAllRuns(reset: true) } } } }
                .onChange(of: destinations.deletedChat) { _, event in if let event, selected?.hostID == event.hostID, selected?.run["id"].string == event.chatID { selected = nil } }
                .confirmationDialog("Delete this chat?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })) {
                    Button("Delete chat", role: .destructive) { if let item = pendingDelete { Task { await delete(item) } }; pendingDelete = nil }
                    Button("Cancel", role: .cancel) {}
                } message: { Text("Only the Proteus chat record will be removed. Generated files and the provider’s original chat remain.") }
                .sheet(item: $pendingRename) { item in if let remote = destinations.remote(for: item.hostID) { NativeChatRenameView(run: item.run).environmentObject(remote) } }
        }.task {
            await destinations.refreshAll()
            if let request = notificationRequest { openNotificationChat(request) }
            else if let id = destinations.selected?.selectedChat, let hostID = destinations.selectedID { let item = AggregateChat(hostID: hostID, hostName: destinations.selectedLabel, run: .object(["id": .string(id)])); if let onSelect { onSelect(item) } else { selected = item } }
        }
    }
    private func openNotificationChat(_ request: NotificationChatRequest) {
        guard let remote = destinations.remote(for: request.hostID), let run = remote.chats[request.chatID] else { return }
        let item = AggregateChat(hostID: request.hostID, hostName: destinations.destinations.first(where: { $0.id == request.hostID })?.label ?? "Mac", run: run)
        if let onSelect { onSelect(item) } else { selected = item }
        onNotificationConsumed?()
    }
    private func chatRow(_ item: AggregateChat) -> some View {
        Button {
            destinations.remote(for: item.hostID)?.activity(true)
            if let onSelect { onSelect(item) } else { selected = item }
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    if item.run["attentionRequired"].bool { Text("!").foregroundStyle(.orange) }
                    Text(item.run["title"].string).foregroundStyle(.primary).font(.headline)
                    if !item.run["archivedAt"].string.isEmpty { Text("Archived").font(.caption2).foregroundStyle(.secondary) }
                }
                HStack(spacing: 8) {
                    Text(item.hostName + " · " + statusLabel(item.run["status"].string)).lineLimit(1).truncationMode(.middle)
                    Spacer(minLength: 4)
                    Text(chatRowTimestamp(item.run, timeZone: timeZone)).lineLimit(1).fixedSize(horizontal: true, vertical: false)
                }.font(.caption).foregroundStyle(.secondary)
                if destinations.remote(for: item.hostID)?.connected != true { Text("Offline · cached history").font(.caption2).foregroundStyle(.orange) }
            }
        }.contextMenu {
            Button("Open", systemImage: "arrow.up.right.square") { if let onSelect { onSelect(item) } else { selected = item } }
            Button("Copy chat name", systemImage: "doc.on.doc") { UIPasteboard.general.string = item.run["title"].string }
            if destinations.remote(for: item.hostID)?.state["capabilities"].array.contains(.string("chat.rename.v1")) == true { Button("Rename", systemImage: "pencil") { pendingRename = item }.disabled(destinations.remote(for: item.hostID)?.connected != true) }
            if canManage(item) {
                Button(item.run["archived"].bool ? "Unarchive" : "Archive", systemImage: "archivebox") { Task { await archive(item) } }.disabled(chatHasPendingWork(item.run))
                Button("Delete chat", systemImage: "trash", role: .destructive) { pendingDelete = item }.disabled(chatHasPendingWork(item.run))
            }
        }
    }
    private func canManage(_ item: AggregateChat) -> Bool {
        guard let remote = destinations.remote(for: item.hostID) else { return false }
        return remote.connected && remote.state["capabilities"].array.contains(.string("chat.lifecycle.v1"))
    }
    private func archive(_ item: AggregateChat) async {
        guard let remote = destinations.remote(for: item.hostID) else { return }
        do { try await remote.archiveChat(item.run["id"].string, archived: !item.run["archived"].bool); if showArchived { await remote.loadAllRuns(reset: true) } }
        catch { remote.error = error.localizedDescription }
    }
    private func delete(_ item: AggregateChat) async {
        guard let remote = destinations.remote(for: item.hostID) else { return }
        do { try await remote.deleteChat(item.run["id"].string); if showArchived { await remote.loadAllRuns(reset: true) } }
        catch { remote.error = error.localizedDescription }
    }
}
func chatHasPendingWork(_ run: JSON) -> Bool {
    ["running", "queued", "awaiting_input"].contains(run["status"].string) || !run["queuedMessages"].array.isEmpty
}
extension AggregateChat: Hashable { static func == (lhs: Self, rhs: Self) -> Bool { lhs.id == rhs.id }; func hash(into hasher: inout Hasher) { hasher.combine(id) } }

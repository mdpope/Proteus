import SwiftUI
import CryptoKit

/// Presentation only. Browser resources keep their ordinary local profile and
/// chats keep their captured computer/context. No synthetic workspace is granted.
struct LifeHomeWorkspaceView: View {
    @EnvironmentObject private var life: LifeStore
    @EnvironmentObject private var shared: SharedAppStore
    @EnvironmentObject private var destinations: DestinationStore
    @EnvironmentObject private var chrome: NativePhoneChrome
    @State private var selected = "smart"
    @State private var dashboardID = ""
    @State private var chats: [NativeContentTab] = []
    @State private var order: [String] = []
    @State private var failure: String?
    @State private var opening = false
    private var namespace: String { SHA256.hash(data: Data(life.accountIdentity.utf8)).map { String(format: "%02x", $0) }.joined() }
    private var scope: String { "life-home-" + namespace }
    private var storageKey: String { "proteus.life-home-tabs." + namespace }
    private var browsers: [BrowserDescriptor] { shared.tabs(in: scope) }
    private var children: [NativeContentTab] {
        let values = browsers.filter { $0.id != dashboardID && !$0.hidden }.map { NativeContentTab(id: $0.id, title: shared.browserLabel($0), kind: "browser", hostID: nil) } + chats
        return order.compactMap { id in values.first { $0.id == id } } + values.filter { !order.contains($0.id) }
    }
    var body: some View {
        VStack(spacing: 0) {
            NativeFeatureStrip(sidebar: NativePhonePreview.enabled, add: addBrowser, addIdentifier: "life-home-add-tab", ids: ["smart", "assistant"] + children.map(\.id), selection: selected == dashboardID ? "assistant" : selected) {
                HStack(spacing: 0) {
                    NativeFeatureTab(title: NativePadPreview.enabled ? "Devices" : "Smart Home", symbol: "house", identifier: "life-home-tab-smart", selected: selected == "smart", action: { selected = "smart" }).id("smart")
                    NativeFeatureTab(title: "Home Assistant", symbol: "globe", identifier: "life-home-tab-assistant", selected: selected == "assistant" || selected == dashboardID, action: { Task { await openAssistant() } }).id("assistant")
                    ForEach(children) { item in
                        NativeFeatureTab(title: item.title, symbol: NativeTabSymbol.name(kind: item.kind), icon: item.kind == "browser" ? shared.browserFavicon(item.id) : nil, identifier: "life-home-tab-" + item.id, selected: selected == item.id, action: { select(item.id) }, close: { close(item.id) }).id(item.id)
                    }
                }
            }.accessibilityElement(children: .contain).accessibilityIdentifier("life-home-tabs")
            if selected == "smart" {
                LifeHomeView(openDashboard: { url in Task { await openAssistant(url) } })
            } else if selected == "assistant" {
                if opening {
                    ProgressView("Opening Home Assistant…").frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ContentUnavailableView {
                        Label("Home Assistant setup", systemImage: "house")
                    } description: {
                        Text(failure ?? "Connect Home Assistant under Life → Smart Home on the computer paired with Proteus. Sign in to the same Life account on both devices.")
                    } actions: {
                        Button("Open Smart Home") { selected = "smart" }
                        Button("Try again") { Task { await openAssistant() } }
                    }.accessibilityIdentifier("life-home-assistant-setup")
                }
            } else if let item = chats.first(where: { $0.id == selected }), let host = item.hostID, let remote = destinations.remote(for: host) {
                if let setup = item.setup {
                    NewChatView(internet: setup.internet, lockedWorkspaceID: setup.workspaceID, lockedProjectID: setup.projectID, draftKey: setup.draftKey, onCancel: { close(item.id) }) { id in
                        let next = NativeContentTab(id: host + ":" + id, title: remote.chats[id]?["title"].string ?? "Chat", kind: "chat", hostID: host, sourceChatID: id)
                        if let at = chats.firstIndex(where: { $0.id == item.id }) { chats[at] = next }
                        order = order.map { $0 == item.id ? next.id : $0 }; selected = next.id; save()
                    }.environment(remote).id(item.id)
                } else if let id = item.sourceChatID {
                    ChatView(id: id, onBack: { selected = "smart" }).environment(remote).id(item.id)
                }
            } else if browsers.contains(where: { $0.id == selected }) {
                TeamBrowserView(scope: scope, showTabs: false, tabID: selected, featureChrome: true, onBackToList: { selected = "smart" }, newTabOptions: [
                    NativeNewTabAction(title: "New chat", symbol: "bubble.left.and.bubble.right", enabled: destinations.selected?.connected == true, replacesBlank: false, run: { addChat(false) }),
                    NativeNewTabAction(title: "Internet Search", symbol: "magnifyingglass", enabled: destinations.selected?.connected == true, replacesBlank: false, run: { addChat(true) })
                ])
            } else {
                ContentUnavailableView("Tab unavailable", systemImage: "network.slash", description: Text("Reconnect its computer or choose Smart Home."))
            }
        }.background(NativeTheme.background)
            .task(id: namespace) { restore(); syncOverview() }
            .onChange(of: selected) { _, _ in syncOverview() }
            .onChange(of: dashboardID) { _, _ in syncOverview() }
            .onChange(of: children.map { $0.id + "|" + $0.title }) { _, _ in syncOverview() }
            .onDisappear { chrome.removeFeatureTabs("feature:life:" + namespace) }
            .onChange(of: shared.selected(in: scope)) { _, id in
                if let id, selected != "smart", !chats.contains(where: { $0.id == selected }) { selected = id }
            }
            .onChange(of: browsers.map { $0.id + "|" + String($0.hidden) }) { _, _ in syncOverview() }
            .onChange(of: browsers.map(\.id)) { _, ids in
                order = order.filter { id in ids.contains(id) || chats.contains(where: { $0.id == id }) }
                for id in ids where !order.contains(id) { order.append(id) }
                save()
            }
    }
    private func syncOverview() {
        let group = "feature:life:" + namespace
        let master = NativePhoneTab(id: group + ":smart", title: "Smart Home", symbol: "house", detail: "Life", section: "Smart Home", sectionID: group, preview: nil, select: { selected = "smart" })
        let browserByID = Dictionary(uniqueKeysWithValues: browsers.map { ($0.id, $0) })
        let tabs = browsers.filter { !$0.hidden && $0.id == dashboardID }.map {
            NativeContentTab(id: $0.id, title: shared.browserLabel($0), kind: "browser", hostID: $0.ownerHostId)
        } + children
        let setup = NativePhoneTab(id: group + ":assistant", title: "Home Assistant", symbol: "globe", detail: "Life", section: "Smart Home", sectionID: group, preview: nil, select: { Task { await openAssistant() } })
        let items = [master] + (dashboardID.isEmpty || browserByID[dashboardID] == nil ? [setup] : []) + tabs.map { tab in
            let browser = browserByID[tab.id]
            return NativePhoneTab(id: browser == nil ? group + ":" + tab.id : "browser:" + tab.id,
                title: tab.title, symbol: browser?.incognito == true ? "eye.slash" : NativeTabSymbol.name(kind: tab.kind),
                detail: "Life", section: "Smart Home", sectionID: group, preview: nil, select: { select(tab.id) },
                close: { close(tab.id) }, browserID: browser?.id)
        }
        let current = selected == "smart" ? master.id : browserByID[selected] != nil ? "browser:" + selected : group + ":" + selected
        chrome.replaceFeatureTabs(group, items: items, current: current)
    }
    private func select(_ id: String) { selected = id; if browsers.contains(where: { $0.id == id }) { shared.select(id, in: scope) } }
    private func addBrowser() { if let id = shared.open(nil, scope: scope, afterSourceID: selected) { selected = id } }
    private func addChat(_ internet: Bool) {
        guard let host = destinations.selectedID, destinations.selected?.connected == true else { return }
        let setup = NativeChatSetup(hostID: host, internet: internet)
        let item = NativeContentTab(id: "draft:" + setup.id, title: setup.title, kind: "chat-setup", hostID: host, setup: setup)
        if let blank = browsers.first(where: { $0.id == selected && ($0.url?.isEmpty != false) && $0.id != dashboardID }) {
            order = order.map { $0 == blank.id ? item.id : $0 }; shared.close(blank.id)
        } else { order.append(item.id) }
        chats.append(item); selected = item.id; save()
    }
    private func close(_ id: String) {
        if browsers.contains(where: { $0.id == id }) { shared.close(id) }
        chats.removeAll { $0.id == id }; order.removeAll { $0 == id }; if selected == id { selected = "smart" }; save()
    }
    private func openAssistant(_ supplied: URL? = nil) async {
        selected = "assistant"
        guard !opening else { return }; opening = true; failure = nil; defer { opening = false }
        let account = life.accountIdentity
        do {
            var url = supplied
            if url == nil {
                guard let remote = destinations.selected, remote.connected else { throw RemoteError(message: "Connect your Home Assistant computer, then open this tab.") }
                let value = try await remote.request("life.home.view", ["accountId": .string(life.credential?.accountID ?? "")])
                guard value["accountId"].string == life.credential?.accountID else { throw RemoteError(message: "This computer is signed in to another Life account.") }
                url = URL(string: value["origin"].string)
            }
            guard account == life.accountIdentity, selected == "assistant" else { return }
            guard let url, ["http", "https"].contains(url.scheme ?? ""), url.host != nil, url.user == nil, url.password == nil else { throw RemoteError(message: "Connect Home Assistant in Smart Home first.") }
            if let existing = browsers.first(where: { $0.id == dashboardID }) {
                if let old = existing.url.flatMap(URL.init(string:)), old.host != url.host || old.port != url.port || old.scheme != url.scheme { _ = shared.navigate(url, in: existing.id) }
                select(existing.id)
            } else if let id = shared.open(url, title: "Home Assistant", scope: scope) { dashboardID = id; selected = id; save() }
            failure = nil
        } catch { if account == life.accountIdentity { failure = error.localizedDescription } }
    }
    private func save() {
        // No private titles, URLs or IDs are written by this presentation index.
        let privateIDs = Set(browsers.filter(\.incognito).map(\.id))
        let value: JSON = .object(["dashboard": .string(dashboardID), "order": .array(order.filter { !privateIDs.contains($0) }.map(JSON.string)), "chats": (try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(chats))) ?? .array([])])
        if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: storageKey) }
    }
    private func restore() {
        selected = "smart"; failure = nil; dashboardID = ""; chats = []; order = []
        guard let data = UserDefaults.standard.data(forKey: storageKey), data.count < 1_048_576, let value = try? JSONDecoder().decode(JSON.self, from: data) else { return }
        dashboardID = value["dashboard"].string; order = value["order"].array.map(\.string)
        chats = (try? JSONDecoder().decode([NativeContentTab].self, from: JSONEncoder().encode(value["chats"]))) ?? []
    }
}

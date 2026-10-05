import SwiftUI

struct EngineRoomView: View {
    static let pages = ["Overview", "Resources", "Connections", "Account & Security", "App Setup", "Usage", "Notifications", "Logs"]
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Binding var page: String
    @State private var value: JSON = .null
    @State private var failure: String?
    @State private var adding = false
    @ObservedObject private var notifications = NativeNotifications.shared
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView(.horizontal) { HStack { ForEach(Self.pages, id: \.self) { name in Button(name) { page = name }.buttonStyle(.bordered).tint(page == name ? .accentColor : .secondary) } }.padding(8) }.scrollIndicators(.hidden)
                Divider()
                Group {
                    switch page {
                    case "App Setup": NativeSetupView()
                    case "Account & Security": SharedAccountView()
                    case "Connections": DestinationsView { adding = true }
                    case "Usage": if let remote = destinations.selected { ProviderUsageDetails(store: remote) } else { ContentUnavailableView("Choose a Mac", systemImage: "desktopcomputer") }
                    case "Resources": resources
                    case "Notifications": activity
                    case "Logs": logs
                    default: List { Section { Text("Manage your connections, account, usage and running resources."); Text("Providers are configured on the desktop host.").foregroundStyle(.secondary) }; ForEach(Self.pages.dropFirst(), id: \.self) { item in Button(item) { page = item } } }
                    }
                }
            }.navigationTitle("Engine Room").navigationBarTitleDisplayMode(.inline)
                .toolbar { if ["Resources", "Notifications", "Logs"].contains(page) { Button("Refresh", systemImage: "arrow.clockwise") { Task { await load() } } } }
                .task(id: page + (destinations.selectedID ?? "")) { await load() }
                .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { adding = false } } } }
        }
    }
    private var resources: some View {
        List {
            Section { Text(destinations.selectedLabel).font(.headline); if let failure { Text(failure).foregroundStyle(.orange) }; Text("CPU and RAM are reported by the host. Tabs may share a process; shared memory is not counted as per-tab memory.").font(.caption).foregroundStyle(.secondary) }
            ForEach(value["processes"].array, id: \.self) { process in VStack(alignment: .leading) { Text(process["name"].string); HStack { Text("PID \(process["pid"].int)"); Text("CPU \(process["cpuPercent"].pretty)%"); Text(ByteCountFormatter.string(fromByteCount: Int64(process["memoryBytes"].int), countStyle: .memory)) }.font(.caption); if process["tabIds"].array.count > 1 { Text("Shared by \(process["tabIds"].array.count) tabs").font(.caption).foregroundStyle(.secondary) } } }
            if value["supported"] == .bool(false) { Text("Resource reporting is unavailable from this host.").foregroundStyle(.secondary) }
            Section("Host tabs") { ForEach(value["tabs"].array, id: \.self) { tab in VStack(alignment: .leading) { Text(tab["title"].string); Text(tab["loaded"].bool ? "Loaded" : "Unloaded").font(.caption).foregroundStyle(.secondary); HStack { Button("Unload") { resourceAction("unload", id: tab["id"].string) }.disabled(!tab["loaded"].bool); Button("Close", role: .destructive) { resourceAction("close", id: tab["id"].string) } }.buttonStyle(.bordered) }.contextMenu { Button("Unload") { resourceAction("unload", id: tab["id"].string) }; Button("Close", role: .destructive) { resourceAction("close", id: tab["id"].string) } } } }
            Section("This device · Team browser") { ForEach(shared.browserTabs) { tab in HStack { Text(tab.title); Spacer(); Button("Unload") { shared.unload(tab.id) }; Button("Close", role: .destructive) { shared.close(tab.id) } }.buttonStyle(.bordered) } }
        }
    }
    private var activity: some View {
        List {
            Section("Notifications") {
                Toggle("Enable notifications", isOn: Binding(get: { notifications.enabled }, set: { value in Task { if value { await notifications.enable() } else { await notifications.disable() } } }))
                Text(notifications.status).font(.caption).foregroundStyle(.secondary)
                Text("Background alerts require Apple push provisioning and configured server APNs credentials. Foreground host activity can use local alerts while this app is connected.").font(.caption).foregroundStyle(.secondary)
            }
            if let failure { Text(failure).foregroundStyle(.orange) }
            Section("Account history") { historyRows(shared.snapshot["notifications"].array, sharedHistory: true) }
            Section(destinations.selectedLabel) { historyRows(value["items"].array, sharedHistory: false) }
        }
    }
    private func historyRows(_ items: [JSON], sharedHistory: Bool) -> some View {
        ForEach(items, id: \.self) { item in VStack(alignment: .leading, spacing: 4) { Text(NativeNotifications.safeBody(item["type"].string)); if let date = ProviderAllowance.date(item["createdAt"].string) { Text(nativeTimestamp(date, timezone: shared.snapshot["preferences"]["timezone"].string)).font(.caption).foregroundStyle(.secondary) }; if item["readAt"] == .null && !item["read"].bool { Button("Mark read") { let remote = destinations.selected; Task { if sharedHistory { _ = await shared.mutate(life, path: "/notifications/" + item["id"].string, method: "PATCH", body: .object(["read": .bool(true)])) } else { _ = try? await remote?.request("notifications.read", ["id": item["id"]]); await load() } } }.font(.caption) } } }
    }
    private var logs: some View {
        List { if let failure { Text(failure).foregroundStyle(.orange) }; Text("Bounded diagnostic events; prompts, credentials and transcripts are excluded.").font(.caption).foregroundStyle(.secondary); ForEach(shared.snapshot["logs"].array + value["items"].array, id: \.self) { item in VStack(alignment: .leading) { Text(item["event"].string); Text(item["message"].string).font(.caption); if let date = ProviderAllowance.date(item["createdAt"].string) { Text(nativeTimestamp(date, timezone: shared.snapshot["preferences"]["timezone"].string)).font(.caption2).foregroundStyle(.secondary) } } } }
    }
    private func load() async {
        let requestedPage = page, requestedHost = destinations.selectedID
        value = .null; failure = nil
        guard ["Resources", "Notifications", "Logs"].contains(requestedPage) else { return }
        if requestedPage != "Resources" { await shared.refresh(life) }
        guard !Task.isCancelled, page == requestedPage, destinations.selectedID == requestedHost else { return }
        guard let remote = destinations.selected else { failure = "Choose a Mac to inspect host activity."; return }
        guard remote.connected else { failure = "Mac is offline. Reconnect to refresh " + requestedPage.lowercased() + "."; return }
        let method = requestedPage == "Resources" ? "resources.list" : requestedPage == "Logs" ? "logs.list" : "notifications.list"
        do {
            let result = try await remote.request(method)
            guard !Task.isCancelled, page == requestedPage, destinations.selectedID == requestedHost else { return }
            value = result
            if requestedPage == "Notifications" { notifications.observe(result["items"].array, hostID: requestedHost ?? "") }
        } catch { if !Task.isCancelled, page == requestedPage, destinations.selectedID == requestedHost { failure = error.localizedDescription } }
    }
    private func resourceAction(_ action: String, id: String) {
        guard let remote = destinations.selected else { return }
        let requestedHost = destinations.selectedID
        Task {
            do { _ = try await remote.request("resources.action", ["action": .string(action), "tabId": .string(id)]); if destinations.selectedID == requestedHost { await load() } }
            catch { if destinations.selectedID == requestedHost { failure = error.localizedDescription } }
        }
    }
}
struct SharedAccountView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var origin = "https://proteus.example"
    var body: some View {
        Form {
            Section("Website account") {
                TextField("HTTPS website", text: $origin).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                Text("Team lists, links, notification history and preferences require separate app access. Life access remains independent of Mac pairing.").font(.footnote).foregroundStyle(.secondary)
                Button(life.credential?.appAuthorized == true ? "Reconnect shared account" : "Connect shared Team tools") { Task { await life.signIn(website: origin, sharedApp: true); await shared.refresh(life); await NativeNotifications.shared.syncSubscription() } }.disabled(life.busy)
                if life.signedIn { Text(life.website).font(.caption); Button("Sign out", role: .destructive) { Task { await NativeNotifications.shared.disable(); await life.signOut(); shared.reset(for: life.accountIdentity) } } }
                if let error = life.error { Text(error).foregroundStyle(.orange) }; if let error = shared.error { Text(error).foregroundStyle(.orange) }
            }
            if life.credential?.appAuthorized == true { SharedPreferencesView() }
            Section("Account & Security") { Link("Manage passkeys, MFA and active connections", destination: URL(string: life.website + "/security")!) }
            Section { NavigationLink("Life account") { LifeAccountView() }; Text("Mac pairing keys remain in Keychain. Relay connection errors never erase saved pairing keys or history.").font(.caption).foregroundStyle(.secondary) }
        }.navigationTitle("Account & Security").onAppear { origin = life.website }
    }
}

struct SharedPreferencesView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var timezone = "UTC"
    @State private var search = "google"
    var body: some View {
        Section("Preferences") {
            TextField("Time zone", text: $timezone).textInputAutocapitalization(.never).autocorrectionDisabled()
            Picker("Search engine", selection: $search) { Text("Google").tag("google"); Text("DuckDuckGo").tag("duckduckgo"); Text("Bing").tag("bing") }
            Button("Save preferences") { Task { _ = await shared.mutate(life, path: "/preferences", method: "PUT", body: .object(["timezone": .string(timezone), "searchEngine": .string(search)])) } }.disabled(TimeZone(identifier: timezone) == nil)
        }.onAppear { timezone = shared.snapshot["preferences"]["timezone"].string.isEmpty ? "UTC" : shared.snapshot["preferences"]["timezone"].string; search = shared.snapshot["preferences"]["searchEngine"].string.isEmpty ? "google" : shared.snapshot["preferences"]["searchEngine"].string }
    }
}

import SwiftUI
import AuthenticationServices
import Observation
import UniformTypeIdentifiers

struct EngineRoomView: View {
    static let pages = ["Overview", "Colors", "Source library", "MCP connections", "Resources", "Connections", "Account & Security", "App Setup", "Browser settings", "Browser history", "Usage", "Notifications", "Logs"]
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Binding var page: String
    @State private var value: JSON = .null
    @State private var failure: String?
    @State private var adding = false
    @State private var logCursor = ""
    @State private var logPrevious: [String] = []
    @State private var accountLogPage = 0
    @State private var logsLoading = false
    @ObservedObject private var notifications = NativeNotifications.shared
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if page != "Overview" {
                    HStack {
                        Button { page = "Overview" } label: { Label("Engine Room", systemImage: "chevron.left") }.buttonStyle(.plain)
                        Text(page).fontWeight(.semibold); Spacer()
                    }.foregroundStyle(NativeTheme.accent).padding(.horizontal, 20).frame(minHeight: 44)
                }
                Group {
                    switch page {
                    case "Colors": NativePaletteView()
                    case "App Setup": NativeSetupView()
                    case "Browser settings": NativeDownloadPreferences()
                    case "Browser history": NativeBrowserHistoryView()
                    case "Account & Security": SharedAccountView()
                    case "Connections": DestinationsView { adding = true }
                    case "Usage": if let remote = destinations.selected { ProviderUsageDetails(store: remote) } else { ContentUnavailableView("Choose a computer", systemImage: "desktopcomputer") }
                    case "Source library": if let remote = destinations.selected { NativeSourceLibraryView().environmentObject(remote) } else { ContentUnavailableView("Choose a computer", systemImage: "desktopcomputer") }
                    case "MCP connections": mcpConnections
                    case "Resources": resources
                    case "Notifications": activity
                    case "Logs": logs
                    default: ScrollView {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Manage your connections, account, usage and running resources.")
                            Text("Providers are configured on the desktop host.").foregroundStyle(.secondary).font(.caption).padding(.bottom, 12)
                            ForEach(Self.pages.dropFirst(), id: \.self) { item in
                                Button(item) { page = item }.buttonStyle(.plain).foregroundStyle(NativeTheme.accent)
                                    .frame(maxWidth: .infinity, minHeight: 40, alignment: .leading)
                            }
                        }.padding(20).frame(maxWidth: .infinity, alignment: .leading)
                    }.accessibilityIdentifier("engine-sections")
                    }
                }
            }.background(NativeTheme.background).navigationTitle(NativeDesignPreview.enabled ? "" : "Engine Room").navigationBarTitleDisplayMode(.inline).nativeFeaturePage("Engine Room")
                .toolbar { if ["Resources", "MCP connections", "Notifications", "Logs"].contains(page) { Button("Refresh", systemImage: "arrow.clockwise") { Task { await load() } } } }
                .task(id: page + (destinations.selectedID ?? "")) { await load() }
                .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { adding = false } } } }
                .onChange(of: destinations.pairingCompletion) { _, completion in if completion != nil { adding = false; page = "Connections" } }
        }
    }
    private var mcpConnections: some View {
        NativeList {
            Section("Other computers · " + destinations.selectedLabel) {
                Text("Informational only. Manage sign-in and recovery on the owning computer. A saved login does not prove this chat is connected.").font(.caption).foregroundStyle(.secondary)
                if let failure { Text(failure).foregroundStyle(.orange) }
            }
            ForEach(value["configurations"].array, id: \.self) { configuration in
                DisclosureGroup(configuration["name"].string + " · " + configuration["summary"].string) {
                    Text(configuration["path"].string).font(.caption.monospaced()).textSelection(.enabled)
                    Text("\(configuration["sessionCount"].int) chat sessions").font(.caption)
                    ForEach(configuration["consumers"].array.prefix(20), id: \.self) { session in
                        VStack(alignment: .leading) {
                            Text(session["chatTitle"].string).font(.headline)
                            Text(session["provider"].string + " · " + session["connection"].string)
                            Text("Authentication: " + session["authentication"].string + " · Resource access: " + session["access"].string).font(.caption)
                            Text("Last checked: " + session["checkedAt"].string + (session["stale"].bool ? " · Stale" : "")).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if configuration["sessionCount"].int > 20 { Text("Showing 20 sessions. Open the owning desktop for the complete list.").font(.caption) }
                }
            }
            if value["configurations"].array.isEmpty && failure == nil { Text("No source inventory available. Refresh sources on the owning computer or update that desktop.").foregroundStyle(.secondary) }
        }
    }
    private var resources: some View {
        NativeResourcesView(value: value, failure: failure, owner: destinations.selectedLabel, refresh: { await load() }, action: resourceAction)
    }
    private var activity: some View {
        NativeList {
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
        NativeList {
            if let failure { Text(failure).foregroundStyle(.orange) }
            Text("Up to 2,000 computer entries retained. Older entries rotate automatically.").font(.caption).foregroundStyle(.secondary)
            Section(destinations.selectedLabel) {
                HStack {
                    Button("Newer") { let previous = Array(logPrevious.dropLast()); Task { await pageLogs(logPrevious.last ?? "", previous: previous) } }.disabled(logPrevious.isEmpty || logsLoading).accessibilityIdentifier("logs-newer")
                    Spacer()
                    Button("Older") { let cursor = value["nextCursor"].string; let previous = logPrevious + [logCursor]; Task { await pageLogs(cursor, previous: previous) } }.disabled(!value["hasMore"].bool || logsLoading).accessibilityIdentifier("logs-older")
                }.buttonStyle(.bordered)
                ForEach(value["items"].array, id: \.self) { item in
                    NativeLogRow(item: item, timezone: shared.snapshot["preferences"]["timezone"].string) {
                        guard let remote = destinations.selected else { throw RemoteError(message: "Choose a computer.") }
                        return try await remote.request("logs.get", ["id": item["id"]])
                    }.id((destinations.selectedID ?? "") + item["id"].string)
                }
                if logsLoading { ProgressView("Loading logs…") }
            }
            Section("Account events") {
                Text("Shared event metadata. Full diagnostics remain on their owning computer.").font(.caption).foregroundStyle(.secondary)
                ForEach(Array(shared.snapshot["logs"].array.dropFirst(accountLogPage * 50).prefix(50)), id: \.self) { item in
                    NativeLogRow(item: item, timezone: shared.snapshot["preferences"]["timezone"].string) { item }
                }
                HStack { Button("Newer") { accountLogPage -= 1 }.disabled(accountLogPage == 0); Spacer(); Button("Older") { accountLogPage += 1 }.disabled((accountLogPage + 1) * 50 >= shared.snapshot["logs"].array.count) }
            }
        }
    }
    private func pageLogs(_ cursor: String, previous: [String]) async {
        guard let remote = destinations.selected else { return }
        let host = destinations.selectedID
        logsLoading = true
        do {
            let result = try await remote.request("logs.list", ["limit": .number(50), "cursor": .string(cursor)])
            guard !Task.isCancelled, page == "Logs", destinations.selectedID == host else { return }
            value = result; logCursor = cursor; logPrevious = previous; failure = nil
        } catch { if page == "Logs", destinations.selectedID == host { failure = error.localizedDescription } }
        if destinations.selectedID == host { logsLoading = false }
    }
    private func load() async {
        let requestedPage = page, requestedHost = destinations.selectedID
        value = .null; failure = nil
        logCursor = ""; logPrevious = []; accountLogPage = 0; logsLoading = false
        guard ["Resources", "MCP connections", "Notifications", "Logs"].contains(requestedPage) else { return }
        if !["Resources", "MCP connections"].contains(requestedPage) { await shared.refresh(life) }
        guard !Task.isCancelled, page == requestedPage, destinations.selectedID == requestedHost else { return }
        guard let remote = destinations.selected else { failure = "Choose a computer to inspect host activity."; return }
        guard remote.connected else { failure = "\(remote.displayName) is offline. Reconnect to refresh " + requestedPage.lowercased() + "."; return }
        let method = requestedPage == "MCP connections" ? "integrations.list" : requestedPage == "Resources" ? "resources.list" : requestedPage == "Logs" ? "logs.list" : "notifications.list"
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

private struct NativeResourcesView: View {
    @EnvironmentObject var shared: SharedAppStore
    let value: JSON
    let failure: String?
    let owner: String
    let refresh: () async -> Void
    let action: (String, String) -> Void
    @State private var query = ""
    @State private var system = true
    @State private var loaded = true
    @State private var unloaded = true
    private var rows: [NativeResourceRow] { NativeResourceRow.rows(value).filter { row in
        (row.kind == "system" ? system : row.kind == "loaded" ? loaded : unloaded) && (query.isEmpty || row.title.localizedCaseInsensitiveContains(query))
    } }
    var body: some View {
        NativeList {
            Section {
                Text(owner).font(.headline)
                if let failure { Text(failure).foregroundStyle(.orange) }
                TextField("Filter processes and tabs by name", text: $query).accessibilityIdentifier("resource-filter")
                HStack { Toggle("System", isOn: $system); Toggle("Loaded", isOn: $loaded); Toggle("Unloaded", isOn: $unloaded) }.toggleStyle(.button).font(.caption)
                Button("Refresh usage", systemImage: "arrow.clockwise") { Task { await refresh() } }.accessibilityIdentifier("resource-refresh")
                Text("Shared process usage appears once in its system row. iOS cannot inspect other apps’ memory.").font(.caption).foregroundStyle(.secondary)
            }
            ForEach(rows) { row in
                VStack(alignment: .leading, spacing: 5) {
                    Text(row.title).font(.headline)
                    Text(row.kind == "system" ? "App/system process" : row.kind == "loaded" ? "Loaded tab" : "Unloaded tab").font(.caption)
                    Text(row.shared ? "Shared process usage shown above" : "CPU \(row.metric("cpuPercent", suffix: "%")) · Memory \(row.metric("memoryBytes", suffix: " MB", scale: 1_048_576))").font(.caption).foregroundStyle(.secondary)
                    if row.kind != "system" {
                        HStack {
                            if row.canUnload { Button("Unload") { action("unload", row.tab["id"].string) } }
                            Button("Close", role: .destructive) { action("close", row.tab["id"].string) }.disabled(!row.canClose)
                        }.buttonStyle(.bordered)
                    }
                }.accessibilityIdentifier("resource-" + row.id)
            }
            Section("This device · browser tabs") {
                ForEach(shared.browserTabs.filter { tab in (query.isEmpty || tab.title.localizedCaseInsensitiveContains(query)) && (shared.isBrowserLoaded(tab.id) ? loaded : unloaded) }) { tab in
                    HStack { Text(shared.browserLabel(tab)); Spacer(); Button("Unload") { shared.unload(tab.id) }.disabled(tab.persist || !shared.isBrowserLoaded(tab.id)); Button("Close", role: .destructive) { shared.close(tab.id) } }.buttonStyle(.bordered)
                }
            }
        }
    }
}

/// One process attribution per row, following the shared desktop/web Resources model.
struct NativeResourceRow: Identifiable {
    let id: String
    let title: String
    let kind: String
    let tab: JSON
    let process: JSON
    let shared: Bool
    var canUnload: Bool { tab["canUnload"] == .null ? tab["loaded"].bool && !tab["sharedProcess"].bool && !tab["persist"].bool : tab["canUnload"].bool }
    var canClose: Bool { tab["canClose"] == .null ? tab["id"].string != "overview" && tab["manageable"] != .bool(false) : tab["canClose"].bool }
    func metric(_ key: String, suffix: String, scale: Double = 1) -> String {
        guard case .number(let number) = process[key], number.isFinite, number >= 0 else { return "Not reported" }
        return (number / scale).formatted(.number.precision(.fractionLength(1))) + suffix
    }
    static func rows(_ value: JSON) -> [Self] {
        let tabs = value["tabs"].array, processes = value["processes"].array
        func shared(_ process: JSON) -> Bool { let owned = tabs.filter { $0["loaded"].bool && $0["pid"] == process["pid"] }; return owned.count != 1 || owned.contains { $0["sharedProcess"].bool } }
        var rows = processes.filter(shared).map { process in Self(id: "process:" + process["pid"].pretty, title: [process["label"].string, process["name"].string, process["type"].string, "Process"].first { !$0.isEmpty }!, kind: "system", tab: .null, process: process, shared: false) }
        rows += tabs.map { tab in
            let process = tab["loaded"].bool ? processes.first { $0["pid"] == tab["pid"] } ?? .null : .null
            let isShared = process != .null && shared(process)
            return Self(id: "tab:" + tab["id"].string, title: tab["title"].string.isEmpty ? tab["id"].string : tab["title"].string, kind: tab["loaded"].bool ? "loaded" : "unloaded", tab: tab, process: isShared ? .null : process, shared: isShared)
        }
        let order = ["system": 0, "loaded": 1, "unloaded": 2]
        return rows.sorted { left, right in left.kind == right.kind ? left.title.localizedStandardCompare(right.title) == .orderedAscending : order[left.kind, default: 3] < order[right.kind, default: 3] }
    }
}

private struct NativeLogRow: View {
    let item: JSON
    let timezone: String
    let load: () async throws -> JSON
    @State private var expanded = false
    @State private var detail: JSON?
    @State private var failure: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack { Text(item["level"].string.uppercased()).font(.caption.bold()); Text(item["event"].string.isEmpty ? item["code"].string : item["event"].string).font(.caption) }
            Text(item["summary"].string.isEmpty ? item["message"].string : item["summary"].string).lineLimit(3)
            if let date = ProviderAllowance.date(item["createdAt"].string) { Text(nativeTimestamp(date, timezone: timezone)).font(.caption2).foregroundStyle(.secondary) }
            DisclosureGroup("Details", isExpanded: $expanded) {
                if expanded {
                if let detail {
                    if detail["truncated"].bool { Text("This entry exceeded the diagnostic size limit. Retained content follows.").font(.caption).foregroundStyle(.secondary) }
                    if detail["legacy"].bool { Text("Imported legacy entry; previously omitted details are unavailable.").font(.caption).foregroundStyle(.secondary) }
                    ScrollView { VStack(alignment: .leading) { Text(detail["message"].string); Text(detail["details"].pretty); Text(JSON.object(detail.object.filter { !["message", "details", "summary"].contains($0.key) }).pretty) }.font(.system(.caption, design: .monospaced)).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }.frame(maxHeight: 360)
                } else if let failure { Text(failure).foregroundStyle(.orange); Button("Retry") { self.failure = nil } }
                else { ProgressView("Loading details…").task { do { detail = try await load() } catch { failure = error.localizedDescription } } }
                }
            }.accessibilityIdentifier("log-expand-" + item["id"].string)
        }
    }
}
struct SharedAccountView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var origin = "https://proteus.example"
    var body: some View {
        NativeForm {
            Section("Website account") {
                TextField("HTTPS website", text: $origin).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                Text("Team lists, links, notification history and preferences require separate app access. Life access remains independent of Computer pairing.").font(.footnote).foregroundStyle(.secondary)
                Button(life.credential?.appAuthorized == true ? "Reconnect website account" : "Connect website account") { Task { await life.signIn(website: origin, sharedApp: true); await shared.refresh(life); await NativeNotifications.shared.syncSubscription() } }.disabled(life.busy)
                if life.signedIn { Text((shared.accountConnected ? "Website account connected" : "Website account saved · refresh to verify connection") + (life.credential?.appAuthorized == true ? " · shared app authorized" : " · shared app authorization needed")).font(.caption); Text(life.website).font(.caption); Button("Sign out", role: .destructive) { Task { await NativeNotifications.shared.disable(); await life.signOut(); shared.reset(for: life.accountIdentity) } } }
                if let error = life.error { Text(error).foregroundStyle(.orange) }; if let error = shared.error { Text(error).foregroundStyle(.orange) }
            }
            if life.credential?.appAuthorized == true { SharedPreferencesView(); NativeBrowserProfilePreferences() }
            Section("Account & Security") { Link("Manage passkeys, MFA and active connections", destination: URL(string: life.website + "/security")!) }
            Section { NavigationLink("Life account") { LifeAccountView() }; Text("Computer pairing keys remain in Keychain. Relay connection errors never erase saved pairing keys or history.").font(.caption).foregroundStyle(.secondary) }
        }.background(NativeTheme.background).navigationTitle("Account & Security").onAppear { origin = life.website }
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


struct NativeBrowserProfilePreferences: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var name = ""
    @State private var selected: JSON = .null
    @State private var renaming = false
    @State private var removing = false
    var body: some View {
        Section("Browser profiles") {
            Toggle("Enable additional profiles", isOn: $shared.profilesEnabled)
            Text("Names and settings sync through your account. Website sign-ins stay on this device. Default preserves your existing browser session.").font(.caption).foregroundStyle(.secondary)
            Button("Refresh profiles") { Task { await shared.refresh(life) } }
            ForEach(shared.browserProfiles, id: \.self) { profile in
                HStack {
                    Text(profile["name"].string)
                    Spacer()
                    if profile["id"].string != "default" {
                        Button("Rename") { selected = profile; name = profile["name"].string; renaming = true }
                        Button("Remove", role: .destructive) { selected = profile; removing = true }
                    }
                }
            }
            if shared.profilesEnabled && shared.profilesVerified {
                Button("Add profile") { selected = .null; name = ""; renaming = true }
            }
            Text("Apple Passwords and Bitwarden use system Password AutoFill. Open Browser settings to configure AutoFill; desktop browser extensions do not run in the native browser.").font(.caption).foregroundStyle(.secondary)
        }
        .alert(selected == .null ? "New browser profile" : "Rename profile", isPresented: $renaming) {
            TextField("Profile name", text: $name)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                let profile = selected, entered = name.trimmingCharacters(in: .whitespacesAndNewlines)
                Task {
                    var body: [String: JSON] = ["name": .string(entered), "settings": profile["settings"] == .null ? .object([:]) : profile["settings"]]
                    if profile != .null { body["expectedRevision"] = profile["revision"] }
                    _ = await shared.mutate(life, path: "/browser-profiles" + (profile == .null ? "" : "/" + profile["id"].string), method: profile == .null ? "POST" : "PUT", body: .object(body))
                }
            }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .confirmationDialog("Remove this profile definition from your account? Website data remains on each device.", isPresented: $removing) {
            Button("Remove profile", role: .destructive) { let profile = selected; Task { _ = await shared.mutate(life, path: "/browser-profiles/" + profile["id"].string, method: "DELETE", body: .object(["expectedRevision": profile["revision"]])) } }
        }
    }
}

struct NativeBrowserHistoryView: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var host = ""
    @State private var profile = ""
    @State private var query = ""
    @State private var rows: [JSON] = []
    @State private var cursor: String?
    @State private var busy = false
    @State private var olderBefore = Date()
    @State private var preloaded: [JSON] = []
    @State private var more = false
    @State private var synchronization = false
    @State private var profileOwner = ""
    @State private var ownerProfiles: [JSON] = []
    @State private var openFailure: String?
    private var remote: RemoteStore? { destinations.remote(for: host) }
    private var historyProfiles: [JSON] {
        let cached = shared.historyCache.filter { $0.key.hasPrefix(host + "|") }.values.flatMap { $0 }.map { $0["profileId"].string }.filter { !$0.isEmpty }
        return Self.profileChoices(ownerProfiles: profileOwner == host ? ownerProfiles : [], cachedIDs: cached + (profile.isEmpty ? [] : [profile]))
    }
    static func profileChoices(ownerProfiles: [JSON], cachedIDs: [String]) -> [JSON] {
        var seen = Set(["", "default"])
        var choices: [JSON] = [.object(["id": .string(""), "name": .string("All non-private profiles")]), .object(["id": .string("default"), "name": .string("Default")])]
        for item in ownerProfiles where !item["id"].string.isEmpty && seen.insert(item["id"].string).inserted { choices.append(.object(["id": item["id"], "name": item["name"].string.isEmpty ? .string("Profile") : item["name"]])) }
        for id in cachedIDs.sorted() where !id.isEmpty && seen.insert(id).inserted { choices.append(.object(["id": .string(id), "name": .string("Saved profile " + String(id.prefix(12)))])) }
        return choices
    }
    private var days: [Date] { Array(Set(rows.compactMap { ProviderAllowance.date($0["visitedAt"].string).map { Calendar.current.startOfDay(for: $0) } })).sorted(by: >) }
    var body: some View {
        NativeList {
            Section {
                Picker("Computer", selection: Binding(get: { host }, set: { value in host = value; profile = ""; openFailure = nil; rows = []; cursor = nil; preloaded = []; more = false; profileOwner = value; ownerProfiles = [] })) { ForEach(destinations.destinations) { item in Text(item.label).tag(item.id) } }
                Picker("Profile", selection: $profile) { ForEach(historyProfiles, id: \.self) { item in Text(item["name"].string).tag(item["id"].string) } }.accessibilityIdentifier("owner-history-profile")
                TextField("Search all owner history", text: $query).textInputAutocapitalization(.never).autocorrectionDisabled()
                Text(shared.historyStatus[host] ?? "Connect a computer to load its history.").font(.caption).foregroundStyle(.secondary)
                if remote?.connected != true { Text("Offline search covers the cached last 30 days only.").font(.caption).foregroundStyle(.secondary) }
                if let openFailure { Text(openFailure).font(.caption).foregroundStyle(.orange) }
            }
            Section { Button("History synchronization") { synchronization = true }.disabled(remote == nil).accessibilityIdentifier("owner-history-settings") }
            ForEach(days, id: \.self) { day in
                Section(day.formatted(date: .abbreviated, time: .omitted)) {
                    ForEach(rows.filter { ProviderAllowance.date($0["visitedAt"].string).map { Calendar.current.isDate($0, inSameDayAs: day) } == true }, id: \.self) { item in
                        Button { openFailure = shared.openHistoryVisit(item, ownerHostID: host) == nil ? shared.error : nil } label: {
                            VStack(alignment: .leading) { Text(item["title"].string.isEmpty ? item["url"].string : item["title"].string); Text(item["url"].string).font(.caption).foregroundStyle(.secondary).lineLimit(1); if let date = ProviderAllowance.date(item["visitedAt"].string) { Text(date.formatted(date: .omitted, time: .shortened)).font(.caption2).foregroundStyle(.secondary) } }
                        }
                    }
                }
            }
            if busy { ProgressView("Loading history") }
            if remote?.connected == true { Button(more ? "More results" : "Load older day") { Task { await loadMore() } }.disabled(busy).accessibilityIdentifier("owner-history-more") }
        }
        .task(id: host + "|" + profile + "|" + query) { await reload() }
        .task(id: host + "|" + String(remote?.connected ?? false)) { await loadOwnerProfiles() }
        .onAppear { if host.isEmpty { host = destinations.selectedID ?? "" } }
        .sheet(isPresented: $synchronization) { if let remote { NavigationStack { NativeHistorySynchronizationView(remote: remote).navigationTitle("History synchronization").navigationBarTitleDisplayMode(.inline).toolbar { Button("Done") { synchronization = false } } }.id(host) } }
    }
    private func loadOwnerProfiles() async {
        if profileOwner != host { profileOwner = host; ownerProfiles = []; profile = "" }
        guard let remote, remote.connected else { return }
        let requestedOwner = host
        if let settings = try? await remote.request("browser.history.settings", ["action": .string("get")]), !Task.isCancelled, requestedOwner == host, remote.connected { ownerProfiles = settings["availableProfiles"].array }
    }
    private func merge(_ incoming: [JSON]) {
        var seen = Set<String>(); rows = (rows + incoming).filter { seen.insert($0["eventId"].string.isEmpty ? $0["id"].string : $0["eventId"].string).inserted }.sorted { $0["visitedAt"].string > $1["visitedAt"].string }
    }
    private func reload() async {
        let identity = host + "|" + profile + "|" + query
        rows = []; cursor = nil; preloaded = []; more = false
        guard let remote else { return }
        let threshold = Calendar.current.date(byAdding: .day, value: -30, to: Calendar.current.startOfDay(for: Date()))!
        olderBefore = threshold
        if !remote.connected {
            let cached = profile.isEmpty ? shared.historyCache.filter { $0.key.hasPrefix(host + "|") }.values.flatMap { $0 } : shared.historyCache[host + "|" + profile] ?? []
            merge(cached.filter { query.isEmpty || ($0["title"].string + " " + $0["url"].string).localizedCaseInsensitiveContains(query) }); return
        }
        busy = true; defer { busy = false }
        await shared.flushHistory(remote)
        let response = await shared.queryHistory(remote, profileId: profile, query: query, from: query.isEmpty ? threshold : nil)
        guard !Task.isCancelled, identity == host + "|" + profile + "|" + query else { return }
        merge(response["items"].array); cursor = response["nextCursor"].string.isEmpty ? nil : response["nextCursor"].string; more = response["hasMore"].bool
        while query.isEmpty, more, !Task.isCancelled {
            let next = await shared.queryHistory(remote, profileId: profile, from: threshold, cursor: cursor)
            guard !Task.isCancelled, identity == host + "|" + profile + "|" + query, next != .null else { return }
            merge(next["items"].array); cursor = next["nextCursor"].string.isEmpty ? nil : next["nextCursor"].string; more = next["hasMore"].bool && cursor != nil
        }
        if query.isEmpty { preloaded = await day(before: olderBefore, remote: remote) }
    }
    private func loadMore() async {
        guard let remote, !busy else { return }; busy = true; defer { busy = false }
        let identity = host + "|" + profile + "|" + query
        if more {
            let response = await shared.queryHistory(remote, profileId: profile, query: query, from: query.isEmpty ? Calendar.current.date(byAdding: .day, value: -30, to: Calendar.current.startOfDay(for: Date())) : nil, cursor: cursor)
            guard identity == host + "|" + profile + "|" + query else { return }
            merge(response["items"].array); cursor = response["nextCursor"].string.isEmpty ? nil : response["nextCursor"].string; more = response["hasMore"].bool; return
        }
        guard query.isEmpty else { return }
        if !preloaded.isEmpty { merge(preloaded); preloaded = [] }
        else { merge(await day(before: olderBefore, remote: remote)) }
        olderBefore = Calendar.current.date(byAdding: .day, value: -1, to: olderBefore)!
        preloaded = await day(before: olderBefore, remote: remote)
    }
    private func day(before: Date, remote: RemoteStore) async -> [JSON] {
        let from = Calendar.current.date(byAdding: .day, value: -1, to: before)!, identity = host + "|" + profile + "|" + query
        var result: [JSON] = [], next: String? = nil
        repeat {
            let response = await shared.queryHistory(remote, profileId: profile, from: from, before: before, cursor: next)
            guard !Task.isCancelled, identity == host + "|" + profile + "|" + query else { return [] }
            result += response["items"].array; next = response["hasMore"].bool && !response["nextCursor"].string.isEmpty ? response["nextCursor"].string : nil
        } while next != nil
        return result
    }
}

struct NativeHistorySettingsDraft {
    let original: JSON
    var enabled: Bool
    var retentionDays: Int
    private(set) var peerUpdates: [String: [String: JSON]] = [:]
    init(_ settings: JSON) { original = settings; enabled = settings["enabled"] == .null || settings["enabled"].bool; retentionDays = settings["retentionDays"] == .null ? 0 : settings["retentionDays"].int }
    func peer(_ host: String) -> JSON {
        var value = original["peers"].array.first(where: { $0["hostId"].string == host })?.object ?? ["hostId": .string(host), "enabled": .bool(false), "backfill": .string("7"), "profileIds": .array([.string("default")])]
        for (key, item) in peerUpdates[host] ?? [:] { value[key] = item }
        return .object(value)
    }
    mutating func setPeer(_ host: String, key: String, value: JSON) { peerUpdates[host, default: [:]][key] = value }
    mutating func selectProfile(_ profile: String, host: String, enabled: Bool) {
        var ids = peer(host)["profileIds"].array.map(\.string)
        if enabled && !ids.contains(profile) { ids.append(profile) }; if !enabled { ids.removeAll { $0 == profile } }
        setPeer(host, key: "profileIds", value: .array(ids.map(JSON.string)))
    }
    func payload(merging latest: JSON, ownerHostID: String) throws -> JSON {
        var result: [String: JSON] = ["action": .string("set")]
        if enabled != (original["enabled"] == .null || original["enabled"].bool) { result["enabled"] = .bool(enabled) }
        if retentionDays != (original["retentionDays"] == .null ? 0 : original["retentionDays"].int) {
            guard [0, 7, 30, 90, 365].contains(retentionDays) else { throw RemoteError(message: "Choose a valid history retention.") }
            result["retentionDays"] = .number(Double(retentionDays))
        }
        if !peerUpdates.isEmpty {
            let known = Set(latest["availablePeers"].array.map { $0["hostId"].string }.filter { $0 != ownerHostID })
            guard peerUpdates.keys.allSatisfy({ known.contains($0) }) else { throw RemoteError(message: "Choose a computer already paired with the owning desktop. Refresh its settings to continue.") }
            var peers = latest["peers"].array
            for (host, changes) in peerUpdates {
                let position = peers.firstIndex(where: { $0["hostId"].string == host })
                var value = position.map { peers[$0].object } ?? ["hostId": .string(host), "enabled": .bool(false), "backfill": .string("7"), "profileIds": .array([.string("default")])]
                let retainedProfiles = Set(value["profileIds"]?.array.map(\.string) ?? [])
                for (key, item) in changes { value[key] = item }
                if changes["profileIds"] != nil {
                    let available = Set(latest["availableProfiles"].array.map { $0["id"].string })
                    guard (value["profileIds"]?.array.map(\.string) ?? []).allSatisfy({ retainedProfiles.contains($0) || available.contains($0) }) else { throw RemoteError(message: "Choose a profile available on the owning computer.") }
                }
                guard ["7", "30", "all"].contains(value["backfill"]?.string ?? ""), value["profileIds"]?.array.isEmpty == false else { throw RemoteError(message: "Choose at least one profile and a valid backfill for each sharing computer.") }
                // These fields describe replication progress, not editable preferences.
                for key in ["cursor", "signature", "lastSyncAt", "error"] { value[key] = nil }
                if let position { peers[position] = .object(value) } else { peers.append(.object(value)) }
            }
            result["peers"] = .array(peers.map { peer in var value = peer.object; for key in ["cursor", "signature", "lastSyncAt", "error"] { value[key] = nil }; return .object(value) })
        }
        return .object(result)
    }
}

struct NativeHistorySynchronizationView: View {
    @ObservedObject var remote: RemoteStore
    @State private var draft: NativeHistorySettingsDraft?
    @State private var busy = false
    @State private var status: String?
    private var owner: String { remote.connection?.hostId ?? "" }
    private var peers: [JSON] { draft?.original["availablePeers"].array.filter { $0["hostId"].string != owner } ?? [] }
    private var profiles: [JSON] { draft?.original["availableProfiles"].array ?? [] }
    var body: some View {
        NativeList {
            Section("Owning computer") {
                Text(remote.displayName).font(.headline)
                Text(remote.connected ? "Changes apply to this computer’s history and existing paired connections." : "Reconnect this computer to view or change its history settings.").font(.caption).foregroundStyle(.secondary)
                Text("Website sessions stay separate. Sharing does not pair a new computer or grant website access. All available history cannot recover visits already pruned.").font(.caption).foregroundStyle(.secondary)
            }
            if draft != nil {
                Section("History recording") {
                    Toggle("Record non-private visits", isOn: Binding(get: { draft?.enabled ?? true }, set: { draft?.enabled = $0 })).accessibilityIdentifier("history-settings-recording")
                    Picker("History retention", selection: Binding(get: { draft?.retentionDays ?? 0 }, set: { draft?.retentionDays = $0 })) {
                        Text("Keep all history").tag(0); Text("One week").tag(7); Text("One month").tag(30); Text("90 days").tag(90); Text("One year").tag(365)
                    }.accessibilityIdentifier("history-settings-retention")
                    Text("This device caches 30 days; the owning computer’s retention controls its stored history.").font(.caption).foregroundStyle(.secondary)
                }.disabled(!remote.connected || busy)
                ForEach(peers, id: \.self) { peer in
                    let id = peer["hostId"].string
                    Section(peer["label"].string.isEmpty ? "Paired computer" : peer["label"].string) {
                        Toggle("Sync from this paired computer", isOn: Binding(get: { draft?.peer(id)["enabled"].bool ?? false }, set: { draft?.setPeer(id, key: "enabled", value: .bool($0)) })).accessibilityIdentifier("history-peer-enabled-" + id)
                        Picker("Backfill", selection: Binding(get: { draft?.peer(id)["backfill"].string ?? "7" }, set: { draft?.setPeer(id, key: "backfill", value: .string($0)) })) {
                            Text("One week").tag("7"); Text("One month").tag("30"); Text("All available").tag("all")
                        }.accessibilityIdentifier("history-peer-backfill-" + id)
                        ForEach(profiles, id: \.self) { profile in
                            Toggle(profile["name"].string.isEmpty ? profile["id"].string : profile["name"].string, isOn: Binding(get: { draft?.peer(id)["profileIds"].array.contains(profile["id"]) ?? false }, set: { draft?.selectProfile(profile["id"].string, host: id, enabled: $0) })).accessibilityIdentifier("history-peer-profile-" + id + "-" + profile["id"].string)
                        }
                        let saved = draft?.original["peers"].array.first { $0["hostId"].string == id } ?? .null
                        if let date = ProviderAllowance.date(saved["lastSyncAt"].string) { Text("Last synced " + date.formatted()).font(.caption).foregroundStyle(.secondary) }
                        if !saved["error"].string.isEmpty { Text(saved["error"].string).font(.caption).foregroundStyle(.orange) }
                        if peer["paused"].bool { Text("This paired connection is paused on its owner.").font(.caption).foregroundStyle(.secondary) }
                    }.disabled(!remote.connected || busy)
                }
                if peers.isEmpty { Section { Text("Pair another computer on this owner to configure replication.").font(.caption).foregroundStyle(.secondary) } }
            }
            Section {
                if busy { ProgressView("Loading history settings") }
                if let status { Text(status).font(.caption).foregroundStyle(.secondary).accessibilityIdentifier("history-settings-status") }
                Button("Refresh settings") { Task { await load() } }.disabled(!remote.connected || busy)
                Button("Save sync settings") { Task { await save() } }.disabled(draft == nil || !remote.connected || busy).accessibilityIdentifier("history-settings-save")
            }
        }.accessibilityIdentifier("history-settings-form").task(id: owner) { await load() }
    }
    private func load() async {
        draft = nil; status = nil
        guard remote.connected, !owner.isEmpty else { return }
        let requestedOwner = owner; busy = true; defer { busy = false }
        do { let settings = try await remote.request("browser.history.settings", ["action": .string("get")]); guard !Task.isCancelled, requestedOwner == owner, remote.connected else { return }; draft = NativeHistorySettingsDraft(settings) }
        catch { status = error.localizedDescription }
    }
    private func save() async {
        guard remote.connected, let draft, !owner.isEmpty else { return }
        let requestedOwner = owner; busy = true; status = nil; defer { busy = false }
        do {
            // Re-read before merging so unrelated preferences changed on the owner survive.
            let latest = try await remote.request("browser.history.settings", ["action": .string("get")])
            guard requestedOwner == owner, remote.connected, !Task.isCancelled else { return }
            let payload = try draft.payload(merging: latest, ownerHostID: requestedOwner)
            if payload.object.count > 1 { _ = try await remote.request("browser.history.settings", payload.object) }
            guard requestedOwner == owner, remote.connected, !Task.isCancelled else { return }
            let saved = try await remote.request("browser.history.settings", ["action": .string("get")]); guard requestedOwner == owner, remote.connected else { return }
            self.draft = NativeHistorySettingsDraft(saved); status = "Saved. The owner will synchronize enabled peers in the background."
        } catch { status = error.localizedDescription }
    }
}

struct NativePasswordAutoFillPreferences: View {
    @State private var autofillError: String?
    var body: some View {
        Section("Password AutoFill") {
            Text("Apple Passwords and Bitwarden use system Password AutoFill in website sign-in fields. On iPhone or iPad, enable AutoFill Passwords and Passkeys in Settings → General → AutoFill & Passwords, and select Passwords. On earlier iOS versions, look under Settings → Passwords → Password Options. Apple handles credential selection and Face ID or Touch ID. Desktop browser extensions and Ghostery filters do not run inside the native browser.").font(.caption).foregroundStyle(.secondary)
            Button("Open Password AutoFill settings") {
                Task {
                    do { try await ASSettingsHelper.openCredentialProviderAppSettings(); autofillError = nil }
                    catch { autofillError = error.localizedDescription }
                }
            }.accessibilityIdentifier("password-autofill-settings")
            if let autofillError { Text(autofillError).font(.caption).foregroundStyle(.secondary) }
        }
    }
}

struct NativeDownloadPreferences: View {
    @EnvironmentObject var shared: SharedAppStore
    @AppStorage("proteus.keep-screen-awake") private var keepScreenAwake = false
    @State private var choosing = false
    @State private var showing = false
    var body: some View { Form { Section("Downloads") {
        Text(shared.downloadFolderName)
        Text("Files are saved in this device’s Downloads folder in Proteus by default. Choose a folder in Files to use another location.").font(.caption)
        Button("Choose download folder") { choosing = true }
        Button("Use default Downloads folder") { shared.chooseDownloadDirectory(nil) }
        Button("Open downloads folder") { if let folder = try? shared.downloadDirectory() { try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true); var parts = URLComponents(url: folder, resolvingAgainstBaseURL: false); parts?.scheme = "shareddocuments"; if let url = parts?.url { UIApplication.shared.open(url) } } }
        Button("Download history") { showing = true }
    }; Section("This device") {
        Toggle("Keep screen awake", isOn: $keepScreenAwake).accessibilityIdentifier("keep-screen-awake")
        Stepper("Ordinary tabs kept loaded: \(shared.loadedTabLimit)", value: $shared.loadedTabLimit, in: 1...256).accessibilityIdentifier("loaded-tab-limit")
        Text("The default is 6. Higher values use more RAM. Recently used and Persisted tabs stay protected from automatic unloading; increasing this value does not open unopened tabs.").font(.caption)
    }; NativePasswordAutoFillPreferences() }.sheet(isPresented: $choosing) { NativeDownloadFolderPicker { shared.chooseDownloadDirectory($0); choosing = false } }.sheet(isPresented: $showing) { NativeDownloadsView() } }
}


struct NativePaletteValue: Codable, Equatable {
    var version = 1
    var name = "Proteus green"
    var colors: [String: String] = NativePalette.defaults
    var brightness: Double = 0
    var saturation: Double = 0
    func validated() throws -> Self {
        guard version == 1, name.count <= 80, colors.count <= 100, colors.values.allSatisfy({ $0.range(of: "^#[a-fA-F0-9]{6}$", options: .regularExpression) != nil }), brightness.isFinite, saturation.isFinite, (-30...30).contains(brightness), (-30...30).contains(saturation) else { throw RemoteError(message: "Choose a valid Proteus palette.") }
        return self
    }
}
@Observable final class NativePalette {
    static let shared = NativePalette()
    static let defaults: [String: String] = ["background": "#19231d", "panel": "#243128", "text": "#edf2ec", "muted": "#8e9e95", "border": "#3d4b40", "accent": "#c2e8a0", "control": "#2e3c31", "hover": "#3b4c3e", "input": "#1c2921", "title": "#1b251d", "tab": "#1b251d", "selectedTab": "#29372b", "tabText": "#b9c5bd", "selectedText": "#ffffff", "sidebar": "#1b251d", "sidebarGroup": "#243025", "sidebarButton": "#29372b", "sidebarSelected": "#3b4833", "sidebarText": "#a8b1a8", "sidebarStrong": "#eaefe8", "sidebarMuted": "#6e786f", "sidebarBorder": "#344135", "chat": "#243128", "user": "#33412d", "assistant": "#2a382d", "composer": "#2e3c31", "userEdge": "#acd58b", "assistantEdge": "#83b6b8", "menu": "#243128", "menuHover": "#2e3c31", "menuText": "#edf2ec", "menuMuted": "#8e9e95", "menuBorder": "#3d4b40", "menuAccent": "#c2e8a0", "progressTrack": "#364639"]
    static let groups: [(String, [(String, String)])] = [
        ("Application", [("background", "Page background"), ("panel", "Panels"), ("text", "Text"), ("muted", "Secondary text"), ("border", "Dividers"), ("accent", "Highlights"), ("control", "Controls"), ("hover", "Hover"), ("input", "Input fields")]),
        ("Title bar and tabs", [("title", "Title bar"), ("tab", "Tab strip"), ("selectedTab", "Selected tab"), ("tabText", "Tab text"), ("selectedText", "Selected tab text")]),
        ("Sidebar", [("sidebar", "Background"), ("sidebarGroup", "Groups"), ("sidebarButton", "Active feature"), ("sidebarSelected", "Selected item"), ("sidebarText", "Text"), ("sidebarStrong", "Titles"), ("sidebarMuted", "Counts and secondary text"), ("sidebarBorder", "Dividers")]),
        ("Chat", [("chat", "Chat panel"), ("user", "Your messages"), ("assistant", "Assistant messages"), ("composer", "Composer"), ("userEdge", "Your message border"), ("assistantEdge", "Assistant border")]),
        ("Menus and downloads", [("menu", "Background"), ("menuHover", "Hover"), ("menuText", "Text"), ("menuMuted", "Secondary text"), ("menuBorder", "Dividers"), ("menuAccent", "Icons and progress"), ("progressTrack", "Progress track")])
    ]
    private static let surfaces = Set("background panel border control hover input title tab selectedTab sidebar sidebarGroup sidebarButton sidebarSelected sidebarBorder chat user assistant composer menu menuHover menuBorder progressTrack".split(separator: " ").map(String.init))
    // OS-owned controls/menu hover/traffic lights have no app color override.
    static let visibleKeys = Set("background panel text muted border accent input tab selectedTab tabText sidebar sidebarGroup sidebarButton sidebarSelected sidebarText sidebarStrong sidebarMuted sidebarBorder user assistant composer userEdge assistantEdge menu menuText menuMuted menuBorder menuAccent".split(separator: " ").map(String.init))
    var value: NativePaletteValue { didSet { status = value == saved ? "Saved palette" : "Unsaved changes" } }
    var saved: NativePaletteValue
    var status = "Saved palette"
    init(defaults: UserDefaults = .standard) {
        let stored = defaults.data(forKey: "proteus.palette.v1").flatMap { try? JSONDecoder().decode(NativePaletteValue.self, from: $0).validated() } ?? NativePaletteValue()
        value = stored; saved = stored
    }
    static func uiColor(_ hex: String) -> UIColor {
        let bits = UInt32(hex.dropFirst(), radix: 16) ?? 0
        return UIColor(red: CGFloat((bits >> 16) & 255) / 255, green: CGFloat((bits >> 8) & 255) / 255, blue: CGFloat(bits & 255) / 255, alpha: 1)
    }
    func color(_ key: String, adjusted: Bool = true) -> Color {
        let color = Self.uiColor(value.colors[key] ?? Self.defaults[key] ?? "#ffffff")
        guard adjusted, Self.surfaces.contains(key) else { return Color(uiColor: color) }
        var h: CGFloat = 0, s: CGFloat = 0, l: CGFloat = 0, a: CGFloat = 0
        // Match desktop HSL sliders rather than UIKit's HSV brightness control.
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        let hi = max(r, g, b), lo = min(r, g, b), d = hi - lo
        l = (hi + lo) / 2; s = d == 0 ? 0 : d / (1 - abs(2 * l - 1))
        if d != 0 { h = hi == r ? ((g - b) / d).truncatingRemainder(dividingBy: 6) : hi == g ? (b - r) / d + 2 : (r - g) / d + 4 }; h = (h * 60 + 360).truncatingRemainder(dividingBy: 360)
        l = min(1, max(0, l + value.brightness / 100)); s = min(1, max(0, s + value.saturation / 100))
        let c = (1 - abs(2 * l - 1)) * s, x = c * (1 - abs((h / 60).truncatingRemainder(dividingBy: 2) - 1)), m = l - c / 2
        let rgb: (CGFloat, CGFloat, CGFloat) = h < 60 ? (c,x,0) : h < 120 ? (x,c,0) : h < 180 ? (0,c,x) : h < 240 ? (0,x,c) : h < 300 ? (x,0,c) : (c,0,x)
        return Color(red: rgb.0 + m, green: rgb.1 + m, blue: rgb.2 + m)
    }
    func set(_ color: Color, key: String) {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
        value.colors[key] = String(format: "#%02x%02x%02x", Int((r*255).rounded()), Int((g*255).rounded()), Int((b*255).rounded())); status = "Unsaved changes"
    }
    func save(defaults: UserDefaults = .standard) throws { let data = try JSONEncoder().encode(value.validated()); defaults.set(data, forKey: "proteus.palette.v1"); saved = value; status = "Palette saved on this device" }
    var export: String { let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]; return (try? String(decoding: encoder.encode(value), as: UTF8.self)) ?? "" }
}
struct NativePaletteExport: Transferable {
    let value: NativePaletteValue
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .json) { item in let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]; return try encoder.encode(item.value) }.suggestedFileName("Proteus palette.json")
    }
}
struct NativePaletteView: View {
    @State private var palette = NativePalette.shared
    @State private var importing = false
    @State private var failure: String?
    var body: some View {
        @Bindable var editor = palette
        NativeList {
            Section {
                Text("Tune the actual app. Save keeps this palette on this device. Export or import a palette to use the same colors on another device.")
                TextField("Palette name", text: $editor.value.name).accessibilityIdentifier("palette-name")
                Text("Surface lightness \(Int(palette.value.brightness))%")
                Slider(value: $editor.value.brightness, in: -30...30, step: 1).accessibilityIdentifier("palette-lightness")
                Text("Surface saturation \(Int(palette.value.saturation))%")
                Slider(value: $editor.value.saturation, in: -30...30, step: 1).accessibilityIdentifier("palette-saturation")
                Text("Sliders leave bright text, icons and highlights at their selected colors.").font(.caption).foregroundStyle(.secondary)
            }
            ForEach(NativePalette.groups, id: \.0) { group in
                Section(group.0) { ForEach(group.1.filter { NativePalette.visibleKeys.contains($0.0) }, id: \.0) { item in
                    ColorPicker(item.1, selection: Binding(get: { palette.color(item.0, adjusted: false) }, set: { palette.set($0, key: item.0) }), supportsOpacity: false).accessibilityIdentifier("palette-" + item.0)
                } }
            }
            Section {
                ShareLink("Export palette", item: NativePaletteExport(value: palette.value), preview: SharePreview(palette.value.name))
                Button("Import palette") { importing = true }
                Text(palette.status).font(.caption).accessibilityIdentifier("palette-status")
                if let failure { Text(failure).foregroundStyle(.orange) }
            }
        }.scrollDismissesKeyboard(.interactively).safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                Text(palette.status).font(.caption).accessibilityIdentifier("palette-save-status")
                HStack {
                    Button("Save palette") { do { try palette.save() } catch { failure = error.localizedDescription } }.buttonStyle(.borderedProminent).accessibilityIdentifier("palette-save")
                    Button("Discard changes") { palette.value = palette.saved; palette.status = "Saved palette" }.buttonStyle(.bordered)
                    Button("Proteus defaults") { palette.value = NativePaletteValue(); palette.status = "Unsaved changes" }.buttonStyle(.bordered)
                }.font(.caption).frame(minHeight: 44)
            }.padding(8).frame(maxWidth: .infinity).background(NativeTheme.surface)
        }.fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            do { let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }; let data = try Data(contentsOf: url); guard data.count <= 32768 else { throw RemoteError(message: "Choose a palette smaller than 32 KB.") }; palette.value = try JSONDecoder().decode(NativePaletteValue.self, from: data).validated(); palette.status = "Unsaved changes" } catch { failure = error.localizedDescription }
        }
    }
}

import SwiftUI

struct EngineRoomView: View {
    static let pages = ["Overview", "Resources", "Connections", "Account & Security", "App Setup", "Browser settings", "Browser history", "Usage", "Notifications", "Logs"]
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
                ScrollView(.horizontal) { HStack { ForEach(Self.pages, id: \.self) { name in Button(name) { page = name }.buttonStyle(.bordered).tint(page == name ? .accentColor : .secondary) } }.padding(8) }.scrollIndicators(.hidden).accessibilityIdentifier("engine-sections")
                Divider()
                Group {
                    switch page {
                    case "App Setup": NativeSetupView()
                    case "Browser settings": NativeDownloadPreferences()
                    case "Browser history": NativeBrowserHistoryView()
                    case "Account & Security": SharedAccountView()
                    case "Connections": DestinationsView { adding = true }
                    case "Usage": if let remote = destinations.selected { ProviderUsageDetails(store: remote) } else { ContentUnavailableView("Choose a computer", systemImage: "desktopcomputer") }
                    case "Resources": resources
                    case "Notifications": activity
                    case "Logs": logs
                    default: NativeList { Section { Text("Manage your connections, account, usage and running resources."); Text("Providers are configured on the desktop host.").foregroundStyle(.secondary) }; ForEach(Self.pages.dropFirst(), id: \.self) { item in Button(item) { page = item } } }
                    }
                }
            }.background(NativeTheme.background).navigationTitle("Engine Room").navigationBarTitleDisplayMode(.inline)
                .toolbar { if ["Resources", "Notifications", "Logs"].contains(page) { Button("Refresh", systemImage: "arrow.clockwise") { Task { await load() } } } }
                .task(id: page + (destinations.selectedID ?? "")) { await load() }
                .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { adding = false } } } }
        }
    }
    private var resources: some View {
        NativeList {
            Section { Text(destinations.selectedLabel).font(.headline); if let failure { Text(failure).foregroundStyle(.orange) }; Text("Host figures include processes Proteus can inspect. Shared processes cannot be charged to one tab. iOS does not expose other apps’ memory here.").font(.caption).foregroundStyle(.secondary) }
            ForEach(value["processes"].array, id: \.self) { process in VStack(alignment: .leading) { Text(process["name"].string); HStack { Text("PID \(process["pid"].int)"); Text("CPU \(process["cpuPercent"].pretty)%"); Text(ByteCountFormatter.string(fromByteCount: Int64(process["memoryBytes"].int), countStyle: .memory)) }.font(.caption); if process["tabIds"].array.count > 1 { Text("Shared by \(process["tabIds"].array.count) tabs").font(.caption).foregroundStyle(.secondary) } } }
            if value["supported"] == .bool(false) { Text("Resource reporting is unavailable from this host.").foregroundStyle(.secondary) }
            Section("Host tabs") { ForEach(value["tabs"].array, id: \.self) { tab in VStack(alignment: .leading) { Text(tab["title"].string); Text(tab["loaded"].bool ? "Loaded" : "Unloaded").font(.caption).foregroundStyle(.secondary); HStack { Button("Unload") { resourceAction("unload", id: tab["id"].string) }.disabled(!tab["loaded"].bool); Button("Close", role: .destructive) { resourceAction("close", id: tab["id"].string) } }.buttonStyle(.bordered) }.contextMenu { Button("Unload") { resourceAction("unload", id: tab["id"].string) }; Button("Close", role: .destructive) { resourceAction("close", id: tab["id"].string) } } } }
            Section("This device · browser tabs") { ForEach(shared.browserTabs) { tab in HStack { VStack(alignment: .leading) { Text(tab.title); Text(tab.scope == "main" ? "Main tabs" : "Team Tools").font(.caption).foregroundStyle(.secondary) }; Spacer(); Button("Unload") { shared.unload(tab.id) }; Button("Close", role: .destructive) { shared.close(tab.id) } }.buttonStyle(.bordered) } }
        }
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
        guard ["Resources", "Notifications", "Logs"].contains(requestedPage) else { return }
        if requestedPage != "Resources" { await shared.refresh(life) }
        guard !Task.isCancelled, page == requestedPage, destinations.selectedID == requestedHost else { return }
        guard let remote = destinations.selected else { failure = "Choose a computer to inspect host activity."; return }
        guard remote.connected else { failure = "\(remote.displayName) is offline. Reconnect to refresh " + requestedPage.lowercased() + "."; return }
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
            Text("Use iOS Password AutoFill for Bitwarden. Desktop browser extensions and Ghostery filters do not run inside the native browser.").font(.caption).foregroundStyle(.secondary)
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

struct NativeDownloadPreferences: View {
    @EnvironmentObject var shared: SharedAppStore
    @State private var choosing = false
    @State private var showing = false
    var body: some View { Form { Section("Downloads") {
        Text(shared.downloadFolderName)
        Text("Files are saved in this device’s Downloads folder in Proteus by default. Choose a folder in Files to use another location.").font(.caption)
        Button("Choose download folder") { choosing = true }
        Button("Use default Downloads folder") { shared.chooseDownloadDirectory(nil) }
        Button("Open downloads folder") { if let folder = try? shared.downloadDirectory() { try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true); var parts = URLComponents(url: folder, resolvingAgainstBaseURL: false); parts?.scheme = "shareddocuments"; if let url = parts?.url { UIApplication.shared.open(url) } } }
        Button("Download history") { showing = true }
    } }.sheet(isPresented: $choosing) { NativeDownloadFolderPicker { shared.chooseDownloadDirectory($0); choosing = false } }.sheet(isPresented: $showing) { NativeDownloadsView() } }
}

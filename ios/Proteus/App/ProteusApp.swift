import SwiftUI

@main struct ProteusApp: App {
    @UIApplicationDelegateAdaptor(ProteusAppDelegate.self) private var appDelegate
    @StateObject private var shared = SharedAppStore()
    @StateObject private var destinations = DestinationStore()
    @StateObject private var life = LifeStore()
    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--synthetic-message-timezone") { MessageTimezoneFixture() }
            else if ProcessInfo.processInfo.arguments.contains("--synthetic-browser-history") { BrowserHistoryFixture() }
            else if ProcessInfo.processInfo.arguments.contains("--synthetic-attachment-preview") { AttachmentPreviewFixture() }
            else { ProteusRoot().environmentObject(destinations).environmentObject(life).environmentObject(shared) }
            #else
            ProteusRoot().environmentObject(destinations).environmentObject(life).environmentObject(shared)
            #endif
        }
    }
}
struct ProteusRoot: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @State private var area = "macs"
    @State private var incomingPairing = false
    @AppStorage("lifeEnabled") private var lifeEnabled = false
    @AppStorage("proteus.keep-screen-awake") private var keepScreenAwake = false
    private var showLife: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-life") { return true }
        #endif
        return lifeEnabled
    }
    @Environment(\.scenePhase) private var phase
    @ViewBuilder private var applicationContent: some View {
        if UIDevice.current.userInterfaceIdiom == .pad {
            GeometryReader { geometry in
                NativeShell().frame(width: geometry.size.width, height: geometry.size.height).clipped()
                    .background(alignment: .top) {
                        Color.black.frame(height: geometry.safeAreaInsets.top).offset(y: -geometry.safeAreaInsets.top)
                            .accessibilityIdentifier("ipad-system-status-background").allowsHitTesting(false)
                    }
            }.background(Color.black.ignoresSafeArea(.container, edges: .top))
        } else { NativeShell() }
    }
    var body: some View {
            applicationContent.tint(NativeTheme.accent).foregroundStyle(NativePalette.shared.color("text")).preferredColorScheme(.dark)
                .onAppear { UIApplication.shared.isIdleTimerDisabled = keepScreenAwake && phase == .active }
                .onChange(of: keepScreenAwake) { _, value in UIApplication.shared.isIdleTimerDisabled = value && phase == .active }
                .onChange(of: phase) { _, next in UIApplication.shared.isIdleTimerDisabled = keepScreenAwake && next == .active; if next != .active { NativeDescriptorCacheWriter.shared.flush() } }
                .onOpenURL { url in if url.scheme == "proteus" && url.host == "pair" { do { try destinations.add(url.absoluteString, label: "New computer"); incomingPairing = true } catch { destinations.error = error.localizedDescription } } }
                .sheet(isPresented: $incomingPairing, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { incomingPairing = false } } } }
                .onChange(of: destinations.pairingCompletion) { _, completion in if completion != nil { incomingPairing = false } }
                .task {
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("--reset-pairing") { destinations.resetForTesting() }
                    // Simulator pairing with a real host: the side-by-side release app can claim proteus:// URLs.
                    if let index = ProcessInfo.processInfo.arguments.firstIndex(of: "--pair-link"), ProcessInfo.processInfo.arguments.indices.contains(index + 1) {
                        do { try destinations.add(ProcessInfo.processInfo.arguments[index + 1], label: "New computer") } catch { destinations.error = error.localizedDescription }
                    }
                    if NativeDesignPreview.enabled && ProcessInfo.processInfo.arguments.contains("--phone-preview-fixture") && destinations.destinations.isEmpty {
                        do {
                            // Pairing invitations are one-use: never reuse URLSession's cached response.
                            let request = URLRequest(url: URL(string: "\(nativeFixtureHTTPOrigin)/pair?projects=1")!, cachePolicy: .reloadIgnoringLocalCacheData)
                            let (data, _) = try await URLSession.shared.data(for: request)
                            let fixture = try JSONDecoder().decode(JSON.self, from: data)
                            try destinations.add(fixture["code"].string, label: "Preview Mac")
                        } catch { destinations.error = "Start the local synthetic mobile fixture to use this preview: " + error.localizedDescription }
                    }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-destinations") {
                        destinations.resetForTesting()
                        // Keep synthetic count and long-message fixtures isolated from relay reconnects.
                        if ProcessInfo.processInfo.arguments.contains("--synthetic-nav-counts") || ProcessInfo.processInfo.arguments.contains("--synthetic-long-chat") || ProcessInfo.processInfo.arguments.contains("--synthetic-many-chat") || ProcessInfo.processInfo.arguments.contains("--synthetic-heavy-chat") { destinations.activity(false) }
                        let linuxHost = ProcessInfo.processInfo.arguments.contains("--synthetic-linux-host")
                        for (id, label, platform, arch) in [("10000000-0000-4000-8000-000000000001", linuxHost ? "Alpha Linux" : "Alpha Mac", linuxHost ? "linux" : "darwin", "x64"), ("10000000-0000-4000-8000-000000000002", "Beta Mac", "darwin", "arm64")] {
                            try? destinations.register(DeviceConnection(relay: "ws://127.0.0.1:1", hostId: id, deviceId: UUID().uuidString, key: RemoteCrypto.random()), label: label)
                            destinations.selected?.state = .object(["hostName": .string(label), "hostPlatform": .string(platform), "hostArchitecture": .string(arch)])
                            destinations.selected?.flushCache()
                        }
                        try? destinations.select("10000000-0000-4000-8000-000000000001", connect: false)
                    }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-notification-fixtures"),
                       let remote = destinations.remote(for: "10000000-0000-4000-8000-000000000001") {
                        let run: JSON = .object(["id": .string("notification-chat"), "title": .string("Notification fixture chat"), "status": .string("completed"), "events": .array([.object(["role": .string("assistant"), "text": .string("Notification destination loaded"), "at": .string("2026-10-05T00:00:00Z")])]), "eventStart": .number(0)])
                        remote.state = .object(["runs": .array([run]), "schedules": .array([.object(["id": .string("notification-schedule"), "name": .string("Notification fixture schedule"), "cron": .string("0 9 * * *"), "timezone": .string("UTC")])])])
                        remote.chats["notification-chat"] = run
                        remote.flushCache()
                    }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-chat-lifecycle-fixtures"),
                       let remote = destinations.remote(for: "10000000-0000-4000-8000-000000000001") {
                        let current: JSON = .object(["id": .string("current-chat"), "title": .string("Current fixture"), "status": .string("completed"), "updatedAt": .string("2026-10-05T18:00:00Z")])
                        let earlier: JSON = .object(["id": .string("earlier-chat"), "title": .string("Earlier fixture"), "status": .string("completed"), "updatedAt": .string("2026-10-01T18:00:00Z")])
                        let archived: JSON = .object(["id": .string("archived-chat"), "title": .string("Archived fixture"), "status": .string("completed"), "updatedAt": .string("2026-10-04T18:00:00Z"), "archived": .bool(true), "archivedAt": .string("2026-10-04T18:00:00Z")])
                        remote.state = .object(["runs": .array([current, earlier]), "runCount": .number(2), "runCountIncludingArchived": .number(3), "capabilities": .array([.string("chat.lifecycle.v1")])])
                        remote.allRuns = [current, archived, earlier]
                        remote.flushCache()
                    }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-nav-counts") {
                        for (hostID, chats, attention, schedules) in [
                            ("10000000-0000-4000-8000-000000000001", 120, 7, 2),
                            ("10000000-0000-4000-8000-000000000002", 9, 2, 1)
                        ] {
                            guard let remote = destinations.remote(for: hostID) else { continue }
                            remote.connected = true
                            remote.status = "Connected · synthetic fixture"
                            remote.state = .object(["runCount": .number(Double(chats)), "attentionCount": .number(Double(attention)), "schedules": .array((0..<schedules).map { .object(["id": .string("fixture-\($0)"), "name": .string("Fixture \($0)")]) }), "runs": .array([.object(["id": .string("fixture-\(hostID)"), "title": .string("Fixture chat"), "status": .string("awaiting_input"), "attentionRequired": .bool(true), "updatedAt": .string("2026-10-05T21:00:00Z")])])])
                        }
                        return
                    }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-long-chat"),
                       let remote = destinations.remote(for: "10000000-0000-4000-8000-000000000001") {
                        let longText = (0..<180).map { "Line \($0): synthetic long-message reading-position fixture." }.joined(separator: "\n")
                        let events: [JSON]
                        if ProcessInfo.processInfo.arguments.contains("--synthetic-activity-details") {
                            events = nativeActivityFixtureEvents()
                        } else if ProcessInfo.processInfo.arguments.contains("--synthetic-activity-spacing") {
                            events = (0..<40).map { index in
                                index.isMultiple(of: 2)
                                    ? .object(["role": .string("tool"), "data": .object(["tool": .object(["name": .string("Fixture tool"), "status": .string("completed")])])])
                                    : .object(["role": .string("system"), "data": .object(["permission": .object(["automatic": .bool(true)])])])
                            } + [.object(["role": .string("assistant"), "text": .string("")]), .object(["role": .string("system"), "text": .string("After activity fixture")])]
                        } else {
                            events = [.object(["role": .string("assistant"), "text": .string(longText), "at": .string("2026-10-05T21:00:00Z")])]
                        }
                        let run: JSON = .object(["id": .string("long-chat"), "title": .string("Long fixture"), "status": .string("completed"), "createdAt": .string("2026-10-05T20:00:00Z"), "updatedAt": .string("2026-10-05T21:00:00Z"), "eventStart": .number(0), "events": .array(events), "schedule": .object(["provider": .string("codex")]), "nextModelOptions": .object(["model": .string("gpt-6-sol")])])
                        remote.state = .object(["runs": .array([run]), "runCount": .number(1), "attentionCount": .number(0), "schedules": .array([]), "capabilities": .array([.string("chat.attachments.v1")]), "attachmentMediaTypes": .object(["codex": .array([.string("image/png")])])])
                        remote.chats["long-chat"] = run
                        if ProcessInfo.processInfo.arguments.contains("--synthetic-workspace-tab-icons") {
                            configureNativeIconFixture(remote: remote, shared: shared, life: life)
                        }
                        remote.flushCache()
                        return
                    }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-many-chat") || ProcessInfo.processInfo.arguments.contains("--synthetic-heavy-chat"),
                       let remote = destinations.remote(for: "10000000-0000-4000-8000-000000000001") {
                        let heavy = ProcessInfo.processInfo.arguments.contains("--synthetic-heavy-chat")
                        let events: [JSON] = (0..<(heavy ? 1000 : 100)).map { index in
                            let varied = ProcessInfo.processInfo.arguments.contains("--synthetic-varied-chat") && (index.isMultiple(of: 17) || index == 999)
                            return .object(["role": .string(index.isMultiple(of: 2) ? "user" : "assistant"),
                                     "text": .string(heavy ? "Message \(index): " + String(repeating: "Rich **history** content. ", count: varied ? 240 : 24) : "Synthetic message \(index): a short bounded-history fixture."),
                                     "at": .string("2026-10-05T21:00:00Z")])
                        }
                        let run: JSON = .object(["id": .string("many-chat"), "title": .string(heavy ? "Heavy fixture" : "Many fixture"),
                            "status": .string("completed"), "eventStart": .number(0), "events": .array(events),
                            "usage": .object(["observed": .bool(true), "inputTokens": .number(123456), "outputTokens": .number(6789)]),
                            "schedule": .object(["provider": .string("rehearsal")])])
                        remote.state = .object(["runs": .array([run]), "runCount": .number(1), "attentionCount": .number(0), "schedules": .array([])])
                        remote.chats["many-chat"] = run
                        remote.flushCache()
                        return
                    }
                    #endif
                    destinations.activity(true)
                }
                .onChange(of: phase) { _, value in
                    if value != .active { shared.flushDocumentScrollPositions() }
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-nav-counts") || ProcessInfo.processInfo.arguments.contains("--synthetic-long-chat") || ProcessInfo.processInfo.arguments.contains("--synthetic-many-chat") || ProcessInfo.processInfo.arguments.contains("--synthetic-heavy-chat") { return }
                    #endif
                    destinations.activity(value == .active)
                }
                .onChange(of: lifeEnabled) { _, enabled in if !enabled { area = "macs" } }
                .alert("Proteus", isPresented: Binding(get: { destinations.error != nil }, set: { if !$0 { destinations.error = nil } })) { Button("OK") { destinations.error = nil } } message: { Text(destinations.error ?? "") }
    }
}
struct DestinationRoot: View {
    @EnvironmentObject var destinations: DestinationStore
    @State private var adding = false
    @State private var managing = false
    @State private var setup = false
    var body: some View {
        Group {
            if let remote = destinations.selected {
                VStack(spacing: 0) {
                    DestinationBar(remote: remote, adding: $adding, managing: $managing, setup: $setup)
                    RootView().environment(remote).id(destinations.selectedID)
                }
            } else { NavigationStack { PairView().toolbar { ToolbarItem(placement: .primaryAction) { Button("App setup", systemImage: "gearshape") { setup = true }.accessibilityIdentifier("app-setup") } } } }
        }
        .sheet(isPresented: $setup) { NavigationStack { NativeSetupView() } }
        .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { destinations.cancelPairing(); adding = false } } } } }
        .sheet(isPresented: $managing) { NavigationStack { DestinationsView { managing = false; adding = true }.toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { managing = false } } } } }
        .onChange(of: destinations.pairingCompletion) { _, completion in if completion != nil { adding = false; managing = true } }
        .onChange(of: destinations.pairing != nil) { _, pairing in if !pairing { adding = false } }
    }
}
struct DestinationBar: View {
    @EnvironmentObject var destinations: DestinationStore
    var remote: RemoteStore
    @Binding var adding: Bool
    @Binding var managing: Bool
    @Binding var setup: Bool
    var body: some View {
        HStack {
            Menu {
                ForEach(destinations.destinations) { destination in
                    Button { do { try destinations.select(destination.id) } catch { destinations.error = error.localizedDescription } } label: { Label(destination.label, systemImage: destination.id == destinations.selectedID ? "checkmark" : "desktopcomputer") }
                }
                Divider()
                Button("Add computer", systemImage: "plus") { adding = true }
                Button("Manage computers", systemImage: "desktopcomputer") { managing = true }
                Button("App setup", systemImage: "gearshape") { setup = true }.accessibilityIdentifier("app-setup")
            } label: {
                HStack(spacing: 9) { Image(systemName: "desktopcomputer"); VStack(alignment: .leading, spacing: 2) { Text(destinations.selectedLabel).font(.subheadline.bold()); Text(remote.status).font(.caption2).foregroundStyle(.secondary) }; Image(systemName: "chevron.down").font(.caption); Spacer() }
            }.accessibilityIdentifier("destination-picker").accessibilityLabel("Computer: " + destinations.selectedLabel)
            Circle().fill(remote.connected ? Color.green : Color.orange).frame(width: 7, height: 7)
        }.padding(.horizontal).padding(.vertical, 9).background(.bar)
    }
}
struct NativeSetupView: View {
    @AppStorage("lifeEnabled") private var lifeEnabled = false
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Form {
            Section("Optional features") {
                Toggle("Show Life", isOn: $lifeEnabled).accessibilityIdentifier("show-life")
                Text("Add the Life tab for your website account. This preference belongs to this device and is independent of your selected computer. Website sign-in is required separately.").font(.footnote).foregroundStyle(.secondary)
                Text("Hiding Life keeps its secure sign-in. To remove that session, sign out from Life account first.").font(.footnote).foregroundStyle(.secondary)
            }
        }.navigationTitle("App setup").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
    }
}
private enum Page: String, CaseIterable, Identifiable {
    case chats = "Chats", schedules = "Schedules", context = "Workspace context", connection = "Connection"
    var id: String { rawValue }
    var icon: String { switch self { case .chats: "bubble.left.and.bubble.right"; case .schedules: "calendar.badge.clock"; case .context: "square.stack.3d.up"; case .connection: "network" } }
}
struct RootView: View {
    @Environment(RemoteStore.self) var store
    @State private var page: Page? = .chats
    var body: some View {
        Group {
            if !store.paired { NavigationStack { PairView() } }
            else {
                NavigationSplitView {
                    List(Page.allCases, selection: $page) { item in NavigationLink(value: item) { Label(item.rawValue, systemImage: item.icon) } }
                        .navigationTitle("Proteus")
                        .safeAreaInset(edge: .bottom) { ConnectionStatus().padding() }
                } detail: {
                    switch page ?? .chats {
                    case .chats: ChatsView()
                    case .schedules: SchedulesView()
                    case .context: NavigationStack { ContextView() }
                    case .connection: NavigationStack { ConnectionView() }
                    }
                }
            }
        }.alert("Proteus", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }
    }
}
struct ConnectionStatus: View {
    @Environment(RemoteStore.self) var store
    var body: some View { HStack(spacing: 7) { Circle().fill(store.connected ? Color.green : Color.orange).frame(width: 7, height: 7); Text(store.status).font(.caption).foregroundStyle(.secondary); Spacer() }.accessibilityElement(children: .combine) }
}
struct PairView: View {
    @EnvironmentObject var destinations: DestinationStore
    @State private var code = ""
    @State private var label = "My computer"
    @State private var scan = false
    @State private var scannedCode: String?
    var body: some View {
        Form {
            Section {
                Image(systemName: "point.3.connected.trianglepath.dotted").font(.system(size: 52)).foregroundStyle(.tint).frame(maxWidth: .infinity).padding()
                Text("Add your computer").font(.title2.bold())
                Text("Open Connections in Proteus on your computer, then create a one-time pairing code. Each computer keeps its own chats, schedules and workspace context.").foregroundStyle(.secondary)
            }
            Section("Add a computer") {
                TextField("Computer name", text: $label).accessibilityIdentifier("destination-name")
                Text("This name updates from the computer after it connects.").font(.caption).foregroundStyle(.secondary)
                Button("Scan pairing QR code", systemImage: "qrcode.viewfinder") { scan = true }
                TextField("Paste pairing link", text: $code, axis: .vertical).textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier("pairing-link")
                Button("Pair computer") { pair() }.disabled(code.isEmpty || label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("pair-mac")
                if let remote = destinations.pairing { PairingStatus(remote: remote) }
            }
            if !destinations.destinations.isEmpty { Section("Saved computers") { ForEach(destinations.destinations) { destination in Button(destination.label) { do { try destinations.select(destination.id) } catch { destinations.error = error.localizedDescription } } } } }
            Section { Text("Computers can share the same encrypted relay address. Pair each computer separately; adding one does not replace another. Life remains your shared website database. Omi pendant capture remains in the separate Omi app.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle(destinations.destinations.isEmpty ? "Proteus" : "Add computer")
            .sheet(isPresented: $scan, onDismiss: {
                // Finish dismissing the camera before success can dismiss its parent.
                if let value = scannedCode { scannedCode = nil; code = value; pair() }
            }) { QRScanner { value in scannedCode = value; scan = false }.ignoresSafeArea().overlay(alignment: .topTrailing) { Button("Cancel") { scannedCode = nil; scan = false }.padding().buttonStyle(.borderedProminent) } }
    }
    private func pair() { do { try destinations.add(code, label: label) } catch { destinations.error = error.localizedDescription } }
}
struct PairingStatus: View {
    var remote: RemoteStore
    var body: some View { VStack(alignment: .leading) { Text(remote.status).font(.caption).foregroundStyle(.secondary); if let platform = remote.hostInfo.platformDescription { Text(platform).font(.caption).foregroundStyle(.secondary) }; if let error = remote.error { Text(error).foregroundStyle(.orange) } } }
}
struct DestinationsView: View {
    @EnvironmentObject var destinations: DestinationStore
    var addComputer: () -> Void
    @State private var renameID: String?
    @State private var renameLabel = ""
    @State private var forgetID: String?
    @State private var editingRelay: HostDestination?
    var body: some View {
        List {
            if let completion = destinations.pairingCompletion,
               let destination = destinations.destinations.first(where: { $0.id == completion.hostID }) {
                Section {
                    Label("Paired successfully with \(destination.label)", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green).accessibilityIdentifier("pairing-success")
                    Text("The computer is saved. Its current connection status is shown below.").font(.caption).foregroundStyle(.secondary)
                }
            }
            Section("Saved computers") {
                ForEach(destinations.destinations) { destination in
                    VStack(alignment: .leading, spacing: 9) {
                        HStack { Label(destination.label, systemImage: "desktopcomputer").font(.headline); Spacer(); if destination.id == destinations.selectedID { HStack(spacing: 4) { Image(systemName: "checkmark.circle.fill"); Text("Selected") }.font(.caption).foregroundStyle(.tint).fixedSize() } }.fixedSize(horizontal: false, vertical: true)
                        if let remote = destinations.remote(for: destination.id) { PairingStatus(remote: remote) } else { Text("Saved · not connected").font(.caption).foregroundStyle(.secondary) }
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 112), alignment: .leading)], alignment: .leading, spacing: 8) {
                            Button(destination.id == destinations.selectedID ? "Selected" : "Use computer") { do { try destinations.select(destination.id) } catch { destinations.error = error.localizedDescription } }.disabled(destination.id == destinations.selectedID).accessibilityIdentifier("select-" + destination.id)
                            Button("Reconnect") { destinations.remote(for: destination.id)?.activity(true) }
                            Button("Rename") { renameID = destination.id; renameLabel = destination.label }.accessibilityIdentifier("rename-" + destination.id)
                            Button("Edit relay") { editingRelay = destination }.accessibilityIdentifier("edit-relay-" + destination.id)
                            Button("Forget", role: .destructive) { forgetID = destination.id }.accessibilityIdentifier("forget-" + destination.id)
                        }.buttonStyle(.bordered).font(.subheadline).lineLimit(1)
                    }.padding(.vertical, 5)
                }
            }
            Section { Button("Add computer", systemImage: "plus", action: addComputer); Text("Switching stops local retries to the previous computer. Work already accepted by that computer continues there. Unconfirmed actions should be checked in that computer’s history before retrying.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("Computers")
            .sheet(item: $editingRelay) { destination in NavigationStack { RelayEditor(destination: destination, address: destinations.relayAddress(for: destination.id) ?? "") } }
            .alert("Rename computer", isPresented: Binding(get: { renameID != nil }, set: { if !$0 { renameID = nil } })) { TextField("Computer name", text: $renameLabel); Button("Cancel", role: .cancel) { renameID = nil }; Button("Save") { if let id = renameID { do { try destinations.rename(id, label: renameLabel) } catch { destinations.error = error.localizedDescription } }; renameID = nil } }
            .confirmationDialog("Forget this computer? Its key, cached history and local drafts will be removed from this device. Other computers are unchanged.", isPresented: Binding(get: { forgetID != nil }, set: { if !$0 { forgetID = nil } }), titleVisibility: .visible) { Button("Forget computer", role: .destructive) { if let id = forgetID { do { try destinations.forget(id) } catch { destinations.error = error.localizedDescription } }; forgetID = nil } }
    }
}
struct RelayEditor: View {
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.dismiss) private var dismiss
    let destination: HostDestination
    @State var address: String
    @State private var failure: String?
    var body: some View {
        Form {
            Section(destination.label) {
                TextField("Relay address", text: $address).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).accessibilityIdentifier("relay-address")
                Text("Use wss:// for an internet relay, or ws:// for a local network relay. Configure \(destination.label) to use the same relay first.").font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Text("The identity, device key, cached history and drafts for \(destination.label) stay the same. Only its relay address on this device changes. It reconnects immediately.")
                Text("Unconfirmed actions will stop retrying. Check \(destination.label)’s refreshed history before submitting them again.").font(.footnote).foregroundStyle(.secondary)
                if let failure { Text(failure).foregroundStyle(.orange).accessibilityIdentifier("relay-error") }
            }
        }.navigationTitle("Edit relay")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { do { try destinations.editRelay(destination.id, address: address); dismiss() } catch { failure = error.localizedDescription } }.accessibilityIdentifier("save-relay").disabled(address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
            }
    }
}
struct ConnectionView: View {
    @Environment(RemoteStore.self) var store
    @EnvironmentObject var destinations: DestinationStore
    @State private var adding = false
    var body: some View {
        DestinationsView { adding = true }
            .safeAreaInset(edge: .bottom) { VStack(alignment: .leading, spacing: 7) { Text(destinations.selectedLabel).font(.headline); ConnectionStatus(); Text(store.connection?.relay ?? "").font(.caption).textSelection(.enabled); Button("Reconnect " + destinations.selectedLabel) { store.disconnect(); store.activity(true) } }.padding().frame(maxWidth: .infinity, alignment: .leading).background(.bar) }
            .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { destinations.cancelPairing(); adding = false } } } }
            .onChange(of: destinations.pairingCompletion) { _, completion in if completion != nil { adding = false } }
    }
}
func statusLabel(_ value: String) -> String { ["awaiting_input": "Needs feedback", "completed": "Turn complete", "running": "Working", "queued": "Queued", "interrupted": "Interrupted", "failed": "Failed", "cancelled": "Cancelled"][value] ?? value }

#if DEBUG
private func nativeActivityFixtureEvents() -> [JSON] {
    return [
                                .object(["role": .string("user"), "text": .string("Synthetic activity detail rehearsal")]),
                                .object(["role": .string("tool"), "data": .object(["tool": .object(["callId": .string("native-rehearsal-read"), "summary": .string("Read synthetic fixture"), "status": .string("completed"), "startedAt": .string("2026-10-12T12:00:00Z"), "finishedAt": .string("2026-10-12T12:00:04.250Z"), "durationMs": .number(4250), "output": .string("Synthetic read output")])])]),
                                .object(["role": .string("system"), "text": .string("Synthetic system note inside activity"), "at": .string("2026-10-12T12:00:05Z")]),
                                .object(["role": .string("system"), "at": .string("2026-10-12T12:00:06Z"), "data": .object(["permission": .object(["automatic": .bool(true), "toolCallId": .string("native-rehearsal-read"), "intention": .string("Read synthetic fixture"), "reason": .string("Synthetic workspace rule"), "request": .string("{\"toolCallId\":\"native-rehearsal-read\",\"path\":\"synthetic-fixture.md\"}")])])]),
                                .object(["role": .string("tool"), "data": .object(["tool": .object(["callId": .string("native-rehearsal-missing"), "summary": .string("Synthetic tool without recorded timing"), "status": .string("completed")])])]),
                                .object(["role": .string("assistant"), "text": .string("Synthetic activity rehearsal complete.")])
                            ]
}
@MainActor private func configureNativeIconFixture(remote: RemoteStore, shared: SharedAppStore, life: LifeStore) {
                            shared.reset(for: life.accountIdentity)
                            let workspaceID = "native-icon-workspace"
                            let projectFixture = ProcessInfo.processInfo.arguments.contains("--synthetic-project-restore")
                            let projectID = "native-restore-project"
                            let scope = projectFixture ? "project:10000000-0000-4000-8000-000000000001:" + projectID : "workspace:10000000-0000-4000-8000-000000000001:" + workspaceID
                            let navigationKey = projectFixture ? "project-navigation:" + projectID : "workspace-navigation:" + workspaceID
                            var fields = remote.state.object
                            fields["context"] = .object(["workspaces": .array([.object(["id": .string(workspaceID), "name": .string("Native icon rehearsal"), "cwd": .string("/synthetic-fixture")])])])
                            if projectFixture {
                                fields["capabilities"] = .array((fields["capabilities"]?.array ?? []) + [.string("projects.v1")])
                                fields["workspaceProjects"] = .object(["schemaVersion": .number(1), "revision": .string("fixture-v1"), "projects": .array([.object(["id": .string(projectID), "workspaceId": .string(workspaceID), "name": .string("Restore project")])]), "defaultProjectIds": .object([workspaceID: .string(projectID)])])
                                remote.setDraft("workspace-selected-project:" + workspaceID, .string(projectID))
                            }
                            remote.state = .object(fields)
                            remote.setDraft("workspace-navigation:" + workspaceID, .object(["chats": .array([.string("long-chat")]), "selected": .string("workspace")]))
                            shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([
                                .object(["id": .string("chat:long-chat"), "type": .string("chat"), "chatId": .string("long-chat"), "title": .string("Long fixture")]),
                                .object(["id": .string("fixture-terminal"), "type": .string("terminal"), "title": .string("Synthetic terminal")]),
                                .object(["id": .string("document:fixture-document"), "documentId": .string("fixture-document"), "type": .string("document"), "title": .string("Synthetic document"), "mediaType": .string("text/markdown")])
                            ])]), scope: scope)
                            if ProcessInfo.processInfo.arguments.contains("--synthetic-workspace-browser-selection") {
                                let first = shared.open(URL(string: nativeFixtureHTTPOrigin + "/browser/one"), title: "First browser page", scope: scope)
                                shared.open(URL(string: nativeFixtureHTTPOrigin + "/browser/three"), title: "Third browser page", scope: scope)
                                // Simulate opening a saved project/sidebar child while another
                                // browser was the last scoped selection.
                                remote.setDraft(navigationKey, .object(["chats": .array([.string("long-chat")]), "selected": .string(first ?? "workspace")]))
                                if ProcessInfo.processInfo.arguments.contains("--synthetic-large-browser") {
                                    let entries = (0..<300).map { number in BrowserHistoryEntry(id: "entry-\(number)", url: "https://example.test/history/\(number)", title: "History \(number)") }
                                    shared.browserTabs += (0..<98).map { number in BrowserDescriptor(id: "large-browser-\(number)", title: "Saved page \(number)", url: "https://example.test/history/299", scope: scope, history: BrowserTabHistory(entries: entries, index: 299)) }
                                    // An unusually tall screenshot previously escaped its grid cell.
                                    let image = UIGraphicsImageRenderer(size: CGSize(width: 80, height: 800)).image { context in UIColor.systemGreen.setFill(); context.fill(CGRect(x: 0, y: 0, width: 80, height: 800)) }
                                    for tab in shared.tabs(in: scope).prefix(2) { NativeThumbnailCache.save(image, key: "browser:" + life.accountIdentity + ":" + tab.profileId + ":" + (tab.ownerHostId ?? "local") + ":" + (tab.contentTabId ?? tab.id)) }
                                }
                            } else { shared.open(nil, title: "Synthetic browser", scope: scope) }
                            shared.browserTabs.append(BrowserDescriptor(id: "fixture-local-recents", title: "Local recent across scopes", url: nil, scope: "fixture-history", history: BrowserTabHistory(entries: [BrowserHistoryEntry(url: "https://example.test/local", title: "Local recent across scopes")], index: 0)))
}
#endif

import SwiftUI

@main struct ProteusApp: App {
    @StateObject private var destinations = DestinationStore()
    @StateObject private var life = LifeStore()
    var body: some Scene {
        WindowGroup { ProteusRoot().environmentObject(destinations).environmentObject(life) }
    }
}
struct ProteusRoot: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @State private var area = "macs"
    @AppStorage("lifeEnabled") private var lifeEnabled = false
    private var showLife: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-life") { return true }
        #endif
        return lifeEnabled
    }
    @Environment(\.scenePhase) private var phase
    var body: some View {
            TabView(selection:$area) {
                DestinationRoot().tabItem { Label("Macs",systemImage:"desktopcomputer") }.tag("macs")
                if showLife { LifeRootView().tabItem { Label("Life",systemImage:"heart.text.square") }.tag("life") }
            }.overlay { if phase != .active { Color.black.ignoresSafeArea().overlay { Label("Proteus",systemImage:"lock.shield").font(.title2).foregroundStyle(.secondary) } } }.tint(Color(red: 0.67, green: 0.86, blue: 0.49)).preferredColorScheme(.dark)
                .onOpenURL { url in if url.scheme == "proteus" && url.host == "pair" { area = "macs"; do { try destinations.add(url.absoluteString, label: "New Mac") } catch { destinations.error = error.localizedDescription } } }
                .task {
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("--reset-pairing") { destinations.resetForTesting() }
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-destinations") {
                        destinations.resetForTesting()
                        for (id, label) in [("10000000-0000-4000-8000-000000000001", "Build Mac"), ("10000000-0000-4000-8000-000000000002", "Work Mac")] {
                            try? destinations.register(DeviceConnection(relay: "ws://127.0.0.1:1", hostId: id, deviceId: UUID().uuidString, key: RemoteCrypto.random()), label: label)
                        }
                        try? destinations.select("10000000-0000-4000-8000-000000000001", connect: false)
                    }
                    #endif
                    destinations.activity(true)
                }
                .onChange(of: phase) { _, value in destinations.activity(value == .active) }
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
                    ProviderUsageStrip(store: remote).id(destinations.selectedID)
                    RootView().environmentObject(remote).id(destinations.selectedID)
                }
            } else { NavigationStack { PairView().toolbar { ToolbarItem(placement: .primaryAction) { Button("App setup", systemImage: "gearshape") { setup = true }.accessibilityIdentifier("app-setup") } } } }
        }
        .sheet(isPresented: $setup) { NavigationStack { NativeSetupView() } }
        .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { destinations.cancelPairing(); adding = false } } } } }
        .sheet(isPresented: $managing) { NavigationStack { DestinationsView { managing = false; adding = true }.toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { managing = false } } } } }
        .onChange(of: destinations.selectedID) { _, _ in adding = false }
        .onChange(of: destinations.pairing != nil) { _, pairing in if !pairing { adding = false } }
    }
}
struct DestinationBar: View {
    @EnvironmentObject var destinations: DestinationStore
    @ObservedObject var remote: RemoteStore
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
                Button("Add Mac", systemImage: "plus") { adding = true }
                Button("Manage Macs", systemImage: "desktopcomputer") { managing = true }
                Button("App setup", systemImage: "gearshape") { setup = true }.accessibilityIdentifier("app-setup")
            } label: {
                HStack(spacing: 9) { Image(systemName: "desktopcomputer"); VStack(alignment: .leading, spacing: 2) { Text(destinations.selectedLabel).font(.subheadline.bold()); Text(remote.status).font(.caption2).foregroundStyle(.secondary) }; Image(systemName: "chevron.down").font(.caption); Spacer() }
            }.accessibilityIdentifier("destination-picker").accessibilityLabel("Mac destination: " + destinations.selectedLabel)
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
                Text("Add the Life tab for your website account. This preference belongs to this device and is independent of your selected Mac. Website sign-in is required separately.").font(.footnote).foregroundStyle(.secondary)
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
    @EnvironmentObject var store: RemoteStore
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
    @EnvironmentObject var store: RemoteStore
    var body: some View { HStack(spacing: 7) { Circle().fill(store.connected ? Color.green : Color.orange).frame(width: 7, height: 7); Text(store.status).font(.caption).foregroundStyle(.secondary); Spacer() }.accessibilityElement(children: .combine) }
}
struct PairView: View {
    @EnvironmentObject var destinations: DestinationStore
    @State private var code = ""
    @State private var label = "My Mac"
    @State private var scan = false
    var body: some View {
        Form {
            Section {
                Image(systemName: "point.3.connected.trianglepath.dotted").font(.system(size: 52)).foregroundStyle(.tint).frame(maxWidth: .infinity).padding()
                Text("Your Macs. One app.").font(.title2.bold())
                Text("Open Remote Access in Proteus on the Mac you want to add, then create a one-time pairing code. Each Mac keeps its own chats, schedules and workspace context.").foregroundStyle(.secondary)
            }
            Section("Add a Mac") {
                TextField("Mac name", text: $label).accessibilityIdentifier("destination-name")
                Text("For example: Build Mac or Work Mac.").font(.caption).foregroundStyle(.secondary)
                Button("Scan pairing QR code", systemImage: "qrcode.viewfinder") { scan = true }
                TextField("Paste pairing link", text: $code, axis: .vertical).textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier("pairing-link")
                Button("Pair Mac") { pair() }.disabled(code.isEmpty || label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("pair-mac")
                if let remote = destinations.pairing { PairingStatus(remote: remote) }
            }
            if !destinations.destinations.isEmpty { Section("Saved Macs") { ForEach(destinations.destinations) { destination in Button(destination.label) { do { try destinations.select(destination.id) } catch { destinations.error = error.localizedDescription } } } } }
            Section { Text("Macs can share the same encrypted relay address. Pair each Mac separately; adding one does not replace another. Life remains your shared website database. Omi pendant capture remains in the separate Omi app.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle(destinations.destinations.isEmpty ? "Proteus" : "Add Mac")
            .sheet(isPresented: $scan) { QRScanner { value in scan = false; code = value; pair() }.ignoresSafeArea().overlay(alignment: .topTrailing) { Button("Cancel") { scan = false }.padding().buttonStyle(.borderedProminent) } }
    }
    private func pair() { do { try destinations.add(code, label: label) } catch { destinations.error = error.localizedDescription } }
}
struct PairingStatus: View {
    @ObservedObject var remote: RemoteStore
    var body: some View { VStack(alignment: .leading) { Text(remote.status).font(.caption).foregroundStyle(.secondary); if let error = remote.error { Text(error).foregroundStyle(.orange) } } }
}
struct DestinationsView: View {
    @EnvironmentObject var destinations: DestinationStore
    var addMac: () -> Void
    @State private var renameID: String?
    @State private var renameLabel = ""
    @State private var forgetID: String?
    @State private var editingRelay: MacDestination?
    var body: some View {
        List {
            Section("Saved Macs") {
                ForEach(destinations.destinations) { destination in
                    VStack(alignment: .leading, spacing: 9) {
                        HStack { Label(destination.label, systemImage: "desktopcomputer").font(.headline); Spacer(); if destination.id == destinations.selectedID { Image(systemName: "checkmark.circle.fill").foregroundStyle(.tint) } }
                        if let remote = destinations.remote(for: destination.id) { PairingStatus(remote: remote) } else { Text("Saved · not connected").font(.caption).foregroundStyle(.secondary) }
                        HStack {
                            Button("Use Mac") { do { try destinations.select(destination.id) } catch { destinations.error = error.localizedDescription } }.disabled(destination.id == destinations.selectedID).accessibilityIdentifier("select-" + destination.id)
                            Button("Rename") { renameID = destination.id; renameLabel = destination.label }.accessibilityIdentifier("rename-" + destination.id)
                            Button("Edit relay") { editingRelay = destination }.accessibilityIdentifier("edit-relay-" + destination.id)
                            Button("Forget", role: .destructive) { forgetID = destination.id }.accessibilityIdentifier("forget-" + destination.id)
                        }.buttonStyle(.bordered)
                    }.padding(.vertical, 5)
                }
            }
            Section { Button("Add Mac", systemImage: "plus", action: addMac); Text("Switching stops local retries to the previous Mac. Work already accepted by that Mac continues there. Unconfirmed actions should be checked in that Mac’s history before retrying.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("Mac destinations")
            .sheet(item: $editingRelay) { destination in NavigationStack { RelayEditor(destination: destination, address: destinations.relayAddress(for: destination.id) ?? "") } }
            .alert("Rename Mac", isPresented: Binding(get: { renameID != nil }, set: { if !$0 { renameID = nil } })) { TextField("Mac name", text: $renameLabel); Button("Cancel", role: .cancel) { renameID = nil }; Button("Save") { if let id = renameID { do { try destinations.rename(id, label: renameLabel) } catch { destinations.error = error.localizedDescription } }; renameID = nil } }
            .confirmationDialog("Forget this Mac? Its key, cached history and local drafts will be removed from this device. Other Macs are unchanged.", isPresented: Binding(get: { forgetID != nil }, set: { if !$0 { forgetID = nil } }), titleVisibility: .visible) { Button("Forget Mac", role: .destructive) { if let id = forgetID { do { try destinations.forget(id) } catch { destinations.error = error.localizedDescription } }; forgetID = nil } }
    }
}
struct RelayEditor: View {
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.dismiss) private var dismiss
    let destination: MacDestination
    @State var address: String
    @State private var failure: String?
    var body: some View {
        Form {
            Section(destination.label) {
                TextField("Relay address", text: $address).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).accessibilityIdentifier("relay-address")
                Text("Use wss:// for an internet relay, or ws:// for a local network relay. Configure this Mac to use the same relay first.").font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Text("Your Mac identity, device key, cached history and drafts stay the same. Only this Mac’s relay address on this device changes. The selected Mac reconnects immediately.")
                Text("Unconfirmed actions will stop retrying. Check this Mac’s refreshed history before submitting them again.").font(.footnote).foregroundStyle(.secondary)
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
    @EnvironmentObject var store: RemoteStore
    @EnvironmentObject var destinations: DestinationStore
    @State private var adding = false
    var body: some View {
        DestinationsView { adding = true }
            .safeAreaInset(edge: .bottom) { VStack(alignment: .leading, spacing: 7) { Text(destinations.selectedLabel).font(.headline); ConnectionStatus(); Text(store.connection?.relay ?? "").font(.caption).textSelection(.enabled); Button("Reconnect selected Mac") { store.disconnect(); store.activity(true) } }.padding().frame(maxWidth: .infinity, alignment: .leading).background(.bar) }
            .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { destinations.cancelPairing(); adding = false } } } }
            .onChange(of: destinations.selectedID) { _, _ in adding = false }
    }
}
func statusLabel(_ value: String) -> String { ["awaiting_input": "Needs feedback", "completed": "Turn complete", "running": "Working", "queued": "Queued", "interrupted": "Interrupted", "failed": "Failed", "cancelled": "Cancelled"][value] ?? value }

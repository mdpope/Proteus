import SwiftUI

@main struct ProteusApp: App {
    @StateObject private var store = RemoteStore()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store).tint(Color(red: 0.67, green: 0.86, blue: 0.49)).preferredColorScheme(.dark)
                .onOpenURL { url in do { try store.pair(url.absoluteString) } catch { store.error = error.localizedDescription } }
                .task {
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("--reset-pairing") { store.forget() }
                    #endif
                    store.activity(true)
                }
                .onChange(of: phase) { _, value in store.activity(value == .active) }
                .alert("Proteus", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }
        }
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
        }
    }
}
struct ConnectionStatus: View {
    @EnvironmentObject var store: RemoteStore
    var body: some View { HStack(spacing: 7) { Circle().fill(store.connected ? Color.green : Color.orange).frame(width: 7, height: 7); Text(store.status).font(.caption).foregroundStyle(.secondary); Spacer() }.accessibilityElement(children: .combine) }
}
struct PairView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var code = ""
    @State private var scan = false
    var body: some View {
        Form {
            Section {
                Image(systemName: "point.3.connected.trianglepath.dotted").font(.system(size: 52)).foregroundStyle(.tint).frame(maxWidth: .infinity).padding()
                Text("Your Mac. Wherever you are.").font(.title2.bold())
                Text("Open Remote Access in Proteus on your Mac. Enable the relay, then create a one-time pairing code.").foregroundStyle(.secondary)
            }
            Section("Pair with your Mac") {
                Button("Scan pairing QR code", systemImage: "qrcode.viewfinder") { scan = true }
                TextField("Paste pairing link", text: $code, axis: .vertical).textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier("pairing-link")
                Button("Pair Mac") { pair() }.disabled(code.isEmpty).accessibilityIdentifier("pair-mac")
                ConnectionStatus()
            }
            Section { Text("The Mac keeps your repositories, provider logins, and execution. Your paired device receives encrypted chats and controls. For local testing, use the same network and keep the Mac awake.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("Proteus")
            .sheet(isPresented: $scan) { QRScanner { value in scan = false; code = value; pair() }.ignoresSafeArea().overlay(alignment: .topTrailing) { Button("Cancel") { scan = false }.padding().buttonStyle(.borderedProminent) } }
    }
    private func pair() { do { try store.pair(code) } catch { store.error = error.localizedDescription } }
}
struct ConnectionView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var forget = false
    var body: some View {
        Form {
            Section("Host") { ConnectionStatus(); LabeledContent("Mac", value: store.state["hostName"].string); Text(store.connection?.relay ?? "").textSelection(.enabled); Button("Reconnect") { store.disconnect(); store.activity(true) } }
            Section("Privacy") { Text("Device keys are stored in this device’s Keychain. Cached history is encrypted. Revoke this device from the Mac’s Remote Access screen to remove access.") }
            Section { Button("Forget this Mac", role: .destructive) { forget = true } }
            Section { Text("Closing the Mac window keeps its host running. Quitting Proteus or putting the Mac to sleep makes it unavailable. This local prototype reconnects when opened; push notifications are not configured.").font(.footnote) }
        }.navigationTitle("Connection").confirmationDialog("Forget this Mac and remove cached history?", isPresented: $forget) { Button("Forget Mac", role: .destructive) { store.forget() } }
    }
}
func statusLabel(_ value: String) -> String { ["awaiting_input": "Needs feedback", "completed": "Turn complete", "running": "Working", "queued": "Queued", "interrupted": "Interrupted", "failed": "Failed", "cancelled": "Cancelled"][value] ?? value }

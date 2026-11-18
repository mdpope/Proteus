import SwiftUI

/// Owner history stays in memory and is discarded when the Life account changes.
struct LifeAskView: View {
    @EnvironmentObject private var life: LifeStore
    @EnvironmentObject private var destinations: DestinationStore
    @State private var values: [String: JSON] = [:]
    @State private var failures: [String: String] = [:]
    @State private var busy = false
    @State private var generation = UUID()

    static func accepts(_ value: JSON, accountID: String, hostID: String) -> Bool {
        !accountID.isEmpty && value["accountID"].string == accountID && value["hostID"].string == hostID
    }

    var body: some View {
        List {
            Section {
                Text("Your pendant questions and answers. Open a chat to play its recording or continue with messages and attachments.")
                Button("Refresh") { Task { await load() } }.disabled(busy)
                if busy { ProgressView("Loading voice requests…") }
            }
            if destinations.destinations.isEmpty { Text("Pair your home computer in Connections to see Life Ask.") }
            ForEach(destinations.destinations) { computer in
                Section(computer.label) {
                    if let failure = failures[computer.id] { Text(failure).foregroundStyle(.secondary) }
                    if let value = values[computer.id] {
                        if !value["settings"]["enabled"].bool { Text("Life Ask is off. Enable it and pair Mnemosyne in the desktop app.").foregroundStyle(.secondary) }
                        if value["items"].array.isEmpty { Text("No voice requests for this account yet.").foregroundStyle(.secondary) }
                        ForEach(value["items"].array, id: \.self) { item in
                            Button {
                                guard Self.accepts(value, accountID: life.credential?.accountID ?? "", hostID: computer.id) else { return }
                                NativeNotifications.shared.route = .init(hostID: computer.id, chatID: item["chatId"].string, scheduleID: "", type: "life.answer")
                            } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(item["title"].string).font(.headline)
                                    if !item["summary"].string.isEmpty { Text(item["summary"].string).font(.subheadline).lineLimit(3) }
                                    Text(item["state"].string.replacingOccurrences(of: "-", with: " ") + (item["deliveryNeedsAttention"].bool ? " · delivery pending" : "")).font(.caption).foregroundStyle(.secondary)
                                }
                            }.disabled(item["chatId"].string.isEmpty).accessibilityIdentifier("life-ask-chat-" + item["requestId"].string)
                        }
                    }
                }
            }
        }
        .navigationTitle("Ask").nativeFeaturePage("Life")
        .task(id: life.accountIdentity) { values = [:]; failures = [:]; await load() }
        .refreshable { await load() }
        .onDisappear { generation = UUID(); values = [:]; failures = [:] }
    }

    private func load() async {
        let request = UUID(); generation = request; busy = true
        let account = life.accountIdentity, accountID = life.credential?.accountID ?? ""
        defer { if generation == request { busy = false } }
        for computer in destinations.destinations {
            guard !Task.isCancelled, generation == request, life.accountIdentity == account else { return }
            guard let remote = destinations.remote(for: computer.id), remote.connected else {
                values.removeValue(forKey: computer.id); failures[computer.id] = "Connect this computer, then refresh."; continue
            }
            do {
                let value = try await remote.request("life.ask.view")
                guard !Task.isCancelled, generation == request, life.accountIdentity == account else { return }
                guard Self.accepts(value, accountID: accountID, hostID: computer.id) else { throw RemoteError(message: "This computer is signed in to a different Life account.") }
                values[computer.id] = value; failures.removeValue(forKey: computer.id)
            } catch {
                guard generation == request, life.accountIdentity == account else { return }
                values.removeValue(forKey: computer.id); failures[computer.id] = "Ask is unavailable. Check this computer’s Life account and update, then refresh."
            }
        }
    }
}

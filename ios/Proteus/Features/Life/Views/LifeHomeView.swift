import SwiftUI

/// Native API commands run on the paired owner; no Home Assistant credential
/// crosses the relay or becomes a phone-side browser credential.
struct LifeHomeView: View {
    var openDashboard: ((URL) -> Void)? = nil
    @EnvironmentObject private var life: LifeStore
    @EnvironmentObject private var destinations: DestinationStore
    @EnvironmentObject private var shared: SharedAppStore
    @State private var values: [String: JSON] = [:]
    @State private var errors: [String: String] = [:]
    @State private var busy = false
    @State private var generation = UUID()
    @State private var pending: [String: [String: JSON]] = [:]
    @State private var search = ""
    @State private var serviceHost = ""
    @State private var selectedService = ""
    @State private var targetIDs = ""
    @State private var parameters = "{}"
    @State private var showService = false

    var body: some View {
        List {
            Section {
                Text("Control any device or service exposed by Home Assistant. New devices are discovered when you refresh or make a Life Ask request.")
                TextField("Search devices", text: $search).textInputAutocapitalization(.never).autocorrectionDisabled()
                Button("Refresh devices") { Task { await load() } }.disabled(busy)
                if busy { ProgressView() }
            }
            ForEach(destinations.destinations) { computer in
                Section(computer.label) {
                    if let error = errors[computer.id] { Text(error).foregroundStyle(.secondary) }
                    if pending[computer.id] != nil {
                        Text("Check the previous command in Home Assistant before starting a different command.").font(.callout)
                        Button("I checked the device; allow a new command") { pending.removeValue(forKey: computer.id) }.disabled(busy)
                    }
                    if let value = values[computer.id] {
                        if !value["configured"].bool { Text("Connect Home Assistant in Life → Smart Home on this desktop first.") }
                        if let url = URL(string: value["origin"].string), ["http", "https"].contains(url.scheme ?? ""), url.user == nil, url.password == nil {
                            Button("Open Home Assistant") { if let openDashboard { openDashboard(url) } else { shared.open(url, title: "Home Assistant", scope: "main") } }
                        }
                        Button("Run a Home Assistant service") { serviceHost = computer.id; selectedService = ""; targetIDs = ""; parameters = "{}"; showService = true }
                        ForEach(value["entities"].array.filter { search.isEmpty || ($0["name"].string + " " + $0["id"].string).localizedCaseInsensitiveContains(search) }, id: \.self) { entity in
                            VStack(alignment: .leading) {
                                Text(entity["name"].string).font(.headline)
                                Text(entity["state"].string).foregroundStyle(.secondary)
                                HStack {
                                    ForEach(["turn_on", "turn_off"], id: \.self) { service in
                                        if value["services"].array.contains(where: { $0["domain"] == entity["domain"] && $0["service"].string == service }) {
                                            Button(service == "turn_on" ? "On" : "Off") { Task { await command(computer.id, entities: [entity["id"].string], domain: entity["domain"].string, service: service) } }
                                        }
                                    }
                                    Button("Control") { serviceHost = computer.id; targetIDs = entity["id"].string; parameters = "{}"; selectedService = ""; showService = true }
                                }.buttonStyle(.bordered).disabled(busy)
                            }
                        }
                    }
                }
            }
        }.scrollContentBackground(.hidden).background(NativeTheme.background)
            .sheet(isPresented: $showService) { serviceEditor }
            .task(id: life.accountIdentity) { values = [:]; errors = [:]; pending = [:]; await load() }
            .onDisappear { generation = UUID(); values = [:]; errors = [:] }
    }
    private func load() async {
        let request = UUID(), account = life.accountIdentity, accountID = life.credential?.accountID ?? ""
        generation = request; busy = true
        defer { if generation == request { busy = false } }
        for computer in destinations.destinations {
            guard generation == request, life.accountIdentity == account else { return }
            do {
                guard let remote = destinations.remote(for: computer.id), remote.connected else { throw RemoteError(message: "Connect this computer, then refresh.") }
                let value = try await remote.request("life.home.view", ["refresh": .bool(true), "accountId": .string(accountID)])
                guard generation == request, life.accountIdentity == account else { return }
                guard value["accountId"].string == accountID else { throw RemoteError(message: "This computer is signed in to another Life account.") }
                values[computer.id] = value; errors.removeValue(forKey: computer.id)
            } catch {
                guard generation == request, life.accountIdentity == account else { return }
                values.removeValue(forKey: computer.id); errors[computer.id] = error.localizedDescription
            }
        }
    }
    private var serviceEditor: some View {
        NavigationStack {
            NativeForm {
                Section("Service") {
                    Picker("Home Assistant service", selection: $selectedService) {
                        Text("Choose a service").tag("")
                        ForEach(values[serviceHost]?["services"].array ?? [], id: \.self) { service in
                            Text(service["domain"].string + "." + service["service"].string).tag(service["domain"].string + "." + service["service"].string)
                        }
                    }
                    TextField("Target entity IDs, separated by commas", text: $targetIDs).textInputAutocapitalization(.never).autocorrectionDisabled()
                    if let service = values[serviceHost]?["services"].array.first(where: { $0["domain"].string + "." + $0["service"].string == selectedService }) {
                        Text(service["description"].string).foregroundStyle(.secondary)
                        ForEach(service["fields"].array, id: \.self) { field in
                            Text(field["name"].string + (field["required"].bool ? " (required): " : ": ") + field["description"].string).font(.caption)
                        }
                    }
                }
                Section("Service parameters (JSON)") {
                    TextEditor(text: $parameters).font(.system(.body, design: .monospaced)).frame(minHeight: 120).textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                if let error = errors[serviceHost] { Section { Text(error) } }
                Button("Run service") { Task {
                    do {
                        let parts = selectedService.split(separator: ".")
                        guard parts.count == 2 else { throw RemoteError(message: "Choose a service.") }
                        let data = try JSONDecoder().decode(JSON.self, from: Data(parameters.utf8))
                        guard case .object = data else { throw RemoteError(message: "Service parameters must be a JSON object.") }
                        await command(serviceHost, entities: targetIDs.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }, domain: String(parts[0]), service: String(parts[1]), data: data)
                    } catch { errors[serviceHost] = error.localizedDescription }
                }}.disabled(busy || selectedService.isEmpty)
            }.navigationTitle("Home Assistant service")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { showService = false } } }
        }
    }
    private func command(_ host: String, entities: [String], domain: String, service: String, data: JSON = .object([:])) async {
        guard !busy, let value = values[host], value["accountId"].string == life.credential?.accountID, let remote = destinations.remote(for: host), remote.connected else { return }
        let account = life.accountIdentity; busy = true
        defer { busy = false }
        do {
            let targets = JSON.array(entities.map(JSON.string))
            if let existing = pending[host], existing["entityIds"] != targets || existing["domain"] != .string(domain) || existing["service"] != .string(service) || existing["data"] != data { throw RemoteError(message: "Check the previous device command before starting another.") }
            let args = pending[host] ?? ["accountId": value["accountId"], "expectedRevision": value["revision"], "entityIds": targets, "domain": .string(domain), "service": .string(service), "data": data, "operationId": .string(UUID().uuidString.lowercased())]
            pending[host] = args
            let result = try await remote.request("life.home.execute", args)
            guard life.accountIdentity == account else { return }
            pending.removeValue(forKey: host); await load(); errors[host] = result["answer"].string
        } catch { if life.accountIdentity == account { errors[host] = error.localizedDescription } }
    }
}

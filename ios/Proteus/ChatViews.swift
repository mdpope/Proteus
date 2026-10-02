import SwiftUI

struct ChatsView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var path: [String] = []
    @State private var newChat = false
    @State private var query = ""
    var body: some View {
        NavigationStack(path: $path) {
            List {
                if store.state["runs"].array.isEmpty { ContentUnavailableView("Ready for your next idea", systemImage: "bubble.left.and.bubble.right", description: Text("Start a chat using your Mac’s workspace and tools.")) }
                ForEach(store.state["runs"].array.filter { query.isEmpty || $0["title"].string.localizedCaseInsensitiveContains(query) }, id: \.self) { run in
                    NavigationLink(value: run["id"].string) { VStack(alignment: .leading, spacing: 6) { Text(run["title"].string).font(.headline); Text(statusLabel(run["status"].string)).font(.caption).foregroundStyle(run["status"].string == "awaiting_input" ? Color.orange : Color.secondary) } }.padding(.vertical, 5)
                }
                if store.state["runs"].array.count < store.state["runCount"].int { Button("Load older chats") { Task { await store.loadMoreRuns() } }.disabled(!store.connected) }
            }.navigationTitle("Chats").searchable(text: $query)
                .safeAreaInset(edge: .bottom) { ConnectionStatus().padding().background(.bar) }
                .refreshable { await store.refresh() }
                .toolbar { Button("New chat", systemImage: "square.and.pencil") { newChat = true }.disabled(!store.connected).accessibilityIdentifier("new-chat") }
                .navigationDestination(for: String.self) { ChatView(id: $0) }
                .sheet(isPresented: $newChat) { NewChatView { id in newChat = false; path.append(id) } }
        }
    }
}
struct NewChatView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.dismiss) private var dismiss
    var onStarted: (String) -> Void
    @State private var name = ""
    @State private var prompt = ""
    @State private var provider = "copilot"
    @State private var model = ""
    @State private var workspace = ""
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var sending = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Conversation") { TextField("Title (optional)", text: $name); TextField("What would you like to work on?", text: $prompt, axis: .vertical).lineLimit(4...10).accessibilityIdentifier("chat-prompt") }
                Section("Run on your Mac") {
                    Picker("Workspace", selection: $workspace) { ForEach(store.state["context"]["workspaces"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                    Picker("Provider", selection: $provider) { Text("GitHub Copilot").tag("copilot"); Text("Local rehearsal").tag("rehearsal") }.accessibilityIdentifier("chat-provider")
                    if provider == "copilot" {
                        Picker("Model", selection: $model) { Text("Choose model").tag(""); if !model.isEmpty && !store.models.contains(where: { $0["id"].string == model }) { Text(model).tag(model) }; ForEach(store.models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : $0["name"].string).tag($0["id"].string) } }
                        Button("Refresh available models") { Task { await store.loadModels() } }
                    }
                }
                ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspaceID: workspace)
            }.navigationTitle("New chat").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button { start() } label: { if sending { ProgressView() } else { Text("Start chat") } }.disabled(sending || !store.connected || prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || workspace.isEmpty || (provider == "copilot" && model.isEmpty)).accessibilityIdentifier("start-chat") }
            }.task { workspace = store.state["context"]["defaultWorkspaceId"].string; provider = store.state["defaults"]["provider"].string; model = store.state["defaults"]["model"].string; if provider == "copilot" { await store.loadModels() } }
        }
    }
    private func start() {
        sending = true
        Task { defer { sending = false }
            do {
                var ids = selected; if !agent.isEmpty { ids.insert(agent) }
                let result = try await store.request("chat.start", ["name": .string(name.isEmpty ? String(prompt.prefix(64)) : name), "prompt": .string(prompt), "provider": .string(provider), "model": .string(provider == "copilot" ? model : ""), "workspaceId": .string(workspace), "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)])
                await store.refresh(); onStarted(result["runId"].string)
            } catch { store.error = error.localizedDescription }
        }
    }
}
struct ChatView: View {
    @EnvironmentObject var store: RemoteStore
    let id: String
    @State private var text = ""
    @State private var busy = false
    @State private var context = false
    @State private var followLatest = true
    @FocusState private var composerFocused: Bool
    private var run: JSON { store.chats[id] ?? .null }
    private var mainAgentName: String { run["agentName"].string.isEmpty ? "Proteus" : run["agentName"].string }
    private var pending: JSON { run["pending"] }
    private var active: Bool { ["running", "queued", "awaiting_input"].contains(run["status"].string) }
    var body: some View {
        ScrollViewReader { proxy in
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                HStack { if run["status"].string == "running" { ProgressView() }; Text(statusLabel(run["status"].string)).font(.subheadline).foregroundStyle(.secondary); Spacer(); if active { Button("Stop", role: .destructive) { act("chat.cancel", [:]) }.disabled(busy || !store.connected) } }
                if run["earlier"].int > 0 { Button("Load earlier messages") { loadEarlier() } }
                ForEach(Array(run["events"].array.enumerated()), id: \.offset) { _, event in MessageView(role: event["role"].string == "assistant" ? (event["agentName"].string.isEmpty ? mainAgentName : event["agentName"].string) : event["role"].string, text: event["text"].string, runID: id) { if followLatest { Task { @MainActor in await Task.yield(); proxy.scrollTo("chat-end", anchor: .bottom) } } } }
                ForEach(run["liveMessages"].object.keys.sorted(), id: \.self) { key in MessageView(role: "\(mainAgentName) · streaming", text: run["liveMessages"][key].string, runID: id) { if followLatest { Task { @MainActor in await Task.yield(); proxy.scrollTo("chat-end", anchor: .bottom) } } } }
                if pending != .null {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Your input is needed", systemImage: "person.crop.circle.badge.questionmark").font(.headline)
                        Text(pending["question"].string)
                        if pending["details"] != .null { DisclosureGroup("Request details") { Text(pending["details"].pretty).font(.caption.monospaced()).textSelection(.enabled) } }
                        if pending["type"].string == "permission" {
                            HStack { Button("Deny", role: .destructive) { answer("deny") }; Button("Approve once") { answer("approve") }.buttonStyle(.borderedProminent) }
                            ForEach(pending["permissionChoices"].array, id: \.self) { choice in Button(choice["label"].string) { answer(choice["value"].string) } }
                        }
                    }.padding().background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 16)).disabled(busy || !store.connected)
                }
                DisclosureGroup("Chat details & loaded context") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(run["schedule"]["workspace"]["cwd"].string).font(.caption.monospaced()).textSelection(.enabled)
                        Text("Model: \(run["schedule"]["model"].string)").font(.caption)
                        if !run["nativeSessionPath"].string.isEmpty { Text(run["nativeSessionPath"].string).font(.caption.monospaced()).textSelection(.enabled) }
                        ForEach(run["context"]["entries"].array, id: \.self) { entry in Text("\(entry["kind"].string): \(entry["name"].string)").font(.caption) }
                        Button("Change context for next turn") { context = true }.disabled(active || !store.connected)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                Color.clear.frame(height: 1).id("chat-end").onAppear { followLatest = true }.onDisappear { followLatest = false }
            }.padding()
        }.scrollDismissesKeyboard(.interactively)
            .onChange(of: run["events"].array.count) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
            .onChange(of: run["liveMessages"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
        }.navigationTitle(run["title"].string.isEmpty ? "Conversation" : run["title"].string).navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 8) {
                    ConnectionStatus()
                    if pending["type"].string != "permission" {
                        HStack(alignment: .bottom) {
                            TextField(pending != .null ? "Add your feedback…" : "Continue this conversation…", text: $text, axis: .vertical).lineLimit(1...6).textFieldStyle(.roundedBorder).accessibilityIdentifier("reply-text").focused($composerFocused)
                            Button { if pending != .null { answer(text) } else { act("chat.resume", ["prompt": .string(text)]) } } label: { Image(systemName: "arrow.up.circle.fill").font(.title) }.disabled(busy || !store.connected || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || (active && pending == .null)).accessibilityLabel("Send message")
                        }
                    }
                }.padding().background(.bar)
            }.task(id: id) { await store.openChat(id) }
            .sheet(isPresented: $context) { ChatContextView(run: run) }
    }
    private func answer(_ value: String) { act("chat.reply", ["answer": .string(value), "requestId": pending["id"]]) }
    private func act(_ method: String, _ values: [String: JSON]) {
        busy = true
        Task { defer { busy = false }; do { var args = values; args["id"] = .string(id); _ = try await store.request(method, args); text = ""; composerFocused = false; followLatest = true; await store.openChat(id) } catch { store.error = error.localizedDescription } }
    }
    private func loadEarlier() { followLatest = false; Task { do { let value = try await store.request("chat.get", ["id": .string(id), "offset": .number(Double(run["events"].array.count))]); store.mergeChat(value) } catch { store.error = error.localizedDescription } } }
}
struct MessageView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var height: CGFloat = 0
    let role: String
    let text: String
    let runID: String
    var onResize: () -> Void = {}
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(role.uppercased()).font(.caption2.weight(.bold)).foregroundStyle(.secondary)
            ZStack(alignment: .topLeading) {
                if height == 0 { Text(text).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }
                MarkdownView(text: text, runID: runID, store: store, height: $height, onResize: onResize).frame(height: max(height, 1)).opacity(height > 0 ? 1 : 0)
            }.frame(maxWidth: .infinity, alignment: .leading)
        }.padding().background(role == "user" ? Color.accentColor.opacity(0.13) : Color.secondary.opacity(0.09), in: RoundedRectangle(cornerRadius: 16))
    }
}

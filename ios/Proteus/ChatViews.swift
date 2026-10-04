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
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @State private var workspace = ""
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var sending = false
    @State private var loading = true
    var body: some View {
        NavigationStack {
            Form {
                Section("Conversation") { TextField("Title (optional)", text: $name); TextField("What would you like to work on?", text: $prompt, axis: .vertical).lineLimit(4...10).accessibilityIdentifier("chat-prompt") }
                Section("Run on your Mac") {
                    Picker("Workspace", selection: $workspace) { ForEach(store.state["context"]["workspaces"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                    Picker("Provider", selection: $provider) { Text("GitHub Copilot").tag("copilot"); Text("Codex").tag("codex"); Text("Claude").tag("claude"); Text("Local rehearsal").tag("rehearsal") }.accessibilityIdentifier("chat-provider")
                    if provider != "rehearsal" {
                        ProviderModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: provider)
                    }
                }
                ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspaceID: workspace)
            }.scrollDismissesKeyboard(.interactively).disabled(loading).accessibilityIdentifier("new-chat-form").navigationTitle("New chat").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button { start() } label: { if sending { ProgressView() } else { Text("Start chat") } }.disabled(loading || sending || !store.connected || prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || workspace.isEmpty || (provider != "rehearsal" && model.isEmpty)).accessibilityIdentifier("start-chat") }
            }.onChange(of: draftValue) { _, value in if !loading { store.setDraft("new-chat", value) } }.onChange(of: provider) { old, value in if !loading && old != value { model = ""; effort = ""; contextTier = "default"; serviceTier = "" }; if value != "rehearsal" { Task { await store.loadModels(provider: value) } } }.task { await store.refresh(); workspace = store.state["context"]["defaultWorkspaceId"].string; provider = store.state["defaults"]["provider"].string; model = store.state["defaults"]["model"].string; effort = store.state["defaults"]["reasoningEffort"].string; serviceTier = store.state["defaults"]["serviceTier"].string; contextTier = store.state["defaults"]["contextTier"].string.isEmpty ? "default" : store.state["defaults"]["contextTier"].string; if let saved = store.drafts["new-chat"] { restore(saved) }; if provider != "rehearsal" { await store.loadModels(provider: provider) }; loading = false }
        }
    }
    private var draftValue: JSON { .object(["name": .string(name), "prompt": .string(prompt), "provider": .string(provider), "model": .string(model), "effort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "workspace": .string(workspace), "selected": .array(selected.sorted().map(JSON.string)), "agent": .string(agent), "includeDefaults": .bool(includeDefaults)]) }
    private func restore(_ value: JSON) { name = value["name"].string; prompt = value["prompt"].string; provider = value["provider"].string; model = value["model"].string; effort = value["effort"].string; contextTier = value["contextTier"].string; serviceTier = value["serviceTier"].string; workspace = value["workspace"].string; selected = Set(value["selected"].array.map(\.string)); agent = value["agent"].string; includeDefaults = value["includeDefaults"] != .bool(false) }
    private func start() {
        sending = true
        Task { defer { sending = false }
            do {
                var ids = selected; if !agent.isEmpty { ids.insert(agent) }
                let result = try await store.request("chat.start", ["name": .string(name.isEmpty ? String(prompt.prefix(64)) : name), "prompt": .string(prompt), "provider": .string(provider), "model": .string(provider != "rehearsal" ? model : ""), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "workspaceId": .string(workspace), "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)])
                store.setDraft("new-chat", .null); await store.refresh(); onStarted(result["runId"].string)
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
    @State private var model = ""
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @FocusState private var composerFocused: Bool
    private var run: JSON { store.chats[id] ?? .null }
    private var mainAgentName: String { run["agentName"].string.isEmpty ? "Proteus" : run["agentName"].string }
    private var pending: JSON { run["pending"] }
    private var nativeRun: Bool { run["schedule"]["provider"].string == "local-process" }
    private var active: Bool { ["running", "queued", "awaiting_input"].contains(run["status"].string) }
    var body: some View {
        ScrollViewReader { proxy in
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                HStack { if run["status"].string == "running" { ProgressView() }; Text(statusLabel(run["status"].string)).font(.subheadline).foregroundStyle(.secondary); Spacer() }
                if run["earlier"].int > 0 { Button("Load earlier messages") { loadEarlier() } }
                ForEach(Array(run["events"].array.enumerated()).filter { ($0.element["role"].string != "assistant" || !$0.element["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) && !$0.element["data"]["permission"]["automatic"].bool }, id: \.offset) { _, event in
                    if event["data"]["tool"] != .null { ToolActivityView(tool: event["data"]["tool"]) }
                    else { if !event["data"]["delivery"]["state"].string.isEmpty { Text(event["data"]["delivery"]["state"].string.capitalized).font(.caption2).foregroundStyle(.teal) }; MessageView(role: event["role"].string == "assistant" ? (event["agentName"].string.isEmpty ? mainAgentName : event["agentName"].string) : event["role"].string, text: event["text"].string, runID: id) { if followLatest { Task { @MainActor in await Task.yield(); proxy.scrollTo("chat-end", anchor: .bottom) } } } } }
                ForEach(run["liveMessages"].object.keys.sorted(), id: \.self) { key in MessageView(role: "\(mainAgentName) · streaming", text: run["liveMessages"][key].string, runID: id) { if followLatest { Task { @MainActor in await Task.yield(); proxy.scrollTo("chat-end", anchor: .bottom) } } } }
                if pending != .null {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Your input is needed", systemImage: "person.crop.circle.badge.questionmark").font(.headline)
                        Text(pending["question"].string)
                        if pending["details"] != .null { PermissionRequestSummary(request: pending["details"]); DisclosureGroup("Request details") { Text(pending["details"].pretty).font(.caption.monospaced()).textSelection(.enabled) } }
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
                        Text("Thinking effort: \(run["schedule"]["reasoningEffort"].string.isEmpty ? "Provider default" : run["schedule"]["reasoningEffort"].string) · Context: \(run["schedule"]["contextTier"].string.isEmpty ? "default" : run["schedule"]["contextTier"].string)").font(.caption)
                        Text("Speed: \(run["schedule"]["serviceTier"].string.isEmpty ? "Provider default" : run["schedule"]["serviceTier"].string)").font(.caption)
                        if run["contextUsage"]["modelContextWindow"].int > 0 { Text("Runtime context window: \(modelTokenSize(run["contextUsage"]["modelContextWindow"])) tokens").font(.caption) }
                        ChatPermissionsView(run: run)
                        if run["schedule"]["provider"].string == "copilot" { DisclosureGroup("MCP connections") { MCPConnectionsView(runID: id) } }
                        if !run["nativeSessionPath"].string.isEmpty { Text(run["nativeSessionPath"].string).font(.caption.monospaced()).textSelection(.enabled) }
                        ForEach(run["context"]["entries"].array, id: \.self) { entry in Text("\(entry["kind"].string): \(entry["name"].string)").font(.caption) }
                        Button("Change context for next turn") { context = true }.disabled(active || !store.connected)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                Color.clear.frame(height: 1).id("chat-end").onAppear { followLatest = true }.onDisappear { followLatest = false }
            }.padding()
        }.scrollDismissesKeyboard(.interactively)
            .onChange(of: run["events"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
            .onChange(of: run["liveMessages"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
        }.navigationTitle(run["title"].string.isEmpty ? "Conversation" : run["title"].string).navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) { if nativeRun { VStack { Text("Native Omi processing · outcomes are recorded by the worker.").font(.caption); if active { Button("Stop process", role: .destructive) { act("chat.cancel", [:]) } } }.padding().background(.bar) } else { composer } }
            .onChange(of: text) { _, value in store.setDraft("reply:" + id, value.isEmpty ? .null : .string(value)) }
            .task(id: id) {
                text = store.draft("reply:" + id).string
                await store.openChat(id)
                let options = run["nextModelOptions"] == .null ? run["schedule"] : run["nextModelOptions"]
                model = options["model"].string; effort = options["reasoningEffort"].string
                contextTier = options["contextTier"].string.isEmpty ? "default" : options["contextTier"].string; serviceTier = options["serviceTier"].string
                if !["rehearsal", "local-process"].contains(run["schedule"]["provider"].string) { await store.loadModels(provider: run["schedule"]["provider"].string) }
            }
            .sheet(isPresented: $context) { ChatContextView(run: run) }
    }
    private var composer: some View {
        VStack(spacing: 8) {
            ConnectionStatus()
            ForEach(run["queuedMessages"].array, id: \.self) { message in
                HStack { Text(message["prompt"].string).lineLimit(1).font(.caption); Spacer(); Button("Remove") { act("chat.remove-queued", ["messageId":message["id"]]) }.font(.caption) }
            }
            VStack(alignment: .leading, spacing: 8) {
                TextField(pending["type"].string == "question" ? "Add your feedback…" : active ? "Add an update while this runs…" : "Continue this conversation…", text: $text, axis: .vertical).lineLimit(1...6).padding(.horizontal, 4).accessibilityIdentifier("reply-text").focused($composerFocused)
                if run["schedule"]["provider"].string != "rehearsal" {
                    ComposerModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: run["schedule"]["provider"].string)
                }
                HStack(spacing: 12) {
                    Spacer()
                    if pending["type"].string == "question" { Button("Send feedback") { answer(text) }.disabled(cannotSend) }
                    if active {
                        Button("Steer") { send("steer") }.disabled(cannotSend || run["status"].string != "running").accessibilityIdentifier("steer-message")
                    }
                    Button(active ? "Queue" : "Send") { send("queue") }.buttonStyle(.borderedProminent).controlSize(.small).disabled(cannotSend).accessibilityLabel(active ? "Queue message" : "Send message").accessibilityIdentifier("send-message")
                    if ["running", "awaiting_input"].contains(run["status"].string) {
                        Button("Stop", role: .destructive) { act("chat.cancel", [:]) }.disabled(busy || !store.connected).accessibilityIdentifier("stop-turn")
                    }
                }.font(.subheadline)
            }.padding(12).background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
        }.padding(.horizontal).padding(.vertical, 8).background(.bar)
    }
    private var cannotSend: Bool { busy || !store.connected || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    private func send(_ mode: String) {
        var values: [String: JSON] = ["prompt": .string(text), "mode": .string(mode), "messageId": .string(UUID().uuidString)]
        if mode == "queue" && run["schedule"]["provider"].string != "rehearsal" {
            values["modelOptions"] = .object(["model": .string(model), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier)])
        }
        act("chat.send", values)
    }
    private func answer(_ value: String) { act("chat.reply", ["answer": .string(value), "requestId": pending["id"]]) }
    private func act(_ method: String, _ values: [String: JSON]) {
        busy = true
        Task { defer { busy = false }; do { var args = values; args["id"] = .string(id); _ = try await store.request(method, args); if method != "chat.remove-queued" && method != "chat.cancel" { text = ""; composerFocused = false; followLatest = true }; await store.openChat(id) } catch { store.error = error.localizedDescription } }
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

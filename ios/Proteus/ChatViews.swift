import SwiftUI
import AVFoundation

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
    @Environment(\.scenePhase) private var scenePhase
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
                if !store.connected { Label("Offline · cached history", systemImage: "icloud.slash").font(.caption).foregroundStyle(.secondary) }
                if run["earlier"].int > 0 { Button("Load earlier messages") { loadEarlier() } }
                ForEach(Array(run["events"].array.enumerated()).filter { ($0.element["role"].string != "assistant" || !$0.element["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) && !$0.element["data"]["permission"]["automatic"].bool }, id: \.offset) { index, event in
                    if event["data"]["tool"] != .null { ToolActivityView(tool: event["data"]["tool"]) }
                    else { if !event["data"]["delivery"]["state"].string.isEmpty { Text(event["data"]["delivery"]["state"].string.capitalized).font(.caption2).foregroundStyle(.teal) }; MessageView(role: event["role"].string == "assistant" ? (event["agentName"].string.isEmpty ? mainAgentName : event["agentName"].string) : event["role"].string, text: event["text"].string, runID: id, timestamp: event["timestamp"].string.isEmpty ? event["at"].string : event["timestamp"].string, actionID: MessageActions.eligible(event) ? "\(store.connection?.hostId ?? "local"):\(id):\(run["eventStart"].int + index):\(event["at"].string)" : nil) { if followLatest { Task { @MainActor in await Task.yield(); proxy.scrollTo("chat-end", anchor: .bottom) } } } } }
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
            .alert("Proteus", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }
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
            .onDisappear { MessageSpeech.shared.stop() }
            .onChange(of: id) { _, _ in MessageSpeech.shared.stop() }
            .onChange(of: store.connection?.hostId) { _, _ in MessageSpeech.shared.stop() }
            .onChange(of: scenePhase) { _, phase in if phase != .active { MessageSpeech.shared.stop() } }
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
    @Environment(\.timeZone) private var timeZone
    @State private var height: CGFloat = 0
    let role: String
    let text: String
    let runID: String
    var timestamp: String = ""
    var actionID: String? = nil
    var onResize: () -> Void = {}
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text(role.uppercased()).font(.caption2.weight(.bold)); Spacer(); if let date = ProviderAllowance.date(timestamp) { Text(nativeTimestamp(date, timezone: timeZone.identifier)).font(.caption2).accessibilityIdentifier("message-timestamp") } }.foregroundStyle(.secondary)
            ZStack(alignment: .topLeading) {
                if height == 0 { Text(text).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }
                MarkdownView(text: text, runID: runID, store: store, height: $height, onResize: onResize).frame(height: max(height, 1)).opacity(height > 0 ? 1 : 0)
            }.frame(maxWidth: .infinity, alignment: .leading)
            if let actionID { MessageActionBar(messageID: actionID, markdown: text) }
        }.padding().background(role == "user" ? Color.accentColor.opacity(0.13) : Color.secondary.opacity(0.09), in: RoundedRectangle(cornerRadius: 16))
    }
}

func nativeTimestamp(_ date: Date, timezone: String = "") -> String {
    let formatter = DateFormatter(); formatter.dateFormat = "MMM d, h:mm a z"; formatter.timeZone = TimeZone(identifier: timezone) ?? .current
    return formatter.string(from: date)
}

#if DEBUG
/// A rendered-message fixture verifies the environment dependency, including a timezone change.
struct MessageTimezoneFixture: View {
    @StateObject private var remote = RemoteStore(connection: nil, legacyCredentials: false)
    @StateObject private var shared = SharedAppStore()
    @State private var timezone = "America/Denver"
    var body: some View {
        VStack {
            MessageView(role: "user", text: "Synthetic timezone message", runID: "timezone-fixture", timestamp: "2026-10-04T18:00:00Z")
                .environmentObject(remote).environmentObject(shared)
                .environment(\.timeZone, TimeZone(identifier: timezone)!)
            Button("Use Tokyo device timezone") { timezone = "Asia/Tokyo" }
        }.padding().onAppear {
            shared.snapshot = .object(["preferences": .object(["timezone": .string("UTC")])])
        }
    }
}
#endif

/// Persisted assistant events are complete messages. Streams, tools and reasoning never get actions.
enum MessageActions {
    static func eligible(_ event: JSON) -> Bool {
        guard event["role"].string == "assistant", !event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        let data = event["data"]
        guard data["tool"] == .null, data["permission"] == .null else { return false }
        for value in [event, data] {
            if ["partial", "streaming", "reasoning", "thinking"].contains(where: { value[$0] != .null && value[$0] != .bool(false) && value[$0] != .string("") }) { return false }
            if ["type", "kind", "channel", "phase"].contains(where: { ["reasoning", "thinking", "analysis", "tool", "delta", "partial", "streaming"].contains(value[$0].string.lowercased()) }) { return false }
            if ["partial", "streaming", "in_progress"].contains(value["status"].string.lowercased()) { return false }
        }
        return true
    }
    @MainActor static func copy(_ markdown: String) { UIPasteboard.general.string = markdown }
}

struct MessageActionBar: View {
    let messageID: String
    let markdown: String
    @ObservedObject private var speech = MessageSpeech.shared
    @State private var copied = false
    @State private var copyReset: Task<Void, Never>?
    @State private var scrubbing = false
    @State private var position = 0.0
    private var speaking: Bool { speech.messageID == messageID }
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 4) {
            Button {
                MessageActions.copy(markdown); copied = true; copyReset?.cancel()
                copyReset = Task { try? await Task.sleep(for: .seconds(2)); if !Task.isCancelled { copied = false } }
            } label: { Image(systemName: copied ? "checkmark" : "doc.on.doc").frame(width: 36, height: 36).contentShape(Rectangle()) }
                .accessibilityLabel(copied ? "Message copied" : "Copy message").accessibilityIdentifier("copy-message")
            Button { speech.toggle(messageID: messageID, markdown: markdown) } label: { Image(systemName: speaking ? "stop.fill" : "speaker.wave.2").frame(width: 36, height: 36).contentShape(Rectangle()) }
                .accessibilityLabel(speaking ? "Stop reading aloud" : "Read aloud").accessibilityIdentifier("read-aloud")
                .accessibilityHint(speaking ? "Stops this message." : "Reads this completed message using the device voice.")
            if copied { Text("Copied").font(.caption).accessibilityHidden(true) }
            if speech.failedMessageID == messageID { Text(speech.error ?? "Read aloud is unavailable.").font(.caption).foregroundStyle(.secondary) }
        }.buttonStyle(.borderless).foregroundStyle(.secondary)
        if speaking {
            HStack(spacing: 10) {
                Button { speech.togglePause() } label: { Image(systemName: speech.isPaused ? "play.fill" : "pause.fill").frame(width: 36, height: 36).contentShape(Rectangle()) }
                    .accessibilityLabel(speech.isPaused ? "Resume reading aloud" : "Pause reading aloud").accessibilityIdentifier("pause-reading")
                Slider(value: $position, in: 0...1) { Text("Reading position") } onEditingChanged: { editing in
                    scrubbing = editing
                    if !editing { speech.seek(to: position) }
                }.accessibilityLabel("Reading position").accessibilityValue("\(Int(position * 100)) percent").accessibilityIdentifier("reading-position")
                Text("\(Int(position * 100))%").font(.caption.monospacedDigit()).frame(minWidth: 35).accessibilityHidden(true)
            }.buttonStyle(.borderless).foregroundStyle(.secondary)
        }
        }.onChange(of: speech.progress) { _, value in if !scrubbing { position = value } }
            .onChange(of: speaking) { _, _ in position = speech.progress; scrubbing = false }
            .onDisappear { copyReset?.cancel(); copied = false }
            .onChange(of: messageID) { _, _ in copyReset?.cancel(); copied = false }
            .onChange(of: markdown) { _, _ in copyReset?.cancel(); copied = false; if speaking { speech.stop() } }
    }
}

/// Preserve code content and table cells while removing presentation-only Markdown.
enum SpokenMarkdown {
    static func text(_ markdown: String) -> String {
        let lines = markdown.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").components(separatedBy: "\n")
        var result: [String] = []; var fence: Character?; var fenceLength = 0
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if let marker = fence {
                if trimmed.first == marker && trimmed.prefix(while: { $0 == marker }).count >= fenceLength && trimmed.allSatisfy({ $0 == marker || $0.isWhitespace }) { fence = nil }
                else { result.append(line) }
                continue
            }
            if let marker = trimmed.first, marker == "`" || marker == "~", trimmed.prefix(while: { $0 == marker }).count >= 3 {
                fence = marker; fenceLength = trimmed.prefix(while: { $0 == marker }).count; continue
            }
            if line.hasPrefix("    ") || line.hasPrefix("\t") { result.append(String(line.dropFirst(line.hasPrefix("\t") ? 1 : 4))); continue }
            if matches(trimmed, #"^(?:\|?\s*:?-{3,}:?\s*)+(?:\|\s*:?-{3,}:?\s*)+\|?$"#) || matches(trimmed, #"^(?:[-*_]\s*){3,}$"#) || matches(trimmed, #"^=+$"#) { continue }
            var content = replace(line, #"^\s{0,3}(?:>\s*)+"#, "")
            content = replace(content, #"^\s{0,3}#{1,6}\s+|\s+#+\s*$"#, "")
            content = replace(content, #"^\s*(?:[-+*]|[0-9]+[.)])\s+(?:\[[ xX]\]\s*)?"#, "")
            if matches(content, #"^\s*\[[^]]+\]:\s+\S+"#) { continue }
            let cells = tableCells(content)
            if cells.count > 1 { result.append(cells.map(inline).joined(separator: "; ")) }
            else { result.append(inline(content)) }
        }
        return replace(result.joined(separator: "\n"), #"\n{3,}"#, "\n\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    private static func inline(_ text: String) -> String {
        return (try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))).map { String($0.characters) } ?? text
    }
    private static func tableCells(_ line: String) -> [String] {
        // A pipe inside inline code is meaningful code, not a table cell boundary.
        var cells: [String] = []; var current = ""; var ticks = false; var escaped = false
        for char in line {
            if char == "`" && !escaped { ticks.toggle() }
            if char == "|" && !ticks && !escaped { cells.append(current.trimmingCharacters(in: .whitespaces)); current = "" }
            else { current.append(char) }
            escaped = char == "\\" && !escaped
        }
        cells.append(current.trimmingCharacters(in: .whitespaces))
        if cells.count > 1 { if cells.first == "" { cells.removeFirst() }; if cells.last == "" { cells.removeLast() } }
        return cells
    }
    private static func matches(_ text: String, _ pattern: String) -> Bool { text.range(of: pattern, options: .regularExpression) != nil }
    private static func replace(_ text: String, _ pattern: String, _ replacement: String) -> String { text.replacingOccurrences(of: pattern, with: replacement, options: .regularExpression) }
}

enum MessageSpeechEvent { case started, progress(Int), paused, resumed, finished, cancelled, failed }
@MainActor protocol MessageSpeechOutput: AnyObject {
    var event: ((UUID, MessageSpeechEvent) -> Void)? { get set }
    func start(_ text: String, token: UUID)
    func stop()
    func pause() -> Bool
    func resume() -> Bool
}
@MainActor final class MessageSpeech: ObservableObject {
    static let shared = MessageSpeech()
    @Published private(set) var messageID: String?
    @Published private(set) var failedMessageID: String?
    @Published private(set) var error: String?
    @Published private(set) var isPaused = false
    @Published private(set) var progress = 0.0
    private(set) var spokenText = ""
    private(set) var readingOffset = 0
    private var utteranceOffset = 0
    private let output: MessageSpeechOutput
    private var token: UUID?
    private var startup: Task<Void, Never>?
    private let startTimeout: Duration
    init(output: MessageSpeechOutput? = nil, startTimeout: Duration = .seconds(10)) {
        self.output = output ?? SystemMessageSpeech(); self.startTimeout = startTimeout
        self.output.event = { [weak self] token, event in self?.receive(token, event) }
    }
    func toggle(messageID: String, markdown: String) {
        if self.messageID == messageID { stop(); return }
        stop()
        spokenText = SpokenMarkdown.text(markdown)
        guard !spokenText.isEmpty else { return }
        self.messageID = messageID
        start(at: 0)
    }
    private func start(at offset: Int) {
        utteranceOffset = offset; readingOffset = offset
        progress = Double(offset) / Double(max(1, spokenText.utf16.count))
        let next = UUID(); token = next
        startup = Task { [weak self, startTimeout] in
            do { try await Task.sleep(for: startTimeout) } catch { return }
            self?.receive(next, .failed)
        }
        output.start((spokenText as NSString).substring(from: offset), token: next)
    }
    func togglePause() {
        guard messageID != nil else { return }
        if isPaused {
            isPaused = false
            if token == nil || !output.resume() { invalidate(); start(at: Self.wordBoundary(in: spokenText, offset: readingOffset)) }
        } else {
            isPaused = true
            if !output.pause() { invalidate() }
        }
    }
    func seek(to fraction: Double) {
        guard messageID != nil, fraction.isFinite else { return }
        if fraction >= 1 { stop(); return }
        let offset = Self.wordBoundary(in: spokenText, offset: Int(max(0, fraction) * Double(spokenText.utf16.count)))
        invalidate(); readingOffset = offset
        progress = Double(offset) / Double(max(1, spokenText.utf16.count))
        if !isPaused { start(at: offset) }
    }
    /// Seek coordinates are UTF-16, matching AVSpeechSynthesizer's NSRange callbacks.
    static func wordBoundary(in text: String, offset: Int) -> Int {
        var positions = [0]
        text.enumerateSubstrings(in: text.startIndex..<text.endIndex, options: .byWords) { _, range, _, _ in positions.append(NSRange(range, in: text).location) }
        return positions.last(where: { $0 <= min(max(0, offset), max(0, text.utf16.count - 1)) }) ?? 0
    }
    private func invalidate() { token = nil; startup?.cancel(); startup = nil; output.stop() }
    func stop() {
        invalidate(); messageID = nil; failedMessageID = nil; error = nil; isPaused = false
        progress = 0; readingOffset = 0; utteranceOffset = 0; spokenText = ""
    }
    private func receive(_ expected: UUID, _ event: MessageSpeechEvent) {
        guard expected == token else { return }
        switch event {
        case .started:
            startup?.cancel(); startup = nil
            if isPaused && !output.pause() { invalidate() }
        case .progress(let offset):
            readingOffset = min(spokenText.utf16.count, max(utteranceOffset, utteranceOffset + offset))
            progress = Double(readingOffset) / Double(max(1, spokenText.utf16.count))
        case .paused: isPaused = true
        case .resumed: isPaused = false
        case .finished, .cancelled: stop()
        case .failed:
            let failed = messageID; stop(); failedMessageID = failed
            error = "Read aloud couldn't start with the available device voice."
        }
    }
}

@MainActor final class SystemMessageSpeech: NSObject, MessageSpeechOutput, AVSpeechSynthesizerDelegate {
    var event: ((UUID, MessageSpeechEvent) -> Void)?
    private let synthesizer = AVSpeechSynthesizer()
    private var current: (utterance: AVSpeechUtterance, token: UUID)?
    private var observers: [NSObjectProtocol] = []
    override init() {
        super.init(); synthesizer.delegate = self
        // Keep speech out of the app's audio session; never change recording/microphone settings.
        synthesizer.usesApplicationAudioSession = false
        observers.append(NotificationCenter.default.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.cancelCurrent() }
        })
        observers.append(NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt == AVAudioSession.InterruptionType.began.rawValue else { return }
            Task { @MainActor in self?.cancelCurrent() }
        })
    }
    deinit { for observer in observers { NotificationCenter.default.removeObserver(observer) } }
    func start(_ text: String, token: UUID) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.prefersAssistiveTechnologySettings = true
        current = (utterance, token); synthesizer.speak(utterance)
    }
    func stop() { current = nil; synthesizer.stopSpeaking(at: .immediate) }
    func pause() -> Bool { synthesizer.pauseSpeaking(at: .word) }
    func resume() -> Bool { synthesizer.continueSpeaking() }
    private func cancelCurrent() { let token = current?.token; stop(); if let token { event?(token, .cancelled) } }
    private func report(_ utterance: AVSpeechUtterance, _ value: MessageSpeechEvent) {
        guard let current, current.utterance === utterance else { return }
        event?(current.token, value)
    }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .started) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .finished) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .cancelled) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .paused) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .resumed) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString range: NSRange, utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .progress(range.location)) } }
}

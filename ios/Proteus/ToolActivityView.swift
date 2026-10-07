import SwiftUI

func toolActivityFailed(_ tool: JSON) -> Bool {
    if tool["status"].string == "failed" || !tool["error"].string.isEmpty { return true }
    return ["bash", "shell", "powershell"].contains(tool["name"].string) && tool["output"].string.range(of: #"<shellId: [^<>\r\n]+ completed with exit code [1-9]\d*>\s*$"#, options: .regularExpression) != nil
}

struct ToolActivityView: View {
    let tool: JSON
    @State private var expanded = false
    private var status: String { toolActivityFailed(tool) ? "failed" : tool["status"].string }
    private func display(_ key: String) -> String {
        let text = tool[key].string
        guard key == "output", let data = text.data(using: .utf8), let value = try? JSONDecoder().decode(JSON.self, from: data) else { return text }
        if value["snapshot"] != .null { return [value["title"].string, value["url"].string, "", value["snapshot"].string].joined(separator: "\n") }
        return value.pretty
    }
    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            VStack(alignment: .leading, spacing: 8) {
                let presentation = tool["presentation"]
                ForEach(presentation["targets"].array, id: \.self) { target in
                    Label(target.string, systemImage: "doc.text").font(.caption.monospaced()).textSelection(.enabled).padding(8).frame(maxWidth: .infinity, alignment: .leading).background(Color.teal.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                }
                StructuredResultView(value: .object(["kind": .string("facts"), "facts": presentation["facts"]]))
                if !presentation["command"].string.isEmpty { Text(presentation["command"].string).font(.caption.monospaced()).textSelection(.enabled).padding(10).background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 8)) }
                if !tool["progress"].string.isEmpty { Text(tool["progress"].string).font(.caption).foregroundStyle(.secondary) }
                if !tool["error"].string.isEmpty { Label(tool["error"].string, systemImage: "exclamationmark.triangle").font(.caption).foregroundStyle(.orange) }
                if presentation != .null { StructuredResultView(value: presentation["output"]) }
                else if !tool["output"].string.isEmpty { Text(display("output")).font(.caption.monospaced()).textSelection(.enabled) }
                if !tool["approval"].string.isEmpty { Label(tool["approval"].string, systemImage: "checkmark.shield").font(.caption2).foregroundStyle(.secondary) }
                if !display("arguments").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !display("output").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { DisclosureGroup("Raw arguments & output") {
                    Text(display("arguments") + "\n\n" + display("output")).font(.caption2.monospaced()).textSelection(.enabled)
                }.font(.caption).foregroundStyle(.secondary) }
            }.padding(.top, 8)
        } label: {
            HStack(alignment: .top, spacing: 8) {
                if status == "running" { ProgressView().controlSize(.small) }
                else { Image(systemName: status == "completed" ? "checkmark.circle" : "exclamationmark.circle").foregroundStyle(status == "completed" ? Color.green : Color.orange) }
                VStack(alignment: .leading, spacing: 3) {
                    RuntimeTimerView(tools: [tool])
                    Text(tool["summary"].string).font(.subheadline)
                    Text(status.capitalized).font(.caption).foregroundStyle(.secondary)
                }
            }
        }.padding(12).background(status == "failed" ? Color.orange.opacity(0.17) : Color.green.opacity(0.12), in: UnevenRoundedRectangle(topLeadingRadius: 0, bottomLeadingRadius: 0, bottomTrailingRadius: 8, topTrailingRadius: 8))
            .overlay(alignment: .leading) { Rectangle().fill(status == "failed" ? Color.orange.opacity(0.7) : Color.teal.opacity(0.6)).frame(width: 3) }
            .accessibilityIdentifier("tool-activity-\(tool["callId"].string)")
            .onAppear { if toolActivityFailed(tool) { expanded = true } }
    }
}

struct StructuredResultView: View {
    let value: JSON
    var body: some View {
        if value["kind"].string == "table" {
            Text(value["summary"].string).font(.caption).foregroundStyle(.secondary)
            ScrollView(.horizontal) {
                Grid(alignment: .topLeading, horizontalSpacing: 14, verticalSpacing: 8) {
                    GridRow { ForEach(Array(value["columns"].array.enumerated()), id: \.offset) { _, column in Text(column.string).font(.caption.weight(.semibold)).foregroundStyle(.teal) } }
                    ForEach(Array(value["rows"].array.enumerated()), id: \.offset) { _, row in
                        GridRow { ForEach(Array(row.array.enumerated()), id: \.offset) { _, cell in Text(cell.string).font(.caption).frame(maxWidth: 240, alignment: .leading).textSelection(.enabled) } }
                    }
                }.padding(10)
            }.background(Color.teal.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
        } else if value["kind"].string == "facts" {
            ForEach(value["facts"].array, id: \.self) { fact in
                HStack(alignment: .top, spacing: 12) { Text(fact["label"].string).foregroundStyle(.secondary).frame(width: 86, alignment: .leading); Text(fact["value"].string).frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled) }.font(.caption)
            }
        } else if !value["text"].string.isEmpty { Text(value["text"].string).font(.caption.monospaced()).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }
    }
}
struct PermissionRequestSummary: View {
    let request: JSON
    private var facts: JSON { .object(["kind": .string("facts"), "facts": .array([("Action",request["intention"].string.isEmpty ? request["kind"].string : request["intention"].string),("Tool",request["toolName"].string),("Path",request["path"].string.isEmpty ? request["fileName"].string : request["path"].string),("Command",request["fullCommandText"].string),("Website",request["url"].string)].filter{!$0.1.isEmpty}.map{.object(["label":.string($0.0),"value":.string($0.1)])})]) }
    var body: some View { StructuredResultView(value: facts) }
}

func modelTokenSize(_ value: JSON) -> String {
    let count = value.int
    guard count > 0 else { return "Capacity not reported" }
    return count % 1_000_000 == 0 ? "\(count / 1_000_000)M" : count % 1000 == 0 ? "\(count / 1000)K" : "\(count)"
}
func modelContextLabel(_ tier: JSON) -> String {
    let id = tier["id"].string
    return "\(modelTokenSize(tier["promptTokens"])) · \(id == "default" ? "Default" : id == "long_context" ? "Long context" : id)"
}
struct ProviderModelPicker: View {
    @EnvironmentObject var store: RemoteStore
    @Binding var model: String
    @Binding var effort: String
    @Binding var contextTier: String
    @Binding var serviceTier: String
    var provider = "copilot"
    private var catalog: JSON { store.providerStatuses[provider] ?? (provider == "copilot" ? store.modelStatus : .null) }
    private var hostName: String { store.state["hostName"].string.isEmpty ? "your Mac" : store.state["hostName"].string }
    private var providerName: String { ["copilot": "GitHub Copilot", "codex": "Codex", "claude": "Claude"][provider] ?? provider }
    private var models: [JSON] { catalog["models"].array }
    var disabled = false
    private var controls: JSON { models.first { $0["id"].string == model }?["controls"] ?? .null }
    private var efforts: [String] { controls["reasoningEfforts"].array.map(\.string) }
    private var tiers: [JSON] { controls["contextTiers"].array }
    var body: some View {
        Picker("Model", selection: $model) {
            Text("Choose model").tag("")
            if !model.isEmpty && !models.contains(where: { $0["id"].string == model }) { Text("\(model) · \(models.isEmpty ? "catalog not loaded" : "unavailable")").tag(model) }
            ForEach(models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : "\($0["name"].string) · \($0["id"].string)").tag($0["id"].string) }
        }.disabled(disabled).accessibilityIdentifier("model-picker")
        Picker("Thinking effort", selection: $effort) {
            Text("Provider default" + (controls["defaultReasoningEffort"].string.isEmpty ? "" : " · " + controls["defaultReasoningEffort"].string)).tag("")
            ForEach(efforts, id: \.self) { Text($0).tag($0) }
            if !effort.isEmpty && !efforts.contains(effort) { Text("\(effort) · unavailable (saved)").tag(effort) }
        }.disabled(disabled).accessibilityIdentifier("effort-picker")
        Picker("Context size", selection: $contextTier) {
            if tiers.isEmpty { Text("Default · capacity not reported").tag("default") }
            ForEach(tiers, id: \.self) { Text(modelContextLabel($0)).tag($0["id"].string) }
            if contextTier != "default" && !tiers.contains(where: { $0["id"].string == contextTier }) { Text("\(contextTier) · unavailable (saved)").tag(contextTier) }
        }.disabled(disabled).accessibilityIdentifier("context-tier-picker")
        Picker("Speed / service tier", selection: $serviceTier) {
            Text("Provider default").tag("")
            ForEach(controls["serviceTiers"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) }
            if !serviceTier.isEmpty && !controls["serviceTiers"].array.contains(where: { $0["id"].string == serviceTier }) { Text("\(serviceTier) · unavailable (saved)").tag(serviceTier) }
        }.disabled(disabled)
        if provider == "codex" { Text("Uses the Mac’s Codex sign-in. Context capacity may be unreported. Editor-specific agent tool filters are not supported; MCP access is granted per server.").font(.caption).foregroundStyle(.secondary) }
        if efforts.isEmpty { Text(controls["reasoningSupported"] == .bool(false) ? "This model does not support thinking effort." : "Thinking effort choices are not reported.").font(.caption).foregroundStyle(.secondary) }
        if controls["maxOutputTokens"].int > 0 { Text("Context size is the prompt budget. Maximum output: \(modelTokenSize(controls["maxOutputTokens"])) tokens.").font(.caption).foregroundStyle(.secondary) }
        Text(catalog["checkedAt"].string.isEmpty ? "Catalog not checked yet." : "Catalog checked \(catalog["checkedAt"].string). Refreshes at Mac launch and every five minutes.").font(.caption).foregroundStyle(.secondary)
        if catalog["stale"].bool { Text("Using last known choices. \(catalog["error"].string)").font(.caption).foregroundStyle(.orange) }
        if catalog["available"] == .bool(false) || (!catalog["error"].string.isEmpty && models.isEmpty) {
            Text("\(providerName) needs attention on \(hostName). Open Proteus on that Mac, complete its provider sign-in or reconnect there, then refresh available models here.").font(.caption).foregroundStyle(.orange)
        }
        Button("Refresh available models") { Task { await store.loadModels(force: true, provider: provider) } }.disabled(!store.connected)
    }
}

struct ChatPermissionsView: View {
    @EnvironmentObject var store: RemoteStore
    let run: JSON
    @State private var selected = ""
    @State private var busy = false
    private let modes = ["ask", "custom", "trusted", "autopilot"]
    private let names = ["ask": "Ask each time", "custom": "Saved rules only", "trusted": "Trusted workspace", "autopilot": "Auto-approve tools"]
    private var context: JSON { run["permissionContext"] }
    private var chatScopeAvailable: Bool { store.state["capabilities"].array.contains(.string("chat.permissions.chat.v1")) }
    var body: some View {
        if context != .null {
            VStack(alignment: .leading, spacing: 8) {
                Text("Tool approvals").font(.headline)
                Text("Current: \(names[context["mode"].string] ?? context["mode"].string) · \(context["source"].string == "chat" ? "this chat only" : "workspace setting")").font(.caption)
                Text("\(run["automaticApprovals"].int) tool requests approved automatically").font(.caption).foregroundStyle(.secondary)
                if chatScopeAvailable {
                    if context["source"].string == "chat" {
                        Button("Revoke chat-only auto-approval") { applyChat("inherit") }.disabled(busy || !store.connected).accessibilityIdentifier("revoke-chat-auto-approval")
                    } else {
                        Button("Auto-approve this chat and future continuations") { applyChat("autopilot") }.disabled(busy || !store.connected).accessibilityIdentifier("chat-only-auto-approval")
                    }
                    Text("This chat-only choice survives app restart, applies to pending tools and this chat’s future turns, and is revoked when its provider, roots or integrations change. It uses existing granted resources and keeps mandatory approval and sandbox rules.").font(.caption).foregroundStyle(.secondary)
                }
                Picker("Workspace approval mode", selection: $selected) { ForEach(modes, id: \.self) { Text(names[$0]!).tag($0) } }.accessibilityIdentifier("permission-mode")
                Button("Apply to workspace") { applyWorkspace() }.disabled(busy || !store.connected || selected.isEmpty).accessibilityIdentifier("apply-permissions")
                Text("Workspace mode applies to other chats and schedules with this same permission context. Saved rules only covers individual grants; trusted and auto-approve modes can authorize broader tools within their existing boundaries. Questions and enterprise-required approvals still pause.").font(.caption).foregroundStyle(.secondary)
                DisclosureGroup("Authorized folders and saved rules") {
                    ForEach(context["folders"].array, id: \.self) { folder in Label(folder["path"].string + " · " + folder["access"].string, systemImage: "folder").font(.caption).textSelection(.enabled) }
                    ForEach(context["rules"].array, id: \.self) { rule in Text([rule["kind"].string,rule["command"].string,rule["server"].string,rule["tool"].string,rule["action"].string,rule["origin"].string].filter{!$0.isEmpty}.joined(separator:" · ")).font(.caption).textSelection(.enabled) }
                }
            }.task(id: context["id"].string + ":" + context["chatRevision"].pretty) { selected = context["workspaceMode"].string.isEmpty ? context["mode"].string : context["workspaceMode"].string }
        }
    }
    private func applyChat(_ mode: String) {
        busy = true
        Task { defer { busy = false }
            do {
                let updated = try await store.request("chat.permissions", ["id": run["id"], "scope": .string("chat"), "mode": .string(mode), "expectedContextId": context["id"], "expectedChatRevision": context["chatRevision"]])
                store.mergeChat(updated)
                await store.refresh()
            } catch { store.error = error.localizedDescription }
        }
    }
    private func applyWorkspace() {
        busy = true
        Task { defer { busy = false }
            do {
                let updated = try await store.request("chat.permissions", ["id": run["id"], "scope": .string("workspace"), "mode": .string(selected), "expectedContextId": context["id"], "expectedRevision": run["permissionRevision"]])
                store.mergeChat(updated)
                await store.refresh()
            } catch { store.error = error.localizedDescription }
        }
    }
}

struct MCPConnectionsView: View {
    @EnvironmentObject var store: RemoteStore
    let runID: String
    var loginAvailable = true
    @State private var servers: [JSON] = []
    @State private var message = "Checking connections…"
    @State private var busy = false
    @State private var checking = false
    @State private var waiting: String?
    @State private var pollingGeneration = 0
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(message).font(.caption).foregroundStyle(.secondary).accessibilityIdentifier("mcp-status-message")
            ForEach(servers, id: \.self) { server in
                VStack(alignment: .leading, spacing: 5) {
                    Text(server["name"].string).font(.subheadline.bold())
                    Text(server["status"].string).font(.caption).foregroundStyle(.teal)
                    if !server["error"].string.isEmpty { Text(server["error"].string).font(.caption).foregroundStyle(.orange) }
                    if server["remote"].bool && server["status"].string != "connected" {
                        if loginAvailable { Button(waiting == server["name"].string ? "Restart sign-in on Mac" : "Sign in on Mac") { connect(server["name"].string) } }
                        else { Text("Open Proteus on the Mac to finish this connection.").font(.caption).foregroundStyle(.secondary) }
                    }
                }
            }
            Button("Refresh MCP connections") { Task { await refreshConnections() } }
        }.disabled(busy || !store.connected).task(id: runID + String(pollingGeneration)) {
            await refreshConnections()
            for _ in 0..<120 {
                do { try await Task.sleep(for: .seconds(5)) } catch { return }
                guard !Task.isCancelled else { return }
                if store.connected { await refreshConnections() }
            }
            if waiting != nil { message = "Still not connected. Sign-in may have timed out; restart sign-in or refresh connections." }
        }
    }
    private func refreshConnections() async {
        guard !busy && !checking else { return }; checking = true; defer { checking = false }
        do {
            let value = try await store.request("mcp.status", ["id":.string(runID)])
            guard !Task.isCancelled && !busy else { return }
            servers = value["servers"].array
            if let name = waiting, servers.contains(where: { $0["name"].string == name && $0["status"].string == "connected" }) {
                message = "Connected to \(name). Continue or steer the chat to retry its work."; waiting = nil
            } else if message == "Checking connections…" { message = "Connections update automatically while this view is open. Sign-in opens on your Mac." }
        } catch { message = "Could not check connections: " + error.localizedDescription }
    }
    private func connect(_ server: String) {
        busy = true; pollingGeneration += 1; message = "Starting \(server) sign-in. Watch for a browser or macOS Keychain prompt on your Mac."
        Task {
            do { let value = try await store.request("mcp.login", ["id":.string(runID),"server":.string(server)])
                waiting = value["status"].string == "connected" ? nil : server
                message = waiting == nil ? "Connected. Continue or steer the chat to retry its work." : "Finish sign-in in the browser on your Mac. Checking automatically for the connection…"
            } catch { message = "Sign-in failed: " + error.localizedDescription }
            busy = false; await refreshConnections()
        }
    }
}

// Small, metadata-driven menus live with the next message, on iPhone and iPad.
struct ComposerModelPicker: View {
    @EnvironmentObject var store: RemoteStore
    @Binding var model: String
    @Binding var effort: String
    @Binding var contextTier: String
    @Binding var serviceTier: String
    let provider: String
    private var models: [JSON] { (store.providerStatuses[provider] ?? (provider == "copilot" ? store.modelStatus : .null))["models"].array }
    private var catalog: JSON { store.providerStatuses[provider] ?? (provider == "copilot" ? store.modelStatus : .null) }
    private var hostName: String { store.state["hostName"].string.isEmpty ? "your Mac" : store.state["hostName"].string }
    private var providerName: String { ["copilot": "GitHub Copilot", "codex": "Codex", "claude": "Claude"][provider] ?? provider }
    private var selected: JSON { models.first { $0["id"].string == model } ?? .null }
    private var controls: JSON { selected["controls"] }
    private var efforts: [String] { controls["reasoningEfforts"].array.map(\.string) }
    private var tiers: [JSON] { controls["contextTiers"].array }
    private var speeds: [JSON] { controls["serviceTiers"].array }
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
        if catalog["available"] == .bool(false) || (!catalog["error"].string.isEmpty && models.isEmpty) {
            Text("\(providerName) needs sign-in or reconnection in Proteus on \(hostName). Complete it there, then refresh models here.").font(.caption).foregroundStyle(.orange)
        }
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                Menu {
                    Picker("Model", selection: $model) {
                        if !models.contains(where: { $0["id"].string == model }) { Text(model.isEmpty ? "Choose model" : model + " · unavailable").tag(model) }
                        ForEach(models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : $0["name"].string).tag($0["id"].string) }
                    }
                    Text("Changes apply to your next turn. Steering keeps the running model. Earlier history remains; the provider may compact it to fit.")
                    Button("Refresh models") { Task { await store.loadModels(force: true, provider: provider) } }
                } label: { label(selected["name"].string.isEmpty ? (model.isEmpty ? "Model" : model) : selected["name"].string) }.accessibilityIdentifier("composer-model")
                if !efforts.isEmpty || !effort.isEmpty {
                    Menu {
                        Picker("Thinking effort", selection: $effort) {
                            Text("Provider default").tag(""); ForEach(efforts, id: \.self) { Text($0).tag($0) }
                            if !effort.isEmpty && !efforts.contains(effort) { Text(effort + " · unavailable").tag(effort) }
                        }
                    } label: { label(effort.isEmpty ? "Effort · default" : effort.capitalized) }.accessibilityIdentifier("composer-effort")
                }
                if !speeds.isEmpty || !serviceTier.isEmpty {
                    Menu {
                        Picker("Speed", selection: $serviceTier) {
                            Text("Provider default").tag(""); ForEach(speeds, id: \.self) { Text($0["name"].string).tag($0["id"].string) }
                            if !serviceTier.isEmpty && !speeds.contains(where: { $0["id"].string == serviceTier }) { Text(serviceTier + " · unavailable").tag(serviceTier) }
                        }
                    } label: { label(serviceTier.isEmpty ? "Speed · default" : serviceTier.capitalized) }.accessibilityIdentifier("composer-speed")
                }
                if tiers.count > 1 || contextTier != "default" {
                    Menu {
                        Picker("Context size", selection: $contextTier) {
                            ForEach(tiers, id: \.self) { Text(modelContextLabel($0)).tag($0["id"].string) }
                            if !tiers.contains(where: { $0["id"].string == contextTier }) { Text(contextTier + " · unavailable").tag(contextTier) }
                        }
                    } label: { label(tiers.first(where: { $0["id"].string == contextTier }).map { $0["promptTokens"].int > 0 ? modelTokenSize($0["promptTokens"]) : $0["id"].string } ?? contextTier) }.accessibilityIdentifier("composer-context")
                }
            }.font(.caption).foregroundStyle(.secondary).buttonStyle(.plain)
        }.onChange(of: model) { _, _ in
            if !efforts.contains(effort) { effort = "" }
            if !tiers.contains(where: { $0["id"].string == contextTier }) { contextTier = "default" }
            if !speeds.contains(where: { $0["id"].string == serviceTier }) { serviceTier = "" }
        }
        }
    }
    private func label(_ title: String) -> some View { HStack(spacing: 4) { Text(title).lineLimit(1); Image(systemName: "chevron.down").font(.caption2) } }
}

// Durable active orchestration intervals exclude queue, idle and human-wait time.
func runtimeUnion(_ intervals: [(Date, Date)]) -> Double {
    var end = Date.distantPast, total = 0.0
    for (start, finish) in intervals.filter({ $0.1 >= $0.0 }).sorted(by: { $0.0 < $1.0 }) {
        total += max(0, finish.timeIntervalSince(max(start, end))); end = max(end, finish)
    }
    return total
}
func runtimeSeconds(_ turn: JSON, now: Date, verified: Bool) -> Double? {
    guard turn["intervals"] != .null else { return nil }
    var intervals = turn["intervals"].array.compactMap { row -> (Date, Date)? in
        guard row.array.count == 2, let a = ProviderAllowance.date(row.array[0].string), let b = ProviderAllowance.date(row.array[1].string) else { return nil }; return (a,b)
    }
    if verified, let start = ProviderAllowance.date(turn["activeSince"].string) { intervals.append((start,max(start,now))) }
    return runtimeUnion(intervals)
}
func runtimeLabel(_ seconds: Double?) -> String {
    guard let seconds else { return "Unavailable" }; let n = Int(max(0,seconds)), h = n / 3600, m = n % 3600 / 60
    return h > 0 ? "\(h)h \(m)m \(n % 60)s" : m > 0 ? "\(m)m \(n % 60)s" : "\(n)s"
}
struct RuntimeTimerView: View {
    @EnvironmentObject var store: RemoteStore
    var turns: [JSON] = []
    var tools: [JSON] = []
    var total: Bool = false
    var partial: Bool = false
    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let verified = store.connected && store.runtimeClockOffset != nil
            let hostNow = context.date.addingTimeInterval(store.runtimeClockOffset ?? 0)
            let intervals = tools.compactMap { tool -> (Date,Date)? in
                guard let start = ProviderAllowance.date(tool["startedAt"].string) else { return nil }
                if let finish = ProviderAllowance.date(tool["finishedAt"].string) { return (start,finish) }
                return verified && tool["status"].string == "running" ? (start,max(start,hostNow)) : nil
            }
            let activityTurns = store.chats[store.selectedChat ?? ""]?["turns"].array ?? []
            let active = activityTurns.flatMap { turn -> [(Date,Date)] in
                var result = turn["intervals"].array.compactMap { row -> (Date,Date)? in let values=row.array; guard values.count==2, let start=ProviderAllowance.date(values[0].string), let end=ProviderAllowance.date(values[1].string) else { return nil }; return (start,end) }
                if verified, let start=ProviderAllowance.date(turn["activeSince"].string) { result.append((start,hostNow)) }; return result
            }
            let clipped = activityTurns.isEmpty ? intervals : intervals.flatMap { interval in active.map { (max(interval.0,$0.0),min(interval.1,$0.1)) } }
            let durations = turns.compactMap { runtimeSeconds($0,now:hostNow,verified:verified) }
            let fallback: Double? = tools.count == 1 && tools[0]["durationMs"] != .null ? Double(tools[0]["durationMs"].int) / 1000 : nil
            let seconds: Double? = !tools.isEmpty ? (intervals.isEmpty ? fallback : runtimeUnion(clipped)) : durations.isEmpty ? nil : durations.reduce(0,+)
            Text((total ? "Total AI runtime · " : "") + runtimeLabel(seconds) + (partial || turns.contains { $0["incomplete"].bool } ? " · partial" : "") + (store.connected ? "" : " · offline, unverified"))
                .font(.caption).monospacedDigit().foregroundStyle(.secondary).accessibilityLabel((total ? "Total AI runtime " : "Runtime ") + runtimeLabel(seconds))
        }
    }
}

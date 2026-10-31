import SwiftUI

func toolActivityFailed(_ tool: JSON) -> Bool {
    if tool["status"].string == "failed" || !tool["error"].string.isEmpty { return true }
    return ["bash", "shell", "powershell"].contains(tool["name"].string) && tool["output"].string.range(of: #"<shellId: [^<>\r\n]+ completed with exit code [1-9]\d*>\s*$"#, options: .regularExpression) != nil
}

enum NativeActivity {
    static func contains(_ event: JSON, provider: String = "") -> Bool {
        if event["data"]["question"] != .null || event["data"]["agentFeedback"] != .null { return false }
        if provider == "mtplx", event["role"].string == "system", event["text"].string == "MTPLX is thinking." { return true }
        return event["data"]["tool"] != .null || event["data"]["permission"] != .null || event["data"]["activity"] != .null || event["role"].string == "tool"
    }
    static func group(events: [JSON], startingAt index: Int, provider: String = "") -> [JSON] {
        guard events.indices.contains(index), contains(events[index], provider: provider) else { return [] }
        var end = index
        while end < events.count && contains(events[end], provider: provider) { end += 1 }
        return Array(events[index..<end])
    }
    static func permissionCallID(_ permission: JSON) -> String {
        if !permission["toolCallId"].string.isEmpty { return permission["toolCallId"].string }
        // Older decisions recorded the reference only inside their original request.
        guard let data = permission["request"].string.data(using: .utf8),
              let request = try? JSONDecoder().decode(JSON.self, from: data) else { return "" }
        return request["toolCallId"].string
    }
    static func toolSeconds(_ tool: JSON, now: Date, verified: Bool) -> Double? {
        if case .number(let milliseconds) = tool["durationMs"], milliseconds.isFinite, milliseconds >= 0 { return milliseconds / 1000 }
        guard let start = ProviderAllowance.date(tool["startedAt"].string) else { return nil }
        if let finish = ProviderAllowance.date(tool["finishedAt"].string), finish >= start { return finish.timeIntervalSince(start) }
        return verified && tool["status"].string == "running" && tool["finishedAt"].string.isEmpty ? max(0, now.timeIntervalSince(start)) : nil
    }
    static func elapsedLabel(_ seconds: Double?) -> String {
        guard let seconds else { return "Elapsed unavailable" }
        if seconds < 1 { return "Elapsed \(Int((seconds * 1000).rounded())) ms" }
        if seconds < 60 { return "Elapsed \(seconds.formatted(.number.precision(.fractionLength(0...2))))s" }
        return "Elapsed " + runtimeLabel(seconds)
    }
}

/// Adapter-reported intervals and usage, disclosed lazily with their provenance.
/// Raw reasoning is never accepted as display content here.
struct NativeProviderActivityView: View {
    @Environment(RemoteStore.self) var store
    let activity: JSON
    let runStatus: String
    @State private var expanded = false
    private var live: Bool { activity["status"].string == "running" && ["running", "awaiting_input"].contains(runStatus) && store.connected && store.runtimeClockOffset != nil }
    private let usageFields = [("inputTokens", "Input tokens"), ("uncachedInputTokens", "Uncached input tokens"), ("outputTokens", "Output tokens"), ("cachedInputTokens", "Cached input tokens"), ("cacheWriteInputTokens", "Cache-write input tokens"), ("reasoningTokens", "Reasoning tokens"), ("totalTokens", "Total tokens")]
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(activity["provider"].string.capitalized + " · " + activity["label"].string).font(.subheadline.weight(.medium))
            Text(activity["status"].string == "running" ? (live ? "In progress" : "End not recorded") : activity["status"].string.capitalized).font(.caption).foregroundStyle(.secondary)
            if activity["kind"].string != "usage" {
                if live { TimelineView(.periodic(from: .now, by: 1)) { context in elapsed(context.date) } }
                else { elapsed(Date()) }
            }
            DisclosureGroup(activity["kind"].string == "usage" ? "Usage details" : "Activity details", isExpanded: $expanded) {
                if expanded {
                    if !activity["summary"].string.isEmpty { Text("Provider-supplied summary").font(.caption); Text(String(activity["summary"].string.prefix(12_000))).textSelection(.enabled) }
                    Text("Source: " + (activity["source"].string.isEmpty ? "Not recorded" : activity["source"].string)).font(.caption)
                    if !activity["agentId"].string.isEmpty { Text("Agent: " + activity["agentId"].string).font(.caption) }
                    if !activity["scope"].string.isEmpty { Text("Scope: " + activity["scope"].string).font(.caption) }
                    if activity["kind"].string == "usage" {
                        ForEach(usageFields, id: \.0) { key, label in
                            HStack { Text(label); Spacer(); Text(count(activity["values"][key])) }.font(.caption)
                        }
                        Text("Values belong to the reported scope. Cache and reasoning counts can be subsets; missing values are not zero.").font(.caption).foregroundStyle(.secondary)
                    } else {
                        Text("First observed: " + (activity["startedAt"].string.isEmpty ? "Start not recorded" : activity["startedAt"].string)).font(.caption)
                        Text("Last observed: " + (activity["finishedAt"].string.isEmpty ? "End not recorded" : activity["finishedAt"].string)).font(.caption)
                        Text("Observed streaming intervals may include transport or waiting. Raw internal reasoning is not stored here.").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }.font(.caption)
        }.accessibilityIdentifier("provider-activity-" + activity["id"].string)
    }
    private func count(_ value: JSON) -> String {
        guard case .number(let number) = value, number.isFinite, number >= 0, number < Double(Int.max), number.rounded() == number else { return "Not reported" }
        return Int(number).formatted()
    }
    private func elapsed(_ date: Date) -> some View {
        Text(NativeActivity.elapsedLabel(activity["status"].string == "running" && !live ? nil : NativeActivity.toolSeconds(activity, now: date.addingTimeInterval(store.runtimeClockOffset ?? 0), verified: live))).font(.caption).monospacedDigit()
    }
}

struct NativeChatRecoveryState {
    let event: JSON
    let failureEventAt: JSON
    let recoverable: Bool
    let capacity: Bool
    let retry: JSON
    let queuedCount: Int
    /// Agents the provider rejected before starting; the chat can drop them and retry.
    var incompatibleAgents: [String] { event["data"]["failure"]["kind"].string == "incompatible-agents" ? event["data"]["failure"]["agents"].array.map(\.["name"].string).filter { !$0.isEmpty } : [] }
    var allowance: Bool { event["data"]["failure"]["kind"].string == "allowance" || event["text"].string.range(of: #"^Claude rate_limit\b"#, options: .caseInsensitive) != nil }
    static func read(_ run: JSON) -> NativeChatRecoveryState? {
        let recoverable = ["failed", "interrupted"].contains(run["status"].string)
        let retry = run["capacityRetry"]
        guard recoverable || retry != .null else { return nil }
        let started = run["turns"].array.last?["startedAt"].string ?? ""
        let finish = run["failureEventAt"].string.isEmpty ? run["updatedAt"] : run["failureEventAt"]
        let events = run["events"].array.reversed()
        let tagged = events.first { $0["data"]["failure"] != .null && (!recoverable || started.isEmpty || $0["at"].string >= started) }
        let event = tagged ?? events.first { $0["role"].string == "system" && $0["data"]["tool"] == .null && $0["data"]["permission"] == .null && (finish.string.isEmpty || $0["at"].string <= finish.string) && (started.isEmpty || $0["at"].string >= started) } ?? .null
        let capacity = run["status"].string == "failed" && (event["data"]["failure"]["kind"].string == "capacity" || event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).range(of: #"^Selected model is at capacity(?:[.!]|$)"#, options: [.regularExpression, .caseInsensitive]) != nil)
        return NativeChatRecoveryState(event: event, failureEventAt: finish, recoverable: recoverable, capacity: capacity, retry: retry, queuedCount: run["queuedMessages"].array.count)
    }
}

struct ToolTimingView: View {
    @Environment(RemoteStore.self) var store
    @Environment(\.timeZone) private var timeZone
    let tool: JSON
    private var verified: Bool { store.connected && store.runtimeClockOffset != nil }
    var body: some View {
        if runtimeClockRunning(turns: [], tools: [tool], verified: verified) {
            TimelineView(.periodic(from: .now, by: 1)) { context in timing(at: context.date) }
        } else { timing(at: Date()) }
    }
    private func timing(at now: Date) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(NativeActivity.elapsedLabel(NativeActivity.toolSeconds(tool, now: now.addingTimeInterval(store.runtimeClockOffset ?? 0), verified: verified))).monospacedDigit()
                .accessibilityIdentifier("tool-elapsed-\(tool["callId"].string)")
            if let finish = ProviderAllowance.date(tool["finishedAt"].string) {
                Text("Finished " + nativeTimestamp(finish, timezone: timeZone.identifier, includeSeconds: true))
                    .accessibilityIdentifier("tool-finished-\(tool["callId"].string)")
            } else if tool["status"].string != "running" {
                Text("Completion time unavailable")
            }
        }.font(.caption2).foregroundStyle(.secondary)
    }
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
                    Text(tool["summary"].string + (tool["presentation"]["facts"].array.first(where: { $0["label"].string == "Pattern" }).map { " · " + $0["value"].string } ?? "")).font(.subheadline)
                    Text(status.capitalized).font(.caption).foregroundStyle(.secondary)
                    if !tool["callId"].string.isEmpty { Text("Tool call · " + tool["callId"].string).font(.caption2.monospaced()).textSelection(.enabled) }
                    ToolTimingView(tool: tool)
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
    @Environment(RemoteStore.self) var store
    @Binding var model: String
    @Binding var effort: String
    @Binding var contextTier: String
    @Binding var serviceTier: String
    var provider = "copilot"
    private var catalog: JSON { store.providerStatuses[provider] ?? (provider == "copilot" ? store.modelStatus : .null) }
    private var hostName: String { store.displayName }
    private var providerName: String { ["copilot": "GitHub Copilot", "codex": "Codex", "claude": "Claude"][provider] ?? provider }
    private var models: [JSON] { catalog["models"].array }
    var disabled = false
    private var controls: JSON { models.first { $0["id"].string == model }?["controls"] ?? .null }
    private var efforts: [String] { controls["reasoningEfforts"].array.map(\.string) }
    // Provider-advertised labels (Copilot Fusion tiers) replace opaque effort IDs.
    private func effortLabel(_ id: String) -> String { let label = controls["reasoningEffortLabels"][id].string; return label.isEmpty ? id : label }
    private var effortTitle: String { controls["reasoningEffortTitle"].string.isEmpty ? "Thinking effort" : controls["reasoningEffortTitle"].string }
    private var tiers: [JSON] { controls["contextTiers"].array }
    var body: some View {
        Picker("Model", selection: $model) {
            Text("Choose model").tag("")
            if !model.isEmpty && !models.contains(where: { $0["id"].string == model }) { Text("\(model) · \(models.isEmpty ? "catalog not loaded" : "unavailable")").tag(model) }
            ForEach(models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : "\($0["name"].string) · \($0["id"].string)").tag($0["id"].string) }
        }.disabled(disabled).accessibilityIdentifier("model-picker")
        Picker(effortTitle, selection: $effort) {
            Text("Provider default" + (controls["defaultReasoningEffort"].string.isEmpty ? "" : " · " + effortLabel(controls["defaultReasoningEffort"].string))).tag("")
            ForEach(efforts, id: \.self) { Text(effortLabel($0)).tag($0) }
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
        if provider == "codex" { Text("Uses \(hostName)’s Codex sign-in. Context capacity may be unreported. Editor-specific agent tool filters are not supported; MCP access is granted per server.").font(.caption).foregroundStyle(.secondary) }
        if efforts.isEmpty { Text(controls["reasoningSupported"] == .bool(false) ? "This model does not support thinking effort." : "Thinking effort choices are not reported.").font(.caption).foregroundStyle(.secondary) }
        if controls["maxOutputTokens"].int > 0 { Text("Context size is the prompt budget. Maximum output: \(modelTokenSize(controls["maxOutputTokens"])) tokens.").font(.caption).foregroundStyle(.secondary) }
        Text(catalog["checkedAt"].string.isEmpty ? "Catalog not checked yet." : "Catalog checked \(catalog["checkedAt"].string). Refreshes when \(hostName) launches and every five minutes.").font(.caption).foregroundStyle(.secondary)
        if catalog["stale"].bool { Text("Using last known choices. \(catalog["error"].string)").font(.caption).foregroundStyle(.orange) }
        if catalog["available"] == .bool(false) || (!catalog["error"].string.isEmpty && models.isEmpty) {
            Text("\(providerName) needs attention on \(hostName). Open Proteus on \(hostName), complete its provider sign-in or reconnect there, then refresh available models here.").font(.caption).foregroundStyle(.orange)
        }
        Button("Refresh available models") { Task { await store.loadModels(force: true, provider: provider) } }.disabled(!store.connected)
    }
}

struct PendingChatApprovalView: View {
    @Environment(RemoteStore.self) var store
    let run: JSON
    @State private var busy = false
    var body: some View {
        if run["permissionContext"] != .null && store.state["capabilities"].array.contains(.string("chat.permissions.pending.v1")) {
            Button("Auto-approve this chat and future continuations") {
                let context = run["permissionContext"], requestID = run["pending"]["id"], runID = run["id"]
                busy = true
                Task { defer { busy = false }
                    do {
                        let updated = try await store.request("chat.permissions", ["id": runID, "scope": .string("chat"), "mode": .string("autopilot"), "expectedContextId": context["id"], "expectedChatRevision": context["chatRevision"], "expectedRequestId": requestID])
                        store.mergeChat(updated)
                        await store.refresh()
                    } catch { store.error = error.localizedDescription }
                }
            }.disabled(busy || !store.connected || run["permissionContext"]["chatMode"].string == "autopilot").accessibilityIdentifier("pending-chat-auto-approval")
            Text("This chat only, using existing granted resources. Workspace settings stay unchanged. Mandatory approvals still require a decision.").font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct ChatPermissionsView: View {
    @Environment(RemoteStore.self) var store
    let run: JSON
    @State private var selected = ""
    @State private var busy = false
    @State private var trustedFolder = ""
    @State private var folderAccess = "read"
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
                if run["chatControls"]["allowanceContinuation"].bool {
                    Toggle("Automatically continue when allowance resets", isOn: Binding(get: { run["allowanceContinuation"]["enabled"].bool }, set: { value in
                        busy = true
                        Task { defer { busy = false }; do {
                            let updated = try await store.request("chat.recover", ["id": run["id"], "action": .string("allowance-auto"), "enabled": .bool(value)])
                            store.mergeChat(updated); await store.refresh()
                        } catch { store.error = error.localizedDescription } }
                    })).disabled(busy || !store.connected).accessibilityIdentifier("allowance-auto")
                    Text("The executing computer checks fresh provider allowance before continuing. Unknown reset times remain paused.").font(.caption).foregroundStyle(.secondary)
                }
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
                if store.state["capabilities"].array.contains(.string("chat.permissions.folders.v1")) {
                    DisclosureGroup("Trust a folder in this chat") {
                        TextField("Folder path on \(store.displayName)", text: $trustedFolder).autocorrectionDisabled().textInputAutocapitalization(.never)
                        Picker("Access", selection: $folderAccess) { Text("Read").tag("read"); Text("Read and write").tag("read-write") }
                        Button("Trust folder for this chat") { folderGrant(trustedFolder, revoke: false) }.disabled(busy || !store.connected || trustedFolder.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        Text("Includes files and subfolders for this chat and its continuations. Other chats and workspace approvals stay unchanged.").font(.caption).foregroundStyle(.secondary)
                        ForEach(context["chatFolders"].array, id: \.self) { folder in HStack { Text(folder["path"].string + " · " + folder["access"].string).font(.caption.monospaced()).textSelection(.enabled); Spacer(); Button("Revoke") { folderGrant(folder["path"].string, revoke: true) }.disabled(busy || !store.connected) } }
                    }
                }
                DisclosureGroup("Authorized folders and saved rules") {
                    ForEach(context["folders"].array, id: \.self) { folder in Label(folder["path"].string + " · " + folder["access"].string, systemImage: "folder").font(.caption).textSelection(.enabled) }
                    ForEach(context["rules"].array, id: \.self) { rule in Text([rule["kind"].string,rule["command"].string,rule["server"].string,rule["tool"].string,rule["action"].string,rule["origin"].string].filter{!$0.isEmpty}.joined(separator:" · ")).font(.caption).textSelection(.enabled) }
                }
            }.task(id: context["id"].string + ":" + context["chatRevision"].pretty) { selected = context["workspaceMode"].string.isEmpty ? context["mode"].string : context["workspaceMode"].string }
        }
    }
    private func folderGrant(_ folder: String, revoke: Bool) {
        busy = true
        Task { defer { busy = false }; do {
            let updated = try await store.request("chat.permissions", ["id": run["id"], "action": .string(revoke ? "revoke-chat-folder" : "grant-chat-folder"), "folder": .string(folder.trimmingCharacters(in: .whitespacesAndNewlines)), "access": .string(folderAccess), "expectedContextId": context["id"], "expectedChatRevision": context["chatRevision"]])
            store.mergeChat(updated); trustedFolder = ""; await store.refresh()
        } catch { store.error = error.localizedDescription } }
    }
    private func applyChat(_ mode: String) {
        busy = true
        Task { defer { busy = false }
            do {
                var args: [String: JSON] = ["id": run["id"], "scope": .string("chat"), "mode": .string(mode), "expectedContextId": context["id"], "expectedChatRevision": context["chatRevision"]]
                if run["pending"]["type"].string == "permission" { args["expectedRequestId"] = run["pending"]["id"] }
                let updated = try await store.request("chat.permissions", args)
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
    @Environment(RemoteStore.self) var store
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
                        if loginAvailable { Button(waiting == server["name"].string ? "Restart sign-in on \(store.displayName)" : "Sign in on \(store.displayName)") { connect(server["name"].string) } }
                        else { Text("Open Proteus on \(store.displayName) to finish this connection.").font(.caption).foregroundStyle(.secondary) }
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
            } else if message == "Checking connections…" { message = "Connections update automatically while this view is open. Sign-in opens on \(store.displayName)." }
        } catch { message = "Could not check connections: " + error.localizedDescription }
    }
    private func connect(_ server: String) {
        busy = true; pollingGeneration += 1; message = "Starting \(server) sign-in. Watch for \(store.hostInfo.signInPrompt) on \(store.displayName)."
        Task {
            do { let value = try await store.request("mcp.login", ["id":.string(runID),"server":.string(server)])
                waiting = value["status"].string == "connected" ? nil : server
                message = waiting == nil ? "Connected. Continue or steer the chat to retry its work." : "Finish sign-in in the browser on \(store.displayName). Checking automatically for the connection…"
            } catch { message = "Sign-in failed: " + error.localizedDescription }
            busy = false; await refreshConnections()
        }
    }
}

// Small, metadata-driven menus live with the next message, on iPhone and iPad.
struct ComposerModelPicker: View {
    @State private var showingOptions = false
    @Environment(RemoteStore.self) var store
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Binding var model: String
    @Binding var effort: String
    @Binding var contextTier: String
    @Binding var serviceTier: String
    let provider: String
    private var models: [JSON] { (store.providerStatuses[provider] ?? (provider == "copilot" ? store.modelStatus : .null))["models"].array }
    private var catalog: JSON { store.providerStatuses[provider] ?? (provider == "copilot" ? store.modelStatus : .null) }
    private var hostName: String { store.displayName }
    private var providerName: String { ["copilot": "GitHub Copilot", "codex": "Codex", "claude": "Claude"][provider] ?? provider }
    private var selected: JSON { models.first { $0["id"].string == model } ?? .null }
    private var controls: JSON { selected["controls"] }
    private var efforts: [String] { controls["reasoningEfforts"].array.map(\.string) }
    // Provider-advertised labels (Copilot Fusion tiers) replace opaque effort IDs.
    private func effortLabel(_ id: String) -> String { let label = controls["reasoningEffortLabels"][id].string; return label.isEmpty ? id : label }
    private var effortTitle: String { controls["reasoningEffortTitle"].string.isEmpty ? "Thinking effort" : controls["reasoningEffortTitle"].string }
    private var tiers: [JSON] { controls["contextTiers"].array }
    private var speeds: [JSON] { controls["serviceTiers"].array }
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
        if catalog["available"] == .bool(false) || (!catalog["error"].string.isEmpty && models.isEmpty) {
            Text("\(providerName) needs sign-in or reconnection in Proteus on \(hostName). Complete it there, then refresh models here.").font(.caption).foregroundStyle(.orange)
        }
        Group {
            if sizeClass == .compact { compactOptions }
            else { ViewThatFits(in: .horizontal) { HStack(spacing: 12) { optionMenus }.fixedSize(horizontal: true, vertical: false); compactOptions } }
        }.frame(minHeight: 44).onChange(of: model) { _, _ in
            if !efforts.contains(effort) { effort = "" }
            if !tiers.contains(where: { $0["id"].string == contextTier }) { contextTier = "default" }
            if !speeds.contains(where: { $0["id"].string == serviceTier }) { serviceTier = "" }
        }
        }
    }
    private var compactOptions: some View {
        Button { showingOptions.toggle() } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text(selected["name"].string.isEmpty ? (model.isEmpty ? "Model options" : model) : selected["name"].string).font(.subheadline).lineLimit(1)
                Text([effort.isEmpty ? "Default level" : effort.capitalized, serviceTier.isEmpty ? "Standard" : serviceTier.capitalized].joined(separator: " · ")).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            }.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        }.buttonStyle(.plain).accessibilityLabel("Model and turn options").accessibilityIdentifier("composer-options")
        .popover(isPresented: $showingOptions) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    compactSection("Model", selected: model, choices: [("", "Provider default")] + models.map { ($0["id"].string, $0["name"].string.isEmpty ? $0["id"].string : $0["name"].string) }) { model = $0 }
                    if !efforts.isEmpty || !effort.isEmpty { compactSection("Level", selected: effort, choices: [("", "Provider default")] + efforts.map { ($0, controls["reasoningEffortLabels"][$0].string.isEmpty ? $0.capitalized : effortLabel($0)) }) { effort = $0 } }
                    if !speeds.isEmpty || !serviceTier.isEmpty { compactSection("Speed", selected: serviceTier, choices: [("", "Provider default")] + speeds.map { ($0["id"].string, $0["name"].string) }) { serviceTier = $0 } }
                    if tiers.count > 1 || contextTier != "default" { compactSection("Context", selected: contextTier, choices: tiers.map { ($0["id"].string, modelContextLabel($0)) }) { contextTier = $0 } }
                    Button("Refresh models") { Task { await store.loadModels(force: true, provider: provider) } }.font(.caption)
                    Button("Done") { showingOptions = false }.frame(maxWidth: .infinity, alignment: .trailing)
                }.padding().disclosureGroupStyle(NativeGreenDisclosureStyle())
            }.frame(minWidth: 270, idealWidth: 320, maxWidth: 400, maxHeight: 460).background(NativeTheme.surface)
                .presentationCompactAdaptation(.popover)
        }
    }
    private func compactSection(_ name: String, selected: String, choices: [(String, String)], select: @escaping (String) -> Void) -> some View {
        DisclosureGroup {
            ForEach(choices, id: \.0) { choice in
                Button { select(choice.0) } label: {
                    HStack { Text(choice.1).frame(maxWidth: .infinity, alignment: .leading); if choice.0 == selected { Image(systemName: "checkmark").foregroundStyle(NativeTheme.accent) } }.padding(.vertical, 8)
                }.buttonStyle(.plain).accessibilityIdentifier("composer-choice-" + name + "-" + choice.0)
            }
        } label: { Text(name).font(.subheadline.weight(.semibold)) }
        .accessibilityIdentifier("composer-section-" + name)
    }
    private var optionMenus: some View {
            Group {
                Menu {
                    Picker("Model", selection: $model) {
                        if !models.contains(where: { $0["id"].string == model }) { Text(model.isEmpty ? "Choose model" : model + " · unavailable").tag(model) }
                        ForEach(models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : $0["name"].string).tag($0["id"].string) }
                    }
                    Text("Changes apply to your next turn. Steering keeps the running model. Earlier history remains; the provider may compact it to fit.")
                    Button("Refresh models") { Task { await store.loadModels(force: true, provider: provider) } }
                } label: { label(selected["name"].string.isEmpty ? (model.isEmpty ? "Model" : model) : selected["name"].string, name: "Model") }.accessibilityIdentifier("composer-model")
                if !efforts.isEmpty || !effort.isEmpty {
                    Menu {
                        Picker(effortTitle, selection: $effort) {
                            Text("Provider default").tag(""); ForEach(efforts, id: \.self) { Text(effortLabel($0)).tag($0) }
                            if !effort.isEmpty && !efforts.contains(effort) { Text(effort + " · unavailable").tag(effort) }
                        }
                    } label: { label(effort.isEmpty ? "Default" : effort.capitalized, name: "Level") }.accessibilityIdentifier("composer-effort")
                }
                if !speeds.isEmpty || !serviceTier.isEmpty {
                    Menu {
                        Picker("Speed", selection: $serviceTier) {
                            Text("Provider default").tag(""); ForEach(speeds, id: \.self) { Text($0["name"].string).tag($0["id"].string) }
                            if !serviceTier.isEmpty && !speeds.contains(where: { $0["id"].string == serviceTier }) { Text(serviceTier + " · unavailable").tag(serviceTier) }
                        }
                    } label: { label(serviceTier.isEmpty ? "Standard" : serviceTier.capitalized, name: "Speed") }.accessibilityIdentifier("composer-speed")
                }
                if tiers.count > 1 || contextTier != "default" {
                    Menu {
                        Picker("Context size", selection: $contextTier) {
                            ForEach(tiers, id: \.self) { Text(modelContextLabel($0)).tag($0["id"].string) }
                            if !tiers.contains(where: { $0["id"].string == contextTier }) { Text(contextTier + " · unavailable").tag(contextTier) }
                        }
                    } label: { label(tiers.first(where: { $0["id"].string == contextTier }).map { $0["promptTokens"].int > 0 ? modelTokenSize($0["promptTokens"]) : $0["id"].string } ?? contextTier, name: "Context") }.accessibilityIdentifier("composer-context")
                }
            }.font(.caption).foregroundStyle(.secondary).buttonStyle(.plain)
    }
    private func label(_ title: String, name: String) -> some View { VStack(alignment: .leading, spacing: 3) { Text(name).font(.system(size: 10)).foregroundStyle(.secondary); HStack(spacing: 4) { Text(title).foregroundStyle(.primary).lineLimit(1); Image(systemName: "chevron.down").font(.caption2) } }.frame(minHeight: 44).frame(maxWidth: name == "Model" ? 180 : 110, alignment: .leading) }
}

private struct NativeGreenDisclosureStyle: DisclosureGroupStyle {
    func makeBody(configuration: Configuration) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { withAnimation(.easeInOut(duration: 0.15)) { configuration.isExpanded.toggle() } } label: {
                HStack(spacing: 12) { Image(systemName: "chevron.right").rotationEffect(.degrees(configuration.isExpanded ? 90 : 0)).foregroundStyle(NativeTheme.accent); configuration.label; Spacer() }.contentShape(Rectangle()).padding(.vertical, 6)
            }.buttonStyle(.plain).accessibilityValue(configuration.isExpanded ? "Expanded" : "Collapsed")
            if configuration.isExpanded { configuration.content.padding(.leading, 26) }
        }
    }
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
func runtimeClockRunning(turns: [JSON], tools: [JSON], verified: Bool) -> Bool {
    verified && (turns.contains { !$0["activeSince"].string.isEmpty } || tools.contains { $0["status"].string == "running" && $0["finishedAt"].string.isEmpty })
}
struct RuntimeTimerView: View {
    @Environment(RemoteStore.self) var store
    var turns: [JSON] = []
    var tools: [JSON] = []
    var total: Bool = false
    var showTitle: Bool = true
    var prominent: Bool = false
    var partial: Bool = false
    var clockRunning: Bool {
        runtimeClockRunning(turns: turns, tools: tools, verified: store.connected && store.runtimeClockOffset != nil)
    }
    var body: some View {
        if clockRunning { TimelineView(.periodic(from: .now, by: 1)) { context in runtime(at: context.date) } }
        else { runtime(at: Date()) }
    }
    private func runtime(at now: Date) -> some View {
            let verified = store.connected && store.runtimeClockOffset != nil
            let hostNow = now.addingTimeInterval(store.runtimeClockOffset ?? 0)
            let intervals = tools.compactMap { tool -> (Date,Date)? in
                guard let start = ProviderAllowance.date(tool["startedAt"].string) else { return nil }
                if let finish = ProviderAllowance.date(tool["finishedAt"].string) { return (start,finish) }
                return verified && tool["status"].string == "running" ? (start,max(start,hostNow)) : nil
            }
            let activityTurns = tools.isEmpty ? [] : store.chats[store.selectedChat ?? ""]?["turns"].array ?? []
            let active = activityTurns.flatMap { turn -> [(Date,Date)] in
                var result = turn["intervals"].array.compactMap { row -> (Date,Date)? in let values=row.array; guard values.count==2, let start=ProviderAllowance.date(values[0].string), let end=ProviderAllowance.date(values[1].string) else { return nil }; return (start,end) }
                if verified, let start=ProviderAllowance.date(turn["activeSince"].string) { result.append((start,hostNow)) }; return result
            }
            let clipped = activityTurns.isEmpty ? intervals : intervals.flatMap { interval in active.map { (max(interval.0,$0.0),min(interval.1,$0.1)) } }
            let durations = turns.compactMap { runtimeSeconds($0,now:hostNow,verified:verified) }
            let fallback: Double? = tools.count == 1 && tools[0]["durationMs"] != .null ? Double(tools[0]["durationMs"].int) / 1000 : nil
            let seconds: Double? = !tools.isEmpty ? (intervals.isEmpty ? fallback : runtimeUnion(clipped)) : durations.isEmpty ? nil : durations.reduce(0,+)
            return Text((total && showTitle ? "Total AI runtime · " : "") + runtimeLabel(seconds) + (partial || turns.contains { $0["incomplete"].bool } ? " · partial" : "") + (store.connected ? "" : " · offline, unverified"))
                .font(prominent ? .system(size: 28, weight: .semibold) : .caption).monospacedDigit().foregroundStyle(prominent ? .primary : .secondary).accessibilityLabel((total ? "Total AI runtime " : "Runtime ") + runtimeLabel(seconds))
    }
}

struct NativeChatUsageView: View {
    let run: JSON
    private var partialClaudeInput: Bool { run["schedule"]["provider"].string == "claude" && run["usage"]["observed"].bool && !run["usage"]["inputComplete"].bool }
    private func tokenValue(_ key: String) -> String {
        let usage = run["usage"]
        return usage["observed"].bool && usage[key] != .null ? usage[key].int.formatted(.number) : "—"
    }
    private func metric<Content: View>(_ label: String, @ViewBuilder value: () -> Content) -> some View {
        VStack(spacing: 6) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            value().monospacedDigit().frame(maxWidth: .infinity).padding(12)
                .background(NativeTheme.background, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeTheme.line))
        }.frame(maxWidth: .infinity)
    }
    var body: some View {
        VStack(spacing: 12) {
            metric("Total AI runtime") { RuntimeTimerView(turns: run["turns"].array, total: true, showTitle: false, prominent: true, partial: run["timingPartial"].bool) }
            metric("Input tokens" + (partialClaudeInput ? " · partial" : "")) { Text(tokenValue("inputTokens")).font(.system(size: 18, weight: .medium)) }
            metric("Output tokens") { Text(tokenValue("outputTokens")).font(.system(size: 18, weight: .medium)) }
            if partialClaudeInput { Text("Earlier Claude input counts may omit cached tokens. This partial total has not been estimated or backfilled.").font(.caption).foregroundStyle(.secondary) }
            Text(run["usage"]["observed"].bool ? "Observed provider usage." : "Provider usage unavailable.").font(.caption).foregroundStyle(.secondary)
        }.multilineTextAlignment(.center).accessibilityIdentifier("chat-usage-summary")
    }
}

/// Copilot Fusion attribution, matching the shared web presentation. Values come
/// only from provider Fusion events; planned models are never shown as used and
/// absent values read “not reported”.
enum NativeFusion {
    static func turn(_ run: JSON, id: String) -> JSON? {
        guard !id.isEmpty else { return nil }
        return run["fusionTurns"].array.first { $0["fusionId"].string == id } ?? (run["fusion"]["fusionId"].string == id ? run["fusion"] : nil)
    }
    static func number(_ value: JSON) -> Double? { if case .number(let v) = value { return v }; return nil }
    static func title(_ value: String) -> String {
        let spaced = value.replacingOccurrences(of: "_", with: " ").replacingOccurrences(of: "-", with: " ")
        return spaced.prefix(1).uppercased() + spaced.dropFirst()
    }
    static func effortLabel(_ run: JSON, _ turn: JSON) -> String {
        let selection = run["fusionSelection"], policy = turn["policy"].string
        if !selection["label"].string.isEmpty && (policy.isEmpty || policy == selection["tier"].string) { return selection["label"].string }
        return policy.isEmpty ? (selection["label"].string.isEmpty ? "Fusion" : selection["label"].string) : title(policy)
    }
    static func finalModel(_ turn: JSON) -> String {
        let final = turn["final"]["sourceModel"].string
        return final.isEmpty ? turn["completion"]["finalSourceModel"].string : final
    }
    /// Models that actually executed, in first-seen order, with their roles.
    static func usedModels(_ turn: JSON) -> [(model: String, roles: [String])] {
        var order: [String] = [], roles: [String: [String]] = [:]
        func add(_ model: String, _ role: String) {
            guard !model.isEmpty else { return }
            if roles[model] == nil { order.append(model); roles[model] = [] }
            if !role.isEmpty && role != "final answer" && !roles[model]!.contains(role) { roles[model]!.append(role) }
        }
        for phase in turn["phases"].array where !phase["model"].string.isEmpty && !phase["status"].string.isEmpty {
            add(phase["model"].string, phase["role"].string.isEmpty ? phase["phaseKind"].string : phase["role"].string)
        }
        for (model, value) in turn["models"].object.sorted(by: { $0.key < $1.key }) where value["requests"].int > 0 || value["roles"].array.contains(.string("final answer")) {
            add(model, ""); for role in value["roles"].array { add(model, role.string) }
        }
        if turn["status"].string == "fallback" { add(turn["fallback"]["fallbackModel"].string, "fallback") }
        add(finalModel(turn), "final answer")
        return order.map { ($0, roles[$0] ?? []) }
    }
    static func plannedOnly(_ turn: JSON) -> [String] {
        let used = Set(usedModels(turn).map(\.model)), plan = turn["plan"]
        var seen = Set<String>(), result: [String] = []
        let planned: [(String, String)] = [("primary", plan["primaryModel"].string), ("review", plan["secondaryModel"].string), ("judge", plan["judgeModel"].string), ("repair", plan["repairModel"].string)] + plan["critics"].array.map { ("critic", $0["model"].string) }
        for (role, model) in planned where !model.isEmpty && !used.contains(model) && seen.insert(model).inserted { result.append("\(model) (\(role))") }
        return result
    }
    static func summary(_ run: JSON, _ turn: JSON) -> String {
        var parts = ["Fusion " + effortLabel(run, turn)]
        if !turn["pattern"].string.isEmpty { parts.append(title(turn["pattern"].string)) }
        let final = finalModel(turn), status = turn["status"].string
        if !final.isEmpty { parts.append("answer by " + final) } else if !["routing", "running"].contains(status) { parts.append("answering model not reported") }
        let others = usedModels(turn).filter { $0.model != final }
        if !others.isEmpty { parts.append("also used " + others.map { $0.roles.isEmpty ? $0.model : "\($0.model) (\($0.roles.joined(separator: ", ")))" }.joined(separator: ", ")) }
        if status == "routing" { parts.append("choosing models…") } else if status == "running" { parts.append("running") }
        if status == "fallback" { parts.append("fallback" + (turn["fallback"]["reason"].string.isEmpty ? "" : ": " + title(turn["fallback"]["reason"].string))) }
        return parts.joined(separator: " · ")
    }
    static func phaseDetail(_ phase: JSON) -> String {
        let usage = phase["usage"]
        var parts: [String] = []
        if !phase["reasoningEffort"].string.isEmpty { parts.append("effort " + phase["reasoningEffort"].string) }
        if phase["conversationScope"].string == "review" { parts.append("read-only review") }
        if let ms = number(phase["durationMs"]) { parts.append(ms < 1000 ? "\(Int(ms)) ms" : String(format: "%.1f s", ms / 1000)) }
        if let input = number(usage["inputTokens"]) { parts.append("\(Int(input)) in") }
        if let output = number(usage["outputTokens"]) { parts.append("\(Int(output)) out") }
        if let requests = number(usage["requestCount"]) { parts.append("\(Int(requests)) " + (requests == 1 ? "request" : "requests")) }
        if let nano = number(usage["totalNanoAiu"]) { parts.append(String(format: "%.4g AI units", nano / 1e9)) }
        if !phase["verdict"].string.isEmpty { parts.append("verdict " + phase["verdict"].string) }
        if !phase["reason"].string.isEmpty { parts.append("reason " + title(phase["reason"].string)) }
        return parts.joined(separator: " · ")
    }
    static func totals(_ turn: JSON) -> String {
        let completion = turn["completion"]
        var parts: [String] = []
        if let phases = number(completion["phaseCount"]) { parts.append("\(Int(phases)) phases") }
        if let requests = number(completion["requestCount"]) { parts.append("\(Int(requests)) requests") }
        if let input = number(completion["inputTokens"]) { parts.append("\(Int(input)) input tokens") }
        if let output = number(completion["outputTokens"]) { parts.append("\(Int(output)) output tokens") }
        if let nano = number(completion["totalNanoAiu"]) { parts.append(String(format: "%.4g AI units", nano / 1e9)) }
        if let ms = number(completion["durationMs"]) { parts.append(String(format: "%.1f s", ms / 1000)) }
        return parts.isEmpty ? "Turn totals not reported yet." : "Turn totals: " + parts.joined(separator: " · ")
    }
}

struct NativeFusionAttribution: View {
    let run: JSON
    let turn: JSON
    @State private var expanded = false
    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            if expanded {
                VStack(alignment: .leading, spacing: 6) {
                    if !turn["plan"]["hint"].string.isEmpty { Text(turn["plan"]["hint"].string).font(.caption2).foregroundStyle(.secondary) }
                    ForEach(Array(turn["phases"].array.enumerated()), id: \.offset) { _, phase in
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(NativeFusion.title(phase["role"].string.isEmpty ? phase["phaseKind"].string : phase["role"].string)) · \(phase["model"].string.isEmpty ? "model not reported" : phase["model"].string) · \(NativeFusion.title(phase["status"].string.isEmpty ? "pending" : phase["status"].string))").font(.caption)
                            let detail = NativeFusion.phaseDetail(phase)
                            if !detail.isEmpty { Text(detail).font(.caption2).foregroundStyle(.secondary) }
                        }
                    }
                    let planned = NativeFusion.plannedOnly(turn)
                    if !planned.isEmpty { Text("Planned but not run: " + planned.joined(separator: ", ")).font(.caption2).foregroundStyle(.secondary) }
                    if turn["fallback"] != .null { Text("Routing fallback to \(turn["fallback"]["fallbackModel"].string.isEmpty ? "a provider model" : turn["fallback"]["fallbackModel"].string)").font(.caption2).foregroundStyle(.secondary) }
                    Text(NativeFusion.totals(turn)).font(.caption2).foregroundStyle(.secondary)
                    Text("Discarded drafts can still have edited files; review workspace changes before committing.").font(.caption2).foregroundStyle(.secondary)
                }.textSelection(.enabled).padding(.top, 4)
            }
        } label: {
            Text(NativeFusion.summary(run, turn)).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.leading)
        }.accessibilityIdentifier("fusion-attribution-" + turn["fusionId"].string)
    }
}

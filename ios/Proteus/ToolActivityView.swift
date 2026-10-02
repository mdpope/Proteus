import SwiftUI

struct ToolActivityView: View {
    let tool: JSON
    @State private var expanded = false
    private var failedCommand: Bool {
        ["bash", "shell", "powershell"].contains(tool["name"].string) && tool["output"].string.range(of: #"<shellId: [^<>\r\n]+ completed with exit code [1-9]\d*>\s*$"#, options: .regularExpression) != nil
    }
    private var status: String { failedCommand ? "failed" : tool["status"].string }
    private func display(_ key: String) -> String {
        let text = tool[key].string
        guard key == "output", let data = text.data(using: .utf8), let value = try? JSONDecoder().decode(JSON.self, from: data) else { return text }
        if value["snapshot"] != .null { return [value["title"].string, value["url"].string, "", value["snapshot"].string].joined(separator: "\n") }
        return value.pretty
    }
    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(["progress", "approval", "arguments", "output", "error", "attachments"], id: \.self) { key in
                    if !tool[key].string.isEmpty {
                        Text(key.capitalized).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                        Text(display(key)).font(.caption.monospaced()).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }.padding(.top, 8)
        } label: {
            HStack(alignment: .top, spacing: 8) {
                if status == "running" { ProgressView().controlSize(.small) }
                else { Image(systemName: status == "completed" ? "checkmark.circle" : "exclamationmark.circle").foregroundStyle(status == "completed" ? Color.green : Color.orange) }
                VStack(alignment: .leading, spacing: 3) {
                    Text(tool["summary"].string).font(.subheadline)
                    Text(status.capitalized + (tool["durationMs"] != .null ? " · \(String(format: "%.1f", Double(tool["durationMs"].int) / 1000))s" : "")).font(.caption).foregroundStyle(.secondary)
                }
            }
        }.padding(12).background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
            .accessibilityIdentifier("tool-activity-\(tool["callId"].string)")
    }
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
    var disabled = false
    private var controls: JSON { store.models.first { $0["id"].string == model }?["controls"] ?? .null }
    private var efforts: [String] { controls["reasoningEfforts"].array.map(\.string) }
    private var tiers: [JSON] { controls["contextTiers"].array }
    var body: some View {
        Picker("Model", selection: $model) {
            Text("Choose model").tag("")
            if !model.isEmpty && !store.models.contains(where: { $0["id"].string == model }) { Text("\(model) · \(store.models.isEmpty ? "catalog not loaded" : "unavailable")").tag(model) }
            ForEach(store.models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : "\($0["name"].string) · \($0["id"].string)").tag($0["id"].string) }
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
        if efforts.isEmpty { Text(controls["reasoningSupported"] == .bool(false) ? "This model does not support thinking effort." : "Thinking effort choices are not reported.").font(.caption).foregroundStyle(.secondary) }
        if controls["maxOutputTokens"].int > 0 { Text("Context size is the prompt budget. Maximum output: \(modelTokenSize(controls["maxOutputTokens"])) tokens.").font(.caption).foregroundStyle(.secondary) }
        Text(store.modelStatus["checkedAt"].string.isEmpty ? "Catalog not checked yet." : "Catalog checked \(store.modelStatus["checkedAt"].string). Refreshes at Mac launch and every five minutes.").font(.caption).foregroundStyle(.secondary)
        if store.modelStatus["stale"].bool { Text("Using last known choices. \(store.modelStatus["error"].string)").font(.caption).foregroundStyle(.orange) }
        Button("Refresh available models") { Task { await store.loadModels(force: true) } }.disabled(!store.connected)
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
    var body: some View {
        if context != .null {
            VStack(alignment: .leading, spacing: 8) {
                Text("Tool approvals").font(.headline)
                Text("Current: \(names[context["mode"].string] ?? context["mode"].string)").font(.caption)
                Text("\(run["automaticApprovals"].int) tool requests approved automatically").font(.caption).foregroundStyle(.secondary)
                Picker("Tool approval mode", selection: $selected) { ForEach(modes, id: \.self) { Text(names[$0]!).tag($0) } }.accessibilityIdentifier("permission-mode")
                Button("Apply permissions now") { apply() }.disabled(busy || !store.connected || selected.isEmpty).accessibilityIdentifier("apply-permissions")
                Text("Applies immediately to this chat, including waiting tools. Saved rules only covers individual grants. Trusted workspace allows its files and read-only tools. Auto-approve tools also permits commands and configured tools; commands can access beyond workspace folders. Questions and enterprise-required approvals still pause.").font(.caption).foregroundStyle(.secondary)
                DisclosureGroup("Authorized folders and saved rules") {
                    Text(context["folders"].pretty + "\n" + context["rules"].pretty).font(.caption.monospaced()).textSelection(.enabled)
                }
            }.task(id: context["id"].string) { selected = context["mode"].string }
        }
    }
    private func apply() {
        busy = true
        Task { defer { busy = false }
            do {
                let updated = try await store.request("chat.permissions", ["id": run["id"], "mode": .string(selected), "expectedContextId": context["id"], "expectedRevision": run["permissionRevision"]])
                store.mergeChat(updated)
            } catch { store.error = error.localizedDescription }
        }
    }
}

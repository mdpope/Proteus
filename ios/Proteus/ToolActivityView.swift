import SwiftUI

struct ToolActivityView: View {
    let tool: JSON
    @State private var expanded = false
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
                if tool["status"].string == "running" { ProgressView().controlSize(.small) }
                else { Image(systemName: tool["status"].string == "completed" ? "checkmark.circle" : "exclamationmark.circle").foregroundStyle(tool["status"].string == "completed" ? Color.green : Color.orange) }
                VStack(alignment: .leading, spacing: 3) {
                    Text(tool["summary"].string).font(.subheadline)
                    Text(tool["status"].string.capitalized + (tool["durationMs"] != .null ? " · \(String(format: "%.1f", Double(tool["durationMs"].int) / 1000))s" : "")).font(.caption).foregroundStyle(.secondary)
                }
            }
        }.padding(12).background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
            .accessibilityIdentifier("tool-activity-\(tool["callId"].string)")
    }
}

struct CopilotModelPicker: View {
    @EnvironmentObject var store: RemoteStore
    @Binding var model: String
    var disabled = false
    var body: some View {
        Picker("Model", selection: $model) {
            Text("Choose model").tag("")
            if !model.isEmpty && !store.models.contains(where: { $0["id"].string == model }) { Text("\(model) · \(store.models.isEmpty ? "catalog not loaded" : "unavailable")").tag(model) }
            ForEach(store.models, id: \.self) { Text($0["name"].string.isEmpty ? $0["id"].string : "\($0["name"].string) · \($0["id"].string)").tag($0["id"].string) }
        }.disabled(disabled).accessibilityIdentifier("model-picker")
        Button("Refresh available models") { Task { await store.loadModels() } }.disabled(!store.connected)
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

import SwiftUI

struct ProviderAllowance {
    let value: JSON
    var windows: [JSON] { value["windows"].array }
    var remaining: Double? {
        windows.compactMap { window -> Double? in
            guard !window["unlimited"].bool, !window["expired"].bool,
                  case .number(let number) = window["remainingPercent"], number.isFinite else { return nil }
            return min(100, max(0, number))
        }.min()
    }
    var unlimited: Bool { !windows.isEmpty && windows.allSatisfy { $0["unlimited"].bool } }
    var label: String { unlimited ? "Unlimited" : remaining.map { $0.formatted(.number.precision(.fractionLength(0...1))) + "%" } ?? "Unavailable" }
    var stale: Bool {
        if value["stale"].bool || !value["error"].string.isEmpty { return true }
        guard let checked = Self.date(value["checkedAt"].string) else { return true }
        return Date().timeIntervalSince(checked) >= 300
    }
    static func date(_ text: String) -> Date? {
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }
    static let providers = [("copilot", "Copilot"), ("codex", "Codex"), ("claude", "Claude")]
}

struct ProviderUsageStrip: View {
    @ObservedObject var store: RemoteStore
    @State private var collapsed: Bool?
    @State private var details = false
    private var isCollapsed: Bool { collapsed ?? store.state["appearance"]["providerUsageCollapsed"].bool }
    var body: some View {
        if store.usageEnabled {
            VStack(spacing: 8) {
                HStack {
                    Button { collapsed = !isCollapsed } label: { Label("AI usage", systemImage: isCollapsed ? "chevron.right" : "chevron.down").font(.caption.bold()) }.accessibilityIdentifier("toggle-provider-usage")
                    Spacer()
                    if store.usageBusy { ProgressView().controlSize(.mini) }
                    Button("Details") { details = true }.font(.caption).accessibilityIdentifier("provider-usage-details")
                }
                if !isCollapsed {
                    HStack(spacing: 8) {
                        ForEach(ProviderAllowance.providers, id: \.0) { id, label in
                            let summary = ProviderAllowance(value: store.state["providerUsage"]["providers"][id])
                            Button { details = true } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(label).font(.caption).foregroundStyle(.secondary)
                                    AllowanceMeter(remaining: summary.remaining, unlimited: summary.unlimited, label: summary.label)
                                    if !store.connected || summary.stale { Text("Last known").font(.caption2).foregroundStyle(.secondary) }
                                }.frame(maxWidth: .infinity, alignment: .leading)
                            }.buttonStyle(.plain).accessibilityLabel(label + ": " + summary.label + " remaining").accessibilityIdentifier("usage-" + id)
                        }
                    }
                }
            }.padding(.horizontal).padding(.vertical, 8).background(.bar)
                .sheet(isPresented: $details) { NavigationStack { ProviderUsageDetails(store: store) } }
                .task(id: store.connected) {
                    while store.connected && !Task.isCancelled {
                        await store.loadUsage()
                        do { try await Task.sleep(for: .seconds(300)) } catch { return }
                    }
                }
        }
    }
}

struct AllowanceMeter: View {
    let remaining: Double?
    var unlimited = false
    let label: String
    var body: some View {
        Text(label).font(.caption.weight(.semibold)).monospacedDigit().foregroundStyle(.primary)
            .frame(maxWidth: .infinity).padding(.vertical, 6)
            .background {
                GeometryReader { geometry in
                    Capsule().fill(Color.green.opacity(0.13))
                    if let amount = unlimited ? 100 : remaining {
                        Capsule().fill(Color.green.opacity(0.42)).frame(width: geometry.size.width * min(100, max(0, amount)) / 100)
                    }
                }.clipShape(Capsule())
            }
    }
}

struct ProviderUsageDetails: View {
    @ObservedObject var store: RemoteStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        List {
            Section {
                Text(store.state["hostName"].string).font(.headline)
                Text(store.connected ? "Account allowances reported by this Mac’s providers." : "Mac offline. Displaying its cached account allowances.").foregroundStyle(.secondary)
                if !store.state["providerUsage"]["error"].string.isEmpty { Text(store.state["providerUsage"]["error"].string).foregroundStyle(.orange) }
            }
            ForEach(ProviderAllowance.providers, id: \.0) { id, label in
                let value = store.state["providerUsage"]["providers"][id]
                let summary = ProviderAllowance(value: value)
                Section(label) {
                    if summary.windows.isEmpty { Text("Usage unavailable").foregroundStyle(.secondary) }
                    ForEach(Array(summary.windows.enumerated()), id: \.offset) { _, window in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(window["label"].string).font(.subheadline.bold())
                            let allowance = ProviderAllowance(value: .object(["windows": .array([window])]))
                            AllowanceMeter(remaining: allowance.remaining, unlimited: allowance.unlimited, label: allowance.label + (allowance.remaining != nil ? " remaining" : ""))
                            if let reset = ProviderAllowance.date(window["resetAt"].string) {
                                Text(reset > Date() ? "Resets \(reset.formatted(date: .abbreviated, time: .shortened))" : "Reported reset has passed; refresh for current allowance.").font(.caption).foregroundStyle(.secondary)
                            } else if !window["resetNote"].string.isEmpty { Text(window["resetNote"].string).font(.caption).foregroundStyle(.secondary) }
                            else { Text("Next reset not reported").font(.caption).foregroundStyle(.secondary) }
                        }.padding(.vertical, 4)
                    }
                    if let checked = ProviderAllowance.date(value["checkedAt"].string) { Text("Checked \(checked.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary) }
                    if let observed = ProviderAllowance.date(value["observedAt"].string) { Text("Observed \(observed.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary) }
                    if summary.stale || !store.connected { Text("Last known allowance; it may have changed.").font(.caption).foregroundStyle(.orange) }
                    if !value["error"].string.isEmpty { Text(value["error"].string).font(.caption).foregroundStyle(.orange) }
                }
            }
        }.navigationTitle("AI usage")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }; ToolbarItem(placement: .primaryAction) { Button { Task { await store.loadUsage(force: true) } } label: { Image(systemName: "arrow.clockwise") }.disabled(!store.connected || store.usageBusy).accessibilityLabel("Refresh provider usage") } }
    }
}

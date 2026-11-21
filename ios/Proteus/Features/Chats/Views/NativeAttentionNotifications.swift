import SwiftUI

struct NativeOperationFilterButton: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title).font(.caption).lineLimit(1).fixedSize()
                .padding(.horizontal, 10).padding(.vertical, 7).frame(minHeight: 44)
        }
        .buttonStyle(.borderless)
        .background(selected ? NativeTheme.accent.opacity(0.18) : Color.secondary.opacity(0.12), in: Capsule())
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

enum NativeAttentionCategory: String, CaseIterable, Identifiable {
    case browser = "Browser"
    case reviews = "Approvals & questions"
    case chats = "Chats"
    case life = "Life"
    case connections = "Connections"
    case system = "System"

    var id: Self { self }

    init(_ item: JSON) {
        let nativeType = item["notificationType"].string
        let type = nativeType.isEmpty ? item["type"].string : nativeType
        let kind = item["kind"].string
        if !item["browserIssue"]["kind"].string.isEmpty || kind.hasPrefix("site-") || type.hasPrefix("browser.") || type == "website.notification" { self = .browser }
        else if type == "review.required" || kind == "document" || !item["questionId"].string.isEmpty || !item["requestKind"].string.isEmpty { self = .reviews }
        else if type.hasPrefix("life.") || ["reminder", "document"].contains(item["destination"]["kind"].string) { self = .life }
        else if kind == "connection" || type.hasPrefix("connection.") { self = .connections }
        else if !item["chatId"].string.isEmpty || type.hasPrefix("chat.") || type == "schedule.completed" { self = .chats }
        else { self = .system }
    }

    var tint: Color {
        switch self {
        case .browser: NativeTheme.accent
        case .reviews: .orange
        default: .secondary
        }
    }
}

struct NativeAttentionNotifications: View {
    @EnvironmentObject private var destinations: DestinationStore
    @Binding var query: String
    @Binding var categories: Set<NativeAttentionCategory>
    @Binding var hosts: Set<String>

    var body: some View {
        let items = nativeAttentionItems(destinations)
        let terms = query.split(whereSeparator: \.isWhitespace)
        let scoped = items.filter { item in
            guard hosts.isEmpty || hosts.contains(item.hostID) else { return false }
            let value = item.value
            let text = [value["title"].string, value["notificationTitle"].string, value["body"].string,
                        item.hostName, NativeAttentionCategory(value).rawValue,
                        value["browserIssue"]["kind"].string.replacingOccurrences(of: "-", with: " ")].joined(separator: " ")
            return terms.allSatisfy { text.localizedCaseInsensitiveContains(String($0)) }
        }
        let counts = Dictionary(grouping: scoped) { NativeAttentionCategory($0.value) }.mapValues(\.count)
        let visible = categories.isEmpty ? scoped : scoped.filter { categories.contains(NativeAttentionCategory($0.value)) }
        Section {
            if destinations.destinations.count > 1 {
                ScrollView(.horizontal) {
                    HStack(spacing: 6) {
                        NativeOperationFilterButton(title: "All computers", selected: hosts.isEmpty) { hosts.removeAll() }
                        ForEach(destinations.destinations) { destination in
                            NativeOperationFilterButton(title: destination.label, selected: hosts.contains(destination.id)) {
                                if hosts.remove(destination.id) == nil { hosts.insert(destination.id) }
                            }
                        }
                    }
                }.scrollIndicators(.hidden).accessibilityLabel("Notification computers")
            }
            ScrollView(.horizontal) {
                HStack(spacing: 6) {
                    NativeOperationFilterButton(title: "All \(scoped.count)", selected: categories.isEmpty) { categories.removeAll() }
                    ForEach(NativeAttentionCategory.allCases) { category in
                        NativeOperationFilterButton(title: category.rawValue + " \(counts[category, default: 0])",
                                                    selected: categories.contains(category)) {
                            if categories.remove(category) == nil { categories.insert(category) }
                        }
                        .accessibilityIdentifier("attention-category-" + String(describing: category))
                    }
                }
            }.scrollIndicators(.hidden).accessibilityLabel("Notification categories")
            HStack {
                TextField("Search notifications", text: $query)
                    .accessibilityIdentifier("attention-notification-search")
                if !query.isEmpty || !hosts.isEmpty || !categories.isEmpty {
                    Button("Clear filters") { query = ""; hosts.removeAll(); categories.removeAll() }
                        .buttonStyle(.borderless)
                }
            }
        }
        ForEach(visible) { item in
            notification(item)
        }
        if visible.isEmpty { Text(items.isEmpty ? "No notifications need action." : "No matching notifications.").foregroundStyle(.secondary) }
    }

    private func notification(_ item: NativeAttentionItem) -> some View {
        let category = NativeAttentionCategory(item.value)
        return VStack(alignment: .leading, spacing: 6) {
            Text(item.value["title"].string).font(.headline)
            Text(category.rawValue + " · " + item.hostName).font(.caption).foregroundStyle(.secondary)
            if !item.value["body"].string.isEmpty { Text(item.value["body"].string) }
            if item.value["browserIssue"]["kind"].string == "history-conflict" {
                Text("Resolve this history conflict on \(item.hostName).").font(.caption).foregroundStyle(.secondary)
            }
            HStack {
                if !item.value["chatId"].string.isEmpty {
                    Button("Open chat") { NativeNotifications.shared.receivedTap(["hostId": item.hostID, "chatId": item.value["chatId"].string, "type": "review.required", "questionId": item.value["questionId"].string, "requestId": item.value["requestId"].string]) }
                }
                if item.value["kind"].string == "connection" {
                    Button("Open connections") { NativeNotifications.shared.route = .init(hostID: item.hostID, chatID: "", scheduleID: "", type: "connection") }
                }
                if !item.value["notificationId"].string.isEmpty {
                    Button("Mark read") {
                        Task {
                            if let remote = destinations.remote(for: item.hostID) {
                                _ = try? await remote.request("notifications.read", ["id": item.value["notificationId"]])
                                await remote.refresh()
                            }
                        }
                    }
                }
            }.buttonStyle(.borderless)
        }
        .padding(.leading, 9)
        .overlay(alignment: .leading) { Capsule().fill(category.tint).frame(width: 3).accessibilityHidden(true) }
    }
}

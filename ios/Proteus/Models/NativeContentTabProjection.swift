import Foundation

struct NativeContentTab: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let kind: String
    let hostID: String?
    var setup: NativeChatSetup? = nil
    var resourceScope: String? = nil
    var sourceChatID: String? = nil
    var documentID: String? = nil
    var resource: JSON? = nil
}

struct NativeBrowserMembership: Equatable {
    let id: String
    let scope: String
    init(_ tab: BrowserDescriptor) { id = tab.id; scope = tab.scope }
}

enum NativeContentTabProjection {
    static func restored(_ tabs: [NativeContentTab], browserIDs: Set<String>, hosts: Set<String>, account: String) -> [NativeContentTab] {
        tabs.filter { tab in
            if tab.kind == "browser" { return browserIDs.contains(tab.id) }
            if tab.kind == "reminder" { return tab.resource?["accountID"].string == account }
            guard let host = tab.hostID, hosts.contains(host) else { return false }
            if ["scratch", "files"].contains(tab.kind) { return tab.resource?["hostID"].string == host }
            return ["chat", "schedule", "workspace", "chat-setup", "document"].contains(tab.kind)
        }
    }
    /// Page titles, history and reading positions do not change shell membership.
    /// Build locally, preserving insertion origins, then publish one state change.
    static func mainBrowsers(_ tabs: [BrowserDescriptor], opened: [NativeContentTab], insertionOrigin: (String) -> String?) -> [NativeContentTab] {
        let main = tabs.filter { $0.scope == "main" }, mainIDs = Set(main.map(\.id))
        var result = opened, existing = Set(opened.map(\.id))
        for tab in main where existing.insert(tab.id).inserted {
            let item = NativeContentTab(id: tab.id, title: tab.title, kind: "browser", hostID: nil)
            if let source = insertionOrigin(tab.id), let index = result.firstIndex(where: { $0.id == source && $0.kind == "browser" }) { result.insert(item, at: index + 1) }
            else { result.append(item) }
        }
        result.removeAll { $0.kind == "browser" && !mainIDs.contains($0.id) }
        return result
    }

    /// Preserve local browser aliases, document IDs, unknown owner descriptors and
    /// the first matching descriptor without rescanning the browser list per row.
    static func ordered(_ tabs: [JSON], order: [String], browserAliases: [String: String]) -> [JSON] {
        var aliases: [String: [String]] = [:]
        for (local, owner) in browserAliases { aliases[owner, default: []].append(local) }
        var first: [String: Int] = [:]
        var keys: [[String]] = []
        for (index, tab) in tabs.enumerated() {
            let names = [tab["id"].string, tab["documentId"].string] + (aliases[tab["id"].string] ?? [])
            keys.append(names)
            for name in names where first[name] == nil { first[name] = index }
        }
        let selected = Set(order)
        return order.compactMap { first[$0].map { tabs[$0] } } + tabs.enumerated().compactMap { index, tab in
            keys[index].contains(where: selected.contains) ? nil : tab
        }
    }
}

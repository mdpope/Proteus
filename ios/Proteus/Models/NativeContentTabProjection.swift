import Foundation

enum NativeContentTabProjection {
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

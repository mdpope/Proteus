import Foundation

/// Organizational identity is scoped to its owner; names are never persistence keys.
struct NativeProjectIdentity: Hashable {
    let hostID: String
    let workspaceID: String
    let projectID: String
    var scope: String { "project:" + hostID + ":" + projectID }
}

/// Keep the full owner document so additive fields survive caching and offline use.
struct NativeProjectCatalog {
    let raw: JSON
    /// Validated once per catalog; lookups run for every sidebar row and chat membership.
    let isValid: Bool
    init(raw: JSON) { self.raw = raw; isValid = Self.validate(raw) }
    private static func validate(_ raw: JSON) -> Bool {
        guard raw["schemaVersion"].int == 1, case .array(let rows) = raw["projects"], case .object = raw["defaultProjectIds"] else { return false }
        var ids = Set<String>()
        return rows.allSatisfy { !$0["id"].string.isEmpty && !$0["workspaceId"].string.isEmpty && !$0["name"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && ids.insert($0["id"].string).inserted }
    }
    var revision: JSON { raw["revision"] }
    func projects(in workspaceID: String) -> [JSON] {
        guard isValid else { return [] }
        return raw["projects"].array.filter { $0["workspaceId"].string == workspaceID }
    }
    /// Follow only explicit same-workspace redirects. Broken/cyclic metadata stays unresolved.
    func project(id: String, workspaceID: String? = nil) -> JSON? {
        guard isValid, !id.isEmpty else { return nil }
        var candidate = id, workspace = workspaceID, seen = Set<String>()
        while seen.insert(candidate).inserted {
            let row = raw["projects"].array.first { $0["id"].string == candidate }
            if let row {
                if let workspace, row["workspaceId"].string != workspace { return nil }
                workspace = row["workspaceId"].string
            }
            if let redirect = raw["projectRedirects"].object[candidate] {
                guard !redirect["workspaceId"].string.isEmpty, !redirect["projectId"].string.isEmpty,
                      workspace == nil || workspace == redirect["workspaceId"].string else { return nil }
                workspace = redirect["workspaceId"].string; candidate = redirect["projectId"].string
            } else { return row }
        }
        return nil
    }
    func defaultProject(in workspaceID: String) -> JSON? { project(id: raw["defaultProjectIds"][workspaceID].string, workspaceID: workspaceID) }
    func membership(for chat: JSON) -> JSON {
        let authoritative = isValid ? raw["memberships"].object[chat["id"].string] : nil
        var result = (authoritative ?? chat).object
        // Explicit null membership means unhoused; never recover it from captured execution context.
        let workspace = result["workspaceId"]?.string ?? ""
        guard !workspace.isEmpty else { return .object(result) }
        let projectID = result["projectId"]?.string ?? ""
        let target = project(id: projectID, workspaceID: workspace) ?? (projectID.isEmpty ? defaultProject(in: workspace) : nil)
        if let target { result["projectId"] = target["id"]; result["projectName"] = target["name"] }
        return .object(result)
    }
}

enum NativeProjectActivity {
    /// Focus, reads, title changes and legacy retention touches are not activity.
    static func date(_ item: JSON) -> Date? {
        for key in ["lastActivityAt", "createdAt", "openedAt"] {
            if let date = parse(item[key].string) { return date }
        }
        return nil
    }
    // Sidebar recents sort on every redraw. A new formatter per comparison dominated the main
    // thread with real hosts, so reuse the shared parser and remember recent results.
    private static let memoLock = NSLock()
    nonisolated(unsafe) private static var memo: [String: Date] = [:]
    private static func parse(_ text: String) -> Date? {
        guard !text.isEmpty else { return nil }
        memoLock.lock(); if let date = memo[text] { memoLock.unlock(); return date }; memoLock.unlock()
        guard let date = ProviderAllowance.date(text) else { return nil }
        memoLock.lock(); if memo.count > 4096 { memo.removeAll(keepingCapacity: true) }; memo[text] = date; memoLock.unlock()
        return date
    }
    /// Same sidebar membership as desktop: project chats plus all saved resource
    /// tabs visible in navigation. Hidden tabs stay on the Tabs management page;
    /// closed archived chats stay out of history.
    static func items(tabs: [JSON], chats: [JSON], browserIDs: [String: String] = [:]) -> [JSON] {
        let runs = Dictionary(chats.map { ($0["id"].string, $0) }, uniquingKeysWith: { first, _ in first })
        var seenChats = Set<String>(), seenResources = Set<String>()
        var items: [JSON] = []
        let hiddenChats = Set(tabs.filter { $0["hidden"].bool && $0["type"].string == "chat" }.map { $0["chatId"].string })
        for tab in tabs where !tab["hidden"].bool {
            let id = tab["id"].string
            guard !id.isEmpty else { continue }
            var row = tab.object
            if tab["type"].string == "chat" {
                let chatID = tab["chatId"].string
                guard !chatID.isEmpty, seenChats.insert(chatID).inserted else { continue }
                let run = runs[chatID] ?? .null
                if !run["title"].string.isEmpty { row["title"] = run["title"] }
                if row["title"]?.string.isEmpty != false { row["title"] = .string("Chat") }
                let activity = [tab, run].compactMap { item -> (Date, String)? in
                    for key in ["lastActivityAt", "createdAt", "openedAt"] {
                        if let date = ProviderAllowance.date(item[key].string) { return (date, item[key].string) }
                    }
                    return nil
                }.max { $0.0 < $1.0 }
                if let activity { row["lastActivityAt"] = .string(activity.1) }
                if run["chatType"] != .null { row["chatType"] = run["chatType"] }
                row["navigationID"] = .string("chat:" + chatID)
            } else {
                guard seenResources.insert(id).inserted else { continue }
                row["navigationID"] = .string(tab["type"].string == "browser" ? browserIDs[id] ?? "remote:" + id : "remote:" + id)
            }
            items.append(.object(row))
        }
        for run in chats {
            let id = run["id"].string
            guard !id.isEmpty, !hiddenChats.contains(id), !run["archived"].bool, run["archivedAt"].string.isEmpty, seenChats.insert(id).inserted else { continue }
            var row = run.object; row["type"] = .string("chat"); row["chatId"] = run["id"]
            row["navigationID"] = .string("chat:" + id)
            items.append(.object(row))
        }
        return newestFirst(items)
    }
    /// Newest first, computing each item's activity date once rather than per comparison.
    static func newestFirst(_ items: [JSON]) -> [JSON] {
        items.map { ($0, date($0) ?? .distantPast) }.sorted {
            if $0.1 != $1.1 { return $0.1 > $1.1 }
            let title = $0.0["title"].string.localizedStandardCompare($1.0["title"].string)
            if title != .orderedSame { return title == .orderedAscending }
            return $0.0["id"].string < $1.0["id"].string
        }.map(\.0)
    }
}

func nativeNeedsAttention(_ run: JSON) -> Bool {
    guard !run["archived"].bool, run["archivedAt"].string.isEmpty else { return false }
    if run["attentionRequired"] != .null { return run["attentionRequired"].bool }
    return run["status"].string == "awaiting_input" || (["failed", "interrupted"].contains(run["status"].string) && run["failureReviewedAt"].string.isEmpty)
}

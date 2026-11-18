import Foundation
import SQLite3

/// Account-scoped SQLite replica. The server owns revisions and effects; this
/// actor applies its change feed and serves local views off the main actor.
actor LifeReminderReplica {
    private let url: URL
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    init(root: URL? = nil) {
        url = (root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/life")).appendingPathComponent("reminders.sqlite")
    }
    private func database<T>(_ action: (OpaquePointer) throws -> T) throws -> T {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        var connection: OpaquePointer?
        guard sqlite3_open(url.path, &connection) == SQLITE_OK, let db = connection else { if let connection { sqlite3_close(connection) }; throw RemoteError(message: "Reminder cache could not open.") }
        defer { sqlite3_close(db) }
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
        var path = url; var attributes = URLResourceValues(); attributes.isExcludedFromBackup = true; try path.setResourceValues(attributes)
        try execute(db, "CREATE TABLE IF NOT EXISTS records (account TEXT, kind TEXT, id TEXT, revision INTEGER, json TEXT, PRIMARY KEY(account,kind,id)); CREATE TABLE IF NOT EXISTS cursors (account TEXT PRIMARY KEY, cursor INTEGER, context TEXT); CREATE TABLE IF NOT EXISTS recents (account TEXT,id TEXT,touched REAL,PRIMARY KEY(account,id));")
        return try action(db)
    }
    private func execute(_ db: OpaquePointer, _ sql: String) throws {
        guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw RemoteError(message: "Reminder cache could not be updated.") }
    }
    private func statement(_ db: OpaquePointer, _ sql: String, _ values: [String], action: (OpaquePointer) throws -> Void) throws {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let statement else { throw RemoteError(message: "Reminder cache query failed.") }
        defer { sqlite3_finalize(statement) }
        for (index, value) in values.enumerated() { sqlite3_bind_text(statement, Int32(index + 1), value, -1, transient) }
        try action(statement)
    }
    private func rows(_ db: OpaquePointer, _ sql: String, _ values: [String]) throws -> [[String]] {
        var rows: [[String]] = []
        try statement(db, sql, values) { statement in
            while sqlite3_step(statement) == SQLITE_ROW { rows.append((0..<sqlite3_column_count(statement)).map { String(cString: sqlite3_column_text(statement, $0)) }) }
        }
        return rows
    }
    private func json(_ text: String) throws -> JSON { try JSONDecoder().decode(JSON.self, from: Data(text.utf8)) }
    private func text(_ value: JSON) throws -> String { String(decoding: try JSONEncoder().encode(value), as: UTF8.self) }
    func cursor(_ account: String) throws -> Int { try database { db in Int(try rows(db, "SELECT cursor FROM cursors WHERE account=?", [account]).first?.first ?? "0") ?? 0 } }
    func apply(_ account: String, page: JSON) throws {
        guard case .number(let cursor) = page["cursor"], cursor >= 0, cursor <= 9_007_199_254_740_991, cursor.rounded() == cursor, case .array(let changes) = page["changes"] else { throw RemoteError(message: "Invalid reminder change feed.") }
        try database { db in
            let prior = Int(try rows(db, "SELECT cursor FROM cursors WHERE account=?", [account]).first?.first ?? "-1") ?? -1
            guard Int(cursor) >= prior else { return }
            if Int(cursor) == prior { return }
            try execute(db, "BEGIN IMMEDIATE")
            do {
                for change in changes {
                    let record = change["record"], kind = change["kind"].string
                    guard ["reminder", "list"].contains(kind), !record["id"].string.isEmpty, record["revision"].int > 0 else { throw RemoteError(message: "Invalid reminder record.") }
                    try statement(db, "INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(account,kind,id) DO UPDATE SET revision=excluded.revision,json=excluded.json WHERE excluded.revision>=records.revision", [account, kind, record["id"].string, String(record["revision"].int), try text(record)]) { guard sqlite3_step($0) == SQLITE_DONE else { throw RemoteError(message: "Reminder cache write failed.") } }
                }
                var context = page.object; context.removeValue(forKey: "changes"); context.removeValue(forKey: "hasMore")
                try statement(db, "INSERT INTO cursors VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET cursor=excluded.cursor,context=excluded.context", [account, String(Int(cursor)), try text(.object(context))]) { guard sqlite3_step($0) == SQLITE_DONE else { throw RemoteError(message: "Reminder cursor write failed.") } }
                try execute(db, "COMMIT")
            } catch { try? execute(db, "ROLLBACK"); throw error }
        }
    }
    func read(_ account: String, query: [String: JSON], offline: Bool) throws -> JSON {
        try database { db in
            guard let context = try rows(db, "SELECT context FROM cursors WHERE account=?", [account]).first?.first else { throw RemoteError(message: "Connect to Life to download reminders first.") }
            var result = try json(context).object
            let all = try rows(db, "SELECT kind,json FROM records WHERE account=?", [account])
            let lists = try all.filter { $0[0] == "list" }.map { try json($0[1]) }.filter { $0["deletedAt"] == .null }
            var records = try all.filter { $0[0] == "reminder" }.map { try json($0[1]) }
            result["lists"] = .array(lists); result["cached"] = .bool(offline); result["readOnly"] = .bool(offline || result["readOnly"]?.bool == true)
            if let id = query["id"]?.string, !id.isEmpty {
                guard let record = records.first(where: { $0["id"].string == id }) else { throw RemoteError(message: "Reminder unavailable.") }; result["record"] = record
                try statement(db, "INSERT INTO recents VALUES(?,?,?) ON CONFLICT(account,id) DO UPDATE SET touched=excluded.touched", [account, id, String(Date().timeIntervalSince1970)]) { guard sqlite3_step($0) == SQLITE_DONE else { throw RemoteError(message: "Reminder history could not save.") } }
            } else {
                let deleted = query["deleted"]?.bool == true, completed = query["completed"]?.string ?? "open", list = query["listId"]?.string ?? "", search = query["search"]?.string ?? "", workspace = query["workspaceId"]?.string ?? "", project = query["projectId"]?.string ?? ""
                records = records.filter { row in (row["deletedAt"] != .null) == deleted && (completed == "all" || (row["completedAt"] != .null) == (completed == "completed")) && (list.isEmpty || row["listId"].string == list) && (workspace.isEmpty || row["workspaceId"].string == workspace) && (project.isEmpty || row["projectId"].string == project) && (search.isEmpty || row["title"].string.localizedCaseInsensitiveContains(search)) }
                let key: (JSON) -> String = { row in switch query["sort"]?.string ?? "due" { case "title": row["title"].string; case "created": row["createdAt"].string; case "list": lists.first { $0["id"] == row["listId"] }?["name"].string ?? ""; default: !row["dueDate"].string.isEmpty ? row["dueDate"].string : !row["dueAt"].string.isEmpty ? row["dueAt"].string : "9999" } }
                records.sort { key($0) == key($1) ? $0["id"].string < $1["id"].string : key($0).localizedStandardCompare(key($1)) == .orderedAscending }
                let page = max(1, query["page"]?.int ?? 1); result["total"] = .number(Double(records.count)); result["page"] = .number(Double(page)); result["items"] = .array(Array(records.dropFirst((page - 1) * 100).prefix(100)))
            }
            return .object(result)
        }
    }
    func recents(_ account: String) throws -> [JSON] { try database { db in try rows(db, "SELECT records.json FROM recents JOIN records ON records.account=recents.account AND records.id=recents.id AND records.kind='reminder' WHERE recents.account=? ORDER BY touched DESC LIMIT 100", [account]).map { try json($0[0]) }.filter { $0["deletedAt"] == .null }.map { .object(["id": $0["id"], "title": $0["title"]]) } } }
    func clear(_ account: String) throws { try database { db in for table in ["records", "cursors", "recents"] { try statement(db, "DELETE FROM \(table) WHERE account=?", [account]) { guard sqlite3_step($0) == SQLITE_DONE else { throw RemoteError(message: "Reminder cache clear failed.") } } } } }
}

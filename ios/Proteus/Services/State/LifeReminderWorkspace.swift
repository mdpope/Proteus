import Foundation
import Combine

@MainActor final class LifeReminderDraft: ObservableObject {
    var loaded = false
    @Published var savedRecord: JSON = .null
    @Published var title = ""
    @Published var notes = ""
    @Published var listID = ""
    @Published var workspaceID = ""
    @Published var projectID = ""
    @Published var dueKind = "none"
    @Published var dueDate = ""
    @Published var dueAt = ""
    @Published var chosenDate = Date()
    @Published var zone = ""
    @Published var error = ""
    @Published var busy = false
    @Published var operation: (String, [String: JSON], String)?
    @Published var account = ""
}

@MainActor final class LifeReminderWorkspace: ObservableObject {
    @Published var tabs: [JSON] = []
    @Published var selected = "master"
    @Published var listID = ""
    @Published var completed = "open"
    @Published var statuses: Set<String> = ["open"]
    @Published var sort = "due"
    @Published var deleted = false
    @Published var page = 1
    @Published var pending: (String, [String: JSON], String)?
    var tabIDs: [String] { tabs.map { $0["id"].string.isEmpty ? "new" : $0["id"].string } }
    func row(_ id: String) -> JSON { tabs.first { ($0["id"].string.isEmpty ? "new" : $0["id"].string) == id } ?? .null }
    var drafts: [String: LifeReminderDraft] = [:]
    var workbenches: [String: LifeReminderWorkspace] = [:]
    func workbench(_ id: String) -> LifeReminderWorkspace {
        if let value = workbenches[id] { return value }
        let value = LifeReminderWorkspace()
        let initial = row(id)
        if !initial["id"].string.hasPrefix("all:") { value.open(initial) }
        workbenches[id] = value
        return value
    }
    func openAll(listID: String = "") {
        let id = "all:" + UUID().uuidString
        tabs.append(.object(["id": .string(id), "title": .string("All Items")]))
        let child = LifeReminderWorkspace(); child.listID = listID; workbenches[id] = child
        selected = id
    }
    func updateTitle(_ id: String, record: JSON) {
        guard let index = tabs.firstIndex(where: { $0["id"].string == id }) else { return }
        var value = tabs[index].object; value["title"] = record["title"]; value["resourceID"] = record["id"]
        tabs[index] = .object(value)
    }
    func open(_ row: JSON) {
        let id = row["id"].string.isEmpty ? "new" : row["id"].string
        if let existing = tabs.first(where: { $0["resourceID"].string == id }) { selected = existing["id"].string; return }
        if !tabs.contains(where: { ($0["id"].string.isEmpty ? "new" : $0["id"].string) == id }) {
            if drafts[id] == nil { drafts[id] = LifeReminderDraft() }; tabs.append(row)
        }
        selected = id
    }
    func openResource(_ row: JSON) {
        open(row)
        _ = workbench(selected)
    }
    func close(_ id: String) {
        tabs.removeAll { ($0["id"].string.isEmpty ? "new" : $0["id"].string) == id }
        // Keep an unsaved draft when its tab is closed; a later explicit open can recover it.
        if selected == id { selected = "master" }
    }
    func saved(_ row: JSON, replacing oldID: String) {
        let id = row["id"].string
        guard !id.isEmpty else { return }
        if let index = tabs.firstIndex(where: { ($0["id"].string.isEmpty ? "new" : $0["id"].string) == oldID }) { tabs[index] = row }
        if id != oldID { drafts[id] = drafts.removeValue(forKey: oldID) }
        selected = id
    }
    func clear() { workbenches = [:]; tabs = []; drafts = [:]; selected = "master"; listID = ""; completed = "open"; statuses = ["open"]; sort = "due"; deleted = false; page = 1; pending = nil }
}


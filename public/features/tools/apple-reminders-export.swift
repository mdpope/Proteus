import Darwin
import EventKit
import Foundation

private enum ExportError: LocalizedError {
    case permission, fetch, dueDate(String)
    var errorDescription: String? {
        switch self {
        case .permission: "Allow Reminders access for this export in System Settings."
        case .fetch: "Apple Reminders did not return a complete snapshot. Export again."
        case .dueDate(let id): "Could not export the due date for reminder \(id)."
        }
    }
}

@main
struct AppleRemindersExport {
    static func main() async {
        do {
            let store = EKEventStore()
            let allowed: Bool
            if #available(macOS 14, *) {
                allowed = try await store.requestFullAccessToReminders()
            } else {
                allowed = try await store.requestAccess(to: .reminder)
            }
            guard allowed else { throw ExportError.permission }
            let calendars = store.calendars(for: .reminder)
            var byList: [String: [[String: Any]]] = [:]
            if !calendars.isEmpty {
                // The unfiltered EventKit predicate includes completed and open items.
                let reminders: [EKReminder]? = await withCheckedContinuation { continuation in
                    store.fetchReminders(matching: store.predicateForReminders(in: calendars)) {
                        continuation.resume(returning: $0)
                    }
                }
                guard let reminders else { throw ExportError.fetch }
                for reminder in reminders {
                    guard let calendar = reminder.calendar else { throw ExportError.fetch }
                    byList[calendar.calendarIdentifier, default: []].append(try item(reminder))
                }
            }
            let accounts = try Dictionary(grouping: calendars) { calendar in
                guard let source = calendar.source else { throw ExportError.fetch }
                return source.sourceIdentifier
            }
            let accountRows: [[String: Any]] = accounts.keys.sorted().compactMap { id in
                guard let lists = accounts[id], let source = lists.first?.source else { return nil }
                return ["format": "proteus-reminders-1", "sourceId": "apple:" + id, "sourceName": source.title,
                    "lists": lists.sorted { $0.calendarIdentifier < $1.calendarIdentifier }.map { calendar in
                        ["id": calendar.calendarIdentifier, "name": calendar.title,
                         "items": (byList[calendar.calendarIdentifier] ?? []).sorted { ($0["id"] as? String ?? "") < ($1["id"] as? String ?? "") }]
                    }]
            }
            let data = try JSONSerialization.data(withJSONObject: ["accounts": accountRows], options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([10]))
        } catch {
            FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
            exit(EXIT_FAILURE)
        }
    }

    private static func stamp(_ value: Date) -> String {
        ISO8601DateFormatter().string(from: value).replacingOccurrences(of: "Z", with: "+00:00")
    }

    private static func item(_ reminder: EKReminder) throws -> [String: Any] {
        let id = reminder.calendarItemIdentifier
        var row: [String: Any] = ["id": id, "title": reminder.title ?? "", "notes": reminder.notes ?? "",
                                  "completed": reminder.isCompleted, "dueKind": "none"]
        if let created = reminder.creationDate { row["createdAt"] = stamp(created) }
        if let completed = reminder.completionDate, reminder.isCompleted { row["completedAt"] = stamp(completed) }
        if var due = reminder.dueDateComponents {
            if due.hour == nil && due.minute == nil && due.second == nil {
                guard let year = due.year, let month = due.month, let day = due.day else { throw ExportError.dueDate(id) }
                row["dueKind"] = "date"
                row["dueDate"] = String(format: "%04d-%02d-%02d", year, month, day)
            } else {
                let zone = due.timeZone ?? due.calendar?.timeZone ?? .current
                var calendar = due.calendar ?? Calendar(identifier: .gregorian)
                calendar.timeZone = zone
                due.timeZone = zone
                guard let date = calendar.date(from: due) else { throw ExportError.dueDate(id) }
                row["dueKind"] = "datetime"
                row["dueAt"] = stamp(date)
                row["timeZone"] = zone.identifier
            }
        }
        var extras: [String: Any] = [:]
        if let url = reminder.url { extras["url"] = url.absoluteString }
        if reminder.priority != 0 { extras["priority"] = reminder.priority }
        if let modified = reminder.lastModifiedDate { extras["modifiedAt"] = stamp(modified) }
        if let alarms = reminder.alarms, !alarms.isEmpty {
            extras["alarms"] = alarms.map { alarm -> [String: Any] in
                var value: [String: Any] = ["offset": alarm.relativeOffset]
                if let date = alarm.absoluteDate { value["at"] = stamp(date) }
                if let location = alarm.structuredLocation {
                    value["location"] = location.title
                    if let point = location.geoLocation {
                        value["latitude"] = point.coordinate.latitude
                        value["longitude"] = point.coordinate.longitude
                    }
                    value["proximity"] = alarm.proximity.rawValue
                }
                return value
            }
        }
        if let rules = reminder.recurrenceRules, !rules.isEmpty {
            extras["recurrence"] = rules.map { rule -> [String: Any] in
                var value: [String: Any] = ["frequency": rule.frequency.rawValue, "interval": rule.interval,
                    "daysOfWeek": (rule.daysOfTheWeek ?? []).map { ["day": $0.dayOfTheWeek.rawValue, "week": $0.weekNumber] },
                    "daysOfMonth": rule.daysOfTheMonth ?? [], "months": rule.monthsOfTheYear ?? [],
                    "weeks": rule.weeksOfTheYear ?? [], "daysOfYear": rule.daysOfTheYear ?? [],
                    "positions": rule.setPositions ?? [], "firstDayOfWeek": rule.firstDayOfTheWeek]
                if let end = rule.recurrenceEnd {
                    if let date = end.endDate { value["endAt"] = stamp(date) }
                    if end.occurrenceCount > 0 { value["occurrenceCount"] = end.occurrenceCount }
                }
                return value
            }
        }
        if !extras.isEmpty { row["extras"] = extras }
        return row
    }
}

import Foundation

enum NativeHistoryWindow {
    static let pageCount = 12
    static let pageBytes = 48 * 1024
    static let olderPageCount = 24
    static let olderPageBytes = 96 * 1024
    static func start(events: [JSON], before: Int? = nil, preparingOlder: Bool = false) -> Int {
        let end = min(events.count, max(0, before ?? events.count))
        let rowBudget = preparingOlder ? olderPageCount : pageCount
        let byteBudget = preparingOlder ? olderPageBytes : pageBytes
        var start = end, bytes = 0, rows = 0, lastActivity = false
        while start > 0 && end - start < 100 {
            let event = events[start - 1]
            let activity = NativeActivity.contains(event)
            let cost = activity && lastActivity ? 0 : 1
            let size = activity ? 0 : event["text"].string.utf8.count
            if start < end && (bytes + size > byteBudget || rows + cost > rowBudget) { break }
            bytes += size; rows += cost; lastActivity = activity; start -= 1
        }
        return start
    }
    static func presentedStart(events: [JSON], loadedStart: Int, requestedStart: Int?) -> Int {
        let fallback = loadedStart + start(events: events)
        guard let requestedStart else { return fallback }
        // A bookmark may refer to a newer/longer cached incarnation. Display a
        // nonempty page while retaining the original request for later restore.
        if !events.isEmpty, requestedStart >= loadedStart + events.count { return fallback }
        return max(loadedStart, min(requestedStart, loadedStart + events.count))
    }
    static func shouldPrefetch(offset: CGFloat, viewport: CGFloat, content: CGFloat, reading: Bool, ready: Bool) -> Bool {
        guard ready, reading, viewport > 0, content > 0 else { return false }
        // A short restored viewport is not a request to reveal another page.
        return offset < max(480, viewport * 2.5)
    }
}

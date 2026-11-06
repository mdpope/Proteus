import Foundation

/// Formatting belongs to presentation state, not each list row's body. Cache only
/// a bounded set of non-secret timestamps; locale/time-zone changes reset it.
@MainActor enum NativeChatTimestamp {
    private static let fractional: ISO8601DateFormatter = {
        let value = ISO8601DateFormatter(); value.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return value
    }()
    private static let whole = ISO8601DateFormatter()
    private static let display = DateFormatter()
    private static var configuration = ""
    private static var values: [String: String] = [:]
    static func text(_ run: JSON, timeZone: TimeZone) -> String {
        let next = timeZone.identifier + ":" + Locale.current.identifier
        if configuration != next {
            configuration = next; values.removeAll(keepingCapacity: true)
            display.locale = .current; display.timeZone = timeZone; display.dateStyle = .short; display.timeStyle = .short
        }
        let value = run["updatedAt"].string.isEmpty ? run["createdAt"].string : run["updatedAt"].string
        if let cached = values[value] { return cached }
        let result = (fractional.date(from: value) ?? whole.date(from: value)).map(display.string(from:)) ?? ""
        if values.count >= 1024 { values.removeAll(keepingCapacity: true) }
        values[value] = result
        return result
    }
}

import Foundation
import UIKit

/// Build once from an immutable history snapshot, away from the UI actor.
/// Keystrokes search the prepared rows; date parsing and sorting are not layout work.
struct NativeBrowserHistoryIndex: Sendable {
    private struct Row: Sendable { let value: JSON; let search: String }
    private let rows: [Row]
    init(_ items: [JSON]) {
        let formatter = ISO8601DateFormatter()
        let fractional = ISO8601DateFormatter(); fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        func date(_ item: JSON) -> Date {
            let text = item["visitedAt"].string.isEmpty ? item["createdAt"].string : item["visitedAt"].string
            return fractional.date(from: text) ?? formatter.date(from: text) ?? .distantPast
        }
        var sorted: [(index: Int, value: JSON, date: Date)] = []
        sorted.reserveCapacity(items.count)
        for (index, value) in items.enumerated() { sorted.append((index: index, value: value, date: date(value))) }
        sorted.sort { left, right in
            if left.date == right.date { return left.index < right.index }
            return left.date > right.date
        }
        var seen = Set<String>()
        rows = sorted.compactMap { item in
            let text = item.value["url"].string
            guard let url = URLComponents(string: text), ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.host?.isEmpty == false, url.user == nil, url.password == nil, seen.insert(text).inserted else { return nil }
            return Row(value: item.value, search: item.value["title"].string + " " + text)
        }
    }
    func matching(_ query: String, limit: Int = 20) -> [JSON] {
        let terms = query.split(whereSeparator: \.isWhitespace).map(String.init)
        return Array(rows.lazy.filter { row in terms.allSatisfy { row.search.localizedCaseInsensitiveContains($0) } }.prefix(max(0, limit)).map(\.value))
    }
}

// Shared descriptors contain identity and navigation, never live page authority.
struct BrowserNavigationState: Equatable {
    var url = ""
    var title = ""
    var canGoBack = false
    var canGoForward = false
    var isLoading = false
}
struct BrowserHistoryEntry: Codable, Equatable {
    var id: String = UUID().uuidString; var url: String; var title: String; var requestedURL: String? = nil
    enum CodingKeys: String, CodingKey { case id, url, title, requestedURL }
    init(id: String = UUID().uuidString, url: String, title: String, requestedURL: String? = nil) { self.id = id; self.url = url; self.title = title; self.requestedURL = requestedURL }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: CodingKeys.self); id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString; url = try c.decode(String.self, forKey: .url); title = try c.decode(String.self, forKey: .title); requestedURL = try c.decodeIfPresent(String.self, forKey: .requestedURL) }
}
struct BrowserTabHistory: Codable, Equatable {
    var entries: [BrowserHistoryEntry]; var index: Int; var currentEntryId: String? = nil; var revision: Int = 0
    enum CodingKeys: String, CodingKey { case entries, index, currentEntryId, revision }
    init(entries: [BrowserHistoryEntry], index: Int, currentEntryId: String? = nil, revision: Int = 0) { self.entries = entries; self.index = index; self.currentEntryId = currentEntryId; self.revision = revision }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: CodingKeys.self); entries = try c.decode([BrowserHistoryEntry].self, forKey: .entries); currentEntryId = try c.decodeIfPresent(String.self, forKey: .currentEntryId); index = try c.decodeIfPresent(Int.self, forKey: .index) ?? 0; revision = try c.decodeIfPresent(Int.self, forKey: .revision) ?? 0; if let currentEntryId, let selected = entries.firstIndex(where: { $0.id == currentEntryId }) { index = selected } }
}
struct BrowserHistoryItem: Hashable { var index: Int; var url: URL; var title: String?; var entryId: String? = nil }
struct BrowserDescriptor: Identifiable, Codable, Equatable {
    var id: String; var title: String; var url: String?; var scope: String; var customTitle: String?; var contentTabId: String?; var history: BrowserTabHistory?; var profileId: String; var ownerHostId: String? = nil
    var hidden = false; var persist = false; var openedAt: String?; var lastTouchedAt: String?; var lastActivityAt: String?
    init(id: String, title: String, url: String?, scope: String = "team", customTitle: String? = nil, contentTabId: String? = nil, history: BrowserTabHistory? = nil, profileId: String = "default") { self.profileId = profileId; self.history = history; self.id = id; self.title = title; self.url = url; self.scope = scope; self.customTitle = customTitle; self.contentTabId = contentTabId }
    enum CodingKeys: String, CodingKey { case id, title, url, scope, customTitle, contentTabId, history, profileId, ownerHostId, hidden, persist, openedAt, lastTouchedAt, lastActivityAt }
    init(from decoder: Decoder) throws { let values = try decoder.container(keyedBy: CodingKeys.self); id = try values.decode(String.self, forKey: .id); title = try values.decode(String.self, forKey: .title); url = try values.decodeIfPresent(String.self, forKey: .url); scope = try values.decodeIfPresent(String.self, forKey: .scope) ?? "team"; customTitle = try values.decodeIfPresent(String.self, forKey: .customTitle); contentTabId = try values.decodeIfPresent(String.self, forKey: .contentTabId); history = try values.decodeIfPresent(BrowserTabHistory.self, forKey: .history); profileId = try values.decodeIfPresent(String.self, forKey: .profileId) ?? "default"; ownerHostId = try values.decodeIfPresent(String.self, forKey: .ownerHostId); hidden = try values.decodeIfPresent(Bool.self, forKey: .hidden) ?? false; persist = try values.decodeIfPresent(Bool.self, forKey: .persist) ?? false; openedAt = try values.decodeIfPresent(String.self, forKey: .openedAt); lastTouchedAt = try values.decodeIfPresent(String.self, forKey: .lastTouchedAt); lastActivityAt = try values.decodeIfPresent(String.self, forKey: .lastActivityAt) }
}
struct NativeDocumentDescriptor: Identifiable, Codable, Equatable {
    let id: String
    var chatKey: String
    let title: String
    let mediaType: String
    var parentID: String? = nil
    var relativePath: String? = nil
    var customTitle: String? = nil
    var previewSource: String? = nil
    var previewTabID: String? = nil
    var previewVersion: String? = nil
    // Contents and consent do not survive a cold launch; publish the first fresh read even
    // when its hash matches the persisted descriptor. Keep this state out of CodingKeys.
    var sourceChatID: String? = nil
    var previewLoaded = false
    enum CodingKeys: String, CodingKey { case id, chatKey, title, mediaType, parentID, relativePath, customTitle, previewSource, previewTabID, previewVersion, sourceChatID }
}
struct NativeDocumentSession {
    let requestID: String
    let version: String
    let readAt: String
    let assets: [JSON]
    let links: [JSON]
    let assetDataURLs: [String: String]
    var fileCreatedAt = ""
    var fileModifiedAt = ""
}
struct NativeDraftAttachment: Identifiable {
    let id: String
    let name: String
    let mediaType: String
    let bytes: Data
    var createdAt: String? = nil
    var modifiedAt: String? = nil
    var image: UIImage? { mediaType.hasPrefix("image/") ? UIImage(data: bytes) : nil }
}

extension NativeDraftAttachment {
    var fileDates: [String: JSON] {
        var values: [String: JSON] = [:]
        if let createdAt { values["createdAt"] = .string(createdAt) }; if let modifiedAt { values["modifiedAt"] = .string(modifiedAt) }; return values
    }
}

struct BrowserChatDraft: Identifiable { let id: UUID; let hostID: String; let hostName: String }
struct BrowserExportFile: Identifiable {
    let id: UUID
    let url: URL
    func cleanup() { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
}

struct NativeBrowserNavigationConflict: Identifiable, Codable, Equatable {
    var id: String
    var scope: String
    var tabID: String
    var tab: BrowserDescriptor
    var operations: [JSON]
    var receipt: JSON? = nil
}

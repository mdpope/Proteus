import Foundation

/// A device-local setup tab. It grants no authority to start a chat or change owner.
struct NativeChatSetup: Codable, Equatable, Identifiable {
    var id = UUID().uuidString.lowercased()
    let hostID: String
    var workspaceID: String? = nil
    var projectID: String? = nil
    var internet = false
    var title: String { internet ? "Internet Search" : "New chat" }
    var draftKey: String { "chat-setup:" + id }
    var json: JSON { (try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(self))) ?? .null }
    static func decode(_ value: JSON) -> Self? { try? JSONDecoder().decode(Self.self, from: JSONEncoder().encode(value)) }
}

import XCTest
@testable import Proteus

final class RemoteTests: XCTestCase {
    @MainActor func testNativeEncryptedRoundTripAndContinuation() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONDecoder().decode(JSON.self, from: data)
        let decoded = try RemoteCrypto.open(fixture["box"].string, key: fixture["key"].string, aad: fixture["aad"].string)
        XCTAssertEqual(decoded["test"].string, "CryptoKit ↔ Node")
        XCTAssertThrowsError(try RemoteCrypto.open(fixture["box"].string, key: fixture["key"].string, aad: "wrong"))
        let store = RemoteStore(); store.forget(); try store.pair(fixture["code"].string)
        defer { store.forget() }
        try await wait { store.connected && store.state["context"]["workspaces"].array.count > 0 }
        let created = try await store.request("chat.start", ["prompt": .string("Native encrypted test"), "provider": .string("rehearsal"), "workspaceId": store.state["context"]["defaultWorkspaceId"]])
        let id = created["runId"].string; XCTAssertFalse(id.isEmpty)
        await store.openChat(id)
        try await wait { store.chats[id]?["status"].string == "awaiting_input" }
        let pending = store.chats[id]!["pending"]
        _ = try await store.request("chat.reply", ["id": .string(id), "answer": .string("Native feedback"), "requestId": pending["id"]])
        try await wait { store.chats[id]?["status"].string == "completed" }
        XCTAssertTrue(store.chats[id]!["events"].array.contains { $0["text"].string.contains("Native feedback") })
        store.disconnect(); store.activity(true)
        try await wait { store.connected }
        _ = try await store.request("chat.resume", ["id": .string(id), "prompt": .string("Continue the same native session")])
        await store.openChat(id)
        try await wait { store.chats[id]?["status"].string == "awaiting_input" }
        XCTAssertEqual(store.chats[id]?["id"].string, id)
        _ = try await store.request("chat.cancel", ["id": .string(id)])
    }
    @MainActor func testHistoryPagesStayContiguousWhenNewMessagesArrive() {
        let store = RemoteStore(); store.forget()
        func page(_ first: Int, _ last: Int) -> JSON {
            .object(["id": .string("synthetic"), "eventStart": .number(Double(first)), "eventCount": .number(Double(last + 1)), "earlier": .number(Double(first)), "events": .array((first...last).map { .object(["text": .string(String($0))]) })])
        }
        store.mergeChat(page(100, 199)); store.mergeChat(page(0, 99)); store.mergeChat(page(101, 200))
        XCTAssertEqual(store.chats["synthetic"]?["events"].array.count, 201)
        XCTAssertEqual(store.chats["synthetic"]?["events"].array.last?["text"].string, "200")
        XCTAssertEqual(store.chats["synthetic"]?["earlier"].int, 0)
        store.mergeChat(page(1000, 1099))
        XCTAssertEqual(store.chats["synthetic"]?["events"].array.count, 100)
        XCTAssertEqual(store.chats["synthetic"]?["earlier"].int, 1000)
    }
    @MainActor private func wait(_ predicate: () -> Bool) async throws {
        for _ in 0..<200 { if predicate() { return }; try await Task.sleep(for: .milliseconds(100)) }
        XCTFail("Native client did not reach expected state"); throw RemoteError(message: "Timed out")
    }
}

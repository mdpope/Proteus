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
    @MainActor func testQueueWhileWaitingRunsAfterReply() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONDecoder().decode(JSON.self, from: data)
        let store = RemoteStore(); store.forget(); try store.pair(fixture["code"].string)
        defer { store.forget() }
        try await wait { store.connected && store.state["context"]["workspaces"].array.count > 0 }
        let result = try await store.request("chat.start", ["prompt":.string("First queued rehearsal"),"provider":.string("rehearsal"),"workspaceId":store.state["context"]["defaultWorkspaceId"]])
        let id = result["runId"].string; await store.openChat(id)
        try await wait { store.chats[id]?["status"].string == "awaiting_input" }
        let pending = store.chats[id]!["pending"]["id"]
        _ = try await store.request("chat.send", ["id":.string(id),"prompt":.string("Second queued rehearsal"),"mode":.string("queue"),"messageId":.string(UUID().uuidString)])
        await store.openChat(id); XCTAssertEqual(store.chats[id]?["queuedMessages"].array.count, 1)
        _ = try await store.request("chat.reply", ["id":.string(id),"answer":.string("First feedback"),"requestId":pending])
        try await wait { store.chats[id]?["status"].string == "awaiting_input" && store.chats[id]?["pending"]["id"] != pending }
        XCTAssertEqual(store.chats[id]?["queuedMessages"].array.count, 0)
        _ = try await store.request("chat.cancel", ["id":.string(id)])
    }
    @MainActor private func wait(_ predicate: () -> Bool) async throws {
        for _ in 0..<200 { if predicate() { return }; try await Task.sleep(for: .milliseconds(100)) }
        XCTFail("Native client did not reach expected state"); throw RemoteError(message: "Timed out")
    }
}

final class DestinationTests: XCTestCase {
    @MainActor private func fixture() throws -> (URL, String) {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("proteus-destinations-" + UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return (root, "org.proteusapp.proteus.test." + UUID().uuidString)
    }
    private func credential(_ id: String) -> DeviceConnection { DeviceConnection(relay: "wss://relay.example.test", hostId: id, deviceId: UUID().uuidString, key: RemoteCrypto.random()) }
    @MainActor func testLegacyPairingAndEncryptedHistoryMigrateWithoutLoss() throws {
        let (root, service) = try fixture(); defer { try? FileManager.default.removeItem(at: root); DeviceKeychain.clear(service: service) }
        let connection = credential(UUID().uuidString)
        defer { DeviceKeychain.clear(hostID: connection.hostId, service: service) }
        try DeviceKeychain.save(connection, service: service)
        let cache: JSON = .object(["state": .object(["hostName": .string("Original Mac")]), "chats": .object(["same-id": .object(["id": .string("same-id"), "title": .string("Original chat")])]), "cursor": .string("original-cursor")])
        try Data(RemoteCrypto.seal(cache, key: connection.key, aad: "proteus-cache-v1").utf8).write(to: root.appendingPathComponent("cache.enc"))
        let destinations = DestinationStore(root: root, keychainService: service)
        XCTAssertNil(destinations.error); XCTAssertEqual(destinations.destinations.count, 1)
        XCTAssertEqual(destinations.selectedID, connection.hostId); XCTAssertEqual(destinations.selected?.chats["same-id"]?["title"].string, "Original chat")
        XCTAssertNil(DeviceKeychain.load(service: service)); XCTAssertEqual(DeviceKeychain.load(hostID: connection.hostId, service: service)?.deviceId, connection.deviceId)
        let migrated = try XCTUnwrap(destinations.selected); migrated.flushCache()
        let opened = try RemoteCrypto.open(String(contentsOf: migrated.cacheURL, encoding: .utf8), key: connection.key, aad: "proteus-cache-v1")
        XCTAssertEqual(opened["cursor"].string, "original-cursor")
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("cache.enc").path))
        let restored = DestinationStore(root: root, keychainService: service)
        XCTAssertEqual(restored.selected?.state["hostName"].string, "Original Mac")
    }
    @MainActor func testHostKeysCachesDraftsAndForgetRemainIndependentOnSharedRelay() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let personal = credential(UUID().uuidString), work = credential(UUID().uuidString)
        try destinations.register(personal, label: "Build Mac")
        let first = try XCTUnwrap(destinations.selected)
        first.state = .object(["hostName": .string("Personal"), "schedules": .array([.string("personal-only")])]); first.chats["same-id"] = .object(["title": .string("Personal chat")]); first.setDraft("reply:same-id", .string("Personal draft"))
        try destinations.register(work, label: "Work Mac")
        let second = try XCTUnwrap(destinations.selected)
        XCTAssertTrue(first !== second); XCTAssertEqual(second.state, .null); XCTAssertNil(second.chats["same-id"]); XCTAssertEqual(second.draft("reply:same-id"), .null)
        second.state = .object(["hostName": .string("Work")]); second.chats["same-id"] = .object(["title": .string("Work chat")]); second.setDraft("reply:same-id", .string("Work draft")); second.flushCache()
        try destinations.select(personal.hostId, connect: false)
        XCTAssertEqual(destinations.selected?.draft("reply:same-id").string, "Personal draft"); XCTAssertEqual(destinations.selected?.state["schedules"].array, [.string("personal-only")])
        XCTAssertNotEqual(first.cacheURL, second.cacheURL)
        XCTAssertThrowsError(try RemoteCrypto.open(String(contentsOf: first.cacheURL, encoding: .utf8), key: work.key, aad: "proteus-cache-v1"))
        XCTAssertEqual(DeviceKeychain.load(hostID: personal.hostId, service: service)?.key, personal.key)
        XCTAssertEqual(DeviceKeychain.load(hostID: work.hostId, service: service)?.key, work.key)
        let indexText = try String(contentsOf: destinations.indexURL, encoding: .utf8)
        XCTAssertFalse(indexText.contains(personal.key)); XCTAssertFalse(indexText.contains(work.deviceId)); XCTAssertFalse(indexText.contains("Personal draft"))
        try destinations.rename(work.hostId, label: "Work Mac")
        XCTAssertThrowsError(try destinations.add("invalid", label: "Another Mac")); XCTAssertEqual(destinations.destinations.count, 2)
        try destinations.forget(work.hostId)
        XCTAssertEqual(destinations.destinations.map(\.id), [personal.hostId]); XCTAssertNil(DeviceKeychain.load(hostID: work.hostId, service: service)); XCTAssertFalse(FileManager.default.fileExists(atPath: second.cacheURL.path)); XCTAssertNotNil(DeviceKeychain.load(hostID: personal.hostId, service: service))
        let restored = DestinationStore(root: root, keychainService: service)
        XCTAssertEqual(restored.selected?.draft("reply:same-id").string, "Personal draft")
        destinations.activity(false); restored.activity(false)
    }
    @MainActor func testSwitchFailsUnconfirmedCommandsAndOldViewCannotSendToNewHost() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let a = credential(UUID().uuidString), b = credential(UUID().uuidString)
        try destinations.register(a, label: "Personal"); let old = try XCTUnwrap(destinations.selected)
        old.connected = true // No socket: request remains unconfirmed until the explicit switch.
        let pending = Task { try await old.request("chat.start", ["prompt": .string("Must never reach another Mac")]) }
        for _ in 0..<20 { if old.pendingCommandCount == 1 { break }; await Task.yield() }
        XCTAssertEqual(old.pendingCommandCount, 1)
        try destinations.register(b, label: "Work")
        do { _ = try await pending.value; XCTFail("Switch must fail the local pending continuation") } catch { XCTAssertTrue(error.localizedDescription.contains("selection changed")) }
        XCTAssertEqual(old.pendingCommandCount, 0); XCTAssertFalse(old.connected)
        XCTAssertEqual(old.connection?.hostId, a.hostId); XCTAssertEqual(destinations.selected?.connection?.hostId, b.hostId)
        XCTAssertEqual(destinations.selected?.pendingCommandCount, 0)
        do { _ = try await old.request("chat.start"); XCTFail("An old sheet must stay disconnected") } catch { XCTAssertTrue(error.localizedDescription.contains("offline")) }
    }
    @MainActor func testRepairingOneMacReencryptsItsCacheAndPreservesOtherMac() throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let a = credential(UUID().uuidString), b = credential(UUID().uuidString)
        try destinations.register(a, label: "Personal"); destinations.selected?.setDraft("new-chat", .object(["prompt": .string("Keep draft")]))
        try destinations.register(b, label: "Work"); let replacement = credential(a.hostId)
        try destinations.register(replacement, label: "Personal repaired")
        XCTAssertEqual(destinations.destinations.count, 2); XCTAssertEqual(destinations.selected?.draft("new-chat")["prompt"].string, "Keep draft")
        let store = try XCTUnwrap(destinations.selected); let data = try String(contentsOf: store.cacheURL, encoding: .utf8)
        XCTAssertNoThrow(try RemoteCrypto.open(data, key: replacement.key, aad: "proteus-cache-v1")); XCTAssertThrowsError(try RemoteCrypto.open(data, key: a.key, aad: "proteus-cache-v1"))
        XCTAssertEqual(DeviceKeychain.load(hostID: b.hostId, service: service)?.key, b.key)
    }
}

extension DestinationTests {
    @MainActor func testTwoLiveSyntheticMacsShareRelayWithoutSharingRunsOrContext() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        destinations.activity(true)
        func invitation(_ suffix: String = "") async throws -> String {
            let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair" + suffix)!)
            return try JSONDecoder().decode(JSON.self, from: data)["code"].string
        }
        try destinations.add(await invitation(), label: "Build Mac")
        try await destinationWait { destinations.selected?.connected == true && destinations.selected?.state["hostName"].string == "Build Mac" }
        let personal = try XCTUnwrap(destinations.selected), personalID = try XCTUnwrap(destinations.selectedID)
        let a = try await personal.request("chat.start", ["name": .string("Personal-only run"), "prompt": .string("Personal synthetic context"), "provider": .string("rehearsal"), "workspaceId": personal.state["context"]["defaultWorkspaceId"]])
        let aID = a["runId"].string; await personal.openChat(aID); personal.setDraft("reply:" + aID, .string("Private personal draft"))
        try destinations.add(await invitation("?host=second"), label: "Work Mac")
        try await destinationWait { destinations.selectedID != personalID && destinations.selected?.connected == true && destinations.selected?.state["hostName"].string == "Work Mac" }
        let work = try XCTUnwrap(destinations.selected), workID = try XCTUnwrap(destinations.selectedID)
        XCTAssertEqual(work.connection?.relay, personal.connection?.relay); XCTAssertNotEqual(work.connection?.key, personal.connection?.key)
        XCTAssertFalse(work.state["runs"].array.contains { $0["id"].string == aID }); XCTAssertEqual(work.draft("reply:" + aID), .null)
        XCTAssertNotEqual(work.state["context"]["workspaces"], personal.state["context"]["workspaces"])
        let b = try await work.request("chat.start", ["name": .string("Work-only run"), "prompt": .string("Work synthetic context"), "provider": .string("rehearsal"), "workspaceId": work.state["context"]["defaultWorkspaceId"]]); let bID = b["runId"].string
        try destinations.select(personalID); try await destinationWait { personal.connected }; await personal.refresh()
        XCTAssertTrue(personal.state["runs"].array.contains { $0["id"].string == aID }); XCTAssertFalse(personal.state["runs"].array.contains { $0["id"].string == bID })
        XCTAssertEqual(personal.draft("reply:" + aID).string, "Private personal draft"); XCTAssertFalse(work.connected)
        _ = try await personal.request("chat.cancel", ["id": .string(aID)])
        try destinations.select(workID); try await destinationWait { work.connected }; _ = try await work.request("chat.cancel", ["id": .string(bID)])
    }
    @MainActor private func destinationWait(_ predicate: () -> Bool) async throws {
        for _ in 0..<250 { if predicate() { return }; try await Task.sleep(for: .milliseconds(100)) }
        XCTFail("Destination did not reach expected state"); throw RemoteError(message: "Timed out")
    }
}

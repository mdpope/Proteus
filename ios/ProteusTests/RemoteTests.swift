import WebKit
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


extension DestinationTests {
    @MainActor func testRelayValidationMatchesOriginAndLocalNetworkRules() throws {
        for value in ["https://relay.example.test", "ws://relay.example.test", "ws://10.nope.1.2.3", "ws://10.+1.2.3", "ws://10..1.2.3", "wss://user:password@relay.example.test", "wss://relay.example.test/socket", "wss://relay.example.test?host=other", "wss://relay.example.test#fragment", "wss://", "ws://172.32.0.1", "wss://relay.example.test:70000"] {
            XCTAssertThrowsError(try RemoteStore.validatedRelay(value), value)
        }
        for value in ["ws://localhost:4328", "ws://127.0.0.1:4328", "ws://192.168.1.2", "ws://172.16.0.1", "ws://10.2.3.4", "ws://mac.local", "wss://relay.example.test"] { XCTAssertEqual(try RemoteStore.validatedRelay(value), value) }
        XCTAssertEqual(try RemoteStore.validatedRelay("  wss://relay.example.test/\n"), "wss://relay.example.test")
    }
    @MainActor func testEditRelayPreservesCredentialCacheDraftsAndOtherHostAndCancelsPending() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let a = credential(UUID().uuidString), b = credential(UUID().uuidString)
        try destinations.register(a, label: "Personal"); let personal = try XCTUnwrap(destinations.selected)
        personal.chats["chat"] = .object(["title": .string("Keep conversation")]); personal.setDraft("reply:chat", .string("Keep draft")); personal.flushCache()
        let before = try RemoteCrypto.open(String(contentsOf: personal.cacheURL, encoding: .utf8), key: a.key, aad: "proteus-cache-v1")
        try destinations.register(b, label: "Work"); let work = try XCTUnwrap(destinations.selected)
        let otherCache = try Data(contentsOf: work.cacheURL)
        try destinations.editRelay(a.hostId, address: "wss://new.example.test")
        XCTAssertTrue(destinations.selected === work); XCTAssertFalse(personal.connected); XCTAssertEqual(destinations.selectedID, b.hostId)
        XCTAssertEqual(try Data(contentsOf: work.cacheURL), otherCache)
        let saved = try XCTUnwrap(DeviceKeychain.load(hostID: a.hostId, service: service))
        XCTAssertEqual(saved.key, a.key); XCTAssertEqual(saved.deviceId, a.deviceId); XCTAssertEqual(saved.hostId, a.hostId); XCTAssertEqual(saved.relay, "wss://new.example.test")
        XCTAssertEqual(DeviceKeychain.load(hostID: b.hostId, service: service)?.relay, b.relay)
        let after = try RemoteCrypto.open(String(contentsOf: personal.cacheURL, encoding: .utf8), key: a.key, aad: "proteus-cache-v1")
        XCTAssertEqual(before, after)
        try destinations.select(a.hostId, connect: false); personal.activity(true); personal.disconnect(); personal.connected = true
        let pending = Task { try await personal.request("chat.start", ["prompt": .string("Do not replay")]) }
        for _ in 0..<20 { if personal.pendingCommandCount == 1 { break }; await Task.yield() }
        XCTAssertEqual(personal.pendingCommandCount, 1)
        XCTAssertThrowsError(try destinations.editRelay(a.hostId, address: "ws://external.example.test")); XCTAssertTrue(personal.connected); XCTAssertEqual(personal.pendingCommandCount, 1)
        try destinations.editRelay(a.hostId, address: "wss://next.example.test")
        do { _ = try await pending.value; XCTFail("Endpoint change must cancel pending retry") } catch { XCTAssertTrue(error.localizedDescription.contains("Relay address changed")) }
        XCTAssertEqual(personal.pendingCommandCount, 0); XCTAssertFalse(personal.connected); XCTAssertTrue(destinations.selected === personal)
        XCTAssertEqual(personal.connection?.key, a.key); XCTAssertEqual(personal.draft("reply:chat").string, "Keep draft")
        let restored = DestinationStore(root: root, keychainService: service)
        XCTAssertEqual(restored.selected?.connection?.relay, "wss://next.example.test"); XCTAssertEqual(restored.selected?.connection?.deviceId, a.deviceId)
        XCTAssertEqual(restored.selected?.draft("reply:chat").string, "Keep draft"); XCTAssertEqual(restored.selected?.chats["chat"]?["title"].string, "Keep conversation")
        XCTAssertThrowsError(try destinations.editRelay(UUID().uuidString, address: "wss://new.example.test"))
    }
    @MainActor func testLiveRelayEditReconnectsSameHostWithSameKey() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        destinations.activity(true); try destinations.add(try JSONDecoder().decode(JSON.self, from: data)["code"].string, label: "Personal")
        try await destinationWait { destinations.selected?.connected == true }
        let remote = try XCTUnwrap(destinations.selected), original = try XCTUnwrap(remote.connection)
        remote.setDraft("new-chat", .string("Keep live draft"))
        // Same fixture relay, different valid address: requires replacing the WebSocket transport.
        try destinations.editRelay(original.hostId, address: "ws://localhost:4328")
        XCTAssertFalse(remote.connected); XCTAssertEqual(remote.status, "Connecting…")
        try await destinationWait { remote.connected }
        await remote.refresh()
        XCTAssertTrue(destinations.selected === remote); XCTAssertEqual(remote.connection?.relay, "ws://localhost:4328")
        XCTAssertEqual(remote.connection?.key, original.key); XCTAssertEqual(remote.connection?.deviceId, original.deviceId); XCTAssertEqual(remote.connection?.hostId, original.hostId)
        XCTAssertEqual(remote.state["hostName"].string, "Build Mac"); XCTAssertEqual(remote.draft("new-chat").string, "Keep live draft")
    }
}


final class ProviderUsageTests: XCTestCase {
    func testUnknownQuotaIsNotZeroAndLimitingWindowWins() {
        XCTAssertNil(ProviderAllowance(value: .null).remaining)
        XCTAssertEqual(ProviderAllowance(value: .null).label, "Unavailable")
        let value: JSON = .object(["windows":.array([.object(["remainingPercent":.number(73)]),.object(["remainingPercent":.number(41)]),.object(["remainingPercent":.null])])])
        XCTAssertEqual(ProviderAllowance(value:value).remaining,41)
        XCTAssertNil(ProviderAllowance(value:.object(["windows":.array([.object(["remainingPercent":.number(0),"expired":.bool(true)])])])).remaining)
        XCTAssertTrue(ProviderAllowance(value:.object(["windows":.array([.object(["unlimited":.bool(true)])])])).unlimited)
    }
    @MainActor func testQuotaSnapshotIsScopedToMacCacheAndDisabledFlagStopsRefresh() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:root) }
        let connection = DeviceConnection(relay:"ws://localhost:1",hostId:UUID().uuidString,deviceId:UUID().uuidString,key:RemoteCrypto.random())
        let first=RemoteStore(connection:connection,cacheRoot:root.appendingPathComponent("first"),legacyCredentials:false)
        first.state = .object(["appearance":.object(["showProviderUsage":.bool(false)]),"providerUsage":.object(["providers":.object(["copilot":.object(["windows":.array([.object(["remainingPercent":.number(73)])])])])])])
        first.connected=true;await first.loadUsage(force:true);XCTAssertEqual(first.pendingCommandCount,0);first.flushCache()
        let second=RemoteStore(connection:connection,cacheRoot:root.appendingPathComponent("second"),legacyCredentials:false)
        XCTAssertEqual(second.state["providerUsage"],.null)
        let restored=RemoteStore(connection:connection,cacheRoot:root.appendingPathComponent("first"),legacyCredentials:false)
        XCTAssertFalse(restored.usageEnabled);XCTAssertEqual(ProviderAllowance(value:restored.state["providerUsage"]["providers"]["copilot"]).remaining,73)
    }
}

final class LifeTestProtocol:URLProtocol,@unchecked Sendable {
    static var handler:((URLRequest)->(Int,JSON,Double))?
    override class func canInit(with request:URLRequest)->Bool{true}
    override class func canonicalRequest(for request:URLRequest)->URLRequest{request}
    override func startLoading(){
        let result=Self.handler!(request)
        DispatchQueue.global().asyncAfter(deadline:.now()+result.2){[self] in
            client?.urlProtocol(self,didReceive:HTTPURLResponse(url:request.url!,statusCode:result.0,httpVersion:nil,headerFields:["Content-Type":"application/json"])!,cacheStoragePolicy:.notAllowed)
            client?.urlProtocol(self,didLoad:try! JSONEncoder().encode(result.1));client?.urlProtocolDidFinishLoading(self)
        }
    }
    override func stopLoading(){}
    static func session()->URLSession{let c=URLSessionConfiguration.ephemeral;c.protocolClasses=[LifeTestProtocol.self];return URLSession(configuration:c)}
    static func body(_ request:URLRequest)->Data {
        if let data=request.httpBody{return data}
        guard let stream=request.httpBodyStream else{return Data()};stream.open();defer{stream.close()}
        var data=Data();let buffer=UnsafeMutablePointer<UInt8>.allocate(capacity:4096);defer{buffer.deallocate()}
        while stream.hasBytesAvailable{let n=stream.read(buffer,maxLength:4096);if n<=0{break};data.append(buffer,count:n)}
        return data
    }
}
final class LifeNativeTests:XCTestCase {
    private let identity:JSON = .object(["accountId":.string("account-a"),"workspaceId":.string("workspace-a"),"displayName":.string("Synthetic"),"readOnly":.bool(false),"capabilities":.array([.string("nutrition.add")])])
    @MainActor private func fixture(expired:Bool=false)throws->(LifeStore,String){
        let service="org.proteusapp.proteus.life.test."+UUID().uuidString
        let credential=LifeCredential(origin:"https://life.example.test",clientID:"public-client",accessToken:"access-old",refreshToken:"refresh-old",expiresAt:Date().addingTimeInterval(expired ? -1:3600),accountID:"account-a",workspaceID:"workspace-a")
        try LifeKeychain.save(credential,service:service)
        return(LifeStore(keychainService:service,session:LifeTestProtocol.session()),service)
    }
    func testPKCEAndCallbackOriginStateValidation()throws {
        let attempt=LifeOAuthAttempt(state:"state",verifier:"dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
        XCTAssertEqual(attempt.challenge,"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
        XCTAssertEqual(try attempt.code(from:URL(string:"proteus://life-oauth/callback?state=state&code=one")!),"one")
        for value in ["proteus://pair/callback?state=state&code=one","proteus://life-oauth/wrong?state=state&code=one","proteus://life-oauth/callback?state=wrong&code=one","proteus://life-oauth/callback?state=state&state=state&code=one","proteus://life-oauth/callback?state=state&code=one&code=two","proteus://life-oauth/callback?state=state&error=denied"]{XCTAssertThrowsError(try attempt.code(from:URL(string:value)!))}
        for value in ["http://life.example.test","https://user:pass@life.example.test","https://life.example.test/path","https://life.example.test?token=x"]{XCTAssertThrowsError(try LifeOAuthAttempt.origin(value))}
        XCTAssertEqual(try LifeOAuthAttempt.origin("https://life.example.test/"),"https://life.example.test")
    }
    @MainActor func testDataIdentityChangeClearsAccountBeforeReturningRecords()async throws{
        let (store,service)=try fixture();defer{LifeKeychain.clear(service:service)}
        let identity=self.identity
        LifeTestProtocol.handler={request in request.url!.path.hasSuffix("/data") ? (200,.object(["accountId":.string("account-b"),"workspaceId":.string("workspace-b"),"foods":.array([.string("Must not display")])]),0):(200,identity,0)}
        try await store.refreshProfile();XCTAssertTrue(store.connected)
        do{_ = try await store.data(section:"nutrition");XCTFail("Wrong account must not return data")}catch{XCTAssertTrue(error.localizedDescription.contains("changed"))}
        XCTAssertFalse(store.signedIn);XCTAssertEqual(store.profile,.null);XCTAssertNil(LifeKeychain.load(service:service))
    }
    @MainActor func testMutationIncludesExpectedAccountAndRefreshRevocationClearsCredentials()async throws{
        let (store,service)=try fixture();defer{LifeKeychain.clear(service:service)}
        let identity=self.identity;let key=UUID().uuidString
        LifeTestProtocol.handler={request in
            if request.url!.path.hasSuffix("/action"){let body=try! JSONDecoder().decode(JSON.self,from:LifeTestProtocol.body(request));XCTAssertEqual(body["expectedAccountId"].string,"account-a");XCTAssertEqual(body["expectedWorkspaceId"].string,"workspace-a");XCTAssertEqual(body["idempotencyKey"].string,key)}
            return(200,identity,0)
        }
        try await store.refreshProfile();_ = try await store.action("meal.log",input:["food_id":.number(1)],idempotencyKey:key)
        LifeTestProtocol.handler={request in request.url!.path=="/oauth/token" ? (400,.object(["error":.string("invalid_grant")]),0):(401,.null,0)}
        do{_ = try await store.data(section:"nutrition");XCTFail("Revoked session should fail")}catch{}
        XCTAssertFalse(store.signedIn);XCTAssertEqual(store.profile,.null);XCTAssertNil(LifeKeychain.load(service:service))
    }
    @MainActor func testLogoutSettlesInFlightRefreshAndRevokesRotatedToken()async throws{
        let (store,service)=try fixture(expired:true);defer{LifeKeychain.clear(service:service)}
        let refreshed=expectation(description:"Refresh started"),revoked=expectation(description:"Rotated token revoked")
        let identity=self.identity
        LifeTestProtocol.handler={request in
            if request.url!.path=="/oauth/token"{refreshed.fulfill();return(200,.object(["access_token":.string("access-new"),"refresh_token":.string("refresh-new"),"expires_in":.number(3600)]),0.2)}
            if request.url!.path.hasSuffix("/native-session"){XCTAssertEqual(request.value(forHTTPHeaderField:"Authorization"),"Bearer access-new");revoked.fulfill()}
            return(200,identity,0)
        }
        let pending=Task{try? await store.refreshProfile()}
        await fulfillment(of:[refreshed],timeout:3);await store.signOut();await pending.value
        await fulfillment(of:[revoked],timeout:3)
        XCTAssertFalse(store.signedIn);XCTAssertEqual(store.profile,.null);XCTAssertNil(LifeKeychain.load(service:service))
    }
    @MainActor func testDelayedOld401DoesNotRotateAgainOrClearNewToken()async throws{
        let (store,service)=try fixture();defer{LifeKeychain.clear(service:service)}
        let identity=self.identity
        let lock=NSLock();var oldRequests=0;var refreshes=0
        LifeTestProtocol.handler={request in
            if request.url!.path=="/oauth/token"{lock.lock();refreshes += 1;lock.unlock();return(200,.object(["access_token":.string("access-new"),"refresh_token":.string("refresh-new"),"expires_in":.number(3600)]),0.01)}
            if request.value(forHTTPHeaderField:"Authorization")=="Bearer access-old"{lock.lock();oldRequests += 1;let n=oldRequests;lock.unlock();return(401,.null,n==1 ? 0.01:0.15)}
            return(200,identity,0)
        }
        async let first:Void=store.refreshProfile();async let second:Void=store.refreshProfile()
        _ = try await(first,second)
        XCTAssertEqual(refreshes,1);XCTAssertEqual(LifeKeychain.load(service:service)?.accessToken,"access-new");XCTAssertTrue(store.connected)
    }
}


extension DestinationTests {
    @MainActor func testConnectedHostNameHydratesOnlyLegacyPlaceholderAndPreservesCustomNames() throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let a=credential(UUID().uuidString), b=credential(UUID().uuidString)
        try destinations.register(a,label:"My Mac");let first=try XCTUnwrap(destinations.selected)
        destinations.hydrateHostLabel("Work Mac",for:a.hostId)
        XCTAssertEqual(destinations.selectedLabel,"My Mac")
        first.connected=true;destinations.hydrateHostLabel("Work Mac",for:a.hostId)
        XCTAssertEqual(destinations.selectedLabel,"Work Mac")
        destinations.hydrateHostLabel("Changed server name",for:a.hostId)
        XCTAssertEqual(destinations.selectedLabel,"Work Mac")
        try destinations.register(b,label:"Personal custom label");destinations.selected?.connected=true
        destinations.hydrateHostLabel("Build Mac",for:b.hostId)
        XCTAssertEqual(destinations.selectedLabel,"Personal custom label")
        try destinations.rename(a.hostId,label:"My Mac");destinations.hydrateHostLabel("Wrong host",for:a.hostId)
        XCTAssertEqual(destinations.destinations.first(where:{$0.id==a.hostId})?.label,"My Mac")
        try destinations.select(a.hostId,connect:false);first.connected=true
        destinations.hydrateHostLabel("Bad\nname",for:a.hostId)
        XCTAssertEqual(destinations.selectedLabel,"My Mac")
    }
}

@MainActor final class NativeMarkdownResourceTests: XCTestCase {
    func testBundledMarkdownRuntimeRendersAndReportsHeight() async throws {
        let file = try XCTUnwrap(Bundle.main.url(forResource: "native", withExtension: "html", subdirectory: "markdown"))
        let delegate = NativeMarkdownProbe()
        let height = expectation(description: "Native renderer height bridge")
        delegate.height = { main, file, amount in
            XCTAssertTrue(main); XCTAssertTrue(file); XCTAssertGreaterThan(amount, 1); height.fulfill()
        }
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(delegate, name: "markdown")
        let web = WKWebView(frame: CGRect(x:0,y:0,width:350,height:400), configuration: configuration)
        web.navigationDelegate = delegate
        await withCheckedContinuation { continuation in
            delegate.finished = { continuation.resume() }
            web.loadFileURL(file, allowingReadAccessTo: file.deletingLastPathComponent())
        }
        let result: Any = try await withCheckedThrowingContinuation { continuation in
            web.callAsyncJavaScript("window.updateMarkdown('Synthetic **bold**'); return {text:document.body.innerText, height:document.body.getBoundingClientRect().height}", arguments: [:], in: nil, in: .page) { continuation.resume(with: $0) }
        }
        let value = try XCTUnwrap(result as? [String:Any])
        XCTAssertTrue((value["text"] as? String)?.contains("Synthetic bold") == true)
        XCTAssertGreaterThan(value["height"] as? Double ?? 0, 1)
        await fulfillment(of: [height], timeout: 5)
    }
}
@MainActor private final class NativeMarkdownProbe: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    var height:((Bool,Bool,Double)->Void)?
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body=message.body as? [String:Any],body["type"] as? String == "height" else { return }
        height?(message.frameInfo.isMainFrame,message.frameInfo.request.url?.isFileURL == true,body["height"] as? Double ?? 0);height=nil
    }
    var finished:(()->Void)?
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finished?(); finished=nil }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finished?(); finished=nil }
}

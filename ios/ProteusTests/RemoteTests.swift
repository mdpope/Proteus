import WebKit
import AVFoundation
import CryptoKit
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
    @MainActor func testAuthenticatedHostNamesRefreshSelectedAndBackgroundDestinationsWithoutChangingIdentity() throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let a = credential(UUID().uuidString), b = credential(UUID().uuidString)
        try destinations.register(a, label: "Former custom name")
        let first = try XCTUnwrap(destinations.selected)
        first.setDraft("reply:retained", .string("Retained first draft"))
        first.chats["retained"] = .object(["title": .string("Retained first chat")])
        destinations.hydrateHostLabel("Untrusted offline name", for: a.hostId)
        XCTAssertEqual(destinations.selectedLabel, "Former custom name")
        first.connected = true; first.onHostName?("Alpha Mac")
        XCTAssertEqual(destinations.selectedLabel, "Alpha Mac")
        first.onHostName?("Alpha renamed")
        XCTAssertEqual(destinations.selectedLabel, "Alpha renamed")
        try destinations.register(b, label: "Another former custom name")
        let second = try XCTUnwrap(destinations.selected)
        second.connected = true; second.onHostName?("Beta Mac")
        first.connected = true; first.onHostName?("Background Alpha")
        XCTAssertEqual(destinations.selectedID, b.hostId)
        XCTAssertTrue(destinations.selected === second)
        XCTAssertEqual(destinations.selectedLabel, "Beta Mac")
        XCTAssertEqual(destinations.destinations.first(where: { $0.id == a.hostId })?.label, "Background Alpha")
        let before = try Data(contentsOf: destinations.indexURL)
        for name in ["", "  ", "Bad\nname", String(repeating: "x", count: 81)] { first.onHostName?(name) }
        destinations.hydrateHostLabel("Unknown host", for: UUID().uuidString)
        first.connected = false; first.onHostName?("Offline spoof")
        XCTAssertEqual(try Data(contentsOf: destinations.indexURL), before)
        for (store, credential) in [(first, a), (second, b)] {
            XCTAssertEqual(store.connection?.hostId, credential.hostId)
            XCTAssertEqual(store.connection?.deviceId, credential.deviceId)
            XCTAssertEqual(store.connection?.key, credential.key)
            XCTAssertEqual(DeviceKeychain.load(hostID: credential.hostId, service: service)?.key, credential.key)
        }
        XCTAssertEqual(first.draft("reply:retained").string, "Retained first draft")
        XCTAssertEqual(first.chats["retained"]?["title"].string, "Retained first chat")
        let restored = DestinationStore(root: root, keychainService: service)
        XCTAssertEqual(restored.selectedID, b.hostId)
        XCTAssertEqual(restored.destinations.first(where: { $0.id == a.hostId })?.label, "Background Alpha")
        XCTAssertEqual(restored.selectedLabel, "Beta Mac")
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

final class NativeParityTests: XCTestCase {
    @MainActor func testBrowserNavigationPreservesTabAndWebViewAndInvalidatesUnloadedObservers() async throws {
        let shared = SharedAppStore(); shared.open(nil)
        let tab = try XCTUnwrap(shared.browserTabs.first), id = tab.id
        let original = shared.webView(tab)
        XCTAssertTrue(shared.navigate(try XCTUnwrap(URL(string: "http://127.0.0.1:4329/browser/one")), in: id))
        XCTAssertEqual(shared.browserTabs.count, 1); XCTAssertEqual(shared.selectedBrowser, id)
        XCTAssertTrue(shared.webView(try XCTUnwrap(shared.browserTabs.first)) === original)
        for _ in 0..<100 { if shared.browserNavigation[id]?.title == "First browser page" && shared.browserNavigation[id]?.isLoading == false { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertEqual(shared.browserNavigation[id]?.title, "First browser page")
        XCTAssertTrue(shared.navigate(try XCTUnwrap(URL(string: "http://127.0.0.1:4329/browser/two")), in: id))
        for _ in 0..<100 { if shared.browserNavigation[id]?.canGoBack == true && shared.browserNavigation[id]?.title == "Second browser page" { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertTrue(shared.browserNavigation[id]?.canGoBack == true)
        XCTAssertTrue(shared.webView(try XCTUnwrap(shared.browserTabs.first)) === original)
        shared.unload(id)
        XCTAssertFalse(shared.isBrowserLoaded(id)); XCTAssertNil(shared.browserNavigation[id])
        original.loadHTMLString("<title>Stale page</title>", baseURL: nil)
        try await Task.sleep(for: .milliseconds(250))
        XCTAssertNil(shared.browserNavigation[id]); XCTAssertNotEqual(shared.browserTabs.first?.title, "Stale page")
        shared.reload(id)
        let replacement = shared.webView(try XCTUnwrap(shared.browserTabs.first))
        XCTAssertFalse(replacement === original); XCTAssertEqual(shared.browserTabs.count, 1); XCTAssertEqual(shared.selectedBrowser, id)
        shared.close(id); original.stopLoading()
        XCTAssertTrue(shared.browserTabs.isEmpty); XCTAssertNil(shared.selectedBrowser); XCTAssertNil(shared.browserNavigation[id])
    }
    @MainActor func testHistoryVisitUsesStableInstallationIdentityAndActualVisitInstant() throws {
        let suite = "proteus-history-" + UUID().uuidString
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let id = SharedAppStore.historyDeviceID(defaults: defaults)
        XCTAssertNotNil(UUID(uuidString: id))
        XCTAssertEqual(SharedAppStore.historyDeviceID(defaults: try XCTUnwrap(UserDefaults(suiteName: suite))), id)
        let date = try XCTUnwrap(ProviderAllowance.date("2026-10-04T18:00:00Z"))
        let visit = try XCTUnwrap(SharedAppStore.historyVisit(try XCTUnwrap(URL(string: "https://example.test/page?filter=mine#section")), title: "Visited page", at: date, deviceID: id, deviceName: "Visiting iPhone"))
        XCTAssertEqual(visit["visitedAt"].string, "2026-10-04T18:00:00.000Z")
        XCTAssertEqual(visit["deviceId"].string, id)
        XCTAssertEqual(visit["deviceName"].string, "Visiting iPhone")
        XCTAssertEqual(visit["source"].string, "mobile")
        XCTAssertEqual(visit["url"].string, "https://example.test/page")
        XCTAssertEqual(visit["hostId"], .null)
        XCTAssertNil(SharedAppStore.historyVisit(try XCTUnwrap(URL(string: "https://example.test/?token=secret")), title: "Unsafe", at: date, deviceID: id, deviceName: "Phone"))
        XCTAssertNil(SharedAppStore.historyVisit(try XCTUnwrap(URL(string: "https://example.test")), title: "Page", at: date, deviceID: "hardware-id", deviceName: "Phone"))
        XCTAssertEqual(SharedAppStore.historyDeviceName("\n  ", fallback: "iPad"), "iPad")
        XCTAssertEqual(SharedAppStore.historyDeviceName(String(repeating: "x", count: 120)).count, 100)
    }
    @MainActor func testHistoryDetailsUseDeviceZoneAndRetainLegacyUnknownDevice() throws {
        let denver = try XCTUnwrap(TimeZone(identifier: "America/Denver")), tokyo = try XCTUnwrap(TimeZone(identifier: "Asia/Tokyo"))
        let locale = Locale(identifier: "en_US")
        let item: JSON = .object(["visitedAt": .string("2026-10-04T18:00:00Z"), "createdAt": .string("2026-10-05T00:00:00Z"), "deviceName": .string("Visiting iPad")])
        let local = BrowserHistoryRows.details(item, timeZone: denver, locale: locale)
        XCTAssertTrue(local.contains("Oct 4, 2026")); XCTAssertTrue(local.contains("12:00")); XCTAssertTrue(local.contains("Visiting iPad"))
        let away = BrowserHistoryRows.details(item, timeZone: tokyo, locale: locale)
        XCTAssertTrue(away.contains("Oct 5, 2026")); XCTAssertTrue(away.contains("3:00"))
        let legacy: JSON = .object(["createdAt": .string("2026-01-04T18:00:00Z")])
        let old = BrowserHistoryRows.details(legacy, timeZone: denver, locale: locale)
        XCTAssertTrue(old.contains("11:00")); XCTAssertTrue(old.hasSuffix("Unknown device"))
        XCTAssertEqual(BrowserHistoryRows.details(.null, timeZone: denver, locale: locale), "Time unavailable · Unknown device")
    }
    @MainActor func testUnauthenticatedRelayNoticesPreservePairingAndCachedHistory() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let credential = DeviceConnection(relay: "wss://relay.example.test", hostId: UUID().uuidString, deviceId: UUID().uuidString, key: RemoteCrypto.random())
        let store = RemoteStore(connection: credential, cacheRoot: root, legacyCredentials: false)
        store.chats["saved"] = .object(["id": .string("saved"), "title": .string("Synthetic retained history")]); store.setDraft("reply:saved", .string("Retained draft")); store.flushCache()
        let before = try Data(contentsOf: store.cacheURL)
        for type in ["rejected", "revoked"] {
            try await store.receive(.object(["type": .string(type)]))
            XCTAssertTrue(store.paired); XCTAssertEqual(store.connection?.key, credential.key); XCTAssertEqual(store.chats["saved"]?["title"].string, "Synthetic retained history")
            XCTAssertEqual(store.draft("reply:saved").string, "Retained draft"); XCTAssertEqual(try Data(contentsOf: store.cacheURL), before)
        }
        store.error = nil; await store.openChat("saved"); XCTAssertNil(store.error); XCTAssertEqual(store.selectedChat, "saved")
    }
    @MainActor func testSharedAccountScopesRequireExplicitNewConsent() throws {
        let attempt = LifeOAuthAttempt(state: "synthetic-state", verifier: RemoteCrypto.random())
        func scopes(_ shared: Bool) throws -> Set<String> { let url = try attempt.authorization(origin: "https://example.test", clientID: "synthetic", sharedApp: shared); let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false)); return Set((components.queryItems?.first { $0.name == "scope" }?.value ?? "").split(separator: " ").map(String.init)) }
        XCTAssertEqual(try scopes(false), Set(["brain:read", "brain:write"]))
        XCTAssertEqual(try scopes(true), Set(["brain:read", "brain:write", "app:read", "app:write"]))
    }
    @MainActor func testBrowserBookmarksPreserveFiltersWhileHistoryRedactsAndRejectsSecrets() throws {
        let bookmark = "https://dev.azure.com/example/project/_boards/board/t/team/Stories?view=backlog&iteration=42#selected=123"
        let search = "https://example.test/search?q=build%20status#results"
        for input in [bookmark, search, "https://example.test/docs#code-review"] { XCTAssertEqual(SharedAppStore.safeURL(input)?.absoluteString, input) }
        XCTAssertEqual(SharedAppStore.historyURL(bookmark)?.absoluteString, "https://dev.azure.com/example/project/_boards/board/t/team/Stories")
        XCTAssertEqual(SharedAppStore.historyURL(search)?.absoluteString, "https://example.test/search")
        let capsule = try JSONSerialization.data(withJSONObject: ["version": 1, "hostId": "synthetic-host", "relay": "wss://example.test", "key": "synthetic-key", "expiresAt": "2099-01-01T00:00:00Z"]).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        let unsafe = ["https://user:password@example.test/", "javascript:alert(1)", "https://example.test/oauth/callback?code=secret", "https://example.test/page?access_token=secret", "https://example.test/signin", "https://example.test/page?apiKey=secret", "https://example.test/remote#pair=" + capsule, "https://example.test/remote#%70air=" + capsule, "https://example.test/remote?pairing=" + capsule, "https://example.test/remote?data=" + capsule, "https://example.test/remote#" + capsule, "https://example.test/page#route?session=secret", "https://example.test/page#auth=secret", "https://example.test/page#code=secret", "https://example.test/page?next=proteus%3A%2F%2Fpair%3Fdata%3D" + capsule]
        for input in unsafe { XCTAssertNil(SharedAppStore.safeURL(input), input); XCTAssertNil(SharedAppStore.historyURL(input), input) }
    }
    @MainActor func testEncryptedBrowserRestartPreservesExactSafePageAndOmitsPairingDescriptor() throws {
        let identity = "synthetic-browser-" + UUID().uuidString
        let digest = SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
        let cache = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/browsers/" + digest + ".enc")
        defer { try? FileManager.default.removeItem(at: cache) }
        let bookmark = "https://example.test/boards?team=42&view=active#selected=123"
        let store = SharedAppStore(); store.reset(for: identity)
        store.open(try XCTUnwrap(SharedAppStore.safeURL(bookmark)), title: "Board filter")
        store.open(URL(string: "https://example.test/remote#pair=synthetic-capsule"), title: "Do not retain pairing")
        let restored = SharedAppStore(); restored.reset(for: identity)
        XCTAssertEqual(restored.browserTabs.count, 1)
        XCTAssertEqual(restored.browserTabs.first?.title, "Board filter")
        XCTAssertEqual(restored.browserTabs.first?.url, bookmark)
        XCTAssertFalse(String(decoding: try Data(contentsOf: cache), as: UTF8.self).contains("team=42"))
    }
    @MainActor func testBrowserLinkCreatesOnlyBoundHostDraftAndPreservesExistingChoices() throws {
        XCTAssertTrue(NativeBrowser.Coordinator.instancesRespond(to: NSSelectorFromString("webView:contextMenuConfigurationForElement:completionHandler:")))
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let connection = DeviceConnection(relay: "wss://relay.example.test", hostId: UUID().uuidString, deviceId: UUID().uuidString, key: RemoteCrypto.random())
        let remote = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false)
        remote.setDraft("new-chat", .object(["prompt": .string("Existing idea"), "provider": .string("codex"), "workspace": .string("chosen-workspace"), "selected": .array([.string("context")])]))
        let store = SharedAppStore()
        let url = try XCTUnwrap(URL(string: "https://example.test/board?view=active#selected=42"))
        XCTAssertFalse(store.prepareLinkDraft(url, remote: remote, hostID: "other-host", hostName: "Other"))
        XCTAssertNil(store.linkChatDraft)
        XCTAssertTrue(store.prepareLinkDraft(url, remote: remote, hostID: connection.hostId, hostName: "Chosen Mac"))
        XCTAssertEqual(store.linkChatDraft?.hostID, connection.hostId)
        XCTAssertEqual(remote.draft("new-chat")["prompt"].string, "Existing idea\n\n" + url.absoluteString)
        XCTAssertEqual(remote.draft("new-chat")["workspace"].string, "chosen-workspace")
        XCTAssertEqual(remote.draft("new-chat")["provider"].string, "codex")
        XCTAssertEqual(remote.draft("new-chat")["selected"].array, [.string("context")])
        XCTAssertFalse(remote.connected); XCTAssertNil(remote.selectedChat); XCTAssertTrue(remote.chats.isEmpty); XCTAssertEqual(remote.pendingCommandCount, 0)
        let draft = remote.draft("new-chat")
        XCTAssertFalse(store.prepareLinkDraft(try XCTUnwrap(URL(string: "https://example.test/#pair=secret")), remote: remote, hostID: connection.hostId, hostName: "Chosen Mac"))
        XCTAssertEqual(remote.draft("new-chat"), draft)
    }
    @MainActor func testWebKitDownloadProducesExportableFileAndAccountChangeCleansIt() async throws {
        let shared = SharedAppStore()
        let webView = WKWebView(frame: .zero)
        shared.download(try XCTUnwrap(URL(string: "http://127.0.0.1:4329/latest")), in: webView)
        let deadline = Date().addingTimeInterval(15)
        while shared.exportFile == nil && shared.downloadError == nil && Date() < deadline { try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertNil(shared.downloadError)
        let file = try XCTUnwrap(shared.exportFile)
        defer { file.cleanup() }
        XCTAssertNoThrow(try JSONSerialization.jsonObject(with: Data(contentsOf: file.url)))
        XCTAssertTrue(shared.downloads.isEmpty)
        let picker = UIDocumentPickerViewController(forExporting: [file.url], asCopy: true)
        XCTAssertFalse(picker.allowsMultipleSelection)
        shared.reset(for: "signed-out")
        XCTAssertNil(shared.exportFile)
        XCTAssertFalse(FileManager.default.fileExists(atPath: file.url.path))
    }
    @MainActor func testStandupShufflingKeepsFixedPositionsAndAllMembers() {
        let members: [JSON] = (0..<8).map { index -> JSON in
            let mode = index == 0 || index == 4 ? "fixed" : "random"
            return .object(["id": .string(String(index)), "name": .string("Person \(index)"), "mode": .string(mode)])
        }
        for _ in 0..<25 { let order = StandupView.shuffled(members); XCTAssertEqual(order[0], members[0]); XCTAssertEqual(order[4], members[4]); XCTAssertEqual(Set(order), Set(members)) }
    }
    @MainActor func testTimestampHonorsDeviceZoneSummerAndWinterOffsets() throws {
        let summer = try XCTUnwrap(ProviderAllowance.date("2026-07-04T18:00:00Z"))
        let winter = try XCTUnwrap(ProviderAllowance.date("2026-01-04T18:00:00Z"))
        XCTAssertTrue(nativeTimestamp(summer, timezone: "America/Denver").contains("12:00"))
        XCTAssertTrue(nativeTimestamp(winter, timezone: "America/Denver").contains("11:00"))
        XCTAssertNotEqual(nativeTimestamp(summer, timezone: "America/Denver"), nativeTimestamp(summer, timezone: "UTC"))
    }
    @MainActor func testTimestampUsesConfiguredZoneAndPushBodyContainsNoSourceContent() throws {
        let date = try XCTUnwrap(ProviderAllowance.date("2026-10-04T18:00:00Z"))
        XCTAssertNotEqual(nativeTimestamp(date, timezone: "America/Denver"), nativeTimestamp(date, timezone: "Asia/Tokyo"))
        XCTAssertEqual(NativeNotifications.safeBody("chat.completed"), "A chat finished.")
        XCTAssertEqual(NativeNotifications.safeBody("private prompt text"), "New activity is available.")
    }
}
extension DestinationTests {
    @MainActor func testAggregateReadsEveryEncryptedCacheWithoutChangingExecutionSelection() throws {
        let (root, service) = try fixture(); let first = DestinationStore(root: root, keychainService: service)
        let a = credential(UUID().uuidString), b = credential(UUID().uuidString)
        defer { first.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        try first.register(a, label: "A"); first.selected?.state = .object(["runs": .array([.object(["id": .string("same"), "title": .string("A title")])])]); first.selected?.flushCache()
        try first.register(b, label: "B"); first.selected?.state = .object(["runs": .array([.object(["id": .string("same"), "title": .string("B title")])])]); first.selected?.flushCache()
        let restored = DestinationStore(root: root, keychainService: service)
        XCTAssertEqual(restored.selectedID, b.hostId)
        XCTAssertEqual(restored.remote(for: a.hostId)?.state["runs"].array.first?["title"].string, "A title")
        XCTAssertEqual(restored.remote(for: b.hostId)?.state["runs"].array.first?["title"].string, "B title")
        XCTAssertEqual(restored.selectedID, b.hostId)
        XCTAssertFalse(restored.remote(for: a.hostId)?.connected ?? true)
    }
}

extension LifeNativeTests {
    @MainActor func testAppTransportRequiresConsentAndSendsExpectedIdentity() async throws {
        let (withoutConsent, service) = try fixture(); defer { LifeKeychain.clear(service: service) }
        var calls = 0
        let identity = self.identity
        LifeTestProtocol.handler = { request in
            calls += 1
            XCTAssertEqual(request.url?.path, "/api/v1/app/preferences")
            let payload = try! JSONDecoder().decode(JSON.self, from: LifeTestProtocol.body(request))
            XCTAssertEqual(payload["expectedAccountId"].string, "account-a"); XCTAssertEqual(payload["expectedWorkspaceId"].string, "workspace-a")
            return (200, identity, 0)
        }
        do { _ = try await withoutConsent.appRequest(); XCTFail("Life token cannot silently become an app token") } catch {}
        XCTAssertEqual(calls, 0)
        var credential = try XCTUnwrap(LifeKeychain.load(service: service)); credential.appAuthorized = true; try LifeKeychain.save(credential, service: service)
        let consented = LifeStore(keychainService: service, session: LifeTestProtocol.session())
        _ = try await consented.appRequest("/preferences", method: "PUT", body: .object(["timezone": .string("America/Denver")]))
        XCTAssertEqual(calls, 1)
    }
}

@MainActor private final class FakeMessageSpeechOutput: MessageSpeechOutput {
    var event: ((UUID, MessageSpeechEvent) -> Void)?
    var starts: [(text: String, token: UUID)] = []
    var stops = 0
    var pauses = 0
    var resumes = 0
    var canPause = true
    var canResume = true
    func start(_ text: String, token: UUID) { starts.append((text, token)) }
    func stop() { stops += 1 }
    func pause() -> Bool { pauses += 1; return canPause }
    func resume() -> Bool { resumes += 1; return canResume }
}
final class MessageSpeechTests: XCTestCase {
    func testReadableMarkdownPreservesCodeTablesLinksAndUnicode() {
        let markdown = """
        # Ready

        **Strong** and [guide](https://example.test) with `List<T>`.
        - [x] Reviewed
        > Quoted

        | Client | State |
        | --- | :---: |
        | iPad | **Ready** |

        ```swift
        let snake_case = x | y
        print("**keep literal**")
        ```

        Café 👋 finishes.
        """
        let text = SpokenMarkdown.text(markdown)
        XCTAssertTrue(text.contains("Strong and guide with List<T>."), text)
        XCTAssertTrue(text.contains("Reviewed\nQuoted"), text)
        XCTAssertTrue(text.contains("Client; State\niPad; Ready"), text)
        XCTAssertTrue(text.contains("let snake_case = x | y\nprint(\"**keep literal**\")"), text)
        XCTAssertTrue(text.contains("Café 👋 finishes."), text)
        XCTAssertFalse(text.contains("```")); XCTAssertFalse(text.contains("---")); XCTAssertFalse(text.contains("https://example.test"))
        XCTAssertEqual(SpokenMarkdown.text("Use `a_b | x` and ~~old~~."), "Use a_b | x and old.")
        XCTAssertEqual(SpokenMarkdown.text("![Chart](https://example.test/chart.png) &amp; café"), "Chart & café")
    }
    func testActionsExcludeLiveReasoningToolsAndEmptyMessages() {
        let completed: JSON = .object(["role": .string("assistant"), "text": .string("Done")])
        XCTAssertTrue(MessageActions.eligible(completed))
        for event: JSON in [
            .object(["role": .string("user"), "text": .string("Prompt")]),
            .object(["role": .string("assistant"), "text": .string(" \n ")]),
            .object(["role": .string("assistant"), "text": .string("Partial"), "partial": .bool(true)]),
            .object(["role": .string("assistant"), "text": .string("Thinking"), "data": .object(["phase": .string("analysis")])]),
            .object(["role": .string("assistant"), "text": .string("Tool"), "data": .object(["tool": .object([:])])]),
            .object(["role": .string("assistant"), "text": .string("Hidden"), "data": .object(["reasoning": .object([:])])]),
            .object(["role": .string("assistant"), "text": .string("Partial"), "status": .string("streaming")])
        ] { XCTAssertFalse(MessageActions.eligible(event), event.pretty) }
    }
    @MainActor func testSystemSpeechReportsTextProgressWithoutChangingSharedAudioSession() async throws {
        let session = AVAudioSession.sharedInstance()
        let category = session.category, mode = session.mode, options = session.categoryOptions
        let output = SystemMessageSpeech(); defer { output.stop() }
        let token = UUID(); let progressed = expectation(description: "System speech reports an utterance word range")
        var received = false
        output.event = { expected, event in
            guard expected == token else { return }
            if case .progress(let offset) = event, offset >= 0, !received { received = true; progressed.fulfill() }
        }
        output.start("One two three. This is a synthetic speech playback test.", token: token)
        await fulfillment(of: [progressed], timeout: 15)
        output.stop()
        XCTAssertEqual(session.category, category); XCTAssertEqual(session.mode, mode); XCTAssertEqual(session.categoryOptions, options)
    }
    @MainActor func testCopyPreservesExactMarkdown() {
        let old = UIPasteboard.general.string; defer { UIPasteboard.general.string = old }
        let markdown = "# Title\n\n**exact** `code` & café 👋\n"
        MessageActions.copy(markdown); XCTAssertEqual(UIPasteboard.general.string, markdown)
    }
    @MainActor func testReplacementIgnoresOldEventsAndStopFinishCancelClearState() throws {
        let output = FakeMessageSpeechOutput(); let speech = MessageSpeech(output: output)
        XCTAssertTrue(output.starts.isEmpty)
        speech.toggle(messageID: "host-a:chat:a", markdown: "**First** response")
        let first = try XCTUnwrap(output.starts.last); output.event?(first.token, .started)
        XCTAssertEqual(first.text, "First response")
        speech.toggle(messageID: "host-a:chat:b", markdown: "Second response")
        let second = try XCTUnwrap(output.starts.last)
        output.event?(first.token, .finished); output.event?(first.token, .progress(9))
        XCTAssertEqual(speech.messageID, "host-a:chat:b"); XCTAssertEqual(speech.progress, 0)
        output.event?(second.token, .finished); XCTAssertNil(speech.messageID)
        speech.toggle(messageID: "c", markdown: "Third response")
        output.event?(try XCTUnwrap(output.starts.last).token, .cancelled); XCTAssertNil(speech.messageID)
        speech.toggle(messageID: "d", markdown: "Fourth response"); speech.toggle(messageID: "d", markdown: "Fourth response")
        XCTAssertNil(speech.messageID); XCTAssertFalse(speech.isPaused); XCTAssertTrue(speech.spokenText.isEmpty)
    }
    @MainActor func testPauseSeekResumeUsesFullTextCoordinatesAndIgnoresOldProgress() throws {
        let output = FakeMessageSpeechOutput(); let speech = MessageSpeech(output: output)
        let text = "One café 👋 two three four five six seven eight nine ten"
        speech.toggle(messageID: "message", markdown: text)
        let original = try XCTUnwrap(output.starts.last)
        output.event?(original.token, .started); output.event?(original.token, .progress(12))
        XCTAssertEqual(speech.readingOffset, 12)
        speech.togglePause(); XCTAssertTrue(speech.isPaused); XCTAssertEqual(output.pauses, 1)
        speech.seek(to: 0.8); let soughtOffset = speech.readingOffset
        XCTAssertTrue(speech.isPaused); XCTAssertEqual(output.starts.count, 1)
        XCTAssertGreaterThan(soughtOffset, 12)
        output.event?(original.token, .progress(0)); XCTAssertEqual(speech.readingOffset, soughtOffset)
        speech.togglePause(); XCTAssertFalse(speech.isPaused)
        let resumed = try XCTUnwrap(output.starts.last)
        XCTAssertEqual(resumed.text, (text as NSString).substring(from: soughtOffset))
        output.event?(resumed.token, .started); output.event?(resumed.token, .progress(0))
        XCTAssertEqual(speech.readingOffset, soughtOffset)
        speech.seek(to: 0.999)
        XCTAssertEqual(output.starts.last?.text, "ten")
        speech.seek(to: 1); XCTAssertNil(speech.messageID); XCTAssertFalse(speech.isPaused)
    }
    @MainActor func testPauseResumeAndFailedStartRecovery() async throws {
        let output = FakeMessageSpeechOutput(); let speech = MessageSpeech(output: output, startTimeout: .milliseconds(30))
        speech.toggle(messageID: "a", markdown: "One two three")
        output.event?(try XCTUnwrap(output.starts.last).token, .started)
        speech.togglePause(); speech.togglePause()
        XCTAssertFalse(speech.isPaused); XCTAssertEqual(output.resumes, 1)
        output.event?(try XCTUnwrap(output.starts.last).token, .failed)
        XCTAssertNil(speech.messageID); XCTAssertEqual(speech.failedMessageID, "a"); XCTAssertNotNil(speech.error)
        speech.toggle(messageID: "b", markdown: "Retry")
        try await Task.sleep(for: .milliseconds(70))
        XCTAssertNil(speech.messageID); XCTAssertEqual(speech.failedMessageID, "b")
        speech.stop(); XCTAssertNil(speech.error); XCTAssertNil(speech.failedMessageID)
        speech.toggle(messageID: "empty", markdown: " \n "); XCTAssertNil(speech.messageID)
    }
}

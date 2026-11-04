import Foundation
import CryptoKit
import XCTest
@testable import Proteus

final class NativeStateStreamTests: XCTestCase {
    @MainActor func testLargeBaselineIncrementalCPUProfile() async throws {
        let runs: [JSON] = (0..<1500).map { .object(["id": .string("chat-\($0)"), "title": .string("Synthetic General chat \($0)"), "status": .string("running"), "text": .string(String(repeating: "markdown **stream** and code `test` ", count: 35))]) }
        let tabs: [JSON] = (0..<200).map { .object(["id": .string("tab-\($0)"), "url": .string("https://example.test/\($0)")]) }
        let baseline: JSON = .object(["runs": .array(runs), "tabs": .array(tabs), "capabilities": .array([.string("projects.v1")]), "hostName": .string("Synthetic owner")])
        let stream = NativeRemoteStateStream(), store = RemoteStore(connection: nil, legacyCredentials: false), key = RemoteCrypto.random()
        _ = await stream.full(baseline, version: "profile:0"); store.updateState(baseline)
        var decode = 0.0, patchTime = 0.0, presentation = 0.0, legacyDecode = 0.0, size = 0
        for i in 1...10 {
            let patch: JSON = .object(["base": .string("profile:\(i-1)"), "version": .string("profile:\(i)"), "patch": .object(["o": .object(["runs": .object(["a": .object(["u": .object(["chat-0": .object(["o": .object(["progress": .object(["v": .number(Double(i))])])])])])])])])])
            size = try JSONEncoder().encode(patch).count
            let box = try RemoteCrypto.seal(patch, key: key, aad: "profile")
            var start = ProcessInfo.processInfo.systemUptime
            let value = try await RemoteStore.opened(box, key: key, aad: "profile")
            decode += (ProcessInfo.processInfo.systemUptime - start) * 1000
            start = ProcessInfo.processInfo.systemUptime
            let result = await stream.patch(value)
            patchTime += (ProcessInfo.processInfo.systemUptime - start) * 1000
            start = ProcessInfo.processInfo.systemUptime
            guard case .update(let state, _) = result else { return XCTFail("Patch chain") }
            store.updateState(state)
            presentation += (ProcessInfo.processInfo.systemUptime - start) * 1000
            // The exact same resulting states through the pre-change full-state
            // decrypt/Codable path, so the comparison changes transport work only.
            let fullBox = try RemoteCrypto.seal(state, key: key, aad: "profile")
            start = ProcessInfo.processInfo.systemUptime
            let reference = try await Task.detached {
                let bytes = try AES.GCM.open(AES.GCM.SealedBox(combined: Data(base64Encoded: fullBox)!), using: RemoteCrypto.key(key), authenticating: Data("profile".utf8))
                return try JSONDecoder().decode(JSON.self, from: bytes)
            }.value
            legacyDecode += (ProcessInfo.processInfo.systemUptime - start) * 1000
            XCTAssertEqual(reference, state)
            try await Task.sleep(for: .seconds(1))
        }
        XCTAssertEqual(store.state["runs"].array.first?["progress"], .number(10))
        print("NOV3_PATCH baseline_bytes=\(try JSONEncoder().encode(baseline).count) patch_bytes=\(size) legacy_full_decrypt_decode_ms=\(legacyDecode/10) decrypt_decode_ms=\(decode/10) actor_apply_ms=\(patchTime/10) main_presentation_ms=\(presentation/10)")
    }
    func testSharedJSONVectors() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "state-patch-vectors", withExtension: "json"))
        let vectors = try JSON.decode(Data(contentsOf: url))["vectors"].array
        XCTAssertEqual(vectors.count, 16)
        for vector in vectors {
            XCTAssertEqual(try NativeStatePatch.apply(vector["before"], patch: vector["patch"]), vector["after"], vector["name"].string)
        }
    }
    func testGapDuplicateUnchangedAndLegacy() async throws {
        let stream = NativeRemoteStateStream()
        let before: JSON = .object(["runs": .array([.object(["id": .string("a")])])])
        let first = await stream.arguments(cursor: "c")
        XCTAssertEqual(first["statePatch"], .string("v1")); XCTAssertNil(first["ifStateVersion"])
        guard case .update = await stream.sync(.object(["state": before, "stateVersion": .string("e:1")])) else { return XCTFail("Initial baseline") }
        let conditional = await stream.arguments(cursor: "c")
        XCTAssertEqual(conditional["ifStateVersion"], .string("e:1"))
        guard case .ignored = await stream.sync(.object(["unchanged": .bool(true), "stateVersion": .string("e:1")])) else { return XCTFail("Missing state must not clear presentation") }
        let patch: JSON = .object(["base": .string("e:1"), "version": .string("e:2"), "patch": .object(["o": .object(["nullable": .object(["v": .null])])])])
        guard case .update(let changed, _) = await stream.patch(patch) else { return XCTFail("Patch") }
        XCTAssertNotNil(changed.object["nullable"]); XCTAssertEqual(changed.object["nullable"], .null)
        guard case .ignored = await stream.patch(patch) else { return XCTFail("Duplicate") }
        guard case .resync = await stream.patch(.object(["base": .string("e:3"), "version": .string("e:4"), "patch": .null])) else { return XCTFail("Gap") }
        guard case .ignored = await stream.patch(.object(["base": .string("e:2"), "version": .string("e:3"), "patch": .null])) else { return XCTFail("Suspend until full") }
        let forced = await stream.arguments(cursor: "c")
        XCTAssertNil(forced["ifStateVersion"])
        _ = await stream.sync(.object(["state": before, "stateVersion": .string("e:4")]))
        let restored = await stream.arguments(cursor: "c")
        XCTAssertEqual(restored["ifStateVersion"], .string("e:4"))
        guard case .ignored = await stream.sync(.object(["state": .object(["stale": .bool(true)]), "stateVersion": .string("e:3")])) else { return XCTFail("An older sync reply cannot overwrite a newer patch baseline") }
        _ = await stream.full(before, version: nil)
        let legacy = await stream.arguments(cursor: "c")
        XCTAssertNil(legacy["ifStateVersion"])
    }
    @MainActor func testActualOwnerConditionalSyncPreservesOlderPresentationPages() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: nativeFixtureHTTPOrigin + "/pair")!)
        let remote = RemoteStore(); remote.forget(); try remote.pair(try JSON.decode(data)["code"].string)
        defer { remote.forget() }
        for _ in 0..<200 { if remote.connected && remote.state != .null { break }; try await Task.sleep(for: .milliseconds(50)) }
        XCTAssertTrue(remote.connected)
        let first = try await remote.request("sync", ["statePatch": .string("v1")])
        XCTAssertFalse(first["stateVersion"].string.isEmpty)
        let second = try await remote.request("sync", ["statePatch": .string("v1"), "ifStateVersion": first["stateVersion"]])
        XCTAssertTrue(second["unchanged"].bool); XCTAssertNil(second.object["state"])
        let retained: JSON = .object(["id": .string("retained-older-page")])
        var presented = remote.state.object; presented["runs"] = .array(remote.state["runs"].array + [retained]); remote.state = .object(presented)
        await remote.refresh(); await remote.refresh()
        XCTAssertTrue(remote.state["runs"].array.contains(retained))
        let created = try await remote.request("chat.start", ["prompt": .string("Native state patch integration fixture"), "provider": .string("rehearsal")])
        let id = created["runId"].string
        await remote.refresh(forceState: true)
        let summary = try XCTUnwrap(remote.state["runs"].array.first { $0["id"].string == id })
        let count = remote.appliedStatePatchCount
        _ = try await remote.request("chat.rename", ["id": .string(id), "title": .string("Native patch title"), "expectedTitleRevision": summary["titleRevision"]])
        for _ in 0..<200 {
            if remote.appliedStatePatchCount > count && remote.state["runs"].array.first(where: { $0["id"].string == id })?["title"].string == "Native patch title" { break }
            try await Task.sleep(for: .milliseconds(50))
        }
        XCTAssertGreaterThan(remote.appliedStatePatchCount, count, "The owner delivered a patch through the encrypted transport")
        XCTAssertEqual(remote.state["runs"].array.first(where: { $0["id"].string == id })?["title"].string, "Native patch title")
        XCTAssertTrue(remote.state["runs"].array.contains(retained), "Wire patches must not discard separately retained history pages")
    }
}

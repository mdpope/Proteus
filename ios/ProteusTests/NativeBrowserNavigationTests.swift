import WebKit
import Network
import XCTest
@testable import Proteus

final class NativeBrowserNavigationTests: XCTestCase {
    @MainActor func testMirroredRedirectAndTitleStayLocalUntilTouchThenDelayedPushStateQueuesOnce() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), key = RemoteCrypto.random()
        let shared = SharedAppStore(cacheWriter: NativeSharedCacheWriter(), cacheRoot: root, cacheKey: { key })
        let server = try NativeNavigationHTTPFixture(), origin = try await server.start().absoluteString
        defer { server.stop(); shared.unloadBrowsers(); shared.flushCachedState(); try? FileManager.default.removeItem(at: root) }
        let scope = "workspace:synthetic:general", address = origin + "/redirect"
        let owner: JSON = .object(["revision": .number(1), "tabs": .array([.object([
            "id": .string("owner-browser"), "type": .string("browser"), "title": .string("Owner title"), "url": .string(address),
            "history": .object(["entries": .array([.object(["id": .string("owner-entry"), "url": .string(address), "title": .string("Owner title")])]), "index": .number(0), "currentEntryId": .string("owner-entry"), "revision": .number(4)])
        ])])])
        shared.applyContentTabs(owner, scope: scope)
        let tab = try XCTUnwrap(shared.tabs(in: scope).first)
        let web = try XCTUnwrap(shared.webView(tab, allowLocalNavigation: true) as? NativeLinkWebView)
        try await wait { !web.isLoading && web.title == "Device landing" && web.url?.path == "/landing" }
        XCTAssertEqual(shared.browserNavigation[tab.id]?.url, origin + "/landing")
        XCTAssertTrue(shared.contentPending[scope]?.isEmpty != false, "A mirrored nonempty owner title must not echo the local title")
        XCTAssertEqual(shared.localContentTabs(scope).first?["title"].string, "Owner title")
        let landed = URL(string: origin + "/landing")!
        shared.markBrowserRedirect(tab.id, url: landed)
        shared.completeBrowserNavigation(landed, title: "Private landing", in: tab.id)
        shared.prepareBrowserHistoryNavigation(landed, in: tab.id)
        _ = try await web.evaluateJavaScript("document.body.dispatchEvent(new MouseEvent('click', {bubbles:true})); history.pushState({}, '', '/passive-spa')")
        try await wait { shared.browserNavigation[tab.id]?.url == origin + "/passive-spa" }
        XCTAssertEqual(shared.tabs(in: scope).first?.url, address)
        XCTAssertEqual(shared.tabs(in: scope).first?.history?.revision, 4)
        XCTAssertEqual(shared.browserNavigation[tab.id]?.url, origin + "/passive-spa")
        XCTAssertTrue(shared.contentPending[scope]?.isEmpty != false)
        XCTAssertTrue(shared.historyOutbox.isEmpty)
        // An owner refresh must not reload a device-private landing or publish it.
        let requests = server.requestCount
        shared.applyContentTabs(owner, scope: scope)
        try await Task.sleep(for: .milliseconds(100))
        XCTAssertEqual(server.requestCount, requests)
        XCTAssertEqual(web.url?.absoluteString, origin + "/passive-spa")
        XCTAssertTrue(shared.webView(try XCTUnwrap(shared.tabs(in: scope).first)) === web)
        web.noteNavigationIntent()
        try await Task.sleep(for: .milliseconds(1500))
        let selected = URL(string: origin + "/chosen-spa")!
        _ = try await web.evaluateJavaScript("history.pushState({}, '', '/chosen-spa')")
        try await wait { shared.tabs(in: scope).first?.url == selected.absoluteString }
        shared.completeBrowserNavigation(selected, title: "Chosen SPA", in: tab.id, sameDocumentObservation: true)
        let operations = (shared.contentPending[scope] ?? []).filter { $0["action"].string == "browser-navigate" }
        XCTAssertEqual(operations.count, 1)
        XCTAssertEqual(operations.first?["url"].string, selected.absoluteString)
        XCTAssertEqual(operations.first?["baseRevision"].int, 4)
        XCTAssertEqual(shared.tabs(in: scope).first?.history?.revision, 4, "Enqueue does not predict an owner revision")
        XCTAssertEqual(shared.historyOutbox.count, 1)
    }

    @MainActor func testDroppedOperationDoesNotAdvanceRevision() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), key = RemoteCrypto.random()
        let shared = SharedAppStore(cacheWriter: NativeSharedCacheWriter(), cacheRoot: root, cacheKey: { key })
        defer { shared.flushCachedState(); try? FileManager.default.removeItem(at: root) }
        let entry = BrowserHistoryEntry(id: "one", url: "https://example.test/one", title: "One")
        shared.browserTabs = [BrowserDescriptor(id: "local", title: "One", url: entry.url, scope: "main", history: BrowserTabHistory(entries: [entry], index: 0, revision: 9))]
        XCTAssertFalse(shared.navigate(URL(string: "file:///invalid")!, in: "local"))
        shared.completeBrowserNavigation(URL(string: "https://example.test/two")!, title: "Two", in: "local")
        XCTAssertEqual(shared.browserTabs.first?.history?.revision, 9)
        XCTAssertTrue(shared.contentPending.isEmpty)
    }

    @MainActor func testQueuedNavigationsAndTraversalsAdoptOwnerRebaseAfterAnotherClientsTitleSettles() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: nativeFixtureHTTPOrigin + "/pair")!)
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let key = RemoteCrypto.random()
        let remote = RemoteStore(connection: nil, cacheRoot: root.appendingPathComponent("remote"), legacyCredentials: false)
        let peer = RemoteStore(connection: nil, cacheRoot: root.appendingPathComponent("peer"), legacyCredentials: false)
        let shared = SharedAppStore(cacheWriter: NativeSharedCacheWriter(), cacheRoot: root.appendingPathComponent("shared"), cacheKey: { key })
        defer { shared.unloadBrowsers(); shared.flushCachedState(); remote.forget(); peer.forget(); try? FileManager.default.removeItem(at: root) }
        try remote.pair(try JSONDecoder().decode(JSON.self, from: data)["code"].string)
        try await wait { remote.connected && remote.stateValue("capabilities").array.contains(.string("content-tabs.v1")) }
        let (peerData, _) = try await URLSession.shared.data(from: URL(string: nativeFixtureHTTPOrigin + "/review-pair")!)
        try peer.pair(try JSONDecoder().decode(JSON.self, from: peerData)["code"].string)
        try await wait { peer.connected && peer.stateValue("capabilities").array.contains(.string("content-tabs.v1")) }
        let run = try await remote.request("chat.start", ["prompt": .string("Synthetic title rebase acceptance"), "provider": .string("rehearsal")])
        let id = run["runId"].string, host = try XCTUnwrap(remote.connection?.hostId), scope = "chat:\(host):\(id)"
        func owner(_ operations: [JSON] = []) async throws -> JSON {
            let args: [String: JSON] = ["scope": .string("chat"), "id": .string(id)]
            let current = try await peer.request("tabs.get", args)
            if operations.isEmpty { return current }
            return try await peer.request("tabs.mutate", args.merging(["expectedRevision": current["revision"], "operations": .array(operations)]) { _, new in new })
        }
        _ = try await owner([.object(["action": .string("open"), "tab": .object(["id": .string("browser"), "type": .string("browser"), "url": .string("https://example.test/start"), "title": .string("Initial title")])])])
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id)
        let localID = try XCTUnwrap(shared.tabs(in: scope).first?.id)
        for round in 0..<2 {
            let before = try await owner(), descriptor = try XCTUnwrap(before["tabs"].array.first)
            remote.connected = false // Preserve the real transport; suspend delivery of new intent.
            for page in 0..<3 {
                let url = URL(string: "https://example.test/round-\(round)-\(page)")!
                shared.completeBrowserNavigation(url, title: "Selected page", in: localID, sameDocumentObservation: true)
            }
            XCTAssertEqual(shared.tabs(in: scope).first?.history?.revision, descriptor["history"]["revision"].int)
            let queued = (shared.contentPending[scope] ?? []).filter { $0["action"].string == "browser-navigate" }
            XCTAssertEqual(queued.count, 3)
            let settled = try await owner([.object(["action": .string("browser-redirect"), "tabId": .string("browser"), "operationId": .string(UUID().uuidString), "entryId": descriptor["history"]["currentEntryId"], "baseRevision": descriptor["history"]["revision"], "url": descriptor["url"], "title": .string("Another client's settled title \(round)")])])
            XCTAssertGreaterThan(settled["tabs"].array[0]["history"]["revision"].int, descriptor["history"]["revision"].int)
            remote.connected = true
            await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id)
            try await wait { !shared.hasPendingContent(in: scope) }
            let accepted = try await owner(), history = accepted["tabs"].array[0]["history"]
            XCTAssertTrue(shared.browserConflicts.isEmpty, shared.error ?? "Unexpected quarantined navigation")
            XCTAssertEqual(accepted["tabs"].array[0]["url"].string, "https://example.test/round-\(round)-2")
            XCTAssertEqual(shared.tabs(in: scope).first?.history?.revision, history["revision"].int)
            XCTAssertEqual(history["revision"].int, descriptor["history"]["revision"].int + 4)
            XCTAssertEqual(shared.tabs(in: scope).first?.history?.entries.first(where: { $0.id == descriptor["history"]["currentEntryId"].string })?.title, "Another client's settled title \(round)")
            XCTAssertEqual(Array(history["entries"].array.suffix(3)).map { $0["url"].string }, (0..<3).map { "https://example.test/round-\(round)-\($0)" })
        }
        remote.connected = false
        for _ in 0..<2 { shared.goBack(localID) }
        let traversals = (shared.contentPending[scope] ?? []).filter { $0["action"].string == "browser-traverse" }
        XCTAssertEqual(traversals.count, 2)
        remote.connected = true
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id)
        try await wait { !shared.hasPendingContent(in: scope) }
        let traversed = try await owner()
        XCTAssertEqual(traversed["tabs"].array[0]["url"].string, "https://example.test/round-1-0")
        XCTAssertEqual(shared.tabs(in: scope).first?.history?.revision, traversed["tabs"].array[0]["history"]["revision"].int)
        XCTAssertTrue(shared.browserConflicts.isEmpty)
    }

    @MainActor private func wait(_ predicate: () -> Bool) async throws {
        for _ in 0..<200 { if predicate() { return }; try await Task.sleep(for: .milliseconds(50)) }
        XCTFail("Synthetic navigation did not settle"); throw RemoteError(message: "Synthetic navigation timeout")
    }
}

/// A real loopback HTTP redirect and landing page, scoped to this one test. No
/// fixture owner route, shared browser data or live network destination is changed.
private final class NativeNavigationHTTPFixture: @unchecked Sendable {
    private let listener: NWListener
    private let queue = DispatchQueue(label: "proteus.native-navigation-test")
    private let lock = NSLock()
    private var requests = 0
    var requestCount: Int { lock.lock(); defer { lock.unlock() }; return requests }
    init() throws { listener = try NWListener(using: .tcp, on: .any) }
    func start() async throws -> URL {
        listener.newConnectionHandler = { [weak self] connection in
            guard let self else { connection.cancel(); return }
            connection.start(queue: self.queue)
            connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] data, _, _, _ in
                guard let self else { connection.cancel(); return }
                self.lock.lock(); self.requests += 1; self.lock.unlock()
                let request = String(decoding: data ?? Data(), as: UTF8.self)
                let body = "<!doctype html><title>Device landing</title><button>Trusted button</button>"
                let response = request.hasPrefix("GET /redirect ")
                    ? "HTTP/1.1 302 Found\r\nLocation: /landing\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                    : "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)"
                connection.send(content: Data(response.utf8), completion: .contentProcessed { _ in connection.cancel() })
            }
        }
        return try await withCheckedThrowingContinuation { continuation in
            listener.stateUpdateHandler = { [weak self] state in
                guard let self else { return }
                switch state {
                case .ready:
                    self.listener.stateUpdateHandler = nil
                    continuation.resume(returning: URL(string: "http://127.0.0.1:\(self.listener.port!.rawValue)")!)
                case .failed(let error):
                    self.listener.stateUpdateHandler = nil; continuation.resume(throwing: error)
                default: break
                }
            }
            listener.start(queue: queue)
        }
    }
    func stop() { listener.cancel() }
}

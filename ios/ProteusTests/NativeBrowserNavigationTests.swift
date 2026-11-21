import SwiftUI
import UIKit
import WebKit
import Network
import XCTest
@testable import Proteus

final class NativeBrowserNavigationTests: XCTestCase {
    @MainActor func testRapidBackThenForwardIgnoresOlderOwnerAndWebKitResults() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), key = RemoteCrypto.random()
        let shared = SharedAppStore(cacheWriter: NativeSharedCacheWriter(), cacheRoot: root, cacheKey: { key })
        defer { shared.flushCachedState(); try? FileManager.default.removeItem(at: root) }
        let scope = "project:host:fixture"
        let entries = ["one", "two", "three"].map { BrowserHistoryEntry(id: $0, url: "https://example.test/" + $0, title: $0) }
        func snapshot(position: Int, revision: Int) throws -> JSON {
            let history = BrowserTabHistory(entries: entries, index: position, currentEntryId: entries[position].id, revision: revision)
            let encoded = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(history))
            return .object(["revision": .number(Double(revision)), "tabs": .array([.object([
                "type": .string("browser"), "id": .string("fixture"), "title": .string(entries[position].title),
                "url": .string(entries[position].url), "history": encoded
            ])])])
        }
        shared.applyContentTabs(try snapshot(position: 2, revision: 7), scope: scope)
        let id = try XCTUnwrap(shared.tabs(in: scope).first?.id)
        defer { shared.close(id) }
        shared.goBack(id)
        shared.goForward(id)
        shared.applyContentTabs(try snapshot(position: 1, revision: 8), scope: scope)
        shared.completeBrowserNavigation(URL(string: entries[1].url)!, title: "Outgoing page", in: id)
        XCTAssertEqual(shared.tabs(in: scope).first?.url, entries[2].url)
        XCTAssertEqual(shared.tabs(in: scope).first?.history?.entries, entries)
        shared.completeBrowserNavigation(URL(string: entries[2].url)!, title: entries[2].title, in: id)
        shared.applyContentTabs(try snapshot(position: 2, revision: 9), scope: scope)
        shared.applyContentTabs(try snapshot(position: 1, revision: 8), scope: scope)
        XCTAssertEqual(shared.tabs(in: scope).first?.history?.currentEntryId, entries[2].id)
        XCTAssertEqual(shared.contentPending[scope]?.filter { $0["action"].string == "browser-traverse" }.map { $0["entryId"].string }, [entries[1].id, entries[2].id])
    }

    @MainActor func testBackRedirectKeepsForwardHistoryAndLocalLanding() throws {
        let shared = SharedAppStore()
        let entries = ["one", "two"].map { BrowserHistoryEntry(id: $0, url: "https://example.test/" + $0, title: $0) }
        let id = "redirected-traversal"
        shared.browserTabs = [BrowserDescriptor(id: id, title: "two", url: entries[1].url, scope: "main", history: BrowserTabHistory(entries: entries, index: 1, currentEntryId: entries[1].id))]
        defer { shared.close(id) }
        shared.goBack(id)
        let landing = URL(string: "https://example.test/device-local")!
        shared.markBrowserRedirect(id, url: landing)
        shared.completeBrowserNavigation(landing, title: "Local page", in: id)
        XCTAssertEqual(shared.browserTabs.first?.url, entries[0].url)
        XCTAssertEqual(shared.browserTabs.first?.history?.entries, entries)
        XCTAssertEqual(shared.browserNavigation[id]?.url, landing.absoluteString)
        shared.goForward(id)
        shared.completeBrowserNavigation(URL(string: entries[1].url)!, title: "two", in: id)
        XCTAssertEqual(shared.browserTabs.first?.history?.currentEntryId, entries[1].id)
        XCTAssertEqual(shared.browserTabs.first?.history?.entries, entries)
    }

    @MainActor func testHistoryHydrationRequiresExpectedRevisionAndSelection() {
        let expected: JSON = .object(["revision": .number(7), "currentEntryId": .string("one")])
        XCTAssertTrue(SharedAppStore.matchesNavigationSnapshot(expected, expected))
        XCTAssertFalse(SharedAppStore.matchesNavigationSnapshot(.object(["revision": .number(8), "currentEntryId": .string("one")]), expected))
        XCTAssertFalse(SharedAppStore.matchesNavigationSnapshot(.object(["revision": .number(7), "currentEntryId": .string("two")]), expected))
    }
    @MainActor func testPrivateClipboardClosesOnlyItsOwnCopyAndClearsInterruptedCopies() throws {
        let name = UIPasteboard.Name("proteus-test-" + UUID().uuidString)
        let board = try XCTUnwrap(UIPasteboard(name: name, create: true))
        defer { UIPasteboard.remove(withName: name) }
        let clipboard = NativeBrowserClipboard(pasteboard: board)
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let shared = SharedAppStore(cacheRoot: root, browserClipboard: clipboard)
        defer { shared.closeIncognitoBrowsers(); try? FileManager.default.removeItem(at: root) }
        let first = try XCTUnwrap(shared.open(nil, incognito: true))
        let second = try XCTUnwrap(shared.open(nil, incognito: true))
        shared.copyBrowserText("private-one", id: first)
        XCTAssertEqual(board.string, "private-one")
        shared.copyBrowserText("private-two", id: second)
        shared.close(first)
        XCTAssertEqual(board.string, "private-two")
        shared.close(second)
        XCTAssertFalse(board.hasStrings)

        clipboard.copy("private", tabID: "interrupted", incognito: true)
        _ = NativeBrowserClipboard(pasteboard: board)
        XCTAssertFalse(board.hasStrings)
        clipboard.copy("private", tabID: "replaced", incognito: true)
        board.string = "user's later copy"
        clipboard.close("replaced")
        _ = NativeBrowserClipboard(pasteboard: board)
        XCTAssertEqual(board.string, "user's later copy")
        shared.copyBrowserText("stale menu must not recopy", id: first)
        XCTAssertEqual(board.string, "user's later copy")
    }

    @MainActor func testIncognitoSessionsStayLocalAndCloseWithoutRestorableState() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), key = RemoteCrypto.random()
        let shared = SharedAppStore(cacheWriter: NativeSharedCacheWriter(), cacheRoot: root, cacheKey: { key })
        defer { for tab in shared.browserTabs { shared.close(tab.id) }; shared.flushCachedState(); try? FileManager.default.removeItem(at: root) }
        let scope = "workspace:11111111-1111-4111-8111-111111111111:private-fixture"
        let first = try XCTUnwrap(shared.open(nil, scope: scope, incognito: true))
        let second = try XCTUnwrap(shared.open(nil, scope: scope, afterSourceID: first, incognito: true))
        let one = shared.webView(try XCTUnwrap(shared.browserTabs.first { $0.id == first }))
        let two = shared.webView(try XCTUnwrap(shared.browserTabs.first { $0.id == second }))
        let store = one.configuration.websiteDataStore
        XCTAssertFalse(store.isPersistent); XCTAssertFalse(two.configuration.websiteDataStore.isPersistent)
        XCTAssertFalse(store === two.configuration.websiteDataStore)
        let cookie = try XCTUnwrap(HTTPCookie(properties: [.domain: "private-marker.invalid", .path: "/", .name: "private", .value: "one", .secure: "TRUE"]))
        await store.httpCookieStore.setCookie(cookie)
        let initialCookies = await store.httpCookieStore.allCookies(); XCTAssertEqual(initialCookies.count, 1)
        let otherCookies = await two.configuration.websiteDataStore.httpCookieStore.allCookies(); XCTAssertTrue(otherCookies.isEmpty)
        let url = URL(string: "https://private-marker.invalid/secret")!
        shared.completeBrowserNavigation(url, title: "PRIVATE TITLE", in: first)
        XCTAssertTrue(shared.localContentTabs(scope).isEmpty)
        XCTAssertTrue(shared.historyOutbox.isEmpty); XCTAssertTrue(shared.contentPending[scope]?.isEmpty != false)
        XCTAssertNil(shared.browserPreview(first)); XCTAssertNil(shared.adjacentPageImage(first, back: true))
        shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([])]), scope: scope)
        XCTAssertEqual(shared.browserTabs.map(\.id), [first, second])
        shared.persistBrowser(first, enabled: true)
        XCTAssertFalse(try XCTUnwrap(shared.browserTabs.first { $0.id == first }).persist)
        shared.close(first)
        XCTAssertFalse(shared.browserTabs.contains { $0.id == first }); XCTAssertFalse(shared.isBrowserLoaded(first))
        for _ in 0..<50 { if await store.httpCookieStore.allCookies().isEmpty { break }; try await Task.sleep(for: .milliseconds(20)) }
        let remainingCookies = await store.httpCookieStore.allCookies(); XCTAssertTrue(remainingCookies.isEmpty)
        shared.persistForBackground(); XCTAssertNil(shared.flushCachedState())
        if let data = try? Data(contentsOf: root.appendingPathComponent("document-tabs.enc")) {
            let saved = try RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-document-tabs-v1")
            let text = String(decoding: try JSONEncoder().encode(saved), as: UTF8.self)
            XCTAssertFalse(text.contains("private-marker")); XCTAssertFalse(text.contains(first)); XCTAssertFalse(text.contains(second))
        }
    }

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

    @MainActor func testHistoryCoveragePersistsOnceForMultipleOwnerPages() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let key = RemoteCrypto.random(), profile = UUID().uuidString.lowercased()
        let remote = RemoteStore(connection: nil, cacheRoot: root.appendingPathComponent("remote"), legacyCredentials: false)
        let persisted = expectation(description: "one offline coverage write")
        persisted.assertForOverFulfill = true
        let writer = NativeSharedCacheWriter(writeFile: { data, url in
            try NativeSharedCacheWriter.writeFile(data, url)
            if url.lastPathComponent == "browser-history.enc" { persisted.fulfill() }
        })
        let shared = SharedAppStore(cacheWriter: writer, cacheRoot: root.appendingPathComponent("shared"), cacheKey: { key })
        defer { remote.forget(); try? writer.flush(); try? FileManager.default.removeItem(at: root) }
        let (pairing, _) = try await URLSession.shared.data(from: URL(string: nativeFixtureHTTPOrigin + "/pair")!)
        try remote.pair(try JSONDecoder().decode(JSON.self, from: pairing)["code"].string)
        try await wait { remote.connected && remote.stateValue("capabilities").array.contains(.string("browser.history.v1")) }
        let host = try XCTUnwrap(remote.connection?.hostId)
        let visitedAt = Date().ISO8601Format()
        for range in [0..<200, 200..<201] {
            let visits: [JSON] = range.map { index in
                .object(["eventId": .string(UUID().uuidString.lowercased()), "url": .string("https://example.test/coverage/\(index)"), "profileId": .string(profile), "visitedAt": .string(visitedAt)])
            }
            let result = try await remote.request("browser.history.record", ["events": .array(visits)])
            XCTAssertEqual(result["acknowledgedEventIds"].array.count, visits.count)
        }
        await shared.refreshHistoryCache(remote)
        try writer.flush()
        await fulfillment(of: [persisted], timeout: 5)
        XCTAssertEqual(shared.historyCache[host + "|" + profile]?.count, 201)
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

/// Nov 11 iPhone corrections: single-line address editing, human times and coalesced cache writes.
final class NativeNov11Tests: XCTestCase {
    @MainActor func testMetadataRefreshPreservesLocalReadingPositionWithoutPublishingIt() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), key = RemoteCrypto.random()
        let shared = SharedAppStore(cacheWriter: NativeSharedCacheWriter(), cacheRoot: root, cacheKey: { key })
        defer { shared.flushCachedState(); try? FileManager.default.removeItem(at: root) }
        let scope = "workspace:10000000-0000-4000-8000-000000000001:general", address = "https://example.test/article"
        func snapshot(_ revision: Int, url: String = address, title: String = "Article") -> JSON {
            .object(["revision": .number(Double(revision)), "tabs": .array([.object(["id": .string("browser"), "type": .string("browser"), "url": .string(url), "title": .string(title)])])])
        }
        shared.applyContentTabs(snapshot(1), scope: scope)
        let position = BrowserReadingPosition(url: address, x: 0, y: 420)
        shared.browserTabs[0].readingPosition = position
        shared.applyContentTabs(snapshot(2, title: "Updated title"), scope: scope)
        XCTAssertEqual(shared.browserTabs[0].readingPosition, position)
        XCTAssertEqual(shared.localContentTabs(scope).first?["readingPosition"], .null)
        shared.applyContentTabs(snapshot(3, url: "https://example.test/other"), scope: scope)
        XCTAssertNil(shared.browserTabs[0].readingPosition, "A new document must not inherit the old page offset")
    }
    @MainActor func testSingleLineAddressEditorStripsLineBreaksKeepsFixedHeightAndSubmits() {
        var text = "", focused = false, submitted = 0
        let longURL = "https://www.google.com/search?q=" + String(repeating: "abcdefghij", count: 400)
        let editor = NativeSingleLineAddressEditor(text: Binding(get: { text }, set: { text = $0 }), focused: Binding(get: { focused }, set: { focused = $0 }), sites: [], submit: { submitted += 1 })
        let coordinator = editor.makeCoordinator(), field = UITextField()
        field.text = longURL
        // A pasted value with line breaks becomes one line rather than a tall wrapped view.
        XCTAssertFalse(coordinator.textField(field, shouldChangeCharactersIn: NSRange(location: field.text!.utf16.count, length: 0), replacementString: "&x=1\nmore"))
        XCTAssertEqual(text, longURL + "&x=1more")
        XCTAssertFalse(coordinator.textFieldShouldReturn(field)); XCTAssertEqual(submitted, 1)
    }
    func testUploadProgressLabelsAndFraction() {
        var progress = NativeUploadProgress(total: 400, files: 2); progress.sent = 100
        XCTAssertEqual(progress.label, "Uploading 1 of 2 files · 25%")
        progress.file = 2; progress.sent = 400; XCTAssertEqual(progress.fraction, 1)
        progress.stage = "Sending message…"; XCTAssertEqual(progress.label, "Sending message…")
    }
    @MainActor func testConnectionHoldDefersBackgroundDisconnectUntilReleased() {
        let store = RemoteStore(connection: nil, cacheRoot: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), legacyCredentials: false)
        let release = store.holdConnection()
        store.activity(false)
        release(); release() // Releasing twice is harmless.
    }
    func testHumanTimeFormatsInstantsAndKeepsInvalidText() {
        XCTAssertFalse(NativeHumanTime.text("2026-11-11T19:10:05.583Z").contains("T19:10"))
        XCTAssertFalse(NativeHumanTime.text("2026-11-11T19:10:00Z").contains("Z"))
        XCTAssertEqual(NativeHumanTime.text("Not recorded"), "Not recorded")
    }
    @MainActor func testLeavingForegroundDoesNotWaitForSlowCacheWrites() throws {
        // N11-24: iPhone watchdog kills (0x8BADF00D) came from waiting here for large writes.
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString), key = RemoteCrypto.random()
        let writer = NativeSharedCacheWriter(writeFile: { data, url in Thread.sleep(forTimeInterval: 1.5); try NativeSharedCacheWriter.writeFile(data, url) })
        let shared = SharedAppStore(cacheWriter: writer, cacheRoot: root, cacheKey: { key })
        defer { try? FileManager.default.removeItem(at: root) }
        shared.selectChatChild("retained-child", for: "synthetic-chat")
        let started = Date(); shared.persistForBackground()
        XCTAssertLessThan(Date().timeIntervalSince(started), 0.5, "The main thread must not wait for cache writes")
        XCTAssertNil(shared.flushCachedState())
        let documents = try RemoteCrypto.open(String(contentsOf: root.appendingPathComponent("document-tabs.enc"), encoding: .utf8), key: key, aad: "proteus-mobile-document-tabs-v1")
        XCTAssertEqual(documents["selected"]["synthetic-chat"].string, "retained-child", "The queued write still completes")
    }
    func testSharedCacheWritesCoalesceWhileAWriteIsInProgress() async throws {
        let started = expectation(description: "first write started"), release = DispatchSemaphore(value: 0)
        let counter = NSLock(); var writes: [Data] = []
        let writer = NativeSharedCacheWriter(writeFile: { data, _ in
            counter.lock(); writes.append(data); let first = writes.count == 1; counter.unlock()
            if first { started.fulfill(); release.wait() }
        })
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let first = writer.save(url: url, snapshot: { Data("1".utf8) }, onFailure: { _ in })
        await fulfillment(of: [started], timeout: 5)
        let receipts = (2...20).map { value in writer.save(url: url, snapshot: { Data(String(value).utf8) }, onFailure: { _ in }) }
        release.signal()
        try await first.value(); for receipt in receipts { try await receipt.value() }
        counter.lock(); let recorded = writes; counter.unlock()
        XCTAssertEqual(recorded.map { String(decoding: $0, as: UTF8.self) }, ["1", "20"], "Waiting writes collapse into the newest snapshot")
    }
}

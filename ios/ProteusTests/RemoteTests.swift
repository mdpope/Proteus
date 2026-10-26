import WebKit
import AVFoundation
import CryptoKit
import Network
import SwiftUI
import XCTest
import Combine
@testable import Proteus

private actor PreviewRequestCounter {
    var count = 0
    func record() { count += 1 }
}

final class RemoteTests: XCTestCase {
    @MainActor func testNativeBrowserAutoplayUpdatesExistingFrames() async throws {
        let original = UserDefaults.standard.object(forKey: "proteus.block-video-autoplay")
        let shared = SharedAppStore()
        defer { shared.unloadBrowsers(); if let original { UserDefaults.standard.set(original, forKey: "proteus.block-video-autoplay") } else { UserDefaults.standard.removeObject(forKey: "proteus.block-video-autoplay") } }
        shared.setBlockVideoAutoplay(true)
        let id = try XCTUnwrap(shared.open(nil, scope: "main"))
        let tab = try XCTUnwrap(shared.browserTabs.first { $0.id == id })
        let view = shared.webView(tab)
        // Spy on the platform play boundary so no audio/decoder service is required.
        let controller = view.configuration.userContentController, scripts = view.configuration.userContentController.userScripts.map { $0 }
        controller.removeAllUserScripts()
        // WebKit's native evaluation APIs grant user activation. Keep this fixture
        // unattended so that querying it cannot authorize the play being tested.
        controller.addUserScript(WKUserScript(source: "Object.defineProperty(navigator,'userActivation',{value:{hasBeenActive:false}});HTMLMediaElement.prototype.play=function(){return Promise.resolve()}", injectionTime: .atDocumentStart, forMainFrameOnly: false))
        for script in scripts { controller.addUserScript(script) }
        view.loadHTMLString("<video></video><iframe srcdoc='<video></video>'></iframe>", baseURL: nil)
        for _ in 0..<100 { try await Task.sleep(for: .milliseconds(50)); if !view.isLoading, (try? await view.evaluateJavaScript("!!document.querySelector('iframe')?.contentDocument?.querySelector('video')")) as? Bool == true { break } }
        let script = "return await Promise.all([window,document.querySelector('iframe').contentWindow].map(w=>w.document.querySelector('video').play().then(()=>'played',e=>e.name)))"
        func results() async throws -> [String] {
            let value: Any = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Any, Error>) in
                view.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { continuation.resume(with: $0) }
            }
            return value as? [String] ?? []
        }
        let before = try await results()
        XCTAssertEqual(before, ["NotAllowedError", "NotAllowedError"])
        shared.setBlockVideoAutoplay(false); try await Task.sleep(for: .milliseconds(150))
        let allowed = try await results()
        XCTAssertEqual(allowed, ["played", "played"])
        shared.setBlockVideoAutoplay(true); try await Task.sleep(for: .milliseconds(150))
        let blocked = try await results()
        XCTAssertEqual(blocked, ["NotAllowedError", "NotAllowedError"])
    }

    @MainActor func testNativePalettePersistenceAndDomainScaleIdentity() throws {
        let suite = "proteus.synthetic.palette." + UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let palette = NativePalette(defaults: defaults)
        palette.value.name = "Synthetic green"; palette.value.colors["background"] = "#284c35"; palette.value.brightness = 5
        let highlight = palette.color("accent")
        try palette.save(defaults: defaults)
        let restored = NativePalette(defaults: defaults)
        XCTAssertEqual(restored.value.name, "Synthetic green"); XCTAssertEqual(restored.value.colors["background"], "#284c35")
        restored.value.brightness = 20; XCTAssertEqual(restored.color("accent"), highlight)
        restored.value.colors["background"] = "url(bad)"; XCTAssertThrowsError(try restored.value.validated())
        XCTAssertEqual(SharedAppStore.pageScaleDomain(URL(string: "https://www.news.example.test/story/1")!), "news.example.test")
        XCTAssertEqual(SharedAppStore.pageScaleDomain(URL(string: "https://news.example.co.uk/path")!), "example.co.uk")
        XCTAssertEqual(SharedAppStore.pageScaleDomain(URL(string: "https://first.github.io/path")!), "first.github.io")
        XCTAssertEqual(SharedAppStore.pageScaleDomain(URL(string: "https://second.github.io/path")!), "second.github.io")
        XCTAssertNil(SharedAppStore.pageScaleDomain(URL(string: "file:///private/test")!))
    }

    @MainActor func testMobileBrowserProjectionPreservesNonbrowserOwnerSlots() {
        let shared = SharedAppStore(), scope = "team:projection-test"
        let chat: JSON = .object(["id": .string("chat:retained"), "type": .string("chat"), "chatId": .string("retained"), "title": .string("Retained chat")])
        let terminal: JSON = .object(["id": .string("terminal:retained"), "type": .string("terminal"), "terminalId": .string("retained"), "title": .string("Retained terminal")])
        let browser: JSON = .object(["id": .string("browser-one"), "type": .string("browser"), "title": .string("Page"), "url": .string("https://example.test/")])
        shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([chat, browser, terminal])]), scope: scope)
        XCTAssertEqual(shared.localContentTabs(scope).map { $0["id"] }, [chat["id"], browser["id"], terminal["id"]])
        XCTAssertEqual(shared.localContentTabs(scope).filter { $0["type"].string != "browser" }, [chat, terminal])
    }

    @MainActor func testPrivateThumbnailCacheSurvivesMemoryLossAndSeparatesScopes() async throws {
        let key = "synthetic-cache:" + UUID().uuidString, other = key + ":other-account"
        defer { NativeThumbnailCache.remove(key); NativeThumbnailCache.remove(other) }
        let image = UIGraphicsImageRenderer(size: CGSize(width: 32, height: 24)).image { context in UIColor.green.setFill(); context.fill(CGRect(x: 0, y: 0, width: 32, height: 24)) }
        NativeThumbnailCache.save(image, key: key)
        for _ in 0..<100 { if NativeThumbnailCache.load(key) != nil { break }; try await Task.sleep(for: .milliseconds(20)) }
        XCTAssertNotNil(NativeThumbnailCache.load(key))
        XCTAssertNil(NativeThumbnailCache.load(other))
        NativeThumbnailCache.remove(key)
        for _ in 0..<100 { if NativeThumbnailCache.load(key) == nil { break }; try await Task.sleep(for: .milliseconds(20)) }
        XCTAssertNil(NativeThumbnailCache.load(key))
    }
    func testAddressSwipesRequireDeliberateHorizontalTravelAndScrollChromeHasHysteresis() {
        XCTAssertEqual(NativeAddressSwipe.direction(x: -90, y: 12), 1)
        XCTAssertEqual(NativeAddressSwipe.direction(x: 90, y: -12), -1)
        XCTAssertNil(NativeAddressSwipe.direction(x: 20, y: 0))
        XCTAssertNil(NativeAddressSwipe.direction(x: 90, y: 70))
        XCTAssertNil(NativeAddressSwipe.direction(x: .infinity, y: 0))
        XCTAssertEqual(NativeAddressSwipe.chromeVisibility(delta: -90), true)
        XCTAssertEqual(NativeAddressSwipe.chromeVisibility(delta: 40), false)
        XCTAssertNil(NativeAddressSwipe.chromeVisibility(delta: 15))
    }
    @MainActor func testDocumentReadingPositionSurvivesNewStoreAndSeparatesAccounts() throws {
        let account = "synthetic-reading-" + UUID().uuidString, other = UUID().uuidString, key = "document:synthetic"
        let defaultsKey = "proteus.document-positions." + SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
        defer { UserDefaults.standard.removeObject(forKey: defaultsKey) }
        let first = SharedAppStore(); first.reset(for: account)
        first.rememberDocumentScrollOffset(820, for: key); first.flushDocumentScrollPositions()
        let restored = SharedAppStore(); restored.reset(for: account)
        XCTAssertEqual(restored.documentScrollOffset(for: key), 820)
        restored.reset(for: other); XCTAssertNil(restored.documentScrollOffset(for: key))
        restored.reset(for: account); restored.rememberDocumentScrollOffset(.infinity, for: key); restored.flushDocumentScrollPositions()
        XCTAssertEqual(restored.documentScrollOffset(for: key), 820)
    }

    private func projectFixture() throws -> JSON {
        try JSONDecoder().decode(JSON.self, from: Data("""
        {"schemaVersion":1,"revision":"catalog-revision","projects":[
          {"id":"second","workspaceId":"work","name":"Second","futureProject":"preserved"},
          {"id":"general","workspaceId":"work","name":"General"},
          {"id":"other","workspaceId":"elsewhere","name":"Other"}],
          "defaultProjectIds":{"work":"general","elsewhere":"other"},
          "projectRedirects":{"retired":{"workspaceId":"work","projectId":"general"}},
          "memberships":{"chat":{"workspaceId":"work","projectId":"retired"},"unhoused":{"workspaceId":null,"projectId":null}},
          "sourceLibrary":[],"futureCatalog":{"preserve":true}}
        """.utf8))
    }
    func testNativeProjectsKeepManualOrderDefaultsAndSameWorkspaceRedirects() throws {
        let raw = try projectFixture(), catalog = NativeProjectCatalog(raw: raw)
        XCTAssertTrue(catalog.isValid)
        XCTAssertEqual(catalog.projects(in: "work").map { $0["id"].string }, ["second", "general"])
        XCTAssertEqual(catalog.defaultProject(in: "work")?["id"].string, "general")
        XCTAssertEqual(catalog.project(id: "retired", workspaceID: "work")?["id"].string, "general")
        XCTAssertNil(catalog.project(id: "retired", workspaceID: "elsewhere"))
        XCTAssertEqual(catalog.raw["futureCatalog"]["preserve"], .bool(true))
        var invalid = raw.object
        invalid["projectRedirects"] = .object(["loop": .object(["workspaceId": .string("work"), "projectId": .string("loop")]), "cross": .object(["workspaceId": .string("work"), "projectId": .string("other")])])
        XCTAssertNil(NativeProjectCatalog(raw: .object(invalid)).project(id: "loop"))
        XCTAssertNil(NativeProjectCatalog(raw: .object(invalid)).project(id: "cross"))
    }
    func testNativeProjectMembershipDoesNotRehouseOrInferUnknownProjects() throws {
        let catalog = NativeProjectCatalog(raw: try projectFixture())
        XCTAssertEqual(catalog.membership(for: .object(["id": .string("chat")]))["projectId"], .string("general"))
        let unhoused = catalog.membership(for: .object(["id": .string("unhoused"), "workspaceId": .string("work"), "projectId": .string("second")]))
        XCTAssertEqual(unhoused["workspaceId"], .null); XCTAssertEqual(unhoused["projectId"], .null)
        let unknown: JSON = .object(["id": .string("missing"), "workspaceId": .string("work"), "projectId": .string("unavailable")])
        XCTAssertEqual(catalog.membership(for: unknown), unknown)
        XCTAssertEqual(catalog.membership(for: .object(["id": .string("legacy"), "workspaceId": .string("work")]))["projectId"], .string("general"))
        XCTAssertNotEqual(NativeProjectIdentity(hostID: "first", workspaceID: "work", projectID: "general").scope, NativeProjectIdentity(hostID: "second", workspaceID: "work", projectID: "general").scope)
    }
    func testNativeProjectActivityIgnoresFocusAndRetainsUnknownDates() {
        let created = "2026-10-17T10:00:00Z", active = "2026-10-17T11:00:00Z"
        let base: JSON = .object(["createdAt": .string(created), "lastTouchedAt": .string("2026-10-18T12:00:00Z"), "updatedAt": .string("2026-10-18T13:00:00Z")])
        XCTAssertEqual(NativeProjectActivity.date(base), ISO8601DateFormatter().date(from: created))
        var changed = base.object; changed["lastActivityAt"] = .string(active)
        XCTAssertEqual(NativeProjectActivity.date(.object(changed)), ISO8601DateFormatter().date(from: active))
        XCTAssertNil(NativeProjectActivity.date(.object(["lastTouchedAt": .string(active), "updatedAt": .string(active)])))
    }
    @MainActor func testNativeProjectCatalogOfflineCacheRetainsUnknownFieldsHistoryAndDrafts() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let connection = DeviceConnection(relay: "wss://relay.example.test", hostId: UUID().uuidString, deviceId: UUID().uuidString, key: RemoteCrypto.random())
        let store = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false), catalog = try projectFixture()
        store.state = .object(["capabilities": .array([.string("projects.v1")]), "workspaceProjects": catalog])
        let chat: JSON = .object(["id": .string("chat"), "providerSessionId": .string("synthetic-session"), "pendingApproval": .object(["id": .string("synthetic-request")]), "events": .array([.object(["text": .string("Synthetic retained history")])])])
        store.chats["chat"] = chat; store.setDraft("reply:chat", .string("Synthetic unsent draft")); store.flushCache()
        let restored = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false)
        XCTAssertFalse(restored.connected); XCTAssertTrue(restored.supportsProjects)
        XCTAssertEqual(restored.projectCatalog.raw, catalog); XCTAssertEqual(restored.chats["chat"], chat)
        XCTAssertEqual(restored.draft("reply:chat"), .string("Synthetic unsent draft"))
        var oldHost = restored.state.object; oldHost["capabilities"] = .array([]); restored.state = .object(oldHost)
        XCTAssertFalse(restored.supportsProjects); XCTAssertEqual(restored.projectCatalog.raw, catalog)
    }
    @MainActor func testNativeProjectScopesRetainAllTypesOrderAndOwnerIsolationAfterRestart() throws {
        let shared = SharedAppStore(), host = UUID().uuidString, other = UUID().uuidString
        let scope = "project:" + host + ":general", otherScope = "project:" + other + ":general"
        let descriptors: [JSON] = [
            .object(["id": .string("chat-view"), "type": .string("chat"), "chatId": .string("chat"), "hidden": .bool(true)]),
            .object(["id": .string("terminal"), "type": .string("terminal"), "sessionId": .string("synthetic-session")]),
            .object(["id": .string("document:document"), "type": .string("document"), "documentId": .string("document"), "associationChatId": .string("origin-chat"), "title": .string("Document")]),
            .object(["id": .string("browser"), "type": .string("browser"), "title": .string("Browser"), "lastActivityAt": .string("2026-10-17T11:00:00Z"), "futureDescriptor": .string("retained")])]
        let snapshot: JSON = .object(["revision": .number(4), "tabs": .array(descriptors)])
        shared.applyContentTabs(snapshot, scope: scope); shared.applyContentTabs(snapshot, scope: otherScope)
        let browser = try XCTUnwrap(shared.tabs(in: scope).first)
        XCTAssertNotEqual(browser.id, shared.tabs(in: otherScope).first?.id)
        XCTAssertEqual(browser.ownerHostId, host)
        shared.touch(browser.id)
        XCTAssertEqual(shared.tabs(in: scope).first?.lastActivityAt, "2026-10-17T11:00:00Z")
        let restored = SharedAppStore()
        defer { shared.revokeContentHost(host); shared.revokeContentHost(other); restored.revokeContentHost(host); restored.revokeContentHost(other) }
        XCTAssertEqual(restored.workspaceContentDescriptors[scope], descriptors)
        XCTAssertEqual(restored.chatChildOrder[scope], ["chat-view", "terminal", "document", browser.id])
        shared.applyContentTabs(.object(["revision": .number(5), "tabs": .array([])]), scope: scope)
        XCTAssertEqual(shared.workspaceContentDescriptors[otherScope], descriptors)
    }
    @MainActor func testNativeProjectDeletionRedirectKeepsLiveBrowserIdentityAndDirectResources() throws {
        let shared = SharedAppStore(), host = UUID().uuidString
        let source = "project:" + host + ":retired", target = "project:" + host + ":general", workspace = "workspace:" + host + ":work"
        let tab: JSON = .object(["id": .string("browser"), "type": .string("browser"), "title": .string("Retained browser"), "persist": .bool(true)])
        shared.applyContentTabs(.object(["revision": .number(2), "tabs": .array([tab])]), scope: source)
        shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([tab])]), scope: workspace)
        let browser = try XCTUnwrap(shared.tabs(in: source).first), view = shared.webView(try XCTUnwrap(shared.tabs(in: source).first))
        shared.selectChatChild(browser.id, for: source)
        shared.reconcileProjectScopes(catalog: NativeProjectCatalog(raw: try projectFixture()), hostID: host)
        defer { shared.revokeContentHost(host) }
        let moved = try XCTUnwrap(shared.tabs(in: target).first)
        XCTAssertEqual(moved.id, browser.id); XCTAssertEqual(moved.contentTabId, browser.contentTabId)
        XCTAssertTrue(shared.webView(moved) === view); XCTAssertTrue(moved.persist)
        XCTAssertEqual(shared.chatSelectedChildren[target], browser.id); XCTAssertTrue(shared.tabs(in: source).isEmpty)
        XCTAssertEqual(shared.tabs(in: workspace).count, 1)
        XCTAssertNil(shared.contentPending[target], "Owner reconciliation must not reopen or execute a moved resource")
        let restored = SharedAppStore(); defer { restored.revokeContentHost(host) }
        XCTAssertEqual(restored.workspaceContentDescriptors[target]?.first?["id"], .string("browser"))
        XCTAssertNil(restored.workspaceContentDescriptors[source])
    }
    @MainActor func testNativeProjectOwnerMovePreservesHistoryAndAllResourceMetadataWithoutRepublishing() throws {
        let shared = SharedAppStore(), host = UUID().uuidString
        let source = "project:" + host + ":second", destination = "project:" + host + ":general"
        let rows: [JSON] = [
            .object(["id": .string("browser"), "type": .string("browser"), "title": .string("Page"), "history": .object(["entries": .array([.object(["id": .string("entry"), "url": .string("https://example.test/page"), "title": .string("Page")])]), "index": .number(0), "revision": .number(7)])]),
            .object(["id": .string("terminal"), "type": .string("terminal"), "sessionId": .string("unchanged-session")]),
            .object(["id": .string("document:source"), "type": .string("document"), "documentId": .string("source"), "associationChatId": .string("original-chat")])]
        shared.applyContentTabs(.object(["revision": .number(5), "tabs": .array(rows)]), scope: source)
        let browser = try XCTUnwrap(shared.tabs(in: source).first), view = shared.webView(try XCTUnwrap(shared.tabs(in: source).first))
        for row in rows { shared.applyOwnedContentMove(tabID: row["id"].string, from: source, to: destination, hostID: host) }
        defer { shared.revokeContentHost(host) }
        let moved = try XCTUnwrap(shared.tabs(in: destination).first)
        XCTAssertEqual(moved.id, browser.id); XCTAssertEqual(moved.history, browser.history); XCTAssertTrue(shared.webView(moved) === view)
        XCTAssertEqual(shared.workspaceContentDescriptors[destination], rows)
        XCTAssertEqual(shared.documents(in: destination).first?.id, "source")
        XCTAssertTrue(shared.documents(in: source).isEmpty); XCTAssertTrue(shared.tabs(in: source).isEmpty)
        XCTAssertFalse(shared.hasPendingContent(in: source)); XCTAssertFalse(shared.hasPendingContent(in: destination))
    }
    @MainActor func testNativeProjectRedirectRetainsUnconfirmedOriginalOperationsThroughRestart() throws {
        let shared = SharedAppStore(), host = UUID().uuidString, source = "project:" + host + ":retired"
        let pending: JSON = .object(["action": .string("browser-navigate"), "tabId": .string("browser"), "operationId": .string("original-operation")])
        let snapshot: JSON = .object(["revision": .number(6), "tabs": .array([.object(["id": .string("browser"), "type": .string("browser"), "title": .string("Retained pending page")])])])
        shared.applyContentTabs(snapshot, scope: source)
        shared.preserveBrowserNavigationConflict(scope: source, operations: [], pending: [pending], fresh: snapshot)
        shared.reconcileProjectScopes(catalog: NativeProjectCatalog(raw: try projectFixture()), hostID: host)
        XCTAssertEqual(shared.contentPending[source], [pending]); XCTAssertFalse(shared.tabs(in: source).isEmpty)
        XCTAssertNotNil(shared.error)
        let restored = SharedAppStore(); defer { shared.revokeContentHost(host); restored.revokeContentHost(host) }
        XCTAssertEqual(restored.contentPending[source], [pending]); XCTAssertNotNil(restored.workspaceContentDescriptors[source])
    }
    @MainActor func testContextSelectionUsesCurrentWorkspaceFavoritesBeforeScopedCatalogReloads() {
        let scoped: JSON = .object(["favorites": .array([.string("old-skill")])])
        let host: JSON = .object(["workspaces": .array([
            .object(["id": .string("selected"), "favorites": .array([.string("new-skill")])]),
            .object(["id": .string("empty"), "favorites": .array([])])
        ])])
        XCTAssertEqual(ContextSelection.favoriteIDs(hostCatalog: host, scopedCatalog: scoped, workspaceID: "selected"), ["new-skill"])
        XCTAssertEqual(ContextSelection.favoriteIDs(hostCatalog: host, scopedCatalog: scoped, workspaceID: "empty"), [])
        XCTAssertEqual(ContextSelection.favoriteIDs(hostCatalog: host, scopedCatalog: scoped, workspaceID: "legacy"), ["old-skill"])
        // Captured chat workspaces contain paths, while their stable identity is separate.
        let captured: JSON = .object(["cwd": .string("/synthetic/nondefault"), "additionalDirectories": .array([])])
        let explicitID = ContextSelection.selectionWorkspaceID("selected", profile: captured)
        XCTAssertEqual(explicitID, "selected")
        XCTAssertEqual(ContextSelection.favoriteIDs(hostCatalog: host, scopedCatalog: scoped, workspaceID: explicitID), ["new-skill"])
        XCTAssertEqual(ContextSelection.selectionWorkspaceID("", profile: .object(["id": .string("empty")])), "empty")
    }
    @MainActor func testMirroredRedirectDoesNotCreateAVisitOrReplaceLogicalForwardList() {
        let shared = SharedAppStore(), host = UUID().uuidString
        let entries = ["one", "two", "three"].map { BrowserHistoryEntry(id: $0, url: "\(nativeFixtureHTTPOrigin)/browser/" + $0, title: $0) }
        shared.browserTabs = [BrowserDescriptor(id: "mirror", title: "two", url: entries[1].url, scope: "main", history: BrowserTabHistory(entries: entries, index: 1, currentEntryId: "two", revision: 6))]
        shared.assignBrowserOwner("mirror", host: host)
        _ = shared.webView(shared.browserTabs[0], allowLocalNavigation: true); defer { shared.unloadBrowsers() }
        let before = shared.historyOutbox.count
        shared.completeBrowserNavigation(URL(string: entries[2].url)!, title: "Device redirect", in: "mirror")
        XCTAssertEqual(shared.browserTabs[0].url, entries[1].url); XCTAssertEqual(shared.browserTabs[0].history?.entries, entries); XCTAssertEqual(shared.browserTabs[0].history?.index, 1); XCTAssertEqual(shared.historyOutbox.count, before)
        shared.prepareBrowserLoad(URL(string: entries[1].url)!, in: "mirror")
        shared.markBrowserRedirect("mirror", url: URL(string: "\(nativeFixtureHTTPOrigin)/browser/device-signin")!)
        shared.markBrowserRedirect("mirror", url: URL(string: "\(nativeFixtureHTTPOrigin)/browser/device-session")!)
        for _ in 0..<3 { shared.completeBrowserNavigation(URL(string: "\(nativeFixtureHTTPOrigin)/browser/device-session")!, title: "Device session", in: "mirror", sameDocumentObservation: true) }
        XCTAssertEqual(shared.browserTabs[0].url, entries[1].url)
        XCTAssertEqual(shared.browserTabs[0].history?.entries, entries, "Redirect chains and duplicate KVO/finish callbacks must not replace shared history")
        XCTAssertEqual(shared.historyOutbox.count, before)
        let spa = URL(string: "\(nativeFixtureHTTPOrigin)/browser/chosen-by-button")!
        (shared.webView(shared.browserTabs[0], allowLocalNavigation: true) as? NativeLinkWebView)?.noteNavigationIntent()
        shared.completeBrowserNavigation(spa, title: "Chosen by button", in: "mirror", sameDocumentObservation: true)
        XCTAssertEqual(shared.browserTabs[0].url, spa.absoluteString, "A trusted SPA button action releases the mirrored-load guard")
        XCTAssertEqual(shared.historyOutbox.count, before + 1)
        let chosen = URL(string: "\(nativeFixtureHTTPOrigin)/browser/chosen")!
        XCTAssertTrue(shared.navigate(chosen, in: "mirror")); shared.completeBrowserNavigation(chosen, title: "Chosen page", in: "mirror")
        XCTAssertEqual(shared.browserTabs[0].url, chosen.absoluteString)
        XCTAssertEqual(shared.historyOutbox.count, before + 2, "A deliberate navigation still creates its own visit")
    }
    @MainActor func testNativeURLPolicyExcludesSignedCookiesAndCanonicalOverlength() {
        for key in ["cookie", "signedCookie", "signed_cookie", "signed-cookie", "X-Amz-Credential", "X-Amz-Signature", "X-Amz-Security-Token", "X-Goog-Credential", "X-Goog-Signature", "X-Goog-Security-Token", "Key-Pair-Id"] {
            XCTAssertNil(SharedAppStore.safeURL("https://example.test/file?" + key + "=private"), key)
            XCTAssertNil(SharedAppStore.safeURL("https://example.test/file#" + key + "=private"), key)
        }
        XCTAssertNil(SharedAppStore.safeURL("https://example.test/" + String(repeating: "a", count: 4096)))
    }
    @MainActor func testStandaloneAndTeamSnapshotsKeepOtherOwnerTabs() {
        let shared = SharedAppStore(), first = UUID().uuidString, second = UUID().uuidString
        let tab: JSON = .object(["id": .string("same-tab-id"), "type": .string("browser"), "title": .string("Saved page"), "url": .string("https://example.test/page")])
        for kind in ["main", "team"] {
            shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([tab])]), scope: kind + ":" + first)
            shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array([tab])]), scope: kind + ":" + second)
            XCTAssertEqual(shared.tabs(in: kind + ":" + first).count, 1); XCTAssertEqual(shared.tabs(in: kind + ":" + second).count, 1)
            XCTAssertNotEqual(shared.tabs(in: kind + ":" + first).first?.id, shared.tabs(in: kind + ":" + second).first?.id)
            shared.applyContentTabs(.object(["revision": .number(2), "tabs": .array([])]), scope: kind + ":" + first)
            XCTAssertEqual(shared.tabs(in: kind + ":" + second).count, 1, "Closing on one owner must preserve another owner's row")
        }
    }
    @MainActor func testOpeningUnavailableHistoryProfilePreservesPreviousTabAndOwner() throws {
        let shared = SharedAppStore(), previousOwner = UUID().uuidString, historyOwner = UUID().uuidString
        let previous = try XCTUnwrap(shared.open(URL(string: "https://example.test/previous"), scope: "main"))
        let unknown = UUID().uuidString
        XCTAssertNil(shared.openHistoryVisit(.object(["url": .string("https://example.test/named"), "profileId": .string(unknown)]), ownerHostID: historyOwner))
        XCTAssertNil(shared.browserTabs[0].ownerHostId, "A failed profile open must not claim an existing unowned tab")
        shared.assignBrowserOwner(previous, host: previousOwner)
        XCTAssertNil(shared.openHistoryVisit(.object(["url": .string("https://example.test/named"), "profileId": .string(unknown), "title": .string("Named history")]), ownerHostID: historyOwner))
        XCTAssertEqual(shared.selectedMainBrowser, previous); XCTAssertEqual(shared.browserTabs.count, 1); XCTAssertEqual(shared.browserTabs[0].ownerHostId, previousOwner)
        let defaultVisit = try XCTUnwrap(shared.openHistoryVisit(.object(["url": .string("https://example.test/default"), "profileId": .string("default"), "title": .string("Default history")]), ownerHostID: historyOwner))
        XCTAssertNotEqual(defaultVisit, previous); XCTAssertEqual(shared.browserTabs.first(where: { $0.id == defaultVisit })?.ownerHostId, historyOwner); XCTAssertEqual(shared.browserTabs.first(where: { $0.id == previous })?.ownerHostId, previousOwner)
        shared.revokeContentHost(previousOwner); shared.revokeContentHost(historyOwner)
    }
    @MainActor func testHistoryProfileChoicesUseOwnerCatalogAndKeepUnknownCachedIDs() {
        let choices = NativeBrowserHistoryView.profileChoices(ownerProfiles: [.object(["id": .string("default"), "name": .string("Default")]), .object(["id": .string("owner-work"), "name": .string("Owner Work")])], cachedIDs: ["legacy-profile", "owner-work", "default"])
        XCTAssertEqual(choices.map { $0["id"].string }, ["", "default", "owner-work", "legacy-profile"])
        XCTAssertEqual(choices[2]["name"].string, "Owner Work"); XCTAssertTrue(choices[3]["name"].string.hasPrefix("Saved profile"))
        let otherOwner = NativeBrowserHistoryView.profileChoices(ownerProfiles: [], cachedIDs: ["other-owner-profile"])
        XCTAssertFalse(otherOwner.contains(where: { $0["id"].string == "owner-work" }))
    }
    @MainActor func testNativeHistorySettingsMergeKeepsUnknownAndUneditedOwnerPreferences() throws {
        let owner = UUID().uuidString, peer = UUID().uuidString, other = UUID().uuidString
        let original: JSON = .object(["enabled": .bool(true), "retentionDays": .number(30), "futureRoot": .string("original"), "peers": .array([.object(["hostId": .string(peer), "enabled": .bool(false), "backfill": .string("7"), "profileIds": .array([.string("default")]), "futurePeer": .string("original")])])])
        var draft = NativeHistorySettingsDraft(original); draft.enabled = false; draft.retentionDays = 0; draft.setPeer(peer, key: "enabled", value: .bool(true)); draft.setPeer(peer, key: "backfill", value: .string("all"))
        var latest = original.object
        latest["availablePeers"] = .array([.object(["hostId": .string(peer)])]); latest["availableProfiles"] = .array([.object(["id": .string("default")])])
        latest["peers"] = .array([.object(["hostId": .string(peer), "enabled": .bool(false), "backfill": .string("30"), "profileIds": .array([.string("default"), .string("retained-unknown-profile")]), "futurePeer": .string("newer"), "lastSyncAt": .string("runtime"), "cursor": .string("runtime")]), .object(["hostId": .string(other), "enabled": .bool(false), "backfill": .string("7"), "profileIds": .array([.string("default")]), "futurePeer": .string("untouched")])])
        let payload = try draft.payload(merging: .object(latest), ownerHostID: owner)
        XCTAssertEqual(payload["action"].string, "set"); XCTAssertEqual(payload["enabled"], .bool(false)); XCTAssertEqual(payload["retentionDays"], .number(0))
        XCTAssertEqual(payload["peers"].array[0]["futurePeer"].string, "newer"); XCTAssertEqual(payload["peers"].array[0]["profileIds"].array, [.string("default"), .string("retained-unknown-profile")])
        XCTAssertEqual(payload["peers"].array[0]["lastSyncAt"], .null); XCTAssertEqual(payload["peers"].array[0]["cursor"], .null)
        XCTAssertEqual(payload["peers"].array[1]["futurePeer"].string, "untouched"); XCTAssertEqual(payload["futureRoot"], .null, "Only edited known root fields are sent; owner retains unknown preferences")
    }
    @MainActor func testNativeHistorySettingsRejectsGrantExpansionAndEmptyProfiles() throws {
        let owner = UUID().uuidString, peer = UUID().uuidString
        let settings: JSON = .object(["availablePeers": .array([.object(["hostId": .string(peer)])]), "availableProfiles": .array([.object(["id": .string("default")])]), "peers": .array([])])
        var draft = NativeHistorySettingsDraft(settings)
        XCTAssertEqual(draft.retentionDays, 0); XCTAssertEqual(try draft.payload(merging: settings, ownerHostID: owner).object.count, 1)
        draft.setPeer(owner, key: "enabled", value: .bool(true)); XCTAssertThrowsError(try draft.payload(merging: settings, ownerHostID: owner))
        draft = NativeHistorySettingsDraft(settings); draft.setPeer(UUID().uuidString, key: "enabled", value: .bool(true)); XCTAssertThrowsError(try draft.payload(merging: settings, ownerHostID: owner))
        draft = NativeHistorySettingsDraft(settings); draft.selectProfile("unavailable", host: peer, enabled: true); XCTAssertThrowsError(try draft.payload(merging: settings, ownerHostID: owner))
        draft = NativeHistorySettingsDraft(settings); draft.selectProfile("default", host: peer, enabled: false); XCTAssertThrowsError(try draft.payload(merging: settings, ownerHostID: owner))
        draft = NativeHistorySettingsDraft(settings); draft.retentionDays = 365; XCTAssertEqual(try draft.payload(merging: settings, ownerHostID: owner)["retentionDays"], .number(365))
    }
    @MainActor func testOfflineConflictPreservesOtherTabsReceiptsAndOffersSameScopeRecovery() throws {
        let shared = SharedAppStore(), host = UUID().uuidString, scope = "chat:" + host + ":" + UUID().uuidString
        let firstEntries = ["one", "local-branch"].map { BrowserHistoryEntry(id: $0, url: "https://example.test/" + $0, title: $0) }
        shared.browserTabs = [
            BrowserDescriptor(id: "local-a", title: "Local branch", url: firstEntries[1].url, scope: scope, contentTabId: "a", history: BrowserTabHistory(entries: firstEntries, index: 1, revision: 2)),
            BrowserDescriptor(id: "local-b", title: "Other pending page", url: "https://example.test/other", scope: scope, contentTabId: "b")
        ]
        let first: JSON = .object(["action": .string("browser-navigate"), "tabId": .string("a"), "operationId": .string("rejected-a")])
        let firstLater: JSON = .object(["action": .string("browser-traverse"), "tabId": .string("a"), "operationId": .string("later-a")])
        let second: JSON = .object(["action": .string("browser-navigate"), "tabId": .string("b"), "operationId": .string("preserve-b")])
        let rename: JSON = .object(["action": .string("rename"), "id": .string("b"), "title": .string("Other pending page")])
        let fresh: JSON = .object(["revision": .number(8), "tabs": .array([
            .object(["id": .string("a"), "type": .string("browser"), "url": .string("https://example.test/owner"), "title": .string("Owner page")]),
            .object(["id": .string("b"), "type": .string("browser"), "url": .string("https://example.test/old"), "title": .string("Old page")])
        ])])
        shared.preserveBrowserNavigationConflict(scope: scope, operations: [first], pending: [first, second, firstLater, rename], fresh: fresh)
        XCTAssertEqual(shared.contentPending[scope], [second, rename], "One rejected tab must not drop another tab's original receipts")
        XCTAssertEqual(shared.tabs(in: scope).count, 2, "Recovery never creates an unsolicited tab")
        XCTAssertEqual(shared.tabs(in: scope).first(where: { $0.contentTabId == "b" })?.url, "https://example.test/other")
        let conflict = try XCTUnwrap(shared.browserConflicts.first(where: { $0.scope == scope }))
        XCTAssertEqual(conflict.operations, [first, firstLater]); XCTAssertEqual(conflict.tab.history?.entries, firstEntries)
        let restarted = SharedAppStore(); defer { shared.revokeContentHost(host); restarted.revokeContentHost(host) }
        XCTAssertEqual(restarted.contentPending[scope], [second, rename]); XCTAssertEqual(restarted.browserConflicts.first(where: { $0.id == conflict.id }), conflict)
        shared.resolveBrowserNavigationConflict(conflict.id, openLocalCopy: true)
        let recovered = try XCTUnwrap(shared.tabs(in: scope).first(where: { $0.title.hasPrefix("Offline copy") }))
        XCTAssertEqual(recovered.scope, scope); XCTAssertEqual(recovered.history?.entries, firstEntries); XCTAssertEqual(recovered.history?.revision, 0)
        XCTAssertNil(recovered.contentTabId); XCTAssertFalse(shared.browserConflicts.contains(where: { $0.id == conflict.id }))
        XCTAssertEqual(shared.contentPending[scope], [second, rename])
    }
    @MainActor func testOwnerNavigationAppliesWhenScopeMetadataRevisionIsUnchanged() {
        let shared = SharedAppStore(), scope = "main:" + UUID().uuidString
        let entries = ["one", "two", "three"].map { BrowserHistoryEntry(id: $0, url: "https://example.test/" + $0, title: $0) }
        func snapshot(index: Int, navigationRevision: Int) -> JSON {
            let history = BrowserTabHistory(entries: entries, index: index, currentEntryId: entries[index].id, revision: navigationRevision)
            return .object(["revision": .number(7), "tabs": .array([.object(["id": .string("owner-tab"), "type": .string("browser"), "title": .string(entries[index].title), "url": .string(entries[index].url), "history": try! JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(history))])])])
        }
        shared.applyContentTabs(snapshot(index: 1, navigationRevision: 3), scope: scope)
        let localID = shared.tabs(in: scope).first?.id
        shared.applyContentTabs(snapshot(index: 0, navigationRevision: 4), scope: scope)
        let refreshed = shared.tabs(in: scope).first
        XCTAssertEqual(refreshed?.id, localID); XCTAssertEqual(refreshed?.url, entries[0].url)
        XCTAssertEqual(refreshed?.history?.currentEntryId, "one"); XCTAssertEqual(refreshed?.history?.revision, 4)
        XCTAssertEqual(refreshed?.history?.entries, entries, "Owner traversal preserves the full Forward list")
        shared.revokeContentHost(String(scope.dropFirst("main:".count)))
    }
    @MainActor func testHistoryCacheDayBoundaryUsesCalendarAcrossDST() throws {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(identifier: "America/Denver")!
        let now = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-11-15T18:00:00Z"))
        let threshold = SharedAppStore.historyCacheStart(now: now, calendar: calendar)
        let components = calendar.dateComponents([.year, .month, .day, .hour], from: threshold)
        XCTAssertEqual(components.year, 2026); XCTAssertEqual(components.month, 10); XCTAssertEqual(components.day, 16); XCTAssertEqual(components.hour, 0)
    }
    @MainActor func testHistoryOutboxRetainsExactOwnerAndEventAcrossRestart() throws {
        let host = UUID().uuidString, shared = SharedAppStore(), id = UUID().uuidString
        shared.browserTabs = [BrowserDescriptor(id: id, title: "Page", url: nil, scope: "main")]
        shared.assignBrowserOwner(id, host: host)
        let url = URL(string: "https://example.test/page?view=one")!
        XCTAssertTrue(shared.navigate(url, in: id)); shared.completeBrowserNavigation(url, title: "Page", in: id)
        let visit = try XCTUnwrap(shared.historyOutbox.last(where: { $0["ownerHostId"].string == host }))
        XCTAssertFalse(visit["eventId"].string.isEmpty); XCTAssertFalse(visit["visitedAt"].string.isEmpty)
        XCTAssertEqual(visit["sourceHostId"].string, host); XCTAssertEqual(visit["url"].string, url.absoluteString)
        let restarted = SharedAppStore(); defer { restarted.revokeContentHost(host) }
        XCTAssertEqual(restarted.historyOutbox.first(where: { $0["eventId"] == visit["eventId"] }), visit)
        restarted.assignBrowserOwner(id, host: UUID().uuidString)
        XCTAssertEqual(restarted.historyOutbox.first(where: { $0["eventId"] == visit["eventId"] })?["ownerHostId"].string, host)
    }
    @MainActor func testInvalidAndFailedNavigationNeverEraseSharedForwardEntries() {
        let shared = SharedAppStore()
        let entries = ["one", "two", "three"].map { BrowserHistoryEntry(id: $0, url: "https://example.test/" + $0, title: $0) }
        shared.browserTabs = [BrowserDescriptor(id: "tab", title: "two", url: entries[1].url, history: BrowserTabHistory(entries: entries, index: 1, revision: 4))]
        shared.completeBrowserNavigation(URL(string: "about:blank")!, title: "Invalid location", in: "tab")
        shared.failBrowserNavigation("tab", currentURL: URL(string: "about:blank"))
        shared.unload("tab")
        XCTAssertEqual(shared.browserTabs[0].url, entries[1].url)
        XCTAssertEqual(shared.browserTabs[0].history?.entries, entries)
        XCTAssertEqual(shared.browserHistory("tab", back: false).first?.url.absoluteString, entries[2].url)
    }
    @MainActor func testLogicalHistoryKeepsStableIDsAndFullForwardList() throws {
        let entries = (0..<240).map { BrowserHistoryEntry(id: "entry-\($0)", url: "https://example.test/\($0)", title: "Page \($0)") }
        let history = BrowserTabHistory(entries: entries, index: 100, currentEntryId: entries[100].id, revision: 12)
        let retained = try XCTUnwrap(SharedAppStore.safeBrowserHistory(history))
        XCTAssertEqual(retained.entries.count, 240); XCTAssertEqual(retained.currentEntryId, "entry-100"); XCTAssertEqual(retained.revision, 12)
        var json = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(retained)).object
        json["index"] = .number(0)
        let decoded = try XCTUnwrap(SharedAppStore.decodeBrowserHistory(.object(json)))
        XCTAssertEqual(decoded.index, 100, "Stable selected entry identity overrides an obsolete engine index")
    }
    @MainActor func testTwoFingerTraversalRejectsVerticalAndShortMovement() {
        XCTAssertEqual(NativeBrowser.Coordinator.traversalDirection(x: 100, y: 15), -1)
        XCTAssertEqual(NativeBrowser.Coordinator.traversalDirection(x: -100, y: 15), 1)
        XCTAssertNil(NativeBrowser.Coordinator.traversalDirection(x: 79, y: 0))
        XCTAssertNil(NativeBrowser.Coordinator.traversalDirection(x: 100, y: 60))
        XCTAssertNil(NativeBrowser.Coordinator.traversalDirection(x: .nan, y: 0))
    }
    @MainActor func testChatLinkRejectsAmbiguousAndCredentialFields() throws {
        let host = UUID().uuidString, id = UUID().uuidString
        let link = try XCTUnwrap(NativeChatLink.url(host: host, id: id))
        XCTAssertEqual(NativeChatLink.parse(link)?.host, host); XCTAssertEqual(NativeChatLink.parse(link)?.id, id)
        XCTAssertNil(NativeChatLink.parse(URL(string: link.absoluteString + "&host=" + host)!))
        XCTAssertNil(NativeChatLink.parse(URL(string: link.absoluteString + "&token=secret")!))
        XCTAssertNil(NativeChatLink.parse(URL(string: "https://example.test/chat?host=" + host + "&id=" + id)!))
    }
    @MainActor func testRunFilesFieldsUseOwnerPathsInOrder() {
        let run: JSON = .object(["storage": .object(["run": .string("/owner/run.json"), "nativeSession": .string("/owner/session")]), "schedule": .object(["workspace": .object(["cwd": .string("/owner/start"), "additionalDirectories": .array([.string("/owner/extra")])])])])
        XCTAssertEqual(NativeRunFilesView.paths(run).map { $0.0 }, ["Proteus run record", "Provider session folder", "Starting folder", "Additional workspace folder"])
        XCTAssertEqual(NativeRunFilesView.paths(run).map { $0.1 }, ["/owner/run.json", "/owner/session", "/owner/start", "/owner/extra"])
    }
    @MainActor func testOverviewPinchRequiresCurrentPageMinimumZoom() {
        XCTAssertTrue(NativeBrowser.Coordinator.beginsAtMinimumZoom(1, minimum: 1, fallback: nil))
        XCTAssertFalse(NativeBrowser.Coordinator.beginsAtMinimumZoom(2, minimum: 1, fallback: 2))
        XCTAssertFalse(NativeBrowser.Coordinator.beginsAtMinimumZoom(1, minimum: 0.5, fallback: 1), "The loaded page minimum overrides an earlier initial zoom")
        XCTAssertTrue(NativeBrowser.Coordinator.beginsAtMinimumZoom(0.5, minimum: 0.5, fallback: 1))
        XCTAssertFalse(NativeBrowser.Coordinator.beginsAtMinimumZoom(2, minimum: 0, fallback: 1))
        XCTAssertFalse(NativeBrowser.Coordinator.beginsAtMinimumZoom(.nan, minimum: 1, fallback: nil))
    }
    @MainActor func testBrowserHistoryMenuSelectsOlderDuplicatePageInstance() async throws {
        let shared = SharedAppStore(), id = "duplicate-navigation"
        let base = "\(nativeFixtureHTTPOrigin)/browser/spa"
        shared.browserTabs = [BrowserDescriptor(id: id, title: "SPA", url: base + "?step=1")]
        let view = shared.webView(shared.browserTabs[0], allowLocalNavigation: true)
        defer { shared.unloadBrowsers() }
        XCTAssertFalse(view.allowsBackForwardNavigationGestures, "The content-edge handler exclusively owns browser gestures")
        for _ in 0..<200 { if !view.isLoading, shared.browserTabs[0].history?.entries.count == 1 { break }; try await Task.sleep(for: .milliseconds(50)) }
        XCTAssertEqual(shared.browserTabs[0].history?.entries.count, 1)
        _ = try await view.evaluateJavaScript("history.replaceState({visit:0}, '', '?step=1')")
        for (index, step) in [2, 1, 3].enumerated() {
            _ = try await view.evaluateJavaScript("history.pushState({visit:\(index + 1)}, '', '?step=\(step)')")
            for _ in 0..<100 { if shared.browserTabs[0].history?.entries.count == index + 2 { break }; try await Task.sleep(for: .milliseconds(25)) }
        }
        XCTAssertEqual(shared.browserTabs[0].history?.entries.count, 4)
        XCTAssertFalse(view.allowsBackForwardNavigationGestures, "Navigation observations must not reenable a competing WebKit gesture")
        let entryIDs = shared.browserTabs[0].history?.entries.map(\.id)
        let oldest = try XCTUnwrap(shared.browserHistory(id, back: true).last)
        shared.goBrowserHistory(oldest, in: id)
        var visit: Int?
        for _ in 0..<100 { visit = try await view.evaluateJavaScript("history.state.visit") as? Int; if visit == 0 { break }; try await Task.sleep(for: .milliseconds(25)) }
        XCTAssertEqual(visit, 0, "The oldest repeated URL must select its original native page instance")
        XCTAssertEqual(shared.browserTabs[0].history?.index, 0)
        XCTAssertEqual(shared.browserTabs[0].history?.entries.count, 4)
        XCTAssertEqual(shared.browserTabs[0].history?.entries.map(\.id), entryIDs, "Traversal preserves every saved page identity and forward entry")
        XCTAssertFalse(view.allowsBackForwardNavigationGestures)
    }
    @MainActor func testSupersededBrowserCancellationKeepsNewerHistoryTraversal() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let entries = ["one", "two", "three"].map { BrowserHistoryEntry(url: "https://example.test/" + $0, title: $0) }
        let shared = SharedAppStore(), id = "cancelled-history"
        shared.browserTabs = [BrowserDescriptor(id: id, title: "three", url: nil, history: BrowserTabHistory(entries: entries, index: 2))]
        let view = shared.webView(shared.browserTabs[0]); defer { shared.unloadBrowsers() }
        let earlier = view.loadHTMLString("<p>Third page</p>", baseURL: URL(string: entries[2].url))
        for _ in 0..<100 { if !view.isLoading, view.url?.absoluteString == entries[2].url { break }; try await Task.sleep(for: .milliseconds(50)) }
        XCTAssertEqual(view.url?.absoluteString, entries[2].url)
        let coordinator = NativeBrowser.Coordinator(shared: shared, life: LifeStore(keychainService: UUID().uuidString), destinations: DestinationStore(root: root, keychainService: UUID().uuidString), id: id)
        shared.goBack(id)
        coordinator.webView(view, didFailProvisionalNavigation: earlier, withError: NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled))
        shared.completeBrowserNavigation(URL(string: entries[1].url)!, title: "two", in: id)
        XCTAssertEqual(shared.browserTabs[0].history?.entries.map(\.url), entries.map(\.url), "Cancellation from an earlier load cannot reset the newer traversal or truncate its saved forward stack")
        XCTAssertEqual(shared.browserTabs[0].history?.index, 1)
        shared.unload(id)
        _ = shared.navigate(URL(string: entries[2].url)!, in: id)
        coordinator.webView(view, didFinish: earlier)
        XCTAssertEqual(shared.browserTabs[0].url, entries[2].url, "A queued finish from an unloaded view cannot overwrite its replacement")
    }
    @MainActor func testBrowserSameDocumentHistoryKeepsPushStateAndHashTraversals() {
        let shared = SharedAppStore(); let id = "spa-history"
        shared.browserTabs = [BrowserDescriptor(id: id, title: "SPA", url: nil)]
        let one = URL(string: "https://example.test/spa")!, two = URL(string: "https://example.test/spa?step=2")!, hash = URL(string: "https://example.test/spa?step=2#section")!
        shared.completeBrowserNavigation(one, title: "SPA", in: id, nativePosition: 0)
        shared.completeBrowserNavigation(two, title: "SPA", in: id, nativePosition: 1, sameDocumentObservation: true)
        shared.completeBrowserNavigation(hash, title: "SPA", in: id, nativePosition: 2, sameDocumentObservation: true)
        shared.completeBrowserNavigation(two, title: "SPA", in: id, nativePosition: 1, sameDocumentObservation: true)
        XCTAssertEqual(shared.browserTabs[0].history?.index, 1)
        XCTAssertEqual(shared.browserHistory(id, back: false).map(\.url), [hash])
        shared.completeBrowserNavigation(one, title: "SPA", in: id, nativePosition: 0, sameDocumentObservation: true)
        XCTAssertEqual(shared.browserTabs[0].history?.entries.count, 3)
        XCTAssertEqual(shared.browserTabs[0].history?.index, 0)
    }
    @MainActor func testNewLinkedBrowserTabInsertsAfterSourceInEveryScope() {
        for scope in ["main", "team", "chat:host:chat", "workspace:host:workspace"] {
            let shared = SharedAppStore()
            shared.browserTabs = [BrowserDescriptor(id: "outside", title: "Outside", url: nil, scope: "elsewhere"), BrowserDescriptor(id: "source", title: "Source", url: nil, scope: scope), BrowserDescriptor(id: "tail", title: "Tail", url: nil, scope: scope)]
            shared.open(URL(string: "https://example.test/new"), scope: scope, afterSourceID: "source")
            let inserted = shared.selected(in: scope)!
            XCTAssertEqual(shared.tabs(in: scope).map(\.id), ["source", inserted, "tail"])
            XCTAssertEqual(shared.tabs(in: "elsewhere").map(\.id), ["outside"])
            XCTAssertFalse((try? JSONEncoder().encode(shared.browserTabs)).map { String(decoding: $0, as: UTF8.self).contains("afterSourceID") } ?? true)
            shared.close("source")
            shared.open(nil, scope: scope, afterSourceID: "source")
            XCTAssertEqual(shared.tabs(in: scope).dropLast().map(\.id), [inserted, "tail"])
        }
    }
    @MainActor func testLinkedBrowserInsertionKeepsMixedDocumentOrderAfterSync() {
        let shared = SharedAppStore(), scope = "chat:host:mixed-" + UUID().uuidString
        let initial: [JSON] = [
            .object(["id": .string("source"), "type": .string("browser"), "title": .string("Source"), "url": .string("")]),
            .object(["id": .string("document:doc"), "type": .string("document"), "documentId": .string("doc"), "title": .string("Document"), "mediaType": .string("text/markdown")]),
            .object(["id": .string("tail"), "type": .string("browser"), "title": .string("Tail"), "url": .string("")])
        ]
        shared.applyContentTabs(.object(["revision": .number(1), "tabs": .array(initial)]), scope: scope)
        let source = shared.tabs(in: scope)[0].id, tail = shared.tabs(in: scope)[1].id
        shared.open(nil, scope: scope, afterSourceID: source)
        let created = shared.selected(in: scope)!
        XCTAssertEqual(shared.orderedChatChildren(in: scope, documentIDs: ["doc"]), [source, created, "doc", tail])
        var echoed = initial; echoed.insert(.object(["id": .string(created), "type": .string("browser"), "title": .string("New tab"), "url": .string("")]), at: 1)
        shared.applyContentTabs(.object(["revision": .number(2), "tabs": .array(echoed)]), scope: scope)
        XCTAssertEqual(shared.orderedChatChildren(in: scope, documentIDs: ["doc"]), [source, created, "doc", tail])
    }
    @MainActor func testFinishedBrowserTraversalKeepsRestoredForwardHistory() throws {
        let entries = ["one", "two", "three"].map { BrowserHistoryEntry(url: "https://example.test/" + $0, title: $0) }
        let descriptor = BrowserDescriptor(id: "restored-stack", title: "three", url: entries[2].url, history: BrowserTabHistory(entries: entries, index: 2))
        let restored = try JSONDecoder().decode(BrowserDescriptor.self, from: JSONEncoder().encode(descriptor))
        let shared = SharedAppStore(); shared.browserTabs = [restored]
        shared.unload(restored.id)
        XCTAssertEqual(shared.browserTabs[0].history, restored.history, "Unloading keeps the saved per-tab stack")
        shared.reload(restored.id)
        shared.goBack(restored.id)
        shared.completeBrowserNavigation(URL(string: entries[1].url)!, title: "two", in: restored.id)
        XCTAssertEqual(shared.browserTabs[0].history?.entries, entries)
        XCTAssertEqual(shared.browserTabs[0].history?.index, 1)
        XCTAssertEqual(shared.browserHistory(restored.id, back: false).map(\.url.absoluteString), [entries[2].url])
        shared.goForward(restored.id)
        shared.completeBrowserNavigation(URL(string: entries[2].url)!, title: "three", in: restored.id)
        XCTAssertEqual(shared.browserTabs[0].history?.entries.count, 3)
        XCTAssertEqual(shared.browserTabs[0].history?.index, 2)
        shared.goBack(restored.id)
        shared.failBrowserNavigation(restored.id, currentURL: URL(string: entries[2].url))
        XCTAssertEqual(shared.browserTabs[0].history?.index, 1, "Engine failure cannot change the logical cursor already selected by the user")
        XCTAssertEqual(shared.browserTabs[0].history?.entries, entries, "A failed/cancelled traversal retains the forward stack")
        shared.prepareBrowserHistoryNavigation(URL(string: entries[0].url)!, in: restored.id)
        shared.completeBrowserNavigation(URL(string: entries[0].url)!, title: "one", in: restored.id)
        XCTAssertEqual(shared.browserTabs[0].history?.index, 0)
        XCTAssertEqual(shared.browserHistory(restored.id, back: false).count, 2)
        shared.completeBrowserNavigation(URL(string: "https://example.test/new")!, title: "new", in: restored.id)
        XCTAssertEqual(shared.browserTabs[0].history?.entries.map(\.url), [entries[0].url, "https://example.test/new"])
    }
    @MainActor func testRecentSitesUseAccountHistoryAndLocalDefaultProfilesAcrossScopes() {
        let shared = SharedAppStore()
        let publicEntries = [BrowserHistoryEntry(url: "https://example.test/local?view=one", title: "Local site"), BrowserHistoryEntry(url: "https://example.test/auth?token=private", title: "Private token")]
        shared.browserTabs = [
            BrowserDescriptor(id: "workspace-browser", title: "Local", url: publicEntries[0].url, scope: "workspace:a:new", history: BrowserTabHistory(entries: publicEntries, index: 0)),
            BrowserDescriptor(id: "private-profile-browser", title: "Private profile", url: "https://private.test/", scope: "main", history: BrowserTabHistory(entries: [BrowserHistoryEntry(url: "https://private.test/", title: "Private profile")], index: 0), profileId: UUID().uuidString)
        ]
        shared.snapshot = .object(["history": .array([.object(["id": .string("shared"), "url": .string("https://shared.test/"), "title": .string("Shared site")])])])
        XCTAssertEqual(shared.recentHistory.map { $0["url"].string }, ["https://shared.test/", "https://example.test/auth?token=private", "https://example.test/local?view=one"])
        XCTAssertEqual(shared.recentHistory.last?["deviceName"].string, "This device")
        XCTAssertEqual(shared.recentHistory.last?["visitedAt"], .null, "A restored backstack has no recorded visit timestamp to invent")
        shared.snapshot = .object(["history": .array((1...2).map { .object(["id": .string("visit-\($0)"), "url": .string("https://shared.test/"), "visitedAt": .string("2026-10-12T12:00:0\($0)Z")]) })])
        XCTAssertEqual(shared.recentHistory.prefix(2).map { $0["id"].string }, ["visit-1", "visit-2"], "Merging local fallback must preserve distinct authoritative visits to the same URL")
    }
    func testNativeContentTabSymbolsMatchTheirType() {
        XCTAssertEqual(NativeTabSymbol.name(kind: "chat"), "bubble.left.and.bubble.right")
        XCTAssertEqual(NativeTabSymbol.name(kind: "chat", chatType: "internet"), "magnifyingglass")
        XCTAssertEqual(NativeTabSymbol.name(kind: "workspace"), "square.grid.2x2")
        XCTAssertEqual(NativeTabSymbol.name(kind: "browser"), "globe")
        XCTAssertEqual(NativeTabSymbol.name(kind: "terminal"), "terminal")
        XCTAssertEqual(NativeTabSymbol.name(kind: "document"), "doc.text")
        XCTAssertEqual(NativeTabSymbol.name(kind: "document", mediaType: "text/html"), "doc.richtext")
        XCTAssertEqual(NativeTabSymbol.name(kind: "schedule"), "calendar")
        XCTAssertEqual(NativeTabSymbol.name(kind: "live"), "rectangle.on.rectangle")
    }
    func testWorkspaceIdentityUsesStableIDsAndDeduplicatesPerContainer() {
        let summary: JSON = .object(["workspaceId": .string("workspace-a"), "workspaceName": .string("Renamed workspace")])
        XCTAssertEqual(NativeWorkspaceIdentity.workspaceID(summary), "workspace-a")
        XCTAssertEqual(NativeWorkspaceIdentity.workspaceID(.object(["workspaceName": .string("Ambiguous name")])), "")
        XCTAssertEqual(NativeWorkspaceNavigation.deduplicated(["a", "b", "a", "", "b"]), ["a", "b"])
        let profile: JSON = .object(["id": .string("same-id"), "name": .string("Same name")])
        XCTAssertNotEqual(NativeWorkspaceIdentity(hostID: "host-a", hostName: "A", profile: profile).id, NativeWorkspaceIdentity(hostID: "host-b", hostName: "B", profile: profile).id)
    }

    @MainActor func testWorkspaceCopyIsolationAndMixedContentSynchronization() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONDecoder().decode(JSON.self, from: data)
        let remote = RemoteStore(); remote.forget(); try remote.pair(fixture["code"].string)
        let shared = SharedAppStore(); defer { shared.unloadBrowsers(); remote.forget() }
        for _ in 0..<100 { if remote.connected && remote.state["capabilities"].array.contains(.string("workspaces.v1")) { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertTrue(remote.connected)
        let catalog = try await remote.request("context.get", [:]), sourceID = catalog["defaultWorkspaceId"].string
        let copied = try await remote.request("context.update", ["action": .string("copy-workspace"), "workspaceId": .string(sourceID), "name": .string("Native copied workspace"), "expectedRevision": catalog["revision"]])
        let copyID = copied["copiedWorkspaceId"].string; XCTAssertFalse(copyID.isEmpty); XCTAssertNotEqual(copyID, sourceID)
        let entries = try await remote.request("context.refresh", ["workspaceId": .string(copyID)]), entryID = try XCTUnwrap(entries["entries"].array.first?["id"])
        _ = try await remote.request("context.mode", ["workspaceId": .string(copyID), "id": entryID, "mode": .string("disabled"), "expectedRevision": entries["revision"]])
        let original = try await remote.request("context.get", ["workspaceId": .string(sourceID)])
        XCTAssertNotEqual(original["entries"].array.first { $0["id"] == entryID }?["mode"], .string("disabled"))
        let created = try await remote.request("chat.start", ["workspaceId": .string(copyID), "provider": .string("rehearsal"), "prompt": .string("Native workspace scope rehearsal")]), chatID = created["runId"].string
        let chat: JSON = .object(["id": .string("chat:" + chatID), "type": .string("chat"), "chatId": .string(chatID), "title": .string("Workspace chat")])
        let browser: JSON = .object(["id": .string("workspace-browser"), "type": .string("browser"), "title": .string("Reference"), "url": .string("https://example.test/reference")])
        _ = try await remote.request("tabs.mutate", ["scope": .string("workspace"), "id": .string(copyID), "expectedRevision": .number(0), "operations": .array([chat, browser].map { .object(["action": .string("open"), "tab": $0]) })])
        let scope = "workspace:\(remote.connection!.hostId):\(copyID)"
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "workspace", id: copyID)
        XCTAssertEqual(shared.tabs(in: scope).count, 1)
        XCTAssertEqual(shared.workspaceContentDescriptors[scope]?.filter { $0["type"].string == "chat" }.count, 1)
        shared.open(nil, scope: scope)
        for _ in 0..<10 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "workspace", id: copyID); try await Task.sleep(for: .milliseconds(100)) }
        let result = try await remote.request("tabs.get", ["scope": .string("workspace"), "id": .string(copyID)])
        XCTAssertEqual(result["tabs"].array.filter { $0["type"].string == "chat" && $0["chatId"].string == chatID }.count, 1, "Browser sync must retain the chat descriptor")
        XCTAssertEqual(result["tabs"].array.filter { $0["type"].string == "browser" }.count, 2)
        _ = try await remote.request("chat.cancel", ["id": .string(chatID)])

        let (secondData, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair?host=second")!)
        let secondFixture = try JSONDecoder().decode(JSON.self, from: secondData)
        let second = RemoteStore(connection: nil, legacyCredentials: false); try second.pair(secondFixture["code"].string); defer { second.forget() }
        for _ in 0..<100 { if second.connected { break }; try await Task.sleep(for: .milliseconds(100)) }
        let targetCatalog = try await second.request("context.get", [:])
        let sourceProfile = try XCTUnwrap(original["workspaces"].array.first { $0["id"].string == sourceID })
        let targetRoot = try XCTUnwrap(targetCatalog["workspaces"].array.first?["cwd"])
        let imported = try await second.request("context.update", ["action": .string("import-workspace"), "name": .string("Native mapped copy"), "configuration": sourceProfile, "entries": original["entries"], "pathMappings": .array([.object(["from": sourceProfile["cwd"], "to": targetRoot])]), "expectedRevision": targetCatalog["revision"]])
        let importedProfile = try XCTUnwrap(imported["workspaces"].array.first { $0["id"] == imported["copiedWorkspaceId"] })
        XCTAssertEqual(importedProfile["cwd"], targetRoot)
        XCTAssertEqual(importedProfile["approvals"]["mode"], .string("ask"))
        XCTAssertTrue(importedProfile["approvals"]["folders"].array.isEmpty)
        XCTAssertNotEqual(second.connection?.hostId, remote.connection?.hostId)
    }

    @MainActor func testMarkdownRenderingSharesOnlyItsEphemeralStoreAndIdleSearchDoesNotPublish() {
        let first = MarkdownView.rendererConfiguration(), second = MarkdownView.rendererConfiguration()
        XCTAssertTrue(first.websiteDataStore === second.websiteDataStore)
        XCTAssertFalse(first.websiteDataStore.isPersistent)
        XCTAssertFalse(first.userContentController === second.userContentController, "Each message retains its own bridge")
        XCTAssertFalse(first.websiteDataStore === WKWebsiteDataStore.default())
        XCTAssertFalse(first.websiteDataStore === IsolatedArtifactWebView.configuration(scriptsEnabled: true).websiteDataStore)
        let search = NativePageSearch()
        var publications = 0
        let observation = search.objectWillChange.sink { publications += 1 }
        defer { observation.cancel() }
        for index in 0..<100 { search.count(0, key: index, query: "") }
        XCTAssertEqual(publications, 0, "Idle message renderers must not invalidate the entire chat")
        search.query = "matching"; search.count(2, key: 4, query: "matching")
        XCTAssertEqual(search.total, 2)
        search.count(0, key: 4, query: "matching"); XCTAssertEqual(search.total, 0)
        search.close(); XCTAssertTrue(search.counts.isEmpty)
    }

    func testConversationEndIncludesComposerSafeAreaInset() {
        let state = NativeScrollSnapshot(offset: 1100, contentHeight: 2000, viewportHeight: 1000, viewportWidth: 390, viewportTop: 0, bottomInset: 100)
        XCTAssertEqual(state.maxOffset, 1100)
        XCTAssertTrue(state.atEnd)
        let obscured = NativeScrollSnapshot(offset: 1000, contentHeight: 2000, viewportHeight: 1000, viewportWidth: 390, viewportTop: 0, bottomInset: 100)
        XCTAssertFalse(obscured.atEnd, "Content above the composer is not the real end of the conversation")
    }
    func testReturnDetectionPreservesPastesAutocorrectionAndUnicode() {
        for (before, after) in [("", "\n"), ("ab", "a\nb"), ("ab", "ab\n"), ("ab", "\nab"), ("a\nb", "a\n\nb"), ("café 👨‍👩‍👧", "café\n 👨‍👩‍👧")] {
            XCTAssertTrue(NativeChatTextEdit.isSingleReturn(before: before, after: after))
        }
        for (before, after) in [("a", "ab"), ("a", ""), ("", "two\nlines"), ("teh", "the\n"), ("ab", "a\n\nb"), ("a\nb", "a\nxb"), ("cafe", "café")] {
            XCTAssertFalse(NativeChatTextEdit.isSingleReturn(before: before, after: after))
        }
        let long = String(repeating: "Long draft 👨‍👩‍👧 café\n", count: 500)
        XCTAssertTrue(NativeChatTextEdit.isSingleReturn(before: long, after: long + "\n"))
        XCTAssertFalse(NativeChatTextEdit.isSingleReturn(before: long, after: long + "x"))
    }

    func testReplyEditorGrowsOnlyForExplicitLineBreaksAndCapsWholeCard() {
        let height = { (text: String, screen: CGFloat, chrome: CGFloat) in
            NativeReplyEditorLayout.height(text: text, lineHeight: 22, screenHeight: screen, chromeHeight: chrome)
        }
        XCTAssertEqual(height("", 900, 76), 44)
        XCTAssertEqual(height(String(repeating: "A long line that will wrap. ", count: 100), 900, 76), 44)
        XCTAssertEqual(height("first\nsecond", 900, 76), 60)
        XCTAssertEqual(height("first\r\nsecond", 900, 76), 60)
        XCTAssertEqual(height("first\n", 900, 76), 60)
        for screen in [CGFloat(400), 900, 1376] {
            for chrome in [CGFloat(76), 180] {
                XCTAssertLessThanOrEqual(height(String(repeating: "line\n", count: 1000), screen, chrome) + chrome, screen * 0.5)
            }
        }
    }

    @MainActor func testReplyEditorKeyboardCommandsKeepShiftReturnAsText() {
        let view = NativeReplyTextView(); view.submitOnReturn = true
        view.text = "First line"; view.selectedRange = NSRange(location: view.text.utf16.count, length: 0)
        var submitted = 0; view.submit = { submitted += 1 }
        let newline = view.keyCommands!.first { $0.input == "\r" && $0.modifierFlags == .shift }!
        XCTAssertTrue(view.canPerformAction(newline.action!, withSender: newline))
        view.perform(newline.action!, with: newline)
        XCTAssertEqual(view.text, "First line\n"); XCTAssertEqual(submitted, 0)
        let send = view.keyCommands!.first { $0.input == "\r" && $0.modifierFlags.isEmpty }!
        view.perform(send.action!, with: send)
        XCTAssertEqual(submitted, 1); XCTAssertEqual(view.text, "First line\n")
    }

    @MainActor func testTypingDraftDoesNotPublishConversationChangesAndKeepsScopesSeparate() {
        let first = RemoteStore(connection: nil), second = RemoteStore(connection: nil)
        let draft = NativeReplyDraft()
        var publications = 0
        let observation = first.objectWillChange.sink { publications += 1 }
        defer { observation.cancel() }
        draft.activate(store: first, key: "reply:chat")
        for _ in 0..<300 { draft.text += "a" }
        XCTAssertEqual(publications, 0, "Typing must not invalidate every observer of the Mac's history")
        XCTAssertEqual(first.draft("reply:chat").string, String(repeating: "a", count: 300))
        first.setDraft("answer:chat:question", .string("Earlier answer"))
        XCTAssertEqual(publications, 1, "External draft and attachment changes still notify their views")
        publications = 0
        draft.activate(store: first, key: "answer:chat:question")
        XCTAssertEqual(draft.text, "Earlier answer")
        draft.text = "Edited answer\nwith another line"
        draft.activate(store: second, key: "reply:chat")
        XCTAssertEqual(draft.text, "", "Same chat ID on another Mac cannot inherit text")
        draft.text = "Other Mac"
        draft.activate(store: first, key: "reply:chat")
        XCTAssertEqual(draft.text, String(repeating: "a", count: 300))
        XCTAssertEqual(first.draft("answer:chat:question").string, "Edited answer\nwith another line")
        XCTAssertEqual(second.draft("reply:chat").string, "Other Mac")
        draft.text = ""
        XCTAssertEqual(first.draft("reply:chat"), .null)
        XCTAssertEqual(publications, 0)
    }

    @MainActor func testBackgroundCacheThenLifecycleFlushKeepsLatestLongChatDraft() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("proteus-typing-" + UUID().uuidString)
        let connection = DeviceConnection(relay: "wss://relay.example.test", hostId: UUID().uuidString, deviceId: UUID().uuidString, key: RemoteCrypto.random())
        let store = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false)
        defer { store.forget(); try? FileManager.default.removeItem(at: root) }
        let events: [JSON] = (0..<2000).map { .object(["role": .string("assistant"), "text": .string("Synthetic \($0): " + String(repeating: "history ", count: 64))]) }
        store.chats["chat"] = .object(["events": .array(events)])
        let draft = NativeReplyDraft(); draft.activate(store: store, key: "reply:chat")
        draft.text = "Initial text"
        try await Task.sleep(for: .milliseconds(1200))
        draft.text = "Latest café draft\nsecond line"
        store.flushCache()
        let restored = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false)
        XCTAssertEqual(restored.draft("reply:chat").string, draft.text)
        XCTAssertEqual(restored.chats["chat"]?["events"].array.count, 2000)
        store.forget()
        try await Task.sleep(for: .milliseconds(1200))
        XCTAssertFalse(FileManager.default.fileExists(atPath: store.cacheURL.path), "Queued cache work cannot recreate a forgotten device's history")
    }

    @MainActor func testBrowserProfilesKeepPersistentStoresSeparateAndDecodeLegacyDefault() async throws {
        let id = UUID().uuidString
        let first = SharedAppStore.persistentProfileStoreID(account: "synthetic-a", id: id)
        XCTAssertEqual(first, SharedAppStore.persistentProfileStoreID(account: "synthetic-a", id: id))
        XCTAssertNotEqual(first, SharedAppStore.persistentProfileStoreID(account: "synthetic-b", id: id))
        let second = SharedAppStore.persistentProfileStoreID(account: "synthetic-a", id: UUID().uuidString)
        XCTAssertNotEqual(first, second)
        let one = WKWebsiteDataStore(forIdentifier: first), two = WKWebsiteDataStore(forIdentifier: second)
        XCTAssertTrue(one.isPersistent); XCTAssertTrue(two.isPersistent)
        let cookie = try XCTUnwrap(HTTPCookie(properties: [.domain: "profile.test", .path: "/", .name: "synthetic-profile", .value: "first"]))
        await one.httpCookieStore.setCookie(cookie)
        let isolatedCookies = await two.httpCookieStore.allCookies(); XCTAssertTrue(isolatedCookies.isEmpty)
        let restored = WKWebsiteDataStore(forIdentifier: first)
        let cookies = await restored.httpCookieStore.allCookies()
        XCTAssertEqual(cookies.first(where: { $0.name == "synthetic-profile" })?.value, "first")
        await one.httpCookieStore.deleteCookie(cookie)
        let legacy = try JSONDecoder().decode(BrowserDescriptor.self, from: Data(#"{"id":"legacy","title":"Legacy","scope":"main"}"#.utf8))
        XCTAssertEqual(legacy.profileId, "default")
        let shared = SharedAppStore(); defer { shared.unloadBrowsers() }
        XCTAssertTrue(shared.webView(legacy).configuration.websiteDataStore.isPersistent)
        let unavailable = BrowserDescriptor(id: "missing", title: "Unavailable", url: nil, profileId: id)
        XCTAssertFalse(shared.webView(unavailable).configuration.websiteDataStore.isPersistent)
    }
    func testNavigationCountsUseHostTotalsBeyondCachedChatPage() {
        let first: JSON = .object(["runningChatCount": .number(4), "runCount": .number(120), "attentionCount": .number(7), "schedules": .array([.object(["id": .string("a")])]), "runs": .array([.object(["id": .string("recent")])])])
        let second: JSON = .object(["runningChatCount": .number(2), "runCount": .number(9), "attentionCount": .number(2), "schedules": .array([]), "runs": .array([])])
        XCTAssertEqual(NativeNavigationCounts.chats([first, second]), 6)
        XCTAssertEqual(NativeNavigationCounts.attention([first, second]), 9)
        XCTAssertEqual(NativeNavigationCounts.schedules([first, second]), 1)
        XCTAssertNil(NativeNavigationCounts.attention([first, .object(["runs": .array([])])]), "An older host without an exact total must not display a partial count as complete")
        XCTAssertNil(NativeNavigationCounts.chats([first, .null]), "An unavailable destination must not disappear from an aggregate count")
        XCTAssertNil(NativeNavigationCounts.chats([first, .object(["runningChatCount": .string("9")])]), "A malformed total must not look like zero")
        XCTAssertNil(NativeNavigationCounts.schedules([first, .object(["schedules": .null])]))
        XCTAssertTrue(nativeNeedsAttention(.object(["status": .string("awaiting_input")])))
        XCTAssertTrue(nativeNeedsAttention(.object(["status": .string("failed")])))
        XCTAssertFalse(nativeNeedsAttention(.object(["status": .string("failed"), "failureReviewedAt": .string("2026-10-05T21:00:00Z")])))
        XCTAssertFalse(nativeNeedsAttention(.object(["status": .string("failed"), "attentionRequired": .bool(false)])))
        XCTAssertFalse(nativeNeedsAttention(.object(["status": .string("awaiting_input"), "archivedAt": .string("2026-10-05T21:00:00Z")])))
    }
    func testRunningChatCountsDeduplicateAndExcludeInactiveRows() {
        func row(_ id: String, _ status: String, archived: Bool = false) -> JSON { .object(["id": .string(id), "status": .string(status), "archived": .bool(archived)]) }
        let first: JSON = .object(["hostId": .string("one"), "runs": .array([row("same", "running"), row("same", "running"), row("queued", "queued"), row("done", "completed"), row("input", "awaiting_input"), row("archived", "running", archived: true), row("", "running")])])
        let second: JSON = .object(["hostId": .string("two"), "runs": .array([row("same", "running")])])
        XCTAssertEqual(NativeNavigationCounts.chats([first, first, second]), 2, "Duplicate host/chat representations count once; matching IDs on separate hosts remain distinct")
        XCTAssertEqual(NativeNavigationCounts.chats([.object(["runs": .array([row("queued", "queued")])])]), 0)
        XCTAssertNil(NativeNavigationCounts.chats([.object(["runningChatCount": .number(-1)])]))
    }
    @MainActor func testRemoteDisplayNameUsesAuthenticatedHostLabel() {
        let remote = RemoteStore(connection: nil, legacyCredentials: false)
        XCTAssertEqual(remote.displayName, "Connected computer")
        remote.state = .object(["hostName": .string("Studio workstation")])
        XCTAssertEqual(remote.displayName, "Studio workstation")
    }
    func testHostMetadataSupportsLinuxAndMacWithoutChangingProtocolRequirements() {
        for (platform, label, arch) in [("linux", "Linux", "x64"), ("darwin", "macOS", "arm64"), ("win32", "Windows", "x64")] {
            let info = RemoteHostInfo(state: .object(["hostName": .string("  Studio workstation  "), "hostPlatform": .string(platform), "hostPlatformLabel": .string(label), "hostArchitecture": .string(arch)]))
            XCTAssertEqual(info.displayName, "Studio workstation")
            XCTAssertEqual(info.platform.label, label)
            XCTAssertEqual(info.platformDescription, label + " · " + arch)
            XCTAssertEqual(info.signInPrompt.contains("Keychain"), platform == "darwin")
        }
    }
    func testLegacyAndUnknownHostMetadataHaveNeutralFallbacks() {
        let legacy = RemoteHostInfo(state: .object(["hostName": .string("Existing Mac")]))
        XCTAssertEqual(legacy.displayName, "Existing Mac")
        XCTAssertEqual(legacy.platform, .unknown)
        XCTAssertNil(legacy.platformDescription)
        XCTAssertFalse(legacy.signInPrompt.contains("Keychain"), "Host names must not imply an operating system")
        let future = RemoteHostInfo(state: .object(["hostPlatform": .string("future-os"), "hostPlatformLabel": .string("macOS"), "hostArchitecture": .string("arch\nspoof")]))
        XCTAssertEqual(future.displayName, "Connected computer")
        XCTAssertEqual(future.platform, .unknown)
        XCTAssertEqual(future.architecture, "")
        XCTAssertNil(future.platformDescription)
        XCTAssertEqual(RemoteHostInfo(state: .object(["hostName": .string("\n\t")])).displayName, "Connected computer")
        XCTAssertEqual(RemoteHostInfo(state: .object(["hostName": .string("Injected\nname")])).displayName, "Connected computer")
    }
    func testNewAndLegacyPairingDefaultsAdoptComputerNameWithoutReplacingExistingLabels() {
        for placeholder in ["My computer", "New computer", "My Mac", "New Mac"] {
            XCTAssertEqual(HostDestination.pairingName(requested: placeholder, suggested: "Linux tower", existing: nil), "Linux tower")
            XCTAssertEqual(HostDestination.pairingName(requested: placeholder, suggested: "Linux tower", existing: "Saved destination"), "Saved destination")
            XCTAssertEqual(HostDestination.pairingName(requested: placeholder, suggested: "Invalid\nname", existing: nil), placeholder)
        }
        XCTAssertEqual(HostDestination.pairingName(requested: "Chosen label", suggested: "Linux tower", existing: "Previous label"), "Chosen label")
    }
    func testHostDestinationRetainsLegacyIndexShape() throws {
        let data = Data(#"{"id":"10000000-0000-4000-8000-000000000001","label":"Existing Mac"}"#.utf8)
        let destination = try JSONDecoder().decode(HostDestination.self, from: data)
        XCTAssertEqual(destination.label, "Existing Mac")
        let encoded = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(destination))
        XCTAssertEqual(encoded.object.keys.sorted(), ["id", "label"])
        XCTAssertEqual(encoded["id"].string, destination.id)
    }
    func testAttentionCountUsesCompleteLegacyHostSummariesOnly() {
        let awaiting: JSON = .object(["id": .string("a"), "status": .string("awaiting_input"), "attentionRequired": .bool(true)])
        let reviewed: JSON = .object(["id": .string("b"), "status": .string("failed"), "failureReviewedAt": .string("2026-10-05T21:00:00Z"), "attentionRequired": .bool(false)])
        let full: JSON = .object(["runCount": .number(2), "runs": .array([awaiting, reviewed])])
        XCTAssertEqual(NativeNavigationCounts.attention([full]), 1)
        XCTAssertNil(NativeNavigationCounts.attention([.object(["runCount": .number(3), "runs": .array([awaiting, reviewed])])]))
        XCTAssertNil(NativeNavigationCounts.attention([.object(["runCount": .number(2), "runs": .array([awaiting, awaiting])])]))
        XCTAssertNil(NativeNavigationCounts.attention([.object(["runCount": .number(101), "runs": .array([awaiting])])]))
        XCTAssertNil(NativeNavigationCounts.attention([.object(["runCount": .number(1), "runs": .array([.object(["id": .string("a"), "status": .string("awaiting_input")])])])]))
    }
    @MainActor func testBrowserReorderStaysWithinItsWorkspaceAndKeepsSelectedIdentity() {
        let store = SharedAppStore()
        let scope = "chat:test-host:test-chat"
        store.browserTabs = [
            BrowserDescriptor(id: "main", title: "Main", url: nil, scope: "main"),
            BrowserDescriptor(id: "first", title: "First", url: nil, scope: scope),
            BrowserDescriptor(id: "second", title: "Second", url: nil, scope: scope),
            BrowserDescriptor(id: "team", title: "Team", url: nil, scope: "team")
        ]
        store.selectChatChild("second", in: scope)
        store.moveBrowser("second", before: "first")
        XCTAssertEqual(store.browserTabs.map(\.id), ["main", "second", "first", "team"])
        XCTAssertEqual(store.selected(in: scope), "second")
        store.moveBrowser("team", before: "first")
        XCTAssertEqual(store.browserTabs.map(\.id), ["main", "second", "first", "team"], "Drag must not move content between workspaces")
    }
    @MainActor func testChatChildOrderInterleavesBrowserAndDocumentAndKeepsDocumentSelection() {
        let store = SharedAppStore()
        let scope = "chat:\(UUID().uuidString):\(UUID().uuidString)"
        let browser = UUID().uuidString, document = UUID().uuidString
        store.browserTabs.append(BrowserDescriptor(id: browser, title: "Browser", url: nil, scope: scope))
        store.rememberDocument(NativeDocumentDescriptor(id: document, chatKey: scope, title: "Document", mediaType: "text/markdown"), content: "Synthetic")
        store.selectChatChild(document, for: scope)
        store.moveChatChild(document, before: browser, in: scope, documentIDs: [document])
        XCTAssertEqual(store.orderedChatChildren(in: scope, documentIDs: [document]), [document, browser])
        XCTAssertEqual(store.chatSelectedChildren[scope], document)
        store.closeDocument(document, in: scope)
        XCTAssertEqual(store.orderedChatChildren(in: scope, documentIDs: []), [browser], "Closing a child must not resurrect it from saved order")
        store.close(browser)
    }
    func testAttachmentBudgetAcceptsManySmallFilesButBoundsTotalBytes() {
        XCTAssertNil(NativeAttachmentBudget.rejection(existingCount: 255, existingBytes: NativeAttachmentBudget.maxTotalBytes - 1, incomingBytes: 1))
        XCTAssertNotNil(NativeAttachmentBudget.rejection(existingCount: 256, existingBytes: 0, incomingBytes: 1))
        XCTAssertNotNil(NativeAttachmentBudget.rejection(existingCount: 1, existingBytes: NativeAttachmentBudget.maxTotalBytes, incomingBytes: 1))
        XCTAssertNotNil(NativeAttachmentBudget.rejection(existingCount: 0, existingBytes: 0, incomingBytes: NativeAttachmentBudget.maxFileBytes + 1))
        XCTAssertNil(NativeAttachmentBudget.rejection(existingCount: 100, existingBytes: 100, incomingBytes: 1))
    }
    @MainActor func testLifecycleReplayUpdatesArchiveAndEvictsDeletedChatWithoutLosingOtherPages() {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let connection = DeviceConnection(relay: "wss://relay.example.test", hostId: UUID().uuidString, deviceId: UUID().uuidString, key: RemoteCrypto.random())
        let store = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false)
        let older: JSON = .object(["id": .string("older"), "title": .string("Older")])
        let target: JSON = .object(["id": .string("target"), "title": .string("Target"), "updatedAt": .string("2026-10-05T00:00:00Z")])
        store.state = .object(["runs": .array([target, older]), "runCount": .number(2)])
        store.allRuns = [target, older]
        store.chats["target"] = target
        store.setDraft("reply:target", .string("unsent"))
        store.applyLifecycle(.object(["id": .string("target"), "archived": .bool(true), "archivedAt": .string("2026-10-05T01:00:00Z"), "updatedAt": .string("2026-10-05T01:00:00Z")]))
        XCTAssertTrue(store.chats["target"]?["archived"].bool == true)
        XCTAssertEqual(store.allRuns.first?["archivedAt"].string, "2026-10-05T01:00:00Z")
        XCTAssertFalse(store.state["runs"].array.contains { $0["id"].string == "target" }, "Default history must hide an archived chat immediately")
        XCTAssertTrue(store.state["runs"].array.contains { $0["id"].string == "older" })
        store.applyLifecycle(.object(["id": .string("target"), "archived": .bool(false), "archivedAt": .null, "updatedAt": .string("2026-10-05T02:00:00Z")]))
        XCTAssertTrue(store.state["runs"].array.contains { $0["id"].string == "target" }, "Unarchive must restore the known row without waiting for a new page")
        var deleted = ""
        store.onChatDeleted = { deleted = $0 }
        store.applyLifecycle(.object(["id": .string("target"), "deleted": .bool(true)]))
        XCTAssertEqual(deleted, "target")
        XCTAssertNil(store.chats["target"])
        XCTAssertTrue(store.allRuns.allSatisfy { $0["id"].string != "target" })
        XCTAssertEqual(store.draft("reply:target"), .null)
        XCTAssertEqual(store.state["runs"].array.map { $0["id"].string }, ["older"])
        XCTAssertTrue(chatHasPendingWork(.object(["status": .string("awaiting_input")])))
        XCTAssertTrue(chatHasPendingWork(.object(["queuedMessages": .array([.object(["id": .string("queued")])])])))
        XCTAssertFalse(chatHasPendingWork(older))
    }
    @MainActor func testDeletedChatWorkspacePromotesBrowserButRemovesScopedDocument() {
        let store = SharedAppStore()
        let host = UUID().uuidString, chat = UUID().uuidString
        let scope = "chat:\(host):\(chat)"
        let browser = UUID().uuidString, document = UUID().uuidString
        store.browserTabs.append(BrowserDescriptor(id: browser, title: "Independent page", url: "https://example.test", scope: scope))
        store.rememberDocument(NativeDocumentDescriptor(id: document, chatKey: scope, title: "Approved document", mediaType: "text/markdown"), content: "ephemeral")
        store.draftAttachments[scope] = [NativeDraftAttachment(id: UUID().uuidString, name: "draft.png", mediaType: "image/png", bytes: Data([1]))]
        store.removeChatWorkspace(hostID: host, chatID: chat)
        XCTAssertEqual(store.browserTabs.first { $0.id == browser }?.scope, "main")
        XCTAssertEqual(store.browserTabs.first { $0.id == browser }?.url, "https://example.test")
        XCTAssertTrue(store.documents(in: scope).isEmpty)
        XCTAssertNil(store.content(for: document, in: scope))
        XCTAssertNil(store.draftAttachments[scope])
        store.close(browser)
    }
    @MainActor func testAttachmentDraftNeverRestoresBytesOrSilentlyDropsSelection() {
        let store = RemoteStore()
        let key = "reply-attachments:synthetic-" + UUID().uuidString
        let item = NativeDraftAttachment(id: UUID().uuidString, name: "Selected.png", mediaType: "image/png", bytes: Data([1, 2, 3]))
        store.setDraft(key, .array([.object(["id": .string(item.id), "name": .string(item.name), "mediaType": .string(item.mediaType)])]))
        defer { store.setDraft(key, .null) }
        XCTAssertTrue(missingAttachmentRecords(store: store, draftKey: key, items: [item]).isEmpty, "Navigating away and back must retain in-memory selection")
        let missing = missingAttachmentRecords(store: store, draftKey: key, items: [])
        XCTAssertEqual(missing.map { $0["name"].string }, ["Selected.png"], "After restart the sender must require reattachment or explicit removal")
        XCTAssertEqual(Set(missing[0].object.keys), Set(["id", "name", "mediaType"]), "The encrypted draft cache must not contain file bytes or upload authority")
    }
    func testApprovedHTMLImagesOnlyReplaceExactListedSource() {
        let html = #"<img src="chart.png"><img src="https://example.test/other.png"><img src='../secret.png'>"#
        let rendered = htmlWithApprovedAssets(html, assetDataURLs: ["chart.png": "data:image/png;base64,QUJD"])
        XCTAssertTrue(rendered.contains("src=\"data:image/png;base64,QUJD\""))
        XCTAssertTrue(rendered.contains("https://example.test/other.png"), "External references remain blocked by the isolated preview CSP")
        XCTAssertTrue(rendered.contains("../secret.png"), "Unapproved relative references remain blocked by the isolated preview CSP")
    }
    @MainActor func testHTMLPreviewUsesOpaqueFrameNonpersistentStoreAndExplicitScriptSwitch() {
        let hostile = #"</iframe><meta http-equiv="refresh" content="0;url=https://example.test/escape"><script>location.href='https://example.test/go';fetch('https://example.test/fetch')</script><form action="https://example.test/post"></form><img src="https://example.test/image">"#
        let shell = IsolatedArtifactWebView.shell(hostile)
        XCTAssertTrue(shell.contains("iframe sandbox=\"allow-scripts\""))
        XCTAssertFalse(shell.contains("allow-same-origin"))
        XCTAssertTrue(shell.contains("&lt;/iframe&gt;"))
        XCTAssertTrue(shell.contains("default-src 'none'"))
        XCTAssertTrue(shell.contains("connect-src 'none'"))
        XCTAssertTrue(shell.contains("form-action 'none'"))
        let staticHTML = IsolatedArtifactWebView.shell("<p>Static snapshot stays visible</p>", scriptsEnabled: false)
        XCTAssertTrue(staticHTML.contains("<p>Static snapshot stays visible</p>"))
        XCTAssertTrue(staticHTML.contains("script-src 'none'"))
        XCTAssertTrue(staticHTML.contains("frame-src 'none'"))
        XCTAssertFalse(IsolatedArtifactWebView.configuration(scriptsEnabled: false).defaultWebpagePreferences.allowsContentJavaScript)
        XCTAssertTrue(IsolatedArtifactWebView.configuration(scriptsEnabled: true).defaultWebpagePreferences.allowsContentJavaScript)
        XCTAssertFalse(IsolatedArtifactWebView.configuration(scriptsEnabled: true).websiteDataStore.isPersistent)
    }
    @MainActor func testSelectedPhotoLoadsAsynchronouslyAndRejectsUnreadableItems() async throws {
        let image = UIGraphicsImageRenderer(size: CGSize(width: 2, height: 2)).image { context in UIColor.green.setFill(); context.fill(CGRect(x: 0, y: 0, width: 2, height: 2)) }
        let png = try XCTUnwrap(image.pngData()), provider = NSItemProvider()
        provider.registerDataRepresentation(forTypeIdentifier: "public.png", visibility: .all) { completion in completion(png, nil); return nil }
        let data = try await selectedPhotoData(provider)
        XCTAssertEqual(data, png); XCTAssertNotNil(UIImage(data: data))
        XCTAssertNil(NativeAttachmentBudget.rejection(existingCount: 0, existingBytes: 0, incomingBytes: data.count))
        do { _ = try await selectedPhotoData(NSItemProvider()); XCTFail("An unreadable selection must report an error") } catch { XCTAssertTrue(error.localizedDescription.contains("photo could not be read")) }
    }
    func testFailedToolActivityIsActionableWhileSuccessfulRoutineActivityCanCollapse() {
        XCTAssertTrue(toolActivityFailed(.object(["name": .string("bash"), "status": .string("completed"), "output": .string("permission denied\n<shellId: local completed with exit code 1>")])))
        XCTAssertTrue(toolActivityFailed(.object(["name": .string("read_file"), "status": .string("failed"), "error": .string("Access denied")])))
        XCTAssertFalse(toolActivityFailed(.object(["name": .string("read_file"), "status": .string("completed")])))
    }
    func testActivityKeepsPlainSystemMessagesOutsideToolsAndApprovals() {
        let tool: JSON = .object(["role": .string("tool"), "data": .object(["tool": .object([:])])])
        let approval: JSON = .object(["role": .string("system"), "data": .object(["permission": .object([:])])])
        let system: JSON = .object(["role": .string("system"), "text": .string("Synthetic note")])
        let user: JSON = .object(["role": .string("user"), "text": .string("Next request")])
        let model: JSON = .object(["role": .string("assistant"), "text": .string("Response")])
        let events = [user, tool, system, approval, model, system, user]
        XCTAssertEqual(NativeActivity.group(events: events, startingAt: 1), [tool])
        XCTAssertEqual(NativeActivity.group(events: events, startingAt: 3), [approval])
        XCTAssertTrue(NativeActivity.group(events: events, startingAt: 5).isEmpty)
        XCTAssertTrue(NativeActivity.group(events: events, startingAt: 0).isEmpty)
        XCTAssertTrue(NativeActivity.group(events: events, startingAt: 4).isEmpty)
        XCTAssertTrue(NativeActivity.group(events: events, startingAt: -1).isEmpty)
        XCTAssertEqual(NativeHistoryWindow.start(events: [tool, system, approval]), 0)
    }
    func testRecoverySelectsOnlyCurrentFailureAndRetainsQueueAndRetryState() {
        let old: JSON = .object(["role": .string("system"), "text": .string("Old error"), "at": .string("2026-10-23T00:00:00Z")])
        let failure: JSON = .object(["role": .string("system"), "text": .string("Selected model is at capacity."), "at": .string("2026-10-23T01:00:01Z"), "data": .object(["failure": .object(["kind": .string("capacity")])])])
        var run: [String: JSON] = ["status": .string("failed"), "failureEventAt": failure["at"], "turns": .array([.object(["startedAt": .string("2026-10-23T01:00:00Z")])]), "events": .array([old, failure]), "queuedMessages": .array([.object(["id": .string("preserved")])])]
        var state = NativeChatRecoveryState.read(.object(run))!
        XCTAssertEqual(state.event, failure); XCTAssertEqual(state.failureEventAt, failure["at"])
        XCTAssertTrue(state.capacity); XCTAssertTrue(state.recoverable); XCTAssertEqual(state.queuedCount, 1)
        run["capacityRetry"] = .object(["nextAttemptAt": .string("2026-10-23T01:01:01Z")])
        state = NativeChatRecoveryState.read(.object(run))!
        XCTAssertNotEqual(state.retry, .null)
        run["status"] = .string("running"); run.removeValue(forKey: "capacityRetry")
        XCTAssertNil(NativeChatRecoveryState.read(.object(run)))
    }
    func testIndividualToolElapsedUsesRecordedTimingWithoutTurnClipping() {
        let now = ProviderAllowance.date("2026-10-12T12:00:20Z")!
        let finished: JSON = .object(["status": .string("completed"), "startedAt": .string("2026-10-12T12:00:00Z"), "finishedAt": .string("2026-10-12T12:00:04.250Z")])
        XCTAssertEqual(NativeActivity.toolSeconds(finished, now: now, verified: false), 4.25)
        var recorded = finished.object; recorded["durationMs"] = .number(120)
        XCTAssertEqual(NativeActivity.toolSeconds(.object(recorded), now: now, verified: false), 0.12)
        XCTAssertEqual(NativeActivity.elapsedLabel(0.12), "Elapsed 120 ms")
        XCTAssertEqual(NativeActivity.elapsedLabel(nil), "Elapsed unavailable")
        XCTAssertNil(NativeActivity.toolSeconds(.object(["status": .string("completed")]), now: now, verified: true))
        XCTAssertNil(NativeActivity.toolSeconds(.object(["status": .string("completed"), "startedAt": .string("2026-10-12T12:00:00Z")]), now: now, verified: true))
        let running: JSON = .object(["status": .string("running"), "startedAt": .string("2026-10-12T12:00:00Z")])
        XCTAssertEqual(NativeActivity.toolSeconds(running, now: now, verified: true), 20)
        XCTAssertNil(NativeActivity.toolSeconds(running, now: now, verified: false))
        XCTAssertNil(NativeActivity.toolSeconds(.object(["status": .string("completed"), "durationMs": .number(-1)]), now: now, verified: true))
        recorded["durationMs"] = .null; recorded["finishedAt"] = .string("2026-10-11T12:00:00Z")
        XCTAssertNil(NativeActivity.toolSeconds(.object(recorded), now: now, verified: true))
    }
    func testApprovalReferencePreservesHistoricalOriginalRequest() {
        XCTAssertEqual(NativeActivity.permissionCallID(.object(["toolCallId": .string("direct"), "request": .string("{\"toolCallId\":\"historical\"}")])), "direct")
        XCTAssertEqual(NativeActivity.permissionCallID(.object(["request": .string("{\"toolCallId\":\"historical\"}")])), "historical")
        XCTAssertEqual(NativeActivity.permissionCallID(.object(["request": .string("shortened or unstructured request")])), "")
        XCTAssertTrue(nativeTimestamp(ProviderAllowance.date("2026-10-12T12:00:04Z")!, timezone: "UTC", includeSeconds: true).contains("12:00:04"))
    }
    @MainActor func testRestoredDocumentTabKeepsStableIdentityWithoutBodyOrApproval() {
        let chatKey = "chat:synthetic-host:" + UUID().uuidString
        let documentID = String(repeating: "a", count: 64)
        let first = SharedAppStore()
        first.rememberDocument(NativeDocumentDescriptor(id: documentID, chatKey: chatKey, title: "Generated brief", mediaType: "text/markdown"), content: "SYNTHETIC PRIVATE DOCUMENT")
        XCTAssertEqual(first.content(for: documentID, in: chatKey), "SYNTHETIC PRIVATE DOCUMENT")
        let restored = SharedAppStore()
        XCTAssertEqual(restored.documents(in: chatKey).map(\.id), [documentID])
        XCTAssertNil(restored.content(for: documentID, in: chatKey), "A restored tab must request fresh Mac approval before reading bytes")
        let childID = String(repeating: "b", count: 64)
        restored.rememberDocument(NativeDocumentDescriptor(id: childID, chatKey: chatKey, title: "Linked detail", mediaType: "text/markdown", parentID: documentID, relativePath: "detail.md"), content: "IN MEMORY ONLY")
        let anotherLaunch = SharedAppStore()
        let child = anotherLaunch.documents(in: chatKey).first { $0.id == childID }
        XCTAssertEqual(child?.parentID, documentID)
        XCTAssertEqual(child?.relativePath, "detail.md")
        XCTAssertNil(anotherLaunch.content(for: childID, in: chatKey))
        anotherLaunch.closeDocument(childID, in: chatKey)
        anotherLaunch.closeDocument(documentID, in: chatKey)
    }
    @MainActor func testHTMLPreviewBlocksExternalRequestsInStaticAndInteractiveModes() async throws {
        let counter = PreviewRequestCounter()
        let listener = try NWListener(using: .tcp, on: .any)
        listener.newConnectionHandler = { connection in Task { await counter.record() }; connection.cancel() }
        listener.start(queue: DispatchQueue(label: "proteus-preview-network-test"))
        defer { listener.cancel() }
        try await Task.sleep(for: .milliseconds(250))
        let port = try XCTUnwrap(listener.port?.rawValue)
        let target = "http://127.0.0.1:\(port)"
        let html = """
        <meta http-equiv="refresh" content="0;url=\(target)/refresh">
        <img src="\(target)/image"><form id="f" action="\(target)/form"><input name="x" value="1"></form>
        <a id="a" href="\(target)/download" download>download</a>
        <script>fetch('\(target)/fetch'); location.href='\(target)/navigate'; window.open('\(target)/popup'); document.getElementById('f').submit(); document.getElementById('a').click();</script>
        """
        for enabled in [false, true] {
            let controller = UIHostingController(rootView: IsolatedArtifactWebView(content: html, scriptsEnabled: enabled, error: .constant(nil)))
            let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 600))
            window.rootViewController = controller
            window.makeKeyAndVisible()
            controller.view.layoutIfNeeded()
            try await Task.sleep(for: .seconds(2))
            window.isHidden = true
            window.rootViewController = nil
        }
        let received = await counter.count
        XCTAssertEqual(received, 0, "Neither static nor interactive preview may reach a local or external network destination")
    }
    @MainActor func testContentTabsReconcileConcurrentChangesWithoutSharingSelectionOrPageState() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONDecoder().decode(JSON.self, from: data)
        let remote = RemoteStore(); remote.forget(); try remote.pair(fixture["code"].string)
        defer { remote.forget() }
        try await wait { remote.connected && remote.state["capabilities"].array.contains(.string("content-tabs.v1")) }
        let created = try await remote.request("chat.start", ["prompt": .string("Descriptor synchronization rehearsal"), "provider": .string("rehearsal")])
        let id = created["runId"].string
        defer { Task { _ = try? await remote.request("chat.cancel", ["id": .string(id)]) } }
        let host = try XCTUnwrap(remote.connection?.hostId), scope = "chat:\(host):\(id)"
        let first: JSON = .object(["id": .string("shared-browser-a"), "type": .string("browser"), "title": .string("First"), "url": .string("https://example.test/one")])
        _ = try await remote.request("tabs.mutate", ["scope": .string("chat"), "id": .string(id), "expectedRevision": .number(0), "operations": .array([.object(["action": .string("open"), "tab": first])])])
        let shared = SharedAppStore()
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id)
        let local = try XCTUnwrap(shared.tabs(in: scope).first)
        XCTAssertEqual(local.contentTabId, "shared-browser-a"); XCTAssertNotEqual(local.id, local.contentTabId)
        XCTAssertTrue(shared.unloadedBrowsers.contains(local.id)); XCTAssertNil(shared.selected(in: scope))
        shared.select(local.id, in: scope)
        // Selecting records a real interaction. Settle that metadata write before
        // arranging the independent client's concurrent descriptor addition.
        for _ in 0..<100 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id); if shared.contentPending[scope] == nil { break }; try await Task.sleep(for: .milliseconds(50)) }
        let current = try await remote.request("tabs.get", ["scope": .string("chat"), "id": .string(id)])
        let concurrent: JSON = .object(["id": .string("shared-browser-b"), "type": .string("browser"), "title": .string("Concurrent"), "url": .string("https://example.test/two")])
        _ = try await remote.request("tabs.mutate", ["scope": .string("chat"), "id": .string(id), "expectedRevision": current["revision"], "operations": .array([.object(["action": .string("open"), "tab": concurrent])])])
        shared.renameBrowser(local.id, title: "User named tab")
        for _ in 0..<30 {
            await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id)
            if shared.tabs(in: scope).count == 2 { break }; try await Task.sleep(for: .milliseconds(50))
        }
        XCTAssertEqual(shared.tabs(in: scope).count, 2, "Rebase must keep the other client's concurrent addition")
        XCTAssertEqual(shared.selected(in: scope), local.id, "Shared tab refresh must preserve local selection")
        let renamed = try await remote.request("tabs.get", ["scope": .string("chat"), "id": .string(id)])
        XCTAssertEqual(renamed["tabs"].array.first?["customTitle"].string, "User named tab")
        shared.close(local.id)
        for _ in 0..<30 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id); if shared.tabs(in: scope).count == 1 { break }; try await Task.sleep(for: .milliseconds(50)) }
        let closed = try await remote.request("tabs.get", ["scope": .string("chat"), "id": .string(id)])
        XCTAssertEqual(closed["tabs"].array.map { $0["id"].string }, ["shared-browser-b"])
        XCTAssertFalse(closed.pretty.contains("selected")); XCTAssertFalse(closed.pretty.contains("cookie"))
        let deniedDocument = String(repeating: "a", count: 64)
        shared.rememberDocument(NativeDocumentDescriptor(id: deniedDocument, chatKey: scope, title: "Revoked preview", mediaType: "text/markdown"), content: "Synthetic cached document")
        for _ in 0..<30 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id); if shared.documents(in: scope).isEmpty { break }; try await Task.sleep(for: .milliseconds(50)) }
        XCTAssertTrue(shared.documents(in: scope).isEmpty, "Denied document sharing must purge cached previews instead of replaying them forever")
        XCTAssertNil(shared.content(for: deniedDocument, in: scope))
        XCTAssertEqual(shared.tabs(in: scope).count, 1)
        remote.status = "Access revoked by Mac"; remote.connected = false
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: id)
        XCTAssertTrue(shared.tabs(in: scope).isEmpty)
    }
    @MainActor func testNativeEncryptedRoundTripAndContinuation() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
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
    @MainActor func testBrowserBackstackSurvivesDescriptorRoundTrip() throws {
        let history = BrowserTabHistory(entries: [BrowserHistoryEntry(url: "https://example.test/one", title: "One"), BrowserHistoryEntry(url: "https://example.test/login?token=secret", title: "Login"), BrowserHistoryEntry(url: "https://example.test/two", title: "Two")], index: 2)
        let safe = try XCTUnwrap(SharedAppStore.safeBrowserHistory(history))
        XCTAssertEqual(safe.entries.count, 3); XCTAssertEqual(safe.index, 2)
        let descriptor = BrowserDescriptor(id: "test", title: "Two", url: "https://example.test/two", history: safe)
        let restored = try JSONDecoder().decode(BrowserDescriptor.self, from: JSONEncoder().encode(descriptor))
        let shared = SharedAppStore(); shared.browserTabs = [restored]
        let back = try XCTUnwrap(shared.browserHistory("test", back: true).first)
        XCTAssertEqual(back.url.absoluteString, "https://example.test/login?token=secret")
        shared.goBrowserHistory(back, in: "test")
        XCTAssertEqual(shared.browserTabs.first?.history?.index, 1)
        XCTAssertEqual(shared.browserHistory("test", back: false).first?.url.absoluteString, "https://example.test/two")
    }
    func testMobileCollapsedActivityUsesWholeTransportPage() {
        let events: [JSON] = (0..<2507).map { _ in .object(["data": .object(["tool": .object(["output": .string(String(repeating: "x", count: 20000))])])]) }
        XCTAssertEqual(NativeHistoryWindow.start(events: events), 2407)
    }
    func testMobileHistoryStartsSmallAndAdvancesWithoutDroppingContent() {
        let events: [JSON] = (0..<1000).map { .object(["text": .string("Message \($0)")]) }
        var start = NativeHistoryWindow.start(events: events)
        XCTAssertEqual(start, 988)
        var seen = Set(start..<events.count)
        while start > 0 {
            let next = NativeHistoryWindow.start(events: events, before: start)
            XCTAssertLessThan(next, start)
            XCTAssertLessThanOrEqual(start - next, NativeHistoryWindow.pageCount)
            seen.formUnion(next..<start); start = next
        }
        XCTAssertEqual(seen.count, 1000)
        let large: [JSON] = (0..<30).map { _ in .object(["text": .string(String(repeating: "x", count: 20000))]) }
        XCTAssertEqual(NativeHistoryWindow.start(events: large), 28)
        XCTAssertEqual(NativeHistoryWindow.start(events: [.object(["text": .string(String(repeating: "x", count: 100000))])]), 0, "A single long message must remain complete")
    }
    func testHistoryPrefetchWaitsForBottomAndUserReadingButFillsShortScreen() {
        XCTAssertFalse(NativeHistoryWindow.shouldPrefetch(offset: 0, viewport: 800, content: 9000, reading: false, ready: false))
        XCTAssertFalse(NativeHistoryWindow.shouldPrefetch(offset: 0, viewport: 800, content: 9000, reading: false, ready: true))
        XCTAssertFalse(NativeHistoryWindow.shouldPrefetch(offset: 8000, viewport: 800, content: 9000, reading: true, ready: true))
        XCTAssertTrue(NativeHistoryWindow.shouldPrefetch(offset: 300, viewport: 800, content: 9000, reading: true, ready: true))
        XCTAssertTrue(NativeHistoryWindow.shouldPrefetch(offset: 1800, viewport: 800, content: 9000, reading: true, ready: true), "Prepare visible history before reaching the top")
        XCTAssertFalse(NativeHistoryWindow.shouldPrefetch(offset: 2400, viewport: 800, content: 9000, reading: true, ready: true))
        let events: [JSON] = (0..<1000).map { .object(["text": .string("Message \($0)")]) }
        XCTAssertEqual(NativeHistoryWindow.start(events: events, before: 988, preparingOlder: true), 964, "Keep initial rendering small but prepare older history in larger batches")
        XCTAssertTrue(NativeHistoryWindow.shouldPrefetch(offset: 0, viewport: 1000, content: 500, reading: false, ready: true))
    }
    @MainActor func testCompletedRuntimeDoesNotRunPeriodicClock() {
        let store = RemoteStore(connection: nil)
        store.connected = true; store.runtimeClockOffset = 0
        let finished: JSON = .object(["intervals": .array([.array([.string("2026-10-10T15:00:00Z"), .string("2026-10-10T15:00:10Z")])])])
        XCTAssertFalse(runtimeClockRunning(turns: [finished], tools: [], verified: true))
        let running: JSON = .object(["activeSince": .string("2026-10-10T15:00:00Z")])
        XCTAssertTrue(runtimeClockRunning(turns: [running], tools: [], verified: true))
        XCTAssertFalse(runtimeClockRunning(turns: [running], tools: [], verified: false))
        XCTAssertTrue(runtimeClockRunning(turns: [], tools: [.object(["status": .string("running")])], verified: true))
        XCTAssertFalse(runtimeClockRunning(turns: [], tools: [.object(["status": .string("completed"), "finishedAt": .string("2026-10-10T15:01:00Z")])], verified: true))
        XCTAssertEqual(runtimeSeconds(finished, now: Date(), verified: true), 10)
        XCTAssertNil(ProviderAllowance.date(""))
        XCTAssertNotNil(ProviderAllowance.date("2026-10-10T15:00:00.123Z"))
        XCTAssertNotNil(ProviderAllowance.date("2026-10-10T15:00:00Z"))
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
        XCTAssertEqual(store.chats["synthetic"]?["retainedHistory"].array.first?["events"].array.count, 201)
        for first in stride(from: 900, through: 200, by: -100) { store.mergeChat(page(first, first + 99)) }
        XCTAssertEqual(store.chats["synthetic"]?["events"].array.count, 1100)
        XCTAssertEqual(store.chats["synthetic"]?["eventCount"].int, 1100)
        XCTAssertEqual(store.chats["synthetic"]?["earlier"].int, 0)
    }
    @MainActor func testQueueWhileWaitingRunsAfterReply() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
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
    @MainActor func testMixedPlatformDestinationsRestoreMetadataAndLegacyCredentialsIndependently() throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        let linux = credential(UUID().uuidString), mac = credential(UUID().uuidString)
        for (connection, label, platform) in [(linux, "Linux workstation", "linux"), (mac, "Existing Mac", "darwin")] {
            try destinations.register(connection, label: label)
            let remote = try XCTUnwrap(destinations.selected)
            remote.state = .object(["hostName": .string(label), "hostPlatform": .string(platform), "hostArchitecture": .string("arm64")])
            remote.setDraft("reply:same-chat", .string(label + " draft")); remote.flushCache()
        }
        try destinations.select(linux.hostId, connect: false)
        let restored = DestinationStore(root: root, keychainService: service)
        defer { restored.activity(false) }
        XCTAssertEqual(restored.selectedID, linux.hostId)
        XCTAssertEqual(restored.selected?.hostInfo.platform, .linux)
        XCTAssertEqual(restored.selected?.draft("reply:same-chat").string, "Linux workstation draft")
        XCTAssertEqual(restored.remote(for: mac.hostId)?.hostInfo.platform, .darwin)
        XCTAssertEqual(restored.remote(for: mac.hostId)?.draft("reply:same-chat").string, "Existing Mac draft")
        XCTAssertEqual(DeviceKeychain.load(hostID: linux.hostId, service: service)?.key, linux.key)
        XCTAssertEqual(DeviceKeychain.load(hostID: mac.hostId, service: service)?.key, mac.key)
        XCTAssertEqual(restored.destinations.map(\.label), ["Linux workstation", "Existing Mac"])
        XCTAssertNil(DeviceKeychain.load(service: service))
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
    @MainActor func testPairingKeepsAuthenticatedTransportAndCompletesOnlyOnce() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        destinations.activity(true)
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let code = try JSONDecoder().decode(JSON.self, from: data)["code"].string
        try destinations.add(code, label: "My computer")
        let candidate = try XCTUnwrap(destinations.pairing)
        XCTAssertNil(destinations.pairingCompletion)
        try await destinationWait { destinations.pairingCompletion != nil && candidate.connected }
        let completion = try XCTUnwrap(destinations.pairingCompletion)
        XCTAssertTrue(destinations.selected === candidate, "Pairing must not replace the socket before authentication completes")
        XCTAssertEqual(completion.hostID, candidate.connection?.hostId)
        XCTAssertEqual(DeviceKeychain.load(hostID: completion.hostID, service: service)?.deviceId, candidate.connection?.deviceId)
        XCTAssertNil(destinations.pairing); XCTAssertNil(candidate.error)
        XCTAssertEqual(candidate.cacheURL.deletingLastPathComponent(), root.appendingPathComponent("hosts").appendingPathComponent(completion.hostID))
        destinations.cancelPairing() // The sheet's onDismiss must not disconnect success.
        XCTAssertTrue(candidate.connected)
        await candidate.refresh()
        XCTAssertNil(candidate.error); XCTAssertFalse(candidate.state.object.isEmpty)
        candidate.activity(false); candidate.activity(true)
        try await destinationWait { candidate.connected }
        XCTAssertEqual(destinations.pairingCompletion, completion, "Reconnect is not a second pairing success")
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("pending-pair").path))
        let restored = DestinationStore(root: root, keychainService: service)
        defer { restored.activity(false) }
        XCTAssertEqual(restored.selectedID, completion.hostID)
        XCTAssertEqual(restored.selected?.connection?.deviceId, candidate.connection?.deviceId)
        XCTAssertNil(restored.pairingCompletion, "Success is a current interaction, not a persisted stale banner")
    }

    @MainActor func testTwoLiveSyntheticMacsShareRelayWithoutSharingRunsOrContext() async throws {
        let (root, service) = try fixture(); let destinations = DestinationStore(root: root, keychainService: service)
        defer { destinations.resetForTesting(); try? FileManager.default.removeItem(at: root) }
        destinations.activity(true)
        func invitation(_ suffix: String = "") async throws -> String {
            let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair" + suffix)!)
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
        for value in [nativeFixtureRelayOrigin.replacingOccurrences(of: "127.0.0.1", with: "localhost"), "\(nativeFixtureRelayOrigin)", "ws://192.168.1.2", "ws://172.16.0.1", "ws://10.2.3.4", "ws://mac.local", "wss://relay.example.test"] { XCTAssertEqual(try RemoteStore.validatedRelay(value), value) }
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        destinations.activity(true); try destinations.add(try JSONDecoder().decode(JSON.self, from: data)["code"].string, label: "Personal")
        try await destinationWait { destinations.selected?.connected == true }
        let remote = try XCTUnwrap(destinations.selected), original = try XCTUnwrap(remote.connection)
        remote.setDraft("new-chat", .string("Keep live draft"))
        // Same fixture relay, different valid address: requires replacing the WebSocket transport.
        try destinations.editRelay(original.hostId, address: nativeFixtureRelayOrigin.replacingOccurrences(of: "127.0.0.1", with: "localhost"))
        XCTAssertFalse(remote.connected); XCTAssertEqual(remote.status, "Connecting…")
        try await destinationWait { remote.connected }
        await remote.refresh()
        XCTAssertTrue(destinations.selected === remote); XCTAssertEqual(remote.connection?.relay, nativeFixtureRelayOrigin.replacingOccurrences(of: "127.0.0.1", with: "localhost"))
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
    func testProviderActivityGroupsMetadataWhilePreservingHumanAndAssistantMessages() {
        let activity: JSON = .object(["role": .string("system"), "text": .string("Thinking"), "data": .object(["activity": .object(["kind": .string("thinking"), "provider": .string("codex")])])])
        let commentary: JSON = .object(["role": .string("assistant"), "text": .string("An ordinary progress update"), "data": .object(["phase": .string("commentary")])])
        let legacy: JSON = .object(["role": .string("system"), "text": .string("MTPLX is thinking.")])
        XCTAssertTrue(NativeActivity.contains(activity))
        XCTAssertFalse(NativeActivity.contains(commentary))
        XCTAssertEqual(NativeActivity.group(events: [activity, commentary], startingAt: 0), [activity])
        XCTAssertTrue(NativeActivity.contains(legacy, provider: "mtplx"))
        XCTAssertFalse(NativeActivity.contains(legacy, provider: "codex"))
        let feedback: JSON = .object(["role": .string("system"), "data": .object(["agentFeedback": .object([:]), "activity": .object([:])])])
        XCTAssertFalse(NativeActivity.contains(feedback))
    }
    func testNativeResourcesAttributeSharedProcessesOnceAndProtectPersistedTabs() {
        let tabs: [JSON] = [
            .object(["id": .string("one"), "title": .string("One"), "loaded": .bool(true), "pid": .number(10), "persist": .bool(true)]),
            .object(["id": .string("two"), "loaded": .bool(true), "pid": .number(20)]),
            .object(["id": .string("three"), "loaded": .bool(true), "pid": .number(20)]),
            .object(["id": .string("cold"), "loaded": .bool(false)])]
        let processes: [JSON] = [.object(["pid": .number(1), "name": .string("App"), "memoryBytes": .number(1024)]), .object(["pid": .number(10), "memoryBytes": .number(2048)]), .object(["pid": .number(20), "memoryBytes": .number(4096)])]
        let rows = NativeResourceRow.rows(.object(["tabs": .array(tabs), "processes": .array(processes)]))
        XCTAssertEqual(rows.filter { $0.kind == "system" }.count, 2)
        XCTAssertEqual(rows.filter { $0.kind == "loaded" }.count, 3)
        XCTAssertEqual(rows.last?.id, "tab:cold")
        XCTAssertFalse(rows.first { $0.id == "tab:one" }!.canUnload)
        XCTAssertEqual(rows.first { $0.id == "tab:one" }?.process["memoryBytes"].int, 2048)
        XCTAssertEqual(rows.first { $0.id == "tab:two" }?.process, .null)
        XCTAssertTrue(rows.first { $0.id == "tab:two" }!.shared)
    }
    @MainActor func testDescriptorCacheKeepsOlderSelectedTabsBeyondOneHundred() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("tabs.enc"), key = RemoteCrypto.random()
        let tabs = (0..<150).map { n in BrowserDescriptor(id: "tab-\(n)", title: "Page \(n)", url: "https://example.test/\(n)", scope: "main") }
        NativeDescriptorCacheWriter.shared.save(tabs: tabs, selections: ["main": .string("tab-0")], snapshot: .null, key: key, account: "fixture", url: url)
        NativeDescriptorCacheWriter.shared.flush()
        let restored = try RemoteCrypto.open(String(contentsOf: url, encoding: .utf8), key: key, aad: "fixture")
        XCTAssertEqual(restored["tabs"].array.count, 150)
        XCTAssertEqual(restored["tabs"].array.first?["id"].string, "tab-0")
        XCTAssertEqual(restored["selections"]["main"].string, "tab-0")
    }
    func testLargeHistoryIndexKeepsNewestUniqueMatchingVisitsAndBoundsResults() async {
        var rows: [JSON] = (0..<30_000).map { n in .object(["id": .string("v\(n)"), "url": .string("https://example.test/\(n)"), "title": .string("Site \(n)"), "visitedAt": .string("2026-10-25T01:00:00Z")]) }
        rows.append(.object(["id": .string("newest"), "url": .string("https://example.test/42"), "title": .string("Changed name"), "visitedAt": .string("2026-10-25T02:00:00.100Z")]))
        rows.append(.object(["url": .string("javascript:alert(1)"), "title": .string("Changed name")]))
        let snapshot = rows
        let index = await Task.detached { NativeBrowserHistoryIndex(snapshot) }.value
        XCTAssertEqual(index.matching("").count, 20)
        XCTAssertEqual(index.matching("").first?["id"].string, "newest")
        XCTAssertEqual(index.matching("changed NAME").map { $0["id"].string }, ["newest"])
        XCTAssertEqual(index.matching("site impossible").count, 0)
        XCTAssertEqual(index.matching("site", limit: 7).count, 7)
        XCTAssertEqual(index.matching("changed", limit: 0).count, 0)
    }
    func testNavigationWriterRestoresExactContainerAndSelectionAfterFlush() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("navigation.enc"), key = RemoteCrypto.random()
        let expected: JSON = .object(["area": .string("Workspaces"), "selected": .string("workspace:owner:workspace"), "phoneWorkspaceHost": .string("owner"), "phoneWorkspaceID": .string("workspace"), "phoneCurrentID": .string("browser:retained"), "tabs": .array([])])
        NativeDescriptorCacheWriter.shared.saveNavigation(.object(["area": .string("Home")]), key: key, url: url)
        NativeDescriptorCacheWriter.shared.saveNavigation(expected, key: key, url: url)
        NativeDescriptorCacheWriter.shared.flush()
        let restored = try RemoteCrypto.open(String(contentsOf: url, encoding: .utf8), key: key, aad: "proteus-mobile-navigation-v1")
        XCTAssertEqual(restored, expected)
    }
    func testMoveDestinationsGroupProjectsWithTheirWorkspaceAndKeepOwnersDistinct() {
        let context: JSON = .object(["workspaces": .array([.object(["id": .string("w"), "name": .string("Workspace")])])])
        let projects: JSON = .object(["projects": .array([.object(["id": .string("p"), "workspaceId": .string("w"), "name": .string("Project")])])])
        let shared = NativeMoveLocations.groups(context: context, projects: projects, containersOnly: true)
        XCTAssertEqual(shared.first?.label, "Workspace")
        XCTAssertEqual(shared.first?.locations.map(\.id), ["project:p"])
        let owned = NativeMoveLocations.groups(context: context, projects: projects, hostID: "owner", roots: false)
        XCTAssertEqual(owned.first?.locations.map(\.id), ["workspace:owner:w", "project:owner:p"])
    }
    @MainActor func testAddressRecentsUseLatestVisitDeviceAndTwentyUniqueURLs() {
        var items: [JSON] = (0..<25).map { number in .object(["id": .string("v\(number)"), "url": .string("https://example.test/\(number)"), "visitedAt": .string(String(format: "2026-10-07T00:%02d:00Z", number)), "deviceName": .string("Mac")]) }
        items.append(.object(["id": .string("latest"), "url": .string("https://example.test/0"), "visitedAt": .string("2026-10-07T01:00:00Z"), "deviceName": .string("iPad")]))
        items.append(.object(["url": .string("javascript:alert(1)"), "visitedAt": .string("2026-10-07T02:00:00Z")]))
        let result = SharedAppStore.recentBrowserVisits(items)
        XCTAssertEqual(result.count, 20); XCTAssertEqual(result.first?["id"].string, "latest"); XCTAssertEqual(result.first?["deviceName"].string, "iPad")
        XCTAssertEqual(result[1]["url"].string, "https://example.test/24"); XCTAssertEqual(Set(result.map { $0["url"].string }).count, 20)
    }
    @MainActor func testPersistedBrowserCreatesAndRetainsLiveViewUntilUnpersisted() throws {
        let shared = SharedAppStore()
        shared.open(nil, title: "Synthetic resident page", scope: "main")
        let id = try XCTUnwrap(shared.selectedMainBrowser)
        XCTAssertFalse(shared.isBrowserLoaded(id))
        shared.persistBrowser(id, enabled: true)
        XCTAssertTrue(shared.isBrowserLoaded(id))
        shared.unload(id)
        XCTAssertTrue(shared.isBrowserLoaded(id))
        shared.pruneBrowsers(now: Date().addingTimeInterval(7200))
        XCTAssertTrue(shared.isBrowserLoaded(id))
        shared.persistBrowser(id, enabled: false); shared.unload(id)
        XCTAssertFalse(shared.isBrowserLoaded(id))
        shared.close(id)
        XCTAssertFalse(shared.browserTabs.contains { $0.id == id })
    }
    @MainActor func testBrowserScopesAndOneHourSixTabRetention() throws {
        let shared = SharedAppStore()
        let savedLimit = UserDefaults.standard.object(forKey: "proteus.loaded-tab-limit")
        defer { if let savedLimit { UserDefaults.standard.set(savedLimit, forKey: "proteus.loaded-tab-limit") } else { UserDefaults.standard.removeObject(forKey: "proteus.loaded-tab-limit") } }
        shared.loadedTabLimit = 6 // Exercise an explicit configured budget, independent of the default.
        shared.open(nil, title: "Main", scope: "main")
        let mainID = try XCTUnwrap(shared.selectedMainBrowser)
        XCTAssertTrue(shared.tabs(in: "team").isEmpty)
        shared.open(nil, title: "Team")
        let teamID = try XCTUnwrap(shared.selectedBrowser)
        XCTAssertEqual(shared.tabs(in: "main").map(\.id), [mainID])
        XCTAssertEqual(shared.tabs(in: "team").map(\.id), [teamID])
        for tab in shared.browserTabs { _ = shared.webView(tab) }
        for number in 0..<5 { shared.open(nil, title: "Chat \(number)", scope: "chat:host:run"); _ = shared.webView(try XCTUnwrap(shared.browserTabs.last)) }
        XCTAssertEqual(shared.browserTabs.count, 7)
        shared.pruneBrowsers(now: Date().addingTimeInterval(3601))
        XCTAssertFalse(shared.isBrowserLoaded(mainID))
        XCTAssertTrue(shared.isBrowserLoaded(teamID))
        XCTAssertEqual(shared.browserTabs.count, 7)
        shared.select(mainID, in: "main")
        XCTAssertEqual(shared.selectedMainBrowser, mainID)
        XCTAssertEqual(shared.selectedBrowser, teamID)
        for tab in shared.browserTabs { shared.close(tab.id) }
    }
    @MainActor func testDesktopChatTabsKeepLiveTitlesThroughRemoteRefresh() async throws {
        let data: Data
        do { (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!) } catch { throw RemoteError(message: "Pair fixture HTTP: " + error.localizedDescription) }
        let fixture = try JSONDecoder().decode(JSON.self, from: data)
        let cache = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString); let remote = RemoteStore(connection: nil, cacheRoot: cache, legacyCredentials: false); try remote.pair(fixture["code"].string)
        func checkedRequest(_ method: String, _ args: [String: JSON]) async throws -> JSON {
            var payload = args
            for attempt in 0..<5 {
                do { return try await remote.request(method, payload) }
                catch {
                    let operations = payload["operations"]?.array ?? []
                    guard attempt < 4, method == "tabs.mutate", (error as? RemoteError)?.message.contains("Content tabs changed") == true,
                          !operations.isEmpty, operations.allSatisfy({ ["open", "rename"].contains($0["action"].string) }) else { throw error }
                    let fresh = try await remote.request("tabs.get", ["scope": payload["scope"] ?? .null, "id": payload["id"] ?? .null])
                    for operation in operations {
                        let key = operation["action"].string == "open" ? operation["tab"]["id"].string : operation["id"].string
                        guard let current = fresh["tabs"].array.first(where: { $0["id"].string == key }) else { throw error }
                        if operation["action"].string == "open" { guard current["url"] == operation["tab"]["url"], current["profileId"].string == operation["tab"]["profileId"].string else { throw error } }
                    }
                    payload["expectedRevision"] = fresh["revision"]
                }
            }
            throw RemoteError(message: "Metadata revision did not settle")
        }
        let shared = SharedAppStore()
        defer { shared.unloadBrowsers(); remote.forget(); try? FileManager.default.removeItem(at: cache) }
        for _ in 0..<100 { if remote.connected && remote.state["capabilities"].array.contains(.string("content-tabs.v1")) { break }; try await Task.sleep(for: .milliseconds(100)) }; XCTAssertTrue(remote.connected)
        let created = try await checkedRequest("chat.start", ["prompt": .string("Desktop browser title rehearsal"), "provider": .string("rehearsal")])
        let run = created["runId"].string, host = try XCTUnwrap(remote.connection?.hostId)
        let scope = "chat:\(host):\(run)"
        let url = "\(nativeFixtureHTTPOrigin)/browser/one"
        let desktop: JSON = .object(["id": .string("desktop-browser"), "type": .string("browser"), "title": .string("New tab"), "url": .string(url)])
        _ = try await checkedRequest("tabs.mutate", ["scope": .string("chat"), "id": .string(run), "expectedRevision": .number(0), "operations": .array([.object(["action": .string("open"), "tab": desktop])])])
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run)
        let initial = try XCTUnwrap(shared.tabs(in: scope).first)
        shared.select(initial.id, in: scope)
        // This fixture lives on the test client's own loopback server. Exercise browser
        // retention explicitly; automatic host-local preview isolation has separate coverage.
        let web = shared.webView(initial, allowLocalNavigation: true)
        for _ in 0..<100 { if shared.browserTabs.first(where: { $0.id == initial.id })?.title == "First browser page" && !web.isLoading { break }; try await Task.sleep(for: .milliseconds(100)) }; XCTAssertEqual(web.title, "First browser page")
        // Let native title publication settle, then simulate another desktop workspace refresh
        // carrying its unloaded placeholder for the same URL and stable shared tab identity.
        for _ in 0..<8 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run); try await Task.sleep(for: .milliseconds(100)) }
        let current = try await checkedRequest("tabs.get", ["scope": .string("chat"), "id": .string(run)])
        _ = try await checkedRequest("tabs.mutate", ["scope": .string("chat"), "id": .string(run), "expectedRevision": current["revision"], "operations": .array([.object(["action": .string("open"), "tab": desktop])])])
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run)
        XCTAssertEqual(shared.tabs(in: scope).first?.title, "First browser page", "An unloaded desktop placeholder must not replace the title of the page displayed on iPad")
        XCTAssertEqual(shared.selected(in: scope), initial.id)
        XCTAssertTrue(shared.webView(try XCTUnwrap(shared.tabs(in: scope).first)) === web)
        XCTAssertEqual(shared.tabs(in: scope).count, 1)
        let renameBase = try await checkedRequest("tabs.get", ["scope": .string("chat"), "id": .string(run)])
        _ = try await checkedRequest("tabs.mutate", ["scope": .string("chat"), "id": .string(run), "expectedRevision": renameBase["revision"], "operations": .array([.object(["action": .string("rename"), "id": .string("desktop-browser"), "title": .string("Pinned desktop name")])])])
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run)
        XCTAssertEqual(shared.tabs(in: scope).first?.title, "Pinned desktop name", "An explicit desktop rename still takes priority")
        XCTAssertTrue(shared.navigate(URL(string: "\(nativeFixtureHTTPOrigin)/browser/two")!, in: initial.id))
        for _ in 0..<100 { if web.title == "Second browser page" && !web.isLoading { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertEqual(web.title, "Second browser page")
        XCTAssertEqual(shared.tabs(in: scope).first?.title, "Pinned desktop name")
        for _ in 0..<8 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run); try await Task.sleep(for: .milliseconds(100)) }
        let navigationBase = try await checkedRequest("tabs.get", ["scope": .string("chat"), "id": .string(run)])
        var changed: JSON = .object(["action": .string("browser-navigate"), "tabId": .string("desktop-browser"), "operationId": .string(UUID().uuidString), "entryId": .string(UUID().uuidString), "baseRevision": navigationBase["tabs"].array.first?["history"]["revision"] ?? .number(0), "title": .string("New tab"), "url": .string("\(nativeFixtureHTTPOrigin)/browser/three")])
        var navigationRevision = navigationBase["revision"], applied = false
        for _ in 0..<5 {
            do { _ = try await checkedRequest("tabs.mutate", ["scope": .string("chat"), "id": .string(run), "expectedRevision": navigationRevision, "operations": .array([changed])]); applied = true; break }
            catch {
                guard let message = (error as? RemoteError)?.message, message.contains("Content tabs changed") || message.contains("Navigation changed on the owning computer") else { throw error }
                let fresh = try await checkedRequest("tabs.get", ["scope": .string("chat"), "id": .string(run)])
                let previous = navigationBase["tabs"].array.first { $0["id"].string == "desktop-browser" } ?? .null
                let current = fresh["tabs"].array.first { $0["id"].string == "desktop-browser" } ?? .null
                XCTAssertEqual(current["url"], previous["url"]); XCTAssertEqual(current["history"]["currentEntryId"], previous["history"]["currentEntryId"])
                guard current["url"] == previous["url"], current["history"]["currentEntryId"] == previous["history"]["currentEntryId"] else { throw error }
                navigationRevision = fresh["revision"]; var operation = changed.object; operation["baseRevision"] = current["history"]["revision"]; changed = .object(operation)
            }
        }
        XCTAssertTrue(applied, "Known title-only revision conflicts must converge without overwriting a different navigation")
        await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run)
        for _ in 0..<100 { if web.title == "Third browser page" && !web.isLoading { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertEqual(web.title, "Third browser page", "A real desktop URL change still navigates the retained view")
        XCTAssertEqual(shared.tabs(in: scope).first?.title, "Pinned desktop name", "Explicit tab names survive navigation")
        XCTAssertTrue(shared.webView(try XCTUnwrap(shared.tabs(in: scope).first)) === web)
        if let index = shared.browserTabs.firstIndex(where: { $0.id == initial.id }) {
            shared.browserTabs[index].url = "https://synthetic.example.test/login?code=synthetic-private"
            for _ in 0..<3 { await shared.refreshContentTabs(scope: scope, remote: remote, kind: "chat", id: run) }
            XCTAssertEqual(shared.tabs(in: scope).count, 1, "A private login URL still represents the existing desktop tab")
            XCTAssertEqual(shared.tabs(in: scope).first?.id, initial.id)
            XCTAssertTrue(shared.tabs(in: scope).first?.url?.contains("synthetic-private") == true)
            XCTAssertTrue(shared.webView(try XCTUnwrap(shared.tabs(in: scope).first)) === web)
        }
    }
    @MainActor func testSameProfileTabsShareCookiesAndReorderOnlyTheirScope() async throws {
        let shared = SharedAppStore(), scope = "chat:synthetic-cookie-host:synthetic-cookie-chat"
        var created: [BrowserDescriptor] = []
        for group in ["main", "team", scope, scope] { shared.open(nil, scope: group); created.append(try XCTUnwrap(shared.tabs(in: group).last)) }
        defer { for tab in created { shared.close(tab.id) } }
        let views = created.map { shared.webView($0) }, dataStore = views[0].configuration.websiteDataStore
        XCTAssertTrue(views.allSatisfy { $0.configuration.websiteDataStore === dataStore })
        let cookie = try XCTUnwrap(HTTPCookie(properties: [.domain: "synthetic.example.test", .path: "/", .name: "proteus-test-session", .value: "synthetic", .expires: Date().addingTimeInterval(60)]))
        await dataStore.httpCookieStore.setCookie(cookie)
        let cookies = await views[2].configuration.websiteDataStore.httpCookieStore.allCookies()
        XCTAssertTrue(cookies.contains { $0.name == cookie.name && $0.value == "synthetic" })
        await dataStore.httpCookieStore.deleteCookie(cookie)
        let mainOrder = shared.tabs(in: "main").map(\.id), teamOrder = shared.tabs(in: "team").map(\.id)
        shared.select(created[2].id, in: scope); shared.reorderBrowsers([created[3].id, created[2].id], in: scope)
        XCTAssertEqual(shared.tabs(in: scope).map(\.id), [created[3].id, created[2].id])
        XCTAssertEqual(shared.selected(in: scope), created[2].id)
        XCTAssertEqual(shared.tabs(in: "main").map(\.id), mainOrder); XCTAssertEqual(shared.tabs(in: "team").map(\.id), teamOrder)
    }
    @MainActor func testBlankSharedBrowserResponsePreservesFirstNavigationBeforeViewCreation() throws {
        for scope in ["chat:synthetic-host:" + UUID().uuidString, "workspace:synthetic-host:" + UUID().uuidString] {
            let shared = SharedAppStore(); defer { shared.unloadBrowsers() }
            shared.open(nil, scope: scope)
            let tab = try XCTUnwrap(shared.tabs(in: scope).first)
            let address = "https://example.test/first-navigation"
            XCTAssertTrue(shared.navigate(URL(string: address)!, in: tab.id))
            XCTAssertFalse(shared.isBrowserLoaded(tab.id), "SwiftUI has not constructed the view yet")
            let placeholder: JSON = .object(["id": .string(tab.id), "type": .string("browser"), "profileId": .string("default"), "title": .string("New tab"), "url": .string("")])
            // Both the initial tabs.get and a delayed tabs.mutate acknowledgement use this boundary.
            for revision in [1, 2] {
                shared.applyContentTabs(.object(["revision": .number(Double(revision)), "tabs": .array([placeholder])]), scope: scope)
                XCTAssertEqual(shared.tabs(in: scope).first?.url, address, "A blank sync echo must not send the first navigation back to Browsing home")
                XCTAssertFalse(shared.unloadedBrowsers.contains(tab.id), "A pending local navigation must remain eligible for view creation")
                XCTAssertEqual(shared.selected(in: scope), tab.id)
            }
        }
    }
    @MainActor func testBlankSharedBrowserResponsePreservesLivePageButHonorsRemoteChanges() async throws {
        for scope in ["chat:synthetic-host:" + UUID().uuidString, "workspace:synthetic-host:" + UUID().uuidString] {
            let shared = SharedAppStore(); defer { shared.unloadBrowsers() }
            let address = "\(nativeFixtureHTTPOrigin)/browser/one"
            shared.open(URL(string: address)!, scope: scope)
            let tab = try XCTUnwrap(shared.tabs(in: scope).first), web = shared.webView(tab)
            for _ in 0..<100 { if web.title == "First browser page" && !web.isLoading { break }; try await Task.sleep(for: .milliseconds(50)) }
            XCTAssertEqual(web.title, "First browser page")
            let history = shared.tabs(in: scope).first?.history
            func response(_ revision: Int, url: String = "", customTitle: String? = nil, profile: String = "default") -> JSON {
                var fields: [String: JSON] = ["id": .string(tab.id), "type": .string("browser"), "profileId": .string(profile), "title": .string("New tab"), "url": .string(url)]
                if let customTitle { fields["customTitle"] = .string(customTitle) }
                return .object(["revision": .number(Double(revision)), "tabs": .array([.object(fields)])])
            }
            shared.applyContentTabs(response(1), scope: scope)
            shared.applyContentTabs(response(2), scope: scope)
            XCTAssertEqual(shared.tabs(in: scope).first?.url, address)
            XCTAssertEqual(shared.tabs(in: scope).first?.title, "First browser page")
            XCTAssertEqual(shared.tabs(in: scope).first?.history, history)
            XCTAssertFalse(shared.unloadedBrowsers.contains(tab.id)); XCTAssertTrue(shared.isBrowserLoaded(tab.id))
            XCTAssertTrue(shared.webView(try XCTUnwrap(shared.tabs(in: scope).first)) === web)
            shared.applyContentTabs(response(3, customTitle: "Explicit shared name"), scope: scope)
            XCTAssertEqual(shared.tabs(in: scope).first?.title, "Explicit shared name")
            XCTAssertEqual(shared.tabs(in: scope).first?.url, address)
            let changed = "\(nativeFixtureHTTPOrigin)/browser/two"
            shared.applyContentTabs(response(4, url: changed), scope: scope)
            for _ in 0..<100 { if web.title == "Second browser page" && !web.isLoading { break }; try await Task.sleep(for: .milliseconds(50)) }
            XCTAssertEqual(web.title, "Second browser page"); XCTAssertEqual(shared.tabs(in: scope).first?.url, changed)
            let profile = UUID().uuidString
            shared.applyContentTabs(response(5, profile: profile), scope: scope)
            XCTAssertEqual(shared.tabs(in: scope).first?.profileId, profile)
            XCTAssertNil(shared.tabs(in: scope).first?.url); XCTAssertFalse(shared.isBrowserLoaded(tab.id))
            shared.applyContentTabs(.object(["revision": .number(6), "tabs": .array([])]), scope: scope)
            XCTAssertTrue(shared.tabs(in: scope).isEmpty, "Explicit close still removes the tab")
        }
    }
    @MainActor func testBrowserNavigationPreservesTabAndWebViewAndInvalidatesUnloadedObservers() async throws {
        let shared = SharedAppStore(); shared.open(nil)
        let tab = try XCTUnwrap(shared.browserTabs.first), id = tab.id
        let original = shared.webView(tab)
        XCTAssertTrue(shared.navigate(try XCTUnwrap(URL(string: "\(nativeFixtureHTTPOrigin)/browser/one")), in: id))
        XCTAssertEqual(shared.browserTabs.count, 1); XCTAssertEqual(shared.selectedBrowser, id)
        XCTAssertTrue(shared.webView(try XCTUnwrap(shared.browserTabs.first)) === original)
        for _ in 0..<100 { if shared.browserNavigation[id]?.title == "First browser page" && shared.browserNavigation[id]?.isLoading == false { break }; try await Task.sleep(for: .milliseconds(100)) }
        XCTAssertEqual(shared.browserNavigation[id]?.title, "First browser page")
        XCTAssertTrue(shared.navigate(try XCTUnwrap(URL(string: "\(nativeFixtureHTTPOrigin)/browser/two")), in: id))
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
        XCTAssertEqual(visit["url"].string, "https://example.test/page?filter=mine#section")
        XCTAssertEqual(visit["hostId"], .null)
        XCTAssertEqual(SharedAppStore.historyVisit(try XCTUnwrap(URL(string: "https://example.test/?token=fixture")), title: "Redirect", at: date, deviceID: id, deviceName: "Phone")?["url"].string, "https://example.test/?token=fixture")
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
        XCTAssertEqual(BrowserHistoryRows.details(.object(["local": .bool(true)]), timeZone: denver, locale: locale), "Saved on this device")
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
    @MainActor func testBrowserHistoryRetainsFullURLsWhileBookmarksKeepExistingValidation() throws {
        let bookmark = "https://dev.azure.com/example/project/_boards/board/t/team/Stories?view=backlog&iteration=42#selected=123"
        let search = "https://example.test/search?q=build%20status#results"
        for input in [bookmark, search, "https://example.test/docs#code-review"] { XCTAssertEqual(SharedAppStore.safeURL(input)?.absoluteString, input) }
        XCTAssertEqual(SharedAppStore.historyURL(bookmark)?.absoluteString, bookmark)
        XCTAssertEqual(SharedAppStore.historyURL(search)?.absoluteString, search)
        let capsule = try JSONSerialization.data(withJSONObject: ["version": 1, "hostId": "synthetic-host", "relay": "wss://example.test", "key": "synthetic-key", "expiresAt": "2099-01-01T00:00:00Z"]).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        let unsafe = ["https://user:password@example.test/", "javascript:alert(1)", "https://example.test/oauth/callback?code=secret", "https://example.test/page?access_token=secret", "https://example.test/signin", "https://example.test/page?apiKey=secret", "https://example.test/remote#pair=" + capsule, "https://example.test/remote#%70air=" + capsule, "https://example.test/remote?pairing=" + capsule, "https://example.test/remote?data=" + capsule, "https://example.test/remote#" + capsule, "https://example.test/page#route?session=secret", "https://example.test/page#auth=secret", "https://example.test/page#code=secret", "https://example.test/page?next=proteus%3A%2F%2Fpair%3Fdata%3D" + capsule]
        for input in unsafe { XCTAssertNil(SharedAppStore.safeURL(input), input); if input.hasPrefix("javascript:") || input.contains("user:password@") { XCTAssertNil(SharedAppStore.historyURL(input), input) } else { XCTAssertEqual(SharedAppStore.historyURL(input)?.absoluteString, input) } }
    }
    @MainActor func testMainBrowserActivationIsExplicitAndNeverRestoredFromCache() throws {
        let identity = "synthetic-main-selection-" + UUID().uuidString
        let digest = SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
        let cache = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/browsers/" + digest + ".enc")
        defer { try? FileManager.default.removeItem(at: cache) }
        let store = SharedAppStore(); store.reset(for: identity)
        XCTAssertNil(store.mainBrowserSelectionRequest)
        let first = try XCTUnwrap(store.open(nil, scope: "main"))
        XCTAssertEqual(store.mainBrowserSelectionRequest?.tabID, first)
        let firstRequest = try XCTUnwrap(store.mainBrowserSelectionRequest)
        let second = try XCTUnwrap(store.open(nil, scope: "main"))
        XCTAssertEqual(store.mainBrowserSelectionRequest?.tabID, second)
        XCTAssertNotEqual(store.mainBrowserSelectionRequest?.token, firstRequest.token, "Opening inside content mutation still represents an explicit selection")

        let restored = SharedAppStore(); restored.reset(for: identity)
        XCTAssertEqual(restored.tabs(in: "main").map(\.id), [first, second])
        XCTAssertEqual(restored.selectedMainBrowser, second)
        XCTAssertNil(restored.mainBrowserSelectionRequest, "Remembered browser selection must not override a cold notification route")
        restored.select(second, in: "main", activateMainBrowser: false)
        XCTAssertNil(restored.mainBrowserSelectionRequest, "Displaying an already selected browser is not a new navigation request")
        restored.select(second, in: "main")
        let selection = try XCTUnwrap(restored.mainBrowserSelectionRequest)
        XCTAssertEqual(selection.tabID, second)
        restored.select(second, in: "main")
        let reselection = try XCTUnwrap(restored.mainBrowserSelectionRequest)
        XCTAssertNotEqual(reselection.token, selection.token, "Explicitly selecting the same browser is still a fresh request")
        _ = restored.open(nil, scope: "team")
        restored.renameBrowser(second, title: "Updated metadata")
        restored.close(first)
        XCTAssertEqual(restored.mainBrowserSelectionRequest, reselection, "Non-main actions, metadata and background closure must not activate a main browser")
        restored.reset(for: identity + "-other")
        XCTAssertNil(restored.mainBrowserSelectionRequest)
        store.unloadBrowsers(); restored.unloadBrowsers()
    }
    @MainActor func testEncryptedBrowserRestartPreservesExactFullURLs() throws {
        let identity = "synthetic-browser-" + UUID().uuidString
        let digest = SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
        let cache = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/browsers/" + digest + ".enc")
        defer { try? FileManager.default.removeItem(at: cache) }
        let bookmark = "https://example.test/boards?team=42&view=active#selected=123"
        let store = SharedAppStore(); store.reset(for: identity)
        store.open(try XCTUnwrap(SharedAppStore.safeURL(bookmark)), title: "Board filter")
        store.open(URL(string: "https://example.test/remote#pair=synthetic-capsule"), title: "Do not retain pairing")
        let restored = SharedAppStore(); restored.reset(for: identity)
        XCTAssertEqual(restored.browserTabs.count, 2)
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
    @MainActor func testBrowserViewLookupIsNotAnInteractionAndLinkTargetsKeepExactAddresses() throws {
        let shared = SharedAppStore()
        var descriptor = BrowserDescriptor(id: "synthetic-idle", title: "Idle tab", url: nil, scope: "team")
        descriptor.openedAt = "2026-10-01T00:00:00Z"; descriptor.lastTouchedAt = "2026-10-02T00:00:00Z"
        shared.browserTabs = [descriptor]
        let first = shared.webView(descriptor)
        XCTAssertTrue(first is NativeLinkWebView)
        XCTAssertTrue(first === shared.webView(descriptor))
        XCTAssertEqual(shared.browserTabs[0].lastTouchedAt, descriptor.lastTouchedAt)
        let link = try XCTUnwrap(first as? NativeLinkWebView)
        let address = "https://example.test/relative/document?view=results&item=42#section"
        link.rememberLink(address); XCTAssertEqual(link.currentLink?.absoluteString, address)
        link.rememberLink(""); XCTAssertNil(link.currentLink, "Pressing non-link text clears the earlier target")
        for value in ["javascript:alert(1)", "file:///private/test", "https://user:secret@example.test/", "data:text/plain,test"] { XCTAssertNil(NativeLinkWebView.linkURL(value)) }
        shared.unloadBrowsers()
    }
    @MainActor func testPressedImageLinkResolvesRelativeURLAndClearsOnNonLink() async throws {
        let web = NativeLinkWebView(frame: .zero, configuration: WKWebViewConfiguration())
        web.loadHTMLString("<a href='/document?view=results&amp;item=42#section'><img id='linked' alt='Linked image'></a><p id='plain'>Plain text</p>", baseURL: URL(string: "https://example.test/folder/"))
        for _ in 0..<100 { if !web.isLoading { break }; try await Task.sleep(for: .milliseconds(50)) }
        _ = try await web.evaluateJavaScript("document.getElementById('linked').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,composed:true})); true")
        for _ in 0..<100 { if web.currentLink != nil { break }; try await Task.sleep(for: .milliseconds(20)) }
        XCTAssertEqual(web.currentLink?.absoluteString, "https://example.test/document?view=results&item=42#section")
        _ = try await web.evaluateJavaScript("document.getElementById('plain').dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,composed:true})); true")
        for _ in 0..<100 { if web.currentLink == nil { break }; try await Task.sleep(for: .milliseconds(20)) }
        XCTAssertNil(web.currentLink, "Non-link selection must not reuse the last link")
        web.stopLoading()
    }
    @MainActor func testLinkDraftUsesSourceWorkspaceWithoutReplacingAnExistingDraft() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let connection = DeviceConnection(relay: "wss://relay.example.test", hostId: UUID().uuidString, deviceId: UUID().uuidString, key: RemoteCrypto.random())
        let remote = RemoteStore(connection: connection, cacheRoot: root, legacyCredentials: false), shared = SharedAppStore()
        let address = try XCTUnwrap(URL(string: "https://example.test/item?view=results"))
        XCTAssertTrue(shared.prepareLinkDraft(address, remote: remote, hostID: connection.hostId, hostName: "Source Mac", workspaceID: "source-workspace"))
        XCTAssertEqual(remote.draft("new-chat")["workspace"].string, "source-workspace")
        XCTAssertTrue(shared.prepareLinkDraft(address, remote: remote, hostID: connection.hostId, hostName: "Source Mac", workspaceID: "another-workspace"))
        XCTAssertEqual(remote.draft("new-chat")["workspace"].string, "source-workspace", "An existing draft keeps its chosen configuration")
        XCTAssertEqual(remote.pendingCommandCount, 0, "Preparing a draft does not start a chat")
    }
    @MainActor func testWebKitDownloadProducesExportableFileAndAccountChangeCleansIt() async throws {
        let shared = SharedAppStore()
        let webView = WKWebView(frame: .zero)
        shared.download(try XCTUnwrap(URL(string: "\(nativeFixtureHTTPOrigin)/latest")), in: webView)
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
    @MainActor func testNotificationRouteParsesOnlyBoundedTargetsWithoutPayloadContent() {
        let host = "10000000-0000-4000-8000-000000000001"
        let route = NativeNotifications.NotificationRoute.from(["hostId": host, "chatId": "chat-1", "scheduleId": "schedule-1", "type": "schedule.completed", "prompt": "private prompt"])
        XCTAssertEqual(route.hostID, host)
        XCTAssertEqual(route.chatID, "chat-1")
        XCTAssertEqual(route.scheduleID, "schedule-1")
        XCTAssertEqual(route.type, "schedule.completed")
        let invalid = NativeNotifications.NotificationRoute.from(["hostId": "not-a-host", "chatId": "chat\nsecret", "scheduleId": String(repeating: "x", count: 129), "type": ""])
        XCTAssertEqual(invalid.hostID, "")
        XCTAssertEqual(invalid.chatID, "")
        XCTAssertEqual(invalid.scheduleID, "")
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
        // Await the observable deadline effect: simulator load can delay task startup.
        let deadline = ContinuousClock.now + .seconds(2)
        while speech.messageID != nil && ContinuousClock.now < deadline {
            try await Task.sleep(for: .milliseconds(10))
        }
        XCTAssertNil(speech.messageID); XCTAssertEqual(speech.failedMessageID, "b")
        speech.stop(); XCTAssertNil(speech.error); XCTAssertNil(speech.failedMessageID)
        speech.toggle(messageID: "empty", markdown: " \n "); XCTAssertNil(speech.messageID)
    }
}

final class ActiveRuntimeTests: XCTestCase {
    func testOverlappingActivityAndHumanWaits() {
        let base=Date(timeIntervalSince1970:0)
        XCTAssertEqual(runtimeUnion([(base,base.addingTimeInterval(5)),(base.addingTimeInterval(2),base.addingTimeInterval(8))]),8)
        let turn: JSON = .object(["intervals":.array([.array([.string("2026-10-07T00:00:00Z"),.string("2026-10-07T00:00:03Z")])]),"activeSince":.string("2026-10-07T00:00:10Z")])
        let now=ProviderAllowance.date("2026-10-07T00:00:15Z")!
        XCTAssertEqual(runtimeSeconds(turn,now:now,verified:true),8)
        XCTAssertEqual(runtimeSeconds(turn,now:now,verified:false),3)
        XCTAssertNil(runtimeSeconds(.null,now:now,verified:true))
    }
}

final class TabManagementNativeTests: XCTestCase {
    func testAnsweredQuestionsRemainOutsideActivityGroups() {
        let question: JSON = .object(["role": .string("system"), "text": .string("Explain before proceeding?"), "data": .object(["question": .object(["id": .string("q"), "status": .string("answered")])])])
        let tool: JSON = .object(["role": .string("tool"), "data": .object(["tool": .object([:])])])
        XCTAssertFalse(NativeActivity.contains(question)); XCTAssertEqual(NativeActivity.group(events: [tool, question], startingAt: 0), [tool])
    }
    @MainActor func testReplacementAndRealPushBothPreserveOriginalURLs() throws {
        let shared = SharedAppStore(); let id = try XCTUnwrap(shared.open(nil, scope: "main"))
        defer { shared.close(id) }
        shared.completeBrowserNavigation(URL(string: "https://example.test/one")!, title: "One", in: id, nativePosition: 0)
        shared.completeBrowserNavigation(URL(string: "https://example.test/one?view=results")!, title: "Results", in: id, nativePosition: 0, sameDocumentObservation: true)
        var history = try XCTUnwrap(shared.browserTabs.first { $0.id == id }?.history)
        XCTAssertEqual(history.entries.count, 2); XCTAssertEqual(history.entries[0].url, "https://example.test/one"); XCTAssertEqual(history.entries[1].url, "https://example.test/one?view=results")
        shared.completeBrowserNavigation(URL(string: "https://example.test/two")!, title: "Two", in: id, nativePosition: 1, sameDocumentObservation: true)
        history = try XCTUnwrap(shared.browserTabs.first { $0.id == id }?.history); XCTAssertEqual(history.entries.count, 3)
    }
    @MainActor func testFullNavigationBeforeNativePositionUpdatesDoesNotRewriteThePriorPage() throws {
        let shared = SharedAppStore(); let id = try XCTUnwrap(shared.open(nil, scope: "main")); defer { shared.close(id) }
        shared.completeBrowserNavigation(URL(string: "https://example.test/one")!, title: "One", in: id, nativePosition: 0)
        let next = URL(string: "https://example.test/two")!; shared.prepareBrowserLoad(next, in: id)
        shared.completeBrowserNavigation(next, title: "Two", in: id, nativePosition: 0, sameDocumentObservation: true)
        XCTAssertEqual(shared.browserTabs.first { $0.id == id }?.history?.entries.map(\.url), ["https://example.test/one", "https://example.test/two"])
    }
    @MainActor func testLoginRedirectRetainsOriginallyRequestedPath() throws {
        let shared = SharedAppStore(); let id = try XCTUnwrap(shared.open(nil, scope: "main")); defer { shared.close(id) }
        let original = URL(string: "https://example.test/project/deep")!
        XCTAssertTrue(shared.navigate(original, in: id)); shared.prepareBrowserLoad(original, in: id); shared.markBrowserRedirect(id)
        shared.completeBrowserNavigation(URL(string: "https://example.test/login?token=private")!, title: "Login", in: id, nativePosition: 0)
        let history = try XCTUnwrap(shared.browserTabs.first { $0.id == id }?.history)
        XCTAssertEqual(history.entries.first?.url, original.absoluteString); XCTAssertEqual(history.entries.last?.url, "https://example.test/login?token=private"); XCTAssertEqual(history.entries.count, 2)
    }
    @MainActor func testMovingBrowserPreservesItsWebViewAndPersistence() throws {
        let shared = SharedAppStore(); let id = try XCTUnwrap(shared.open(nil, scope: "main")); defer { shared.close(id) }
        let tab = try XCTUnwrap(shared.browserTabs.first { $0.id == id }); let view = shared.webView(tab)
        shared.persistBrowser(id, enabled: true); shared.transferBrowser(id, to: "workspace:fixture:target", copy: false)
        let moved = try XCTUnwrap(shared.browserTabs.first { $0.id == id }); XCTAssertEqual(moved.scope, "workspace:fixture:target"); XCTAssertTrue(moved.persist); XCTAssertTrue(shared.webView(moved) === view)
    }
}

import XCTest
import Observation
import Combine
import UIKit
@testable import Proteus

final class NativeProjectionTests: XCTestCase {
    func testRootResourceRestorationRetainsPlacementAndSeparatesOwnersAndAccounts() throws {
        let reminder = NativeContentTab(id: "reminder", title: "Reminder", kind: "reminder", hostID: nil, resource: .object(["accountID": .string("account-a")]))
        let scratch = NativeContentTab(id: "scratch", title: "Scratch", kind: "scratch", hostID: "owner", resource: .object(["hostID": .string("owner"), "scratchID": .string("note")]))
        let files = NativeContentTab(id: "files", title: "Files", kind: "files", hostID: "missing", resource: .object(["hostID": .string("missing")]))
        let rows = try JSONDecoder().decode([NativeContentTab].self, from: JSONEncoder().encode([reminder,scratch,files]))
        XCTAssertEqual(rows,[reminder,scratch,files])
        XCTAssertEqual(NativeContentTabProjection.restored(rows, browserIDs: [], hosts: ["owner"], account: "account-a"), [reminder,scratch])
        XCTAssertEqual(NativeContentTabProjection.restored(rows, browserIDs: [], hosts: ["owner"], account: "account-b"), [scratch])
    }
    @MainActor func testFeatureOverviewKeepsGroupsAndNeverReusesPrivatePreviews() {
        let chrome = NativePhoneChrome(); chrome.cacheNamespace = "synthetic-feature-test:" + UUID().uuidString
        defer { chrome.reset() }
        let image = UIGraphicsImageRenderer(size: CGSize(width: 16, height: 16)).image { _ in UIColor.green.setFill(); UIBezierPath(rect: CGRect(x: 0, y: 0, width: 16, height: 16)).fill() }
        let scratch = NativePhoneTab(id: "resource:scratch", title: "Scratch", symbol: "note.text", detail: "", section: "Scratchpad", sectionID: "feature:scratchpad", preview: image, select: {})
        let reminder = NativePhoneTab(id: "resource:reminder", title: "Reminder", symbol: "checklist", detail: "", section: "Reminders", sectionID: "feature:reminders", preview: image, select: {})
        chrome.replaceFeatureTabs("feature:scratchpad", items: [scratch], current: scratch.id)
        chrome.replaceFeatureTabs("feature:reminders", items: [reminder], current: reminder.id)
        XCTAssertEqual(chrome.featureOverviewItems(for: "scratchpad").map(\.id), [scratch.id])
        XCTAssertEqual(chrome.featureOverviewItems(for: "reminders").map(\.id), [reminder.id])
        XCTAssertNotNil(chrome.featureOverviewItems(for: "scratchpad").first?.preview)
        var privateTab = scratch; privateTab.symbol = "eye.slash"
        chrome.replaceFeatureTabs("feature:scratchpad", items: [privateTab], current: privateTab.id)
        XCTAssertNil(chrome.featureOverviewItems(for: "scratchpad").first { $0.id == privateTab.id }?.preview)
        XCTAssertFalse(chrome.visited.contains { $0.id == privateTab.id })
        XCTAssertEqual(chrome.currentID, "")
        chrome.removeFeatureTabs("feature:scratchpad")
        XCTAssertTrue(chrome.featureOverviewItems(for: "scratchpad").isEmpty)
        XCTAssertEqual(chrome.featureOverviewItems(for: "reminders").map(\.id), [reminder.id])
    }
    func testBrowserMetadataDoesNotChangeShellMembership() {
        var tab = BrowserDescriptor(id: "page", title: "Before", url: "https://example.test/a", scope: "main")
        let membership = NativeBrowserMembership(tab)
        tab.title = "After"; tab.url = "https://example.test/b"; tab.hidden = true; tab.incognito = true
        tab.readingPosition = BrowserReadingPosition(url: tab.url!, x: 0, y: 450)
        tab.history = BrowserTabHistory(entries: [.init(url: tab.url!, title: tab.title)], index: 0)
        XCTAssertEqual(NativeBrowserMembership(tab), membership)
        tab.scope = "project"
        XCTAssertNotEqual(NativeBrowserMembership(tab), membership)
    }
    func testMainBrowserReconciliationPreservesSlotsOriginsAndOtherResources() {
        let chat = NativeContentTab(id: "chat", title: "Draft", kind: "chat", hostID: "owner")
        let document = NativeContentTab(id: "document", title: "Notes", kind: "document", hostID: "owner", sourceChatID: "original", documentID: "file")
        let opened = [chat, NativeContentTab(id: "a", title: "A", kind: "browser", hostID: nil), document, NativeContentTab(id: "moved", title: "Moved", kind: "browser", hostID: nil)]
        let tabs = ["a", "b", "c", "child", "orphan"].map { BrowserDescriptor(id: $0, title: $0, url: nil, scope: "main") } + [BrowserDescriptor(id: "moved", title: "Moved", url: nil, scope: "project")]
        var origins = ["b": "a", "c": "a", "child": "b", "orphan": "moved"]
        let result = NativeContentTabProjection.mainBrowsers(tabs, opened: opened) { origins.removeValue(forKey: $0) }
        XCTAssertEqual(result.map(\.id), ["chat", "a", "c", "b", "child", "document", "orphan"])
        XCTAssertEqual(result.first, chat); XCTAssertEqual(result[5], document)
        XCTAssertTrue(origins.isEmpty)
        XCTAssertEqual(NativeContentTabProjection.mainBrowsers(tabs, opened: result) { _ in XCTFail("Existing tabs must not consume new insertion intent"); return nil }, result)
    }
    @MainActor func testBulkBrowserRemovalPublishesOnlyChangedOverviewLists() {
        let chrome = NativePhoneChrome(), publications = NSMutableArray()
        let token = chrome.objectWillChange.sink { publications.add(1) }
        chrome.forgetBrowsers([]); chrome.forgetBrowsers(["absent"])
        XCTAssertEqual(publications.count, 0)
        let kept = NativePhoneTab(id: "chat:kept", title: "Chat", symbol: "bubble", detail: "", select: {})
        chrome.visited = [kept] + (0..<200).map { NativePhoneTab(id: "browser:tab-\($0)", title: "Page", symbol: "globe", detail: "", select: {}) }
        chrome.recent = chrome.visited
        chrome.interactedAt = ["browser:tab-1": Date(), "chat:kept": Date()]
        publications.removeAllObjects()
        chrome.forgetBrowsers(Set((0..<200).map { "tab-\($0)" }))
        XCTAssertEqual(publications.count, 2)
        XCTAssertEqual(chrome.visited.map(\.id), [kept.id]); XCTAssertEqual(chrome.recent.map(\.id), [kept.id])
        XCTAssertEqual(Set(chrome.interactedAt.keys), [kept.id])
        withExtendedLifetime(token) {}
    }
    func testLargeMainBrowserReconciliationMatchesPreviousBehavior() {
        let tabs = (0..<1000).map { BrowserDescriptor(id: "tab-\($0)", title: "Synthetic", url: nil, scope: $0.isMultiple(of: 7) ? "project" : "main") }
        let opened = (0..<900).map { NativeContentTab(id: "tab-\($0)", title: "Synthetic", kind: "browser", hostID: nil) }
        let start = ProcessInfo.processInfo.systemUptime
        var reference = opened
        for tab in tabs where tab.scope == "main" && !reference.contains(where: { $0.id == tab.id }) { reference.append(NativeContentTab(id: tab.id, title: tab.title, kind: "browser", hostID: nil)) }
        reference.removeAll { item in item.kind == "browser" && !tabs.contains(where: { $0.id == item.id && $0.scope == "main" }) }
        let referenceMS = (ProcessInfo.processInfo.systemUptime - start) * 1000
        let optimizedStart = ProcessInfo.processInfo.systemUptime
        let result = NativeContentTabProjection.mainBrowsers(tabs, opened: opened) { _ in nil }
        let optimizedMS = (ProcessInfo.processInfo.systemUptime - optimizedStart) * 1000
        XCTAssertEqual(result, reference)
        print("NOV11_MAIN_TAB_RECONCILIATION tabs=1000 reference_ms=\(referenceMS) indexed_ms=\(optimizedMS)")
    }
    @MainActor func testSidebarIgnoresProgressAndTextButKeepsLiveActivityAndMembership() {
        let remote = RemoteStore(connection: nil, legacyCredentials: false)
        var run: [String: JSON] = ["id": .string("a"), "title": .string("Chat"), "lastActivityAt": .string("2026-11-03T01:00:00Z"), "projectId": .string("one")]
        remote.updateState(.object(["runs": .array([.object(run)])]))
        let invalidation = ProjectionInvalidation()
        withObservationTracking { _ = remote.sidebarRunState } onChange: { invalidation.mark() }
        run["progress"] = .object(["tick": .number(1)]); run["updatedAt"] = .string("2026-11-03T01:00:01Z")
        remote.updateState(.object(["runs": .array([.object(run)])]))
        XCTAssertFalse(invalidation.changed)
        run["projectId"] = .string("two")
        remote.updateState(.object(["runs": .array([.object(run)])]))
        XCTAssertTrue(invalidation.changed)
        XCTAssertEqual(remote.sidebarRunState["index"]["a"]["projectId"].string, "two")
        remote.chats["a"] = .object(run)
        let textInvalidation = ProjectionInvalidation()
        withObservationTracking { _ = remote.sidebarRunState } onChange: { textInvalidation.mark() }
        run["events"] = .array([.object(["text": .string("streaming")])]); remote.chats["a"] = .object(run)
        XCTAssertFalse(textInvalidation.changed)
        run["lastActivityAt"] = .string("2026-11-03T01:01:00Z"); remote.chats["a"] = .object(run)
        XCTAssertTrue(textInvalidation.changed)
        let legacy: JSON = .object(["id": .string("old"), "openedAt": .string("2026-11-03T00:00:00Z")])
        remote.updateState(.object(["runs": .array([legacy])]))
        XCTAssertEqual(NativeProjectActivity.date(remote.sidebarRunState["index"]["old"]), NativeProjectActivity.date(legacy))
        let legacyInvalidation = ProjectionInvalidation()
        withObservationTracking { _ = remote.sidebarRunState } onChange: { legacyInvalidation.mark() }
        var legacyProgress = legacy.object; legacyProgress["updatedAt"] = .string("2026-11-03T01:00:00Z")
        remote.updateState(.object(["runs": .array([.object(legacyProgress)])]))
        XCTAssertFalse(legacyInvalidation.changed, "An undisplayed legacy update timestamp is not sidebar activity")
    }
    @MainActor func testChromePublishesTransitionsWithoutPublishingNoopAssignments() {
        let chrome = NativePhoneChrome(), publications = NSMutableArray()
        let token = chrome.objectWillChange.sink { publications.add(1) }
        chrome.drawer = false; chrome.controlsHidden = false
        XCTAssertEqual(publications.count, 0)
        chrome.drawer = true; chrome.drawer = true
        chrome.controlsHidden = true; chrome.controlsHidden = true
        XCTAssertEqual(publications.count, 2)
        withExtendedLifetime(token) {}
    }
    @MainActor func testAttentionTitleIndexIgnoresStreamingTextAndKeepsLiveRenames() {
        let remote = RemoteStore(connection: nil, legacyCredentials: false)
        remote.chats["a"] = .object(["title": .string("Original"), "events": .array([])])
        let invalidated = ProjectionInvalidation()
        withObservationTracking { XCTAssertEqual(remote.chatTitleIndex["a"], .string("Original")) } onChange: { invalidated.mark() }
        remote.chats["a"] = .object(["title": .string("Original"), "events": .array([.object(["text": .string("Streaming")])])])
        XCTAssertFalse(invalidated.changed)
        remote.chats["a"] = .object(["title": .string("Renamed"), "events": .array([])])
        XCTAssertTrue(invalidated.changed)
        XCTAssertEqual(remote.chatTitleIndex["a"], .string("Renamed"))
    }
    @MainActor func testHomeAttentionAndExactBadgesIgnoreUnrelatedRunProgress() {
        let remote = RemoteStore(connection: nil, legacyCredentials: false)
        var value: [String: JSON] = ["runningChatCount": .number(1), "attentionCount": .number(0), "runCount": .number(1), "schedules": .array([]), "runs": .array([.object(["id": .string("stream"), "status": .string("running")])])]
        remote.updateState(.object(value))
        let invalidated = ProjectionInvalidation()
        withObservationTracking {
            XCTAssertTrue(remote.attentionRunSummaries.isEmpty)
            XCTAssertEqual(remote.navigationCountState["runningChatCount"], .number(1))
        } onChange: { invalidated.mark() }
        value["runs"] = .array([.object(["id": .string("stream"), "status": .string("running"), "progress": .object(["tick": .number(1)]), "updatedAt": .string("2026-11-03T01:00:00Z")])])
        remote.updateState(.object(value))
        XCTAssertFalse(invalidated.changed)
        value["attentionCount"] = .number(1)
        value["runs"] = .array([.object(["id": .string("stream"), "status": .string("awaiting_input"), "title": .string("Live question"), "updatedAt": .string("2026-11-03T01:01:00Z")])])
        remote.updateState(.object(value))
        XCTAssertTrue(invalidated.changed)
        XCTAssertEqual(remote.attentionRunSummaries.first?["title"], .string("Live question"))
        XCTAssertEqual(remote.attentionRunSummaries.first?["updatedAt"], .string("2026-11-03T01:01:00Z"))
    }
    func testOrderingKeepsOwnerIdentityDocumentAliasesAndUnknownDescriptors() {
        let browser: JSON = .object(["id": .string("owner-browser"), "type": .string("browser"), "extension": .null])
        let document: JSON = .object(["id": .string("document:note"), "documentId": .string("note"), "type": .string("document")])
        let unknown: JSON = .object(["id": .string("terminal"), "type": .string("terminal"), "permission": .string("retained")])
        XCTAssertEqual(NativeContentTabProjection.ordered([browser, unknown, document], order: ["note", "local-browser", "missing"], browserAliases: ["local-browser": "owner-browser"]), [document, browser, unknown])
        XCTAssertEqual(NativeContentTabProjection.ordered([browser, unknown, document], order: ["owner-browser", "owner-browser"], browserAliases: [:]), [browser, browser, unknown, document])
    }
    @MainActor func testLargeTabOrderingMatchesFormerProjectionAndMeasuresScaling() {
        let store = SharedAppStore(), scope = "synthetic-projection"
        store.browserTabs = (0..<200).map { BrowserDescriptor(id: "local-\($0)", title: "Synthetic page", url: "https://example.test/\($0)", scope: scope, contentTabId: "owner-\($0)") }
        defer { store.unloadBrowsers() }
        let all: [JSON] = (0..<200).map { .object(["id": .string("owner-\($0)"), "type": .string("browser")]) }
        let order = (0..<200).reversed().map { "local-\($0)" }
        let aliases = Dictionary(uniqueKeysWithValues: store.browserTabs.map { ($0.id, $0.contentTabId!) })
        var referenceTime = 0.0, indexedTime = 0.0
        for _ in 0..<3 {
            var start = ProcessInfo.processInfo.systemUptime
            let reference = order.compactMap { id in all.first { tab in tab["id"].string == id || tab["documentId"].string == id || store.tabs(in: scope).contains(where: { $0.id == id && ($0.contentTabId ?? $0.id) == tab["id"].string }) } } + all.filter { tab in !order.contains(tab["id"].string) && !order.contains(tab["documentId"].string) && !store.tabs(in: scope).contains(where: { browser in order.contains(browser.id) && (browser.contentTabId ?? browser.id) == tab["id"].string }) }
            referenceTime += (ProcessInfo.processInfo.systemUptime - start) * 1000
            start = ProcessInfo.processInfo.systemUptime
            let current = NativeContentTabProjection.ordered(all, order: order, browserAliases: aliases)
            indexedTime += (ProcessInfo.processInfo.systemUptime - start) * 1000
            XCTAssertEqual(current, reference)
            XCTAssertEqual(current.count, 200)
        }
        print("NOV3_TAB_ORDER tabs=200 legacy_mean_ms=\(referenceTime / 3) indexed_mean_ms=\(indexedTime / 3)")
    }
    @MainActor func testTimestampFormattingMatchesExistingLocaleAndResetsForTimeZone() throws {
        let fractional = ISO8601DateFormatter(); fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        for zone in ["UTC", "America/Los_Angeles", "UTC"] {
            let timeZone = try XCTUnwrap(TimeZone(identifier: zone))
            let formatter = DateFormatter(); formatter.dateStyle = .short; formatter.timeStyle = .short; formatter.timeZone = timeZone
            for raw in ["2026-11-03T00:30:00Z", "2026-11-03T00:30:00.123Z", "invalid", ""] {
                let run: JSON = .object(["createdAt": .string(raw)])
                let expected = (fractional.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)).map(formatter.string(from:)) ?? ""
                XCTAssertEqual(NativeChatTimestamp.text(run, timeZone: timeZone), expected)
                XCTAssertEqual(NativeChatTimestamp.text(run, timeZone: timeZone), expected)
            }
        }
    }
}

private final class ProjectionInvalidation: @unchecked Sendable {
    private let lock = NSLock()
    private var value = false
    var changed: Bool { lock.lock(); defer { lock.unlock() }; return value }
    func mark() { lock.lock(); value = true; lock.unlock() }
}

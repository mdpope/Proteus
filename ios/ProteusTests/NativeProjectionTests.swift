import XCTest
import Observation
import Combine
@testable import Proteus

final class NativeProjectionTests: XCTestCase {
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

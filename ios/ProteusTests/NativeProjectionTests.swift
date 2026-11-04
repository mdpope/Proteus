import XCTest
@testable import Proteus

final class NativeProjectionTests: XCTestCase {
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

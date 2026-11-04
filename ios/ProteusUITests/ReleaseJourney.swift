import XCTest

@MainActor enum NativeReleaseJourney {
    static func run(bundle: String) async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4439/pair")!)
        let fixture = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let ids = try XCTUnwrap(fixture["chatIds"] as? [String])
        let project = try XCTUnwrap(fixture["projectId"] as? String)
        let app = XCUIApplication(bundleIdentifier: bundle); app.launch()
        func drawer() throws {
            let button = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: \.isHittable)
            try XCTUnwrap(button).tap()
        }
        func step(_ name: String, _ action: () throws -> Void) rethrows {
            let start = ProcessInfo.processInfo.systemUptime
            try action()
            print("JOURNEY arm=\(bundle) step=\(name) ms=\((ProcessInfo.processInfo.systemUptime-start)*1000)")
        }
        if app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch.waitForExistence(timeout: 5) {
            submitPairing(app, code: try XCTUnwrap(fixture["code"] as? String))
            XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 40), "Pairing must finish before the process is terminated")
        }
        // Pairing is preparation, outside cold process-start timing. Cached data
        // and the owner's negotiated old/new cadence are preserved in each arm.
        app.terminate()
        step("cold-to-interactive") { app.launch(); XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 30)) }
        try step("open-large-project") {
            try drawer()
            let workspace = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier ENDSWITH %@", "workspace-tree-open-", ":" + (try XCTUnwrap(fixture["workspaceId"] as? String)))).firstMatch
            XCTAssertTrue(workspace.waitForExistence(timeout: 20)); workspace.tap()
            let row = app.buttons["project-open-" + project]
            XCTAssertTrue(row.waitForExistence(timeout: 30)); row.tap()
            XCTAssertTrue(app.buttons["project-pinned-tab"].waitForExistence(timeout: 30))
        }
        for index in [1,2,0] {
            step("switch-chat-\(index)") {
                let tab = app.buttons["workspace-child-tab-chat:" + ids[index]]
                XCTAssertTrue(tab.waitForExistence(timeout: 30)); tab.tap()
                XCTAssertTrue(app.buttons["chat-mode-conversation"].waitForExistence(timeout: 30))
            }
        }
        step("scroll-rich-chat") {
            let scroll = app.scrollViews["chat-conversation-scroll"]
            XCTAssertTrue(scroll.waitForExistence(timeout: 20)); scroll.swipeDown(); scroll.swipeUp()
        }
        step("type-210-characters") {
            let preview = app.buttons["composer-preview"]
            XCTAssertTrue(preview.waitForExistence(timeout: 20)); preview.tap()
            let field = app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch
            XCTAssertTrue(field.waitForExistence(timeout: 20)); field.tap()
            let previous = field.value as? String ?? "", text = String(repeating: "123456 ", count: 30)
            field.typeText(text)
            XCTAssertEqual(field.value as? String, previous + text)
        }
        app.scrollViews["chat-conversation-scroll"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
        step("tabs-list") {
            app.buttons["project-pinned-tab"].tap()
            app.segmentedControls.buttons["Tabs"].tap()
            XCTAssertTrue(app.textFields["workspace-tabs-filter"].waitForExistence(timeout: 15))
        }
        step("browser-and-return") {
            let tab = app.buttons["workspace-managed-title-journey-browser-0"]
            XCTAssertTrue(tab.waitForExistence(timeout: 20)); tab.tap()
            XCTAssertTrue(app.webViews.staticTexts["Example Domain"].waitForExistence(timeout: 30))
            app.buttons["workspace-child-tab-chat:" + ids[0]].tap()
            XCTAssertTrue(app.buttons["chat-mode-conversation"].waitForExistence(timeout: 20))
        }
        app.terminate()
    }
}

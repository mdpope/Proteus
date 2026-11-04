import XCTest

@MainActor enum NativeReleaseJourney {
    static func inspectBrowser() async throws {
        guard ProcessInfo.processInfo.environment["PROTEUS_RELEASE_JOURNEY"] == "1" else { throw XCTSkip("Explicit benchmark inspection only") }
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4439/pair")!)
        let fixture = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let app = XCUIApplication(bundleIdentifier: "org.proteusapp.proteus.journey-baseline"); app.activate()
        app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: \.isHittable)?.tap()
        let workspace = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier ENDSWITH %@", "workspace-tree-open-", ":" + (try XCTUnwrap(fixture["workspaceId"] as? String)))).firstMatch
        XCTAssertTrue(workspace.waitForExistence(timeout: 15)); workspace.tap()
        if !app.buttons["project-pinned-tab"].waitForExistence(timeout: 3) { app.buttons["project-open-" + (try XCTUnwrap(fixture["projectId"] as? String))].tap() }
        app.buttons["project-pinned-tab"].tap(); app.segmentedControls.buttons["Tabs"].tap()
        let row = app.buttons["workspace-managed-title-journey-browser-0"]
        XCTAssertTrue(row.waitForExistence(timeout: 15)); row.tap()
        if app.buttons["Load tab"].waitForExistence(timeout: 2) { app.buttons["Load tab"].tap() }
        try await Task.sleep(for: .seconds(3))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Synthetic browser immediately after selection"; shot.lifetime = .keepAlways; XCTContext.runActivity(named: "Browser inspection") { $0.add(shot) }
        print("BROWSER_PROBE " + app.debugDescription)
    }
    static func run(bundle requestedBundle: String) async throws {
        let bundle = ProcessInfo.processInfo.environment["PROTEUS_JOURNEY_BUNDLE"] ?? requestedBundle
        guard ProcessInfo.processInfo.environment["PROTEUS_RELEASE_JOURNEY"] == "1" else { throw XCTSkip("Requires separately installed simulator Release benchmark identities and synthetic owner.") }
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4439/pair")!)
        let fixture = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let ids = try XCTUnwrap(fixture["chatIds"] as? [String])
        let project = try XCTUnwrap(fixture["projectId"] as? String)
        let app = XCUIApplication(bundleIdentifier: bundle)
        defer { app.terminate() }
        app.launch()
        if ProcessInfo.processInfo.environment["PROTEUS_JOURNEY_PAIRED"] == "1" {
            // Both retained benchmark apps restore General's long chat. The
            // observed pinned General control is at this fixed phone coordinate.
            // Prepare project Home before timing, avoiding a global AX traversal
            // of the baseline's restored transcript merely to locate that control.
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.19, dy: 0.095)).tap()
        }
        func drawer() throws {
            let button = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: \.isHittable)
            try XCTUnwrap(button).tap()
        }
        func step(_ name: String, _ action: () throws -> Void) rethrows {
            let start = ProcessInfo.processInfo.systemUptime
            try action()
            print("JOURNEY arm=\(bundle) step=\(name) ms=\((ProcessInfo.processInfo.systemUptime-start)*1000)")
        }
        if ProcessInfo.processInfo.environment["PROTEUS_JOURNEY_PAIRED"] != "1", app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch.waitForExistence(timeout: 5) {
            submitPairing(app, code: try XCTUnwrap(fixture["code"] as? String))
            XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 40), "Pairing must finish before the process is terminated")
        }
        // Pairing is preparation, outside cold process-start timing. Cached data
        // and the owner's negotiated old/new cadence are preserved in each arm.
        app.terminate()
        step("cold-to-interactive") { app.launch(); XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 30)) }
        try step("open-chats-catalog") {
            try drawer(); app.buttons["phone-nav-Chats"].tap()
            XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier ENDSWITH %@", "chat-row-", ":" + ids[0])).firstMatch.waitForExistence(timeout: 20))
        }
        try step("open-large-project") {
            try drawer()
            let workspace = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier ENDSWITH %@", "workspace-tree-open-", ":" + (try XCTUnwrap(fixture["workspaceId"] as? String)))).firstMatch
            XCTAssertTrue(workspace.waitForExistence(timeout: 20)); workspace.tap()
            let row = app.buttons["project-open-" + project]
            if !app.buttons["project-pinned-tab"].waitForExistence(timeout: 3) {
                XCTAssertTrue(row.waitForExistence(timeout: 30)); row.tap()
            }
            XCTAssertTrue(app.buttons["project-pinned-tab"].waitForExistence(timeout: 30))
            app.buttons["project-pinned-tab"].tap()
        }
        var returnPoint: CGVector?
        for index in [1,2,0] {
            step("switch-chat-\(index)") {
                let tab = app.buttons["workspace-child-tab-chat:" + ids[index]]
                XCTAssertTrue(tab.waitForExistence(timeout: 30))
                if index == 0 { returnPoint = CGVector(dx: tab.frame.midX / app.frame.width, dy: tab.frame.midY / app.frame.height) }
                tab.tap()
                XCTAssertTrue(app.buttons["chat-mode-conversation"].waitForExistence(timeout: 30))
            }
        }
        step("scroll-rich-chat") {
            // The observed conversation occupies this phone viewport in both
            // arms. Avoid a global accessibility snapshot just to obtain a
            // UIScrollView handle; that snapshot stalls on the old rich tree.
            let upper = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
            let lower = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
            upper.press(forDuration: 0.05, thenDragTo: lower)
            lower.press(forDuration: 0.05, thenDragTo: upper)
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
        try step("browser-and-return") {
            let tab = app.buttons["workspace-managed-title-journey-browser-0"]
            XCTAssertTrue(tab.waitForExistence(timeout: 20)); tab.tap()
            if app.buttons["Load tab"].waitForExistence(timeout: 2) { app.buttons["Load tab"].tap() }
            XCTAssertTrue(app.webViews.links["Learn more"].waitForExistence(timeout: 30))
            // Reuse the observed strip coordinate: the old app's global AX
            // search traverses thousands of rich rows when returning here.
            app.coordinate(withNormalizedOffset: try XCTUnwrap(returnPoint)).tap()
            let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Journey return content"; screenshot.lifetime = .keepAlways
            XCTContext.runActivity(named: "Return content visual evidence") { $0.add(screenshot) }
        }
        print("JOURNEY arm=\(bundle) finished")
        // Give the external recorder time to stop gracefully while its exact
        // target process still exists. This wait is outside all timed steps.
        try await Task.sleep(for: .seconds(8))
    }
}

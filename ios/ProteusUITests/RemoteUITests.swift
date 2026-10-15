import XCTest

final class RemoteUITests: XCTestCase {
    @MainActor func testLogPaginationAndExpandedDiagnostics() async throws {
        let (seedData, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/logs-fixture")!)
        let seed = try JSONSerialization.jsonObject(with: seedData) as! [String: Any]
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String)); app.buttons["pair-mac"].tap()
        let engine = app.buttons["sidebar-Engine Room"]
        if engine.waitForExistence(timeout: 4) { engine.tap() }
        else if app.tabBars.buttons["Engine Room"].exists { app.tabBars.buttons["Engine Room"].tap() }
        else { app.buttons["Engine Room"].firstMatch.tap() }
        XCTAssertTrue(app.scrollViews["engine-sections"].waitForExistence(timeout: 10))
        for _ in 0..<4 {
            // The accessibility scroll frame includes the navigation-bar inset;
            // gesture in its visible button strip rather than over that bar.
            let y = app.scrollViews["engine-sections"].frame.maxY - 20
            let origin = app.coordinate(withNormalizedOffset: .zero)
            origin.withOffset(CGVector(dx: app.frame.width * 0.85, dy: y)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: app.frame.width * 0.15, dy: y)))
        }
        let logs = app.buttons["Logs"].firstMatch
        XCTAssertTrue(logs.waitForExistence(timeout: 10)); logs.tap()
        XCTAssertTrue(app.staticTexts["Rehearsal diagnostic 119"].waitForExistence(timeout: 15))
        let identifier = try XCTUnwrap(seed["newestId"] as? String)
        XCTAssertFalse(app.scrollViews["log-expand-" + identifier].exists)
        let expand = app.buttons["log-expand-" + identifier]
        XCTAssertTrue(expand.waitForExistence(timeout: 10)); expand.tap()
        XCTAssertTrue(app.scrollViews["log-expand-" + identifier].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "synthetic-frame")).firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "SYNTHETIC_HIDDEN")).firstMatch.exists)
        expand.tap();app.buttons["logs-older"].tap()
        XCTAssertTrue(app.staticTexts["Rehearsal diagnostic 69"].waitForExistence(timeout: 10))
        app.buttons["logs-newer"].tap();XCTAssertTrue(app.staticTexts["Rehearsal diagnostic 119"].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Rehearsal native paginated logs"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
    @MainActor private func revealConversationElement(_ element: XCUIElement, in app: XCUIApplication) {
        let scroll = app.scrollViews["chat-conversation-scroll"]
        for _ in 0..<8 {
            let composer = app.buttons["composer-preview"].exists ? app.buttons["composer-preview"] : app.textFields["reply-text"]
            let bottom = composer.exists ? composer.frame.minY : app.frame.maxY - 80
            if element.exists, element.frame.midY > scroll.frame.minY + 15, element.frame.midY < bottom - 15 { return }
            let x = scroll.frame.midX, start = max(scroll.frame.minY + 70, min(bottom - 30, scroll.frame.minY + 260))
            let origin = app.coordinate(withNormalizedOffset: .zero)
            origin.withOffset(CGVector(dx: x, dy: start)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: x, dy: scroll.frame.minY + 35)))
        }
    }
    @MainActor private func openDefaultTeamBrowser(_ app: XCUIApplication) {
        let menu = app.buttons["team-new-browser-tab"]
        XCTAssertTrue(menu.waitForExistence(timeout: 10)); menu.tap()
        let choices = app.buttons.matching(NSPredicate(format: "label == %@", "Browser - Default"))
        for _ in 0..<40 {
            if let choice = choices.allElementsBoundByIndex.first(where: { $0.isHittable }) {
                choice.tap(); XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 10)); return
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        XCTFail("The default browser profile menu did not become interactive")
    }
    @MainActor func testWorkspaceListCopyOpensIndependentConfiguration() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        if app.buttons["sidebar-Home"].waitForExistence(timeout: 3) { app.buttons["sidebar-Home"].tap() }
        else if app.tabBars.buttons["Home"].exists { app.tabBars.buttons["Home"].tap() }
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String)); app.buttons["pair-mac"].tap()
        let workspaceNav = app.buttons["sidebar-Workspaces"]
        if workspaceNav.waitForExistence(timeout: 5) { workspaceNav.tap() }
        else { let link = app.buttons["Workspaces"].firstMatch; for _ in 0..<5 where !link.isHittable { app.swipeUp() }; XCTAssertTrue(link.waitForExistence(timeout: 20)); link.tap() }
        let copy = app.buttons["Copy Default workspace"]; XCTAssertTrue(copy.waitForExistence(timeout: 20)); copy.tap()
        let name = app.textFields["Workspace name"]; XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText(" review")
        app.buttons["Copy"].tap()
        XCTAssertTrue(app.buttons["workspace-pinned-tab"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["Workspace sources"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Sources across workspace"].exists)
        XCTAssertTrue(app.buttons["Workspace folders"].waitForExistence(timeout: 10)); app.buttons["Workspace folders"].tap()
        XCTAssertTrue(app.staticTexts["Commands start here. Other workspace folders remain available."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Command folder"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Workspace copy configuration"; shot.lifetime = .keepAlways; add(shot)
        app.segmentedControls.buttons["Chats"].tap()
        XCTAssertTrue(app.buttons["New workspace tab"].exists)
        app.buttons["New workspace tab"].tap()
        let newChat = app.buttons["workspace-new-chat"]
        XCTAssertTrue(newChat.waitForExistence(timeout: 5))
        let search = app.buttons["workspace-new-search"]
        XCTAssertTrue(search.exists)
        XCTAssertLessThan(newChat.frame.minY, search.frame.minY)
        let menuShot = XCTAttachment(screenshot: app.screenshot()); menuShot.name = "Workspace new tab menu"; menuShot.lifetime = .keepAlways; add(menuShot)
        newChat.tap()
        XCTAssertTrue(app.textFields["new-chat-name"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Run on Build Mac"].exists)
        app.buttons["Cancel"].tap()
        if app.buttons["new-main-browser-tab"].exists {
            app.buttons["new-main-browser-tab"].tap()
            let mainChat = app.buttons.matching(NSPredicate(format: "label == %@ AND identifier != %@", "New chat", "new-chat")).firstMatch
            XCTAssertTrue(mainChat.waitForExistence(timeout: 5)); mainChat.tap()
            XCTAssertTrue(app.textFields["new-chat-name"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.staticTexts["Run on Build Mac"].exists)
        }
    }

    @MainActor func testPhotoPickerOpensFromChatMenuAndCancelPreservesDraft() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat"]; app.launch()
        if app.buttons["sidebar-Chats"].waitForExistence(timeout: 3) { app.buttons["sidebar-Chats"].tap() } else { app.tabBars.buttons["Chats"].tap() }
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap(); app.buttons["chat-conversation-tab"].tap()
        app.buttons["composer-preview"].tap(); let text = app.textFields["reply-text"]; text.tap(); text.typeText("Photo draft stays")
        for _ in 0..<2 {
            app.buttons["chat-attach"].tap(); XCTAssertTrue(app.buttons["Choose photos"].waitForExistence(timeout: 5)); app.buttons["Choose photos"].tap()
            XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 12), "PhotosUI must open independently of the dismissed menu")
            app.buttons["Cancel"].tap(); XCTAssertEqual(text.value as? String, "Photo draft stays")
        }
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Photo picker cancel preserves draft"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testAutomaticLocalPreviewRevisionsResetScriptsAndSurviveRestart() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair?preview=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        if app.buttons["sidebar-Home"].waitForExistence(timeout: 3) { app.buttons["sidebar-Home"].tap() } else if app.buttons["Home"].exists { app.buttons["Home"].tap() }
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String); app.buttons["pair-mac"].tap()
        showChats(app); _ = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/preview-grant")!)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Automatic preview rehearsal")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20)); row.tap()
        let mainChat = app.buttons["shell-tab-" + (fixture["hostId"] as! String) + ":" + (fixture["runId"] as! String)]
        if mainChat.exists { mainChat.tap() }
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 15))
        let tab = app.buttons["Relay design fixture"]; XCTAssertTrue(tab.waitForExistence(timeout: 25)); tab.tap()
        XCTAssertTrue(app.buttons["Enable interactive preview"].waitForExistence(timeout: 15)); app.buttons["Enable interactive preview"].tap()
        XCTAssertTrue(app.webViews.buttons["Change sample"].waitForExistence(timeout: 15)); app.webViews.buttons["Change sample"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Changed version 1"].waitForExistence(timeout: 15))
        _ = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/design-update")!)
        XCTAssertTrue(app.webViews.staticTexts["Version 2"].waitForExistence(timeout: 20)); XCTAssertTrue(app.buttons["Enable interactive preview"].exists)
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "label == %@", "Relay design fixture")).count, 1)
        app.terminate(); app.launchArguments = []; app.launch(); showChats(app); XCTAssertTrue(row.waitForExistence(timeout: 20)); row.tap(); XCTAssertTrue(tab.waitForExistence(timeout: 25)); tab.tap()
        XCTAssertTrue(app.webViews.staticTexts["Version 2"].waitForExistence(timeout: 20)); XCTAssertTrue(app.buttons["Enable interactive preview"].exists)
    }
    @MainActor func testTypingDoesNotTraverseLongChatHistory() throws {
        for (fixture, title, eventCount) in [("--synthetic-long-chat", "Long fixture", 1), ("--synthetic-many-chat", "Many fixture", 100)] {
            let app = XCUIApplication()
            app.launchArguments = ["--reset-pairing", "--synthetic-destinations", fixture, "--typing-diagnostics"]
            app.launch()
            if app.buttons["sidebar-Chats"].waitForExistence(timeout: 3) { app.buttons["sidebar-Chats"].tap() }
            else { app.tabBars.buttons["Chats"].tap() }
            let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
            XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap()
            // A prior browser test may have persisted this chat's selected child tab.
            XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 15))
            app.buttons["chat-conversation-tab"].tap()
            XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 30)); app.buttons["composer-preview"].tap()
            let field = app.textFields["reply-text"]
            XCTAssertTrue(field.waitForExistence(timeout: 15)); field.tap()
            let diagnostics = app.buttons["typing-diagnostics"]
            func sample() throws -> [Int] {
                diagnostics.tap()
                return try XCTUnwrap(diagnostics.value as? String).split(separator: ",").compactMap { Int($0) }
            }
            let before = try sample(); XCTAssertEqual(before.count, 2)
            let text = String(repeating: "typing ", count: 30)
            field.tap()
            let start = Date(); field.typeText(text)
            XCTAssertEqual(field.value as? String, text, "Long-history input must retain every character")
            let elapsed = Date().timeIntervalSince(start)
            let after = try sample(); XCTAssertEqual(after.count, 2)
            let passes = after[0] - before[0], inspected = after[1] - before[1]
            XCTAssertLessThan(passes, 20, "Layout/focus can update history; text edits must not cause a history pass per character")
            XCTAssertEqual(inspected, passes * eventCount)
            let report = XCTAttachment(string: "Synthetic \(eventCount)-event chat; \(text.count) characters in \(elapsed)s via XCTest; history passes: \(passes); inspected events: \(inspected). XCTest time includes keyboard automation overhead.")
            report.name = "Typing work for \(title)"; report.lifetime = .keepAlways; add(report)
            if app.buttons["chat-back"].exists { app.buttons["chat-back"].tap() }
            else { app.buttons["sidebar-Chats"].tap() }
            row.tap()
            if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
            XCTAssertEqual(app.textFields["reply-text"].value as? String, text)
            XCUIDevice.shared.press(.home); app.activate()
            if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
            XCTAssertEqual(app.textFields["reply-text"].value as? String, text)
            let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Typing in \(eventCount)-event chat"; shot.lifetime = .keepAlways; add(shot)
            app.terminate()
        }
    }

    override func setUp() { super.setUp(); continueAfterFailure = false }
    @MainActor func testGreenDesignPreviewAndChatsListStability() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-browser-workspace", "--synthetic-life"]
        app.launch()
        let sidebar = app.buttons["sidebar-Chats"]
        let tablet = sidebar.waitForExistence(timeout: 4)
        let chats = tablet ? sidebar : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10)); row.tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 10))
        if app.buttons["chat-conversation-tab"].exists { app.buttons["chat-conversation-tab"].tap() }
        XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 10))
        let rendered = app.webViews.staticTexts.firstMatch
        XCTAssertTrue(rendered.waitForExistence(timeout: 15))
        app.buttons["Find in chat"].tap()
        let find = app.textFields["page-find-input"]
        XCTAssertTrue(find.waitForExistence(timeout: 5)); find.tap(); find.typeText("Line 17")
        let matches = app.staticTexts["page-find-count"]
        expectation(for: NSPredicate(format: "label == %@", "1 of 11"), evaluatedWith: matches); waitForExpectations(timeout: 10)
        app.buttons["Next match"].tap(); XCTAssertEqual(matches.label, "2 of 11")
        app.buttons["Previous match"].tap(); XCTAssertEqual(matches.label, "1 of 11")
        let findShot = XCTAttachment(screenshot: app.screenshot()); findShot.name = "Find in chat"; findShot.lifetime = .keepAlways; add(findShot)
        app.buttons["Close find"].tap()
        let chatShot = XCTAttachment(screenshot: app.screenshot()); chatShot.name = "Green design · chat"; chatShot.lifetime = .keepAlways; add(chatShot)
        if tablet {
            sidebar.tap()
            XCTAssertTrue(app.buttons["new-chat"].waitForExistence(timeout: 8))
            XCTAssertFalse(app.buttons["chat-conversation-tab"].exists)
            sidebar.tap()
            XCTAssertTrue(app.buttons["new-chat"].exists)
        }
        for name in ["Life", "Team", "Engine Room"] {
            let control = tablet ? app.buttons["sidebar-" + name] : app.tabBars.buttons[name]
            if control.waitForExistence(timeout: 5) { control.tap() }
            let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Green design · " + name; shot.lifetime = .keepAlways; add(shot)
        }
    }
    @MainActor func testDesktopOriginChatBrowserTabsStayStable() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-desktop-browser-tabs"]
        app.launch()
        let chats = UIDevice.current.userInterfaceIdiom == .pad ? app.buttons["sidebar-Chats"] : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap()
        let first = app.buttons["chat-browser-tab-desktop-fixture-0"]
        let second = app.buttons["chat-browser-tab-desktop-fixture-1"]
        XCTAssertTrue(first.waitForExistence(timeout: 10)); first.tap()
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap()
        address.press(forDuration: 1.2)
        if app.menuItems["Select All"].waitForExistence(timeout: 2) { app.menuItems["Select All"].tap() }
        else { address.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (address.value as? String ?? "").count)) }
        address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "label == %@", "First browser page"), evaluatedWith: first); waitForExpectations(timeout: 8)
        let load = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Load ")).firstMatch
        let before = load.label
        for _ in 0..<3 {
            app.buttons["replay-desktop-tabs"].tap()
            XCTAssertEqual(first.label, "First browser page")
            XCTAssertEqual(first.value as? String, "Active")
            second.tap(); XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 12))
            first.tap(); XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 12))
            XCTAssertEqual(load.label, before, "Switching and sync must retain the loaded page rather than reload it")
        }
        app.webViews.links["Next browser page"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 12))
        expectation(for: NSPredicate(format: "label == %@", "Second browser page"), evaluatedWith: first); waitForExpectations(timeout: 8)
        app.buttons["replay-desktop-tabs"].tap(); XCTAssertEqual(first.label, "Second browser page")
        app.buttons["browser-back"].tap(); XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 12))
        app.buttons["browser-forward"].tap(); XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 12))
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(first.waitForExistence(timeout: 10)); XCTAssertEqual(first.label, "Second browser page")
        XCTAssertEqual(first.value as? String, "Active")
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "chat-browser-tab-desktop-fixture-")).count, 2)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Stable desktop-origin chat tabs"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testIPadSidebarHeadingAndNewTabsReveal() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-browser-workspace"]; app.launch()
        let home = app.buttons["sidebar-Home"]
        XCTAssertTrue(home.waitForExistence(timeout: 12)); home.tap()
        XCTAssertEqual(home.value as? String, "Active")
        let heading = app.staticTexts["home-page-heading"]
        XCTAssertTrue(heading.waitForExistence(timeout: 8))
        let plus = app.buttons["new-main-browser-tab"]
        XCTAssertGreaterThan(heading.frame.minY, plus.frame.maxY)
        XCTAssertLessThan(heading.frame.minY - plus.frame.maxY, 35, "Home must not reserve an empty navigation/back-button row")
        XCTAssertGreaterThan(heading.frame.minX, home.frame.maxX + 15, "Home heading has a normal inset from the content edge")
        let homeShot = XCTAttachment(screenshot: app.screenshot()); homeShot.name = "iPad Home inset and selected sidebar"; homeShot.lifetime = .keepAlways; add(homeShot)
        for _ in 0..<12 {
            plus.tap(); app.buttons["Browser - Default"].firstMatch.tap()
            let active = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND value == %@", "shell-tab-", "Active")).firstMatch
            XCTAssertTrue(active.waitForExistence(timeout: 5)); XCTAssertTrue(active.isHittable, "New main tab scrolls into view")
        }
        app.buttons["sidebar-Chats"].tap(); XCTAssertEqual(app.buttons["sidebar-Chats"].value as? String, "Active")
        XCTAssertEqual(home.value as? String, "Inactive")
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertEqual(app.buttons["sidebar-Chats"].value as? String, "Active", "A selected chat still highlights Chats")
        for _ in 0..<10 {
            app.buttons["Add chat tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
            let child = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND value == %@", "chat-browser-tab-", "Active")).firstMatch
            XCTAssertTrue(child.waitForExistence(timeout: 5)); XCTAssertTrue(child.isHittable, "New child tab scrolls into view")
        }
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "New chat browser tab revealed"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testHomeProjectGuidePopup() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
        let link = app.buttons["home-project-guide"]
        XCTAssertTrue(link.waitForExistence(timeout: 15))
        let heading = app.staticTexts["home-page-heading"]
        if heading.exists {
            let intro = app.descendants(matching: .any)["home-intro-title"].firstMatch
            XCTAssertLessThan(intro.frame.minY - heading.frame.maxY, 65, "No reserved navigation gap between the heading and Home content")
            XCTAssertEqual(app.buttons["sidebar-Home"].value as? String, "Active")
            let home = XCTAttachment(screenshot: app.screenshot()); home.name = "Final iPad Home spacing"; home.lifetime = .keepAlways; add(home)
        }
        link.tap()
        XCTAssertTrue(app.buttons["home-project-guide-done"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Omi, Life and Apple builds"].exists, "The popup includes the same expanded project guide as desktop/web")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Home project guide popup"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["home-project-guide-done"].tap()
        XCTAssertTrue(link.waitForExistence(timeout: 5))
    }
    @MainActor func testSyntheticChatComposerShowsCompactActions() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat"]
        app.launch()
        let chats = app.buttons["Chats"].firstMatch
        XCTAssertTrue(chats.waitForExistence(timeout: 8)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        if app.buttons["chat-conversation-tab"].waitForExistence(timeout: 8) { app.buttons["chat-conversation-tab"].tap() }
        XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 8)); app.buttons["composer-preview"].tap()
        XCTAssertTrue(app.buttons["send-message"].waitForExistence(timeout: 8))
        if app.buttons["composer-preview"].waitForExistence(timeout: 3) { app.buttons["composer-preview"].tap() }
        XCTAssertTrue(app.buttons["composer-options"].waitForExistence(timeout: 10) || app.buttons["composer-model"].exists)
        XCTAssertTrue(app.buttons["chat-attach"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Native chat composer"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testGroupedActivityLeavesNoEmptyMessageGaps() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-activity-spacing"]
        app.launch()
        let chats = UIDevice.current.userInterfaceIdiom == .pad ? app.buttons["sidebar-Chats"] : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 8))
        app.buttons["chat-conversation-tab"].tap()
        let activity = app.descendants(matching: .any)["chat-event-0"].firstMatch
        let following = app.descendants(matching: .any)["chat-event-41"].firstMatch
        XCTAssertTrue(activity.waitForExistence(timeout: 8))
        XCTAssertTrue(following.waitForExistence(timeout: 8))
        XCTAssertFalse(app.otherElements["chat-event-1"].exists)
        XCTAssertFalse(app.otherElements["chat-event-40"].exists)
        XCTAssertEqual(following.frame.minY - activity.frame.maxY, 18, accuracy: 2)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Grouped activity without blank rows"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testActivityContainsSystemApprovalReferencesAndRecordedToolTiming() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-activity-details"]
        app.launch()
        let chats = UIDevice.current.userInterfaceIdiom == .pad ? app.buttons["sidebar-Chats"] : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 8)); app.buttons["chat-conversation-tab"].tap()
        let group = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Activity · 2 tools")).firstMatch
        XCTAssertTrue(group.waitForExistence(timeout: 8)); group.tap()
        let elapsed = app.staticTexts["tool-elapsed-native-rehearsal-read"]
        XCTAssertTrue(elapsed.waitForExistence(timeout: 8)); XCTAssertEqual(elapsed.label, "Elapsed 4.25s")
        XCTAssertTrue(app.staticTexts["tool-finished-native-rehearsal-read"].exists)
        XCTAssertFalse(app.descendants(matching: .any)["chat-event-2"].exists, "The system event belongs inside the existing Activity block")
        let system = app.staticTexts["Synthetic system note inside activity"]
        XCTAssertTrue(system.waitForExistence(timeout: 8))
        for _ in 0..<6 { if elapsed.isHittable { break }; app.swipeDown() }
        let timingShot = XCTAttachment(screenshot: app.screenshot()); timingShot.name = "Synthetic native per-tool timing and darker system entry"; timingShot.lifetime = .keepAlways; add(timingShot)
        let request = app.buttons["approval-request-native-rehearsal-read"]
        revealConversationElement(request, in: app)
        XCTAssertTrue(request.waitForExistence(timeout: 8)); request.tap()
        let originalRequest = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "synthetic-fixture.md")).firstMatch
        for _ in 0..<4 { if originalRequest.exists { break }; app.swipeUp() }
        XCTAssertTrue(originalRequest.waitForExistence(timeout: 8)); XCTAssertTrue(originalRequest.label.contains("native-rehearsal-read"))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Synthetic native activity details and contained approval"; shot.lifetime = .keepAlways; add(shot)
        let missing = app.staticTexts["tool-elapsed-native-rehearsal-missing"]
        revealConversationElement(missing, in: app)
        XCTAssertTrue(missing.waitForExistence(timeout: 8)); XCTAssertEqual(missing.label, "Elapsed unavailable")
        XCTAssertTrue(app.staticTexts["Completion time unavailable"].exists)
    }
    @MainActor func testTabletUsesOnlyTopChatActions() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat"]
        app.launch()
        let chats = UIDevice.current.userInterfaceIdiom == .pad ? app.buttons["sidebar-Chats"] : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.staticTexts["chat-header-title"].exists)
        XCTAssertFalse(app.buttons["chat-back"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "Chat actions").count, 1)
        app.buttons["Add chat tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.staticTexts["chat-header-title"].exists)
        XCTAssertFalse(app.buttons["chat-back"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "Chat actions").count, 1)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Tablet two tab rows"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testWorkspaceTabsKeepTypeIconsAndChatNavigation() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-workspace-tab-icons"]
        app.launch()
        let workspaces = app.buttons["sidebar-Workspaces"]
        if workspaces.waitForExistence(timeout: 5) { workspaces.tap() }
        else {
            let home = app.tabBars.buttons["Home"]; XCTAssertTrue(home.waitForExistence(timeout: 8)); home.tap()
            let link = app.buttons["Workspaces"].firstMatch
            for _ in 0..<5 { if link.exists && link.isHittable { break }; app.swipeUp() }
            XCTAssertTrue(link.waitForExistence(timeout: 8)); link.tap()
        }
        let workspace = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Native icon rehearsal")).firstMatch
        XCTAssertTrue(workspace.waitForExistence(timeout: 8)); workspace.tap()
        XCTAssertTrue(app.buttons["workspace-pinned-tab"].waitForExistence(timeout: 8))
        let chat = app.buttons["workspace-child-tab-chat:long-chat"]
        XCTAssertTrue(chat.waitForExistence(timeout: 8)); XCTAssertTrue(chat.images["native-tab-icon-bubble.left.and.bubble.right"].exists)
        XCTAssertTrue(app.buttons["workspace-child-tab-remote:fixture-terminal"].images["native-tab-icon-terminal"].exists)
        XCTAssertTrue(app.buttons["workspace-child-tab-remote:document:fixture-document"].images["native-tab-icon-doc.text"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Synthetic workspace tab type icons"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["Tabs"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Open tabs"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Synthetic terminal"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Synthetic document"].firstMatch.exists)
        app.buttons["workspace-managed-title-chat:long-chat"].tap()
        let selectedChat = app.buttons["workspace-child-tab-chat:long-chat"]
        let selectedExpectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", "Selected"), object: selectedChat)
        let selectionResult = XCTWaiter.wait(for: [selectedExpectation], timeout: 5)
        if selectionResult != .completed { print("Managed chat title state: " + app.debugDescription) }
        XCTAssertEqual(selectionResult, .completed, "The existing workspace chat must be selected")
        XCTAssertFalse(app.staticTexts["Open tabs"].exists, "Title selection must leave the tab manager for the existing content")
        XCTAssertTrue(selectedChat.isHittable); XCTAssertGreaterThanOrEqual(selectedChat.frame.minX, 0); XCTAssertLessThanOrEqual(selectedChat.frame.maxX, app.windows.firstMatch.frame.maxX)
        app.buttons["workspace-pinned-tab"].tap()
        app.segmentedControls["workspace-page-picker"].buttons["Chats"].tap()
        app.buttons["Synthetic browser"].firstMatch.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Local recent across scopes")).firstMatch.waitForExistence(timeout: 10), "A new workspace browsing home can show recorded default-profile sites from another local scope")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Offline · cached")).firstMatch.exists)
        chat.tap(); XCTAssertTrue(app.scrollViews["chat-conversation-scroll"].waitForExistence(timeout: 8))
    }
    @MainActor func testCompactHeaderStaysInChatWhenBrowserCloses() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat"]
        app.launch()
        let chats = UIDevice.current.userInterfaceIdiom == .pad ? app.buttons["sidebar-Chats"] : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(app.staticTexts["chat-header-title"].waitForExistence(timeout: 8))
        XCTAssertEqual(app.buttons["chat-back"].frame.height, 44, accuracy: 1)
        let conversationTab = app.buttons["chat-conversation-tab"]
        for _ in 0..<12 where !conversationTab.isHittable { app.scrollViews["chat-child-tab-strip"].swipeRight() }
        conversationTab.tap()
        XCTAssertTrue(app.buttons["composer-preview"].exists)
        app.buttons["composer-preview"].tap()
        let field = app.textFields["reply-text"]
        XCTAssertTrue(field.waitForExistence(timeout: 8)); field.tap(); field.typeText("Draft preserved")
        app.staticTexts["chat-header-title"].tap()
        app.swipeUp()
        XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 8))
        let startingCloseCount = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Close New tab")).count
        app.buttons["Add chat tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["chat-header-title"].exists)
        XCTAssertTrue(app.buttons["chat-actions"].exists)
        app.buttons["Add chat tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        let closeButtons = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Close New tab"))
        XCTAssertEqual(closeButtons.count, startingCloseCount + 2)
        let firstNewClose = closeButtons.element(boundBy: startingCloseCount)
        for _ in 0..<12 where !firstNewClose.isHittable { app.scrollViews["chat-child-tab-strip"].swipeLeft() }
        firstNewClose.tap()
        XCTAssertTrue(app.textFields["browser-address"].exists, "Closing an inactive sibling keeps the active browser in this chat")
        XCTAssertTrue(app.staticTexts["chat-header-title"].exists)
        closeButtons.element(boundBy: startingCloseCount).tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].exists)
        XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 8))
        app.buttons["composer-preview"].tap(); XCTAssertEqual(app.textFields["reply-text"].value as? String, "Draft preserved")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Compact header and restored draft"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testCompactAndExpandedStopCancelHostTurn() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app)
        for expanded in [false, true] {
            let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
            let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Stop synthetic host rehearsal")
            app.buttons["start-chat"].tap()
            let stop = app.buttons["stop-turn"]; XCTAssertTrue(stop.waitForExistence(timeout: 20))
            XCTAssertTrue(app.buttons["composer-preview"].exists)
            if expanded { app.buttons["composer-preview"].tap() }
            XCTAssertTrue(stop.isEnabled); XCTAssertGreaterThanOrEqual(stop.frame.height, 44)
            let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = expanded ? "Expanded composer with circular Stop" : "Compact composer with circular Stop"; shot.lifetime = .keepAlways; add(shot)
            stop.tap(); XCTAssertTrue(app.staticTexts["Cancelled"].waitForExistence(timeout: 15))
            XCTAssertFalse(stop.exists)
            app.buttons["chat-back"].tap()
        }
    }
    @MainActor func testTeamBrowsersUseOnePrimaryRowAndStandupActionStaysLocal() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        app.buttons["Team"].firstMatch.tap()
        XCTAssertTrue(app.buttons["team-section-overview"].waitForExistence(timeout: 10)); app.buttons["team-section-overview"].tap()
        XCTAssertFalse(app.buttons["Open standup"].exists)
        let primaryTabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-tab-select-"))
        let startingCount = primaryTabs.count
        app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 10))
        XCTAssertEqual(primaryTabs.count, startingCount + 1)
        XCTAssertFalse(app.buttons["browser-new-tab"].exists, "Team browsers must not add a nested tab strip")
        XCTAssertFalse(app.buttons["Open standup"].exists)
        app.buttons["team-section-standup"].tap(); XCTAssertTrue(app.buttons["Open standup"].waitForExistence(timeout: 8))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Flat Team primary tabs"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testNavigationCountsKeepPhoneTabsAndMatchTabletScopes() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-nav-counts"]
        app.launch()
        if app.tabBars.firstMatch.exists {
            let tabBar = app.tabBars.firstMatch
            for name in ["Home", "Chats", "Life", "Team", "Engine Room"] { XCTAssertTrue(tabBar.buttons[name].exists) }
            XCTAssertEqual(tabBar.buttons.count, 5, "Counts must not change the established iPhone navigation")
            XCTAssertTrue(app.staticTexts["Schedules · 2"].waitForExistence(timeout: 8))
            let attention = app.staticTexts["Needs attention · 9"]
            for _ in 0..<4 where !attention.exists { app.swipeUp() }
            XCTAssertTrue(attention.exists)
        } else {
            XCTAssertTrue(app.staticTexts["nav-count-Schedules"].waitForExistence(timeout: 8))
            XCTAssertEqual(app.staticTexts["nav-count-Schedules"].label, "2 schedules")
            XCTAssertEqual(app.staticTexts["nav-count-Chats"].label, "129 chats")
            XCTAssertEqual(app.staticTexts["nav-count-Needs Attention"].label, "9 needs attention")
        }
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Native navigation counts"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testHundredMessageChatRemainsResponsive() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-many-chat"]
        app.launch()
        guard app.tabBars.firstMatch.exists else { throw XCTSkip("Phone responsiveness fixture") }
        app.tabBars.buttons["Chats"].tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Many fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10)); row.tap()
        let scroll = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(scroll.waitForExistence(timeout: 20))
        scroll.swipeDown()
        XCTAssertTrue(app.buttons["send-message"].waitForExistence(timeout: 20), "The 100-message history window must remain interactive")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Native 100-message history"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testLargeHistoryStartsAtBottomAndLoadsOnUpwardScroll() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-heavy-chat", "--history-diagnostics"]
        app.launch(); showChats(app)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Heavy fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap()
        let window = app.staticTexts["history-window"]
        XCTAssertTrue(window.waitForExistence(timeout: 20))
        XCTAssertEqual(window.label, "988:12")
        let latest = app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Message 999")).firstMatch
        XCTAssertTrue(latest.waitForExistence(timeout: 20)); XCTAssertTrue(latest.isHittable)
        let renderers = app.buttons["history-renderers"]; renderers.tap()
        XCTAssertLessThanOrEqual(Int(renderers.value as? String ?? "") ?? 1000, 12, "Count actual Markdown renderer instances, not duplicated WebKit accessibility elements")
        let scroll = app.scrollViews["chat-conversation-scroll"]
        for _ in 0..<16 {
            if !window.label.hasPrefix("988:") { break }
            scroll.swipeDown()
        }
        XCTAssertFalse(window.label.hasPrefix("988:"), "Older messages must load automatically as the reader approaches the top")
        XCTAssertGreaterThanOrEqual(Int(window.label.split(separator: ":").first ?? "") ?? 0, 964, "One upward gesture must not drain the entire cached transcript")
        XCTAssertTrue(app.buttons["composer-preview"].exists)
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 10))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Progressive heavy history"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testVariableHeightHistoryCanPageRepeatedlyAndReturnToBottom() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-heavy-chat", "--synthetic-varied-chat", "--history-diagnostics"]
        app.launch(); showChats(app)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Heavy fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap()
        let window = app.staticTexts["history-window"], bottom = app.staticTexts["Turn complete"]
        XCTAssertTrue(window.waitForExistence(timeout: 20))
        let scroll = app.scrollViews["chat-conversation-scroll"]
        // Pan over actual Markdown content, as on the physical iPhone.
        for _ in 0..<60 {
            if (Int(window.label.split(separator: ":").first ?? "") ?? 1000) <= 964 { break }
            scroll.swipeDown()
        }
        XCTAssertLessThanOrEqual(Int(window.label.split(separator: ":").first ?? "") ?? 1000, 964, "Repeated gestures must keep loading older chunks")
        for _ in 0..<60 {
            if bottom.isHittable { break }
            scroll.swipeUp()
        }
        XCTAssertTrue(bottom.isHittable, "The reader must be able to reach the real end after loading older history")
        app.buttons["Chat details & loaded context"].tap()
        XCTAssertTrue(app.staticTexts["Input tokens"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["123,456"].exists); XCTAssertTrue(app.staticTexts["6,789"].exists)
        let usageShot = XCTAttachment(screenshot: app.screenshot()); usageShot.name = "Stacked dark runtime and token values"; usageShot.lifetime = .keepAlways; add(usageShot)
    }
    @MainActor func testCompactOptionsHaveSingleGreenExpander() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-heavy-chat"]; app.launch(); showChats(app)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Heavy fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap()
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        let options = app.buttons["composer-options"]
        if !options.waitForExistence(timeout: 5) { return } // Wide iPad uses the inline controls.
        options.tap()
        let section = app.buttons.matching(NSPredicate(format: "label == %@", "Model")).firstMatch
        XCTAssertTrue(section.waitForExistence(timeout: 5)); XCTAssertEqual(section.value as? String, "Collapsed")
        section.tap(); XCTAssertEqual(section.value as? String, "Expanded")
        XCTAssertTrue(app.buttons["composer-choice-Model-"].exists)
        section.tap(); XCTAssertEqual(section.value as? String, "Collapsed")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Single green expander"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testLongMessageKeepsIntraMessagePositionWhenReopenedOnPhone() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--show-scroll-fixture-controls"]
        app.launch()
        guard app.tabBars.firstMatch.exists else { throw XCTSkip("Phone navigation regression") }
        app.tabBars.buttons["Chats"].tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10)); row.tap()
        let composerShot = XCTAttachment(screenshot: app.screenshot()); composerShot.name = "Native chat composer"; composerShot.lifetime = .keepAlways; add(composerShot)
        let scroll = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(scroll.waitForExistence(timeout: 10))
        app.buttons["read-long-message-fixture"].tap()
        let readingAnchor = app.staticTexts["chat-scroll-anchor"]
        XCTAssertTrue(readingAnchor.waitForExistence(timeout: 5))
        let offset = app.staticTexts["chat-scroll-offset"]
        XCTAssertTrue(offset.waitForExistence(timeout: 5))
        for _ in 0..<30 {
            if (Int(readingAnchor.label.split(separator: ":").last ?? "") ?? 0) > 200 { break }
            Thread.sleep(forTimeInterval: 0.2)
        }
        let positioned = Int(offset.label) ?? 0
        scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45))
            .press(forDuration: 0.2, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65)))
        for _ in 0..<20 {
            if abs((Int(offset.label) ?? 0) - positioned) > 30 { break }
            Thread.sleep(forTimeInterval: 0.2)
        }
        XCTAssertGreaterThan(abs((Int(offset.label) ?? 0) - positioned), 30, "A real finger drag must change the native reading offset")
        let before = Int(offset.label) ?? 0
        let beforeAnchor = readingAnchor.label
        XCTAssertGreaterThan(before, 200, "The fixture must be scrolled well inside its one long message")
        XCTAssertTrue(readingAnchor.label.hasPrefix("0:"), "The reader must be anchored inside the long message, not following the bottom; offset \(before), trace \(app.staticTexts["chat-scroll-trace"].label)")
        XCTAssertGreaterThan(Int(beforeAnchor.replacingOccurrences(of: ",", with: "").split(separator: ":").last ?? "") ?? 0, 200, "The saved anchor must be deep inside the long message; offset \(before), anchor \(beforeAnchor), trace \(app.staticTexts["chat-scroll-trace"].label)")
        if app.buttons["chat-back"].exists { app.buttons["chat-back"].tap() } else { app.buttons["sidebar-Chats"].tap() }
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(offset.waitForExistence(timeout: 8))
        let restoredExpectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", String(before)), object: offset)
        _ = XCTWaiter.wait(for: [restoredExpectation], timeout: 10)
        let restored = Int(offset.label) ?? 0
        XCTAssertLessThanOrEqual(abs(restored - before), 35, "Reopening should keep the reading point within the long message; before \(before), before anchor \(beforeAnchor), after \(restored), anchor \(app.staticTexts["chat-scroll-anchor"].label), trace \(app.staticTexts["chat-scroll-trace"].label)")
    }
    @MainActor func testPrependingHistoryKeepsVisibleLongMessageAndInsetOnPhone() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--show-scroll-fixture-controls"]
        app.launch()
        guard app.tabBars.firstMatch.exists else { throw XCTSkip("Phone reading-position regression") }
        app.tabBars.buttons["Chats"].tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        let scroll = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(scroll.waitForExistence(timeout: 8))
        app.buttons["read-long-message-fixture"].tap()
        let anchor = app.staticTexts["chat-scroll-anchor"]
        XCTAssertTrue(anchor.waitForExistence(timeout: 5))
        for _ in 0..<30 {
            if (Int(anchor.label.split(separator: ":").last ?? "") ?? 0) > 200 { break }
            Thread.sleep(forTimeInterval: 0.2)
        }
        let nativeOffset = app.staticTexts["chat-scroll-offset"]
        let positioned = Int(nativeOffset.label) ?? 0
        scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45))
            .press(forDuration: 0.2, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65)))
        for _ in 0..<20 {
            if abs((Int(nativeOffset.label) ?? 0) - positioned) > 30 { break }
            Thread.sleep(forTimeInterval: 0.2)
        }
        XCTAssertGreaterThan(abs((Int(nativeOffset.label) ?? 0) - positioned), 30, "A real finger drag must change the native reading offset")
        let before = anchor.label.replacingOccurrences(of: ",", with: "").split(separator: ":").compactMap { Int($0) }
        XCTAssertEqual(before.count, 2, "Visible anchor label: \(anchor.label)")
        XCTAssertEqual(before.first, 0, "trace \(app.staticTexts["chat-scroll-trace"].label)")
        XCTAssertGreaterThan(before[1], 200)
        app.buttons["prepend-chat-fixture"].tap()
        let after = anchor.label.replacingOccurrences(of: ",", with: "").split(separator: ":").compactMap { Int($0) }
        XCTAssertEqual(after.first, 0, "The same absolute message must stay visible after prepending history")
        XCTAssertLessThanOrEqual(abs(after[1] - before[1]), 35, "The relative reading point within that message must remain stable")
    }
    @MainActor func testActualSimulatorLocalNotificationTapRoutesThroughSpringBoard() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls", "--synthetic-background-notification"]
        app.launch()
        let button = app.buttons["Schedule iOS notification fixture"]
        for _ in 0..<4 where !button.exists { app.swipeUp() }
        XCTAssertTrue(button.waitForExistence(timeout: 12))
        button.tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let permission = springboard.alerts.firstMatch
        let status = app.staticTexts["notification-fixture-status"]
        let deadline = Date().addingTimeInterval(15)
        // Handle first-run consent, but do not spend the delivery window waiting for
        // a permission alert when the preceding foreground test already allowed it.
        while Date() < deadline {
            if status.exists && status.label == "Scheduled" { break }
            if permission.exists && permission.buttons["Allow"].exists { permission.buttons["Allow"].tap() }
            Thread.sleep(forTimeInterval: 0.1)
        }
        guard status.exists && status.label == "Scheduled" else {
            XCTFail("The real notification must be scheduled before backgrounding: " + (status.exists ? status.label : "missing fixture status"))
            return
        }
        XCUIDevice.shared.press(.home)
        let banner = springboard.staticTexts["Proteus route fixture"]
        XCTAssertTrue(banner.waitForExistence(timeout: 25), "iOS must deliver a real local notification through SpringBoard")
        banner.tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15), "Tapping the OS notification should open the routed chat")
    }
    @MainActor func testInAppNotificationBannerRoutesWithoutOSPermission() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        if app.tabBars.buttons["Home"].exists { app.tabBars.buttons["Home"].tap() }
        else if app.buttons["sidebar-Home"].exists { app.buttons["sidebar-Home"].tap() }
        let button = app.buttons["Show in-app notification fixture"]
        for _ in 0..<6 where !button.exists { app.swipeUp() }
        XCTAssertTrue(button.waitForExistence(timeout: 12))
        for _ in 0..<5 where !button.isHittable { app.swipeUp() }
        button.tap()
        let open = app.buttons["Open notification"]
        XCTAssertTrue(open.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Dismiss notification"].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Shared notification banner"; screenshot.lifetime = .keepAlways; add(screenshot)
        open.tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15))
    }
    @MainActor func testActualSimulatorForegroundNotificationBannerTapRoutesChat() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        let button = app.buttons["Schedule iOS notification fixture"]
        for _ in 0..<4 where !button.exists { app.swipeUp() }
        XCTAssertTrue(button.waitForExistence(timeout: 12)); for _ in 0..<4 where !button.isHittable { app.swipeUp() }; button.tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let permission = springboard.alerts.firstMatch
        if permission.waitForExistence(timeout: 3) { permission.buttons["Allow"].tap() }
        let banner = app.buttons["Open notification"]
        XCTAssertTrue(banner.waitForExistence(timeout: 15), "Proteus must present its shared banner while open: " + app.staticTexts["notification-fixture-status"].label)
        banner.tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15))
    }
    @MainActor func testChatFiltersHideArchivedUntilShowArchivedIsEnabled() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-chat-lifecycle-fixtures"]
        app.launch()
        let chats = app.buttons["Chats"].firstMatch
        XCTAssertTrue(chats.waitForExistence(timeout: 12)); chats.tap()
        XCTAssertTrue(app.staticTexts["Current fixture"].waitForExistence(timeout: 12))
        XCTAssertTrue(app.staticTexts["Earlier fixture"].exists)
        XCTAssertFalse(app.staticTexts["Archived fixture"].exists)
        let filters = app.buttons["Filters"].firstMatch
        XCTAssertTrue(filters.waitForExistence(timeout: 8)); filters.tap()
        XCTAssertTrue(app.switches["From Date"].exists)
        XCTAssertTrue(app.switches["Through Date"].exists)
        let showArchived = app.switches["Show Archived"]
        XCTAssertTrue(showArchived.exists); showArchived.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        XCTAssertEqual(showArchived.value as? String, "1", "Show Archived must remain enabled after tapping the switch")
        XCTAssertTrue(app.staticTexts["Archived fixture"].waitForExistence(timeout: 8))
    }
    @MainActor func testHomeShowsBundledCanonicalReleaseHistory() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]
        app.launch()
        let updates = app.buttons["Future updates and changelog"]
        XCTAssertTrue(updates.waitForExistence(timeout: 12)); updates.tap()
        let full = app.buttons["Full changelog"]
        for _ in 0..<6 where !full.exists { app.swipeUp() }
        XCTAssertTrue(full.waitForExistence(timeout: 8)); full.tap()
        let changelog = app.staticTexts["bundled-changelog"]
        XCTAssertTrue(changelog.waitForExistence(timeout: 8))
        XCTAssertTrue(changelog.label.contains("Earlier prototype milestones"), "Home must show release history from the bundled canonical changelog")
    }
    @MainActor func testNotificationTapRoutesForegroundColdStartBackgroundAndUnavailableTargets() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        let home = app.tabBars.buttons["Home"]
        for _ in 0..<4 where !app.buttons["Tap chat notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Tap chat notification"].waitForExistence(timeout: 15))
        app.buttons["Tap chat notification"].tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 12), "Foreground chat tap should open its cached conversation")
        home.tap()
        for _ in 0..<4 where !app.buttons["Tap schedule notification"].exists { app.swipeUp() }
        app.buttons["Tap schedule notification"].tap()
        XCTAssertTrue(app.navigationBars["Notification fixture schedule"].waitForExistence(timeout: 12), "Schedule tap should open the schedule on the correct Mac")
        app.buttons["Done"].tap()
        for _ in 0..<4 where !app.buttons["Tap unavailable notification"].exists { app.swipeUp() }
        app.buttons["Tap unavailable notification"].tap()
        XCTAssertTrue(app.alerts["Proteus"].waitForExistence(timeout: 12), "An unavailable target should fail gracefully")
        XCTAssertTrue(app.alerts.staticTexts["This chat is not cached on this device. Reconnect Alpha Mac and open it from Chats."].exists)
        app.alerts.buttons["OK"].tap()
        XCTAssertTrue(app.staticTexts["Notifications"].waitForExistence(timeout: 10))

        app.terminate()
        app.launchArguments = ["--synthetic-notification-cold-chat"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15), "Cold-start tap must survive Home restoration")

        app.terminate()
        app.launchArguments = ["--synthetic-notification-controls"]
        app.launch()
        for _ in 0..<4 where !app.buttons["Stage background chat notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Stage background chat notification"].waitForExistence(timeout: 12))
        app.buttons["Stage background chat notification"].tap()
        XCUIDevice.shared.press(.home)
        sleep(2)
        app.activate()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15), "Background tap must route after activation")
    }
    @MainActor func testIPadNotificationTapOpensHostContentTabsAndColdSchedule() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        for _ in 0..<4 where !app.buttons["Tap chat notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Tap chat notification"].waitForExistence(timeout: 12))
        app.buttons["Tap chat notification"].tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 12))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "shell-tab-10000000-0000-4000-8000-000000000001:notification-chat")).firstMatch.exists)
        app.buttons["Home"].firstMatch.tap()
        for _ in 0..<4 where !app.buttons["Tap schedule notification"].exists { app.swipeUp() }
        app.buttons["Tap schedule notification"].tap()
        XCTAssertTrue(app.navigationBars["Notification fixture schedule"].waitForExistence(timeout: 12))
        app.terminate()
        app.launchArguments = ["--synthetic-notification-cold-schedule"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Notification fixture schedule"].waitForExistence(timeout: 15), "Cold schedule tap must open its content tab after Home restoration")
    }
    @MainActor func testAttachmentPreviewClosesWithHardwareEscapeCloseButtonAndBackdrop() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-attachment-preview"]; app.launch()
        let open = app.buttons["Open attachment preview"]
        XCTAssertTrue(app.images["Selected image thumbnail"].waitForExistence(timeout: 10))
        XCTAssertTrue(open.waitForExistence(timeout: 10)); open.tap()
        XCTAssertTrue(app.images["Attachment image preview"].waitForExistence(timeout: 10))
        app.images["Attachment image preview"].tap()
        XCTAssertTrue(app.images["Attachment image preview"].exists, "Tapping the image itself must not dismiss its viewer")
        app.typeKey(XCUIKeyboardKey.escape, modifierFlags: [])
        XCTAssertTrue(open.waitForExistence(timeout: 10))
        open.tap()
        XCTAssertTrue(app.images["Attachment image preview"].waitForExistence(timeout: 10))
        app.buttons["Close preview"].tap()
        XCTAssertTrue(open.waitForExistence(timeout: 10))
        open.tap()
        XCTAssertTrue(app.images["Attachment image preview"].waitForExistence(timeout: 10))
        let background = app.buttons["Close preview background"]
        XCTAssertTrue(background.waitForExistence(timeout: 10))
        let tablet = app.windows.firstMatch.frame.width > 700
        if tablet { app.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5)).tap() }
        else { background.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.9)).tap() }
        expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: app.images["Attachment image preview"])
        waitForExpectations(timeout: 10)
        open.tap()
        XCTAssertTrue(app.images["Attachment image preview"].waitForExistence(timeout: 10))
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: tablet ? 0.5 : 0.9)).tap()
        expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: app.images["Attachment image preview"])
        waitForExpectations(timeout: 10)
    }
    @MainActor func testTeamListEditorUsesTappedConfiguration() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-team-lists"]; app.launch()
        let team = app.tabBars.buttons["Team"].exists ? app.tabBars.buttons["Team"] : app.buttons["Team"].firstMatch
        XCTAssertTrue(team.waitForExistence(timeout: 12)); team.tap()
        let overview = app.buttons["Overview"].firstMatch
        XCTAssertTrue(overview.waitForExistence(timeout: 10)); overview.tap()
        let beta = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Beta configuration")).firstMatch
        XCTAssertTrue(beta.waitForExistence(timeout: 10))
        beta.tap()
        let name = app.textFields["List name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        XCTAssertEqual(name.value as? String, "Beta configuration")
        XCTAssertTrue(app.staticTexts["Bob"].exists)
        XCTAssertTrue(app.staticTexts["Beta link"].exists)
        name.tap(); name.typeText(" revised")
        app.buttons["Save"].tap()
        let revised = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Beta configuration revised")).firstMatch
        XCTAssertTrue(revised.waitForExistence(timeout: 10), "Revision-bound save must update the selected list")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Alpha configuration")).firstMatch.exists, "Editing Beta must leave Alpha intact")
        app.buttons["Create team list"].tap()
        let newName = app.textFields["List name"]
        XCTAssertTrue(newName.waitForExistence(timeout: 10))
        XCTAssertTrue(["", "List name"].contains(newName.value as? String ?? ""), "Create must open a blank editor, not reuse Beta")
        newName.tap(); newName.typeText("Gamma configuration")
        app.buttons["Save"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Gamma configuration")).firstMatch.waitForExistence(timeout: 10))
    }
    @MainActor func testIPadMainAndTeamBrowserTabsRestoreSeparately() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let mainAdd = app.buttons["new-main-browser-tab"]
        guard mainAdd.waitForExistence(timeout: 8) else { return } // iPhone uses its bottom navigation.
        mainAdd.tap(); app.buttons["Browser - Default"].firstMatch.tap()
        let mainTabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "shell-tab-"))
        XCTAssertTrue(mainTabs.firstMatch.waitForExistence(timeout: 10))
        let mainID = mainTabs.element(boundBy: mainTabs.count - 1).identifier
        app.buttons["Team"].firstMatch.tap()
        app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-tab-select-")).firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons[mainID].exists)
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons[mainID].waitForExistence(timeout: 12))
        XCTAssertEqual(app.webViews.count, 0, "Restored browser descriptors must remain unloaded on launch")
        app.buttons[mainID].tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 10))
    }
    @MainActor func testIPadMainTabStripKeepsExactScrollPositionAcrossTabAndSidebarSelection() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let plus = app.buttons["new-main-browser-tab"]
        XCTAssertTrue(plus.waitForExistence(timeout: 12))
        for _ in 0..<12 { plus.tap(); app.buttons["Browser - Default"].firstMatch.tap() }
        let tabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "shell-tab-"))
        XCTAssertGreaterThanOrEqual(tabs.count, 12)
        let first = tabs.element(boundBy: 0)
        let stripY = plus.frame.midY / app.frame.height
        let stripRight = (plus.frame.minX - 30) / app.frame.width
        let stripLeft = 390.0 / app.frame.width
        for _ in 0..<5 where first.isHittable {
            app.coordinate(withNormalizedOffset: CGVector(dx: stripRight, dy: stripY))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: stripLeft, dy: stripY)))
        }
        XCTAssertFalse(first.isHittable, "The strip must be away from its initial position before this regression check")
        let visible = tabs.allElementsBoundByIndex.filter { $0.isHittable }
        guard let selected = visible.dropLast().last ?? visible.last else { XCTFail("No scrolled tab is visible"); return }
        let tabID = selected.identifier
        let before = selected.frame.minX
        selected.tap()
        XCTAssertEqual(app.buttons[tabID].value as? String, "Active")
        XCTAssertEqual(app.buttons[tabID].frame.minX, before, accuracy: 2, "Selecting a tab must not scroll the strip")
        app.buttons["Home"].firstMatch.tap()
        XCTAssertEqual(app.buttons[tabID].frame.minX, before, accuracy: 2, "Left navigation must not reset the tab strip")
        app.buttons["Chats"].firstMatch.tap()
        XCTAssertEqual(app.buttons[tabID].frame.minX, before, accuracy: 2, "A second left navigation must preserve the same offset")
    }
    @MainActor func testNewBrowserFocusAndTwentyRecentSites() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace", "--synthetic-address-recents"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20))
        if app.tabBars.buttons["Team"].exists { app.tabBars.buttons["Team"].tap() } else { app.buttons["Team"].firstMatch.tap() }
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 15))
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "New tab opens the address keyboard without another tap")
        let recent = app.buttons["browser-recent-v24"]
        XCTAssertTrue(recent.waitForExistence(timeout: 10)); XCTAssertTrue(recent.label.contains("Fixture iPad"))
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-recent-v")).count, 20)
        recent.tap(); let loaded = app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15)
        if !loaded { let failure = XCTAttachment(screenshot: app.screenshot()); failure.name = "Recent navigation failure"; failure.lifetime = .keepAlways; add(failure); print(app.debugDescription) }
        XCTAssertTrue(loaded)
        address.tap(); XCTAssertTrue(recent.waitForExistence(timeout: 5)); app.buttons["Done"].firstMatch.tap()
        XCTAssertFalse(recent.exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Browser focus and recent sites"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
    @MainActor func testBrowserGoKeepsTabAndToolbarTracksBackForwardRefresh() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20), "Synthetic Alpha Mac must be selected before browser navigation")
        if app.tabBars.buttons["Team"].exists { app.tabBars.buttons["Team"].tap() } else { app.buttons["Team"].firstMatch.tap() }
        if !app.textFields["browser-address"].waitForExistence(timeout: 2) { openDefaultTeamBrowser(app) }
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 15))
        let tabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-tab-select-"))
        let startingCount = tabs.count
        XCTAssertGreaterThanOrEqual(startingCount, 1)
        let originalID = tabs.matching(NSPredicate(format: "value == %@", "Active")).firstMatch.identifier
        address.tap()
        address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        XCTAssertEqual(tabs.count, startingCount); XCTAssertTrue(app.buttons[originalID].exists)
        XCTAssertEqual(app.buttons[originalID].value as? String, "Active")
        XCTAssertFalse(app.buttons["browser-back"].isEnabled)
        app.webViews.links["Next browser page"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["browser-back"]); waitForExpectations(timeout: 10)
        app.buttons["browser-back"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["browser-forward"]); waitForExpectations(timeout: 10)
        app.buttons["browser-forward"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        let load = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Load ")).firstMatch
        XCTAssertTrue(load.waitForExistence(timeout: 10)); let before = load.label
        expectation(for: NSPredicate(format: "label == %@", "Refresh page"), evaluatedWith: app.buttons["browser-refresh"]); waitForExpectations(timeout: 10)
        app.buttons["browser-refresh"].tap()
        expectation(for: NSPredicate(format: "label != %@", before), evaluatedWith: load); waitForExpectations(timeout: 15)
        XCTAssertEqual(tabs.count, startingCount); XCTAssertTrue(app.buttons[originalID].exists)
        openDefaultTeamBrowser(app); XCTAssertEqual(tabs.count, startingCount + 1)
        XCTAssertEqual(app.buttons[originalID].value as? String, "Inactive")
        app.buttons[originalID].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.buttons[originalID].value as? String, "Active")
        XCTAssertTrue(app.buttons["browser-back"].isEnabled)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Native browser toolbar and active tab"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
    @MainActor func testBrowserBackAfterRestoreAndScopedPinchOverview() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]
        app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20))
        app.buttons["Team"].firstMatch.tap()
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap()
        address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        app.webViews.links["Next browser page"].tap(); XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        app.webViews.links["Next browser page"].tap(); XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        let selected = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND value == %@", "browser-tab-select-", "Active")).firstMatch.identifier
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["Team"].firstMatch.waitForExistence(timeout: 10)); app.buttons["Team"].firstMatch.tap()
        XCTAssertTrue(app.buttons[selected].waitForExistence(timeout: 10)); app.buttons[selected].tap()
        if app.buttons["Reload page"].waitForExistence(timeout: 3) { app.buttons["Reload page"].tap() }
        XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["browser-back"].isEnabled); app.buttons["browser-back"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["browser-forward"].isEnabled); app.buttons["browser-forward"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        let scale = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Page scale ")).firstMatch
        XCTAssertTrue(scale.waitForExistence(timeout: 8))
        let beforeZoom = Double(scale.label.replacingOccurrences(of: "Page scale ", with: "")) ?? 0
        app.webViews.firstMatch.pinch(withScale: 2, velocity: 1)
        let afterZoom = Double(scale.label.replacingOccurrences(of: "Page scale ", with: "")) ?? 0
        let zoomEvidence = XCTAttachment(string: "Synthetic visualViewport scale before outward pinch: \(beforeZoom), after: \(afterZoom)"); zoomEvidence.lifetime = .keepAlways; add(zoomEvidence)
        if afterZoom > beforeZoom + 0.1 {
            app.webViews.firstMatch.pinch(withScale: 0.5, velocity: -1)
            XCTAssertFalse(app.navigationBars["Browser tabs"].exists, "Zooming back toward the page minimum remains ordinary page zoom")
        } else {
            let limitation = XCTAttachment(string: "XCTest outward pinch did not produce real page zoom; ordinary zoom-out is unverified here. The same fixture also remained at scale 1.0 with the overview observer disabled."); limitation.lifetime = .keepAlways; add(limitation)
        }
        for _ in 0..<4 { if app.navigationBars["Browser tabs"].exists { break }; app.webViews.firstMatch.pinch(withScale: 0.5, velocity: -1) }
        XCTAssertTrue(app.navigationBars["Browser tabs"].waitForExistence(timeout: 10))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Scoped native pinch overview after restored history"; shot.lifetime = .keepAlways; add(shot)
        app.navigationBars["Browser tabs"].buttons["Done"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 10))
    }
    @MainActor func testBrowserSameDocumentPushStateAndHashHistory() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let ready = app.buttons["sidebar-Team"].exists ? app.buttons["sidebar-Team"] : app.buttons["destination-picker"]
        XCTAssertTrue(ready.waitForExistence(timeout: 20)); app.buttons["Team"].firstMatch.tap()
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("http://127.0.0.1:4329/browser/spa"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["SPA step 1"].waitForExistence(timeout: 15))
        app.webViews.buttons["SPA Next"].tap(); XCTAssertTrue(app.webViews.staticTexts["SPA step 2"].waitForExistence(timeout: 8))
        app.webViews.buttons["SPA Next"].tap(); XCTAssertTrue(app.webViews.staticTexts["SPA step 3"].waitForExistence(timeout: 8))
        app.webViews.buttons["SPA Replace"].tap()
        app.buttons["browser-back"].tap(); XCTAssertTrue(app.webViews.staticTexts["SPA step 3"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["browser-back"].isEnabled); app.buttons["browser-back"].tap(); XCTAssertTrue(app.webViews.staticTexts["SPA step 2"].waitForExistence(timeout: 8))
        app.buttons["browser-back"].tap(); XCTAssertTrue(app.webViews.staticTexts["SPA step 1"].waitForExistence(timeout: 8))
        app.buttons["browser-forward"].tap(); XCTAssertTrue(app.webViews.staticTexts["SPA step 2"].waitForExistence(timeout: 8))
        app.webViews.links["Hash section"].tap(); XCTAssertTrue(app.webViews.staticTexts["Hash #section"].waitForExistence(timeout: 8))
        app.buttons["browser-back"].tap(); XCTAssertTrue(app.webViews.staticTexts["No hash"].waitForExistence(timeout: 8))
        app.buttons["browser-forward"].tap(); XCTAssertTrue(app.webViews.staticTexts["Hash #section"].waitForExistence(timeout: 8))
    }
    @MainActor func testBrowserLinkOpensBesideItsSourceTab() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20)); app.buttons["Team"].firstMatch.tap()
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; address.tap(); address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        let tabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-tab-select-"))
        let source = tabs.matching(NSPredicate(format: "value == %@", "Active")).firstMatch.identifier
        openDefaultTeamBrowser(app); app.buttons[source].tap()
        XCTAssertTrue(app.webViews.links["Next browser page"].waitForExistence(timeout: 10)); app.webViews.links["Next browser page"].press(forDuration: 1)
        let action = app.buttons["Open in New Tab"]; XCTAssertTrue(action.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Copy Link"].exists)
        XCTAssertTrue(app.buttons["Download Linked File"].exists)
        XCTAssertTrue(app.buttons["Download Linked File As…"].exists)
        XCTAssertTrue(app.buttons["Share Link…"].exists)
        action.tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        let created = tabs.matching(NSPredicate(format: "value == %@", "Active")).firstMatch.identifier
        let ids = tabs.allElementsBoundByIndex.map(\.identifier)
        XCTAssertEqual(ids.firstIndex(of: created), ids.firstIndex(of: source).map { $0 + 1 })
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Native linked browser inserted beside its source"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testContentEdgeSwipesReturnToChatsAndNavigateBrowser() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-browser-workspace"]
        app.launch()
        if app.buttons["sidebar-Chats"].waitForExistence(timeout: 3) { app.buttons["sidebar-Chats"].tap() }
        else { app.tabBars.buttons["Chats"].tap() }
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10)); row.tap()
        app.buttons["chat-conversation-tab"].tap()
        let chatTab = app.buttons["chat-conversation-tab"]
        func drag(_ start: CGPoint, _ end: CGPoint) {
            let origin = app.coordinate(withNormalizedOffset: .zero)
            origin.withOffset(CGVector(dx: start.x, dy: start.y)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: end.x, dy: end.y)))
        }
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]
        XCTAssertTrue(reply.waitForExistence(timeout: 10)); reply.tap(); reply.typeText("Retained through swipe navigation")
        if app.buttons["Hide keyboard"].exists { app.buttons["Hide keyboard"].tap() }
        let left = chatTab.frame.minX + 24, y = app.frame.height * 0.45
        drag(CGPoint(x: left, y: y), CGPoint(x: left + 12, y: y - 130))
        XCTAssertTrue(chatTab.exists, "Vertical scrolling must not leave the chat")
        // A center swipe and a short edge drag must not dismiss the chat.
        drag(CGPoint(x: app.frame.midX, y: y), CGPoint(x: app.frame.midX + 100, y: y))
        XCTAssertTrue(chatTab.exists)
        drag(CGPoint(x: left, y: y), CGPoint(x: left + 40, y: y))
        XCTAssertTrue(chatTab.exists)
        drag(CGPoint(x: left, y: y), CGPoint(x: left + 180, y: y))
        XCTAssertTrue(app.buttons["new-chat"].waitForExistence(timeout: 8)); XCTAssertFalse(chatTab.exists)
        row.tap()
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        XCTAssertEqual(reply.value as? String, "Retained through swipe navigation")
        app.buttons["Add chat tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.staticTexts["First browser page"].waitForExistence(timeout: 15))
        web.links["Next browser page"].tap(); XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        let edge = web.frame.minX + 24, browserY = web.frame.midY
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(web.staticTexts["First browser page"].waitForExistence(timeout: 10)); XCTAssertTrue(chatTab.exists)
        drag(CGPoint(x: web.frame.maxX - 24, y: browserY), CGPoint(x: web.frame.maxX - 204, y: browserY))
        XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 10))
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(web.staticTexts["First browser page"].waitForExistence(timeout: 10))
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(app.buttons["new-chat"].waitForExistence(timeout: 8)); XCTAssertFalse(chatTab.exists)
    }
    @MainActor func testNativeHistorySharingSettingsSaveOnlyToOwningComputer() async throws {
        let (catalogData, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/history-settings-fixture")!)
        let catalog = try JSONSerialization.jsonObject(with: catalogData) as! [String: Any]
        let peer = try XCTUnwrap(catalog["peerId"] as? String), work = try XCTUnwrap(catalog["profileId"] as? String)
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String)); app.buttons["pair-mac"].tap()
        if app.buttons["sidebar-Engine Room"].waitForExistence(timeout: 5) { app.buttons["sidebar-Engine Room"].tap() } else { app.tabBars.buttons["Engine Room"].tap() }
        let actions = app.buttons.matching(NSPredicate(format: "label == %@", "Browser history")); XCTAssertTrue(actions.firstMatch.waitForExistence(timeout: 15)); actions.element(boundBy: actions.count - 1).tap()
        app.buttons["owner-history-settings"].tap()
        let recording = app.switches["history-settings-recording"]; XCTAssertTrue(recording.waitForExistence(timeout: 15)); XCTAssertTrue(recording.isEnabled)
        recording.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(recording.value as? String, "0")
        app.buttons["history-settings-retention"].tap(); app.buttons["Keep all history"].tap()
        let sharing = app.switches["history-peer-enabled-" + peer]; sharing.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(sharing.value as? String, "1")
        app.buttons["history-peer-backfill-" + peer].tap(); app.buttons["All available"].tap()
        let settingsForm = app.descendants(matching: .any).matching(identifier: "history-settings-form").firstMatch; XCTAssertTrue(settingsForm.exists); settingsForm.swipeUp()
        let workSwitch = app.switches["history-peer-profile-" + peer + "-" + work]; workSwitch.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(workSwitch.value as? String, "1")
        let defaultSwitch = app.switches["history-peer-profile-" + peer + "-default"]; defaultSwitch.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(defaultSwitch.value as? String, "0")
        settingsForm.swipeUp()
        let save = app.buttons["history-settings-save"]; XCTAssertTrue(save.waitForExistence(timeout: 5)); save.tap()
        XCTAssertTrue(app.staticTexts["Saved. The owner will synchronize enabled peers in the background."].waitForExistence(timeout: 15))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Owner history sharing preferences saved"; screenshot.lifetime = .keepAlways; add(screenshot)
        let (stateData, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/history-settings-fixture/state")!)
        let state = try JSONSerialization.jsonObject(with: stateData) as! [String: Any], owner = try XCTUnwrap(state["owner"] as? [String: Any]), other = try XCTUnwrap(state["otherOwner"] as? [String: Any])
        XCTAssertEqual(owner["enabled"] as? Bool, false); XCTAssertEqual(owner["retentionDays"] as? Int, 0)
        let saved = try XCTUnwrap((owner["peers"] as? [[String: Any]])?.first)
        XCTAssertEqual(saved["hostId"] as? String, peer); XCTAssertEqual(saved["enabled"] as? Bool, true); XCTAssertEqual(saved["backfill"] as? String, "all"); XCTAssertEqual(saved["profileIds"] as? [String], [work])
        XCTAssertEqual((saved["futurePreference"] as? [String: String])?["keep"], "owner value")
        XCTAssertEqual(other["enabled"] as? Bool, true); XCTAssertEqual(other["retentionDays"] as? Int, 0); XCTAssertEqual((other["peers"] as? [Any])?.count, 0)
        app.buttons["Done"].tap()
        app.buttons["owner-history-profile"].tap(); app.buttons["Synthetic Work"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Synthetic owner Work visit")).firstMatch.waitForExistence(timeout: 15), "Paired owner history profiles remain selectable without website sign-in")

    }
    @MainActor func testNativeHistorySettingsSaveIsDisabledWhenOwnerOffline() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
        if app.buttons["sidebar-Engine Room"].waitForExistence(timeout: 5) { app.buttons["sidebar-Engine Room"].tap() } else { app.tabBars.buttons["Engine Room"].tap() }
        let actions = app.buttons.matching(NSPredicate(format: "label == %@", "Browser history")); XCTAssertTrue(actions.firstMatch.waitForExistence(timeout: 15)); actions.element(boundBy: actions.count - 1).tap()
        app.buttons["owner-history-settings"].tap()
        XCTAssertTrue(app.staticTexts["Alpha Mac"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Reconnect this computer to view or change its history settings."].exists)
        XCTAssertFalse(app.buttons["history-settings-save"].isEnabled)
    }
    @MainActor func testBrowserConflictOffersExplicitRecoveryInOriginalTeamScope() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace", "--synthetic-browser-conflict"]; app.launch()
        let alert = app.alerts["Browser navigation changed"]
        XCTAssertTrue(alert.waitForExistence(timeout: 15))
        XCTAssertTrue(alert.buttons["Use owner history"].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Browser conflict explicit recovery"; screenshot.lifetime = .keepAlways; add(screenshot)
        alert.buttons["Open local destination in new tab"].tap()
        if app.buttons["sidebar-Team"].exists { app.buttons["sidebar-Team"].tap() } else { app.tabBars.buttons["Team"].tap() }
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label == %@", "Offline copy · Local branch")).firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(alert.exists)
    }
    @MainActor func testOwnerBrowserHistoryWorksWithoutWebsiteAccount() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        if app.buttons["sidebar-Engine Room"].exists { app.buttons["sidebar-Engine Room"].tap() }
        else { XCTAssertTrue(app.tabBars.buttons["Engine Room"].waitForExistence(timeout: 20)); app.tabBars.buttons["Engine Room"].tap() }
        let historyButtons = app.buttons.matching(NSPredicate(format: "label == %@", "Browser history"))
        XCTAssertTrue(historyButtons.firstMatch.waitForExistence(timeout: 10))
        // Overview has a visible list action after the horizontal navigation action.
        historyButtons.element(boundBy: historyButtons.count - 1).tap()
        XCTAssertTrue(app.textFields["Search all owner history"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Offline search covers the cached last 30 days only."].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Owner browser history · offline pairing, no website account"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
    @MainActor func testHeldBrowserArrowsJumpToChosenHistoryPage() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let ready = app.buttons["sidebar-Team"].exists ? app.buttons["sidebar-Team"] : app.buttons["destination-picker"]
        XCTAssertTrue(ready.waitForExistence(timeout: 20))
        if app.tabBars.buttons["Team"].exists { app.tabBars.buttons["Team"].tap() } else if app.buttons["sidebar-Team"].exists { app.buttons["sidebar-Team"].tap() } else { app.buttons["Team"].firstMatch.tap() }
        if !app.textFields["browser-address"].waitForExistence(timeout: 2) { app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap() }
        app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 15))
        address.tap()
        address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        app.webViews.links["Next browser page"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        app.webViews.links["Next browser page"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        let back = app.buttons["browser-back"]
        back.press(forDuration: 1)
        XCTAssertTrue(app.buttons["First browser page"].waitForExistence(timeout: 5))
        app.buttons["browser-history-back-0"].tap()
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15))
        let forward = app.buttons["browser-forward"]
        forward.press(forDuration: 1)
        XCTAssertTrue(app.buttons["Third browser page"].waitForExistence(timeout: 5))
        app.buttons["browser-history-forward-2"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        app.buttons["browser-navigation-history"].tap()
        XCTAssertTrue(app.staticTexts["Navigation history"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["3 saved navigation entries"].exists)
        app.buttons["Done"].tap()
    }
    @MainActor func testBrowserHistoryShowsLocalVisitDeviceAndPagesAfter25() {
        let app = XCUIApplication()
        app.launchArguments = ["--synthetic-browser-history", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        let first = app.staticTexts["browser-history-details-1"]
        XCTAssertTrue(first.waitForExistence(timeout: 15))
        XCTAssertTrue(first.label.contains("Oct 4, 2026")); XCTAssertTrue(first.label.contains("12:00")); XCTAssertTrue(first.label.contains("Visiting iPad"))
        XCTAssertTrue(app.staticTexts["browser-history-details-2"].label.contains("Unknown device"))
        app.buttons["Use Tokyo history timezone"].tap()
        expectation(for: NSPredicate(format: "label CONTAINS %@ AND label CONTAINS %@", "Oct 5, 2026", "3:00"), evaluatedWith: first)
        waitForExpectations(timeout: 10)
        let more = app.buttons["browser-history-more"]
        for _ in 0..<12 { if more.exists && more.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(more.exists); XCTAssertFalse(app.staticTexts["Visit 26"].exists)
        more.tap(); app.swipeUp()
        XCTAssertTrue(app.staticTexts["Visit 26"].waitForExistence(timeout: 10))
        XCTAssertFalse(more.exists)
    }
    @MainActor func testMessageTimestampUsesDeviceZoneInsteadOfSharedUTCAndUpdates() {
        let app = XCUIApplication()
        app.launchArguments = ["--synthetic-message-timezone", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        let timestamp = app.staticTexts["message-timestamp"]
        XCTAssertTrue(timestamp.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "label == %@", "Oct 4, 12:00 PM MDT"), evaluatedWith: timestamp)
        waitForExpectations(timeout: 10)
        app.buttons["Use Tokyo device timezone"].tap()
        expectation(for: NSPredicate(format: "label == %@", "Oct 5, 3:00 AM GMT+9"), evaluatedWith: timestamp)
        waitForExpectations(timeout: 10)
    }
    @MainActor private func showChats(_ app: XCUIApplication) { XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 25)); if app.tabBars.buttons["Chats"].exists { app.tabBars.buttons["Chats"].tap() } else { let chats=app.buttons["sidebar-Chats"].exists ? app.buttons["sidebar-Chats"] : app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Chats")).firstMatch; if !chats.exists && app.buttons["Toggle sidebar"].exists { app.buttons["Toggle sidebar"].tap() }; XCTAssertTrue(chats.waitForExistence(timeout: 8)); chats.tap() } }
    @MainActor func testLiveBrowserViewerAndDraftRetention() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        // Pairing reset intentionally preserves saved browser tabs. Navigate to Home explicitly.
        if app.buttons["sidebar-Home"].waitForExistence(timeout: 3) { app.buttons["sidebar-Home"].tap() }
        else if app.tabBars.buttons["Home"].exists { app.tabBars.buttons["Home"].tap() }
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app)
        _ = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/live-grant")!)
        let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Live browser rehearsal")
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]; XCTAssertTrue(reply.waitForExistence(timeout: 10)); reply.tap(); reply.typeText("Unsent pending answer")
        app.buttons["chat-live-browser"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["live-browser-image"].waitForExistence(timeout: 15))
        let instruction = app.textFields["live-browser-instruction"]; instruction.tap(); instruction.typeText("Unsent browser instruction")
        app.buttons["chat-conversation-tab"].tap()
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        XCTAssertEqual(app.textFields["reply-text"].value as? String, "Unsent pending answer")
        app.buttons["chat-live-browser"].tap(); XCTAssertEqual(app.textFields["live-browser-instruction"].value as? String, "Unsent browser instruction")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Live Browser preview"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testExpandableToolOutput() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Tool display rehearsal")
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        let group = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Activity · 1 tool")).firstMatch
        for _ in 0..<8 { if group.exists && group.isHittable { break }; app.swipeDown() }
        XCTAssertTrue(group.waitForExistence(timeout: 10)); group.tap()
        let tool = app.buttons["tool-activity-synthetic-read"]
        for _ in 0..<8 { if tool.exists && tool.isHittable { break }; app.swipeDown() }
        XCTAssertTrue(tool.waitForExistence(timeout: 10)); tool.tap()
        XCTAssertTrue(app.staticTexts["Expanded synthetic tool result"].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Expanded tool activity"; screenshot.lifetime = .keepAlways; add(screenshot)
        if app.buttons["stop-turn"].exists { app.buttons["stop-turn"].tap() }
    }
    @MainActor func testPendingChatOnlyApproval() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app)
        let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Permission rehearsal")
        app.buttons["start-chat"].tap()
        let approval = app.buttons["pending-chat-auto-approval"]; XCTAssertTrue(approval.waitForExistence(timeout: 25))
        XCTAssertTrue(app.buttons["Approve once"].exists); XCTAssertTrue(app.buttons["Deny"].exists)
        approval.tap()
        let disappeared = NSPredicate(format: "exists == false")
        let expectation = expectation(for: disappeared, evaluatedWith: approval); await fulfillment(of: [expectation], timeout: 20)
        // The fixture asks a real question next; chat auto-approval must not answer it.
        XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Approve once"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Chat-only pending approval"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testPairStartAndReply() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 25))
        if app.tabBars.buttons["Chats"].exists { app.tabBars.buttons["Chats"].tap() } else { app.buttons["Chats"].firstMatch.tap() }
        let newChat = app.buttons["new-chat"]
        XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]
        XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Mobile UI rehearsal")
        app.buttons["start-chat"].tap()
        if app.buttons["composer-preview"].waitForExistence(timeout: 8) { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]
        XCTAssertTrue(reply.waitForExistence(timeout: 20))
        let inputNeeded = app.staticTexts["Your input is needed"]
        XCTAssertTrue(inputNeeded.waitForExistence(timeout: 20))
        reply.tap(); reply.typeText("Follow up from my iPhone")
        app.buttons["Send feedback"].tap()
        XCTAssertTrue(app.staticTexts["Turn complete"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.webViews.staticTexts["Follow up from my iPhone"].firstMatch.waitForExistence(timeout: 15))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Proteus mobile conversation"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
}

extension RemoteUITests {
    @MainActor func testRichConversationIsVisible() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap()
        prompt.typeText("# Rich message\n\n**Ready** for review.\n\n| Client | Status |\n| --- | --- |\n| Mac | Ready |\n| iPad | Ready |\n\n```javascript\nconst ready = true;\n```")
        app.buttons["start-chat"].tap()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 20))
        let copy = app.buttons["Copy code"].firstMatch
        for _ in 0..<6 { if copy.exists && copy.isHittable { break }; app.swipeDown() }
        XCTAssertTrue(copy.waitForExistence(timeout: 15), "Rendered code toolbar should be accessible")
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = "Rich conversation on device"; image.lifetime = .keepAlways; add(image)
        if app.buttons["stop-turn"].exists { app.buttons["stop-turn"].tap() }
    }
}

extension RemoteUITests {
    @MainActor func testContextFavoritesSelection() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Selected sources only")
        let loading = app.buttons["source-loading"]
        guard loading.waitForExistence(timeout: 10) else { XCTFail("Source loading picker is missing"); return }
        loading.tap(); app.buttons["Only selected sources"].tap()
        let favorite = app.buttons["Add to favorites: Synthetic skill"]
        for _ in 0..<12 {
            if favorite.exists && favorite.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)))
        }
        guard favorite.waitForExistence(timeout: 10) else { XCTFail("Favorite action is missing"); return }
        favorite.tap()
        let check = app.buttons["Check all favorites"]
        for _ in 0..<12 {
            if check.exists && check.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)))
        }
        guard check.waitForExistence(timeout: 10) else { XCTFail("Check all favorites is missing"); return }
        check.tap()
        XCTAssertTrue(app.buttons["Remove from favorites: Synthetic skill"].exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Mobile favorites and selected sources"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["start-chat"].tap(); guard app.staticTexts["Your input is needed"].waitForExistence(timeout: 20) else { XCTFail("Chat did not start"); return }
        let (latest, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/latest")!)
        let value = try JSONSerialization.jsonObject(with: latest) as! [String: Any]; let context = try XCTUnwrap(value["context"] as? [String: Any])
        XCTAssertEqual(context["includeDefaults"] as? Bool, false)
        let entries = context["entries"] as! [[String: Any]]; XCTAssertEqual(entries.count, 1); XCTAssertEqual(entries.first?["kind"] as? String, "skill")
        app.buttons["stop-turn"].tap()
    }
}

extension RemoteUITests {
    @MainActor func testModelCapabilities() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair?models=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Model options rehearsal")
        let effort = app.descendants(matching: .any)["effort-picker"].firstMatch
        for _ in 0..<12 {
            if effort.exists && effort.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)))
        }
        guard effort.waitForExistence(timeout: 10) else { XCTFail("Effort picker missing"); return }; effort.tap(); app.buttons["none"].tap()
        let context = app.descendants(matching: .any)["context-tier-picker"].firstMatch
        for _ in 0..<12 {
            if context.exists && context.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)))
        }
        guard context.waitForExistence(timeout: 10) else { XCTFail("Context picker missing"); return }
        context.tap(); app.buttons["872K · Long context"].tap()
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Live effort and context controls"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        let (latest, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/latest")!)
        let value = try JSONSerialization.jsonObject(with: latest) as! [String: Any]
        XCTAssertEqual(value["reasoningEffort"] as? String, "none"); XCTAssertEqual(value["contextTier"] as? String, "long_context")
        if app.buttons["composer-preview"].waitForExistence(timeout: 3) { app.buttons["composer-preview"].tap() }
        XCTAssertTrue(app.buttons["composer-model"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["composer-context"].exists)
        XCTAssertTrue(app.buttons["steer-message"].exists); XCTAssertFalse(app.buttons["steer-message"].isEnabled)
        XCTAssertTrue(app.buttons["stop-turn"].exists)
        app.buttons["composer-effort"].tap(); app.buttons["high"].tap()
        if app.buttons["composer-preview"].waitForExistence(timeout: 8) { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]; reply.tap(); reply.typeText("Queued with new effort")
        app.buttons["send-message"].tap()
        XCTAssertTrue(app.buttons["Remove"].waitForExistence(timeout: 10))
        let (queued, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/latest")!)
        let queuedValue = try JSONSerialization.jsonObject(with: queued) as! [String: Any]
        XCTAssertEqual(queuedValue["reasoningEffort"] as? String, "none")
        let messages = queuedValue["queuedMessages"] as! [[String: Any]]
        XCTAssertEqual((messages.first?["modelOptions"] as? [String: Any])?["reasoningEffort"] as? String, "high")
        let composerShot = XCTAttachment(screenshot: app.screenshot()); composerShot.name = "Compact composer menus and separate actions"; composerShot.lifetime = .keepAlways; add(composerShot)
        app.buttons["Edit"].tap()
        let queuedEditor = app.textViews["queued-message-editor"]
        XCTAssertTrue(queuedEditor.waitForExistence(timeout: 10)); queuedEditor.tap()
        queuedEditor.typeText(" revised")
        let editedText = queuedEditor.value as! String
        app.buttons["Save"].tap()
        let disappeared = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: queuedEditor)
        await fulfillment(of: [disappeared], timeout: 10)
        let (edited, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/latest")!)
        let editedValue = try JSONSerialization.jsonObject(with: edited) as! [String: Any]
        let editedMessages = editedValue["queuedMessages"] as! [[String: Any]]
        XCTAssertEqual(editedMessages.first?["prompt"] as? String, editedText)
        XCTAssertEqual((editedMessages.first?["modelOptions"] as? [String: Any])?["reasoningEffort"] as? String, "high")
        app.buttons["Remove"].tap()
        if app.buttons["stop-turn"].exists { app.buttons["stop-turn"].tap() }
    }
}

extension RemoteUITests {
    @MainActor func testMCPConnectionRefresh() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair?models=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Synthetic MCP status")
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        let details = app.buttons["Chat details & loaded context"]
        for _ in 0..<5 { if details.isHittable { break }; app.swipeUp() }; details.tap()
        let mcp = app.buttons["MCP connections"]
        for _ in 0..<8 { if mcp.exists && mcp.isHittable { break }; app.swipeUp() }; XCTAssertTrue(mcp.waitForExistence(timeout: 10)); mcp.tap()
        let login = app.buttons["Sign in on Build Mac"]
        XCTAssertTrue(login.waitForExistence(timeout: 10))
        // XCTest can report a control as hittable while the bottom composer covers it.
        for _ in 0..<5 { if login.isHittable && login.frame.maxY < app.frame.height * 0.7 { break }; app.swipeUp() }
        XCTAssertTrue(login.isEnabled); login.tap()
        let status = app.staticTexts["mcp-status-message"]
        let connected = NSPredicate(format: "label CONTAINS %@", "Connected to synthetic-integration")
        let completed = expectation(for: connected, evaluatedWith: status); await fulfillment(of: [completed], timeout: 20)
        XCTAssertFalse(app.buttons["Sign in on Build Mac"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Automatic MCP connection refresh"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["stop-turn"].tap()
    }
}

extension RemoteUITests {
    @MainActor func testLinuxAndMacComputerMetadataSurvivesSelectionAndRestart() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-linux-host"]; app.launch()
        let picker = app.buttons["destination-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); XCTAssertTrue(picker.label.contains("Alpha Linux"))
        picker.tap(); app.buttons["Manage computers"].tap()
        XCTAssertTrue(app.staticTexts["Linux · x64"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["macOS · arm64"].exists)
        app.buttons["Done"].tap(); picker.tap(); app.buttons["Beta Mac"].tap()
        XCTAssertTrue(picker.label.contains("Beta Mac"))
        picker.tap(); app.buttons["Alpha Linux"].tap()
        XCTAssertTrue(picker.label.contains("Alpha Linux"))
        app.terminate(); app.launchArguments = []; app.launch()
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); XCTAssertTrue(picker.label.contains("Alpha Linux"))
        picker.tap(); app.buttons["Manage computers"].tap()
        XCTAssertTrue(app.staticTexts["Linux · x64"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["macOS · arm64"].exists)
    }

    @MainActor func testMacDestinationPickerRenameAndIndependentForget() throws {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations"]; app.launch()
        if app.buttons["sidebar-Home"].waitForExistence(timeout: 3) { app.buttons["sidebar-Home"].tap() }
        else if app.tabBars.buttons["Home"].exists { app.tabBars.buttons["Home"].tap() }
        let picker = app.buttons["destination-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); XCTAssertTrue(picker.label.contains("Alpha Mac"))
        picker.tap(); app.buttons["Beta Mac"].tap()
        XCTAssertTrue(picker.label.contains("Beta Mac"))
        picker.tap(); app.buttons["Manage computers"].tap()
        let workID = "10000000-0000-4000-8000-000000000002"
        app.buttons["rename-" + workID].tap(); let field = app.alerts.textFields.firstMatch
        field.tap(); field.typeText(" 2"); let renamed = try XCTUnwrap(field.value as? String)
        XCTAssertNotEqual(renamed, "Beta Mac")
        app.alerts.buttons["Save"].tap(); XCTAssertTrue(app.staticTexts[renamed].waitForExistence(timeout: 5))
        app.buttons["forget-" + workID].tap(); app.buttons["Forget computer"].tap()
        XCTAssertFalse(app.staticTexts[renamed].exists); XCTAssertTrue(app.staticTexts["Alpha Mac"].exists)
        app.buttons["Done"].tap(); XCTAssertTrue(picker.label.contains("Alpha Mac"))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Independent Mac destinations"; shot.lifetime = .keepAlways; add(shot)
    }
}


extension RemoteUITests {
    @MainActor func testEditRelayForOneSavedMacPersistsWithoutRepairing() throws {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations"]; app.launch()
        let picker = app.buttons["destination-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); picker.tap(); app.buttons["Manage computers"].tap()
        let work = "10000000-0000-4000-8000-000000000002", personal = "10000000-0000-4000-8000-000000000001"
        app.buttons["edit-relay-" + work].tap()
        let field = app.textFields["relay-address"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        func replace(_ value: String) {
            field.tap(); field.press(forDuration: 1.2)
            let selectAll = app.menuItems["Select All"]
            if selectAll.waitForExistence(timeout: 3) { selectAll.tap() }
            else { let button = app.buttons["Select All"]; XCTAssertTrue(button.waitForExistence(timeout: 3)); button.tap() }
            field.typeText(value)
            XCTAssertEqual(field.value as? String, value)
        }
        replace("ws://external.example.test"); app.buttons["save-relay"].tap()
        XCTAssertTrue(app.staticTexts["relay-error"].waitForExistence(timeout: 5))
        replace("wss://relay.example.test"); app.buttons["save-relay"].tap()
        XCTAssertTrue(app.buttons["edit-relay-" + personal].waitForExistence(timeout: 5)); app.buttons["edit-relay-" + personal].tap()
        XCTAssertEqual(field.value as? String, "ws://127.0.0.1:1"); app.buttons["Cancel"].tap(); app.buttons["Done"].tap()
        XCTAssertTrue(picker.label.contains("Alpha Mac"))
        app.terminate(); app.launchArguments = []; app.launch()
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); picker.tap(); app.buttons["Manage computers"].tap(); app.buttons["edit-relay-" + work].tap()
        XCTAssertEqual(field.value as? String, "wss://relay.example.test")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Edit relay without replacing pairing"; shot.lifetime = .keepAlways; add(shot)
    }
}


extension RemoteUITests {
    @MainActor func testSelectedMacProviderUsageMetersAndResetDetails() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with:data) as! [String:Any]
        let app=XCUIApplication();app.launchArguments=["--reset-pairing"];app.launch()
        let link=app.textFields["pairing-link"];XCTAssertTrue(link.waitForExistence(timeout:15));link.tap();link.typeText(fixture["code"] as! String);app.buttons["pair-mac"].tap()
        let codex=app.buttons["usage-codex"];XCTAssertTrue(codex.waitForExistence(timeout:20))
        let loaded=NSPredicate(format:"label CONTAINS %@", "41%")
        await fulfillment(of: [expectation(for:loaded,evaluatedWith:codex)],timeout:20)
        app.buttons["toggle-provider-usage"].tap();XCTAssertFalse(codex.exists)
        app.buttons["toggle-provider-usage"].tap();XCTAssertTrue(codex.exists)
        app.buttons["provider-usage-details"].tap()
        XCTAssertTrue(app.staticTexts["Synthetic account allowance"].firstMatch.waitForExistence(timeout:10))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format:"label BEGINSWITH %@", "Resets ")).firstMatch.exists)
        let shot=XCTAttachment(screenshot:app.screenshot());shot.name="Native selected-Mac provider usage";shot.lifetime = .keepAlways;add(shot)
    }
}

extension RemoteUITests {
    @MainActor func testNativeLifeNutritionCardsAndFormsWithoutMacConnection() throws {
        let app=XCUIApplication();app.launchArguments=["--synthetic-life","--reset-pairing"];app.launch()
        let life=app.buttons["Life"].firstMatch;XCTAssertTrue(life.waitForExistence(timeout:20));life.tap()
        let nutrition=app.buttons["Nutrition"].firstMatch
        if !nutrition.exists {app.navigationBars.buttons.firstMatch.tap()}
        XCTAssertTrue(nutrition.waitForExistence(timeout:10));nutrition.tap()
        XCTAssertTrue(app.staticTexts["This month"].waitForExistence(timeout:10))
        app.swipeUp()
        XCTAssertTrue(app.staticTexts["Last 30 calendar days"].waitForExistence(timeout:10))
        let screenshot=XCTAttachment(screenshot:app.screenshot());screenshot.name="Native Life nutrition period cards";screenshot.lifetime = .keepAlways;add(screenshot)
        app.swipeDown();app.swipeDown()
        let add=app.buttons["Add food"];XCTAssertTrue(add.waitForExistence(timeout:10));add.tap()
        let name=app.textFields["Food name *"];XCTAssertTrue(name.waitForExistence(timeout:10));name.tap();name.typeText("Synthetic new food")
        for field in ["Calories *","Protein *","Carbs *","Fat *"]{let input=app.textFields[field];input.tap();input.typeText("10")}
        app.buttons["life-save-record"].tap()
        XCTAssertTrue(app.buttons["Add food"].waitForExistence(timeout:10))
        XCTAssertFalse(app.staticTexts["life-form-error"].exists)
    }
}


extension RemoteUITests {
    @MainActor func testLifeIsOptionalAndSetupWorksWithoutMac() {
        let app=XCUIApplication();app.launchArguments=["--reset-pairing"];app.launch()
        let setup=app.buttons["app-setup"];XCTAssertTrue(setup.waitForExistence(timeout:15));setup.tap()
        let toggle=app.switches["show-life"];XCTAssertTrue(toggle.waitForExistence(timeout:10))
        if toggle.value as? String == "1" { toggle.coordinate(withNormalizedOffset: CGVector(dx:0.9,dy:0.5)).tap() }
        app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["Life"].firstMatch.exists)
        setup.tap();toggle.coordinate(withNormalizedOffset: CGVector(dx:0.9,dy:0.5)).tap();XCTAssertEqual(toggle.value as? String,"1");app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["Life"].firstMatch.waitForExistence(timeout:5))
        app.buttons["Life"].firstMatch.tap()
        XCTAssertTrue(app.buttons["life-sign-in"].waitForExistence(timeout:10))
        app.buttons["Home"].firstMatch.tap();setup.tap();toggle.coordinate(withNormalizedOffset: CGVector(dx:0.9,dy:0.5)).tap();app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["Life"].firstMatch.exists)
    }
}


extension RemoteUITests {
    @MainActor func testNativeParityNavigationAndCollapsedAllowance() throws {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20))
        let toggle = app.buttons["toggle-provider-usage"].firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        if app.buttons["usage-codex"].exists { toggle.tap() }
        XCTAssertFalse(app.buttons["usage-codex"].exists)
        XCTAssertFalse(app.buttons["provider-usage-details"].exists)
        toggle.tap(); XCTAssertTrue(app.buttons["usage-codex"].exists)
        func area(_ name: String) { if app.tabBars.buttons[name].exists { app.tabBars.buttons[name].tap() } else { app.buttons[name].firstMatch.tap() } }
        area("Chats"); XCTAssertTrue(app.staticTexts["New chats execute on Alpha Mac. Viewing another computer’s history does not change that destination."].waitForExistence(timeout: 10))
        if app.tabBars.firstMatch.exists { XCTAssertFalse(app.buttons["toggle-provider-usage"].exists) }
        area("Team"); XCTAssertTrue(app.buttons["Connect shared Team tools"].waitForExistence(timeout: 10))
        area("Engine Room"); XCTAssertTrue(app.buttons["Resources"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["Resources"].firstMatch.tap(); XCTAssertTrue(app.staticTexts["CPU and RAM are reported by the host. Tabs may share a process; shared memory is not counted as per-tab memory."].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Native parity engine resources"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
}

extension RemoteUITests {
    @MainActor func testCompletedMessageCopySpeechPauseSeekAndLeaveChat() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); app.buttons["new-chat"].tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Reading controls test")
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        if app.buttons["composer-preview"].waitForExistence(timeout: 8) { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]; reply.tap()
        reply.typeText(String(repeating: "Read this completed response while the playback controls remain available for pause, resume and seeking. ", count: 4))
        app.buttons["Send feedback"].tap()
        let completed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", "Send message"), object: app.buttons["send-message"])
        await fulfillment(of: [completed], timeout: 20)
        guard app.buttons["send-message"].label == "Send message" else { XCTFail("Rehearsal did not complete"); return }
        let copies = app.buttons.matching(identifier: "copy-message")
        XCTAssertTrue(copies.firstMatch.waitForExistence(timeout: 15))
        let copy = copies.element(boundBy: copies.count - 1)
        for _ in 0..<6 { if copy.isHittable { break }; app.swipeDown() }
        copy.tap(); XCTAssertEqual(copy.label, "Message copied")
        let readers = app.buttons.matching(identifier: "read-aloud")
        let read = readers.element(boundBy: readers.count - 1)
        read.tap(); XCTAssertEqual(read.label, "Stop reading aloud")
        let pause = app.buttons["pause-reading"]; XCTAssertTrue(pause.waitForExistence(timeout: 5))
        pause.tap(); XCTAssertEqual(pause.label, "Resume reading aloud")
        let position = app.sliders["reading-position"]; XCTAssertTrue(position.exists)
        position.adjust(toNormalizedSliderPosition: 0.55)
        XCTAssertEqual(pause.label, "Resume reading aloud", "Seeking while paused must not start speech")
        pause.tap(); XCTAssertEqual(pause.label, "Pause reading aloud")
        pause.tap()
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Completed message copy and paused reading position"; shot.lifetime = .keepAlways; add(shot)
        read.tap(); XCTAssertEqual(read.label, "Read aloud"); XCTAssertFalse(position.exists)
        read.tap(); XCTAssertEqual(read.label, "Stop reading aloud")
        app.navigationBars.buttons.firstMatch.tap()
        let row = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ AND label CONTAINS %@", "Reading controls test", "Turn complete")).firstMatch
        guard row.waitForExistence(timeout: 10) else { XCTFail("Completed chat row missing"); return }; row.tap()
        XCTAssertTrue(app.buttons["read-aloud"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label == %@", "Stop reading aloud")).firstMatch.exists, "Leaving the chat must stop its speech")
    }
}


extension RemoteUITests {
    @MainActor func testEnterSendsNewChatAndFeedback() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); app.buttons["new-chat"].tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Synthetic Enter send"); app.keyboards.buttons["Send"].tap()
        XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        if app.buttons["composer-preview"].waitForExistence(timeout: 8) { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]; reply.tap(); reply.typeText("Synthetic Enter feedback"); app.keyboards.buttons["Send"].tap()
        let completed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", "Send message"), object: app.buttons["send-message"])
        await fulfillment(of: [completed], timeout: 20)
    }
}

extension RemoteUITests {
    @MainActor func testBrowserDownloadSettingsAndHistory() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
        let engine = app.tabBars.buttons["Engine Room"]
        if engine.waitForExistence(timeout: 10) { engine.tap() } else { app.buttons["Engine Room"].firstMatch.tap() }
        let settings = app.buttons.matching(identifier: "Browser settings").allElementsBoundByIndex.last!
        XCTAssertTrue(settings.waitForExistence(timeout: 8)); settings.tap()
        XCTAssertTrue(app.buttons["Choose download folder"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Open downloads folder"].exists)
        app.buttons["Download history"].tap(); XCTAssertTrue(app.navigationBars["Downloads"].waitForExistence(timeout: 8)); app.buttons["Done"].firstMatch.tap()
    }
}

extension RemoteUITests {
    @MainActor func testNativeBrowserDownloadsAnAttachment() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20)); app.buttons["Team"].firstMatch.tap(); openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("http://127.0.0.1:4329/browser/downloads"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Native downloads fixture"].waitForExistence(timeout: 15)); app.webViews.links["Download native fixture"].tap()
        app.buttons["Downloads"].firstMatch.tap(); XCTAssertTrue(app.navigationBars["Downloads"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["native-fixture.txt"].firstMatch.waitForExistence(timeout: 15)); XCTAssertTrue(app.staticTexts["completed"].firstMatch.waitForExistence(timeout: 15)); XCTAssertTrue(app.buttons["Open or share"].firstMatch.exists)
    }
}

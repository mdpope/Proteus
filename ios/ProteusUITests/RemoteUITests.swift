import XCTest

final class RemoteUITests: XCTestCase {
    override func setUp() { super.setUp(); continueAfterFailure = false }
    @MainActor func testActualSimulatorLocalNotificationTapRoutesThroughSpringBoard() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        let button = app.buttons["Schedule iOS notification fixture"]
        for _ in 0..<4 where !button.exists { app.swipeUp() }
        XCTAssertTrue(button.waitForExistence(timeout: 12))
        button.tap()
        let permission = XCUIApplication(bundleIdentifier: "com.apple.springboard").alerts.firstMatch
        if permission.waitForExistence(timeout: 3) { permission.buttons["Allow"].tap() }
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let banner = springboard.staticTexts["Proteus route fixture"]
        XCTAssertTrue(banner.waitForExistence(timeout: 15), "iOS must deliver a real local notification through SpringBoard")
        banner.tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15), "Tapping the OS notification should open the routed chat")
    }
    @MainActor func testActualSimulatorForegroundNotificationBannerTapRoutesChat() {
        let app = XCUIApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        let button = app.buttons["Schedule iOS notification fixture"]
        for _ in 0..<4 where !button.exists { app.swipeUp() }
        XCTAssertTrue(button.waitForExistence(timeout: 12)); button.tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let permission = springboard.alerts.firstMatch
        if permission.waitForExistence(timeout: 3) { permission.buttons["Allow"].tap() }
        let banner = springboard.staticTexts["Proteus route fixture"]
        XCTAssertTrue(banner.waitForExistence(timeout: 15), "iOS must present the local notification while Proteus is open")
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
        XCTAssertTrue(app.alerts.staticTexts["This chat is not cached on this device. Reconnect the Mac and open it from Chats."].exists)
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
        app.typeKey(XCUIKeyboardKey.escape, modifierFlags: [])
        XCTAssertTrue(open.waitForExistence(timeout: 10))
        open.tap()
        XCTAssertTrue(app.images["Attachment image preview"].waitForExistence(timeout: 10))
        app.buttons["Close preview"].tap()
        XCTAssertTrue(open.waitForExistence(timeout: 10))
        open.tap()
        XCTAssertTrue(app.images["Attachment image preview"].waitForExistence(timeout: 10))
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.5)).tap()
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
        mainAdd.tap(); app.buttons["Browser"].firstMatch.tap()
        let mainTabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "shell-tab-"))
        XCTAssertTrue(mainTabs.firstMatch.waitForExistence(timeout: 10))
        let mainID = mainTabs.element(boundBy: mainTabs.count - 1).identifier
        app.buttons["Team"].firstMatch.tap()
        app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser"].firstMatch.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-tab-select-")).firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons[mainID].exists)
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons[mainID].waitForExistence(timeout: 12))
        XCTAssertTrue(app.staticTexts["Welcome to Proteus"].exists)
        XCTAssertEqual(app.webViews.count, 0, "Restored browser descriptors must remain unloaded on launch")
        app.buttons[mainID].tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 10))
    }
    @MainActor func testIPadMainTabStripKeepsExactScrollPositionAcrossTabAndSidebarSelection() {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let plus = app.buttons["new-main-browser-tab"]
        XCTAssertTrue(plus.waitForExistence(timeout: 12))
        for _ in 0..<12 { plus.tap(); app.buttons["Browser"].firstMatch.tap() }
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
    @MainActor func testBrowserGoKeepsTabAndToolbarTracksBackForwardRefresh() {
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        XCTAssertTrue(app.staticTexts["Welcome to Proteus"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20), "Synthetic Alpha Mac must be selected before browser navigation")
        if app.tabBars.buttons["Team"].exists { app.tabBars.buttons["Team"].tap() } else { app.buttons["Team"].firstMatch.tap() }
        if !app.textFields["browser-address"].waitForExistence(timeout: 2) { app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser"].firstMatch.tap() }
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 15))
        let tabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "browser-tab-select-"))
        let startingCount = tabs.count
        XCTAssertGreaterThanOrEqual(startingCount, 1)
        let originalID = tabs.matching(NSPredicate(format: "value == %@", "Active")).firstMatch.identifier
        address.tap(); address.typeText("http://127.0.0.1:4329/browser/one"); app.buttons["browser-go"].tap()
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
        app.buttons["browser-new-tab"].tap(); app.buttons["Browser"].firstMatch.tap(); XCTAssertEqual(tabs.count, startingCount + 1)
        XCTAssertEqual(app.buttons[originalID].value as? String, "Inactive")
        app.buttons[originalID].tap()
        XCTAssertTrue(app.webViews.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.buttons[originalID].value as? String, "Active")
        XCTAssertTrue(app.buttons["browser-back"].isEnabled)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Native browser toolbar and active tab"; screenshot.lifetime = .keepAlways; add(screenshot)
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
    @MainActor private func showChats(_ app: XCUIApplication) { XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 25)); if app.tabBars.buttons["Chats"].exists { app.tabBars.buttons["Chats"].tap() } else { app.buttons["Chats"].firstMatch.tap() } }
    @MainActor func testExpandableToolOutput() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Tool display rehearsal")
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        let tool = app.buttons["tool-activity-synthetic-read"]
        for _ in 0..<8 { if tool.exists && tool.isHittable { break }; app.swipeDown() }
        XCTAssertTrue(tool.waitForExistence(timeout: 10)); tool.tap()
        XCTAssertTrue(app.staticTexts["Expanded synthetic tool result"].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Expanded tool activity"; screenshot.lifetime = .keepAlways; add(screenshot)
        if app.buttons["stop-turn"].exists { app.buttons["stop-turn"].tap() }
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
        XCTAssertTrue(app.buttons["composer-model"].exists)
        XCTAssertTrue(app.buttons["composer-context"].exists)
        XCTAssertTrue(app.buttons["steer-message"].exists); XCTAssertFalse(app.buttons["steer-message"].isEnabled)
        XCTAssertTrue(app.buttons["stop-turn"].exists)
        app.buttons["composer-effort"].tap(); app.buttons["high"].tap()
        let reply = app.textFields["reply-text"]; reply.tap(); reply.typeText("Queued with new effort")
        app.buttons["send-message"].tap()
        XCTAssertTrue(app.buttons["Remove"].waitForExistence(timeout: 10))
        let (queued, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/latest")!)
        let queuedValue = try JSONSerialization.jsonObject(with: queued) as! [String: Any]
        XCTAssertEqual(queuedValue["reasoningEffort"] as? String, "none")
        let messages = queuedValue["queuedMessages"] as! [[String: Any]]
        XCTAssertEqual((messages.first?["modelOptions"] as? [String: Any])?["reasoningEffort"] as? String, "high")
        let composerShot = XCTAttachment(screenshot: app.screenshot()); composerShot.name = "Compact composer menus and separate actions"; composerShot.lifetime = .keepAlways; add(composerShot)
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
        let login = app.buttons["Sign in on Mac"]
        XCTAssertTrue(login.waitForExistence(timeout: 10))
        // XCTest can report a control as hittable while the bottom composer covers it.
        for _ in 0..<5 { if login.isHittable && login.frame.maxY < app.frame.height * 0.7 { break }; app.swipeUp() }
        XCTAssertTrue(login.isEnabled); login.tap()
        let status = app.staticTexts["mcp-status-message"]
        let connected = NSPredicate(format: "label CONTAINS %@", "Connected to synthetic-integration")
        let completed = expectation(for: connected, evaluatedWith: status); await fulfillment(of: [completed], timeout: 20)
        XCTAssertFalse(app.buttons["Sign in on Mac"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Automatic MCP connection refresh"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["stop-turn"].tap()
    }
}

extension RemoteUITests {
    @MainActor func testMacDestinationPickerRenameAndIndependentForget() throws {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations"]; app.launch()
        let picker = app.buttons["destination-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); XCTAssertTrue(picker.label.contains("Alpha Mac"))
        picker.tap(); app.buttons["Beta Mac"].tap()
        XCTAssertTrue(picker.label.contains("Beta Mac"))
        picker.tap(); app.buttons["Manage Macs"].tap()
        let workID = "10000000-0000-4000-8000-000000000002"
        app.buttons["rename-" + workID].tap(); let field = app.alerts.textFields.firstMatch
        field.tap(); field.typeText(" 2"); let renamed = try XCTUnwrap(field.value as? String)
        XCTAssertNotEqual(renamed, "Beta Mac")
        app.alerts.buttons["Save"].tap(); XCTAssertTrue(app.staticTexts[renamed].waitForExistence(timeout: 5))
        app.buttons["forget-" + workID].tap(); app.buttons["Forget Mac"].tap()
        XCTAssertFalse(app.staticTexts[renamed].exists); XCTAssertTrue(app.staticTexts["Alpha Mac"].exists)
        app.buttons["Done"].tap(); XCTAssertTrue(picker.label.contains("Alpha Mac"))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Independent Mac destinations"; shot.lifetime = .keepAlways; add(shot)
    }
}


extension RemoteUITests {
    @MainActor func testEditRelayForOneSavedMacPersistsWithoutRepairing() throws {
        let app = XCUIApplication(); app.launchArguments = ["--synthetic-destinations"]; app.launch()
        let picker = app.buttons["destination-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); picker.tap(); app.buttons["Manage Macs"].tap()
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
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); picker.tap(); app.buttons["Manage Macs"].tap(); app.buttons["edit-relay-" + work].tap()
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
        area("Chats"); XCTAssertTrue(app.staticTexts["New chats execute on Alpha Mac. Viewing another Mac’s history does not change that destination."].waitForExistence(timeout: 10))
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

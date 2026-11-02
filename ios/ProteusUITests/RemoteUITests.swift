import XCTest

/// A settings shortcut only: no account change, pairing code or credential is entered.
final class PasswordAutoFillPreviewUITests: XCTestCase {
    @MainActor func testSystemAutoFillSettingsEntry() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        if app.buttons["phone-app-navigation"].waitForExistence(timeout: 6) {
            app.buttons["phone-app-navigation"].tap()
            let engine = app.buttons["phone-nav-Engine Room"]
            for _ in 0..<6 { if engine.isHittable { break }; app.scrollViews["phone-navigation-drawer"].swipeUp() }
            XCTAssertTrue(engine.waitForExistence(timeout: 5)); engine.tap()
        } else {
            let engine = app.buttons["sidebar-Engine Room"]
            XCTAssertTrue(engine.waitForExistence(timeout: 15)); engine.tap()
        }
        let settings = app.buttons.matching(identifier: "Browser settings").allElementsBoundByIndex.last!
        let strip = app.scrollViews["engine-sections"]
        for _ in 0..<6 {
            if settings.frame.minX >= 0 && settings.frame.maxX <= app.frame.width && settings.frame.width > 0 { break }
            let origin = app.coordinate(withNormalizedOffset: .zero), y = strip.frame.maxY - 20
            origin.withOffset(CGVector(dx: app.frame.width * 0.85, dy: y)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: app.frame.width * 0.15, dy: y)))
        }
        XCTAssertTrue(settings.waitForExistence(timeout: 5)); settings.tap()
        let shortcut = app.buttons["password-autofill-settings"]
        for _ in 0..<8 { if shortcut.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(shortcut.waitForExistence(timeout: 5)); shortcut.tap()
        let systemSettings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        XCTAssertTrue(systemSettings.wait(for: .runningForeground, timeout: 10))
        app.activate()
        XCTAssertTrue(shortcut.waitForExistence(timeout: 10))
    }
}

private let nativeFixtureHTTPOrigin = ProcessInfo.processInfo.environment["PROTEUS_TEST_HTTP_ORIGIN"] ?? ProcessInfo.processInfo.environment["TEST_RUNNER_PROTEUS_TEST_HTTP_ORIGIN"] ?? "http://127.0.0.1:4329"
private let nativeFixtureRelayOrigin = ProcessInfo.processInfo.environment["PROTEUS_TEST_RELAY_ORIGIN"] ?? ProcessInfo.processInfo.environment["TEST_RUNNER_PROTEUS_TEST_RELAY_ORIGIN"] ?? "ws://127.0.0.1:4328"
@MainActor private func nativeFixtureApplication() -> XCUIApplication {
    let app = XCUIApplication()
    app.launchEnvironment["PROTEUS_TEST_HTTP_ORIGIN"] = nativeFixtureHTTPOrigin
    app.launchEnvironment["PROTEUS_TEST_RELAY_ORIGIN"] = nativeFixtureRelayOrigin
    return app
}
@MainActor private func openNotificationFixtureHome(_ app: XCUIApplication) {
    if let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) {
        navigation.tap()
        let home = app.buttons["phone-nav-Home"]
        XCTAssertTrue(home.waitForExistence(timeout: 8)); home.tap()
    } else if app.buttons["sidebar-Home"].exists { app.buttons["sidebar-Home"].tap() }
    else { app.tabBars.buttons["Home"].tap() }
}

/// Pairs through the visible Connections form. Visited phone areas stay mounted and a
/// restored area can hide the form, so reveal Connections first when needed.
@MainActor private func submitPairing(_ app: XCUIApplication, code: String) {
    func visible() -> XCUIElement? { app.descendants(matching: .any).matching(identifier: "pairing-link").allElementsBoundByIndex.first { $0.isHittable } }
    _ = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch.waitForExistence(timeout: 15)
    if visible() == nil, let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) {
        navigation.tap(); app.buttons["phone-nav-Engine Room"].tap()
        _ = app.buttons["Connections"].firstMatch.waitForExistence(timeout: 5)
        app.buttons.matching(NSPredicate(format: "label == %@", "Connections")).allElementsBoundByIndex.first(where: { $0.isHittable })?.tap()
    }
    for _ in 0..<4 where visible() == nil { app.swipeUp() }
    guard let field = visible() else { XCTFail("The Connections pairing form is visible"); return }
    field.tap(); field.typeText(code)
    if app.buttons["Hide keyboard"].exists { app.buttons["Hide keyboard"].tap() }
    let pair = app.buttons["pair-mac"]
    for _ in 0..<4 where !pair.exists || !pair.isHittable { app.swipeUp() }
    XCTAssertTrue(pair.waitForExistence(timeout: 5)); pair.tap()
}

/// Live acceptance may target an already-installed normal/preview app while the
/// runner and synthetic fixtures retain their separate test identity.
@MainActor private func nativeLiveSimulatorApplication() throws -> XCUIApplication {
    guard let bundle = ProcessInfo.processInfo.environment["PROTEUS_LIVE_SIMULATOR_BUNDLE"] else { return XCUIApplication() }
    guard ["org.proteusapp.proteus.mobile", "org.proteusapp.review.proteus.iphone-preview", "org.proteusapp.review.proteus.ipad-preview"].contains(bundle) else {
        throw XCTSkip("Live simulator acceptance requires a known explicitly selected Proteus app")
    }
    return XCUIApplication(bundleIdentifier: bundle)
}

final class RemoteUITests: XCTestCase {
    @MainActor func testLiveSimulatorSavedOwnerReconnect() throws {
        guard let bridge = ProcessInfo.processInfo.environment["PROTEUS_LIVE_SIMULATOR_BRIDGE"],
              URL(string: bridge)?.host == "127.0.0.1" else {
            throw XCTSkip("Requires explicit live simulator acceptance")
        }
        #if targetEnvironment(simulator)
        let app = try nativeLiveSimulatorApplication(); app.launchArguments = []; app.launch()
        openNotificationFixtureHome(app)
        let pickers = app.buttons.matching(identifier: "destination-picker")
        XCTAssertTrue(pickers.firstMatch.waitForExistence(timeout: 10), "The saved owner remains selected")
        let visible: (XCUIElement) -> Bool = { $0.isHittable && $0.frame.minX.isFinite && $0.frame.minY.isFinite && !$0.frame.isEmpty }
        let picker = try XCTUnwrap(pickers.allElementsBoundByIndex.last(where: visible))
        picker.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let menus = app.buttons.matching(NSPredicate(format: "label == %@", "Manage computers"))
        XCTAssertTrue(menus.firstMatch.waitForExistence(timeout: 5))
        let manage = try XCTUnwrap(menus.allElementsBoundByIndex.last(where: visible))
        manage.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertTrue(app.navigationBars["Computers"].waitForExistence(timeout: 10))
        let connected = app.staticTexts.matching(NSPredicate(format: "label == %@", "Connected")).firstMatch
        XCTAssertTrue(connected.waitForExistence(timeout: 30), "A normal cold launch reconnects using the saved pairing")
        #else
        throw XCTSkip("Live acceptance is restricted to simulators")
        #endif
    }

    /// Explicit live simulator acceptance only. No synthetic launch/reset, chat
    /// writes, pairing-key export or persistent permission changes are performed.
    @MainActor func testLiveSimulatorOwnerConnection() async throws {
        guard let bridge = ProcessInfo.processInfo.environment["PROTEUS_LIVE_SIMULATOR_BRIDGE"],
              let origin = URL(string: bridge), origin.host == "127.0.0.1" else {
            throw XCTSkip("Requires an explicitly authorized loopback live-owner pairing bridge")
        }
        #if targetEnvironment(simulator)
        let app = try nativeLiveSimulatorApplication()
        app.launchArguments = []
        app.launch()
        // The bridge creates one invitation through the selected running owner's
        // normal API. Live test diagnostics must remain private and redact links.
        let (data, _) = try await URLSession.shared.data(from: origin.appendingPathComponent("pair"))
        let response = try JSONSerialization.jsonObject(with: data) as! [String: String]
        let link = try XCTUnwrap(URL(string: try XCTUnwrap(response["code"])))
        XCTAssertEqual(link.scheme, "proteus"); XCTAssertEqual(link.host, "pair")
        // Use XCTest's documented, bundle-targeted open rather than a URL
        // launch from the runner process (which iOS refuses as untrusted).
        app.open(link)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for _ in 0..<10 {
            let alert = springboard.alerts.matching(NSPredicate(format: "label CONTAINS %@", "Proteus")).firstMatch
            if alert.exists, alert.buttons["Open"].exists { alert.buttons["Open"].tap(); break }
            try await Task.sleep(for: .milliseconds(300))
        }
        app.activate()
        let success = app.staticTexts["pairing-success"]
        XCTAssertTrue(success.waitForExistence(timeout: 30), "The real owner completes authenticated pairing")
        let connected = app.staticTexts.matching(NSPredicate(format: "label == %@", "Connected")).firstMatch
        XCTAssertTrue(connected.waitForExistence(timeout: 15), "Connections shows an authenticated live transport")
        #else
        throw XCTSkip("Live acceptance is restricted to simulators")
        #endif
    }

    @MainActor func testNativeRecoveryRetriesOnlyAfterMinuteAndRetainsDraftAndQueue() async throws {
        let request = URLRequest(url: URL(string: "\(nativeFixtureHTTPOrigin)/pair?recovery=1")!, cachePolicy: .reloadIgnoringLocalCacheData)
        let (data, _) = try await URLSession.shared.data(for: request)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String))
        if app.buttons["Hide keyboard"].exists { app.buttons["Hide keyboard"].tap() }
        let pair = app.buttons["pair-mac"]; for _ in 0..<4 where !pair.isHittable { app.swipeUp() }; pair.tap(); showChats(app)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Native recovery fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20)); row.tap()
        let retry = app.buttons["chat-recovery-retry"]
        XCTAssertTrue(retry.waitForExistence(timeout: 15)); XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Activity ·")).firstMatch.exists)
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        let editor = app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch
        XCTAssertTrue(editor.waitForExistence(timeout: 10)); editor.tap(); editor.typeText("Unsent native recovery draft")
        // An arbitrary transcript tap can expand loaded-context details on iPad,
        // moving the earlier failure controls offscreen while dismissing the keyboard.
        if app.buttons["Hide keyboard"].exists { app.buttons["Hide keyboard"].tap() }
        let transcript = app.scrollViews["chat-conversation-scroll"]
        for _ in 0..<6 where !retry.isHittable { transcript.swipeDown() }
        XCTAssertTrue(retry.isHittable, "Recovery must remain reachable after composing an unsent draft")
        retry.tap(); let start = Date()
        let stop = app.buttons["chat-recovery-stop-retry"]; XCTAssertTrue(stop.waitForExistence(timeout: 10))
        let failure = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Synthetic native retry.")).firstMatch
        XCTAssertTrue(failure.waitForExistence(timeout: 75)); XCTAssertGreaterThan(Date().timeIntervalSince(start), 59)
        XCTAssertTrue(stop.waitForExistence(timeout: 10)); stop.tap()
        XCTAssertTrue(retry.waitForExistence(timeout: 10))
        let (stateData, _) = try await URLSession.shared.data(for: URLRequest(url: URL(string: "\(nativeFixtureHTTPOrigin)/recovery-status")!, cachePolicy: .reloadIgnoringLocalCacheData))
        let state = try JSONSerialization.jsonObject(with: stateData) as! [String: Any]
        XCTAssertEqual(state["attempts"] as? Int, 1)
        XCTAssertEqual((state["queue"] as? [[String: Any]])?.first?["id"] as? String, "native-recovery-queue")
        app.buttons["chat-recovery-continue"].tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Recovered native fixture: Native queued follow-up")).firstMatch.waitForExistence(timeout: 20))
        if app.buttons["composer-preview"].exists { XCTAssertEqual(app.buttons["composer-preview"].value as? String, "Unsent native recovery draft") }
        else { XCTAssertEqual(editor.value as? String, "Unsent native recovery draft") }
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Native recovery completed with draft retained"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testPairingShowsSuccessInConnectionsAndDismissesAddComputer() async throws {
        func invitation(_ suffix: String = "") async throws -> String {
            let request = URLRequest(url: URL(string: "\(nativeFixtureHTTPOrigin)/pair" + suffix)!, cachePolicy: .reloadIgnoringLocalCacheData)
            let (data, _) = try await URLSession.shared.data(for: request)
            return try XCTUnwrap((JSONSerialization.jsonObject(with: data) as? [String: Any])?["code"] as? String)
        }
        let first = try await invitation()
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        func submit(_ code: String) {
            XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(code)
            let keyboard = app.buttons["Hide keyboard"]
            if keyboard.exists { keyboard.tap() }
            let pair = app.buttons["pair-mac"]
            for _ in 0..<4 where !pair.exists || !pair.isHittable { app.swipeUp() }
            XCTAssertTrue(pair.waitForExistence(timeout: 5)); pair.tap()
        }
        submit(first)
        let success = app.descendants(matching: .any).matching(identifier: "pairing-success").firstMatch
        XCTAssertTrue(success.waitForExistence(timeout: 25))
        XCTAssertTrue(app.buttons["Add computer"].exists, "Success must land on Connections")
        let second = try await invitation("?host=second")
        app.buttons["Add computer"].tap()
        submit(second)
        XCTAssertTrue(success.waitForExistence(timeout: 25))
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: link)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 10), .completed)
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "relay refused")).firstMatch.exists)
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "select-")).count, 2)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Pairing success and retained computers in Connections"; shot.lifetime = .keepAlways; add(shot)
    }

    @MainActor func testNativeProjectsOwnerLifecycleAndScopedTabs() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair?projects=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let projectID = try XCTUnwrap(fixture["projectId"] as? String)
        let workspaceID = try XCTUnwrap(fixture["workspaceId"] as? String)
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String)); app.buttons["pair-mac"].tap()
        let nav = app.buttons["sidebar-Workspaces"]
        if nav.waitForExistence(timeout: 5) { nav.tap() }
        else { let workspaces = app.buttons["Workspaces"].firstMatch; for _ in 0..<6 where !workspaces.isHittable { app.swipeUp() }; XCTAssertTrue(workspaces.waitForExistence(timeout: 20)); workspaces.tap() }
        let studio = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Studio")).firstMatch
        XCTAssertTrue(studio.waitForExistence(timeout: 15)); studio.tap()
        XCTAssertTrue(app.buttons["workspace-page-Projects"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["workspace-page-Chats"].exists)
        XCTAssertTrue(app.buttons["workspace-page-Tabs"].exists)
        XCTAssertTrue(app.buttons["workspace-page-Configuration"].exists)
        app.buttons["project-open-" + projectID].tap()
        XCTAssertTrue(app.buttons["project-pinned-tab"].waitForExistence(timeout: 10))
        app.segmentedControls.buttons["Tabs"].tap()
        XCTAssertTrue(app.buttons["workspace-managed-title-native-project-browser"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["workspace-managed-title-native-direct-browser"].exists, "Project lists must exclude direct workspace resources")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Native project scoped tabs"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["Workspace"].firstMatch.tap()
        app.buttons["workspace-page-Projects"].tap()
        app.buttons["new-project"].tap()
        let field = app.textFields["project-name"]; XCTAssertTrue(field.waitForExistence(timeout: 5)); field.tap(); field.typeText("Release rehearsal")
        app.buttons["Save"].tap()
        let manage = app.buttons["Manage Release rehearsal"]; XCTAssertTrue(manage.waitForExistence(timeout: 10)); manage.tap()
        app.buttons["Set default"].tap()
        XCTAssertTrue(manage.waitForExistence(timeout: 10)); manage.tap()
        XCTAssertTrue(app.buttons["Rename"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Delete…"].exists, "The default project must be protected")
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.9)).tap()
        let dismissedMenu = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.buttons["Rename"])
        XCTAssertEqual(XCTWaiter.wait(for: [dismissedMenu], timeout: 5), .completed)
        app.buttons["Manage Design review"].tap()
        XCTAssertTrue(app.buttons["Delete…"].waitForExistence(timeout: 5)); app.buttons["Delete…"].tap()
        let confirm = app.buttons["Move contents and delete project"]; XCTAssertTrue(confirm.waitForExistence(timeout: 5)); confirm.tap()
        let disappeared = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.buttons["project-open-" + projectID])
        XCTAssertEqual(XCTWaiter.wait(for: [disappeared], timeout: 12), .completed)
        let (afterData, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/projects-fixture")!)
        let after = try JSONSerialization.jsonObject(with: afterData) as! [String: Any]
        let catalog = try XCTUnwrap(after["catalog"] as? [String: Any])
        let defaults = try XCTUnwrap(catalog["defaultProjectIds"] as? [String: String])
        let target = try XCTUnwrap(defaults[workspaceID])
        let memberships = try XCTUnwrap(catalog["memberships"] as? [String: [String: Any]])
        for id in try XCTUnwrap(fixture["chatIds"] as? [String]) { XCTAssertEqual(memberships[id]?["projectId"] as? String, target) }
        let resources = try XCTUnwrap(after["tabs"] as? [[String: Any]])
        let retainedResources = resources.filter { ["native-project-browser", "terminal:native-project-terminal"].contains($0["id"] as? String ?? "") }
        XCTAssertEqual(retainedResources.count, 2, "Both saved resources must survive project deletion")
        XCTAssertTrue(retainedResources.allSatisfy { $0["scopeId"] as? String == target })
        app.buttons["project-open-" + target].tap()
        XCTAssertTrue(app.buttons["project-pinned-tab"].waitForExistence(timeout: 10))
        let final = XCTAttachment(screenshot: app.screenshot()); final.name = "Native default project after preserved reassignment"; final.lifetime = .keepAlways; add(final)
    }
    /// Chats always open inside their project as named project tabs. Repeated A→B→A
    /// switches through Chats, the sidebar's open tabs and the project tab strip must
    /// keep the strip, sidebar and displayed conversation on the same chat.
    @MainActor func testProjectChatsOpenAsProjectTabsAndSwitchRepeatedly() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/projects-fixture")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let chatIDs = try XCTUnwrap(fixture["chatIds"] as? [String])
        // The app pairs itself with the synthetic owner's project fixture.
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--phone-preview-fixture"]; app.launch()
        let phone = UIDevice.current.userInterfaceIdiom == .phone
        func showChats() {
            if phone {
                let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first { $0.isHittable }
                XCTAssertNotNil(navigation, "Every phone page must reach the app drawer"); navigation?.tap()
                let chats = app.buttons["phone-nav-Chats"]; XCTAssertTrue(chats.waitForExistence(timeout: 8)); chats.tap()
            } else { let chats = app.buttons["sidebar-Chats"]; XCTAssertTrue(chats.waitForExistence(timeout: 8)); chats.tap() }
        }
        func openFromChats(_ title: String) {
            showChats()
            // Visited areas stay mounted; only a visible Chats row counts.
            let rows = app.buttons.matching(NSPredicate(format: "label CONTAINS %@ AND NOT (identifier BEGINSWITH %@) AND NOT (identifier BEGINSWITH %@)", title, "workspace-child-tab-", "scope-tab-"))
            _ = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Synthetic project notes")).firstMatch.waitForExistence(timeout: 15)
            func visible() -> XCUIElement? { rows.allElementsBoundByIndex.first { $0.isHittable } }
            for _ in 0..<8 where visible() == nil { app.swipeUp() }
            let row = visible(); XCTAssertNotNil(row, "Chats lists " + title); row?.tap()
        }
        func expectDisplayed(_ index: Int, _ title: String, _ step: String) {
            let tab = app.buttons["workspace-child-tab-chat:" + chatIDs[index]]
            XCTAssertTrue(tab.waitForExistence(timeout: 10), step + ": the chat is a named project tab")
            let selected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", "Selected"), object: tab)
            XCTAssertEqual(XCTWaiter.wait(for: [selected], timeout: 8), .completed, step + ": project tab strip selects the chat")
            // No chat header: the conversation itself is labelled with the displayed chat.
            let header = app.scrollViews["chat-conversation-scroll"]
            let shown = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", title), object: header)
            XCTAssertEqual(XCTWaiter.wait(for: [shown], timeout: 8), .completed, step + ": displayed conversation matches the selected tab")
            XCTAssertEqual(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier ENDSWITH %@", "shell-tab-", chatIDs[index])).count, 0, step + ": associated chats never become top-level tabs")
            let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = step; shot.lifetime = .keepAlways; add(shot)
        }
        let first = "Review desktop navigation refinements", second = "Synthetic project notes 3"
        openFromChats(first); expectDisplayed(0, first, "A from Chats")
        openFromChats(second); expectDisplayed(3, second, "B from Chats")
        // A through the sidebar's open tabs.
        if phone { app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first { $0.isHittable }?.tap() }
        let sidebarRow = app.buttons["scope-tab-chat:" + chatIDs[0]]
        XCTAssertTrue(sidebarRow.waitForExistence(timeout: 8), "The sidebar lists the project's open tabs")
        XCTAssertTrue(app.buttons["scope-tab-chat:" + chatIDs[3]].exists)
        let sidebarShot = XCTAttachment(screenshot: app.screenshot()); sidebarShot.name = "Sidebar project open tabs"; sidebarShot.lifetime = .keepAlways; add(sidebarShot)
        sidebarRow.tap(); expectDisplayed(0, first, "A from sidebar open tabs")
        // B and A through the top project tab strip, which remains visible.
        app.buttons["workspace-child-tab-chat:" + chatIDs[3]].tap(); expectDisplayed(3, second, "B from tab strip")
        app.buttons["workspace-child-tab-chat:" + chatIDs[0]].tap(); expectDisplayed(0, first, "A from tab strip")
        openFromChats(second); expectDisplayed(3, second, "B again from Chats")
    }
    /// Screenshot tour for design review: drawer/sidebar tree, workspace, project, chat and browser.
    @MainActor func testDesignTourScreenshots() async throws {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--phone-preview-fixture"]; app.launch()
        let phone = UIDevice.current.userInterfaceIdiom == .phone
        func shot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
        func drawer() { if phone, let n = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { n.tap(); sleep(1) } }
        sleep(6); shot("01 launch")
        drawer(); shot("02 drawer or sidebar")
        let studio = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-tree-open-", "Studio")).firstMatch
        if studio.waitForExistence(timeout: 10) { studio.tap(); sleep(2) }
        shot("03 after tapping Studio")
        drawer(); shot("04 drawer after Studio")
        let project = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "project-tree-open-", "Design review")).firstMatch
        if project.waitForExistence(timeout: 5) { project.tap(); sleep(2) }
        shot("05 project")
        let chat = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-child-tab-chat:")).firstMatch
        if chat.waitForExistence(timeout: 5) { chat.tap(); sleep(2) }
        shot("06 project chat")
        let browser = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-child-tab-", "Synthetic project browser")).firstMatch
        if browser.waitForExistence(timeout: 5) { browser.tap(); sleep(3) }
        shot("07 project browser")
        drawer(); shot("08 drawer from browser")
    }
    /// Operator-run tour against an already paired preview app and a real host (never part of CI).
    /// Set TEST_RUNNER_PROTEUS_REAL_HOST_BUNDLE and optionally TEST_RUNNER_PROTEUS_REAL_WORKSPACE.
    @MainActor func testRealHostTour() async throws {
        let env = ProcessInfo.processInfo.environment
        guard let bundle = env["PROTEUS_REAL_HOST_BUNDLE"], !bundle.isEmpty else { throw XCTSkip("Real-host tour needs a paired preview bundle.") }
        let app = XCUIApplication(bundleIdentifier: bundle); app.launchArguments = ["--native-design-preview"]
        // PROTEUS_REAL_ATTACH keeps the running process so a profiler can stay attached.
        if env["PROTEUS_REAL_ATTACH"] != nil { app.activate() } else { app.launch() }
        let phone = UIDevice.current.userInterfaceIdiom == .phone
        func shot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
        func timed(_ label: String, _ body: () -> Void) { let start = Date(); body(); NSLog("REALTOUR %@ %.0fms", label, Date().timeIntervalSince(start) * 1000) }
        func drawer() { if phone, let n = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { n.tap(); sleep(1) } }
        sleep(10); shot("01 launch")
        drawer(); shot("02 navigation")
        let name = env["PROTEUS_REAL_WORKSPACE"] ?? "Personal"
        let workspace = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label BEGINSWITH %@", "workspace-tree-open-", name)).firstMatch
        if workspace.waitForExistence(timeout: 15) { timed("open workspace") { workspace.tap() }; sleep(2) }
        shot("03 workspace")
        drawer(); shot("04 navigation after workspace")
        let project = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "project-tree-open-")).firstMatch
        if project.waitForExistence(timeout: 8) { timed("open project") { project.tap() }; sleep(3) }
        shot("05 project")
        let chat = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-child-tab-chat:")).allElementsBoundByIndex.first(where: \.isHittable)
        if let chat { timed("open chat") { chat.tap() }; sleep(2); shot("06 project chat"); chat.press(forDuration: 1.2); sleep(1); shot("07 chat tab menu"); app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)).tap(); sleep(1) }
        let browser = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND NOT (identifier BEGINSWITH %@)", "workspace-child-tab-", "workspace-child-tab-chat:")).allElementsBoundByIndex.first(where: \.isHittable)
        if let browser { timed("open browser") { browser.tap() }; sleep(3); shot("08 project browser")
            // Edge swipe back: WebKit history first, then the project home.
            let edge: CGFloat = phone ? 0 : 0.315, start = app.coordinate(withNormalizedOffset: CGVector(dx: edge, dy: 0.5)), end = app.coordinate(withNormalizedOffset: CGVector(dx: edge + 0.5, dy: 0.5))
            start.press(forDuration: 0.05, thenDragTo: end); sleep(2); shot("09 after edge swipe back")
        }
        let overview = app.buttons.matching(NSPredicate(format: "identifier IN %@", ["browser-tab-overview", "chat-tab-overview", "main-tab-overview-button"])).allElementsBoundByIndex.first(where: \.isHittable)
        if let overview { overview.tap(); sleep(2); shot("10 overview"); if app.buttons["Done"].exists { app.buttons["Done"].tap(); sleep(1) } }
        drawer(); shot("11 navigation at end")
    }
    /// Edge swipes in a project browser: back one page per swipe (WebKit's swipe at the iPhone
    /// screen edge, the content-edge backup beside the iPad sidebar), then the project home.
    @MainActor func testProjectBrowserEdgeSwipesWalkHistoryThenProjectHome() async throws {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--phone-preview-fixture", "--synthetic-browser-workspace", "--fixture-local-browsing"]; app.launch()
        let phone = UIDevice.current.userInterfaceIdiom == .phone
        func drawer() { if phone, let n = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { n.tap(); sleep(1) } }
        func shot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
        sleep(5); drawer()
        let studio = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-tree-open-", "Studio")).firstMatch
        XCTAssertTrue(studio.waitForExistence(timeout: 10)); studio.tap(); sleep(1); drawer()
        let project = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "project-tree-open-", "Design review")).firstMatch
        XCTAssertTrue(project.waitForExistence(timeout: 5)); project.tap(); sleep(2)
        let browser = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-child-tab-", "Synthetic project browser")).firstMatch
        XCTAssertTrue(browser.waitForExistence(timeout: 8)); browser.tap(); sleep(2)
        if app.buttons["Load tab"].exists { app.buttons["Load tab"].tap(); sleep(2) }
        let web = app.webViews.firstMatch
        if !web.staticTexts["First browser page"].waitForExistence(timeout: 15) { shot("first page missing") }
        XCTAssertTrue(web.staticTexts["First browser page"].exists)
        web.links["Next browser page"].tap(); XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        web.links["Next browser page"].tap(); XCTAssertTrue(web.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        let origin = app.coordinate(withNormalizedOffset: .zero), y = web.frame.midY
        let left = phone ? 2 : web.frame.minX + 24, right = phone ? app.frame.maxX - 2 : web.frame.maxX - 24
        func swipe(from x: CGFloat, by dx: CGFloat) { origin.withOffset(CGVector(dx: x, dy: y)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: x + dx, dy: y))); sleep(2) }
        swipe(from: left, by: 200); shot("back to second")
        XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 10), "One edge swipe moves exactly one history entry")
        XCTAssertFalse(web.staticTexts["First browser page"].exists, "WebKit's swipe and the backup never both move the page")
        swipe(from: right, by: -200)
        XCTAssertTrue(web.staticTexts["Third browser page"].waitForExistence(timeout: 10), "Forward keeps the forward entry")
        swipe(from: left, by: 200); swipe(from: left, by: 200)
        XCTAssertTrue(web.staticTexts["First browser page"].waitForExistence(timeout: 10))
        swipe(from: phone ? 2 : web.frame.minX + 24, by: 200); shot("history exhausted")
        XCTAssertTrue(app.segmentedControls.buttons["Chats"].waitForExistence(timeout: 8), "With history exhausted, back returns to the project home")
        XCTAssertTrue(app.buttons["New workspace tab"].exists, "The project stays open rather than popping to the workspace")
        // Operator-only: keep this run's screen recording (kept for failures) with a slow, held swipe.
        if ProcessInfo.processInfo.environment["PROTEUS_RECORD_SWIPE"] != nil {
            let browser = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-child-tab-", "First browser page")).firstMatch
            if browser.waitForExistence(timeout: 5) { browser.tap(); sleep(2) }
            web.links["Next browser page"].tap(); sleep(3)
            origin.withOffset(CGVector(dx: left, dy: y)).press(forDuration: 0.1, thenDragTo: origin.withOffset(CGVector(dx: left + 160, dy: y)), withVelocity: 120, thenHoldForDuration: 1.5); sleep(2)
            XCTFail("Recording retained for review")
        }
    }
    /// The project tab strip's + and close, and the browser bar's tab overview, act on tabs.
    @MainActor func testProjectTabControlsAct() async throws {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--phone-preview-fixture"]; app.launch()
        let phone = UIDevice.current.userInterfaceIdiom == .phone
        func drawer() { if phone, let n = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { n.tap(); sleep(1) } }
        func shot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
        sleep(5); drawer()
        let studio = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-tree-open-", "Studio")).firstMatch
        XCTAssertTrue(studio.waitForExistence(timeout: 10)); studio.tap(); sleep(1); drawer()
        let project = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "project-tree-open-", "Design review")).firstMatch
        XCTAssertTrue(project.waitForExistence(timeout: 5)); project.tap(); sleep(2)
        // No header bar: the sidebar button leads the project bar, and a chat tab's
        // press-and-hold menu carries the chat's actions.
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier IN %@", ["phone-app-navigation", "project-sidebar-toggle"])).allElementsBoundByIndex.contains { $0.isHittable }, "The project bar holds the sidebar button")
        XCTAssertFalse(app.staticTexts["chat-header-title"].exists)
        let chatTab = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-child-tab-chat:")).allElementsBoundByIndex.first { $0.isHittable }
        XCTAssertNotNil(chatTab, "The project has a chat tab"); chatTab?.press(forDuration: 1.2)
        // iPad presents context menu rows as menu items rather than buttons.
        let copyLink = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Copy chat link")).firstMatch
        if !copyLink.waitForExistence(timeout: 5) { print("Chat tab menu state: " + app.debugDescription) }
        XCTAssertTrue(copyLink.exists, "Press and hold shows chat actions"); XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Rename")).firstMatch.exists); shot("chat tab menu")
        copyLink.tap(); sleep(1)
        let tabs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-child-tab-"))
        let before = tabs.count
        let plus = app.buttons.matching(NSPredicate(format: "label == %@", "New workspace tab")).allElementsBoundByIndex.first { $0.isHittable }
        XCTAssertNotNil(plus, "The project tab strip has a visible + button"); plus?.tap(); sleep(2); shot("after +")
        XCTAssertEqual(tabs.count, before + 1, "+ adds a project tab")
        // Pick the close button beside the project's new tab (top-level tabs can share the label).
        let added = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label == %@", "workspace-child-tab-", "New tab")).allElementsBoundByIndex.first { $0.isHittable }
        let close = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Close New tab")).allElementsBoundByIndex.first { button in button.isHittable && added.map { tab in abs(button.frame.midY - tab.frame.midY) < 12 && button.frame.minX >= tab.frame.maxX - 4 } ?? true }
        XCTAssertNotNil(close, "The new tab has a close button"); close?.tap(); sleep(2); shot("after close")
        XCTAssertEqual(tabs.count, before, "Close removes the project tab")
        let browser = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-child-tab-", "Synthetic project browser")).firstMatch
        XCTAssertTrue(browser.waitForExistence(timeout: 5)); browser.tap(); sleep(2)
        let overview = app.buttons["browser-tab-overview"]
        XCTAssertTrue(overview.waitForExistence(timeout: 5)); overview.tap(); sleep(2); shot("overview")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "identifier IN %@", ["phone-tab-overview", "main-tab-overview"])).firstMatch.waitForExistence(timeout: 5), "Tab overview opens")
        // Tabs manager rows: Hide (menu on iPhone, button on iPad) and Close act on the owner.
        if app.buttons["Done"].exists { app.buttons["Done"].tap(); sleep(1) }
        let projectTab = app.buttons.matching(NSPredicate(format: "label == %@", "Design review")).allElementsBoundByIndex.first { $0.isHittable }
        projectTab?.tap(); sleep(1)
        let tabsPage = app.segmentedControls.buttons["Tabs"]
        if tabsPage.waitForExistence(timeout: 8) { tabsPage.tap() }
        let rows = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-managed-title-"))
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 10), "Tabs page lists tabs"); shot("tabs page")
        let count = rows.count
        let closeRow = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-managed-close-")).allElementsBoundByIndex.first { $0.isHittable }
        XCTAssertNotNil(closeRow, "Each tab row has a Close button"); closeRow?.tap(); sleep(3); shot("tabs after close")
        XCTAssertEqual(rows.count, count - 1, "Close removes the tab row")
    }
    @MainActor func testLogPaginationAndExpandedDiagnostics() async throws {
        let (seedData, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/logs-fixture")!)
        let seed = try JSONSerialization.jsonObject(with: seedData) as! [String: Any]
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
    @MainActor private func selectPickerOption(_ label: String, pickerID: String, in app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) -> Bool {
        let picker = app.buttons[pickerID]
        guard picker.waitForExistence(timeout: 10) else { XCTFail("Picker is missing: " + pickerID, file: file, line: line); return false }
        @MainActor func visibleBottom() -> CGFloat {
            let keyboard = app.keyboards.firstMatch
            var bottom = keyboard.exists ? keyboard.frame.minY : app.frame.maxY
            let predictions = app.otherElements["Typing Predictions"]
            if predictions.exists { bottom = min(bottom, predictions.frame.minY) }
            return bottom - 12
        }
        let form = app.collectionViews["new-chat-form"]
        for _ in 0..<8 {
            if picker.isHittable && picker.frame.maxY < visibleBottom() { break }
            guard form.exists else { break }
            form.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45))
                .press(forDuration: 0.05, thenDragTo: form.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)))
        }
        guard picker.isEnabled, picker.isHittable, picker.frame.maxY < visibleBottom() else {
            XCTFail("The complete picker row must be visible above the keyboard and its predictions", file: file, line: line); return false
        }
        // SwiftUI exposes the whole form row; the trailing value opens its menu.
        picker.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        let option = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
        guard option.waitForExistence(timeout: 10) else { XCTFail("Picker option is missing: " + label, file: file, line: line); return false }
        option.tap()
        let selected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label CONTAINS %@", label), object: picker)
        let result = XCTWaiter.wait(for: [selected], timeout: 5)
        XCTAssertEqual(result, .completed, "The picker must retain the selected option", file: file, line: line)
        return result == .completed
    }
    @MainActor private func setComposerSection(_ name: String, expanded: Bool, in popover: XCUIElement) -> Bool {
        let section = popover.buttons.matching(NSPredicate(format: "label == %@", name)).firstMatch
        guard section.waitForExistence(timeout: 10) else { XCTFail("Composer section is missing: " + name); return false }
        let desired = expanded ? "Expanded" : "Collapsed"
        if section.value as? String != desired {
            // Expanded DisclosureGroups include their choices in the AX frame.
            section.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: section.frame.width / 2, dy: min(9, section.frame.height / 2))).tap()
        }
        let state = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", desired), object: section)
        let result = XCTWaiter.wait(for: [state], timeout: 5)
        XCTAssertEqual(result, .completed, "Composer section must become " + desired)
        return result == .completed
    }
    @MainActor func testWorkspaceListCopyOpensIndependentConfiguration() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        XCTAssertTrue(app.buttons["workspace-page-Configuration"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["Workspace sources"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Sources across workspace"].exists)
        XCTAssertTrue(app.buttons["Workspace folders"].waitForExistence(timeout: 10)); app.buttons["Workspace folders"].tap()
        XCTAssertTrue(app.staticTexts["Commands start here. Other workspace folders remain available."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Command folder"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Workspace copy configuration"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["workspace-page-Chats"].tap()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat"]; app.launch()
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair?preview=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        if app.buttons["sidebar-Home"].waitForExistence(timeout: 3) { app.buttons["sidebar-Home"].tap() } else if app.buttons["Home"].exists { app.buttons["Home"].tap() }
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String); app.buttons["pair-mac"].tap()
        showChats(app); _ = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/preview-grant")!)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Automatic preview rehearsal")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20)); row.tap()
        let mainChat = app.buttons["shell-tab-" + (fixture["hostId"] as! String) + ":" + (fixture["runId"] as! String)]
        if mainChat.exists { mainChat.tap() }
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 15))
        let tab = app.buttons["Relay design fixture"]; XCTAssertTrue(tab.waitForExistence(timeout: 25)); tab.tap()
        XCTAssertTrue(app.buttons["Enable interactive preview"].waitForExistence(timeout: 15)); app.buttons["Enable interactive preview"].tap()
        XCTAssertTrue(app.webViews.buttons["Change sample"].waitForExistence(timeout: 15)); app.webViews.buttons["Change sample"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Changed version 1"].waitForExistence(timeout: 15))
        _ = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/design-update")!)
        XCTAssertTrue(app.webViews.staticTexts["Version 2"].waitForExistence(timeout: 20)); XCTAssertTrue(app.buttons["Enable interactive preview"].exists)
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "label == %@", "Relay design fixture")).count, 1)
        app.terminate(); app.launchArguments = []; app.launch(); showChats(app); XCTAssertTrue(row.waitForExistence(timeout: 20)); row.tap(); XCTAssertTrue(tab.waitForExistence(timeout: 25)); tab.tap()
        XCTAssertTrue(app.webViews.staticTexts["Version 2"].waitForExistence(timeout: 20)); XCTAssertTrue(app.buttons["Enable interactive preview"].exists)
    }
    @MainActor func testTypingDoesNotTraverseLongChatHistory() throws {
        for (fixture, title, eventCount) in [("--synthetic-long-chat", "Long fixture", 1), ("--synthetic-many-chat", "Many fixture", 100), ("--synthetic-heavy-chat", "Heavy fixture", 1000)] {
            let app = nativeFixtureApplication()
            app.launchArguments = ["--reset-pairing", "--synthetic-destinations", fixture, "--typing-diagnostics"]
            app.launch()
            showChats(app)
            let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
            XCTAssertTrue(row.waitForExistence(timeout: 12)); row.tap()
            // A prior browser test may have persisted this chat's selected child tab.
            XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 15))
            app.buttons["chat-conversation-tab"].tap()
            if UIDevice.current.userInterfaceIdiom == .phone { XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 30)); app.buttons["composer-preview"].tap() }
            let field = app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch
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
            print("PERFORMANCE events=\(eventCount) characters=\(text.count) elapsed=\(elapsed) historyPasses=\(passes) inspected=\(inspected)")
            report.name = "Typing work for \(title)"; report.lifetime = .keepAlways; add(report)
            if app.scrollViews["chat-conversation-scroll"].exists { app.scrollViews["chat-conversation-scroll"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap() }
            if let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { navigation.tap(); app.buttons["phone-nav-Home"].tap() }
            showChats(app)
            if !app.buttons["chat-conversation-tab"].isHittable {
                let visibleRow = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).allElementsBoundByIndex.first(where: { $0.isHittable })
                try XCTUnwrap(visibleRow).tap()
            }
            if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
            XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch.value as? String, text)
            XCUIDevice.shared.press(.home); app.activate()
            if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
            XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch.value as? String, text)
            let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Typing in \(eventCount)-event chat"; shot.lifetime = .keepAlways; add(shot)
            app.terminate()
        }
    }

    override func setUp() { super.setUp(); continueAfterFailure = false }
    @MainActor func testGreenDesignPreviewAndChatsListStability() {
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
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
        let destination = "\(nativeFixtureHTTPOrigin)/browser/one"
        let seededAddress = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", destination), object: address)
        guard XCTWaiter.wait(for: [seededAddress], timeout: 8) == .completed else { XCTFail("The desktop fixture must supply the exact navigation target"); return }
        app.buttons["browser-go"].tap()
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
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad, "This tablet layout test requires an actual iPad simulator")
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-browser-workspace"]; app.launch()
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
            plus.tap(); app.buttons["Browser · Default"].firstMatch.tap()
            let active = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND value == %@", "shell-tab-", "Active")).firstMatch
            XCTAssertTrue(active.waitForExistence(timeout: 5)); XCTAssertTrue(active.isHittable, "New main tab scrolls into view")
        }
        app.buttons["sidebar-Chats"].tap(); XCTAssertEqual(app.buttons["sidebar-Chats"].value as? String, "Active")
        XCTAssertEqual(home.value as? String, "Inactive")
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertEqual(app.buttons["sidebar-Chats"].value as? String, "Active", "A selected chat still highlights Chats")
        for _ in 0..<10 {
            app.buttons["Add chat tab"].tap(); app.buttons["Browser · Default"].firstMatch.tap()
            let child = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND value == %@", "chat-browser-tab-", "Active")).firstMatch
            XCTAssertTrue(child.waitForExistence(timeout: 5)); XCTAssertTrue(child.isHittable, "New child tab scrolls into view")
        }
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "New chat browser tab revealed"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testHomeProjectGuidePopup() {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
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
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
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
    @MainActor func testSystemMessageStaysOutsideActivityWithApprovalReferencesAndRecordedToolTiming() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-activity-details"]
        app.launch()
        showChats(app)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 8)); app.buttons["chat-conversation-tab"].tap()
        let group = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Activity · 1 tool")).firstMatch
        XCTAssertTrue(group.waitForExistence(timeout: 8)); group.tap()
        let elapsed = app.staticTexts["tool-elapsed-native-rehearsal-read"]
        XCTAssertTrue(elapsed.waitForExistence(timeout: 8)); XCTAssertEqual(elapsed.label, "Elapsed 4.25s")
        XCTAssertTrue(app.staticTexts["tool-finished-native-rehearsal-read"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["chat-event-2"].exists, "The plain system event stays outside collapsed tool activity")
        let system = app.staticTexts["Synthetic system note inside activity"]
        XCTAssertTrue(system.waitForExistence(timeout: 8))
        for _ in 0..<6 { if elapsed.isHittable { break }; app.swipeDown() }
        let timingShot = XCTAttachment(screenshot: app.screenshot()); timingShot.name = "Synthetic native per-tool timing and darker system entry"; timingShot.lifetime = .keepAlways; add(timingShot)
        let approvalGroup = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Activity · 1 tool")).element(boundBy: 1)
        revealConversationElement(approvalGroup, in: app); approvalGroup.tap()
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
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad, "This tablet layout test requires an actual iPad simulator")
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat"]
        app.launch()
        let chats = UIDevice.current.userInterfaceIdiom == .pad ? app.buttons["sidebar-Chats"] : app.tabBars.buttons["Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        XCTAssertTrue(app.buttons["chat-conversation-tab"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.staticTexts["chat-header-title"].exists)
        XCTAssertFalse(app.buttons["chat-back"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "Chat actions").count, 0, "Chat actions are on the chat tab, not a header menu")
        app.buttons["Add chat tab"].tap(); app.buttons["Browser · Default"].firstMatch.tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.staticTexts["chat-header-title"].exists)
        XCTAssertFalse(app.buttons["chat-back"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "Chat actions").count, 0, "Chat actions are on the chat tab, not a header menu")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Tablet two tab rows"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testWorkspaceTabsKeepTypeIconsAndChatNavigation() {
        let app = nativeFixtureApplication()
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
        XCTAssertTrue(app.buttons["workspace-page-Chats"].waitForExistence(timeout: 8))
        app.buttons["workspace-page-Configuration"].tap()
        app.buttons["workspace-page-Chats"].tap()
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
        XCTAssertFalse(app.alerts["Proteus"].exists, "Opening cached configuration and chat history must not send an offline owner request")
        let revealed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "hittable == true"), object: selectedChat)
        XCTAssertEqual(XCTWaiter.wait(for: [revealed], timeout: 5), .completed, "The selected tab must be revealed after the strip finishes scrolling")
        XCTAssertGreaterThanOrEqual(selectedChat.frame.minX, 0); XCTAssertLessThanOrEqual(selectedChat.frame.maxX, app.windows.firstMatch.frame.maxX)
        app.buttons["workspace-page-Chats"].tap()
        app.buttons["Synthetic browser"].firstMatch.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Local recent across scopes")).firstMatch.waitForExistence(timeout: 10), "A new workspace browsing home can show recorded default-profile sites from another local scope")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Offline · cached")).firstMatch.exists)
        chat.tap(); XCTAssertTrue(app.scrollViews["chat-conversation-scroll"].waitForExistence(timeout: 8))
    }
    @MainActor func testCompactHeaderStaysInChatWhenBrowserCloses() {
        let app = nativeFixtureApplication()
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
        let transcript = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(transcript.waitForExistence(timeout: 8))
        // The AX scroll frame includes its composer inset and the keyboard area.
        // Drag above the entire composer, including its connection status.
        let connectionStatus = app.descendants(matching: .any).matching(identifier: "chat-composer-connection-status").firstMatch
        guard connectionStatus.waitForExistence(timeout: 8) else { XCTFail("The composer boundary must be observable"); return }
        let visibleTop = transcript.frame.minY + 20
        let visibleBottom = min(transcript.frame.maxY, connectionStatus.frame.minY) - 20
        guard visibleBottom - visibleTop > 50 else { XCTFail("The transcript must expose room for a real reading gesture"); return }
        let origin = app.coordinate(withNormalizedOffset: .zero)
        origin.withOffset(CGVector(dx: transcript.frame.midX, dy: visibleTop + 0.8 * (visibleBottom - visibleTop)))
            .press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: transcript.frame.midX, dy: visibleTop + 10)))
        XCTAssertTrue(app.buttons["composer-preview"].waitForExistence(timeout: 8))
        let startingCloseCount = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Close New tab")).count
        app.buttons["Add chat tab"].tap(); app.buttons["Browser · Default"].firstMatch.tap()
        XCTAssertTrue(app.textFields["browser-address"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["chat-header-title"].exists)
        XCTAssertTrue(app.buttons["chat-actions"].exists)
        app.buttons["Add chat tab"].tap(); app.buttons["Browser · Default"].firstMatch.tap()
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
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
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-nav-counts"]
        app.launch()
        if app.tabBars.firstMatch.exists {
            let tabBar = app.tabBars.firstMatch
            for name in ["Home", "Chats", "Life", "Team", "Engine Room"] { XCTAssertTrue(tabBar.buttons[name].exists) }
            XCTAssertEqual(tabBar.buttons.count, 5, "Counts must not change the established iPhone navigation")
            tabBar.buttons["Home"].tap()
            let schedules = app.staticTexts["Schedules · 2"]
            for _ in 0..<6 where !schedules.exists { app.swipeUp() }
            XCTAssertTrue(schedules.waitForExistence(timeout: 8))
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
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
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
        let composer = UIDevice.current.userInterfaceIdiom == .phone ? app.buttons["composer-preview"] : app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch
        XCTAssertTrue(composer.exists)
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(composer.waitForExistence(timeout: 10))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Progressive heavy history"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testVariableHeightHistoryCanPageRepeatedlyAndReturnToBottom() {
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-heavy-chat"]; app.launch(); showChats(app)
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
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--show-scroll-fixture-controls"]
        app.launch()
        guard app.tabBars.firstMatch.exists else { throw XCTSkip("Phone reading-position regression") }
        app.tabBars.buttons["Chats"].tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Long fixture")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8)); row.tap()
        let conversation = app.buttons["chat-conversation-tab"]
        XCTAssertTrue(conversation.waitForExistence(timeout: 8)); conversation.tap()
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
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        openNotificationFixtureHome(app)
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
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        openNotificationFixtureHome(app)
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
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
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
    @MainActor func testWebsiteNotificationTapKeepsSourceHostAndShowsOfflineRecovery() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        openNotificationFixtureHome(app)
        for _ in 0..<5 where !app.buttons["Tap website notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Tap website notification"].waitForExistence(timeout: 12))
        app.buttons["Tap website notification"].tap()
        XCTAssertTrue(app.alerts["Proteus"].waitForExistence(timeout: 12))
        XCTAssertTrue(app.alerts.staticTexts["Reconnect Alpha Mac to open the website notification on that computer."].exists)
        app.alerts.buttons["OK"].tap()
        XCTAssertTrue(app.staticTexts["Notifications"].waitForExistence(timeout: 10))
    }
    @MainActor func testNotificationTapRoutesForegroundColdStartBackgroundAndUnavailableTargets() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        func openHome() {
            let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first { $0.isHittable }
            if let navigation { navigation.tap(); app.buttons["phone-nav-Home"].tap() }
            else { app.tabBars.buttons["Home"].tap() }
        }
        openHome()
        for _ in 0..<4 where !app.buttons["Tap chat notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Tap chat notification"].waitForExistence(timeout: 15))
        app.buttons["Tap chat notification"].tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 12), "Foreground chat tap should open its cached conversation")
        openHome()
        for _ in 0..<4 where !app.buttons["Tap schedule notification"].exists { app.swipeUp() }
        app.buttons["Tap schedule notification"].tap()
        let scheduleShot = XCTAttachment(screenshot: app.screenshot()); scheduleShot.name = "Schedule notification destination"; scheduleShot.lifetime = .keepAlways; add(scheduleShot)
        XCTAssertTrue(app.navigationBars["Notification fixture schedule"].waitForExistence(timeout: 12), "Schedule tap should open the schedule on the correct Mac: " + app.staticTexts["notification-fixture-status"].label)
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
        openHome()
        for _ in 0..<4 where !app.buttons["Stage background chat notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Stage background chat notification"].waitForExistence(timeout: 12))
        app.buttons["Stage background chat notification"].tap()
        XCUIDevice.shared.press(.home)
        sleep(2)
        app.activate()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 15), "Background tap must route after activation")
    }
    @MainActor func testIPadNotificationTapOpensHostContentTabsAndColdSchedule() {
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad, "This tablet layout test requires an actual iPad simulator")
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-notification-fixtures", "--synthetic-notification-controls"]
        app.launch()
        let home = app.buttons["sidebar-Home"]
        XCTAssertTrue(home.waitForExistence(timeout: 12)); home.tap()
        XCTAssertEqual(home.value as? String, "Active")
        for _ in 0..<4 where !app.buttons["Tap chat notification"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Tap chat notification"].waitForExistence(timeout: 12))
        app.buttons["Tap chat notification"].tap()
        XCTAssertTrue(app.staticTexts["Notification destination loaded"].waitForExistence(timeout: 12))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "shell-tab-10000000-0000-4000-8000-000000000001:notification-chat")).firstMatch.exists)
        XCTAssertTrue(home.waitForExistence(timeout: 12)); home.tap()
        XCTAssertEqual(home.value as? String, "Active")
        for _ in 0..<4 where !app.buttons["Tap schedule notification"].exists { app.swipeUp() }
        app.buttons["Tap schedule notification"].tap()
        XCTAssertTrue(app.navigationBars["Notification fixture schedule"].waitForExistence(timeout: 12))
        app.terminate()
        app.launchArguments = ["--synthetic-notification-cold-schedule"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Notification fixture schedule"].waitForExistence(timeout: 15), "Cold schedule tap must open its content tab after Home restoration")
        let scheduleTab = app.buttons["shell-tab-schedule:10000000-0000-4000-8000-000000000001:notification-schedule"]
        XCTAssertTrue(scheduleTab.exists); XCTAssertEqual(scheduleTab.value as? String, "Active", "Passive browser restoration must not replace the notification's schedule selection")
    }
    @MainActor func testAttachmentPreviewClosesWithHardwareEscapeCloseButtonAndBackdrop() {
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-attachment-preview"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-team-lists"]; app.launch()
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
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad, "This tablet layout test requires an actual iPad simulator")
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let mainAdd = app.buttons["new-main-browser-tab"]
        XCTAssertTrue(mainAdd.waitForExistence(timeout: 8), "The iPad must expose its main tab controls")
        mainAdd.tap(); app.buttons["Browser · Default"].firstMatch.tap()
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
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad, "This tablet layout test requires an actual iPad simulator")
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let plus = app.buttons["new-main-browser-tab"]
        XCTAssertTrue(plus.waitForExistence(timeout: 12))
        for _ in 0..<12 { plus.tap(); app.buttons["Browser · Default"].firstMatch.tap() }
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
        let home = app.buttons["sidebar-Home"]
        XCTAssertTrue(home.waitForExistence(timeout: 10)); home.tap()
        XCTAssertEqual(home.value as? String, "Active")
        XCTAssertEqual(app.buttons[tabID].frame.minX, before, accuracy: 2, "Left navigation must not reset the tab strip")
        let chats = app.buttons["sidebar-Chats"]
        XCTAssertTrue(chats.waitForExistence(timeout: 10)); chats.tap()
        XCTAssertEqual(chats.value as? String, "Active")
        XCTAssertEqual(app.buttons[tabID].frame.minX, before, accuracy: 2, "A second left navigation must preserve the same offset")
    }
    @MainActor func testNewBrowserFocusAndTwentyRecentSites() {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace", "--synthetic-address-recents"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
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
        address.typeText("\(nativeFixtureHTTPOrigin)/browser/one"); app.buttons["browser-go"].tap()
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
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]
        app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20))
        app.buttons["Team"].firstMatch.tap()
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap()
        address.typeText("\(nativeFixtureHTTPOrigin)/browser/one"); app.buttons["browser-go"].tap()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let ready = app.buttons["sidebar-Team"].exists ? app.buttons["sidebar-Team"] : app.buttons["destination-picker"]
        XCTAssertTrue(ready.waitForExistence(timeout: 20)); app.buttons["Team"].firstMatch.tap()
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("\(nativeFixtureHTTPOrigin)/browser/spa"); app.buttons["browser-go"].tap()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20)); app.buttons["Team"].firstMatch.tap()
        openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; address.tap(); address.typeText("\(nativeFixtureHTTPOrigin)/browser/one"); app.buttons["browser-go"].tap()
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
        let app = nativeFixtureApplication()
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
        app.buttons["Add chat tab"].tap(); app.buttons["Browser · Default"].firstMatch.tap()
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("\(nativeFixtureHTTPOrigin)/browser/one"); app.buttons["browser-go"].tap()
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.staticTexts["First browser page"].waitForExistence(timeout: 15))
        web.links["Next browser page"].tap(); XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 15))
        web.links["Next browser page"].tap(); XCTAssertTrue(web.staticTexts["Third browser page"].waitForExistence(timeout: 15))
        let edge = web.frame.minX + 24, browserY = web.frame.midY
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 10), "One edge gesture must move exactly one saved history entry")
        XCTAssertFalse(web.staticTexts["First browser page"].exists); XCTAssertTrue(chatTab.exists)
        drag(CGPoint(x: web.frame.maxX - 24, y: browserY), CGPoint(x: web.frame.maxX - 204, y: browserY))
        XCTAssertTrue(web.staticTexts["Third browser page"].waitForExistence(timeout: 10), "Back must preserve the forward entry")
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(web.staticTexts["Second browser page"].waitForExistence(timeout: 10))
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(web.staticTexts["First browser page"].waitForExistence(timeout: 10))
        drag(CGPoint(x: edge, y: browserY), CGPoint(x: edge + 180, y: browserY))
        XCTAssertTrue(app.buttons["new-chat"].waitForExistence(timeout: 8)); XCTAssertFalse(chatTab.exists)
    }
    @MainActor func testNativeHistorySharingSettingsSaveOnlyToOwningComputer() async throws {
        let (catalogData, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/history-settings-fixture")!)
        let catalog = try JSONSerialization.jsonObject(with: catalogData) as! [String: Any]
        let peer = try XCTUnwrap(catalog["peerId"] as? String), work = try XCTUnwrap(catalog["profileId"] as? String)
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String)); app.buttons["pair-mac"].tap()
        if app.buttons["sidebar-Engine Room"].waitForExistence(timeout: 5) { app.buttons["sidebar-Engine Room"].tap() } else { app.tabBars.buttons["Engine Room"].tap() }
        let actions = app.buttons.matching(NSPredicate(format: "label == %@", "Browser history")); XCTAssertTrue(actions.firstMatch.waitForExistence(timeout: 15)); actions.element(boundBy: actions.count - 1).tap()
        app.buttons["owner-history-settings"].tap()
        let recording = app.switches["history-settings-recording"]; XCTAssertTrue(recording.waitForExistence(timeout: 15)); XCTAssertTrue(recording.isEnabled)
        recording.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(recording.value as? String, "0")
        guard selectPickerOption("Keep all history", pickerID: "history-settings-retention", in: app) else { return }
        let sharing = app.switches["history-peer-enabled-" + peer]; sharing.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(sharing.value as? String, "1")
        guard selectPickerOption("All available", pickerID: "history-peer-backfill-" + peer, in: app) else { return }
        let settingsForm = app.descendants(matching: .any).matching(identifier: "history-settings-form").firstMatch; XCTAssertTrue(settingsForm.exists); settingsForm.swipeUp()
        let workSwitch = app.switches["history-peer-profile-" + peer + "-" + work]; workSwitch.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(workSwitch.value as? String, "1")
        let defaultSwitch = app.switches["history-peer-profile-" + peer + "-default"]; defaultSwitch.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap(); XCTAssertEqual(defaultSwitch.value as? String, "0")
        settingsForm.swipeUp()
        let save = app.buttons["history-settings-save"]; XCTAssertTrue(save.waitForExistence(timeout: 5)); save.tap()
        XCTAssertTrue(app.staticTexts["Saved. The owner will synchronize enabled peers in the background."].waitForExistence(timeout: 15))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Owner history sharing preferences saved"; screenshot.lifetime = .keepAlways; add(screenshot)
        let (stateData, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/history-settings-fixture/state")!)
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
        if app.buttons["sidebar-Engine Room"].waitForExistence(timeout: 5) { app.buttons["sidebar-Engine Room"].tap() } else { app.tabBars.buttons["Engine Room"].tap() }
        let actions = app.buttons.matching(NSPredicate(format: "label == %@", "Browser history")); XCTAssertTrue(actions.firstMatch.waitForExistence(timeout: 15)); actions.element(boundBy: actions.count - 1).tap()
        app.buttons["owner-history-settings"].tap()
        XCTAssertTrue(app.staticTexts["Alpha Mac"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Reconnect this computer to view or change its history settings."].exists)
        XCTAssertFalse(app.buttons["history-settings-save"].isEnabled)
    }
    @MainActor func testBrowserConflictOffersExplicitRecoveryInOriginalTeamScope() {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace", "--synthetic-browser-conflict"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        let ready = app.buttons["sidebar-Team"].exists ? app.buttons["sidebar-Team"] : app.buttons["destination-picker"]
        XCTAssertTrue(ready.waitForExistence(timeout: 20))
        if app.tabBars.buttons["Team"].exists { app.tabBars.buttons["Team"].tap() } else if app.buttons["sidebar-Team"].exists { app.buttons["sidebar-Team"].tap() } else { app.buttons["Team"].firstMatch.tap() }
        if !app.textFields["browser-address"].waitForExistence(timeout: 2) { app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap() }
        app.buttons["team-new-browser-tab"].tap(); app.buttons["Browser - Default"].firstMatch.tap()
        let address = app.textFields["browser-address"]
        XCTAssertTrue(address.waitForExistence(timeout: 15))
        address.tap()
        address.typeText("\(nativeFixtureHTTPOrigin)/browser/one"); app.buttons["browser-go"].tap()
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
        let app = nativeFixtureApplication()
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
        let app = nativeFixtureApplication()
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
    @MainActor private func showChats(_ app: XCUIApplication) {
        if app.buttons.matching(identifier: "phone-app-navigation").firstMatch.waitForExistence(timeout: 3),
           let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) {
            navigation.tap()
            let chats = app.buttons["phone-nav-Chats"]
            XCTAssertTrue(chats.waitForExistence(timeout: 8)); chats.tap(); return
        }
        if app.tabBars.buttons["Chats"].exists { app.tabBars.buttons["Chats"].tap(); return }
        if !app.buttons.matching(identifier: "sidebar-Chats").allElementsBoundByIndex.contains(where: { $0.isHittable }), app.buttons["Toggle sidebar"].exists { app.buttons["Toggle sidebar"].tap() }
        let chats = app.buttons.matching(identifier: "sidebar-Chats").firstMatch
        XCTAssertTrue(chats.waitForExistence(timeout: 10))
        let visible = app.buttons.matching(identifier: "sidebar-Chats").allElementsBoundByIndex.first(where: { $0.isHittable })
        XCTAssertNotNil(visible); visible?.tap()
    }
    @MainActor func testLiveBrowserViewerAndDraftRetention() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        // Pairing reset intentionally preserves saved browser tabs. Navigate to Home explicitly.
        if app.buttons["sidebar-Home"].waitForExistence(timeout: 3) { app.buttons["sidebar-Home"].tap() }
        else if app.tabBars.buttons["Home"].exists { app.tabBars.buttons["Home"].tap() }
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app)
        _ = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/live-grant")!)
        let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Live browser rehearsal")
        app.buttons["start-chat"].tap(); XCTAssertTrue(app.staticTexts["Your input is needed"].waitForExistence(timeout: 20))
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        let reply = app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch; XCTAssertTrue(reply.waitForExistence(timeout: 10)); reply.tap(); reply.typeText("Unsent pending answer")
        XCTAssertFalse(app.buttons["Chat tools"].exists)
        let status = app.descendants(matching: .any)["chat-composer-connection-status"].firstMatch
        XCTAssertEqual(app.buttons["chat-live-browser"].frame.midY, status.frame.midY, accuracy: 2)
        app.buttons["chat-live-browser"].tap()
        XCTAssertTrue(app.buttons["chat-live-browser"].isSelected)
        XCTAssertTrue(app.descendants(matching: .any)["live-browser-image"].waitForExistence(timeout: 15))
        let instruction = app.textFields["live-browser-instruction"]; instruction.tap(); instruction.typeText("Unsent browser instruction")
        app.buttons["chat-mode-conversation"].tap()
        if app.buttons["composer-preview"].exists { app.buttons["composer-preview"].tap() }
        XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "reply-text").firstMatch.value as? String, "Unsent pending answer")
        app.buttons["chat-live-browser"].tap(); XCTAssertEqual(app.textFields["live-browser-instruction"].value as? String, "Unsent browser instruction")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Live Browser preview"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testExpandableToolOutput() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        submitPairing(app, code: fixture["code"] as! String)
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let savedFavorite = app.buttons["Remove from favorites: Synthetic skill"]
        XCTAssertTrue(savedFavorite.waitForExistence(timeout: 10))
        let favoriteSaved = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: savedFavorite)
        await fulfillment(of: [favoriteSaved], timeout: 10)
        let check = app.buttons["Check all favorites"]
        for _ in 0..<12 {
            if check.exists && check.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)))
        }
        guard check.waitForExistence(timeout: 10) else { XCTFail("Check all favorites is missing"); return }
        // The scoped catalog refresh follows the favorite mutation and host-state refresh.
        let emptyFavorites = app.staticTexts["Use the star beside a source to keep it here."]
        let favoritesLoaded = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: emptyFavorites)
        await fulfillment(of: [favoritesLoaded], timeout: 10)
        check.tap()
        let selectedSkill = app.switches.matching(NSPredicate(format: "label CONTAINS %@", "Synthetic skill")).firstMatch
        XCTAssertTrue(selectedSkill.waitForExistence(timeout: 10))
        let skillSelected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", "1"), object: selectedSkill)
        await fulfillment(of: [skillSelected], timeout: 10)
        XCTAssertTrue(savedFavorite.exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Mobile favorites and selected sources"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["start-chat"].tap(); guard app.staticTexts["Your input is needed"].waitForExistence(timeout: 20) else { XCTFail("Chat did not start"); return }
        let (latest, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/latest")!)
        let value = try JSONSerialization.jsonObject(with: latest) as! [String: Any]; let context = try XCTUnwrap(value["context"] as? [String: Any])
        XCTAssertEqual(context["includeDefaults"] as? Bool, false)
        let entries = context["entries"] as! [[String: Any]]; XCTAssertEqual(entries.count, 1); XCTAssertEqual(entries.first?["kind"] as? String, "skill")
        app.buttons["stop-turn"].tap()
    }
}

extension RemoteUITests {
    @MainActor func testModelCapabilities() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair?models=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); showChats(app); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
        let prompt = app.textFields["chat-prompt"]; XCTAssertTrue(prompt.waitForExistence(timeout: 10)); prompt.tap(); prompt.typeText("Model options rehearsal")
        let effort = app.descendants(matching: .any)["effort-picker"].firstMatch
        for _ in 0..<12 {
            if effort.exists && effort.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)))
        }
        guard effort.waitForExistence(timeout: 10) else { XCTFail("Effort picker missing"); return }
        guard selectPickerOption("none", pickerID: "effort-picker", in: app) else { return }
        let context = app.descendants(matching: .any)["context-tier-picker"].firstMatch
        for _ in 0..<12 {
            if context.exists && context.isHittable { break }
            let list = app.collectionViews["new-chat-form"]
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)).press(forDuration: 0.05, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)))
        }
        guard context.waitForExistence(timeout: 10) else { XCTFail("Context picker missing"); return }
        guard selectPickerOption("872K · Long context", pickerID: "context-tier-picker", in: app) else { return }
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Live effort and context controls"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["start-chat"].tap()
        guard app.staticTexts["Allow synthetic model-options checkpoint?"].waitForExistence(timeout: 20) else { XCTFail("The synthetic run must wait on permission so a follow-up can queue"); return }
        XCTAssertEqual(app.buttons["send-message"].label, "Queue message")
        let (latest, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/latest")!)
        let value = try JSONSerialization.jsonObject(with: latest) as! [String: Any]
        XCTAssertEqual(value["reasoningEffort"] as? String, "none"); XCTAssertEqual(value["contextTier"] as? String, "long_context")
        if app.buttons["composer-preview"].waitForExistence(timeout: 3) { app.buttons["composer-preview"].tap() }
        XCTAssertTrue(app.buttons["steer-message"].exists); XCTAssertFalse(app.buttons["steer-message"].isEnabled)
        XCTAssertTrue(app.buttons["stop-turn"].exists)
        let options = app.buttons["composer-options"]
        XCTAssertTrue(options.waitForExistence(timeout: 10)); options.tap()
        let popover = app.popovers.firstMatch
        guard popover.waitForExistence(timeout: 10) else { XCTFail("Compact composer options must open"); return }
        let modelSection = popover.buttons.matching(NSPredicate(format: "label == %@", "Model")).firstMatch
        XCTAssertTrue(modelSection.waitForExistence(timeout: 10))
        guard setComposerSection("Context", expanded: true, in: popover) else { return }
        let longContext = popover.buttons.matching(NSPredicate(format: "label == %@", "872K · Long context")).firstMatch
        guard longContext.waitForExistence(timeout: 10) else { XCTFail("The fixture's advertised long context option must exist"); return }
        XCTAssertTrue(longContext.isSelected); longContext.tap()
        guard setComposerSection("Context", expanded: false, in: popover),
              setComposerSection("Level", expanded: true, in: popover) else { return }
        let highEffort = popover.buttons.matching(NSPredicate(format: "label == %@", "High")).firstMatch
        guard highEffort.waitForExistence(timeout: 10) else { XCTFail("The fixture's advertised high effort option must exist"); return }
        highEffort.tap()
        guard setComposerSection("Level", expanded: false, in: popover) else { return }
        popover.buttons["Done"].tap()
        if app.buttons["composer-preview"].waitForExistence(timeout: 8) { app.buttons["composer-preview"].tap() }
        let reply = app.textFields["reply-text"]; reply.tap(); reply.typeText("Queued with new effort")
        app.buttons["send-message"].tap()
        guard app.buttons["Remove"].waitForExistence(timeout: 10) else { XCTFail("The message must remain queued on the owner"); return }
        let (queued, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/latest")!)
        let queuedValue = try JSONSerialization.jsonObject(with: queued) as! [String: Any]
        XCTAssertEqual(queuedValue["reasoningEffort"] as? String, "none")
        let messages = try XCTUnwrap(queuedValue["queuedMessages"] as? [[String: Any]], "The owner must return the queued message with its turn options")
        XCTAssertEqual((messages.first?["modelOptions"] as? [String: Any])?["reasoningEffort"] as? String, "high")
        XCTAssertEqual((messages.first?["modelOptions"] as? [String: Any])?["contextTier"] as? String, "long_context")
        let composerShot = XCTAttachment(screenshot: app.screenshot()); composerShot.name = "Compact composer menus and separate actions"; composerShot.lifetime = .keepAlways; add(composerShot)
        app.buttons["Edit"].tap()
        let queuedEditor = app.textViews["queued-message-editor"]
        XCTAssertTrue(queuedEditor.waitForExistence(timeout: 10)); queuedEditor.tap()
        queuedEditor.typeText(" revised")
        let editedText = queuedEditor.value as! String
        app.buttons["Save"].tap()
        let disappeared = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: queuedEditor)
        await fulfillment(of: [disappeared], timeout: 10)
        let (edited, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/latest")!)
        let editedValue = try JSONSerialization.jsonObject(with: edited) as! [String: Any]
        let editedMessages = try XCTUnwrap(editedValue["queuedMessages"] as? [[String: Any]], "Editing must retain the queued message and turn options")
        XCTAssertEqual(editedMessages.first?["prompt"] as? String, editedText)
        XCTAssertEqual((editedMessages.first?["modelOptions"] as? [String: Any])?["reasoningEffort"] as? String, "high")
        app.buttons["Remove"].tap()
        if app.buttons["stop-turn"].exists { app.buttons["stop-turn"].tap() }
    }
}

extension RemoteUITests {
    @MainActor func testMCPConnectionRefresh() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair?models=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-destinations", "--synthetic-linux-host"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-destinations"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--synthetic-destinations"]; app.launch()
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
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with:data) as! [String:Any]
        let app=nativeFixtureApplication();app.launchArguments=["--reset-pairing"];app.launch()
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
        let app=nativeFixtureApplication();app.launchArguments=["--synthetic-life","--reset-pairing"];app.launch()
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
        let app=nativeFixtureApplication();app.launchArguments=["--reset-pairing"];app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
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
        area("Team")
        let overview = app.buttons["team-section-overview"]
        XCTAssertTrue(overview.waitForExistence(timeout: 10)); overview.tap()
        XCTAssertTrue(app.buttons["Connect website account"].waitForExistence(timeout: 10))
        area("Engine Room"); XCTAssertTrue(app.buttons["Resources"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["Resources"].firstMatch.tap(); XCTAssertTrue(app.staticTexts["Host figures include processes Proteus can inspect. Shared processes cannot be charged to one tab. iOS does not expose other apps’ memory here."].waitForExistence(timeout: 10))
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.name = "Native parity engine resources"; screenshot.lifetime = .keepAlways; add(screenshot)
    }
}

extension RemoteUITests {
    @MainActor func testCompletedMessageCopySpeechPauseSeekAndLeaveChat() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let back = app.buttons["chat-back"]
        XCTAssertTrue(back.waitForExistence(timeout: 10)); back.tap()
        let row = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ AND label CONTAINS %@", "Reading controls test", "Turn complete")).firstMatch
        guard row.waitForExistence(timeout: 10) else { XCTFail("Completed chat row missing"); return }; row.tap()
        XCTAssertTrue(app.buttons["read-aloud"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label == %@", "Stop reading aloud")).firstMatch.exists, "Leaving the chat must stop its speech")
    }
}


extension RemoteUITests {
    @MainActor func testEnterSendsNewChatAndFeedback() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations"]; app.launch()
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
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-browser-workspace"]; app.launch()
        XCTAssertTrue(app.buttons["destination-picker"].waitForExistence(timeout: 20)); app.buttons["Team"].firstMatch.tap(); openDefaultTeamBrowser(app)
        let address = app.textFields["browser-address"]; XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("\(nativeFixtureHTTPOrigin)/browser/downloads"); app.buttons["browser-go"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Native downloads fixture"].waitForExistence(timeout: 15)); app.webViews.links["Download native fixture"].tap()
        app.buttons["Downloads"].firstMatch.tap(); XCTAssertTrue(app.navigationBars["Downloads"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["native-fixture.txt"].firstMatch.waitForExistence(timeout: 15)); XCTAssertTrue(app.staticTexts["completed"].firstMatch.waitForExistence(timeout: 15)); XCTAssertTrue(app.buttons["Open or share"].firstMatch.exists)
    }
}

/// Runs against the separately installed functional preview, never the production mobile app.
final class PhoneDesignPreviewUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor private func preview() -> XCUIApplication {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--iphone-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 20))
        XCTAssertFalse(app.tabBars.buttons["Home"].exists)
        return app
    }
    @MainActor private func openNavigation(_ app: XCUIApplication) {
        app.buttons["phone-app-navigation"].tap()
        let drawer = app.scrollViews["phone-navigation-drawer"]
        XCTAssertTrue(drawer.waitForExistence(timeout: 5))
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.buttons["phone-nav-Home"].frame.minX >= app.frame.minX - 1 }, object: drawer)
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 5), .completed)
        XCTAssertGreaterThanOrEqual(app.buttons["phone-nav-Home"].frame.minX, app.frame.minX - 1)
    }
    @MainActor func testPhoneDrawerFullURLBottomControlsAndDoubleTap() {
        let app = preview()
        openNavigation(app)
        XCTAssertTrue(app.buttons["phone-nav-Team"].exists)
        XCTAssertTrue(app.buttons["Collapse all workspaces"].exists)
        XCTAssertTrue(app.buttons["phone-nav-Engine Room"].exists)
        app.buttons["Close navigation"].tap()
        app.buttons["phone-new-tab"].tap()
        app.buttons["Browser · Default"].tap()
        let address = app.buttons["browser-address"]
        let homeEditor = app.textFields["new-tab-address"]
        let editor = app.descendants(matching: .any).matching(identifier: "browser-address-editor").firstMatch
        XCTAssertTrue(homeEditor.waitForExistence(timeout: 10))
        let url = "\(nativeFixtureHTTPOrigin)/browser/phone-preview?section=full-address&retain=scheme-host-port-path-query&purpose=native-iphone-design-rehearsal"
        homeEditor.tap(); homeEditor.typeText(url); app.buttons["Open address"].tap()
        let page = app.webViews.firstMatch
        XCTAssertTrue(page.staticTexts["Proteus browser rehearsal"].waitForExistence(timeout: 20))
        XCTAssertEqual(address.value as? String, url)
        XCTAssertLessThanOrEqual(address.frame.height, 44)
        page.links["Next browser page"].tap()
        XCTAssertTrue(page.staticTexts["Second browser page"].waitForExistence(timeout: 10))
        app.buttons["browser-back"].tap()
        XCTAssertTrue(page.staticTexts["Proteus browser rehearsal"].waitForExistence(timeout: 10))
        app.buttons["browser-forward"].tap()
        XCTAssertTrue(page.staticTexts["Second browser page"].waitForExistence(timeout: 10))
        app.buttons["browser-back"].tap()
        XCTAssertTrue(page.staticTexts["Proteus browser rehearsal"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["browser-navigation-history"].exists)
        app.buttons["phone-browser-more"].tap(); app.buttons["Navigation history"].tap()
        XCTAssertTrue(app.navigationBars["Navigation history"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        address.tap(); XCTAssertTrue(editor.waitForExistence(timeout: 5)); XCTAssertTrue(app.buttons["browser-go"].exists); XCTAssertFalse(app.buttons["Done"].exists); app.buttons["browser-go"].tap()
        let controlIDs = ["browser-back", "browser-forward", "browser-refresh", "browser-find", "phone-browser-more", "browser-tab-overview"]
        for id in controlIDs {
            XCTAssertTrue(app.buttons[id].exists, id)
            XCTAssertGreaterThan(app.buttons[id].frame.minY, address.frame.maxY, id)
            XCTAssertGreaterThanOrEqual(app.buttons[id].frame.width, 44, id)
            XCTAssertGreaterThanOrEqual(app.buttons[id].frame.height, 44, id)
        }
        for pair in zip(controlIDs, controlIDs.dropFirst()) { XCTAssertLessThan(app.buttons[pair.0].frame.midX, app.buttons[pair.1].frame.midX) }
        app.buttons["browser-refresh"].tap()
        XCTAssertTrue(page.staticTexts["Proteus browser rehearsal"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons.matching(identifier: "browser-tab-overview").count, 1)
        XCTAssertFalse(app.buttons["Share page"].exists)
        page.swipeUp()
        page.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).doubleTap()
        let hidden = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.buttons["phone-app-navigation"])
        XCTAssertEqual(XCTWaiter.wait(for: [hidden], timeout: 5), .completed)
        XCTAssertTrue(app.buttons["browser-tab-overview"].exists)
        page.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).doubleTap()
        XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 5))
        XCTAssertEqual(address.value as? String, url)
        app.buttons["phone-browser-more"].tap()
        XCTAssertTrue(app.buttons["Navigation history"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "browser-refresh").count, 1)
        XCTAssertTrue(app.buttons["Downloads"].exists)
        XCTAssertFalse(app.buttons["Share page"].exists)
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.25)).tap()
        app.buttons["browser-tab-overview"].tap()
        XCTAssertTrue(app.otherElements["phone-tab-overview"].waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Phone preview content thumbnails"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["browser-tab-overview"].waitForExistence(timeout: 5))
        page.pinch(withScale: 0.55, velocity: -1)
        XCTAssertTrue(app.otherElements["phone-tab-overview"].waitForExistence(timeout: 8))
        app.buttons["Done"].tap()
    }
    @MainActor func testPhoneNativeChatBackAndPinchOverview() {
        let app = preview()
        openNavigation(app); app.buttons["phone-nav-Chats"].tap()
        XCTAssertFalse(app.scrollViews["phone-navigation-drawer"].isHittable)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "Review desktop navigation refinements", "Desktop browser title rehearsal")).firstMatch
        for _ in 0..<4 { if row.exists { break }; app.swipeUp() }
        XCTAssertTrue(row.waitForExistence(timeout: 5)); row.tap()
        XCTAssertTrue(app.scrollViews["chat-conversation-scroll"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.staticTexts["chat-header-title"].exists, "Chats have no header bar")
        XCTAssertFalse(app.buttons["chat-back"].exists)
        XCTAssertFalse(app.buttons["Chat tools"].exists)
        let conversation = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(conversation.waitForExistence(timeout: 10))
        conversation.pinch(withScale: 0.55, velocity: -1)
        XCTAssertTrue(app.otherElements["phone-tab-overview"].waitForExistence(timeout: 8))
        let overviewShot = XCTAttachment(screenshot: app.screenshot()); overviewShot.name = "Phone preview mixed content thumbnails"; overviewShot.lifetime = .keepAlways; add(overviewShot)
        app.buttons["Done"].tap()
        let overviewClosed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.otherElements["phone-tab-overview"])
        XCTAssertEqual(XCTWaiter.wait(for: [overviewClosed], timeout: 5), .completed)
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let start = origin.withOffset(CGVector(dx: 4, dy: app.frame.height * 0.45))
        let end = origin.withOffset(CGVector(dx: app.frame.width * 0.8, dy: app.frame.height * 0.45))
        start.press(forDuration: 0.05, thenDragTo: end)
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Phone preview native chat back"; shot.lifetime = .keepAlways; add(shot)
    }
}

final class TabletDesignPreviewUITests: XCTestCase {
    @MainActor func testTabletChatPinchAndFullFeatureLabels() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        XCTAssertTrue(app.buttons["sidebar-Home"].waitForExistence(timeout: 20)); app.buttons["sidebar-Home"].tap()
        let heading = app.staticTexts["feature-page-label"].firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout: 5)); XCTAssertEqual(heading.label, "Home"); XCTAssertGreaterThan(heading.frame.width, 55)
        app.buttons["sidebar-Chats"].tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "Review desktop navigation refinements", "Desktop browser title rehearsal")).firstMatch
        for _ in 0..<4 { if row.exists { break }; app.swipeUp() }
        XCTAssertTrue(row.waitForExistence(timeout: 10)); row.tap()
        let conversation = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(conversation.waitForExistence(timeout: 15)); conversation.pinch(withScale: 0.55, velocity: -1)
        XCTAssertTrue(app.otherElements["phone-tab-overview"].waitForExistence(timeout: 8))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "iPad chat pinch overview"; shot.lifetime = .keepAlways; add(shot)
        let card = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "phone-tab-chat:")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 10)); card.tap()
        XCTAssertTrue(conversation.waitForExistence(timeout: 5))
    }

    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testTabletBrowserPinchAndPersistentMainNavigation() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        let addTab = app.buttons["new-main-browser-tab"]
        XCTAssertTrue(addTab.waitForExistence(timeout: 20))
        let systemArea = app.otherElements["ipad-system-status-background"]
        XCTAssertTrue(systemArea.exists)
        XCTAssertGreaterThanOrEqual(addTab.frame.minY, systemArea.frame.maxY)
        addTab.tap(); app.buttons["Browser · Default"].tap()
        let homeAddress = app.textFields["new-tab-address"]
        XCTAssertTrue(homeAddress.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Downloads"].exists); XCTAssertFalse(app.buttons["browser-navigation-history"].exists)
        XCTAssertLessThan(app.buttons["browser-more"].frame.midX, app.buttons["browser-tab-overview"].frame.midX)
        app.buttons["browser-more"].tap(); XCTAssertTrue(app.buttons["Downloads"].exists); app.buttons["Navigation history"].tap()
        XCTAssertTrue(app.navigationBars["Navigation history"].waitForExistence(timeout: 5)); app.buttons["Done"].tap()
        homeAddress.tap(); homeAddress.typeText("\(nativeFixtureHTTPOrigin)/browser/phone-preview?section=ipad-preview"); app.buttons["Open address"].tap()
        let page = app.webViews.firstMatch
        XCTAssertTrue(page.staticTexts["Proteus browser rehearsal"].waitForExistence(timeout: 20))
        page.pinch(withScale: 0.55, velocity: -1)
        XCTAssertTrue(app.otherElements["phone-tab-overview"].waitForExistence(timeout: 8))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "iPad content tab overview"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["Done"].tap()
        let closed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.otherElements["phone-tab-overview"])
        XCTAssertEqual(XCTWaiter.wait(for: [closed], timeout: 5), .completed)
        page.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).doubleTap()
        XCTAssertTrue(addTab.exists)
        XCTAssertTrue(app.buttons["sidebar-Chats"].exists)
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        let rotated = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.frame.width > app.frame.height }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [rotated], timeout: 8), .completed)
        XCTAssertGreaterThanOrEqual(addTab.frame.minY, systemArea.frame.maxY)
        let landscape = XCTAttachment(screenshot: app.screenshot()); landscape.name = "iPad black status area in landscape"; landscape.lifetime = .keepAlways; add(landscape)
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(addTab.waitForExistence(timeout: 10))
        XCTAssertEqual(app.textFields["browser-address"].value as? String, nativeFixtureHTTPOrigin + "/browser/phone-preview?section=ipad-preview")
    }
    @MainActor func testTabletHeadersTeamToolsAndServiceLinks() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        XCTAssertTrue(app.buttons["sidebar-Chats"].waitForExistence(timeout: 20)); app.buttons["sidebar-Chats"].tap()
        let newChat = app.buttons["new-chat"]
        XCTAssertTrue(newChat.waitForExistence(timeout: 10))
        let search = app.textFields["Search"].firstMatch
        XCTAssertTrue(search.exists)
        XCTAssertGreaterThan(search.frame.minY, 30)
        XCTAssertLessThan(abs(search.frame.midY - newChat.frame.midY), 35)
        XCTAssertGreaterThan(search.frame.minX, newChat.frame.minX)
        XCTAssertFalse(app.buttons["phone-app-navigation"].exists)
        app.buttons["sidebar-Team"].tap(); app.buttons["team-section-overview"].tap()
        let tabs = app.otherElements["team-navigation-tabs"]
        let header = app.otherElements["team-feature-header"]
        XCTAssertTrue(app.buttons["team-section-overview"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons["team-section-overview"].label, "Team Tools")
        XCTAssertTrue(app.buttons["team-link-l1"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["standup-dock"].exists)
        if tabs.exists && header.exists { XCTAssertGreaterThan(header.frame.minY, tabs.frame.minY); XCTAssertEqual(tabs.frame.height, 44, accuracy: 1) }
        app.buttons["team-section-standup"].tap()
        let dock = app.buttons["standup-dock"]
        XCTAssertTrue(dock.waitForExistence(timeout: 5))
        if tabs.exists { XCTAssertGreaterThan(dock.frame.minY, tabs.frame.maxY) }
        XCTAssertFalse(app.buttons["Open standup"].exists)
        XCTAssertFalse(app.buttons["team-link-l1"].exists)
        let person = app.descendants(matching: .any).matching(identifier: "standup-person-p1").firstMatch
        XCTAssertTrue(person.waitForExistence(timeout: 5)); XCTAssertTrue(person.label.hasPrefix("1."))
        app.buttons["standup-edit-list"].tap()
        XCTAssertTrue(app.textFields["standup-list-name"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["standup-member-p1"].exists)
        XCTAssertFalse(app.staticTexts["Standup links"].exists)
        let member = app.textFields["standup-member-p1"]
        member.tap(); let oldName = member.value as? String ?? ""; member.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: oldName.count) + "Alex Preview")
        app.buttons["Save"].tap()
        XCTAssertTrue(app.buttons["standup-generate"].waitForExistence(timeout: 5)); app.buttons["standup-generate"].tap()
        XCTAssertTrue(person.label.contains("Alex Preview"))
        dock.tap()
        let dockedList = app.otherElements["standup-docked-list"]
        XCTAssertTrue(app.buttons["standup-close-dock"].waitForExistence(timeout: 5))
        XCTAssertGreaterThanOrEqual(dockedList.frame.minX, app.buttons["sidebar-Team"].frame.maxX)
        XCTAssertLessThanOrEqual(app.textFields["Search"].firstMatch.frame.maxX, app.frame.maxX)
        XCTAssertFalse(dockedList.staticTexts["List settings"].exists)
        XCTAssertFalse(dockedList.buttons["team-list-selection"].exists)
        XCTAssertFalse(dockedList.staticTexts["Standup links"].exists)
        XCTAssertFalse(app.buttons["standup-dock"].exists)
        let dockShot = XCTAttachment(screenshot: app.screenshot()); dockShot.name = "iPad numbered Standup and simple dock"; dockShot.lifetime = .keepAlways; add(dockShot)
        app.buttons["standup-close-dock"].tap(); XCTAssertTrue(dock.waitForExistence(timeout: 5))
        app.buttons["team-section-overview"].tap()
        let edit = app.buttons["team-link-edit-l2"]
        XCTAssertTrue(edit.waitForExistence(timeout: 5)); edit.tap()
        let name = app.textFields["team-link-name"]
        let urlEditor = app.textFields["team-link-url"].exists ? app.textFields["team-link-url"] : app.textViews["team-link-url"]
        XCTAssertTrue(urlEditor.waitForExistence(timeout: 5)); XCTAssertGreaterThanOrEqual(urlEditor.frame.height, 60)
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.press(forDuration: 1.2)
        let selectAll = app.menuItems["Select All"]
        if selectAll.waitForExistence(timeout: 3) { selectAll.tap() } else { let button = app.buttons["Select All"]; XCTAssertTrue(button.waitForExistence(timeout: 3)); button.tap() }
        name.typeText("Shared preview edit"); XCTAssertEqual(name.value as? String, "Shared preview edit")
        app.buttons["Save"].tap()
        XCTAssertTrue(app.buttons["Edit Shared preview edit"].waitForExistence(timeout: 10))
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "iPad Team Tools below tab navigation"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["sidebar-Home"].tap()
        let homeTabs = app.staticTexts["Open tabs"].firstMatch
        for _ in 0..<4 { if homeTabs.exists { break }; app.swipeUp() }
        XCTAssertTrue(homeTabs.exists)
        let recentHeader = app.staticTexts["Recents"].firstMatch
        for _ in 0..<12 { if recentHeader.exists { break }; app.swipeUp() }
        XCTAssertTrue(recentHeader.exists)
    }
}

final class PhoneFeaturePreviewUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testPhoneFeatureHeaderAndLongPressServiceLink() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 20)); app.buttons["phone-app-navigation"].tap(); app.buttons["phone-nav-Chats"].tap()
        XCTAssertTrue(app.buttons["new-chat"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["phone-new-tab"].exists)
        let search = app.textFields["Search"].firstMatch
        XCTAssertTrue(search.exists); XCTAssertGreaterThan(search.frame.minY, app.frame.height * 0.65)
        let titles = app.staticTexts.matching(NSPredicate(format: "label == 'Chats'"))
        XCTAssertEqual(titles.count, 1)
        XCTAssertGreaterThan(titles.firstMatch.frame.width, 30)
        app.buttons["phone-app-navigation"].tap(); app.buttons["phone-nav-Team"].tap(); app.buttons["team-section-overview"].tap()
        let link = app.buttons["team-link-l2"]
        XCTAssertTrue(link.waitForExistence(timeout: 10))
        XCTAssertFalse(link.label.isEmpty)
        link.press(forDuration: 0.7)
        XCTAssertTrue(app.buttons["View or edit URL"].waitForExistence(timeout: 5))
        app.buttons["View or edit URL"].tap()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "team-link-url").firstMatch.waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "iPhone service links and compact header"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["team-section-standup"].tap()
        XCTAssertTrue(app.buttons["standup-edit-list"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["standup-dock"].exists); XCTAssertFalse(app.buttons["Open standup"].exists)
        XCTAssertFalse(app.buttons["team-link-l1"].exists); XCTAssertFalse(app.staticTexts["Standup links"].exists)
        let person = app.descendants(matching: .any).matching(identifier: "standup-person-p1").firstMatch
        XCTAssertTrue(person.exists); XCTAssertTrue(person.label.hasPrefix("1."))
        app.buttons["standup-edit-list"].tap(); XCTAssertTrue(app.textFields["standup-member-p1"].waitForExistence(timeout: 5)); XCTAssertFalse(app.staticTexts["Standup links"].exists); app.buttons["Cancel"].tap()
        let standupShot = XCTAttachment(screenshot: app.screenshot()); standupShot.name = "iPhone numbered Standup tab only"; standupShot.lifetime = .keepAlways; add(standupShot)
        app.buttons["phone-app-navigation"].tap()
        let drawer = app.scrollViews["phone-navigation-drawer"]
        XCTAssertTrue(drawer.waitForExistence(timeout: 5))
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.buttons["phone-nav-Home"].frame.minX >= app.frame.minX - 1 }, object: drawer)
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 5), .completed)
        let sidebarShot = XCTAttachment(screenshot: app.screenshot()); sidebarShot.name = "iPhone desktop sidebar colors and icons"; sidebarShot.lifetime = .keepAlways; add(sidebarShot)
    }
}

final class PhoneSidebarPreviewUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testProjectItemFromMainBrowserRetainsOwnerAndSelection() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        XCTAssertTrue(app.buttons["phone-new-tab"].waitForExistence(timeout: 20)); app.buttons["phone-new-tab"].tap(); app.buttons["Browser · Default"].tap()
        XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 10)); app.buttons["phone-app-navigation"].tap()
        let drawer = app.scrollViews["phone-navigation-drawer"]
        XCTAssertTrue(drawer.waitForExistence(timeout: 5))
        let studio = app.buttons["Expand Studio"]
        XCTAssertTrue(studio.waitForExistence(timeout: 15)); studio.tap()
        let project = app.buttons["Expand Design review"]
        XCTAssertTrue(project.waitForExistence(timeout: 5)); project.tap()
        let item = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "project-recent-", "Synthetic project notes 8")).firstMatch
        for _ in 0..<5 { if item.isHittable { break }; drawer.swipeUp() }
        XCTAssertTrue(item.waitForExistence(timeout: 5)); item.tap()
        let title = app.scrollViews["chat-conversation-scroll"]
        XCTAssertTrue(title.waitForExistence(timeout: 15)); XCTAssertEqual(title.label, "Synthetic project notes 8")
        XCTAssertFalse(app.buttons["browser-address"].isHittable)
        app.buttons["phone-app-navigation"].tap()
        XCTAssertTrue(item.waitForExistence(timeout: 5)); XCTAssertEqual(item.value as? String, "Active"); XCTAssertTrue(item.isSelected)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Phone selected project item desktop nesting"; shot.lifetime = .keepAlways; add(shot)
    }
}

/// Existing signed preview identities and pairings; provider execution is the local fixture.
@MainActor private func openComposerDesignPreview(phone: Bool, questions: Bool = false) -> XCUIApplication {
    // Exercise the app built by this test invocation, with its current fixture
    // ports, instead of a separately installed and potentially stale preview.
    let app = nativeFixtureApplication()
    app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
    app.launch()
    if phone {
        XCTAssertTrue(app.buttons["phone-app-navigation"].waitForExistence(timeout: 20)); app.buttons["phone-app-navigation"].tap()
        XCTAssertTrue(app.buttons["phone-nav-Chats"].waitForExistence(timeout: 8)); app.buttons["phone-nav-Chats"].tap()
    } else {
        XCTAssertTrue(app.buttons["sidebar-Chats"].waitForExistence(timeout: 20)); app.buttons["sidebar-Chats"].tap()
    }
    let seeded = app.buttons.matching(NSPredicate(format: "label CONTAINS %@ AND label CONTAINS %@", phone ? "iPhone line editor rehearsal" : "iPad line editor rehearsal", "Build Mac")).firstMatch
    if !questions && seeded.waitForExistence(timeout: 3) {
        seeded.tap(); XCTAssertTrue(app.scrollViews["chat-conversation-scroll"].waitForExistence(timeout: 20)); return app
    }
    let create = app.buttons["new-chat"]
    XCTAssertTrue(create.waitForExistence(timeout: 10))
    let connected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: create)
    XCTAssertEqual(XCTWaiter.wait(for: [connected], timeout: 20), .completed); create.tap()
    let name = app.textFields["new-chat-name"]
    XCTAssertTrue(name.waitForExistence(timeout: 8)); name.tap(); name.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (name.value as? String ?? "").count)); name.typeText(phone ? "iPhone composer controls rehearsal" : "iPad composer controls rehearsal")
    let prompt = app.textFields["chat-prompt"]; prompt.tap(); prompt.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (prompt.value as? String ?? "").count)); prompt.typeText(questions ? "Structured questions rehearsal" : "Synthetic composer design rehearsal. No external workflow.")
    app.buttons["chat-provider"].tap(); app.buttons["GitHub Copilot"].tap()
    let picker = app.buttons["model-picker"]
    XCTAssertTrue(picker.waitForExistence(timeout: 10)); picker.tap(); app.buttons["Synthetic mobile · synthetic-mobile"].tap()
    let start = app.buttons["start-chat"]
    let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: start)
    XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 10), .completed); start.tap()
    XCTAssertTrue(app.scrollViews["chat-conversation-scroll"].waitForExistence(timeout: 20))
    return app
}

@MainActor private func verifyQuestionQueueAnswers(phone: Bool) {
    let app = openComposerDesignPreview(phone: phone, questions: true)
    let queue = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Questions to answer (2)")).firstMatch
    XCTAssertTrue(queue.waitForExistence(timeout: 15)); queue.tap()
    let question = app.buttons["Choose a rehearsal destination"]
    XCTAssertTrue(question.waitForExistence(timeout: 5)); question.tap()
    XCTAssertEqual(app.buttons["chat-question-queue-toggle"].value as? String, "Collapsed", "Selecting a question must release the queue space for its answer controls")
    let choice = app.buttons["Project B"]
    XCTAssertTrue(choice.waitForExistence(timeout: 5)); choice.tap()
    let remaining = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Questions to answer (1)")).firstMatch
    XCTAssertTrue(remaining.waitForExistence(timeout: 15))
    let custom = app.buttons["Any rehearsal instructions?"]
    if !custom.exists { remaining.tap() }
    XCTAssertTrue(custom.waitForExistence(timeout: 5)); custom.tap()
    XCTAssertEqual(app.buttons["chat-question-queue-toggle"].value as? String, "Collapsed")
    let input = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "question-answer-")).firstMatch
    XCTAssertTrue(input.waitForExistence(timeout: 5)); input.tap(); input.typeText("Keep the same session")
    XCTAssertEqual(input.value as? String, "Keep the same session")
    XCTAssertTrue(app.buttons["Send answer"].firstMatch.isHittable)
    XCTAssertTrue(app.keyboards.buttons["Send"].waitForExistence(timeout: 5))
    app.keyboards.buttons["Send"].tap()
    let answered = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: remaining)
    XCTAssertEqual(XCTWaiter.wait(for: [answered], timeout: 15), .completed)
    XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Keep the same session")).firstMatch.waitForExistence(timeout: 10))
}

final class PhoneComposerPreviewUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testQuestionQueueChoicesAndCustomAnswerUseOwnerSession() { verifyQuestionQueueAnswers(phone: true) }
    @MainActor func testOneLineComposerExpandsControlsAndPreservesDraft() {
        let app = openComposerDesignPreview(phone: true)
        let compact = app.buttons["composer-preview"]
        XCTAssertTrue(compact.waitForExistence(timeout: 10)); XCTAssertLessThanOrEqual(compact.frame.height, 44)
        XCTAssertFalse(app.buttons["send-message"].exists); XCTAssertFalse(app.buttons["composer-options"].exists); XCTAssertFalse(app.buttons["chat-attach"].exists)
        let compactShot = XCTAttachment(screenshot: app.screenshot()); compactShot.name = "Final iPhone one-line composer"; compactShot.lifetime = .keepAlways; add(compactShot)
        let collapsedCard = app.descendants(matching: .any).matching(identifier: "reply-composer-card").firstMatch
        collapsedCard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0)).withOffset(CGVector(dx: 0, dy: 2)).tap()
        let editor = app.textViews["reply-text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5)); XCTAssertTrue(app.buttons["send-message"].exists)
        let initialHeight = editor.frame.height
        XCTAssertLessThanOrEqual(initialHeight, 44)
        XCTAssertTrue(app.buttons["composer-options"].waitForExistence(timeout: 10)); XCTAssertTrue(app.buttons["chat-attach"].exists)
        editor.tap()
        let singleLine = "Unsent preview draft that is long enough to wrap across several visual lines in this editor."
        editor.typeText(singleLine)
        XCTAssertEqual(editor.frame.height, initialHeight, accuracy: 1, "Soft wrapping must scroll without growing the box")
        editor.typeText("\nSecond line")
        let draft = singleLine + "\nSecond line"
        XCTAssertEqual(editor.value as? String, draft, "iPhone Return adds a newline without sending")
        XCTAssertGreaterThan(editor.frame.height, initialHeight)
        let expandedShot = XCTAttachment(screenshot: app.screenshot()); expandedShot.name = "Final iPhone expanded composer controls"; expandedShot.lifetime = .keepAlways; add(expandedShot)
        app.scrollViews["chat-conversation-scroll"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        XCTAssertTrue(compact.waitForExistence(timeout: 5)); XCTAssertEqual(compact.value as? String, draft)
        XCTAssertFalse(app.buttons["send-message"].exists)
        compact.tap(); XCTAssertTrue(editor.waitForExistence(timeout: 5)); XCTAssertEqual(editor.value as? String, draft)
        app.buttons["composer-options"].tap()
        XCTAssertTrue(app.buttons["composer-section-Model"].waitForExistence(timeout: 5)); XCTAssertTrue(app.buttons["composer-section-Level"].exists)
        app.buttons["Done"].tap()
        editor.tap(); editor.typeText(String(repeating: "\n", count: 45))
        let completeDraft = draft + String(repeating: "\n", count: 45)
        let committed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in editor.value as? String == completeDraft }, object: editor)
        XCTAssertEqual(XCTWaiter.wait(for: [committed], timeout: 3), .completed)
        XCTAssertEqual(editor.value as? String, completeDraft)
        let card = app.descendants(matching: .any).matching(identifier: "reply-composer-card").firstMatch
        XCTAssertLessThanOrEqual(card.frame.height, app.frame.height * 0.5 + 1)
        let cappedShot = XCTAttachment(screenshot: app.screenshot()); cappedShot.name = "iPhone composer capped at half-screen with scrolling text"; cappedShot.lifetime = .keepAlways; add(cappedShot)
        app.buttons["send-message"].tap()
        let saved = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Checkpoint saved:")).firstMatch
        XCTAssertTrue(saved.waitForExistence(timeout: 15), "Only the Send button submits the iPhone draft to the synthetic provider")
    }
}

final class NativeReleaseParityUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testPhoneRestoresProjectBrowserWithLargeHistoryAndBoundedOverview() throws {
        try XCTSkipIf(UIDevice.current.userInterfaceIdiom != .phone, "Phone restoration fixture")
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-workspace-tab-icons", "--synthetic-workspace-browser-selection", "--synthetic-project-restore", "--synthetic-large-browser"]
        app.launch()
        let drawer = app.buttons["phone-app-navigation"]
        XCTAssertTrue(drawer.waitForExistence(timeout: 15)); drawer.tap()
        let workspace = app.buttons["workspace-tree-open-workspace:10000000-0000-4000-8000-000000000001:native-icon-workspace"]
        XCTAssertTrue(workspace.waitForExistence(timeout: 10)); workspace.tap()
        let first = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label BEGINSWITH %@", "workspace-child-tab-", "First browser page")).firstMatch
        XCTAssertTrue(first.waitForExistence(timeout: 10))
        XCTAssertEqual(first.value as? String, "Selected")
        XCTAssertTrue(app.buttons["browser-tab-overview"].waitForExistence(timeout: 10))
        app.buttons["browser-tab-overview"].tap()
        XCTAssertTrue(app.otherElements["phone-tab-overview"].waitForExistence(timeout: 5))
        let cards = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "phone-tab-browser:"))
        XCTAssertGreaterThanOrEqual(cards.count, 2)
        for card in cards.allElementsBoundByIndex.prefix(2) {
            XCTAssertLessThanOrEqual(card.frame.width, (app.frame.width - 36 - 18) / 2 + 2)
            XCTAssertGreaterThanOrEqual(card.frame.minX, app.frame.minX)
            XCTAssertLessThanOrEqual(card.frame.maxX, app.frame.maxX)
        }
        XCTAssertFalse(app.keyboards.firstMatch.exists)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "100 saved tabs and 30000 history entries with tall previews"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["Done"].tap()
        XCUIDevice.shared.press(.home)
        app.terminate(); app.launchArguments = []; app.launch()
        XCTAssertTrue(first.waitForExistence(timeout: 15), "Cold launch must return to the same saved workspace/project instead of Home")
        XCTAssertEqual(first.value as? String, "Selected")
        XCTAssertTrue(app.buttons["browser-tab-overview"].exists)
    }
}

final class TabletComposerPreviewUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testTabletQuestionQueueChoicesAndCustomAnswerUseOwnerSession() { verifyQuestionQueueAnswers(phone: false) }
    @MainActor func testTabletCompactComposerRemainsVisibleAndReturnSubmits() {
        let app = openComposerDesignPreview(phone: false)
        let editor = app.textViews["reply-text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10)); XCTAssertFalse(app.buttons["composer-preview"].exists)
        XCTAssertTrue(app.buttons["send-message"].exists); XCTAssertTrue(app.buttons["chat-attach"].exists)
        let initialHeight = editor.frame.height
        XCTAssertLessThanOrEqual(initialHeight, 44)
        XCTAssertTrue(app.buttons["composer-model"].exists || app.buttons["composer-options"].exists)
        editor.tap(); editor.typeText("Unsent tablet preview draft")
        let draft = "Unsent tablet preview draft"
        XCTAssertEqual(editor.value as? String, draft)
        XCTAssertEqual(editor.frame.height, initialHeight, accuracy: 1)
        app.scrollViews["chat-conversation-scroll"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        XCTAssertTrue(editor.exists); XCTAssertEqual(editor.value as? String, draft)
        XCTAssertTrue(app.buttons["send-message"].exists); XCTAssertFalse(app.buttons["composer-preview"].exists)
        let card = app.descendants(matching: .any).matching(identifier: "reply-composer-card").firstMatch
        XCTAssertLessThanOrEqual(card.frame.height, app.frame.height * 0.5 + 1)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "iPad one-line editor and attachment control"; shot.lifetime = .keepAlways; add(shot)
        // XCTest on this runtime drops hardware Return events; Shift+Return is covered by
        // NativeReplyTextView command tests and a captured-keyboard native GUI rehearsal.
        editor.tap(); editor.typeText("\n")
        let saved = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Checkpoint saved:")).firstMatch
        XCTAssertTrue(saved.waitForExistence(timeout: 15), "Unmodified Return still submits on iPad")
    }
}

final class NativeReleaseFollowupUITests: XCTestCase {
    @MainActor func testNewChatIsATabAndPreservesItsDraft() throws {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        if let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) {
            navigation.tap(); app.buttons["phone-nav-Chats"].tap()
        } else { XCTAssertTrue(app.buttons["sidebar-Chats"].waitForExistence(timeout: 20)); app.buttons["sidebar-Chats"].tap() }
        let create = app.buttons["new-chat"]
        XCTAssertTrue(create.waitForExistence(timeout: 15))
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: create)], timeout: 20), .completed)
        create.tap()
        let prompt = app.textFields["chat-prompt"]
        XCTAssertTrue(prompt.waitForExistence(timeout: 12)); XCTAssertEqual(app.sheets.count, 0)
        prompt.tap(); prompt.typeText("Unsent independent setup tab")
        if app.buttons["Hide keyboard"].exists { app.buttons["Hide keyboard"].tap() }
        openNotificationFixtureHome(app)
        let draft = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label == %@", "shell-tab-draft:", "New chat")).firstMatch
        if !draft.isHittable, let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { navigation.tap() }
        XCTAssertTrue(draft.waitForExistence(timeout: 10)); draft.tap()
        XCTAssertTrue(prompt.waitForExistence(timeout: 10)); XCTAssertEqual(prompt.value as? String, "Unsent independent setup tab")
        XCTAssertEqual(app.sheets.count, 0)
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "New chat in a tab with retained draft"; proof.lifetime = .keepAlways; add(proof)
        app.buttons["Cancel"].tap()
        XCTAssertFalse(prompt.exists)
    }
    @MainActor func testComputerActionsFitPhoneAndExplainSelection() {
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-linux-host"]; app.launch()
        let navigation = app.buttons["phone-app-navigation"]; XCTAssertTrue(navigation.waitForExistence(timeout: 15)); navigation.tap()
        let engine = app.buttons["phone-nav-Engine Room"]
        for _ in 0..<6 where !engine.isHittable { app.scrollViews["phone-navigation-drawer"].swipeUp() }
        XCTAssertTrue(engine.isHittable); engine.tap()
        let connections = app.buttons["Connections"]
        XCTAssertTrue(connections.waitForExistence(timeout: 10)); connections.tap()
        let selected = app.buttons["select-10000000-0000-4000-8000-000000000001"]
        XCTAssertTrue(selected.waitForExistence(timeout: 10)); XCTAssertEqual(selected.label, "Selected"); XCTAssertFalse(selected.isEnabled)
        let other = app.buttons["select-10000000-0000-4000-8000-000000000002"]
        XCTAssertEqual(other.label, "Use computer"); XCTAssertTrue(other.isEnabled)
        for button in [selected, other, app.buttons["rename-10000000-0000-4000-8000-000000000001"], app.buttons["edit-relay-10000000-0000-4000-8000-000000000001"]] {
            XCTAssertGreaterThanOrEqual(button.frame.width, 70); XCTAssertLessThanOrEqual(button.frame.height, 44); XCTAssertLessThanOrEqual(button.frame.maxX, app.frame.maxX)
        }
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "Readable computer actions and explicit selection"; proof.lifetime = .keepAlways; add(proof)
    }
    @MainActor func testSwitchProjectsWhileProjectDestinationIsOpen() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(nativeFixtureHTTPOrigin)/pair?projects=1")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let projectID = try XCTUnwrap(fixture["projectId"] as? String)
        let defaultID = try XCTUnwrap(fixture["defaultProjectId"] as? String)
        let app = nativeFixtureApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        // Resetting pairing preserves navigation. Explicitly visit Home before
        // entering the code rather than targeting a retained offscreen form.
        openNotificationFixtureHome(app)
        let link = app.descendants(matching: .any).matching(identifier: "pairing-link").firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(try XCTUnwrap(fixture["code"] as? String)); app.buttons["pair-mac"].tap()
        for id in [projectID, defaultID, projectID, defaultID] {
            let button = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND identifier ENDSWITH %@", "project-tree-open-", id)).firstMatch
            if !button.isHittable {
                let drawer = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable })
                drawer?.tap()
            }
            let workspace = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label CONTAINS %@", "workspace-tree-open-", "Studio")).firstMatch
            if !button.exists && workspace.waitForExistence(timeout: 10) { workspace.tap(); app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable })?.tap() }
            XCTAssertTrue(button.waitForExistence(timeout: 10)); let title = button.label; button.tap()
            let pinned = app.buttons["project-pinned-tab"]
            XCTAssertTrue(pinned.waitForExistence(timeout: 10))
            let matches = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label CONTAINS %@", id == defaultID ? "General" : "Design review"), object: pinned)
            XCTAssertEqual(XCTWaiter.wait(for: [matches], timeout: 5), .completed, title + " currently " + pinned.label)
        }
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "Project switching keeps destination identity"; proof.lifetime = .keepAlways; add(proof)
    }
    @MainActor func testWorkspaceAndProjectNamesExpandTheirSections() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        let workspace = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "workspace-tree-open-")).firstMatch
        func revealNavigation() {
            if !workspace.isHittable, let navigation = app.buttons.matching(identifier: "phone-app-navigation").allElementsBoundByIndex.first(where: { $0.isHittable }) { navigation.tap() }
        }
        revealNavigation()
        XCTAssertTrue(workspace.waitForExistence(timeout: 20))
        app.buttons["Collapse all workspaces"].tap()
        let workspaceID = String(workspace.identifier.dropFirst("workspace-tree-open-".count))
        let workspaceToggle = app.buttons["workspace-tree-toggle-" + workspaceID]
        XCTAssertEqual(workspaceToggle.value as? String, "Collapsed")
        workspace.tap(); revealNavigation()
        XCTAssertEqual(workspaceToggle.value as? String, "Expanded")
        let project = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "project-tree-open-")).firstMatch
        XCTAssertTrue(project.waitForExistence(timeout: 10))
        let projectID = String(project.identifier.dropFirst("project-tree-open-".count))
        let projectToggle = app.buttons["project-tree-toggle-" + projectID]
        project.tap(); revealNavigation()
        XCTAssertEqual(projectToggle.value as? String, "Expanded")
        projectToggle.tap(); XCTAssertEqual(projectToggle.value as? String, "Collapsed")
        project.tap(); revealNavigation(); XCTAssertEqual(projectToggle.value as? String, "Expanded")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Workspace and project name auto expansion"; shot.lifetime = .keepAlways; add(shot)
    }
    @MainActor func testRestoredWorkspaceBrowserSelectionAndSwitching() throws {
        try XCTSkipIf(UIDevice.current.userInterfaceIdiom != .pad, "This fixture exercises the tablet workspace strip; phone navigation uses its drawer.")
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-workspace-tab-icons", "--synthetic-workspace-browser-selection"]
        app.launch()
        let workspaces = app.buttons["Workspaces"].firstMatch
        XCTAssertTrue(workspaces.waitForExistence(timeout: 15)); workspaces.tap()
        let workspace = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Native icon rehearsal")).firstMatch
        XCTAssertTrue(workspace.waitForExistence(timeout: 10)); workspace.tap()
        let first = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label BEGINSWITH %@", "workspace-child-tab-", "First browser page")).firstMatch
        let third = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label BEGINSWITH %@", "workspace-child-tab-", "Third browser page")).firstMatch
        XCTAssertTrue(first.waitForExistence(timeout: 10))
        XCTAssertEqual(first.value as? String, "Selected")
        XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 15), "Restoring the highlighted child must show its page, even when the scoped browser selection was different")
        let load = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Load ")).firstMatch
        let loaded = load.label
        for _ in 0..<3 {
            third.tap(); XCTAssertTrue(app.webViews.staticTexts["Third browser page"].waitForExistence(timeout: 10))
            XCTAssertEqual(third.value as? String, "Selected")
            first.tap(); XCTAssertTrue(app.webViews.staticTexts["First browser page"].waitForExistence(timeout: 10))
            XCTAssertEqual(first.value as? String, "Selected"); XCTAssertEqual(load.label, loaded, "Selection must reuse this tab's existing WebKit page")
        }
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "iPad selected workspace browser underline"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["workspace-page-Chats"].tap()
        XCTAssertTrue(app.buttons["workspace-page-Chats"].isHittable)
        let pages = XCTAttachment(screenshot: app.screenshot()); pages.name = "iPad workspace page underline"; pages.lifetime = .keepAlways; add(pages)
        let mainOverview = app.buttons["main-tab-overview-button"], addTab = app.buttons["new-main-browser-tab"]
        XCTAssertTrue(mainOverview.isHittable); XCTAssertLessThanOrEqual(mainOverview.frame.maxX, addTab.frame.minX + 1)
        let mainIDs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "shell-tab-")).allElementsBoundByIndex.map { String($0.identifier.dropFirst("shell-tab-".count)) }
        XCTAssertFalse(mainIDs.isEmpty); mainOverview.tap()
        let overview = app.otherElements["main-tab-overview"]
        XCTAssertTrue(overview.waitForExistence(timeout: 5)); XCTAssertTrue(app.staticTexts["App tabs"].exists)
        let cardIDs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "phone-tab-")).allElementsBoundByIndex.map { String($0.identifier.dropFirst("phone-tab-".count)) }
        XCTAssertEqual(Set(cardIDs), Set(mainIDs), "App overview contains the device's main roots, excluding workspace children")
        app.buttons["phone-tab-" + mainIDs[0]].tap()
        let closed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: overview)
        XCTAssertEqual(XCTWaiter.wait(for: [closed], timeout: 5), .completed)
        XCTAssertEqual(app.buttons["shell-tab-" + mainIDs[0]].value as? String, "Active")
    }
    @MainActor func testEngineRoomPaletteSaveAndDiscard() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--native-design-preview", "--synthetic-destinations", "--synthetic-long-chat"]
        app.launch()
        if app.buttons["phone-app-navigation"].waitForExistence(timeout: 5) {
            app.buttons["phone-app-navigation"].tap()
            let engine = app.buttons["phone-nav-Engine Room"]
            for _ in 0..<6 { if engine.isHittable { break }; app.scrollViews["phone-navigation-drawer"].swipeUp() }; engine.tap()
        } else { let engine = app.buttons["sidebar-Engine Room"]; XCTAssertTrue(engine.waitForExistence(timeout: 10)); engine.tap() }
        app.buttons["Colors"].firstMatch.tap()
        let name = app.textFields["palette-name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10)); name.tap(); name.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (name.value as? String ?? "").count) + "Synthetic palette")
        let slider = app.sliders["palette-lightness"]; XCTAssertTrue(slider.exists); slider.adjust(toNormalizedSliderPosition: 0.6)
        let save = app.buttons["palette-save"]
        for _ in 0..<30 { if save.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(save.isHittable); save.tap()
        let savedStatus = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", "Palette saved on this device"), object: app.staticTexts["palette-save-status"])
        XCTAssertEqual(XCTWaiter.wait(for: [savedStatus], timeout: 5), .completed)
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "Actual Engine Room palette controls and save"; shot.lifetime = .keepAlways; add(shot)
        app.buttons["Proteus defaults"].tap(); app.buttons["Discard changes"].tap()
        XCTAssertEqual(app.staticTexts["palette-save-status"].label, "Saved palette")
    }

    override func setUpWithError() throws { continueAfterFailure = false }
    @MainActor func testIPadWorkspacePagesAndItemsUseOneContinuousTabStrip() throws {
        try XCTSkipIf(UIDevice.current.userInterfaceIdiom != .pad, "This fixture exercises the tablet workspace strip; phone navigation uses its drawer.")
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--synthetic-destinations", "--synthetic-long-chat", "--synthetic-workspace-tab-icons"]
        app.launch()
        let workspace = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Native icon rehearsal")).firstMatch
        XCTAssertTrue(workspace.waitForExistence(timeout: 10)); workspace.tap()
        let configuration = app.buttons["workspace-page-Configuration"]
        let chat = app.buttons["workspace-child-tab-chat:long-chat"]
        XCTAssertTrue(configuration.waitForExistence(timeout: 10)); XCTAssertTrue(chat.exists)
        XCTAssertLessThanOrEqual(chat.frame.minX - configuration.frame.maxX, 44, "No flexible gap separates Configuration from the first content tab")
        XCTAssertLessThan(abs(chat.frame.midY - configuration.frame.midY), 3)
        configuration.tap(); app.buttons["workspace-page-Chats"].tap()
        XCTAssertTrue(chat.exists)
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "iPad continuous workspace strip and tab dividers"; proof.lifetime = .keepAlways; add(proof)
    }
    @MainActor func testPhoneLabelsAddressTabSwipesCompactBottomAndScrollRecovery() {
        let app = nativeFixtureApplication()
        app.launchArguments = ["--reset-pairing", "--native-design-preview", "--phone-preview-fixture", "--synthetic-browser-workspace", "--native-app-fixture"]
        app.launch()
        XCTAssertTrue(app.buttons["phone-new-tab"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["feature-page-label"].exists, "The page name is a plain label")
        XCTAssertEqual(app.buttons.matching(identifier: "feature-page-label").count, 0)
        XCTAssertLessThanOrEqual(app.buttons["phone-app-navigation"].frame.width, 64, "Sidebar control contains only its icon")
        let headingProof = XCTAttachment(screenshot: app.screenshot()); headingProof.name = "Phone Home label separate from sidebar button"; headingProof.lifetime = .keepAlways; add(headingProof)
        let urls = ["\(nativeFixtureHTTPOrigin)/browser/phone-preview?nested=1&tab=first", "\(nativeFixtureHTTPOrigin)/browser/phone-preview?nested=1&tab=second"]
        for url in urls {
            app.buttons["phone-new-tab"].tap()
            let editor = app.textFields["new-tab-address"]
            XCTAssertTrue(editor.waitForExistence(timeout: 10)); editor.tap(); editor.typeText(url); app.buttons["Open address"].tap()
            XCTAssertTrue(app.webViews.firstMatch.staticTexts["Proteus browser rehearsal"].waitForExistence(timeout: 15))
        }
        let address = app.buttons["browser-address"]
        let start = address.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.5))
        let end = address.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5))
        start.press(forDuration: 0.1, thenDragTo: end)
        let first = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", urls[0]), object: address)
        XCTAssertEqual(XCTWaiter.wait(for: [first], timeout: 5), .completed)
        end.press(forDuration: 0.1, thenDragTo: start)
        let second = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", urls[1]), object: address)
        XCTAssertEqual(XCTWaiter.wait(for: [second], timeout: 5), .completed)
        XCTAssertFalse(app.descendants(matching: .any)["browser-address-editor"].exists, "A swipe must not start address editing")
        XCTAssertEqual(app.buttons["browser-find"].frame.height, 48, accuracy: 1, "Keep the existing touch target")
        XCTAssertLessThanOrEqual(app.frame.maxY - app.buttons["browser-find"].frame.maxY, 40, "Only the system home-indicator safe area remains below the controls")
        XCTAssertLessThanOrEqual(app.buttons["browser-find"].frame.maxY, app.frame.maxY)
        XCTAssertTrue(app.buttons["browser-find"].isHittable)
        let page = app.webViews.firstMatch
        page.swipeUp()
        let hidden = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: address)
        XCTAssertEqual(XCTWaiter.wait(for: [hidden], timeout: 5), .completed)
        XCTAssertTrue(app.buttons["phone-browser-more"].isHittable)
        page.swipeDown()
        XCTAssertTrue(address.waitForExistence(timeout: 5), "Scroll up always restores top navigation")
        let proof = XCTAttachment(screenshot: app.screenshot()); proof.name = "Phone separate label, compact footer and ordered address swipe"; proof.lifetime = .keepAlways; add(proof)
        let options = XCTMeasureOptions(); options.iterationCount = 3
        measure(metrics: [XCTOSSignpostMetric.scrollingAndDecelerationMetric, XCTCPUMetric(application: app), XCTMemoryMetric(application: app)], options: options) { page.swipeUp(); page.swipeDown() }
    }
}

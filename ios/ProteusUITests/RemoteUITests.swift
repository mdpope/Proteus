import XCTest

final class RemoteUITests: XCTestCase {
    override func setUp() { super.setUp(); continueAfterFailure = false }
    @MainActor func testExpandableToolOutput() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "http://127.0.0.1:4329/pair")!)
        let fixture = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let app = XCUIApplication(); app.launchArguments = ["--reset-pairing"]; app.launch()
        let link = app.textFields["pairing-link"]; XCTAssertTrue(link.waitForExistence(timeout: 15)); link.tap(); link.typeText(fixture["code"] as! String)
        app.buttons["pair-mac"].tap(); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
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
        app.buttons["pair-mac"].tap(); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
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
        app.buttons["pair-mac"].tap(); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
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
        app.buttons["pair-mac"].tap(); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
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
        app.buttons["pair-mac"].tap(); let newChat = app.buttons["new-chat"]; XCTAssertTrue(newChat.waitForExistence(timeout: 25)); newChat.tap()
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
        XCTAssertTrue(picker.waitForExistence(timeout: 20)); XCTAssertTrue(picker.label.contains("Build Mac"))
        picker.tap(); app.buttons["Work Mac"].tap()
        XCTAssertTrue(picker.label.contains("Work Mac"))
        picker.tap(); app.buttons["Manage Macs"].tap()
        let workID = "10000000-0000-4000-8000-000000000002"
        app.buttons["rename-" + workID].tap(); let field = app.alerts.textFields.firstMatch
        field.tap(); field.typeText(" 2"); let renamed = try XCTUnwrap(field.value as? String)
        XCTAssertNotEqual(renamed, "Work Mac")
        app.alerts.buttons["Save"].tap(); XCTAssertTrue(app.staticTexts[renamed].waitForExistence(timeout: 5))
        app.buttons["forget-" + workID].tap(); app.buttons["Forget Mac"].tap()
        XCTAssertFalse(app.staticTexts[renamed].exists); XCTAssertTrue(app.staticTexts["Build Mac"].exists)
        app.buttons["Done"].tap(); XCTAssertTrue(picker.label.contains("Build Mac"))
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
        XCTAssertTrue(picker.label.contains("Build Mac"))
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
        XCTAssertFalse(app.buttons["Life"].exists)
        setup.tap();toggle.coordinate(withNormalizedOffset: CGVector(dx:0.9,dy:0.5)).tap();XCTAssertEqual(toggle.value as? String,"1");app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["Life"].firstMatch.waitForExistence(timeout:5))
        app.buttons["Life"].firstMatch.tap()
        XCTAssertTrue(app.buttons["life-sign-in"].waitForExistence(timeout:10))
        app.buttons["Macs"].firstMatch.tap();setup.tap();toggle.coordinate(withNormalizedOffset: CGVector(dx:0.9,dy:0.5)).tap();app.buttons["Done"].tap()
        XCTAssertFalse(app.buttons["Life"].exists)
    }
}

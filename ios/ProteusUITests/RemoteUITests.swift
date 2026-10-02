import XCTest

final class RemoteUITests: XCTestCase {
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
        app.buttons["Send message"].tap()
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
        if app.buttons["Stop"].exists { app.buttons["Stop"].tap() }
    }
}

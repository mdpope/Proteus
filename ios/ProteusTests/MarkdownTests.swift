import XCTest
import SwiftUI
import WebKit
@testable import Proteus

final class MarkdownTests: XCTestCase {
    @MainActor func testBundledMarkdownRendersAndUpdatesWithoutExecutingMessageHTML() async throws {
        let text = "# Release checkpoint\n\n**Ready** and *formatted*.\n\n| Client | Status |\n| --- | --- |\n| Mac | Ready |\n| iPad | Ready |\n\n- [x] Complete\n\n```javascript\nconst value = 42;\n```\n\n<script>window.injected = true</script>\n\n![External](https://example.com/image.png)"
        let view = MarkdownView(text: text, runID: "synthetic", store: RemoteStore(), height: .constant(750))
        let controller = UIHostingController(rootView: view)
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let window = UIWindow(windowScene: scene); window.frame = UIScreen.main.bounds
        window.rootViewController = controller; window.makeKeyAndVisible()
        defer { window.isHidden = true; window.rootViewController = nil }
        func findWeb(_ view: UIView) -> WKWebView? { if let web = view as? WKWebView { return web }; return view.subviews.compactMap { findWeb($0) }.first }
        var web: WKWebView?
        for _ in 0..<100 { controller.view.layoutIfNeeded(); web = findWeb(controller.view); if web != nil { break }; try await Task.sleep(for: .milliseconds(100)) }
        let browser = try XCTUnwrap(web)
        var ready = false
        for _ in 0..<100 {
            if let count = try? await browser.evaluateJavaScript("document.querySelectorAll('table tr').length") as? Int, count == 3 { ready = true; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(ready, "Bundled renderer must work without CDN or network")
        let result = try await browser.evaluateJavaScript("({heading:document.querySelector('h1').textContent, bold:document.querySelector('strong').textContent, highlighted:!!document.querySelector('.hljs-keyword'), tasks:document.querySelectorAll('input:checked').length, images:document.querySelectorAll('img').length, injected:window.injected === true, height:document.body.scrollHeight})") as! [String: Any]
        XCTAssertEqual(result["heading"] as? String, "Release checkpoint"); XCTAssertEqual(result["bold"] as? String, "Ready")
        XCTAssertEqual(result["highlighted"] as? Bool, true); XCTAssertEqual(result["tasks"] as? Int, 1)
        XCTAssertEqual(result["images"] as? Int, 0); XCTAssertEqual(result["injected"] as? Bool, false)
        XCTAssertGreaterThan(result["height"] as? Int ?? 0, 100)
        _ = try await browser.evaluateJavaScript("document.querySelector('.md-copy').click()")
        try await Task.sleep(for: .milliseconds(100)); XCTAssertEqual(UIPasteboard.general.string, "const value = 42;\n")
        let image = try await browser.takeSnapshot(configuration: nil)
        let attachment = XCTAttachment(image: image); attachment.name = "Native rich Markdown"; attachment.lifetime = .keepAlways; add(attachment)
        _ = try await browser.callAsyncJavaScript("window.updateMarkdown(text)", arguments: ["text": "## Updated while streaming\n\n**Still formatted**"], in: nil, contentWorld: .page)
        let updated = try await browser.evaluateJavaScript("document.querySelector('h2').textContent") as? String
        XCTAssertEqual(updated, "Updated while streaming")
    }
}

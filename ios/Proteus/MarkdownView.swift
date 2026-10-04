import SwiftUI
import WebKit

struct MarkdownView: UIViewRepresentable {
    let text: String
    let runID: String
    let store: RemoteStore
    @Binding var height: CGFloat
    var onResize: () -> Void = {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.add(context.coordinator, name: "markdown")
        let web = WKWebView(frame: .zero, configuration: configuration)
        web.isOpaque = false; web.backgroundColor = .clear; web.scrollView.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false; web.navigationDelegate = context.coordinator
        web.setContentHuggingPriority(.defaultLow, for: .horizontal)
        if let file = Bundle.main.url(forResource: "native", withExtension: "html", subdirectory: "markdown") {
            web.loadFileURL(file, allowingReadAccessTo: file.deletingLastPathComponent())
        }
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self; context.coordinator.update(web) }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        web.configuration.userContentController.removeScriptMessageHandler(forName: "markdown"); web.navigationDelegate = nil
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: MarkdownView
        var loaded = false
        var rendered: String?
        init(_ parent: MarkdownView) { self.parent = parent }
        func update(_ web: WKWebView) {
            guard loaded, rendered != parent.text else { return }; rendered = parent.text
            // Pass Markdown as data, never interpolate model content into JavaScript or HTML.
            let text = parent.text
            // A WKWebView initially hidden behind the native fallback may defer ResizeObserver.
            // Measure the first render explicitly; later image/layout changes still use the bridge.
            web.callAsyncJavaScript("window.updateMarkdown(text); return document.body.getBoundingClientRect().height", arguments: ["text": text], in: nil, in: .page) { [weak self] result in
                guard let self, self.rendered == text else { return }
                if case .success(let value) = result, let height = value as? Double { self.resize(height) }
                if case .failure = result { self.rendered = nil }
            }
        }
        private func resize(_ value: Double) {
            guard value.isFinite, value > 1 else { return }
            let next = CGFloat(ceil(value))
            if abs(parent.height - next) > 1 { parent.height = next; parent.onResize() }
        }
        func webView(_ web: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; update(web) }
        func webView(_ web: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Links go through explicit native handling; message content cannot navigate the web view.
            decisionHandler(action.navigationType == .other && action.request.url?.isFileURL == true && !loaded ? .allow : .cancel)
        }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
                  let body = message.body as? [String: Any], let web = message.webView else { return }
            switch body["type"] as? String {
            case "height":
                if let value = body["height"] as? Double, value.isFinite, value > 0 {
                    resize(value)
                }
            case "copy": if let text = body["text"] as? String { UIPasteboard.general.string = text }
            case "link":
                if let value = body["url"] as? String, let url = URL(string: value) {
                    if ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "") { UIApplication.shared.open(url) }
                    else { UIPasteboard.general.string = value.removingPercentEncoding ?? value; parent.store.error = "Mac file path copied. Open it on your Mac: \(value.removingPercentEncoding ?? value)" }
                }
            case "image":
                guard let source = body["source"] as? String, let id = body["id"] as? String else { return }
                Task { [weak self, weak web] in
                    guard let self else { return }
                    let result = try? await parent.store.request("chat.image", ["id": .string(parent.runID), "source": .string(source)])
                    web?.callAsyncJavaScript("window.imageResult(id, dataURL)", arguments: ["id": id, "dataURL": result?["dataURL"].string ?? ""], in: nil, in: .page) { _ in }
                }
            default: break
            }
        }
    }
}

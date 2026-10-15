import SwiftUI
import WebKit

private struct NativeBrowserContainerKey: EnvironmentKey { static let defaultValue: String? = nil }
extension EnvironmentValues {
    var nativeBrowserContainer: String? {
        get { self[NativeBrowserContainerKey.self] }
        set { self[NativeBrowserContainerKey.self] = newValue }
    }
}

@MainActor final class NativePageSearch: ObservableObject {
    @Published var visible = false
    @Published var query = "" { didSet { if query != oldValue { counts = [:]; index = 0 } } }
    @Published var counts: [Int: Int] = [:]
    @Published var index = 0
    var total: Int { counts.values.reduce(0, +) }
    func match(in key: Int) -> Int {
        let before = counts.keys.filter { $0 < key }.reduce(0) { $0 + (counts[$1] ?? 0) }
        let local = index - before
        return local >= 0 && local < (counts[key] ?? 0) ? local : -1
    }
    func count(_ count: Int, key: Int, query: String) { guard !query.isEmpty, self.query == query, counts[key] != count else { return }; counts[key] = count; if index >= total { index = 0 } }
    func move(_ step: Int) { if total > 0 { index = (index + step + total) % total } }
    func close() { visible = false; query = "" }
}
struct NativePageFindBar: View {
    @ObservedObject var search: NativePageSearch
    var loadedOnly = false
    @FocusState private var focused: Bool
    var body: some View {
        HStack(spacing: 10) {
            TextField(loadedOnly ? "Find loaded messages" : "Find in page", text: $search.query).textInputAutocapitalization(.never).autocorrectionDisabled().focused($focused).onSubmit { search.move(1) }.accessibilityIdentifier("page-find-input")
            Text("\(search.total > 0 ? search.index + 1 : 0) of \(search.total)").font(.caption.monospacedDigit()).fixedSize().accessibilityIdentifier("page-find-count")
            Button { search.move(-1) } label: { Image(systemName: "arrow.up") }.accessibilityLabel("Previous match")
            Button { search.move(1) } label: { Image(systemName: "arrow.down") }.accessibilityLabel("Next match")
            Button { search.close() } label: { Image(systemName: "xmark") }.accessibilityLabel("Close find")
        }.buttonStyle(.plain).padding(10).frame(maxWidth: 460).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 8)).overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeTheme.line)).onAppear { focused = true }
    }
}

#if DEBUG
@MainActor enum NativeMarkdownDiagnostics { static var renderers: Set<ObjectIdentifier> = [] }
#endif
struct MarkdownView: UIViewRepresentable {
    @Environment(\.nativeBrowserContainer) private var browserContainer
    // All trusted bundled Markdown renderers use one ephemeral store. Creating a store
    // per message creates a separate WebKit process group for every row in a long chat.
    // Browser/profile stores and interactive HTML artifacts retain their own boundaries.
    @MainActor private static let rendererDataStore = WKWebsiteDataStore.nonPersistent()
    @MainActor static func rendererConfiguration() -> WKWebViewConfiguration {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = rendererDataStore
        return configuration
    }
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    let text: String
    let runID: String
    let store: RemoteStore
    @Binding var height: CGFloat
    var onDocumentLink: ((String) -> Void)? = nil
    var documentAssetURLs: [String: String]? = nil
    var onResize: () -> Void = {}
    var search: NativePageSearch? = nil
    var searchKey = 0

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = Self.rendererConfiguration()
        configuration.userContentController.add(context.coordinator, name: "markdown")
        let web = WKWebView(frame: .zero, configuration: configuration)
        #if DEBUG
        NativeMarkdownDiagnostics.renderers.insert(ObjectIdentifier(web))
        #endif
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
        #if DEBUG
        NativeMarkdownDiagnostics.renderers.remove(ObjectIdentifier(web))
        #endif
        web.configuration.userContentController.removeScriptMessageHandler(forName: "markdown"); web.navigationDelegate = nil
        web.stopLoading(); web.loadHTMLString("", baseURL: nil)
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: MarkdownView
        var loaded = false
        var rendered: String?
        var searched: String?
        var selection = -2
        init(_ parent: MarkdownView) { self.parent = parent }
        func update(_ web: WKWebView) {
            guard loaded else { return }
            if rendered == parent.text { updateSearch(web); return }
            rendered = parent.text; searched = nil; selection = -2
            // Pass Markdown as data, never interpolate model content into JavaScript or HTML.
            let text = parent.text
            // A WKWebView initially hidden behind the native fallback may defer ResizeObserver.
            // Measure the first render explicitly; later image/layout changes still use the bridge.
            web.callAsyncJavaScript("window.updateMarkdown(text); return document.body.getBoundingClientRect().height", arguments: ["text": text], in: nil, in: .page) { [weak self] result in
                guard let self, self.rendered == text else { return }
                if case .success(let value) = result, let height = value as? Double { self.resize(height) }
                if case .failure = result { self.rendered = nil }
                self.updateSearch(web)
            }
        }
        private func updateSearch(_ web: WKWebView) {
            guard let search = parent.search else { return }
            let query = search.query, selected = search.match(in: parent.searchKey)
            // A new render has no highlights to clear while Find is inactive.
            if query.isEmpty, searched == nil || searched == "" {
                searched = ""; selection = selected; return
            }
            if searched != query {
                searched = query; selection = selected
                web.callAsyncJavaScript("return window.findMarkdown(query,index)", arguments: ["query": query, "index": selected], in: nil, in: .page) { [weak self] result in
                    guard let self, self.searched == query, case .success(let value) = result, let data = value as? [String: Any] else { return }
                    search.count(data["count"] as? Int ?? 0, key: self.parent.searchKey, query: query)
                    if selected >= 0, let top = data["top"] as? Double { self.reveal(top, web: web) }
                }
            } else if selection != selected {
                selection = selected
                web.callAsyncJavaScript("return window.selectMarkdownMatch(index)", arguments: ["index": selected], in: nil, in: .page) { [weak self] result in
                    if selected >= 0, case .success(let value) = result, let top = value as? Double { self?.reveal(top, web: web) }
                }
            }
        }
        private func reveal(_ top: Double, web: WKWebView) {
            var ancestor = web.superview
            while let view = ancestor {
                if let scroll = view as? UIScrollView, scroll.isScrollEnabled {
                    let point = web.convert(CGPoint(x: 0, y: top), to: scroll)
                    scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: max(-scroll.adjustedContentInset.top, min(point.y - scroll.bounds.height / 3, scroll.contentSize.height - scroll.bounds.height + scroll.adjustedContentInset.bottom))), animated: false)
                    break
                }
                ancestor = view.superview
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
                    if ["localhost", "127.0.0.1", "::1"].contains(url.host ?? ""), ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                        if let onDocumentLink = parent.onDocumentLink { onDocumentLink(value) } else { parent.store.error = "This preview runs on \(parent.store.displayName). Open it from its chat's shared preview tab." }
                        return
                    }
                    if ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                        let scope = parent.browserContainer ?? (parent.runID.isEmpty ? "main" : "chat:\(parent.store.connection?.hostId ?? "local"):\(parent.runID)")
                        parent.shared.open(url, title: url.host ?? "Link", scope: scope)
                        Task { await parent.shared.record(url, title: url.host ?? "Link", life: parent.life) }
                    } else if url.scheme?.lowercased() == "mailto" { UIApplication.shared.open(url) }
                    else if ["md", "html", "htm"].contains(url.pathExtension.lowercased()) || ["md", "html", "htm"].contains((value as NSString).pathExtension.lowercased()) { if let onDocumentLink = parent.onDocumentLink { onDocumentLink(value) } else { UIPasteboard.general.string = value; parent.store.error = "This file path was copied. Open it on \(parent.store.displayName)." } }
                    else { UIPasteboard.general.string = value.removingPercentEncoding ?? value; parent.store.error = "File path copied. Open it on \(parent.store.displayName): \(value.removingPercentEncoding ?? value)" }
                }
            case "image":
                guard let source = body["source"] as? String, let id = body["id"] as? String else { return }
                if let approved = parent.documentAssetURLs {
                    web.callAsyncJavaScript("window.imageResult(id, dataURL)", arguments: ["id": id, "dataURL": approved[source] ?? ""], in: nil, in: .page) { _ in }
                    return
                }
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

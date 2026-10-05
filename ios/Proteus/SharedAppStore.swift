import Foundation
import SwiftUI
import WebKit
import CryptoKit
import Security

/// Account-scoped app data uses its own explicit OAuth consent, never a Mac's credentials.
@MainActor final class SharedAppStore: ObservableObject {
    @Published var snapshot: JSON = .null
    @Published var error: String?
    @Published var busy = false
    @Published var browserTabs: [BrowserDescriptor] = [] { didSet { saveBrowsers() } }
    @Published var selectedBrowser: String?
    @Published var unloadedBrowsers = Set<String>()
    @Published private(set) var browserNavigation: [String: BrowserNavigationState] = [:]
    @Published var linkChatDraft: BrowserChatDraft?
    @Published var exportFile: BrowserExportFile?
    @Published var downloadError: String?
    @Published var downloads: [UUID: NativeLinkDownload] = [:]
    private var account = ""
    private var restoring = false
    private var browserViews: [String: WKWebView] = [:]
    private var browserObservations: [String: [NSKeyValueObservation]] = [:]
    var lists: [JSON] { snapshot["teamLists"].array }
    func reset(for identity: String) {
        guard account != identity else { return }
        saveBrowsers(); for download in Array(downloads.values) { download.cancel() }; exportFile?.cleanup(); exportFile = nil; linkChatDraft = nil; restoring = true; account = identity; snapshot = .null; error = nil; unloadBrowsers(); browserTabs = []; unloadedBrowsers = []; selectedBrowser = nil
        if let cacheURL, let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: cacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: account), let decoded = try? JSONDecoder().decode([BrowserDescriptor].self, from: JSONEncoder().encode(payload)) { browserTabs = decoded.compactMap(Self.retainedDescriptor); selectedBrowser = browserTabs.last?.id }
        restoring = false
    }
    private var cacheURL: URL? {
        guard !account.isEmpty, account != "signed-out" else { return nil }
        let name = SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
        return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/browsers/" + name + ".enc")
    }
    private func saveBrowsers() {
        guard !restoring, let cacheURL, let key = BrowserCacheKeychain.key() else { return }
        let safe = browserTabs.suffix(30).compactMap(Self.retainedDescriptor)
        do {
            let payload = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(safe))
            let encrypted = try RemoteCrypto.seal(payload, key: key, aad: account)
            try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(encrypted.utf8).write(to: cacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var file = cacheURL; var values = URLResourceValues(); values.isExcludedFromBackup = true; try file.setResourceValues(values)
        } catch { /* A descriptor cache failure never changes account data. */ }
    }
    func refresh(_ life: LifeStore) async {
        reset(for: life.accountIdentity); let expected = life.accountIdentity
        guard life.credential?.appAuthorized == true else { return }
        busy = true; defer { busy = false }
        do { let value = try await life.appRequest(); guard expected == life.accountIdentity else { return }; snapshot = value; error = nil }
        catch { self.error = life.display(error) }
    }
    @discardableResult func mutate(_ life: LifeStore, path: String, method: String = "POST", body: JSON) async -> JSON? {
        let expected = life.accountIdentity
        do { let result = try await life.appRequest(path, method: method, body: body); guard expected == life.accountIdentity else { return nil }; await refresh(life); return result }
        catch { self.error = life.display(error); return nil }
    }
    /// Explicit bookmarks and restore descriptors must reopen the same page, including safe filters.
    static func safeURL(_ text: String) -> URL? {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard input.utf8.count <= 8192, !input.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) || CharacterSet.controlCharacters.contains($0) }),
              let url = URLComponents(string: input), ["http", "https"].contains(url.scheme?.lowercased() ?? ""), let host = url.host, !host.isEmpty, url.user == nil, url.password == nil else { return nil }
        let path = decodedForInspection(url.path).lowercased()
        guard !["oauth", "callback", "authorize", "login", "signin", "sign-in", "logout", "reset-password"].contains(where: { path.contains($0) }) else { return nil }
        guard !(url.queryItems ?? []).contains(where: { sensitiveKey($0.name) || sensitivePayload($0.value ?? "") }) else { return nil }
        let fragment = decodedForInspection(url.percentEncodedFragment ?? "")
        let fields = fragment.components(separatedBy: CharacterSet(charactersIn: "?&;/"))
        guard !sensitivePayload(fragment), !fields.contains(where: { field in
            let key = String(field.prefix { $0 != "=" && $0 != ":" })
            let value = field.firstIndex(of: "=").map { String(field[field.index(after: $0)...]) } ?? ""
            let parameter = field.contains("=") || field.contains(":")
            let marker = ["pair", "pairing", "token", "code", "auth", "session"].contains(key.lowercased())
            return (parameter ? sensitiveKey(key) : marker) || sensitivePayload(value)
        }) else { return nil }
        return url.url
    }
    /// Automatic history omits page parameters, but refuses sensitive URLs before redaction.
    static func historyURL(_ text: String) -> URL? {
        guard let safe = safeURL(text), var clean = URLComponents(url: safe, resolvingAgainstBaseURL: false) else { return nil }
        clean.query = nil; clean.fragment = nil
        return clean.url
    }
    private static func retainedDescriptor(_ tab: BrowserDescriptor) -> BrowserDescriptor? {
        guard let text = tab.url else { return tab }
        guard let url = safeURL(text) else { return nil }
        return BrowserDescriptor(id: tab.id, title: tab.title, url: url.absoluteString)
    }
    private static func decodedForInspection(_ text: String) -> String {
        var result = text
        for _ in 0..<3 { guard let next = result.removingPercentEncoding, next != result else { break }; result = next }
        return result
    }
    private static func sensitiveKey(_ text: String) -> Bool {
        let name = decodedForInspection(text).lowercased()
        return ["pair", "pairing", "token", "code", "secret", "password", "passwd", "auth", "key", "session", "state", "signature", "credential"].contains { name.contains($0) }
    }
    private static func sensitivePayload(_ text: String) -> Bool {
        let decoded = decodedForInspection(text)
        if decoded.lowercased().contains("proteus:") { return true }
        // A capsule may be carried in an innocuously named data parameter or an entire fragment.
        var candidates = [Data(decoded.utf8)]
        var encoded = decoded.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while encoded.count % 4 != 0 { encoded += "=" }
        if let data = Data(base64Encoded: encoded) { candidates.append(data) }
        return candidates.contains { data in
            guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
            let keys = Set(object.keys.map { $0.lowercased() })
            return keys.isSuperset(of: ["hostid", "key", "relay"]) || keys.isSuperset(of: ["hostid", "deviceid", "key"])
        }
    }
    static func historyDeviceID(defaults: UserDefaults = .standard) -> String {
        let key = "browserHistoryDeviceId"
        if let value = defaults.string(forKey: key), UUID(uuidString: value) != nil { return value }
        let value = UUID().uuidString.lowercased(); defaults.set(value, forKey: key); return value
    }
    static func historyDeviceName(_ value: String, fallback: String = "Unknown device") -> String {
        let clean = String(value.unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) }.map(String.init).joined().trimmingCharacters(in: .whitespacesAndNewlines).prefix(100))
        return clean.isEmpty ? String(fallback.prefix(100)) : clean
    }
    static func historyVisit(_ url: URL, title: String, at: Date, deviceID: String, deviceName: String) -> JSON? {
        guard let clean = historyURL(url.absoluteString), UUID(uuidString: deviceID) != nil else { return nil }
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return .object(["url": .string(clean.absoluteString), "title": .string(String(title.prefix(160))), "source": .string("mobile"), "visitedAt": .string(formatter.string(from: at)), "deviceId": .string(deviceID), "deviceName": .string(historyDeviceName(deviceName))])
    }
    func record(_ url: URL, title: String, life: LifeStore) async {
        guard Self.historyURL(url.absoluteString) != nil, life.credential?.appAuthorized == true else { return }
        let deviceName = Self.historyDeviceName(UIDevice.current.name, fallback: UIDevice.current.model)
        guard let visit = Self.historyVisit(url, title: title, at: Date(), deviceID: Self.historyDeviceID(), deviceName: deviceName) else { return }
        _ = await mutate(life, path: "/history", body: visit)
    }
    @discardableResult func prepareLinkDraft(_ url: URL, remote: RemoteStore, hostID: String, hostName: String) -> Bool {
        guard remote.connection?.hostId == hostID, let safe = Self.safeURL(url.absoluteString) else { return false }
        var value = remote.draft("new-chat").object
        if value.isEmpty {
            let defaults = remote.state["defaults"]
            value = ["provider": defaults["provider"].string.isEmpty ? .string("copilot") : defaults["provider"], "model": defaults["model"], "effort": defaults["reasoningEffort"], "contextTier": .string("default"), "serviceTier": defaults["serviceTier"], "workspace": remote.state["context"]["defaultWorkspaceId"], "includeDefaults": .bool(true)]
        }
        let existing = value["prompt"]?.string ?? ""
        value["prompt"] = .string(existing + (existing.isEmpty ? "" : "\n\n") + safe.absoluteString)
        remote.setDraft("new-chat", .object(value))
        linkChatDraft = BrowserChatDraft(id: UUID(), hostID: hostID, hostName: hostName)
        return true
    }
    func download(_ url: URL, in webView: WKWebView) {
        guard ["https", "http"].contains(url.scheme), url.user == nil, url.password == nil else { return }
        guard downloads.isEmpty, exportFile == nil else { downloadError = "Finish the current download or file export first."; return }
        let transfer = NativeLinkDownload(shared: self)
        downloads[transfer.id] = transfer
        webView.startDownload(using: URLRequest(url: url)) { download in transfer.attach(download) }
    }
    func open(_ url: URL?, title: String = "New tab") {
        let tab = BrowserDescriptor(id: UUID().uuidString, title: title, url: url?.absoluteString)
        browserTabs.append(tab); selectedBrowser = tab.id
    }
    @discardableResult func navigate(_ url: URL, in id: String) -> Bool {
        guard ["http", "https"].contains(url.scheme), url.host != nil, url.user == nil, url.password == nil,
              let index = browserTabs.firstIndex(where: { $0.id == id }) else { return false }
        browserTabs[index].url = url.absoluteString
        browserTabs[index].title = url.host ?? "Browser"
        unloadedBrowsers.remove(id)
        browserViews[id]?.load(URLRequest(url: url))
        return true
    }
    func goBack(_ id: String) { if let view = browserViews[id], view.canGoBack { view.goBack() } }
    func goForward(_ id: String) { if let view = browserViews[id], view.canGoForward { view.goForward() } }
    func refreshBrowser(_ id: String) { if let view = browserViews[id] { view.reload() } else { reload(id) } }
    func stopBrowser(_ id: String) { browserViews[id]?.stopLoading() }
    func close(_ id: String) { unload(id); unloadedBrowsers.remove(id); browserTabs.removeAll { $0.id == id }; if selectedBrowser == id { selectedBrowser = browserTabs.last?.id } }
    func unload(_ id: String) {
        browserObservations.removeValue(forKey: id)?.forEach { $0.invalidate() }
        browserNavigation.removeValue(forKey: id)
        if let view = browserViews.removeValue(forKey: id) { view.navigationDelegate = nil; view.uiDelegate = nil; view.stopLoading() }
        unloadedBrowsers.insert(id)
    }
    func reload(_ id: String) { unloadedBrowsers.remove(id) }
    func unloadBrowsers() { for id in Array(browserViews.keys) { unload(id) } }
    func isBrowserLoaded(_ id: String) -> Bool { browserViews[id] != nil }
    func webView(_ tab: BrowserDescriptor) -> WKWebView {
        if let view = browserViews[tab.id] { return view }
        let configuration = WKWebViewConfiguration(); configuration.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: configuration); view.allowsBackForwardNavigationGestures = true
        browserViews[tab.id] = view
        browserObservations[tab.id] = [observeBrowser(view, id: tab.id, keyPath: \.canGoBack), observeBrowser(view, id: tab.id, keyPath: \.canGoForward), observeBrowser(view, id: tab.id, keyPath: \.isLoading), observeBrowser(view, id: tab.id, keyPath: \.url), observeBrowser(view, id: tab.id, keyPath: \.title)]
        if let text = tab.url, let url = URL(string: text) { view.load(URLRequest(url: url)) }
        return view
    }
    private func observeBrowser<Value>(_ view: WKWebView, id: String, keyPath: KeyPath<WKWebView, Value>) -> NSKeyValueObservation {
        view.observe(keyPath, options: [.new]) { [weak self, weak view] _, _ in
            Task { @MainActor [weak self, weak view] in
                guard let self, let view, self.browserViews[id] === view,
                      let index = self.browserTabs.firstIndex(where: { $0.id == id }) else { return }
                let state = BrowserNavigationState(url: view.url?.absoluteString ?? "", title: view.title ?? "", canGoBack: view.canGoBack, canGoForward: view.canGoForward, isLoading: view.isLoading)
                if self.browserNavigation[id] != state { self.browserNavigation[id] = state }
                var tab = self.browserTabs[index]
                if !state.url.isEmpty && state.url != "about:blank" { tab.url = state.url }
                if !state.title.isEmpty { tab.title = state.title }
                if tab.url != self.browserTabs[index].url || tab.title != self.browserTabs[index].title { self.browserTabs[index] = tab }
            }
        }
    }
}
struct BrowserNavigationState: Equatable {
    var url = ""
    var title = ""
    var canGoBack = false
    var canGoForward = false
    var isLoading = false
}
struct BrowserDescriptor: Identifiable, Codable { var id: String; var title: String; var url: String? }

private enum BrowserCacheKeychain {
    static func key() -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "org.proteusapp.proteus.mobile.browser", kSecAttrAccount as String: "cache-key"]
        var read = query; read[kSecReturnData as String] = true; read[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(read as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data { return String(data: data, encoding: .utf8) }
        guard status == errSecItemNotFound else { return nil }
        let key = RemoteCrypto.random(); var save = query; save[kSecValueData as String] = Data(key.utf8); save[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        return SecItemAdd(save as CFDictionary, nil) == errSecSuccess ? key : nil
    }
}

struct BrowserChatDraft: Identifiable { let id: UUID; let hostID: String; let hostName: String }
struct BrowserExportFile: Identifiable {
    let id: UUID
    let url: URL
    func cleanup() { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
}

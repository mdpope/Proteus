import Foundation
import SwiftUI
import UIKit
import WebKit
import CryptoKit
import JavaScriptCore
import Security
import ImageIO
#if DEBUG
let nativeFixtureHTTPOrigin = ProcessInfo.processInfo.environment["PROTEUS_TEST_HTTP_ORIGIN"] ?? ProcessInfo.processInfo.environment["TEST_RUNNER_PROTEUS_TEST_HTTP_ORIGIN"] ?? "http://127.0.0.1:4329"
let nativeFixtureRelayOrigin = ProcessInfo.processInfo.environment["PROTEUS_TEST_RELAY_ORIGIN"] ?? ProcessInfo.processInfo.environment["TEST_RUNNER_PROTEUS_TEST_RELAY_ORIGIN"] ?? "ws://127.0.0.1:4328"
#else
let nativeFixtureHTTPOrigin = ""
let nativeFixtureRelayOrigin = ""
#endif
struct NativeChatScrollLocation {
    var anchor: Int?
    var inset: CGFloat
    var offset: CGFloat
    var eventStart: Int? = nil
    var contentHeight: CGFloat = 0
    var anchorHeight: CGFloat = 0
    var viewportWidth: CGFloat = 0
    var eventRevision: String = ""
}
struct MainBrowserSelectionRequest: Equatable {
    let token = UUID()
    let tabID: String
}

/// Account-scoped app data uses its own explicit OAuth consent, never a host's credentials.
@MainActor final class SharedAppStore: ObservableObject {
    @Published var snapshot: JSON = .null
    @Published var error: String?
    @Published var busy = false
    @Published var profilesEnabled = false { didSet { if !restoring { UserDefaults.standard.set(profilesEnabled, forKey: profilePreferenceKey); for tab in browserTabs where !profileAvailable(tab.profileId) { unload(tab.id) } } } }
    @Published private(set) var accountConnected = false
    @Published private(set) var profilesVerified = false
    private var profilePreferenceKey: String { "proteus.browser-profiles." + SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined() }
    var browserProfiles: [JSON] { [.object(["id": .string("default"), "name": .string("Default")])] + (profilesEnabled && profilesVerified ? snapshot["browserProfiles"].array.filter { UUID(uuidString: $0["id"].string) != nil } : []) }
    func profileAvailable(_ id: String) -> Bool { browserProfiles.contains { $0["id"].string == id } }
    func profileName(_ id: String) -> String { browserProfiles.first { $0["id"].string == id }?["name"].string ?? "Unavailable profile" }
    static func persistentProfileStoreID(account: String, id: String) -> UUID { let bytes = Array(SHA256.hash(data: Data((account + "\0" + id).utf8)).prefix(16)); return UUID(uuid: (bytes[0],bytes[1],bytes[2],bytes[3],bytes[4],bytes[5],bytes[6],bytes[7],bytes[8],bytes[9],bytes[10],bytes[11],bytes[12],bytes[13],bytes[14],bytes[15])) }

    @Published var browserTabs: [BrowserDescriptor] = [] { didSet { saveBrowsers(); contentTabsChanged() } }
    @Published private(set) var currentTeamOwner: String?
    @Published var selectedBrowser: String?
    @Published var selectedMainBrowser: String?
    @Published private(set) var mainBrowserSelectionRequest: MainBrowserSelectionRequest?
    @Published var scopedSelection: [String: String] = [:]
    @Published private(set) var workspaceContentDescriptors: [String: [JSON]] = [:]
    @Published private(set) var documentTabs: [NativeDocumentDescriptor] = []
    @Published private(set) var chatSelectedChildren: [String: String] = [:]
    @Published private(set) var chatChildOrder: [String: [String]] = [:]
    @Published var draftAttachments: [String: [NativeDraftAttachment]] = [:]
    var chatScrollLocations: [String: NativeChatScrollLocation] = [:]
    var documentScrollOffsets: [String: CGFloat] = [:]
    private var documentPositionKey: String { "proteus.document-positions." + SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined() }
    private var pendingDocumentPositions: [String: [String: Double]] = [:]
    private var documentPositionTask: Task<Void, Never>?
    private func documentPositionID(_ key: String) -> String { SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined() }
    func documentScrollOffset(for key: String) -> CGFloat? {
        if let cached = documentScrollOffsets[key] { return cached }
        let entries = UserDefaults.standard.dictionary(forKey: documentPositionKey)?["entries"] as? [String: [String: Double]]
        guard let value = entries?[documentPositionID(key)]?["offset"], value.isFinite, value >= 0, value <= 50_000_000 else { return nil }
        return CGFloat(value)
    }
    func rememberDocumentScrollOffset(_ offset: CGFloat, for key: String) {
        guard offset.isFinite, offset >= 0, offset <= 50_000_000 else { return }
        documentScrollOffsets[key] = offset
        if documentScrollOffsets.count > 200 { for old in documentScrollOffsets.keys.sorted().filter({ $0 != key }).prefix(documentScrollOffsets.count - 200) { documentScrollOffsets.removeValue(forKey: old) } }
        pendingDocumentPositions[documentPositionID(key)] = ["offset": Double(offset), "at": Date().timeIntervalSince1970]
        documentPositionTask?.cancel()
        documentPositionTask = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(250)) } catch { return }
            self?.flushDocumentScrollPositions()
        }
    }
    func flushDocumentScrollPositions() {
        documentPositionTask?.cancel(); documentPositionTask = nil
        guard !pendingDocumentPositions.isEmpty else { return }
        var saved = UserDefaults.standard.dictionary(forKey: documentPositionKey) ?? ["schemaVersion": 1]
        var entries = saved["entries"] as? [String: [String: Double]] ?? [:]
        entries.merge(pendingDocumentPositions) { _, current in current }; pendingDocumentPositions = [:]
        if entries.count > 200 { for old in entries.sorted(by: { ($0.value["at"] ?? 0) < ($1.value["at"] ?? 0) }).prefix(entries.count - 200) { entries.removeValue(forKey: old.key) } }
        saved["entries"] = entries; UserDefaults.standard.set(saved, forKey: documentPositionKey)
    }
    var draftMessageIDs: [String: String] = [:]
    var draftSessionIDs: [String: String] = [:]
    private var documentContents: [String: String] = [:]
    private var previewVersions: [String: String] = [:]
    private var documentSessions: [String: NativeDocumentSession] = [:]
    @Published var selectedTeamListID = ""
    @Published var standupOrders: [String: [JSON]] = [:]
    @Published var standupCompleted: [String: Set<String>] = [:]
    @Published var unloadedBrowsers = Set<String>()
    @Published private(set) var browserNavigation: [String: BrowserNavigationState] = [:]
    @Published var linkChatDraft: BrowserChatDraft?
    @Published var exportFile: BrowserExportFile?
    @Published var blockVideoAutoplay = UserDefaults.standard.bool(forKey: "proteus.block-video-autoplay")
    @Published private(set) var pageScales = UserDefaults.standard.dictionary(forKey: "proteus.page-scales.v1") as? [String: Int] ?? [:]
    private static let domainContext: JSContext? = {
        guard let url = Bundle.main.url(forResource: "domain-runtime", withExtension: "js", subdirectory: "markdown"), let script = try? String(contentsOf: url, encoding: .utf8), let context = JSContext() else { return nil }
        context.evaluateScript(script); return context
    }()
    static func pageScaleDomain(_ url: URL) -> String? {
        guard ["http", "https"].contains(url.scheme), let host = url.host?.lowercased(), url.user == nil, url.password == nil else { return nil }
        let result = domainContext?.objectForKeyedSubscript("tldts")?.invokeMethod("getDomain", withArguments: [host, ["allowPrivateDomains": true]])
        return result?.isString == true ? result?.toString() : host
    }
    private func pageScaleKey(_ tab: BrowserDescriptor, url: URL) -> String? { Self.pageScaleDomain(url).map { account + "|" + tab.profileId + "|" + $0 } }
    func pageScale(_ tab: BrowserDescriptor) -> Int { guard let url = tab.url.flatMap(URL.init(string:)), let key = pageScaleKey(tab, url: url) else { return 100 }; return pageScales[key] ?? 100 }
    func applyPageScale(_ id: String, url: URL) { guard let tab = browserTabs.first(where: { $0.id == id }), let key = pageScaleKey(tab, url: url) else { return }; browserViews[id]?.pageZoom = CGFloat(pageScales[key] ?? 100) / 100 }
    func adjustPageScale(_ id: String, delta: Int) {
        guard let tab = browserTabs.first(where: { $0.id == id }), let url = tab.url.flatMap(URL.init(string:)), let key = pageScaleKey(tab, url: url) else { return }
        pageScales[key] = delta == 0 ? 100 : min(500, max(25, pageScale(tab) + delta)); UserDefaults.standard.set(pageScales, forKey: "proteus.page-scales.v1")
        for row in browserTabs where row.url.flatMap(URL.init(string:)).flatMap({ pageScaleKey(row, url: $0) }) == key { if let url = row.url.flatMap(URL.init(string:)) { applyPageScale(row.id, url: url) } }
    }
    private func videoScript() -> String { """
        (()=>{const key=Symbol.for('proteus.video-autoplay'),enabled=\(blockVideoAutoplay ? "true" : "false");if(window[key]){window[key].enabled=enabled;return;}const policy={enabled,activated:false};Object.defineProperty(window,key,{value:policy});for(const type of ['pointerdown','touchend','keydown'])document.addEventListener(type,event=>{if(event.isTrusted)policy.activated=true;},true);const allowed=media=>!policy.enabled||media.tagName!=='VIDEO'||policy.activated||navigator.userActivation?.hasBeenActive;const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){return allowed(this)?original.apply(this,args):Promise.reject(new DOMException('Press Play to start the video.','NotAllowedError'));};document.addEventListener('play',event=>{if(event.target instanceof HTMLMediaElement&&!allowed(event.target))event.target.pause();},true);})();
        """ }
    private func installVideoPolicy(_ view: WKWebView) { view.configuration.userContentController.addUserScript(WKUserScript(source: videoScript(), injectionTime: .atDocumentStart, forMainFrameOnly: false)) }
    func setBlockVideoAutoplay(_ value: Bool) {
        blockVideoAutoplay = value; UserDefaults.standard.set(value, forKey: "proteus.block-video-autoplay")
        for view in browserViews.values { let controller = view.configuration.userContentController; let scripts = controller.userScripts.filter { !$0.source.contains("Symbol.for('proteus.video-autoplay')") }; controller.removeAllUserScripts(); for script in scripts { controller.addUserScript(script) }; installVideoPolicy(view); if let native = view as? NativeLinkWebView { native.updateVideoPolicy(videoScript()) } else { view.evaluateJavaScript(videoScript(), completionHandler: nil) } }
    }
    @Published var downloadError: String?
    @Published var downloads: [UUID: NativeLinkDownload] = [:]
    @Published var downloadHistory: [NativeDownloadRecord] = []
    @Published var downloadFolderName: String = UserDefaults.standard.string(forKey: "proteus.download-folder-name") ?? "Downloads in Proteus"

    func downloadChanged(_ row: NativeDownloadRecord) { if let index = downloadHistory.firstIndex(where: { $0.id == row.id }) { downloadHistory[index] = row } else { downloadHistory.insert(row, at: 0) } }
    func downloadDirectory() throws -> URL {
        if let bookmark = UserDefaults.standard.data(forKey: "proteus.download-folder") { var stale = false; let url = try URL(resolvingBookmarkData: bookmark, options: [], bookmarkDataIsStale: &stale); if stale { throw NSError(domain: "Proteus", code: 1, userInfo: [NSLocalizedDescriptionKey: "Choose the download folder again in Browser settings."]) }; return url }
        return FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Downloads", isDirectory: true)
    }
    func chooseDownloadDirectory(_ url: URL?) {
        do { if let url { let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }; let data = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil); UserDefaults.standard.set(data, forKey: "proteus.download-folder"); downloadFolderName = url.lastPathComponent } else { UserDefaults.standard.removeObject(forKey: "proteus.download-folder"); downloadFolderName = "Downloads in Proteus" }; UserDefaults.standard.set(downloadFolderName, forKey: "proteus.download-folder-name") } catch { downloadError = error.localizedDescription }
    }
    func receiveDownload(_ download: WKDownload) { guard downloads.count < 32 else { download.cancel(); downloadError = "Finish or cancel a download before starting more."; return }; let transfer = NativeLinkDownload(shared: self, saveAs: false); downloads[transfer.id] = transfer; transfer.attach(download) }
    private var contentSync: [String: (remote: RemoteStore, kind: String, id: String, host: String)] = [:]
    private var contentHosts: [String: String] = [:]
    private var contentSnapshots: [String: JSON] = [:]
    private(set) var contentPending: [String: [JSON]] = [:]
    private var contentRequests: [String: JSON] = [:]
    private var contentBackoff: [String: (until: Date, attempts: Int, notified: Date)] = [:]
    @Published private(set) var browserConflicts: [NativeBrowserNavigationConflict] = []
    private var contentBusy = Set<String>()
    private var applyingContent = false
    private var account = ""
    private var restoring = false
    private var browserViews: [String: WKWebView] = [:]
    private var profileStores: [String: WKWebsiteDataStore] = [:]
    private var browserObservations: [String: [NSKeyValueObservation]] = [:]
    private var browserTouched: [String: Date] = [:]
    private var historyNavigation: [String: Int] = [:]
    private var pendingBrowserLoads: [String: String] = [:]
    private var nativeHistoryPosition: [String: Int] = [:]
    private var twoFingerDeadlines: [String: Date] = [:]
    func markTwoFingerNavigation(_ id: String) { twoFingerDeadlines[id] = Date().addingTimeInterval(0.3) }
    func isTwoFingerNavigation(_ id: String) -> Bool { (twoFingerDeadlines[id] ?? .distantPast) > Date() }
    private var explicitBrowserNavigations = Set<String>()
    private var mirroredBrowserLoads = Set<String>()
    private var browserOperations: [String: JSON] = [:]
    @Published private(set) var browserFavicons: [String: UIImage] = [:]
    private var faviconAttempts: [String: Date] = [:]
    @Published private(set) var browserPreviews: [String: UIImage] = [:]
    @Published private(set) var historyCache: [String: [JSON]] = [:]
    @Published private(set) var historyStatus: [String: String] = [:]
    @Published private(set) var historyOutbox: [JSON] = []
    private var historyFlushing = Set<String>()
    private var historyRefreshing = Set<String>()
    private var historyRefreshed: [String: Date] = [:]
    private var insertionOrigins: [String: String] = [:]
    init() { UserDefaults.standard.removeObject(forKey: "proteus.download-history"); loadDocumentTabs(); loadHistoryCache() }
    static func isOrganizationalScope(_ scope: String) -> Bool { scope.hasPrefix("workspace:") || scope.hasPrefix("project:") }
    func localContentTabs(_ scope: String) -> [JSON] {
        let browsers = tabs(in: scope).compactMap { tab -> JSON? in
            guard tab.url == nil || Self.historyURL(tab.url ?? "") != nil else { return nil }
            let sharedTitle = tab.history.flatMap { $0.entries.indices.contains($0.index) ? $0.entries[$0.index].title : nil }
            var value: [String: JSON] = ["id": .string(tab.contentTabId ?? tab.id), "type": .string("browser"), "title": .string(tab.customTitle ?? sharedTitle ?? tab.title), "url": .string(tab.url ?? "")]
            if tab.profileId != "default" { value["profileId"] = .string(tab.profileId) }
            let instant = ISO8601DateFormatter(); instant.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let prior = contentSnapshots[scope]?["tabs"].array.first { $0["id"].string == (tab.contentTabId ?? tab.id) }
            for (key, field) in prior?.object ?? [:] where value[key] == nil && !["profileId", "customTitle", "hidden", "persist", "openedAt", "lastTouchedAt", "history"].contains(key) { value[key] = field }
            if let activity = tab.lastActivityAt { value["lastActivityAt"] = .string(activity) }
            value["hidden"] = .bool(tab.hidden); value["persist"] = .bool(tab.persist)
            if !(contentSnapshots[scope]?["tabs"].array.contains(where: { $0["id"].string == (tab.contentTabId ?? tab.id) }) ?? false), explicitBrowserNavigations.contains(tab.id) || browserOperations[tab.id] != nil { value["url"] = .string("") }
            if tab.hidden { value["hidden"] = .bool(true) }; if tab.persist { value["persist"] = .bool(true) }; if let date = tab.openedAt.flatMap(ProviderAllowance.date) { value["openedAt"] = .string(instant.string(from: date)) }; if let date = tab.lastTouchedAt.flatMap(ProviderAllowance.date) { value["lastTouchedAt"] = .string(instant.string(from: date)) }
            if let customTitle = tab.customTitle { value["customTitle"] = .string(customTitle) }; if value["url"]?.string.isEmpty == false, let history = Self.safeBrowserHistory(tab.history), let data = try? JSONEncoder().encode(history), let json = try? JSONDecoder().decode(JSON.self, from: data) { value["history"] = json }; return .object(value)
        }
        let docs = documents(in: scope).filter { $0.previewSource == nil }.map { tab -> JSON in var value: [String: JSON] = ["id": .string("document:" + tab.id), "type": .string("document"), "documentId": .string(tab.id), "title": .string(tab.title), "mediaType": .string(tab.mediaType)]; if let customTitle = tab.customTitle { value["customTitle"] = .string(customTitle) }; if let prior = contentSnapshots[scope]?["tabs"].array.first(where: { $0["id"].string == "document:" + tab.id }) { for (key, field) in prior.object where value[key] == nil && key != "customTitle" { value[key] = field } }; return .object(value) }
        // Keep owner descriptors that this view cannot render. Omitting them would
        // synthesize Close operations and incomplete browser-only reorder payloads.
        let known = Self.isOrganizationalScope(scope) ? (workspaceContentDescriptors[scope] ?? []) : (contentSnapshots[scope]?["tabs"].array ?? [])
        let retained = known.filter { !["browser", "document"].contains($0["type"].string) }
        let all = browsers + docs + retained, order = chatChildOrder[scope] ?? []
        return order.compactMap { id in all.first { tab in tab["id"].string == id || tab["documentId"].string == id || tabs(in: scope).contains(where: { $0.id == id && ($0.contentTabId ?? $0.id) == tab["id"].string }) } } + all.filter { tab in !order.contains(tab["id"].string) && !order.contains(tab["documentId"].string) && !tabs(in: scope).contains(where: { browser in order.contains(browser.id) && (browser.contentTabId ?? browser.id) == tab["id"].string }) }
    }
    private func contentTabsChanged() {
        guard !applyingContent, !restoring else { return }
        for (scope, snapshot) in contentSnapshots {
            guard contentSync[scope] != nil else { continue }
            let prior = snapshot["tabs"].array, current = localContentTabs(scope)
            var operations: [JSON] = []
            for tab in prior where !current.contains(where: { $0["id"] == tab["id"] }) { operations.append(.object(["action": .string("close"), "id": tab["id"]])) }
            for tab in current where !prior.contains(tab) {
                var value = tab.object
                if let old = prior.first(where: { $0["id"] == tab["id"] }), tab["type"].string == "browser" {
                    value["url"] = old["url"]; value["history"] = old["history"]
                    if JSON.object(value) == old { continue }
                }
                operations.append(.object(["action": .string("open"), "tab": .object(value)]))
            }
            if current.map({ $0["id"] }) != prior.map({ $0["id"] }) { operations.append(.object(["action": .string("reorder"), "ids": .array(current.map { $0["id"] })])) }
            guard !operations.isEmpty else { continue }
            let pending = contentPending[scope] ?? []
            contentPending[scope] = pending + operations.filter { !pending.contains($0) }; saveDocumentTabs()
            Task { await flushContentTabs(scope) }
        }
    }
    func applyContentTabs(_ response: JSON, scope: String) {
        if contentSnapshots[scope] == response && localContentTabs(scope) == response["tabs"].array { return }
        guard response["revision"].int >= (contentSnapshots[scope]?["revision"].int ?? -1) else { return }
        applyingContent = true; defer { applyingContent = false }
        if Self.isOrganizationalScope(scope) { workspaceContentDescriptors[scope] = response["tabs"].array }
        var seen = Set<String>()
        let incoming = response["tabs"].array.filter { !$0["id"].string.isEmpty && seen.insert($0["id"].string).inserted }
        let ids = Set(incoming.filter { $0["type"].string == "browser" }.map { $0["id"].string })
        let existingBrowsers = tabs(in: scope)
        let privateLocal = existingBrowsers.filter { $0.url != nil && Self.safeURL($0.url ?? "") == nil }
        for old in existingBrowsers where !privateLocal.contains(old) && !ids.contains(old.contentTabId ?? old.id) { unload(old.id); unloadedBrowsers.remove(old.id) }
        for tab in incoming where tab["type"].string == "browser" {
            if let existing = existingBrowsers.first(where: { ($0.contentTabId ?? $0.id) == tab["id"].string }), !privateLocal.contains(existing), !explicitBrowserNavigations.contains(existing.id), browserViews[existing.id]?.url.map({ Self.safeURL($0.absoluteString) == nil }) != true, existing.url ?? "" != tab["url"].string, let url = Self.safeURL(tab["url"].string) { if profileAvailable(existing.profileId) && (tab["profileId"].string.isEmpty ? "default" : tab["profileId"].string) == existing.profileId, let view = browserViews[existing.id] { mirroredBrowserLoads.insert(existing.id); pendingBrowserLoads[existing.id] = url.absoluteString; view.load(URLRequest(url: url)) } }
        }
        let localIDs = Set(existingBrowsers.map(\.id))
        var nextBrowsers = browserTabs.filter { !localIDs.contains($0.id) || (privateLocal.contains($0) && !ids.contains($0.contentTabId ?? $0.id)) }
        for tab in incoming where tab["type"].string == "browser" {
            let existing = existingBrowsers.first { ($0.contentTabId ?? $0.id) == tab["id"].string }
            // Keep a live login flow local while retaining its full URLs in browsing history.
            // Retain that live view exactly once rather than appending a restored copy on refresh.
            if let existing, (privateLocal.contains(existing) || explicitBrowserNavigations.contains(existing.id)), existing.profileId == (tab["profileId"].string.isEmpty ? "default" : tab["profileId"].string) { nextBrowsers.append(existing); continue }
            let localID = existing?.id ?? ("sync:" + SHA256.hash(data: Data((scope + "\0" + tab["id"].string).utf8)).map { String(format: "%02x", $0) }.joined())
            // A shared descriptor can come from an unloaded desktop tab. Its automatic
            // title must not replace the title of the page already displayed here.
            // Explicit names still win; a changed URL follows the remote navigation.
            let currentView = existing.flatMap { browserViews[$0.id] }
            let profile = tab["profileId"].string.isEmpty ? "default" : tab["profileId"].string
            // Reads and mutation acknowledgements can echo an owner's empty New tab
            // placeholder after local navigation starts. It is not a navigation command:
            // keep the active URL even before SwiftUI creates its WKWebView. A real URL,
            // profile change, explicit unload or close still follows the normal lifecycle.
            let preservesLocalNavigation = tab["url"].string.isEmpty && existing?.url?.isEmpty == false
                && existing?.profileId == profile
            let address = preservesLocalNavigation ? existing?.url : (tab["url"].string.isEmpty ? nil : tab["url"].string)
            let pageTitle = currentView.flatMap { view -> String? in
                guard !view.isLoading, view.url?.absoluteString == address,
                      let title = view.title, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
                return String(title.prefix(200))
            }
            let customTitle = tab["customTitle"].string
            let title = !customTitle.isEmpty ? customTitle : pageTitle ?? (preservesLocalNavigation ? existing?.title ?? tab["title"].string : tab["title"].string)
            let history = preservesLocalNavigation ? existing?.history : Self.decodeBrowserHistory(tab["history"]) ?? existing?.history
            var descriptor = BrowserDescriptor(id: localID, title: title, url: address, scope: scope.hasPrefix("main:") ? "main" : scope.hasPrefix("team:") ? "team" : scope, customTitle: customTitle.isEmpty ? nil : customTitle, contentTabId: tab["id"].string, history: history, profileId: profile)
            descriptor.hidden = tab["hidden"].bool; descriptor.persist = tab["persist"].bool; descriptor.openedAt = existing?.openedAt ?? (tab["openedAt"].string.isEmpty ? nil : tab["openedAt"].string)
            descriptor.lastActivityAt = tab["lastActivityAt"].string.isEmpty ? existing?.lastActivityAt : tab["lastActivityAt"].string
            let incomingTouch = tab["lastTouchedAt"].string
            descriptor.lastTouchedAt = (existing?.lastTouchedAt.flatMap(ProviderAllowance.date) ?? .distantPast) > (ProviderAllowance.date(incomingTouch) ?? .distantPast) ? existing?.lastTouchedAt : (incomingTouch.isEmpty ? existing?.lastTouchedAt : incomingTouch)
            descriptor.ownerHostId = contentHosts[scope] ?? (scope.hasPrefix("main:") || scope.hasPrefix("team:") ? String(scope.dropFirst(5)) : nil) ?? existing?.ownerHostId ?? (Self.isOrganizationalScope(scope) ? scope.split(separator: ":", maxSplits: 2).dropFirst().first.map(String.init) : nil)
            if existing?.profileId != descriptor.profileId { unload(localID) }; nextBrowsers.append(descriptor)
            if descriptor.url != nil && !isBrowserLoaded(descriptor.id) && !preservesLocalNavigation { unloadedBrowsers.insert(descriptor.id) }
        }
        // Publish one coherent list so a selected child never temporarily disappears.
        browserTabs = nextBrowsers
        let docIDs = Set(incoming.filter { $0["type"].string == "document" }.map { $0["documentId"].string })
        for old in documents(in: scope) where old.previewSource == nil && !docIDs.contains(old.id) { documentContents.removeValue(forKey: scope + ":" + old.id); documentSessions.removeValue(forKey: scope + ":" + old.id) }
        documentTabs.removeAll { $0.chatKey == scope && $0.previewSource == nil }
        for tab in incoming where tab["type"].string == "document" { documentTabs.append(NativeDocumentDescriptor(id: tab["documentId"].string, chatKey: scope, title: tab["title"].string, mediaType: tab["mediaType"].string, customTitle: tab["customTitle"].string.isEmpty ? nil : tab["customTitle"].string)) }
        chatChildOrder[scope] = incoming.map { tab in tab["type"].string == "document" ? tab["documentId"].string : (tabs(in: scope).first { ($0.contentTabId ?? $0.id) == tab["id"].string }?.id ?? tab["id"].string) }
        contentSnapshots[scope] = response
        saveDocumentTabs(); saveBrowsers()
    }
    #if DEBUG
    func replayBrowserConflictFixture() {
        let host = "10000000-0000-4000-8000-000000000001", scope = "team:" + host
        currentTeamOwner = host
        browserConflicts.removeAll { $0.scope == scope }
        var local = BrowserDescriptor(id: "conflict-local", title: "Local branch", url: "https://example.test/local", scope: "team", contentTabId: "conflict-owner", history: BrowserTabHistory(entries: [BrowserHistoryEntry(id: "local-entry", url: "https://example.test/local", title: "Local branch")], index: 0, revision: 2))
        local.ownerHostId = host
        applyingContent = true; browserTabs = [local]; applyingContent = false
        let operation: JSON = .object(["action": .string("browser-navigate"), "tabId": .string("conflict-owner"), "operationId": .string("conflict-operation")])
        let fresh: JSON = .object(["revision": .number(4), "tabs": .array([.object(["id": .string("conflict-owner"), "type": .string("browser"), "title": .string("Owner page"), "url": .string("https://example.test/owner")])])])
        preserveBrowserNavigationConflict(scope: scope, operations: [operation], pending: [operation], fresh: fresh)
    }
    func replayDesktopBrowserFixture(scope: String) {
        let existing = tabs(in: scope)
        let tabs: [JSON] = ["one", "three"].enumerated().map { index, page in
            let id = "desktop-fixture-\(index)"
            let local = existing.first { $0.contentTabId == id }
            // Reproduce the owner's blank placeholder echo only after the local page loads.
            let address = local.map { isBrowserLoaded($0.id) } == true ? "" : local?.url ?? "\(nativeFixtureHTTPOrigin)/browser/\(page)"
            return .object(["id": .string(id), "type": .string("browser"), "title": .string("New tab"), "url": .string(address)])
        }
        applyContentTabs(.object(["revision": .number(Double((contentSnapshots[scope]?["revision"].int ?? 0) + 1)), "tabs": .array(tabs)]), scope: scope)
    }
    #endif
    private func revokeDocumentTabs(_ host: String) {
        let affected = Set(contentSnapshots.keys.filter { $0.hasPrefix("project:" + host + ":") || $0.hasPrefix("workspace:" + host + ":") || $0.hasPrefix("chat:" + host + ":") } + contentHosts.filter { $0.value == host }.map(\.key) + documentTabs.filter { $0.chatKey.hasPrefix("chat:" + host + ":") || $0.chatKey.hasPrefix("workspace:" + host + ":") || $0.chatKey.hasPrefix("project:" + host + ":") }.map(\.chatKey))
        applyingContent = true; defer { applyingContent = false }
        for scope in affected {
            contentRequests[scope] = nil
            for doc in documents(in: scope) { documentContents.removeValue(forKey: scope + ":" + doc.id); documentSessions.removeValue(forKey: scope + ":" + doc.id) }
            documentTabs.removeAll { $0.chatKey == scope }
            if var snapshot = contentSnapshots[scope]?.object { snapshot["tabs"] = .array((snapshot["tabs"]?.array ?? []).filter { $0["type"].string != "document" }); contentSnapshots[scope] = .object(snapshot) }
            if let pending = contentPending[scope] { contentPending[scope] = browserOnlyOperations(pending); if contentPending[scope]?.isEmpty == true { contentPending[scope] = nil } }
        }
        saveDocumentTabs()
    }
    private func browserOnlyOperations(_ operations: [JSON]) -> [JSON] {
        operations.compactMap { operation in
            if operation["tab"]["type"].string == "document" || operation["id"].string.hasPrefix("document:") { return nil }
            if operation["action"].string == "reorder" { return .object(["action": .string("reorder"), "ids": .array(operation["ids"].array.filter { !$0.string.hasPrefix("document:") })]) }
            return operation
        }
    }
    func revokeContentHost(_ host: String) {
        contentBackoff[host] = nil
        browserConflicts.removeAll { $0.tab.ownerHostId == host || $0.scope.hasPrefix("chat:" + host + ":") || $0.scope.hasPrefix("workspace:" + host + ":") || $0.scope.hasPrefix("project:" + host + ":") };
        for tab in browserTabs where tab.ownerHostId == host { unload(tab.id) }; browserTabs.removeAll { $0.ownerHostId == host }
        historyOutbox.removeAll { $0["ownerHostId"].string == host }; historyCache = historyCache.filter { !$0.key.hasPrefix(host + "|") }; historyStatus[host] = nil; saveHistoryCache()
        let affected = Set(contentSnapshots.keys.filter { $0.hasPrefix("project:" + host + ":") || $0.hasPrefix("workspace:" + host + ":") || $0.hasPrefix("chat:" + host + ":") } + contentHosts.filter { $0.value == host }.map(\.key) + browserTabs.filter { ($0.scope.hasPrefix("chat:" + host + ":") || $0.scope.hasPrefix("workspace:" + host + ":") || $0.scope.hasPrefix("project:" + host + ":")) }.map(\.scope) + documentTabs.filter { $0.chatKey.hasPrefix("chat:" + host + ":") || $0.chatKey.hasPrefix("workspace:" + host + ":") || $0.chatKey.hasPrefix("project:" + host + ":") }.map(\.chatKey))
        applyingContent = true; defer { applyingContent = false }
        for scope in affected {
            for tab in tabs(in: scope) { unload(tab.id); unloadedBrowsers.remove(tab.id) }
            browserTabs.removeAll { $0.scope == scope }
            for doc in documents(in: scope) { documentContents.removeValue(forKey: scope + ":" + doc.id); documentSessions.removeValue(forKey: scope + ":" + doc.id) }
            documentTabs.removeAll { $0.chatKey == scope }; contentSync[scope] = nil; contentSnapshots[scope] = nil; contentPending[scope] = nil; contentHosts[scope] = nil; workspaceContentDescriptors[scope] = nil
            contentRequests[scope] = nil; chatSelectedChildren[scope] = "chat"; chatChildOrder[scope] = []
        }
        saveDocumentTabs(); saveBrowsers()
    }
    func hasPendingContent(in scope: String) -> Bool { contentBusy.contains(scope) || contentPending[scope]?.isEmpty == false || contentRequests[scope] != nil }
    /// Apply an acknowledged owner move locally, without publishing another mutation.
    func applyOwnedContentMove(tabID: String, from source: String, to destination: String, hostID: String) {
        guard source != destination, !hostID.isEmpty,
              source.split(separator: ":", maxSplits: 2).dropFirst().first.map(String.init) == hostID,
              destination.split(separator: ":", maxSplits: 2).dropFirst().first.map(String.init) == hostID else { return }
        let wasApplying = applyingContent; applyingContent = true; defer { applyingContent = wasApplying }
        let sourceRows = contentSnapshots[source]?["tabs"].array ?? []
        let row = sourceRows.first { $0["id"].string == tabID }
        let browserIDs = tabs(in: source).filter { ($0.contentTabId ?? $0.id) == tabID }.map(\.id)
        let documentID = row?["documentId"].string ?? ""
        browserTabs = browserTabs.map { tab in
            var next = tab
            if browserIDs.contains(tab.id) {
                next.scope = destination.hasPrefix("main:") ? "main" : destination.hasPrefix("team:") ? "team" : destination
                next.ownerHostId = hostID
            }
            return next
        }
        documentTabs = documentTabs.map { tab in var next = tab; if tab.chatKey == source && tab.id == documentID { next.chatKey = destination }; return next }
        if !documentID.isEmpty {
            let oldKey = source + ":" + documentID, newKey = destination + ":" + documentID
            if let contents = documentContents.removeValue(forKey: oldKey) { documentContents[newKey] = contents }
            if let session = documentSessions.removeValue(forKey: oldKey) { documentSessions[newKey] = session }
        }
        if let row {
            var sourceSnapshot = contentSnapshots[source]?.object ?? [:], destinationSnapshot = contentSnapshots[destination]?.object ?? ["revision": .number(0)]
            sourceSnapshot["tabs"] = .array(sourceRows.filter { $0["id"].string != tabID })
            let destinationRows = destinationSnapshot["tabs"]?.array ?? []
            destinationSnapshot["tabs"] = .array(destinationRows.filter { $0["id"].string != tabID } + [row])
            contentSnapshots[source] = .object(sourceSnapshot); contentSnapshots[destination] = .object(destinationSnapshot)
            if Self.isOrganizationalScope(source) { workspaceContentDescriptors[source] = sourceSnapshot["tabs"]?.array }
            if Self.isOrganizationalScope(destination) { workspaceContentDescriptors[destination] = destinationSnapshot["tabs"]?.array }
        }
        let moved = browserIDs + (documentID.isEmpty ? [tabID] : [documentID])
        chatChildOrder[source] = (chatChildOrder[source] ?? []).filter { !moved.contains($0) }
        let order = chatChildOrder[destination] ?? []
        chatChildOrder[destination] = order + moved.filter { !order.contains($0) }
        if let selected = chatSelectedChildren[source], moved.contains(selected) { chatSelectedChildren[destination] = selected; chatSelectedChildren[source] = "chat" }
        if let selected = scopedSelection[source], moved.contains(selected) { scopedSelection[destination] = selected; scopedSelection[source] = nil }
        contentHosts[destination] = hostID
        saveDocumentTabs(); saveBrowsers()
    }
    /// Owner redirects move placement only. Never unload a browser, recreate a terminal,
    /// alter a chat, or rewrite an in-flight mutation receipt during reconciliation.
    func reconcileProjectScopes(catalog: NativeProjectCatalog, hostID: String) {
        guard catalog.isValid, !hostID.isEmpty else { return }
        let prefix = "project:" + hostID + ":"
        let scopes = Set(contentSnapshots.keys.filter { $0.hasPrefix(prefix) } + browserTabs.map(\.scope).filter { $0.hasPrefix(prefix) } + documentTabs.map(\.chatKey).filter { $0.hasPrefix(prefix) })
        let wasApplying = applyingContent; applyingContent = true; defer { applyingContent = wasApplying }
        for source in scopes.sorted() {
            let oldID = String(source.dropFirst(prefix.count))
            guard let target = catalog.project(id: oldID), target["id"].string != oldID else { continue }
            let destination = prefix + target["id"].string
            // Unconfirmed requests retain their original route, revision and request ID.
            // Keep that scope recoverable rather than replaying the action at a new target.
            guard !hasPendingContent(in: source) else { error = "A moved project has unconfirmed tab changes. Its original tabs and retry receipts are retained; reconnect and resolve them before moving those tabs."; continue }
            var snapshot = contentSnapshots[destination]?.object ?? ["revision": .number(0)]
            let existing = snapshot["tabs"]?.array ?? []
            let ids = Set(existing.map { $0["id"].string })
            let moved = (contentSnapshots[source]?["tabs"].array ?? []).filter { !ids.contains($0["id"].string) }
            snapshot["tabs"] = .array(existing + moved)
            contentSnapshots[destination] = .object(snapshot)
            workspaceContentDescriptors[destination] = existing + moved
            browserTabs = browserTabs.map { tab in var next = tab; if next.scope == source { next.scope = destination }; return next }
            documentTabs = documentTabs.map { tab in var next = tab; if next.chatKey == source { next.chatKey = destination }; return next }
            for document in documents(in: destination) {
                let oldKey = source + ":" + document.id, newKey = destination + ":" + document.id
                if let contents = documentContents.removeValue(forKey: oldKey) { documentContents[newKey] = contents }
                if let session = documentSessions.removeValue(forKey: oldKey) { documentSessions[newKey] = session }
            }
            let order = chatChildOrder[destination] ?? []
            chatChildOrder[destination] = order + (chatChildOrder[source] ?? []).filter { !order.contains($0) }
            if chatSelectedChildren[destination] == nil { chatSelectedChildren[destination] = chatSelectedChildren[source] }
            if scopedSelection[destination] == nil { scopedSelection[destination] = scopedSelection[source] }
            contentHosts[destination] = hostID
            contentSnapshots[source] = nil; workspaceContentDescriptors[source] = nil; contentSync[source] = nil; contentHosts[source] = nil
            chatChildOrder[source] = nil; chatSelectedChildren[source] = nil; scopedSelection[source] = nil
        }
        saveDocumentTabs(); saveBrowsers()
    }
    func refreshContentTabs(scope: String, remote: RemoteStore, kind: String, id: String) async {
        if remote.status.lowercased().contains("revoked"), let host = remote.connection?.hostId { revokeContentHost(host); return }
        guard remote.connected, remote.state["capabilities"].array.contains(.string("content-tabs.v1")), let host = remote.connection?.hostId else { return }
        if kind == "project" {
            guard remote.supportsProjects, scope == "project:" + host + ":" + id,
                  remote.projectCatalog.project(id: id)?["id"].string == id else { return }
        }
        if let previous = contentHosts[scope], previous != host { contentSnapshots[scope] = nil; contentPending[scope] = nil }
        contentHosts[scope] = host
        remote.onAuthenticatedRevocation = { [weak self] in self?.revokeContentHost(host) }
        contentSync[scope] = (remote, kind, id, host)
        if contentPending[scope] != nil { await flushContentTabs(scope); return }
        guard !contentBusy.contains(scope) else { return }; contentBusy.insert(scope); defer { contentBusy.remove(scope) }
        do {
            var response = try await remote.request("tabs.get", ["scope": .string(kind), "id": .string(id)])
            guard remote.connection?.hostId == host, remote.connected, contentHosts[scope] == host else { return }
            if response["revision"].int == 0 && contentSnapshots[scope] == nil {
                let retained = localContentTabs(scope)
                if !retained.isEmpty { response = try await remote.request("tabs.mutate", ["scope": .string(kind), "id": .string(id), "expectedRevision": .number(0), "operations": .array(retained.map { .object(["action": .string("open"), "tab": $0]) })]) }
            }
            // A user edit made during the fetch wins locally and is sent with its original operation.
            if contentPending[scope] == nil { let complete = try await completeNavigationLists(response, remote: remote, kind: kind, scopeID: id); if contentPending[scope] == nil { applyContentTabs(complete, scope: scope) } else { contentSnapshots[scope] = complete } }
        } catch { /* Offline clients retain bounded descriptors; reads grant no content access. */ }
    }
    private func completeNavigationLists(_ response: JSON, remote: RemoteStore, kind: String, scopeID: String) async throws -> JSON {
        var result = response.object, tabs = response["tabs"].array
        for index in tabs.indices where tabs[index]["type"].string == "browser" {
            let tab = tabs[index], history = tab["history"]
            guard history["total"].int > history["entries"].array.count || history["offset"].int > 0 else { continue }
            var entries: [JSON] = [], cursor: String? = nil, revision: Int? = nil, selected: JSON = history["currentEntryId"]
            repeat {
                var args: [String: JSON] = ["scope": .string(kind), "id": .string(scopeID), "tabId": tab["id"], "limit": .number(200)]
                if let cursor { args["cursor"] = .string(cursor) } else { args["start"] = .bool(true) }
                let page = try await remote.request("tabs.history", args)
                let currentRevision = page["history"]["revision"].int
                if let revision, currentRevision != revision { throw RemoteError(message: "Browser history changed while loading. Refresh to continue.") }
                revision = currentRevision; selected = page["history"]["currentEntryId"]
                entries += page["entries"].array
                cursor = page["hasMore"].bool && !page["nextCursor"].string.isEmpty ? page["nextCursor"].string : nil
                guard entries.count <= 10000 else { throw RemoteError(message: "Browser history exceeds the owner navigation limit.") }
            } while cursor != nil && !Task.isCancelled
            guard !Task.isCancelled, let position = entries.firstIndex(where: { $0["id"] == selected }) else { continue }
            var value = tab.object; value["history"] = .object(["entries": .array(entries), "index": .number(Double(position)), "currentEntryId": selected, "revision": .number(Double(revision ?? 0))]); tabs[index] = .object(value)
        }
        result["tabs"] = .array(tabs); return .object(result)
    }
    // A rejected tab branch is durable until the user chooses how to recover it.
    // Unrelated operations retain their original IDs and order against the fresh owner state.
    func preserveBrowserNavigationConflict(scope: String, operations: [JSON], pending: [JSON], fresh: JSON) {
        let rejected = Set(operations.filter { $0["action"].string.hasPrefix("browser-") }.map { $0["tabId"].string })
        func target(_ operation: JSON) -> String { !operation["tabId"].string.isEmpty ? operation["tabId"].string : !operation["id"].string.isEmpty ? operation["id"].string : operation["tab"]["id"].string }
        let remaining = pending.filter { !rejected.contains(target($0)) }
        let current = localContentTabs(scope)
        for tab in tabs(in: scope) where rejected.contains(tab.contentTabId ?? tab.id) {
            let id = tab.contentTabId ?? tab.id
            let retained = pending.filter { target($0) == id }
            browserConflicts.append(NativeBrowserNavigationConflict(id: UUID().uuidString, scope: scope, tabID: id, tab: tab, operations: retained))
            explicitBrowserNavigations.remove(tab.id); browserOperations[tab.id] = nil
        }
        contentPending[scope] = remaining.isEmpty ? nil : remaining
        // Applying a fresh owner snapshot must not erase another tab's optimistic page/name.
        let unaffected = Set(remaining.map(target).filter { !$0.isEmpty })
        var displayed = fresh.object
        var descriptors = fresh["tabs"].array.map { owner in current.first(where: { $0["id"] == owner["id"] && unaffected.contains(owner["id"].string) }) ?? owner }
        descriptors += current.filter { local in unaffected.contains(local["id"].string) && !descriptors.contains(where: { $0["id"] == local["id"] }) }
        displayed["tabs"] = .array(descriptors)
        applyContentTabs(.object(displayed), scope: scope)
        contentSnapshots[scope] = fresh
        saveDocumentTabs(); saveBrowsers()
    }
    func resolveBrowserNavigationConflict(_ id: String, openLocalCopy: Bool) {
        guard let index = browserConflicts.firstIndex(where: { $0.id == id }) else { return }
        let conflict = browserConflicts.remove(at: index)
        if openLocalCopy {
            var copy = conflict.tab; copy.id = UUID().uuidString; copy.contentTabId = nil
            copy.title = "Offline copy · " + copy.title; copy.customTitle = copy.title; copy.history?.revision = 0
            let wasApplying = applyingContent; applyingContent = true; browserTabs.append(copy); applyingContent = wasApplying
            // Keep recovery in the same chat/workspace/owner rather than adding a main app tab.
            contentTabsChanged()
        }
        saveDocumentTabs(); saveBrowsers()
    }
    private func flushContentTabs(_ scope: String) async {
        guard !contentBusy.contains(scope), let config = contentSync[scope], config.remote.connected, let pending = contentPending[scope], !pending.isEmpty, let snapshot = contentSnapshots[scope] else { return }
        guard (contentBackoff[config.host]?.until ?? .distantPast) <= Date() else { return }
        let operations: [JSON]
        if let first = pending.first, first["action"].string.hasPrefix("browser-") { operations = [first] }
        else { operations = Array(pending.prefix { !$0["action"].string.hasPrefix("browser-") }.prefix(100)) }
        contentBusy.insert(scope); defer { contentBusy.remove(scope) }
        func submit(_ args: [String: JSON]) async throws -> JSON {
            let arguments = JSON.object(args)
            if contentRequests[scope]?["args"] != arguments {
                let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                contentRequests[scope] = .object(["args": arguments, "id": .string(UUID().uuidString.lowercased()), "issuedAt": .string(formatter.string(from: Date()))]); saveDocumentTabs()
            }
            let saved = contentRequests[scope] ?? .null
            return try await config.remote.request("tabs.mutate", args, requestID: saved["id"].string, issuedAt: saved["issuedAt"].string)
        }
        do {
            var response: JSON
            do { response = try await submit(["scope": .string(config.kind), "id": .string(config.id), "expectedRevision": snapshot["revision"], "operations": .array(operations)]) }
            catch {
                guard (error.localizedDescription.contains("Content tabs changed") || error.localizedDescription.contains("Navigation changed") || error.localizedDescription.contains("Reorder must contain each visible browser tab exactly once")) else { throw error }
                let fresh = try await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)])
                if operations.contains(where: { $0["action"].string.hasPrefix("browser-") }) {
                    preserveBrowserNavigationConflict(scope: scope, operations: operations, pending: contentPending[scope] ?? [], fresh: fresh)
                    if contentPending[scope] != nil { Task { await self.flushContentTabs(scope) } }
                    return
                }
                var retry = operations.filter { $0["action"].string != "reorder" }
                var ids = fresh["tabs"].array.map { $0["id"] }
                for operation in retry { if operation["action"].string == "close" { ids.removeAll { $0 == operation["id"] } }; if operation["action"].string == "open" && !ids.contains(operation["tab"]["id"]) { ids.append(operation["tab"]["id"]) } }
                if let reorder = operations.last(where: { $0["action"].string == "reorder" }) { let requested = reorder["ids"].array.filter { ids.contains($0) }; retry.append(.object(["action": .string("reorder"), "ids": .array(requested + ids.filter { !requested.contains($0) })])) }
                response = try await submit(["scope": .string(config.kind), "id": .string(config.id), "expectedRevision": fresh["revision"], "operations": .array(retry)])
            }
            guard config.remote.connection?.hostId == config.host, config.remote.connected, contentHosts[scope] == config.host else { return }
            contentRequests[scope] = nil; contentBackoff[config.host] = nil
            let sentIDs = Set(operations.compactMap { $0["operationId"].string.isEmpty ? nil : $0["operationId"].string })
            let remaining = (contentPending[scope] ?? []).filter { !operations.contains($0) && !sentIDs.contains($0["operationId"].string) }
            contentPending[scope] = remaining.isEmpty ? nil : remaining; saveDocumentTabs()
            if remaining.isEmpty { let complete = try await completeNavigationLists(response, remote: config.remote, kind: config.kind, scopeID: config.id); if contentPending[scope] == nil { applyContentTabs(complete, scope: scope) } else { contentSnapshots[scope] = complete } } else { contentSnapshots[scope] = response; Task { await self.flushContentTabs(scope) } }
        } catch {
            if (error as? RemoteError)?.code == "JOURNAL_BUSY" || error.localizedDescription.localizedCaseInsensitiveContains("Remote command history is busy") {
                let prior = contentBackoff[config.host], attempts = (prior?.attempts ?? 0) + 1, date = Date()
                let delay = min(60.0, max(pow(2.0, Double(min(attempts - 1, 6))), Double((error as? RemoteError)?.details["retryAfterMs"].int ?? 0) / 1000))
                let notify = date.timeIntervalSince(prior?.notified ?? .distantPast) >= 60
                contentBackoff[config.host] = (date.addingTimeInterval(delay), attempts, notify ? date : prior!.notified)
                contentRequests[scope] = nil; saveDocumentTabs()
                if notify { self.error = error.localizedDescription }
                return
            }
            if error.localizedDescription.contains("View chat documents") {
                revokeDocumentTabs(config.host)
                let browserOperations = browserOnlyOperations(operations)
                if contentPending[scope] == nil && !browserOperations.isEmpty { contentPending[scope] = browserOperations }
                if let fresh = try? await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)]), config.remote.connection?.hostId == config.host, contentHosts[scope] == config.host {
                    if contentPending[scope] == nil { applyContentTabs(fresh, scope: scope) } else { contentSnapshots[scope] = fresh }
                }
            } else if contentPending[scope] == nil { contentPending[scope] = operations }
            self.error = error.localizedDescription
        }
    }
    var lists: [JSON] { snapshot["teamLists"].array }
    func reset(for identity: String) {
        guard account != identity else { return }
        mainBrowserSelectionRequest = nil
        flushDocumentScrollPositions()
        saveBrowsers(); for download in Array(downloads.values) { download.cancel() }; exportFile?.cleanup(); exportFile = nil; linkChatDraft = nil; restoring = true; contentSync = [:]; contentRequests = [:]; contentBackoff = [:]; workspaceContentDescriptors = contentSnapshots.filter { Self.isOrganizationalScope($0.key) }.mapValues { $0["tabs"].array }; account = identity; snapshot = .null; accountConnected = false; error = nil; browserPreviews = [:]; browserFavicons = [:]; faviconAttempts = [:]; unloadBrowsers(); browserTabs = []; unloadedBrowsers = []; selectedBrowser = nil; selectedMainBrowser = nil; scopedSelection = [:]; browserTouched = [:]; standupOrders = [:]; standupCompleted = [:]; documentContents = [:]; documentSessions = [:]; previewVersions = [:]; profileStores = [:]; draftAttachments = [:]; chatScrollLocations = [:]; documentScrollOffsets = [:]; draftMessageIDs = [:]; draftSessionIDs = [:]
        if let cacheURL, let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: cacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: account), let decoded = try? JSONDecoder().decode([BrowserDescriptor].self, from: JSONEncoder().encode(payload["tabs"] == .null ? payload : payload["tabs"])) {
            browserTabs = decoded.compactMap(Self.retainedDescriptor); snapshot = payload["accountSnapshot"]; profilesVerified = snapshot["browserProfiles"] != .null
            let savedSelections = payload["selections"].object
            selectedBrowser = (savedSelections["team"]?.string ?? "").isEmpty ? tabs(in: "team").last?.id : savedSelections["team"]?.string
            selectedMainBrowser = (savedSelections["main"]?.string ?? "").isEmpty ? tabs(in: "main").last?.id : savedSelections["main"]?.string
            for tab in browserTabs where tab.scope != "team" && tab.scope != "main" { if scopedSelection[tab.scope] == nil { let saved = savedSelections[tab.scope]?.string ?? ""; scopedSelection[tab.scope] = saved.isEmpty ? tab.id : saved } }
            unloadedBrowsers = Set(browserTabs.filter { $0.url != nil }.map(\.id))
        }
        historyNavigation = [:]; pendingBrowserLoads = [:]; nativeHistoryPosition = [:]; insertionOrigins = [:]; profilesEnabled = UserDefaults.standard.bool(forKey: profilePreferenceKey)
        restoring = false
        for tab in browserTabs where tab.persist && profileAvailable(tab.profileId) { reload(tab.id); _ = webView(tab) }
    }
    private var cacheURL: URL? {
        guard !account.isEmpty else { return nil }
        let name = SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
        return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/browsers/" + name + ".enc")
    }
    private func saveBrowsers() {
        guard !restoring, let cacheURL, let key = BrowserCacheKeychain.key() else { return }
        let safe = browserTabs.suffix(100).compactMap(Self.retainedDescriptor)
        do {
            let tabs = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(safe))
            var selections: [String: JSON] = scopedSelection.mapValues(JSON.string)
            if let selectedBrowser { selections["team"] = .string(selectedBrowser) }
            if let selectedMainBrowser { selections["main"] = .string(selectedMainBrowser) }
            let payload: JSON = .object(["tabs": tabs, "selections": .object(selections), "accountSnapshot": snapshot])
            let encrypted = try RemoteCrypto.seal(payload, key: key, aad: account)
            try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(encrypted.utf8).write(to: cacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var file = cacheURL; var values = URLResourceValues(); values.isExcludedFromBackup = true; try file.setResourceValues(values)
        } catch { /* A descriptor cache failure never changes account data. */ }
    }
    private var shellCacheURL: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/navigation.enc") }
    func saveShellNavigation(_ value: JSON) {
        guard let key = BrowserCacheKeychain.key() else { return }
        do {
            let sealed = try RemoteCrypto.seal(value, key: key, aad: "proteus-mobile-navigation-v1")
            try FileManager.default.createDirectory(at: shellCacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(sealed.utf8).write(to: shellCacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        } catch { /* Navigation restoration must never affect pairing or chat storage. */ }
    }
    func loadShellNavigation() -> JSON {
        guard let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: shellCacheURL) else { return .null }
        return (try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-navigation-v1")) ?? .null
    }
    private var documentCacheURL: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/document-tabs.enc") }
    private func loadDocumentTabs() {
        guard let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: documentCacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-document-tabs-v1") else { return }
        if let encoded = try? JSONEncoder().encode(payload["tabs"]), let tabs = try? JSONDecoder().decode([NativeDocumentDescriptor].self, from: encoded) { documentTabs = Array(tabs.prefix(100)) }
        if let encoded = try? JSONEncoder().encode(payload["browserConflicts"]), let conflicts = try? JSONDecoder().decode([NativeBrowserNavigationConflict].self, from: encoded) { browserConflicts = conflicts }
        contentSnapshots = payload["contentSnapshots"].object; contentPending = payload["contentPending"].object.mapValues { $0.array }; contentRequests = payload["contentRequests"].object; contentHosts = payload["contentHosts"].object.mapValues { $0.string }
        workspaceContentDescriptors = contentSnapshots.filter { Self.isOrganizationalScope($0.key) }.mapValues { $0["tabs"].array }
        chatSelectedChildren = payload["selected"].object.compactMapValues { value in value.string.isEmpty ? nil : value.string }
        chatChildOrder = payload["order"].object.mapValues { $0.array.map(\.string).filter { !$0.isEmpty } }
    }
    private func saveDocumentTabs() {
        guard let key = BrowserCacheKeychain.key(), let tabs = try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(documentTabs.suffix(100))) else { return }
        let conflicts = (try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(browserConflicts))) ?? .array([])
        let payload: JSON = .object(["browserConflicts": conflicts, "contentSnapshots": .object(contentSnapshots), "contentPending": .object(contentPending.mapValues(JSON.array)), "contentRequests": .object(contentRequests), "contentHosts": .object(contentHosts.mapValues(JSON.string)), "tabs": tabs, "selected": .object(chatSelectedChildren.mapValues(JSON.string)), "order": .object(chatChildOrder.mapValues { .array($0.map(JSON.string)) })])
        do { let sealed = try RemoteCrypto.seal(payload, key: key, aad: "proteus-mobile-document-tabs-v1"); try FileManager.default.createDirectory(at: documentCacheURL.deletingLastPathComponent(), withIntermediateDirectories: true); try Data(sealed.utf8).write(to: documentCacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) } catch { /* Read-only tab metadata cannot affect the paired host. */ }
    }
    func contentDescriptorVisible(_ id: String, in scope: String) -> Bool {
        guard let snapshot = contentSnapshots[scope] else { return true }
        return snapshot["tabs"].array.contains { $0["id"].string == id && !$0["hidden"].bool && !$0["navigationClosed"].bool }
    }
    func documents(in chatKey: String) -> [NativeDocumentDescriptor] { documentTabs.filter { $0.chatKey == chatKey } }
    func orderedChatChildren(in chatKey: String, documentIDs: [String]) -> [String] {
        let previewTabs = Set(documents(in: chatKey).compactMap(\.previewTabID))
        let available = tabs(in: chatKey).filter { !$0.hidden && !previewTabs.contains($0.contentTabId ?? $0.id) }.map(\.id) + documentIDs
        let saved = chatChildOrder[chatKey] ?? []
        return saved.filter { available.contains($0) } + available.filter { !saved.contains($0) }
    }
    func moveChatChild(_ id: String, before targetID: String, in chatKey: String, documentIDs: [String]) {
        guard id != targetID else { return }
        var reordered = orderedChatChildren(in: chatKey, documentIDs: documentIDs)
        guard let source = reordered.firstIndex(of: id) else { return }
        reordered.remove(at: source)
        guard let target = reordered.firstIndex(of: targetID) else { return }
        reordered.insert(id, at: target)
        chatChildOrder[chatKey] = reordered; saveDocumentTabs(); contentTabsChanged()
    }
    func shiftChatChild(_ id: String, by offset: Int, in chatKey: String, documentIDs: [String]) {
        let children = orderedChatChildren(in: chatKey, documentIDs: documentIDs)
        guard let index = children.firstIndex(of: id), children.indices.contains(index + offset) else { return }
        if offset < 0 { moveChatChild(id, before: children[index + offset], in: chatKey, documentIDs: documentIDs) }
        else { moveChatChild(children[index + offset], before: id, in: chatKey, documentIDs: documentIDs) }
    }
    func content(for documentID: String, in chatKey: String) -> String? { documentContents[chatKey + ":" + documentID] }
    func documentSession(for documentID: String, in chatKey: String) -> NativeDocumentSession? { documentSessions[chatKey + ":" + documentID] }
    func reloadPreview(_ id: String, scope: String, remote: RemoteStore, chatID: String) async {
        previewVersions.removeValue(forKey: scope + ":" + id)
        await refreshPreviews(scope: scope, remote: remote, chatID: chatID)
    }
    func refreshPreviews(scope: String, remote: RemoteStore, chatID: String) async {
        guard remote.connected, remote.state["capabilities"].array.contains(.string("chat.previews.v1")) else { return }
        do {
            let result = try await remote.request("chat.previews.list", ["id": .string(chatID)])
            let previews = result["previews"].array, ids = Set(previews.map { $0["documentId"].string })
            applyingContent = true
            let retained = documentTabs.filter { $0.chatKey != scope || $0.previewSource == nil || ids.contains($0.id) }
            if retained != documentTabs { documentTabs = retained }
            applyingContent = false
            for preview in previews {
                let id = preview["documentId"].string, key = scope + ":" + id
                let revision = preview["version"].string + (preview["stale"].bool ? ":stale" : "")
                guard !preview["version"].string.isEmpty, previewVersions[key] != revision else { continue }
                let value = try await remote.request("chat.previews.read", ["id": .string(chatID), "documentId": .string(id)])
                guard value["content"].string.utf8.count <= 4 * 1024 * 1024 else { continue }
                let digest = SHA256.hash(data: Data(value["content"].string.utf8)).map { String(format: "%02x", $0) }.joined()
                guard digest == value["version"].string else { continue }
                let title = value["title"].string + (value["stale"].bool ? " · Offline snapshot" : "")
                let descriptor = NativeDocumentDescriptor(id: id, chatKey: scope, title: title, mediaType: "text/html", previewSource: preview["source"].string, previewTabID: preview["tabId"].string.isEmpty ? nil : preview["tabId"].string, previewVersion: value["version"].string, previewLoaded: true)
                applyingContent = true
                documentContents[key] = value["content"].string
                documentSessions[key] = NativeDocumentSession(requestID: "preview:" + id, version: value["version"].string, readAt: value["readAt"].string, assets: [], links: [], assetDataURLs: [:])
                previewVersions[key] = revision
                if let index = documentTabs.firstIndex(where: { $0.chatKey == scope && $0.id == id }) { documentTabs[index] = descriptor } else { documentTabs.append(descriptor) }
                // Bound cached snapshots while keeping the currently viewed chat available.
                var previewBytes = documentTabs.filter { $0.previewSource != nil }.reduce(0) { $0 + (documentContents[$1.chatKey + ":" + $1.id]?.utf8.count ?? 0) }
                for old in documentTabs.filter({ $0.previewSource != nil && $0.chatKey != scope }) where previewBytes > 32 * 1024 * 1024 || documentTabs.filter({ $0.previewSource != nil }).count > 100 {
                    let oldKey = old.chatKey + ":" + old.id
                    previewBytes -= documentContents.removeValue(forKey: oldKey)?.utf8.count ?? 0
                    documentSessions.removeValue(forKey: oldKey); previewVersions.removeValue(forKey: oldKey)
                    documentTabs.removeAll { $0.chatKey == old.chatKey && $0.id == old.id }
                }
                saveDocumentTabs(); applyingContent = false
                if let origin = descriptor.previewTabID, let browser = tabs(in: scope).first(where: { ($0.contentTabId ?? $0.id) == origin }), chatSelectedChildren[scope] == browser.id {
                    selectChatChild(id, for: scope)
                }
            }
        } catch { /* Existing document viewing grants apply; offline clients keep their last snapshot. */ }
    }
    func rememberDocumentSession(_ session: NativeDocumentSession, for documentID: String, in chatKey: String) { documentSessions[chatKey + ":" + documentID] = session }
    func rememberDocument(_ tab: NativeDocumentDescriptor, content: String) { if let index = documentTabs.firstIndex(where: { $0.id == tab.id && $0.chatKey == tab.chatKey }) { documentTabs[index] = tab } else { documentTabs.append(tab) }; documentContents[tab.chatKey + ":" + tab.id] = content; chatSelectedChildren[tab.chatKey] = tab.id; saveDocumentTabs(); contentTabsChanged() }
    func renameDocument(_ id: String, title: String, in chatKey: String) { guard let index = documentTabs.firstIndex(where: { $0.id == id && $0.chatKey == chatKey }) else { return }; let tab = documentTabs[index]; documentTabs[index] = NativeDocumentDescriptor(id: tab.id, chatKey: tab.chatKey, title: String(title.prefix(200)), mediaType: tab.mediaType, parentID: tab.parentID, relativePath: tab.relativePath, customTitle: String(title.prefix(200)), previewSource: tab.previewSource, previewTabID: tab.previewTabID, previewVersion: tab.previewVersion); saveDocumentTabs(); contentTabsChanged() }
    func closeDocument(_ id: String, in chatKey: String) { documentTabs.removeAll { $0.id == id && $0.chatKey == chatKey }; documentContents.removeValue(forKey: chatKey + ":" + id); documentSessions.removeValue(forKey: chatKey + ":" + id); if chatSelectedChildren[chatKey] == id { chatSelectedChildren[chatKey] = "chat" }; saveDocumentTabs(); contentTabsChanged() }
    func removeChatWorkspace(hostID: String, chatID: String) {
        let key = "chat:\(hostID):\(chatID)"
        // Browser pages may contain independent work. Keep their descriptors and live pages in main tabs.
        scopedSelection.removeValue(forKey: key)
        browserTabs = browserTabs.map { tab in var moved = tab; if moved.scope == key { moved.scope = "main" }; return moved }
        let removed = documentTabs.filter { $0.chatKey == key }
        documentTabs.removeAll { $0.chatKey == key }
        for tab in removed { documentContents.removeValue(forKey: key + ":" + tab.id); documentSessions.removeValue(forKey: key + ":" + tab.id) }
        chatSelectedChildren.removeValue(forKey: key)
        chatChildOrder.removeValue(forKey: key)
        documentScrollOffsets = documentScrollOffsets.filter { !$0.key.hasPrefix(key + ":") }
        draftAttachments.removeValue(forKey: key)
        draftMessageIDs.removeValue(forKey: key)
        draftSessionIDs.removeValue(forKey: key)
        saveDocumentTabs()
    }
    func selectChatChild(_ id: String, for chatKey: String) { chatSelectedChildren[chatKey] = id; saveDocumentTabs() }
    func refresh(_ life: LifeStore, collections: [String]? = nil) async {
        if NativeDesignPreview.fixtureService {
            do { snapshot = try await fixtureAppRequest(); error = nil } catch { self.error = error.localizedDescription }
            return
        }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-address-recents") {
            snapshot = .object(["history": .array((0..<25).map { number in .object(["id": .string("v\(number)"), "title": .string("Visited \(number)"), "url": .string("\(nativeFixtureHTTPOrigin)/browser/one#visit=\(number)"), "visitedAt": .string(String(format: "2026-10-07T00:%02d:00Z", number)), "deviceName": .string("Fixture iPad")]) })]); return
        }
        if ProcessInfo.processInfo.arguments.contains("--synthetic-team-lists") {
            snapshot = .object(["teamLists": .array([
                .object(["id": .string("first"), "revision": .string("alpha-v1"), "name": .string("Alpha configuration"), "timezone": .string("UTC"), "members": .array([.object(["id": .string("alpha-member"), "name": .string("Alice"), "mode": .string("fixed")])]), "links": .array([.object(["id": .string("alpha-link"), "title": .string("Alpha link"), "url": .string("https://example.test/alpha")])])]),
                .object(["id": .string("second"), "revision": .string("beta-v1"), "name": .string("Beta configuration"), "timezone": .string("UTC"), "members": .array([.object(["id": .string("beta-member"), "name": .string("Bob"), "mode": .string("random")])]), "links": .array([.object(["id": .string("beta-link"), "title": .string("Beta link"), "url": .string("https://example.test/beta")])])])])]); return
        }
        #endif
        reset(for: life.accountIdentity); let expected = life.accountIdentity
        guard life.credential?.appAuthorized == true else { accountConnected = false; profilesVerified = false; for tab in browserTabs where tab.profileId != "default" { unload(tab.id) }; return }
        busy = true; defer { busy = false }
        do { let value = try await life.appRequest(collections: collections); guard expected == life.accountIdentity else { return }; snapshot = .object(snapshot.object.merging(value.object) { _, new in new }); accountConnected = true; if value.object["browserProfiles"] != nil { profilesVerified = true; saveBrowsers(); for tab in browserTabs where !profileAvailable(tab.profileId) { unload(tab.id) } }; error = nil }
        catch { accountConnected = false; self.error = life.display(error) }
    }
    @discardableResult func mutate(_ life: LifeStore, path: String, method: String = "POST", body: JSON) async -> JSON? {
        if NativeDesignPreview.fixtureService && path.hasPrefix("/team-lists") {
            do { let value = try await fixtureAppRequest(path, method: method, body: body); await refresh(life); return value }
            catch { self.error = error.localizedDescription; return nil }
        }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-team-lists"), path.hasPrefix("/team-lists") {
            var lists = snapshot["teamLists"].array
            if method == "PUT" {
                let id = String(path.dropFirst("/team-lists/".count))
                guard let index = lists.firstIndex(where: { $0["id"].string == id }), body["expectedRevision"].string == lists[index]["revision"].string else { error = "The selected list or revision changed."; return nil }
                var updated = body.object; updated["id"] = .string(id); updated["revision"] = .string(id + "-v2"); lists[index] = .object(updated)
            } else if method == "POST" {
                var created = body.object; created["id"] = .string("created-list"); created["revision"] = .string("created-v1"); lists.append(.object(created))
            } else { error = "Unsupported synthetic team-list mutation."; return nil }
            snapshot = .object(["teamLists": .array(lists)]); return .object(["ok": .bool(true)])
        }
        #endif
        let expected = life.accountIdentity
        do {
            let result = try await life.appRequest(path, method: method, body: body); guard expected == life.accountIdentity else { return nil }
            let kind = path.split(separator: "/").first.map(String.init) ?? ""
            let keys = ["browser-profiles": "browserProfiles", "team-lists": "teamLists", "links": "links", "history": "history", "notifications": "notifications", "logs": "logs"]
            let collections: [String]? = keys[kind].map { [$0] } ?? (kind == "preferences" || kind == "push-subscriptions" ? [] : nil)
            await refresh(life, collections: collections); return result
        }
        catch { self.error = life.display(error); return nil }
    }
    /// Debug simulator rehearsal of the existing website API. Never routes real account records.
    private func fixtureAppRequest(_ path: String = "", method: String = "GET", body: JSON? = nil) async throws -> JSON {
        guard NativeDesignPreview.fixtureService, let url = URL(string: "\(nativeFixtureHTTPOrigin)/native-app" + path) else { throw URLError(.unsupportedURL) }
        var request = URLRequest(url: url); request.httpMethod = method; request.timeoutInterval = 15
        if let body { request.httpBody = try JSONEncoder().encode(body); request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let (data, response) = try await URLSession.shared.data(for: request)
        let value = try JSONDecoder().decode(JSON.self, from: data)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else { throw NSError(domain: "Preview service", code: 1, userInfo: [NSLocalizedDescriptionKey: value["error"].string]) }
        return value
    }
    /// Explicit bookmarks and restore descriptors must reopen the same page, including safe filters.
    static func safeURL(_ text: String) -> URL? {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard input.utf8.count <= 4096, !input.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) || CharacterSet.controlCharacters.contains($0) }),
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
        guard let canonical = url.url, canonical.absoluteString.utf8.count <= 4096 else { return nil }
        return canonical
    }
    /// Browser history retains every HTTP(S) redirect destination, including query/fragment.
    /// Engine page state and request bodies are never persisted or replayed.
    static func historyURL(_ text: String) -> URL? {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard input.utf8.count <= 4096, !input.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) || CharacterSet.controlCharacters.contains($0) }),
              let parts = URLComponents(string: input), ["http", "https"].contains(parts.scheme?.lowercased() ?? ""), let host = parts.host, !host.isEmpty, parts.user == nil, parts.password == nil,
              let url = parts.url, url.absoluteString.utf8.count <= 4096 else { return nil }
        return url
    }
    private static func retainedDescriptor(_ tab: BrowserDescriptor) -> BrowserDescriptor? {
        guard let text = tab.url else { return tab }
        guard let url = historyURL(text) else { return nil }
        var retained = tab; retained.url = url.absoluteString; retained.history = safeBrowserHistory(tab.history); return retained
    }
    private static func decodedForInspection(_ text: String) -> String {
        var result = text
        for _ in 0..<3 { guard let next = result.removingPercentEncoding, next != result else { break }; result = next }
        return result
    }
    private static func sensitiveKey(_ text: String) -> Bool {
        let name = decodedForInspection(text).lowercased()
        return ["pair", "pairing", "token", "code", "secret", "password", "passwd", "auth", "key", "session", "state", "signature", "credential", "cookie"].contains { name.contains($0) }
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
    static func recentBrowserVisits(_ items: [JSON]) -> [JSON] {
        func time(_ item: JSON) -> Date { ProviderAllowance.date(item["visitedAt"].string) ?? ProviderAllowance.date(item["createdAt"].string) ?? .distantPast }
        var seen = Set<String>()
        return Array(items.sorted { time($0) > time($1) }.filter { item in
            guard let url = safeURL(item["url"].string) else { return false }
            return seen.insert(url.absoluteString).inserted
        }.prefix(20))
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
        // Owner operations enqueue visits. Mirrored loads and external-browser launches
        // must not create website history or duplicate owner events.
    }
    func browserRecentVisits(host: String?, profile: String) -> [JSON] {
        let cached = host.map { historyCache[$0 + "|" + profile] ?? [] } ?? []
        let local = browserTabs.filter { $0.profileId == profile && (host == nil || $0.ownerHostId == host || $0.ownerHostId == nil && profile == "default") }.flatMap { tab in
            (tab.history?.entries ?? []).reversed().compactMap { entry -> JSON? in
                guard let url = Self.safeURL(entry.url) else { return nil }
                return .object(["id": .string("local:" + tab.id + ":" + entry.id), "url": .string(url.absoluteString), "title": .string(entry.title), "local": .bool(true)])
            }
        }
        return cached + local
    }
    var recentHistory: [JSON] {
        // The account snapshot remains authoritative for shared visits. Existing local
        // default-profile backstacks provide useful recent sites before refresh/sign-in.
        let local = browserTabs.filter { $0.profileId == "default" }.flatMap { tab in
            (tab.history?.entries ?? []).reversed().compactMap { entry -> JSON? in
                guard let url = Self.historyURL(entry.url) else { return nil }
                return .object(["id": .string("local:" + tab.id + ":" + url.absoluteString), "url": .string(url.absoluteString), "title": .string(entry.title), "deviceName": .string("This device"), "local": .bool(true)])
            }
        }
        let shared = snapshot["history"].array.filter { Self.historyURL($0["url"].string) != nil }
        var seen = Set(shared.compactMap { Self.historyURL($0["url"].string)?.absoluteString })
        return shared + local.filter { item in seen.insert(item["url"].string).inserted }
    }
    @discardableResult func prepareLinkDraft(_ url: URL, remote: RemoteStore, hostID: String, hostName: String, workspaceID: String? = nil) -> Bool {
        guard remote.connection?.hostId == hostID, let safe = Self.safeURL(url.absoluteString) else { return false }
        var value = remote.draft("new-chat").object
        if value.isEmpty {
            let defaults = remote.state["defaults"]
            value = ["provider": defaults["provider"].string.isEmpty ? .string("copilot") : defaults["provider"], "model": defaults["model"], "effort": defaults["reasoningEffort"], "contextTier": .string("default"), "serviceTier": defaults["serviceTier"], "workspace": workspaceID.map(JSON.string) ?? remote.state["context"]["defaultWorkspaceId"], "includeDefaults": .bool(true)]
        }
        let existing = value["prompt"]?.string ?? ""
        value["prompt"] = .string(existing + (existing.isEmpty ? "" : "\n\n") + safe.absoluteString)
        remote.setDraft("new-chat", .object(value))
        linkChatDraft = BrowserChatDraft(id: UUID(), hostID: hostID, hostName: hostName)
        return true
    }
    func download(_ url: URL, in webView: WKWebView, saveAs: Bool = true) {
        guard ["https", "http"].contains(url.scheme), url.user == nil, url.password == nil else { return }
        guard downloads.isEmpty, exportFile == nil else { downloadError = "Finish the current download or file export first."; return }
        let transfer = NativeLinkDownload(shared: self, saveAs: saveAs)
        downloads[transfer.id] = transfer
        webView.startDownload(using: URLRequest(url: url)) { download in transfer.attach(download) }
    }
    func tabs(in scope: String) -> [BrowserDescriptor] {
        if scope.hasPrefix("main:") { let host = String(scope.dropFirst(5)); return browserTabs.filter { $0.scope == "main" && $0.ownerHostId == host } }
        if scope.hasPrefix("team:") { let host = String(scope.dropFirst(5)); return browserTabs.filter { $0.scope == "team" && $0.ownerHostId == host } }
        if scope == "team", let host = currentTeamOwner { return browserTabs.filter { $0.scope == "team" && ($0.ownerHostId == host || $0.ownerHostId == nil) } }
        return browserTabs.filter { $0.scope == scope }
    }
    private func syncScope(_ tab: BrowserDescriptor) -> String { if ["main", "team"].contains(tab.scope), let host = tab.ownerHostId { return tab.scope + ":" + host }; return tab.scope }
    func refreshTeamBrowserTabs(_ remote: RemoteStore) async {
        guard let host = remote.connection?.hostId else { return }
        if let oldHost = contentHosts["team"], contentSnapshots["team:" + oldHost] == nil {
            contentSnapshots["team:" + oldHost] = contentSnapshots.removeValue(forKey: "team"); contentPending["team:" + oldHost] = contentPending.removeValue(forKey: "team"); contentHosts["team:" + oldHost] = oldHost; contentHosts["team"] = nil
            for index in browserTabs.indices where browserTabs[index].scope == "team" && browserTabs[index].ownerHostId == nil { browserTabs[index].ownerHostId = oldHost }
        }
        for tab in browserTabs where tab.scope == "team" && tab.ownerHostId == nil { assignBrowserOwner(tab.id, host: host) }
        if currentTeamOwner != host { currentTeamOwner = host; selectedBrowser = scopedSelection["team:" + host] ?? tabs(in: "team").last?.id }
        await refreshContentTabs(scope: "team:" + host, remote: remote, kind: "team", id: "team")
        await flushHistory(remote)
    }
    func refreshMainBrowserTabs(_ remote: RemoteStore) async {
        guard let host = remote.connection?.hostId else { return }
        for tab in tabs(in: "main") where tab.ownerHostId == nil { assignBrowserOwner(tab.id, host: host) }
        await refreshContentTabs(scope: "main:" + host, remote: remote, kind: "main", id: "main")
        await flushHistory(remote)
        await refreshHistoryCache(remote)
    }
    func transferBrowser(_ id: String, to scope: String, copy: Bool, ownerHostID: String? = nil) {
        guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }
        let tab = browserTabs[index]
        let owner = ownerHostID ?? contentHosts[scope] ?? tab.ownerHostId
        if copy || owner != tab.ownerHostId {
            guard let created = open(nil, title: tab.title, scope: scope, profileId: tab.profileId) else { return }
            assignBrowserOwner(created, host: owner); if let url = tab.url.flatMap(URL.init(string:)) { _ = navigate(url, in: created) }
            if !copy { close(id) }
        } else {
            browserTabs[index].history?.revision = 0
            browserTabs[index].scope = scope
            if selected(in: tab.scope) == id {
                if tab.scope == "main" { selectedMainBrowser = tabs(in: tab.scope).last?.id }
                else if tab.scope == "team" { selectedBrowser = tabs(in: tab.scope).last?.id }
                else { scopedSelection[tab.scope] = tabs(in: tab.scope).last?.id }
            }
            select(id, in: scope)
        }
    }
    func moveBrowser(_ id: String, before targetID: String) {
        guard id != targetID,
              let source = browserTabs.firstIndex(where: { $0.id == id }),
              browserTabs[source].scope == browserTabs.first(where: { $0.id == targetID })?.scope else { return }
        var reordered = browserTabs
        let tab = reordered.remove(at: source)
        if let target = reordered.firstIndex(where: { $0.id == targetID }) { reordered.insert(tab, at: target); browserTabs = reordered }
    }
    func shiftBrowser(_ id: String, by offset: Int) {
        guard let tab = browserTabs.first(where: { $0.id == id }), let index = tabs(in: tab.scope).firstIndex(where: { $0.id == id }) else { return }
        let scoped = tabs(in: tab.scope)
        let next = index + offset
        guard scoped.indices.contains(next) else { return }
        if offset < 0 { moveBrowser(id, before: scoped[next].id) }
        else { moveBrowser(scoped[next].id, before: id) }
    }
    func reorderBrowsers(_ ids: [String], in scope: String) {
        let current = tabs(in: scope)
        let ordered = ids.compactMap { id in current.first { $0.id == id } } + current.filter { !ids.contains($0.id) }
        guard Set(ordered.map(\.id)).count == ordered.count else { return }
        var iterator = ordered.makeIterator()
        browserTabs = browserTabs.map { $0.scope == scope ? iterator.next()! : $0 }
    }
    func reorderChatChildren(_ ids: [String], in scope: String, documentIDs: [String]) {
        let current = orderedChatChildren(in: scope, documentIDs: documentIDs)
        chatChildOrder[scope] = ids.filter { current.contains($0) } + current.filter { !ids.contains($0) }
        saveDocumentTabs(); contentTabsChanged()
    }
    func selected(in scope: String) -> String? { scope == "main" ? selectedMainBrowser : scope == "team" ? selectedBrowser : scopedSelection[scope] }
    func selectChatChild(_ id: String, in scope: String) { guard scope.hasPrefix("chat:") && (id == "chat" || tabs(in: scope).contains(where: { $0.id == id })) else { return }; scopedSelection[scope] = id; saveBrowsers() }
    func select(_ id: String, in scope: String, activateMainBrowser: Bool = true) { guard browserTabs.contains(where: { $0.id == id && $0.scope == scope }) else { return }; if scope == "main" { selectedMainBrowser = id; if activateMainBrowser { mainBrowserSelectionRequest = MainBrowserSelectionRequest(tabID: id) } } else if scope == "team" { selectedBrowser = id; if let host = currentTeamOwner { scopedSelection["team:" + host] = id } } else { scopedSelection[scope] = id }; reload(id); touch(id); saveBrowsers() }
    func touch(_ id: String) { scheduleBrowserPreview(id); browserTouched[id] = Date(); if let index = browserTabs.firstIndex(where: { $0.id == id }) { browserTabs[index].lastTouchedAt = ISO8601DateFormatter().string(from: Date()) }; pruneBrowsers() }
    func persistBrowser(_ id: String, enabled: Bool) { guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }; browserTabs[index].persist = enabled; if enabled { reload(id) }; saveBrowsers() }
    func pruneBrowsers(now: Date = Date()) {
        let recent = Set(browserTouched.filter { item in browserTabs.first(where: { $0.id == item.key })?.persist != true }.sorted { $0.value > $1.value }.prefix(6).map(\.key))
        for id in Array(browserViews.keys) where browserTabs.first(where: { $0.id == id })?.persist != true && !recent.contains(id) && now.timeIntervalSince(browserTouched[id] ?? .distantPast) >= 3600 { unload(id) }
    }
    func takeBrowserInsertionOrigin(_ id: String) -> String? { insertionOrigins.removeValue(forKey: id) }
    @discardableResult func open(_ url: URL?, title: String = "New tab", scope: String = "team", profileId: String = "default", afterSourceID: String? = nil) -> String? {
        guard profileAvailable(profileId) else { error = "Sign in and refresh browser profiles before opening this profile."; return nil }
        var tab = BrowserDescriptor(id: UUID().uuidString, title: title, url: nil, scope: scope, profileId: profileId)
        tab.openedAt = ISO8601DateFormatter().string(from: Date()); tab.lastTouchedAt = tab.openedAt; tab.lastActivityAt = tab.openedAt
        let source = afterSourceID.flatMap { id in browserTabs.firstIndex { $0.id == id && $0.scope == scope } }
        var order = localContentTabs(scope).map { item -> String in
            if item["type"].string == "browser" { return tabs(in: scope).first { ($0.contentTabId ?? $0.id) == item["id"].string }?.id ?? item["id"].string }
            return item["type"].string == "document" ? item["documentId"].string : item["id"].string
        }
        let priorApplying = applyingContent; applyingContent = true
        if let source, let sourceID = afterSourceID {
            if scope == "main" { insertionOrigins[tab.id] = sourceID }
            browserTabs.insert(tab, at: source + 1)
            if let position = order.firstIndex(of: sourceID) { order.insert(tab.id, at: position + 1) } else { order.append(tab.id) }
        } else { browserTabs.append(tab); order.append(tab.id) }
        if scope != "team" { chatChildOrder[scope] = order }
        if Self.isOrganizationalScope(scope) { workspaceContentDescriptors[scope] = localContentTabs(scope) }
        select(tab.id, in: scope); if scope != "main" && scope != "team" { selectChatChild(tab.id, for: scope) }
        saveDocumentTabs(); applyingContent = priorApplying; if !priorApplying { contentTabsChanged() }
        if let url { _ = navigate(url, in: tab.id); if title != "New tab", let index = browserTabs.firstIndex(where: { $0.id == tab.id }) { browserTabs[index].title = title } }
        return tab.id
    }
    @discardableResult func openHistoryVisit(_ item: JSON, ownerHostID: String) -> String? {
        guard !ownerHostID.isEmpty, let url = Self.historyURL(item["url"].string) else { return nil }
        let profile = item["profileId"].string.isEmpty ? "default" : item["profileId"].string
        guard let created = open(url, title: item["title"].string, scope: "main", profileId: profile) else { return nil }
        assignBrowserOwner(created, host: ownerHostID)
        return created
    }
    @discardableResult func navigate(_ url: URL, in id: String) -> Bool {
        guard ["http", "https"].contains(url.scheme), url.host != nil, url.user == nil, url.password == nil,
              let index = browserTabs.firstIndex(where: { $0.id == id }) else { return false }
        if browserTabs[index].url == url.absoluteString, browserTabs[index].history != nil { refreshBrowser(id); return true }
        serverRedirectedBrowsers.remove(id); originalBrowserLoads[id] = url.absoluteString
        mirroredBrowserLoads.remove(id)
        explicitBrowserNavigations.insert(id)
        browserTabs[index].url = url.absoluteString
        historyNavigation.removeValue(forKey: id)
        pendingBrowserLoads[id] = url.absoluteString
        browserTabs[index].title = browserTabs[index].customTitle ?? url.host ?? "Browser"
        unloadedBrowsers.remove(id)
        touch(id)
        browserViews[id]?.load(URLRequest(url: url))
        return true
    }
    private var historyCacheURL: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/browser-history.enc") }
    private func loadHistoryCache() {
        guard let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: historyCacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-history-v1") else { return }
        historyOutbox = payload["outbox"].array
        let threshold = Self.historyCacheStart()
        historyCache = payload["cache"].object.mapValues { $0.array.filter { ProviderAllowance.date($0["visitedAt"].string).map { $0 >= threshold } == true } }
    }
    private func saveHistoryCache() {
        guard let key = BrowserCacheKeychain.key() else { return }
        let payload: JSON = .object(["outbox": .array(historyOutbox), "cache": .object(historyCache.mapValues(JSON.array))])
        do {
            let sealed = try RemoteCrypto.seal(payload, key: key, aad: "proteus-mobile-history-v1")
            try FileManager.default.createDirectory(at: historyCacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(sealed.utf8).write(to: historyCacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        } catch { self.error = "Browser history could not be saved: " + error.localizedDescription }
    }
    func assignBrowserOwner(_ id: String, host: String?) {
        guard let host, let index = browserTabs.firstIndex(where: { $0.id == id }), browserTabs[index].ownerHostId == nil else { return }
        browserTabs[index].ownerHostId = browserTabs[index].scope == "team" ? currentTeamOwner ?? host : contentHosts[browserTabs[index].scope] ?? host
    }
    private func queueHistoryVisit(_ tab: BrowserDescriptor, operation: JSON) {
        guard let host = contentHosts[tab.scope] ?? tab.ownerHostId, let url = Self.historyURL(operation["url"].string) else { return }
        let visit: JSON = .object(["eventId": operation["operationId"], "url": .string(url.absoluteString), "title": operation["title"], "visitedAt": operation["visitedAt"], "sourceHostId": .string(host), "profileId": .string(tab.profileId), "tabId": .string(tab.contentTabId ?? tab.id), "entryId": operation["entryId"], "deviceId": .string(Self.historyDeviceID()), "ownerHostId": .string(host)])
        historyOutbox.append(visit); saveHistoryCache()
        if let config = contentSync[syncScope(tab)] { Task { await flushHistory(config.remote) } }
    }
    func flushHistory(_ remote: RemoteStore) async {
        guard remote.connected, let host = remote.connection?.hostId, !historyFlushing.contains(host) else { return }
        historyFlushing.insert(host); defer { historyFlushing.remove(host) }
        do {
            while remote.connected, remote.connection?.hostId == host {
                let visits = Array(historyOutbox.filter { $0["ownerHostId"].string == host }.prefix(100))
                if visits.isEmpty { break }
                let response = try await remote.request("browser.history.record", ["events": .array(visits)])
                let acknowledged = Set(response["acknowledgedEventIds"].array.map(\.string))
                guard !acknowledged.isEmpty else { break }
                historyOutbox.removeAll { $0["ownerHostId"].string == host && acknowledged.contains($0["eventId"].string) }; saveHistoryCache()
            }
        } catch { historyStatus[host] = "Pending visits retained until this computer reconnects." }
    }
    static func historyCacheStart(now: Date = Date(), calendar: Calendar = .current) -> Date { calendar.date(byAdding: .day, value: -30, to: calendar.startOfDay(for: now)) ?? now.addingTimeInterval(-30 * 86400) }
    func refreshHistoryCache(_ remote: RemoteStore) async {
        guard remote.connected, let host = remote.connection?.hostId, !historyRefreshing.contains(host), Date().timeIntervalSince(historyRefreshed[host] ?? .distantPast) >= 300 else { return }
        historyRefreshing.insert(host); defer { historyRefreshing.remove(host) }
        let from = Self.historyCacheStart(); var cursor: String? = nil, rows: [JSON] = []
        repeat {
            let response = await queryHistory(remote, profileId: "", from: from, cursor: cursor)
            guard response != .null, !Task.isCancelled, remote.connection?.hostId == host else { return }
            rows += response["items"].array
            cursor = response["hasMore"].bool && !response["nextCursor"].string.isEmpty ? response["nextCursor"].string : nil
        } while cursor != nil
        historyCache = historyCache.filter { !$0.key.hasPrefix(host + "|") }
        for (profile, values) in Dictionary(grouping: rows, by: { $0["profileId"].string.isEmpty ? "default" : $0["profileId"].string }) { historyCache[host + "|" + profile] = values }
        historyRefreshed[host] = Date(); historyStatus[host] = "Synced last 30 days with " + remote.displayName; saveHistoryCache()
    }
    func queryHistory(_ remote: RemoteStore, profileId: String = "default", query: String = "", from: Date? = nil, before: Date? = nil, cursor: String? = nil) async -> JSON {
        guard let host = remote.connection?.hostId else { return .null }
        guard remote.connected else { historyStatus[host] = "Offline · cached coverage only"; return .null }
        var args: [String: JSON] = ["profileId": .string(profileId), "limit": .number(200), "query": .string(query)]
        let formatter = ISO8601DateFormatter()
        if let from { args["from"] = .string(formatter.string(from: from)) }
        if let before { args["before"] = .string(formatter.string(from: before)) }
        if let cursor { args["cursor"] = .string(cursor) }
        do {
            let response = try await remote.request("browser.history.query", args)
            guard remote.connection?.hostId == host else { return .null }
            let key = host + "|" + profileId, threshold = Self.historyCacheStart()
            if query.isEmpty {
                var seen = Set<String>()
                historyCache[key] = (response["items"].array + (historyCache[key] ?? [])).filter { item in
                    guard Self.historyURL(item["url"].string) != nil, let date = ProviderAllowance.date(item["visitedAt"].string), date >= threshold else { return false }
                    return seen.insert(item["eventId"].string.isEmpty ? item["id"].string : item["eventId"].string).inserted
                }.sorted { $0["visitedAt"].string > $1["visitedAt"].string }
                saveHistoryCache()
            }
            historyStatus[host] = "Synced with " + remote.displayName
            return response
        } catch { historyStatus[host] = "Cached history · " + error.localizedDescription; return .null }
    }
    func browserFavicon(_ id: String) -> UIImage? { browserFavicons[id] }
    func captureBrowserFavicon(_ id: String) async {
        guard let view = browserViews[id], !view.isLoading, let page = view.url, Self.safeURL(page.absoluteString) != nil, Date().timeIntervalSince(faviconAttempts[id] ?? .distantPast) > 300 else { return }
        faviconAttempts[id] = Date()
        do {
            let text = try await view.evaluateJavaScript("document.querySelector('link[rel~=icon]')?.href || new URL('/favicon.ico',location.href).href") as? String ?? ""
            guard let url = Self.safeURL(text), browserViews[id] === view, view.url == page else { return }
            let configuration = URLSessionConfiguration.ephemeral; configuration.httpShouldSetCookies = false; configuration.httpCookieStorage = nil; configuration.urlCache = nil; configuration.timeoutIntervalForRequest = 8
            let session = URLSession(configuration: configuration); defer { session.invalidateAndCancel() }
            let (bytes, response) = try await session.bytes(from: url)
            guard let response = response as? HTTPURLResponse, response.statusCode == 200, response.expectedContentLength <= 128 * 1024 else { return }
            var data = Data()
            for try await byte in bytes { if data.count >= 128 * 1024 { return }; data.append(byte) }
            guard let source = CGImageSourceCreateWithData(data as CFData, nil), let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 32] as CFDictionary), browserViews[id] === view, view.url == page else { return }
            browserFavicons[id] = UIImage(cgImage: thumbnail)
            let keep = Set(browserTouched.sorted { $0.value > $1.value }.prefix(100).map(\.key) + [id]); browserFavicons = browserFavicons.filter { keep.contains($0.key) }
        } catch { /* The local globe remains the accessible fallback. */ }
    }
    private func thumbnailKey(_ tab: BrowserDescriptor) -> String { "browser:" + account + ":" + tab.profileId + ":" + (tab.ownerHostId ?? "local") + ":" + (tab.contentTabId ?? tab.id) }
    func browserPreview(_ id: String) -> UIImage? {
        if let cached = browserPreviews[id] { return cached }
        guard let tab = browserTabs.first(where: { $0.id == id }), profileAvailable(tab.profileId) else { return nil }
        return NativeThumbnailCache.load(thumbnailKey(tab))
    }
    private var previewCaptureTimes: [String: Date] = [:]
    private var previewCaptureTasks: [String: Task<Void, Never>] = [:]
    func scheduleBrowserPreview(_ id: String) {
        guard Date().timeIntervalSince(previewCaptureTimes[id] ?? .distantPast) > 5 else { return }
        previewCaptureTasks[id]?.cancel()
        previewCaptureTasks[id] = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: .milliseconds(700)) } catch { return }
            guard let self else { return }; previewCaptureTasks[id] = nil
            if let tab = browserTabs.first(where: { $0.id == id }), selected(in: tab.scope) == id { captureBrowserPreview(id) }
        }
    }
    func captureBrowserPreview(_ id: String) {
        guard UIApplication.shared.applicationState == .active, Date().timeIntervalSince(previewCaptureTimes[id] ?? .distantPast) >= 5, let tab = browserTabs.first(where: { $0.id == id }), profileAvailable(tab.profileId), let view = browserViews[id], view.window != nil, !view.isLoading, !view.scrollView.isDragging, !view.scrollView.isDecelerating, !view.scrollView.isZooming, let url = view.url, Self.safeURL(url.absoluteString) != nil else { return }
        previewCaptureTimes[id] = Date()
        let key = thumbnailKey(tab), identity = account
        let config = WKSnapshotConfiguration(); config.snapshotWidth = 320
        view.takeSnapshot(with: config) { [weak self, weak view] image, _ in
            Task { @MainActor in
                guard let self, let view, self.account == identity, self.browserViews[id] === view, view.url == url, let image else { return }
                self.previewCaptureTimes[id] = Date(); self.browserPreviews[id] = image
                NativeThumbnailCache.save(image, key: key)
                let keep = Set(self.browserTouched.sorted { $0.value > $1.value }.prefix(32).map(\.key) + [id])
                self.browserPreviews = self.browserPreviews.filter { keep.contains($0.key) }
            }
        }
    }
    func goBack(_ id: String) { if let item = browserHistory(id, back: true).first { goBrowserHistory(item, in: id) } }
    func goForward(_ id: String) { if let item = browserHistory(id, back: false).first { goBrowserHistory(item, in: id) } }
    func browserHistory(_ id: String, back: Bool) -> [BrowserHistoryItem] {
        guard let history = Self.safeBrowserHistory(browserTabs.first(where: { $0.id == id })?.history) else { return [] }
        let indices = back ? Array((0..<history.index).reversed()) : Array((history.index + 1)..<history.entries.count)
        return indices.map { BrowserHistoryItem(index: $0, url: URL(string: history.entries[$0].url)!, title: history.entries[$0].title, entryId: history.entries[$0].id) }
    }
    func goBrowserHistory(_ item: BrowserHistoryItem, in id: String) {
        guard let index = browserTabs.firstIndex(where: { $0.id == id }), let history = browserTabs[index].history else { return }
        let target = item.entryId.flatMap { selected in history.entries.firstIndex { $0.id == selected } } ?? (item.entryId == nil ? item.index : -1)
        guard history.entries.indices.contains(target), target != history.index, history.entries[target].url == item.url.absoluteString else { return }
        mirroredBrowserLoads.remove(id)
        let item = BrowserHistoryItem(index: target, url: item.url, title: item.title, entryId: history.entries[target].id)
        queueBrowserOperation(browserTabs[index], action: "browser-traverse", entry: history.entries[item.index])
        browserTabs[index].history?.revision += 1
        browserTabs[index].history?.currentEntryId = history.entries[item.index].id
        browserTabs[index].history?.index = item.index
        serverRedirectedBrowsers.remove(id); originalBrowserLoads[id] = item.url.absoluteString
        historyNavigation[id] = item.index
        browserTabs[index].url = item.url.absoluteString
        if let view = browserViews[id] {
            pendingBrowserLoads[id] = item.url.absoluteString
            let backwards = item.index < history.index, distance = abs(item.index - history.index)
            let candidates = backwards ? Array(view.backForwardList.backList.reversed()) : view.backForwardList.forwardList
            let expected = (1...distance).map { history.entries[history.index + (backwards ? -$0 : $0)].url }
            // Repeated URLs can represent different page instances. Use the selected
            // distance only when the entire native path matches the saved path.
            let native = distance > 0 && candidates.count >= distance && Array(candidates.prefix(distance)).map({ $0.url.absoluteString }) == expected ? candidates[distance - 1] : nil
            if let native { view.go(to: native) } else { view.load(URLRequest(url: item.url)) }
        } else { reload(id) }
    }
    func prepareBrowserHistoryNavigation(_ url: URL, in id: String) {
        guard historyNavigation[id] == nil, let tab = browserTabs.first(where: { $0.id == id }), let history = tab.history,
              history.entries.indices.contains(history.index), history.entries[history.index].url != url.absoluteString else { return }
        let candidates = history.entries.indices.filter { history.entries[$0].url == url.absoluteString }
        if let selected = candidates.min(by: { abs($0 - history.index) < abs($1 - history.index) }) { historyNavigation[id] = selected }
    }
    private var serverRedirectedBrowsers = Set<String>()
    private var originalBrowserLoads: [String: String] = [:]
    func prepareBrowserLoad(_ url: URL, in id: String, userInitiated: Bool = false) {
        if userInitiated { mirroredBrowserLoads.remove(id); explicitBrowserNavigations.insert(id); originalBrowserLoads[id] = url.absoluteString }
        applyPageScale(id, url: url); pendingBrowserLoads[id] = url.absoluteString
        if originalBrowserLoads[id] == nil { originalBrowserLoads[id] = url.absoluteString }
    }
    func markBrowserRedirect(_ id: String, url: URL? = nil) {
        if mirroredBrowserLoads.contains(id), !explicitBrowserNavigations.contains(id) {
            if let url { completeBrowserNavigation(url, title: "", in: id) }
            return
        }
        if let requested = originalBrowserLoads[id], let original = Self.historyURL(requested), browserTabs.first(where: { $0.id == id })?.history?.entries.last?.url != requested {
            completeBrowserNavigation(original, title: "Originally requested page", in: id)
        }
        serverRedirectedBrowsers.insert(id)
        if let url { completeBrowserNavigation(url, title: "", in: id) }
    }
    private func queueBrowserOperation(_ tab: BrowserDescriptor, action: String, entry: BrowserHistoryEntry?) {
        guard !applyingContent, let entry, Self.historyURL(entry.url) != nil else { return }
        let scope = syncScope(tab)
        let operationID = UUID().uuidString
        var fields: [String: JSON] = ["visitedAt": .string(ISO8601DateFormatter().string(from: Date())), "eventId": .string(operationID), "profileId": .string(tab.profileId), "sourceHostId": .string(contentHosts[scope] ?? tab.ownerHostId ?? ""), "action": .string(action), "tabId": .string(tab.contentTabId ?? tab.id), "operationId": .string(operationID), "baseRevision": .number(Double(tab.history?.revision ?? 0)), "entryId": .string(entry.id), "url": .string(entry.url), "title": .string(entry.title)]
        if let requested = entry.requestedURL, Self.historyURL(requested) != nil { fields["requestedURL"] = .string(requested) }
        let operation: JSON = .object(fields)
        browserOperations[tab.id] = operation
        if contentSync[scope] != nil {
            contentPending[scope, default: []].append(operation); saveDocumentTabs()
            Task { await flushContentTabs(scope) }
        }
        if action != "browser-redirect" { queueHistoryVisit(tab, operation: operation) }
    }
    func failBrowserNavigation(_ id: String, currentURL: URL?) {
        serverRedirectedBrowsers.remove(id); originalBrowserLoads.removeValue(forKey: id)
        pendingBrowserLoads.removeValue(forKey: id); historyNavigation.removeValue(forKey: id)
        // Engine failures and authentication overlays are local lifecycle states.
        // Keep the last accepted logical destination and all forward entries.
        // A failed mirrored load remains local until the user deliberately navigates.
        if explicitBrowserNavigations.remove(id) != nil, let index = browserTabs.firstIndex(where: { $0.id == id }), let history = browserTabs[index].history, history.entries.indices.contains(history.index) { let priorApplying = applyingContent; applyingContent = true; browserTabs[index].url = history.entries[history.index].url; applyingContent = priorApplying }
    }
    func completeBrowserNavigation(_ url: URL, title: String, in id: String, nativePosition: Int? = nil, sameDocumentObservation: Bool = false) {
        guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }
        if Self.historyURL(url.absoluteString) == nil {
            if let requested = originalBrowserLoads[id], let original = Self.historyURL(requested) {
                completeBrowserNavigation(original, title: "Originally requested page", in: id, nativePosition: nativePosition)
                var state = browserNavigation[id] ?? BrowserNavigationState(); state.url = url.absoluteString; state.title = title; state.isLoading = false; browserNavigation[id] = state
            }
            return
        }
        let serverRedirect = serverRedirectedBrowsers.remove(id) != nil
        let requestedURL = originalBrowserLoads.removeValue(forKey: id)
        pendingBrowserLoads.removeValue(forKey: id)
        let prior = browserTabs[index]
        let explicit = explicitBrowserNavigations.remove(id) != nil
        // SPA history changes can follow a real button click without a WebKit
        // link/form navigation callback. A short trusted-input intent releases
        // the mirror guard; passive redirects and repeated observations do not.
        if explicit || prior.url != url.absoluteString && (browserViews[id] as? NativeLinkWebView)?.hasRecentNavigationIntent == true { mirroredBrowserLoads.remove(id) }
        let mirrored = mirroredBrowserLoads.contains(id) && !explicit
        if mirrored, let history = prior.history {
            if let nativePosition { nativeHistoryPosition[id] = nativePosition }
            historyNavigation[id] = nil
            var state = browserNavigation[id] ?? BrowserNavigationState(); state.url = url.absoluteString; state.title = title; state.isLoading = false; state.canGoBack = history.index > 0; state.canGoForward = history.index + 1 < history.entries.count; browserNavigation[id] = state
            return
        }
        // A legacy/new local descriptor without saved history has no canonical
        // Forward list to protect. Suppress its initial visit once, then allow
        // ordinary WebKit history observations (including SPA pushState).
        if mirrored { mirroredBrowserLoads.remove(id) }
        var tab = prior
        tab.url = url.absoluteString; tab.title = tab.customTitle ?? title
        var history = tab.history ?? BrowserTabHistory(entries: [], index: 0)
        if let selected = historyNavigation.removeValue(forKey: id), history.entries.indices.contains(selected) { history.index = selected }
        else if sameDocumentObservation, let position = nativePosition, let previous = nativeHistoryPosition[id] {
            let selected = history.index + position - previous
            if history.entries.indices.contains(selected), history.entries[selected].url == url.absoluteString { history.index = selected }
        }
        if let nativePosition { nativeHistoryPosition[id] = nativePosition }
        if !history.entries.indices.contains(history.index) || history.entries[history.index].url != url.absoluteString {
            history.entries = Array(history.entries.prefix(history.index + 1))
            history.entries.append(BrowserHistoryEntry(url: url.absoluteString, title: tab.title, requestedURL: serverRedirect && requestedURL != url.absoluteString ? requestedURL : nil)); history.index = history.entries.count - 1
        } else { history.entries[history.index].title = tab.title }
        tab.history = Self.safeBrowserHistory(history)
        if !mirrored && (explicit || prior.url != url.absoluteString || prior.history?.index != tab.history?.index) {
            let traversed = prior.history?.entries.contains(where: { $0.id == tab.history?.currentEntryId }) == true && prior.history?.currentEntryId != tab.history?.currentEntryId
            queueBrowserOperation(prior, action: traversed ? "browser-traverse" : "browser-navigate", entry: tab.history?.entries[tab.history?.index ?? 0])
            tab.history?.revision += 1
        }
        if tab != browserTabs[index] { browserTabs[index] = tab }
        var state = browserNavigation[id] ?? BrowserNavigationState()
        state.url = url.absoluteString; state.title = title; state.isLoading = false
        state.canGoBack = tab.history.map { $0.index > 0 } ?? false
        state.canGoForward = tab.history.map { $0.index + 1 < $0.entries.count } ?? false
        browserNavigation[id] = state
    }
    static func decodeBrowserHistory(_ json: JSON) -> BrowserTabHistory? {
        guard let data = try? JSONEncoder().encode(json), let value = try? JSONDecoder().decode(BrowserTabHistory.self, from: data) else { return nil }
        return safeBrowserHistory(value)
    }
    static func safeBrowserHistory(_ value: BrowserTabHistory?) -> BrowserTabHistory? {
        guard let value, value.entries.indices.contains(value.index), historyURL(value.entries[value.index].url) != nil else { return nil }
        var entries: [BrowserHistoryEntry] = []; var selected = 0
        for i in value.entries.indices {
            guard let url = historyURL(value.entries[i].url) else { continue }
            if i == value.index { selected = entries.count }
            entries.append(BrowserHistoryEntry(id: value.entries[i].id, url: url.absoluteString, title: String(value.entries[i].title.prefix(200)), requestedURL: value.entries[i].requestedURL.flatMap { historyURL($0)?.absoluteString }))
        }
        let result = BrowserTabHistory(entries: entries, index: selected, currentEntryId: entries[selected].id, revision: value.revision)
        return result
    }
    func refreshBrowser(_ id: String) { if let view = browserViews[id] { view.reload() } else { reload(id) } }
    func stopBrowser(_ id: String) { if let view = browserViews[id] { failBrowserNavigation(id, currentURL: view.url); view.stopLoading() } }
    func renameBrowser(_ id: String, title: String) { guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }; browserTabs[index].title = String(title.prefix(200)); browserTabs[index].customTitle = String(title.prefix(200)) }
    func close(_ id: String) { if let tab = browserTabs.first(where: { $0.id == id }) { NativeThumbnailCache.remove(thumbnailKey(tab)) }; let scope = browserTabs.first(where: { $0.id == id })?.scope ?? "team"; unload(id); unloadedBrowsers.remove(id); browserTouched.removeValue(forKey: id); browserTabs.removeAll { $0.id == id }; browserPreviews[id] = nil; browserFavicons[id] = nil; faviconAttempts[id] = nil; if selected(in: scope) == id { if scope == "main" { selectedMainBrowser = tabs(in: scope).last?.id } else if scope == "team" { selectedBrowser = tabs(in: scope).last?.id } else { scopedSelection[scope] = tabs(in: scope).last?.id } } }
    func unload(_ id: String) {
        historyNavigation.removeValue(forKey: id)
        mirroredBrowserLoads.remove(id)
        pendingBrowserLoads.removeValue(forKey: id); nativeHistoryPosition.removeValue(forKey: id)
        browserObservations.removeValue(forKey: id)?.forEach { $0.invalidate() }
        browserNavigation.removeValue(forKey: id)
        if let view = browserViews.removeValue(forKey: id) { view.navigationDelegate = nil; view.uiDelegate = nil; view.stopLoading() }
        unloadedBrowsers.insert(id)
    }
    func reload(_ id: String) { unloadedBrowsers.remove(id) }
    func unloadBrowsers() { for id in Array(browserViews.keys) { unload(id) } }
    func isBrowserLoaded(_ id: String) -> Bool { browserViews[id] != nil }
    func isCurrentBrowserView(_ view: WKWebView, id: String) -> Bool { browserViews[id] === view }
    func webView(_ tab: BrowserDescriptor, allowLocalNavigation: Bool = false) -> WKWebView {
        if let view = browserViews[tab.id] { return view }
        let configuration = WKWebViewConfiguration()
        if !allowLocalNavigation, let address = tab.url, let url = URL(string: address), ["localhost", "127.0.0.1", "::1"].contains(url.host ?? ""), contentSync[tab.scope]?.remote.state["capabilities"].array.contains(.string("chat.previews.v1")) == true {
            configuration.websiteDataStore = .nonPersistent()
            let placeholder = WKWebView(frame: .zero, configuration: configuration)
            let owner = (contentSync[tab.scope]?.remote.displayName ?? "the connected computer").replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
            placeholder.loadHTMLString("<p>This design runs on \(owner). Open its shared Design preview tab. Enable View chat documents on \(owner) if the preview is unavailable.</p>", baseURL: nil)
            return placeholder
        }
        guard profileAvailable(tab.profileId) else { configuration.websiteDataStore = .nonPersistent(); return WKWebView(frame: .zero, configuration: configuration) }
        let storeKey = account + ":" + tab.profileId
        if profileStores[storeKey] == nil { profileStores[storeKey] = tab.profileId == "default" ? .default() : WKWebsiteDataStore(forIdentifier: Self.persistentProfileStoreID(account: account, id: tab.profileId)) }
        configuration.websiteDataStore = profileStores[storeKey]!
        configuration.mediaTypesRequiringUserActionForPlayback = []
        let view = NativeLinkWebView(frame: .zero, configuration: configuration)
        installVideoPolicy(view)
        // Proteus owns the full content-relative edge gesture. Native gesture
        // recognition has different thresholds and must not race that handler.
        // goBrowserHistory still reuses matching native page instances via go(to:).
        view.allowsBackForwardNavigationGestures = false; view.isFindInteractionEnabled = true
        browserViews[tab.id] = view
        browserObservations[tab.id] = [observeBrowser(view, id: tab.id, keyPath: \.canGoBack), observeBrowser(view, id: tab.id, keyPath: \.canGoForward), observeBrowser(view, id: tab.id, keyPath: \.isLoading), observeBrowser(view, id: tab.id, keyPath: \.url), observeBrowser(view, id: tab.id, keyPath: \.title)]
        if let text = tab.url, let url = URL(string: text) { mirroredBrowserLoads.insert(tab.id); pendingBrowserLoads[tab.id] = url.absoluteString; applyPageScale(tab.id, url: url); view.load(URLRequest(url: url)) }
        return view
    }
    private func observeBrowser<Value>(_ view: WKWebView, id: String, keyPath: KeyPath<WKWebView, Value>) -> NSKeyValueObservation {
        view.observe(keyPath, options: [.new]) { [weak self, weak view] _, _ in
            Task { @MainActor [weak self, weak view] in
                guard let self, let view, self.browserViews[id] === view,
                      let index = self.browserTabs.firstIndex(where: { $0.id == id }) else { return }
                // Commit settled same-document navigation into the saved stack.
                if !view.isLoading, let url = view.url, (self.pendingBrowserLoads[id] == url.absoluteString || self.pendingBrowserLoads[id] == nil && self.browserTabs[index].url != url.absoluteString) {
                    self.completeBrowserNavigation(url, title: view.title ?? url.host ?? "Browser", in: id, nativePosition: view.backForwardList.backList.count, sameDocumentObservation: true)
                }
                let history = self.browserTabs[index].history
                let state = BrowserNavigationState(url: view.url?.absoluteString ?? "", title: view.title ?? "", canGoBack: history.map { $0.index > 0 } ?? view.canGoBack, canGoForward: history.map { $0.index + 1 < $0.entries.count } ?? view.canGoForward, isLoading: view.isLoading)
                if self.browserNavigation[id] != state { self.browserNavigation[id] = state }
                // Late KVO can describe the old page while a requested traversal begins.
                // Commit only a settled requested target or an unblocked same-document URL.
                if !view.isLoading, state.url == self.browserTabs[index].url, !state.title.isEmpty {
                    var tab = self.browserTabs[index]
                    tab.title = tab.customTitle ?? state.title
                    if let current = tab.history?.index, tab.history?.entries.indices.contains(current) == true { tab.history?.entries[current].title = tab.title }
                    if tab != self.browserTabs[index] { self.browserTabs[index] = tab }
                }
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
struct BrowserHistoryEntry: Codable, Equatable {
    var id: String = UUID().uuidString; var url: String; var title: String; var requestedURL: String? = nil
    enum CodingKeys: String, CodingKey { case id, url, title, requestedURL }
    init(id: String = UUID().uuidString, url: String, title: String, requestedURL: String? = nil) { self.id = id; self.url = url; self.title = title; self.requestedURL = requestedURL }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: CodingKeys.self); id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString; url = try c.decode(String.self, forKey: .url); title = try c.decode(String.self, forKey: .title); requestedURL = try c.decodeIfPresent(String.self, forKey: .requestedURL) }
}
struct BrowserTabHistory: Codable, Equatable {
    var entries: [BrowserHistoryEntry]; var index: Int; var currentEntryId: String? = nil; var revision: Int = 0
    enum CodingKeys: String, CodingKey { case entries, index, currentEntryId, revision }
    init(entries: [BrowserHistoryEntry], index: Int, currentEntryId: String? = nil, revision: Int = 0) { self.entries = entries; self.index = index; self.currentEntryId = currentEntryId; self.revision = revision }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: CodingKeys.self); entries = try c.decode([BrowserHistoryEntry].self, forKey: .entries); currentEntryId = try c.decodeIfPresent(String.self, forKey: .currentEntryId); index = try c.decodeIfPresent(Int.self, forKey: .index) ?? 0; revision = try c.decodeIfPresent(Int.self, forKey: .revision) ?? 0; if let currentEntryId, let selected = entries.firstIndex(where: { $0.id == currentEntryId }) { index = selected } }
}
struct BrowserHistoryItem: Hashable { var index: Int; var url: URL; var title: String?; var entryId: String? = nil }
struct BrowserDescriptor: Identifiable, Codable, Equatable {
    var id: String; var title: String; var url: String?; var scope: String; var customTitle: String?; var contentTabId: String?; var history: BrowserTabHistory?; var profileId: String; var ownerHostId: String? = nil
    var hidden = false; var persist = false; var openedAt: String?; var lastTouchedAt: String?; var lastActivityAt: String?
    init(id: String, title: String, url: String?, scope: String = "team", customTitle: String? = nil, contentTabId: String? = nil, history: BrowserTabHistory? = nil, profileId: String = "default") { self.profileId = profileId; self.history = history; self.id = id; self.title = title; self.url = url; self.scope = scope; self.customTitle = customTitle; self.contentTabId = contentTabId }
    enum CodingKeys: String, CodingKey { case id, title, url, scope, customTitle, contentTabId, history, profileId, ownerHostId, hidden, persist, openedAt, lastTouchedAt, lastActivityAt }
    init(from decoder: Decoder) throws { let values = try decoder.container(keyedBy: CodingKeys.self); id = try values.decode(String.self, forKey: .id); title = try values.decode(String.self, forKey: .title); url = try values.decodeIfPresent(String.self, forKey: .url); scope = try values.decodeIfPresent(String.self, forKey: .scope) ?? "team"; customTitle = try values.decodeIfPresent(String.self, forKey: .customTitle); contentTabId = try values.decodeIfPresent(String.self, forKey: .contentTabId); history = try values.decodeIfPresent(BrowserTabHistory.self, forKey: .history); profileId = try values.decodeIfPresent(String.self, forKey: .profileId) ?? "default"; ownerHostId = try values.decodeIfPresent(String.self, forKey: .ownerHostId); hidden = try values.decodeIfPresent(Bool.self, forKey: .hidden) ?? false; persist = try values.decodeIfPresent(Bool.self, forKey: .persist) ?? false; openedAt = try values.decodeIfPresent(String.self, forKey: .openedAt); lastTouchedAt = try values.decodeIfPresent(String.self, forKey: .lastTouchedAt); lastActivityAt = try values.decodeIfPresent(String.self, forKey: .lastActivityAt) }
}
struct NativeDocumentDescriptor: Identifiable, Codable, Equatable {
    let id: String
    var chatKey: String
    let title: String
    let mediaType: String
    var parentID: String? = nil
    var relativePath: String? = nil
    var customTitle: String? = nil
    var previewSource: String? = nil
    var previewTabID: String? = nil
    var previewVersion: String? = nil
    // Contents and consent do not survive a cold launch; publish the first fresh read even
    // when its hash matches the persisted descriptor. Keep this state out of CodingKeys.
    var previewLoaded = false
    enum CodingKeys: String, CodingKey { case id, chatKey, title, mediaType, parentID, relativePath, customTitle, previewSource, previewTabID, previewVersion }
}
struct NativeDocumentSession {
    let requestID: String
    let version: String
    let readAt: String
    let assets: [JSON]
    let links: [JSON]
    let assetDataURLs: [String: String]
    var fileCreatedAt = ""
    var fileModifiedAt = ""
}
struct NativeDraftAttachment: Identifiable {
    let id: String
    let name: String
    let mediaType: String
    let bytes: Data
    var image: UIImage? { mediaType.hasPrefix("image/") ? UIImage(data: bytes) : nil }
}

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

struct NativeBrowserNavigationConflict: Identifiable, Codable, Equatable {
    var id: String
    var scope: String
    var tabID: String
    var tab: BrowserDescriptor
    var operations: [JSON]
}

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
/// Account-scoped app data uses its own explicit OAuth consent, never a host's credentials.
@MainActor final class SharedAppStore: ObservableObject {
    // App-session presentation survives drawer/view recreation; never sync it to an owner.
    @Published var sidebarWorkspaces = Set<String>()
    @Published var sidebarProjects = Set<String>()
    @Published var sidebarOtherComputers = false
    @Published var expandedQuestionQueues = Set<String>()
    @Published var snapshot: JSON = .null
    @Published var error: String?
    @Published var busy = false
    @Published var profilesEnabled = false { didSet { if !restoring { UserDefaults.standard.set(profilesEnabled, forKey: profilePreferenceKey); for tab in browserTabs where !profileAvailable(tab.profileId) { unload(tab.id, force: true) } } } }
    @Published private(set) var accountConnected = false
    @Published private(set) var profilesVerified = false
    private var profilePreferenceKey: String { "proteus.browser-profiles." + SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined() }
    var browserProfiles: [JSON] { [.object(["id": .string("default"), "name": .string("Default")])] + (profilesEnabled && profilesVerified ? snapshot["browserProfiles"].array.filter { UUID(uuidString: $0["id"].string) != nil } : []) }
    func profileAvailable(_ id: String) -> Bool { browserProfiles.contains { $0["id"].string == id } }
    func browserLabel(_ tab: BrowserDescriptor) -> String { (tab.customTitle ?? (tab.title.isEmpty ? "New tab" : tab.title)) + " [" + profileName(tab.profileId) + "]" }
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
    // Reading metadata stays local to this account/device. Persist on a completed
    // gesture or lifecycle transition, never on each scroll-frame callback.
    private var chatPositionNamespace = ""
    private var chatPositionKey: String { "proteus.chat-positions." + SHA256.hash(data: Data((chatPositionNamespace + ":" + account).utf8)).map { String(format: "%02x", $0) }.joined() }
    private func chatPositionID(_ key: String) -> String { SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined() }
    private func storedChatPositions() -> [String: NativeChatReadingRecord] {
        guard let data = UserDefaults.standard.data(forKey: chatPositionKey), data.count <= 512 * 1024,
              let rows = try? JSONDecoder().decode([String: NativeChatReadingRecord].self, from: data) else { return [:] }
        return rows.filter { $0.value.location.valid && $0.value.touchedAt.isFinite }
    }
    func chatScrollLocation(for key: String) -> NativeChatScrollLocation? {
        if let location = chatScrollLocations[key] { return location }
        guard !account.isEmpty, let row = storedChatPositions()[chatPositionID(key)] else { return nil }
        chatScrollLocations[key] = row.location
        return row.location
    }
    func persistChatScrollLocation(for key: String) {
        guard !account.isEmpty, let location = chatScrollLocations[key], location.valid else { return }
        var rows = storedChatPositions()
        rows[chatPositionID(key)] = NativeChatReadingRecord(location: location, touchedAt: Date().timeIntervalSince1970)
        let retained = rows.sorted { $0.value.touchedAt > $1.value.touchedAt }.prefix(200)
        if let data = try? JSONEncoder().encode(Dictionary(uniqueKeysWithValues: retained.map { ($0.key, $0.value) })) { UserDefaults.standard.set(data, forKey: chatPositionKey) }
    }
    func clearChatScrollLocation(for key: String) {
        chatScrollLocations.removeValue(forKey: key)
        var rows = storedChatPositions()
        guard rows.removeValue(forKey: chatPositionID(key)) != nil else { return }
        if let data = try? JSONEncoder().encode(rows) { UserDefaults.standard.set(data, forKey: chatPositionKey) }
    }
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
    @Published var loadedTabLimit = max(1, min(256, UserDefaults.standard.object(forKey: "proteus.loaded-tab-limit") as? Int ?? 7)) {
        didSet { UserDefaults.standard.set(max(1, min(256, loadedTabLimit)), forKey: "proteus.loaded-tab-limit") }
    }
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
    private func videoScript() -> String {
        // Use the same player-scoped trusted-gesture policy as desktop. Only its portable
        // function body is executed; no Electron preload or host bridge enters WebKit.
        guard let url = Bundle.main.url(forResource: "browser-video-preload", withExtension: "cjs"),
              let source = try? String(contentsOf: url, encoding: .utf8),
              let start = source.range(of: "func:enabled=>{"), let end = source.range(of: "},args:[blocked]});}", range: start.upperBound..<source.endIndex) else { return "" }
        return "((enabled)=>{" + source[start.upperBound..<end.lowerBound] + "})(" + (blockVideoAutoplay ? "true" : "false") + ");"
    }
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
    private var contentReadAt: [String: Date] = [:]
    private var contentReadSessions: [String: Int] = [:]
    private var contentHosts: [String: String] = [:]
    private var contentSnapshots: [String: JSON] = [:]
    // Temporary, bounded reconciliation evidence contains no URLs, titles, text or keys.
    // This lets a guided device check distinguish a live owner read from a saved cache.
    private var contentReadEvidence: [String: JSON] = [:]
    private var contentReadAttempts: [String: JSON] = [:]
    private var contentEvidenceURL = FileManager.default.temporaryDirectory.appendingPathComponent("proteus-tab-sync-evidence.json")
    private let contentEvidenceQueue = DispatchQueue(label: "Proteus.tab-sync-evidence", qos: .utility)
    private func recordContentRead(_ snapshot: JSON, scope: String) {
        let ids = snapshot["tabs"].array.map { $0["id"] }
        let previous = contentReadEvidence[scope], now = Date().timeIntervalSince1970
        if previous?["revision"] == snapshot["revision"], previous?["tabIds"] == .array(ids), now - Double(previous?["at"].int ?? 0) < 30 { return }
        contentReadEvidence[scope] = .object(["revision": snapshot["revision"], "tabIds": .array(ids), "at": .number(now)])
        let keep = contentReadEvidence.sorted { $0.value["at"].int > $1.value["at"].int }.prefix(64)
        contentReadEvidence = Dictionary(uniqueKeysWithValues: keep.map { ($0.key, $0.value) })
        writeContentEvidence()
    }
    private func recordContentAttempt(_ scope: String, phase: String, error: Error? = nil) {
        let known = ["offline", "invalid-project", "pending-retry", "requesting", "received", "failed", "expired-retained"]
        guard known.contains(phase) else { return }
        let failure = (error as? RemoteError).map { $0.message == "Command expired. Refresh before trying again." ? "expired" : $0.code == "JOURNAL_BUSY" ? "journal-busy" : "owner-error" } ?? (error == nil ? "" : "transport-error")
        let previous = contentReadAttempts[scope], now = Date().timeIntervalSince1970
        if previous?["phase"].string == phase, previous?["failure"].string == failure, now - Double(previous?["at"].int ?? 0) < 5 { return }
        contentReadAttempts[scope] = .object(["phase": .string(phase), "failure": .string(failure), "at": .number(now), "pendingCount": .number(Double(contentPending[scope]?.count ?? 0)), "hasReceipt": .bool(contentRequests[scope] != nil), "cachedRevision": contentSnapshots[scope]?["revision"] ?? .null])
        contentReadAttempts = Dictionary(uniqueKeysWithValues: contentReadAttempts.sorted { $0.value["at"].int > $1.value["at"].int }.prefix(64).map { ($0.key, $0.value) })
        writeContentEvidence()
    }
    private func writeContentEvidence() {
        let value = JSON.object(["schemaVersion": .number(1), "scopes": .object(contentReadEvidence), "attempts": .object(contentReadAttempts)])
        guard let data = try? JSONEncoder().encode(value), data.count <= 1_000_000 else { return }
        let url = contentEvidenceURL
        contentEvidenceQueue.async { try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true); try? data.write(to: url, options: .atomic) }
    }

    private(set) var contentPending: [String: [JSON]] = [:]
    private var contentRequests: [String: JSON] = [:]
    private(set) var legacyContentReview: [String: JSON] = [:]
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
    private var settledMirrorURLs: [String: String] = [:]
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
    private let cacheWriter: NativeSharedCacheWriter
    private let sharedCacheRoot: URL
    private let sharedCacheKey: () -> String?
    init(cacheWriter: NativeSharedCacheWriter = .shared, cacheRoot: URL? = nil, cacheKey: @escaping () -> String? = BrowserCacheKeychain.key) {
        self.cacheWriter = cacheWriter
        if let cacheRoot { contentEvidenceURL = cacheRoot.appendingPathComponent("proteus-tab-sync-evidence.json") }
        chatPositionNamespace = cacheRoot?.path ?? ""
        sharedCacheRoot = cacheRoot ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus")
        sharedCacheKey = cacheKey
        UserDefaults.standard.removeObject(forKey: "proteus.download-history"); loadDocumentTabs(); loadHistoryCache()
    }
    static func isOrganizationalScope(_ scope: String) -> Bool { scope.hasPrefix("workspace:") || scope.hasPrefix("project:") }
    /// Explicit user intent joins the same encrypted durable outbox as browser
    /// navigation. Cache persistence precedes effects, including after reconnect.
    func queueContentOperations(_ operations: [JSON], scope: String, remote: RemoteStore, kind: String, id: String) {
        guard let host = remote.connection?.hostId, contentHosts[scope] == nil || contentHosts[scope] == host else { error = "This tab belongs to another computer."; return }
        guard (contentPending[scope]?.count ?? 0) + operations.count <= 4096 else { error = "Reconnect to finish pending tab changes before adding more."; return }
        contentHosts[scope] = host; contentSync[scope] = (remote, kind, id, host)
        var queued = contentPending[scope] ?? []
        let intents = operations.map { operation -> JSON in
            var value = operation.object; value["intentId"] = .string(UUID().uuidString.lowercased())
            if operation["explicitReopen"].bool {
                let tabID = operation["tab"]["id"]
                value["observedClosedRevision"] = contentSnapshots[scope]?["closed"][tabID.string] ?? .number(0)
                if let predecessor = queued.last(where: { $0["action"].string == "close" && $0["id"] == tabID }) { value["afterClose"] = predecessor["intentId"] }
            }
            let intent = JSON.object(value); queued.append(intent); return intent
        }
        contentPending[scope] = queued
        if contentSnapshots[scope] == nil { contentSnapshots[scope] = .object(["revision": .number(0), "tabs": .array(localContentTabs(scope))]) }
        if Self.isOrganizationalScope(scope) {
            workspaceContentDescriptors[scope] = Self.projectContentOperations(intents, onto: workspaceContentDescriptors[scope] ?? contentSnapshots[scope]?["tabs"].array ?? [])
        }
        // A setup replaces the blank logical slot. Retire its local browser view
        // without publishing Close or letting that view echo a plain blank tab
        // over the setup marker during the next owner refresh.
        let setups = Set(intents.filter { $0["tab"]["setup"] != .null }.map { $0["tab"]["id"].string })
        if !setups.isEmpty {
            let previous = applyingContent; applyingContent = true
            for tab in tabs(in: scope) where setups.contains(tab.contentTabId ?? tab.id) { unload(tab.id, force: true) }
            browserTabs.removeAll { $0.scope == scope && setups.contains($0.contentTabId ?? $0.id) }
            applyingContent = previous
        }
        saveDocumentTabs(); Task { await self.flushContentTabs(scope) }
    }
    static func projectContentOperations(_ operations: [JSON], onto tabs: [JSON]) -> [JSON] {
        var result = tabs
        for op in operations {
            switch op["action"].string {
            case "close": result.removeAll { $0["id"] == op["id"] }
            case "open", "reopen": if let index = result.firstIndex(where: { $0["id"] == op["tab"]["id"] }) { result[index] = op["tab"] } else if op["updateOnly"] != .bool(true) { result.append(op["tab"]) }
            case "reorder": let ids = op["ids"].array; result = ids.compactMap { id in result.first { $0["id"] == id } } + result.filter { !ids.contains($0["id"]) }
            default: break
            }
        }
        return result
    }
    func hasPendingOpen(_ id: String, in scope: String) -> Bool { contentPending[scope]?.contains { ["open", "reopen"].contains($0["action"].string) && $0["explicitReopen"].bool && $0["tab"]["id"].string == id } == true }
    private func recordContentClose(_ id: String, scope: String) {
        guard scope != "main", !scope.hasPrefix("main:") else { return }
        guard !applyingContent, !restoring else { return }
        let parts = scope.split(separator: ":", maxSplits: 2).map(String.init)
        guard parts.count >= 2, UUID(uuidString: parts[1]) != nil else { return }
        contentHosts[scope] = parts[1]
        if contentSnapshots[scope] == nil { contentSnapshots[scope] = .object(["revision": .number(0), "tabs": .array([])]) }
        let op: JSON = .object(["action": .string("close"), "id": .string(id), "intentId": .string(UUID().uuidString.lowercased())])
        if Self.isOrganizationalScope(scope) { workspaceContentDescriptors[scope] = Self.projectContentOperations([op], onto: workspaceContentDescriptors[scope] ?? []) }
        contentPending[scope] = (contentPending[scope] ?? []) + [op]; saveDocumentTabs()
        Task { await self.flushContentTabs(scope) }
    }
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
        let docs = documents(in: scope).filter { $0.previewSource == nil }.map { tab -> JSON in var value: [String: JSON] = ["id": .string("document:" + tab.id), "type": .string("document"), "documentId": .string(tab.id), "title": .string(tab.title), "mediaType": .string(tab.mediaType)]; if let chatID = tab.sourceChatID { value["chatId"] = .string(chatID) }; if let customTitle = tab.customTitle { value["customTitle"] = .string(customTitle) }; if let prior = contentSnapshots[scope]?["tabs"].array.first(where: { $0["id"].string == "document:" + tab.id }) { for (key, field) in prior.object where value[key] == nil && key != "customTitle" { value[key] = field } }; return .object(value) }
        // Keep owner descriptors that this view cannot render. Omitting them would
        // synthesize Close operations and incomplete browser-only reorder payloads.
        let known = Self.isOrganizationalScope(scope) ? (workspaceContentDescriptors[scope] ?? []) : (contentSnapshots[scope]?["tabs"].array ?? [])
        let retained = known.filter { $0["setup"] != .null || !["browser", "document"].contains($0["type"].string) }
        let all = browsers + docs + retained, order = chatChildOrder[scope] ?? []
        return order.compactMap { id in all.first { tab in tab["id"].string == id || tab["documentId"].string == id || tabs(in: scope).contains(where: { $0.id == id && ($0.contentTabId ?? $0.id) == tab["id"].string }) } } + all.filter { tab in !order.contains(tab["id"].string) && !order.contains(tab["documentId"].string) && !tabs(in: scope).contains(where: { browser in order.contains(browser.id) && (browser.contentTabId ?? browser.id) == tab["id"].string }) }
    }
    private func contentTabsChanged() {
        guard !applyingContent, !restoring else { return }
        for (scope, snapshot) in contentSnapshots {
            guard contentHosts[scope] != nil, !scope.hasPrefix("main:") else { continue }
            let prior = snapshot["tabs"].array, current = localContentTabs(scope)
            var operations: [JSON] = []
            for tab in current where !prior.contains(tab) {
                var value = tab.object
                if let old = prior.first(where: { $0["id"] == tab["id"] }), tab["type"].string == "browser" {
                    value["url"] = old["url"]; value["history"] = old["history"]
                    if JSON.object(value) == old { continue }
                }
                operations.append(.object(["action": .string("open"), "updateOnly": .bool(prior.contains { $0["id"] == tab["id"] }), "tab": .object(value)]))
            }
            if prior.allSatisfy({ old in current.contains { $0["id"] == old["id"] } }), current.map({ $0["id"] }) != prior.map({ $0["id"] }) { operations.append(.object(["action": .string("reorder"), "ids": .array(current.map { $0["id"] })])) }
            guard !operations.isEmpty else { continue }
            let pending = contentPending[scope] ?? []
            contentPending[scope] = pending + operations.filter { !pending.contains($0) }; saveDocumentTabs()
            Task { await flushContentTabs(scope) }
        }
    }
    func contentTabSnapshot(in scope: String) -> JSON { contentSnapshots[scope] ?? .null }
    func applyContentTabs(_ response: JSON, scope: String, afterReadingRevision: Int? = nil) {
        let cachedRevision = contentSnapshots[scope]?["revision"].int ?? -1
        // A serialized owner read may replace an older cache incarnation, but
        // never a newer snapshot applied while that read was in flight.
        guard response["revision"].int >= cachedRevision || afterReadingRevision == cachedRevision else { return }
        if Self.isOrganizationalScope(scope), let config = contentSync[scope] {
            NativeWorkspaceNavigation.adoptOwnerChats(response["tabs"].array, navigationKey: config.kind + "-navigation:" + config.id, remote: config.remote)
        }
        if contentSnapshots[scope] == response && localContentTabs(scope) == response["tabs"].array { return }
        guard response["revision"].int >= cachedRevision || afterReadingRevision == cachedRevision else { return }
        applyingContent = true; defer { applyingContent = false }
        if Self.isOrganizationalScope(scope) { workspaceContentDescriptors[scope] = response["tabs"].array }
        var seen = Set<String>()
        let incoming = response["tabs"].array.filter { !$0["id"].string.isEmpty && seen.insert($0["id"].string).inserted }
        let ids = Set(incoming.filter { $0["type"].string == "browser" && $0["setup"] == .null }.map { $0["id"].string })
        let existingBrowsers = tabs(in: scope)
        let privateLocal = existingBrowsers.filter { $0.url != nil && Self.safeURL($0.url ?? "") == nil }
        for old in existingBrowsers where !privateLocal.contains(old) && !ids.contains(old.contentTabId ?? old.id) { unload(old.id, force: true); unloadedBrowsers.remove(old.id) }
        for tab in incoming where tab["type"].string == "browser" && tab["setup"] == .null {
            if let existing = existingBrowsers.first(where: { ($0.contentTabId ?? $0.id) == tab["id"].string }), !privateLocal.contains(existing), !explicitBrowserNavigations.contains(existing.id), browserViews[existing.id]?.url.map({ Self.safeURL($0.absoluteString) == nil }) != true, existing.url ?? "" != tab["url"].string, let url = Self.safeURL(tab["url"].string) { if profileAvailable(existing.profileId) && (tab["profileId"].string.isEmpty ? "default" : tab["profileId"].string) == existing.profileId, let view = browserViews[existing.id] { mirroredBrowserLoads.insert(existing.id); settledMirrorURLs[existing.id] = nil; pendingBrowserLoads[existing.id] = url.absoluteString; view.load(URLRequest(url: url)) } }
        }
        let localIDs = Set(existingBrowsers.map(\.id))
        var nextBrowsers = browserTabs.filter { !localIDs.contains($0.id) || (privateLocal.contains($0) && !ids.contains($0.contentTabId ?? $0.id)) }
        for tab in incoming where tab["type"].string == "browser" && tab["setup"] == .null {
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
            let ownerHistory = tab["history"]
            let retainedHistory = existing?.history
            let history: BrowserTabHistory?
            if preservesLocalNavigation { history = retainedHistory }
            else if let retainedHistory, retainedHistory.revision == ownerHistory["revision"].int,
                    retainedHistory.entries.count == ownerHistory["total"].int,
                    let selected = retainedHistory.entries.firstIndex(where: { $0.id == ownerHistory["currentEntryId"].string }) {
                history = BrowserTabHistory(entries: retainedHistory.entries, index: selected, currentEntryId: retainedHistory.entries[selected].id, revision: retainedHistory.revision)
            } else { history = Self.decodeBrowserHistory(ownerHistory) ?? retainedHistory }
            var descriptor = BrowserDescriptor(id: localID, title: title, url: address, scope: scope.hasPrefix("main:") ? "main" : scope.hasPrefix("team:") ? "team" : scope, customTitle: customTitle.isEmpty ? nil : customTitle, contentTabId: tab["id"].string, history: history, profileId: profile)
            descriptor.hidden = tab["hidden"].bool; descriptor.persist = tab["persist"].bool; descriptor.openedAt = existing?.openedAt ?? (tab["openedAt"].string.isEmpty ? nil : tab["openedAt"].string)
            descriptor.lastActivityAt = tab["lastActivityAt"].string.isEmpty ? existing?.lastActivityAt : tab["lastActivityAt"].string
            let incomingTouch = tab["lastTouchedAt"].string
            descriptor.lastTouchedAt = (existing?.lastTouchedAt.flatMap(ProviderAllowance.date) ?? .distantPast) > (ProviderAllowance.date(incomingTouch) ?? .distantPast) ? existing?.lastTouchedAt : (incomingTouch.isEmpty ? existing?.lastTouchedAt : incomingTouch)
            descriptor.ownerHostId = contentHosts[scope] ?? (scope.hasPrefix("main:") || scope.hasPrefix("team:") ? String(scope.dropFirst(5)) : nil) ?? existing?.ownerHostId ?? (Self.isOrganizationalScope(scope) ? scope.split(separator: ":", maxSplits: 2).dropFirst().first.map(String.init) : nil)
            if existing?.profileId != descriptor.profileId { unload(localID, force: true) }; nextBrowsers.append(descriptor)
            if descriptor.url != nil && !isBrowserLoaded(descriptor.id) && !preservesLocalNavigation { unloadedBrowsers.insert(descriptor.id) }
        }
        // Publish one coherent list so a selected child never temporarily disappears.
        if browserTabs != nextBrowsers { browserTabs = nextBrowsers }
        for tab in browserTabs where tab.persist && profileAvailable(tab.profileId) { reload(tab.id); _ = webView(tab) }
        let docIDs = Set(incoming.filter { $0["type"].string == "document" }.map { $0["documentId"].string })
        for old in documents(in: scope) where old.previewSource == nil && !docIDs.contains(old.id) { documentContents.removeValue(forKey: scope + ":" + old.id); documentSessions.removeValue(forKey: scope + ":" + old.id) }
        documentTabs.removeAll { $0.chatKey == scope && $0.previewSource == nil }
        for tab in incoming where tab["type"].string == "document" { documentTabs.append(NativeDocumentDescriptor(id: tab["documentId"].string, chatKey: scope, title: tab["title"].string, mediaType: tab["mediaType"].string, customTitle: tab["customTitle"].string.isEmpty ? nil : tab["customTitle"].string, sourceChatID: tab["chatId"].string.isEmpty ? nil : tab["chatId"].string)) }
        chatChildOrder[scope] = incoming.map { tab in tab["type"].string == "document" ? tab["documentId"].string : (tabs(in: scope).first { ($0.contentTabId ?? $0.id) == tab["id"].string }?.id ?? tab["id"].string) }
        contentSnapshots[scope] = response
        if Self.isOrganizationalScope(scope), let config = contentSync[scope] {
            NativeWorkspaceNavigation.adoptOwnerChats(incoming, navigationKey: config.kind + "-navigation:" + config.id, remote: config.remote)
        }
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
        for tab in browserTabs where tab.ownerHostId == host { unload(tab.id, force: true) }; browserTabs.removeAll { $0.ownerHostId == host }
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
        guard kind != "main", remote.connected, remote.state["capabilities"].array.contains(.string("content-tabs.v1")), let host = remote.connection?.hostId else { recordContentAttempt(scope, phase: "offline"); return }
        if kind == "project" {
            guard remote.supportsProjects, scope == "project:" + host + ":" + id,
                  remote.projectCatalog.project(id: id)?["id"].string == id else { recordContentAttempt(scope, phase: "invalid-project"); return }
        }
        if let previous = contentHosts[scope], previous != host { contentSnapshots[scope] = nil; contentPending[scope] = nil }
        contentHosts[scope] = host
        remote.onAuthenticatedRevocation = { [weak self] in self?.revokeContentHost(host) }
        contentSync[scope] = (remote, kind, id, host)
        remote.onContentTabsChanged = { [weak self, weak remote] notice in
            guard let self, let remote, remote.connected, remote.connection?.hostId == host else { return }
            let matches = self.contentSync.filter { $0.value.remote === remote && $0.value.host == host && $0.value.kind == notice["scope"].string && $0.value.id == notice["id"].string }
            for (target, config) in matches where !target.hasPrefix("main:") && notice["revision"].int > (self.contentSnapshots[target]?["revision"].int ?? -1) {
                Task { await self.refreshContentTabs(scope: target, remote: remote, kind: config.kind, id: config.id) }
            }
        }
        // A push can overlap an earlier read. Await that read, then fetch again:
        // returning here would discard the newer invalidation (including renames).
        while contentBusy.contains(scope) {
            do { try await Task.sleep(for: .milliseconds(20)) } catch { return }
            guard remote.connected, remote.connection?.hostId == host, contentHosts[scope] == host else { return }
        }
        if contentPending[scope]?.isEmpty == true && contentRequests[scope] == nil { contentPending[scope] = nil }
        if contentPending[scope] != nil { recordContentAttempt(scope, phase: "pending-retry"); await flushContentTabs(scope); return }
        guard !contentBusy.contains(scope) else { return }; contentBusy.insert(scope); defer { contentBusy.remove(scope) }
        do {
            let readRevision = contentSnapshots[scope]?["revision"].int ?? -1
            recordContentAttempt(scope, phase: "requesting")
            var response = try await remote.request("tabs.get", ["scope": .string(kind), "id": .string(id)])
            guard remote.connection?.hostId == host, remote.connected, contentHosts[scope] == host else { return }
            if response["revision"].int == 0 && contentSnapshots[scope] == nil && !Self.isOrganizationalScope(scope) {
                let retained = localContentTabs(scope)
                if !retained.isEmpty { response = try await remote.request("tabs.mutate", ["scope": .string(kind), "id": .string(id), "expectedRevision": .number(0), "operations": .array(retained.map { .object(["action": .string("open"), "tab": $0]) })]) }
            }
            guard case .array = response["tabs"], case .number(let revision) = response["revision"],
                  revision.isFinite, revision >= 0, revision <= 9_007_199_254_740_991, revision.rounded(.down) == revision else {
                throw RemoteError(message: "The host did not return a valid tab snapshot. Cached tabs are retained.")
            }
            // A user edit made during the fetch wins locally and is sent with its original operation.
            if contentPending[scope] == nil {
                // Membership is already authoritative. Do not leave obsolete tabs on
                // screen while optional Back/Forward history pages wait or disconnect.
                applyContentTabs(response, scope: scope, afterReadingRevision: readRevision)
                guard contentSnapshots[scope]?["revision"] == response["revision"] else { return }
                contentReadAt[scope] = Date(); recordContentRead(response, scope: scope); recordContentAttempt(scope, phase: "received")
                let complete = try await completeNavigationLists(response, remote: remote, kind: kind, scopeID: id)
                guard remote.connection?.hostId == host, remote.connected, contentHosts[scope] == host,
                      contentPending[scope] == nil, contentSnapshots[scope]?["revision"] == response["revision"] else { return }
                applyContentTabs(complete, scope: scope)
            }
        } catch { recordContentAttempt(scope, phase: "failed", error: error) }
    }
    func confirmSetupRegistration(_ tabID: String, scope: String, remote: RemoteStore, kind: String, id: String) async throws {
        for _ in 0..<100 {
            try Task.checkCancellation()
            guard remote.connected else { throw RemoteError(message: "Connect this computer to register the setup. Your draft is retained.") }
            await refreshContentTabs(scope: scope, remote: remote, kind: kind, id: id)
            if contentPending[scope] == nil && contentRequests[scope] == nil && !contentBusy.contains(scope) {
                guard contentSnapshots[scope]?["tabs"].array.contains(where: { $0["id"].string == tabID && $0["setup"] != .null }) == true else { throw RemoteError(message: "This setup closed on another device. Your local text is retained.") }
                return
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw RemoteError(message: "Setup registration is still pending. Your draft and retry receipt are retained.")
    }
    private func completeNavigationLists(_ response: JSON, remote: RemoteStore, kind: String, scopeID: String) async throws -> JSON {
        var result = response.object, tabs = response["tabs"].array
        for index in tabs.indices where tabs[index]["type"].string == "browser" {
            let tab = tabs[index], history = tab["history"]
            guard history["total"].int > history["entries"].array.count || history["offset"].int > 0 else { continue }
            // Owners send a small window around the current entry. Reuse the
            // already complete backstack when its revision and selected entry
            // still match, instead of paging every tab again on every sync.
            if let cached = browserTabs.first(where: { ($0.contentTabId ?? $0.id) == tab["id"].string && (contentSync[$0.scope]?.remote === remote || $0.ownerHostId == remote.connection?.hostId) })?.history,
               cached.revision == history["revision"].int, cached.entries.count == history["total"].int,
               let selected = cached.entries.firstIndex(where: { $0.id == history["currentEntryId"].string }),
               let encoded = try? JSONEncoder().encode(BrowserTabHistory(entries: cached.entries, index: selected, currentEntryId: cached.entries[selected].id, revision: cached.revision)),
               let complete = try? JSONDecoder().decode(JSON.self, from: encoded) {
                var value = tab.object; value["history"] = complete; tabs[index] = .object(value); continue
            }
            do {
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
            } catch {
                // Keep the owner’s current history window and retry paging later. Membership
                // is authoritative independently of a page-history transport failure.
                if Task.isCancelled { throw CancellationError() }
            }
        }
        result["tabs"] = .array(tabs); return .object(result)
    }
    // A rejected tab branch is durable until the user chooses how to recover it.
    // Unrelated operations retain their original IDs and order against the fresh owner state.
    func preserveBrowserNavigationConflict(scope: String, operations: [JSON], pending: [JSON], fresh: JSON) {
        let rejected = Set(operations.filter { $0["action"].string.hasPrefix("browser-") }.map { $0["tabId"].string })
        func target(_ operation: JSON) -> String { !operation["tabId"].string.isEmpty ? operation["tabId"].string : !operation["id"].string.isEmpty ? operation["id"].string : operation["tab"]["id"].string }
        let remaining = pending.filter { $0["action"].string == "close" || !rejected.contains(target($0)) }
        let current = localContentTabs(scope)
        for tab in tabs(in: scope) where rejected.contains(tab.contentTabId ?? tab.id) {
            let id = tab.contentTabId ?? tab.id
            let retained = pending.filter { target($0) == id && $0["action"].string != "close" }
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
    static func rebaseContentOperations(_ operations: [JSON], snapshot: JSON) -> [JSON] {
        var rows = snapshot["tabs"].array, result: [JSON] = []
        for original in operations {
            var op = original.object; let action = original["action"].string, id = original["tab"]["id"].string
            if action == "open" {
                let present = rows.contains { $0["id"].string == id }
                if original["updateOnly"].bool && !present { continue }
                if snapshot["closed"][id].int > 0 {
                    guard original["explicitReopen"].bool, original["observedClosedRevision"] == snapshot["closed"][id] else { continue }
                    op["action"] = .string("reopen"); op["closedRevision"] = snapshot["closed"][id]
                }
            }
            if action == "reorder" {
                let requested = original["ids"].array, ids = rows.map { $0["id"] }
                var seen = Set<JSON>()
                op["ids"] = .array((requested.filter { ids.contains($0) } + ids).filter { seen.insert($0).inserted })
            }
            for key in ["explicitReopen", "observedClosedRevision", "afterClose", "intentId"] { op.removeValue(forKey: key) }
            let prepared = JSON.object(op); result.append(prepared)
            rows = projectContentOperations([prepared], onto: rows)
        }
        return result
    }
    func refreshKnownContentTabs(_ remote: RemoteStore) async {
        guard let host = remote.connection?.hostId else { return }
        if contentReadSessions[host] != remote.authenticationGeneration {
            for scope in contentHosts.keys where contentHosts[scope] == host { contentReadAt[scope] = nil }
            contentReadSessions[host] = remote.authenticationGeneration
        }
        for scope in contentHosts.keys.sorted() where contentHosts[scope] == host {
            let parts = scope.split(separator: ":", maxSplits: 2).map(String.init)
            let kind = parts.first ?? "", id = parts.count == 3 ? parts[2] : kind
            guard ["team", "workspace", "project", "chat"].contains(kind) else { continue }
            // Visible views already refresh themselves. Push handles known inactive containers;
            // bounded fallback covers a lost notice or owner without notice support.
            guard contentPending[scope] != nil || Date().timeIntervalSince(contentReadAt[scope] ?? .distantPast) >= 60 else { continue }
            await refreshContentTabs(scope: scope, remote: remote, kind: kind, id: id)
        }
    }
    // Only an authenticated, terminal expiry rejection leaves the active outbox.
    // Timeouts and uncertain delivery keep the original request unchanged.
    @discardableResult func retainExpiredContentRequest(_ scope: String, error: Error) -> Bool {
        guard let refusal = error as? RemoteError, refusal.message == "Command expired. Refresh before trying again.",
              let request = contentRequests[scope], let pending = contentPending[scope], !pending.isEmpty else { return false }
        let key = scope + ":expired:" + request["id"].string
        legacyContentReview[key] = .object(["scope": .string(scope), "operations": .array(pending), "request": request, "reason": .string("owner-rejected-expired-request")])
        contentRequests[scope] = nil; contentPending[scope] = nil
        saveDocumentTabs(); recordContentAttempt(scope, phase: "expired-retained", error: error)
        return true
    }
    private func flushContentTabs(_ scope: String) async {
        guard !scope.hasPrefix("main:"), !contentBusy.contains(scope), let config = contentSync[scope], config.remote.connected,
              let pending = contentPending[scope], !pending.isEmpty else { return }
        guard (contentBackoff[config.host]?.until ?? .distantPast) <= Date() else { return }
        let saved = contentRequests[scope]
        let operations: [JSON]
        if let saved {
            operations = saved["pendingOperations"] == .null ? saved["args"]["operations"].array : saved["pendingOperations"].array
        } else if pending.first?["action"].string.hasPrefix("browser-") == true { operations = [pending[0]] }
        else if !pending[0]["intentId"].string.isEmpty { operations = [pending[0]] }
        else { operations = Array(pending.prefix { $0["intentId"].string.isEmpty && !$0["action"].string.hasPrefix("browser-") }.prefix(100)) }
        let requestAccount = account
        contentBusy.insert(scope); defer { contentBusy.remove(scope) }
        func submit(_ fresh: JSON) async throws -> JSON {
            if contentRequests[scope] == nil {
                let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                let prepared = Self.rebaseContentOperations(operations, snapshot: fresh)
                if prepared.isEmpty { return fresh }
                contentRequests[scope] = .object(["args": .object(["scope": .string(config.kind), "id": .string(config.id), "expectedRevision": fresh["revision"], "operations": .array(prepared)]), "pendingOperations": .array(operations), "id": .string(UUID().uuidString.lowercased()), "issuedAt": .string(formatter.string(from: Date()))])
            }
            let envelope = contentRequests[scope] ?? .null
            try await saveDocumentTabs().value()
            try Task.checkCancellation()
            guard account == requestAccount, config.remote.connected, config.remote.connection?.hostId == config.host,
                  contentHosts[scope] == config.host, contentSync[scope]?.remote === config.remote,
                  contentRequests[scope] == envelope else { throw CancellationError() }
            return try await config.remote.request("tabs.mutate", envelope["args"].object, requestID: envelope["id"].string, issuedAt: envelope["issuedAt"].string)
        }
        do {
            // An uncertain saved request is replayed byte-for-byte before reading
            // or rebasing new intent. Only definite rejection permits a new receipt.
            var response: JSON
            do {
                let fresh = saved == nil ? try await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)]) : contentSnapshots[scope] ?? .null
                response = try await submit(fresh)
            } catch {
                let code = (error as? RemoteError)?.code ?? ""
                let stale = error.localizedDescription.contains("Content tabs changed") || error.localizedDescription.contains("Reorder must contain each visible browser tab exactly once")
                guard stale || code.hasPrefix("NAVIGATION_") || error.localizedDescription.contains("Navigation changed") else { throw error }
                let retainedRequest = contentRequests[scope]
                contentRequests[scope] = nil; saveDocumentTabs()
                let fresh = try await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)])
                if operations.contains(where: { $0["action"].string.hasPrefix("browser-") }) {
                    preserveBrowserNavigationConflict(scope: scope, operations: operations, pending: contentPending[scope] ?? [], fresh: fresh)
                    if let retainedRequest { for index in browserConflicts.indices where browserConflicts[index].scope == scope && browserConflicts[index].receipt == nil { browserConflicts[index].receipt = retainedRequest } }
                    saveDocumentTabs()
                    if contentPending[scope] != nil { Task { await self.flushContentTabs(scope) } }
                    return
                }
                response = try await submit(fresh)
            }
            guard account == requestAccount, config.remote.connection?.hostId == config.host, config.remote.connected, contentHosts[scope] == config.host else { return }
            contentRequests[scope] = nil; contentBackoff[config.host] = nil
            let sentIDs = Set(operations.compactMap { $0["operationId"].string.isEmpty ? nil : $0["operationId"].string })
            var remaining = contentPending[scope] ?? []
            for operation in operations {
                if let index = remaining.firstIndex(where: { operation["intentId"].string.isEmpty ? $0 == operation : $0["intentId"] == operation["intentId"] }) { remaining.remove(at: index) }
                if operation["action"].string == "close", !operation["intentId"].string.isEmpty {
                    remaining = remaining.map { pending in
                        guard pending["afterClose"] == operation["intentId"] else { return pending }
                        var value = pending.object; value["observedClosedRevision"] = response["closed"][operation["id"].string]
                        value.removeValue(forKey: "afterClose"); return .object(value)
                    }
                }
            }
            remaining.removeAll { !$0["operationId"].string.isEmpty && sentIDs.contains($0["operationId"].string) }
            contentPending[scope] = remaining.isEmpty ? nil : remaining; saveDocumentTabs()
            if remaining.isEmpty {
                let complete = try await completeNavigationLists(response, remote: config.remote, kind: config.kind, scopeID: config.id)
                if contentPending[scope] == nil { applyContentTabs(complete, scope: scope) }
                else {
                    // New intent can arrive while optional history hydration awaits.
                    // Its first flush sees contentBusy; hand it back after this one exits.
                    Task { await self.flushContentTabs(scope) }
                }
            } else {
                if response["revision"].int >= (contentSnapshots[scope]?["revision"].int ?? -1) { contentSnapshots[scope] = response }
                if Self.isOrganizationalScope(scope) { workspaceContentDescriptors[scope] = Self.projectContentOperations(remaining, onto: response["tabs"].array) }
                Task { await self.flushContentTabs(scope) }
            }
        } catch {
            guard account == requestAccount, contentHosts[scope] == config.host, contentSync[scope]?.remote === config.remote else { return }
            if retainExpiredContentRequest(scope, error: error) {
                let readRevision = contentSnapshots[scope]?["revision"].int ?? -1
                if let fresh = try? await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)]),
                   account == requestAccount, config.remote.connected, config.remote.connection?.hostId == config.host, contentPending[scope] == nil {
                    applyContentTabs(fresh, scope: scope, afterReadingRevision: readRevision)
                    recordContentRead(fresh, scope: scope)
                }
                self.error = "Expired offline tab edits were retained for review. Refresh Tabs and repeat only changes you still want."
            } else if (error as? RemoteError)?.code == "JOURNAL_BUSY" {
                let prior = contentBackoff[config.host], attempts = (prior?.attempts ?? 0) + 1, date = Date()
                let notify = date.timeIntervalSince(prior?.notified ?? .distantPast) >= 60
                contentBackoff[config.host] = (date.addingTimeInterval(min(60, pow(2, Double(min(attempts - 1, 6))))), attempts, notify ? date : prior!.notified)
                contentRequests[scope] = nil; saveDocumentTabs()
                if notify { self.error = error.localizedDescription }
            } else if error.localizedDescription.contains("View chat documents") {
                revokeDocumentTabs(config.host)
                if let fresh = try? await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)]), config.remote.connection?.hostId == config.host {
                    if contentPending[scope] == nil { applyContentTabs(fresh, scope: scope) } else { contentSnapshots[scope] = fresh }
                }
                self.error = error.localizedDescription
            } else { self.error = error.localizedDescription }
        }
    }

    var lists: [JSON] { snapshot["teamLists"].array }
    func reset(for identity: String) {
        guard account != identity else { return }
        sidebarWorkspaces = []; sidebarProjects = []; sidebarOtherComputers = false; expandedQuestionQueues = []
        saveBrowsers()
        let cacheFailure = flushCachedState()
        mainBrowserSelectionRequest = nil
        // Host-scoped pending operations survive account changes, so their retry
        // identities must survive too. Clearing sync bindings pauses dispatch
        // until the new account reconnects to that owner with its own grants.
        contentReadEvidence = [:]; contentReadAttempts = [:]
        let evidenceURL = contentEvidenceURL
        contentEvidenceQueue.async { try? FileManager.default.removeItem(at: evidenceURL) }
        for download in Array(downloads.values) { download.cancel() }; exportFile?.cleanup(); exportFile = nil; linkChatDraft = nil; restoring = true; contentSync = [:]; contentBackoff = [:]; workspaceContentDescriptors = Dictionary(uniqueKeysWithValues: contentSnapshots.filter { Self.isOrganizationalScope($0.key) }.map { (scope, snapshot) in (scope, Self.projectContentOperations(contentPending[scope] ?? [], onto: snapshot["tabs"].array)) }); account = identity; snapshot = .null; accountConnected = false; error = cacheFailure; browserPreviews = [:]; browserFavicons = [:]; faviconAttempts = [:]; unloadBrowsers(); browserTabs = []; unloadedBrowsers = []; selectedBrowser = nil; selectedMainBrowser = nil; scopedSelection = [:]; browserTouched = [:]; standupOrders = [:]; standupCompleted = [:]; documentContents = [:]; documentSessions = [:]; previewVersions = [:]; profileStores = [:]; draftAttachments = [:]; chatScrollLocations = [:]; documentScrollOffsets = [:]; draftMessageIDs = [:]; draftSessionIDs = [:]
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
    private var descriptorCacheKey: String?
    private func saveBrowsers() {
        guard !restoring, let cacheURL else { return }
        if descriptorCacheKey == nil { descriptorCacheKey = BrowserCacheKeychain.key() }
        guard let key = descriptorCacheKey else { return }
        // The loaded-page budget is separate from saved tab identity. Taking a
        // suffix here silently discarded older tabs (including the selected one).
        let retained = browserTabs
        var selections = scopedSelection.mapValues(JSON.string)
        if let selectedBrowser { selections["team"] = .string(selectedBrowser) }
        if let selectedMainBrowser { selections["main"] = .string(selectedMainBrowser) }
        NativeDescriptorCacheWriter.shared.save(tabs: retained, selections: selections, snapshot: snapshot, key: key, account: account, url: cacheURL)
    }

    private var shellCacheURL: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Proteus/navigation.enc") }
    func saveShellNavigation(_ value: JSON) {
        if descriptorCacheKey == nil { descriptorCacheKey = BrowserCacheKeychain.key() }
        guard let key = descriptorCacheKey else { return }
        NativeDescriptorCacheWriter.shared.saveNavigation(value, key: key, url: shellCacheURL)
    }
    func loadShellNavigation() -> JSON {
        guard let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: shellCacheURL) else { return .null }
        return (try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-navigation-v1")) ?? .null
    }
    private var documentCacheURL: URL { sharedCacheRoot.appendingPathComponent("document-tabs.enc") }
    private func loadDocumentTabs() {
        do { try cacheWriter.flush() } catch { self.error = error.localizedDescription }
        guard let key = sharedCacheKey(), let data = try? Data(contentsOf: documentCacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-document-tabs-v1") else { return }
        if let encoded = try? JSONEncoder().encode(payload["tabs"]), let tabs = try? JSONDecoder().decode([NativeDocumentDescriptor].self, from: encoded) { documentTabs = Array(tabs.prefix(100)) }
        if let encoded = try? JSONEncoder().encode(payload["browserConflicts"]), let conflicts = try? JSONDecoder().decode([NativeBrowserNavigationConflict].self, from: encoded) { browserConflicts = conflicts }
        contentSnapshots = payload["contentSnapshots"].object; contentPending = payload["contentPending"].object.mapValues { $0.array }; contentRequests = payload["contentRequests"].object; contentHosts = payload["contentHosts"].object.mapValues { $0.string }
        legacyContentReview = payload["legacyContentReview"].object
        // Old caches can contain an empty outbox. It must not suppress every
        // owner refresh. An orphaned delivery envelope is retained for review,
        // never replayed against a new edit or discarded as an empty draft.
        for scope in Set(contentPending.keys).union(contentRequests.keys) where contentPending[scope]?.isEmpty != false {
            if let request = contentRequests[scope] {
                legacyContentReview[scope] = .object(["operations": .array([]), "request": request, "reason": .string("missing-pending-operations")])
                contentRequests[scope] = nil
            }
            contentPending[scope] = nil
        }
        for (scope, operations) in contentPending where operations.contains(where: { $0["action"].string == "close" && $0["intentId"].string.isEmpty }) {
            // Old clients inferred Close from missing views. Retain the complete
            // original envelope for review; migration cannot authorize deletion.
            legacyContentReview[scope] = .object(["operations": .array(operations), "request": contentRequests[scope] ?? .null])
            contentPending[scope] = nil; contentRequests[scope] = nil
        }
        if !legacyContentReview.isEmpty { error = "Older offline tab edits were retained for review. Current computer tabs are shown; repeat any intended closes from Tabs." }
        workspaceContentDescriptors = Dictionary(uniqueKeysWithValues: contentSnapshots.filter { Self.isOrganizationalScope($0.key) }.map { (scope, snapshot) in (scope, Self.projectContentOperations(contentPending[scope] ?? [], onto: snapshot["tabs"].array)) })
        chatSelectedChildren = payload["selected"].object.compactMapValues { value in value.string.isEmpty ? nil : value.string }
        chatChildOrder = payload["order"].object.mapValues { $0.array.map(\.string).filter { !$0.isEmpty } }
    }
    @discardableResult private func saveDocumentTabs() -> NativeCacheWriteReceipt {
        let tabs = Array(documentTabs.suffix(100)), conflicts = browserConflicts
        let fields: [String: JSON] = ["legacyContentReview": .object(legacyContentReview), "contentSnapshots": .object(contentSnapshots), "contentPending": .object(contentPending.mapValues(JSON.array)), "contentRequests": .object(contentRequests), "contentHosts": .object(contentHosts.mapValues(JSON.string)), "selected": .object(chatSelectedChildren.mapValues(JSON.string)), "order": .object(chatChildOrder.mapValues { .array($0.map(JSON.string)) })]
        return saveSharedCache(url: documentCacheURL, aad: "proteus-mobile-document-tabs-v1") {
            var payload = fields
            payload["tabs"] = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(tabs))
            payload["browserConflicts"] = try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(conflicts))
            return .object(payload)
        }
    }
    private func saveSharedCache(url: URL, aad: String, snapshot: @escaping () throws -> JSON) -> NativeCacheWriteReceipt {
        let key = sharedCacheKey()
        return cacheWriter.save(url: url, snapshot: {
            guard let key else { throw RemoteError(message: "Unlock this device before syncing local tab/history changes.") }
            return Data(try RemoteCrypto.seal(snapshot(), key: key, aad: aad).utf8)
        }, onFailure: { [weak self] error in
            let message = error.localizedDescription
            Task { @MainActor [weak self] in self?.error = "Local tab/history changes could not be saved: " + message }
        })
    }
    @discardableResult func flushCachedState() -> String? {
        flushDocumentScrollPositions()
        NativeDescriptorCacheWriter.shared.flush()
        do { try cacheWriter.flush(); return nil } catch { let message = "Local tab/history changes could not be saved: " + error.localizedDescription; self.error = message; return message }
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
            let retained = documentTabs.filter { $0.chatKey != scope || $0.previewSource == nil || $0.sourceChatID != chatID || ids.contains($0.id) }
            if retained != documentTabs { documentTabs = retained }
            applyingContent = false
            for preview in previews {
                let id = preview["documentId"].string, key = scope + ":" + id
                let revision = preview["version"].string + (preview["stale"].bool ? ":stale" : "") + ":" + preview["tabId"].string
                guard !preview["version"].string.isEmpty, previewVersions[key] != revision else { continue }
                let value = try await remote.request("chat.previews.read", ["id": .string(chatID), "documentId": .string(id)])
                guard value["content"].string.utf8.count <= 4 * 1024 * 1024 else { continue }
                let digest = SHA256.hash(data: Data(value["content"].string.utf8)).map { String(format: "%02x", $0) }.joined()
                guard digest == value["version"].string else { continue }
                let title = value["title"].string + (value["stale"].bool ? " · Offline snapshot" : "")
                let descriptor = NativeDocumentDescriptor(id: id, chatKey: scope, title: title, mediaType: "text/html", previewSource: preview["source"].string, previewTabID: preview["tabId"].string.isEmpty ? nil : preview["tabId"].string, previewVersion: value["version"].string, sourceChatID: chatID, previewLoaded: true)
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
    func renameDocument(_ id: String, title: String, in chatKey: String) { guard let index = documentTabs.firstIndex(where: { $0.id == id && $0.chatKey == chatKey }) else { return }; let tab = documentTabs[index]; documentTabs[index] = NativeDocumentDescriptor(id: tab.id, chatKey: tab.chatKey, title: String(title.prefix(200)), mediaType: tab.mediaType, parentID: tab.parentID, relativePath: tab.relativePath, customTitle: String(title.prefix(200)), previewSource: tab.previewSource, previewTabID: tab.previewTabID, previewVersion: tab.previewVersion, sourceChatID: tab.sourceChatID); saveDocumentTabs(); contentTabsChanged() }
    func closeDocument(_ id: String, in chatKey: String) { recordContentClose("document:" + id, scope: chatKey); documentTabs.removeAll { $0.id == id && $0.chatKey == chatKey }; documentContents.removeValue(forKey: chatKey + ":" + id); documentSessions.removeValue(forKey: chatKey + ":" + id); if chatSelectedChildren[chatKey] == id { chatSelectedChildren[chatKey] = "chat" }; saveDocumentTabs(); contentTabsChanged() }
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
        guard life.credential?.appAuthorized == true else { accountConnected = false; profilesVerified = false; for tab in browserTabs where tab.profileId != "default" { unload(tab.id, force: true) }; return }
        busy = true; defer { busy = false }
        do { let value = try await life.appRequest(collections: collections); guard expected == life.accountIdentity else { return }; snapshot = .object(snapshot.object.merging(value.object) { _, new in new }); accountConnected = true; if value.object["browserProfiles"] != nil { profilesVerified = true; saveBrowsers(); for tab in browserTabs where !profileAvailable(tab.profileId) { unload(tab.id, force: true) } }; error = nil }
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
    /// Match the shared address classifier: a bare word searches; host punctuation navigates.
    static func addressTarget(_ raw: String, engine: String = "Google", search: Bool = false) -> URL? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, value.utf8.count <= 4096, !value.contains("\\"), !["/", ".", "~"].contains(where: value.hasPrefix) else { return nil }
        let explicit = value.range(of: #"^https?://"#, options: [.regularExpression, .caseInsensitive]) != nil
        let scheme = value.range(of: #"^[a-z][a-z0-9+.-]*:"#, options: [.regularExpression, .caseInsensitive]) != nil
        if scheme && !explicit && value.range(of: #"^[^\s/?#:]+:\d+(?:[/?#]|$)"#, options: .regularExpression) == nil && !value.hasPrefix("[") { return nil }
        let address = explicit || !value.contains(where: \.isWhitespace) && (value.contains(".") || value.contains(":") || value.contains("/") || value.contains("?") || value.contains("#") || value.lowercased() == "localhost")
        if !search && address {
            guard let url = URLComponents(string: explicit ? value : "https://" + value), ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.host?.isEmpty == false, url.user == nil, url.password == nil, (url.port ?? 443) <= 65535, (url.port ?? 443) >= 0 else { return nil }
            return url.url
        }
        guard !scheme else { return nil }
        var query = URLComponents(string: engine == "Bing" ? "https://www.bing.com/search" : engine == "DuckDuckGo" ? "https://duckduckgo.com/" : "https://www.google.com/search")!
        query.queryItems = [URLQueryItem(name: "q", value: value)]; return query.url
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
    nonisolated static func historyURL(_ text: String) -> URL? {
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard input.utf8.count <= 4096, !input.unicodeScalars.contains(where: { CharacterSet.whitespacesAndNewlines.contains($0) || CharacterSet.controlCharacters.contains($0) }),
              let parts = URLComponents(string: input), ["http", "https"].contains(parts.scheme?.lowercased() ?? ""), let host = parts.host, !host.isEmpty, parts.user == nil, parts.password == nil,
              let url = parts.url, url.absoluteString.utf8.count <= 4096 else { return nil }
        return url
    }
    nonisolated static func retainedDescriptor(_ tab: BrowserDescriptor) -> BrowserDescriptor? {
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
    private func recordContentOpen(_ tab: BrowserDescriptor) {
        guard tab.scope != "main" else { return }
        let scope = syncScope(tab), parts = scope.split(separator: ":", maxSplits: 2).map(String.init)
        guard !applyingContent, !restoring, parts.count >= 2, UUID(uuidString: parts[1]) != nil else { return }
        contentHosts[scope] = parts[1]
        if contentSnapshots[scope] == nil { contentSnapshots[scope] = .object(["revision": .number(0), "tabs": .array([])]) }
        guard let descriptor = localContentTabs(scope).first(where: { $0["id"].string == (tab.contentTabId ?? tab.id) }) else { return }
        let operation: JSON = .object(["action": .string("open"), "explicitReopen": .bool(true), "observedClosedRevision": contentSnapshots[scope]?["closed"][descriptor["id"].string] ?? .number(0), "intentId": .string(UUID().uuidString.lowercased()), "tab": descriptor])
        contentPending[scope] = (contentPending[scope] ?? []) + [operation]; saveDocumentTabs()
        Task { await self.flushContentTabs(scope) }
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
        // Do not import the desktop main window into this device’s app tabs.
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
            recordContentClose(tab.contentTabId ?? tab.id, scope: syncScope(tab))
            browserTabs[index].history?.revision = 0
            browserTabs[index].scope = scope
            if selected(in: tab.scope) == id {
                if tab.scope == "main" { selectedMainBrowser = tabs(in: tab.scope).last?.id }
                else if tab.scope == "team" { selectedBrowser = tabs(in: tab.scope).last?.id }
                else { scopedSelection[tab.scope] = tabs(in: tab.scope).last?.id }
            }
            select(id, in: scope); if let moved = browserTabs.first(where: { $0.id == id }) { recordContentOpen(moved) }
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
    func select(_ id: String, in scope: String, activateMainBrowser: Bool = true) { guard browserTabs.contains(where: { $0.id == id && $0.scope == scope }) else { return }; if scope == "main" { selectedMainBrowser = id; if activateMainBrowser { mainBrowserSelectionRequest = MainBrowserSelectionRequest(tabID: id) } } else if scope == "team" { selectedBrowser = id; if let host = currentTeamOwner { scopedSelection["team:" + host] = id } } else { scopedSelection[scope] = id }; if !unloadedBrowsers.contains(id) { touch(id) }; saveBrowsers() }
    func touch(_ id: String) { scheduleBrowserPreview(id); browserTouched[id] = Date(); if let index = browserTabs.firstIndex(where: { $0.id == id }) { browserTabs[index].lastTouchedAt = ISO8601DateFormatter().string(from: Date()) }; pruneBrowsers() }
    func persistBrowser(_ id: String, enabled: Bool) { guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }; browserTabs[index].persist = enabled; if enabled { reload(id); _ = webView(browserTabs[index]) }; saveBrowsers() }
    func pruneBrowsers(now: Date = Date()) {
        let recent = Set(browserTouched.filter { item in browserTabs.first(where: { $0.id == item.key })?.persist != true }.sorted { $0.value > $1.value }.prefix(max(1, min(256, loadedTabLimit))).map(\.key))
        for id in Array(browserViews.keys) where browserTabs.first(where: { $0.id == id })?.persist != true && !recent.contains(id) && now.timeIntervalSince(browserTouched[id] ?? .distantPast) >= 3600 { unload(id) }
    }
    func takeBrowserInsertionOrigin(_ id: String) -> String? { insertionOrigins.removeValue(forKey: id) }
    @discardableResult func open(_ url: URL?, title: String = "New tab", scope: String = "team", profileId: String = "default", afterSourceID: String? = nil) -> String? {
        guard profileAvailable(profileId) else { error = "Sign in and refresh browser profiles before opening this profile."; return nil }
        var tab = BrowserDescriptor(id: UUID().uuidString, title: title, url: nil, scope: scope, profileId: profileId)
        let scopeParts = scope.split(separator: ":", maxSplits: 2).map(String.init)
        if scopeParts.count == 3, UUID(uuidString: scopeParts[1]) != nil { tab.ownerHostId = scopeParts[1] }
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
        saveDocumentTabs(); applyingContent = priorApplying; if !priorApplying { recordContentOpen(tab); contentTabsChanged() }
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
    private var historyCacheURL: URL { sharedCacheRoot.appendingPathComponent("browser-history.enc") }
    private func loadHistoryCache() {
        do { try cacheWriter.flush() } catch { self.error = error.localizedDescription }
        guard let key = sharedCacheKey(), let data = try? Data(contentsOf: historyCacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: "proteus-mobile-history-v1") else { return }
        historyOutbox = payload["outbox"].array
        let threshold = Self.historyCacheStart()
        historyCache = payload["cache"].object.mapValues { $0.array.filter { ProviderAllowance.date($0["visitedAt"].string).map { $0 >= threshold } == true } }
    }
    @discardableResult private func saveHistoryCache() -> NativeCacheWriteReceipt {
        let payload: JSON = .object(["outbox": .array(historyOutbox), "cache": .object(historyCache.mapValues(JSON.array))])
        return saveSharedCache(url: historyCacheURL, aad: "proteus-mobile-history-v1") { payload }
    }
    func assignBrowserOwner(_ id: String, host: String?) {
        guard let host, let index = browserTabs.firstIndex(where: { $0.id == id }), browserTabs[index].ownerHostId == nil else { return }
        browserTabs[index].ownerHostId = browserTabs[index].scope == "team" ? currentTeamOwner ?? host : contentHosts[browserTabs[index].scope] ?? host
        if let operation = browserOperations[id], operation["sourceHostId"].string.isEmpty {
            // No owner ever received this local navigation. Adopt its complete
            // final descriptor, rather than opening a blank tab while retaining
            // an in-memory navigation that can never be delivered to that scope.
            browserOperations[id] = nil
        }
        recordContentOpen(browserTabs[index])
    }
    private func queueHistoryVisit(_ tab: BrowserDescriptor, operation: JSON) {
        guard let host = contentHosts[tab.scope] ?? tab.ownerHostId, let url = Self.historyURL(operation["url"].string) else { return }
        let visit: JSON = .object(["eventId": operation["operationId"], "url": .string(url.absoluteString), "title": operation["title"], "visitedAt": operation["visitedAt"], "sourceHostId": .string(host), "profileId": .string(tab.profileId), "tabId": .string(tab.contentTabId ?? tab.id), "entryId": operation["entryId"], "deviceId": .string(Self.historyDeviceID()), "ownerHostId": .string(host)])
        historyOutbox.append(visit); saveHistoryCache()
        if let config = contentSync[syncScope(tab)] { Task { await flushHistory(config.remote) } }
    }
    func flushHistory(_ remote: RemoteStore) async {
        guard remote.connected, let host = remote.connection?.hostId, !historyFlushing.contains(host) else { return }
        let requestAccount = account
        historyFlushing.insert(host); defer { historyFlushing.remove(host) }
        do {
            while remote.connected, remote.connection?.hostId == host, account == requestAccount {
                let visits = Array(historyOutbox.filter { $0["ownerHostId"].string == host }.prefix(100))
                if visits.isEmpty { break }
                try await saveHistoryCache().value()
                try Task.checkCancellation()
                guard account == requestAccount, remote.connected, remote.connection?.hostId == host, visits.allSatisfy({ historyOutbox.contains($0) }) else { break }
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
                historyCache[key] = (response["items"].array + (historyCache[key] ?? [])).map { item in var fields = item.object; fields.removeValue(forKey: "favicon"); return JSON.object(fields) }.filter { item in
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
    /// Cheap check used while rendering; browserHistory(_:back:) builds the full URL list.
    func hasBrowserHistory(_ id: String, back: Bool) -> Bool {
        guard let history = Self.safeBrowserHistory(browserTabs.first(where: { $0.id == id })?.history) else { return false }
        return back ? history.index > 0 : history.index + 1 < history.entries.count
    }
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
        if queueBrowserOperation(browserTabs[index], action: "browser-traverse", entry: history.entries[item.index]) { browserTabs[index].history?.revision += 1 }
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
        // App-initiated traversals set historyNavigation first; this is a page-script
        // back/forward. It is a user traversal, never a mirrored load.
        guard historyNavigation[id] == nil else { return }
        nativeTraversals[id] = Date()
        guard let tab = browserTabs.first(where: { $0.id == id }), let history = tab.history,
              history.entries.indices.contains(history.index), history.entries[history.index].url != url.absoluteString else { return }
        let candidates = history.entries.indices.filter { history.entries[$0].url == url.absoluteString }
        if let selected = candidates.min(by: { abs($0 - history.index) < abs($1 - history.index) }) { historyNavigation[id] = selected; mirroredBrowserLoads.remove(id) }
    }
    private var nativeTraversals: [String: Date] = [:]
    /// Whether WebKit's swipe already moved this tab, so the backup swipe must not move it again.
    func nativeTraversal(_ id: String, since date: Date) -> Bool { (nativeTraversals[id] ?? .distantPast) >= date }
    /// Keep an image of the page being left, keyed by its saved history entry, so an edge
    /// swipe back or forward shows that page under the sliding one (Safari's page image).
    private func rememberLeavingPage(_ id: String, toward url: URL) {
        guard NativeDesignPreview.enabled, let view = browserViews[id], view.window != nil, view.bounds.width > 20, view.url?.absoluteString != url.absoluteString,
              let history = browserTabs.first(where: { $0.id == id })?.history, history.entries.indices.contains(history.index) else { return }
        let key = "page:" + history.entries[history.index].id
        let configuration = WKSnapshotConfiguration(); configuration.afterScreenUpdates = false; configuration.snapshotWidth = NSNumber(value: Double(view.bounds.width))
        view.takeSnapshot(with: configuration) { image, _ in if let image { Task { @MainActor in NativeScreenMemory.store(key, image) } } }
    }
    /// The remembered image of the adjacent saved page, if any.
    func adjacentPageImage(_ id: String, back: Bool) -> UIImage? {
        guard let history = browserTabs.first(where: { $0.id == id })?.history else { return nil }
        let index = history.index + (back ? -1 : 1)
        return history.entries.indices.contains(index) ? NativeScreenMemory.image("page:" + history.entries[index].id) : nil
    }
    private var serverRedirectedBrowsers = Set<String>()
    private var originalBrowserLoads: [String: String] = [:]
    func prepareBrowserLoad(_ url: URL, in id: String, userInitiated: Bool = false) {
        rememberLeavingPage(id, toward: url)
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
    @discardableResult private func queueBrowserOperation(_ tab: BrowserDescriptor, action: String, entry: BrowserHistoryEntry?) -> Bool {
        guard !applyingContent, let entry, Self.historyURL(entry.url) != nil else { return false }
        let scope = syncScope(tab)
        let operationID = UUID().uuidString
        var fields: [String: JSON] = ["visitedAt": .string(ISO8601DateFormatter().string(from: Date())), "eventId": .string(operationID), "profileId": .string(tab.profileId), "sourceHostId": .string(contentHosts[scope] ?? tab.ownerHostId ?? ""), "action": .string(action), "tabId": .string(tab.contentTabId ?? tab.id), "operationId": .string(operationID), "baseRevision": .number(Double(tab.history?.revision ?? 0)), "entryId": .string(entry.id), "url": .string(entry.url), "title": .string(entry.title)]
        if let requested = entry.requestedURL, Self.historyURL(requested) != nil { fields["requestedURL"] = .string(requested) }
        let operation: JSON = .object(fields)
        browserOperations[tab.id] = operation
        // The transport binding is transient (absent after restart/background).
        // Persist ordered navigation intent before a binding is available again.
        let queued = tab.scope != "main" && (contentSync[scope] != nil || contentHosts[scope] != nil || tab.ownerHostId != nil)
        if queued {
            contentPending[scope, default: []].append(operation); saveDocumentTabs()
            Task { await flushContentTabs(scope) }
        }
        if action != "browser-redirect" { queueHistoryVisit(tab, operation: operation) }
        return queued
    }
    func failBrowserNavigation(_ id: String, currentURL: URL?) {
        serverRedirectedBrowsers.remove(id); originalBrowserLoads.removeValue(forKey: id)
        pendingBrowserLoads.removeValue(forKey: id); historyNavigation.removeValue(forKey: id)
        // Engine failures and authentication overlays are local lifecycle states.
        // Keep the last accepted logical destination and all forward entries.
        // A failed mirrored load remains local until the user deliberately navigates.
        if explicitBrowserNavigations.remove(id) != nil, let index = browserTabs.firstIndex(where: { $0.id == id }), let history = browserTabs[index].history, history.entries.indices.contains(history.index) { let priorApplying = applyingContent; applyingContent = true; browserTabs[index].url = history.entries[history.index].url; applyingContent = priorApplying }
    }
    /// The first mirrored load may pass through device-specific login redirects.
    /// Once it settles, a later URL change is new page navigation, even without a tap.
    func settleMirroredBrowserLoad(_ id: String, url: URL) {
        if mirroredBrowserLoads.contains(id) { settledMirrorURLs[id] = url.absoluteString }
    }
    func completeBrowserNavigation(_ url: URL, title: String, in id: String, nativePosition: Int? = nil, sameDocumentObservation: Bool = false) {
        if applyingContent {
            // WebKit KVO can fire synchronously during an owner-driven load.
            // Re-observe the current page after adoption instead of appending an
            // entry whose owner operation is forbidden inside that transaction.
            Task { @MainActor [weak self] in
                guard let self, let view = self.browserViews[id], view.url == url else { return }
                self.completeBrowserNavigation(url, title: view.title ?? title, in: id, nativePosition: view.backForwardList.backList.count, sameDocumentObservation: sameDocumentObservation)
            }
            return
        }
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
        if let settled = settledMirrorURLs[id], settled != url.absoluteString {
            mirroredBrowserLoads.remove(id); settledMirrorURLs[id] = nil
        }
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
            if queueBrowserOperation(prior, action: traversed ? "browser-traverse" : "browser-navigate", entry: tab.history?.entries[tab.history?.index ?? 0]) { tab.history?.revision += 1 }
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
    nonisolated static func safeBrowserHistory(_ value: BrowserTabHistory?) -> BrowserTabHistory? {
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
    func renameBrowser(_ id: String, title: String) { guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }; var tab = browserTabs[index]; tab.title = String(title.prefix(200)); tab.customTitle = tab.title; browserTabs[index] = tab }
    func close(_ id: String) { if let tab = browserTabs.first(where: { $0.id == id }) { let scope = tab.scope == "team" ? "team:" + (tab.ownerHostId ?? currentTeamOwner ?? "") : tab.scope == "main" ? "main:" + (tab.ownerHostId ?? "") : tab.scope; recordContentClose(tab.contentTabId ?? tab.id, scope: scope); NativeThumbnailCache.remove(thumbnailKey(tab)) }; let scope = browserTabs.first(where: { $0.id == id })?.scope ?? "team"; unload(id, force: true); unloadedBrowsers.remove(id); browserTouched.removeValue(forKey: id); browserTabs.removeAll { $0.id == id }; browserPreviews[id] = nil; browserFavicons[id] = nil; faviconAttempts[id] = nil; if selected(in: scope) == id { if scope == "main" { selectedMainBrowser = tabs(in: scope).last?.id } else if scope == "team" { selectedBrowser = tabs(in: scope).last?.id } else { scopedSelection[scope] = tabs(in: scope).last?.id } } }
    func unload(_ id: String, force: Bool = false) {
        guard force || browserTabs.first(where: { $0.id == id })?.persist != true else { error = "Turn off Persist before unloading this tab."; return }
        historyNavigation.removeValue(forKey: id)
        mirroredBrowserLoads.remove(id)
        settledMirrorURLs.removeValue(forKey: id)
        pendingBrowserLoads.removeValue(forKey: id); nativeHistoryPosition.removeValue(forKey: id)
        browserObservations.removeValue(forKey: id)?.forEach { $0.invalidate() }
        browserNavigation.removeValue(forKey: id)
        if let view = browserViews.removeValue(forKey: id) { view.navigationDelegate = nil; view.uiDelegate = nil; view.stopLoading() }
        unloadedBrowsers.insert(id)
    }
    func reload(_ id: String) { unloadedBrowsers.remove(id) }
    func unloadBrowsers() { for id in Array(browserViews.keys) { unload(id, force: true) } }
    /// DEBUG simulator fixtures load their local pages in project tabs instead of the design-preview placeholder.
    static var fixtureLocalBrowsing: Bool {
        #if DEBUG && targetEnvironment(simulator)
        return ProcessInfo.processInfo.arguments.contains("--fixture-local-browsing")
        #else
        return false
        #endif
    }
    func isBrowserLoaded(_ id: String) -> Bool { browserViews[id] != nil }
    func isCurrentBrowserView(_ view: WKWebView, id: String) -> Bool { browserViews[id] === view }
    func webView(_ tab: BrowserDescriptor, allowLocalNavigation: Bool = false) -> WKWebView {
        if let view = browserViews[tab.id] { return view }
        let configuration = WKWebViewConfiguration()
        if !allowLocalNavigation, !Self.fixtureLocalBrowsing, let address = tab.url, let url = URL(string: address), ["localhost", "127.0.0.1", "::1"].contains(url.host ?? ""), contentSync[tab.scope]?.remote.state["capabilities"].array.contains(.string("chat.previews.v1")) == true {
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
        // Safari-like media policy. Without inline playback, iPhone WebKit plays any
        // autoplaying video fullscreen, so page ads took over the screen. Sound needs a
        // tap; "Block video autoplay" requires a tap for all media; windows need a tap.
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .audio
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        let view = NativeLinkWebView(frame: .zero, configuration: configuration)
        installVideoPolicy(view)
        // Proteus owns the full content-relative edge gesture. Native gesture
        // recognition has different thresholds and must not race that handler.
        // goBrowserHistory still reuses matching native page instances via go(to:).
        view.allowsBackForwardNavigationGestures = false; view.isFindInteractionEnabled = true
        browserViews[tab.id] = view
        browserObservations[tab.id] = [observeBrowser(view, id: tab.id, keyPath: \.canGoBack), observeBrowser(view, id: tab.id, keyPath: \.canGoForward), observeBrowser(view, id: tab.id, keyPath: \.isLoading), observeBrowser(view, id: tab.id, keyPath: \.url), observeBrowser(view, id: tab.id, keyPath: \.title)]
        if let text = tab.url, let url = URL(string: text) { mirroredBrowserLoads.insert(tab.id); settledMirrorURLs[tab.id] = nil; pendingBrowserLoads[tab.id] = url.absoluteString; applyPageScale(tab.id, url: url); view.load(URLRequest(url: url)) }
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

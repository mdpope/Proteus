import Foundation
import SwiftUI
import UIKit
import WebKit
import CryptoKit
import Security
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

/// Account-scoped app data uses its own explicit OAuth consent, never a Mac's credentials.
@MainActor final class SharedAppStore: ObservableObject {
    @Published var snapshot: JSON = .null
    @Published var error: String?
    @Published var busy = false
    @Published var browserTabs: [BrowserDescriptor] = [] { didSet { saveBrowsers(); contentTabsChanged() } }
    @Published var selectedBrowser: String?
    @Published var selectedMainBrowser: String?
    @Published var scopedSelection: [String: String] = [:]
    @Published private(set) var documentTabs: [NativeDocumentDescriptor] = []
    @Published private(set) var chatSelectedChildren: [String: String] = [:]
    @Published private(set) var chatChildOrder: [String: [String]] = [:]
    @Published var draftAttachments: [String: [NativeDraftAttachment]] = [:]
    var chatScrollLocations: [String: NativeChatScrollLocation] = [:]
    var documentScrollOffsets: [String: CGFloat] = [:]
    var draftMessageIDs: [String: String] = [:]
    var draftSessionIDs: [String: String] = [:]
    private var documentContents: [String: String] = [:]
    private var documentSessions: [String: NativeDocumentSession] = [:]
    @Published var standupOrders: [String: [JSON]] = [:]
    @Published var standupCompleted: [String: Set<String>] = [:]
    @Published var unloadedBrowsers = Set<String>()
    @Published private(set) var browserNavigation: [String: BrowserNavigationState] = [:]
    @Published var linkChatDraft: BrowserChatDraft?
    @Published var exportFile: BrowserExportFile?
    @Published var downloadError: String?
    @Published var downloads: [UUID: NativeLinkDownload] = [:]
    private var contentSync: [String: (remote: RemoteStore, kind: String, id: String, host: String)] = [:]
    private var contentHosts: [String: String] = [:]
    private var contentSnapshots: [String: JSON] = [:]
    private var contentPending: [String: [JSON]] = [:]
    private var contentBusy = Set<String>()
    private var applyingContent = false
    private var account = ""
    private var restoring = false
    private var browserViews: [String: WKWebView] = [:]
    private var browserObservations: [String: [NSKeyValueObservation]] = [:]
    private var browserTouched: [String: Date] = [:]
    init() { loadDocumentTabs() }
    private func localContentTabs(_ scope: String) -> [JSON] {
        let browsers = tabs(in: scope).compactMap { tab -> JSON? in
            guard tab.url == nil || Self.safeURL(tab.url ?? "") != nil else { return nil }
            var value: [String: JSON] = ["id": .string(tab.contentTabId ?? tab.id), "type": .string("browser"), "title": .string(tab.customTitle ?? tab.title), "url": .string(tab.url ?? "")]
            if let customTitle = tab.customTitle { value["customTitle"] = .string(customTitle) }; if let history = Self.safeBrowserHistory(tab.history), let data = try? JSONEncoder().encode(history), let json = try? JSONDecoder().decode(JSON.self, from: data) { value["history"] = json }; return .object(value)
        }
        let docs = documents(in: scope).map { tab -> JSON in var value: [String: JSON] = ["id": .string("document:" + tab.id), "type": .string("document"), "documentId": .string(tab.id), "title": .string(tab.title), "mediaType": .string(tab.mediaType)]; if let customTitle = tab.customTitle { value["customTitle"] = .string(customTitle) }; return .object(value) }
        let all = browsers + docs, order = scope == "team" ? [] : (chatChildOrder[scope] ?? [])
        return order.compactMap { id in all.first { tab in tab["id"].string == id || tab["documentId"].string == id || tabs(in: scope).contains(where: { $0.id == id && ($0.contentTabId ?? $0.id) == tab["id"].string }) } } + all.filter { tab in !order.contains(tab["id"].string) && !order.contains(tab["documentId"].string) && !tabs(in: scope).contains(where: { browser in order.contains(browser.id) && (browser.contentTabId ?? browser.id) == tab["id"].string }) }
    }
    private func contentTabsChanged() {
        guard !applyingContent, !restoring else { return }
        for (scope, snapshot) in contentSnapshots {
            guard contentSync[scope] != nil else { continue }
            let prior = snapshot["tabs"].array, current = localContentTabs(scope)
            var operations: [JSON] = []
            for tab in prior where !current.contains(where: { $0["id"] == tab["id"] }) { operations.append(.object(["action": .string("close"), "id": tab["id"]])) }
            for tab in current where !prior.contains(tab) { operations.append(.object(["action": .string("open"), "tab": tab])) }
            if current.map({ $0["id"] }) != prior.map({ $0["id"] }) { operations.append(.object(["action": .string("reorder"), "ids": .array(current.map { $0["id"] })])) }
            guard !operations.isEmpty else { continue }
            contentPending[scope] = operations; saveDocumentTabs()
            Task { await flushContentTabs(scope) }
        }
    }
    private func applyContentTabs(_ response: JSON, scope: String) {
        if contentSnapshots[scope] == response && localContentTabs(scope) == response["tabs"].array { return }
        guard response["revision"].int >= (contentSnapshots[scope]?["revision"].int ?? -1) else { return }
        applyingContent = true; defer { applyingContent = false }
        let incoming = response["tabs"].array
        let ids = Set(incoming.filter { $0["type"].string == "browser" }.map { $0["id"].string })
        let existingBrowsers = tabs(in: scope)
        let privateLocal = existingBrowsers.filter { $0.url != nil && Self.safeURL($0.url ?? "") == nil }
        for old in existingBrowsers where !privateLocal.contains(old) && !ids.contains(old.contentTabId ?? old.id) { unload(old.id); unloadedBrowsers.remove(old.id) }
        for tab in incoming where tab["type"].string == "browser" {
            if let existing = existingBrowsers.first(where: { ($0.contentTabId ?? $0.id) == tab["id"].string }), existing.url ?? "" != tab["url"].string, let url = Self.safeURL(tab["url"].string) { browserViews[existing.id]?.load(URLRequest(url: url)) }
        }
        browserTabs.removeAll { $0.scope == scope && !privateLocal.contains($0) }
        for tab in incoming where tab["type"].string == "browser" {
            let existing = existingBrowsers.first { ($0.contentTabId ?? $0.id) == tab["id"].string }
            let localID = existing?.id ?? ("sync:" + SHA256.hash(data: Data((scope + "\0" + tab["id"].string).utf8)).map { String(format: "%02x", $0) }.joined())
            let descriptor = BrowserDescriptor(id: localID, title: tab["title"].string, url: tab["url"].string.isEmpty ? nil : tab["url"].string, scope: scope, customTitle: tab["customTitle"].string.isEmpty ? nil : tab["customTitle"].string, contentTabId: tab["id"].string, history: Self.decodeBrowserHistory(tab["history"]) ?? existing?.history)
            browserTabs.append(descriptor)
            if descriptor.url != nil && !isBrowserLoaded(descriptor.id) { unloadedBrowsers.insert(descriptor.id) }
        }
        let docIDs = Set(incoming.filter { $0["type"].string == "document" }.map { $0["documentId"].string })
        for old in documents(in: scope) where !docIDs.contains(old.id) { documentContents.removeValue(forKey: scope + ":" + old.id); documentSessions.removeValue(forKey: scope + ":" + old.id) }
        documentTabs.removeAll { $0.chatKey == scope }
        for tab in incoming where tab["type"].string == "document" { documentTabs.append(NativeDocumentDescriptor(id: tab["documentId"].string, chatKey: scope, title: tab["title"].string, mediaType: tab["mediaType"].string, customTitle: tab["customTitle"].string.isEmpty ? nil : tab["customTitle"].string)) }
        chatChildOrder[scope] = incoming.map { tab in tab["type"].string == "document" ? tab["documentId"].string : (tabs(in: scope).first { ($0.contentTabId ?? $0.id) == tab["id"].string }?.id ?? tab["id"].string) }
        contentSnapshots[scope] = response
        saveDocumentTabs(); saveBrowsers()
    }
    private func revokeDocumentTabs(_ host: String) {
        let affected = Set(contentHosts.filter { $0.value == host }.map(\.key) + documentTabs.filter { $0.chatKey.hasPrefix("chat:" + host + ":") }.map(\.chatKey))
        applyingContent = true; defer { applyingContent = false }
        for scope in affected {
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
        let affected = Set(contentHosts.filter { $0.value == host }.map(\.key) + browserTabs.filter { $0.scope.hasPrefix("chat:" + host + ":") }.map(\.scope) + documentTabs.filter { $0.chatKey.hasPrefix("chat:" + host + ":") }.map(\.chatKey))
        applyingContent = true; defer { applyingContent = false }
        for scope in affected {
            for tab in tabs(in: scope) { unload(tab.id); unloadedBrowsers.remove(tab.id) }
            browserTabs.removeAll { $0.scope == scope }
            for doc in documents(in: scope) { documentContents.removeValue(forKey: scope + ":" + doc.id); documentSessions.removeValue(forKey: scope + ":" + doc.id) }
            documentTabs.removeAll { $0.chatKey == scope }; contentSync[scope] = nil; contentSnapshots[scope] = nil; contentPending[scope] = nil; contentHosts[scope] = nil
            chatSelectedChildren[scope] = "chat"; chatChildOrder[scope] = []
        }
        saveDocumentTabs(); saveBrowsers()
    }
    func refreshContentTabs(scope: String, remote: RemoteStore, kind: String, id: String) async {
        if remote.status.lowercased().contains("revoked"), let host = remote.connection?.hostId { revokeContentHost(host); return }
        guard remote.connected, remote.state["capabilities"].array.contains(.string("content-tabs.v1")), let host = remote.connection?.hostId else { return }
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
            if contentPending[scope] == nil { applyContentTabs(response, scope: scope) }
        } catch { /* Offline clients retain bounded descriptors; reads grant no content access. */ }
    }
    private func flushContentTabs(_ scope: String) async {
        guard !contentBusy.contains(scope), let config = contentSync[scope], config.remote.connected, let operations = contentPending.removeValue(forKey: scope), let snapshot = contentSnapshots[scope] else { return }
        contentBusy.insert(scope); defer { contentBusy.remove(scope) }
        do {
            var response: JSON
            do { response = try await config.remote.request("tabs.mutate", ["scope": .string(config.kind), "id": .string(config.id), "expectedRevision": snapshot["revision"], "operations": .array(operations)]) }
            catch {
                guard error.localizedDescription.contains("Content tabs changed") else { throw error }
                let fresh = try await config.remote.request("tabs.get", ["scope": .string(config.kind), "id": .string(config.id)])
                var retry = operations.filter { $0["action"].string != "reorder" }
                var ids = fresh["tabs"].array.map { $0["id"] }
                for operation in retry { if operation["action"].string == "close" { ids.removeAll { $0 == operation["id"] } }; if operation["action"].string == "open" && !ids.contains(operation["tab"]["id"]) { ids.append(operation["tab"]["id"]) } }
                if let reorder = operations.last(where: { $0["action"].string == "reorder" }) { let requested = reorder["ids"].array.filter { ids.contains($0) }; retry.append(.object(["action": .string("reorder"), "ids": .array(requested + ids.filter { !requested.contains($0) })])) }
                response = try await config.remote.request("tabs.mutate", ["scope": .string(config.kind), "id": .string(config.id), "expectedRevision": fresh["revision"], "operations": .array(retry)])
            }
            guard config.remote.connection?.hostId == config.host, config.remote.connected, contentHosts[scope] == config.host else { return }
            if contentPending[scope] == nil { applyContentTabs(response, scope: scope) } else { contentSnapshots[scope] = response }
        } catch {
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
        saveBrowsers(); for download in Array(downloads.values) { download.cancel() }; exportFile?.cleanup(); exportFile = nil; linkChatDraft = nil; restoring = true; contentSync = [:]; account = identity; snapshot = .null; error = nil; unloadBrowsers(); browserTabs = []; unloadedBrowsers = []; selectedBrowser = nil; selectedMainBrowser = nil; scopedSelection = [:]; browserTouched = [:]; standupOrders = [:]; standupCompleted = [:]; documentContents = [:]; documentSessions = [:]; draftAttachments = [:]; chatScrollLocations = [:]; draftMessageIDs = [:]; draftSessionIDs = [:]
        if let cacheURL, let key = BrowserCacheKeychain.key(), let data = try? Data(contentsOf: cacheURL), let payload = try? RemoteCrypto.open(String(decoding: data, as: UTF8.self), key: key, aad: account), let decoded = try? JSONDecoder().decode([BrowserDescriptor].self, from: JSONEncoder().encode(payload["tabs"] == .null ? payload : payload["tabs"])) {
            browserTabs = decoded.compactMap(Self.retainedDescriptor)
            let savedSelections = payload["selections"].object
            selectedBrowser = (savedSelections["team"]?.string ?? "").isEmpty ? tabs(in: "team").last?.id : savedSelections["team"]?.string
            selectedMainBrowser = (savedSelections["main"]?.string ?? "").isEmpty ? tabs(in: "main").last?.id : savedSelections["main"]?.string
            for tab in browserTabs where tab.scope != "team" && tab.scope != "main" { if scopedSelection[tab.scope] == nil { let saved = savedSelections[tab.scope]?.string ?? ""; scopedSelection[tab.scope] = saved.isEmpty ? tab.id : saved } }
            unloadedBrowsers = Set(browserTabs.filter { $0.url != nil }.map(\.id))
        }
        restoring = false
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
            let payload: JSON = .object(["tabs": tabs, "selections": .object(selections)])
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
        contentSnapshots = payload["contentSnapshots"].object; contentPending = payload["contentPending"].object.mapValues { $0.array }; contentHosts = payload["contentHosts"].object.mapValues { $0.string }
        chatSelectedChildren = payload["selected"].object.compactMapValues { value in value.string.isEmpty ? nil : value.string }
        chatChildOrder = payload["order"].object.mapValues { $0.array.map(\.string).filter { !$0.isEmpty } }
    }
    private func saveDocumentTabs() {
        guard let key = BrowserCacheKeychain.key(), let tabs = try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(documentTabs.suffix(100))) else { return }
        let payload: JSON = .object(["contentSnapshots": .object(contentSnapshots), "contentPending": .object(contentPending.mapValues(JSON.array)), "contentHosts": .object(contentHosts.mapValues(JSON.string)), "tabs": tabs, "selected": .object(chatSelectedChildren.mapValues(JSON.string)), "order": .object(chatChildOrder.mapValues { .array($0.map(JSON.string)) })])
        do { let sealed = try RemoteCrypto.seal(payload, key: key, aad: "proteus-mobile-document-tabs-v1"); try FileManager.default.createDirectory(at: documentCacheURL.deletingLastPathComponent(), withIntermediateDirectories: true); try Data(sealed.utf8).write(to: documentCacheURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) } catch { /* Read-only tab metadata cannot affect the paired host. */ }
    }
    func documents(in chatKey: String) -> [NativeDocumentDescriptor] { documentTabs.filter { $0.chatKey == chatKey } }
    func orderedChatChildren(in chatKey: String, documentIDs: [String]) -> [String] {
        let available = tabs(in: chatKey).map(\.id) + documentIDs
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
    func rememberDocumentSession(_ session: NativeDocumentSession, for documentID: String, in chatKey: String) { documentSessions[chatKey + ":" + documentID] = session }
    func rememberDocument(_ tab: NativeDocumentDescriptor, content: String) { if let index = documentTabs.firstIndex(where: { $0.id == tab.id && $0.chatKey == tab.chatKey }) { documentTabs[index] = tab } else { documentTabs.append(tab) }; documentContents[tab.chatKey + ":" + tab.id] = content; chatSelectedChildren[tab.chatKey] = tab.id; saveDocumentTabs(); contentTabsChanged() }
    func renameDocument(_ id: String, title: String, in chatKey: String) { guard let index = documentTabs.firstIndex(where: { $0.id == id && $0.chatKey == chatKey }) else { return }; let tab = documentTabs[index]; documentTabs[index] = NativeDocumentDescriptor(id: tab.id, chatKey: tab.chatKey, title: String(title.prefix(200)), mediaType: tab.mediaType, parentID: tab.parentID, relativePath: tab.relativePath, customTitle: String(title.prefix(200))); saveDocumentTabs(); contentTabsChanged() }
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
    func refresh(_ life: LifeStore) async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-address-recents") {
            snapshot = .object(["history": .array((0..<25).map { number in .object(["id": .string("v\(number)"), "title": .string("Visited \(number)"), "url": .string("http://127.0.0.1:4329/browser/one#visit=\(number)"), "visitedAt": .string(String(format: "2026-10-07T00:%02d:00Z", number)), "deviceName": .string("Fixture iPad")]) })]); return
        }
        if ProcessInfo.processInfo.arguments.contains("--synthetic-team-lists") {
            snapshot = .object(["teamLists": .array([
                .object(["id": .string("first"), "revision": .string("alpha-v1"), "name": .string("Alpha configuration"), "timezone": .string("UTC"), "members": .array([.object(["id": .string("alpha-member"), "name": .string("Alice"), "mode": .string("fixed")])]), "links": .array([.object(["id": .string("alpha-link"), "title": .string("Alpha link"), "url": .string("https://example.test/alpha")])])]),
                .object(["id": .string("second"), "revision": .string("beta-v1"), "name": .string("Beta configuration"), "timezone": .string("UTC"), "members": .array([.object(["id": .string("beta-member"), "name": .string("Bob"), "mode": .string("random")])]), "links": .array([.object(["id": .string("beta-link"), "title": .string("Beta link"), "url": .string("https://example.test/beta")])])])])]); return
        }
        #endif
        reset(for: life.accountIdentity); let expected = life.accountIdentity
        guard life.credential?.appAuthorized == true else { return }
        busy = true; defer { busy = false }
        do { let value = try await life.appRequest(); guard expected == life.accountIdentity else { return }; snapshot = value; error = nil }
        catch { self.error = life.display(error) }
    }
    @discardableResult func mutate(_ life: LifeStore, path: String, method: String = "POST", body: JSON) async -> JSON? {
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
        return BrowserDescriptor(id: tab.id, title: tab.title, url: url.absoluteString, scope: tab.scope, customTitle: tab.customTitle, contentTabId: tab.contentTabId, history: safeBrowserHistory(tab.history))
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
    func tabs(in scope: String) -> [BrowserDescriptor] { browserTabs.filter { $0.scope == scope } }
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
    func selected(in scope: String) -> String? { scope == "main" ? selectedMainBrowser : scope == "team" ? selectedBrowser : scopedSelection[scope] }
    func selectChatChild(_ id: String, in scope: String) { guard scope.hasPrefix("chat:") && (id == "chat" || tabs(in: scope).contains(where: { $0.id == id })) else { return }; scopedSelection[scope] = id; saveBrowsers() }
    func select(_ id: String, in scope: String) { guard browserTabs.contains(where: { $0.id == id && $0.scope == scope }) else { return }; if scope == "main" { selectedMainBrowser = id } else if scope == "team" { selectedBrowser = id } else { scopedSelection[scope] = id }; reload(id); touch(id); saveBrowsers() }
    func touch(_ id: String) { browserTouched[id] = Date(); pruneBrowsers() }
    func pruneBrowsers(now: Date = Date()) {
        let recent = Set(browserTouched.sorted { $0.value > $1.value }.prefix(6).map(\.key))
        for id in Array(browserViews.keys) where !recent.contains(id) && now.timeIntervalSince(browserTouched[id] ?? .distantPast) >= 3600 { unload(id) }
    }
    func open(_ url: URL?, title: String = "New tab", scope: String = "team") {
        let tab = BrowserDescriptor(id: UUID().uuidString, title: title, url: url?.absoluteString, scope: scope)
        browserTabs.append(tab); select(tab.id, in: scope)
    }
    @discardableResult func navigate(_ url: URL, in id: String) -> Bool {
        guard ["http", "https"].contains(url.scheme), url.host != nil, url.user == nil, url.password == nil,
              let index = browserTabs.firstIndex(where: { $0.id == id }) else { return false }
        browserTabs[index].url = url.absoluteString
        browserTabs[index].title = browserTabs[index].customTitle ?? url.host ?? "Browser"
        unloadedBrowsers.remove(id)
        touch(id)
        browserViews[id]?.load(URLRequest(url: url))
        return true
    }
    func goBack(_ id: String) { if let item = browserHistory(id, back: true).first { goBrowserHistory(item, in: id) } }
    func goForward(_ id: String) { if let item = browserHistory(id, back: false).first { goBrowserHistory(item, in: id) } }
    func browserHistory(_ id: String, back: Bool) -> [BrowserHistoryItem] {
        guard let history = Self.safeBrowserHistory(browserTabs.first(where: { $0.id == id })?.history) else { return [] }
        let indices = back ? Array((0..<history.index).reversed()) : Array((history.index + 1)..<history.entries.count)
        return indices.map { BrowserHistoryItem(index: $0, url: URL(string: history.entries[$0].url)!, title: history.entries[$0].title) }
    }
    func goBrowserHistory(_ item: BrowserHistoryItem, in id: String) {
        guard let index = browserTabs.firstIndex(where: { $0.id == id }), let history = browserTabs[index].history,
              history.entries.indices.contains(item.index), history.entries[item.index].url == item.url.absoluteString else { return }
        browserTabs[index].history?.index = item.index
        browserTabs[index].url = item.url.absoluteString
        if let view = browserViews[id] {
            let native = item.index < history.index ? view.backForwardList.backList.reversed().first(where: { $0.url == item.url }) : view.backForwardList.forwardList.first(where: { $0.url == item.url })
            if let native { view.go(to: native) } else { view.load(URLRequest(url: item.url)) }
        } else { reload(id) }
    }
    static func decodeBrowserHistory(_ json: JSON) -> BrowserTabHistory? {
        guard let data = try? JSONEncoder().encode(json), let value = try? JSONDecoder().decode(BrowserTabHistory.self, from: data) else { return nil }
        return safeBrowserHistory(value)
    }
    static func safeBrowserHistory(_ value: BrowserTabHistory?) -> BrowserTabHistory? {
        guard let value, value.entries.indices.contains(value.index), safeURL(value.entries[value.index].url) != nil else { return nil }
        var entries: [BrowserHistoryEntry] = []; var selected = 0
        let start = max(0, min(value.index - 25, value.entries.count - 50))
        for i in start..<min(value.entries.count, start + 50) {
            guard let url = safeURL(value.entries[i].url) else { continue }
            if i == value.index { selected = entries.count }
            entries.append(BrowserHistoryEntry(url: url.absoluteString, title: String(value.entries[i].title.prefix(200))))
        }
        var result = BrowserTabHistory(entries: entries, index: selected)
        while (try? JSONEncoder().encode(result).count) ?? 0 > 32768 && result.entries.count > 1 {
            if result.index >= result.entries.count - 1 - result.index { result.entries.removeFirst(); result.index -= 1 } else { result.entries.removeLast() }
        }
        return result
    }
    func refreshBrowser(_ id: String) { if let view = browserViews[id] { view.reload() } else { reload(id) } }
    func stopBrowser(_ id: String) { browserViews[id]?.stopLoading() }
    func renameBrowser(_ id: String, title: String) { guard let index = browserTabs.firstIndex(where: { $0.id == id }) else { return }; browserTabs[index].title = String(title.prefix(200)); browserTabs[index].customTitle = String(title.prefix(200)) }
    func close(_ id: String) { let scope = browserTabs.first(where: { $0.id == id })?.scope ?? "team"; unload(id); unloadedBrowsers.remove(id); browserTouched.removeValue(forKey: id); browserTabs.removeAll { $0.id == id }; if selected(in: scope) == id { if scope == "main" { selectedMainBrowser = tabs(in: scope).last?.id } else if scope == "team" { selectedBrowser = tabs(in: scope).last?.id } else { scopedSelection[scope] = tabs(in: scope).last?.id } } }
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
        touch(tab.id)
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
                let state = BrowserNavigationState(url: view.url?.absoluteString ?? "", title: view.title ?? "", canGoBack: self.browserTabs[index].history.map { $0.index > 0 } ?? view.canGoBack, canGoForward: self.browserTabs[index].history.map { $0.index + 1 < $0.entries.count } ?? view.canGoForward, isLoading: view.isLoading)
                if self.browserNavigation[id] != state { self.browserNavigation[id] = state }
                var tab = self.browserTabs[index]
                if !state.url.isEmpty && state.url != "about:blank" { tab.url = state.url }
                if !state.title.isEmpty { tab.title = tab.customTitle ?? state.title }
                if !view.isLoading, let url = tab.url, Self.safeURL(url) != nil {
                    var history = tab.history ?? BrowserTabHistory(entries: [], index: 0)
                    if !history.entries.indices.contains(history.index) || history.entries[history.index].url != url {
                        history.entries = Array(history.entries.prefix(history.index + 1)); history.entries.append(BrowserHistoryEntry(url: url, title: tab.title)); history.index = history.entries.count - 1
                    } else { history.entries[history.index].title = tab.title }
                    tab.history = Self.safeBrowserHistory(history)
                }
                if tab != self.browserTabs[index] { self.browserTabs[index] = tab }
                if let history = tab.history { var navigation = state; navigation.canGoBack = history.index > 0; navigation.canGoForward = history.index + 1 < history.entries.count; self.browserNavigation[id] = navigation }
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
struct BrowserHistoryEntry: Codable, Equatable { var url: String; var title: String }
struct BrowserTabHistory: Codable, Equatable { var entries: [BrowserHistoryEntry]; var index: Int }
struct BrowserHistoryItem: Hashable { var index: Int; var url: URL; var title: String? }
struct BrowserDescriptor: Identifiable, Codable, Equatable {
    var id: String; var title: String; var url: String?; var scope: String; var customTitle: String?; var contentTabId: String?; var history: BrowserTabHistory?
    init(id: String, title: String, url: String?, scope: String = "team", customTitle: String? = nil, contentTabId: String? = nil, history: BrowserTabHistory? = nil) { self.history = history; self.id = id; self.title = title; self.url = url; self.scope = scope; self.customTitle = customTitle; self.contentTabId = contentTabId }
    enum CodingKeys: String, CodingKey { case id, title, url, scope, customTitle, contentTabId, history }
    init(from decoder: Decoder) throws { let values = try decoder.container(keyedBy: CodingKeys.self); id = try values.decode(String.self, forKey: .id); title = try values.decode(String.self, forKey: .title); url = try values.decodeIfPresent(String.self, forKey: .url); scope = try values.decodeIfPresent(String.self, forKey: .scope) ?? "team"; customTitle = try values.decodeIfPresent(String.self, forKey: .customTitle); contentTabId = try values.decodeIfPresent(String.self, forKey: .contentTabId); history = try values.decodeIfPresent(BrowserTabHistory.self, forKey: .history) }
}
struct NativeDocumentDescriptor: Identifiable, Codable, Equatable {
    let id: String
    let chatKey: String
    let title: String
    let mediaType: String
    var parentID: String? = nil
    var relativePath: String? = nil
    var customTitle: String? = nil
    enum CodingKeys: String, CodingKey { case id, chatKey, title, mediaType, parentID, relativePath, customTitle }
}
struct NativeDocumentSession {
    let requestID: String
    let version: String
    let readAt: String
    let assets: [JSON]
    let links: [JSON]
    let assetDataURLs: [String: String]
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

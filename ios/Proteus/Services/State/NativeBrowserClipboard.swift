import UIKit
import UniformTypeIdentifiers

/// App-owned private copy actions never enter Universal Clipboard. The marker
/// contains no tab identity or page data; it lets the next launch clear a copy
/// left behind by an interrupted process without reading unrelated clipboard data.
@MainActor final class NativeBrowserClipboard {
    static let shared = NativeBrowserClipboard()
    private static let marker = "org.proteusapp.proteus.incognito-copy"
    private let pasteboard: UIPasteboard
    private var changes: [String: Int] = [:]

    init(pasteboard: UIPasteboard = .general) {
        self.pasteboard = pasteboard
        if pasteboard.types.contains(Self.marker) { pasteboard.items = [] }
    }

    func copy(_ text: String, tabID: String, incognito: Bool) {
        if incognito {
            pasteboard.setItems([[UTType.utf8PlainText.identifier: text, Self.marker: Data([1])]],
                options: [.localOnly: true, .expirationDate: Date().addingTimeInterval(120)])
            changes[tabID] = pasteboard.changeCount
        } else { pasteboard.string = text }
    }

    func close(_ tabID: String) {
        guard let change = changes.removeValue(forKey: tabID), change == pasteboard.changeCount,
              pasteboard.types.contains(Self.marker) else { return }
        pasteboard.items = []
    }
}

extension SharedAppStore {
    func copyBrowserText(_ text: String, id: String) {
        guard let tab = browserTabs.first(where: { $0.id == id }) else { return }
        browserClipboard.copy(text, tabID: id, incognito: tab.incognito)
    }
}

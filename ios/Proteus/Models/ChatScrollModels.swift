import Foundation

struct NativeChatScrollLocation: Codable {
    var anchor: Int?
    var inset: CGFloat
    var offset: CGFloat
    var eventStart: Int? = nil
    var presentationStart: Int? = nil
    var contentHeight: CGFloat = 0
    var anchorHeight: CGFloat = 0
    var viewportWidth: CGFloat = 0
    var eventRevision: String = ""
    var valid: Bool {
        [inset, offset, contentHeight, anchorHeight, viewportWidth].allSatisfy { $0.isFinite && abs($0) <= 100_000_000 } && ((anchor ?? 0) >= 0) && offset >= 0 && contentHeight >= 0 && anchorHeight >= 0 && viewportWidth >= 0
    }
    func restoresAbsoluteOffset(loadedStart: Int, presentedStart: Int, revision: String, width: CGFloat, changedWindow: Bool) -> Bool {
        !changedWindow && eventStart == loadedStart && presentationStart == presentedStart && eventRevision == revision && viewportWidth > 0 && abs(viewportWidth - width) < 2
    }
}
struct MainBrowserSelectionRequest: Equatable {
    let token = UUID()
    let tabID: String
}


import Foundation

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


import UIKit

/// High-frequency measurements are reference state: recording a scroll offset must
/// not invalidate the whole conversation view. Layout/selection keep their own state.
@MainActor final class NativeChatScrollMeasurements {
    let viewport = NativeScrollViewport()
    var offset: CGFloat = 0
    var contentHeight: CGFloat = 0
    var visibleAnchor: NativeChatScrollLocation?
    var latest: NativeScrollSnapshot?
    var historyRevealPending = false
    #if DEBUG
    weak var offsetLabel: UILabel?
    weak var anchorLabel: UILabel?
    func updateDiagnostics() {
        offsetLabel?.text = String(Int(offset))
        anchorLabel?.text = "\(visibleAnchor?.anchor ?? -1):\(Int(visibleAnchor?.inset ?? 0))"
    }
    #endif
    var eventFrames: [Int: NativeChatEventFrame] = [:]
}

struct NativeChatReadingRecord: Codable {
    let location: NativeChatScrollLocation
    let touchedAt: TimeInterval
}

struct NativeChatEventFrame {
    let start: Int
    let frame: CGRect
    var contentTop: CGFloat { frame.minY }
}

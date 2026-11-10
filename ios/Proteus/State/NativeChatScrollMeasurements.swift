import UIKit

/// High-frequency measurements are reference state: recording a scroll offset must
/// not invalidate the whole conversation view. Layout/selection keep their own state.
@MainActor final class NativeChatScrollMeasurements {
    let viewport = NativeScrollViewport()
    let renderViewport = NativeMessageRenderViewport()
    var offset: CGFloat = 0
    var contentHeight: CGFloat = 0
    var visibleAnchor: NativeChatScrollLocation?
    var latest: NativeScrollSnapshot?
    var historyRevealPending = false
    var preservedHistoryAnchor: NativeChatScrollLocation?
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

    static func readingEntry(in frames: [Int: NativeChatEventFrame], start: Int, top: CGFloat) -> (key: Int, value: NativeChatEventFrame)? {
        // At the history header or between messages no row contains the viewport
        // top. Anchor the next visible message with a negative inset instead.
        frames.filter { $0.value.start == start && $0.value.frame.height > 0 && $0.value.frame.maxY > top }
            .min { $0.value.contentTop == $1.value.contentTop ? $0.key < $1.key : $0.value.contentTop < $1.value.contentTop }
    }
}

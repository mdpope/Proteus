import Foundation

/// High-frequency measurements are reference state: recording a scroll offset must
/// not invalidate the whole conversation view. Layout/selection keep their own state.
final class NativeChatScrollMeasurements {
    var offset: CGFloat = 0
    var contentHeight: CGFloat = 0
    var visibleAnchor: NativeChatScrollLocation?
    var eventFrames: [Int: (start: Int, frame: CGRect)] = [:]
}

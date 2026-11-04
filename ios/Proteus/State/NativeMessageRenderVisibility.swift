import Foundation
import Observation

/// Geometry samples are reference state, not observed per-frame view state.
/// A viewport update must re-evaluate the last frame even if that frame did not move.
@MainActor @Observable final class NativeMessageRenderVisibility {
    private(set) var isVisible = false
    @ObservationIgnored var frame: CGRect = .null
    @ObservationIgnored private weak var owner: NativeMessageRenderViewport?
    @ObservationIgnored let token = UUID()
    func bind(_ owner: NativeMessageRenderViewport?) {
        self.owner?.remove(token)
        self.owner = owner
        if let owner { owner.add(self) } else { isVisible = true }
    }
    func detach() { owner?.remove(token); owner = nil }
    func updateFrame(_ frame: CGRect) { self.frame = frame; if let snapshot = owner?.snapshot { update(snapshot) } }
    func update(_ snapshot: NativeScrollSnapshot) {
        let viewport = CGRect(x: 0, y: snapshot.offset + snapshot.topInset,
                              width: snapshot.viewportWidth, height: max(1, snapshot.viewportHeight - snapshot.topInset - snapshot.bottomInset))
        let next = visible(in: viewport)
        if isVisible != next { isVisible = next }
    }
    func visible(in viewport: CGRect?) -> Bool {
        guard let viewport else { return true }
        guard viewport.width > 0, viewport.height > 0, !frame.isNull else { return false }
        // Both frame and viewport are content coordinates. Horizontal placement
        // belongs to the containing project/sidebar and does not affect culling.
        let expanded = viewport.insetBy(dx: 0, dy: -max(600, viewport.height * 1.5))
        return frame.maxY > expanded.minY && frame.minY < expanded.maxY
    }
}

/// UIKit owns the current offset. Notify only realized message models; only a
/// visibility transition publishes, never every offset through the chat body.
@MainActor final class NativeMessageRenderViewport {
    private final class WeakModel {
        weak var value: NativeMessageRenderVisibility?
        init(_ value: NativeMessageRenderVisibility) { self.value = value }
    }
    private var models: [UUID: WeakModel] = [:]
    private(set) var snapshot: NativeScrollSnapshot?
    func add(_ model: NativeMessageRenderVisibility) {
        models[model.token] = WeakModel(model)
        if let snapshot { model.update(snapshot) }
    }
    func remove(_ token: UUID) { models[token] = nil }
    func update(_ snapshot: NativeScrollSnapshot) {
        self.snapshot = snapshot
        models = models.filter { $0.value.value != nil }
        for entry in models.values { entry.value?.update(snapshot) }
    }
    #if DEBUG
    func diagnosticSummary() -> String {
        guard let snapshot else { return "renderViewport=missing" }
        let live = models.values.compactMap(\.value)
        let frames = live.map(\.frame).filter { !$0.isNull }
        return "renderModels=\(live.count),renderVisible=\(live.filter(\.isVisible).count),renderOffset=\(Int(snapshot.offset)),renderHeight=\(Int(snapshot.viewportHeight)),renderFramesMin=\(Int(frames.map(\.minY).min() ?? 0)),renderFramesMax=\(Int(frames.map(\.maxY).max() ?? 0))"
    }
    #endif
}

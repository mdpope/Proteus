import SwiftUI
import UIKit

/// A requested native scroll offset. Relative commands resolve from the actual
/// UIScrollView offset once, when the command is first applied.
struct NativeScrollCommand: Equatable {
    let id: UUID
    let y: CGFloat
    var relativeToCurrent = false
    var minimumContentHeight: CGFloat = 0
}

struct NativeScrollSnapshot {
    let offset: CGFloat
    let contentHeight: CGFloat
    let viewportHeight: CGFloat
    let viewportWidth: CGFloat
    let viewportTop: CGFloat
    var bottomInset: CGFloat = 0
    var topInset: CGFloat = 0

    var maxOffset: CGFloat { max(0, contentHeight - viewportHeight + bottomInset) }
    var canScroll: Bool { viewportHeight > 0 && maxOffset > 2 }
    var atEnd: Bool { canScroll && offset >= maxOffset - 24 }
}

/// A reference-only read of the current native viewport and safe-area insets.
/// Reading it does not publish per-frame changes through SwiftUI.
@MainActor final class NativeScrollViewport {
    weak var scrollView: UIScrollView?
    var snapshot: NativeScrollSnapshot? {
        guard let scroll = scrollView else { return nil }
        return NativeScrollSnapshot(offset: scroll.contentOffset.y, contentHeight: scroll.contentSize.height,
            viewportHeight: scroll.bounds.height, viewportWidth: scroll.bounds.width,
            viewportTop: scroll.convert(scroll.bounds, to: scroll.window).minY, bottomInset: scroll.adjustedContentInset.bottom, topInset: scroll.adjustedContentInset.top)
    }
}

/// Observes the UIKit scroll view that hosts SwiftUI conversation content.
/// A command stays pending until the real native offset reaches its target;
/// an early, short content layout cannot acknowledge a clamped offset.
struct NativeScrollProbe: UIViewRepresentable {
    var command: NativeScrollCommand?
    var followBottom = false
    var viewport: NativeScrollViewport? = nil
    var onSnapshot: (NativeScrollSnapshot) -> Void
    var onInteraction: (Bool) -> Void = { _ in }
    var onApplied: (UUID, NativeScrollSnapshot) -> Void = { _, _ in }

    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView { UIView(frame: .zero) }

    func updateUIView(_ view: UIView, context: Context) {
        let coordinator = context.coordinator
        coordinator.followBottom = followBottom
        coordinator.viewport = viewport
        viewport?.scrollView = coordinator.scrollView
        coordinator.onSnapshot = onSnapshot
        coordinator.onInteraction = onInteraction
        coordinator.onApplied = onApplied
        coordinator.attach(from: view)
        coordinator.apply(command)
        // The representable can be updated before SwiftUI has installed it in
        // the hierarchy. Retry attachment on the next main-queue turn.
        DispatchQueue.main.async { [weak view, weak coordinator] in
            guard let view, let coordinator else { return }
            coordinator.attach(from: view)
        }
    }

    static func dismantleUIView(_ view: UIView, coordinator: Coordinator) {
        coordinator.invalidate()
    }

    @MainActor final class Coordinator: NSObject {
        weak var scrollView: UIScrollView?
        var viewport: NativeScrollViewport?
        var followBottom = false
        var onSnapshot: (NativeScrollSnapshot) -> Void = { _ in }
        var onInteraction: (Bool) -> Void = { _ in }
        var onApplied: (UUID, NativeScrollSnapshot) -> Void = { _, _ in }

        private var offsetObservation: NSKeyValueObservation?
        private var sizeObservation: NSKeyValueObservation?
        private var boundsObservation: NSKeyValueObservation?
        private var pendingCommand: NativeScrollCommand?
        private var resolvedTarget: CGFloat?
        private var appliedCommand: UUID?
        private var lastReported: NativeScrollSnapshot?
        private var generation = 0
        private var active = true
        private var updateScheduled = false
        private var settling: Task<Void, Never>?

        func invalidate() {
            active = false
            settling?.cancel(); settling = nil; updateScheduled = false
            generation += 1
            offsetObservation = nil
            sizeObservation = nil
            boundsObservation = nil
            scrollView?.panGestureRecognizer.removeTarget(self, action: #selector(handlePan(_:)))
            if viewport?.scrollView === scrollView { viewport?.scrollView = nil }
            scrollView = nil
            pendingCommand = nil
            resolvedTarget = nil
            lastReported = nil
            onSnapshot = { _ in }
            onInteraction = { _ in }
            onApplied = { _, _ in }
        }

        func attach(from view: UIView) {
            guard active, scrollView == nil else { return }
            var parent = view.superview
            while let current = parent {
                if let scroll = current as? UIScrollView {
                    generation += 1
                    let attachedGeneration = generation
                    scrollView = scroll
                    viewport?.scrollView = scroll
                    scroll.panGestureRecognizer.addTarget(self, action: #selector(handlePan(_:)))
                    offsetObservation = scroll.observe(\.contentOffset, options: [.new]) { [weak self] scroll, _ in
                        Task { @MainActor [weak self] in
                            guard let self, self.generation == attachedGeneration, self.scrollView === scroll else { return }
                            self.scheduleUpdate(scroll)
                        }
                    }
                    sizeObservation = scroll.observe(\.contentSize, options: [.new]) { [weak self] scroll, _ in
                        Task { @MainActor [weak self] in
                            guard let self, self.generation == attachedGeneration, self.scrollView === scroll else { return }
                            self.scheduleUpdate(scroll)
                        }
                    }
                    boundsObservation = scroll.observe(\.bounds, options: [.old, .new]) { [weak self] scroll, change in
                        guard change.oldValue?.size != change.newValue?.size else { return }
                        Task { @MainActor [weak self] in
                            guard let self, self.generation == attachedGeneration, self.scrollView === scroll else { return }
                            self.scheduleUpdate(scroll)
                        }
                    }
                    DispatchQueue.main.async { [weak self, weak scroll] in
                        guard let self, let scroll,
                              self.generation == attachedGeneration,
                              self.scrollView === scroll else { return }
                        self.report(scroll)
                    }
                    applyPending()
                    return
                }
                parent = current.superview
            }
        }

        @objc private func handlePan(_ recognizer: UIPanGestureRecognizer) {
            switch recognizer.state {
            case .began:
                settling?.cancel(); settling = nil
                // Stop pinning synchronously. SwiftUI gestures inside a WebKit
                // message do not reliably see the containing scroll view's pan.
                followBottom = false
                pendingCommand = nil; resolvedTarget = nil
                onInteraction(true)
            case .ended, .cancelled, .failed:
                settling?.cancel()
                let expected = generation
                settling = Task { @MainActor [weak self] in
                    // UIKit starts deceleration after the recognizer's ended callback.
                    try? await Task.sleep(for: .milliseconds(32))
                    guard let self else { return }
                    while !Task.isCancelled, let scroll = self.scrollView, self.active, self.generation == expected {
                        if !scroll.isTracking && !scroll.isDragging && !scroll.isDecelerating {
                            self.report(scroll)
                            self.onInteraction(false)
                            self.scheduleUpdate(scroll)
                            break
                        }
                        try? await Task.sleep(for: .milliseconds(16))
                    }
                }
            default: break
            }
        }

        func apply(_ command: NativeScrollCommand?) {
            guard active else { return }
            if pendingCommand?.id != command?.id {
                resolvedTarget = nil
                appliedCommand = nil
            }
            pendingCommand = command
            if let scroll = scrollView { scheduleUpdate(scroll) }
        }

        private func scheduleUpdate(_ scroll: UIScrollView) {
            guard active, scrollView === scroll, !updateScheduled else { return }
            updateScheduled = true
            let expected = generation
            DispatchQueue.main.async { [weak self, weak scroll] in
                guard let self, let scroll, self.active, self.generation == expected else { return }
                self.updateScheduled = false
                self.applyPending()
                self.report(scroll)
                self.verifyApplied(scroll)
            }
        }

        private func snapshot(_ scroll: UIScrollView) -> NativeScrollSnapshot {
            NativeScrollSnapshot(offset: scroll.contentOffset.y,
                                 contentHeight: scroll.contentSize.height,
                                 viewportHeight: scroll.bounds.height,
                                 viewportWidth: scroll.bounds.width,
                                 viewportTop: scroll.convert(scroll.bounds, to: scroll.window).minY,
                                 bottomInset: scroll.adjustedContentInset.bottom, topInset: scroll.adjustedContentInset.top)
        }

        private func report(_ scroll: UIScrollView) {
            guard active, scrollView === scroll else { return }
            let current = snapshot(scroll)
            if let previous = lastReported,
               abs(previous.offset - current.offset) < 0.5,
               abs(previous.contentHeight - current.contentHeight) < 0.5,
               abs(previous.viewportHeight - current.viewportHeight) < 0.5,
               abs(previous.viewportWidth - current.viewportWidth) < 0.5,
               abs(previous.viewportTop - current.viewportTop) < 0.5,
               abs(previous.topInset - current.topInset) < 0.5,
               abs(previous.bottomInset - current.bottomInset) < 0.5 { return }
            lastReported = current
            onSnapshot(current)
        }

        private func applyPending() {
            guard active, let scroll = scrollView,
                  !scroll.isTracking, !scroll.isDragging, !scroll.isDecelerating else { return }
            if followBottom && pendingCommand == nil && !scroll.isTracking && !scroll.isDragging && !scroll.isDecelerating {
                let bottom = snapshot(scroll).maxOffset
                if abs(scroll.contentOffset.y - bottom) > 0.5 { scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: bottom), animated: false) }
                return
            }
            guard let command = pendingCommand, command.id != appliedCommand else { return }
            let state = snapshot(scroll)
            guard state.viewportHeight > 0, state.contentHeight > 0 else { return }
            guard state.contentHeight + 2 >= command.minimumContentHeight else { return }
            if resolvedTarget == nil {
                resolvedTarget = command.relativeToCurrent ? state.offset + command.y : command.y
            }
            guard let target = resolvedTarget, target.isFinite else { return }
            let clamped = min(max(0, target), state.maxOffset)
            if abs(state.offset - clamped) > 0.5 {
                scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: clamped), animated: false)
            }
            // Check the offset after UIKit has processed this layout turn. A
            // command clamped by an incomplete content size remains pending.
            let currentGeneration = generation
            DispatchQueue.main.async { [weak self, weak scroll] in
                guard let self, let scroll, self.active,
                      self.generation == currentGeneration,
                      self.scrollView === scroll else { return }
                self.verifyApplied(scroll)
            }
        }

        private func verifyApplied(_ scroll: UIScrollView) {
            guard active, scrollView === scroll,
                  let command = pendingCommand, command.id != appliedCommand,
                  let target = resolvedTarget else { return }
            let state = snapshot(scroll)
            guard state.viewportHeight > 0,
                  state.contentHeight + 2 >= command.minimumContentHeight,
                  state.maxOffset >= target - 2,
                  abs(state.offset - max(0, target)) <= 2 else { return }
            appliedCommand = command.id
            onApplied(command.id, state)
        }
    }
}

#if DEBUG
/// Native labels avoid invalidating the SwiftUI conversation for every sample.
struct NativeChatScrollDiagnostics: UIViewRepresentable {
    let measurements: NativeChatScrollMeasurements
    func makeUIView(context: Context) -> UIStackView {
        let offset = UILabel(); offset.accessibilityIdentifier = "chat-scroll-offset"; offset.isAccessibilityElement = true
        let anchor = UILabel(); anchor.accessibilityIdentifier = "chat-scroll-anchor"; anchor.isAccessibilityElement = true
        let stack = UIStackView(arrangedSubviews: [offset, anchor]); stack.spacing = 12
        measurements.offsetLabel = offset; measurements.anchorLabel = anchor
        measurements.updateDiagnostics()
        return stack
    }
    func updateUIView(_ view: UIStackView, context: Context) { measurements.updateDiagnostics() }
}
#endif

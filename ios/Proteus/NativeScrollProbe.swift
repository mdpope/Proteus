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

    var maxOffset: CGFloat { max(0, contentHeight - viewportHeight) }
    var canScroll: Bool { viewportHeight > 0 && contentHeight > viewportHeight + 2 }
    var atEnd: Bool { canScroll && offset >= maxOffset - 24 }
}

/// Observes the UIKit scroll view that hosts SwiftUI conversation content.
/// A command stays pending until the real native offset reaches its target;
/// an early, short content layout cannot acknowledge a clamped offset.
struct NativeScrollProbe: UIViewRepresentable {
    var command: NativeScrollCommand?
    var onSnapshot: (NativeScrollSnapshot) -> Void
    var onApplied: (UUID, NativeScrollSnapshot) -> Void = { _, _ in }

    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView { UIView(frame: .zero) }

    func updateUIView(_ view: UIView, context: Context) {
        let coordinator = context.coordinator
        coordinator.onSnapshot = onSnapshot
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
        var onSnapshot: (NativeScrollSnapshot) -> Void = { _ in }
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

        func invalidate() {
            active = false
            generation += 1
            offsetObservation = nil
            sizeObservation = nil
            boundsObservation = nil
            scrollView = nil
            pendingCommand = nil
            resolvedTarget = nil
            lastReported = nil
            onSnapshot = { _ in }
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
                    offsetObservation = scroll.observe(\.contentOffset, options: [.new]) { [weak self] scroll, _ in
                        Task { @MainActor [weak self] in
                            guard let self, self.generation == attachedGeneration, self.scrollView === scroll else { return }
                            self.report(scroll)
                            self.verifyApplied(scroll)
                        }
                    }
                    sizeObservation = scroll.observe(\.contentSize, options: [.new]) { [weak self] scroll, _ in
                        Task { @MainActor [weak self] in
                            guard let self, self.generation == attachedGeneration, self.scrollView === scroll else { return }
                            self.applyPending()
                            self.report(scroll)
                        }
                    }
                    boundsObservation = scroll.observe(\.bounds, options: [.new]) { [weak self] scroll, _ in
                        Task { @MainActor [weak self] in
                            guard let self, self.generation == attachedGeneration, self.scrollView === scroll else { return }
                            if let previous = self.lastReported, abs(previous.viewportHeight - scroll.bounds.height) < 0.5 { return }
                            self.applyPending()
                            self.report(scroll)
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

        func apply(_ command: NativeScrollCommand?) {
            guard active else { return }
            if pendingCommand?.id != command?.id {
                resolvedTarget = nil
                appliedCommand = nil
            }
            pendingCommand = command
            applyPending()
        }

        private func snapshot(_ scroll: UIScrollView) -> NativeScrollSnapshot {
            NativeScrollSnapshot(offset: scroll.contentOffset.y,
                                 contentHeight: scroll.contentSize.height,
                                 viewportHeight: scroll.bounds.height,
                                 viewportWidth: scroll.bounds.width,
                                 viewportTop: scroll.convert(scroll.bounds, to: scroll.window).minY)
        }

        private func report(_ scroll: UIScrollView) {
            guard active, scrollView === scroll else { return }
            let current = snapshot(scroll)
            if let previous = lastReported,
               abs(previous.offset - current.offset) < 0.5,
               abs(previous.contentHeight - current.contentHeight) < 0.5,
               abs(previous.viewportHeight - current.viewportHeight) < 0.5,
               abs(previous.viewportWidth - current.viewportWidth) < 0.5,
               abs(previous.viewportTop - current.viewportTop) < 0.5 { return }
            lastReported = current
            onSnapshot(current)
        }

        private func applyPending() {
            guard active, let command = pendingCommand, command.id != appliedCommand,
                  let scroll = scrollView else { return }
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

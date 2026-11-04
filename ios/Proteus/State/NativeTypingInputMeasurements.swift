#if DEBUG
import Foundation

/// Opt-in, content-free measurements. Reference state never invalidates SwiftUI
/// while a key is delivered, TextKit measures, or the main executor is sampled.
@MainActor enum NativeTypingInputMeasurements {
    static var enabled: Bool { ProcessInfo.processInfo.arguments.contains("--typing-diagnostics") }
    private static var input: [Double] = []
    private static var layout: [Double] = []
    private static var queue: [Double] = []
    private static var richCreation: [Double] = []
    private static var stateApply: [Double] = []
    private static var chatMerge: [Double] = []
    private static var cacheSnapshot: [Double] = []
    private static var pulse: Task<Void, Never>?
    static func start() {
        guard enabled, pulse == nil else { return }
        pulse = Task {
            while !Task.isCancelled {
                let start = ProcessInfo.processInfo.systemUptime
                try? await Task.sleep(for: .milliseconds(10))
                append(max(0, (ProcessInfo.processInfo.systemUptime - start) * 1000 - 10), to: &queue)
            }
        }
    }
    static func inputTook(_ start: Double) {
        guard enabled else { return }
        append((ProcessInfo.processInfo.systemUptime - start) * 1000, to: &input)
    }
    static func layoutTook(_ start: Double) {
        guard enabled else { return }
        append((ProcessInfo.processInfo.systemUptime - start) * 1000, to: &layout)
    }
    static func richCreated(_ start: Double) {
        guard enabled else { return }
        append((ProcessInfo.processInfo.systemUptime - start) * 1000, to: &richCreation)
    }
    static func stateApplied(_ start: Double) {
        guard enabled else { return }
        append((ProcessInfo.processInfo.systemUptime - start) * 1000, to: &stateApply)
    }
    static func chatMerged(_ start: Double) {
        guard enabled else { return }
        append((ProcessInfo.processInfo.systemUptime - start) * 1000, to: &chatMerge)
    }
    static func cacheSnapshotted(_ start: Double) {
        guard enabled else { return }
        append((ProcessInfo.processInfo.systemUptime - start) * 1000, to: &cacheSnapshot)
    }
    private static func append(_ value: Double, to values: inout [Double]) {
        if values.count < 6000 { values.append(value) }
    }
    static func snapshotAndReset() -> String {
        func stats(_ label: String, _ values: [Double]) -> String {
            let sorted = values.sorted()
            let p95 = sorted.isEmpty ? 0 : sorted[min(sorted.count - 1, Int(Double(sorted.count) * 0.95))]
            return "\(label)Count=\(values.count),\(label)P95Ms=\(String(format: "%.3f", p95)),\(label)MaxMs=\(String(format: "%.3f", sorted.last ?? 0))"
        }
        let result = [stats("input", input), stats("layout", layout), stats("queue", queue), stats("richCreated", richCreation), stats("stateApply", stateApply), stats("chatMerge", chatMerge), stats("cacheSnapshot", cacheSnapshot), "richInitTotalMs=\(String(format: "%.3f", richCreation.reduce(0,+)))", "queueOver250=\(queue.filter { $0 > 250 }.count)"].joined(separator: ",")
        input.removeAll(keepingCapacity: true); layout.removeAll(keepingCapacity: true); queue.removeAll(keepingCapacity: true)
        stateApply.removeAll(keepingCapacity: true); chatMerge.removeAll(keepingCapacity: true); cacheSnapshot.removeAll(keepingCapacity: true)
        return result
    }
}
#endif

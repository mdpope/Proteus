import Observation

/// One presentation section; reference identity survives unrelated owner pushes.
@MainActor @Observable final class NativeRemoteStateField {
    var value: JSON
    init(_ value: JSON) { self.value = value }
}

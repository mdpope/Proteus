import Foundation

/// Only a successful owner response advances our known history revision. A title
/// settled elsewhere can make the accepted revision greater than local + 1.
struct NativeBrowserNavigationAcknowledgement {
    let revisions: [String: JSON]

    init(response: JSON, operations: [JSON]) {
        let ids = Set(operations.filter { $0["action"].string.hasPrefix("browser-") }.map { $0["tabId"].string })
        revisions = Dictionary(response["tabs"].array.compactMap { tab in
            guard ids.contains(tab["id"].string), case .number = tab["history"]["revision"] else { return nil }
            return (tab["id"].string, tab["history"]["revision"])
        }, uniquingKeysWith: { _, latest in latest })
    }

    /// These successors have never had a request envelope. Rebase them only onto
    /// their own acknowledged predecessor, never an arbitrary fresh owner read.
    /// Uncertain envelopes are replayed unchanged by the transport before this runs.
    func pendingOperations(_ pending: [JSON]) -> [JSON] {
        pending.map { operation in
            guard operation["action"].string.hasPrefix("browser-"), let revision = revisions[operation["tabId"].string] else { return operation }
            var fields = operation.object; fields["baseRevision"] = revision
            return .object(fields)
        }
    }
}

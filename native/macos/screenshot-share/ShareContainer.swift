import Foundation
import Security

enum ShareContainer {
    static func url() -> URL? {
        guard let task = SecTaskCreateFromSelf(nil),
              let groups = SecTaskCopyValueForEntitlement(task, "com.apple.security.application-groups" as CFString, nil) as? [String],
              let group = groups.first(where: { $0.hasSuffix(".screenshot-share") }) else {
            return nil
        }
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    }
}

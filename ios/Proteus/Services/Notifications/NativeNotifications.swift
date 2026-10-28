import SwiftUI
import UserNotifications
import UIKit
import Security

@MainActor final class NativeNotifications: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NativeNotifications()
    @Published var status = "Notifications are off"
    @Published var deviceToken: String?
    @Published var route: NotificationRoute?
    struct Banner: Identifiable { let id = UUID(); let message: String; let destination: NotificationRoute }
    @Published var banner: Banner?
    private var bannerQueue: [Banner] = []
    private var bannerTask: Task<Void, Never>?
    func presentBanner(_ message: String, destination: NotificationRoute) { let value = Banner(message: message, destination: destination); if banner != nil { if bannerQueue.count < 30 { bannerQueue.append(value) }; return }; banner = value; bannerTask?.cancel(); bannerTask = Task { try? await Task.sleep(for: .seconds(5)); if !Task.isCancelled && banner?.id == value.id { dismissBanner() } } }
    func dismissBanner() { bannerTask?.cancel(); banner = nil; if !bannerQueue.isEmpty { let next = bannerQueue.removeFirst(); presentBanner(next.message, destination: next.destination) } }

    @AppStorage("notificationsEnabled") var enabled = false
    @AppStorage("notificationDeviceID") var deviceID = UUID().uuidString.lowercased()
    private var delivered = Set<String>()
    private var baselineHosts = Set<String>()
    private var life: LifeStore?
    @AppStorage("pushSubscriptionID") private var subscriptionID = ""
    @AppStorage("pushSubscriptionAccount") private var subscriptionAccount = ""
    struct NotificationRoute: Equatable {
        let hostID: String
        let chatID: String
        let scheduleID: String
        let type: String
        static func from(_ payload: [AnyHashable: Any]) -> Self {
            func field(_ key: String) -> String {
                guard let value = payload[key] as? String, value.count <= 128,
                      !value.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else { return "" }
                return value
            }
            let host = field("hostId")
            return Self(hostID: UUID(uuidString: host) == nil ? "" : host,
                        chatID: field("chatId"), scheduleID: field("scheduleId"), type: field("type"))
        }
    }
    override init() { super.init(); UNUserNotificationCenter.current().delegate = self }
    func attach(_ life: LifeStore) { self.life = life; if enabled { UIApplication.shared.registerForRemoteNotifications() } }
    func enable() async {
        do { let allowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]); enabled = allowed; status = allowed ? "Registering with Apple…" : "Permission denied; change notifications in iOS Settings."; if allowed { UIApplication.shared.registerForRemoteNotifications() } }
        catch { status = "Notification permission could not be requested." }
    }
    func disable() async {
        enabled = false; UIApplication.shared.unregisterForRemoteNotifications(); UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        if let life, life.credential?.appAuthorized == true, !subscriptionID.isEmpty, subscriptionAccount == life.accountIdentity { _ = try? await life.appRequest("/push-subscriptions/" + subscriptionID, method: "DELETE") }
        status = "Notifications are off"
    }
    func registered(_ token: Data) { deviceToken = token.map { String(format: "%02x", $0) }.joined(); Task { await syncSubscription() } }
    func registrationFailed() { status = "APNs registration unavailable. A paid Apple Developer team, Push Notifications capability and an aps-environment provisioning entitlement are required. In-app notifications can still work." }
    func syncSubscription() async {
        guard enabled, let token = deviceToken else { return }
        guard let life, life.credential?.appAuthorized == true else { status = "Registered with Apple. Connect shared Team tools in Account & Security to register for background delivery."; return }
        // Xcode's development/release push configuration must match the provisioning profile.
        let environment = Bundle.main.object(forInfoDictionaryKey: "ProteusAPNSEnvironment") as? String ?? "sandbox"
        do {
            let response = try await life.appRequest("/push-subscriptions", method: "POST", body: .object(["platform": .string("apns"), "deviceId": .string(deviceID), "token": .string(token), "environment": .string(environment)]))
            subscriptionID = response["id"].string; subscriptionAccount = life.accountIdentity
            status = response["configured"].bool ? "Registered with Apple and the shared service" : "Registered with Apple; server APNs credentials are not configured. Background delivery is unavailable."
        } catch { status = life.display(error) }
    }
    func observe(_ items: [JSON], hostID: String) {
        // First sync is history, not new activity. Do not notify an old backlog after reconnect.
        let first = baselineHosts.insert(hostID).inserted
        for item in items {
            let id = hostID + ":" + item["id"].string
            guard delivered.insert(id).inserted, !first, item["readAt"] == .null else { continue }
            if UIApplication.shared.applicationState == .active { presentBanner(Self.notificationBody(item), destination: NotificationRoute(hostID: hostID, chatID: item["chatId"].string, scheduleID: item["scheduleId"].string, type: item["type"].string)); continue }
            guard enabled else { continue }
            // Same text the computer published: chat title, preview and source computer.
            let content = UNMutableNotificationContent(); content.title = item["title"].string.isEmpty ? "Proteus" : String(item["title"].string.prefix(160)); content.subtitle = String(item["hostName"].string.prefix(80)); content.body = Self.notificationBody(item, includeTitle: false); content.sound = .default; content.threadIdentifier = item["chatId"].string
            content.userInfo = ["hostId": hostID, "chatId": item["chatId"].string,
                                "scheduleId": item["scheduleId"].string, "type": item["type"].string]
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: nil))
        }
        if delivered.count > 2000 { delivered = Set(delivered.suffix(1000)) }
    }
    static func notificationBody(_ item: JSON, includeTitle: Bool = true) -> String {
        // Content arrived through the authenticated/decrypted owner channel.
        // The OS continues to enforce the operator's lock-screen preview policy.
        let parts = [includeTitle ? [item["hostName"].string, item["title"].string].filter { !$0.isEmpty }.joined(separator: " · ") : "", item["body"].string].filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        let text = parts.joined(separator: " — ").unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) || $0 == "\n" }
        let preview = String(String.UnicodeScalarView(text)).trimmingCharacters(in: .whitespacesAndNewlines)
        return preview.isEmpty ? safeBody(item["type"].string) : String(preview.prefix(500))
    }
    static func safeBody(_ type: String) -> String {
        switch type { case "chat.completed": "A chat finished."; case "review.required", "approval.required": "A chat needs your review."; case "schedule.completed": "A schedule finished."; case "device.added": "A device was added."; case "device.reconnected": "A computer reconnected."; default: "New activity is available." }
    }
    func receivedTap(_ payload: [AnyHashable: Any]) {
        route = NotificationRoute.from(payload)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-notification-controls") { fixtureStatus = "Received " + (route?.type ?? "unknown") }
        #endif
    }
    #if DEBUG
    @Published var fixtureStatus = "Not scheduled"
    func scheduleFixtureTap() async throws {
        fixtureStatus = "Requesting permission"
        let center = UNUserNotificationCenter.current()
        guard try await center.requestAuthorization(options: [.alert, .sound]) else { fixtureStatus = "Permission denied"; throw RemoteError(message: "Simulator notification permission was denied.") }
        let content = UNMutableNotificationContent()
        content.title = "Proteus route fixture"
        content.body = "Tap to open the fixture chat."
        content.userInfo = ["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "notification-chat", "type": "chat.completed"]
        // Give XCTest time to background the app after the scheduling acknowledgement.
        // Foreground fixtures keep their original timing and delivery path.
        let delay: TimeInterval = ProcessInfo.processInfo.arguments.contains("--synthetic-background-notification") ? 10 : 4
        try await center.add(UNNotificationRequest(identifier: "proteus-simulator-route-fixture", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)))
        fixtureStatus = "Scheduled"
    }
    #endif
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let payload = notification.request.content.userInfo
        let host = payload["hostId"] as? String ?? "", chat = payload["chatId"] as? String ?? "", schedule = payload["scheduleId"] as? String ?? "", type = payload["type"] as? String ?? ""
        let eventID = payload["notificationId"] as? String ?? ""
        DispatchQueue.main.async {
            // Account push and the live encrypted host connection can report
            // the same event. Whichever arrives first owns its foreground alert.
            if !eventID.isEmpty, UUID(uuidString: eventID) != nil, !self.delivered.insert(host + ":" + eventID).inserted { completionHandler([]); return }
            #if DEBUG
            self.fixtureStatus = "Foreground delivered"
            #endif
            // Use the pushed alert's own text; fall back to the generic label for older servers.
            let content = notification.request.content
            let text = [[content.subtitle, content.title].filter { !$0.isEmpty && $0 != "Proteus" }.joined(separator: " · "), content.body].filter { !$0.isEmpty && $0 != "There is an update in Proteus. Open Notifications to review." }.joined(separator: " — ")
            self.presentBanner(text.isEmpty ? Self.safeBody(type) : String(text.prefix(500)), destination: NotificationRoute.from(["hostId": host, "chatId": chat, "scheduleId": schedule, "type": type])); completionHandler([]) }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let payload = response.notification.request.content.userInfo
        let host = payload["hostId"] as? String ?? ""
        let chat = payload["chatId"] as? String ?? ""
        let schedule = payload["scheduleId"] as? String ?? ""
        let type = payload["type"] as? String ?? ""
        DispatchQueue.main.async {
            self.receivedTap(["hostId": host, "chatId": chat, "scheduleId": schedule, "type": type])
            completionHandler()
        }
    }
}
final class ProteusAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let notifications = NativeNotifications.shared
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        let host = "10000000-0000-4000-8000-000000000001"
        if args.contains("--synthetic-notification-cold-chat") { notifications.receivedTap(["hostId": host, "chatId": "notification-chat", "type": "chat.completed"]) }
        if args.contains("--synthetic-notification-cold-schedule") { notifications.receivedTap(["hostId": host, "scheduleId": "notification-schedule", "type": "schedule.completed"]) }
        #endif
        return true
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) { Task { @MainActor in NativeNotifications.shared.registered(deviceToken) } }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) { Task { @MainActor in NativeNotifications.shared.registrationFailed() } }
}


struct NativeNoticeBanner: View {
    @ObservedObject private var notices = NativeNotifications.shared
    var body: some View {
        if let banner = notices.banner {
            HStack(alignment: .top, spacing: 12) {
                Text(banner.message).font(.subheadline).frame(maxWidth: .infinity, alignment: .leading)
                Button("Open") { notices.route = banner.destination; notices.dismissBanner() }.fontWeight(.semibold).accessibilityLabel("Open notification")
                Button { notices.dismissBanner() } label: { Image(systemName: "xmark") }.accessibilityLabel("Dismiss notification")
            }.padding(16).frame(maxWidth: 640).foregroundStyle(NativeTheme.background).background(NativeTheme.accent, in: RoundedRectangle(cornerRadius: 14)).shadow(color: .black.opacity(0.2), radius: 12, y: 5).padding(.horizontal, 12).transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

#if DEBUG
struct NativeNotificationProbe: View {
 @ObservedObject private var notices = NativeNotifications.shared
 var body: some View { Text(notices.fixtureStatus).accessibilityIdentifier("notification-fixture-status") }
}
#endif

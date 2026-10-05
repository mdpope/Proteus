import SwiftUI
import UserNotifications
import UIKit
import Security

@MainActor final class NativeNotifications: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NativeNotifications()
    @Published var status = "Notifications are off"
    @Published var deviceToken: String?
    @Published var route: NotificationRoute?
    @AppStorage("notificationsEnabled") var enabled = false
    @AppStorage("notificationDeviceID") var deviceID = UUID().uuidString.lowercased()
    private var delivered = Set<String>()
    private var baselineHosts = Set<String>()
    private var life: LifeStore?
    @AppStorage("pushSubscriptionID") private var subscriptionID = ""
    @AppStorage("pushSubscriptionAccount") private var subscriptionAccount = ""
    struct NotificationRoute: Equatable { let hostID: String; let chatID: String }
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
            guard delivered.insert(id).inserted, !first, enabled, item["readAt"] == .null else { continue }
            let content = UNMutableNotificationContent(); content.title = "Proteus"; content.body = Self.safeBody(item["type"].string); content.sound = .default
            content.userInfo = ["hostId": hostID, "chatId": item["chatId"].string]
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: nil))
        }
        if delivered.count > 2000 { delivered = Set(delivered.suffix(1000)) }
    }
    static func safeBody(_ type: String) -> String {
        switch type { case "chat.completed": "A chat finished."; case "review.required", "approval.required": "A chat needs your review."; case "schedule.completed": "A schedule finished."; case "device.added": "A device was added."; case "device.reconnected": "A Mac reconnected."; default: "New activity is available." }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions { [.banner, .sound, .list] }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let payload = response.notification.request.content.userInfo
        let host = payload["hostId"] as? String ?? "", chat = payload["chatId"] as? String ?? ""
        await MainActor.run { self.route = NotificationRoute(hostID: host, chatID: chat) }
    }
}
final class ProteusAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool { _ = NativeNotifications.shared; return true }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) { Task { @MainActor in NativeNotifications.shared.registered(deviceToken) } }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) { Task { @MainActor in NativeNotifications.shared.registrationFailed() } }
}

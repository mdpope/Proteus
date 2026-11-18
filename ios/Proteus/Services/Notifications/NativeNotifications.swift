import SwiftUI
import UserNotifications
import UIKit
import Security

@MainActor final class NativeNotifications: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NativeNotifications()
    @Published var status = "Notifications are off"
    @Published var deviceToken: String?
    @Published var route: NotificationRoute?
    struct Banner: Identifiable { let id: UUID; let message: String; let destination: NotificationRoute; let expiresAt: Date }
    @Published var banner: Banner?
    private var bannerTask: Task<Void, Never>?
    func presentBanner(_ message: String, destination: NotificationRoute) {
        expireBanner()
        if let current = banner {
            // Coalesce a burst into the same five-second window; never replay a backlog.
            banner = Banner(id: current.id, message: message, destination: destination, expiresAt: current.expiresAt)
            return
        }
        let value = Banner(id: UUID(), message: message, destination: destination, expiresAt: Date().addingTimeInterval(5))
        banner = value; bannerTask?.cancel()
        bannerTask = Task { try? await Task.sleep(for: .seconds(5)); if !Task.isCancelled && banner?.id == value.id { dismissBanner() } }
    }
    func expireBanner(now: Date = Date()) { if let banner, banner.expiresAt <= now { dismissBanner() } }
    func dismissBanner() { bannerTask?.cancel(); bannerTask = nil; banner = nil }

    @AppStorage("notificationsEnabled") var enabled = false
    let deviceID: String
    @AppStorage("pushSubscriptionConfigured") private var subscriptionConfigured = false
    static func usesAccountPush(enabled: Bool, configured: Bool, subscriptionID: String, subscriptionAccount: String, currentAccount: String) -> Bool {
        enabled && configured && !subscriptionID.isEmpty && !currentAccount.isEmpty && subscriptionAccount == currentAccount
    }
    private var accountPushReady: Bool {
        Self.usesAccountPush(enabled: enabled, configured: subscriptionConfigured, subscriptionID: subscriptionID, subscriptionAccount: subscriptionAccount, currentAccount: life?.credential?.appAuthorized == true ? life?.accountIdentity ?? "" : "")
    }
    private let defaults: UserDefaults
    private var delivered: [String: Double]
    private static let deliveredKey = "proteus.notification-receipts.v2"
    private func claim(_ host: String, _ event: String, now: Date = Date(), persist: Bool = true) -> Bool {
        guard let eventID = UUID(uuidString: event), UUID(uuidString: host) != nil || (host.count == 64 && host.allSatisfy({ $0.isHexDigit })) else { return false }
        let key = host.lowercased() + ":" + eventID.uuidString.lowercased()
        guard delivered[key] == nil else { return false }
        delivered[key] = now.timeIntervalSince1970
        if delivered.count > 2000 { delivered = Dictionary(uniqueKeysWithValues: delivered.sorted { $0.value > $1.value }.prefix(1500).map { ($0.key, $0.value) }) }
        if persist { defaults.set(delivered, forKey: Self.deliveredKey) }; return true
    }
    private var baselineHosts = Set<String>()
    private var life: LifeStore?
    @AppStorage("pushSubscriptionID") private var subscriptionID = ""
    @AppStorage("pushSubscriptionAccount") private var subscriptionAccount = ""
    struct NotificationRoute: Equatable {
        let hostID: String
        let chatID: String
        let scheduleID: String
        let type: String
        var notificationID: String = ""
        var questionID: String = ""
        var destinationKind: String = ""
        var accountID: String = ""
        var resourceID: String = ""
        static func from(_ payload: [AnyHashable: Any]) -> Self {
            func field(_ key: String) -> String {
                guard let value = payload[key] as? String, value.count <= 128,
                      !value.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else { return "" }
                return value
            }
            let host = field("hostId")
            let notification = field("notificationId")
            if let target = payload["destination"] as? [String: String] {
                let kind = target["kind"] ?? "", account = target["accountId"] ?? ""
                let resource = target[kind == "reminder" ? "reminderId" : "documentId"] ?? ""
                let owner = target["hostId"] ?? host
                if ["reminder", "document"].contains(kind), account.count == 64, account.allSatisfy({ $0.isHexDigit }), UUID(uuidString: resource) != nil, kind == "reminder" || UUID(uuidString: owner) != nil {
                    return Self(hostID: owner, chatID: "", scheduleID: "", type: field("type"), notificationID: notification, destinationKind: kind, accountID: account, resourceID: resource)
                }
                if kind == "chat", account.count == 64, account.allSatisfy({ $0.isHexDigit }), UUID(uuidString: owner) != nil, let chat = target["chatId"], UUID(uuidString: chat) != nil {
                    return Self(hostID: owner, chatID: chat, scheduleID: "", type: field("type"), notificationID: notification, destinationKind: kind, accountID: account)
                }
                return Self(hostID: "", chatID: "", scheduleID: "", type: field("type"))
            }
            if field("type") == "life.answer" {
                let chat = field("chatId"), request = field("requestId")
                guard UUID(uuidString: host) != nil, UUID(uuidString: chat) != nil, UUID(uuidString: request) != nil else {
                    return Self(hostID: "", chatID: "", scheduleID: "", type: "life.answer")
                }
                return Self(hostID: host, chatID: chat, scheduleID: "", type: "life.answer", notificationID: UUID(uuidString: notification) == nil ? "" : notification)
            }
            return Self(hostID: UUID(uuidString: host) == nil ? "" : host,
                        chatID: field("chatId"), scheduleID: field("scheduleId"), type: field("type"),
                        notificationID: UUID(uuidString: notification) == nil ? "" : notification, questionID: field("questionId").isEmpty ? field("requestId") : field("questionId"))
        }
    }
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let storedDevice = defaults.string(forKey: "notificationDeviceID").flatMap { UUID(uuidString: $0) }
        deviceID = (storedDevice ?? UUID()).uuidString.lowercased()
        defaults.set(deviceID, forKey: "notificationDeviceID")
        delivered = [:]
        for (key, time) in defaults.dictionary(forKey: Self.deliveredKey) as? [String: Double] ?? [:] {
            let parts = key.split(separator: ":")
            guard parts.count == 2, UUID(uuidString: String(parts[0])) != nil || (parts[0].count == 64 && parts[0].allSatisfy({ $0.isHexDigit })), let event = UUID(uuidString: String(parts[1])) else { continue }
            let canonical = parts[0].lowercased() + ":" + event.uuidString.lowercased()
            delivered[canonical] = max(delivered[canonical] ?? 0, time)
        }
        super.init(); UNUserNotificationCenter.current().delegate = self
        NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in self?.dismissBanner() } }
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in self?.expireBanner() } }
    }
    func attach(_ life: LifeStore) { self.life = life; if enabled { UIApplication.shared.registerForRemoteNotifications() } }
    func enable() async {
        do { let allowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]); enabled = allowed; status = allowed ? "Registering with Apple…" : "Permission denied; change notifications in iOS Settings."; if allowed { UIApplication.shared.registerForRemoteNotifications() } }
        catch { status = "Notification permission could not be requested." }
    }
    func disable() async {
        enabled = false; subscriptionConfigured = false; UIApplication.shared.unregisterForRemoteNotifications(); UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
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
        let account = life.accountIdentity
        do {
            let response = try await life.appRequest("/push-subscriptions", method: "POST", body: .object(["platform": .string("apns"), "deviceId": .string(deviceID), "token": .string(token), "environment": .string(environment)]))
            guard life.accountIdentity == account else { return }
            subscriptionID = response["id"].string; subscriptionAccount = account
            subscriptionConfigured = response["configured"].bool
            status = response["configured"].bool ? "Registered with Apple and the shared service" : "Registered with Apple; server APNs credentials are not configured. Background delivery is unavailable."
        } catch { status = life.display(error) }
    }
    func observe(_ items: [JSON], hostID: String, now: Date = Date()) {
        // First sync is history, not new activity. Do not notify an old backlog after reconnect.
        let first = baselineHosts.insert(UUID(uuidString: hostID)?.uuidString.lowercased() ?? hostID).inserted
        var changed = false
        defer { if changed { defaults.set(delivered, forKey: Self.deliveredKey) } }
        for item in items {
            let account = item["destination"]["accountId"].string
            guard account.isEmpty || account == life?.credential?.accountID else { continue }
            let owner = account.isEmpty ? hostID : account
            let id = owner + ":" + item["id"].string
            guard Self.shouldAlert(item, now: now), claim(owner, item["id"].string, now: now, persist: false) else { continue }
            changed = true
            guard !first else { continue }
            var payload: [AnyHashable: Any] = ["hostId": hostID, "chatId": item["chatId"].string, "scheduleId": item["scheduleId"].string, "type": item["type"].string, "notificationId": item["id"].string, "questionId": item["questionId"].string, "requestId": item["requestId"].string]
            if !item["destination"].object.isEmpty { payload["destination"] = item["destination"].object.mapValues { $0.string } }
            let destination = NotificationRoute.from(payload)
            if UIApplication.shared.applicationState == .active { presentBanner(Self.notificationBody(item), destination: destination); continue }
            // A configured account subscription owns background delivery. The
            // live owner feed must not schedule a second local alert for it.
            guard enabled, !accountPushReady else { continue }
            // Same text the computer published: chat title, preview and source computer.
            let content = UNMutableNotificationContent(); content.title = item["title"].string.isEmpty ? "Proteus" : String(item["title"].string.prefix(160)); content.subtitle = String(item["hostName"].string.prefix(80)); content.body = Self.notificationBody(item, includeTitle: false); content.sound = Self.shouldPlaySound(item) ? .default : nil; content.threadIdentifier = item["chatId"].string
            content.userInfo = ["hostId": hostID, "chatId": item["chatId"].string,
                                "scheduleId": item["scheduleId"].string, "type": item["type"].string, "notificationId": destination.notificationID, "questionId": destination.questionID, "requestId": item["requestId"].string]
            if let target = payload["destination"] { content.userInfo["destination"] = target }
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: nil))
        }
    }
    static func shouldPlaySound(_ item: JSON) -> Bool { item["sound"] != .bool(false) }
    static func shouldAlert(_ item: JSON, now: Date = Date()) -> Bool {
        guard item["readAt"] == .null, item["silent"] != .bool(true) else { return false }
        do {
            let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let created = formatter.date(from: item["createdAt"].string) ?? ISO8601DateFormatter().date(from: item["createdAt"].string)
            guard let created, now.timeIntervalSince(created) <= 300, now.timeIntervalSince(created) >= -60 else { return false }
        }
        return true
    }
    static func notificationBody(_ item: JSON, includeTitle: Bool = true) -> String {
        // Content arrived through the authenticated/decrypted owner channel.
        // The OS continues to enforce the operator's lock-screen preview policy.
        let severity = item["level"].string == "error" ? "ERROR · " : ""
        let parts = [includeTitle ? [item["hostName"].string, item["title"].string].filter { !$0.isEmpty }.joined(separator: " · ") : "", item["body"].string].filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        let text = (severity + parts.joined(separator: " — ")).unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) || $0 == "\n" }
        let preview = String(String.UnicodeScalarView(text)).trimmingCharacters(in: .whitespacesAndNewlines)
        return preview.isEmpty ? safeBody(item["type"].string) : String(preview.prefix(500))
    }
    static func safeBody(_ type: String) -> String {
        switch type { case "life.answer": "Your Life answer is ready."; case "chat.completed": "A chat finished."; case "review.required", "approval.required": "A chat needs your review."; case "schedule.completed": "A schedule finished."; case "device.added": "A device was added."; case "device.reconnected": "A computer reconnected."; case "website.notification": "A website sent a notification."; default: "New activity is available." }
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
        content.userInfo = ["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "notification-chat", "type": "chat.completed", "notificationId": UUID().uuidString.lowercased(), "createdAt": ISO8601DateFormatter().string(from: Date())]
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
        let content = notification.request.content
        let playSound = content.sound != nil
        let text = [[content.subtitle, content.title].filter { !$0.isEmpty && $0 != "Proteus" }.joined(separator: " · "), content.body].filter { !$0.isEmpty && $0 != "There is an update in Proteus. Open Notifications to review." }.joined(separator: " — ")
        let observed: JSON = .object(["createdAt": .string(payload["createdAt"] as? String ?? ""), "readAt": payload["readAt"] is String ? .string(payload["readAt"] as? String ?? "") : .null, "silent": .bool(payload["silent"] as? Bool ?? false), "type": .string(type)])
        DispatchQueue.main.async {
            // Account push and the live encrypted host connection can report
            // the same event. Whichever arrives first owns its foreground alert.
            // Legacy pushes without event time remain available in history/tap routing.
            // A transport arrival date is not the original event's creation time.
            let account = (payload["destination"] as? [String: String])?["accountId"]
            guard account == nil || account == self.life?.credential?.accountID else { completionHandler([]); return }
            guard Self.shouldAlert(observed), self.claim(account ?? host, eventID) else { completionHandler([]); return }
            #if DEBUG
            self.fixtureStatus = "Foreground delivered"
            #endif
            // Use the pushed alert's own text; fall back to the generic label for older servers.
            self.presentBanner(text.isEmpty ? Self.safeBody(type) : String(text.prefix(500)), destination: NotificationRoute.from(payload)); completionHandler(playSound ? [.sound] : []) }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let payload = response.notification.request.content.userInfo
        let host = payload["hostId"] as? String ?? ""
        let chat = payload["chatId"] as? String ?? ""
        let schedule = payload["scheduleId"] as? String ?? ""
        let type = payload["type"] as? String ?? ""
        let eventID = payload["notificationId"] as? String ?? ""
        DispatchQueue.main.async {
            self.receivedTap(payload)
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

import SwiftUI
import UIKit
import CryptoKit

/// Reviewed navigation is shared with release builds. Synthetic service access
/// still requires a separate Debug simulator identity/explicit rehearsal launch.
enum NativeDesignPreview {
    static var enabled: Bool { true }
    static var fixtureService: Bool { isolated && ProcessInfo.processInfo.arguments.contains("--native-app-fixture") }
    static var isolated: Bool {
        #if DEBUG && targetEnvironment(simulator)
        return ["org.proteusapp.review.proteus.iphone-preview", "org.proteusapp.review.proteus.ipad-preview"].contains(Bundle.main.bundleIdentifier ?? "") || ProcessInfo.processInfo.arguments.contains("--native-design-preview") || ProcessInfo.processInfo.arguments.contains("--iphone-design-preview")
        #else
        return false
        #endif
    }
}
enum NativePhonePreview { static var enabled: Bool { NativeDesignPreview.enabled && UIDevice.current.userInterfaceIdiom == .phone } }
enum NativePadPreview { static var enabled: Bool { NativeDesignPreview.enabled && UIDevice.current.userInterfaceIdiom == .pad } }

/// Shared overview mark: the two outlined, overlapping tabs used by desktop and web.
struct NativeTabOverviewIcon: View {
    var body: some View {
        Canvas { context, size in
            context.scaleBy(x: size.width / 24, y: size.height / 24)
            var back = Path()
            back.move(to: CGPoint(x: 7, y: 19)); back.addLine(to: CGPoint(x: 5, y: 19))
            back.addQuadCurve(to: CGPoint(x: 3, y: 17), control: CGPoint(x: 3, y: 19))
            back.addLine(to: CGPoint(x: 3, y: 5)); back.addQuadCurve(to: CGPoint(x: 5, y: 3), control: CGPoint(x: 3, y: 3))
            back.addLine(to: CGPoint(x: 15, y: 3)); back.addQuadCurve(to: CGPoint(x: 17, y: 5), control: CGPoint(x: 17, y: 3))
            back.addLine(to: CGPoint(x: 17, y: 7))
            context.stroke(back, with: .foreground, style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))
            context.stroke(Path(roundedRect: CGRect(x: 7, y: 7, width: 14, height: 16), cornerRadius: 2), with: .foreground, lineWidth: 1.7)
        }.frame(width: 21, height: 21).accessibilityHidden(true)
    }
}

/// The grouped desktop sidebar palette, kept separate from content and tab chrome.
enum NativeSidebarStyle {
    static var ink: Color { NativePalette.shared.color("sidebarText") }
    static var muted: Color { NativePalette.shared.color("sidebarMuted") }
    static var strong: Color { NativePalette.shared.color("sidebarStrong") }
    static var button: Color { NativePalette.shared.color("sidebarButton") }
    static var group: Color { NativePalette.shared.color("sidebarGroup") }
    static var selected: Color { NativePalette.shared.color("sidebarSelected") }
    static var selectedInk: Color { NativePalette.shared.color("accent") }
    static var border: Color { NativePalette.shared.color("sidebarBorder") }
    static var activeBorder: Color { NativePalette.shared.color("sidebarBorder") }
}

/// Desktop workspace/folder/team/collapse paths, rather than platform substitutions.
struct NativeSidebarIcon: View {
    let kind: String
    var body: some View {
        if kind == "schedules" || kind == "team" {
            // Desktop uses these glyphs directly in its feature navigation.
            Text(kind == "schedules" ? "◷" : "☷").font(.system(size: 22)).frame(width: 18, height: 18).accessibilityHidden(true)
        } else {
        Canvas { context, size in
            context.scaleBy(x: size.width / 24, y: size.height / 24)
            var path = Path()
            switch kind {
            case "home":
                path.move(to: CGPoint(x: 3, y: 10)); path.addLine(to: CGPoint(x: 12, y: 3)); path.addLine(to: CGPoint(x: 21, y: 10)); path.addLine(to: CGPoint(x: 21, y: 20)); path.addQuadCurve(to: CGPoint(x: 20, y: 21), control: CGPoint(x: 21, y: 21)); path.addLine(to: CGPoint(x: 4, y: 21)); path.addQuadCurve(to: CGPoint(x: 3, y: 20), control: CGPoint(x: 3, y: 21)); path.closeSubpath()
                path.move(to: CGPoint(x: 9, y: 21)); path.addLine(to: CGPoint(x: 9, y: 14)); path.addLine(to: CGPoint(x: 15, y: 14)); path.addLine(to: CGPoint(x: 15, y: 21))
            case "workspace":
                path.addRoundedRect(in: CGRect(x: 3, y: 3, width: 18, height: 18), cornerSize: CGSize(width: 3, height: 3))
                path.move(to: CGPoint(x: 3, y: 9)); path.addLine(to: CGPoint(x: 21, y: 9)); path.move(to: CGPoint(x: 9, y: 9)); path.addLine(to: CGPoint(x: 9, y: 21))
            case "folder":
                path.move(to: CGPoint(x: 3, y: 7)); path.addLine(to: CGPoint(x: 3, y: 5)); path.addQuadCurve(to: CGPoint(x: 5, y: 3), control: CGPoint(x: 3, y: 3)); path.addLine(to: CGPoint(x: 10, y: 3)); path.addLine(to: CGPoint(x: 13, y: 6)); path.addLine(to: CGPoint(x: 19, y: 6)); path.addQuadCurve(to: CGPoint(x: 21, y: 8), control: CGPoint(x: 21, y: 6)); path.addLine(to: CGPoint(x: 21, y: 19)); path.addQuadCurve(to: CGPoint(x: 19, y: 21), control: CGPoint(x: 21, y: 21)); path.addLine(to: CGPoint(x: 5, y: 21)); path.addQuadCurve(to: CGPoint(x: 3, y: 19), control: CGPoint(x: 3, y: 21)); path.closeSubpath()
            case "chat":
                path.move(to: CGPoint(x: 3, y: 4)); path.addLine(to: CGPoint(x: 13, y: 4)); path.addQuadCurve(to: CGPoint(x: 16, y: 7), control: CGPoint(x: 16, y: 4)); path.addLine(to: CGPoint(x: 16, y: 12)); path.addQuadCurve(to: CGPoint(x: 13, y: 15), control: CGPoint(x: 16, y: 15)); path.addLine(to: CGPoint(x: 8, y: 15)); path.addLine(to: CGPoint(x: 4, y: 18)); path.addLine(to: CGPoint(x: 4, y: 14)); path.addQuadCurve(to: CGPoint(x: 3, y: 12), control: CGPoint(x: 3, y: 14)); path.closeSubpath()
                path.move(to: CGPoint(x: 17, y: 8)); path.addLine(to: CGPoint(x: 20, y: 8)); path.addQuadCurve(to: CGPoint(x: 22, y: 10), control: CGPoint(x: 22, y: 8)); path.addLine(to: CGPoint(x: 22, y: 17)); path.addQuadCurve(to: CGPoint(x: 20, y: 19), control: CGPoint(x: 22, y: 19)); path.addLine(to: CGPoint(x: 17, y: 19)); path.addLine(to: CGPoint(x: 14, y: 21)); path.addLine(to: CGPoint(x: 14, y: 17))
            case "collapse":
                path.addRoundedRect(in: CGRect(x: 4, y: 4, width: 16, height: 5), cornerSize: CGSize(width: 1, height: 1)); path.addRoundedRect(in: CGRect(x: 4, y: 15, width: 16, height: 5), cornerSize: CGSize(width: 1, height: 1))
            default:
                for x in [CGFloat(3), 14] { for y in [CGFloat(3), 14] { path.addRoundedRect(in: CGRect(x: x, y: y, width: 7, height: 7), cornerSize: CGSize(width: 1, height: 1)) } }
            }
            context.stroke(path, with: .foreground, style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round))
        }.frame(width: 18, height: 18).accessibilityHidden(true)
        }
    }
}

struct NativeFeatureHeading: View {
    let title: String
    var body: some View {
        Text(title).font(NativePhonePreview.enabled ? .subheadline.weight(.semibold) : .title2.weight(.semibold))
            .lineLimit(1).fixedSize(horizontal: true, vertical: false).layoutPriority(1).foregroundStyle(.primary).accessibilityIdentifier("feature-page-label")
    }
}
enum NativeAddressSwipe {
    static func direction(x: CGFloat, y: CGFloat) -> Int? {
        guard x.isFinite, y.isFinite, abs(x) >= 48, abs(x) > abs(y) * 2 else { return nil }
        return x < 0 ? 1 : -1
    }
    static func chromeVisibility(delta: CGFloat) -> Bool? {
        guard delta.isFinite else { return nil }
        return delta < -72 ? true : delta > 32 ? false : nil
    }
}
private struct NativeTabStepKey: EnvironmentKey { static let defaultValue: ((Int) -> Void)? = nil }
extension EnvironmentValues {
    var nativeTabStep: ((Int) -> Void)? { get { self[NativeTabStepKey.self] } set { self[NativeTabStepKey.self] = newValue } }
}
struct NativeMainTabAdd: View {
    @EnvironmentObject private var shared: SharedAppStore
    @EnvironmentObject private var chrome: NativePhoneChrome
    var body: some View {
        Button { shared.open(nil, scope: "main") } label: { Image(systemName: "plus").frame(width: 44, height: 44) }.accessibilityLabel("New main tab").accessibilityIdentifier("phone-new-tab")
    }
}
private struct NativeFeaturePage: ViewModifier {
    @EnvironmentObject private var chrome: NativePhoneChrome
    let title: String
    var search: Binding<String>?
    /// A list shown inside another page (for example Chats inside a project) keeps its
    /// search but not a second title, drawer button or main + in the shared header.
    var embedded = false
    /// The page shows its own compact header (a chat inside a project on iPhone).
    var barHidden = false
    @Environment(\.nativePhoneAreaActive) private var active
    func body(content: Content) -> some View {
        if NativeDesignPreview.enabled && embedded {
            // Only the search field; the containing page owns the title and bar.
            content.safeAreaInset(edge: .bottom, spacing: 0) {
                if NativePhonePreview.enabled, let search { searchField(search).padding(.horizontal, 16).padding(.vertical, 8).background(NativeTheme.background) }
            }
        } else if NativeDesignPreview.enabled {
            content.navigationTitle("").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if NativePhonePreview.enabled {
                        ToolbarItem(placement: .topBarLeading) {
                            Button { chrome.captureCurrent(); withAnimation(.easeInOut(duration: 0.22)) { chrome.drawer = true } } label: { Image(systemName: "sidebar.left") }
                                .accessibilityLabel("App navigation").accessibilityIdentifier("phone-app-navigation")
                        }
                    }
                    if #available(iOS 26.0, *) {
                        ToolbarItem(placement: .topBarLeading) { NativeFeatureHeading(title: title) }.sharedBackgroundVisibility(.hidden)
                    } else {
                        ToolbarItem(placement: .topBarLeading) { NativeFeatureHeading(title: title) }
                    }
                    if NativePhonePreview.enabled { ToolbarItem(placement: .topBarTrailing) { NativeMainTabAdd() } }
                    if NativePadPreview.enabled, let search {
                        ToolbarItem(placement: .topBarTrailing) { searchField(search).frame(width: 230) }
                    }
                }
                .toolbar(NativePhonePreview.enabled && (chrome.controlsHidden || !active || barHidden) ? .hidden : .visible, for: .navigationBar)
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    if NativePhonePreview.enabled, let search { searchField(search).padding(.horizontal, 16).padding(.vertical, 8).background(NativeTheme.background) }
                }
                .simultaneousGesture(TapGesture(count: 2).onEnded { if NativePhonePreview.enabled { chrome.toggleControls() } })
        } else if let search { content.searchable(text: search) }
        else { content }
    }
    private func searchField(_ text: Binding<String>) -> some View {
        HStack { Image(systemName: "magnifyingglass"); TextField("Search", text: text).textInputAutocapitalization(.never).autocorrectionDisabled(); if !text.wrappedValue.isEmpty { Button { text.wrappedValue = "" } label: { Image(systemName: "xmark.circle.fill") }.accessibilityLabel("Clear search") } }
            .font(.subheadline).padding(11).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 20)).accessibilityIdentifier("feature-search")
    }
}
extension View {
    func nativeFeaturePage(_ title: String, search: Binding<String>? = nil, embedded: Bool = false, barHidden: Bool = false) -> some View { modifier(NativeFeaturePage(title: title, search: search, embedded: embedded, barHidden: barHidden)) }
}

struct NativePhoneTab: Identifiable {
    let id: String
    var title: String
    var symbol: String
    var detail: String
    var section: String = ""
    var sectionID: String = ""
    var preview: UIImage?
    var select: () -> Void
    var close: (() -> Void)? = nil
}

@MainActor final class NativePhoneChrome: ObservableObject {
    @Published var controlsHidden = false
    @Published var browserSurfaceScope: String?
    @Published var drawer = false
    @Published var overview = false
    @Published var overviewProgress: CGFloat = 0
    @Published var currentID = ""
    @Published var visited: [NativePhoneTab] = []
    @Published var recent: [NativePhoneTab] = []
    var interactedAt: [String: Date] = [:]
    var cacheNamespace = "anonymous"
    private var lastCapture: [String: Date] = [:]
    private var captureTask: Task<Void, Never>?
    private var delayedCapture: Task<Void, Never>?
    private var delayedCaptureID = ""
    private var previewRefreshTask: Task<Void, Never>?
    var browserOwnsBack = false
    /// A project/workspace tab is selected: swiping back returns to its home, not the pushed parent.
    var contentOwnsBack = false
    var snapshot: (() -> UIImage?)?
    var showTabs: (() -> Void)?
    var activateArea: ((String) -> Void)?
    var newMainChat: ((Bool) -> Void)?

    func refreshThumbnails() {
        guard previewRefreshTask == nil else { return }
        previewRefreshTask = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: .milliseconds(60)) } catch { return }
            guard let self else { return }; previewRefreshTask = nil
            for index in visited.indices where visited[index].preview == nil {
                if let image = NativeThumbnailCache.load(cacheNamespace + ":" + visited[index].id) { visited[index].preview = image }
            }
            objectWillChange.send()
        }
    }

    func reset() { captureTask?.cancel(); captureTask = nil; delayedCapture?.cancel(); delayedCapture = nil; delayedCaptureID = ""; lastCapture = [:]; visited = []; recent = []; interactedAt = [:]; currentID = ""; snapshot = nil; overview = false; overviewProgress = 0; controlsHidden = false; browserSurfaceScope = nil; drawer = false; browserOwnsBack = false; contentOwnsBack = false }
    func register(_ item: NativePhoneTab) {
        if captureTask == nil {
            captureTask = Task { @MainActor [weak self] in
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(20)) } catch { return }
                    guard let self else { return }; self.captureCurrent()
                }
            }
        }
        if let index = visited.firstIndex(where: { $0.id == item.id }) {
            var updated = item
            updated.preview = item.preview ?? visited[index].preview ?? NativeThumbnailCache.load(cacheNamespace + ":" + item.id)
            visited[index] = updated
        } else { var cached = item; cached.preview = item.preview ?? NativeThumbnailCache.load(cacheNamespace + ":" + item.id); visited.append(cached); if visited.count > 24 { visited.removeFirst(visited.count - 24) } }
        if currentID != item.id { record(item) }
        currentID = item.id
        scheduleCapture()
    }
    func record(_ item: NativePhoneTab) { interactedAt[item.id] = Date(); recent.removeAll { $0.id == item.id }; recent.insert(item, at: 0); if recent.count > 50 { recent.removeLast(recent.count - 50) } }
    func captureCurrent() {
        guard UIApplication.shared.applicationState == .active, currentID.hasPrefix("chat:") || currentID.hasPrefix("document:"), !overview, !drawer, Date().timeIntervalSince(lastCapture[currentID] ?? .distantPast) >= 5, let index = visited.firstIndex(where: { $0.id == currentID }), let image = snapshot?() else { return }
        visited[index].preview = image
        NativeThumbnailCache.save(image, key: cacheNamespace + ":" + currentID)
        lastCapture[currentID] = Date()
    }
    func scheduleCapture() {
        let expected = currentID
        guard expected.hasPrefix("chat:") || expected.hasPrefix("document:") else { return }
        guard Date().timeIntervalSince(lastCapture[expected] ?? .distantPast) > 5 else { return }
        if delayedCapture != nil && delayedCaptureID == expected { return }
        delayedCapture?.cancel(); delayedCaptureID = expected
        delayedCapture = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: .milliseconds(700)) } catch { return }
            guard let self else { return }; delayedCapture = nil; delayedCaptureID = ""
            if currentID == expected { captureCurrent() }
        }
    }
    func setControlsHidden(_ hidden: Bool) {
        guard controlsHidden != hidden else { return }
        withAnimation(UIAccessibility.isReduceMotionEnabled ? nil : .easeInOut(duration: 0.18)) { controlsHidden = hidden }
    }
    func toggleControls() { setControlsHidden(!controlsHidden) }
    func beginOverview() {
        guard !overview else { return }
        overview = true; overviewProgress = 0
    }
    func pinch(_ scale: CGFloat) {
        beginOverview()
        overviewProgress = min(1, max(0, (1 - scale) / 0.48))
    }
    func finishPinch(committed: Bool) {
        withAnimation(UIAccessibility.isReduceMotionEnabled ? .linear(duration: 0.01) : .spring(response: 0.38, dampingFraction: 0.9)) { overviewProgress = committed ? 1 : 0 }
        if !committed { Task { @MainActor in try? await Task.sleep(for: .milliseconds(400)); if overviewProgress == 0 { overview = false } } }
    }
    func openOverview() { beginOverview(); finishPinch(committed: true) }
    func closeOverview(select item: NativePhoneTab? = nil) {
        if let item { currentID = item.id; item.select() }
        finishPinch(committed: false)
    }
}

/// A weak capture hook for the visible surface; cached captures never load another page.
struct NativePhoneSurface: UIViewRepresentable {
    let chrome: NativePhoneChrome
    var overviewEnabled = false
    func makeCoordinator() -> InteractionObserver { InteractionObserver() }
    func makeUIView(context: Context) -> UIView { let view = UIView(); view.isUserInteractionEnabled = false; return view }
    func updateUIView(_ view: UIView, context: Context) {
        context.coordinator.chrome = chrome; context.coordinator.surface = view; context.coordinator.overviewEnabled = overviewEnabled
        DispatchQueue.main.async { [weak observer = context.coordinator] in observer?.install() }
        chrome.snapshot = { [weak view] in
            guard let view, let window = view.window, view.bounds.width > 20, view.bounds.height > 20 else { return nil }
            let rect = view.convert(view.bounds, to: window)
            let format = UIGraphicsImageRendererFormat(); format.scale = 1
            return UIGraphicsImageRenderer(size: rect.size, format: format).image { _ in
                window.drawHierarchy(in: CGRect(x: -rect.minX, y: -rect.minY, width: window.bounds.width, height: window.bounds.height), afterScreenUpdates: false)
            }
        }
        chrome.scheduleCapture()
    }
    static func dismantleUIView(_ view: UIView, coordinator: InteractionObserver) { coordinator.remove() }
    final class InteractionObserver: NSObject, UIGestureRecognizerDelegate {
        weak var chrome: NativePhoneChrome?
        weak var surface: UIView?
        var overviewEnabled = false
        private weak var host: UIWindow?
        private var gestures: [UIGestureRecognizer] = []
        func install() {
            guard let window = surface?.window, host !== window else { return }
            remove(); host = window
            let tap = UITapGestureRecognizer(target: self, action: #selector(interacted(_:)))
            let pan = UIPanGestureRecognizer(target: self, action: #selector(interacted(_:)))
            let pinch = UIPinchGestureRecognizer(target: self, action: #selector(pinched(_:)))
            gestures = [tap, pan, pinch]
            for gesture in gestures { gesture.cancelsTouchesInView = false; gesture.delaysTouchesBegan = false; gesture.delaysTouchesEnded = false; gesture.delegate = self; window.addGestureRecognizer(gesture) }
        }
        func remove() { for gesture in gestures { host?.removeGestureRecognizer(gesture) }; gestures = []; host = nil }
        @objc private func pinched(_ gesture: UIPinchGestureRecognizer) {
            guard overviewEnabled, let chrome else { return }
            if gesture.state == .began || gesture.state == .changed { if gesture.scale < 0.98 { chrome.pinch(gesture.scale) } }
            else if gesture.state == .ended, chrome.overview { chrome.finishPinch(committed: gesture.scale < 0.75) }
            else if gesture.state == .cancelled || gesture.state == .failed, chrome.overview { chrome.finishPinch(committed: false) }
        }
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool { !(gestureRecognizer is UIPinchGestureRecognizer) || overviewEnabled }
        @objc private func interacted(_ gesture: UIGestureRecognizer) { if gesture.state == .ended { chrome?.scheduleCapture() } }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool { guard let surface else { return false }; return surface.bounds.contains(touch.location(in: surface)) }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool { true }
    }
}

/// Keep UIKit's interactive previous-page reveal when the visible Back button is removed.
struct NativePhoneBackNavigation: ViewModifier {
    func body(content: Content) -> some View {
        if NativePhonePreview.enabled {
            content.navigationBarBackButtonHidden(true).background(PhonePopBridge().frame(width: 0, height: 0))
        } else { content }
    }
}
private struct PhonePopBridge: UIViewControllerRepresentable {
    @EnvironmentObject private var chrome: NativePhoneChrome
    func makeUIViewController(context: Context) -> PopController { PopController() }
    func updateUIViewController(_ controller: PopController, context: Context) { controller.chrome = chrome; controller.install() }
    final class PopController: UIViewController, UIGestureRecognizerDelegate {
        weak var chrome: NativePhoneChrome?
        private weak var pop: UIGestureRecognizer?
        private weak var formerDelegate: UIGestureRecognizerDelegate?
        private weak var contentPop: UIGestureRecognizer?
        private weak var formerContentDelegate: UIGestureRecognizerDelegate?
        override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); install() }
        func install() {
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                guard let nav = self.navigationController, let gesture = nav.interactivePopGestureRecognizer else { return }
                if gesture.delegate !== self { self.formerDelegate = gesture.delegate; self.pop = gesture; gesture.delegate = self }
                gesture.isEnabled = nav.viewControllers.count > 1
                if #available(iOS 26.0, *), let contentGesture = nav.interactiveContentPopGestureRecognizer {
                    if contentGesture.delegate !== self { self.formerContentDelegate = contentGesture.delegate; self.contentPop = contentGesture; contentGesture.delegate = self }
                    contentGesture.isEnabled = nav.viewControllers.count > 1
                }
            }
        }
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let nav = navigationController, nav.viewControllers.count > 1, nav.transitionCoordinator == nil, chrome?.browserOwnsBack != true, chrome?.contentOwnsBack != true else { return false }
            // iOS 26 also installs a content pan. Reserve only its leading edge for app Back.
            if gestureRecognizer === contentPop {
                guard gestureRecognizer.location(in: nav.view).x <= 64, let pan = gestureRecognizer as? UIPanGestureRecognizer else { return false }
                let velocity = pan.velocity(in: nav.view)
                guard velocity.x > 0, velocity.x > abs(velocity.y) else { return false }
            }
            chrome?.captureCurrent()
            return true
        }
        override func viewWillDisappear(_ animated: Bool) {
            if pop?.delegate === self { pop?.delegate = formerDelegate }
            if contentPop?.delegate === self { contentPop?.delegate = formerContentDelegate }
            super.viewWillDisappear(animated)
        }
    }
}

struct NativePhoneOverview: View {
    @ObservedObject var chrome: NativePhoneChrome
    let items: [NativePhoneTab]
    var title = "Tabs"
    var selectedID: String? = nil
    var accessibilityID = "phone-tab-overview"
    @State private var positionedInitially = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var sections: [(id: String, title: String, items: [NativePhoneTab])] {
        var result: [(id: String, title: String, items: [NativePhoneTab])] = []
        for item in items { let id = item.sectionID.isEmpty ? item.section : item.sectionID; if let index = result.indices.last, result[index].id == id { result[index].items.append(item) } else { result.append((id, item.section, [item])) } }
        return result
    }
    private var activeID: String { selectedID ?? chrome.currentID }
    private var current: NativePhoneTab? { items.first { $0.id == activeID } }
    var body: some View {
        GeometryReader { geometry in
            let p = chrome.overviewProgress
            // Pin the width before aspect-fill: a tall WebKit snapshot must never
            // contribute its intrinsic width to a flexible grid column.
            let columns = NativePadPreview.enabled ? 3 : 2
            let tileWidth = max(1, (geometry.size.width - 36 - CGFloat(columns - 1) * 18) / CGFloat(columns))
            ZStack(alignment: .topLeading) {
                VStack(spacing: 0) {
                    HStack {
                        Text(title).font(.title2.bold()); Spacer()
                        Button("Done") { chrome.closeOverview() }.frame(minWidth: 44, minHeight: 44)
                    }.padding(.horizontal, 20)
                    ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                        ForEach(Array(sections.enumerated()), id: \.offset) { _, section in
                        if !section.title.isEmpty { Text(section.title).font(.headline).padding(.horizontal, 18) }
                        LazyVGrid(columns: Array(repeating: GridItem(.fixed(tileWidth), alignment: .top), count: columns), spacing: 18) {
                            ForEach(section.items) { item in
                                Button { chrome.closeOverview(select: item) } label: {
                                    VStack(alignment: .leading, spacing: 7) {
                                        Group {
                                            if let image = item.preview { Image(uiImage: image).resizable().scaledToFill().frame(width: tileWidth, height: 225, alignment: .top).clipped() }
                                            else { VStack(spacing: 12) { Image(systemName: item.symbol).font(.title); Text("Preview unavailable").font(.caption) }.frame(maxWidth: .infinity, maxHeight: .infinity).background(NativeTheme.surface) }
                                        }.frame(width: tileWidth, height: 225).clipShape(RoundedRectangle(cornerRadius: 15))
                                            .overlay { RoundedRectangle(cornerRadius: 15).stroke(item.id == activeID ? NativeTheme.accent : NativeTheme.line, lineWidth: 1) }
                                            .background(GeometryReader { tile in Color.clear.preference(key: PhoneTabRects.self, value: [item.id: tile.frame(in: .named("phone-overview"))]) })
                                        Label(item.title, systemImage: item.symbol).font(.caption).lineLimit(2)
                                        Text(item.detail).font(.caption2).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                                    }.frame(width: tileWidth, alignment: .leading).contentShape(Rectangle())
                                }.buttonStyle(.plain).accessibilityIdentifier("phone-tab-" + item.id).id(item.id)
                            }
                        }.padding(18)
                        }
                        }
                    }
                    // Open on the current tab, centred (the last tab naturally rests at the bottom), as on desktop.
                    .task {
                        guard !positionedInitially, items.contains(where: { $0.id == activeID }) else { return }
                        positionedInitially = true
                        await Task.yield()
                        guard !Task.isCancelled else { return }
                        proxy.scrollTo(activeID, anchor: .center)
                    }
                    }
                }.background(NativeTheme.background).opacity(reduceMotion ? p : max(0, (p - 0.12) / 0.88))
            }.coordinateSpace(name: "phone-overview")
            // Consume tile geometry as an overlay preference, never as parent @State.
            // Writing each scrolling/lazy-grid rect back into layout creates a frame loop.
            .overlayPreferenceValue(PhoneTabRects.self, alignment: .topLeading) { targets in
                if !reduceMotion, p < 0.999, let image = current?.preview {
                    let rect = targets[activeID] ?? CGRect(x: 18, y: 70, width: (geometry.size.width - 48) / 2, height: 225)
                    Image(uiImage: image).resizable().scaledToFill()
                        .frame(width: geometry.size.width + (rect.width - geometry.size.width) * p, height: geometry.size.height + (rect.height - geometry.size.height) * p, alignment: .top)
                        .clipped().clipShape(RoundedRectangle(cornerRadius: 15 * p))
                        .offset(x: rect.minX * p, y: rect.minY * p).allowsHitTesting(false)
                }
            }
        }.background(NativeTheme.background.opacity(chrome.overviewProgress)).clipped().accessibilityElement(children: .contain).accessibilityIdentifier(accessibilityID)
    }
}
private struct PhoneTabRects: PreferenceKey {
    static var defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) { value.merge(nextValue(), uniquingKeysWith: { _, new in new }) }
}

extension View {
    @ViewBuilder func nativePhoneDestination<Destination: View>(isPresented: Binding<Bool>, @ViewBuilder destination: @escaping () -> Destination) -> some View {
        if NativePhonePreview.enabled { navigationDestination(isPresented: isPresented, destination: destination) } else { self }
    }
}

private struct NativePhoneAreaActiveKey: EnvironmentKey { static var defaultValue = true }
extension EnvironmentValues {
    var nativePhoneAreaActive: Bool {
        get { self[NativePhoneAreaActiveKey.self] }
        set { self[NativePhoneAreaActiveKey.self] = newValue }
    }
}

/// Private, bounded last-good images. This cache never loads an unloaded page.
enum NativeThumbnailCache {
    private static let writer = DispatchQueue(label: "org.proteusapp.review.proteus.thumbnail-cache", qos: .utility)
    private static let images: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>(); cache.countLimit = 100; cache.totalCostLimit = 20 * 1024 * 1024; return cache
    }()
    private static let lock = NSLock()
    private static var requested: [String: Date] = [:]
    private static var directory: URL { URL.applicationSupportDirectory.appending(path: "tab-thumbnails", directoryHint: .isDirectory) }
    private static func file(_ key: String) -> URL { directory.appending(path: SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined() + ".jpg") }
    static func load(_ key: String) -> UIImage? {
        if let image = images.object(forKey: key as NSString) { return image }
        lock.lock()
        let recent = Date().timeIntervalSince(requested[key] ?? .distantPast) < 30
        if !recent {
            requested[key] = Date()
            if requested.count > 512 { for old in requested.sorted(by: { $0.value < $1.value }).prefix(requested.count - 512) { requested.removeValue(forKey: old.key) } }
        }
        lock.unlock()
        guard !recent else { return nil }
        // Overview construction never performs one filesystem read per tab on
        // the main thread. Missing files are negatively cached, too.
        writer.async {
            let url = file(key)
            guard let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize, size <= 262144, let data = try? Data(contentsOf: url), let image = UIImage(data: data)?.preparingForDisplay() else { return }
            images.setObject(image, forKey: key as NSString, cost: image.cgImage.map { $0.bytesPerRow * $0.height } ?? data.count)
            DispatchQueue.main.async { NotificationCenter.default.post(name: Notification.Name("ProteusThumbnailReady"), object: nil) }
        }
        return nil
    }
    static func save(_ image: UIImage, key: String) {
        images.setObject(image, forKey: key as NSString, cost: image.cgImage.map { $0.bytesPerRow * $0.height } ?? 262144)
        writer.async { autoreleasepool { write(image, key: key) } }
    }
    private static func write(_ image: UIImage, key: String) {
        let width = min(360, image.size.width), height = image.size.height * width / max(1, image.size.width)
        guard width > 0, height > 0, height < 4096 else { return }
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        let resized = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format).image { _ in image.draw(in: CGRect(x: 0, y: 0, width: width, height: height)) }
        guard let data = resized.jpegData(compressionQuality: 0.65), data.count <= 262144 else { return }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            try data.write(to: file(key), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey]).filter { $0.pathExtension == "jpg" }.sorted { ((try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) > ((try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) }
            var bytes = 0
            for (index, url) in files.enumerated() { bytes += (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0; if index >= 200 || bytes > 24 * 1024 * 1024 { try? FileManager.default.removeItem(at: url) } }
        } catch { /* Keep the previous good preview and the icon fallback. */ }
    }
    static func remove(_ key: String) { images.removeObject(forKey: key as NSString); writer.async { try? FileManager.default.removeItem(at: file(key)); images.removeObject(forKey: key as NSString) } }
}

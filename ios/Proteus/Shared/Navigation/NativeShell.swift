import SwiftUI
import UIKit
private struct NativeSelectResourceKey: EnvironmentKey { static let defaultValue: ((String, String) -> Void)? = nil }
extension EnvironmentValues {
    var nativeSelectResource: ((String, String) -> Void)? {
        get { self[NativeSelectResourceKey.self] }
        set { self[NativeSelectResourceKey.self] = newValue }
    }
}
private struct NativeOpenChatSetupKey: EnvironmentKey {
    static let defaultValue: ((NativeChatSetup) -> Void)? = nil
}
extension EnvironmentValues {
    var nativeOpenChatSetup: ((NativeChatSetup) -> Void)? {
        get { self[NativeOpenChatSetupKey.self] }
        set { self[NativeOpenChatSetupKey.self] = newValue }
    }
}
enum NativeTheme {
    static var accent: Color { NativePalette.shared.color("accent") }
    static var background: Color { NativePalette.shared.color("background") }
    static var surface: Color { NativePalette.shared.color("panel") }
    static var rail: Color { NativePalette.shared.color("sidebar") }
    static var line: Color { NativePalette.shared.color("border") }
    static var tabBackground: Color { NativePalette.shared.color("tab") }
    static var tabText: Color { NativePalette.shared.color("tabText") }
}

extension View {
    func nativeTabBar() -> some View { frame(height: 44).font(.system(size: 14, weight: .medium)).foregroundStyle(NativeTheme.tabText).background(NativeTheme.tabBackground) }
}
enum NativeTabSymbol {
    static func name(kind: String, chatType: String = "", mediaType: String = "") -> String {
        switch kind {
        case "chat-setup": return "square.and.pencil"
        case "chat": return chatType == "internet" ? "magnifyingglass" : "bubble.left.and.bubble.right"
        case "workspace": return "square.grid.2x2"
        case "schedule": return "calendar"
        case "browser": return "globe"
        case "terminal": return "terminal"
        case "document": return mediaType == "text/html" ? "doc.richtext" : "doc.text"
        case "live": return "rectangle.on.rectangle"
        default: return "square"
        }
    }
}
struct NativeContentTabLabel: View {
    let title: String
    let symbol: String
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: symbol).accessibilityHidden(false).accessibilityIdentifier("native-tab-icon-" + symbol)
            Text(title).lineLimit(1)
        }.accessibilityLabel(title)
    }
}
struct NativeTabReorderSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var items: [(id: String, title: String)]
    var onOrder: ([String]) -> Void
    var body: some View {
        NavigationStack {
            List { ForEach(items, id: \.id) { item in Text(item.title).lineLimit(2) }.onMove { source, target in items.move(fromOffsets: source, toOffset: target); onOrder(items.map(\.id)) } }
                .environment(\.editMode, .constant(.active))
                .navigationTitle("Reorder tabs").navigationBarTitleDisplayMode(.inline)
                .toolbar { Button("Done") { dismiss() } }
        }
    }
}
/// Content-relative edges also work beside an iPad sidebar. Keep vertical scrolling,
/// selection and middle-of-page horizontal controls available.
/// On iPhone it is attached only where UIKit's pop gesture cannot express the step
/// (a project tab returning to its project home); `phone` must not change for one view.
///
/// The swipe is interactive like Safari and UIKit's pop: the page follows the finger over the
/// last image of the destination (the previous web page, project home or workspace), then
/// settles or springs back. A swipe that starts at a content edge takes priority over scroll
/// views and tab strips beneath it. Browsers use this rather than WebKit's own recognizer so
/// one handler moves saved history, beside a pinned iPad sidebar too.
struct NativePageSwipe: ViewModifier {
    var enabled = true
    var phone = false
    var blockBack = false
    var blockForward = false
    var back: (() -> Void)?
    var forward: (() -> Void)? = nil
    /// Slide the page with the finger. Off for steps that animate themselves (UIKit pushes).
    var interactive = true
    var backPreview: (() -> UIImage?)? = nil
    var forwardPreview: (() -> UIImage?)? = nil
    @State private var offset: CGFloat = 0
    @State private var preview: UIImage?
    @State private var width: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        if NativePhonePreview.enabled && !phone { content }
        else {
            ZStack(alignment: .topLeading) {
                if offset != 0 {
                    // The destination sits slightly behind the page, as in a navigation pop.
                    Group { if let preview { Image(uiImage: preview).resizable().scaledToFill() } else { NativeTheme.background } }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top).clipped()
                        .offset(x: offset > 0 ? (offset - width) * 0.3 : (width + offset) * 0.3)
                        .overlay { Color.black.opacity(0.18 * (1 - min(1, abs(offset) / max(1, width)))) }
                        .allowsHitTesting(false).accessibilityHidden(true)
                }
                content.offset(x: offset).shadow(color: .black.opacity(offset == 0 ? 0 : 0.25), radius: 10)
            }
            // Clip only while sliding: at rest, content such as the iPhone browser bar extends
            // into the home-indicator area and must not be cut off.
            .clipShape(Rectangle().inset(by: offset == 0 ? -400 : 0))
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
            .background(NativeEdgePan(
                canBegin: { isBack, _ in enabled && (isBack ? (!blockBack && back != nil) : (!blockForward && forward != nil)) },
                changed: { isBack, dx in
                    guard interactive else { return }
                    if offset == 0 { preview = isBack ? backPreview?() : forwardPreview?() }
                    offset = isBack ? max(0, dx) : min(0, dx)
                },
                ended: { isBack, dx, velocity in
                    let distance = max(80, min(150, width * 0.3)), commit = isBack ? (dx > distance || velocity > 500) && dx > 20 : (dx < -distance || velocity < -500) && dx < -20
                    let action = isBack ? back : forward
                    guard interactive else { if commit { action?() }; return }
                    if commit {
                        withAnimation(reduceMotion ? .linear(duration: 0.01) : .easeOut(duration: 0.2)) { offset = isBack ? width : -width } completion: {
                            action?()
                            var instant = Transaction(); instant.disablesAnimations = true
                            withTransaction(instant) { offset = 0; preview = nil }
                        }
                    } else {
                        withAnimation(reduceMotion ? .linear(duration: 0.01) : .spring(response: 0.3, dampingFraction: 0.9)) { offset = 0 } completion: { preview = nil }
                    }
                }))
        }
    }
}
/// Window-level pan restricted to one surface's 56-point edges. It is required to fail
/// before scroll views beneath it, so an edge swipe wins over scrolling and tab strips,
/// while touches elsewhere never reach it.
struct NativeEdgePan: UIViewRepresentable {
    var canBegin: (_ back: Bool, _ atScreenEdge: Bool) -> Bool
    var changed: (_ back: Bool, _ dx: CGFloat) -> Void
    var ended: (_ back: Bool, _ dx: CGFloat, _ velocity: CGFloat) -> Void
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView { let view = UIView(); view.isUserInteractionEnabled = false; view.backgroundColor = .clear; return view }
    func updateUIView(_ view: UIView, context: Context) {
        context.coordinator.canBegin = canBegin; context.coordinator.changed = changed; context.coordinator.ended = ended; context.coordinator.surface = view
        DispatchQueue.main.async { [weak coordinator = context.coordinator] in coordinator?.install() }
    }
    static func dismantleUIView(_ view: UIView, coordinator: Coordinator) { coordinator.remove() }
    @MainActor final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var canBegin: (Bool, Bool) -> Bool = { _, _ in false }
        var changed: (Bool, CGFloat) -> Void = { _, _ in }
        var ended: (Bool, CGFloat, CGFloat) -> Void = { _, _, _ in }
        weak var surface: UIView?
        private weak var host: UIWindow?
        private var pan: UIPanGestureRecognizer?
        private var back = true
        static let edge: CGFloat = 56
        func install() {
            guard let window = surface?.window, host !== window else { return }
            remove(); host = window
            let recognizer = UIPanGestureRecognizer(target: self, action: #selector(panned(_:)))
            recognizer.maximumNumberOfTouches = 1; recognizer.delegate = self; recognizer.cancelsTouchesInView = true
            window.addGestureRecognizer(recognizer); pan = recognizer
        }
        func remove() { if let pan { host?.removeGestureRecognizer(pan) }; pan = nil; host = nil }
        private func edgeSide(_ point: CGPoint, in surface: UIView) -> Bool? {
            guard surface.bounds.width > Self.edge * 2, surface.bounds.contains(point) else { return nil }
            if point.x <= Self.edge { return true }
            if point.x >= surface.bounds.width - Self.edge { return false }
            return nil
        }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
            guard let surface, surface.window != nil, !surface.isHidden, surface.alpha > 0.01 else { return false }
            return edgeSide(touch.location(in: surface), in: surface) != nil
        }
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let surface, let pan = gestureRecognizer as? UIPanGestureRecognizer, let window = surface.window else { return false }
            let start = pan.location(in: surface), translation = pan.translation(in: surface)
            guard let side = edgeSide(CGPoint(x: start.x - translation.x, y: start.y - translation.y), in: surface) else { return false }
            let velocity = pan.velocity(in: surface)
            guard abs(velocity.x) > abs(velocity.y) * 1.5, side ? velocity.x > 0 : velocity.x < 0 else { return false }
            let x = pan.location(in: window).x - translation.x
            back = side
            return canBegin(side, x <= 24 || x >= window.bounds.width - 24)
        }
        // Edge swipes win over scrolling and horizontal tab strips under the edge.
        // SwiftUI hosts representables (WKWebView, hosted lists) as siblings, so match by on-screen overlap.
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
            guard let surface, other is UIPanGestureRecognizer, let view = other.view, other !== gestureRecognizer, !(other.delegate is Coordinator) else { return false }
            guard view is UIScrollView || view.superview is UIScrollView else { return false }
            return view.convert(view.bounds, to: nil).intersects(surface.convert(surface.bounds, to: nil))
        }
        // Taps, long presses and page touch tracking continue alongside an edge pan.
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { !(other is UIPanGestureRecognizer) }
        @objc private func panned(_ gesture: UIPanGestureRecognizer) {
            guard let surface else { return }
            let dx = gesture.translation(in: surface).x
            switch gesture.state {
            case .changed: changed(back, dx)
            case .ended: ended(back, dx, gesture.velocity(in: surface).x)
            case .cancelled, .failed: ended(back, 0, 0)
            default: break
            }
        }
    }
}
/// Last image of a screen, shown beneath an interactive edge swipe back to it. Bounded and
/// memory-only; a missing image falls back to the page background.
@MainActor enum NativeScreenMemory {
    private static var images: [String: UIImage] = [:]
    private static var order: [String] = []
    static func remember(_ key: String, frame: CGRect) {
        guard frame.width > 20, frame.height > 20, let window = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first else { return }
        let format = UIGraphicsImageRendererFormat(); format.scale = min(2, window.screen.scale)
        let image = UIGraphicsImageRenderer(size: frame.size, format: format).image { _ in
            window.drawHierarchy(in: CGRect(x: -frame.minX, y: -frame.minY, width: window.bounds.width, height: window.bounds.height), afterScreenUpdates: false)
        }
        store(key, image)
    }
    static func store(_ key: String, _ image: UIImage) {
        images[key] = image; order.removeAll { $0 == key }; order.append(key)
        while order.count > 16 { images.removeValue(forKey: order.removeFirst()) }
    }
    static func image(_ key: String) -> UIImage? { images[key] }
}
private struct NativeBackPreviewKey: EnvironmentKey { static let defaultValue: String? = nil }
extension EnvironmentValues {
    /// NativeScreenMemory key of the screen a contained page returns to (its project home).
    var nativeBackPreviewKey: String? { get { self[NativeBackPreviewKey.self] } set { self[NativeBackPreviewKey.self] = newValue } }
}
private struct NativeSidebarToggleKey: EnvironmentKey { static let defaultValue: (() -> Void)? = nil }
extension EnvironmentValues {
    /// Set by the iPad shell when a workspace tab owns the sidebar button in its project bar.
    var nativeSidebarToggle: (() -> Void)? { get { self[NativeSidebarToggleKey.self] } set { self[NativeSidebarToggleKey.self] = newValue } }
}
/// The one sidebar control. iPhone opens the drawer; iPad toggles the pinned sidebar.
/// Neither opens from an edge swipe, so content edges stay free for Back/Forward.
struct NativeSidebarButton: View {
    @EnvironmentObject private var chrome: NativePhoneChrome
    @Environment(\.nativeSidebarToggle) private var toggle
    var body: some View {
        if NativePhonePreview.enabled {
            Button { chrome.captureCurrent(); withAnimation(.easeInOut(duration: 0.22)) { chrome.drawer = true } } label: { Image(systemName: "sidebar.left").frame(width: 44, height: 44).contentShape(Rectangle()) }
                .buttonStyle(.plain).accessibilityLabel("App navigation").accessibilityIdentifier("phone-app-navigation")
        } else if let toggle {
            Button(action: toggle) { Image(systemName: "sidebar.left").frame(width: 44, height: 44).contentShape(Rectangle()) }
                .buttonStyle(.plain).accessibilityLabel("Toggle sidebar").accessibilityIdentifier("project-sidebar-toggle").keyboardShortcut("s", modifiers: [.command, .option])
        }
    }
}
/// Reveal newly opened content once, while retaining the offset when selecting existing tabs.
struct NativeTabStrip<Content: View>: View {
    let ids: [String]
    let selection: String?
    @ViewBuilder var content: () -> Content
    /// Which ends have tabs scrolled out of view; each such edge fades.
    @State private var clipped = NativeTabEdges()
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) { content().background(NativeTabClipProbe(onEdges: { if clipped != $0 { clipped = $0 } }).frame(width: 1, height: 1).opacity(0)) }
                .mask { LinearGradient(stops: [.init(color: clipped.leading ? .clear : .black, location: 0), .init(color: .black, location: clipped.leading ? 0.07 : 0), .init(color: .black, location: clipped.trailing ? 0.93 : 1), .init(color: clipped.trailing ? .clear : .black, location: 1)], startPoint: .leading, endPoint: .trailing) }
                // A newly shown strip (for example a project opened from Chats) reveals its selection.
                .onAppear { guard let selection else { return }; Task { @MainActor in await Task.yield(); proxy.scrollTo(selection, anchor: .center) } }
                .onChange(of: ids) { old, new in
                    guard let added = new.last(where: { !old.contains($0) }) else { return }
                    Task { @MainActor in await Task.yield(); proxy.scrollTo(added, anchor: .trailing) }
                }
                .onChange(of: selection) { _, selected in
                    guard let selected else { return }
                    Task { @MainActor in await Task.yield(); proxy.scrollTo(selected, anchor: .center) }
                }
        }
    }
}
struct NativeTabEdges: Equatable { var leading = false; var trailing = false }
struct NativeTabClipProbe: UIViewRepresentable {
    var onChange: (Bool) -> Void = { _ in }
    var onEdges: (NativeTabEdges) -> Void = { _ in }
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView { UIView(frame: .zero) }
    func updateUIView(_ view: UIView, context: Context) {
        context.coordinator.onChange = onChange; context.coordinator.onEdges = onEdges
        context.coordinator.attach(from: view)
        DispatchQueue.main.async { [weak view, weak coordinator = context.coordinator] in if let view, let coordinator { coordinator.attach(from: view) } }
    }
    static func dismantleUIView(_ view: UIView, coordinator: Coordinator) { coordinator.offsetObservation = nil; coordinator.sizeObservation = nil; coordinator.boundsObservation = nil; coordinator.scrollView = nil }
    @MainActor final class Coordinator: NSObject {
        weak var scrollView: UIScrollView?
        var offsetObservation: NSKeyValueObservation?
        var sizeObservation: NSKeyValueObservation?
        var boundsObservation: NSKeyValueObservation?
        var onChange: (Bool) -> Void = { _ in }
        var onEdges: (NativeTabEdges) -> Void = { _ in }
        func attach(from view: UIView) {
            guard scrollView == nil else { return }
            var parent = view.superview
            while let current = parent {
                if let scroll = current as? UIScrollView {
                    scrollView = scroll
                    offsetObservation = scroll.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in Task { @MainActor [weak self] in self?.report() } }
                    sizeObservation = scroll.observe(\.contentSize, options: [.new]) { [weak self] _, _ in Task { @MainActor [weak self] in self?.report() } }
                    boundsObservation = scroll.observe(\.bounds, options: [.new]) { [weak self] _, _ in Task { @MainActor [weak self] in self?.report() } }
                    report()
                    return
                }
                parent = current.superview
            }
        }
        private func report() {
            guard let scrollView else { return }
            let trailing = scrollView.contentOffset.x + scrollView.bounds.width < scrollView.contentSize.width - 2
            onChange(trailing); onEdges(NativeTabEdges(leading: scrollView.contentOffset.x > 2, trailing: trailing))
        }
    }
}
enum NativeNavigationCounts {
    private static func exactCount(_ value: JSON) -> Int? {
        guard case .number(let count) = value, count.isFinite, count >= 0, count.rounded(.towardZero) == count, count < Double(Int.max) else { return nil }
        return Int(count)
    }
    static func chats(_ states: [JSON]) -> Int? {
        guard !states.isEmpty else { return nil }
        var hosts = Set<String>()
        var total = 0
        for state in states {
            guard state != .null else { return nil }
            let host = state["hostId"].string
            if !host.isEmpty && !hosts.insert(host).inserted { continue }
            if state["runningChatCount"] != .null {
                guard let count = exactCount(state["runningChatCount"]) else { return nil }
                total += count
            } else {
                // Older hosts have no full-history total. Count unique live rows only.
                guard case .array = state["runs"] else { return nil }
                total += Set(state["runs"].array.filter {
                    $0["status"].string == "running" && !$0["archived"].bool && $0["archivedAt"].string.isEmpty && !$0["id"].string.isEmpty
                }.map { $0["id"].string }).count
            }
        }
        return total
    }
    static func attention(_ states: [JSON]) -> Int? {
        guard !states.isEmpty else { return nil }
        let values = states.compactMap { state -> Int? in
            if let exact = exactCount(state["attentionCount"]) { return exact }
            guard state["attentionCount"] == .null, let total = exactCount(state["runCount"]), total <= 100,
                  case .array = state["runs"] else { return nil }
            let visible = state["runs"].array.filter { !$0["archived"].bool && $0["archivedAt"].string.isEmpty }
            guard visible.count == total,
                  Set(visible.map { $0["id"].string }).count == total,
                  visible.allSatisfy({ !$0["id"].string.isEmpty && ($0["attentionRequired"] == .bool(true) || $0["attentionRequired"] == .bool(false)) }) else { return nil }
            return visible.filter(nativeNeedsAttention).count
        }
        guard values.count == states.count else { return nil }
        return values.reduce(0, +)
    }
    static func schedules(_ states: [JSON]) -> Int? {
        guard !states.isEmpty, states.allSatisfy({ if case .array = $0["schedules"] { return true }; return false }) else { return nil }
        return states.reduce(0) { $0 + $1["schedules"].array.count }
    }
}
func nativeNeedsAttention(_ run: JSON) -> Bool {
    guard !run["archived"].bool, run["archivedAt"].string.isEmpty else { return false }
    if run["attentionRequired"] != .null { return run["attentionRequired"].bool }
    return run["status"].string == "awaiting_input" || (["failed", "interrupted"].contains(run["status"].string) && run["failureReviewedAt"].string.isEmpty)
}

private enum NativeArea: String, CaseIterable, Identifiable {
    case home = "Home", workspaces = "Workspaces", schedules = "Schedules", chats = "Chats", internet = "Internet Searches", attention = "Needs Attention", life = "Life", team = "Team", engine = "Engine Room"
    var id: String { rawValue }
    var sidebarTitle: String { NativeDesignPreview.enabled && self == .team ? "Team Tools" : rawValue }
    var icon: String { switch self { case .home: "house"; case .workspaces: "square.grid.2x2"; case .schedules: "calendar"; case .chats: "bubble.left.and.bubble.right"; case .internet: "magnifyingglass"; case .attention: "exclamationmark"; case .life: "heart"; case .team: "list.bullet.rectangle"; case .engine: "gearshape" } }
}
private struct NativeContentTab: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let kind: String
    let hostID: String?
    var setup: NativeChatSetup? = nil
    var resourceScope: String? = nil
    var sourceChatID: String? = nil
    var documentID: String? = nil
}
struct NotificationChatRequest: Equatable {
    let token = UUID()
    let hostID: String
    let chatID: String
}
private struct NotificationScheduleTarget: Identifiable {
    let id = UUID()
    let hostID: String
    let scheduleID: String
}
struct NativeShell: View {
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var area: NativeArea = .home
    @StateObject private var phoneChrome = NativePhoneChrome()
    @StateObject private var mainOverviewChrome = NativePhoneChrome()
    @State private var phoneVisited: Set<NativeArea> = [.home]
    @State private var phoneWorkspace: NativeWorkspaceIdentity?
    @AppStorage("nativeSidebarExpanded") private var sidebar = true
    @AppStorage("nativeTeamSection") private var teamSection = "Overview"
    @AppStorage("nativeLifeSection") private var lifeSection = "overview"
    @State private var hoverTask: Task<Void, Never>?
    @State private var hover = false
    @State private var opened: [NativeContentTab] = []
    @State private var reorderMainTabs = false
    @State private var selectedTab: String?
    @State private var restoredSelection: String?
    @State private var restoringTabs = true
    @State private var navigationReady = false
    @State private var notificationChatRequest: NotificationChatRequest?
    @State private var notificationScheduleTarget: NotificationScheduleTarget?
    @State private var shellRename: AggregateChat?
    @State private var shellTransfer: BrowserDescriptor?
    @State private var shellDelete: AggregateChat?
    @State private var enginePage = "Overview"
    @AppStorage("lifeEnabled") private var lifeEnabled = false
    @State private var attentionPreferredTab = "chats"
    @ObservedObject private var notifications = NativeNotifications.shared
    private var tablet: Bool { sizeClass == .regular && !NativePhonePreview.enabled }
    private var tabAccent: Color { NativeTheme.accent }
    private func count(for item: NativeArea) -> Int? {
        if item == .schedules { return destinations.selected.flatMap { $0.connected ? NativeNavigationCounts.schedules([$0.state]) : nil } }
        if item == .chats {
            let states: [JSON] = destinations.destinations.compactMap { destination in
                guard let remote = destinations.remote(for: destination.id), remote.connected else { return nil }
                var state = remote.state.object; state["hostId"] = .string(destination.id); return .object(state)
            }
            return NativeNavigationCounts.chats(states) ?? (states.isEmpty ? 0 : nil)
        }
        let remotes = destinations.destinations.map { destinations.remote(for: $0.id) }
        guard !remotes.isEmpty, remotes.allSatisfy({ $0?.connected == true }) else { return nil }
        let states = remotes.map { $0?.state ?? .null }
        switch item {
        case .chats: return NativeNavigationCounts.chats(states)
        case .attention: return NativeNavigationCounts.attention(states).map { $0 + nativeAttentionItems(destinations).count }
        default: return nil
        }
    }
    private var activeArea: NativeArea? {
        guard let tab = opened.first(where: { $0.id == selectedTab }) else { return area }
        switch tab.kind { case "workspace": return .workspaces; case "chat": switch nativeChatType(chatEntry(for: tab)?.run ?? .null) { case "internet": return .internet; case "scheduled": return .schedules; default: return .chats }; case "schedule": return .schedules; default: return nil }
    }
    /// The workspace whose project tabs the sidebar mirrors.
    private var activeWorkspaceIdentity: NativeWorkspaceIdentity? {
        if NativePhonePreview.enabled, selectedTab == nil { return area == .workspaces ? phoneWorkspace : nil }
        guard let tab = opened.first(where: { $0.id == selectedTab && $0.kind == "workspace" }), let host = tab.hostID else { return nil }
        let id = String(tab.id.dropFirst(("workspace:" + host + ":").count))
        return NativeWorkspaceIdentity.all(destinations).first { $0.hostID == host && $0.workspaceID == id }
    }
    private var workspaceTabSelected: Bool { opened.first(where: { $0.id == selectedTab })?.kind == "workspace" }
    private var selectedChatEntry: AggregateChat? {
        guard let tab = opened.first(where: { $0.id == selectedTab }) else { return nil }
        return chatEntry(for: tab)
    }
    private func chatEntry(for tab: NativeContentTab) -> AggregateChat? {
        guard tab.kind == "chat", let hostID = tab.hostID, let remote = destinations.remote(for: hostID) else { return nil }
        let chatID = String(tab.id.dropFirst(hostID.count + 1))
        let run = remote.chats[chatID] ?? remote.state["runs"].array.first(where: { $0["id"].string == chatID }) ?? .null
        guard run != .null else { return nil }
        return AggregateChat(hostID: hostID, hostName: destinations.destinations.first(where: { $0.id == hostID })?.label ?? "Computer", run: run)
    }
    private var recentAttention: [NativeAttentionItem] {
        let chats = destinations.destinations.flatMap { destination in (destinations.remote(for: destination.id)?.state["runs"].array ?? []).filter(nativeNeedsAttention).map { run in NativeAttentionItem(hostID: destination.id, hostName: destination.label, value: .object(["id": .string("chat:" + run["id"].string), "kind": .string("chat"), "chatId": run["id"], "title": run["title"], "at": run["updatedAt"]])) } }
        return Array((chats + nativeAttentionItems(destinations)).sorted { $0.value["at"].string > $1.value["at"].string }.prefix(7))
    }
    private var recentChats: [AggregateChat] {
        Array(destinations.destinations.flatMap { destination in
            (destinations.remote(for: destination.id)?.state["runs"].array ?? []).map { AggregateChat(hostID: destination.id, hostName: destination.label, run: $0) }
        }.sorted { (NativeProjectActivity.date($0.run) ?? .distantPast) > (NativeProjectActivity.date($1.run) ?? .distantPast) }.filter { nativeChatType($0.run) == (activeArea == .internet ? "internet" : activeArea == .schedules ? "scheduled" : "user") }.prefix(7))
    }
    private func title(for tab: NativeContentTab) -> String {
        if tab.kind == "browser" { return shared.browserTabs.first(where: { $0.id == tab.id })?.title ?? tab.title }
        if tab.kind == "workspace", let hostID = tab.hostID, let remote = destinations.remote(for: hostID) {
            let id = String(tab.id.dropFirst("workspace:\(hostID):".count))
            return remote.state["context"]["workspaces"].array.first { $0["id"].string == id }?["name"].string ?? tab.title
        }
        if tab.kind == "chat", let hostID = tab.hostID, let remote = destinations.remote(for: hostID) {
            let chatID = String(tab.id.dropFirst(hostID.count + 1))
            let title = (remote.chats[chatID] ?? remote.state["runs"].array.first(where: { $0["id"].string == chatID }) ?? .null)["title"].string
            if !title.isEmpty { return title }
        }
        return tab.title
    }
    private var shellLayout: some View {
        Group {
            if tablet {
                HStack(spacing: 0) {
                    if sidebar { rail.frame(width: 250); Divider() }
                    else { collapsedRail.frame(width: 52); Divider() }
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            // A workspace tab's project bar holds the sidebar button instead.
                            if !workspaceTabSelected { Button { sidebar.toggle() } label: { Label("Toggle sidebar", systemImage: "sidebar.left") }.labelStyle(.iconOnly).padding(10).keyboardShortcut("s", modifiers: [.command, .option]) }
                            NativeTabStrip(ids: opened.map(\.id), selection: selectedTab) { HStack(spacing: 0) {
                                ForEach(opened) { tab in
                                    shellTab(tab)
                                    Divider().frame(height: 24)
                                }
                            }.buttonStyle(.plain) }.scrollIndicators(.hidden)
                                // Chat actions are on the chat's tab (press and hold); no separate menu.
                                Button { mainOverviewChrome.openOverview() } label: { NativeTabOverviewIcon().frame(width: 44, height: 44) }.buttonStyle(.plain).accessibilityLabel("App tab overview").accessibilityIdentifier("main-tab-overview-button")
                                Button { shared.open(nil, scope: "main") } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("New tab").accessibilityIdentifier("new-main-browser-tab")
                        }.nativeTabBar()
                        Divider(); if let selected = opened.first(where: { $0.id == selectedTab }) { contentTab(selected).environment(\.nativeSidebarToggle, selected.kind == "workspace" ? { sidebar.toggle() } : nil) } else { content(area) }
                    }
                }.overlay(alignment: .leading) {
                    if !sidebar { Color.clear.frame(width: 10).contentShape(Rectangle()).onHover { edgeHover($0) }.overlay(alignment: .topLeading) { if hover { rail.frame(width: 250).background(.regularMaterial).onHover { edgeHover($0) }.shadow(radius: 10) } } }
                }
            } else if NativePhonePreview.enabled {
                phoneLayout
            } else {
                TabView(selection: $area) {
                    Group { if area == .home { NativeHome() } else { Color.clear } }.tabItem { Label("Home", systemImage: "house") }.tag(NativeArea.home)
                    AggregateChatsView(notificationRequest: notificationChatRequest, onNotificationConsumed: { notificationChatRequest = nil }).tabItem { Label("Chats", systemImage: "bubble.left.and.bubble.right") }.badge(count(for: .chats) ?? 0).tag(NativeArea.chats)
                    Group { if lifeEnabled || ProcessInfo.processInfo.arguments.contains("--synthetic-life") { LifeRootView() } else { NavigationStack { NativeSetupView() } } }.tabItem { Label("Life", systemImage: NativeArea.life.icon) }.tag(NativeArea.life)
                    TeamToolsView().tabItem { Label("Team", systemImage: NativeArea.team.icon) }.tag(NativeArea.team)
                    EngineRoomView(page: $enginePage).tabItem { Label("Engine Room", systemImage: NativeArea.engine.icon) }.tag(NativeArea.engine)
                }
            }
        }
    }
    private var presentedShell: some View {
        shellLayout
        .scrollContentBackground(.hidden)
        .overlay { if NativePadPreview.enabled && phoneChrome.overview { NativePhoneOverview(chrome: phoneChrome, items: phoneOverviewItems).zIndex(3) } }
        .overlay { if (tablet || NativePhonePreview.enabled) && mainOverviewChrome.overview { NativePhoneOverview(chrome: mainOverviewChrome, items: homeTabs, title: "App tabs", selectedID: selectedTab ?? "", accessibilityID: "main-tab-overview").zIndex(4) } }
        .task(id: phoneChrome.overview) {
            guard phoneChrome.overview, let owner = overviewWorkspace, let remote = destinations.remote(for: owner.host) else { return }
            for project in remote.projectCatalog.projects(in: owner.workspace) {
                guard !Task.isCancelled else { return }
                let id = project["id"].string
                await shared.refreshContentTabs(scope: "project:" + owner.host + ":" + id, remote: remote, kind: "project", id: id)
            }
        }
        .overlay(alignment: .bottom) { NativeNoticeBanner().padding(.bottom, 8) }
        .background(NativeTheme.background)
        .environmentObject(phoneChrome)
        .toolbarBackground(NativeTheme.rail, for: .navigationBar, .tabBar)
        .toolbarBackground(.visible, for: .navigationBar, .tabBar)
        .environment(\.nativeOpenChatSetup, openChatSetup)
        .environment(\.nativeSelectResource, openMainResource)
        .onChange(of: shared.linkChatDraft?.id) { _, _ in
            guard let draft = shared.linkChatDraft, let remote = destinations.remote(for: draft.hostID) else { return }
            let setup = NativeChatSetup(hostID: draft.hostID)
            if let form = remote.drafts["new-chat"] { remote.setDraft(setup.draftKey, form) }
            openChatSetup(setup); shared.linkChatDraft = nil
        }
        .sheet(item: $shared.exportFile) { file in BrowserFileExport(file: file) { shared.exportFile = nil }.onDisappear { file.cleanup() } }
        .sheet(item: $notificationScheduleTarget) { target in
            if let remote = destinations.remote(for: target.hostID) {
                NavigationStack {
                    ScheduleView(id: target.scheduleID) { runID in
                        notificationScheduleTarget = nil
                        notificationChatRequest = NotificationChatRequest(hostID: target.hostID, chatID: runID)
                        area = .chats
                    }.environment(remote)
                    .toolbar { Button("Done") { notificationScheduleTarget = nil } }
                }
            }
        }
        .sheet(item: $shellTransfer) { tab in NativeBrowserTransferView(tab: tab) }
        .sheet(item: $shellRename) { entry in if let remote = destinations.remote(for: entry.hostID) { NativeChatRenameView(run: entry.run).environment(remote) } }
        .confirmationDialog("Delete this chat?", isPresented: Binding(get: { shellDelete != nil }, set: { if !$0 { shellDelete = nil } })) {
            Button("Delete chat", role: .destructive) { if let entry = shellDelete { Task { do { try await destinations.remote(for: entry.hostID)?.deleteChat(entry.run["id"].string) } catch { destinations.error = error.localizedDescription } } }; shellDelete = nil }
            Button("Cancel", role: .cancel) { shellDelete = nil }
        } message: { Text("Only the Proteus chat record will be removed. Generated files and the provider’s original chat remain.") }
        .alert("Download", isPresented: Binding(get: { shared.downloadError != nil }, set: { if !$0 { shared.downloadError = nil } })) { Button("OK") { shared.downloadError = nil } } message: { Text(shared.downloadError ?? "") }
    }
    var body: some View {
        presentedShell
        .alert("Browser navigation changed", isPresented: Binding(get: { !shared.browserConflicts.isEmpty }, set: { _ in })) {
            if let conflict = shared.browserConflicts.first {
                Button("Use owner history") { shared.resolveBrowserNavigationConflict(conflict.id, openLocalCopy: false) }
                Button("Open local destination in new tab") { shared.resolveBrowserNavigationConflict(conflict.id, openLocalCopy: true) }
            }
        } message: { Text("The owner has a newer history. Your local page and queued branch are saved until you choose how to continue.") }
        .onOpenURL { url in
            guard let link = NativeChatLink.parse(url) else { return }
            guard let remote = destinations.remote(for: link.host) else { destinations.error = "This chat belongs to an unavailable computer. Pair it before opening the link."; return }
            Task {
                do {
                    try destinations.select(link.host)
                    guard remote.connected else { destinations.error = "This computer is offline. Reconnect before opening the chat link."; return }
                    await remote.openChat(link.id)
                    guard let run = remote.chats[link.id] else { destinations.error = "The chat is unavailable on its owner."; return }
                    openChat(AggregateChat(hostID: link.host, hostName: remote.displayName, run: run))
                } catch { destinations.error = error.localizedDescription }
            }
        }
        .onChange(of: area) { _, value in MessageSpeech.shared.stop(); if NativePhonePreview.enabled { phoneVisited.insert(value); phoneChrome.controlsHidden = false } }
        .onChange(of: shared.mainBrowserSelectionRequest) { _, request in
            guard navigationReady, let request, request == shared.mainBrowserSelectionRequest else { return }
            reconcileMainBrowserTabs(shared.browserTabs)
            if opened.contains(where: { $0.id == request.tabID && $0.kind == "browser" }) { selectedTab = request.tabID }
        }
        .sheet(isPresented: $reorderMainTabs) { NativeTabReorderSheet(items: opened.map { (id: $0.id, title: title(for: $0)) }) { ids in let current = opened; opened = ids.compactMap { id in current.first { $0.id == id } } + current.filter { !ids.contains($0.id) } } }
        .onChange(of: shared.browserTabs) { _, tabs in reconcileMainBrowserTabs(tabs) }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("ProteusPhoneSelectChat"))) { notification in
            guard NativeDesignPreview.enabled, let host = notification.userInfo?["hostID"] as? String, let chat = notification.userInfo?["chatID"] as? String else { return }
            if let remote = destinations.remote(for: host) { openChat(AggregateChat(hostID: host, hostName: remote.displayName, run: remote.chats[chat] ?? remote.state["runs"].array.first { $0["id"].string == chat } ?? .object(["id": .string(chat)]))) }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("ProteusWorkspaceDeleted"))) { notification in
            guard let host = notification.userInfo?["hostID"] as? String, let workspace = notification.userInfo?["workspaceID"] as? String else { return }
            let id = "workspace:" + host + ":" + workspace; opened.removeAll { $0.id == id }; if selectedTab == id { selectedTab = nil }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("ProteusChatWorkspaceMoved"))) { notification in
            guard let host = notification.userInfo?["hostID"] as? String, let chat = notification.userInfo?["chatID"] as? String, let workspace = notification.userInfo?["workspaceID"] as? String, let remote = destinations.remote(for: host), let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == workspace }) else { return }
            NativeWorkspaceNavigation.openChat(chat, workspaceID: workspace, remote: remote, shared: shared)
            openWorkspace(NativeWorkspaceIdentity(hostID: host, hostName: remote.displayName, profile: profile))
        }
        .onChange(of: destinations.deletedChat) { _, event in
            guard let event else { return }
            shared.removeChatWorkspace(hostID: event.hostID, chatID: event.chatID)
            let tabID = event.hostID + ":" + event.chatID
            opened.removeAll { $0.id == tabID }
            if selectedTab == tabID { selectedTab = nil }
            if restoredSelection == tabID { restoredSelection = nil }
            if notificationChatRequest?.hostID == event.hostID && notificationChatRequest?.chatID == event.chatID { notificationChatRequest = nil }
        }
        .onChange(of: phoneChrome.currentID) { _, id in
            saveNavigation()
            guard NativePhonePreview.enabled, id.hasPrefix("chat:") else { return }
            for destination in destinations.destinations {
                let prefix = "chat:" + destination.id + ":"; guard id.hasPrefix(prefix) else { continue }
                let chatID = String(id.dropFirst(prefix.count)), tabID = destination.id + ":" + chatID
                let run = destinations.remote(for: destination.id)?.chats[chatID] ?? .null
                // Associated chats are tabs of their project, never top-level tabs.
                if let remote = destinations.remote(for: destination.id), Self.associatedWorkspace(run, remote: remote) != nil { continue }
                if !opened.contains(where: { $0.id == tabID }) { opened.append(NativeContentTab(id: tabID, title: run["title"].string.isEmpty ? "Chat" : run["title"].string, kind: "chat", hostID: destination.id)) }
            }
        }
        .onChange(of: opened) { _, _ in saveNavigation() }
        .onChange(of: selectedTab) { _, value in if value != nil { restoredSelection = nil }; saveNavigation() }
        .onChange(of: area) { _, _ in saveNavigation() }
        .onChange(of: phoneWorkspace) { _, _ in saveNavigation() }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("ProteusThumbnailReady"))) { _ in phoneChrome.refreshThumbnails(); mainOverviewChrome.refreshThumbnails() }
        .onChange(of: destinations.pairingCompletion) { _, completion in
            guard completion != nil else { return }
            selectedTab = nil; enginePage = "Connections"; area = .engine
            phoneChrome.drawer = false
        }
        .onChange(of: life.accountIdentity) { _, identity in MessageSpeech.shared.stop(); shared.reset(for: identity); if NativeDesignPreview.enabled { phoneChrome.reset(); phoneChrome.cacheNamespace = identity } }
        .onChange(of: destinations.selectedID) { _, _ in MessageSpeech.shared.stop() }
        .task(id: destinations.selectedID) {
            while !Task.isCancelled {
                if let remote = destinations.selected { await shared.refreshMainBrowserTabs(remote) }
                migrateAssociatedChatTabs()
                try? await Task.sleep(for: .seconds(3))
            }
        }
        .onChange(of: notifications.route) { _, route in
            guard navigationReady, let route else { return }
            notifications.route = nil
            Task { await openNotification(route) }
        }
        .task {
            phoneChrome.newMainChat = { internet in openChatSetup(NativeChatSetup(hostID: destinations.selectedID ?? "", internet: internet)) }
            phoneChrome.showTabs = { openPhoneOverview() }
            phoneChrome.activateArea = { name in if let item = NativeArea(rawValue: name) { phoneVisited.insert(item); selectedTab = nil; area = item } }
            notifications.attach(life)
            shared.reset(for: life.accountIdentity); phoneChrome.cacheNamespace = life.accountIdentity
            restoreNavigation()
            navigationReady = true
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--synthetic-browser-conflict") { shared.replayBrowserConflictFixture() }
            if ProcessInfo.processInfo.arguments.contains("--synthetic-nav-counts") { return }
            #endif
            if let route = notifications.route { notifications.route = nil; await openNotification(route) }
            await shared.refresh(life)
            await notifications.syncSubscription()
            while !Task.isCancelled {
                for destination in destinations.destinations {
                    if let remote = destinations.remote(for: destination.id), remote.connected { await shared.refreshKnownContentTabs(remote) }
                    if let remote = destinations.remote(for: destination.id), remote.connected, let activity = try? await remote.request("notifications.list") { notifications.observe(activity["items"].array, hostID: destination.id) }
                }
                shared.pruneBrowsers()
                do { try await Task.sleep(for: .seconds(5)) } catch { return }
            }
        }
    }
    private func shellTab(_ tab: NativeContentTab) -> some View {
                                    HStack { Button { selectContent(tab) } label: { NativeContentTabLabel(title: title(for: tab), symbol: NativeTabSymbol.name(kind: tab.kind, chatType: chatEntry(for: tab)?.run["chatType"].string ?? "")) }.lineLimit(1).accessibilityIdentifier("shell-tab-" + tab.id).accessibilityLabel(title(for: tab)).accessibilityValue(selectedTab == tab.id ? "Active" : "Inactive"); Button { closeContent(tab) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + title(for: tab)) }
                                        .padding(12).background(selectedTab == tab.id ? NativePalette.shared.color("selectedTab") : Color.clear)
                                        .overlay(alignment: .bottom) { Rectangle().fill(selectedTab == tab.id ? tabAccent : .clear).frame(height: 2) }.id(tab.id)
                                        .draggable(tab.id).dropDestination(for: String.self) { ids, _ in guard let source = ids.first else { return false }; return moveContent(source, before: tab.id) }
                                        .contextMenu {
                                            if let entry = chatEntry(for: tab), !NativeWorkspaceIdentity.workspaceID(entry.run).isEmpty { Button("Send tab to workspace", systemImage: "square") { sendToWorkspace(entry) } }
                                            if tab.kind == "browser", let browser = shared.browserTabs.first(where: { $0.id == tab.id }) { Button("Send tab", systemImage: "arrow.right.square") { shellTransfer = browser } }
                                            Button("Copy tab name", systemImage: "doc.on.doc") { UIPasteboard.general.string = title(for: tab) }
                                            if let entry = chatEntry(for: tab) { Button("Copy chat link", systemImage: "link") { UIPasteboard.general.url = NativeChatLink.url(host: entry.hostID, id: entry.run["id"].string) } }
                                            if let entry = chatEntry(for: tab), destinations.remote(for: entry.hostID)?.state["capabilities"].array.contains(.string("chat.rename.v1")) == true { Button("Rename", systemImage: "pencil") { shellRename = entry } }
                                            if let entry = chatEntry(for: tab), destinations.remote(for: entry.hostID)?.state["capabilities"].array.contains(.string("chat.lifecycle.v1")) == true {
                                                Button(entry.run["archived"].bool ? "Unarchive chat" : "Archive chat", systemImage: "archivebox") { Task { do { try await destinations.remote(for: entry.hostID)?.archiveChat(entry.run["id"].string, archived: !entry.run["archived"].bool) } catch { destinations.error = error.localizedDescription } } }.disabled(chatHasPendingWork(entry.run))
                                                Button("Delete chat", systemImage: "trash", role: .destructive) { shellDelete = entry }.disabled(chatHasPendingWork(entry.run))
                                            }
                                            Button("Move left", systemImage: "arrow.left") { shiftContent(tab.id, by: -1) }.disabled(opened.first?.id == tab.id)
                                            Button("Move right", systemImage: "arrow.right") { shiftContent(tab.id, by: 1) }.disabled(opened.last?.id == tab.id)
                                            Button("Close tab", systemImage: "xmark") { closeContent(tab) }
                                            Button("Close other tabs") { for other in opened.filter({ $0.id != tab.id }) { closeContent(other) }; selectContent(tab) }.disabled(opened.count < 2)
                                            Button("Close tabs to the right") { if let index = opened.firstIndex(where: { $0.id == tab.id }) { for other in Array(opened.dropFirst(index + 1)) { closeContent(other) } } }.disabled(opened.last?.id == tab.id)
                                        }
    }
    private var homeTabs: [NativePhoneTab] {
        opened.map { tab in NativePhoneTab(id: tab.id, title: title(for: tab), symbol: NativeTabSymbol.name(kind: tab.kind), detail: tab.hostID.flatMap { id in destinations.destinations.first { $0.id == id }?.label } ?? "Main tab", preview: nil, select: { selectContent(tab); phoneChrome.drawer = false; phoneChrome.controlsHidden = false }, close: { closeContent(tab) }) }
    }
    private var homeRecents: [NativePhoneTab] {
        let browsers = shared.browserTabs.filter { !$0.hidden && $0.lastTouchedAt != nil }.map { tab in
            NativePhoneTab(id: "browser:" + tab.id, title: tab.title.isEmpty ? "New tab" : tab.title, symbol: "globe", detail: tab.url ?? "Browsing home", preview: shared.browserPreview(tab.id), select: { choosePhoneBrowser(tab) })
        }
        var dates = phoneChrome.interactedAt
        for tab in shared.browserTabs { dates["browser:" + tab.id] = tab.lastTouchedAt.flatMap(ProviderAllowance.date) }
        return (phoneChrome.recent.filter { !$0.id.hasPrefix("browser:") } + browsers).sorted { (dates[$0.id] ?? .distantPast) > (dates[$1.id] ?? .distantPast) }
    }
    private var mainTabRows: some View {
        ForEach(homeTabs) { tab in
            HStack(spacing: 2) {
                Button(action: tab.select) { Label(tab.title, systemImage: tab.symbol).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 10) }.accessibilityIdentifier("shell-tab-" + tab.id)
                if let close = tab.close {
                    Button(action: close) { Image(systemName: "xmark").font(.system(size: 10, weight: .semibold)).foregroundStyle(NativeTheme.accent).frame(width: 44, height: 44, alignment: .trailing).contentShape(Rectangle()) }
                        .accessibilityLabel("Close tab " + tab.title)
                }
            }.padding(.leading, 12).padding(.trailing, 6).background(selectedTab == tab.id ? NativeSidebarStyle.selected : .clear, in: RoundedRectangle(cornerRadius: 8)).buttonStyle(.plain)
                .contextMenu { Button("Move left") { shiftContent(tab.id, by: -1) }; Button("Move right") { shiftContent(tab.id, by: 1) }; if let close = tab.close { Button("Close tab", action: close) } }
        }
    }
    private var mainTabActions: some View {
        HStack { Button { shared.open(nil, scope: "main"); phoneChrome.drawer = false } label: { Label("Add tab", systemImage: "plus") }.accessibilityIdentifier("main-tabs-add")
            Spacer(); Button { phoneChrome.drawer = false; mainOverviewChrome.openOverview() } label: { NativeTabOverviewIcon().frame(width: 44, height: 44) }.accessibilityLabel("App tab overview").accessibilityIdentifier("phone-main-tab-overview"); Button("Reorder", systemImage: "arrow.left.arrow.right") { reorderMainTabs = true }.disabled(opened.count < 2)
        }.font(.subheadline).frame(minHeight: 44)
    }
    private var phoneLayout: some View {
        GeometryReader { geometry in
        ZStack(alignment: .leading) {
            VStack(spacing: 0) {
                if !phoneChrome.controlsHidden, let tab = opened.first(where: { $0.id == selectedTab }), ["browser", "chat", "chat-setup", "document"].contains(tab.kind) {
                    HStack(spacing: 8) {
                        Button { phoneChrome.captureCurrent(); withAnimation(.easeInOut(duration: 0.22)) { phoneChrome.drawer = true } } label: { Image(systemName: "sidebar.left").frame(width: 44, height: 44) }.accessibilityLabel("App navigation").accessibilityIdentifier("phone-app-navigation")
                        Text(opened.first(where: { $0.id == selectedTab }).map { title(for: $0) } ?? area.rawValue).font(.subheadline.weight(.medium)).lineLimit(1)
                        Spacer(minLength: 0)
                        NativeMainTabAdd()
                    }.padding(.horizontal, 8).background(NativeTheme.rail)
                    Divider()
                }
                ZStack {
                    ForEach(NativeArea.allCases.filter { phoneVisited.contains($0) }) { item in
                        Group { if item == .workspaces { NativeWorkspacesView(onOpen: openWorkspace) } else { content(item) } }
                            .environment(\.nativePhoneAreaActive, area == item && selectedTab == nil)
                            .opacity(area == item && selectedTab == nil ? 1 : 0)
                            .allowsHitTesting(area == item && selectedTab == nil).accessibilityHidden(area != item || selectedTab != nil)
                    }
                    if let tab = opened.first(where: { $0.id == selectedTab }) {
                        contentTab(tab).environment(\.nativeTabStep, { direction in
                            guard let index = opened.firstIndex(where: { $0.id == tab.id }), opened.indices.contains(index + direction) else { return }
                            selectContent(opened[index + direction])
                        })
                    }
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height).clipped()
            if phoneChrome.drawer {
                Color.black.opacity(0.45).ignoresSafeArea().onTapGesture { withAnimation { phoneChrome.drawer = false } }
            }
            let drawerWidth = min(315, max(0, geometry.size.width - 44))
            phoneDrawer(width: drawerWidth).frame(width: drawerWidth, height: geometry.size.height, alignment: .leading).background(NativeTheme.rail)
                .offset(x: phoneChrome.drawer ? 0 : -drawerWidth).opacity(phoneChrome.drawer ? 1 : 0)
                .allowsHitTesting(phoneChrome.drawer).accessibilityHidden(!phoneChrome.drawer).shadow(radius: 12)
            if phoneChrome.overview { NativePhoneOverview(chrome: phoneChrome, items: phoneOverviewItems).zIndex(3) }
        }.frame(width: geometry.size.width, height: geometry.size.height, alignment: .leading).background(NativeTheme.background)
        }
    }
    private func phoneDrawer(width: CGFloat) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack { Text("⤨").foregroundStyle(NativeTheme.accent); Text("Proteus").font(.title2.bold()); Spacer(); Button { withAnimation { phoneChrome.drawer = false } } label: { Image(systemName: "xmark").frame(width: 44, height: 44) }.accessibilityLabel("Close navigation") }.padding(.horizontal, 10)
                ForEach(NativeArea.allCases.filter { $0 != .workspaces && $0 != .engine }) { item in phoneDrawerRow(item) }
                NativeWorkspaceTree(activeWorkspace: area == .workspaces ? phoneWorkspace?.id : nil, onOpen: openWorkspace, onBrowse: { choosePhoneArea(.workspaces) })
                Divider().padding(.vertical, 8)
                phoneDrawerRow(.engine)
                if activeArea == .engine { engineOptions(phone: true) }
                Divider().padding(.vertical, 8)
                Text("Open tabs").font(.caption.weight(.semibold)).foregroundStyle(.secondary).padding(.horizontal, 12).padding(.top, 4)
                Text("Main navigation tabs").font(.caption2).foregroundStyle(.secondary).padding(.horizontal, 12).padding(.bottom, 8)
                mainTabRows
                mainTabActions.padding(.horizontal, 12)
                if let remote = destinations.selected { ProviderUsageStrip(store: remote).padding(.top, 12) }
                if NativeDesignPreview.isolated { Text("iPhone design preview").font(.caption2).foregroundStyle(.secondary).padding(12) }
            }.frame(width: max(0, width - 16), alignment: .leading).padding(8)
        }.frame(width: width, alignment: .leading).clipped().accessibilityIdentifier("phone-navigation-drawer")
    }
    private func sidebarFeatureLabel(_ item: NativeArea) -> some View {
        Label { Text(item.sidebarTitle) } icon: {
            Group { if NativeDesignPreview.enabled && [.home, .schedules, .team, .chats].contains(item) { NativeSidebarIcon(kind: item == .chats ? "chat" : item.rawValue.lowercased()) } else { Image(systemName: item.icon).frame(width: 18, height: 18) } }
                .foregroundStyle(activeArea == item ? NativeTheme.accent : NativeSidebarStyle.muted)
        }
    }
    private func sidebarCount(_ value: Int, attention: Bool) -> some View {
        Text(String(value)).font(.caption).monospacedDigit()
            .foregroundStyle(attention ? NativeTheme.rail : NativeSidebarStyle.muted)
            .padding(.horizontal, attention ? 6 : 0).padding(.vertical, attention ? 2 : 0)
            .background(attention ? NativeTheme.accent : .clear, in: RoundedRectangle(cornerRadius: 4))
    }
    private func phoneDrawerRow(_ item: NativeArea) -> some View {
        Button { choosePhoneArea(item) } label: {
            HStack(spacing: 10) { sidebarFeatureLabel(item); Spacer(); if let count = count(for: item) { sidebarCount(count, attention: item == .attention) } }
                .foregroundStyle(activeArea == item ? NativeSidebarStyle.strong : NativeSidebarStyle.ink)
                .padding(.horizontal, 12).frame(minHeight: 44).background(activeArea == item ? NativeSidebarStyle.button : .clear, in: RoundedRectangle(cornerRadius: 8))
                .overlay { RoundedRectangle(cornerRadius: 8).strokeBorder(activeArea == item ? NativeSidebarStyle.activeBorder : .clear, lineWidth: 1) }.contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier("phone-nav-" + item.rawValue)
    }
    private func choosePhoneArea(_ item: NativeArea) { phoneChrome.browserOwnsBack = false; phoneChrome.currentID = ""; phoneVisited.insert(item); area = item; selectedTab = nil; phoneChrome.controlsHidden = false; withAnimation { phoneChrome.drawer = false } }
    private func engineOptions(phone: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(EngineRoomView.pages, id: \.self) { name in
                Button {
                    enginePage = name; area = .engine; selectedTab = nil
                    if phone { phoneChrome.drawer = false }
                } label: {
                    Text(name).font(.subheadline).fontWeight(enginePage == name ? .semibold : .regular)
                        .foregroundStyle(enginePage == name ? NativeTheme.accent : NativeSidebarStyle.ink)
                        .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading).padding(.leading, 34)
                }.buttonStyle(.plain).accessibilityIdentifier("engine-option-" + name)
                    .accessibilityValue(enginePage == name ? "Active" : "Inactive")
            }
        }
    }
    private var overviewWorkspace: (host: String, workspace: String, project: String)? {
        if let tab = shared.browserTabs.first(where: { "browser:" + $0.id == phoneChrome.currentID }) {
            for destination in destinations.destinations {
                guard let remote = destinations.remote(for: destination.id) else { continue }
                let prefix = "project:" + destination.id + ":"
                if tab.scope.hasPrefix(prefix) { let id = String(tab.scope.dropFirst(prefix.count)); if let project = remote.projectCatalog.project(id: id) { return (destination.id, project["workspaceId"].string, id) } }
                let workspacePrefix = "workspace:" + destination.id + ":"
                if tab.scope.hasPrefix(workspacePrefix) { let id = String(tab.scope.dropFirst(workspacePrefix.count)); return (destination.id, id, remote.draft("workspace-selected-project:" + id).string) }
            }
        }
        if let tab = opened.first(where: { $0.id == selectedTab && $0.kind == "workspace" }), let host = tab.hostID, let remote = destinations.remote(for: host) {
            let workspace = String(tab.id.dropFirst(("workspace:" + host + ":").count))
            return (host, workspace, remote.draft("workspace-selected-project:" + workspace).string)
        }
        for destination in destinations.destinations {
            guard let remote = destinations.remote(for: destination.id) else { continue }
            let prefix = "chat:" + destination.id + ":"
            let current = phoneChrome.currentID.hasPrefix(prefix) ? String(phoneChrome.currentID.dropFirst(prefix.count)) : nil
            if let current, let row = remote.chats[current] ?? remote.state["runs"].array.first(where: { $0["id"].string == current }) {
                let member = remote.projectCatalog.membership(for: row)
                if !member["workspaceId"].string.isEmpty { return (destination.id, member["workspaceId"].string, member["projectId"].string) }
            }
        }
        return nil
    }
    private func overviewBrowser(_ tab: BrowserDescriptor, section: String = "", sectionID: String = "") -> NativePhoneTab {
        NativePhoneTab(id: "browser:" + tab.id, title: tab.title.isEmpty ? "New tab" : tab.title, symbol: "globe", detail: tab.url ?? "New tab", section: section, sectionID: sectionID, preview: shared.browserPreview(tab.id), select: { choosePhoneBrowser(tab) }, close: { shared.close(tab.id) })
    }
    private var phoneOverviewItems: [NativePhoneTab] {
        if let owner = overviewWorkspace, let remote = destinations.remote(for: owner.host) {
            let projects = remote.projectCatalog.projects(in: owner.workspace).sorted { left, right in
                if (left["id"].string == owner.project) != (right["id"].string == owner.project) { return left["id"].string == owner.project }
                let order = left["name"].string.localizedStandardCompare(right["name"].string)
                return order == .orderedSame ? left["id"].string < right["id"].string : order == .orderedAscending
            }
            var result: [NativePhoneTab] = []
            for project in projects {
                let scope = "project:" + owner.host + ":" + project["id"].string, caption = project["name"].string
                let descriptors = shared.workspaceContentDescriptors[scope] ?? []
                // Each project section starts with its home (Chats/Tabs), one tap from any tab.
                let projectID = project["id"].string
                result.append(NativePhoneTab(id: "project-home:" + owner.host + ":" + projectID, title: caption, symbol: "folder", detail: "Project home", section: caption, sectionID: scope, preview: nil, select: {
                    remote.setDraft("workspace-selected-project:" + owner.workspace, .string(projectID))
                    var navigation = remote.draft("project-navigation:" + projectID).object; navigation["selected"] = .string("workspace"); remote.setDraft("project-navigation:" + projectID, .object(navigation))
                    if let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == owner.workspace }) { openWorkspace(NativeWorkspaceIdentity(hostID: owner.host, hostName: remote.displayName, profile: profile)) }
                }))
                for descriptor in descriptors where !descriptor["hidden"].bool && !descriptor["navigationClosed"].bool {
                    if descriptor["type"].string == "browser", let tab = shared.tabs(in: scope).first(where: { ($0.contentTabId ?? $0.id) == descriptor["id"].string }), !tab.hidden { result.append(overviewBrowser(tab, section: caption, sectionID: scope)) }
                    else if descriptor["setup"] != .null {
                        let id = descriptor["id"].string
                        result.append(NativePhoneTab(id: "setup:" + scope + ":" + id, title: descriptor["title"].string, symbol: "bubble.left.and.bubble.right", detail: remote.displayName, section: caption, sectionID: scope, preview: nil, select: {
                            remote.setDraft("workspace-selected-project:" + owner.workspace, .string(projectID))
                            var navigation = remote.draft("project-navigation:" + projectID).object; navigation["selected"] = .string("draft:" + id); remote.setDraft("project-navigation:" + projectID, .object(navigation))
                            if let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == owner.workspace }) { openWorkspace(NativeWorkspaceIdentity(hostID: owner.host, hostName: remote.displayName, profile: profile)) }
                        }))
                    } else if descriptor["type"].string == "chat" {
                        let id = descriptor["chatId"].string, key = "chat:" + owner.host + ":" + id
                        let run = remote.chats[id] ?? remote.state["runs"].array.first { $0["id"].string == id } ?? .object(["id": .string(id), "title": descriptor["title"]])
                        let preview = phoneChrome.visited.first { $0.id == key }?.preview ?? NativeThumbnailCache.load(phoneChrome.cacheNamespace + ":" + key)
                        result.append(NativePhoneTab(id: key, title: run["title"].string, symbol: "bubble.left.and.bubble.right", detail: remote.displayName, section: caption, sectionID: scope, preview: preview, select: { openChat(AggregateChat(hostID: owner.host, hostName: remote.displayName, run: run)) }))
                    } else if ["document", "terminal"].contains(descriptor["type"].string) {
                        let isDocument = descriptor["type"].string == "document", id = isDocument ? descriptor["documentId"].string : descriptor["id"].string
                        result.append(NativePhoneTab(id: (isDocument ? "document:" : "terminal:") + scope + ":" + id, title: descriptor["title"].string, symbol: isDocument ? "doc.text" : "terminal", detail: remote.displayName, section: caption, sectionID: scope, preview: nil, select: {
                            remote.setDraft("workspace-selected-project:" + owner.workspace, .string(project["id"].string))
                            var navigation = remote.draft("project-navigation:" + project["id"].string).object; navigation["selected"] = .string(isDocument ? "document:" + id : id); remote.setDraft("project-navigation:" + project["id"].string, .object(navigation))
                            if let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == owner.workspace }) { openWorkspace(NativeWorkspaceIdentity(hostID: owner.host, hostName: remote.displayName, profile: profile)) }
                        }))
                    }
                }
                let known = Set(result.map(\.id))
                result += shared.tabs(in: scope).filter { !$0.hidden && !known.contains("browser:" + $0.id) }.map { overviewBrowser($0, section: caption, sectionID: scope) }
            }
            var seen = Set<String>(); return result.filter { seen.insert($0.id).inserted }
        }
        let scope = activeArea == .team ? "team" : "main"
        var result = shared.tabs(in: scope).filter { !$0.hidden }.map { overviewBrowser($0) }
        if scope == "main" {
            let openChatIDs = Set(opened.filter { $0.kind == "chat" }.map { "chat:" + $0.id })
            let chats = phoneChrome.visited.filter { openChatIDs.contains($0.id) || $0.id == phoneChrome.currentID && $0.id.hasPrefix("chat:") }
            result = chats + result
        }
        var seen = Set<String>(); return result.filter { seen.insert($0.id).inserted }
    }
    private func openPhoneOverview() {
        phoneChrome.openOverview()
        if let owner = overviewWorkspace, let remote = destinations.remote(for: owner.host) {
            Task { for project in remote.projectCatalog.projects(in: owner.workspace) { let id = project["id"].string; await shared.refreshContentTabs(scope: "project:" + owner.host + ":" + id, remote: remote, kind: "project", id: id) } }
        }
    }
    private func choosePhoneBrowser(_ tab: BrowserDescriptor) {
        phoneChrome.controlsHidden = false
        if tab.scope == "main" { shared.select(tab.id, in: "main"); selectedTab = tab.id }
        else if tab.scope == "team" { choosePhoneArea(.team); shared.select(tab.id, in: "team") }
        else if tab.scope.hasPrefix("chat:"), let host = tab.ownerHostId ?? destinations.selectedID {
            let prefix = "chat:" + host + ":"
            guard tab.scope.hasPrefix(prefix) else { return }
            let chat = String(tab.scope.dropFirst(prefix.count)); shared.selectChatChild(tab.id, for: tab.scope)
            choosePhoneArea(.chats); notificationChatRequest = NotificationChatRequest(hostID: host, chatID: chat)
        } else if let destination = destinations.destinations.first(where: { tab.scope.hasPrefix("project:" + $0.id + ":") || tab.scope.hasPrefix("workspace:" + $0.id + ":") }), let remote = destinations.remote(for: destination.id) {
            let kind = tab.scope.hasPrefix("project:") ? "project" : "workspace"
            let scopeID = String(tab.scope.dropFirst((kind + ":" + destination.id + ":").count))
            let workspaceID = kind == "project" ? remote.projectCatalog.project(id: scopeID)?["workspaceId"].string ?? "" : scopeID
            guard let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == workspaceID }) else { destinations.error = "This tab’s workspace is unavailable on its computer."; return }
            remote.setDraft("workspace-selected-project:" + workspaceID, .string(kind == "project" ? scopeID : ""))
            var navigation = remote.draft(kind + "-navigation:" + scopeID).object
            navigation["selected"] = .string(tab.id)
            remote.setDraft(kind + "-navigation:" + scopeID, .object(navigation))
            shared.select(tab.id, in: tab.scope)
            openWorkspace(NativeWorkspaceIdentity(hostID: destination.id, hostName: destination.label, profile: profile))
        } else { destinations.error = "This tab’s original navigation scope is unavailable. Reconnect its computer before opening it." }
    }
    private var rail: some View {
        VStack(spacing: 0) {
            NativeList {
                HStack(spacing: 7) { Text("⤨").foregroundStyle(tabAccent); Text("Proteus") }.font(.title2.bold())
                ForEach(NativeArea.allCases.filter { !NativePadPreview.enabled || $0 != .workspaces }) { item in
                    if item == .engine {
                        NativeWorkspaceTree(activeWorkspace: opened.first { $0.id == selectedTab && $0.kind == "workspace" }?.id, onOpen: openWorkspace, onBrowse: { area = .workspaces; selectedTab = nil }).padding(.vertical, 8).overlay(alignment: .bottom) { Rectangle().fill(NativeSidebarStyle.border).frame(height: 1) }.listRowInsets(EdgeInsets(top: 4, leading: 4, bottom: 4, trailing: 4)).listRowBackground(Color.clear).listRowSeparator(.hidden)
                    }
                    Button { area = item; selectedTab = nil; hover = false } label: {
                        HStack { sidebarFeatureLabel(item).fontWeight(activeArea == item ? .semibold : .regular); Spacer(minLength: 4); if let value = count(for: item) { sidebarCount(value, attention: item == .attention).accessibilityLabel("\(value) \(item.rawValue.lowercased())").accessibilityIdentifier("nav-count-" + item.id) } }.accessibilityElement(children: .contain)
                            .foregroundStyle(activeArea == item ? NativeSidebarStyle.strong : NativeSidebarStyle.ink)
                            .padding(.horizontal, 12).frame(minHeight: 44)
                            .background(activeArea == item ? NativeSidebarStyle.button : .clear, in: RoundedRectangle(cornerRadius: 8))
                            .overlay { RoundedRectangle(cornerRadius: 8).strokeBorder(activeArea == item ? NativeSidebarStyle.activeBorder : .clear, lineWidth: 1) }
                    }.buttonStyle(.plain)
                    .listRowInsets(EdgeInsets(top: 2, leading: 8, bottom: 2, trailing: 8)).listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .accessibilityIdentifier("sidebar-" + item.id)
                    .accessibilityValue(activeArea == item ? "Active" : "Inactive")
                    .accessibilityAddTraits(activeArea == item ? .isSelected : [])
                    if NativeDesignPreview.enabled && item == .engine && activeArea == .engine { engineOptions(phone: false).listRowSeparator(.hidden).listRowBackground(Color.clear) }
                    if !NativePadPreview.enabled && activeArea == item && (item == .chats || item == .internet || item == .schedules) {
                        ForEach(recentChats) { entry in
                            Button { openChat(entry) }
                                label: { HStack { if entry.run["status"].string == "awaiting_input" { Text("!").foregroundStyle(.orange) }; Label(entry.run["title"].string, systemImage: NativeTabSymbol.name(kind: "chat", chatType: entry.run["chatType"].string)).lineLimit(2).font(.caption).modifier(RunningChatPulse(running: entry.run["status"].string == "running")) } }.padding(.leading).listRowBackground(selectedTab == entry.id ? NativeTheme.accent.opacity(0.10) : Color.clear)
                        }
                    }
                    if !NativePadPreview.enabled && activeArea == item && item == .attention {
                        ForEach(recentAttention) { entry in
                            Button { if entry.value["kind"].string == "chat" { openChat(AggregateChat(hostID: entry.hostID, hostName: entry.hostName, run: .object(["id": entry.value["chatId"]]))) } else { attentionPreferredTab = "notifications"; selectedTab = nil; area = .attention } } label: { Text(entry.value["title"].string).lineLimit(1).font(.caption) }.padding(.leading)
                        }
                    }
                    if !NativePadPreview.enabled && area == item && item == .team {
                        ForEach(["Overview", "Standup"], id: \.self) { title in Button(title) { teamSection = title }.font(.caption).padding(.leading).accessibilityIdentifier("team-sidebar-" + title.lowercased()).listRowBackground(activeArea == .team && teamSection == title ? NativeTheme.accent.opacity(0.10) : Color.clear) }
                        ForEach(shared.tabs(in: "team")) { tab in Button { shared.select(tab.id, in: "team"); teamSection = tab.id } label: { Label(tab.title, systemImage: "globe").font(.caption).lineLimit(1) }.padding(.leading) }
                    }
                    if area == item && item == .life { ForEach(["overview", "nutrition", "garage", "fuel", "captures"], id: \.self) { title in Button(title.capitalized) { lifeSection = title }.font(.caption).padding(.leading).listRowBackground(activeArea == .life && lifeSection == title ? NativeTheme.accent.opacity(0.10) : Color.clear) } }
                    if area == item && item == .engine { ForEach(EngineRoomView.pages, id: \.self) { title in Button(title) { enginePage = title }.font(.caption).padding(.leading).listRowBackground(activeArea == .engine && enginePage == title ? NativeTheme.accent.opacity(0.10) : Color.clear) } }
                }
            }.listStyle(.sidebar).scrollContentBackground(.hidden).background(NativeTheme.rail)
            if let remote = destinations.selected { ProviderUsageStrip(store: remote) }
        }
    }
    private var collapsedRail: some View {
        VStack(spacing: 10) {
            Text("⤨").font(.title2.bold()).foregroundStyle(tabAccent).accessibilityLabel("Proteus")
            ForEach(NativeArea.allCases) { item in
                Button { area = item; selectedTab = nil } label: { Image(systemName: item.icon).font(.system(size: 19, weight: .medium)).frame(width: 40, height: 40).background(activeArea == item ? tabAccent.opacity(0.18) : .clear, in: RoundedRectangle(cornerRadius: 8)).overlay(alignment: .topTrailing) { if let value = count(for: item), value > 0 { Text(String(value)).font(.system(size: 9, weight: .bold)).padding(3).background(NativeTheme.accent, in: Capsule()).foregroundStyle(.black) } } }
                    .accessibilityValue(activeArea == item ? "Active" : "Inactive")
                    .accessibilityLabel(item.rawValue + (count(for: item).map { ", \($0)" } ?? "")).help(item.rawValue)
            }
            Spacer()
        }.padding(.top, 8).background(NativeTheme.rail)
    }
    private func notificationFallback(_ message: String? = nil) {
        selectedTab = nil; enginePage = "Notifications"; area = .engine
        if let message { destinations.error = message }
    }
    private func openNotification(_ route: NativeNotifications.NotificationRoute) async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-notification-controls") { notifications.fixtureStatus = "Routing " + route.type }
        #endif
        if route.type == "connection" { selectedTab = nil; enginePage = "Connections"; area = .engine; return }
        guard !route.hostID.isEmpty else { notificationFallback(); return }
        guard destinations.destinations.contains(where: { $0.id == route.hostID }) else {
            notificationFallback("This notification refers to a computer that is not paired on this device."); return
        }
        do { try destinations.select(route.hostID) }
        catch { notificationFallback("This computer’s saved connection is unavailable. Check Manage computers."); return }
        guard let remote = destinations.remote(for: route.hostID) else { notificationFallback(); return }
        if route.type == "website.notification" {
            guard !route.notificationID.isEmpty else { notificationFallback("This website notification has no activation reference."); return }
            guard remote.connected else { notificationFallback("Reconnect \(destinations.selectedLabel) to open the website notification on that computer."); return }
            do {
                _ = try await remote.request("notifications.open", ["id": .string(route.notificationID)])
                notificationFallback()
            } catch { notificationFallback("The website notification could not be opened on \(destinations.selectedLabel). It may no longer be available.") }
            return
        }
        if route.type == "schedule.completed", !route.scheduleID.isEmpty {
            if !remote.state["schedules"].array.contains(where: { $0["id"].string == route.scheduleID }), remote.connected { await remote.refresh() }
            guard remote.state["schedules"].array.contains(where: { $0["id"].string == route.scheduleID }) else {
                notificationFallback("This schedule is not available on this device. Reconnect \(destinations.selectedLabel) and refresh Schedules."); return
            }
            if tablet || NativePhonePreview.enabled {
                // Retained phone NavigationStacks can prevent a shell-level sheet
                // from presenting. Use the same durable tab route as the tablet.
                openSchedule(remote.state["schedules"].array.first { $0["id"].string == route.scheduleID } ?? .null, hostID: route.hostID)
            } else { selectedTab = nil; area = .home; notificationScheduleTarget = NotificationScheduleTarget(hostID: route.hostID, scheduleID: route.scheduleID)
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--synthetic-notification-controls") { notifications.fixtureStatus = "Schedule sheet ready" }
                #endif
            }
            return
        }
        guard !route.chatID.isEmpty else { notificationFallback(); return }
        if remote.chats[route.chatID] == nil, remote.connected {
            do { remote.mergeChat(try await remote.request("chat.get", ["id": .string(route.chatID)])) }
            catch { notificationFallback("This chat could not be opened. Reconnect \(destinations.selectedLabel) and open it from Chats."); return }
        }
        guard remote.chats[route.chatID] != nil else {
            notificationFallback("This chat is not cached on this device. Reconnect \(destinations.selectedLabel) and open it from Chats."); return
        }
        let run = remote.chats[route.chatID] ?? .null
        openChat(AggregateChat(hostID: route.hostID, hostName: destinations.selectedLabel, run: run))
    }
    private func edgeHover(_ inside: Bool) { hoverTask?.cancel(); if inside { hover = true } else { hoverTask = Task { try? await Task.sleep(for: .milliseconds(200)); if !Task.isCancelled { hover = false } } } }
    /// Chats belong to their workspace/project. Open that owner and make the chat one
    /// of its tabs; only an unassigned chat may use top-level navigation.
    @discardableResult private func openAssociatedChat(_ entry: AggregateChat) -> Bool {
        guard let remote = destinations.remote(for: entry.hostID) else { return false }
        let run = entry.run["id"].string.isEmpty ? entry.run : (remote.chats[entry.run["id"].string] ?? remote.state["runs"].array.first { $0["id"] == entry.run["id"] } ?? entry.run)
        let membership = remote.projectCatalog.membership(for: run)
        let workspaceID = membership["workspaceId"].string.isEmpty ? NativeWorkspaceIdentity.workspaceID(run) : membership["workspaceId"].string
        guard !workspaceID.isEmpty, let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == workspaceID }) else { return false }
        let projectID = membership["workspaceId"].string == workspaceID && !membership["projectId"].string.isEmpty ? membership["projectId"].string : nil
        NativeWorkspaceNavigation.openChat(entry.run["id"].string, workspaceID: workspaceID, projectID: projectID, remote: remote, shared: shared)
        opened.removeAll { $0.id == entry.id }
        openWorkspace(NativeWorkspaceIdentity(hostID: entry.hostID, hostName: entry.hostName, profile: profile))
        remote.activity(true)
        return true
    }
    @MainActor static func associatedWorkspace(_ run: JSON, remote: RemoteStore) -> String? {
        guard run != .null else { return nil }
        let member = remote.projectCatalog.membership(for: run)["workspaceId"].string
        let id = member.isEmpty ? NativeWorkspaceIdentity.workspaceID(run) : member
        return !id.isEmpty && remote.state["context"]["workspaces"].array.contains(where: { $0["id"].string == id }) ? id : nil
    }
    /// Earlier releases saved associated chats as app tabs. Restoring that local
    /// session is not an explicit reopen of a tab the desktop may have closed.
    private func migrateAssociatedChatTabs() {
        for tab in opened where tab.kind == "chat" {
            guard let entry = chatEntry(for: tab), let remote = destinations.remote(for: entry.hostID), let workspaceID = Self.associatedWorkspace(entry.run, remote: remote) else { continue }
            let member = remote.projectCatalog.membership(for: entry.run)
            let project = member["workspaceId"].string == workspaceID ? member["projectId"].string : ""
            let key = (project.isEmpty ? "workspace-navigation:" + workspaceID : "project-navigation:" + project)
            let kind = project.isEmpty ? "workspace" : "project", ownerID = project.isEmpty ? workspaceID : project
            let scope = kind + ":" + entry.hostID + ":" + ownerID
            let wasSelected = selectedTab == tab.id
            if let encoded = try? JSONEncoder().encode(tab), let retained = try? JSONDecoder().decode(JSON.self, from: encoded) { remote.setDraft("legacy-app-chat:" + tab.id, retained) }
            opened.removeAll { $0.id == tab.id }
            if wasSelected, let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == workspaceID }) {
                if !project.isEmpty { remote.setDraft("workspace-selected-project:" + workspaceID, .string(project)) }
                openWorkspace(NativeWorkspaceIdentity(hostID: entry.hostID, hostName: entry.hostName, profile: profile))
                let restoredAppTab = selectedTab
                Task {
                    await shared.refreshContentTabs(scope: scope, remote: remote, kind: kind, id: ownerID)
                    guard selectedTab == restoredAppTab, ["", "workspace", "chat:" + entry.run["id"].string].contains(remote.draft(key)["selected"].string) else { return }
                    NativeWorkspaceNavigation.restoreOwnerChatSelection(entry.run["id"].string, descriptors: shared.workspaceContentDescriptors[scope] ?? [], navigationKey: key, remote: remote)
                }
            }
        }
    }
    private func openChat(_ entry: AggregateChat) {
        if openAssociatedChat(entry) { return }
        if NativeDesignPreview.enabled { phoneChrome.record(NativePhoneTab(id: "chat:" + entry.hostID + ":" + entry.run["id"].string, title: entry.run["title"].string, symbol: "bubble.left.and.bubble.right", detail: entry.hostName, preview: nil, select: { openChat(entry) })) }

        let id = entry.id; if !opened.contains(where: { $0.id == id }) { opened.append(NativeContentTab(id: id, title: entry.run["title"].string.isEmpty ? "Chat" : entry.run["title"].string, kind: "chat", hostID: entry.hostID)) }
        if NativePhonePreview.enabled { phoneChrome.drawer = false; phoneChrome.controlsHidden = false }
        selectedTab = id; destinations.remote(for: entry.hostID)?.activity(true) }
    private func saveNavigation() {
        guard !restoringTabs, let tabs = try? JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(opened)) else { return }
        shared.saveShellNavigation(.object(["tabs": tabs, "selected": .string(selectedTab ?? restoredSelection ?? ""), "area": .string(area.rawValue), "phoneWorkspaceHost": .string(phoneWorkspace?.hostID ?? ""), "phoneWorkspaceID": .string(phoneWorkspace?.workspaceID ?? ""), "phoneCurrentID": .string(phoneChrome.currentID)]))
    }
    private func restoreNavigation() {
        let saved = shared.loadShellNavigation()
        if let data = try? JSONEncoder().encode(saved["tabs"]), let tabs = try? JSONDecoder().decode([NativeContentTab].self, from: data) {
            opened = tabs.filter { tab in tab.kind == "browser" ? shared.tabs(in: "main").contains(where: { $0.id == tab.id }) : ["chat", "schedule", "workspace", "chat-setup", "document"].contains(tab.kind) && tab.hostID.map { destinations.remote(for: $0) != nil } == true }
        }
        area = NativeArea(rawValue: saved["area"].string) ?? .home
        phoneVisited.insert(area)
        phoneWorkspace = NativeWorkspaceIdentity.all(destinations).first { $0.hostID == saved["phoneWorkspaceHost"].string && $0.workspaceID == saved["phoneWorkspaceID"].string }
        let choice = saved["selected"].string
        restoredSelection = opened.contains(where: { $0.id == choice }) ? choice : nil
        selectedTab = restoredSelection
        if NativePhonePreview.enabled, area == .chats {
            let current = saved["phoneCurrentID"].string
            for destination in destinations.destinations {
                let prefix = "chat:" + destination.id + ":"
                if current.hasPrefix(prefix), current.count > prefix.count { notificationChatRequest = NotificationChatRequest(hostID: destination.id, chatID: String(current.dropFirst(prefix.count))); break }
            }
        }
        restoringTabs = false
    }
    private func reconcileMainBrowserTabs(_ tabs: [BrowserDescriptor]) {
        for tab in tabs where tab.scope == "main" && !opened.contains(where: { $0.id == tab.id }) {
            let item = NativeContentTab(id: tab.id, title: tab.title, kind: "browser", hostID: nil)
            if let source = shared.takeBrowserInsertionOrigin(tab.id), let index = opened.firstIndex(where: { $0.id == source && $0.kind == "browser" }) { opened.insert(item, at: index + 1) }
            else { opened.append(item) }
        }
        opened.removeAll { item in item.kind == "browser" && !tabs.contains(where: { $0.id == item.id && $0.scope == "main" }) }
        if let selectedTab, !opened.contains(where: { $0.id == selectedTab }) { self.selectedTab = nil }
    }
    private func selectContent(_ tab: NativeContentTab) { if tab.kind == "chat", let entry = chatEntry(for: tab), openAssociatedChat(entry) { return }; selectedTab = tab.id; if tab.kind == "browser" { shared.select(tab.id, in: "main") } }
    private func openWorkspace(_ entry: NativeWorkspaceIdentity) {
        if NativePhonePreview.enabled { phoneVisited.insert(.workspaces); area = .workspaces; phoneWorkspace = entry; phoneChrome.browserOwnsBack = false; phoneChrome.controlsHidden = false; phoneChrome.drawer = false }
        if !opened.contains(where: { $0.id == entry.id }) { opened.append(NativeContentTab(id: entry.id, title: entry.profile["name"].string, kind: "workspace", hostID: entry.hostID)) }
        selectedTab = entry.id
        destinations.remote(for: entry.hostID)?.setDraft("workspace-last-opened:" + entry.workspaceID, .string(ISO8601DateFormatter().string(from: Date())))
    }
    private func sendToWorkspace(_ entry: AggregateChat) {
        guard let remote = destinations.remote(for: entry.hostID), let profile = remote.state["context"]["workspaces"].array.first(where: { $0["id"].string == NativeWorkspaceIdentity.workspaceID(entry.run) }) else { return }
        let workspace = NativeWorkspaceIdentity(hostID: entry.hostID, hostName: entry.hostName, profile: profile)
        NativeWorkspaceNavigation.openChat(entry.run["id"].string, workspaceID: workspace.workspaceID, remote: remote, shared: shared)
        opened.removeAll { $0.id == entry.id }; openWorkspace(workspace)
    }
    private func openSchedule(_ schedule: JSON, hostID: String) {
        let scheduleID = schedule["id"].string
        guard !scheduleID.isEmpty else { return }
        let tabID = "schedule:\(hostID):\(scheduleID)"
        if !opened.contains(where: { $0.id == tabID }) { opened.append(NativeContentTab(id: tabID, title: schedule["name"].string.isEmpty ? "Schedule" : schedule["name"].string, kind: "schedule", hostID: hostID)) }
        selectedTab = tabID
    }
    private func closeContent(_ tab: NativeContentTab) { if tab.kind == "browser" { shared.close(tab.id) }; opened.removeAll { $0.id == tab.id }; if selectedTab == tab.id { selectedTab = opened.last?.id } }
    @discardableResult private func moveContent(_ id: String, before targetID: String) -> Bool {
        guard id != targetID, let source = opened.firstIndex(where: { $0.id == id }) else { return false }
        let tab = opened.remove(at: source)
        guard let target = opened.firstIndex(where: { $0.id == targetID }) else { opened.insert(tab, at: source); return false }
        opened.insert(tab, at: target)
        return true
    }
    private func shiftContent(_ id: String, by offset: Int) {
        guard let index = opened.firstIndex(where: { $0.id == id }), opened.indices.contains(index + offset) else { return }
        if offset < 0 { _ = moveContent(id, before: opened[index + offset].id) }
        else { _ = moveContent(opened[index + offset].id, before: id) }
    }
    private func openMainResource(_ id: String, scope: String) {
        guard id.hasPrefix("document:"), let document = shared.documents(in: scope).first(where: { "document:" + $0.id == id }), let chatID = document.sourceChatID else { return }
        let parts = scope.split(separator: ":", maxSplits: 2).map(String.init)
        guard parts.count == 3, parts[0] == "chat" else { return }
        let tabID = "document:" + parts[1] + ":" + document.id
        if !opened.contains(where: { $0.id == tabID }) { opened.append(NativeContentTab(id: tabID, title: document.title, kind: "document", hostID: parts[1], resourceScope: scope, sourceChatID: chatID, documentID: document.id)) }
        selectedTab = tabID; phoneChrome.controlsHidden = false
    }
    private func openChatSetup(_ setup: NativeChatSetup) {
        guard !setup.hostID.isEmpty, destinations.remote(for: setup.hostID) != nil else { return }
        let tab = NativeContentTab(id: "draft:" + setup.id, title: setup.title, kind: "chat-setup", hostID: setup.hostID, setup: setup)
        opened.append(tab); selectedTab = tab.id; phoneChrome.controlsHidden = false
    }
    @ViewBuilder private func contentTab(_ tab: NativeContentTab) -> some View {
        if tab.kind == "browser" { TeamBrowserView(scope: "main", showTabs: false, tabID: tab.id, onBackToList: { selectedTab = nil; area = .chats }) }
        else if let hostID = tab.hostID, let remote = destinations.remote(for: hostID) {
            if let setup = tab.setup {
                NewChatView(internet: setup.internet, lockedWorkspaceID: setup.workspaceID, lockedProjectID: setup.projectID, draftKey: setup.draftKey, onCancel: { closeContent(tab) }) { id in
                    closeContent(tab)
                    openChat(AggregateChat(hostID: hostID, hostName: remote.displayName, run: remote.chats[id] ?? .object(["id": .string(id)])))
                }.environment(remote).id(setup.id)
            } else if tab.kind == "document", let chatID = tab.sourceChatID, let scope = tab.resourceScope, let documentID = tab.documentID {
                NavigationStack { ChatView(id: chatID, onBack: { selectedTab = nil; area = .home }, workspaceBrowserScope: scope, resourceDocumentID: documentID).environment(remote) }.id(tab.id)
            } else if tab.kind == "workspace" {
                if NativePhonePreview.enabled { NavigationStack { NativeWorkspaceView(workspaceID: String(tab.id.dropFirst("workspace:\(hostID):".count)), onOpenMain: openChat).environment(remote) }.id(tab.id) }
                else { NativeWorkspaceView(workspaceID: String(tab.id.dropFirst("workspace:\(hostID):".count)), onOpenMain: openChat).environment(remote).id(tab.id) }
            } else if tab.kind == "schedule" {
                NavigationStack { ScheduleView(id: String(tab.id.dropFirst("schedule:\(hostID):".count))) { runID in openChat(AggregateChat(hostID: hostID, hostName: destinations.selectedLabel, run: .object(["id": .string(runID)]))) }.environment(remote)
                    .toolbar { if NativePhonePreview.enabled { Button("Done") { opened.removeAll { $0.id == tab.id }; selectedTab = nil; area = .home } } }
                }
            } else { NavigationStack { ChatView(id: String(tab.id.dropFirst(hostID.count + 1)), onBack: { selectedTab = nil; area = .chats }).environment(remote) }.id(tab.id) }
        } else { ContentUnavailableView("Computer unavailable", systemImage: "network.slash", description: Text("Reconnect this chat’s computer in Connections, then reopen the chat.")).frame(maxWidth: .infinity, maxHeight: .infinity) }
    }
    @ViewBuilder private func content(_ item: NativeArea) -> some View {
        switch item { case .workspaces: NativeWorkspacesView(onOpen: openWorkspace); case .home: NativeHome(openTabs: homeTabs, recent: homeRecents, onAddTab: { openChatSetup(NativeChatSetup(hostID: destinations.selectedID ?? "")) }, onManageTabs: { reorderMainTabs = true }, onBrowser: { profile in shared.open(nil, scope: "main", profileId: profile) }, showAllowance: false, onSchedule: { schedule in if let hostID = destinations.selectedID { openSchedule(schedule, hostID: hostID) } }); case .schedules: if let remote = destinations.selected { SchedulesView(onSelect: { schedule in if let hostID = destinations.selectedID { openSchedule(schedule, hostID: hostID) } }).environment(remote) } else { NativeHome() }; case .chats: AggregateChatsView(onSelect: openChat, onSendToWorkspace: sendToWorkspace, routeAssociated: openAssociatedChat, notificationRequest: notificationChatRequest, onNotificationConsumed: { notificationChatRequest = nil }); case .internet: AggregateChatsView(onSelect: openChat, onSendToWorkspace: sendToWorkspace, routeAssociated: openAssociatedChat, initialChatType: "internet"); case .attention: AggregateChatsView(onSelect: openChat, routeAssociated: openAssociatedChat, attentionOnly: true, initialAttentionTab: attentionPreferredTab); case .life: if lifeEnabled || ProcessInfo.processInfo.arguments.contains("--synthetic-life") { LifeRootView() } else { NavigationStack { NativeSetupView().nativeFeaturePage("Life") } }; case .team: TeamToolsView(); case .engine: EngineRoomView(page: $enginePage) }
    }
}
struct NativeHome: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @EnvironmentObject var destinations: DestinationStore
    var openTabs: [NativePhoneTab] = []
    var recent: [NativePhoneTab] = []
    var onAddTab: (() -> Void)? = nil
    var onManageTabs: (() -> Void)? = nil
    var onBrowser: ((String) -> Void)? = nil
    @EnvironmentObject private var shared: SharedAppStore
    @State private var recentLimit = 7
    @State private var attentionLimit = 7
    var showAllowance = true
    var onSchedule: ((JSON) -> Void)? = nil
    @State private var adding = false
    @State private var managing = false
    @State private var setup = false
    @State private var updates = false
    @State private var projectGuide = false
    private var guideLink: some View {
        Button("What Proteus can do", systemImage: "book") { projectGuide = true }
            .font(.body).frame(minHeight: 44).accessibilityIdentifier("home-project-guide")
    }
    private var attentionCount: Int? {
        let remotes = destinations.destinations.map { destinations.remote(for: $0.id) }
        guard !remotes.isEmpty, remotes.allSatisfy({ $0?.connected == true }) else { return nil }
        return NativeNavigationCounts.attention(remotes.map { $0?.state ?? .null })
    }
    private var attentionRows: [NativeAttentionItem] {
        let chats = destinations.destinations.flatMap { destination in
            (destinations.remote(for: destination.id)?.state["runs"].array ?? []).filter(nativeNeedsAttention).map { run in
                NativeAttentionItem(hostID: destination.id, hostName: destination.label, value: .object(["id": .string("chat:" + run["id"].string), "kind": .string("chat"), "chatId": run["id"], "title": run["title"], "at": run["updatedAt"]]))
            }
        }
        var seen = Set<String>()
        return (chats + nativeAttentionItems(destinations)).filter { seen.insert($0.id).inserted }.sorted { $0.value["at"].string > $1.value["at"].string }
    }
    private var version: String { Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown" }
    private var build: String { Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown" }
    private var releaseDate: String {
        guard let raw = Bundle.main.infoDictionary?["ProteusReleaseDate"] as? String else { return "" }
        let parser = DateFormatter(); parser.locale = Locale(identifier: "en_US_POSIX"); parser.timeZone = TimeZone(secondsFromGMT: 0); parser.dateFormat = "yyyy-MM-dd"; parser.isLenient = false
        guard let date = parser.date(from: raw), parser.string(from: date) == raw else { return "" }
        let display = DateFormatter(); display.locale = Locale(identifier: "en_US"); display.timeZone = parser.timeZone; display.dateFormat = "MMM d"
        return display.string(from: date)
    }
    var body: some View {
        NavigationStack {
            if let remote = destinations.selected {
                NativeList {
                    Section {
                        HStack(spacing: 10) { Text("⤨").font(.system(size: 36, weight: .bold)).foregroundStyle(Color(red: 0.67, green: 0.86, blue: 0.49)); Text("Proteus").font(.largeTitle.bold()) }
                            .accessibilityElement(children: .combine).accessibilityIdentifier("home-intro-title").frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 4)
                        Text("Proteus keeps conversations, schedules and tools connected to your computers. Choose a computer, review work that needs your input, or open a chat.")
                        Text("Version \(version)\(releaseDate.isEmpty ? "" : " · " + releaseDate) (\(build))").font(.caption).foregroundStyle(.secondary)
                        guideLink
                        Button("Future updates and changelog", systemImage: "clock.arrow.circlepath") { updates = true }
                    }
                    Section { DestinationBar(remote: remote, adding: $adding, managing: $managing, setup: $setup) }
                    if showAllowance { Section { ProviderUsageStrip(store: remote) } }
                    if NativeDesignPreview.enabled {
                        Section("Open tabs") {
                            if openTabs.isEmpty { Text("No main tabs open. Open a chat, workspace or browser tab to keep it here.").font(.caption).foregroundStyle(.secondary) }
                            ForEach(openTabs) { tab in HStack { Button(action: tab.select) { Label(tab.title, systemImage: tab.symbol).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading) }; if let close = tab.close { Button(action: close) { Image(systemName: "xmark").frame(width: 44, height: 44) }.buttonStyle(.borderless).accessibilityLabel("Close tab " + tab.title) } }.buttonStyle(.borderless) }
                            HStack { Menu { ForEach(shared.browserProfiles, id: \.self) { profile in Button("Browser · " + profile["name"].string, systemImage: "globe") { onBrowser?(profile["id"].string) } }; Button("New chat", systemImage: "square.and.pencil") { onAddTab?() } } label: { Label("Add tab", systemImage: "plus") }.accessibilityIdentifier("home-add-tab"); Spacer(); Button("Reorder", systemImage: "arrow.left.arrow.right") { onManageTabs?() }.disabled(openTabs.count < 2) }.buttonStyle(.borderless)
                        }
                        Section("Recents") {
                            ForEach(Array(recent.prefix(recentLimit))) { item in Button(action: item.select) { Label { VStack(alignment: .leading, spacing: 4) { Text(item.title).lineLimit(1); Text(item.detail).font(.caption).foregroundStyle(.secondary).lineLimit(1) } } icon: { Image(systemName: item.symbol) } } }
                            if recent.isEmpty { Text("Chats and browser tabs appear here after you use them.").font(.caption).foregroundStyle(.secondary) }
                            if recent.count > recentLimit { Button("More") { recentLimit += 7 }.accessibilityIdentifier("home-recents-more") }
                        }
                    }
                    Section(destinations.selectedLabel) { NavigationLink("Schedules" + ((remote.connected ? NativeNavigationCounts.schedules([remote.state]) : nil).map { " · \($0)" } ?? "")) { SchedulesView(onSelect: onSchedule).environment(remote) }; NavigationLink("Workspaces") { NativeWorkspacesView().modifier(NativePhoneBackNavigation()) } }
                    Section("Needs attention" + (attentionCount.map { " · \($0)" } ?? "")) {
                        NavigationLink("View all computers") { AggregateChatsView(attentionOnly: true) }
                        if NativeDesignPreview.enabled {
                            ForEach(Array(attentionRows.prefix(attentionLimit))) { item in
                                if !item.value["chatId"].string.isEmpty, let owner = destinations.remote(for: item.hostID) { NavigationLink { ChatView(id: item.value["chatId"].string).environment(owner) } label: { Label { VStack(alignment: .leading) { Text(item.value["title"].string).lineLimit(2); Text(item.hostName).font(.caption).foregroundStyle(.secondary) } } icon: { Image(systemName: "exclamationmark.circle") } } }
                                else { NavigationLink { AggregateChatsView(attentionOnly: true, initialAttentionTab: "notifications") } label: { Label(item.value["title"].string, systemImage: "exclamationmark.circle") } }
                            }
                            if attentionRows.count > attentionLimit { Button("More") { attentionLimit += 7 }.accessibilityIdentifier("home-attention-more") }
                        } else { ForEach(remote.state["runs"].array.filter(nativeNeedsAttention), id: \.self) { run in NavigationLink { ChatView(id: run["id"].string).environment(remote) } label: { Label(run["title"].string, systemImage: "exclamationmark.circle") } } }
                    }
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("--synthetic-notification-controls") {
                        Section("Notification routing fixture") {
                            NativeNotificationProbe()
                            Button("Show in-app notification fixture") { NativeNotifications.shared.presentBanner("A chat finished.", destination: .init(hostID: "10000000-0000-4000-8000-000000000001", chatID: "notification-chat", scheduleID: "", type: "chat.completed")) }
                            Button("Tap chat notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "notification-chat", "type": "chat.completed"]) }
                            Button("Tap website notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "type": "website.notification", "notificationId": "20000000-0000-4000-8000-000000000002"]) }
                            Button("Tap schedule notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "scheduleId": "notification-schedule", "type": "schedule.completed"]) }
                            Button("Tap unavailable notification") { NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "missing-chat", "type": "chat.completed"]) }
                            Button("Schedule iOS notification fixture") { Task { do { try await NativeNotifications.shared.scheduleFixtureTap() } catch { NativeNotifications.shared.fixtureStatus = error.localizedDescription; destinations.error = error.localizedDescription } } }
                            Button("Stage background chat notification") { Task { try? await Task.sleep(for: .seconds(1)); NativeNotifications.shared.receivedTap(["hostId": "10000000-0000-4000-8000-000000000001", "chatId": "notification-chat", "type": "chat.completed"]) } }
                        }
                    }
                    #endif
                }.contentMargins(.top, sizeClass == .regular ? 0 : nil, for: .scrollContent).navigationTitle(NativeDesignPreview.enabled ? "" : "Home")
                    .toolbar(sizeClass == .regular ? .hidden : .automatic, for: .navigationBar)
                    .safeAreaInset(edge: .top, spacing: 0) {
                        if sizeClass == .regular && !NativeDesignPreview.enabled {
                            Text("Home").font(.largeTitle.bold()).frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 20).padding(.vertical, 16).accessibilityIdentifier("home-page-heading")
                        }
                    }.nativeFeaturePage("Home")
            } else { VStack(spacing: 0) { HStack(spacing: 10) { Text("⤨").font(.system(size: 34, weight: .bold)).foregroundStyle(NativeTheme.accent); VStack(alignment: .leading) { Text("Proteus").font(.largeTitle.bold()); Text("\(version) (\(build))").font(.caption).foregroundStyle(.secondary) }; Spacer(); Button("Future updates and changelog") { updates = true }.font(.caption) }.padding(); guideLink.padding(.horizontal).padding(.bottom, 12); PairView() }.toolbar { Button("App setup") { setup = true }.accessibilityIdentifier("app-setup") } }
        }
        .sheet(isPresented: $projectGuide) { NativeProjectGuide() }
        .sheet(isPresented: $updates) { NavigationStack { NativeList {
            Section("Installed release") { Text("Proteus \(version) (\(build))"); Text("The displayed version comes from this installed app bundle.").font(.caption).foregroundStyle(.secondary) }
            Section("Changes in \(version)") {
                Text("Content tabs and nested chat and Team tools keep their order across app restarts. Browser pages resume on selection, with the six most recently touched or past-hour pages retained in memory.")
                Text("Home now shows release information. Reviewed failed chats leave Needs Attention; pending approvals remain visible.")
                Text("Notification taps open the related computer, chat or schedule. An unavailable target returns to Notifications with a clear explanation.")
                Text("Chats can be archived, restored or deleted from the list or conversation view. Date filters and Show Archived help find older work; deleting a Proteus record leaves generated files and provider originals in place.")
                Text("Chat history groups routine activity, keeps failed tools visible, loads earlier messages and shows provider details. Generated Markdown and self-contained HTML require a specific host approval before viewing; HTML scripts are off until enabled for that preview.")
                Text("Attachment selection appears only after the connected computer advertises its approved attachment capability. File delivery also requires explicit confirmation of the destination provider.")
            }
            Section("Release history") { DisclosureGroup("Full changelog") { BundledChangelogView() } }
            Section("Update availability") { Text("This signed development build is installed through Xcode. Install availability is managed by its distribution source; Proteus cannot check a store feed for this build.") }
        }.background(NativeTheme.background).navigationTitle("Updates and changelog").toolbar { Button("Done") { updates = false } } } }
        .sheet(isPresented: $setup) { NavigationStack { NativeSetupView() } }
        .sheet(isPresented: $managing) { NavigationStack { DestinationsView { managing = false; adding = true }.toolbar { Button("Done") { managing = false } } } }
        .sheet(isPresented: $adding, onDismiss: { destinations.cancelPairing() }) { NavigationStack { PairView().toolbar { Button("Cancel") { adding = false } } } }
        .onChange(of: destinations.pairing != nil) { _, value in if !value { adding = false } }
    }
}
private struct NativeProjectGuide: View {
    @Environment(\.dismiss) private var dismiss
    private let content = Bundle.main.url(forResource: "README", withExtension: "md")
        .flatMap { try? String(contentsOf: $0, encoding: .utf8) }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Your computers run AI work. Keep chats, schedules, browser pages, documents, Team Tools and Life connected across your devices.")
                    if let content {
                        ForEach(Array(content.components(separatedBy: "\n\n").enumerated()), id: \.offset) { _, paragraph in
                            if paragraph.hasPrefix("#") {
                                Text(paragraph.drop(while: { $0 == "#" || $0 == " " }))
                                    .font(paragraph.hasPrefix("# ") ? .title.bold() : .title2.bold())
                                    .accessibilityAddTraits(.isHeader)
                            } else if paragraph.hasPrefix("```") {
                                Text(paragraph.components(separatedBy: "\n").dropFirst().dropLast().joined(separator: "\n"))
                                    .font(.body.monospaced()).textSelection(.enabled)
                            } else {
                                let prose = paragraph.replacingOccurrences(of: "\n(?![-*] |[0-9]+\\. )", with: " ", options: .regularExpression)
                                Text((try? AttributedString(markdown: prose, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(prose))
                                    .font(.body).textSelection(.enabled)
                            }
                        }
                    } else { Text("The project guide was not included with this build.") }
                }.frame(maxWidth: .infinity, alignment: .leading).padding(20)
            }.accessibilityIdentifier("home-project-guide-content")
                .navigationTitle("What Proteus can do").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.accessibilityIdentifier("home-project-guide-done") } }
        }
    }
}
private struct BundledChangelogView: View {
    @State private var content: String?
    var body: some View {
        Group {
            if let content {
                Text((try? AttributedString(markdown: content)) ?? AttributedString(content))
                    .font(.caption).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("bundled-changelog")
            } else { Text("The bundled changelog is unavailable in this build.").font(.caption).foregroundStyle(.secondary) }
        }.task {
            guard content == nil else { return }
            if let file = Bundle.main.url(forResource: "CHANGELOG", withExtension: "md"),
               let body = try? String(contentsOf: file, encoding: .utf8) { content = body }
        }
    }
}
struct AggregateChat: Identifiable { let hostID: String; let hostName: String; let run: JSON; var id: String { hostID + ":" + run["id"].string } }
private func chatRowTimestamp(_ run: JSON, timeZone: TimeZone) -> String {
    let value = run["updatedAt"].string.isEmpty ? run["createdAt"].string : run["updatedAt"].string
    let fractional = ISO8601DateFormatter(); fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let date = fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value) else { return "" }
    let formatter = DateFormatter(); formatter.dateStyle = .short; formatter.timeStyle = .short; formatter.timeZone = timeZone
    return formatter.string(from: date)
}
func nativeChatType(_ run: JSON) -> String {
    if run["chatType"].string == "internet" { return "internet" }
    let trigger = run["trigger"].string
    return (!trigger.isEmpty && trigger != "chat") || !run["scheduleName"].string.isEmpty ? "scheduled" : "user"
}
struct AggregateChatsView: View {
    @Environment(\.nativeOpenChatSetup) private var openSetup
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.timeZone) private var timeZone
    @Environment(\.horizontalSizeClass) private var sizeClass
    var onSelect: ((AggregateChat) -> Void)? = nil
    var onSendToWorkspace: ((AggregateChat) -> Void)? = nil
    /// Opens an associated chat inside its workspace/project; false keeps it local.
    var routeAssociated: ((AggregateChat) -> Bool)? = nil
    var lockedWorkspaceID: String? = nil
    var lockedHostID: String? = nil
    var lockedProjectID: String? = nil
    var initialChatType = "user"
    @State private var chatType = "user"
    var attentionOnly = false
    var initialAttentionTab = "chats"
    var notificationRequest: NotificationChatRequest? = nil
    var onNotificationConsumed: (() -> Void)? = nil
    @State private var attentionTab = "chats"
    @State private var query = ""
    @State private var filter = "all"
    @State private var workspaceFilter = ""
    @State private var filtersExpanded = false
    @State private var fromEnabled = false
    @State private var throughEnabled = false
    @State private var fromDate = Date()
    @State private var throughDate = Date()
    @State private var showArchived = false
    @State private var newChat = false
    @State private var selected: AggregateChat?
    @State private var selectedWorkspace: NativeWorkspaceIdentity?
    @State private var pendingDelete: AggregateChat?
    @State private var pendingRename: AggregateChat?
    private var chats: [AggregateChat] {
        destinations.destinations.flatMap { d in
            guard let remote = destinations.remote(for: d.id) else { return [AggregateChat]() }
            let rows = showArchived && !remote.allRuns.isEmpty ? remote.allRuns : remote.state["runs"].array
            return rows.map { AggregateChat(hostID: d.id, hostName: d.label, run: $0) }
        }
            .filter { item in
                guard (filter == "all" || item.hostID == filter),
                      (lockedHostID == nil || item.hostID == lockedHostID),
                      (lockedWorkspaceID == nil || (destinations.remote(for: item.hostID)?.supportsProjects == true ? destinations.remote(for: item.hostID)?.projectCatalog.membership(for: item.run)["workspaceId"].string : NativeWorkspaceIdentity.workspaceID(item.run)) == lockedWorkspaceID),
                      (lockedProjectID == nil || destinations.remote(for: item.hostID)?.projectCatalog.membership(for: item.run)["projectId"].string == lockedProjectID),
                      (workspaceFilter.isEmpty || item.hostID + ":" + NativeWorkspaceIdentity.workspaceID(item.run) == workspaceFilter),
                      (showArchived || item.run["archivedAt"].string.isEmpty),
                      (attentionOnly || chatType == "all" || nativeChatType(item.run) == chatType),
                      (!attentionOnly || nativeNeedsAttention(item.run)),
                      (query.isEmpty || (item.run["title"].string + " " + item.hostName).localizedCaseInsensitiveContains(query)) else { return false }
                guard fromEnabled || throughEnabled else { return true }
                let timestamp = item.run["updatedAt"].string.isEmpty ? item.run["createdAt"].string : item.run["updatedAt"].string
                guard let date = ProviderAllowance.date(timestamp) else { return false }
                if fromEnabled && date < Calendar.current.startOfDay(for: fromDate) { return false }
                if throughEnabled, let end = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: throughDate)), date >= end { return false }
                return true
            }
            .sorted { ($0.run["updatedAt"].string.isEmpty ? $0.run["createdAt"].string : $0.run["updatedAt"].string) > ($1.run["updatedAt"].string.isEmpty ? $1.run["createdAt"].string : $1.run["updatedAt"].string) }
    }
    var body: some View {
        NavigationStack {
            NativeList {
                if attentionOnly { Picker("Needs attention", selection: $attentionTab) { Text("Chats").tag("chats"); Text("Notifications").tag("notifications") }.pickerStyle(.segmented) }
                if attentionOnly && attentionTab == "notifications" {
                    ForEach(nativeAttentionItems(destinations)) { item in
                        Section {
                            Text(item.value["title"].string).font(.headline)
                            Text(item.hostName).font(.caption).foregroundStyle(.secondary)
                            if !item.value["body"].string.isEmpty { Text(item.value["body"].string) }
                            if !item.value["chatId"].string.isEmpty { Button("Open chat") { let chat = AggregateChat(hostID: item.hostID, hostName: item.hostName, run: .object(["id": item.value["chatId"]])); choose(chat) } }
                            if item.value["kind"].string == "connection" { Button("Open connections") { NativeNotifications.shared.route = .init(hostID: item.hostID, chatID: "", scheduleID: "", type: "connection") } }
                            if !item.value["notificationId"].string.isEmpty { Button("Mark read") { Task { if let remote = destinations.remote(for: item.hostID) { _ = try? await remote.request("notifications.read", ["id": item.value["notificationId"]]); await remote.refresh() } } } }
                        }
                    }
                    if nativeAttentionItems(destinations).isEmpty { Text("No notifications need action.").foregroundStyle(.secondary) }
                } else {
                if !attentionOnly { Picker("Chat type", selection: $chatType) { if lockedWorkspaceID != nil { Text("All").tag("all") }; Text("User Chats").tag("user"); Text("Scheduled Tasks").tag("scheduled"); Text("Internet Searches").tag("internet") }.pickerStyle(.segmented) }
                DisclosureGroup("Filters", isExpanded: $filtersExpanded) {
                    if let lockedWorkspaceID { LabeledContent("Workspace", value: NativeWorkspaceIdentity.all(destinations).first { $0.workspaceID == lockedWorkspaceID && $0.hostID == lockedHostID }?.profile["name"].string ?? lockedWorkspaceID) }
                    else {
                        Picker("Host filter", selection: $filter) { Text("All computers").tag("all"); ForEach(destinations.destinations) { Text($0.label).tag($0.id) } }
                        Picker("Workspace", selection: $workspaceFilter) { Text("All workspaces").tag(""); ForEach(NativeWorkspaceIdentity.all(destinations)) { entry in Text(entry.profile["name"].string + " · " + entry.hostName).tag(entry.hostID + ":" + entry.workspaceID) } }
                    }
                    Toggle("From Date", isOn: $fromEnabled)
                    if fromEnabled { DatePicker("From Date", selection: $fromDate, displayedComponents: .date).datePickerStyle(.compact) }
                    Toggle("Through Date", isOn: $throughEnabled)
                    if throughEnabled { DatePicker("Through Date", selection: $throughDate, displayedComponents: .date).datePickerStyle(.compact) }
                    Toggle("Show Archived", isOn: $showArchived)
                }
                Section { Text("New chats execute on \(lockedHostID.flatMap { id in destinations.destinations.first { $0.id == id }?.label } ?? destinations.selectedLabel). Viewing another computer’s history does not change that destination.").font(.caption).foregroundStyle(.secondary) }
                ForEach(chats) { item in chatRow(item) }
                ForEach(destinations.destinations) { d in if let remote = destinations.remote(for: d.id), (showArchived ? remote.allRuns.count < remote.allRunCount : remote.state["runs"].array.count < remote.state["runCount"].int) { Button("Load older · " + d.label) { Task { if showArchived { await remote.loadAllRuns() } else { await remote.loadMoreRuns() } } }.disabled(!remote.connected) } }
                }
            }.background(NativeTheme.background).navigationTitle(NativeDesignPreview.enabled || sizeClass == .regular ? "" : attentionOnly ? "Needs attention" : "Chats").safeAreaInset(edge: .top, spacing: 0) { if sizeClass == .regular && !NativeDesignPreview.enabled { Text(attentionOnly ? "Needs attention" : "Chats").font(.title2.bold()).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 20).padding(.vertical, 12).background(NativeTheme.background) } }.onAppear { chatType = initialChatType; attentionTab = initialAttentionTab }.onChange(of: initialAttentionTab) { _, value in attentionTab = value }.onChange(of: initialChatType) { _, value in chatType = value }.nativeFeaturePage(attentionOnly ? "Needs Attention" : initialChatType == "internet" ? "Internet Searches" : "Chats", search: $query, embedded: lockedWorkspaceID != nil).refreshable { await destinations.refreshAll() }
                .toolbar { if lockedHostID == nil { Menu { ForEach(destinations.destinations) { d in Button(d.label) { try? destinations.select(d.id) } } } label: { Label(destinations.selectedLabel, systemImage: "desktopcomputer") } }; Button("New chat", systemImage: "square.and.pencil") {
                    if let remote = lockedHostID.flatMap({ destinations.remote(for: $0) }) ?? destinations.selected, let openSetup {
                        openSetup(NativeChatSetup(hostID: remote.connection?.hostId ?? "", workspaceID: lockedWorkspaceID, projectID: lockedProjectID, internet: chatType == "internet"))
                    } else { newChat = true }
                }.disabled((lockedHostID.flatMap { destinations.remote(for: $0) } ?? destinations.selected)?.connected != true).accessibilityIdentifier("new-chat") }
                .sheet(isPresented: $newChat) { if let remote = lockedHostID.flatMap({ destinations.remote(for: $0) }) ?? destinations.selected { NewChatView(internet: chatType == "internet", lockedWorkspaceID: lockedWorkspaceID, lockedProjectID: lockedProjectID) { id in newChat = false; let item = AggregateChat(hostID: remote.connection?.hostId ?? "", hostName: destinations.destinations.first(where: { $0.id == remote.connection?.hostId })?.label ?? "Computer", run: .object(["id": .string(id)])); choose(item) }.environment(remote) } }
                .navigationDestination(item: $selected) { item in if let remote = destinations.remote(for: item.hostID) { ChatView(id: item.run["id"].string).environment(remote) } }
                .navigationDestination(item: $selectedWorkspace) { item in if let remote = destinations.remote(for: item.hostID) { NativeWorkspaceView(workspaceID: item.workspaceID).environment(remote) } }
                .onChange(of: notificationRequest) { _, request in if let request { openNotificationChat(request) } }
                .onChange(of: showArchived) { _, visible in if visible { Task { for destination in destinations.destinations { await destinations.remote(for: destination.id)?.loadAllRuns(reset: true) } } } }
                .onChange(of: destinations.deletedChat) { _, event in if let event, selected?.hostID == event.hostID, selected?.run["id"].string == event.chatID { selected = nil } }
                .confirmationDialog("Delete this chat?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })) {
                    Button("Delete chat", role: .destructive) { if let item = pendingDelete { Task { await delete(item) } }; pendingDelete = nil }
                    Button("Cancel", role: .cancel) {}
                } message: { Text("Only the Proteus chat record will be removed. Generated files and the provider’s original chat remain.") }
                .sheet(item: $pendingRename) { item in if let remote = destinations.remote(for: item.hostID) { NativeChatRenameView(run: item.run).environment(remote) } }
        }.task {
            await destinations.refreshAll()
            if let request = notificationRequest { openNotificationChat(request) }
        }
    }
    private func choose(_ item: AggregateChat) {
        if let onSelect { onSelect(item) } else if routeAssociated?(item) == true { selected = nil } else { selected = item }
    }
    private func openNotificationChat(_ request: NotificationChatRequest) {
        guard let remote = destinations.remote(for: request.hostID), let run = remote.chats[request.chatID] else { return }
        let item = AggregateChat(hostID: request.hostID, hostName: destinations.destinations.first(where: { $0.id == request.hostID })?.label ?? "Computer", run: run)
        choose(item)
        onNotificationConsumed?()
    }
    private func chatRow(_ item: AggregateChat) -> some View {
        Button {
            destinations.remote(for: item.hostID)?.activity(true)
            choose(item)
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    if item.run["status"].string == "running" { ProgressView().tint(NativeTheme.accent).controlSize(.small).accessibilityLabel("Running") }
                    if item.run["attentionRequired"].bool { Text("!").foregroundStyle(.orange) }
                    Text(item.run["title"].string).foregroundStyle(.primary).font(.headline)
                    if !item.run["archivedAt"].string.isEmpty { Text("Archived").font(.caption2).foregroundStyle(.secondary) }
                }
                HStack(spacing: 8) {
                    Text(item.hostName + " · " + statusLabel(item.run["status"].string)).lineLimit(1).truncationMode(.middle)
                    Spacer(minLength: 4)
                    Text(chatRowTimestamp(item.run, timeZone: timeZone)).lineLimit(1).fixedSize(horizontal: true, vertical: false)
                }.font(.caption).foregroundStyle(.secondary)
                if destinations.remote(for: item.hostID)?.connected != true { Text("Offline · cached history").font(.caption2).foregroundStyle(.orange) }
            }
        }.contextMenu {
            Button("Open", systemImage: "arrow.up.right.square") { choose(item) }
            if lockedWorkspaceID == nil, !NativeWorkspaceIdentity.workspaceID(item.run).isEmpty {
                Button("Send tab to workspace", systemImage: "square") {
                    if let onSendToWorkspace { onSendToWorkspace(item) }
                    else if let workspace = NativeWorkspaceIdentity.all(destinations).first(where: { $0.hostID == item.hostID && $0.workspaceID == NativeWorkspaceIdentity.workspaceID(item.run) }), let remote = destinations.remote(for: item.hostID) { NativeWorkspaceNavigation.openChat(item.run["id"].string, workspaceID: workspace.workspaceID, remote: remote, shared: shared); selectedWorkspace = workspace }
                }
            }
            Button("Copy chat link", systemImage: "link") { UIPasteboard.general.url = NativeChatLink.url(host: item.hostID, id: item.run["id"].string) }
            Button("Copy chat name", systemImage: "doc.on.doc") { UIPasteboard.general.string = item.run["title"].string }
            if destinations.remote(for: item.hostID)?.state["capabilities"].array.contains(.string("chat.rename.v1")) == true { Button("Rename", systemImage: "pencil") { pendingRename = item }.disabled(destinations.remote(for: item.hostID)?.connected != true) }
            if canManage(item) {
                Button(item.run["archived"].bool ? "Unarchive" : "Archive", systemImage: "archivebox") { Task { await archive(item) } }.disabled(chatHasPendingWork(item.run))
                Button("Delete chat", systemImage: "trash", role: .destructive) { pendingDelete = item }.disabled(chatHasPendingWork(item.run))
            }
        }
    }
    private func canManage(_ item: AggregateChat) -> Bool {
        guard let remote = destinations.remote(for: item.hostID) else { return false }
        return remote.connected && remote.state["capabilities"].array.contains(.string("chat.lifecycle.v1"))
    }
    private func archive(_ item: AggregateChat) async {
        guard let remote = destinations.remote(for: item.hostID) else { return }
        do { try await remote.archiveChat(item.run["id"].string, archived: !item.run["archived"].bool); if showArchived { await remote.loadAllRuns(reset: true) } }
        catch { remote.error = error.localizedDescription }
    }
    private func delete(_ item: AggregateChat) async {
        guard let remote = destinations.remote(for: item.hostID) else { return }
        do { try await remote.deleteChat(item.run["id"].string); if showArchived { await remote.loadAllRuns(reset: true) } }
        catch { remote.error = error.localizedDescription }
    }
}
func chatHasPendingWork(_ run: JSON) -> Bool {
    ["running", "queued", "awaiting_input"].contains(run["status"].string) || !run["queuedMessages"].array.isEmpty
}
extension AggregateChat: Hashable { static func == (lhs: Self, rhs: Self) -> Bool { lhs.id == rhs.id }; func hash(into hasher: inout Hasher) { hasher.combine(id) } }

private struct RunningChatPulse: ViewModifier {
    let running: Bool
    @Environment(\.accessibilityReduceMotion) private var reduced
    @State private var dim = false
    func body(content: Content) -> some View {
        content.opacity(running && !reduced && dim ? 0.55 : 1)
            .animation(running && !reduced ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true) : .default, value: dim)
            .onAppear { dim = running && !reduced }
            .onChange(of: running) { _, value in dim = value && !reduced }
            .onChange(of: reduced) { _, value in dim = running && !value }
    }
}

struct NativeList<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        List { content().listRowBackground(NativeTheme.surface) }
            .scrollContentBackground(.hidden).background(NativeTheme.background)
    }
}
struct NativeForm<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        Form { content().listRowBackground(NativeTheme.surface) }
            .scrollContentBackground(.hidden).background(NativeTheme.background)
    }
}


struct NativeAttentionItem: Identifiable {
    let hostID: String
    let hostName: String
    let value: JSON
    var id: String { hostID + ":" + value["id"].string }
}
@MainActor func nativeAttentionItems(_ destinations: DestinationStore) -> [NativeAttentionItem] {
    destinations.destinations.flatMap { destination in
        let remote = destinations.remote(for: destination.id)
        let attention = remote?.state["attention"].array ?? []
        // One title index per host: a linear run search per item made ~1,000 attention items
        // cost seconds of main-thread time across Home and drawer counts.
        var titles: [String: String] = [:]
        if !attention.isEmpty, let remote {
            for run in remote.allRuns { titles[run["id"].string] = run["title"].string }
            for run in remote.state["runs"].array { titles[run["id"].string] = run["title"].string }
            for (id, run) in remote.chats { titles[id] = run["title"].string }
        }
        return attention.map { item in
            var fields = item.object
            let title = (titles[item["chatId"].string] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if !title.isEmpty { fields["title"] = .string(title); fields["notificationTitle"] = item["title"] }
            return NativeAttentionItem(hostID: destination.id, hostName: destination.label, value: .object(fields))
        }
    }.sorted { $0.value["at"].string > $1.value["at"].string }
}

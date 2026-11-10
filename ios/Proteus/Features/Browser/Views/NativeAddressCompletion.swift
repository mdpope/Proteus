import SwiftUI
import UIKit

enum NativeAddressCompletion {
    struct Match: Equatable { let url: String; let suffix: String }
    static func base(_ raw: String) -> String? {
        guard var parts = URLComponents(string: raw), ["http", "https"].contains(parts.scheme?.lowercased() ?? ""), parts.host?.isEmpty == false, parts.user == nil, parts.password == nil else { return nil }
        parts.path = "/"; parts.query = nil; parts.fragment = nil
        return parts.url?.absoluteString
    }
    static func match(_ text: String, sites: [JSON]) -> Match? {
        guard !text.isEmpty, text.count <= 1024, !text.contains(where: { $0.isWhitespace || "@\\?#".contains($0) }) else { return nil }
        let lower = text.lowercased(), scheme = lower.hasPrefix("https://") ? "https://" : lower.hasPrefix("http://") ? "http://" : ""
        let typedHost = String(lower.dropFirst(scheme.count))
        guard !typedHost.isEmpty, !typedHost.contains("/") else { return nil }
        for site in sites {
            guard let base = base(site["url"].string), let parts = URLComponents(string: base), let host = parts.host, let protocolName = parts.scheme else { continue }
            if !scheme.isEmpty && scheme != protocolName + "://" { continue }
            let hosts = [host + (parts.port.map { ":\($0)" } ?? ""), site["displayHost"].string].filter { !$0.isEmpty }
            for host in hosts {
                let visibleHost = !typedHost.hasPrefix("www.") && host.lowercased().hasPrefix("www.") ? String(host.dropFirst(4)) : host
                let visible = (scheme.isEmpty ? "" : protocolName + "://") + visibleHost + "/"
                if visible.lowercased().hasPrefix(lower), visible.count > text.count { return Match(url: base, suffix: String(visible.dropFirst(text.count))) }
            }
        }
        return nil
    }
    static func ranked(_ items: [JSON]) -> [JSON] {
        var sites: [String: (count: Int, date: String)] = [:], seen = Set<String>()
        for item in items {
            guard let base = base(item["url"].string) else { continue }
            let at = item["visitedAt"].string.isEmpty ? item["createdAt"].string : item["visitedAt"].string
            let id = item["eventId"].string.isEmpty ? (item["id"].string.isEmpty ? item["url"].string + "|" + at : item["id"].string) : item["eventId"].string
            guard seen.insert(id).inserted else { continue }
            let prior = sites[base] ?? (0, ""); sites[base] = (prior.count + 1, max(prior.date, at))
        }
        return sites.sorted { a, b in a.value.count == b.value.count ? (a.value.date == b.value.date ? a.key < b.key : a.value.date > b.value.date) : a.value.count > b.value.count }.map { .object(["url": .string($0.key), "visits": .number(Double($0.value.count)), "lastVisitedAt": .string($0.value.date)]) }
    }
    @MainActor static func insertionAtEnd() -> Bool {
        func active(_ view: UIView) -> (any UITextInput)? {
            if view.isFirstResponder, let input = view as? any UITextInput { return input }
            for child in view.subviews { if let result = active(child) { return result } }
            return nil
        }
        for scene in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }) {
            for window in scene.windows where window.isKeyWindow {
                guard let input = active(window), input.markedTextRange == nil, let selection = input.selectedTextRange else { continue }
                return input.offset(from: selection.start, to: selection.end) == 0 && input.offset(from: selection.end, to: input.endOfDocument) == 0
            }
        }
        return false
    }
}

/// Retains the existing native field, multiline editing, selection and IME.
struct NativeAddressGhost: ViewModifier {
    @Binding var text: String
    let sites: [JSON]
    let focused: Bool
    let submit: () -> Void
    @State private var eligible = false
    @State private var dismissed: String?
    @State private var shown: NativeAddressCompletion.Match?
    @State private var shownText = ""
    private var suggestion: NativeAddressCompletion.Match? { focused && eligible && dismissed != text ? NativeAddressCompletion.match(text, sites: sites) : nil }
    private func repaint() { DispatchQueue.main.async { eligible = focused && NativeAddressCompletion.insertionAtEnd() } }
    func body(content: Content) -> some View {
        content.overlay(alignment: .leading) {
            if let suggestion { (Text(text).foregroundColor(.clear) + Text(suggestion.suffix).foregroundColor(.secondary.opacity(0.65))).lineLimit(1).clipped().allowsHitTesting(false).accessibilityHidden(true).accessibilityIdentifier("address-completion-ghost") }
        }
        .onSubmit {
            // UIKit may resign the field before delivering Submit. Accept the
            // suffix it displayed, using the last observed caret/IME eligibility.
            if dismissed != text, shownText == text, let shown { text = shown.url }
            submit()
        }
        .onChange(of: suggestion) { _, value in
            // Preserve the presented completion across UIKit's focus loss on Go.
            // Selection/IME changes while editing still clear it immediately.
            if focused { shown = value; shownText = text }
        }
        .onChange(of: text) { _, _ in dismissed = nil; repaint() }
        .onChange(of: focused) { _, _ in repaint() }
        .simultaneousGesture(TapGesture().onEnded { repaint() })
        .onKeyPress(phases: .down) { press in
            if press.key == .escape { dismissed = text; eligible = false }
            if press.key == .tab && press.modifiers.isEmpty && focused && NativeAddressCompletion.insertionAtEnd(), let match = NativeAddressCompletion.match(text, sites: sites) { text = match.url; repaint(); return .handled }
            repaint(); return .ignored
        }
        .onReceive(NotificationCenter.default.publisher(for: UITextField.textDidBeginEditingNotification)) { _ in repaint() }
        .onReceive(NotificationCenter.default.publisher(for: UITextView.textDidBeginEditingNotification)) { _ in repaint() }
    }
}

struct NativeHistorySiteIcon: View {
    let item: JSON
    @State private var image: UIImage?
    var body: some View {
        Group { if let image { Image(uiImage: image).resizable().scaledToFit() } else { Image(systemName: "globe").foregroundStyle(.secondary) } }.frame(width: 20, height: 20).accessibilityHidden(true)
            .task(id: item["favicon"].string) {
                let text = item["favicon"].string
                guard text.hasPrefix("data:image/png;base64,"), text.count <= 98304, let data = Data(base64Encoded: String(text.dropFirst(22))) else { image = nil; return }
                image = UIImage(data: data)
            }
    }
}

/// Wraps URL display by character while Return submits and pasted line breaks
/// are removed. UIKit keeps native selection, marked text and caret behavior.
struct NativeWrappingAddressEditor: UIViewRepresentable {
    @Binding var text: String
    var focused: Binding<Bool>
    var sites: [JSON]
    var submit: () -> Void
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> UITextView {
        let view = UITextView(); view.delegate = context.coordinator
        view.font = .systemFont(ofSize: 14); view.textColor = .label; view.backgroundColor = .clear
        view.spellCheckingType = .no; view.smartQuotesType = .no; view.smartDashesType = .no; view.smartInsertDeleteType = .no
        view.keyboardType = .URL; view.returnKeyType = .go; view.autocapitalizationType = .none; view.autocorrectionType = .no
        view.textContainerInset = .zero; view.textContainer.lineFragmentPadding = 0
        view.textContainer.lineBreakMode = .byCharWrapping; view.isScrollEnabled = false
        view.accessibilityIdentifier = "browser-address-editor"
        let twice = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.selectAll(_:))); twice.numberOfTapsRequired = 2; twice.cancelsTouchesInView = false; view.addGestureRecognizer(twice)
        return view
    }
    func updateUIView(_ view: UITextView, context: Context) {
        context.coordinator.parent = self
        if view.text != text, view.markedTextRange == nil { view.text = text }
        if focused.wrappedValue, !view.isFirstResponder { DispatchQueue.main.async { [weak view, weak coordinator = context.coordinator] in if coordinator?.parent.focused.wrappedValue == true, view?.window != nil { view?.becomeFirstResponder() } } }
        if !focused.wrappedValue, view.isFirstResponder { DispatchQueue.main.async { [weak view, weak coordinator = context.coordinator] in if coordinator?.parent.focused.wrappedValue == false { view?.resignFirstResponder() } } }
    }
    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextView, context: Context) -> CGSize? {
        guard let width = proposal.width, width > 0 else { return nil }
        let size = uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude))
        uiView.isScrollEnabled = size.height > 240
        return CGSize(width: width, height: min(240, max(22, size.height)))
    }
    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: NativeWrappingAddressEditor
        init(_ parent: NativeWrappingAddressEditor) { self.parent = parent }
        @objc func selectAll(_ recognizer: UITapGestureRecognizer) {
            guard let view = recognizer.view as? UITextView else { return }
            parent.focused.wrappedValue = true; view.becomeFirstResponder(); view.selectAll(nil)
            DispatchQueue.main.async { [weak view] in if view?.isFirstResponder == true { view?.selectAll(nil) } }
        }
        func textViewDidBeginEditing(_ view: UITextView) { parent.focused.wrappedValue = true }
        func textViewDidEndEditing(_ view: UITextView) { parent.focused.wrappedValue = false }
        func textViewDidChange(_ view: UITextView) { parent.text = view.text }
        func textView(_ view: UITextView, shouldChangeTextIn range: NSRange, replacementText value: String) -> Bool {
            if value == "\n" || value == "\r" {
                guard view.markedTextRange == nil else { return false }
                if view.selectedRange.length == 0, view.selectedRange.location == view.text.utf16.count, let completion = NativeAddressCompletion.match(view.text, sites: parent.sites) { parent.text = completion.url }
                parent.submit(); return false
            }
            if value.rangeOfCharacter(from: .newlines) != nil {
                let cleaned = value.components(separatedBy: .newlines).joined()
                view.text = (view.text as NSString).replacingCharacters(in: range, with: cleaned)
                view.selectedRange = NSRange(location: range.location + cleaned.utf16.count, length: 0)
                parent.text = view.text; return false
            }
            return true
        }
    }
}

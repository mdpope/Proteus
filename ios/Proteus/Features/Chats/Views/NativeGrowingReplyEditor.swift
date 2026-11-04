import SwiftUI
import UIKit

enum NativeReplyEditorLayout {
    static func height(contentHeight: CGFloat, screenHeight: CGFloat, chromeHeight: CGFloat) -> CGFloat {
        min(max(44, ceil(contentHeight)), max(44, screenHeight * 0.5 - chromeHeight))
    }
}

/// A plain-text editor with native selection/scrolling and explicit Return ownership.
final class NativeReplyTextView: UITextView {
    var submitOnReturn = false
    private var heldShift = false
    var submit: () -> Void = {}
    var windowHeightChanged: (CGFloat) -> Void = { _ in }
    private var lastWindowHeight: CGFloat = 0
    private(set) var insertingLiteralText = false
    let placeholder = UILabel()
    private lazy var returnCommands: [UIKeyCommand] = {
        let send = UIKeyCommand(input: "\r", modifierFlags: [], action: #selector(handleSendReturn(_:)))
        let newline = UIKeyCommand(input: "\r", modifierFlags: .shift, action: #selector(handleNewlineReturn(_:)))
        send.wantsPriorityOverSystemBehavior = true; newline.wantsPriorityOverSystemBehavior = true
        return [send, newline]
    }()
    override var keyCommands: [UIKeyCommand]? {
        guard submitOnReturn else { return super.keyCommands }
        return returnCommands + (super.keyCommands ?? [])
    }
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if submitOnReturn && (action == #selector(handleSendReturn(_:)) || action == #selector(handleNewlineReturn(_:))) { return true }
        return super.canPerformAction(action, withSender: sender)
    }
    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        for key in presses.compactMap(\.key) {
            if key.keyCode == .keyboardLeftShift || key.keyCode == .keyboardRightShift { heldShift = true }
        }
        if submitOnReturn, let key = presses.compactMap(\.key).first(where: { $0.keyCode == .keyboardReturnOrEnter || $0.keyCode == .keypadEnter || $0.charactersIgnoringModifiers == "\r" || $0.charactersIgnoringModifiers == "\n" }) {
            if heldShift || key.modifierFlags.contains(.shift) || event?.modifierFlags.contains(.shift) == true { insertLiteral("\n") }
            else if markedTextRange != nil { insertLiteral("\n") }
            else { submit() }
            return
        }
        super.pressesBegan(presses, with: event)
    }
    override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        if presses.compactMap(\.key).contains(where: { $0.keyCode == .keyboardLeftShift || $0.keyCode == .keyboardRightShift }) { heldShift = false }
        super.pressesEnded(presses, with: event)
    }
    override func pressesCancelled(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        heldShift = false; super.pressesCancelled(presses, with: event)
    }
    @objc private func handleSendReturn(_ command: UIKeyCommand) {
        if markedTextRange != nil { insertLiteral("\n") } else { submit() }
    }
    @objc private func handleNewlineReturn(_ command: UIKeyCommand) { insertLiteral("\n") }
    private func insertLiteral(_ value: String) {
        insertingLiteralText = true; defer { insertingLiteralText = false }
        insertText(value)
    }
    override func insertText(_ text: String) {
        #if DEBUG
        let measuredStart = ProcessInfo.processInfo.systemUptime
        defer { NativeTypingInputMeasurements.inputTook(measuredStart) }
        #endif
        super.insertText(text)
        // UIKit command-driven insertions do not consistently deliver the delegate edit callback.
        delegate?.textViewDidChange?(self)
    }
    override func deleteBackward() {
        super.deleteBackward(); delegate?.textViewDidChange?(self)
    }
    override func paste(_ sender: Any?) {
        if let value = UIPasteboard.general.string { insertLiteral(value) } else { super.paste(sender) }
    }
    override func layoutSubviews() {
        super.layoutSubviews()
        placeholder.frame = CGRect(x: textContainerInset.left, y: textContainerInset.top,
            width: max(0, bounds.width - textContainerInset.left - textContainerInset.right), height: font?.lineHeight ?? 22)
        if let height = window?.bounds.height, height != lastWindowHeight {
            lastWindowHeight = height
            DispatchQueue.main.async { [weak self] in self?.windowHeightChanged(height) }
        }
    }
}

func nativeTextAttachmentRequired(_ value: String) -> Bool {
    if value.utf8.count > 256 * 1024 { return true }
    return value.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").components(separatedBy: "\n").count > 200
}
struct NativeGrowingReplyEditor: UIViewRepresentable {
    @Binding var text: String
    let placeholder: String
    let isFocused: Bool
    let screenHeight: CGFloat
    let chromeHeight: CGFloat
    let submitOnReturn: Bool
    let focusChanged: (Bool) -> Void
    let windowHeightChanged: (CGFloat) -> Void
    let submit: () -> Void
    var attachLargeText: ((String) -> Bool)? = nil
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> NativeReplyTextView {
        #if DEBUG
        NativeTypingInputMeasurements.start()
        #endif
        let view = NativeReplyTextView()
        view.delegate = context.coordinator; view.backgroundColor = .clear
        view.font = .preferredFont(forTextStyle: .body); view.adjustsFontForContentSizeCategory = true
        view.textColor = .label; view.tintColor = UIColor(NativeTheme.accent)
        view.textContainerInset = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
        view.textContainer.lineFragmentPadding = 0
        view.isScrollEnabled = true; view.alwaysBounceVertical = false
        view.placeholder.textColor = .placeholderText; view.placeholder.isAccessibilityElement = false
        view.addSubview(view.placeholder); view.accessibilityIdentifier = "reply-text"
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return view
    }
    func updateUIView(_ view: NativeReplyTextView, context: Context) {
        context.coordinator.parent = self
        if view.text != text { view.text = text }
        view.placeholder.text = placeholder; view.placeholder.font = view.font; view.placeholder.isHidden = !text.isEmpty
        view.accessibilityLabel = placeholder
        view.submitOnReturn = submitOnReturn
        let returnKey: UIReturnKeyType = submitOnReturn ? .send : .default
        if view.returnKeyType != returnKey { view.returnKeyType = returnKey }
        view.submit = submit; view.windowHeightChanged = windowHeightChanged
        if isFocused && !view.isFirstResponder {
            DispatchQueue.main.async { [weak view, weak coordinator = context.coordinator] in
                if coordinator?.parent.isFocused == true, view?.window != nil { view?.becomeFirstResponder() }
            }
        } else if !isFocused && view.isFirstResponder {
            // Keyboard dismissal changes SwiftUI safe areas. Do it after this layout update.
            DispatchQueue.main.async { [weak view, weak coordinator = context.coordinator] in
                if coordinator?.parent.isFocused == false, view?.isFirstResponder == true { view?.resignFirstResponder() }
            }
        }
        view.setNeedsLayout()
    }
    func sizeThatFits(_ proposal: ProposedViewSize, uiView: NativeReplyTextView, context: Context) -> CGSize? {
        #if DEBUG
        let measuredStart = ProcessInfo.processInfo.systemUptime
        defer { NativeTypingInputMeasurements.layoutTook(measuredStart) }
        #endif
        let width = max(1, proposal.width ?? 320)
        // Measure actual TextKit wrapping at the proposed width, including Dynamic Type.
        let content = uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude))
        return CGSize(width: width, height: NativeReplyEditorLayout.height(contentHeight: content.height,
            screenHeight: screenHeight, chromeHeight: chromeHeight))
    }
    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: NativeGrowingReplyEditor
        init(_ parent: NativeGrowingReplyEditor) { self.parent = parent }
        func textViewDidChange(_ view: UITextView) {
            view.invalidateIntrinsicContentSize()
            if parent.text != view.text { parent.text = view.text }
            (view as? NativeReplyTextView)?.placeholder.isHidden = !view.text.isEmpty
        }
        func textViewDidBeginEditing(_ textView: UITextView) { if !parent.isFocused { parent.focusChanged(true) } }
        func textViewDidEndEditing(_ textView: UITextView) { if parent.isFocused { parent.focusChanged(false) } }
        func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
            if textView.markedTextRange == nil, nativeTextAttachmentRequired(text), parent.attachLargeText?(text) == true {
                textView.text = (textView.text as NSString).replacingCharacters(in: range, with: "[Attached: Pasted text.txt]")
                parent.text = textView.text
                return false
            }
            if text == "\n", parent.submitOnReturn, textView.markedTextRange == nil,
               (textView as? NativeReplyTextView)?.insertingLiteralText != true {
                parent.submit(); return false
            }
            return true
        }
    }
}


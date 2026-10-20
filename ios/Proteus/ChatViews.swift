import SwiftUI
import AVFoundation
import WebKit
import PhotosUI
import UniformTypeIdentifiers
import CryptoKit
import UIKit

// A separate UIKit picker has an explicit cancel callback and can be reopened reliably
// after an iPad attachment menu. Selecting a photo still only stages an attachment.
private struct NativePhotoSelection: UIViewControllerRepresentable {
    var limit: Int
    var finished: ([PHPickerResult]) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(finished: finished) }
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var configuration = PHPickerConfiguration()
        configuration.filter = .images; configuration.selectionLimit = max(1, limit)
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ picker: PHPickerViewController, context: Context) { context.coordinator.finished = finished }
    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        var finished: ([PHPickerResult]) -> Void
        init(finished: @escaping ([PHPickerResult]) -> Void) { self.finished = finished }
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) { finished(results) }
    }
}
func selectedPhotoData(_ provider: NSItemProvider) async throws -> Data {
    guard let type = provider.registeredTypeIdentifiers.first(where: { UTType($0)?.conforms(to: .image) == true }) else { throw RemoteError(message: "The photo could not be read.") }
    return try await withCheckedThrowingContinuation { continuation in
        provider.loadDataRepresentation(forTypeIdentifier: type) { data, error in
            if let data { continuation.resume(returning: data) }
            else { continuation.resume(throwing: error ?? RemoteError(message: "The photo could not be read.")) }
        }
    }
}

// SwiftUI multiline fields ignore submitLabel on the software keyboard. Recognize
// a single inserted Return while preserving pasted multiline text and Shift+Return.
enum NativeChatTextEdit {
    static func isSingleReturn(before: String, after: String) -> Bool {
        // Avoid computing a Character collection difference on every keyboard edit.
        // A Return is one UTF-8 byte; autocorrection, deletion and pastes are not sends.
        guard after.utf8.count == before.utf8.count + 1 else { return false }
        var original = before.utf8.makeIterator(), edited = after.utf8.makeIterator()
        while let byte = edited.next() {
            let previous = original.next()
            if byte == previous { continue }
            guard byte == 10, edited.next() == previous else { return false }
            while let remaining = original.next() {
                guard edited.next() == remaining else { return false }
            }
            return edited.next() == nil
        }
        return false
    }
}

private struct ChatReturnKey: ViewModifier {
    @Binding var text: String
    let submit: () -> Void
    @State private var shiftedReturnAt = Date.distantPast
    func body(content: Content) -> some View {
        content.submitLabel(.send).onSubmit(submit)
            .onKeyPress(keys: [.return], phases: .down) { press in
                if press.modifiers.contains(.shift) {
                    shiftedReturnAt = Date(); return .ignored
                }
                submit(); return .handled
            }
            .onChange(of: text) { before, after in
                guard NativeChatTextEdit.isSingleReturn(before: before, after: after) else { return }
                if Date().timeIntervalSince(shiftedReturnAt) < 0.5 {
                    shiftedReturnAt = .distantPast; return
                }
                text = before
                submit()
            }
    }
}

enum NativeReplyEditorLayout {
    static func height(text: String, lineHeight: CGFloat, screenHeight: CGFloat, chromeHeight: CGFloat) -> CGFloat {
        let lines = text.reduce(1) { $0 + ($1.isNewline ? 1 : 0) }
        // Soft wrapping scrolls within the editor; only explicit line breaks grow it.
        return min(max(44, CGFloat(lines) * lineHeight + 16), max(0, screenHeight * 0.5 - chromeHeight))
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

private struct NativeGrowingReplyEditor: UIViewRepresentable {
    @Binding var text: String
    let placeholder: String
    let isFocused: Bool
    let screenHeight: CGFloat
    let chromeHeight: CGFloat
    let submitOnReturn: Bool
    let focusChanged: (Bool) -> Void
    let windowHeightChanged: (CGFloat) -> Void
    let submit: () -> Void
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> NativeReplyTextView {
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
        CGSize(width: proposal.width ?? 320, height: NativeReplyEditorLayout.height(text: text,
            lineHeight: uiView.font?.lineHeight ?? 22, screenHeight: screenHeight, chromeHeight: chromeHeight))
    }
    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: NativeGrowingReplyEditor
        init(_ parent: NativeGrowingReplyEditor) { self.parent = parent }
        func textViewDidChange(_ view: UITextView) {
            if parent.text != view.text { parent.text = view.text }
            (view as? NativeReplyTextView)?.placeholder.isHidden = !view.text.isEmpty
        }
        func textViewDidBeginEditing(_ textView: UITextView) { if !parent.isFocused { parent.focusChanged(true) } }
        func textViewDidEndEditing(_ textView: UITextView) { if parent.isFocused { parent.focusChanged(false) } }
        func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
            if text == "\n", parent.submitOnReturn, textView.markedTextRange == nil,
               (textView as? NativeReplyTextView)?.insertingLiteralText != true {
                parent.submit(); return false
            }
            return true
        }
    }
}

enum NativeAttachmentBudget {
    static let maxFiles = 256
    static let maxFileBytes = 8 * 1024 * 1024
    static let maxTotalBytes = 32 * 1024 * 1024
    static func rejection(existingCount: Int, existingBytes: Int, incomingBytes: Int) -> String? {
        if incomingBytes <= 0 || incomingBytes > maxFileBytes { return "Choose a file between 1 byte and 8 MB." }
        if existingCount >= maxFiles { return "This selection is full. Remove a file before adding another." }
        if existingBytes < 0 || existingBytes > maxTotalBytes - incomingBytes { return "Selected files exceed the 32 MB total. Remove a file or choose smaller files." }
        return nil
    }
}

// Only file names and types are restored. File bytes and upload authority stay in memory.
@MainActor func attachmentRecords(store: RemoteStore, draftKey: String) -> [JSON] { store.draft(draftKey).array }
@MainActor func missingAttachmentRecords(store: RemoteStore, draftKey: String, items: [NativeDraftAttachment]) -> [JSON] {
    let available = Set(items.map(\.id))
    return attachmentRecords(store: store, draftKey: draftKey).filter { !available.contains($0["id"].string) }
}
@MainActor private func appendAttachmentRecord(store: RemoteStore, draftKey: String, item: NativeDraftAttachment) {
    var records = attachmentRecords(store: store, draftKey: draftKey)
    records.append(.object(["id": .string(item.id), "name": .string(item.name), "mediaType": .string(item.mediaType)]))
    store.setDraft(draftKey, .array(records))
}
@MainActor private func removeAttachmentRecord(store: RemoteStore, draftKey: String, id: String) {
    let records = attachmentRecords(store: store, draftKey: draftKey).filter { $0["id"].string != id }
    store.setDraft(draftKey, records.isEmpty ? .null : .array(records))
}

struct ChatsView: View {
    @EnvironmentObject var store: RemoteStore
    @State private var path: [String] = []
    @State private var newChat = false
    @State private var query = ""
    var body: some View {
        NavigationStack(path: $path) {
            NativeList {
                if store.state["runs"].array.isEmpty { ContentUnavailableView("Ready for your next idea", systemImage: "bubble.left.and.bubble.right", description: Text("Start a chat using \(store.displayName)’s workspace and tools.")) }
                ForEach(store.state["runs"].array.filter { query.isEmpty || $0["title"].string.localizedCaseInsensitiveContains(query) }, id: \.self) { run in
                    NavigationLink(value: run["id"].string) { VStack(alignment: .leading, spacing: 6) { Text(run["title"].string).font(.headline); Text(statusLabel(run["status"].string)).font(.caption).foregroundStyle(run["status"].string == "awaiting_input" ? Color.orange : Color.secondary) } }.padding(.vertical, 5)
                }
                if store.state["runs"].array.count < store.state["runCount"].int { Button("Load older chats") { Task { await store.loadMoreRuns() } }.disabled(!store.connected) }
            }.background(NativeTheme.background).navigationTitle("Chats").searchable(text: $query)
                .safeAreaInset(edge: .bottom) { ConnectionStatus().accessibilityIdentifier("chat-composer-connection-status").padding().background(NativeTheme.surface) }
                .refreshable { await store.refresh() }
                .toolbar { Button("New chat", systemImage: "square.and.pencil") { newChat = true }.disabled(!store.connected).accessibilityIdentifier("new-chat") }
                .navigationDestination(for: String.self) { ChatView(id: $0) }
                .sheet(isPresented: $newChat) { NewChatView { id in newChat = false; path.append(id) } }
        }
    }
}
struct NewChatView: View {
    @EnvironmentObject var store: RemoteStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var internet = false
    var lockedWorkspaceID: String? = nil
    var lockedProjectID: String? = nil
    var onStarted: (String) -> Void
    @State private var name = ""
    @State private var prompt = ""
    @State private var provider = "copilot"
    @State private var model = ""
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @State private var workspace = ""
    @State private var project = ""
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var sending = false
    @State private var loading = true
    @State private var photoPicker = false
    @State private var filePicker = false
    @State private var previewAttachment: NativeDraftAttachment?
    @State private var confirmAttachmentStart = false
    private var attachmentScope: String { "new-chat:\(store.connection?.hostId ?? "local")" }
    private var attachments: [NativeDraftAttachment] { shared.draftAttachments[attachmentScope] ?? [] }
    private var missingAttachments: [JSON] { missingAttachmentRecords(store: store, draftKey: "new-chat-attachments", items: attachments) }
    private var attachmentMessageID: String { shared.draftMessageIDs[attachmentScope] ?? "" }
    private var attachmentDraftID: String { shared.draftSessionIDs[attachmentScope] ?? "" }
    private var supportedAttachmentTypes: [String] { internet ? Array(Set(store.state["attachmentMediaTypes"].object.values.flatMap { $0.array.map(\.string) })) : store.state["attachmentMediaTypes"][provider].array.map(\.string) }
    private var attachmentsEnabled: Bool { store.state["capabilities"].array.contains(.string("chat.attachments.v1")) && !supportedAttachmentTypes.isEmpty }
    private var hasUnsupportedAttachment: Bool { attachments.contains { !supportedAttachmentTypes.contains($0.mediaType) } }
    private var providerName: String { provider == "copilot" ? "GitHub Copilot" : provider == "codex" ? "Codex" : provider == "claude" ? "Claude" : provider }
    private func submitPrompt() {
        guard !sending, !loading, !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        if attachments.isEmpty { start() } else { confirmAttachmentStart = true }
    }
    private var promptField: some View {
        TextField("What would you like to work on?", text: $prompt, axis: .vertical)
            .lineLimit(4...10).modifier(ChatReturnKey(text: $prompt, submit: submitPrompt))
            .accessibilityIdentifier("chat-prompt")
    }
    var body: some View {
        NavigationStack {
            NativeForm {
                Section("Conversation") {
                    if !internet { TextField("Chat name (optional)", text: $name).accessibilityIdentifier("new-chat-name") }
                    promptField
                }
                Section("Run on " + store.displayName) {
                    Picker("Workspace", selection: $workspace) { ForEach(store.state["context"]["workspaces"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }.disabled(lockedWorkspaceID != nil)
                    if store.supportsProjects {
                        Picker("Project", selection: $project) { ForEach(store.projectCatalog.projects(in: workspace), id: \.self) { Text($0["name"].string).tag($0["id"].string) } }.disabled(lockedProjectID != nil).accessibilityIdentifier("new-chat-project")
                    }
                    if !internet { Picker("Provider", selection: $provider) { Text("GitHub Copilot").tag("copilot"); Text("Codex").tag("codex"); Text("Claude").tag("claude"); Text("Local rehearsal").tag("rehearsal") }.accessibilityIdentifier("chat-provider")
                    if provider != "rehearsal" {
                        ProviderModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: provider)
                    }
                }
                }
                if attachmentsEnabled || !attachments.isEmpty || !missingAttachments.isEmpty {
                    Section {
                        if attachmentsEnabled {
                            Menu {
                                Button("Paste image or file", systemImage: "doc.on.clipboard") { pasteAttachment() }
                                Button("Choose files", systemImage: "folder") { filePicker = true }
                                Button("Choose photos", systemImage: "photo") { photoPicker = false; Task { @MainActor in try? await Task.sleep(for: .milliseconds(250)); photoPicker = true } }
                            } label: { Label("Attach", systemImage: "plus").font(.subheadline) }
                                .accessibilityIdentifier("new-chat-attach")
                        }
                        if !attachments.isEmpty {
                            DisclosureGroup("Selected files") {
                                ForEach(attachments) { item in HStack { Button { previewAttachment = item } label: { Label(item.name, systemImage: item.image == nil ? "doc" : "photo") }; Spacer(); Button("Remove", systemImage: "xmark.circle") { removeAttachment(item.id) }.labelStyle(.iconOnly) } }
                            }
                        }
                        if !missingAttachments.isEmpty {
                            Text("Reattach these files before sending: " + missingAttachments.map { $0["name"].string }.joined(separator: ", ") + ". Their bytes were discarded when Proteus closed.").font(.caption).foregroundStyle(.orange)
                            Button("Remove missing files") { removeMissingAttachments() }
                        }
                        if hasUnsupportedAttachment { Text("Remove files this provider does not accept before starting.").font(.caption).foregroundStyle(.orange) }
                    }
                }
                if !internet && lockedWorkspaceID == nil { ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspaceID: workspace) }
                if internet { Section { HStack { Spacer(); ForEach(store.state["providerStatuses"].object.keys.sorted().filter { !["local-process", "rehearsal"].contains($0) }, id: \.self) { id in Button("Search with " + id.capitalized) { provider = id; if store.state["defaults"]["internetSearches"][id]["model"].string.isEmpty { store.error = "Configure Internet Search defaults in Engine Room on \(store.displayName) first." } else if attachments.isEmpty { start() } else { confirmAttachmentStart = true } }.disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sending || !store.connected) } } } }
                if let error = store.error { Section { Text(error).foregroundStyle(.orange) } }
            }.scrollDismissesKeyboard(.interactively).disabled(loading || sending).accessibilityIdentifier("new-chat-form").navigationTitle(internet ? "Internet Search" : "New chat").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { if !internet { Button { if attachments.isEmpty { start() } else { confirmAttachmentStart = true } } label: { if sending { ProgressView() } else { Image(systemName: "arrow.up").font(.system(size: 19, weight: .semibold)).frame(width: 36, height: 36).background(NativeTheme.accent).foregroundStyle(NativeTheme.background).clipShape(Circle()) } }.disabled(loading || sending || !store.connected || prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || workspace.isEmpty || (provider != "rehearsal" && model.isEmpty) || !missingAttachments.isEmpty || (!attachments.isEmpty && (!attachmentsEnabled || hasUnsupportedAttachment))).accessibilityLabel("Start chat").accessibilityIdentifier("start-chat") } }
            }.onChange(of: workspace) { _, _ in if !loading { applyWorkspaceDefaults(); project = store.projectCatalog.defaultProject(in: workspace)?["id"].string ?? "" } }.onChange(of: draftValue) { _, value in if !loading { store.setDraft("new-chat", value) } }.onChange(of: provider) { old, value in if !loading && old != value { model = ""; effort = ""; contextTier = "default"; serviceTier = "" }; if value != "rehearsal" { Task { await store.loadModels(provider: value) } } }.task { await store.refresh(); workspace = store.state["context"]["defaultWorkspaceId"].string; provider = store.state["defaults"]["provider"].string; model = store.state["defaults"]["model"].string; effort = store.state["defaults"]["reasoningEffort"].string; serviceTier = store.state["defaults"]["serviceTier"].string; contextTier = store.state["defaults"]["contextTier"].string.isEmpty ? "default" : store.state["defaults"]["contextTier"].string; applyWorkspaceDefaults(); if let saved = store.drafts["new-chat"] { restore(saved) }; if let lockedWorkspaceID { workspace = lockedWorkspaceID; selected = []; agent = ""; includeDefaults = true }; project = lockedProjectID ?? store.projectCatalog.defaultProject(in: workspace)?["id"].string ?? ""; if provider != "rehearsal" { await store.loadModels(provider: provider) }; loading = false }
            .sheet(isPresented: $photoPicker) { NativePhotoSelection(limit: NativeAttachmentBudget.maxFiles - attachments.count) { results in photoPicker = false; if !results.isEmpty { Task { await importPhotos(results) } } } }
            .fileImporter(isPresented: $filePicker, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in if case .success(let urls) = result { for url in urls { if !importFile(url) { break } } } else if case .failure(let error) = result { store.error = error.localizedDescription } }
            .sheet(item: $previewAttachment) { item in AttachmentPreview(attachment: item) { previewAttachment = nil } }
            .sheet(isPresented: $confirmAttachmentStart) { AttachmentSendReview(attachments: attachments, providerName: providerName, hostName: store.displayName) { confirmAttachmentStart = false; start() } }
        }
    }
    private func applyWorkspaceDefaults() {
        let defaults = store.state["context"]["workspaces"].array.first { $0["id"].string == workspace }?["defaults"] ?? .null
        selected = Set(defaults["selectedIds"].array.map(\.string)); agent = defaults["agentId"].string; includeDefaults = defaults["includeDefaults"] != .bool(false)
    }
    private var draftValue: JSON { .object(["name": .string(name), "prompt": .string(prompt), "provider": .string(provider), "model": .string(model), "effort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "workspace": .string(workspace), "selected": .array(selected.sorted().map(JSON.string)), "agent": .string(agent), "includeDefaults": .bool(includeDefaults)]) }
    private func restore(_ value: JSON) { name = value["name"].string; prompt = value["prompt"].string; provider = value["provider"].string; model = value["model"].string; effort = value["effort"].string; contextTier = value["contextTier"].string; serviceTier = value["serviceTier"].string; workspace = value["workspace"].string; selected = Set(value["selected"].array.map(\.string)); agent = value["agent"].string; includeDefaults = value["includeDefaults"] != .bool(false) }
    private func start() {
        if internet && store.state["defaults"]["internetSearches"][provider]["model"].string.isEmpty { store.error = "Configure Internet Search defaults for " + provider + " first."; return }
        guard missingAttachments.isEmpty else { store.error = "Remove or reattach the missing files before starting this chat."; return }
        sending = true
        Task { defer { sending = false }
            do {
                var ids = selected; if !agent.isEmpty { ids.insert(agent) }
                var values: [String: JSON] = ["name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines)), "prompt": .string(prompt), "provider": .string(provider), "model": .string(provider != "rehearsal" ? model : ""), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "workspaceId": .string(workspace), "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)]
                if internet { values = ["chatType": .string("internet"), "provider": .string(provider), "workspaceId": .string(workspace), "prompt": .string(prompt)] }
                if lockedWorkspaceID != nil { values.removeValue(forKey: "selectedIds"); values.removeValue(forKey: "agentId"); values.removeValue(forKey: "includeDefaults") }
                if store.supportsProjects && !project.isEmpty { values["projectId"] = .string(project) }
                if !attachments.isEmpty {
                    guard attachmentsEnabled else { throw RemoteError(message: "\(store.displayName) has not enabled approved attachments.") }
                    shared.draftMessageIDs[attachmentScope] = attachmentMessageID.isEmpty ? UUID().uuidString : attachmentMessageID
                    shared.draftSessionIDs[attachmentScope] = attachmentDraftID.isEmpty ? UUID().uuidString : attachmentDraftID
                    let prepared = try await prepareStartAttachments()
                    values["draftId"] = .string(attachmentDraftID); values["messageId"] = .string(attachmentMessageID)
                    values["attachments"] = .array(prepared.ids); values["consentId"] = .string(prepared.consentID); values["providerId"] = .string(provider)
                }
                let result = try await store.request("chat.start", values)
                store.setDraft("new-chat", .null); store.setDraft("new-chat-attachments", .null)
                shared.draftAttachments[attachmentScope] = []; shared.draftMessageIDs[attachmentScope] = nil; shared.draftSessionIDs[attachmentScope] = nil
                await store.refresh(); onStarted(result["runId"].string)
            } catch { store.error = error.localizedDescription }
        }
    }
    private func prepareStartAttachments() async throws -> (ids: [JSON], consentID: String) {
        var ids: [JSON] = [], claims: [JSON] = []
        for item in attachments {
            let digest = SHA256.hash(data: item.bytes).map { String(format: "%02x", $0) }.joined()
            let begun = try await store.request("chat.attachments.begin", ["draftId": .string(attachmentDraftID), "providerId": .string(provider), "messageId": .string(attachmentMessageID), "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)])
            let uploadID = begun["uploadId"].string
            guard !uploadID.isEmpty else { throw RemoteError(message: "\(store.displayName) did not create an attachment upload.") }
            let chunkSize = max(1, min(begun["chunkSize"].int, 256 * 1024))
            for (index, offset) in stride(from: 0, to: item.bytes.count, by: chunkSize).enumerated() {
                let chunk = item.bytes.subdata(in: offset..<min(offset + chunkSize, item.bytes.count))
                _ = try await store.request("chat.attachments.chunk", ["uploadId": .string(uploadID), "index": .number(Double(index)), "dataBase64": .string(chunk.base64EncodedString())])
            }
            let finished = try await store.request("chat.attachments.finish", ["uploadId": .string(uploadID)])
            guard !finished["attachmentId"].string.isEmpty else { throw RemoteError(message: "\(store.displayName) did not confirm the attachment.") }
            ids.append(finished["attachmentId"])
            claims.append(.object(["attachmentId": finished["attachmentId"], "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)]))
        }
        let consent = try await store.request("chat.attachments.authorize", ["draftId": .string(attachmentDraftID), "providerId": .string(provider), "messageId": .string(attachmentMessageID), "attachments": .array(claims)])
        guard !consent["consentId"].string.isEmpty, consent["providerId"].string == provider else { throw RemoteError(message: "\(store.displayName) did not confirm the exact attachment destination.") }
        return (ids, consent["consentId"].string)
    }
    @discardableResult private func addAttachment(_ data: Data, name: String, mediaType: String) -> Bool {
        guard !sending else { return false }
        guard supportedAttachmentTypes.contains(mediaType) else { store.error = "\(providerName) does not accept this file type through Proteus."; return false }
        if let reason = NativeAttachmentBudget.rejection(existingCount: attachments.count, existingBytes: attachments.reduce(0) { $0 + $1.bytes.count }, incomingBytes: data.count) { store.error = reason; return false }
        let item = NativeDraftAttachment(id: UUID().uuidString, name: String(name.prefix(120)), mediaType: mediaType, bytes: data)
        shared.draftAttachments[attachmentScope, default: []].append(item)
        appendAttachmentRecord(store: store, draftKey: "new-chat-attachments", item: item)
        return true
    }
    private func removeAttachment(_ id: String) {
        guard !sending else { return }
        shared.draftAttachments[attachmentScope]?.removeAll { $0.id == id }
        removeAttachmentRecord(store: store, draftKey: "new-chat-attachments", id: id)
    }
    private func removeMissingAttachments() {
        guard !sending else { return }
        let kept = Set(attachments.map(\.id))
        let records = attachmentRecords(store: store, draftKey: "new-chat-attachments").filter { kept.contains($0["id"].string) }
        store.setDraft("new-chat-attachments", records.isEmpty ? .null : .array(records))
    }
    private func importPhotos(_ items: [PHPickerResult]) async {
        for item in items {
            do {
                let data = try await selectedPhotoData(item.itemProvider)
                guard let image = UIImage(data: data), let png = image.pngData() else { throw RemoteError(message: "The photo could not be read.") }
                if !addAttachment(png, name: "Photo.png", mediaType: "image/png") { break }
            } catch { store.error = error.localizedDescription; break }
        }
    }
    @discardableResult private func importFile(_ url: URL) -> Bool {
        let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
        let types = ["png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf", "txt": "text/plain"]
        guard let mediaType = types[url.pathExtension.lowercased()] else { store.error = "This file type is not supported by \(providerName)."; return false }
        do { let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0; guard size > 0, size <= NativeAttachmentBudget.maxFileBytes else { throw RemoteError(message: "Choose a file between 1 byte and 8 MB.") }; return addAttachment(try Data(contentsOf: url), name: url.lastPathComponent, mediaType: mediaType) }
        catch { store.error = error.localizedDescription; return false }
    }
    private func pasteAttachment() {
        let files = (UIPasteboard.general.urls ?? []).filter(\.isFileURL)
        if !files.isEmpty { for url in files { if !importFile(url) { break } }; return }
        if let image = UIPasteboard.general.image, let data = image.pngData() { addAttachment(data, name: "Pasted image.png", mediaType: "image/png"); return }
        store.error = "Copy an image or a file supported by this provider, then paste it here."
    }
}
struct NativeChatRenameView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.dismiss) private var dismiss
    let run: JSON
    @State private var name = ""
    @State private var saving = false
    @State private var failure: String?
    private var trimmed: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    var body: some View {
        NavigationStack {
            NativeForm { TextField("Chat name", text: $name).textInputAutocapitalization(.sentences).accessibilityIdentifier("rename-chat-name") }
                .navigationTitle("Rename chat")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { await save() } }.disabled(trimmed.isEmpty || saving || !store.connected).accessibilityIdentifier("rename-chat-save") }
                }
        }.onAppear { name = run["title"].string }
            .alert("Could not rename chat", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) { Button("OK") { failure = nil } } message: { Text(failure ?? "") }
    }
    private func save() async {
        saving = true
        defer { saving = false }
        do {
            _ = try await store.request("chat.rename", ["id": .string(run["id"].string), "title": .string(trimmed), "expectedTitleRevision": run["titleRevision"]])
            await store.refresh()
            _ = await store.openChat(run["id"].string)
            dismiss()
        } catch { failure = error.localizedDescription }
    }
}
private struct ChatDocumentTab: Identifiable {
    let id: String
    let title: String
    let version: String
    let content: String?
    let mediaType: String
    let readAt: String
    var requestID = ""
    var assets: [JSON] = []
    var links: [JSON] = []
    var assetDataURLs: [String: String] = [:]
    var parentID: String? = nil
    var relativePath: String? = nil
}

@MainActor final class NativeReplyDraft: ObservableObject {
    @Published var text = "" {
        didSet {
            guard !restoring, !key.isEmpty else { return }
            store?.setDraft(key, text.isEmpty ? .null : .string(text), notifyObservers: false)
        }
    }
    private weak var store: RemoteStore?
    private(set) var key = ""
    private var restoring = false

    func activate(store: RemoteStore, key: String) {
        guard self.store !== store || self.key != key else { return }
        self.store = store; self.key = key
        restoring = true
        text = store.draft(key).string
        restoring = false
    }
}

// Bound initial rich rendering independently of the host's 100-event transport page.
// Byte headroom handles verbose tool output; one oversized event remains readable in full.
enum NativeHistoryWindow {
    static let pageCount = 12
    static let pageBytes = 48 * 1024
    static let olderPageCount = 24
    static let olderPageBytes = 96 * 1024
    static func start(events: [JSON], before: Int? = nil, preparingOlder: Bool = false) -> Int {
        let end = min(events.count, max(0, before ?? events.count))
        let rowBudget = preparingOlder ? olderPageCount : pageCount
        let byteBudget = preparingOlder ? olderPageBytes : pageBytes
        var start = end, bytes = 0, rows = 0, lastActivity = false
        while start > 0 && end - start < 100 {
            let event = events[start - 1]
            let activity = NativeActivity.contains(event)
            let cost = activity && lastActivity ? 0 : 1
            let size = activity ? 0 : event["text"].string.utf8.count
            if start < end && (bytes + size > byteBudget || rows + cost > rowBudget) { break }
            bytes += size; rows += cost; lastActivity = activity; start -= 1
        }
        return start
    }
    static func shouldPrefetch(offset: CGFloat, viewport: CGFloat, content: CGFloat, reading: Bool, ready: Bool) -> Bool {
        guard ready, viewport > 0, content > 0 else { return false }
        // Fill short screens automatically, but never drain history from an initial top snapshot.
        return content < viewport + 80 || reading && offset < max(480, viewport * 2.5)
    }
}

// Only this child subscribes to text edits. ChatView retains the draft reference without
// observing it, so a keystroke does not rebuild browser tabs or traverse conversation history.
private struct NativeReplyComposer<Content: View>: View {
    @ObservedObject var draft: NativeReplyDraft
    @ViewBuilder var content: () -> Content
    var body: some View { content() }
}
// Editor growth changes layout, not history. Retain the derived row list across
// geometry/focus updates; Swift's copy-on-write arrays share unchanged event storage.
@MainActor private final class NativeEventIndexCache {
    private var events: [JSON] = []
    private var start: Int? = nil
    private var indices: [Int] = []
    func values(events: [JSON], start: Int, build: () -> [Int]) -> [Int] {
        if self.start == start && self.events == events { return indices }
        self.events = events; self.start = start; indices = build(); return indices
    }
}

#if DEBUG
private enum NativeTypingDiagnostics {
    static var historyPasses = 0
    static var inspectedEvents = 0
    static var enabled: Bool { ProcessInfo.processInfo.arguments.contains("--typing-diagnostics") }
}
#endif

struct ChatView: View {
    @EnvironmentObject var store: RemoteStore
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject private var phoneChrome: NativePhoneChrome
    @Environment(\.nativePhoneAreaActive) private var phoneAreaActive
    @State private var phoneLiveOpened = false
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let id: String
    var onBack: (() -> Void)? = nil
    var workspaceBrowserScope: String? = nil
    @State private var replyDraft = NativeReplyDraft()
    private var text: String {
        get { replyDraft.text }
        nonmutating set { replyDraft.text = newValue }
    }
    private var textBinding: Binding<String> { Binding(get: { replyDraft.text }, set: { replyDraft.text = $0 }) }
    @State private var composerExpanded = false
    @State private var eventIndexCache = NativeEventIndexCache()
    @State private var oldestVisibleEvent: Int?
    @State private var conversationReady = false
    @State private var historyGestureAvailable = false
    @State private var reorderTabs = false
    @State private var composerAvailableHeight: CGFloat = 500
    @State private var composerWindowHeight = UIScreen.main.bounds.height
    @State private var composerActionsHeight: CGFloat = 44
    @State private var composerAttachmentsHeight: CGFloat = 0
    @State private var queuedEdit: JSON = .null
    @State private var showMoveWorkspace = false
    @State private var showQueuedEdit = false
    @State private var busy = false
    @State private var followLatest = true
    @State private var scrollCommand: NativeScrollCommand?
    @State private var fixtureScrollID: UUID?
    @State private var fixtureScrollStep = 0
    @State private var conversationOffset: CGFloat = 0
    @State private var conversationContentHeight: CGFloat = 0
    @State private var conversationViewportWidth: CGFloat = 0
    @State private var conversationViewportTop: CGFloat = 0
    @State private var visibleAnchor: NativeChatScrollLocation?
    @State private var restoringConversation = false
    @State private var pendingAnchorRestore: NativeChatScrollLocation?
    @State private var pendingHistoryRestore: NativeChatScrollLocation?
    @State private var historyWindowChanged = false
    @State private var pendingInitialRestore: NativeChatScrollLocation?
    @State private var restoreID: UUID?
    @State private var eventFrames: [Int: (start: Int, frame: CGRect)] = [:]
    @State private var scrollTrace: [String] = []
    @State private var userReadingGesture = false
    @State private var loadingEarlier = false
    @State private var prefetchingEarlier = false
    @State private var lastReaderInteractionAt: TimeInterval = 0
    @State private var failedHistoryPrefetch: Int?
    @State private var earlierError = false
    @State private var model = ""
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @StateObject private var pageSearch = NativePageSearch()
    @State private var composerDraftKey = ""
    @State private var selectedChild = "chat"
    @State private var childTabsClipped = false
    @State private var documents: [ChatDocumentTab] = []
    @State private var documentNotice: String?
    @State private var documentTask: Task<Void, Never>?
    @State private var photoPicker = false
    @State private var filePicker = false
    @State private var previewAttachment: NativeDraftAttachment?
    @State private var confirmAttachmentSend = false
    @State private var confirmDelete = false
    @State private var renameChildID: String?
    @State private var renameChildTitle = ""
    @State private var showRename = false
    @FocusState private var composerFocused: Bool
    @State private var nativeComposerFocused = false
    private var composerHasFocus: Bool {
        get { NativeDesignPreview.enabled ? nativeComposerFocused : composerFocused }
        nonmutating set {
            if NativeDesignPreview.enabled { nativeComposerFocused = newValue }
            else { composerFocused = newValue }
        }
    }
    #if DEBUG
    @State private var typingDiagnostics = ""
    @State private var rendererDiagnostics = 0
    #endif
    private var run: JSON { store.chats[id] ?? .null }
    private var providerName: String {
        switch run["schedule"]["provider"].string {
        case "copilot": "Copilot"
        case "codex": "Codex"
        case "claude": "Claude"
        case "rehearsal": "Local rehearsal"
        default: "Proteus"
        }
    }
    private var mcpControlsAvailable: Bool {
        let provider = run["schedule"]["provider"].string
        let advertised = store.state["mcpStatusProviders"]
        if advertised != .null { return advertised.array.contains(.string(provider)) }
        return provider == "copilot" // Older hosts exposed only Copilot MCP controls.
    }
    private var mcpLoginAvailable: Bool {
        let provider = run["schedule"]["provider"].string
        let advertised = store.state["mcpLoginProviders"]
        if advertised != .null { return advertised.array.contains(.string(provider)) }
        return provider == "copilot"
    }
    private func assistantName(_ event: JSON) -> String {
        let agent = event["agentName"].string.isEmpty ? run["agentName"].string : event["agentName"].string
        return agent.isEmpty || agent.caseInsensitiveCompare(providerName) == .orderedSame ? providerName : providerName + " · " + agent
    }
    private func routineActivity(_ event: JSON) -> Bool { NativeActivity.contains(event) }
    private var renderedEventStart: Int {
        let events = run["events"].array, start = run["eventStart"].int
        return max(start, min(oldestVisibleEvent ?? (start + NativeHistoryWindow.start(events: events)), start + events.count))
    }
    private var hasEarlierMessages: Bool { renderedEventStart > 0 }
    private var visibleEventIndices: [Int] {
        let events = run["events"].array
        let start = run["eventStart"].int
        let first = max(0, renderedEventStart - start)
        return eventIndexCache.values(events: events, start: renderedEventStart) {
        #if DEBUG
        if NativeTypingDiagnostics.enabled {
            NativeTypingDiagnostics.historyPasses += 1
            NativeTypingDiagnostics.inspectedEvents += events.count
        }
        #endif
        // Absorbed activity and empty assistant events must not create stack rows:
        // even a zero-height row adds the conversation's inter-message spacing.
        return events.indices.dropFirst(first).filter { index in
            let event = events[index]
            if routineActivity(event) { return index == first || !routineActivity(events[index - 1]) }
            return event["role"].string != "assistant" || !event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }.map { start + $0 }
        }
    }
    private func activityGroup(startingAt index: Int) -> [JSON] {
        NativeActivity.group(events: run["events"].array, startingAt: index)
    }
    private var pending: JSON { run["pending"] }
    private var desiredDraftKey: String { pending["type"].string == "question" ? "answer:" + id + ":" + pending["id"].string : "reply:" + id }
    private var nativeRun: Bool { run["schedule"]["provider"].string == "local-process" }
    private var active: Bool { ["running", "queued", "awaiting_input"].contains(run["status"].string) }
    private var chatBrowserScope: String { "chat:\(store.connection?.hostId ?? "local"):\(id)" }
    private var attachmentDraftKey: String { "reply-attachments:" + id }
    private var supportedAttachmentTypes: [String] { store.state["attachmentMediaTypes"][run["schedule"]["provider"].string].array.map(\.string) }
    private var attachmentsEnabled: Bool { store.state["capabilities"].array.contains(.string("chat.attachments.v1")) && !supportedAttachmentTypes.isEmpty }
    private var attachments: [NativeDraftAttachment] { shared.draftAttachments[chatBrowserScope] ?? [] }
    private var missingAttachments: [JSON] { missingAttachmentRecords(store: store, draftKey: attachmentDraftKey, items: attachments) }
    var body: some View {
        VStack(spacing: 0) {
            if sizeClass != .regular && (!NativePhonePreview.enabled || !phoneChrome.controlsHidden) { compactHeader }
            if NativePhonePreview.enabled {
                if !phoneChrome.controlsHidden { childTabs }
            } else if workspaceBrowserScope == nil { childTabs }
            else if !documents.isEmpty || store.state["capabilities"].array.contains(.string("browser.live.v1")) {
                HStack {
                    Spacer()
                    Menu("Chat tools") {
                        Button("Conversation", systemImage: "bubble.left.and.bubble.right") { selectedChild = "chat" }
                        if store.state["capabilities"].array.contains(.string("browser.live.v1")) { Button("Live Browser", systemImage: "rectangle.on.rectangle") { selectedChild = "live" } }
                        ForEach(documents) { document in Button(document.title, systemImage: "doc") { selectedChild = document.id } }
                    }
                }.padding(.horizontal, 12).padding(.vertical, 6)
            }
            if selectedChild == "chat" && pageSearch.visible { HStack { Spacer(minLength: 0); NativePageFindBar(search: pageSearch, loadedOnly: true) }.padding(8) }
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--history-diagnostics") {
                Text("\(renderedEventStart):\(visibleEventIndices.count)").accessibilityIdentifier("history-window")
                Button("Read renderer count") { rendererDiagnostics = NativeMarkdownDiagnostics.renderers.count }.accessibilityIdentifier("history-renderers").accessibilityValue(String(rendererDiagnostics))
            }
            if NativeTypingDiagnostics.enabled {
                Button("Read typing diagnostics") {
                    typingDiagnostics = "\(NativeTypingDiagnostics.historyPasses),\(NativeTypingDiagnostics.inspectedEvents)"
                }.accessibilityIdentifier("typing-diagnostics").accessibilityValue(typingDiagnostics)
            }
            if ProcessInfo.processInfo.arguments.contains("--synthetic-desktop-browser-tabs") {
                Button("Replay desktop tab refresh") { shared.replayDesktopBrowserFixture(scope: chatBrowserScope) }.accessibilityIdentifier("replay-desktop-tabs")
            }
            #endif
            Divider()
            if let documentNotice { HStack { ProgressView().controlSize(.small); Text(documentNotice).font(.caption); Spacer(); Button("Cancel") { documentTask?.cancel(); self.documentNotice = nil } }.padding(8).background(NativeTheme.surface) }
            if selectedChild == "chat" { conversation }
            else if selectedChild == "live" { LiveBrowserView(chatID: id).environmentObject(store) }
            else if let tab = shared.browserTabs.first(where: { $0.id == selectedChild && $0.scope == chatBrowserScope }) {
                TeamBrowserView(scope: chatBrowserScope, showTabs: false, onBackToList: returnToChats, newTabOptions: [NativeNewTabAction(title: "Live Browser", symbol: "rectangle.on.rectangle", enabled: store.state["capabilities"].array.contains(.string("browser.live.v1")), run: { phoneLiveOpened = true; selectedChild = "live"; shared.selectChatChild("live", for: chatBrowserScope) })]).environment(\.nativeTabStep, { direction in
                    let ids = ["chat"] + shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id))
                    guard let index = ids.firstIndex(of: selectedChild), ids.indices.contains(index + direction) else { return }
                    selectedChild = ids[index + direction]; shared.selectChatChild(selectedChild, for: chatBrowserScope)
                }).onAppear { shared.select(tab.id, in: chatBrowserScope) }
            } else if let document = documents.first(where: { $0.id == selectedChild }) {
                ChatDocumentReader(document: document, store: store, runID: id, requestLatest: {
                    if document.requestID.hasPrefix("preview:") {
                        Task { await shared.reloadPreview(document.id, scope: chatBrowserScope, remote: store, chatID: id) }
                    } else if let parentID = document.parentID, let relativePath = document.relativePath {
                        if let parent = documents.first(where: { $0.id == parentID }), !parent.requestID.isEmpty { requestDocument(fromRequestID: parent.requestID, relativePath: relativePath, parentID: parentID) }
                        else { store.error = "Open and approve the parent document first, then request this linked document again." }
                    } else { requestDocument(documentID: document.id) }
                }, openRelativeDocument: { source in
                    guard !document.requestID.isEmpty else { store.error = "Request this document’s current approved version before opening its links."; return }
                    requestDocument(fromRequestID: document.requestID, relativePath: source, parentID: document.id)
                }) { selectedChild = "chat"; shared.selectChatChild("chat", for: chatBrowserScope) }
            } else { conversation.onAppear { selectedChild = "chat" } }
        }.environment(\.nativeBrowserContainer, workspaceBrowserScope ?? chatBrowserScope).onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in let available = max(160, height - 88); if abs(composerAvailableHeight - available) > 1 { composerAvailableHeight = available } }.background(NativeTheme.background).navigationBarBackButtonHidden(true).toolbar(.hidden, for: .navigationBar)
        .modifier(NativePhoneBackNavigation())
        .simultaneousGesture(TapGesture(count: 2).onEnded { if NativePhonePreview.enabled && !composerHasFocus && !shared.tabs(in: chatBrowserScope).contains(where: { $0.id == selectedChild }) { phoneChrome.toggleControls() } })
        .background { if NativeDesignPreview.enabled && phoneAreaActive { NativePhoneSurface(chrome: phoneChrome) } }
        .simultaneousGesture(MagnificationGesture().onChanged { scale in
            if NativeDesignPreview.enabled, !shared.tabs(in: chatBrowserScope).contains(where: { $0.id == selectedChild }), scale < 0.98 { phoneChrome.pinch(scale) }
        }.onEnded { scale in if NativeDesignPreview.enabled, phoneChrome.overview { phoneChrome.finishPinch(committed: scale < 0.75) } }, including: NativeDesignPreview.enabled ? .all : .none)
        .onChange(of: selectedChild) { _, _ in if NativeDesignPreview.enabled { registerPhoneTab() } }
        .onChange(of: phoneAreaActive) { _, active in if NativePhonePreview.enabled && active { phoneChrome.browserOwnsBack = false; registerPhoneTab() } }
        .modifier(NativePageSwipe(enabled: !NativePhonePreview.enabled && !shared.tabs(in: chatBrowserScope).contains(where: { $0.id == selectedChild }), back: returnToChats))
        .task(id: chatBrowserScope) {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--synthetic-desktop-browser-tabs") { shared.replayDesktopBrowserFixture(scope: chatBrowserScope) }
            #endif
            while !Task.isCancelled {
                await shared.refreshContentTabs(scope: chatBrowserScope, remote: store, kind: "chat", id: id)
                await shared.refreshPreviews(scope: chatBrowserScope, remote: store, chatID: id)
                try? await Task.sleep(for: .seconds(2))
            }
        }
        .onAppear {
            if NativeDesignPreview.enabled { registerPhoneTab() }
            documents = restoredDocumentTabs()
            let saved = shared.chatSelectedChildren[chatBrowserScope] ?? shared.selected(in: chatBrowserScope) ?? "chat"
            if NativePhonePreview.enabled { phoneLiveOpened = saved == "live" }
            selectedChild = saved == "chat" || saved == "live" || shared.tabs(in: chatBrowserScope).contains(where: { $0.id == saved }) || documents.contains(where: { $0.id == saved }) ? saved : "chat"
        }
            .onDisappear { documentTask?.cancel(); documents = [] }
            .onChange(of: pageSearch.query) { _, query in if !query.isEmpty { followLatest = false; restoringConversation = false; pendingAnchorRestore = nil; pendingInitialRestore = nil } }
            .onChange(of: shared.chatSelectedChildren[chatBrowserScope]) { _, value in
                if let value, value == "chat" || value == "live" || shared.tabs(in: chatBrowserScope).contains(where: { $0.id == value }) || documents.contains(where: { $0.id == value }) { selectedChild = value }
            }
            .onChange(of: shared.documentTabs) { _, _ in
                documents = restoredDocumentTabs()
                if selectedChild != "chat" && selectedChild != "live" && !shared.tabs(in: chatBrowserScope).contains(where: { $0.id == selectedChild }) && !documents.contains(where: { $0.id == selectedChild }) { selectedChild = "chat" }
            }
            .sheet(isPresented: $photoPicker) { NativePhotoSelection(limit: NativeAttachmentBudget.maxFiles - attachments.count) { results in photoPicker = false; if !results.isEmpty { Task { await importPhotos(results) } } } }
            .fileImporter(isPresented: $filePicker, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in if case .success(let urls) = result { for url in urls { if !importFile(url) { break } } } else if case .failure(let error) = result { store.error = error.localizedDescription } }
            .sheet(item: $previewAttachment) { attachment in AttachmentPreview(attachment: attachment) { previewAttachment = nil } }
            .sheet(isPresented: $confirmAttachmentSend) { AttachmentSendReview(attachments: attachments, providerName: providerName, hostName: store.displayName) { confirmAttachmentSend = false; Task { await sendAttachments() } } }
            .alert("Rename tab", isPresented: Binding(get: { renameChildID != nil }, set: { if !$0 { renameChildID = nil } })) {
                TextField("Tab name", text: $renameChildTitle)
                Button("Save") { if let childID = renameChildID { if shared.tabs(in: chatBrowserScope).contains(where: { $0.id == childID }) { shared.renameBrowser(childID, title: renameChildTitle) } else { shared.renameDocument(childID, title: renameChildTitle, in: chatBrowserScope) } }; renameChildID = nil }
                Button("Cancel", role: .cancel) { renameChildID = nil }
            }
            .sheet(isPresented: $showRename) { NativeChatRenameView(run: run).environmentObject(store) }
            .sheet(isPresented: $showMoveWorkspace) { NativeChatWorkspaceMoveView(chatID: id).environmentObject(store) }
            .sheet(isPresented: $showQueuedEdit) { NativeQueuedEditView(runID: id, message: queuedEdit).environmentObject(store) }
            .confirmationDialog("Delete this chat?", isPresented: $confirmDelete) {
                Button("Delete chat", role: .destructive) { Task { await deleteChat() } }
                Button("Cancel", role: .cancel) {}
            } message: { Text("Only the Proteus chat record will be removed. Generated files and the provider’s original chat remain.") }
            .alert("Proteus", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }

            .onChange(of: desiredDraftKey) { _, key in composerDraftKey = key; replyDraft.activate(store: store, key: key) }
            .sheet(isPresented: $reorderTabs) { NativeTabReorderSheet(items: shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)).map { child in (id: child, title: shared.tabs(in: chatBrowserScope).first { $0.id == child }?.title ?? documents.first { $0.id == child }?.title ?? "Tab") }) { ids in shared.reorderChatChildren(ids, in: chatBrowserScope, documentIDs: documents.map(\.id)) } }
            .task(id: id) {
                composerDraftKey = desiredDraftKey; replyDraft.activate(store: store, key: composerDraftKey)
                let fetched = await store.openChat(id)
                if fetched { await Task.yield(); await store.reviewFailure(id) }
                let options = run["nextModelOptions"] == .null ? run["schedule"] : run["nextModelOptions"]
                model = options["model"].string; effort = options["reasoningEffort"].string
                contextTier = options["contextTier"].string.isEmpty ? "default" : options["contextTier"].string; serviceTier = options["serviceTier"].string
                if store.connected && !["rehearsal", "local-process"].contains(run["schedule"]["provider"].string) { await store.loadModels(provider: run["schedule"]["provider"].string) }
            }
            .onDisappear { MessageSpeech.shared.stop() }
            .onChange(of: id) { _, _ in MessageSpeech.shared.stop() }
            .onChange(of: store.chats[id]) { previous, current in if previous != nil && current == nil { dismiss() } }
            .onChange(of: store.connection?.hostId) { _, _ in MessageSpeech.shared.stop() }
            .onChange(of: scenePhase) { _, phase in if phase != .active { MessageSpeech.shared.stop() } }

    }
    private func restoredDocumentTabs() -> [ChatDocumentTab] {
        shared.documents(in: chatBrowserScope).map { descriptor in
            let existing = documents.first { $0.id == descriptor.id }
            let session = shared.documentSession(for: descriptor.id, in: chatBrowserScope)
            return ChatDocumentTab(id: descriptor.id, title: descriptor.title, version: session?.version ?? existing?.version ?? "", content: shared.content(for: descriptor.id, in: chatBrowserScope) ?? existing?.content, mediaType: descriptor.mediaType, readAt: session?.readAt ?? existing?.readAt ?? "", requestID: session?.requestID ?? existing?.requestID ?? (descriptor.previewSource == nil ? "" : "preview:" + descriptor.id), assets: session?.assets ?? existing?.assets ?? [], links: session?.links ?? existing?.links ?? [], assetDataURLs: session?.assetDataURLs ?? existing?.assetDataURLs ?? [:], parentID: descriptor.parentID, relativePath: descriptor.relativePath)
        }
    }
    private func registerPhoneTab() {
        guard NativeDesignPreview.enabled, phoneAreaActive else { return }
        let host = store.connection?.hostId ?? "", chatID = id, child = selectedChild
        if shared.tabs(in: chatBrowserScope).contains(where: { $0.id == child }) { return }
        let document = documents.first { $0.id == child }
        phoneChrome.register(NativePhoneTab(id: child == "chat" ? "chat:" + host + ":" + chatID : "document:" + host + ":" + child, title: document?.title ?? (child == "live" ? "Live Browser" : run["title"].string), symbol: child == "chat" ? "bubble.left.and.bubble.right" : child == "live" ? "rectangle.on.rectangle" : "doc.text", detail: store.displayName, preview: nil, select: {
            shared.selectChatChild(child, for: chatBrowserScope)
            phoneChrome.activateArea?("Chats")
            NotificationCenter.default.post(name: Notification.Name("ProteusPhoneSelectChat"), object: nil, userInfo: ["hostID": host, "chatID": chatID])
        }))
    }
    private func returnToChats() { if let onBack { onBack() } else { dismiss() } }
    private var compactHeader: some View {
        HStack(spacing: 4) {
            if !NativePhonePreview.enabled { Button { returnToChats() } label: { Image(systemName: "chevron.left").font(.system(size: 19, weight: .medium)).frame(width: 44, height: 44).contentShape(Rectangle()) }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Back to Chats").accessibilityIdentifier("chat-back") }
            if NativePhonePreview.enabled { Button { phoneChrome.drawer = true } label: { Image(systemName: "sidebar.left").frame(width: 44, height: 44) }.accessibilityLabel("App navigation").accessibilityIdentifier("phone-app-navigation") }
            Text(run["title"].string.isEmpty ? "Conversation" : run["title"].string).font(.subheadline.weight(.medium)).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading).accessibilityIdentifier("chat-header-title")
            Menu {
                Button("Copy chat link", systemImage: "link") { UIPasteboard.general.url = NativeChatLink.url(host: store.connection?.hostId ?? "", id: id) }
                if store.state["capabilities"].array.contains(.string("chat.rename.v1")) { Button("Rename", systemImage: "pencil") { showRename = true } }
                if lifecycleEnabled {
                    if run["chatType"].string == "internet" { Button("Promote to User Chat") { Task { do { _ = try await store.request("chat.promote", ["id": .string(id), "expectedUpdatedAt": run["updatedAt"]]); await store.openChat(id) } catch { store.error = error.localizedDescription } } } }; Button("Move", systemImage: "arrow.right.square") { showMoveWorkspace = true }; Button(run["archived"].bool ? "Unarchive chat" : "Archive chat", systemImage: "archivebox") { Task { await archiveChat() } }.disabled(chatHasPendingWork(run))
                    Button("Delete chat", systemImage: "trash", role: .destructive) { confirmDelete = true }.disabled(chatHasPendingWork(run))
                }
            } label: { Image(systemName: "ellipsis.circle").font(.system(size: 22)).frame(width: 44, height: 44).contentShape(Rectangle()) }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Chat actions").accessibilityIdentifier("chat-actions")
            if NativePhonePreview.enabled { NativeMainTabAdd() }
        }.buttonStyle(.plain).padding(.horizontal, 4).frame(height: 44).background(NativeTheme.surface)
    }
    private var childTabs: some View {
        HStack(spacing: 0) {
            Button { if NativePhonePreview.enabled { phoneChrome.captureCurrent() }; selectedChild = "chat"; shared.selectChatChild("chat", for: chatBrowserScope) } label: { Label("Chat", systemImage: "bubble.left.and.bubble.right") }.accessibilityIdentifier("chat-conversation-tab")
                .lineLimit(1).padding(.horizontal, 12).frame(minHeight: 44)
                .overlay(alignment: .bottom) { Rectangle().fill(selectedChild == "chat" ? NativeTheme.accent : .clear).frame(height: 2) }
                .contextMenu { Button("Copy chat link", systemImage: "link") { UIPasteboard.general.url = NativeChatLink.url(host: store.connection?.hostId ?? "", id: id) }; if store.state["capabilities"].array.contains(.string("chat.rename.v1")) { Button("Rename", systemImage: "pencil") { showRename = true } } }
            Divider().frame(height: 24)
NativeTabStrip(ids: shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)), selection: selectedChild) { HStack(spacing: 0) {
            if store.state["capabilities"].array.contains(.string("browser.live.v1")) && (!NativePhonePreview.enabled || phoneLiveOpened) {
                Button { selectedChild = "live"; shared.selectChatChild("live", for: chatBrowserScope) } label: { Label("Live Browser", systemImage: "rectangle.on.rectangle") }
                    .padding(12).accessibilityIdentifier("chat-live-browser")
                    .overlay(alignment: .bottom) { Rectangle().fill(selectedChild == "live" ? NativeTheme.accent : .clear).frame(height: 2) }
                Divider().frame(height: 24)
            }
            ForEach(shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)), id: \.self) { childID in
                HStack {
                    if let tab = shared.tabs(in: chatBrowserScope).first(where: { $0.id == childID }) {
                        Button { if NativePhonePreview.enabled { phoneChrome.captureCurrent() }; shared.select(tab.id, in: chatBrowserScope); selectedChild = tab.id; shared.selectChatChild(tab.id, for: chatBrowserScope) } label: { NativeContentTabLabel(title: tab.title, symbol: NativeTabSymbol.name(kind: "browser")) }.lineLimit(1).accessibilityLabel(tab.title)
                            .accessibilityIdentifier("chat-browser-tab-" + (tab.contentTabId ?? tab.id))
                            .accessibilityValue(selectedChild == tab.id ? "Active" : "Inactive")
                        Button { closeChild(tab.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + tab.title)
                    } else if let document = documents.first(where: { $0.id == childID }) {
                        Button { if NativePhonePreview.enabled { phoneChrome.captureCurrent() }; selectedChild = document.id; shared.selectChatChild(document.id, for: chatBrowserScope) } label: { NativeContentTabLabel(title: document.title, symbol: NativeTabSymbol.name(kind: "document", mediaType: document.mediaType)) }.lineLimit(1).accessibilityLabel(document.title)
                        Button { closeChild(document.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + document.title)
                    }
                }.padding(12).overlay(alignment: .bottom) { Rectangle().fill(selectedChild == childID ? NativeTheme.accent : .clear).frame(height: 2) }
                    .draggable(childID).dropDestination(for: String.self) { ids, _ in guard let source = ids.first else { return false }; shared.moveChatChild(source, before: childID, in: chatBrowserScope, documentIDs: documents.map(\.id)); return true }
                    .contextMenu {
                        Button("Rename tab", systemImage: "pencil") { renameChildID = childID; renameChildTitle = shared.tabs(in: chatBrowserScope).first(where: { $0.id == childID })?.title ?? documents.first(where: { $0.id == childID })?.title ?? "" }
                        Button("Move left", systemImage: "arrow.left") { shared.shiftChatChild(childID, by: -1, in: chatBrowserScope, documentIDs: documents.map(\.id)) }.disabled(shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)).first == childID)
                        Button("Move right", systemImage: "arrow.right") { shared.shiftChatChild(childID, by: 1, in: chatBrowserScope, documentIDs: documents.map(\.id)) }.disabled(shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)).last == childID)
                        Button("Close tab", systemImage: "xmark") { closeChild(childID) }
                        Button("Close other tabs") { for other in shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)) where other != childID { closeChild(other) } }.disabled(shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)).count < 2)
                        Button("Close tabs to the right") { let children = shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)); if let index = children.firstIndex(of: childID) { for other in children.dropFirst(index + 1) { closeChild(other) } } }.disabled(shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)).last == childID)
                    }
                .id(childID)
                Divider().frame(height: 24)
            }
        }.buttonStyle(.plain).background(NativeTabClipProbe { childTabsClipped = $0 }.frame(width: 1, height: 1).opacity(0)) }.scrollIndicators(.hidden).accessibilityIdentifier("chat-child-tab-strip")
            .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: childTabsClipped ? 0.9 : 1), .init(color: childTabsClipped ? .clear : .black, location: 1)], startPoint: .leading, endPoint: .trailing) }
            if selectedChild == "chat" { Button { pageSearch.visible.toggle() } label: { Image(systemName: "magnifyingglass") }.padding(12).accessibilityLabel("Find in chat").keyboardShortcut("f", modifiers: .command) }
            if NativePhonePreview.enabled && !shared.tabs(in: chatBrowserScope).contains(where: { $0.id == selectedChild }) {
                Button { phoneChrome.showTabs?() } label: { NativeTabOverviewIcon().frame(width: 44, height: 44) }.accessibilityLabel("Tab overview").accessibilityIdentifier("chat-tab-overview")
            }
            Button { shared.open(nil, scope: chatBrowserScope); selectedChild = shared.selected(in: chatBrowserScope) ?? "chat"; shared.selectChatChild(selectedChild, for: chatBrowserScope) } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add chat tab")
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--show-scroll-fixture-controls") {
                Text(String(Int(conversationOffset))).font(.caption2.monospacedDigit()).frame(width: 54).accessibilityIdentifier("chat-scroll-offset")
                Text(String(visibleAnchor?.anchor ?? -1) + ":" + String(Int(visibleAnchor?.inset ?? 0)))
                    .font(.caption2.monospacedDigit()).frame(width: 72).accessibilityIdentifier("chat-scroll-anchor")
                Button("Read long message") {
                    followLatest = false
                    composerHasFocus = false; composerExpanded = false
                    userReadingGesture = true
                    let commandID = UUID()
                    fixtureScrollStep = 0
                    fixtureScrollID = commandID
                    scrollCommand = NativeScrollCommand(id: commandID, y: 4800, minimumContentHeight: 9500)
                }.font(.caption2).accessibilityIdentifier("read-long-message-fixture")
                Button("Prepend fixture") { prependFixtureHistory() }.font(.caption2).accessibilityIdentifier("prepend-chat-fixture")
                Text(scrollTrace.joined(separator: " | ")).font(.caption2).lineLimit(1).frame(width: 100).accessibilityIdentifier("chat-scroll-trace")
            }
            #endif
        }.nativeTabBar()
    }
    private func closeChild(_ id: String) {
        if NativePhonePreview.enabled { phoneChrome.visited.removeAll { $0.id == "document:" + (store.connection?.hostId ?? "") + ":" + id } }
        if shared.tabs(in: chatBrowserScope).contains(where: { $0.id == id }) { shared.close(id) }
        else { documents.removeAll { $0.id == id }; shared.closeDocument(id, in: chatBrowserScope) }
        if selectedChild == id { selectedChild = "chat"; shared.selectChatChild("chat", for: chatBrowserScope) }
    }
    private func messageTurn(at index: Int) -> JSON {
        let events = run["events"].array
        let turnID = events[index]["data"]["turnId"].string
        guard !turnID.isEmpty, !events.prefix(index).contains(where: { $0["role"].string == "assistant" && $0["data"]["turnId"].string == turnID && !$0["text"].string.isEmpty }) else { return .null }
        return run["turns"].array.first { $0["id"].string == turnID } ?? .null
    }
    private func streamingTurn(for key: String) -> JSON {
        guard key == run["liveMessages"].object.keys.sorted().first, let turn = run["turns"].array.last else { return .null }
        return run["events"].array.contains { $0["role"].string == "assistant" && $0["data"]["turnId"].string == turn["id"].string && !$0["text"].string.isEmpty } ? .null : turn
    }
    private var conversation: some View {
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if run["status"].string == "queued" { Text(run["queueReason"].string.isEmpty ? "Preparing this chat…" : run["queueReason"].string).font(.caption).foregroundStyle(.secondary) }
                if !store.connected { Label("Offline · cached history", systemImage: "icloud.slash").font(.caption).foregroundStyle(.secondary) }
                if hasEarlierMessages {
                    HStack { if loadingEarlier { ProgressView().controlSize(.small) }; if earlierError { Button("Retry earlier messages") { loadEarlier() }.disabled(loadingEarlier || !store.connected).accessibilityIdentifier("load-earlier-messages") } }.font(.subheadline)
                }
                ForEach(visibleEventIndices, id: \.self) { absoluteIndex in
                    let index = absoluteIndex - run["eventStart"].int
                    let event = run["events"].array[index]
                    VStack(alignment: .leading, spacing: 0) {
                        if routineActivity(event) {
                            ChatActivityGroupView(events: activityGroup(startingAt: index), hostName: store.state["hostName"].string, runID: id, search: pageSearch, eventStart: absoluteIndex)
                        } else if event["role"].string != "assistant" || !event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            if !event["data"]["delivery"]["state"].string.isEmpty { Text(event["data"]["delivery"]["state"].string.capitalized).font(.caption2).foregroundStyle(.teal) }
                            MessageView(role: event["role"].string == "assistant" ? assistantName(event) : event["role"].string, text: event["text"].string, runID: id, timestamp: event["timestamp"].string.isEmpty ? event["at"].string : event["timestamp"].string, turn: event["role"].string == "assistant" ? messageTurn(at: index) : .null, actionID: MessageActions.eligible(event) ? "\(store.connection?.hostId ?? "local"):\(id):\(absoluteIndex):\(event["at"].string)" : nil, sentAttachments: event["data"]["attachments"].array, onDocumentLink: event["role"].string == "assistant" ? { source in openDocument(source) } : nil, onResize: { Task { @MainActor in await Task.yield(); if followLatest && !userReadingGesture && !restoringConversation && pageSearch.query.isEmpty { proxy.scrollTo("chat-end", anchor: .bottom) } } }, search: pageSearch, searchKey: absoluteIndex, viewport: CGRect(x: 0, y: conversationViewportTop, width: conversationViewportWidth, height: max(1, composerAvailableHeight)))
                        }
                    }.id(absoluteIndex)
                        .accessibilityElement(children: .contain)
                        .accessibilityIdentifier("chat-event-\(absoluteIndex)")
                        .onGeometryChange(for: CGRect.self) { geometry in geometry.frame(in: .global) } action: { frame in
                            if let prior = eventFrames[absoluteIndex], prior.start == renderedEventStart,
                               abs(prior.frame.minY - frame.minY) < 1,
                               abs(prior.frame.height - frame.height) < 1 { return }
                            eventFrames[absoluteIndex] = (renderedEventStart, frame)
                            if absoluteIndex == 0 { traceScroll("frame y\(Int(frame.minY)) h\(Int(frame.height)) f\(followLatest ? 1 : 0) r\(restoringConversation ? 1 : 0)") }
                            if let reading = pendingAnchorRestore, reading.anchor == absoluteIndex,
                               frame.height >= max(1, (reading.eventRevision == run["updatedAt"].string && abs(reading.viewportWidth - conversationViewportWidth) < 2) ? reading.anchorHeight - 2 : 1),
                               let transaction = restoreID {
                                scrollCommand = NativeScrollCommand(id: transaction, y: frame.minY - conversationViewportTop + reading.inset,
                                    relativeToCurrent: true,
                                    minimumContentHeight: reading.eventRevision == run["updatedAt"].string && abs(reading.viewportWidth - conversationViewportWidth) < 2 ? reading.contentHeight : 0)
                                traceScroll("anchor \(absoluteIndex) y\(Int(frame.minY)) inset\(Int(reading.inset)) cmd\(transaction.uuidString.prefix(4))")
                                pendingAnchorRestore = nil
                                return
                            }
                            guard !followLatest, !restoringConversation, frame.minY <= conversationViewportTop,
                                  frame.maxY > conversationViewportTop else { return }
                            let location = NativeChatScrollLocation(anchor: absoluteIndex, inset: conversationViewportTop - frame.minY, offset: conversationOffset,
                                eventStart: run["eventStart"].int, contentHeight: conversationContentHeight, anchorHeight: frame.height,
                                viewportWidth: conversationViewportWidth, eventRevision: run["updatedAt"].string)
                            if let previous = shared.chatScrollLocations[chatBrowserScope],
                               previous.anchor == absoluteIndex, previous.eventStart == location.eventStart,
                               abs(previous.inset - location.inset) > 100 {
                                // Lazy content can report an old frame after UIKit has moved the viewport.
                                // Native offset deltas remain the source of truth until geometry catches up.
                                return
                            }
                            if let previous = shared.chatScrollLocations[chatBrowserScope], previous.anchor == location.anchor,
                               abs(previous.inset - location.inset) < 1,
                               abs(previous.offset - location.offset) < 1 { return }
                            shared.chatScrollLocations[chatBrowserScope] = location
                            visibleAnchor = location
                        }
                }
                ForEach(run["liveMessages"].object.keys.sorted(), id: \.self) { key in MessageView(role: "\(assistantName(.null)) · streaming", text: run["liveMessages"][key].string, runID: id, turn: streamingTurn(for: key), onResize: { Task { @MainActor in await Task.yield(); if followLatest && !userReadingGesture && !restoringConversation { proxy.scrollTo("chat-end", anchor: .bottom) } } }) }
                if pending != .null {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Your input is needed", systemImage: "person.crop.circle.badge.questionmark").font(.headline)
                        Text(pending["question"].string)
                        if pending["details"] != .null { PermissionRequestSummary(request: pending["details"]); DisclosureGroup("Request details") { Text(pending["details"].pretty).font(.caption.monospaced()).textSelection(.enabled) } }
                        if pending["type"].string == "permission" {
                            Text("Approve once applies only to this request on \(store.displayName). Saved workspace choices survive restart and affect matching chats and schedules until revoked.").font(.caption).foregroundStyle(.secondary)
                            HStack { Button("Deny", role: .destructive) { answer("deny") }; Button("Approve once") { answer("approve") }.buttonStyle(.borderedProminent) }
                            PendingChatApprovalView(run: run)
                            if !pending["permissionReason"].string.isEmpty { Text(pending["permissionReason"].string).font(.caption).foregroundStyle(.secondary) }
                            ForEach(pending["permissionChoices"].array, id: \.self) { choice in Button(choice["label"].string) { answer(choice["value"].string) } }
                        }
                    }.padding().background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 16)).disabled(busy || !store.connected)
                }
                HStack { if run["status"].string == "running" { ProgressView().controlSize(.small) }; Text(statusLabel(run["status"].string)).font(.subheadline).foregroundStyle(.secondary); Spacer() }.accessibilityIdentifier("chat-bottom-status")
                DisclosureGroup("Chat details & loaded context") {
                    VStack(alignment: .leading, spacing: 8) {
                        NativeChatUsageView(run: run)
                        DisclosureGroup("Proteus core guidance · Required") { Text(run["appCapabilities"]["core"]["text"].string.isEmpty ? "Core guidance is loaded on the next model turn independently of workspace source selections." : run["appCapabilities"]["core"]["text"].string).font(.caption).textSelection(.enabled) }
                        if !run["appCapabilities"]["tools"].array.isEmpty { DisclosureGroup("App tools · registered and on demand") { ForEach(run["appCapabilities"]["tools"].array, id: \.self) { tool in Text(tool["name"].string + " · " + (tool["enabledBySelection"].bool ? tool["loading"].string : "Excluded by selected agent scope")).font(.caption) }; Text(run["appCapabilities"]["permissionNote"].string).font(.caption).foregroundStyle(.secondary) } }
                        if lifecycleEnabled {
                            HStack {
                                if run["chatType"].string == "internet" { Button("Promote to User Chat") { Task { do { _ = try await store.request("chat.promote", ["id": .string(id), "expectedUpdatedAt": run["updatedAt"]]); await store.openChat(id) } catch { store.error = error.localizedDescription } } } }; Button("Move", systemImage: "arrow.right.square") { showMoveWorkspace = true }; Button(run["archived"].bool ? "Unarchive chat" : "Archive chat") { Task { await archiveChat() } }.disabled(chatHasPendingWork(run))
                                Button("Delete chat", role: .destructive) { confirmDelete = true }.disabled(chatHasPendingWork(run))
                            }
                        }

                        Text("Model: \(run["schedule"]["model"].string)").font(.caption)
                        Text("Thinking effort: \(run["schedule"]["reasoningEffort"].string.isEmpty ? "Provider default" : run["schedule"]["reasoningEffort"].string) · Context: \(run["schedule"]["contextTier"].string.isEmpty ? "default" : run["schedule"]["contextTier"].string)").font(.caption)
                        Text("Speed: \(run["schedule"]["serviceTier"].string.isEmpty ? "Provider default" : run["schedule"]["serviceTier"].string)").font(.caption)
                        if !run["providerSessionId"].string.isEmpty { Text("Provider session: \(run["providerSessionId"].string)").font(.caption.monospaced()).textSelection(.enabled) }
                        if run["usage"] != .null { DisclosureGroup("Usage reported by provider") { Text(run["usage"].pretty).font(.caption.monospaced()).textSelection(.enabled) } }
                        if !run["modelHistory"].array.isEmpty { DisclosureGroup("Model history") { ForEach(run["modelHistory"].array, id: \.self) { change in Text(change["model"].string + (change["at"].string.isEmpty ? "" : " · " + change["at"].string)).font(.caption) } } }
                        if run["contextUsage"]["modelContextWindow"].int > 0 { Text("Runtime context window: \(modelTokenSize(run["contextUsage"]["modelContextWindow"])) tokens").font(.caption) }
                        ChatPermissionsView(run: run)
                        NativeRunFilesView(run: run, hostName: store.displayName)
                        if mcpControlsAvailable { DisclosureGroup("MCP connections") { MCPConnectionsView(runID: id, loginAvailable: mcpLoginAvailable) } }

                        ForEach(run["context"]["entries"].array, id: \.self) { entry in Text("\(entry["kind"].string): \(entry["name"].string)").font(.caption) }
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                Color.clear.frame(height: 1).id("chat-end")
            }.padding().background(NativeScrollProbe(command: scrollCommand, followBottom: followLatest && !userReadingGesture && !restoringConversation && pageSearch.query.isEmpty, onSnapshot: { snapshot in
                guard snapshot.offset.isFinite else { return }
                let previousOffset = conversationOffset
                let previousHeight = conversationContentHeight
                if abs(conversationOffset - snapshot.offset) > 0.5 { conversationOffset = max(0, snapshot.offset) }
                if abs(conversationContentHeight - snapshot.contentHeight) > 0.5 { conversationContentHeight = snapshot.contentHeight }
                if abs(conversationViewportWidth - snapshot.viewportWidth) > 0.5 { conversationViewportWidth = snapshot.viewportWidth }
                if abs(conversationViewportTop - snapshot.viewportTop) > 0.5 { conversationViewportTop = snapshot.viewportTop }
                if let initial = pendingInitialRestore, snapshot.viewportWidth > 0 {
                    pendingInitialRestore = nil
                    restoreConversation(initial, with: proxy)
                }
                if Int(previousOffset / 100) != Int(snapshot.offset / 100) ||
                   Int(previousHeight / 1000) != Int(snapshot.contentHeight / 1000) {
                    traceScroll("snap \(Int(snapshot.offset))/\(Int(snapshot.maxOffset)) h\(Int(snapshot.contentHeight)) v\(Int(snapshot.viewportHeight)) r\(restoringConversation ? 1 : 0) f\(followLatest ? 1 : 0)")
                }
                if snapshot.atEnd || !snapshot.canScroll { conversationReady = true }
                // A growing Markdown layout is not a reading gesture. Keep following
                // until the native scroll view reports an actual pan.
                if !followLatest && conversationReady && !restoringConversation && !userReadingGesture && snapshot.atEnd && snapshot.offset > previousOffset + 0.5 { followLatest = true }
                if !followLatest && !userReadingGesture && !restoringConversation && snapshot.canScroll && conversationOffset > 30 {
                    var location = shared.chatScrollLocations[chatBrowserScope] ?? NativeChatScrollLocation(anchor: nil, inset: 0, offset: conversationOffset)
                    if location.anchor != nil { location.inset += conversationOffset - location.offset }
                    location.offset = conversationOffset
                    location.eventStart = run["eventStart"].int
                    location.contentHeight = snapshot.contentHeight
                    location.viewportWidth = snapshot.viewportWidth
                    location.eventRevision = run["updatedAt"].string
                    shared.chatScrollLocations[chatBrowserScope] = location
                    visibleAnchor = location
                }
                // Keep preparing during the same upward pan and its momentum, rather
                // than requiring another gesture after each revealed batch.
                if !followLatest && !restoringConversation && abs(previousHeight - snapshot.contentHeight) < 1,
                   snapshot.offset < previousOffset - 1,
                   userReadingGesture || Date().timeIntervalSince1970 - lastReaderInteractionAt < 2 {
                    historyGestureAvailable = true
                }
                if conversationReady && !followLatest && snapshot.offset < snapshot.viewportHeight * 6 { prefetchEarlier() }
                if !restoringConversation && !earlierError && hasEarlierMessages,
                   NativeHistoryWindow.shouldPrefetch(offset: snapshot.offset, viewport: snapshot.viewportHeight, content: snapshot.contentHeight, reading: historyGestureAvailable && !followLatest, ready: conversationReady) { loadEarlier() }
            }, onInteraction: { reading in
                userReadingGesture = reading
                lastReaderInteractionAt = Date().timeIntervalSince1970
                if reading {
                    composerHasFocus = false; composerExpanded = false
                    followLatest = false; historyGestureAvailable = true; conversationReady = true
                    restoreID = nil; pendingAnchorRestore = nil; pendingInitialRestore = nil
                    scrollCommand = nil; restoringConversation = false
                    if !loadingEarlier { pendingHistoryRestore = nil; historyWindowChanged = false }
                    if !earlierError && hasEarlierMessages && conversationOffset < max(480, composerAvailableHeight * 2.5) { loadEarlier() }
                }
            }, onApplied: { commandID, snapshot in
                if fixtureScrollID == commandID {
                    if fixtureScrollStep == 0 {
                        fixtureScrollStep = 1
                        let nextID = UUID()
                        fixtureScrollID = nextID
                        scrollCommand = NativeScrollCommand(id: nextID, y: 3000,
                            relativeToCurrent: true, minimumContentHeight: 9500)
                        return
                    }
                    fixtureScrollID = nil; userReadingGesture = false; followLatest = false; scrollCommand = nil
                    shared.chatScrollLocations.removeValue(forKey: chatBrowserScope)
                    visibleAnchor = nil
                    if let measured = eventFrames[0], measured.frame.minY <= snapshot.viewportTop,
                       measured.frame.maxY > snapshot.viewportTop {
                        let location = NativeChatScrollLocation(anchor: 0, inset: snapshot.viewportTop - measured.frame.minY,
                            offset: snapshot.offset, eventStart: run["eventStart"].int,
                            contentHeight: snapshot.contentHeight, anchorHeight: measured.frame.height,
                            viewportWidth: snapshot.viewportWidth, eventRevision: run["updatedAt"].string)
                        shared.chatScrollLocations[chatBrowserScope] = location; visibleAnchor = location
                    }
                    return
                }
                guard restoreID == commandID else { return }
                traceScroll("applied \(commandID.uuidString.prefix(4)) at\(Int(snapshot.offset))/\(Int(snapshot.maxOffset))")
                conversationOffset = max(0, snapshot.offset)
                restoreID = nil
                historyWindowChanged = false
                restoringConversation = false
                followLatest = snapshot.atEnd
            }).frame(width: 1, height: 1).opacity(0))
        }.coordinateSpace(name: "conversation-scroll").scrollDismissesKeyboard(.interactively).accessibilityIdentifier("chat-conversation-scroll")
            .simultaneousGesture(TapGesture().onEnded { composerHasFocus = false; composerExpanded = false })
            .simultaneousGesture(DragGesture(minimumDistance: 4).onChanged { _ in
                composerHasFocus = false; composerExpanded = false
                if !userReadingGesture {
                    composerHasFocus = false; composerExpanded = false
                    composerHasFocus = false; composerExpanded = false; userReadingGesture = true; followLatest = false
                    historyGestureAvailable = true
                    restoreID = nil; pendingAnchorRestore = nil; pendingInitialRestore = nil; scrollCommand = nil; restoringConversation = false
                    if !loadingEarlier { pendingHistoryRestore = nil; historyWindowChanged = false }
                }
            }.onEnded { _ in userReadingGesture = false }, including: NativePhonePreview.enabled ? .none : .all)
            .onAppear {
                if let location = shared.chatScrollLocations[chatBrowserScope] {
                    followLatest = false
                    conversationReady = true
                    if let anchor = location.anchor { oldestVisibleEvent = max(run["eventStart"].int, anchor - NativeHistoryWindow.pageCount) }
                    pendingInitialRestore = location
                }
            }
            .onChange(of: run["events"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
            .onChange(of: renderedEventStart) { _, _ in
                if let reading = pendingHistoryRestore { pendingHistoryRestore = nil; restoreConversation(reading, with: proxy) }
                else if !followLatest, let reading = shared.chatScrollLocations[chatBrowserScope] { restoreConversation(reading, with: proxy) }
            }
            .onChange(of: run["liveMessages"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
        }
            .safeAreaInset(edge: .bottom) { if nativeRun { VStack { Text("Native Omi processing · outcomes are recorded by the worker.").font(.caption); if active { Button("Stop process", role: .destructive) { act("chat.cancel", [:]) } } }.padding().background(NativeTheme.surface) } else { composer } }
    }
    private func restoreConversation(_ location: NativeChatScrollLocation, with proxy: ScrollViewProxy) {
        let transaction = UUID()
        restoreID = transaction
        restoringConversation = true
        pendingAnchorRestore = nil
        followLatest = false
        traceScroll("start \(transaction.uuidString.prefix(4)) anchor\(location.anchor ?? -1) inset\(Int(location.inset)) raw\(Int(location.offset)) from\(location.eventStart ?? -999) to\(run["eventStart"].int) minH\(Int(location.contentHeight))")
        let sameLayout = location.eventRevision == run["updatedAt"].string &&
            location.viewportWidth > 0 && abs(location.viewportWidth - conversationViewportWidth) < 2
        if location.eventStart == run["eventStart"].int && pendingAnchorRestore == nil && location.anchor.map({ $0 >= renderedEventStart }) == true && sameLayout && !historyWindowChanged {
            scrollCommand = NativeScrollCommand(id: transaction, y: location.offset, minimumContentHeight: location.contentHeight)
            traceScroll("raw restore \(Int(location.offset)) minH\(Int(location.contentHeight))")
        } else if let anchor = location.anchor, anchor >= run["eventStart"].int, anchor < run["eventStart"].int + run["events"].array.count {
            if let measured = eventFrames[anchor], measured.start == renderedEventStart, measured.frame.height > 0 {
                scrollCommand = NativeScrollCommand(id: transaction, y: measured.frame.minY - conversationViewportTop + location.inset,
                    relativeToCurrent: true, minimumContentHeight: sameLayout ? location.contentHeight : 0)
                traceScroll("known frame y\(Int(measured.frame.minY))")
            } else {
                pendingAnchorRestore = location
                proxy.scrollTo(anchor, anchor: .top)
            }
        } else {
            pendingAnchorRestore = nil
            scrollCommand = NativeScrollCommand(id: transaction, y: location.offset, minimumContentHeight: location.contentHeight)
        }
    }
    private func traceScroll(_ value: String) {
        #if DEBUG
        guard ProcessInfo.processInfo.arguments.contains("--show-scroll-fixture-controls") else { return }
        guard scrollTrace.last != value else { return }
        scrollTrace.append(value)
        if scrollTrace.count > 12 { scrollTrace.removeFirst(scrollTrace.count - 12) }
        #endif
    }
    private func prependFixtureHistory() {
        #if DEBUG
        guard ProcessInfo.processInfo.arguments.contains("--synthetic-long-chat"), var existing = store.chats[id]?.object else { return }
        let before = existing["eventStart"]?.int ?? 0
        pendingHistoryRestore = shared.chatScrollLocations[chatBrowserScope]
        let paragraph = (0..<12).map { "Earlier fixture line \($0)." }.joined(separator: "\n")
        existing["eventStart"] = .number(Double(before - 1))
        existing["events"] = .array([.object(["role": .string("assistant"), "text": .string(paragraph), "at": .string("2026-10-05T19:00:00Z")])] + (existing["events"]?.array ?? []))
        store.chats[id] = .object(existing)
        #endif
    }
    private var lifecycleEnabled: Bool {
        store.connected && store.state["capabilities"].array.contains(.string("chat.lifecycle.v1")) && run != .null
    }
    private func archiveChat() async {
        do { try await store.archiveChat(id, archived: !run["archived"].bool) }
        catch { store.error = error.localizedDescription }
    }
    private func deleteChat() async {
        do { try await store.deleteChat(id); dismiss() }
        catch { store.error = error.localizedDescription }
    }
    private func submitReply() {
        guard !cannotSend else { return }
        if pending["type"].string == "question" { answer(text) } else { send("queue") }
    }
    private var replyPlaceholder: String {
        pending["type"].string == "question" ? "Add your feedback…" : active ? "Add an update while this runs…" : "Continue this conversation…"
    }
    private var replyField: some View {
        Group {
        if NativeDesignPreview.enabled {
            NativeGrowingReplyEditor(text: textBinding, placeholder: replyPlaceholder, isFocused: composerHasFocus,
                screenHeight: composerCardHeightLimit * 2, chromeHeight: composerEditorChromeHeight, submitOnReturn: NativePadPreview.enabled,
                focusChanged: { composerHasFocus = $0 }, windowHeightChanged: { composerWindowHeight = $0 }, submit: submitReply)
        } else {
        TextField(replyPlaceholder, text: textBinding, axis: .vertical)
            .modifier(ChatReturnKey(text: textBinding, submit: submitReply)).lineLimit(3...max(3, Int((composerAvailableHeight * 0.6 - 100) / 22))).padding(.horizontal, 10).padding(.vertical, 12)
            .frame(minHeight: 88, alignment: .topLeading)
            .contentShape(Rectangle()).onTapGesture { composerHasFocus = true }
            .accessibilityIdentifier("reply-text").focused($composerFocused)
        }
        }
    }
    private var hasDraftAttachments: Bool { !attachments.isEmpty || !missingAttachments.isEmpty }
    private var composerCardHeightLimit: CGFloat { min(composerWindowHeight * 0.5, max(120, composerAvailableHeight * 0.5)) }
    private var composerAttachmentBudget: CGFloat { max(0, composerCardHeightLimit - composerActionsHeight - 84) }
    private var composerEditorChromeHeight: CGFloat {
        24 + composerActionsHeight + 8 + (hasDraftAttachments ? min(composerAttachmentsHeight, composerAttachmentBudget) + 8 : 0)
    }
    private var composer: some View {
        NativeReplyComposer(draft: replyDraft) { composerContent }
            .animation(NativePhonePreview.enabled && !reduceMotion ? .easeInOut(duration: 0.24) : nil, value: composerExpanded)
    }
    private var showsComposerActions: Bool { !NativePhonePreview.enabled || composerExpanded }
    @ViewBuilder private var composerAttachmentSection: some View {
        if NativeDesignPreview.enabled {
            ScrollView {
                composerAttachmentContent.fixedSize(horizontal: false, vertical: true)
                    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { composerAttachmentsHeight = $0 }
            }.frame(height: min(composerAttachmentsHeight, composerAttachmentBudget))
        } else { composerAttachmentContent }
    }
    private var composerAttachmentContent: some View {
        VStack(alignment: .leading, spacing: 8) {
                    ScrollView(.horizontal) { HStack(spacing: 8) { ForEach(attachments) { item in
                        HStack(spacing: 5) {
                            Button { previewAttachment = item } label: { if let image = item.image { Image(uiImage: image).resizable().scaledToFill().frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 6)) } else { Label(item.name, systemImage: "doc").lineLimit(1) } }.accessibilityLabel("Preview " + item.name)
                            Button { removeAttachment(item.id) } label: { Image(systemName: "xmark.circle.fill") }.accessibilityLabel("Remove " + item.name).disabled(busy)
                        }.padding(5).background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                    } } }.scrollIndicators(.hidden).frame(height: NativeDesignPreview.enabled ? 64 : nil)
                    Text("Attachments are kept on this device until sent. Closing the app discards unsent selections.").font(.caption2).foregroundStyle(.secondary)
                    if !missingAttachments.isEmpty {
                        Text("Reattach before sending: " + missingAttachments.map { $0["name"].string }.joined(separator: ", ") + ". The selected file bytes were discarded when Proteus closed.").font(.caption).foregroundStyle(.orange)
                        Button("Remove missing files") { removeMissingAttachments() }.font(.caption).disabled(busy)
                    }
        }
    }
    private var composerContent: some View {
        VStack(spacing: 8) {
            ConnectionStatus().accessibilityIdentifier("chat-composer-connection-status")
            ForEach(run["queuedMessages"].array, id: \.self) { message in
                HStack { Text(message["prompt"].string).lineLimit(1).font(.caption); Spacer(); if run["status"].string == "running" && !message["hasAttachments"].bool { Button("Steer now") { act("chat.steer-queued", ["messageId":message["id"]]) }.font(.caption) }; if store.state["capabilities"].array.contains(.string("chat.queue-edit.v1")) { Button("Edit") { queuedEdit = message; showQueuedEdit = true }.font(.caption) }; Button("Remove") { act("chat.remove-queued", ["messageId":message["id"]]) }.font(.caption) }
            }
            VStack(alignment: .leading, spacing: 8) {
                if showsComposerActions && hasDraftAttachments { composerAttachmentSection }
                if composerExpanded || NativePadPreview.enabled { replyField } else {
                    HStack(spacing: 0) {
                        Button { composerExpanded = true; composerHasFocus = true } label: {
                            Text(text.isEmpty ? replyPlaceholder : text.replacingOccurrences(of: "\n", with: " ")).lineLimit(1).truncationMode(.tail).font(.subheadline).foregroundStyle(text.isEmpty ? .secondary : .primary).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).padding(.horizontal, 10)
                        }.buttonStyle(.plain).accessibilityLabel("Expand message composer").accessibilityValue(text).accessibilityHint(attachments.isEmpty && missingAttachments.isEmpty ? "" : "Includes attachments. Expand to review them.").accessibilityIdentifier("composer-preview")
                        if NativePhonePreview.enabled && ["running", "awaiting_input"].contains(run["status"].string) { stopButton }
                    }
                }
                if showsComposerActions {
                HStack(spacing: 8) {
                    if attachmentsEnabled || NativeDesignPreview.enabled {
                        Menu {
                            if !attachmentsEnabled { Text(NativeDesignPreview.isolated ? "Attachments are unavailable in this rehearsal." : "Attachments are unavailable for this provider.") }
                            Group {
                            Button("Paste image or file", systemImage: "doc.on.clipboard") { pasteAttachment() }
                            Button("Choose files", systemImage: "folder") { filePicker = true }
                            Button("Choose photos", systemImage: "photo") { photoPicker = false; Task { @MainActor in try? await Task.sleep(for: .milliseconds(250)); photoPicker = true } }
                            }.disabled(!attachmentsEnabled)
                        } label: { Image(systemName: "plus").frame(width: 44, height: 44) }
                            .accessibilityLabel("Attach files")
                            .accessibilityIdentifier("chat-attach")
                            .disabled(busy)
                    }
                    if run["schedule"]["provider"].string != "rehearsal" { ComposerModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: run["schedule"]["provider"].string).frame(maxWidth: .infinity, alignment: .leading) } else { Spacer(minLength: 0) }
                    if active {
                        Button { send("steer") } label: { Image(systemName: "arrow.triangle.branch").frame(width: 44, height: 44).background(NativeTheme.accent.opacity(0.1), in: Circle()) }.buttonStyle(.plain).accessibilityLabel("Steer current turn").disabled(cannotSend || run["status"].string != "running" || !attachments.isEmpty).accessibilityIdentifier("steer-message")
                    }
                    Button { submitReply() } label: {
                        Image(systemName: "arrow.up").font(.system(size: 23, weight: .semibold)).frame(width: 44, height: 44)
                            .background(cannotSend ? Color(white: 0.25) : NativeTheme.accent, in: Circle())
                            .overlay(alignment: .bottomTrailing) { if active && pending["type"].string != "question" { Image(systemName: "clock").font(.system(size: 12)).background(NativeTheme.accent, in: Circle()) } }
                    }.buttonStyle(.plain).foregroundStyle(cannotSend ? Color(white: 0.82) : Color(red: 0.08, green: 0.16, blue: 0.07))
                        .disabled(cannotSend || (!attachments.isEmpty && !attachmentsEnabled)).accessibilityLabel(pending["type"].string == "question" ? "Send feedback" : active ? "Queue message" : "Send message").accessibilityIdentifier("send-message")
                    if ["running", "awaiting_input"].contains(run["status"].string) {
                        stopButton
                    }
                }.font(.subheadline)
                    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { composerActionsHeight = $0 }
                }
            }.padding(NativePhonePreview.enabled && !composerExpanded ? 4 : 12).background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
                .accessibilityElement(children: .contain).accessibilityIdentifier("reply-composer-card")

        }.padding(.horizontal).padding(.vertical, 8).background(NativeTheme.surface)
    }
    private var stopButton: some View {
        Button(role: .destructive) { act("chat.cancel", [:]) } label: {
            Image(systemName: "stop.fill").font(.system(size: 14)).frame(width: 44, height: 44).contentShape(Circle()).background(Color.red.opacity(0.12), in: Circle()).overlay(Circle().stroke(Color.red.opacity(0.4), lineWidth: 1))
        }.buttonStyle(.plain).disabled(busy || !store.connected).accessibilityLabel("Stop current turn").accessibilityIdentifier("stop-turn")
    }
    private var cannotSend: Bool { busy || !store.connected || !missingAttachments.isEmpty || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    private func send(_ mode: String) {
        guard missingAttachments.isEmpty else { store.error = "Remove or reattach the missing files before sending."; return }
        if mode == "queue" && !attachments.isEmpty { confirmAttachmentSend = true; return }
        var values: [String: JSON] = ["prompt": .string(text), "mode": .string(mode), "messageId": .string(UUID().uuidString)]
        if mode == "queue" && run["schedule"]["provider"].string != "rehearsal" {
            values["modelOptions"] = .object(["model": .string(model), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier)])
        }
        act("chat.send", values)
    }
    private func sendAttachments() async {
        guard attachmentsEnabled, !busy, store.connected, missingAttachments.isEmpty else { return }
        busy = true
        defer { busy = false }
        let key = chatBrowserScope
        let messageID = shared.draftMessageIDs[key] ?? UUID().uuidString
        shared.draftMessageIDs[key] = messageID
        let selectedFiles = attachments
        let submittedPrompt = text
        let providerID = run["schedule"]["provider"].string
        do {
            var attachmentIDs: [JSON] = []
            var attachmentClaims: [JSON] = []
            for item in selectedFiles {
                let digest = SHA256.hash(data: item.bytes).map { String(format: "%02x", $0) }.joined()
                let started = try await store.request("chat.attachments.begin", ["id": .string(id), "messageId": .string(messageID), "providerId": .string(providerID), "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)])
                let uploadID = started["uploadId"].string
                let chunkSize = max(1, min(started["chunkSize"].int, 256 * 1024))
                guard !uploadID.isEmpty else { throw RemoteError(message: "\(store.displayName) did not create an attachment upload.") }
                for (index, offset) in stride(from: 0, to: item.bytes.count, by: chunkSize).enumerated() {
                    let end = min(offset + chunkSize, item.bytes.count)
                    let chunk = item.bytes.subdata(in: offset..<end)
                    _ = try await store.request("chat.attachments.chunk", ["uploadId": .string(uploadID), "index": .number(Double(index)), "dataBase64": .string(chunk.base64EncodedString())])
                }
                let finished = try await store.request("chat.attachments.finish", ["uploadId": .string(uploadID)])
                guard !finished["attachmentId"].string.isEmpty else { throw RemoteError(message: "\(store.displayName) did not confirm the attachment.") }
                attachmentIDs.append(finished["attachmentId"])
                attachmentClaims.append(.object(["attachmentId": finished["attachmentId"], "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)]))
            }
            let consent = try await store.request("chat.attachments.authorize", ["id": .string(id), "providerId": .string(providerID), "messageId": .string(messageID), "attachments": .array(attachmentClaims)])
            guard !consent["consentId"].string.isEmpty, consent["providerId"].string == providerID else { throw RemoteError(message: "\(store.displayName) did not confirm the exact attachment destination.") }
            var values: [String: JSON] = ["id": .string(id), "prompt": .string(submittedPrompt), "mode": .string("queue"), "messageId": .string(messageID), "providerId": .string(providerID), "attachments": .array(attachmentIDs), "consentId": consent["consentId"]]
            if run["schedule"]["provider"].string != "rehearsal" {
                values["modelOptions"] = .object(["model": .string(model), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier)])
            }
            _ = try await store.request("chat.send", values)
            shared.draftAttachments[key] = []
            shared.draftMessageIDs[key] = nil
            store.setDraft(attachmentDraftKey, .null)
            text = ""; composerHasFocus = false; followLatest = true
            await store.openChat(id)
        } catch { store.error = "Attachment was not sent: " + error.localizedDescription }
    }
    @discardableResult private func addAttachment(_ data: Data, name: String, mediaType: String) -> Bool {
        guard !busy else { return false }
        guard attachmentsEnabled else { store.error = "\(store.displayName) has not enabled approved attachments for this provider yet."; return false }
        guard supportedAttachmentTypes.contains(mediaType) else { store.error = "\(providerName) does not accept this file type through Proteus."; return false }
        if let reason = NativeAttachmentBudget.rejection(existingCount: attachments.count, existingBytes: attachments.reduce(0) { $0 + $1.bytes.count }, incomingBytes: data.count) { store.error = reason; return false }
        let item = NativeDraftAttachment(id: UUID().uuidString, name: String(name.prefix(120)), mediaType: mediaType, bytes: data)
        shared.draftAttachments[chatBrowserScope, default: []].append(item)
        appendAttachmentRecord(store: store, draftKey: attachmentDraftKey, item: item)
        return true
    }
    private func removeAttachment(_ attachmentID: String) {
        guard !busy else { return }
        shared.draftAttachments[chatBrowserScope]?.removeAll { $0.id == attachmentID }
        removeAttachmentRecord(store: store, draftKey: attachmentDraftKey, id: attachmentID)
    }
    private func removeMissingAttachments() {
        guard !busy else { return }
        let kept = Set(attachments.map(\.id))
        let records = attachmentRecords(store: store, draftKey: attachmentDraftKey).filter { kept.contains($0["id"].string) }
        store.setDraft(attachmentDraftKey, records.isEmpty ? .null : .array(records))
    }
    private func importPhotos(_ items: [PHPickerResult]) async {
        for item in items {
            do {
                let data = try await selectedPhotoData(item.itemProvider)
                guard let image = UIImage(data: data), let png = image.pngData() else { throw RemoteError(message: "The photo could not be read.") }
                if !addAttachment(png, name: "Photo-\(Date().formatted(.iso8601.year().month().day())).png", mediaType: "image/png") { break }
            } catch { store.error = error.localizedDescription; break }
        }
    }
    @discardableResult private func importFile(_ url: URL) -> Bool {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        let suffix = url.pathExtension.lowercased()
        let types = ["png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf", "txt": "text/plain"]
        guard let mediaType = types[suffix] else { store.error = "This file type is not supported by \(providerName)."; return false }
        do {
            let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size > 0, size <= NativeAttachmentBudget.maxFileBytes else { throw RemoteError(message: "Choose a file between 1 byte and 8 MB.") }
            let data = try Data(contentsOf: url)
            return addAttachment(data, name: url.lastPathComponent, mediaType: mediaType)
        } catch { store.error = error.localizedDescription; return false }
    }
    private func pasteAttachment() {
        let files = (UIPasteboard.general.urls ?? []).filter(\.isFileURL)
        if !files.isEmpty { for url in files { if !importFile(url) { break } }; return }
        if let image = UIPasteboard.general.image, let data = image.pngData() { addAttachment(data, name: "Pasted image.png", mediaType: "image/png"); return }
        store.error = "Copy an image or a file supported by this provider, then paste it here."
    }
    private func answer(_ value: String) { act("chat.reply", ["answer": .string(value), "requestId": pending["id"]]) }
    private func act(_ method: String, _ values: [String: JSON]) {
        guard !busy else { return }
        busy = true
        let submitted = text, draftKey = composerDraftKey
        let sendsText = method == "chat.send" || method == "chat.reply" && pending["type"].string == "question"
        Task { defer { busy = false }; do {
            var args = values; args["id"] = .string(id); _ = try await store.request(method, args)
            if sendsText, store.draft(draftKey).string == submitted { store.setDraft(draftKey, .null); if composerDraftKey == draftKey && text == submitted { text = ""; composerHasFocus = false; followLatest = true } }
            await store.openChat(id)
        } catch { store.error = error.localizedDescription } }
    }
    private func prefetchEarlier() {
        let first = run["eventStart"].int
        guard store.connected, first > 0, failedHistoryPrefetch != first, renderedEventStart - first < 72, !prefetchingEarlier, !loadingEarlier else { return }
        prefetchingEarlier = true
        Task {
            do {
                let value = try await store.request("chat.get", ["id": .string(id), "beforeEvent": .number(Double(first))])
                store.mergeChat(value) // Preserve the presentation window; only fill its cache headroom.
                prefetchingEarlier = false
                if historyGestureAvailable && conversationOffset < max(480, composerAvailableHeight * 2.5) { loadEarlier() }
            } catch { prefetchingEarlier = false; failedHistoryPrefetch = first /* On-demand loading owns the visible retry/error state. */ }
        }
    }
    private func loadEarlier() {
        guard !loadingEarlier, pendingHistoryRestore == nil, !restoringConversation, hasEarlierMessages else { return }
        if prefetchingEarlier && renderedEventStart == run["eventStart"].int { return }
        historyGestureAvailable = false
        let loadedFirst = run["eventStart"].int
        let oldFirst = renderedEventStart
        guard oldFirst > loadedFirst || store.connected else { return }
        loadingEarlier = true; earlierError = false
        let keepBottom = followLatest
        let offset = run["eventCount"].int - oldFirst
        let reading = shared.chatScrollLocations[chatBrowserScope] ?? NativeChatScrollLocation(anchor: oldFirst, inset: 0, offset: conversationOffset)
        if !keepBottom { shared.chatScrollLocations[chatBrowserScope] = reading; pendingHistoryRestore = reading; historyWindowChanged = true }
        if oldFirst > loadedFirst {
            oldestVisibleEvent = loadedFirst + NativeHistoryWindow.start(events: run["events"].array, before: oldFirst - loadedFirst, preparingOlder: true)
            loadingEarlier = false
            return
        }
        Task { defer { loadingEarlier = false }
            do { let value = try await store.request("chat.get", ["id": .string(id), "offset": .number(Double(offset)), "beforeEvent": .number(Double(oldFirst))]);
                oldestVisibleEvent = value["eventStart"].int + NativeHistoryWindow.start(events: value["events"].array, preparingOlder: true)
                store.mergeChat(value) }
            catch { earlierError = true; store.error = error.localizedDescription }
        }
    }
    private func openDocument(_ source: String) {
        if let url = URL(string: source), ["http", "https"].contains(url.scheme ?? ""), ["localhost", "127.0.0.1", "::1"].contains(url.host ?? "") {
            Task {
                await shared.refreshPreviews(scope: chatBrowserScope, remote: store, chatID: id)
                if let preview = shared.documents(in: chatBrowserScope).first(where: { $0.previewSource == source }) { selectedChild = preview.id; shared.selectChatChild(preview.id, for: chatBrowserScope) }
                else { store.error = "Enable View chat documents on \(store.displayName) and keep the design server running to open this preview." }
            }
            return
        }
        requestDocument(source: source)
    }
    private func requestDocument(source: String? = nil, documentID: String? = nil, fromRequestID: String? = nil, relativePath: String? = nil, parentID: String? = nil) {
        guard documentNotice == nil else { return }
        guard store.connected else { store.error = "Connect to \(store.displayName) to request the document. Already opened documents remain available for this session."; return }
        guard store.state["capabilities"].array.contains(.string("chat.documents.v1")) else { store.error = "\(store.displayName) does not support approved document viewing yet."; return }
        documentNotice = "Waiting for \(store.displayName) to approve document access…"
        documentTask = Task {
            do {
                var arguments: [String: JSON] = ["id": .string(id)]
                if let source { arguments["source"] = .string(source) }
                else if let documentID { arguments["documentId"] = .string(documentID) }
                else if let fromRequestID, let relativePath { arguments["fromRequestId"] = .string(fromRequestID); arguments["relativePath"] = .string(relativePath) }
                else { throw RemoteError(message: "Choose a linked document first.") }
                let request = try await store.request("chat.documents.request", arguments)
                let requestID = request["requestId"].string
                let stableID = request["documentId"].string
                guard !requestID.isEmpty, !stableID.isEmpty, documentID == nil || stableID == documentID else { throw RemoteError(message: "\(store.displayName) did not return a matching document request.") }
                var status = request["status"].string
                let expiration = ProviderAllowance.date(request["expiresAt"].string) ?? Date().addingTimeInterval(120)
                while status == "pending" && Date() < expiration {
                    try await Task.sleep(for: .seconds(2))
                    status = try await store.request("chat.documents.status", ["requestId": .string(requestID)])["status"].string
                }
                try Task.checkCancellation()
                guard status == "approved" else { throw RemoteError(message: status == "pending" ? "Document approval expired. Open the link to request it again." : "Document access was \(status.isEmpty ? "not approved" : status).") }
                documentNotice = "Opening approved document…"
                let result = try await store.request("chat.documents.read", ["requestId": .string(requestID)])
                let mediaType = result["mediaType"].string
                guard ["text/markdown", "text/html"].contains(mediaType), result["content"].string.utf8.count <= 1_048_576 else { throw RemoteError(message: "The approved document is too large or has an unsupported format.") }
                guard result["documentId"].string == stableID, result["version"].string == request["version"].string else { throw RemoteError(message: "The approved document identity or version changed.") }
                let assets = result["assets"].array
                guard assets.count <= 8 else { throw RemoteError(message: "\(store.displayName) returned too many approved document images.") }
                var assetURLs: [String: String] = [:], totalAssetBytes = 0
                for asset in assets {
                    let mediaType = asset["mediaType"].string
                    guard ["image/png", "image/jpeg", "image/gif", "image/webp"].contains(mediaType), asset["size"].int <= 512 * 1024,
                          asset["assetId"].string.count == 64, !asset["source"].string.isEmpty else { throw RemoteError(message: "The document image manifest is invalid.") }
                    totalAssetBytes += asset["size"].int
                    guard totalAssetBytes <= 2 * 1024 * 1024 else { throw RemoteError(message: "The approved document images exceed the safe limit.") }
                    let response = try await store.request("chat.documents.asset", ["requestId": .string(requestID), "assetId": asset["assetId"]])
                    guard response["requestId"].string == requestID, response["assetId"] == asset["assetId"], response["documentId"].string == stableID,
                          response["version"].string == result["version"].string, response["source"] == asset["source"], response["mediaType"] == asset["mediaType"],
                          let bytes = Data(base64Encoded: response["dataBase64"].string), bytes.count == asset["size"].int else { throw RemoteError(message: "The approved document image changed during transfer.") }
                    let digest = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
                    guard digest == asset["version"].string, digest == response["sha256"].string else { throw RemoteError(message: "The approved document image digest changed.") }
                    assetURLs[asset["source"].string] = "data:\(mediaType);base64,\(response["dataBase64"].string)"
                }
                let title = result["title"].string.isEmpty ? "Document" : result["title"].string
                let tab = ChatDocumentTab(id: stableID, title: title, version: result["version"].string, content: result["content"].string, mediaType: mediaType, readAt: result["readAt"].string, requestID: requestID, assets: assets, links: result["links"].array, assetDataURLs: assetURLs, parentID: parentID, relativePath: relativePath)
                if let index = documents.firstIndex(where: { $0.id == stableID }) { documents[index] = tab } else { documents.append(tab) }
                shared.rememberDocument(NativeDocumentDescriptor(id: tab.id, chatKey: chatBrowserScope, title: tab.title, mediaType: tab.mediaType, parentID: parentID, relativePath: relativePath), content: result["content"].string)
                shared.rememberDocumentSession(NativeDocumentSession(requestID: requestID, version: tab.version, readAt: tab.readAt, assets: assets, links: tab.links, assetDataURLs: assetURLs), for: stableID, in: chatBrowserScope)
                selectedChild = tab.id
            } catch is CancellationError { }
            catch { store.error = error.localizedDescription }
            documentNotice = nil; documentTask = nil
        }
    }
}
private struct ChatDocumentReader: View {
    @StateObject private var pageSearch = NativePageSearch()
    @EnvironmentObject var shared: SharedAppStore
    let document: ChatDocumentTab
    let store: RemoteStore
    let runID: String
    var requestLatest: () -> Void
    var openRelativeDocument: (String) -> Void
    var showChat: () -> Void
    @State private var height: CGFloat = 0
    @State private var scrollCommand: NativeScrollCommand?
    @State private var restoringOffset = true
    private var scrollKey: String { "chat:\(store.connection?.hostId ?? "local"):\(runID):\(document.id)" }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(document.title).font(.title2.bold())
                if !document.version.isEmpty { Text("Version \(document.version) · Last read \(document.readAt.isEmpty ? "this session" : document.readAt)").font(.caption).foregroundStyle(.secondary) }
                if let content = document.content {
                    if !store.connected { Text("Offline · showing the version read earlier in this session.").font(.caption).foregroundStyle(.orange) }
                    if document.mediaType == "text/html" { SafeArtifactPreview(content: content, title: document.title, version: document.version, hostName: store.state["hostName"].string, assetDataURLs: document.assetDataURLs).frame(minHeight: 420) }
                    else { MarkdownView(text: content, runID: runID, store: store, height: $height, onDocumentLink: openRelativeDocument, documentAssetURLs: document.assetDataURLs, search: pageSearch).frame(height: max(height, 1)) }
                    if !document.links.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Linked documents").font(.headline)
                            ForEach(document.links, id: \.self) { link in
                                Button(link["title"].string.isEmpty ? link["source"].string : link["title"].string) { openRelativeDocument(link["source"].string) }
                                    .disabled(document.requestID.isEmpty || !store.connected)
                            }
                            Text("Each linked document needs its own approval on \(store.displayName).").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                } else {
                    ContentUnavailableView("Document unloaded", systemImage: "doc.text", description: Text("This tab was restored without a saved document copy. Request current-version access from \(store.displayName) again."))
                    Button("Request current version", action: requestLatest).buttonStyle(.borderedProminent).disabled(!store.connected)
                    Button("Return to chat", action: showChat)
                }
            }.padding().background(NativeScrollProbe(command: scrollCommand, onSnapshot: { snapshot in
                if !restoringOffset, snapshot.offset.isFinite, snapshot.canScroll { shared.rememberDocumentScrollOffset(max(0, snapshot.offset), for: scrollKey) }
            }, onInteraction: { active in
                if active { restoringOffset = false; scrollCommand = nil }
            }, onApplied: { commandID, _ in
                if scrollCommand?.id == commandID { restoringOffset = false }
            }).frame(width: 1, height: 1).opacity(0))
        }.background(NativeTheme.background).navigationTitle(document.title)
            .safeAreaInset(edge: .top) { HStack { Spacer(); if pageSearch.visible { NativePageFindBar(search: pageSearch) } else { Button { pageSearch.visible = true } label: { Image(systemName: "magnifyingglass") }.accessibilityLabel("Find in document").keyboardShortcut("f", modifiers: .command) } }.padding(8).background(NativeTheme.background) }
            .onDisappear { shared.flushDocumentScrollPositions() }
            .task(id: scrollKey + ":" + document.version) {
                restoringOffset = true
                guard let offset = shared.documentScrollOffset(for: scrollKey) else { restoringOffset = false; return }
                scrollCommand = NativeScrollCommand(id: UUID(), y: offset)
            }
    }
}
private struct SafeArtifactPreview: View {
    let content: String
    let title: String
    let version: String
    let hostName: String
    var assetDataURLs: [String: String] = [:]
    @State private var interactive = false
    @State private var contextID = UUID()
    @State private var previewError: String?
    @State private var findRequest = 0
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label(interactive ? "Interactive preview" : "Static preview · scripts off", systemImage: interactive ? "play.rectangle" : "hand.raised")
                    .font(.caption.bold())
                Spacer()
                Button("Find", systemImage: "magnifyingglass") { findRequest += 1 }.keyboardShortcut("f", modifiers: .command)
                if interactive { Button("Stop scripts", systemImage: "stop.fill") { interactive = false; contextID = UUID() }.buttonStyle(.bordered) }
                else { Button("Enable interactive preview", systemImage: "play.fill") { interactive = true; contextID = UUID() }.buttonStyle(.bordered) }
            }
            Text(interactive ? "Browser JavaScript is enabled for \(title), version \(version), from \(hostName.isEmpty ? "the connected computer" : hostName), in this preview session only. Network, files and Proteus actions stay blocked." : "This preview is isolated. If the document needs browser JavaScript, enable it for this version and session.")
                .font(.caption).foregroundStyle(.secondary)
            if let previewError { Text(previewError).font(.caption).foregroundStyle(.orange) }
            IsolatedArtifactWebView(content: htmlWithApprovedAssets(content, assetDataURLs: assetDataURLs), scriptsEnabled: interactive, error: $previewError, findRequest: findRequest)
                .id(contextID).frame(minHeight: 420).clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.secondary.opacity(0.3)))
        }.onChange(of: version) { _, _ in interactive = false; contextID = UUID() }
            .onDisappear { interactive = false; contextID = UUID() }
    }
}
func htmlWithApprovedAssets(_ content: String, assetDataURLs: [String: String]) -> String {
    var rendered = content
    for (source, dataURL) in assetDataURLs where !source.isEmpty && source.utf8.count <= 1024 && dataURL.hasPrefix("data:image/") {
        rendered = rendered.replacingOccurrences(of: "src=\"" + source + "\"", with: "src=\"" + dataURL + "\"")
        rendered = rendered.replacingOccurrences(of: "src='" + source + "'", with: "src='" + dataURL + "'")
    }
    return rendered
}
struct IsolatedArtifactWebView: UIViewRepresentable {
    let content: String
    let scriptsEnabled: Bool
    @Binding var error: String?
    var findRequest = 0
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    static func configuration(scriptsEnabled: Bool) -> WKWebViewConfiguration {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = scriptsEnabled
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        return configuration
    }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = Self.configuration(scriptsEnabled: scriptsEnabled)
        let web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = context.coordinator; web.uiDelegate = context.coordinator
        web.isFindInteractionEnabled = true; web.allowsLinkPreview = false; web.scrollView.isScrollEnabled = true
        let rule = #"[{"trigger":{"url-filter":"^https?://"},"action":{"type":"block"}},{"trigger":{"url-filter":"^wss?://"},"action":{"type":"block"}}]"#
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "proteus-isolated-artifact-network-v2", encodedContentRuleList: rule) { [weak web, weak coordinator = context.coordinator] list, failure in
            Task { @MainActor in
                guard let web, let coordinator, web.navigationDelegate === coordinator else { return }
                guard let list else { coordinator.parent.error = "Preview isolation could not be prepared: \(failure?.localizedDescription ?? "network blocker unavailable")."; return }
                web.configuration.userContentController.add(list)
                web.loadHTMLString(Self.shell(coordinator.parent.content, scriptsEnabled: coordinator.parent.scriptsEnabled), baseURL: nil)
            }
        }
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) { if context.coordinator.parent.findRequest != findRequest { web.findInteraction?.presentFindNavigator(showingReplace: false) }; context.coordinator.parent = self }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) { web.stopLoading(); web.navigationDelegate = nil; web.uiDelegate = nil; web.loadHTMLString("", baseURL: nil) }
    static func shell(_ content: String, scriptsEnabled: Bool = true) -> String {
        let scripts = scriptsEnabled ? "'unsafe-inline' blob:" : "'none'"
        let policy = "default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; connect-src 'none'; frame-src 'none'; img-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src \(scripts)"
        let source = "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"\(policy)\"></head><body>\(content)</body></html>"
        // With WK JavaScript disabled, WebKit can leave srcdoc frames empty. Static content
        // renders directly in this separate, nonpersistent view; its script engine stays off.
        if !scriptsEnabled { return source }
        let escaped = source.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
        return "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; frame-src about:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; font-src data:;\"><style>html,body{margin:0;height:100%;background:#fff}iframe{width:100%;height:100%;border:0}</style></head><body><iframe sandbox=\"allow-scripts\" referrerpolicy=\"no-referrer\" srcdoc=\"\(escaped)\"></iframe></body></html>"
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: IsolatedArtifactWebView
        private var allowedMain = false
        private var allowedFrame = false
        init(_ parent: IsolatedArtifactWebView) { self.parent = parent }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            let target = navigationAction.targetFrame
            let address = navigationAction.request.url?.absoluteString ?? ""
            if target?.isMainFrame == true && !allowedMain && (address == "about:blank" || address.isEmpty) { allowedMain = true; decisionHandler(.allow); return }
            if target?.isMainFrame == false && (address == "about:blank" || address.isEmpty) && !allowedFrame { decisionHandler(.allow); return }
            if target?.isMainFrame == false && !allowedFrame && address == "about:srcdoc" { allowedFrame = true; decisionHandler(.allow); return }
            decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) { decisionHandler(navigationResponse.response.url == nil || navigationResponse.response.url?.scheme == "about" ? .allow : .cancel) }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { nil }
    }
}
struct ChatActivityGroupView: View {
    let events: [JSON]
    let hostName: String
    var runID = ""
    var search: NativePageSearch? = nil
    var eventStart = 0
    @State private var expanded = false
    private var tools: [JSON] { events.map { $0["data"]["tool"] }.filter { $0 != .null } }
    private var failed: Bool { tools.contains(where: toolActivityFailed) }
    private var running: Bool { tools.contains { $0["status"].string == "running" } }
    private var summary: String {
        var parts = tools.isEmpty ? [] : ["\(tools.count) tool\(tools.count == 1 ? "" : "s")"]
        let approvals = events.filter { $0["data"]["permission"]["automatic"].bool }.count
        if approvals > 0 { parts.append("\(approvals) automatic approval\(approvals == 1 ? "" : "s")") }
        let decisions = events.filter { $0["data"]["permission"] != .null && !$0["data"]["permission"]["automatic"].bool }.count
        if decisions > 0 { parts.append("\(decisions) permission decision\(decisions == 1 ? "" : "s")") }
        let systems = events.filter { $0["data"]["tool"] == .null && $0["data"]["permission"] == .null }.count
        if systems > 0 { parts.append("\(systems) system message\(systems == 1 ? "" : "s")") }
        let failures = tools.filter(toolActivityFailed).count
        if failures > 0 { parts.append("\(failures) failed") }
        let activeTools = tools.filter { $0["status"].string == "running" }.count
        if activeTools > 0 { parts.append("\(activeTools) running") }
        return parts.joined(separator: " · ")
    }
    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            if expanded { VStack(alignment: .leading, spacing: 8) {
                if !hostName.isEmpty { Text("On \(hostName)").font(.caption).foregroundStyle(.secondary) }
                ForEach(Array(events.enumerated()), id: \.offset) { offset, event in
                    if event["data"]["tool"] != .null { ToolActivityView(tool: event["data"]["tool"]) }
                    else if event["data"]["permission"] != .null { ChatPermissionActivityView(event: event) }
                    else { MessageView(role: "system", text: event["text"].string, runID: runID, timestamp: event["timestamp"].string.isEmpty ? event["at"].string : event["timestamp"].string, search: search, searchKey: eventStart + offset).accessibilityIdentifier("system-activity") }
                }
            }.padding(.top, 8)
            }
        } label: {
            HStack { if running { ProgressView().controlSize(.small) } else { Image(systemName: failed ? "exclamationmark.triangle.fill" : "checkmark.circle").foregroundStyle(failed ? .orange : NativeTheme.accent) }; Text("Activity · " + summary).font(.subheadline); Spacer(); if !tools.isEmpty { RuntimeTimerView(tools:tools) } }
        }.padding(12).background(failed ? Color.orange.opacity(0.12) : NativeTheme.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(failed ? Color.orange.opacity(0.6) : NativeTheme.line))
            // Activity starts collapsed; the user controls expansion.
    }
}
struct ChatPermissionActivityView: View {
    let event: JSON
    @Environment(\.timeZone) private var timeZone
    private var permission: JSON { event["data"]["permission"] }
    private var callID: String { NativeActivity.permissionCallID(permission) }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label((permission["automatic"].bool ? "Automatically approved · " : "Permission " + permission["decision"].string + " · ") + permission["intention"].string, systemImage: "checkmark.shield").font(.caption)
            if !callID.isEmpty { Text("Tool call · " + callID).font(.caption2.monospaced()).textSelection(.enabled) }
            if !permission["reason"].string.isEmpty { Text(permission["reason"].string).font(.caption).foregroundStyle(.secondary) }
            if let date = ProviderAllowance.date(event["timestamp"].string.isEmpty ? event["at"].string : event["timestamp"].string) { Text(nativeTimestamp(date, timezone: timeZone.identifier)).font(.caption2).foregroundStyle(.secondary) }
            if !permission["request"].string.isEmpty {
                DisclosureGroup("Original approval request") { Text(permission["request"].string).font(.caption.monospaced()).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 6) }
                    .font(.caption).accessibilityIdentifier("approval-request-" + callID)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(12)
            .background(NativeTheme.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeTheme.line))
            .accessibilityElement(children: .contain).accessibilityIdentifier("permission-activity-" + callID)
    }
}
struct MessageView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.timeZone) private var timeZone
    @State private var height: CGFloat = 0
    @State private var richVisible = true
    let role: String
    let text: String
    let runID: String
    var timestamp: String = ""
    var turn: JSON = .null
    var actionID: String? = nil
    var sentAttachments: [JSON] = []
    var onDocumentLink: ((String) -> Void)? = nil
    var onResize: () -> Void = {}
    var search: NativePageSearch? = nil
    var searchKey = 0
    var viewport: CGRect? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text(role.uppercased()).font(.caption2.weight(.bold)); Spacer(); if role != "user" && turn != .null { RuntimeTimerView(turns:[turn]) }; if let date = ProviderAllowance.date(timestamp) { Text(nativeTimestamp(date, timezone: timeZone.identifier)).font(.caption2).accessibilityIdentifier("message-timestamp") } }.foregroundStyle(.secondary)
            ZStack(alignment: .topLeading) {
                if height == 0 { Text(text).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }
                if richVisible || height == 0 {
                    MarkdownView(text: text, runID: runID, store: store, height: $height, onDocumentLink: onDocumentLink, onResize: onResize, search: search, searchKey: searchKey).frame(height: max(height, 1)).opacity(height > 0 ? 1 : 0)
                } else { Color.clear.frame(height: height) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            ForEach(sentAttachments, id: \.self) { item in
                Label(item["name"].string + " · " + ByteCountFormatter.string(fromByteCount: Int64(item["size"].int), countStyle: .file), systemImage: item["mediaType"].string.hasPrefix("image/") ? "photo" : "doc")
                    .font(.caption).padding(6).background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 6))
            }
            if let actionID { MessageActionBar(messageID: actionID, markdown: text) }
        }.onGeometryChange(for: Bool.self) { geometry in
            guard let viewport, viewport.width > 0 else { return true }
            return geometry.frame(in: .global).intersects(viewport.insetBy(dx: 0, dy: -max(600, viewport.height * 1.5)))
        } action: { visible in richVisible = visible }
        .padding().background(role == "user" ? NativeTheme.accent.opacity(0.13) : role == "system" ? NativeTheme.background : NativeTheme.surface, in: RoundedRectangle(cornerRadius: 16)).padding(.leading, role == "user" ? 20 : 0).padding(.trailing, actionID != nil || role.contains("streaming") ? 20 : 0)
    }
}

struct AttachmentSendReview: View {
    @Environment(\.dismiss) private var dismiss
    let attachments: [NativeDraftAttachment]
    let providerName: String
    let hostName: String
    let send: () -> Void
    var body: some View {
        NavigationStack {
            NativeList {
                Section { Text("Send these selected files to \(providerName) on \(hostName)?").font(.subheadline) }
                Section("Selected files") {
                    ForEach(attachments) { item in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.name).lineLimit(2)
                            Text(ByteCountFormatter.string(fromByteCount: Int64(item.bytes.count), countStyle: .file)).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }.background(NativeTheme.background).navigationTitle("Review attachments").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Send to " + providerName) { dismiss(); send() }.accessibilityIdentifier("confirm-attachment-send") }
                }
        }
    }
}

struct BackdropImagePreview: View {
    let image: UIImage
    let imageLabel: String
    let close: () -> Void
    var body: some View {
        GeometryReader { geometry in
            let scale = min(geometry.size.width / max(image.size.width, 1), geometry.size.height / max(image.size.height, 1))
            ZStack {
                Button(action: close) { Color.black.opacity(0.94) }
                    .buttonStyle(.plain).accessibilityLabel("Close preview background")
                Image(uiImage: image).resizable().scaledToFit()
                    .frame(width: image.size.width * scale, height: image.size.height * scale)
                    .contentShape(Rectangle()).onTapGesture {}
                    .accessibilityLabel(imageLabel)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

struct AttachmentPreview: View {
    @Environment(\.dismiss) private var dismiss
    let attachment: NativeDraftAttachment
    let close: () -> Void
    var body: some View {
        NavigationStack {
            Group {
                if let image = attachment.image {
                    BackdropImagePreview(image: image, imageLabel: "Attachment image preview") { close(); dismiss() }
                } else if attachment.mediaType == "text/plain", let text = String(data: attachment.bytes, encoding: .utf8) {
                    ScrollView { Text(text).font(.body.monospaced()).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading).padding() }
                } else {
                    ContentUnavailableView(attachment.name, systemImage: attachment.mediaType == "application/pdf" ? "doc.richtext" : "doc", description: Text("\(ByteCountFormatter.string(fromByteCount: Int64(attachment.bytes.count), countStyle: .file)) · Preview not available here"))
                }
            }.background(NativeTheme.background).navigationTitle(attachment.name).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button { close(); dismiss() } label: { Image(systemName: "xmark") }.accessibilityLabel("Close preview").keyboardShortcut(.cancelAction) } }
        }
    }
}

private enum NativeTimestampFormatter {
    static let lock = NSLock()
    static var values: [String: DateFormatter] = [:]
}
func nativeTimestamp(_ date: Date, timezone: String = "", includeSeconds: Bool = false) -> String {
    let zone = TimeZone(identifier: timezone) ?? .current
    let key = zone.identifier + ":" + Locale.current.identifier + (includeSeconds ? ":seconds" : "")
    NativeTimestampFormatter.lock.lock(); defer { NativeTimestampFormatter.lock.unlock() }
    let formatter: DateFormatter
    if let cached = NativeTimestampFormatter.values[key] { formatter = cached }
    else {
        formatter = DateFormatter(); formatter.dateFormat = includeSeconds ? "MMM d, h:mm:ss a z" : "MMM d, h:mm a z"; formatter.timeZone = zone
        if NativeTimestampFormatter.values.count >= 4 { NativeTimestampFormatter.values.removeAll() }
        NativeTimestampFormatter.values[key] = formatter
    }
    return formatter.string(from: date)
}

#if DEBUG
struct AttachmentPreviewFixture: View {
    @State private var showing = false
    private static let sample: NativeDraftAttachment = {
        let bytes = UIGraphicsImageRenderer(size: CGSize(width: 16, height: 16)).pngData { renderer in
            renderer.cgContext.setFillColor(UIColor.systemGreen.cgColor); renderer.cgContext.fill(CGRect(x: 0, y: 0, width: 16, height: 16))
        }
        return NativeDraftAttachment(id: "synthetic-preview", name: "Selected.png", mediaType: "image/png", bytes: bytes)
    }()
    var body: some View {
        VStack {
            if let image = Self.sample.image { Image(uiImage: image).resizable().frame(width: 48, height: 48).accessibilityLabel("Selected image thumbnail") }
            Button("Open attachment preview") { showing = true }
        }.sheet(isPresented: $showing) { AttachmentPreview(attachment: Self.sample) { showing = false } }
    }
}
/// A rendered-message fixture verifies the environment dependency, including a timezone change.
struct MessageTimezoneFixture: View {
    @StateObject private var remote = RemoteStore(connection: nil, legacyCredentials: false)
    @StateObject private var shared = SharedAppStore()
    @State private var timezone = "America/Denver"
    var body: some View {
        VStack {
            MessageView(role: "user", text: "Synthetic timezone message", runID: "timezone-fixture", timestamp: "2026-10-04T18:00:00Z")
                .environmentObject(remote).environmentObject(shared)
                .environment(\.timeZone, TimeZone(identifier: timezone)!)
            Button("Use Tokyo device timezone") { timezone = "Asia/Tokyo" }
        }.padding().onAppear {
            shared.snapshot = .object(["preferences": .object(["timezone": .string("UTC")])])
        }
    }
}
#endif

/// Persisted assistant events are complete messages. Streams, tools and reasoning never get actions.
enum MessageActions {
    static func eligible(_ event: JSON) -> Bool {
        guard event["role"].string == "assistant", !event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        let data = event["data"]
        guard data["tool"] == .null, data["permission"] == .null else { return false }
        for value in [event, data] {
            if ["partial", "streaming", "reasoning", "thinking"].contains(where: { value[$0] != .null && value[$0] != .bool(false) && value[$0] != .string("") }) { return false }
            if ["type", "kind", "channel", "phase"].contains(where: { ["reasoning", "thinking", "analysis", "tool", "delta", "partial", "streaming"].contains(value[$0].string.lowercased()) }) { return false }
            if ["partial", "streaming", "in_progress"].contains(value["status"].string.lowercased()) { return false }
        }
        return true
    }
    @MainActor static func copy(_ markdown: String) { UIPasteboard.general.string = markdown }
}

struct MessageActionBar: View {
    let messageID: String
    let markdown: String
    @ObservedObject private var speech = MessageSpeech.shared
    @State private var copied = false
    @State private var copyReset: Task<Void, Never>?
    @State private var scrubbing = false
    @State private var position = 0.0
    private var speaking: Bool { speech.messageID == messageID }
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 4) {
            Button {
                MessageActions.copy(markdown); copied = true; copyReset?.cancel()
                copyReset = Task { try? await Task.sleep(for: .seconds(2)); if !Task.isCancelled { copied = false } }
            } label: { Image(systemName: copied ? "checkmark" : "doc.on.doc").frame(width: 36, height: 36).contentShape(Rectangle()) }
                .accessibilityLabel(copied ? "Message copied" : "Copy message").accessibilityIdentifier("copy-message")
            Button { speech.toggle(messageID: messageID, markdown: markdown) } label: { Image(systemName: speaking ? "stop.fill" : "speaker.wave.2").frame(width: 36, height: 36).contentShape(Rectangle()) }
                .accessibilityLabel(speaking ? "Stop reading aloud" : "Read aloud").accessibilityIdentifier("read-aloud")
                .accessibilityHint(speaking ? "Stops this message." : "Reads this completed message using the device voice.")
            if copied { Text("Copied").font(.caption).accessibilityHidden(true) }
            if speech.failedMessageID == messageID { Text(speech.error ?? "Read aloud is unavailable.").font(.caption).foregroundStyle(.secondary) }
        }.buttonStyle(.borderless).foregroundStyle(.secondary)
        if speaking {
            HStack(spacing: 10) {
                Button { speech.togglePause() } label: { Image(systemName: speech.isPaused ? "play.fill" : "pause.fill").frame(width: 36, height: 36).contentShape(Rectangle()) }
                    .accessibilityLabel(speech.isPaused ? "Resume reading aloud" : "Pause reading aloud").accessibilityIdentifier("pause-reading")
                Slider(value: $position, in: 0...1) { Text("Reading position") } onEditingChanged: { editing in
                    scrubbing = editing
                    if !editing { speech.seek(to: position) }
                }.accessibilityLabel("Reading position").accessibilityValue("\(Int(position * 100)) percent").accessibilityIdentifier("reading-position")
                Text("\(Int(position * 100))%").font(.caption.monospacedDigit()).frame(minWidth: 35).accessibilityHidden(true)
            }.buttonStyle(.borderless).foregroundStyle(.secondary)
        }
        }.onChange(of: speech.progress) { _, value in if !scrubbing { position = value } }
            .onChange(of: speaking) { _, _ in position = speech.progress; scrubbing = false }
            .onDisappear { copyReset?.cancel(); copied = false }
            .onChange(of: messageID) { _, _ in copyReset?.cancel(); copied = false }
            .onChange(of: markdown) { _, _ in copyReset?.cancel(); copied = false; if speaking { speech.stop() } }
    }
}

/// Preserve code content and table cells while removing presentation-only Markdown.
enum SpokenMarkdown {
    static func text(_ markdown: String) -> String {
        let lines = markdown.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").components(separatedBy: "\n")
        var result: [String] = []; var fence: Character?; var fenceLength = 0
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if let marker = fence {
                if trimmed.first == marker && trimmed.prefix(while: { $0 == marker }).count >= fenceLength && trimmed.allSatisfy({ $0 == marker || $0.isWhitespace }) { fence = nil }
                else { result.append(line) }
                continue
            }
            if let marker = trimmed.first, marker == "`" || marker == "~", trimmed.prefix(while: { $0 == marker }).count >= 3 {
                fence = marker; fenceLength = trimmed.prefix(while: { $0 == marker }).count; continue
            }
            if line.hasPrefix("    ") || line.hasPrefix("\t") { result.append(String(line.dropFirst(line.hasPrefix("\t") ? 1 : 4))); continue }
            if matches(trimmed, #"^(?:\|?\s*:?-{3,}:?\s*)+(?:\|\s*:?-{3,}:?\s*)+\|?$"#) || matches(trimmed, #"^(?:[-*_]\s*){3,}$"#) || matches(trimmed, #"^=+$"#) { continue }
            var content = replace(line, #"^\s{0,3}(?:>\s*)+"#, "")
            content = replace(content, #"^\s{0,3}#{1,6}\s+|\s+#+\s*$"#, "")
            content = replace(content, #"^\s*(?:[-+*]|[0-9]+[.)])\s+(?:\[[ xX]\]\s*)?"#, "")
            if matches(content, #"^\s*\[[^]]+\]:\s+\S+"#) { continue }
            let cells = tableCells(content)
            if cells.count > 1 { result.append(cells.map(inline).joined(separator: "; ")) }
            else { result.append(inline(content)) }
        }
        return replace(result.joined(separator: "\n"), #"\n{3,}"#, "\n\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    private static func inline(_ text: String) -> String {
        return (try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))).map { String($0.characters) } ?? text
    }
    private static func tableCells(_ line: String) -> [String] {
        // A pipe inside inline code is meaningful code, not a table cell boundary.
        var cells: [String] = []; var current = ""; var ticks = false; var escaped = false
        for char in line {
            if char == "`" && !escaped { ticks.toggle() }
            if char == "|" && !ticks && !escaped { cells.append(current.trimmingCharacters(in: .whitespaces)); current = "" }
            else { current.append(char) }
            escaped = char == "\\" && !escaped
        }
        cells.append(current.trimmingCharacters(in: .whitespaces))
        if cells.count > 1 { if cells.first == "" { cells.removeFirst() }; if cells.last == "" { cells.removeLast() } }
        return cells
    }
    private static func matches(_ text: String, _ pattern: String) -> Bool { text.range(of: pattern, options: .regularExpression) != nil }
    private static func replace(_ text: String, _ pattern: String, _ replacement: String) -> String { text.replacingOccurrences(of: pattern, with: replacement, options: .regularExpression) }
}

enum MessageSpeechEvent { case started, progress(Int), paused, resumed, finished, cancelled, failed }
@MainActor protocol MessageSpeechOutput: AnyObject {
    var event: ((UUID, MessageSpeechEvent) -> Void)? { get set }
    func start(_ text: String, token: UUID)
    func stop()
    func pause() -> Bool
    func resume() -> Bool
}
@MainActor final class MessageSpeech: ObservableObject {
    static let shared = MessageSpeech()
    @Published private(set) var messageID: String?
    @Published private(set) var failedMessageID: String?
    @Published private(set) var error: String?
    @Published private(set) var isPaused = false
    @Published private(set) var progress = 0.0
    private(set) var spokenText = ""
    private(set) var readingOffset = 0
    private var utteranceOffset = 0
    private let output: MessageSpeechOutput
    private var token: UUID?
    private var startup: Task<Void, Never>?
    private let startTimeout: Duration
    init(output: MessageSpeechOutput? = nil, startTimeout: Duration = .seconds(10)) {
        self.output = output ?? SystemMessageSpeech(); self.startTimeout = startTimeout
        self.output.event = { [weak self] token, event in self?.receive(token, event) }
    }
    func toggle(messageID: String, markdown: String) {
        if self.messageID == messageID { stop(); return }
        stop()
        spokenText = SpokenMarkdown.text(markdown)
        guard !spokenText.isEmpty else { return }
        self.messageID = messageID
        start(at: 0)
    }
    private func start(at offset: Int) {
        utteranceOffset = offset; readingOffset = offset
        progress = Double(offset) / Double(max(1, spokenText.utf16.count))
        let next = UUID(); token = next
        startup = Task { [weak self, startTimeout] in
            do { try await Task.sleep(for: startTimeout) } catch { return }
            self?.receive(next, .failed)
        }
        output.start((spokenText as NSString).substring(from: offset), token: next)
    }
    func togglePause() {
        guard messageID != nil else { return }
        if isPaused {
            isPaused = false
            if token == nil || !output.resume() { invalidate(); start(at: Self.wordBoundary(in: spokenText, offset: readingOffset)) }
        } else {
            isPaused = true
            if !output.pause() { invalidate() }
        }
    }
    func seek(to fraction: Double) {
        guard messageID != nil, fraction.isFinite else { return }
        if fraction >= 1 { stop(); return }
        let offset = Self.wordBoundary(in: spokenText, offset: Int(max(0, fraction) * Double(spokenText.utf16.count)))
        invalidate(); readingOffset = offset
        progress = Double(offset) / Double(max(1, spokenText.utf16.count))
        if !isPaused { start(at: offset) }
    }
    /// Seek coordinates are UTF-16, matching AVSpeechSynthesizer's NSRange callbacks.
    static func wordBoundary(in text: String, offset: Int) -> Int {
        var positions = [0]
        text.enumerateSubstrings(in: text.startIndex..<text.endIndex, options: .byWords) { _, range, _, _ in positions.append(NSRange(range, in: text).location) }
        return positions.last(where: { $0 <= min(max(0, offset), max(0, text.utf16.count - 1)) }) ?? 0
    }
    private func invalidate() { token = nil; startup?.cancel(); startup = nil; output.stop() }
    func stop() {
        invalidate(); messageID = nil; failedMessageID = nil; error = nil; isPaused = false
        progress = 0; readingOffset = 0; utteranceOffset = 0; spokenText = ""
    }
    private func receive(_ expected: UUID, _ event: MessageSpeechEvent) {
        guard expected == token else { return }
        switch event {
        case .started:
            startup?.cancel(); startup = nil
            if isPaused && !output.pause() { invalidate() }
        case .progress(let offset):
            readingOffset = min(spokenText.utf16.count, max(utteranceOffset, utteranceOffset + offset))
            progress = Double(readingOffset) / Double(max(1, spokenText.utf16.count))
        case .paused: isPaused = true
        case .resumed: isPaused = false
        case .finished, .cancelled: stop()
        case .failed:
            let failed = messageID; stop(); failedMessageID = failed
            error = "Read aloud couldn't start with the available device voice."
        }
    }
}

@MainActor final class SystemMessageSpeech: NSObject, MessageSpeechOutput, AVSpeechSynthesizerDelegate {
    var event: ((UUID, MessageSpeechEvent) -> Void)?
    private let synthesizer = AVSpeechSynthesizer()
    private var current: (utterance: AVSpeechUtterance, token: UUID)?
    private var observers: [NSObjectProtocol] = []
    override init() {
        super.init(); synthesizer.delegate = self
        // Keep speech out of the app's audio session; never change recording/microphone settings.
        synthesizer.usesApplicationAudioSession = false
        observers.append(NotificationCenter.default.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.cancelCurrent() }
        })
        observers.append(NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt == AVAudioSession.InterruptionType.began.rawValue else { return }
            Task { @MainActor in self?.cancelCurrent() }
        })
    }
    deinit { for observer in observers { NotificationCenter.default.removeObserver(observer) } }
    func start(_ text: String, token: UUID) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.prefersAssistiveTechnologySettings = true
        current = (utterance, token); synthesizer.speak(utterance)
    }
    func stop() { current = nil; synthesizer.stopSpeaking(at: .immediate) }
    func pause() -> Bool { synthesizer.pauseSpeaking(at: .word) }
    func resume() -> Bool { synthesizer.continueSpeaking() }
    private func cancelCurrent() { let token = current?.token; stop(); if let token { event?(token, .cancelled) } }
    private func report(_ utterance: AVSpeechUtterance, _ value: MessageSpeechEvent) {
        guard let current, current.utterance === utterance else { return }
        event?(current.token, value)
    }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .started) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .finished) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .cancelled) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .paused) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .resumed) } }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString range: NSRange, utterance: AVSpeechUtterance) { Task { @MainActor [weak self] in self?.report(utterance, .progress(range.location)) } }
}


private struct NativeQueuedEditView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.dismiss) private var dismiss
    let runID: String
    let message: JSON
    @State private var text = ""
    @State private var busy = false
    @State private var error = ""
    var body: some View {
        NavigationStack {
            NativeForm {
                Text("Changes apply only while this message is still queued. Attachments and model choices are preserved.")
                TextEditor(text: $text).frame(minHeight: 160).accessibilityIdentifier("queued-message-editor")
                if !error.isEmpty { Text(error).foregroundStyle(.red) }
            }.background(NativeTheme.background).navigationTitle("Edit queued message")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(busy) }
                    ToolbarItem(placement: .confirmationAction) { Button("Save") {
                        busy = true
                        Task { defer { busy = false }
                            do { _ = try await store.request("chat.edit-queued", ["id": .string(runID), "messageId": message["id"], "expectedPrompt": message["prompt"], "prompt": .string(text)]); await store.openChat(runID); dismiss() }
                            catch { self.error = error.localizedDescription }
                        }
                    }.disabled(busy || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !store.connected) }
                }.onAppear { text = message["prompt"].string }
        }
    }
}

struct LiveBrowserView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.scenePhase) private var scenePhase
    let chatID: String
    @State private var tabs: [JSON] = []
    @State private var selected = ""
    @State private var frame: JSON = .null
    @State private var image: UIImage?
    @State private var receivedAt = Date.distantPast
    @State private var text = ""
    @State private var status = "Connecting…"
    @State private var frozen = false
    @State private var point: CGPoint?
    @State private var zoom = 1.0
    @State private var sending = false
    private var pending: JSON { store.chats[chatID]?["pending"] ?? .null }
    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Picker("Desktop tab", selection: $selected) { Text("Follow agent").tag(""); ForEach(tabs, id: \.self) { tab in Text(tab["title"].string).tag(tab["id"].string) } }
                Button { frozen = false; point = nil } label: { Image(systemName: "arrow.clockwise") }.accessibilityLabel("Refresh live browser")
                Toggle("Freeze", isOn: $frozen).fixedSize()
            }
            Text(status).font(.caption).frame(maxWidth: .infinity, alignment: .leading)
            GeometryReader { viewport in ScrollView([.horizontal, .vertical]) {
                if let image {
                    GeometryReader { geometry in
                        Image(uiImage: image).resizable().scaledToFit().accessibilityLabel("Live desktop browser page").accessibilityIdentifier("live-browser-image")
                            .overlay { if let point { Image(systemName: "scope").font(.title).foregroundStyle(NativeTheme.accent).position(x: point.x * geometry.size.width, y: point.y * geometry.size.height) } }
                            .onTapGesture { location in point = CGPoint(x: max(0,min(1,location.x / geometry.size.width)), y: max(0,min(1,location.y / geometry.size.height))); frozen = true; status = "Frozen reference · refresh if the page changes" }
                    }.frame(width: max(1, viewport.size.width) * zoom, height: max(1, viewport.size.width) * zoom * image.size.height / image.size.width)
                } else { ContentUnavailableView("Desktop browser", systemImage: "rectangle.on.rectangle", description: Text(status)) }
            }.background(NativeTheme.surface) }
            HStack { Image(systemName: "minus.magnifyingglass"); Slider(value: $zoom, in: 0.5...3); Image(systemName: "plus.magnifyingglass") }
            if pending != .null { Text(pending["question"].string).font(.callout).lineLimit(6) }
            if pending["type"].string == "permission" {
                ScrollView(.horizontal) { HStack {
                    Button("Approve once") { decision("approve") }
                    Button("Deny", role: .destructive) { decision("deny") }
                    ForEach(pending["permissionChoices"].array, id: \.self) { choice in Button(choice["label"].string) { decision(choice["value"].string) } }
                }.disabled(sending || !store.connected) }
            }
            TextField("Tell the agent what to do…", text: $text, axis: .vertical).accessibilityIdentifier("live-browser-instruction").lineLimit(2...5).textFieldStyle(.roundedBorder)
            HStack {
                Button("Queue") { send("queue") }.buttonStyle(.borderedProminent).foregroundStyle(NativeTheme.background)
                if (store.chats[chatID]?["status"].string ?? "") == "running" { Button("Steer") { send("steer") }.buttonStyle(.bordered) }
                if pending["type"].string == "question" { Button("Answer") { send("answer") }.buttonStyle(.bordered) }
            }.disabled(sending || frame == .null || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !store.connected)
        }.padding(12).background(NativeTheme.background)
            .onAppear { text = store.draft("live:" + chatID).string }
            .onChange(of: text) { _, value in store.setDraft("live:" + chatID, .string(value)) }
            .onChange(of: selected) { _, _ in frame = .null; image = nil; point = nil; frozen = false }
            .onChange(of: store.connected) { _, connected in if !connected { frame = .null; image = nil; point = nil; frozen = false; status = "\(store.displayName) disconnected" } }
            .onChange(of: scenePhase) { _, phase in if phase != .active { frame = .null; image = nil; point = nil; frozen = false } }
            .task(id: selected) {
                while !Task.isCancelled {
                    if scenePhase == .active { await refresh() }
                    do { try await Task.sleep(for: .seconds(1)) } catch { return }
                }
            }
    }
    private func refresh() async {
        do {
            guard store.connected else { image = nil; frame = .null; status = "\(store.displayName) disconnected"; return }
            let result = try await store.request("browser.live.list", ["id": .string(chatID)])
            guard !Task.isCancelled else { return }; tabs = result["tabs"].array
            if frozen {
                if tabs.contains(where: { $0["id"] == frame["tabId"] }), Date().timeIntervalSince(receivedAt) < 30 { return }
                frozen = false; point = nil
            }
            let tab = tabs.first { $0["id"].string == selected } ?? tabs.first { $0["agentControlling"].bool } ?? tabs.first { $0["id"] == frame["tabId"] } ?? tabs.first
            guard let tab else { image = nil; frame = .null; status = "No loaded desktop browser tabs for this chat"; return }
            let next = try await store.request("browser.live.frame", ["id": .string(chatID), "tabId": tab["id"]])
            guard !Task.isCancelled, !frozen else { return }
            guard let encoded = next["image"].string.split(separator: ",", maxSplits: 1).last, let bytes = Data(base64Encoded: String(encoded)), let decoded = UIImage(data: bytes) else { throw NSError(domain: "LiveBrowser", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid browser frame"]) }
            frame = next; receivedAt = Date(); image = decoded; point = nil; status = "Live · " + next["capturedAt"].string
        } catch { guard !Task.isCancelled else { return }; image = nil; frame = .null; status = error.localizedDescription }
    }
    private func decision(_ answer: String) {
        let requestID = pending["id"]; sending = true
        Task { defer { sending = false }; do { _ = try await store.request("chat.reply", ["id": .string(chatID), "requestId": requestID, "answer": .string(answer)]); await store.openChat(chatID) } catch { status = error.localizedDescription } }
    }
    private func send(_ mode: String) {
        let sent = text
        var args: [String: JSON] = ["id": .string(chatID), "frameId": frame["id"], "text": .string(sent), "mode": .string(mode), "requestId": pending["id"], "messageId": .string(UUID().uuidString)]
        if let point { args["point"] = .object(["x": .number(point.x), "y": .number(point.y)]) }
        sending = true
        Task { defer { sending = false }; do { _ = try await store.request("browser.live.instruct", args); if text == sent { text = "" }; frozen = false; _ = await store.openChat(chatID) } catch { status = error.localizedDescription } }
    }
}

struct NativeChatLink {
    static func url(host: String, id: String) -> URL? {
        guard UUID(uuidString: host) != nil, UUID(uuidString: id) != nil else { return nil }
        var components = URLComponents(); components.scheme = "proteus"; components.host = "chat"
        components.queryItems = [URLQueryItem(name: "host", value: host), URLQueryItem(name: "id", value: id)]
        return components.url
    }
    static func parse(_ url: URL) -> (host: String, id: String)? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false), components.scheme == "proteus", components.host == "chat", ["", "/"].contains(components.path), components.user == nil, components.password == nil, components.port == nil, components.fragment == nil else { return nil }
        let fields = components.queryItems ?? [], hosts = fields.filter { $0.name == "host" }, ids = fields.filter { $0.name == "id" }
        guard fields.count == 2, hosts.count == 1, ids.count == 1, let host = hosts.first?.value, let id = ids.first?.value, UUID(uuidString: host) != nil, UUID(uuidString: id) != nil else { return nil }
        return (host, id)
    }
}
struct NativeRunFilesView: View {
    let run: JSON
    let hostName: String
    static func paths(_ run: JSON) -> [(String, String)] {
        let workspace = run["schedule"]["workspace"]
        let record = run["storage"]["run"].string.isEmpty ? run["runPath"].string : run["storage"]["run"].string
        let session = run["storage"]["nativeSession"].string.isEmpty ? run["nativeSessionPath"].string : run["storage"]["nativeSession"].string
        return [("Proteus run record", record), ("Provider session folder", session), ("Starting folder", workspace["cwd"].string)] + workspace["additionalDirectories"].array.map { ("Additional workspace folder", $0.string) }
    }
    var body: some View {
        DisclosureGroup("Run files & folders") {
            Text("Paths on " + hostName).font(.caption).foregroundStyle(.secondary)
            ForEach(Array(Self.paths(run).enumerated()), id: \.offset) { _, item in
                if !item.1.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.0).font(.caption.weight(.semibold)); Text(item.1).font(.caption.monospaced()).textSelection(.enabled)
                        Button("Copy path", systemImage: "doc.on.doc") { UIPasteboard.general.string = item.1 }.font(.caption)
                    }.padding(.vertical, 4)
                }
            }
        }.padding(12).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 12))
    }
}

import SwiftUI
import AVFoundation
import WebKit
import PhotosUI
import UniformTypeIdentifiers
import CryptoKit
import UIKit

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
            List {
                if store.state["runs"].array.isEmpty { ContentUnavailableView("Ready for your next idea", systemImage: "bubble.left.and.bubble.right", description: Text("Start a chat using your Mac’s workspace and tools.")) }
                ForEach(store.state["runs"].array.filter { query.isEmpty || $0["title"].string.localizedCaseInsensitiveContains(query) }, id: \.self) { run in
                    NavigationLink(value: run["id"].string) { VStack(alignment: .leading, spacing: 6) { Text(run["title"].string).font(.headline); Text(statusLabel(run["status"].string)).font(.caption).foregroundStyle(run["status"].string == "awaiting_input" ? Color.orange : Color.secondary) } }.padding(.vertical, 5)
                }
                if store.state["runs"].array.count < store.state["runCount"].int { Button("Load older chats") { Task { await store.loadMoreRuns() } }.disabled(!store.connected) }
            }.navigationTitle("Chats").searchable(text: $query)
                .safeAreaInset(edge: .bottom) { ConnectionStatus().padding().background(.bar) }
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
    var onStarted: (String) -> Void
    @State private var name = ""
    @State private var prompt = ""
    @State private var provider = "copilot"
    @State private var model = ""
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @State private var workspace = ""
    @State private var selected = Set<String>()
    @State private var agent = ""
    @State private var includeDefaults = true
    @State private var sending = false
    @State private var loading = true
    @State private var pickedPhotos: [PhotosPickerItem] = []
    @State private var filePicker = false
    @State private var previewAttachment: NativeDraftAttachment?
    @State private var confirmAttachmentStart = false
    private var attachmentScope: String { "new-chat:\(store.connection?.hostId ?? "local")" }
    private var attachments: [NativeDraftAttachment] { shared.draftAttachments[attachmentScope] ?? [] }
    private var missingAttachments: [JSON] { missingAttachmentRecords(store: store, draftKey: "new-chat-attachments", items: attachments) }
    private var attachmentMessageID: String { shared.draftMessageIDs[attachmentScope] ?? "" }
    private var attachmentDraftID: String { shared.draftSessionIDs[attachmentScope] ?? "" }
    private var supportedAttachmentTypes: [String] { store.state["attachmentMediaTypes"][provider].array.map(\.string) }
    private var attachmentsEnabled: Bool { store.state["capabilities"].array.contains(.string("chat.attachments.v1")) && !supportedAttachmentTypes.isEmpty }
    private var hasUnsupportedAttachment: Bool { attachments.contains { !supportedAttachmentTypes.contains($0.mediaType) } }
    private var providerName: String { provider == "copilot" ? "GitHub Copilot" : provider == "codex" ? "Codex" : provider == "claude" ? "Claude" : provider }
    var body: some View {
        NavigationStack {
            Form {
                Section("Conversation") { TextField("Chat name (optional)", text: $name).accessibilityIdentifier("new-chat-name"); TextField("What would you like to work on?", text: $prompt, axis: .vertical).lineLimit(4...10).accessibilityIdentifier("chat-prompt") }
                Section("Run on your Mac") {
                    Picker("Workspace", selection: $workspace) { ForEach(store.state["context"]["workspaces"].array, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }
                    Picker("Provider", selection: $provider) { Text("GitHub Copilot").tag("copilot"); Text("Codex").tag("codex"); Text("Claude").tag("claude"); Text("Local rehearsal").tag("rehearsal") }.accessibilityIdentifier("chat-provider")
                    if provider != "rehearsal" {
                        ProviderModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: provider)
                    }
                }
                if attachmentsEnabled || !attachments.isEmpty || !missingAttachments.isEmpty {
                    Section {
                        if attachmentsEnabled {
                            Menu {
                                Button("Paste image or file", systemImage: "doc.on.clipboard") { pasteAttachment() }
                                Button("Choose files", systemImage: "folder") { filePicker = true }
                                PhotosPicker(selection: $pickedPhotos, matching: .images) { Label("Choose photos", systemImage: "photo") }
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
                ContextSelection(selected: $selected, agent: $agent, includeDefaults: $includeDefaults, workspaceID: workspace)
                if let error = store.error { Section { Text(error).foregroundStyle(.orange) } }
            }.scrollDismissesKeyboard(.interactively).disabled(loading || sending).accessibilityIdentifier("new-chat-form").navigationTitle("New chat").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button { if attachments.isEmpty { start() } else { confirmAttachmentStart = true } } label: { if sending { ProgressView() } else { Text("Start chat") } }.disabled(loading || sending || !store.connected || prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || workspace.isEmpty || (provider != "rehearsal" && model.isEmpty) || !missingAttachments.isEmpty || (!attachments.isEmpty && (!attachmentsEnabled || hasUnsupportedAttachment))).accessibilityIdentifier("start-chat") }
            }.onChange(of: draftValue) { _, value in if !loading { store.setDraft("new-chat", value) } }.onChange(of: provider) { old, value in if !loading && old != value { model = ""; effort = ""; contextTier = "default"; serviceTier = "" }; if value != "rehearsal" { Task { await store.loadModels(provider: value) } } }.task { await store.refresh(); workspace = store.state["context"]["defaultWorkspaceId"].string; provider = store.state["defaults"]["provider"].string; model = store.state["defaults"]["model"].string; effort = store.state["defaults"]["reasoningEffort"].string; serviceTier = store.state["defaults"]["serviceTier"].string; contextTier = store.state["defaults"]["contextTier"].string.isEmpty ? "default" : store.state["defaults"]["contextTier"].string; if let saved = store.drafts["new-chat"] { restore(saved) }; if provider != "rehearsal" { await store.loadModels(provider: provider) }; loading = false }
            .onChange(of: pickedPhotos) { _, value in if !value.isEmpty { Task { await importPhotos(value) } } }
            .fileImporter(isPresented: $filePicker, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in if case .success(let urls) = result { for url in urls { if !importFile(url) { break } } } else if case .failure(let error) = result { store.error = error.localizedDescription } }
            .sheet(item: $previewAttachment) { item in AttachmentPreview(attachment: item) { previewAttachment = nil } }
            .sheet(isPresented: $confirmAttachmentStart) { AttachmentSendReview(attachments: attachments, providerName: providerName) { confirmAttachmentStart = false; start() } }
        }
    }
    private var draftValue: JSON { .object(["name": .string(name), "prompt": .string(prompt), "provider": .string(provider), "model": .string(model), "effort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "workspace": .string(workspace), "selected": .array(selected.sorted().map(JSON.string)), "agent": .string(agent), "includeDefaults": .bool(includeDefaults)]) }
    private func restore(_ value: JSON) { name = value["name"].string; prompt = value["prompt"].string; provider = value["provider"].string; model = value["model"].string; effort = value["effort"].string; contextTier = value["contextTier"].string; serviceTier = value["serviceTier"].string; workspace = value["workspace"].string; selected = Set(value["selected"].array.map(\.string)); agent = value["agent"].string; includeDefaults = value["includeDefaults"] != .bool(false) }
    private func start() {
        guard missingAttachments.isEmpty else { store.error = "Remove or reattach the missing files before starting this chat."; return }
        sending = true
        Task { defer { sending = false }
            do {
                var ids = selected; if !agent.isEmpty { ids.insert(agent) }
                var values: [String: JSON] = ["name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines)), "prompt": .string(prompt), "provider": .string(provider), "model": .string(provider != "rehearsal" ? model : ""), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier), "workspaceId": .string(workspace), "selectedIds": .array(ids.sorted().map(JSON.string)), "agentId": .string(agent), "includeDefaults": .bool(includeDefaults)]
                if !attachments.isEmpty {
                    guard attachmentsEnabled else { throw RemoteError(message: "This Mac has not enabled approved attachments.") }
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
            guard !uploadID.isEmpty else { throw RemoteError(message: "The Mac did not create an attachment upload.") }
            let chunkSize = max(1, min(begun["chunkSize"].int, 256 * 1024))
            for (index, offset) in stride(from: 0, to: item.bytes.count, by: chunkSize).enumerated() {
                let chunk = item.bytes.subdata(in: offset..<min(offset + chunkSize, item.bytes.count))
                _ = try await store.request("chat.attachments.chunk", ["uploadId": .string(uploadID), "index": .number(Double(index)), "dataBase64": .string(chunk.base64EncodedString())])
            }
            let finished = try await store.request("chat.attachments.finish", ["uploadId": .string(uploadID)])
            guard !finished["attachmentId"].string.isEmpty else { throw RemoteError(message: "The Mac did not confirm the attachment.") }
            ids.append(finished["attachmentId"])
            claims.append(.object(["attachmentId": finished["attachmentId"], "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)]))
        }
        let consent = try await store.request("chat.attachments.authorize", ["draftId": .string(attachmentDraftID), "providerId": .string(provider), "messageId": .string(attachmentMessageID), "attachments": .array(claims)])
        guard !consent["consentId"].string.isEmpty, consent["providerId"].string == provider else { throw RemoteError(message: "The Mac did not confirm the exact attachment destination.") }
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
    private func importPhotos(_ items: [PhotosPickerItem]) async {
        defer { pickedPhotos = [] }
        for item in items {
            do {
                guard let data = try await item.loadTransferable(type: Data.self), let image = UIImage(data: data), let png = image.pngData() else { throw RemoteError(message: "The photo could not be read.") }
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
            Form { TextField("Chat name", text: $name).textInputAutocapitalization(.sentences).accessibilityIdentifier("rename-chat-name") }
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
struct ChatView: View {
    @EnvironmentObject var store: RemoteStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    let id: String
    var onBack: (() -> Void)? = nil
    @State private var text = ""
    @State private var composerExpanded = false
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
    @State private var pendingInitialRestore: NativeChatScrollLocation?
    @State private var restoreID: UUID?
    @State private var eventFrames: [Int: (start: Int, frame: CGRect)] = [:]
    @State private var scrollTrace: [String] = []
    @State private var userReadingGesture = false
    @State private var loadingEarlier = false
    @State private var earlierError = false
    @State private var model = ""
    @State private var effort = ""
    @State private var contextTier = "default"
    @State private var serviceTier = ""
    @State private var selectedChild = "chat"
    @State private var childTabsClipped = false
    @State private var documents: [ChatDocumentTab] = []
    @State private var documentNotice: String?
    @State private var documentTask: Task<Void, Never>?
    @State private var pickedPhotos: [PhotosPickerItem] = []
    @State private var filePicker = false
    @State private var previewAttachment: NativeDraftAttachment?
    @State private var confirmAttachmentSend = false
    @State private var confirmDelete = false
    @State private var renameChildID: String?
    @State private var renameChildTitle = ""
    @State private var showRename = false
    @FocusState private var composerFocused: Bool
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
    private func routineActivity(_ event: JSON) -> Bool { event["data"]["tool"] != .null || event["data"]["permission"]["automatic"].bool }
    private var visibleEventIndices: [Int] {
        let events = run["events"].array
        let start = run["eventStart"].int
        // Absorbed activity and empty assistant events must not create stack rows:
        // even a zero-height row adds the conversation's inter-message spacing.
        return events.indices.filter { index in
            let event = events[index]
            if routineActivity(event) { return index == 0 || !routineActivity(events[index - 1]) }
            return event["role"].string != "assistant" || !event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }.map { start + $0 }
    }
    private func activityGroup(startingAt index: Int) -> [JSON] {
        let events = run["events"].array
        guard events.indices.contains(index), routineActivity(events[index]) else { return [] }
        var end = index
        while end < events.count && routineActivity(events[end]) { end += 1 }
        return Array(events[index..<end])
    }
    private var pending: JSON { run["pending"] }
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
            if sizeClass != .regular { compactHeader }
            childTabs
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--synthetic-desktop-browser-tabs") {
                Button("Replay desktop tab refresh") { shared.replayDesktopBrowserFixture(scope: chatBrowserScope) }.accessibilityIdentifier("replay-desktop-tabs")
            }
            #endif
            Divider()
            if let documentNotice { HStack { ProgressView().controlSize(.small); Text(documentNotice).font(.caption); Spacer(); Button("Cancel") { documentTask?.cancel(); self.documentNotice = nil } }.padding(8).background(.bar) }
            if selectedChild == "chat" { conversation }
            else if let tab = shared.browserTabs.first(where: { $0.id == selectedChild && $0.scope == chatBrowserScope }) {
                TeamBrowserView(scope: chatBrowserScope, showTabs: false).onAppear { shared.select(tab.id, in: chatBrowserScope) }
            } else if let document = documents.first(where: { $0.id == selectedChild }) {
                ChatDocumentReader(document: document, store: store, runID: id, requestLatest: {
                    if let parentID = document.parentID, let relativePath = document.relativePath {
                        if let parent = documents.first(where: { $0.id == parentID }), !parent.requestID.isEmpty { requestDocument(fromRequestID: parent.requestID, relativePath: relativePath, parentID: parentID) }
                        else { store.error = "Open and approve the parent document first, then request this linked document again." }
                    } else { requestDocument(documentID: document.id) }
                }, openRelativeDocument: { source in
                    guard !document.requestID.isEmpty else { store.error = "Request this document’s current approved version before opening its links."; return }
                    requestDocument(fromRequestID: document.requestID, relativePath: source, parentID: document.id)
                }) { selectedChild = "chat"; shared.selectChatChild("chat", for: chatBrowserScope) }
            } else { conversation.onAppear { selectedChild = "chat" } }
        }.navigationBarBackButtonHidden(true).toolbar(.hidden, for: .navigationBar)
        .task(id: chatBrowserScope) {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--synthetic-desktop-browser-tabs") { shared.replayDesktopBrowserFixture(scope: chatBrowserScope) }
            #endif
            while !Task.isCancelled {
                await shared.refreshContentTabs(scope: chatBrowserScope, remote: store, kind: "chat", id: id)
                try? await Task.sleep(for: .seconds(2))
            }
        }
        .onAppear {
            documents = restoredDocumentTabs()
            let saved = shared.chatSelectedChildren[chatBrowserScope] ?? shared.selected(in: chatBrowserScope) ?? "chat"
            selectedChild = saved == "chat" || shared.tabs(in: chatBrowserScope).contains(where: { $0.id == saved }) || documents.contains(where: { $0.id == saved }) ? saved : "chat"
        }
            .onDisappear { documentTask?.cancel(); documents = [] }
            .onChange(of: shared.documentTabs) { _, _ in
                documents = restoredDocumentTabs()
                if selectedChild != "chat" && !shared.tabs(in: chatBrowserScope).contains(where: { $0.id == selectedChild }) && !documents.contains(where: { $0.id == selectedChild }) { selectedChild = "chat" }
            }
            .onChange(of: pickedPhotos) { _, value in if !value.isEmpty { Task { await importPhotos(value) } } }
            .fileImporter(isPresented: $filePicker, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in if case .success(let urls) = result { for url in urls { if !importFile(url) { break } } } else if case .failure(let error) = result { store.error = error.localizedDescription } }
            .sheet(item: $previewAttachment) { attachment in AttachmentPreview(attachment: attachment) { previewAttachment = nil } }
            .sheet(isPresented: $confirmAttachmentSend) { AttachmentSendReview(attachments: attachments, providerName: providerName) { confirmAttachmentSend = false; Task { await sendAttachments() } } }
            .alert("Rename tab", isPresented: Binding(get: { renameChildID != nil }, set: { if !$0 { renameChildID = nil } })) {
                TextField("Tab name", text: $renameChildTitle)
                Button("Save") { if let childID = renameChildID { if shared.tabs(in: chatBrowserScope).contains(where: { $0.id == childID }) { shared.renameBrowser(childID, title: renameChildTitle) } else { shared.renameDocument(childID, title: renameChildTitle, in: chatBrowserScope) } }; renameChildID = nil }
                Button("Cancel", role: .cancel) { renameChildID = nil }
            }
            .sheet(isPresented: $showRename) { NativeChatRenameView(run: run).environmentObject(store) }
            .confirmationDialog("Delete this chat?", isPresented: $confirmDelete) {
                Button("Delete chat", role: .destructive) { Task { await deleteChat() } }
                Button("Cancel", role: .cancel) {}
            } message: { Text("Only the Proteus chat record will be removed. Generated files and the provider’s original chat remain.") }
            .alert("Proteus", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("OK") { store.error = nil } } message: { Text(store.error ?? "") }

            .onChange(of: text) { _, value in store.setDraft("reply:" + id, value.isEmpty ? .null : .string(value)) }
            .task(id: id) {
                text = store.draft("reply:" + id).string
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
            return ChatDocumentTab(id: descriptor.id, title: descriptor.title, version: session?.version ?? existing?.version ?? "", content: shared.content(for: descriptor.id, in: chatBrowserScope) ?? existing?.content, mediaType: descriptor.mediaType, readAt: session?.readAt ?? existing?.readAt ?? "", requestID: session?.requestID ?? existing?.requestID ?? "", assets: session?.assets ?? existing?.assets ?? [], links: session?.links ?? existing?.links ?? [], assetDataURLs: session?.assetDataURLs ?? existing?.assetDataURLs ?? [:], parentID: descriptor.parentID, relativePath: descriptor.relativePath)
        }
    }
    private var compactHeader: some View {
        HStack(spacing: 4) {
            Button { if let onBack { onBack() } else { dismiss() } } label: { Image(systemName: "chevron.left").font(.system(size: 19, weight: .medium)).frame(width: 44, height: 44).contentShape(Rectangle()) }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Back to Chats").accessibilityIdentifier("chat-back")
            Text(run["title"].string.isEmpty ? "Conversation" : run["title"].string).font(.subheadline.weight(.medium)).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading).accessibilityIdentifier("chat-header-title")
            Menu {
                if store.state["capabilities"].array.contains(.string("chat.rename.v1")) { Button("Rename", systemImage: "pencil") { showRename = true } }
                if lifecycleEnabled {
                    Button(run["archived"].bool ? "Unarchive chat" : "Archive chat", systemImage: "archivebox") { Task { await archiveChat() } }.disabled(chatHasPendingWork(run))
                    Button("Delete chat", systemImage: "trash", role: .destructive) { confirmDelete = true }.disabled(chatHasPendingWork(run))
                }
            } label: { Image(systemName: "ellipsis.circle").font(.system(size: 22)).frame(width: 44, height: 44).contentShape(Rectangle()) }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Chat actions").accessibilityIdentifier("chat-actions")
        }.buttonStyle(.plain).padding(.horizontal, 4).frame(height: 44).background(.bar)
    }
    private var childTabs: some View {
        HStack(spacing: 0) { NativeTabStrip(ids: shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)), selection: selectedChild) { HStack(spacing: 0) {
            Button { selectedChild = "chat"; shared.selectChatChild("chat", for: chatBrowserScope) } label: { Label("Chat", systemImage: "bubble.left.and.bubble.right") }.accessibilityIdentifier("chat-conversation-tab")
                .lineLimit(1).padding(.horizontal, 12).frame(minHeight: 44)
                .overlay(alignment: .bottom) { Rectangle().fill(selectedChild == "chat" ? NativeTheme.accent : .clear).frame(height: 2) }
                .contextMenu { if store.state["capabilities"].array.contains(.string("chat.rename.v1")) { Button("Rename", systemImage: "pencil") { showRename = true } } }
            Divider().frame(height: 24)
            ForEach(shared.orderedChatChildren(in: chatBrowserScope, documentIDs: documents.map(\.id)), id: \.self) { childID in
                HStack {
                    if let tab = shared.tabs(in: chatBrowserScope).first(where: { $0.id == childID }) {
                        Button(tab.title) { shared.select(tab.id, in: chatBrowserScope); selectedChild = tab.id; shared.selectChatChild(tab.id, for: chatBrowserScope) }.lineLimit(1)
                            .accessibilityIdentifier("chat-browser-tab-" + (tab.contentTabId ?? tab.id))
                            .accessibilityValue(selectedChild == tab.id ? "Active" : "Inactive")
                        Button { closeChild(tab.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + tab.title)
                    } else if let document = documents.first(where: { $0.id == childID }) {
                        Button(document.title) { selectedChild = document.id; shared.selectChatChild(document.id, for: chatBrowserScope) }.lineLimit(1)
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
            Menu {
                Button("Browser", systemImage: "globe") { shared.open(nil, scope: chatBrowserScope); selectedChild = shared.selected(in: chatBrowserScope) ?? "chat"; shared.selectChatChild(selectedChild, for: chatBrowserScope) }
                Button("Terminal · Mac only", systemImage: "terminal") {}.disabled(true)
                Button("File · grant required", systemImage: "doc") {}.disabled(true)
            } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add chat tab")
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--show-scroll-fixture-controls") {
                Text(String(Int(conversationOffset))).font(.caption2.monospacedDigit()).frame(width: 54).accessibilityIdentifier("chat-scroll-offset")
                Text(String(visibleAnchor?.anchor ?? -1) + ":" + String(Int(visibleAnchor?.inset ?? 0)))
                    .font(.caption2.monospacedDigit()).frame(width: 72).accessibilityIdentifier("chat-scroll-anchor")
                Button("Read long message") {
                    followLatest = false
                    composerFocused = false; composerExpanded = false
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
                HStack { if run["status"].string == "running" { ProgressView() }; Text(statusLabel(run["status"].string)).font(.subheadline).foregroundStyle(.secondary); Spacer() }
                if !store.connected { Label("Offline · cached history", systemImage: "icloud.slash").font(.caption).foregroundStyle(.secondary) }
                if run["earlier"].int > 0 {
                    HStack { if loadingEarlier { ProgressView().controlSize(.small) }; Button(earlierError ? "Retry earlier messages" : "Load earlier messages") { loadEarlier() }.disabled(loadingEarlier || !store.connected).accessibilityIdentifier("load-earlier-messages") }.font(.subheadline)
                }
                ForEach(visibleEventIndices, id: \.self) { absoluteIndex in
                    let index = absoluteIndex - run["eventStart"].int
                    let event = run["events"].array[index]
                    VStack(alignment: .leading, spacing: 0) {
                        if routineActivity(event) {
                            ChatActivityGroupView(events: activityGroup(startingAt: index), hostName: store.state["hostName"].string)
                        } else if event["role"].string != "assistant" || !event["text"].string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            if !event["data"]["delivery"]["state"].string.isEmpty { Text(event["data"]["delivery"]["state"].string.capitalized).font(.caption2).foregroundStyle(.teal) }
                            MessageView(role: event["role"].string == "assistant" ? assistantName(event) : event["role"].string, text: event["text"].string, runID: id, timestamp: event["timestamp"].string.isEmpty ? event["at"].string : event["timestamp"].string, turn: event["role"].string == "assistant" ? messageTurn(at: index) : .null, actionID: MessageActions.eligible(event) ? "\(store.connection?.hostId ?? "local"):\(id):\(absoluteIndex):\(event["at"].string)" : nil, sentAttachments: event["data"]["attachments"].array, onDocumentLink: event["role"].string == "assistant" ? { source in openDocument(source) } : nil, onResize: { Task { @MainActor in await Task.yield(); if followLatest && !userReadingGesture && !restoringConversation { proxy.scrollTo("chat-end", anchor: .bottom) } } })
                        }
                    }.id(absoluteIndex)
                        .accessibilityElement(children: .contain)
                        .accessibilityIdentifier("chat-event-\(absoluteIndex)")
                        .onGeometryChange(for: CGRect.self) { geometry in geometry.frame(in: .global) } action: { frame in
                            if let prior = eventFrames[absoluteIndex], prior.start == run["eventStart"].int,
                               abs(prior.frame.minY - frame.minY) < 1,
                               abs(prior.frame.height - frame.height) < 1 { return }
                            eventFrames[absoluteIndex] = (run["eventStart"].int, frame)
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
                            Text("Approve once applies only to this request on this Mac. Saved workspace choices survive restart and affect matching chats and schedules until revoked.").font(.caption).foregroundStyle(.secondary)
                            HStack { Button("Deny", role: .destructive) { answer("deny") }; Button("Approve once") { answer("approve") }.buttonStyle(.borderedProminent) }
                            ForEach(pending["permissionChoices"].array, id: \.self) { choice in Button(choice["label"].string) { answer(choice["value"].string) } }
                        }
                    }.padding().background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 16)).disabled(busy || !store.connected)
                }
                DisclosureGroup("Chat details & loaded context") {
                    VStack(alignment: .leading, spacing: 8) {
                        RuntimeTimerView(turns:run["turns"].array,total:true,partial:run["timingPartial"].bool)
                        if lifecycleEnabled {
                            HStack {
                                Button(run["archived"].bool ? "Unarchive chat" : "Archive chat") { Task { await archiveChat() } }.disabled(chatHasPendingWork(run))
                                Button("Delete chat", role: .destructive) { confirmDelete = true }.disabled(chatHasPendingWork(run))
                            }
                        }
                        Text(run["schedule"]["workspace"]["cwd"].string).font(.caption.monospaced()).textSelection(.enabled)
                        Text("Model: \(run["schedule"]["model"].string)").font(.caption)
                        Text("Thinking effort: \(run["schedule"]["reasoningEffort"].string.isEmpty ? "Provider default" : run["schedule"]["reasoningEffort"].string) · Context: \(run["schedule"]["contextTier"].string.isEmpty ? "default" : run["schedule"]["contextTier"].string)").font(.caption)
                        Text("Speed: \(run["schedule"]["serviceTier"].string.isEmpty ? "Provider default" : run["schedule"]["serviceTier"].string)").font(.caption)
                        if !run["providerSessionId"].string.isEmpty { Text("Provider session: \(run["providerSessionId"].string)").font(.caption.monospaced()).textSelection(.enabled) }
                        if run["usage"] != .null { DisclosureGroup("Usage reported by provider") { Text(run["usage"].pretty).font(.caption.monospaced()).textSelection(.enabled) } }
                        if !run["modelHistory"].array.isEmpty { DisclosureGroup("Model history") { ForEach(run["modelHistory"].array, id: \.self) { change in Text(change["model"].string + (change["at"].string.isEmpty ? "" : " · " + change["at"].string)).font(.caption) } } }
                        if run["contextUsage"]["modelContextWindow"].int > 0 { Text("Runtime context window: \(modelTokenSize(run["contextUsage"]["modelContextWindow"])) tokens").font(.caption) }
                        ChatPermissionsView(run: run)
                        if mcpControlsAvailable { DisclosureGroup("MCP connections") { MCPConnectionsView(runID: id, loginAvailable: mcpLoginAvailable) } }
                        if !run["nativeSessionPath"].string.isEmpty { Text(run["nativeSessionPath"].string).font(.caption.monospaced()).textSelection(.enabled) }
                        ForEach(run["context"]["entries"].array, id: \.self) { entry in Text("\(entry["kind"].string): \(entry["name"].string)").font(.caption) }
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                Color.clear.frame(height: 1).id("chat-end")
            }.padding().background(NativeScrollProbe(command: scrollCommand, onSnapshot: { snapshot in
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
                if !restoringConversation && !userReadingGesture && snapshot.canScroll && (conversationOffset > 30 || previousOffset > 30) { followLatest = snapshot.atEnd }
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
                if !followLatest && !userReadingGesture && !restoringConversation && !earlierError,
                   snapshot.offset < 180, run["earlier"].int > 0 { loadEarlier() }
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
                restoringConversation = false
                followLatest = snapshot.atEnd
            }).frame(width: 1, height: 1).opacity(0))
        }.coordinateSpace(name: "conversation-scroll").scrollDismissesKeyboard(.interactively).accessibilityIdentifier("chat-conversation-scroll")
            .simultaneousGesture(TapGesture().onEnded { composerFocused = false; composerExpanded = false })
            .simultaneousGesture(DragGesture(minimumDistance: 4).onChanged { _ in
                composerFocused = false; composerExpanded = false
                if !userReadingGesture {
                    composerFocused = false; composerExpanded = false
                    composerFocused = false; composerExpanded = false; userReadingGesture = true; followLatest = false
                    restoreID = nil; pendingAnchorRestore = nil; scrollCommand = nil; restoringConversation = false
                }
            }.onEnded { _ in userReadingGesture = false })
            .onAppear {
                if let location = shared.chatScrollLocations[chatBrowserScope] {
                    followLatest = false
                    pendingInitialRestore = location
                }
            }
            .onChange(of: run["events"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
            .onChange(of: run["eventStart"]) { _, _ in
                if let reading = pendingHistoryRestore { pendingHistoryRestore = nil; restoreConversation(reading, with: proxy) }
                else if !followLatest, let reading = shared.chatScrollLocations[chatBrowserScope] { restoreConversation(reading, with: proxy) }
            }
            .onChange(of: run["liveMessages"]) { _, _ in if followLatest { proxy.scrollTo("chat-end", anchor: .bottom) } }
        }
            .safeAreaInset(edge: .bottom) { if nativeRun { VStack { Text("Native Omi processing · outcomes are recorded by the worker.").font(.caption); if active { Button("Stop process", role: .destructive) { act("chat.cancel", [:]) } } }.padding().background(.bar) } else { composer } }
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
        if location.eventStart == run["eventStart"].int && sameLayout {
            scrollCommand = NativeScrollCommand(id: transaction, y: location.offset, minimumContentHeight: location.contentHeight)
            traceScroll("raw restore \(Int(location.offset)) minH\(Int(location.contentHeight))")
        } else if let anchor = location.anchor, anchor >= run["eventStart"].int, anchor < run["eventStart"].int + run["events"].array.count {
            if let measured = eventFrames[anchor], measured.start == run["eventStart"].int, measured.frame.height > 0 {
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
    private var composer: some View {
        VStack(spacing: 8) {
            if composerExpanded {
            ConnectionStatus()
            ForEach(run["queuedMessages"].array, id: \.self) { message in
                HStack { Text(message["prompt"].string).lineLimit(1).font(.caption); Spacer(); Button("Remove") { act("chat.remove-queued", ["messageId":message["id"]]) }.font(.caption) }
            }
            VStack(alignment: .leading, spacing: 8) {
                if !attachments.isEmpty || !missingAttachments.isEmpty {
                    ScrollView(.horizontal) { HStack(spacing: 8) { ForEach(attachments) { item in
                        HStack(spacing: 5) {
                            Button { previewAttachment = item } label: { if let image = item.image { Image(uiImage: image).resizable().scaledToFill().frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 6)) } else { Label(item.name, systemImage: "doc").lineLimit(1) } }.accessibilityLabel("Preview " + item.name)
                            Button { removeAttachment(item.id) } label: { Image(systemName: "xmark.circle.fill") }.accessibilityLabel("Remove " + item.name).disabled(busy)
                        }.padding(5).background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                    } } }.scrollIndicators(.hidden)
                    Text("Attachments are kept on this device until sent. Closing the app discards unsent selections.").font(.caption2).foregroundStyle(.secondary)
                    if !missingAttachments.isEmpty {
                        Text("Reattach before sending: " + missingAttachments.map { $0["name"].string }.joined(separator: ", ") + ". The selected file bytes were discarded when Proteus closed.").font(.caption).foregroundStyle(.orange)
                        Button("Remove missing files") { removeMissingAttachments() }.font(.caption).disabled(busy)
                    }
                }
                TextField(pending["type"].string == "question" ? "Add your feedback…" : active ? "Add an update while this runs…" : "Continue this conversation…", text: $text, axis: .vertical)
                    .lineLimit(3...8).padding(.horizontal, 10).padding(.vertical, 12)
                    .frame(minHeight: 88, alignment: .topLeading)
                    .contentShape(Rectangle()).onTapGesture { composerFocused = true }
                    .accessibilityIdentifier("reply-text").focused($composerFocused)
                HStack(spacing: 12) {
                    if attachmentsEnabled {
                        Menu {
                            Button("Paste image or file", systemImage: "doc.on.clipboard") { pasteAttachment() }
                            Button("Choose files", systemImage: "folder") { filePicker = true }
                            PhotosPicker(selection: $pickedPhotos, matching: .images) { Label("Choose photos", systemImage: "photo") }
                        } label: { Image(systemName: "plus").frame(minWidth: 30, minHeight: 30) }
                            .accessibilityLabel("Attach files")
                            .accessibilityIdentifier("chat-attach")
                            .disabled(busy)
                    }
                    if run["schedule"]["provider"].string != "rehearsal" {
                        ComposerModelPicker(model: $model, effort: $effort, contextTier: $contextTier, serviceTier: $serviceTier, provider: run["schedule"]["provider"].string)
                            .frame(maxWidth: sizeClass == .compact ? 140 : 280, alignment: .leading)
                            .lineLimit(1).minimumScaleFactor(0.8).layoutPriority(-1)
                    }
                    Spacer(minLength: 0)
                    if pending["type"].string == "question" { Button("Send feedback") { answer(text) }.disabled(cannotSend) }
                    if active {
                        Button("Steer") { send("steer") }.disabled(cannotSend || run["status"].string != "running" || !attachments.isEmpty).accessibilityIdentifier("steer-message")
                    }
                    Button(active ? "Queue" : "Send") { send("queue") }.buttonStyle(.plain)
                        .font(.subheadline.weight(.semibold)).padding(.horizontal, 14).frame(minHeight: 44)
                        .background(cannotSend ? Color(white: 0.25) : NativeTheme.accent, in: RoundedRectangle(cornerRadius: 8))
                        .foregroundStyle(cannotSend ? Color(white: 0.82) : Color(red: 0.08, green: 0.16, blue: 0.07))
                        .disabled(cannotSend || (!attachments.isEmpty && !attachmentsEnabled)).accessibilityLabel(active ? "Queue message" : "Send message").accessibilityIdentifier("send-message")
                    if ["running", "awaiting_input"].contains(run["status"].string) {
                        stopButton
                    }
                }.font(.subheadline)
            }.padding(12).background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
            } else {
                HStack(spacing: 8) {
                    Button { composerExpanded = true; composerFocused = true } label: {
                        Text(text.isEmpty ? "Continue this conversation…" : text.replacingOccurrences(of: "\n", with: " ")).lineLimit(1).truncationMode(.tail).font(.subheadline).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).padding(.horizontal, 12).background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                    }.buttonStyle(.plain).accessibilityLabel("Expand message composer").accessibilityValue(text).accessibilityIdentifier("composer-preview")
                    if ["running", "awaiting_input"].contains(run["status"].string) { stopButton }
                }
            }
        }.padding(.horizontal).padding(.vertical, 8).background(.bar)
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
                guard !uploadID.isEmpty else { throw RemoteError(message: "The Mac did not create an attachment upload.") }
                for (index, offset) in stride(from: 0, to: item.bytes.count, by: chunkSize).enumerated() {
                    let end = min(offset + chunkSize, item.bytes.count)
                    let chunk = item.bytes.subdata(in: offset..<end)
                    _ = try await store.request("chat.attachments.chunk", ["uploadId": .string(uploadID), "index": .number(Double(index)), "dataBase64": .string(chunk.base64EncodedString())])
                }
                let finished = try await store.request("chat.attachments.finish", ["uploadId": .string(uploadID)])
                guard !finished["attachmentId"].string.isEmpty else { throw RemoteError(message: "The Mac did not confirm the attachment.") }
                attachmentIDs.append(finished["attachmentId"])
                attachmentClaims.append(.object(["attachmentId": finished["attachmentId"], "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)]))
            }
            let consent = try await store.request("chat.attachments.authorize", ["id": .string(id), "providerId": .string(providerID), "messageId": .string(messageID), "attachments": .array(attachmentClaims)])
            guard !consent["consentId"].string.isEmpty, consent["providerId"].string == providerID else { throw RemoteError(message: "The Mac did not confirm the exact attachment destination.") }
            var values: [String: JSON] = ["id": .string(id), "prompt": .string(submittedPrompt), "mode": .string("queue"), "messageId": .string(messageID), "providerId": .string(providerID), "attachments": .array(attachmentIDs), "consentId": consent["consentId"]]
            if run["schedule"]["provider"].string != "rehearsal" {
                values["modelOptions"] = .object(["model": .string(model), "reasoningEffort": .string(effort), "contextTier": .string(contextTier), "serviceTier": .string(serviceTier)])
            }
            _ = try await store.request("chat.send", values)
            shared.draftAttachments[key] = []
            shared.draftMessageIDs[key] = nil
            store.setDraft(attachmentDraftKey, .null)
            text = ""; composerFocused = false; followLatest = true
            await store.openChat(id)
        } catch { store.error = "Attachment was not sent: " + error.localizedDescription }
    }
    @discardableResult private func addAttachment(_ data: Data, name: String, mediaType: String) -> Bool {
        guard !busy else { return false }
        guard attachmentsEnabled else { store.error = "This Mac has not enabled approved attachments for this provider yet."; return false }
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
    private func importPhotos(_ items: [PhotosPickerItem]) async {
        defer { pickedPhotos = [] }
        for item in items {
            do {
                guard let data = try await item.loadTransferable(type: Data.self), let image = UIImage(data: data), let png = image.pngData() else { throw RemoteError(message: "The photo could not be read.") }
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
        busy = true
        Task { defer { busy = false }; do { var args = values; args["id"] = .string(id); _ = try await store.request(method, args); if method != "chat.remove-queued" && method != "chat.cancel" { text = ""; composerFocused = false; followLatest = true }; await store.openChat(id) } catch { store.error = error.localizedDescription } }
    }
    private func loadEarlier() {
        guard !loadingEarlier, run["earlier"].int > 0, store.connected else { return }
        loadingEarlier = true; earlierError = false; followLatest = false
        let oldFirst = run["eventStart"].int
        let offset = run["eventCount"].int - oldFirst
        let reading = shared.chatScrollLocations[chatBrowserScope] ?? NativeChatScrollLocation(anchor: oldFirst, inset: 0, offset: conversationOffset)
        shared.chatScrollLocations[chatBrowserScope] = reading
        pendingHistoryRestore = reading
        Task { defer { loadingEarlier = false }
            do { let value = try await store.request("chat.get", ["id": .string(id), "offset": .number(Double(offset)), "beforeEvent": .number(Double(oldFirst))]); store.mergeChat(value) }
            catch { earlierError = true; store.error = error.localizedDescription }
        }
    }
    private func openDocument(_ source: String) { requestDocument(source: source) }
    private func requestDocument(source: String? = nil, documentID: String? = nil, fromRequestID: String? = nil, relativePath: String? = nil, parentID: String? = nil) {
        guard documentNotice == nil else { return }
        guard store.connected else { store.error = "Connect to this chat’s Mac to request the document. Already opened documents remain available for this session."; return }
        guard store.state["capabilities"].array.contains(.string("chat.documents.v1")) else { store.error = "This Mac does not support approved document viewing yet."; return }
        documentNotice = "Waiting for this Mac to approve document access…"
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
                guard !requestID.isEmpty, !stableID.isEmpty, documentID == nil || stableID == documentID else { throw RemoteError(message: "The Mac did not return a matching document request.") }
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
                guard assets.count <= 8 else { throw RemoteError(message: "The Mac returned too many approved document images.") }
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
                    else { MarkdownView(text: content, runID: runID, store: store, height: $height, onDocumentLink: openRelativeDocument, documentAssetURLs: document.assetDataURLs).frame(height: max(height, 1)) }
                    if !document.links.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Linked documents").font(.headline)
                            ForEach(document.links, id: \.self) { link in
                                Button(link["title"].string.isEmpty ? link["source"].string : link["title"].string) { openRelativeDocument(link["source"].string) }
                                    .disabled(document.requestID.isEmpty || !store.connected)
                            }
                            Text("Each linked document needs its own approval on the Mac.").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                } else {
                    ContentUnavailableView("Document unloaded", systemImage: "doc.text", description: Text("This tab was restored without a saved document copy. Request current-version access from the Mac again."))
                    Button("Request current version", action: requestLatest).buttonStyle(.borderedProminent).disabled(!store.connected)
                    Button("Return to chat", action: showChat)
                }
            }.padding().background(NativeScrollProbe(command: scrollCommand, onSnapshot: { snapshot in
                if !restoringOffset, snapshot.offset.isFinite, snapshot.canScroll { shared.documentScrollOffsets[scrollKey] = max(0, snapshot.offset) }
            }, onApplied: { commandID, _ in
                if scrollCommand?.id == commandID { restoringOffset = false }
            }).frame(width: 1, height: 1).opacity(0))
        }.navigationTitle(document.title)
            .onAppear {
                guard let offset = shared.documentScrollOffsets[scrollKey] else { restoringOffset = false; return }
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
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label(interactive ? "Interactive preview" : "Static preview · scripts off", systemImage: interactive ? "play.rectangle" : "hand.raised")
                    .font(.caption.bold())
                Spacer()
                if interactive { Button("Stop scripts", systemImage: "stop.fill") { interactive = false; contextID = UUID() }.buttonStyle(.bordered) }
                else { Button("Enable interactive preview", systemImage: "play.fill") { interactive = true; contextID = UUID() }.buttonStyle(.bordered) }
            }
            Text(interactive ? "Browser JavaScript is enabled for \(title), version \(version), from \(hostName.isEmpty ? "this Mac" : hostName), in this preview session only. Network, files and Proteus actions stay blocked." : "This preview is isolated. If the document needs browser JavaScript, enable it for this version and session.")
                .font(.caption).foregroundStyle(.secondary)
            if let previewError { Text(previewError).font(.caption).foregroundStyle(.orange) }
            IsolatedArtifactWebView(content: htmlWithApprovedAssets(content, assetDataURLs: assetDataURLs), scriptsEnabled: interactive, error: $previewError)
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
        web.allowsLinkPreview = false; web.scrollView.isScrollEnabled = true
        let rule = #"[{"trigger":{"url-filter":"^(https?|wss?)://"},"action":{"type":"block"}}]"#
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "proteus-isolated-artifact-network-v1", encodedContentRuleList: rule) { [weak web, weak coordinator = context.coordinator] list, failure in
            Task { @MainActor in
                guard let web, let coordinator, web.navigationDelegate === coordinator else { return }
                guard let list else { coordinator.parent.error = "Preview isolation could not be prepared: \(failure?.localizedDescription ?? "network blocker unavailable")."; return }
                web.configuration.userContentController.add(list)
                web.loadHTMLString(Self.shell(coordinator.parent.content), baseURL: nil)
            }
        }
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) { web.stopLoading(); web.navigationDelegate = nil; web.uiDelegate = nil; web.loadHTMLString("", baseURL: nil) }
    static func shell(_ content: String) -> String {
        let policy = "default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; connect-src 'none'; frame-src 'none'; img-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' blob:"
        let source = "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"\(policy)\"></head><body>\(content)</body></html>"
        let escaped = source.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
        return "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; frame-src about:; style-src 'unsafe-inline';\"><style>html,body{margin:0;height:100%;background:#fff}iframe{width:100%;height:100%;border:0}</style></head><body><iframe sandbox=\"allow-scripts\" referrerpolicy=\"no-referrer\" srcdoc=\"\(escaped)\"></iframe></body></html>"
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
            if target?.isMainFrame == false && !allowedFrame && (address == "about:srcdoc" || address == "about:blank") { allowedFrame = true; decisionHandler(.allow); return }
            decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) { decisionHandler(navigationResponse.response.url?.scheme == "about" ? .allow : .cancel) }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { nil }
    }
}
struct ChatActivityGroupView: View {
    let events: [JSON]
    let hostName: String
    @State private var expanded = false
    private var tools: [JSON] { events.map { $0["data"]["tool"] }.filter { $0 != .null } }
    private var failed: Bool { tools.contains(where: toolActivityFailed) }
    private var running: Bool { tools.contains { $0["status"].string == "running" } }
    private var summary: String {
        var parts = ["\(tools.count) tool\(tools.count == 1 ? "" : "s")"]
        let approvals = events.filter { $0["data"]["permission"]["automatic"].bool }.count
        if approvals > 0 { parts.append("\(approvals) automatic approval\(approvals == 1 ? "" : "s")") }
        let failures = tools.filter(toolActivityFailed).count
        if failures > 0 { parts.append("\(failures) failed") }
        let activeTools = tools.filter { $0["status"].string == "running" }.count
        if activeTools > 0 { parts.append("\(activeTools) running") }
        return parts.joined(separator: " · ")
    }
    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            VStack(alignment: .leading, spacing: 8) {
                if !hostName.isEmpty { Text("On \(hostName)").font(.caption).foregroundStyle(.secondary) }
                ForEach(Array(events.enumerated()), id: \.offset) { _, event in
                    if event["data"]["tool"] != .null { ToolActivityView(tool: event["data"]["tool"]) }
                    else { Label("Automatically approved" + (event["data"]["permission"]["reason"].string.isEmpty ? "" : " · " + event["data"]["permission"]["reason"].string), systemImage: "checkmark.shield").font(.caption).foregroundStyle(.secondary) }
                }
            }.padding(.top, 8)
        } label: {
            HStack { if running { ProgressView().controlSize(.small) } else { Image(systemName: failed ? "exclamationmark.triangle.fill" : "checkmark.circle").foregroundStyle(failed ? .orange : .teal) }; Text("Activity · " + summary).font(.subheadline); Spacer(); RuntimeTimerView(tools:tools) }
        }.padding(12).background(failed ? Color.orange.opacity(0.12) : Color.green.opacity(0.09), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(failed ? Color.orange.opacity(0.6) : Color.teal.opacity(0.25)))
            .onAppear { if running || failed { expanded = true } }
    }
}
struct MessageView: View {
    @EnvironmentObject var store: RemoteStore
    @Environment(\.timeZone) private var timeZone
    @State private var height: CGFloat = 0
    let role: String
    let text: String
    let runID: String
    var timestamp: String = ""
    var turn: JSON = .null
    var actionID: String? = nil
    var sentAttachments: [JSON] = []
    var onDocumentLink: ((String) -> Void)? = nil
    var onResize: () -> Void = {}
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text(role.uppercased()).font(.caption2.weight(.bold)); Spacer(); if role != "user" && turn != .null { RuntimeTimerView(turns:[turn]) }; if let date = ProviderAllowance.date(timestamp) { Text(nativeTimestamp(date, timezone: timeZone.identifier)).font(.caption2).accessibilityIdentifier("message-timestamp") } }.foregroundStyle(.secondary)
            ZStack(alignment: .topLeading) {
                if height == 0 { Text(text).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }
                MarkdownView(text: text, runID: runID, store: store, height: $height, onDocumentLink: onDocumentLink, onResize: onResize).frame(height: max(height, 1)).opacity(height > 0 ? 1 : 0)
            }.frame(maxWidth: .infinity, alignment: .leading)
            ForEach(sentAttachments, id: \.self) { item in
                Label(item["name"].string + " · " + ByteCountFormatter.string(fromByteCount: Int64(item["size"].int), countStyle: .file), systemImage: item["mediaType"].string.hasPrefix("image/") ? "photo" : "doc")
                    .font(.caption).padding(6).background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 6))
            }
            if let actionID { MessageActionBar(messageID: actionID, markdown: text) }
        }.padding().background(role == "user" ? Color.accentColor.opacity(0.13) : Color.secondary.opacity(0.09), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct AttachmentSendReview: View {
    @Environment(\.dismiss) private var dismiss
    let attachments: [NativeDraftAttachment]
    let providerName: String
    let send: () -> Void
    var body: some View {
        NavigationStack {
            List {
                Section { Text("Send these selected files to \(providerName) on your Mac?").font(.subheadline) }
                Section("Selected files") {
                    ForEach(attachments) { item in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.name).lineLimit(2)
                            Text(ByteCountFormatter.string(fromByteCount: Int64(item.bytes.count), countStyle: .file)).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }.navigationTitle("Review attachments").navigationBarTitleDisplayMode(.inline)
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
            }.navigationTitle(attachment.name).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button { close(); dismiss() } label: { Image(systemName: "xmark") }.accessibilityLabel("Close preview").keyboardShortcut(.cancelAction) } }
        }
    }
}

func nativeTimestamp(_ date: Date, timezone: String = "") -> String {
    let formatter = DateFormatter(); formatter.dateFormat = "MMM d, h:mm a z"; formatter.timeZone = TimeZone(identifier: timezone) ?? .current
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

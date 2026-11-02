import SwiftUI
import UniformTypeIdentifiers
import CryptoKit
import UIKit
import PhotosUI

struct NativeUserQuestionCard: View {
    @Environment(RemoteStore.self) private var store
    @EnvironmentObject private var shared: SharedAppStore
    let question: NativeUserQuestion
    var showHeading = true
    var chatID: String
    let submit: (String, String, [String: JSON]) async throws -> Void
    @State private var answer = ""
    @State private var busy = false
    @State private var error: String?
    @State private var picking = false
    @State private var photos = false
    @State private var confirm = false
    @State private var submitted = ""
    private var key: String { "question:" + (store.connection?.hostId ?? "") + ":" + chatID + ":" + question.id }
    private var run: JSON { store.chats[chatID] ?? .null }
    private var provider: String { run["schedule"]["provider"].string }
    private var types: [String] { store.state["questionAttachmentMediaTypes"][provider].array.map(\.string) }
    private var missingFiles: [JSON] { missingAttachmentRecords(store: store, draftKey: key + "-attachments", items: files) }
    private var files: [NativeDraftAttachment] { shared.draftAttachments[key] ?? [] }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if question.blocking && question.status == "pending" { Label("Your input is needed", systemImage: "person.crop.circle.badge.questionmark").font(.headline) }
            if question.queueCleared && question.status == "pending" { Text("Cleared from queue · You can still answer here.").font(.caption).foregroundStyle(.secondary) }
            if showHeading { Text(question.text).font(.subheadline.weight(.semibold)) }
            if question.status == "pending" {
                ForEach(question.choices, id: \.self) { choice in Button { send(choice) } label: { VStack(alignment: .leading, spacing: 3) { Text(choice); if let description = question.choiceDescriptions[choice] { Text(description).font(.caption).foregroundStyle(.secondary) } } }.buttonStyle(.bordered).disabled(busy) }
                TextField("Your answer", text: $answer, axis: .vertical).textFieldStyle(.roundedBorder).lineLimit(2...6).modifier(ChatReturnKey(text: $answer, submit: { send(answer) })).disabled(busy).accessibilityIdentifier("question-answer-" + question.id)
                ForEach(files) { file in HStack { Text(file.name).font(.caption); Spacer(); Button("Remove", systemImage: "xmark") { shared.draftAttachments[key]?.removeAll { $0.id == file.id }; removeAttachmentRecord(store: store, draftKey: key + "-attachments", id: file.id) }.disabled(busy) } }
                ForEach(missingFiles, id: \.self) { file in
                    HStack { Text("Reattach " + file["name"].string + " before sending").font(.caption).foregroundStyle(.orange); Spacer(); Button("Remove missing file") { removeAttachmentRecord(store: store, draftKey: key + "-attachments", id: file["id"].string) } }
                }
                HStack {
                    if !types.isEmpty {
                        Menu {
                            Button("Choose files", systemImage: "folder") { picking = true }
                            Button("Choose photos", systemImage: "photo") { photos = true }
                            Button("Paste image or file", systemImage: "doc.on.clipboard") { paste() }
                        } label: { Image(systemName: "plus").frame(width: 44, height: 44) }.accessibilityLabel("Attach files to answer").disabled(busy)
                    }
                    Spacer()
                    if !question.queueCleared && store.state["capabilities"].array.contains(.string("chat.questions.clear.v1")) {
                        Button("Clear from queue") {
                            Task { busy = true; defer { busy = false }; do { _ = try await store.request("chat.clear-question", ["id": .string(chatID), "questionId": .string(question.id)]); await store.openChat(chatID) } catch { self.error = error.localizedDescription } }
                        }.disabled(busy || store.draft(key)["attempt"] != .null).accessibilityIdentifier("question-clear-" + question.id)
                    }
                    Button("Send answer") { send(answer) }.disabled(busy || !missingFiles.isEmpty || answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && files.isEmpty)
                }
                if busy { ProgressView().controlSize(.small) }
            } else { Text(question.status == "uncertain" ? "Answer delivery unconfirmed. Inspect this session before sending another answer." : question.answer.isEmpty ? question.status.capitalized : "Answered: " + question.answer + (question.deliveryState == "queued" ? " · queued for the next turn" : "")).font(.caption).foregroundStyle(.secondary) }
            if let error { Text(error).font(.caption).foregroundStyle(.orange) }
        }.padding(.vertical, 12)
        .onAppear {
            answer = store.draft(key)["answer"].string
            if question.blocking {
                if answer.isEmpty { answer = store.draft("answer:" + chatID + ":" + question.id).string }
                let oldScope = "chat:" + (store.connection?.hostId ?? "local") + ":" + chatID + ":" + question.id
                if shared.draftAttachments[key] == nil { shared.draftAttachments[key] = shared.draftAttachments[oldScope] }
                if store.draft(key + "-attachments") == .null { store.setDraft(key + "-attachments", store.draft("question-attachments:" + chatID + ":" + question.id)) }
            }
        }
        .onChange(of: answer) { _, value in var saved = store.draft(key).object; saved["answer"] = .string(value); store.setDraft(key, .object(saved)) }
        .fileImporter(isPresented: $picking, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
            do { for url in try result.get() { try importFile(url) } } catch { self.error = error.localizedDescription }
        }
        .sheet(isPresented: $photos) { NativePhotoSelection(limit: max(1, 4 - files.count)) { results in
            photos = false
            Task { do { for result in results { let data = try await selectedPhotoData(result.itemProvider); guard let image = UIImage(data: data), let png = image.pngData() else { throw RemoteError(message: "The photo could not be read.") }; try add(png, name: "Photo.png", mediaType: "image/png") } } catch { self.error = error.localizedDescription } }
        } }
        .sheet(isPresented: $confirm) { AttachmentSendReview(attachments: files, providerName: provider.capitalized, hostName: store.displayName) { Task { await deliver(submitted) } } }
    }
    private func add(_ bytes: Data, name: String, mediaType: String, createdAt: String? = nil, modifiedAt: String? = nil) throws {
        guard files.count < 4 else { throw RemoteError(message: "Question answers accept up to four files.") }
        guard types.contains(mediaType) else { throw RemoteError(message: "This question does not accept that file type.") }
        if let reason = NativeAttachmentBudget.rejection(existingCount: files.count, existingBytes: files.reduce(0) { $0 + $1.bytes.count }, incomingBytes: bytes.count) { throw RemoteError(message: reason) }
        let item = NativeDraftAttachment(id: UUID().uuidString, name: name, mediaType: mediaType, bytes: bytes, createdAt: createdAt, modifiedAt: modifiedAt)
        shared.draftAttachments[key, default: []].append(item)
        appendAttachmentRecord(store: store, draftKey: key + "-attachments", item: item)
    }
    private func importFile(_ url: URL) throws {
        let scoped = url.startAccessingSecurityScopedResource(); defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let values = try url.resourceValues(forKeys: [.fileSizeKey, .contentTypeKey, .creationDateKey, .contentModificationDateKey])
        guard let size = values.fileSize, size > 0, size <= NativeAttachmentBudget.maxFileBytes else { throw RemoteError(message: "Choose a file between 1 byte and 8 MB.") }
        try add(Data(contentsOf: url), name: url.lastPathComponent, mediaType: values.contentType?.preferredMIMEType ?? "application/octet-stream", createdAt: values.creationDate.map { ISO8601DateFormatter().string(from: $0) }, modifiedAt: values.contentModificationDate.map { ISO8601DateFormatter().string(from: $0) })
    }
    private func paste() {
        do { if let urls = UIPasteboard.general.urls, !urls.isEmpty { for url in urls { try importFile(url) } }
            else if let image = UIPasteboard.general.image, let data = image.pngData() { try add(data, name: "Pasted image.png", mediaType: "image/png") }
            else if let text = UIPasteboard.general.string { answer += text }
        } catch { self.error = error.localizedDescription }
    }
    private func send(_ value: String) {
        guard !busy, missingFiles.isEmpty, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !files.isEmpty else { return }
        submitted = value; answer = value
        if !files.isEmpty && store.draft(key)["attempt"] == .null { confirm = true }
        else { Task { await deliver(value) } }
    }
    private func deliver(_ raw: String) async {
        guard !busy else { return }; busy = true; defer { busy = false }
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !files.isEmpty ? "Please review the attached files." : raw
        let signature: JSON = .array([.string(value), .string(provider), .array(files.map { .string($0.id) })])
        var saved = store.draft(key).object
        do {
            let prior = saved["attempt"] ?? .null
            if prior != .null && prior["signature"] != signature { throw RemoteError(message: "Inspect the previous answer before changing its text or files.") }
            let messageID = prior["messageId"].string.isEmpty ? UUID().uuidString : prior["messageId"].string
            var payload = prior["payload"].object
            if prior == .null {
                if !files.isEmpty { payload = try await store.prepareQuestionAttachments(chatID: chatID, providerID: provider, messageID: messageID, items: files) }
                saved["attempt"] = .object(["signature": signature, "messageId": .string(messageID), "payload": .object(payload)])
                store.setDraft(key, .object(saved))
            }
            try await submit(value, messageID, payload)
            shared.draftAttachments[key] = nil; store.setDraft(key, .null); store.setDraft(key + "-attachments", .null)
        } catch { self.error = error.localizedDescription }
    }
}

struct NativeUserQuestionQueue: View {
    let questions: [NativeUserQuestion]
    var chatKey: String
    let select: (NativeUserQuestion) -> Void
    @EnvironmentObject private var shared: SharedAppStore
    private var expanded: Bool {
        get { shared.expandedQuestionQueues.contains(chatKey) }
        nonmutating set { if newValue { shared.expandedQuestionQueues.insert(chatKey) } else { shared.expandedQuestionQueues.remove(chatKey) } }
    }
    private var waiting: [NativeUserQuestion] { questions.filter { !$0.queueCleared && ["pending", "sending", "uncertain"].contains($0.status) } }
    var body: some View {
        if !waiting.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Button { expanded.toggle() } label: {
                    HStack { Text("Questions to answer (\(waiting.count))"); Spacer(); Image(systemName: expanded ? "chevron.up" : "chevron.down") }
                }.accessibilityIdentifier("chat-question-queue-toggle").accessibilityValue(expanded ? "Expanded" : "Collapsed")
                if expanded {
                    // Release the list's inset before revealing the answer card,
                    // keeping its controls visible when the keyboard is open.
                    ScrollView { VStack(alignment: .leading, spacing: 10) { ForEach(waiting) { question in Button(question.text) { expanded = false; select(question) }.multilineTextAlignment(.leading) } }.frame(maxWidth: .infinity, alignment: .leading) }.frame(maxHeight: 160)
                }
            }.padding(12).background(NativeTheme.surface).accessibilityElement(children: .contain).accessibilityIdentifier("chat-question-queue")
        }
    }
}

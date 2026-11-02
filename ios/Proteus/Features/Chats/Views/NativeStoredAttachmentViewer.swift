import SwiftUI
import QuickLook

struct NativeStoredAttachmentViewer: View {
    @Environment(RemoteStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let chatID: String
    let items: [JSON]
    @State var index: Int
    @State private var file: URL?
    @State private var failure: String?
    @State private var retry = 0
    private var item: JSON { items.indices.contains(index) ? items[index] : .null }
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Text(item["name"].string).font(.headline).lineLimit(2)
                    Text(fileDetails(item)).font(.caption).foregroundStyle(.secondary).lineLimit(3)
                    Spacer(minLength: 0)
                }.padding(12)
                if let file { NativeAttachmentQuickLook(url: file).id(file) }
                else if let failure { ContentUnavailableView { Label("Attachment unavailable", systemImage: "doc.badge.ellipsis") } description: { Text(failure) } actions: { Button("Retry") { retry += 1 } } }
                else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity) }
            }.background(NativeTheme.background).navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarLeading) {
                    Button { step(-1) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44) }.disabled(index <= 0).accessibilityLabel("Previous attachment").keyboardShortcut(.leftArrow, modifiers: [])
                    Button { step(1) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44) }.disabled(index + 1 >= items.count).accessibilityLabel("Next attachment").keyboardShortcut(.rightArrow, modifiers: [])
                }
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
            .simultaneousGesture(DragGesture(minimumDistance: 80).onEnded { value in if abs(value.translation.width) > abs(value.translation.height) * 2 { step(value.translation.width < 0 ? 1 : -1) } })
            .task(id: "\(index):\(retry)") {
                file = nil; failure = nil
                do { let url = try await store.attachmentFile(chatID: chatID, sha256: item["sha256"].string, name: item["name"].string); try Task.checkCancellation(); file = url }
                catch is CancellationError { }
                catch { failure = error.localizedDescription }
            }
        }
    }
    private func step(_ direction: Int) { let next = index + direction; if items.indices.contains(next) { index = next } }
    private func fileDetails(_ item: JSON) -> String {
        var values: [String] = []
        if let date = ProviderAllowance.date(item["createdAt"].string) { values.append("Created " + nativeTimestamp(date)) }
        if let date = ProviderAllowance.date(item["modifiedAt"].string) { values.append("Modified " + nativeTimestamp(date)) }
        if item["size"].int > 0 { values.append(ByteCountFormatter.string(fromByteCount: Int64(item["size"].int), countStyle: .file)) }
        return values.joined(separator: " · ")
    }
}

private struct NativeAttachmentQuickLook: UIViewControllerRepresentable {
    let url: URL
    func makeCoordinator() -> Coordinator { Coordinator(url) }
    func makeUIViewController(context: Context) -> QLPreviewController { let controller = QLPreviewController(); controller.dataSource = context.coordinator; return controller }
    func updateUIViewController(_ controller: QLPreviewController, context: Context) { context.coordinator.url = url; controller.reloadData() }
    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        var url: URL
        init(_ url: URL) { self.url = url }
        func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { url as NSURL }
    }
}

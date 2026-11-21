import UIKit
import UniformTypeIdentifiers

/// Read only after the user chooses Paste. Item providers keep cross-process
/// clipboard materialization and privacy prompts off the application's event loop.
@MainActor enum NativeAttachmentPaste {
    enum Item: Sendable { case file(URL); case image(Data) }
    static func read(limit: Int = 4, receive: @escaping @MainActor (Result<Item, Error>) -> Void) {
        load(providers: UIPasteboard.general.itemProviders, limit: limit, receive: receive)
    }
    static func load(providers source: [NSItemProvider], limit: Int = 4, receive: @escaping @MainActor (Result<Item, Error>) -> Void) {
        let providers = Array(source.prefix(max(1, limit)))
        var requested = false
        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
                requested = true
                provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
                    let url = item as? URL ?? (item as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) }
                    Task { @MainActor in
                        if let url, url.isFileURL { receive(.success(.file(url))) } else { receive(.failure(PasteError.unavailable)) }
                    }
                }
            } else if provider.canLoadObject(ofClass: UIImage.self) {
                requested = true
                provider.loadObject(ofClass: UIImage.self) { item, _ in
                    Task { @MainActor in
                        if let image = item as? UIImage, let data = image.pngData() { receive(.success(.image(data))) } else { receive(.failure(PasteError.unavailable)) }
                    }
                }
            }
        }
        if !requested { receive(.failure(PasteError.unavailable)) }
    }
    static func markdownAsset(_ item: Item) async throws -> [String: JSON] {
        let limit = 4 * 1024 * 1024
        return try await Task.detached(priority: .userInitiated) {
            let data: Data
            let mediaType: String
            switch item {
            case .image(let value): data = value; mediaType = "image/png"
            case .file(let url):
                let types = ["png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf"]
                guard let type = types[url.pathExtension.lowercased()] else { throw PasteError.unavailable }
                mediaType = type
                let accessed = url.startAccessingSecurityScopedResource()
                defer { if accessed { url.stopAccessingSecurityScopedResource() } }
                let file = try FileHandle(forReadingFrom: url)
                defer { try? file.close() }
                data = try file.read(upToCount: limit + 1) ?? Data()
            }
            guard !data.isEmpty, data.count <= limit else { throw RemoteError(message: "Paste attachments up to 4 MiB.") }
            return ["mediaType": .string(mediaType), "data": .string(data.base64EncodedString())]
        }.value
    }
    enum PasteError: LocalizedError {
        case unavailable
        var errorDescription: String? { "Copy an image or a file supported by this provider, then paste it here." }
    }
}

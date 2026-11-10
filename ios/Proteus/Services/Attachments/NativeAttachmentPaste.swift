import UIKit
import UniformTypeIdentifiers

/// Read only after the user chooses Paste. Item providers keep cross-process
/// clipboard materialization and privacy prompts off the application's event loop.
@MainActor enum NativeAttachmentPaste {
    enum Item { case file(URL); case image(Data) }
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
    enum PasteError: LocalizedError {
        case unavailable
        var errorDescription: String? { "Copy an image or a file supported by this provider, then paste it here." }
    }
}

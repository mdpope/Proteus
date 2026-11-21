import AppKit
import ImageIO
import OSLog
import UniformTypeIdentifiers

struct ScreenshotImage {
    let data: Data
    let type: String
}

struct ScreenshotItemError: LocalizedError {
    let errorDescription: String?
    init(_ message: String) { errorDescription = message }
}

enum ScreenshotItem {
    private static let trayLimit = 32 * 1024 * 1024
    private static let inputLimit = 128 * 1024 * 1024
    private static let maxPixels = 48_000_000.0
    private static let log = Logger(subsystem: "org.proteusapp.proteus.screenshot-share", category: "image")

    static func isImageProvider(_ provider: NSItemProvider) -> Bool {
        provider.hasItemConformingToTypeIdentifier(UTType.image.identifier)
            || provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier)
            || provider.canLoadObject(ofClass: NSImage.self)
    }

    static func read(_ provider: NSItemProvider) async throws -> ScreenshotImage {
        let registered = provider.registeredTypeIdentifiers.filter { UTType($0)?.conforms(to: .image) == true }
        let imageTypes = registered.isEmpty && provider.hasItemConformingToTypeIdentifier(UTType.image.identifier)
            ? [UTType.image.identifier] : registered.sorted { score($0) < score($1) }
        // A share provider can advertise several representations of one image.
        // Treat bytes as a candidate until ImageIO has validated the representation.
        log.info("Reading shared image; registered image types: \(imageTypes.joined(separator: ","), privacy: .public)")
        for identifier in imageTypes {
            try Task.checkCancellation()
            if let data = await loadData(provider, identifier), let image = decode(data, via: "data") { return image }
            if let data = await loadFile(provider, identifier), let image = decode(data, via: "file") { return image }
        }
        if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
            if let data = await loadURLObject(provider), let image = decode(data, via: "URL object") { return image }
            if let data = await loadLegacy(provider, UTType.fileURL.identifier),
               let image = decode(data, via: "file URL") { return image }
        }
        if provider.canLoadObject(ofClass: NSImage.self),
           let data = await loadImageObject(provider),
           let image = decode(data, via: "image object") { return image }
        // Some system Share hosts still export their screenshot through loadItem.
        for identifier in imageTypes {
            try Task.checkCancellation()
            if let data = await loadLegacy(provider, identifier), let image = decode(data, via: "legacy item") { return image }
        }
        throw ScreenshotItemError("macOS did not provide a readable screenshot. Try copying the screenshot from the editor and pasting it into Proteus.")
    }

    private static func score(_ identifier: String) -> Int {
        if identifier == UTType.png.identifier { return 0 }
        if identifier == UTType.jpeg.identifier { return 1 }
        return identifier == UTType.image.identifier ? 3 : 2
    }

    private static func loadData(_ provider: NSItemProvider, _ identifier: String) async -> Data? {
        await withCheckedContinuation { result in
            provider.loadDataRepresentation(forTypeIdentifier: identifier) { data, _ in result.resume(returning: data) }
        }
    }

    private static func loadFile(_ provider: NSItemProvider, _ identifier: String) async -> Data? {
        await withCheckedContinuation { result in
            // The provider owns the temporary URL and may remove it after the callback.
            provider.loadFileRepresentation(forTypeIdentifier: identifier) { url, _ in
                result.resume(returning: url.flatMap(readFile))
            }
        }
    }

    private static func loadImageObject(_ provider: NSItemProvider) async -> Data? {
        await withCheckedContinuation { result in
            _ = provider.loadObject(ofClass: NSImage.self) { object, _ in
                result.resume(returning: (object as? NSImage)?.tiffRepresentation)
            }
        }
    }

    private static func loadURLObject(_ provider: NSItemProvider) async -> Data? {
        await withCheckedContinuation { result in
            _ = provider.loadObject(ofClass: NSURL.self) { object, _ in
                result.resume(returning: (object as? URL).flatMap(readFile))
            }
        }
    }

    private static func loadLegacy(_ provider: NSItemProvider, _ identifier: String) async -> Data? {
        await withCheckedContinuation { result in
            provider.loadItem(forTypeIdentifier: identifier, options: nil) { item, _ in
                if let url = item as? URL { result.resume(returning: readFile(url)); return }
                if let image = item as? NSImage { result.resume(returning: image.tiffRepresentation); return }
                result.resume(returning: item as? Data)
            }
        }
    }

    private static func readFile(_ url: URL) -> Data? {
        guard url.isFileURL else { return nil }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let descriptor = url.withUnsafeFileSystemRepresentation { file in
            file.map { open($0, O_RDONLY | O_NONBLOCK | O_NOFOLLOW) } ?? -1
        }
        guard descriptor >= 0 else { return nil }
        let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
        defer { try? handle.close() }
        var info = stat()
        guard fstat(handle.fileDescriptor, &info) == 0, info.st_mode & S_IFMT == S_IFREG,
              info.st_size > 0, info.st_size <= inputLimit else { return nil }
        return try? handle.read(upToCount: inputLimit+1)
    }

    private static func decode(_ data: Data, via method: String) -> ScreenshotImage? {
        guard !data.isEmpty, data.count <= inputLimit,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let type = CGImageSourceGetType(source) as String?,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any],
              let width = (properties[kCGImagePropertyPixelWidth as String] as? NSNumber)?.doubleValue,
              let height = (properties[kCGImagePropertyPixelHeight as String] as? NSNumber)?.doubleValue,
              width.isFinite, height.isFinite, width > 0, height > 0 else {
            log.info("Share image candidate did not decode; method: \(method, privacy: .public); bytes: \(data.count)")
            return nil
        }
        log.info("Share image candidate decoded; method: \(method, privacy: .public); type: \(type, privacy: .public); size: \(width)x\(height)")
        let isFullSize = data.count <= trayLimit && width <= 16384 && height <= 16384 && width * height <= maxPixels
        if isFullSize && type == UTType.png.identifier { return ScreenshotImage(data:data,type:"image/png") }
        if isFullSize && type == UTType.jpeg.identifier { return ScreenshotImage(data:data,type:"image/jpeg") }
        // Keep an image usable even when a full-resolution TIFF or HDR capture
        // would exceed the tray's bounded PNG/JPEG input.
        let edge = Int(min(8192,max(width,height),max(width,height)*sqrt(maxPixels/(width*height))))
        for pixels in [edge, max(1,edge*2/3), max(1,edge/2)] {
            let options = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: max(1,pixels),
            ] as CFDictionary
            guard let raster = CGImageSourceCreateThumbnailAtIndex(source,0,options) else { return nil }
            let encoded = NSMutableData()
            guard let destination = CGImageDestinationCreateWithData(encoded,UTType.png.identifier as CFString,1,nil) else { return nil }
            CGImageDestinationAddImage(destination,raster,nil)
            if CGImageDestinationFinalize(destination) && encoded.length <= trayLimit {
                return ScreenshotImage(data:encoded as Data,type:"image/png")
            }
        }
        return nil
    }
}

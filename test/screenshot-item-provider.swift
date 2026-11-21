import AppKit
import ImageIO
import UniformTypeIdentifiers

@main
struct ScreenshotProviderTest {
    static func main() async throws {
        let url = URL(fileURLWithPath: CommandLine.arguments[1])
        let png = try Data(contentsOf: url)
        let image = NSImage(data: png)!
        let tiff = image.tiffRepresentation!

        let plain = NSItemProvider()
        provide(png, as: .png, in: plain)
        let original = try await read("original PNG", plain)
        precondition(original.data == png && original.type == "image/png")

        let fallback = NSItemProvider()
        provide(Data("not an image".utf8), as: .png, in: fallback)
        provide(tiff, as: .tiff, in: fallback)
        let recovered = try await read("alternate TIFF", fallback)
        precondition(recovered.type == "image/png" && NSImage(data: recovered.data) != nil)

        let object = NSItemProvider(object: image)
        let objectImage = try await read("NSImage object", object)
        precondition(NSImage(data: objectImage.data) != nil)

        let file = NSItemProvider(item: url as NSURL, typeIdentifier: UTType.fileURL.identifier)
        let fileImage = try await read("file URL", file)
        precondition(fileImage.data == png)

        let invalid = NSItemProvider()
        provide(Data("not an image".utf8), as: .png, in: invalid)
        do {
            _ = try await ScreenshotItem.read(invalid)
            preconditionFailure("A malformed image was accepted.")
        } catch is ScreenshotItemError {}

        print("PNG preservation, invalid preferred representation, alternate TIFF, NSImage, file URL, and malformed input passed.")
    }

    static func read(_ label: String, _ provider: NSItemProvider) async throws -> ScreenshotImage {
        do { return try await ScreenshotItem.read(provider) }
        catch { throw ScreenshotItemError(label + ": " + error.localizedDescription) }
    }

    static func provide(_ bytes: Data, as type: UTType, in provider: NSItemProvider) {
        provider.registerDataRepresentation(forTypeIdentifier: type.identifier, visibility: .all) { completion in
            completion(bytes, nil)
            return nil
        }
    }
}

import AppKit

private struct ShareError: LocalizedError {
    let errorDescription: String?
    init(_ message: String) { errorDescription = message }
}

private enum ShareConnectionError: Error { case unavailable }

private final class NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

private struct ShareBridge {
    private struct Descriptor: Decodable {
        let version: Int
        let port: Int
        let token: String
    }
    private let descriptor: Descriptor

    init() throws {
        guard let file = ShareContainer.url()?.appendingPathComponent("proteus-screenshot-share-v2.json"),
              let handle = try? FileHandle(forReadingFrom: file) else {
            throw ShareConnectionError.unavailable
        }
        defer { try? handle.close() }
        guard let bytes = try handle.read(upToCount: 513), bytes.count <= 512,
              let descriptor = try? JSONDecoder().decode(Descriptor.self, from: bytes),
              descriptor.version == 2, (1...65535).contains(descriptor.port),
              descriptor.token.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else {
            throw ShareConnectionError.unavailable
        }
        self.descriptor = descriptor
    }

    func send(_ image: Data, type: String, id: UUID) async throws {
        let url = URL(string: "http://127.0.0.1:\(descriptor.port)/screenshot")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(descriptor.token)", forHTTPHeaderField: "Authorization")
        request.setValue(id.uuidString.lowercased(), forHTTPHeaderField: "X-Proteus-Screenshot")
        request.setValue(type, forHTTPHeaderField: "Content-Type")
        request.httpBody = image
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 6
        config.connectionProxyDictionary = [:]
        config.httpShouldSetCookies = false
        let session = URLSession(configuration: config, delegate: NoRedirects(), delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw ShareConnectionError.unavailable
        }
        guard let http = response as? HTTPURLResponse, http.statusCode == 200, data.count < 4096 else {
            struct Rejection: Decodable { let message: String }
            throw ShareError((try? JSONDecoder().decode(Rejection.self, from: data))?.message
                ?? "Proteus could not receive this screenshot.")
        }
        struct Receipt: Decodable { let received: Bool }
        guard (try? JSONDecoder().decode(Receipt.self, from: data))?.received == true else {
            throw ShareError("Proteus did not confirm receipt. Try again.")
        }
    }
}

@objc(ProteusShareViewController)
final class ShareViewController: NSViewController {
    private let status = NSTextField(wrappingLabelWithString: "Sending to the Proteus screenshot tray…")
    private let retry = NSButton(title: "Try Again", target: nil, action: nil)
    private let copy = NSButton(title: "Copy Image", target: nil, action: nil)
    private let cancel = NSButton(title: "Cancel", target: nil, action: nil)
    private let id = UUID()
    private var image: ScreenshotImage?
    private var work: Task<Void, Never>?

    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 410, height: 165))
        preferredContentSize = view.frame.size
        let heading = NSTextField(labelWithString: "Send to Proteus")
        heading.font = .systemFont(ofSize: 17, weight: .semibold)
        let buttons = NSStackView(views: [cancel, copy, retry])
        buttons.spacing = 8
        let stack = NSStackView(views: [heading, status, buttons])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -20),
        ])
        retry.target = self
        retry.action = #selector(send)
        retry.keyEquivalent = "\r"
        copy.target = self
        copy.action = #selector(copyImage)
        cancel.target = self
        cancel.action = #selector(closeSheet)
        cancel.keyEquivalent = "\u{1b}"
        send()
    }

    @objc private func closeSheet() {
        work?.cancel()
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    @objc private func copyImage() {
        guard let image, let decoded = NSImage(data: image.data) else { return }
        NSPasteboard.general.clearContents()
        if NSPasteboard.general.writeObjects([decoded]) {
            status.stringValue = "Screenshot copied."
            cancel.title = "Done"
        }
    }

    @objc private func send() {
        retry.isEnabled = false
        copy.isEnabled = false
        cancel.title = "Cancel"
        status.stringValue = "Sending to the Proteus screenshot tray…"
        work = Task {
            do {
                if image == nil { image = try await loadImage() }
                guard let image else { return }
                try Task.checkCancellation()
                try await deliver(image)
                if !Task.isCancelled { extensionContext?.completeRequest(returningItems: [], completionHandler: nil) }
            } catch {
                if Task.isCancelled { return }
                status.stringValue = error.localizedDescription
                retry.isEnabled = true
                copy.isEnabled = image != nil
                cancel.title = "Close"
            }
        }
    }

    private func deliver(_ image: ScreenshotImage) async throws {
        do {
            try await ShareBridge().send(image.data, type: image.type, id: id)
            return
        } catch ShareConnectionError.unavailable {
            let app = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            let configuration = NSWorkspace.OpenConfiguration()
            configuration.activates = false
            _ = try? await NSWorkspace.shared.openApplication(at: app, configuration: configuration)
        }
        for _ in 0..<30 {
            try await Task.sleep(nanoseconds: 200_000_000)
            do {
                try await ShareBridge().send(image.data, type: image.type, id: id)
                return
            } catch ShareConnectionError.unavailable {
                continue
            }
        }
        throw ShareError("Proteus could not be reached. Open it and choose Try Again, or copy the image.")
    }

    private func loadImage() async throws -> ScreenshotImage {
        let items = extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem } ?? []
        let images = items.flatMap { $0.attachments ?? [] }.filter(ScreenshotItem.isImageProvider)
        guard images.count == 1, let provider = images.first else {
            throw ShareError("Select one screenshot to send.")
        }
        return try await ScreenshotItem.read(provider)
    }
}

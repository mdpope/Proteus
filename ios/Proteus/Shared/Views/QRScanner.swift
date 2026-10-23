import SwiftUI
import AVFoundation

struct QRScanner: UIViewControllerRepresentable {
    var onCode: (String) -> Void
    func makeUIViewController(context: Context) -> QRController { let controller = QRController(); controller.onCode = onCode; return controller }
    func updateUIViewController(_ controller: QRController, context: Context) {}
    static func dismantleUIViewController(_ controller: QRController, coordinator: ()) { controller.stop() }
}
final class QRController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "proteus.qr.camera")
    private var preview: AVCaptureVideoPreviewLayer?
    private var rotationCoordinator: AVCaptureDevice.RotationCoordinator?
    private var rotationObservation: NSKeyValueObservation?
    private var delivered = false
    private var stopped = false
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .black
        AVCaptureDevice.requestAccess(for: .video) { allowed in
            DispatchQueue.main.async { guard !self.stopped else { return }; if allowed { self.configure() } else { self.notice("Camera access is unavailable. Close this screen and paste the pairing link instead.") } }
        }
    }
    private func notice(_ text: String) { let label = UILabel(); label.text = text; label.textColor = .white; label.numberOfLines = 0; label.textAlignment = .center; label.frame = view.bounds.insetBy(dx: 24, dy: 120); label.autoresizingMask = [.flexibleWidth, .flexibleHeight]; view.addSubview(label) }
    private func configure() {
        guard let device = AVCaptureDevice.default(for: .video), let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else { notice("No camera is available. Paste the pairing link instead."); return }
        session.addInput(input); let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }; session.addOutput(output); output.setMetadataObjectsDelegate(self, queue: .main); output.metadataObjectTypes = [.qr]
        let layer = AVCaptureVideoPreviewLayer(session: session); layer.videoGravity = .resizeAspectFill; layer.frame = view.bounds; view.layer.insertSublayer(layer, at: 0); preview = layer
        // Use the actual camera sensor and preview layer, including landscape iPads
        // and cameras whose native sensor orientation differs from older phones.
        let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: layer)
        rotationCoordinator = coordinator
        rotationObservation = coordinator.observe(\.videoRotationAngleForHorizonLevelPreview, options: [.initial, .new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.updatePreviewRotation() }
        }
        queue.async { self.session.startRunning() }
    }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); preview?.frame = view.bounds; updatePreviewRotation() }
    private func updatePreviewRotation() {
        guard !stopped, let connection = preview?.connection, let coordinator = rotationCoordinator else { return }
        let angle = coordinator.videoRotationAngleForHorizonLevelPreview
        if connection.isVideoRotationAngleSupported(angle) { connection.videoRotationAngle = angle }
    }
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !stopped, !delivered, let value = (objects.first as? AVMetadataMachineReadableCodeObject)?.stringValue, value.hasPrefix("proteus://pair?") else { return }
        delivered = true; stop(); onCode?(value)
    }
    func stop() { stopped = true; rotationObservation?.invalidate(); rotationObservation = nil; rotationCoordinator = nil; queue.async { self.session.stopRunning() } }
}

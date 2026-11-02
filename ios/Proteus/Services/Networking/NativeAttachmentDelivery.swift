import Foundation
import CryptoKit

extension RemoteStore {
    /// The caller presents sender consent first. These requests bind exact bytes to one
    /// host/provider/chat/message; transport retries reuse the final payload unchanged.
    func prepareQuestionAttachments(chatID: String, providerID: String, messageID: String, items: [NativeDraftAttachment]) async throws -> [String: JSON] {
        let host = connection?.hostId
        func verifyHost() throws { guard connected, connection?.hostId == host else { throw RemoteError(message: "The destination changed. Review the files again.") } }
        var claims: [JSON] = [], ids: [JSON] = []
        for item in items {
            try verifyHost()
            let digest = SHA256.hash(data: item.bytes).map { String(format: "%02x", $0) }.joined()
            let begin = try await request("chat.attachments.begin", ["id": .string(chatID), "providerId": .string(providerID), "messageId": .string(messageID), "name": .string(item.name), "mediaType": .string(item.mediaType), "size": .number(Double(item.bytes.count)), "sha256": .string(digest)].merging(item.fileDates) { current, _ in current })
            let uploadID = begin["uploadId"].string, chunk = max(1, min(begin["chunkSize"].int, 256 * 1024))
            guard !uploadID.isEmpty else { throw RemoteError(message: "The computer did not create the attachment upload.") }
            for (index, offset) in stride(from: 0, to: item.bytes.count, by: chunk).enumerated() {
                try verifyHost()
                _ = try await request("chat.attachments.chunk", ["uploadId": .string(uploadID), "index": .number(Double(index)), "dataBase64": .string(item.bytes.subdata(in: offset..<min(offset + chunk, item.bytes.count)).base64EncodedString())])
            }
            let file = try await request("chat.attachments.finish", ["uploadId": .string(uploadID)])
            guard !file["attachmentId"].string.isEmpty, file["sha256"].string == digest, file["size"].int == item.bytes.count, file["mediaType"].string == item.mediaType else { throw RemoteError(message: "The computer returned different attachment metadata. Nothing was sent.") }
            ids.append(file["attachmentId"]); claims.append(file)
        }
        try verifyHost()
        let consent = try await request("chat.attachments.authorize", ["id": .string(chatID), "providerId": .string(providerID), "messageId": .string(messageID), "attachments": .array(claims)])
        try verifyHost()
        guard !consent["consentId"].string.isEmpty, consent["providerId"].string == providerID else { throw RemoteError(message: "The computer did not confirm the exact attachment destination.") }
        return ["providerId": .string(providerID), "attachments": .array(ids), "consentId": consent["consentId"]]
    }
}

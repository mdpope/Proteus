import Foundation
import CryptoKit
import Security

enum RemoteCrypto {
    static func key(_ hex: String) throws -> SymmetricKey {
        guard hex.count == 64 else { throw RemoteError(message: "Invalid device key.") }
        var bytes = Data()
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            guard let value = UInt8(hex[index..<next], radix: 16) else { throw RemoteError(message: "Invalid device key.") }
            bytes.append(value); index = next
        }
        return SymmetricKey(data: bytes)
    }
    static func random() -> String { SymmetricKey(size: .bits256).withUnsafeBytes { Data($0).map { String(format: "%02x", $0) }.joined() } }
    static func seal(_ value: JSON, key: String, aad: String) throws -> String {
        let box = try AES.GCM.seal(JSONEncoder().encode(value), using: self.key(key), authenticating: Data(aad.utf8))
        return box.combined!.base64EncodedString()
    }
    static func open(_ value: String, key: String, aad: String) throws -> JSON {
        guard let data = Data(base64Encoded: value) else { throw RemoteError(message: "Invalid encrypted message.") }
        let plain = try AES.GCM.open(AES.GCM.SealedBox(combined: data), using: self.key(key), authenticating: Data(aad.utf8))
        return try JSON.decode(plain)
    }
}
struct DeviceConnection: Codable {
    var relay: String
    var hostId: String
    var deviceId: String
    var key: String
}
enum DeviceKeychain {
    private static let legacyQuery: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "org.proteusapp.proteus.mobile", kSecAttrAccount as String: "paired-mac"]
    private static func query(hostID: String?, service: String) -> [String: Any] {
        var q = legacyQuery; q[kSecAttrService as String] = service
        if let hostID { q[kSecAttrAccount as String] = "paired-mac:" + hostID.lowercased() }; return q
    }
    static func load(hostID: String? = nil, service: String = "org.proteusapp.proteus.mobile") -> DeviceConnection? {
        var q = query(hostID: hostID, service: service); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return try? JSONDecoder().decode(DeviceConnection.self, from: data)
    }
    static func save(_ connection: DeviceConnection, hostID: String? = nil, service: String = "org.proteusapp.proteus.mobile") throws {
        let query = query(hostID: hostID, service: service)
        let data = try JSONEncoder().encode(connection)
        let attributes: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var q = query; attributes.forEach { q[$0.key] = $0.value }
            guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw RemoteError(message: "Could not save the paired device in Keychain.") }; return
        }
        guard status == errSecSuccess else { throw RemoteError(message: "Could not update the paired device in Keychain (\(status)).") }
    }
    static func clear(hostID: String? = nil, service: String = "org.proteusapp.proteus.mobile") { SecItemDelete(query(hostID: hostID, service: service) as CFDictionary) }
}

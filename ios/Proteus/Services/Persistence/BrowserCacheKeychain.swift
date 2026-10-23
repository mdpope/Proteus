import Foundation
import Security

enum BrowserCacheKeychain {
    static func key() -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "org.proteusapp.proteus.mobile.browser", kSecAttrAccount as String: "cache-key"]
        var read = query; read[kSecReturnData as String] = true; read[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(read as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data { return String(data: data, encoding: .utf8) }
        guard status == errSecItemNotFound else { return nil }
        let key = RemoteCrypto.random(); var save = query; save[kSecValueData as String] = Data(key.utf8); save[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        return SecItemAdd(save as CFDictionary, nil) == errSecSuccess ? key : nil
    }
}


import Foundation
import Security

/// X.509 presentation metadata from public DER. Parsing never changes trust.
struct NativeCertificateInfo {
    var subject = ""
    var issuer = ""
    var validFrom: Date?
    var validTo: Date?
    var alternativeNames: [String] = []
    init(data: Data) {
        guard !data.isEmpty, data.count <= 131_072, let nodes = try? DER.nodes(Array(data)), let root = nodes.first, let certificate = try? root.children(), let tbs = certificate.first, let fields = try? tbs.children() else { return }
        let start = fields.first?.tag == 0xa0 ? 1 : 0
        guard fields.count > start + 5 else { return }
        issuer = Self.name(fields[start + 2]); subject = Self.name(fields[start + 4])
        if let dates = try? fields[start + 3].children(), dates.count == 2 { validFrom = Self.date(dates[0]); validTo = Self.date(dates[1]) }
        for field in fields where field.tag == 0xa3 {
            guard let wrapper = try? field.children(), let extensions = try? wrapper.first?.children() else { continue }
            for item in extensions {
                guard let parts = try? item.children(), parts.first?.oid == "2.5.29.17", let value = parts.last, value.tag == 0x04,
                      let general = try? DER.nodes(Array(value.bytes)).first?.children() else { continue }
                alternativeNames = general.prefix(64).compactMap { node in
                    if node.tag == 0x82 { return String(bytes: node.bytes, encoding: .utf8).map { "DNS: " + $0 } }
                    if node.tag == 0x87, node.bytes.count == 4 { return "IP: " + node.bytes.map(String.init).joined(separator: ".") }
                    return nil
                }
            }
        }
    }
    private static func name(_ node: DER) -> String {
        let labels = ["2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU"]
        guard let sets = try? node.children() else { return "" }
        return sets.prefix(64).flatMap { (try? $0.children()) ?? [] }.compactMap { field in
            guard let parts = try? field.children(), parts.count == 2, let oid = parts[0].oid else { return nil }
            let value = parts[1], encoding: String.Encoding = value.tag == 0x1e ? .utf16BigEndian : .utf8
            guard let text = String(bytes: value.bytes, encoding: encoding) else { return nil }
            return (labels[oid] ?? oid) + "=" + text
        }.joined(separator: "\n")
    }
    private static func date(_ node: DER) -> Date? {
        guard [0x17, 0x18].contains(node.tag), var text = String(bytes: node.bytes, encoding: .ascii), text.hasSuffix("Z") else { return nil }
        if node.tag == 0x17 { guard text.count == 13, let year = Int(text.prefix(2)) else { return nil }; text = (year >= 50 ? "19" : "20") + text }
        guard text.count == 15 else { return nil }
        let format = DateFormatter(); format.locale = Locale(identifier: "en_US_POSIX"); format.timeZone = TimeZone(secondsFromGMT: 0); format.dateFormat = "yyyyMMddHHmmss'Z'"; format.isLenient = false
        return format.date(from: text)
    }
    private struct DER {
        let tag: UInt8
        let bytes: ArraySlice<UInt8>
        func children() throws -> [DER] { try Self.nodes(Array(bytes)) }
        var oid: String? {
            guard tag == 0x06, let first = bytes.first else { return nil }
            var values = [Int(first) < 80 ? Int(first) / 40 : 2, Int(first) < 80 ? Int(first) % 40 : Int(first) - 80], value = 0
            for byte in bytes.dropFirst() { guard value <= Int.max >> 7 else { return nil }; value = (value << 7) | Int(byte & 0x7f); if byte & 0x80 == 0 { values.append(value); value = 0 } }
            return values.map(String.init).joined(separator: ".")
        }
        static func nodes(_ bytes: [UInt8]) throws -> [DER] {
            var result: [DER] = [], cursor = 0
            while cursor < bytes.count {
                guard result.count < 256, cursor + 2 <= bytes.count else { throw ParseError.invalid }
                let tag = bytes[cursor], first = Int(bytes[cursor + 1]); cursor += 2
                var length = first
                if first & 0x80 != 0 {
                    let count = first & 0x7f
                    guard count > 0, count <= 4, cursor + count <= bytes.count else { throw ParseError.invalid }
                    length = 0; for byte in bytes[cursor..<(cursor + count)] { length = (length << 8) | Int(byte) }; cursor += count
                }
                guard length <= bytes.count - cursor else { throw ParseError.invalid }
                result.append(DER(tag: tag, bytes: bytes[cursor..<(cursor + length)])); cursor += length
            }
            return result
        }
        enum ParseError: Error { case invalid }
    }
}

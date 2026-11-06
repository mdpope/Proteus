import Foundation
import CoreFoundation

enum JSON: Codable, Hashable, Sendable {
    case object([String: JSON]), array([JSON]), string(String), number(Double), bool(Bool), null
    /// Foundation parses heterogeneous owner snapshots once, avoiding repeated
    /// failed Codable scalar/container attempts for every object and array node.
    static func decode(_ data: Data) throws -> JSON {
        try convert(JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]))
    }
    private static func convert(_ value: Any) throws -> JSON {
        if value is NSNull { return .null }
        if let number = value as? NSNumber {
            return CFGetTypeID(number) == CFBooleanGetTypeID() ? .bool(number.boolValue) : .number(number.doubleValue)
        }
        if let text = value as? String { return .string(text) }
        if let array = value as? [Any] { return .array(try array.map(convert)) }
        if let object = value as? [String: Any] { return .object(try object.mapValues(convert)) }
        throw RemoteError(message: "Unsupported JSON value.")
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([JSON].self) { self = .array(v) }
        else { self = .object(try c.decode([String: JSON].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .object(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
    subscript(_ key: String) -> JSON { if case .object(let v) = self { return v[key] ?? .null }; return .null }
    var string: String { if case .string(let v) = self { return v }; return "" }
    var bool: Bool { if case .bool(let v) = self { return v }; return false }
    var int: Int { if case .number(let v) = self { return Int(v) }; return 0 }
    var array: [JSON] { if case .array(let v) = self { return v }; return [] }
    var object: [String: JSON] { if case .object(let v) = self { return v }; return [:] }
    var pretty: String { let e = JSONEncoder(); e.outputFormatting = [.prettyPrinted, .sortedKeys]; return (try? String(data: e.encode(self), encoding: .utf8)) ?? "" }
}
struct RemoteError: LocalizedError { var message: String; var code: String? = nil; var details: JSON = .null; var errorDescription: String? { message } }

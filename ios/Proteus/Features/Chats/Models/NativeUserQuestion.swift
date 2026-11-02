import Foundation

// Structured owner data only; assistant prose is never classified as a request.
struct NativeUserQuestion: Identifiable, Equatable {
    let id: String
    let text: String
    let choices: [String]
    let status: String
    let eventIndex: Int
    let blocking: Bool
    func promptVisible(in text: String, among questionCount: Int = 1) -> Bool {
        func normalized(_ value: String) -> String { value.split(whereSeparator: \.isWhitespace).joined(separator: " ") }
        let prompt = normalized(self.text)
        return questionCount == 1 && !prompt.isEmpty && normalized(text).contains(prompt)
    }
    static func read(_ run: JSON) -> [NativeUserQuestion] {
        var result = run["userQuestions"].array.map { value in
            NativeUserQuestion(id: value["id"].string, text: value["text"].string, choices: value["choices"].array.map(\.string), status: value["status"].string, eventIndex: value["eventIndex"].int, blocking: false)
        }
        let pending = run["pending"]
        if pending["type"].string == "question" {
            let index = run["events"].array.firstIndex { $0["data"]["question"]["id"] == pending["id"] }
            result.append(NativeUserQuestion(id: pending["id"].string, text: pending["question"].string, choices: pending["choices"].array.map(\.string), status: "pending", eventIndex: index.map { run["eventStart"].int + $0 } ?? -1, blocking: true))
        }
        return result
    }
}

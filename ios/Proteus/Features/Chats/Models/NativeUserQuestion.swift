import Foundation

// Structured owner data only; assistant prose is never classified as a request.
struct NativeUserQuestion: Identifiable, Equatable {
    let id: String
    let text: String
    let choices: [String]
    let status: String
    let eventIndex: Int
    let blocking: Bool
    var queueCleared = false
    var answer = ""
    var deliveryState = ""
    var choiceDescriptions: [String: String] = [:]
    func promptVisible(in text: String, among questionCount: Int = 1) -> Bool {
        func normalized(_ value: String) -> String { value.split(whereSeparator: \.isWhitespace).joined(separator: " ") }
        let prompt = normalized(self.text)
        return questionCount == 1 && !prompt.isEmpty && normalized(text).contains(prompt)
    }
    static func presentationText(_ text: String, questions: [NativeUserQuestion]) -> String {
        let choices = Set(questions.flatMap { question in question.choices + question.choiceDescriptions.map { $0.key + " — " + $0.value } })
        return text.components(separatedBy: "\n").filter { line in
            guard let range = line.range(of: #"^\s*(?:[-*•]|\d+[.)])\s+"#, options: .regularExpression) else { return true }
            return !choices.contains(String(line[range.upperBound...]).replacingOccurrences(of: "**", with: "").trimmingCharacters(in: .whitespaces))
        }.joined(separator: "\n")
    }
    private static func descriptions(_ value: JSON) -> [String: String] {
        var result: [String: String] = [:]
        for option in value.array where !option["label"].string.isEmpty && !option["description"].string.isEmpty { result[option["label"].string] = option["description"].string }
        return result
    }
    static func read(_ run: JSON) -> [NativeUserQuestion] {
        var result = run["userQuestions"].array.map { value in
            NativeUserQuestion(id: value["id"].string, text: value["text"].string, choices: value["choices"].array.map(\.string), status: value["status"].string, eventIndex: value["eventIndex"].int, blocking: false, answer: value["answer"].string, deliveryState: value["deliveryState"].string, choiceDescriptions: descriptions(value["options"]))
        }
        for (index, event) in run["events"].array.enumerated() {
            let value = event["data"]["question"]
            if !value["id"].string.isEmpty && !result.contains(where: { $0.id == value["id"].string }) && run["pending"]["id"] != value["id"] {
                result.append(NativeUserQuestion(id: value["id"].string, text: value["text"].string, choices: value["choices"].array.map(\.string), status: value["status"].string, eventIndex: run["eventStart"].int + index, blocking: true, answer: value["answer"].string, choiceDescriptions: descriptions(value["options"])))
            }
        }
        let pending = run["pending"]
        if pending["type"].string == "question" {
            let index = run["events"].array.firstIndex { $0["data"]["question"]["id"] == pending["id"] }
            result.append(NativeUserQuestion(id: pending["id"].string, text: pending["question"].string, choices: pending["choices"].array.map(\.string), status: "pending", eventIndex: index.map { run["eventStart"].int + $0 } ?? -1, blocking: true, choiceDescriptions: descriptions(pending["optionDetails"])))
        }
        for index in result.indices { result[index].queueCleared = run["questionQueueCleared"].object[result[index].id] != nil }
        return result
    }
}

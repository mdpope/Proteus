import SwiftUI

struct NativeUserQuestionCard: View {
    let question: NativeUserQuestion
    var showHeading = true
    let submit: (String, String) async throws -> Void
    @State private var answer = ""
    @State private var operationID = UUID().uuidString
    @State private var attemptedAnswer: String?
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if showHeading { Text(question.text).font(.subheadline.weight(.semibold)) }
            if question.status == "pending" {
                ForEach(question.choices, id: \.self) { choice in Button(choice) { send(choice) }.buttonStyle(.bordered).disabled(busy) }
                TextField("Your answer", text: $answer, axis: .vertical).textFieldStyle(.roundedBorder).lineLimit(2...6).modifier(ChatReturnKey(text: $answer, submit: { send(answer) })).disabled(busy).accessibilityIdentifier("question-answer-" + question.id)
                Button("Send answer") { send(answer) }.disabled(busy || answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                if busy { ProgressView().controlSize(.small) }
            } else { Text(question.status == "uncertain" ? "Answer delivery unconfirmed. Inspect this session before sending another answer." : question.status.capitalized).font(.caption).foregroundStyle(.secondary) }
            if let error { Text(error).font(.caption).foregroundStyle(.orange) }
        }.padding(.vertical, 12)
    }
    private func send(_ value: String) {
        guard !busy, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        if let attemptedAnswer, attemptedAnswer != value { error = "Refresh this chat to inspect the previous answer before changing it."; return }
        attemptedAnswer = value; answer = value; busy = true; error = nil
        Task { defer { busy = false }; do { try await submit(value, operationID) } catch { self.error = error.localizedDescription } }
    }
}

struct NativeUserQuestionQueue: View {
    let questions: [NativeUserQuestion]
    let select: (NativeUserQuestion) -> Void
    @State private var expanded = false
    private var waiting: [NativeUserQuestion] { questions.filter { ["pending", "sending", "uncertain"].contains($0.status) } }
    var body: some View {
        if !waiting.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Button { expanded.toggle() } label: {
                    HStack { Text("Questions to answer (\(waiting.count))"); Spacer(); Image(systemName: expanded ? "chevron.up" : "chevron.down") }
                }.accessibilityIdentifier("chat-question-queue-toggle").accessibilityValue(expanded ? "Expanded" : "Collapsed")
                if expanded {
                    // Release the list's inset before revealing the answer card,
                    // keeping its controls visible when the keyboard is open.
                    ScrollView { VStack(alignment: .leading, spacing: 10) { ForEach(waiting) { question in Button(question.text) { expanded = false; select(question) }.multilineTextAlignment(.leading) } }.frame(maxWidth: .infinity, alignment: .leading) }.frame(maxHeight: 160)
                }
            }.padding(12).background(NativeTheme.surface).accessibilityElement(children: .contain).accessibilityIdentifier("chat-question-queue")
        }
    }
}

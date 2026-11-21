import SwiftUI
import UIKit

/// Lightweight, dependency-free code coloring: comments, strings, numbers, keywords, types and
/// calls. It is display polish, not a parser; unknown languages stay clean plain text.
enum NativeCodeHighlighter {
    private static let common = "if else for while do switch case default break continue return in of is as new try catch throw throws finally async await let var const func function def class struct enum protocol extension interface import export from package public private protected static final self this super nil null None true false True False and or not with yield lambda pass raise except elif fn impl trait use mod pub mut match loop where type typealias init guard defer override open internal fileprivate some any void int string bool float double char byte"
    static func language(_ value: String) -> String { value.isEmpty ? "text" : value }
    private static func comments(for language: String) -> (line: [String], block: Bool) {
        switch language {
        case "python", "shell", "ruby", "yaml", "toml", "properties", "dockerfile", "perl", "powershell", "r": return (["#"], false)
        case "sql": return (["--"], true)
        case "lua": return (["--"], false)
        case "html", "xml": return ([], false)
        case "css": return ([], true)
        case "json", "text", "markdown", "diff": return ([], false)
        default: return (["//"], true)
        }
    }
    /// Highlights at most 300 KB so a large file never stalls the main thread.
    static func attributed(_ text: String, language: String) -> AttributedString {
        let font = UIFont.monospacedSystemFont(ofSize: 13, weight: .regular)
        let base: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: UIColor.label]
        let value = NSMutableAttributedString(string: text, attributes: base)
        guard text.utf8.count <= 300_000, !["text", "markdown"].contains(language) else { return AttributedString(value) }
        let range = NSRange(location: 0, length: (text as NSString).length)
        func paint(_ pattern: String, _ color: UIColor, options: NSRegularExpression.Options = [], italic: Bool = false) {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else { return }
            regex.enumerateMatches(in: text, range: range) { match, _, _ in
                guard let match else { return }
                value.addAttribute(.foregroundColor, value: color, range: match.range)
                if italic { value.addAttribute(.font, value: UIFont.italicSystemFont(ofSize: 13), range: match.range) }
            }
        }
        let keyword = UIColor(red: 0.78, green: 0.61, blue: 1.0, alpha: 1), string = UIColor(red: 0.73, green: 0.85, blue: 0.55, alpha: 1)
        let number = UIColor(red: 0.95, green: 0.65, blue: 0.47, alpha: 1), comment = UIColor(red: 0.5, green: 0.55, blue: 0.52, alpha: 1)
        let type = UIColor(red: 0.5, green: 0.84, blue: 0.82, alpha: 1), function = UIColor(red: 0.56, green: 0.79, blue: 1.0, alpha: 1)
        // Order matters: later passes overwrite earlier ones, so comments and strings win.
        if language != "json" { paint("\\b(?:" + common.split(separator: " ").joined(separator: "|") + ")\\b", keyword) } else { paint("\\b(?:true|false|null)\\b", keyword) }
        paint("\\b[A-Z][A-Za-z0-9_]*\\b", type)
        paint("\\b[a-z_][A-Za-z0-9_]*(?=\\()", function)
        paint("\\b(?:0x[0-9A-Fa-f]+|\\d+(?:\\.\\d+)?)\\b", number)
        paint("\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`", string)
        let style = comments(for: language)
        for marker in style.line { paint(NSRegularExpression.escapedPattern(for: marker) + ".*$", comment, options: [.anchorsMatchLines], italic: true) }
        if style.block { paint("/\\*[\\s\\S]*?\\*/", comment, italic: true) }
        if language == "html" || language == "xml" { paint("<!--[\\s\\S]*?-->", comment, italic: true); paint("</?[A-Za-z][A-Za-z0-9:-]*", type) }
        return AttributedString(value)
    }
}

/// One viewer for text, code and Markdown on iPhone and iPad: read-only until Edit is chosen,
/// saved through the owner with the identity returned at preview time.
struct NativeTextDocument: View {
    let title: String
    let language: String
    let isMarkdown: Bool
    let content: String
    let editable: Bool
    let save: (String) async throws -> Void
    var paste: (([String: JSON]) async throws -> JSON)? = nil
    var draftStore: Binding<String?>? = nil
    let markdown: () -> AnyView
    @State private var editing = false
    @State private var editCommand: ScratchEditCommand?
    @State private var draft = ""
    @State private var saving = false
    @State private var status = ""
    private var dirty: Bool { editing && draft != content }
    private static let names = ["javascript": "JavaScript", "typescript": "TypeScript", "python": "Python", "swift": "Swift", "json": "JSON", "shell": "Shell", "html": "HTML", "css": "CSS", "yaml": "YAML", "markdown": "Markdown", "text": "Plain text"]
    var body: some View {
        // The bar and the text scroll together as one page, so the document gets the whole height.
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    Text(Self.names[language] ?? language.capitalized).font(.caption.weight(.semibold))
                    Text(status.isEmpty ? (dirty ? "Unsaved changes" : "") : status).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    Spacer()
                    if editing {
                        if isMarkdown, paste != nil { Button("Paste image or PDF", systemImage: "clipboard") { pasteDocumentAsset() }.labelStyle(.iconOnly).disabled(saving) }
                        Button("Discard") { editing = false; draftStore?.wrappedValue = nil; status = "" }.buttonStyle(.bordered).disabled(saving)
                        Button { Task { await commit() } } label: { HStack(spacing: 5) { LifeFloppyDisk().frame(width: 16, height: 16); Text("Save") } }.buttonStyle(.borderedProminent).tint(NativeTheme.accent).disabled(!dirty || saving)
                    } else if editable { Button("Edit", systemImage: "pencil") { draft = content; editing = true; status = "" }.buttonStyle(.bordered).accessibilityIdentifier("file-edit") }
                }.padding(.horizontal, 12).padding(.vertical, 8).font(.callout)
                Divider()
                if editing && isMarkdown {
                    NativeScratchMarkdownEditor(text: $draft, source: true, command: editCommand).frame(minHeight: 420)
                } else if editing {
                    // An invisible copy of the text sizes the editor to its content, so the page (not the editor) scrolls.
                    ZStack(alignment: .topLeading) {
                        Text(draft + "\n").font(.system(.body, design: .monospaced)).padding(.horizontal, 5).padding(.vertical, 8).opacity(0).accessibilityHidden(true)
                        TextEditor(text: $draft).font(.system(.body, design: .monospaced)).autocorrectionDisabled().textInputAutocapitalization(.never).scrollContentBackground(.hidden).scrollDisabled(true)
                    }.padding(.horizontal, 6).frame(maxWidth: .infinity, alignment: .topLeading)
                } else if isMarkdown {
                    markdown().padding(.horizontal, 12).padding(.vertical, 8)
                } else {
                    ScrollView(.horizontal) { Text(NativeCodeHighlighter.attributed(content, language: language)).textSelection(.enabled).padding(12).frame(maxWidth: .infinity, alignment: .leading) }.scrollBounceBehavior(.basedOnSize)
                }
            }.frame(maxWidth: .infinity, alignment: .topLeading)
        }.scrollDismissesKeyboard(.interactively).background(NativeTheme.surface)
            .onAppear { if editable, let saved = draftStore?.wrappedValue { draft = saved; editing = true } }
            .onChange(of: draft) { _, next in if editing { draftStore?.wrappedValue = next == content ? nil : next } }
    }
    private func pasteDocumentAsset() {
        guard let paste else { return }
        NativeAttachmentPaste.read(limit: 1) { item in
            Task {
                do {
                    let file = try await paste(NativeAttachmentPaste.markdownAsset(item.get()))
                    guard editing else { return }
                    editCommand = ScratchEditCommand(before: "![[" + file["name"].string + "]]\n", after: "", replace: true)
                } catch { status = error.localizedDescription }
            }
        }
    }
    private func commit() async {
        saving = true; defer { saving = false }
        do { try await save(draft); editing = false; draftStore?.wrappedValue = nil; status = "Saved" } catch { status = "Not saved · " + error.localizedDescription }
    }
}

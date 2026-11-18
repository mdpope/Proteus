import SwiftUI

struct LifeRemindersView: View {
    @EnvironmentObject var life: LifeStore
    var body: some View { LifeReminderWorkspaceView(workspace: life.reminderWorkspace) }
}
private struct LifeReminderWorkspaceView: View {
    @EnvironmentObject var life: LifeStore
    @ObservedObject var workspace: LifeReminderWorkspace
    @State private var context: JSON = .null
    @State private var refreshID = 0
    @AppStorage("lifeReminderTarget") private var target = ""
    @State private var targetError = ""
    @State private var targetGeneration = UUID()
    var body: some View {
        NativeFeatureWorkspace(title: "Reminders", symbol: "checklist", namespace: "reminders:" + life.accountIdentity,
            records: workspace.tabIDs.map { id in NativeContentTab(id: id, title: workspace.row(id)["title"].string.isEmpty ? "New reminder" : workspace.row(id)["title"].string, kind: "reminder", hostID: nil) },
            selected: $workspace.selected, selectRecord: { workspace.selected = $0 }, closeRecord: workspace.close, addRecord: { workspace.openAll() }) {
                VStack(spacing: 0) {
                    if !targetError.isEmpty { Text(targetError).foregroundStyle(.red).padding() }
                    LifeReminderOverviewView(open: workspace.openResource, browse: { workspace.openAll(listID: $0) })
                }
            } detail: { id in
                LifeReminderWorkbenchView(workspace: workspace.workbench(id), selectedRecord: { workspace.updateTitle(id, record: $0) }).id(id)
            }
        .task(id: life.accountIdentity + "|" + String(refreshID)) {
            let account = life.accountIdentity
            let next = (try? await life.data(section: "reminders", query: [:])) ?? .null
            guard account == life.accountIdentity, !Task.isCancelled else { return }; context = next
            await openTarget()
        }
        .onChange(of: target) { _, _ in Task { await openTarget() } }
    }
    private func openTarget() async {
        guard !target.isEmpty else { return }
        let id = target, account = life.accountIdentity, generation = UUID()
        targetGeneration = generation; target = ""; targetError = ""
        do {
            let value = try await life.data(section: "reminders", query: ["id": .string(id)])
            guard account == life.accountIdentity, generation == targetGeneration, !Task.isCancelled else { return }
            guard value["record"]["id"].string == id else { throw RemoteError(message: "The requested reminder is unavailable.") }
            workspace.openResource(value["record"])
        } catch {
            if account == life.accountIdentity, generation == targetGeneration { targetError = life.display(error) }
        }
    }
}

/// Every work tab owns its filter/selection/drafts. Selecting another item only
/// replaces the details column; it never creates or completes a reminder.
struct LifeReminderWorkbenchView: View {
    @EnvironmentObject private var life: LifeStore
    @ObservedObject var workspace: LifeReminderWorkspace
    var scopeWorkspaceID: String? = nil
    var scopeProjectID: String? = nil
    let selectedRecord: (JSON) -> Void
    @State private var context: JSON = .null
    @State private var error = ""
    var body: some View {
        VStack(spacing: 0) {
            if !error.isEmpty { Text(error).foregroundStyle(.red).padding(12) }
            LifeRemindersList(workspace: workspace, scopeWorkspaceID: scopeWorkspaceID, scopeProjectID: scopeProjectID, open: workspace.open, detail: editor, backToItems: { workspace.selected = "master" })
        }
        .task(id: life.accountIdentity + "|" + String(life.dataRevision)) {
            let account = life.accountIdentity
            do {
                let value = try await life.data(section: "reminders", query: [:])
                guard account == life.accountIdentity, !Task.isCancelled else { return }
                context = value; error = ""
            } catch { self.error = life.display(error) }
        }
        .onChange(of: workspace.selected) { _, id in
            if id != "master" { selectedRecord(workspace.row(id)) }
        }
    }
    private var editor: AnyView? {
        let id = workspace.selected
        guard id != "master", let draft = workspace.drafts[id] else { return nil }
        guard !context["timeZone"].string.isEmpty else { return AnyView(ProgressView("Loading reminder…")) }
        return AnyView(LifeReminderEditor(record: workspace.row(id), lists: context["lists"].array, timeZone: context["timeZone"].string,
            saved: { row in workspace.saved(row, replacing: id); selectedRecord(row) }, draft: draft, close: { workspace.selected = "master" }, staysOpen: true).id(id))
    }
}

private struct LifeReminderOverviewView: View {
    @EnvironmentObject private var life: LifeStore
    let open: (JSON) -> Void
    let browse: (String) -> Void
    @State private var value: JSON = .null
    @State private var completed = 0
    @State private var error = ""
    var body: some View {
        // The same inset list as Scratchpad and the other feature pages: no extra header or oversized buttons.
        List {
            Section {
                Button { browse("") } label: { LabeledContent("Open", value: String(value["total"].int)) }
                Button { browse("") } label: { LabeledContent("Completed", value: String(completed)) }
                Button("All items", systemImage: "list.bullet") { browse("") }
            }.listRowBackground(NativeTheme.surface)
            if !error.isEmpty { Section { Text(error).foregroundStyle(.red); Button("Retry") { Task { await load() } } }.listRowBackground(NativeTheme.surface) }
            if value == .null { Section { ProgressView("Loading reminders…") }.listRowBackground(NativeTheme.surface) }
            else {
                Section("Upcoming and next steps") {
                    if value["items"].array.isEmpty { Text("No open reminders. Add one in All items.").foregroundStyle(.secondary) }
                    ForEach(Array(value["items"].array.prefix(8)), id: \.self) { row in
                        Button { open(row) } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(row["title"].string).foregroundStyle(.primary)
                                Text(row["dueKind"].string == "date" ? row["dueDate"].string + " · date only" : row["dueKind"].string == "datetime" ? row["dueAt"].string : "No due date").font(.caption).foregroundStyle(.secondary)
                            }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                        }.buttonStyle(.borderless).accessibilityLabel(row["title"].string)
                    }
                }.listRowBackground(NativeTheme.surface)
                Section("Lists") {
                    ForEach(value["lists"].array, id: \.self) { row in Button { browse(row["id"].string) } label: { Label(row["name"].string, systemImage: "list.bullet").frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle()) }.buttonStyle(.borderless) }
                }.listRowBackground(NativeTheme.surface)
            }
        }.scrollContentBackground(.hidden).background(NativeTheme.background).refreshable { await load() }.task(id: life.accountIdentity + "|" + String(life.dataRevision)) { await load() }
    }
    private func stat(_ title: String, _ count: Int) -> some View {
        Button { browse("") } label: { VStack(alignment: .leading, spacing: 8) { Text(title).font(.caption).foregroundStyle(.secondary); Text(String(count)).font(.title.bold()).foregroundStyle(NativeTheme.accent) }.frame(maxWidth: .infinity, alignment: .leading).padding(16).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 10)) }.buttonStyle(.plain)
    }
    private func load() async {
        let account = life.accountIdentity
        do {
            async let next = life.data(section: "reminders", query: ["completed": .string("open"), "sort": .string("due")])
            async let done = life.data(section: "reminders", query: ["completed": .string("completed")])
            let (items, finished) = try await (next, done)
            guard account == life.accountIdentity, !Task.isCancelled else { return }
            value = items; completed = finished["total"].int; error = ""
        } catch { self.error = life.display(error) }
    }
}

struct LifeRemindersList: View {
    @ObservedObject var workspace: LifeReminderWorkspace
    /// A hard scope (a workspace or project page): lists, queries and new reminders never leave it.
    var scopeWorkspaceID: String? = nil
    var scopeProjectID: String? = nil
    let open: (JSON) -> Void
    var detail: AnyView? = nil
    var backToItems: (() -> Void)? = nil
    @EnvironmentObject var life: LifeStore
    @State private var value: JSON = .null
    private var listID: String { get { workspace.listID } nonmutating set { workspace.listID = newValue } }
    private var completed: String { get { workspace.completed } nonmutating set { workspace.completed = newValue } }
    private var sort: String { get { workspace.sort } nonmutating set { workspace.sort = newValue } }
    private var deleted: Bool { get { workspace.deleted } nonmutating set { workspace.deleted = newValue } }
    private var page: Int { get { workspace.page } nonmutating set { workspace.page = newValue } }
    @State private var error = ""
    @State private var busy = false
    private var pending: (String, [String: JSON], String)? { get { workspace.pending } nonmutating set { workspace.pending = newValue } }
    @State private var editing: JSON?
    @State private var listName = ""
    @State private var listDialog = false
    @State private var rename = false
    @Environment(\.scenePhase) private var phase
    @Environment(\.nativePhoneAreaActive) private var areaActive
    @State private var listsExpanded = false
    var body: some View {
        GeometryReader { geometry in
            let wide = geometry.size.width >= 800
            let split = geometry.size.width >= 560
            let railWidth: CGFloat = 160
            let available = geometry.size.width - (wide ? railWidth + 1 : 0)
            let itemsWidth = max(250, available * 0.46)
            HStack(alignment: .top, spacing: 0) {
                if wide {
                    ScrollView { VStack(alignment: .leading, spacing: 12) { Text("Lists").font(.subheadline.weight(.semibold)).foregroundStyle(.secondary).padding(.horizontal, 12); listsPanel }.padding(16) }.frame(width: railWidth).background(NativeTheme.rail)
                    Divider()
                }
                if split || detail == nil {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        if !wide {
                            DisclosureGroup("Lists", isExpanded: $listsExpanded) { listsPanel.padding(.top, 10) }.font(.subheadline.weight(.medium))
                        }
                        HStack {
                            VStack(alignment: .leading, spacing: 5) { Text(listID.isEmpty ? "All Items" : value["lists"].array.first { $0["id"].string == listID }?["name"].string ?? "Reminders").font(.headline).lineLimit(1) }
                            Spacer()
                            Button { editing = .object(["title": .string(""), "notes": .string(""), "listId": .string(listID.isEmpty ? value["inboxId"].string : listID), "workspaceId": scopeWorkspaceID.map { .string($0) } ?? .null, "projectId": scopeProjectID.map { .string($0) } ?? .null, "dueKind": .string("none")]) } label: { Label("New", systemImage: "plus") }.buttonStyle(.bordered).controlSize(.small).accessibilityLabel("New reminder").disabled(value == .null)
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                            ForEach(["open", "completed", "deleted"], id: \.self) { status in
                                Toggle(isOn: Binding(get: { workspace.statuses.contains(status) }, set: { enabled in
                                    var next = workspace.statuses; if enabled { next.insert(status) } else { next.remove(status) }; workspace.statuses = next; page = 1
                                })) { Image(systemName: status == "open" ? "circle" : status == "completed" ? "checkmark" : "trash").frame(width: 28, height: 30) }
                                .toggleStyle(.button).tint(NativeTheme.accent).accessibilityLabel(status.capitalized).accessibilityIdentifier("reminder-status-" + status)

                            }
                            }
                            HStack {
                            Picker("Sort", selection: $workspace.sort) { Text("Due date").tag("due"); Text("Date added").tag("created"); Text("List").tag("list"); Text("Title").tag("title") }.pickerStyle(.menu).fixedSize(horizontal: true, vertical: false).accessibilityIdentifier("reminder-sort")
                            Spacer(minLength: 4)
                            Menu {

                                Button("New list") { listName = ""; rename = false; listDialog = true }
                                if !listID.isEmpty && listID != value["inboxId"].string {
                                    Button("Rename list") { listName = value["lists"].array.first { $0["id"].string == listID }?["name"].string ?? ""; rename = true; listDialog = true }
                                    Button("Delete list; move reminders to Inbox", role: .destructive) { if let row = value["lists"].array.first(where: { $0["id"].string == listID }) { Task { await mutate("list.delete", row: row); listID = "" } } }
                                }
                            } label: { Image(systemName: "ellipsis.circle").frame(width: 36, height: 40) }.accessibilityLabel("Reminder options")
                            }
                        }.labelsHidden().font(.caption).disabled(busy)
                        if !error.isEmpty { Text(error).foregroundStyle(.red); if let op = pending { Button("Retry save") { Task { await write(op.0, fields: op.1) } }.disabled(busy) } }
                        if value == .null { ProgressView("Loading reminders…").frame(maxWidth: .infinity) }
                        else if value["items"].array.isEmpty {
                            VStack(spacing: 12) { Image(systemName: "checkmark.circle").font(.system(size: 36)).foregroundStyle(NativeTheme.accent); Text(workspace.statuses == ["completed"] ? "No completed reminders" : "A little room to breathe").font(.headline); Text("No reminders match this view. Change the list or Status filter to see other items.").font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center) }.frame(maxWidth: .infinity).padding(.vertical, 40).padding(.horizontal, 16).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                        } else {
                            LazyVGrid(columns: [GridItem(.flexible(minimum: 0), spacing: 12)], spacing: 12) { ForEach(value["items"].array, id: \.self) { row in reminderCard(row) } }
                        }
                        HStack { Button("Previous") { page -= 1 }.disabled(page <= 1); Spacer(); Text("Page \(page)").font(.caption).foregroundStyle(.secondary); Spacer(); Button("Next") { page += 1 }.disabled(page * 100 >= value["total"].int) }.buttonStyle(.bordered)
                    }.frame(width: split ? max(0, itemsWidth - 24) : max(0, geometry.size.width - 32), alignment: .leading).padding(split ? 12 : 16)
                }.frame(width: split ? itemsWidth : nil, alignment: .leading).clipped().refreshable { await load() }
                }
                if split || detail != nil {
                    if split { Divider() }
                    VStack(spacing: 0) {
                        if !split { HStack { Button("Items", systemImage: "chevron.left") { backToItems?() }; Spacer() }.padding(12) }
                        if let detail { detail }
                        else { ContentUnavailableView("Choose a reminder", systemImage: "checklist", description: Text("Select an item or add one to this list.")) }
                    }.frame(minWidth: split ? 280 : 0, maxWidth: .infinity)
                    .simultaneousGesture(DragGesture(minimumDistance: 24).onEnded { value in
                        guard !split, detail != nil, value.startLocation.x < 32, value.translation.width > 70, abs(value.translation.height) < value.translation.width / 2 else { return }
                        backToItems?()
                    })
                }
            }
        }.background(NativeTheme.background).navigationTitle(NativeDesignPreview.enabled ? "" : "Reminders")
        .task(id: "\(life.accountIdentity)|\(life.dataRevision)|\(listID)|\(workspace.statuses.sorted())|\(sort)|\(deleted)|\(page)|\(areaActive)") { await load() }
        .onChange(of: phase) { _, next in if next == .active && editing == nil { Task { await load() } } }
        .task {
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
                if phase == .active && editing == nil && pending == nil { await load() }
            }
        }
        .onChange(of: editing) { _, row in
            if let row { open(row); editing = nil }
        }
        .alert(rename ? "Rename list" : "New list", isPresented: $listDialog) {
            TextField("List name", text: $listName)
            Button("Save") { Task {
                var fields: [String: JSON] = ["name": .string(listName)]
                if rename, let row = value["lists"].array.first(where: { $0["id"].string == listID }) { fields["id"] = row["id"]; fields["expectedRevision"] = row["revision"] }
                await write(rename ? "list.update" : "list.create", fields: fields)
            } }
            Button("Cancel", role: .cancel) {}
        }
    }
    private var listsPanel: some View {
        VStack(spacing: 6) {
            listButton(id: "", name: "All Items", symbol: "square.grid.2x2")
            ForEach(value["lists"].array, id: \.self) { row in listButton(id: row["id"].string, name: row["name"].string, symbol: listSymbol(row["name"].string)) }
            Button("New list", systemImage: "plus") { listName = ""; rename = false; listDialog = true }.font(.subheadline).frame(maxWidth: .infinity, alignment: .leading).padding(12)
        }.buttonStyle(.borderless)
    }
    private func listSymbol(_ name: String) -> String {
        let name = name.lowercased()
        if name.contains("inbox") { return "tray" }
        if name.contains("shop") || name.contains("grocer") { return "basket" }
        if name.contains("work") { return "briefcase" }
        if name.contains("home") || name.contains("personal") { return "house" }
        if name.contains("idea") { return "lightbulb" }
        return "list.bullet"
    }
    private func listColor(_ id: String) -> Color {
        let tones: [Color] = [NativeTheme.accent, Color(red: 0.45, green: 0.66, blue: 0.76), Color(red: 0.70, green: 0.58, blue: 0.78), Color(red: 0.80, green: 0.68, blue: 0.47), Color(red: 0.51, green: 0.73, blue: 0.65)]
        return tones[id.utf8.reduce(0) { ($0 * 31 + Int($1)) % 5 }]
    }
    private func listButton(id: String, name: String, symbol: String) -> some View {
        Button { listID = id; page = 1; listsExpanded = false } label: {
            HStack(spacing: 10) { Image(systemName: symbol).frame(width: 30, height: 30).foregroundStyle(listColor(id)).background(listColor(id).opacity(0.12), in: RoundedRectangle(cornerRadius: 8)); Text(name).font(.subheadline.weight(listID == id ? .semibold : .regular)); Spacer() }.padding(8).contentShape(Rectangle()).foregroundStyle(.primary).background(listID == id ? NativeTheme.surface : .clear, in: RoundedRectangle(cornerRadius: 9))
        }.accessibilityLabel(name).accessibilityValue(listID == id ? "Selected" : "")
    }
    private func reminderCard(_ row: JSON) -> some View {
        let completed = row["completedAt"] != .null, removed = row["deletedAt"] != .null
        let listName = value["lists"].array.first { $0["id"] == row["listId"] }?["name"].string ?? "Inbox"
        return HStack(alignment: .top, spacing: 12) {
            Button { Task { await mutate(removed ? "restore" : completed ? "reopen" : "complete", row: row) } } label: {
                Image(systemName: removed ? "arrow.uturn.backward.circle" : completed ? "checkmark.circle.fill" : "circle").font(.system(size: 25, weight: .light)).foregroundStyle(completed ? NativeTheme.accent : .secondary).frame(width: 32, height: 36)
            }.accessibilityLabel(removed ? "Restore" : completed ? "Reopen" : "Complete").disabled(busy)
            Button { editing = row } label: { VStack(alignment: .leading, spacing: 8) {
                Text(row["title"].string).font(.headline).foregroundStyle(completed ? .secondary : .primary).strikethrough(completed).frame(maxWidth: .infinity, alignment: .leading).multilineTextAlignment(.leading)
                if !row["notes"].string.isEmpty { Text(row["notes"].string).font(.callout).foregroundStyle(.secondary).lineLimit(3) }
                Label(listName, systemImage: listSymbol(listName)).font(.caption).foregroundStyle(listColor(row["listId"].string))
                Text(due(row)).font(.caption).foregroundStyle(.secondary)
            }.padding(.top, 5).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle()) }.accessibilityLabel(row["title"].string).accessibilityIdentifier("reminder-item-" + row["id"].string)
        }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(workspace.selected == row["id"].string ? NativeTheme.accent.opacity(0.12) : NativeTheme.surface, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(workspace.selected == row["id"].string ? NativeTheme.accent : NativeTheme.line, lineWidth: 1)).buttonStyle(.borderless)
    }
    private func due(_ row: JSON) -> String {
        if row["dueKind"].string == "date" { return row["dueDate"].string + " · date only, no timed alert" }
        if row["dueKind"].string == "datetime" { return ISO8601DateFormatter().date(from: row["dueAt"].string)?.formatted(date: .abbreviated, time: .shortened) ?? row["dueAt"].string }
        return "No due date"
    }
    private func load() async {
        guard areaActive else { return }
        let account = life.accountIdentity
        do {
            let selected = workspace.statuses
            var groups: [(String, Bool)] = []
            if selected.contains("open") || selected.contains("completed") { groups.append((selected.contains("open") && selected.contains("completed") ? "all" : selected.contains("open") ? "open" : "completed", false)) }
            if selected.contains("deleted") { groups.append(("all", true)) }
            var result: JSON = .null, rows: [JSON] = [], total = 0
            for group in groups.isEmpty ? [("open", false)] : groups {
                for index in 1...(groups.count > 1 ? page : 1) {
                    var query: [String: JSON] = ["completed": .string(group.0), "sort": .string(sort), "deleted": .bool(group.1), "page": .number(Double(groups.count > 1 ? index : page))]
                    if !listID.isEmpty { query["listId"] = .string(listID) }
                    if let scopeProjectID { query["projectId"] = .string(scopeProjectID) } else if let scopeWorkspaceID { query["workspaceId"] = .string(scopeWorkspaceID) }
                    let next = try await life.data(section: "reminders", query: query)
                    guard account == life.accountIdentity, !Task.isCancelled else { return }
                    if result == .null { result = next }
                    rows += next["items"].array
                    if index == 1 { total += next["total"].int }
                }
            }
            if groups.count > 1 {
                func key(_ row: JSON) -> String {
                    switch sort { case "title": return row["title"].string; case "created": return row["createdAt"].string; case "list": return result["lists"].array.first { $0["id"] == row["listId"] }?["name"].string ?? ""; default: return row["dueDate"].string.isEmpty ? (row["dueAt"].string.isEmpty ? "9999" : row["dueAt"].string) : row["dueDate"].string }
                }
                rows.sort { key($0) == key($1) ? $0["id"].string < $1["id"].string : key($0).localizedStandardCompare(key($1)) == .orderedAscending }
                rows = Array(rows.dropFirst((page - 1) * 100).prefix(100))
            }
            var fields = result.object; fields["items"] = .array(selected.isEmpty ? [] : rows); fields["total"] = .number(Double(selected.isEmpty ? 0 : total))
            value = .object(fields); error = ""
        } catch { self.error = error.localizedDescription }
    }
    private func mutate(_ action: String, row: JSON) async { await write(action, fields: ["id": row["id"], "expectedRevision": row["revision"]]) }
    private func write(_ action: String, fields: [String: JSON]) async {
        guard !busy else { return }; busy = true; defer { busy = false }
        if let op = pending, op.0 != action || op.1 != fields { error = "Retry the unconfirmed save first."; return }
        pending = pending ?? (action, fields, UUID().uuidString)
        do { _ = try await life.action("reminders." + action, input: fields, idempotencyKey: pending!.2); pending = nil; await load() }
        catch { if let http = error as? LifeHTTPError, [404, 409, 422].contains(http.status) { pending = nil }; self.error = life.display(error) }
    }
}
private struct ReminderEditorItem: Identifiable { let value: JSON; var id: String { value["id"].string.isEmpty ? "new" : value["id"].string } }

struct LifeReminderEditor: View {
    @EnvironmentObject var life: LifeStore
    @Environment(\.dismiss) private var dismiss
    let record: JSON
    let lists: [JSON]
    let timeZone: String
    let saved: (JSON) -> Void
    @EnvironmentObject private var destinations: DestinationStore
    @ObservedObject var draft: LifeReminderDraft
    let close: () -> Void
    var staysOpen = false
    private var title: String { get { draft.title } nonmutating set { draft.title = newValue } }
    private var notes: String { get { draft.notes } nonmutating set { draft.notes = newValue } }
    private var listID: String { get { draft.listID } nonmutating set { draft.listID = newValue } }
    private var dueKind: String { get { draft.dueKind } nonmutating set { draft.dueKind = newValue } }
    private var dueDate: String { get { draft.dueDate } nonmutating set { draft.dueDate = newValue } }
    private var dueAt: String { get { draft.dueAt } nonmutating set { draft.dueAt = newValue } }
    private var chosenDate: Date { get { draft.chosenDate } nonmutating set { draft.chosenDate = newValue } }
    private var zone: String { get { draft.zone } nonmutating set { draft.zone = newValue } }
    private var error: String { get { draft.error } nonmutating set { draft.error = newValue } }
    private var busy: Bool { get { draft.busy } nonmutating set { draft.busy = newValue } }
    private var operation: (String, [String: JSON], String)? { get { draft.operation } nonmutating set { draft.operation = newValue } }
    private var account: String { get { draft.account } nonmutating set { draft.account = newValue } }
    private var currentRecord: JSON { draft.savedRecord == .null ? record : draft.savedRecord }
    private var reminderScopes: LifeReminderScopes { LifeReminderScopes(destinations) }
    var body: some View {
        Form {
            Section {
                HStack(alignment: .firstTextBaseline) { Text(currentRecord["id"].string.isEmpty ? "New reminder" : "Edit reminder").font(.title3.weight(.semibold)); Text(busy ? "Saving…" : hasEdits ? "Unsaved" : "Saved").font(.caption).foregroundStyle(.secondary) }
                TextField("Title", text: $draft.title).font(.title3.weight(.medium))
                TextField("Notes", text: $draft.notes, axis: .vertical)
                Picker("List", selection: $draft.listID) { ForEach(lists, id: \.self) { row in Text(row["name"].string).tag(row["id"].string) } }
                Picker("Workspace", selection: $draft.workspaceID) { Text("No workspace").tag(""); ForEach(reminderScopes.workspaces, id: \.id) { Text($0.name).tag($0.id) } }.onChange(of: draft.workspaceID) { _, next in if !reminderScopes.projects.contains(where: { $0.id == draft.projectID && $0.workspaceID == next }) { draft.projectID = "" } }
                Picker("Project", selection: $draft.projectID) { Text("No project").tag(""); ForEach(reminderScopes.projects.filter { $0.workspaceID == draft.workspaceID }, id: \.id) { Text($0.name).tag($0.id) } }.disabled(draft.workspaceID.isEmpty)
                Picker("Due", selection: $draft.dueKind) { Text("No due date").tag("none"); Text("Date only").tag("date"); Text("Date and time").tag("datetime") }
                if dueKind == "date" { DatePicker("Due date", selection: $draft.chosenDate, displayedComponents: .date).environment(\.timeZone, TimeZone(identifier: zone) ?? .current); Text("Date only; no timed alert.").font(.caption) }
                if dueKind == "datetime" { DatePicker("Due", selection: $draft.chosenDate, displayedComponents: [.date, .hourAndMinute]).environment(\.timeZone, TimeZone(identifier: zone) ?? .current); Text("The due alert uses the saved local time.").font(.caption) }
            }.listRowBackground(NativeTheme.surface).disabled(busy || operation != nil)
            if !error.isEmpty { Text(error).foregroundStyle(.red) }
            HStack {
                if !currentRecord["id"].string.isEmpty && operation == nil {
                    Button("Delete", systemImage: "trash", role: .destructive) { Task { await save(delete: true) } }.labelStyle(.iconOnly).disabled(busy || hasEdits)
                    Button(currentRecord["deletedAt"] != .null ? "Restore" : currentRecord["completedAt"] == .null ? "Complete" : "Reopen", systemImage: currentRecord["completedAt"] == .null ? "checkmark" : "arrow.uturn.backward") { Task { await changeCompletion() } }.labelStyle(.iconOnly).disabled(busy || hasEdits)
                }
                Button("Cancel edits", systemImage: "arrow.uturn.backward") { restoreDraft() }.labelStyle(.iconOnly).disabled(busy || operation != nil)
                Spacer()
                // Save sits at the trailing edge: a disk icon with its name beside it.
                Button { Task { await save() } } label: { HStack(spacing: 6) { LifeFloppyDisk().frame(width: 18, height: 18); Text(operation == nil ? "Save" : "Retry same save") } }
                    .buttonStyle(.borderedProminent).tint(NativeTheme.accent).disabled(busy || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Save").accessibilityIdentifier("reminder-save")
            }.buttonStyle(.borderless).listRowBackground(NativeTheme.surface)
        }.scrollContentBackground(.hidden).background(NativeTheme.background).navigationTitle(NativeDesignPreview.enabled ? "" : currentRecord["id"].string.isEmpty ? "New reminder" : "Reminder")
        .toolbar { Button("Close") { close() } }
        .onAppear {
            guard !draft.loaded else { return }; draft.loaded = true
            restoreDraft()
        }
    }
    private var hasEdits: Bool {
        guard draft.loaded else { return false }
        if title != currentRecord["title"].string || notes != currentRecord["notes"].string || listID != currentRecord["listId"].string || draft.workspaceID != currentRecord["workspaceId"].string || draft.projectID != currentRecord["projectId"].string || dueKind != currentRecord["dueKind"].string { return true }
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(identifier: zone); formatter.dateFormat = "yyyy-MM-dd"
        if dueKind == "date" { return formatter.string(from: chosenDate) != currentRecord["dueDate"].string }
        if dueKind == "datetime" { return abs(chosenDate.timeIntervalSince(ISO8601DateFormatter().date(from: currentRecord["dueAt"].string) ?? .distantPast)) >= 60 }
        return false
    }
    private func changeCompletion() async {
        guard !busy, !hasEdits, account == life.accountIdentity else { return }
        busy = true; defer { busy = false }
        if operation == nil { operation = (currentRecord["deletedAt"] != .null ? "restore" : currentRecord["completedAt"] == .null ? "complete" : "reopen", ["id": currentRecord["id"], "expectedRevision": currentRecord["revision"]], UUID().uuidString) }
        guard let op = operation else { return }
        do { let result = try await life.action("reminders." + op.0, input: op.1, idempotencyKey: op.2); draft.savedRecord = result["record"]; operation = nil; saved(result["record"]) }
        catch { if let http = error as? LifeHTTPError, [404, 409, 422].contains(http.status) { operation = nil }; self.error = life.display(error) }
    }
    private func restoreDraft() {
            error = ""
            account = life.accountIdentity; title = currentRecord["title"].string; notes = currentRecord["notes"].string; listID = currentRecord["listId"].string; draft.workspaceID = currentRecord["workspaceId"].string; draft.projectID = currentRecord["projectId"].string
            dueKind = currentRecord["dueKind"].string; dueDate = currentRecord["dueDate"].string; dueAt = currentRecord["dueAt"].string; zone = currentRecord["timeZone"].string.isEmpty ? timeZone : currentRecord["timeZone"].string
            let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(identifier: zone); formatter.dateFormat = "yyyy-MM-dd"
            chosenDate = ISO8601DateFormatter().date(from: dueAt) ?? formatter.date(from: dueDate) ?? Date()
    }
    private func save(delete: Bool = false) async {
        guard !busy, account == life.accountIdentity else { error = "Life account changed. Reopen this reminder."; return }
        busy = true; defer { busy = false }
        if operation == nil {
            guard let timeZone = TimeZone(identifier: zone) else { error = "Choose a valid timezone."; return }
            let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = timeZone; formatter.dateFormat = "yyyy-MM-dd"
            dueDate = formatter.string(from: chosenDate); dueAt = ISO8601DateFormatter().string(from: chosenDate)
            var fields: [String: JSON] = ["title": .string(title), "notes": .string(notes), "listId": .string(listID), "workspaceId": draft.workspaceID.isEmpty ? .null : .string(draft.workspaceID), "projectId": draft.workspaceID.isEmpty || draft.projectID.isEmpty ? .null : .string(draft.projectID), "dueKind": .string(dueKind), "dueDate": dueKind == "date" ? .string(dueDate) : .null, "dueAt": dueKind == "datetime" ? .string(dueAt) : .null, "timeZone": dueKind == "datetime" ? .string(zone) : .null]
            if !currentRecord["id"].string.isEmpty { fields["id"] = currentRecord["id"]; fields["expectedRevision"] = currentRecord["revision"] }
            operation = (delete ? "delete" : currentRecord["id"].string.isEmpty ? "create" : "update", fields, UUID().uuidString)
        }
        guard let op = operation else { return }
        do { let result = try await life.action("reminders." + op.0, input: op.1, idempotencyKey: op.2); draft.savedRecord = result["record"]; operation = nil; saved(result["record"]); if !staysOpen { close() } }
        catch { if let http = error as? LifeHTTPError, [404, 409, 422].contains(http.status) { operation = nil }; self.error = life.display(error) }
    }
}

/// The classic save disk, drawn to match the desktop glyph.
struct LifeFloppyDisk: View {
    var body: some View {
        Canvas { context, size in
            let unit = min(size.width, size.height) / 24
            func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * unit, y: y * unit) }
            var body = Path(); body.move(to: point(4, 3)); body.addLine(to: point(17, 3)); body.addLine(to: point(21, 7)); body.addLine(to: point(21, 21)); body.addLine(to: point(3, 21)); body.addLine(to: point(3, 3)); body.closeSubpath()
            var label = Path(); label.move(to: point(7, 3)); label.addLine(to: point(7, 9)); label.addLine(to: point(17, 9)); label.addLine(to: point(17, 3))
            var slot = Path(); slot.move(to: point(7, 21)); slot.addLine(to: point(7, 13)); slot.addLine(to: point(17, 13)); slot.addLine(to: point(17, 21))
            for path in [body, label, slot] { context.stroke(path, with: .foreground, style: StrokeStyle(lineWidth: 1.8 * unit, lineCap: .round, lineJoin: .round)) }
        }.accessibilityHidden(true)
    }
}

/// Every workspace and project this app can reach, for associating a reminder. Only ids are stored.
struct LifeReminderScopes {
    struct Workspace: Hashable { let id: String; let name: String }
    struct Project: Hashable { let id: String; let name: String; let workspaceID: String }
    let workspaces: [Workspace]
    let projects: [Project]
    @MainActor init(_ destinations: DestinationStore) {
        var workspaces: [Workspace] = [], projects: [Project] = [], seen = Set<String>()
        let multiple = destinations.destinations.count > 1
        for destination in destinations.destinations {
            guard let remote = destinations.remote(for: destination.id) else { continue }
            for row in remote.stateValue("context")["workspaces"].array where !seen.contains(row["id"].string) {
                seen.insert(row["id"].string); workspaces.append(Workspace(id: row["id"].string, name: row["name"].string + (multiple ? " · " + destination.label : "")))
                for project in remote.projectCatalog.projects(in: row["id"].string) { projects.append(Project(id: project["id"].string, name: project["name"].string, workspaceID: row["id"].string)) }
            }
        }
        self.workspaces = workspaces; self.projects = projects
    }
}

/// A workspace or project Reminders page: its own workbench, hard-filtered to that location.
struct LifeScopedRemindersView: View {
    let workspaceID: String
    var projectID: String? = nil
    @StateObject private var workspace = LifeReminderWorkspace()
    var body: some View {
        LifeReminderWorkbenchView(workspace: workspace, scopeWorkspaceID: workspaceID, scopeProjectID: projectID, selectedRecord: { _ in }).id((projectID ?? workspaceID))
    }
}

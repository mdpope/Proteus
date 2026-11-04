import SwiftUI
import WebKit
import Security
import CryptoKit

private struct TeamListEditorItem: Identifiable { let id: String; let original: JSON }
struct TeamToolsView: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject private var phoneChrome: NativePhoneChrome
    @EnvironmentObject var destinations: DestinationStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @AppStorage("nativeTeamSection") private var section = "Overview"
    @State private var docked = false
    @State private var popout = false
    @State private var reorderTabs = false
    @State private var editingList: TeamListEditorItem?
    @State private var renameBrowserID: String?
    @State private var renameBrowserTitle = ""
    private var authorized: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-browser-workspace") || ProcessInfo.processInfo.arguments.contains("--synthetic-team-lists") { return true }
        #endif
        return life.credential?.appAuthorized == true
    }
    var body: some View { Group { if NativeDesignPreview.enabled { NativeTeamDesignView().id(life.accountIdentity) } else { legacy } } }
    private var legacy: some View {
        NavigationStack {
            if !authorized && destinations.selected == nil { SharedAccountView() }
            else {
                VStack(spacing: 0) {
                    if !NativePhonePreview.enabled || !phoneChrome.controlsHidden { HStack(spacing: 0) { ScrollView(.horizontal) { HStack(spacing: 0) {
                        ForEach(["Overview", "Standup"], id: \.self) { name in
                            Button { section = name } label: { NativeContentTabLabel(title: name, symbol: name == "Standup" ? "person.3" : "list.bullet.rectangle") }.padding(.horizontal, 14).padding(.vertical, 12).accessibilityIdentifier("team-section-" + name.lowercased()).accessibilityLabel(name)
                                .overlay(alignment: .bottom) { Rectangle().fill(section == name ? NativeTheme.accent : .clear).frame(height: 2) }
                            Divider().frame(height: 24)
                        }
                        ForEach(shared.tabs(in: "team").filter { !$0.hidden }) { tab in
                            HStack(spacing: 4) {
                                Button { shared.select(tab.id, in: "team"); section = tab.id } label: { Label(shared.browserLabel(tab), systemImage: "globe").lineLimit(1).frame(minHeight: 44).contentShape(Rectangle()) }.frame(minHeight: 44).accessibilityIdentifier("browser-tab-select-" + tab.id).accessibilityValue(section == tab.id ? "Active" : "Inactive")
                                Button { shared.close(tab.id); if section == tab.id { section = shared.selectedBrowser ?? "Overview" } } label: { Image(systemName: "xmark").font(.caption2).frame(width: 44, height: 44) }.accessibilityLabel("Close " + tab.title)
                            }.padding(.leading, 12).overlay(alignment: .bottom) { Rectangle().fill(section == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                            .contextMenu {
                                Button(tab.persist ? "Do not persist tab" : "Persist tab", systemImage: "pin") { shared.persistBrowser(tab.id, enabled: !tab.persist) }
                                Button("Rename tab", systemImage: "pencil") { renameBrowserID = tab.id; renameBrowserTitle = tab.title }
                                Button("Move left", systemImage: "arrow.left") { shared.shiftBrowser(tab.id, by: -1) }
                                Button("Move right", systemImage: "arrow.right") { shared.shiftBrowser(tab.id, by: 1) }
                            }
                            Divider().frame(height: 24)
                        }
                    }.buttonStyle(.plain) }.scrollIndicators(.hidden)
                        Button { shared.open(nil, scope: "team"); section = shared.selectedBrowser ?? "Overview" } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add Team tab").accessibilityIdentifier("team-new-browser-tab")
                        Button { reorderTabs = true } label: { Image(systemName: "arrow.left.arrow.right").frame(width: 44, height: 44) }.accessibilityLabel("Reorder Team tabs").disabled(shared.tabs(in: "team").count < 2)
                        if sizeClass == .regular { Button(docked ? "Undock standup" : "Dock standup", systemImage: "sidebar.left") { docked.toggle() }.padding(8) }

                    }.nativeTabBar()
                    Divider() }
                    HStack(spacing: 0) {
                        if docked && sizeClass == .regular { StandupView().frame(width: 300); Divider() }
                        Group { if section == "Standup" { VStack(spacing: 0) { Button("Open standup", systemImage: "rectangle.portrait.and.arrow.right") { popout = true }.frame(minHeight: 44); if !docked { StandupView() } else { Text("Standup is docked").font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity) } } } else if shared.tabs(in: "team").contains(where: { $0.id == section }) { TeamBrowserView(scope: "team", showTabs: false, tabID: section) } else { if authorized { overview } else { SharedAccountView() } } }
                    }
                }.background(NativeTheme.background).navigationTitle("Team Tools").navigationBarTitleDisplayMode(.inline)
                    .toolbar(NativePhonePreview.enabled && phoneChrome.controlsHidden ? .hidden : .automatic, for: .navigationBar)
                    .alert("Rename tab", isPresented: Binding(get: { renameBrowserID != nil }, set: { if !$0 { renameBrowserID = nil } })) {
                        TextField("Tab name", text: $renameBrowserTitle)
                        Button("Save") { if let id = renameBrowserID { shared.renameBrowser(id, title: renameBrowserTitle) }; renameBrowserID = nil }
                        Button("Cancel", role: .cancel) { renameBrowserID = nil }
                    }
                    .sheet(item: $editingList) { selection in TeamListEditor(original: selection.original).id(selection.id) }
                    .sheet(isPresented: $popout) { NavigationStack { StandupView().navigationTitle("Standup").toolbar { Button("Done") { popout = false } } } }
                    .sheet(isPresented: $reorderTabs) { NativeTabReorderSheet(items: shared.tabs(in: "team").map { (id: $0.id, title: $0.title) }) { ids in shared.reorderBrowsers(ids, in: "team") } }
                    .onAppear { if section == "Browser" { section = shared.selectedBrowser ?? "Overview" } }
                    .onChange(of: shared.selectedBrowser) { _, value in if let value { section = value } else if section != "Overview" && section != "Standup" { section = "Overview" } }
            }
        }.task { await shared.refresh(life) }
        .task(id: destinations.selectedID) {
            while !Task.isCancelled {
                if let host = destinations.selectedID, let remote = destinations.remote(for: host) { await shared.refreshTeamBrowserTabs(remote) }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }
    private var overview: some View {
        NativeList {
            Button("Refresh Team lists", systemImage: "arrow.clockwise") { Task { await shared.refresh(life) } }
            Section { Text("Shared lists and links belong to your authenticated website account.").font(.caption).foregroundStyle(.secondary); if let error = shared.error { Text(error).foregroundStyle(.orange) } }
            Section("Team lists") { ForEach(shared.lists, id: \.self) { list in Button { editingList = TeamListEditorItem(id: list["id"].string, original: list) } label: { VStack(alignment: .leading) { Text(list["name"].string); Text("\(list["members"].array.count) people · \(list["links"].array.count) links").font(.caption).foregroundStyle(.secondary) } } }; Button("Create team list", systemImage: "plus") { editingList = TeamListEditorItem(id: "new", original: .null) } }
            Section("Shared links") { ForEach(shared.snapshot["links"].array, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string); section = shared.selectedBrowser ?? "Overview" } } } }
        }
    }
}
struct TeamListEditor: View {
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    let original: JSON
    @State private var instructions = ""
    @State private var timezone = "UTC"
    @State private var name = ""
    @State private var member = ""
    @State private var mode = "random"
    @State private var title = ""
    @State private var url = ""
    @State private var members: [JSON] = []
    @State private var links: [JSON] = []
    @State private var saving = false
    var body: some View {
        NavigationStack {
            NativeForm {
                TextField("List name", text: $name).accessibilityIdentifier("standup-list-name")
                TextField("Instructions", text: $instructions, axis: .vertical).lineLimit(3...8).accessibilityIdentifier("standup-list-instructions")
                TextField("Time zone", text: $timezone).textInputAutocapitalization(.never).autocorrectionDisabled()
                Section("Roster") { ForEach(members.indices, id: \.self) { index in
                    VStack(alignment: .leading) {
                        TextField("Person name", text: Binding(get: { members[index]["name"].string }, set: { value in var fields = members[index].object; fields["name"] = .string(value); members[index] = .object(fields) })).accessibilityIdentifier("standup-member-" + members[index]["id"].string)
                        Picker("Position", selection: Binding(get: { members[index]["mode"].string }, set: { value in var fields = members[index].object; fields["mode"] = .string(value); members[index] = .object(fields) })) { Text("Random").tag("random"); Text("Fixed").tag("fixed") }.font(.caption)
                    }
                }.onDelete { members.remove(atOffsets: $0) }.onMove { members.move(fromOffsets: $0, toOffset: $1) }; TextField("Person", text: $member); Picker("Order", selection: $mode) { Text("Random").tag("random"); Text("Fixed").tag("fixed") }; Button("Add person") { members.append(.object(["id": .string(UUID().uuidString.lowercased()), "name": .string(member.trimmingCharacters(in: .whitespacesAndNewlines)), "mode": .string(mode)])); member = "" }.disabled(member.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
                if !NativeDesignPreview.enabled { Section("Standup links") { ForEach(links, id: \.self) { item in Text(item["title"].string) }.onDelete { links.remove(atOffsets: $0) }; TextField("Link title", text: $title); TextField("https://…", text: $url).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled(); Button("Add link") { if let safe = SharedAppStore.safeURL(url) { links.append(.object(["id": .string(UUID().uuidString.lowercased()), "title": .string(title), "url": .string(safe.absoluteString)])); title = ""; url = "" } }.disabled(SharedAppStore.safeURL(url) == nil) } }
                if let error = shared.error { Text(error).foregroundStyle(.orange) }
                if original != .null { Button("Delete list", role: .destructive) { Task { if await shared.mutate(life, path: "/team-lists/" + original["id"].string, method: "DELETE", body: .object(["expectedRevision": original["revision"]])) != nil { dismiss() } } } }
            }.background(NativeTheme.background).navigationTitle(original == .null ? "Create list" : "Edit list").toolbar { Button("Cancel") { dismiss() }; Button("Save") { Task { saving = true; defer { saving = false }; var body = original.object; body.merge(["name": .string(name), "instructions": .string(instructions), "timezone": .string(timezone), "members": .array(members), "links": .array(links)]) { _, new in new }; if original != .null { body["expectedRevision"] = original["revision"] }; if await shared.mutate(life, path: "/team-lists" + (original == .null ? "" : "/" + original["id"].string), method: original == .null ? "POST" : "PUT", body: .object(body)) != nil { dismiss() } } }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || TimeZone(identifier: timezone) == nil || saving) }
        }.environment(\.editMode, .constant(.active)).onAppear { name = original["name"].string; instructions = original["instructions"].string; timezone = original["timezone"].string.isEmpty ? "UTC" : original["timezone"].string; members = original["members"].array; links = original["links"].array }
    }
}
struct StandupView: View {
    @EnvironmentObject var shared: SharedAppStore
    @State private var listID = ""
    var showListPicker = true
    var showLinks = true
    private var selection: Binding<String> { NativeDesignPreview.enabled ? $shared.selectedTeamListID : $listID }
    private var list: JSON { shared.lists.first { $0["id"].string == selection.wrappedValue } ?? shared.lists.first ?? .null }
    private var dayKey: String {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(identifier: list["timezone"].string) ?? .current
        let date = calendar.dateComponents([.year, .month, .day], from: Date())
        return list["id"].string + ":\(date.year ?? 0)-\(date.month ?? 0)-\(date.day ?? 0)"
    }
    private var order: [JSON] { shared.standupOrders[dayKey] ?? [] }
    private var completed: Set<String> { shared.standupCompleted[dayKey] ?? [] }
    static func shuffled(_ members: [JSON]) -> [JSON] { var random = members.filter { $0["mode"].string != "fixed" }.shuffled(); return members.map { $0["mode"].string == "fixed" ? $0 : random.removeFirst() } }
    var body: some View { Group { if NativeDesignPreview.enabled { numberedRows } else { NativeList { rows } } }.onAppear { if selection.wrappedValue.isEmpty { selection.wrappedValue = shared.lists.first?["id"].string ?? "" } } }
    private var numberedRows: some View {
        Group {
            if showListPicker { Picker("Team list", selection: selection) { ForEach(shared.lists, id: \.self) { Text($0["name"].string).tag($0["id"].string) } } }
            Text(list["name"].string).font(.headline)
            Text((dayKey.components(separatedBy: ":").last ?? "") + " · " + list["timezone"].string).font(.caption).foregroundStyle(.secondary)
            ForEach(Array((order.isEmpty ? list["members"].array : order).enumerated()), id: \.element) { index, person in
                HStack(alignment: .firstTextBaseline, spacing: 10) { Text("\(index + 1).").monospacedDigit().frame(minWidth: 24, alignment: .trailing); Text(person["name"].string) }
                    .foregroundStyle(.primary).listRowSeparator(.hidden).listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16)).accessibilityElement(children: .combine).accessibilityLabel("\(index + 1). " + person["name"].string).accessibilityIdentifier("standup-person-" + person["id"].string)
            }
            if !list["instructions"].string.isEmpty { Text(list["instructions"].string).font(.callout).foregroundStyle(.secondary) }
            Button("Generate for today", systemImage: "arrow.triangle.2.circlepath") { shared.standupOrders[dayKey] = Self.shuffled(list["members"].array); shared.standupCompleted[dayKey] = [] }.frame(minHeight: 44).contentShape(Rectangle()).disabled(list["members"].array.isEmpty).accessibilityIdentifier("standup-generate")
        }
    }
    private var rows: some View {
        Group {
            if showListPicker { Picker("Team list", selection: selection) { ForEach(shared.lists, id: \.self) { Text($0["name"].string).tag($0["id"].string) } } }
            if !list["instructions"].string.isEmpty { Text(list["instructions"].string).font(.caption).foregroundStyle(.secondary) }
            Button("Start / shuffle") { shared.standupOrders[dayKey] = Self.shuffled(list["members"].array); shared.standupCompleted[dayKey] = [] }.disabled(list["members"].array.isEmpty)
            ForEach(order.isEmpty ? list["members"].array : order, id: \.self) { person in Button { let id = person["id"].string; var next = completed; if next.contains(id) { next.remove(id) } else { next.insert(id) }; shared.standupCompleted[dayKey] = next } label: { Label(person["name"].string, systemImage: completed.contains(person["id"].string) ? "checkmark.circle.fill" : "circle").strikethrough(completed.contains(person["id"].string)) } }
            if showLinks { Section("Links") { ForEach(list["links"].array, id: \.self) { link in if let url = SharedAppStore.safeURL(link["url"].string) { Button(link["title"].string) { shared.open(url, title: link["title"].string) } } } } }
        }
    }
}
struct NativeNewTabAction {
    var title: String
    var symbol: String
    var enabled = true
    var replacesBlank = true
    var run: () -> Void
}
struct TeamBrowserView: View {
    @Environment(\.nativeTabStep) private var stepContainerTab
    @EnvironmentObject var destinations: DestinationStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject private var phoneChrome: NativePhoneChrome
    @Environment(\.nativePhoneAreaActive) private var phoneAreaActive
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.nativeBackPreviewKey) private var backPreviewKey
    @State private var text = ""
    @State private var engine = "Google"
    @State private var overview = false
    @State private var historyDirection: Bool?
    @State private var ownerHistoryResults: [JSON]?
    @State private var historyIndex = NativeBrowserHistoryIndex([])
    @State private var historyIndexRevision = 0
    @State private var matchingHistory: [JSON] = []
    var scope = "team"
    var showTabs = true
    // A containing project/chat/main strip owns its selected child. Render that
    // identity directly rather than waiting for a second scoped-selection value.
    var tabID: String? = nil
    var onBackToList: (() -> Void)? = nil
    var newTabOptions: [NativeNewTabAction] = []
    @FocusState private var homeAddressFocused: Bool
    @FocusState private var addressFocused: Bool
    @State private var addressSites: [JSON] = []
    @State private var editingAddress = false
    private var tabs: [BrowserDescriptor] { shared.tabs(in: scope) }
    private var selectedID: String? { tabID ?? shared.selected(in: scope) }
    private var selectedTab: BrowserDescriptor? { tabs.first { $0.id == selectedID } }
    private var navigation: BrowserNavigationState { shared.browserNavigation[selectedID ?? ""] ?? BrowserNavigationState() }
    private var historyRemote: RemoteStore? { selectedTab?.ownerHostId.flatMap { destinations.remote(for: $0) } ?? destinations.selected }
    private var availableHistory: [JSON] {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-address-recents") { return shared.recentHistory }
        #endif
        return (ownerHistoryResults ?? []) + shared.browserRecentVisits(host: selectedTab?.ownerHostId ?? historyRemote?.connection?.hostId, profile: selectedTab?.profileId ?? "default")
    }
    private var historyAvailability: String {
        guard let remote = historyRemote, let host = remote.connection?.hostId else { return "Choose a computer for owner history. Saved navigation remains on this device." }
        return shared.historyStatus[host] ?? (remote.connected ? "History from " + remote.displayName + ". Each tab keeps its own navigation list." : "Offline · cached last 30 days and saved navigation only")
    }
    private var historySearchIdentity: String { [selectedID ?? "", text, String(addressFocused || homeAddressFocused), String(historyIndexRevision)].joined(separator: "|") }
    private var accountRefreshIdentity: String { [scope, selectedID ?? "", life.accountIdentity, String(addressFocused)].joined(separator: ":") }

    @ViewBuilder private func browserTabMenu(_ tab: BrowserDescriptor) -> some View {
                            Button("Move left", systemImage: "arrow.left") { shared.shiftBrowser(tab.id, by: -1) }.disabled(tabs.first?.id == tab.id)
                            Button("Move right", systemImage: "arrow.right") { shared.shiftBrowser(tab.id, by: 1) }.disabled(tabs.last?.id == tab.id)
                            Button(tab.persist ? "Do not persist tab" : "Persist tab", systemImage: "pin") { shared.persistBrowser(tab.id, enabled: !tab.persist) }
                            Button("Unload") { shared.unload(tab.id) }
                            Button("Close") { shared.close(tab.id) }
                            Button("Close other tabs") { for other in tabs where other.id != tab.id { shared.close(other.id) } }.disabled(tabs.count < 2)
                            Button("Close tabs to the right") { if let index = tabs.firstIndex(where: { $0.id == tab.id }) { for other in tabs.dropFirst(index + 1) { shared.close(other.id) } } }.disabled(tabs.last?.id == tab.id)
                            }
    private func browserTabChip(_ tab: BrowserDescriptor) -> some View {
                    HStack(spacing: 8) {
                        Button { shared.select(tab.id, in: scope) } label: { NativeContentTabLabel(title: shared.browserLabel(tab), symbol: "globe") }
                            .lineLimit(1).accessibilityIdentifier("browser-tab-select-" + tab.id).accessibilityLabel(tab.title.isEmpty ? "New tab" : tab.title)
                            .accessibilityValue(selectedID == tab.id ? "Active" : "Inactive")
                            .accessibilityAddTraits(selectedID == tab.id ? .isSelected : [])
                        Button { shared.close(tab.id) } label: { Image(systemName: "xmark").font(.caption2) }.accessibilityLabel("Close " + (tab.title.isEmpty ? "browser tab" : tab.title))
                    }.id(tab.id).padding(12).background(selectedID == tab.id ? NativeTheme.accent.opacity(0.08) : .clear)
                        .overlay(alignment: .bottom) { Rectangle().fill(selectedID == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                        .draggable(tab.id).dropDestination(for: String.self) { ids, _ in guard let source = ids.first, tabs.contains(where: { $0.id == source }) else { return false }; shared.moveBrowser(source, before: tab.id); return true }
.contextMenu { browserTabMenu(tab) }
    }
    @ViewBuilder private var browserTabStrip: some View {
            if showTabs && (!NativePhonePreview.enabled || !phoneChrome.controlsHidden) { HStack(spacing: 0) { NativeTabStrip(ids: tabs.map(\.id), selection: selectedID) { HStack(spacing: 0) {
                ForEach(tabs) { tab in
                    browserTabChip(tab)
                    Divider().frame(height: 24)
                }
            }.buttonStyle(.plain) }.scrollIndicators(.hidden)
                Button { shared.open(nil, scope: scope) } label: { Image(systemName: "plus") }.padding(12).accessibilityLabel("Add tab").accessibilityIdentifier("browser-new-tab")
            }.nativeTabBar()
            }
    }
    // Bound SwiftUI inference separately from the asynchronous lifecycle modifiers.
    private var browserContent: some View {
        VStack(spacing: 0) {
            browserTabStrip
            if !NativePhonePreview.enabled || !phoneChrome.controlsHidden {
                Divider()
                if NativePhonePreview.enabled { phoneAddress } else { toolbar }
                if addressFocused { recentSites }
                Divider()
            }
            if !shared.downloads.isEmpty { HStack { ProgressView().accessibilityLabel("Downloading linked file"); Button("Cancel download") { for transfer in Array(shared.downloads.values) { transfer.cancel() } } }.padding(8) }
            Group {
                if let tab = selectedTab, !shared.profileAvailable(tab.profileId) { ContentUnavailableView("Profile unavailable", systemImage: "person.crop.circle.badge.exclamationmark", description: Text("Sign in and refresh browser profiles in Preferences to resume this tab.")) } else if let tab = selectedTab, tab.url != nil { if shared.unloadedBrowsers.contains(tab.id) { ContentUnavailableView { Label("Page unloaded", systemImage: "pause.circle").foregroundStyle(NativePalette.shared.color("text")) } actions: { Button("Load tab") { shared.reload(tab.id); shared.touch(tab.id) }.buttonStyle(.borderedProminent).tint(NativeTheme.accent) }.background(NativePalette.shared.color("background")) } else { NativeBrowser(tab: tab, onOverview: { showOverview() }, onChromeToggle: NativePhonePreview.enabled ? { addressFocused = false; phoneChrome.toggleControls() } : nil, onChromeVisibility: NativePhonePreview.enabled ? { hidden in if hidden { addressFocused = false }; phoneChrome.setControlsHidden(hidden) } : nil, onPinchChanged: NativeDesignPreview.enabled ? { phoneChrome.pinch($0) } : nil, onPinchEnded: NativeDesignPreview.enabled ? { phoneChrome.finishPinch(committed: $0) } : nil).id(tab.id) } }
                else { home.simultaneousGesture(MagnificationGesture().onEnded { scale in if scale < 0.75 { showOverview() } }) }
            // WebKit's own edge swipe (Safari's page-image animation) handles pages in its
            // back/forward list where the page meets the screen edge. This content-edge swipe
            // is the backup: beside a pinned iPad sidebar, for owner history WebKit lacks, and
            // once history is exhausted it returns to the previous screen (the project home).
            }.modifier(NativePageSwipe(enabled: !NativePhonePreview.enabled || onBackToList != nil, phone: onBackToList != nil, blockBack: onBackToList == nil && !(selectedID.map { shared.hasBrowserHistory($0, back: true) } ?? false), blockForward: !(selectedID.map { shared.hasBrowserHistory($0, back: false) } ?? false), back: {
                guard let id = selectedID, !shared.isTwoFingerNavigation(id) else { return }
                if !shared.browserHistory(id, back: true).isEmpty { shared.goBack(id) } else { onBackToList?() }
            }, forward: {
                guard let id = selectedID, !shared.isTwoFingerNavigation(id), !shared.browserHistory(id, back: false).isEmpty else { return }
                shared.goForward(id)
            }, backPreview: {
                guard let id = selectedID else { return nil }
                if !shared.browserHistory(id, back: true).isEmpty { return shared.adjacentPageImage(id, back: true) }
                return backPreviewKey.flatMap(NativeScreenMemory.image)
            }, forwardPreview: { selectedID.flatMap { shared.adjacentPageImage($0, back: false) } }))
        }.safeAreaInset(edge: .bottom, spacing: 0) {
            // The shell respects the measured safe area; controls stay above the home indicator.
            if NativePhonePreview.enabled { phoneBrowserControls.fixedSize(horizontal: false, vertical: true) }
        }
        // iPhone controls extend into the home-indicator area; allow that overflow only.
        .scaleEffect(overview && !reduceMotion ? 0.94 : 1).opacity(overview ? 0.5 : 1).clipShape(Rectangle().inset(by: NativePhonePreview.enabled ? -24 : 0))
        .overlay {
            if overview { BrowserTabOverview(scope: scope, onClose: { withAnimation(reduceMotion ? .easeOut(duration: 0.12) : .spring(response: 0.32, dampingFraction: 0.86)) { overview = false } })
                .transition(reduceMotion ? .opacity : .scale(scale: 0.88).combined(with: .opacity)).zIndex(1) }
        }
        .popover(isPresented: $showDownloads) { NativeDownloadsView().frame(idealWidth: 440, idealHeight: 420) }
        .sheet(isPresented: $showCertificate) { if let tab = selectedTab { NativeCertificateView(view: shared.webView(tab)) } }
        .sheet(isPresented: Binding(get: { historyDirection != nil }, set: { if !$0 { historyDirection = nil } })) {
            navigationHistorySheet
        }
    }
    var body: some View {
        browserContent
        .task(id: selectedID) {
            if let id = selectedID {
                // Selecting an unloaded page recreates its view, as on desktop; hidden tabs stay unloaded.
                // Unloaded pages keep navigation available; Load tab is the explicit residency action.
                if tabID != nil, shared.selected(in: scope) != id { shared.select(id, in: scope, activateMainBrowser: false) }
                shared.assignBrowserOwner(id, host: destinations.selected?.connection?.hostId)
                if NativeDesignPreview.enabled && phoneAreaActive { phoneChrome.currentID = "browser:" + id; phoneChrome.controlsHidden = false; phoneChrome.browserOwnsBack = navigation.canGoBack }
            }
            if let remote = historyRemote { await shared.flushHistory(remote) }
        }
        .task(id: "completion:" + historySearchIdentity) {
            guard addressFocused || homeAddressFocused else { addressSites = []; return }
            addressSites = historyIndex.sites
            do { try await Task.sleep(for: .milliseconds(100)) } catch { return }
            guard let remote = historyRemote, remote.connected else { return }
            do {
                let response = try await remote.request("browser.history.suggest", ["query": .string(text), "profileId": .string(selectedTab?.profileId ?? "default"), "limit": .number(100)])
                guard !Task.isCancelled else { return }; addressSites = response["items"].array
            } catch { /* Cached retained origins remain available offline. */ }
        }
        .task(id: historySearchIdentity) {
            guard addressFocused || selectedTab?.url == nil else { return }
            do { try await Task.sleep(for: .milliseconds(200)) } catch { return }
            let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
            let index = historyIndex
            let local = await Task.detached(priority: .userInitiated) { index.matching(query) }.value
            guard !Task.isCancelled else { return }
            matchingHistory = local
            guard let remote = historyRemote else { return }
            let result = await shared.queryHistory(remote, profileId: selectedTab?.profileId ?? "default", query: query, from: query.isEmpty ? Date().addingTimeInterval(-30 * 86400) : nil)
            guard !Task.isCancelled else { return }
            if result != .null {
                let rows = result["items"].array + local
                let matches = await Task.detached(priority: .userInitiated) { NativeBrowserHistoryIndex(rows).matching(query) }.value
                guard !Task.isCancelled else { return }; matchingHistory = matches
            }
        }
        .onAppear { if NativePhonePreview.enabled && phoneAreaActive { phoneChrome.browserSurfaceScope = scope }; if tabs.isEmpty && showTabs { shared.open(nil, scope: scope) }; text = selectedTab?.url ?? ""; engine = ["google": "Google", "duckduckgo": "DuckDuckGo", "bing": "Bing"][shared.snapshot["preferences"]["searchEngine"].string] ?? "Google"; if NativePhonePreview.enabled { editingAddress = false } else { addressFocused = false } }
        .onChange(of: selectedTab.map { shared.unloadedBrowsers.contains($0.id) } ?? false) { _, unloaded in if unloaded { phoneChrome.setControlsHidden(false) } }
        .onChange(of: selectedID) { _, _ in text = selectedTab?.url ?? ""; if NativePhonePreview.enabled { editingAddress = false } else { addressFocused = false } }
        .task(id: accountRefreshIdentity) {
            guard addressFocused || selectedTab?.url == nil else { return }
            // Copy once per editing session. Never flatten all tab backstacks or
            // parse/sort the owner's complete history on each text-field update.
            ownerHistoryResults = nil
            let rows = availableHistory
            let index = await Task.detached(priority: .userInitiated) { NativeBrowserHistoryIndex(rows) }.value
            guard !Task.isCancelled else { return }
            historyIndex = index; historyIndexRevision += 1
            await shared.refresh(life)
            guard !Task.isCancelled else { return }
            let refreshed = availableHistory
            if refreshed != rows {
                let updated = await Task.detached(priority: .userInitiated) { NativeBrowserHistoryIndex(refreshed) }.value
                guard !Task.isCancelled else { return }; historyIndex = updated; historyIndexRevision += 1
            }
        }
        .onChange(of: addressFocused) { _, focused in if NativePhonePreview.enabled && !focused { editingAddress = false } }
        .onChange(of: phoneChrome.overview) { _, visible in
            if visible { addressFocused = false; homeAddressFocused = false; editingAddress = false }
        }
        .onChange(of: navigation.url) { _, url in if !addressFocused && !url.isEmpty { text = url }; if NativePhonePreview.enabled && phoneAreaActive { phoneChrome.browserOwnsBack = navigation.canGoBack } }
        .onChange(of: navigation.canGoBack) { _, value in if NativePhonePreview.enabled && phoneAreaActive { phoneChrome.browserOwnsBack = value } }
        .onChange(of: phoneAreaActive) { _, active in if NativePhonePreview.enabled { if active { phoneChrome.browserSurfaceScope = scope } else if phoneChrome.browserSurfaceScope == scope { phoneChrome.browserSurfaceScope = nil } }; if NativePhonePreview.enabled && active { phoneChrome.currentID = selectedID.map { "browser:" + $0 } ?? ""; phoneChrome.browserOwnsBack = navigation.canGoBack } }
        .task(id: selectedID) { while !Task.isCancelled { do { try await Task.sleep(for: .seconds(20)) } catch { return }; guard phoneAreaActive else { continue }; if let selectedID { shared.scheduleBrowserPreview(selectedID) } } }
        .simultaneousGesture(DragGesture(minimumDistance: 1).onEnded { _ in if let selectedID { shared.scheduleBrowserPreview(selectedID) } })
        .onDisappear { if NativeDesignPreview.enabled { if let selectedID { shared.captureBrowserPreview(selectedID) }; phoneChrome.browserOwnsBack = false; if phoneChrome.browserSurfaceScope == scope { phoneChrome.browserSurfaceScope = nil } } }
    }
    private var navigationHistorySheet: some View {
            NavigationStack {
                NativeList {
                    if let id = selectedID, let tab = selectedTab, let history = tab.history {
                        Section("Current page") { Label(shared.browserLabel(tab), systemImage: "checkmark"); Text(tab.url ?? "").font(.caption).foregroundStyle(.secondary) }
                        Section("Back") { ForEach(shared.browserHistory(id, back: true), id: \.self) { item in Button(item.title ?? item.url.absoluteString) { shared.goBrowserHistory(item, in: id); historyDirection = nil }.accessibilityIdentifier("browser-history-back-\(item.index)") } }
                        Section("Forward") { ForEach(shared.browserHistory(id, back: false), id: \.self) { item in Button(item.title ?? item.url.absoluteString) { shared.goBrowserHistory(item, in: id); historyDirection = nil }.accessibilityIdentifier("browser-history-forward-\(item.index)") } }
                        if history.entries.indices.contains(history.index), let requested = history.entries[history.index].requestedURL, let original = URL(string: requested) { Button("Open originally requested address") { _ = shared.navigate(original, in: id); historyDirection = nil } }
                        Text("\(history.entries.count) saved navigation entries").font(.caption).foregroundStyle(.secondary)
                    }
                }.navigationTitle("Navigation history").toolbar { Button("Done") { historyDirection = nil } }
            }
    }
    private func showOverview() {
        addressFocused = false; homeAddressFocused = false; editingAddress = false
        if NativeDesignPreview.enabled { if let selectedID { phoneChrome.currentID = "browser:" + selectedID }; phoneChrome.showTabs?(); return }
        withAnimation(reduceMotion ? .easeOut(duration: 0.12) : .spring(response: 0.32, dampingFraction: 0.86)) { overview = true }
    }
    @State private var showDownloads = false
    @State private var showCertificate = false
    private var phoneAddress: some View {
        HStack(alignment: .top, spacing: 6) {
            ZStack(alignment: .leading) {
                if editingAddress {
                    TextField("Search or enter URL", text: $text, axis: .vertical)
                        .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).submitLabel(.go)
                        .focused($addressFocused).onAppear { addressFocused = true }.lineLimit(1...6).fixedSize(horizontal: false, vertical: true)
                        .modifier(NativeAddressGhost(text: $text, sites: addressSites, focused: addressFocused, submit: { navigate() }))
                        .accessibilityIdentifier("browser-address-editor")
                } else {
                    Button { editingAddress = true } label: {
                        GeometryReader { geometry in
                            Text(text.isEmpty ? "Search or enter URL" : text).lineLimit(1).fixedSize(horizontal: true, vertical: false)
                                .frame(width: geometry.size.width, height: geometry.size.height, alignment: .leading).clipped()
                        }.frame(height: 20)
                    }.buttonStyle(.plain).accessibilityValue(text).accessibilityIdentifier("browser-address")
                        .highPriorityGesture(DragGesture(minimumDistance: 24).onEnded { value in
                            guard let direction = NativeAddressSwipe.direction(x: value.translation.width, y: value.translation.height) else { return }
                            if let stepContainerTab { stepContainerTab(direction) }
                            else if let selectedID, let index = tabs.firstIndex(where: { $0.id == selectedID }), tabs.indices.contains(index + direction) { shared.select(tabs[index + direction].id, in: scope) }
                        })
                        .frame(maxWidth: .infinity, alignment: .leading).clipped()
                        .mask(LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.9), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing))
                }
            }.font(.system(size: 14)).padding(10).frame(minHeight: 44).background(NativePalette.shared.color("input"), in: RoundedRectangle(cornerRadius: 8))
            if editingAddress { Button(action: { navigate() }) { Image(systemName: "arrow.turn.down.left").frame(width: 44, height: 44) }.accessibilityLabel("Go to address or search").accessibilityIdentifier("browser-go") }
        }.padding(.horizontal, 10).padding(.vertical, 7).background(NativeTheme.rail)
    }
    private var phoneBrowserControls: some View {
        HStack(spacing: 0) {
            Button { if let id = selectedID { shared.goBack(id) } } label: { Image(systemName: "chevron.left").frame(maxWidth: .infinity).frame(height: 38).contentShape(Rectangle()) }
                .disabled(!navigation.canGoBack).accessibilityLabel("Back").accessibilityIdentifier("browser-back")
                .highPriorityGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in historyDirection = true })
            Button { if let id = selectedID { shared.goForward(id) } } label: { Image(systemName: "chevron.right").frame(maxWidth: .infinity).frame(height: 38).contentShape(Rectangle()) }
                .disabled(!navigation.canGoForward).accessibilityLabel("Forward").accessibilityIdentifier("browser-forward")
                .highPriorityGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in historyDirection = false })
            Button { if let id = selectedID { navigation.isLoading ? shared.stopBrowser(id) : shared.refreshBrowser(id) } } label: { Image(systemName: navigation.isLoading ? "xmark" : "arrow.clockwise").frame(maxWidth: .infinity).frame(height: 38).contentShape(Rectangle()) }.disabled(selectedTab?.url == nil).accessibilityLabel(navigation.isLoading ? "Stop loading" : "Refresh page").accessibilityIdentifier("browser-refresh")
            Button { if let tab = selectedTab { shared.webView(tab).findInteraction?.presentFindNavigator(showingReplace: false) } } label: { Image(systemName: "magnifyingglass").frame(maxWidth: .infinity).frame(height: 38).contentShape(Rectangle()) }.disabled(selectedTab?.url == nil).accessibilityLabel("Find in page").accessibilityIdentifier("browser-find")
            Menu {
                pageOptions
                Button("Navigation history", systemImage: "clock.arrow.circlepath") { historyDirection = true }.accessibilityIdentifier("browser-navigation-history")
                Button("Downloads", systemImage: "arrow.down.circle") { showDownloads = true }
                Button(phoneChrome.controlsHidden ? "Show top controls" : "Hide top controls", systemImage: "rectangle.topthird.inset.filled") { addressFocused = false; phoneChrome.toggleControls() }
                Button("App navigation", systemImage: "sidebar.left") { phoneChrome.drawer = true }
                ForEach(shared.browserProfiles, id: \.self) { profile in Button("New browser tab · " + profile["name"].string, systemImage: "plus") { shared.open(nil, scope: scope, profileId: profile["id"].string) } }
                if let tab = selectedTab {
                    Button(tab.persist ? "Do not persist tab" : "Persist tab", systemImage: "pin") { shared.persistBrowser(tab.id, enabled: !tab.persist) }
                    Button("Unload page", systemImage: "pause.circle") { shared.unload(tab.id) }
                    Button("Close tab", systemImage: "xmark") { shared.close(tab.id) }
                }
            } label: { Image(systemName: "ellipsis.circle").frame(maxWidth: .infinity).frame(height: 38).contentShape(Rectangle()) }.accessibilityLabel("More browser options").accessibilityIdentifier("phone-browser-more")
            Button { showOverview() } label: { NativeTabOverviewIcon().frame(maxWidth: .infinity).frame(height: 38).contentShape(Rectangle()) }.accessibilityLabel("Tab overview").accessibilityIdentifier("browser-tab-overview")
        }.buttonStyle(.plain).font(.system(size: 19)).foregroundStyle(NativeTheme.accent).background(NativeTheme.rail.ignoresSafeArea(edges: .bottom)).overlay(alignment: .top) { Divider() }
    }
    @ViewBuilder private var pageOptions: some View {
        if let tab = selectedTab, tab.url != nil {
            ControlGroup {
                Button("Decrease page scale", systemImage: "minus") { shared.adjustPageScale(tab.id, delta: -10) }.disabled(shared.pageScale(tab) <= 25)
                Button("\(shared.pageScale(tab))%") { shared.adjustPageScale(tab.id, delta: 0) }.accessibilityLabel("Page scale \(shared.pageScale(tab)) percent. Reset to 100 percent")
                Button("Increase page scale", systemImage: "plus") { shared.adjustPageScale(tab.id, delta: 10) }.disabled(shared.pageScale(tab) >= 500)
            }
            Toggle("Block video autoplay in all tabs", isOn: Binding(get: { shared.blockVideoAutoplay }, set: shared.setBlockVideoAutoplay))
            Button("View certificate information", systemImage: "lock.shield") { showCertificate = true }
        }
    }
    private var toolbar: some View {
        let chrome = NativeTheme.tabBackground
        let field = colorScheme == .dark ? NativePalette.shared.color("input") : Color(uiColor: .secondarySystemGroupedBackground)
        let control = colorScheme == .dark ? Color(red: 167 / 255, green: 182 / 255, blue: 172 / 255) : Color(red: 78 / 255, green: 102 / 255, blue: 85 / 255)
        return HStack(spacing: 2) {
            if !NativePadPreview.enabled { Button { showDownloads = true } label: { Image(systemName: shared.downloads.isEmpty ? "arrow.down.circle" : "arrow.down.circle.fill").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("Downloads") }
            Button { if let id = selectedID { shared.goBack(id) } } label: { Image(systemName: "chevron.left").frame(minWidth: 44, minHeight: 44) }
                .frame(width: 44, height: 44).contentShape(Rectangle()).disabled(!navigation.canGoBack).accessibilityLabel("Back").accessibilityIdentifier("browser-back")
                .highPriorityGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in historyDirection = true })
            Button { if let id = selectedID { shared.goForward(id) } } label: { Image(systemName: "chevron.right").frame(minWidth: 44, minHeight: 44) }
                .frame(width: 44, height: 44).contentShape(Rectangle()).disabled(!navigation.canGoForward).accessibilityLabel("Forward").accessibilityIdentifier("browser-forward")
                .highPriorityGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in historyDirection = false })
            Button { if let id = selectedID { navigation.isLoading ? shared.stopBrowser(id) : shared.refreshBrowser(id) } } label: { Image(systemName: navigation.isLoading ? "xmark" : "arrow.clockwise").frame(minWidth: 44, minHeight: 44) }.frame(width: 44, height: 44).contentShape(Rectangle()).disabled(selectedTab?.url == nil).accessibilityLabel(navigation.isLoading ? "Stop loading" : "Refresh page").accessibilityIdentifier("browser-refresh")
            TextField("Search or enter URL", text: $text).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).submitLabel(.go).focused($addressFocused)
                .modifier(NativeAddressGhost(text: $text, sites: addressSites, focused: addressFocused, submit: { navigate() }))
                .font(.system(size: 14)).foregroundStyle(colorScheme == .dark ? Color.white : Color.primary).padding(.horizontal, 10).frame(height: 34).background(field, in: RoundedRectangle(cornerRadius: 6)).accessibilityIdentifier("browser-address")
            Button { if let tab = selectedTab { shared.webView(tab).findInteraction?.presentFindNavigator(showingReplace: false) } } label: { Image(systemName: "magnifyingglass") }.accessibilityLabel("Find in page").keyboardShortcut("f", modifiers: .command).disabled(selectedTab?.url == nil)
            Button(action: { navigate() }) { Image(systemName: "arrow.turn.down.left") }.frame(width: 44, height: 44).contentShape(Rectangle()).disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Go to address or search").accessibilityIdentifier("browser-go")
            if NativePadPreview.enabled {
                Menu { pageOptions; Button("Downloads", systemImage: "arrow.down.circle") { showDownloads = true }; Button("Navigation history", systemImage: "clock.arrow.circlepath") { historyDirection = true }.accessibilityIdentifier("browser-navigation-history") } label: { Image(systemName: "ellipsis.circle").frame(width: 44, height: 44) }.accessibilityLabel("More browser options").accessibilityIdentifier("browser-more")
            } else { Button { historyDirection = true } label: { Image(systemName: "clock.arrow.circlepath") }.frame(width: 44, height: 44).accessibilityLabel("Navigation history").accessibilityIdentifier("browser-navigation-history") }
            Button { showOverview() } label: { NativeTabOverviewIcon() }.frame(width: 44, height: 44).contentShape(Rectangle()).accessibilityLabel("Tab overview").accessibilityIdentifier("browser-tab-overview")
        }.buttonStyle(.plain).foregroundStyle(control).font(.system(size: 14, weight: .medium))
            .padding(.horizontal, 4).padding(.vertical, 2)
            .frame(minHeight: 44).background { if colorScheme == .dark { chrome } else { Rectangle().fill(.bar) } }
    }
    private var recentSites: some View {
        let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let items = matchingHistory
        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) { Text("Recent sites").font(.subheadline.weight(.semibold)); Text(historyAvailability).font(.caption2).foregroundStyle(.secondary).lineLimit(2); Spacer(minLength: 0) }.padding(12)
                if query.contains(where: \.isWhitespace) {
                    ForEach([engine] + ["Google", "DuckDuckGo", "Bing"].filter { $0 != engine }, id: \.self) { choice in
                        Button("Search with " + choice + (choice == engine ? " · default" : "")) { navigate(searchEngine: choice) }.padding(.horizontal, 12).padding(.vertical, 8)
                    }
                }
                if items.isEmpty, !query.isEmpty { Text("No matching available history.").foregroundStyle(.secondary).padding(12) }
                else if items.isEmpty, shared.snapshot != .null, life.credential?.appAuthorized == true, shared.error == nil, !shared.busy { Text("No recent sites yet.").foregroundStyle(.secondary).padding(12) }
                ForEach(items, id: \.self) { item in
                    Button { text = item["url"].string; navigate() } label: {
                        HStack(spacing: 10) { NativeHistorySiteIcon(item: item); VStack(alignment: .leading, spacing: 4) {
                            Text(item["title"].string.isEmpty ? item["url"].string : item["title"].string).font(.subheadline).lineLimit(1)
                            Text(item["url"].string).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            Text(BrowserHistoryRows.details(item, timeZone: .current, locale: .current)).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                        }.frame(maxWidth: .infinity, alignment: .leading) }.padding(.horizontal, 12).padding(.vertical, 10).contentShape(Rectangle())
                    }.buttonStyle(.plain).accessibilityIdentifier("browser-recent-" + item["id"].string)
                    Divider()
                }
            }
        }.frame(maxHeight: 240).background(NativeTheme.surface).accessibilityIdentifier("browser-recent-sites")
    }
    private var homeActions: [NativeNewTabAction] {
        let profiles = shared.browserProfiles.map { profile in
            let id = profile["id"].string, current = selectedTab?.profileId == id
            return NativeNewTabAction(title: "Browser · " + profile["name"].string, symbol: "globe", replacesBlank: !current, run: { if current { homeAddressFocused = true } else { shared.open(nil, scope: scope, profileId: id) } })
        }
        let unsupported = [NativeNewTabAction(title: "Markdown file", symbol: "doc.text", enabled: false, run: {}), NativeNewTabAction(title: "Terminal on host", symbol: "terminal", enabled: false, run: {})]
        if scope == "main" { return profiles + unsupported + [NativeNewTabAction(title: "New chat", symbol: "bubble.left.and.bubble.right", enabled: destinations.selected?.connected == true, run: { phoneChrome.newMainChat?(false) }), NativeNewTabAction(title: "Internet Search", symbol: "magnifyingglass", enabled: destinations.selected?.connected == true, run: { phoneChrome.newMainChat?(true) })] }
        return profiles + unsupported + newTabOptions
    }
    private var home: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("New tab").font(.largeTitle.bold())
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 130))], spacing: 12) {
                    ForEach(Array(homeActions.enumerated()), id: \.offset) { _, action in
                        Button { let old = selectedID; if action.replacesBlank, let old { shared.close(old) }; action.run() } label: { VStack(alignment: .leading, spacing: 10) { Image(systemName: action.symbol).font(.title2); Text(action.title).font(.subheadline.weight(.semibold)) }.frame(maxWidth: .infinity, minHeight: 70, alignment: .leading).padding(14).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 12)) }.buttonStyle(.plain).disabled(!action.enabled).accessibilityIdentifier("new-tab-action-" + action.title)
                    }
                }
                HStack {
                    TextField("https://example.com", text: $text).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).submitLabel(.go).focused($homeAddressFocused).modifier(NativeAddressGhost(text: $text, sites: addressSites, focused: homeAddressFocused, submit: { navigate() })).accessibilityLabel("Website address or filter history").accessibilityIdentifier("new-tab-address")
                    Button { navigate() } label: { Image(systemName: "arrow.turn.down.right").frame(width: 44, height: 44) }.disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Open address")
                }.padding(.leading, 14).background(NativeTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                Picker("Search engine", selection: $engine) { ForEach(["Google", "DuckDuckGo", "Bing"], id: \.self) { Text($0).tag($0) } }.pickerStyle(.segmented)
                if !text.isEmpty { Button("Search with " + engine) { navigate(searchEngine: engine) } }
                if !shared.snapshot["links"].array.isEmpty { Text("Shared links").font(.headline); linkRows(shared.snapshot["links"].array) }
                Text("Recent sites").font(.headline)
                Text(historyAvailability).font(.caption).foregroundStyle(.secondary)
                BrowserHistoryRows(items: matchingHistory) { link in text = link["url"].string; navigate() }
                if let error = shared.error { Text(error).foregroundStyle(.orange) }
            }.padding(20)
        }.task(id: selectedID) { try? await Task.sleep(for: .milliseconds(150)); if selectedTab?.url == nil { homeAddressFocused = true } }
    }
    private func linkRows(_ items: [JSON]) -> some View { ForEach(items, id: \.self) { link in Button(link["title"].string.isEmpty ? link["url"].string : link["title"].string) { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string, scope: scope) } } } }
    private func navigate(searchEngine: String? = nil) {
        if NativePhonePreview.enabled { editingAddress = false }
        let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let selectedEngine = searchEngine ?? engine
        guard let target = SharedAppStore.addressTarget(input, engine: selectedEngine, search: searchEngine != nil) else { shared.error = "Enter an HTTP or HTTPS address without credentials, or a search."; return }
        addressFocused = false; homeAddressFocused = false
        if let id = selectedID { _ = shared.navigate(target, in: id) }
        else { shared.open(target, title: target.host ?? "Browser", scope: scope) }
        text = target.absoluteString
    }
}
struct BrowserHistoryRows: View {
    @Environment(\.timeZone) private var timeZone
    @Environment(\.locale) private var locale
    let items: [JSON]
    var open: (JSON) -> Void
    @State private var limit = 25
    var body: some View {
        ForEach(Array(items.prefix(limit)), id: \.self) { item in
            Button { open(item) } label: {
                HStack(spacing: 10) { NativeHistorySiteIcon(item: item); VStack(alignment: .leading, spacing: 4) {
                    Text(item["title"].string.isEmpty ? item["url"].string : item["title"].string)
                    Text(Self.details(item, timeZone: timeZone, locale: locale)).font(.caption).foregroundStyle(.secondary)
                        .accessibilityIdentifier("browser-history-details-" + item["id"].string)
                } }
            }
        }
        if items.count > limit { Button("More history") { limit += 25 }.accessibilityIdentifier("browser-history-more") }
    }
    static func details(_ item: JSON, timeZone: TimeZone, locale: Locale) -> String {
        if item["local"].bool == true { return "Saved on this device" }
        let date = ProviderAllowance.date(item["visitedAt"].string) ?? ProviderAllowance.date(item["createdAt"].string)
        let formatter = DateFormatter(); formatter.dateStyle = .medium; formatter.timeStyle = .short; formatter.timeZone = timeZone; formatter.locale = locale
        return (date.map { formatter.string(from: $0) } ?? "Time unavailable") + " · " + SharedAppStore.historyDeviceName(item["deviceName"].string)
    }
}
#if DEBUG
struct BrowserHistoryFixture: View {
    @State private var timezone = "America/Denver"
    private var items: [JSON] { (1...26).map { number in
        .object(["id": .string(String(number)), "title": .string("Visit \(number)"), "url": .string("https://example.test/\(number)"), "visitedAt": .string("2026-10-04T18:00:00Z"), "deviceName": .string(number == 2 ? "" : "Visiting iPad")])
    } }
    var body: some View {
        VStack {
            Button("Use Tokyo history timezone") { timezone = "Asia/Tokyo" }
            NativeList { BrowserHistoryRows(items: items) { _ in } }
                .environment(\.timeZone, TimeZone(identifier: timezone)!)
        }
    }
}
#endif

// WebKit's element menu and UIKit's selected-text edit menu are different paths.
// Observe the actual pressed anchor in an isolated script world so either menu
// can offer the same link actions, including linked images and iframe links.
@MainActor final class NativeLinkWebView: WKWebView {
    var linkActions: ((URL) -> [UIMenuElement])?
    private(set) var pressedLink: URL?
    private var mediaFrames: [WKFrameInfo] = []
    func updateVideoPolicy(_ source: String) {
        evaluateJavaScript(source, completionHandler: nil)
        for frame in mediaFrames { evaluateJavaScript(source, in: frame, in: .page) { _ in } }
    }
    private var pressedAt = Date.distantPast
    private var navigationIntentAt = Date.distantPast
    func noteNavigationIntent() { navigationIntentAt = Date() }
    var hasRecentNavigationIntent: Bool { Date().timeIntervalSince(navigationIntentAt) < 1.2 }
    private final class TargetHandler: NSObject, WKScriptMessageHandler {
        weak var view: NativeLinkWebView?
        init(_ view: NativeLinkWebView) { self.view = view }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let view, message.webView === view else { return }
            if message.name == "proteusNavigationIntent" { if message.frameInfo.isMainFrame { view.noteNavigationIntent() }; return }
            if message.name == "proteusMediaFrame" {
                if message.frameInfo.isMainFrame { view.mediaFrames.removeAll() }
                if view.mediaFrames.count >= 256 { view.mediaFrames.removeFirst() }; view.mediaFrames.append(message.frameInfo); return
            }
            guard let body = message.body as? [String: String] else { return }
            view.rememberLink(body["url"] ?? "")
        }
    }
    static func linkURL(_ value: String) -> URL? { SharedAppStore.historyURL(value) }
    func rememberLink(_ value: String) { pressedLink = Self.linkURL(value); pressedAt = Date() }
    var currentLink: URL? { Date().timeIntervalSince(pressedAt) < 15 ? pressedLink : nil }
    override init(frame: CGRect, configuration: WKWebViewConfiguration) {
        super.init(frame: frame, configuration: configuration)
        let source = """
        (() => {
          for (const name of ['click','submit','keydown']) addEventListener(name,event => {
            if (event.isTrusted && (name !== 'keydown' || event.key === 'Enter' || event.key === ' ')) window.webkit.messageHandlers.proteusNavigationIntent.postMessage('intent');
          },true);
          const capture = event => {
            const path = event.composedPath ? event.composedPath() : [event.target];
            const anchor = path.find(node => node instanceof Element && node.matches('a[href],area[href]')) || (event.target instanceof Element ? event.target.closest('a[href],area[href]') : null);
            window.webkit.messageHandlers.proteusLinkTarget.postMessage({url:anchor ? anchor.href : ''});
          };
          for (const name of ['pointerdown','touchstart','contextmenu']) addEventListener(name,capture,true);
        })();
        """
        configuration.userContentController.add(TargetHandler(self), contentWorld: .defaultClient, name: "proteusLinkTarget")
        configuration.userContentController.add(TargetHandler(self), contentWorld: .defaultClient, name: "proteusMediaFrame")
        configuration.userContentController.add(TargetHandler(self), contentWorld: .defaultClient, name: "proteusNavigationIntent")
        configuration.userContentController.addUserScript(WKUserScript(source: "window.webkit.messageHandlers.proteusMediaFrame.postMessage('ready')", injectionTime: .atDocumentStart, forMainFrameOnly: false, in: .defaultClient))
        configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: false, in: .defaultClient))
    }
    required init?(coder: NSCoder) { fatalError("NativeLinkWebView is created with a profile configuration") }
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard let url = currentLink, let actions = linkActions?(url), !actions.isEmpty else { return }
        builder.insertChild(UIMenu(title: "", identifier: UIMenu.Identifier("proteus.link-actions"), options: .displayInline, children: actions), atStartOfMenu: .root)
    }
}

struct NativeBrowser: UIViewRepresentable {
    @EnvironmentObject var shared: SharedAppStore
    @EnvironmentObject var life: LifeStore
    @EnvironmentObject var destinations: DestinationStore
    let tab: BrowserDescriptor
    var onOverview: () -> Void = {}
    var onChromeToggle: (() -> Void)? = nil
    var onChromeVisibility: ((Bool) -> Void)? = nil
    var onPinchChanged: ((CGFloat) -> Void)? = nil
    var onPinchEnded: ((Bool) -> Void)? = nil
    func makeCoordinator() -> Coordinator { Coordinator(shared: shared, life: life, destinations: destinations, id: tab.id, onOverview: onOverview) }
    func makeUIView(context: Context) -> WKWebView { let view = shared.webView(tab); view.navigationDelegate = context.coordinator; view.uiDelegate = context.coordinator; context.coordinator.attachPinch(to: view); if let linkView = view as? NativeLinkWebView { linkView.linkActions = { [weak coordinator = context.coordinator, weak view] url in guard let coordinator, let view else { return [] }; return coordinator.linkMenuActions(url, in: view) } }; return view }
    func updateUIView(_ view: WKWebView, context: Context) { context.coordinator.onOverview = onOverview; context.coordinator.onChromeToggle = onChromeToggle; context.coordinator.onChromeVisibility = onChromeVisibility; context.coordinator.onPinchChanged = onPinchChanged; context.coordinator.onPinchEnded = onPinchEnded }
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        if view.navigationDelegate === coordinator { view.navigationDelegate = nil }
        if view.uiDelegate === coordinator { view.uiDelegate = nil }
        coordinator.detachPinch()
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, UIGestureRecognizerDelegate {
        let shared: SharedAppStore; let life: LifeStore; let destinations: DestinationStore; let id: String
        var onOverview: () -> Void
        var onChromeToggle: (() -> Void)?
        var onChromeVisibility: ((Bool) -> Void)?
        var onPinchChanged: ((CGFloat) -> Void)?
        var onPinchEnded: ((Bool) -> Void)?
        private var overviewPinching = false
        private weak var scrollPan: UIPanGestureRecognizer?
        private var chromeScrollAnchor: CGFloat = 0
        private weak var doubleTap: UITapGestureRecognizer?
        private weak var pagePan: UIPanGestureRecognizer?
        private weak var pinch: UIPinchGestureRecognizer?
        private weak var view: WKWebView?
        private var beganAtMinimumZoom = false
        private var initialPageZoom: CGFloat?
        private var activeNavigation: WKNavigation?
        init(shared: SharedAppStore, life: LifeStore, destinations: DestinationStore, id: String, onOverview: @escaping () -> Void = {}) { self.shared = shared; self.life = life; self.destinations = destinations; self.id = id; self.onOverview = onOverview }
        func attachPinch(to view: WKWebView) { self.view = view; initialPageZoom = view.scrollView.zoomScale; let recognizer = UIPinchGestureRecognizer(target: self, action: #selector(observedPinch(_:))); recognizer.delegate = self; recognizer.cancelsTouchesInView = false; recognizer.delaysTouchesEnded = false; view.scrollView.addGestureRecognizer(recognizer); pinch = recognizer
            if NativePhonePreview.enabled {
                let tap = UITapGestureRecognizer(target: self, action: #selector(togglePhoneChrome(_:))); tap.numberOfTapsRequired = 2; tap.delegate = self; tap.cancelsTouchesInView = false; view.addGestureRecognizer(tap); doubleTap = tap
                let scroll = UIPanGestureRecognizer(target: self, action: #selector(observedPhoneScroll(_:)))
                scroll.minimumNumberOfTouches = 1; scroll.maximumNumberOfTouches = 1; scroll.delegate = self
                scroll.cancelsTouchesInView = false; view.addGestureRecognizer(scroll); scrollPan = scroll
            }
            let pan = UIPanGestureRecognizer(target: self, action: #selector(observedPagePan(_:))); pan.minimumNumberOfTouches = 2; pan.maximumNumberOfTouches = 2; pan.allowedScrollTypesMask = .continuous; pan.delegate = self; pan.cancelsTouchesInView = false; view.addGestureRecognizer(pan); pagePan = pan
        }
        @objc private func observedPhoneScroll(_ gesture: UIPanGestureRecognizer) {
            guard let view, gesture.numberOfTouches <= 1, !view.scrollView.isZooming else { return }
            let y = gesture.translation(in: view.scrollView).y
            if gesture.state == .began { chromeScrollAnchor = y }
            // Sites may scroll an inner overflow panel while the outer WKWebView stays fixed.
            let x = gesture.translation(in: view.scrollView).x
            guard gesture.state == .changed, abs(y) > abs(x) else { return }
            if let hidden = NativeAddressSwipe.chromeVisibility(delta: y - chromeScrollAnchor) { chromeScrollAnchor = y; onChromeVisibility?(hidden) }
        }
        @objc private func togglePhoneChrome(_ gesture: UITapGestureRecognizer) { if gesture.state == .ended { onChromeToggle?() } }
        static func traversalDirection(x: CGFloat, y: CGFloat) -> Int? { guard x.isFinite, y.isFinite, abs(x) >= 80, abs(x) > abs(y) * 2 else { return nil }; return x > 0 ? -1 : 1 }
        @objc private func observedPagePan(_ gesture: UIPanGestureRecognizer) {
            if [.began, .changed, .ended].contains(gesture.state) { shared.markTwoFingerNavigation(id) }
            guard gesture.state == .ended, let view, shared.isCurrentBrowserView(view, id: id), let direction = Self.traversalDirection(x: gesture.translation(in: view).x, y: gesture.translation(in: view).y) else { return }
            if direction < 0 { shared.goBack(id) } else { shared.goForward(id) }
        }
        func detachPinch() { if let scrollPan { scrollPan.view?.removeGestureRecognizer(scrollPan) }; scrollPan = nil; if let doubleTap { doubleTap.view?.removeGestureRecognizer(doubleTap) }; doubleTap = nil; if let pagePan { pagePan.view?.removeGestureRecognizer(pagePan) }; pagePan = nil; if let pinch { pinch.view?.removeGestureRecognizer(pinch) }; pinch = nil; view = nil }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool { true }
        static func beginsAtMinimumZoom(_ zoom: CGFloat, minimum: CGFloat, fallback: CGFloat?) -> Bool {
            let minimum = minimum > 0 ? minimum : fallback ?? zoom
            return zoom.isFinite && minimum.isFinite && zoom > 0 && minimum > 0 && zoom <= minimum + 0.01
        }
        @objc private func observedPinch(_ gesture: UIPinchGestureRecognizer) {
            if gesture.state == .began, let view {
                beganAtMinimumZoom = Self.beginsAtMinimumZoom(view.scrollView.zoomScale, minimum: view.scrollView.minimumZoomScale, fallback: initialPageZoom)
            }
            if beganAtMinimumZoom, gesture.state == .changed, gesture.scale < 0.98, let onPinchChanged { overviewPinching = true; onPinchChanged(gesture.scale) }
            if gesture.state == .ended {
                if overviewPinching { onPinchEnded?(beganAtMinimumZoom && gesture.scale < 0.75) }
                else if beganAtMinimumZoom, gesture.scale < 0.75 { onOverview() }
            }
            if [.cancelled, .failed].contains(gesture.state), overviewPinching { onPinchEnded?(false) }
            if [.ended, .cancelled, .failed].contains(gesture.state) { beganAtMinimumZoom = false; overviewPinching = false }
        }
        func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
            guard let url = elementInfo.linkURL.flatMap({ NativeLinkWebView.linkURL($0.absoluteString) }) ?? (webView as? NativeLinkWebView)?.currentLink else { completionHandler(nil); return }
            completionHandler(UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { suggested in
                UIMenu(children: [UIMenu(title: "", options: .displayInline, children: self.linkMenuActions(url, in: webView))] + suggested)
            })
        }
        func linkMenuActions(_ url: URL, in webView: WKWebView) -> [UIMenuElement] {
            guard shared.isCurrentBrowserView(webView, id: id), NativeLinkWebView.linkURL(url.absoluteString) != nil else { return [] }
            let source = shared.browserTabs.first { $0.id == id }
            let hostID = source?.ownerHostId ?? destinations.selectedID
            let hostName = hostID.flatMap { destinations.remote(for: $0)?.displayName } ?? destinations.selectedLabel
            let sourceScope = source?.scope ?? "team", sourceProfile = source?.profileId ?? "default", sourceID = id
                var actions: [UIMenuElement] = [
                    UIAction(title: "Open in New Tab", image: UIImage(systemName: "plus.square")) { _ in if let created = self.shared.open(url, title: url.host ?? "Browser", scope: sourceScope, profileId: sourceProfile, afterSourceID: sourceID), let hostID { self.shared.assignBrowserOwner(created, host: hostID) } },
                    UIAction(title: "Open in default browser", image: UIImage(systemName: "arrow.up.right.square")) { _ in UIApplication.shared.open(url); if sourceProfile == "default" { Task { await self.shared.record(url, title: url.host ?? "Browser", life: self.life) } } },
                    UIAction(title: "Copy Link", image: UIImage(systemName: "doc.on.doc")) { _ in UIPasteboard.general.url = url },
                    UIAction(title: "Download Linked File", image: UIImage(systemName: "arrow.down.doc")) { _ in self.shared.download(url, in: webView, saveAs: false) },
                    UIAction(title: "Download Linked File As…", image: UIImage(systemName: "arrow.down.doc")) { _ in self.shared.download(url, in: webView) },
                    UIAction(title: "Share Link…", image: UIImage(systemName: "square.and.arrow.up")) { _ in
                        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                        controller.popoverPresentationController?.sourceView = webView
                        controller.popoverPresentationController?.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
                        var presenter = webView.window?.rootViewController
                        while let next = presenter?.presentedViewController { presenter = next }
                        presenter?.present(controller, animated: true)
                    }
                ]
                if let hostID, let remote = self.destinations.remote(for: hostID), SharedAppStore.safeURL(url.absoluteString) != nil {
                    actions.append(UIAction(title: "New chat with link on " + hostName, image: UIImage(systemName: "bubble.left.and.bubble.right")) { _ in
                        let prefix = "workspace:" + hostID + ":"
                        _ = self.shared.prepareLinkDraft(url, remote: remote, hostID: hostID, hostName: hostName, workspaceID: sourceScope.hasPrefix(prefix) ? String(sourceScope.dropFirst(prefix.count)) : nil)
                    })
                }
                return actions
        }
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { guard shared.isCurrentBrowserView(webView, id: id) else { return }; activeNavigation = navigation }
        func webView(_ webView: WKWebView, didReceiveServerRedirectForProvisionalNavigation navigation: WKNavigation!) { guard shared.isCurrentBrowserView(webView, id: id) else { return }; shared.markBrowserRedirect(id, url: webView.url) }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { guard shared.isCurrentBrowserView(webView, id: id) else { return }; if let activeNavigation, activeNavigation !== navigation { return }; activeNavigation = nil; initialPageZoom = webView.scrollView.zoomScale; shared.captureBrowserPreview(id); Task { await shared.captureBrowserFavicon(id) }; guard let url = webView.url else { return }; shared.completeBrowserNavigation(url, title: webView.title ?? url.host ?? "Browser", in: id, nativePosition: webView.backForwardList.backList.count); if shared.browserTabs.first(where: { $0.id == id })?.profileId == "default" { Task { await shared.record(url, title: webView.title ?? url.host ?? "Browser", life: life) } } }
        private func failed(_ navigation: WKNavigation?, view: WKWebView, error: Error) { guard shared.isCurrentBrowserView(view, id: id) else { return }; if (error as NSError).code == NSURLErrorCancelled { return }; if let activeNavigation, activeNavigation !== navigation { return }; activeNavigation = nil; shared.failBrowserNavigation(id, currentURL: view.url) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(navigation, view: webView, error: error) }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(navigation, view: webView, error: error) }
        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) { decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download) }
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { shared.receiveDownload(download) }
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { shared.receiveDownload(download) }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { guard shared.isCurrentBrowserView(webView, id: id) else { decisionHandler(.cancel); return }; guard let url = navigationAction.request.url, ["http", "https", "about"].contains(url.scheme) else { decisionHandler(.cancel); return }; if navigationAction.targetFrame?.isMainFrame == true { shared.prepareBrowserLoad(url, in: id, userInitiated: [.linkActivated, .formSubmitted, .formResubmitted, .backForward].contains(navigationAction.navigationType) || (webView as? NativeLinkWebView)?.hasRecentNavigationIntent == true); if navigationAction.navigationType == .backForward { shared.prepareBrowserHistoryNavigation(url, in: id) } }; if navigationAction.shouldPerformDownload { decisionHandler(.download) } else { decisionHandler(.allow) } }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { if let url = navigationAction.request.url, ["http", "https"].contains(url.scheme) { shared.open(url, title: url.host ?? "Browser", scope: shared.browserTabs.first(where: { $0.id == id })?.scope ?? "team", profileId: shared.browserTabs.first(where: { $0.id == id })?.profileId ?? "default", afterSourceID: id) }; return nil }
    }
}

struct BrowserTabOverview: View {
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var scope = "team"
    var onClose: (() -> Void)? = nil
    private func close() { if let onClose { onClose() } else { dismiss() } }
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
                    ForEach(shared.tabs(in: scope)) { tab in
                        VStack(alignment: .leading, spacing: 12) {
                            Button { shared.select(tab.id, in: scope); close() } label: {
                                VStack(alignment: .leading, spacing: 12) {
                                    Group { if let preview = shared.browserPreview(tab.id) { Image(uiImage: preview).resizable().scaledToFill() } else { Group { if let icon = shared.browserFavicon(tab.id) { Image(uiImage: icon).resizable().scaledToFit().frame(width: 32, height: 32) } else { Image(systemName: tab.url == nil ? "house" : "globe").font(.largeTitle) } } } }.frame(maxWidth: .infinity).frame(height: 110).clipped().background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
                                    Text(shared.browserLabel(tab)).font(.headline).lineLimit(2)
                                    Text(tab.url.flatMap { SharedAppStore.safeURL($0)?.absoluteString } ?? (tab.url == nil ? "Browsing home" : "Private page · not saved")).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                                }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                            }.buttonStyle(.plain)
                            HStack {
                                Text(tab.url == nil ? "Home" : shared.isBrowserLoaded(tab.id) ? "Loaded" : "Unloaded").font(.caption).foregroundStyle(.secondary)
                                Spacer()
                                Button { shared.unload(tab.id) } label: { Image(systemName: "pause.circle") }.accessibilityLabel("Unload " + tab.title).disabled(tab.url == nil)
                                Button(role: .destructive) { shared.close(tab.id) } label: { Image(systemName: "xmark.circle") }.accessibilityLabel("Close " + tab.title)
                            }.buttonStyle(.borderless)
                        }.padding(12).background(.background, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(shared.selected(in: scope) == tab.id ? NativeTheme.accent : Color.secondary.opacity(0.3), lineWidth: 1))
                    }
                }.padding()
            }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle("Browser tabs").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { close() } }
                ToolbarItem(placement: .primaryAction) { Button("New tab", systemImage: "plus") { shared.open(nil, scope: scope); close() } }
            }
        }
    }
}

/// WebKit owns the authenticated transfer; only explicit export moves the file to Files.
struct NativeCertificateView: View {
    let view: WKWebView
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            List {
                Section("Current connection") { Text(view.url?.host ?? "No page"); Text(view.url?.absoluteString ?? "").font(.caption).textSelection(.enabled) }
                if view.url?.scheme == "https", let trust = view.serverTrust, let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate], !chain.isEmpty {
                    ForEach(Array(chain.enumerated()), id: \.offset) { index, certificate in
                        Section(index == 0 ? "Page certificate" : "Chain certificate \(index + 1)") {
                            Text(SecCertificateCopySubjectSummary(certificate) as String? ?? "Certificate")
                            Text("SHA-256").font(.caption).foregroundStyle(.secondary)
                            Text(SHA256.hash(data: SecCertificateCopyData(certificate) as Data).map { String(format: "%02X", $0) }.joined(separator: ":")).font(.system(.caption, design: .monospaced)).textSelection(.enabled)
                        }
                    }
                } else { Text("Certificate information is available for a loaded HTTPS page.") }
            }.navigationTitle("Certificate").toolbar { Button("Done") { dismiss() } }
        }
    }
}
struct NativeDownloadRecord: Identifiable, Codable {
    var id: UUID
    var name: String
    var file: String?
    var startedAt: Date
    var downloadedAt: Date?
    var state: String
    var received: Int64 = 0
    var total: Int64 = 0
    var speedBytesPerSecond: Double? = nil
    var speedObservedAt: Date? = nil
}
@MainActor final class NativeLinkDownload: NSObject, WKDownloadDelegate {
    let id = UUID()
    private weak var shared: SharedAppStore?
    private var transfer: WKDownload?
    private var destination: URL?
    private var folder: URL?
    private var scoped = false
    private var observation: NSKeyValueObservation?
    private let saveAs: Bool
    private var speedSamples: [(Double, Int64)] = [(ProcessInfo.processInfo.systemUptime, 0)]
    private var row: NativeDownloadRecord
    init(shared: SharedAppStore, saveAs: Bool = true) { self.shared = shared; self.saveAs = saveAs; row = NativeDownloadRecord(id: id, name: "Download", startedAt: Date(), state: "downloading"); super.init(); shared.downloadChanged(row) }
    private var cancelled = false
    func attach(_ download: WKDownload) {
        if cancelled { download.cancel(); return }; transfer = download; download.delegate = self
        observation = download.progress.observe(\.fractionCompleted, options: [.new]) { [weak self] progress, _ in
            let received = progress.completedUnitCount, total = progress.totalUnitCount
            Task { @MainActor [weak self] in guard let self else { return }; let now = ProcessInfo.processInfo.systemUptime; self.speedSamples.append((now, received)); while self.speedSamples.count > 2 && self.speedSamples[1].0 < now - 3 { self.speedSamples.removeFirst() }; if let first = self.speedSamples.first, now - first.0 >= 0.2 { self.row.speedBytesPerSecond = max(0, Double(received - first.1) / (now - first.0)) }; self.row.speedObservedAt = Date(); self.row.received = received; self.row.total = total; self.shared?.downloadChanged(self.row) }
        }
    }
    func cancel() { cancelled = true; transfer?.delegate = nil; transfer?.cancel(); finish("cancelled") }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let name = (suggestedFilename as NSString).lastPathComponent
        row.name = name.isEmpty || name == "." || name == ".." ? "Download" : name
        do {
            guard let shared else { completionHandler(nil); finish("failed"); return }
            let directory = saveAs ? FileManager.default.temporaryDirectory.appendingPathComponent("ProteusDownloads").appendingPathComponent(id.uuidString) : try shared.downloadDirectory()
            folder = directory; scoped = directory.startAccessingSecurityScopedResource()
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
            let base = directory.appendingPathComponent(row.name), ext = base.pathExtension, stem = base.deletingPathExtension().lastPathComponent
            var file = base, index = 1
            while FileManager.default.fileExists(atPath: file.path) || shared.downloadHistory.contains(where: { $0.file == file.path && $0.state == "downloading" }) { file = directory.appendingPathComponent(stem + " (" + String(index) + ")" + (ext.isEmpty ? "" : "." + ext)); index += 1 }
            destination = file; row.file = file.path; shared.downloadChanged(row); completionHandler(file)
        } catch { completionHandler(nil); finish("failed"); shared?.downloadError = error.localizedDescription }
    }
    func downloadDidFinish(_ download: WKDownload) {
        if let destination, saveAs { shared?.exportFile = BrowserExportFile(id: id, url: destination) }
        row.downloadedAt = Date(); finish("completed")
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) { shared?.downloadError = error.localizedDescription; finish("failed") }
    private func finish(_ state: String) {
        row.state = state; row.speedBytesPerSecond = nil; observation = nil; transfer = nil
        if state != "completed", let destination { try? FileManager.default.removeItem(at: destination); row.file = nil }
        if scoped { folder?.stopAccessingSecurityScopedResource(); scoped = false }
        shared?.downloadChanged(row); shared?.downloads.removeValue(forKey: id)
    }
}
struct NativeDownloadsView: View {
    @EnvironmentObject var shared: SharedAppStore
    @Environment(\.dismiss) private var dismiss
    var body: some View { NavigationStack { List { ForEach(shared.downloadHistory) { row in VStack(alignment: .leading, spacing: 6) {
        Label(row.name, systemImage: row.name.lowercased().hasSuffix(".pdf") ? "doc.richtext" : "doc").font(.headline); Text(row.downloadedAt?.formatted(date: .abbreviated, time: .shortened) ?? row.startedAt.formatted(date: .abbreviated, time: .shortened)).font(.caption)
        TimelineView(.periodic(from: .now, by: 1)) { context in Text(row.state == "downloading" ? String(format: "%.1f KB/s", (context.date.timeIntervalSince(row.speedObservedAt ?? .distantPast) > 2 ? 0 : row.speedBytesPerSecond ?? 0) / 1000) : row.state).foregroundStyle(.secondary) }
        if row.state == "downloading" { if row.total > 0 { ProgressView(value: Double(row.received), total: Double(row.total)) }; Button("Cancel", role: .destructive) { shared.downloads[row.id]?.cancel() } }
        if row.state == "completed", let file = row.file, FileManager.default.fileExists(atPath: file) { ShareLink("Open or share", item: URL(fileURLWithPath: file)) }
    } .listRowBackground(NativePalette.shared.color("menu")).listRowSeparatorTint(NativePalette.shared.color("menuBorder")) } }.scrollContentBackground(.hidden).background(NativePalette.shared.color("menu")).foregroundStyle(NativePalette.shared.color("menuText")).tint(NativePalette.shared.color("menuAccent")).navigationTitle("Downloads").toolbar { Button("Done") { dismiss() } } } }
}
struct NativeDownloadFolderPicker: UIViewControllerRepresentable {
    var selected: (URL) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(selected) }
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController { let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false); picker.delegate = context.coordinator; return picker }
    func updateUIViewController(_ controller: UIDocumentPickerViewController, context: Context) {}
    final class Coordinator: NSObject, UIDocumentPickerDelegate { var selected: (URL) -> Void; init(_ selected: @escaping (URL) -> Void) { self.selected = selected }; func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { if let url = urls.first { selected(url) } } }
}
struct BrowserFileExport: UIViewControllerRepresentable {
    let file: BrowserExportFile
    let finished: () -> Void
    func makeCoordinator() -> Coordinator { Coordinator(finished: finished) }
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forExporting: [file.url], asCopy: true)
        picker.delegate = context.coordinator; return picker
    }
    func updateUIViewController(_ view: UIDocumentPickerViewController, context: Context) {}
    final class Coordinator: NSObject, UIDocumentPickerDelegate {
        let finished: () -> Void
        init(finished: @escaping () -> Void) { self.finished = finished }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finished() }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finished() }
    }
}

/// The same account-owned records as desktop; this view changes presentation only.
private struct NativeTeamDesignView: View {
    @EnvironmentObject private var life: LifeStore
    @EnvironmentObject private var shared: SharedAppStore
    @EnvironmentObject private var chrome: NativePhoneChrome
    @EnvironmentObject private var destinations: DestinationStore
    @AppStorage("nativeTeamSection") private var section = "Overview"
    @State private var query = ""
    @State private var showAccount = false
    @State private var editingList: TeamListEditorItem?
    @State private var editingLink: JSON?
    @State private var linkTitle = ""
    @State private var linkURL = ""
    @State private var linkList: JSON = .null
    @State private var reorderLinks = false
    @State private var reorderTabs = false
    @State private var docked = false
    @State private var saving = false
    @State private var renameTab: BrowserDescriptor?
    @State private var tabTitle = ""
    private var list: JSON { shared.lists.first { $0["id"].string == shared.selectedTeamListID } ?? shared.lists.first ?? .null }
    private var isBrowser: Bool { shared.tabs(in: "team").contains { $0.id == section } }
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if NativePhonePreview.enabled && !chrome.controlsHidden { heading }
                if !NativePhonePreview.enabled || !chrome.controlsHidden { tabs }
                HStack(spacing: 0) {
                    if docked && NativePadPreview.enabled { standupDock.frame(width: 290); Divider() }
                    VStack(spacing: 0) {
                        if NativePadPreview.enabled && !isBrowser { heading }
                        if isBrowser { TeamBrowserView(scope: "team", showTabs: false, tabID: section) }
                        else if section == "Standup" { standup }
                        else { tools }
                    }
                }
            }.background(NativeTheme.background).toolbar(.hidden, for: .navigationBar)
                .safeAreaInset(edge: .bottom, spacing: 0) { if NativePhonePreview.enabled && !isBrowser { HStack { Image(systemName: "magnifyingglass"); TextField("Search Team Tools", text: $query).textInputAutocapitalization(.never) }.padding(12).background(NativeTheme.surface, in: Capsule()).padding(.horizontal, 16).padding(.vertical, 8).background(NativeTheme.background) } }
                .simultaneousGesture(TapGesture(count: 2).onEnded { if NativePhonePreview.enabled && !isBrowser { chrome.toggleControls() } })
                .sheet(isPresented: $showAccount) { NavigationStack { SharedAccountView().navigationTitle("Website account").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showAccount = false } } } } }
                .sheet(item: $editingList) { item in TeamListEditor(original: item.original).id(item.id) }
                .sheet(isPresented: $reorderTabs) { NativeTabReorderSheet(items: shared.tabs(in: "team").map { (id: $0.id, title: $0.title) }) { shared.reorderBrowsers($0, in: "team") } }
                .sheet(isPresented: $reorderLinks) { NavigationStack { List { ForEach(list["links"].array, id: \.self) { Text($0["title"].string) }.onMove { from, to in var links = list["links"].array; links.move(fromOffsets: from, toOffset: to); saveLinks(links, original: list) } }.environment(\.editMode, .constant(.active)).navigationTitle("Reorder links").toolbar { Button("Done") { reorderLinks = false } } } }
                .sheet(isPresented: Binding(get: { editingLink != nil }, set: { if !$0 { editingLink = nil } })) { linkEditor }
                .alert("Rename tab", isPresented: Binding(get: { renameTab != nil }, set: { if !$0 { renameTab = nil } })) { TextField("Tab name", text: $tabTitle); Button("Save") { if let tab = renameTab { shared.renameBrowser(tab.id, title: tabTitle) }; renameTab = nil }; Button("Cancel", role: .cancel) { renameTab = nil } }
        }.onAppear { if !shared.lists.contains(where: { $0["id"].string == shared.selectedTeamListID }) { shared.selectedTeamListID = shared.lists.first?["id"].string ?? "" } }
        .task { await shared.refresh(life) }
        .task(id: life.accountIdentity) { while !Task.isCancelled { try? await Task.sleep(for: .seconds(4)); if !saving && editingLink == nil && editingList == nil { await shared.refresh(life) } } }
        .task(id: destinations.selectedID) { while !Task.isCancelled { if let remote = destinations.selected { await shared.refreshTeamBrowserTabs(remote) }; try? await Task.sleep(for: .seconds(2)) } }
        .onChange(of: shared.selectedBrowser) { _, id in if let id { section = id } else if section != "Overview" && section != "Standup" { section = "Overview" } }
        .onChange(of: shared.lists) { _, lists in if !lists.contains(where: { $0["id"].string == shared.selectedTeamListID }) { shared.selectedTeamListID = lists.first?["id"].string ?? "" } }
    }
    private var heading: some View {
        HStack(spacing: 8) {
            NativeFeatureHeading(title: section == "Standup" ? "Standup" : "Team Tools")
            Spacer(minLength: 8)
            if section == "Standup" && list != .null {
                Button { editingList = TeamListEditorItem(id: list["id"].string, original: list) } label: { Image(systemName: "pencil").frame(width: 44, height: 44) }.contentShape(Rectangle()).accessibilityLabel("Edit standup list").accessibilityIdentifier("standup-edit-list")
                if NativePadPreview.enabled && !docked { Button { docked = true } label: { Image(systemName: "sidebar.left").frame(width: 44, height: 44) }.contentShape(Rectangle()).accessibilityLabel("Dock standup").accessibilityIdentifier("standup-dock") }
            }
            if section != "Standup" || NativePadPreview.enabled { Button { Task { await shared.refresh(life) } } label: { Image(systemName: "arrow.clockwise").frame(width: 44, height: 44) }.accessibilityLabel("Refresh Team lists") }
            Menu {
                Button("Refresh Team lists", systemImage: "arrow.clockwise") { Task { await shared.refresh(life) } }
                Button("Create team list", systemImage: "plus") { editingList = TeamListEditorItem(id: "new", original: .null) }; Button("Website account", systemImage: "person.crop.circle") { showAccount = true }
                ForEach(shared.browserProfiles, id: \.self) { profile in Button("Browser · " + profile["name"].string, systemImage: "globe") { shared.open(nil, scope: "team", profileId: profile["id"].string); section = shared.selectedBrowser ?? "Overview" } }
                Button("Reorder Team tabs", systemImage: "arrow.left.arrow.right") { reorderTabs = true }.disabled(shared.tabs(in: "team").count < 2)
            } label: { Image(systemName: "ellipsis.circle").frame(width: 44, height: 44) }.accessibilityLabel("Team Tools options")
            if NativePhonePreview.enabled { NativeMainTabAdd() }
            if NativePadPreview.enabled { HStack { Image(systemName: "magnifyingglass"); TextField("Search", text: $query) }.font(.subheadline).padding(10).frame(minWidth: 100, maxWidth: 220).background(NativeTheme.surface, in: Capsule()) }
        }.buttonStyle(.plain).padding(.horizontal, NativePhonePreview.enabled ? 8 : 20).padding(.vertical, NativePhonePreview.enabled ? 0 : 12).background(NativeTheme.background).accessibilityElement(children: .contain).accessibilityIdentifier("team-feature-header")
    }
    private var tabs: some View {
        HStack(spacing: 0) {
            NativeTabStrip(ids: ["Overview", "Standup"] + shared.tabs(in: "team").map(\.id), selection: section) { HStack(spacing: 0) {
                ForEach(["Overview", "Standup"], id: \.self) { name in
                    Button { section = name } label: { HStack(spacing: 7) { NativeDesktopTeamIcon(standup: name == "Standup").frame(width: 20, height: 20); Text(name == "Overview" ? "Team Tools" : name).lineLimit(1) }.padding(.horizontal, 14).frame(height: 44).background(section == name ? NativeTheme.accent.opacity(0.08) : .clear).overlay(alignment: .bottom) { Rectangle().fill(section == name ? NativeTheme.accent : .clear).frame(height: 2) } }.accessibilityIdentifier("team-section-" + name.lowercased())
                    Divider().frame(height: 24)
                }
                ForEach(shared.tabs(in: "team").filter { !$0.hidden }) { tab in
                    HStack(spacing: 0) { Button { shared.select(tab.id, in: "team"); section = tab.id } label: { NativeContentTabLabel(title: tab.title, symbol: "globe").padding(.leading, 12).frame(height: 44) }; Button { shared.close(tab.id); if section == tab.id { section = "Overview" } } label: { Image(systemName: "xmark").font(.caption).frame(width: 44, height: 44) }.accessibilityLabel("Close " + tab.title) }
                        .background(section == tab.id ? NativeTheme.accent.opacity(0.08) : .clear)
                        .overlay(alignment: .bottom) { Rectangle().fill(section == tab.id ? NativeTheme.accent : .clear).frame(height: 2) }
                        .accessibilityIdentifier("team-browser-tab-" + tab.id).accessibilityValue(section == tab.id ? "Active" : "Inactive")
                        .contextMenu { Button("Rename tab", systemImage: "pencil") { renameTab = tab; tabTitle = tab.title }; Button("Move left") { shared.shiftBrowser(tab.id, by: -1) }; Button("Move right") { shared.shiftBrowser(tab.id, by: 1) }; Button(tab.persist ? "Do not persist tab" : "Persist tab") { shared.persistBrowser(tab.id, enabled: !tab.persist) }; Button("Unload") { shared.unload(tab.id) }; Button("Close other tabs") { for other in shared.tabs(in: "team") where other.id != tab.id { shared.close(other.id) } }; Button("Close tabs to the right") { let items = shared.tabs(in: "team"); if let i = items.firstIndex(where: { $0.id == tab.id }) { for other in items.dropFirst(i + 1) { shared.close(other.id) } } } }
                    Divider().frame(height: 24)
                }
            } }.scrollIndicators(.hidden)
            if NativePadPreview.enabled { Button { shared.open(nil, scope: "team"); section = shared.selectedBrowser ?? "Overview" } label: { Image(systemName: "plus").frame(width: 44, height: 44) }.accessibilityLabel("Add Team tab") }
        }.buttonStyle(.plain).nativeTabBar().overlay(alignment: .bottom) { Divider() }.accessibilityIdentifier("team-navigation-tabs")
    }
    private var listPicker: some View {
        Picker("Team list", selection: $shared.selectedTeamListID) { ForEach(shared.lists, id: \.self) { Text($0["name"].string).tag($0["id"].string) } }.accessibilityIdentifier("team-list-selection")
    }
    private var tools: some View {
        NativeList {
            if !shared.lists.isEmpty {
                Section { listPicker; Text("Shared lists and links · website service").font(.caption).foregroundStyle(.secondary) }
                Section {
                    HStack { Text("Standup links").font(.headline); Spacer(); Button { beginLink(.null) } label: { Image(systemName: "plus").frame(width: 44, height: 44) }.accessibilityLabel("Add standup link"); Button { reorderLinks = true } label: { Image(systemName: "arrow.up.arrow.down").frame(width: 44, height: 44) }.disabled(list["links"].array.count < 2).accessibilityLabel("Reorder links") }.buttonStyle(.borderless)
                    ForEach(list["links"].array.filter { query.isEmpty || ($0["title"].string + $0["url"].string).localizedCaseInsensitiveContains(query) }, id: \.self) { link in linkRow(link) }
                    if list["links"].array.isEmpty { Text("Add a link for this team list.").font(.caption).foregroundStyle(.secondary) }
                }
                Section { Button("Open Standup", systemImage: "slider.horizontal.3") { section = "Standup" } }
            } else { emptyTeamState }
            if let error = shared.error { Text(error).foregroundStyle(.orange) }
        }
    }
    private var emptyTeamState: some View {
        Section {
            if shared.busy { ProgressView("Loading team lists…") }
            else if life.credential?.appAuthorized != true && !NativeDesignPreview.fixtureService {
                Text("Connect your website account to load shared team lists and standup links.")
                Button("Website account", systemImage: "person.crop.circle") { showAccount = true }
            } else if shared.error != nil {
                Text("Team lists could not be refreshed. Your saved lists have not been removed.")
                Button("Refresh Team lists", systemImage: "arrow.clockwise") { Task { await shared.refresh(life) } }
            } else {
                Text("No team lists are available for this website account.")
                Button("Create team list", systemImage: "plus") { editingList = TeamListEditorItem(id: "new", original: .null) }
            }
        }
    }
    private func linkRow(_ link: JSON) -> some View {
        HStack { Button { if let url = SharedAppStore.safeURL(link["url"].string) { shared.open(url, title: link["title"].string, scope: "team"); section = shared.selectedBrowser ?? "Overview" } } label: { VStack(alignment: .leading, spacing: 5) { Text(link["title"].string.isEmpty ? link["url"].string : link["title"].string); if NativePadPreview.enabled { Text(link["url"].string).font(.caption).foregroundStyle(.secondary).lineLimit(1) } }.frame(maxWidth: .infinity, alignment: .leading).frame(minHeight: 44) }.buttonStyle(.plain).accessibilityIdentifier("team-link-" + link["id"].string)
            if NativePadPreview.enabled { Button { beginLink(link) } label: { Image(systemName: "pencil").frame(width: 44, height: 44) }.accessibilityLabel("Edit " + link["title"].string).accessibilityIdentifier("team-link-edit-" + link["id"].string); Button(role: .destructive) { saveLinks(list["links"].array.filter { $0["id"] != link["id"] }, original: list) } label: { Image(systemName: "trash").frame(width: 44, height: 44) }.accessibilityLabel("Remove " + link["title"].string) }
        }.buttonStyle(.borderless).contextMenu { Text(link["url"].string); Button("View or edit URL", systemImage: "pencil") { beginLink(link) }; Button("Remove link", systemImage: "trash", role: .destructive) { saveLinks(list["links"].array.filter { $0["id"] != link["id"] }, original: list) }; Button("Reorder links", systemImage: "arrow.up.arrow.down") { reorderLinks = true } }
    }
    private var standup: some View {
        NativeList {
            if list == .null { emptyTeamState } else {
            Section { listPicker }
            if !docked || !NativePadPreview.enabled { Section { VStack(alignment: .leading, spacing: 14) { StandupView(showListPicker: false, showLinks: false) }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8) } }
            Section("List settings") {
                Text(list["name"].string).font(.headline)
                Text("\(list["members"].array.count) people · \(list["timezone"].string)").font(.caption).foregroundStyle(.secondary)
                Button("Edit list settings", systemImage: "pencil") { editingList = TeamListEditorItem(id: list["id"].string, original: list) }.disabled(list == .null)
            }
            }
        }.accessibilityIdentifier("standup-page")
    }
    private var standupDock: some View {
        VStack(spacing: 0) {
            HStack { Text("Standup").font(.headline); Spacer(); Button { docked = false } label: { Image(systemName: "xmark").frame(width: 44, height: 44) }.accessibilityLabel("Close docked standup").accessibilityIdentifier("standup-close-dock") }.padding(.leading, 16).padding(.trailing, 4)
            ScrollView { VStack(alignment: .leading, spacing: 14) { StandupView(showListPicker: false, showLinks: false) }.frame(maxWidth: .infinity, alignment: .leading).padding(16) }
        }.background(NativeTheme.background).accessibilityElement(children: .contain).accessibilityIdentifier("standup-docked-list")
    }
    private func beginLink(_ link: JSON) { linkList = list; linkTitle = link["title"].string; linkURL = link["url"].string; editingLink = link == .null ? .object(["id": .string("")]) : link }
    private var linkEditor: some View {
        NavigationStack { NativeForm { TextField("Link name", text: $linkTitle).accessibilityIdentifier("team-link-name"); TextField("URL", text: $linkURL, axis: .vertical).lineLimit(3...6).frame(minHeight: 72, alignment: .topLeading).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).accessibilityIdentifier("team-link-url"); if let error = shared.error { Text(error).foregroundStyle(.orange) } }.navigationTitle("Standup link").navigationBarTitleDisplayMode(.inline).toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { editingLink = nil } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { var links = linkList["links"].array; var fields = (editingLink ?? .null).object; let id = fields["id"]?.string ?? ""; fields["id"] = .string(id.isEmpty ? UUID().uuidString.lowercased() : id); fields["title"] = .string(linkTitle); fields["url"] = .string(linkURL); if let i = links.firstIndex(where: { $0["id"].string == id }) { links[i] = .object(fields) } else { links.append(.object(fields)) }; saveLinks(links, original: linkList, dismiss: true) }.disabled(saving || SharedAppStore.safeURL(linkURL) == nil || linkTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) } } }
    }
    private func saveLinks(_ links: [JSON], original: JSON, dismiss: Bool = false) { guard !saving else { return }; saving = true; Task { defer { saving = false }; var body = original.object; body["links"] = .array(links); body["expectedRevision"] = original["revision"]; if await shared.mutate(life, path: "/team-lists/" + original["id"].string, method: "PUT", body: .object(body)) != nil, dismiss { editingLink = nil } } }
}

/// Paths mirror public/browser-icons.js, rather than substituting unrelated platform glyphs.
private struct NativeDesktopTeamIcon: View {
    let standup: Bool
    var body: some View {
        Canvas { context, size in
            context.scaleBy(x: size.width / 24, y: size.height / 24)
            var path = Path()
            if standup { for y in [CGFloat(6), 12, 18] { path.move(to: CGPoint(x: 4, y: y)); path.addLine(to: CGPoint(x: 20, y: y)) }; context.stroke(path, with: .foreground, lineWidth: 1.8); for (x, y) in [(CGFloat(8), CGFloat(6)), (16, 12), (11, 18)] { context.fill(Path(ellipseIn: CGRect(x: x - 2, y: y - 2, width: 4, height: 4)), with: .foreground) } }
            else { path.addEllipse(in: CGRect(x: 5, y: 4, width: 6, height: 6)); path.move(to: CGPoint(x: 2, y: 20)); path.addLine(to: CGPoint(x: 2, y: 17)); path.addCurve(to: CGPoint(x: 14, y: 17), control1: CGPoint(x: 2, y: 9), control2: CGPoint(x: 14, y: 9)); path.addLine(to: CGPoint(x: 14, y: 20)); path.move(to: CGPoint(x: 16, y: 4)); path.addCurve(to: CGPoint(x: 16, y: 10), control1: CGPoint(x: 20, y: 4), control2: CGPoint(x: 20, y: 10)); path.move(to: CGPoint(x: 17, y: 13)); path.addCurve(to: CGPoint(x: 22, y: 18), control1: CGPoint(x: 20, y: 13), control2: CGPoint(x: 22, y: 15)); path.addLine(to: CGPoint(x: 22, y: 20)); context.stroke(path, with: .foreground, lineWidth: 1.8) }
        }.accessibilityHidden(true)
    }
}

import Foundation
import SwiftUI

/// A small composer-only projection. No file bytes or execution choices enter
/// the shared text protocol, and incoming text never starts a turn.
@MainActor final class NativeSharedDraftText: ObservableObject {
    @Published var notice = ""
    @Published var conflict: JSON = .null
    @Published var copies: [JSON] = []
    private(set) var receivedText: String?
    private weak var store: RemoteStore?
    private var identity: [String: JSON] = [:]
    private var cacheKey = ""
    private var state: JSON = .null
    private var local = ""
    private var edited = Date.distantPast
    private var busy = false
    private var generation = 0
    private var apply: ((String) -> Void)?
    private var task: Task<Void, Never>?
    deinit { task?.cancel() }
    func stop() { task?.cancel(); task = nil; generation += 1; identity = [:]; apply = nil; notice = ""; conflict = .null; copies = [] }
    func activate(store: RemoteStore, identity: [String: JSON], text: String, apply: @escaping (String) -> Void) {
        if self.store === store && self.identity == identity { self.apply = apply; local = text; return }
        task?.cancel(); generation += 1; self.store = store; self.identity = identity
        cacheKey = "shared-text:" + identity["kind"]!.string + ":" + identity["id"]!.string
        state = store.draft(cacheKey); local = text; self.apply = apply
        conflict = state["conflict"]; copies = state["copies"].array
        task = Task { [weak self] in
            while !Task.isCancelled { await self?.tick(); do { try await Task.sleep(for: .milliseconds(1500)) } catch { return } }
        }
    }
    func changed(_ text: String) { if text != local { receivedText = nil; local = text; edited = Date(); if conflict == .null && notice != "Saving draft…" { notice = "Saving draft…" } } }
    func syncNow() async { await tick() }
    private func publish() { receivedText = local; apply?(local) }
    private func save() { var value = state.object; value["copies"] = .array(copies); value["conflict"] = conflict; state = .object(value); store?.setDraft(cacheKey, state, notifyObservers: false) }
    private func retain(_ text: String) { guard !text.isEmpty, !copies.contains(where: { $0["text"].string == text }) else { return }; copies.append(.object(["text": .string(text), "at": .string(ISO8601DateFormatter().string(from: Date()))])); copies = Array(copies.suffix(8)) }
    func useOther() { guard conflict != .null else { return }; retain(local); local = conflict["text"].string; publish(); var value = state.object; value["base"] = conflict; value["pending"] = nil; state = .object(value); conflict = .null; notice = "Draft text synced"; save() }
    func keepThis() { guard conflict != .null else { return }; retain(conflict["text"].string); var value = state.object; value["base"] = conflict; value["pending"] = nil; state = .object(value); conflict = .null; save(); Task { await tick() } }
    private func tick() async {
        guard !busy, Date().timeIntervalSince(edited) >= 0.75, let store, store.connected, !identity.isEmpty else { return }
        guard store.state["capabilities"].array.contains(.string("draft.text.v1")) else { notice = "Draft text stays here until its computer is updated"; return }
        busy = true; defer { busy = false }; let host = store.connection?.hostId, epoch = generation, started = local
        func current() -> Bool { generation == epoch && store.connected && store.connection?.hostId == host }
        do {
            var remote = try await store.request("draft.text.get", identity)
            guard current(), local == started else { return }
            var value = state.object
            if value["pending"] != nil && value["pending"] != .null {
                let pending = value["pending"]!
                remote = try await store.request("draft.text.save", identity.merging(pending.object) { _, new in new })
                guard current() else { return }; value["pending"] = nil
                if remote["conflict"].bool { state = .object(value); conflict = remote; notice = "Draft changed on another device. Both versions are retained."; save(); return }
                var base = remote.object; base["text"] = pending["text"]; base["revision"] = remote["appliedRevision"]; value["base"] = .object(base); state = .object(value); save()
            }
            if conflict != .null { if local == remote["text"].string { conflict = .null; value["base"] = remote; state = .object(value); save() } else { conflict = remote; notice = "Draft changed on another device. Both versions are retained."; save(); return } }
            if value["base"] == nil || value["base"] == .null {
                value["base"] = remote
                if !local.isEmpty && !remote["text"].string.isEmpty && local != remote["text"].string { state = .object(value); conflict = remote; notice = "Draft changed on another device. Both versions are retained."; save(); return }
                if local.isEmpty { local = remote["text"].string; publish() }
                state = .object(value); save()
            }
            var base = value["base"] ?? remote
            if local == base["text"].string || local == remote["text"].string {
                local = remote["text"].string; publish(); value["base"] = remote; state = .object(value); notice = "Draft text syncs across devices"; save(); return
            }
            if remote["text"].string.isEmpty && remote["clearedRevision"] != .null && remote["clearedRevision"].int == base["revision"].int { base = remote; value["base"] = base }
            guard remote["text"].string == base["text"].string else { state = .object(value); conflict = remote; notice = "Draft changed on another device. Both versions are retained."; save(); return }
            let submitted = local
            let pending: JSON = .object(["text": .string(submitted), "expectedRevision": remote["revision"], "operationId": .string(UUID().uuidString)])
            value["pending"] = pending; state = .object(value); save()
            let result = try await store.request("draft.text.save", identity.merging(pending.object) { _, new in new })
            guard current() else { return }; value["pending"] = nil
            if result["conflict"].bool { state = .object(value); conflict = result; notice = "Draft changed on another device. Both versions are retained."; save(); return }
            var next = result.object; next["text"] = .string(submitted); next["revision"] = result["appliedRevision"]; value["base"] = .object(next); state = .object(value); notice = "Draft text synced"; save()
        } catch { if current() { notice = "Draft kept on this device · " + error.localizedDescription } }
    }
}

struct NativeDraftSyncStatus: View {
    @ObservedObject var sync: NativeSharedDraftText
    var body: some View {
        if sync.conflict != .null || !sync.copies.isEmpty || sync.notice.contains("stays here") || sync.notice.contains("kept on this device") {
            VStack(alignment: .leading, spacing: 6) {
                Text(sync.notice).font(.caption2).foregroundStyle(.secondary)
                if sync.conflict != .null { HStack { Button("Use other draft") { sync.useOther() }; Button("Keep this draft") { sync.keepThis() } }.font(.caption) }
                if !sync.copies.isEmpty { DisclosureGroup("Saved draft copies (\(sync.copies.count))") { ForEach(Array(sync.copies.enumerated()), id: \.offset) { _, copy in Text(copy["text"].string).font(.caption).textSelection(.enabled) } } }
            }.accessibilityIdentifier("shared-draft-status")
        }
    }
}

struct NativeDraftSyncBadge: View {
    @ObservedObject var sync: NativeSharedDraftText
    var body: some View {
        if sync.notice == "Saving draft…" { Text("Saving draft…").font(.caption2).foregroundStyle(.secondary) }
        else if sync.notice == "Draft text synced" || sync.notice == "Draft text syncs across devices" { Label("Draft synced", systemImage: "icloud").font(.caption2).foregroundStyle(.secondary) }
    }
}

import SwiftUI

struct NativeMoveLocation: Identifiable, Equatable {
    let id: String
    let label: String
}
struct NativeMoveGroup: Identifiable {
    let id: String
    let label: String
    let locations: [NativeMoveLocation]
}
/// All native move entry points share this hierarchy. Values retain owner identity.
enum NativeMoveLocations {
    static func groups(context: JSON, projects: JSON, chats: [JSON] = [], containersOnly: Bool = false, hostID: String? = nil, roots: Bool = true) -> [NativeMoveGroup] {
        let key: (String, String) -> String = { kind, id in hostID.map { kind + ":" + $0 + ":" + id } ?? kind + ":" + id }
        var groups: [NativeMoveGroup] = roots && !containersOnly ? [NativeMoveGroup(id: "application", label: "Application", locations: [NativeMoveLocation(id: "main:main", label: "Application tabs"), NativeMoveLocation(id: "team:team", label: "Team Tools")])] : []
        groups += context["workspaces"].array.map { workspace in
            let children = projects["projects"].array.filter { $0["workspaceId"] == workspace["id"] }
            let workspaceRow = NativeMoveLocation(id: key("workspace", workspace["id"].string), label: workspace["name"].string + " · Workspace")
            return NativeMoveGroup(id: key("workspace", workspace["id"].string), label: workspace["name"].string, locations: (containersOnly && !children.isEmpty ? [] : [workspaceRow]) + children.map { NativeMoveLocation(id: key("project", $0["id"].string), label: $0["name"].string) })
        }
        if !containersOnly && !chats.isEmpty { groups.append(NativeMoveGroup(id: "chats", label: "Chats", locations: chats.map { NativeMoveLocation(id: key("chat", $0["id"].string), label: $0["title"].string) })) }
        return groups
    }
}
struct NativeMoveDestinationPicker: View {
    let groups: [NativeMoveGroup]
    @Binding var selection: String
    var body: some View {
        Picker("Destination", selection: $selection) {
            ForEach(groups) { group in Section(group.label) { ForEach(group.locations) { location in Text(location.label).tag(location.id) } } }
        }.accessibilityIdentifier("move-tab-destination")
    }
}

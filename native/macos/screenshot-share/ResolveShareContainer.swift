import Foundation

@main
struct ResolveShareContainer {
    static func main() {
        guard let container = ShareContainer.url() else {
            exit(1)
        }
        print(container.path)
    }
}

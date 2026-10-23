# Code organization

Organize by feature and responsibility. Keep executable entry points stable, place state and
models away from views, and route effects through the host service that owns them. Moving a
file must not create another runner, session, authorization boundary or source of truth.

| Area | Layout and responsibility |
| --- | --- |
| Node | `src/server.js`, `engine.js`, CLI and MCP launchers are stable entry points. `src/providers/` owns provider adapters; `src/models/` owns shared catalog models; `src/services/<feature>/` owns browser, chat, workspace, update, integration, scheduling and remote operations; `src/shared/` holds small shared primitives. |
| Electron | `desktop/main.cjs` and `preload.cjs` compose the app. `browser/`, `windows/`, `documents/`, `updates/`, `link-routing/` and `features/` own their respective native behavior and companion assets. `services/` contains host facilities. |
| Shared renderer | `public/features/<feature>/` contains feature UI and controllers; `public/models/`, `services/` and `shared/{navigation,ui}/` contain shared state, transport and reusable controls. `app.js` remains the composition entry point. Nested public modules use an exact server asset allowlist; symlinks/private files are excluded. |
| iOS | `App/` composes the application; `Models/` contains serializable descriptors/identities; `Services/{Networking,State,Persistence,Notifications}/` owns effects and durable state; `State/` contains view-specific measurement state; `Features/<feature>/Views/` contains screens; `Shared/` contains navigation, scrolling, design and reusable views; `Preview/` contains synthetic fixtures. Xcode groups mirror real folders. |
| Web | Laravel keeps `app/Models`, `app/Services`, `app/Http/Controllers` and `resources/views`; `resources/js` composes the remote client and imports common Proteus feature/navigation controls. Do not duplicate a shared menu or permission UI for each resource type. |

Large existing composition views/stores remain migration seams. Extract their next substantial
responsibility into a focused related module instead of growing another root-level file or
performing an unrelated rewrite. Preserve imports, workers, preloads, assets and package inclusion
when moving code. Keep fixture data outside production state and validation outputs outside packages.

Use comments to explain ownership, consent, concurrency, cancellation, retry identity, ordering and
why a non-obvious choice is necessary. Public service boundaries should describe their contract;
avoid comments that merely repeat a function name. SwiftUI observable state should include only
values that affect presentation. High-frequency measurements and serialization/I/O should not
invalidate an entire chat or block the main actor.

This follows the common principles in Apple's [Managing model data in your app](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app),
Google's [Guide to app architecture](https://developer.android.com/topic/architecture), and
Microsoft's [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures):
separate UI from state/data, keep an explicit source of truth, isolate effects and dependency
boundaries, and organize related features together. These sources guide Proteus's own architecture;
they do not require adopting another platform's framework or adding layers without a purpose.

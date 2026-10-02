# Rich chat rendering

Chat text remains Markdown in the existing run JSON and encrypted mobile protocol. The Mac and
native iPhone/iPad apps use the same bundled renderer: markdown-it for Markdown and highlight.js
for code. No CDN is required. Markdown file tabs use the same preview, with source available below.

Supported formatting includes headings, paragraphs, emphasis, strikethrough, nested lists, read-only
task lists, quotes, links, rules, aligned tables, fenced code with copy buttons, and raster images.
Wide tables and code blocks scroll horizontally. An unfinished streaming block is re-rendered as
text arrives. Unknown code languages remain readable as plain code.

On the Mac, opening a chat starts at the latest message. While near the bottom (40px), new messages,
streamed text, and delayed image layout keep the view at the bottom. Scrolling up preserves the
reading position; Jump to latest resumes following. Each open chat keeps its own reading position.
Completed and streamed messages occupy the same scroll area. Selecting text temporarily defers
background re-rendering so the selection can be copied.

Raw HTML is displayed as text. Scripts, iframes, dangerous URL schemes, and arbitrary HTML attributes
are never interpreted. External image URLs have a Load image button; loading them sends the request
to that website without a referrer. Workspace images load automatically through authenticated host
requests. Images must be referenced in that run's Markdown, be inside its captured workspace roots
(after resolving symlinks), be a recognized PNG/JPEG/GIF/WebP, and be at most 4MB. Mobile image bytes
travel through the encrypted relay, not a public filesystem endpoint. Paths relative to a chat
resolve against its working directory; paths in a Markdown file resolve against the file's folder.
Images outside authorized roots show an unavailable placeholder.

Web links open in Mac browser tabs or the mobile system browser. Markdown file links open Mac
preview tabs; other workspace files use the existing authorized path handler. Mobile Mac-file links
copy the path for use on the Mac. This increment does not implement executable HTML, Mermaid,
LaTeX, or provider-specific interactive widgets.

Assistant message labels use the main agent selected in the captured chat context, including
streaming output. New responses retain the agent name when saved, so later agent changes do not
rename earlier messages. Older messages fall back to the captured selection. Without an explicit
main agent, the label identifies the provider (Copilot or Rehearsal).

## Development

- Edit `src/markdown-renderer.js` and `public/markdown/style.css`, then run `npm run markdown:build`.
  Commit the bundled runtime and third-party notices so Xcode can build without Node installed.
- `npm run ios:generate` refreshes the checked-in Xcode project. Its folder resource shares the
  actual renderer assets with the desktop app. Signing team IDs stay outside the repository.
- `npm test` checks Markdown escaping, image boundaries, and encrypted image transport.
- `node test/chat-ui.mjs` checks streaming, reader position, Jump to latest, tables, code copying,
  image rendering and HTML escaping in Electron against disposable synthetic data.
- `ProteusTests/MarkdownTests` runs the bundled renderer in real WKWebView on iPhone/iPad simulators.
  The full native test suite also needs `node test/mobile-host.mjs` (see remote.md).

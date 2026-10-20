# Composer design reviews on remote clients

Production 0.2.11 adopts these approved layouts and adds automatic sharing of chat-linked local
design servers. See [the current full release ledger](../../2026-10-10-full-chat-release.md) for
verification and per-target installation. The manual review workflow below remains available.

Open either HTML document from this chat on iPhone, iPad, web or another desktop:

- [Desktop and web design](desktop-web-composer.shared.html)
- [iPhone and iPad design](adaptive-composer.html)

Choose **Enable interactive preview** to use the design's controls. These are design rehearsals;
provider runs, permissions and real file-open actions are not connected.

The owning Mac supplies the approved document through Proteus's encrypted relay document
transport. It must be connected when requesting the document. Existing per-device document
access settings apply. Use **Check latest** or the client's document refresh action after updates;
updates do not stream automatically. Availability depends on the installed client's HTML preview
support; source support exists for desktop, web and native iOS. Physical remote-device delivery
has not been verified for these previews.

The desktop/web shared copy contains its styles and scripts, including the attachment picker.
The adaptive mobile design already is self-contained. Neither needs the local preview server.
Regenerate the shared desktop/web copy after design changes:

```sh
node docs/design/2026-10-09/build-shared-preview.mjs
```

This manual document workflow is separate from 0.2.11 automatic static snapshot updates. Proteus
bundles local HTML/CSS/JS dependencies on the owning Mac and delivers revisions through existing
encrypted viewing grants. Arbitrary host APIs, WebSockets and HMR are not forwarded.

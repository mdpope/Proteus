# Linux window controls — October 21

The operator requests a hidden Linux title bar, upper-left Linux-style window buttons and a
circled-dots File/Edit/View/Window menu, with Mac unaffected. Implementation is Linux-gated in
both BrowserWindow options and the renderer. Trusted main-frame IPC controls its own window;
native menu roles/shortcuts and existing Close/Quit handling remain authoritative.

At implementation time the selected main checkout was 0.2.26 at `e350395`, while the running
0.2.27 package was `linux.efadefd11f92`. To avoid a downgrade, the change was also ported into an isolated source
copy of the matching `linux/release-0.2.27-e86a11f` branch at `3a9a5cf`, under the checkout's
ignored staging tree. Existing Mac titleBarStyle/trafficLightPosition, current renderer recovery,
palette and window-layout implementation remain in that current source. Preparation left the
installed app and its data untouched; the separately authorized installation is recorded below.

## Verified before packaging

- Main-checkout 819 runtime tests and static checks pass.
- Matching 0.2.27 source: all 846 runtime tests and static checks pass.
- Credential-free isolated actual Linux UI tests pass on both versions: upper-left placement,
  hidden menu row, native maximize/restore/minimize, dots-menu show/dismiss and F10 from shell,
  narrow layout, independent sender-bound actions and Close in two windows.
- Drag/no-drag regions are inspected in the rendered desktop; physical window dragging and live
  Mac behavior are not claimed. Mac/Windows/web platform gates pass unit checks.

Tests use disposable app/browser profiles with unavailable provider executable paths. Sandbox
restrictions prevent Electron startup and local sockets, so actual UI and full-suite runs use
the approved host execution route. No live-data recovery generation is created for build/tests.

## Delivery

Linux 0.2.27 build **`linux.c13dbc234869`** is installed, with source fingerprint
`c13dbc234869e8e32e51bc9ca0004266d4483936b40ace669b6cf677ce072ca7` and 284 verified runtime files.
The archive SHA-256 is `119a5d73e26bb91e6dca87de8194c17ee2700047c0486b3d15a73650a0146e4e`.

Exact-package acceptance passes the controls suite, including native frame/content bounds,
maximize/restore/minimize, dots/F10 native menu lifecycle, File → New Window action and accelerator
registration, narrow layout and sender-bound controls/Close across two windows. Browser-protocol
Ctrl+N injection did not activate the native shortcut; it is not counted as a physical-key test.
The standard exact-package suite passes runtime/private-file checks, isolated startup, unavailable
provider catalogs, synthetic rehearsal/feedback, native terminal keyboard I/O and history restart.
All 284 shipped runtime hashes also match the staged source after acceptance.

The runnable directory, archive/checksum, corresponding source archive/checksum, current-version
patch and receipt live under `.runtime/window-chrome-027-build`. The isolated current source is
`.runtime/window-chrome-027-source`; the patch applies to release branch `3a9a5cf`. A review image
is saved as `dist/linux-window-controls-preview.png`. Keep the current-version source companion
when delivering this package; the selected main checkout remains at the older release.

## Installed and verified

The operator subsequently authorized installing the new version. The supervised updater completed
the replacement and independent restored-window/runtime health verification, then automatically
resumed this same chat once. Fresh owner identity confirms the expected build/fingerprint and a
released update barrier; the update phase is complete with outcome updated and no error.

Independent post-install verification matches all 284 installed runtime files to the package
manifest and tested current source. The runner lock matches the verified new owner. The helper's
pre-restart event-prefix/effective-configuration checks pass. Settings, context, remote configuration,
permissions and content-tab records match the cold recovery snapshot exactly; logs, remote-command
and browser-history databases pass integrity checks. The empty remote-command receipt store's
protected metadata also matches its cold snapshot. Connections were not enabled or reconfigured.

Exactly two verified eligible recovery generations remain with matching receipt hashes. Actual
available space increased by **444,162,048 bytes** (about **424 MiB**) across the supervised update.
Frozen source/package archives and their hashes are unchanged. No Mac installation was changed;
physical window dragging, physical Ctrl+N and live Mac acceptance remain outside verified scope.

# Native browser navigation preservation

The operator reported that Proteus iPad on the computer briefly displayed a website before
returning to **Browsing home**. The address field retained the entered address. Retrying
navigation could keep the page open; main-navigation browsing did not show the same reset.

The shared chat/workspace tab merge accepted an empty owner-side new-tab placeholder as the
current URL. That replaced the native descriptor URL with nil, causing the view to display its
browsing home instead of the already-loaded web view. Chat polling runs every two seconds.
Both fetched snapshots and mutation acknowledgements use this merge boundary.

The correction keeps an active same-profile local URL, title and history when an empty
placeholder arrives, including before SwiftUI constructs the web view. Explicit custom names
still apply; nonempty remote navigation, profile changes, unloaded state and tab closure retain
their existing semantics. No broader sync protocol or styling change was made.

Verification:
- The new regressions failed on the old merge with ten assertions across chat and workspace scopes.
- 440 Node tests and static checks passed.
- Both iPad and iPhone simulators passed all 80 native unit tests and the focused browser UI regression, including repeated empty sync echoes, tab switching, back/forward and background/foreground.
- Release build and strict signature/resource/entitlement verification passed. Native 0.2.12 / 2610.12.2 is installed in place on the primary computer, retaining the existing certificate, profile and app data.
- The operator completed macOS verification. The installed app visibly reports 0.2.12 (2610.12.2), restores existing tabs and loads Google and Example Domain inside a chat without the immediate Browsing home reset.
- Live host synchronization acceptance is limited: a host-confirmation timeout appeared during this check. Repeated empty-response synchronization is verified by the controlled simulator regression, not claimed as an uninterrupted live-host check.

Installed native version is 0.2.12 / 2610.12.2. Physical devices retain their previous build. Desktop and production web are unchanged by this fix.

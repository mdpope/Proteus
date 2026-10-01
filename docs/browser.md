# Shared embedded browser

Electron owns the visible WebContentsView tabs, their persistent sign-in session, page titles,
address bar, navigation history, and lifecycle. Proteus supplies the tab strip and browser controls.
Enter navigates; Command/Ctrl+L focuses the address; links opening new windows create new tabs.
Tabs retain their page and history when switching between chats, schedules, and browser tabs.

Playwright controls those same pages through a private CDP bridge attached to one WebContents.
The bridge uses Electron's debugger API, a random single-use WebSocket path on loopback, and
rejects browser-wide target creation/enumeration. Production does not enable Electron's global
remote-debugging port. The app window is never registered as an automation target. The bridge is
an intentionally limited adapter, tested against the pinned Electron/Playwright versions; it is
not a full Chromium CDP server. Cross-origin frame behavior on complex sites needs further testing.

The provider-neutral broker supports listing, opening, navigating, accessibility snapshots,
clicking, filling, key presses, selecting, scrolling, and closing. The Copilot adapter exposes
`proteus_browser` as a native SDK tool. It does not expose arbitrary JavaScript, cookies, tokens,
network interception, local files, or the underlying CDP connection to the model. Existing tool
permission requests continue through the run's feedback interface.

Human-created tabs start private. Enable **Agent access** on a tab to make it available to runs.
A run can also open its own tab, which is available only to that run until explicitly shared.
Turning Agent access off revokes ownership, disconnects Playwright, and cancels pending actions.
The user can browse normally while a run works; for manual takeover, turn Agent access off first.
Only one model turn runs at a time, but human interaction can still change the page mid-action.

Sign in through the website normally. Browser profiles stay in Electron user data, outside Git.
Sites cannot load the privileged app origin. Downloads and device permissions are not enabled
in this prototype. Persisted browser authentication is separate from other browsers; no cookies
or authentication are copied from Safari, Chrome, VS Code, or Codex. Open tabs currently last
for the app session; sign-in persists across restarts.

For Slack, opening a workspace or seeing a tab is not content coverage. A successful integration
test must read an authenticated message and its thread, preserve the permalink, and report gaps.
If sign-in is needed, the run must ask the user instead of claiming an empty result.

Sources: [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view),
[Electron debugger](https://www.electronjs.org/docs/latest/api/debugger),
[Playwright CDP connection](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp).

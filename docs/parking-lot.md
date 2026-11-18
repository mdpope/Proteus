# Parking lot

Ideas, options and known gaps that are **not scheduled for any release**. An item here is never
shipped by accident: moving it into a release means adding it to that release's plan and
`docs/planned-updates.md` first. Keep entries short; remove them when shipped or rejected.

## Authentication

- **Claude sign-in drops (reported Nov 15–16).** Proteus runs the Claude Code CLI/SDK and relies on
  its own Keychain credential (`Claude Code-credentials`); Proteus does not hold or refresh the
  login. Likely contributors: several Claude sessions sharing one login (concurrent refresh with
  rotating refresh tokens), and re-login churn. Options, none implemented:
  1. Support a long-lived token from `claude setup-token` supplied to Proteus-launched sessions
     through the CLI's OAuth-token environment variable, stored in the Keychain by Proteus.
  2. Serialize or reduce concurrent Claude sessions per account, and surface "sign in again" with a
     one-click `claude auth login` instead of failing a turn.
  3. Record the time and error of each credential failure in Logs so the cause can be established.
  Not for the Nov 15 release.

## Desktop

- **Event-stream fallback capacity.** N11-68 schedules and implements a same-origin SharedWorker
  stream for ordinary windows; signed Mac six-window acceptance passes. Unsupported/failed workers
  still fall back to direct streams, which can hit the per-origin connection limit. Further fallback
  improvements remain unscheduled; the accepted fix belongs to the Nov 15 release plan.
- **Life feature tabs are per window.** Smart Home/Nutrition/Garage tabs persist across restarts
  but their grouping is window-local, not shared across windows.
- **Life workspace folder text entry.** The Life folder is chosen with the native folder dialog,
  which agent screen control cannot operate in the background. A typed-path field would allow
  automated setup.
- **Native desktop control limits.** Cua and Peekaboo refuse background input into native macOS
  dialogs (Open/Save); such steps need the operator.

## iOS / web

- **Mnemosyne camera QR pairing (N11-41).** The operator explicitly deferred this on November 16
  to a future Mnemosyne update, owned by Omi Integration. It is excluded from the current Proteus
  rollout; retain the original scoped-pairing acceptance requirements in the Nov 15 plan.
- iOS Nutrition/Garage lack the content-tab strip (chat, search, browser) that desktop Life has.
- Web Life pages have no Garage/Nutrition third-layer tabs.
- iOS file highlighting is a small generic highlighter, not language grammars.

## Release operations

- Website server code-release directories are not trimmed by the deploy client; retire older
  generations through the audited root wrapper after each accepted release.
- Local website backups live under Documents, where iCloud "Optimize Mac Storage" can evict large
  files (they read as empty and fail the recovery-set check). Keep the backup root out of iCloud
  optimization or materialize files before verification.
- A privacy-sanitized GitHub history cannot carry real build identities; the private draft-release
  transfer used for Work Mac and Linux is manual. A scripted private source/package transfer would
  remove several hand steps.

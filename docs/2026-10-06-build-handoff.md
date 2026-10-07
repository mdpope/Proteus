# October 6 bug and feature build handoff

The operator closed the October 6 intake for implementation from another machine. This handoff
records **requested work only**. No BF-2026-10-06 item has been implemented or verified by this
planning change. The authoritative scope and acceptance criteria are the 21 numbered entries at
the top of [planned updates](planned-updates.md). Follow [agent handoff](handoff.md) and
`AGENTS.md` for repository boundaries and validation.

## Start here

1. Read BF-2026-10-06-01 through BF-2026-10-06-21 in `docs/planned-updates.md`. Keep their
   acceptance criteria in the implementation review. The list is closed; new scope needs a
   separate decision.
2. Compare the source checkout with the installed app before editing tab UI. Screenshots showed
   a chat browser subtab strip that was absent from the checkout used during intake. Locate its
   owning implementation or determine which branch contains it. Do not treat similar main or
   Team tab code as proof that chat subtabs are covered.
3. Use synthetic pages, chats, devices, and provider responses for regressions. The original
   reports included private workplace material; URLs, messages, pairing codes, browser profiles,
   credentials, and usage data are intentionally excluded from this repository.
4. Keep the execution and account boundaries described in `AGENTS.md`, `docs/architecture.md`,
   `docs/browser.md`, `docs/remote.md`, and `docs/web-remote.md`. In particular, tab memory may
   sync bounded descriptors, not browser cookies or live page state; pairing and remote failures
   must not silently change authority or the Default Mac.

## Work groups and dependencies

| Area | Items | Relationship |
| --- | --- | --- |
| Website Mac connections | 01, 04 | Diagnose pairing failure before claiming the revised flow works end to end. |
| Desktop device controls and overlay | 02, 03, 05 | Preserve permission, browser view, and focus behavior during UI changes. |
| Browser agent control | 06, 07 | Browser read recovery and per-tab agent-control indicator share tab lifecycle concerns. |
| Chat activity presentation | 08, 09, 13 | Preserve true tool errors, accepted group/item styling, and consistent running state/wording. |
| Chat state and allowance | 10, 11, 12 | Verify status refresh and chat tab persistence with real state changes. Never invent quota. |
| Tab icons and mobile parity | 14, 15, 18, 19 | Coordinate icon, primary-tab, and descriptor contracts across clients. |
| Mobile chat layout and tab selection | 16, 17, 20, 21 | Compact header/composer while preserving chat ownership when browser tabs switch or close. |

The groups are a dependency map, not a claim that all 21 items belong in one code commit or one
deployment. The builder can split reviewable implementation PRs while tracking every item to
completion. Desktop and website share some presentation code; iOS is a native client and needs
its own checks. BF-19 flattens **mobile Team Tools** browser tabs; it does not by itself remove
desktop's Team browser navigation.

## Accepted visual examples

- [Chat and activity styling](design/2026-10-06/chat-parity-proposal.html): user and agent message
  boxes retain side accents. One warm orange activity group encloses the tool and approval
  sequence without a group side accent. Each contained item has its own side accent; successful
  items stay quiet green, while failed items gain a clearer orange tint and visible error text.
- [Running activity](design/2026-10-06/running-activity-proposal.html): desktop summary wording,
  existing circular working indicator on running items, and subtle group animation. This is a
  visual example, not a data contract; compute counts and status from real events.
- [Compact mobile composer](design/2026-10-06/mobile-compact-composer.html): shortened chat header,
  single-line draft preview when reading, expansion on touch, and a circular Stop control in both
  states. The example uses synthetic text and demonstrates the layout, not production behavior.

These standalone HTML files preserve the examples discussed during intake. The written criteria
in BF-08, BF-09, BF-13, BF-16, and BF-17 control where a sample leaves behavior unspecified.

## Validation and reporting

- Run `npm test` and `npm run check` after execution or persistence changes. Exercise the desktop
  UI after interface changes, plus focused website and iOS checks for the surfaces changed.
- Verify both the happy path and state transitions: active/inactive tabs, close last tab,
  submission while a turn runs, remote offline/reconnect, failed activity, and reduced motion.
- For BF-04, BF-07, and BF-12, separate synthetic regression results from live website pairing,
  agent browser, and provider-quota verification. An updated timestamp or clean build is not a
  successful live workflow.
- Update relevant feature docs, `CHANGELOG.md`, `docs/planned-updates.md`, and significant design
  decisions as items are implemented. Mark implemented, verified, and deferred status separately.

This planning handoff does not install, deploy, pair devices, start chats, or change running
application state.

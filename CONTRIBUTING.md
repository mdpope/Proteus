# Contributing to Proteus

Proteus is a provider-neutral local scheduler and conversation client. Start with
[the handoff](docs/handoff.md), [architecture](docs/architecture.md), and the repository's
`AGENTS.md`. The root license remains undecided; this document does not grant a license.

## Development

Use the Node version declared in `package.json` and install locked dependencies with
`npm ci`. `npm start` runs the local service; `npm run desktop` runs Electron. Set
`PROTEUS_HOME` to a disposable directory for experiments. Never run a development
instance against an installed app's live home, and never commit its contents.

Keep provider-specific behavior behind the provider boundary. Shared actions belong
in host-owned services, with UI, internal tools, and external MCP using the same
identity, revision, permission, and approval checks. Preserve unknown schedule fields,
validate before atomic replacement, and leave imported schedules paused.

## Validation

- Run `npm test` and `npm run check` after execution, storage, or transport changes.
- Exercise interface changes using the relevant `test/*-ui.mjs` rehearsal with
  disposable homes, synthetic content, and mock Keychain. A successful build does
  not verify a live provider workflow.
- For the website, run locked Composer/npm installation, `composer test`, and
  `npm run build` in `web/`. Use disposable SQLite and synthetic account records.
- Use the documented Apple/desktop build workflows for platform validation.
  Build-only testing does not justify copying live data or changing signing assets.

Cover failure paths that matter: stale revisions, reconnects, uncertain command
results, shutdown, restore, and authorization changes. Do not replay a mutation
because its response was lost. Preserve IDs, browser history, chat drafts, effective
configuration, approvals, and retry receipts through moves and refactors.

## Reviews

Describe the concrete trigger, resulting behavior, validation, and remaining limits.
Keep cosmetic changes small unless a design change was explicitly approved. Update
the affected feature docs, `CHANGELOG.md`, `docs/planned-updates.md`, and
`docs/decisions.md` for significant design choices. Separate implementation,
synthetic verification, and installed/live verification.

Do not include credentials, profiles, private prompts, conversations, usage records,
screenshots of real sessions, or machine-specific paths in commits, issues, or CI
artifacts. See [security reporting](SECURITY.md) for sensitive findings.

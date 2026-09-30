# Proteus

Proteus is an independent, provider-neutral local scheduler and conversation client.
Keep workflow-specific policy in the source repository that owns a schedule. Keep app formats,
provider adapters, interface behavior, and scheduler rules here. Never commit credentials,
browser profiles, actual workplace prompts, chats, usage data, or machine-specific paths.

Schedules are versioned JSON documents. Validate before atomic replacement, and preserve
unknown fields so other clients can extend the format. Run state belongs under the user's
configured application-data directory, outside this checkout. Never silently activate imported
schedules. New providers implement the provider boundary rather than changing scheduler code.

Run `npm test` and `npm run check` after changing execution or persistence. Exercise the desktop
UI after interface changes. Mark rehearsal output explicitly and never invent provider usage.
Only one runner process owns an application-data directory. Do not permit concurrent turns in
one session. A completed model turn is not proof that an external workflow finished successfully.

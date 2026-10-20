# Linux Codex: connecting to the Proteus relay

This is a connection handoff for Codex running on Linux. It documents the existing
client protocol; it does not install a Codex integration or register a new host.

## Source baseline

The shared-client API described here is available on
`codex/oct-7-implementation` at commit
`ec8b213d382ed24c649ca5a49a5711dca37f4758`. At the time this guide was added,
`main` did not contain `src/remote-client.js`, `src/desktop-peers.js` or
`docs/web-remote.md`. Adding this guide does not merge those implementations.
Use the pinned source links below to inspect that version when preparing the
Linux integration; do not assume the files exist in a checkout of `main`.

## Connection details

- Shared relay: `wss://relay.proteus.example`
- Protocol: Proteus remote protocol v1, encrypted WebSocket messages.
- Client socket: `/socket?role=client&host=<destination host UUID>`
- Runtime for the shared JavaScript client: Node.js 22.16 or later, with the
  repository's locked dependencies, including `ws`.

The relay routes encrypted traffic to the destination Proteus execution host.
Provider execution, workspace access and approvals remain on that host. The relay
does not expose a general HTTP command API or an MCP server. An adapter is needed
to expose its operations as Codex tools.

## Pair Linux as a client of an existing host

1. On the destination host, open **Remote access → Create pairing code**. An
   invitation expires after five minutes and can pair one device. Treat the
   invitation as a credential; do not commit it or print it in logs.
2. Reuse `parsePairing`, `BrowserRemoteClient` and `importKey` from
   `src/remote-client.js`. Parse the invitation and construct a host record with
   `hostId: capsule.hostId`, `relay: capsule.relay`, `inviteKey: capsule.key`,
   `expiresAt: capsule.expiresAt` and a label.
3. Import `WebSocket` from `ws` and supply
   `socketFactory: url => new WebSocket(url)`. Native Node clients should omit
   the browser `Origin` header. Browser clients have separate exact-origin checks.
4. Set a recognizable client `name` and implement `onCredential` before calling
   `connect()`. It receives `{hostId, relay, label, deviceId, key, pairedAt}`.
   Securely persist those credentials outside the checkout and logs, using the
   platform's secret storage or an approved encrypted store. Return only after
   saving succeeds. The host has consumed the invitation by this stage; failed
   persistence may require a new invitation.
5. Call `await client.connect()`. The shared client handles the pairing exchange,
   independent device key, AES-256-GCM encryption, fresh challenges and ordered
   message sequences. A connected WebSocket alone does not prove authentication.
6. Verify authenticated access with the read-only
   `await client.request('sync')`. Inspect the returned host identity and state
   before sending any mutations. Do not start a chat or run a schedule as a
   connection test.
7. Close the connection with `client.close()` when finished.

For reconnection, create a new client from the saved destination fields, setting
`key: await importKey(saved.key)` and retaining `deviceId`. Do not reuse the
invitation or leave `inviteKey` in the reconnect record. Each Linux client should
have its own pairing rather than copying another device's credentials.

A paired client does not need the host's relay registration token. Connecting to
the same relay, website account or network does not grant host access.

## Retry and permission rules

`client.request(method, args, options)` accepts `id` and `issuedAt` in `options`.
For a retry after an ambiguous mutation result, retain the original command UUID,
issue time and payload. Reconnect, inspect current state and retry only that same
intent; do not generate a fresh UUID that could execute the action again. An
edited action is a new intent. The host's durable command journal and current
permissions remain authoritative.

Do not bypass workspace grants, pending-request identity, revision checks or
provider permissions. Keep device credentials out of source, terminal output,
chat transcripts and command-line arguments.

## Registering Linux as a new execution host

This is separate from pairing Linux as a remote client. A new execution host needs
its own host UUID and distinct random 32-byte registration token, provisioned
through the relay's private operations workflow. Shared-relay map mode binds each
host UUID to its own 64-character hex token; unknown hosts and another host's token
are rejected. Never reuse an existing Mac's identity or registration token.

Host registration uses `/socket?role=host&host=<host UUID>` with
`Authorization: Bearer <host registration token>` and no browser Origin. It also
requires a running Proteus host implementation; opening this socket is not enough
to provide execution services. This document does not establish Linux host or
desktop support. Do not change the production token map or restart the relay as
part of an ordinary client connection.

## Troubleshooting and verification status

- Close code `1013`: the destination host may be offline or the relay busy.
- Close code `1012`: the destination host disconnected.
- Close code `1008`: review authentication, invitation validity, revocation and
  relay limits; preserve saved credentials pending diagnosis.
- An HTTP `/health` result checks relay service availability, not pairing or
  authenticated access to a destination host.

The connection details were checked against the Proteus source. No live Linux
pairing, provider execution, host provisioning or production relay change was
performed for this documentation handoff.

Related source and documentation, pinned to the baseline above:

- [Remote setup and protocol](https://github.com/mdpope/Proteus/blob/ec8b213d382ed24c649ca5a49a5711dca37f4758/docs/remote.md)
- [Shared client](https://github.com/mdpope/Proteus/blob/ec8b213d382ed24c649ca5a49a5711dca37f4758/src/remote-client.js)
- [Desktop client integration](https://github.com/mdpope/Proteus/blob/ec8b213d382ed24c649ca5a49a5711dca37f4758/src/desktop-peers.js)
- [Relay registration and website configuration](https://github.com/mdpope/Proteus/blob/ec8b213d382ed24c649ca5a49a5711dca37f4758/docs/web-remote.md)
- [Relay server](https://github.com/mdpope/Proteus/blob/ec8b213d382ed24c649ca5a49a5711dca37f4758/relay/server.js)

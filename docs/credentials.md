# Credential providers and browser sign-in

Proteus has a desktop-only credential broker with a Bitwarden CLI adapter. The broker is independent
of Copilot and unavailable through the HTTP API or agent tools. Future providers can implement the
same status/unlock/lock/login operations. This is login assistance, not a general token broker or a
replacement for each MCP's authentication mechanism.

1. Install the official [Bitwarden CLI](https://bitwarden.com/help/cli/) and authenticate it using
   its normal interactive login flow. Use a dedicated CLI data directory if separating accounts.
2. In Credentials, add the executable and optional CLI data directory. Copy sign-in command supplies
   the correctly scoped interactive Terminal command if needed. Then Check connection and Unlock.
3. Add a login binding with its exact item ID, personal or organization scope, organization and
   collection IDs when applicable, and exact HTTPS login origins. Each origin must also appear on
   the Bitwarden item's login URIs. Proteus does not search or enumerate your vault.
4. Open that login site in a browser tab, click **Fill login**, and select the binding. Proteus
   makes the tab private and disconnects agent control before fetching or filling credentials.
5. Complete the website's submit, passkey, Okta Verify, or other verification yourself. Enable
   Agent access again only when ready to share the authenticated page with the run.

The master password is passed to the local CLI through its child environment, never command-line
arguments or files. The unlock session stays in process memory for up to 15 minutes and is cleared
on lock, provider changes, or exit. Proteus never saves vault passwords/session keys, sends them to
the chat renderer, or copies them to the clipboard. Secret-bearing CLI errors are suppressed. The
saved configuration contains only provider paths, stable IDs, and approved origins.

Fill targets visible username/password inputs in the top-level document, rechecks the origin at
execution time, rejects ambiguous forms, and never submits. Cross-origin frames and password-change
forms are not supported. The webpage necessarily receives the filled values; login bindings must
identify the intended site. Human-created authenticated browser sessions stay in the existing
Electron browser profile. Corporate sign-in compatibility must be verified against the actual site.

The Bitwarden Chrome extension is not loaded. Electron supports only a
[subset of extension APIs](https://www.electronjs.org/docs/latest/api/extensions-api), so Chrome
extension installation alone would not establish compatibility. The CLI adapter avoids depending
on an unverified extension. Native passkey/security-key and corporate SSO support remain subject to
the embedded Chromium/browser environment; use the organization's normal login flow when needed.

Existing workflow-specific Keychain/bootstrap helpers are not automatically imported. A provider
can point at an already-authenticated CLI profile, but Proteus does not migrate credentials or
infer an organization/collection binding from a repository name.


## Empty desktop connections and macOS Keychain

The combined Chats index must not request protected storage merely to discover that no outgoing
desktop connections exist. A missing `desktop-peers.enc` means an empty outgoing-connection
list; an orphan `desktop-chat-index.enc` is not authority and must remain unread and unchanged.
A zero-peer index must not encrypt/write an empty cache. Existing credential files still require
protected storage and fail closed if unavailable, unreadable or invalid; pairing must verify secure
storage before starting the remote exchange, and all credential/cache writes remain encrypted.
Incoming relay device pairings are separate from this outgoing-connection store.

During the HC investigation on October 5, the operator confirmed the current password unlocks
the login keychain, yet authorizing Proteus or saving item access changes failed even using the
Mac's physical keyboard. No general password mismatch or Screen Sharing denial was established.
The ad-hoc app identity changed across updates; nearby code-requirement failures and Proteus
partition records support an app-authorization issue, but do not prove the cause of Keychain
Access's permission-edit rejection. Do not reset/delete Safe Storage or broaden its ACL as a
routine update fix. Stable signing remains a separate packaging follow-up.

HC had none of the Life session, outgoing peer credential or chat-index encrypted files. The
new unconditional startup index was nevertheless probing Safe Storage and encrypting an empty
cache. Its core API subsequently resumed with all providers and incoming relay pairings intact.
Fixing that unnecessary access does not claim to repair the existing Keychain item's ACL.

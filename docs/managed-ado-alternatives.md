## ADO PAT capability verification correction — source only

Installed 88367d6 can report capability-mismatch before its first ADO health read because the
pinned official 2.11.0 catalog declares JSON Schema draft-07, while the probe validator used only
2020-12. The configured domains include core/work/work-items/search; all four exact probe tools
are present with read-only/idempotent annotations. This reproduced with synthetic credentials,
initialization/tools-list only and zero business calls; it is not evidence of an invalid PAT.

The source correction selects draft-07 or 2020-12 by the declared schema, preserves schema and
annotation validation, and rejects unsupported dialects. Real pinned PAT-launcher catalog tests
now validate all four exact probe arguments against synthetic result fixtures. Existing PAT,
expiry, scopes and connection settings need no mutation for this correction. Live workstation.example.test resource
acceptance remains pending an accepted corrective package; no rebuild or installation performed.
The scheduled browser multi-window routing defect remains open and unchanged.

# Managed ADO alternatives — Nov 5 source contract

Both adapters keep the portable name `hc-ado-corporate`, explicit owner/workspace bindings,
revision capture, and the existing `ado.projects.read`, `ado.teams.read`,
`ado.work-items.read`, `ado.work-items.query` capabilities. Neither adapter falls back to another
account or authentication mode. The optional schedule requirement still uses `required:false`;
failed qualification is a recorded gap, not authority to use a legacy helper.

## Azure CLI

`authentication.adapter: "ado-azure-cli"`, with the existing opaque `credentialRef` and
`credentialOwnerId`, adds:

```json
{"cli":{"executable":"/absolute/qualified/az","profileDirectory":"/absolute/corporate-profile","sha256":"<64 lowercase hex characters>","version":"2.80.0"}}
```

`expected` retains the exact corporate Entra `principal`, `tenant`, organization `resource` and
`organizationId`, Azure DevOps audience `d5fd9cb2-1853-528c-aa4c-2dd4a86fb2a1`, and its single
`/.default` scope. It adds `adoUserId`, the separately verified Azure DevOps identity GUID.
The Entra object ID and Azure DevOps identity GUID are not assumed to be interchangeable.

Acquisition checks protected storage first, pins executable bytes/version, runs `account show`
and `account get-access-token` with the explicit profile/tenant/resource, and accepts only a user
session. The owner independently checks RS256 signature against fixed Microsoft tenant keys,
issuer, tenant, principal, delegated scope, audience and expiry, then reads exact organization
connectionData and checks the ADO user ID. Only memory holds the access token. Renewal is coalesced;
the MCP child uses the official `envvar` mode. No CLI login, account switch, MCP `azcli` chain,
cache copying, encryption toggle or default credential chain is used.

**Current platform constraint:** the source gate qualifies Azure CLI 2.80.0's Windows DPAPI
configuration only (disabled/ambiguous encryption is rejected). The pinned executable still must
be directly executable without a shell; a Windows `.cmd` wrapper is not implicitly executed.
No installed Windows acquisition has been accepted. macOS and Linux return
`CLI_STORAGE_UNQUALIFIED` before invoking CLI or opening a token cache. Reviewed macOS CLI
persistence uses a fixed shared Keychain item; protected per-profile isolation is not established.
Linux Secret Service isolation is likewise unqualified. These are concrete supported-status limits,
not a request for a new app registration or permission to weaken credential storage.

## PAT

`authentication.adapter: "ado-pat"` retains the opaque owner credential reference and adds:

```json
{"expiresAt":"2030-01-01T00:00:00Z","reminderDays":7}
```

`expected.principal` is the exact Azure DevOps user GUID. `organizationId` and `resource` pin the
organization; `tenant` equals `organizationId` for this adapter because PAT authentication does
not prove an Entra tenant. `audience` is `azure-devops-pat`; configured read scopes are
`["vso.project","vso.work"]`. No `clientId`, CLI configuration or `adoUserId` is accepted.
The full nonsecret JSON schema is returned by the existing integrations schema action.

After saving configuration, **Enter / replace PAT** opens an owner-only password field and account
email field. Submit clears the fields immediately, verifies Basic authentication against the exact
user/organization, then persists the credential in the OS-protected vault. Neither registry nor
agent discovery exposes the credential. No agent action supplies or retrieves it. Changing the
configuration invalidates the stored credential binding; re-enter/re-verify explicitly.
The child receives only base64(email:pat) through the official 2.11.0 `PERSONAL_ACCESS_TOKEN`
variable in `pat` mode. It never enters argv or the Bearer variable. Existing exact organization,
HTTPS host and redirect guards remain enforced.

The owner supplies expiry; it is not asserted to be issuer-attested. The card shows expiry and
replacement due within the selected reminder window. Expired credentials fail before use;
revocation may occur sooner. No PAT creation, extension, automatic rotation or scope broadening
occurs. The manager safely replaces expired children; uncertain writes are never replayed.

### Permission evidence and remaining acceptance

Microsoft REST 7.1 documents `vso.work` for [team settings](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/teamsettings/get?view=azure-devops-rest-7.1),
[exact work item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item?view=azure-devops-rest-7.1)
and [WIQL](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.1).
The [project list](https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.1)
page lists both `vso.profile` and `vso.project`; the latter explicitly covers project/team reads.
The proposed PAT selections are Project and Team **Read**, Work Items **Read**. Their exact minimum
and tenant policy must still be qualified by real bounded probes; documentation and synthetic tests
are not a live least-privilege proof. Do not add `vso.profile` or other scopes automatically after a
failure. Proteus cannot introspect the full issued PAT grant; configured scopes are an owner
assertion, while readiness requires actual reads through the managed MCP catalog.

## Migration / rollback

Create a local explicitly selected binding and verify it before changing organization workflows source exports.
A connection's adapter cannot be changed implicitly. Retain legacy credentials/helpers until
accepted migration; do not reuse or rotate workstation.example.test credentials on Build Mac. Restore the previous
explicit definition to roll back; unknown/captured revisions remain rejected. No live schedule
was changed and no candidate was delivered by this source work.

Local operator login testing is authorized in the separate protected Authentication Preview.
workstation.example.test installation, live migration and end-to-end repeated workflow acceptance remain held.

## Source verification receipt

Full source suite: 1,653 passed, four skipped, zero failures. After final mock-store gating and
rate-limit hardening, 14 focused credential/adapter tests passed; static checks and local web build
passed. Disposable Electron exercised both setup forms, absence of mandatory app-registration
fields, owner PAT entry clearing and nonsecret configuration persistence. Real official MCP 2.11.0
catalog startup passed in both envvar and PAT modes using synthetic credentials and no data reads.
Signed synthetic JWT tests cover principal/tenant/audience/org mismatch, coalesced expiry renewal,
no login/account fallback and subprocess redaction. PAT tests cover expiry, missing/locked storage,
identity mismatch, redirects, transport failure and failed persistence. Existing manager/native
provider tests cover optional gaps, lease authority and no uncertain-write replay.

No real CLI/PAT login, tenant PAT scope acceptance, protected-store round trip with a real credential,
workstation.example.test install, or business workflow has been verified by these tests.

## Implementation update

The separate CLI and PAT adapters are now implemented in Nov 5 source; see
[the exact schema and migration contract](managed-ado-alternatives.md). CLI on macOS/Linux remains
explicitly unqualified for protected profile isolation; PAT is the local testing alternative.
The original source qualification below records the evidence that led to those limits.

# ADO authentication without a new app registration

Nov 5 source/design qualification. The operator states that a new organization-approved Entra
public-client registration is unavailable. Do not leave it as a prerequisite to wait out.
No registration, new consent, PAT creation, live sign-in, cache adoption or deployment is authorized
by this qualification. Existing working authentication and schedules remain unchanged.

## Explicit corporate Azure CLI acquisition

A host-owned adapter can invoke a pinned Azure CLI executable using only an explicitly configured
corporate `AZURE_CONFIG_DIR`, tenant and Azure DevOps resource. It must capture token JSON privately
in owner memory, validate actual principal/tenant/audience and exact organization, and reject
non-user identities or mismatches. No `az account set`, global login switching, interactive fallback,
DefaultAzureCredential chain or developer-client-ID substitution is permitted.

The pinned official `@azure-devops/mcp` **2.11.0** supports `--authentication envvar` with
`ADO_MCP_AUTH_TOKEN`; its SDK clients use Bearer authorization. Proteus already confines that
child to the selected organization and known HTTPS service hosts. The new CLI adapter would need
an explicit schema/qualification path, bounded process/output/time budgets, coalesced silent renewal,
expiry validation, and child replacement before expiry. Safe reads may retry under existing policy;
uncertain writes never replay. Neither CLI stderr nor token output may reach models or logs.

**Do not use this server's `azcli` mode as-is.** Inspection of its shipped `dist/auth.js` shows a
DefaultAzureCredential and, when tenant is supplied, a ChainedTokenCredential containing both
AzureCliCredential and that default chain. This does not meet the no-fallback requirement.

### Protected cache remains a compatibility gate

Reviewed public Azure CLI **2.80.0** sources:

- [util.py](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli-core/azure/cli/core/util.py)
  defaults `core.encrypt_token_cache` to true only on Windows.
- [persistence.py](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli-core/azure/cli/core/auth/persistence.py)
  uses ordinary FilePersistence when false, Windows DPAPI when true on Windows, Keychain on macOS,
  and Libsecret on Linux. Availability and actual version must be established on the consuming host.
- The reviewed Mac path passes fixed service/account strings to KeychainPersistence. Reviewed
  [msal-extensions 1.3.1](https://github.com/AzureAD/microsoft-authentication-extensions-for-python/blob/1.3.1/msal_extensions/persistence.py)
  uses those explicit strings as its Keychain item identity; the path is used for change signaling.
  Consequently, enabling encryption alone does **not** establish isolation between corporate and
  hosting profiles. Shared item identity and separate lock paths require qualification before use.

These findings are version-specific source evidence, not an inspection of the installed corporate
cache. No cache file was opened or adopted. Do not silently toggle encryption, move an existing
cache, claim Keychain protects it, or weaken storage rules. The first-party CLI sign-in route is
legitimate in principle; the selected runtime must still meet protection and isolation requirements.
CLI silent renewal may stop for revoked grants, MFA, consent or policy; report one owner action.

## Separate PAT adapter

The same pinned official server also concretely supports **`--authentication pat`**. It reads
`PERSONAL_ACCESS_TOKEN` as base64(`email:pat`), uses an SDK Basic authentication handler, and rewrites
matching fetch authorization to Basic for its allowed HTTPS hosts. This is a separate path from
`ADO_MCP_AUTH_TOKEN`; a PAT is never an Entra Bearer token. An in-memory synthetic check confirmed
the separate variable, Basic conversion, and rejection of an untrusted host with zero network calls.

The original implementation checklist required an opaque
OS-store reference, owner-only secret entry, explicit organization/user validation, the narrowest
qualified project/team/work-item read/search scopes, expiry and revocation handling, and preservation
of the existing organization/redirect guards. PATs cannot silently renew themselves. Rotation is an
explicit owner operation. Tenant PAT availability/policy, precise required scopes and actual MCP
resource reads remain unverified. No full-access PAT or automatic fallback is acceptable.

## Decision

Keep the existing public-client adapter for owners who have an approved registration, but stop
requiring it for this workflow. Qualify the explicit CLI path first only if protected, isolated
storage can be established without disturbing existing profiles. Otherwise a policy-permitted,
read-scoped PAT with a separate secure-store adapter is the concrete alternative. Neither is
installed or workflow-accepted by these source checks. Live qualification remains held.

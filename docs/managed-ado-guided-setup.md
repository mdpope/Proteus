# Guided Azure DevOps setup — Nov 5

Operator scope: connect all Azure DevOps resources and operations available to the signed-in
account, including multiple projects, work items, comments, links, repositories, pipelines and
wikis. Work-item-only PAT scopes are an intermediate adapter capability, not fulfillment of this
request. Account access does not auto-approve model operations or bypass organization policy.

## Owner flow

1. Connect Azure DevOps opens a supported Microsoft sign-in flow, with an explicit corporate
   CLI profile when using Azure CLI. Browser/device-code or a guided interactive terminal is
   acceptable. Never switch the global Azure account or borrow a developer application's identity.
2. Discover and show the actual account/tenant and accessible organizations using documented APIs.
   A recognizable organization URL may be requested when discovery is unavailable. No user-facing
   principal GUID, organization GUID, project GUID, team GUID, executable hash or scope string.
3. Review the account and organization. Show available projects and capability families; support
   multiple projects and account-wide access within the confirmed organization. Distinct organizations
   have distinct bindings. A project picker alone is not a security boundary.
4. Choose Proteus workspaces and review authentication lifetime/renewal and any organization-policy
   restrictions. Capture immutable owner/account/resource identity and revision before use.
5. Verify through the actual managed MCP path. Read tests do not prove writes. Surface missing
   capabilities separately; no destructive or arbitrary production writes to obtain a green status.

Delegated Entra access is preferred for the full account contract. PATs are an explicit alternative,
not an automatic fallback or a mandatory intermediate credential. Configure/review scope and expiry
before creating one through an officially supported lifecycle API; capture the response privately
and persist in OS protected storage. Never print tokens to terminal transcripts, retrieve browser
cookies, inspect browser storage, or use developer tools to intercept authentication.

## Microsoft qualification — November 6

Microsoft documents PAT lifecycle creation with a delegated Entra token and `vso.pats` authority.
A successful ordinary CLI login or `user_impersonation` access token does not independently prove
that authority. The create endpoint reference currently specifies 7.1-preview.1, while the overview
shows 7.1. Qualify the chosen endpoint and actual delegated grant before enabling creation.
No lifecycle request was made, PAT created, live sign-in attempted or working cache changed here.

- [PAT lifecycle overview](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate#pat-lifecycle-management-apis)
- [PAT create reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/create?view=azure-devops-rest-7.1)
- [CLI Entra tokens](https://learn.microsoft.com/en-us/azure/devops/cli/entra-tokens?view=azure-devops)

PATs are organization-scoped and cannot grant more permission than their owner. They do not provide
project-level isolation. Do not invent an all-access scope string or silently union individual
scopes based on names. The exact full-access issuance contract and tenant policy remain to qualify.

## Open implementation and acceptance

The existing advanced form is not acceptable as the primary owner setup. The guided discovery,
interactive CLI/browser start, full capability profile and optional automatic PAT lifecycle are
not implemented by the read/write work-item scope change. Mac/Linux CLI protected persistence and
profile isolation remain unqualified; do not disable that check merely to start the wizard.
No new Entra app registration is available. Resolve a supported first-party CLI route without
substituting its client ID in Proteus MSAL or silently modifying existing caches.

Acceptance includes correct-account and multi-project discovery, protected renewal, actual native
Codex/Copilot tools, per-operation permissions, expiration/revocation, cancelled/uncertain creation,
no automatic write replay and no secrets in any UI log/export/model context. Repeated connection
must reuse the verified binding. Preserve existing Atlassian setup, auth and workstation.example.test schedules.
Deployment remains held.

Local nonsecret implementation inspection also found Azure CLI 2.71.0 on the preview host. Its
`azure.cli.core.auth.persistence.build_persistence` passes fixed service/account strings into
KeychainPersistence, while the lock/signal path is profile-specific. The SDK's default would hash
the location, but the CLI overrides it. Separate AZURE_CONFIG_DIR values therefore do not prove
separate protected credentials. No token cache or Keychain item contents were inspected. This
version is not the existing adapter's pinned 2.80.0; upgrading alone is not proof of isolation.

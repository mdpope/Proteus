# Nov 5 implementation

Version: 0.2.43

The operator lifted the build hold and authorized the existing full plan plus the Work Mac digest
requirements, delivery and two-way acceptance iterations. Work stays on nov5-release.

Implemented before version reservation: P6–P10 schedule controls and document-origin preservation
(63bfa6f). Combined source validation: 1,552 tests pass, four skip, zero fail; static checks and
disposable Mac startup/reload/cold restart acceptance pass. These results apply to source before
the version-only reservation; no package or installed workflow acceptance is claimed.

Remaining: full plan implementation/verification (including P12 managed connections), reconcile
the complete Work Mac requirements, immutable package/signature/publication checks, receiving-owner
installation and actual two-run workflow acceptance. Record each candidate pin and result here.

## P12 foundation checkpoint

The complete Work Mac requirements are reconciled in docs/managed-mcp-connections.md. Implemented
internal foundations: revision-pinned owner/workspace connection registry with dependent-reference
guards; protected encrypted credential persistence with no plaintext fallback; account/audience/
issuer/client/adapter-bound in-memory tokens and one renewal per credential reference; durable
rotation uncertainty and saved replacement credentials before token release. These modules are
not yet wired to provider execution, schedules or UI and are not a usable managed connection.

Official ADO MCP 2.11.0 archive integrity verified. Source inspection confirms documented azcli
uses a fallback chain, so it is not yet qualified for the required corporate-account isolation.
No connector was installed/executed and no live credentials accessed. Exact connector auth
qualification, broker/provider wiring, OAuth/setup/migration, health lifecycle, UI and installed
acceptance remain required. Signing-authority transition awaits the operator's pending choice.

Foundation validation: full suite 1,563 pass/four skip/zero fail and static checks pass.
The final adapter-cache isolation refinement passes all eleven focused foundation regressions.
These tests use synthetic credentials and injected storage; they do not establish native keychain
adoption, actual ADO/Atlassian authorization, provider brokerage or installed workflow success.

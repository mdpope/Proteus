# Security reporting and boundaries

Do not post credentials, pairing capsules, account tokens, real conversations,
browser profiles, private URLs, or screenshots containing customer information in
public issues. Redact reproduction material and use synthetic data.

For a vulnerability, use the repository's GitHub **Security → Report a vulnerability**
private-reporting channel if enabled. If it is unavailable, ask a maintainer for a
private channel without including exploit details or secrets in the public request.
This project does not currently promise a response-time SLA or a support window.

Proteus separates local service authentication, paired-device encryption, shared
website accounts, browser profiles, provider sessions, and external workflow
permissions. Pairing does not authorize every resource or document. A shared URL
does not share cookies or signed-in page contents. Project follow-along transports
selection and scroll metadata within the selected owner scope.

Reports should include the affected revision/platform, required authorization,
expected and observed behavior, a minimal synthetic reproduction, and whether any
action had an uncertain outcome. Preserve private evidence outside this repository.
Do not repeat an external mutation merely to determine whether it succeeded.

Recovery and update testing must preserve protected receipts and use the
[two-generation policy](docs/desktop-updates.md). Do not delete shared signing
certificates, disable validation, or replace an installation's signing identity
to work around an update failure.

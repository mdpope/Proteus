**Latest October 14 closure:** Website **0.2.19** is deployed/verified. Fresh central recovery
and isolated restore, all 9,214 file hashes, 14 endpoints and eight served assets pass; schema,
runtime configuration and nutrition remain unchanged. Deployment-window Apache events are expected
protected-environment probe denials, with known database column-statistics messages and no new
Laravel/relay errors. Ordinary central backups keep current plus two previous generations after
accepted-release audit; unique migration pins remain and the budget stays 15 GiB. Initial ordinary
cleanup reclaimed 7.71 GiB; exactly four separately confirmed expired server copies reclaimed
2.20 GiB. Other server sets/restore evidence were untouched. Failed disk-headroom receipts remain.
Production authenticated UI remains distinct from local two-owner UI acceptance. Private deployment
receipts/access details stay in the website workspace. Earlier budget/staging holds are historical.

October 14 follow-up: shared Workspace Tabs column resizing and current release metadata for
0.2.18 pass 81 PHP tests / 724 assertions, Vite production build and the disposable two-owner UI.
Release `20261014T171221Z` is staged; the restricted deployment client stopped at local recovery
preflight before production mutation because protected sets reached the site's existing 15 GiB
budget. Operator budget decision is pending; no protected backups were deleted. Production remains
on the verified 0.2.15 release below. Keep private artifacts/receipts in the deployment workspace.

# Website updates

October 14 tab-management rollout: 0.2.15 release `20261014T145118Z` completed the existing
restricted route with central recovery verification, ordinary isolated restore, all 9,214
deployed hashes, 14 endpoint checks and eight served JS/CSS hashes verified. Schema, runtime
configuration and nutrition were preserved. Authenticated production UI remains unobserved;
the bounded Apache window contains two error-category events without raw-message attribution.
Private evidence is in the deployment workspace; detailed source UI acceptance is separate.

Routine code-only website releases use the deployment workspace's restricted SSH deployment
command. The October 12 route is installed following explicit operator approval. Root ownership,
helper hashes, website-account inspection, fixed PHP modules and sudoers validation pass; the
read-only production audit passes all 14 checks. Retry and refusal acceptance is recorded in the
deployment workspace. The October 13 unified-browser release completed the full restricted route: capture, verified
recovery registration, isolated restore, activation, deployed-file parity and endpoint audit.
All 9,214 deployed files and nine served files matched; all 14 audit checks passed.
Authenticated production UI remains a separate check and was unavailable through browser automation.
The existing authenticated Webmin route remains available for administration and recovery.

Keep domain names, account/key routing, server paths, private receipts and backup payloads in
the website deployment workspace. This application repository owns reusable web code and tests.
Read that workspace's access record and the website operations skill before deployment.

## Routine command

From the private deployment workspace, run `python3 operations/deploy/deploy-web.py` with
`--release` and `--archive` identifying the exact tested release. Reuse the same command after
a transport failure; it recovers durable operation receipts and rejects changed release identity.
Private instructions describe backup storage, rollback evidence and exceptional failures.

## Required boundaries

- Build the deployable site and test the exact release before transfer. Preserve a complete
  path/hash manifest and verify served assets after activation.
- Use the existing authorized SSH identity. A deployment role permits replacing application
  code, which has the website account's existing application-data access. It must not provide
  arbitrary administrator commands, caller-supplied privileged scripts or database grants.
- Keep the dispatcher, helper identities, job receipts and upload spool under administrator
  ownership. Validate bounded input, archive paths/types, complete manifests and immutable
  copied bytes before using an upload.
- Run application code and all website filesystem changes as the existing website account.
  Administrator work is limited to fixed recovery operations, trusted fixed probes and the
  required service reload. Do not change ownership of an account's home to simplify checks.
- Preserve fresh backup capture, verified central recovery storage, isolated restore checks,
  runtime configuration, signing/authentication keys and protected application data.
  A snapshot is checked against its captured state; continuing live synchronization must be
  distinguished from recovery corruption without weakening capture-integrity checks.
- Code-only updates reject changed migrations. Schema/data changes require a separately
  reviewed deployment and recovery plan.
- Serialize deployments. Bind durable job receipts to the exact request; a repeated request
  returns its existing outcome, while conflicting arguments are rejected. A lost connection
  is a reason to inspect status, not to dispatch a second operation.
- Preserve the prior release, journal the intended switch, and verify rollback after failures.
  Stop or recover the owned worker before rollback so a late worker cannot switch forward again.
- Return compact status and verification summaries. Credentials, raw private data and protected
  logs stay outside model-visible output and source control.

## Completion

Record deployed identity, manifest/served-asset parity, HTTPS and authentication checks,
representative workflow results, new-log-window review and recovery evidence in the deployment
workspace. Distinguish local authenticated UI tests from actual authenticated production checks.
Update the application release ledger with verified status and any remaining limitation.

Initial privilege provisioning is separate from ordinary application updates. Record its exact
scope, authorization and adversarial acceptance before treating the SSH route as ready.

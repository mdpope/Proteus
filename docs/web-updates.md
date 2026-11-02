## October 30 retention policy override for Proteus

Follow [the named release process](release-process.md). Keep one live website and at most one
verified website recovery backup on its server, with at most two complete verified recovery
generations locally. Retire older duplicate site/deployment trees after replacement verification;
do not keep two server backup generations or apply the generic broader website retention policy
to this site. Public desktop downloads keep only the current release generation per target.
These are the operator's current Proteus-specific limits; dated counts below remain historical.
This instruction changes policy, not a claim that live server cleanup has been performed.

## October 29 — sidebar palette correction deployed

The website's grouped navigation duplicated the old sampled sidebar colors and overrode the
shared palette, making it darker than desktop. It now consumes the same palette aliases as the
desktop sidebar for surfaces, active items, text, accents and borders. Browser palette storage
remains independent and existing saved colors are honored.

An isolated browser regression renders the actual desktop and web styles separately and compares
their computed colors for defaults, custom palette edits and reset. The preceding stylesheet fails;
the corrected stylesheet passes. Release `20261029T221800Z` now serves version 0.2.36 / build
`6903064`. All nine HTTPS asset hashes and fourteen endpoint checks pass. The signed-in Home
page uses the shared `#1b251d` sidebar and paints its selected canvas; its console reports no
errors or warnings. Browser-local palette preferences were not changed.

The new full recovery and captured-state verification pass; ordinary isolated restore fails
and remains qualified. The immediately preceding ordinary-restore-verified recovery is retained.
Server and central storage each retain two verified full generations, with two code generations,
and local generated source/build/archive cleanup is complete. Bounded Apache bytes from both
website deployments contain the expected protected `.env` probe denial. Original failed
pre-capture and generated-cache checks remain in private receipts; neither replaced live code.

**October 18 computer grouping follow-up:** Release `20261018T184327Z` is deployed with the
stable Default-computer workspace group, expandable Other Computers with named owner headings,
and left-aligned project headers. All 9,214 deployed hashes, eight served assets plus manifest,
14 endpoints, central recovery and ordinary isolated restore pass. Local 717 Node tests, syntax,
Vite, tree/project UI and eight Engine Room checks pass. Signed-in live UI passes grouping,
remote routing, Default-owner stability and header alignment. Bounded log review is accepted:
expected protected-file/database/lifecycle messages, plus one informational systemd event verified
by metadata only (its message text was not classified). The earlier CSS-only candidate never activated; verified redundant
server recovery copies were retired before this deployment, preserving the central recovery policy.

**October 18 project-header alignment:** A focused CSS follow-up left-aligns project folders and
names, preserving right-side counts/expanders. Production-CSS geometry checks at four sidebar
widths and compact overlay, the project workflow and Vite pass. Release `20261018T183653Z`
was superseded without activation after its recovery capture hit the server free-space guard.
The combined release above includes this fix; the original failed receipt remains preserved.

**October 18 visual parity follow-up:** Website **0.2.21** release `20261018T174132Z` is deployed.
The reviewed update matches desktop grouped navigation, fixed workspace tabs, recents, Engine Room,
resizing/compact overlay, and chat title/composer/details styling. All 9,214 deployed file hashes,
eight served assets plus manifest, 14 endpoints, central recovery and ordinary isolated restore
pass. Schema/runtime/nutrition remain unchanged. Local acceptance includes 717 Node tests,
PHP81/724, Vite/Pint, complete two-owner/project UI and focused navigation checks. Bounded log
classification passes: only expected protected-file denials and known database column-statistics
messages. Authenticated production UI passes Engine Room with both owners, fixed workspace
tabs, existing history and chat/permission layout, and sidebar resize/collapse/reload persistence.
No permission or chat-content mutation was used for acceptance; earlier acceptance below is separate. See [web behavior and local validation](web-remote.md) and private receipts.

**October 18 acceptance:** The initial website **0.2.21** projects release is deployed and verified.
After Mac unlock, the original durable request resumed successfully. All 9,214 deployable hashes,
eight served assets plus the manifest, 14 endpoints, verified central recovery and ordinary isolated
restore passed. Schema, runtime configuration and nutrition stayed unchanged. Bounded log review
found only expected protected-environment denials and known database column-statistics messages.
The operator-authenticated production UI then verified both paired computers, workspace/project
navigation, existing chat history and permission controls, and the owner-selected Source library.
These are actual production checks; later follow-ups have separate acceptance above.
See [production rollout](2026-10-18-projects-release.md) and private deployment receipts.

**October 15 acceptance:** Website **0.2.20** is deployed/verified. All 9,217 deployable
hashes, eight served assets and 14 endpoints pass. Verified central recovery and the fixed
capture-state restore gate passed; ordinary restore/live comparison did not pass and is not
claimed. Schema, runtime configuration and nutrition remain unchanged. No new Laravel/relay
errors; Apache events are expected protected-file probes, MariaDB events known column statistics.
The same durable request resumed after Mac unlock restored access to the existing SSH key.
One eligible ordinary central generation rotated after acceptance; private receipts and existing
unique migration pins remain in the deployment workspace. Authenticated production UI is separate
from the passing synthetic two-owner browser workflow.

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

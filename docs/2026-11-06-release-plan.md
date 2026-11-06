# Nov 6 update plan

Status: planned successor to the open Nov 5 / 0.2.43 release. Requested November 6, 2026.
Version: not reserved. Close and reconcile Nov 5 before opening this release with the release tool;
leave current.json, package versions, accepted artifacts and in-flight update jobs unchanged.
This request creates the plan; it does not claim implementation, build or deployment.

## N6-01 — Complete managed Atlassian write access

The operator must be able to update Jira tickets and use all supported Atlassian operations their
signed-in identity can perform, across authorized projects and sites. Read/search-only behavior
is insufficient. Identity permissions are the service ceiling; selected connection scopes and
explicit chat/schedule operation permissions remain independently enforced.

### Existing implementation and observed gap

Nov 5 added read/write as the new-enrollment default and requests `write:jira-work` alongside
read/offline scopes. It deliberately did not upgrade existing read-only connections or consent.
However, managed-atlassian-probes.js defines only identity, resources, issue-read and issue-search
semantic capabilities; onboarding persists those capabilities and the status text describes only
read/search verification. This is incomplete capability modeling and presentation. The runtime
broker uses the connected tool catalog, so those four health capabilities alone do not establish
that every write tool is filtered out. Real managed Jira writes have not been accepted. Trace
actual OAuth consent, server catalog, provider exposure and effective run policy separately.

### Required behavior

- Guided setup clearly offers full account-authorized supported access and read-only access.
  Discover actual server capabilities and documented scope requirements; never imply one Jira
  OAuth scope covers all Atlassian products or administration operations.
- Existing connections show requested/granted access and a deliberate Upgrade access / Reauthorize
  route when consent is insufficient. Preserve stable connection IDs, workspace bindings and
  working credentials until replacement verification succeeds; do not silently expand consent.
- Expose supported Jira creation, updates, transitions, comments, links and other available ticket
  operations through the same authenticated manager to Codex and Copilot. Do not limit runtime
  tickets to health-check sample issues or a single project. Cover other identity-accessible
  Atlassian operations where the selected server supports them; report unsupported products,
  server tools, scopes and service restrictions explicitly rather than claiming full parity.
- Show write availability separately from read/search health: requested, consented, present in
  server catalog, permitted by run policy and actually verified. Read readiness is not write proof.
- Publish semantic capability/schema and portable manifest changes, with a preserving migration.
  Provide saved exact mutation rules for authorized workflows; read-only auto-approval never grants
  writes. A full-access connection is not blanket approval to mutate every resource.
- Preserve owner/account/site isolation, revocation and expiry behavior. Reconnect must never
  replay an uncertain write. Routine health probes remain nonmutating.

### Acceptance

1. Regressions cover new read/write setup, old read-only upgrade, missing/denied scopes, tool
   catalog differences, account/site restrictions and optional-connection gaps.
2. Verify actual mutation tool exposure and permission enforcement through both provider paths;
   annotated reads alone must not authorize mutation. Test expired-token recovery and uncertain
   write delivery without duplicate effects.
3. On an explicitly authorized test ticket, perform an update and independently read it back;
   restore the agreed fixture when applicable. Exercise supported comments/transitions and more
   than one authorized project. Record exact installed build and sanitized evidence. Do not use
   production tickets as implicit test fixtures or equate a successful model turn with a write.
4. Demonstrate guided reauthorization on an existing read-only connection without losing its
   identity, bindings, saved policies or usable prior authentication. Show honest capability state
   in desktop and web, keeping initial consent and credential setup on the owning computer.
5. Coordinate resulting contract with the existing organization workflows owner and retain its separate real
   workflow/no-new-evidence acceptance. No pending agent request is approved on its behalf.

## Release boundaries

Nov 5 outstanding rollout/acceptance remains in its existing records; this plan does not close it
or silently move its unfinished work. Add further Nov 6 items explicitly as requested. Reserve the
successor version once, after Nov 5 closeout, using docs/release-process.md.

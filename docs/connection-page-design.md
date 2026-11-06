# Accounts & Integrations design

Nov 5 source change; deployment remains held. Managed MCP connections are the primary
section. Source-discovered provider configurations and other computers remain available below
in expandable sections. The inventory is fetched only when opened. Configuration, consent,
per-run authority and connection health continue to come from the existing owner service.

## References and choices

- [Grafana data sources](https://grafana.com/docs/grafana/latest/datasources/) separates
  connection configuration, permissions and troubleshooting. Proteus retains independent
  credential, authentication, transport and resource evidence instead of one ambiguous green light.
- [Home Assistant integrations](https://www.home-assistant.io/getting-started/integration/)
  separates the integration overview from service details and less frequent management actions.
  Its [catalog](https://www.home-assistant.io/integrations/) uses recognizable service identities.
  Proteus uses branded headers, account/resource summaries and expandable technical details.

These are design references, not claims of cloned UI or shared authentication behavior.
Cards have 24 px gutters, 24 px interior spacing, a responsive single-column narrow layout,
text status labels in addition to color, and visible keyboard focus. Operational guidance stays
visible; identifiers, capability evidence and destructive actions remain in details.
A stale or disabled connection never receives a Ready badge even if old evidence says ready.

## Brand assets

Atlassian and Azure DevOps paths are bundled inline from Simple Icons 11.15.0:
[Atlassian](https://github.com/simple-icons/simple-icons/blob/11.15.0/icons/atlassian.svg),
[Azure DevOps](https://github.com/simple-icons/simple-icons/blob/11.15.0/icons/azuredevops.svg).
Simple Icons uses [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/11.15.0/LICENSE.md).
Brand trademarks remain with their respective owners; their use identifies the service and
does not imply endorsement. Logos make no external requests and have text service labels.

## Verification

`node test/managed-connections-ui.mjs` exercises the real renderer in disposable Electron:
managed-first composition, deferred inventory loading, both adapter forms, revision conflict
draft retention, active/reference restrictions, responsive widths and ordinary verify/disable/remove.
A synthetic browser-launch rejection remains visible after status refresh and does not trigger
an automatic retry. Successful real Atlassian browser launch still needs installed acceptance.
Set `PROTEUS_UI_ARTIFACTS` to an external directory for synthetic desktop/mobile screenshots.
No real account, credential, sign-in, schedule or installed app is used by these fixtures.

# Life Smart Home and voice actions

Life → Smart Home connects the owning desktop to an existing Home Assistant HTTP(S) origin.
The operator supplies a long-lived access token in the local password field. Proteus encrypts it
with the existing protected-storage boundary; it is not sent to the model, Life website or paired
phone. Existing Home Assistant browser authentication stays separate. No session-token extraction,
new HA integrations, server restart or dashboard changes are needed.

The operator authorized every device and service exposed by Home Assistant for hands-free control.
There is no entity checkbox page or domain allowlist. Catalog refresh and each Life Ask request
discover current states and services, so adding a device in Home Assistant needs no Proteus setup.
Commands supply an exposed domain/service, explicit entity IDs when required, and JSON parameters.
Ambiguous requests still need clarification; empty targeting cannot silently mean every device.
The same native service supports desktop/web/iOS buttons and `proteus_home` agent discovery/control.
Agents cannot use that tool to change credentials; normal tool permissions apply.

Every command captures account, connection revision, entities, service, parameters and a stable operation
UUID. The owner serializes commands and saves submission before POST. Home Assistant has no service
idempotency key: an uncertain response is reconciled only by observing state, never repeating POST.
On/Off can report observed state. Other services report that Home Assistant accepted the command,
without claiming its physical outcome. Failed or ambiguous outcomes must not claim success.
Connection changes and account switches reject stale commands. Raw entity attributes are never
exported; integration attributes can include camera tokens and credential-bearing URLs.

The website and iOS use their ordinary paired owner connection for native controls; the four-method
Mnemosyne ingress pairing stays unchanged. Setup remains local to the desktop. Opening the HA
dashboard uses a normal embedded browser tab and its separate sign-in on desktop/native clients.
Smart Home and Home Assistant remain persistent navigation choices; additional ordinary tabs can
be placed beside them. Grouping is presentation, never a new workspace grant or execution owner.
Private browser membership is memory-only. That dashboard requires reachability
from the viewing device; native relay controls require the owner online and able to reach HA.
The HTTPS website cannot embed a plain-HTTP LAN origin through mixed-content protections; its
browser adapter must preserve those protections and offer the ordinary separate-site route.

Other sensitive voice requests (MCP operations or instructions to another Proteus chat) first
produce an immutable proposal. A protected human permission card opens one tool-assisted
continuation, using only MCP sources selected in Life → Ask and ordinary per-tool permissions.
Voice matching is not used as authentication. Denial, Stop, account changes and interrupted
delivery never automatically replay an action. This approval does not authorize unrelated actions
or grant new folders, accounts or device capabilities.

Source verification: fake-HA account/revision/replay/uncertainty tests, real owner approval tests
and a disposable Electron interface test. Real-device controls, physical voice operation and
deployed client parity require separate installed acceptance; no live device changes were made
by these tests.

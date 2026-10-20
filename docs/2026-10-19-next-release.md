# October 19 combined release

The operator lifted this chat's build hold on October 19 and authorized implementation of its
queued changes, incorporation of the accepted **Queue iOS navigation updates** chat, iOS tab
overview parity, and build/install on all existing devices. Historical queue-only statuses below
are intake records, superseded by this authorization. Preserve active work and current data;
installation authorization does not authorize cancelling unrelated turns or changing shared
signing identities. Use exact tested artifacts and the two-generation recovery policy.

## Implementation and acceptance checklist

- [ ] BF-04/05: Inspect Element ordering and aborted replacement navigation.
- [ ] BF-06/07: persistent sidebar state/name expansion and startup readiness.
- [ ] BF-08/09/10: workspace-wide ordered overview, persistent browser/chat thumbnails and icon.
- [ ] BF-11: multiple desktop windows, shortcuts and complete quit restoration.
- [ ] BF-12: direct new-tab page and combined address/history entry, desktop and iOS.
- [ ] BF-13/14: connected profile controls/guidance and correct auth browser/callback app.
- [ ] BF-15: Widevine feasibility/runtime compatibility; report actual playback limits.
- [ ] BF-16/17/18: workspace ordering, hierarchical move destinations and bulk tab actions.
- [ ] BF-19/20: durable document positions and circled More icon.
- [ ] BF-21: independent update helper, health/recovery and automatic original-chat continuation.
- [ ] BF-22: Cua primary/Peekaboo fallback, lazy tools and honest platform/backend state.
- [ ] BF-23/24/25: empty history revisions/resolution and non-modal scoped conflicts.
- [ ] BF-26: independent investigation if black text rectangles reproduce.
- [ ] BF-27/28/29: Ghostery recursion, Developer tools action and production provider picker.
- [ ] Audit other preview-only policy leaks; record findings and actual isolation boundaries.
- [ ] Promote accepted iPhone/iPad navigation/composer design without fixture-service leakage.
- [ ] Apply current-workspace project grouping/visibility/order and cached overview images to iOS.
- [ ] Runtime/static/UI/native regression acceptance, then exact signed artifact acceptance.
- [ ] Existing desktop and native installations: stage, preserve, install, independently verify.

## Current evidence

Implementation has started; no new artifact is installed. The native design chat is idle and its
accepted changes are already present in this shared checkout, behind simulator design flags.
The provider audit confirms BF-29's pruning branch confuses production project UI with isolated
preview policy. Server adapter/catalog restrictions use the actual isolated-preview option;
they must remain isolated. Additional audit findings and per-device receipts will be recorded
as verified, rather than inferred from a successful build.

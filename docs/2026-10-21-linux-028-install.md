> Historical artifact-specific acceptance. Superseded by the
> [October 22 Linux 0.2.28 deployment](2026-10-22-linux-028-install.md);
> statements below describe their original checkpoint, not current rollout instructions.
> This report does not certify a 0.2.29 candidate.

> Superseded by the accepted [corrected Linux build](2026-10-21-linux-028-corrected.md).
> The peer allowlist hold below describes the initial checkpoint and is resolved.

# October 21 — initial unified Linux 0.2.28 installation

The verified unified source transfer `97f902578a9c794bcc0ff8f8a149c86717d08aeb`
was imported at `18eff07fe7e24ee0bc408a24942fcade62eb7c54` on the separate
`linux/release-0.2.28-aa0b` branch. Original checkout/main were preserved.

**Installed and locally verified:** 0.2.28 / `linux.bfa15a889dd5`, fingerprint
`bfa15a889dd5bf8ebf284c706d99b4d514f5bd2b42971949136eb0d8a14a7d1b`.
The independent Linux bundle tree is
`01376839b27f309176afa84cfac44d507d621eda943de7c9315e595ad946a26b`;
archive SHA-256 `28fd2511d292cccf461d16b19cc330d18225b25f3cf25bcc38f113f278ac9c56`.
All 298 runtime files match the frozen source. Mac artifact identities are source context,
not Linux binary signatures. No Linux runtime changes were needed for this build.

**Final rollout pending:** the release coordinator subsequently reported the missing
`integrations.list` peer method allowlist gate in live HC acceptance. A superseding frozen
source/package is being prepared. This initial installation is preserved and remains usable;
its successful checks do not certify that remote integrations panel. Reuse the same current
cold recovery for this narrow correction; do not take another full snapshot.

## Evidence and preservation

- All 865 Node tests and static checks pass. Exact-package startup, native PTY keyboard input,
  synthetic rehearsal and full history across restart pass.
- Five unchanged UI suites passed against source and package: Linux window controls, relay
  pairing interface, video pop-out, release follow-ups and Keep Screen Awake. Two additional
  native blocker probes verified actual Electron assertion ID/state, toggle-off, background
  operation, quit cleanup and fresh-launch OFF. Video keeps exact originating X11 bounds,
  the same player/WebContents/history, fading controls and same-player return.
- The unchanged updater harness passed independent real disposable update and forced compatible
  rollback. Both preserve prior events/history, original-operation replay deduplication, exactly
  one rehearsal continuation and duplicate-resume rejection. Fixtures/helpers were removed.
- Installed acceptance preserved three chats and all 679 original events/native session prefixes,
  12 tabs, 26 navigation entries, 68 no-TTL receipts, pending/completed retry rules, configurations,
  disabled schedule and browser cookie payloads against the fresh cold baseline.
- The local favorites union is empty. Startup added exactly root/workspace empty favorites and
  version marker 1, with every unrelated context field unchanged. A separate nonempty synthetic
  union/isolation/idempotence check passed.
- One explicitly synthetic, no-tools manual Codex continuation used the same native test session,
  retained its original events and appended two events with one delivery. Model availability was
  refreshed from the provider. This is not automatic update-helper continuation or an external
  workflow. A second graceful restart retained all three chat files and removed debug flags.
- Before shutdown, independent changes disabled relay and updated two cookie payloads. The
  original failed strict receipt is retained. Reconstructing only `enabled: true` reproduces the
  prior remote configuration hash exactly: identity/token/pairings and all other fields are
  unchanged. The current disabled setting was preserved. New cold-baseline cookie comparisons
  passed after installation/continuation. Cookie decryption/site authentication is not claimed.

Private receipts remain outside Git. Exactly one current cold snapshot was made; retention
keeps two independently verified full code/app-data/browser-profile generations. No live data
was restored over newer state, no schedule activated, no grant widened, and no relay reprovisioned.

## Limits

Production relay is currently disabled; earlier enabled attempts failed registration. This does
not certify phone/Mac/Linux connectivity. Native Wayland global positioning/control, physical
sleep inhibition, actual website video/vault authentication and other providers remain unverified.
Private X11 blocker state does not prove OS/hardware sleep behavior. The isolated profile's
missing secure keyring remains a fixture limitation; production encryption guards were unchanged.

## Recovery and disk observation

Two full generations are now independently verified and registered: the previous helper
recovery and the single cold pre-0.2.28 snapshot. The oldest eligible full generation was
retired only after both newer code/data/profile copies matched their recorded hashes.
At the final observation, available space was 1,945,829,531,648 bytes, a measured change of
−767,959,040 bytes from the source-verified preparation baseline. Immediate deletion reported
zero change; delayed filesystem reclamation is reflected in this later observation. These are
observed free-space values, not claims that logical snapshot sizes equal reclaimed space.

The private indexed receipt SHA-256 is
`a6f4f53504fe2f4750af47c6cc3bb063728621e8f2e008d978f7a26365f760b6`.
Recovery policy points to that index. Its phase explicitly records the pending peer gate
correction. Corrected-source work must reuse this capture and preserve the newly appended
synthetic events and current disabled relay setting.

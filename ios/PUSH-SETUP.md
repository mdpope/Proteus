# Native notification delivery

October 26: the paid portal's explicit mobile App ID now has Push Notifications enabled.
Its matching development profile retains the existing paid certificate and both registered
devices. When the existing Xcode CLI account is unavailable, the already authenticated portal
can generate/download that matching profile; use a private manual-signing overlay that includes
the canonical paid configuration. Preserve the old profile and all shared certificates.

The server's Proteus-only sandbox key is secured in the configured vault and protected runtime
storage. Configuration, worker health and Apple's expected invalid-device-token response pass;
these are readiness checks, not real-device delivery. Credential IDs/paths and exact receipts
belong in the private deployment access record. Topic-specific production delivery requires a
separate production key. A newly signed physical 2610.26.1 build and background alert acceptance
remain required after the native question-navigation correction.

The app registers with UIApplication, handles APNs success/failure, implements foreground presentation and notification tap routing, and submits the token to the separately consented shared API. A host-scoped chat identifier routes a tap to that Mac; it never falls back to another execution destination. Cold-launch taps follow the same route. Payload text is generic, without prompts, transcripts, credentials or URLs.

Physical paid builds use `org.proteusapp.review.proteus` on the existing paid team `TEAMID0000`.
`PaidAccount.xcconfig` requests the development push entitlement; the existing wildcard profile
cannot satisfy it. Enable Push Notifications for this explicit App ID and select its matching
profile without replacing shared certificates. Simulator and legacy Personal Team settings
remain separate. The server APNs topic must be `org.proteusapp.review.proteus` and the sandbox/production
endpoint must match the profile. Local connected-host alerts do not prove background delivery.
Registration and missing server configuration are reported separately.

On the designated signing Mac, enable Push Notifications with the existing paid team when available. For an explicit build, the included optional entitlements file can be selected using `CODE_SIGN_ENTITLEMENTS=ProteusPush.entitlements` and `PROTEUS_APNS_ENTITLEMENT_ENVIRONMENT=development` (production distribution: `production`). Do not select that file for a profile without push support. Set the `ProteusAPNSEnvironment` Info.plist value to `sandbox` for development or `production` for distribution to match that profile; the current default is sandbox. Never recreate certificates or profiles automatically.

In the app, connect Team tools through Account & Security to explicitly consent to `app:read app:write`; old Life-only tokens are not broadened. Then enable Notifications. Permission denial remains under iOS Settings control. Turning notifications off unregisters from Apple and requests removal of this account's known API subscription. A service outage can leave a remote subscription until account management removes it.

Acceptance requires an entitled physical build, successful Apple registration, configured API delivery, and an observed alert while the app is backgrounded/terminated. Simulator compilation and local foreground alerts do not establish that acceptance.

The XcodeGen binary was unavailable in this environment. New Swift file membership was added deterministically to the existing project, leaving signing settings untouched. `ios/project.yml` already includes the full source directory for subsequent generation on a machine with XcodeGen.

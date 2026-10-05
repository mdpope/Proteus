# Native notification delivery

The app registers with UIApplication, handles APNs success/failure, implements foreground presentation and notification tap routing, and submits the token to the separately consented shared API. A host-scoped chat identifier routes a tap to that Mac; it never falls back to another execution destination. Cold-launch taps follow the same route. Payload text is generic, without prompts, transcripts, credentials or URLs.

The existing personal-team signing configuration is unchanged. APNs requires a paid Apple Developer Program team with Push Notifications enabled for `org.proteusapp.proteus.mobile`, a matching provisioning profile containing `aps-environment`, and the server's APNs credentials. Local alerts while a host is connected are not background APNs delivery. The UI reports registration and missing server configuration separately.

On the designated signing Mac, enable Push Notifications with the existing paid team when available. For an explicit build, the included optional entitlements file can be selected using `CODE_SIGN_ENTITLEMENTS=ProteusPush.entitlements` and `PROTEUS_APNS_ENTITLEMENT_ENVIRONMENT=development` (production distribution: `production`). Do not select that file for a profile without push support. Set the `ProteusAPNSEnvironment` Info.plist value to `sandbox` for development or `production` for distribution to match that profile; the current default is sandbox. Never recreate certificates or profiles automatically.

In the app, connect Team tools through Account & Security to explicitly consent to `app:read app:write`; old Life-only tokens are not broadened. Then enable Notifications. Permission denial remains under iOS Settings control. Turning notifications off unregisters from Apple and requests removal of this account's known API subscription. A service outage can leave a remote subscription until account management removes it.

Acceptance requires an entitled physical build, successful Apple registration, configured API delivery, and an observed alert while the app is backgrounded/terminated. Simulator compilation and local foreground alerts do not establish that acceptance.

The XcodeGen binary was unavailable in this environment. New Swift file membership was added deterministically to the existing project, leaving signing settings untouched. `ios/project.yml` already includes the full source directory for subsequent generation on a machine with XcodeGen.

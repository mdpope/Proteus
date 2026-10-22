## October 22 — submitted request and final private download verified

Apple browser entitlement request **TGNRQJ22PP** was submitted by the operator. Apple's
confirmation is recorded; approval is pending. Do not submit a duplicate request. The stale form
was refreshed and its answers/narrative restored before the operator submitted it.

The registered browser identity is `org.proteusapp.review.proteus.desktop`, WTB Tech Services LLC team
`TEAMID0000`. Developer ID certificate `59LW4N2UBA` is issued/imported, with SHA-1
`92A416F10956AA668EA46325C0F6B45C557856EA` and expiry November 21, 2027. Existing certificates
and installed application identities were preserved.

The final Apple Silicon/macOS 13+ DMG is Developer ID-signed, notarized, stapled and Gatekeeper-
accepted. The app has its own stapled ticket. All 299 runtime hashes and original vendor binary
bytes were preserved. WebAuthn, incoming-link and empty-profile browsing passed from the mounted
DMG. WebAuthn used a synthetic CTAP2 USB authenticator; physical-key/iCloud acceptance is not claimed.

- App notarization: `084431a9-ac8e-5555-b16c-9fb81ddc2bb8` — Accepted.
- DMG notarization: `c8eae0f4-dbde-5afc-be2f-ad27d7eae09d` — Accepted.
- Artifact: `Proteus-0.2.28-mac-arm64.dmg`, 299,455,822 bytes.
- SHA-256: `3bc4f63df1642d104e1e80954d8ebdcdc185371189ee5a49e6dafb1cad30df69`.
- Build: `4338f058a3f7+dirty.d96f67cc5450`.
- Hosted on the same private downloads.proteus.example evaluation URL supplied to Apple; all five HTTPS file hashes
  and access restrictions verified. The public website's 1,127 original files remain unchanged.

### Links, form contents and steps

The ignored owner-only [operator record](../local-records/apple-browser-review/README.md) preserves
all relevant links, exact last observed form fields/narrative, submission screenshot, final download
screenshot, notary receipts, artifact/download checks and ordered commands. Its private bearer URL
must not be committed or put in public navigation. Apple’s confirmation does not echo the submitted
payload; the record distinguishes the observed draft from the receipt. Hosting and signing-secret
ownership remains with the WTB website project; no passwords or keys are copied into Proteus.

Public Apple links: [browser request/confirmation](https://developer.apple.com/contact/request/macos-browsers-passkeys/),
[App IDs](https://developer.apple.com/account/resources/identifiers/list),
[issued certificate](https://developer.apple.com/account/resources/certificates/add/download/59LW4N2UBA),
[notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow).

Form answers: Proteus; `org.proteusapp.review.proteus.desktop`; WTB organization; macOS browser **Yes**;
WebAuthn **Yes**; intended iCloud Keychain integration **Yes**; optional App Store URL/Apple ID blank.
The narrative provides the private download, account-free browsing walkthrough, synthetic WebAuthn
evidence and planned iCloud registration/sign-in, and asks about the extension helper inclusion path.
The operator submitted while final DMG delivery was completing; the observed narrative accurately
said preparation was ongoing. That same URL now serves the completed package.

### Order and remaining work

Certificate and explicit App ID → hardened/timestamped app signing → app notarization/stapling →
signed DMG notarization/stapling and mounted acceptance → verified private download → browser
entitlement review. The operator already completed the form submission; no further form is currently
required. Await Apple's response under **TGNRQJ22PP**. Then confirm the granted capability/profile
and any separate native-helper inclusion path, implement iCloud passkey create/sign-in and verify
real helper pairing/fill/save. Notarization is not browser entitlement approval.

The disk-image creator initially left its temporary device attached, blocking notarytool's local
preflight. Only that owned process/device was stopped/detached after checking Apple history. Image
checksum/signature then passed and the successful DMG job above was submitted. No duplicate job or
shared-device disruption occurred. Details are in the local steps record.

### When Apple responds

1. Match the response to **TGNRQJ22PP**, team `TEAMID0000` and bundle ID
   `org.proteusapp.review.proteus.desktop`. Save the full response and attachments in the ignored local operator
   record; summarize the decision and any conditions here. Do not interpret notarization or a
   request receipt as entitlement approval. New submissions or replies remain subject to operator review.
2. Before signing/account checks, verify the Mac is unlocked. Confirm the capability actually
   granted for the App ID and obtain its appropriate provisioning profile. Preserve existing shared
   certificates; use the valid Developer ID identity. Embed the required profile and entitlements,
   then inspect the final signed app rather than assuming portal settings reached the binary.
3. Implement and validate the browser passkey path. Bundled Electron 44.5.1 exposes device-bound
   Touch ID configuration, not the newer `platformPasskeys` option. Evaluate an upgrade or native
   integration against Apple's browser APIs. Electron's associated-domain app example alone does
   not establish arbitrary-website browser support; preserve the actual requesting origin and RP
   checks. Test creation and sign-in with real iCloud credentials, cancellation, account selection,
   multiple profiles, restart and rejection of mismatched origins/RPs. Synthetic CTAP2 results are
   prerequisites, not evidence that iCloud works.
4. Separately resolve the official iCloud Passwords extension's native-helper restriction. Apple's
   [browser inclusion guidance](https://github.com/apple/password-manager-resources#how-apple-uses-web-browser-extension-distribution-information)
   describes a GitHub issue/PR and an OS update carrying the helper's signed launch constraints.
   Confirm whether Apple's response covers this or requires that separate request. Prepare any
   additional request for operator review; do not assume the passkey entitlement grants helper
   access. Verify actual pairing, inline suggestions, fill/save and reconnect without pipe errors.
5. Build, sign, notarize, staple and test the exact new artifact. The live desktop currently retains
   its legacy bundle/Keychain identity; migration to `org.proteusapp.review.proteus.desktop` must preserve data,
   sessions, approvals, browser profiles and credentials. Follow `desktop-updates.md` for deployment
   and distinguish installed from live-verified results. No blanket mobile/Linux/web redeploy is
   implied by this Mac-specific authorization.
6. The private evaluation link currently expires January 21, 2027 (server local time). If review
   extends past that date, coordinate a reviewed extension in the owning WTB website project.
   Keep its token, credentials, private keys, profiles and full correspondence out of Git and
   application packages. A fresh clone will not contain the ignored operator record; retrieve it
   from the operator's private project records rather than creating a new request.

Reference: [Electron WebAuthn configuration](https://www.electronjs.org/docs/latest/api/app#appconfigurewebauthnoptions-macos).

Earlier dated records below describe preparation history; this current status supersedes their holds.

## October 22 — private delivery prepared on downloads.proteus.example

The operator authorized private evaluation hosting and selected **downloads.proteus.example**, with no public
navigation link or public launch. The WTB website project owns the five-file payload, expiring
unlisted access URL, HTTPS configuration, recovery receipts and signing preparation. Its exact
URL and certificate material remain outside this repository. The Apple request draft now includes
that URL and honest development-build limitations; Submit remains untouched. The temporary
proteus.example route was withdrawn and returns 404. HTTPS downloads match every staged checksum,
including the complete 292,437,435-byte DMG; invalid/unshared routes return 403/404.

Fresh unlocked signing checks still find no usable local Developer ID identity. A new local
RSA-2048 key and verified CSR are prepared privately; Apple's Developer ID Application form has
G2 selected and the CSR attached. Its final Continue is held. Existing certificates are preserved.
The explicit App ID confirmation still awaits Register. No certificate was issued and nothing
was notarized or submitted for entitlement approval.

A separate clone passed hardened-runtime development signing, deep/strict verification and
unchanged vendor-binary checks. Its actual embedded-browser CTAP2, incoming-link and empty-profile
browsing tests passed. This does not change the hosted DMG's development/distribution status.
Remaining steps: approve certificate issuance/App ID registration, establish notary authentication,
Developer ID-sign with timestamps, notarize/staple, verify Gatekeeper and repeat acceptance on the
exact final artifact, then replace the hosted candidate and review the final entitlement request.
Notarization is a separate Apple upload; the entitlement request remains held even after signing.

## Current scope — October 22 domain-aligned identity

The operator selected `org.proteusapp.review.proteus.desktop`, matching downloads.proteus.example and the paid native
`org.proteusapp.review.proteus` identifier. Both Apple drafts are updated; Register and Submit remain held.
The earlier com.wtbtech candidate and draft receipts below are historical and superseded.
The refreshed development candidate is `4338f058a3f7+dirty.d96f67cc5450` (299 runtime files).
Its private DMG and review page are under `dist/apple-review-cc-wtb-20261022/review/`.
DMG SHA-256: `5151e34df02246841a30302913ce67e67f3164d3bd30d405d3e1f7106dbe2e60`.
Deep/strict signing, mounted-image identity, virtual CTAP2, external URL handling and empty-profile
Home browsing passed. These checks do not establish physical security-key or iCloud compatibility. Public download-page construction, hosting,
downloads.proteus.example navigation changes, public distribution and notarization are on hold. Private unlisted
downloads.proteus.example delivery is now authorized and verified as described above. The signed-in
Apple form makes App Store fields optional and explicitly permits account-protected evaluation
access; it still asks for a browser information/download link. No published development-only
exemption or approval guarantee was established. The link field now contains the private HTTPS
evaluation route and explicitly identifies the pending distribution-signing steps.

The operator authorized deployment of the already-reviewed interface/browser changes across
existing installations. Preserve existing installation identities and credentials; the separate
Apple candidate is not an authorization to migrate live Keychain/update identities.

# Apple browser authorization — operator review packet

Prepared October 22, 2026. **Nothing submitted to Apple.** The operator requires review before
submission. The review page and development archive are privately hosted on downloads.proteus.example; the final
distribution artifact is pending. Existing installations were updated separately under the operator’s deployment authorization;
the private Apple candidate does not replace their signing identities. Existing certificates are preserved.

## Live form and proposed answers

- Applicant: WTB Tech Services LLC, organization team `TEAMID0000`; Account Holder is signed in.
- App: Proteus. Proposed Bundle ID: `org.proteusapp.review.proteus.desktop`. Both Apple drafts have been renamed and remain unsubmitted.
- macOS browser: **Yes**, selected by the operator. HTTP/HTTPS registration and a Home website/search
  entry are now implemented; actual incoming-link acceptance passes. Apple determines eligibility.
- WebAuthn support: **Yes**, prepared in the unsubmitted form, based on real embedded Chromium CTAP2 registration/assertion
  acceptance. This is not an attestation of completed iCloud Keychain support.
- Plan to integrate with iCloud Keychain: **Yes**, prepared in the unsubmitted form. This commits to implementing both saving
  new passkeys and signing in using existing passkeys after entitlement approval.
- Optional App Store URL / App Apple ID: leave blank; this desktop app is not a Mac App Store listing.
- Learn/download links: **private downloads.proteus.example delivery verified and entered in the draft**. The URL is
  unlisted, read-only, revocable and expires January 21, 2027. Anyone with the link can read only
  the five evaluation files. The WTB website project's protected access record holds the exact URL.

## Review narrative

Proteus is a macOS Electron/Chromium desktop application with user-facing website tabs, browser
profiles, URL/search entry, navigation history and Chrome Web Store extension support. It combines
browsing with optional AI conversations and scheduled work. Website browsing does not require a
Proteus account. The macOS package declares HTTP and HTTPS and opens incoming links directly in
new tabs, including after cold startup or with all windows closed.

We verified WebAuthn credential creation and sign-in through the actual embedded Chromium browser
using a disposable CTAP2 USB virtual authenticator. Acceptance verifies the assertion signature,
challenge, origin, relying-party hash and user presence/verification; an unrelated relying-party
request is rejected. Physical hardware and iCloud Keychain were not exercised by this test.

We intend to integrate WebAuthn with passkeys saved in iCloud Keychain for both registration and
sign-in, using Apple's consent/authentication UI. Current Electron 44.5.1 exposes Touch ID
configuration but lacks the newer platform-passkeys option; completing the native integration and
its acceptance is separate work. We are not representing iCloud passkeys as already operational.

The official iCloud Passwords extension currently cannot connect to Apple's native helper from
Proteus. Local diagnostics show the helper is terminated by macOS parent-signing constraints.
The native pipe failure is now handled without an uncaught EPIPE exception, but Proteus is neither
on the helper's approved identity list nor provisioned with the alternative managed browser
entitlement. Please confirm the correct authorization path for this browser.

The development review candidate is signed with WTB's existing organization development identity.
The operator's current installed build remains on its original Personal Team; no signing migration
has occurred. We will complete explicit organization App ID and distribution provisioning before
shipping an entitled build. Agents do not receive a vault or extension-background inspection API;
ordinary website automation has its own authorization boundary. User-filled website fields remain
website content and are not claimed to be inaccessible to authorized page automation.

## Distribution gates requiring operator review

The unlocked Mac's Keychain has usable Apple Development identities, including the existing WTB
organization identity. It has **no usable Developer ID Application identity**. The Apple portal
previously showed a cloud-managed Developer ID certificate; that listing does not provide a local
private key usable by Electron signing. Do not revoke it or other shared certificates.

Before public distribution and the entitlement request:

1. Register the explicit organization App ID if still absent. Read-only inspection found no matching
   explicit ID; the existing wildcard is insufficient for a managed browser capability.
2. Establish a legitimate Developer ID signing route for this Electron app under WTB (an accessible
   existing identity or a separately reviewed certificate request). Preserve all installed identities.
3. Build with hardened runtime and appropriate Electron entitlements, verify nested/vendor signing,
   submit for notarization, staple and verify Gatekeeper on the exact artifact. **Notarization is an
   Apple submission and remains held for operator review.** Development signing is not a substitute.
4. Host the reviewed page/download through the existing website deployment process and verify HTTPS,
   checksum and clean-account launch. Then fill the working link in Apple's request and review it again.
5. Submit the entitlement form only after the operator's explicit approval. After approval, provision
   and implement iCloud integration, then test genuine create/sign-in and extension pairing/fill/save.

The staged development candidate is useful for engineering review but is not a notarized public
release. A clean build and virtual-authenticator acceptance cannot close the distribution or iCloud
integration gates. No security warnings should be bypassed for review.

## Validation and reproducibility

- `npm test` and `npm run check`.
- `node test/browser-webauthn-ui.mjs` (synthetic CTAP2; no real vault/Keychain credentials).
- `node test/external-urls-ui.mjs` (queued/warm/second-instance links, repeated links, reopen after all
  windows close, human ownership, no agent grants, credential-URL rejection, Home navigation).
- Both UI tests accept `PROTEUS_TEST_EXECUTABLE` for the exact packaged candidate.
- `docs/apple-browser-review-historical-template.html` preserves the superseded review page draft outside deployable web assets. Binary download/checksums
  and acceptance evidence are build artifacts, not committed runtime/user data.

## Alternative Apple browser-inclusion route

Apple accepts issues/pull requests in Password Manager Resources to include browser signing
identities for the official extension helper. That is a separate public submission; it is not an
entitlement grant, and helper-list changes require an OS-delivered update. Do not publish both
routes automatically. Proposed issue title: “Add Proteus macOS browser compatibility for iCloud
Passwords.” Supply only the final intended bundle/team and sanitized product/review links after
the operator reviews the exact text. Do not attach raw crash logs or profiles.

## Sources

- [Apple browser entitlement criteria](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.web-browser.public-key-credential)
- [Apple request form](https://developer.apple.com/contact/request/macos-browsers-passkeys/)
- [Apple native-helper inclusion process](https://github.com/apple/password-manager-resources#how-apple-uses-web-browser-extension-distribution-information)
- [Bitwarden inline autofill](https://bitwarden.com/help/auto-fill-browser/)

## Previous staged artifact acceptance (superseded by the WTB Tech candidate)

Build `4338f058a3f7+dirty.de14e3f717d3` (299 runtime files) is independently built and development-signed
under WTB team `TEAMID0000`. Deep/strict signature verification passes. Gatekeeper rejects public
distribution; notarization has not been submitted. All 868 Node tests and static checks pass. Both
WebAuthn and external-link/Home UI acceptance pass against this exact packaged executable. The
ZIP passes CRC and all 299 packaged runtime hashes match its source provenance.

Staged directory: `dist/apple-review-20261022/review/`. It contains the page, ZIP, synthetic screenshot,
acceptance JSON and SHA256SUMS. Download SHA-256: `72f00ff4bc8209d839db13bce667b5383777c133621d3f7c950dcd4f36a5eb32`.
The local preview is for the operator; no public download URL has been deployed or entered into
Apple's request. The organization App ID draft is now at **Confirm your App ID** for “Proteus Desktop,”
explicit `com.wtbtech.proteus.desktop`, with no extra capabilities selected. **Register was not clicked.**

## October 22 identity correction

The operator requested WTB Tech naming. The explicit App ID confirmation and entitlement form
now use `com.wtbtech.proteus.desktop`. The Register and Submit actions remain untouched. Build
with `PROTEUS_APPLE_REVIEW=1` to produce this separate identity; the installed legacy desktop ID
and native mobile provisioning stay unchanged until a reviewed migration. The previous artifact
above used the legacy ID and must not be represented as the renamed candidate. Updated artifact
acceptance is recorded below after verification.

## WTB Tech candidate acceptance — October 22

Build `4338f058a3f7+dirty.c2e1d517acdd` uses explicit bundle ID
`com.wtbtech.proteus.desktop`, WTB team `TEAMID0000`, and the existing Apple Development
identity. Deep/strict signature verification passes. Its source fingerprint is
`c2e1d517acdd6dd67772f11719be813b9ec15d3327d1b22ceefc82477cca085c`.
All 299 runtime files match the source provenance and extracted archive. ZIP CRC and the
served HTTP download checksum pass. Archive size is 229,983,266 bytes; SHA-256 is
`e84f2ff9ff1c9864edbdf0d58e786e08ee03df6c50e3d7f6c33eabdec32c1693`.

The page, ZIP, checksums, screenshot and acceptance JSON are staged under
`dist/apple-review-wtbtech-20261022/review/`. The localhost preview is operator-only.
868 Node tests and static checks pass. Synthetic CTAP2 registration/assertion and external-link
acceptance pass against this exact packaged executable; no real iCloud credential was exercised.
The final candidate has not been notarized or publicly hosted. Final Gatekeeper acceptance has
not been established. No installed application, certificate, provisioning profile or live data
was replaced. The App ID confirmation and entitlement draft both contain the new ID;
**Register and Submit remain untouched**. The distribution prerequisites listed above still apply.

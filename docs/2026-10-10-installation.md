# October 10 installation

This is the **historical partial 0.2.10 rollout** rejected by the operator. Full scope and fresh
0.2.11 implementation/validation/deployment are tracked in
[the full-chat release ledger](2026-10-10-full-chat-release.md).

The operator approved builds and updates for Build Mac, Work Mac, iPad and iPhone. The referenced
Codex build thread confirmed that its earlier 0.2.10 artifacts were staged, not installed. This
rollout includes the implemented BF-04–24 batch and BF-38 typing fix. BF-25–37 and BF-39 remain
queued; the composer prototypes and automatic localhost-preview transport are not implemented.

## Device status

| Target | Evidence |
| --- | --- |
| iPad | 0.2.10 / 2610.10.1 installed and launched; seven protected files byte-identical before launch; selected host and destination index preserved after launch |
| iPhone | 0.2.10 / 2610.10.1 installed and launched; seven protected files byte-identical before launch; selected host and destination index preserved after launch |
| Build Mac | 0.2.10 installed, launched and verified; original signer/data/pairings retained |
| Work Mac | Signed artifact ready; installation pending an accessible installer route |

Native updates were in-place, with the original signing certificate and entitlements. No app
uninstall, re-pairing, certificate reset or unrelated device change occurred. Private backups and
installation receipts are outside this repository. These checks verify installation, launch and
selected persisted records; real website login and provider workflows were not exercised.

The iOS development profile expires **October 10 at 17:29 MDT (23:29:01 UTC)**. Xcode's automatic
provisioning update reused that profile; it did not renew it. Renewal remains required before
expiry for continued device use. Do not mistake successful installation for renewed signing.

The Build Mac is hosting this conversation. Its detached updater waits for current turns to
finish, verifies the original signer, stages the new app, quits gracefully, makes and verifies a
cold application-data backup, replaces the app, launches it, and checks its version and pairing
identities. It retains the original application for rollback. This row is updated only after
the updater's installation checks pass; preparation is not an installation claim.

HC is visible through the relay, whose command interface does not support app installation.
The documented SSH hostname did not answer a port check. The available GitHub account also
could not access the project repository. No alternate account, credentials or installation
channel was substituted. An installer-chat link or reachable approved SSH route is still needed.

## Build and verification

- Desktop: `dist/install-0.2.10-20261010/Proteus-darwin-arm64/Proteus.app`, version 0.2.10,
  revision `ec8b213d382e+dirty.766f64977756`; all 176 runtime hashes verified.
- Signed desktop transfer archive: `dist/install-0.2.10-20261010/Proteus-0.2.10-mac.zip`,
  with a SHA-256 sidecar.
- Native: `dist/ios/Proteus-0.2.10-2610.10.1.app`, Release for physical iPhone/iPad.
- Original desktop, fresh desktop and fresh native signing certificates match. Deep/strict
  signature verification passed; the desktop build is a local development build, not notarized.
- Fresh release validation: 402 Node tests passed; static checks passed; the packaged desktop
  browser-services UI rehearsal passed in an isolated home.
- Typing regression evidence: [native typing receipt](2026-10-09-native-typing.md), including
  iPhone/iPad long-chat tests. Physical-device typing performance remains user acceptance.
- Corresponding source: `dist/install-0.2.10-20261010/source/Proteus-0.2.10-source.tar.gz`,
  728 files, SHA-256 `f4773a7dba3daa18bd636173c0700d2479109e10c0652370ac05c3c56dfb2fc6`.
  Keep the adjacent upstream GPL source archive and bundled third-party notices with distribution.

Production website deployment is not part of these four-device installation receipts.

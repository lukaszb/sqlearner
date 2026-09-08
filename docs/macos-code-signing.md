# macOS build signing and notarization

A public macOS build of SQLearner requires two things:

1. a signature made with a `Developer ID Application` certificate,
2. notarization of the application by Apple.

Without them, Gatekeeper may report that the application is damaged or cannot
be opened. A free Apple Developer account is not sufficient to obtain a
Developer ID certificate; an active
[Apple Developer Program](https://developer.apple.com/programs/enroll/)
membership is required.

## 1. Create a Developer ID Application certificate

The simplest way to create the certificate is through Xcode:

1. Open **Xcode → Settings → Accounts**.
2. Add your Apple account.
3. Select the team enrolled in the paid Apple Developer Program.
4. Click **Manage Certificates…**.
5. Click `+` and select **Developer ID Application**.

If you work in an organization and this option is unavailable, the Account
Holder must create the certificate. They can then export it together with its
private key to a password-protected `.p12` file.

The certificate can also be created manually in
[Certificates, Identifiers & Profiles](https://developer.apple.com/help/account/certificates/create-developer-id-certificates).
In that case, generate the CSR on the same Mac that will use the certificate.
A downloaded `.cer` file without its corresponding private key is not a
complete signing identity.

Verify the installation:

```bash
security find-identity -v -p codesigning
```

The expected entry looks similar to:

```text
Developer ID Application: Firstname Lastname (ABCDE12345)
```

In **Keychain Access → My Certificates**, the certificate should have an
expandable private key underneath it. If the command still reports
`0 valid identities`, the private key is usually missing, the certificate has
expired, or the certificate is stored in a different keychain.

The ZIP produced by this project only requires `Developer ID Application`.
`Developer ID Installer` is required for `.pkg` installers, which SQLearner
does not currently build.

## 2. Configure notarization credentials

### Local development: a Keychain profile

Find the Team ID in the Apple Developer membership details. Then create an
app-specific password under **Sign-In and Security → App-Specific Passwords**
at [account.apple.com](https://account.apple.com/).

Store the credentials in Keychain with `notarytool`:

```bash
xcrun notarytool store-credentials "SQLearner-notary" \
  --apple-id "developer@example.com" \
  --team-id "ABCDE12345"
```

The command prompts for the app-specific password. The release scripts use
`SQLearner-notary` by default. Override the profile for a single build when
needed:

```bash
APPLE_KEYCHAIN_PROFILE="another-profile" npm run build:mac:release
```

### Alternative: Apple ID environment variables

```bash
export APPLE_ID="developer@example.com"
export APPLE_TEAM_ID="ABCDE12345"
read -s APPLE_APP_SPECIFIC_PASSWORD
export APPLE_APP_SPECIFIC_PASSWORD
```

Never use the regular Apple account password. Do not store an app-specific
password or a `.p12` certificate in the repository.

### CI: App Store Connect API key

An API key is preferred in CI. Configure these secrets:

```bash
export APPLE_API_KEY=/absolute/path/to/AuthKey_ABC123.p8
export APPLE_API_KEY_ID=ABC123
export APPLE_API_ISSUER=00000000-0000-0000-0000-000000000000
```

An Electron Builder `.p12` certificate can be supplied through:

```bash
export CSC_LINK=/absolute/path/to/developer-id-application.p12
export CSC_KEY_PASSWORD='p12-password'
```

When Windows signing is configured at the same time, use the separate
`WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` variables for the Windows
certificate.

## 3. Build a release

Build macOS only:

```bash
npm run build:mac:release
```

Build Windows and macOS:

```bash
npm run build:release
```

Both scripts default to the `SQLearner-notary` Keychain profile for the macOS
notarization step. They intentionally fail when the expected profile is
missing or invalid, the `Developer ID Application` identity cannot be found,
or notarization fails. This prevents an unsigned or unnotarized artifact from
being published accidentally.

The local `Developer ID Application` certificate is discovered automatically
by Electron Builder. The notarization profile remains stored in Keychain and
does not need to be recreated after restarting the Mac.

## 4. Verify the artifact

After a successful build, run:

```bash
codesign --verify --deep --strict --verbose=2 \
  release/mac-arm64/SQLearner.app

spctl --assess --type execute --verbose=2 \
  release/mac-arm64/SQLearner.app

xcrun stapler validate \
  release/mac-arm64/SQLearner.app
```

On an Intel Mac, the directory may be named `release/mac` or
`release/mac-x64` instead of `release/mac-arm64`.

The `scripts/release` script runs these checks automatically before
publication.

## 5. Local testing build only

To create a build that runs only on the Mac where it was produced:

```bash
npm run build:mac
```

This variant uses an ad hoc signature. It is not intended for publication or
distribution to other users.

## 6. Current local setup

The configured development Mac uses:

```text
Developer ID Application: Lukasz Balcerzak (ZWUQRSFUF3)
Keychain notarization profile: SQLearner-notary
```

The certificate's private key and the notarization credentials are stored in
the login Keychain. They must never be committed to the repository.

## 7. Resume setup in a new Browser session

Open a new local session for this repository, select `@Browser` from the
mention menu, and use this prompt:

```text
Read AGENTS.md and docs/macos-code-signing.md. Continue configuring macOS code
signing and notarization for SQLearner. Use the in-app Browser and open
https://developer.apple.com/account/. First check, without changing anything,
whether the Developer ID Application certificate already exists. Stop whenever
I must personally sign in, complete 2FA, make a payment, accept an agreement,
or upload a file. Do not ask me to provide a password in chat. Generate the CSR
and private key locally without exposing the private key. After installing the
certificate, verify it with security find-identity -v -p codesigning, configure
notarytool credentials in Keychain, run npm run build:mac:release, and then
verify the result with codesign, spctl, and stapler.
```

The in-app Browser does not automate file uploads. When the Apple portal asks
for a CSR, provide its path and wait for the user to select and upload it.

## Sources

- [Apple: Developer ID certificates](https://developer.apple.com/help/account/certificates/create-developer-id-certificates)
- [Apple: creating and exporting certificates in Xcode](https://help.apple.com/xcode/mac/current/en.lproj/dev154b28f09.html)
- [Electron Builder: macOS code signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/)
- [Electron Builder: macOS configuration and notarization](https://www.electron.build/v26/docs/mac/)

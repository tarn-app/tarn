# Tarn

A private cycle tracker. Encrypted, offline, self-destructing.

---

## What is Tarn?

Tarn is a period and cycle tracking app that stores all data locally on your device, encrypted. No accounts. No cloud. No tracking. No exceptions.

If someone tries to brute-force your PIN, the app destroys all data automatically.

## Why does this exist?

Period tracking data is sensitive. It can reveal pregnancy timing, fertility patterns, and reproductive health decisions. In some contexts, this data could be used against the person who created it.

Most period trackers store data on remote servers, share data with third parties, or lack meaningful encryption. Tarn takes a different approach: your data never leaves your device, and it's encrypted with keys derived from a PIN only you know.

We publish our [threat model](THREAT-MODEL.md) so you can evaluate our security claims yourself.

## Features

- **PIN-encrypted storage** — All data encrypted with SQLCipher (AES-256). Encryption key derived from your PIN using Argon2id.
- **Automatic data destruction** — After repeated wrong PIN attempts, all data is overwritten and deleted. Configurable threshold.
- **Duress PIN** — Optional secondary PIN that shows an empty, functional app. For situations where you're forced to unlock.
- **Temperature tracking** — Basal body temperature (BBT) for sympto-thermal cycle tracking.
- **Cycle insights** — Predictions, phase guidance, symptom pattern analysis. All computed locally.
- **Zero network calls** — The app makes no internet connections. Nothing to intercept, nothing to subpoena.
- **No account required** — No email, no phone number, no identity tied to your data.
- **Disguised app icon** — Optional alternative icons (calculator, notes, weather) so the app doesn't advertise itself.
- **Open source** — Every security claim is verifiable. Read the code.

## Security Model

Tarn is designed to protect against:

| Adversary | Protection |
|-----------|------------|
| Someone who picks up your phone | PIN lock, disguised icon, screenshot prevention |
| Someone who knows your phone passcode | App-level PIN, duress PIN for coerced unlock |
| Forensic tools (Cellebrite, GrayKey) | SQLCipher encryption, Argon2id key derivation, no cloud backup |
| Brute-force attempts | Auto-destruct after N wrong PINs |

Tarn cannot protect against:
- Device-level compromise (malware, spyware)
- Someone watching you use the app
- Legal compulsion to provide your PIN (varies by jurisdiction)

For the complete analysis, read the [threat model](THREAT-MODEL.md).

## Installation

### App Stores

- **iOS:** [Coming soon]
- **Android (Google Play):** [Coming soon]
- **Android (F-Droid):** [Coming soon]

### Direct Download

- **Android APK:** [Coming soon — GitHub Releases]

### Build from Source

```bash
# Clone the repo
git clone https://github.com/tarn-app/tarn.git
cd tarn

# Install dependencies
npm install

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Build for production
eas build --platform android
eas build --platform ios
```

Requires Node.js 18+, Expo CLI, and EAS CLI. Native builds required (no Expo Go) due to crypto modules.

## Project Status

**Status: In Development**

- [x] Threat model published
- [x] Security policy published
- [x] Core encryption (Phase 1)
- [x] Cycle tracking (Phase 2)
- [x] Predictions and insights (Phase 3)
- [x] Advanced security features (Phase 4)
- [x] Polish and accessibility (Phase 5)
- [ ] Public release (Phase 6)

## Documentation

- [Threat Model](THREAT-MODEL.md) — Who we protect against, how, and what we can't protect against
- [Security Policy](SECURITY.md) — How to report vulnerabilities
- [Contributing](CONTRIBUTING.md) — How to contribute to the project

## Reporting Security Issues

If you find a security vulnerability, **do not open a public issue.**

Email: security@tarn.group

See [SECURITY.md](SECURITY.md) for our disclosure policy.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

Areas where we especially need help:
- Security review of crypto implementation
- Accessibility testing (VoiceOver, TalkBack)
- Translations (v2)

## Tech Stack

- React Native + Expo (SDK 52+)
- SQLCipher via expo-sqlite
- Argon2id via react-native-argon2
- TypeScript
- Zustand for state management

## License

GPL-3.0. See [LICENSE](LICENSE).

This means:
- You can use, modify, and distribute this software
- If you distribute modified versions, you must also use GPL-3.0
- You must make source code available

## Acknowledgments

Tarn exists because of the work done by:
- The [Signal](https://signal.org) team for setting the standard in secure messaging
- [Drip](https://bloodyhealth.gitlab.io/) and [Euki](https://eukiapp.org/) for pioneering privacy-focused period tracking
- The security researchers and privacy advocates who've documented the risks

---

*Tarn: a small mountain lake, hidden in a valley, hard to find unless you know where to look.*

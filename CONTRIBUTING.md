# Contributing to Tarn

Thank you for your interest in contributing to Tarn. This project exists to protect people's privacy, and your help makes that mission stronger.

## Before You Start

1. Read the [README](README.md) to understand what Tarn is
2. Read the [Threat Model](THREAT-MODEL.md) to understand our security goals
3. Check existing issues and pull requests to avoid duplicate work

## Security Vulnerabilities

**Do not open public issues for security vulnerabilities.**

See [SECURITY.md](SECURITY.md) for our responsible disclosure process.

## Areas Where We Need Help

- **Security review** — Review crypto implementation, identify weaknesses
- **Accessibility testing** — VoiceOver (iOS), TalkBack (Android), screen reader compatibility
- **Translations** — Planned for v2
- **Documentation** — Improve clarity, fix errors

## Development Setup

```bash
# Clone the repo
git clone https://github.com/tarn-app/tarn.git
cd tarn

# Install dependencies
npm install

# Run development build (requires EAS or local native toolchain)
npx expo run:android
# or
npx expo run:ios
```

Note: Expo Go won't work due to native crypto modules. You need EAS builds or a local dev build.

## Code Guidelines

### General

- TypeScript strict mode
- No network calls — ever. The ESLint rule enforces this.
- Test crypto-related code thoroughly
- Keep dependencies minimal

### Commits

- Write clear commit messages
- One logical change per commit
- Reference issues where applicable

### Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run lint: `npm run lint`
5. Submit PR with clear description of changes

### Code Style

- Use the existing patterns in the codebase
- Run `npm run lint` before committing
- Prefer explicit over clever

## Language Guidelines

Tarn uses inclusive, gender-neutral language throughout:

- "People who menstruate" not "women"
- "Cycle" not "period" where appropriate
- No assumptions about gender identity
- Clinical accuracy over euphemism

## Testing

- Unit tests for crypto operations are critical
- Test edge cases: empty state, max values, invalid input
- Accessibility testing on real devices preferred

## Questions?

Open a discussion or issue. We're happy to help.

---

By contributing, you agree that your contributions will be licensed under GPL-3.0.

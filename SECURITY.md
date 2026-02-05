# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Tarn, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

Email: security@tarn.group

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 7 days we will provide a severity assessment and fix timeline
- **Fix:** Critical vulnerabilities will be patched within 14 days. Non-critical within 30 days.
- **Disclosure:** We will coordinate disclosure timing with the reporter. We aim for public disclosure within 90 days of the initial report.

### Credit

We will credit reporters in release notes and the THREAT-MODEL.md changelog unless they prefer to remain anonymous.

## Scope

The following are in scope:
- Cryptographic implementation flaws
- Authentication bypasses
- Data leakage (encrypted data accessible without key)
- Self-destruct mechanism failures
- Duress mode detection (ways to distinguish duress from real unlock)
- Metadata leakage not documented in the threat model
- Any way to extract plaintext data without the PIN

The following are out of scope:
- Device-level compromise (OS exploits, malware)
- Physical observation of the screen during use
- Social engineering attacks
- Denial of service (crashing the app)
- Issues already documented in THREAT-MODEL.md "Known Limitations"

## Supported Versions

Only the latest release receives security updates. We recommend always updating to the latest version.

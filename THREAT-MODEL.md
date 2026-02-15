# Tarn Threat Model

**Version:** 1.0
**Last updated:** 2026-02-14
**Status:** Open for community review

This document describes who Tarn protects, what it protects against, what it cannot protect against, and the specific technical mechanisms behind each defense. If you find a flaw, please report it via our [security disclosure process](SECURITY.md).

---

## Table of Contents

1. [What Tarn Is](#what-tarn-is)
2. [Who Uses Tarn](#who-uses-tarn)
3. [Adversary Profiles](#adversary-profiles)
4. [What We Protect](#what-we-protect)
5. [Attack Surfaces](#attack-surfaces)
6. [Defenses by Layer](#defenses-by-layer)
7. [What Tarn Cannot Protect Against](#what-tarn-cannot-protect-against)
8. [Cryptographic Design](#cryptographic-design)
9. [Self-Destruct Mechanism](#self-destruct-mechanism)
10. [Duress Mode](#duress-mode)
11. [Forensic Resistance Analysis](#forensic-resistance-analysis)
12. [Metadata Leakage](#metadata-leakage)
13. [Known Limitations](#known-limitations)
14. [Prior Art and Real-World Cases](#prior-art-and-real-world-cases)
15. [Design Decisions and Tradeoffs](#design-decisions-and-tradeoffs)

---

## What Tarn Is

Tarn is an offline period tracker with PIN-based encryption and automatic data destruction on brute force.

- All data is stored locally on the device, encrypted with SQLCipher (AES-256)
- The encryption key is derived from a user-chosen PIN using Argon2id
- After a configurable number of failed PIN attempts, all data is overwritten with random bytes and deleted
- An optional duress PIN shows a convincing empty interface without unlocking real data
- The app makes zero network calls. No analytics. No telemetry. No cloud. No exceptions.

Tarn is open source. Every claim in this document can be verified by reading the code.

---

## Who Uses Tarn

Tarn is designed for people whose period tracking data could be used against them:

- **People in states or countries where reproductive health data could be weaponized.** As of January 2025, 62.7 million women and girls in the US live under state abortion bans. Fourteen states enforce total bans, affecting approximately 26 million women of reproductive age. Another 6 states restrict abortion to 6-12 weeks—meaning 18 states comprising nearly one-third of the US population have restrictive policies. Period data has been discussed as potential evidence in abortion prosecutions, and digital evidence (text messages, search histories) has already been used in actual cases. In June 2025, the federal HIPAA Reproductive Health Rule was vacated by a Texas court, and HHS did not appeal—leaving only a patchwork of state-level protections (CA, CT, DE, IL, MA, NJ, NM, NY, VA, DC).

- **People in abusive relationships.** A partner who monitors the user's phone may look for evidence of pregnancy, contraception use, or irregular cycles. The National Network to End Domestic Violence reports that technology-facilitated abuse is present in nearly all domestic violence cases.

- **People who want health data to remain private on principle.** Research published in 2025 in BMC Women's Health found that 71% of period tracking apps share personal and sensitive health data with third parties. Flo Health settled a $56M lawsuit for sharing intimate cycle data with Meta and Google. Tarn exists because trust-based privacy ("we promise not to sell your data") has failed.

- **Minors whose parents monitor their devices.** A parent with the device passcode or monitoring software may look through installed apps for sensitive health information.

---

## Adversary Profiles

We define four adversary tiers. Tarn's defenses are designed primarily for Tiers 1-3.

### Tier 1: Casual Snooper

| | |
|---|---|
| **Who** | Partner, parent, roommate, coworker, friend |
| **Access** | Picks up unlocked phone, scrolls through apps |
| **Capability** | No technical skill. Will open apps, look at screens, read notifications |
| **Goal** | See if the user is tracking periods, pregnant, or using contraception |
| **Tarn's defense** | PIN lock (app never opens without it), no notifications, disguised app icon, generic PIN screen with no health-related branding, screenshot prevention, app switcher blur |
| **Effectiveness** | **Strong.** The app is invisible or unrecognizable without the PIN. |

### Tier 2: Determined Individual

| | |
|---|---|
| **Who** | Abusive partner, controlling parent, suspicious employer |
| **Access** | Knows the device passcode. May install monitoring software. Will look through all apps deliberately. Has time and motivation. |
| **Capability** | Non-technical but persistent. May search app stores for what apps are installed. May try obvious PINs. May try to force the user to unlock the app. |
| **Goal** | Monitor reproductive health. Detect pregnancy. Control the user's body and choices. |
| **Tarn's defense** | Disguised app icon (appears as calculator/notes/weather). PIN protects app access. Duress PIN shows empty interface under coercion. Self-destruct after repeated wrong PINs erases all evidence the app ever contained data. No app-level data in device backups. |
| **Effectiveness** | **Strong.** Disguise prevents discovery. Duress PIN defeats coerced unlock. Self-destruct defeats brute force. Monitoring software cannot read SQLCipher-encrypted databases. |

### Tier 3: Law Enforcement (Warrant)

| | |
|---|---|
| **Who** | Police, prosecutors, forensic analysts |
| **Access** | Device seized pursuant to warrant. Access to Cellebrite UFED, Magnet GrayKey, or equivalent forensic tools. Legal authority to compel device unlock (5th Amendment protections vary by jurisdiction). |
| **Capability** | Can extract the full filesystem from the device. Can brute-force PINs offline if they extract the encrypted database. Can analyze RAM dumps for encryption keys on unlocked devices. Can access iCloud/Google backups if not excluded. |
| **Goal** | Obtain evidence of pregnancy, period patterns, or reproductive health decisions for use in prosecution |
| **Tarn's defense** | SQLCipher encryption requires the derived key (not on device in plaintext). Argon2id with 64MB memory cost slows offline brute-force. Self-destruct triggers during on-device PIN attempts. No data in cloud backups. Duress PIN provides plausible deniability. File overwrite with random bytes before deletion. |
| **Effectiveness** | **Partial.** See [Forensic Resistance Analysis](#forensic-resistance-analysis) for a detailed breakdown. The primary defense is encryption strength + self-destruct timing. If the device is seized while the app is unlocked (derived key in RAM), forensic tools may extract the key. If seized while locked and the adversary works offline, the 4-6 digit PIN is the weak link. |

### Tier 4: State-Level Actor

| | |
|---|---|
| **Who** | Intelligence agencies, governments with advanced cyber capabilities |
| **Access** | Device exploits (zero-days), network surveillance, app store cooperation, manufacturer cooperation |
| **Capability** | Can compromise the device OS itself. Can intercept before encryption occurs. Can compel platform cooperation. |
| **Goal** | Mass surveillance of reproductive health |
| **Tarn's defense** | Minimal. If the device OS is compromised, no app-level protection is meaningful. |
| **Effectiveness** | **Out of scope.** Tarn cannot protect against OS-level compromise. Users facing state-level adversaries should use hardened devices (GrapheneOS) and comprehensive OPSEC beyond what any single app provides. |

---

## What We Protect

| Data | Sensitivity | Why It Matters |
|------|-------------|----------------|
| Period start/end dates | **High** | Core evidence in prosecution scenarios. Reveals pregnancy timing. |
| Basal body temperature (BBT) | **Very High** | A sustained temperature rise after a missed period is a near-certain pregnancy indicator. BBT data combined with missing period entries is more incriminating than period dates alone. This is the most sensitive data type in the app. |
| Cervical mucus observations | **High** | Combined with BBT, confirms ovulation timing. Reveals fertility awareness intent. In adversarial contexts, tracking cervical mucus implies deliberate reproductive monitoring. |
| Ovulation detection results | **Very High** | Confirmed ovulation dates + a subsequent gap in period entries is the strongest possible signal of pregnancy from cycle data alone. Derived from BBT + mucus, not stored separately - but visible on the stats screen during use. |
| Cycle predictions | **High** | Implies sexual activity patterns. A missed predicted period could suggest pregnancy. |
| Cycle phase guide content | **Low** | Hardcoded educational content. Not user-specific. Visible on screen during use but reveals nothing about the individual beyond their approximate cycle day. |
| Flow intensity | **Medium** | Corroborates period occurrence but adds limited additional information. |
| Symptoms | **Medium-High** | Some symptoms (nausea, breast tenderness) are pregnancy indicators. |
| Symptom pattern insights | **Medium-High** | Computed on-demand, never stored separately. But visible on the stats screen - a screen observer could see "nausea logged 3 of last 4 cycles" which could imply pregnancy. |
| Cycle report | **Very High** | A clinical summary of all cycle data in one screen. Designed for healthcare providers. If an adversary sees this screen, it reveals everything. Requires PIN re-entry to access. |
| Free-text notes | **Very High** | User-written content could contain anything: names, dates, plans, fears. |
| App existence | **Medium** | The presence of a hidden period tracker on a phone implies something to hide. |
| Usage patterns | **Medium** | When and how often the app is opened reveals tracking behavior. |
| Cycle history duration | **Low-Medium** | How much data exists reveals how long the user has been tracking. |

---

## Attack Surfaces

Every way an adversary could attempt to access Tarn's data:

### 1. Physical Access to Unlocked Phone (App Locked)

**Scenario:** Adversary picks up the phone while the user is away. The phone is unlocked but Tarn requires its own PIN.

| Attack | Defense | Status |
|--------|---------|--------|
| Open the app | PIN required on every launch | Defended |
| Guess the PIN | Self-destruct after N failures | Defended |
| Try the duress PIN | Only works if adversary knows a duress PIN was set | Defended |
| Look at notifications | Tarn sends no notifications | Defended |
| See the app in recent apps | App switcher blur (iOS) / FLAG_SECURE blank (Android) | Defended |
| See the app icon | Disguised as calculator/notes/weather | Defended |
| Search device for "period" | No such text in app name, storage paths, or visible strings | Defended |

### 2. Physical Access to Locked Phone

**Scenario:** Phone is powered on and locked (After First Unlock state). Adversary has physical possession.

| Attack | Defense | Status |
|--------|---------|--------|
| Unlock phone with device passcode | If adversary knows device passcode, they can open the phone but still need Tarn's PIN | Partial - phone is open, Tarn still locked |
| Forensic extraction (Cellebrite/GrayKey) | Full filesystem extraction possible on many devices. Encrypted DB file is extractable but unreadable without derived key. | Partial - see [Forensic Resistance Analysis](#forensic-resistance-analysis) |
| Extract database and brute-force offline | Argon2id slows each guess. 4-digit PIN: ~2.8 hours. 6-digit PIN: ~5.8 days. | **Weak for 4-digit PINs. Moderate for 6-digit PINs.** |

### 3. Physical Access to Unlocked App

**Scenario:** Adversary takes the phone while Tarn is open and the database is decrypted.

| Attack | Defense | Status |
|--------|---------|--------|
| Read the screen | Data is visible. This is an accepted risk during use. | **Not defended** |
| Take a screenshot | `preventScreenCaptureAsync()` blocks screenshots. `FLAG_SECURE` on Android. | Defended on Android, partial on iOS |
| RAM dump to extract derived key | If app is foregrounded, derived key is in memory | **Not defended against forensic tools** |
| Copy the database while decrypted | Database is always encrypted on disk (SQLCipher). Decryption happens in memory at the page level. | Defended (DB file is still encrypted) |

### 4. Device Backup Extraction

**Scenario:** Adversary accesses the user's iCloud or Google account.

| Attack | Defense | Status |
|--------|---------|--------|
| Restore from iCloud backup | `allowBackup: false` on Android. iOS: app data excluded from backup. | Defended |
| Google Auto Backup | Disabled via Android manifest config | Defended |
| iTunes/Finder local backup | App data should be excluded via proper file placement | Defended (verify in testing) |

### 5. App Store / Purchase History

**Scenario:** Adversary checks what apps the user has downloaded.

| Attack | Defense | Status |
|--------|---------|--------|
| Check App Store purchase history | App name "Tarn" reveals nothing about its purpose | Partial - searching for the app in the store would show its description |
| Check Google Play install history | Same as above | Partial |
| Sideloaded APK (F-Droid / direct) | No store trail at all | Defended |

### 6. Network Traffic Analysis

**Scenario:** Adversary monitors the user's network traffic.

| Attack | Defense | Status |
|--------|---------|--------|
| Monitor outgoing connections | Tarn makes zero network calls. There is nothing to intercept. | **Fully defended** |
| DNS requests | None | **Fully defended** |
| Analytics / crash report data | None exist | **Fully defended** |

### 7. Coerced Unlock

**Scenario:** Adversary forces the user to open the app (physical threat, legal compulsion, emotional manipulation).

| Attack | Defense | Status |
|--------|---------|--------|
| "Open the app or else" | User enters duress PIN. App shows empty calendar. Adversary sees an empty, functional app. | Defended (if duress PIN was configured) |
| Court order to provide PIN | 5th Amendment protections are inconsistent across jurisdictions. Some courts have compelled PIN disclosure. | **Legal defense, not technical** |
| User reveals real PIN under pressure | Data is visible. No technical defense against this. | **Not defended** |

---

## Defenses by Layer

```
Layer 1: Invisibility
  App icon disguise (calculator/notes/weather)
  No notifications
  No "period" text on any visible screen
  App switcher blur / blank
  Screenshot prevention

Layer 2: Access Control
  PIN required on every launch
  App locks immediately on background
  No "forgot PIN" recovery (by design)

Layer 3: Cryptographic Protection
  Argon2id key derivation (64MB, 3 iterations)
  SQLCipher AES-256 encrypted database
  Salt stored in OS keystore (Keychain/Keystore)
  Derived key exists only in memory during use

Layer 4: Data Destruction
  Auto-destruct after N failed PIN attempts
  Overwrite database with random bytes before deletion
  Clear all secure store entries
  Reset to fresh install state

Layer 5: Plausible Deniability
  Duress PIN shows empty app
  Post-destruct state is indistinguishable from fresh install
  No forensic artifacts of previous data (within flash storage limitations)

Layer 6: Data Minimization
  Zero network calls (nothing to intercept or subpoena from servers)
  No cloud backup (nothing to subpoena from Apple/Google)
  No account (no email, phone number, or identity tied to usage)
  Minimal data collection (only what's needed for cycle tracking)
```

---

## What Tarn Cannot Protect Against

We believe in honesty about limitations. These are things Tarn does not defend against:

1. **Device-level compromise.** If the phone's operating system is compromised (malware, spyware, stalkerware), the attacker can see everything the user sees. Tarn is an app, not an operating system. Use a clean, updated device.

2. **Shoulder surfing.** If someone watches the user enter their PIN or views the screen while the app is open, the data is compromised. Use Tarn in private.

3. **RAM extraction on an unlocked app.** If the app is open (derived key in memory) and a forensic tool extracts RAM, the key can be recovered. Tarn clears the key on app background, but there is a window of vulnerability during active use.

4. **Offline brute-force of a 4-digit PIN.** If the encrypted database file is extracted forensically, a 4-digit PIN can be brute-forced in approximately 2.8 hours using Argon2id at our parameters. A 6-digit PIN extends this to approximately 5.8 days. **We strongly recommend using a 6-digit PIN.** Self-destruct only protects against on-device brute-force, not offline attacks on an extracted database copy.

5. **Flash storage wear-leveling.** When Tarn overwrites the database file with random bytes before deletion, the write may land on different physical flash blocks than the original data due to wear-leveling. The original encrypted bytes may persist on the physical storage until overwritten by other data. This is a hardware limitation that no software can fully overcome. However, the persisting data is still encrypted and requires the derived key.

6. **Legal compulsion to provide the PIN.** Courts in some jurisdictions have ordered suspects to provide device PINs or passwords. Fifth Amendment protections against compelled self-incrimination are inconsistent. Tarn provides a technical defense (duress PIN) but cannot override a court order. Consult a lawyer.

7. **Metadata inference.** An adversary who can see that Tarn is installed, or that an encrypted database file exists in the app's sandboxed directory, can infer that the user has something to hide. Tarn mitigates this with app icon disguise but cannot eliminate it entirely. See [Metadata Leakage](#metadata-leakage).

8. **Social engineering.** "Show me what's in that app." If the user doesn't use the duress PIN in this scenario, there is no technical defense.

9. **Screen observation of stats/report.** The stats screen shows BBT charts, ovulation confirmation, symptom patterns, and cycle predictions. The cycle report shows a complete clinical summary. If an adversary observes these screens during use, they gain access to highly sensitive health information including potential pregnancy indicators. Mitigation: screenshot prevention is active on all screens, and the cycle report requires PIN re-entry. But there is no defense against a person looking over the user's shoulder during active use.

10. **BBT data inference from decrypted database.** If the encrypted database is compromised (via brute-force or key extraction), BBT data is significantly more incriminating than period dates alone. A sustained temperature rise after a missed period is a near-certain pregnancy indicator. Users should understand that BBT tracking increases the sensitivity of the data inside the encrypted database, even though it does not increase the attack surface.

---

## Cryptographic Design

### Key Derivation

```
Algorithm:    Argon2id (RFC 9106)
Memory cost:  64 MB (65536 KiB)
Iterations:   3
Parallelism:  1
Output:       256 bits (32 bytes)
Salt:         256 bits (32 random bytes, generated once, stored in OS keystore)
Input:        User's PIN (4-6 digits)
```

**Why Argon2id:** It is the recommended password hashing algorithm per RFC 9106 and the winner of the Password Hashing Competition. The "id" variant provides resistance against both side-channel attacks (from the Argon2i component) and brute-force attacks (from the Argon2d component). The 64MB memory requirement makes GPU-parallel brute-force expensive - each guess requires 64MB of dedicated memory, severely limiting parallelism on GPUs with shared memory.

**Why these parameters:** At 64MB memory and 3 iterations, key derivation takes approximately 500ms on a modern smartphone. This is perceptible but acceptable for an unlock action that happens once per session. Faster parameters would reduce brute-force resistance. Slower parameters would frustrate the user.

### Database Encryption

```
Engine:       SQLCipher 4.x (via expo-sqlite)
Cipher:       AES-256 in CBC mode
Page size:    4096 bytes
HMAC:         SHA-512 per-page authentication
KDF:          SQLCipher's internal PBKDF2 (keyed with our Argon2id output)
```

SQLCipher encrypts the entire database file. Every page (4096 bytes) is independently encrypted and authenticated. There is no plaintext header, no unencrypted metadata, and no way to determine even the size of tables or number of records without the key.

The Argon2id-derived key is passed to SQLCipher via `PRAGMA key`. SQLCipher then applies its own internal KDF for per-page key derivation. This is defense in depth: even if a flaw is found in our Argon2id implementation, SQLCipher's own key derivation provides an additional layer.

### Export Encryption

```
Algorithm:    AES-256-GCM (via react-native-quick-crypto)
Key:          User re-enters PIN, Argon2id derives key
IV:           96 bits, randomly generated per export
Auth tag:     128 bits
Format:       { version, salt, iv, authTag, ciphertext } as JSON
```

Export files use AES-256-GCM for authenticated encryption. The user must re-enter their PIN to export. The export file is self-contained: it includes the salt and IV needed for decryption, but not the PIN.

---

## Self-Destruct Mechanism

### Trigger Conditions

Self-destruct activates when the failed PIN attempt counter reaches the user-configured threshold (default: 7, range: 5-15).

```
                    Enter PIN
                        |
                        v
               Is duress PIN? ──yes──> Duress mode (no counter increment)
                        |
                       no
                        |
                        v
            Attempt count >= threshold? ──yes──> DESTRUCT
                        |
                       no
                        |
                        v
               Try to open database
                    /         \
               success       failure
                  |              |
                  v              v
           Reset counter    Increment counter
           Return UNLOCK    Count >= threshold? ──yes──> DESTRUCT
                                    |
                                   no
                                    |
                                    v
                              Return WRONG_PIN
```

### Destruction Sequence

1. Close any open database connection
2. Read the database file size
3. Overwrite the file with cryptographically random bytes (same size as original)
4. Flush the write to disk
5. Delete the overwritten file
6. Delete `tarn_salt` from secure store
7. Delete `tarn_attempts` from secure store
8. Delete `tarn_threshold` from secure store
9. Delete `tarn_duress` from secure store
10. Delete `tarn_setup` from secure store
11. Delete all files in the app's document directory
12. Reset application state to first-run

### Post-Destruct State

After destruction, the app is indistinguishable from a fresh install. The next launch shows the setup flow ("Set up a PIN to protect your data"). There are no remnants of previous data in any location accessible without forensic tools.

The user can configure post-destruct behavior:
- **Fresh install (default):** App shows the setup screen as if newly installed
- **Error message:** App shows "Data corrupted. Please reinstall." This provides an alternative explanation if the adversary witnesses the destruct and questions what happened.

### What Self-Destruct Does NOT Protect Against

- **Offline attacks:** If the adversary copies the database file before attempting PINs, self-destruct cannot destroy the copy. The defense in this case is encryption strength alone.
- **Flash storage remnants:** Overwriting may not reach the original physical blocks due to wear-leveling. The remnant data is still encrypted.
- **Device-level forensic imaging before any PIN attempts:** If law enforcement images the device first, then tries PINs, the original encrypted database exists in the image.

---

## Duress Mode

### Design

The user can configure an optional secondary PIN (the "duress PIN"). When entered:

1. The app appears to unlock normally
2. A clean, empty calendar is displayed with no entries
3. The phase card shows a generic "Day 1" state (no cycle history implies fresh start)
4. Stats screen shows "Log a few more cycles for predictions" (empty state)
5. No symptom insights are shown (no data to analyze)
6. Cycle report is unavailable (no data to report)
7. The user can interact with the app (tap days, toggle flows, enter temps) - all actions are stored in volatile memory only
8. No data is written to disk. No data is read from the real database.
9. There is no visual indicator that duress mode is active

### Security Properties

- The duress PIN is stored as an Argon2id hash in the OS keystore, using the same salt as the real PIN
- An adversary who inspects the keystore sees two hashed values (`tarn_duress` and the real PIN hash via SQLCipher's own key verification). They cannot determine which is which without trying both.
- The duress PIN does not increment the attempt counter. An adversary using the duress PIN will not trigger self-destruct.
- Duress mode does not leave traces. No writes to disk, no log entries, no timestamps.

### Duress vs. Self-Destruct

These are complementary, not redundant:
- **Duress** is for coerced unlock ("open it or else"). It satisfies the adversary without revealing data.
- **Self-destruct** is for unattended brute-force. It destroys data before the adversary reaches the correct PIN.

### Comparison with Euki's Approach

Euki (which became open source in 2025) uses a hardcoded duress code ("0000" or "1111"). This is a known value that a knowledgeable adversary can try—and since Euki is now open source, this implementation detail is publicly documented. Tarn's duress PIN is user-chosen and stored as an Argon2id hash indistinguishable from any other hash. An adversary cannot determine the duress PIN by inspecting storage or reading the source code.

---

## Forensic Resistance Analysis

This section assumes a Tier 3 adversary (law enforcement with forensic tools and a warrant).

### Scenario A: Device Seized While App is Closed (Locked Phone)

```
Adversary capability:
  - Physical possession of locked device
  - Cellebrite Premium or Magnet GrayKey
  - Can potentially unlock device (depending on OS version, patch level)
  - Can extract full filesystem

Tarn's state:
  - Database file exists in app sandbox (encrypted)
  - Derived key is NOT in memory (app was backgrounded/closed, key was cleared)
  - Salt is in OS keystore (extractable with full filesystem access)
  - Attempt counter is in OS keystore

Attack path:
  1. Extract filesystem including app sandbox
  2. Extract salt from keystore
  3. Brute-force Argon2id(PIN, salt) offline
  4. Try each derived key against the SQLCipher database

Time to crack:
  - 4-digit PIN: ~10,000 guesses x ~500ms/guess = ~83 minutes (single thread)
  - 6-digit PIN: ~1,000,000 guesses x ~500ms/guess = ~5.8 days (single thread)
  - With 8-core workstation: divide by ~3-4x (memory-hard limits parallelism)
  - 4-digit PIN: ~20-30 minutes on forensic workstation
  - 6-digit PIN: ~1.5-2 days on forensic workstation

Assessment: 4-DIGIT PINS ARE NOT FORENSICALLY SECURE.
            6-digit PINs provide days of resistance, not weeks.
            Self-destruct does not help here (attack is offline on a copy).
```

### Scenario B: Device Seized While App is Open

```
Adversary capability:
  - Same as Scenario A
  - Device is in AFU (After First Unlock) state
  - App was recently in foreground

Tarn's state:
  - App backgrounds when seized (key should be cleared from memory)
  - Window of vulnerability: if RAM is dumped before key is cleared
  - SQLCipher may retain key in its internal state briefly

Attack path:
  1. RAM dump immediately on seizure
  2. Search for 256-bit key candidates in RAM
  3. Try each candidate against SQLCipher database

Mitigation:
  - Tarn clears the derived key from its own variables on app background
  - SQLCipher's internal key state is harder to clear (library limitation)
  - iOS 18+ auto-reboot after 72 hours of inactivity forces BFU state (see below)

Assessment: VULNERABLE during active use and briefly after backgrounding.
            Mitigation reduces the window but cannot eliminate it.
```

### iOS 18 Inactivity Reboot (November 2024)

Apple introduced an "inactivity reboot" feature in iOS 18 that significantly improves forensic resistance:

- After 72 hours locked, iOS devices automatically reboot to BFU (Before First Unlock) state
- In BFU state, the device's encryption keys are not loaded into memory
- Forensic tools like GrayKey and Cellebrite have significantly reduced capabilities in BFU vs AFU (After First Unlock)
- As of November 2024, GrayKey was reportedly blocked from extracting any data from iOS 18.1 devices in BFU state
- Detroit police issued an internal memo warning that "iPhones are rebooting themselves, locking cops out"

**Impact on Tarn's threat model:**
- If a device running iOS 18+ is seized while locked and held for more than 72 hours before forensic analysis, it will reboot to BFU
- BFU state makes full filesystem extraction significantly harder or impossible with current tools
- This is a platform-level defense that benefits Tarn users on iOS without any action required
- Android does not currently have an equivalent feature (as of February 2026)

```
Assessment: iOS 18+ users gain significant additional protection from the
            inactivity reboot. Forensic labs are now under time pressure to
            analyze devices within 72 hours of seizure, or risk losing access.
```

### Scenario C: Adversary Tries PINs On-Device

```
Adversary capability:
  - Has the phone, unlocked
  - Tries PINs on Tarn's PIN screen

Tarn's state:
  - Attempt counter tracks failures
  - Threshold is set (default 7)

Attack path:
  1. Try common PINs (1234, 0000, 1111...)
  2. Counter increments on each failure
  3. At threshold: self-destruct fires

Assessment: DEFENDED. The adversary gets 6 guesses (with threshold of 7)
            before all data is irrecoverably destroyed.
            However, a sophisticated adversary will image the device first
            and attack offline (see Scenario A).
```

### Scenario D: Adversary Encounters Duress PIN

```
Adversary capability:
  - Coerces user to unlock the app

Attack path:
  1. User enters duress PIN
  2. App shows empty calendar
  3. Adversary sees an empty, functional app
  4. Adversary may conclude: no data, or freshly installed

Assessment: DEFENDED against non-technical adversaries.
            A forensic analyst who also has filesystem access could
            compare the empty UI with the existence of an encrypted
            database file of non-zero size. This inconsistency could
            reveal duress mode use. Mitigation: self-destruct the real
            data when duress PIN is entered (user-configurable option).
```

---

## Metadata Leakage

Even without decrypting data, an adversary can learn things from metadata:

| Metadata | What It Reveals | Mitigation |
|----------|----------------|------------|
| App is installed | User tracks periods privately | App icon disguise. Name "Tarn" reveals nothing. |
| Encrypted DB file exists | Data has been recorded | Post-destruct: file is deleted. Fresh install has no DB. |
| DB file size | Roughly how much data exists (more data = longer tracking history) | Could pad to fixed size. Not implemented in v1 (tracked as improvement). |
| DB file modification timestamp | When the app was last used | OS-level limitation. Cannot be fully mitigated by the app. |
| OS keystore entries (tarn_salt, tarn_attempts, etc.) | App has been set up, key material exists | Post-destruct: all entries deleted. |
| App install date | When tracking began | Cannot be controlled by the app. |
| App size in storage settings | Non-zero data usage implies use | Could pad storage. Not implemented in v1. |

### Metadata After Self-Destruct

Post-destruct, the following metadata remains:
- The app is still installed (unless the user also uninstalls)
- The app install date is unchanged
- There are no keystore entries, no database file, no cached data
- The state is indistinguishable from a fresh install, except for the install date

---

## Known Limitations

These are limitations we are aware of, have considered, and either cannot solve or have deliberately deferred:

1. **PIN entropy is low.** This is the fundamental tradeoff. PINs are fast to enter (critical for UX in dangerous situations) but have small search spaces. A future version may offer an optional passphrase mode for users who want stronger protection and are willing to type more.

2. **Flash storage wear-leveling.** Software cannot guarantee physical overwrite of specific flash blocks. The overwritten data is still encrypted, but a sufficiently advanced forensic lab could theoretically recover encrypted fragments from wear-leveled blocks.

3. **SQLCipher key clearing.** When the app backgrounds, Tarn clears the derived key from its own variables. However, SQLCipher's internal C library may retain key material in its own allocated memory. We are investigating whether SQLCipher's `sqlite3_close()` reliably zeros key memory.

4. **iOS Keychain persistence.** On iOS, keychain entries survive app uninstallation and persist until explicitly deleted. If a user uninstalls Tarn without triggering self-destruct, the salt and attempt counter remain in the keychain. Reinstalling with the same bundle ID restores access to these entries. This is an iOS platform behavior, not a Tarn design choice.

5. **No recovery.** If the user forgets their PIN, there is no recovery path. This is by design - any recovery mechanism is also an adversary's recovery mechanism. The self-destruct threshold should be set high enough (7+) to account for honest mistakes.

6. **Database file size reveals data volume.** The encrypted database file grows as entries are added. An adversary who can access the filesystem can infer roughly how much data exists from the file size, even without decrypting it. Fixed-size padding is a potential mitigation for a future version.

7. **BBT data increases decrypted data sensitivity.** Temperature tracking makes the app more useful but also makes the data inside the encrypted database more sensitive. A BBT chart with a sustained rise following a missed period is a stronger pregnancy signal than period dates alone. The encryption is identical regardless of what data types are tracked, but users should be aware that opting into BBT tracking raises the stakes of a successful decryption. The app does not warn about this explicitly during setup - a potential improvement for a future version.

8. **Symptom insights and cycle report are visible during use.** Pattern insights ("nausea logged 3 of 4 cycles") and the cycle report are computed on-demand and displayed on screen. They are not stored as separate records, but they are visible to a screen observer during active use. The cycle report requires PIN re-entry as additional protection.

9. **Phase guide reveals approximate cycle day.** The "Today" card shows the user's current cycle day and phase. A screen observer who sees "Day 27 - Luteal Phase" can infer roughly where the user is in their cycle. The collapsed card shows minimal information ("Day 27") and can be dismissed, but it's visible by default on the home screen during use.

---

## Prior Art and Real-World Cases

### Digital Evidence Used in Abortion Prosecutions

- **Nebraska (2022-2023):** Celeste Burgess (17 at the time, 24 weeks pregnant) and her mother Jessica Burgess were prosecuted after Facebook Messenger conversations about obtaining abortion medication were subpoenaed by police. Meta complied with the warrant within two days, providing over 300MB of data. The messages became the basis for additional search warrants that yielded 24GB of device data. **Outcomes:** In May 2023, Celeste Burgess (then 19) was sentenced to 90 days in jail after pleading guilty to improper disposal of human skeletal remains. Jessica Burgess pleaded guilty to providing an abortion after 20 weeks—the first such charge in Nebraska history—and faced up to five years in prison. ([NPR](https://www.npr.org/2022/08/12/1117092169/nebraska-cops-used-facebook-messages-to-investigate-an-alleged-illegal-abortion), [Rolling Stone](https://www.rollingstone.com/politics/politics-features/nebraska-teen-illegal-abortion-jail-sentence-1234792543/))

- **Mississippi (Latice Fisher):** Fisher's iPhone was voluntarily surrendered to police. Forensic extraction revealed internet searches for abortion medication. Prosecutors used this digital evidence to argue intent, even though there was no evidence she took the medication. ([Washington Post](https://www.washingtonpost.com/technology/2022/07/03/abortion-data-privacy-prosecution/))

- **Federal immigration:** Federal immigration officials have purchased data related to immigrants' menstrual cycles without a warrant in order to monitor for pregnancies. ([Center for American Progress](https://www.americanprogress.org/article/stopping-the-abuse-of-tech-in-surveilling-and-criminalizing-abortion/))

### Key Pattern

In every documented case, the evidence came from **plaintext communications or unencrypted data**: Facebook messages, Google searches, unprotected browser history. No case has involved data from an encrypted local database. This is consistent with law enforcement following the path of least resistance: subpoena the cloud provider or extract unencrypted data, don't bother cracking encryption.

Tarn eliminates the cloud provider (there is none) and encrypts the local data. An adversary must either crack the encryption (hard, especially with a 6-digit PIN) or compel the user to provide the PIN (a legal/coercive attack, not a technical one).

### Comparable Security Features in Production

- **Apple iOS:** "Erase Data after 10 failed passcode attempts" ships on every iPhone. The feature has never been the subject of legal action against Apple for obstruction or evidence destruction.
- **Signal:** Disappearing messages are used by hundreds of millions of users. Courts have addressed spoliation when users deliberately switched to Signal during an investigation, but the feature itself has never been ruled illegal.
- **GrapheneOS:** Duress PIN triggers full device wipe including eSIM. Ships in production on Pixel devices.

---

## Design Decisions and Tradeoffs

| Decision | Tradeoff | Rationale |
|----------|----------|-----------|
| Including BBT temperature tracking | More sensitive data inside encrypted blob vs. significantly better predictions | BBT + missed period is a near-certain pregnancy signal. However: (a) the data is inside the same SQLCipher database, encrypted with the same key - no new attack surface, (b) without BBT the tracker is just a calendar with math, and an app nobody uses protects nobody. The marginal increase in data sensitivity is outweighed by the increase in daily utility and adoption. |
| Including cervical mucus tracking | Additional fertility signal vs. sympto-thermal accuracy | Mucus data cross-confirms ovulation with BBT. Same tradeoff as BBT: slightly more sensitive data, substantially more useful app. Stored in the same encrypted database. |
| Cycle report behind PIN re-entry | Extra friction vs. protecting clinical summary | The cycle report is the single most sensitive view in the app - all data on one screen. Requiring PIN re-entry ensures that even if someone glimpses the calendar, accessing the full clinical summary requires re-authentication. |
| Gender-neutral language by default | No explicit "mode" for inclusivity vs. othering non-binary users | A toggle implies "normal mode" and "other mode." Instead, all language is neutral by default. This also reduces information leakage: the app reveals nothing about the user's identity to a screen observer. |
| PIN instead of passphrase | Lower entropy vs. faster entry | Users in danger need to unlock quickly. Entering a long passphrase under stress is error-prone. A future option for passphrases can be added. |
| Self-destruct overwrites then deletes | Slower than just deleting vs. more thorough | Deletion alone leaves encrypted data on disk. Overwriting is better despite wear-leveling limitations. |
| Duress PIN stored in keystore | Reveals that a duress feature exists vs. functional duress mode | An adversary who sees `tarn_duress` in the keystore knows the feature exists. But they still can't determine which PIN is real and which is duress. The alternative (no stored hash) would require a completely different architecture. |
| Default threshold of 7 | Risk of accidental destruct vs. brute force resistance | 7 gives the real user comfortable room for typos while limiting an adversary to 6 guesses. Users can adjust 5-15. |
| No biometric unlock in v1 | Less convenient vs. coercion-resistant | Biometrics can be forced (press finger to sensor, hold phone to face). PIN requires knowledge, not physical presence. Biometric unlock may be added as an opt-in with clear warnings in a future version. |
| Zero network calls, absolute | No telemetry vs. no crash reports vs. no update checks | Any network call is a metadata signal and a potential subpoena target. We accept zero observability in exchange for zero attack surface. Users check for updates manually. |
| No account, no email, no identity | Cannot contact users vs. zero identity linkage | If we don't know who our users are, no one can compel us to identify them. |
| Open source | Adversaries can read the code vs. users can verify claims | Security through obscurity is not security. Every claim in this document should be verifiable by reading the source. |

---

## How to Report Issues

If you find a security vulnerability in Tarn, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email: security@tarn.group
3. We will acknowledge within 48 hours
4. We will provide a fix timeline within 7 days
5. We will credit reporters (unless they prefer anonymity)

See [SECURITY.md](SECURITY.md) for full details.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0-draft | 2026-02-02 | Initial threat model |
| 1.1-draft | 2026-02-02 | Added BBT, cervical mucus, ovulation detection, symptom insights, cycle report, and phase guide to data sensitivity analysis. Added limitations #7-9. Updated duress mode spec. Added design tradeoffs for BBT, mucus, cycle report, and inclusive language. |
| 1.2-draft | 2026-02-04 | Updated statistics: 14 states with total bans (26M women of reproductive age), 18 states with restrictive policies. Added HIPAA Reproductive Health Rule vacatur (June 2025). Updated app data sharing stat to 71% (2025 BMC study). Added iOS 18 inactivity reboot section (72-hour auto-reboot to BFU state, GrayKey blocked on iOS 18.1). Updated Nebraska case with sentencing outcomes (90 days jail for Celeste, up to 5 years for Jessica). Noted Euki is now open source (2025). |
| 1.0 | 2026-02-14 | Public release. Finalized from draft. All documented features implemented and tested. |

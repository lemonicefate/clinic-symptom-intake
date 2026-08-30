# Verification Strategy

This strategy verifies that the system satisfies the clinical workflow and privacy goals in GitHub Issue #1. It deliberately tests observable outcomes across trust boundaries instead of treating module completion as evidence that the product works.

## Release evidence rule

A release candidate is acceptable only when every applicable gate below has reproducible evidence: an automated test result, a recorded manual check, or an approved clinical review. A passing build alone is not sufficient.

## Goal-backward acceptance matrix

| Goal | Required evidence |
| --- | --- |
| Every response belongs to the intended visit | End-to-end tests create, submit, pull, reassign, and complete sessions while asserting the same `lookupId`, `submissionId`, `clinicDayId`, and patient-visible state at each boundary. Pilot reconciliation finds zero patient-to-session mismatches. |
| The cloud cannot identify a patient or read clinical content | Relay storage inspection contains only opaque identifiers, expiry/state metadata, hashes, and ciphertext. Cryptographic test vectors prove that the relay cannot decrypt without the QR root secret. Logs contain no answers, names, chart numbers, QR URLs, root secrets, or bearer credentials. |
| Concurrent edits cannot silently overwrite a newer response | Race tests cover patient submit versus physician freeze, repeated submit, lost acknowledgements, duplicate pull, cancel versus pull, and reassign versus physician open. Stale `revision`, `sessionVersion`, or `clinicDayId` operations are rejected deterministically. |
| Chart drafts are deterministic and clinically reviewable | Golden tests pin a clinical content release and compare identical answers to identical CC/HPI output. A physician reviews each supported symptom template before that release can be activated. |
| Only authorized staff can perform each action | Unit and browser tests exercise every cell in the role matrix. Negative tests prove receptionists and administrators cannot read clinical content, and physicians cannot read unassigned sessions. Password reset, account disable, and role change revoke existing sessions. |
| Intake data is gone after the clinic day | Controlled clock tests expire relay records at 00:00 Asia/Taipei and complete local cleanup at 00:05. Verification checks the database, WAL, temporary files, application logs, and daily encryption key. A failed cleanup blocks creation of the next clinic day. |
| Failures degrade to the clinic's manual workflow | Tests simulate relay unavailability, Free-plan quota exhaustion, host restart, WSL restart, and local database loss. Staff receive an actionable status and can continue consultation without the intake service. |
| Patients and staff can complete the workflow comfortably | Personal-phone browser checks cover current iOS Safari and Android Chrome, Traditional Chinese content, keyboard-only use, screen-reader labels, focus order, and contrast. The shared-tablet flow is not a first-pilot release gate. |
| The dedicated host is safely reachable only where intended | On the actual Windows 11 host, allowed staff IPs reach HTTPS, an unlisted wired device is denied, and a patient Wi-Fi device is denied. Restart testing proves Windows starts WSL and the app without an interactive login. |

## Test layers

### Module tests

- Domain state machine: legal transitions, terminal states, fixed expiry, locked tombstones.
- Clinical content: schema validation, immutable version selection, deterministic question and document generation.
- Cryptography: HKDF derivation, canonical JSON, AES-GCM authenticated data, authentication verifier, management request signing, and constant-time comparisons.
- Authorization: role permissions, assignment filtering, session expiry, and revocation.
- Logging: field allowlist rejects content-bearing or credential-bearing fields.

Cryptographic tests must include fixed, language-independent vectors for every derived key, verifier, authenticated-data byte sequence, ciphertext envelope, digest, and management signature. Browser, Worker, and local gateway implementations must produce the same vectors.

### Contract tests

Run the same relay protocol suite against the in-memory adapter and the deployed Worker adapter. It must cover:

- idempotent create and submit operations;
- valid and invalid patient authentication;
- batch pull ordering and pagination;
- conditional acknowledgement, rejection, freeze, and revoke;
- current and previous protocol-version compatibility;
- expiry, locked tombstones, replay rejection, and rate limiting;
- management-key rotation with active and previous keys.

### Integration tests

Use real SQLite databases and a relay test instance to verify the complete gateway outbox/inbox loop. Inject a crash or network loss at each durable boundary:

| Interruption point | Expected recovery |
| --- | --- |
| Before local transaction commit | No local state change and no acknowledgement. |
| After commit, before relay acknowledgement | Retry observes the committed version and sends the same conditional acknowledgement. |
| After relay accepts acknowledgement, before the response arrives | Retry is idempotent and cannot advance state twice. |
| During local cleanup | Cleanup resumes safely; the next clinic day remains blocked until verification succeeds. |

### End-to-end browser tests

Automate the primary personal-phone journey:

1. Receptionist creates a session and displays its QR code.
2. Patient scans, loads the pinned questionnaire, submits, edits, and sees the current status.
3. The assigned physician sees the update within 15 seconds, freezes the response, and generates CC/HPI.
4. A later patient edit is rejected with an understandable message.
5. Copying does not complete the session; explicit physician confirmation does.
6. A receptionist cannot open the clinical response, and another physician cannot open it before reassignment.

Repeat the journey under delayed, duplicated, reordered, and temporarily unavailable network responses.

### Security and privacy tests

- Attempt ciphertext substitution across clinic, session, revision, content version, and expiry; AES-GCM verification must fail.
- Attempt request replay, clock-skew abuse, body substitution, and use of an unknown management key ID.
- Inspect Worker storage, SQLite files, browser storage, HTTP traces, application logs, crash artifacts, and Windows clipboard history after the workflow.
- Confirm the QR root secret remains in the URL fragment and is absent from HTTP requests and referrer headers.
- Confirm local TLS certificate validation and deny-by-default Windows Firewall behavior.
- Document the accepted limitation: an attacker controlling the live clinic host or patient browser can access plaintext while it is in use.

## Capacity and performance checks

The pilot load model is 50 visits per clinic day, up to five patient revisions per visit, and dashboard polling no more often than every 10 seconds. Test at twice that model for headroom while separately confirming the actual Cloudflare Workers Free-plan limits before pilot release.

| Measure | Gate |
| --- | --- |
| Questionnaire interactive time on clinic Wi-Fi | under 3 seconds at p95 |
| Patient submit acknowledgement | under 3 seconds at p95 |
| Dashboard update visibility | within 15 seconds |
| Physician freeze | under 5 seconds |
| Render 50 dashboard rows | under 1 second on the clinic workstation |
| Midnight cleanup | under 60 seconds |

Performance evidence must identify the device, browser, network path, build, and dataset used.

## Deployment and recovery checks

Before each pilot release on the dedicated host:

- verify BitLocker or Device Encryption is active;
- verify Caddy terminates HTTPS on Windows and proxies only to the intended WSL port;
- verify the WSL service binds only to the host-facing loopback path, not the LAN interface;
- verify Windows Scheduled Task starts WSL and systemd starts the containers after reboot;
- verify the deployed local and relay protocol versions are compatible;
- verify the previous application image and previous relay protocol remain usable for rollback;
- perform a configuration-only restore rehearsal without restoring patient intake data.

## Pilot release gates

The first pilot remains limited to personal patient phones and a small physician cohort. It may begin only when:

- all automated unit, contract, integration, end-to-end, security, and performance gates pass;
- the clinic-day cleanup has passed a controlled midnight rehearsal;
- the Windows network allowlist and patient Wi-Fi denial have been demonstrated on site;
- a physician has approved every activated clinical content release;
- the manual fallback has been rehearsed with staff;
- operational documentation identifies how to disable intake immediately without affecting HIS;
- no known defect can cause patient/session mismatch, unauthorized disclosure, or silent loss of a newer response.

The shared-tablet journey requires a separate managed-kiosk decision and privacy verification before it can enter a later pilot.

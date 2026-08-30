# Foundation Verification

This document records the reproducible evidence for GitHub Issue #2. Every value and fixture in this slice is synthetic and cannot identify a patient, staff member, clinic network, or production system.

## Automated gate

Run from the repository root:

```text
pnpm verify
```

This single command type-checks the strict contracts, runs all Foundation tests, and builds the ESM package plus declarations. Tests cover relay-boundary rejection, Public Token derivation, AES-GCM authenticated envelopes, conditional digest binding, management HMAC signing, metadata tampering, and the encrypted opaque-relay round trip.

## Real-browser gate

Run:

```text
pnpm browser:vectors
```

Open the printed `127.0.0.1` URL. The accessible status output must read `PASS`, the document status must be `pass`, and the browser console must contain no error. The page imports only the built dependency-free byte, SHA-256, HKDF, and Public Token modules.

## Independent vectors

The literal known-answer values were produced independently with Python 3.10.6 and `cryptography` 41.0.4. They cover the HKDF salt and three domain-separated keys, patient verifier, canonical AAD, AES-GCM ciphertext and tag, response digest, canonical management body, body hash, signing input, and HMAC signature.

## Relay storage inspection

The relay fixture snapshot allows only strict Response Envelope rows and operational events containing event name, `lookupId`, and revision. Its test asserts the snapshot contains no Patient Answer plaintext, identity field, root secret, or patient authentication key.

This Foundation slice contains no CI workflow, deployment configuration, real patient data, production credential, QR URL, or clinic network value.

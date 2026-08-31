# Foundation Encrypted Round Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satisfy Issue #2 by proving a fixed synthetic Patient Answer crosses the browser-compatible encryption, opaque relay, signed clinic retrieval, and local validation boundary without exposing plaintext or identity.

**Architecture:** Create one small `@clinic-symptom-intake/contracts` package inside a pnpm workspace. Runtime schemas and RFC 8785 canonicalization form the wire boundary; dependency-free Web Crypto primitives form the browser/Node seam; a test-only relay fixture proves storage opacity and round-trip behavior. Python `cryptography` output recorded below is the independent source for fixed known-answer vectors.

**Tech Stack:** Node.js 22, pnpm 11, TypeScript 7, Zod 4, `canonicalize` 4, Vitest 4, Web Crypto API.

**Spec:** `docs/technical-architecture.md`, `docs/verification-strategy.md`, and GitHub Issue #2.

## Global Constraints

- Use TypeScript and ESM throughout; production crypto code may use Web Crypto, `TextEncoder`, and `TextDecoder`, but no Node-only crypto or buffer API.
- Version 1 uses HKDF-SHA-256, AES-256-GCM with a 96-bit nonce and 128-bit tag, RFC 8785 canonical JSON, and HMAC-SHA-256 exactly as specified in `docs/technical-architecture.md`.
- Relay-facing schemas are strict and cannot contain patient name, medical record number, queue number, Assigned Physician, plaintext Patient Answer, or credentials.
- All examples and fixtures are visibly synthetic. Do not add PHI, production credentials, QR URLs, or clinic network details.
- Do not create CI configuration, application UI, Cloudflare deployment, Fastify server, or persistent database in this slice.
- Run every behavior through RED, GREEN, and full-suite verification before its commit.

---

## File map

| File | Responsibility |
| --- | --- |
| `package.json` | Root pnpm commands and package-manager pin |
| `pnpm-workspace.yaml` | Workspace membership |
| `tsconfig.base.json` | Strict browser-compatible TypeScript defaults |
| `.gitignore` | Platform-specific dependencies, build output, and swap temporaries |
| `scripts/write-platform-marker.mjs` | Record the active Windows or Linux dependency slot after install |
| `scripts/sync-platform.mjs` | Reversibly swap `node_modules.win` and `node_modules.linux` before future dev runs |
| `packages/contracts/package.json` | Contracts package dependencies and commands |
| `packages/contracts/tsconfig.json` | Type-check configuration |
| `packages/contracts/tsconfig.build.json` | ESM/declaration build configuration |
| `packages/contracts/src/contracts.ts` | Strict Patient Answer, metadata, and relay-envelope schemas |
| `packages/contracts/src/bytes.ts` | Byte, hex, base64url, and uint32 helpers |
| `packages/contracts/src/canonical-json.ts` | RFC 8785 UTF-8 wrapper |
| `packages/contracts/src/crypto-primitives.ts` | Web Crypto SHA, HKDF, AES-GCM, and HMAC primitives |
| `packages/contracts/src/public-token.ts` | Domain-separated Public Token key derivation and verifier |
| `packages/contracts/src/response-envelope.ts` | Validated canonical encryption, digest, and decryption |
| `packages/contracts/src/management-auth.ts` | Exact management signing bytes and signature |
| `packages/contracts/src/index.ts` | Deliberate public package surface |
| `packages/contracts/test/fixtures/crypto-v1.ts` | Independent fixed synthetic known-answer values |
| `packages/contracts/test/opaque-relay-fixture.ts` | Test-only identity-free relay storage adapter |
| `packages/contracts/test/*.test.ts` | Observable contract and round-trip tests |
| `packages/contracts/test/browser-vectors.html` | Human-visible real-browser vector result |
| `packages/contracts/test/browser-vectors.mjs` | Browser runner for dependency-free crypto primitives |
| `packages/contracts/scripts/serve-browser-vectors.mjs` | Local static server for manual browser verification |
| `docs/foundation-verification.md` | Reproducible Foundation commands and evidence rules |

### Task 1: Establish the workspace and strict wire schemas

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `scripts/write-platform-marker.mjs`
- Create: `scripts/sync-platform.mjs`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/tsconfig.build.json`
- Create: `packages/contracts/test/contracts.test.ts`
- Create: `packages/contracts/src/contracts.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `pnpm-lock.yaml` through the approved install command

**Interfaces:**
- Consumes: the wire field names in `docs/technical-architecture.md`.
- Produces: `PatientAnswer`, `ResponseMetadata`, `RelayEnvelope`, their Zod schemas, and `PROTOCOL_VERSION = 1`.

- [ ] **Step 1: Create only the workspace configuration**

Root `package.json`:

```json
{
  "name": "clinic-symptom-intake",
  "private": true,
  "packageManager": "pnpm@11.19.0",
  "scripts": {
    "build": "pnpm --filter @clinic-symptom-intake/contracts build",
    "platform:sync": "node scripts/sync-platform.mjs",
    "postinstall": "node scripts/write-platform-marker.mjs",
    "test": "pnpm --filter @clinic-symptom-intake/contracts test",
    "typecheck": "pnpm --filter @clinic-symptom-intake/contracts typecheck",
    "verify": "pnpm typecheck && pnpm test && pnpm build"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
```

`.gitignore`:

```gitignore
node_modules
node_modules.win
node_modules.linux
.node_modules.swap-*
*.tsbuildinfo
packages/*/dist
```

`write-platform-marker.mjs` maps only `win32` to `win` and `linux` to `linux`, rejects every other platform, then writes that value plus LF to `node_modules/.platform`.

`sync-platform.mjs` resolves every path from the repository root and performs rename-only swaps. It must:

1. return immediately when active `node_modules/.platform` matches the current platform;
2. restore `node_modules.<current>` when active `node_modules` is absent;
3. when active belongs to the other platform, move it to `node_modules.<other>` and restore `node_modules.<current>` if available;
4. if no current-platform cache exists, leave the other platform safely cached and exit nonzero with the instruction to run `pnpm install` once;
5. reject a missing/unknown marker, an occupied destination, or a pre-existing `.node_modules.swap-*` path instead of deleting or overwriting anything.

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true
  }
}
```

Package `package.json`:

```json
{
  "name": "@clinic-symptom-intake/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "canonicalize": "4.0.0",
    "zod": "4.5.4"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vitest": "4.1.11"
  }
}
```

`tsconfig.json` extends the root config, sets `noEmit: true`, and includes `src/**/*.ts` plus `test/**/*.ts`. `tsconfig.build.json` extends it, sets `noEmit: false`, `declaration: true`, `rootDir: src`, `outDir: dist`, and includes only `src/**/*.ts`.

- [ ] **Step 2: Install the approved exact dependencies**

Run: `pnpm install`

Expected: exit 0, a new `pnpm-lock.yaml`, and no lifecycle script warning or package requiring a different Node version.

- [ ] **Step 3: Write the failing strict-schema tests**

```typescript
import { describe, expect, test } from 'vitest';
import {
  patientAnswerSchema,
  relayEnvelopeSchema,
  responseMetadataSchema,
} from '../src/contracts.js';

const syntheticAnswer = {
  answerVersion: 1,
  symptoms: [{
    symptomId: 'ear.pain',
    laterality: 'left',
    duration: { value: 2, unit: 'day' },
    severity: 4,
  }],
};

test('accepts the fixed synthetic Patient Answer shape', () => {
  expect(patientAnswerSchema.parse(syntheticAnswer)).toEqual(syntheticAnswer);
});

describe('relay boundary', () => {
  test.each(['patientName', 'medicalRecordNumber', 'queueNumber', 'assignedPhysician'])(
    'rejects identity field %s from metadata',
    (field) => {
      const result = responseMetadataSchema.safeParse({
        protocolVersion: 1,
        clinicRelayId: 'clinic-test-01',
        lookupId: 'UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A',
        contentVersion: 'ent.synthetic.v1',
        submissionId: '00000000-0000-4000-8000-000000000001',
        revision: 1,
        expiresAt: 1893427200,
        [field]: 'synthetic-forbidden-value',
      });
      expect(result.success).toBe(false);
    },
  );

  test('rejects plaintext alongside an encrypted relay envelope', () => {
    const result = relayEnvelopeSchema.safeParse({
      metadata: {
        protocolVersion: 1,
        clinicRelayId: 'clinic-test-01',
        lookupId: 'UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A',
        contentVersion: 'ent.synthetic.v1',
        submissionId: '00000000-0000-4000-8000-000000000001',
        revision: 1,
        expiresAt: 1893427200,
      },
      nonce: 'oKGio6Slpqeoqaqr',
      ciphertext: 'AA',
      digest: 'AA',
      patientAnswer: syntheticAnswer,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run RED and confirm the missing module is the reason**

Run: `pnpm test -- contracts.test.ts`

Expected: FAIL because `../src/contracts.js` does not exist. A syntax, configuration, or dependency-resolution error is not the expected RED and must be fixed before proceeding.

- [ ] **Step 5: Implement the minimal strict schemas**

Use `z.strictObject` for every object. Define:

```typescript
export const PROTOCOL_VERSION = 1 as const;

const base64url = z.string().regex(/^[A-Za-z0-9_-]+$/);
const identifier = z.string().min(1).max(128);

export const durationSchema = z.strictObject({
  value: z.number().positive().finite(),
  unit: z.enum(['hour', 'day', 'week', 'month', 'year']),
});

export const symptomAnswerSchema = z.strictObject({
  symptomId: identifier,
  laterality: z.enum(['left', 'right', 'bilateral']).optional(),
  duration: durationSchema,
  severity: z.number().int().min(1).max(10),
});

export const patientAnswerSchema = z.strictObject({
  answerVersion: z.literal(1),
  symptoms: z.array(symptomAnswerSchema).min(1).max(20),
  otherText: z.string().max(2000).optional(),
});

export const responseMetadataSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  clinicRelayId: identifier,
  lookupId: base64url,
  contentVersion: identifier,
  submissionId: z.uuid(),
  revision: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export const relayEnvelopeSchema = z.strictObject({
  metadata: responseMetadataSchema,
  nonce: base64url,
  ciphertext: base64url,
  digest: base64url,
});
```

Export inferred readonly-facing types with `z.infer` and export the schemas from `src/index.ts`.

- [ ] **Step 6: Run GREEN, type-check, and commit**

Run: `pnpm test -- contracts.test.ts && pnpm typecheck`

Expected: all schema tests pass and TypeScript exits 0.

Commit:

```bash
git add .gitignore package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json scripts/write-platform-marker.mjs scripts/sync-platform.mjs packages/contracts/package.json packages/contracts/tsconfig.json packages/contracts/tsconfig.build.json packages/contracts/src/contracts.ts packages/contracts/src/index.ts packages/contracts/test/contracts.test.ts
git commit -m "feat: establish strict intake contracts"
```

### Task 2: Prove Public Token derivation against fixed vectors

**Files:**
- Create: `packages/contracts/src/bytes.ts`
- Create: `packages/contracts/src/canonical-json.ts`
- Create: `packages/contracts/src/crypto-primitives.ts`
- Create: `packages/contracts/src/public-token.ts`
- Create: `packages/contracts/test/fixtures/crypto-v1.ts`
- Create: `packages/contracts/test/public-token.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: a 32-byte root secret and identity-free `clinicRelayId`.
- Produces: `derivePublicTokenKeys(rootSecret, clinicRelayId)` and `createPatientVerifier(patientAuthKey)`.

- [ ] **Step 1: Record the independent synthetic vector fixture**

The fixture must label itself `SYNTHETIC_CRYPTO_V1` and contain these exact literal values derived independently with Python `cryptography 41.0.4`:

```typescript
export const SYNTHETIC_CRYPTO_V1 = {
  clinicRelayId: 'clinic-test-01',
  rootSecretHex: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  saltHex: 'e7626db2d7719d6d53439b7debe1c678dca3637e28c438583cc19ffbfcd0c654',
  lookupKeyHex: '5060898974f84a18cc84c89818d4c4b88bb7137a25e4a273118b29db1574d7f0',
  patientAuthKeyHex: '64e4da2b3b06851cbf9956555da82d61e09d46194d4bfb28db96b707099fa455',
  payloadKeyHex: '9afb9a6ec325224d696556687ee47ebf6c4b6120e5b8a8ad839e9d04d68f3998',
  lookupId: 'UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A',
  patientVerifierHex: '5e40b4ce2fdc71552a8b4368f14b6f9b95d1b715640348a4ab1455d3da6d99b5',
} as const;
```

- [ ] **Step 2: Write the failing derivation test**

```typescript
test('derives all version 1 Public Token keys from the independent vector', async () => {
  const root = fromHex(SYNTHETIC_CRYPTO_V1.rootSecretHex);
  const keys = await derivePublicTokenKeys(root, SYNTHETIC_CRYPTO_V1.clinicRelayId);

  expect(toHex(keys.salt)).toBe(SYNTHETIC_CRYPTO_V1.saltHex);
  expect(toHex(keys.lookupKey)).toBe(SYNTHETIC_CRYPTO_V1.lookupKeyHex);
  expect(toHex(keys.patientAuthKey)).toBe(SYNTHETIC_CRYPTO_V1.patientAuthKeyHex);
  expect(toHex(keys.payloadKey)).toBe(SYNTHETIC_CRYPTO_V1.payloadKeyHex);
  expect(keys.lookupId).toBe(SYNTHETIC_CRYPTO_V1.lookupId);
  expect(toHex(await createPatientVerifier(keys.patientAuthKey)))
    .toBe(SYNTHETIC_CRYPTO_V1.patientVerifierHex);
});

test('rejects a root secret that is not exactly 32 bytes', async () => {
  await expect(derivePublicTokenKeys(new Uint8Array(31), 'clinic-test-01'))
    .rejects.toThrow('root secret must be exactly 32 bytes');
});
```

- [ ] **Step 3: Run RED**

Run: `pnpm test -- public-token.test.ts`

Expected: FAIL because the byte helpers and derivation functions do not exist.

- [ ] **Step 4: Implement browser-compatible byte and Web Crypto primitives**

`bytes.ts` must implement literal `fromHex`, `toHex`, `toBase64url`, `fromBase64url`, `concatBytes`, `uint32be`, and `toArrayBuffer` functions without `Buffer`.

`crypto-primitives.ts` must implement:

```typescript
export async function sha256(input: Uint8Array): Promise<Uint8Array>;
export async function hkdfSha256(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  lengthBytes: number,
): Promise<Uint8Array>;
export async function aesGcmEncrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array>;
export async function aesGcmDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array>;
export async function hmacSha256(
  key: Uint8Array,
  input: Uint8Array,
): Promise<Uint8Array>;
```

Every `SubtleCrypto` input must use a copied `ArrayBuffer` from `toArrayBuffer`, preserving compatibility with TypeScript's strict `BufferSource` types.

`canonical-json.ts` wraps the official `canonicalize` package:

```typescript
export function canonicalJsonBytes(value: unknown): Uint8Array {
  const result = canonicalize(value);
  if (result === undefined) throw new TypeError('value is not canonical JSON');
  return new TextEncoder().encode(result);
}
```

- [ ] **Step 5: Implement domain-separated derivation**

`public-token.ts` must calculate salt from UTF-8 `clinic-symptom-intake/v1\u0000${clinicRelayId}`, then derive three 32-byte values using these exact info strings:

```text
clinic-symptom-intake/v1/lookup
clinic-symptom-intake/v1/patient-auth
clinic-symptom-intake/v1/payload-aead
```

Return the raw keys plus base64url-without-padding `lookupId`. The patient verifier is SHA-256 of `patientAuthKey`.

- [ ] **Step 6: Run GREEN and commit**

Run: `pnpm test -- public-token.test.ts && pnpm typecheck`

Expected: both tests pass and type-check exits 0.

Commit:

```bash
git add packages/contracts/src/bytes.ts packages/contracts/src/canonical-json.ts packages/contracts/src/crypto-primitives.ts packages/contracts/src/public-token.ts packages/contracts/src/index.ts packages/contracts/test/fixtures/crypto-v1.ts packages/contracts/test/public-token.test.ts
git commit -m "feat: derive public token keys"
```

### Task 3: Seal, digest, and open a Response Revision

**Files:**
- Create: `packages/contracts/src/response-envelope.ts`
- Create: `packages/contracts/test/response-envelope.test.ts`
- Modify: `packages/contracts/test/fixtures/crypto-v1.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: validated `PatientAnswer`, `ResponseMetadata`, and 32-byte payload key.
- Produces: `sealPatientAnswer`, internal deterministic `sealPatientAnswerWithNonce`, `openPatientAnswer`, and `computeEnvelopeDigest`.

- [ ] **Step 1: Extend the fixture with exact envelope values**

```typescript
metadata: {
  protocolVersion: 1,
  clinicRelayId: 'clinic-test-01',
  lookupId: 'UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A',
  contentVersion: 'ent.synthetic.v1',
  submissionId: '00000000-0000-4000-8000-000000000001',
  revision: 1,
  expiresAt: 1893427200,
},
patientAnswer: {
  answerVersion: 1,
  symptoms: [{
    symptomId: 'ear.pain',
    laterality: 'left',
    duration: { value: 2, unit: 'day' },
    severity: 4,
  }],
},
plaintextUtf8: '{"answerVersion":1,"symptoms":[{"duration":{"unit":"day","value":2},"laterality":"left","severity":4,"symptomId":"ear.pain"}]}',
canonicalAadUtf8: '{"clinicRelayId":"clinic-test-01","contentVersion":"ent.synthetic.v1","expiresAt":1893427200,"lookupId":"UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A","protocolVersion":1,"revision":1,"submissionId":"00000000-0000-4000-8000-000000000001"}',
nonceBase64url: 'oKGio6Slpqeoqaqr',
ciphertextBase64url: 'sTp8VK4BCT7Bnl7FJiPVvd68IPkYvGQeQFHCSETsdhl-sCzdSdLA5-Y6vuc2dpPCm2mLwMvrIkv-zkmvS1S8FjDkWFatylV62hIGY4farEIbK9k3Akj3w-4JXtjtqHkjclcg3LBZRogExIeg5rPwmMf0hJg-61oZzoKcVQczhoW3EzvIW9tjinYo3M8hBA',
digestBase64url: 'iDdi4wUwUq_TdnV6WwuM86jn6X1bXXysTUn6qMp-OlM',
```

- [ ] **Step 2: Write failing known-answer, round-trip, and tamper tests**

The tests must assert:

```typescript
test('matches the independent AES-GCM envelope and digest', async () => {
  const envelope = await sealPatientAnswerWithNonce(
    fromHex(SYNTHETIC_CRYPTO_V1.payloadKeyHex),
    SYNTHETIC_CRYPTO_V1.metadata,
    SYNTHETIC_CRYPTO_V1.patientAnswer,
    fromBase64url(SYNTHETIC_CRYPTO_V1.nonceBase64url),
  );
  expect(envelope.nonce).toBe(SYNTHETIC_CRYPTO_V1.nonceBase64url);
  expect(envelope.ciphertext).toBe(SYNTHETIC_CRYPTO_V1.ciphertextBase64url);
  expect(envelope.digest).toBe(SYNTHETIC_CRYPTO_V1.digestBase64url);
});

test('round trips a validated Patient Answer with a fresh nonce', async () => {
  const key = fromHex(SYNTHETIC_CRYPTO_V1.payloadKeyHex);
  const envelope = await sealPatientAnswer(
    key,
    SYNTHETIC_CRYPTO_V1.metadata,
    SYNTHETIC_CRYPTO_V1.patientAnswer,
  );
  await expect(openPatientAnswer(key, envelope))
    .resolves.toEqual(SYNTHETIC_CRYPTO_V1.patientAnswer);
});

test('rejects metadata substitution', async () => {
  const key = fromHex(SYNTHETIC_CRYPTO_V1.payloadKeyHex);
  const envelope = await sealPatientAnswerWithNonce(
    key,
    SYNTHETIC_CRYPTO_V1.metadata,
    SYNTHETIC_CRYPTO_V1.patientAnswer,
    fromBase64url(SYNTHETIC_CRYPTO_V1.nonceBase64url),
  );
  const changed = {
    ...envelope,
    metadata: { ...envelope.metadata, revision: 2 },
  };
  await expect(openPatientAnswer(key, changed)).rejects.toThrow();
});
```

- [ ] **Step 3: Run RED**

Run: `pnpm test -- response-envelope.test.ts`

Expected: FAIL because response-envelope functions do not exist.

- [ ] **Step 4: Implement the exact envelope algorithm**

Implementation order:

1. Parse metadata and Patient Answer through their strict schemas.
2. RFC 8785 canonicalize both values to UTF-8 bytes.
3. Encrypt plaintext with AES-256-GCM, the 12-byte nonce, and canonical metadata as AAD.
4. Calculate `SHA-256(uint32be(AAD.length) || AAD || nonce || ciphertext)`.
5. Encode nonce, ciphertext-with-tag, and digest as base64url without padding.
6. For open, parse the strict envelope, recompute and constant-time compare the digest, decrypt, decode JSON, and parse Patient Answer again.

`sealPatientAnswer` obtains exactly 12 bytes using `crypto.getRandomValues`. `sealPatientAnswerWithNonce` validates the provided nonce and is exported only from its source module for vector tests, not from package `index.ts`.

- [ ] **Step 5: Run GREEN, full tests, and commit**

Run: `pnpm test -- response-envelope.test.ts && pnpm test && pnpm typecheck`

Expected: all tests pass and TypeScript exits 0.

Commit:

```bash
git add packages/contracts/src/response-envelope.ts packages/contracts/src/index.ts packages/contracts/test/fixtures/crypto-v1.ts packages/contracts/test/response-envelope.test.ts
git commit -m "feat: seal response envelopes"
```

### Task 4: Sign clinic management requests and prove opaque relay retrieval

**Files:**
- Create: `packages/contracts/src/management-auth.ts`
- Create: `packages/contracts/test/management-auth.test.ts`
- Create: `packages/contracts/test/opaque-relay-fixture.ts`
- Create: `packages/contracts/test/encrypted-round-trip.test.ts`
- Modify: `packages/contracts/test/fixtures/crypto-v1.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: a management key, key ID, fixed POST path, timestamp, nonce, and canonical JSON body.
- Produces: `signManagementRequest` and one test-only relay with `store`, `pull`, and `snapshot` operations.

- [ ] **Step 1: Add exact management fixture values**

```typescript
managementKeyId: 'synthetic-key-01',
managementKeyHex: '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
managementPath: '/v1/management/pull',
managementTimestamp: 1893423600,
managementNonceBase64url: '8PHy8_T19vf4-fr7_P3-_w',
managementBody: { clinicRelayId: 'clinic-test-01', limit: 100 },
managementBodyUtf8: '{"clinicRelayId":"clinic-test-01","limit":100}',
managementBodySha256Hex: '86d2e9c200dedec71dae613b15748ff2bd2ef35b8f157946152dfd585cd5b6ba',
managementSigningInputUtf8: 'POST\n/v1/management/pull\n1893423600\n8PHy8_T19vf4-fr7_P3-_w\n86d2e9c200dedec71dae613b15748ff2bd2ef35b8f157946152dfd585cd5b6ba',
managementSignatureBase64url: 'rngVEMb-qOoV8SKdrd7A6KMOqi-6esCiVV3dNPSEkdQ',
```

- [ ] **Step 2: Write the failing management signature test**

```typescript
test('matches the independent management signature vector', async () => {
  const result = await signManagementRequest({
    keyId: SYNTHETIC_CRYPTO_V1.managementKeyId,
    key: fromHex(SYNTHETIC_CRYPTO_V1.managementKeyHex),
    method: 'POST',
    path: SYNTHETIC_CRYPTO_V1.managementPath,
    timestamp: SYNTHETIC_CRYPTO_V1.managementTimestamp,
    nonce: SYNTHETIC_CRYPTO_V1.managementNonceBase64url,
    body: SYNTHETIC_CRYPTO_V1.managementBody,
  });
  expect(result.body).toBe(SYNTHETIC_CRYPTO_V1.managementBodyUtf8);
  expect(result.bodySha256).toBe(SYNTHETIC_CRYPTO_V1.managementBodySha256Hex);
  expect(result.signingInput).toBe(SYNTHETIC_CRYPTO_V1.managementSigningInputUtf8);
  expect(result.signature).toBe(SYNTHETIC_CRYPTO_V1.managementSignatureBase64url);
});

test.each(['GET', '/v1/management/pull?limit=100', '../pull'])(
  'rejects a noncanonical method or path: %s',
  async (value) => {
    const input = {
      keyId: 'synthetic-key-01',
      key: new Uint8Array(32),
      method: value === 'GET' ? value : 'POST',
      path: value === 'GET' ? '/v1/management/pull' : value,
      timestamp: 1893423600,
      nonce: '8PHy8_T19vf4-fr7_P3-_w',
      body: {},
    };
    await expect(signManagementRequest(input)).rejects.toThrow();
  },
);
```

- [ ] **Step 3: Run management RED, implement, and run GREEN**

Run RED: `pnpm test -- management-auth.test.ts`

Expected: FAIL because `signManagementRequest` does not exist.

Implementation must accept only method `POST`, an ASCII path matching `^/v1/management/[a-z-]+$`, a positive integer decimal timestamp, a base64url nonce decoding to exactly 16 bytes, and an RFC 8785 canonical JSON body. It returns body text, lowercase hex body hash, the exact LF-delimited signing input, key ID, nonce, timestamp, and base64url HMAC signature.

Run GREEN: `pnpm test -- management-auth.test.ts && pnpm typecheck`

- [ ] **Step 4: Write the failing real round-trip test**

The test-only `OpaqueRelayFixture` stores a strict `RelayEnvelope` by `lookupId`, returns a structured clone on pull, and emits only `{ event, lookupId, revision }` events.

```typescript
test('stores only ciphertext and returns the original validated Patient Answer', async () => {
  const root = fromHex(SYNTHETIC_CRYPTO_V1.rootSecretHex);
  const keys = await derivePublicTokenKeys(root, SYNTHETIC_CRYPTO_V1.clinicRelayId);
  const envelope = await sealPatientAnswer(
    keys.payloadKey,
    SYNTHETIC_CRYPTO_V1.metadata,
    SYNTHETIC_CRYPTO_V1.patientAnswer,
  );
  const relay = new OpaqueRelayFixture();
  relay.store(envelope);

  const serialized = JSON.stringify(relay.snapshot());
  expect(serialized).not.toContain('ear.pain');
  expect(serialized).not.toContain('patientName');
  expect(serialized).not.toContain(SYNTHETIC_CRYPTO_V1.rootSecretHex);
  expect(serialized).not.toContain(SYNTHETIC_CRYPTO_V1.patientAuthKeyHex);

  const pulled = relay.pull(SYNTHETIC_CRYPTO_V1.lookupId);
  await expect(openPatientAnswer(keys.payloadKey, pulled))
    .resolves.toEqual(SYNTHETIC_CRYPTO_V1.patientAnswer);
});
```

- [ ] **Step 5: Run round-trip RED, implement the fixture, then run full GREEN**

Run RED: `pnpm test -- encrypted-round-trip.test.ts`

Expected: FAIL because `OpaqueRelayFixture` does not exist.

After the minimal fixture is implemented, run: `pnpm test && pnpm typecheck && pnpm build`

Expected: all tests pass, type-check exits 0, and the package builds declarations plus ESM without warning.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/management-auth.ts packages/contracts/src/index.ts packages/contracts/test/fixtures/crypto-v1.ts packages/contracts/test/management-auth.test.ts packages/contracts/test/opaque-relay-fixture.ts packages/contracts/test/encrypted-round-trip.test.ts
git commit -m "feat: prove encrypted relay round trip"
```

### Task 5: Run the dependency-free primitives in a real browser and document verification

**Files:**
- Create: `packages/contracts/test/browser-vectors.html`
- Create: `packages/contracts/test/browser-vectors.mjs`
- Create: `packages/contracts/scripts/serve-browser-vectors.mjs`
- Create: `docs/foundation-verification.md`
- Modify: `packages/contracts/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: built dependency-free `bytes.js`, `crypto-primitives.js`, and `public-token.js` modules.
- Produces: a local browser page whose accessible output is exactly `PASS` or a visible failure, plus reproducible Foundation verification commands.

- [ ] **Step 1: Add the browser harness**

`browser-vectors.mjs` imports only built dependency-free modules, derives keys from the fixed synthetic root, compares all key outputs and the verifier to literal vector values, and returns `{ ok: true }` only when every comparison succeeds.

`browser-vectors.html` calls that function and writes `PASS` to `<output id="result" role="status">`; on error it writes `FAIL: ${error.message}` and sets `document.documentElement.dataset.status = 'fail'`.

The static server uses Node built-in `http`, serves only files inside `packages/contracts`, binds `127.0.0.1`, sets `Cache-Control: no-store`, and prints exactly one local URL. Add package script `browser:vectors` that builds then starts this server, and root script forwarding to it.

- [ ] **Step 2: Build and visually verify in a real browser**

Run: `pnpm browser:vectors`

Open the printed local URL in the Codex browser. Expected visible result: `PASS`, browser console has no error, and page source does not contain Patient Answer plaintext or any non-synthetic credential.

Stop the local server after recording the result.

- [ ] **Step 3: Document exact verification and privacy evidence**

`docs/foundation-verification.md` must state:

- Issue #2 scope and that every fixture is synthetic;
- `pnpm verify` is the single automated Foundation command;
- `pnpm browser:vectors` is the manual real-browser known-answer check;
- the exact independent Python version (`3.10.6`) and `cryptography` version (`41.0.4`) used to establish vectors;
- relay snapshot allowed fields and prohibited-field inspection;
- no CI, deployment, real patient data, credentials, or clinic network values are included.

Human documentation gets no source-text unit test.

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm verify
git diff --check
git status --short
```

Expected: type-check, all tests, and build exit 0; `git diff --check` has no output; status lists only the browser harness, verification document, and intended package-script changes.

Run the common-secret scan:

```bash
rg -n -e 'AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' package.json packages docs
```

Expected: exit 1 with no matches.

- [ ] **Step 5: Commit the verification harness**

```bash
git add package.json packages/contracts/package.json packages/contracts/test/browser-vectors.html packages/contracts/test/browser-vectors.mjs packages/contracts/scripts/serve-browser-vectors.mjs docs/foundation-verification.md
git commit -m "test: verify foundation crypto in browser"
```

- [ ] **Step 6: Verify Issue #2 acceptance after all commits**

Run fresh:

```bash
pnpm verify
git diff --check d238a50..HEAD
git status --short --branch
git log --oneline d238a50..HEAD
```

Required evidence:

- strict schemas reject identity at the relay boundary;
- fixed independent vectors cover every key, verifier, AAD, envelope, digest, and management signature;
- Node automated tests and the real browser page both match the vectors;
- the opaque relay round trip returns the original validated synthetic Patient Answer without plaintext or credentials in its snapshot;
- the feature worktree is clean and no CI or deployment file exists.

Do not push or close Issue #2 without separate user authorization.

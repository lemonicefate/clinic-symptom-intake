import { expect, test } from 'vitest';
import { fromBase64url, fromHex } from '../src/bytes.js';
import {
  openPatientAnswer,
  sealPatientAnswer,
  sealPatientAnswerWithNonce,
} from '../src/response-envelope.js';
import { SYNTHETIC_CRYPTO_V1 } from './fixtures/crypto-v1.js';

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

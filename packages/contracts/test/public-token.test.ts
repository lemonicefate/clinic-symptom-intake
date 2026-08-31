import { expect, test } from 'vitest';
import { fromHex, toHex } from '../src/bytes.js';
import {
  createPatientVerifier,
  derivePublicTokenKeys,
} from '../src/public-token.js';
import { SYNTHETIC_CRYPTO_V1 } from './fixtures/crypto-v1.js';

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

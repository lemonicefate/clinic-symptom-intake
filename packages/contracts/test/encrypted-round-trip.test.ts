import { expect, test } from 'vitest';
import { fromHex } from '../src/bytes.js';
import { derivePublicTokenKeys } from '../src/public-token.js';
import { openPatientAnswer, sealPatientAnswer } from '../src/response-envelope.js';
import { SYNTHETIC_CRYPTO_V1 } from './fixtures/crypto-v1.js';
import { OpaqueRelayFixture } from './opaque-relay-fixture.js';

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

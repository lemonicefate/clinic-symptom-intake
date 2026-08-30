import { expect, test } from 'vitest';
import { fromHex } from '../src/bytes.js';
import { signManagementRequest } from '../src/management-auth.js';
import { SYNTHETIC_CRYPTO_V1 } from './fixtures/crypto-v1.js';

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

import {
  concatBytes,
  fromBase64url,
  fromHex,
  toBase64url,
  toHex,
  uint32be,
} from '../dist/bytes.js';
import {
  aesGcmEncrypt,
  hmacSha256,
  sha256,
} from '../dist/crypto-primitives.js';
import {
  createPatientVerifier,
  derivePublicTokenKeys,
} from '../dist/public-token.js';

const VECTOR = {
  clinicRelayId: 'clinic-test-01',
  rootSecretHex: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  saltHex: 'e7626db2d7719d6d53439b7debe1c678dca3637e28c438583cc19ffbfcd0c654',
  lookupKeyHex: '5060898974f84a18cc84c89818d4c4b88bb7137a25e4a273118b29db1574d7f0',
  patientAuthKeyHex: '64e4da2b3b06851cbf9956555da82d61e09d46194d4bfb28db96b707099fa455',
  payloadKeyHex: '9afb9a6ec325224d696556687ee47ebf6c4b6120e5b8a8ad839e9d04d68f3998',
  lookupId: 'UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A',
  patientVerifierHex: '5e40b4ce2fdc71552a8b4368f14b6f9b95d1b715640348a4ab1455d3da6d99b5',
  plaintextUtf8: '{"answerVersion":1,"symptoms":[{"duration":{"unit":"day","value":2},"laterality":"left","severity":4,"symptomId":"ear.pain"}]}',
  canonicalAadUtf8: '{"clinicRelayId":"clinic-test-01","contentVersion":"ent.synthetic.v1","expiresAt":1893427200,"lookupId":"UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A","protocolVersion":1,"revision":1,"submissionId":"00000000-0000-4000-8000-000000000001"}',
  nonceBase64url: 'oKGio6Slpqeoqaqr',
  ciphertextBase64url: 'sTp8VK4BCT7Bnl7FJiPVvd68IPkYvGQeQFHCSETsdhl-sCzdSdLA5-Y6vuc2dpPCm2mLwMvrIkv-zkmvS1S8FjDkWFatylV62hIGY4farEIbK9k3Akj3w-4JXtjtqHkjclcg3LBZRogExIeg5rPwmMf0hJg-61oZzoKcVQczhoW3EzvIW9tjinYo3M8hBA',
  digestBase64url: 'iDdi4wUwUq_TdnV6WwuM86jn6X1bXXysTUn6qMp-OlM',
  managementKeyHex: '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
  managementSigningInputUtf8: 'POST\n/v1/management/pull\n1893423600\n8PHy8_T19vf4-fr7_P3-_w\n86d2e9c200dedec71dae613b15748ff2bd2ef35b8f157946152dfd585cd5b6ba',
  managementSignatureBase64url: 'rngVEMb-qOoV8SKdrd7A6KMOqi-6esCiVV3dNPSEkdQ',
};

const encoder = new TextEncoder();

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name} mismatch`);
  }
}

export async function runBrowserVectors() {
  const root = fromHex(VECTOR.rootSecretHex);
  const keys = await derivePublicTokenKeys(root, VECTOR.clinicRelayId);
  assertEqual('salt', toHex(keys.salt), VECTOR.saltHex);
  assertEqual('lookup key', toHex(keys.lookupKey), VECTOR.lookupKeyHex);
  assertEqual('patient auth key', toHex(keys.patientAuthKey), VECTOR.patientAuthKeyHex);
  assertEqual('payload key', toHex(keys.payloadKey), VECTOR.payloadKeyHex);
  assertEqual('lookup ID', keys.lookupId, VECTOR.lookupId);
  assertEqual(
    'patient verifier',
    toHex(await createPatientVerifier(keys.patientAuthKey)),
    VECTOR.patientVerifierHex,
  );

  const aad = encoder.encode(VECTOR.canonicalAadUtf8);
  const nonce = fromBase64url(VECTOR.nonceBase64url);
  const ciphertext = await aesGcmEncrypt(
    keys.payloadKey,
    nonce,
    encoder.encode(VECTOR.plaintextUtf8),
    aad,
  );
  assertEqual('ciphertext', toBase64url(ciphertext), VECTOR.ciphertextBase64url);
  const digest = await sha256(concatBytes(uint32be(aad.length), aad, nonce, ciphertext));
  assertEqual('envelope digest', toBase64url(digest), VECTOR.digestBase64url);

  const managementSignature = await hmacSha256(
    fromHex(VECTOR.managementKeyHex),
    encoder.encode(VECTOR.managementSigningInputUtf8),
  );
  assertEqual(
    'management signature',
    toBase64url(managementSignature),
    VECTOR.managementSignatureBase64url,
  );
  return { ok: true };
}

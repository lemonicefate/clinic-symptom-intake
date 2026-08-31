import {
  patientAnswerSchema,
  relayEnvelopeSchema,
  responseMetadataSchema,
} from './contracts.js';
import type { PatientAnswer, RelayEnvelope } from './contracts.js';
import {
  concatBytes,
  constantTimeEqual,
  fromBase64url,
  toBase64url,
  uint32be,
} from './bytes.js';
import { canonicalJsonBytes } from './canonical-json.js';
import { aesGcmDecrypt, aesGcmEncrypt, sha256 } from './crypto-primitives.js';

const decoder = new TextDecoder('utf-8', { fatal: true });

export async function computeEnvelopeDigest(
  canonicalAad: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  return sha256(concatBytes(uint32be(canonicalAad.length), canonicalAad, nonce, ciphertext));
}

export async function sealPatientAnswerWithNonce(
  payloadKey: Uint8Array,
  metadataInput: unknown,
  patientAnswerInput: unknown,
  nonce: Uint8Array,
): Promise<RelayEnvelope> {
  const metadata = responseMetadataSchema.parse(metadataInput);
  const patientAnswer = patientAnswerSchema.parse(patientAnswerInput);
  const canonicalAad = canonicalJsonBytes(metadata);
  const plaintext = canonicalJsonBytes(patientAnswer);
  const ciphertext = await aesGcmEncrypt(payloadKey, nonce, plaintext, canonicalAad);
  const digest = await computeEnvelopeDigest(canonicalAad, nonce, ciphertext);

  return relayEnvelopeSchema.parse({
    metadata,
    nonce: toBase64url(nonce),
    ciphertext: toBase64url(ciphertext),
    digest: toBase64url(digest),
  });
}

export function sealPatientAnswer(
  payloadKey: Uint8Array,
  metadata: unknown,
  patientAnswer: unknown,
): Promise<RelayEnvelope> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  return sealPatientAnswerWithNonce(payloadKey, metadata, patientAnswer, nonce);
}

export async function openPatientAnswer(
  payloadKey: Uint8Array,
  envelopeInput: unknown,
): Promise<PatientAnswer> {
  const envelope = relayEnvelopeSchema.parse(envelopeInput);
  const canonicalAad = canonicalJsonBytes(envelope.metadata);
  const nonce = fromBase64url(envelope.nonce);
  const ciphertext = fromBase64url(envelope.ciphertext);
  const expectedDigest = await computeEnvelopeDigest(canonicalAad, nonce, ciphertext);
  const receivedDigest = fromBase64url(envelope.digest);

  if (!constantTimeEqual(expectedDigest, receivedDigest)) {
    throw new Error('response envelope digest does not match');
  }

  const plaintext = await aesGcmDecrypt(
    payloadKey,
    nonce,
    ciphertext,
    canonicalAad,
  );
  const parsed: unknown = JSON.parse(decoder.decode(plaintext));
  return patientAnswerSchema.parse(parsed);
}

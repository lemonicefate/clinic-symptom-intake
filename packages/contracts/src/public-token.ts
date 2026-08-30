import { toBase64url } from './bytes.js';
import { hkdfSha256, sha256 } from './crypto-primitives.js';

const encoder = new TextEncoder();
const SALT_PREFIX = 'clinic-symptom-intake/v1\u0000';

const INFO = {
  lookup: 'clinic-symptom-intake/v1/lookup',
  patientAuth: 'clinic-symptom-intake/v1/patient-auth',
  payload: 'clinic-symptom-intake/v1/payload-aead',
} as const;

export interface PublicTokenKeys {
  readonly salt: Uint8Array;
  readonly lookupKey: Uint8Array;
  readonly patientAuthKey: Uint8Array;
  readonly payloadKey: Uint8Array;
  readonly lookupId: string;
}

export async function derivePublicTokenKeys(
  rootSecret: Uint8Array,
  clinicRelayId: string,
): Promise<PublicTokenKeys> {
  if (rootSecret.length !== 32) {
    throw new TypeError('root secret must be exactly 32 bytes');
  }
  if (clinicRelayId.length === 0) {
    throw new TypeError('clinic relay ID must not be empty');
  }

  const salt = await sha256(encoder.encode(`${SALT_PREFIX}${clinicRelayId}`));
  const [lookupKey, patientAuthKey, payloadKey] = await Promise.all([
    hkdfSha256(rootSecret, salt, encoder.encode(INFO.lookup), 32),
    hkdfSha256(rootSecret, salt, encoder.encode(INFO.patientAuth), 32),
    hkdfSha256(rootSecret, salt, encoder.encode(INFO.payload), 32),
  ]);

  return {
    salt,
    lookupKey,
    patientAuthKey,
    payloadKey,
    lookupId: toBase64url(lookupKey),
  };
}

export function createPatientVerifier(patientAuthKey: Uint8Array): Promise<Uint8Array> {
  return sha256(patientAuthKey);
}

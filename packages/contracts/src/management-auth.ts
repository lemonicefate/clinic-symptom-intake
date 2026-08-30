import { fromBase64url, toBase64url, toHex } from './bytes.js';
import { canonicalJsonBytes } from './canonical-json.js';
import { hmacSha256, sha256 } from './crypto-primitives.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MANAGEMENT_PATH = /^\/v1\/management\/[a-z-]+$/u;
const KEY_ID = /^[A-Za-z0-9_-]{1,64}$/u;

export interface ManagementRequestInput {
  readonly keyId: string;
  readonly key: Uint8Array;
  readonly method: string;
  readonly path: string;
  readonly timestamp: number;
  readonly nonce: string;
  readonly body: unknown;
}

export interface SignedManagementRequest {
  readonly keyId: string;
  readonly timestamp: number;
  readonly nonce: string;
  readonly body: string;
  readonly bodySha256: string;
  readonly signingInput: string;
  readonly signature: string;
}

export async function signManagementRequest(
  input: ManagementRequestInput,
): Promise<SignedManagementRequest> {
  if (!KEY_ID.test(input.keyId)) throw new TypeError('invalid management key ID');
  if (input.key.length !== 32) throw new TypeError('management key must be exactly 32 bytes');
  if (input.method !== 'POST') throw new TypeError('management method must be POST');
  if (!MANAGEMENT_PATH.test(input.path)) throw new TypeError('invalid management path');
  if (!Number.isInteger(input.timestamp) || input.timestamp <= 0) {
    throw new TypeError('management timestamp must be a positive integer');
  }
  if (fromBase64url(input.nonce).length !== 16) {
    throw new TypeError('management nonce must be exactly 16 bytes');
  }

  const bodyBytes = canonicalJsonBytes(input.body);
  const body = decoder.decode(bodyBytes);
  const bodySha256 = toHex(await sha256(bodyBytes));
  const signingInput = [
    input.method,
    input.path,
    String(input.timestamp),
    input.nonce,
    bodySha256,
  ].join('\n');
  const signature = toBase64url(await hmacSha256(input.key, encoder.encode(signingInput)));

  return {
    keyId: input.keyId,
    timestamp: input.timestamp,
    nonce: input.nonce,
    body,
    bodySha256,
    signingInput,
    signature,
  };
}

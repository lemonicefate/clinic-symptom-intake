import { toArrayBuffer } from './bytes.js';

export async function sha256(input: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(input));
  return new Uint8Array(digest);
}

export async function hkdfSha256(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  lengthBytes: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(inputKeyMaterial),
    'HKDF',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(info),
    },
    key,
    lengthBytes * 8,
  );
  return new Uint8Array(bits);
}

export async function aesGcmEncrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  if (key.length !== 32) throw new TypeError('AES-GCM key must be exactly 32 bytes');
  if (nonce.length !== 12) throw new TypeError('AES-GCM nonce must be exactly 12 bytes');
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(nonce),
      additionalData: toArrayBuffer(additionalData),
      tagLength: 128,
    },
    cryptoKey,
    toArrayBuffer(plaintext),
  );
  return new Uint8Array(encrypted);
}

export async function aesGcmDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  if (key.length !== 32) throw new TypeError('AES-GCM key must be exactly 32 bytes');
  if (nonce.length !== 12) throw new TypeError('AES-GCM nonce must be exactly 12 bytes');
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    'AES-GCM',
    false,
    ['decrypt'],
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(nonce),
      additionalData: toArrayBuffer(additionalData),
      tagLength: 128,
    },
    cryptoKey,
    toArrayBuffer(ciphertext),
  );
  return new Uint8Array(decrypted);
}

export async function hmacSha256(
  key: Uint8Array,
  input: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    toArrayBuffer(input),
  );
  return new Uint8Array(signature);
}

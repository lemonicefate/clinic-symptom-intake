import canonicalize from 'canonicalize';

const encoder = new TextEncoder();

export function canonicalJsonBytes(value: unknown): Uint8Array {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new TypeError('value is not canonical JSON');
  }
  return encoder.encode(result);
}

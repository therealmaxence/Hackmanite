import { createHash } from 'crypto';

const NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function uuid5(name: string, namespace: string = NAMESPACE_DNS): string {
  const hex = namespace.replace(/-/g, '');
  const namespaceBytes = Buffer.from(hex, 'hex');
  const nameBytes = Buffer.from(name, 'utf8');

  const hash = createHash('sha1')
    .update(namespaceBytes)
    .update(nameBytes)
    .digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hashHex = hash.toString('hex', 0, 16);

  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    hashHex.slice(12, 16),
    hashHex.slice(16, 20),
    hashHex.slice(20, 32)
  ].join('-');
}

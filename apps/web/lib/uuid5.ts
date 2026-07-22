import { createHash } from 'crypto';

export function uuid5(name: string, namespace: string = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'): string {
  const hash = createHash('sha1').update(Buffer.from(namespace.replace(/-/g, ''), 'hex')).update(Buffer.from(name, 'utf8')).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.toString('hex', 0, 16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * Nostr Heartbeat System
 *
 * Handles creation, signing, and publishing of heartbeat events.
 * Users sign with their own nsec - no server involvement.
 *
 * @see CLAUDE.md - Phase 2: Nostr-Native Heartbeats
 */

import {
  NOSTR_KINDS,
  UnsignedEvent,
  NostrEvent,
  HeartbeatData,
  DEFAULT_RELAYS,
  RelayInfo,
  RelayStatus,
} from './types';
import { fromHex, toHex } from '../crypto/aes';

/**
 * Create an unsigned heartbeat event
 */
export function createHeartbeatEvent(
  publicKey: string,
  data: HeartbeatData
): UnsignedEvent {
  const now = Math.floor(Date.now() / 1000);
  const expiryTime = now + data.thresholdHours * 3600;

  const tags: string[][] = [
    ['d', data.switchId],
    ['expiry', expiryTime.toString()],
    ['threshold_hours', data.thresholdHours.toString()],
  ];

  // Add guardian pubkeys
  for (const guardian of data.guardianPubkeys) {
    tags.push(['guardian', guardian]);
  }

  return {
    pubkey: publicKey,
    created_at: now,
    kind: NOSTR_KINDS.HEARTBEAT,
    tags,
    content: '', // Heartbeats have empty content
  };
}

/**
 * Serialize event for hashing (NIP-01 format)
 */
export function serializeEventForHashing(event: UnsignedEvent): string {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

/**
 * Calculate event ID (SHA256 of serialized event)
 */
export async function calculateEventId(event: UnsignedEvent): Promise<string> {
  const serialized = serializeEventForHashing(event);
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(hashBuffer));
}

/**
 * Sign a Nostr event with a private key (Schnorr signature)
 *
 * Uses BIP-340 Schnorr signatures as required by NIP-01.
 */
export async function signEvent(
  event: UnsignedEvent,
  privateKeyHex: string
): Promise<NostrEvent> {
  const eventId = await calculateEventId(event);

  // BIP-340 Schnorr signing
  const signature = await schnorrSign(fromHex(eventId), fromHex(privateKeyHex));

  return {
    ...event,
    id: eventId,
    sig: toHex(signature),
  };
}

/**
 * Verify a Nostr event signature
 */
export async function verifyEvent(event: NostrEvent): Promise<boolean> {
  try {
    // Recalculate event ID
    const { id, sig, ...unsigned } = event;
    const calculatedId = await calculateEventId(unsigned);

    if (calculatedId !== id) {
      return false;
    }

    // Verify Schnorr signature
    return await schnorrVerify(
      fromHex(sig),
      fromHex(id),
      fromHex(event.pubkey)
    );
  } catch {
    return false;
  }
}

/**
 * BIP-340 Schnorr Sign
 *
 * Implements deterministic Schnorr signing for secp256k1.
 */
async function schnorrSign(
  message: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  // secp256k1 curve parameters
  const n = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
  );
  const p = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'
  );
  const Gx = BigInt(
    '0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'
  );
  const Gy = BigInt(
    '0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'
  );

  const d = bytesToBigInt(privateKey);

  // Get public key point
  const P = scalarMultiply(Gx, Gy, d, p, n);

  // Negate private key if Y is odd (BIP-340 requirement)
  const d_final = P.y % BigInt(2) === BigInt(0) ? d : n - d;

  // Generate deterministic nonce k
  const aux = new Uint8Array(32);
  crypto.getRandomValues(aux);

  const t = xor32(bigIntToBytes(d_final, 32), await taggedHash('BIP0340/aux', aux));
  const rand = await taggedHash(
    'BIP0340/nonce',
    concat(t, bigIntToBytes(P.x, 32), message)
  );

  let k = bytesToBigInt(rand) % n;
  if (k === BigInt(0)) throw new Error('Invalid nonce');

  // R = k*G
  const R = scalarMultiply(Gx, Gy, k, p, n);

  // Negate k if R.y is odd
  if (R.y % BigInt(2) !== BigInt(0)) {
    k = n - k;
  }

  // e = tagged_hash("BIP0340/challenge", R.x || P.x || m) mod n
  const eBytes = await taggedHash(
    'BIP0340/challenge',
    concat(bigIntToBytes(R.x, 32), bigIntToBytes(P.x, 32), message)
  );
  const e = bytesToBigInt(eBytes) % n;

  // s = (k + e*d) mod n
  const s = mod(k + e * d_final, n);

  // Signature is (R.x, s)
  return concat(bigIntToBytes(R.x, 32), bigIntToBytes(s, 32));
}

/**
 * BIP-340 Schnorr Verify
 */
async function schnorrVerify(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  if (signature.length !== 64 || publicKey.length !== 32) {
    return false;
  }

  const n = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
  );
  const p = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'
  );
  const Gx = BigInt(
    '0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'
  );
  const Gy = BigInt(
    '0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'
  );

  const r = bytesToBigInt(signature.slice(0, 32));
  const s = bytesToBigInt(signature.slice(32, 64));
  const px = bytesToBigInt(publicKey);

  if (r >= p || s >= n) return false;

  // Lift x to point P
  const P = liftX(px, p);
  if (!P) return false;

  // e = tagged_hash("BIP0340/challenge", r || P.x || m) mod n
  const eBytes = await taggedHash(
    'BIP0340/challenge',
    concat(bigIntToBytes(r, 32), publicKey, message)
  );
  const e = bytesToBigInt(eBytes) % n;

  // R = s*G - e*P
  const sG = scalarMultiply(Gx, Gy, s, p, n);
  const eP = scalarMultiply(P.x, P.y, e, p, n);
  const negEP = { x: eP.x, y: mod(-eP.y, p) };
  const R = pointAdd(sG, negEP, p);

  if (R.isInfinity) return false;
  if (R.y % BigInt(2) !== BigInt(0)) return false;
  if (R.x !== r) return false;

  return true;
}

// Elliptic curve helpers

interface Point {
  x: bigint;
  y: bigint;
  isInfinity?: boolean;
}

function scalarMultiply(
  Gx: bigint,
  Gy: bigint,
  k: bigint,
  p: bigint,
  _n: bigint
): Point {
  let result: Point = { x: BigInt(0), y: BigInt(0), isInfinity: true };
  let addend: Point = { x: Gx, y: Gy };

  while (k > BigInt(0)) {
    if (k & BigInt(1)) {
      result = pointAdd(result, addend, p);
    }
    addend = pointDouble(addend, p);
    k = k >> BigInt(1);
  }

  return result;
}

function pointAdd(p1: Point, p2: Point, prime: bigint): Point {
  if (p1.isInfinity) return p2;
  if (p2.isInfinity) return p1;

  if (p1.x === p2.x) {
    if (p1.y === p2.y) {
      return pointDouble(p1, prime);
    }
    return { x: BigInt(0), y: BigInt(0), isInfinity: true };
  }

  const slope = mod((p2.y - p1.y) * modInverse(p2.x - p1.x, prime), prime);
  const x3 = mod(slope * slope - p1.x - p2.x, prime);
  const y3 = mod(slope * (p1.x - x3) - p1.y, prime);

  return { x: x3, y: y3 };
}

function pointDouble(point: Point, prime: bigint): Point {
  if (point.isInfinity || point.y === BigInt(0)) {
    return { x: BigInt(0), y: BigInt(0), isInfinity: true };
  }

  const slope = mod(
    BigInt(3) * point.x * point.x * modInverse(BigInt(2) * point.y, prime),
    prime
  );
  const x3 = mod(slope * slope - BigInt(2) * point.x, prime);
  const y3 = mod(slope * (point.x - x3) - point.y, prime);

  return { x: x3, y: y3 };
}

function liftX(x: bigint, p: bigint): Point | null {
  // y^2 = x^3 + 7 (secp256k1)
  const c = mod(x * x * x + BigInt(7), p);
  const y = modSqrt(c, p);
  if (y === null) return null;
  // Return even y
  const yFinal = y % BigInt(2) === BigInt(0) ? y : p - y;
  return { x, y: yFinal };
}

function modSqrt(a: bigint, p: bigint): bigint | null {
  // For p ≡ 3 (mod 4): sqrt(a) = a^((p+1)/4)
  if (mod(p, BigInt(4)) !== BigInt(3)) {
    throw new Error('Prime must be 3 mod 4');
  }
  const root = modPow(a, (p + BigInt(1)) / BigInt(4), p);
  if (mod(root * root, p) !== mod(a, p)) return null;
  return root;
}

function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= BigInt(0) ? result : result + m;
}

function modInverse(a: bigint, m: bigint): bigint {
  a = mod(a, m);
  let [oldR, r] = [a, m];
  let [oldS, s] = [BigInt(1), BigInt(0)];

  while (r !== BigInt(0)) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }

  return mod(oldS, m);
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = BigInt(1);
  base = mod(base, m);
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = mod(result * base, m);
    }
    exp = exp / BigInt(2);
    base = mod(base * base, m);
  }
  return result;
}

// Byte helpers

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result = (result << BigInt(8)) + BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const hex = n.toString(16).padStart(length * 2, '0');
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function xor32(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

async function taggedHash(tag: string, data: Uint8Array): Promise<Uint8Array> {
  const tagHash = await sha256(new TextEncoder().encode(tag));
  const preimage = concat(tagHash, tagHash, data);
  return sha256(preimage);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return new Uint8Array(hash);
}

/**
 * Publish heartbeat to multiple relays
 */
export async function publishHeartbeat(
  event: NostrEvent,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  const publishToRelay = async (relayUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      try {
        const ws = new WebSocket(relayUrl);

        ws.onopen = () => {
          // Send EVENT message (NIP-01)
          ws.send(JSON.stringify(['EVENT', event]));
        };

        ws.onmessage = (msg) => {
          const response = JSON.parse(msg.data);
          if (response[0] === 'OK' && response[1] === event.id) {
            clearTimeout(timeout);
            if (response[2] === true) {
              success.push(relayUrl);
              resolve();
            } else {
              reject(new Error(response[3] || 'Rejected'));
            }
            ws.close();
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  };

  // Publish to all relays in parallel
  await Promise.allSettled(
    relays.map(async (relay) => {
      try {
        await publishToRelay(relay);
      } catch {
        failed.push(relay);
      }
    })
  );

  return { success, failed };
}

/**
 * Query relays for latest heartbeat
 */
export async function queryLatestHeartbeat(
  publicKey: string,
  switchId: string,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<NostrEvent | null> {
  const filter = {
    kinds: [NOSTR_KINDS.HEARTBEAT],
    authors: [publicKey],
    '#d': [switchId],
    limit: 1,
  };

  for (const relayUrl of relays) {
    try {
      const event = await queryRelay(relayUrl, filter);
      if (event) {
        return event;
      }
    } catch {
      // Try next relay
    }
  }

  return null;
}

/**
 * Query a single relay
 */
async function queryRelay(
  relayUrl: string,
  filter: Record<string, unknown>
): Promise<NostrEvent | null> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);

    try {
      const ws = new WebSocket(relayUrl);
      const subId = crypto.randomUUID().slice(0, 8);
      let event: NostrEvent | null = null;

      ws.onopen = () => {
        // Send REQ message (NIP-01)
        ws.send(JSON.stringify(['REQ', subId, filter]));
      };

      ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);
        if (response[0] === 'EVENT' && response[1] === subId) {
          event = response[2];
        } else if (response[0] === 'EOSE' && response[1] === subId) {
          clearTimeout(timeout);
          ws.close();
          resolve(event);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket error'));
      };
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Check if a switch has missed its heartbeat threshold
 */
export async function checkHeartbeatStatus(
  publicKey: string,
  switchId: string,
  thresholdHours: number,
  relays?: string[]
): Promise<{
  isAlive: boolean;
  lastHeartbeat: number | null;
  hoursOverdue: number | null;
}> {
  const event = await queryLatestHeartbeat(publicKey, switchId, relays);

  if (!event) {
    return {
      isAlive: false,
      lastHeartbeat: null,
      hoursOverdue: null,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const lastHeartbeat = event.created_at;
  const thresholdSeconds = thresholdHours * 3600;
  const elapsed = now - lastHeartbeat;
  const isAlive = elapsed < thresholdSeconds;

  return {
    isAlive,
    lastHeartbeat,
    hoursOverdue: isAlive ? null : Math.floor((elapsed - thresholdSeconds) / 3600),
  };
}

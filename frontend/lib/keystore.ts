/**
 * EchoLock Key Store
 *
 * Secure client-side storage for cryptographic keys using IndexedDB.
 * Keys are encrypted with the user's password before storage.
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 *
 * Security Properties:
 * - Keys never leave the device unencrypted
 * - Password-based encryption (PBKDF2, 600k iterations)
 * - Each switch has isolated key material
 * - Supports key export for backup
 */

import {
  EncryptedSwitch,
  encryptForStorage,
  decryptFromStorage,
  fromHex,
  toHex,
  randomBytes,
} from './crypto';

const DB_NAME = 'echolock-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'switches';
const META_STORE = 'metadata';

/**
 * Stored switch data (encrypted at rest)
 */
interface StoredSwitch {
  switchId: string;

  // Encrypted key bundle (contains authKey, nostr.privateKey)
  encryptedKeys: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };

  // Salt used for password-based encryption
  keySalt: string;

  // Public data (not sensitive)
  nostrPublicKey: string;
  createdAt: string;

  // Metadata
  title?: string;
  status: 'active' | 'released' | 'cancelled';
}

/**
 * Decrypted key bundle
 */
interface KeyBundle {
  authKey: string;
  nostrPrivateKey: string;
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open keystore database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create switches store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'switchId' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Store a switch's keys securely
 *
 * @param encryptedSwitch - The full encrypted switch from crypto module
 * @param password - User's password for encryption
 * @param title - Optional title for the switch
 */
export async function storeSwitch(
  encryptedSwitch: EncryptedSwitch,
  password: string,
  title?: string
): Promise<void> {
  const db = await openDatabase();

  try {
    // Create key bundle to encrypt
    const keyBundle: KeyBundle = {
      authKey: encryptedSwitch.authKey,
      nostrPrivateKey: encryptedSwitch.nostr.privateKey,
    };

    // Generate fresh salt for this switch's encryption
    const keySalt = randomBytes(32);

    // Encrypt the key bundle
    const encryptedKeys = await encryptForStorage(
      JSON.stringify(keyBundle),
      password,
      keySalt
    );

    // Prepare storage object
    const storedSwitch: StoredSwitch = {
      switchId: encryptedSwitch.switchId,
      encryptedKeys,
      keySalt: toHex(keySalt),
      nostrPublicKey: encryptedSwitch.nostr.publicKey,
      createdAt: encryptedSwitch.createdAt,
      title,
      status: 'active',
    };

    // Store in IndexedDB
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedSwitch);

      request.onerror = () => reject(new Error('Failed to store switch'));
      request.onsuccess = () => resolve();
    });
  } finally {
    db.close();
  }
}

/**
 * Retrieve a switch's keys
 *
 * @param switchId - The switch ID
 * @param password - User's password for decryption
 * @returns The decrypted key bundle, or null if not found
 */
export async function retrieveSwitch(
  switchId: string,
  password: string
): Promise<(KeyBundle & { nostrPublicKey: string }) | null> {
  const db = await openDatabase();

  try {
    const storedSwitch = await new Promise<StoredSwitch | undefined>(
      (resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(switchId);

        request.onerror = () => reject(new Error('Failed to retrieve switch'));
        request.onsuccess = () => resolve(request.result);
      }
    );

    if (!storedSwitch) {
      return null;
    }

    // Decrypt the key bundle
    const keySalt = fromHex(storedSwitch.keySalt);
    const decryptedJson = await decryptFromStorage(
      storedSwitch.encryptedKeys.ciphertext,
      storedSwitch.encryptedKeys.iv,
      storedSwitch.encryptedKeys.authTag,
      password,
      keySalt
    );

    const keyBundle: KeyBundle = JSON.parse(decryptedJson);

    return {
      ...keyBundle,
      nostrPublicKey: storedSwitch.nostrPublicKey,
    };
  } finally {
    db.close();
  }
}

/**
 * List all stored switches (metadata only, no keys)
 */
export async function listSwitches(): Promise<
  Array<{
    switchId: string;
    nostrPublicKey: string;
    createdAt: string;
    title?: string;
    status: string;
  }>
> {
  const db = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to list switches'));
      request.onsuccess = () => {
        const switches = request.result.map((sw: StoredSwitch) => ({
          switchId: sw.switchId,
          nostrPublicKey: sw.nostrPublicKey,
          createdAt: sw.createdAt,
          title: sw.title,
          status: sw.status,
        }));
        resolve(switches);
      };
    });
  } finally {
    db.close();
  }
}

/**
 * Update switch status
 */
export async function updateSwitchStatus(
  switchId: string,
  status: 'active' | 'released' | 'cancelled'
): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(switchId);

      getRequest.onerror = () => reject(new Error('Failed to get switch'));
      getRequest.onsuccess = () => {
        const storedSwitch = getRequest.result;
        if (!storedSwitch) {
          reject(new Error('Switch not found'));
          return;
        }

        storedSwitch.status = status;
        const putRequest = store.put(storedSwitch);

        putRequest.onerror = () => reject(new Error('Failed to update switch'));
        putRequest.onsuccess = () => resolve();
      };
    });
  } finally {
    db.close();
  }
}

/**
 * Delete a switch from local storage
 */
export async function deleteSwitch(switchId: string): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(switchId);

      request.onerror = () => reject(new Error('Failed to delete switch'));
      request.onsuccess = () => resolve();
    });
  } finally {
    db.close();
  }
}

/**
 * Export all keys for backup
 *
 * Returns encrypted key data that can be saved to a file.
 * The export is encrypted with the user's password.
 *
 * @param password - User's password for encryption
 * @returns Encrypted backup data as JSON string
 */
export async function exportAllKeys(password: string): Promise<string> {
  const db = await openDatabase();

  try {
    const allSwitches = await new Promise<StoredSwitch[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to export switches'));
      request.onsuccess = () => resolve(request.result);
    });

    // Create export bundle
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      switches: allSwitches,
    };

    // Encrypt the entire export
    const exportSalt = randomBytes(32);
    const encryptedExport = await encryptForStorage(
      JSON.stringify(exportData),
      password,
      exportSalt
    );

    return JSON.stringify({
      version: 1,
      salt: toHex(exportSalt),
      ...encryptedExport,
    });
  } finally {
    db.close();
  }
}

/**
 * Import keys from backup
 *
 * @param backupData - Encrypted backup JSON string
 * @param password - Password used when exporting
 */
export async function importKeys(
  backupData: string,
  password: string
): Promise<{ imported: number; skipped: number }> {
  const backup = JSON.parse(backupData);

  if (backup.version !== 1) {
    throw new Error('Unsupported backup version');
  }

  const salt = fromHex(backup.salt);
  const decryptedJson = await decryptFromStorage(
    backup.ciphertext,
    backup.iv,
    backup.authTag,
    password,
    salt
  );

  const exportData = JSON.parse(decryptedJson);
  const db = await openDatabase();

  let imported = 0;
  let skipped = 0;

  try {
    for (const sw of exportData.switches) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);

          // Check if already exists
          const getRequest = store.get(sw.switchId);
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              skipped++;
              resolve();
            } else {
              const putRequest = store.put(sw);
              putRequest.onerror = () => reject(new Error('Import failed'));
              putRequest.onsuccess = () => {
                imported++;
                resolve();
              };
            }
          };
          getRequest.onerror = () => reject(new Error('Check failed'));
        });
      } catch {
        skipped++;
      }
    }
  } finally {
    db.close();
  }

  return { imported, skipped };
}

/**
 * Check if keystore has any data
 */
export async function hasStoredKeys(): Promise<boolean> {
  const db = await openDatabase();

  try {
    const count = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onerror = () => reject(new Error('Failed to count switches'));
      request.onsuccess = () => resolve(request.result);
    });

    return count > 0;
  } finally {
    db.close();
  }
}

/**
 * Clear all stored keys (use with caution!)
 */
export async function clearAllKeys(): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(new Error('Failed to clear keystore'));
      request.onsuccess = () => resolve();
    });
  } finally {
    db.close();
  }
}

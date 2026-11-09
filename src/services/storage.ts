/**
 * Persistent storage: asks the browser not to evict IndexedDB (stars, badges,
 * history) under storage pressure or after a while without use (Safari / iOS).
 */
export type StorageProtection = 'persisted' | 'not_persisted' | 'unsupported';

const storageManager = (): StorageManager | undefined =>
  typeof navigator !== 'undefined' ? navigator.storage : undefined;

/** Current state, without asking. */
export async function storageProtection(): Promise<StorageProtection> {
  const storage = storageManager();
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'persisted' : 'not_persisted';
  } catch {
    return 'unsupported';
  }
}

/** Asks for persistent storage (granted silently by most browsers for installed apps). */
export async function requestPersistentStorage(): Promise<StorageProtection> {
  const storage = storageManager();
  if (!storage?.persist) return 'unsupported';
  try {
    return (await storage.persist()) ? 'persisted' : 'not_persisted';
  } catch {
    return 'unsupported';
  }
}

// Local storage utilities for the Simcoe County Web Viewer
// All localStorage access should go through these helpers so that
// server-sync and any future format conversions happen in one place.

import { setUserStorage } from "@/utils/userStorage";

// ---------------------------------------------------------------------------
// Raw key/value operations — single point of control for all localStorage I/O
// ---------------------------------------------------------------------------

/**
 * Write a raw string value to localStorage and trigger server sync.
 */
export function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    setUserStorage();
  } catch (error) {
    console.error("Failed to set localStorage item:", error);
  }
}

/**
 * Read a raw string value from localStorage.
 */
export function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error("Failed to get localStorage item:", error);
    return null;
  }
}

/**
 * Remove a key from localStorage and trigger server sync.
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
    setUserStorage();
  } catch (error) {
    console.error("Failed to remove localStorage item:", error);
  }
}

/**
 * Return all localStorage keys (filtering is left to the caller).
 */
export function getStorageKeys(): string[] {
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Envelope-format operations (with expiration / timestamp wrapper)
// ---------------------------------------------------------------------------

/**
 * Save item to localStorage with optional expiration
 */
export function saveToStorage(storageKey: string, item: unknown, options: { expires?: Date } = {}): void {
  const data = {
    value: item,
    expires: options.expires?.getTime() || null,
    timestamp: Date.now(),
  };

  setStorageItem(storageKey, JSON.stringify(data));
}

/**
 * Get item from localStorage, checking expiration
 */
export function getItemsFromStorage<T = unknown>(key: string): T | null {
  const stored = getStorageItem(key);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);

    // Check if item has expired
    if (data.expires && Date.now() > data.expires) {
      removeStorageItem(key);
      return null;
    }

    return data.value as T;
  } catch (error) {
    console.error("Failed to get from localStorage:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared (cross-app) operations — RAW legacy format, no envelope
// ---------------------------------------------------------------------------
//
// A handful of keys ("Layers", "Layers_Folder_View", "TOC_Type") are read and
// written by BOTH the legacy SimcoeCountyWebViewer apps and this NextJS app,
// and they are synced to the SAME server-side row (usp_get/set_user_storage).
// The legacy apps store these values RAW (`JSON.stringify(item)` with no
// wrapper) and read them back with a plain `JSON.parse`. To stay byte-for-byte
// compatible — so a save in either app restores correctly in the other — these
// helpers deliberately bypass the {value, expires, timestamp} envelope used by
// saveToStorage/getItemsFromStorage above.

/**
 * Save a value for a key that is shared with the legacy apps.
 * Writes the RAW JSON (no envelope) and triggers server sync, exactly like the
 * old app's `helpers.saveToStorage`.
 */
export function saveSharedItem(storageKey: string, item: unknown): void {
  setStorageItem(storageKey, JSON.stringify(item));
}

/**
 * Read a value for a key that is shared with the legacy apps.
 *
 * Accepts BOTH formats for resilience:
 *  - raw legacy JSON (what the legacy apps and this app now write), and
 *  - the older {value, expires, timestamp} envelope that a previous build of
 *    this app may have written (so already-migrated users keep working until
 *    their next save converges back to raw format).
 *
 * Returns `null` when the key is absent or unparseable.
 */
export function getSharedItem<T = unknown>(key: string): T | null {
  const stored = getStorageItem(key);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);

    // Backwards-compat: unwrap a legacy envelope from older NextJS builds.
    // Matches both the full {value, timestamp} envelope and the bare {value: [...]}
    // wrapper that some legacy data uses (no timestamp required).
    if (data !== null && typeof data === "object" && !Array.isArray(data) && "value" in data) {
      const envelope = data as { value: unknown; expires?: number | null; timestamp?: unknown };
      if (envelope.expires && Date.now() > envelope.expires) {
        removeStorageItem(key);
        return null;
      }
      return envelope.value as T;
    }

    return data as T;
  } catch (error) {
    console.error("Failed to read shared localStorage item:", error);
    return null;
  }
}

/**
 * Remove item from localStorage
 */
export function removeFromStorage(storageKey: string): void {
  removeStorageItem(storageKey);
}

/**
 * Append item to an array in localStorage with optional limit
 */
export function appendToStorage<T>(storageKey: string, item: T, limit?: number): void {
  try {
    const existing = getItemsFromStorage<T[]>(storageKey) || [];

    // Remove existing instance of the item if it exists
    const filtered = existing.filter((existingItem) => JSON.stringify(existingItem) !== JSON.stringify(item));

    // Add new item at the beginning
    filtered.unshift(item);

    // Apply limit if specified
    if (limit && filtered.length > limit) {
      filtered.splice(limit);
    }

    saveToStorage(storageKey, filtered);
  } catch (error) {
    console.error("Failed to append to localStorage:", error);
  }
}

/**
 * Remove a specific item from an array in localStorage
 */
export function removeItemFromStorage<T>(storageKey: string, item: T): void {
  try {
    const existing = getItemsFromStorage<T[]>(storageKey) || [];

    // Remove the specific item
    const filtered = existing.filter((existingItem) => JSON.stringify(existingItem) !== JSON.stringify(item));

    saveToStorage(storageKey, filtered);
  } catch (error) {
    console.error("Failed to remove item from localStorage:", error);
  }
}

// ---------------------------------------------------------------------------
// Shared array helpers — cross-app compatible, raw format (no envelope)
// ---------------------------------------------------------------------------
//
// "searchHistory" and "sc_dontshowagain" are written by BOTH legacy apps and
// this NextJS app as plain JSON arrays.  These helpers keep that contract so
// either app can read what the other wrote.

/**
 * Append an item to a raw-format array shared with the legacy apps.
 *
 * Reads via {@link getSharedItem} (handles any old envelope data transparently),
 * then writes the updated array as raw JSON via {@link saveSharedItem}.
 * A `dateAdded` field is stamped automatically if absent, matching legacy
 * `appendToStorage` behaviour.
 */
export function appendSharedArrayItem<T extends object>(storageKey: string, item: T, limit?: number): void {
  try {
    const existing = getSharedItem<T[]>(storageKey) ?? [];

    const stamped: T = "dateAdded" in item ? item : { ...item, dateAdded: new Date().toLocaleString() };

    // De-duplicate: drop any prior entry that stringifies identically
    const filtered = existing.filter((e) => JSON.stringify(e) !== JSON.stringify(stamped));

    filtered.unshift(stamped);

    if (limit !== undefined && filtered.length > limit) {
      filtered.splice(limit);
    }

    saveSharedItem(storageKey, filtered);
  } catch (error) {
    console.error("Failed to append shared array item:", error);
  }
}

/**
 * Remove a specific item from a raw-format array shared with the legacy apps.
 */
export function removeSharedArrayItem<T>(storageKey: string, item: T): void {
  try {
    const existing = getSharedItem<T[]>(storageKey) ?? [];
    const filtered = existing.filter((e) => JSON.stringify(e) !== JSON.stringify(item));
    saveSharedItem(storageKey, filtered);
  } catch (error) {
    console.error("Failed to remove shared array item:", error);
  }
}

/**
 * Clean up expired items from localStorage
 */
export function cleanupStorage(): void {
  try {
    const keys = getStorageKeys();
    let removed = false;

    keys.forEach((key) => {
      try {
        const stored = getStorageItem(key);
        if (!stored) return;

        const data = JSON.parse(stored);

        // Check if this is our format and if it's expired
        if (data.expires && Date.now() > data.expires) {
          localStorage.removeItem(key);
          removed = true;
        }
      } catch {
        // Skip items that aren't in our format
      }
    });

    if (removed) setUserStorage();
  } catch (error) {
    console.error("Failed to cleanup localStorage:", error);
  }
}

/**
 * Get the size of localStorage usage in bytes
 */
export function getStorageSize(): number {
  try {
    let totalSize = 0;
    const keys = getStorageKeys();

    keys.forEach((key) => {
      const item = getStorageItem(key);
      if (item) {
        totalSize += key.length + item.length;
      }
    });

    return totalSize;
  } catch (error) {
    console.error("Failed to calculate localStorage size:", error);
    return 0;
  }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, "test");
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all items from localStorage
 */
export function clearAllStorage(): void {
  try {
    localStorage.clear();
    setUserStorage();
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}

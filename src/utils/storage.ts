// Local storage utilities for the Simcoe County Web Viewer

/**
 * Save item to localStorage with optional expiration
 */
export function saveToStorage(storageKey: string, item: unknown, options: { expires?: Date } = {}): void {
  try {
    const data = {
      value: item,
      expires: options.expires?.getTime() || null,
      timestamp: Date.now(),
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

/**
 * Get item from localStorage, checking expiration
 */
export function getItemsFromStorage<T = unknown>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Check if item has expired
    if (data.expires && Date.now() > data.expires) {
      localStorage.removeItem(key);
      return null;
    }

    return data.value as T;
  } catch (error) {
    console.error("Failed to get from localStorage:", error);
    return null;
  }
}

/**
 * Remove item from localStorage
 */
export function removeFromStorage(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error("Failed to remove from localStorage:", error);
  }
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

/**
 * Clean up expired items from localStorage
 */
export function cleanupStorage(): void {
  try {
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;

        const data = JSON.parse(stored);

        // Check if this is our format and if it's expired
        if (data.expires && Date.now() > data.expires) {
          localStorage.removeItem(key);
        }
      } catch {
        // Skip items that aren't in our format
      }
    });
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
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      const item = localStorage.getItem(key);
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
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}

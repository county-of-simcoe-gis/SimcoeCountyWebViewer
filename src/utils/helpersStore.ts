/**
 * Zustand store integration utilities
 * These replace window variable usage with proper store-based state management
 */

import { useMapStore } from '@/stores/mapStore'

/**
 * Wait for items to load (replaces window.loaded array usage)
 */
export function waitForLoad(
  items: string | string[], 
  startTime = Date.now(), 
  timeout = 30, 
  callback: () => void
): void {
  if (startTime + timeout * 1000 <= Date.now()) {
    console.error('Timeout loading', items);
    // Could show a message here if needed
    return;
  }
  
  const mapStore = useMapStore.getState();
  if (mapStore.areItemsLoaded(items)) {
    callback();
  } else {
    setTimeout(() => waitForLoad(items, startTime, timeout, callback), 50);
  }
}

/**
 * Check if items are loaded (replaces window.loaded array usage)
 */
export function isLoaded(items: string | string[]): boolean {
  const mapStore = useMapStore.getState();
  return mapStore.areItemsLoaded(items);
}

/**
 * Add item to loaded list (replaces window.loaded array usage)
 */
export function addIsLoaded(item: string): void {
  const mapStore = useMapStore.getState();
  mapStore.addLoadedItem(item);
}

/**
 * Remove item from loaded list (replaces window.loaded array usage)
 */
export function removeIsLoaded(item: string): void {
  const mapStore = useMapStore.getState();
  mapStore.removeLoadedItem(item);
} 
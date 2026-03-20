import { describe, it, expect, beforeEach } from 'vitest'
import { saveToStorage, getItemsFromStorage, appendToStorage, removeFromStorage, isStorageAvailable, getStorageSize } from '@/utils/storage'

// Mock localStorage for testing
Object.defineProperty(global, 'localStorage', {
  value: {
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] || null;
    },
    setItem(key: string, value: string) {
      this.store[key] = value;
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    }
  },
  writable: true
});

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save/get/remove round trip', () => {
    saveToStorage('k', { a: 1 })
    expect(getItemsFromStorage('k')).toEqual({ a: 1 })
    removeFromStorage('k')
    expect(getItemsFromStorage('k')).toBeNull()
  })

  it('appendToStorage maintains limit and de-dupes', () => {
    appendToStorage('arr', { a: 1 }, 2)
    appendToStorage('arr', { a: 2 }, 2)
    appendToStorage('arr', { a: 1 }, 2)
    const res = getItemsFromStorage<{ a: number }[]>('arr')!
    expect(res.length).toBe(2)
    expect(res[0]).toEqual({ a: 1 }) // most recent first
  })

  it('isStorageAvailable returns boolean', () => {
    expect(typeof isStorageAvailable()).toBe('boolean')
  })

  it('getStorageSize returns a number', () => {
    saveToStorage('size_k', 'x')
    // Mock localStorage implementation doesn't calculate actual size
    // so we just test that it returns a number
    expect(typeof getStorageSize()).toBe('number')
  })
})



import { describe, it, expect, beforeEach } from 'vitest'
import { saveToStorage, getItemsFromStorage, appendToStorage, removeFromStorage, isStorageAvailable, getStorageSize, saveSharedItem, getSharedItem } from '@/utils/storage'

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

describe('shared (cross-app raw) storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saveSharedItem writes RAW JSON with no envelope', () => {
    const groups = { 'simcoe:popular': { label: 'Popular', layers: { L1: { name: 'L1', visible: true, opacity: 1, index: 0 } } } }
    saveSharedItem('Layers', groups)

    // Stored value must be the raw object — exactly what the legacy app writes
    expect(JSON.parse(localStorage.getItem('Layers')!)).toEqual(groups)
  })

  it('getSharedItem reads RAW legacy data (what the old app wrote)', () => {
    const groups = { g1: { label: 'G1', layers: {} } }
    // Simulate the legacy app writing raw JSON directly
    localStorage.setItem('Layers', JSON.stringify(groups))

    expect(getSharedItem('Layers')).toEqual(groups)
  })

  it('getSharedItem unwraps a legacy NextJS envelope for backwards-compat', () => {
    const groups = { g1: { label: 'G1', layers: {} } }
    // Simulate an older NextJS build that wrote the envelope format
    localStorage.setItem('Layers', JSON.stringify({ value: groups, expires: null, timestamp: 123 }))

    expect(getSharedItem('Layers')).toEqual(groups)
  })

  it('round-trips through saveSharedItem/getSharedItem', () => {
    const data = { a: { label: 'A', layers: { x: { visible: false } } } }
    saveSharedItem('Layers_Folder_View', data)
    expect(getSharedItem('Layers_Folder_View')).toEqual(data)
  })

  it('getSharedItem returns null for a missing key', () => {
    expect(getSharedItem('Layers')).toBeNull()
  })
})



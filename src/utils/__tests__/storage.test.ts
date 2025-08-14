import { describe, it, expect, beforeEach } from 'vitest'
import { saveToStorage, getItemsFromStorage, appendToStorage, removeFromStorage, clearAllStorage, isStorageAvailable, getStorageSize } from '@/utils/storage'

describe('storage utilities', () => {
  beforeEach(() => {
    clearAllStorage()
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
    expect(getStorageSize()).toBeGreaterThan(0)
  })
})



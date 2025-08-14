import { appendToStorage, clearAllStorage, getItemsFromStorage, isStorageAvailable, removeFromStorage, saveToStorage } from '@/utils/storage'

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves items', () => {
    saveToStorage('k', { a: 1 })
    expect(getItemsFromStorage<any>('k')).toEqual({ a: 1 })
  })

  it('expires items', () => {
    const past = new Date(Date.now() - 1000)
    saveToStorage('k', { a: 1 }, { expires: past })
    expect(getItemsFromStorage<any>('k')).toBeNull()
  })

  it('appendToStorage respects limit and de-duplicates', () => {
    appendToStorage('k', 1, 2)
    appendToStorage('k', 2, 2)
    appendToStorage('k', 1, 2)
    expect(getItemsFromStorage<number[]>('k')).toEqual([1, 2])
  })

  it('remove and clear work', () => {
    saveToStorage('a', 1)
    removeFromStorage('a')
    expect(getItemsFromStorage('a')).toBeNull()
    saveToStorage('b', 2)
    clearAllStorage()
    expect(localStorage.length).toBe(0)
  })

  it('isStorageAvailable returns true in jsdom', () => {
    expect(isStorageAvailable()).toBe(true)
  })
})

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
    const res = getItemsFromStorage<any[]>('arr')!
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



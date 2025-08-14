import { getURLParameter, removeURLParameter } from '@/utils/helpersUrl'

describe('helpersUrl', () => {
  describe('getURLParameter', () => {
    const originalLocation = window.location

    beforeEach(() => {
      // @ts-expect-error jsdom url override
      delete window.location
      // @ts-expect-error jsdom url override
      window.location = new URL('https://example.com/?q=Hello%20World&Qt=Parcel') as unknown as Location
    })

    afterAll(() => {
      // restore
      // @ts-expect-error restore
      window.location = originalLocation
    })

    it('returns decoded value by default (case-insensitive key)', () => {
      expect(getURLParameter('q')).toBe('Hello World')
      expect(getURLParameter('QT')).toBe('Parcel')
    })

    it('can be case-sensitive when asked', () => {
      expect(getURLParameter('Qt', true, true)).toBe('Parcel')
      expect(getURLParameter('qt', true, true)).toBeNull()
    })
  })

  describe('removeURLParameter', () => {
    it('removes a single param from url', () => {
      const result = removeURLParameter('https://example.com/?a=1&b=2', 'a')
      expect(result).toBe('https://example.com/?b=2')
    })

    it('removes last param and cleans question mark', () => {
      const result = removeURLParameter('https://example.com/?a=1', 'a')
      expect(result).toBe('https://example.com/')
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { getURLParameter, removeURLParameter } from '@/utils/helpersUrl'

describe('helpersUrl', () => {
  beforeEach(() => {
    const url = new URL('http://localhost/?Foo=bar&Baz=qux')
    // @ts-expect-error override
    delete (window as any).location
    // @ts-ignore
    window.location = { ...url, search: url.search } as any
  })

  it('getURLParameter supports case sensitivity', () => {
    expect(getURLParameter('foo', true, false)).toBe('bar')
    expect(getURLParameter('Foo', true, true)).toBe('bar')
    expect(getURLParameter('notfound')).toBeNull()
  })

  it('removeURLParameter removes key', () => {
    const result = removeURLParameter('http://localhost/?a=1&b=2&c=3', 'b')
    expect(result).toBe('http://localhost/?a=1&c=3')
  })
})



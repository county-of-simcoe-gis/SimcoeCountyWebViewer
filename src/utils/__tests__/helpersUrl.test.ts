import { describe, it, expect, beforeEach } from 'vitest'
import { getURLParameter, removeURLParameter } from '@/utils/helpersUrl'

describe('helpersUrl', () => {
  beforeEach(() => {
    const url = new URL('http://localhost/?Foo=bar&Baz=qux')
    // @ts-expect-error jsdom url override
    delete (window as Window & typeof globalThis).location
    // @ts-expect-error jsdom url override  
    window.location = { ...url, search: url.search } as Location
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



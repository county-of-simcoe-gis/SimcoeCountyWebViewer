import { describe, it, expect } from 'vitest'
import { getUID, tryParseJSON } from '@/utils/helpersCore'

describe('helpersCore', () => {
  it('getUID returns a short unique string', () => {
    const a = getUID()
    const b = getUID()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[a-z0-9]{5,}$/)
  })

  it('tryParseJSON returns object or false', () => {
    expect(tryParseJSON('{"a":1}')).toEqual({ a: 1 })
    expect(tryParseJSON('not json')).toBe(false)
  })
})



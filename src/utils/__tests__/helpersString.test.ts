import { describe, it, expect } from 'vitest'
import { toTitleCase, formatTitleCase, replaceAllInString, escapeRegExp, formatReplace } from '@/utils/helpersString'

describe('helpersString', () => {
  it('toTitleCase converts words to title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World')
  })

  it('formatTitleCase limits length when provided', () => {
    expect(formatTitleCase('hello world', 5)).toBe('Hello...')
    expect(formatTitleCase('hello', 10)).toBe('Hello')
  })

  it('escapeRegExp escapes special characters', () => {
    const input = 'a+b*c?'
    const escaped = escapeRegExp(input)
    expect(new RegExp(escaped).test('a+b*c?')).toBe(true)
  })

  it('replaceAllInString replaces all occurrences', () => {
    expect(replaceAllInString('foo bar foo', 'foo', 'baz')).toBe('baz bar baz')
  })

  it('formatReplace replaces placeholders by index', () => {
    expect(formatReplace('Hello {0}, welcome to {1}!', 'John', 'the app')).toBe('Hello John, welcome to the app!')
  })
})



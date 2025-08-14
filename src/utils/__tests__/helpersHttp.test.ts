import { getJSON, httpGetText, postJSON } from '@/utils/helpersHttp'

describe('helpersHttp', () => {
  it('getJSON succeeds', async () => {
    const data = { ok: true }
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) }) as unknown as typeof fetch
    await expect(getJSON('/api')).resolves.toEqual(data)
  })

  it('getJSON throws on non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch
    await expect(getJSON('/api')).rejects.toBeInstanceOf(Error)
  })

  it('httpGetText returns text', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('hello') }) as unknown as typeof fetch
    await expect(httpGetText('/api')).resolves.toBe('hello')
  })

  it('postJSON posts body', async () => {
    const data = { posted: true }
    const mock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) })
    global.fetch = mock as unknown as typeof fetch
    await expect(postJSON('/api', { a: 1 })).resolves.toEqual(data)
    expect(mock).toHaveBeenCalledWith('/api', expect.objectContaining({ method: 'POST' }))
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { httpGetText, getJSON, postJSON } from '@/utils/helpersHttp'

describe('helpersHttp', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('httpGetText returns text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'hello',
    } as any)
    await expect(httpGetText('/x')).resolves.toBe('hello')
  })

  it('getJSON returns json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ a: 1 }),
    } as any)
    await expect(getJSON<{ a: number }>('/y')).resolves.toEqual({ a: 1 })
  })

  it('postJSON posts and returns json', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as any)
    const res = await postJSON<{ ok: boolean }>('/z', { a: 1 })
    expect(res).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledWith('/z', expect.objectContaining({ method: 'POST' }))
  })
})



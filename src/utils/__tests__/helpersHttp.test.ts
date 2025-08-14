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
    } as Response)
    await expect(httpGetText('/x')).resolves.toBe('hello')
  })

  it('getJSON returns json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ a: 1 }),
    } as Response)
    await expect(getJSON<{ a: number }>('/y')).resolves.toEqual({ a: 1 })
  })

  it('postJSON posts and returns json', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
    const res = await postJSON<{ ok: boolean }>('/z', { a: 1 })
    expect(res).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledWith('/z', expect.objectContaining({ method: 'POST' }))
  })
})



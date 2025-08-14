import { describe, it, expect } from 'vitest'
import { sortByKey, asyncForEach } from '@/utils/helpersArray'

describe('helpersArray', () => {
  it('sortByKey sorts array by key', () => {
    const arr = [{ id: 2 }, { id: 1 }, { id: 3 }]
    expect(sortByKey(arr, 'id').map(a => a.id)).toEqual([1, 2, 3])
  })

  it('asyncForEach runs sequentially', async () => {
    const visited: number[] = []
    await asyncForEach([1, 2, 3], async (n) => {
      await new Promise(r => setTimeout(r, 5))
      visited.push(n)
    })
    expect(visited).toEqual([1, 2, 3])
  })
})



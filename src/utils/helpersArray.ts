/**
 * Array manipulation utilities
 */

/**
 * Sort array by object key
 */
export function sortByKey<T>(array: T[], key: keyof T): T[] {
  return array.sort((a, b) => {
    const x = a[key];
    const y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

/**
 * Async forEach implementation
 */
export async function asyncForEach<T>(
  array: T[], 
  callback: (item: T, index: number, array: T[]) => Promise<void>
): Promise<void> {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} 
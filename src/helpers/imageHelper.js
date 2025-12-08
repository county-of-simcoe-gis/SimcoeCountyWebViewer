/**
 * Helper to process Vite's import.meta.glob results into an images object
 * This replaces the webpack require.context pattern used previously
 * 
 * @param {Object} imageModules - Result from import.meta.glob()
 * @param {boolean} toLowerCase - Whether to convert filenames to lowercase
 * @returns {Object} - Object with filename as key and image URL as value
 * 
 * @example
 * import { createImagesObject } from '../helpers/imageHelper';
 * const images = createImagesObject(
 *   import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
 * );
 */
export function createImagesObject(imageModules, toLowerCase = false) {
  const images = {};
  for (const path in imageModules) {
    let fileName = path.split('/').pop();
    if (toLowerCase) {
      fileName = fileName.toLowerCase();
    }
    images[fileName] = imageModules[path];
  }
  return images;
}


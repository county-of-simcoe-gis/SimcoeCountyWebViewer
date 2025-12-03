/**
 * Helper to process Vite's import.meta.glob results into an images object
 * This replaces the webpack require.context pattern used previously
 * 
 * @param {Object} imageModules - Result from import.meta.glob()
 * @returns {Object} - Object with filename as key and image URL as value
 * 
 * @example
 * import { createImagesObject } from '../helpers/imageHelper';
 * const images = createImagesObject(
 *   import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
 * );
 */
export function createImagesObject(imageModules) {
  const images = {};
  for (const path in imageModules) {
    const fileName = path.split('/').pop();
    images[fileName] = imageModules[path];
  }
  return images;
}



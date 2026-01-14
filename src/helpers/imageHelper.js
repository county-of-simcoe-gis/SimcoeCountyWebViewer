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

/**
 * Helper to process Vite's import.meta.glob results into pre-loaded HTMLImageElement objects
 * This is useful for OpenLayers icons where passing a pre-loaded Image object avoids
 * repeated network requests when creating new Style/Icon objects.
 * 
 * @param {Object} imageModules - Result from import.meta.glob()
 * @param {boolean} toLowerCase - Whether to convert filenames to lowercase
 * @returns {Object} - Object with filename as key and object containing {url, img} as value
 * 
 * @example
 * import { createPreloadedImagesObject } from '../helpers/imageHelper';
 * const images = createPreloadedImagesObject(
 *   import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
 * );
 * // Use in OpenLayers Icon: new Icon({ img: images["icon.png"].img, imgSize: [width, height] })
 */
export function createPreloadedImagesObject(imageModules, toLowerCase = false) {
  const images = {};
  for (const path in imageModules) {
    let fileName = path.split('/').pop();
    if (toLowerCase) {
      fileName = fileName.toLowerCase();
    }
    const url = imageModules[path];
    // Create and preload the HTMLImageElement
    const img = new Image();
    img.src = url;
    images[fileName] = { url, img };
  }
  return images;
}


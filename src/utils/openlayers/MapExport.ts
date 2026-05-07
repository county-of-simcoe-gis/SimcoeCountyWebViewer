/**
 * MapExport - Alternative to inkmap that uses OpenLayers' built-in rendering
 * This avoids CORS issues by using the already-rendered map canvas
 */

import { useMapStore } from "@/stores/mapStore";

export interface ExportOptions {
  format?: 'png' | 'jpeg';
  scale?: number;  // Scale multiplier for resolution (e.g. 2 for 2x resolution)
  filename?: string;
}

/**
 * Exports the current map view as an image using OpenLayers' canvas rendering
 * This method works even with CORS-restricted WMS layers because it uses
 * the already-rendered canvas instead of re-fetching tiles
 */
export async function exportMapAsImage(options: ExportOptions = {}): Promise<Blob> {
  const { format = 'png', scale = 1 } = options;
  const map = useMapStore.getState().map;
  
  if (!map) {
    throw new Error('Map not available');
  }

  return new Promise((resolve, reject) => {
    try {
      // Wait for the map to finish rendering
      map.once('rendercomplete', () => {
        try {
          const mapCanvas = document.createElement('canvas');
          const size = map.getSize();
          
          if (!size) {
            throw new Error('Could not get map size');
          }

          // Apply scale for higher resolution
          mapCanvas.width = size[0] * scale;
          mapCanvas.height = size[1] * scale;
          
          const mapContext = mapCanvas.getContext('2d');
          if (!mapContext) {
            throw new Error('Could not get canvas context');
          }

          // Scale the context if needed
          if (scale !== 1) {
            mapContext.scale(scale, scale);
          }

          // Get all canvas elements from the map
          const canvases = document.querySelectorAll('.ol-layer canvas, canvas.ol-layer');
          
          Array.from(canvases).forEach((canvas) => {
            if (canvas instanceof HTMLCanvasElement) {
              const opacity = (canvas.parentNode as HTMLElement)?.style.opacity || '1';
              mapContext.globalAlpha = parseFloat(opacity);
              
              // Get the transform to properly position the canvas
              const transform = (canvas.style.transform || canvas.style.webkitTransform || '').match(/matrix\\((.+)\\)/);
              
              if (transform && transform[1]) {
                const matrix = transform[1].split(',').map(Number);
                mapContext.setTransform(
                  matrix[0],
                  matrix[1],
                  matrix[2],
                  matrix[3],
                  matrix[4],
                  matrix[5]
                );
              }
              
              try {
                mapContext.drawImage(canvas, 0, 0);
              } catch (e) {
                console.warn('Could not draw canvas layer:', e);
                // Continue with other layers
              }
              
              // Reset transform for next canvas
              mapContext.setTransform(1, 0, 0, 1, 0, 0);
            }
          });

          // Convert canvas to blob
          mapCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Could not create image blob'));
              }
            },
            format === 'jpeg' ? 'image/jpeg' : 'image/png',
            0.95
          );
        } catch (error) {
          reject(error);
        }
      });

      // Trigger a render
      map.renderSync();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exports the map with a specific size (for printing)
 * This temporarily resizes the map, captures it, then restores the original size
 */
export async function exportMapWithSize(
  width: number,
  height: number,
  options: ExportOptions = {}
): Promise<Blob> {
  const map = useMapStore.getState().map;
  
  if (!map) {
    throw new Error('Map not available');
  }

  // Store original size
  const originalSize = map.getSize();
  const mapElement = map.getTargetElement();
  
  if (!mapElement || !originalSize) {
    throw new Error('Could not get map element or size');
  }

  // Store original styles
  const originalWidth = mapElement.style.width;
  const originalHeight = mapElement.style.height;

  try {
    // Temporarily resize the map
    mapElement.style.width = `${width}px`;
    mapElement.style.height = `${height}px`;
    map.updateSize();

    // Wait for OpenLayers to finish rendering at the new size, instead of
    // guessing with an arbitrary 100ms delay.
    await new Promise<void>((resolve) => {
      map.once("rendercomplete", () => resolve());
    });

    // Export the resized map
    const blob = await exportMapAsImage(options);

    return blob;
  } finally {
    // Restore original size
    mapElement.style.width = originalWidth;
    mapElement.style.height = originalHeight;
    map.updateSize();
  }
}




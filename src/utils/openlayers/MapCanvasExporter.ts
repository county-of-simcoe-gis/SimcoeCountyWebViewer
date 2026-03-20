/**
 * MapCanvasExporter - Capture and export rendered map canvas at high resolution
 * 
 * This is a simpler alternative to inkmap that works by:
 * 1. Temporarily increasing map resolution/size
 * 2. Waiting for the map to re-render
 * 3. Capturing the canvas as an image
 * 4. Restoring original map settings
 * 
 * ADVANTAGES over layer reconstruction:
 * - Works with ALL layer types (WMTS, vector styles, everything)
 * - Captures exactly what the user sees
 * - Much simpler implementation
 * - No layer-specific conversion needed
 * 
 * LIMITATIONS:
 * - Temporarily changes visible map (brief flicker)
 * - Limited by browser canvas size limits (~16384px)
 * - May have CORS issues with external tile sources
 */

import type Map from "ol/Map";
import { getPointResolution } from "ol/proj";


export type DecorationPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "none";

export interface MapDecorations {
  /**
   * Show scale bar
   */
  scaleBar?: DecorationPosition;

  /**
   * Show north arrow
   */
  northArrow?: DecorationPosition;

  /**
   * Show attributions
   */
  attributions?: DecorationPosition;

  /**
   * Show title
   */
  title?: string;

  /**
   * Title position (default: top-center)
   */
  titlePosition?: DecorationPosition;
}

export interface ExportOptions {
  /**
   * Target DPI for export (default: 300)
   */
  dpi?: number;

  /**
   * Output width in pixels (if not specified, calculated from scale)
   */
  width?: number;

  /**
   * Output height in pixels (if not specified, calculated from scale)
   */
  height?: number;

  /**
   * Map scale to preserve (if not specified, uses current scale)
   */
  scale?: number;

  /**
   * Whether to preserve current extent instead of scale
   */
  preserveExtent?: boolean;

  /**
   * Output format: 'image/png' or 'image/jpeg'
   */
  format?: string;

  /**
   * JPEG quality (0-1, only for JPEG format)
   */
  quality?: number;

  /**
   * Map decorations (scalebar, north arrow, etc.)
   */
  decorations?: MapDecorations;
}

export interface ExportProgress {
  step: "preparing" | "rendering" | "capturing" | "decorating" | "complete";
  message: string;
}

/**
 * Calculate position coordinates for decorations
 */
function getDecorationPosition(
  position: DecorationPosition,
  canvasWidth: number,
  canvasHeight: number,
  decorationWidth: number,
  decorationHeight: number,
  margin: number = 20
): { x: number; y: number } {
  const positions: Record<DecorationPosition, { x: number; y: number }> = {
    "top-left": { x: margin, y: margin },
    "top-center": { x: (canvasWidth - decorationWidth) / 2, y: margin },
    "top-right": { x: canvasWidth - decorationWidth - margin, y: margin },
    "bottom-left": { x: margin, y: canvasHeight - decorationHeight - margin },
    "bottom-center": {
      x: (canvasWidth - decorationWidth) / 2,
      y: canvasHeight - decorationHeight - margin,
    },
    "bottom-right": {
      x: canvasWidth - decorationWidth - margin,
      y: canvasHeight - decorationHeight - margin,
    },
    none: { x: 0, y: 0 },
  };

  return positions[position];
}

/**
 * Draw a scale bar on the canvas
 */
function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  map: Map,
  position: DecorationPosition,
  canvasWidth: number,
  canvasHeight: number,
  dpi: number
) {
  if (position === "none") return;

  const view = map.getView();
  const projection = view.getProjection();
  const resolution = view.getResolution();
  const center = view.getCenter();

  if (!resolution || !center) return;

  // Calculate scale in meters per pixel
  const pointResolution = getPointResolution(projection, resolution, center);

  // Determine scale bar length (aim for ~150-200 pixels at display DPI)
  const targetPixels = 150 * (dpi / 96);
  const targetMeters = pointResolution * targetPixels;

  // Round to nice number
  const niceNumbers = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  let scaleMeters = niceNumbers[0];
  for (const num of niceNumbers) {
    if (num <= targetMeters) {
      scaleMeters = num;
    } else {
      break;
    }
  }

  const scalePixels = scaleMeters / pointResolution;
  const scaleBarWidth = scalePixels;
  const scaleBarHeight = 15;

  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, scaleBarWidth + 40, scaleBarHeight + 30, 20);

  // Draw background
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(pos.x - 10, pos.y - 10, scaleBarWidth + 60, scaleBarHeight + 40);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pos.x - 10, pos.y - 10, scaleBarWidth + 60, scaleBarHeight + 40);

  // Draw scale bar
  ctx.fillStyle = "#000";
  ctx.fillRect(pos.x + 20, pos.y + 5, scalePixels, scaleBarHeight);

  // Draw alternating pattern
  ctx.fillStyle = "#fff";
  const segments = 4;
  const segmentWidth = scalePixels / segments;
  for (let i = 0; i < segments; i += 2) {
    ctx.fillRect(pos.x + 20 + i * segmentWidth, pos.y + 5, segmentWidth, scaleBarHeight);
  }

  // Draw border
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(pos.x + 20, pos.y + 5, scalePixels, scaleBarHeight);

  // Draw text
  ctx.fillStyle = "#000";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  const label = scaleMeters >= 1000 ? `${scaleMeters / 1000} km` : `${scaleMeters} m`;
  ctx.fillText(label, pos.x + 20 + scalePixels / 2, pos.y + scaleBarHeight + 22);
}

/**
 * Draw a north arrow on the canvas
 */
function drawNorthArrow(
  ctx: CanvasRenderingContext2D,
  position: DecorationPosition,
  canvasWidth: number,
  canvasHeight: number,
  rotation: number = 0
) {
  if (position === "none") return;

  const arrowSize = 60;
  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, arrowSize, arrowSize, 20);

  const centerX = pos.x + arrowSize / 2;
  const centerY = pos.y + arrowSize / 2;

  // Draw background circle
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, arrowSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-rotation);

  // Draw arrow
  ctx.beginPath();
  ctx.moveTo(0, -arrowSize / 2 + 10);
  ctx.lineTo(-arrowSize / 6, arrowSize / 4);
  ctx.lineTo(0, arrowSize / 6);
  ctx.lineTo(arrowSize / 6, arrowSize / 4);
  ctx.closePath();

  // Fill north side (red)
  ctx.fillStyle = "#d32f2f";
  ctx.fill();

  // Draw outline
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw 'N' label
  ctx.fillStyle = "#000";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 0, -arrowSize / 2 + 5);

  ctx.restore();
}

/**
 * Draw attributions on the canvas
 */
function drawAttributions(
  ctx: CanvasRenderingContext2D,
  map: Map,
  position: DecorationPosition,
  canvasWidth: number,
  canvasHeight: number
) {
  if (position === "none") return;

  // Collect attributions from all layers
  const attributions = new Set<string>();
  map.getAllLayers().forEach((layer) => {
    const source = layer.getSource();
    if (source) {
      const sourceAttributions = source.getAttributions();
      if (sourceAttributions) {
        const attrFunc = sourceAttributions;
        if (typeof attrFunc === "function") {
          const attrs = attrFunc(null);
          if (attrs) {
            attrs.forEach((attr) => {
              const text = typeof attr === "string" ? attr : attr.innerHTML || "";
              // Remove HTML tags
              const cleanText = text.replace(/<[^>]*>/g, "");
              if (cleanText.trim()) {
                attributions.add(cleanText.trim());
              }
            });
          }
        }
      }
    }
  });

  if (attributions.size === 0) return;

  const text = Array.from(attributions).join(" | ");
  
  // Measure text
  ctx.font = "10px Arial";
  const textMetrics = ctx.measureText(text);
  const textWidth = Math.min(textMetrics.width + 20, canvasWidth - 40);
  const textHeight = 25;

  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, textWidth, textHeight, 20);

  // Draw background
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(pos.x, pos.y, textWidth, textHeight);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pos.x, pos.y, textWidth, textHeight);

  // Draw text (truncate if too long)
  ctx.fillStyle = "#000";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  
  // Truncate text if it's too long
  let displayText = text;
  if (textMetrics.width > canvasWidth - 60) {
    while (ctx.measureText(displayText + "...").width > canvasWidth - 60 && displayText.length > 0) {
      displayText = displayText.slice(0, -1);
    }
    displayText += "...";
  }
  
  ctx.fillText(displayText, pos.x + 10, pos.y + textHeight / 2);
}

/**
 * Draw title on the canvas
 */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  position: DecorationPosition,
  canvasWidth: number,
  canvasHeight: number
) {
  if (position === "none" || !title) return;

  // Measure text
  ctx.font = "bold 24px Arial";
  const textMetrics = ctx.measureText(title);
  const textWidth = textMetrics.width + 40;
  const textHeight = 40;

  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, textWidth, textHeight, 20);

  // Draw background
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(pos.x, pos.y, textWidth, textHeight);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(pos.x, pos.y, textWidth, textHeight);

  // Draw text
  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, pos.x + textWidth / 2, pos.y + textHeight / 2);
}

/**
 * Export the map canvas at high resolution
 */
export async function exportMapCanvas(
  map: Map,
  options: ExportOptions = {},
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const {
    dpi = 300,
    format = "image/png",
    quality = 0.95,
    preserveExtent = false,
  } = options;

  // Store original map settings
  const originalSize = map.getSize();
  const originalView = map.getView();
  const originalCenter = originalView.getCenter();
  const originalResolution = originalView.getResolution();
  const originalRotation = originalView.getRotation();

  if (!originalSize || !originalCenter || !originalResolution) {
    throw new Error("Map not properly initialized");
  }

  onProgress?.({
    step: "preparing",
    message: "Calculating export dimensions...",
  });

  // Calculate export dimensions
  let exportWidth = options.width;
  let exportHeight = options.height;

  if (!exportWidth || !exportHeight) {
    // Calculate based on current map size and DPI multiplier
    const dpiMultiplier = dpi / 96; // 96 is standard screen DPI
    exportWidth = Math.round(originalSize[0] * dpiMultiplier);
    exportHeight = Math.round(originalSize[1] * dpiMultiplier);
  }

  // Check browser canvas size limits
  const MAX_CANVAS_SIZE = 16384;
  if (exportWidth > MAX_CANVAS_SIZE || exportHeight > MAX_CANVAS_SIZE) {
    const scale = MAX_CANVAS_SIZE / Math.max(exportWidth, exportHeight);
    exportWidth = Math.round(exportWidth * scale);
    exportHeight = Math.round(exportHeight * scale);
    console.warn(
      `Export size exceeds browser limits, scaled down to ${exportWidth}x${exportHeight}`
    );
  }

  console.log(`Exporting map at ${exportWidth}x${exportHeight} (${dpi} DPI)`);

  return new Promise((resolve, reject) => {
    try {
      onProgress?.({
        step: "preparing",
        message: "Resizing map for export...",
      });

      // Calculate new resolution to maintain scale or extent
      let newResolution = originalResolution;

      if (preserveExtent) {
        // Maintain extent - adjust resolution based on new size
        const widthRatio = exportWidth / originalSize[0];
        const heightRatio = exportHeight / originalSize[1];
        newResolution = originalResolution / Math.min(widthRatio, heightRatio);
      } else {
        // Maintain scale - adjust resolution based on DPI increase
        const dpiRatio = 96 / dpi;
        newResolution = originalResolution * dpiRatio;
      }

      // Temporarily resize the map
      map.setSize([exportWidth, exportHeight]);
      originalView.setResolution(newResolution);

      onProgress?.({
        step: "rendering",
        message: "Rendering map at high resolution...",
      });

      // Function to check if all tiles are loaded
      const checkTilesLoaded = (): { allLoaded: boolean; loadingCount: number } => {
        let allLoaded = true;
        let loadingCount = 0;
        map.getAllLayers().forEach((layer) => {
          const source = layer.getSource();
          if (source && typeof source.getState === "function") {
            const state = source.getState();
            if (state === "loading") {
              allLoaded = false;
              loadingCount++;
            }
          }
        });
        return { allLoaded, loadingCount };
      };

      // Wait for the map to finish rendering at the new size
      let renderCompleteCount = 0;
      const handleRenderComplete = () => {
        renderCompleteCount++;

        // Check if tiles are still loading
        const { allLoaded: tilesLoaded, loadingCount } = checkTilesLoaded();

        console.log(
          `Render complete ${renderCompleteCount}, tiles loaded: ${tilesLoaded}, loading: ${loadingCount}`
        );

        // Update progress
        if (!tilesLoaded) {
          onProgress?.({
            step: "rendering",
            message: `Loading tiles (${loadingCount} sources loading)...`,
          });
        }

        // Wait for at least 2 render complete events AND all tiles loaded
        // This ensures tiles have time to load at the new resolution
        if (renderCompleteCount < 2 || !tilesLoaded) {
          map.once("rendercomplete", handleRenderComplete);
          return;
        }

        onProgress?.({
          step: "rendering",
          message: "Finalizing render...",
        });

        // Add a small delay to ensure tiles are painted to canvas
        // Some browsers need a frame or two for tiles to actually appear
        setTimeout(() => {
          try {
            onProgress?.({
              step: "capturing",
              message: "Capturing canvas...",
            });

          // Get all canvas elements (OpenLayers may use multiple layers)
          const mapCanvas = document.createElement("canvas");
          mapCanvas.width = exportWidth;
          mapCanvas.height = exportHeight;

          const mapContext = mapCanvas.getContext("2d");
          if (!mapContext) {
            throw new Error("Failed to get canvas context");
          }

          // Composite all map canvas layers
          const canvases = map
            .getViewport()
            .querySelectorAll(".ol-layer canvas, canvas.ol-layer");

          if (canvases.length === 0) {
            throw new Error("No canvas elements found in map viewport");
          }

          canvases.forEach((canvas) => {
            if (canvas instanceof HTMLCanvasElement) {
              const opacity = canvas.parentElement?.style.opacity || "1";
              mapContext.globalAlpha = parseFloat(opacity);
              mapContext.drawImage(canvas, 0, 0);
            }
          });

          // Reset global alpha
          mapContext.globalAlpha = 1.0;

          // Draw decorations if requested
          if (options.decorations) {
            onProgress?.({
              step: "decorating",
              message: "Adding map decorations...",
            });

            const decorations = options.decorations;
            const rotation = originalView.getRotation();

            // Draw title first (usually at top)
            if (decorations.title) {
              drawTitle(
                mapContext,
                decorations.title,
                decorations.titlePosition || "top-center",
                exportWidth,
                exportHeight
              );
            }

            // Draw scale bar
            if (decorations.scaleBar && decorations.scaleBar !== "none") {
              drawScaleBar(mapContext, map, decorations.scaleBar, exportWidth, exportHeight, dpi);
            }

            // Draw north arrow
            if (decorations.northArrow && decorations.northArrow !== "none") {
              drawNorthArrow(mapContext, decorations.northArrow, exportWidth, exportHeight, rotation);
            }

            // Draw attributions
            if (decorations.attributions && decorations.attributions !== "none") {
              drawAttributions(mapContext, map, decorations.attributions, exportWidth, exportHeight);
            }
          }

          onProgress?.({
            step: "complete",
            message: "Converting to blob...",
          });

          // Convert to blob
          mapCanvas.toBlob(
            (blob) => {
              // Restore original map settings
              map.setSize(originalSize);
              originalView.setCenter(originalCenter);
              originalView.setResolution(originalResolution);
              originalView.setRotation(originalRotation);

              if (blob) {
                console.log(`Export complete: ${blob.size} bytes`);
                resolve(blob);
              } else {
                reject(new Error("Failed to create blob from canvas"));
              }
            },
            format,
            quality
          );
          } catch (error) {
            // Restore original settings on error
            map.setSize(originalSize);
            originalView.setCenter(originalCenter);
            originalView.setResolution(originalResolution);
            originalView.setRotation(originalRotation);
            reject(error);
          }
        }, 250); // 250ms delay to ensure tiles are painted
      };

      map.once("rendercomplete", handleRenderComplete);

      // Trigger a render
      map.render();

      // Also add a safety timeout in case rendercomplete doesn't fire
      setTimeout(() => {
        if (renderCompleteCount === 0) {
          console.warn("Render timeout - capturing anyway");
          handleRenderComplete();
        }
      }, 5000); // 5 second safety timeout
    } catch (error) {
      // Restore original settings on error
      map.setSize(originalSize);
      originalView.setCenter(originalCenter);
      originalView.setResolution(originalResolution);
      originalView.setRotation(originalRotation);
      reject(error);
    }
  });
}

/**
 * Export map to data URL
 */
export async function exportMapDataURL(
  map: Map,
  options: ExportOptions = {}
): Promise<string> {
  const blob = await exportMapCanvas(map, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


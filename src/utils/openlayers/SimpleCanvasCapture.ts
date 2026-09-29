/**
 * SimpleCanvasCapture - Safe, read-only canvas capture for map printing
 *
 * This utility captures the current map canvas without modifying ANY map state.
 * It is designed to be completely safe and never cause the map to become blank.
 *
 * KEY PRINCIPLE: Never call any method on the map that could change its state.
 * - No map.render()
 * - No map.updateSize()
 * - No map.setSize()
 * - No layer visibility changes
 * - No view modifications
 */

import type Map from "ol/Map";
import { getPointResolution } from "ol/proj";
import { htmlToText } from "@/utils/helpersCore";

export type DecorationPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "none";

export interface MapDecorations {
  title?: string;
  titlePosition?: DecorationPosition;
  scaleBar?: DecorationPosition;
  northArrow?: DecorationPosition;
  attributions?: DecorationPosition;
}

export interface CaptureOptions {
  /** Target width for output (scales from screen size) */
  width?: number;
  /** Target height for output (scales from screen size) */
  height?: number;
  /** Output format */
  format?: "image/png" | "image/jpeg";
  /** JPEG quality (0-1) */
  quality?: number;
  /** Map decorations to add */
  decorations?: MapDecorations;
}

export interface CaptureProgress {
  step: "capturing" | "scaling" | "decorating" | "complete";
  message: string;
}

/**
 * Get position coordinates for decorations
 */
function getDecorationPosition(
  position: DecorationPosition,
  canvasWidth: number,
  canvasHeight: number,
  decorationWidth: number,
  decorationHeight: number,
  margin: number = 20,
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
 * Draw title on canvas
 */
function drawTitle(ctx: CanvasRenderingContext2D, title: string, position: DecorationPosition, canvasWidth: number, canvasHeight: number) {
  if (position === "none" || !title) return;

  ctx.font = "bold 24px Arial";
  const textMetrics = ctx.measureText(title);
  const textWidth = textMetrics.width + 40;
  const textHeight = 40;

  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, textWidth, textHeight, 20);

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(pos.x, pos.y, textWidth, textHeight);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(pos.x, pos.y, textWidth, textHeight);

  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, pos.x + textWidth / 2, pos.y + textHeight / 2);
}

/**
 * Draw scale bar on canvas
 */
function drawScaleBar(ctx: CanvasRenderingContext2D, map: Map, position: DecorationPosition, canvasWidth: number, canvasHeight: number, scaleFactor: number) {
  if (position === "none") return;

  const view = map.getView();
  const projection = view.getProjection();
  const resolution = view.getResolution();
  const center = view.getCenter();

  if (!resolution || !center) return;

  const pointResolution = getPointResolution(projection, resolution, center);

  // Adjust for scale factor (since we're scaling the canvas)
  const adjustedResolution = pointResolution / scaleFactor;

  const targetPixels = 150;
  const targetMeters = adjustedResolution * targetPixels;

  const niceNumbers = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  let scaleMeters = niceNumbers[0];
  for (const num of niceNumbers) {
    if (num <= targetMeters) {
      scaleMeters = num;
    } else {
      break;
    }
  }

  const scalePixels = scaleMeters / adjustedResolution;
  const scaleBarHeight = 15;

  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, scalePixels + 40, scaleBarHeight + 30, 20);

  // Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(pos.x - 10, pos.y - 10, scalePixels + 60, scaleBarHeight + 40);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pos.x - 10, pos.y - 10, scalePixels + 60, scaleBarHeight + 40);

  // Scale bar
  ctx.fillStyle = "#000";
  ctx.fillRect(pos.x + 20, pos.y + 5, scalePixels, scaleBarHeight);

  // Alternating pattern
  ctx.fillStyle = "#fff";
  const segments = 4;
  const segmentWidth = scalePixels / segments;
  for (let i = 0; i < segments; i += 2) {
    ctx.fillRect(pos.x + 20 + i * segmentWidth, pos.y + 5, segmentWidth, scaleBarHeight);
  }

  // Border
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(pos.x + 20, pos.y + 5, scalePixels, scaleBarHeight);

  // Label
  ctx.fillStyle = "#000";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  const label = scaleMeters >= 1000 ? `${scaleMeters / 1000} km` : `${scaleMeters} m`;
  ctx.fillText(label, pos.x + 20 + scalePixels / 2, pos.y + scaleBarHeight + 22);
}

/**
 * Draw north arrow on canvas
 */
function drawNorthArrow(ctx: CanvasRenderingContext2D, position: DecorationPosition, canvasWidth: number, canvasHeight: number, rotation: number) {
  if (position === "none") return;

  const arrowSize = 60;
  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, arrowSize, arrowSize, 20);

  const centerX = pos.x + arrowSize / 2;
  const centerY = pos.y + arrowSize / 2;

  // Background circle
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

  // Arrow
  ctx.beginPath();
  ctx.moveTo(0, -arrowSize / 2 + 10);
  ctx.lineTo(-arrowSize / 6, arrowSize / 4);
  ctx.lineTo(0, arrowSize / 6);
  ctx.lineTo(arrowSize / 6, arrowSize / 4);
  ctx.closePath();

  ctx.fillStyle = "#d32f2f";
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 'N' label
  ctx.fillStyle = "#000";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 0, -arrowSize / 2 + 5);

  ctx.restore();
}

/**
 * Draw attributions on canvas
 */
function drawAttributions(ctx: CanvasRenderingContext2D, map: Map, position: DecorationPosition, canvasWidth: number, canvasHeight: number) {
  if (position === "none") return;

  // Collect attributions (read-only operation)
  const attributions = new Set<string>();

  try {
    const view = map.getView();
    const extent = view.calculateExtent(map.getSize());
    const frameState = {
      extent: extent,
      viewState: {
        center: view.getCenter(),
        resolution: view.getResolution(),
        projection: view.getProjection(),
        rotation: view.getRotation(),
      },
    };

    map.getAllLayers().forEach((layer) => {
      const source = layer.getSource();
      if (source) {
        try {
          const sourceAttributions = source.getAttributions();
          if (sourceAttributions && typeof sourceAttributions === "function") {
            const attrs = sourceAttributions(frameState as unknown as import("ol/Map").FrameState);
            if (attrs) {
              attrs.forEach((attr) => {
                const text = typeof attr === "string" ? attr : (attr as { innerHTML?: string }).innerHTML || "";
                const cleanText = htmlToText(text);
                if (cleanText.trim()) {
                  attributions.add(cleanText.trim());
                }
              });
            }
          }
        } catch {
          // Ignore errors from individual sources
        }
      }
    });
  } catch {
    // If we can't get attributions, just skip
    return;
  }

  if (attributions.size === 0) return;

  const text = Array.from(attributions).join(" | ");

  ctx.font = "10px Arial";
  const textMetrics = ctx.measureText(text);
  const textWidth = Math.min(textMetrics.width + 20, canvasWidth - 40);
  const textHeight = 25;

  const pos = getDecorationPosition(position, canvasWidth, canvasHeight, textWidth, textHeight, 20);

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillRect(pos.x, pos.y, textWidth, textHeight);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pos.x, pos.y, textWidth, textHeight);

  ctx.fillStyle = "#000";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

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
 * Capture the map canvas without modifying any map state
 *
 * This function is completely safe and will never cause the map to become blank.
 */
export async function captureMapCanvas(map: Map, options: CaptureOptions = {}, onProgress?: (progress: CaptureProgress) => void): Promise<Blob> {
  const { format = "image/png", quality = 0.95 } = options;

  onProgress?.({
    step: "capturing",
    message: "Capturing map canvas...",
  });

  // Get current map size (read-only)
  const mapSize = map.getSize();
  if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) {
    throw new Error("Map has no size");
  }

  const sourceWidth = mapSize[0];
  const sourceHeight = mapSize[1];

  // Determine target size
  let targetWidth = options.width || sourceWidth;
  let targetHeight = options.height || sourceHeight;

  // Cap at browser limits
  const MAX_SIZE = 16384;
  if (targetWidth > MAX_SIZE || targetHeight > MAX_SIZE) {
    const scale = MAX_SIZE / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  // Create capture canvas at source size
  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = sourceWidth;
  captureCanvas.height = sourceHeight;
  const captureCtx = captureCanvas.getContext("2d");

  if (!captureCtx) {
    throw new Error("Could not create canvas context");
  }

  // Fill with white background
  captureCtx.fillStyle = "#ffffff";
  captureCtx.fillRect(0, 0, sourceWidth, sourceHeight);

  // Find and copy all map canvas elements (READ-ONLY operation)
  const viewport = map.getViewport();
  const canvases = viewport.querySelectorAll(".ol-layer canvas, canvas.ol-layer");

  if (canvases.length === 0) {
    throw new Error("No canvas elements found in map");
  }

  console.log(`[SimpleCapture] Found ${canvases.length} canvas elements`);

  // Draw each canvas layer (READ-ONLY - this does NOT modify the source canvases)
  let successCount = 0;
  canvases.forEach((canvas, index) => {
    if (canvas instanceof HTMLCanvasElement) {
      try {
        // Get opacity from parent element (read-only)
        const opacity = canvas.parentElement?.style.opacity || "1";
        captureCtx.globalAlpha = parseFloat(opacity);

        // Draw to our new canvas (reads from source, does not modify source)
        captureCtx.drawImage(canvas, 0, 0);
        successCount++;
        console.log(`[SimpleCapture] Drew canvas ${index + 1}/${canvases.length} (opacity: ${opacity})`);
      } catch (e) {
        // CORS/tainted canvas error - this is expected for some cross-origin layers
        // It does NOT affect the original canvas, just means we can't copy it
        console.warn(`[SimpleCapture] Could not draw canvas ${index + 1} (likely CORS):`, e);
      }
    }
  });

  console.log(`[SimpleCapture] Successfully drew ${successCount}/${canvases.length} canvas layers`);

  captureCtx.globalAlpha = 1.0;

  // Scale if needed
  let finalCanvas = captureCanvas;
  let scaleFactor = 1;

  if (targetWidth !== sourceWidth || targetHeight !== sourceHeight) {
    onProgress?.({
      step: "scaling",
      message: "Scaling image...",
    });

    scaleFactor = targetWidth / sourceWidth;

    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = targetWidth;
    scaledCanvas.height = targetHeight;
    const scaledCtx = scaledCanvas.getContext("2d");

    if (scaledCtx) {
      scaledCtx.imageSmoothingEnabled = true;
      scaledCtx.imageSmoothingQuality = "high";
      scaledCtx.drawImage(captureCanvas, 0, 0, targetWidth, targetHeight);
      finalCanvas = scaledCanvas;
    }
  }

  // Add decorations
  if (options.decorations) {
    onProgress?.({
      step: "decorating",
      message: "Adding decorations...",
    });

    const ctx = finalCanvas.getContext("2d");
    if (ctx) {
      const decorations = options.decorations;
      const rotation = map.getView().getRotation();

      if (decorations.title) {
        drawTitle(ctx, decorations.title, decorations.titlePosition || "top-center", targetWidth, targetHeight);
      }

      if (decorations.scaleBar && decorations.scaleBar !== "none") {
        drawScaleBar(ctx, map, decorations.scaleBar, targetWidth, targetHeight, scaleFactor);
      }

      if (decorations.northArrow && decorations.northArrow !== "none") {
        drawNorthArrow(ctx, decorations.northArrow, targetWidth, targetHeight, rotation);
      }

      if (decorations.attributions && decorations.attributions !== "none") {
        drawAttributions(ctx, map, decorations.attributions, targetWidth, targetHeight);
      }
    }
  }

  onProgress?.({
    step: "complete",
    message: "Capture complete",
  });

  // Convert to blob
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          console.log(`[SimpleCapture] Complete: ${blob.size} bytes`);
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      format,
      quality,
    );
  });
}

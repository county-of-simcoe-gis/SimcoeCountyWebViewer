"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Overlay } from "ol";
import { Coordinate } from "ol/coordinate";
import { Style } from "ol/style";
import Circle from "ol/style/Circle";
import RegularShape from "ol/style/RegularShape";

import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { useMapStore } from "@/stores/mapStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { activateTab } from "@/utils/helpersUI";

import { getPointStyle, getLineStringStyle, getPolygonStyle } from "@/utils/openlayers/DrawingHelpers";
import MyMapsPopupLabel from "@/components/myMaps/MyMapsPopupLabel";
import MyMapsBuffer from "@/components/myMaps/MyMapsBuffer";
import MyMapsSymbolizer from "@/components/myMaps/MyMapsSymbolizer";
import MyMapsMeasure from "@/components/myMaps/MyMapsMeasure";
import FooterButtons from "@/components/myMaps/FooterButtons";
import "@/components/myMaps/DrawingOptionsPopup.css";

interface DrawingOptionsPopupProps {
  item: MyMapsItemType | null;
  coordinate: Coordinate | null;
  isOpen: boolean;
  activeTool?: string;
  onClose: () => void;
  onTools?: (item: MyMapsItemType, event?: React.MouseEvent) => void;
  onDelete?: (item: MyMapsItemType) => void;
  onLabelChange?: (id: string, label: string) => void;
  onLabelVisibilityChange?: (id: string, visible: boolean) => void;
  onLabelRotationChange?: (id: string, rotation: number) => void;
}

const DrawingOptionsPopup: React.FC<DrawingOptionsPopupProps> = ({
  item,
  coordinate,
  isOpen,
  activeTool,
  onClose,
  onTools,
  onDelete,
  onLabelChange,
  onLabelVisibilityChange,
  onLabelRotationChange,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const overlayElementRef = useRef<HTMLDivElement | null>(null);
  const lastItemIdRef = useRef<string | null>(null);
  const activeInteractionIdsRef = useRef<number[]>([]);
  const hasBeenDraggedRef = useRef<boolean>(false);
  const { map } = useMapStore();
  const { updateItem } = useMyMapsStore();
  const { emit } = useEventStore();

  // Create stable references for dependencies
  const itemId = item?.id;
  const itemLabel = item?.label;

  // Color utility function for hex conversion (used by color picker popup and state extraction)
  const hexToRgbObject = useCallback((colorStr: string): { r: number; g: number; b: number; a: number } => {
    // Handle rgba format: rgba(255, 0, 0, 0.5)
    const rgbaMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(colorStr);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1], 10),
        g: parseInt(rgbaMatch[2], 10),
        b: parseInt(rgbaMatch[3], 10),
        a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
      };
    }

    // Handle hex format: #ff0000
    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorStr);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16),
        a: 1,
      };
    }

    // Fallback
    return { r: 0, g: 0, b: 0, a: 1 };
  }, []);

  // Helper function to extract current color from DOM color button
  const extractColorFromDOMButton = useCallback(
    (buttonId: string): { r: number; g: number; b: number } => {
      const symbolizerContainer = overlayElementRef.current?.querySelector(".sc-mymaps-symbolizer-container");
      const colorButton = symbolizerContainer?.querySelector(`#${buttonId}`) as HTMLButtonElement;

      if (colorButton && colorButton.style.backgroundColor) {
        const bgColor = colorButton.style.backgroundColor;

        // Handle rgb(r, g, b) format
        if (bgColor.startsWith("rgb(")) {
          const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            return {
              r: parseInt(match[1]),
              g: parseInt(match[2]),
              b: parseInt(match[3]),
            };
          }
        }

        // Handle hex format
        if (bgColor.startsWith("#")) {
          const rgb = hexToRgbObject(bgColor);
          return { r: rgb.r, g: rgb.g, b: rgb.b };
        }
      }

      // Fallback to default colors
      return buttonId.includes("stroke") ? { r: 255, g: 255, b: 255 } : { r: 232, g: 9, b: 229 }; // Default white stroke, pink fill
    },
    [hexToRgbObject]
  );

  // Create overlay element and overlay once when first needed
  useEffect(() => {
    // Only create overlay if we don't have one yet and we have coordinates to position it
    if (!map || overlayRef.current || !coordinate) {
      return;
    }

    // Create a separate DOM element for OpenLayers that React doesn't manage
    const overlayElement = document.createElement("div");
    overlayElement.className = "ol-popup";
    overlayElement.id = "sc-window-popup-overlay";
    overlayElementRef.current = overlayElement;

    // Create overlay with the separate element
    const overlay = new Overlay({
      element: overlayElement,
      positioning: "bottom-center",
      stopEvent: true, // ✅ CRITICAL: Prevent popup events from affecting map below
      className: "ol-selectable",
      insertFirst: false,
    });

    overlayRef.current = overlay;
    map.addOverlay(overlay);
  }, [map, coordinate]);

  // Helper function to get current symbolizer state from store/item (not DOM)
  const getCurrentSymbolizerState = useCallback(() => {
    if (!item) return null;

    console.log("🔍 Getting current state from item:", item.id);

    // If item has a style, try to extract values from it
    const currentState = {
      pointType: item.pointType || "circle",
      strokeType: item.strokeType || "normal",
      radius: 8,
      fillAlpha: item.fillAlpha ?? 0.8, // Use saved fillAlpha or default
      strokeAlpha: item.strokeAlpha ?? 1.0, // Use saved strokeAlpha or default
      strokeWidth: 2,
      rotation: 0,
      fillColor: { r: 232, g: 9, b: 229, a: item.fillAlpha ?? 0.8 }, // Default pink with saved alpha
      strokeColor: { r: 255, g: 255, b: 255, a: item.strokeAlpha ?? 1.0 }, // Default white with saved alpha
    };

    // Extract current values from style object - handle the actual storage format
    if (item.style) {
      console.log("🔍 Reading style object:", item.style);

      // Check if it's an OpenLayers Style object
      if (item.style instanceof Style) {
        console.log("🔍 Reading from OpenLayers Style object using public API");
        console.log("🔍 Full OpenLayers Style object:", item.style);

        // POINTS: Use image styles (existing logic)
        const imageStyle = item.style.getImage();
        console.log("🔍 ImageStyle from getImage():", imageStyle);

        // LINES & POLYGONS: Use direct fill/stroke styles
        const directFill = item.style.getFill();
        const directStroke = item.style.getStroke();
        console.log("🔍 Direct Fill/Stroke from style:", { directFill, directStroke });

        if (imageStyle) {
          // Handle CircleStyle
          if (imageStyle instanceof Circle) {
            currentState.radius = imageStyle.getRadius();
            currentState.pointType = "circle";

            const fill = imageStyle.getFill();
            console.log("🔍 Circle Fill object:", fill);
            if (fill) {
              const fillColorRaw = fill.getColor();
              console.log("🔍 Circle fill color from OpenLayers (raw):", fillColorRaw, typeof fillColorRaw);

              let fillColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(fillColorRaw)) {
                // Handle array format [r, g, b, a]
                fillColor = { r: fillColorRaw[0], g: fillColorRaw[1], b: fillColorRaw[2], a: fillColorRaw[3] || 0.8 };
              } else if (typeof fillColorRaw === "string") {
                // Handle string format (hex or rgba)
                fillColor = hexToRgbObject(fillColorRaw);
              }

              if (fillColor) {
                currentState.fillColor = fillColor;
                currentState.fillAlpha = fillColor.a;
                console.log("🔍 Converted circle fill color:", currentState.fillColor);
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              currentState.strokeWidth = stroke.getWidth() || 2;
              const strokeColorRaw = stroke.getColor();
              console.log("🔍 Circle stroke color from OpenLayers (raw):", strokeColorRaw, typeof strokeColorRaw);

              let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(strokeColorRaw)) {
                // Handle array format [r, g, b, a]
                strokeColor = { r: strokeColorRaw[0], g: strokeColorRaw[1], b: strokeColorRaw[2], a: strokeColorRaw[3] || 1.0 };
              } else if (typeof strokeColorRaw === "string") {
                // Handle string format (hex or rgba)
                strokeColor = hexToRgbObject(strokeColorRaw);
              }

              if (strokeColor) {
                currentState.strokeColor = strokeColor;
                currentState.strokeAlpha = strokeColor.a;
                console.log("🔍 Converted circle stroke color:", currentState.strokeColor);
              }
            }
          }
          // Handle RegularShape
          else if (imageStyle instanceof RegularShape) {
            currentState.radius = imageStyle.getRadius();
            currentState.rotation = imageStyle.getRotation(); // Extract rotation for Angle slider!
            const points = imageStyle.getPoints();
            const radius2 = imageStyle.getRadius2();

            if (points === 4 && radius2 === 0) {
              currentState.pointType = "cross";
            } else if (points === 4 && radius2 !== 0) {
              currentState.pointType = "square";
            } else if (points === 3) {
              currentState.pointType = "triangle";
            } else if (points === 5) {
              currentState.pointType = "star";
            }

            const fill = imageStyle.getFill();
            console.log("🔍 RegularShape Fill object:", fill);
            if (fill) {
              const fillColorRaw = fill.getColor();
              console.log("🔍 RegularShape fill color from OpenLayers (raw):", fillColorRaw, typeof fillColorRaw);

              let fillColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(fillColorRaw)) {
                // Handle array format [r, g, b, a]
                fillColor = { r: fillColorRaw[0], g: fillColorRaw[1], b: fillColorRaw[2], a: fillColorRaw[3] || 0.8 };
              } else if (typeof fillColorRaw === "string") {
                // Handle string format (hex or rgba)
                fillColor = hexToRgbObject(fillColorRaw);
              }

              if (fillColor) {
                currentState.fillColor = fillColor;
                currentState.fillAlpha = fillColor.a;
                console.log("🔍 Converted RegularShape fill color:", currentState.fillColor);
              }
            }

            const stroke = imageStyle.getStroke();
            console.log("🔍 RegularShape Stroke object:", stroke);
            if (stroke) {
              currentState.strokeWidth = stroke.getWidth() || 2;
              const strokeColorRaw = stroke.getColor();
              console.log("🔍 RegularShape stroke color from OpenLayers (raw):", strokeColorRaw, typeof strokeColorRaw);

              let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(strokeColorRaw)) {
                // Handle array format [r, g, b, a]
                strokeColor = { r: strokeColorRaw[0], g: strokeColorRaw[1], b: strokeColorRaw[2], a: strokeColorRaw[3] || 1.0 };
              } else if (typeof strokeColorRaw === "string") {
                // Handle string format (hex or rgba)
                strokeColor = hexToRgbObject(strokeColorRaw);
              }

              if (strokeColor) {
                currentState.strokeColor = strokeColor;
                currentState.strokeAlpha = strokeColor.a;
                console.log("🔍 Converted RegularShape stroke color:", currentState.strokeColor);
              }
            }
          }
        }

        // LINES & POLYGONS: Handle direct fill/stroke styles (for non-point geometries)
        if (!imageStyle && (directFill || directStroke)) {
          console.log("🔍 Processing direct fill/stroke styles for line/polygon");

          // Handle direct fill (for polygons)
          if (directFill) {
            const fillColorRaw = directFill.getColor();
            console.log("🔍 Direct fill color from OpenLayers (raw):", fillColorRaw, typeof fillColorRaw);

            let fillColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(fillColorRaw)) {
              // Handle array format [r, g, b, a]
              fillColor = { r: fillColorRaw[0], g: fillColorRaw[1], b: fillColorRaw[2], a: fillColorRaw[3] || 0.8 };
            } else if (typeof fillColorRaw === "string") {
              // Handle string format (hex or rgba)
              fillColor = hexToRgbObject(fillColorRaw);
            }

            if (fillColor) {
              currentState.fillColor = fillColor;
              currentState.fillAlpha = fillColor.a;
              console.log("🔍 Converted direct fill color:", currentState.fillColor);
            }
          }

          // Handle direct stroke (for lines and polygons)
          if (directStroke) {
            const strokeColorRaw = directStroke.getColor();
            console.log("🔍 Direct stroke color from OpenLayers (raw):", strokeColorRaw, typeof strokeColorRaw);

            let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(strokeColorRaw)) {
              // Handle array format [r, g, b, a]
              strokeColor = { r: strokeColorRaw[0], g: strokeColorRaw[1], b: strokeColorRaw[2], a: strokeColorRaw[3] || 1.0 };
            } else if (typeof strokeColorRaw === "string") {
              // Handle string format (hex or rgba)
              strokeColor = hexToRgbObject(strokeColorRaw);
            }

            if (strokeColor) {
              currentState.strokeColor = strokeColor;
              currentState.strokeAlpha = strokeColor.a;
              console.log("🔍 Converted direct stroke color:", currentState.strokeColor);
            }

            // Extract stroke width and dash pattern
            const extractedWidth = directStroke.getWidth();
            currentState.strokeWidth = extractedWidth || 2;
            console.log("🔍 STROKE WIDTH DEBUG - Raw width from directStroke.getWidth():", extractedWidth, "Final strokeWidth:", currentState.strokeWidth);

            const lineDash = directStroke.getLineDash();
            if (lineDash && lineDash.length > 0) {
              if (lineDash.length === 1 && lineDash[0] === 10) {
                currentState.strokeType = "dash";
              } else if (lineDash.length === 2 && lineDash[0] === 1 && lineDash[1] === 5) {
                currentState.strokeType = "dot";
              }
            }
            console.log("🔍 Extracted stroke properties for", item.geometryType, ":", {
              strokeWidth: currentState.strokeWidth,
              strokeType: currentState.strokeType,
              lineDash,
            });
          }
        }
      } else {
        // Regular JSON object format (current storage structure)
        console.log("🔍 Reading from JSON style object format");
        const style = item.style as {
          image?: {
            fill?: { color?: string | [number, number, number, number] };
            stroke?: { color?: string | [number, number, number, number]; width?: number };
            radius?: number;
            type?: string;
            rotation?: number; // Add rotation for angle slider
          };
          fill?: { color?: string | [number, number, number, number] };
          stroke?: { color?: string | [number, number, number, number]; width?: number };
        };

        if (style.image) {
          console.log("🔍 Found style.image:", style.image);

          // Extract basic properties
          currentState.radius = style.image.radius || 8;
          currentState.rotation = style.image.rotation || 0; // Extract rotation for angle slider
          currentState.pointType = style.image.type === "circle" ? "circle" : item.pointType || "circle";

          // Extract fill color - handle both array and string formats
          if (style.image.fill && style.image.fill.color) {
            const fillColorData = style.image.fill.color;
            console.log("🔍 Found fill color:", fillColorData, typeof fillColorData);

            let fillColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(fillColorData)) {
              // Handle array format [r, g, b, a]
              fillColor = { r: fillColorData[0], g: fillColorData[1], b: fillColorData[2], a: fillColorData[3] || 0.8 };
            } else if (typeof fillColorData === "string") {
              // Handle string format (hex or rgba)
              fillColor = hexToRgbObject(fillColorData);
            }

            if (fillColor) {
              currentState.fillColor = fillColor;
              currentState.fillAlpha = fillColor.a;
              console.log("🔍 Converted JSON fill color:", fillColor);
            }
          }

          // Extract stroke properties
          if (style.image.stroke) {
            console.log("🔍 Found stroke:", style.image.stroke);

            currentState.strokeWidth = style.image.stroke.width || 2;

            // Extract stroke color - handle both array and string formats
            if (style.image.stroke.color) {
              const strokeColorData = style.image.stroke.color;
              console.log("🔍 Found stroke color:", strokeColorData, typeof strokeColorData);

              let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(strokeColorData)) {
                // Handle array format [r, g, b, a]
                strokeColor = { r: strokeColorData[0], g: strokeColorData[1], b: strokeColorData[2], a: strokeColorData[3] || 1.0 };
              } else if (typeof strokeColorData === "string") {
                // Handle string format (hex or rgba)
                strokeColor = hexToRgbObject(strokeColorData);
              }

              if (strokeColor) {
                currentState.strokeColor = strokeColor;
                currentState.strokeAlpha = strokeColor.a;
                console.log("🔍 Converted JSON stroke color:", strokeColor);
              }
            }
          }
        }

        // LINES & POLYGONS: Handle direct fill/stroke in JSON (not from image)
        if (!style.image || (item.geometryType !== "Point" && item.geometryType !== "MultiPoint")) {
          console.log("🔍 Processing direct fill/stroke from JSON for line/polygon");

          // Handle direct fill (for polygons)
          if (style.fill && style.fill.color) {
            const fillColorData = style.fill.color;
            console.log("🔍 Found direct fill color:", fillColorData, typeof fillColorData);

            let fillColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(fillColorData)) {
              // Handle array format [r, g, b, a]
              fillColor = { r: fillColorData[0], g: fillColorData[1], b: fillColorData[2], a: fillColorData[3] || 0.8 };
            } else if (typeof fillColorData === "string") {
              // Handle string format (hex or rgba)
              fillColor = hexToRgbObject(fillColorData);
            }

            if (fillColor) {
              currentState.fillColor = fillColor;
              currentState.fillAlpha = fillColor.a;
              console.log("🔍 Converted JSON direct fill color:", fillColor);
            }
          }

          // Handle direct stroke (for lines and polygons)
          if (style.stroke && style.stroke.color) {
            const strokeColorData = style.stroke.color;
            console.log("🔍 Found direct stroke color:", strokeColorData, typeof strokeColorData);

            let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(strokeColorData)) {
              // Handle array format [r, g, b, a]
              strokeColor = { r: strokeColorData[0], g: strokeColorData[1], b: strokeColorData[2], a: strokeColorData[3] || 1.0 };
            } else if (typeof strokeColorData === "string") {
              // Handle string format (hex or rgba)
              strokeColor = hexToRgbObject(strokeColorData);
            }

            if (strokeColor) {
              currentState.strokeColor = strokeColor;
              currentState.strokeAlpha = strokeColor.a;
              console.log("🔍 Converted JSON direct stroke color:", strokeColor);
            }
          }

          // Handle stroke width from direct stroke
          if (style.stroke && style.stroke.width) {
            currentState.strokeWidth = style.stroke.width;
            console.log("🔍 STROKE WIDTH DEBUG - JSON stroke width:", style.stroke.width, "Final strokeWidth:", currentState.strokeWidth);
          } else {
            console.log("🔍 STROKE WIDTH DEBUG - No stroke width found in JSON style.stroke:", style.stroke);
          }
        }
      }
    }

    console.log("🔍 Current state extracted:", currentState);
    return currentState;
  }, [item, hexToRgbObject]);

  // Geometry-aware style creation function for all feature types
  const createPointStyleFromHelpers = useCallback(
    (pointType: string, radius: number, strokeColor: [number, number, number, number], strokeWidth: number, fillColor: [number, number, number, number], rotation: number, strokeType: string) => {
      if (!item) {
        // Fallback to point style if no item
        return getPointStyle(pointType, radius, strokeColor, strokeWidth, fillColor, rotation, strokeType);
      }

      console.log("🎨 Creating style for geometry type:", item.geometryType, { pointType, strokeType, strokeColor, fillColor });

      // Use geometry type to determine correct styling function
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        return getPointStyle(pointType, radius, strokeColor, strokeWidth, fillColor, rotation, strokeType);
      } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        return getLineStringStyle(strokeColor, strokeWidth, strokeType);
      } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
        return getPolygonStyle(strokeColor, strokeWidth, fillColor, strokeType);
      } else {
        // Fallback to point style for unknown geometry types
        console.warn("Unknown geometry type:", item.geometryType, "falling back to point style");
        return getPointStyle(pointType, radius, strokeColor, strokeWidth, fillColor, rotation, strokeType);
      }
    },
    [item]
  );

  // Function to update symbolizer point type
  const updateSymbolizerPointType = useCallback(
    (itemId: string, newPointType: string) => {
      if (!item) return;

      console.log("🎯 Updating symbolizer point type:", { itemId, newPointType });

      // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
      const symbolizerContainer = overlayElementRef.current?.querySelector(".sc-mymaps-symbolizer-container");
      const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
      const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

      // Get current state from store/item (not DOM)
      const state = getCurrentSymbolizerState();
      if (!state) return;

      // Read ALL current values from DOM to prevent any resets
      const sizeSlider = symbolizerContainer?.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
      const currentRadius = sizeSlider ? parseFloat(sizeSlider.value) : state.radius;

      // Get ALL slider values from DOM using positional selectors
      const allSliders = symbolizerContainer?.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
      let currentFillAlpha = state.fillAlpha;
      let currentStrokeAlpha = state.strokeAlpha;
      let currentStrokeWidth = state.strokeWidth;
      let currentRotation = state.rotation;

      if (allSliders && allSliders.length > 1) {
        // Order: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation
        if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
        if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
        if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
        if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
      }

      // Read current colors from DOM color buttons
      const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
      const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

      console.log("🔍 Current state before point type update:", state);
      console.log("🔧 Using DOM values for point type change:", {
        pointType: newPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        fillAlpha: currentFillAlpha,
        strokeAlpha: currentStrokeAlpha,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
      });

      // Create new style with updated point type using ALL current DOM values
      const style = createPointStyleFromHelpers(
        newPointType, // Use the new point type
        currentRadius, // Use current radius from DOM
        [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha], // Use current values
        currentStrokeWidth, // Use current stroke width from DOM
        [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha], // Use current values
        currentRotation, // Use current rotation from DOM
        currentStrokeType // Use current stroke type from DOM
      );

      // Update the item in the store with the full OpenLayers style object
      const updates = {
        style: style,
        pointType: newPointType,
        strokeType: currentStrokeType,
      };

      console.log("🎯 Updating item in store with new point type:", { itemId, updates, style });
      updateItem(itemId, updates);

      // Emit event to refresh the feature on the map
      emit("mymap-style-updated", { itemId, style, pointType: newPointType });
      console.log("🔄 Emitted mymap-style-updated event for point type change:", itemId);
    },
    [item, updateItem, emit, getCurrentSymbolizerState, createPointStyleFromHelpers, extractColorFromDOMButton]
  );

  // Function to update symbolizer fill color
  const updateSymbolizerFillColor = useCallback(
    (itemId: string, newColor: { r: number; g: number; b: number }) => {
      if (!item) return;

      console.log("🎯 Updating symbolizer fill color:", { itemId, newColor });

      // CRITICAL FIX: Get current dropdown values AND slider values from DOM to preserve all current settings
      const symbolizerContainer = overlayElementRef.current?.querySelector(".sc-mymaps-symbolizer-container");
      const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
      const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

      const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
      const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

      // Get current state from store/item (not DOM)
      const state = getCurrentSymbolizerState();
      if (!state) return;

      // Read ALL current values from DOM to prevent any resets
      const sizeSlider = symbolizerContainer?.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
      const currentRadius = sizeSlider ? parseFloat(sizeSlider.value) : state.radius;

      // Get ALL slider values from DOM using positional selectors
      const allSliders = symbolizerContainer?.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
      let currentFillAlpha = state.fillAlpha;
      let currentStrokeAlpha = state.strokeAlpha;
      let currentStrokeWidth = state.strokeWidth;
      let currentRotation = state.rotation;

      if (allSliders && allSliders.length > 1) {
        // Order: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation
        if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
        if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
        if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
        if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
      }

      // Read current stroke color from DOM
      const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

      console.log("🔍 Current state before fill color update:", state);
      console.log("🔧 Using DOM values for fill color:", {
        pointType: currentPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        fillAlpha: currentFillAlpha,
        strokeAlpha: currentStrokeAlpha,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
      });

      // Update the fill color in state and override all values with DOM values
      const updatedState = {
        ...state,
        fillColor: { ...newColor, a: currentFillAlpha }, // Use DOM alpha
        strokeColor: { ...currentStrokeColor, a: currentStrokeAlpha }, // Use DOM stroke color and alpha
        pointType: currentPointType, // Override with DOM value
        strokeType: currentStrokeType, // Override with DOM value
        radius: currentRadius, // Override with DOM value
        strokeWidth: currentStrokeWidth, // Override with DOM value
        rotation: currentRotation, // Override with DOM value
        fillAlpha: currentFillAlpha, // Override with DOM value
        strokeAlpha: currentStrokeAlpha, // Override with DOM value
      };

      // Create new style with updated fill color
      const style = createPointStyleFromHelpers(
        updatedState.pointType,
        updatedState.radius,
        [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, updatedState.strokeAlpha],
        updatedState.strokeWidth,
        [newColor.r, newColor.g, newColor.b, updatedState.fillAlpha], // Use new fill color
        updatedState.rotation,
        updatedState.strokeType
      );

      // Update the item in the store with the full OpenLayers style object (matching old app)
      const updates = {
        style: style, // Store the full OpenLayers style object
        pointType: updatedState.pointType, // Preserve pointType
        strokeType: updatedState.strokeType, // Preserve strokeType
      };

      console.log("🎯 Updating item in store with new fill color:", { itemId, updates, style });
      updateItem(itemId, updates);

      // Emit event to refresh the feature on the map
      emit("mymap-style-updated", { itemId, style, fillColor: newColor });
      console.log("🔄 Emitted mymap-style-updated event for fill color change:", itemId);
    },
    [item, updateItem, emit, getCurrentSymbolizerState, createPointStyleFromHelpers, extractColorFromDOMButton]
  );

  // Function to update symbolizer stroke color
  const updateSymbolizerStrokeColor = useCallback(
    (itemId: string, newColor: { r: number; g: number; b: number }) => {
      if (!item) return;

      console.log("🎯 Updating symbolizer stroke color:", { itemId, newColor });

      // CRITICAL FIX: Get current dropdown values AND slider values from DOM to preserve all current settings
      const symbolizerContainer = overlayElementRef.current?.querySelector(".sc-mymaps-symbolizer-container");
      const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
      const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

      const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
      const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

      // Get current state from store/item (not DOM)
      const state = getCurrentSymbolizerState();
      if (!state) return;

      // Read ALL current values from DOM to prevent any resets
      const sizeSlider = symbolizerContainer?.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
      const currentRadius = sizeSlider ? parseFloat(sizeSlider.value) : state.radius;

      // Get ALL slider values from DOM using positional selectors
      const allSliders = symbolizerContainer?.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
      let currentFillAlpha = state.fillAlpha;
      let currentStrokeAlpha = state.strokeAlpha;
      let currentStrokeWidth = state.strokeWidth;
      let currentRotation = state.rotation;

      if (allSliders && allSliders.length > 1) {
        // Order: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation
        if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
        if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
        if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
        if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
      }

      // Read current fill color from DOM
      const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");

      console.log("🔍 Current state before stroke color update:", state);
      console.log("🔧 Using DOM values for stroke color:", {
        pointType: currentPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        fillAlpha: currentFillAlpha,
        strokeAlpha: currentStrokeAlpha,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
      });

      // Update the stroke color in state and override all values with DOM values
      const updatedState = {
        ...state,
        strokeColor: { ...newColor, a: currentStrokeAlpha }, // Use DOM alpha
        fillColor: { ...currentFillColor, a: currentFillAlpha }, // Use DOM fill color and alpha
        pointType: currentPointType, // Override with DOM value
        strokeType: currentStrokeType, // Override with DOM value
        radius: currentRadius, // Override with DOM value
        strokeWidth: currentStrokeWidth, // Override with DOM value
        rotation: currentRotation, // Override with DOM value
        fillAlpha: currentFillAlpha, // Override with DOM value
        strokeAlpha: currentStrokeAlpha, // Override with DOM value
      };

      // Create new style with updated stroke color
      const style = createPointStyleFromHelpers(
        updatedState.pointType,
        updatedState.radius,
        [newColor.r, newColor.g, newColor.b, updatedState.strokeAlpha], // Use new stroke color
        updatedState.strokeWidth,
        [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, updatedState.fillAlpha],
        updatedState.rotation,
        updatedState.strokeType
      );

      // Update the item in the store with the full OpenLayers style object (matching old app)
      const updates = {
        style: style, // Store the full OpenLayers style object
        pointType: updatedState.pointType, // Preserve pointType
        strokeType: updatedState.strokeType, // Preserve strokeType
      };

      console.log("🎯 Updating item in store with new stroke color:", { itemId, updates, style });
      updateItem(itemId, updates);

      // Emit event to refresh the feature on the map
      emit("mymap-style-updated", { itemId, style, strokeColor: newColor });
      console.log("🔄 Emitted mymap-style-updated event for stroke color change:", itemId);
    },
    [item, updateItem, emit, getCurrentSymbolizerState, createPointStyleFromHelpers, extractColorFromDOMButton]
  );

  // Function to update symbolizer fill opacity - GEOMETRY AWARE
  const updateSymbolizerFillOpacity = useCallback(
    (itemId: string, newOpacity: number) => {
      if (!item) return;

      console.log("🎯 Updating symbolizer fill opacity for", item.geometryType, ":", { itemId, newOpacity });

      const symbolizerContainer = overlayElementRef.current?.querySelector(".sc-mymaps-symbolizer-container");
      const state = getCurrentSymbolizerState();
      if (!state) return;

      // Read geometry-specific values from DOM
      let currentPointType = state.pointType;
      let currentRadius = state.radius;
      let currentRotation = state.rotation;
      let currentStrokeAlpha = state.strokeAlpha;
      let currentStrokeWidth = state.strokeWidth;
      let currentStrokeType = state.strokeType;

      // Only read point-specific values for point geometries
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
        currentPointType = pointStyleSelect ? pointStyleSelect.value : currentPointType;

        const sizeSlider = symbolizerContainer?.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
        currentRadius = sizeSlider ? parseFloat(sizeSlider.value) : currentRadius;
      }

      // Read stroke-specific values for all geometries that have strokes
      const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
      currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : currentStrokeType;

      // Get ALL slider values from DOM using positional selectors - GEOMETRY AWARE
      const allSliders = symbolizerContainer?.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
      if (allSliders && allSliders.length > 0) {
        // GEOMETRY-AWARE SLIDER INDICES - Different slider orders for different geometry types
        // Note: We're updating fill opacity, so we don't read the fill opacity slider itself

        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          // For points: [0] = size, [1] = fill opacity (changing), [2] = stroke opacity, [3] = stroke width, [4] = rotation
          if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
          if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
          if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
        } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
          // For polygons: [0] = fill opacity (changing), [1] = stroke opacity, [2] = stroke width
          if (allSliders[1]) currentStrokeAlpha = parseFloat(allSliders[1].value);
          if (allSliders[2]) currentStrokeWidth = parseFloat(allSliders[2].value);
          // No rotation for polygons
        }
        // Note: Lines don't have fill opacity, so no case needed for LineString
      }

      // Read current colors from DOM
      const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
      const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

      console.log("🔧 Geometry-aware DOM values for fill opacity:", {
        geometryType: item.geometryType,
        pointType: currentPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        strokeAlpha: currentStrokeAlpha,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
      });

      // Update the fill opacity in state
      const updatedState = {
        ...state,
        fillAlpha: newOpacity,
        fillColor: { ...currentFillColor, a: newOpacity }, // Use DOM fill color with new alpha
        strokeColor: { ...currentStrokeColor, a: currentStrokeAlpha }, // Use DOM stroke color and alpha
        pointType: currentPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
        strokeAlpha: currentStrokeAlpha,
      };

      // Create new style - EXPLICIT GEOMETRY TYPE CHECKING like old app
      let style = null;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          updatedState.pointType,
          updatedState.radius,
          [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, updatedState.strokeAlpha],
          updatedState.strokeWidth,
          [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, newOpacity], // Use new opacity
          updatedState.rotation,
          updatedState.strokeType
        );
      } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
        style = getPolygonStyle(
          [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, updatedState.strokeAlpha],
          updatedState.strokeWidth,
          [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, newOpacity], // Use new opacity
          updatedState.strokeType
        );
      }
      // Note: LineString doesn't have fill, so no style creation needed

      // Only update if style was created successfully
      if (style) {
        const updates = {
          style: style,
          pointType: updatedState.pointType,
          strokeType: updatedState.strokeType,
          fillAlpha: newOpacity, // Preserve fillAlpha for persistence
        };

        console.log("🎯 Updating", item.geometryType, "item in store with new fill opacity:", { itemId, updates, style });
        updateItem(itemId, updates);

        // Emit event to refresh the feature on the map
        emit("mymap-style-updated", { itemId, style, fillOpacity: newOpacity });
        console.log("🔄 Emitted mymap-style-updated event for fill opacity change:", itemId);
      }
    },
    [item, updateItem, emit, getCurrentSymbolizerState, extractColorFromDOMButton]
  );

  // Function to update symbolizer stroke opacity - GEOMETRY AWARE
  const updateSymbolizerStrokeOpacity = useCallback(
    (itemId: string, newOpacity: number) => {
      if (!item) return;

      console.log("🎯 Updating symbolizer stroke opacity for", item.geometryType, ":", { itemId, newOpacity });

      const symbolizerContainer = overlayElementRef.current?.querySelector(".sc-mymaps-symbolizer-container");
      const state = getCurrentSymbolizerState();
      if (!state) return;

      // Read geometry-specific values from DOM
      let currentPointType = state.pointType;
      let currentRadius = state.radius;
      let currentRotation = state.rotation;
      let currentFillAlpha = state.fillAlpha; // ⚠️ CRITICAL: Don't change fill opacity when changing stroke opacity!
      let currentStrokeWidth = state.strokeWidth;
      let currentStrokeType = state.strokeType;

      // Only read point-specific values for point geometries
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
        currentPointType = pointStyleSelect ? pointStyleSelect.value : currentPointType;

        const sizeSlider = symbolizerContainer?.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
        currentRadius = sizeSlider ? parseFloat(sizeSlider.value) : currentRadius;
      }

      // Read stroke-specific values for all geometries that have strokes
      const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
      currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : currentStrokeType;

      // Get ALL slider values from DOM using positional selectors - GEOMETRY AWARE
      const allSliders = symbolizerContainer?.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
      if (allSliders && allSliders.length > 0) {
        // GEOMETRY-AWARE SLIDER INDICES - Different slider orders for different geometry types
        // Note: We're updating stroke opacity, so we don't read the stroke opacity slider itself

        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          // For points: [0] = size, [1] = fill opacity, [2] = stroke opacity (changing), [3] = stroke width, [4] = rotation
          if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
          if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
          if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
        } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
          // For polygons: [0] = fill opacity, [1] = stroke opacity (changing), [2] = stroke width
          if (allSliders[0]) currentFillAlpha = parseFloat(allSliders[0].value);
          if (allSliders[2]) currentStrokeWidth = parseFloat(allSliders[2].value);
          // No rotation for polygons
        } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
          // For lines: [0] = stroke opacity (changing), [1] = stroke width
          if (allSliders[1]) currentStrokeWidth = parseFloat(allSliders[1].value);
          // No fill or rotation for lines
        }
      }

      // Read current colors from DOM
      const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
      const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

      console.log("🔧 Geometry-aware DOM values for stroke opacity:", {
        geometryType: item.geometryType,
        pointType: currentPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        fillAlpha: currentFillAlpha,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
      });

      // Update the stroke opacity in state
      const updatedState = {
        ...state,
        strokeAlpha: newOpacity,
        fillColor: { ...currentFillColor, a: currentFillAlpha }, // Keep existing fill alpha - DON'T change it!
        strokeColor: { ...currentStrokeColor, a: newOpacity }, // Use new stroke alpha
        pointType: currentPointType,
        strokeType: currentStrokeType,
        radius: currentRadius,
        strokeWidth: currentStrokeWidth,
        rotation: currentRotation,
        fillAlpha: currentFillAlpha, // Preserve existing fill alpha
      };

      // Create new style - EXPLICIT GEOMETRY TYPE CHECKING like old app
      let style = null;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          updatedState.pointType,
          updatedState.radius,
          [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, newOpacity], // Use new stroke opacity
          updatedState.strokeWidth,
          [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, updatedState.fillAlpha], // Keep existing fill
          updatedState.rotation,
          updatedState.strokeType
        );
      } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        style = getLineStringStyle(
          [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, newOpacity], // Use new stroke opacity
          updatedState.strokeWidth,
          updatedState.strokeType
        );
      } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
        style = getPolygonStyle(
          [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, newOpacity], // Use new stroke opacity
          updatedState.strokeWidth,
          [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, updatedState.fillAlpha], // Keep existing fill
          updatedState.strokeType
        );
      }

      // Only update if style was created successfully
      if (style) {
        const updates = {
          style: style,
          pointType: updatedState.pointType,
          strokeType: updatedState.strokeType,
          strokeAlpha: newOpacity, // Preserve strokeAlpha for persistence
        };

        console.log("🎯 Updating", item.geometryType, "item in store with new stroke opacity:", { itemId, updates, style });
        updateItem(itemId, updates);

        // Emit event to refresh the feature on the map
        emit("mymap-style-updated", { itemId, style, strokeOpacity: newOpacity });
        console.log("🔄 Emitted mymap-style-updated event for stroke opacity change:", itemId);
      }
    },
    [item, updateItem, emit, getCurrentSymbolizerState, extractColorFromDOMButton]
  );

  // Function to show color picker popup (matching MyMapsSymbolizer approach)
  const showSymbolizerColorPicker = useCallback(
    (event: MouseEvent, colorType: "fill" | "stroke") => {
      // Remove any existing color picker
      const existingPicker = document.getElementById("sc-symbolizer-color-picker-container");
      if (existingPicker) {
        existingPicker.remove();
        return;
      }

      if (!item?.id) return;

      // Create CompactPicker replica
      const colorPicker = document.createElement("div");
      colorPicker.id = "sc-symbolizer-color-picker-container";
      colorPicker.style.cssText = `
     position: absolute;
     z-index: 10000;
     background: white;
     border: 1px solid #ccc;
     border-radius: 4px;
     padding: 10px;
     box-shadow: 0 2px 8px rgba(0,0,0,0.3);
     font-family: Arial, sans-serif;
   `;

      // CompactPicker colors - exact layout from react-color
      const compactColors = [
        "#4D4D4D",
        "#999999",
        "#FFFFFF",
        "#F44E3B",
        "#FE9200",
        "#FCDC00",
        "#DBDF00",
        "#A4DD00",
        "#68CCCA",
        "#73D8FF",
        "#AEA1FF",
        "#FDA1FF",
        "#333333",
        "#808080",
        "#cccccc",
        "#D33115",
        "#E27300",
        "#FCC400",
        "#B0BC00",
        "#68BC00",
        "#16A5A5",
        "#009CE0",
        "#7B64FF",
        "#FA28FF",
        "#000000",
        "#666666",
        "#B3B3B3",
        "#9F0500",
        "#C45100",
        "#FB9E00",
        "#808900",
        "#194D33",
        "#0C797D",
        "#0062B1",
        "#653294",
        "#AB149E",
      ];

      // Create the picker content with color swatches
      let pickerHTML = '<div style="display: grid; grid-template-columns: repeat(12, 16px); gap: 2px;">';
      compactColors.forEach((color) => {
        pickerHTML += `
       <div 
         class="color-swatch" 
         style="
           width: 16px; 
           height: 16px; 
           background-color: ${color}; 
           border: 1px solid #ddd; 
           cursor: pointer;
           border-radius: 2px;
         " 
         data-color="${color}">
       </div>
     `;
      });
      pickerHTML += "</div>";

      colorPicker.innerHTML = pickerHTML;

      // Position picker near the button
      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
      colorPicker.style.left = `${buttonRect.left}px`;
      colorPicker.style.top = `${buttonRect.bottom + 5}px`;

      // Add to page
      document.body.appendChild(colorPicker);

      // Handle color selection
      const handleColorClick = (colorEvent: Event) => {
        const colorElement = colorEvent.target as HTMLElement;
        const selectedColor = colorElement.getAttribute("data-color");

        if (selectedColor) {
          const rgbColor = hexToRgbObject(selectedColor);

          // Update button color immediately
          const targetButton =
            colorType === "fill"
              ? (overlayElementRef.current?.querySelector("#sc-mymaps-symbolizer-color-button") as HTMLButtonElement)
              : (overlayElementRef.current?.querySelector("#sc-mymaps-symbolizer-stroke-color-button") as HTMLButtonElement);

          if (targetButton) {
            targetButton.style.backgroundColor = selectedColor;
          }

          // Update the style
          if (colorType === "fill") {
            updateSymbolizerFillColor(item.id, { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b });
          } else {
            updateSymbolizerStrokeColor(item.id, { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b });
          }
        }

        // Remove picker
        colorPicker.remove();
      };

      // Add click listeners to color swatches
      const swatches = colorPicker.querySelectorAll(".color-swatch");
      swatches.forEach((swatch) => {
        swatch.addEventListener("click", handleColorClick);
      });

      // Close picker when clicking outside
      const handleOutsideClick = (outsideEvent: MouseEvent) => {
        if (!colorPicker.contains(outsideEvent.target as Node)) {
          colorPicker.remove();
          document.removeEventListener("click", handleOutsideClick);
        }
      };

      // Delay adding the outside click listener to prevent immediate closure
      setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
      }, 100);
    },
    [item, updateSymbolizerFillColor, updateSymbolizerStrokeColor, hexToRgbObject]
  );

  // Attach event listeners (memoized to prevent unnecessary re-attachments)
  const attachEventListeners = useCallback(() => {
    if (!overlayElementRef.current || !item) return;

    // Re-attach all necessary event listeners
    const closeButton = overlayElementRef.current.querySelector(".ol-popup-closer") as HTMLElement;
    if (closeButton) {
      closeButton.onclick = (e) => {
        e.preventDefault();
        onClose();
      };
    }

    // Re-attach input field event listeners for the label
    const labelInput = overlayElementRef.current.querySelector(".sc-mymaps-popup-label-input") as HTMLInputElement;

    if (labelInput && onLabelChange) {
      // Handle input events for live sync (on every keystroke)
      labelInput.addEventListener("input", () => {
        if (item) {
          onLabelChange(item.id, labelInput.value);
        }
      });

      // Handle keydown events
      labelInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && item) {
          onLabelChange(item.id, labelInput.value.trim());
        } else if (e.key === "Escape" && item) {
          labelInput.value = item.label;
        }
      });

      // Handle blur event - only call onLabelChange if value has actually changed
      labelInput.addEventListener("blur", () => {
        if (item && labelInput.value.trim() !== item.label) {
          onLabelChange(item.id, labelInput.value.trim());
        }
      });
    }

    // Re-attach checkbox click listener (React handlers are lost when copying HTML to overlay)
    const checkbox = overlayElementRef.current.querySelector(".sc-mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
    if (checkbox && onLabelVisibilityChange && item) {
      checkbox.onclick = (e) => {
        // Don't prevent default - let browser handle checkbox visual state
        e.stopPropagation(); // Just prevent event bubbling

        const newVisibility = checkbox.checked;

        // Update the store
        onLabelVisibilityChange(item.id, newVisibility);
      };
    }

    // Re-attach rotation slider change listener (React handlers are lost when copying HTML to overlay)
    const rotationSlider = overlayElementRef.current.querySelector(".sc-mymaps-popup-slider input[type='range']") as HTMLInputElement;
    if (rotationSlider && onLabelRotationChange && item) {
      rotationSlider.oninput = (e) => {
        e.stopPropagation();

        const newRotation = parseInt((e.target as HTMLInputElement).value);

        // Update the store
        onLabelRotationChange(item.id, newRotation);
      };
    }

    // Re-attach footer button event listeners (React handlers are lost when copying HTML to overlay)
    const footerButtons = overlayElementRef.current.querySelectorAll(".sc-mymaps-popup-footer-button");
    footerButtons.forEach((button) => {
      const buttonText = button.textContent?.trim().toLowerCase();
      if (buttonText && item) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (buttonText === "tools" && onTools) {
            onTools(item);
          } else if (buttonText === "delete" && onDelete) {
            onDelete(item);
          } else if (buttonText === "close") {
            onClose();
          }
        });
      }
    });

    // Re-attach other button event listeners if they exist
    const toolsButtons = overlayElementRef.current.querySelectorAll("[data-action]");
    toolsButtons.forEach((button) => {
      const action = button.getAttribute("data-action");
      if (action && item) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          if (action === "tools" && onTools) {
            onTools(item, e as unknown as React.MouseEvent);
          } else if (action === "delete" && onDelete) {
            onDelete(item);
          }
        });
      }
    });

    // Helper functions for buffer component DOM interaction
    const getCurrentDistance = (): number => {
      const input = overlayElementRef.current?.querySelector(".sc-mymaps-buffer-container input[type='number']") as HTMLInputElement;
      return input ? parseFloat(input.value) || 0 : 0;
    };

    const getCurrentUnits = (): string => {
      const select = overlayElementRef.current?.querySelector(".sc-mymaps-buffer-container select") as HTMLSelectElement;
      return select ? select.value : "meters";
    };

    const getCurrentColor = (): { r: number; g: number; b: number } => {
      const colorButton = overlayElementRef.current?.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
      if (colorButton) {
        const bgColor = colorButton.style.backgroundColor;
        if (bgColor.startsWith("rgb(")) {
          const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            return {
              r: parseInt(match[1]),
              g: parseInt(match[2]),
              b: parseInt(match[3]),
            };
          }
        }
      }
      // Default green color if no color found
      return { r: 85, g: 243, b: 30 };
    };

    const triggerBufferPreview = (distance: number, units: string) => {
      // This will directly call the buffer creation logic
      if (item?.featureGeoJSON) {
        console.log("🎯 Triggering buffer preview:", { distance, units, item });

        // Import and use the buffer helpers directly
        import("@/utils/openlayers/BufferHelpers").then(({ bufferGeometry, convertToMeters }) => {
          import("@/utils/myMapsHelpers").then(({ featureFromGeoJSON }) => {
            import("ol").then(({ Feature }) => {
              import("ol/style").then(({ Style, Stroke, Fill }) => {
                import("ol/layer/Vector").then(({ default: VectorLayer }) => {
                  import("ol/source").then(({ Vector: VectorSource }) => {
                    import("@/stores/mapStore").then(({ useMapStore }) => {
                      try {
                        const { map } = useMapStore.getState();
                        if (!map) return;

                        // Get or create buffer layer
                        let bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");

                        if (!bufferLayer) {
                          bufferLayer = new VectorLayer({
                            source: new VectorSource(),
                            zIndex: 999,
                          });
                          bufferLayer.set("id", "drawing-options-buffer-preview");
                          map.addLayer(bufferLayer);
                        }

                        // Create buffer
                        const feature = featureFromGeoJSON(item.featureGeoJSON);
                        const geometry = feature.getGeometry();
                        if (!geometry) return;

                        const distanceMeters = convertToMeters(distance, units);

                        bufferGeometry(geometry, distanceMeters, (bufferedGeometry) => {
                          const bufferFeature = new Feature({ geometry: bufferedGeometry });

                          // Get current color from color picker button
                          const currentColor = getCurrentColor();
                          console.log("🎨 Using buffer color:", currentColor);

                          // Create style using selected color
                          const style = new Style({
                            stroke: new Stroke({
                              color: [currentColor.r, currentColor.g, currentColor.b, 1],
                              width: 3,
                            }),
                            fill: new Fill({
                              color: [currentColor.r, currentColor.g, currentColor.b, 0.7],
                            }),
                          });

                          bufferFeature.setStyle(style);

                          // Clear and add buffer
                          const source = bufferLayer.getSource();
                          if (source && "clear" in source && "addFeature" in source) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (source as any).clear();
                            if (distanceMeters > 0) {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              (source as any).addFeature(bufferFeature);
                            }
                          }

                          console.log("✅ Buffer preview created successfully");
                        });
                      } catch (error) {
                        console.error("❌ Error creating buffer preview:", error);
                      }
                    });
                  });
                });
              });
            });
          });
        });
      }
    };

    const triggerColorChange = (event: MouseEvent) => {
      console.log("🎯 Color change triggered - showing CompactPicker");

      // Remove any existing color picker
      const existingPicker = document.getElementById("sc-color-picker-container");
      if (existingPicker) {
        existingPicker.remove();
        return;
      }

      // Get current button color
      const colorButton = overlayElementRef.current?.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;

      // Create CompactPicker replica
      const colorPicker = document.createElement("div");
      colorPicker.id = "sc-color-picker-container";
      colorPicker.style.cssText = `
        position: absolute;
        z-index: 10000;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
      `;

      // CompactPicker colors - exact layout from react-color
      const compactColors = [
        // Row 1
        [
          "#4D4D4D",
          "#999999",
          "#FFFFFF",
          "#F44E3B",
          "#FE9200",
          "#FCDC00",
          "#DBDF00",
          "#A4DD00",
          "#68CCCA",
          "#73D8FF",
          "#AEA1FF",
          "#FDA1FF",
          "#333333",
          "#808080",
          "#cccccc",
          "#D33115",
          "#E27300",
          "#FCC400",
          "#B0BC00",
          "#68BC00",
          "#16A5A5",
          "#009CE0",
          "#7B64FF",
          "#FA28FF",
        ],
        // Row 2
        ["#000000", "#666666", "#B3B3B3", "#9F0500", "#C45100", "#FB9E00", "#808900", "#194D33", "#0C797D", "#0062B1", "#653294", "#AB149E"],
      ];

      const allColors = compactColors.flat();

      // Create the picker content
      colorPicker.innerHTML = `
          <div style="padding: 8px;">
            <div style="display: flex; flex-wrap: wrap; width: 270px;">
              ${allColors
                .map(
                  (color) => `
                <div class="color-swatch" 
                     data-color="${color}"
                     style="
                       width: 17px; 
                       height: 17px; 
                       background-color: ${color}; 
                       margin: 1px; 
                       cursor: pointer; 
                       border: 1px solid #ddd;
                       border-radius: 2px;
                     "></div>
              `
                )
                .join("")}
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div id="selected-color-display" style="
                    width: 16px; 
                    height: 16px; 
                    background-color: #55F31E; 
                    border: 1px solid #ddd; 
                    border-radius: 3px;
                  "></div>
                  <input 
                    id="hex-input" 
                    type="text" 
                    value="#55F31E"
                    class="sc-color-picker-input"
                    style="
                      width: 70px; 
                      font-size: 11px; 
                      border: 1px solid #ddd; 
                      border-radius: 2px; 
                      padding: 3px 5px;
                      font-weight: bold;
                    "
                  />
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 2px;">R <input id="r-input" type="number" min="0" max="255" value="85" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
                  <span style="display: flex; align-items: center; gap: 2px;">G <input id="g-input" type="number" min="0" max="255" value="243" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
                  <span style="display: flex; align-items: center; gap: 2px;">B <input id="b-input" type="number" min="0" max="255" value="30" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
                </div>
              </div>
            </div>
          </div>
        `;

      // Position the picker at cursor position like old app
      colorPicker.style.left = `${event.pageX}px`;
      colorPicker.style.top = `${event.pageY}px`;

      // Add to body
      document.body.appendChild(colorPicker);

      // Prevent overlay interactions within the color picker
      colorPicker.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      colorPicker.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });

      // Add click handlers to color swatches
      const swatches = colorPicker.querySelectorAll(".color-swatch");
      swatches.forEach((swatch) => {
        swatch.addEventListener("click", (e) => {
          const selectedColor = (e.target as HTMLElement).getAttribute("data-color")!;
          handleColorSelection(selectedColor);
          updateColorDisplay(selectedColor);
          // Close picker after selection
          colorPicker.remove();
        });

        // Hover effect
        swatch.addEventListener("mouseenter", (e) => {
          const hoverColor = (e.target as HTMLElement).getAttribute("data-color")!;
          updateColorDisplay(hoverColor);
          (e.target as HTMLElement).style.border = "2px solid #333";
        });

        swatch.addEventListener("mouseleave", (e) => {
          (e.target as HTMLElement).style.border = "1px solid #ddd";
          // Restore current color when leaving hover
          const hexInput = document.getElementById("hex-input") as HTMLInputElement;
          if (hexInput) {
            updateColorDisplay(hexInput.value);
          }
        });
      });

      // Add input field event listeners
      const hexInput = colorPicker.querySelector("#hex-input") as HTMLInputElement;
      const rInput = colorPicker.querySelector("#r-input") as HTMLInputElement;
      const gInput = colorPicker.querySelector("#g-input") as HTMLInputElement;
      const bInput = colorPicker.querySelector("#b-input") as HTMLInputElement;

      // Hex input handler
      if (hexInput) {
        hexInput.addEventListener("input", (e) => {
          const hexValue = (e.target as HTMLInputElement).value;
          if (isValidHex(hexValue)) {
            const rgb = hexToRgb(hexValue);
            updateRGBInputs(rgb.r, rgb.g, rgb.b);
            updateSelectedColorDisplay(hexValue);
            handleColorSelection(hexValue);
          }
        });

        hexInput.addEventListener("focus", (e) => {
          e.stopPropagation();
        });

        hexInput.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      // RGB input handlers
      const updateFromRGB = () => {
        const r = Math.max(0, Math.min(255, parseInt(rInput.value) || 0));
        const g = Math.max(0, Math.min(255, parseInt(gInput.value) || 0));
        const b = Math.max(0, Math.min(255, parseInt(bInput.value) || 0));

        // Update the input values to ensure they're valid
        rInput.value = r.toString();
        gInput.value = g.toString();
        bInput.value = b.toString();

        const hexValue = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        hexInput.value = hexValue;
        updateSelectedColorDisplay(hexValue);
        handleColorSelection(hexValue);
      };

      [rInput, gInput, bInput].forEach((input) => {
        if (input) {
          input.addEventListener("input", updateFromRGB);
          input.addEventListener("focus", (e) => e.stopPropagation());
          input.addEventListener("click", (e) => e.stopPropagation());
        }
      });

      // Set initial color values
      const initialColor = colorButton ? getComputedStyle(colorButton).backgroundColor : "rgb(85, 243, 30)";
      updateColorDisplay(rgbToHex(initialColor));

      // Close picker when clicking outside
      const handleOutsideClick = (e: MouseEvent) => {
        if (!colorPicker.contains(e.target as Node)) {
          colorPicker.remove();
          document.removeEventListener("click", handleOutsideClick);
        }
      };

      // Delay adding the outside click handler
      setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
      }, 100);
    };

    const updateColorDisplay = (hexColor: string) => {
      const rgb = hexToRgb(hexColor);

      // Update input fields
      const hexInput = document.getElementById("hex-input") as HTMLInputElement;
      const rInput = document.getElementById("r-input") as HTMLInputElement;
      const gInput = document.getElementById("g-input") as HTMLInputElement;
      const bInput = document.getElementById("b-input") as HTMLInputElement;

      if (hexInput) hexInput.value = hexColor.toUpperCase();
      if (rInput) rInput.value = rgb.r.toString();
      if (gInput) gInput.value = rgb.g.toString();
      if (bInput) bInput.value = rgb.b.toString();

      // Update selected color display
      updateSelectedColorDisplay(hexColor);
    };

    const updateSelectedColorDisplay = (hexColor: string) => {
      const colorDisplay = document.getElementById("selected-color-display");
      if (colorDisplay) {
        colorDisplay.style.backgroundColor = hexColor;
      }
    };

    const updateRGBInputs = (r: number, g: number, b: number) => {
      const rInput = document.getElementById("r-input") as HTMLInputElement;
      const gInput = document.getElementById("g-input") as HTMLInputElement;
      const bInput = document.getElementById("b-input") as HTMLInputElement;

      if (rInput) rInput.value = r.toString();
      if (gInput) gInput.value = g.toString();
      if (bInput) bInput.value = b.toString();
    };

    const isValidHex = (hex: string): boolean => {
      return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    };

    // Helper to convert rgb() string to hex
    const rgbToHex = (rgb: string): string => {
      const result = rgb.match(/\d+/g);
      if (!result) return "#55F31E";
      return (
        "#" +
        result
          .map((x) => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    };

    const handleColorSelection = (hexColor: string) => {
      console.log("🎯 Color selected:", hexColor);

      // Update the button color immediately
      const colorButton = overlayElementRef.current?.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
      if (colorButton) {
        colorButton.style.backgroundColor = hexColor;
      }

      // Update buffer preview with new color
      if (item?.featureGeoJSON) {
        const currentDistance = getCurrentDistance();

        if (!isNaN(currentDistance) && currentDistance > 0) {
          // Re-trigger buffer preview with new color
          updateBufferColor(hexColor);
        }
      }
    };

    const updateBufferColor = (hexColor: string) => {
      import("ol/style").then(({ Style, Stroke, Fill }) => {
        import("@/stores/mapStore").then(({ useMapStore }) => {
          try {
            const { map } = useMapStore.getState();
            if (!map || !item?.featureGeoJSON) return;

            const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
            if (!bufferLayer) return;

            // Convert hex to RGB
            const rgb = hexToRgb(hexColor);

            // Create new style with selected color
            const style = new Style({
              stroke: new Stroke({
                color: [rgb.r, rgb.g, rgb.b, 1],
                width: 3,
              }),
              fill: new Fill({
                color: [rgb.r, rgb.g, rgb.b, 0.7],
              }),
            });

            // Update existing buffer feature style
            const source = bufferLayer.getSource();
            if (source && "getFeatures" in source) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const features = (source as any).getFeatures();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              features.forEach((feature: any) => {
                feature.setStyle(style);
              });
            }

            console.log("✅ Buffer color updated successfully");
          } catch (error) {
            console.error("❌ Error updating buffer color:", error);
          }
        });
      });
    };

    const triggerAddBufferToMyMaps = () => {
      console.log("🎯 Triggering add buffer to MyMaps");

      import("@/stores/mapStore").then(({ useMapStore }) => {
        import("@/stores/eventStore").then(({ useEventStore }) => {
          try {
            const { map } = useMapStore.getState();
            const { emit } = useEventStore.getState();

            console.log("🔍 Debug - map exists:", !!map);
            console.log("🔍 Debug - item exists:", !!item);
            console.log("🔍 Debug - item.featureGeoJSON exists:", !!item?.featureGeoJSON);

            if (!map) {
              console.log("❌ No map found");
              return;
            }
            if (!item?.featureGeoJSON) {
              console.log("❌ No item or featureGeoJSON found");
              return;
            }

            const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
            console.log("🔍 Debug - bufferLayer exists:", !!bufferLayer);

            if (!bufferLayer) {
              console.log("❌ No buffer layer found");
              return;
            }

            // Get the buffer feature from the layer
            const source = bufferLayer.getSource();
            console.log("🔍 Debug - source exists:", !!source);

            if (source && "getFeatures" in source) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const features = (source as any).getFeatures();
              console.log("🔍 Debug - features found:", features.length);

              if (features.length > 0) {
                const bufferFeature = features[0];

                // Get current distance and units
                const distance = getCurrentDistance();
                const units = getCurrentUnits();
                const label = `Buffer - ${distance} ${units}`;

                console.log("🎯 Adding buffer to MyMaps:", {
                  label,
                  feature: bufferFeature,
                  distance,
                  units,
                  hasStyle: !!bufferFeature.getStyle(),
                  style: bufferFeature.getStyle(),
                });

                // Emit event to add the buffer feature to MyMaps
                emit("addMyMapsFeature", {
                  feature: bufferFeature,
                  label: label,
                });

                console.log("🎯 Event emitted successfully");

                // Hide the add message by removing the buffer preview
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (source as any).clear();

                // Hide the add buffer link
                showHideAddBufferLink(false);

                console.log("✅ Buffer added to MyMaps successfully");

                // Activate the MyMaps tab to show the newly added buffer
                console.log("🎯 Activating MyMaps tab after buffer addition...");
                activateTab("mymaps");
              } else {
                console.log("❌ No features found in buffer layer");
              }
            } else {
              console.log("❌ Buffer layer source not found or invalid");
            }
          } catch (error) {
            console.error("❌ Error adding buffer to MyMaps:", error);
          }
        });
      });
    };

    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 85, g: 243, b: 30 };
    };

    // Helper function to show/hide the add buffer link
    const showHideAddBufferLink = (show: boolean) => {
      console.log("🔗 showHideAddBufferLink called:", { show });

      // Find the add link by its text content (same logic as event listener attachment)
      const allLabels = overlayElementRef.current?.querySelectorAll(".sc-mymaps-buffer-container label");
      let addLink: HTMLLabelElement | null = null;

      if (allLabels) {
        for (const label of allLabels) {
          const labelElement = label as HTMLLabelElement;
          if (labelElement.textContent && labelElement.textContent.includes("Add this buffer to MyMap Items")) {
            addLink = labelElement;
            break;
          }
        }
      }

      console.log("🔗 Found add link element:", !!addLink);

      if (addLink) {
        if (show) {
          addLink.classList.remove("sc-hidden");
          addLink.classList.add("sc-fakeLink");
          addLink.style.display = "block";
          addLink.style.pointerEvents = "auto"; // Ensure it's clickable
          console.log("🔗 Link shown");
        } else {
          addLink.classList.add("sc-hidden");
          addLink.classList.remove("sc-fakeLink");
          addLink.style.display = "none";
          console.log("🔗 Link hidden");
        }
      } else {
        console.log("❌ Could not find add buffer link element");
      }
    };

    // Helper function to clear buffer preview
    const clearBufferPreview = () => {
      import("@/stores/mapStore").then(({ useMapStore }) => {
        try {
          const { map } = useMapStore.getState();
          if (!map) return;

          const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
          if (bufferLayer) {
            const source = bufferLayer.getSource();
            if (source && "clear" in source) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (source as any).clear();
              console.log("🎯 Buffer preview cleared");
            }
          }
        } catch (error) {
          console.error("❌ Error clearing buffer preview:", error);
        }
      });
    };

    // Re-attach buffer component event listeners (React handlers are lost when copying HTML to overlay)
    const bufferDistanceInput = overlayElementRef.current.querySelector(".sc-mymaps-buffer-container input[type='number']") as HTMLInputElement;
    if (bufferDistanceInput) {
      const handleDistanceChange = (e: Event) => {
        console.log("🎯 Distance changed via DOM event:", (e.target as HTMLInputElement).value);
        const newDistance = parseFloat((e.target as HTMLInputElement).value);

        if (!isNaN(newDistance) && newDistance > 0) {
          // Manually trigger buffer preview since React handlers are lost
          console.log("🎯 Calling buffer preview manually");
          triggerBufferPreview(newDistance, getCurrentUnits());

          // Show the add link
          showHideAddBufferLink(true);
        } else {
          // Hide buffer preview and link when distance is 0 or invalid
          console.log("🎯 Clearing buffer preview (distance <= 0)");
          clearBufferPreview();
          showHideAddBufferLink(false);
        }
      };

      bufferDistanceInput.addEventListener("input", handleDistanceChange);
      bufferDistanceInput.addEventListener("change", handleDistanceChange);
      bufferDistanceInput.addEventListener("keyup", handleDistanceChange);

      // Prevent input from interfering with header drag
      bufferDistanceInput.addEventListener("mousedown", (e) => {
        e.stopPropagation(); // Don't let this bubble up to header
      });
    }

    const bufferUnitsSelect = overlayElementRef.current.querySelector(".sc-mymaps-buffer-container select") as HTMLSelectElement;
    if (bufferUnitsSelect) {
      const handleUnitsChange = (e: Event) => {
        console.log("🎯 Units changed via DOM event:", (e.target as HTMLSelectElement).value);
        const newUnits = (e.target as HTMLSelectElement).value;
        const currentDistance = getCurrentDistance();

        if (!isNaN(currentDistance) && currentDistance > 0) {
          triggerBufferPreview(currentDistance, newUnits);
          showHideAddBufferLink(true);
        } else {
          clearBufferPreview();
          showHideAddBufferLink(false);
        }
      };

      bufferUnitsSelect.addEventListener("change", handleUnitsChange);

      // Prevent select from interfering with header drag
      bufferUnitsSelect.addEventListener("mousedown", (e) => {
        e.stopPropagation(); // Don't let this bubble up to header
      });
    }

    const bufferColorButton = overlayElementRef.current.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
    if (bufferColorButton) {
      bufferColorButton.addEventListener("click", (e) => {
        console.log("🎯 Color button clicked via DOM event");
        e.preventDefault();
        e.stopPropagation();
        // Trigger color change manually with event for positioning
        triggerColorChange(e as MouseEvent);
      });

      // Prevent the color button from interfering with header drag
      bufferColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation(); // Don't let this bubble up to header
      });
    }

    // Find the add buffer link by its specific text content
    console.log("🔍 Looking for buffer add link element...");
    const allLabels = overlayElementRef.current.querySelectorAll(".sc-mymaps-buffer-container label");
    console.log("🔍 Found labels in buffer container:", allLabels.length);

    let bufferAddLink: HTMLLabelElement | null = null;
    for (let index = 0; index < allLabels.length; index++) {
      const labelElement = allLabels[index] as HTMLLabelElement;
      console.log(`🔍 Label ${index}: "${labelElement.textContent}" | classes: "${labelElement.className}"`);
      if (labelElement.textContent && labelElement.textContent.includes("Add this buffer to MyMap Items")) {
        bufferAddLink = labelElement;
        console.log("✅ Found the correct add buffer link!");
        break;
      }
    }

    console.log("🔍 Final bufferAddLink found:", !!bufferAddLink);

    if (bufferAddLink) {
      console.log("🔍 bufferAddLink text content:", bufferAddLink.textContent);
      console.log("🔍 bufferAddLink classes:", bufferAddLink.className);

      // Enable pointer events for the link (OL overlay interaction fix)
      bufferAddLink.style.pointerEvents = "auto";
      bufferAddLink.style.cursor = "pointer";

      bufferAddLink.addEventListener("click", (e: Event) => {
        console.log("🎯 Add buffer to MyMaps clicked via DOM event!!!");
        console.log("🎯 Event target:", e.target);
        console.log("🎯 Event current target:", e.currentTarget);
        e.preventDefault();
        e.stopPropagation();
        // Trigger add buffer to MyMaps manually
        triggerAddBufferToMyMaps();
      });

      // Prevent the link from interfering with header drag by stopping mousedown propagation
      bufferAddLink.addEventListener("mousedown", (e: Event) => {
        e.stopPropagation(); // Don't let this bubble up to header
      });

      // Only prevent propagation for link-specific events, not all mousedown/mouseup
      // This ensures header drag functionality isn't broken

      // Initially hide the link (should only show when distance > 0)
      const currentDistance = getCurrentDistance();
      console.log("🔍 Initial distance for link visibility:", currentDistance);
      showHideAddBufferLink(currentDistance > 0);
    } else {
      console.log("❌ Could not find buffer add link element for event binding");
    }

    // Re-attach symbolizer component event listeners (React handlers are lost when copying HTML to overlay)
    const symbolizerContainer = overlayElementRef.current.querySelector(".sc-mymaps-symbolizer-container");
    if (symbolizerContainer) {
      console.log("🔧 Setting up Symbolizer DOM event listeners with store-based state management");

      // 🎯 Get current state once at the top for all controls to use
      const currentState = getCurrentSymbolizerState();
      if (!currentState) {
        console.warn("⚠️ Could not get current symbolizer state");
        return;
      }

      // Point style dropdown
      const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
      if (pointStyleSelect) {
        // 🎯 CRITICAL: Set dropdown value from current state before attaching events
        const currentPointType = item.pointType || currentState.pointType || "circle";
        pointStyleSelect.value = currentPointType;
        console.log("🔧 Set point style dropdown value from state:", currentPointType);

        pointStyleSelect.addEventListener("change", (e) => {
          e.stopPropagation();
          const newPointType = (e.target as HTMLSelectElement).value;
          console.log("🎯 Point style changed via DOM event:", newPointType);

          // Update the item's point type and style
          updateSymbolizerPointType(item.id, newPointType);
        });
        (pointStyleSelect as HTMLElement).style.pointerEvents = "auto";
      }

      // Stroke type dropdown
      const strokeTypeSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
      if (strokeTypeSelect) {
        // 🎯 Set stroke type dropdown value from current state
        const currentStrokeType = item.strokeType || currentState.strokeType || "normal";
        strokeTypeSelect.value = currentStrokeType;
        console.log("🔧 Set stroke type dropdown value from state:", currentStrokeType);

        strokeTypeSelect.addEventListener("change", (e) => {
          e.stopPropagation();
          const newStrokeType = (e.target as HTMLSelectElement).value;
          console.log("🎯 Stroke type changed via DOM event:", newStrokeType);

          // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
          const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
          const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

          // Get current state from store/item (not DOM)
          const state = getCurrentSymbolizerState();
          if (!state) return;

          // Get ALL slider values from DOM using positional selectors
          const allSliders = symbolizerContainer.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
          let currentRadius = state.radius;
          let currentFillAlpha = state.fillAlpha;
          let currentStrokeAlpha = state.strokeAlpha;
          let currentStrokeWidth = state.strokeWidth;
          let currentRotation = state.rotation;

          if (allSliders && allSliders.length > 0) {
            // Order: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation
            if (allSliders[0]) currentRadius = parseFloat(allSliders[0].value);
            if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
            if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
            if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
            if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
          }

          // Read current colors from DOM color buttons
          const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
          const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

          console.log("🔧 Using DOM values for stroke type change:", {
            pointType: currentPointType,
            strokeType: newStrokeType,
            radius: currentRadius,
            fillAlpha: currentFillAlpha,
            strokeAlpha: currentStrokeAlpha,
            strokeWidth: currentStrokeWidth,
            rotation: currentRotation,
          });

          if (item?.id) {
            // Create style - EXPLICIT GEOMETRY TYPE CHECKING like old app
            let style = null;
            if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
              style = getPointStyle(
                currentPointType,
                currentRadius,
                [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
                currentStrokeWidth,
                [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha],
                currentRotation,
                newStrokeType // Use the new stroke type
              );
            } else if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
              style = getLineStringStyle(
                [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
                currentStrokeWidth,
                newStrokeType // Use the new stroke type
              );
            } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
              style = getPolygonStyle(
                [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
                currentStrokeWidth,
                [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha],
                newStrokeType // Use the new stroke type
              );
            }

            // Only update if style was created successfully
            if (style) {
              const updates = {
                style: style,
                pointType: currentPointType,
                strokeType: newStrokeType, // Update stroke type
              };

              console.log("🎯 Updating item in store with new stroke type:", { itemId: item.id, updates, style });
              updateItem(item.id, updates);

              // Emit event to refresh the feature on the map
              emit("mymap-style-updated", { itemId: item.id, style, strokeType: newStrokeType });
            }
          }
        });
        (strokeTypeSelect as HTMLElement).style.pointerEvents = "auto";
      }

      // Size/Radius slider (first range input)
      const sizeSlider = symbolizerContainer.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
      if (sizeSlider) {
        // 🎯 Set slider value from current state
        sizeSlider.value = currentState.radius.toString();
        console.log("🔧 Set size slider value from state:", currentState.radius);
        const handleSizeChange = (e: Event) => {
          e.stopPropagation();
          const newRadius = parseFloat((e.target as HTMLInputElement).value);
          console.log("🎯 Size slider changed via DOM event:", newRadius);

          // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
          const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
          const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

          const strokeStyleSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
          const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

          // Get current state from store/item (not DOM)
          const state = getCurrentSymbolizerState();
          if (!state) return;

          // Get ALL slider values from DOM using positional selectors
          const allSliders = symbolizerContainer.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
          let currentFillAlpha = state.fillAlpha;
          let currentStrokeAlpha = state.strokeAlpha;
          let currentStrokeWidth = state.strokeWidth;
          let currentRotation = state.rotation;

          if (allSliders && allSliders.length > 1) {
            // Order: [0] = size (we're changing this), [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation
            if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
            if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
            if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
            if (allSliders[4]) currentRotation = parseFloat(allSliders[4].value);
          }

          // Read current colors from DOM color buttons
          const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
          const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

          console.log("🔧 Using DOM values for size change:", {
            pointType: currentPointType,
            strokeType: currentStrokeType,
            radius: newRadius,
            fillAlpha: currentFillAlpha,
            strokeAlpha: currentStrokeAlpha,
            strokeWidth: currentStrokeWidth,
            rotation: currentRotation,
          });

          if (item?.id) {
            // Create style with ALL current DOM values
            const style = createPointStyleFromHelpers(
              currentPointType,
              newRadius, // Use the new radius value
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha], // Use current values from DOM
              currentStrokeWidth,
              [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha], // Use current values from DOM
              currentRotation,
              currentStrokeType
            );

            // Update the item in the store
            const updates = {
              style: style,
              pointType: currentPointType,
              strokeType: currentStrokeType,
            };

            console.log("🎯 Updating item in store with new size:", { itemId: item.id, updates, style });
            updateItem(item.id, updates);

            // Emit event to refresh the feature on the map
            emit("mymap-style-updated", { itemId: item.id, style, radius: newRadius });
          }
        };

        sizeSlider.addEventListener("input", handleSizeChange);
        sizeSlider.addEventListener("change", handleSizeChange);
        (sizeSlider as HTMLElement).style.pointerEvents = "auto";

        // Prevent slider from interfering with header drag
        sizeSlider.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
      }

      // Fill opacity slider - GEOMETRY-AWARE SELECTION (only for geometries that have fills)
      let fillOpacitySlider: HTMLInputElement | null = null;

      if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint" || item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
        fillOpacitySlider = symbolizerContainer.querySelector("input[key='sc-mymaps-symbolizer-fill-opacity']") as HTMLInputElement;
        if (!fillOpacitySlider) {
          fillOpacitySlider = symbolizerContainer.querySelector(".sc-mymaps-symbolizer-slider.opacity input[type='range']") as HTMLInputElement;
        }
        if (!fillOpacitySlider) {
          const allRangeInputs = symbolizerContainer.querySelectorAll("input[type='range']");
          if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
            // For points: [0] = size, [1] = fill opacity
            fillOpacitySlider = allRangeInputs[1] as HTMLInputElement;
          } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
            // For polygons: [0] = fill opacity
            fillOpacitySlider = allRangeInputs[0] as HTMLInputElement;
          }
        }
      }
      // Note: Lines don't have fill, so fillOpacitySlider stays null for lines
      if (fillOpacitySlider) {
        // 🎯 Set fill opacity slider value from current state
        fillOpacitySlider.value = currentState.fillAlpha.toString();
        console.log("🔧 Set fill opacity slider value from state:", currentState.fillAlpha);

        const handleFillOpacityChange = (e: Event) => {
          e.stopPropagation();
          const newOpacity = parseFloat((e.target as HTMLInputElement).value);
          console.log("🎯 Fill opacity slider changed via DOM event:", newOpacity);
          if (item?.id) {
            updateSymbolizerFillOpacity(item.id, newOpacity);
          }
        };

        fillOpacitySlider.addEventListener("input", handleFillOpacityChange);
        fillOpacitySlider.addEventListener("change", handleFillOpacityChange);
        (fillOpacitySlider as HTMLElement).style.pointerEvents = "auto";

        // Prevent slider from interfering with header drag
        fillOpacitySlider.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
      }

      // Stroke opacity slider - try multiple selectors
      let strokeOpacitySlider = symbolizerContainer.querySelector("input[key='sc-mymaps-symbolizer-stroke-opacity']") as HTMLInputElement;
      if (!strokeOpacitySlider) {
        // GEOMETRY-AWARE SLIDER SELECTION
        if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
          // For lines: stroke opacity is the ONLY opacity slider at index [0]
          const allRangeInputs = symbolizerContainer.querySelectorAll("input[type='range']");
          strokeOpacitySlider = allRangeInputs[0] as HTMLInputElement;
        } else if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
          // For points: stroke opacity is at index [2] (after size and fill opacity)
          const allRangeInputs = symbolizerContainer.querySelectorAll("input[type='range']");
          strokeOpacitySlider = allRangeInputs[2] as HTMLInputElement;
        } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
          // For polygons: stroke opacity is at index [1] (after fill opacity)
          const allRangeInputs = symbolizerContainer.querySelectorAll("input[type='range']");
          strokeOpacitySlider = allRangeInputs[1] as HTMLInputElement;
        }
      }
      if (strokeOpacitySlider) {
        // 🎯 Set stroke opacity slider value from current state
        strokeOpacitySlider.value = currentState.strokeAlpha.toString();
        console.log("🔧 Set stroke opacity slider value from state:", currentState.strokeAlpha);

        const handleStrokeOpacityChange = (e: Event) => {
          e.stopPropagation();
          const newOpacity = parseFloat((e.target as HTMLInputElement).value);
          console.log("🎯 Stroke opacity slider changed via DOM event:", newOpacity);
          if (item?.id) {
            updateSymbolizerStrokeOpacity(item.id, newOpacity);
          }
        };

        strokeOpacitySlider.addEventListener("input", handleStrokeOpacityChange);
        strokeOpacitySlider.addEventListener("change", handleStrokeOpacityChange);
        (strokeOpacitySlider as HTMLElement).style.pointerEvents = "auto";

        // Prevent slider from interfering with header drag
        strokeOpacitySlider.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
      }

      // Stroke Width slider - GEOMETRY-AWARE SELECTION
      const allSliders = symbolizerContainer.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
      let strokeWidthSlider: HTMLInputElement | null = null;

      if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
        // For lines: [0] = stroke opacity, [1] = stroke width
        strokeWidthSlider = allSliders[1] as HTMLInputElement;
      } else if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
        // For points: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width
        strokeWidthSlider = allSliders[3] as HTMLInputElement;
      } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
        // For polygons: [0] = fill opacity, [1] = stroke opacity, [2] = stroke width
        strokeWidthSlider = allSliders[2] as HTMLInputElement;
      }
      if (strokeWidthSlider) {
        // Set stroke width slider value from current state
        strokeWidthSlider.value = currentState.strokeWidth.toString();
        console.log("🔧 STROKE WIDTH SLIDER DEBUG - Setting slider value to:", currentState.strokeWidth, "for geometry:", item?.geometryType);
        console.log("🔧 STROKE WIDTH SLIDER DEBUG - Slider element:", strokeWidthSlider, "Final value:", strokeWidthSlider.value);

        const handleStrokeWidthChange = (e: Event) => {
          e.stopPropagation();
          const newStrokeWidth = parseFloat((e.target as HTMLInputElement).value);
          console.log("🎯 Stroke width slider changed via DOM event for", item?.geometryType, ":", newStrokeWidth);

          // Get current state from store/item (not DOM)
          const state = getCurrentSymbolizerState();
          if (!state) return;

          // Read geometry-specific values from DOM
          let currentPointType = state.pointType;
          let currentRadius = state.radius;
          let currentRotation = state.rotation;
          let currentFillAlpha = state.fillAlpha;
          let currentStrokeAlpha = state.strokeAlpha;
          let currentStrokeType = state.strokeType;

          // Only read point-specific values for point geometries
          if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
            const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
            currentPointType = pointStyleSelect ? pointStyleSelect.value : currentPointType;

            if (allSliders && allSliders.length > 0 && allSliders[0]) {
              currentRadius = parseFloat(allSliders[0].value);
            }
            if (allSliders && allSliders.length > 4 && allSliders[4]) {
              currentRotation = parseFloat(allSliders[4].value);
            }
          }

          // Read stroke-specific values for all geometries that have strokes
          const strokeStyleSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
          currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : currentStrokeType;

          // Read opacity values for relevant geometries
          if (allSliders && allSliders.length > 0) {
            // GEOMETRY-AWARE SLIDER INDICES - Different slider orders for different geometry types
            if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
              // For lines: [0] = stroke opacity, [1] = stroke width
              if (allSliders[0]) currentStrokeAlpha = parseFloat(allSliders[0].value);
            } else if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
              // For points: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation
              if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
              if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
            } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
              // For polygons: [0] = fill opacity, [1] = stroke opacity, [2] = stroke width
              if (allSliders[0]) currentFillAlpha = parseFloat(allSliders[0].value);
              if (allSliders[1]) currentStrokeAlpha = parseFloat(allSliders[1].value);
            }
          }

          // Read current colors from DOM color buttons
          const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
          const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

          console.log("🔧 Geometry-aware DOM values for stroke width change:", {
            geometryType: item?.geometryType,
            pointType: currentPointType,
            strokeType: currentStrokeType,
            radius: currentRadius,
            fillAlpha: currentFillAlpha,
            strokeAlpha: currentStrokeAlpha,
            strokeWidth: newStrokeWidth,
            rotation: currentRotation,
          });

          if (item?.id) {
            // Create style - EXPLICIT GEOMETRY TYPE CHECKING like old app
            let style = null;
            if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
              style = getPointStyle(
                currentPointType,
                currentRadius,
                [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
                newStrokeWidth, // Use the new stroke width
                [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha],
                currentRotation,
                currentStrokeType
              );
            } else if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
              style = getLineStringStyle(
                [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
                newStrokeWidth, // Use the new stroke width
                currentStrokeType
              );
            } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
              style = getPolygonStyle(
                [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
                newStrokeWidth, // Use the new stroke width
                [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha],
                currentStrokeType
              );
            }

            // Only update if style was created successfully
            if (style) {
              const updates = {
                style: style,
                pointType: currentPointType,
                strokeType: currentStrokeType,
              };

              console.log("🎯 Updating", item?.geometryType, "item in store with new stroke width:", { itemId: item.id, updates, style });
              updateItem(item.id, updates);

              // Emit event to refresh the feature on the map
              emit("mymap-style-updated", { itemId: item.id, style, strokeWidth: newStrokeWidth });
              console.log("🔄 Emitted mymap-style-updated event for stroke width change:", item.id);
            }
          }
        };

        strokeWidthSlider.addEventListener("input", handleStrokeWidthChange);
        strokeWidthSlider.addEventListener("change", handleStrokeWidthChange);
        (strokeWidthSlider as HTMLElement).style.pointerEvents = "auto";

        // Prevent slider from interfering with header drag
        strokeWidthSlider.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
      }

      // Rotation/Angle slider (5th range input - index 4)
      const rotationSlider = allSliders[4] as HTMLInputElement; // [0]=size, [1]=fill opacity, [2]=stroke opacity, [3]=stroke width, [4]=rotation
      if (rotationSlider) {
        // Set rotation slider value from current state
        rotationSlider.value = currentState.rotation.toString();
        console.log("🔧 Set rotation slider value from state:", currentState.rotation);

        const handleRotationChange = (e: Event) => {
          e.stopPropagation();
          const newRotation = parseFloat((e.target as HTMLInputElement).value);
          console.log("🎯 Rotation slider changed via DOM event:", newRotation);

          // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
          const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
          const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

          const strokeStyleSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
          const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

          // Get current state from store/item (not DOM)
          const state = getCurrentSymbolizerState();
          if (!state) return;

          // Get ALL slider values from DOM using positional selectors
          let currentRadius = state.radius;
          let currentFillAlpha = state.fillAlpha;
          let currentStrokeAlpha = state.strokeAlpha;
          let currentStrokeWidth = state.strokeWidth;

          if (allSliders && allSliders.length > 0) {
            // Order: [0] = size, [1] = fill opacity, [2] = stroke opacity, [3] = stroke width, [4] = rotation (we're changing)
            if (allSliders[0]) currentRadius = parseFloat(allSliders[0].value);
            if (allSliders[1]) currentFillAlpha = parseFloat(allSliders[1].value);
            if (allSliders[2]) currentStrokeAlpha = parseFloat(allSliders[2].value);
            if (allSliders[3]) currentStrokeWidth = parseFloat(allSliders[3].value);
          }

          // Read current colors from DOM color buttons
          const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
          const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

          console.log("🔧 Using DOM values for rotation change:", {
            pointType: currentPointType,
            strokeType: currentStrokeType,
            radius: currentRadius,
            fillAlpha: currentFillAlpha,
            strokeAlpha: currentStrokeAlpha,
            strokeWidth: currentStrokeWidth,
            rotation: newRotation,
          });

          if (item?.id) {
            // Create style with ALL current DOM values and new rotation
            const style = createPointStyleFromHelpers(
              currentPointType,
              currentRadius,
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha],
              currentStrokeWidth,
              [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha],
              newRotation, // Use the new rotation
              currentStrokeType
            );

            // Update the item in the store
            const updates = {
              style: style,
              pointType: currentPointType,
              strokeType: currentStrokeType,
            };

            console.log("🎯 Updating item in store with new rotation:", { itemId: item.id, updates, style });
            updateItem(item.id, updates);

            // Emit event to refresh the feature on the map
            emit("mymap-style-updated", { itemId: item.id, style, rotation: newRotation });
          }
        };

        rotationSlider.addEventListener("input", handleRotationChange);
        rotationSlider.addEventListener("change", handleRotationChange);
        (rotationSlider as HTMLElement).style.pointerEvents = "auto";

        // Prevent slider from interfering with header drag
        rotationSlider.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
      }

      // Fill color picker button
      const fillColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-color-button") as HTMLButtonElement;
      if (fillColorButton) {
        // 🎯 Set fill color button background to reflect current state
        const currentFillColor = currentState.fillColor;
        const fillColorHex = `rgb(${currentFillColor.r}, ${currentFillColor.g}, ${currentFillColor.b})`;
        fillColorButton.style.backgroundColor = fillColorHex;
        console.log("🔧 Set fill color button background from state:", fillColorHex);

        const handleFillColorClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("🎯 Fill color button clicked - showing popup");
          showSymbolizerColorPicker(e as MouseEvent, "fill");
        };

        fillColorButton.addEventListener("click", handleFillColorClick);
        fillColorButton.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
        (fillColorButton as HTMLElement).style.pointerEvents = "auto";
      }

      // Stroke color picker button
      const strokeColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-stroke-color-button") as HTMLButtonElement;
      if (strokeColorButton) {
        // 🎯 Set stroke color button background to reflect current state
        const currentStrokeColor = currentState.strokeColor;
        const strokeColorHex = `rgb(${currentStrokeColor.r}, ${currentStrokeColor.g}, ${currentStrokeColor.b})`;
        strokeColorButton.style.backgroundColor = strokeColorHex;
        console.log("🔧 Set stroke color button background from state:", strokeColorHex);

        const handleStrokeColorClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("🎯 Stroke color button clicked - showing popup");
          showSymbolizerColorPicker(e as MouseEvent, "stroke");
        };

        strokeColorButton.addEventListener("click", handleStrokeColorClick);
        strokeColorButton.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
        (strokeColorButton as HTMLElement).style.pointerEvents = "auto";
      }

      // The container itself should NOT have pointerEvents = "auto" to avoid header conflicts
      (symbolizerContainer as HTMLElement).style.pointerEvents = "";
    }

    // Helper functions for measure component calculations
    const convertFromMetersLine = (distance: number, units: string): number => {
      switch (units) {
        case "meters":
          return distance;
        case "kilometers":
          return distance / 1000;
        case "miles":
          return distance / 1609.34;
        case "feet":
          return distance * 3.281;
        case "yards":
          return distance / 0.9144;
        case "nauticalMiles":
          return distance / 1852;
        default:
          return distance;
      }
    };

    const convertFromMetersPolygon = (area: number, units: string): number => {
      switch (units) {
        case "square meters":
          return area;
        case "acres":
          return area / 4046.856;
        case "square feet":
          return area * 10.764;
        case "square kilometers":
          return area / 1000000;
        case "square miles":
          return area * 0.000000038610215855;
        case "hectares":
          return area / 10000;
        default:
          return area;
      }
    };

    const numberWithCommas = (x: number): string => {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Re-attach measure component event listeners (React handlers are lost when copying HTML to overlay)
    const measureContainer = overlayElementRef.current.querySelector(".sc-mymaps-measure-container");
    if (measureContainer) {
      // Handle units dropdown change for both line and area units
      const unitsSelects = measureContainer.querySelectorAll("select");
      unitsSelects.forEach((unitsSelect, index) => {
        if (unitsSelect) {
          const handleUnitsChange = (e: Event) => {
            console.log("🎯 Measure units changed via DOM event:", (e.target as HTMLSelectElement).value);
            const newUnits = (e.target as HTMLSelectElement).value;

            // Dispatch custom event that will bubble up to document
            const measureUpdateEvent = new CustomEvent("measureUnitsUpdate", {
              detail: { units: newUnits },
              bubbles: true,
            });
            measureContainer.dispatchEvent(measureUpdateEvent);

            // Also directly update the result field in the overlay DOM
            // Since React re-renders won't update the overlay automatically
            import("@/stores/myMapsStore").then(({ useMyMapsStore }) => {
              const { items } = useMyMapsStore.getState();
              const currentItemId = overlayElementRef.current?.getAttribute("data-item-id");
              const currentItem = items.find((item) => item.id === currentItemId);

              if (currentItem && currentItem.featureGeoJSON) {
                // Recalculate measurement with new units
                import("@/utils/myMapsHelpers").then((helpers) => {
                  import("ol/sphere.js").then(({ getArea, getLength }) => {
                    try {
                      const feature = helpers.featureFromGeoJSON(currentItem.featureGeoJSON);
                      const geometry = feature.getGeometry();

                      if (geometry) {
                        let newResult = "";

                        if (currentItem.geometryType === "LineString" || currentItem.geometryType === "MultiLineString") {
                          const lengthMeters = getLength(geometry);
                          const convertedLength = convertFromMetersLine(lengthMeters, newUnits);
                          newResult = numberWithCommas(Number(Math.round(convertedLength + "e" + 3) + "e-" + 3));
                        } else if (currentItem.geometryType === "Polygon" || currentItem.geometryType === "MultiPolygon") {
                          const areaMeters = getArea(geometry);
                          const convertedArea = convertFromMetersPolygon(areaMeters, newUnits);
                          newResult = numberWithCommas(Number(Math.round(convertedArea + "e" + 3) + "e-" + 3));
                        }

                        // Update the result input field directly in the overlay DOM
                        const resultInput = measureContainer.querySelector(".sc-mymaps-measure-result") as HTMLInputElement;
                        if (resultInput) {
                          resultInput.value = newResult;
                          console.log("🎯 Updated overlay result directly:", newResult);
                        }
                      }
                    } catch (error) {
                      console.error("Error updating overlay measurement:", error);
                    }
                  });
                });
              }
            });
          };

          unitsSelect.addEventListener("change", handleUnitsChange);

          // Prevent select from interfering with header drag
          unitsSelect.addEventListener("mousedown", (e) => {
            e.stopPropagation();
          });

          // Enable pointer events on this specific element
          (unitsSelect as HTMLElement).style.pointerEvents = "auto";
        }
      });

      // Handle auto-format checkbox change
      const autoFormatCheckbox = measureContainer.querySelector("input[type='checkbox']") as HTMLInputElement;
      if (autoFormatCheckbox) {
        const handleAutoFormatChange = (e: Event) => {
          console.log("🎯 Measure auto-format changed via DOM event:", (e.target as HTMLInputElement).checked);
          const newAutoFormat = (e.target as HTMLInputElement).checked;

          // Dispatch custom event that will bubble up to document
          const measureUpdateEvent = new CustomEvent("measureAutoFormatUpdate", {
            detail: { autoFormat: newAutoFormat },
            bubbles: true,
          });
          measureContainer.dispatchEvent(measureUpdateEvent);

          // Also directly update the result field in the overlay DOM for auto-format changes
          import("@/stores/myMapsStore").then(({ useMyMapsStore }) => {
            const { items } = useMyMapsStore.getState();
            const currentItemId = overlayElementRef.current?.getAttribute("data-item-id");
            const currentItem = items.find((item) => item.id === currentItemId);

            if (currentItem && currentItem.featureGeoJSON) {
              // Get current units from the dropdown
              const currentUnitsSelect = measureContainer.querySelector("select:not(.sc-hidden)") as HTMLSelectElement;
              const currentUnits = currentUnitsSelect ? currentUnitsSelect.value : "meters";

              // Recalculate measurement with new auto-format setting
              import("@/utils/myMapsHelpers").then((helpers) => {
                import("ol/sphere.js").then(({ getArea, getLength }) => {
                  try {
                    const feature = helpers.featureFromGeoJSON(currentItem.featureGeoJSON);
                    const geometry = feature.getGeometry();

                    if (geometry) {
                      let newResult = "";

                      if (currentItem.geometryType === "LineString" || currentItem.geometryType === "MultiLineString") {
                        const lengthMeters = getLength(geometry);
                        const convertedLength = convertFromMetersLine(lengthMeters, currentUnits);
                        newResult = newAutoFormat ? numberWithCommas(Number(Math.round(convertedLength + "e" + 3) + "e-" + 3)) : convertedLength.toString();
                      } else if (currentItem.geometryType === "Polygon" || currentItem.geometryType === "MultiPolygon") {
                        const areaMeters = getArea(geometry);
                        const convertedArea = convertFromMetersPolygon(areaMeters, currentUnits);
                        newResult = newAutoFormat ? numberWithCommas(Number(Math.round(convertedArea + "e" + 3) + "e-" + 3)) : convertedArea.toString();
                      }

                      // Update the result input field directly in the overlay DOM
                      const resultInput = measureContainer.querySelector(".sc-mymaps-measure-result") as HTMLInputElement;
                      if (resultInput) {
                        resultInput.value = newResult;
                        console.log("🎯 Updated overlay result for auto-format:", newResult);
                      }
                    }
                  } catch (error) {
                    console.error("Error updating overlay measurement for auto-format:", error);
                  }
                });
              });
            }
          });
        };

        autoFormatCheckbox.addEventListener("change", handleAutoFormatChange);

        // Prevent checkbox from interfering with header drag
        autoFormatCheckbox.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });

        // Enable pointer events on this specific element
        (autoFormatCheckbox as HTMLElement).style.pointerEvents = "auto";
      }

      // The container itself should NOT have pointerEvents = "auto" to avoid header conflicts
      (measureContainer as HTMLElement).style.pointerEvents = "";
    }

    // Enable interactions ONLY on specific buffer elements (targeted approach)
    // This prevents conflicts with header drag functionality
    const bufferContainer = overlayElementRef.current.querySelector(".sc-mymaps-buffer-container");
    if (bufferContainer) {
      console.log("🔧 Enabling pointer events on specific buffer interactive elements only");

      // Only enable pointer events on specific interactive elements, not the container
      const specificElements = bufferContainer.querySelectorAll("input[type='number'], select, button#sc-mymaps-buffer-color-button-picker");
      specificElements.forEach((element, index) => {
        (element as HTMLElement).style.pointerEvents = "auto";
        console.log(`🔧 Enabled pointer events on specific element ${index}:`, element.tagName, element.id || element.className);
      });

      // The container itself should NOT have pointerEvents = "auto" to avoid header conflicts
      (bufferContainer as HTMLElement).style.pointerEvents = "";
    }
  }, [
    item,
    onClose,
    onTools,
    onDelete,
    onLabelChange,
    onLabelVisibilityChange,
    onLabelRotationChange,
    updateSymbolizerPointType,
    updateSymbolizerFillOpacity,
    updateSymbolizerStrokeOpacity,
    showSymbolizerColorPicker,
    createPointStyleFromHelpers,
    emit,
    getCurrentSymbolizerState,
    updateItem,
    extractColorFromDOMButton,
  ]);

  // Track when activeTool changes for proper DOM sync
  const lastActiveToolRef = useRef<string | undefined>(undefined);

  // Sync React content to overlay element when structure changes
  useEffect(() => {
    if (!overlayElementRef.current || !popupRef.current || !itemId) return;

    // Check if item or activeTool changed
    const itemChanged = lastItemIdRef.current !== itemId;
    const toolChanged = lastActiveToolRef.current !== activeTool;
    lastItemIdRef.current = itemId || null;
    lastActiveToolRef.current = activeTool;

    // Reset drag flag when item changes (new feature selected)
    if (itemChanged) {
      hasBeenDraggedRef.current = false;
    }

    // Copy content if item changed OR if activeTool changed (to show/hide tool components)
    if ((itemChanged || toolChanged) && itemId) {
      // Preserve focus and cursor position before copying content
      const activeElement = overlayElementRef.current.querySelector(":focus") as HTMLInputElement;
      const cursorPosition = activeElement?.selectionStart || 0;
      const wasInputFocused = activeElement && activeElement.classList.contains("sc-mymaps-popup-label-input");

      // Copy the React-rendered content to the overlay element
      overlayElementRef.current.innerHTML = popupRef.current.innerHTML;

      // Store the current item ID for DOM event handlers to use
      overlayElementRef.current.setAttribute("data-item-id", itemId);

      // Restore focus and cursor position after copying
      if (wasInputFocused) {
        const newLabelInput = overlayElementRef.current.querySelector(".sc-mymaps-popup-label-input") as HTMLInputElement;
        if (newLabelInput) {
          newLabelInput.focus();
          newLabelInput.setSelectionRange(cursorPosition, cursorPosition);
        }
      }

      // Re-attach all event listeners
      attachEventListeners();
    }
  }, [itemId, activeTool, attachEventListeners]);

  // Sync label value when it changes externally (without full DOM manipulation)
  useEffect(() => {
    if (overlayElementRef.current && itemId && itemLabel && isOpen && lastItemIdRef.current === itemId) {
      const labelInput = overlayElementRef.current.querySelector(".sc-mymaps-popup-label-input") as HTMLInputElement;
      if (labelInput && labelInput.value !== itemLabel && document.activeElement !== labelInput) {
        // Only sync if the input is not currently focused (user not typing)
        labelInput.value = itemLabel;
      }
    }
  }, [itemLabel, isOpen, itemId]);

  // Sync checkbox state when it changes externally (e.g., from store updates)
  useEffect(() => {
    if (overlayElementRef.current && item && isOpen) {
      const checkbox = overlayElementRef.current.querySelector(".sc-mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = item.labelVisible;
      }
    }
  }, [isOpen, item?.labelVisible, item]); // Watch for item changes

  // Sync rotation slider value when it changes externally (e.g., from store updates)
  useEffect(() => {
    if (overlayElementRef.current && item && isOpen) {
      const rotationSlider = overlayElementRef.current.querySelector(".sc-mymaps-popup-slider input[type='range']") as HTMLInputElement;
      if (rotationSlider) {
        rotationSlider.value = (item.labelRotation || 0).toString();
      }
    }
  }, [isOpen, item?.labelRotation, item]); // Watch for rotation changes

  // Cleanup overlay only on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        try {
          const overlays = map.getOverlays().getArray();
          if (overlays.includes(overlayRef.current)) {
            map.removeOverlay(overlayRef.current);
          }
        } catch {
          // Ignore errors when removing overlay on unmount
        }
      }
      if (overlayElementRef.current) {
        overlayElementRef.current.remove();
        overlayElementRef.current = null;
      }
      overlayRef.current = null;
    };
  }, [map]);

  // Update overlay position and visibility
  useEffect(() => {
    if (!overlayRef.current) return;

    try {
      if (isOpen && coordinate) {
        // Only auto-position if popup hasn't been manually dragged
        if (!hasBeenDraggedRef.current) {
          overlayRef.current.setPosition(coordinate);
        }
      } else {
        overlayRef.current.setPosition(undefined);
        // Reset drag flag when popup closes
        hasBeenDraggedRef.current = false;
      }
    } catch {
      // Ignore errors when updating overlay position
    }
  }, [isOpen, coordinate, map]);

  // Apply old app's mouseover/mouseout interaction handling strategy
  useEffect(() => {
    if (!map || !overlayElementRef.current || !isOpen) return;

    const container = overlayElementRef.current;

    // Mouseover handler - disable ALL interactions and track active ones
    const handleMouseOver = () => {
      // console.log("🔒 Mouse over popup - disabling interactions");

      // Clear previous activeIds and rebuild (like old app)
      activeInteractionIdsRef.current = [];

      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          // Store the ol_uid for precise restoration
          activeInteractionIdsRef.current.push((interaction as unknown as { ol_uid: number }).ol_uid);
          interaction.setActive(false);
          // console.log("🔒 Disabled interaction:", interaction.constructor.name);
        }
      });

      // Set global popup active flag
      (window as unknown as { popupActive: boolean }).popupActive = true;
      console.log("🔒 Global popupActive set to TRUE");
    };

    // Mouseout handler - restore only previously active interactions
    const handleMouseOut = () => {
      // console.log("🔓 Mouse out of popup - re-enabling interactions");

      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
          // console.log("🔓 Re-enabled interaction:", interaction.constructor.name);
        }
      });

      // Clear global popup active flag
      (window as unknown as { popupActive: boolean }).popupActive = false;
      console.log("🔓 Global popupActive set to FALSE");
    };

    // Use native DOM events exactly like old app
    container.onmouseover = handleMouseOver;
    container.onmouseout = handleMouseOut;

    return () => {
      // Cleanup event listeners
      if (container) {
        container.onmouseover = null;
        container.onmouseout = null;
      }

      // Clear popup active flag on cleanup
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };
  }, [map, isOpen]);

  // Ensure interactions are restored when popup closes (regardless of close method)
  useEffect(() => {
    // When popup closes, restore interactions if they were disabled
    if (!isOpen && map && activeInteractionIdsRef.current.length > 0) {
      console.log("🔓 Popup closed - restoring interactions");

      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
        }
      });

      // Clear the active interactions list and popup active flag
      activeInteractionIdsRef.current = [];
      (window as unknown as { popupActive: boolean }).popupActive = false;
      console.log("🔓 Global popupActive set to FALSE on popup close");
    }
  }, [isOpen, map]);

  // Handle drag functionality - matching old app implementation
  useEffect(() => {
    if (!overlayElementRef.current || !map || !overlayRef.current || !isOpen) return;

    const headerElement = overlayElementRef.current.querySelector("#sc-popup-header") as HTMLElement;
    if (!headerElement) return;

    let isMoving = false;

    const handleMouseDown = (evt: MouseEvent) => {
      // Ignore clicks on buttons - exactly like old app
      const target = evt.target as Element;
      if (target.classList.contains("ol-popup-closer") || target.classList.contains("ol-popup-previous") || target.classList.contains("ol-popup-next")) {
        return;
      }

      // CRITICAL: Only allow drag if click is directly on the header element or its immediate children
      // This prevents buffer tool elements from interfering with drag functionality
      if (target !== headerElement && !headerElement.contains(target)) {
        return;
      }

      // Additional safeguard: Don't start drag if click is on any tool-related elements
      if (
        target.closest(".sc-mymaps-buffer-container") ||
        target.closest(".sc-mymaps-symbolizer-container") ||
        target.id === "sc-mymaps-buffer-color-button-picker" ||
        target.id === "sc-mymaps-symbolizer-color-button" ||
        target.id === "sc-mymaps-symbolizer-stroke-color-button" ||
        target.matches("input, select, button, label")
      ) {
        console.log("🚫 Drag blocked - click on tool element:", target.tagName, target.id || target.className);
        return;
      }

      // Calculate initial offset between mouse and popup position
      const currentCoord = overlayRef.current?.getPosition();
      const mouseCoord = map.getEventCoordinate(evt);
      let dragOffset: { x: number; y: number } | null = null;

      if (currentCoord && mouseCoord) {
        dragOffset = {
          x: currentCoord[0] - mouseCoord[0],
          y: currentCoord[1] - mouseCoord[1],
        };
      }

      // Disable map interactions during drag
      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          interaction.setActive(false);
          // Store the previous active state for restoration
          (interaction as unknown as { _wasActiveBeforeDrag?: boolean })._wasActiveBeforeDrag = true;
        }
      });

      const move = (evt: MouseEvent) => {
        if (!map || !overlayRef.current || !dragOffset) return;

        // Get mouse coordinate and apply offset
        const mouseCoord = map.getEventCoordinate(evt);
        if (mouseCoord) {
          const newCoord = [mouseCoord[0] + dragOffset.x, mouseCoord[1] + dragOffset.y];

          if (isMoving) {
            overlayRef.current.setPosition(newCoord);
            hasBeenDraggedRef.current = true; // Mark as manually dragged
          } else {
            isMoving = true;
          }
        }
      };

      const end = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", end);
        isMoving = false;

        // Re-enable map interactions
        map.getInteractions().forEach((interaction) => {
          const interactionWithFlag = interaction as unknown as { _wasActiveBeforeDrag?: boolean };
          if (interactionWithFlag._wasActiveBeforeDrag) {
            interaction.setActive(true);
            delete interactionWithFlag._wasActiveBeforeDrag;
          }
        });

        document.body.style.cursor = "";
        headerElement.style.cursor = "grab";
      };

      // Set cursor states
      document.body.style.cursor = "grabbing";
      headerElement.style.cursor = "grabbing";

      // Use window event listeners like old app
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
    };

    headerElement.addEventListener("mousedown", handleMouseDown);
    console.log("🎯 Drag functionality attached to header");

    return () => {
      headerElement.removeEventListener("mousedown", handleMouseDown);
      console.log("🎯 Drag functionality cleaned up");
    };
  }, [map, isOpen, itemId, activeTool]); // Include activeTool to re-attach when buffer tool opens/closes

  // Always render the popup element, visibility is controlled by overlay position
  if (!item) {
    return null;
  }

  return (
    <div className="ol-popup" id="sc-window-popup" ref={popupRef} style={{ position: "absolute", left: "-9999px", visibility: "hidden" }}>
      {/* Header */}
      <div id="sc-popup-header" className="sc-popup-header sc-no-select">
        <div>Drawing Options</div>
        <div className="sc-popup-content-next-button" title="Next">
          <a className="ol-popup-next" href="#" style={{ display: "block" }}></a>
        </div>
        <div className="sc-popup-content-prev-button sc-disabled" title="Previous">
          <a className="ol-popup-previous" href="#" style={{ display: "block" }}></a>
        </div>
        <div className="sc-popup-header-close-button">
          <a
            className="ol-popup-closer"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          ></a>
        </div>
      </div>

      {/* Content */}
      <div className="ol-popup-content" id="sc-window-popup-content">
        <div className="sc-mymaps-popup-container">
          {/* Label Component - Always shown */}
          <MyMapsPopupLabel item={item} onLabelChange={onLabelChange} onLabelRotationChange={onLabelRotationChange} />

          {/* Tool-specific components */}
          <MyMapsSymbolizer visible={activeTool === "symbolize"} item={item} />
          <MyMapsBuffer visible={activeTool === "buffer"} item={item} />
          <MyMapsMeasure visible={activeTool === "measure"} item={item} />

          {/* Footer Buttons - Always shown */}
          <FooterButtons onTools={onTools ? (event) => onTools(item, event) : undefined} onDelete={onDelete ? () => onDelete(item) : undefined} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default DrawingOptionsPopup;
